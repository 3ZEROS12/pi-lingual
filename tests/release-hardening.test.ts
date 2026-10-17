import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  LANGUAGE_PRESETS,
  SEED_NAMES,
  SUPPORTED_LANG_CODES,
  isSupportedLangCode,
  normalizeLangCode,
  resolveLangPair,
  resolveLabelsForLang,
  getDefaultFactoryModes,
  getDefaultSlots,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
} from "../src/presets.js";
import {
  resolveModesFromConfig,
  resolveReleaseBannerLang,
  compileModeSystemPrompt,
  normalizeActiveModeId,
  resolveSelectPrompts,
  shouldTriggerTranslation,
  isDynamicLongInput,
} from "../src/engine.js";
import { getBannerMaxCols, getVisualWidth, getEffectiveMaxCols } from "../src/layout.js";
import {
  resolveLanguagePairAnchors,
  buildPromptCandidatesSystemPrompt,
  buildModifySystemPrompt,
} from "../src/prompts.js";
import { isTargetLanguageOnly, shouldShieldBypass } from "../src/shield.js";
import { sanitizePromptForTranslation } from "../src/sanitizer.js";
import { extractRecentContextAnchor } from "../src/extension.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SANDBOX = path.join(ROOT, ".tmp", "test-sandboxes");
const CHILD = path.join(ROOT, "tests", "fixtures", "sandbox_boot.mjs");

const LOCALES: Record<string, string> = {
  zh: "zh_CN.UTF-8",
  tw: "zh_TW.UTF-8",
  ja: "ja_JP.UTF-8",
  ko: "ko_KR.UTF-8",
  es: "es_ES.UTF-8",
  fr: "fr_FR.UTF-8",
  de: "de_DE.UTF-8",
  ru: "ru_RU.UTF-8",
  en: "en_US.UTF-8",
};

const MARKERS: Record<string, string> = {
  zh: "三核出厂",
  tw: "三核出廠",
  ja: "3コア",
  ko: "3코어",
  es: "Tres núcleos",
  fr: "Trois cœurs",
  de: "Drei Kerne",
  ru: "Три ядра",
  en: "Three cores",
};

after(() => {
  fs.rmSync(path.join(ROOT, ".tmp", "test-sandboxes"), { recursive: true, force: true });
});

const bootInSandbox = (lang: string, variant: string, cols = 80) => {
  const home = path.join(SANDBOX, `${lang}_${variant}_${cols}`);
  fs.rmSync(home, { recursive: true, force: true });
  fs.mkdirSync(home, { recursive: true });

  const env: Record<string, string | undefined> = {
    ...process.env,
    SANDBOX_HOME: home,
    HOME: home,
    USERPROFILE: home,
    LC_ALL: LOCALES[lang],
    LANG: LOCALES[lang],
  };
  delete env.NODE_TEST_CONTEXT;
  delete env.npm_lifecycle_event;

  const res = spawnSync(
    process.execPath,
    [CHILD, `--lang=${lang}`, `--variant=${variant}`, `--cols=${cols}`, `--root=${ROOT}`],
    { env, encoding: "utf8", timeout: 60000 }
  );

  if (variant === "locked") {
    const cfg = path.join(home, ".pi", "agent", "lingual.json");
    if (fs.existsSync(cfg)) fs.chmodSync(cfg, 0o666);
  }

  const payload = (res.stdout || "").split("\n").filter((l) => l.startsWith("{")).pop();
  assert.ok(payload, `sandbox boot must produce JSON (exit ${res.status}): ${(res.stderr || "").slice(-400)}`);
  return JSON.parse(payload);
};

test("language coverage - every advertised code is switchable and carries a native preset", () => {
  assert.deepEqual(
    SUPPORTED_LANG_CODES,
    ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"],
    "Advertised language surface must stay symmetric"
  );

  for (const code of SUPPORTED_LANG_CODES) {
    assert.ok(isSupportedLangCode(code), `[${code}] must be accepted by /lang`);
    if (code !== "tw") {
      assert.ok(LANGUAGE_PRESETS[code], `[${code}] must ship a native chrome preset`);
    }
  }

  // Regression guard: the es/fr/de/ko/ru presets were pruned in the 0.6.0 refactor while
  // /lang, the help text, and the README kept advertising them.
  assert.equal(LANGUAGE_PRESETS.es.slot1Label, "Coloquial");
  assert.equal(LANGUAGE_PRESETS.fr.slot1Label, "Oral");
  assert.equal(LANGUAGE_PRESETS.de.slot1Label, "Gesprochen");
  assert.equal(LANGUAGE_PRESETS.ko.slot1Label, "구어체");
  assert.equal(LANGUAGE_PRESETS.ru.slot1Label, "Разговорный");
  assert.equal(LANGUAGE_PRESETS.es.slot2Label, "Escrito");
  assert.equal(LANGUAGE_PRESETS.ko.slot2Label, "문어체");

  for (const junk of ["", "x", "zz", "unknown", "12"]) {
    assert.ok(!isSupportedLangCode(junk), `[${junk}] must be rejected`);
  }
});

