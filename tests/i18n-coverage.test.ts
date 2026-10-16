import test from "node:test";
import assert from "node:assert/strict";
import {
  LANGUAGE_PRESETS,
  SUPPORTED_LANG_CODES,
  SEED_NAMES,
  resolveModeDisplaySpec,
  resolveSelectPrompts,
  getDefaultSlots,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
} from "../src/index.js";

// Whitelist of legitimate language-neutral keys or shared linguistic cognates
const ALLOW_EQUAL_EN: Record<string, Set<string>> = {
  // Unicode directional visual rail indicator glyph, identical across all languages
  subNuanceLabel: new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru"]),
  // In French, "Source" is the genuine native noun for source/origin
  sourceLabel: new Set(["fr"]),
  // In French, "nuance" is the genuine native noun (from which English borrowed it)
  slotsWithNuance: new Set(["fr"]),
};

test("i18n invariant (a): all 9 languages implement every key defined in English preset", () => {
  const enKeys = Object.keys(LANGUAGE_PRESETS.en);
  assert.ok(enKeys.length >= 80, `English preset must define extensive labels (got ${enKeys.length})`);

  for (const lang of SUPPORTED_LANG_CODES) {
    if (lang === "en") continue;
    const preset = LANGUAGE_PRESETS[lang];
    assert.ok(preset, `[${lang}] preset must exist in LANGUAGE_PRESETS`);

    for (const key of enKeys) {
      const val = (preset as any)[key];
      assert.ok(
        val !== undefined && val !== "",
        `[${lang}] missing or empty key "${key}" present in en preset`
      );

      const enVal = (LANGUAGE_PRESETS.en as any)[key];
      const isAllowed = ALLOW_EQUAL_EN[key]?.has(lang);
      if (!isAllowed && typeof val === "string") {
        assert.notEqual(
          val,
          enVal,
          `[${lang}] key "${key}" must not fall back to English value "${enVal}"`
        );
      }
    }
  }
});

test("i18n invariant (b): all language-to-string tables cover all 9 languages without gaps", () => {
  for (const lang of SUPPORTED_LANG_CODES) {
    // 1. SEED_NAMES (12 keys)
    const seed = (SEED_NAMES as any)[lang];
    assert.ok(seed, `[${lang}] must exist in SEED_NAMES`);
    for (const k of [
      "companion",
      "direct",
      "liveFlow",
      "candidates",
      "loadoutSpec",
      "loadoutCommit",
      "loadoutOss",
      "loadoutYap",
      "vocab",
      "fixed",
      "native",
      "takeaway",
    ]) {
      assert.ok(seed[k], `[${lang}] SEED_NAMES missing key "${k}"`);
    }

    // 2. resolveModeDisplaySpec
    const modeSpec = resolveModeDisplaySpec(lang);
    assert.ok(modeSpec.companion, `[${lang}] modeSpec.companion missing`);
    assert.ok(modeSpec.direct, `[${lang}] modeSpec.direct missing`);
    assert.ok(modeSpec.candidates, `[${lang}] modeSpec.candidates missing`);
    assert.ok(modeSpec.modify, `[${lang}] modeSpec.modify missing`);
    assert.ok(modeSpec.off, `[${lang}] modeSpec.off missing`);
    assert.ok(typeof modeSpec.notifyOff === "function", `[${lang}] modeSpec.notifyOff missing`);

    // 3. resolveSelectPrompts
    const sp = resolveSelectPrompts(lang, 3);
    assert.ok(sp.title, `[${lang}] selectPrompts.title missing`);
    assert.ok(sp.keepOrig, `[${lang}] selectPrompts.keepOrig missing`);
    assert.ok(sp.hint, `[${lang}] selectPrompts.hint missing`);

    // 4. Slot generators
    const s = getDefaultSlots(lang);
    assert.equal(s.length, 4, `[${lang}] getDefaultSlots must return 4 slots`);
    s.forEach((slot) => assert.ok(slot.label, `[${lang}] slot ${slot.id} has empty label`));

    const ds = getDefaultDirectSlots(lang);
    assert.equal(ds.length, 2, `[${lang}] getDefaultDirectSlots must return 2 slots`);
    ds.forEach((slot) => assert.ok(slot.label, `[${lang}] direct slot ${slot.id} has empty label`));

    const ps = getDefaultPromptSlots(lang);
    assert.equal(ps.length, 4, `[${lang}] getDefaultPromptSlots must return 4 slots`);
    ps.forEach((slot) => assert.ok(slot.label, `[${lang}] prompt slot ${slot.id} has empty label`));

    const ms = getDefaultModifySlots(lang);
    assert.equal(ms.length, 3, `[${lang}] getDefaultModifySlots must return 3 slots`);
    ms.forEach((slot) => assert.ok(slot.label, `[${lang}] modify slot ${slot.id} has empty label`));

    // 5. Loading indicators
    const p = LANGUAGE_PRESETS[lang];
    assert.ok(p.loadingOptimizePrompt, `[${lang}] loadingOptimizePrompt missing`);
    assert.ok(p.loadingFixSyntax, `[${lang}] loadingFixSyntax missing`);
    assert.ok(p.loadingCandidates, `[${lang}] loadingCandidates missing`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(p.loadingOptimizePrompt), `[${lang}] loadingOptimizePrompt must have zero emoji`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(p.loadingFixSyntax), `[${lang}] loadingFixSyntax must have zero emoji`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(p.loadingCandidates), `[${lang}] loadingCandidates must have zero emoji`);

    // 6. Interactive mode picker
    assert.ok(p.modePickerTitle, `[${lang}] modePickerTitle missing`);
    assert.ok(p.modePickerHint, `[${lang}] modePickerHint missing`);
  }
});

