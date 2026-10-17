type LingualMode = "original" | "english" | "select" | "modify" | "off" | string;
type LinguaMode = LingualMode;
type ModeAction = "pass-through" | "transform" | "select";
type ModeFlow = "translate" | "proofread" | "custom";
type ModeHud = "tree" | "adaptive-takeaway" | "preview" | "none";
type ModeTarget = "agent" | "clipboard";
type ReasoningEffort = "low" | "medium" | "high";
type SlotRole = "source" | "rewrite" | "translation" | "vocab" | "custom";
interface PromptSlotConfig {
    id: string;
    label: string;
    role?: SlotRole;
    instruction?: string;
    showMeaning?: boolean;
    hideWhenLong?: boolean;
    killList?: string[];
    enabled: boolean;
    [key: string]: any;
}
type SlotConfig = PromptSlotConfig;
interface CustomModeConfig {
    id: string;
    name: string;
    aliases?: string[];
    flow: ModeFlow;
    action: ModeAction;
    hud: ModeHud;
    target?: ModeTarget;
    reasoning?: ReasoningEffort;
    primarySlotId?: string;
    systemHint?: string | string[];
    preserveCodeSwitching?: boolean;
    contextAware?: boolean;
    killList?: string[];
    slots: PromptSlotConfig[];
    enabled?: boolean;
    customInputLang?: string;
    customOutputLang?: string;
    [key: string]: any;
}
interface PromptCandidate {
    id: string;
    label: string;
    content: string;
    meaning?: string;
    vocab?: string;
    hideWhenLong?: boolean;
}
interface SlotResult {
    id: string;
    label: string;
    role: SlotRole;
    content: string;
    meaning?: string;
}
interface SlotDefinition {
    label: string;
    name: string;
    instruction: string;
}
interface CustomSlotsConfig {
    slot1?: Partial<SlotDefinition>;
    slot2?: Partial<SlotDefinition>;
}
interface LingualRequest {
    text: string;
    sourceLang?: string;
    targetLang?: string;
    context?: string;
    tone?: "general" | "social" | "tech";
    isLongInput?: boolean;
    slots?: SlotConfig[] | CustomSlotsConfig;
}
interface LingualResponse {
    spoken: string;
    spokenMeaning?: string;
    written?: string;
    writtenMeaning?: string;
    vocab?: string;
    summary?: string;
    slots?: SlotResult[];
    slotOutputs?: Record<string, {
        content: string;
        meaning?: string;
    }>;
    cached: boolean;
    shieldBypassed: boolean;
}
interface LingualI18nLabels {
    slot1Label: string;
    slot2Label: string;
    vocabLabel: string;
    sourceLabel: string;
    hudTitle: string;
    statusOriginal: string;
    statusEnglish: string;
    statusOff: string;
    subNuanceLabel?: string;
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
    notifyModeNotFound?: string;
    notifyModeLockedCycleBlocked?: string;
    notifyModeLockedSuccess?: string;
    notifyModeUnlockedSuccess?: string;
    notifyUnrecognizedSubcommand?: string;
    notifyClipboardCopied?: string;
    notifyTargetSwitched?: string;
    loadingOptimizePrompt?: string;
    loadingFixSyntax?: string;
    loadingCandidates?: string;
    statusLoadingOptimize?: string;
    statusLoadingFix?: string;
    statusLoadingCandidates?: string;
    langHelpText?: string;
    modeSwitchedTemplate?: string;
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
    modePickerTitle?: string;
    modePickerHint?: string;
    capsuleSlot1Prefix?: string;
    capsuleSlot2Prefix?: string;
    layoutCapsule?: string;
    layoutTree?: string;
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
    modelCurrentLabel?: string;
    modelFollowSession?: string;
    modelAvailableListHeader?: string;
    modelAutoFollowDesc?: string;
    modelSelectHint?: string;
    langUsageHint?: string;
    langList?: string[];
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
    spokenLabel?: string;
    writtenLabel?: string;
}
type LinguaI18nLabels = LingualI18nLabels;
interface LingualConfig {
    endpoint: string;
    apiKey: string;
    model: string;
    selectedModel?: string;
    mode?: LingualMode;
    modeLocked?: boolean;
    compact?: boolean;
    slotPreset?: string;
    modes?: CustomModeConfig[];
    activeModeId?: string;
    globalKillList?: string[];
    slots?: SlotConfig[];
    directSlots?: PromptSlotConfig[];
    promptSlots?: PromptSlotConfig[];
    modifySlots?: PromptSlotConfig[];
    explainLang?: string;
    lastSeenVersion?: string;
    sourceLang?: string;
    targetLang?: string;
    replyInSourceLang?: boolean;
    labels?: Partial<LingualI18nLabels>;
    temperature?: number;
    reasoning?: ReasoningEffort | string;
    timeoutMs?: number;
    complete?: (text: string, systemPrompt: string, signal?: AbortSignal, options?: {
        reasoning?: string;
    }) => Promise<string | null>;
    signal?: AbortSignal;
    [key: string]: any;
}
type LinguaConfig = LingualConfig;
type UserLingualConfig = LingualConfig;
interface LingualResult {
    spoken: string;
    spokenMeaning?: string;
    written?: string;
    writtenMeaning?: string;
    vocab?: string;
    sourceText: string;
    summary?: string;
    annotated: string;
    slots?: SlotResult[];
    slotOutputs?: Record<string, {
        content: string;
        meaning?: string;
    }>;
}
type LinguaResult = LingualResult;
interface TranslationPayload {
    spoken: string;
    spokenMeaning?: string;
    written?: string;
    writtenMeaning?: string;
    vocab?: string;
    summary?: string;
    slots?: SlotResult[];
    slotOutputs?: Record<string, {
        content: string;
        meaning?: string;
    }>;
}