test("language coverage - Traditional Chinese aliases and chrome baseline", () => {
  assert.equal(normalizeLangCode("韓語"), "ko");
  assert.equal(normalizeLangCode("韓文"), "ko");
  assert.equal(normalizeLangCode("繁體中文"), "tw");
  assert.equal(normalizeLangCode("TW"), "tw");
  assert.equal(normalizeLangCode("日本語"), "ja");

  const twLabels = resolveLabelsForLang("tw", undefined, "en");
  assert.equal(twLabels.slot1Label, "口語", "Traditional Chinese uses authentic Traditional Chinese chrome");
  assert.equal(twLabels.slot2Label, "寫作", "Traditional Chinese uses authentic Traditional Chinese chrome");
  assert.ok(!/[\u4e00-\u9fa5]/.test(resolveLabelsForLang("es", undefined, "en").hudTitle));
});

test("first-run handshake - free-text garbage can never poison the persisted language pair", () => {
  assert.deepEqual(resolveLangPair("", "zh en"), { source: "zh", target: "en" });
  assert.deepEqual(resolveLangPair("x", "zh en"), { source: "zh", target: "en" });
  assert.deepEqual(resolveLangPair("!!! ???", "ja en"), { source: "ja", target: "en" });
  assert.deepEqual(resolveLangPair("ko", "zh en"), { source: "ko", target: "en" });
  assert.deepEqual(resolveLangPair("es fr", "zh en"), { source: "es", target: "fr" });
  assert.deepEqual(resolveLangPair("日本語 英語", "zh en"), { source: "ja", target: "en" });

  // A single language that equals the detected native language must never self-pair.
  const selfPair = resolveLangPair("en", "en ja");
  assert.notEqual(selfPair.source, selfPair.target, "Source and target must never collapse to the same language");
});

test("legacy config bridge - user modes are never dropped for a missing slots array", () => {
  const modes = resolveModesFromConfig({
    sourceLang: "zh",
    modes: [
      { id: "hand-written", name: "Hand Written", flow: "custom", action: "transform", hud: "preview" },
    ],
  } as any);

  assert.equal(modes.length, 1, "A user-authored mode without a slots array must survive resolution");
  assert.equal(modes[0].id, "hand-written");
  assert.ok(Array.isArray(modes[0].slots) && modes[0].slots.length > 0, "Missing slots are populated with flow defaults");

  // Pass-through action preserves empty slots
  const passThroughModes = resolveModesFromConfig({
    modes: [{ id: "quiet", name: "Quiet", action: "pass-through" } as any],
  });
  assert.deepEqual(passThroughModes[0].slots, [], "Pass-through action preserves empty slots");

  // Slotless transform mode must not fall back to candidate slots ("concise"/"spec"/"deep") (B3)
  const compiled = compileModeSystemPrompt(
    { id: "hand-written", name: "Hand Written", flow: "translate", action: "transform", hud: "preview", slots: [] } as any,
    { sourceLang: "zh", targetLang: "en" }
  );
  assert.ok(!compiled.includes('"concise"'), "Must NOT fall back to concise candidate slot");
  assert.ok(!compiled.includes('"spec"'), "Must NOT fall back to spec candidate slot");
  assert.ok(!compiled.includes('"deep"'), "Must NOT fall back to deep candidate slot");

  const factory = resolveModesFromConfig({ sourceLang: "zh" } as any);
  assert.deepEqual(factory.map((m) => m.id), ["companion", "direct", "live-flow"], "Factory three-core defaults stay intact");

  // D1.4 9-language factory assertion
  for (const lang of SUPPORTED_LANG_CODES) {
    const ids = getDefaultFactoryModes(lang, lang).map((m) => m.id);
    assert.deepEqual(ids, ["companion", "direct", "live-flow"], `[${lang}] factory ids must be 3 cores`);
  }
  const companion = getDefaultFactoryModes("zh", "zh")[0];
  assert.equal(companion.action, "pass-through");
  assert.equal(companion.hud, "tree");
  assert.deepEqual(companion.slots.map((s) => s.id), ["source", "spoken", "written", "vocab"]);
  assert.deepEqual(resolveModesFromConfig({}).map((m) => m.id), ["companion", "direct", "live-flow"]);
  assert.equal(normalizeActiveModeId({ mode: "original" }, getDefaultFactoryModes("zh", "zh")), "companion");
  assert.equal(normalizeActiveModeId({ mode: "english" }, getDefaultFactoryModes("zh", "zh")), "direct");
});

test("banner language - POSIX `zh_TW` locales resolve to Traditional Chinese copy", () => {
  const probe = (value: string) => {
    const prev = process.env.LC_ALL;
    process.env.LC_ALL = value;
    try {
      return resolveReleaseBannerLang();
    } finally {
      if (prev === undefined) delete process.env.LC_ALL;
      else process.env.LC_ALL = prev;
    }
  };

  for (const tag of ["zh_TW.UTF-8", "zh-TW", "zh_HK", "zh_Hant_TW", "zh-MO"]) {
    assert.equal(probe(tag), "tw", `[${tag}] must resolve to Traditional Chinese`);
  }
  assert.equal(probe("zh_CN.UTF-8"), "zh");
  assert.equal(probe("ko_KR.UTF-8"), "ko");
  assert.equal(probe("ru_RU.UTF-8"), "ru");
});

