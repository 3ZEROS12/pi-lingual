import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import type {
  ExtensionAPI,
  ExtensionContext,
  InputEvent,
  InputEventResult,
} from "@earendil-works/pi-coding-agent";
import type {
  CustomModeConfig,
  LingualMode,
  LingualI18nLabels,
  LingualResult,
  PromptCandidate,
  PromptSlotConfig,
  ReasoningEffort,
  SlotConfig,
  SlotResult,
} from "./types.js";
import {
  getEffectiveMaxCols,
  getBannerMaxCols,
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
  formatLoadingMessage,
} from "./layout.js";
import {
  translatePrompt,
  rewritePromptDirect,
  generatePromptCandidates,
  stripLingualContextWhenOff,
  formatReleaseBannerLines,
  resolveReleaseBannerLang,
  resolveModeDisplaySpec,
  resolveModeDisplayName,
  resolveSelectPrompts,
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
  isUserLingualConfigured,
  resolveModesFromConfig,
  normalizeActiveModeId,
  executeModeRunner,
  defaultSlotsForMode,
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
  addCustomMode,
  removeCustomMode,
  updateCustomMode,
  toggleCustomMode,
  addSlotToMode,
  removeSlotFromMode,
  getDefaultFactoryModes,
  getPresetLoadout,
  listPresetLoadouts,
  SLOT_PRESETS,
  LANGUAGE_PRESETS,
  isSupportedLangCode,
  normalizeLangCode,
  resolveLangPair,
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
  modes: CustomModeConfig[];
  activeModeId?: string;
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
const initialModes = resolveModesFromConfig(initialDiskConfig, initialSourceLang);
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
  modes: initialModes,
  labels: initialLabels,
};

// Monotonic FSM session controller, eliminating concurrent input races and ghost cards, aborting upstream sockets.
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

