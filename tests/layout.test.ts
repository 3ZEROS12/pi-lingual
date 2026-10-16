import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderCardLayout,
  getEffectiveMaxCols,
  truncateVisual,
  getVisualWidth,
  wrapVisualText,
  formatVocabItemsAtomic,
} from "../src/layout.js";
import { resolveLabelsForLang } from "../src/presets.js";
import type { LingualResult } from "../src/types.js";

test("getEffectiveMaxCols - guarantees minimum 25 columns under extreme SIGWINCH collapse", () => {
  assert.equal(getEffectiveMaxCols(10), 25);
  assert.equal(getEffectiveMaxCols(0), 25);
  assert.equal(getEffectiveMaxCols(-5), 25);
  assert.equal(getEffectiveMaxCols(80), 80);
});

test("renderCardLayout - renders tree branch for normal inputs within 9 lines", () => {
  const labels = resolveLabelsForLang("zh");
  const card: LingualResult = {
    sourceText: "把这个模块重构一下，消除技术债务",
    spoken: "Let's refactor this module to pay down tech debt.",
    spokenMeaning: "我们重构这个模块以偿还技术债务",
    written: "Refactor the module to eliminate accumulated technical debt.",
    writtenMeaning: "重构该模块以消除累积的技术债务",
    vocab: "refactor (重构) · technical debt (技术债务)",
    annotated: "",
  };

  const lines = renderCardLayout(card, labels, { maxCols: 80, maxLines: 9 });
  assert.ok(lines.length <= 9, `Lines in 80 cols must be <= 9 (got ${lines.length})`);
  assert.ok(lines.some((l) => l.includes("· [")), "Must have source line");
  assert.ok(lines.some((l) => l.includes("┌ [")), "Must have slot 1 branch");
  assert.ok(lines.some((l) => l.includes("├ [")), "Must have slot 2 branch");
  assert.ok(lines.some((l) => l.includes("└ [")), "Must have vocab branch");
});

test("renderCardLayout - guarantees output <= 9 lines on long multi-clause inputs with fallback", () => {
  const labels = resolveLabelsForLang("zh");
  const card: LingualResult = {
    sourceText: "这是一个非常漫长且复杂的系统重构需求说明，包含了对于状态机、终端排版以及国际化多语言支持的深度技术架构探讨，涉及各个核心模块的协同改造与测试断言防护",
    spoken: "We're tackling a deeply intricate architecture overhaul covering our state machines, terminal layouts, and comprehensive i18n support across all core modules.",
    spokenMeaning: "我们正在攻坚一个非常深度的架构重构，涵盖状态机、终端排版和跨模块的国际化支持",
    written: "Initiating a comprehensive structural refactoring encompassing finite state machine orchestration, deterministic terminal box models, and multi-lingual globalization across decoupled subsystems.",
    writtenMeaning: "对有限状态机编排、确定性终端盒模型及解耦子系统的多语言全球化展开全面的结构性重构",
    vocab: "state machine (状态机) · box model (盒模型) · orchestration (编排) · decoupling (解耦)",
    annotated: "",
  };

  // 1. 标准 80 列: 无论如何行数必须 <= 9
  const lines80 = renderCardLayout(card, labels, { maxCols: 80, maxLines: 9 });
  assert.ok(lines80.length <= 9, `Lines in 80 cols must be <= 9 (got ${lines80.length})`);

  // 2. 窄屏 45 列
  const lines45 = renderCardLayout(card, labels, { maxCols: 45, maxLines: 9 });
  assert.ok(lines45.length <= 9, `Lines in 45 cols must be <= 9 (got ${lines45.length})`);

  // 3. 极窄屏 30 列与 20 列 (自动降级为单行胶囊模式且严格满足 VisualWidth <= columns)
  const lines30 = renderCardLayout(card, labels, { maxCols: 30, maxLines: 9 });
  assert.equal(lines30.length, 1, "Extreme narrow width must degrade to 1-line capsule");
  assert.ok(lines30[0].includes("⇄ ["), "Capsule line must contain header title");
  assert.ok(getVisualWidth(lines30[0]) <= 30, `Capsule line must be <= 30 columns (got ${getVisualWidth(lines30[0])})`);

  // 4. 极端 20 列窗口 (Invariant 12)
  const lines20 = renderCardLayout(card, labels, { maxCols: 20, maxLines: 9 });
  assert.equal(lines20.length, 1, "20-column width must degrade to 1-line capsule");
  assert.ok(getVisualWidth(lines20[0]) <= 20, `Capsule line must be <= 20 columns (got ${getVisualWidth(lines20[0])})`);
});

