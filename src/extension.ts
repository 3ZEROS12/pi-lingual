import type {
  ExtensionAPI,
  ExtensionContext,
  InputEvent,
  InputEventResult,
} from "@earendil-works/pi-coding-agent";
import type {
  CustomModeConfig,
  ExtensionState,
  LingualMode,
  LingualResult,
  PromptSlotConfig,
  SlotConfig,
  SlotResult,
} from "./types.js";
import {
  resolveModeRuntime,
  primarySlot,
  runtimeLanguagePair,
  buildStreamingResult,
  pickPrimaryContent,
  type ModeRuntime,
} from "./runtime.js";
import {
  getEffectiveMaxCols,
  getBannerMaxCols,
  renderCardLayout,
  formatLoadingMessage,
} from "./layout.js";
import {
  translatePrompt,
  stripLingualContextWhenOff,
  formatReleaseBannerLines,
  resolveReleaseBannerLang,
  CURRENT_FEATURE_BANNER_VERSION,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
  resolveDirectSlotsFromConfig,
  resolveCandidateSlotsFromConfig,
  resolveModifySlotsFromConfig,
  shouldTriggerTranslation,
  isDynamicLongInput,
  isTestEnvironment,
  loadUserLingualConfig,
  saveUserLingualConfig,
  resolveModesFromConfig,
  normalizeActiveModeId,
  executeModeRunner,
  shouldInjectNativeReplyGuard,
  formatNativeReplyGuardHint,
  localizeModes,
  localizeSlotLabel,
} from "./engine.js";
import {
  resolveLabelsForLang,
  resolveSlotsForPreset,
  getDefaultSlots,
  getDefaultFactoryModes,
  isSupportedLangCode,
} from "./presets.js";
import { LingualSessionController } from "./fsm.js";
import { sanitizePromptForTranslation } from "./sanitizer.js";
import {
  isTargetLanguageOnly,
  isImperativeEngineeringPrompt,
  detectScriptLanguage,
} from "./shield.js";
import {
  hasActiveUI,
  safeClearWidget,
  copyToClipboard,
  captureGitContextSnapshot,
  extractRecentContextAnchor,
} from "./context.js";
import { createModelCompleter } from "./completer.js";
import { pickCandidateInteractive } from "./pickers.js";
import { createCommandHandlers } from "./commands.js";

export { extractRecentContextAnchor } from "./context.js";

const initialDiskConfig = isTestEnvironment() ? {} : loadUserLingualConfig();
const initialSourceLang = initialDiskConfig.sourceLang || (isTestEnvironment() ? "en" : resolveReleaseBannerLang());
const initialTargetLang = initialDiskConfig.targetLang || (initialSourceLang === "en" ? "ja" : "en");
const initialSlotPreset = initialDiskConfig.slotPreset;
const initialSlots = initialDiskConfig.slots?.length
  ? initialDiskConfig.slots
  : (initialSlotPreset ? resolveSlotsForPreset(initialSlotPreset, initialSourceLang) : getDefaultSlots(initialSourceLang));
const initialDirectSlots = initialDiskConfig.directSlots?.length ? initialDiskConfig.directSlots : getDefaultDirectSlots(initialSourceLang);
const initialPromptSlots = initialDiskConfig.promptSlots?.length ? initialDiskConfig.promptSlots : getDefaultPromptSlots(initialSourceLang);
const initialModifySlots = initialDiskConfig.modifySlots?.length ? initialDiskConfig.modifySlots : getDefaultModifySlots(initialSourceLang);
const initialModes = resolveModesFromConfig(initialDiskConfig, initialSourceLang);
const initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);
const initialRawMode = initialDiskConfig.activeModeId || initialDiskConfig.mode || "companion";
const initialNormalizedMode = normalizeActiveModeId({ mode: initialRawMode, activeModeId: initialRawMode }, initialModes) as LingualMode;

