import test from "node:test";
import assert from "node:assert/strict";
import {
  interpolatePromptVariables,
  resolveLanguageName,
  getDefaultFactoryModes,
  addCustomMode,
  removeCustomMode,
  updateCustomMode,
  toggleCustomMode,
  addSlotToMode,
  removeSlotFromMode,
  resolveModesFromConfig,
  normalizeActiveModeId,
  compileModeSystemPrompt,
  executeModeRunner,
  DEFAULT_KILL_LIST,
  compileKillListInstruction,
  PRESET_LOADOUTS,
  getPresetLoadout,
  listPresetLoadouts,
} from "../src/index.js";
import type { CustomModeConfig } from "../src/types.js";
import extensionFactory from "../src/extension.js";

test("modes: interpolatePromptVariables expands semantic language variables dynamically", () => {
  assert.equal(resolveLanguageName("en"), "English");
  assert.equal(resolveLanguageName("zh"), "Chinese (Simplified)");
  assert.equal(resolveLanguageName("ja"), "Japanese");
  assert.equal(resolveLanguageName("fr"), "French");

  const template = "Translate from ${sourceLang} into ${targetLang}. Takeaways in ${explainLang}.";
  
  // English developer learning Japanese
  const enToJa = interpolatePromptVariables(template, {
    sourceLang: "en",
    targetLang: "ja",
    explainLang: "en",
  });
  assert.equal(enToJa, "Translate from English into Japanese. Takeaways in English.");

  // French developer writing English
  const frToEn = interpolatePromptVariables(template, {
    sourceLang: "fr",
    targetLang: "en",
    explainLang: "fr",
  });
  assert.equal(frToEn, "Translate from French into English. Takeaways in French.");

  // Chinese developer writing English with Chinese takeaways
  const zhToEn = interpolatePromptVariables(template, {
    sourceLang: "zh",
    targetLang: "en",
    explainLang: "zh",
  });
  assert.equal(zhToEn, "Translate from Chinese (Simplified) into English. Takeaways in Chinese (Simplified).");
});

test("modes: getDefaultFactoryModes returns dual-core golden defaults with zero hardcoded assumptions", () => {
  const modes = getDefaultFactoryModes("en", "ja");
  assert.equal(modes.length, 2, "Default factory modes must have exactly 2 dual-core modes");

  const direct = modes[0];
  assert.equal(direct.id, "direct");
  assert.equal(direct.flow, "translate");
  assert.equal(direct.action, "transform");
  assert.equal(direct.hud, "preview");
  assert.ok(direct.slots.some((s) => (s.instruction || "").includes("${targetLang}")));

  const liveFlow = modes[1];
  assert.equal(liveFlow.id, "live-flow");
  assert.equal(liveFlow.flow, "proofread");
  assert.equal(liveFlow.action, "transform");
  assert.equal(liveFlow.hud, "adaptive-takeaway");
  assert.ok(liveFlow.slots.some((s) => (s.instruction || "").includes("${explainLang}")));
});

test("modes: programmatic CRUD API manages custom modes and slots with pure immutability", () => {
  const initial = getDefaultFactoryModes("en");

  // 1. Add custom mode
  const tweetMode: CustomModeConfig = {
    id: "tweet",
    name: "Tweet Hook",
    flow: "translate",
    action: "transform",
    hud: "tree",
    slots: [
      {
        id: "hook",
        label: "Hook",
        role: "rewrite",
        instruction: "Viral tech tweet hook under 280 chars",
        enabled: true,
      },
    ],
    enabled: true,
  };
  const withTweet = addCustomMode(initial, tweetMode);
  assert.equal(withTweet.length, 3);
  assert.ok(withTweet.some((m) => m.id === "tweet"));

  // 2. Add slot to mode
  const withInsightSlot = addSlotToMode(withTweet, "tweet", {
    id: "insight",
    label: "Deep",
    role: "rewrite",
    instruction: "Deep engineering insight",
    enabled: true,
  });
  const foundTweet = withInsightSlot.find((m) => m.id === "tweet");
  assert.equal(foundTweet?.slots.length, 2);
  assert.ok(foundTweet?.slots.some((s) => s.id === "insight"));

  // 3. Remove slot from mode
  const afterRemoveSlot = removeSlotFromMode(withInsightSlot, "tweet", "insight");
  const tweetAfterRemove = afterRemoveSlot.find((m) => m.id === "tweet");
  assert.equal(tweetAfterRemove?.slots.length, 1);
  assert.ok(!tweetAfterRemove?.slots.some((s) => s.id === "insight"));

  // 4. Toggle mode enabled
  const toggled = toggleCustomMode(afterRemoveSlot, "tweet");
  assert.equal(toggled.find((m) => m.id === "tweet")?.enabled, false);

  // 5. Update mode
  const updated = updateCustomMode(toggled, "tweet", { name: "X Viral Post" });
  assert.equal(updated.find((m) => m.id === "tweet")?.name, "X Viral Post");

  // 6. Remove mode
  const removed = removeCustomMode(updated, "tweet");
  assert.equal(removed.length, 2);
  assert.ok(!removed.some((m) => m.id === "tweet"));
});

