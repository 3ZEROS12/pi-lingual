import type { CustomModeConfig, LingualI18nLabels, SlotConfig, PromptSlotConfig, ReasoningEffort } from "./types.js";
export type { ReasoningEffort } from "./types.js";

export interface SlotPresetDefinition {
  name: string;
  description: string;
  slots: (sourceLang?: string) => SlotConfig[];
}

export { getDefaultSlots, getDefaultDirectSlots, getDefaultPromptSlots, getDefaultModifySlots, localizeSlotLabel } from "./prompts.js";
import { getDefaultDirectSlots, getDefaultModifySlots, getDefaultSlots, getDefaultPromptSlots, localizeSlotLabel } from "./prompts.js";

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
    liveFlow: "Flujo en Vivo",
    candidates: "Candidatos",
    loadoutSpec: "Spec Lógica",
    loadoutCommit: "Commit Deshidratado",
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
    liveFlow: "Flux en Direct",
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
    liveFlow: "Live-Fluss",
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
    liveFlow: "Живой поток",
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
      const OFF_MAP: Record<string, string> = {
        zh: "已关闭",
        tw: "已關閉",
        ja: "オフ",
        ko: "꺼짐",
        es: "Apagado",
        fr: "Désactivé",
        de: "Aus",
        ru: "Выкл",
        en: "Off",
      };
      const norm = (lang || "en").toLowerCase().split("-")[0];
      return OFF_MAP[norm] || OFF_MAP.en;
    }
    default:
      return modeId;
  }
}

/**
 * Dynamically localizes standard mode names to the active native language.
 * Guarantees zero Chinese characters appear in UI mode names when sourceLang is not Chinese (RFC 2119 Invariant 18).
 */
export function localizeModeName(modeId: string, currentName: string, sourceLang = "en"): string {
  const isChineseSource = sourceLang === "zh" || sourceLang === "tw";
  const hasChinese = /[\u4e00-\u9fa5]/.test(currentName || "");
  const normId = (modeId || "").toLowerCase();

  // If source is not Chinese and name has Chinese or is empty, or matches known standard modes
  if (!isChineseSource && (hasChinese || !currentName)) {
    return resolveModeDisplayName(normId, sourceLang);
  }

  // If standard factory modes, ensure canonical display name matches sourceLang
  if (!isChineseSource && (normId === "companion" || normId === "original" || normId === "direct" || normId === "live-flow" || normId === "off" || normId === "candidates")) {
    return resolveModeDisplayName(normId, sourceLang);
  }

  return currentName || resolveModeDisplayName(normId, sourceLang);
}

/**
 * Normalizes and dynamically localizes a list of modes and their nested slots to sourceLang.
 */
