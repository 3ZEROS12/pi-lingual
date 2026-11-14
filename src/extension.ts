import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ExtensionState, LingualMode } from "./types.js";
import { getBannerMaxCols } from "./layout.js";
import {
  CURRENT_FEATURE_BANNER_VERSION,
  formatReleaseBannerLines,
  getDefaultDirectSlots,
  getDefaultModifySlots,
  getDefaultPromptSlots,
  isTestEnvironment,
  loadUserLingualConfig,
  localizeModes,
  localizeSlotLabel,
  markConfigSynced,
  normalizeActiveModeId,
  resolveModesFromConfig,
  resolveReleaseBannerLang,
  saveUserLingualConfig,
  stripLingualContextWhenOff,
} from "./engine.js";
import {
  getDefaultFactoryModes,
  getDefaultSlots,
  isSupportedLangCode,
  resolveLabelsForLang,
  resolveSlotsForPreset,
} from "./presets.js";
import { LingualSessionController } from "./fsm.js";
import { hasActiveUI, safeClearWidget } from "./context.js";
import { createCommandHandlers } from "./commands.js";
import { createHudManager } from "./extension/hud.js";
import { createInputDispatcher } from "./extension/dispatcher.js";

export { extractRecentContextAnchor } from "./context.js";

const initialDiskConfig = isTestEnvironment() ? {} : loadUserLingualConfig();
const initialSourceLang =
  initialDiskConfig.sourceLang || (isTestEnvironment() ? "en" : resolveReleaseBannerLang());
const initialTargetLang = initialDiskConfig.targetLang || (initialSourceLang === "en" ? "ja" : "en");
const initialSlotPreset = initialDiskConfig.slotPreset;
const initialSlots = initialDiskConfig.slots?.length
  ? initialDiskConfig.slots
  : initialSlotPreset
    ? resolveSlotsForPreset(initialSlotPreset, initialSourceLang)
    : getDefaultSlots(initialSourceLang);
const initialDirectSlots = initialDiskConfig.directSlots?.length
  ? initialDiskConfig.directSlots
  : getDefaultDirectSlots(initialSourceLang);
const initialPromptSlots = initialDiskConfig.promptSlots?.length
  ? initialDiskConfig.promptSlots
  : getDefaultPromptSlots(initialSourceLang);
const initialModifySlots = initialDiskConfig.modifySlots?.length
  ? initialDiskConfig.modifySlots
  : getDefaultModifySlots(initialSourceLang);
const initialModes = resolveModesFromConfig(initialDiskConfig, initialSourceLang);
const initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);
const initialRawMode = initialDiskConfig.activeModeId || initialDiskConfig.mode || "companion";
const initialNormalizedMode = normalizeActiveModeId(
  { mode: initialRawMode, activeModeId: initialRawMode },
  initialModes
) as LingualMode;

const state: ExtensionState = {
  mode: initialNormalizedMode,
  activeModeId: initialNormalizedMode,
  defaultMode: initialDiskConfig.defaultMode || "companion",
  modeLocked: Boolean(initialDiskConfig.modeLocked),
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  explainLang:
    initialDiskConfig.explainLang ||
    (initialSourceLang === "zh" || initialSourceLang === "tw" ? "zh" : initialSourceLang),
  selectedModel: initialDiskConfig.selectedModel || "auto",
  slotPreset: initialSlotPreset || "",
  slots: initialSlots,
  directSlots: initialDirectSlots,
  promptSlots: initialPromptSlots,
  modifySlots: initialModifySlots,
  modes: initialModes,
  labels: initialLabels,
};

const session = new LingualSessionController();
const hud = createHudManager(state, session);
let lastContext: ExtensionContext | null = null;

