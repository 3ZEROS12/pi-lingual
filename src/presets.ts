import type { CustomModeConfig, LingualI18nLabels, SlotConfig, PromptSlotConfig, ReasoningEffort } from "./types.js";
export type { ReasoningEffort } from "./types.js";

export interface SlotPresetDefinition {
  name: string;
  description: string;
  slots: (sourceLang?: string) => SlotConfig[];
}

export { getDefaultSlots, getDefaultDirectSlots, getDefaultModifySlots } from "./prompts.js";
import { getDefaultDirectSlots, getDefaultModifySlots, getDefaultSlots } from "./prompts.js";

/**
 * Returns dual-core factory golden defaults (v0.6.0+ Dual-Core Baselines: 1. Logical Spec + 2. Live Flow).
 */
export function getDefaultFactoryModes(sourceLang = "en", explainLang?: string): CustomModeConfig[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const SEED_NAMES: Record<
    string,
    { direct: string; liveFlow: string; vocab: string; fixed: string; native: string; takeaway: string }
  > = {
    en: { direct: "Logical Spec", liveFlow: "Live Flow", vocab: "Key Terms", fixed: "Fixed", native: "Native", takeaway: "Takeaways" },
    zh: { direct: "规范直发", liveFlow: "实战狂飙", vocab: "核心表达", fixed: "原句修补", native: "地道表达", takeaway: "收获复盘" },
    tw: { direct: "規範直發", liveFlow: "實戰狂飆", vocab: "核心表達", fixed: "原句修補", native: "道地表達", takeaway: "收穫複盤" },
    ja: { direct: "仕様直行", liveFlow: "実戦疾走", vocab: "重要語彙", fixed: "原文修正", native: "自然表現", takeaway: "重要ポイント" },
    ko: { direct: "논리정제", liveFlow: "실전질주", vocab: "핵심어휘", fixed: "원문수정", native: "자연스러운표현", takeaway: "핵심포인트" },
    es: { direct: "Directo Lógico", liveFlow: "Live Flow", vocab: "Términos clave", fixed: "Corregido", native: "Nativo", takeaway: "Puntos clave" },
    fr: { direct: "Direct Logique", liveFlow: "Live Flow", vocab: "Termes clés", fixed: "Corrigé", native: "Naturel", takeaway: "Points clés" },
    de: { direct: "Direkte Logik", liveFlow: "Live Flow", vocab: "Schlüsselbegriffe", fixed: "Korrigiert", native: "Nativ", takeaway: "Wichtige Punkte" },
    ru: { direct: "Прямой поток", liveFlow: "Live Flow", vocab: "Ключевые слова", fixed: "Исправлено", native: "Нативный", takeaway: "Главное" },
  };
  const n = SEED_NAMES[norm] || SEED_NAMES.en;

  return [
    {
      id: "direct",
      name: n.direct,
      aliases: ["lazy"],
      flow: "translate",
      action: "transform",
      hud: "preview",
      reasoning: "low",
      slots: [
        {
          id: "direct_spec",
          label: n.direct,
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
          enabled: true,
        },
        {
          id: "vocab",
          label: n.vocab,
          role: "vocab",
          instruction:
            "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) · term2 (...)'.",
          enabled: true,
        },
      ],
      enabled: true,
    },
    {
      id: "live-flow",
      name: n.liveFlow,
      aliases: ["raw"],
      flow: "proofread",
      action: "transform",
      hud: "adaptive-takeaway",
      reasoning: "low",
      slots: [
        {
          id: "fixed",
          label: n.fixed,
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' ➔ 'want you to'), wrong prepositions/articles, and grammatical slips in the user's ${targetLang} sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')—passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
          hideWhenLong: true,
          enabled: true,
        },
        {
          id: "native",
          label: n.native,
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
          hideWhenLong: true,
          enabled: true,
        },
        {
          id: "fixes",
          label: n.takeaway,
          role: "vocab",
          instruction:
            "Extract 1-3 essential takeaways in the format: 'before ➔ after (<= 10 words/chars grounded intuition in ${explainLang})'.",
          enabled: true,
        },
      ],
      enabled: true,
    },
  ];
}

