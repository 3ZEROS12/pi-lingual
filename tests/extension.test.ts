import { test } from "node:test";
import assert from "node:assert/strict";
import extensionFactory from "../dist/extension.js";

test("extension input handler - original mode returns continue immediately and renders source anchor & Left-Rail tree branch asynchronously", async () => {
  let registeredInputHandler: any = null;
  let widgetLines: string[] | undefined = undefined;

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
      getAvailable() {
        return [{ id: "mock-model", provider: "mock" }];
      },
      streamSimple(_model: any, _context: any) {
        return {
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
        };
      },
    },
    ui: {
      setStatus() {},
      setWidget(_key: string, content: string[] | undefined) {
        widgetLines = content;
      },
      theme: {
        fg(_color: string, text: string) {
          return text;
        },
      },
      notify() {},
    },
  };

  extensionFactory(mockPi);
  assert.ok(registeredInputHandler, "Input handler must be registered");

  const inputEvent: any = {
    type: "input",
    text: "現在のすべてのプラグインを確認してください",
    source: "interactive",
  };

  const startTime = Date.now();
  const res = await registeredInputHandler(inputEvent, mockCtx);
  const elapsed = Date.now() - startTime;

  // 【核心断言 1】：原文モード下必须非阻塞 0ms 立即返回 continue，发给 AI 的输入保持纯净原文！
  assert.ok(elapsed < 100, `Handler must return immediately without blocking (took ${elapsed}ms)`);
  assert.equal(res.action, "continue", "Original mode must return action 'continue' to keep prompt clean");
  assert.equal(res.text, undefined, "Original mode must never return transformed text");

  // 【核心断言 2】：后台微任务完成后，双模伴学内容必须以极简左导轨树状形式渲染到 Widget 中
  const maxWait = 25000;
  const pollInterval = 50;
  let waited = 0;
  while (waited < maxWait) {
    if (widgetLines && Array.isArray(widgetLines) && (widgetLines as string[]).some((l: string) => l.includes("├"))) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    waited += pollInterval;
  }

  assert.ok(widgetLines && Array.isArray(widgetLines), "Widget must be populated by the background task");
  const lines = widgetLines as string[];

  // 验证原文锚点与极简左导轨树状结构 (Trifecta Minimalist Left-Rail Tree Branch)
  assert.ok(lines.some((l: string) => l.includes("·") && (l.includes("原文") || l.includes("Original"))), "Widget must contain source text anchor");
  assert.ok(lines.some((l: string) => l.includes("┌") && (l.includes("[口语]") || l.includes("[Spoken]"))), "Widget must contain slot 1 branch with '┌'");
  assert.ok(lines.some((l: string) => l.includes("├") && (l.includes("[写作]") || l.includes("[Written]"))), "Widget must contain slot 2 branch with '├'");
  assert.ok(lines.some((l: string) => l.includes("└") && (l.includes("[重点]") || l.includes("[Vocab]"))), "Widget must contain vocab branch with '└'");
});

test("extension stale ctx & resize listener hygiene - survives stale ctx getter throws and deduplicates stdout resize listeners", async () => {
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

  // Reloading extension multiple times must NOT accumulate resize listeners
  const beforeCount = process.stdout?.listenerCount ? process.stdout.listenerCount("resize") : 0;
  extensionFactory(mockPi);
  extensionFactory(mockPi);
  extensionFactory(mockPi);
  const afterCount = process.stdout?.listenerCount ? process.stdout.listenerCount("resize") : 0;
  assert.ok(afterCount - beforeCount <= 1, `Resize listener must be deduplicated across reloads (delta=${afterCount - beforeCount})`);

  // Simulate Pi's stale ExtensionContext where accessing ctx.hasUI or ctx.ui throws ExtensionRunner.assertActive
  const staleCtx: any = {
    get hasUI() {
      throw new Error("This extension ctx is stale after session replacement or reload.");
    },
    get ui() {
      throw new Error("This extension ctx is stale after session replacement or reload.");
    },
  };

  // 1. Non-translating input with stale ctx must not throw
  const res1 = await registeredInputHandler({ type: "input", text: "git status", source: "interactive" }, staleCtx);
  assert.equal(res1.action, "continue");

  // 2. Mode switch to off & back to original with stale ctx must not throw
  await assert.doesNotReject(async () => {
    await registeredCommands["lingual-mode"].handler("off", staleCtx);
    await registeredCommands["lingual-mode"].handler("original", staleCtx);
  });
});

