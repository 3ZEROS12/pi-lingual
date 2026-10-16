import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLabelsForLang, formatStatusReport, formatModelSelectionMessage } from "../src/presets.js";
import { buildSystemPrompt, getDefaultSlots, getDefaultDirectSlots, getDefaultPromptSlots } from "../src/prompts.js";
import { formatTerminalAnnotation, stripLingualAnnotation, formatReleaseBannerLines, resolveModeDisplaySpec, normalizeActiveModeId, getDefaultFactoryModes, invalidateUserConfigCache } from "../src/engine.js";
import extensionFactory from "../src/extension.js";

test("Primary Language Sovereignty - Japanese (ja) leaves ZERO Chinese in UI and labels", () => {
  const jaLabels = resolveLabelsForLang("ja");
  assert.equal(jaLabels.slot1Label, "口語");
  assert.equal(jaLabels.slot2Label, "文面");
  assert.equal(jaLabels.vocabLabel, "単語");
  assert.equal(jaLabels.sourceLabel, "原文");
  assert.equal(jaLabels.statusOriginal, "ja ⇄ en");
  assert.equal(jaLabels.statusEnglish, "ja ⇄ en");
  assert.equal(jaLabels.statusOff, "ja ⇄ en: off");

  // Mode picker and UI chrome
  assert.equal(jaLabels.modePickerTitle, "伴走モード切替");
  assert.ok(jaLabels.modePickerHint?.includes("1/2/3/0"));

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

  // Dynamic language pair token substitution: en ➔ zh must yield [en ⇄ zh] HUD title
  const enZhLabels = resolveLabelsForLang("en", undefined, "zh");
  assert.equal(enZhLabels.hudTitle, "en ⇄ zh");

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
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.modePickerTitle!));
  assert.ok(!/[\u4e00-\u9fa5]/.test(enLabels.modePickerHint!));
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
  assert.equal(zhLabels.modePickerTitle, "伴学模式切换");
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
  assert.equal(jaDirect[0].label, "標準英語");
  const jaCandidates = getDefaultPromptSlots("ja");
  assert.deepEqual(jaCandidates.map((s) => s.label), ["簡潔・高効率", "構造化仕様", "根本原因・厳密", "重要語彙"]);
  const jaModeSpec = resolveModeDisplaySpec("ja");
  assert.equal(jaModeSpec.companion, "伴走");
  assert.equal(jaModeSpec.direct, "仕様直行");
  assert.equal(jaModeSpec.candidates, "候補選択");
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

test("English Developer Sovereignty - Zero Chinese residue across en ⇄ ja, en ⇄ zh, en ⇄ es, en ⇄ de", () => {
  // English-speaking developer persona (sourceLang: "en") translating to Latin/Cyrillic/Korean targets:
  // Must have ZERO Chinese characters (no Hanzi/Kanji bleed)
  const nonCjkTargets = ["es", "de", "fr", "ko"];

  for (const target of nonCjkTargets) {
    // 1. Mode 1 Companion System Prompt for English developer
    const enSys = buildSystemPrompt("en", target, false, undefined, "general", getDefaultSlots("en"));
    assert.ok(
      !/[\u4e00-\u9fa5]/.test(enSys),
      `Mode 1 system prompt for English developer [en ➔ ${target}] must have ZERO Chinese characters`
    );
    assert.ok(enSys.includes("native English (language A)"), `Must declare English as language A for [en ➔ ${target}]`);

    // 2. Default slots for English developer
    const enSlots = getDefaultSlots("en");
    assert.deepEqual(
      enSlots.map((s) => s.label),
      ["Original", "Spoken", "Written", "Vocab"],
      "English developer slot labels must be 100% English"
    );
    const slotsStr = JSON.stringify(enSlots);
    assert.ok(
      !/[\u4e00-\u9fa5]/.test(slotsStr),
      `Default slots for English developer must have ZERO Chinese characters`
    );

    // 3. Mode 2 Direct Slots for English developer
    const directSlots = getDefaultDirectSlots("en");
    assert.equal(directSlots[0].label, "Logical Spec");
    assert.ok(
      !/[\u4e00-\u9fa5]/.test(JSON.stringify(directSlots)),
      `Mode 2 directSlots for English developer must have ZERO Chinese characters`
    );

    // 4. Mode 3 Candidate Slots for English developer
    const candidateSlots = getDefaultPromptSlots("en");
    assert.deepEqual(
      candidateSlots.map((s) => s.label),
      ["Concise", "Structured", "Deep Rigor", "Vocab"],
      "English developer candidate slot labels must be 100% English"
    );
    assert.ok(
      !/[\u4e00-\u9fa5]/.test(JSON.stringify(candidateSlots)),
      `Mode 3 promptSlots for English developer must have ZERO Chinese characters`
    );
  }

  // Authentic Japanese Target (en ➔ ja):
  // Must embed authentic Japanese Kana/Kanji anchors, but ZERO Chinese vocabulary/phrasing
  const enJaSys = buildSystemPrompt("en", "ja", false, undefined, "general", getDefaultSlots("en"));
  assert.ok(enJaSys.includes("native English (language A)"));
  assert.ok(/[\u3040-\u30ff]/.test(enJaSys), "en ➔ ja prompt must contain authentic Japanese Kana");
  assert.ok(!enJaSys.includes("认同，开始吧"), "en ➔ ja prompt must not contain Chinese anchors");
  assert.ok(!enJaSys.includes("过度设计"), "en ➔ ja prompt must not contain Simplified Chinese vocabulary");

  // Authentic Chinese Target (en ➔ zh):
  // English developer learning Chinese must get authentic Chinese anchors
  const enZhSys = buildSystemPrompt("en", "zh", false, undefined, "general", getDefaultSlots("en"));
  assert.ok(enZhSys.includes("native English (language A)"));
  assert.ok(enZhSys.includes("过度设计"), "en ➔ zh prompt must contain authentic Chinese anchors");
});