export interface LoadoutDefinition {
  id: string;
  name: string;
  description: string;
  loadout: (sourceLang?: string, explainLang?: string) => CustomModeConfig;
}

export const PRESET_LOADOUTS: Record<string, LoadoutDefinition> = {
  spec: {
    id: "spec",
    name: "Brain-Dump to Spec",
    description: "Transforms unstructured thoughts into clear Objective, Constraints, Edge Cases, and Do Not Touch clauses for agent plan mode",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "spec",
      name: sourceLang === "zh" ? "脑暴压铸" : sourceLang === "ja" ? "仕様鋳造" : "Brain-Dump Spec",
      flow: "translate",
      action: "transform",
      hud: "preview",
      target: "agent",
      reasoning: "medium",
      killList: ["make it fast", "handle errors properly", "delve", "seamless", "robust"],
      slots: [
        {
          id: "spec",
          label: "Spec",
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Restructure user's raw thoughts from ${sourceLang} into structured engineering specification for an AI coding agent with explicit sections: Objective, Constraints, Edge Cases, and Do Not Touch modules. Use rigorous system architecture terms (e.g. idempotency, dead-letter queue, exponential backoff, rollback). NEVER invent unmentioned architectural features.",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Arch Terms",
          role: "vocab",
          instruction: "Extract 2-3 key architectural term mappings with explanations in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
  commit: {
    id: "commit",
    name: "Commit Dehydrator",
    description: "Extracts git diff and intent into conventional commits format (first line <=50 chars, imperative verb, Root Cause & Impact body)",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "commit",
      name: sourceLang === "zh" ? "提交脱水" : sourceLang === "ja" ? "コミット脱水" : "Commit Dehydrator",
      flow: "translate",
      action: "transform",
      hud: "preview",
      target: "clipboard",
      reasoning: "low",
      contextAware: true,
      killList: ["enhance", "robust", "seamless", "streamline", "comprehensive", "This PR aims to", "in summary"],
      slots: [
        {
          id: "commit",
          label: "Commit",
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate strict Conventional Commits format (e.g. 'fix(scope): ...' or 'feat(scope): ...'). First line MUST be <= 50 characters starting directly with an imperative active verb (e.g. 'Prevent', 'Clear', 'Guard against', 'Handle'). Body must state strictly Root Cause and Impact without AI filler.",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Git Verbs",
          role: "vocab",
          instruction: "Highlight the imperative Git verb replacement and rationale in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
  oss: {
    id: "oss",
    name: "OSS Peer Comms",
    description: "Transforms blunt feedback or bug reports into peer-level, objective, non-defensive GitHub issue/PR comments (nit, blocker, repro)",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "oss",
      name: sourceLang === "zh" ? "开源对线" : sourceLang === "ja" ? "OSS対話" : "OSS Peer Comms",
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: ["Sorry for my bad English", "Thank you so much for your kind review", "I would really appreciate it if", "delve"],
      slots: [
        {
          id: "peer_review",
          label: "Peer Comms",
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Transform user's technical argument or critique from ${sourceLang} into objective, peer-level engineering communication. Erase self-deprecation (never say 'sorry for poor english') and personal blame. Inject natural GitHub maintainer idioms (e.g. 'nit:', 'under contention', 'race condition', 'idiomatic', 'repro:').",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Peer Idioms",
          role: "vocab",
          instruction: "Extract 1-2 diplomatic peer engineering expressions in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
  yap: {
    id: "yap",
    name: "Indie Hacker Shipper",
    description: "Distills technical builds into cold, high-density Indie Hacker tech posts (<280 chars) for X and HN with 0 emojis and 0 corporate hype",
    loadout: (sourceLang = "en", _explainLang?: string) => ({
      id: "yap",
      name: sourceLang === "zh" ? "极客发推" : sourceLang === "ja" ? "発信投稿" : "Indie Shipper",
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: ["🚀", "🔥", "✨", "🧵", "Excited to announce", "Game-changer", "Revolutionize", "Unleash", "delve", "tapestry"],
      slots: [
        {
          id: "tweet",
          label: "Post",
          role: "rewrite",
          instruction:
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate cold, high-density developer post under 280 characters. Structure: Pain (what sucked before) ➔ What was built (one-line solution) ➔ Under the hood (concrete technical mechanism). Zero emoji spam, zero marketing hype, direct developer voice.",
          enabled: true,
        },
        {
          id: "vocab",
          label: "Dev Slang",
          role: "vocab",
          instruction: "Extract 1-2 authentic developer phrasing alternatives in ${explainLang}.",
          enabled: true,
        },
      ],
      enabled: true,
    }),
  },
};

export function getPresetLoadout(id: string, sourceLang = "en", explainLang?: string): CustomModeConfig | null {
  const normId = id.trim().toLowerCase();
  const found = PRESET_LOADOUTS[normId];
  return found ? found.loadout(sourceLang, explainLang) : null;
}

export function listPresetLoadouts(): LoadoutDefinition[] {
  return Object.values(PRESET_LOADOUTS);
}

/**
 * Creates a custom slot definition with sanitized ID and default parameters.
 */
export function createCustomSlot(params: Partial<SlotConfig> & { id: string; label: string }): SlotConfig {
  const normId = params.id.trim().toLowerCase();
  const role = params.role || (normId === "source" ? "source" : normId === "vocab" ? "vocab" : "translation");
  return {
    id: normId,
    label: params.label.trim(),
    role,
    instruction: params.instruction?.trim() || (role === "source" ? undefined : "Natural expressions matching context."),
    showMeaning: params.showMeaning !== undefined ? params.showMeaning : (role !== "source" && role !== "vocab"),
    hideWhenLong: Boolean(params.hideWhenLong),
    enabled: params.enabled !== undefined ? params.enabled : true,
  };
}

export function addSlotToList(slots: SlotConfig[], newSlot: SlotConfig): SlotConfig[] {
  const normId = newSlot.id.trim().toLowerCase();
  const existingIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (existingIndex >= 0) {
    const copy = [...slots];
    copy[existingIndex] = { ...newSlot, id: normId };
    return copy;
  }
  return [...slots, { ...newSlot, id: normId }];
}

export function removeSlotFromList(slots: SlotConfig[], slotId: string): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.filter((s) => s.id.toLowerCase() !== normId);
}

export function updateSlotInList(slots: SlotConfig[], slotId: string, patch: Partial<SlotConfig>): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => (s.id.toLowerCase() === normId ? { ...s, ...patch } : s));
}

export function toggleSlotInList(slots: SlotConfig[], slotId: string): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => (s.id.toLowerCase() === normId ? { ...s, enabled: !s.enabled } : s));
}

export function moveSlotInList(slots: SlotConfig[], slotId: string, targetIndex: number): SlotConfig[] {
  const normId = slotId.trim().toLowerCase();
  const currentIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= slots.length || currentIndex === targetIndex) {
    return slots;
  }
  const copy = [...slots];
  const [removed] = copy.splice(currentIndex, 1);
  copy.splice(targetIndex, 0, removed);
  return copy;
}

export function addCustomMode(modes: CustomModeConfig[], newMode: CustomModeConfig): CustomModeConfig[] {
  const normId = newMode.id.trim().toLowerCase();
  const existingIndex = modes.findIndex((m) => m.id.toLowerCase() === normId);
  const modeNormalized: CustomModeConfig = {
    ...newMode,
    id: normId,
    name: newMode.name?.trim() || normId,
    flow: newMode.flow || "translate",
    action: newMode.action || "transform",
    hud: newMode.hud || "preview",
    slots: Array.isArray(newMode.slots) ? newMode.slots : [],
    enabled: newMode.enabled !== undefined ? newMode.enabled : true,
  };
  if (existingIndex >= 0) {
    const copy = [...modes];
    copy[existingIndex] = modeNormalized;
    return copy;
  }
  return [...modes, modeNormalized];
}

export function removeCustomMode(modes: CustomModeConfig[], modeId: string): CustomModeConfig[] {
  const normId = modeId.trim().toLowerCase();
  return modes.filter((m) => m.id.toLowerCase() !== normId);
}

export function updateCustomMode(
  modes: CustomModeConfig[],
  modeId: string,
  patch: Partial<CustomModeConfig>
): CustomModeConfig[] {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => (m.id.toLowerCase() === normId ? { ...m, ...patch } : m));
}

export function toggleCustomMode(modes: CustomModeConfig[], modeId: string): CustomModeConfig[] {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => (m.id.toLowerCase() === normId ? { ...m, enabled: !m.enabled } : m));
}

export function addSlotToMode(
  modes: CustomModeConfig[],
  modeId: string,
  slot: PromptSlotConfig
): CustomModeConfig[] {
  const normModeId = modeId.trim().toLowerCase();
  const normSlotId = slot.id.trim().toLowerCase();
  return modes.map((m) => {
    if (m.id.toLowerCase() !== normModeId) return m;
    const existingIdx = m.slots.findIndex((s) => s.id.toLowerCase() === normSlotId);
    let newSlots: PromptSlotConfig[];
    if (existingIdx >= 0) {
      newSlots = [...m.slots];
      newSlots[existingIdx] = { ...slot, id: normSlotId };
    } else {
      newSlots = [...m.slots, { ...slot, id: normSlotId }];
    }
    return { ...m, slots: newSlots };
  });
}

export function removeSlotFromMode(
  modes: CustomModeConfig[],
  modeId: string,
  slotId: string
): CustomModeConfig[] {
  const normModeId = modeId.trim().toLowerCase();
  const normSlotId = slotId.trim().toLowerCase();
  return modes.map((m) => {
    if (m.id.toLowerCase() !== normModeId) return m;
    return { ...m, slots: m.slots.filter((s) => s.id.toLowerCase() !== normSlotId) };
  });
}

export const SLOT_PRESETS: Record<string, SlotPresetDefinition> = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => getDefaultSlots(sourceLang),
  },
  social: {
    name: "Social",
    description: "Community building: Hook + Deep + Vocab",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Hook", role: "translation", instruction: "High-engagement opening hook for social threads.", showMeaning: true, enabled: true },
      { id: "written", label: "Deep", role: "translation", instruction: "Insightful technical value and architecture reasoning.", showMeaning: true, enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", instruction: "Key engagement idioms and phrases.", enabled: true },
    ],
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: 口語 + 敬語 + 単語",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "原文", role: "source", enabled: true },
      { id: "spoken", label: "口語", role: "translation", instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk).", showMeaning: true, enabled: true },
      { id: "written", label: "敬語", role: "translation", instruction: "Formal, polite business Japanese (Keigo, professional email/PR).", showMeaning: true, enabled: true },
      { id: "vocab", label: "単語", role: "vocab", instruction: "Key Japanese vocabulary and idiomatic expressions.", enabled: true },
    ],
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Discussion", role: "translation", instruction: "Academic colloquium and seminar discussion tone.", showMeaning: true, enabled: true },
      { id: "written", label: "Paper", role: "translation", instruction: "Formal, objective academic prose suitable for papers.", showMeaning: true, enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false },
    ],
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Translation", role: "translation", instruction: "Natural, idiomatic target language translation.", showMeaning: true, enabled: true },
      { id: "written", label: "Written", role: "translation", enabled: false },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false },
    ],
  },
};

