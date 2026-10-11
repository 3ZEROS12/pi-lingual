import type { LingualI18nLabels } from "../types.js";

export type LingualMode = "original" | "english" | "select" | "off";
export type LinguaMode = LingualMode;

export type SlotRole = "source" | "translation" | "vocab" | "custom";

export interface PromptSlotConfig {
  id: string;               // Unique style identifier, e.g. "concise", "spec", "deep"
  label: string;            // Display label, e.g. "极简高效", "结构规范", "深度严谨"
  instruction: string;      // Specific prompt optimization/structuring instruction
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
  sourceLang?: string;                  // e.g. "zh" (default) | "ja" | "en" | "es" | "fr" | "de"
  targetLang?: string;                  // e.g. "en" (default) | "ja" | "zh"
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

export interface LingualConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  selectedModel?: string;   // e.g. "auto" (default) | "gemini-3.8-flash" | "claude-sonnet-5-5"
  mode?: LingualMode;
  compact?: boolean;        // e.g. false (default) | true (1-line capsule)
  slotPreset?: string;      // e.g. "developer" | "social" | "japanese" | "academic" | "compact2"
  slots?: SlotConfig[];     // Dynamic multi-slot list for Mode 1 (Companion)
  promptLang?: string;      // Output language for Mode 2/3 prompt optimization: "en" (default) | "zh" | "native" | etc.
  promptRule?: string | string[]; // Optional custom condition(s) stacked onto Mode 2/3 prompt optimization
  promptSlots?: PromptSlotConfig[]; // Customizable N prompt style slots for Mode 3 (N-Choice Select)
  learnInRewrite?: boolean; // Optional hybrid toggle: also extract a 1-line [Vocab/重点] takeaway when in Mode 2/3 rewrite
  lastSeenVersion?: string; // Tracks the last major feature release banner shown above editor
  sourceLang?: string;      // e.g. "zh" (default) | "en" | "ja"
  targetLang?: string;      // e.g. "en" (default) | "ja" | "zh"
  replyInSourceLang?: boolean; // Optional guard: whether to hint AI to reply in native language when in english mode
  labels?: Partial<LingualI18nLabels>;
  temperature?: number;
  reasoning?: string;
  timeoutMs?: number;
  complete?: (text: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
  signal?: AbortSignal;
}
export type LinguaConfig = LingualConfig;

export interface LingualResult {
  spoken: string;           // Slot 1 target expression
  spokenMeaning?: string;   // Slot 1 exact nuance/meaning in native language A
  written?: string;         // Slot 2 target expression (optional in dynamic single-slot architectures)
  writtenMeaning?: string;  // Slot 2 exact nuance/meaning in native language A
  vocab?: string;           // Vocab/idiom highlights
  sourceText: string;       // Original source text in language A (or distilled intent headline)
  summary?: string;         // Distilled core intent / question title in language A for long inputs
  annotated: string;
  slots?: SlotResult[];     // Full dynamic slots result array
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
