import test from "node:test";
import assert from "node:assert/strict";
import { resolveModeRuntime, parsePartialJsonFields, primarySlot, runtimeLanguagePair, buildStreamingResult } from "../src/runtime.js";
import { renderCardLayout } from "../src/layout.js";
import { buildSystemPrompt } from "../src/prompts.js";
import { resolveLabelsForLang } from "../src/presets.js";
import { executeModeRunner } from "../src/engine.js";
import { globalLingualCache } from "../src/cache.js";
import {
  createModelCompleter,
  resolveTargetModel,
  isLightweightTextModel,
  isNonTextOrImageModel,
} from "../src/completer.js";
import { ensureCodeTokensPreserved } from "../src/sanitizer.js";
import { LingualSessionController } from "../src/fsm.js";
import { createCommandHandlers } from "../src/commands.js";
import extensionFactory from "../src/extension.js";
import type { CustomModeConfig, LingualResult } from "../src/types.js";

const BASE_SLOTS = [
  { id: "source", label: "Source", role: "source" as const, enabled: true },
  { id: "spoken", label: "Spoken", role: "translation" as const, enabled: true },
  { id: "written", label: "Written", role: "translation" as const, enabled: true },
  { id: "vocab", label: "Vocab", role: "vocab" as const, enabled: true },
];

function makeMode(patch: Partial<CustomModeConfig>): CustomModeConfig {
  return {
    id: "probe",
    name: "Probe",
    flow: "translate",
    action: "transform",
    hud: "tree",
    slots: BASE_SLOTS,
    enabled: true,
    ...patch,
  };
}

// ---------------------------------------------------------------------------
// 1. Declarative matrix: every action × flow × hud × target combination
//    must resolve to the declared runtime, never to a mode-id special case.
// ---------------------------------------------------------------------------
test("runtime: action x flow x hud x target matrix resolves from declaration only", () => {
  const actions = ["pass-through", "transform", "select"] as const;
  const flows = ["translate", "proofread", "custom"] as const;
  const huds = [
    ["tree", "tree"],
    ["preview", "preview"],
    ["adaptive-takeaway", "takeaway"],
    ["none", "none"],
  ] as const;
  const targets = ["agent", "clipboard"] as const;

  for (const action of actions) {
    for (const flow of flows) {
      for (const [declaredHud, expectedHud] of huds) {
        for (const target of targets) {
          const mode = makeMode({
            id: `m-${action}-${flow}-${declaredHud}-${target}`,
            action,
            flow,
            hud: declaredHud as any,
            target,
            customInputLang: "zh",
            customOutputLang: "ja",
          });
          const rt = resolveModeRuntime(mode, {
            sourceLang: "zh",
            targetLang: "en",
            explainLang: "zh",
            fallbackSlots: [],
          });

          assert.equal(rt.dispatcher, action);
          assert.equal(rt.flow, flow);
          assert.equal(rt.hud, expectedHud, `hud ${declaredHud} must render as ${expectedHud}`);
          assert.equal(rt.target, target);
          assert.deepEqual(
            rt.slots.map((s) => s.id),
            ["source", "spoken", "written", "vocab"],
            "mode-owned slots must survive every combination"
          );
        }
      }
    }
  }
});

test("runtime: custom flow advertises its own language pair, other flows keep the session pair", () => {
  const custom = resolveModeRuntime(
    makeMode({ flow: "custom", customInputLang: "zh", customOutputLang: "ja" }),
    { sourceLang: "zh", targetLang: "en" }
  );
  assert.equal(custom.inputLang, "zh");
  assert.equal(custom.outputLang, "ja");

  const translate = resolveModeRuntime(makeMode({ flow: "translate" }), {
    sourceLang: "zh",
    targetLang: "en",
  });
  assert.equal(translate.inputLang, "zh");
  assert.equal(translate.outputLang, "en");

  const proofread = resolveModeRuntime(makeMode({ flow: "proofread" }), {
    sourceLang: "zh",
    targetLang: "en",
  });
  assert.equal(proofread.inputLang, "en", "proofread reads the target language");
  assert.equal(proofread.outputLang, "en");
});

