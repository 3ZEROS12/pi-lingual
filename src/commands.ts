import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { openModePicker } from "./pickers.js";
import {
  hasExternalConfigUpdate,
  loadUserLingualConfig,
  saveUserLingualConfig,
  resolveModesFromConfig,
  normalizeLingualModeInput,
  normalizeActiveModeId,
} from "./engine.js";
import { normalizeLangCode, LANGUAGE_PRESETS } from "./presets.js";
import type { CommandHandlerDeps, CommandHandlers } from "./commands/types.js";
import { createLangModelHandlers } from "./commands/lang-model.js";
import { createModeHandlers, matchModeByQuery } from "./commands/mode.js";
import { createSlotHandlers } from "./commands/slots.js";
import { createMetaHandlers } from "./commands/meta.js";

export type { CommandHandlerDeps, CommandHandlers } from "./commands/types.js";

export function createCommandHandlers(deps: CommandHandlerDeps): CommandHandlers {
  const { state, updateFooter, renderReleaseBanner, syncResizeListener, armTuner, pi } = deps;

  const { setModelHandler, switchLangHandler, toggleCompactHandler, setReasoningHandler } =
    createLangModelHandlers(deps);
  const { setModeHandler, manageModesHandler, manageLoadoutsHandler, setDefaultModeHandler } =
    createModeHandlers(deps);
  const { switchSlotsHandler } = createSlotHandlers(deps);
  const {
    showStatusHandler,
    showLastHandler,
    copyLastHandler,
    showAgentGuideHandler,
    digestHandler,
    lookupHandler,
    journalHandler,
  } = createMetaHandlers(deps);

  const masterCommandHandler = async (args: string, ctx: ExtensionContext) => {
    if (hasExternalConfigUpdate()) {
      const diskForMode = loadUserLingualConfig();
      const diskMode = diskForMode.activeModeId || diskForMode.mode;
      if (diskMode && diskMode !== state.mode) {
        state.mode = normalizeActiveModeId({ mode: diskMode, activeModeId: diskMode }, state.modes);
        state.activeModeId = state.mode;
        syncResizeListener();
        updateFooter(ctx);
      }
    }

    const trimmed = args?.trim();
    if (!trimmed) {
      try {
        await openModePicker(ctx, {
          mode: state.mode,
          activeModeId: state.activeModeId,
          modes: state.modes,
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          labels: state.labels,
          modeLocked: state.modeLocked,
          onSelect: setModeHandler,
        });
      } catch {
        try {
          await setModeHandler("", ctx);
        } catch {}
      }
      return;
    }

    const lower = trimmed.toLowerCase();
    const spaceIndex = lower.indexOf(" ");
    const sub = spaceIndex === -1 ? lower : lower.slice(0, spaceIndex);
    const subArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    if (sub === "on") return setModeHandler("1", ctx);
    if (sub === "off") return setModeHandler("0", ctx);
    if (sub === "reasoning" || sub === "effort") return setReasoningHandler(subArgs, ctx);
    if (sub === "default" || sub === "def") return setDefaultModeHandler(subArgs, ctx);
    if (sub === "mode" || sub === "modes") return manageModesHandler(subArgs, ctx);
    if (sub === "loadout" || sub === "loadouts" || sub === "preset" || sub === "presets") {
      return manageLoadoutsHandler(subArgs, ctx);
    }
    if (sub === "lang" || sub === "language") return switchLangHandler(subArgs, ctx);
    if (sub === "slots" || sub === "slot") return switchSlotsHandler(subArgs, ctx);
    if (sub === "hide-source" || sub === "no-source" || sub === "show-source" || sub === "with-source") {
      return switchSlotsHandler(sub, ctx);
    }
    if (sub === "model") return setModelHandler(subArgs, ctx);
    if (sub === "compact" || sub === "capsule" || sub === "layout") return toggleCompactHandler(subArgs, ctx);
    if (sub === "status" || sub === "info" || sub === "report") return showStatusHandler(subArgs, ctx);
    if (sub === "last" || sub === "prev" || sub === "history" || sub === "replay") {
      return showLastHandler(subArgs, ctx);
    }
    if (sub === "copy" || sub === "cp" || sub === "yank") return copyLastHandler(subArgs, ctx);
    if (sub === "digest" || sub === "phrasebook" || sub === "vocab") return digestHandler(subArgs, ctx);
    if (sub === "lookup" || sub === "dict" || sub === "word") return lookupHandler(subArgs, ctx);
    if (sub === "log" || sub === "journal") return journalHandler(subArgs, ctx);
    if (sub === "news" || sub === "whatsnew" || sub === "changelog") {
      const diskCfg = loadUserLingualConfig();
      renderReleaseBanner(ctx, diskCfg.sourceLang || state.sourceLang);
      return;
    }

    if (sub === "tuner" || sub === "tune" || sub === "agent" || sub === "help" || sub === "?") {
      armTuner();
      const promptBody = subArgs
        ? `[lingual-tuner] Load the lingual-tuner skill and update ~/.pi/agent/lingual.json (user native language sourceLang="${state.sourceLang}"). Consult on prompt styling, custom slots, and translation model routing (auto Pi default vs pinned sidecar model). Communicate strictly in the user's native language (${state.sourceLang}) and apply: ${subArgs}`
        : `[lingual-tuner] Load the lingual-tuner skill and launch the interactive customization wizard (user native language sourceLang="${state.sourceLang}"). Consult on prompt styling, custom slots, and translation model routing (auto Pi default vs pinned sidecar model). Render the Customization Map and all questions/options strictly in the user's native language (${state.sourceLang}).`;
      if ((sub === "tuner" || sub === "tune" || subArgs) && typeof (pi as any).sendMessage === "function") {
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
      return showAgentGuideHandler(subArgs, ctx);
    }

    if (sub === "lock") {
      state.modeLocked = true;
      saveUserLingualConfig({ modeLocked: true });
      const activeObj = state.modes.find((m) => m.id === state.mode);
      const currentName = activeObj ? activeObj.name : state.mode;
      try {
        ctx.ui.notify(`[lingual] mode locked to [${currentName}]`, "info");
      } catch {}
      updateFooter(ctx);
      return;
    }

    if (sub === "unlock") {
      state.modeLocked = false;
      saveUserLingualConfig({ modeLocked: false });
      try {
        ctx.ui.notify("[lingual] mode unlocked", "info");
      } catch {}
      updateFooter(ctx);
      return;
    }

    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0
        ? state.modes
        : resolveModesFromConfig(loadUserLingualConfig(), state.sourceLang);
    const numIdx = parseInt(sub, 10);
    const isNum = !isNaN(numIdx) && String(numIdx) === sub;
    const isKnownMode =
      sub === "mode" ||
      Boolean(matchModeByQuery(currentModes, sub, state.sourceLang)) ||
      Boolean(matchModeByQuery(currentModes, lower, state.sourceLang)) ||
      (isNum && numIdx >= 0 && numIdx <= currentModes.length) ||
      normalizeLingualModeInput(sub) !== null ||
      normalizeLingualModeInput(lower) !== null;

    if (isKnownMode) {
      return setModeHandler(sub === "mode" ? subArgs : trimmed, ctx);
    }

    const possibleLang = normalizeLangCode(sub);
    if (LANGUAGE_PRESETS[possibleLang]) {
      return switchLangHandler(trimmed, ctx);
    }

    try {
      ctx.ui.notify(`[lingual] unknown: "${trimmed}". run /lingual for help`, "warning");
    } catch {}
  };

  return {
    setModeHandler,
    setModelHandler,
    switchLangHandler,
    toggleCompactHandler,
    switchSlotsHandler,
    showStatusHandler,
    showLastHandler,
    copyLastHandler,
    manageModesHandler,
    manageLoadoutsHandler,
    showAgentGuideHandler,
    digestHandler,
    setReasoningHandler,
    setDefaultModeHandler,
    lookupHandler,
    journalHandler,
    masterCommandHandler,
  };
}
