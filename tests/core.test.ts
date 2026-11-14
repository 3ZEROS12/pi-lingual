import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  translateCore,
  translatePrompt,
  compileModeSystemPrompt,
  parseLlmResponse,
  buildSystemPrompt,
  LingualLruCache,
  globalLingualCache,
  resolveRepoFileAnchors,
  formatRepoGroundingHint,
  extractQueryIdentifiers,
  parseVocabEntries,
  recordPhrasebookFromResult,
  readPhrasebook,
  exportPhrasebook,
  formatPhrasebookDigest,
  clearPhrasebook,
  type CustomModeConfig,
} from "../src/core/index.js";
import { resolvePhrasebookPath } from "../src/phrasebook.js";
import { repairAndParseJsonObject } from "../src/index.js";
test("core: translateCore invokes mock completer and returns parsed response", async () => {
  let completerCalled = false;
  let receivedPrompt = "";
  let receivedSystemPrompt = "";

  const mockCompleter = async (prompt: string, systemPrompt: string) => {
    completerCalled = true;
    receivedPrompt = prompt;
    receivedSystemPrompt = systemPrompt;
    return JSON.stringify({
      spoken: "Let's kick this off right away.",
      spoken_meaning: "咱们立刻开搞",
      written: "Proceed with initial project setup.",
      written_meaning: "推进初始项目设置",
      vocab: "kick off (开启/开搞)",
    });
  };

  const res = await translateCore(
    { text: "开始这个项目吧", sourceLang: "zh", targetLang: "en" },
    { completer: mockCompleter }
  );

  assert.equal(completerCalled, true);
  assert.equal(receivedPrompt, "开始这个项目吧");
  assert.match(receivedSystemPrompt, /You are an elite bilingual developer language coach/);
  assert.equal(res.spoken, "Let's kick this off right away.");
  assert.equal(res.spokenMeaning, "咱们立刻开搞");
  assert.equal(res.written, "Proceed with initial project setup.");
  assert.equal(res.vocab, "kick off (开启/开搞)");
  assert.equal(res.cached, false);
  assert.equal(res.shieldBypassed, false);
});

test("core: translateCore 0ms shield bypass for code and CLI commands", async () => {
  let completerCalled = false;
  const mockCompleter = async () => {
    completerCalled = true;
    return null;
  };

  const cliRes = await translateCore(
    { text: "git checkout -b feature/core-decouple" },
    { completer: mockCompleter }
  );
  assert.equal(completerCalled, false);
  assert.equal(cliRes.shieldBypassed, true);
  assert.equal(cliRes.spoken, "git checkout -b feature/core-decouple");

  const codeRes = await translateCore(
    { text: "const handler = async (req, res) => {}" },
    { completer: mockCompleter }
  );
  assert.equal(completerCalled, false);
  assert.equal(codeRes.shieldBypassed, true);
});

test("core: translateCore caches results in LRU cache for 0ms second hit", async () => {
  let callCount = 0;
  const customCache = new LingualLruCache<any>(10);

  const mockCompleter = async () => {
    callCount++;
    return JSON.stringify({
      spoken: "Understood, will do.",
      written: "Acknowledged. Proceeding accordingly.",
    });
  };

  const first = await translateCore(
    { text: "明白，按这个来" },
    { completer: mockCompleter, cache: customCache }
  );
  assert.equal(callCount, 1);
  assert.equal(first.cached, false);

  const second = await translateCore(
    { text: "明白，按这个来" },
    { completer: mockCompleter, cache: customCache }
  );
  assert.equal(callCount, 1);
  assert.equal(second.cached, true);
  assert.equal(second.spoken, "Understood, will do.");
});

test("core: buildSystemPrompt injects thread context, social tone, and custom slot definitions", () => {
  const promptWithContext = buildSystemPrompt(
    "zh",
    "en",
    false,
    "Replying to @sama: Compute is scaling linearly with test-time search.",
    "social"
  );
  assert.match(promptWithContext, /\[CONVERSATION & THREAD CONTEXT\]/);
  assert.match(promptWithContext, /Replying to @sama/);
  assert.match(promptWithContext, /\[TONE FOCUS - SOCIAL & COMMUNITY\]/);
  assert.match(promptWithContext, /NEVER use "delve", "testament"/);

  const customSlotPrompt = buildSystemPrompt("zh", "en", false, undefined, "general", {
    slot1: { name: "Viral Twitter Hook", label: "Hook", instruction: "Punchy opening hook for X." },
    slot2: { name: "Deep Breakdown", label: "Deep", instruction: "RFC-grade architectural explanation." },
  });
  assert.match(customSlotPrompt, /Slot 1: Viral Twitter Hook/);
  assert.match(customSlotPrompt, /Slot 2: Deep Breakdown/);
});

