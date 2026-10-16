import { test } from "node:test";
import assert from "node:assert/strict";
import { formatModePickerLines, type ModePickerOption } from "../src/layout.js";
import { getVisualWidth } from "../src/layout.js";
import { LANGUAGE_PRESETS, SUPPORTED_LANG_CODES } from "../src/presets.js";
import extensionFactory from "../dist/extension.js";

const DEFAULT_OPTIONS: ModePickerOption[] = [
  { num: 1, id: "companion", name: "纯伴学", englishTag: "Companion" },
  { num: 2, id: "direct", name: "规范直发", englishTag: "Logical Spec" },
  { num: 3, id: "live-flow", name: "实战狂飙", englishTag: "Live Flow" },
  { num: 0, id: "off", name: "已关闭", englishTag: "Off" },
];

test("mode picker layout - satisfies VisualWidth <= columns across 20, 40, 80 viewports (Invariant 12)", () => {
  for (const cols of [20, 30, 40, 80]) {
    for (let selectedIdx = 0; selectedIdx < DEFAULT_OPTIONS.length; selectedIdx++) {
      const lines = formatModePickerLines(
        "伴学模式切换",
        "按数字键 1/2/3/0 直接生效，Esc 取消",
        "zh ⇄ en",
        DEFAULT_OPTIONS,
        selectedIdx,
        cols
      );

      assert.ok(lines.length >= 4, `Must produce at least 4 lines @ ${cols} cols`);
      for (const line of lines) {
        const w = getVisualWidth(line);
        assert.ok(
          w <= cols,
          `Line overflows column budget (${w} > ${cols}): "${line}"`
        );
      }

      // Selected option must carry active cursor '▸'
      const contentText = lines.join("\n");
      assert.ok(contentText.includes("▸"), "Must render selection cursor ▸");
    }
  }
});

test("mode picker layout - renders all 9 languages natively without clipping at 80 columns", () => {
  for (const lang of SUPPORTED_LANG_CODES) {
    const p = LANGUAGE_PRESETS[lang];
    const lines = formatModePickerLines(
      p.modePickerTitle || "Mode Switch",
      p.modePickerHint || "Esc to cancel",
      `${lang} ⇄ en`,
      DEFAULT_OPTIONS,
      0,
      80
    );

    assert.ok(lines.length >= 4, `[${lang}] must render full capsule container`);
    for (const line of lines) {
      assert.ok(getVisualWidth(line) <= 80, `[${lang}] line exceeds 80 columns: "${line}"`);
      assert.ok(!line.endsWith("..."), `[${lang}] must not be clipped at 80 cols: "${line}"`);
    }
  }
});