test("runtime: fallback slots only apply when the mode declares none", () => {
  const declared = resolveModeRuntime(makeMode({ slots: [BASE_SLOTS[1]] }), {
    sourceLang: "zh",
    targetLang: "en",
    fallbackSlots: BASE_SLOTS,
  });
  assert.deepEqual(declared.slots.map((s) => s.id), ["spoken"]);

  const empty = resolveModeRuntime(makeMode({ slots: [] }), {
    sourceLang: "zh",
    targetLang: "en",
    fallbackSlots: BASE_SLOTS,
  });
  assert.deepEqual(empty.slots.map((s) => s.id), ["source", "spoken", "written", "vocab"]);
});

test("runtime: primary slot honours primarySlotId then the first translation slot", () => {
  const rt = resolveModeRuntime(
    makeMode({ primarySlotId: "written", slots: BASE_SLOTS }),
    { sourceLang: "zh", targetLang: "en" }
  );
  assert.equal(primarySlot(rt)?.id, "written");

  const fallback = resolveModeRuntime(makeMode({ slots: BASE_SLOTS }), {
    sourceLang: "zh",
    targetLang: "en",
  });
  assert.equal(primarySlot(fallback)?.id, "spoken");
});

// ---------------------------------------------------------------------------
// 2. HUD variants must render differently (tree / preview / takeaway / none)
// ---------------------------------------------------------------------------
const RESULT: LingualResult = {
  sourceText: "这个方案过度设计了",
  spoken: "This is over-engineered.",
  spokenMeaning: "过度设计了",
  written: "The proposed approach introduces unnecessary complexity.",
  writtenMeaning: "引入不必要的复杂度",
  vocab: "over-engineered (过度设计) · stick with (沿用)",
  annotated: "",
};

function render(variant: "tree" | "preview" | "takeaway" | "none", isLong = false) {
  return renderCardLayout(RESULT, {} as any, {
    maxCols: 80,
    variant,
    isLong,
    slots: BASE_SLOTS as any,
  });
}

test("hud: tree renders source anchor plus every slot branch", () => {
  const lines = render("tree");
  assert.ok(lines.length >= 5);
  assert.ok(lines[0].includes("·"));
  assert.ok(lines.some((l) => l.includes("┌")));
  assert.ok(lines.some((l) => l.includes("└")));
});

test("hud: preview collapses to at most two glanceable lines and drops the source", () => {
  const lines = render("preview");
  assert.ok(lines.length <= 2, `preview must stay <= 2 lines, got ${lines.length}`);
  assert.ok(!lines[0].includes("这个方案过度设计了"));
  assert.ok(lines[0].includes("⚡"));
});

test("hud: takeaway keeps the full card on short input and diffs only on long input", () => {
  const short = render("takeaway", false);
  assert.ok(short.some((l) => l.includes("This is over-engineered.")));

  const long = render("takeaway", true);
  assert.ok(!long.some((l) => l.includes("This is over-engineered.")), "long input drops full sentences");
  assert.ok(long.some((l) => l.includes("over-engineered")), "long input keeps the diff rail");
});

test("hud: none renders zero pixels", () => {
  assert.deepEqual(render("none"), []);
});

// ---------------------------------------------------------------------------
// 3. Streaming parser: partial JSON must surface completed fields early
// ---------------------------------------------------------------------------
test("streaming: partial JSON fields are extracted before the object closes", () => {
  const partial = '{"spoken": "This is over-engineered; just use the stdlib.", "spoken_meaning": "过度设计';
  const fields = parsePartialJsonFields(partial);
  assert.equal(fields.spoken, "This is over-engineered; just use the stdlib.");
  assert.equal(fields.spoken_meaning, "过度设计");

  const escaped = parsePartialJsonFields('{"vocab": "line1\\nline2 \\"quoted\\""}');
  assert.equal(escaped.vocab, 'line1\nline2 "quoted"');

  assert.deepEqual(parsePartialJsonFields(""), {});
});

