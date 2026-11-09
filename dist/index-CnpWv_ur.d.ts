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
    private candidatesCache;
    private hits;
    private misses;
    constructor(capacity?: number);
    /**
     * Generates a normalized cache key incorporating language pairs and slot signature.
     */
    static buildKey(text: string, sourceLang?: string, targetLang?: string, slotSignature?: string): string;
    get(key: string): T | undefined;
    set(key: string, val: T): void;
    getCandidates<C = any>(key: string): C[] | undefined;
    setCandidates<C = any>(key: string, candidates: C[]): void;
    has(key: string): boolean;
    clear(): void;
    get size(): number;
    getStats(): CacheStats;
}
declare const LinguaLruCache: typeof LingualLruCache;
declare const globalLingualCache: LingualLruCache<any>;
declare const globalLinguaCache: LingualLruCache<any>;

/**
 * Localized copy for the lookup popup and its command.
 *
 * Kept next to the feature instead of in the i18n label table: the lookup
 * surface is small, and every supported language gets its own strings so the
 * Language Surface Parity invariant holds even when `sourceLang !== "zh"`.
 */
interface LookupStrings {
    title: string;
    loading: string;
    dismiss: (seconds: number) => string;
    timeout: string;
    unavailable: string;
    enabled: string;
    disabled: string;
    usage: string;
    provider: (name: string) => string;
    systemPrompt: (languageName: string) => string;
}

/**
 * Word lookup for copied selections.
 *
 * A double-click in the fullscreen transcript is a different request from a
 * prompt: it is one word or a short phrase the reader wants translated into
 * their own language, right now. So the direction is reversed (foreign →
 * native) and the backend defaults to a key-less dictionary endpoint that
 * answers in well under a second, which is what a double-click deserves.
 * The model backend exists for networks where Google is unreachable and for
 * phrases that need context.
 */

