import type { CustomModeConfig, LingualI18nLabels, SlotConfig, PromptSlotConfig, ReasoningEffort } from "./types.js";
export type { ReasoningEffort } from "./types.js";

export interface SlotPresetDefinition {
  name: string;
  description: string;
  slots: (sourceLang?: string) => SlotConfig[];
}

export { getDefaultSlots, getDefaultDirectSlots, getDefaultModifySlots } from "./prompts.js";
import { getDefaultDirectSlots, getDefaultModifySlots, getDefaultSlots } from "./prompts.js";

export interface SeedNames {
  companion: string;
  direct: string;
  liveFlow: string;
  candidates: string;
  loadoutSpec: string;
  loadoutCommit: string;
  loadoutOss: string;
  loadoutYap: string;
  vocab: string;
  fixed: string;
  native: string;
  takeaway: string;
}

export const SEED_NAMES: Record<string, SeedNames> = {
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

export function resolveSeedNames(lang = "en"): SeedNames {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  return SEED_NAMES[norm] || SEED_NAMES.en;
}

export function resolveModeDisplayName(modeId: string, lang = "en"): string {
  const n = resolveSeedNames(lang);
  const norm = (modeId || "").toLowerCase();
  switch (norm) {
    case "companion":
    case "original":
      return n.companion;
    case "direct":
    case "lazy":
    case "english":
      return n.direct;
    case "live-flow":
    case "modify":
    case "raw":
      return n.liveFlow;
    case "candidates":
    case "select":
      return n.candidates;
    case "off": {
      const isZh = lang === "zh" || lang === "tw";
      const isJa = lang === "ja";
      return isZh ? "已关闭" : isJa ? "オフ" : "Off";
    }
    default:
      return modeId;
  }
}

/**
 * Returns three-core factory golden defaults (v0.6.0 Three-Core Baselines: 1. Companion + 2. Logical Spec + 3. Live Flow).
 */
export function getDefaultFactoryModes(sourceLang = "en", explainLang?: string): CustomModeConfig[] {
  const n = resolveSeedNames(sourceLang);

  return [
    // Archetype 1: Companion (pass-through) keeps the 5-second-gap learning card alive out of the box.
    {
      id: "companion",
      name: n.companion,
      aliases: ["original"],
      flow: "translate",
      action: "pass-through",
      hud: "tree",
      reasoning: "low",
      slots: getDefaultSlots(sourceLang),
      enabled: true,
    },
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
      name: resolveSeedNames(sourceLang).loadoutSpec,
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
      name: resolveSeedNames(sourceLang).loadoutCommit,
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
      name: resolveSeedNames(sourceLang).loadoutOss,
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
      name: resolveSeedNames(sourceLang).loadoutYap,
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
    notifyLangInvalid: "Invalid language code. Supported: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[en ⇄ ja] Capsule mode enabled: single-line compact view",
    notifyCompactOff: "[en ⇄ ja] Tree branch mode enabled: full multi-slot view",
    notifyTimeout: "[en ⇄ ja] Prompt rewrite timed out; original prompt passed",
    notifyError: "[en ⇄ ja] Prompt rewrite error; original prompt passed",
    notifyModeNotFound: "[{pair}] Mode [{mode}] is not in your active registry. Run /lingual mode list to view available modes.",
    modeSwitchedTemplate: "[{pair}] Switched to [{num}. {name} ({id})] ({slot})",

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
    notifyLangInvalid: "无效的语言代码。支持: zh, tw, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[zh ⇄ en] 已开启单行胶囊模式：极简占位",
    notifyCompactOff: "[zh ⇄ en] 已切换为左导轨树状架构：展示完整多槽与语感",
    notifyTimeout: "[zh ⇄ en] 提示词优化请求未就绪或超时，本次已放行原文",
    notifyError: "[zh ⇄ en] 提示词优化请求异常，本次已放行原文",
    notifyModeNotFound: "[{pair}] 模式【{mode}】不在当前注册表中。输入 /lingual mode list 查看可用模式。",
    modeSwitchedTemplate: "[{pair}] 已切换至【{num}. {name} ({id})】({slot})",

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
    notifyModeNotFound: "[{pair}] モード【{mode}】は現在の登録表に存在しません。/lingual mode list で確認してください。",
    modeSwitchedTemplate: "[{pair}] 【{num}. {name} ({id})】に切り替えました ({slot})",

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
  es: {
    slot1Label: "Coloquial",
    slot2Label: "Escrito",
    vocabLabel: "Vocab",
    sourceLabel: "Original",
    hudTitle: "es ⇄ en",
    statusOriginal: "es ⇄ en",
    statusEnglish: "es ⇄ en",
    statusOff: "es ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[es ⇄ en] Cambiado al modo [Original]: El texto se envía sin modificar",
    notifyEnglish: "[es ⇄ en] Cambiado al modo [Inglés]: El texto se transforma en inglés técnico",
    notifyOff: "[es ⇄ en] Asistente desactivado",
    notifyPaging: "[es ⇄ en] Texto largo segmentado. Presione Alt+. o Alt+, para navegar",
    notifyNoHistory: "[es ⇄ en] No hay registros anteriores",
    notifyHistoryRestored: "[es ⇄ en] Tarjeta anterior restaurada",
    notifyAgentHelp: "💡 Habilidad lingual-tuner integrada: Simplemente pídale a su Agente \"Personaliza el asistente: solo tuit y análisis, sin texto original\" para configurar las ranuras al instante. Cambie de idioma con /lang <code>.",
    notifyModelSwitched: "Modelo cambiado a: {model}",
    notifyLangSwitched: "Idioma nativo cambiado a: {lang} (Nota: Las descripciones del menú de comandos se actualizarán tras reiniciar la terminal)",
    notifyLangInvalid: "Código de idioma no válido. Admitidos: zh, ja, en, es, fr, de",
    notifyCompactOn: "[es ⇄ en] Modo cápsula de una línea activado",
    notifyCompactOff: "[es ⇄ en] Modo árbol completo restaurado",
    notifySlotSwitched: "[es ⇄ en] Arquitectura de ranuras cambiada a [{preset}]: {desc}",
    notifyTimeout: "[es ⇄ en] La traducción al inglés agotó el tiempo; se envió el texto original",
    notifyError: "[es ⇄ en] Error en la traducción al inglés; se envió el texto original",
    notifyModeNotFound: "[{pair}] El modo [{mode}] no está en el registro activo. Ejecute /lingual mode list para ver los modos disponibles.",
    modeSwitchedTemplate: "[{pair}] Cambiado a [{num}. {name} ({id})] ({slot})",

    cmdDescMode: "Cambiar modo [es ⇄ en]: [Original] ➔ [Inglés] ➔ [Apagado]",
    cmdDescStatus: "Mostrar diagnóstico y estado del modelo: /lingual-status",
    cmdDescModel: "Consultar o cambiar modelo: /lingual-model [model-id|auto]",
    cmdDescLang: "Ver o cambiar idioma nativo: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Inspeccionar o cambiar ranuras: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Alternar modo cápsula de una línea: /lingual-compact",
    cmdDescLast: "Reaparecer tarjeta anterior: /lingual-last",
    cmdDescAgent: "Ver guía de personalización y cambio de idioma: /lingual-agent",
    shortcutNextPage: "Cambiar al siguiente segmento",
    shortcutPrevPage: "Cambiar al segmento anterior",

    capsuleSlot1Prefix: "Col",
    capsuleSlot2Prefix: "Esc",
    layoutCapsule: "Cápsula de una línea (1-Line Capsule)",
    layoutTree: "Trifecta árbol de guía izquierda (· ┌ ├ └)",

    statusReportTitle: "Informe de estado",
    statusReportMode: "Modo actual",
    statusReportFlow: "Flujo de idiomas",
    statusReportModel: "Modelo asistente",
    statusReportCache: "Caché de sesión",
    statusReportLayout: "Diseño HUD: Trifecta árbol de guía izquierda (· ┌ ├ └)",
    statusReportAuth: "Autenticación: Proceso nativo de Pi (Sin config · Seguro)",
    statusReportShortcuts: "Accesos directos: /lingual (modo) · /slots (ranuras) · /lang (idioma) · /lingual-compact (diseño)",
    statusReportTuner: "Ajuste de ranuras: Habilidad lingual-tuner integrada (configure hablando con su Agente)",
    modeDescOriginal: "Directo · 0ms no bloqueante",
    modeDescEnglish: "Modo inglés · Razonamiento profundo",
    modeDescOff: "Apagado",

    modelCurrentLabel: "Modelo actual",
    modelFollowSession: "Siguiendo sesión",
    modelAvailableListHeader: "Modelos disponibles (ejecute /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Sigue automáticamente el modelo de la sesión)",
    modelSelectHint: "Use /lingual-model <id> o auto para asignar un modelo.",

    langUsageHint: "Uso: /lang <zh|ja|en|es|fr|de> [target] (ej. /lang ja o /lang zh ja)",
    langList: [
      "• zh (Chino ➔ Inglés)",
      "• ja (Japonés ➔ Inglés)",
      "• en (Inglés ➔ Japonés)",
      "• es (Español ➔ Inglés)",
      "• fr (Francés ➔ Inglés)",
      "• de (Alemán ➔ Inglés)",
    ],

    // Ranuras dinámicas (Español)
    slotsHeader: "Arquitectura de ranuras dinámicas",
    slotsActiveTag: "activas",
    slotsNone: "No hay ranuras configuradas",
    slotsStatusEnabled: "activada",
    slotsStatusDisabled: "desactivada",
    slotsWithNuance: " +matiz",
    slotsNlTitle: "💬 Personalización con lenguaje natural (consulte a su Agente directamente):",
    slotsNlExamples: [
      "• \"Personaliza el asistente: solo tuit y análisis profundo, sin texto original\"",
      "• \"Cambia el asistente a traducción limpia de una sola ranura\"",
      "• \"Restablece las ranuras predeterminadas\"",
    ],
    slotsCliTitle: "⚡️ Comandos CLI rápidos:",
    slotsCliHelp: [
      "• /slots rm source       - Ocultar la fila de texto original",
      "• /slots compact2        - Ranura doble mínima",
      "• /slots reset           - Restablecer valores predeterminados",
      "• /slots toggle <id>     - Activar/desactivar ranura",
    ],
    slotsResetSuccess: "[{pair}] Ranuras restablecidas a los valores predeterminados",
    slotsRemovedSuccess: "[{pair}] Ranura [{id}] (\"{label}\") eliminada",
    slotsRemovedSourceNote: " (La línea de texto original ya no aparecerá)",
    slotsToggled: "[{pair}] La ranura [{id}] ahora está: {status}",
    slotsAdded: "[{pair}] Ranura [{id}] \"{label}\" agregada/actualizada",
    slotsNotFound: "[{pair}] No se encontró la ranura [{id}]. Ejecute /slots para inspeccionar",
    slotsUsageAdd: "Uso: /slots add <id> <etiqueta> [instrucción...]",
    slotsUsageRm: "Uso: /slots rm <id_ranura>",
    slotsUsageToggle: "Uso: /slots toggle <id_ranura>",
    slotsUnknown: "[{pair}] Comando o ajuste preestablecido desconocido \"{cmd}\". Escriba /slots para ver la ayuda",
  },
  fr: {
    slot1Label: "Oral",
    slot2Label: "Écrit",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "fr ⇄ en",
    statusOriginal: "fr ⇄ en",
    statusEnglish: "fr ⇄ en",
    statusOff: "fr ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[fr ⇄ en] Mode [Original] activé : Votre texte reste inchangé",
    notifyEnglish: "[fr ⇄ en] Mode [Anglais] activé : Votre prompt est traduit en anglais technique",
    notifyOff: "[fr ⇄ en] Compagnon désactivé",
    notifyPaging: "[fr ⇄ en] Long texte segmenté. Appuyez sur Alt+. ou Alt+, pour parcourir",
    notifyNoHistory: "[fr ⇄ en] Aucun historique précédent",
    notifyHistoryRestored: "[fr ⇄ en] Carte précédente restaurée",
    notifyAgentHelp: "💡 Compétence lingual-tuner intégrée : Dites simplement à votre Agent \"Personnalise le compagnon : uniquement tweet et analyse, sans texte original\" pour ajuster les emplacements. Changez de langue avec /lang <code>.",
    notifyModelSwitched: "Modèle changé pour : {model}",
    notifyLangSwitched: "Langue maternelle changée en : {lang} (Note : L'autocomplétion des commandes sera actualisée après redémarrage du terminal)",
    notifyLangInvalid: "Code de langue invalide. Pris en charge : zh, ja, en, es, fr, de",
    notifyCompactOn: "[fr ⇄ en] Mode capsule sur une seule ligne activé",
    notifyCompactOff: "[fr ⇄ en] Mode arborescence complète restauré",
    notifyTimeout: "[fr ⇄ en] La traduction en anglais a expiré ; le prompt original a été transmis",
    notifyError: "[fr ⇄ en] Erreur de traduction en anglais ; le prompt original a été transmis",
    notifyModeNotFound: "[{pair}] Le mode [{mode}] n'est pas dans votre registre actif. Exécutez /lingual mode list pour voir les modes disponibles.",
    modeSwitchedTemplate: "[{pair}] Changé en [{num}. {name} ({id})] ({slot})",

    cmdDescMode: "Changer de mode [fr ⇄ en]: [Original] ➔ [Anglais] ➔ [Désactivé]",
    cmdDescStatus: "Afficher le rapport d'état et le diagnostic: /lingual-status",
    cmdDescModel: "Consulter ou changer de modèle: /lingual-model [model-id|auto]",
    cmdDescLang: "Afficher ou changer la langue maternelle: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "Basculer le mode capsule sur une ligne: /lingual-compact",
    cmdDescLast: "Réafficher la carte précédente: /lingual-last",
    cmdDescAgent: "Afficher le guide de personnalisation et de changement de langue : /lingual-agent",
    shortcutNextPage: "Passer au segment suivant",
    shortcutPrevPage: "Passer au segment précédent",

    capsuleSlot1Prefix: "Oral",
    capsuleSlot2Prefix: "Écrit",
    layoutCapsule: "Capsule sur une ligne (1-Line Capsule)",
    layoutTree: "Disposition HUD : Arbre guide gauche Trifecta (· ┌ ├ └)",

    statusReportTitle: "Rapport d'état",
    statusReportMode: "Mode actuel",
    statusReportFlow: "Flux linguistique",
    statusReportModel: "Modèle compagnon",
    statusReportCache: "Cache de session",
    statusReportLayout: "Disposition HUD : Arbre guide gauche Trifecta (· ┌ ├ └)",
    statusReportAuth: "Authentification : Processus interne Pi natif (Zéro config · Sécurisé)",
    statusReportShortcuts: "Raccourcis : /lingual (mode) · /slots (emplacements) · /lang (langue) · /lingual-compact (mise en page)",
    statusReportTuner: "Ajustement d'emplacements : Compétence lingual-tuner intégrée (décrivez vos préférences à l'Agent)",
    modeDescOriginal: "Passerelle directe · 0ms non bloquant",
    modeDescEnglish: "Mode anglais · Raisonnement approfondi",
    modeDescOff: "Désactivé",

    modelCurrentLabel: "Modèle actuel",
    modelFollowSession: "Suit la session",
    modelAvailableListHeader: "Modèles disponibles (tapez /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Suit automatiquement le modèle principal)",
    modelSelectHint: "Entrez /lingual-model <id> ou auto pour définir le modèle.",

    langUsageHint: "Utilisation : /lang <zh|ja|en|es|fr|de> [target] (ex : /lang ja ou /lang zh ja)",
    langList: [
      "• zh (Chinois ➔ Anglais)",
      "• ja (Japonais ➔ Anglais)",
      "• en (Anglais ➔ Japonais)",
      "• es (Espagnol ➔ Anglais)",
      "• fr (Français ➔ Anglais)",
      "• de (Allemand ➔ Anglais)",
    ],

    // Emplacements dynamiques (Français)
    slotsHeader: "Architecture d'emplacements dynamiques",
    slotsActiveTag: "actifs",
    slotsNone: "Aucun emplacement configuré",
    slotsStatusEnabled: "activé",
    slotsStatusDisabled: "désactivé",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "💬 Personnalisation en langage naturel (demandez à votre Agent) :",
    slotsNlExamples: [
      "• \"Personnalise le compagnon : uniquement tweet et analyse approfondie, sans texte original\"",
      "• \"Passe le compagnon à une traduction unique épurée\"",
      "• \"Réinitialise les emplacements par défaut\"",
    ],
    slotsCliTitle: "⚡️ Commandes CLI rapides :",
    slotsCliHelp: [
      "• /slots rm source       - Masquer la ligne de texte source",
      "• /slots compact2        - Double emplacement minimal",
      "• /slots reset           - Réinitialiser par défaut",
      "• /slots toggle <id>     - Activer/désactiver l'emplacement",
    ],
    slotsResetSuccess: "[{pair}] Emplacements réinitialisés par défaut",
    slotsRemovedSuccess: "[{pair}] Emplacement [{id}] (\"{label}\") supprimé",
    slotsRemovedSourceNote: " (La ligne source ne sera plus affichée)",
    slotsToggled: "[{pair}] L'emplacement [{id}] est maintenant : {status}",
    slotsAdded: "[{pair}] Emplacement [{id}] \"{label}\" ajouté/mis à jour",
    slotsNotFound: "[{pair}] Emplacement [{id}] introuvable. Exécutez /slots pour vérifier",
    slotsUsageAdd: "Utilisation : /slots add <id> <étiquette> [instruction...]",
    slotsUsageRm: "Utilisation : /slots rm <id_emplacement>",
    slotsUsageToggle: "Utilisation : /slots toggle <id_emplacement>",
    slotsUnknown: "[{pair}] Commande ou préréglage inconnu \"{cmd}\". Tapez /slots pour afficher l'aide",
  },
  de: {
    slot1Label: "Gesprochen",
    slot2Label: "Schriftlich",
    vocabLabel: "Wortschatz",
    sourceLabel: "Quelle",
    hudTitle: "de ⇄ en",
    statusOriginal: "de ⇄ en",
    statusEnglish: "de ⇄ en",
    statusOff: "de ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[de ⇄ en] Modus [Original] aktiviert: Eingabe wird unverändert weitergeleitet",
    notifyEnglish: "[de ⇄ en] Modus [Englisch] aktiviert: Eingabe wird in technisches Englisch übersetzt",
    notifyOff: "[de ⇄ en] Begleiter deaktiviert",
    notifyPaging: "[de ⇄ en] Langer Text segmentiert. Mit Alt+. oder Alt+, blättern",
    notifyNoHistory: "[de ⇄ en] Kein vorheriger Eintrag vorhanden",
    notifyHistoryRestored: "[de ⇄ en] Vorherige Karte wiederhergestellt",
    notifyAgentHelp: "💡 Integrierter lingual-tuner Skill: Sagen Sie Ihrem Agenten einfach \"Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext\", um Slots anzupassen. Sprache wechseln mit /lang <code>.",
    notifyModelSwitched: "Modell gewechselt zu: {model}",
    notifyLangSwitched: "Muttersprache geändert zu: {lang} (Hinweis: Befehlsbeschreibungen werden nach dem Terminal-Neustart vollständig aktualisiert)",
    notifyLangInvalid: "Ungültiger Sprachcode. Unterstützt: zh, ja, en, es, fr, de",
    notifyCompactOn: "[de ⇄ en] Einzeiliger Kapselmodus aktiviert",
    notifyCompactOff: "[de ⇄ en] Vollständige Baumansicht wiederhergestellt",
    notifySlotSwitched: "[de ⇄ en] Slot-Architektur auf [{preset}] umgestellt: {desc}",
    notifyTimeout: "[de ⇄ en] Englische Übersetzung hat das Zeitlimit überschritten; Originaltext wurde übergeben",
    notifyError: "[de ⇄ en] Fehler bei der englischen Übersetzung; Originaltext wurde übergeben",
    notifyModeNotFound: "[{pair}] Modus [{mode}] ist nicht im aktiven Register. Führen Sie /lingual mode list aus, um verfügbare Modi anzuzeigen.",
    modeSwitchedTemplate: "[{pair}] Gewechselt zu [{num}. {name} ({id})] ({slot})",

    cmdDescMode: "Modus umschalten [de ⇄ en]: [Original] ➔ [Englisch] ➔ [Aus]",
    cmdDescStatus: "Statusbericht und Modell-Diagnose anzeigen: /lingual-status",
    cmdDescModel: "Modell prüfen oder wechseln: /lingual-model [model-id|auto]",
    cmdDescLang: "Muttersprache anzeigen oder wechseln: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Slot-Architektur anzeigen/umstellen: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Einzeiligen Kapselmodus umschalten: /lingual-compact",
    cmdDescLast: "Vorherige Karte erneut anzeigen: /lingual-last",
    cmdDescAgent: "Anleitung zur Anpassung und Sprachumstellung anzeigen: /lingual-agent",
    shortcutNextPage: "Zum nächsten Segment wechseln",
    shortcutPrevPage: "Zum vorherigen Segment wechseln",

    capsuleSlot1Prefix: "Ges",
    capsuleSlot2Prefix: "Sch",
    layoutCapsule: "Einzeilige Kapsel (1-Line Capsule)",
    layoutTree: "HUD-Layout: Trifecta Minimalistische Baumstruktur (· ┌ ├ └)",

    statusReportTitle: "Statusbericht",
    statusReportMode: "Aktueller Modus",
    statusReportFlow: "Sprachfluss",
    statusReportModel: "Begleitmodell",
    statusReportCache: "Sitzungscache",
    statusReportLayout: "HUD-Layout: Trifecta Minimalistische Baumstruktur (· ┌ ├ └)",
    statusReportAuth: "Authentifizierung: Pi nativer In-Process Modus (Zero Config · Sicher)",
    statusReportShortcuts: "Befehle: /lingual (Modus) · /slots (Slots) · /lang (Sprache) · /lingual-compact (Layout)",
    statusReportTuner: "Slot-Anpassung: Integrierter lingual-tuner Skill (Präferenzen einfach dem Agenten beschreiben)",
    modeDescOriginal: "Direkt · 0ms nicht blockierend",
    modeDescEnglish: "Englisch-Modus · Tiefgreifende Logik",
    modeDescOff: "Aus",

    modelCurrentLabel: "Aktuelles Modell",
    modelFollowSession: "Sitzungsmodell",
    modelAvailableListHeader: "Verfügbare Modelle (/lingual-model <id> ausführen):",
    modelAutoFollowDesc: "auto (Folgt automatisch dem aktiven Sitzungsmodell)",
    modelSelectHint: "Geben Sie /lingual-model <id> oder auto ein.",

    langUsageHint: "Verwendung: /lang <zh|ja|en|es|fr|de> [target] (z.B. /lang ja oder /lang zh ja)",
    langList: [
      "• zh (Chinesisch ➔ Englisch)",
      "• ja (Japanisch ➔ Englisch)",
      "• en (Englisch ➔ Japanisch)",
      "• es (Spanisch ➔ Englisch)",
      "• fr (Französisch ➔ Englisch)",
      "• de (Deutsch ➔ Englisch)",
    ],

    // Dynamische Slot-Architektur (Deutsch)
    slotsHeader: "Dynamische Slot-Architektur",
    slotsActiveTag: "aktiv",
    slotsNone: "Keine Slots konfiguriert",
    slotsStatusEnabled: "aktiviert",
    slotsStatusDisabled: "deaktiviert",
    slotsWithNuance: " +Nuance",
    slotsNlTitle: "💬 Anpassung in natürlicher Sprache (fragen Sie Ihren Agenten direkt):",
    slotsNlExamples: [
      "• \"Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext\"",
      "• \"Stellen Sie auf reine einzeilige Übersetzung um\"",
      "• \"Slots auf Standard zurücksetzen\"",
    ],
    slotsCliTitle: "⚡️ Schnelle CLI-Befehle:",
    slotsCliHelp: [
      "• /slots rm source       - Originaltextzeile ausblenden",
      "• /slots compact2        - Minimaler Doppel-Slot",
      "• /slots reset           - Auf Standard zurücksetzen",
      "• /slots toggle <id>     - Slot aktivieren/deaktivieren",
    ],
    slotsResetSuccess: "[{pair}] Slots auf Standard zurückgesetzt",
    slotsRemovedSuccess: "[{pair}] Slot [{id}] (\"{label}\") entfernt",
    slotsRemovedSourceNote: " (Originaltextzeile wird nicht mehr angezeigt)",
    slotsToggled: "[{pair}] Slot [{id}] ist jetzt: {status}",
    slotsAdded: "[{pair}] Slot [{id}] \"{label}\" hinzugefügt/aktualisiert",
    slotsNotFound: "[{pair}] Slot [{id}] nicht gefunden. Führen Sie /slots aus",
    slotsUsageAdd: "Verwendung: /slots add <id> <Label> [Anweisung...]",
    slotsUsageRm: "Verwendung: /slots rm <Slot-ID>",
    slotsUsageToggle: "Verwendung: /slots toggle <Slot-ID>",
    slotsUnknown: "[{pair}] Unbekannter Befehl oder Preset \"{cmd}\". /slots für Hilfe eingeben",
  },
  ko: {
    slot1Label: "구어체",
    slot2Label: "문어체",
    vocabLabel: "핵심표현",
    sourceLabel: "원문",
    hudTitle: "ko ⇄ en",
    statusOriginal: "ko ⇄ en",
    statusEnglish: "ko ⇄ en",
    statusOff: "ko ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[ko ⇄ en] [원문 모드] 활성화: 원문이 그대로 전달됩니다",
    notifyEnglish: "[ko ⇄ en] [영어 모드] 활성화: 기술 영어로 자동 변환되어 전달됩니다",
    notifyOff: "[ko ⇄ en] 동반 모드 꺼짐",
    notifyPaging: "[ko ⇄ en] 장문 분할됨. Alt+. 또는 Alt+, 키로 탐색",
    notifyNoHistory: "[ko ⇄ en] 이전 기록이 없습니다",
    notifyHistoryRestored: "[ko ⇄ en] 이전 카드가 복원되었습니다",
    notifyAgentHelp: "💡 lingual-tuner 기능 내장: 에이전트에게 \"원문 없이 핵심 요약만 표시해줘\"라고 요청하면 자동 설정됩니다.",
    notifyModelSwitched: "동반 모델 변경됨: {model}",
    notifyLangSwitched: "모국어 변경됨: {lang}",
    notifyLangInvalid: "유효하지 않은 언어 코드입니다. 지원: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ko ⇄ en] 단일 행 캡슐 모드 켜짐",
    notifyCompactOff: "[ko ⇄ en] 트리 레이아웃 복원됨",
    notifyTimeout: "[ko ⇄ en] 번역 시간 초과; 원문이 그대로 전달되었습니다",
    notifyError: "[ko ⇄ en] 번역 오류; 원문이 그대로 전달되었습니다",
    notifyModeNotFound: "[{pair}] 모드 [{mode}]가 활성 레지스트리에 없습니다. /lingual mode list로 확인하세요.",
    modeSwitchedTemplate: "[{pair}] 【{num}. {name} ({id})】(으)로 전환되었습니다 ({slot})",

    cmdDescMode: "모드 전환 [ko ⇄ en]: [원문] ➔ [영어] ➔ [끔]",
    cmdDescStatus: "상태 보고서 및 진단 확인: /lingual-status",
    cmdDescModel: "모델 확인 및 변경: /lingual-model [model-id|auto]",
    cmdDescLang: "모국어 확인 및 변경: /lingual-lang",
    cmdDescSlots: "슬롯 구성 변경: /slots",
    cmdDescCompact: "단일 행 캡슐 모드 토글: /lingual-compact",
    cmdDescLast: "이전 카드 다시 보기: /lingual-last",
    cmdDescAgent: "사용자 설정 가이드: /lingual-agent",
    shortcutNextPage: "다음 세그먼트로 이동",
    shortcutPrevPage: "이전 세그먼트로 이동",

    capsuleSlot1Prefix: "구",
    capsuleSlot2Prefix: "문",
    layoutCapsule: "단일 행 캡슐 (1-Line Capsule)",
    layoutTree: "Trifecta 좌측 레일 트리 (· ┌ ├ └)",

    statusReportTitle: "상태 보고서",
    statusReportMode: "현재 모드",
    statusReportFlow: "언어 흐름",
    statusReportModel: "동반 모델",
    statusReportCache: "세션 캐시",
    statusReportLayout: "HUD 레이아웃: Trifecta 좌측 레일 트리 (· ┌ ├ └)",
    statusReportAuth: "인증 모드: Pi 프로세스 내 직접 인증 (Zero Config)",
    statusReportShortcuts: "명령어: /lingual (모드) · /slots (슬롯) · /lang (언어) · /lingual-compact (레이아웃)",
    statusReportTuner: "슬롯 튜너: lingual-tuner 내장",
    modeDescOriginal: "원문 직통 · 0ms 비차단",
    modeDescEnglish: "영어 모드 · 심층 코드 추론",
    modeDescOff: "꺼짐",

    modelCurrentLabel: "현재 모델",
    modelFollowSession: "세션 따름",
    modelAvailableListHeader: "사용 가능한 모델 (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (현재 세션 주 모델 자동 추종)",
    modelSelectHint: "/lingual-model <id> 또는 auto 지정.",

    langUsageHint: "사용법: /lang <코드> [목표언어]",
    langList: [
      "• zh (중국어 ➔ 영어)",
      "• ja (일본어 ➔ 영어)",
      "• en (영어 ➔ 일본어/한국어)",
      "• ko (한국어 ➔ 영어)",
      "• es (스페인어 ➔ 영어)",
      "• fr (프랑스어 ➔ 영어)",
      "• de (독일어 ➔ 영어)",
      "• ru (러시아어 ➔ 영어)",
    ],

    slotsHeader: "동적 슬롯 아키텍처",
    slotsActiveTag: "활성",
    slotsNone: "구성된 슬롯 없음",
    slotsStatusEnabled: "활성화됨",
    slotsStatusDisabled: "비활성화됨",
    slotsWithNuance: " +뉘앙스",
    slotsNlTitle: "💬 자연어 설정:",
    slotsNlExamples: [
      "• \"원문 없이 캐주얼과 격식체만 보여줘\"",
      "• \"단일 행 순수 번역으로 변경해줘\"",
      "• \"기본 슬롯으로 복원해줘\"",
    ],
    slotsCliTitle: "⚡️ 빠른 CLI 명령어:",
    slotsCliHelp: [
      "• /slots rm source       - 원문 행 숨기기",
      "• /slots compact2        - 최소 듀얼 슬롯",
      "• /slots reset           - 기본값으로 복원",
      "• /slots toggle <id>     - 슬롯 켜기/끄기",
    ],
    slotsResetSuccess: "[{pair}] 슬롯이 기본값으로 복원되었습니다",
    slotsRemovedSuccess: "[{pair}] 슬롯 [{id}] (\"{label}\") 제거됨",
    slotsRemovedSourceNote: " (원문 행이 더 이상 표시되지 않습니다)",
    slotsToggled: "[{pair}] 슬롯 [{id}] 상태: {status}",
    slotsAdded: "[{pair}] 슬롯 [{id}] \"{label}\" 추가/업데이트됨",
    slotsNotFound: "[{pair}] 슬롯 [{id}]을(를) 찾을 수 없습니다",
    slotsUsageAdd: "사용법: /slots add <id> <라벨> [프롬프트...]",
    slotsUsageRm: "사용법: /slots rm <슬롯_id>",
    slotsUsageToggle: "사용법: /slots toggle <슬롯_id>",
    slotsUnknown: "[{pair}] 알 수 없는 명령어 \"{cmd}\". /slots 도움말 참조",
  },
  ru: {
    slot1Label: "Разговорный",
    slot2Label: "Деловой",
    vocabLabel: "Лексика",
    sourceLabel: "Оригинал",
    hudTitle: "ru ⇄ en",
    statusOriginal: "ru ⇄ en",
    statusEnglish: "ru ⇄ en",
    statusOff: "ru ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[ru ⇄ en] Режим [Оригинал]: ваш текст передается без изменений",
    notifyEnglish: "[ru ⇄ en] Режим [Английский]: запрос переводится на технический английский",
    notifyOff: "[ru ⇄ en] Помощник выключен",
    notifyPaging: "[ru ⇄ en] Длинный текст разбит на сегменты. Нажмите Alt+. или Alt+,",
    notifyNoHistory: "[ru ⇄ en] Нет предыдущей записи",
    notifyHistoryRestored: "[ru ⇄ en] Предыдущая карточка восстановлена",
    notifyAgentHelp: "💡 Навык lingual-tuner: просто скажите Агенту настроить слоты без ручных команд.",
    notifyModelSwitched: "Модель переключена на: {model}",
    notifyLangSwitched: "Язык переключен на: {lang}",
    notifyLangInvalid: "Неверный код языка. Поддерживаются: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ru ⇄ en] Однострочный режим капсулы включен",
    notifyCompactOff: "[ru ⇄ en] Полное дерево восстановлено",
    notifyTimeout: "[ru ⇄ en] Время ожидания перевода истекло; передан оригинал",
    notifyError: "[ru ⇄ en] Ошибка перевода; передан оригинал",
    notifyModeNotFound: "[{pair}] Режим [{mode}] не найден в активном реестре. Введите /lingual mode list для списка.",
    modeSwitchedTemplate: "[{pair}] Переключено на [{num}. {name} ({id})] ({slot})",

    cmdDescMode: "Переключить режим [ru ⇄ en]: [Оригинал] ➔ [Английский] ➔ [Выкл]",
    cmdDescStatus: "Отчет о состоянии и диагностика: /lingual-status",
    cmdDescModel: "Проверить или сменить модель: /lingual-model [model-id|auto]",
    cmdDescLang: "Проверить или сменить язык: /lingual-lang",
    cmdDescSlots: "Настроить слоты: /slots",
    cmdDescCompact: "Переключить режим капсулы: /lingual-compact",
    cmdDescLast: "Показать предыдущую карточку: /lingual-last",
    cmdDescAgent: "Руководство по настройке: /lingual-agent",
    shortcutNextPage: "Перейти к следующему сегменту",
    shortcutPrevPage: "Перейти к предыдущему сегменту",

    capsuleSlot1Prefix: "Разг",
    capsuleSlot2Prefix: "Дел",
    layoutCapsule: "Однострочная капсула (1-Line Capsule)",
    layoutTree: "Trifecta левонаправленное дерево (· ┌ ├ └)",

    statusReportTitle: "Отчет о состоянии",
    statusReportMode: "Текущий режим",
    statusReportFlow: "Поток языков",
    statusReportModel: "Модель помощника",
    statusReportCache: "Кэш сессии",
    statusReportLayout: "HUD: Trifecta левонаправленное дерево (· ┌ ├ └)",
    statusReportAuth: "Аутентификация: Встроенный процесс Pi (Zero Config)",
    statusReportShortcuts: "Команды: /lingual (режим) · /slots (слоты) · /lang (язык)",
    statusReportTuner: "Настройка слотов: встроенный навык lingual-tuner",
    modeDescOriginal: "Оригинал · 0мс без блокировки",
    modeDescEnglish: "Английский режим · глубокое рассуждение",
    modeDescOff: "Выключено",

    modelCurrentLabel: "Текущая модель",
    modelFollowSession: "Следовать за сессией",
    modelAvailableListHeader: "Доступные модели (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (автоматически следовать за моделью сессии)",
    modelSelectHint: "Используйте /lingual-model <id> или auto.",

    langUsageHint: "Использование: /lang <код> [целевой_язык]",
    langList: [
      "• zh (Китайский ➔ Английский)",
      "• ja (Японский ➔ Английский)",
      "• en (Английский ➔ Русский/Японский)",
      "• ko (Корейский ➔ Английский)",
      "• es (Испанский ➔ Английский)",
      "• fr (Французский ➔ Английский)",
      "• de (Немецкий ➔ Английский)",
      "• ru (Русский ➔ Английский)",
    ],

    slotsHeader: "Архитектура динамических слотов",
    slotsActiveTag: "активны",
    slotsNone: "Слоты не настроены",
    slotsStatusEnabled: "включен",
    slotsStatusDisabled: "отключен",
    slotsWithNuance: " +нюанс",
    slotsNlTitle: "💬 Настройка естественным языком:",
    slotsNlExamples: [
      "• \"Сделай только разговорный и деловой стиль, без оригинала\"",
      "• \"Переключи на чистый однострочный перевод\"",
      "• \"Сбрось слоты на значения по умолчанию\"",
    ],
    slotsCliTitle: "⚡️ Быстрые команды CLI:",
    slotsCliHelp: [
      "• /slots rm source       - Скрыть строку оригинала",
      "• /slots compact2        - Минимальный двойной слот",
      "• /slots reset           - Сбросить на стандартные",
      "• /slots toggle <id>     - Включить/выключить слот",
    ],
    slotsResetSuccess: "[{pair}] Слоты сброшены на стандартные",
    slotsRemovedSuccess: "[{pair}] Слот [{id}] (\"{label}\") удален",
    slotsRemovedSourceNote: " (Строка оригинала больше не отображается)",
    slotsToggled: "[{pair}] Слот [{id}] теперь: {status}",
    slotsAdded: "[{pair}] Слот [{id}] \"{label}\" добавлен/обновлен",
    slotsNotFound: "[{pair}] Слот [{id}] не найден",
    slotsUsageAdd: "Использование: /slots add <id> <метка> [инструкция...]",
    slotsUsageRm: "Использование: /slots rm <id_слота>",
    slotsUsageToggle: "Использование: /slots toggle <id_слота>",
    slotsUnknown: "[{pair}] Неизвестная команда \"{cmd}\". Введите /slots для справки",
  },
};

/**
 * Canonical language codes advertised by the extension (help text, banner, factory mode seeds).
 * Any code here must be switchable via /lang; chrome falls back to the universal English baseline
 * unless a native preset exists.
 */
export const SUPPORTED_LANG_CODES: string[] = ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"];

export function isSupportedLangCode(code: string): boolean {
  return SUPPORTED_LANG_CODES.includes((code || "").toLowerCase().split(/[-_]/)[0]);
}

/** Maps developer-typed language words (native script, English names, ISO aliases) to a code. */
export function normalizeLangCode(input: string): string {
  const s = (input || "").trim().toLowerCase().replace(/[-_].*$/, "");
  if (s === "zh" || s === "cn" || s === "chinese" || s === "中文") return "zh";
  if (s === "tw" || s === "zh-tw" || s === "traditional" || s === "繁中" || s === "繁體中文") return "tw";
  if (s === "ja" || s === "jp" || s === "japanese" || s === "日本語" || s === "日文" || s === "日语") return "ja";
  if (s === "ko" || s === "kr" || s === "korean" || s === "한국어" || s === "韩语" || s === "韩文" || s === "韓語" || s === "韓文") return "ko";
  if (s === "en" || s === "eng" || s === "english" || s === "英语" || s === "英文") return "en";
  if (s === "es" || s === "spanish" || s === "español" || s === "西语" || s === "西班牙语") return "es";
  if (s === "fr" || s === "french" || s === "français" || s === "法语" || s === "法文") return "fr";
  if (s === "de" || s === "german" || s === "deutsch" || s === "德语" || s === "德文") return "de";
  if (s === "ru" || s === "russian" || s === "русский" || s === "俄语" || s === "俄文") return "ru";
  return s;
}

/**
 * Resolves a developer-supplied "source target" pair, rejecting unvalidated free text
 * so a stray keystroke can never poison the persisted configuration.
 */
export function resolveLangPair(input: string, fallbackPair: string): { source: string; target: string } {
  const [fallbackSource, fallbackTarget] = (fallbackPair || "en ja").trim().split(/\s+/);
  const [rawSource, rawTarget] = (input || "").trim().split(/\s+/);
  const normalizedSource = normalizeLangCode(rawSource || "");
  const normalizedTarget = normalizeLangCode(rawTarget || "");
  const source = isSupportedLangCode(normalizedSource) ? normalizedSource : fallbackSource || "en";
  const target = isSupportedLangCode(normalizedTarget)
    ? normalizedTarget
    : source === "en"
      ? fallbackTarget && isSupportedLangCode(fallbackTarget) && fallbackTarget !== "en"
        ? fallbackTarget
        : "ja"
      : "en";
  return { source, target: target === source ? (source === "en" ? "ja" : "en") : target };
}

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
  // Traditional Chinese shares the Chinese chrome baseline (no separate tw preset exists).
  const presetKey = norm === "tw" ? "zh" : norm;
  const target = LANGUAGE_PRESETS[presetKey] || LANGUAGE_PRESETS.en;
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
