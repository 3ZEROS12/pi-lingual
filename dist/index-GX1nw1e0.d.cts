type LingualMode = "original" | "english" | "select" | "off";
type LinguaMode = LingualMode;
type SlotRole = "source" | "translation" | "vocab" | "custom";
interface PromptSlotConfig {
    id: string;
    label: string;
    role?: "rewrite" | "vocab";
    instruction: string;
    enabled: boolean;
}
interface PromptCandidate {
    id: string;
    label: string;
    content: string;
    vocab?: string;
}
interface SlotConfig {
    id: string;
    label: string;
    role: SlotRole;
    instruction?: string;
    showMeaning?: boolean;
    enabled: boolean;
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
    compact?: boolean;
    slotPreset?: string;
    slots?: SlotConfig[];
    directSlots?: PromptSlotConfig[];
    promptSlots?: PromptSlotConfig[];
    lastSeenVersion?: string;
    sourceLang?: string;
    targetLang?: string;
    replyInSourceLang?: boolean;
    labels?: Partial<LingualI18nLabels>;
    temperature?: number;
    reasoning?: string;
    timeoutMs?: number;
    complete?: (text: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
    signal?: AbortSignal;
}
type LinguaConfig = LingualConfig;
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
type LinguaResult = LingualResult;
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

declare function getDefaultDirectSlots(sourceLang?: string): PromptSlotConfig[];
declare function getDefaultPromptSlots(sourceLang?: string): PromptSlotConfig[];
declare function getDefaultSlots(sourceLang?: string): SlotConfig[];
declare const LEGACY_SLOT_PRESETS: Record<string, {
    slot1: SlotDefinition;
    slot2: SlotDefinition;
}>;
/**
 * 动态根据母语 A (sourceLang) 与目标学习语言 B (targetLang) 生成严格遵循【母语最高统治权】的系统提示词
 * 支持长输入总结 (isLongInput)、上下文注入 (context) 和风格侧重 (tone: "general" | "social" | "tech")。
 */
declare function buildSystemPrompt(sourceLang?: string, targetLang?: string, isLongInput?: boolean, context?: string, tone?: "general" | "social" | "tech", customSlots?: SlotConfig[] | CustomSlotsConfig): string;
declare function resolvePromptTargetLangName(sourceLang?: string, targetLang?: string, promptLang?: string): {
    code: string;
    name: string;
};
declare const PROMPT_RULE_PRESETS: Record<string, string>;
declare function resolvePromptRulePreset(input: string): string;
declare function normalizePromptRules(rule?: string | string[]): string[];
/**
 * Mode 2 (Direct Rewrite): Build a focused Prompt Optimizer system prompt.
 * Equipped with Golden Few-Shot Anchors, Zero-AI-Slop Imperative Guard, and optional 1-line Vocab extraction (`learnInRewrite`).
 */
declare function buildDirectRewriteSystemPrompt(options: {
    sourceLang?: string;
    targetLang?: string;
    promptLang?: string;
    promptRule?: string | string[];
    learnInRewrite?: boolean;
}): string;
/**
 * Mode 3 (N-Choice Interactive Selector): Build a multi-style Prompt Optimizer system prompt
 * generating N candidate prompts according to `promptSlots` (defaulting to Concise, Structured, Deep).
 */
declare function buildPromptCandidatesSystemPrompt(options: {
    sourceLang?: string;
    targetLang?: string;
    promptLang?: string;
    promptRule?: string | string[];
    promptSlots?: PromptSlotConfig[];
    learnInRewrite?: boolean;
}): string;

/**
 * Code & Shell Pass-through Shield (代码与纯命令行 0ms 旁路拦截器)
 *
 * 开发者在与 AI 对话时频繁输入终端命令或粘贴大段代码，这类输入无伴学翻译价值。
 * 在此做 0.1ms 级的快速特征嗅探，命中后直接跳过，零网络请求，零 Token 损耗。
 */
/**
 * Check if the text contains non-English natural language scripts (CJK, accented Latin, Cyrillic, etc.)
 * Strictly avoids triggering on pure emojis, typographical quotes, or terminal commands.
 */
declare function isNonEnglish(text: string): boolean;
/**
 * 判定输入文本是否为纯代码块、Shell 指令或数据结构体，应当 0ms 旁路放行
 */
declare function shouldShieldBypass(text: string): boolean;

/**
 * In-Memory LRU Cache for Lingual Translations (会话级 0 依赖极速缓存)
 *
 * 开发者在与 AI 对话时存在大量高频短语（如“继续”、“可以”、“同意”、“开始吧”、“继续推进”）。
 * 基于 ES6 Map 实现轻量高效的 LRU 缓存（默认容量 50 条）。
 * 命中缓存后 0ms 瞬间直出，零外部调用，零 Token 损耗。
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
    private hits;
    private misses;
    constructor(capacity?: number);
    /**
     * 生成标准化缓存键（结合源语言与目标语言）
     */
    static buildKey(text: string, sourceLang?: string, targetLang?: string, slotSignature?: string): string;
    get(key: string): T | undefined;
    set(key: string, val: T): void;
    has(key: string): boolean;
    clear(): void;
    get size(): number;
    getStats(): CacheStats;
}
declare const LinguaLruCache: typeof LingualLruCache;
declare const globalLingualCache: LingualLruCache<any>;
declare const globalLinguaCache: LingualLruCache<any>;