/**
 * Universal default slot generators (AI-native with semantic variable interpolation).
 * Dynamically expanded with ${sourceLang}, ${targetLang}, and ${explainLang}.
 */
declare function getDefaultDirectSlots(sourceLang?: string): PromptSlotConfig[];
declare function getDefaultPromptSlots(sourceLang?: string): PromptSlotConfig[];
declare function getDefaultModifySlots(sourceLang?: string, explainLang?: string): PromptSlotConfig[];
declare function getDefaultSlots(sourceLang?: string): SlotConfig[];
declare const LEGACY_SLOT_PRESETS: Record<string, {
    slot1: SlotDefinition;
    slot2: SlotDefinition;
}>;
interface LanguageAnchor {
    input: string;
    spoken: string;
    spoken_meaning: string;
    written: string;
    written_meaning: string;
    vocab: string;
}
interface LanguageSpec {
    name: string;
    nativeName: string;
    meaningInstruction: string;
    vocabInstruction: string;
    anchors: LanguageAnchor[];
}
/**
 * Lightweight language specification and English-target anchors.
 */
declare const LANGUAGE_SPECS: Record<string, LanguageSpec>;
/**
 * Dynamic Symmetric Polyglot Anchor Matrix.
 * Maps (sourceLang -> targetLang) directly to pair-specific golden few-shot examples.
 */
declare const LANGUAGE_PAIR_ANCHORS: Record<string, LanguageAnchor[]>;
/**
 * Resolves pair-specific golden few-shot anchors dynamically based on (sourceLang -> targetLang).
 */
declare function resolveLanguagePairAnchors(sourceLang?: string, targetLang?: string): LanguageAnchor[];
declare function resolveLanguageName(code?: string): string;
/**
 * Dynamic Semantic Variable Interpolation Engine.
 * Automatically expands ${sourceLang}, ${targetLang}, and ${explainLang} into canonical target language names and codes.
 */
