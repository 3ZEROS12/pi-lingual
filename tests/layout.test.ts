import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderCardLayout,
  getEffectiveMaxCols,
  getBannerMaxCols,
  truncateVisual,
  getVisualWidth,
  wrapVisualText,
  formatVocabItemsAtomic,
  formatCapsuleLine,
  formatTreeBranch,
  formatModePickerLines,
  formatLoadingMessage,
  extractVocabPhrases,
  spotlightPhrases,
  formatTerminalAnnotation,
  formatReleaseBannerLines,
  type ModePickerOption,
} from "../src/index.js";
import {
  resolveLabelsForLang,
  LANGUAGE_PRESETS,
  SUPPORTED_LANG_CODES,
  getDefaultFactoryModes,
  localizeModeName,
  resolveModeDisplayName,
  getDefaultSlots,
  removeSlotFromList,
} from "../src/presets.js";
import extensionFactory from "../dist/extension.js";
import type { LingualResult } from "../src/types.js";

test("layout: getEffectiveMaxCols and getBannerMaxCols clamp narrow viewports safely", () => {
  assert.equal(getEffectiveMaxCols(10), 25);
  assert.equal(getEffectiveMaxCols(0), 25);
  assert.equal(getEffectiveMaxCols(-5), 25);
  assert.equal(getEffectiveMaxCols(80), 80);

  const withCols = (cols: number, fn: () => void) => {
    const prev = process.env.COLUMNS;
    process.env.COLUMNS = String(cols);
    try {
      fn();
    } finally {
      if (prev === undefined) delete process.env.COLUMNS;
      else process.env.COLUMNS = prev;
    }
  };
  withCols(80, () => assert.equal(getBannerMaxCols(), 78));
  withCols(60, () => assert.equal(getBannerMaxCols(), 58));
  withCols(40, () => assert.equal(getBannerMaxCols(), 38));
  withCols(30, () => assert.equal(getBannerMaxCols(), 28));
  withCols(20, () => assert.equal(getBannerMaxCols(), 20));
  withCols(10, () => assert.equal(getBannerMaxCols(), 10));
});

test("layout: truncateVisual respects maxVisualCols, ANSI escapes, and atomic bracket closure", () => {
  const cjk = "落霞与孤鹜齐飞秋水共长天一色";
  assert.ok(getVisualWidth(truncateVisual(cjk, 10)) <= 10);
  assert.ok(getVisualWidth(truncateVisual(cjk, 15)) <= 15);
  assert.ok(getVisualWidth(truncateVisual(cjk, 20)) <= 20);

  const square = " [Mode 1: Companion Mode] ";
  const clippedSq = truncateVisual(square, 15);
  assert.ok(clippedSq.endsWith("]..."));
  assert.ok(!clippedSq.includes(")"));

  const round = " (some instruction here that overflows) ";
  assert.ok(truncateVisual(round, 18).endsWith(")..."));

  const cjkBr = " 【重要模式说明】长文本超宽截断测试 ";
  const clippedCjk = truncateVisual(cjkBr, 16);
  assert.ok(clippedCjk.includes("】"));
  assert.ok(!clippedCjk.includes(")"));

  const ansiVocab =
    "\x1b[90m + \x1b[38;2;120;120;120m[Vocab]\x1b[0m \x1b[38;2;200;200;200mуменьшительно-ласкательная форма (diminutive-hypocoristic form) · ровесники\x1b[0m";
  for (const cols of [40, 50, 60, 70, 80]) {
    const truncated = truncateVisual(ansiVocab, cols);
    assert.ok(!truncated.includes("]]"), `Must never inject stray ']]' at cols=${cols}`);
  }
});

test("layout: formatCapsuleLine bounds visual width across 20..80 cols and handles single slot", () => {
  const spoken = "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.";
  const written = "The proposed approach introduces unnecessary complexity. Native implementations are preferred.";

  for (const cols of [20, 30, 40, 50, 60, 80]) {
    const line = formatCapsuleLine("zh ⇄ en", spoken, written, {
      maxCols: cols,
      slot1Short: "口",
      slot2Short: "写",
    });
    assert.ok(getVisualWidth(line) <= cols, `Width ${getVisualWidth(line)} > ${cols}`);
    assert.ok(!line.includes("\n"));
  }

  const single = formatCapsuleLine("zh ⇄ en", "Let's keep going.", undefined, {
    maxCols: 60,
    slot1Short: "Spk",
    slot2Short: "Wrt",
  });
  assert.ok(single.startsWith("⇄ [zh ⇄ en] Spk: Let's keep going."));
  assert.ok(!single.includes(" · "));
});