// ---------------------------------------------------------------------------
// 4. End-to-end: a user-defined pass-through mode renders its OWN slots
// ---------------------------------------------------------------------------
async function createHarness(modelText: string) {
  const listeners: Record<string, any[]> = {};
  const commands: Record<string, any> = {};
  const widgets: any[] = [];

  const mockPi: any = {
    on(event: string, handler: any) {
      (listeners[event] ||= []).push(handler);
    },
    registerCommand(name: string, def: any) {
      commands[name] = def;
    },
    registerShortcut() {},
    sendMessage() {},
    sendUserMessage() {},
  };

  const ctx: any = {
    hasUI: true,
    model: { id: "mock", provider: "mock" },
    modelRegistry: {
      getAvailable: () => [{ id: "mock", provider: "mock" }],
      streamSimple: () => ({
        result: async () => ({ content: [{ type: "text", text: modelText }] }),
      }),
    },
    ui: {
      notify: () => {},
      setStatus: () => {},
      setWidget: (_k: string, v: any) => widgets.push(v),
      theme: { fg: (_c: string, t: string) => t },
      custom: async () => null,
    },
    sessionManager: { getEntries: () => [] },
  };

  const { default: extensionFactory } = await import("../src/extension.js");
  extensionFactory(mockPi);
  for (const h of listeners["session_start"] || []) await h({ reason: "new" }, ctx);

  return { listeners, commands, ctx, widgets };
}

test("e2e: a custom pass-through mode renders its own slot anatomy", async () => {
  const modelText = JSON.stringify({
    hooky_slot: "Standard library first.",
    vocab: "stdlib (标准库)",
  });
  const { listeners, commands, ctx, widgets } = await createHarness(modelText);

  // Register a user mode with a pass-through dispatcher and a single custom slot.
  await commands["lingual"].handler("mode add hooky Hooky translate pass-through tree", ctx);
  await commands["lingual"].handler("hooky", ctx);

  widgets.length = 0;
  const res = await listeners["input"][0](
    { type: "input", text: "这个方案过度设计了，直接用标准库实现", source: "interactive" },
    ctx
  );
  assert.equal(res.action, "continue", "pass-through must never rewrite the prompt");

  await new Promise((r) => setTimeout(r, 250));

  const finalWidget = [...widgets].reverse().find((w) => Array.isArray(w) && w.length > 0);
  assert.ok(finalWidget, "the streaming card must render");
  const flat = finalWidget.join("\n");
  assert.ok(flat.includes("[Hooky]"), `expected the mode's own slot label, got:\n${flat}`);
  assert.ok(!flat.includes("[Spoken]"), "must not fall back to the global companion slots");
  assert.ok(!flat.includes("[Written]"), "must not fall back to the global companion slots");
});

test("e2e: companion mode paints the source anchor at 0ms, before the model answers", async () => {
  const modelText = JSON.stringify({
    spoken: "Use the standard library.",
    written: "Native standard library primitives are preferred.",
    vocab: "stdlib (标准库)",
  });
  const { listeners, ctx, widgets } = await createHarness(modelText);

  const t0 = Date.now();
  await listeners["input"][0](
    { type: "input", text: "这个方案过度设计了，直接用标准库实现", source: "interactive" },
    ctx
  );
  const elapsed = Date.now() - t0;

  const first = widgets.find((w) => Array.isArray(w) && w.length > 0);
  assert.ok(first, "an anchor frame must exist");
  assert.ok(first[0].includes("这个方案过度设计了"), "the first frame is the source line");
  assert.ok(elapsed < 100, `handler must stay non-blocking (took ${elapsed}ms)`);
});

// ---------------------------------------------------------------------------
// 5. Additional ModeRuntime wiring & completer resilience tests
// ---------------------------------------------------------------------------
test("pi-lingual/core exports resolveModeRuntime, parsePartialJsonFields, primarySlot, runtimeLanguagePair", async () => {
  const core = await import("../src/core/index.js");
  assert.equal(typeof core.resolveModeRuntime, "function");
  assert.equal(typeof core.parsePartialJsonFields, "function");
  assert.equal(typeof core.primarySlot, "function");
  assert.equal(typeof core.runtimeLanguagePair, "function");

  const root = await import("../src/index.js");
  assert.equal(typeof root.resolveModeRuntime, "function");
  assert.equal(typeof root.parsePartialJsonFields, "function");
  assert.equal(typeof root.primarySlot, "function");
  assert.equal(typeof root.runtimeLanguagePair, "function");
  assert.equal(typeof root.resolveTargetModel, "function");
  assert.equal(typeof root.getPiGlobalDefaultModel, "function");
});

