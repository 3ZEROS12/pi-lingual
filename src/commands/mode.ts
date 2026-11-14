import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { CustomModeConfig } from "../types.js";
import type { CommandHandlerDeps } from "./types.js";
import { globalLingualCache } from "../cache.js";
import { safeClearWidget } from "../context.js";
import {
  getDefaultPromptSlots,
  loadUserLingualConfig,
  localizeModeName,
  normalizeLingualModeInput,
  resolveModeDisplayName,
  resolveModeDisplaySpec,
  resolveModesFromConfig,
  saveUserLingualConfig,
} from "../engine.js";
import {
  addCustomMode,
  getDefaultFactoryModes,
  getPresetLoadout,
  listPresetLoadouts,
  removeCustomMode,
  toggleCustomMode,
} from "../presets.js";

/**
 * Shared mode-query matcher used across /lingual <query>, /lingual default <query>, and setModeHandler.
 */
export function matchModeByQuery(
  modes: CustomModeConfig[],
  query: string,
  sourceLang: string
): CustomModeConfig | undefined {
  const lower = query.trim().toLowerCase();
  if (!lower) return undefined;
  return modes.find(
    (m) =>
      m.id.toLowerCase() === lower ||
      m.name.toLowerCase() === lower ||
      (Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === lower)) ||
      resolveModeDisplayName(m.id, sourceLang).toLowerCase() === lower ||
      (m.id === "direct" &&
        (lower === "spec" || lower === "logical spec" || lower === "specification" || lower === "direct spec")) ||
      (m.id === "companion" && (lower === "companion" || lower === "companion mode" || lower === "original")) ||
      (m.id === "live-flow" &&
        (lower === "live flow" || lower === "flow" || lower === "live" || lower === "modify" || lower === "raw"))
  );
}