const state: ExtensionState = {
  mode: initialNormalizedMode,
  activeModeId: initialNormalizedMode,
  defaultMode: initialDiskConfig.defaultMode || "companion",
  modeLocked: Boolean(initialDiskConfig.modeLocked),
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  explainLang: initialDiskConfig.explainLang || (initialSourceLang === "zh" || initialSourceLang === "tw" ? "zh" : initialSourceLang),
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

function updateFooter(ctx: ExtensionContext | null | undefined) {
  if (!hasActiveUI(ctx)) return;
  try {
    if (state.mode === "off") {
      // Stealth off mode: completely remove status bar badge (0 visual pixels)
      ctx.ui.setStatus("lingual", undefined as any);
      return;
    }

    const rt = activeRuntime();

    // Normalize status bar badge to clean minimal A ⇄ B (e.g. en ⇄ ja).
    // A `custom` flow advertises its own declared pair instead of the session pair.
    let pair = runtimeLanguagePair(rt, `${state.sourceLang} ⇄ ${state.targetLang}`);

    // The badge summarises the ACTIVE MODE's slot anatomy (mode is the single source of truth),
    // falling back to the global slot set only when the mode carries none.
    const enabledSlots = (rt.slots.length > 0 ? rt.slots : state.slots || []).filter(
      (s) => s.enabled !== false
    );
    const nonSourceCount = enabledSlots.filter((s) => s.role !== "source").length;

    // Retain slot count indicator only when slot anatomy differs from the 2-slot baseline.
    if (nonSourceCount !== 2 && enabledSlots.length > 0) {
      pair += ` · ${enabledSlots.length}s`;
    } else if (state.slotPreset) {
      pair += ` · ${state.slotPreset}`;
    }

    ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${rt.name}`));
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

/**
 * Resolves the slot set a mode falls back to when it declares none of its own.
 * Keeps legacy `slots` / `directSlots` / `promptSlots` / `modifySlots` configs alive
 * without letting them override a mode's own declaration.
 */
function fallbackSlotsFor(mode: CustomModeConfig): (SlotConfig | PromptSlotConfig)[] {
  if (mode.action === "select") {
    return resolveCandidateSlotsFromConfig({ sourceLang: state.sourceLang, promptSlots: state.promptSlots });
  }
  if (mode.flow === "proofread") {
    return resolveModifySlotsFromConfig({ sourceLang: state.sourceLang, explainLang: state.explainLang, modifySlots: state.modifySlots });
  }
  if (mode.action === "transform") {
    return resolveDirectSlotsFromConfig({ sourceLang: state.sourceLang, directSlots: state.directSlots });
  }
  return state.slots;
}

/** Runtime contract for a mode, derived only from its declaration. */
function runtimeForMode(mode: CustomModeConfig): ModeRuntime {
  return resolveModeRuntime(mode, {
    sourceLang: state.sourceLang,
    targetLang: state.targetLang,
    explainLang: state.explainLang,
    fallbackSlots: fallbackSlotsFor(mode),
    globalKillList: loadUserLingualConfig().globalKillList,
  });
}

function activeRuntime(): ModeRuntime {
  const id = normalizeActiveModeId({ mode: state.mode, activeModeId: state.activeModeId }, state.modes);
  const mode = state.modes.find((m) => m.id === id) || state.modes[0];
  if (mode) return runtimeForMode(mode);
  return resolveModeRuntime(
    { id: "companion", name: "Companion", flow: "translate", action: "pass-through", hud: "tree", slots: state.slots },
    { sourceLang: state.sourceLang, targetLang: state.targetLang, fallbackSlots: state.slots }
  );
}

/**
 * Renders the active mode's HUD using the mode's own slots and hud variant.
 * The renderer never reads the global slot set unless the mode declares none.
 */
function renderHudWidget(
  ctx: ExtensionContext,
  result: LingualResult,
  rt: ModeRuntime,
  extras?: { pageTag?: string; isLong?: boolean; isStreaming?: boolean }
) {
  if (!hasActiveUI(ctx)) return;
  if (rt.hud === "none") {
    safeClearWidget(ctx);
    return;
  }
  try {
    const isCompact = state.compact || (process.stdout?.rows ? process.stdout.rows < 22 : false);
    const maxCols = getEffectiveMaxCols();
    const hudSlots = rt.slots.length > 0 ? rt.slots : state.slots;

    const lines = renderCardLayout(result, state.labels, {
      maxCols,
      maxLines: rt.hud === "preview" ? 2 : (extras?.isLong ? 10 : 9),
      isCompact,
      variant: rt.hud,
      isLong: extras?.isLong,
      isStreaming: extras?.isStreaming,
      slots: hudSlots as SlotConfig[],
      pageTag: extras?.pageTag || "",
      themeDecorators: {
        muted: (s: string) => ctx.ui.theme.fg("muted", s),
        accent: (s: string) => ctx.ui.theme.fg("accent", s),
        dim: (s: string) => ctx.ui.theme.fg("dim", s),
      },
    });

    if (lines.length === 0) {
      safeClearWidget(ctx);
      return;
    }
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

    const rt = activeRuntime();
    const pageTag = snapshot.readyCount > 1
      ? ctx.ui.theme.fg("muted", ` [${snapshot.pageIndex + 1}/${snapshot.readyCount} ⌥.]`)
      : "";
    renderHudWidget(ctx, res, rt, { pageTag });
  } catch {
    // Gracefully ignore stale context during session replacement or teardown
  }
}

function refreshActiveView(ctx: ExtensionContext) {
  if (!hasActiveUI(ctx)) return;
  if (session.getReadyPages().length > 0) {
    renderActiveCard(ctx);
  } else if (session.getLastResult()) {
    const last = session.getLastResult()!;
    renderHudWidget(ctx, last, activeRuntime());
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
      if (!hasActiveUI(lastContext)) return;
      if (showingReleaseBanner) {
        renderReleaseBanner(lastContext);
        return;
      }
      const activeObj = state.modes.find((m) => m.id === state.mode);
      if (activeObj?.hud === "none") return;
      const active = session.getActiveResult() || session.getLastResult();
      if (active) {
        renderActiveCard(lastContext);
      }
    }, 120);
  };

  const syncResizeListener = () => {
    const prevResize = (globalThis as any).__piLingualResizeListener;
    if (prevResize && prevResize !== onResize && process.stdout && typeof (process.stdout as any).off === "function") {
      (process.stdout as any).off("resize", prevResize);
    }
    if (state.mode === "off") {
      if (prevResize === onResize) {
        (process.stdout as any)?.off?.("resize", onResize);
      }
      (globalThis as any).__piLingualResizeListener = undefined;
      return;
    }
    if (prevResize !== onResize) {
      (globalThis as any).__piLingualResizeListener = onResize;
      process.stdout?.on("resize", onResize);
    }
  };
  syncResizeListener();

  const clearPendingTimers = () => {
    if (polishTimer) { clearTimeout(polishTimer); polishTimer = undefined; }
    if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = undefined; }
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

    if (diskCfg.sourceLang) state.sourceLang = diskCfg.sourceLang;
    if (diskCfg.targetLang) state.targetLang = diskCfg.targetLang;
    state.explainLang = diskCfg.explainLang || (state.sourceLang === "zh" || state.sourceLang === "tw" ? "zh" : state.sourceLang);
    state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);

    state.modes = Array.isArray(diskCfg.modes) && diskCfg.modes.length > 0
      ? localizeModes(diskCfg.modes, state.sourceLang, state.explainLang || state.sourceLang)
      : resolveModesFromConfig(diskCfg, state.sourceLang);
    // Single source of truth:
    // If brand-new session (event?.reason === "new" || "startup" || !event?.reason), initialize strictly to defaultMode (Mode 1 "companion").
    // If resuming or switching session (event?.reason === "resume" || "switch" || "fork" || "reload"), preserve active mode.
    const isBrandNewSession = event?.reason === "new" || event?.reason === "startup" || !event?.reason;
    const targetDefault = diskCfg.defaultMode || "companion";
    state.defaultMode = targetDefault;

    const rawDiskMode = isBrandNewSession
      ? targetDefault
      : (diskCfg.activeModeId || diskCfg.mode || targetDefault || state.mode);
    state.mode = normalizeActiveModeId({ mode: rawDiskMode, activeModeId: rawDiskMode }, state.modes);
    state.activeModeId = state.mode;

    // Single source of truth for multi-session: brand-new session initializes strictly to defaultMode,
    // persisting to disk when an activeModeId already exists so subsequent input turns stay locked to defaultMode.
    if (isBrandNewSession && diskCfg.activeModeId && diskCfg.activeModeId !== state.mode) {
      saveUserLingualConfig({ activeModeId: state.mode, mode: state.mode });
    }
    if (diskCfg.slots && Array.isArray(diskCfg.slots) && diskCfg.slots.length > 0) {
      state.slots = (state.sourceLang === "zh" || state.sourceLang === "tw")
        ? diskCfg.slots
        : diskCfg.slots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }));
    }
    if (diskCfg.directSlots?.length) state.directSlots = diskCfg.directSlots;
    if (diskCfg.promptSlots?.length) state.promptSlots = diskCfg.promptSlots;

    // Auto-heal Chinese residue on disk if sourceLang is not Chinese (RFC 2119 Invariant 18)
    if (state.sourceLang !== "zh" && state.sourceLang !== "tw") {
      const serialized = JSON.stringify(diskCfg.modes || "");
      if (/[\u4e00-\u9fa5]/.test(serialized)) {
        saveUserLingualConfig({ modes: state.modes, explainLang: state.explainLang });
      }
    }
    syncResizeListener();
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
      if (hasActiveUI(ctx)) safeClearWidget(ctx);
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

  const handlers = createCommandHandlers({
    state,
    session,
    updateFooter,
    refreshActiveView,
    renderActiveCard,
    renderHudWidget,
    activeRuntime,
    renderReleaseBanner,
    syncResizeListener,
    clearPendingTimers,
    armTuner: () => {
      tunerArmed = true;
    },
    pi,
  });

  // Core command matrix: register first-class commands (/lingual, /l, /lang)
  pi.registerCommand("lingual", {
    description:
      state.labels.cmdDescMode ||
      "Interactive mode picker or manage: /lingual [1|2|3|0|on|off|default|lang|last|lock|status]",
    handler: handlers.masterCommandHandler,
  });

  pi.registerCommand("l", {
    description: "Alias for /lingual",
    handler: handlers.masterCommandHandler,
  });

  pi.registerCommand("lang", {
    description: "Switch companion language (alias for /lingual lang): /lang <pair>",
    handler: handlers.switchLangHandler,
  });

  if (typeof pi.registerShortcut === "function") {
    // Keyboard shortcuts: Alt+. and Alt+, (silent return in off mode)
    pi.registerShortcut("alt+.", {
      description: state.labels.shortcutNextPage || "Switch to next companion segment",
      handler: async (ctx) => {
        if (state.mode !== "off" && session.nextPage()) renderActiveCard(ctx);
      },
    });

    pi.registerShortcut("alt+,", {
      description: state.labels.shortcutPrevPage || "Switch to previous companion segment",
      handler: async (ctx) => {
        if (state.mode !== "off" && session.prevPage()) renderActiveCard(ctx);
      },
    });

    pi.registerShortcut("alt+c", {
      description: state.labels.shortcutCopyLast || "Copy current or last lingual card to clipboard",
      handler: async (ctx) => {
        if (state.mode !== "off") {
          await handlers.copyLastHandler("", ctx);
        }
      },
    });
  }

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
    if (latestDisk.modeLocked !== undefined) state.modeLocked = latestDisk.modeLocked;
    if (latestDisk.modes?.length) {
      state.modes = latestDisk.modes;
    } else if (!state.modes?.length) {
      state.modes = resolveModesFromConfig(latestDisk);
    }

    if (footerNeedsRefresh && hasActiveUI(ctx)) {
      updateFooter(ctx);
    }

    if (state.mode === "off") return { action: "continue" };

    const raw = event.text.trim();
    if (!raw) return { action: "continue" };

    // Input-driven locale adaptation on cold boot (English OS fallback safeguard)
    if (!latestDisk.sourceLang && state.sourceLang === "en" && (state.mode === "companion" || state.mode === "original")) {
      const detected = detectScriptLanguage(raw);
      if (detected && detected !== "en") {
        state.sourceLang = detected;
        state.targetLang = "en";
        state.labels = resolveLabelsForLang(state.sourceLang, undefined, state.targetLang);
        const isFactory =
          state.modes.length === 3 &&
          state.modes.every((m) => ["companion", "direct", "live-flow"].includes(m.id));
        if (isFactory) {
          state.modes = getDefaultFactoryModes(state.sourceLang, state.targetLang);
        }
        // Input is truth: silently persist calibrated language pair to disk for future sessions
        saveUserLingualConfig({ sourceLang: state.sourceLang, targetLang: state.targetLang });
        if (hasActiveUI(ctx)) {
          updateFooter(ctx);
        }
      }
    }

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
    // Single derived contract: dispatcher, flow, hud, target, langs and slots all come from here.
    const rt = runtimeForMode(currentMode);
    const isPromptOptMode = rt.dispatcher !== "pass-through";

    // G3 Target-language direct input bypass (zero token waste when user writes directly in target language)
    const isTargetInput = isTargetLanguageOnly(promptToTranslate, state.sourceLang, state.targetLang);
    if (isTargetInput) {
      if (rt.dispatcher === "pass-through") {
        // Companion mode: 0ms pass-through, user already authored directly in target language
        clearPendingTimers();
        session.abortActive();
        session.clearPagination();
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `[${state.targetLang} · direct]`));
        }
        return { action: "continue" };
      }

      if (rt.dispatcher === "transform" && rt.flow === "translate" && isImperativeEngineeringPrompt(promptToTranslate)) {
        // Direct spec mode: prompt already begins with an imperative engineering verb (e.g. Fix, Add, Refactor)
        clearPendingTimers();
        session.abortActive();
        session.clearPagination();
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `[${state.targetLang} · spec ok]`));
        }
        return { action: "continue" };
      }
    }

    // Condition 1: Pure code/stack traces with no natural language intent
    // Condition 2: CLI shield bypass or below character threshold
    if (!sanitized.hasNaturalLanguage || !shouldTriggerTranslation(promptToTranslate, state.sourceLang, isPromptOptMode)) {
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
    const resolvedReasoning = rt.reasoning ?? latestDisk.reasoning ?? "low";
    const completer = createModelCompleter(ctx, () => state.selectedModel, { reasoning: resolvedReasoning });

    // Single-card high-density intent condensation flow
    session.initPagination(1);

    // =========================================================================
    // Dispatcher: pass-through (0ms raw send + async streaming HUD card)
    // =========================================================================
    if (rt.dispatcher === "pass-through") {
      const hudSlots = (rt.slots.length > 0 ? rt.slots : state.slots) as SlotConfig[];
      const isLong = isDynamicLongInput(promptToTranslate, state.sourceLang);

      // 0ms anchor: paint the source line before the model answers, so the
      // 5-second generation gap is never an empty screen.
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⇄ [lingual] polishing..."));
        } catch {}
        renderHudWidget(
          ctx,
          { spoken: "", written: "", sourceText: promptToTranslate, annotated: "" },
          rt,
          { isLong }
        );
      }

      // Progressive paint: partial JSON fields land as tokens stream in.
      let lastPaint = 0;
      const paintPartial = (fields: Record<string, string>) => {
        const now = Date.now();
        if (now - lastPaint < 90) return;
        lastPaint = now;
        if (!session.isLatest(generation) || signal.aborted) return;
        const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
        if (!activeCtx) return;
        renderHudWidget(activeCtx, buildStreamingResult(fields, promptToTranslate), rt, {
          isLong,
          isStreaming: true,
        });
      };

      clearTimeout(polishTimer);
      polishTimer = setTimeout(() => {
        polishTimer = undefined;
        if (!session.isLatest(generation) || signal.aborted) {
          return;
        }

        translatePrompt(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          labels: state.labels,
          slots: hudSlots,
          slotPreset: state.slotPreset,
          killList: rt.killList,
          globalKillList: rt.globalKillList,
          complete: completer,
          signal,
          onPartial: paintPartial,
          context: extractRecentContextAnchor(ctx),
        })
          .then((result) => {
            if (!session.isLatest(generation) || signal.aborted) {
              return;
            }
            if (!result) return;

            session.setPageResult(0, result, generation);
            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
            if (!activeCtx) return;

            // `target: "clipboard"` is honoured for pass-through modes too.
            if (rt.target === "clipboard") {
              const chosen = pickPrimaryContent(result, rt);
              if (chosen) {
                copyToClipboard(chosen);
                activeCtx.ui.notify("[lingual] Copied to clipboard", "info");
              }
              safeClearWidget(activeCtx);
              return;
            }

            renderHudWidget(activeCtx, result, rt, { isLong });
          })
          .catch(() => {})
          .finally(() => {
            if (session.isLatest(generation)) {
              const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
              if (activeCtx) updateFooter(activeCtx);
            }
          });
      }, 80);

      return { action: "continue" };
    }

    // =========================================================================
    // Dispatcher: transform / select (declarative execution, mode-owned slots)
    // =========================================================================
    const isSelectMode = rt.dispatcher === "select";
    const isModifyMode = rt.isProofread;
    const isDirectMode = rt.dispatcher === "transform";
    const isLongInput = isDynamicLongInput(promptToTranslate, state.sourceLang);

    // The mode owns its slot anatomy. `runtimeForMode` already resolved the
    // legacy fallback set for modes that declare no slots of moral code or own slots.
    const slotsToRun: PromptSlotConfig[] = rt.slots.length > 0 ? rt.slots : [];

    let lastPaint = 0;
    const onPartial =
      hasActiveUI(ctx) && rt.hud !== "none"
        ? (fields: Record<string, string>) => {
            if (Object.keys(fields).length === 0) return;
            const now = Date.now();
            if (now - lastPaint < 90) return;
            lastPaint = now;
            if (!session.isLatest(generation) || signal.aborted) return;
            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
            if (!activeCtx) return;
            renderHudWidget(activeCtx, buildStreamingResult(fields, promptToTranslate), rt, {
              isLong: isLongInput,
              isStreaming: true,
            });
          }
        : undefined;

    if (hasActiveUI(ctx) && rt.hud !== "none") {
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
    } else if (hasActiveUI(ctx) && rt.hud === "none") {
      safeClearWidget(ctx);
    }

    try {
      let recentContext = "";
      if (currentMode.id === "commit" || (currentMode as any).contextAware === true || rt.contextAware) {
        recentContext = captureGitContextSnapshot();
      }

      // Mode 2 (Intent Compiler) & context-aware modes: siphon recent assistant anchor for pronoun resolution
      if (isDirectMode || (currentMode as any).contextAware === true || rt.contextAware) {
        const assistantAnchor = extractRecentContextAnchor(ctx);
        if (assistantAnchor) {
          recentContext = recentContext
            ? `${recentContext}\n[LAST AGENT SUMMARY]: ${assistantAnchor}`
            : `[LAST AGENT SUMMARY]: ${assistantAnchor}`;
        }
      }

      const modeToRun: CustomModeConfig = {
        ...currentMode,
        action: isSelectMode ? "select" : isDirectMode || isModifyMode ? "transform" : currentMode.action,
        flow: isModifyMode ? "proofread" : currentMode.flow,
        slots: slotsToRun,
      };
      const candidates = await executeModeRunner(promptToTranslate, modeToRun, {
        sourceLang: rt.inputLang,
        targetLang: rt.outputLang,
        explainLang: rt.explainLang,
        globalKillList: rt.globalKillList,
        context: recentContext,
        complete: completer,
        signal,
        onPartial,
      });

      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }

      if (!candidates || candidates.length === 0) {
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          if (rt.dispatcher === "transform") {
            try {
              ctx.ui.notify("[lingual] prompt rewrite timed out; original prompt passed", "warning");
            } catch {}
          }
        }
        return { action: "continue" };
      }

      const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " ↵ ");
      const candidateVocab = candidates[0]?.vocab;
      const keepSourceRow = rt.slots.some((s) => s.role === "source");
      const takeawayLabel = rt.takeawaySlot?.label || state.labels.vocabLabel || "Vocab";

      const candidateSlotResults: SlotResult[] = [
        ...(keepSourceRow
          ? [{ id: "source", label: state.labels.sourceLabel || "Original", role: "source" as const, content: singleLineSource }]
          : []),
        ...candidates.map((c, idx) => ({
          id: c.id,
          label: isModifyMode ? c.label : isSelectMode ? `${idx + 1}:${c.label}` : `⚡${c.label}`,
          role: "translation" as const,
          content: c.content.replace(/\s*\r?\n\s*/g, " ↵ "),
          meaning: c.meaning,
          hideWhenLong: c.hideWhenLong,
        })),
        ...(candidateVocab
          ? [{ id: "vocab", label: takeawayLabel, role: "vocab" as const, content: candidateVocab }]
          : []),
      ];

      const result: LingualResult = {
        sourceText: singleLineSource,
        spoken: candidates[0].content.replace(/\s*\r?\n\s*/g, " ↵ "),
        spokenMeaning: candidates[0].meaning,
        written: candidates[1]?.content.replace(/\s*\r?\n\s*/g, " ↵ ") || "",
        writtenMeaning: candidates[1]?.meaning,
        vocab: candidateVocab,
        annotated: "",
        slots: candidateSlotResults,
        slotOutputs: Object.fromEntries(
          candidates.map((c) => [
            c.id,
            { content: c.content.replace(/\s*\r?\n\s*/g, " ↵ "), meaning: c.meaning },
          ])
        ),
      };

      session.setPageResult(0, result, generation);

      // The renderer owns hud variant selection (tree / preview / takeaway / none).
      renderHudWidget(ctx, result, rt, { isLong: isLongInput });

      // Resolve the dispatched payload from the mode's primary slot (no id special-casing).
      let chosenText = candidates[0].content;
      const dispatchSlot = primarySlot(rt);
      if (dispatchSlot) {
        const match = candidates.find((c) => c.id.toLowerCase() === dispatchSlot.id.toLowerCase());
        if (match) chosenText = match.content;
      } else {
        const firstRewrite = candidates.find((c) => c.id !== "source" && c.id !== "vocab");
        if (firstRewrite) chosenText = firstRewrite.content;
      }

      if (isSelectMode && hasActiveUI(ctx)) {
        const picked = await pickCandidateInteractive(ctx, candidates, state.sourceLang);
        if (!picked) {
          safeClearWidget(ctx);
          updateFooter(ctx);
          return { action: "continue" };
        }
        chosenText = picked;
      }

      // 100% untruncated payload preserved for Coding Agent or clipboard
      let finalText = sanitized.rawPayload ? `${chosenText}\n\n${sanitized.rawPayload}` : chosenText;
      const diskConfig = loadUserLingualConfig();
      if (rt.target !== "clipboard" && shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }

      if (rt.target === "clipboard") {
        copyToClipboard(finalText);
        if (hasActiveUI(ctx)) ctx.ui.notify("[lingual] Copied to clipboard", "info");
        return { action: "handled" };
      }

      return { action: "transform", text: finalText, images: event.images };
    } catch {
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        if (rt.dispatcher === "transform") {
          try { ctx.ui.notify("[lingual] prompt rewrite error; original prompt passed", "warning"); } catch {}
        }
      }
      return { action: "continue" };
    } finally {
      if (session.isLatest(generation)) {
        const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
        if (activeCtx) updateFooter(activeCtx);
      }
    }
  });
}
