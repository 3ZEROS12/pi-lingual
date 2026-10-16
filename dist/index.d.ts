import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig } from './index-DnQFFvb4.js';
export { C as CURRENT_FEATURE_BANNER_VERSION, b as CacheStats, c as CustomModeConfig, d as CustomSlotsConfig, D as DEFAULT_CONFIG, e as DEFAULT_KILL_LIST, f as LANGUAGE_PRESETS, g as LANGUAGE_SPECS, h as LEGACY_SLOT_PRESETS, i as LINGUAL_SYSTEM_PROMPT, j as LINGUA_SYSTEM_PROMPT, k as LanguageSpec, l as LinguaConfig, m as LinguaI18nLabels, n as LinguaLruCache, o as LinguaMode, p as LinguaResult, q as LingualConfig, r as LingualCoreOptions, s as LingualLruCache, t as LingualMode, u as LingualRequest, v as LingualResponse, w as LoadoutDefinition, M as MAX_TRANSLATION_CHARS, x as MAX_TRANSLATION_LINES, y as ModeAction, z as ModeDisplaySpec, A as ModeFlow, B as ModeHud, E as ModeTarget, P as PRESET_LOADOUTS, F as PROMPT_RULE_PRESETS, G as PromptCandidate, H as PromptSlotConfig, R as ReasoningEffort, I as SEED_NAMES, J as SLOT_PRESETS, K as SUPPORTED_LANG_CODES, N as SanitizedPromptResult, O as SeedNames, Q as SelectPromptSpec, T as SlotDefinition, U as SlotPresetDefinition, V as SlotResult, W as SlotRole, X as TranslationPayload, Y as UserLingualConfig, Z as addCustomMode, _ as addSlotToList, $ as addSlotToMode, a0 as buildDirectRewriteSystemPrompt, a1 as buildModifySystemPrompt, a2 as buildPromptCandidatesSystemPrompt, a3 as buildSystemPrompt, a4 as compileKillListInstruction, a5 as compileModeSystemPrompt, a6 as createCustomSlot, a7 as defaultSlotsForMode, a8 as detectScriptLanguage, a9 as executeModeRunner, aa as formatModelSelectionMessage, ab as formatNativeReplyGuardHint, ac as formatReleaseBannerLines, ad as formatStatusReport, ae as generatePromptCandidates, af as getDefaultDirectSlots, ag as getDefaultFactoryModes, ah as getDefaultModifySlots, ai as getDefaultPromptSlots, aj as getDefaultSlots, ak as getPresetLoadout, al as globalLinguaCache, am as globalLingualCache, an as hasSourceScript, ao as interpolatePromptVariables, ap as invalidateUserConfigCache, aq as isDynamicLongInput, ar as isImperativeEngineeringPrompt, as as isNonEnglish, at as isSupportedLangCode, au as isTargetLanguageOnly, av as isTestEnvironment, aw as isUserLingualConfigured, ax as listPresetLoadouts, ay as loadUserConfig, az as loadUserLingualConfig, aA as moveSlotInList, aB as normalizeActiveModeId, aC as normalizeLangCode, aD as normalizeLingualModeInput, aE as normalizePromptRules, aF as parseLlmResponse, aG as removeCustomMode, aH as removeSlotFromList, aI as removeSlotFromMode, aJ as repairAndParseJsonObject, aK as resolveCandidateSlotsFromConfig, aL as resolveDirectSlotsFromConfig, aM as resolveLabelsForLang, aN as resolveLangPair, aO as resolveLanguageName, aP as resolveModeDisplayName, aQ as resolveModeDisplaySpec, aR as resolveModesFromConfig, aS as resolveModifySlotsFromConfig, aT as resolvePromptRulePreset, aU as resolvePromptTargetLangName, aV as resolveReleaseBannerLang, aW as resolveSeedNames, aX as resolveSelectPrompts, aY as resolveSlotsForPreset, aZ as rewritePromptDirect, a_ as sanitizePromptForTranslation, a$ as saveUserLingualConfig, b0 as shouldInjectNativeReplyGuard, b1 as shouldShieldBypass, b2 as shouldTriggerTranslation, b3 as stripLinguaAnnotation, b4 as stripLingualAnnotation, b5 as stripLingualContextWhenOff, b6 as toggleCustomMode, b7 as toggleSlotInList, b8 as translateCore, b9 as translatePrompt, ba as updateCustomMode, bb as updateSlotInList } from './index-DnQFFvb4.js';

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
declare function formatCapsuleLine(hudTitle: string, spoken: string, written?: string, options?: {
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

export { CANNOT_START_LINE_CHARS, LingualI18nLabels, LingualResult, LingualSessionController, type ModePickerOption, type PaginationSnapshot, type SessionRequestToken, SlotConfig, extractVocabPhrases, formatCapsuleLine, formatLoadingMessage, formatModePickerLines, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getBannerMaxCols, getEffectiveMaxCols, getVisualWidth, renderCardLayout, splitSemanticChunks, spotlightPhrases, truncateVisual, wrapVisualText };