test("core: parseLlmResponse handles thought tags and markdown fences", () => {
  const rawWithThoughts = `<think>Translating input.</think>\n\`\`\`json\n{"spoken":"Totally down with that.","spoken_meaning":"完全赞成","written":"In full agreement.","vocab":"down with (赞同)"}\n\`\`\``;
  const parsed = parseLlmResponse(rawWithThoughts);
  assert.ok(parsed);
  assert.equal(parsed.spoken, "Totally down with that.");
  assert.equal(parsed.spokenMeaning, "完全赞成");
  assert.equal(parsed.written, "In full agreement.");
  assert.equal(parsed.vocab, "down with (赞同)");
});

test("core: translateCore outputs structured res.slots matching configured slot array", async () => {
  const customSlots = [
    { id: "source", label: "原文", role: "source" as const, enabled: true },
    { id: "spoken", label: "日常口语", role: "translation" as const, showMeaning: true, enabled: true },
    { id: "written", label: "技术规范", role: "translation" as const, showMeaning: true, enabled: true },
    { id: "slang", label: "极客俚语", role: "custom" as const, enabled: true },
    { id: "vocab", label: "核心搭配", role: "vocab" as const, enabled: true },
  ];

  const res = await translateCore(
    { text: "这个方案太复杂了", sourceLang: "zh", targetLang: "en", slots: customSlots },
    {
      completer: async () =>
        JSON.stringify({
          spoken: "This feels way too complex.",
          spoken_meaning: "感觉太复杂了",
          written: "The architecture introduces redundant complexity.",
          written_meaning: "该架构引入了多余复杂度",
          slang: "Over-bloated nonsense.",
          vocab: "over-bloated · redundant complexity",
        }),
    }
  );

  assert.equal(res.slots?.length, 5);
  assert.equal(res.slots?.find((s) => s.id === "source")?.content, "这个方案太复杂了");
  assert.equal(res.slots?.find((s) => s.id === "slang")?.content, "Over-bloated nonsense.");
  assert.equal(res.slots?.find((s) => s.id === "spoken")?.meaning, "感觉太复杂了");
});

test("cache: LingualLruCache get/set/eviction and translatePrompt integration", async () => {
  const cache = new LingualLruCache<string>(2);
  cache.set("a", "alpha");
  cache.set("b", "beta");
  assert.equal(cache.get("a"), "alpha");
  cache.set("c", "gamma");
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), "alpha");
  assert.equal(cache.get("c"), "gamma");

  globalLingualCache.clear();
  let calls = 0;
  const mockComplete = async () => {
    calls++;
    return JSON.stringify({ spoken: "Let's keep going.", written: "Proceed with next steps." });
  };

  const res1 = await translatePrompt("继续往下做吧", { sourceLang: "zh", targetLang: "en", complete: mockComplete });
  assert.ok(res1);
  assert.equal(calls, 1);
  const res2 = await translatePrompt("继续往下做吧", { sourceLang: "zh", targetLang: "en", complete: mockComplete });
  assert.equal(calls, 1);
  assert.equal(res2?.spoken, "Let's keep going.");
  assert.ok(globalLingualCache.getStats().hits >= 1);
});

test("grounding: extracts query identifiers and resolves high-confidence repo file anchors", () => {
  const files = ["src/auth/token.ts", "src/auth/session.ts", "src/commands/meta.ts", "README.md"];
  const tokens = extractQueryIdentifiers("排查一下 auth 里的 token 过期逻辑，顺便看下 src/commands/meta.ts");
  assert.ok(tokens.includes("auth"));
  assert.ok(tokens.includes("token"));
  assert.ok(!tokens.includes("src/commands/meta.ts"));

  const anchors = resolveRepoFileAnchors("排查一下 auth 里的 token 过期逻辑", process.cwd(), 5, files);
  assert.equal(anchors[0], "src/auth/token.ts");
  assert.ok(anchors.includes("src/auth/session.ts"));
  assert.ok(!anchors.includes("README.md"));
  assert.match(formatRepoGroundingHint(anchors), /src\/auth\/token\.ts/);
});

