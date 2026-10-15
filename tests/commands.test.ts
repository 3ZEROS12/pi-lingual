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

test("extension command matrix - registers 4 core commands without menu clutter", () => {
  const registeredCommands: Record<string, any> = {};

  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  // Register core developer commands in Pi's / menu
  assert.deepEqual(
    Object.keys(registeredCommands).sort(),
    ["lang", "last", "lingual", "slots"],
    "Must register strictly the 4 core developer commands (/lingual, /lang, /slots, /last)"
  );
  assert.equal(registeredCommands["compact"], undefined, "Must NOT occupy Pi core /compact command");
  assert.equal(registeredCommands["status"], undefined, "Must NOT hijack generic /status command");
});

test("extension /lingual - supports explicit mode arguments, 1/2/3/0 jumps, and cycle fallback", async () => {
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
  let lastStatusVal: any = "initial";
  const mockCtx: any = {
    hasUI: true,
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus(_key: string, val: any) {
        lastStatusVal = val;
      },
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. Explicitly switch to Mode 2 (Direct / 直接改)
  await registeredCommands["lingual"].handler("2", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("直接改") ||
      notifications[notifications.length - 1].toLowerCase().includes("direct")
  );
  assert.ok(
    typeof lastStatusVal === "string" &&
      (lastStatusVal.includes("直接改") || lastStatusVal.includes("Direct"))
  );

  // 2. Explicitly switch to Mode 0 (Off) — status bar badge MUST become undefined (0 visual pixels)
  await registeredCommands["lingual"].handler("0", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("已关闭") ||
      notifications[notifications.length - 1].toLowerCase().includes("off")
  );
  assert.equal(lastStatusVal, undefined, "Off mode must hide status bar badge completely (undefined)");

  // 3. Explicitly switch to Mode 1 (Companion / 纯伴学)
  await registeredCommands["lingual"].handler("companion", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("纯伴学") ||
      notifications[notifications.length - 1].toLowerCase().includes("companion")
  );
  assert.ok(
    typeof lastStatusVal === "string" &&
      (String(lastStatusVal).includes("纯伴学") || String(lastStatusVal).includes("Companion"))
  );

  // 4. Cycle without arguments: companion (1) -> direct (2) -> candidates (3) -> modify (4) -> off (0) -> companion (1)
  await registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("直接改") ||
      notifications[notifications.length - 1].toLowerCase().includes("direct")
  );

  await registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("挑候选") ||
      notifications[notifications.length - 1].toLowerCase().includes("candidates")
  );

  await registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("原句修补") ||
      notifications[notifications.length - 1].toLowerCase().includes("modify")
  );

  await registeredCommands["lingual"].handler("", mockCtx);
  assert.equal(lastStatusVal, undefined, "Cycling into off mode must clear status bar badge");

  // Teardown: back to companion
  await registeredCommands["lingual"].handler("1", mockCtx);
});

