export type LingualMode = "original" | "english" | "select" | "modify" | "off";
export type LinguaMode = LingualMode;

export type SlotRole = "source" | "translation" | "vocab" | "custom";

export interface PromptSlotConfig {
  id: string;                 // Unique style identifier, e.g. "concise", "spec", "deep", "vocab"
  label: string;              // Display label, e.g. "极简行动", "结构规范", "根因溯源", "重点词"
  role?: "rewrite" | "vocab"; // Optional role: default "rewrite"; set "vocab" to extract a 1-line vocabulary takeaway row
  instruction: string;        // Specific prompt optimization/structuring instruction (including output language & conditions)
  enabled: boolean;
}

export interface PromptCandidate {
  id: string;
  label: string;
  content: string;
  vocab?: string;
}

export interface SlotConfig {
  id: string;               // Unique slot identifier, e.g. "source", "spoken", "written", "twitter", "grammar"
  label: string;            // Card display label, e.g. "原文", "口语", "写作", "Tweet", "Grammar"
  role: SlotRole;           // "source" | "translation" | "vocab" | "custom"
  instruction?: string;     // Specific LLM translation/style prompt
  showMeaning?: boolean;    // Whether to generate nuance back-translation in language A
  enabled: boolean;
}

export interface SlotResult {
  id: string;
  label: string;
  role: SlotRole;
  content: string;
  meaning?: string;
}

export interface SlotDefinition {
  label: string;       // e.g. "Spoken" | "Hook" | "口語" | "Paper"
  name: string;        // e.g. "Silicon Valley Spoken" | "Twitter Hook" | "Business Keigo"
  instruction: string; // Specific tone & style instruction for this register
}

export interface CustomSlotsConfig {
  slot1?: Partial<SlotDefinition>;
  slot2?: Partial<SlotDefinition>;
}

export interface LingualRequest {
  text: string;
  sourceLang?: string;                  // e.g. "en" (default) | "ja" | "zh" | "es" | "fr" | "de"
  targetLang?: string;                  // e.g. "ja" (default) | "en" | "zh"
  context?: string;                     // Optional: Context of the tweet being replied to, issue, or Slack thread
  tone?: "general" | "social" | "tech"; // default "general"
  isLongInput?: boolean;
  slots?: SlotConfig[] | CustomSlotsConfig; // Dynamic Multi-Slot Architecture
}

export interface LingualResponse {
  spoken: string;
  spokenMeaning?: string;
  written?: string;
  writtenMeaning?: string;
  vocab?: string;
  summary?: string;
  slots?: SlotResult[];                 // Full dynamic slots result array
  slotOutputs?: Record<string, { content: string; meaning?: string }>;
  cached: boolean;
  shieldBypassed: boolean;
}

export interface LingualI18nLabels {
  slot1Label: string;      // e.g. "Spoken" | "口語" | "Slack"
  slot2Label: string;      // e.g. "Written" | "文面" | "RFC"
  vocabLabel: string;      // e.g. "Vocab" | "単語"
  sourceLabel: string;     // e.g. "Original" | "原文"
  hudTitle: string;        // e.g. "zh ⇄ en" | "en ⇄ ja"
  statusOriginal: string;  // e.g. "zh ⇄ en"
  statusEnglish: string;   // e.g. "zh ⇄ en"
  statusOff: string;       // e.g. "zh ⇄ en: off"
  subNuanceLabel?: string; // e.g. "↳"

  // Localized notifications (Primary Language Sovereignty)
  notifyOriginal?: string;
  notifyEnglish?: string;
  notifyOff?: string;
  notifyPaging?: string;
  notifyNoHistory?: string;
  notifyHistoryRestored?: string;
  notifyAgentHelp?: string;
  notifyModelSwitched?: string;
  notifyLangSwitched?: string;
  notifyLangInvalid?: string;
  notifySlotSwitched?: string;
  notifyCompactOn?: string;
  notifyCompactOff?: string;
  notifyTimeout?: string;
  notifyError?: string;

