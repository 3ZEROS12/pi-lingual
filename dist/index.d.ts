import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig } from './index-BNsJ7K9S.js';
export { C as CURRENT_FEATURE_BANNER_VERSION, b as CacheStats, c as CustomSlotsConfig, D as DEFAULT_CONFIG, d as LANGUAGE_PRESETS, e as LEGACY_SLOT_PRESETS, f as LINGUAL_SYSTEM_PROMPT, g as LINGUA_SYSTEM_PROMPT, h as LinguaConfig, i as LinguaI18nLabels, j as LinguaLruCache, k as LinguaMode, l as LinguaResult, m as LingualConfig, n as LingualCoreOptions, o as LingualLruCache, p as LingualMode, q as LingualRequest, r as LingualResponse, M as MAX_TRANSLATION_CHARS, s as MAX_TRANSLATION_LINES, t as ModeDisplaySpec, P as PROMPT_RULE_PRESETS, u as PromptCandidate, v as PromptSlotConfig, w as SLOT_PRESETS, x as SanitizedPromptResult, y as SlotDefinition, z as SlotPresetDefinition, A as SlotResult, B as SlotRole, T as TranslationPayload, E as addSlotToList, F as buildDirectRewriteSystemPrompt, G as buildModifySystemPrompt, H as buildPromptCandidatesSystemPrompt, I as buildSystemPrompt, J as createCustomSlot, K as formatModelSelectionMessage, N as formatNativeReplyGuardHint, O as formatReleaseBannerLines, Q as formatStatusReport, R as generatePromptCandidates, U as getDefaultDirectSlots, V as getDefaultModifySlots, W as getDefaultPromptSlots, X as getDefaultSlots, Y as globalLinguaCache, Z as globalLingualCache, _ as invalidateUserConfigCache, $ as isDynamicLongInput, a0 as isNonEnglish, a1 as isTestEnvironment, a2 as loadUserConfig, a3 as loadUserLingualConfig, a4 as moveSlotInList, a5 as normalizeLingualModeInput, a6 as normalizePromptRules, a7 as parseLlmResponse, a8 as removeSlotFromList, a9 as repairAndParseJsonObject, aa as resolveCandidateSlotsFromConfig, ab as resolveDirectSlotsFromConfig, ac as resolveLabelsForLang, ad as resolveModeDisplaySpec, ae as resolveModifySlotsFromConfig, af as resolvePromptRulePreset, ag as resolvePromptTargetLangName, ah as resolveReleaseBannerLang, ai as resolveSlotsForPreset, aj as rewritePromptDirect, ak as sanitizePromptForTranslation, al as saveUserLingualConfig, am as shouldInjectNativeReplyGuard, an as shouldShieldBypass, ao as shouldTriggerTranslation, ap as stripLinguaAnnotation, aq as stripLingualAnnotation, ar as stripLingualContextWhenOff, as as toggleSlotInList, at as translateCore, au as translatePrompt, av as updateSlotInList } from './index-BNsJ7K9S.js';

/**
 * Terminal Box Model & Layout Engine (终端盒模型与几何排版求解引擎)
 *
 * 物理职责：
 * 1. 严格遵循 Unicode Standard Annex #11 (East Asian Width) 计算终端显示列宽；
 * 2. 具备标点行头禁则 (Kinsoku Shori) 的确定性断行算法，杜绝孤立标点；
 * 3. 严格有界的单行胶囊流 (1-Line Capsule) 求解器，绝对不溢出终端列宽；
 * 4. Trifecta 开放式左导轨树状分支 (· ┌ ├ └) 格式化生成；
 * 5. 9 行硬预算盒模型求解器 (renderCardLayout)，保证行数物理断言 <= 9。
 */

/**
 * 禁则处理标点集合：绝对禁止出现在行首的标点符号
 */
declare const CANNOT_START_LINE_CHARS: Set<string>;
/**
 * 终端窗口物理列宽安全计算 (带缩放 SIGWINCH 防崩溃保底)
 */
declare function getEffectiveMaxCols(requested?: number): number;
/**
 * Unicode Standard Annex #11 视觉单元格宽度测算:
 * - ANSI 转义序列 (CSI / OSC) = 0 单元格
 * - 零宽字符 (ZWJ / 变体选择符 / 组合音标) = 0 单元格
 * - CJK 宽字符、全角字符、Emoji = 2 单元格
 * - ASCII 西文字符 = 1 单元格
 */
declare function getVisualWidth(str: string): number;
/**
 * 基于视觉单元格与 ANSI 安全边界的无溢出截断 (截断后总宽度严格 <= maxVisualCols)
 */
declare function truncateVisual(str: string, maxVisualCols: number): string;
/**
 * 基于标点禁则与列宽边界的视觉折行算法
 */
declare function wrapVisualText(text: string, maxWidth: number): string[];
/**
 * 格式化树状悬挂缩进分支 (· ┌ ├ └)
 */
declare function formatTreeBranch(branchChar: string, contChar: string, tag: string, content: string, prefixDecorator?: (p: string) => string, tagDecorator?: (t: string) => string, contDecorator?: (c: string) => string, lineDecorator?: ((l: string) => string) | number, maxCols?: number): string[];
/**
 * 格式化语感子导轨 (↳)
 */