test("extension /lingual compact - toggles capsule and tree layout with notification", async () => {
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

  // Toggle on via /lingual compact
  await registeredCommands["lingual"].handler("compact", mockCtx);
  assert.ok(notifications.length > 0);
  assert.ok(
    notifications[notifications.length - 1].toLowerCase().includes("capsule") ||
    notifications[notifications.length - 1].includes("胶囊") ||
    notifications[notifications.length - 1].includes("カプセル")
  );

  // Toggle off
  await registeredCommands["lingual"].handler("compact", mockCtx);
  assert.ok(notifications.length > 1);
  assert.ok(
    notifications[notifications.length - 1].toLowerCase().includes("tree") ||
    notifications[notifications.length - 1].includes("树状") ||
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

  // 5. Subcommand /lingual compact
  await registeredCommands["lingual"].handler("compact", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].toLowerCase().includes("capsule") ||
    notifications[notifications.length - 1].toLowerCase().includes("tree") ||
    notifications[notifications.length - 1].includes("胶囊") ||
    notifications[notifications.length - 1].includes("树状") ||
    notifications[notifications.length - 1].includes("カプセル")
  );

  // Teardown: Restore to zh ➔ en and tree layout
  await registeredCommands["lang"].handler("zh", mockCtx);
  await registeredCommands["lingual"].handler("compact", mockCtx);
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
  // 1. Default prompt optimization slots (concise, spec, deep + vocab)
  const defaultPromptSlots = getDefaultPromptSlots("zh");
  assert.equal(defaultPromptSlots.length, 4);
  assert.deepEqual(defaultPromptSlots.map((s) => s.id), ["concise", "spec", "deep", "vocab"]);

  // 2. Mode 2 (direct) runs dedicated directSlots[0] (en_direct), Mode 3 (candidates) runs all promptSlots
  const rewritten = await rewritePromptDirect("那个登录刷新老掉线，帮我看看是不是cookie问题", {
    sourceLang: "zh",
    targetLang: "en",
    complete: async () =>
      JSON.stringify({
        en_direct: "Diagnose and fix session loss on page refresh: check cookie expiration policy while maintaining minimal diff.",
      }),
  });
  assert.equal(rewritten, "Diagnose and fix session loss on page refresh: check cookie expiration policy while maintaining minimal diff.");

  // 3. Mode 3 N-Choice Candidate Generator (supports default 3 styles or custom N styles + optional vocab slot)
  const candSys = buildPromptCandidatesSystemPrompt({
    sourceLang: "zh",
    targetLang: "en",
  });
  assert.ok(candSys.includes('"concise"'));
  assert.ok(candSys.includes('"spec"'));
  assert.ok(candSys.includes('"deep"'));

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
    complete: async () => `{"en_direct": "Fix the "login" session bug in src/auth.ts"}`,
  });
  assert.equal(rewrittenUnescaped, 'Fix the "login" session bug in src/auth.ts');

  // 5. Optional vocab slot in promptSlots extracts 1-line vocab takeaway alongside rewrite (#anc-2)
  const withVocabRes = await generatePromptCandidates("登录刷新老掉线，帮我查查根因", {
    sourceLang: "zh",
    targetLang: "en",
    promptSlots: [
      { id: "concise", label: "极简直改", role: "rewrite", instruction: "Direct imperative prompt", enabled: true },
      { id: "vocab", label: "重点", role: "vocab", instruction: "Extract 2-3 terms", enabled: true },
    ],
    complete: async () =>
      JSON.stringify({
        concise: "Trace the root cause of session loss on page refresh.",
        vocab: "session loss (会话丢失) · root cause (根本原因)",
      }),
  });
  assert.ok(withVocabRes);
  assert.equal(withVocabRes!.length, 1);
  assert.equal(withVocabRes![0].content, "Trace the root cause of session loss on page refresh.");
  assert.equal(withVocabRes![0].vocab, "session loss (会话丢失) · root cause (根本原因)");
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

  // On normal coding input, lingual-tuner skill is physically stripped across ALL modes (0 tokens)
  const stripped = stripLingualContextWhenOff(samplePromptWithSkill, "fix the login bug in src/auth.ts", false);
  assert.ok(!stripped.includes("lingual-tuner"), "Must strip lingual-tuner skill block during normal coding");
  assert.ok(stripped.includes("other-skill"), "Must preserve other skills untouched");

  // Only when user explicitly arms tuner (/lingual tuner) or requests 定制伴学 is the skill retained
  const preservedByFlag = stripLingualContextWhenOff(samplePromptWithSkill, "把改写设为母语", true);
  assert.ok(preservedByFlag.includes("lingual-tuner"), "Must retain lingual-tuner when tunerArmed is true");
  const preservedByKeyword = stripLingualContextWhenOff(samplePromptWithSkill, "帮我定制伴学槽位", false);
  assert.ok(preservedByKeyword.includes("lingual-tuner"));

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

  await registeredCommands["lingual"].handler("candidates", mockCtx);
  assert.ok(
    notifications[notifications.length - 1].includes("挑候选") ||
      notifications[notifications.length - 1].includes("candidates")
  );

  await registeredCommands["lingual"].handler("off", mockCtx);
  assert.equal((globalThis as any).__piLingualResizeListener, undefined, "Must detach resize listener in off mode");
  assert.ok(beforeAgentStartHandler, "Must register before_agent_start hook for 0-token off shield");
  const hookRes = await beforeAgentStartHandler({ systemPrompt: samplePromptWithSkill }, mockCtx);
  assert.ok(hookRes && !hookRes.systemPrompt.includes("lingual-tuner"));

  // Teardown back to companion
  await registeredCommands["lingual"].handler("companion", mockCtx);
  assert.ok((globalThis as any).__piLingualResizeListener, "Must re-attach resize listener when leaving off mode");

  // Verify localized What's New release banner above editor (all 9 languages, 8 lines, zero emojis, ZERO apologies)
  const bannedApologyWords = ["抱歉", "Sorry", "お詫び", "사과", "Disculpas", "Désolé", "Entschuldigung", "Извините"];
  const zhBanner = formatReleaseBannerLines("zh", 80);
  assert.equal(zhBanner.length, 8);
  assert.ok(zhBanner.some((l) => l.includes("实战狂飙") || l.includes("粗口与情绪")));
  assert.ok(zhBanner.some((l) => l.includes("实战狂飙")));
  assert.ok(zhBanner.every((l) => !l.endsWith("...")), "No line should be truncated on an 80-col terminal");
  assert.ok(
    zhBanner.every((l) => bannedApologyWords.every((w) => !l.includes(w))),
    "Release banner must NEVER contain apologies"
  );

  const enBanner = formatReleaseBannerLines("en", 80);
  assert.equal(enBanner.length, 8);
  assert.ok(enBanner.some((l) => l.includes("Live Flow") || l.includes("profanity")));
  assert.ok(enBanner.some((l) => l.includes("Live Flow")));
  assert.ok(enBanner.every((l) => !l.endsWith("...")), "No English line should be truncated on an 80-col terminal");
  assert.ok(
    enBanner.every((l) => bannedApologyWords.every((w) => !l.includes(w))),
    "English release banner must NEVER contain apologies"
  );

  for (const lang of ["tw", "ja", "ko", "es", "fr", "de", "ru"]) {
    const usedColors = new Set<string>();
    const lines = formatReleaseBannerLines(lang, 80, (color, text) => {
      usedColors.add(color);
      return text;
    });
    assert.equal(lines.length, 8, `Banner for ${lang} must have 8 lines`);
    assert.equal(usedColors.size, 1, `Banner for ${lang} must use a single unified color across all lines`);
    assert.ok(usedColors.has("muted"), `Banner for ${lang} must uniformly use 'muted' color`);
    assert.ok(lines.every((l) => !l.endsWith("...")), `Banner for ${lang} must not truncate on 80-col terminal`);
    assert.ok(
      lines.every((l) => bannedApologyWords.every((w) => !l.includes(w))),
      `Banner for ${lang} must NEVER contain apologies`
    );
  }
});

