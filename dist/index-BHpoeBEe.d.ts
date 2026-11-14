type LingualMode = "original" | "english" | "select" | "modify" | "off" | string;
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
    onDelta?: (fullText: string) => void;
    onPartial?: (fields: Record<string, string>) => void;
    complete?: (text: string, systemPrompt: string, signal?: AbortSignal, options?: {
        reasoning?: string;
        onDelta?: (fullText: string) => void;
    }) => Promise<string | null>;
    signal?: AbortSignal;
    [key: string]: any;
}
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

declare function resolveLanguageName(code?: string): string;
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
declare function localizeSlotLabel(slotId: string, currentLabel: string, sourceLang?: string): string;
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
declare const LANGUAGE_SPECS: Record<string, LanguageSpec>;
declare const LANGUAGE_PAIR_ANCHORS: Record<string, LanguageAnchor[]>;
declare function resolveLanguagePairAnchors(sourceLang?: string, targetLang?: string): LanguageAnchor[];

declare function buildSystemPrompt(sourceLang?: string, targetLang?: string, isLongInput?: boolean, context?: string, tone?: "general" | "social" | "tech", customSlots?: SlotConfig[] | CustomSlotsConfig, killList?: string[], globalKillList?: string[], systemHint?: string | string[], explainLang?: string): string;
declare function buildDirectRewriteSystemPrompt(options: {
    sourceLang?: string;
    targetLang?: string;
    promptLang?: string;
    promptRule?: string | string[];
    learnInRewrite?: boolean;
    context?: string;
}): string;
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

declare function markConfigSynced(): void;
declare function hasExternalConfigUpdate(): boolean;
declare function invalidateUserConfigCache(): void;
declare function isTestEnvironment(): boolean;
/**
 * Resolve Pi agent directory (respecting PI_CODING_AGENT_DIR / PI_CONFIG_DIR for sandbox isolation).
 */
declare function getPiAgentDir(): string;
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

declare const BLOCKED_JSON_KEYS: Set<string>;
declare function toCleanString(val: unknown): string;
/**
 * Featherweight JSON repair & object extractor (protected against prototype pollution & >32KB payloads).
 */
declare function repairAndParseJsonObject(raw: string): Record<string, any> | null;
declare function extractCleanJsonField(raw: string, fieldName: string): string;
/**
 * Parse LLM JSON responses safely (shared across translateCore and translatePrompt).
 */
declare function parseLlmResponse(raw: string): TranslationPayload | null;
/**
 * Strip annotations and recover purely clean text to prevent LLM prompt pollution.
 */
declare function stripLingualAnnotation(annotatedText: string): {
    raw: string;
    spoken?: string;
    written?: string;
    vocab?: string;
};

declare const DEFAULT_CONFIG: LingualConfig;
declare function withStreamingPartial(cfg: LingualConfig): LingualConfig;
/**
 * Unified LLM transport primitive: handles AbortController timeout synthesis, custom completer, and OpenAI endpoint fallback.
 */
declare function executeLlmCompletion(text: string, sysPrompt: string, cfg: LingualConfig): Promise<string | null>;

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

