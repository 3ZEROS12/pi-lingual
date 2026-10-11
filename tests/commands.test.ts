import { test } from "node:test";
import assert from "node:assert/strict";
import extensionFactory from "../dist/extension.js";
import { formatStatusReport, resolveLabelsForLang } from "../src/presets.js";
import {
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  formatReleaseBannerLines,
  getDefaultPromptSlots,
  generatePromptCandidates,
  rewritePromptDirect,
  stripLingualContextWhenOff,
} from "../src/engine.js";
import { LingualLruCache } from "../src/cache.js";

test("extension command matrix - registers standardized lingual command suite", () => {
  const registeredCommands: Record<string, any> = {};

  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  // Standardized lingual suite
  assert.ok(registeredCommands["lingual"], "Must register /lingual");
  assert.ok(registeredCommands["lingual-mode"], "Must register /lingual-mode");
  assert.ok(registeredCommands["lingual-lang"], "Must register /lingual-lang");
  assert.ok(registeredCommands["lingual-compact"], "Must register /lingual-compact");
  assert.ok(registeredCommands["lingual-model"], "Must register /lingual-model");
  assert.ok(registeredCommands["lingual-status"], "Must register /lingual-status");
  assert.ok(registeredCommands["lingual-last"], "Must register /lingual-last");
  assert.ok(registeredCommands["lingual-agent"], "Must register /lingual-agent");

  // Standalone intuitive developer commands
  assert.ok(registeredCommands["lang"], "Must register standalone /lang");
  assert.ok(registeredCommands["slots"], "Must register standalone /slots");
  assert.equal(registeredCommands["compact"], undefined, "Must NOT occupy Pi core /compact command");
  assert.ok(registeredCommands["status"], "Must register standalone /status");
  assert.ok(registeredCommands["last"], "Must register standalone /last");
});

test("extension /lingual - supports explicit mode arguments and cycle fallback", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  const notifications: string[] = [];
  const mockCtx: any = {
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
      setWidget() {},
    },
  };

  // 1. Explicitly switch to English mode
  await registeredCommands["lingual"].handler("english", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("英文") || notifications[notifications.length - 1].includes("English"));

  // 2. Explicitly switch to Off mode
  await registeredCommands["lingual-mode"].handler("off", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("关闭") || notifications[notifications.length - 1].includes("disabled") || notifications[notifications.length - 1].includes("off"));

  // 3. Explicitly switch to Original mode
  await registeredCommands["lingual"].handler("original", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("原文") || notifications[notifications.length - 1].includes("Original"));

  // 4. Cycle without arguments: original -> english
  await registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("英文") || notifications[notifications.length - 1].includes("English"));

  // Teardown: back to original
  await registeredCommands["lingual"].handler("original", mockCtx);
});

test("extension /lingual-compact - toggles capsule and tree layout with notification", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  const notifications: string[] = [];
  const mockCtx: any = {
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
    },
  };

  // Toggle on
  await registeredCommands["lingual-compact"].handler("", mockCtx);
  assert.ok(notifications.length > 0);
  assert.ok(
    notifications[notifications.length - 1].includes("胶囊") ||
    notifications[notifications.length - 1].includes("Capsule") ||
    notifications[notifications.length - 1].includes("カプセル")
  );

  // Toggle off
  await registeredCommands["lingual-compact"].handler("", mockCtx);
  assert.ok(notifications.length > 1);
  assert.ok(
    notifications[notifications.length - 1].includes("树状") ||
    notifications[notifications.length - 1].includes("tree") ||
    notifications[notifications.length - 1].includes("ツリー")
  );
});

test("standalone /lang and language normalization - switches languages and handles pairs & aliases", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  const notifications: string[] = [];
  const mockCtx: any = {
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
    },
  };

  // 1. Direct /lang ja
  await registeredCommands["lang"].handler("ja", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("ja"));

  // 2. Natural language alias: /lang japanese
  await registeredCommands["lang"].handler("japanese", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("ja"));

  // 3. CJK alias: /lang 日语
  await registeredCommands["lang"].handler("日语", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("ja"));

  // 4. Language pair: /lang zh ja
  await registeredCommands["lang"].handler("zh ja", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("zh ⇄ ja"));

  // 5. Standalone /lingual-compact command
  await registeredCommands["lingual-compact"].handler("", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("胶囊") ||
    notifications[notifications.length - 1].includes("Capsule") ||
    notifications[notifications.length - 1].includes("capsule") ||
    notifications[notifications.length - 1].includes("カプセル")
  );

  // Teardown: Restore to zh ➔ en and tree layout
  await registeredCommands["lang"].handler("zh", mockCtx);
  await registeredCommands["lingual-compact"].handler("", mockCtx);
});

