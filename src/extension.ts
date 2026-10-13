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
import {
  getEffectiveMaxCols,
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
} from "./layout.js";
import {
  translatePrompt,
  rewritePromptDirect,
  generatePromptCandidates,
  stripLingualContextWhenOff,
  formatReleaseBannerLines,
  resolveReleaseBannerLang,
  resolveModeDisplaySpec,
  normalizeLingualModeInput,
  CURRENT_FEATURE_BANNER_VERSION,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
  resolveDirectSlotsFromConfig,
  resolveCandidateSlotsFromConfig,
  resolveModifySlotsFromConfig,
  shouldTriggerTranslation,
  isTestEnvironment,
  loadUserLingualConfig,
  saveUserLingualConfig,
  shouldInjectNativeReplyGuard,
  formatNativeReplyGuardHint,
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
  modeLocked: boolean;
  compact: boolean;
  sourceLang: string;
  targetLang: string;
  selectedModel: string;
  slotPreset: string;
  slots: SlotConfig[];
  directSlots: PromptSlotConfig[];
  promptSlots: PromptSlotConfig[];
  modifySlots: PromptSlotConfig[];
  labels: LingualI18nLabels;
}

const initialDiskConfig = isTestEnvironment() ? {} : loadUserLingualConfig();
const initialSourceLang = initialDiskConfig.sourceLang || (isTestEnvironment() ? "en" : resolveReleaseBannerLang());
const initialTargetLang = initialDiskConfig.targetLang || (initialSourceLang === "en" ? "ja" : "en");
const initialSlotPreset = initialDiskConfig.slotPreset;
const initialSlots = Array.isArray(initialDiskConfig.slots) && initialDiskConfig.slots.length > 0
  ? initialDiskConfig.slots
  : (initialSlotPreset ? resolveSlotsForPreset(initialSlotPreset, initialSourceLang) : getDefaultSlots(initialSourceLang));
const initialDirectSlots = Array.isArray(initialDiskConfig.directSlots) && initialDiskConfig.directSlots.length > 0
  ? initialDiskConfig.directSlots
  : getDefaultDirectSlots(initialSourceLang);
const initialPromptSlots = Array.isArray(initialDiskConfig.promptSlots) && initialDiskConfig.promptSlots.length > 0
  ? initialDiskConfig.promptSlots
  : getDefaultPromptSlots(initialSourceLang);
const initialModifySlots = Array.isArray(initialDiskConfig.modifySlots) && initialDiskConfig.modifySlots.length > 0
  ? initialDiskConfig.modifySlots
  : getDefaultModifySlots(initialSourceLang);
const initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);