test("Session Feedback Regression: 3-Way Mode Isolation (Zero Leakage), faithful translation without forced summary, and 1..N instant hotkey bar", async () => {
  // 1. System prompt must NOT force 'Objective:' or '排查并修复' action verbs when slots ask for faithful translation
  const faithfulSys = buildPromptCandidatesSystemPrompt({
    sourceLang: "zh",
    targetLang: "en",
    promptSlots: [
      { id: "en", label: "英语", role: "rewrite", instruction: "Translate 100% faithfully into English.", enabled: true },
      { id: "ja", label: "日语", role: "rewrite", instruction: "Translate 100% faithfully into Japanese.", enabled: true },
    ],
  });
  assert.ok(faithfulSys.includes("NEVER summarize"), "Must explicitly forbid unrequested summarization");
  assert.ok(!faithfulSys.includes("Start every rewritten prompt directly with a clear action verb"), "Must not force imperative summary verbs");

  // 2. Strict 3-Way Mode Isolation: Mode 1 (`slots`) and Mode 3 (`promptSlots`) NEVER leak into Mode 2 (`directSlots`)
  const directOut = await rewritePromptDirect("今天天气真不错，我想测试一下多语言功能", {
    sourceLang: "zh",
    targetLang: "en",
    // Suppose Mode 1 has French & Russian learning slots:
    slots: [
      { id: "fr", label: "法语", role: "translation", instruction: "Translate into French", enabled: true },
      { id: "ru", label: "俄语", role: "translation", instruction: "Translate into Russian", enabled: true },
    ],
    // And Mode 3 has Japanese & Korean candidate slots:
    promptSlots: [
      { id: "ja", label: "日语", role: "rewrite", instruction: "Translate into Japanese", enabled: true },
      { id: "ko", label: "韩语", role: "rewrite", instruction: "Translate into Korean", enabled: true },
    ],
    // While Mode 2 has its own isolated `directSlots`:
    directSlots: [
      { id: "direct_en", label: "英语直译", role: "rewrite", instruction: "Translate faithfully into English", enabled: true },
    ],
    complete: async (_text, sysPrompt) => {
      assert.ok(sysPrompt.includes('"direct_en"'), "Mode 2 must ONLY run directSlots");
      assert.ok(!sysPrompt.includes('"fr"') && !sysPrompt.includes('"ja"'), "Mode 1 slots and Mode 3 promptSlots must NEVER leak into Mode 2");
      return JSON.stringify({
        direct_en: "The weather is great today, and I want to test the multilingual feature.",
      });
    },
  });
  assert.equal(directOut, "The weather is great today, and I want to test the multilingual feature.");

  // 3. Mode 3 (candidates) ctx.ui.custom instant hotkey bar: pressing '2' immediately sends candidate #2 without repeating long text
  let inputHandler: any = null;
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") inputHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };
  extensionFactory(mockPi);

  let renderedCustomLines: string[] = [];
  let renderedHudLines: string[] = [];
  let keyToPress = "2";
  const mockCtx: any = {
    hasUI: true,
    model: { provider: "mock", id: "mock-model" },
    modelRegistry: {
      streamSimple: () => ({
        result: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                concise: "Candidate One Full Sentence Output",
                spec: "Candidate Two Full Sentence Output",
                deep: "Candidate Three Full Sentence Output",
              }),
            },
          ],
        }),
      }),
    },
    ui: {
      notify() {},
      setStatus() {},
      setWidget(_k: string, lines: string[]) {
        if (Array.isArray(lines)) renderedHudLines = lines;
      },
      theme: {
        fg: (_c: string, t: string) => t,
        bold: (t: string) => t,
      },
      custom: async (factory: any) => {
        return new Promise((resolve) => {
          const comp = factory(
            { requestRender() {} },
            { fg: (_c: string, t: string) => t, bold: (t: string) => t },
            { matches: () => false },
            resolve
          );
          renderedCustomLines = comp.render(80);
          comp.handleInput(keyToPress);
        });
      },
    },
  };

  await registeredCommands["lingual"].handler("3", mockCtx);
  const resPick2 = await inputHandler({ type: "input", text: "测试一下多语言候选直发", source: "interactive" }, mockCtx);
  assert.equal(resPick2.action, "transform");
  assert.equal(resPick2.text, "Candidate Two Full Sentence Output", "Pressing key '2' must immediately send Candidate #2 without Enter");
  assert.ok(
    renderedHudLines.some((l) => l.includes("Candidate Two Full Sentence Output")),
    "Top HUD card must display full candidate sentence"
  );
  assert.ok(
    !renderedCustomLines.some((l) => l.includes("Candidate Two Full Sentence Output")),
    "Bottom hotkey bar must NOT redundantly repeat the candidate sentence"
  );

  // Pressing '0' immediately passes through original raw text
  keyToPress = "0";
  const resPick0 = await inputHandler({ type: "input", text: "测试按0原话直发", source: "interactive" }, mockCtx);
  assert.equal(resPick0.action, "continue", "Pressing key '0' must immediately send original raw text");
});