test("release banner - 9 sandboxed cold boots render natively with zero 80-col clipping", () => {
  const budget = getBannerMaxCols();
  assert.equal(budget, 78, "80-col terminal must keep a 2-column safety margin, not the HUD border reserve");

  for (const lang of SUPPORTED_LANG_CODES) {
    const out = bootInSandbox(lang, "fresh");
    assert.deepEqual(out.errors, [], `[${lang}] cold boot must not raise runtime errors`);
    assert.equal(out.inputPrompted, false, `[${lang}] cold boot must never prompt`);
    assert.equal(out.bannerLines.length, 8, `[${lang}] banner must stay at 8 lines`);
    assert.equal(out.bannerPlacement, "aboveEditor", `[${lang}] banner must mount above the editor`);

    for (const line of out.bannerLines) {
      assert.ok(getVisualWidth(line) <= budget, `[${lang}] banner line overflows the budget: ${line}`);
      assert.ok(!line.endsWith("..."), `[${lang}] banner line was clipped on an 80-col terminal: ${line}`);
    }

    assert.ok(
      out.bannerLines.some((l: string) => l.includes(MARKERS[lang as keyof typeof MARKERS])),
      `[${lang}] banner must render native copy`
    );
    if (!["zh", "tw", "ja"].includes(lang)) {
      assert.ok(
        !/[\u4e00-\u9fa5]/.test(out.bannerLines.join("\n")),
        `[${lang}] banner must carry zero Chinese residue`
      );
    }

    // Zero-Config Cold Boot: only lastSeenVersion is persisted after banner delivery; zero prompt; zero extra keys.
    const seed = getDefaultFactoryModes(lang, lang);
    assert.ok(
      out.effectiveStatus?.includes(seed[0].name),
      `[${lang}] badge must embed native mode name "${seed[0].name}": ${out.effectiveStatus}`
    );
    assert.equal(out.configAfter.lastSeenVersion, "0.6.0", `[${lang}] banner delivery must be recorded`);
    assert.equal(out.configAfter.sourceLang, undefined, `[${lang}] sourceLang must not be written to disk on cold boot`);
    assert.equal(out.configAfter.mode, undefined, `[${lang}] mode must not be written to disk on cold boot`);
    assert.equal(out.configAfter.configured, undefined, `[${lang}] configured key must not be written`);
    assert.equal(out.secondStartBanner, false, `[${lang}] banner must never repeat on the second boot`);
    assert.equal(out.clearedAfterInput, true, `[${lang}] first user input must dismiss the banner`);
  }
});

test("release banner - 0.5.x config upgrades keep their language and burn the banner exactly once", () => {
  for (const lang of ["zh", "ja", "de", "ru"]) {
    const out = bootInSandbox(lang, "legacy");
    assert.deepEqual(out.errors, []);
    assert.equal(out.inputPrompted, false, `[${lang}] configured users must never see the handshake again`);
    assert.equal(out.configAfter.sourceLang, lang === "tw" ? "tw" : lang, `[${lang}] language must be preserved`);
    assert.equal(out.configAfter.mode, "english", `[${lang}] existing mode choice must be preserved`);
    assert.equal(out.configAfter.lastSeenVersion, "0.6.0");
    assert.equal(out.secondStartBanner, false);
    assert.equal(out.clearedAfterInput, true);
  }
});

test("release banner - a permission-denied config degrades gracefully and never crashes", () => {
  const out = bootInSandbox("en", "locked");
  assert.deepEqual(out.errors, [], "A read-only lingual.json must never raise an unhandled error");
  assert.equal(out.bannerLines.length, 8, "The session must still render the banner");
  assert.equal(out.clearedAfterInput, true, "The banner must still dismiss on first input");
});

test("release banner - a rejected render never burns the one-time notification", () => {
  const out = bootInSandbox("en", "throwy");
  assert.deepEqual(out.errors, [], "A host-rejected widget must be swallowed, not escalated");
  assert.notEqual(
    out.configAfter.lastSeenVersion,
    "0.6.0",
    "lastSeenVersion must only be recorded after the banner was physically delivered"
  );
});

test("release banner - a corrupt lingual.json self-heals instead of taking the session down", () => {
  const out = bootInSandbox("zh", "corrupt");
  assert.deepEqual(out.errors, [], "Invalid JSON must never raise an unhandled error");
  assert.equal(out.inputPrompted, false, "A corrupt config degrades gracefully without prompting");
  assert.equal(out.bannerLines.length, 8);
});

test("release banner - narrow terminals degrade cleanly with closed delimiters", () => {
  for (const lang of ["zh", "ja", "en"]) {
    const out = bootInSandbox(lang, "fresh", 40);
    assert.deepEqual(out.errors, [], `[${lang}] narrow boot must not raise runtime errors`);
    assert.equal(out.bannerLines.length, 8, `[${lang}] still exactly 8 lines at 40 columns`);

    for (const line of out.bannerLines) {
      assert.ok(getVisualWidth(line) <= 40, `[${lang}] line wider than the terminal: ${line}`);
      const opens = (line.match(/[\(\[\{（【]/g) || []).length;
      const closes = (line.match(/[\)\]\}）】]/g) || []).length;
      assert.equal(opens, closes, `[${lang}] dangling delimiter survived the clip: ${line}`);
    }
  }
});