test("executeModeRunner caches repeated calls via globalLingualCache and clears on globalLingualCache.clear()", async () => {
  globalLingualCache.clear();
  let calls = 0;
  const mockCompleter = async () => {
    calls++;
    return JSON.stringify({
      spoken: "Optimized prompt output.",
      spoken_meaning: "优化后的提示词",
      vocab: "optimize (优化)",
    });
  };

  const mode = makeMode({
    id: "test-cache-mode",
    slots: [
      { id: "spoken", label: "Spoken", role: "translation", enabled: true },
    ],
  });

  const res1 = await executeModeRunner("请重构这个模块", mode, {
    sourceLang: "zh",
    targetLang: "en",
    complete: mockCompleter,
  });
  assert.ok(res1);
  assert.equal(calls, 1);
  assert.equal(res1[0].content, "Optimized prompt output.");

  const res2 = await executeModeRunner("请重构这个模块", mode, {
    sourceLang: "zh",
    targetLang: "en",
    complete: mockCompleter,
  });
  assert.ok(res2);
  assert.equal(calls, 1, "Repeated call must hit cache without invoking completer");
  assert.equal(res2[0].content, "Optimized prompt output.");

  globalLingualCache.clear();
  const res3 = await executeModeRunner("请重构这个模块", mode, {
    sourceLang: "zh",
    targetLang: "en",
    complete: mockCompleter,
  });
  assert.ok(res3);
  assert.equal(calls, 2, "Call after globalLingualCache.clear() must invoke completer again");
  assert.equal(res3[0].content, "Optimized prompt output.");
});

test("transform mode preserves meaning sublines in the rendered tree HUD", () => {
  const result: LingualResult = {
    sourceText: "这个接口需要重构",
    spoken: "Refactor this API endpoint.",
    spokenMeaning: "重构这个接口端点",
    written: "Restructure this service interface for improved maintainability.",
    writtenMeaning: "重构服务接口以提升可维护性",
    vocab: "refactor (重构)",
    annotated: "",
    slots: [
      { id: "source", label: "Original", role: "source", content: "这个接口需要重构" },
      { id: "spoken", label: "Direct", role: "translation", content: "Refactor this API endpoint.", meaning: "重构这个接口端点" },
      { id: "vocab", label: "Vocab", role: "vocab", content: "refactor (重构)" },
    ],
    slotOutputs: {
      spoken: { content: "Refactor this API endpoint.", meaning: "重构这个接口端点" },
    },
  };

  const lines = renderCardLayout(result, {} as any, {
    maxCols: 80,
    variant: "tree",
    slots: [
      { id: "source", label: "Original", role: "source", enabled: true },
      { id: "spoken", label: "Direct", role: "translation", enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: true },
    ] as any,
  });

  const flat = lines.join("\n");
  assert.ok(flat.includes("↳"), "tree HUD must render nuance sublines via ↳");
  assert.ok(flat.includes("重构这个接口端点"), "tree HUD must contain the nuance meaning");
});

test("createModelCompleter with onDelta falls back to stream.result() when async iterator yields no text_delta", async () => {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      // Yield an event without text_delta
      yield { type: "start" };
    },
    result: async () => ({
      content: [{ type: "text", text: "Fallback from stream.result()" }],
    }),
  };

  const mockCtx: any = {
    model: { id: "mock-model", provider: "mock" },
    modelRegistry: {
      getAvailable: () => [{ id: "mock-model", provider: "mock" }],
      streamSimple: () => mockStream,
    },
  };

  let deltaReceived = "";
  const completer = createModelCompleter(mockCtx, () => "auto");
  const res = await completer("test text", "test sysprompt", undefined, {
    onDelta: (full) => {
      deltaReceived = full;
    },
  });

  assert.equal(res, "Fallback from stream.result()");
  assert.equal(deltaReceived, "Fallback from stream.result()");
});

