import { L as LingualResult, a as LingualI18nLabels, S as SlotConfig, b as LingualConfig } from './index-BDUdN4Vs.cjs';
export { C as CacheStats, c as CustomSlotsConfig, d as LANGUAGE_PRESETS, e as LEGACY_SLOT_PRESETS, f as LinguaConfig, g as LinguaI18nLabels, h as LinguaLruCache, i as LinguaMode, j as LinguaResult, k as LingualCoreOptions, l as LingualLruCache, m as LingualMode, n as LingualRequest, o as LingualResponse, R as REFINE_PRESETS, p as RefinePreset, q as RefinePresetSpec, r as SLOT_PRESETS, s as SanitizedPromptResult, t as SlotDefinition, u as SlotPresetDefinition, v as SlotResult, w as SlotRole, T as TranslationPayload, x as addSlotToList, y as buildRefineSystemPrompt, z as buildSystemPrompt, A as createCustomSlot, B as formatModelSelectionMessage, D as formatStatusReport, E as getDefaultSlots, F as globalLinguaCache, G as globalLingualCache, H as moveSlotInList, I as normalizeRefinePreset, J as parseLlmResponse, K as removeSlotFromList, M as resolveLabelsForLang, N as resolveSlotsForPreset, O as sanitizePromptForTranslation, P as shouldShieldBypass, Q as toggleSlotInList, U as translateCore, V as updateSlotInList } from './index-BDUdN4Vs.cjs';

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

declare function invalidateUserConfigCache(): void;
/**
 * Load user configuration from single source of truth: ~/.pi/agent/lingual.json
 * If lingual.json does not exist, performs a one-time graceful migration from settings.json ("pi-lingual" block).
 * Uses high-efficiency 2-second in-memory memoization to prevent synchronous disk I/O thrashing.
 * Never writes back to settings.json, protecting host environment.
 */
declare function loadUserLingualConfig(): Partial<LingualConfig>;
declare const DEFAULT_CONFIG: LingualConfig;
/**
 * 现代开发者双语伴学系统提示词 (中文 A ➔ 英文 B，默认导出)
 * 设计哲学：
 * 1. 敏捷口语 (Silicon Valley Slack/Standup) + 现代技术书面 (PR/RFC/Docs) 双语域
 * 2. 母语 A 精准语境释义与反向释义 (Back-translation & Nuance)
 * 3. 典型开发协同的 3 组黄金 Few-Shot 锚点
 * 4. 代码与专有名词绝对防御机制 (Code & Symbol Shield)
 * 5. 水平自适应重点词汇提取，单行紧凑流排列
 */
declare const LINGUAL_SYSTEM_PROMPT: string;

/**
 * Check if the text contains non-English natural language scripts (CJK, accented Latin, Cyrillic, etc.)
 * Strictly avoids triggering on pure emojis, typographical quotes, or terminal commands.
 */
declare function isNonEnglish(text: string): boolean;
declare const MAX_TRANSLATION_CHARS = 2500;
declare const MAX_TRANSLATION_LINES = 30;
/**
 * Bidirectional language-aware trigger with strict Length & Payload Guards:
 * - If sourceLang is not English (e.g. "zh", "ja"): triggers on natural language scripts;
 * - If sourceLang is English ("en"): detects English natural language sentences while strictly excluding code and CLI commands;
 * - Centrally delegates to shouldShieldBypass (Single Source of Truth) to exclude code statements, SQL, and 40+ CLI commands;
 * - [Safety Gate]: Rejects oversized payloads (> 1500 chars), monolithic multi-line code (> 8 lines), markdown headings, and code fences.
 */
declare function shouldTriggerTranslation(text: string, sourceLang?: string, allowSameLangRefine?: boolean): boolean;

/**
 * Strip annotations and recover purely clean text to prevent LLM prompt pollution
 * Robust against tree branch glyphs (┌ ├ └) and arrow annotations (↳)
 */
declare function stripLingualAnnotation(annotatedText: string): {
    raw: string;
    spoken?: string;
    written?: string;
    vocab?: string;
};
/**
 * 动态判定是否需要触发长输入凝练与意图大标题总结 (彻底解决 45~90 字符/多句"中间状态"截断隐患)
 * 核心物理事实：CJK (中日韩) 为高密度表意文字，信息密度为西文 2.5 倍。
 * 45 汉字通常包含 2~3 个分句，直译为英文达 180~220 字符 (3 行 Spoken + 3 行 Written)，
 * 必然冲垮 9 行卡片盒模型预算并挤爆重点词汇。
 */
declare function isDynamicLongInput(text: string, sourceLang?: string): boolean;
/**
 * Translate a user prompt into idiomatic English with dual registers, native nuance, and vocabulary highlights
 */
declare function translatePrompt(text: string, userConfig?: Partial<LingualConfig>): Promise<LingualResult | null>;
declare const LINGUA_SYSTEM_PROMPT: string;
declare const stripLinguaAnnotation: typeof stripLingualAnnotation;
declare const loadUserConfig: typeof loadUserLingualConfig;
/**
 * 智能判定是否需要注入母语回复守护指引 (Opt-in Native Reply Guard)
 * 1. 只有当用户显式开启 replyInSourceLang 时；
 * 2. 原始输入必须为母语（如中文/日文等，包含 CJK 字符）；
 * 3. 严格排除用户主动要求撰写英文文本（如 PR description, commit message, 英文邮件等）的意图。
 */
declare function shouldInjectNativeReplyGuard(originalText: string, _sourceLang?: string, enabled?: boolean): boolean;
declare function formatNativeReplyGuardHint(sourceLang?: string): string;

export { CANNOT_START_LINE_CHARS, DEFAULT_CONFIG, LINGUAL_SYSTEM_PROMPT, LINGUA_SYSTEM_PROMPT, LingualConfig, LingualI18nLabels, LingualResult, LingualSessionController, MAX_TRANSLATION_CHARS, MAX_TRANSLATION_LINES, type PaginationSnapshot, type SessionRequestToken, SlotConfig, extractVocabPhrases, formatCapsuleLine, formatNativeReplyGuardHint, formatSubRail, formatTerminalAnnotation, formatTreeBranch, formatVocabItemsAtomic, getEffectiveMaxCols, getVisualWidth, invalidateUserConfigCache, isDynamicLongInput, isNonEnglish, loadUserConfig, loadUserLingualConfig, renderCardLayout, shouldInjectNativeReplyGuard, shouldTriggerTranslation, splitSemanticChunks, spotlightPhrases, stripLinguaAnnotation, stripLingualAnnotation, translatePrompt, truncateVisual, wrapVisualText };