test("i18n invariant (c): Traditional Chinese (tw) contains zero Simplified Chinese characters", () => {
  // Layer 1: Comprehensive Simplified-only characters blacklist (94 characters)
  const STRICTLY_SIMPLIFIED_CHARS = [
    // Audit-specified core characters:
    "选", "词", "优", "时", "开", "关", "变", "现", "进", "击", "产", "写", "读", "点", "确", "认", "设", "预", "证", "择",
    // Core technical UI vocabulary simplified forms:
    "码", "语", "错", "补", "发", "备", "单", "键", "换", "实", "战", "装", "联", "动", "极", "专", "标", "准",
    "构", "规", "范", "数", "据", "转", "复", "机", "项", "简", "体", "验",
    "仅", "适", "会", "话", "说", "导", "对", "齐", "隐", "显", "帮", "执", "删", "创", "当", "态", "录", "调", "锁",
    "输", "释", "义", "历", "页", "载", "库", "贴", "拦", "杂", "并", "询", "问", "宽", "栏", "两", "类", "归", "签", "随",
    "统", "计", "总", "误", "经"
  ];
  const twPreset = LANGUAGE_PRESETS.tw;
  assert.ok(twPreset, "tw preset must exist");

  const twTextDump = JSON.stringify(twPreset);
  for (const char of STRICTLY_SIMPLIFIED_CHARS) {
    assert.ok(
      !twTextDump.includes(char),
      `Traditional Chinese preset leaked Simplified Chinese character "${char}"`
    );
  }

  const twSeedDump = JSON.stringify(SEED_NAMES.tw);
  for (const char of STRICTLY_SIMPLIFIED_CHARS) {
    assert.ok(
      !twSeedDump.includes(char),
      `Traditional Chinese SEED_NAMES leaked Simplified Chinese character "${char}"`
    );
  }

  // Layer 2: Reverse assertion — tw[key] === zh[key] with CJK must be in explicit homoglyph whitelist
  const zhPreset = LANGUAGE_PRESETS.zh;
  assert.ok(zhPreset, "zh preset must exist");

  const ALLOWED_TW_ZH_IDENTICAL_CJK_KEYS = new Set([
    "sourceLabel", // "原文" (identical glyph in Traditional and Simplified)
    "capsuleSlot1Prefix", // "口" (identical glyph in Traditional and Simplified)
    "slotsRemovedSuccess", // "[{pair}] 已移除槽位 [{id}] (\"{label}\")" (已/移/除/槽/位 all identical glyphs)
    "slotsUsageAdd", // "用法: /slots add <id> <label> [instruction...]" (用法 identical glyphs)
    "slotsUsageRm", // "用法: /slots rm <slot-id>"
    "slotsUsageToggle", // "用法: /slots toggle <slot-id>"
  ]);

  for (const key of Object.keys(zhPreset) as (keyof typeof zhPreset)[]) {
    const zhVal = (zhPreset as any)[key];
    const twVal = (twPreset as any)[key];
    const rawStr = typeof twVal === "string" ? twVal : JSON.stringify(twVal);
    const hasCjk = /[\u4e00-\u9fa5]/.test(rawStr);

    if (JSON.stringify(zhVal) === JSON.stringify(twVal) && hasCjk) {
      assert.ok(
        ALLOWED_TW_ZH_IDENTICAL_CJK_KEYS.has(key),
        `[${key}] in tw preset is identical to zh preset ("${rawStr}") but is not in ALLOWED_TW_ZH_IDENTICAL_CJK_KEYS whitelist; must provide authentic Traditional Chinese translation.`
      );
    }
  }
});