declare function interpolatePromptVariables(template: string, vars: {
    sourceLang?: string;
    targetLang?: string;
    explainLang?: string;
}): string;
declare function resolvePromptTargetLangName(sourceLang?: string, targetLang?: string, promptLang?: string): {
    code: string;
    name: string;
};
declare const PROMPT_RULE_PRESETS: Record<string, string>;
declare const DEFAULT_KILL_LIST: string[];
declare function compileKillListInstruction(killList?: string[], globalKillList?: string[]): string;
declare function resolvePromptRulePreset(input: string): string;
declare function normalizePromptRules(rule?: string | string[]): string[];
/**
 * Universal Companion Prompt Builder (Mode 1 / pass-through).
 * Dynamically builds system prompt adhering strictly to Primary Language Sovereignty.
 */
declare function buildSystemPrompt(sourceLang?: string, targetLang?: string, isLongInput?: boolean, context?: string, tone?: "general" | "social" | "tech", customSlots?: SlotConfig[] | CustomSlotsConfig): string;
/**
 * Universal Direct Rewrite Prompt Builder (Mode 2 / transform).
 */
declare function buildDirectRewriteSystemPrompt(options: {
    sourceLang?: string;
    targetLang?: string;
    promptLang?: string;
    promptRule?: string | string[];
    learnInRewrite?: boolean;
    context?: string;
}): string;
/**
 * Universal Multi-Candidate Prompt Builder (Mode 3 / select & custom transform).
 * 100% Slot-Driven.
 */
declare function buildPromptCandidatesSystemPrompt(options: {
    sourceLang?: string;
    targetLang?: string;
    promptLang?: string;
    promptRule?: string | string[];
    promptSlots?: PromptSlotConfig[];
    learnInRewrite?: boolean;
    context?: string;
}): string;
/**
 * Universal Proofreading & Surgical Repair Prompt Builder (flow: "proofread").
 * 100% Slot-Driven.
 */
declare function buildModifySystemPrompt(options: {
    sourceLang?: string;
    targetLang?: string;
    promptLang?: string;
    explainLang?: string;
    customSlots?: PromptSlotConfig[];
    promptSlots?: PromptSlotConfig[];
    context?: string;
}): string;

interface SlotPresetDefinition {
    name: string;
    description: string;
    slots: (sourceLang?: string) => SlotConfig[];
}

