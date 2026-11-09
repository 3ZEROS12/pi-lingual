import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOOKUP,
  LookupError,
  googleTargetCode,
  isLookupSelection,
  lookupTranslate,
  normalizeSelection,
  parseGoogleLookup,
  resolveLookupConfig,
} from "../src/lookup.js";
import { LookupPopup, lookupPopupWidth } from "../src/lookup-popup.js";
import { resolveLookupStrings } from "../src/lookup-strings.js";
import { getVisualWidth } from "../src/layout.js";

const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
};

const strings = resolveLookupStrings("zh");

test("resolveLookupConfig falls back to the key-less dictionary defaults", () => {
  const config = resolveLookupConfig(undefined);
  assert.equal(config.enabled, DEFAULT_LOOKUP.enabled);
  assert.equal(config.provider, "google");
  assert.equal(config.seconds, DEFAULT_LOOKUP.seconds);
  assert.equal(config.maxWords, DEFAULT_LOOKUP.maxWords);
  assert.equal(config.maxChars, DEFAULT_LOOKUP.maxChars);
});

test("resolveLookupConfig honours stored values and clamps the numeric ones", () => {
  const config = resolveLookupConfig({ enabled: false, provider: "model", model: "local-ai/x", seconds: 999, maxWords: 0, maxChars: 1000 });
  assert.equal(config.enabled, false);
  assert.equal(config.provider, "model");
  assert.equal(config.model, "local-ai/x");
  assert.equal(config.seconds, 600);
  assert.equal(config.maxWords, 1);
  assert.equal(config.maxChars, 500);
});

test("resolveLookupConfig treats the legacy llm alias as the model backend and ignores unknown providers", () => {
  assert.equal(resolveLookupConfig({ provider: "llm" }).provider, "model");
  assert.equal(resolveLookupConfig({ provider: "deepl" }).provider, "google");
});

test("resolveLookupConfig lets an explicit override win over the stored value", () => {
  const config = resolveLookupConfig({ model: "a/b" }, { model: "c/d" });
  assert.equal(config.model, "c/d");
});

test("googleTargetCode adds the region Google expects for Chinese only", () => {
  assert.equal(googleTargetCode("zh"), "zh-CN");
  assert.equal(googleTargetCode("tw"), "zh-TW");
  assert.equal(googleTargetCode("zh-CN"), "zh-CN");
  assert.equal(googleTargetCode("ja"), "ja");
  assert.equal(googleTargetCode(""), "en");
});

test("normalizeSelection collapses the whitespace a terminal selection carries", () => {
  assert.equal(normalizeSelection("  over-\nengineered   idea  "), "over- engineered idea");
});

test("isLookupSelection accepts a word or a short phrase in the foreign language", () => {
  assert.equal(isLookupSelection("over-engineered", DEFAULT_LOOKUP, "zh", "en"), true);
  assert.equal(isLookupSelection("we'd be better off", DEFAULT_LOOKUP, "zh", "en"), true);
});

test("isLookupSelection rejects prose, the reader's own language, and code shapes", () => {
  const config = DEFAULT_LOOKUP;
  assert.equal(isLookupSelection("this sentence has far too many words to be a lookup", config, "zh", "en"), false);
  assert.equal(isLookupSelection("这个方案有点过度设计了", config, "zh", "en"), false);
  assert.equal(isLookupSelection("src/lookup.ts", config, "zh", "en"), false);
  assert.equal(isLookupSelection("https://example.com/a", config, "zh", "en"), false);
  assert.equal(isLookupSelection("a".repeat(60), config, "zh", "en"), false);
  assert.equal(isLookupSelection("", config, "zh", "en"), false);
});

test("isLookupSelection reads CJK as foreign text when the pair is en ⇄ ja", () => {
  assert.equal(isLookupSelection("過剰設計", DEFAULT_LOOKUP, "en", "ja"), true);
});

test("parseGoogleLookup joins the translated segments", () => {
  const payload = [[["过度工程化", "over-engineered", null, null, 1]], null, "en"];
  assert.equal(parseGoogleLookup(payload), "过度工程化");
});

test("parseGoogleLookup rejects an empty or malformed payload", () => {
  assert.throws(() => parseGoogleLookup([[]]), LookupError);
  assert.throws(() => parseGoogleLookup({ nope: true }), LookupError);
});

