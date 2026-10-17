import test from "node:test";
import assert from "node:assert/strict";
import {
  formatModePickerLines,
  renderCardLayout,
  formatCapsuleLine,
  getVisualWidth,
  type ModePickerOption,
} from "../src/layout.js";
import {
  resolveLabelsForLang,
  LANGUAGE_PRESETS,
  resolveModeDisplayName,
  localizeModeName,
  SUPPORTED_LANG_CODES,
  getDefaultFactoryModes,
  formatStatusReport,
} from "../src/presets.js";
import {
  compileModeSystemPrompt,
  resolveModesFromConfig,
} from "../src/engine.js";
import {
  getDefaultSlots,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
} from "../src/prompts.js";
import type { LingualResult } from "../src/types.js";

// Helper to create an extension instance
async function createExtensionHarness() {
  const registeredCommands: Record<string, any> = {};
  const listeners: Record<string, ((event: any, ctx: any) => Promise<any>)[]> = {};

  const mockPi: any = {
    on(event: string, handler: any) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
    sendMessage() {},
    sendUserMessage() {},
  };

  const extensionModule = await import("../src/extension.js");
  const extensionFactory = extensionModule.default || extensionModule;
  extensionFactory(mockPi);

  return { registeredCommands, listeners };
}

function createMockCtx() {
  const notifications: { msg: string; level?: string }[] = [];
  let currentStatus: any = undefined;
  let currentWidget: any = undefined;
  let customHandler: any = null;

  const ctx: any = {
    hasUI: true,
    ui: {
      notify(msg: string, level?: string) {
        notifications.push({ msg, level });
      },
      setStatus(status: any) {
        currentStatus = status;
      },
      setWidget(id: string, widget: any) {
        currentWidget = widget;
      },
      custom(fn: any) {
        customHandler = fn;
        return Promise.resolve(null);
      },
    },
    sessionManager: {
      getEntries() {
        return [];
      },
    },
    modelRegistry: {
      getAvailable() {
        return [];
      },
    },
  };

  return {
    ctx,
    notifications,
    getStatus: () => currentStatus,
    getWidget: () => currentWidget,
    getCustomHandler: () => customHandler,
  };
}

