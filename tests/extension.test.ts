import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LingualSessionController } from "../src/fsm.js";
import { SUPPORTED_LANG_CODES, getDefaultFactoryModes, compileModeSystemPrompt } from "../src/index.js";
import { getVisualWidth } from "../src/layout.js";
import extensionFactory from "../dist/extension.js";
import type { LingualResult } from "../src/types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SANDBOX = path.join(ROOT, ".tmp", "test-sandboxes");
const CHILD = path.join(ROOT, "tests", "fixtures", "sandbox_boot.mjs");

after(() => {
  fs.rmSync(path.join(ROOT, ".tmp"), { recursive: true, force: true });
});

test("fsm: LingualSessionController monotonic generation, abort, and pagination", () => {
  const fsm = new LingualSessionController();
  assert.equal(fsm.getCurrentGeneration(), 0);

  const req1 = fsm.beginRequest();
  assert.equal(req1.generation, 1);
  assert.equal(req1.signal.aborted, false);

  const req2 = fsm.beginRequest();
  assert.equal(req1.signal.aborted, true);
  assert.equal(fsm.isLatest(1), false);
  assert.equal(fsm.isLatest(2), true);

  fsm.initPagination(2);
  const resA: LingualResult = { spoken: "A", written: "WA", sourceText: "SA", annotated: "" };
  const resB: LingualResult = { spoken: "B", written: "WB", sourceText: "SB", annotated: "" };
  assert.equal(fsm.setPageResult(0, resA, 1), false, "Stale generation rejected");
  assert.equal(fsm.setPageResult(0, resA, 2), true);
  assert.equal(fsm.setPageResult(1, resB, 2), true);

  assert.equal(fsm.getActiveResult()?.spoken, "A");
  assert.equal(fsm.nextPage(), true);
  assert.equal(fsm.getActiveResult()?.spoken, "B");
  assert.equal(fsm.nextPage(), true);
  assert.equal(fsm.getActiveResult()?.spoken, "A");
  assert.equal(fsm.prevPage(), true);
  assert.equal(fsm.getActiveResult()?.spoken, "B");

  fsm.clearPagination();
  assert.equal(fsm.getReadyPages().length, 0);
});

test("extension: companion mode returns continue at 0ms and paints Left-Rail tree asynchronously", async () => {
  let registeredInputHandler: any = null;
  let widgetLines: string[] | undefined;
  let resolveTreeReady: (() => void) | null = null;
  const treeReadyPromise = new Promise<void>((resolve) => {
    resolveTreeReady = resolve;
  });

  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") registeredInputHandler = handler;
    },
    registerCommand() {},
    registerShortcut() {},
  };

  const mockCtx: any = {
    hasUI: true,
    model: { id: "mock-model", provider: "mock" },
    modelRegistry: {
      getAvailable: () => [{ id: "mock-model", provider: "mock" }],
      streamSimple: () => ({
        result: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                spoken: "Check all current plugins.",
                spoken_meaning: "检查所有当前插件",
                written: "Inspect the active extension inventory.",
                written_meaning: "审查活动扩展清单",
                vocab: "inspect (审查) · inventory (清单)",
              }),
            },
          ],
        }),
      }),
    },
    ui: {
      setStatus() {},
      setWidget(_k: string, content: string[] | undefined) {
        widgetLines = content;
        if (content && content.some((l) => l.includes("├"))) {
          resolveTreeReady?.();
        }
      },
      theme: { fg: (_c: string, t: string) => t },
      notify() {},
    },
  };

  extensionFactory(mockPi);
  const start = Date.now();
  const res = await registeredInputHandler(
    { type: "input", text: "現在のすべてのプラグインを確認してください", source: "interactive" },
    mockCtx
  );
  assert.ok(Date.now() - start < 100);
  assert.equal(res.action, "continue");

  await treeReadyPromise;
  assert.ok(widgetLines?.some((l) => l.includes("·")));
  assert.ok(widgetLines?.some((l) => l.includes("┌")));
  assert.ok(widgetLines?.some((l) => l.includes("├")));
  assert.ok(widgetLines?.some((l) => l.includes("└")));
});

test("extension: survives stale ctx getter throws and deduplicates stdout resize listeners", async () => {
  let registeredInputHandler: any = null;
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") registeredInputHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  const beforeCount = process.stdout?.listenerCount ? process.stdout.listenerCount("resize") : 0;
  extensionFactory(mockPi);
  extensionFactory(mockPi);
  const afterCount = process.stdout?.listenerCount ? process.stdout.listenerCount("resize") : 0;
  assert.ok(afterCount - beforeCount <= 1);

  const staleCtx: any = {
    get hasUI() {
      throw new Error("Stale ctx");
    },
    get ui() {
      throw new Error("Stale ctx");
    },
  };

  const res = await registeredInputHandler({ type: "input", text: "git status", source: "interactive" }, staleCtx);
  assert.equal(res.action, "continue");
  await assert.doesNotReject(async () => {
    await registeredCommands["lingual"].handler("off", staleCtx);
    await registeredCommands["lingual"].handler("original", staleCtx);
  });
});