interface SeedNames {
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
declare const SEED_NAMES: Record<string, SeedNames>;
declare function resolveSeedNames(lang?: string): SeedNames;
declare function resolveModeDisplayName(modeId: string, lang?: string): string;
/**
 * Returns three-core factory golden defaults (v0.6.0 Three-Core Baselines: 1. Companion + 2. Logical Spec + 3. Live Flow).
 */
declare function getDefaultFactoryModes(sourceLang?: string, explainLang?: string): CustomModeConfig[];
interface LoadoutDefinition {
    id: string;
    name: string;
    description: string;
    loadout: (sourceLang?: string, explainLang?: string) => CustomModeConfig;
}
declare const PRESET_LOADOUTS: Record<string, LoadoutDefinition>;
declare function getPresetLoadout(id: string, sourceLang?: string, explainLang?: string): CustomModeConfig | null;
declare function listPresetLoadouts(): LoadoutDefinition[];
/**
 * Creates a custom slot definition with sanitized ID and default parameters.
 */
declare function createCustomSlot(params: Partial<SlotConfig> & {
    id: string;
    label: string;
}): SlotConfig;
declare function addSlotToList(slots: SlotConfig[], newSlot: SlotConfig): SlotConfig[];
declare function removeSlotFromList(slots: SlotConfig[], slotId: string): SlotConfig[];
declare function updateSlotInList(slots: SlotConfig[], slotId: string, patch: Partial<SlotConfig>): SlotConfig[];
declare function toggleSlotInList(slots: SlotConfig[], slotId: string): SlotConfig[];
declare function moveSlotInList(slots: SlotConfig[], slotId: string, targetIndex: number): SlotConfig[];
declare function addCustomMode(modes: CustomModeConfig[], newMode: CustomModeConfig): CustomModeConfig[];
declare function removeCustomMode(modes: CustomModeConfig[], modeId: string): CustomModeConfig[];
declare function updateCustomMode(modes: CustomModeConfig[], modeId: string, patch: Partial<CustomModeConfig>): CustomModeConfig[];
declare function toggleCustomMode(modes: CustomModeConfig[], modeId: string): CustomModeConfig[];
declare function addSlotToMode(modes: CustomModeConfig[], modeId: string, slot: PromptSlotConfig): CustomModeConfig[];
declare function removeSlotFromMode(modes: CustomModeConfig[], modeId: string, slotId: string): CustomModeConfig[];
declare const SLOT_PRESETS: Record<string, SlotPresetDefinition>;
declare function resolveSlotsForPreset(presetName?: string, sourceLang?: string): SlotConfig[];
/**
 * Universal English Baseline and compact localized chrome presets.
 */
declare const LANGUAGE_PRESETS: Record<string, LingualI18nLabels>;
/**
 * Canonical language codes advertised by the extension (help text, banner, factory mode seeds).
 * Any code here must be switchable via /lang; chrome falls back to the universal English baseline
 * unless a native preset exists.
 */
declare const SUPPORTED_LANG_CODES: string[];
declare function isSupportedLangCode(code: string): boolean;
/** Maps developer-typed language words (native script, English names, ISO aliases) to a code. */
declare function normalizeLangCode(input: string): string;
/**
 * Resolves a developer-supplied "source target" pair, rejecting unvalidated free text
 * so a stray keystroke can never poison the persisted configuration.
 */
declare function resolveLangPair(input: string, fallbackPair: string): {
    source: string;
    target: string;
};
/**
 * Resolves localized labels for a given language code, allowing custom user overrides.
 * Follows English Pivot Fallback chain.
 */
declare function resolveLabelsForLang(lang?: string, overrides?: Partial<LingualI18nLabels>, targetLang?: string): LingualI18nLabels;
/**
 * Format runtime status report adhering strictly to Primary Language Sovereignty.
 */
declare function formatStatusReport(labels: LingualI18nLabels, info: {
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
}): string;
/**
 * Formats model selection menu prompt adhering to Primary Language Sovereignty.
 */
declare function formatModelSelectionMessage(labels: LingualI18nLabels, currentActive: string, availableList?: string): string;

/**
 * Code & Shell Pass-through Shield (0ms Fast Bypass).
 *
 * Developers frequently enter CLI commands, paste code blocks, or data structures.
 * Performs fast sniffing to bypass translation with 0ms latency and 0 token burn.
 */
/**
 * Check if the text contains non-English natural language scripts (CJK, accented Latin, Cyrillic, etc.)
 * Strictly avoids triggering on pure emojis, typographical quotes, or terminal commands.
 */
declare function isNonEnglish(text: string): boolean;
/**
 * Determines whether input text is a pure code block, shell command, or data structure that should bypass translation in 0ms.
 */
declare function shouldShieldBypass(text: string): boolean;
/**
 * Checks if the text contains script characters native to the configured source language.
 */
declare function hasSourceScript(text: string, sourceLang: string): boolean;
/**
 * Determines whether text is already written directly in the target language (e.g. English).
 * When sourceLang is CJK or Cyrillic and input contains 0 native characters but >= 2 English words,
 * the developer is already authoring fluently in the target language.
 * Latin-to-Latin pairs (e.g. es, fr, de -> en) never bypass here to prevent false positives on unaccented text.
 */
declare function isTargetLanguageOnly(text: string, sourceLang: string, targetLang?: string): boolean;
/**
 * Checks if the text starts with a standard imperative engineering verb.
 * If true, input is already an actionable engineering specification.
 */
declare function isImperativeEngineeringPrompt(text: string): boolean;
/**
 * Detects the natural language writing system present in the input text.
 * Used for input-driven locale adaptation on cold boot.
 */
declare function detectScriptLanguage(text: string): string | null;

/**
 * In-Memory LRU Cache for Lingual Translations (Zero-Dependency In-Process Cache)
 *
 * High-frequency developer phrases ("continue", "agree", "proceed", "sounds good")
 * are served with 0ms latency from an in-memory LRU cache (default capacity: 50 entries).
 * Cache hits consume zero network round-trips and zero model tokens.
 */
interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    capacity: number;
}
declare class LingualLruCache<T> {
    readonly capacity: number;
    private cache;
    private hits;
    private misses;
    constructor(capacity?: number);
    /**
     * Generates a normalized cache key incorporating language pairs and slot signature.
     */
    static buildKey(text: string, sourceLang?: string, targetLang?: string, slotSignature?: string): string;
    get(key: string): T | undefined;
    set(key: string, val: T): void;
    has(key: string): boolean;
    clear(): void;
    get size(): number;
    getStats(): CacheStats;
}
declare const LinguaLruCache: typeof LingualLruCache;
declare const globalLingualCache: LingualLruCache<any>;
declare const globalLinguaCache: LingualLruCache<any>;