export function resolveSlotsForPreset(presetName = "developer", sourceLang = "en"): SlotConfig[] {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}

/**
 * Universal English Baseline and compact localized chrome presets.
 */
export const LANGUAGE_PRESETS: Record<string, LingualI18nLabels> = {
  en: {
    slot1Label: "Spoken",
    slot2Label: "Written",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "en ⇄ ja",
    statusOriginal: "en ⇄ ja",
    statusEnglish: "en ⇄ ja",
    statusOff: "en ⇄ ja: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[en ⇄ ja] Companion mode: raw send + HUD learning card above",
    notifyEnglish: "[en ⇄ ja] Direct mode: prompt optimized into target language",
    notifyOff: "[en ⇄ ja] Companion disabled",
    notifyPaging: "[en ⇄ ja] Long sentence paginated, use Alt+. or Alt+, to navigate",
    notifyNoHistory: "[en ⇄ ja] No previous companion card recorded",
    notifyHistoryRestored: "[en ⇄ ja] Restored previous companion card",
    notifyAgentHelp: "💡 Built-in lingual-tuner skill: Ask the agent to configure companion settings anytime.",
    notifyModelSwitched: "Companion model switched to: {model}",
    notifyLangSwitched: "Companion language switched to: {lang}",
    notifyLangInvalid: "Invalid language code. Supported: zh, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[en ⇄ ja] Capsule mode enabled: single-line compact view",
    notifyCompactOff: "[en ⇄ ja] Tree branch mode enabled: full multi-slot view",
    notifyTimeout: "[en ⇄ ja] Prompt rewrite timed out; original prompt passed",
    notifyError: "[en ⇄ ja] Prompt rewrite error; original prompt passed",

    cmdDescMode: "Cycle companion mode [en ⇄ ja]: [Companion] ➔ [Direct] ➔ [Off]",
    cmdDescLang: "Switch language pair [en ⇄ ja]: /lang <source> [target]",
    cmdDescLast: "Replay previous companion card: /last",
    shortcutNextPage: "Next companion page segment",
    shortcutPrevPage: "Previous companion page segment",

    capsuleSlot1Prefix: "Spk",
    capsuleSlot2Prefix: "Wrt",
    layoutCapsule: "Single-Line Capsule (1-Line)",
    layoutTree: "Trifecta Minimalist Left-Rail Tree (· ┌ ├ └)",

    statusReportTitle: "Companion Status Report",
    statusReportMode: "Mode",
    statusReportFlow: "Language Flow",
    statusReportModel: "Model",
    statusReportCache: "Cache",
    statusReportLayout: "Layout: Trifecta Minimalist Left-Rail Tree",
    statusReportAuth: "Auth: Pi Native In-Process Credentials",
    statusReportShortcuts: "Shortcuts: /lingual · /slots · /lang · /last",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill",
    modeDescOriginal: "Companion · 0ms pass-through",
    modeDescEnglish: "Direct · Deep code reasoning",
    modeDescOff: "Disabled",

    modelCurrentLabel: "Current companion model",
    modelFollowSession: "follow session",

    langUsageHint: "Usage: /lang <source> [target] (e.g. /lang ja en or /lang en zh)",
    langList: ["• zh", "• ja", "• en", "• es", "• fr", "• de", "• ru", "• ko"],

    slotsHeader: "Dynamic Slots Architecture",
    slotsActiveTag: "active",
    slotsNone: "No slots configured",
    slotsStatusEnabled: "enabled",
    slotsStatusDisabled: "disabled",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "💬 Natural Language Customization:",
    slotsNlExamples: ["• \"Customize slots: show tweets and deep analysis, no source\""],
    slotsCliTitle: "CLI Management Commands:",
    slotsCliHelp: ["• /slots add <id> <label> [instruction...]", "• /slots rm <id>", "• /slots toggle <id>", "• /slots reset"],
    slotsResetSuccess: "[{pair}] Reset slots to clean defaults",
    slotsRemovedSuccess: "[{pair}] Removed slot [{id}] (\"{label}\")",
    slotsRemovedSourceNote: " (Source line will no longer appear on cards)",
    slotsToggled: "[{pair}] Slot [{id}] is now {status}",
    slotsAdded: "[{pair}] Added/updated slot [{id}] \"{label}\"",
    slotsNotFound: "[{pair}] Slot [{id}] not found",
    slotsUsageAdd: "Usage: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "Usage: /slots rm <slot-id>",
    slotsUsageToggle: "Usage: /slots toggle <slot-id>",
    slotsUnknown: "Unknown slot command or preset \"{cmd}\".",

    spokenLabel: "Spoken",
    writtenLabel: "Written",
  },
  zh: {
    slot1Label: "口语",
    slot2Label: "写作",
    vocabLabel: "重点",
    sourceLabel: "原文",
    hudTitle: "zh ⇄ en",
    statusOriginal: "zh ⇄ en",
    statusEnglish: "zh ⇄ en",
    statusOff: "zh ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[zh ⇄ en] 已切换至【原文模式】：输入保持纯净母语，上方 HUD 浮现伴学视窗",
    notifyEnglish: "[zh ⇄ en] 已切换至【英文模式】：发给 AI 的输入将自动转换为纯正技术英文",
    notifyOff: "[zh ⇄ en] 已关闭伴学",
    notifyPaging: "[zh ⇄ en] 长句已切分多段，按 Alt+. 或 Alt+, 翻页浏览",
    notifyNoHistory: "[zh ⇄ en] 暂无上一条伴学记录",
    notifyHistoryRestored: "[zh ⇄ en] 已重新显示上一条伴学卡片",
    notifyAgentHelp: "💡 内置 lingual-tuner 槽位调优技能：直接对当前 Agent 说 \"帮我定制伴学\" 即可免命令自动装配！",
    notifyModelSwitched: "伴学模型已切换为: {model}",
    notifyLangSwitched: "伴学语言已切换为: {lang}",
    notifyLangInvalid: "无效的语言代码。支持: zh, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[zh ⇄ en] 已开启单行胶囊模式：极简占位",
    notifyCompactOff: "[zh ⇄ en] 已切换为左导轨树状架构：展示完整多槽与语感",
    notifyTimeout: "[zh ⇄ en] 提示词优化请求未就绪或超时，本次已放行原文",
    notifyError: "[zh ⇄ en] 提示词优化请求异常，本次已放行原文",

    cmdDescMode: "切换伴学模式: /lingual",
    cmdDescLang: "切换伴学语言: /lang <code>",
    cmdDescLast: "回看上一条卡片: /last",
    shortcutNextPage: "切换至下一段伴学切片",
    shortcutPrevPage: "切换至上一段伴学切片",

    capsuleSlot1Prefix: "口",
    capsuleSlot2Prefix: "写",
    layoutCapsule: "单行胶囊极简流 (1-Line Capsule)",
    layoutTree: "Trifecta 开放式左导轨树状架构 (· ┌ ├ └)",

    statusReportTitle: "运行状态报告",
    statusReportMode: "当前模式",
    statusReportFlow: "语言流向",
    statusReportModel: "伴学模型",
    statusReportCache: "会话缓存",
    statusReportLayout: "HUD布局: Trifecta 开放式左导轨树状架构",
    statusReportAuth: "凭据模式: Pi 原生进程内认证 (Zero Config)",
    statusReportShortcuts: "快捷操作: /lingual · /slots · /lang · /last",
    statusReportTuner: "槽位调优: 内置 lingual-tuner 槽位调优技能（直接向 Agent 描述即可免命令定制）",
    modeDescOriginal: "原文直通 · 0ms非阻塞",
    modeDescEnglish: "英文模式 · 深度代码推理",
    modeDescOff: "已关闭",

    modelCurrentLabel: "当前伴学模型",
    modelFollowSession: "跟随会话",

    langUsageHint: "用法: /lang <zh|ja|en|es|fr|de> [target] (如 /lang ja 或 /lang zh ja)",
    langList: ["• zh", "• ja", "• en", "• es", "• fr", "• de", "• ko", "• ru"],

    slotsHeader: "动态槽位架构",
    slotsActiveTag: "激活",
    slotsNone: "未配置任何槽位",
    slotsStatusEnabled: "已启用",
    slotsStatusDisabled: "已禁用",
    slotsWithNuance: " +母语微释义",
    slotsNlTitle: "💬 自然语言定制（直接对 Agent 说即可定制）：",
    slotsNlExamples: ["• \"帮我定制伴学：只要推文和深度分析，不要原文\""],
    slotsCliTitle: "常用快捷命令：",
    slotsCliHelp: ["• /slots add <id> <label> [instruction...]", "• /slots rm <id>", "• /slots toggle <id>", "• /slots reset"],
    slotsResetSuccess: "[{pair}] 已重置槽位为初始默认状态",
    slotsRemovedSuccess: "[{pair}] 已移除槽位 [{id}] (\"{label}\")",
    slotsRemovedSourceNote: " (已物理隐藏原文行)",
    slotsToggled: "[{pair}] 槽位 [{id}] 状态变更为: {status}",
    slotsAdded: "[{pair}] 已添加/更新槽位 [{id}] \"{label}\"",
    slotsNotFound: "[{pair}] 未找到槽位 [{id}]",
    slotsUsageAdd: "用法: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "用法: /slots rm <slot-id>",
    slotsUsageToggle: "用法: /slots toggle <slot-id>",
    slotsUnknown: "未识别的槽位命令 \"{cmd}\"。",

    spokenLabel: "口语",
    writtenLabel: "写作",
  },
  ja: {
    slot1Label: "口語",
    slot2Label: "文面",
    vocabLabel: "単語",
    sourceLabel: "原文",
    hudTitle: "ja ⇄ en",
    statusOriginal: "ja ⇄ en",
    statusEnglish: "ja ⇄ en",
    statusOff: "ja ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[ja ⇄ en] 【原文モード】に切り替えました：原文送信＋学習カード表示",
    notifyEnglish: "[ja ⇄ en] 【英語モード】に切り替えました：プロンプトを英語に変換して送信",
    notifyOff: "[ja ⇄ en] オフにしました",
    notifyPaging: "[ja ⇄ en] 長文を分割しました。Alt+. または Alt+, で移動",
    notifyNoHistory: "[ja ⇄ en] 履歴がありません",
    notifyHistoryRestored: "[ja ⇄ en] 前回のカードを再表示しました",
    notifyAgentHelp: "💡 lingual-tuner スキルで自由にカスタマイズ可能です（母語切替対応）",
    notifyModelSwitched: "モデルを変更しました: {model}",
    notifyLangSwitched: "言語を変更しました: {lang}",
    notifyLangInvalid: "無効な言語コードです",
    notifyCompactOn: "[ja ⇄ en] 1行カプセル表示を有効化しました",
    notifyCompactOff: "[ja ⇄ en] ツリー表示を有効化しました",
    notifyTimeout: "[ja ⇄ en] タイムアウトのため原文を送信しました",
    notifyError: "[ja ⇄ en] エラーのため原文を送信しました",

    cmdDescMode: "モード切替: /lingual",
    cmdDescLang: "言語切替: /lang <code>",
    cmdDescLast: "前回カード再表示: /last",
    shortcutNextPage: "次のスライスへ移動",
    shortcutPrevPage: "前のスライスへ移動",

    capsuleSlot1Prefix: "口",
    capsuleSlot2Prefix: "文",
    layoutCapsule: "1行カプセル表示",
    layoutTree: "Trifecta ツリー表示",

    statusReportTitle: "ステータスレポート",
    statusReportMode: "現在のモード",
    statusReportFlow: "言語フロー",
    statusReportModel: "モデル",
    statusReportCache: "キャッシュ",
    statusReportLayout: "レイアウト: Trifecta ツリー表示",
    statusReportAuth: "認証方式: Pi ネイティブインプロセス認証",
    statusReportShortcuts: "ショートカット: /lingual · /slots · /lang · /last",
    statusReportTuner: "チューナー: lingual-tuner スキル",
    modeDescOriginal: "原文パススルー · 0ms非同期",
    modeDescEnglish: "直行 · コード推論",
    modeDescOff: "オフ",

    modelCurrentLabel: "現在の学習モデル",
    modelFollowSession: "セッション連動",
    modelAvailableListHeader: "利用可能なモデル:",

    langUsageHint: "使い方: /lang <source> [target] (例: /lang ja en)",
    langList: ["• ja", "• en", "• zh", "• es", "• fr", "• de", "• ko", "• ru"],

    slotsHeader: "ダイナミックスロット",
    slotsActiveTag: "有効",
    slotsNone: "スロットが設定されていません",
    slotsStatusEnabled: "有効",
    slotsStatusDisabled: "無効",
    slotsWithNuance: " +ニュアンス",
    slotsNlTitle: "💬 自然言語カスタマイズ:",
    slotsNlExamples: ["• \"ツイートと技術考察だけ表示して原文は非表示にして\""],
    slotsCliTitle: "CLIコマンド:",
    slotsCliHelp: ["• /slots add <id> <label> [instruction...]", "• /slots rm <id>", "• /slots toggle <id>", "• /slots reset"],
    slotsResetSuccess: "[{pair}] デフォルト設定にリセットしました",
    slotsRemovedSuccess: "[{pair}] スロット [{id}] を削除しました",
    slotsRemovedSourceNote: " (原文は表示されなくなります)",
    slotsToggled: "[{pair}] スロット [{id}] を {status} にしました",
    slotsAdded: "[{pair}] スロット [{id}] \"{label}\" を追加/更新しました",
    slotsNotFound: "[{pair}] スロット [{id}] が見つかりません",
    slotsUsageAdd: "使い方: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "使い方: /slots rm <slot-id>",
    slotsUsageToggle: "使い方: /slots toggle <slot-id>",
    slotsUnknown: "不明なスロットコマンド \"{cmd}\" です。",

    spokenLabel: "口語",
    writtenLabel: "文面",
  },
};

