import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PromptSlotConfig } from "../types.js";
import type { CommandHandlerDeps } from "./types.js";
import { globalLingualCache } from "../cache.js";
import {
  defaultSlotsForMode,
  loadUserLingualConfig,
  normalizeActiveModeId,
  resolveModesFromConfig,
  saveUserLingualConfig,
} from "../engine.js";
import { getDefaultFactoryModes, resolveSlotsForPreset, SLOT_PRESETS } from "../presets.js";

export function createSlotHandlers(deps: CommandHandlerDeps) {
  const { state, updateFooter, refreshActiveView } = deps;

  const switchSlotsHandler = async (args: string, ctx: ExtensionContext) => {
    const rawArgs = args.trim();
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    const subCmd = (parts[0] || "").toLowerCase();
    const lbl = state.labels;
    const disk = loadUserLingualConfig();
    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: (state as any).activeModeId || disk.activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const pair = lbl.hudTitle || `${state.sourceLang} ⇄ ${state.targetLang}`;

    if (!subCmd || subCmd === "list" || subCmd === "ls") {
      const modeSlots = activeMode.slots || [];
      const lines = modeSlots.map((s, idx) => {
        const status =
          s.enabled !== false ? lbl.slotsStatusEnabled || "enabled" : lbl.slotsStatusDisabled || "disabled";
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

    if (subCmd === "reset") {
      const factoryDefaults = getDefaultFactoryModes(state.sourceLang, disk.explainLang);
      const matchDefault = factoryDefaults.find((m) => m.id === activeMode.id);
      activeMode.slots = matchDefault
        ? [...matchDefault.slots]
        : defaultSlotsForMode(activeMode, state.sourceLang, disk.explainLang);
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Reset slots for mode [${activeMode.name}] to clean defaults.`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

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
          { id: "source", label: lbl.sourceLabel || "Original", role: "source", instruction: "Source text", enabled: true },
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

    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageRm || "Usage: /slots rm <slot-id>", "warning");
        return;
      }
      const existing = (activeMode.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found")
          .replace("{pair}", pair)
          .replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      activeMode.slots = activeMode.slots.filter((s) => s.id.toLowerCase() !== targetId);
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(
        `[${pair}] Removed slot [${targetId}] ("${existing.label}") from mode [${activeMode.name}].`,
        "info"
      );
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    if (subCmd === "toggle") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageToggle || "Usage: /slots toggle <slot-id>", "warning");
        return;
      }
      const existing = (activeMode.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found")
          .replace("{pair}", pair)
          .replace("{id}", targetId);
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
      const statusText =
        updated?.enabled !== false ? lbl.slotsStatusEnabled || "enabled" : lbl.slotsStatusDisabled || "disabled";
      ctx.ui.notify(`[${pair}] Slot [${targetId}] is now ${statusText} in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

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
      ctx.ui.notify(
        `[${pair}] Added/updated slot [${id}] "${label}" in mode [${activeMode.name}]${upgradeHint}.`,
        "info"
      );
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    const matchedPreset = SLOT_PRESETS[subCmd];
    if (matchedPreset) {
      state.slotPreset = subCmd;
      state.slots = resolveSlotsForPreset(subCmd, state.sourceLang);
      saveUserLingualConfig({ slotPreset: subCmd === "developer" ? undefined : subCmd, slots: state.slots });
      globalLingualCache.clear();
      ctx.ui.notify(`[lingual] applied preset [${subCmd}]: ${matchedPreset.description}`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }

    const unknownTpl = lbl.slotsUnknown || 'Unknown slot command or preset "{cmd}".';
    ctx.ui.notify(unknownTpl.replace("{pair}", lbl.hudTitle).replace("{cmd}", subCmd), "warning");
  };

  return { switchSlotsHandler };
}