test("extension /lingual anti-drift: blocks unrecognized subcommands and supports /lingual lock & unlock", async () => {
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

  // 1. Set mode to Mode 1 (Companion)
  await registeredCommands["lingual"].handler("1", mockCtx);
  notifications.length = 0;

  // 2. Unrecognized sub-command MUST NOT fall through to mode cycling!
  await registeredCommands["lingual"].handler("invalid_subcommand_test", mockCtx);
  assert.ok(notifications.some((n) => n.msg.includes("未识别的子命令") && n.type === "warning"), "Must show warning for unrecognized subcommand");

  // 3. Lock mode via /lingual lock
  notifications.length = 0;
  await registeredCommands["lingual"].handler("lock", mockCtx);
  assert.ok(notifications.some((n) => n.msg.includes("已锁定")), "Must notify that mode is locked");

  // 4. While locked, bare /lingual MUST NOT cycle mode!
  notifications.length = 0;
  await registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(notifications.some((n) => n.msg.includes("已锁定在") && n.type === "warning"), "Must warn that mode is locked and refuse blind cycling");

  // 5. Unlock mode via /lingual unlock
  notifications.length = 0;
  await registeredCommands["lingual"].handler("unlock", mockCtx);
  assert.ok(notifications.some((n) => n.msg.includes("解锁")), "Must notify that lock is released");

  // 6. After unlock, bare /lingual cycles mode normally
  notifications.length = 0;
  await registeredCommands["lingual"].handler("", mockCtx);
  assert.ok(notifications.some((n) => n.msg.includes("直接改") || n.msg.includes("Direct")), "Must cycle to Direct mode after unlock");
});