test("phrasebook: skips host path in tests, deduplicates entries, and exports Markdown & Anki TSV", () => {
  const prev = process.env.PI_LINGUAL_PHRASEBOOK_PATH;
  delete process.env.PI_LINGUAL_PHRASEBOOK_PATH;
  try {
    assert.equal(resolvePhrasebookPath(), null);
  } finally {
    if (prev !== undefined) process.env.PI_LINGUAL_PHRASEBOOK_PATH = prev;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lingual-pb-"));
  const pbPath = path.join(tmpDir, "phrasebook.jsonl");
  try {
    assert.deepEqual(parseVocabEntries("over-engineered (过度工程化) · stick with (沿用)"), [
      { term: "over-engineered", meaning: "过度工程化" },
      { term: "stick with", meaning: "沿用" },
    ]);

    recordPhrasebookFromResult(
      {
        vocab: "over-engineered (过度工程化) · stick with (沿用)",
        sourceText: "这个方案有点过度设计了",
        sourceLang: "zh",
        targetLang: "en",
        modeId: "companion",
      },
      pbPath
    );
    recordPhrasebookFromResult(
      {
        vocab: "over-engineered (过度设计)",
        sourceText: "再看一遍",
        sourceLang: "zh",
        targetLang: "en",
        modeId: "companion",
      },
      pbPath
    );

    const entries = readPhrasebook(pbPath);
    assert.equal(entries.length, 2);
    assert.equal(entries.find((e) => e.term === "over-engineered")?.count, 2);
    assert.match(formatPhrasebookDigest(entries), /×2/);

    const mdExport = exportPhrasebook(entries, "md", tmpDir);
    assert.match(fs.readFileSync(mdExport.filePath, "utf8"), /\| `over-engineered` \| 过度设计 \|/);

    const ankiExport = exportPhrasebook(entries, "anki", tmpDir);
    assert.match(fs.readFileSync(ankiExport.filePath, "utf8"), /^over-engineered\t过度设计\t/m);

    assert.equal(clearPhrasebook(pbPath), true);
    assert.equal(readPhrasebook(pbPath).length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("engine unification: pass-through modeConfig honors systemHint and custom language overrides", async () => {
  const customMode: CustomModeConfig = {
    id: "custom-coach",
    name: "Custom Coach",
    flow: "translate",
    action: "pass-through",
    hud: "tree",
    customInputLang: "zh",
    customOutputLang: "ja",
    systemHint: "Always prefer humble Keigo phrasing for external clients.",
    slots: [
      { id: "source", label: "原文", role: "source", enabled: true },
      { id: "spoken", label: "口語", role: "translation", instruction: "Natural spoken ${targetLang}", enabled: true },
      { id: "written", label: "敬語", role: "translation", instruction: "Polite business ${targetLang}", enabled: true },
    ],
    enabled: true,
  };

  const compiled = compileModeSystemPrompt(customMode, { sourceLang: "zh", targetLang: "en" });
  assert.match(compiled, /Always prefer humble Keigo phrasing/);
  assert.match(compiled, /Japanese/);

  let capturedSysPrompt = "";
  const result = await translatePrompt("麻烦帮我看下这个接口超时的问题", {
    modeConfig: customMode,
    complete: async (_prompt, sys) => {
      capturedSysPrompt = sys;
      return JSON.stringify({
        spoken: "このAPIのタイムアウトを確認してもらえますか？",
        spoken_meaning: "能帮我看下这个API超时吗？",
        written: "恐れ入りますが、本APIのタイムアウト事象をご確認いただけますでしょうか。",
        written_meaning: "冒昧打扰，能否请您确认一下该API超时的问题。",
        vocab: "タイムアウト (超时)",
      });
    },
  });

  assert.ok(result);
  assert.match(capturedSysPrompt, /Always prefer humble Keigo phrasing/);
  assert.match(result!.spoken, /タイムアウト/);
});

test("regression: custom pass-through compiles companion prompt, core_intent excluded from slotOutputs, legacy source role preserved", () => {
  const customFlowPassThrough: CustomModeConfig = {
    id: "en-ja-coach",
    name: "EN->JA Coach",
    flow: "custom",
    action: "pass-through",
    hud: "tree",
    customInputLang: "en",
    customOutputLang: "ja",
    slots: [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "口語", role: "translation", instruction: "Spoken ${targetLang}", enabled: true },
    ],
    enabled: true,
  };
  const sys = compileModeSystemPrompt(customFlowPassThrough, { sourceLang: "zh", targetLang: "en" });
  assert.match(sys, /You are an elite (?:bilingual developer|multilingual) language coach/);
  assert.match(sys, /Japanese/);

  const parsed = parseLlmResponse(
    JSON.stringify({
      spoken: "Let's deploy.",
      written: "Proceed with deployment.",
      core_intent: "Deploy now",
      coreIntent: "Deploy now",
    })
  );
  assert.equal(parsed?.summary, "Deploy now");
  assert.equal(parsed?.slotOutputs?.core_intent, undefined);
  assert.equal(parsed?.slotOutputs?.coreIntent, undefined);
});

test("regression: repairAndParseJsonObject handles nested markdown backticks inside json fences", () => {
  const raw = '```json\n{\n  "id": "pr-review",\n  "action": "Include a ```suggestion block.",\n  "enabled": true\n}\n```\nTrailing text with {braces}.';
  const parsed = repairAndParseJsonObject(raw);
  assert.ok(parsed);
  assert.equal(parsed!.id, "pr-review");
  assert.match(parsed!.action, /```suggestion/);
});
