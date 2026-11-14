import { S as SlotConfig, C as CustomModeConfig, P as PromptSlotConfig, L as LingualResult, a as LingualI18nLabels, b as LookupConfig, c as LookupStrings, d as LookupRequest, E as ExtensionState, M as ModeRuntime } from './index-77UGxb_0.cjs';
export { B as BLOCKED_JSON_KEYS, e as CacheStats, f as CustomSlotsConfig, D as DEFAULT_CONFIG, g as DEFAULT_KILL_LIST, h as DEFAULT_LOOKUP, H as HudVariant, J as JournalConfig, i as LANGUAGE_PAIR_ANCHORS, j as LANGUAGE_PRESETS, k as LANGUAGE_SPECS, l as LEGACY_SLOT_PRESETS, m as LINGUAL_SYSTEM_PROMPT, n as LOOKUP_MAX_TOKENS, o as LanguageAnchor, p as LanguageSpec, q as LinguaI18nLabels, r as LinguaLruCache, s as LingualConfig, t as LingualCoreOptions, u as LingualLruCache, v as LingualMode, w as LingualRequest, x as LingualResponse, y as LoadoutDefinition, z as LookupDeps, A as LookupError, F as LookupProvider, G as MAX_TRANSLATION_CHARS, I as MAX_TRANSLATION_LINES, K as ModeAction, N as ModeFlow, O as ModeHud, Q as ModeTarget, R as PRESET_LOADOUTS, T as PROMPT_RULE_PRESETS, U as PhrasebookEntry, V as PromptCandidate, W as ReasoningEffort, X as ResolveModeOptions, Y as SEED_NAMES, Z as SUPPORTED_LANG_CODES, _ as SanitizedPromptResult, $ as SeedNames, a0 as SlotDefinition, a1 as SlotLabelsDef, a2 as SlotResult, a3 as SlotRole, a4 as TranslationPayload, a5 as UserLingualConfig, a6 as appendJournalCard, a7 as buildDirectRewriteSystemPrompt, a8 as buildModifySystemPrompt, a9 as buildPromptCandidatesSystemPrompt, aa as buildStreamingResult, ab as buildSystemPrompt, ac as clearJournalMemoryCache, ad as clearPhrasebook, ae as clearRepoFileCache, af as compileKillListInstruction, ag as compileModeSystemPrompt, ah as defaultSlotsForMode, ai as detectScriptLanguage, aj as ensureCodeTokensPreserved, ak as executeLlmCompletion, al as executeModeRunner, am as exportPhrasebook, an as extractCleanJsonField, ao as extractQueryIdentifiers, ap as formatJournalCardMarkdown, aq as formatJournalDate, ar as formatJournalTime, as as formatModelSelectionMessage, at as formatNativeReplyGuardHint, au as formatPhrasebookDigest, av as formatRepoGroundingHint, aw as formatStatusReport, ax as generatePromptCandidates, ay as getDefaultDirectSlots, az as getDefaultFactoryModes, aA as getDefaultModifySlots, aB as getDefaultPromptSlots, aC as getDefaultSlots, aD as getPiAgentDir, aE as getPresetLoadout, aF as globalLinguaCache, aG as globalLingualCache, aH as globalLookupCache, aI as googleTargetCode, aJ as hasExternalConfigUpdate, aK as hasSourceScript, aL as interpolatePromptVariables, aM as invalidateUserConfigCache, aN as isDynamicLongInput, aO as isImperativeEngineeringPrompt, aP as isLookupSelection, aQ as isNonEnglish, aR as isSupportedLangCode, aS as isTargetLanguageOnly, aT as isTestEnvironment, aU as isUserLingualConfigured, aV as listPresetLoadouts, aW as listRepoFiles, aX as loadUserConfig, aY as loadUserLingualConfig, aZ as localizeModeName, a_ as localizeModes, a$ as localizeSlotLabel, b0 as lookupSystemPrompt, b1 as lookupTranslate, b2 as markConfigSynced, b3 as normalizeActiveModeId, b4 as normalizeHudVariant, b5 as normalizeLangCode, b6 as normalizeLingualModeInput, b7 as normalizePromptRules, b8 as normalizeSelection, b9 as parseGoogleLookup, ba as parseLlmResponse, bb as parsePartialJsonFields, bc as parseVocabEntries, bd as pickPrimaryContent, be as primarySlot, bf as readPhrasebook, bg as recordPhrasebookFromResult, bh as repairAndParseJsonObject, bi as resolveCandidateSlotsFromConfig, bj as resolveDailyJournalPath, bk as resolveDirectSlotsFromConfig, bl as resolveJournalConfig, bm as resolveLabelsForLang, bn as resolveLangPair, bo as resolveLanguageName, bp as resolveLanguagePairAnchors, bq as resolveLookupConfig, br as resolveLookupStrings, bs as resolveModeDisplayName, bt as resolveModeRuntime, bu as resolveModesFromConfig, bv as resolveModifySlotsFromConfig, bw as resolvePhrasebookPath, bx as resolvePromptRulePreset, by as resolvePromptTargetLangName, bz as resolveRepoFileAnchors, bA as resolveSeedNames, bB as resolveSlotLabels, bC as rewritePromptDirect, bD as runtimeLanguagePair, bE as sanitizePromptForTranslation, bF as saveUserLingualConfig, bG as shouldInjectNativeReplyGuard, bH as shouldShieldBypass, bI as shouldTriggerTranslation, bJ as stripLingualAnnotation, bK as toCleanString, bL as translateCore, bM as translatePrompt, bN as withStreamingPartial } from './index-77UGxb_0.cjs';
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