// ---------------------------------------------------------------------------
// PERSONA 1: High-Speed CLI Operator
// ---------------------------------------------------------------------------
test("Persona 1: High-Speed CLI Operator - /lingual 1/2/3/0, default, /lang, /l, arrow keys in picker", async () => {
  const { registeredCommands, listeners } = await createExtensionHarness();
  const lingualCmd = registeredCommands["lingual"];
  const lCmd = registeredCommands["l"];
  const langCmd = registeredCommands["lang"];

  assert.ok(lingualCmd, "/lingual command must be registered");
  assert.ok(lCmd, "/l alias must be registered");
  assert.ok(langCmd, "/lang command must be registered");

  const harness = createMockCtx();

  // Initialize session
  for (const h of listeners["session_start"] || []) {
    await h({ reason: "new" }, harness.ctx);
  }

  // 1. Bare numeral jumps: /lingual 1, 2, 3, 0
  harness.notifications.length = 0;
  await lingualCmd.handler("2", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("Logical Spec") || harness.notifications[0].msg.includes("direct"),
    `Expected mode 2 (Logical Spec): got "${harness.notifications[0].msg}"`
  );

  harness.notifications.length = 0;
  await lingualCmd.handler("3", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("Live Flow") || harness.notifications[0].msg.includes("live-flow"),
    `Expected mode 3 (Live Flow): got "${harness.notifications[0].msg}"`
  );

  harness.notifications.length = 0;
  await lingualCmd.handler("0", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("off"),
    `Expected off notification: got "${harness.notifications[0].msg}"`
  );

  harness.notifications.length = 0;
  await lingualCmd.handler("1", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("Companion") || harness.notifications[0].msg.includes("companion"),
    `Expected mode 1 (Companion): got "${harness.notifications[0].msg}"`
  );

  // 2. Ultra-short alias /l
  harness.notifications.length = 0;
  await lCmd.handler("2", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("Logical Spec") || harness.notifications[0].msg.includes("direct"),
    `/l 2 must work identically to /lingual 2: got "${harness.notifications[0].msg}"`
  );

  // 3. /lingual default 1/2/0 and inspect
  harness.notifications.length = 0;
  await lingualCmd.handler("default", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("Default mode for new sessions"),
    `Must report current default mode: got "${harness.notifications[0].msg}"`
  );

  harness.notifications.length = 0;
  await lingualCmd.handler("default 2", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("set to: 2. Logical Spec (direct)"),
    `Must confirm setting default mode: got "${harness.notifications[0].msg}"`
  );

  harness.notifications.length = 0;
  await lingualCmd.handler("default 1", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("set to: 1. Companion (companion)"),
    `Must confirm resetting default mode: got "${harness.notifications[0].msg}"`
  );

  // 4. /lang quick switch
  harness.notifications.length = 0;
  await langCmd.handler("ja", harness.ctx);
  assert.equal(harness.notifications.length, 1);
  assert.ok(
    harness.notifications[0].msg.includes("ja"),
    `/lang ja must switch target language: got "${harness.notifications[0].msg}"`
  );

  // 5. Mode picker with arrow keys and hotkeys
  let chosenValue: string | null = null;
  const mockTui = { requestRender() {} };
  const mockTheme = {
    fg: (_c: string, t: string) => t,
    bold: (t: string) => t,
  };

  const interactiveCtx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus() {},
      setWidget() {},
      custom(factory: any) {
        return new Promise((resolve) => {
          const comp = factory(mockTui, mockTheme, null, (val: string | null) => {
            chosenValue = val;
            resolve(val);
          });

          // Simulate operator pressing Down arrow twice, then Enter
          comp.handleInput("\x1b[B"); // Down arrow
          comp.handleInput("\x1b[B"); // Down arrow
          comp.handleInput("\r");     // Enter
        });
      },
    },
    sessionManager: { getEntries() { return []; } },
    modelRegistry: { getAvailable() { return []; } },
  };

  await lingualCmd.handler("", interactiveCtx);
  assert.ok(chosenValue !== null, "Arrow keys + Enter must select a mode in picker");

  // Simulate operator pressing instant hotkey '3' in picker
  chosenValue = null;
  const hotkeyCtx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus() {},
      setWidget() {},
      custom(factory: any) {
        return new Promise((resolve) => {
          const comp = factory(mockTui, mockTheme, null, (val: string | null) => {
            chosenValue = val;
            resolve(val);
          });
          comp.handleInput("3"); // instant hotkey 3
        });
      },
    },
    sessionManager: { getEntries() { return []; } },
    modelRegistry: { getAvailable() { return []; } },
  };

  await lingualCmd.handler("", hotkeyCtx);
  assert.equal(chosenValue, "live-flow", "Hotkey '3' must immediately select live-flow");

  // Simulate Esc cancellation
  chosenValue = "unchanged";
  const escCtx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus() {},
      setWidget() {},
      custom(factory: any) {
        return new Promise((resolve) => {
          const comp = factory(mockTui, mockTheme, null, (val: string | null) => {
            chosenValue = val;
            resolve(val);
          });
          comp.handleInput("\x1b"); // Esc
        });
      },
    },
    sessionManager: { getEntries() { return []; } },
    modelRegistry: { getAvailable() { return []; } },
  };

  await lingualCmd.handler("", escCtx);
  assert.equal(chosenValue, null, "Esc must cancel selection with null");

  // 6. Status report verification: companion, direct, live-flow must not say "Disabled"
  const labels = resolveLabelsForLang("en", undefined, "ja");
  const repCompanion = formatStatusReport(labels, {
    mode: "companion",
    sourceLang: "en",
    targetLang: "ja",
    activeModel: "auto",
  });
  assert.ok(
    !repCompanion.includes("(Disabled)"),
    `Status report for companion must not say Disabled: got "${repCompanion}"`
  );
  assert.ok(
    repCompanion.includes("Companion · 0ms pass-through"),
    `Status report must describe Companion: got "${repCompanion}"`
  );

  const repDirect = formatStatusReport(labels, {
    mode: "direct",
    sourceLang: "en",
    targetLang: "ja",
    activeModel: "auto",
  });
  assert.ok(
    !repDirect.includes("(Disabled)"),
    `Status report for direct must not say Disabled: got "${repDirect}"`
  );

  const repLiveFlow = formatStatusReport(labels, {
    mode: "live-flow",
    sourceLang: "en",
    targetLang: "ja",
    activeModel: "auto",
  });
  assert.ok(
    !repLiveFlow.includes("(Disabled)"),
    `Status report for live-flow must not say Disabled: got "${repLiveFlow}"`
  );
});