test("modes: backward compatibility bridge seamlessly maps legacy slots to virtual modes in-memory", () => {
  const legacyConfig = {
    sourceLang: "zh",
    targetLang: "en",
    explainLang: "zh",
    slots: [
      { id: "spoken", label: "口语", role: "translation" as const, enabled: true },
      { id: "written", label: "写作", role: "translation" as const, enabled: true },
    ],
    directSlots: [
      { id: "en_direct", label: "规范直发", role: "rewrite" as const, instruction: "Direct rewrite", enabled: true },
    ],
  };

  const virtualModes = resolveModesFromConfig(legacyConfig);
  assert.equal(virtualModes.length, 4, "Legacy config must map into 4 virtual modes in-memory");
  assert.ok(virtualModes.some((m) => m.id === "direct"));
  assert.ok(virtualModes.some((m) => m.id === "companion"));
  assert.ok(virtualModes.some((m) => m.id === "candidates"));
  assert.ok(virtualModes.some((m) => m.id === "live-flow"));

  // Mode ID normalization
  assert.equal(normalizeActiveModeId({ mode: "english" }, virtualModes), "direct");
  assert.equal(normalizeActiveModeId({ mode: "original" }, virtualModes), "companion");
  assert.equal(normalizeActiveModeId({ mode: "select" }, virtualModes), "candidates");
  assert.equal(normalizeActiveModeId({ mode: "modify" }, virtualModes), "live-flow");
  assert.equal(normalizeActiveModeId({ mode: "off" }, virtualModes), "off");
});

test("modes: compileModeSystemPrompt and executeModeRunner run custom declarative modes", async () => {
  const customMode: CustomModeConfig = {
    id: "rfc",
    name: "RFC Spec",
    flow: "translate",
    action: "transform",
    hud: "preview",
    slots: [
      {
        id: "rfc_spec",
        label: "RFC Spec",
        role: "rewrite",
        instruction: "Output technical RFC in ${targetLang} from ${sourceLang}",
        enabled: true,
      },
    ],
    enabled: true,
  };

  const sysPrompt = compileModeSystemPrompt(customMode, {
    sourceLang: "zh",
    targetLang: "en",
  });
  assert.ok(sysPrompt.includes('"rfc_spec"'));
  assert.ok(sysPrompt.includes("English"));
  assert.ok(sysPrompt.includes("Chinese (Simplified)"));

  // Execute runner with mock completer
  const candidates = await executeModeRunner("给数据库增加一个乐观锁版本字段", customMode, {
    sourceLang: "zh",
    targetLang: "en",
    complete: async (_text, prompt) => {
      assert.ok(prompt.includes('"rfc_spec"'));
      return JSON.stringify({
        rfc_spec: "Add optimistic concurrency control version column to database schema",
      });
    },
  });

  assert.ok(candidates && candidates.length === 1);
  assert.equal(candidates[0].id, "rfc_spec");
  assert.equal(candidates[0].content, "Add optimistic concurrency control version column to database schema");
});