test("/lang command - every advertised code switches without an invalid-language warning", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  const notices: string[] = [];
  let status: any = null;
  const ctx: any = {
    hasUI: true,
    ui: {
      notify: (msg: string) => notices.push(String(msg)),
      setStatus: (_k: string, v: any) => (status = v),
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  for (const code of SUPPORTED_LANG_CODES) {
    notices.length = 0;
    status = null;
    await commands["lingual"].handler(`lang ${code} en`, ctx);
    assert.ok(status, `[${code}] pair switch must update the badge`);
    assert.ok(
      !notices.some((n) => /Invalid language code|无效的语言代码/.test(n)),
      `[${code}] must never be rejected as invalid: ${notices.join(" | ")}`
    );
  }

  notices.length = 0;
  status = null;
  await commands["lingual"].handler("lang klingon", ctx);
  assert.equal(status, null, "Unknown codes must never switch the language pair");
  assert.ok(notices.length > 0, "Unknown codes must surface a localized warning");
});

test("modes: registry-aware mode switch notifications and clean status badge across 9 languages (C8, C9)", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  const notices: string[] = [];
  let statusBadge: any = null;
  const ctx: any = {
    hasUI: true,
    ui: {
      notify: (msg: string) => notices.push(String(msg)),
      setStatus: (_k: string, v: any) => (statusBadge = v),
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  for (const lang of SUPPORTED_LANG_CODES) {
    notices.length = 0;
    statusBadge = null;

    // Switch language pair
    await commands["lingual"].handler(lang === "en" ? "lang en ja" : `lang ${lang} en`, ctx);

    // 1. Switch to direct mode
    notices.length = 0;
    await commands["lingual"].handler("direct", ctx);
    const directNotice = notices[notices.length - 1];
    assert.ok(directNotice, `[${lang}] must surface notification on direct switch`);
    assert.ok(directNotice.includes("direct"), `[${lang}] notice must include mode id: ${directNotice}`);

    // 2. Switch to live-flow mode
    notices.length = 0;
    await commands["lingual"].handler("live-flow", ctx);
    const liveNotice = notices[notices.length - 1];
    assert.ok(liveNotice, `[${lang}] must surface notification on live-flow switch`);
    assert.ok(liveNotice.includes("live-flow"), `[${lang}] notice must include mode id: ${liveNotice}`);

    // 3. Western/Korean languages must have zero Chinese residue in notifications
    if (!["zh", "tw", "ja"].includes(lang)) {
      assert.ok(!/[\u4e00-\u9fa5]/.test(directNotice), `[${lang}] direct toast leaked Chinese: ${directNotice}`);
      assert.ok(!/[\u4e00-\u9fa5]/.test(liveNotice), `[${lang}] live-flow toast leaked Chinese: ${liveNotice}`);
    }

    // 4. Status badge must never contain no-src noise (C9)
    assert.ok(statusBadge, `[${lang}] status badge must be active`);
    assert.ok(!String(statusBadge).includes("no-src"), `[${lang}] status badge contains no-src: ${statusBadge}`);
  }
});

test("zero-config cold boot - toast and badge use native mode name without divergence (R1)", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  const notices: string[] = [];
  let statusBadge: any = null;
  const ctx: any = {
    hasUI: true,
    ui: {
      notify: (msg: string) => notices.push(String(msg)),
      setStatus: (_k: string, v: any) => (statusBadge = v),
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  await commands["lingual"].handler("lang zh en", ctx);
  notices.length = 0;
  await commands["lingual"].handler("2", ctx);
  const zhModes = getDefaultFactoryModes("zh", "zh");
  const directName = zhModes[1].name; // "规范直发"
  const toast = notices[notices.length - 1] || "";
  assert.ok(toast.includes(directName), `zh /lingual 2 toast must include "${directName}": ${toast}`);
  assert.ok(String(statusBadge).includes(directName), `zh status badge must include "${directName}": ${statusBadge}`);

  // Teardown back to mode 1
  await commands["lingual"].handler("1", ctx);
});

test("/lang switch - factory modes refresh to newSource native names unless customized on disk (R2)", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  let statusBadge: any = null;
  const ctx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus: (_k: string, v: any) => (statusBadge = v),
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Fresh switch zh -> ja
  await commands["lingual"].handler("lang zh en", ctx);
  await commands["lingual"].handler("1", ctx);
  assert.ok(String(statusBadge).includes("纯伴学"), `Initial zh badge must have 纯伴学: ${statusBadge}`);

  await commands["lingual"].handler("lang ja en", ctx);
  assert.ok(String(statusBadge).includes("伴走"), `Switched ja badge must have 伴走: ${statusBadge}`);

  // 2. Teardown back to zh
  await commands["lingual"].handler("lang zh en", ctx);
});

test("/lingual alias and out-of-bounds mode switching safety (R3)", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  const notices: string[] = [];
  let statusBadge: any = null;
  const ctx: any = {
    hasUI: true,
    ui: {
      notify: (msg: string) => notices.push(String(msg)),
      setStatus: (_k: string, v: any) => (statusBadge = v),
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Factory registry: /lingual select must NOT switch to candidates
  await commands["lingual"].handler("1", ctx);
  notices.length = 0;
  await commands["lingual"].handler("select", ctx);
  assert.ok(
    notices.some((n) => n.includes("不在当前注册表") || n.includes("not in your active registry")),
    `Must notify that mode is not in registry: ${notices.join(" | ")}`
  );
  assert.ok(!String(statusBadge).includes("Candidates"), `Badge must NOT announce Candidates: ${statusBadge}`);

  // 2. Single canonical persistence across alias entries (raw, polish, 4)
  notices.length = 0;
  await commands["lingual"].handler("raw", ctx);
  const rawNotice = notices[notices.length - 1] || "";
  assert.ok(rawNotice.includes("live-flow"), `raw switch notice must include live-flow: ${rawNotice}`);

  notices.length = 0;
  await commands["lingual"].handler("4", ctx);
  const numNotice = notices[notices.length - 1] || "";
  assert.ok(numNotice.includes("live-flow"), `num 4 notice must include live-flow: ${numNotice}`);

  // Teardown back to 1
  await commands["lingual"].handler("1", ctx);
});

test("candidate picker UI covers all 9 languages without falling back to English (F2-1)", () => {
  const en = resolveSelectPrompts("en", 3);
  for (const lang of SUPPORTED_LANG_CODES) {
    const sp = resolveSelectPrompts(lang, 3);
    assert.ok(sp.title, `[${lang}] title must exist`);
    assert.ok(sp.keepOrig, `[${lang}] keepOrig must exist`);
    if (lang !== "en") {
      assert.notEqual(sp.title, en.title, `[${lang}] title must not fall back to English`);
      assert.notEqual(sp.keepOrig, en.keepOrig, `[${lang}] keepOrig must not fall back to English`);
    }
  }
});

test("system messages cover all 9 languages without falling back to English (F2-2)", () => {
  const enLabels = resolveLabelsForLang("en");
  const keys = [
    "notifyModeLockedCycleBlocked",
    "langHelpText",
    "notifyModeLockedSuccess",
    "notifyModeUnlockedSuccess",
    "notifyUnrecognizedSubcommand",
  ] as const;

  for (const lang of SUPPORTED_LANG_CODES) {
    const labels = resolveLabelsForLang(lang);
    for (const key of keys) {
      const val = labels[key];
      assert.ok(val, `[${lang}] "${key}" must be defined and non-empty`);
      if (lang !== "en") {
        assert.notEqual(val, enLabels[key], `[${lang}] "${key}" must not equal English value`);
      }
    }

    // Script sampling verification
    if (lang === "ja") {
      assert.ok(/[\u3040-\u30ff]/.test(labels.notifyModeLockedCycleBlocked!), "ja must contain kana");
    } else if (lang === "ko") {
      assert.ok(/[\uac00-\ud7af]/.test(labels.notifyModeLockedCycleBlocked!), "ko must contain hangul");
    } else if (lang === "ru") {
      assert.ok(/[\u0400-\u04ff]/.test(labels.notifyModeLockedCycleBlocked!), "ru must contain cyrillic");
    } else if (lang === "tw") {
      assert.ok(labels.notifyModeLockedCycleBlocked!.includes("鎖定"), "tw must contain Traditional Chinese 鎖定");
    }
  }
});

test("commit loadout first line limit is strictly 72 characters across all specs and docs (F2-3)", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const readmeEn = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const readmeZh = fs.readFileSync(path.join(root, "README_zh.md"), "utf8");
  const presetsTs = fs.readFileSync(path.join(root, "src/presets.ts"), "utf8");
  const skillMd = fs.readFileSync(path.join(root, "skills/lingual-tuner/SKILL.md"), "utf8");
  const clipboardE2e = fs.readFileSync(path.join(root, "tests/e2e/clipboard.e2e.ts"), "utf8");

  assert.ok(readmeEn.includes("\\le 72"), "README.md must specify <= 72 characters");
  assert.ok(readmeZh.includes("\\le 72"), "README_zh.md must specify <= 72 characters");
  assert.ok(presetsTs.includes("<=72 chars"), "presets.ts description must specify <=72 chars");
  assert.ok(presetsTs.includes("<= 72 characters"), "presets.ts instruction must specify <= 72 characters");
  assert.ok(skillMd.includes("<=72 chars"), "SKILL.md must specify <=72 chars");
  assert.ok(clipboardE2e.includes("<= 72"), "clipboard.e2e.ts must assert <= 72 characters");

  // Zero occurrences of legacy 50-char limit for commit loadout
  assert.ok(!readmeEn.includes("first line $\\le 50$"), "README.md must not contain legacy 50-char limit");
  assert.ok(!readmeZh.includes("首行 $\\le 50$"), "README_zh.md must not contain legacy 50-char limit");
  assert.ok(!presetsTs.includes("first line <=50 chars"), "presets.ts must not contain legacy 50-char limit");
});

test("slot labels cover all 9 languages natively and tw is authentic Traditional Chinese (F2-4)", () => {
  const enSlots = getDefaultSlots("en");
  const enDirect = getDefaultDirectSlots("en");
  const enPrompt = getDefaultPromptSlots("en");
  const enModify = getDefaultModifySlots("en");

  // 1. tw must be authentic Traditional Chinese, never Simplified Chinese
  const twSlots = getDefaultSlots("tw");
  assert.equal(twSlots.find((s) => s.id === "spoken")?.label, "口語");
  assert.equal(twSlots.find((s) => s.id === "written")?.label, "寫作");
  assert.equal(twSlots.find((s) => s.id === "vocab")?.label, "重點");

  const twDirect = getDefaultDirectSlots("tw");
  assert.equal(twDirect.find((s) => s.id === "en_direct")?.label, "規範英文");
  assert.equal(twDirect.find((s) => s.id === "vocab")?.label, "核心表達");

  const twPrompt = getDefaultPromptSlots("tw");
  assert.equal(twPrompt.find((s) => s.id === "concise")?.label, "極簡行動");
  assert.equal(twPrompt.find((s) => s.id === "spec")?.label, "結構規範");

  const twModify = getDefaultModifySlots("tw");
  assert.equal(twModify.find((s) => s.id === "fixed")?.label, "原句修補");
  assert.equal(twModify.find((s) => s.id === "native")?.label, "道地表達");
  assert.equal(twModify.find((s) => s.id === "fixes")?.label, "收穫複盤");

  // 2. All 9 languages: non-en slot labels must NOT equal English
  for (const lang of SUPPORTED_LANG_CODES) {
    if (lang === "en") continue;
    const slots = getDefaultSlots(lang);
    for (const s of slots) {
      if (s.id === "source" && ["es", "fr", "de"].includes(lang)) {
        // "Original" is internationally shared across Spanish/French/German
        continue;
      }
      const enLabel = enSlots.find((e) => e.id === s.id)?.label;
      assert.notEqual(s.label, enLabel, `[${lang}] slot "${s.id}" label must not fall back to English "${enLabel}"`);
    }

    const direct = getDefaultDirectSlots(lang);
    for (const s of direct) {
      const enLabel = enDirect.find((e) => e.id === s.id)?.label;
      assert.notEqual(s.label, enLabel, `[${lang}] direct slot "${s.id}" label must not fall back to English`);
    }

    const prompt = getDefaultPromptSlots(lang);
    for (const s of prompt) {
      const enLabel = enPrompt.find((e) => e.id === s.id)?.label;
      assert.notEqual(s.label, enLabel, `[${lang}] prompt slot "${s.id}" label must not fall back to English`);
    }

    const modify = getDefaultModifySlots(lang);
    for (const s of modify) {
      const enLabel = enModify.find((e) => e.id === s.id)?.label;
      assert.notEqual(s.label, enLabel, `[${lang}] modify slot "${s.id}" label must not fall back to English`);
    }
  }
});

test("clipboard success notification is localized and contains zero emojis (F2-5)", () => {
  const enLabels = resolveLabelsForLang("en");
  const enMsg = enLabels.notifyClipboardCopied;
  assert.ok(enMsg, "en must have notifyClipboardCopied defined");
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(enMsg), "en message must contain zero emojis");

  for (const lang of SUPPORTED_LANG_CODES) {
    const labels = resolveLabelsForLang(lang);
    const msg = labels.notifyClipboardCopied;
    assert.ok(msg, `[${lang}] notifyClipboardCopied must be defined`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(msg), `[${lang}] message must contain zero emojis`);
    if (lang !== "en") {
      assert.notEqual(msg, enMsg, `[${lang}] notifyClipboardCopied must not fall back to English`);
    }
  }
});

test("custom mode cycle fallback handles deleted or unknown current mode gracefully (F2-6)", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  let currentBadge = "";
  const ctx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus: (_k: string, v: any) => (currentBadge = v),
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // Add a temporary mode and switch to it
  await commands["lingual"].handler("mode add temp_mode Temp translate transform preview", ctx);
  await commands["lingual"].handler("temp_mode", ctx);
  assert.ok(String(currentBadge).includes("Temp"), "Must be on Temp mode");

  // Remove the active mode while standing on it
  await commands["lingual"].handler("mode rm temp_mode", ctx);

  // Now cycling without args: currentIdx is -1, must safely land on activeModes[0].id (companion)
  await commands["lingual"].handler("", ctx);
  assert.ok(String(currentBadge).includes("纯伴学") || String(currentBadge).includes("Companion"));

  // Cycling from last mode must land on off without throwing
  await commands["lingual"].handler("mode reset", ctx);
  await commands["lingual"].handler("1", ctx);
});