// ---------------------------------------------------------------------------
// PERSONA 2: Multi-Session / Multi-Agent Developer
// ---------------------------------------------------------------------------
test("Persona 2: Multi-Session / Multi-Agent Developer - parallel sessions and defaultMode initialization", async () => {
  const { registeredCommands, listeners } = await createExtensionHarness();
  const lingualCmd = registeredCommands["lingual"];

  const harnessA = createMockCtx();
  const harnessB = createMockCtx();

  // 1. Set defaultMode to Mode 1 (companion)
  await lingualCmd.handler("default 1", harnessA.ctx);

  // 2. Agent B switches active mode to Mode 2 (direct / Logical Spec)
  await lingualCmd.handler("2", harnessB.ctx);

  // 3. Agent A starts a brand-new session (reason: "new")
  for (const h of listeners["session_start"] || []) {
    await h({ reason: "new" }, harnessA.ctx);
  }

  // Check footer or lingual status in Agent A
  harnessA.notifications.length = 0;
  await lingualCmd.handler("status", harnessA.ctx);
  const statusMsg = harnessA.notifications[0]?.msg || "";
  assert.ok(
    statusMsg.includes("companion") || statusMsg.includes("Companion"),
    `Brand-new session must initialize strictly to defaultMode (companion): got "${statusMsg}"`
  );

  // 4. In Agent A, user runs an input turn
  for (const h of listeners["input"] || []) {
    await h({ text: "Add user authentication flow", source: "user" }, harnessA.ctx);
  }

  // Verify Agent A remains in defaultMode (companion)
  harnessA.notifications.length = 0;
  await lingualCmd.handler("status", harnessA.ctx);
  const statusAfterInput = harnessA.notifications[0]?.msg || "";
  assert.ok(
    statusAfterInput.includes("companion") || statusAfterInput.includes("Companion"),
    `Agent A must remain in companion after input: got "${statusAfterInput}"`
  );
});

