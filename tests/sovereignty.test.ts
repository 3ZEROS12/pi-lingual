import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLabelsForLang, formatStatusReport, formatModelSelectionMessage } from "../src/presets.js";
import { buildSystemPrompt, getDefaultSlots, getDefaultDirectSlots, getDefaultPromptSlots } from "../src/prompts.js";
import { formatTerminalAnnotation, stripLingualAnnotation, formatReleaseBannerLines, resolveModeDisplaySpec } from "../src/engine.js";

test("Primary Language Sovereignty - Japanese (ja) leaves ZERO Chinese in UI and labels", () => {
  const jaLabels = resolveLabelsForLang("ja");
  assert.equal(jaLabels.slot1Label, "口語");
  assert.equal(jaLabels.slot2Label, "文面");
  assert.equal(jaLabels.vocabLabel, "単語");
  assert.equal(jaLabels.sourceLabel, "原文");
  assert.equal(jaLabels.statusOriginal, "ja ⇄ en");
  assert.equal(jaLabels.statusEnglish, "ja ⇄ en");
  assert.equal(jaLabels.statusOff, "ja ⇄ en: off");

  // Notifications
  assert.ok(jaLabels.notifyOriginal?.includes("【原文モード】に切り替えました"));
  assert.ok(jaLabels.notifyEnglish?.includes("【英語モード】に切り替えました"));
  assert.ok(jaLabels.notifyOff?.includes("オフにしました"));
  assert.ok(jaLabels.notifyPaging?.includes("長文を分割しました"));
  assert.ok(jaLabels.notifyAgentHelp?.includes("lingual-tuner"));
  assert.ok(jaLabels.notifyAgentHelp?.includes("母語切替"));

  // Status report contains Japanese chrome
  const report = formatStatusReport(jaLabels, {
    mode: "original",
    sourceLang: "ja",
    targetLang: "en",
    activeModel: "auto",
  });
  assert.ok(report.includes("ステータスレポート"));
  assert.ok(report.includes("現在のモード: [original] (原文パススルー · 0ms非同期)"));
  assert.ok(report.includes("言語フロー: [ja ➔ en]"));
  assert.ok(report.includes("認証方式: Pi ネイティブインプロセス認証"));

  // Model selection
  const modelMsg = formatModelSelectionMessage(jaLabels, "auto", "• anthropic/claude-3-5-sonnet");
  assert.ok(modelMsg.includes("現在の学習モデル: auto"));
  assert.ok(modelMsg.includes("利用可能なモデル"));
});

