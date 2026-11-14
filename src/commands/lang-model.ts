import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ReasoningEffort } from "../types.js";
import type { CommandHandlerDeps } from "./types.js";
import { globalLingualCache } from "../cache.js";
import { resolveTargetModel } from "../completer.js";
import {
  loadUserLingualConfig,
  saveUserLingualConfig,
  resolveModesFromConfig,
  normalizeActiveModeId,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
  localizeModes,
} from "../engine.js";
import {
  formatModelSelectionMessage,
  resolveLabelsForLang,
  resolveSlotsForPreset,
  getDefaultSlots,
  getDefaultFactoryModes,
  normalizeLangCode,
  isSupportedLangCode,
} from "../presets.js";

export function formatActiveModelLabel(
  selectedModel: string | undefined,
  ctx: ExtensionContext,
  followDesc: string
): string {
  const modelKey = selectedModel || "auto";
  const resolved = resolveTargetModel(ctx, modelKey);

  if (modelKey === "auto") {
    if (
      resolved &&
      ctx.model &&
      `${resolved.provider}/${resolved.id}` !== `${ctx.model.provider}/${ctx.model.id}`
    ) {
      return `auto (defaultModel: ${resolved.provider}/${resolved.id} · session: ${ctx.model.id})`;
    }
    return `auto (${resolved ? `${resolved.provider}/${resolved.id}` : followDesc})`;
  }

  if (modelKey === "session" || modelKey === "follow") {
    return `session (${followDesc}: ${ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "none"})`;
  }

  return `${modelKey}${resolved ? ` (resolved: ${resolved.provider}/${resolved.id})` : ""}`;
}

export function createLangModelHandlers(deps: CommandHandlerDeps) {
  const { state, session, updateFooter, refreshActiveView } = deps;

  const setModelHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const followSessionDesc = state.labels.modelFollowSession || "follow session";
    const currentActive = formatActiveModelLabel(state.selectedModel, ctx, followSessionDesc);

    if (!trimmed) {
      const available = ctx.modelRegistry?.getAvailable?.() || [];
      const availableList =
        available.length > 0
          ? available.map((m) => `• ${m.provider}/${m.id}`).slice(0, 8).join("\n")
          : undefined;

      const msg = formatModelSelectionMessage(state.labels, currentActive || "auto", availableList);
      ctx.ui.notify(msg, "info");

      if (typeof (ctx.ui as any).select === "function" && available.length > 0) {
        const title = (state.labels as any)?.modelTitle || "Select Lingual Model";
        const options = [
          "auto - Default Pi Model (Recommended)",
          ...available.map((m: any) => `${m.provider}/${m.id}`),
          "session - Follow active conversation model",
        ];
        try {
          const choice = await (ctx.ui as any).select(title, options);
          const choiceStr = typeof choice === "string" ? choice : choice?.value || choice?.label || "";
          if (choiceStr) {
            const key = choiceStr.split(" - ")[0].trim();
            if (key) {
              state.selectedModel = key;
              saveUserLingualConfig({ selectedModel: key });
              ctx.ui.notify(`[lingual] model: ${key}`, "info");
            }
          }
        } catch {}
      }
      return;
    }

    state.selectedModel = trimmed;
    saveUserLingualConfig({ selectedModel: trimmed });
    ctx.ui.notify(`[lingual] model: ${trimmed}`, "info");
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
      const helpMsg = template.replace("{flow}", flowText).replace("{pair}", pair);
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
          "[lingual] invalid language code. supported: zh, tw, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
      if (code === state.sourceLang) {
        newTarget = code === "en" ? "ja" : "en";
      } else {
        newTarget = code;
      }
    } else {
      newSource = normalizeLangCode(parts[0]);
      newTarget = normalizeLangCode(parts[1]);
      if (!isSupportedLangCode(newSource) || !isSupportedLangCode(newTarget)) {
        ctx.ui.notify(
          "[lingual] invalid language code. supported: zh, tw, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
    }

    const diskBeforeSwitch = loadUserLingualConfig();
    state.sourceLang = newSource;
    state.targetLang = newTarget;
    if (
      !diskBeforeSwitch.explainLang ||
      diskBeforeSwitch.explainLang === previousSource ||
      diskBeforeSwitch.explainLang === "zh"
    ) {
      state.explainLang = newSource === "zh" || newSource === "tw" ? "zh" : newSource;
    } else {
      state.explainLang = diskBeforeSwitch.explainLang;
    }
    state.labels = resolveLabelsForLang(newSource, undefined, newTarget);
    if (state.slotPreset) {
      state.slots = resolveSlotsForPreset(state.slotPreset, newSource);
    } else {
      state.slots = getDefaultSlots(newSource);
    }
    state.directSlots = getDefaultDirectSlots(newSource);
    state.promptSlots = getDefaultPromptSlots(newSource);
    state.modifySlots = getDefaultModifySlots(newSource, state.explainLang);

    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0
        ? state.modes
        : resolveModesFromConfig(diskBeforeSwitch, newSource);

    const isFactory =
      !diskBeforeSwitch.modes ||
      diskBeforeSwitch.modes.length === 0 ||
      (currentModes.length === 3 &&
        currentModes.every((m) => ["companion", "direct", "live-flow"].includes(m.id)));

    if (isFactory) {
      state.modes = getDefaultFactoryModes(newSource, state.explainLang);
    } else {
      state.modes = localizeModes(currentModes, newSource, state.explainLang);
    }
    state.mode = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId },
      state.modes
    ) as any;
    state.activeModeId = state.mode;

    saveUserLingualConfig({
      sourceLang: newSource,
      targetLang: newTarget,
      explainLang: state.explainLang,
      ...(diskBeforeSwitch.modes?.length ? { modes: state.modes } : {}),
      ...(diskBeforeSwitch.slots?.length ? { slots: state.slots } : {}),
      ...(diskBeforeSwitch.directSlots?.length ? { directSlots: state.directSlots } : {}),
      ...(diskBeforeSwitch.promptSlots?.length ? { promptSlots: state.promptSlots } : {}),
      ...(diskBeforeSwitch.modifySlots?.length ? { modifySlots: state.modifySlots } : {}),
    });
    session.reset();
    globalLingualCache.clear();
    updateFooter(ctx);

    const isTargetOnly = newSource === previousSource && newTarget !== previousTarget;
    const flowText = `${newSource} ⇄ ${newTarget}`;
    const msg = isTargetOnly
      ? `[${flowText}] Target language switched to: ${newTarget} (${newSource} unchanged)`
      : `[${flowText}]`;
    ctx.ui.notify(msg, "info");
  };

  const toggleCompactHandler = async (_args: string, ctx: ExtensionContext) => {
    state.compact = !state.compact;
    saveUserLingualConfig({ compact: state.compact });
    const msg = state.compact ? "[lingual: Capsule mode enabled]" : "[lingual: tree HUD mode restored]";
    ctx.ui.notify(msg, "info");
    refreshActiveView(ctx);
  };

  const setReasoningHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim().toLowerCase();
    const disk = loadUserLingualConfig();
    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
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
    globalLingualCache.clear();
    ctx.ui.notify(`[${pair}] Reasoning effort for mode [${activeMode.name}] set to "${newEffort}".`, "info");
    updateFooter(ctx);
  };

  return {
    setModelHandler,
    switchLangHandler,
    toggleCompactHandler,
    setReasoningHandler,
  };
}