test("renderCardLayout - explicit compact mode generates 1 line capsule with page tag", () => {
  const labels = resolveLabelsForLang("en");
  const card: LingualResult = {
    sourceText: "Please review the pull request.",
    spoken: "Could you take a look at the PR?",
    written: "Please conduct a formal review of the pull request.",
    annotated: "",
  };

  const lines = renderCardLayout(card, labels, {
    isCompact: true,
    pageTag: " [1/2]",
  });

  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes("⇄ ["));
  assert.ok(lines[0].endsWith("[1/2]"));
});

test("wrapVisualText - handles consecutive punctuation and Kinsoku Shori", () => {
  const wrapped = wrapVisualText("这是一个测试文本，这里有很长的句子，并且标点符号不应该出现在行首。", 16);
  for (let i = 1; i < wrapped.length; i++) {
    const firstChar = wrapped[i][0];
    assert.ok(![",", "，", "。", "！", "？", "；"].includes(firstChar), `Line ${i} should not start with punctuation '${firstChar}'`);
  }
});

test("renderCardLayout - target language integrity: no dangling open parentheses or severed sentences", () => {
  const labels = resolveLabelsForLang("zh");
  const card: LingualResult = {
    sourceText: "hi,我今天想跟你探讨的是林纳斯托瓦兹这个人，从前我只知道它是Linux的创始人，突然蔡发祥他竟然是Git和github的创始人，，这让我非常震惊",
    spoken: "Hey, I wanted to chat about Linus Torvalds today. I always knew him as the creator of Linux, but it just blew my mind to find out he also created Git and GitHub.",
    spokenMeaning: "嗨，今天想跟你聊聊林纳斯·托瓦兹。我以前只知道他是Linux的创始人，突然发现他居然也是Git和GitHub的创始人，这让我太震惊了。",
    written: "I would like to discuss Linus Torvalds today. Previously, I only recognized him as the creator of Linux; however, I recently discovered that he also created Git and GitHub, which came as quite a surprise to me.",
    writtenMeaning: "我想探讨一下林纳斯·托瓦兹。此前我只知晓他是Linux之父，近来方知Git与GitHub亦出自其手，深感震撼。",
    vocab: "blow one's mind (令人极度震撼/震惊) · find out (获悉/发现) · recognize someone as (将某人公认为/视作) · come as a shock (令人深感震惊)",
    annotated: "",
  };

  const lines = renderCardLayout(card, labels, { maxCols: 100, maxLines: 9 });
  assert.ok(lines.length <= 9, `Lines count must be <= 9 (got ${lines.length})`);

  // Verify all 4 rail branch tags exist
  assert.ok(lines.some(l => l.includes("· [原文]")), "Must retain · [原文]");
  assert.ok(lines.some(l => l.includes("┌ [口语]")), "Must retain ┌ [口语]");
  assert.ok(lines.some(l => l.includes("├ [写作]")), "Must retain ├ [写作]");
  assert.ok(lines.some(l => l.includes("└ [重点]")), "Must retain └ [重点]");

  // Verify no dangling open parentheses '(' without closing ')'
  const fullRendered = lines.join("\n");
  const openCount = (fullRendered.match(/\(/g) || []).length;
  const closeCount = (fullRendered.match(/\)/g) || []).length;
  assert.equal(openCount, closeCount, "All opened parentheses must be closed (no dangling unclosed '(')");

  // Verify target language is not severed mid-phrase
  assert.ok(fullRendered.includes("Git and GitHub."), "Spoken sentence must end cleanly");
  assert.ok(fullRendered.includes("quite a surprise to me."), "Written sentence must end cleanly");
});

test("renderCardLayout - clamps multi-line source text to max 2 lines with clean visual ellipsis", () => {
  const labels = resolveLabelsForLang("zh");
  const card: LingualResult = {
    sourceText: "黄仁勋身上有一种罕见的矛盾共存： - 他既有底层蓝领的粗砺与抗打击能力（不怕脏活、不怕被嘲笑、不端架子）； - 又有硬核工程师的严密逻辑与技术终局洞察（坚信物理法则与计算范式跃迁）； - 同时还具备德州扑克顶级选手的战略决绝（看准趋势敢把全部身家推到牌桌中央）。这些是他成功的根本吗？他的学业呢？大学学的什么专业，后来深造了吗？到底什么经历真的对他的事业起到了帮助",
    spoken: "Jensen blends blue-collar grit, hardcore tech vision, and high-stakes conviction.",
    written: "Evaluating Jensen Huang's success drivers: blue-collar resilience and EE background.",
    vocab: "blue-collar grit · tech vision",
    annotated: "",
  };

  const lines = renderCardLayout(card, labels, { maxCols: 80, maxLines: 9 });
  // Find lines starting with source bullet or indent
  const sourceLines = lines.filter(l => l.includes("· [原文]") || l.startsWith("          "));
  assert.ok(sourceLines.length <= 2, "Source text must be bounded to max 2 lines");
  assert.ok(sourceLines[sourceLines.length - 1].endsWith("..."), "The final source line must end with clean visual ellipsis '...'");
});

