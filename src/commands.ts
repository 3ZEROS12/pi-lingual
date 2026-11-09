import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type {
  CustomModeConfig,
  ExtensionState,
  LingualResult,
  PromptSlotConfig,
  ReasoningEffort,
} from "./types.js";
import type { ModeRuntime } from "./runtime.js";
import type { LingualSessionController } from "./fsm.js";
import { globalLingualCache } from "./cache.js";
import { safeClearWidget, copyToClipboard } from "./context.js";
import { openModePicker } from "./pickers.js";
import { pickPrimaryContent } from "./runtime.js";
import {
  loadUserLingualConfig,
  saveUserLingualConfig,
  resolveModesFromConfig,
  normalizeLingualModeInput,
  resolveModeDisplayName,
  resolveModeDisplaySpec,
  normalizeActiveModeId,
  localizeModeName,
  defaultSlotsForMode,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
  localizeModes,
} from "./engine.js";
import {
  formatModelSelectionMessage,
  formatStatusReport,
  resolveLabelsForLang,
  resolveSlotsForPreset,
  getDefaultSlots,
  getDefaultFactoryModes,
  getPresetLoadout,
  listPresetLoadouts,
  normalizeLangCode,
  isSupportedLangCode,
  SLOT_PRESETS,
  LANGUAGE_PRESETS,
  removeCustomMode,
  toggleCustomMode,
  addCustomMode,
} from "./presets.js";
import { resolveTargetModel } from "./completer.js";
import type { LookupController } from "./lookup-controller.js";
import { resolveLookupConfig } from "./lookup.js";
import { resolveLookupStrings } from "./lookup-strings.js";

export interface CommandHandlerDeps {
  state: ExtensionState;
  session: LingualSessionController;
  updateFooter: (ctx: ExtensionContext | null | undefined) => void;
  refreshActiveView: (ctx: ExtensionContext) => void;
  renderActiveCard: (ctx: ExtensionContext) => void;
  renderHudWidget: (
    ctx: ExtensionContext,
    result: LingualResult,
    rt: ModeRuntime,
    extras?: { pageTag?: string; isLong?: boolean; isStreaming?: boolean }
  ) => void;
  activeRuntime: () => ModeRuntime;
  renderReleaseBanner: (ctx: ExtensionContext, explicitLang?: string) => boolean;
  syncResizeListener: () => void;
  clearPendingTimers: () => void;
  armTuner: () => void;
  lookupController: LookupController;
  pi: ExtensionAPI;
}

export interface CommandHandlers {
  setModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  setModelHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  switchLangHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  toggleCompactHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  switchSlotsHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  showStatusHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  showLastHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  copyLastHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  manageModesHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  manageLoadoutsHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  showAgentGuideHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  setReasoningHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  setDefaultModeHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  lookupHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
  masterCommandHandler: (args: string, ctx: ExtensionContext) => Promise<void>;
}

