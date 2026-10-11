import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  ExtensionAPI,
  ExtensionContext,
  InputEvent,
  InputEventResult,
} from "@earendil-works/pi-coding-agent";
import type {
  LingualMode,
  LingualI18nLabels,
  LingualResult,
  PromptCandidate,
  PromptSlotConfig,
  SlotConfig,
  SlotResult,
} from "./types.js";
import { getEffectiveMaxCols } from "./layout.js";
import {
  translatePrompt,
  rewritePromptDirect,
  rewritePromptDirectWithDetails,
  generatePromptCandidates,
  stripLingualContextWhenOff,
  formatReleaseBannerLines,
  resolveReleaseBannerLang,
  CURRENT_FEATURE_BANNER_VERSION,
  getDefaultPromptSlots,
  normalizePromptRules,
  PROMPT_RULE_PRESETS,
  resolvePromptRulePreset,
  shouldTriggerTranslation,
  loadUserLingualConfig,
  invalidateUserConfigCache,
  shouldInjectNativeReplyGuard,
  formatNativeReplyGuardHint,
  formatTreeBranch,
  formatSubRail,
  truncateVisual,
  formatCapsuleLine,
  extractVocabPhrases,
  spotlightPhrases,
  getVisualWidth,
  wrapVisualText,
  formatVocabItemsAtomic,
  renderCardLayout,
} from "./engine.js";
import {
  resolveLabelsForLang,
  formatStatusReport,
  formatModelSelectionMessage,
  resolveSlotsForPreset,
  getDefaultSlots,
  createCustomSlot,
  addSlotToList,
  removeSlotFromList,
  toggleSlotInList,
  SLOT_PRESETS,
  LANGUAGE_PRESETS,
} from "./presets.js";
import { splitSemanticChunks } from "./chunker.js";
import { LingualSessionController } from "./fsm.js";
import { sanitizePromptForTranslation } from "./sanitizer.js";
import { globalLingualCache } from "./cache.js";

interface ExtensionState {
  mode: LingualMode;
  compact: boolean;
  sourceLang: string;
  targetLang: string;
  selectedModel: string;
  slotPreset: string;
  slots: SlotConfig[];
  promptLang: string;
  promptRule: string | string[];
  promptSlots: PromptSlotConfig[];
  learnInRewrite: boolean;
  labels: LingualI18nLabels;
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.execArgv.some((a) => a.startsWith("--test") || a === "--test") ||
    process.argv.some((a) => a === "--test" || a.startsWith("--test=") || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(a)) ||
    process.env.npm_lifecycle_event === "test"
  );
}

const initialDiskConfig = isTestEnvironment() ? {} : loadUserLingualConfig();
const initialSourceLang = initialDiskConfig.sourceLang || "zh";
const initialTargetLang = initialDiskConfig.targetLang || (initialSourceLang === "en" ? "ja" : "en");
const initialSlotPreset = initialDiskConfig.slotPreset;
const initialSlots = Array.isArray(initialDiskConfig.slots) && initialDiskConfig.slots.length > 0
  ? initialDiskConfig.slots
  : (initialSlotPreset ? resolveSlotsForPreset(initialSlotPreset, initialSourceLang) : getDefaultSlots(initialSourceLang));
const initialPromptSlots = Array.isArray(initialDiskConfig.promptSlots) && initialDiskConfig.promptSlots.length > 0
  ? initialDiskConfig.promptSlots
  : getDefaultPromptSlots(initialSourceLang);
const initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);

const state: ExtensionState = {
  mode: initialDiskConfig.mode || "original",
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  selectedModel: initialDiskConfig.selectedModel || "auto",
  slotPreset: initialSlotPreset || "",
  slots: initialSlots,
  promptLang: initialDiskConfig.promptLang || "",
  promptRule: initialDiskConfig.promptRule || "",
  promptSlots: initialPromptSlots,
  learnInRewrite: Boolean(initialDiskConfig.learnInRewrite),
  labels: initialLabels,
};

