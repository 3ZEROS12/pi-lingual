import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type {
  CustomModeConfig,
  ExtensionState,
  LingualResult,
  PromptSlotConfig,
  SlotConfig,
} from "../types.js";
import type { LingualSessionController } from "../fsm.js";
import {
  resolveModeRuntime,
  runtimeLanguagePair,
  type ModeRuntime,
} from "../runtime.js";
import {
  getEffectiveMaxCols,
  renderCardLayout,
} from "../layout.js";
import {
  loadUserLingualConfig,
  normalizeActiveModeId,
  resolveCandidateSlotsFromConfig,
  resolveDirectSlotsFromConfig,
  resolveModifySlotsFromConfig,
} from "../engine.js";
import { hasActiveUI, safeClearWidget } from "../context.js";

export interface HudManager {
  activeRuntime: () => ModeRuntime;
  runtimeForMode: (mode: CustomModeConfig) => ModeRuntime;
  fallbackSlotsFor: (mode: CustomModeConfig) => (SlotConfig | PromptSlotConfig)[];
  updateFooter: (ctx: ExtensionContext | null | undefined) => void;
  renderHudWidget: (
    ctx: ExtensionContext,
    result: LingualResult,
    rt: ModeRuntime,
    extras?: { pageTag?: string; isLong?: boolean; isStreaming?: boolean }
  ) => void;
  renderActiveCard: (ctx: ExtensionContext) => void;
  refreshActiveView: (ctx: ExtensionContext) => void;
}

export function createHudManager(
  state: ExtensionState,
  session: LingualSessionController
): HudManager {
  const fallbackSlotsFor = (mode: CustomModeConfig): (SlotConfig | PromptSlotConfig)[] => {
    if (mode.action === "select") {
      return resolveCandidateSlotsFromConfig({ sourceLang: state.sourceLang, promptSlots: state.promptSlots });
    }
    if (mode.flow === "proofread") {
      return resolveModifySlotsFromConfig({
        sourceLang: state.sourceLang,
        explainLang: state.explainLang,
        modifySlots: state.modifySlots,
      });
    }
    if (mode.action === "transform") {
      return resolveDirectSlotsFromConfig({ sourceLang: state.sourceLang, directSlots: state.directSlots });
    }
    return state.slots;
  };

  const runtimeForMode = (mode: CustomModeConfig): ModeRuntime =>
    resolveModeRuntime(mode, {
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      explainLang: state.explainLang,
      fallbackSlots: fallbackSlotsFor(mode),
      globalKillList: loadUserLingualConfig().globalKillList,
    });

  const activeRuntime = (): ModeRuntime => {
    const id = normalizeActiveModeId({ mode: state.mode, activeModeId: state.activeModeId }, state.modes);
    const mode = state.modes.find((m) => m.id === id) || state.modes[0];
    if (mode) return runtimeForMode(mode);
    return resolveModeRuntime(
      { id: "companion", name: "Companion", flow: "translate", action: "pass-through", hud: "tree", slots: state.slots },
      { sourceLang: state.sourceLang, targetLang: state.targetLang, fallbackSlots: state.slots }
    );
  };

  const updateFooter = (ctx: ExtensionContext | null | undefined): void => {
    if (!hasActiveUI(ctx)) return;
    try {
      if (state.mode === "off") {
        ctx.ui.setStatus("lingual", undefined as any);
        return;
      }

      const rt = activeRuntime();
      let pair = runtimeLanguagePair(rt, `${state.sourceLang} ⇄ ${state.targetLang}`);
      const enabledSlots = (rt.slots.length > 0 ? rt.slots : state.slots || []).filter(
        (s) => s.enabled !== false
      );
      const nonSourceCount = enabledSlots.filter((s) => s.role !== "source").length;

      if (nonSourceCount !== 2 && enabledSlots.length > 0) {
        pair += ` · ${enabledSlots.length}s`;
      } else if (state.slotPreset) {
        pair += ` · ${state.slotPreset}`;
      }

      ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} · ${rt.name}`));
    } catch {
      // Gracefully ignore stale context during session replacement or teardown
    }
  };

  const renderHudWidget = (
    ctx: ExtensionContext,
    result: LingualResult,
    rt: ModeRuntime,
    extras?: { pageTag?: string; isLong?: boolean; isStreaming?: boolean }
  ): void => {
    if (!hasActiveUI(ctx)) return;
    if (rt.hud === "none") {
      safeClearWidget(ctx);
      return;
    }
    try {
      const isCompact = state.compact || (process.stdout?.rows ? process.stdout.rows < 22 : false);
      const maxCols = getEffectiveMaxCols();
      const hudSlots = rt.slots.length > 0 ? rt.slots : state.slots;
      const hudLabels =
        rt.flow === "custom"
          ? { ...state.labels, hudTitle: `${rt.inputLang} ⇄ ${rt.outputLang}` }
          : state.labels;

      const lines = renderCardLayout(result, hudLabels, {
        maxCols,
        maxLines: rt.hud === "preview" ? 2 : extras?.isLong ? 10 : 9,
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
  };

  const renderActiveCard = (ctx: ExtensionContext): void => {
    if (!hasActiveUI(ctx)) return;
    try {
      const readyList = session.getReadyPages();
      if (readyList.length === 0) return;
      const snapshot = session.getPaginationSnapshot();
      const res = session.getActiveResult();
      if (!res) return;

      const rt = activeRuntime();
      const pageTag =
        snapshot.readyCount > 1
          ? ctx.ui.theme.fg("muted", ` [${snapshot.pageIndex + 1}/${snapshot.readyCount} ⌥.]`)
          : "";
      renderHudWidget(ctx, res, rt, { pageTag });
    } catch {
      // Gracefully ignore stale context during session replacement or teardown
    }
  };

  const refreshActiveView = (ctx: ExtensionContext): void => {
    if (!hasActiveUI(ctx)) return;
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
    } else if (session.getLastResult()) {
      renderHudWidget(ctx, session.getLastResult()!, activeRuntime());
    }
  };

  return {
    activeRuntime,
    runtimeForMode,
    fallbackSlotsFor,
    updateFooter,
    renderHudWidget,
    renderActiveCard,
    refreshActiveView,
  };
}