test("formatVocabItemsAtomic - preserves atomic term definitions and prevents dangling unclosed parentheses", () => {
  const vocab = "trigger (触发) · compression (压缩) · threshold (临界值)";

  // 1. Full width: all 3 items complete
  const line80 = formatVocabItemsAtomic(vocab, "  └ [重点] ", 80);
  assert.ok(line80.includes("trigger (触发)"));
  assert.ok(line80.includes("compression (压缩)"));
  assert.ok(line80.includes("threshold (临界值)"));

  // 2. Narrow width (50 cols): cleanly drops 3rd item without amputating parenthesis
  const line50 = formatVocabItemsAtomic(vocab, "  └ [重点] ", 50);
  assert.ok(line50.includes("trigger (触发)"));
  assert.ok(line50.includes("compression (压缩)"));
  assert.equal(line50.includes("threshold"), false);
  const openCount = (line50.match(/\(/g) || []).length;
  const closeCount = (line50.match(/\)/g) || []).length;
  assert.equal(openCount, closeCount, "All opened parentheses must be closed");

  // 3. Very narrow width (35 cols): retains 1 complete item, appends ' · ...', no unclosed parenthesis
  const line35 = formatVocabItemsAtomic(vocab, "  └ [重点] ", 35);
  assert.ok(line35.includes("trigger (触发)"));
  const open35 = (line35.match(/\(/g) || []).length;
  const close35 = (line35.match(/\)/g) || []).length;
  assert.equal(open35, close35, "All opened parentheses must be closed in narrow width");
});

test("renderCardLayout - intermediate gap multi-sentence: preserves complete vocab without clipping into 'compression (压缩 ...'", () => {
  const labels = resolveLabelsForLang("zh");
  // Exact user stress-test case from session 01a12087-bb1a-7429-867e-6056ad32fa7f
  const card: LingualResult = {
    sourceText: "我现在可能正在做的事情是测试到底什么时候会触发压缩。难道是现在吗？还是说需要到了现在。我再添加一句话呢？不知道现在是否会触发亚索",
    spoken: "I guess what I'm doing right now is testing what actually triggers the compression. Is it right now? Or does it take until now? What if I add one more sentence? Still not sure if this will trigger the compression.",
    written: "Current testing aims to determine the exact threshold that triggers compression. It remains unclear whether it activates at this point or requires further input; adding another sentence to verify if compression is initiated.",
    vocab: "trigger (触发) · compression (压缩)",
    annotated: "",
  };

  const lines = renderCardLayout(card, labels, { maxCols: 85, maxLines: 9 });
  assert.ok(lines.length <= 9, `Lines must be <= 9 (got ${lines.length})`);

  // All 4 branches must exist
  assert.ok(lines.some(l => l.includes("· [原文]")), "Must retain · [原文]");
  assert.ok(lines.some(l => l.includes("┌ [口语]")), "Must retain ┌ [口语]");
  assert.ok(lines.some(l => l.includes("├ [写作]")), "Must retain ├ [写作]");
  assert.ok(lines.some(l => l.includes("└ [重点]")), "Must retain └ [重点]");

  // Vocab line MUST NOT end with broken 'compression (压缩 ...'
  const vocabLine = lines.find(l => l.includes("└ [重点]")) || "";
  assert.ok(vocabLine.includes("trigger (触发)"), "Must include complete trigger");
  assert.ok(!vocabLine.includes("compression (压缩 ..."), "Must NOT cut off into dangling unclosed 'compression (压缩 ...'");

  const fullText = lines.join("\n");
  const openCount = (fullText.match(/\(/g) || []).length;
  const closeCount = (fullText.match(/\)/g) || []).length;
  assert.equal(openCount, closeCount, "All opened parentheses must be closed in the card");
});