export function createModeHandlers(deps: CommandHandlerDeps) {
  const { state, session, updateFooter, syncResizeListener, clearPendingTimers } = deps;

  const setModeHandler = async (args: string, ctx: ExtensionContext) => {
    session.abortActive();
    const trimmed = args?.trim() || "";
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;
    const modeSpec = resolveModeDisplaySpec(state.sourceLang);
    const diskForMode = loadUserLingualConfig();
    const modes =
      Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(diskForMode);
    const activeModes = modes.filter((m) => m.enabled !== false);
    const hasCustomModesOnDisk = Array.isArray(diskForMode.modes) && diskForMode.modes.length > 0;

    let nextMode: string;
    const explicitLegacy = normalizeLingualModeInput(trimmed);

    if (trimmed) {
      const lower = trimmed.toLowerCase();
      const matched = matchModeByQuery(activeModes, trimmed, state.sourceLang);
      const numIdx = parseInt(trimmed, 10);
      const isNum = !isNaN(numIdx) && String(numIdx) === trimmed;
      if (isNum && numIdx >= 1 && numIdx <= activeModes.length) {
        nextMode = activeModes[numIdx - 1].id;
      } else if (matched) {
        nextMode = matched.id;
      } else if (explicitLegacy) {
        nextMode = explicitLegacy;
      } else if (lower === "spec" || lower === "logical spec" || lower === "specification") {
        nextMode = "direct";
      } else if (lower === "companion" || lower === "companion mode") {
        nextMode = "companion";
      } else if (lower === "live flow" || lower === "flow" || lower === "live") {
        nextMode = "live-flow";
      } else {
        nextMode = trimmed;
      }
    } else {
      if (state.modeLocked) {
        const currentModeObj = activeModes.find((m) => m.id === state.mode);
        const currentName = currentModeObj
          ? currentModeObj.name
          : state.mode === "off"
            ? modeSpec.off
            : state.mode;
        try {
          ctx.ui.notify(`[lingual] mode locked to [${currentName}]. Run /lingual unlock to release.`, "warning");
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
      nextMode === "original"
        ? "companion"
        : nextMode === "english"
          ? "direct"
          : nextMode === "select"
            ? "candidates"
            : nextMode === "modify"
              ? "live-flow"
              : nextMode;

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
        ctx.ui.notify("[lingual: off]", "info");
      } catch {}
      return;
    }

    const targetMode = activeModes.find(
      (m) =>
        m.id === canonical ||
        m.id === nextMode ||
        m.name.toLowerCase() === (trimmed || nextMode).toLowerCase() ||
        resolveModeDisplayName(m.id, state.sourceLang).toLowerCase() === (trimmed || nextMode).toLowerCase()
    );
    if (!targetMode) {
      try {
        ctx.ui.notify(
          `[lingual] mode [${trimmed || nextMode}] not in your active registry. Run /lingual mode list to view available modes.`,
          "warning"
        );
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
    const modeName = localizeModeName(targetMode.id, targetMode.name, state.sourceLang);
    try {
      ctx.ui.notify(`[${pair}] ${modeNum}. ${modeName} (${finalId})`, "info");
    } catch {}
  };

  const manageModesHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const disk = loadUserLingualConfig();
    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
    const pair = state.labels.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;

    if (!trimmed || trimmed === "list") {
      const modeLines = currentModes.map((m, idx) => {
        const status = m.enabled !== false ? "[✓]" : "[x]";
        const isCurrent = m.id === state.mode || m.id === (state as any).activeModeId ? " ▸" : "  ";
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
      globalLingualCache.clear();
      ctx.ui.notify(
        `[${pair}] Reset modes registry to factory golden defaults (${defaults.map((m) => m.name).join(" & ")})`,
        "info"
      );
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
      if (state.mode === id || state.activeModeId === id) {
        const fallbackId = updated.find((m) => m.enabled !== false)?.id || "companion";
        state.mode = fallbackId as any;
        state.activeModeId = fallbackId;
      }
      saveUserLingualConfig({ modes: updated, activeModeId: state.activeModeId });
      globalLingualCache.clear();
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
      if (!target.enabled && (state.mode === id || state.activeModeId === id)) {
        const fallbackId = updated.find((m) => m.enabled !== false)?.id || "off";
        state.mode = fallbackId as any;
        state.activeModeId = fallbackId;
      }
      saveUserLingualConfig({ modes: updated, activeModeId: state.activeModeId });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Mode [${id}] is now ${target.enabled ? "enabled [✓]" : "disabled [x]"}.`, "info");
      updateFooter(ctx);
      return;
    }

    if (subCmd === "add") {
      if (!id || !parts[2]) {
        ctx.ui.notify(
          `[${pair}] Missing arguments. Usage: /lingual mode add <id> <name> [flow] [action] [hud]`,
          "warning"
        );
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
        slots:
          action === "select"
            ? getDefaultPromptSlots(state.sourceLang)
            : [
                {
                  id: `${id}_slot`,
                  label: name,
                  role: "rewrite",
                  instruction:
                    customInstruction ||
                    `Translate and polish from \${sourceLang} into \${targetLang} matching ${name} style.`,
                  enabled: true,
                },
              ],
        enabled: true,
      };
      const updated = addCustomMode(currentModes, newMode);
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Added custom mode [${id}] "${name}" to registry.`, "info");
      updateFooter(ctx);
      return;
    }

    ctx.ui.notify(
      `[${pair}] Unknown mode subcommand "${subCmd}". Usage: /lingual mode [list|add|rm|toggle|reset]`,
      "warning"
    );
  };

  const manageLoadoutsHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const disk = loadUserLingualConfig();
    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
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
    globalLingualCache.clear();
    ctx.ui.notify(
      `[${pair}] Applied tactical loadout [${loadoutConfig.id}] "${loadoutConfig.name}" to active modes! Run /lingual ${loadoutConfig.id} to activate.`,
      "info"
    );
    updateFooter(ctx);
  };

  const setDefaultModeHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args?.trim();
    const disk = loadUserLingualConfig();
    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0
        ? state.modes
        : resolveModesFromConfig(disk, state.sourceLang);
    const currentDefault = disk.defaultMode || state.defaultMode || "companion";
    const defaultModeObj = currentModes.find((m) => m.id === currentDefault) || currentModes[0];
    const defaultIdx = currentModes.indexOf(defaultModeObj);
    const defaultNum = defaultIdx >= 0 ? defaultIdx + 1 : 1;
    const defaultName = defaultModeObj
      ? localizeModeName(defaultModeObj.id, defaultModeObj.name, state.sourceLang)
      : currentDefault;

    if (!trimmed) {
      ctx.ui.notify(
        `[lingual] Default mode for new sessions: ${defaultNum}. ${defaultName} (${currentDefault}). Set with: /lingual default <1|2|3|0|id>`,
        "info"
      );
      return;
    }

    let targetId: string | undefined;
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num === 0) {
      targetId = "off";
    } else if (!isNaN(num) && num >= 1 && num <= currentModes.length) {
      targetId = currentModes[num - 1].id;
    } else {
      const lower = trimmed.toLowerCase();
      const matched = matchModeByQuery(currentModes, trimmed, state.sourceLang);
      if (matched) targetId = matched.id;
      else if (lower === "off") targetId = "off";
      else if (lower === "companion" || lower === "original") targetId = "companion";
      else if (lower === "direct" || lower === "spec" || lower === "lazy") targetId = "direct";
      else if (lower === "live-flow" || lower === "flow" || lower === "raw" || lower === "modify") targetId = "live-flow";
    }

    if (!targetId) {
      ctx.ui.notify(
        `[lingual] Unknown mode "${trimmed}". Valid options: 1, 2, 3, 0, companion, direct, live-flow, off.`,
        "warning"
      );
      return;
    }

    state.defaultMode = targetId;
    saveUserLingualConfig({ defaultMode: targetId });

    const targetObj = currentModes.find((m) => m.id === targetId);
    const targetIdx = targetObj ? currentModes.indexOf(targetObj) : -1;
    const targetNum = targetId === "off" ? 0 : targetIdx >= 0 ? targetIdx + 1 : 1;
    const targetName =
      targetId === "off"
        ? resolveModeDisplayName("off", state.sourceLang)
        : targetObj
          ? localizeModeName(targetObj.id, targetObj.name, state.sourceLang)
          : targetId;

    ctx.ui.notify(
      `[lingual] Default mode for new sessions set to: ${targetNum}. ${targetName} (${targetId})`,
      "info"
    );
  };

  return {
    setModeHandler,
    manageModesHandler,
    manageLoadoutsHandler,
    setDefaultModeHandler,
  };
}
