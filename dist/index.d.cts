import { S as SlotConfig, C as CustomModeConfig, P as PromptSlotConfig, L as LingualResult, a as LingualI18nLabels, E as ExtensionState, M as ModeRuntime } from './index-BHpoeBEe.cjs';
export { B as BLOCKED_JSON_KEYS, b as CacheStats, c as CustomSlotsConfig, D as DEFAULT_CONFIG, d as DEFAULT_KILL_LIST, H as HudVariant, e as LANGUAGE_PAIR_ANCHORS, f as LANGUAGE_PRESETS, g as LANGUAGE_SPECS, h as LEGACY_SLOT_PRESETS, i as LINGUAL_SYSTEM_PROMPT, j as LanguageAnchor, k as LanguageSpec, l as LinguaI18nLabels, m as LinguaLruCache, n as LingualConfig, o as LingualCoreOptions, p as LingualLruCache, q as LingualMode, r as LingualRequest, s as LingualResponse, t as LoadoutDefinition, u as MAX_TRANSLATION_CHARS, v as MAX_TRANSLATION_LINES, w as ModeAction, x as ModeFlow, y as ModeHud, z as ModeTarget, A as PRESET_LOADOUTS, F as PROMPT_RULE_PRESETS, G as PhrasebookEntry, I as PromptCandidate, R as ReasoningEffort, J as ResolveModeOptions, K as SEED_NAMES, N as SUPPORTED_LANG_CODES, O as SanitizedPromptResult, Q as SeedNames, T as SlotDefinition, U as SlotLabelsDef, V as SlotResult, W as SlotRole, X as TranslationPayload, Y as UserLingualConfig, Z as buildDirectRewriteSystemPrompt, _ as buildModifySystemPrompt, $ as buildPromptCandidatesSystemPrompt, a0 as buildStreamingResult, a1 as buildSystemPrompt, a2 as clearPhrasebook, a3 as clearRepoFileCache, a4 as compileKillListInstruction, a5 as compileModeSystemPrompt, a6 as defaultSlotsForMode, a7 as detectScriptLanguage, a8 as ensureCodeTokensPreserved, a9 as executeLlmCompletion, aa as executeModeRunner, ab as exportPhrasebook, ac as extractCleanJsonField, ad as extractQueryIdentifiers, ae as formatModelSelectionMessage, af as formatNativeReplyGuardHint, ag as formatPhrasebookDigest, ah as formatRepoGroundingHint, ai as formatStatusReport, aj as generatePromptCandidates, ak as getDefaultDirectSlots, al as getDefaultFactoryModes, am as getDefaultModifySlots, an as getDefaultPromptSlots, ao as getDefaultSlots, ap as getPiAgentDir, aq as getPresetLoadout, ar as globalLinguaCache, as as globalLingualCache, at as hasExternalConfigUpdate, au as hasSourceScript, av as interpolatePromptVariables, aw as invalidateUserConfigCache, ax as isDynamicLongInput, ay as isImperativeEngineeringPrompt, az as isNonEnglish, aA as isSupportedLangCode, aB as isTargetLanguageOnly, aC as isTestEnvironment, aD as isUserLingualConfigured, aE as listPresetLoadouts, aF as listRepoFiles, aG as loadUserConfig, aH as loadUserLingualConfig, aI as localizeModeName, aJ as localizeModes, aK as localizeSlotLabel, aL as markConfigSynced, aM as normalizeActiveModeId, aN as normalizeHudVariant, aO as normalizeLangCode, aP as normalizeLingualModeInput, aQ as normalizePromptRules, aR as parseLlmResponse, aS as parsePartialJsonFields, aT as parseVocabEntries, aU as pickPrimaryContent, aV as primarySlot, aW as readPhrasebook, aX as recordPhrasebookFromResult, aY as repairAndParseJsonObject, aZ as resolveCandidateSlotsFromConfig, a_ as resolveDirectSlotsFromConfig, a$ as resolveLabelsForLang, b0 as resolveLangPair, b1 as resolveLanguageName, b2 as resolveLanguagePairAnchors, b3 as resolveModeDisplayName, b4 as resolveModeRuntime, b5 as resolveModesFromConfig, b6 as resolveModifySlotsFromConfig, b7 as resolvePhrasebookPath, b8 as resolvePromptRulePreset, b9 as resolvePromptTargetLangName, ba as resolveRepoFileAnchors, bb as resolveSeedNames, bc as resolveSlotLabels, bd as rewritePromptDirect, be as runtimeLanguagePair, bf as sanitizePromptForTranslation, bg as saveUserLingualConfig, bh as shouldInjectNativeReplyGuard, bi as shouldShieldBypass, bj as shouldTriggerTranslation, bk as stripLingualAnnotation, bl as toCleanString, bm as translateCore, bn as translatePrompt, bo as withStreamingPartial } from './index-BHpoeBEe.cjs';
import { ExtensionContext, ExtensionAPI } from '@earendil-works/pi-coding-agent';

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

