import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig } from './index-C_1n1O3O.cjs';
export { C as CURRENT_FEATURE_BANNER_VERSION, b as CacheStats, c as CustomModeConfig, d as CustomSlotsConfig, D as DEFAULT_CONFIG, e as DEFAULT_KILL_LIST, f as LANGUAGE_PRESETS, g as LANGUAGE_SPECS, h as LEGACY_SLOT_PRESETS, i as LINGUAL_SYSTEM_PROMPT, j as LINGUA_SYSTEM_PROMPT, k as LanguageSpec, l as LinguaConfig, m as LinguaI18nLabels, n as LinguaLruCache, o as LinguaMode, p as LinguaResult, q as LingualConfig, r as LingualCoreOptions, s as LingualLruCache, t as LingualMode, u as LingualRequest, v as LingualResponse, w as LoadoutDefinition, M as MAX_TRANSLATION_CHARS, x as MAX_TRANSLATION_LINES, y as ModeAction, z as ModeDisplaySpec, A as ModeFlow, B as ModeHud, E as ModeTarget, P as PRESET_LOADOUTS, F as PROMPT_RULE_PRESETS, G as PromptCandidate, H as PromptSlotConfig, R as ReasoningEffort, I as SLOT_PRESETS, J as SUPPORTED_LANG_CODES, K as SanitizedPromptResult, N as SlotDefinition, O as SlotPresetDefinition, Q as SlotResult, T as SlotRole, U as TranslationPayload, V as UserLingualConfig, W as addCustomMode, X as addSlotToList, Y as addSlotToMode, Z as buildDirectRewriteSystemPrompt, _ as buildModifySystemPrompt, $ as buildPromptCandidatesSystemPrompt, a0 as buildSystemPrompt, a1 as compileKillListInstruction, a2 as compileModeSystemPrompt, a3 as createCustomSlot, a4 as executeModeRunner, a5 as formatModelSelectionMessage, a6 as formatNativeReplyGuardHint, a7 as formatReleaseBannerLines, a8 as formatStatusReport, a9 as generatePromptCandidates, aa as getDefaultDirectSlots, ab as getDefaultFactoryModes, ac as getDefaultModifySlots, ad as getDefaultPromptSlots, ae as getDefaultSlots, af as getPresetLoadout, ag as globalLinguaCache, ah as globalLingualCache, ai as interpolatePromptVariables, aj as invalidateUserConfigCache, ak as isDynamicLongInput, al as isNonEnglish, am as isSupportedLangCode, an as isTestEnvironment, ao as isUserLingualConfigured, ap as listPresetLoadouts, aq as loadUserConfig, ar as loadUserLingualConfig, as as moveSlotInList, at as normalizeActiveModeId, au as normalizeLangCode, av as normalizeLingualModeInput, aw as normalizePromptRules, ax as parseLlmResponse, ay as removeCustomMode, az as removeSlotFromList, aA as removeSlotFromMode, aB as repairAndParseJsonObject, aC as resolveCandidateSlotsFromConfig, aD as resolveDirectSlotsFromConfig, aE as resolveLabelsForLang, aF as resolveLangPair, aG as resolveLanguageName, aH as resolveModeDisplaySpec, aI as resolveModesFromConfig, aJ as resolveModifySlotsFromConfig, aK as resolvePromptRulePreset, aL as resolvePromptTargetLangName, aM as resolveReleaseBannerLang, aN as resolveSlotsForPreset, aO as rewritePromptDirect, aP as sanitizePromptForTranslation, aQ as saveUserLingualConfig, aR as shouldInjectNativeReplyGuard, aS as shouldShieldBypass, aT as shouldTriggerTranslation, aU as stripLinguaAnnotation, aV as stripLingualAnnotation, aW as stripLingualContextWhenOff, aX as toggleCustomMode, aY as toggleSlotInList, aZ as translateCore, a_ as translatePrompt, a$ as updateCustomMode, b0 as updateSlotInList } from './index-C_1n1O3O.cjs';

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

export { CANNOT_START_LINE_CHARS, LingualI18nLabels, LingualResult, LingualSessionController, type PaginationSnapshot, type SessionRequestToken, SlotConfig, extractVocabPhrases, formatCapsuleLine, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getBannerMaxCols, getEffectiveMaxCols, getVisualWidth, renderCardLayout, splitSemanticChunks, spotlightPhrases, truncateVisual, wrapVisualText };