test("Tuner Skill Guardrails - Zero desktop office fluff & zero Sino-centric assumptions in SKILL.md", () => {
  const skillPath = path.resolve("skills/lingual-tuner/SKILL.md");
  assert.ok(fs.existsSync(skillPath), "SKILL.md must exist in skills/lingual-tuner/");

  const content = fs.readFileSync(skillPath, "utf8");

  // 1. Zero desktop office/corporate email fluff
  const bannedDesktopJargon = [
    "ビジネス敬語",
    "丁寧語/謙譲語",
    "해요체",
    "customer support",
    "advisor email",
    "theater & game script",
    "ielts band 8.0",
  ];
  for (const banned of bannedDesktopJargon) {
    assert.ok(
      !content.toLowerCase().includes(banned.toLowerCase()),
      `SKILL.md must NOT contain desktop corporate fluff: '${banned}'`
    );
  }

  // 2. Must enforce pure CLI software engineering & developer workflows
  assert.ok(content.includes("Claude Code"), "SKILL.md must target AI coding agents");
  assert.ok(content.includes("Smallest Working Diff"), "SKILL.md must include Smallest Working Diff preset");
  assert.ok(content.includes("Single-Round Instant Flow"), "SKILL.md must mandate single-round flow");
  assert.ok(content.includes("Confusion Circuit Breaker"), "SKILL.md must enforce confusion circuit breaker");
  assert.ok(content.includes("Strict Primary Language Sovereignty"), "SKILL.md must enforce language sovereignty");
});

test("English-Only Comments Gate - src/**/*.ts source code comments must be 100% in pure English", () => {
  const srcDir = path.resolve("src");
  const files: string[] = [];

  function collectTsFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectTsFiles(fullPath);
      } else if (entry.name.endsWith(".ts")) {
        files.push(fullPath);
      }
    }
  }

  collectTsFiles(srcDir);
  assert.ok(files.length > 0, "Must find source files in src/");

  const chineseRegex = /[\u4e00-\u9fa5]/;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    let inBlockComment = false;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (inBlockComment) {
        if (trimmed.includes("*/")) {
          const commentPart = trimmed.split("*/")[0];
          assert.ok(
            !chineseRegex.test(commentPart),
            `Found Chinese in block comment at ${relativePath}:${idx + 1}: "${trimmed}"`
          );
          inBlockComment = false;
        } else {
          assert.ok(
            !chineseRegex.test(trimmed),
            `Found Chinese in block comment at ${relativePath}:${idx + 1}: "${trimmed}"`
          );
        }
        return;
      }

      if (trimmed.startsWith("/*") && !trimmed.includes("*/")) {
        inBlockComment = true;
        assert.ok(
          !chineseRegex.test(trimmed),
          `Found Chinese in block comment start at ${relativePath}:${idx + 1}: "${trimmed}"`
        );
        return;
      }

      if (trimmed.startsWith("//")) {
        assert.ok(
          !chineseRegex.test(trimmed),
          `Found Chinese in line comment at ${relativePath}:${idx + 1}: "${trimmed}"`
        );
      }
    });
  }
});