test("/lang target switch notification differs from full pair switch (F2-7)", async () => {
  const { default: extensionFactory } = await import("../dist/extension.js");
  const commands: Record<string, any> = {};
  extensionFactory({
    on() {},
    registerCommand: (name: string, def: any) => (commands[name] = def),
    registerShortcut() {},
  } as any);

  const notices: string[] = [];
  const ctx: any = {
    hasUI: true,
    ui: {
      notify: (msg: string) => notices.push(String(msg)),
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Full pair switch
  notices.length = 0;
  await commands["lingual"].handler("lang zh ja", ctx);
  const pairNotice = notices[notices.length - 1];

  // 2. Target-only switch (source stays zh)
  notices.length = 0;
  await commands["lingual"].handler("lang en", ctx);
  const targetNotice = notices[notices.length - 1];

  assert.notEqual(
    targetNotice,
    pairNotice,
    "Target-only switch notification must be distinct from full pair switch"
  );
  assert.ok(
    targetNotice.includes("目标语言") || targetNotice.includes("Target language") || targetNotice.includes("保持不变") || targetNotice.includes("unchanged"),
    `Target-only notice must explicitly indicate target was switched: ${targetNotice}`
  );

  // Teardown back to zh en
  await commands["lingual"].handler("lang zh en", ctx);
});

test("/lingual command description across all presets reflects 3-core mode numbers (F2-8)", () => {
  // Checkpoint 1 & 2: Command & preset hygiene and native mode names across all 9 languages
  for (const lang of SUPPORTED_LANG_CODES) {
    const labels = resolveLabelsForLang(lang);
    const desc = labels.cmdDescMode || "";
    assert.ok(desc, `[${lang}] cmdDescMode must be defined`);
    assert.ok(desc.includes("1") && desc.includes("2") && desc.includes("3") && desc.includes("0"),
      `[${lang}] cmdDescMode must contain numbers 1, 2, 3, 0: ${desc}`
    );
    assert.ok(!desc.includes("Candidates") && !desc.includes("Modify"),
      `[${lang}] cmdDescMode must not contain legacy Candidates or Modify: ${desc}`
    );

    // 1. Zero legacy hyphenated commands in any string field of preset
    const rawPreset = LANGUAGE_PRESETS[lang] as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawPreset)) {
      if (typeof v === "string") {
        assert.ok(
          !/\/lingual-[a-z]+/i.test(v),
          `[${lang}] key "${k}" contains forbidden legacy hyphenated command: "${v}"`
        );
      }
    }

    // 2. All 7 target fields present and reflecting modern /lingual architecture
    assert.ok(labels.cmdDescMode?.includes("/lingual"), `[${lang}] cmdDescMode must contain /lingual`);
    assert.ok(labels.cmdDescStatus?.includes("/lingual status"), `[${lang}] cmdDescStatus must contain /lingual status`);
    assert.ok(labels.cmdDescModel?.includes("/lingual model"), `[${lang}] cmdDescModel must contain /lingual model`);
    assert.ok(labels.cmdDescLang?.includes("/lingual lang") || labels.cmdDescLang?.includes("/lang"), `[${lang}] cmdDescLang must contain /lingual lang or /lang`);
    assert.ok(labels.cmdDescLast?.includes("/lingual last") || labels.cmdDescLast?.includes("/last"), `[${lang}] cmdDescLast must contain /lingual last or /last`);
    assert.ok(labels.statusReportShortcuts?.includes("/lingual"), `[${lang}] statusReportShortcuts must contain /lingual`);
    assert.ok(labels.modelAvailableListHeader?.includes("/lingual model"), `[${lang}] modelAvailableListHeader must reference /lingual model`);

    // 3. Mode picker UI strings idiomatic and defined
    assert.ok(labels.modePickerTitle && labels.modePickerTitle.length > 0, `[${lang}] modePickerTitle defined`);
    assert.ok(labels.modePickerHint && labels.modePickerHint.length > 0, `[${lang}] modePickerHint defined`);
  }

  // Checkpoint 2: Genuine native translations for liveFlow across es, fr, de, ru
  assert.equal(SEED_NAMES.es.liveFlow, "Flujo en Vivo", "Spanish liveFlow must be Flujo en Vivo");
  assert.equal(SEED_NAMES.fr.liveFlow, "Flux en Direct", "French liveFlow must be Flux en Direct");
  assert.equal(SEED_NAMES.de.liveFlow, "Live-Fluss", "German liveFlow must be Live-Fluss");
  assert.equal(SEED_NAMES.ru.liveFlow, "Живой поток", "Russian liveFlow must be Живой поток");
});