export default function (pi: ExtensionAPI) {
  let polishTimer: NodeJS.Timeout | undefined;
  let resizeTimer: NodeJS.Timeout | undefined;
  let lastRawInputText = "";
  let showingReleaseBanner = false;
  let tunerArmed = false;

  const renderReleaseBanner = (ctx: ExtensionContext, explicitLang?: string): boolean => {
    if (!hasActiveUI(ctx)) return false;
    try {
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
      if (active) hud.renderActiveCard(lastContext);
    }, 120);
  };

  const syncResizeListener = () => {
    const prevResize = (globalThis as any).__piLingualResizeListener;
    if (
      prevResize &&
      prevResize !== onResize &&
      process.stdout &&
      typeof (process.stdout as any).off === "function"
    ) {
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
    let detectedLang: string | undefined;

    if (!diskCfg.sourceLang) {
      const detected = resolveReleaseBannerLang();
      detectedLang = detected;
      const detectedSource = isSupportedLangCode(detected) ? detected : "en";
      state.sourceLang = detectedSource;
      state.targetLang = detectedSource === "en" ? "ja" : "en";
      state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);
      state.explainLang =
        diskCfg.explainLang ||
        (state.sourceLang === "zh" || state.sourceLang === "tw" ? "zh" : state.sourceLang);
    } else {
      state.sourceLang = diskCfg.sourceLang;
      if (diskCfg.targetLang) state.targetLang = diskCfg.targetLang;
      state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);
      state.explainLang =
        diskCfg.explainLang ||
        (state.sourceLang === "zh" || state.sourceLang === "tw" ? "zh" : state.sourceLang);
    }
    if (diskCfg.selectedModel) state.selectedModel = diskCfg.selectedModel;
    if (diskCfg.compact !== undefined) state.compact = diskCfg.compact;
    if (diskCfg.modeLocked !== undefined) state.modeLocked = diskCfg.modeLocked;
    if (diskCfg.defaultMode) state.defaultMode = diskCfg.defaultMode;
    if (diskCfg.slotPreset !== undefined) state.slotPreset = diskCfg.slotPreset;

    state.slots = diskCfg.slots?.length
      ? diskCfg.slots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }))
      : diskCfg.slotPreset
        ? resolveSlotsForPreset(diskCfg.slotPreset, state.sourceLang)
        : getDefaultSlots(state.sourceLang);
    state.directSlots = diskCfg.directSlots?.length
      ? diskCfg.directSlots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }))
      : getDefaultDirectSlots(state.sourceLang);
    state.promptSlots = diskCfg.promptSlots?.length
      ? diskCfg.promptSlots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }))
      : getDefaultPromptSlots(state.sourceLang);
    state.modifySlots = diskCfg.modifySlots?.length
      ? diskCfg.modifySlots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }))
      : getDefaultModifySlots(state.sourceLang);

    const rawModes = diskCfg.modes?.length
      ? diskCfg.modes
      : getDefaultFactoryModes(state.sourceLang, state.explainLang);
    state.modes = localizeModes(rawModes, state.sourceLang, state.explainLang);

    const isBrandNewSession = event?.reason === "new" || event?.reason === "startup" || !event?.reason;
    const targetDefault = diskCfg.defaultMode || state.defaultMode || "companion";
    state.defaultMode = targetDefault;
    const rawDiskMode = isBrandNewSession
      ? targetDefault
      : diskCfg.activeModeId || diskCfg.mode || state.mode;
    state.mode = normalizeActiveModeId({ mode: rawDiskMode, activeModeId: rawDiskMode }, state.modes) as LingualMode;
    state.activeModeId = state.mode;

    syncResizeListener();
    if (hasActiveUI(ctx)) {
      safeClearWidget(ctx);
      if (
        state.mode !== "off" &&
        !isTestEnvironment() &&
        event?.reason !== "resume" &&
        diskCfg.lastSeenVersion !== CURRENT_FEATURE_BANNER_VERSION
      ) {
        if (renderReleaseBanner(ctx, detectedLang || diskCfg.sourceLang)) {
          saveUserLingualConfig({ lastSeenVersion: CURRENT_FEATURE_BANNER_VERSION });
        }
      }
    }
    markConfigSynced();
    hud.updateFooter(ctx);
  });

  pi.on("agent_start" as any, async (_event: any, ctx: ExtensionContext) => {
    if (showingReleaseBanner) {
      showingReleaseBanner = false;
      if (hasActiveUI(ctx)) safeClearWidget(ctx);
    }
  });

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
    updateFooter: hud.updateFooter,
    refreshActiveView: hud.refreshActiveView,
    renderActiveCard: hud.renderActiveCard,
    renderHudWidget: hud.renderHudWidget,
    activeRuntime: hud.activeRuntime,
    renderReleaseBanner,
    syncResizeListener,
    clearPendingTimers,
    armTuner: () => {
      tunerArmed = true;
    },
    pi,
  });

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
    pi.registerShortcut("alt+.", {
      description: state.labels.shortcutNextPage || "Switch to next companion segment",
      handler: async (ctx) => {
        if (state.mode !== "off" && session.nextPage()) hud.renderActiveCard(ctx);
      },
    });
    pi.registerShortcut("alt+,", {
      description: state.labels.shortcutPrevPage || "Switch to previous companion segment",
      handler: async (ctx) => {
        if (state.mode !== "off" && session.prevPage()) hud.renderActiveCard(ctx);
      },
    });
    pi.registerShortcut("alt+c", {
      description: state.labels.shortcutCopyLast || "Copy current or last lingual card to clipboard",
      handler: async (ctx) => {
        if (state.mode !== "off") await handlers.copyLastHandler("", ctx);
      },
    });
  }

  pi.on(
    "input",
    createInputDispatcher({
      state,
      session,
      hud,
      getLastContext: () => lastContext,
      setLastContext: (ctx) => {
        lastContext = ctx;
      },
      clearPendingTimers,
      setPolishTimer: (t) => {
        polishTimer = t;
      },
      onBeforeInput: (rawText, ctx) => {
        lastRawInputText = rawText;
        if (showingReleaseBanner) {
          showingReleaseBanner = false;
          if (hasActiveUI(ctx)) safeClearWidget(ctx);
        }
      },
    })
  );
}