test("master command dispatcher - routes subcommands in /lingual smoothly", async () => {
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  const notifications: string[] = [];
  const mockCtx: any = {
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
    },
  };

  // 1. Subcommand: /lingual lang ja
  await registeredCommands["lingual"].handler("lang ja", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("ja"));

  // 2. Subcommand: /lingual lang zh
  await registeredCommands["lingual"].handler("lang zh", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("zh"));

  // 3. Direct language code: /lingual ja
  await registeredCommands["lingual"].handler("ja", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("ja"));

  // 4. Subcommand: /lingual compact
  await registeredCommands["lingual"].handler("compact", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("胶囊") ||
    notifications[notifications.length - 1].includes("Capsule") ||
    notifications[notifications.length - 1].includes("カプセル")
  );

  // 5. Subcommand: /lingual compact (toggle back)
  await registeredCommands["lingual"].handler("compact", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("树状") ||
    notifications[notifications.length - 1].includes("tree") ||
    notifications[notifications.length - 1].includes("ツリー")
  );

  // 6. Subcommand: /lingual status
  await registeredCommands["lingual"].handler("status", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("报告") ||
    notifications[notifications.length - 1].includes("Status") ||
    notifications[notifications.length - 1].includes("ステータス")
  );

  // Teardown: Restore to zh
  await registeredCommands["lingual"].handler("lang zh", mockCtx);
});

test("formatStatusReport - includes in-memory cache statistics and hit rate", () => {
  const labels = resolveLabelsForLang("zh");
  const report = formatStatusReport(labels, {
    mode: "original",
    sourceLang: "zh",
    targetLang: "en",
    activeModel: "auto (session)",
    cacheStats: {
      hits: 8,
      misses: 2,
      size: 5,
      capacity: 50,
    },
  });

  assert.ok(report.includes("会话缓存"), "Must include localized cache header");
  assert.ok(report.includes("8 hits / 10 total"), "Must include hit ratio");
  assert.ok(report.includes("80% hit rate"), "Must include percentage");
  assert.ok(report.includes("5/50 items"), "Must include capacity info");
});

test("extension paging - non-translating inputs fully clear pagination pool to prevent ghost resurrection", async () => {
  let registeredInputHandler: any = null;
  const registeredShortcuts: Record<string, any> = {};

  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") registeredInputHandler = handler;
    },
    registerCommand() {},
    registerShortcut(key: string, def: any) {
      registeredShortcuts[key] = def;
    },
  };

  let activeWidget: any = undefined;
  const mockCtx: any = {
    hasUI: true,
    ui: {
      setWidget(_key: string, content: any) {
        activeWidget = content;
      },
      setStatus() {},
      notify() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  extensionFactory(mockPi);

  // Send a non-translating command (e.g. CLI command)
  await registeredInputHandler({ type: "input", text: "git status", source: "interactive" }, mockCtx);
  assert.equal(activeWidget, undefined, "Widget must be dismissed on non-translating inputs");

  // Pressing Alt+. after dismissal must NOT resurrect previous companion card
  if (registeredShortcuts["alt+."]) {
    await registeredShortcuts["alt+."].handler(mockCtx);
    assert.equal(activeWidget, undefined, "Ghost companion card must NOT resurrect after dismissal");
  }
});