test("lookupTranslate queries the key-less endpoint with the native language as target", async () => {
  let requested: URL | undefined;
  const result = await lookupTranslate(
    {
      text: "over-engineered",
      config: { ...DEFAULT_LOOKUP, provider: "google" },
      nativeLang: "zh",
      strings,
      signal: new AbortController().signal,
    },
    {
      fetch: (async (url: URL | string) => {
        requested = new URL(String(url));
        return new Response(JSON.stringify([[["过度工程化", "over-engineered"]]]), { status: 200 });
      }) as typeof fetch,
    }
  );

  assert.equal(result, "过度工程化");
  assert.equal(requested?.hostname, "translate.googleapis.com");
  assert.equal(requested?.searchParams.get("tl"), "zh-CN");
  assert.equal(requested?.searchParams.get("q"), "over-engineered");
});

test("lookupTranslate surfaces a transport failure as a LookupError", async () => {
  await assert.rejects(
    lookupTranslate(
      {
        text: "sticky",
        config: { ...DEFAULT_LOOKUP, provider: "google" },
        nativeLang: "zh",
        strings,
        signal: new AbortController().signal,
      },
      { fetch: (async () => new Response("", { status: 503 })) as typeof fetch }
    ),
    LookupError
  );
});

test("lookupTranslate sends the model backend the reader's language", async () => {
  let seenPrompt = "";
  const result = await lookupTranslate(
    {
      text: "nit:",
      config: { ...DEFAULT_LOOKUP, provider: "model", model: "local-ai/x" },
      nativeLang: "zh",
      strings,
      signal: new AbortController().signal,
    },
    {
      complete: async (_text, systemPrompt) => {
        seenPrompt = systemPrompt;
        return " 挑剔   ";
      },
    }
  );

  assert.equal(result, "挑剔");
  assert.match(seenPrompt, /中文/);
});

test("lookupTranslate rejects an empty model answer instead of rendering a blank card", async () => {
  await assert.rejects(
    lookupTranslate(
      {
        text: "sticky",
        config: { ...DEFAULT_LOOKUP, provider: "model" },
        nativeLang: "zh",
        strings,
        signal: new AbortController().signal,
      },
      { complete: async () => "   " }
    ),
    LookupError
  );
});

test("lookup strings cover every supported language with no English residue outside en", () => {
  for (const lang of ["zh", "tw", "ja", "ko", "es", "fr", "de", "ru"]) {
    const table = resolveLookupStrings(lang);
    assert.ok(table.loading.trim().length > 0, `${lang} loading`);
    assert.ok(table.dismiss(5).includes("5"), `${lang} dismiss hint`);
    assert.notEqual(table.loading, resolveLookupStrings("en").loading, `${lang} must localize the loading label`);
    assert.match(table.systemPrompt("English"), /\S/);
  }
});

test("LookupPopup renders the headword, the body, and the dismiss hint inside nine lines", () => {
  const popup = new LookupPopup(plainTheme, strings, "over-engineered", strings.dismiss(12), () => {});
  const loading = popup.render(60);
  assert.ok(loading.length <= 9);
  assert.ok(loading[0].includes("over-engineered"));
  assert.ok(loading.some((line) => line.includes(strings.loading)));

  popup.setResult("过度工程化\n也可以指方案过度复杂");
  const ready = popup.render(60);
  assert.ok(ready.length <= 9);
  assert.ok(ready.some((line) => line.includes("过度工程化")));
  assert.ok(ready[ready.length - 1].includes("12s"));
});

test("LookupPopup keeps every rendered line inside the requested width", () => {
  const popup = new LookupPopup(plainTheme, strings, "stick with", strings.dismiss(0), () => {});
  popup.setResult("沿用；坚持使用某个方案而不是替换它，常见于代码评审与技术讨论");
  for (const width of [24, 34, 48, 80]) {
    for (const line of popup.render(width)) {
      assert.ok(getVisualWidth(line) <= Math.max(24, width), `line wider than ${width}: ${line}`);
    }
  }
});

test("LookupPopup dismisses on a mouse press and ignores other events", () => {
  let dismissed = 0;
  const popup = new LookupPopup(plainTheme, strings, "word", strings.dismiss(12), () => {
    dismissed += 1;
  });
  assert.equal(popup.handleMouse({ type: "move" }), undefined);
  assert.deepEqual(popup.handleMouse({ type: "press" }), { handled: true, render: true });
  assert.equal(dismissed, 1);
});

test("lookupPopupWidth keeps a usable minimum on narrow splits", () => {
  assert.ok(lookupPopupWidth(20) >= 20);
  assert.ok(lookupPopupWidth(200) <= 64);
  assert.ok(lookupPopupWidth(120) > lookupPopupWidth(40));
});
