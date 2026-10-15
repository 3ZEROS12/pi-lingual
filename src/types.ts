export type LingualMode = "original" | "english" | "select" | "modify" | "off" | string;
export type LinguaMode = LingualMode;

export type ModeAction = "pass-through" | "transform" | "select";
export type ModeFlow = "translate" | "proofread" | "custom";
export type ModeHud = "tree" | "adaptive-takeaway" | "preview" | "none";
export type ModeTarget = "agent" | "clipboard";
export type ReasoningEffort = "low" | "medium" | "high";

export type SlotRole = "source" | "rewrite" | "translation" | "vocab" | "custom";

export interface PromptSlotConfig {
  id: string;                 // Unique slot identifier, e.g. "source", "direct_spec", "fixed", "vocab"
  label: string;              // Card display label, e.g. "Source", "Spec", "Fixed", "Takeaways"
  role?: SlotRole;            // Slot role: "source" | "rewrite" | "translation" | "vocab" | "custom"
  instruction?: string;       // Specific prompt optimization/structuring instruction
  showMeaning?: boolean;      // When true, requests <id>_meaning in ${explainLang} and renders ↳ sub-rail
  hideWhenLong?: boolean;     // When true, hides this slot in HUD if input is >120 chars or >=3 sentences
  killList?: string[];        // Specific forbidden buzzwords for this slot
  enabled: boolean;           // Whether this slot is active
  [key: string]: any;         // Preserves arbitrary custom user fields without stripping
}

export type SlotConfig = PromptSlotConfig;

export interface CustomModeConfig {
  id: string;                      // Unique identifier, e.g. "lazy", "raw", "spec", "commit", "oss", "yap"
  name: string;                    // Human-readable display label, e.g. "Logical Spec", "Live Flow", "Commit Dehydrator"
  aliases?: string[];              // CLI/cycle aliases (e.g. ["lazy"] for direct, ["raw"] for live-flow)
  flow: ModeFlow;                  // Language flow: "translate" (sourceLang -> targetLang), "proofread" (targetLang -> targetLang), "custom"
  action: ModeAction;              // Action on input: "pass-through" (raw send), "transform" (replace and send), "select" (popup hotkey 1..N)
  hud: ModeHud;                    // Visual card style: "tree" (full branch), "adaptive-takeaway" (short: fixed+takeaway, long: diffs only), "preview", "none"
  target?: ModeTarget;             // Destination of transformed output: "agent" (default) or "clipboard" (copies to system clipboard)
  reasoning?: ReasoningEffort;     // Model reasoning effort level: "low" | "medium" | "high"
  primarySlotId?: string;          // Specifies which slot's output is used when action === "transform" and slots.length > 1
  systemHint?: string | string[];  // Extra mode-level prompt rules interpolated with ${sourceLang}, ${targetLang}, ${explainLang}
  preserveCodeSwitching?: boolean; // When true in flow: "proofread", translates native words mixed in drafts & adds to takeaways
  contextAware?: boolean;          // When true, runs lightweight git diff/status inspection
  killList?: string[];             // Forbidden AI buzzwords & phrases for this mode (e.g. delve, tapestry, robust)
  slots: PromptSlotConfig[];       // The prompts & schema slots that power this mode
  enabled?: boolean;               // Whether this mode is active in the /lingual cycle (default true)
  customInputLang?: string;        // Optional override for custom flow
  customOutputLang?: string;       // Optional override for custom flow
  [key: string]: any;              // Preserves arbitrary custom user fields without stripping
}

export interface PromptCandidate {
  id: string;
  label: string;
  content: string;
  meaning?: string;
  vocab?: string;
  hideWhenLong?: boolean;
}

export interface SlotResult {
  id: string;
  label: string;
  role: SlotRole;
  content: string;
  meaning?: string;
}

export interface SlotDefinition {
  label: string;       // e.g. "Spoken" | "Hook" | "Keigo" | "Paper"
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
  slot1Label: string;      // e.g. "Spoken" | "Slack"
  slot2Label: string;      // e.g. "Written" | "RFC"
  vocabLabel: string;      // e.g. "Vocab" | "Key Terms"
  sourceLabel: string;     // e.g. "Original" | "Source"
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
  modes?: CustomModeConfig[];       // Declarative user-defined or default modes pipeline (v0.6.0+)
  activeModeId?: string;            // Currently active mode ID (e.g. "lazy", "raw", "direct", "live-flow")
  globalKillList?: string[];        // Global anti-AI buzzword blacklist inherited across all modes
  slots?: SlotConfig[];             // Mode 1 (Companion) dedicated slots (legacy compatibility)
  directSlots?: PromptSlotConfig[]; // Mode 2 (Direct) dedicated 1-to-1 slot (legacy compatibility)
  promptSlots?: PromptSlotConfig[]; // Mode 3 (Candidates) dedicated candidate slots (legacy compatibility)
  modifySlots?: PromptSlotConfig[]; // Mode 4 (Modify) dedicated proofreading slots (legacy compatibility)
  explainLang?: string;             // Cognitive explanation language for Mode 4 takeaways (e.g. "zh", "en", "ja")
  lastSeenVersion?: string;         // Tracks the last major feature release banner shown above editor
  sourceLang?: string;
  targetLang?: string;
  replyInSourceLang?: boolean;
  labels?: Partial<LingualI18nLabels>;
  temperature?: number;
  reasoning?: ReasoningEffort | string;
  timeoutMs?: number;
  complete?: (text: string, systemPrompt: string, signal?: AbortSignal, options?: { reasoning?: string }) => Promise<string | null>;
  signal?: AbortSignal;
  [key: string]: any;
}
export type LinguaConfig = LingualConfig;
export type UserLingualConfig = LingualConfig;

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