const state: ExtensionState = {
  mode: initialDiskConfig.mode || "original",
  modeLocked: Boolean(initialDiskConfig.modeLocked),
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  selectedModel: initialDiskConfig.selectedModel || "auto",
  slotPreset: initialSlotPreset || "",
  slots: initialSlots,
  directSlots: initialDirectSlots,
  promptSlots: initialPromptSlots,
  modifySlots: initialModifySlots,
  labels: initialLabels,
};

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

    const modeSpec = resolveModeDisplaySpec(state.sourceLang);

    switch (state.mode) {
      case "original":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${modeSpec.companion}`));
        break;
      case "english":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${modeSpec.direct}`));
        break;
      case "select":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${modeSpec.candidates}`));
        break;
      case "modify":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${modeSpec.modify}`));
        break;
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
        maxLines: Math.max(9, (slots?.length || state.slots?.length || 0) + 1),
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
    if (diskCfg.slots && Array.isArray(diskCfg.slots) && diskCfg.slots.length > 0) {
      state.slots = diskCfg.slots;
    }
    if (diskCfg.directSlots && Array.isArray(diskCfg.directSlots) && diskCfg.directSlots.length > 0) {
      state.directSlots = diskCfg.directSlots;
    }
    if (diskCfg.promptSlots && Array.isArray(diskCfg.promptSlots) && diskCfg.promptSlots.length > 0) {
      state.promptSlots = diskCfg.promptSlots;
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
    const trimmed = args?.trim() || "";
    const explicitMode = normalizeLingualModeInput(trimmed);
    let nextMode: LingualMode;

    if (explicitMode) {
      nextMode = explicitMode;
    } else {
      // 检查当前模式是否已被锁定
      if (state.modeLocked) {
        const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
        const modeSpec = resolveModeDisplaySpec(state.sourceLang);
        const currentName =
          state.mode === "original"
            ? modeSpec.companion
            : state.mode === "english"
              ? modeSpec.direct
              : state.mode === "select"
                ? modeSpec.candidates
                : modeSpec.off;
        try {
          ctx.ui.notify(
            `[${pair}] 当前模式已锁定在 [${currentName}]。如需轮转，请先输入 /lingual unlock 解锁，或使用 /lingual 1|2|3|0 显式指定。`,
            "warning"
          );
        } catch {}
        return;
      }

      // 缺省或无参数时，平滑五态模式循环轮转 (1.纯伴学 ➔ 2.直接改 ➔ 3.挑候选 ➔ 4.原句修补 ➔ 0.已关闭)
      nextMode =
        state.mode === "original"
          ? "english"
          : state.mode === "english"
            ? "select"
            : state.mode === "select"
              ? "modify"
              : state.mode === "modify"
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

    const modeSpec = resolveModeDisplaySpec(state.sourceLang);
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    const diskForMode = loadUserLingualConfig();
    const activeDirectSlots = resolveDirectSlotsFromConfig({
      sourceLang: state.sourceLang,
      directSlots: diskForMode.directSlots ?? state.directSlots,
    }).filter((s) => s.enabled !== false && s.role !== "vocab");
    const activeCandidateSlots = resolveCandidateSlotsFromConfig({
      sourceLang: state.sourceLang,
      promptSlots: diskForMode.promptSlots ?? state.promptSlots,
    }).filter((s) => s.enabled !== false && s.role !== "vocab");

    if (nextMode === "english") {
      const firstLabel = activeDirectSlots[0]?.label || "Direct";
      try {
        ctx.ui.notify(modeSpec.notifyDirect(pair, firstLabel), "info");
      } catch {}
    } else if (nextMode === "select") {
      const slotLabels = activeCandidateSlots.map((s) => s.label).join(" / ");
      try {
        ctx.ui.notify(modeSpec.notifyCandidates(pair, slotLabels), "info");
      } catch {}
    } else if (nextMode === "modify") {
      const activeModifySlots = resolveModifySlotsFromConfig({
        sourceLang: state.sourceLang,
        modifySlots: diskForMode.modifySlots ?? state.modifySlots,
      }).filter((s) => s.enabled !== false && s.role !== "vocab");
      const firstLabel = activeModifySlots[0]?.label || "Fixed";
      try {
        ctx.ui.notify(modeSpec.notifyModify(pair, firstLabel), "info");
      } catch {}
    } else if (nextMode === "off") {
      try {
        ctx.ui.notify(modeSpec.notifyOff(pair), "info");
      } catch {}
    } else {
      try {
        ctx.ui.notify(modeSpec.notifyCompanion(pair), "info");
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
      const flowText = `${state.sourceLang} ➔ ${state.targetLang}`;
      ctx.ui.notify(
        `[当前伴学语言: ${flowText}]\n• 常用切换: /lang ja (切换目标为日语) · /lang en (切换目标为英语)\n• 双向切换: /lang zh ja · /lang ja en · /lang en zh\n• 支持语种: zh (中文), ja (日语), ko (韩语), en (英语), es (西语), fr (法语), de (德语), ru (俄语)`,
        "info"
      );
      return;
    }

    const parts = trimmed.split(/\s*->\s*|\s*➔\s*|\s+to\s+|\s+/).filter(Boolean);
    let newSource = state.sourceLang;
    let newTarget = state.targetLang;

    if (parts.length === 1) {
      const code = normalizeLangCode(parts[0]);
      if (!LANGUAGE_PRESETS[code]) {
        ctx.ui.notify(
          state.labels.notifyLangInvalid || "Invalid language code. Supported: zh, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
      if (code === state.sourceLang) {
        newTarget = code === "en" ? "ja" : "en";
      } else {
        // 开发者最常见意图：保持当前母语不变，直接切换学习/翻译的目标语（如 /lang ja）！
        newTarget = code;
      }
    } else {
      newSource = normalizeLangCode(parts[0]);
      newTarget = normalizeLangCode(parts[1]);
      if (!LANGUAGE_PRESETS[newSource]) {
        ctx.ui.notify(
          state.labels.notifyLangInvalid || "Invalid language code. Supported: zh, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
    }

    const diskBeforeSwitch = loadUserLingualConfig();
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
        return match
          ? {
              ...match,
              enabled: s.enabled,
              showMeaning: s.showMeaning,
              ...(s.instruction ? { instruction: s.instruction } : {}),
            }
          : s;
      });
    }
    // Only reset directSlots / promptSlots to newSource defaults if user has NOT customized them on disk
    if (!diskBeforeSwitch.directSlots || diskBeforeSwitch.directSlots.length === 0) {
      state.directSlots = getDefaultDirectSlots(newSource);
    }
    if (!diskBeforeSwitch.promptSlots || diskBeforeSwitch.promptSlots.length === 0) {
      state.promptSlots = getDefaultPromptSlots(newSource);
    }
    saveUserLingualConfig({
      sourceLang: newSource,
      targetLang: newTarget,
      slots: state.slots,
      directSlots: state.directSlots,
      promptSlots: state.promptSlots,
    });
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

    // 1. 无参数或 "list": 查看当前所有槽位状态与管理帮助（清晰隔离展示 Mode 1 slots、Mode 2 directSlots、Mode 3 promptSlots）
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

      const dSlots = state.directSlots || getDefaultDirectSlots(state.sourceLang);
      const dLines = dSlots.map((s, idx) => {
        const status = s.enabled !== false
          ? (lbl.slotsStatusEnabled || "enabled")
          : (lbl.slotsStatusDisabled || "disabled");
        const roleTag = s.role === "vocab" ? "vocab" : "direct 1-to-1";
        const inst = s.instruction ? ` // ${s.instruction.slice(0, 45)}...` : "";
        return `  ${idx + 1}. [${s.id}] "${s.label}" (${roleTag}, ${status})${inst}`;
      });

      const pSlots = state.promptSlots || getDefaultPromptSlots(state.sourceLang);
      const pLines = pSlots.map((s, idx) => {
        const status = s.enabled !== false
          ? (lbl.slotsStatusEnabled || "enabled")
          : (lbl.slotsStatusDisabled || "disabled");
        const roleTag = s.role === "vocab" ? "vocab" : `candidate #${idx + 1}`;
        const inst = s.instruction ? ` // ${s.instruction.slice(0, 45)}...` : "";
        return `  ${idx + 1}. [${s.id}] "${s.label}" (${roleTag}, ${status})${inst}`;
      });

      const enabledCount = slots.filter((s) => s.enabled).length;
      const modeSpec = resolveModeDisplaySpec(state.sourceLang);
      const header = `⇄ [${lbl.hudTitle}] ${lbl.slotsHeader || "Dynamic Slots"} [1 ${modeSpec.companion} · slots] (${enabledCount}/${slots.length} ${lbl.slotsActiveTag || "active"}):\n`;
      const body = lines.length > 0 ? lines.join("\n") : `  (${lbl.slotsNone || "No slots configured"})`;
      const dHeader = `\n\n⚡ [2 ${modeSpec.direct} · directSlots]:\n`;
      const dBody = dLines.join("\n");
      const pHeader = `\n\n✦ [3 ${modeSpec.candidates} · promptSlots]:\n`;
      const pBody = pLines.join("\n");
      const nlTitle = lbl.slotsNlTitle ? `\n\n${lbl.slotsNlTitle}\n` : "";
      const nlExamples = (lbl.slotsNlExamples || []).map((ex) => `  ${ex}`).join("\n");
      const cliTitle = lbl.slotsCliTitle ? `\n\n${lbl.slotsCliTitle}\n` : "";
      const cliHelp = (lbl.slotsCliHelp || []).map((cmd) => `  ${cmd}`).join("\n");

      const help = `${header}${body}${dHeader}${dBody}${pHeader}${pBody}${nlTitle}${nlExamples}${cliTitle}${cliHelp}`;
      ctx.ui.notify(help, "info");
      return;
    }

    // 2. "/slots reset": 恢复开箱即用默认初始槽位 (同时清理三套独立模式槽位)
    if (subCmd === "reset") {
      state.slots = getDefaultSlots(state.sourceLang);
      state.directSlots = getDefaultDirectSlots(state.sourceLang);
      state.promptSlots = getDefaultPromptSlots(state.sourceLang);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: undefined, directSlots: undefined, promptSlots: undefined, slotPreset: undefined });
      globalLingualCache.clear();
      const resetMsg = (lbl.slotsResetSuccess || "⇄ [{pair}] Reset slots to clean defaults").replace("{pair}", lbl.hudTitle);
      ctx.ui.notify(resetMsg, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 2.1 "/slots hide-source" & "/slots show-source": 架构师极速开关原文行快捷指令
    if (subCmd === "hide-source" || subCmd === "no-source") {
      state.slots = removeSlotFromList(state.slots || [], "source");
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: undefined });
      globalLingualCache.clear();
      ctx.ui.notify(`[${lbl.hudTitle}] Hidden [source] row on companion cards`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "show-source" || subCmd === "with-source") {
      const hasSource = (state.slots || []).some((s) => s.role === "source");
      if (!hasSource) {
        const defaultSource = getDefaultSlots(state.sourceLang).find((s) => s.role === "source") || {
          id: "source",
          label: lbl.sourceLabel || "Original",
          role: "source" as const,
          enabled: true,
        };
        state.slots = [{ ...defaultSource, enabled: true }, ...(state.slots || [])];
      } else {
        state.slots = (state.slots || []).map((s) => (s.role === "source" ? { ...s, enabled: true } : s));
      }
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: undefined });
      globalLingualCache.clear();
      ctx.ui.notify(`[${lbl.hudTitle}] Restored [source] row on companion cards`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    const parseModeScope = (token = ""): "companion" | "direct" | "candidates" | null => {
      const t = token.toLowerCase();
      if (t === "1" || t === "companion" || t === "slots") return "companion";
      if (t === "2" || t === "direct" || t === "directslots") return "direct";
      if (t === "3" || t === "candidates" || t === "prompt" || t === "promptslots" || t === "select") return "candidates";
      return null;
    };

    const PROMPT_SCOPE_SPEC = {
      direct: {
        stateKey: "directSlots" as const,
        tag: "Mode 2 directSlots",
        getList: () => state.directSlots || getDefaultDirectSlots(state.sourceLang),
        setList: (next: PromptSlotConfig[]) => {
          state.directSlots = next;
          saveUserLingualConfig({ directSlots: next });
          globalLingualCache.clear();
        },
      },
      candidates: {
        stateKey: "promptSlots" as const,
        tag: "Mode 3 promptSlots",
        getList: () => state.promptSlots || getDefaultPromptSlots(state.sourceLang),
        setList: (next: PromptSlotConfig[]) => {
          state.promptSlots = next;
          saveUserLingualConfig({ promptSlots: next });
          globalLingualCache.clear();
        },
      },
    };

    // 3. "/slots rm [mode] <id>": 彻底删除指定模式的槽位（三模式严格物理隔离）
    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del") {
      const maybeScope = parseModeScope(parts[1]);
      const scope = maybeScope || "companion";
      const targetId = (maybeScope ? parts[2] || "" : parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageRm || "Usage: /slots rm [1|2|3|direct|candidates] <slot-id>", "warning");
        return;
      }
      if (scope === "direct" || scope === "candidates") {
        const spec = PROMPT_SCOPE_SPEC[scope];
        const list = spec.getList();
        const existing = list.find((s) => s.id.toLowerCase() === targetId);
        if (!existing) {
          ctx.ui.notify((lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", lbl.hudTitle).replace("{id}", targetId), "warning");
          return;
        }
        spec.setList(list.filter((s) => s.id.toLowerCase() !== targetId));
        ctx.ui.notify(`[${lbl.hudTitle}] [${spec.tag}] Removed slot [${targetId}] ("${existing.label}")`, "info");
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

    // 4. "/slots toggle [mode] <id>": 一键开关指定模式的槽位（三模式严格物理隔离）
    if (subCmd === "toggle") {
      const maybeScope = parseModeScope(parts[1]);
      const scope = maybeScope || "companion";
      const targetId = (maybeScope ? parts[2] || "" : parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageToggle || "Usage: /slots toggle [1|2|3|direct|candidates] <slot-id>", "warning");
        return;
      }
      if (scope === "direct" || scope === "candidates") {
        const spec = PROMPT_SCOPE_SPEC[scope];
        const list = spec.getList();
        const existing = list.find((s) => s.id.toLowerCase() === targetId);
        if (!existing) {
          ctx.ui.notify((lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", lbl.hudTitle).replace("{id}", targetId), "warning");
          return;
        }
        const updatedList = list.map((s) => (s.id.toLowerCase() === targetId ? { ...s, enabled: s.enabled === false } : s));
        spec.setList(updatedList);
        const updated = updatedList.find((s) => s.id.toLowerCase() === targetId);
        const statusText = updated?.enabled !== false
          ? (lbl.slotsStatusEnabled || "enabled")
          : (lbl.slotsStatusDisabled || "disabled");
        ctx.ui.notify(`[${lbl.hudTitle}] [${scope}] Slot [${targetId}] is now ${statusText}`, "info");
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

    // 5. "/slots add [mode] <id> <label> [instruction...]": 动态添加或修改指定模式的槽位（三模式严格物理隔离）
    if (subCmd === "add") {
      const maybeScope = parseModeScope(parts[1]);
      const scope = maybeScope || "companion";
      const offset = maybeScope ? 1 : 0;
      const id = (parts[1 + offset] || "").toLowerCase();
      const label = parts[2 + offset];
      const instruction = parts.slice(3 + offset).join(" ");
      if (!id || !label) {
        ctx.ui.notify(lbl.slotsUsageAdd || "Usage: /slots add [1|2|3|direct|candidates] <id> <label> [instruction...]", "warning");
        return;
      }
      if (scope === "direct" || scope === "candidates") {
        const spec = PROMPT_SCOPE_SPEC[scope];
        const list = spec.getList();
        const newPromptSlot: PromptSlotConfig = {
          id,
          label,
          role: id === "vocab" ? "vocab" : "rewrite",
          instruction: instruction || `Translate 100% faithfully and naturally matching "${label}" style without summarizing.`,
          enabled: true,
        };
        const idx = list.findIndex((s) => s.id.toLowerCase() === id);
        const nextList = idx >= 0
          ? list.map((s, i) => (i === idx ? newPromptSlot : s))
          : (scope === "direct" ? [newPromptSlot, ...list.filter((s) => s.role === "vocab")] : [...list, newPromptSlot]);
        spec.setList(nextList);
        const verb = scope === "direct" ? "Updated dedicated direct" : "Added/updated candidate";
        ctx.ui.notify(`[${lbl.hudTitle}] [${spec.tag}] ${verb} slot [${id}] "${label}"`, "info");
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

    const directSlotNames = (state.directSlots || getDefaultDirectSlots(state.sourceLang))
      .filter((s) => s.enabled !== false)
      .map((s) => s.label)
      .join(" / ");
    const promptSlotNames = (state.promptSlots || getDefaultPromptSlots(state.sourceLang))
      .filter((s) => s.enabled !== false)
      .map((s) => s.label)
      .join(" / ");

    const statusMsg = formatStatusReport(state.labels, {
      mode: state.mode,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      activeModel,
      layout: state.compact ? "capsule" : "tree",
      cacheStats: globalLingualCache.getStats(),
    }) +
      `\n• Mode 1 Companion Slots (slots): [${state.slotPreset || "custom"}] (${(state.slots || []).filter(s => s.enabled).map(s => s.label).join(", ")})` +
      `\n• Mode 2 Direct Slot (directSlots): [${directSlotNames}]` +
      `\n• Mode 3 Candidate Slots (promptSlots): [${promptSlotNames}]`;

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

  // Universal English baseline guide (when sendUserMessage is unavailable in headless/test mocks)
  const showAgentGuideHandler = async (_args: string, ctx: ExtensionContext) => {
    const guide =
      `  pi-lingual Customization Map          Legend: ( ) Edit  (+) Add/Remove  [✓] Toggle\n` +
      `  ──────────────────────────────────────────────────────────────────────────────────\n` +
      `  [Mode 1 · Companion]  Send raw text in 0ms, show learning card above editor\n` +
      `    · Source Row                                                        [✓] Show/Hide\n` +
      `    ├ (Label) : (Language) · (Style: Spoken / Written / Paper / Script) (+) N Rows\n` +
      `    │   ↳ Native Nuance Sub-line                                        [✓] On/Off\n` +
      `    └ Vocab Row : (Focus: Idioms / Exam Collocations)                   [✓] On/Off\n\n` +
      `  [Mode 2 · Direct]     Convert 1-to-1 on Enter using a single dedicated rule\n` +
      `    ├ (Label) : (Language) · (Style: Faithful Direct / Keigo / Spec)    1-to-1 Rule\n` +
      `    └ Vocab Row : Extract 1-line key expressions                        [✓] On/Off\n\n` +
      `  [Mode 3 · Candidates] Generate N options, press keys 1..N to send (0 for raw)\n` +
      `    · Source Row                                                        [✓] Show/Hide\n` +
      `    ├ 1..N (Label) : (Language) · (Style: Business / Keigo / PR)        (+) N Options\n` +
      `    └ Vocab Row : Extract 1-line key expressions                        [✓] On/Off\n` +
      `  ──────────────────────────────────────────────────────────────────────────────────\n` +
      `  Run /lingual tuner [request] to launch the adaptive wizard in your native language (${state.sourceLang}).`;
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

    // 1.2 子命令路由: 架构师极速开关原文行 (/lingual hide-source | /lingual show-source)
    if (sub === "hide-source" || sub === "no-source" || sub === "show-source" || sub === "with-source") {
      await switchSlotsHandler(sub, ctx);
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
      const promptBody = subArgs
        ? `[lingual-tuner] Load the lingual-tuner skill and update ~/.pi/agent/lingual.json (user native language sourceLang="${state.sourceLang}"). Communicate strictly in the user's native language (${state.sourceLang}) and apply: ${subArgs}`
        : `[lingual-tuner] Load the lingual-tuner skill and launch the interactive customization wizard (user native language sourceLang="${state.sourceLang}"). Render the Customization Map and all questions/options strictly in the user's native language (${state.sourceLang}).`;
      if ((sub === "tuner" || sub === "tune" || subArgs) && typeof (pi as any).sendMessage === "function") {
        // 使用 display: false 发送完全隐形的唤醒指令，聊天窗口零提示词刷屏污染！
        (pi as any).sendMessage(
          { customType: "lingual-tuner", content: promptBody, display: false },
          { triggerTurn: true }
        );
        return;
      }
      if ((sub === "tuner" || sub === "tune" || subArgs) && typeof (pi as any).sendUserMessage === "function") {
        (pi as any).sendUserMessage(promptBody);
        return;
      }
      await showAgentGuideHandler(subArgs, ctx);
      return;
    }

    // 6.1 子命令路由: 查看本版本新特性速览卡片 (/lingual news 或 /lingual whatsnew)
    if (sub === "news" || sub === "whatsnew" || sub === "changelog") {
      const diskCfg = loadUserLingualConfig();
      renderReleaseBanner(ctx, diskCfg.sourceLang || state.sourceLang);
      return;
    }

    // 6.2 子命令路由: 模式锁定与防漂移保护 (/lingual lock | /lingual unlock)
    if (sub === "lock") {
      state.modeLocked = true;
      saveUserLingualConfig({ modeLocked: true });
      const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
      const modeSpec = resolveModeDisplaySpec(state.sourceLang);
      const currentName =
        state.mode === "original"
          ? modeSpec.companion
          : state.mode === "english"
            ? modeSpec.direct
            : state.mode === "select"
              ? modeSpec.candidates
              : modeSpec.off;
      try {
        ctx.ui.notify(
          `[${pair}] 会话模式已锁定在 [${currentName}]。防止外部进程覆盖与无意轮转，输入 /lingual unlock 可解锁。`,
          "info"
        );
      } catch {}
      updateFooter(ctx);
      return;
    }

    if (sub === "unlock") {
      state.modeLocked = false;
      saveUserLingualConfig({ modeLocked: false });
      const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
      try {
        ctx.ui.notify(`[${pair}] 模式锁定已解除（已解锁），恢复自由轮转与外部配置同步。`, "info");
      } catch {}
      updateFooter(ctx);
      return;
    }

    // 7. 模式切换优先: 显式模式关键词或数字直达 (/lingual 1|2|3|0|companion|direct|candidates|off)
    if (sub === "mode" || normalizeLingualModeInput(sub) !== null) {
      await setModeHandler(sub === "mode" ? subArgs : trimmed, ctx);
      return;
    }

    // 8. 直接输入语言代码 (/lingual ja 或 /lingual zh ja)
    const possibleLang = normalizeLangCode(sub);
    if (LANGUAGE_PRESETS[possibleLang]) {
      await switchLangHandler(trimmed, ctx);
      return;
    }

    // 9. 未识别子命令安全防线：严禁穿透到模式轮转，避免用户打错单词意外篡改工作模式！
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    try {
      ctx.ui.notify(
        `[${pair}] 未识别的子命令: "${trimmed}"。当前模式保持不变。可用命令: /lingual [1|2|3|0|lock|unlock|tuner|lang|slots|compact|status]`,
        "warning"
      );
    } catch {}
  };

  // 核心命令矩阵：注册直觉第一公民命令 (/lingual, /lang, /tuner, /lingual-mode, /slots, /last)
  pi.registerCommand("lingual", {
    description:
      state.labels.cmdDescMode ||
      "Cycle mode (1:Companion ➔ 2:Direct ➔ 3:Candidates ➔ 4:Modify ➔ 0:Off) or manage: /lingual [1|2|3|4|0|tuner|lang|slots|compact|model|status|last]",
    handler: masterCommandHandler,
  });

  pi.registerCommand("lang", {
    description: state.labels.cmdDescLang || "Switch companion language: /lang <zh|ja|ko|en|es|fr|de|ru> [target]",
    handler: switchLangHandler,
  });

  pi.registerCommand("tuner", {
    description: "Launch lingual tuner wizard: /tuner",
    handler: (args, ctx) => masterCommandHandler(`tuner ${args}`, ctx),
  });

  pi.registerCommand("lingual-mode", {
    description: state.labels.cmdDescMode || "Set companion mode directly: /lingual-mode <1|2|3|0|companion|direct|candidates|off>",
    handler: setModeHandler,
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
    if (event.source === "extension") return { action: "continue" };

    // Sync external lingual.json updates (e.g. written by lingual-tuner skill) BEFORE checking mode === "off"
    const latestDisk = loadUserLingualConfig();
    let footerNeedsRefresh = false;
    if (latestDisk.sourceLang && latestDisk.sourceLang !== state.sourceLang) {
      state.sourceLang = latestDisk.sourceLang;
      footerNeedsRefresh = true;
    }
    if (latestDisk.targetLang && latestDisk.targetLang !== state.targetLang) {
      state.targetLang = latestDisk.targetLang;
      footerNeedsRefresh = true;
    }
    if (footerNeedsRefresh) {
      state.labels = resolveLabelsForLang(state.sourceLang, latestDisk.labels, state.targetLang);
    }
    if (latestDisk.modeLocked !== undefined && latestDisk.modeLocked !== state.modeLocked) {
      state.modeLocked = latestDisk.modeLocked;
    }
    if (latestDisk.mode && latestDisk.mode !== state.mode) {
      if (state.modeLocked) {
        // 当前模式已被锁定，物理拒绝外部磁盘修改覆盖！保持会话模式严格稳定！
      } else {
        state.mode = latestDisk.mode;
        syncResizeListener();
        footerNeedsRefresh = true;
      }
    }
    if (footerNeedsRefresh && hasActiveUI(ctx)) {
      updateFooter(ctx);
    }
    if (latestDisk.slots && Array.isArray(latestDisk.slots)) {
      state.slots = latestDisk.slots;
    }
    if (latestDisk.directSlots && Array.isArray(latestDisk.directSlots)) {
      state.directSlots = latestDisk.directSlots;
    }
    if (latestDisk.promptSlots && Array.isArray(latestDisk.promptSlots)) {
      state.promptSlots = latestDisk.promptSlots;
    }

    if (state.mode === "off") return { action: "continue" };

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
    const isPromptOptMode = state.mode === "english" || state.mode === "select" || state.mode === "modify";

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
    // 模式 2 & 3 & 4 严格隔离引擎（零跨模式串味/泄露）：
    // - 模式 2 【直接改 (direct)】：严格只读取 `directSlots`
    // - 模式 3 【挑候选 (candidates)】：严格只读取 `promptSlots`
    // - 模式 4 【原句修补 (modify)】：严格只读取 `modifySlots`（Smallest Working Diff 极简原句修正）
    // =========================================================================
    const isModifyMode = state.mode === "modify";
    const isDirectMode = state.mode === "english";
    const isolatedModeSlots = isModifyMode
      ? resolveModifySlotsFromConfig({
          sourceLang: state.sourceLang,
          explainLang: latestDisk.explainLang,
          modifySlots: latestDisk.modifySlots ?? state.modifySlots,
        })
      : isDirectMode
        ? resolveDirectSlotsFromConfig({
            sourceLang: state.sourceLang,
            directSlots: latestDisk.directSlots ?? state.directSlots,
          })
        : resolveCandidateSlotsFromConfig({
            sourceLang: state.sourceLang,
            promptSlots: latestDisk.promptSlots ?? state.promptSlots,
          });

    const rewriteSlots = isolatedModeSlots.filter((s) => s.role !== "vocab");
    const vocabSlots = isolatedModeSlots.filter((s) => s.role === "vocab");
    const fallbackFirst = isModifyMode
      ? getDefaultModifySlots(state.sourceLang, latestDisk.explainLang)[0]
      : getDefaultDirectSlots(state.sourceLang)[0];
    const slotsToRun = isModifyMode
      ? (isolatedModeSlots.length > 0 ? isolatedModeSlots : getDefaultModifySlots(state.sourceLang, latestDisk.explainLang))
      : isDirectMode
        ? [rewriteSlots[0] || fallbackFirst, ...vocabSlots]
        : [...(rewriteSlots.length > 0 ? rewriteSlots : getDefaultPromptSlots(state.sourceLang)), ...vocabSlots];

    if (hasActiveUI(ctx)) {
      try {
        const loadingMsg = isModifyMode
          ? "  ⋯ ⚡ [lingual] fixing syntax & typos..."
          : isDirectMode
            ? "  ⋯ ⚡ [lingual] optimizing prompt..."
            : "  ⋯ ✦ [lingual] generating prompt candidates...";
        ctx.ui.setWidget("lingual_hud", [ctx.ui.theme.fg("muted", loadingMsg)], { placement: "aboveEditor" });
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", isModifyMode ? "⚡ [lingual] fixing..." : isDirectMode ? "⚡ [lingual] optimizing..." : "✦ [lingual] generating candidates..."));
      } catch {}
    }

    try {
      const candidates = await generatePromptCandidates(promptToTranslate, {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        explainLang: latestDisk.explainLang,
        promptSlots: slotsToRun,
        complete: completer,
        signal,
      });

      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }

      if (!candidates || candidates.length === 0) {
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          if (isDirectMode) {
            try {
              const timeoutTemplate = state.labels.notifyTimeout || "[{pair}] Prompt rewrite timed out or not ready; original prompt passed";
              ctx.ui.notify(timeoutTemplate.replace("{pair}", state.labels.hudTitle), "warning");
            } catch {}
          }
        }
        return { action: "continue" };
      }

      const maxCols = getEffectiveMaxCols();
      const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " ↵ ");
      const candidateVocab = candidates[0]?.vocab;
      const isLongModifyInput = isModifyMode && (promptToTranslate.length > 120 || (promptToTranslate.match(/[.!?。！？\n]/g) || []).length >= 3);
      const keepSourceRow = !isModifyMode && (state.slots || []).some((s) => s.role === "source" && s.enabled !== false);
      const takeawayLabel = isModifyMode
        ? (slotsToRun.find((s) => s.role === "vocab")?.label || "Takeaway")
        : (state.labels.vocabLabel || "Vocab");

      // Mode 4 体验物理学：
      // 1. 原文行彻底不显示（用户刚刚敲完，绝不占高复读）
      // 2. 长句/段落：自适应折叠改版全文（已直发 Agent），HUD 仅显示 100% 绝对保留的 Takeaway 核心盲点复盘！
      // 3. 短句：呈现 [Fixed] 改版 + [Takeaway] 核心盲点！
      const candidateSlotResults: SlotResult[] = [
        ...(keepSourceRow
          ? [{ id: "source", label: state.labels.sourceLabel || "Original", role: "source" as const, content: singleLineSource }]
          : []),
        ...(!isLongModifyInput
          ? candidates.map((c, idx) => ({
              id: c.id,
              label: isModifyMode ? c.label : isDirectMode ? `⚡${c.label}` : `${idx + 1}:${c.label}`,
              role: "translation" as const,
              content: c.content.replace(/\s*\r?\n\s*/g, " ↵ "),
            }))
          : []),
        ...(candidateVocab
          ? [{ id: "vocab", label: takeawayLabel, role: "vocab" as const, content: candidateVocab }]
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
        // 使用完整 9 行盒模型排版引擎渲染上方卡片（支持自动悬挂缩进折行，拒绝单行粗暴截断！）
        const layoutSlots: SlotConfig[] = candidateSlotResults.map((sr) => ({
          id: sr.id,
          label: sr.label,
          role: sr.role,
          showMeaning: false,
          enabled: true,
        }));
        const cardLines = renderCardLayout(
          {
            sourceText: singleLineSource,
            spoken: candidates[0].content.replace(/\s*\r?\n\s*/g, " ↵ "),
            written: candidates[1]?.content.replace(/\s*\r?\n\s*/g, " ↵ ") || "",
            vocab: candidateVocab,
            annotated: "",
            slots: candidateSlotResults,
          },
          state.labels,
          {
            maxCols,
            maxLines: Math.max(9, candidateSlotResults.length + 1),
            isCompact: state.compact,
            slots: layoutSlots,
            themeDecorators: {
              muted: (s: string) => ctx.ui.theme.fg("muted", s),
              accent: (s: string) => ctx.ui.theme.fg("accent", s),
              dim: (s: string) => ctx.ui.theme.fg("dim", s),
            },
          }
        );
        try {
          ctx.ui.setWidget("lingual_hud", cardLines, { placement: "aboveEditor" });
        } catch {}
      }

      const isDirectOrModify = isDirectMode || isModifyMode;
      let chosenText = candidates[0].content;
      if (isModifyMode) {
        const fixedCandidate = candidates.find((c) => c.id === "fixed");
        if (fixedCandidate) {
          chosenText = fixedCandidate.content;
        }
      }

      if (!isDirectOrModify && hasActiveUI(ctx)) {
        const langCode = (state.sourceLang || "en").toLowerCase().split("-")[0];
        const selectPrompts: Record<string, { title: string; keepOrig: string; hint: string }> = {
          zh: {
            title: "✦ 挑候选发送",
            keepOrig: "原话直发",
            hint: `按数字 1-${candidates.length} 直接发出 · ←→/↑↓ 切换 Enter 确认 · 0/Esc 发原话`,
          },
          tw: {
            title: "✦ 挑候選發送",
            keepOrig: "原話直發",
            hint: `按數字 1-${candidates.length} 直接發出 · ←→/↑↓ 切換 Enter 確認 · 0/Esc 發原話`,
          },
          ja: {
            title: "✦ 候補を選んで送信",
            keepOrig: "原文のまま",
            hint: `数字 1-${candidates.length} で即送信 · ←→/↑↓ 選択 Enter 確定 · 0/Esc 原文送信`,
          },
          ko: {
            title: "✦ 후보 선택 전송",
            keepOrig: "원문 그대로",
            hint: `숫자 1-${candidates.length} 즉시 전송 · ←→/↑↓ 이동 Enter 확인 · 0/Esc 원문 전송`,
          },
          es: {
            title: "✦ Elegir opción",
            keepOrig: "Original",
            hint: `1-${candidates.length} enviar · ←→/↑↓ Enter · 0/Esc original`,
          },
          fr: {
            title: "✦ Choisir option",
            keepOrig: "Original",
            hint: `1-${candidates.length} envoyer · ←→/↑↓ Entrée · 0/Esc original`,
          },
          de: {
            title: "✦ Option senden",
            keepOrig: "Original",
            hint: `1-${candidates.length} senden · ←→/↑↓ Enter · 0/Esc Original`,
          },
          ru: {
            title: "✦ Выбор варианта",
            keepOrig: "Оригинал",
            hint: `1-${candidates.length} сразу · ←→/↑↓ Enter · 0/Esc оригинал`,
          },
          en: {
            title: "✦ Pick candidate",
            keepOrig: "Send original",
            hint: `1-${candidates.length} send · ←→/↑↓ Enter · 0/Esc original`,
          },
        };
        const sp = selectPrompts[langCode] || selectPrompts.en;

        if (typeof (ctx.ui as any).custom === "function") {
          // 极简零重复胶囊快捷键栏：上方卡片已完整展示各槽位内容，下方仅渲染紧凑标签并支持按 1..N 0ms 直接打出去！
          const items = [
            ...candidates.map((c, idx) => ({ key: String(idx + 1), label: `[${idx + 1}] ${c.label}`, value: c.content })),
            { key: "0", label: `[0] ${sp.keepOrig}`, value: "__ORIGINAL__" },
          ];
          const pickedVal = await (ctx.ui as any).custom((tui: any, theme: any, keybindings: any, done: (res: string | undefined) => void) => {
            let selectedIdx = 0;
            return {
              render(width: number): string[] {
                const border = theme.fg("dim", "─".repeat(Math.max(10, width)));
                const headerLine =
                  " " +
                  theme.fg("accent", theme.bold(sp.title)) +
                  "  " +
                  theme.fg("dim", `(${sp.hint})`);
                // 胶囊流式自动折行（Wrap Pills）：确保窄屏或 4~8 个候选时，[1]..[N] 和 [0] 100% 完整可见、绝不截断丢失！
                const maxLineCols = Math.max(20, width - 2);
                const pillLines: string[] = [];
                let currentLine = " ";
                let currentWidth = 1;
                for (let idx = 0; idx < items.length; idx++) {
                  const it = items[idx];
                  const renderedPill =
                    idx === selectedIdx
                      ? theme.fg("accent", theme.bold(`▸ ${it.label}`))
                      : `  ${theme.fg("text", it.label)}`;
                  const pillWidth = getVisualWidth(renderedPill);
                  const sep = currentWidth > 1 ? "   " : "";
                  const sepWidth = sep.length;
                  if (currentWidth > 1 && currentWidth + sepWidth + pillWidth > maxLineCols) {
                    pillLines.push(currentLine);
                    currentLine = " " + renderedPill;
                    currentWidth = 1 + pillWidth;
                  } else {
                    currentLine += sep + renderedPill;
                    currentWidth += sepWidth + pillWidth;
                  }
                }
                if (currentLine.trim()) {
                  pillLines.push(currentLine);
                }
                return [
                  border,
                  truncateVisual(headerLine, width),
                  ...pillLines,
                  border,
                ];
              },
              handleInput(keyData: string) {
                // 1. 数字键 1..9 直接 0ms 选中并发出，无需再按回车！
                if (/^[1-9]$/.test(keyData)) {
                  const num = parseInt(keyData, 10);
                  if (num >= 1 && num <= candidates.length) {
                    done(candidates[num - 1].content);
                    return;
                  }
                }
                // 2. 数字键 0 或 Esc / Ctrl+C 直接 0ms 发原话！
                if (
                  keyData === "0" ||
                  keyData === "\x1b" ||
                  keyData === "\x03" ||
                  keybindings?.matches?.(keyData, "tui.select.cancel")
                ) {
                  done("__ORIGINAL__");
                  return;
                }
                // 3. 方向键 / hjkl 切换胶囊高亮
                if (
                  keyData === "h" ||
                  keyData === "k" ||
                  keyData === "\x1b[A" ||
                  keyData === "\x1b[D" ||
                  keybindings?.matches?.(keyData, "tui.select.up")
                ) {
                  selectedIdx = (selectedIdx - 1 + items.length) % items.length;
                  tui?.requestRender?.();
                  return;
                }
                if (
                  keyData === "l" ||
                  keyData === "j" ||
                  keyData === "\x1b[B" ||
                  keyData === "\x1b[C" ||
                  keyData === "\t" ||
                  keybindings?.matches?.(keyData, "tui.select.down")
                ) {
                  selectedIdx = (selectedIdx + 1) % items.length;
                  tui?.requestRender?.();
                  return;
                }
                // 4. Enter / Space 确认当前高亮项
                if (
                  keyData === "\r" ||
                  keyData === "\n" ||
                  keyData === "\x1bOM" ||
                  keybindings?.matches?.(keyData, "tui.select.confirm")
                ) {
                  done(items[selectedIdx]?.value);
                  return;
                }
              },
              invalidate() {},
            };
          });
          if (!pickedVal || pickedVal === "__ORIGINAL__") {
            safeClearWidget(ctx);
            updateFooter(ctx);
            return { action: "continue" };
          }
          chosenText = pickedVal;
        } else if (typeof (ctx.ui as any).select === "function") {
          // 单元测试或无 custom 环境下的紧凑回退（不重复长句子，仅展示槽位标签）
          const optionLabels = [
            ...candidates.map((c, idx) => `[${idx + 1}] ${c.label}`),
            `[0] ${sp.keepOrig}`,
          ];
          const picked = await (ctx.ui as any).select(`${sp.title} (${sp.hint})`, optionLabels);
          if (!picked || picked.startsWith("[0]")) {
            safeClearWidget(ctx);
            updateFooter(ctx);
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
      }

      let finalText = sanitized.rawPayload
        ? `${chosenText}\n\n${sanitized.rawPayload}`
        : chosenText;

      const diskConfig = loadUserLingualConfig();
      if (shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }

      return {
        action: "transform",
        text: finalText,
        images: event.images,
      };
    } catch {
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        if (isDirectMode) {
          try {
            const errTemplate = state.labels.notifyError || "[{pair}] Prompt rewrite error; original prompt passed";
            ctx.ui.notify(errTemplate.replace("{pair}", state.labels.hudTitle), "warning");
          } catch {}
        }
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