test("extension Mode 4 Modify - surgically fixes typos in-place and renders Fixed + Native + Fixes card", async () => {
  let inputHandler: any = null;
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") inputHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  let renderedHudLines: string[] = [];
  const mockCtx: any = {
    hasUI: true,
    model: { provider: "mock", id: "mock-model" },
    modelRegistry: {
      streamSimple: () => ({
        result: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                fixed: "Add more tests. I don't want it to happen again.",
                native: "Add more tests. I want to make sure this never happens again.",
                fixes: "happan ➔ happen · test more ➔ add more tests",
              }),
            },
          ],
        }),
      }),
    },
    ui: {
      notify() {},
      setStatus() {},
      setWidget(_k: string, lines: string[]) {
        if (Array.isArray(lines)) renderedHudLines = lines;
      },
      theme: {
        fg: (_c: string, t: string) => t,
        bold: (t: string) => t,
      },
    },
  };

  // Jump directly to Mode 4 (modify)
  await registeredCommands["lingual"].handler("4", mockCtx);

  const rawUserText = "test more. I don't want it happan again";
  const res = await inputHandler({ type: "input", text: rawUserText, source: "interactive" }, mockCtx);

  // 1. In-place prompt transform returns the surgical fix (user's exact sentence patched)
  assert.equal(res.action, "transform");
  assert.equal(res.text, "Add more tests. I don't want it to happen again.", "Prompt must be surgically fixed without alien gap");

  // 2. HUD card above displays Fixed, Native sibling, and Fixes diff
  assert.ok(renderedHudLines.some((l) => l.includes("Add more tests. I don't want it to happen again.")));
  assert.ok(renderedHudLines.some((l) => l.includes("Add more tests. I want to make sure this never happens again.")));
  assert.ok(renderedHudLines.some((l) => l.includes("happan ➔ happen")));
});