test("mode picker interactive custom UI - hotkeys 1, 2, 3, 0 trigger instant switch without Enter", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  let capturedComponent: any = null;
  const notifications: string[] = [];
  let statusVal: any = null;

  const mockCtx: any = {
    hasUI: true,
    ui: {
      custom(factory: any) {
        return new Promise((resolve) => {
          capturedComponent = factory(
            { requestRender() {} },
            { fg: (_c: string, t: string) => t, bold: (t: string) => t },
            null,
            (chosen: string | null) => resolve(chosen)
          );
        });
      },
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus(_key: string, val: any) {
        statusVal = val;
      },
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Invoke /lingual without arguments -> opens mode picker
  const pickerPromise = registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(capturedComponent, "Must initialize custom TUI mode picker component");

  // Press '2' directly -> selects Mode 2 (direct) immediately
  capturedComponent.handleInput("2");
  await pickerPromise;

  assert.ok(
    notifications[notifications.length - 1].includes("直接改") ||
    notifications[notifications.length - 1].includes("规范直发") ||
    notifications[notifications.length - 1].toLowerCase().includes("direct")
  );

  // 2. Test hotkey '0' (Off)
  const pickerPromise0 = registeredCommands["lingual"].handler("", mockCtx);
  capturedComponent.handleInput("0");
  await pickerPromise0;
  assert.equal(statusVal, undefined, "Hotkey 0 must switch to off mode and clear badge");

  // 3. Test hotkey '1' (Companion) via /l alias
  const pickerPromise1 = registeredCommands["l"].handler("", mockCtx);
  capturedComponent.handleInput("1");
  await pickerPromise1;
  assert.ok(
    notifications[notifications.length - 1].includes("纯伴学") ||
    notifications[notifications.length - 1].toLowerCase().includes("companion")
  );
});

test("mode picker interactive custom UI - arrow navigation and Esc cancellation", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  let capturedComponent: any = null;
  const notifications: string[] = [];
  const mockCtx: any = {
    hasUI: true,
    ui: {
      custom(factory: any) {
        return new Promise((resolve) => {
          capturedComponent = factory(
            { requestRender() {} },
            { fg: (_c: string, t: string) => t, bold: (t: string) => t },
            null,
            (chosen: string | null) => resolve(chosen)
          );
        });
      },
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Arrow navigation + Enter
  const navPromise = registeredCommands["lingual"].handler("", mockCtx);
  // Navigate right (Tab or \x1b[C)
  capturedComponent.handleInput("\x1b[C");
  // Press Enter
  capturedComponent.handleInput("\r");
  await navPromise;
  assert.ok(notifications.length > 0, "Enter confirms navigated selection");

  // 2. Esc cancellation (keeps existing state without modification)
  const prevCount = notifications.length;
  const cancelPromise = registeredCommands["lingual"].handler("", mockCtx);
  capturedComponent.handleInput("\x1b");
  await cancelPromise;
  assert.equal(notifications.length, prevCount, "Esc cancel must produce zero side effects");
});

test("mode picker layout - suppresses redundant English tags when option name is already in English (F4-3)", () => {
  const englishOptions: ModePickerOption[] = [
    { num: 1, id: "companion", name: "Companion", englishTag: "Companion" },
    { num: 2, id: "direct", name: "Logical Spec", englishTag: "Logical Spec" },
    { num: 3, id: "live-flow", name: "Live Flow", englishTag: "Live Flow" },
    { num: 0, id: "off", name: "Off", englishTag: "Off" },
  ];

  const lines = formatModePickerLines(
    "Mode Switch",
    "Press 1/2/3/0 to switch, Esc to cancel",
    "en ⇄ ja",
    englishOptions,
    0,
    80
  );

  const text = lines.join("\n");
  assert.ok(!text.includes("(Companion)"), "Must not redundantly append (Companion) when name is already Companion");
  assert.ok(!text.includes("(Logical Spec)"), "Must not redundantly append (Logical Spec)");
  assert.ok(!text.includes("(Live Flow)"), "Must not redundantly append (Live Flow)");
  assert.ok(!text.includes("(Off)"), "Must not redundantly append (Off)");
});

test("mode picker interactive custom UI - Down/Up keys advance and retreat linearly across all items (F4-2)", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  let capturedComponent: any = null;
  let chosenValue: string | null = null;
  const mockCtx: any = {
    hasUI: true,
    ui: {
      custom(factory: any) {
        return new Promise((resolve) => {
          capturedComponent = factory(
            { requestRender() {} },
            { fg: (_c: string, t: string) => t, bold: (t: string) => t },
            null,
            (chosen: string | null) => {
              chosenValue = chosen;
              resolve(chosen);
            }
          );
        });
      },
      notify() {},
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // Ensure clean baseline mode at index 0 (companion)
  await registeredCommands["lingual"].handler("1", mockCtx);

  // Launch picker
  registeredCommands["lingual"].handler("", mockCtx);

  // Press Down (\x1b[B) once: from index 0 -> index 1
  capturedComponent.handleInput("\x1b[B");
  // Press Enter to confirm: should be option 2 (direct)
  capturedComponent.handleInput("\r");
  assert.equal(chosenValue, "direct", "Down key once must move from index 0 to index 1 (direct)");

  // Launch picker again, press Down twice: index 0 -> 1 -> 2
  registeredCommands["lingual"].handler("", mockCtx);
  capturedComponent.handleInput("\x1b[B");
  capturedComponent.handleInput("\x1b[B");
  capturedComponent.handleInput("\r");
  assert.equal(chosenValue, "live-flow", "Down key twice must move from index 0 to index 2 (live-flow)");

  // Launch picker again, press Down three times: index 0 -> 1 -> 2 -> 3 (off)
  registeredCommands["lingual"].handler("", mockCtx);
  capturedComponent.handleInput("\x1b[B");
  capturedComponent.handleInput("\x1b[B");
  capturedComponent.handleInput("\x1b[B");
  capturedComponent.handleInput("\r");
  assert.equal(chosenValue, "off", "Down key three times must move from index 0 to index 3 (off)");
});