test("modes: extension CLI /lingual mode [list|add|rm|toggle|reset] routes and manages modes", async () => {
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
    hasUI: true,
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. List modes
  await registeredCommands["lingual"].handler("mode list", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Modes Registry"));
  assert.ok(notifications[notifications.length - 1].includes("direct"));

  // 2. Add custom mode via CLI
  await registeredCommands["lingual"].handler("mode add review CodeReview translate transform preview", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes('Added custom mode [review] "CodeReview"'));

  // 3. Toggle custom mode
  await registeredCommands["lingual"].handler("mode toggle review", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("[review] is now disabled"));

  // 4. Remove custom mode
  await registeredCommands["lingual"].handler("mode rm review", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Removed custom mode [review]"));

  // 5. Reset to defaults
  await registeredCommands["lingual"].handler("mode reset", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Reset modes registry to factory golden defaults"));
});

test("modes: DEFAULT_KILL_LIST and compileKillListInstruction inject anti-AI buzzword constraints", () => {
  assert.ok(DEFAULT_KILL_LIST.includes("delve"));
  assert.ok(DEFAULT_KILL_LIST.includes("tapestry"));
  assert.ok(DEFAULT_KILL_LIST.includes("seamless"));
  assert.ok(DEFAULT_KILL_LIST.includes("robust"));

  const killInstruction = compileKillListInstruction(["game-changer", "unleash"]);
  assert.ok(killInstruction.includes("KILL LIST"));
  assert.ok(killInstruction.includes('"game-changer"'));
  assert.ok(killInstruction.includes('"unleash"'));

  // Verify injection into compileModeSystemPrompt
  const customModeWithKillList: CustomModeConfig = {
    id: "commit",
    name: "Commit Dehydrator",
    flow: "translate",
    action: "transform",
    hud: "preview",
    target: "clipboard",
    killList: ["enhance", "robust", "seamless"],
    slots: [
      {
        id: "commit",
        label: "Commit",
        role: "rewrite",
        instruction: "Generate conventional commit",
        enabled: true,
      },
    ],
    enabled: true,
  };

  const sysPrompt = compileModeSystemPrompt(customModeWithKillList, {
    sourceLang: "zh",
    targetLang: "en",
  });
  assert.ok(sysPrompt.includes("KILL LIST"));
  assert.ok(sysPrompt.includes('"enhance"'));
  assert.ok(sysPrompt.includes('"robust"'));
  assert.ok(sysPrompt.includes('"seamless"'));
});

test("modes: PRESET_LOADOUTS contains tactical loadouts (spec, commit, oss, yap)", () => {
  const loadouts = listPresetLoadouts();
  assert.equal(loadouts.length, 4);

  const ids = loadouts.map((l) => l.id);
  assert.ok(ids.includes("spec"), "Must include brain-dump spec loadout");
  assert.ok(ids.includes("commit"), "Must include commit dehydrator loadout");
  assert.ok(ids.includes("oss"), "Must include OSS peer comms loadout");
  assert.ok(ids.includes("yap"), "Must include indie shipper loadout");

  const specLoadout = getPresetLoadout("spec", "zh", "zh");
  assert.ok(specLoadout);
  assert.equal(specLoadout.target, "agent");
  assert.equal(specLoadout.flow, "translate");

  const commitLoadout = getPresetLoadout("commit", "zh", "zh");
  assert.ok(commitLoadout);
  assert.equal(commitLoadout.target, "clipboard");
  assert.ok(commitLoadout.killList?.includes("robust"));

  const yapLoadout = getPresetLoadout("yap", "zh", "zh");
  assert.ok(yapLoadout);
  assert.equal(yapLoadout.target, "clipboard");
  assert.ok(yapLoadout.killList?.includes("🚀"));

  // Alias support for lazy and raw
  const virtualModes = resolveModesFromConfig({});
  assert.equal(normalizeActiveModeId({ mode: "lazy" }, virtualModes), "direct");
  assert.equal(normalizeActiveModeId({ mode: "raw" }, virtualModes), "live-flow");
});

test("modes: extension CLI /lingual loadout [list | apply <id>] and target: clipboard execution", async () => {
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

  const notifications: string[] = [];
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
                commit: "fix(auth): clear expired local storage token on redirect",
                vocab: "prevent loop ➔ guard against stale token loop",
              }),
            },
          ],
        }),
      }),
    },
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // 1. List tactical loadouts via CLI
  await registeredCommands["lingual"].handler("loadout list", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Tactical Loadouts"));
  assert.ok(notifications[notifications.length - 1].includes("commit"));

  // 2. Apply tactical loadout "commit" (target: clipboard)
  await registeredCommands["lingual"].handler("loadout apply commit", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Applied tactical loadout [commit]"));

  // 3. Switch to mode "commit"
  await registeredCommands["lingual"].handler("commit", mockCtx);

  // 4. Input text in a mode with target: "clipboard"
  const res = await inputHandler(
    { type: "input", text: "修好了登录过期时跳转死循环的问题", source: "interactive" },
    mockCtx
  );

  // When target is clipboard: returns action: "handled" (intercepts prompt so agent is not dispatched)
  assert.equal(res.action, "handled", "Clipboard mode must return action: handled to prevent agent dispatch");
  assert.ok(
    notifications.some((n) => n.includes("Copied to clipboard")),
    "Must notify user that transformed text was copied to clipboard"
  );
});

test("modes: reasoning effort level defaults and /lingual reasoning CLI command", async () => {
  // 1. Verify default factory modes default to reasoning: "low"
  const factoryModes = getDefaultFactoryModes("en");
  assert.equal(factoryModes.find((m) => m.id === "direct")?.reasoning, "low");
  assert.equal(factoryModes.find((m) => m.id === "live-flow")?.reasoning, "low");

  // 2. Verify loadout reasoning defaults
  const specLoadout = getPresetLoadout("spec", "en");
  assert.equal(specLoadout?.reasoning, "medium", "spec loadout must default to medium reasoning");
  const commitLoadout = getPresetLoadout("commit", "en");
  assert.equal(commitLoadout?.reasoning, "low", "commit loadout must default to low reasoning");

  // 3. Test /lingual reasoning CLI handler
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
    hasUI: true,
    model: { provider: "mock", id: "mock-model" },
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // Inspect current reasoning level
  await registeredCommands["lingual"].handler("reasoning", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Reasoning effort"));

  // Switch reasoning to medium
  await registeredCommands["lingual"].handler("reasoning medium", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes('set to "medium"'));

  // Invalid reasoning level error handling
  await registeredCommands["lingual"].handler("reasoning ultra", mockCtx);
  assert.ok(notifications[notifications.length - 1].includes("Invalid reasoning effort"));
});