/**
 * Observing what the user copied in the fullscreen transcript.
 *
 * Fullscreen mode owns text selection: a double-click, a drag, and the copy
 * keybinding all end in the same injected clipboard callback that pi hands to
 * the alternate-screen renderer. The TUI exposes no copy event and consumes
 * mouse input before extension listeners see it, so that callback is the only
 * place a lookup can learn "the user copied this". We wrap it on the live
 * renderer instance, leave pi's own clipboard behaviour untouched, and notify
 * only after a copy that actually succeeded.
 */
type CopyHookTarget = "copySelection" | "copyTextToClipboard" | "none";
type CopyListener = (text: string) => void;
declare function attachCopyHook(tui: unknown, listener: CopyListener): CopyHookTarget;

/**
 * Wires a copied selection to the lookup popup.
 *
 * The controller owns the short-lived state a popup needs: the overlay handle,
 * the auto-dismiss timer, the in-flight request, and a small cache so that
 * double-clicking the same word twice does not buy the same lookup twice.
 * Settings are read through a callback on every use, so `/lang` and
 * `/lingual lookup` take effect without re-attaching anything.
 */

type LookupComplete = (text: string, systemPrompt: string, signal: AbortSignal) => Promise<string | null>;
interface LookupSettings {
    config: LookupConfig;
    /** Reader's language: where the copied text is translated to. */
    nativeLang: string;
    /** Language of the transcript: what a copied selection is expected to be. */
    foreignLang: string;
    strings: LookupStrings;
    complete?: LookupComplete;
}
interface LookupControllerDeps {
    translate?: (request: LookupRequest, deps: {
        complete?: LookupComplete;
    }) => Promise<string>;
}
declare class LookupController {
    private readonly settings;
    private readonly runLookup;
    private ctx?;
    private tui?;
    private overlay?;
    private popup?;
    private dismissTimer?;
    private abort?;
    private inFlight?;
    private last?;
    private unsupportedWarned;
    constructor(settings: () => LookupSettings, deps?: LookupControllerDeps);
    /** The freshest context, so the popup follows `/model` and other session changes. */
    setContext(ctx: ExtensionContext | null | undefined): void;
    get lastSelection(): string | undefined;
    /** Wraps the renderer's clipboard callback. Returns which callback was found. */
    attach(tui: unknown, notifyUnsupported: (message: string) => void): CopyHookTarget;
    private onCopy;
    /** Open the popup for `raw`. Resolves once the translation is on screen or has failed. */
    show(raw: string): Promise<void>;
    private showUnsafe;
    close(): void;
    private openPopup;
    private requestRender;
    private scheduleDismiss;
    private clearDismissTimer;
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
    lookupController?: LookupController;
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
    lookupHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    journalHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
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

/**
 * The lookup popup.
 *
 * Rendered into a non-capturing overlay so typing keeps going to the editor
 * while the translation is on screen. The layout follows the same open
 * left-rail idiom as the HUD card (no closed box, width measured with the
 * UAX #11 helper) because that is what keeps CJK from tearing the frame.
 */

type LookupPopupStatus = "loading" | "ready" | "error";
/** Minimal surface of the pi theme object the popup needs. */
interface PopupTheme {
    fg(color: string, text: string): string;
    bold(text: string): string;
}
interface MousePress {
    type: string;
}
declare class LookupPopup {
    private readonly theme;
    private readonly strings;
    private readonly headword;
    private readonly hint;
    private readonly onDismiss;
    private status;
    private body;
    private cachedWidth?;
    private cachedLines?;
    constructor(theme: PopupTheme, strings: LookupStrings, headword: string, hint: string, onDismiss: () => void);
    get currentStatus(): LookupPopupStatus;
    get currentBody(): string;
    setResult(text: string): void;
    setError(message: string): void;
    invalidate(): void;
    handleMouse(event: MousePress): {
        handled: boolean;
        render: boolean;
    } | undefined;
    render(width: number): string[];
    private layout;
    private bodyText;
    /**
     * Theme methods must be called through the object: pi implements `fg` as a
     * class method, so a destructured reference loses `this` and throws inside
     * the renderer. A dead theme degrades to plain text instead of a crash.
     */
    private paint;
    private strong;
}
/** Popup width: half the terminal, clamped so a single word still has room. */
declare function lookupPopupWidth(columns: number): number;

export { CANNOT_START_LINE_CHARS, CURRENT_FEATURE_BANNER_VERSION, type CommandHandlerDeps, type CommandHandlers, type CopyHookTarget, CustomModeConfig, ExtensionState, LingualI18nLabels, LingualResult, LingualSessionController, type LookupComplete, LookupConfig, LookupController, type LookupControllerDeps, LookupPopup, type LookupPopupStatus, LookupRequest, type LookupSettings, LookupStrings, type ModeDisplaySpec, type ModePickerOption, ModeRuntime, type MousePress, type PaginationSnapshot, type PopupTheme, PromptSlotConfig, SLOT_PRESETS, type SelectPromptSpec, type SessionRequestToken, SlotConfig, type SlotPresetDefinition, addCustomMode, addSlotToList, addSlotToMode, attachCopyHook, createCommandHandlers, createCustomSlot, createModelCompleter, extractVocabPhrases, formatCapsuleLine, formatLoadingMessage, formatModePickerLines, formatReleaseBannerLines, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getBannerMaxCols, getEffectiveMaxCols, getPiGlobalDefaultModel, getVisualWidth, lookupPopupWidth, moveSlotInList, removeCustomMode, removeSlotFromList, removeSlotFromMode, renderCardLayout, resolveModeDisplaySpec, resolveReleaseBannerLang, resolveSelectPrompts, resolveSlotsForPreset, resolveTargetModel, splitSemanticChunks, spotlightPhrases, stripLingualContextWhenOff, toggleCustomMode, toggleSlotInList, truncateVisual, updateCustomMode, updateSlotInList, wrapVisualText, wrapVocabItemsAtomic };