test("/lingual copy and /lingual copy 2 copy the expected slot from active HUD card and notify user", async () => {
  const session = new LingualSessionController();
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

  const mode = makeMode({
    id: "companion",
    action: "pass-through",
    flow: "translate",
    hud: "tree",
  });

  const state: any = {
    mode: "companion",
    activeModeId: "companion",
    modes: [mode],
    sourceLang: "zh",
    targetLang: "en",
    labels: { hudTitle: "zh ⇄ en" },
    modeLocked: false,
  };

  const handlers = createCommandHandlers({
    state,
    session,
    updateFooter: () => {},
    refreshActiveView: () => {},
    renderActiveCard: () => {},
    renderHudWidget: () => {},
    activeRuntime: () => resolveModeRuntime(mode, { sourceLang: "zh", targetLang: "en" }),
    renderReleaseBanner: () => false,
    syncResizeListener: () => {},
    clearPendingTimers: () => {},
    armTuner: () => {},
    pi: { on: () => {}, registerCommand: () => {}, registerShortcut: () => {} } as any,
  });

  // 1. Without active card, /lingual copy must warn and return
  await handlers.masterCommandHandler("copy", mockCtx);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "warning");
  assert.ok(notifications[0].msg.includes("no active card to copy"));

  // 2. Set an active translation result
  const testCard: LingualResult = {
    sourceText: "优化登录鉴权逻辑",
    spoken: "Refactor login authentication logic.",
    written: "Streamline the authentication and authorization middleware.",
    vocab: "streamline (精简优化)",
    annotated: "",
    slots: [
      { id: "source", label: "Source", role: "source", content: "优化登录鉴权逻辑" },
      { id: "spoken", label: "Spoken", role: "translation", content: "Refactor login authentication logic." },
      { id: "written", label: "Written", role: "translation", content: "Streamline the authentication and authorization middleware." },
      { id: "vocab", label: "Vocab", role: "vocab", content: "streamline (精简优化)" },
    ],
  };
  session.setLastResult(testCard);
  notifications.length = 0;

  // 3. /lingual copy (no argument) defaults to primary slot (Spoken)
  await handlers.masterCommandHandler("copy", mockCtx);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "info");
  assert.ok(notifications[0].msg.includes("Copied [Spoken] to clipboard"));

  // 4. /lingual copy 2 copies slot 2 from non-source slots (Written)
  notifications.length = 0;
  await handlers.masterCommandHandler("copy 2", mockCtx);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "info");
  assert.ok(notifications[0].msg.includes("Copied [Written] to clipboard"));

  // 5. /lingual copy 3 copies slot 3 (Vocab)
  notifications.length = 0;
  await handlers.masterCommandHandler("copy 3", mockCtx);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "info");
  assert.ok(notifications[0].msg.includes("Copied [Vocab] to clipboard"));

  // 6. /lingual cp written and /lingual yank spoken alias routing
  notifications.length = 0;
  await handlers.masterCommandHandler("cp written", mockCtx);
  assert.equal(notifications.length, 1);
  assert.ok(notifications[0].msg.includes("Copied [Written] to clipboard"));

  notifications.length = 0;
  await handlers.masterCommandHandler("yank spoken", mockCtx);
  assert.equal(notifications.length, 1);
  assert.ok(notifications[0].msg.includes("Copied [Spoken] to clipboard"));
});

test("extension registers alt+c shortcut which invokes copyLastHandler when mode is not off", async () => {
  const registeredShortcuts: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand() {},
    registerShortcut(key: string, def: any) {
      registeredShortcuts[key] = def;
    },
  };

  extensionFactory(mockPi);
  assert.ok(registeredShortcuts["alt+c"], "alt+c shortcut must be registered");
});

test("ensureCodeTokensPreserved keeps output untouched when present, and appends missing tokens", () => {
  // 1. No backticked tokens in source
  assert.equal(
    ensureCodeTokensPreserved("Please fix the login flow", "Fix the login process."),
    "Fix the login process."
  );

  // 2. Backticked tokens already present in rewritten text (backticked or bare)
  const source1 = "Please check the `--verbose` flag and `apiEndpoint` path";
  const rewritten1 = "Check the `--verbose` flag and apiEndpoint path.";
  assert.equal(ensureCodeTokensPreserved(source1, rewritten1), rewritten1);

  // 3. Backticked token dropped in rewritten text
  const source2 = "Run with `--dry-run` and `--json` format";
  const rewritten2 = "Execute dry run with structured output.";
  const result2 = ensureCodeTokensPreserved(source2, rewritten2);
  assert.equal(result2, "Execute dry run with structured output. (`--dry-run`, `--json`)");

  // 4. Deduplicate multiple identical dropped tokens
  const source3 = "Verify `userId` then validate `userId` again";
  const rewritten3 = "Verify the user identifier.";
  const result3 = ensureCodeTokensPreserved(source3, rewritten3);
  assert.equal(result3, "Verify the user identifier. (`userId`)");

  // 5. Short tokens (<2 chars) are excluded by length constraint
  const source4 = "Check `a` and `validToken`";
  const rewritten4 = "Inspect parameters.";
  const result4 = ensureCodeTokensPreserved(source4, rewritten4);
  assert.equal(result4, "Inspect parameters. (`validToken`)");

  // 6. Empty / null protection
  assert.equal(ensureCodeTokensPreserved("", "Untouched"), "Untouched");
  assert.equal(ensureCodeTokensPreserved("`token`", ""), "");
});