test("layout: spotlightPhrases and formatTerminalAnnotation highlight spoken/written branches", () => {
  const vocab = "on board with (赞成/支持) · dive in (立刻着手/开始) · board (委员会)";
  const phrases = extractVocabPhrases(vocab);
  assert.deepEqual(phrases, ["on board with", "dive in", "board"]);

  const highlighted = spotlightPhrases("Totally on board with that - let's dive in right away.", phrases);
  assert.ok(highlighted.includes("\x1b[4mon board with\x1b[24m"), `Nested substring corrupted underline: ${highlighted}`);
  assert.ok(highlighted.includes("\x1b[4mdive in\x1b[24m"));
  assert.equal((highlighted.match(/\x1b\[4m/g) || []).length, 2);
  assert.equal((highlighted.match(/\x1b\[24m/g) || []).length, 2);

  const cjkSpot = spotlightPhrases("不要编写生硬的死代码", ["不要编写", "死代码"]);
  assert.ok(cjkSpot.includes("\x1b[4m不要编写\x1b[24m"));
  assert.ok(cjkSpot.includes("\x1b[4m死代码\x1b[24m"));

  const annotated = formatTerminalAnnotation(
    "认同，开始吧",
    "Totally on board with that - let's dive in.",
    "Acknowledged. Let's dive into implementation.",
    "on board with (赞成) · dive in (立刻着手)",
    { sourceLabel: "原文", slot1Label: "口语", slot2Label: "写作", vocabLabel: "重点" }
  );
  assert.ok(annotated.includes("\x1b[4m"));
  assert.ok(annotated.includes("\x1b[24m"));
});

test("layout: formatTreeBranch and wrapVisualText align hanging indents and respect Kinsoku Shori", () => {
  assert.equal(getVisualWidth("Hello"), 5);
  assert.equal(getVisualWidth("中文测试"), 8);
  assert.equal(getVisualWidth("\x1b[32mHello\x1b[0m"), 5);
  assert.equal(getVisualWidth("  ┌ [口语] "), 11);

  const longText = "Regarding the layout in C:\\Users\\Jason\\AppData\\Local\\Temp\\pi-clipboard-15e4d0e5.png, I'd like to tweak it. Why is the text rendering ahead of the heading?";
  const lines = formatTreeBranch("┌", "│", "口语", longText, (s) => s, (s) => s, (s) => s, 80);
  assert.ok(lines.length >= 2);
  assert.ok(lines[0].startsWith("  ┌ [口语] "));
  for (let i = 1; i < lines.length; i++) {
    assert.ok(lines[i].startsWith("  │        "), `Line ${i} must have hanging indent rail`);
  }

  const wrapped = wrapVisualText("这是一个测试文本，这里有很长的句子，并且标点符号不应该出现在行首。", 16);
  for (let i = 1; i < wrapped.length; i++) {
    assert.ok(![",", "，", "。", "！", "？", "；"].includes(wrapped[i][0]));
  }
});

test("layout: renderCardLayout enforces <= 9 lines, atomic vocab, 2-line source cap, and custom slots", () => {
  const labels = resolveLabelsForLang("zh");
  const card: LingualResult = {
    sourceText:
      "这是一个非常漫长且复杂的系统重构需求说明，包含了对于状态机、终端排版以及国际化多语言支持的深度技术架构探讨，涉及各个核心模块的协同改造与测试断言防护",
    spoken:
      "We're tackling a deeply intricate architecture overhaul covering our state machines, terminal layouts, and comprehensive i18n support across all core modules.",
    spokenMeaning: "我们正在攻坚一个非常深度的架构重构，涵盖状态机、终端排版和跨模块的国际化支持",
    written:
      "Initiating a comprehensive structural refactoring encompassing finite state machine orchestration, deterministic terminal box models, and multi-lingual globalization across decoupled subsystems.",
    writtenMeaning: "对有限状态机编排、确定性终端盒模型及解耦子系统的多语言全球化展开全面的结构性重构",
    vocab: "state machine (状态机) · box model (盒模型) · orchestration (编排) · decoupling (解耦)",
    annotated: "",
  };

  for (const cols of [85, 80, 45]) {
    const lines = renderCardLayout(card, labels, { maxCols: cols, maxLines: 9 });
    assert.ok(lines.length <= 9, `Lines at ${cols} cols must be <= 9`);
    const joined = lines.join("\n");
    assert.equal((joined.match(/\(/g) || []).length, (joined.match(/\)/g) || []).length);
  }

  for (const narrow of [30, 20]) {
    const lines = renderCardLayout(card, labels, { maxCols: narrow, maxLines: 9 });
    assert.equal(lines.length, 1);
    assert.ok(getVisualWidth(lines[0]) <= narrow);
  }

  const line50 = formatVocabItemsAtomic("trigger (触发) · compression (压缩) · threshold (临界值)", "  └ [重点] ", 50);
  assert.ok(line50.includes("trigger (触发)"));
  assert.ok(line50.includes("compression (压缩)"));
  assert.equal(line50.includes("threshold"), false);

  // Removing source slot hides source line
  const noSourceSlots = removeSlotFromList(getDefaultSlots("zh"), "source");
  const noSourceLines = renderCardLayout(card, labels, { slots: noSourceSlots, maxCols: 80 });
  assert.ok(!noSourceLines.join("\n").includes("[原文]"));

  // 7-row polyglot showcase fits within 9 lines
  const polyglotSlots = [
    { id: "source", label: "原文", role: "source" as const, enabled: true },
    ...["en", "ja", "ko", "fr", "de", "es", "ru"].map((id) => ({
      id,
      label: id.toUpperCase(),
      role: "translation" as const,
      showMeaning: false,
      enabled: true,
    })),
  ];
  const polyCard: LingualResult = {
    sourceText: "保持最小工作改动面",
    spoken: "Keep the smallest working diff.",
    annotated: "",
    slotOutputs: {
      en: { content: "Keep the smallest working diff." },
      ja: { content: "最小限の変更差分を保ってください。" },
      ko: { content: "최소 변경 범위를 유지하세요." },
      fr: { content: "Gardez un diff minimal." },
      de: { content: "Halten Sie den Diff minimal." },
      es: { content: "Mantén un diff mínimo." },
      ru: { content: "Сохраняйте минимальный diff." },
    },
  };
  const polyLines = renderCardLayout(polyCard, labels, { slots: polyglotSlots, maxCols: 80, maxLines: 9 });
  assert.ok(polyLines.length <= 9);
  assert.ok(polyLines.some((l) => l.includes("[RU]")));
});

test("layout: Russian narrow viewports (40 and 60 cols) stay within budget with balanced parentheses", () => {
  const labels = resolveLabelsForLang("ru", undefined, "en");
  const ruCard: LingualResult = {
    sourceText: "Пожалуйста, объясните подробно, как устроена система управления памятью в Node.js, включая сборку мусора V8.",
    spoken: "Объясни, как работает память в Node.js: сборщик мусора V8 и утечки из-за замыканий.",
    written: "Подробный обзор архитектуры управления оперативной памятью в среде выполнения Node.js.",
    vocab: "garbage collection (сборка мусора) · memory leak (утечка памяти) · closure (замыкание)",
    annotated: "",
  };
  for (const cols of [40, 60]) {
    const lines = renderCardLayout(ruCard, labels, { maxCols: cols, maxLines: 9 });
    assert.ok(lines.length <= 9);
    for (const l of lines) {
      assert.ok(getVisualWidth(l) <= cols);
      assert.equal((l.match(/\(/g) || []).length, (l.match(/\)/g) || []).length);
    }
  }
});

test("layout: release banner and loading indicator obey visual width across all 9 languages", () => {
  for (const lang of SUPPORTED_LANG_CODES) {
    const lines80 = formatReleaseBannerLines(lang, 78);
    assert.equal(lines80.length, 8);
    for (const line of lines80) {
      assert.ok(!line.endsWith("..."), `[${lang}] banner clipped at 78 cols: ${line}`);
      assert.ok(getVisualWidth(line) <= 78);
    }

    for (const cols of [20, 30, 40, 60, 80]) {
      const loading = formatLoadingMessage(lang, cols);
      assert.ok(getVisualWidth(loading) <= cols);
      for (const bLine of formatReleaseBannerLines(lang, cols)) {
        assert.ok(getVisualWidth(bLine) <= cols);
      }
    }
  }
});

test("layout: mode picker geometry and interactive custom UI hotkeys, navigation, and lock indicator", async () => {
  const opts: ModePickerOption[] = [
    { num: 1, id: "companion", name: "纯伴学", englishTag: "Companion" },
    { num: 2, id: "direct", name: "规范直发", englishTag: "Logical Spec" },
    { num: 3, id: "live-flow", name: "实战狂飙", englishTag: "Live Flow" },
    { num: 0, id: "off", name: "已关闭", englishTag: "Off" },
  ];
  for (const cols of [20, 30, 40, 80]) {
    for (let idx = 0; idx < opts.length; idx++) {
      for (const line of formatModePickerLines("伴学模式切换", "按 1/2/3/0 切换", "zh ⇄ en", opts, idx, cols)) {
        assert.ok(getVisualWidth(line) <= cols);
      }
    }
  }

  for (const lang of SUPPORTED_LANG_CODES) {
    const modes = getDefaultFactoryModes(lang, lang);
    const langOpts: ModePickerOption[] = modes.map((m, i) => ({
      num: i + 1,
      id: m.id,
      name: localizeModeName(m.id, m.name, lang),
      englishTag: lang === "en" ? undefined : m.name,
    }));
    langOpts.push({ num: 0, id: "off", name: resolveModeDisplayName("off", lang), englishTag: "Off" });
    for (const l of formatModePickerLines(LANGUAGE_PRESETS[lang].modePickerTitle!, LANGUAGE_PRESETS[lang].modePickerHint!, `${lang} ⇄ en`, langOpts, 0, 80)) {
      assert.ok(!l.endsWith("..."));
      if (lang === "en") assert.ok(!l.includes("(Companion)"));
    }
  }

  // Interactive custom UI test
  const registeredCommands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  } as any);

  let capturedComponent: any = null;
  let statusVal: any = "init";
  let doneCallCount = 0;
  const notifications: string[] = [];
  const mockCtx: any = {
    hasUI: true,
    ui: {
      custom(factory: any) {
        doneCallCount = 0;
        return new Promise((resolve) => {
          capturedComponent = factory(
            { requestRender() {} },
            { fg: (_c: string, t: string) => t, bold: (t: string) => t },
            {},
            (res: any) => {
              doneCallCount++;
              resolve(res);
            }
          );
        });
      },
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus(_id: string, val: any) {
        statusVal = val;
      },
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  const p2 = registeredCommands["lingual"].handler("", mockCtx);
  capturedComponent.handleInput("2");
  capturedComponent.handleInput("\r");
  await p2;
  assert.equal(doneCallCount, 1, "Double-done guard must fire once");

  const p0 = registeredCommands["lingual"].handler("", mockCtx);
  capturedComponent.handleInput("0");
  await p0;
  assert.equal(statusVal, undefined);

  await registeredCommands["lingual"].handler("lock", mockCtx);
  registeredCommands["lingual"].handler("", mockCtx);
  const lockedHeader = capturedComponent.render(80).join("\n");
  assert.ok(lockedHeader.includes("锁定") || lockedHeader.includes("Locked") || lockedHeader.includes("鎖定"));
  await registeredCommands["lingual"].handler("unlock", mockCtx);
});

test("layout: preview variant accounts for pageTag width inside maxCols", () => {
  const card: LingualResult = {
    sourceText: "测试超长预览模式分页标签宽度",
    spoken: "Refactor the authentication service to decouple token rotation from session lookup.",
    vocab: "decouple (解耦) · rotation (轮换)",
    annotated: "",
  };
  const lines = renderCardLayout(card, resolveLabelsForLang("zh"), {
    variant: "preview",
    maxCols: 45,
    pageTag: " [1/2 ⌥.]",
  });
  assert.equal(lines.length, 2);
  assert.ok(lines[0].endsWith(" [1/2 ⌥.]"), `Preview must preserve pageTag: ${lines[0]}`);
  assert.ok(getVisualWidth(lines[0]) <= 45, `Preview line 1 width ${getVisualWidth(lines[0])} > 45`);
});

test("layout: tree vocab branch wraps cleanly on item boundaries without splitting parentheses", () => {
  const card: LingualResult = {
    sourceText: "这个方案有点过度设计了",
    spoken: "This feels a bit over-engineered; stick with the standard library.",
    written: "The proposed approach introduces unnecessary complexity.",
    vocab: "over-engineered (过度工程化) · be better off (更合适) · stick with (沿用) · native (原生的)",
    annotated: "",
  };
  const lines = renderCardLayout(card, resolveLabelsForLang("zh"), { maxCols: 90, maxLines: 9 });
  for (const line of lines) {
    assert.equal((line.match(/\(/g) || []).length, (line.match(/\)/g) || []).length, `Unbalanced line: ${line}`);
  }
});