test("v0.4.1 Mode 2 Direct Rewrite & Mode 3 N-Choice Prompt Selector", async () => {
  // 1. Default 3 prompt optimization slots (concise, spec, deep)
  const defaultPromptSlots = getDefaultPromptSlots("zh");
  assert.equal(defaultPromptSlots.length, 3);
  assert.deepEqual(defaultPromptSlots.map((s) => s.id), ["concise", "spec", "deep"]);

  // 2. Mode 2 Direct Rewrite System Prompt & execution (with custom promptLang and promptRule)
  const directSys = buildDirectRewriteSystemPrompt({
    sourceLang: "zh",
    targetLang: "en",
    promptLang: "zh",
    promptRule: "遵循最小工作 Diff 原则，严禁无关重构",
  });
  assert.ok(directSys.includes("Chinese (Simplified)"));
  assert.ok(directSys.includes("遵循最小工作 Diff 原则，严禁无关重构"));

  const rewritten = await rewritePromptDirect("那个登录刷新老掉线，帮我看看是不是cookie问题", {
    sourceLang: "zh",
    targetLang: "en",
    promptLang: "zh",
    promptRule: "最小改动",
    complete: async () =>
      JSON.stringify({
        prompt: "排查并修复页面刷新后登录态丢失问题：检查 Cookie 属性与过期策略，保持最小工作改动面。",
      }),
  });
  assert.equal(rewritten, "排查并修复页面刷新后登录态丢失问题：检查 Cookie 属性与过期策略，保持最小工作改动面。");

  // 3. Mode 3 N-Choice Candidate Generator (supports default 3 styles or custom N styles, plus unescaped quote self-healing)
  const candSys = buildPromptCandidatesSystemPrompt({
    sourceLang: "zh",
    targetLang: "en",
    promptLang: "en",
    promptRule: "Follow RFC 2119",
  });
  assert.ok(candSys.includes('"concise"'));
  assert.ok(candSys.includes('"spec"'));
  assert.ok(candSys.includes('"deep"'));
  assert.ok(candSys.includes("Follow RFC 2119"));

  const candidates = await generatePromptCandidates("优化登录鉴权逻辑", {
    sourceLang: "zh",
    targetLang: "en",
    complete: async () =>
      `{
        "concise": "Refactor "auth" login flow with minimal diff.",
        "spec": "Objective: Optimize auth login flow. Constraints: Preserve session compatibility.",
        "deep": "Trace end-to-end auth flow, resolve root session bottlenecks, and verify boundary cases."
      }`,
  });
  assert.ok(candidates);
  assert.equal(candidates!.length, 3);
  assert.ok(candidates![0].content.includes('"auth"'), "Must self-heal unescaped internal quotes in candidate JSON");
  assert.equal(candidates![1].id, "spec");
  assert.ok(candidates![1].content.includes("Objective:"));

  // 4. Direct Rewrite also self-heals unescaped internal quotes without leaking raw JSON braces
  const rewrittenUnescaped = await rewritePromptDirect("修复登录报错", {
    sourceLang: "zh",
    targetLang: "en",
    complete: async () => `{"prompt": "Fix the "login" session bug in src/auth.ts"}`,
  });
  assert.equal(rewrittenUnescaped, 'Fix the "login" session bug in src/auth.ts');
});

test("v0.4.1 Mode 4 Active 0-Token Context Shield in off mode & /lingual select routing", async () => {
  const samplePromptWithSkill = [
    "<available_skills>",
    "  <skill>",
    "    <name>other-skill</name>",
    "    <description>Other skill</description>",
    "  </skill>",
    "  <skill>",
    "    <name>lingual-tuner</name>",
    "    <description>Zero-friction companion slot tuner</description>",
    "    <location>/path/to/SKILL.md</location>",
    "  </skill>",
    "</available_skills>",
  ].join("\n");

  // When in off mode on normal coding input, lingual-tuner skill is physically stripped (0 tokens)
  const stripped = stripLingualContextWhenOff(samplePromptWithSkill, "fix the login bug in src/auth.ts");
  assert.ok(!stripped.includes("lingual-tuner"), "Must strip lingual-tuner skill block in off mode");
  assert.ok(stripped.includes("other-skill"), "Must preserve other skills untouched");

  // When user explicitly mentions lingual or 伴学, keep skill available so they can reconfigure
  const preserved = stripLingualContextWhenOff(samplePromptWithSkill, "帮我配置伴学槽位");
  assert.ok(preserved.includes("lingual-tuner"));

  // Verify /lingual select mode switch and before_agent_start hook in extension
  const registeredCommands: Record<string, any> = {};
  let beforeAgentStartHandler: any = null;
  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "before_agent_start") beforeAgentStartHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  const notifications: string[] = [];
  const mockCtx: any = {
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
      setWidget() {},
    },
  };

  await registeredCommands["lingual"].handler("select", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("select"));

  await registeredCommands["lingual"].handler("off", mockCtx);
  assert.ok(beforeAgentStartHandler, "Must register before_agent_start hook for 0-token off shield");
  const hookRes = await beforeAgentStartHandler({ systemPrompt: samplePromptWithSkill }, mockCtx);
  assert.ok(hookRes && !hookRes.systemPrompt.includes("lingual-tuner"));

  // Teardown back to original
  await registeredCommands["lingual"].handler("original", mockCtx);

  // Verify localized What's New release banner above editor (zh, ja, en)
  const zhBanner = formatReleaseBannerLines("zh", 88);
  assert.equal(zhBanner.length, 5);
  assert.ok(zhBanner.some((l) => l.includes("english重写") && l.includes("规范化")));
  assert.ok(zhBanner.some((l) => l.includes("select多选")));
  assert.ok(zhBanner.some((l) => l.includes("off零负担")));

  const enBanner = formatReleaseBannerLines("en", 88);
  assert.equal(enBanner.length, 5);
  assert.ok(enBanner.some((l) => l.includes("Direct Prompt Rewrite")));
  assert.ok(enBanner.some((l) => l.includes("0.00-byte")));
});

