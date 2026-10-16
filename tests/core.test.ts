import { test } from "node:test";
import assert from "node:assert/strict";
import {
  translateCore,
  parseLlmResponse,
  buildSystemPrompt,
  LingualLruCache,
  shouldShieldBypass,
} from "../src/core/index.js";

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
    {
      text: "开始这个项目吧",
      sourceLang: "zh",
      targetLang: "en",
    },
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

  assert.equal(completerCalled, false, "Completer should not be called for CLI command");
  assert.equal(cliRes.shieldBypassed, true);
  assert.equal(cliRes.spoken, "git checkout -b feature/core-decouple");

  const codeRes = await translateCore(
    { text: "const handler = async (req, res) => {}" },
    { completer: mockCompleter }
  );
  assert.equal(completerCalled, false, "Completer should not be called for code statement");
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
  assert.equal(callCount, 1, "Second call should hit cache without calling completer");
  assert.equal(second.cached, true);
  assert.equal(second.spoken, "Understood, will do.");
});

test("core: buildSystemPrompt injects thread context and social tone directives", () => {
  const promptWithContext = buildSystemPrompt(
    "zh",
    "en",
    false,
    "Replying to @sama: Compute is scaling linearly with test-time search.",
    "social"
  );

  assert.match(promptWithContext, /\[CONVERSATION & THREAD CONTEXT\]/);
  assert.match(promptWithContext, /Replying to @sama: Compute is scaling linearly/);
  assert.match(promptWithContext, /\[TONE FOCUS - SOCIAL & COMMUNITY\]/);
  assert.match(promptWithContext, /Prioritize X \(Twitter\), Reddit, and developer community/);
  assert.match(promptWithContext, /NEVER use "delve", "testament"/);
});

test("core: parseLlmResponse handles thought tags and markdown fences", () => {
  const rawWithThoughts = `<think>
Translating input to natural Silicon Valley flow.
</think>
\`\`\`json
{
  "spoken": "Totally down with that.",
  "spoken_meaning": "完全赞成",
  "written": "In full agreement with the proposed direction.",
  "vocab": "down with (赞同/支持)"
}
\`\`\``;

  const parsed = parseLlmResponse(rawWithThoughts);
  assert.ok(parsed);
  assert.equal(parsed.spoken, "Totally down with that.");
  assert.equal(parsed.spokenMeaning, "完全赞成");
  assert.equal(parsed.written, "In full agreement with the proposed direction.");
  assert.equal(parsed.vocab, "down with (赞同/支持)");
});

test("core: buildSystemPrompt supports dynamic custom slot definitions", () => {
  const prompt = buildSystemPrompt(
    "zh",
    "en",
    false,
    undefined,
    "general",
    {
      slot1: {
        name: "Viral Twitter Hook",
        label: "Hook",
        instruction: "Punchy, viral opening hook for Twitter/X.",
      },
      slot2: {
        name: "Deep Architecture Breakdown",
        label: "Deep",
        instruction: "Rigorous RFC-grade architectural explanation.",
      },
    }
  );

  assert.match(prompt, /Slot 1: Viral Twitter Hook/);
  assert.match(prompt, /Punchy, viral opening hook for Twitter\/X/);
  assert.match(prompt, /Slot 2: Deep Architecture Breakdown/);
  assert.match(prompt, /Rigorous RFC-grade architectural explanation/);
});

test("core: translateCore outputs structured res.slots matching configured slot array", async () => {
  const customSlots = [
    { id: "source", label: "原文", role: "source" as const, enabled: true },
    { id: "spoken", label: "日常口语", role: "translation" as const, showMeaning: true, enabled: true },
    { id: "written", label: "技术规范", role: "translation" as const, showMeaning: true, enabled: true },
    { id: "slang", label: "极客俚语", role: "custom" as const, enabled: true },
    { id: "vocab", label: "核心搭配", role: "vocab" as const, enabled: true },
  ];

  const mockCompleter = async (_prompt: string, _systemPrompt: string) => {
    return JSON.stringify({
      spoken: "This feels way too complex.",
      spoken_meaning: "感觉太复杂了",
      written: "The architecture introduces redundant complexity.",
      written_meaning: "该架构引入了多余复杂度",
      slang: "Over-bloated nonsense.",
      vocab: "over-bloated · redundant complexity",
    });
  };

  const res = await translateCore(
    {
      text: "这个方案太复杂了",
      sourceLang: "zh",
      targetLang: "en",
      slots: customSlots,
    },
    { completer: mockCompleter }
  );

  assert.ok(res.slots, "Expected res.slots to be populated");
  assert.equal(res.slots.length, 5);

  const sourceSlot = res.slots.find((s) => s.id === "source");
  assert.ok(sourceSlot);
  assert.equal(sourceSlot.content, "这个方案太复杂了");

  const slangSlot = res.slots.find((s) => s.id === "slang");
  assert.ok(slangSlot);
  assert.equal(slangSlot.content, "Over-bloated nonsense.");

  const spokenSlot = res.slots.find((s) => s.id === "spoken");
  assert.ok(spokenSlot);
  assert.equal(spokenSlot.content, "This feels way too complex.");
  assert.equal(spokenSlot.meaning, "感觉太复杂了");
});
