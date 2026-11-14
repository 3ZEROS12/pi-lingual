import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  resolveLanguagePairAnchors,
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  resolveLangPair,
  resolveReleaseBannerLang,
} from "../src/index.js";
import { extractRecentContextAnchor } from "../src/extension.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CJK_SINO_CHECK_WHITELIST = new Set(["zh", "tw", "ja"]);

test("i18n: all 9 supported languages have complete presets and zero Chinese residue when sourceLang != zh/tw/ja", () => {
  assert.deepEqual(SUPPORTED_LANG_CODES, ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"]);
  const requiredKeys = Object.keys(LANGUAGE_PRESETS.zh);

  for (const lang of SUPPORTED_LANG_CODES) {
    const preset = LANGUAGE_PRESETS[lang];
    assert.ok(preset, `Preset missing for ${lang}`);
    for (const key of requiredKeys) {
      const val = (preset as any)[key];
      assert.ok(val !== undefined && val !== "", `[${lang}] missing key "${key}"`);
    }

    assert.ok(SEED_NAMES[lang], `SEED_NAMES missing for ${lang}`);
    assert.ok(resolveModeDisplaySpec(lang).companion);
    assert.ok(resolveSelectPrompts(lang).title);

    if (!CJK_SINO_CHECK_WHITELIST.has(lang)) {
      const dump = JSON.stringify({ preset, seed: SEED_NAMES[lang], slots: getDefaultSlots(lang) });
      assert.ok(!/[\u4e00-\u9fa5]/.test(dump), `[${lang}] leaked Chinese character`);
    }
  }
});

test("i18n: Traditional Chinese (tw) contains zero Simplified Chinese characters", () => {
  const STRICTLY_SIMPLIFIED = [
    "语", "写", "论", "点", "飙", "从", "说", "预", "证", "译",
    "级", "览", "动", "词", "专", "栏", "键", "执", "态", "当",
    "选", "条", "调", "构", "统", "计", "总", "记", "录", "错", "误", "经",
  ];
  const twDump = JSON.stringify({ preset: LANGUAGE_PRESETS.tw, seed: SEED_NAMES.tw });
  for (const ch of STRICTLY_SIMPLIFIED) {
    assert.ok(!twDump.includes(ch), `tw leaked simplified char "${ch}"`);
  }

  const ALLOWED_IDENTICAL_CJK = new Set([
    "sourceLabel",
    "capsuleSlot1Prefix",
    "slotsRemovedSuccess",
    "slotsUsageAdd",
    "slotsUsageRm",
    "slotsUsageToggle",
  ]);
  for (const key of Object.keys(LANGUAGE_PRESETS.zh) as (keyof typeof LANGUAGE_PRESETS.zh)[]) {
    const zhVal = LANGUAGE_PRESETS.zh[key];
    const twVal = LANGUAGE_PRESETS.tw[key];
    const rawStr = typeof twVal === "string" ? twVal : JSON.stringify(twVal);
    if (JSON.stringify(zhVal) === JSON.stringify(twVal) && /[\u4e00-\u9fa5]/.test(rawStr)) {
      assert.ok(ALLOWED_IDENTICAL_CJK.has(key), `[${key}] in tw must not fall back to Simplified zh`);
    }
  }

  const twSlots = getDefaultSlots("tw");
  assert.equal(twSlots.find((s) => s.id === "spoken")?.label, "口語");
  assert.equal(twSlots.find((s) => s.id === "written")?.label, "寫作");
  assert.equal(twSlots.find((s) => s.id === "vocab")?.label, "重點");
  assert.equal(getDefaultDirectSlots("tw").find((s) => s.id === "en_direct")?.label, "規範英文");
  assert.equal(getDefaultPromptSlots("tw").find((s) => s.id === "concise")?.label, "極簡行動");
  assert.equal(getDefaultModifySlots("tw").find((s) => s.id === "native")?.label, "道地表達");
});

test("i18n: resolveLangPair and POSIX zh_TW locales resolve cleanly without self-pairing", () => {
  assert.deepEqual(resolveLangPair("", "zh en"), { source: "zh", target: "en" });
  assert.deepEqual(resolveLangPair("!!! ???", "ja en"), { source: "ja", target: "en" });
  assert.deepEqual(resolveLangPair("日本語 英語", "zh en"), { source: "ja", target: "en" });
  const selfPair = resolveLangPair("en", "en ja");
  assert.notEqual(selfPair.source, selfPair.target);

  const probe = (val: string) => {
    const prev = process.env.LC_ALL;
    process.env.LC_ALL = val;
    try {
      return resolveReleaseBannerLang();
    } finally {
      if (prev === undefined) delete process.env.LC_ALL;
      else process.env.LC_ALL = prev;
    }
  };
  for (const tag of ["zh_TW.UTF-8", "zh-TW", "zh_HK", "zh_Hant_TW", "zh-MO"]) {
    assert.equal(probe(tag), "tw");
  }
  assert.equal(probe("zh_CN.UTF-8"), "zh");
  assert.equal(probe("ko_KR.UTF-8"), "ko");
  assert.equal(probe("ru_RU.UTF-8"), "ru");
});

test("i18n: cross-lingual golden anchor matrix and Japanese Intent Compiler few-shot anchors", () => {
  const verifiedPairs = [
    ["zh", "en"], ["tw", "en"], ["ja", "en"], ["ko", "en"],
    ["de", "en"], ["fr", "en"], ["es", "en"], ["ru", "en"],
    ["en", "zh"], ["en", "ja"], ["zh", "ja"], ["ja", "zh"],
  ];
  for (const [src, tgt] of verifiedPairs) {
    const anchors = resolveLanguagePairAnchors(src, tgt);
    assert.ok(anchors.length > 0, `Missing anchors for ${src} -> ${tgt}`);
    for (const a of anchors) {
      assert.ok(a.input && a.spoken && a.written && a.vocab.includes(" · "));
    }
    const sysPrompt = buildSystemPrompt(src, tgt);
    assert.ok(sysPrompt.includes(`[GOLDEN FEW-SHOT ANCHORS (Pair: ${src} ➔ ${tgt})]`));
  }

  // Incompatible target pairs must not leak wrong-language anchors
  assert.equal(resolveLanguagePairAnchors("en", "de").length, 0);

  const jaPrompt = buildDirectRewriteSystemPrompt({ sourceLang: "zh", targetLang: "ja" });
  assert.ok(jaPrompt.includes("[GOLDEN FEW-SHOT ANCHORS (Target: Japanese)]"));
  assert.ok(jaPrompt.includes("ログインエンドポイントの500エラー"));
});

test("i18n: extractRecentContextAnchor skips trailing pleasantries", () => {
  const mockCtx = {
    sessionManager: {
      getEntries: () => [
        {
          type: "message",
          message: {
            role: "assistant",
            content:
              "I've analyzed the issue.\nIn `src/auth.ts`, `validateToken()` expired prematurely.\n\nLet me know if you need any other changes!\nHope this helps.",
          },
        },
      ],
    },
  };
  const anchor = extractRecentContextAnchor(mockCtx as any);
  assert.ok(!anchor.includes("Hope this helps"));
  assert.ok(!anchor.includes("Let me know"));
  assert.ok(anchor.includes("src/auth.ts") || anchor.includes("validateToken()"));
});

test("sovereignty: src/**/*.ts comments are 100% English and SKILL.md stays language-agnostic", () => {
  const walkTs = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkTs(full));
      else if (entry.name.endsWith(".ts")) out.push(full);
    }
    return out;
  };

  for (const filePath of walkTs(path.join(ROOT, "src"))) {
    const content = fs.readFileSync(filePath, "utf8");
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
    for (const c of comments) {
      assert.ok(
        !/[\u4e00-\u9fa5]/.test(c),
        `Chinese comment found in ${path.relative(ROOT, filePath)}: ${c.slice(0, 80)}`
      );
    }
  }

  const skillMd = fs.readFileSync(path.join(ROOT, "skills/lingual-tuner/SKILL.md"), "utf8");
  assert.ok(skillMd.includes("Universal English"), "SKILL.md must declare Universal English baseline");
  assert.ok(skillMd.includes("NEVER write `modeLocked: true`"), "SKILL.md must prohibit modeLocked injection");
});