declare function formatSubRail(contChar: string, nuanceText: string, arrow?: string, contDecorator?: (c: string) => string, lineDecorator?: (l: string) => string, maxCols?: number, indentCols?: number): string[];
/**
 * 从 vocab 字符串中解析出纯净的目标短语列表 (由长到短排序)
 * 例如: "on board with (赞成/支持) · dive in (立刻着手/开搞)"
 * ➔ ["on board with", "dive in"]
 */
declare function extractVocabPhrases(vocab: string | undefined): string[];
/**
 * 对目标文本中的指定短语进行非破坏性 ANSI 下划线瞄准点亮 (Spotlight Highlighting)
 * 大小写不敏感匹配，保留原始文本的大小写与排版
 * 原生支持 CJK (日文/中文) 以及 ASCII 西文字符
 */
declare function spotlightPhrases(text: string, phrases: string[]): string;
/**
 * 按原子短语 (Item-level) 格式化重点词汇单行流，绝不把任何词汇项砍成半截或留下未闭合的 "(" (彻底解决 BUG-VOCAB-TRUNCATION)
 */
declare function formatVocabItemsAtomic(vocab: string, prefix: string, maxCols: number): string;
/**
 * 格式化终端树状全景输出 (formatTerminalAnnotation)
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
 * 格式化极端分屏下的单行高密度胶囊流 (Single-Line Capsule Layout)
 * 严格限制在 1 行内，按终端列宽动态均衡截断，绝不溢出单行
 */
declare function formatCapsuleLine(hudTitle: string, spoken: string, written?: string, options?: {
    slot1Short?: string;
    slot2Short?: string;
    maxCols?: number;
}): string;
/**
 * 盒模型布局求解器 (renderCardLayout)
 * 统一求解 9 行硬预算、树状全景与单行胶囊降级
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
 * 结合 9 行硬预算折叠守卫与树状全景舒展度，单卡最舒适自然容量为 60~70 字符（约 30~35 汉字）。
 * 默认预算校准至 65 字符：
 * - 确保多句诗文/长段落切分后，每一卡均能以 6~8 行完整树状形式优雅展开，绝不触发单行胶囊降级；
 * - 绝不过度粉碎短句，保留自然停顿。
 */
declare function splitSemanticChunks(text: string, maxChunkChars?: number): string[];

/**
 * Monotonic Session FSM & Cancellation Controller (单调会话状态机与协同掐断控制器)
 *
 * 物理职责：
 * 1. 单调递增世代追踪 (Generation Counter)，彻底杜绝异步竞态与陈旧回调屏幕覆写；
 * 2. 物理 AbortController 协同掐断：新请求到达时，瞬间 abort 掐断上一轮未决的远程网络 Socket；
 * 3. 封装分页池 (Pagination Pool) 与历史卡片缓存，消除散落全局的可变状态；
 * 4. 0 外部依赖，纯 TypeScript 原生事件模型。
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
     * 启动一次新的会话请求：
     * 1. 物理中断前序正在排队或流式传输的 HTTP 请求；
     * 2. 生成单调递增的新世代号；
     * 3. 绑定全新的 AbortSignal。
     */
    beginRequest(): SessionRequestToken;
    /**
     * 物理中断当前正在活跃的网络请求
     */
    abortActive(): void;
    /**
     * 判定指定世代号是否仍为当前最新的活跃世代
     */
    isLatest(generation: number): boolean;
    /**
     * 获取当前最新世代号
     */
    getCurrentGeneration(): number;
    /**
     * 初始化分页池 (当输入被切分为多个意群分块时调用)
     */
    initPagination(totalExpectedPages: number): void;
    /**
     * 存入某个切片的翻译结果 (具备世代守卫，拒绝陈旧世代脏写)
     */
    setPageResult(chunkIndex: number, result: LingualResult, generation: number): boolean;
    /**
     * 获取当前展示页的翻译结果
     */
    getActiveResult(): LingualResult | null;
    /**
     * 获取所有已就绪的分页结果列表
     */
    getReadyPages(): LingualResult[];
    /**
     * 获取当前分页状态快照
     */
    getPaginationSnapshot(): PaginationSnapshot;
    /**
     * 翻至下一页 (循环翻页)
     * 返回 true 表示发生了有效翻页
     */
    nextPage(): boolean;
    /**
     * 翻至上一页 (循环翻页)
     * 返回 true 表示发生了有效翻页
     */
    prevPage(): boolean;
    /**
     * 清空分页池 (在遇到非自然语言输入、或关闭伴学时调用，杜绝幽灵卡片复活)
     */
    clearPagination(): void;
    /**
     * 获取上一条记录 (用于 /lingual-last 回显)
     */
    getLastResult(): LingualResult | null;
    /**
     * 显式设置上一条记录
     */
    setLastResult(result: LingualResult | null): void;
    /**
     * 彻底重置状态机
     */
    reset(): void;
}

export { CANNOT_START_LINE_CHARS, LingualI18nLabels, LingualResult, LingualSessionController, type PaginationSnapshot, type SessionRequestToken, SlotConfig, extractVocabPhrases, formatCapsuleLine, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getEffectiveMaxCols, getVisualWidth, renderCardLayout, splitSemanticChunks, spotlightPhrases, truncateVisual, wrapVisualText };