interface SlotPresetDefinition {
    name: string;
    description: string;
    slots: (sourceLang?: string) => SlotConfig[];
}
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
 * Unicode UAX #11 visual width measurement, delimiter-balanced truncation,
 * and Kinsoku Shori line wrapping.
 */
declare const CANNOT_START_LINE_CHARS: Set<string>;
declare function getEffectiveMaxCols(requested?: number): number;
declare function getBannerMaxCols(): number;
declare function getVisualWidth(str: string): number;
declare function truncateVisual(str: string, maxVisualCols: number): string;
declare function wrapVisualText(text: string, maxWidth: number): string[];

declare function formatTreeBranch(branchChar: string, contChar: string, tag: string, content: string, prefixDecorator?: (p: string) => string, tagDecorator?: (t: string) => string, contDecorator?: (c: string) => string, lineDecorator?: ((l: string) => string) | number, maxCols?: number): string[];
declare function formatSubRail(contChar: string, nuanceText: string, arrow?: string, contDecorator?: (c: string) => string, lineDecorator?: (l: string) => string, maxCols?: number, indentCols?: number): string[];
declare function extractVocabPhrases(vocab: string | undefined): string[];
declare function spotlightPhrases(text: string, phrases: string[]): string;
declare function wrapVocabItemsAtomic(vocab: string, availW: number): string[];
declare function formatVocabItemsAtomic(vocab: string, prefix: string, maxCols: number): string;
declare function formatTerminalAnnotation(sourceText: string, spoken: string, written?: string, vocab?: string, options?: {
    spokenMeaning?: string;
    writtenMeaning?: string;
    slot1Label?: string;
    slot2Label?: string;
    vocabLabel?: string;
    sourceLabel?: string;
    spotlight?: boolean;
}): string;
declare function formatCapsuleLine(hudTitle: string, spoken: string, written?: string, options?: number | {
    slot1Short?: string;
    slot2Short?: string;
    maxCols?: number;
}): string;

declare function formatLoadingMessage(rawMsg: string, maxCols?: number): string;
interface ModePickerOption {
    num: number | string;
    id: string;
    name: string;
    englishTag?: string;
}
declare function formatModePickerLines(title: string, hint: string, pair: string, options: ModePickerOption[], selectedIndex: number, maxCols?: number, theme?: {
    fg: (color: string, text: string) => string;
    bold?: (text: string) => string;
}): string[];
declare function renderCardLayout(card: LingualResult, labels: LingualI18nLabels, options?: {
    maxCols?: number;
    maxLines?: number;
    isCompact?: boolean;
    isStreaming?: boolean;
    variant?: "tree" | "preview" | "takeaway" | "none";
    isLong?: boolean;
    slots?: SlotConfig[];
    pageTag?: string;
    themeDecorators?: {
        muted: (s: string) => string;
        accent: (s: string) => string;
        dim: (s: string) => string;
    };
}): string[];

/**
 * On-Demand Tuner Skill Gate (`stripLingualContextWhenOff`).
 */
declare function stripLingualContextWhenOff(systemPrompt: string, lastUserText?: string, tunerArmed?: boolean): string;

/**
 * Splits text into atomic natural sentence chunks when long.
 * Preserves punctuation (。！？；\n and .!?\n).
 *
 * Line Budget & Ergonomics:
 * Calibrated to ~65 characters per card to ensure full tree branches fit within 6-8 lines
 * without triggering compact capsule degradation or over-fragmenting short inputs.
 */
declare function splitSemanticChunks(text: string, maxChunkChars?: number): string[];

/**
 * Monotonic Session FSM & Cooperative Abort Controller.
 *
 * Responsibilities:
 * 1. Monotonic generation counter tracking: eliminates asynchronous race conditions and stale callback overwrites.
 * 2. Cooperative AbortController cancellation: immediately aborts in-flight remote sockets when a new prompt arrives.
 * 3. Encapsulates pagination pool and history card cache, eliminating scattered mutable state.
 * 4. Zero external dependencies, pure native TypeScript event model.
 */