declare function invalidateUserConfigCache(): void;
declare function isTestEnvironment(): boolean;
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
declare const DEFAULT_CONFIG: LingualConfig;
declare const LINGUAL_SYSTEM_PROMPT: string;
declare const LINGUA_SYSTEM_PROMPT: string;
declare const loadUserConfig: typeof loadUserLingualConfig;
declare const MAX_TRANSLATION_CHARS = 2500;
declare const MAX_TRANSLATION_LINES = 30;
/**
 * Bidirectional language-aware trigger with strict Length & Payload Guards
 */
declare function shouldTriggerTranslation(text: string, sourceLang?: string, allowSameLangPromptOpt?: boolean): boolean;
/**
 * Unified featherweight JSON repair & object extractor (protected against prototype pollution & >32KB payloads)
 */
declare function repairAndParseJsonObject(raw: string): Record<string, any> | null;
/**
 * Clean and parse LLM JSON responses safely (shared across translateCore and translatePrompt)
 */
declare function parseLlmResponse(raw: string): TranslationPayload | null;
interface LingualCoreOptions {
    completer?: (prompt: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
    cache?: LingualLruCache<TranslationPayload>;
    signal?: AbortSignal;
}
/**
 * Pure translation engine orchestrator for lingual-core (decoupled from Pi host session)
 */
declare function translateCore(req: LingualRequest, options?: LingualCoreOptions): Promise<LingualResponse>;
/**
 * Strip annotations and recover purely clean text to prevent LLM prompt pollution
 */
declare function stripLingualAnnotation(annotatedText: string): {
    raw: string;
    spoken?: string;
    written?: string;
    vocab?: string;
};
declare const stripLinguaAnnotation: typeof stripLingualAnnotation;
/**
 * Dynamic density sensing for long input condensation
 */
declare function isDynamicLongInput(text: string, sourceLang?: string): boolean;
/**
 * Translate a user prompt into idiomatic target registers with native nuance and vocabulary highlights
 */
declare function translatePrompt(text: string, userConfig?: Partial<LingualConfig>): Promise<LingualResult | null>;
/**
 * Opt-in Native Reply Guard
 */
declare function shouldInjectNativeReplyGuard(originalText: string, _sourceLang?: string, enabled?: boolean): boolean;
declare function formatNativeReplyGuardHint(sourceLang?: string): string;
declare function resolveDirectSlotsFromConfig(cfg: {
    sourceLang?: string;
    directSlots?: PromptSlotConfig[];
}): PromptSlotConfig[];
declare function resolveCandidateSlotsFromConfig(cfg: {
    sourceLang?: string;
    promptSlots?: PromptSlotConfig[];
}): PromptSlotConfig[];
declare function generatePromptCandidates(text: string, userConfig?: Partial<LingualConfig>): Promise<PromptCandidate[] | null>;
declare function rewritePromptDirect(text: string, userConfig?: Partial<LingualConfig>): Promise<string | null>;
/**
 * On-Demand Tuner Skill Gate (`stripLingualContextWhenOff`)
 */
declare function stripLingualContextWhenOff(systemPrompt: string, lastUserText?: string, tunerArmed?: boolean): string;
interface ModeDisplaySpec {
    companion: string;
    direct: string;
    candidates: string;
    off: string;
    notifyCompanion: (pair: string) => string;
    notifyDirect: (pair: string, firstSlotLabel: string) => string;
    notifyCandidates: (pair: string, slotLabels: string) => string;
    notifyOff: (pair: string) => string;
}
declare function resolveModeDisplaySpec(sourceLang?: string): ModeDisplaySpec;
declare function normalizeLingualModeInput(raw?: string): "original" | "english" | "select" | "off" | null;
declare const CURRENT_FEATURE_BANNER_VERSION = "0.5.4";
declare function resolveReleaseBannerLang(explicitSourceLang?: string, sessionEntries?: any[]): string;
declare function formatReleaseBannerLines(sourceLang?: string, maxCols?: number, fg?: (color: string, text: string) => string): string[];

interface SlotPresetDefinition {
    name: string;
    description: string;
    slots: (sourceLang?: string) => SlotConfig[];
}

/**
 * 创建自定义槽位配置
 */
declare function createCustomSlot(params: Partial<SlotConfig> & {
    id: string;
    label: string;
}): SlotConfig;
/**
 * 纯函数：向槽位列表中添加槽位（若已存在同名 id 则覆盖更新，否则追加在末尾）
 */
declare function addSlotToList(slots: SlotConfig[], newSlot: SlotConfig): SlotConfig[];
/**
 * 纯函数：从槽位列表中彻底移除指定 id 的槽位（支持删除 source 原文槽位）
 */
declare function removeSlotFromList(slots: SlotConfig[], slotId: string): SlotConfig[];
/**
 * 纯函数：更新指定槽位的属性
 */
declare function updateSlotInList(slots: SlotConfig[], slotId: string, patch: Partial<SlotConfig>): SlotConfig[];
/**
 * 纯函数：切换指定槽位的启用/禁用状态
 */
declare function toggleSlotInList(slots: SlotConfig[], slotId: string): SlotConfig[];
/**
 * 纯函数：调整槽位在列表中的排列顺序
 */
declare function moveSlotInList(slots: SlotConfig[], slotId: string, targetIndex: number): SlotConfig[];
declare const SLOT_PRESETS: Record<string, SlotPresetDefinition>;
declare function resolveSlotsForPreset(presetName?: string, sourceLang?: string): SlotConfig[];
/**
 * 官方预设多语言映射矩阵 (Language Preset Matrix)
 * 当用户或 Agent 设定母语 A 时，所有 UI 标签、图腾与状态文本自动本地化，彻底根除跨语言残留。
 */
declare const LANGUAGE_PRESETS: Record<string, LingualI18nLabels>;
/**
 * 根据母语语言代码解析对应的本地化标签，并允许用户自定义覆盖
 * 遵循 Lesson 7: 英文中枢保底链 (English Pivot Fallback)
 */
declare function resolveLabelsForLang(lang: string, overrides?: Partial<LingualI18nLabels>, targetLang?: string): LingualI18nLabels;
/**
 * 格式化完整的运行状态报告，严格遵循母语 A 统治权
 */
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
/**
 * 格式化模型选择界面的提示文本，严格遵循母语 A 统治权
 */
declare function formatModelSelectionMessage(labels: LingualI18nLabels, currentActive: string, availableList?: string): string;

/**
 * Prompt Sanitizer & Intent Distiller (报错审查与意图萃取器)
 *
 * 物理职责：
 * 1. 剥离图片路径与文件路径前缀 (如 C:\Users\...\pi-clipboard-xxx.png)；
 * 2. 识别并折叠多行堆栈追踪 (Node.js at ..., Python Traceback, Java Caused by...)；
 * 3. 识别并折叠多行 Markdown 代码块 (```...```) 为 [...]；
 * 4. 识别并折叠多行编译器/Linter 诊断报错，仅保留首行关键信息；
 * 5. 严格保留 shell 命令行 (git, npm, cargo 等) 原型，不进行破坏性抹除；
 * 6. 提炼出核心自然语言意图，防止几百行报错撑爆终端与大模型上下文。
 */
interface SanitizedPromptResult {
    /** 审查折叠后用于翻译与分句的紧凑意图文本 */
    distilledText: string;
    /** 是否包含有效的人类自然语言提问/意图 */
    hasNaturalLanguage: boolean;
    /** 是否折叠了堆栈、代码块或报错 */
    hasCollapsedContent: boolean;
    /** 自然语言核心字符数估算 */
    naturalCharsLength: number;
    /** 提取出的原始代码块、堆栈或诊断附件 (供 english 模式实施混合意图嫁接) */
    rawPayload?: string;
}
/**
 * 对用户原始输入进行审查与折叠萃取
 */
declare function sanitizePromptForTranslation(raw: string): SanitizedPromptResult;

export { isTestEnvironment as $, type SlotResult as A, type SlotRole as B, CURRENT_FEATURE_BANNER_VERSION as C, DEFAULT_CONFIG as D, addSlotToList as E, buildDirectRewriteSystemPrompt as F, buildPromptCandidatesSystemPrompt as G, buildSystemPrompt as H, createCustomSlot as I, formatModelSelectionMessage as J, formatNativeReplyGuardHint as K, type LingualResult as L, MAX_TRANSLATION_CHARS as M, formatReleaseBannerLines as N, formatStatusReport as O, PROMPT_RULE_PRESETS as P, generatePromptCandidates as Q, getDefaultDirectSlots as R, type SlotConfig as S, type TranslationPayload as T, getDefaultPromptSlots as U, getDefaultSlots as V, globalLinguaCache as W, globalLingualCache as X, invalidateUserConfigCache as Y, isDynamicLongInput as Z, isNonEnglish as _, type LingualI18nLabels as a, loadUserConfig as a0, loadUserLingualConfig as a1, moveSlotInList as a2, normalizeLingualModeInput as a3, normalizePromptRules as a4, parseLlmResponse as a5, removeSlotFromList as a6, repairAndParseJsonObject as a7, resolveCandidateSlotsFromConfig as a8, resolveDirectSlotsFromConfig as a9, resolveLabelsForLang as aa, resolveModeDisplaySpec as ab, resolvePromptRulePreset as ac, resolvePromptTargetLangName as ad, resolveReleaseBannerLang as ae, resolveSlotsForPreset as af, rewritePromptDirect as ag, sanitizePromptForTranslation as ah, saveUserLingualConfig as ai, shouldInjectNativeReplyGuard as aj, shouldShieldBypass as ak, shouldTriggerTranslation as al, stripLinguaAnnotation as am, stripLingualAnnotation as an, stripLingualContextWhenOff as ao, toggleSlotInList as ap, translateCore as aq, translatePrompt as ar, updateSlotInList as as, type CacheStats as b, type CustomSlotsConfig as c, LANGUAGE_PRESETS as d, LEGACY_SLOT_PRESETS as e, LINGUAL_SYSTEM_PROMPT as f, LINGUA_SYSTEM_PROMPT as g, type LinguaConfig as h, type LinguaI18nLabels as i, LinguaLruCache as j, type LinguaMode as k, type LinguaResult as l, type LingualConfig as m, type LingualCoreOptions as n, LingualLruCache as o, type LingualMode as p, type LingualRequest as q, type LingualResponse as r, MAX_TRANSLATION_LINES as s, type ModeDisplaySpec as t, type PromptCandidate as u, type PromptSlotConfig as v, SLOT_PRESETS as w, type SanitizedPromptResult as x, type SlotDefinition as y, type SlotPresetDefinition as z };
