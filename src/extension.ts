import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  ExtensionAPI,
  ExtensionContext,
  InputEvent,
  InputEventResult,
} from "@earendil-works/pi-coding-agent";
import type { LingualMode, LingualI18nLabels, LingualResult, SlotConfig, SlotResult } from "./types.js";
import { getEffectiveMaxCols } from "./layout.js";
import {
  translatePrompt,
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
  labels: LingualI18nLabels;
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.execArgv.some((a) => a.startsWith("--test") || a === "--test") ||
    process.argv.some((a) => a.includes(".test.") || a.includes("test")) ||
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
const initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);

const state: ExtensionState = {
  mode: initialDiskConfig.mode || "original",
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  selectedModel: initialDiskConfig.selectedModel || "auto",
  slotPreset: initialSlotPreset || "",
  slots: initialSlots,
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
      if (v === undefined || v === "auto" || v === "original" || (k === "compact" && v === false)) {
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

    switch (state.mode) {
      case "original":
      case "english":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", pair));
        break;
      case "off":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `${pair}: off`));
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

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = session.getActiveResult() || session.getLastResult();
      if (active && hasActiveUI(lastContext)) {
        renderActiveCard(lastContext);
      }
    }, 120);
  };
  const prevResize = (globalThis as any).__piLingualResizeListener;
  if (prevResize && process.stdout && typeof (process.stdout as any).off === "function") {
    (process.stdout as any).off("resize", prevResize);
  }
  (globalThis as any).__piLingualResizeListener = onResize;
  process.stdout?.on("resize", onResize);

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

  pi.on("session_start", async (_event, ctx) => {
    clearPendingTimers();
    session.abortActive();
    session.reset();
    lastContext = ctx;
    if (hasActiveUI(ctx)) {
      safeClearWidget(ctx);
    }
    // 0 侵扰冷启动：静默点亮状态栏指示，绝不弹窗打断敲代码心流
    updateFooter(ctx);
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

    if (trimmed === "english" || trimmed === "en" || trimmed === "eng" || trimmed === "2") {
      nextMode = "english";
    } else if (trimmed === "original" || trimmed === "orig" || trimmed === "1") {
      nextMode = "original";
    } else if (trimmed === "off" || trimmed === "0" || trimmed === "disable" || trimmed === "stop") {
      nextMode = "off";
    } else {
      // 缺省或无参数时，平滑三态循环轮转
      nextMode = state.mode === "original" ? "english" : state.mode === "english" ? "off" : "original";
    }

    state.mode = nextMode;
    // 【核心根治 1 · 状态持久化落盘】：每次切换模式立即物理持久化到 settings.json，彻底杜绝重载时回退到 original！
    saveUserLingualConfig({ mode: nextMode });
    updateFooter(ctx);

    if (nextMode === "english") {
      try {
        ctx.ui.notify(state.labels.notifyEnglish || `[${state.labels.hudTitle}] Switched to [English] mode: Input to AI will be converted to technical English`, "info");
      } catch {}
    } else if (nextMode === "off") {
      safeClearWidget(ctx);
      try {
        ctx.ui.notify(state.labels.notifyOff || `[${state.labels.hudTitle}] Companion turned off`, "info");
      } catch {}
    } else {
      try {
        ctx.ui.notify(state.labels.notifyOriginal || `[${state.labels.hudTitle}] Switched to [Original] mode: Input kept in native language, translations shown above`, "info");
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

    const statusMsg = formatStatusReport(state.labels, {
      mode: state.mode,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      activeModel,
      layout: state.compact ? "capsule" : "tree",
      cacheStats: globalLingualCache.getStats(),
    }) + `\n• Slots Preset: [${state.slotPreset || "developer"}] (${(state.slots || []).filter(s => s.enabled).map(s => s.label).join(", ")})`;

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
        `🤖 lingual-tuner 槽位调优与伴学定制指南:\n\n` +
        `pi-lingual 内置 lingual-tuner 技能。您完全无需记忆或手敲复杂的 /slots 命令，直接向当前 Agent 描述偏好：\n` +
        `  • 隐去原文: "伴学卡片不要显示中文原文，只要纯译文"\n` +
        `  • 社媒风格: "帮我配置推特推文和深度分析两个槽位，不要原文"\n` +
        `  • 极简双模: "把伴学改成单槽位纯译文"\n` +
        `  • 恢复开箱: "恢复默认伴学槽位"\n\n` +
        `Agent 会自动通过 lingual-tuner 技能直接装配并更新 ~/.pi/agent/lingual.json，单回合即刻生效！\n` +
        `若需切换母语，请直接运行 /lang <zh|ja|en|es|fr|de>。`;
    } else if (isJa) {
      guide =
        `🤖 lingual-tuner スロット調整・カスタマイズ案内:\n\n` +
        `pi-lingual は lingual-tuner スキルを内蔵しています。複雑なコマンドを覚える必要はありません。Agent に直接ご要望をお伝えください：\n` +
        `  • 原文非表示: 「伴走カードに原文を表示せず、訳文のみ表示して」\n` +
        `  • SNS向け: 「ツイートと技術的洞察の2スロットにカスタマイズして、原文は不要」\n` +
        `  • ミニマル: 「1行の純粋な訳文のみに変更して」\n` +
        `  • リセット: 「デフォルトのスロット構成に戻して」\n\n` +
        `Agent が lingual-tuner スキル経由で ~/.pi/agent/lingual.json を直接更新し、1ターンで反映されます！\n` +
        `母語の切り替えは /lang <zh|ja|en|es|fr|de> をご利用ください。`;
    } else if (isEs) {
      guide =
        `🤖 Guía de personalización con lingual-tuner:\n\n` +
        `pi-lingual incluye la habilidad lingual-tuner. No necesita memorizar comandos complejos; simplemente hable con su Agente:\n` +
        `  • Ocultar original: "No muestres el texto original, solo las traducciones"\n` +
        `  • Tono social: "Configura ranuras para tuit y análisis técnico, sin texto original"\n` +
        `  • Minimalista: "Cambia a traducción limpia de una sola ranura"\n` +
        `  • Restablecer: "Restablece las ranuras predeterminadas"\n\n` +
        `Su Agente actualizará ~/.pi/agent/lingual.json automáticamente en un solo turno.\n` +
        `Para cambiar de idioma: /lang <zh|ja|en|es|fr|de>.`;
    } else if (isFr) {
      guide =
        `🤖 Guide de personnalisation lingual-tuner :\n\n` +
        `pi-lingual intègre la compétence lingual-tuner. Inutile de taper des commandes complexes, parlez simplement à votre Agent :\n` +
        `  • Masquer l'original : "Ne montre pas le texte original, uniquement la traduction"\n` +
        `  • Réseaux sociaux : "Configure les emplacements pour tweet et analyse, sans texte original"\n` +
        `  • Épuré : "Passe à une traduction unique épurée"\n` +
        `  • Réinitialiser : "Réinitialise les emplacements par défaut"\n\n` +
        `Votre Agent mettra à jour ~/.pi/agent/lingual.json automatiquement en un seul tour.\n` +
        `Pour changer de langue : /lang <zh|ja|en|es|fr|de>.`;
    } else if (isDe) {
      guide =
        `🤖 Anleitung zur Anpassung mit lingual-tuner:\n\n` +
        `pi-lingual enthält den integrierten lingual-tuner Skill. Sie müssen keine Befehle tippen; sprechen Sie einfach mit Ihrem Agenten:\n` +
        `  • Original ausblenden: "Originaltext ausblenden, nur Übersetzungen anzeigen"\n` +
        `  • Social-Media: "Slots für Tweet und technische Einsicht einrichten, kein Originaltext"\n` +
        `  • Minimalistisch: "Auf reine einzeilige Übersetzung umstellen"\n` +
        `  • Zurücksetzen: "Slots auf Standard zurücksetzen"\n\n` +
        `Ihr Agent aktualisiert ~/.pi/agent/lingual.json automatisch in einer einzigen Runde.\n` +
        `Sprache wechseln: /lang <zh|ja|en|es|fr|de>.`;
    } else {
      guide =
        `🤖 lingual-tuner Companion Customization Guide:\n\n` +
        `pi-lingual includes a built-in lingual-tuner skill. No need to memorize complex CLI flags; just describe your preferences to your Agent:\n` +
        `  • Suppress original: "Hide original text on companion cards, show translations only"\n` +
        `  • Social tone: "Configure companion with Twitter Hook and Technical Insight slots, no source text"\n` +
        `  • Minimalist: "Switch to 1-line translation only"\n` +
        `  • Reset: "Reset companion slots to default"\n\n` +
        `Your Agent will update ~/.pi/agent/lingual.json directly in a single turn!\n` +
        `To switch native language: /lang <zh|ja|en|es|fr|de>.`;
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

    // 6. 子命令路由: 伴学定制指南 (/lingual agent 或 /lingual help)
    if (sub === "agent" || sub === "help" || sub === "?") {
      await showAgentGuideHandler(subArgs, ctx);
      return;
    }

    // 7. 模式切换优先: 显式模式关键词 (/lingual original, /lingual english, /lingual off, /lingual mode ...)
    if (
      sub === "mode" ||
      sub === "original" ||
      sub === "english" ||
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

  // 主命令总线 (支持所有子命令与平滑三态模式轮转)
  pi.registerCommand("lingual", {
    description: state.labels.cmdDescMode || "Switch or manage companion: /lingual [lang|slots|compact|model|status|last|original|english|off]",
    handler: masterCommandHandler,
  });

  // 独立模式切换命令
  pi.registerCommand("lingual-mode", {
    description: state.labels.cmdDescMode || "Set companion mode: /lingual-mode <original|english|off>",
    handler: setModeHandler,
  });

  // 独立槽位架构配置命令 (/slots, /lingual-slots)
  pi.registerCommand("slots", {
    description: state.labels.cmdDescSlots || "Inspect, add, remove, or customize dynamic slots: /slots [add|rm|toggle|reset]",
    handler: switchSlotsHandler,
  });

  pi.registerCommand("lingual-slots", {
    description: state.labels.cmdDescSlots || "Dynamic slots management (alias): /lingual-slots [add|rm|toggle|reset]",
    handler: switchSlotsHandler,
  });

  // 独立语言切换命令 (首选直觉命令 /lang 及全称别名)
  pi.registerCommand("lang", {
    description: state.labels.cmdDescLang || "Switch companion language: /lang <zh|ja|en|es|fr|de> [target]",
    handler: switchLangHandler,
  });

  pi.registerCommand("lingual-lang", {
    description: state.labels.cmdDescLang || "Switch companion language (alias): /lingual-lang <zh|ja|en|es|fr|de>",
    handler: switchLangHandler,
  });

  // 独立胶囊紧凑布局命令 (仅保留全称 /lingual-compact，绝不占用 Pi 内置的 /compact 会话上下文压缩命令)
  pi.registerCommand("lingual-compact", {
    description: state.labels.cmdDescCompact || "Toggle single-line capsule mode: /lingual-compact",
    handler: toggleCompactHandler,
  });

  // 独立伴学模型配置命令
  pi.registerCommand("lingual-model", {
    description: state.labels.cmdDescModel || "Inspect or switch companion model: /lingual-model [model-id|auto]",
    handler: setModelHandler,
  });

  // 独立状态报告命令 (/status, /lingual-status)
  pi.registerCommand("status", {
    description: state.labels.cmdDescStatus || "Display companion status report: /status",
    handler: showStatusHandler,
  });

  pi.registerCommand("lingual-status", {
    description: state.labels.cmdDescStatus || "Display companion status report (alias): /lingual-status",
    handler: showStatusHandler,
  });

  // 独立历史回显命令 (支持直觉命令 /last 及全名)
  pi.registerCommand("last", {
    description: state.labels.cmdDescLast || "Replay previous companion card: /last",
    handler: showLastHandler,
  });

  pi.registerCommand("lingual-last", {
    description: state.labels.cmdDescLast || "Replay previous companion card (alias): /lingual-last",
    handler: showLastHandler,
  });

  // 伴学定制指南
  pi.registerCommand("lingual-agent", {
    description: state.labels.cmdDescAgent || "View companion customization and language guide: /lingual-agent",
    handler: showAgentGuideHandler,
  });

  if (typeof pi.registerShortcut === "function") {
    // 快捷键支持：使用 Alt+. 与 Alt+,（对应 US 键盘 > 与 < 左右方向，零系统冲突）
    pi.registerShortcut("alt+.", {
      description: state.labels.shortcutNextPage || "Switch to next companion segment",
      handler: async (ctx) => {
        if (session.nextPage()) {
          renderActiveCard(ctx);
        }
      },
    });

    pi.registerShortcut("alt+,", {
      description: state.labels.shortcutPrevPage || "Switch to previous companion segment",
      handler: async (ctx) => {
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
    if (state.mode === "off") return { action: "continue" };
    if (event.source === "extension") return { action: "continue" };

    // Sync external lingual.json updates (e.g. written by lingual-tuner skill)
    const latestDisk = loadUserLingualConfig();
    if (latestDisk.slots && Array.isArray(latestDisk.slots)) {
      state.slots = latestDisk.slots;
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

    // 判定 1：若整段输入经过审查后，发现毫无自然语言意图 (纯堆栈/纯代码/纯命令)
    // 判定 2：或命中底层代码与 CLI 盾牌及字符长度防护 (由 shouldTriggerTranslation 统一管控)
    if (
      !sanitized.hasNaturalLanguage ||
      !shouldTriggerTranslation(promptToTranslate, state.sourceLang)
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

    // 【原文模式】(original · 默认)：彻底非阻塞 (0ms 立即放行原始输入)，后台异步微任务渲染卡片视窗
    if (state.mode === "original") {
      if (hasActiveUI(ctx)) {
        try {
          // 立即物理销毁上一轮的旧卡片，清爽等待新卡片，绝不悬挂陈旧内容导致卡死错觉
          ctx.ui.setWidget("lingual_hud", undefined);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⇄ [lingual] polishing..."));
        } catch {}
      }

      // 微任务时序错峰 (80ms)：避开与 Pi 主会话首包握手争抢连接池，消除网关排队拥堵
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
          .catch(() => {
            // Gracefully ignore translation errors in background original mode
          })
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

    // 【英文模式】(english)：同步等待获取纯技术英文以替换发送给 AI 的 Prompt
    if (hasActiveUI(ctx)) {
      try {
        ctx.ui.setWidget(
          "lingual_hud",
          [ctx.ui.theme.fg("muted", "  ⋯ ⇄ [lingual] polishing...")],
          { placement: "aboveEditor" }
        );
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⇄ [lingual] polishing..."));
      } catch {}
    }

    try {
      const result = await translatePrompt(promptToTranslate, {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        labels: state.labels,
        slots: state.slots,
        slotPreset: state.slotPreset,
        complete: completer,
        signal,
      });

      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }

      if (!result) {
        if (hasActiveUI(ctx)) {
          try {
            ctx.ui.setWidget("lingual_hud", undefined);
            const timeoutTemplate = state.labels.notifyTimeout || "[{pair}] English translation timed out or not ready; original prompt passed";
            ctx.ui.notify(timeoutTemplate.replace("{pair}", state.labels.hudTitle), "warning");
          } catch {}
        }
        return { action: "continue" };
      }

      session.setPageResult(0, result, generation);
      if (hasActiveUI(ctx)) {
        renderHudWidget(
          ctx,
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

      const combinedEnglish = result.written && result.written.trim() ? result.written : result.spoken;

      // 【核心体验跃升 · 混合意图嫁接 (Hybrid Intent Grafting)】:
      // 若原始输入包含大段被折叠的堆栈追踪或代码块，将纯英文专业指令与原始真实堆栈缝合，
      // 既驱动大模型展开顶级全英文代码推理，又绝不丢失排查必需的代码与堆栈物理上下文！
      let finalText = sanitized.rawPayload
        ? `${combinedEnglish}\n\n${sanitized.rawPayload}`
        : combinedEnglish;

      // 【可选母语回复守护】(Opt-in Native Reply Guard):
      // 仅当用户在 lingual.json 中显式开启 replyInSourceLang: true 时，
      // 且输入为母语提问而非英文写作意图时，温和附带母语回复指引，防止大模型语言劫持
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
        try {
          ctx.ui.setWidget("lingual_hud", undefined);
          const errTemplate = state.labels.notifyError || "[{pair}] English translation request error; original prompt passed";
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