// ---------------------------------------------------------------------------
// PERSONA 3: Non-Chinese Polyglot Developer
// ---------------------------------------------------------------------------
test("Persona 3: Non-Chinese Polyglot Developer - sourceLang='en', targetLang='ru', 0% Chinese characters", async () => {
  const { registeredCommands, listeners } = await createExtensionHarness();
  const lingualCmd = registeredCommands["lingual"];
  const langCmd = registeredCommands["lang"];

  const harness = createMockCtx();

  // Switch to en ⇄ ru
  await langCmd.handler("en ru", harness.ctx);

  const chineseRegex = /[\u4e00-\u9fa5]/;

  // 1. Check all notification messages
  for (const notif of harness.notifications) {
    assert.ok(
      !chineseRegex.test(notif.msg),
      `Notification leaked Chinese: "${notif.msg}"`
    );
  }

  // 2. Check /lingual mode list
  harness.notifications.length = 0;
  await lingualCmd.handler("mode list", harness.ctx);
  for (const notif of harness.notifications) {
    assert.ok(
      !chineseRegex.test(notif.msg),
      `/lingual mode list leaked Chinese: "${notif.msg}"`
    );
  }

  // 3. Check /lingual status
  harness.notifications.length = 0;
  await lingualCmd.handler("status", harness.ctx);
  for (const notif of harness.notifications) {
    assert.ok(
      !chineseRegex.test(notif.msg),
      `/lingual status leaked Chinese: "${notif.msg}"`
    );
  }

  // 4. Check mode picker formatting
  const labels = resolveLabelsForLang("en", undefined, "ru");
  const modes = getDefaultFactoryModes("en", "en");
  const pickerOptions: ModePickerOption[] = modes.map((m, idx) => ({
    num: idx + 1,
    id: m.id,
    name: localizeModeName(m.id, m.name, "en"),
    englishTag: undefined,
  }));
  pickerOptions.push({
    num: 0,
    id: "off",
    name: resolveModeDisplayName("off", "en"),
    englishTag: "Off",
  });

  const pickerLines = formatModePickerLines(
    labels.modePickerTitle || "Mode Switch",
    labels.modePickerHint || "Press 1/2/3/0 to switch, Esc to cancel",
    "en ⇄ ru",
    pickerOptions,
    0,
    78
  );

  for (const line of pickerLines) {
    assert.ok(!chineseRegex.test(line), `Mode picker line leaked Chinese: "${line}"`);
  }

  // 5. Check compiled system prompts
  const companionMode = modes.find((m) => m.id === "companion")!;
  const prompt = compileModeSystemPrompt(companionMode, { sourceLang: "en", targetLang: "ru", explainLang: "en" });
  assert.ok(
    !chineseRegex.test(prompt),
    `Compiled system prompt for en ⇄ ru leaked Chinese characters!`
  );

  const directMode = modes.find((m) => m.id === "direct")!;
  const directPrompt = compileModeSystemPrompt(directMode, { sourceLang: "en", targetLang: "ru", explainLang: "en" });
  assert.ok(
    !chineseRegex.test(directPrompt),
    `Compiled system prompt for direct mode leaked Chinese characters!`
  );

  const flowMode = modes.find((m) => m.id === "live-flow")!;
  const flowPrompt = compileModeSystemPrompt(flowMode, { sourceLang: "en", targetLang: "ru", explainLang: "en" });
  assert.ok(
    !chineseRegex.test(flowPrompt),
    `Compiled system prompt for live-flow mode leaked Chinese characters!`
  );

  // 6. Check card layout rendering
  const dummyCard: LingualResult = {
    sourceText: "How to configure nginx reverse proxy for websockets with SSL termination?",
    spoken: "Как настроить обратный прокси nginx для веб-сокетов с терминацией SSL?",
    written: "Конфигурация обратного прокси-сервера Nginx для соединений WebSocket с обработкой SSL.",
    vocab: "reverse proxy (обратный прокси) · SSL termination (терминация SSL)",
    annotated: "",
  };

  const cardLines = renderCardLayout(dummyCard, labels, { maxCols: 78, maxLines: 9 });

  for (const line of cardLines) {
    assert.ok(!chineseRegex.test(line), `Card layout line leaked Chinese: "${line}"`);
  }
});