// ---------------------------------------------------------------------------
// 6. Global Pi Default Model Resolution (resolveTargetModel)
// ---------------------------------------------------------------------------

test("resolveTargetModel: auto adopts user's global defaultModel from Pi settings even when conversation switches to heavy brain", () => {
  const defaultFlashModel = { provider: "magpie", id: "antigravity/gemini-3.8-flash" };
  const heavyArgonModel = { provider: "magpie", id: "ai-studio/gemini-4-argon" };
  const opusModel = { provider: "anthropic", id: "claude-3-opus" };

  const ctx: any = {
    model: heavyArgonModel, // Conversation currently switched to heavy brain
    modelRegistry: {
      getAvailable: () => [opusModel, defaultFlashModel, heavyArgonModel],
    },
  };

  const resolved = resolveTargetModel(ctx, "auto");
  // User's Pi settings.json has defaultModel: "antigravity/gemini-3.8-flash"
  assert.equal(resolved?.id, defaultFlashModel.id, "Must keep user's configured defaultModel instead of heavy conversation brain");
});

test("resolveTargetModel: explicit session selection follows conversation model", () => {
  const heavyModel = { provider: "magpie", id: "ai-studio/gemini-4-argon" };
  const flashModel = { provider: "magpie", id: "antigravity/gemini-3.8-flash" };

  const ctx: any = {
    model: heavyModel,
    modelRegistry: {
      getAvailable: () => [flashModel, heavyModel],
    },
  };

  const resolved = resolveTargetModel(ctx, "session");
  assert.equal(resolved, heavyModel, "Must follow session brain when selectedModel is session");
});

test("resolveTargetModel: user-pinned model matches available model", () => {
  const heavyModel = { provider: "magpie", id: "ai-studio/gemini-4-argon" };
  const flashModel = { provider: "magpie", id: "antigravity/gemini-3.8-flash" };

  const ctx: any = {
    model: heavyModel,
    modelRegistry: {
      getAvailable: () => [heavyModel, flashModel],
    },
  };

  const resolved = resolveTargetModel(ctx, "antigravity/gemini-3.8-flash");
  assert.equal(resolved, flashModel, "Must pin to explicit user model");
});

