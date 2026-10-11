import { test } from "node:test";
import assert from "node:assert/strict";
import extensionFactory, { parseOneShotRefinePrefix } from "../dist/extension.js";
import { formatStatusReport, resolveLabelsForLang } from "../src/presets.js";
import { buildRefineSystemPrompt, normalizeRefinePreset } from "../src/prompts.js";
import { shouldTriggerTranslation, translatePrompt } from "../src/engine.js";
import { LingualLruCache, globalLingualCache } from "../src/cache.js";

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
  assert.ok(registeredCommands["refine"], "Must register standalone /refine");
  assert.ok(registeredCommands["lingual-refine"], "Must register /lingual-refine");
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

test("v0.4.0 Prompt Refiner - /refine command, buildRefineSystemPrompt, same-language refinement, and >> one-shot prefix", async () => {
  // 1. One-shot prefix detection (`>>`, `提炼:`, `refine:`)
  assert.equal(parseOneShotRefinePrefix(">> 帮我看看登录为什么老掉线"), "帮我看看登录为什么老掉线");
  assert.equal(parseOneShotRefinePrefix("提炼：把那个鉴权改一下，别动别的模块"), "把那个鉴权改一下，别动别的模块");
  assert.equal(parseOneShotRefinePrefix("refine: check token expiry in auth.ts"), "check token expiry in auth.ts");
  assert.equal(parseOneShotRefinePrefix("普通对话输入"), null);

  // 2. Preset normalization & system prompt generation with stacked language and custom rules
  assert.equal(normalizeRefinePreset("规范"), "spec");
  assert.equal(normalizeRefinePreset("极简"), "surgical");
  assert.equal(normalizeRefinePreset("tdd"), "tdd");
  assert.equal(normalizeRefinePreset("排障"), "debug");

  const sysZhSpec = buildRefineSystemPrompt({
    sourceLang: "zh",
    targetLang: "en",
    refinePreset: "spec",
    refineLang: "zh",
    refineRule: "遵循 RFC 2119 与最小改动原则",
  });
  assert.ok(sysZhSpec.includes("Chinese (Simplified)"), "Must target Chinese (Simplified) when refineLang=zh");
  assert.ok(sysZhSpec.includes("Structured Engineering Spec"), "Must embed spec preset directive");
  assert.ok(sysZhSpec.includes("遵循 RFC 2119 与最小改动原则"), "Must embed stacked user refineRule");

  // 3. Same-language & English input triggering when refiner is enabled
  assert.equal(shouldTriggerTranslation("check token expiry in auth module", "zh", false), false);
  assert.equal(shouldTriggerTranslation("check token expiry in auth module", "zh", true), true);

  // 4. translatePrompt with refinePreset + refineLang + refineRule invokes refiner prompt and returns refined output
  globalLingualCache.clear();
  let capturedSysPrompt = "";
  const refinedRes = await translatePrompt("那个登录老是刷新就没了，帮我看看是不是cookie问题", {
    sourceLang: "zh",
    targetLang: "en",
    refinePreset: "surgical",
    refineLang: "zh",
    refineRule: "保持最小改动面",
    complete: async (_text, sysPrompt) => {
      capturedSysPrompt = sysPrompt;
      return JSON.stringify({
        spoken: "The login session keeps dropping on refresh — could you check if it's a cookie issue?",
        spoken_meaning: "登录会话刷新就掉，能看下是不是 Cookie 的问题吗？",
        written: "排查并修复页面刷新后登录态丢失问题：1. 检查 `Cookie` 属性与过期策略；2. 保持最小改动面，零无关重构。",
        written_meaning: "结构化排障与最小改动指令",
        vocab: "drop on refresh (刷新丢失) · session persistence (会话保持)",
      });
    },
  });
  assert.ok(capturedSysPrompt.includes("Surgical Minimal Diff"));
  assert.ok(capturedSysPrompt.includes("保持最小改动面"));
  assert.ok(refinedRes);
  assert.ok(refinedRes!.written?.includes("排查并修复页面刷新后登录态丢失问题"));

  // 5. /refine command handler supports preset, language, custom rule, and reset
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

  await registeredCommands["refine"].handler("zh spec + 要求最小改动", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("spec"));
  assert.ok(notifications[notifications.length - 1].includes("zh"));
  assert.ok(notifications[notifications.length - 1].includes("要求最小改动"));

  await registeredCommands["refine"].handler("reset", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("translate") || notifications[notifications.length - 1].includes("默认"));

  await registeredCommands["lingual"].handler("original", mockCtx);
});