function copyToClipboard(text: string): boolean {
  if (!text) return false;
  // Emit ANSI OSC 52 sequence for SSH / tmux / modern terminal clipboard sync
  try {
    const base64 = Buffer.from(text, "utf8").toString("base64");
    process.stdout.write(`\x1b]52;c;${base64}\x07`);
  } catch {}

  try {
    if (process.platform === "win32") {
      const proc = spawn("clip.exe", { stdio: ["pipe", "ignore", "ignore"] });
      proc.stdin.on("error", () => {});
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    } else if (process.platform === "darwin") {
      const proc = spawn("pbcopy", { stdio: ["pipe", "ignore", "ignore"] });
      proc.stdin.on("error", () => {});
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    } else {
      // Linux: try wl-copy then fallback to xclip
      const proc = spawn("wl-copy", { stdio: ["pipe", "ignore", "ignore"] });
      proc.stdin.on("error", () => {});
      proc.on("error", () => {
        try {
          const procX = spawn("xclip", ["-selection", "clipboard"], { stdio: ["pipe", "ignore", "ignore"] });
          procX.stdin.on("error", () => {});
          procX.stdin.write(text, "utf8");
          procX.stdin.end();
        } catch {}
      });
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    }
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
    if (state.mode === "off") {
      // Stealth off mode: completely remove status bar badge (0 visual pixels)
      ctx.ui.setStatus("lingual", undefined as any);
      return;
    }

    // Normalize status bar badge to clean minimal A ⇄ B (e.g. en ⇄ ja)
    let pair = `${state.sourceLang} ⇄ ${state.targetLang}`;
    const canonicalId =
      state.mode === "english" ? "direct" :
      state.mode === "original" ? "companion" :
      state.mode === "select" ? "candidates" :
      state.mode === "modify" ? "live-flow" :
      state.mode;

    const canonicalKey =
      canonicalId === "live-flow" ? "modify" : canonicalId;

    // The badge summarises the ACTIVE MODE's slot anatomy (mode is the single source of truth),
    // falling back to the global slot set only when the mode carries none.
    const inMemory = Array.isArray(state.modes) ? state.modes : [];
    const activeMode =
      inMemory.find((m) => m.id === state.mode || m.id === canonicalId) ||
      resolveModesFromConfig(loadUserLingualConfig(), state.sourceLang).find((m) => m.id === state.mode || m.id === canonicalId);
    const modeSlots = activeMode && Array.isArray(activeMode.slots) ? activeMode.slots : [];
    const enabledSlots = (modeSlots.length > 0 ? modeSlots : state.slots || []).filter((s) => s.enabled !== false);
    const nonSourceCount = enabledSlots.filter((s) => s.role !== "source").length;

    // Remove `no-src` noise: mode declares its own topology.
    // Retain slot count indicator only when slot anatomy differs from the 2-slot baseline.
    if (nonSourceCount !== 2 && enabledSlots.length > 0) {
      pair += ` · ${enabledSlots.length}s`;
    } else if (state.slotPreset) {
      pair += ` · ${state.slotPreset}`;
    }

    const modeName = activeMode ? activeMode.name : resolveModeDisplayName(canonicalId, state.sourceLang);
    ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${modeName}`));
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

/**
 * Renders minimal open left-rail tree branch (UAX #11 cell widths, 0 clipping, immune to CJK ghosting).
 * Displays source anchor, dynamic translation slots, native nuance sublines, and vocabulary spotlight.
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
          muted: (s: string) => ctx.ui.theme.fg("muted", s),
          accent: (s: string) => ctx.ui.theme.fg("accent", s),
          dim: (s: string) => ctx.ui.theme.fg("dim", s),
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
    // Only count pages ready with translations, preventing ghost pagination.
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

  const renderReleaseBanner = (ctx: ExtensionContext, explicitLang?: string): boolean => {
    if (!hasActiveUI(ctx)) return false;
    try {
      // Borderless open-tree banner: full terminal width minus a 2-column safety margin
      // (HUD cards reserve 8 columns for box borders, which would clip the banner copy).
      const maxCols = getBannerMaxCols();
      const fg = ctx.ui.theme?.fg
        ? (c: string, t: string) => ctx.ui.theme.fg(c as any, t)
        : (_c: string, t: string) => t;
      const entries = (ctx as any).sessionManager?.getEntries?.() || [];
      const bannerLang = resolveReleaseBannerLang(explicitLang, entries);
      const lines = formatReleaseBannerLines(bannerLang, maxCols, fg);
      ctx.ui.setWidget("lingual_hud", lines, { placement: "aboveEditor" });
      showingReleaseBanner = true;
      return true;
    } catch {
      return false;
    }
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
    let diskCfg = loadUserLingualConfig();
    // Native language detected by cold-boot probing (kept for banner chrome, e.g. zh_TW -> tw copy).
    let detectedLang: string | undefined;

    // Zero-Config Cold Boot (D6): Auto-detect OS/shell locale without prompt dialog.
    // If not configured on disk, adopt detected native language in memory without writing to disk.
    if (!diskCfg.sourceLang) {
      const detected = resolveReleaseBannerLang();
      detectedLang = detected;
      const detectedSource = isSupportedLangCode(detected) ? detected : "en";
      state.sourceLang = detectedSource;
      state.targetLang = detectedSource === "en" ? "ja" : "en";
      state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);
      state.modes = getDefaultFactoryModes(state.sourceLang, state.sourceLang);
      state.slots = getDefaultSlots(state.sourceLang);
      state.directSlots = getDefaultDirectSlots(state.sourceLang);
      state.promptSlots = getDefaultPromptSlots(state.sourceLang);
      state.modifySlots = getDefaultModifySlots(state.sourceLang, state.sourceLang);
      state.mode = state.modes[0]?.id as any || "companion";
      state.activeModeId = state.mode;
    }

    if (diskCfg.sourceLang) {
      state.sourceLang = diskCfg.sourceLang;
    }
    if (diskCfg.targetLang) {
      state.targetLang = diskCfg.targetLang;
    }
    if (diskCfg.labels) {
      state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);
    }
    if (diskCfg.mode) {
      state.mode = diskCfg.mode;
    }
    if (Array.isArray(diskCfg.modes) && diskCfg.modes.length > 0) {
      state.modes = diskCfg.modes;
    } else {
      state.modes = resolveModesFromConfig(diskCfg, state.sourceLang);
    }
    if (diskCfg.activeModeId && !state.modeLocked) {
      state.activeModeId = diskCfg.activeModeId;
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
    // Single source of truth: the active mode must always resolve to a real registry id,
    // so legacy ids never leave the badge disagreeing with the mode actually in force.
    state.mode = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId || diskCfg.activeModeId },
      state.modes
    );
    state.activeModeId = state.mode;
    if (hasActiveUI(ctx)) {
      safeClearWidget(ctx);
      // Release feature banner: rendered once on major version upgrade above editor
      if (
        state.mode !== "off" &&
        !isTestEnvironment() &&
        event?.reason !== "resume" &&
        diskCfg.lastSeenVersion !== CURRENT_FEATURE_BANNER_VERSION
      ) {
        // Persist only after the banner is physically delivered, so a stale or failed
        // render never burns the one-time notification permanently.
        if (renderReleaseBanner(ctx, detectedLang || diskCfg.sourceLang)) {
          saveUserLingualConfig({ lastSeenVersion: CURRENT_FEATURE_BANNER_VERSION });
        }
      }
    }
    // Non-intrusive cold boot: hide footer badge if off mode
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

  // On-demand tuner context shield:
  // Strip lingual-tuner skill block from systemPrompt by default (0 token overhead),
  // allowing it through only when user types `/lingual tuner` (tunerArmed === true).
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
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    const modeSpec = resolveModeDisplaySpec(state.sourceLang);
    const diskForMode = loadUserLingualConfig();
    const modes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(diskForMode);
    const activeModes = modes.filter((m) => m.enabled !== false);
    const hasCustomModesOnDisk = Array.isArray(diskForMode.modes) && diskForMode.modes.length > 0;

    let nextMode: string;
    const explicitLegacy = normalizeLingualModeInput(trimmed);

    if (trimmed) {
      const lower = trimmed.toLowerCase();
      const matched = activeModes.find(
        (m) =>
          m.id.toLowerCase() === lower ||
          m.name.toLowerCase() === lower ||
          (Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === lower))
      );
      const numIdx = parseInt(trimmed, 10);
      const isNum = !isNaN(numIdx) && String(numIdx) === trimmed;
      if (isNum && numIdx >= 1 && numIdx <= activeModes.length) {
        // Numerals always resolve positionally from the live registry (one rule, always matches the badge/toast).
        nextMode = activeModes[numIdx - 1].id;
      } else if (matched) {
        nextMode = matched.id;
      } else if (explicitLegacy) {
        nextMode = explicitLegacy;
      } else {
        nextMode = trimmed;
      }
    } else {
      // Check if active mode is locked
      if (state.modeLocked) {
        const currentModeObj = activeModes.find((m) => m.id === state.mode);
        const currentName = currentModeObj
          ? currentModeObj.name
          : state.mode === "off"
            ? modeSpec.off
            : state.mode;
        const template =
          state.labels.notifyModeLockedCycleBlocked ||
          "[{pair}] Mode is locked to [{mode}]. Run /lingual unlock to cycle modes or specify mode directly.";
        const lockWarning = template
          .replace("{pair}", pair)
          .replace("{mode}", currentName);
        try {
          ctx.ui.notify(lockWarning, "warning");
        } catch {}
        return;
      }

      if (hasCustomModesOnDisk) {
        const cycleList = [...activeModes.map((m) => m.id), "off"];
        const currentIdx = cycleList.indexOf(state.mode);
        nextMode =
          currentIdx === -1
            ? activeModes[0]?.id || "companion"
            : cycleList[(currentIdx + 1) % cycleList.length] || activeModes[0]?.id || "companion";
      } else {
        // Default mode cycle: companion -> direct -> live-flow -> off -> companion
        nextMode =
          state.mode === "original" || state.mode === "companion"
            ? "direct"
            : state.mode === "english" || state.mode === "direct"
              ? "live-flow"
              : state.mode === "select" || state.mode === "candidates"
                ? "live-flow"
                : state.mode === "modify" || state.mode === "live-flow"
                  ? "off"
                  : "companion";
      }
    }

    const canonical =
      nextMode === "original" ? "companion" :
      nextMode === "english"  ? "direct"    :
      nextMode === "select"   ? "candidates":
      nextMode === "modify"   ? "live-flow" : nextMode;

    if (nextMode === "off") {
      state.mode = "off";
      state.activeModeId = "off";
      saveUserLingualConfig({ mode: "off", activeModeId: "off" });
      syncResizeListener();
      clearPendingTimers();
      session.reset();
      globalLingualCache.clear();
      safeClearWidget(ctx);
      updateFooter(ctx);
      try {
        ctx.ui.notify(modeSpec.notifyOff(pair), "info");
      } catch {}
      return;
    }

    const targetMode = activeModes.find((m) => m.id === canonical || m.id === nextMode);
    if (!targetMode) {
      const notFoundTemplate =
        state.labels.notifyModeNotFound ||
        "[{pair}] Mode [{mode}] is not in your active registry. Run /lingual mode list to view available modes.";
      const msg = notFoundTemplate
        .replace("{pair}", pair)
        .replace("{mode}", trimmed || nextMode);
      try {
        ctx.ui.notify(msg, "info");
      } catch {}
      return;
    }

    const finalId = targetMode.id;
    state.mode = finalId as any;
    state.activeModeId = finalId;
    saveUserLingualConfig({ mode: finalId as any, activeModeId: finalId });
    syncResizeListener();
    updateFooter(ctx);

    const modeIdx = activeModes.indexOf(targetMode);
    const modeNum = modeIdx >= 0 ? modeIdx + 1 : 1;
    const modeName = targetMode.name;
    const firstSlotLabel =
      targetMode.slots.find((s) => s.role !== "vocab")?.label ||
      targetMode.slots[0]?.label ||
      modeName;
    const template =
      state.labels.modeSwitchedTemplate ||
      "[{pair}] Switched to [{num}. {name} ({id})] ({slot})";
    const msg = template
      .replace("{pair}", pair)
      .replace("{num}", String(modeNum))
      .replace("{name}", modeName)
      .replace("{id}", finalId)
      .replace("{slot}", firstSlotLabel);
    try {
      ctx.ui.notify(msg, "info");
    } catch {}
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

  const switchLangHandler = async (args: string, ctx: ExtensionContext) => {
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    const previousSource = state.sourceLang;
    const previousTarget = state.targetLang;
    const trimmed = args.trim().toLowerCase();
    if (!trimmed || trimmed === "list" || trimmed === "help" || trimmed === "?") {
      const flowText = `${state.sourceLang} ➔ ${state.targetLang}`;
      const template =
        state.labels.langHelpText ||
        "[Companion Language: {flow}]\n• Quick switch: /lang ja (target Japanese) · /lang en (target English)\n• Pair switch: /lang en ja · /lang ja en · /lang es en\n• Supported codes: zh, tw, ja, ko, en, es, fr, de, ru";
      const helpMsg = template
        .replace("{flow}", flowText)
        .replace("{pair}", pair);
      ctx.ui.notify(helpMsg, "info");
      return;
    }

    const parts = trimmed.split(/\s*->\s*|\s*➔\s*|\s+to\s+|\s+/).filter(Boolean);
    let newSource = state.sourceLang;
    let newTarget = state.targetLang;

    if (parts.length === 1) {
      const code = normalizeLangCode(parts[0]);
      if (!isSupportedLangCode(code)) {
        ctx.ui.notify(
          state.labels.notifyLangInvalid || "Invalid language code. Supported: zh, tw, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
      if (code === state.sourceLang) {
        newTarget = code === "en" ? "ja" : "en";
      } else {
        // Direct target language switch without changing source language (e.g. /lang ja)
        newTarget = code;
      }
    } else {
      newSource = normalizeLangCode(parts[0]);
      newTarget = normalizeLangCode(parts[1]);
      if (!isSupportedLangCode(newSource)) {
        ctx.ui.notify(
          state.labels.notifyLangInvalid || "Invalid language code. Supported: zh, tw, ja, ko, en, es, fr, de, ru",
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
    // Only refresh factory modes to newSource defaults if user has NOT customized them on disk
    if (!diskBeforeSwitch.modes || diskBeforeSwitch.modes.length === 0) {
      state.modes = getDefaultFactoryModes(newSource, newSource);
      state.mode = normalizeActiveModeId({ mode: state.mode, activeModeId: state.activeModeId }, state.modes) as any;
      state.activeModeId = state.mode;
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

    const isTargetOnly = newSource === previousSource && newTarget !== previousTarget;
    const template = isTargetOnly
      ? (state.labels.notifyTargetSwitched || "Target language switched to: {target} (native {source} unchanged)")
      : (state.labels.notifyLangSwitched || "Native language switched to: {lang}");
    const flowText = `${newSource} ⇄ ${newTarget}`;
    const msg = isTargetOnly
      ? `[${flowText}] ` + template.replace("{target}", newTarget).replace("{source}", newSource)
      : `[${flowText}] ` + template.replace("{lang}", flowText);
    ctx.ui.notify(msg, "info");
  };

  const toggleCompactHandler = async (_args: string, ctx: ExtensionContext) => {
    state.compact = !state.compact;
    saveUserLingualConfig({ compact: state.compact });
    const msg = state.compact
      ? (state.labels.notifyCompactOn || `[${state.labels.hudTitle}] Single-line capsule mode enabled`)
      : (state.labels.notifyCompactOff || `[${state.labels.hudTitle}] Full tree layout restored`);
    ctx.ui.notify(msg, "info");

    // Re-render active card if present
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
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(disk);
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: (state as any).activeModeId || disk.activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const pair = lbl.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;

    // 1. No args or "list": inspect active slots of current mode
    if (!subCmd || subCmd === "list" || subCmd === "ls") {
      const modeSlots = activeMode.slots || [];
      const lines = modeSlots.map((s, idx) => {
        const status = s.enabled !== false
          ? (lbl.slotsStatusEnabled || "enabled")
          : (lbl.slotsStatusDisabled || "disabled");
        const inst = s.instruction ? ` // ${s.instruction.slice(0, 50)}...` : "";
        return `  ${idx + 1}. [${s.id}] "${s.label}" (${s.role || "rewrite"}, ${status})${inst}`;
      });

      const header = `✦ [${activeMode.name}] Dynamic Slots (${modeSlots.filter((s) => s.enabled !== false).length}/${modeSlots.length} active):\n`;
      const body = lines.length > 0 ? lines.join("\n") : `  (${lbl.slotsNone || "No slots configured"})`;
      const cliHelp =
        `\n\nUsage:\n` +
        `  /slots add <id> <label> [instruction...]  Add or update slot in active mode\n` +
        `  /slots rm <id>                            Remove slot by ID\n` +
        `  /slots toggle <id>                        Toggle enabled state\n` +
        `  /slots reset                              Reset active mode slots to defaults`;
      ctx.ui.notify(`${header}${body}${cliHelp}`, "info");
      return;
    }

    // 2. "/slots reset": restore factory default initial slots for active mode
    if (subCmd === "reset") {
      const factoryDefaults = getDefaultFactoryModes(state.sourceLang, disk.explainLang);
      const matchDefault = factoryDefaults.find((m) => m.id === activeMode.id);
      if (matchDefault) {
        activeMode.slots = [...matchDefault.slots];
      } else {
        activeMode.slots = defaultSlotsForMode(activeMode, state.sourceLang, disk.explainLang);
      }
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Reset slots for mode [${activeMode.name}] to clean defaults.`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 2.1 Fast shortcuts to toggle source row
    if (subCmd === "hide-source" || subCmd === "no-source") {
      activeMode.slots = activeMode.slots.filter((s) => s.id !== "source");
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Hidden [source] row in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "show-source" || subCmd === "with-source") {
      const hasSource = (activeMode.slots || []).some((s) => s.id === "source");
      if (!hasSource) {
        activeMode.slots = [
          { id: "source", label: lbl.sourceLabel || "Original", role: "rewrite", instruction: "Source text", enabled: true },
          ...(activeMode.slots || []),
        ];
      } else {
        activeMode.slots = (activeMode.slots || []).map((s) => (s.id === "source" ? { ...s, enabled: true } : s));
      }
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Restored [source] row in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 3. "/slots rm <id>": remove slot from active mode
    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageRm || "Usage: /slots rm <slot-id>", "warning");
        return;
      }
      const existing = (activeMode.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", pair).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      activeMode.slots = activeMode.slots.filter((s) => s.id.toLowerCase() !== targetId);
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Removed slot [${targetId}] ("${existing.label}") from mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 4. "/slots toggle <id>": toggle slot enabled state in active mode
    if (subCmd === "toggle") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageToggle || "Usage: /slots toggle <slot-id>", "warning");
        return;
      }
      const existing = (activeMode.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", pair).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      activeMode.slots = activeMode.slots.map((s) =>
        s.id.toLowerCase() === targetId ? { ...s, enabled: s.enabled === false } : s
      );
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      const updated = activeMode.slots.find((s) => s.id.toLowerCase() === targetId);
      const statusText = updated?.enabled !== false
        ? (lbl.slotsStatusEnabled || "enabled")
        : (lbl.slotsStatusDisabled || "disabled");
      ctx.ui.notify(`[${pair}] Slot [${targetId}] is now ${statusText} in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 5. "/slots add <id> <label> [instruction...]": add or update slot in active mode
    if (subCmd === "add") {
      const id = (parts[1] || "").toLowerCase();
      const label = parts[2];
      const instruction = parts.slice(3).join(" ");
      if (!id || !label) {
        ctx.ui.notify(lbl.slotsUsageAdd || "Usage: /slots add <id> <label> [instruction...]", "warning");
        return;
      }
      const newPromptSlot: PromptSlotConfig = {
        id,
        label,
        role: id === "vocab" || id === "fixes" ? "vocab" : "rewrite",
        instruction:
          instruction ||
          `Target Language: \${targetLang}. Output in \${targetLang} ONLY: Generate output matching "${label}" style without summarizing.`,
        enabled: true,
      };
      const existingIdx = activeMode.slots.findIndex((s) => s.id.toLowerCase() === id);
      if (existingIdx >= 0) {
        activeMode.slots[existingIdx] = newPromptSlot;
      } else {
        activeMode.slots.push(newPromptSlot);
      }

      // Automatically upgrade HUD to "tree" if mode.hud was "preview" and enabled translation slots > 1
      let hudUpgraded = false;
      const enabledTranslationCount = activeMode.slots.filter(
        (s) => s.enabled !== false && s.role !== "vocab" && s.id !== "source"
      ).length;
      if (activeMode.hud === "preview" && enabledTranslationCount > 1) {
        activeMode.hud = "tree";
        hudUpgraded = true;
      }

      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();

      const upgradeHint = hudUpgraded ? ` (HUD layout auto-upgraded to "tree" for multi-slot visibility)` : "";
      ctx.ui.notify(`[${pair}] Added/updated slot [${id}] "${label}" in mode [${activeMode.name}]${upgradeHint}.`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    // 6. Legacy preset keywords support (e.g. /slots compact2, /slots social, /slots developer)
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

    // 7. Unknown slot command fallback
    const unknownTpl = lbl.slotsUnknown || "Unknown slot command or preset \"{cmd}\".";
    ctx.ui.notify(unknownTpl.replace("{pair}", lbl.hudTitle).replace("{cmd}", subCmd), "warning");
  };

  const showStatusHandler = async (_args: string, ctx: ExtensionContext) => {
    const followDesc = state.labels.modelFollowSession || "follow session";
    const activeModel = state.selectedModel === "auto"
      ? (ctx.model ? `auto (${followDesc}: ${ctx.model.provider}/${ctx.model.id})` : "auto")
      : (state.selectedModel || "auto");

    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(loadUserLingualConfig());
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: (state as any).activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const diskCfg = loadUserLingualConfig();
    const activeEffort = activeMode.reasoning || diskCfg.reasoning || "low";

    const statusMsg = formatStatusReport(state.labels, {
      mode: state.mode,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      activeModel,
      layout: state.compact ? "capsule" : "tree",
      cacheStats: globalLingualCache.getStats(),
    }) +
      `\n• Active Mode: [${activeMode.name}] (${activeMode.id}) · flow: ${activeMode.flow} · action: ${activeMode.action}` +
      `\n• Dynamic Slots: [${(activeMode.slots || []).filter(s => s.enabled !== false).map(s => s.label).join(", ")}]` +
      `\n• Reasoning Effort: ${activeEffort} (mode: ${activeMode.reasoning || "default"}, global: ${diskCfg.reasoning || "low"})`;

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

  // Manage mode registry CRUD subcommands (/lingual mode [list|add|rm|toggle|reset])
  const manageModesHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(disk);
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;

    if (!trimmed || trimmed === "list") {
      const modeLines = currentModes.map((m, idx) => {
        const status = m.enabled !== false ? "[✓]" : "[x]";
        const isCurrent = (m.id === state.mode || m.id === (state as any).activeModeId) ? " ▸" : "  ";
        const reasoningTag = `[${m.reasoning || "low"}]`;
        return `${isCurrent} [${idx + 1}] ${m.id} (${m.name}) ${reasoningTag} · flow: ${m.flow} · action: ${m.action} · hud: ${m.hud} · ${m.slots?.length || 0} slots ${status}`;
      });
      const report =
        `✦ [pi-lingual Modes Registry] (Current: ${state.mode})\n` +
        modeLines.join("\n") +
        `\n\nUsage: /lingual mode [list | add <id> <name> [flow] [action] [hud] | rm <id> | toggle <id> | reset]`;
      ctx.ui.notify(report, "info");
      return;
    }

    const parts = trimmed.split(/\s+/);
    const subCmd = parts[0].toLowerCase();
    const id = parts[1]?.toLowerCase();

    if (subCmd === "reset") {
      const defaults = getDefaultFactoryModes(state.sourceLang, disk.explainLang);
      state.modes = defaults;
      saveUserLingualConfig({ modes: defaults });
      ctx.ui.notify(`[${pair}] Reset modes registry to factory golden defaults (${defaults.map((m) => m.name).join(" & ")})`, "info");
      updateFooter(ctx);
      return;
    }

    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del" || subCmd === "delete") {
      if (!id) {
        ctx.ui.notify(`[${pair}] Missing mode ID. Usage: /lingual mode rm <id>`, "warning");
        return;
      }
      const updated = removeCustomMode(currentModes, id);
      if (updated.length === currentModes.length) {
        ctx.ui.notify(`[${pair}] Mode [${id}] not found in modes registry.`, "warning");
        return;
      }
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      ctx.ui.notify(`[${pair}] Removed custom mode [${id}] from registry.`, "info");
      updateFooter(ctx);
      return;
    }

    if (subCmd === "toggle") {
      if (!id) {
        ctx.ui.notify(`[${pair}] Missing mode ID. Usage: /lingual mode toggle <id>`, "warning");
        return;
      }
      const updated = toggleCustomMode(currentModes, id);
      const target = updated.find((m) => m.id === id);
      if (!target) {
        ctx.ui.notify(`[${pair}] Mode [${id}] not found in modes registry.`, "warning");
        return;
      }
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      ctx.ui.notify(`[${pair}] Mode [${id}] is now ${target.enabled ? "enabled [✓]" : "disabled [x]"}.`, "info");
      updateFooter(ctx);
      return;
    }

    if (subCmd === "add") {
      if (!id || !parts[2]) {
        ctx.ui.notify(`[${pair}] Missing arguments. Usage: /lingual mode add <id> <name> [flow] [action] [hud]`, "warning");
        return;
      }
      const name = parts[2];
      const flow = (parts[3] as any) || "translate";
      const action = (parts[4] as any) || "transform";
      const hud = (parts[5] as any) || "preview";
      const customInstruction = parts.slice(6).join(" ").trim();
      const newMode: CustomModeConfig = {
        id,
        name,
        flow: flow === "proofread" || flow === "custom" ? flow : "translate",
        action: action === "pass-through" || action === "select" ? action : "transform",
        hud: hud === "tree" || hud === "adaptive-takeaway" || hud === "none" ? hud : "preview",
        slots: action === "select"
          ? getDefaultPromptSlots(state.sourceLang)
          : [
              {
                id: `${id}_slot`,
                label: name,
                role: "rewrite",
                instruction: customInstruction || `Translate and polish from \${sourceLang} into \${targetLang} matching ${name} style.`,
                enabled: true,
              },
            ],
        enabled: true,
      };
      const updated = addCustomMode(currentModes, newMode);
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      ctx.ui.notify(`[${pair}] Added custom mode [${id}] "${name}" to registry.`, "info");
      updateFooter(ctx);
      return;
    }

    ctx.ui.notify(`[${pair}] Unknown mode subcommand "${subCmd}". Usage: /lingual mode [list|add|rm|toggle|reset]`, "warning");
  };

  // Manage tactical loadouts (/lingual loadout [list | apply <id>])
  const manageLoadoutsHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(disk);
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    const loadouts = listPresetLoadouts();

    if (!trimmed || trimmed === "list" || trimmed === "ls") {
      const lines = loadouts.map((l, idx) => {
        const isInstalled = currentModes.some((m) => m.id === l.id);
        const status = isInstalled ? "[installed ✓]" : "[available]";
        return `  ${idx + 1}. [${l.id}] ${l.name} - ${l.description} ${status}`;
      });
      const report =
        `✦ [pi-lingual Tactical Loadouts]\n` +
        lines.join("\n") +
        `\n\nUsage: /lingual loadout [list | apply <id>] (e.g. /lingual loadout apply spec)`;
      ctx.ui.notify(report, "info");
      return;
    }

    const parts = trimmed.split(/\s+/);
    const subCmd = parts[0].toLowerCase();
    const targetId = (subCmd === "apply" || subCmd === "add" ? parts[1] : subCmd)?.toLowerCase();

    if (!targetId) {
      ctx.ui.notify(`[${pair}] Missing loadout ID. Usage: /lingual loadout apply <spec|commit|oss|yap>`, "warning");
      return;
    }

    const loadoutConfig = getPresetLoadout(targetId, state.sourceLang, disk.explainLang);
    if (!loadoutConfig) {
      ctx.ui.notify(
        `[${pair}] Loadout [${targetId}] not found. Available: ${loadouts.map((l) => l.id).join(", ")}`,
        "warning"
      );
      return;
    }

    const updated = addCustomMode(currentModes, loadoutConfig);
    state.modes = updated;
    saveUserLingualConfig({ modes: updated });
    ctx.ui.notify(
      `[${pair}] Applied tactical loadout [${loadoutConfig.id}] "${loadoutConfig.name}" to active modes! Run /lingual ${loadoutConfig.id} to activate.`,
      "info"
    );
    updateFooter(ctx);
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

  // Manage model reasoning effort level (/lingual reasoning [low|medium|high])
  const setReasoningHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim().toLowerCase();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(disk);
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: (state as any).activeModeId || disk.activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;

    if (!trimmed) {
      const activeEffort = activeMode.reasoning || disk.reasoning || "low";
      const globalEffort = disk.reasoning || "low";
      ctx.ui.notify(
        `[${pair}] Reasoning effort: mode [${activeMode.name}] = "${activeEffort}" · global = "${globalEffort}". Usage: /lingual reasoning <low|medium|high>`,
        "info"
      );
      return;
    }

    if (trimmed !== "low" && trimmed !== "medium" && trimmed !== "high") {
      ctx.ui.notify(
        `[${pair}] Invalid reasoning effort "${trimmed}". Available options: low, medium, high.`,
        "warning"
      );
      return;
    }

    const newEffort = trimmed as ReasoningEffort;
    const updatedModes = currentModes.map((m) =>
      m.id === activeMode.id ? { ...m, reasoning: newEffort } : m
    );
    state.modes = updatedModes;
    saveUserLingualConfig({ modes: updatedModes, reasoning: newEffort });
    ctx.ui.notify(
      `[${pair}] Reasoning effort for mode [${activeMode.name}] set to "${newEffort}".`,
      "info"
    );
    updateFooter(ctx);
  };

  // Master command bus: handles subcommands and mode cycling
  const masterCommandHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args?.trim();
    if (!trimmed) {
      // No args: cycle through active modes and off
      await setModeHandler("", ctx);
      return;
    }

    const lower = trimmed.toLowerCase();
    const spaceIndex = lower.indexOf(" ");
    const sub = spaceIndex === -1 ? lower : lower.slice(0, spaceIndex);
    const subArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    // 0. Subcommand: reasoning effort level (/lingual reasoning [low|medium|high])
    if (sub === "reasoning" || sub === "effort") {
      await setReasoningHandler(subArgs, ctx);
      return;
    }

    // 1.0 Subcommand: mode registry management (/lingual mode [args...])
    if (sub === "mode" || sub === "modes") {
      await manageModesHandler(subArgs, ctx);
      return;
    }

    // 1.01 Subcommand: tactical loadouts (/lingual loadout [list | apply <id>])
    if (sub === "loadout" || sub === "loadouts" || sub === "preset" || sub === "presets") {
      await manageLoadoutsHandler(subArgs, ctx);
      return;
    }

    // 1. Subcommand: language switching (/lingual lang [code])
    if (sub === "lang" || sub === "language") {
      await switchLangHandler(subArgs, ctx);
      return;
    }

    // 1.1 Subcommand: slot management (/lingual slots [args...])
    if (sub === "slots" || sub === "slot" || sub === "preset") {
      await switchSlotsHandler(subArgs, ctx);
      return;
    }

    // 1.2 Subcommand: fast toggle for source row
    if (sub === "hide-source" || sub === "no-source" || sub === "show-source" || sub === "with-source") {
      await switchSlotsHandler(sub, ctx);
      return;
    }

    // 2. Subcommand: model inspection and switching (/lingual model [id])
    if (sub === "model") {
      await setModelHandler(subArgs, ctx);
      return;
    }

    // 3. Subcommand: compact capsule / tree toggle (/lingual compact)
    if (sub === "compact" || sub === "capsule" || sub === "layout") {
      await toggleCompactHandler(subArgs, ctx);
      return;
    }

    // 4. Subcommand: status report (/lingual status)
    if (sub === "status" || sub === "info" || sub === "report") {
      await showStatusHandler(subArgs, ctx);
      return;
    }

    // 5. Subcommand: replay last card (/lingual last)
    if (sub === "last" || sub === "prev" || sub === "history") {
      await showLastHandler(subArgs, ctx);
      return;
    }

    // 6. Subcommand: on-demand tuner activation (/lingual tuner [request])
    if (sub === "tuner" || sub === "tune" || sub === "agent" || sub === "help" || sub === "?") {
      tunerArmed = true;
      const promptBody = subArgs
        ? `[lingual-tuner] Load the lingual-tuner skill and update ~/.pi/agent/lingual.json (user native language sourceLang="${state.sourceLang}"). Communicate strictly in the user's native language (${state.sourceLang}) and apply: ${subArgs}`
        : `[lingual-tuner] Load the lingual-tuner skill and launch the interactive customization wizard (user native language sourceLang="${state.sourceLang}"). Render the Customization Map and all questions/options strictly in the user's native language (${state.sourceLang}).`;
      if ((sub === "tuner" || sub === "tune" || subArgs) && typeof (pi as any).sendMessage === "function") {
        // Send invisible activation prompt with display: false to prevent chat clutter
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

    // 6.1 Subcommand: show release notes banner (/lingual news)
    if (sub === "news" || sub === "whatsnew" || sub === "changelog") {
      const diskCfg = loadUserLingualConfig();
      renderReleaseBanner(ctx, diskCfg.sourceLang || state.sourceLang);
      return;
    }

    // 6.2 Subcommand: mode locking & anti-drift protection (/lingual lock | /lingual unlock)
    if (sub === "lock") {
      state.modeLocked = true;
      saveUserLingualConfig({ modeLocked: true });
      const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
      const modeSpec = resolveModeDisplaySpec(state.sourceLang);
      const activeObj = state.modes.find((m) => m.id === state.mode);
      const currentName = activeObj ? activeObj.name : (state.mode === "off" ? modeSpec.off : state.mode);
      const template =
        state.labels.notifyModeLockedSuccess ||
        "[{pair}] Session mode locked to [{mode}]. Mode cycling is blocked. Run /lingual unlock to release.";
      const lockMsg = template
        .replace("{pair}", pair)
        .replace("{mode}", currentName);
      try {
        ctx.ui.notify(lockMsg, "info");
      } catch {}
      updateFooter(ctx);
      return;
    }

    if (sub === "unlock") {
      state.modeLocked = false;
      saveUserLingualConfig({ modeLocked: false });
      const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
      const template =
        state.labels.notifyModeUnlockedSuccess ||
        "[{pair}] Mode lock released. Free mode cycling and configuration sync restored.";
      const unlockMsg = template.replace("{pair}", pair);
      try {
        ctx.ui.notify(unlockMsg, "info");
      } catch {}
      updateFooter(ctx);
      return;
    }

    // 7. Mode jump by number, keyword, or registered custom mode ID (/lingual 1|2|3|0|commit|spec|...)
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(loadUserLingualConfig());
    const isMatchedMode = currentModes.some(
      (m) =>
        m.id.toLowerCase() === sub ||
        m.name.toLowerCase() === sub ||
        (Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === sub))
    );
    const numIdx = parseInt(sub, 10);
    const isNum = !isNaN(numIdx) && String(numIdx) === sub;
    const isKnownMode =
      sub === "mode" ||
      isMatchedMode ||
      (isNum && numIdx >= 0 && numIdx <= currentModes.length) ||
      normalizeLingualModeInput(sub) !== null;

    if (isKnownMode) {
      await setModeHandler(sub === "mode" ? subArgs : trimmed, ctx);
      return;
    }

    // 8. Direct language code input (/lingual ja | /lingual zh ja)
    const possibleLang = normalizeLangCode(sub);
    if (LANGUAGE_PRESETS[possibleLang]) {
      await switchLangHandler(trimmed, ctx);
      return;
    }

    // 9. Unrecognized subcommand safety guardrail: do NOT cycle mode on mistyped words
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    const template =
      state.labels.notifyUnrecognizedSubcommand ||
      "[{pair}] Unrecognized subcommand: \"{cmd}\". Current mode unchanged. Available: /lingual [1|2|3|0|lock|unlock|tuner|lang|slots|compact|status]";
    const unrecMsg = template
      .replace("{pair}", pair)
      .replace("{cmd}", trimmed);
    try {
      ctx.ui.notify(unrecMsg, "warning");
    } catch {}
  };

  // Core command matrix: register first-class commands (/lingual, /lang, /tuner, /lingual-mode, /slots, /last)
  pi.registerCommand("lingual", {
    description:
      state.labels.cmdDescMode ||
      "Cycle mode (1:Companion ➔ 2:Direct ➔ 3:Live-Flow ➔ 0:Off) or manage: /lingual [1|2|3|0|tuner|lang|slots|compact|model|status|last]",
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
    // Keyboard shortcuts: Alt+. and Alt+, (silent return in off mode)
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

  // Host-native model completer: zero-config in-process model execution
  const createModelCompleter = (ctx: ExtensionContext, defaultOpts?: { reasoning?: string }) => {
    return async (
      text: string,
      systemPrompt: string,
      signal?: AbortSignal,
      callOpts?: { reasoning?: string }
    ): Promise<string | null> => {
      try {
        if (!ctx.modelRegistry) return null;

        // 1. Resolve target model: follow active session or user-configured model
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

        // 2. Invoke Pi native streamSimple with credentials managed by host
        // Max tokens expanded to 1500 to prevent multi-slot JSON truncation
        const diskConfig = loadUserLingualConfig();
        const effectiveReasoning =
          callOpts?.reasoning ||
          defaultOpts?.reasoning ||
          diskConfig.reasoning ||
          "low";

        const requestOptions: Record<string, any> = {
          maxTokens: 1500,
          reasoning: effectiveReasoning,
        };

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

        // Timeout fuse: default 15s timeout with abort signal cooperation
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

  // Core input interceptor: transform prompt or pass through
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
        // Active mode is locked: refuse external disk override
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
    if (Array.isArray(latestDisk.modes) && latestDisk.modes.length > 0) {
      state.modes = latestDisk.modes;
    } else if (!state.modes || state.modes.length === 0) {
      state.modes = resolveModesFromConfig(latestDisk);
    }
    if (latestDisk.activeModeId && !state.modeLocked) {
      state.activeModeId = latestDisk.activeModeId;
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

    // Sanitize prompt: fold long traces, code blocks, and absolute paths
    const sanitized = sanitizePromptForTranslation(raw);
    const promptToTranslate = sanitized.distilledText;
    const latestModes = state.modes;
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId || latestDisk.activeModeId },
      latestModes
    );
    const currentMode = latestModes.find((m) => m.id === activeModeId) || latestModes[0];
    const isPromptOptMode = currentMode ? currentMode.action !== "pass-through" : (state.mode !== "original" && state.mode !== "off");

    // Condition 1: Pure code/stack traces with no natural language intent
    // Condition 2: CLI shield bypass or below character threshold
    if (
      !sanitized.hasNaturalLanguage ||
      !shouldTriggerTranslation(promptToTranslate, state.sourceLang, isPromptOptMode)
    ) {
      // Abort in-flight requests and clear pagination pool if prompt should not translate
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
    const resolvedReasoning = currentMode.reasoning ?? latestDisk.reasoning ?? "low";
    const completer = createModelCompleter(ctx, { reasoning: resolvedReasoning });

    // Single-card high-density intent condensation flow
    session.initPagination(1);

    // =========================================================================
    // Mode 1: Companion (original/companion) - 0ms non-blocking raw send + async HUD card
    // =========================================================================
    const isOriginalMode = state.mode === "original" || state.mode === "companion" || currentMode?.action === "pass-through";

    if (isOriginalMode) {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget("lingual_hud", undefined);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⇄ [lingual] polishing..."));
        } catch {}
      }

      clearTimeout(polishTimer);
      polishTimer = setTimeout(() => {
        polishTimer = undefined;
        if (!session.isLatest(generation) || (!isOriginalMode && signal.aborted)) {
          return;
        }

        const passThroughSlots: SlotConfig[] =
          currentMode && Array.isArray(currentMode.slots) && currentMode.slots.length > 0 && currentMode.id !== "companion"
            ? currentMode.slots.map((s) => ({
                id: s.id,
                label: s.label,
                role: s.role === "vocab" ? "vocab" : s.id === "source" ? "source" : "translation",
                instruction: s.instruction,
                showMeaning: true,
                enabled: s.enabled !== false,
              }))
            : state.slots;

        translatePrompt(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          labels: state.labels,
          slots: passThroughSlots,
          slotPreset: state.slotPreset,
          complete: completer,
          signal,
        })
          .then((result) => {
            if (!session.isLatest(generation) || signal.aborted) {
              return;
            }
            if (currentMode.hud === "none") {
              const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
              safeClearWidget(activeCtx);
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
    // Modes 2, 3, 4 declarative execution with strict slot isolation
    // =========================================================================
    const isSelectMode = state.mode === "select" || state.mode === "candidates" || currentMode.action === "select";
    const isModifyMode = !isSelectMode && (state.mode === "modify" || state.mode === "live-flow" || currentMode.flow === "proofread");
    const isDirectMode = !isSelectMode && !isModifyMode && (state.mode === "english" || state.mode === "direct" || currentMode.action === "transform");

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
    const hasExplicitLegacySlots = isModifyMode
      ? Array.isArray(latestDisk.modifySlots) && latestDisk.modifySlots.length > 0
      : isDirectMode
        ? Array.isArray(latestDisk.directSlots) && latestDisk.directSlots.length > 0
        : Array.isArray(latestDisk.promptSlots) && latestDisk.promptSlots.length > 0;

    const slotsToRun = isSelectMode
      ? (currentMode.action === "select" && currentMode.slots && currentMode.slots.length > 0
          ? currentMode.slots
          : [...(rewriteSlots.length > 0 ? rewriteSlots : getDefaultPromptSlots(state.sourceLang)), ...vocabSlots])
      : isModifyMode
        ? (currentMode.flow === "proofread" && currentMode.slots && currentMode.slots.length > 0
            ? currentMode.slots
            : (isolatedModeSlots.length > 0 ? isolatedModeSlots : getDefaultModifySlots(state.sourceLang, latestDisk.explainLang)))
        : isDirectMode
          ? (currentMode.action === "transform" && currentMode.flow === "translate" && currentMode.slots && currentMode.slots.length > 0
              ? currentMode.slots
              : [rewriteSlots[0] || fallbackFirst, ...vocabSlots])
          : (currentMode.slots && currentMode.slots.length > 0 ? currentMode.slots : getDefaultPromptSlots(state.sourceLang));

    if (hasActiveUI(ctx) && currentMode.hud !== "none") {
      try {
        const rawLoadingMsg = isModifyMode
          ? (state.labels.loadingFixSyntax || "  ⋯ [lingual] fixing syntax & typos...")
          : isDirectMode
            ? (state.labels.loadingOptimizePrompt || "  ⋯ [lingual] optimizing prompt...")
            : (state.labels.loadingCandidates || "  ⋯ [lingual] generating prompt candidates...");
        const loadingMsg = formatLoadingMessage(rawLoadingMsg);
        ctx.ui.setWidget("lingual_hud", [ctx.ui.theme.fg("muted", loadingMsg)], { placement: "aboveEditor" });
        ctx.ui.setStatus(
          "lingual",
          ctx.ui.theme.fg(
            "accent",
            isModifyMode
              ? (state.labels.statusLoadingFix || "[lingual] fixing...")
              : isDirectMode
                ? (state.labels.statusLoadingOptimize || "[lingual] optimizing...")
                : (state.labels.statusLoadingCandidates || "[lingual] generating candidates...")
          )
        );
      } catch {}
    } else if (hasActiveUI(ctx) && currentMode.hud === "none") {
      safeClearWidget(ctx);
    }

    try {
      let gitDiffContext = "";
      if (currentMode.id === "commit" || (currentMode as any).contextAware === true) {
        try {
          const diffOutput = execFileSync("git", ["diff", "--stat", "HEAD"], {
            encoding: "utf8",
            timeout: 250,
            stdio: ["ignore", "pipe", "ignore"],
          });
          if (diffOutput && diffOutput.trim()) {
            gitDiffContext = diffOutput.trim().slice(0, 300);
          } else {
            const statusOutput = execFileSync("git", ["status", "--short"], {
              encoding: "utf8",
              timeout: 250,
              stdio: ["ignore", "pipe", "ignore"],
            });
            if (statusOutput && statusOutput.trim()) {
              gitDiffContext = statusOutput.trim().slice(0, 300);
            }
          }
        } catch {}
      }

      const modeToRun: CustomModeConfig = {
        ...currentMode,
        action: isSelectMode ? "select" : isDirectMode || isModifyMode ? "transform" : currentMode.action,
        flow: isModifyMode ? "proofread" : currentMode.flow,
        slots: slotsToRun,
      };
      const candidates = await executeModeRunner(promptToTranslate, modeToRun, {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        explainLang: latestDisk.explainLang,
        context: gitDiffContext,
        complete: completer,
        signal,
      });

      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }

      if (!candidates || candidates.length === 0) {
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          if (currentMode.action === "transform") {
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
      const isProofreadFlow = currentMode.flow === "proofread";
      const isAdaptiveTakeaway = currentMode.hud === "adaptive-takeaway" || isProofreadFlow;
      const isLongModifyInput = isAdaptiveTakeaway && (promptToTranslate.length > 120 || (promptToTranslate.match(/[.!?。！？\n]/g) || []).length >= 3);
      const keepSourceRow = !isProofreadFlow && (currentMode.slots || []).some((s) => s.id === "source" && s.enabled !== false);
      const takeawayLabel = isProofreadFlow
        ? (slotsToRun.find((s) => s.role === "vocab")?.label || "Takeaway")
        : (state.labels.vocabLabel || "Vocab");

      const candidateSlotResults: SlotResult[] = [
        ...(keepSourceRow
          ? [{ id: "source", label: state.labels.sourceLabel || "Original", role: "source" as const, content: singleLineSource }]
          : []),
        ...(!isLongModifyInput
          ? candidates.map((c, idx) => ({
              id: c.id,
              label: isProofreadFlow ? c.label : currentMode.action === "transform" ? `⚡${c.label}` : `${idx + 1}:${c.label}`,
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
        if (currentMode.hud === "none") {
          safeClearWidget(ctx);
        } else {
          const hasMultipleTranslationSlots = candidateSlotResults.filter(
            (s) => s.role !== "vocab" && s.id !== "source"
          ).length > 1;
          const isPreviewHud = currentMode.hud === "preview" && !hasMultipleTranslationSlots;
          const effectiveMaxLines = isPreviewHud ? 4 : 9;
          const displaySlotResults = isPreviewHud
            ? candidateSlotResults.filter((s, idx) => s.role === "vocab" || idx === 0)
            : candidateSlotResults;

          // Render card layout with 9-line UAX #11 box model and hanging indent wrapping
          const layoutSlots: SlotConfig[] = displaySlotResults.map((sr) => ({
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
              slots: displaySlotResults,
            },
            state.labels,
            {
              maxCols,
              maxLines: effectiveMaxLines,
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
      }

      // Resolve chosen text for transform action using primarySlotId or first rewrite slot
      let chosenText = candidates[0].content;
      if (currentMode.primarySlotId) {
        const match = candidates.find((c) => c.id.toLowerCase() === currentMode.primarySlotId?.toLowerCase());
        if (match) chosenText = match.content;
      } else if (isProofreadFlow) {
        const fixedCandidate = candidates.find((c) => c.id === "fixed");
        if (fixedCandidate) chosenText = fixedCandidate.content;
      } else {
        const firstRewrite = candidates.find((c) => c.id !== "source" && c.id !== "vocab");
        if (firstRewrite) chosenText = firstRewrite.content;
      }

      if (isSelectMode && hasActiveUI(ctx)) {
        const langCode = (state.sourceLang || "en").toLowerCase().split("-")[0];
        const sp = resolveSelectPrompts(langCode, candidates.length);

        if (typeof (ctx.ui as any).custom === "function") {
          // Compact capsule hotkey bar: press number keys 1..N to send candidate in 0ms without Enter
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
                // Wrap pills to ensure [1]..[N] and [0] remain fully visible on narrow viewports
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
                // 1. Number keys 1..9 send immediately without pressing Enter
                if (/^[1-9]$/.test(keyData)) {
                  const num = parseInt(keyData, 10);
                  if (num >= 1 && num <= candidates.length) {
                    done(candidates[num - 1].content);
                    return;
                  }
                }
                // 2. Key '0' or Esc / Ctrl+C passes through original raw text
                if (
                  keyData === "0" ||
                  keyData === "\x1b" ||
                  keyData === "\x03" ||
                  keybindings?.matches?.(keyData, "tui.select.cancel")
                ) {
                  done("__ORIGINAL__");
                  return;
                }
                // 3. Arrow keys / hjkl cycle capsule selection
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
                // 4. Enter / Space confirms currently highlighted candidate
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
          // Fallback select picker when ctx.ui.custom is unavailable
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

      // 100% untruncated payload preserved for Coding Agent or clipboard
      let finalText = sanitized.rawPayload
        ? `${chosenText}\n\n${sanitized.rawPayload}`
        : chosenText;

      const diskConfig = loadUserLingualConfig();
      if (
        currentMode.target !== "clipboard" &&
        shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)
      ) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }

      if (currentMode.target === "clipboard") {
        copyToClipboard(finalText);
        if (hasActiveUI(ctx)) {
          const template =
            state.labels.notifyClipboardCopied ||
            "Copied to clipboard (prompt intercepted - not sent to agent). Ready to paste into GitHub, PR, or X.";
          ctx.ui.notify(`[${state.labels.hudTitle}] ` + template, "info");
        }
        return { action: "handled" };
      }

      return {
        action: "transform",
        text: finalText,
        images: event.images,
      };
    } catch {
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        if (currentMode.action === "transform") {
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
