import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig, E as ExtensionState, M as ModeRuntime } from './index-CUTAjDOa.cjs';
export { C as CURRENT_FEATURE_BANNER_VERSION, b as CacheStats, c as CustomModeConfig, d as CustomSlotsConfig, D as DEFAULT_CONFIG, e as DEFAULT_KILL_LIST, H as HudVariant, f as LANGUAGE_PAIR_ANCHORS, g as LANGUAGE_PRESETS, h as LANGUAGE_SPECS, i as LEGACY_SLOT_PRESETS, j as LINGUAL_SYSTEM_PROMPT, k as LINGUA_SYSTEM_PROMPT, l as LanguageAnchor, m as LanguageSpec, n as LinguaConfig, o as LinguaI18nLabels, p as LinguaLruCache, q as LinguaMode, r as LinguaResult, s as LingualConfig, t as LingualCoreOptions, u as LingualLruCache, v as LingualMode, w as LingualRequest, x as LingualResponse, y as LoadoutDefinition, z as MAX_TRANSLATION_CHARS, A as MAX_TRANSLATION_LINES, B as ModeAction, F as ModeDisplaySpec, G as ModeFlow, I as ModeHud, J as ModeTarget, P as PRESET_LOADOUTS, K as PROMPT_RULE_PRESETS, N as PromptCandidate, O as PromptSlotConfig, R as ReasoningEffort, Q as ResolveModeOptions, T as SEED_NAMES, U as SLOT_PRESETS, V as SUPPORTED_LANG_CODES, W as SanitizedPromptResult, X as SeedNames, Y as SelectPromptSpec, Z as SlotDefinition, _ as SlotPresetDefinition, $ as SlotResult, a0 as SlotRole, a1 as TranslationPayload, a2 as UserLingualConfig, a3 as addCustomMode, a4 as addSlotToList, a5 as addSlotToMode, a6 as buildDirectRewriteSystemPrompt, a7 as buildModifySystemPrompt, a8 as buildPromptCandidatesSystemPrompt, a9 as buildStreamingResult, aa as buildSystemPrompt, ab as compileKillListInstruction, ac as compileModeSystemPrompt, ad as createCustomSlot, ae as defaultSlotsForMode, af as detectScriptLanguage, ag as ensureCodeTokensPreserved, ah as executeModeRunner, ai as formatModelSelectionMessage, aj as formatNativeReplyGuardHint, ak as formatReleaseBannerLines, al as formatStatusReport, am as generatePromptCandidates, an as getDefaultDirectSlots, ao as getDefaultFactoryModes, ap as getDefaultModifySlots, aq as getDefaultPromptSlots, ar as getDefaultSlots, as as getPresetLoadout, at as globalLinguaCache, au as globalLingualCache, av as hasSourceScript, aw as interpolatePromptVariables, ax as invalidateUserConfigCache, ay as isDynamicLongInput, az as isImperativeEngineeringPrompt, aA as isNonEnglish, aB as isSupportedLangCode, aC as isTargetLanguageOnly, aD as isTestEnvironment, aE as isUserLingualConfigured, aF as listPresetLoadouts, aG as loadUserConfig, aH as loadUserLingualConfig, aI as localizeModeName, aJ as localizeModes, aK as localizeSlotLabel, aL as moveSlotInList, aM as normalizeActiveModeId, aN as normalizeHudVariant, aO as normalizeLangCode, aP as normalizeLingualModeInput, aQ as normalizePromptRules, aR as parseLlmResponse, aS as parsePartialJsonFields, aT as pickPrimaryContent, aU as primarySlot, aV as removeCustomMode, aW as removeSlotFromList, aX as removeSlotFromMode, aY as repairAndParseJsonObject, aZ as resolveCandidateSlotsFromConfig, a_ as resolveDirectSlotsFromConfig, a$ as resolveLabelsForLang, b0 as resolveLangPair, b1 as resolveLanguageName, b2 as resolveLanguagePairAnchors, b3 as resolveModeDisplayName, b4 as resolveModeDisplaySpec, b5 as resolveModeRuntime, b6 as resolveModesFromConfig, b7 as resolveModifySlotsFromConfig, b8 as resolvePromptRulePreset, b9 as resolvePromptTargetLangName, ba as resolveReleaseBannerLang, bb as resolveSeedNames, bc as resolveSelectPrompts, bd as resolveSlotLabels, be as resolveSlotsForPreset, bf as rewritePromptDirect, bg as runtimeLanguagePair, bh as sanitizePromptForTranslation, bi as saveUserLingualConfig, bj as shouldInjectNativeReplyGuard, bk as shouldShieldBypass, bl as shouldTriggerTranslation, bm as stripLinguaAnnotation, bn as stripLingualAnnotation, bo as stripLingualContextWhenOff, bp as toggleCustomMode, bq as toggleSlotInList, br as translateCore, bs as translatePrompt, bt as updateCustomMode, bu as updateSlotInList } from './index-CUTAjDOa.cjs';
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

export { CANNOT_START_LINE_CHARS, type CommandHandlerDeps, type CommandHandlers, ExtensionState, LingualI18nLabels, LingualResult, LingualSessionController, type ModePickerOption, ModeRuntime, type PaginationSnapshot, type SessionRequestToken, SlotConfig, createCommandHandlers, createModelCompleter, extractVocabPhrases, formatCapsuleLine, formatLoadingMessage, formatModePickerLines, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getBannerMaxCols, getEffectiveMaxCols, getPiGlobalDefaultModel, getVisualWidth, renderCardLayout, resolveTargetModel, splitSemanticChunks, spotlightPhrases, truncateVisual, wrapVisualText };