declare const LINGUAL_SYSTEM_PROMPT: string;
declare const MAX_TRANSLATION_CHARS = 2500;
declare const MAX_TRANSLATION_LINES = 30;
declare function shouldTriggerTranslation(text: string, sourceLang?: string, allowSameLangPromptOpt?: boolean): boolean;
declare function isDynamicLongInput(text: string, sourceLang?: string): boolean;
interface LingualCoreOptions {
    completer?: (prompt: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
    cache?: LingualLruCache<TranslationPayload>;
    signal?: AbortSignal;
}
declare function translateCore(req: LingualRequest, options?: LingualCoreOptions): Promise<LingualResponse>;
declare function translatePrompt(text: string, userConfig?: Partial<LingualConfig> & {
    modeConfig?: CustomModeConfig;
}): Promise<LingualResult | null>;
declare function shouldInjectNativeReplyGuard(originalText: string, _sourceLang?: string, enabled?: boolean): boolean;
declare function formatNativeReplyGuardHint(sourceLang?: string): string;
declare function compileModeSystemPrompt(mode: CustomModeConfig, options: {
    sourceLang?: string;
    targetLang?: string;
    explainLang?: string;
    globalKillList?: string[];
    context?: string;
    isLongInput?: boolean;
}): string;
declare function executeModeRunner(text: string, mode: CustomModeConfig, userConfig?: Partial<LingualConfig> & {
    context?: string;
}): Promise<PromptCandidate[] | null>;
declare function generatePromptCandidates(text: string, userConfig?: Partial<LingualConfig>): Promise<PromptCandidate[] | null>;
declare function rewritePromptDirect(text: string, userConfig?: Partial<LingualConfig>): Promise<string | null>;

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
declare function localizeModeName(modeId: string, currentName: string, sourceLang?: string): string;
declare function localizeModes(modes: CustomModeConfig[], sourceLang?: string, _explainLang?: string): CustomModeConfig[];

declare function getDefaultFactoryModes(sourceLang?: string, _explainLang?: string): CustomModeConfig[];
interface LoadoutDefinition {
    id: string;
    name: string;
    description: string;
    loadout: (sourceLang?: string, explainLang?: string) => CustomModeConfig;
}
declare const PRESET_LOADOUTS: Record<string, LoadoutDefinition>;
declare function getPresetLoadout(id: string, sourceLang?: string, explainLang?: string): CustomModeConfig | null;
declare function listPresetLoadouts(): LoadoutDefinition[];

declare const LANGUAGE_PRESETS: Record<string, LingualI18nLabels>;
declare const SUPPORTED_LANG_CODES: string[];
declare function isSupportedLangCode(code: string): boolean;
declare function normalizeLangCode(input: string): string;
declare function resolveLangPair(input: string, fallbackPair: string): {
    source: string;
    target: string;
};
declare function resolveLabelsForLang(lang?: string, overrides?: Partial<LingualI18nLabels>, targetLang?: string): LingualI18nLabels;
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

declare function clearRepoFileCache(): void;
declare function listRepoFiles(cwd?: string): string[];
declare function extractQueryIdentifiers(text: string): string[];
declare function resolveRepoFileAnchors(text: string, cwd?: string, maxResults?: number, filesOverride?: string[]): string[];
declare function formatRepoGroundingHint(anchors: string[]): string;

interface PhrasebookEntry {
    term: string;
    meaning: string;
    langPair: string;
    modeId: string;
    contextSnippet: string;
    count: number;
    firstSeenAt: number;
    lastSeenAt: number;
}
declare function resolvePhrasebookPath(customPath?: string): string | null;
declare function parseVocabEntries(vocabText: string | undefined): Array<{
    term: string;
    meaning: string;
}>;
declare function readPhrasebook(customPath?: string): PhrasebookEntry[];
declare function recordPhrasebookFromResult(params: {
    vocab?: string;
    sourceText?: string;
    sourceLang: string;
    targetLang: string;
    modeId: string;
}, customPath?: string): number;
declare function clearPhrasebook(customPath?: string): boolean;
declare function formatPhrasebookDigest(entries: PhrasebookEntry[], limit?: number): string;
declare function exportPhrasebook(entries: PhrasebookEntry[], format: "md" | "anki", outDir?: string): {
    filePath: string;
    count: number;
};

export { buildPromptCandidatesSystemPrompt as $, PRESET_LOADOUTS as A, BLOCKED_JSON_KEYS as B, type CustomModeConfig as C, DEFAULT_CONFIG as D, type ExtensionState as E, PROMPT_RULE_PRESETS as F, type PhrasebookEntry as G, type HudVariant as H, type PromptCandidate as I, type ResolveModeOptions as J, SEED_NAMES as K, type LingualResult as L, type ModeRuntime as M, SUPPORTED_LANG_CODES as N, type SanitizedPromptResult as O, type PromptSlotConfig as P, type SeedNames as Q, type ReasoningEffort as R, type SlotConfig as S, type SlotDefinition as T, type SlotLabelsDef as U, type SlotResult as V, type SlotRole as W, type TranslationPayload as X, type UserLingualConfig as Y, buildDirectRewriteSystemPrompt as Z, buildModifySystemPrompt as _, type LingualI18nLabels as a, resolveLabelsForLang as a$, buildStreamingResult as a0, buildSystemPrompt as a1, clearPhrasebook as a2, clearRepoFileCache as a3, compileKillListInstruction as a4, compileModeSystemPrompt as a5, defaultSlotsForMode as a6, detectScriptLanguage as a7, ensureCodeTokensPreserved as a8, executeLlmCompletion as a9, isSupportedLangCode as aA, isTargetLanguageOnly as aB, isTestEnvironment as aC, isUserLingualConfigured as aD, listPresetLoadouts as aE, listRepoFiles as aF, loadUserConfig as aG, loadUserLingualConfig as aH, localizeModeName as aI, localizeModes as aJ, localizeSlotLabel as aK, markConfigSynced as aL, normalizeActiveModeId as aM, normalizeHudVariant as aN, normalizeLangCode as aO, normalizeLingualModeInput as aP, normalizePromptRules as aQ, parseLlmResponse as aR, parsePartialJsonFields as aS, parseVocabEntries as aT, pickPrimaryContent as aU, primarySlot as aV, readPhrasebook as aW, recordPhrasebookFromResult as aX, repairAndParseJsonObject as aY, resolveCandidateSlotsFromConfig as aZ, resolveDirectSlotsFromConfig as a_, executeModeRunner as aa, exportPhrasebook as ab, extractCleanJsonField as ac, extractQueryIdentifiers as ad, formatModelSelectionMessage as ae, formatNativeReplyGuardHint as af, formatPhrasebookDigest as ag, formatRepoGroundingHint as ah, formatStatusReport as ai, generatePromptCandidates as aj, getDefaultDirectSlots as ak, getDefaultFactoryModes as al, getDefaultModifySlots as am, getDefaultPromptSlots as an, getDefaultSlots as ao, getPiAgentDir as ap, getPresetLoadout as aq, globalLinguaCache as ar, globalLingualCache as as, hasExternalConfigUpdate as at, hasSourceScript as au, interpolatePromptVariables as av, invalidateUserConfigCache as aw, isDynamicLongInput as ax, isImperativeEngineeringPrompt as ay, isNonEnglish as az, type CacheStats as b, resolveLangPair as b0, resolveLanguageName as b1, resolveLanguagePairAnchors as b2, resolveModeDisplayName as b3, resolveModeRuntime as b4, resolveModesFromConfig as b5, resolveModifySlotsFromConfig as b6, resolvePhrasebookPath as b7, resolvePromptRulePreset as b8, resolvePromptTargetLangName as b9, resolveRepoFileAnchors as ba, resolveSeedNames as bb, resolveSlotLabels as bc, rewritePromptDirect as bd, runtimeLanguagePair as be, sanitizePromptForTranslation as bf, saveUserLingualConfig as bg, shouldInjectNativeReplyGuard as bh, shouldShieldBypass as bi, shouldTriggerTranslation as bj, stripLingualAnnotation as bk, toCleanString as bl, translateCore as bm, translatePrompt as bn, withStreamingPartial as bo, type CustomSlotsConfig as c, DEFAULT_KILL_LIST as d, LANGUAGE_PAIR_ANCHORS as e, LANGUAGE_PRESETS as f, LANGUAGE_SPECS as g, LEGACY_SLOT_PRESETS as h, LINGUAL_SYSTEM_PROMPT as i, type LanguageAnchor as j, type LanguageSpec as k, type LinguaI18nLabels as l, LinguaLruCache as m, type LingualConfig as n, type LingualCoreOptions as o, LingualLruCache as p, type LingualMode as q, type LingualRequest as r, type LingualResponse as s, type LoadoutDefinition as t, MAX_TRANSLATION_CHARS as u, MAX_TRANSLATION_LINES as v, type ModeAction as w, type ModeFlow as x, type ModeHud as y, type ModeTarget as z };