test("setModelHandler and showStatusHandler format defaultModel display", async () => {
  const session = new LingualSessionController();
  const notifications: { msg: string; type: string }[] = [];
  const argonModel = { provider: "magpie", id: "ai-studio/gemini-4-argon" };
  const flashModel = { provider: "magpie", id: "antigravity/gemini-3.8-flash" };

  const mockCtx: any = {
    hasUI: true,
    model: argonModel,
    modelRegistry: {
      getAvailable: () => [flashModel, argonModel],
    },
    ui: {
      notify(msg: string, type = "info") {
        notifications.push({ msg, type });
      },
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  const mode = makeMode({ id: "companion" });
  const state: any = {
    mode: "companion",
    activeModeId: "companion",
    modes: [mode],
    sourceLang: "zh",
    targetLang: "en",
    labels: { hudTitle: "zh ⇄ en", modelFollowSession: "follow session" },
    selectedModel: "auto",
  };

  const handlers = createCommandHandlers({
    state,
    session,
    updateFooter: () => {},
    refreshActiveView: () => {},
    renderActiveCard: () => {},
    renderHudWidget: () => {},
    activeRuntime: () => resolveModeRuntime(mode, { sourceLang: "zh", targetLang: "en" }),
    renderReleaseBanner: () => false,
    syncResizeListener: () => {},
    clearPendingTimers: () => {},
    armTuner: () => {},
    pi: { on: () => {}, registerCommand: () => {}, registerShortcut: () => {} } as any,
  });

  // 1. In auto mode with argon session and flash default
  notifications.length = 0;
  await handlers.setModelHandler("", mockCtx);
  assert.ok(notifications[0].msg.includes("defaultModel: magpie/antigravity/gemini-3.8-flash"));

  // 2. In session mode
  state.selectedModel = "session";
  notifications.length = 0;
  await handlers.setModelHandler("", mockCtx);
  assert.ok(notifications[0].msg.includes("session (follow session: magpie/ai-studio/gemini-4-argon)"));

  // 3. User select picker interaction
  let selectOffered = false;
  mockCtx.ui.select = async (_title: string, options: string[]) => {
    selectOffered = true;
    assert.ok(options.includes("auto - Default Pi Model (Recommended)"));
    assert.ok(options.includes("magpie/antigravity/gemini-3.8-flash"));
    return "session - Follow active conversation model";
  };
  notifications.length = 0;
  await handlers.setModelHandler("", mockCtx);
  assert.ok(selectOffered);
  assert.equal(state.selectedModel, "session");
});

test("regression: long input 1:1 condensation directive, summary streaming, and sentence-boundary clamping", () => {
  // 1. Verify 1:1 intent condensation directive in system prompt
  const prompt = buildSystemPrompt("zh", "en", true);
  assert.ok(prompt.includes("1:1 INTENT ALIGNMENT"), "Prompt must include 1:1 intent alignment directive");
  assert.ok(prompt.includes("<= 28 words"), "Prompt must specify <= 28 words limit per slot");
  assert.ok(!prompt.includes("translate EVERY clause and question from start to finish"), "Prompt must not contain obsolete contradictory directive");

  // 2. Verify summary is immediately used as sourceText in buildStreamingResult
  const streamed = buildStreamingResult(
    {
      summary: "质疑默认跟随当前对话模型的设计",
      spoken: "Does pi-lingual default to the active chat model?",
    },
    "长原文..."
  );
  assert.equal(streamed.sourceText, "质疑默认跟随当前对话模型的设计", "Streaming result must immediately adopt summary as sourceText");
  assert.equal(streamed.summary, "质疑默认跟随当前对话模型的设计");
  assert.equal(streamed.spoken, "Does pi-lingual default to the active chat model?");

  // 3. Verify renderCardLayout snaps to complete sentence boundary or clean word boundary without producing I'd'...
  const longCard: LingualResult = {
    sourceText: "在面对超长复杂的多句输入时，伴学卡片应当在预算内优雅呈现，避免生硬截断。",
    spoken: "I'd love to examine this implementation thoroughly. Let's ensure that complete sentences are preserved whenever possible. We should also verify that trailing characters do not leave broken contractions.",
    written: "I'd like to inspect the boundary handling mechanism across multiple viewports. It is essential to guarantee clean sentence termination without awkward ellipses.",
    vocab: "boundary (边界) · awkward (尴尬的)",
    annotated: "",
  };

  const labels = resolveLabelsForLang("zh");
  const lines = renderCardLayout(longCard, labels, {
    maxCols: 55,
    maxLines: 9,
    variant: "tree",
    isLong: true,
  });

  assert.ok(lines.length <= 9, `Rendered card must be <= 9 lines (got ${lines.length})`);
  const fullOutput = lines.join("\n");
  assert.ok(!fullOutput.includes("I'd'..."), `Rendered card must not produce "I'd'..." (got: ${fullOutput})`);

  // Verify that multi-sentence slot snaps to a complete sentence boundary or clean word boundary without dangling punctuation before ...
  for (const line of lines) {
    assert.ok(!/[,'"—\-:;]+\.\.\./.test(line), `Line must not contain dangling punctuation before ellipsis: got "${line}"`);
  }

  // Also verify a single-sentence clamping fallback where the line would end with I'd near the column limit
  const singleSentenceCard: LingualResult = {
    sourceText: "测试单句截断行为",
    spoken: "We evaluated all the performance trade-offs in depth and concluded that I'd've preferred a much lighter alternative.",
    written: "We conducted a comprehensive analysis and determined that a lighter solution is preferable.",
    annotated: "",
  };
  const clampedSingle = renderCardLayout(singleSentenceCard, labels, {
    maxCols: 40,
    maxLines: 5,
    variant: "tree",
  });
  const clampedText = clampedSingle.join("\n");
  assert.ok(!clampedText.includes("I'd'..."), `Clamped single sentence must never produce "I'd'...": got "${clampedText}"`);
});