type LookupProvider = "google" | "model";
interface LookupConfig {
    enabled: boolean;
    provider: LookupProvider;
    /** `provider/id` pinned for the model backend; empty follows `/lingual model`. */
    model?: string;
    /** Seconds the popup stays on screen. `0` keeps it until it is clicked away. */
    seconds: number;
    maxWords: number;
    maxChars: number;
}
interface LookupRequest {
    text: string;
    config: LookupConfig;
    /** Reader's language: the translation target. */
    nativeLang: string;
    strings: LookupStrings;
    signal: AbortSignal;
}

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
    shortcutCopyLast?: string;
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
    modeDescLiveFlow?: string;
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
    defaultMode?: string;
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
    killList?: string[];
    lookup?: Partial<LookupConfig>;
    onDelta?: (fullText: string) => void;
    onPartial?: (fields: Record<string, string>) => void;
    complete?: (text: string, systemPrompt: string, signal?: AbortSignal, options?: {
        reasoning?: string;
        onDelta?: (fullText: string) => void;
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
interface ExtensionState {
    mode: LingualMode;
    modeLocked: boolean;
    compact: boolean;
    sourceLang: string;
    targetLang: string;
    explainLang?: string;
    selectedModel: string;
    slotPreset: string;
    slots: SlotConfig[];
    directSlots: PromptSlotConfig[];
    promptSlots: PromptSlotConfig[];
    modifySlots: PromptSlotConfig[];
    modes: CustomModeConfig[];
    activeModeId?: string;
    defaultMode?: string;
    labels: LingualI18nLabels;
}

interface SlotLabelsDef {
    source: string;
    spoken: string;
    written: string;
    vocab: string;
    en_direct: string;
    direct_vocab: string;
    concise: string;
    spec: string;
    deep: string;
    prompt_vocab: string;
    fixed: string;
    native: string;
    fixes: string;
}
declare function resolveSlotLabels(lang?: string): SlotLabelsDef;
/**
 * Dynamically localizes standard slot labels to the active native language.
 * Guarantees zero Chinese characters appear in UI labels when sourceLang is not Chinese (RFC 2119 Invariant 18).
 */
declare function localizeSlotLabel(slotId: string, currentLabel: string, sourceLang?: string): string;
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
declare function buildSystemPrompt(sourceLang?: string, targetLang?: string, isLongInput?: boolean, context?: string, tone?: "general" | "social" | "tech", customSlots?: SlotConfig[] | CustomSlotsConfig, killList?: string[], globalKillList?: string[]): string;
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
    killList?: string[];
    globalKillList?: string[];
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
    killList?: string[];
    globalKillList?: string[];
    preserveCodeSwitching?: boolean;
    systemHint?: string | string[];
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
 * Dynamically localizes standard mode names to the active native language.
 * Guarantees zero Chinese characters appear in UI mode names when sourceLang is not Chinese (RFC 2119 Invariant 18).
 */
declare function localizeModeName(modeId: string, currentName: string, sourceLang?: string): string;
/**
 * Normalizes and dynamically localizes a list of modes and their nested slots to sourceLang.
 */
declare function localizeModes(modes: CustomModeConfig[], sourceLang?: string, explainLang?: string): CustomModeConfig[];
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

declare function invalidateUserConfigCache(): void;
declare function isTestEnvironment(): boolean;
/**
 * Check if user lingual config is already configured on disk.
 */
declare function isUserLingualConfigured(): boolean;
declare function normalizeLingualModeInput(raw?: string): LingualMode | null;
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
declare const loadUserConfig: typeof loadUserLingualConfig;
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

declare const CURRENT_FEATURE_BANNER_VERSION = "0.7.0";
interface ModeDisplaySpec {
    companion: string;
    direct: string;
    candidates: string;
    modify: string;
    off: string;
    notifyOff: (pair: string) => string;
}
declare function resolveModeDisplaySpec(sourceLang?: string): ModeDisplaySpec;
declare function resolveReleaseBannerLang(explicitSourceLang?: string, sessionEntries?: any[]): string;
interface SelectPromptSpec {
    title: string;
    keepOrig: string;
    hint: string;
}
declare function resolveSelectPrompts(lang?: string, candidatesCount?: number): SelectPromptSpec;
declare function formatReleaseBannerLines(sourceLang?: string, maxCols?: number, fg?: (color: string, text: string) => string): string[];

declare const DEFAULT_CONFIG: LingualConfig;
declare const LINGUAL_SYSTEM_PROMPT: string;
declare const LINGUA_SYSTEM_PROMPT: string;
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
/**
 * Ensures inline code tokens (CLI flags, technical identifiers, backticked names)
 * in sourceText are preserved in rewrittenText.
 * If any backticked tokens (2-64 characters) are missing from rewrittenText,
 * deduplicated missing tokens are appended: ` (${missing.map(t => `\`${t}\``).join(", ")})`.
 */
declare function ensureCodeTokensPreserved(sourceText: string, rewrittenText: string): string;

/**
 * Mode Runtime Resolver
 *
 * Single source of truth for turning a declarative `CustomModeConfig` into concrete
 * runtime behaviour. Every consumer (input dispatcher, prompt compiler, HUD renderer,
 * status badge) MUST derive its behaviour from `ModeRuntime` instead of branching on
 * a mode id string.
 *
 * Invariant 2 (Mode as Configuration): no `if (mode === "direct")` anywhere downstream.
 */

/** Concrete HUD renderers. `adaptive-takeaway` normalises to `takeaway`. */
type HudVariant = "tree" | "preview" | "takeaway" | "none";
interface ModeRuntime {
    mode: CustomModeConfig;
    id: string;
    name: string;
    /** How the prompt leaves the extension. */
    dispatcher: ModeAction;
    flow: ModeFlow;
    hud: HudVariant;
    target: ModeTarget;
    /** Language the developer is expected to type in (display + prompt semantics). */
    inputLang: string;
    /** Language the mode produces. */
    outputLang: string;
    explainLang: string;
    reasoning?: string;
    /** Effective, non-disabled slots declared by the mode (or the caller's fallback). */
    slots: PromptSlotConfig[];
    /** Rewrite/translation slots only (no `source`, no `vocab`). */
    translationSlots: PromptSlotConfig[];
    /** The single slot rendered as the takeaway/diff rail. */
    takeawaySlot?: PromptSlotConfig;
    primarySlotId?: string;
    killList: string[];
    globalKillList?: string[];
    preserveCodeSwitching: boolean;
    contextAware: boolean;
    isProofread: boolean;
    /** True when the mode wants a single dense line rather than a tree. */
    isPreview: boolean;
}
interface ResolveModeOptions {
    sourceLang: string;
    targetLang: string;
    explainLang?: string;
    /** Slots used when the mode declares none. Keeps legacy configs working. */
    fallbackSlots?: (SlotConfig | PromptSlotConfig)[];
    globalKillList?: string[];
}
declare function normalizeHudVariant(hud: ModeHud | string | undefined): HudVariant;
/**
 * Derives the complete runtime contract for a mode.
 * Pure function: no disk access, no global state.
 */
declare function resolveModeRuntime(mode: CustomModeConfig, options: ResolveModeOptions): ModeRuntime;
/**
 * Status-badge language pair for a runtime.
 * Custom flow advertises its own pair; every other flow keeps the session pair.
 */
declare function runtimeLanguagePair(rt: ModeRuntime, sessionPair: string): string;
/**
 * The slot whose content is dispatched to the agent (or clipboard).
 * Order of preference: `primarySlotId`, the first translation slot, the first slot.
 */
declare function primarySlot(rt: ModeRuntime): PromptSlotConfig | undefined;
/**
 * Tolerant extraction of already-complete JSON string fields from a partially
 * streamed model response. Used to paint the HUD while tokens are still arriving.
 */
declare function parsePartialJsonFields(buffer: string): Record<string, string>;
/**
 * Builds a renderable result from partially streamed JSON fields.
 * Used to paint the HUD before the model finishes its response.
 */
declare function buildStreamingResult(fields: Record<string, string>, sourceText: string): LingualResult;
/** The payload a `target: "clipboard"` mode should copy. */
declare function pickPrimaryContent(result: LingualResult, rt: ModeRuntime): string | undefined;

export { type SelectPromptSpec as $, type LingualResponse as A, type LoadoutDefinition as B, CURRENT_FEATURE_BANNER_VERSION as C, DEFAULT_CONFIG as D, type ExtensionState as E, MAX_TRANSLATION_CHARS as F, MAX_TRANSLATION_LINES as G, type HudVariant as H, type ModeAction as I, type ModeDisplaySpec as J, type ModeFlow as K, type LingualResult as L, type ModeRuntime as M, type ModeHud as N, type ModeTarget as O, PRESET_LOADOUTS as P, PROMPT_RULE_PRESETS as Q, type PromptCandidate as R, type SlotConfig as S, type PromptSlotConfig as T, type ReasoningEffort as U, type ResolveModeOptions as V, SEED_NAMES as W, SLOT_PRESETS as X, SUPPORTED_LANG_CODES as Y, type SanitizedPromptResult as Z, type SeedNames as _, type LingualI18nLabels as a, repairAndParseJsonObject as a$, type SlotDefinition as a0, type SlotPresetDefinition as a1, type SlotResult as a2, type SlotRole as a3, type TranslationPayload as a4, type UserLingualConfig as a5, addCustomMode as a6, addSlotToList as a7, addSlotToMode as a8, buildDirectRewriteSystemPrompt as a9, invalidateUserConfigCache as aA, isDynamicLongInput as aB, isImperativeEngineeringPrompt as aC, isNonEnglish as aD, isSupportedLangCode as aE, isTargetLanguageOnly as aF, isTestEnvironment as aG, isUserLingualConfigured as aH, listPresetLoadouts as aI, loadUserConfig as aJ, loadUserLingualConfig as aK, localizeModeName as aL, localizeModes as aM, localizeSlotLabel as aN, moveSlotInList as aO, normalizeActiveModeId as aP, normalizeHudVariant as aQ, normalizeLangCode as aR, normalizeLingualModeInput as aS, normalizePromptRules as aT, parseLlmResponse as aU, parsePartialJsonFields as aV, pickPrimaryContent as aW, primarySlot as aX, removeCustomMode as aY, removeSlotFromList as aZ, removeSlotFromMode as a_, buildModifySystemPrompt as aa, buildPromptCandidatesSystemPrompt as ab, buildStreamingResult as ac, buildSystemPrompt as ad, compileKillListInstruction as ae, compileModeSystemPrompt as af, createCustomSlot as ag, defaultSlotsForMode as ah, detectScriptLanguage as ai, ensureCodeTokensPreserved as aj, executeModeRunner as ak, formatModelSelectionMessage as al, formatNativeReplyGuardHint as am, formatReleaseBannerLines as an, formatStatusReport as ao, generatePromptCandidates as ap, getDefaultDirectSlots as aq, getDefaultFactoryModes as ar, getDefaultModifySlots as as, getDefaultPromptSlots as at, getDefaultSlots as au, getPresetLoadout as av, globalLinguaCache as aw, globalLingualCache as ax, hasSourceScript as ay, interpolatePromptVariables as az, type LookupConfig as b, resolveCandidateSlotsFromConfig as b0, resolveDirectSlotsFromConfig as b1, resolveLabelsForLang as b2, resolveLangPair as b3, resolveLanguageName as b4, resolveLanguagePairAnchors as b5, resolveModeDisplayName as b6, resolveModeDisplaySpec as b7, resolveModeRuntime as b8, resolveModesFromConfig as b9, resolveModifySlotsFromConfig as ba, resolvePromptRulePreset as bb, resolvePromptTargetLangName as bc, resolveReleaseBannerLang as bd, resolveSeedNames as be, resolveSelectPrompts as bf, resolveSlotLabels as bg, resolveSlotsForPreset as bh, rewritePromptDirect as bi, runtimeLanguagePair as bj, sanitizePromptForTranslation as bk, saveUserLingualConfig as bl, shouldInjectNativeReplyGuard as bm, shouldShieldBypass as bn, shouldTriggerTranslation as bo, stripLinguaAnnotation as bp, stripLingualAnnotation as bq, stripLingualContextWhenOff as br, toggleCustomMode as bs, toggleSlotInList as bt, translateCore as bu, translatePrompt as bv, updateCustomMode as bw, updateSlotInList as bx, type LookupStrings as c, type LookupRequest as d, type CacheStats as e, type CustomModeConfig as f, type CustomSlotsConfig as g, DEFAULT_KILL_LIST as h, LANGUAGE_PAIR_ANCHORS as i, LANGUAGE_PRESETS as j, LANGUAGE_SPECS as k, LEGACY_SLOT_PRESETS as l, LINGUAL_SYSTEM_PROMPT as m, LINGUA_SYSTEM_PROMPT as n, type LanguageAnchor as o, type LanguageSpec as p, type LinguaConfig as q, type LinguaI18nLabels as r, LinguaLruCache as s, type LinguaMode as t, type LinguaResult as u, type LingualConfig as v, type LingualCoreOptions as w, LingualLruCache as x, type LingualMode as y, type LingualRequest as z };