function saveUserLingualConfig(patch: Record<string, any>) {
  // 测试沙箱隔离：自动化测试期间不污染宿主机用户配置
  if (isTestEnvironment()) {
    return;
  }

  try {
    const agentDir = path.join(os.homedir(), ".pi", "agent");
    const configFile = path.join(agentDir, "lingual.json");

    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    let existing: Record<string, any> = {};
    if (fs.existsSync(configFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(configFile, "utf8"));
      } catch {}
    }

    for (const [k, v] of Object.entries(patch)) {
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (
        v === undefined ||
        v === "" ||
        isEmptyArray ||
        v === "auto" ||
        v === "original" ||
        (k === "compact" && v === false) ||
        (k === "learnInRewrite" && v === false)
      ) {
        delete existing[k]; // 恢复默认值时物理移除键，零残留回滚 (RFC 2119 Invariant 1)
      } else {
        existing[k] = v;
      }
    }

    // 原子写入：写入临时文件后 rename，附带 Windows 文件锁冲突安全降级
    const content = JSON.stringify(existing, null, 2);
    const tmpFile = `${configFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;

    try {
      fs.writeFileSync(tmpFile, content, "utf8");
      fs.renameSync(tmpFile, configFile);
    } catch {
      // Windows 句柄锁或权限波动时降级直接安全落盘
      try { fs.writeFileSync(configFile, content, "utf8"); } catch {}
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
    }

    // 同步刷新内存缓存
    invalidateUserConfigCache();
  } catch {}
}

// 单调递增会话 FSM 控制器，彻底根除连续输入并发竞态与幽灵卡片，物理协同掐断上游 Socket
const session = new LingualSessionController();
let lastContext: ExtensionContext | null = null;

function hasActiveUI(ctx: ExtensionContext | null | undefined): ctx is ExtensionContext {
  if (!ctx) return false;
  try {
    return Boolean(ctx.hasUI && ctx.ui);
  } catch {
    return false;
  }
}

function safeClearWidget(ctx: ExtensionContext | null | undefined) {
  if (!ctx) return;
  try {
    if (ctx.ui && typeof ctx.ui.setWidget === "function") {
      ctx.ui.setWidget("lingual_hud", undefined);
    }
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

function updateFooter(ctx: ExtensionContext | null | undefined) {
  if (!hasActiveUI(ctx)) return;
  try {
    // 标准化底栏标签为纯净极简的 A ⇄ B (例如 zh ⇄ en)
    let pair = `${state.sourceLang} ⇄ ${state.targetLang}`;
    const enabledSlots = (state.slots || []).filter((s) => s.enabled);
    const hasSource = enabledSlots.some((s) => s.role === "source");
    const nonSourceCount = enabledSlots.filter((s) => s.role !== "source").length;
    
    if (!hasSource) {
      pair += ` · no-src`;
    }
    if (nonSourceCount !== 2) {
      pair += ` · ${enabledSlots.length}s`;
    } else if (state.slotPreset) {
      pair += ` · ${state.slotPreset}`;
    }

    const ruleCount = normalizePromptRules(state.promptRule).length;
    const ruleBadge = ruleCount > 0 ? `+${ruleCount}` : "";

    switch (state.mode) {
      case "original":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", pair));
        break;
      case "english": {
        const outLang = state.promptLang || state.targetLang;
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ⚡${outLang}${ruleBadge}`));
        break;
      }
      case "select": {
        const outLang = state.promptLang || state.targetLang;
        const count = (state.promptSlots || []).filter((s) => s.enabled !== false).length || 3;
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ✦${count}-${outLang}${ruleBadge}`));
        break;
      }
      case "off":
        // 彻底隐身：处于 off 关闭状态时，完全移除底栏徽标 (0 像素视觉占用)
        ctx.ui.setStatus("lingual", undefined as any);
        break;
    }
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

/**
 * 渲染极简开放式左导轨树状视窗（Trifecta Minimalist Left-Rail Tree Branch）
 * 包含：原文锚点、动态多语域槽位译文及针对母语 A 的精确语感释义、核心短语点睛
 * 0 封闭框线，0 截断假线，100% 免疫 CJK 字符对齐鬼影。
 */
function renderHudWidget(
  ctx: ExtensionContext,
  sourceText: string,
  spoken: string,
  written?: string,
  vocab?: string,
  spokenMeaning?: string,
  writtenMeaning?: string,
  pagination?: { pageIndex: number; totalPages: number },
  slotOutputs?: Record<string, { content: string; meaning?: string }>,
  slots?: SlotResult[]
) {
  if (!hasActiveUI(ctx)) return;
  try {
    const isCompact = state.compact || (process.stdout?.rows ? process.stdout.rows < 22 : false);
    const maxCols = getEffectiveMaxCols();
    const pageTag = pagination && pagination.totalPages > 1
      ? ctx.ui.theme.fg("muted", ` [${pagination.pageIndex + 1}/${pagination.totalPages} ⌥.]`)
      : "";

    const lines = renderCardLayout(
      {
        spoken,
        written: written || "",
        vocab,
        spokenMeaning,
        writtenMeaning,
        sourceText,
        annotated: "",
        slotOutputs,
        slots,
      },
      state.labels,
      {
        maxCols,
        maxLines: 9,
        isCompact,
        slots: state.slots,
        pageTag,
        themeDecorators: {
          muted: (s) => ctx.ui.theme.fg("muted", s),
          accent: (s) => ctx.ui.theme.fg("accent", s),
          dim: (s) => ctx.ui.theme.fg("dim", s),
        },
      }
    );

    ctx.ui.setWidget("lingual_hud", lines, { placement: "aboveEditor" });
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

function renderActiveCard(ctx: ExtensionContext) {
  if (!hasActiveUI(ctx)) return;
  try {
    // 只统计实际已经被翻译就绪的有效卡片，彻底杜绝未就绪切片导致的虚假总页数与跳页
    const readyList = session.getReadyPages();
    if (readyList.length === 0) return;
    const snapshot = session.getPaginationSnapshot();
    const res = session.getActiveResult();
    if (!res) return;
    renderHudWidget(
      ctx,
      res.sourceText,
      res.spoken,
      res.written,
      res.vocab,
      res.spokenMeaning,
      res.writtenMeaning,
      {
        pageIndex: snapshot.pageIndex,
        totalPages: snapshot.readyCount,
      },
      res.slotOutputs,
      res.slots
    );
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

export default function (pi: ExtensionAPI) {
  let polishTimer: NodeJS.Timeout | undefined;
  let resizeTimer: NodeJS.Timeout | undefined;
  let lastRawInputText = "";
  let showingReleaseBanner = false;
  let tunerArmed = false;

  const renderReleaseBanner = (ctx: ExtensionContext, explicitLang?: string) => {
    if (!hasActiveUI(ctx)) return;
    try {
      const maxCols = getEffectiveMaxCols();
      const fg = ctx.ui.theme?.fg
        ? (c: string, t: string) => ctx.ui.theme.fg(c as any, t)
        : (_c: string, t: string) => t;
      const entries = (ctx as any).sessionManager?.getEntries?.() || [];
      const bannerLang = resolveReleaseBannerLang(explicitLang, entries);
      const lines = formatReleaseBannerLines(bannerLang, maxCols, fg);
      ctx.ui.setWidget("lingual_hud", lines, { placement: "aboveEditor" });
      showingReleaseBanner = true;
    } catch {}
  };

  const onResize = () => {
    if (state.mode === "off") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = session.getActiveResult() || session.getLastResult();
      if (active && hasActiveUI(lastContext)) {
        renderActiveCard(lastContext);
      }
    }, 120);
  };

  const syncResizeListener = () => {
    const prevResize = (globalThis as any).__piLingualResizeListener;
    if (prevResize && process.stdout && typeof (process.stdout as any).off === "function") {
      (process.stdout as any).off("resize", prevResize);
    }
    if (state.mode === "off") {
      (globalThis as any).__piLingualResizeListener = undefined;
      return;
    }
    (globalThis as any).__piLingualResizeListener = onResize;
    process.stdout?.on("resize", onResize);
  };
  syncResizeListener();

  const clearPendingTimers = () => {
    if (polishTimer) {
      clearTimeout(polishTimer);
      polishTimer = undefined;
    }
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = undefined;
    }
  };

  pi.on("session_start", async (event: any, ctx) => {
    clearPendingTimers();
    session.abortActive();
    session.reset();
    lastContext = ctx;
    showingReleaseBanner = false;
    const diskCfg = loadUserLingualConfig();
    if (diskCfg.mode) {
      state.mode = diskCfg.mode;
    }
    syncResizeListener();
    if (hasActiveUI(ctx)) {
      safeClearWidget(ctx);
      // 重大功能升级速览卡片：仅在未处于 off 隐身模式且首次升级时展示一次，发消息后自动收起
      if (
        state.mode !== "off" &&
        !isTestEnvironment() &&
        event?.reason !== "resume" &&
        diskCfg.lastSeenVersion !== CURRENT_FEATURE_BANNER_VERSION
      ) {
        renderReleaseBanner(ctx, diskCfg.sourceLang);
        saveUserLingualConfig({ lastSeenVersion: CURRENT_FEATURE_BANNER_VERSION });
      }
    }
    // 0 侵扰冷启动：若处于 off 则底栏彻底为空 (undefined)
    updateFooter(ctx);
  });

  pi.on("agent_start" as any, async (_event: any, ctx: ExtensionContext) => {
    if (showingReleaseBanner) {
      showingReleaseBanner = false;
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
      }
    }
  });

  // 【按需激活 Tuner 零上下文护盾 (On-Demand Tuner Skill Gate)】：
  // 默认在所有模式 (1/2/3/0) 下自动从 System Prompt 中剥离 lingual-tuner 技能块（0 字节开销）；
  // 仅当用户显式敲下 `/lingual tuner` (tunerArmed === true) 或主动提及定制伴学时才按需放行该技能。
  pi.on("before_agent_start" as any, async (event: any) => {
    const armedForTurn = tunerArmed;
    tunerArmed = false;
    if (!event?.systemPrompt || typeof event.systemPrompt !== "string") return;
    const cleaned = stripLingualContextWhenOff(event.systemPrompt, lastRawInputText, armedForTurn);
    if (cleaned !== event.systemPrompt) {
      return { systemPrompt: cleaned };
    }
  });

  pi.on("session_shutdown", async () => {
    clearPendingTimers();
    session.abortActive();
    lastContext = null;
    if (process.stdout && typeof (process.stdout as any).off === "function") {
      (process.stdout as any).off("resize", onResize);
    }
    if ((globalThis as any).__piLingualResizeListener === onResize) {
      (globalThis as any).__piLingualResizeListener = undefined;
    }
  });

  const setModeHandler = async (args: string, ctx: ExtensionContext) => {
    session.abortActive();
    const trimmed = args?.trim().toLowerCase();
    let nextMode: LingualMode;

    if (
      trimmed === "english" ||
      trimmed === "en" ||
      trimmed === "eng" ||
      trimmed === "refine" ||
      trimmed === "rewrite" ||
      trimmed === "direct" ||
      trimmed === "2"
    ) {
      nextMode = "english";
    } else if (
      trimmed === "select" ||
      trimmed === "choices" ||
      trimmed === "choice" ||
      trimmed === "pick" ||
      trimmed === "3"
    ) {
      nextMode = "select";
    } else if (
      trimmed === "original" ||
      trimmed === "orig" ||
      trimmed === "learn" ||
      trimmed === "companion" ||
      trimmed === "1"
    ) {
      nextMode = "original";
    } else if (trimmed === "off" || trimmed === "0" || trimmed === "disable" || trimmed === "stop") {
      nextMode = "off";
    } else {
      // 缺省或无参数时，平滑四态模式循环轮转 (1.原文+伴学 ➔ 2.直出改写 ➔ 3.候选挑一 ➔ 0.彻底关闭)
      nextMode =
        state.mode === "original"
          ? "english"
          : state.mode === "english"
            ? "select"
            : state.mode === "select"
              ? "off"
              : "original";
    }

    state.mode = nextMode;
    // 【核心根治 1 · 状态持久化落盘】：每次切换模式立即物理持久化到 lingual.json，彻底杜绝重载时回退！
    saveUserLingualConfig({ mode: nextMode });
    syncResizeListener();
    if (nextMode === "off") {
      clearPendingTimers();
      session.reset();
      globalLingualCache.clear();
      safeClearWidget(ctx);
    }
    updateFooter(ctx);

    const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
    const outLang = state.promptLang || state.targetLang;
    const rules = normalizePromptRules(state.promptRule);
    const ruleSummary = rules.length > 0 ? ` + ${rules.length}项设定条件` : "";
    const ruleSummaryEn = rules.length > 0 ? ` + ${rules.length} rule(s)` : "";

    if (nextMode === "english") {
      try {
        ctx.ui.notify(
          state.labels.notifyEnglish ||
            (isZh
              ? `[${state.labels.hudTitle}] [2/3 直出改写] 目标文字: ${outLang}${ruleSummary} ➔ 直接改写发送 (敲 /lingual 1|2|3|0 可直达)`
              : `[${state.labels.hudTitle}] [2/3 Direct Rewrite] Target: ${outLang}${ruleSummaryEn} ➔ 1-to-1 send (/lingual 1|2|3|0)`),
          "info"
        );
      } catch {}
    } else if (nextMode === "select") {
      const slotLabels = (state.promptSlots || getDefaultPromptSlots(state.sourceLang))
        .filter((s) => s.enabled !== false)
        .map((s) => s.label)
        .join(" / ");
      try {
        ctx.ui.notify(
          isZh
            ? `[${state.labels.hudTitle}] [3/3 候选挑一 (select)] 目标文字: ${outLang}${ruleSummary} · 候选(${slotLabels}) (敲 /lingual 1|2|3|0 可直达)`
            : `[${state.labels.hudTitle}] [3/3 Pick of N (select)] Target: ${outLang}${ruleSummaryEn} · Slots(${slotLabels}) (/lingual 1|2|3|0)`,
          "info"
        );
      } catch {}
    } else if (nextMode === "off") {
      try {
        ctx.ui.notify(
          state.labels.notifyOff ||
            (isZh
              ? `[${state.labels.hudTitle}] [0 已彻底关闭] 底栏隐藏 · 监听已卸 · 0 Token 零负担 (敲 /lingual 重新开启)`
              : `[${state.labels.hudTitle}] [0 Off] Status hidden · listeners detached · 0-token footprint`),
          "info"
        );
      } catch {}
    } else {
      try {
        ctx.ui.notify(
          state.labels.notifyOriginal ||
            (isZh
              ? `[${state.labels.hudTitle}] [1/3 原文+伴学] 原话 0ms 直发 + 上方浮现伴学卡 (敲 /lingual 1|2|3|0 可直达)`
              : `[${state.labels.hudTitle}] [1/3 Orig+Learn] 0ms raw send + learning card above (/lingual 1|2|3|0)`),
          "info"
        );
      } catch {}
    }
  };

  const setModelHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const followSessionDesc = state.labels.modelFollowSession || "follow session";
    const currentActive = state.selectedModel === "auto"
      ? (ctx.model ? `auto (${followSessionDesc}: ${ctx.model.provider}/${ctx.model.id})` : "auto")
      : state.selectedModel;

    if (!trimmed) {
      const available = ctx.modelRegistry?.getAvailable?.() || [];
      const availableList = available.length > 0
        ? available.map((m) => `• ${m.provider}/${m.id}`).slice(0, 8).join("\n")
        : undefined;

      const msg = formatModelSelectionMessage(state.labels, currentActive || "auto", availableList);
      ctx.ui.notify(msg, "info");
      return;
    }

    state.selectedModel = trimmed;
    saveUserLingualConfig({ selectedModel: trimmed });
    const switchTemplate = state.labels.notifyModelSwitched || "Companion model switched to: {model}";
    const switchedMsg = `[${state.labels.hudTitle}] ` + switchTemplate.replace("{model}", trimmed);
    ctx.ui.notify(switchedMsg, "info");
  };

  function normalizeLangCode(input: string): string {
    const s = input.trim().toLowerCase().replace(/[-_].*$/, "");
    if (s === "zh" || s === "cn" || s === "chinese" || s === "中文") return "zh";
    if (s === "ja" || s === "jp" || s === "japanese" || s === "日本語" || s === "日文" || s === "日语") return "ja";
    if (s === "ko" || s === "kr" || s === "korean" || s === "한국어" || s === "韩语" || s === "韩文") return "ko";
    if (s === "en" || s === "eng" || s === "english" || s === "英语" || s === "英文") return "en";
    if (s === "es" || s === "spanish" || s === "español" || s === "西语" || s === "西班牙语") return "es";
    if (s === "fr" || s === "french" || s === "français" || s === "法语" || s === "法文") return "fr";
    if (s === "de" || s === "german" || s === "deutsch" || s === "德语" || s === "德文") return "de";
    if (s === "ru" || s === "russian" || s === "русский" || s === "俄语" || s === "俄文") return "ru";
    return s;
  }

  const switchLangHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim().toLowerCase();
    if (!trimmed || trimmed === "list" || trimmed === "help" || trimmed === "?") {
      const listText = (state.labels.langList || [
        "• zh (Chinese ➔ English)",
        "• ja (Japanese ➔ English)",
        "• en (English ➔ Japanese)",
        "• es (Spanish ➔ English)",
        "• fr (French ➔ English)",
        "• de (German ➔ English)",
      ]).join("\n");
      const usage = state.labels.langUsageHint || "Usage: /lang <zh|ja|en|es|fr|de> [target] (e.g. /lang ja or /lang zh ja)";
      ctx.ui.notify(
        `[${state.sourceLang} ⇄ ${state.targetLang}] ${state.labels.statusReportFlow || "Flow"}: [${state.sourceLang} ➔ ${state.targetLang}]\n${listText}\n${usage}`,
        "info"
      );
      return;
    }

    const parts = trimmed.split(/\s*->\s*|\s*➔\s*|\s+to\s+|\s+/).filter(Boolean);
    const newSource = normalizeLangCode(parts[0]);
    const newTarget = parts.length > 1 ? normalizeLangCode(parts[1]) : (newSource === "en" ? "ja" : "en");

    if (!LANGUAGE_PRESETS[newSource]) {
      ctx.ui.notify(
        state.labels.notifyLangInvalid || "Invalid language code. Supported: zh, ja, en, es, fr, de",
        "warning"
      );
      return;
    }

    state.sourceLang = newSource;
    state.targetLang = newTarget;
    state.labels = resolveLabelsForLang(newSource, undefined, newTarget);
    if (state.slotPreset) {
      state.slots = resolveSlotsForPreset(state.slotPreset, newSource);
    } else {
      const freshDefaults = getDefaultSlots(newSource);
      const freshMap = new Map(freshDefaults.map((s) => [s.id, s]));
      state.slots = (state.slots || freshDefaults).map((s) => {
        const match = freshMap.get(s.id);
        return match ? { ...match, enabled: s.enabled, showMeaning: s.showMeaning } : s;
      });
    }
    // Sync built-in promptSlots labels (`concise`, `spec`, `deep`) to the new source language
    const freshPromptDefaults = getDefaultPromptSlots(newSource);
    const freshPromptMap = new Map(freshPromptDefaults.map((s) => [s.id, s]));
    state.promptSlots = (state.promptSlots || freshPromptDefaults).map((s) => {
      const match = freshPromptMap.get(s.id);
      return match ? { ...match, enabled: s.enabled } : s;
    });
    saveUserLingualConfig({ sourceLang: newSource, targetLang: newTarget, slots: state.slots });
    session.reset();
    globalLingualCache.clear();
    updateFooter(ctx);

    const template = state.labels.notifyLangSwitched || "Native language switched to: {lang}";
    const flowText = `${newSource} ⇄ ${newTarget}`;
    ctx.ui.notify(`[${flowText}] ` + template.replace("{lang}", flowText), "info");
  };

  const toggleCompactHandler = async (_args: string, ctx: ExtensionContext) => {
    state.compact = !state.compact;
    saveUserLingualConfig({ compact: state.compact });
    const msg = state.compact
      ? (state.labels.notifyCompactOn || `[${state.labels.hudTitle}] Single-line capsule mode enabled`)
      : (state.labels.notifyCompactOff || `[${state.labels.hudTitle}] Full tree layout restored`);
    ctx.ui.notify(msg, "info");

    // 若当前有活动卡片，立即就地刷新重绘
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
    } else if (session.getLastResult()) {
      const last = session.getLastResult()!;
      renderHudWidget(
        ctx,
        last.sourceText,
        last.spoken,
        last.written,
        last.vocab,
        last.spokenMeaning,
        last.writtenMeaning,
        undefined,
        last.slotOutputs,
        last.slots
      );
    }
  };

  const refreshActiveView = (ctx: ExtensionContext) => {
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
    } else if (session.getLastResult()) {
      const last = session.getLastResult()!;
      renderHudWidget(
        ctx,
        last.sourceText,
        last.spoken,
        last.written,
        last.vocab,
        last.spokenMeaning,
        last.writtenMeaning,
        undefined,
        last.slotOutputs,
        last.slots
      );
    }
  };

  const switchSlotsHandler = async (args: string, ctx: ExtensionContext) => {
    const rawArgs = args.trim();
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    const subCmd = (parts[0] || "").toLowerCase();
    const lbl = state.labels;

    // 1. 无参数或 "list": 查看当前所有槽位状态与管理帮助 (根据当前语言严格本地化，Primary Language Sovereignty)
    if (!subCmd || subCmd === "list" || subCmd === "ls") {
      const slots = state.slots || [];
      const lines = slots.map((s, idx) => {
        const status = s.enabled
          ? (lbl.slotsStatusEnabled || "enabled")
          : (lbl.slotsStatusDisabled || "disabled");
        const meaning = s.showMeaning ? (lbl.slotsWithNuance || " +nuance") : "";
        const inst = s.instruction ? ` // ${s.instruction.slice(0, 45)}...` : "";
        return `  ${idx + 1}. [${s.id}] "${s.label}" (${s.role}, ${status}${meaning})${inst}`;
      });

      const enabledCount = slots.filter((s) => s.enabled).length;
      const header = `⇄ [${lbl.hudTitle}] ${lbl.slotsHeader || "Dynamic Slots"} (${enabledCount}/${slots.length} ${lbl.slotsActiveTag || "active"}):\n`;
      const body = lines.length > 0 ? lines.join("\n") : `  (${lbl.slotsNone || "No slots configured"})`;
      const nlTitle = lbl.slotsNlTitle ? `\n\n${lbl.slotsNlTitle}\n` : "";
      const nlExamples = (lbl.slotsNlExamples || []).map((ex) => `  ${ex}`).join("\n");
      const cliTitle = lbl.slotsCliTitle ? `\n\n${lbl.slotsCliTitle}\n` : "";
      const cliHelp = (lbl.slotsCliHelp || []).map((cmd) => `  ${cmd}`).join("\n");

      const help = `${header}${body}${nlTitle}${nlExamples}${cliTitle}${cliHelp}`;
      ctx.ui.notify(help, "info");
      return;
    }

    // 2. "/slots reset": 恢复开箱即用默认初始槽位
    if (subCmd === "reset") {
      state.slots = getDefaultSlots(state.sourceLang);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: undefined, slotPreset: undefined });
      globalLingualCache.clear();
      const resetMsg = (lbl.slotsResetSuccess || "⇄ [{pair}] Reset slots to clean defaults").replace("{pair}", lbl.hudTitle);
      ctx.ui.notify(resetMsg, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 3. "/slots rm <id>" 或 "/slots remove <id>" 或 "/slots del <id>": 彻底删除槽位（支持删除 source 原文槽位！）
    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageRm || "Usage: /slots rm <slot-id>", "warning");
        return;
      }
      const existing = (state.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", lbl.hudTitle).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      state.slots = removeSlotFromList(state.slots || [], targetId);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: undefined });
      globalLingualCache.clear();

      const extraHint = targetId === "source" ? (lbl.slotsRemovedSourceNote || " (Source line will no longer appear on cards)") : "";
      const removedTpl = lbl.slotsRemovedSuccess || "[{pair}] Removed slot [{id}] (\"{label}\")";
      const notifyMsg = removedTpl
        .replace("{pair}", lbl.hudTitle)
        .replace("{id}", targetId)
        .replace("{label}", existing.label) + extraHint;
      ctx.ui.notify(notifyMsg, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 4. "/slots toggle <id>": 一键开关槽位
    if (subCmd === "toggle") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageToggle || "Usage: /slots toggle <slot-id>", "warning");
        return;
      }
      const existing = (state.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", lbl.hudTitle).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      state.slots = toggleSlotInList(state.slots || [], targetId);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: undefined });
      globalLingualCache.clear();
      const updated = state.slots.find((s) => s.id.toLowerCase() === targetId);
      const statusText = updated?.enabled
        ? (lbl.slotsStatusEnabled || "enabled")
        : (lbl.slotsStatusDisabled || "disabled");
      const toggledTpl = lbl.slotsToggled || "[{pair}] Slot [{id}] is now {status}";
      const notifyMsg = toggledTpl
        .replace("{pair}", lbl.hudTitle)
        .replace("{id}", targetId)
        .replace("{status}", statusText);
      ctx.ui.notify(notifyMsg, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 5. "/slots add <id> <label> [instruction...]": 动态添加或修改槽位
    if (subCmd === "add") {
      const id = (parts[1] || "").toLowerCase();
      const label = parts[2];
      const instruction = parts.slice(3).join(" ");
      if (!id || !label) {
        ctx.ui.notify(lbl.slotsUsageAdd || "Usage: /slots add <id> <label> [instruction...]", "warning");
        return;
      }
      const newSlot = createCustomSlot({
        id,
        label,
        instruction: instruction || undefined,
      });
      state.slots = addSlotToList(state.slots || [], newSlot);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: undefined });
      globalLingualCache.clear();
      const addedTpl = lbl.slotsAdded || "[{pair}] Added/updated slot [{id}] \"{label}\"";
      const notifyMsg = addedTpl
        .replace("{pair}", lbl.hudTitle)
        .replace("{id}", id)
        .replace("{label}", label);
      ctx.ui.notify(notifyMsg, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 6. 兼容历史预设关键词 (e.g. /slots compact2, /slots social, /slots developer)
    const matchedPreset = SLOT_PRESETS[subCmd];
    if (matchedPreset) {
      state.slotPreset = subCmd;
      state.slots = resolveSlotsForPreset(subCmd, state.sourceLang);
      saveUserLingualConfig({ slotPreset: subCmd === "developer" ? undefined : subCmd, slots: state.slots });
      globalLingualCache.clear();
      const template = lbl.notifySlotSwitched || "[{pair}] Applied preset [{preset}]: {desc}";
      const notifyMsg = template
        .replace("{pair}", lbl.hudTitle)
        .replace("{preset}", subCmd)
        .replace("{desc}", matchedPreset.description);
      ctx.ui.notify(notifyMsg, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 7. 未知指令提示
    const unknownTpl = lbl.slotsUnknown || "Unknown slot command or preset \"{cmd}\".";
    ctx.ui.notify(unknownTpl.replace("{pair}", lbl.hudTitle).replace("{cmd}", subCmd), "warning");
  };

  const showStatusHandler = async (_args: string, ctx: ExtensionContext) => {
    const followDesc = state.labels.modelFollowSession || "follow session";
    const activeModel = state.selectedModel === "auto"
      ? (ctx.model ? `auto (${followDesc}: ${ctx.model.provider}/${ctx.model.id})` : "auto")
      : (state.selectedModel || "auto");

    const promptSlotNames = (state.promptSlots || getDefaultPromptSlots(state.sourceLang))
      .filter((s) => s.enabled !== false)
      .map((s) => s.label)
      .join(" / ");
    const outLang = state.promptLang || state.targetLang;

    const statusMsg = formatStatusReport(state.labels, {
      mode: state.mode,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      activeModel,
      layout: state.compact ? "capsule" : "tree",
      cacheStats: globalLingualCache.getStats(),
    }) +
      `\n• Companion Slots (original): [${state.slotPreset || "developer"}] (${(state.slots || []).filter(s => s.enabled).map(s => s.label).join(", ")})` +
      `\n• Prompt Optimizer (english/select): Output=[${outLang}] · Styles=[${promptSlotNames}]${state.promptRule ? ` · Rule="${state.promptRule}"` : ""}`;

    ctx.ui.notify(statusMsg, "info");
  };

  const showLastHandler = async (_args: string, ctx: ExtensionContext) => {
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
      ctx.ui.notify(state.labels.notifyHistoryRestored || `[${state.labels.hudTitle}] Restored previous companion card`, "info");
      return;
    }
    const last = session.getLastResult();
    if (!last) {
      ctx.ui.notify(state.labels.notifyNoHistory || `[${state.labels.hudTitle}] No previous companion card recorded`, "info");
      return;
    }
    renderHudWidget(
      ctx,
      last.sourceText,
      last.spoken,
      last.written,
      last.vocab,
      last.spokenMeaning,
      last.writtenMeaning,
      undefined,
      last.slotOutputs,
      last.slots
    );
    ctx.ui.notify(state.labels.notifyHistoryRestored || `[${state.labels.hudTitle}] Restored previous companion card`, "info");
  };

  // 伴学定制与 lingual-tuner 深度指引处理器 (严格依从母语 A 统治权，零跨语言残留)
  const showAgentGuideHandler = async (_args: string, ctx: ExtensionContext) => {
    const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
    const isJa = state.sourceLang === "ja";
    const isEs = state.sourceLang === "es";
    const isFr = state.sourceLang === "fr";
    const isDe = state.sourceLang === "de";

    let guide = "";
    if (isZh) {
      guide =
        `🤖 lingual-tuner 双引擎定制指南 (伴学模式 vs 提示词优化模式):\n\n` +
        `pi-lingual 内置 lingual-tuner 技能。无需手敲复杂命令，直接跟当前 Agent 说出您的偏好：\n` +
        `1. 定制【伴学模式 (original · 语感词卡 slots)】:\n` +
        `   • "伴学卡片不要显示中文原文，只要纯译文"\n` +
        `   • "帮我配置推特推文和深度分析两个伴学槽位"\n` +
        `2. 定制【提示词优化模式 (english 直出重写 / select 多风格候选填入)】:\n` +
        `   • "把我的提示词重写模式设为中文输出，并叠加上最小改动原则"\n` +
        `   • "开启多风格候选模式 (select)，给我生成极简高效、结构化规范、TDD测试驱动 3 个候选提示词让我选"\n\n` +
        `Agent 会直接更新 ~/.pi/agent/lingual.json，单回合即刻生效！\n` +
        `模式切换：/lingual <original|english|select|off> · 语言切换：/lang <zh|ja|en|es|fr|de>。`;
    } else if (isJa) {
      guide =
        `🤖 lingual-tuner カスタマイズ案内 (伴走モード vs プロンプト最適化モード):\n\n` +
        `pi-lingual は lingual-tuner スキルを内蔵しています。Agent に直接ご要望をお伝えください：\n` +
        `1. 【伴走モード (original · 語学スロット slots)】:\n` +
        `   • 「伴走カードに原文を表示せず、訳文のみ表示して」\n` +
        `2. 【プロンプト最適化モード (english 直接書き換え / select 複数候補選択)】:\n` +
        `   • 「プロンプト最適化を日本語出力に設定し、最小変更原則を追加して」\n` +
        `   • 「複数候補モード (select) にして、簡潔・構造化・根本原因の3つの候補から選べるようにして」\n\n` +
        `Agent が ~/.pi/agent/lingual.json を直接更新し、即座に反映されます！`;
    } else {
      guide =
        `🤖 lingual-tuner Dual-Engine Customization Guide (Companion vs Prompt Optimizer):\n\n` +
        `pi-lingual includes a built-in lingual-tuner skill. Just describe your preferences to your Agent:\n` +
        `1. Customize [Companion Mode (original · language learning slots)]:\n` +
        `   • "Hide original text on companion cards, show translations only"\n` +
        `   • "Configure companion with Twitter Hook and Technical Insight slots"\n` +
        `2. Customize [Prompt Optimizer Mode (english direct rewrite / select N-choice picker)]:\n` +
        `   • "Configure prompt rewrite mode to output in my native language and enforce smallest working diff"\n` +
        `   • "Switch to select mode with 3 custom prompt styles: Concise, Structured Spec, and TDD"\n\n` +
        `Your Agent will update ~/.pi/agent/lingual.json directly in a single turn!\n` +
        `Switch modes: /lingual <original|english|select|off> · Switch language: /lang <zh|ja|en|es|fr|de>.`;
    }

    ctx.ui.notify(guide, "info");
  };

  // 核心主命令总线调度器：处理 /lingual 下的子命令路由与平滑轮转
  const masterCommandHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args?.trim();
    if (!trimmed) {
      // 无参数时：平滑三态模式循环轮转 (original ➔ english ➔ off ➔ original)
      await setModeHandler("", ctx);
      return;
    }

    const lower = trimmed.toLowerCase();
    const spaceIndex = lower.indexOf(" ");
    const sub = spaceIndex === -1 ? lower : lower.slice(0, spaceIndex);
    const subArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    // 1. 子命令路由: 语言切换 (/lingual lang [code])
    if (sub === "lang" || sub === "language") {
      await switchLangHandler(subArgs, ctx);
      return;
    }

    // 1.1 子命令路由: 槽位架构切换 (/lingual slots [args...])
    if (sub === "slots" || sub === "slot" || sub === "preset") {
      await switchSlotsHandler(subArgs, ctx);
      return;
    }

    // 2. 子命令路由: 模型查看与切换 (/lingual model [id])
    if (sub === "model") {
      await setModelHandler(subArgs, ctx);
      return;
    }

    // 3. 子命令路由: 胶囊/树状布局切换 (/lingual compact)
    if (sub === "compact" || sub === "capsule" || sub === "layout") {
      await toggleCompactHandler(subArgs, ctx);
      return;
    }

    // 4. 子命令路由: 状态报告 (/lingual status)
    if (sub === "status" || sub === "info" || sub === "report") {
      await showStatusHandler(subArgs, ctx);
      return;
    }

    // 5. 子命令路由: 回看上一条卡片 (/lingual last)
    if (sub === "last" || sub === "prev" || sub === "history") {
      await showLastHandler(subArgs, ctx);
      return;
    }

    // 6. 子命令路由: 按需唤醒 Tuner 定制技能 (/lingual tuner [需求] 或 /lingual agent)
    if (sub === "tuner" || sub === "tune" || sub === "agent" || sub === "help" || sub === "?") {
      tunerArmed = true;
      const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
      if (subArgs && typeof (pi as any).sendUserMessage === "function") {
        (pi as any).sendUserMessage(
          isZh
            ? `[lingual-tuner] 请读取 lingual-tuner 技能并按以下需求直接修改 ~/.pi/agent/lingual.json：${subArgs}`
            : `[lingual-tuner] Please load the lingual-tuner skill and update ~/.pi/agent/lingual.json for: ${subArgs}`
        );
        return;
      }
      await showAgentGuideHandler(subArgs, ctx);
      return;
    }

    // 6.05 子命令路由: 改写模式下顺带提取重点词汇伴学开关 (/lingual learn-on | learn-off)
    if (sub === "learn-on" || sub === "learn-off" || sub === "learn-in-rewrite") {
      const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
      const nextVal =
        sub === "learn-on"
          ? true
          : sub === "learn-off"
            ? false
            : subArgs.trim() === "on" || subArgs.trim() === "true"
              ? true
              : subArgs.trim() === "off" || subArgs.trim() === "false"
                ? false
                : !state.learnInRewrite;
      state.learnInRewrite = nextVal;
      saveUserLingualConfig({ learnInRewrite: nextVal });
      ctx.ui.notify(
        isZh
          ? `[改写兼顾伴学] 已${nextVal ? "开启 (在状态 2/3 改写卡片底部同步展示一行重点词)" : "关闭 (状态 2/3 仅展示纯粹改写提示词)"}`
          : `[Learn in Rewrite] ${nextVal ? "Enabled (shows 1-line vocab takeaway in Mode 2/3)" : "Disabled (pure prompt rewrite)"}`,
        "info"
      );
      return;
    }

    // 6.1 子命令路由: 查看本版本新特性速览卡片 (/lingual news 或 /lingual whatsnew)
    if (sub === "news" || sub === "whatsnew" || sub === "changelog") {
      const diskCfg = loadUserLingualConfig();
      renderReleaseBanner(ctx, diskCfg.sourceLang || state.sourceLang);
      return;
    }

    // 6.2 子命令路由: 设定改写目标语言 (/lingual target <en|native|zh|ja...>)
    if (sub === "target" || sub === "outlang" || sub === "promptlang") {
      const val = subArgs.trim().toLowerCase();
      const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
      if (!val) {
        const cur = state.promptLang || `${state.targetLang} (default)`;
        ctx.ui.notify(
          isZh
            ? `[改写目标语言] 当前: ${cur} · 用法: /lingual target <en|native|zh|ja>`
            : `[Rewrite Target Lang] Current: ${cur} · Usage: /lingual target <en|native|zh|ja>`,
          "info"
        );
        return;
      }
      state.promptLang = val === "default" || val === "reset" ? "" : val;
      saveUserLingualConfig({ promptLang: state.promptLang });
      updateFooter(ctx);
      ctx.ui.notify(
        isZh
          ? `[改写目标语言] 已设为: ${state.promptLang || state.targetLang}`
          : `[Rewrite Target Lang] Set to: ${state.promptLang || state.targetLang}`,
        "info"
      );
      return;
    }

    // 6.3 子命令路由: 管理改写设定条件 (/lingual rule [add|rm|clear|<条件>])
    if (sub === "rule" || sub === "rules" || sub === "cond") {
      const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
      const currentRules = normalizePromptRules(state.promptRule);
      const argTrim = subArgs.trim();

      if (!argTrim || argTrim === "list") {
        if (currentRules.length === 0) {
          ctx.ui.notify(
            isZh
              ? `[改写设定条件] 当前无附加条件 · 添加: /lingual rule <条件内容>`
              : `[Rewrite Conditions] None set · Add: /lingual rule <condition>`,
            "info"
          );
        } else {
          const listStr = currentRules.map((r, i) => `  [${i + 1}] ${r}`).join("\n");
          ctx.ui.notify(
            isZh
              ? `[改写设定条件 (${currentRules.length}项)]\n${listStr}\n(用 /lingual rule add <条件> 追加，/lingual rule clear 清空)`
              : `[Rewrite Conditions (${currentRules.length})]\n${listStr}\n(Use /lingual rule add <cond> or /lingual rule clear)`,
            "info"
          );
        }
        return;
      }

      if (argTrim === "clear" || argTrim === "reset" || argTrim === "off") {
        state.promptRule = [];
        saveUserLingualConfig({ promptRule: [] });
        updateFooter(ctx);
        ctx.ui.notify(
          isZh ? `[改写设定条件] 已清空全部附加设定条件` : `[Rewrite Conditions] Cleared all conditions`,
          "info"
        );
        return;
      }

      if (argTrim.startsWith("rm ") || argTrim.startsWith("del ")) {
        const target = argTrim.replace(/^(?:rm|del)\s+/i, "").trim();
        const idx = parseInt(target, 10) - 1;
        const nextRules = !Number.isNaN(idx) && idx >= 0 && idx < currentRules.length
          ? currentRules.filter((_, i) => i !== idx)
          : currentRules.filter((r) => !r.includes(target));
        state.promptRule = nextRules;
        saveUserLingualConfig({ promptRule: nextRules });
        updateFooter(ctx);
        ctx.ui.notify(
          isZh
            ? `[改写设定条件] 已移除，当前剩余 ${nextRules.length} 项条件`
            : `[Rewrite Conditions] Removed; ${nextRules.length} condition(s) active`,
          "info"
        );
        return;
      }

      const rawRule = argTrim.replace(/^add\s+/i, "").trim();
      const toAdd = resolvePromptRulePreset(rawRule);
      const nextRules = currentRules.includes(toAdd) ? currentRules : [...currentRules, toAdd];
      state.promptRule = nextRules;
      saveUserLingualConfig({ promptRule: nextRules });
      updateFooter(ctx);
      ctx.ui.notify(
        isZh
          ? `[改写设定条件] 已叠加第 ${nextRules.length} 项条件: "${toAdd}"`
          : `[Rewrite Conditions] Added condition #${nextRules.length}: "${toAdd}"`,
        "info"
      );
      return;
    }

    // 7. 模式切换优先: 显式模式关键词或数字直达 (/lingual 1|2|3|0|learn|rewrite|select|off)
    if (
      sub === "mode" ||
      sub === "1" ||
      sub === "2" ||
      sub === "3" ||
      sub === "0" ||
      sub === "learn" ||
      sub === "companion" ||
      sub === "original" ||
      sub === "english" ||
      sub === "refine" ||
      sub === "rewrite" ||
      sub === "direct" ||
      sub === "select" ||
      sub === "choices" ||
      sub === "choice" ||
      sub === "pick" ||
      sub === "off" ||
      sub === "orig" ||
      sub === "disable" ||
      sub === "stop"
    ) {
      await setModeHandler(sub === "mode" ? subArgs : trimmed, ctx);
      return;
    }

    // 8. 直接输入语言代码 (/lingual ja 或 /lingual zh ja)
    const possibleLang = normalizeLangCode(sub);
    if (LANGUAGE_PRESETS[possibleLang]) {
      await switchLangHandler(trimmed, ctx);
      return;
    }

    await setModeHandler(trimmed, ctx);
  };

  // 精简命令矩阵：仅在 Pi 的 / 菜单注册 4 个核心命令 (/lingual, /lang, /slots, /last)，零菜单刷屏负担
  pi.registerCommand("lingual", {
    description:
      state.labels.cmdDescMode ||
      "Cycle mode (1:Learn ➔ 2:Rewrite ➔ 3:Select ➔ 0:Off) or manage: /lingual [1|2|3|0|lang|slots|rule|target|compact|model|status|last]",
    handler: masterCommandHandler,
  });

  pi.registerCommand("lang", {
    description: state.labels.cmdDescLang || "Switch companion language: /lang <zh|ja|ko|en|es|fr|de|ru> [target]",
    handler: switchLangHandler,
  });

  pi.registerCommand("slots", {
    description: state.labels.cmdDescSlots || "Inspect or customize companion & prompt slots: /slots [add|rm|toggle|reset]",
    handler: switchSlotsHandler,
  });

  pi.registerCommand("last", {
    description: state.labels.cmdDescLast || "Replay previous companion card: /last",
    handler: showLastHandler,
  });

  if (typeof pi.registerShortcut === "function") {
    // 快捷键支持：使用 Alt+. 与 Alt+,（处于 off 时直接静默返回）
    pi.registerShortcut("alt+.", {
      description: state.labels.shortcutNextPage || "Switch to next companion segment",
      handler: async (ctx) => {
        if (state.mode === "off") return;
        if (session.nextPage()) {
          renderActiveCard(ctx);
        }
      },
    });

    pi.registerShortcut("alt+,", {
      description: state.labels.shortcutPrevPage || "Switch to previous companion segment",
      handler: async (ctx) => {
        if (state.mode === "off") return;
        if (session.prevPage()) {
          renderActiveCard(ctx);
        }
      },
    });
  }

  // 创建 Pi 宿主原生模型驱动器：0 配置开箱即用，优先复用 Pi 已授权的会话凭据，拒绝泄露本地私有 Token
  const createModelCompleter = (ctx: ExtensionContext) => {
    return async (text: string, systemPrompt: string, signal?: AbortSignal): Promise<string | null> => {
      try {
        if (!ctx.modelRegistry) return null;

        // 1. 解析目标模型：支持 auto 跟随主会话，或用户通过 /lingual-model 自选的模型
        let targetModel = ctx.model;
        if (state.selectedModel && state.selectedModel !== "auto") {
          const available = ctx.modelRegistry.getAvailable?.() || [];
          const match = available.find(
            (m) =>
              m.id === state.selectedModel ||
              `${m.provider}/${m.id}` === state.selectedModel ||
              m.id.toLowerCase().includes(state.selectedModel.toLowerCase())
          );
          if (match) targetModel = match;
        }

        if (!targetModel) return null;

        // 2. 调用 Pi 原生无缝流式推理 (streamSimple)，不走硬编码外网代理，完全由 Pi 托管凭证与认证
        // 弹性参数配置：扩容 maxTokens 至 1500，杜绝长输入多槽位 JSON 截断；绝不盲目硬编码 reasoning 导致 400 报错
        const diskConfig = loadUserLingualConfig();
        const requestOptions: Record<string, any> = {
          maxTokens: 1500,
        };
        if (diskConfig.reasoning) {
          requestOptions.reasoning = diskConfig.reasoning;
        }

        const stream = ctx.modelRegistry.streamSimple(
          targetModel,
          {
            systemPrompt,
            messages: [
              {
                role: "user",
                content: [{ type: "text", text }],
                timestamp: Date.now(),
              },
            ],
          },
          requestOptions as any
        );

        // 【超时熔断】：默认 15s 充裕超时（支持 lingual.json 配置 timeoutMs），杜绝 30s 终端输入假死，同时无缝协同中断信号
        const timeoutMs = diskConfig.timeoutMs || 15000;
        let timeoutHandle: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error("Lingual translation timed out")), timeoutMs);
        });
        const abortPromise = new Promise<null>((_, reject) => {
          if (signal?.aborted) reject(new Error("Lingual translation aborted"));
          signal?.addEventListener("abort", () => reject(new Error("Lingual translation aborted")), { once: true });
        });
        let res: any;
        try {
          res = await Promise.race([stream.result(), timeoutPromise, abortPromise]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
        if (!res) return null;
        const content = res.content
          ?.filter((c: any) => c.type === "text")
          ?.map((c: any) => c.text)
          ?.join("");

        return content && content.trim() ? content.trim() : null;
      } catch {
        return null;
      }
    };
  };

  // 核心拦截层：绝不把双模标注硬塞入用户的消息历史与 Prompt！
  pi.on("input", async (event: InputEvent, ctx: ExtensionContext): Promise<InputEventResult> => {
    lastRawInputText = event?.text || "";
    if (showingReleaseBanner) {
      showingReleaseBanner = false;
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
      }
    }
    if (state.mode === "off") return { action: "continue" };
    if (event.source === "extension") return { action: "continue" };

    // Sync external lingual.json updates (e.g. written by lingual-tuner skill)
    const latestDisk = loadUserLingualConfig();
    if (latestDisk.slots && Array.isArray(latestDisk.slots)) {
      state.slots = latestDisk.slots;
    }
    if (latestDisk.promptLang !== undefined) {
      state.promptLang = latestDisk.promptLang;
    }
    if (latestDisk.promptRule !== undefined) {
      state.promptRule = latestDisk.promptRule;
    }
    if (latestDisk.promptSlots && Array.isArray(latestDisk.promptSlots)) {
      state.promptSlots = latestDisk.promptSlots;
    }
    if (latestDisk.learnInRewrite !== undefined) {
      state.learnInRewrite = Boolean(latestDisk.learnInRewrite);
    }

    const raw = event.text.trim();
    if (!raw) return { action: "continue" };

    // Skip commands and shell escapes (abort any in-flight translation from previous turn)
    if (raw.startsWith("/") || raw.startsWith("!")) {
      clearPendingTimers();
      session.abortActive();
      if (hasActiveUI(ctx)) {
        updateFooter(ctx);
      }
      return { action: "continue" };
    }

    // 智能审查与意图萃取：剥离剪贴板图片、折叠多行堆栈追踪与代码块为 [...]，提炼真实自然语言核心
    const sanitized = sanitizePromptForTranslation(raw);
    const promptToTranslate = sanitized.distilledText;
    const isPromptOptMode = state.mode === "english" || state.mode === "select";

    // 判定 1：若整段输入经过审查后，发现毫无自然语言意图 (纯堆栈/纯代码/纯命令)
    // 判定 2：或命中底层代码与 CLI 盾牌及字符长度防护 (由 shouldTriggerTranslation 统一管控)
    if (
      !sanitized.hasNaturalLanguage ||
      !shouldTriggerTranslation(promptToTranslate, state.sourceLang, isPromptOptMode)
    ) {
      // 【关键体验防线 1 · 绝无僵尸残留与幽灵复活】：当前输入不触发翻译时，立刻中止在途请求、物理销毁旧卡片，并彻底清空分页池！
      clearPendingTimers();
      session.abortActive();
      session.clearPagination();
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        updateFooter(ctx);
      }
      return { action: "continue" };
    }

    lastContext = ctx;
    const { generation, signal } = session.beginRequest();
    const completer = createModelCompleter(ctx);

    // 【单卡高密度意图凝练流】：短句常规直译，长句由模型自动注入 Condensation 提炼为精悍单卡，彻底消除多切片轮询复杂性
    session.initPagination(1);

    // =========================================================================
    // 模式 1：【伴学模式】(original · 默认)
    // 彻底非阻塞 (0ms 立即放行原始输入)，后台异步渲染语感伴学卡片 (slots)
    // =========================================================================
    if (state.mode === "original") {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget("lingual_hud", undefined);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⇄ [lingual] polishing..."));
        } catch {}
      }

      clearTimeout(polishTimer);
      polishTimer = setTimeout(() => {
        polishTimer = undefined;
        if (!session.isLatest(generation) || state.mode !== "original" || signal.aborted) {
          return;
        }

        translatePrompt(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          labels: state.labels,
          slots: state.slots,
          slotPreset: state.slotPreset,
          complete: completer,
          signal,
        })
          .then((result) => {
            if (!session.isLatest(generation) || state.mode !== "original" || signal.aborted) {
              return;
            }
            if (result) {
              session.setPageResult(0, result, generation);
              const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
              if (activeCtx) {
                renderHudWidget(
                  activeCtx,
                  result.sourceText,
                  result.spoken,
                  result.written,
                  result.vocab,
                  result.spokenMeaning,
                  result.writtenMeaning,
                  undefined,
                  result.slotOutputs,
                  result.slots
                );
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            if (session.isLatest(generation)) {
              const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
              if (activeCtx) {
                updateFooter(activeCtx);
              }
            }
          });
      }, 80);

      return { action: "continue" };
    }

    // =========================================================================
    // 模式 3：【多风格候选填入模式】(select · N-Choice Interactive Selector)
    // 生成 N 个预设风格的优化提示词候选（默认：极简高效 / 结构规范 / 深度严谨），供用户选择一个填入
    // =========================================================================
    if (state.mode === "select") {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget(
            "lingual_hud",
            [ctx.ui.theme.fg("muted", "  ⋯ ✦ [lingual] generating prompt candidates...")],
            { placement: "aboveEditor" }
          );
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "✦ [lingual] generating candidates..."));
        } catch {}
      }

      try {
        const candidates = await generatePromptCandidates(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          promptLang: state.promptLang || undefined,
          promptRule: state.promptRule || undefined,
          promptSlots: state.promptSlots,
          learnInRewrite: state.learnInRewrite,
          complete: completer,
          signal,
        });

        if (!session.isLatest(generation) || !candidates || candidates.length === 0) {
          if (hasActiveUI(ctx)) safeClearWidget(ctx);
          return { action: "continue" };
        }

        const maxCols = getEffectiveMaxCols();
        const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " ↵ ");
        const candidateVocab = state.learnInRewrite ? candidates[0]?.vocab : undefined;
        const candidateSlotResults: SlotResult[] = [
          { id: "source", label: state.labels.sourceLabel || "原文", role: "source", content: singleLineSource },
          ...candidates.map((c, idx) => ({
            id: c.id,
            label: `${idx + 1}:${c.label}`,
            role: "translation" as const,
            content: c.content.replace(/\s*\r?\n\s*/g, " ↵ "),
          })),
          ...(candidateVocab
            ? [{ id: "vocab", label: state.labels.vocabLabel || "重点", role: "vocab" as const, content: candidateVocab }]
            : []),
        ];
        session.setPageResult(
          0,
          {
            sourceText: singleLineSource,
            spoken: candidates[0].content.replace(/\s*\r?\n\s*/g, " ↵ "),
            written: candidates[1]?.content.replace(/\s*\r?\n\s*/g, " ↵ ") || "",
            vocab: candidateVocab,
            annotated: "",
            slots: candidateSlotResults,
          },
          generation
        );

        if (hasActiveUI(ctx)) {
          const previewLines: string[] = [
            truncateVisual(
              `  ${ctx.ui.theme.fg("muted", `· [${state.labels.sourceLabel || "原文"}]`)} ${singleLineSource}`,
              maxCols
            ),
          ];
          const sliced = candidates.slice(0, 6);
          sliced.forEach((c, idx, arr) => {
            const isLastRow = idx === arr.length - 1 && !candidateVocab;
            const branch = idx === 0 ? "┌" : isLastRow ? "└" : "├";
            const oneLineContent = c.content.replace(/\s*\r?\n\s*/g, " ↵ ");
            previewLines.push(
              truncateVisual(
                `  ${ctx.ui.theme.fg("accent", `${branch} [${idx + 1}:${c.label}]`)} ${oneLineContent}`,
                maxCols
              )
            );
          });
          if (candidateVocab) {
            previewLines.push(
              truncateVisual(
                `  ${ctx.ui.theme.fg("dim", `└ [${state.labels.vocabLabel || "重点"}]`)} ${candidateVocab}`,
                maxCols
              )
            );
          }
          try {
            ctx.ui.setWidget("lingual_hud", previewLines, { placement: "aboveEditor" });
          } catch {}
        }

        let chosenText = candidates[0].content;
        if (hasActiveUI(ctx) && typeof (ctx.ui as any).select === "function") {
          const langCode = (state.sourceLang || "zh").toLowerCase().split("-")[0];
          const selectPrompts: Record<string, { title: string; keepOrig: string }> = {
            zh: { title: "✦ 选择要发送给 AI 的优化提示词：", keepOrig: "保持原话直发" },
            tw: { title: "✦ 選擇要發送給 AI 的優化提示詞：", keepOrig: "保持原話直發" },
            ja: { title: "✦ AI に送信する最適化プロンプトを選択：", keepOrig: "原文のまま送信" },
            ko: { title: "✦ AI에게 보낼 최적화된 프롬프트 선택:", keepOrig: "원문 그대로 전송" },
            es: { title: "✦ Seleccione el prompt optimizado para enviar:", keepOrig: "Enviar original" },
            fr: { title: "✦ Sélectionnez le prompt optimisé à envoyer :", keepOrig: "Envoyer l'original" },
            de: { title: "✦ Optimierten Prompt zum Senden auswählen:", keepOrig: "Original senden" },
            ru: { title: "✦ Выберите оптимизированный промпт для отправки:", keepOrig: "Отправить оригинал" },
            en: { title: "✦ Select optimized prompt to send:", keepOrig: "Send original" },
          };
          const sp = selectPrompts[langCode] || selectPrompts.en;
          const optMaxCols = Math.max(20, maxCols - 18);

          const optionLabels = [
            ...candidates.map((c, idx) => `[${idx + 1}] ${c.label}: ${truncateVisual(c.content.replace(/\s*\r?\n\s*/g, " ↵ "), optMaxCols)}`),
            `[0] ${sp.keepOrig}: ${truncateVisual(singleLineSource, optMaxCols)}`,
          ];
          const picked = await (ctx.ui as any).select(sp.title, optionLabels);
          // Pressing Esc (picked === undefined) or choosing [0] passes original prompt through without forcing Candidate #1
          if (!picked || picked.startsWith("[0]")) {
            return { action: "continue" };
          }
          const idxMatch = picked.match(/^\[(\d+)\]/);
          if (idxMatch) {
            const idx = parseInt(idxMatch[1], 10) - 1;
            if (candidates[idx]) {
              chosenText = candidates[idx].content;
            }
          }
        }

        let finalText = sanitized.rawPayload
          ? `${chosenText}\n\n${sanitized.rawPayload}`
          : chosenText;

        const diskConfig = loadUserLingualConfig();
        const effectiveOutLang = (state.promptLang || state.targetLang || "en").toLowerCase().split("-")[0];
        if (
          effectiveOutLang !== state.sourceLang &&
          shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)
        ) {
          finalText += formatNativeReplyGuardHint(state.sourceLang);
        }

        return {
          action: "transform",
          text: finalText,
          images: event.images,
        };
      } catch {
        if (hasActiveUI(ctx)) safeClearWidget(ctx);
        return { action: "continue" };
      } finally {
        if (session.isLatest(generation) && hasActiveUI(ctx)) {
          updateFooter(ctx);
        }
      }
    }

    // =========================================================================
    // 模式 2：【直出重写模式】(english · Direct Prompt Rewrite)
    // 不生成背单词伴学卡，100% 专注将杂乱输入直接重写为结构化、规范化、高效率提示词（默认英文，可切母语与叠加要求）
    // =========================================================================
    if (hasActiveUI(ctx)) {
      try {
        ctx.ui.setWidget(
          "lingual_hud",
          [ctx.ui.theme.fg("muted", "  ⋯ ⚡ [lingual] optimizing prompt...")],
          { placement: "aboveEditor" }
        );
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⚡ [lingual] optimizing..."));
      } catch {}
    }

    try {
      const rewriteDetail = await rewritePromptDirectWithDetails(promptToTranslate, {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        promptLang: state.promptLang || undefined,
        promptRule: state.promptRule || undefined,
        learnInRewrite: state.learnInRewrite,
        complete: completer,
        signal,
      });

      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }

      if (!rewriteDetail || !rewriteDetail.prompt) {
        if (hasActiveUI(ctx)) {
          try {
            ctx.ui.setWidget("lingual_hud", undefined);
            const timeoutTemplate = state.labels.notifyTimeout || "[{pair}] Prompt rewrite timed out or not ready; original prompt passed";
            ctx.ui.notify(timeoutTemplate.replace("{pair}", state.labels.hudTitle), "warning");
          } catch {}
        }
        return { action: "continue" };
      }

      const rewritten = rewriteDetail.prompt;
      const rewriteVocab = state.learnInRewrite ? rewriteDetail.vocab : undefined;

      // 展示「原话 vs 重写后的新提示词」（若开启 learnInRewrite 则顺带展示一行重点词），并同步至 session
      const outLang = (state.promptLang || state.targetLang || "en").toLowerCase().split("-")[0];
      const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " ↵ ");
      const singleLineRewritten = rewritten.replace(/\s*\r?\n\s*/g, " ↵ ");
      session.setPageResult(
        0,
        {
          sourceText: singleLineSource,
          spoken: singleLineRewritten,
          written: "",
          vocab: rewriteVocab,
          annotated: "",
          slots: [
            { id: "source", label: state.labels.sourceLabel || "原文", role: "source", content: singleLineSource },
            { id: "rewritten", label: `⚡${outLang.toUpperCase()}`, role: "translation", content: singleLineRewritten },
            ...(rewriteVocab
              ? [{ id: "vocab", label: state.labels.vocabLabel || "重点", role: "vocab" as const, content: rewriteVocab }]
              : []),
          ],
        },
        generation
      );

      if (hasActiveUI(ctx)) {
        try {
          const maxCols = getEffectiveMaxCols();
          const rewriteBranch = rewriteVocab ? "┌" : "└";
          const previewLines = [
            truncateVisual(
              `  ${ctx.ui.theme.fg("muted", `· [${state.labels.sourceLabel || "原文"}]`)} ${singleLineSource}`,
              maxCols
            ),
            truncateVisual(
              `  ${ctx.ui.theme.fg("accent", `${rewriteBranch} [⚡${outLang.toUpperCase()}]`)} ${singleLineRewritten}`,
              maxCols
            ),
          ];
          if (rewriteVocab) {
            previewLines.push(
              truncateVisual(
                `  ${ctx.ui.theme.fg("dim", `└ [${state.labels.vocabLabel || "重点"}]`)} ${rewriteVocab}`,
                maxCols
              )
            );
          }
          ctx.ui.setWidget("lingual_hud", previewLines, { placement: "aboveEditor" });
        } catch {}
      }

      let finalText = sanitized.rawPayload
        ? `${rewritten}\n\n${sanitized.rawPayload}`
        : rewritten;

      const diskConfig = loadUserLingualConfig();
      if (
        outLang !== state.sourceLang &&
        shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)
      ) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }

      return {
        action: "transform",
        text: finalText,
        images: event.images,
      };
    } catch {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget("lingual_hud", undefined);
          const errTemplate = state.labels.notifyError || "[{pair}] Prompt rewrite error; original prompt passed";
          ctx.ui.notify(errTemplate.replace("{pair}", state.labels.hudTitle), "warning");
        } catch {}
      }
      return { action: "continue" };
    } finally {
      if (session.isLatest(generation)) {
        const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
        if (activeCtx) {
          updateFooter(activeCtx);
        }
      }
    }
  });
}
