import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  LANGUAGE_PRESETS,
  SUPPORTED_LANG_CODES,
  isSupportedLangCode,
  normalizeLangCode,
  resolveLangPair,
  resolveLabelsForLang,
  getDefaultFactoryModes,
} from "../src/presets.js";
import {
  resolveModesFromConfig,
  resolveReleaseBannerLang,
  compileModeSystemPrompt,
  normalizeActiveModeId,
} from "../src/engine.js";
import { getBannerMaxCols, getVisualWidth } from "../src/layout.js";

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
  const zhLabels = resolveLabelsForLang("zh", undefined, "en");
  assert.equal(twLabels.slot1Label, zhLabels.slot1Label, "Traditional Chinese shares the Chinese chrome baseline");
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
    await commands["lang"].handler(`${code} en`, ctx);
    assert.ok(status, `[${code}] pair switch must update the badge`);
    assert.ok(
      !notices.some((n) => /Invalid language code|无效的语言代码/.test(n)),
      `[${code}] must never be rejected as invalid: ${notices.join(" | ")}`
    );
  }

  notices.length = 0;
  status = null;
  await commands["lang"].handler("klingon", ctx);
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
    await commands["lang"].handler(lang === "en" ? "en ja" : `${lang} en`, ctx);

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