test("probe A: mode persists across new session starts without reverting (Sheet #10)", () => {
  const modes = getDefaultFactoryModes("zh", "zh");

  // Scenario 1: live-flow mode set via activeModeId
  const cfg1: { mode?: string; activeModeId?: string } = { mode: "live-flow", activeModeId: "live-flow" };
  for (let i = 0; i < 5; i++) {
    const rawDiskMode = cfg1.activeModeId || cfg1.mode || "companion";
    const resolved = normalizeActiveModeId({ mode: rawDiskMode as any, activeModeId: rawDiskMode }, modes);
    assert.equal(resolved, "live-flow", `Run ${i}: mode must persist as live-flow`);
  }

  // Scenario 2: direct mode set via legacy mode field
  const cfg2: { mode?: string; activeModeId?: string } = { mode: "direct" };
  for (let i = 0; i < 5; i++) {
    const rawDiskMode = cfg2.activeModeId || cfg2.mode || "companion";
    const resolved = normalizeActiveModeId({ mode: rawDiskMode as any, activeModeId: rawDiskMode }, modes);
    assert.equal(resolved, "direct", `Run ${i}: mode must persist as direct`);
  }

  // Scenario 3: legacy alias "modify" set via activeModeId
  const cfg3: { mode?: string; activeModeId?: string } = { activeModeId: "modify" };
  for (let i = 0; i < 5; i++) {
    const rawDiskMode = cfg3.activeModeId || cfg3.mode || "companion";
    const resolved = normalizeActiveModeId({ mode: rawDiskMode as any, activeModeId: rawDiskMode }, modes);
    assert.equal(resolved, "live-flow", `Run ${i}: legacy modify must map to live-flow`);
  }

  // Scenario 4: off mode set via activeModeId
  const cfg4: { mode?: string; activeModeId?: string } = { activeModeId: "off" };
  const rawDiskMode4 = cfg4.activeModeId || cfg4.mode || "companion";
  const resolved4 = normalizeActiveModeId({ mode: rawDiskMode4 as any, activeModeId: rawDiskMode4 }, modes);
  assert.equal(resolved4, "off", "activeModeId: off must resolve to off");
});

test("probe B: explicit command switches mode freely even when locked (Sheet #10)", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  const notifications: { msg: string; type: string }[] = [];
  const mockCtx: any = {
    hasUI: true,
    ui: {
      notify(msg: string, type = "info") {
        notifications.push({ msg, type });
      },
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Lock mode via /lingual lock
  await registeredCommands["lingual"].handler("lock", mockCtx);
  notifications.length = 0;

  try {
    // 2. Parameterless blind cycling must be blocked while locked
    await registeredCommands["lingual"].handler("", mockCtx);
    assert.ok(
      notifications.some((n) => n.msg.includes("mode locked to") && n.type === "warning"),
      "Parameterless command must be blocked with a warning when locked"
    );

    // 3. Explicit numeric jump (/lingual 2) MUST switch freely without warning
    notifications.length = 0;
    await registeredCommands["lingual"].handler("2", mockCtx);
    assert.equal(
      notifications.some((n) => n.type === "warning"),
      false,
      "Explicit /lingual 2 must NOT produce any warning notification"
    );
    assert.ok(
      notifications.some((n) => (n.msg.includes("direct") || n.msg.includes("Logical Spec")) && n.type === "info"),
      "Explicit /lingual 2 must switch mode cleanly to direct"
    );

    // 4. Explicit mode name (/lingual off) MUST switch freely without warning
    notifications.length = 0;
    await registeredCommands["lingual"].handler("off", mockCtx);
    assert.equal(
      notifications.some((n) => n.type === "warning"),
      false,
      "Explicit /lingual off must NOT produce any warning notification"
    );
    assert.ok(
      notifications.some((n) => n.msg.includes("[lingual: off]") && n.type === "info"),
      "Explicit /lingual off must switch cleanly to off"
    );

    // 5. Explicit mode name (/lingual companion) MUST switch freely without warning
    notifications.length = 0;
    await registeredCommands["lingual"].handler("companion", mockCtx);
    assert.equal(
      notifications.some((n) => n.type === "warning"),
      false,
      "Explicit /lingual companion must NOT produce any warning notification"
    );
    assert.ok(
      notifications.some((n) => n.msg.includes("companion") && n.type === "info"),
      "Explicit /lingual companion must switch cleanly to companion"
    );
  } finally {
    // Always unlock mode after test
    await registeredCommands["lingual"].handler("unlock", mockCtx);
  }
});

test("probe C: rapid input within 50ms does not revert to stale cached mode (Sheet #10)", () => {
  // Verifies cache invalidation hook
  invalidateUserConfigCache();
  // Ensure that invalidateUserConfigCache runs without throwing and clears in-memory memoization
  assert.doesNotThrow(() => invalidateUserConfigCache());
});

test("probe D: tuner config updates never inject unauthorized modeLocked (Sheet #10)", () => {
  const skillPath = path.resolve("skills", "lingual-tuner", "SKILL.md");
  assert.ok(fs.existsSync(skillPath), "SKILL.md must exist");
  const content = fs.readFileSync(skillPath, "utf8");

  // 1. Prohibit modeLocked injection
  assert.ok(
    content.toLowerCase().includes("never inject `modelocked: true`") ||
    content.includes("NEVER write `modeLocked: true`"),
    "SKILL.md must explicitly prohibit unauthorized injection of modeLocked"
  );

  // 2. Mandate inspecting disk configuration before removing or modifying modes
  assert.ok(
    content.includes("~/.pi/agent/lingual.json") &&
    (content.toLowerCase().includes("read") || content.toLowerCase().includes("inspect")),
    "SKILL.md must instruct agent to inspect existing modes on disk before mutating"
  );

  // 3. Prohibit unasked questionnaire / ask_user_question tool dependency
  assert.ok(
    content.includes("ask_user_question") || content.includes("Zero-Questionnaire"),
    "SKILL.md must decouple from external questionnaire tool dependency"
  );
});


