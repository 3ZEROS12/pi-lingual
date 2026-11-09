import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig, b as LookupConfig, c as LookupStrings, d as LookupRequest, E as ExtensionState, M as ModeRuntime } from './index-CnpWv_ur.js';
export { C as CURRENT_FEATURE_BANNER_VERSION, e as CacheStats, f as CustomModeConfig, g as CustomSlotsConfig, D as DEFAULT_CONFIG, h as DEFAULT_KILL_LIST, H as HudVariant, i as LANGUAGE_PAIR_ANCHORS, j as LANGUAGE_PRESETS, k as LANGUAGE_SPECS, l as LEGACY_SLOT_PRESETS, m as LINGUAL_SYSTEM_PROMPT, n as LINGUA_SYSTEM_PROMPT, o as LanguageAnchor, p as LanguageSpec, q as LinguaConfig, r as LinguaI18nLabels, s as LinguaLruCache, t as LinguaMode, u as LinguaResult, v as LingualConfig, w as LingualCoreOptions, x as LingualLruCache, y as LingualMode, z as LingualRequest, A as LingualResponse, B as LoadoutDefinition, F as MAX_TRANSLATION_CHARS, G as MAX_TRANSLATION_LINES, I as ModeAction, J as ModeDisplaySpec, K as ModeFlow, N as ModeHud, O as ModeTarget, P as PRESET_LOADOUTS, Q as PROMPT_RULE_PRESETS, R as PromptCandidate, T as PromptSlotConfig, U as ReasoningEffort, V as ResolveModeOptions, W as SEED_NAMES, X as SLOT_PRESETS, Y as SUPPORTED_LANG_CODES, Z as SanitizedPromptResult, _ as SeedNames, $ as SelectPromptSpec, a0 as SlotDefinition, a1 as SlotPresetDefinition, a2 as SlotResult, a3 as SlotRole, a4 as TranslationPayload, a5 as UserLingualConfig, a6 as addCustomMode, a7 as addSlotToList, a8 as addSlotToMode, a9 as buildDirectRewriteSystemPrompt, aa as buildModifySystemPrompt, ab as buildPromptCandidatesSystemPrompt, ac as buildStreamingResult, ad as buildSystemPrompt, ae as compileKillListInstruction, af as compileModeSystemPrompt, ag as createCustomSlot, ah as defaultSlotsForMode, ai as detectScriptLanguage, aj as ensureCodeTokensPreserved, ak as executeModeRunner, al as formatModelSelectionMessage, am as formatNativeReplyGuardHint, an as formatReleaseBannerLines, ao as formatStatusReport, ap as generatePromptCandidates, aq as getDefaultDirectSlots, ar as getDefaultFactoryModes, as as getDefaultModifySlots, at as getDefaultPromptSlots, au as getDefaultSlots, av as getPresetLoadout, aw as globalLinguaCache, ax as globalLingualCache, ay as hasSourceScript, az as interpolatePromptVariables, aA as invalidateUserConfigCache, aB as isDynamicLongInput, aC as isImperativeEngineeringPrompt, aD as isNonEnglish, aE as isSupportedLangCode, aF as isTargetLanguageOnly, aG as isTestEnvironment, aH as isUserLingualConfigured, aI as listPresetLoadouts, aJ as loadUserConfig, aK as loadUserLingualConfig, aL as localizeModeName, aM as localizeModes, aN as localizeSlotLabel, aO as moveSlotInList, aP as normalizeActiveModeId, aQ as normalizeHudVariant, aR as normalizeLangCode, aS as normalizeLingualModeInput, aT as normalizePromptRules, aU as parseLlmResponse, aV as parsePartialJsonFields, aW as pickPrimaryContent, aX as primarySlot, aY as removeCustomMode, aZ as removeSlotFromList, a_ as removeSlotFromMode, a$ as repairAndParseJsonObject, b0 as resolveCandidateSlotsFromConfig, b1 as resolveDirectSlotsFromConfig, b2 as resolveLabelsForLang, b3 as resolveLangPair, b4 as resolveLanguageName, b5 as resolveLanguagePairAnchors, b6 as resolveModeDisplayName, b7 as resolveModeDisplaySpec, b8 as resolveModeRuntime, b9 as resolveModesFromConfig, ba as resolveModifySlotsFromConfig, bb as resolvePromptRulePreset, bc as resolvePromptTargetLangName, bd as resolveReleaseBannerLang, be as resolveSeedNames, bf as resolveSelectPrompts, bg as resolveSlotLabels, bh as resolveSlotsForPreset, bi as rewritePromptDirect, bj as runtimeLanguagePair, bk as sanitizePromptForTranslation, bl as saveUserLingualConfig, bm as shouldInjectNativeReplyGuard, bn as shouldShieldBypass, bo as shouldTriggerTranslation, bp as stripLinguaAnnotation, bq as stripLingualAnnotation, br as stripLingualContextWhenOff, bs as toggleCustomMode, bt as toggleSlotInList, bu as translateCore, bv as translatePrompt, bw as updateCustomMode, bx as updateSlotInList } from './index-CnpWv_ur.js';
import { ExtensionContext, ExtensionAPI } from '@earendil-works/pi-coding-agent';

/**
 * Terminal Box Model & Layout Engine.
 *
 * Responsibilities:
 * 1. Strict adherence to Unicode Standard Annex #11 (East Asian Width) for terminal cell widths.
 * 2. Deterministic Kinsoku Shori line-breaking algorithm preventing orphaned punctuation.
 * 3. Strictly bounded 1-line capsule solver immune to terminal column overflow.
 * 4. Trifecta open left-rail tree branch formatting (· ┌ ├ └).
 * 5. Kinetic 9-line budget box model solver guaranteeing lines.length <= 9.
 */

