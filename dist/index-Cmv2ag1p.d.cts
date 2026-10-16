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
interface LanguageSpec {
    name: string;
    nativeName: string;
    meaningInstruction: string;
    vocabInstruction: string;
    anchors: Array<{
        input: string;
        spoken: string;
        spoken_meaning: string;
        written: string;
        written_meaning: string;
        vocab: string;
    }>;
}
/**
 * Lightweight language specification and English-target anchors.
 */
declare const LANGUAGE_SPECS: Record<string, LanguageSpec>;
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
}): string;

interface SlotPresetDefinition {
    name: string;
    description: string;
    slots: (sourceLang?: string) => SlotConfig[];
}

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
declare function resolveModesFromConfig(cfg: Partial<LingualConfig>): CustomModeConfig[];
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

export { buildPromptCandidatesSystemPrompt as $, type ModeFlow as A, type ModeHud as B, CURRENT_FEATURE_BANNER_VERSION as C, DEFAULT_CONFIG as D, type ModeTarget as E, PROMPT_RULE_PRESETS as F, type PromptCandidate as G, type PromptSlotConfig as H, SLOT_PRESETS as I, SUPPORTED_LANG_CODES as J, type SanitizedPromptResult as K, type LingualResult as L, MAX_TRANSLATION_CHARS as M, type SlotDefinition as N, type SlotPresetDefinition as O, PRESET_LOADOUTS as P, type SlotResult as Q, type ReasoningEffort as R, type SlotConfig as S, type SlotRole as T, type TranslationPayload as U, type UserLingualConfig as V, addCustomMode as W, addSlotToList as X, addSlotToMode as Y, buildDirectRewriteSystemPrompt as Z, buildModifySystemPrompt as _, type LingualI18nLabels as a, translatePrompt as a$, buildSystemPrompt as a0, compileKillListInstruction as a1, compileModeSystemPrompt as a2, createCustomSlot as a3, defaultSlotsForMode as a4, executeModeRunner as a5, formatModelSelectionMessage as a6, formatNativeReplyGuardHint as a7, formatReleaseBannerLines as a8, formatStatusReport as a9, removeSlotFromList as aA, removeSlotFromMode as aB, repairAndParseJsonObject as aC, resolveCandidateSlotsFromConfig as aD, resolveDirectSlotsFromConfig as aE, resolveLabelsForLang as aF, resolveLangPair as aG, resolveLanguageName as aH, resolveModeDisplaySpec as aI, resolveModesFromConfig as aJ, resolveModifySlotsFromConfig as aK, resolvePromptRulePreset as aL, resolvePromptTargetLangName as aM, resolveReleaseBannerLang as aN, resolveSlotsForPreset as aO, rewritePromptDirect as aP, sanitizePromptForTranslation as aQ, saveUserLingualConfig as aR, shouldInjectNativeReplyGuard as aS, shouldShieldBypass as aT, shouldTriggerTranslation as aU, stripLinguaAnnotation as aV, stripLingualAnnotation as aW, stripLingualContextWhenOff as aX, toggleCustomMode as aY, toggleSlotInList as aZ, translateCore as a_, generatePromptCandidates as aa, getDefaultDirectSlots as ab, getDefaultFactoryModes as ac, getDefaultModifySlots as ad, getDefaultPromptSlots as ae, getDefaultSlots as af, getPresetLoadout as ag, globalLinguaCache as ah, globalLingualCache as ai, interpolatePromptVariables as aj, invalidateUserConfigCache as ak, isDynamicLongInput as al, isNonEnglish as am, isSupportedLangCode as an, isTestEnvironment as ao, isUserLingualConfigured as ap, listPresetLoadouts as aq, loadUserConfig as ar, loadUserLingualConfig as as, moveSlotInList as at, normalizeActiveModeId as au, normalizeLangCode as av, normalizeLingualModeInput as aw, normalizePromptRules as ax, parseLlmResponse as ay, removeCustomMode as az, type CacheStats as b, updateCustomMode as b0, updateSlotInList as b1, type CustomModeConfig as c, type CustomSlotsConfig as d, DEFAULT_KILL_LIST as e, LANGUAGE_PRESETS as f, LANGUAGE_SPECS as g, LEGACY_SLOT_PRESETS as h, LINGUAL_SYSTEM_PROMPT as i, LINGUA_SYSTEM_PROMPT as j, type LanguageSpec as k, type LinguaConfig as l, type LinguaI18nLabels as m, LinguaLruCache as n, type LinguaMode as o, type LinguaResult as p, type LingualConfig as q, type LingualCoreOptions as r, LingualLruCache as s, type LingualMode as t, type LingualRequest as u, type LingualResponse as v, type LoadoutDefinition as w, MAX_TRANSLATION_LINES as x, type ModeAction as y, type ModeDisplaySpec as z };
