import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig } from './index-BQ668sIL.cjs';
export { C as CURRENT_FEATURE_BANNER_VERSION, b as CacheStats, c as CustomModeConfig, d as CustomSlotsConfig, D as DEFAULT_CONFIG, e as DEFAULT_KILL_LIST, f as LANGUAGE_PAIR_ANCHORS, g as LANGUAGE_PRESETS, h as LANGUAGE_SPECS, i as LEGACY_SLOT_PRESETS, j as LINGUAL_SYSTEM_PROMPT, k as LINGUA_SYSTEM_PROMPT, l as LanguageAnchor, m as LanguageSpec, n as LinguaConfig, o as LinguaI18nLabels, p as LinguaLruCache, q as LinguaMode, r as LinguaResult, s as LingualConfig, t as LingualCoreOptions, u as LingualLruCache, v as LingualMode, w as LingualRequest, x as LingualResponse, y as LoadoutDefinition, M as MAX_TRANSLATION_CHARS, z as MAX_TRANSLATION_LINES, A as ModeAction, B as ModeDisplaySpec, E as ModeFlow, F as ModeHud, G as ModeTarget, P as PRESET_LOADOUTS, H as PROMPT_RULE_PRESETS, I as PromptCandidate, J as PromptSlotConfig, R as ReasoningEffort, K as SEED_NAMES, N as SLOT_PRESETS, O as SUPPORTED_LANG_CODES, Q as SanitizedPromptResult, T as SeedNames, U as SelectPromptSpec, V as SlotDefinition, W as SlotPresetDefinition, X as SlotResult, Y as SlotRole, Z as TranslationPayload, _ as UserLingualConfig, $ as addCustomMode, a0 as addSlotToList, a1 as addSlotToMode, a2 as buildDirectRewriteSystemPrompt, a3 as buildModifySystemPrompt, a4 as buildPromptCandidatesSystemPrompt, a5 as buildSystemPrompt, a6 as compileKillListInstruction, a7 as compileModeSystemPrompt, a8 as createCustomSlot, a9 as defaultSlotsForMode, aa as detectScriptLanguage, ab as executeModeRunner, ac as formatModelSelectionMessage, ad as formatNativeReplyGuardHint, ae as formatReleaseBannerLines, af as formatStatusReport, ag as generatePromptCandidates, ah as getDefaultDirectSlots, ai as getDefaultFactoryModes, aj as getDefaultModifySlots, ak as getDefaultPromptSlots, al as getDefaultSlots, am as getPresetLoadout, an as globalLinguaCache, ao as globalLingualCache, ap as hasSourceScript, aq as interpolatePromptVariables, ar as invalidateUserConfigCache, as as isDynamicLongInput, at as isImperativeEngineeringPrompt, au as isNonEnglish, av as isSupportedLangCode, aw as isTargetLanguageOnly, ax as isTestEnvironment, ay as isUserLingualConfigured, az as listPresetLoadouts, aA as loadUserConfig, aB as loadUserLingualConfig, aC as moveSlotInList, aD as normalizeActiveModeId, aE as normalizeLangCode, aF as normalizeLingualModeInput, aG as normalizePromptRules, aH as parseLlmResponse, aI as removeCustomMode, aJ as removeSlotFromList, aK as removeSlotFromMode, aL as repairAndParseJsonObject, aM as resolveCandidateSlotsFromConfig, aN as resolveDirectSlotsFromConfig, aO as resolveLabelsForLang, aP as resolveLangPair, aQ as resolveLanguageName, aR as resolveLanguagePairAnchors, aS as resolveModeDisplayName, aT as resolveModeDisplaySpec, aU as resolveModesFromConfig, aV as resolveModifySlotsFromConfig, aW as resolvePromptRulePreset, aX as resolvePromptTargetLangName, aY as resolveReleaseBannerLang, aZ as resolveSeedNames, a_ as resolveSelectPrompts, a$ as resolveSlotsForPreset, b0 as rewritePromptDirect, b1 as sanitizePromptForTranslation, b2 as saveUserLingualConfig, b3 as shouldInjectNativeReplyGuard, b4 as shouldShieldBypass, b5 as shouldTriggerTranslation, b6 as stripLinguaAnnotation, b7 as stripLingualAnnotation, b8 as stripLingualContextWhenOff, b9 as toggleCustomMode, ba as toggleSlotInList, bb as translateCore, bc as translatePrompt, bd as updateCustomMode, be as updateSlotInList } from './index-BQ668sIL.cjs';

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