test("Tripartite Subagent Audit Regression: Invariants 5, 12, 18 & anchor routing hardening", () => {
  // 1. Invariant 18: Universal English baseline fallback (must never assume Chinese on empty/undefined)
  // When sourceLang is undefined, English sentence should trigger normal translation (not be treated as English-on-Chinese)
  assert.equal(
    shouldTriggerTranslation("run git status to verify", undefined as any),
    true,
    "shouldTriggerTranslation must default to en sourceLang and trigger translation for English input"
  );
  // An 80-char English sentence should NOT trigger long input condensation threshold of CJK (45 chars)
  const english70Chars = "This is a clean and concise English sentence that does not need condensation.";
  assert.equal(
    isDynamicLongInput(english70Chars, undefined as any),
    false,
    "isDynamicLongInput must not apply CJK 45-char threshold when sourceLang is undefined"
  );

  // 2. Misleading Anchor Routing: en ➔ foreign pairs must NOT inject English monolingual rewrites
  const enDeAnchors = resolveLanguagePairAnchors("en", "de");
  assert.deepEqual(enDeAnchors, [], "en ➔ de without custom pair must return empty anchors, not English rewrites");
  const enFrAnchors = resolveLanguagePairAnchors("en", "fr");
  assert.deepEqual(enFrAnchors, [], "en ➔ fr without custom pair must return empty anchors, not English rewrites");

  // 3. Mode 3 & Mode 4: Semantic variable interpolation & Kill list injection
  const candidatePrompt = buildPromptCandidatesSystemPrompt({
    sourceLang: "zh",
    targetLang: "ja",
    promptSlots: [
      { id: "custom", label: "Custom", role: "custom", instruction: "Translate into ${targetLang} strictly", enabled: true },
    ],
  });
  assert.ok(
    candidatePrompt.includes("Translate into Japanese strictly"),
    "Mode 3 must interpolate ${targetLang} into Japanese in slot instruction"
  );
  assert.ok(
    candidatePrompt.includes("[KILL LIST - FORBIDDEN AI BUZZWORDS - ZERO TOLERANCE]"),
    "Mode 3 must inject kill list before JSON schema"
  );

  const modifyPrompt = buildModifySystemPrompt({
    sourceLang: "es",
    targetLang: "es",
    customSlots: [
      { id: "fix", label: "Fix", role: "custom", instruction: "Fix typos in ${targetLang}", enabled: true },
    ],
  });
  assert.ok(
    modifyPrompt.includes("Fix typos in Spanish"),
    "Mode 4 must interpolate ${targetLang} into Spanish in slot instruction"
  );
  assert.ok(
    !modifyPrompt.includes("[TARGET-LANGUAGE LINGUISTIC PROFILE: ENGLISH]"),
    "Mode 4 proofreading in Spanish must not inject English preposition rules"
  );
  assert.ok(
    modifyPrompt.includes("[KILL LIST - FORBIDDEN AI BUZZWORDS - ZERO TOLERANCE]"),
    "Mode 4 must inject kill list before JSON schema"
  );

  // 4. Invariant 12: Extreme terminal geometry clamp (COLUMNS=20 must not exceed 20)
  const originalCols = process.stdout.columns;
  try {
    Object.defineProperty(process.stdout, "columns", { value: 20, configurable: true });
    const effectiveCols = getEffectiveMaxCols();
    assert.ok(
      effectiveCols <= 20,
      `getEffectiveMaxCols() on a 20-col terminal must not exceed live columns (got ${effectiveCols})`
    );
  } finally {
    Object.defineProperty(process.stdout, "columns", { value: originalCols, configurable: true });
  }

  // 6. Round 3 Hardening: ja ➔ zh Kanji vs Kana discrimination (prevent false-positive 0ms bypass)
  const jaWithKanji = "この設計は少し過剰です";
  assert.equal(
    isTargetLanguageOnly(jaWithKanji, "ja", "zh"),
    false,
    "Japanese prompt with Kana & Kanji must NOT be falsely identified as target-only Chinese"
  );
  // Pure Chinese prompt on ja ➔ zh pair SHOULD bypass
  const pureChinese = "这个方案有点过度设计了";
  assert.equal(
    isTargetLanguageOnly(pureChinese, "ja", "zh"),
    true,
    "Pure Chinese prompt on ja ➔ zh pair should be recognized as target-only"
  );

  // 7. Round 3 Hardening: Custom mode kill list & code-switching forwarded into prompt builders
  const customMode = {
    id: "tactical",
    name: "Tactical",
    flow: "translate" as const,
    action: "select" as const,
    hud: "preview" as const,
    target: "agent" as const,
    killList: ["forbidden_buzzword_xyz"],
    slots: [
      { id: "slot1", label: "Slot 1", role: "custom" as const, instruction: "Custom instruction", enabled: true },
    ],
  };
  const compiledModePrompt = compileModeSystemPrompt(customMode, {
    sourceLang: "en",
    targetLang: "ja",
    explainLang: "en",
  });
  assert.ok(
    compiledModePrompt.includes("forbidden_buzzword_xyz"),
    "compileModeSystemPrompt must forward mode-specific killList into prompt candidate builder"
  );

  // 8. Round 5 Hardening: ANSI Escape Stripping & Compiler Diagnostic Detection
  const ansiCompilerOutput = "\x1b[1m\x1b[31msrc/index.ts:10:5:\x1b[0m \x1b[31merror:\x1b[0m Cannot find name 'foo'\n  const x = foo;\n            ^^^\n";
  const sanitizedAnsi = sanitizePromptForTranslation(ansiCompilerOutput);
  assert.ok(
    sanitizedAnsi.hasCollapsedContent,
    "sanitizePromptForTranslation must collapse ANSI-colorized compiler diagnostics"
  );
  assert.ok(
    sanitizedAnsi.distilledText.includes("[... diagnostics ...]"),
    "sanitizePromptForTranslation must include diagnostic collapse marker for ANSI output"
  );

  // 9. Round 5 Hardening: Python SyntaxError & IndentationError Traceback Detection
  const pythonSyntaxTraceback = '  File "main.py", line 42\n    def foo(\n           ^\nSyntaxError: invalid syntax';
  const sanitizedPy = sanitizePromptForTranslation(pythonSyntaxTraceback);
  assert.ok(
    sanitizedPy.hasCollapsedContent,
    "sanitizePromptForTranslation must collapse Python SyntaxError tracebacks without ', in <module>'"
  );
  assert.ok(
    sanitizedPy.distilledText.includes("[... stack trace ...]"),
    "sanitizePromptForTranslation must include stack trace collapse marker for Python syntax errors"
  );

  // 10. Round 5 Hardening: Unified Git Diff Multi-Line Preservation
  const unifiedDiff = `diff --git a/src/app.ts b/src/app.ts
index abc1234..def5678 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,6 +1,6 @@
- const a = 1;
- const b = 2;
- const c = 3;
- const d = 4;
- const e = 5;
+ const updated = true;`;
  const sanitizedDiff = sanitizePromptForTranslation(unifiedDiff);
  assert.ok(
    !sanitizedDiff.distilledText.includes("items ...]"),
    "sanitizePromptForTranslation must NOT collapse git diff deleted lines as bulleted list items"
  );
  assert.ok(
    sanitizedDiff.distilledText.includes("const a = 1;"),
    "sanitizePromptForTranslation must preserve unified diff delta lines intact"
  );

  // 11. Round 5 Hardening: 'diff' Shell Command Fast-Bypass & Polyglot Single-Line Code Symmetry
  assert.equal(
    shouldShieldBypass("diff -u src/a.ts src/b.ts"),
    true,
    "shouldShieldBypass must fast-bypass 'diff' shell commands"
  );
  assert.equal(
    shouldShieldBypass('const label = "テスト";'),
    true,
    "shouldShieldBypass must fast-bypass Japanese single-line code statements"
  );
  assert.equal(
    shouldShieldBypass('const label = "测试";'),
    true,
    "shouldShieldBypass must fast-bypass Chinese single-line code statements symmetrically"
  );

  // 12. Round 5 Hardening: Preset Completeness across es, fr, de
  for (const l of ["es", "fr", "de"] as const) {
    const preset = LANGUAGE_PRESETS[l];
    for (const code of ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"]) {
      assert.ok(
        preset.notifyLangInvalid?.includes(code),
        `[${l}] notifyLangInvalid must advertise code '${code}'`
      );
      assert.ok(
        preset.langUsageHint?.includes(code),
        `[${l}] langUsageHint must advertise code '${code}'`
      );
    }
    assert.equal(
      (preset.langList || []).length,
      9,
      `[${l}] langList must contain exactly 9 supported language items`
    );
  }
});