export function createCommandHandlers(deps: CommandHandlerDeps): CommandHandlers {
  const {
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
    armTuner,
    lookupController,
    pi,
  } = deps;

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
          (Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === lower)) ||
          resolveModeDisplayName(m.id, state.sourceLang).toLowerCase() === lower ||
          (m.id === "direct" && (lower === "spec" || lower === "logical spec" || lower === "specification" || lower === "direct spec")) ||
          (m.id === "companion" && (lower === "companion" || lower === "companion mode" || lower === "original")) ||
          (m.id === "live-flow" && (lower === "live flow" || lower === "flow" || lower === "live" || lower === "modify" || lower === "raw"))
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
      // Parameterless blind cycle: only block if state.modeLocked is true
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
        ctx.ui.notify(`[lingual] mode [${trimmed || nextMode}] not in your active registry. Run /lingual mode list to view available modes.`, "warning");
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

  const formatActiveModelLabel = (
    selectedModel: string | undefined,
    ctx: ExtensionContext,
    followDesc: string
  ): string => {
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
  };

  const setModelHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const followSessionDesc = state.labels.modelFollowSession || "follow session";
    const currentActive = formatActiveModelLabel(state.selectedModel, ctx, followSessionDesc);

    if (!trimmed) {
      const available = ctx.modelRegistry?.getAvailable?.() || [];
      const availableList = available.length > 0
        ? available.map((m) => `• ${m.provider}/${m.id}`).slice(0, 8).join("\n")
        : undefined;

      const msg = formatModelSelectionMessage(state.labels, currentActive || "auto", availableList);
      ctx.ui.notify(msg, "info");

      if (typeof (ctx.ui as any).select === "function" && available.length > 0) {
        const title = (state.labels as any)?.modelTitle || "Select Lingual Model";
        const options = [
          "auto - Default Pi Model (Recommended)",
          ...available
            .map((m: any) => `${m.provider}/${m.id}`),
          "session - Follow active conversation model",
        ];
        try {
          const choice = await (ctx.ui as any).select(title, options);
          const choiceStr = typeof choice === "string" ? choice : (choice?.value || choice?.label || "");
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
          "[lingual] invalid language code. supported: zh, tw, ja, ko, en, es, fr, de, ru",
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
    if (!diskBeforeSwitch.explainLang || diskBeforeSwitch.explainLang === previousSource || diskBeforeSwitch.explainLang === "zh") {
      state.explainLang = (newSource === "zh" || newSource === "tw") ? "zh" : newSource;
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

    // Refresh modes: either full default factory modes or localized modes
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(diskBeforeSwitch, newSource);

    const isFactory =
      !diskBeforeSwitch.modes ||
      diskBeforeSwitch.modes.length === 0 ||
      (currentModes.length === 3 && currentModes.every((m) => ["companion", "direct", "live-flow"].includes(m.id)));

    if (isFactory) {
      state.modes = getDefaultFactoryModes(newSource, state.explainLang);
    } else {
      state.modes = localizeModes(currentModes, newSource, state.explainLang);
    }
    state.mode = normalizeActiveModeId({ mode: state.mode, activeModeId: state.activeModeId }, state.modes) as any;
    state.activeModeId = state.mode;

    saveUserLingualConfig({
      sourceLang: newSource,
      targetLang: newTarget,
      explainLang: state.explainLang,
      modes: state.modes,
      slots: state.slots,
      directSlots: state.directSlots,
      promptSlots: state.promptSlots,
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
      ctx.ui.notify(`[lingual] applied preset [${subCmd}]: ${matchedPreset.description}`, "info");
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
    const activeModel = formatActiveModelLabel(state.selectedModel, ctx, followDesc);

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
    const lookupCfg = resolveLookupConfig((diskCfg as any).lookup, {
      model: String((diskCfg as any).lookup?.model || "").trim() || state.selectedModel,
    });
    const lookupBackend = lookupCfg.provider === "model"
      ? `model:${lookupCfg.model || state.selectedModel}`
      : "google";

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
      `\n• Reasoning Effort: ${activeEffort} (mode: ${activeMode.reasoning || "default"}, global: ${diskCfg.reasoning || "low"})` +
      `\n• Lookup: ${lookupCfg.enabled ? "on" : "off"} · ${lookupBackend} · ${state.targetLang} → ${state.sourceLang}`;

    ctx.ui.notify(statusMsg, "info");
  };

  const showLastHandler = async (_args: string, ctx: ExtensionContext) => {
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
      return;
    }
    const last = session.getLastResult();
    if (!last) {
      try {
        ctx.ui.notify("[lingual] no previous card", "info");
      } catch {}
      return;
    }
    renderHudWidget(ctx, last, activeRuntime());
  };

  const copyLastHandler = async (args: string, ctx: ExtensionContext) => {
    const res = session.getActiveResult() || session.getLastResult();
    if (!res) {
      try {
        ctx.ui.notify("[lingual] no active card to copy", "warning");
      } catch {}
      return;
    }

    type NonSourceSlot = { id: string; label: string; content: string };
    let nonSourceSlots: NonSourceSlot[] = [];

    if (Array.isArray(res.slots) && res.slots.length > 0) {
      nonSourceSlots = res.slots
        .filter((s) => s.role !== "source" && Boolean(s.content))
        .map((s) => ({ id: s.id, label: s.label || s.id, content: s.content }));
    } else if (res.slotOutputs && Object.keys(res.slotOutputs).length > 0) {
      nonSourceSlots = Object.entries(res.slotOutputs)
        .filter(([id, out]: [string, any]) => id !== "source" && Boolean(out?.content))
        .map(([id, out]: [string, any]) => ({ id, label: id, content: out.content }));
    } else {
      const fallback: Array<{ id: string; label: string; content?: string }> = [
        { id: "spoken", label: "Spoken", content: res.spoken },
        { id: "written", label: "Written", content: res.written },
        ...(res.vocab ? [{ id: "vocab", label: "Vocab", content: res.vocab }] : []),
      ];
      nonSourceSlots = fallback.filter((s): s is NonSourceSlot => Boolean(s.content));
    }

    if (nonSourceSlots.length === 0) {
      try {
        ctx.ui.notify("[lingual] no active card to copy", "warning");
      } catch {}
      return;
    }

    const trimmedArg = (args || "").trim();
    let chosen: NonSourceSlot | undefined;

    const numIdx = parseInt(trimmedArg, 10);
    if (!isNaN(numIdx) && String(numIdx) === trimmedArg && numIdx >= 1 && numIdx <= nonSourceSlots.length) {
      chosen = nonSourceSlots[numIdx - 1];
    } else if (trimmedArg) {
      const lower = trimmedArg.toLowerCase();
      chosen = nonSourceSlots.find(
        (s) => s.id.toLowerCase() === lower || s.label.toLowerCase() === lower
      );
    }

    if (!chosen) {
      const primary = pickPrimaryContent(res, activeRuntime());
      if (primary) {
        chosen = nonSourceSlots.find((s) => s.content === primary) || nonSourceSlots[0];
      } else {
        chosen = nonSourceSlots[0];
      }
    }

    if (!chosen || !chosen.content) {
      try {
        ctx.ui.notify("[lingual] no active card to copy", "warning");
      } catch {}
      return;
    }

    copyToClipboard(chosen.content);
    try {
      ctx.ui.notify(`[lingual] Copied [${chosen.label}] to clipboard`, "info");
    } catch {}
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
      `    └ Vocab Row : Extract 1-line key expressions                        [✓] On/Off\n\n` +
      `  [Model & Cost]        Isolate translation sidecar from heavy reasoning brains\n` +
      `    • Target Model : [${state.selectedModel || "auto"}] (auto = Pi defaultModel · /lingual model <id>)\n` +
      `  [Word Lookup]         Double-click a word in fullscreen: foreign → your language\n` +
      `    • Provider : [${(loadUserLingualConfig() as any).lookup?.provider || "google"}] (google = key-less · /lingual lookup [on|off|google|model])\n` +
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

  const setDefaultModeHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args?.trim();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(disk, state.sourceLang);
    const currentDefault = disk.defaultMode || state.defaultMode || "companion";
    const defaultModeObj = currentModes.find((m) => m.id === currentDefault) || currentModes[0];
    const defaultIdx = currentModes.indexOf(defaultModeObj);
    const defaultNum = defaultIdx >= 0 ? defaultIdx + 1 : 1;
    const defaultName = defaultModeObj ? localizeModeName(defaultModeObj.id, defaultModeObj.name, state.sourceLang) : currentDefault;

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
      const matched = currentModes.find(
        (m) =>
          m.id.toLowerCase() === lower ||
          m.name.toLowerCase() === lower ||
          (Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === lower)) ||
          resolveModeDisplayName(m.id, state.sourceLang).toLowerCase() === lower
      );
      if (matched) {
        targetId = matched.id;
      } else if (lower === "off") {
        targetId = "off";
      } else if (lower === "companion" || lower === "original") {
        targetId = "companion";
      } else if (lower === "direct" || lower === "spec" || lower === "lazy") {
        targetId = "direct";
      } else if (lower === "live-flow" || lower === "flow" || lower === "raw" || lower === "modify") {
        targetId = "live-flow";
      }
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
    const targetName = targetId === "off"
      ? resolveModeDisplayName("off", state.sourceLang)
      : targetObj
      ? localizeModeName(targetObj.id, targetObj.name, state.sourceLang)
      : targetId;

    ctx.ui.notify(
      `[lingual] Default mode for new sessions set to: ${targetNum}. ${targetName} (${targetId})`,
      "info"
    );
  };

  // Double-click word lookup: same language pair and model as the HUD card,
  // but reversed (foreign → native) and backed by a key-less dictionary by default.
  const lookupHandler = async (args: string, ctx: ExtensionContext) => {
    const disk = loadUserLingualConfig();
    const raw = (disk as any).lookup;
    const pinned = String(raw?.model || "").trim();
    const config = resolveLookupConfig(raw, { model: pinned || state.selectedModel });
    const strings = resolveLookupStrings(state.sourceLang);
    const trimmed = (args || "").trim();
    const lower = trimmed.toLowerCase();

    const describe = () => {
      const backend = config.provider === "model"
        ? `model:${config.model || state.selectedModel}`
        : "google";
      return `[lingual] lookup: ${config.enabled ? "on" : "off"} · ${strings.provider(backend)} · ${state.targetLang} → ${state.sourceLang} · ${config.seconds}s`;
    };

    if (!trimmed || lower === "status" || lower === "info") {
      try {
        ctx.ui.notify(`${describe()}\n${strings.usage}`, "info");
      } catch {}
      return;
    }

    if (lower === "on" || lower === "off") {
      const enabled = lower === "on";
      saveUserLingualConfig({ lookup: { ...(raw && typeof raw === "object" ? raw : {}), enabled } });
      try {
        ctx.ui.notify(`[lingual] ${enabled ? strings.enabled : strings.disabled}`, "info");
      } catch {}
      return;
    }

    if (lower === "google" || lower === "model") {
      saveUserLingualConfig({ lookup: { ...(raw && typeof raw === "object" ? raw : {}), provider: lower } });
      try {
        ctx.ui.notify(`[lingual] ${strings.provider(lower)}`, "info");
      } catch {}
      return;
    }

    lookupController.setContext(ctx);
    await lookupController.show(trimmed);
  };

  // Master command bus: handles subcommands and mode cycling
  const masterCommandHandler = async (args: string, ctx: ExtensionContext) => {
    const diskForMode = loadUserLingualConfig();
    const diskMode = diskForMode.activeModeId || diskForMode.mode;
    if (diskMode && diskMode !== state.mode) {
      state.mode = normalizeActiveModeId({ mode: diskMode, activeModeId: diskMode }, state.modes);
      state.activeModeId = state.mode;
      syncResizeListener();
      updateFooter(ctx);
    }

    const trimmed = args?.trim();
    if (!trimmed) {
      // Parameterless /lingual or /l: open interactive capsule mode picker
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

    // Quick toggle subcommands: on and off
    if (sub === "on") {
      await setModeHandler("1", ctx);
      return;
    }
    if (sub === "off") {
      await setModeHandler("0", ctx);
      return;
    }

    // 0. Subcommand: reasoning effort level (/lingual reasoning [low|medium|high])
    if (sub === "reasoning" || sub === "effort") {
      await setReasoningHandler(subArgs, ctx);
      return;
    }

    // 0.1 Subcommand: default mode for new sessions (/lingual default [1|2|3|0|id])
    if (sub === "default" || sub === "def") {
      await setDefaultModeHandler(subArgs, ctx);
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

    // 4.1 Subcommand: double-click word lookup (/lingual lookup [on|off|google|model|status|<text>])
    if (sub === "lookup" || sub === "dict" || sub === "word") {
      await lookupHandler(subArgs, ctx);
      return;
    }

    // 5. Subcommand: replay last card (/lingual last | /lingual replay)
    if (sub === "last" || sub === "prev" || sub === "history" || sub === "replay") {
      await showLastHandler(subArgs, ctx);
      return;
    }

    // 5.1 Subcommand: copy slot to clipboard (/lingual copy [slot] | /lingual cp | /lingual yank)
    if (sub === "copy" || sub === "cp" || sub === "yank") {
      await copyLastHandler(subArgs, ctx);
      return;
    }

    // 6. Subcommand: on-demand tuner activation (/lingual tuner [request])
    if (sub === "tuner" || sub === "tune" || sub === "agent" || sub === "help" || sub === "?") {
      armTuner();
      const promptBody = subArgs
        ? `[lingual-tuner] Load the lingual-tuner skill and update ~/.pi/agent/lingual.json (user native language sourceLang="${state.sourceLang}"). Consult on prompt styling, custom slots, and translation model routing (auto Pi default vs pinned sidecar model). Communicate strictly in the user's native language (${state.sourceLang}) and apply: ${subArgs}`
        : `[lingual-tuner] Load the lingual-tuner skill and launch the interactive customization wizard (user native language sourceLang="${state.sourceLang}"). Consult on prompt styling, custom slots, and translation model routing (auto Pi default vs pinned sidecar model). Render the Customization Map and all questions/options strictly in the user's native language (${state.sourceLang}).`;
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

    // 7. Mode jump by number, keyword, or registered custom mode ID (/lingual 1|2|3|0|commit|spec|...)
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0
      ? state.modes
      : resolveModesFromConfig(loadUserLingualConfig(), state.sourceLang);
    const isMatchedMode = currentModes.some((m) => {
      const idMatch = m.id.toLowerCase() === sub || m.id.toLowerCase() === lower;
      const nameMatch = m.name.toLowerCase() === sub || m.name.toLowerCase() === lower;
      const aliasMatch = Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === sub || a.toLowerCase() === lower);
      const locName = resolveModeDisplayName(m.id, state.sourceLang).toLowerCase();
      const locMatch = locName === sub || locName === lower;
      const specMatch = m.id === "direct" && (sub === "spec" || lower === "spec" || lower === "logical spec" || lower === "specification" || lower === "direct spec");
      const compMatch = m.id === "companion" && (sub === "companion" || lower === "companion" || lower === "companion mode" || lower === "original");
      const flowMatch = m.id === "live-flow" && (sub === "flow" || lower === "flow" || lower === "live flow" || lower === "live" || lower === "modify" || lower === "raw");
      return idMatch || nameMatch || aliasMatch || locMatch || specMatch || compMatch || flowMatch;
    });
    const numIdx = parseInt(sub, 10);
    const isNum = !isNaN(numIdx) && String(numIdx) === sub;
    const isKnownMode =
      sub === "mode" ||
      isMatchedMode ||
      (isNum && numIdx >= 0 && numIdx <= currentModes.length) ||
      normalizeLingualModeInput(sub) !== null ||
      normalizeLingualModeInput(lower) !== null;

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
    setReasoningHandler,
    setDefaultModeHandler,
    lookupHandler,
    masterCommandHandler,
  };
}