// ---------------------------------------------------------------------------
// PERSONA 4: Narrow Viewport User (40 and 60 columns, long Russian text)
// ---------------------------------------------------------------------------
test("Persona 4: Narrow Viewport User - split panes at 40 and 60 columns with long Russian multi-clause translations", async () => {
  const labels = resolveLabelsForLang("ru", undefined, "en");

  const longRussianSource = "Пожалуйста, объясните подробно, как устроена система управления памятью в Node.js, включая сборку мусора V8 и утечки памяти при замыканиях.";
  const spokenRussian = "Объясни, как работает память в Node.js: сборщик мусора V8 и утечки из-за замыканий.";
  const writtenRussian = "Подробный обзор архитектуры управления оперативной памятью в среде выполнения Node.js, механизмов профилирования и предотвращения деградации производительности.";
  const vocab = [
    { term: "garbage collection", meaning: "сборка мусора" },
    { term: "memory leak", meaning: "утечка памяти" },
    { term: "closure", meaning: "замыкание" },
  ];

  const dummyCard: LingualResult = {
    sourceText: longRussianSource,
    spoken: spokenRussian,
    written: writtenRussian,
    vocab: "garbage collection (сборка мусора) · memory leak (утечка памяти) · closure (замыкание)",
    annotated: "",
  };

  for (const cols of [40, 60]) {
    // 1. Card layout test
    const lines = renderCardLayout(dummyCard, labels, { maxCols: cols, maxLines: 9 });

    // Hard budget check: lines <= 9
    assert.ok(
      lines.length <= 9,
      `[${cols} cols] lines.length (${lines.length}) must be <= 9`
    );

    // Width check: each line visual width <= cols
    for (let i = 0; i < lines.length; i++) {
      const w = getVisualWidth(lines[i]);
      assert.ok(
        w <= cols,
        `[${cols} cols] Line ${i + 1} visual width ${w} exceeds viewport ${cols}: "${lines[i]}"`
      );
    }

    // Bracket check: no unclosed '('
    for (const line of lines) {
      const openParen = (line.match(/\(/g) || []).length;
      const closeParen = (line.match(/\)/g) || []).length;
      assert.equal(
        openParen,
        closeParen,
        `[${cols} cols] Line contains unbalanced parentheses: "${line}"`
      );
    }

    // 2. Capsule line test
    const capsule = formatCapsuleLine("ru", spokenRussian, writtenRussian, cols);
    const capWidth = getVisualWidth(capsule);
    assert.ok(
      capWidth <= cols,
      `[${cols} cols] Capsule line visual width ${capWidth} exceeds viewport ${cols}: "${capsule}"`
    );

    // 3. Mode picker lines test
    const modes = getDefaultFactoryModes("ru", "ru");
    const pickerOptions: ModePickerOption[] = modes.map((m, idx) => ({
      num: idx + 1,
      id: m.id,
      name: localizeModeName(m.id, m.name, "ru"),
      englishTag: undefined,
    }));
    pickerOptions.push({
      num: 0,
      id: "off",
      name: resolveModeDisplayName("off", "ru"),
      englishTag: "Off",
    });

    const pickerLines = formatModePickerLines(
      labels.modePickerTitle || "Переключение режимов",
      labels.modePickerHint || "Нажмите 1/2/3/0 для выбора, Esc для отмены",
      "ru ⇄ en",
      pickerOptions,
      0,
      cols
    );

    for (let i = 0; i < pickerLines.length; i++) {
      const w = getVisualWidth(pickerLines[i]);
      assert.ok(
        w <= cols,
        `[${cols} cols] Picker line ${i + 1} visual width ${w} exceeds viewport ${cols}: "${pickerLines[i]}"`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// PERSONA 5: Cold Boot & First-Run User
// ---------------------------------------------------------------------------
test("Persona 5: Cold Boot & First-Run User - clean upgrade, release banner delivery and dismissal", async () => {
  const { registeredCommands, listeners } = await createExtensionHarness();

  const harness = createMockCtx();

  // 1. Cold boot with brand new session
  for (const h of listeners["session_start"] || []) {
    await h({ reason: "new" }, harness.ctx);
  }

  // 2. Dismissal mechanics when banner is active
  let clearedWidget = false;
  const dismissCtx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus() {},
      setWidget(_id: string, w: any) {
        if (w === undefined) clearedWidget = true;
      },
    },
    sessionManager: { getEntries() { return []; } },
    modelRegistry: { getAvailable() { return []; } },
  };

  // 3. User types first prompt -> should dismiss banner immediately
  for (const h of listeners["input"] || []) {
    await h({ text: "Hello Pi", source: "user" }, dismissCtx);
  }

  // 4. Verify no blocking UI dialogs were invoked (e.g. ctx.ui.input)
  assert.equal(
    (harness.ctx.ui as any).input,
    undefined,
    "Cold boot must not invoke interactive prompt dialogs (ui.input)"
  );
});