interface SessionRequestToken {
    readonly generation: number;
    readonly signal: AbortSignal;
}
interface PaginationSnapshot {
    readonly pageIndex: number;
    readonly totalPages: number;
    readonly readyCount: number;
    readonly isMultiPage: boolean;
}
declare class LingualSessionController {
    private activeAbortController;
    private currentGeneration;
    private pagedResults;
    private currentPageIndex;
    private totalExpectedPages;
    private lastResult;
    /**
     * Begins a new session request:
     * 1. Aborts in-flight HTTP stream/request from previous turn;
     * 2. Increments monotonic generation counter;
     * 3. Binds a fresh AbortSignal.
     */
    beginRequest(): SessionRequestToken;
    /**
     * Aborts currently active in-flight network requests.
     */
    abortActive(): void;
    /**
     * Checks if the specified generation token is still the latest active generation.
     */
    isLatest(generation: number): boolean;
    /**
     * Gets the latest generation counter value.
     */
    getCurrentGeneration(): number;
    /**
     * Initializes the pagination pool when input is split into multiple semantic chunks.
     */
    initPagination(totalExpectedPages: number): void;
    /**
     * Sets page result for a chunk index with generation guard to reject stale writes.
     */
    setPageResult(chunkIndex: number, result: LingualResult, generation: number): boolean;
    /**
     * Gets translation result for currently active page.
     */
    getActiveResult(): LingualResult | null;
    /**
     * Gets all ready page results.
     */
    getReadyPages(): LingualResult[];
    /**
     * Gets a snapshot of the current pagination state.
     */
    getPaginationSnapshot(): PaginationSnapshot;
    /**
     * Cycles to the next ready page.
     * Returns true if pagination changed.
     */
    nextPage(): boolean;
    /**
     * Cycles to the previous ready page.
     * Returns true if pagination changed.
     */
    prevPage(): boolean;
    /**
     * Clears pagination pool on non-translatable input or teardown to prevent ghost cards.
     */
    clearPagination(): void;
    /**
     * Gets the most recent translation result for /last replay.
     */
    getLastResult(): LingualResult | null;
    /**
     * Explicitly sets the last translation result.
     */
    setLastResult(result: LingualResult | null): void;
    /**
     * Resets the controller completely.
     */
    reset(): void;
}

interface CommandHandlerDeps {
    state: ExtensionState;
    session: LingualSessionController;
    updateFooter: (ctx: ExtensionContext | null | undefined) => void;
    refreshActiveView: (ctx: ExtensionContext) => void;
    renderActiveCard: (ctx: ExtensionContext) => void;
    renderHudWidget: (ctx: ExtensionContext, result: LingualResult, rt: ModeRuntime, extras?: {
        pageTag?: string;
        isLong?: boolean;
        isStreaming?: boolean;
    }) => void;
    activeRuntime: () => ModeRuntime;
    renderReleaseBanner: (ctx: ExtensionContext, explicitLang?: string) => boolean;
    syncResizeListener: () => void;
    clearPendingTimers: () => void;
    armTuner: () => void;
    pi: ExtensionAPI;
}
interface CommandHandlers {
    setModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    setModelHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    switchLangHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    toggleCompactHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    switchSlotsHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    showStatusHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    showLastHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    copyLastHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    manageModesHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    manageLoadoutsHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    showAgentGuideHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    digestHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    setReasoningHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    setDefaultModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    masterCommandHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
}

declare function createCommandHandlers(deps: CommandHandlerDeps): CommandHandlers;

/**
 * Reads the user's global default model from Pi's settings.json (~/.pi/agent/settings.json).
 * This directly respects the user's configured global Pi default model without heuristics.
 */
declare function getPiGlobalDefaultModel(): {
    modelId?: string;
    provider?: string;
} | null;
/**
 * Resolves the target model for Lingual translation.
 * Priority:
 * 1. User pinned model in lingual.json or explicit /lingual model <id>
 * 2. Explicit session follow (/lingual model session)
 * 3. Default (auto): Pi's global defaultModel from ~/.pi/agent/settings.json
 * 4. Fallback: Current active conversation model (ctx.model)
 */
declare function resolveTargetModel(ctx: ExtensionContext, selectedModel?: string): any;
/**
 * Host-native model completer: zero-config in-process model execution.
 */
declare function createModelCompleter(ctx: ExtensionContext, getSelectedModel: () => string, defaultOpts?: {
    reasoning?: string;
}): (text: string, systemPrompt: string, signal?: AbortSignal, callOpts?: {
    reasoning?: string;
    onDelta?: (fullText: string) => void;
}) => Promise<string | null>;

export { CANNOT_START_LINE_CHARS, CURRENT_FEATURE_BANNER_VERSION, type CommandHandlerDeps, type CommandHandlers, CustomModeConfig, ExtensionState, LingualI18nLabels, LingualResult, LingualSessionController, type ModeDisplaySpec, type ModePickerOption, ModeRuntime, type PaginationSnapshot, PromptSlotConfig, SLOT_PRESETS, type SelectPromptSpec, type SessionRequestToken, SlotConfig, type SlotPresetDefinition, addCustomMode, addSlotToList, addSlotToMode, createCommandHandlers, createCustomSlot, createModelCompleter, extractVocabPhrases, formatCapsuleLine, formatLoadingMessage, formatModePickerLines, formatReleaseBannerLines, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getBannerMaxCols, getEffectiveMaxCols, getPiGlobalDefaultModel, getVisualWidth, moveSlotInList, removeCustomMode, removeSlotFromList, removeSlotFromMode, renderCardLayout, resolveModeDisplaySpec, resolveReleaseBannerLang, resolveSelectPrompts, resolveSlotsForPreset, resolveTargetModel, splitSemanticChunks, spotlightPhrases, stripLingualContextWhenOff, toggleCustomMode, toggleSlotInList, truncateVisual, updateCustomMode, updateSlotInList, wrapVisualText, wrapVocabItemsAtomic };