/**
 * Punctuation set strictly forbidden from starting a line (Kinsoku Shori).
 */
declare const CANNOT_START_LINE_CHARS: Set<string>;
/**
 * Calculates safe visual columns with SIGWINCH crash defense.
 */
declare function getEffectiveMaxCols(requested?: number): number;
/**
 * Borderless aboveEditor banners (release notes in open-tree typography) carry no box borders,
 * so they reserve a 2-column right-edge safety margin instead of the HUD card border reserve.
 */
declare function getBannerMaxCols(): number;
/**
 * Unicode Standard Annex #11 visual cell width calculation:
 * - ANSI escape sequences (CSI / OSC) = 0 cells
 * - Zero-width characters (ZWJ / variation selectors / combining marks) = 0 cells
 * - CJK wide characters, full-width symbols, Emoji = 2 cells
 * - ASCII Latin characters = 1 cell
 */
declare function getVisualWidth(str: string): number;
/**
 * Truncates text based on visual cell width and ANSI escape boundaries (strictly <= maxVisualCols).
 */
declare function truncateVisual(str: string, maxVisualCols: number): string;
/**
 * Formats and bounds an in-flight loading notification line to the live terminal column budget.
 * Invariant 12: VisualWidth <= live columns under any terminal geometry down to extreme viewports.
 */
declare function formatLoadingMessage(rawMsg: string, maxCols?: number): string;
interface ModePickerOption {
    num: number | string;
    id: string;
    name: string;
    englishTag?: string;
}
/**
 * Formats interactive mode picker capsule view lines bounded by terminal width.
 * Invariant 12: VisualWidth <= live columns across all viewport sizes (20/30/40/80 cols).
 */
declare function formatModePickerLines(title: string, hint: string, pair: string, options: ModePickerOption[], selectedIndex: number, maxCols?: number, theme?: {
    fg: (color: string, text: string) => string;
    bold?: (text: string) => string;
}): string[];
/**
 * Visual text wrapping algorithm bounded by punctuation Kinsoku Shori and max visual width.
 */
declare function wrapVisualText(text: string, maxWidth: number): string[];
/**
 * Formats tree branches with hanging indent (· ┌ ├ └).
 */
declare function formatTreeBranch(branchChar: string, contChar: string, tag: string, content: string, prefixDecorator?: (p: string) => string, tagDecorator?: (t: string) => string, contDecorator?: (c: string) => string, lineDecorator?: ((l: string) => string) | number, maxCols?: number): string[];
/**
 * Formats native nuance sub-rail (↳).
 */
declare function formatSubRail(contChar: string, nuanceText: string, arrow?: string, contDecorator?: (c: string) => string, lineDecorator?: (l: string) => string, maxCols?: number, indentCols?: number): string[];
/**
 * Extracts clean target phrases from vocab string (sorted longest first).
 * e.g.: "on board with (agree) · dive in (start right away)"
 * ➔ ["on board with", "dive in"]
 */
declare function extractVocabPhrases(vocab: string | undefined): string[];
/**
 * Highlights target phrases non-destructively using ANSI underline (Spotlight Highlighting).
 * Case-insensitive match preserving original casing and formatting.
 * Supports CJK ideographs and ASCII characters.
 */
declare function spotlightPhrases(text: string, phrases: string[]): string;
/**
 * Formats vocabulary terms in a single line at item level without mid-word cuts or unclosed parentheses.
 */
declare function formatVocabItemsAtomic(vocab: string, prefix: string, maxCols: number): string;
/**
 * Formats terminal panoramic tree branch output (formatTerminalAnnotation).
 */
declare function formatTerminalAnnotation(sourceText: string, spoken: string, written?: string, vocab?: string, options?: {
    spokenMeaning?: string;
    writtenMeaning?: string;
    slot1Label?: string;
    slot2Label?: string;
    vocabLabel?: string;
    sourceLabel?: string;
    spotlight?: boolean;
}): string;
/**
 * Formats dense single-line capsule layout for narrow viewports.
 * Strictly constrained to 1 line, dynamically balanced by column width.
 */
declare function formatCapsuleLine(hudTitle: string, spoken: string, written?: string, options?: number | {
    slot1Short?: string;
    slot2Short?: string;
    maxCols?: number;
}): string;
/**
 * Box model layout solver (renderCardLayout).
 * Solves 9-line kinetic budget, tree branch formatting, and compact capsule degradation.
 */
declare function renderCardLayout(card: LingualResult, labels: LingualI18nLabels, options?: {
    maxCols?: number;
    maxLines?: number;
    isCompact?: boolean;
    /** True while tokens are still streaming: keeps the rail open so it never flickers closed. */
    isStreaming?: boolean;
    /** Renderer selected by the mode's `hud` field. */
    variant?: "tree" | "preview" | "takeaway" | "none";
    /** True when the source input is long enough to suppress full sentences. */
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
    lookupController: LookupController;
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
    setReasoningHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    setDefaultModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
    lookupHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
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

export { CANNOT_START_LINE_CHARS, type CommandHandlerDeps, type CommandHandlers, ExtensionState, LingualI18nLabels, LingualResult, LingualSessionController, type ModePickerOption, ModeRuntime, type PaginationSnapshot, type SessionRequestToken, SlotConfig, createCommandHandlers, createModelCompleter, extractVocabPhrases, formatCapsuleLine, formatLoadingMessage, formatModePickerLines, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getBannerMaxCols, getEffectiveMaxCols, getPiGlobalDefaultModel, getVisualWidth, renderCardLayout, resolveTargetModel, splitSemanticChunks, spotlightPhrases, truncateVisual, wrapVisualText };
