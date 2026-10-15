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
} from "../src/presets.js";
import { resolveModesFromConfig, resolveReleaseBannerLang } from "../src/engine.js";
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
  zh: "极简双核模式上线",
  tw: "極簡雙核模式上線",
  ja: "コア2モード刷新",
  ko: "듀얼 코어 모드",
  es: "Dúo esencial",
  fr: "Duo essentiel",
  de: "2 Kern-Modi",
  ru: "2 главных режима",
  en: "Dual-Core Golden Defaults",
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
  assert.deepEqual(modes[0].slots, [], "Missing slots are normalized, not fatal");

  const factory = resolveModesFromConfig({ sourceLang: "zh" } as any);
  assert.deepEqual(factory.map((m) => m.id), ["direct", "live-flow"], "Factory dual-core defaults stay intact");
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
    assert.equal(out.inputPrompted, true, `[${lang}] first-run handshake must prompt once`);
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

    // Traditional Chinese keeps the shared Chinese config code while the banner renders tw copy.
    assert.equal(
      out.configAfter.sourceLang,
      lang === "tw" ? "zh" : lang,
      `[${lang}] handshake must persist the detected language`
    );
    assert.equal(out.configAfter.mode, "direct", `[${lang}] handshake must persist the flagship factory mode`);
    assert.equal(out.configAfter.activeModeId, "direct", `[${lang}] active mode must be a real registry id`);
    assert.deepEqual(out.configAfter.modes.map((m: any) => m.id), ["direct", "live-flow"]);
    assert.equal(out.configAfter.lastSeenVersion, "0.6.0", `[${lang}] banner delivery must be recorded`);
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
  assert.equal(out.configAfter.configured, true, "The handshake decision is still persisted");
  assert.notEqual(
    out.configAfter.lastSeenVersion,
    "0.6.0",
    "lastSeenVersion must only be recorded after the banner was physically delivered"
  );
});

test("release banner - a corrupt lingual.json self-heals instead of taking the session down", () => {
  const out = bootInSandbox("zh", "corrupt");
  assert.deepEqual(out.errors, [], "Invalid JSON must never raise an unhandled error");
  assert.equal(out.inputPrompted, true, "A corrupt config is treated as unconfigured and re-runs the handshake");
  assert.equal(out.bannerLines.length, 8);
  assert.equal(typeof out.configAfter, "object");
  assert.ok(!out.configAfter.__unreadable, "The config file must be rewritten as valid JSON");
  assert.equal(out.configAfter.configured, true);
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