test("Primary Language Sovereignty - English (en) leaves ZERO Chinese in UI and labels", () => {
  const enLabels = resolveLabelsForLang("en");
  assert.equal(enLabels.slot1Label, "Spoken");
  assert.equal(enLabels.slot2Label, "Written");
  assert.equal(enLabels.vocabLabel, "Vocab");
  assert.equal(enLabels.sourceLabel, "Source");
  assert.equal(enLabels.statusOriginal, "en ⇄ ja");
  assert.equal(enLabels.statusEnglish, "en ⇄ ja");
  assert.equal(enLabels.statusOff, "en ⇄ ja: off");

  // Status report has zero Chinese characters (excluding the cross-language totem "two ⇄ 二")
  const report = formatStatusReport(enLabels, {
    mode: "original",
    sourceLang: "en",
    targetLang: "ja",
    activeModel: "auto",
  });
  assert.ok(report.includes("Companion Status Report"));
  assert.ok(report.includes("[en ➔ ja]"));
  const reportWithoutTotem = report.replace("two ⇄ 二", "");
  assert.ok(!/[\u4e00-\u9fa5]/.test(reportWithoutTotem), "English status report must contain zero Chinese characters outside the totem");

  // Model selection has zero Chinese characters (excluding the cross-language totem "two ⇄ 二")
  const modelMsg = formatModelSelectionMessage(enLabels, "auto", "• google/gemini-3.8-flash");
  assert.ok(modelMsg.includes("Current companion model: auto"));
  const modelMsgWithoutTotem = modelMsg.replace("two ⇄ 二", "");
  assert.ok(!/[\u4e00-\u9fa5]/.test(modelMsgWithoutTotem), "English model selection must contain zero Chinese characters outside the totem");

  // Language switcher list and usage hint must have zero Chinese characters
  assert.ok(enLabels.langUsageHint, "English must have langUsageHint");
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.langUsageHint), "English langUsageHint must contain zero Chinese characters");
  assert.ok(Array.isArray(enLabels.langList) && enLabels.langList.length > 0, "English must have langList");
  for (const item of enLabels.langList) {
    assert.ok(!/[\u4e00-\u9fa5]/.test(item), `English langList item "${item}" must contain zero Chinese characters`);
  }

  // Dynamic language pair token substitution: en ➔ zh must yield [en ⇄ zh] notifications, zero [en ⇄ ja] residue
  const enZhLabels = resolveLabelsForLang("en", undefined, "zh");
  assert.equal(enZhLabels.hudTitle, "en ⇄ zh");
  assert.ok(enZhLabels.notifyOriginal?.includes("[en ⇄ zh]"));
  assert.ok(enZhLabels.notifyCompactOn?.includes("[en ⇄ zh]"));
  assert.ok(!enZhLabels.notifyOriginal?.includes("[en ⇄ ja]"));
  assert.ok(!enZhLabels.notifyCompactOn?.includes("[en ⇄ ja]"));

  // Dynamic slots chrome in English must contain ZERO Chinese characters
  assert.equal(enLabels.slotsHeader, "Dynamic Slots Architecture");
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.slotsHeader!));
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.slotsNlTitle!));
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.slotsCliTitle!));
  for (const ex of enLabels.slotsNlExamples || []) {
    assert.ok(!/[\u4e00-\u9fa5]/.test(ex));
  }
  for (const cmd of enLabels.slotsCliHelp || []) {
    assert.ok(!/[\u4e00-\u9fa5]/.test(cmd));
  }
  // Status report tuner line in English has zero Chinese characters
  assert.ok(enLabels.statusReportTuner?.includes("lingual-tuner"));
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.statusReportTuner!));
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.notifyAgentHelp!));
});

test("Primary Language Sovereignty - Chinese (zh) dynamic slots chrome has ZERO English residue in UI headers & commands", () => {
  const zhLabels = resolveLabelsForLang("zh");
  assert.equal(zhLabels.slotsHeader, "动态槽位架构");
  assert.equal(zhLabels.slotsActiveTag, "激活");
  assert.equal(zhLabels.slotsStatusEnabled, "已启用");
  assert.equal(zhLabels.slotsStatusDisabled, "已禁用");
  assert.equal(zhLabels.slotsWithNuance, " +母语微释义");
  assert.ok(zhLabels.slotsNlTitle?.includes("自然语言定制"));
  assert.ok(zhLabels.slotsCliTitle?.includes("常用快捷命令"));
  assert.ok(zhLabels.slotsResetSuccess?.includes("已重置槽位为初始默认状态"));
  assert.ok(zhLabels.slotsRemovedSuccess?.includes("已移除槽位"));
  assert.ok(zhLabels.slotsRemovedSourceNote?.includes("已物理隐藏原文行"));
  assert.ok(zhLabels.statusReportTuner?.includes("lingual-tuner"));
  assert.ok(zhLabels.statusReportTuner?.includes("槽位调优"));
  assert.ok(zhLabels.notifyAgentHelp?.includes("lingual-tuner"));
  assert.ok(zhLabels.notifyAgentHelp?.includes("槽位调优技能"));
});