declare function invalidateUserConfigCache(): void;
declare function isTestEnvironment(): boolean;
/**
 * Check if user lingual config is already configured on disk
 */
declare function isUserLingualConfigured(): boolean;
/**
 * Load user configuration from single source of truth: ~/.pi/agent/lingual.json
 * If lingual.json does not exist, performs a one-time graceful migration from settings.json ("pi-lingual" block).
 * Uses high-efficiency 2-second in-memory memoization to prevent synchronous disk I/O thrashing.
 */
declare function loadUserLingualConfig(): Partial<LingualConfig>;
/**
 * Atomic, zero-residue configuration persistence to ~/.pi/agent/lingual.json
 */
declare function saveUserLingualConfig(patch: Record<string, any>): void;
declare const DEFAULT_CONFIG: LingualConfig;
declare const LINGUAL_SYSTEM_PROMPT: string;
declare const LINGUA_SYSTEM_PROMPT: string;
declare const loadUserConfig: typeof loadUserLingualConfig;
declare const MAX_TRANSLATION_CHARS = 2500;
declare const MAX_TRANSLATION_LINES = 30;
/**
 * Bidirectional language-aware trigger with strict Length & Payload Guards
 */
declare function shouldTriggerTranslation(text: string, sourceLang?: string, allowSameLangPromptOpt?: boolean): boolean;
/**
 * Unified featherweight JSON repair & object extractor (protected against prototype pollution & >32KB payloads)
 */
declare function repairAndParseJsonObject(raw: string): Record<string, any> | null;
/**
 * Clean and parse LLM JSON responses safely (shared across translateCore and translatePrompt)
 */