test("extension Mode 4 Modify - preserves raw emotion/profanity and avoids pedantic casing/punctuation nitpicking", async () => {
  let inputHandler: any = null;
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") inputHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  let renderedHudLines: string[] = [];
  const mockCtx: any = {
    hasUI: true,
    model: { provider: "mock", id: "mock-model" },
    modelRegistry: {
      streamSimple: () => ({
        result: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                fixed: "this fucking bug happen again on X, it just sucks so hard",
                native: "this fucking bug happened again on X, it honestly sucks so bad",
                fixes: "happan ➔ happen · in X ➔ on X · suck ➔ sucks",
              }),
            },
          ],
        }),
      }),
    },
    ui: {
      notify() {},
      setStatus() {},
      setWidget(_k: string, lines: string[]) {
        if (Array.isArray(lines)) renderedHudLines = lines;
      },
      theme: {
        fg: (_c: string, t: string) => t,
        bold: (t: string) => t,
      },
    },
  };

  await registeredCommands["lingual"].handler("4", mockCtx);

  const rawUserText = "this fucking bug happan again in X, it just suck so hard";
  const res = await inputHandler({ type: "input", text: rawUserText, source: "interactive" }, mockCtx);

  // 1. Raw profanity ('fucking', 'sucks') is 100% preserved; no pedantic capitalization of 't'; no forced trailing period
  assert.equal(res.action, "transform");
  assert.equal(res.text, "this fucking bug happen again on X, it just sucks so hard");
  assert.ok(res.text.includes("fucking"), "Profanity must NOT be sanitized into corporate PR speak");
  assert.ok(res.text.startsWith("this"), "Casual lowercase casing must NOT be forced into uppercase");

  // 2. HUD card renders the fixes takeaway
  assert.ok(renderedHudLines.some((l) => l.includes("happan ➔ happen · in X ➔ on X · suck ➔ sucks")));
});

test("extension Mode 4 Modify - long input adaptively suppresses full sentence in HUD and 100% preserves Takeaways", async () => {
  let inputHandler: any = null;
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") inputHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);

  let renderedHudLines: string[] = [];
  const mockCtx: any = {
    hasUI: true,
    model: { provider: "mock", id: "mock-model" },
    modelRegistry: {
      streamSimple: () => ({
        result: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                fixed: "What I meant is that you have to work as if I'm an American dev, because I want to market my projects on X in English. And I want you to treat other languages including Chinese fairly. So? Can you feel me?",
                native: "What I mean is, you need to work as if I'm an American dev, because I want to market my projects on X in English. And I want you to treat other languages including Chinese fairly. So, do you get me?",
                fixes: "as I'm ➔ as if I'm: 假设角色用 as if · in X ➔ on X: 平台介词用 on · other language ➔ other languages",
              }),
            },
          ],
        }),
      }),
    },
    ui: {
      notify() {},
      setStatus() {},
      setWidget(_k: string, lines: string[]) {
        if (Array.isArray(lines)) renderedHudLines = lines;
      },
      theme: {
        fg: (_c: string, t: string) => t,
        bold: (t: string) => t,
      },
    },
  };

  await registeredCommands["lingual"].handler("4", mockCtx);

  // Input > 120 chars (a real developer long vent/description)
  const longUserText =
    "what I meant is that you have to work as I'm a amercian dev, because I want to market my projects in X in english. and I want that you can treat other language including chinese fairely. so? can you feel me";
  const res = await inputHandler({ type: "input", text: longUserText, source: "interactive" }, mockCtx);

  // 1. In-place prompt transform returns the full surgical fix to AI Agent without compromise
  assert.equal(res.action, "transform");
  assert.ok(res.text.includes("work as if I'm an American dev"));
  assert.ok(res.text.includes("on X in English"));

  // 2. HUD card suppresses the full multi-line fixed paragraph to avoid blowing terminal line budget
  assert.ok(
    !renderedHudLines.some((l) => l.includes("What I meant is that you have to work as if I'm an American dev")),
    "Long sentence text must be adaptively suppressed from HUD to prevent terminal overflow"
  );

  // 3. Takeaway is 100% absolutely preserved in HUD
  assert.ok(
    renderedHudLines.some((l) => l.includes("as I'm ➔ as if I'm") && l.includes("in X ➔ on X")),
    "Takeaways must be 100% absolutely preserved in HUD"
  );
});




