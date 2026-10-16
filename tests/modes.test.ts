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
  defaultSlotsForMode,
  resolveSeedNames,
  resolveModeDisplayName,
  SEED_NAMES,
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

test("modes: getDefaultFactoryModes returns three-core golden defaults with zero hardcoded assumptions (D1)", () => {
  const modes = getDefaultFactoryModes("en", "ja");
  assert.equal(modes.length, 3, "Default factory modes must have exactly 3 three-core modes");

  const companion = modes[0];
  assert.equal(companion.id, "companion");
  assert.equal(companion.flow, "translate");
  assert.equal(companion.action, "pass-through");
  assert.equal(companion.hud, "tree");
  assert.deepEqual(companion.slots.map((s) => s.id), ["source", "spoken", "written", "vocab"]);

  const direct = modes[1];
  assert.equal(direct.id, "direct");
  assert.equal(direct.flow, "translate");
  assert.equal(direct.action, "transform");
  assert.equal(direct.hud, "preview");
  assert.ok(direct.slots.some((s) => (s.instruction || "").includes("${targetLang}")));

  const liveFlow = modes[2];
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
  assert.equal(withTweet.length, 4);
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
  assert.equal(removed.length, 3);
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

test("modes: defaultSlotsForMode produces identical slots across helper, resolveModesFromConfig, and compileModeSystemPrompt (C5)", () => {
  for (const flow of ["translate", "proofread", "custom"] as const) {
    for (const action of ["transform", "pass-through"] as const) {
      const mode = { id: `test-${flow}-${action}`, name: "Test Mode", flow, action, hud: "preview" as const, slots: [] };
      const helperSlots = defaultSlotsForMode(mode, "zh", "zh");
      const resolvedModes = resolveModesFromConfig({ sourceLang: "zh", explainLang: "zh", modes: [mode] as any });
      const resolvedSlots = resolvedModes[0].slots;

      assert.deepEqual(
        resolvedSlots.map((s) => s.id),
        helperSlots.map((s) => s.id),
        `Slots for flow=${flow}, action=${action} must match between helper and resolveModesFromConfig`
      );

      // Verify compileModeSystemPrompt outputs schema for the exact slot IDs
      const prompt = compileModeSystemPrompt(mode, { sourceLang: "zh", targetLang: "en", explainLang: "zh" });
      for (const slot of helperSlots) {
        assert.ok(
          prompt.includes(`"${slot.id}"`),
          `Compiled prompt for flow=${flow}, action=${action} must include slot ${slot.id}`
        );
      }
    }
  }
});

test("modes: resolveSeedNames adheres 1:1 to 9-language matrix across all keys (A1)", () => {
  const EXPECTED_MATRIX: Record<string, Record<string, string>> = {
    en: {
      companion: "Companion",
      direct: "Logical Spec",
      liveFlow: "Live Flow",
      candidates: "Candidates",
      loadoutSpec: "Brain-Dump Spec",
      loadoutCommit: "Commit Dehydrator",
      loadoutOss: "OSS Peer Comms",
      loadoutYap: "Indie Shipper",
      vocab: "Key Terms",
      fixed: "Fixed",
      native: "Native",
      takeaway: "Takeaways",
    },
    zh: {
      companion: "纯伴学",
      direct: "规范直发",
      liveFlow: "实战狂飙",
      candidates: "挑候选",
      loadoutSpec: "脑暴压铸",
      loadoutCommit: "提交脱水",
      loadoutOss: "开源对线",
      loadoutYap: "极客发推",
      vocab: "核心表达",
      fixed: "原句修补",
      native: "地道表达",
      takeaway: "收获复盘",
    },
    tw: {
      companion: "純伴學",
      direct: "規範直發",
      liveFlow: "實戰狂飆",
      candidates: "挑候選",
      loadoutSpec: "腦暴壓鑄",
      loadoutCommit: "提交脫水",
      loadoutOss: "開源對線",
      loadoutYap: "極客發推",
      vocab: "核心表達",
      fixed: "原句修補",
      native: "道地表達",
      takeaway: "收穫複盤",
    },
    ja: {
      companion: "伴走",
      direct: "仕様直行",
      liveFlow: "実戦疾走",
      candidates: "候補選択",
      loadoutSpec: "仕様鋳造",
      loadoutCommit: "コミット脱水",
      loadoutOss: "OSS対話",
      loadoutYap: "発信投稿",
      vocab: "重要語彙",
      fixed: "原文修正",
      native: "自然表現",
      takeaway: "重要ポイント",
    },
    ko: {
      companion: "동행학습",
      direct: "논리정제",
      liveFlow: "실전질주",
      candidates: "후보선택",
      loadoutSpec: "사양주조",
      loadoutCommit: "커밋정제",
      loadoutOss: "OSS대화",
      loadoutYap: "개발자발신",
      vocab: "핵심어휘",
      fixed: "원문수정",
      native: "자연스러운표현",
      takeaway: "핵심포인트",
    },
    es: {
      companion: "Aprendizaje",
      direct: "Directo Lógico",
      liveFlow: "Live Flow",
      candidates: "Candidatos",
      loadoutSpec: "Spec Lógica",
      loadoutCommit: "Commit Dehidrado",
      loadoutOss: "OSS Comms",
      loadoutYap: "Post Indie",
      vocab: "Términos clave",
      fixed: "Corregido",
      native: "Nativo",
      takeaway: "Puntos clave",
    },
    fr: {
      companion: "Compagnon",
      direct: "Direct Logique",
      liveFlow: "Live Flow",
      candidates: "Candidats",
      loadoutSpec: "Spécification",
      loadoutCommit: "Commit Épuré",
      loadoutOss: "Comms OSS",
      loadoutYap: "Post Indie",
      vocab: "Termes clés",
      fixed: "Corrigé",
      native: "Naturel",
      takeaway: "Points clés",
    },
    de: {
      companion: "Begleitung",
      direct: "Direkte Logik",
      liveFlow: "Live Flow",
      candidates: "Kandidaten",
      loadoutSpec: "Spezifikation",
      loadoutCommit: "Commit-Kompakt",
      loadoutOss: "OSS-Dialog",
      loadoutYap: "Indie-Post",
      vocab: "Schlüsselbegriffe",
      fixed: "Korrigiert",
      native: "Nativ",
      takeaway: "Wichtige Punkte",
    },
    ru: {
      companion: "Сопровождение",
      direct: "Прямой поток",
      liveFlow: "Live Flow",
      candidates: "Кандидаты",
      loadoutSpec: "Спецификация",
      loadoutCommit: "Коммит-дехидрат",
      loadoutOss: "OSS-диалог",
      loadoutYap: "Инди-пост",
      vocab: "Ключевые слова",
      fixed: "Исправлено",
      native: "Нативный",
      takeaway: "Главное",
    },
  };

  for (const [lang, expected] of Object.entries(EXPECTED_MATRIX)) {
    const actual = resolveSeedNames(lang);
    for (const [key, expectedVal] of Object.entries(expected)) {
      assert.equal(
        (actual as any)[key],
        expectedVal,
        `[${lang}] "${key}" must equal "${expectedVal}", got: "${(actual as any)[key]}"`
      );
    }
  }
});

test("modes: non-English SEED_NAMES never accidentally fall back to English values (A1 anti-drift)", () => {
  // Explicit whitelist: languages where liveFlow intentionally adopts the global "Live Flow" branding
  const LIVE_FLOW_WHITELIST = new Set(["tw", "es", "fr", "de", "ru"]);

  for (const [lang, keys] of Object.entries(SEED_NAMES)) {
    if (lang === "en") continue;
    for (const [key, val] of Object.entries(keys)) {
      if (key === "liveFlow" && LIVE_FLOW_WHITELIST.has(lang)) {
        continue;
      }
      const enVal = (SEED_NAMES.en as any)[key];
      assert.notEqual(
        val,
        enVal,
        `[${lang}] "${key}" must not equal English value "${enVal}", got: "${val}"`
      );
    }
  }
});

test("modes: resolveModeDisplayName ensures structural consistency across badge, toast, and custom registry (A4)", async () => {
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
  let statusBadge: any = null;
  const mockCtx: any = {
    hasUI: true,
    model: { provider: "mock", id: "mock-model" },
    ui: {
      notify(msg: string) {
        notifications.push(msg);
      },
      setStatus(_k: string, v: any) {
        statusBadge = v;
      },
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // Switch to zh
  await registeredCommands["lingual"].handler("lang zh en", mockCtx);

  // Test resolveModeDisplayName directly for all canonical modes
  assert.equal(resolveModeDisplayName("companion", "zh"), "纯伴学");
  assert.equal(resolveModeDisplayName("direct", "zh"), "规范直发");
  assert.equal(resolveModeDisplayName("live-flow", "zh"), "实战狂飙");
  assert.equal(resolveModeDisplayName("candidates", "zh"), "挑候选");
  assert.equal(resolveModeDisplayName("companion", "ja"), "伴走");
  assert.equal(resolveModeDisplayName("direct", "ja"), "仕様直行");

  // In factory registry: switch to direct
  notifications.length = 0;
  await registeredCommands["lingual"].handler("direct", mockCtx);
  const toast = notifications[notifications.length - 1];
  assert.ok(toast.includes("规范直发"), `Toast must contain 规范直发: ${toast}`);
  assert.ok(String(statusBadge).includes("规范直发"), `Badge must contain 规范直发: ${statusBadge}`);

  // Teardown back to 1
  await registeredCommands["lingual"].handler("1", mockCtx);
});