declare function parseLlmResponse(raw: string): TranslationPayload | null;
interface LingualCoreOptions {
    completer?: (prompt: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
    cache?: LingualLruCache<TranslationPayload>;
    signal?: AbortSignal;
}
/**
 * Pure translation engine orchestrator for lingual-core (decoupled from Pi host session)
 */
declare function translateCore(req: LingualRequest, options?: LingualCoreOptions): Promise<LingualResponse>;
/**
 * Strip annotations and recover purely clean text to prevent LLM prompt pollution
 */
declare function stripLingualAnnotation(annotatedText: string): {
    raw: string;
    spoken?: string;
    written?: string;
    vocab?: string;
};
declare const stripLinguaAnnotation: typeof stripLingualAnnotation;
/**
 * Dynamic density sensing for long input condensation
 */
declare function isDynamicLongInput(text: string, sourceLang?: string): boolean;
/**
 * Translate a user prompt into idiomatic target registers with native nuance and vocabulary highlights
 */
declare function translatePrompt(text: string, userConfig?: Partial<LingualConfig>): Promise<LingualResult | null>;
/**
 * Opt-in Native Reply Guard
 */
declare function shouldInjectNativeReplyGuard(originalText: string, _sourceLang?: string, enabled?: boolean): boolean;
declare function formatNativeReplyGuardHint(sourceLang?: string): string;
declare function resolveDirectSlotsFromConfig(cfg: {
    sourceLang?: string;
    directSlots?: PromptSlotConfig[];
}): PromptSlotConfig[];
declare function resolveCandidateSlotsFromConfig(cfg: {
    sourceLang?: string;
    promptSlots?: PromptSlotConfig[];
}): PromptSlotConfig[];
declare function resolveModifySlotsFromConfig(cfg: {
    sourceLang?: string;
    explainLang?: string;
    modifySlots?: PromptSlotConfig[];
}): PromptSlotConfig[];
/** Resolves default slots for a custom mode based on its action and flow. */
declare function defaultSlotsForMode(mode: Pick<CustomModeConfig, "action" | "flow">, sourceLang: string, explainLang?: string): SlotConfig[];
declare function resolveModesFromConfig(cfg: Partial<LingualConfig>, fallbackSourceLang?: string): CustomModeConfig[];
declare function normalizeActiveModeId(cfg: Partial<LingualConfig>, modes: CustomModeConfig[]): string;
declare function compileModeSystemPrompt(mode: CustomModeConfig, options: {
    sourceLang?: string;
    targetLang?: string;
    explainLang?: string;
    globalKillList?: string[];
    context?: string;
}): string;
declare function executeModeRunner(text: string, mode: CustomModeConfig, userConfig?: Partial<LingualConfig>): Promise<PromptCandidate[] | null>;
declare function generatePromptCandidates(text: string, userConfig?: Partial<LingualConfig>): Promise<PromptCandidate[] | null>;
declare function rewritePromptDirect(text: string, userConfig?: Partial<LingualConfig>): Promise<string | null>;
/**
 * On-Demand Tuner Skill Gate (`stripLingualContextWhenOff`)
 */
declare function stripLingualContextWhenOff(systemPrompt: string, lastUserText?: string, tunerArmed?: boolean): string;
interface ModeDisplaySpec {
    companion: string;
    direct: string;
    candidates: string;
    modify: string;
    off: string;
    notifyOff: (pair: string) => string;
}
declare function resolveModeDisplaySpec(sourceLang?: string): ModeDisplaySpec;
declare function normalizeLingualModeInput(raw?: string): LingualMode | null;
declare const CURRENT_FEATURE_BANNER_VERSION = "0.6.0";
declare function resolveReleaseBannerLang(explicitSourceLang?: string, sessionEntries?: any[]): string;
interface SelectPromptSpec {
    title: string;
    keepOrig: string;
    hint: string;
}
declare function resolveSelectPrompts(lang?: string, candidatesCount?: number): SelectPromptSpec;
declare function formatReleaseBannerLines(sourceLang?: string, maxCols?: number, fg?: (color: string, text: string) => string): string[];

/**
 * Prompt Sanitizer & Intent Distiller.
 *
 * Responsibilities:
 * 1. Strips clipboard screenshot paths (pi-clipboard-*.png);
 * 2. Identifies and collapses multiline stack traces (Node.js at ..., Python Traceback, Java Caused by...);
 * 3. Collapses multiline Markdown code blocks (```...```) to [...];
 * 4. Collapses multiline compiler/linter diagnostics, preserving the first summary line;
 * 5. Strictly preserves Shell CLI commands (git, npm, cargo, etc.) verbatim;
 * 6. Distills core natural language intent to prevent prompt bloating.
 */
interface SanitizedPromptResult {
    /** Distilled compact text after sanitization and folding */
    distilledText: string;
    /** Whether prompt contains valid human natural language intent */
    hasNaturalLanguage: boolean;
    /** Whether stack traces, code blocks, or logs were collapsed */
    hasCollapsedContent: boolean;
    /** Estimated natural language character count */
    naturalCharsLength: number;
    /** Preserved raw payload (code blocks, stack traces) for hybrid grafting */
    rawPayload?: string;
}
/**
 * Sanitizes user input and distills natural language intent.
 */
declare function sanitizePromptForTranslation(raw: string): SanitizedPromptResult;

export { addCustomMode as $, type ModeAction as A, type ModeDisplaySpec as B, CURRENT_FEATURE_BANNER_VERSION as C, DEFAULT_CONFIG as D, type ModeFlow as E, type ModeHud as F, type ModeTarget as G, PROMPT_RULE_PRESETS as H, type PromptCandidate as I, type PromptSlotConfig as J, SEED_NAMES as K, type LingualResult as L, MAX_TRANSLATION_CHARS as M, SLOT_PRESETS as N, SUPPORTED_LANG_CODES as O, PRESET_LOADOUTS as P, type SanitizedPromptResult as Q, type ReasoningEffort as R, type SlotConfig as S, type SeedNames as T, type SelectPromptSpec as U, type SlotDefinition as V, type SlotPresetDefinition as W, type SlotResult as X, type SlotRole as Y, type TranslationPayload as Z, type UserLingualConfig as _, type LingualI18nLabels as a, resolveSlotsForPreset as a$, addSlotToList as a0, addSlotToMode as a1, buildDirectRewriteSystemPrompt as a2, buildModifySystemPrompt as a3, buildPromptCandidatesSystemPrompt as a4, buildSystemPrompt as a5, compileKillListInstruction as a6, compileModeSystemPrompt as a7, createCustomSlot as a8, defaultSlotsForMode as a9, loadUserConfig as aA, loadUserLingualConfig as aB, moveSlotInList as aC, normalizeActiveModeId as aD, normalizeLangCode as aE, normalizeLingualModeInput as aF, normalizePromptRules as aG, parseLlmResponse as aH, removeCustomMode as aI, removeSlotFromList as aJ, removeSlotFromMode as aK, repairAndParseJsonObject as aL, resolveCandidateSlotsFromConfig as aM, resolveDirectSlotsFromConfig as aN, resolveLabelsForLang as aO, resolveLangPair as aP, resolveLanguageName as aQ, resolveLanguagePairAnchors as aR, resolveModeDisplayName as aS, resolveModeDisplaySpec as aT, resolveModesFromConfig as aU, resolveModifySlotsFromConfig as aV, resolvePromptRulePreset as aW, resolvePromptTargetLangName as aX, resolveReleaseBannerLang as aY, resolveSeedNames as aZ, resolveSelectPrompts as a_, detectScriptLanguage as aa, executeModeRunner as ab, formatModelSelectionMessage as ac, formatNativeReplyGuardHint as ad, formatReleaseBannerLines as ae, formatStatusReport as af, generatePromptCandidates as ag, getDefaultDirectSlots as ah, getDefaultFactoryModes as ai, getDefaultModifySlots as aj, getDefaultPromptSlots as ak, getDefaultSlots as al, getPresetLoadout as am, globalLinguaCache as an, globalLingualCache as ao, hasSourceScript as ap, interpolatePromptVariables as aq, invalidateUserConfigCache as ar, isDynamicLongInput as as, isImperativeEngineeringPrompt as at, isNonEnglish as au, isSupportedLangCode as av, isTargetLanguageOnly as aw, isTestEnvironment as ax, isUserLingualConfigured as ay, listPresetLoadouts as az, type CacheStats as b, rewritePromptDirect as b0, sanitizePromptForTranslation as b1, saveUserLingualConfig as b2, shouldInjectNativeReplyGuard as b3, shouldShieldBypass as b4, shouldTriggerTranslation as b5, stripLinguaAnnotation as b6, stripLingualAnnotation as b7, stripLingualContextWhenOff as b8, toggleCustomMode as b9, toggleSlotInList as ba, translateCore as bb, translatePrompt as bc, updateCustomMode as bd, updateSlotInList as be, type CustomModeConfig as c, type CustomSlotsConfig as d, DEFAULT_KILL_LIST as e, LANGUAGE_PAIR_ANCHORS as f, LANGUAGE_PRESETS as g, LANGUAGE_SPECS as h, LEGACY_SLOT_PRESETS as i, LINGUAL_SYSTEM_PROMPT as j, LINGUA_SYSTEM_PROMPT as k, type LanguageAnchor as l, type LanguageSpec as m, type LinguaConfig as n, type LinguaI18nLabels as o, LinguaLruCache as p, type LinguaMode as q, type LinguaResult as r, type LingualConfig as s, type LingualCoreOptions as t, LingualLruCache as u, type LingualMode as v, type LingualRequest as w, type LingualResponse as x, type LoadoutDefinition as y, MAX_TRANSLATION_LINES as z };