test("i18n: candidate picker, system messages, clipboard toast, and cmdDescMode contain zero legacy hyphenated commands", () => {
  const enSelect = resolveSelectPrompts("en", 3);
  const enLabels = LANGUAGE_PRESETS.en;
  const msgKeys = [
    "notifyModeLockedCycleBlocked",
    "langHelpText",
    "notifyModeLockedSuccess",
    "notifyModeUnlockedSuccess",
    "notifyUnrecognizedSubcommand",
    "notifyClipboardCopied",
  ] as const;

  for (const lang of SUPPORTED_LANG_CODES) {
    const sp = resolveSelectPrompts(lang, 3);
    assert.ok(sp.title && sp.keepOrig);
    if (lang !== "en") {
      assert.notEqual(sp.title, enSelect.title);
      assert.notEqual(sp.keepOrig, enSelect.keepOrig);
    }

    const labels = LANGUAGE_PRESETS[lang];
    for (const k of msgKeys) {
      const val = labels[k];
      assert.ok(val, `[${lang}] ${k} must exist`);
      if (lang !== "en") assert.notEqual(val, enLabels[k]);
    }
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(labels.notifyClipboardCopied!), `[${lang}] clipboard toast must be emoji-free`);

    const desc = labels.cmdDescMode || "";
    assert.ok(desc.includes("1") && desc.includes("2") && desc.includes("3") && desc.includes("0"));
    assert.ok(!desc.includes("Candidates") && !desc.includes("Modify"));

    for (const [k, v] of Object.entries(labels)) {
      if (typeof v === "string") {
        assert.ok(!/\/lingual-[a-z]+/i.test(v), `[${lang}] ${k} contains legacy hyphenated command: ${v}`);
      }
    }
  }
});