test("extension: multi-session defaultMode initialization, mode lock/unlock, and Non-Chinese polyglot parity", async () => {
  const registeredCommands: Record<string, any> = {};
  const listeners: Record<string, any[]> = {};
  extensionFactory({
    on(event: string, handler: any) {
      (listeners[event] ||= []).push(handler);
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
    sendMessage() {},
    sendUserMessage() {},
  } as any);

  const makeCtx = () => {
    const notifications: { msg: string; level?: string }[] = [];
    const ctx: any = {
      hasUI: true,
      ui: {
        notify: (msg: string, level?: string) => notifications.push({ msg, level }),
        setStatus() {},
        setWidget() {},
        custom: async () => null,
        theme: { fg: (_c: string, t: string) => t },
      },
      sessionManager: { getEntries: () => [] },
      modelRegistry: { getAvailable: () => [] },
    };
    return { ctx, notifications };
  };

  const a = makeCtx();
  const b = makeCtx();
  const lingualCmd = registeredCommands["lingual"];
  const langCmd = registeredCommands["lang"];

  // 1. Default mode initialization across sessions
  await lingualCmd.handler("default 2", a.ctx);
  for (const h of listeners["session_start"] || []) await h({ reason: "new" }, b.ctx);
  b.notifications.length = 0;
  await lingualCmd.handler("status", b.ctx);
  assert.ok(b.notifications[0]?.msg.includes("direct") || b.notifications[0]?.msg.includes("Logical Spec"));
  await lingualCmd.handler("default 1", a.ctx);

  // 2. Mode lock blocks parameterless cycling until unlocked
  await lingualCmd.handler("1", a.ctx);
  await lingualCmd.handler("lock", a.ctx);
  a.notifications.length = 0;
  await lingualCmd.handler("", { ...a.ctx, ui: { ...a.ctx.ui, custom: undefined } });
  assert.equal(a.notifications[0]?.level, "warning");
  await lingualCmd.handler("unlock", a.ctx);
  a.notifications.length = 0;
  await lingualCmd.handler("2", a.ctx);
  assert.ok(a.notifications[0]?.msg.includes("Logical Spec") || a.notifications[0]?.msg.includes("direct"));

  // 3. Non-Chinese polyglot pair (en ⇄ ru) emits 0% Chinese characters
  await langCmd.handler("en ru", a.ctx);
  a.notifications.length = 0;
  await lingualCmd.handler("mode list", a.ctx);
  await lingualCmd.handler("status", a.ctx);
  for (const n of a.notifications) {
    assert.ok(!/[\u4e00-\u9fa5]/.test(n.msg), `Leaked Chinese: ${n.msg}`);
  }
  for (const m of getDefaultFactoryModes("en", "en")) {
    const prompt = compileModeSystemPrompt(m, { sourceLang: "en", targetLang: "ru", explainLang: "en" });
    assert.ok(!/[\u4e00-\u9fa5]/.test(prompt));
  }

  // 4. Target-only /lang switch vs full pair switch notifications
  a.notifications.length = 0;
  await lingualCmd.handler("lang zh ja", a.ctx);
  const pairNotice = a.notifications[a.notifications.length - 1]?.msg;
  a.notifications.length = 0;
  await lingualCmd.handler("lang en", a.ctx);
  const targetNotice = a.notifications[a.notifications.length - 1]?.msg;
  assert.notEqual(targetNotice, pairNotice);

  // 5. Removing active custom mode falls back safely on cycle
  await lingualCmd.handler("mode add temp_mode Temp translate transform preview", a.ctx);
  await lingualCmd.handler("temp_mode", a.ctx);
  await lingualCmd.handler("mode rm temp_mode", a.ctx);
  await lingualCmd.handler("", a.ctx);
  await lingualCmd.handler("mode reset", a.ctx);
  await lingualCmd.handler("1", a.ctx);
});

test("extension: sandboxed cold-boot release banner renders 8 lines, self-heals corrupt config, and burns once", () => {
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
  let seq = 0;
  const bootInSandbox = (
    lang: string,
    cols = 80,
    variant: "fresh" | "legacy" | "corrupt" | "throwy" = "fresh"
  ) => {
    const home = path.join(SANDBOX, `${lang}-${variant}-${cols}-${++seq}`);
    fs.mkdirSync(home, { recursive: true });
    const res = spawnSync(
      process.execPath,
      [CHILD, `--lang=${lang}`, `--variant=${variant}`, `--cols=${cols}`, `--root=${ROOT}`],
      {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 25000,
        env: {
          ...process.env,
          SANDBOX_HOME: home,
          LC_ALL: LOCALES[lang] || "en_US.UTF-8",
          LANG: LOCALES[lang] || "en_US.UTF-8",
        },
      }
    );
    const payload = (res.stdout || "").split("\n").filter((l) => l.startsWith("{")).pop();
    assert.ok(payload, `sandbox boot must produce JSON: ${res.stderr}`);
    return JSON.parse(payload);
  };

  for (const lang of SUPPORTED_LANG_CODES) {
    const out = bootInSandbox(lang, 80, "fresh");
    assert.equal(out.inputPrompted, false);
    assert.equal(out.bannerLines.length, 8);
    assert.equal(out.bannerPlacement, "aboveEditor");
    assert.equal(out.secondStartBanner, false);
    assert.equal(out.configAfter.lastSeenVersion, "0.7.0");
    for (const line of out.bannerLines) {
      assert.ok(getVisualWidth(line) <= 78);
    }
  }

  const corrupt = bootInSandbox("en", 80, "corrupt");
  assert.equal(corrupt.bannerLines.length, 8);
  assert.equal(corrupt.configAfter.lastSeenVersion, "0.7.0");

  const throwy = bootInSandbox("zh", 80, "throwy");
  assert.equal(throwy.errors.length, 0);
  assert.notEqual(throwy.configAfter?.lastSeenVersion, "0.7.0");
});