export function localizeModes(
  modes: CustomModeConfig[],
  sourceLang = "en",
  explainLang?: string
): CustomModeConfig[] {
  return modes.map((m) => {
    const localizedName = localizeModeName(m.id, m.name, sourceLang);
    const localizedSlots = Array.isArray(m.slots)
      ? m.slots.map((s) => ({
          ...s,
          label: localizeSlotLabel(s.id, s.label, sourceLang),
        }))
      : [];

    return {
      ...m,
      name: localizedName,
      slots: localizedSlots,
    };
  });
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
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Compile user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a high-signal AI Coding Agent Prompt (Intent Compiler). (1) Start with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'); (2) Isolate the core technical objective; (3) Extract explicit or implicit negative constraints (minimal diff, blast radius guard, leave unrelated files untouched, zero speculative scaffolding); (4) Preserve all code tokens, file paths, and CLI flags 100% verbatim; (5) Resolve anaphoric pronouns ('this function', 'here', 'as discussed') cleanly when context permits; (6) Eliminate conversational filler and AI clichés. NEVER invent unmentioned files or unrequested features.",
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
    description: "Extracts git diff and intent into conventional commits format (first line <=72 chars, imperative verb, Root Cause & Impact body)",
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
            "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate strict Conventional Commits format (e.g. 'fix(scope): ...' or 'feat(scope): ...'). First line MUST be <= 72 characters starting directly with an imperative active verb (e.g. 'Prevent', 'Clear', 'Guard against', 'Handle'). Body must state strictly Root Cause and Impact without AI filler.",
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
    notifyModeLockedCycleBlocked: "[{pair}] Mode is locked to [{mode}]. Run /lingual unlock to cycle modes or specify mode directly.",
    notifyModeLockedSuccess: "[{pair}] Session mode locked to [{mode}]. Mode cycling is blocked. Run /lingual unlock to release.",
    notifyModeUnlockedSuccess: "[{pair}] Mode lock released. Free mode cycling and configuration sync restored.",
    notifyUnrecognizedSubcommand: "[{pair}] Unrecognized subcommand: \"{cmd}\". Current mode unchanged. Available: /lingual [1|2|3|0|on|off|lang|last|lock|status] or /l",
    notifyClipboardCopied: "Copied to clipboard (prompt intercepted - not sent to agent). Ready to paste into GitHub, PR, or X.",
    notifyTargetSwitched: "Target language switched to: {target} (native {source} unchanged)",
    langHelpText: "[Companion Language: {flow}]\n• Quick switch: /lang ja (target Japanese) · /lang en (target English)\n• Pair switch: /lang en ja · /lang ja en · /lang es en\n• Supported codes: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Switched to [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] optimizing prompt...",
    loadingFixSyntax: "  ⋯ [lingual] fixing syntax & typos...",
    loadingCandidates: "  ⋯ [lingual] generating prompt candidates...",
    statusLoadingOptimize: "[lingual] optimizing...",
    statusLoadingFix: "[lingual] fixing...",
    statusLoadingCandidates: "[lingual] generating candidates...",

    cmdDescMode: "Interactive mode picker or manage: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Display companion status report & model diagnostics: /lingual status",
    cmdDescModel: "View or change companion model: /lingual model [model-id|auto]",
    cmdDescLang: "Switch companion language: /lingual lang <pair> or /lang <pair>",
    cmdDescLast: "Replay previous companion card: /lingual last (or /last)",
    shortcutNextPage: "Next companion page segment",
    shortcutPrevPage: "Previous companion page segment",
    modePickerTitle: "Mode Switch",
    modePickerHint: "Press 1/2/3/0 to switch, Esc to cancel",

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
    statusReportShortcuts: "Shortcuts: /lingual (or /l) · /lingual lang (or /lang) · /lingual last · /lingual compact",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill",
    modeDescOriginal: "Companion · 0ms pass-through",
    modeDescEnglish: "Direct · Deep code reasoning",
    modeDescLiveFlow: "Live Flow · i18n takeaway diffs",
    modeDescOff: "Disabled",

    modelCurrentLabel: "Current companion model",
    modelFollowSession: "follow session",
    modelAvailableListHeader: "Available models (/lingual model <id>):",

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
    notifyModeLockedCycleBlocked: "[{pair}] 当前模式已锁定在【{mode}】。如需轮转，请先输入 /lingual unlock 解锁，或使用 /lingual 1|2|3|0 显式指定。",
    notifyModeLockedSuccess: "[{pair}] 会话模式已锁定在【{mode}】。防止外部进程覆盖与无意轮转，输入 /lingual unlock 可解锁。",
    notifyModeUnlockedSuccess: "[{pair}] 模式锁定已解除（已解锁），恢复自由轮转与外部配置同步。",
    notifyUnrecognizedSubcommand: "[{pair}] 未识别的子命令: \"{cmd}\"。当前模式保持不变。可用命令: /lingual [1|2|3|0|on|off|lang|last|lock|status] 或 /l",
    notifyClipboardCopied: "已复制到剪贴板（已拦截提示词，未发给 Agent）。可直接粘贴至 GitHub、PR 或发推。",
    notifyTargetSwitched: "目标语言已切换为: {target}（母语 {source} 保持不变）",
    langHelpText: "[当前伴学语言: {flow}]\n• 常用切换: /lang ja (切换目标为日语) · /lang en (切换目标为英语)\n• 双向切换: /lang zh ja · /lang ja en · /lang en zh\n• 支持语种: zh (中文), tw (繁中), ja (日语), ko (韩语), en (英语), es (西语), fr (法语), de (德语), ru (俄语)",
    modeSwitchedTemplate: "[{pair}] 已切换至【{num}. {name} ({id})】({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] 规范优化提示词中...",
    loadingFixSyntax: "  ⋯ [lingual] 修补语法与错词中...",
    loadingCandidates: "  ⋯ [lingual] 生成候选提示词中...",
    statusLoadingOptimize: "[lingual] 优化中...",
    statusLoadingFix: "[lingual] 修补中...",
    statusLoadingCandidates: "[lingual] 候选生成中...",

    cmdDescMode: "交互式伴学模式切换或管理: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "查看伴学状态与模型诊断: /lingual status",
    cmdDescModel: "查看或切换伴学模型: /lingual model [model-id|auto]",
    cmdDescLang: "切换伴学语言: /lingual lang <代码> 或 /lang <代码>",
    cmdDescLast: "回看上一条伴学卡片: /lingual last (或 /last)",
    shortcutNextPage: "切换至下一段伴学切片",
    shortcutPrevPage: "切换至上一段伴学切片",
    modePickerTitle: "伴学模式切换",
    modePickerHint: "按数字键 1/2/3/0 直接生效，Esc 取消",

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
    statusReportShortcuts: "快捷操作: /lingual (或 /l) · /lingual lang (或 /lang) · /lingual last · /lingual compact",
    statusReportTuner: "槽位调优: 内置 lingual-tuner 槽位调优技能（直接向 Agent 描述即可免命令定制）",
    modeDescOriginal: "原文直通 · 0ms非阻塞",
    modeDescEnglish: "英文模式 · 深度代码推理",
    modeDescLiveFlow: "实时改写 · 0ms直发保留情绪",
    modeDescOff: "已关闭",

    modelCurrentLabel: "当前伴学模型",
    modelFollowSession: "跟随会话",
    modelAvailableListHeader: "可用模型列表 (/lingual model <id>):",

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
  tw: {
    slot1Label: "口語",
    slot2Label: "寫作",
    vocabLabel: "重點",
    sourceLabel: "原文",
    hudTitle: "tw ⇄ en",
    statusOriginal: "tw ⇄ en",
    statusEnglish: "tw ⇄ en",
    statusOff: "tw ⇄ en: off",
    subNuanceLabel: "↳",

    notifyOriginal: "[tw ⇄ en] 已切換至【原文模式】：輸入保持純淨母語，上方 HUD 浮現伴學視窗",
    notifyEnglish: "[tw ⇄ en] 已切換至【英文模式】：發給 AI 的輸入將自動轉換為純正技術英文",
    notifyOff: "[tw ⇄ en] 已關閉伴學",
    notifyPaging: "[tw ⇄ en] 長句已切分多段，按 Alt+. 或 Alt+, 翻頁瀏覽",
    notifyNoHistory: "[tw ⇄ en] 暫無上一條伴學記錄",
    notifyHistoryRestored: "[tw ⇄ en] 已重新顯示上一條伴學卡片",
    notifyAgentHelp: "💡 內建 lingual-tuner 槽位調優技能：直接對當前 Agent 說 \"幫我定制伴學\" 即可免命令自動裝配！",
    notifyModelSwitched: "伴學模型已切換為: {model}",
    notifyLangSwitched: "伴學語言已切換為: {lang}",
    notifyLangInvalid: "無效的語言代碼。支援: zh, tw, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[tw ⇄ en] 已開啟單行膠囊模式：極簡占位",
    notifyCompactOff: "[tw ⇄ en] 已切換為左導軌樹狀架構：展示完整多槽與語感",
    notifyTimeout: "[tw ⇄ en] 提示詞優化請求未就緒或超時，本次已放行原文",
    notifyError: "[tw ⇄ en] 提示詞優化請求異常，本次已放行原文",
    notifyModeNotFound: "[{pair}] 模式【{mode}】不在當前註冊表中。輸入 /lingual mode list 查看可用模式。",
    notifyModeLockedCycleBlocked: "[{pair}] 當前模式已鎖定在【{mode}】。如需輪轉，請先輸入 /lingual unlock 解鎖，或使用 /lingual 1|2|3|0 顯式指定。",
    notifyModeLockedSuccess: "[{pair}] 會話模式已鎖定在【{mode}】。防止外部進程覆蓋與無意輪轉，輸入 /lingual unlock 可解鎖。",
    notifyModeUnlockedSuccess: "[{pair}] 模式鎖定已解除（已解鎖），恢復自由輪轉與外部配置同步。",
    notifyUnrecognizedSubcommand: "[{pair}] 未識別的子命令: \"{cmd}\"。當前模式保持不變。可用命令: /lingual [1|2|3|0|on|off|lang|last|lock|status] 或 /l",
    notifyClipboardCopied: "已複製到剪貼簿（已攔截提示詞，未發給 Agent）。可直接貼上至 GitHub、PR 或發推。",
    notifyTargetSwitched: "目標語言已切換為: {target}（母語 {source} 保持不變）",
    langHelpText: "[當前伴學語言: {flow}]\n• 常用切換: /lang ja (切換目標為日語) · /lang en (切換目標為英語)\n• 雙向切換: /lang tw ja · /lang ja en · /lang en zh\n• 支援語種: zh (中文), tw (繁中), ja (日語), ko (韓語), en (英語), es (西語), fr (法語), de (德語), ru (俄語)",
    modeSwitchedTemplate: "[{pair}] 已切換至【{num}. {name} ({id})】({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] 規範優化提示詞中...",
    loadingFixSyntax: "  ⋯ [lingual] 修補語法與錯詞中...",
    loadingCandidates: "  ⋯ [lingual] 生成候選提示詞中...",
    statusLoadingOptimize: "[lingual] 優化中...",
    statusLoadingFix: "[lingual] 修補中...",
    statusLoadingCandidates: "[lingual] 候選生成中...",

    cmdDescMode: "互動式伴學模式切換或管理: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "查看伴學狀態與模型診斷: /lingual status",
    cmdDescModel: "查看或切換伴學模型: /lingual model [model-id|auto]",
    cmdDescLang: "切換伴學語言: /lingual lang <代碼> 或 /lang <代碼>",
    cmdDescLast: "回看上一條伴學卡片: /lingual last (或 /last)",
    shortcutNextPage: "切換至下一段伴學切片",
    shortcutPrevPage: "切換至上一段伴學切片",
    modePickerTitle: "伴學模式切換",
    modePickerHint: "按數字鍵 1/2/3/0 直接生效，Esc 取消",

    capsuleSlot1Prefix: "口",
    capsuleSlot2Prefix: "寫",
    layoutCapsule: "單行膠囊極簡流 (1-Line Capsule)",
    layoutTree: "Trifecta 開放式左導軌樹狀架構 (· ┌ ├ └)",

    statusReportTitle: "運行狀態報告",
    statusReportMode: "當前模式",
    statusReportFlow: "語言流向",
    statusReportModel: "伴學模型",
    statusReportCache: "會話快取",
    statusReportLayout: "HUD佈局: Trifecta 開放式左導軌樹狀架構",
    statusReportAuth: "憑據模式: Pi 原生進程內認證 (Zero Config)",
    statusReportShortcuts: "快捷指令: /lingual (或 /l) · /lingual lang (或 /lang) · /lingual last · /lingual compact",
    statusReportTuner: "槽位調優: 內建 lingual-tuner 槽位調優技能",
    modeDescOriginal: "原文直通 · 0ms 非阻塞",
    modeDescEnglish: "英文模式 · 深度代碼推理",
    modeDescLiveFlow: "即時改寫 · 0ms直發保留情緒",
    modeDescOff: "已關閉",

    modelCurrentLabel: "當前伴學模型",
    modelFollowSession: "跟隨會話",
    modelAvailableListHeader: "可用模型清單 (/lingual model <id>):",

    langUsageHint: "用法: /lang <zh|tw|ja|en|es|fr|de> [target]",
    langList: ["• zh", "• tw", "• ja", "• en", "• es", "• fr", "• de", "• ko", "• ru"],

    slotsHeader: "動態槽位架構",
    slotsActiveTag: "啟用",
    slotsNone: "尚未配置任何槽位",
    slotsStatusEnabled: "已啟用",
    slotsStatusDisabled: "已停用",
    slotsWithNuance: " +母語微釋義",
    slotsNlTitle: "💬 自然語言定制：",
    slotsNlExamples: ["• \"幫我定制伴學：只要推文和深度分析，不要原文\""],
    slotsCliTitle: "常用快捷指令：",
    slotsCliHelp: ["• /slots add <id> <label> [instruction...]", "• /slots rm <id>", "• /slots toggle <id>", "• /slots reset"],
    slotsResetSuccess: "[{pair}] 已重置槽位為初始預設狀態",
    slotsRemovedSuccess: "[{pair}] 已移除槽位 [{id}] (\"{label}\")",
    slotsRemovedSourceNote: " (已物理隱藏原文行)",
    slotsToggled: "[{pair}] 槽位 [{id}] 狀態變更為: {status}",
    slotsAdded: "[{pair}] 已新增/更新槽位 [{id}] \"{label}\"",
    slotsNotFound: "[{pair}] 找不到槽位 [{id}]",
    slotsUsageAdd: "用法: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "用法: /slots rm <slot-id>",
    slotsUsageToggle: "用法: /slots toggle <slot-id>",
    slotsUnknown: "未識別的槽位命令 \"{cmd}\"。",

    spokenLabel: "口語",
    writtenLabel: "寫作",
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
    notifyModeLockedCycleBlocked: "[{pair}] 現在のモードは【{mode}】に固定されています。巡回切替には /lingual unlock で解除するか、/lingual 1|2|3|0 で直接指定してください。",
    notifyModeLockedSuccess: "[{pair}] セッションモードを【{mode}】に固定しました。外部変更や意図しない切替を防止します。/lingual unlock で解除可能。",
    notifyModeUnlockedSuccess: "[{pair}] モード固定を解除しました。自由切替と設定同期を再開します。",
    notifyUnrecognizedSubcommand: "[{pair}] 未認識のサブコマンド: \"{cmd}\"。現在のモードを維持します。利用可能: /lingual [1|2|3|0|on|off|lang|last|lock|status] または /l",
    notifyClipboardCopied: "クリップボードにコピーしました（Agent未送信）。GitHub、PR、SNS等へ貼り付け可能。",
    notifyTargetSwitched: "ターゲット言語を {target} に変更しました（母語 {source} は維持）",
    langHelpText: "[現在の言語ペア: {flow}]\n• クイック切替: /lang en (英語へ) · /lang ja (日本語へ)\n• 双方向切替: /lang ja en · /lang en ja · /lang ja zh\n• 対応コード: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] 【{num}. {name} ({id})】に切り替えました ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] プロンプト最適化中...",
    loadingFixSyntax: "  ⋯ [lingual] 構文・誤字を修正中...",
    loadingCandidates: "  ⋯ [lingual] 候補プロンプト生成中...",
    statusLoadingOptimize: "[lingual] 最適化中...",
    statusLoadingFix: "[lingual] 修正中...",
    statusLoadingCandidates: "[lingual] 候補生成中...",

    cmdDescMode: "対話式モード切替・管理: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "ステータスレポートと診断を表示: /lingual status",
    cmdDescModel: "学習モデルの確認・切替: /lingual model [model-id|auto]",
    cmdDescLang: "言語切替: /lingual lang <code> または /lang <code>",
    cmdDescLast: "前回カード再表示: /lingual last (または /last)",
    shortcutNextPage: "次のスライスへ移動",
    shortcutPrevPage: "前のスライスへ移動",
    modePickerTitle: "伴走モード切替",
    modePickerHint: "1/2/3/0 で直行、Esc で取消",

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
    statusReportShortcuts: "ショートカット: /lingual (または /l) · /lingual lang (または /lang) · /lingual last · /lingual compact",
    statusReportTuner: "チューナー: lingual-tuner スキル",
    modeDescOriginal: "原文パススルー · 0ms非同期",
    modeDescEnglish: "直行 · コード推論",
    modeDescLiveFlow: "リアルタイム · 0ms直接送信＆差分",
    modeDescOff: "オフ",

    modelCurrentLabel: "現在の学習モデル",
    modelFollowSession: "セッション連動",
    modelAvailableListHeader: "利用可能なモデル (/lingual model <id>):",

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
    vocabLabel: "Vocabulario",
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
    notifyLangInvalid: "Código de idioma no válido. Admitidos: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[es ⇄ en] Modo cápsula de una línea activado",
    notifyCompactOff: "[es ⇄ en] Modo árbol completo restaurado",
    notifySlotSwitched: "[es ⇄ en] Arquitectura de ranuras cambiada a [{preset}]: {desc}",
    notifyTimeout: "[es ⇄ en] La traducción al inglés agotó el tiempo; se envió el texto original",
    notifyError: "[es ⇄ en] Error en la traducción al inglés; se envió el texto original",
    notifyModeNotFound: "[{pair}] El modo [{mode}] no está en el registro activo. Ejecute /lingual mode list para ver los modos disponibles.",
    notifyModeLockedCycleBlocked: "[{pair}] El modo está bloqueado en [{mode}]. Use /lingual unlock para liberar o especifique el modo directamente.",
    notifyModeLockedSuccess: "[{pair}] Modo de sesión bloqueado en [{mode}]. Ciclo bloqueado. Use /lingual unlock para liberar.",
    notifyModeUnlockedSuccess: "[{pair}] Bloqueo de modo liberado. Ciclo libre y sincronización restaurados.",
    notifyUnrecognizedSubcommand: "[{pair}] Subcomando no reconocido: \"{cmd}\". Modo actual sin cambios. Disponibles: /lingual [1|2|3|0|on|off|lang|last|lock|status] o /l",
    notifyClipboardCopied: "Copiado al portapapeles (prompt interceptado, no enviado al agente). Listo para pegar.",
    notifyTargetSwitched: "Idioma de destino cambiado a: {target} (nativo {source} sin cambios)",
    langHelpText: "[Idioma de asistencia: {flow}]\n• Cambio rápido: /lang ja (japonés) · /lang en (inglés)\n• Cambio de par: /lang es en · /lang en es · /lang es ja\n• Códigos admitidos: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Cambiado a [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] optimizando prompt...",
    loadingFixSyntax: "  ⋯ [lingual] corrigiendo sintaxis y erratas...",
    loadingCandidates: "  ⋯ [lingual] generando candidatos de prompt...",
    statusLoadingOptimize: "[lingual] optimizando...",
    statusLoadingFix: "[lingual] corrigiendo...",
    statusLoadingCandidates: "[lingual] generando...",

    cmdDescMode: "Selector interactivo de modo o gestión: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Mostrar diagnóstico y estado del modelo: /lingual status",
    cmdDescModel: "Consultar o cambiar modelo: /lingual model [model-id|auto]",
    cmdDescLang: "Ver o cambiar idioma de asistencia: /lingual lang [código] o /lang [par]",
    cmdDescSlots: "Inspeccionar o cambiar ranuras: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "Alternar modo cápsula de una línea: /lingual compact",
    cmdDescLast: "Reaparecer tarjeta anterior: /lingual last (o /last)",
    cmdDescAgent: "Activar asistente de personalización: /lingual tuner",
    shortcutNextPage: "Cambiar al siguiente segmento",
    shortcutPrevPage: "Cambiar al segmento anterior",
    modePickerTitle: "Selector de modo",
    modePickerHint: "1/2/3/0 para cambiar, Esc cancela",

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
    statusReportShortcuts: "Accesos directos: /lingual (o /l) · /lingual lang (o /lang) · /lingual last · /lingual compact",
    statusReportTuner: "Ajuste de ranuras: Habilidad lingual-tuner integrada (configure hablando con su Agente)",
    modeDescOriginal: "Directo · 0ms no bloqueante",
    modeDescEnglish: "Modo inglés · Razonamiento profundo",
    modeDescLiveFlow: "Flujo en vivo · 0ms directo y diferencias",
    modeDescOff: "Apagado",

    modelCurrentLabel: "Modelo actual",
    modelFollowSession: "Siguiendo sesión",
    modelAvailableListHeader: "Modelos disponibles (ejecute /lingual model <id>):",
    modelAutoFollowDesc: "auto (Sigue automáticamente el modelo de la sesión)",
    modelSelectHint: "Use /lingual model <id> o auto para asignar un modelo.",

    langUsageHint: "Uso: /lang <zh|tw|ja|ko|en|es|fr|de|ru> [target] (ej. /lang ja o /lang zh ja)",
    langList: [
      "• zh (Chino ➔ Inglés)",
      "• tw (Chino tradicional ➔ Inglés)",
      "• ja (Japonés ➔ Inglés)",
      "• ko (Coreano ➔ Inglés)",
      "• en (Inglés ➔ Japonés)",
      "• es (Español ➔ Inglés)",
      "• fr (Francés ➔ Inglés)",
      "• de (Alemán ➔ Inglés)",
      "• ru (Ruso ➔ Inglés)",
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

    spokenLabel: "Coloquial",
    writtenLabel: "Escrito",
  },
  fr: {
    slot1Label: "Oral",
    slot2Label: "Écrit",
    vocabLabel: "Vocabulaire",
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
    notifyLangInvalid: "Code de langue invalide. Pris en charge : zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[fr ⇄ en] Mode capsule sur une seule ligne activé",
    notifyCompactOff: "[fr ⇄ en] Mode arborescence complète restauré",
    notifyTimeout: "[fr ⇄ en] La traduction en anglais a expiré ; le prompt original a été transmis",
    notifyError: "[fr ⇄ en] Erreur de traduction en anglais ; le prompt original a été transmis",
    notifyModeNotFound: "[{pair}] Le mode [{mode}] n'est pas dans votre registre actif. Exécutez /lingual mode list pour voir les modes disponibles.",
    notifyModeLockedCycleBlocked: "[{pair}] Le mode est verrouillé sur [{mode}]. Exécutez /lingual unlock pour déverrouiller ou spécifiez le mode directement.",
    notifyModeLockedSuccess: "[{pair}] Mode de session verrouillé sur [{mode}]. Défilement bloqué. Exécutez /lingual unlock pour libérer.",
    notifyModeUnlockedSuccess: "[{pair}] Verrouillage du mode désactivé. Défilement libre et synchronisation restaurés.",
    notifyUnrecognizedSubcommand: "[{pair}] Sous-commande non reconnue : \"{cmd}\". Mode actuel inchangé. Disponibles : /lingual [1|2|3|0|on|off|lang|last|lock|status] ou /l",
    notifyClipboardCopied: "Copié dans le presse-papiers (prompt intercepté, non envoyé à l'agent). Prêt à coller.",
    notifyTargetSwitched: "Langue cible changée en : {target} (langue native {source} inchangée)",
    langHelpText: "[Paire de langues : {flow}]\n• Changement rapide : /lang ja (japonais) · /lang en (anglais)\n• Changement de paire : /lang fr en · /lang en fr\n• Codes pris en charge : zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Changé en [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] optimisation du prompt...",
    loadingFixSyntax: "  ⋯ [lingual] correction de la syntaxe et des fautes...",
    loadingCandidates: "  ⋯ [lingual] génération des variantes de prompt...",
    statusLoadingOptimize: "[lingual] optimisation...",
    statusLoadingFix: "[lingual] correction...",
    statusLoadingCandidates: "[lingual] génération...",

    cmdDescMode: "Sélecteur interactif de mode ou gestion : /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Afficher le rapport d'état et le diagnostic: /lingual status",
    cmdDescModel: "Consulter ou changer de modèle : /lingual model [model-id|auto]",
    cmdDescLang: "Afficher ou changer la langue d'assistance : /lingual lang [code] ou /lang [paire]",
    cmdDescCompact: "Basculer le mode capsule sur une ligne : /lingual compact",
    cmdDescLast: "Réafficher la carte précédente : /lingual last (ou /last)",
    cmdDescAgent: "Lancer l'assistant de personnalisation : /lingual tuner",
    shortcutNextPage: "Passer au segment suivant",
    shortcutPrevPage: "Passer au segment précédent",
    modePickerTitle: "Sélecteur de mode",
    modePickerHint: "1/2/3/0 pour changer, Échap annule",

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
    statusReportShortcuts: "Raccourcis : /lingual (ou /l) · /lingual lang (ou /lang) · /lingual last · /lingual compact",
    statusReportTuner: "Ajustement d'emplacements : Compétence lingual-tuner intégrée (décrivez vos préférences à l'Agent)",
    modeDescOriginal: "Passerelle directe · 0ms non bloquant",
    modeDescEnglish: "Mode anglais · Raisonnement approfondi",
    modeDescLiveFlow: "Flux en direct · 0ms direct et différences",
    modeDescOff: "Désactivé",

    modelCurrentLabel: "Modèle actuel",
    modelFollowSession: "Suit la session",
    modelAvailableListHeader: "Modèles disponibles (tapez /lingual model <id>):",
    modelAutoFollowDesc: "auto (Suit automatiquement le modèle principal)",
    modelSelectHint: "Entrez /lingual model <id> ou auto pour définir le modèle.",

    langUsageHint: "Utilisation : /lang <zh|tw|ja|ko|en|es|fr|de|ru> [target] (ex : /lang ja ou /lang zh ja)",
    langList: [
      "• zh (Chinois ➔ Anglais)",
      "• tw (Chinois traditionnel ➔ Anglais)",
      "• ja (Japonais ➔ Anglais)",
      "• ko (Coréen ➔ Anglais)",
      "• en (Anglais ➔ Japonais)",
      "• es (Espagnol ➔ Anglais)",
      "• fr (Français ➔ Anglais)",
      "• de (Allemand ➔ Anglais)",
      "• ru (Russe ➔ Anglais)",
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

    spokenLabel: "Oral",
    writtenLabel: "Écrit",
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
    notifyLangInvalid: "Ungültiger Sprachcode. Unterstützt: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[de ⇄ en] Einzeiliger Kapselmodus aktiviert",
    notifyCompactOff: "[de ⇄ en] Vollständige Baumansicht wiederhergestellt",
    notifySlotSwitched: "[de ⇄ en] Slot-Architektur auf [{preset}] umgestellt: {desc}",
    notifyTimeout: "[de ⇄ en] Englische Übersetzung hat das Zeitlimit überschritten; Originaltext wurde übergeben",
    notifyError: "[de ⇄ en] Fehler bei der englischen Übersetzung; Originaltext wurde übergeben",
    notifyModeNotFound: "[{pair}] Modus [{mode}] ist nicht im aktiven Register. Führen Sie /lingual mode list aus, um verfügbare Modi anzuzeigen.",
    notifyModeLockedCycleBlocked: "[{pair}] Modus ist auf [{mode}] gesperrt. Führen Sie /lingual unlock aus oder geben Sie den Modus direkt an.",
    notifyModeLockedSuccess: "[{pair}] Sitzungsmodus auf [{mode}] gesperrt. Moduswechsel gesperrt. /lingual unlock zum Entsperren.",
    notifyModeUnlockedSuccess: "[{pair}] Modussperre aufgehoben. Freier Wechsel und Synchronisation wiederhergestellt.",
    notifyUnrecognizedSubcommand: "[{pair}] Unbekannter Unterbefehl: \"{cmd}\". Aktueller Modus unverändert. Verfügbar: /lingual [1|2|3|0|on|off|lang|last|lock|status] oder /l",
    notifyClipboardCopied: "In die Zwischenablage kopiert (Prompt abgefangen, nicht an Agent gesendet). Bereit zum Einfügen.",
    notifyTargetSwitched: "Zielsprache geändert zu: {target} (Muttersprache {source} unverändert)",
    langHelpText: "[Sprachpaar: {flow}]\n• Schneller Wechsel: /lang ja (Japanisch) · /lang en (Englisch)\n• Paar-Wechsel: /lang de en · /lang en de\n• Unterstützte Codes: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Gewechselt zu [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] Optimiere Prompt...",
    loadingFixSyntax: "  ⋯ [lingual] Korrigiere Syntax & Tippfehler...",
    loadingCandidates: "  ⋯ [lingual] Generiere Prompt-Varianten...",
    statusLoadingOptimize: "[lingual] optimieren...",
    statusLoadingFix: "[lingual] korrigieren...",
    statusLoadingCandidates: "[lingual] generieren...",

    cmdDescMode: "Interaktiver Modus-Wähler oder Verwaltung: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Statusbericht und Modell-Diagnose anzeigen: /lingual status",
    cmdDescModel: "Modell prüfen oder wechseln: /lingual model [model-id|auto]",
    cmdDescLang: "Muttersprache anzeigen oder wechseln: /lingual lang [Code] oder /lang [Paar]",
    cmdDescSlots: "Slot-Architektur anzeigen/umstellen: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "Einzeiligen Kapselmodus umschalten: /lingual compact",
    cmdDescLast: "Vorherige Karte erneut anzeigen: /lingual last (oder /last)",
    cmdDescAgent: "Anleitung zur Anpassung und Sprachumstellung anzeigen: /lingual tuner",
    shortcutNextPage: "Zum nächsten Segment wechseln",
    shortcutPrevPage: "Zum vorherigen Segment wechseln",
    modePickerTitle: "Modus-Auswahl",
    modePickerHint: "1/2/3/0 zum Wechseln, Esc bricht ab",

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
    statusReportShortcuts: "Befehle: /lingual (oder /l) · /lingual lang (oder /lang) · /lingual last · /lingual compact",
    statusReportTuner: "Slot-Anpassung: Integrierter lingual-tuner Skill (Präferenzen einfach dem Agenten beschreiben)",
    modeDescOriginal: "Direkt · 0ms nicht blockierend",
    modeDescEnglish: "Englisch-Modus · Tiefgreifende Logik",
    modeDescLiveFlow: "Live-Ablauf · 0ms direkt & Differenzen",
    modeDescOff: "Aus",

    modelCurrentLabel: "Aktuelles Modell",
    modelFollowSession: "Sitzungsmodell",
    modelAvailableListHeader: "Verfügbare Modelle (/lingual model <id> ausführen):",
    modelAutoFollowDesc: "auto (Folgt automatisch dem aktiven Sitzungsmodell)",
    modelSelectHint: "Geben Sie /lingual model <id> oder auto ein.",

    langUsageHint: "Verwendung: /lang <zh|tw|ja|ko|en|es|fr|de|ru> [target] (z.B. /lang ja oder /lang zh ja)",
    langList: [
      "• zh (Chinesisch ➔ Englisch)",
      "• tw (Traditionelles Chinesisch ➔ Englisch)",
      "• ja (Japanisch ➔ Englisch)",
      "• ko (Koreanisch ➔ Englisch)",
      "• en (Englisch ➔ Japanisch)",
      "• es (Spanisch ➔ Englisch)",
      "• fr (Französisch ➔ Englisch)",
      "• de (Deutsch ➔ Englisch)",
      "• ru (Russisch ➔ Englisch)",
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

    spokenLabel: "Gesprochen",
    writtenLabel: "Schriftlich",
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
    notifyModeLockedCycleBlocked: "[{pair}] 현재 모드가 【{mode}】(으)로 잠겨 있습니다. 순환하려면 /lingual unlock 으로 해제하거나 /lingual 1|2|3|0 으로 직접 지정하세요.",
    notifyModeLockedSuccess: "[{pair}] 세션 모드가 【{mode}】(으)로 고정되었습니다. 외부 변경 및 의도치 않은 전환을 방지합니다. /lingual unlock 으로 해제 가능.",
    notifyModeUnlockedSuccess: "[{pair}] 모드 잠금이 해제되었습니다. 자유 전환과 설정 동기화가 복원되었습니다.",
    notifyUnrecognizedSubcommand: "[{pair}] 인식할 수 없는 하위 명령: \"{cmd}\". 현재 모드가 유지됩니다. 사용 가능: /lingual [1|2|3|0|on|off|lang|last|lock|status] 또는 /l",
    notifyClipboardCopied: "클립보드에 복사되었습니다 (Agent 미전송). GitHub, PR 또는 SNS에 붙여넣기 가능.",
    notifyTargetSwitched: "목표 언어가 {target}(으)로 변경되었습니다 (모국어 {source} 유지)",
    langHelpText: "[현재 동반 언어: {flow}]\n• 빠른 전환: /lang ja (일본어로) · /lang en (영어로)\n• 양방향 전환: /lang ko en · /lang en ko · /lang ko ja\n• 지원 코드: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] 【{num}. {name} ({id})】(으)로 전환되었습니다 ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] 프롬프트 최적화 중...",
    loadingFixSyntax: "  ⋯ [lingual] 문법 및 오타 수정 중...",
    loadingCandidates: "  ⋯ [lingual] 후보 프롬프트 생성 중...",
    statusLoadingOptimize: "[lingual] 최적화 중...",
    statusLoadingFix: "[lingual] 수정 중...",
    statusLoadingCandidates: "[lingual] 생성 중...",

    cmdDescMode: "대화형 모드 전환 및 관리: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "상태 보고서 및 진단 확인: /lingual status",
    cmdDescModel: "모델 확인 및 변경: /lingual model [model-id|auto]",
    cmdDescLang: "모국어 확인 및 변경: /lingual lang [코드] 또는 /lang [언어쌍]",
    cmdDescSlots: "슬롯 구성 변경: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "단일 행 캡슐 모드 토글: /lingual compact",
    cmdDescLast: "이전 카드 다시 보기: /lingual last (또는 /last)",
    cmdDescAgent: "사용자 설정 가이드: /lingual tuner",
    shortcutNextPage: "다음 세그먼트로 이동",
    shortcutPrevPage: "이전 세그먼트로 이동",
    modePickerTitle: "동행학습 모드 전환",
    modePickerHint: "숫자 키 1/2/3/0 즉시 적용, Esc 취소",

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
    statusReportShortcuts: "명령어: /lingual (또는 /l) · /lingual lang (또는 /lang) · /lingual last · /lingual compact",
    statusReportTuner: "슬롯 튜너: lingual-tuner 내장",
    modeDescOriginal: "원문 직통 · 0ms 비차단",
    modeDescEnglish: "영어 모드 · 심층 코드 추론",
    modeDescLiveFlow: "실시간 교정 · 0ms 직통 및 차이점",
    modeDescOff: "꺼짐",

    modelCurrentLabel: "현재 모델",
    modelFollowSession: "세션 따름",
    modelAvailableListHeader: "사용 가능한 모델 (/lingual model <id>):",
    modelAutoFollowDesc: "auto (현재 세션 주 모델 자동 추종)",
    modelSelectHint: "/lingual model <id> 또는 auto 지정.",

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

    spokenLabel: "구어",
    writtenLabel: "문어",
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
    notifyModeLockedCycleBlocked: "[{pair}] Режим заблокирован на [{mode}]. Выполните /lingual unlock для разблокировки или укажите режим напрямую.",
    notifyModeLockedSuccess: "[{pair}] Режим сессии заблокирован на [{mode}]. Переключение заблокировано. Введите /lingual unlock для сброса.",
    notifyModeUnlockedSuccess: "[{pair}] Блокировка режима снята. Восстановлено свободное переключение и синхронизация.",
    notifyUnrecognizedSubcommand: "[{pair}] Неизвестная подкоманда: \"{cmd}\". Текущий режим не изменен. Доступно: /lingual [1|2|3|0|on|off|lang|last|lock|status] или /l",
    notifyClipboardCopied: "Скопировано в буфер обмена (промпт перехвачен, не отправлен агенту). Готово к вставке.",
    notifyTargetSwitched: "Целевой язык переключен на: {target} (родной {source} без изменений)",
    langHelpText: "[Языковая пара: {flow}]\n• Быстрое переключение: /lang ja (японский) · /lang en (английский)\n• Смена пары: /lang ru en · /lang en ru\n• Поддерживаемые коды: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Переключено на [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  ⋯ [lingual] оптимизация промпта...",
    loadingFixSyntax: "  ⋯ [lingual] исправление синтаксиса и опечаток...",
    loadingCandidates: "  ⋯ [lingual] генерация вариантов промпта...",
    statusLoadingOptimize: "[lingual] оптимизация...",
    statusLoadingFix: "[lingual] исправление...",
    statusLoadingCandidates: "[lingual] генерация...",

    cmdDescMode: "Интерактивный выбор режима или управление: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Отчет о состоянии и диагностика: /lingual status",
    cmdDescModel: "Проверить или сменить модель: /lingual model [model-id|auto]",
    cmdDescLang: "Проверить или сменить язык: /lingual lang [код] или /lang [пара]",
    cmdDescSlots: "Настроить слоты: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "Переключить режим капсулы: /lingual compact",
    cmdDescLast: "Показать предыдущую карточку: /lingual last (или /last)",
    cmdDescAgent: "Запустить мастер настройки: /lingual tuner",
    shortcutNextPage: "Перейти к следующему сегменту",
    shortcutPrevPage: "Перейти к предыдущему сегменту",
    modePickerTitle: "Выбор режима",
    modePickerHint: "1/2/3/0 для смены, Esc отмена",

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
    statusReportShortcuts: "Команды: /lingual (или /l) · /lingual lang (или /lang) · /lingual last · /lingual compact",
    statusReportTuner: "Настройка слотов: встроенный навык lingual-tuner",
    modeDescOriginal: "Оригинал · 0мс без блокировки",
    modeDescEnglish: "Английский режим · глубокое рассуждение",
    modeDescLiveFlow: "Живой поток · 0мс без задержки и разбор",
    modeDescOff: "Выключено",

    modelCurrentLabel: "Текущая модель",
    modelFollowSession: "Следовать за сессией",
    modelAvailableListHeader: "Доступные модели (/lingual model <id>):",
    modelAutoFollowDesc: "auto (автоматически следовать за моделью сессии)",
    modelSelectHint: "Используйте /lingual model <id> или auto.",

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

    spokenLabel: "Разговорный",
    writtenLabel: "Деловой",
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
    info.mode === "companion" || info.mode === "original"
      ? (labels.modeDescOriginal || "Companion · 0ms pass-through")
      : info.mode === "direct" || info.mode === "english"
      ? (labels.modeDescEnglish || "Logical Spec · Deep reasoning")
      : info.mode === "live-flow" || info.mode === "modify" || info.mode === "raw"
      ? (labels.modeDescLiveFlow || "Live Flow · i18n takeaway diffs")
      : info.mode === "off"
      ? (labels.modeDescOff || "Off")
      : resolveModeDisplayName(info.mode, info.sourceLang);

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
    `• ${labels.statusReportShortcuts || "Shortcuts: /lingual (or /l) · /lingual lang (or /lang) · /lingual last · /lingual compact"}`
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