test("System Prompt Sovereignty - Generates authentic Language A anchors and rules", () => {
  // Japanese prompt specifies Japanese nuances and Japanese golden anchors
  const jaPrompt = buildSystemPrompt("ja", "en");
  assert.ok(jaPrompt.includes("native Japanese (language A)"));
  assert.ok(jaPrompt.includes("賛成、始めましょう"));
  assert.ok(jaPrompt.includes("大賛成、すぐに始めよう"));
  assert.ok(jaPrompt.includes("過剰設計"));
  assert.ok(!jaPrompt.includes("认同，开始吧"), "Japanese prompt must not have Chinese anchor sentences");

  // Spanish prompt specifies Spanish nuances and Spanish golden anchors
  const esPrompt = buildSystemPrompt("es", "en");
  assert.ok(esPrompt.includes("native Spanish (language A)"));
  assert.ok(esPrompt.includes("De acuerdo, empecemos"));
  assert.ok(esPrompt.includes("Totalmente de acuerdo, vamos al grano"));

  // English prompt specifies English nuances
  const enPrompt = buildSystemPrompt("en", "ja");
  assert.ok(enPrompt.includes("native English (language A)"));
  assert.ok(enPrompt.includes("Sounds good, let's ship it."));

  // Strict Zero-Chinese-Residue across all non-Chinese source languages in Mode 1, Mode 2, Mode 3, Mode Chrome, and Release Banner
  for (const lang of ["en", "ko", "es", "fr", "de", "ru"]) {
    if (lang !== "en") {
      const sys1 = buildSystemPrompt(lang, "en", false, undefined, "general", getDefaultSlots(lang));
      assert.ok(!/[\u4e00-\u9fa5]/.test(sys1), `Mode 1 system prompt for [${lang}] must have ZERO Chinese characters`);
    }
    const mode1Slots = JSON.stringify(getDefaultSlots(lang));
    assert.ok(!/[\u4e00-\u9fa5]/.test(mode1Slots), `Mode 1 default slots for [${lang}] must have ZERO Chinese characters`);

    const directSlots = JSON.stringify(getDefaultDirectSlots(lang));
    assert.ok(!/[\u4e00-\u9fa5]/.test(directSlots), `Mode 2 directSlots for [${lang}] must have ZERO Chinese characters`);

    const promptSlots = JSON.stringify(getDefaultPromptSlots(lang));
    assert.ok(!/[\u4e00-\u9fa5]/.test(promptSlots), `Mode 3 promptSlots for [${lang}] must have ZERO Chinese characters`);

    const banner = formatReleaseBannerLines(lang, 80).join("\n");
    assert.ok(!/[\u4e00-\u9fa5]/.test(banner), `Release banner for [${lang}] must have ZERO Chinese characters`);
    assert.ok(!/IELTS|雅思/i.test(banner), `Public release banner for [${lang}] must not carry exam-specific IELTS branding`);
  }

  // Japanese (ja ⇄ en) uses authentic Japanese labels & instructions across all 3 modes
  const jaDirect = getDefaultDirectSlots("ja");
  assert.equal(jaDirect[0].label, "論理構造化");
  const jaCandidates = getDefaultPromptSlots("ja");
  assert.deepEqual(jaCandidates.map((s) => s.label), ["簡潔・高効率", "構造化仕様", "根本原因・厳密", "重要語彙"]);
  const jaModeSpec = resolveModeDisplaySpec("ja");
  assert.equal(jaModeSpec.companion, "伴走");
  assert.equal(jaModeSpec.direct, "直改");
  assert.equal(jaModeSpec.candidates, "候補選");
  const jaSys = buildSystemPrompt("ja", "en", false, undefined, "general", getDefaultSlots("ja"));
  assert.ok(!jaSys.includes("释义"), "Japanese system prompt with default slots must NOT contain Chinese '释义'");
  assert.ok(jaSys.includes("in Japanese in parentheses"));
});

test("Visual Consistency - Source line tag matches [Original] format and aligns to column 11", () => {
  const annotated = formatTerminalAnnotation(
    "认同，开始吧",
    "Totally on board with that.",
    "Acknowledged. Let's proceed.",
    "on board with (赞成)",
    {
      sourceLabel: "原文",
      slot1Label: "口语",
      slot2Label: "写作",
      vocabLabel: "重点",
      spokenMeaning: "完全赞同",
    }
  );

  const lines = annotated.split("\n");
  // Line 0 must be formatted as:   · [原文] ...
  assert.ok(lines[0].includes("  · [原文] 认同，开始吧"));
  const cleanLine1 = lines[1].replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  assert.ok(cleanLine1.includes("  ┌ [口语] Totally on board with that."));

  // Recovery via stripLingualAnnotation works with bracketed source tag
  const recovered = stripLingualAnnotation(annotated);
  assert.equal(recovered.raw, "认同，开始吧");
  assert.equal(recovered.spoken, "Totally on board with that.");
});