/**
 * Resolves localized labels for a given language code, allowing custom user overrides.
 * Follows English Pivot Fallback chain.
 */
export function resolveLabelsForLang(
  lang = "en",
  overrides?: Partial<LingualI18nLabels>,
  targetLang?: string
): LingualI18nLabels {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.en;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} ⇄ ${actualTarget}`;

  const merged: Record<string, any> = {
    ...LANGUAGE_PRESETS.en, // 1. Universal English baseline
    ...target,              // 2. Localized native language preset
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...(overrides || {}),   // 3. User explicit overrides
  };

  // Dynamically replace static language pair tags with active pairTitle
  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "string") {
      merged[key] = val.replace(/\[[a-z]{2}\s*⇄\s*[a-z]{2}\]/gi, `[${pairTitle}]`);
    }
  }

  return merged as LingualI18nLabels;
}

/**
 * Format runtime status report adhering strictly to Primary Language Sovereignty.
 */
export function formatStatusReport(
  labels: LingualI18nLabels,
  info: {
    mode: string;
    sourceLang: string;
    targetLang?: string;
    activeModel: string;
    layout?: "tree" | "capsule";
    cacheStats?: {
      hits: number;
      misses: number;
      size: number;
      capacity: number;
    };
  }
): string {
  const modeDesc =
    info.mode === "original"
      ? (labels.modeDescOriginal || "Original pass-through")
      : info.mode === "english"
      ? (labels.modeDescEnglish || "English deep reasoning")
      : (labels.modeDescOff || "Off");

  const layoutDesc =
    info.layout === "capsule"
      ? (labels.layoutCapsule || "Single-Line Capsule (1-Line)")
      : (labels.layoutTree || "Trifecta Minimalist Left-Rail Tree (· ┌ ├ └)");

  const lines = [
    `⇄ [${labels.hudTitle}] ${labels.statusReportTitle || "Status Report"}`,
    `• ${labels.statusReportMode || "Mode"}: [${info.mode}] (${modeDesc})`,
    `• ${labels.statusReportFlow || "Flow"}: [${info.sourceLang} ➔ ${info.targetLang || "en"}]`,
    `• ${labels.statusReportModel || "Model"}: ${info.activeModel}`,
  ];

  if (info.cacheStats) {
    const total = info.cacheStats.hits + info.cacheStats.misses;
    const rate = total > 0 ? Math.round((info.cacheStats.hits / total) * 100) : 0;
    lines.push(
      `• ${labels.statusReportCache || "Cache"}: ${info.cacheStats.hits} hits / ${total} total (${rate}% hit rate) · ${info.cacheStats.size}/${info.cacheStats.capacity} items`
    );
  }

  lines.push(
    `• ${labels.statusReportLayout || "Layout"}: ${layoutDesc}`,
    `• ${labels.statusReportAuth || "Auth: Pi Native In-Process Auth"}`,
    `• ${labels.statusReportTuner || "Slot Tuner: Built-in lingual-tuner skill (Just describe preferences to Agent)"}`,
    `• ${labels.statusReportShortcuts || "Shortcuts: /lingual · /slots · /lang · /last"}`
  );
  return lines.join("\n");
}

/**
 * Formats model selection menu prompt adhering to Primary Language Sovereignty.
 */
export function formatModelSelectionMessage(
  labels: LingualI18nLabels,
  currentActive: string,
  availableList?: string
): string {
  let msg = `[${labels.hudTitle}] ${labels.modelCurrentLabel || "Current model"}: ${currentActive}\n`;
  if (availableList) {
    msg += `${labels.modelAvailableListHeader || "Available models:"}\n${availableList}\n• ${labels.modelAutoFollowDesc || "auto"}\n`;
  }
  msg += labels.modelSelectHint || "Specify model with /lingual model <model-id> or auto.";
  return msg;
}