  // Localized command descriptions
  cmdDescMode?: string;
  cmdDescStatus?: string;
  cmdDescModel?: string;
  cmdDescLang?: string;
  cmdDescSlots?: string;
  cmdDescCompact?: string;
  cmdDescLast?: string;
  cmdDescAgent?: string;
  shortcutNextPage?: string;
  shortcutPrevPage?: string;

  // Localized capsule prefixes
  capsuleSlot1Prefix?: string;
  capsuleSlot2Prefix?: string;
  layoutCapsule?: string;
  layoutTree?: string;

  // Localized status report & model diagnostics
  statusReportTitle?: string;
  statusReportMode?: string;
  statusReportFlow?: string;
  statusReportModel?: string;
  statusReportCache?: string;
  statusReportLayout?: string;
  statusReportAuth?: string;
  statusReportShortcuts?: string;
  statusReportTuner?: string;
  modeDescOriginal?: string;
  modeDescEnglish?: string;
  modeDescOff?: string;

  // Localized model selector chrome
  modelCurrentLabel?: string;
  modelFollowSession?: string;
  modelAvailableListHeader?: string;
  modelAutoFollowDesc?: string;
  modelSelectHint?: string;

  // Localized language switcher & usage hints (Zero Chinese Residue)
  langUsageHint?: string;
  langList?: string[];

  // Localized dynamic slots chrome (Primary Language Sovereignty)
  slotsHeader?: string;
  slotsActiveTag?: string;
  slotsNone?: string;
  slotsStatusEnabled?: string;
  slotsStatusDisabled?: string;
  slotsWithNuance?: string;
  slotsNlTitle?: string;
  slotsNlExamples?: string[];
  slotsCliTitle?: string;
  slotsCliHelp?: string[];
  slotsResetSuccess?: string;
  slotsRemovedSuccess?: string;
  slotsRemovedSourceNote?: string;
  slotsToggled?: string;
  slotsAdded?: string;
  slotsNotFound?: string;
  slotsUsageAdd?: string;
  slotsUsageRm?: string;
  slotsUsageToggle?: string;
  slotsUnknown?: string;

  // Aliases for backwards compatibility
  spokenLabel?: string;
  writtenLabel?: string;
}
export type LinguaI18nLabels = LingualI18nLabels;

export interface LingualConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  selectedModel?: string;
  mode?: LingualMode;
  modeLocked?: boolean;            // When true, locks active mode to prevent cross-process or unrequested drift
  compact?: boolean;
  slotPreset?: string;
  slots?: SlotConfig[];             // Mode 1 (Companion / 纯伴学) dedicated slots
  directSlots?: PromptSlotConfig[]; // Mode 2 (Direct / 直接改) dedicated 1-to-1 slot (+ optional vocab slot)
  promptSlots?: PromptSlotConfig[]; // Mode 3 (Candidates / 挑候选) dedicated multi-candidate slots
  modifySlots?: PromptSlotConfig[]; // Mode 4 (Modify / 原句修正) dedicated minimal fix + native sibling + diff slots
  explainLang?: string;             // Cognitive explanation language for Mode 4 takeaways (e.g. "zh", "en", "ja")
  lastSeenVersion?: string;         // Tracks the last major feature release banner shown above editor
  sourceLang?: string;
  targetLang?: string;
  replyInSourceLang?: boolean;
  labels?: Partial<LingualI18nLabels>;
  temperature?: number;
  reasoning?: string;
  timeoutMs?: number;
  complete?: (text: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
  signal?: AbortSignal;
}
export type LinguaConfig = LingualConfig;

export interface LingualResult {
  spoken: string;
  spokenMeaning?: string;
  written?: string;
  writtenMeaning?: string;
  vocab?: string;
  sourceText: string;
  summary?: string;
  annotated: string;
  slots?: SlotResult[];
  slotOutputs?: Record<string, { content: string; meaning?: string }>;
}
export type LinguaResult = LingualResult;

export interface TranslationPayload {
  spoken: string;
  spokenMeaning?: string;
  written?: string;
  writtenMeaning?: string;
  vocab?: string;
  summary?: string;
  slots?: SlotResult[];
  slotOutputs?: Record<string, { content: string; meaning?: string }>;
}
