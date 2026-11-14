import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { CommandHandlerDeps } from "./types.js";
import { globalLingualCache } from "../cache.js";
import { copyToClipboard } from "../context.js";
import { pickPrimaryContent } from "../runtime.js";
import {
  loadUserLingualConfig,
  resolveModesFromConfig,
  normalizeActiveModeId,
} from "../engine.js";
import { formatStatusReport } from "../presets.js";
import { formatActiveModelLabel } from "./lang-model.js";
import {
  readPhrasebook,
  clearPhrasebook,
  formatPhrasebookDigest,
  exportPhrasebook,
} from "../phrasebook.js";

export function createMetaHandlers(deps: CommandHandlerDeps) {
  const { state, session, renderActiveCard, renderHudWidget, activeRuntime } = deps;

  const showStatusHandler = async (_args: string, ctx: ExtensionContext) => {
    const followDesc = state.labels.modelFollowSession || "follow session";
    const activeModel = formatActiveModelLabel(state.selectedModel, ctx, followDesc);

    const currentModes =
      Array.isArray(state.modes) && state.modes.length > 0
        ? state.modes
        : resolveModesFromConfig(loadUserLingualConfig());
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: (state as any).activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const diskCfg = loadUserLingualConfig();
    const activeEffort = activeMode.reasoning || diskCfg.reasoning || "low";

    const statusMsg =
      formatStatusReport(state.labels, {
        mode: state.mode,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        activeModel,
        layout: state.compact ? "capsule" : "tree",
        cacheStats: globalLingualCache.getStats(),
      }) +
      `\n• Active Mode: [${activeMode.name}] (${activeMode.id}) · flow: ${activeMode.flow} · action: ${activeMode.action}` +
      `\n• Dynamic Slots: [${(activeMode.slots || []).filter((s) => s.enabled !== false).map((s) => s.label).join(", ")}]` +
      `\n• Reasoning Effort: ${activeEffort} (mode: ${activeMode.reasoning || "default"}, global: ${diskCfg.reasoning || "low"})`;

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
      const rtSlots = activeRuntime().slots;
      nonSourceSlots = Object.entries(res.slotOutputs)
        .filter(([id, out]: [string, any]) => id !== "source" && id !== "vocab" && id !== "fixes" && Boolean(out?.content))
        .map(([id, out]: [string, any]) => {
          const matched = rtSlots.find((s) => s.id === id);
          return { id, label: matched?.label || id, content: out.content };
        });
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
      chosen = nonSourceSlots.find((s) => s.id.toLowerCase() === lower || s.label.toLowerCase() === lower);
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

    const copied = copyToClipboard(chosen.content);
    try {
      ctx.ui.notify(
        copied ? `[lingual] Copied [${chosen.label}] to clipboard` : "[lingual] Clipboard utility unavailable",
        copied ? "info" : "warning"
      );
    } catch {}
  };

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
      `  ──────────────────────────────────────────────────────────────────────────────────\n` +
      `  Run /lingual tuner [request] to launch the adaptive wizard in your native language (${state.sourceLang}).`;
    ctx.ui.notify(guide, "info");
  };

  const digestHandler = async (args: string, ctx: ExtensionContext) => {
    const trimmed = args.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const sub = (parts[0] || "").toLowerCase();

    if (sub === "clear" || sub === "reset") {
      clearPhrasebook();
      ctx.ui.notify("[lingual] Phrasebook cleared.", "info");
      return;
    }

    const entries = readPhrasebook();
    if (sub === "export") {
      const fmtRaw = (parts[1] || "md").toLowerCase();
      const fmt: "md" | "anki" = fmtRaw === "anki" || fmtRaw === "tsv" ? "anki" : "md";
      if (entries.length === 0) {
        ctx.ui.notify("[lingual] Phrasebook is empty — nothing to export yet.", "info");
        return;
      }
      const { filePath, count } = exportPhrasebook(entries, fmt, ctx.cwd || process.cwd());
      ctx.ui.notify(`[lingual] Exported ${count} phrasebook entries (${fmt}) -> ${filePath}`, "info");
      return;
    }

    ctx.ui.notify(formatPhrasebookDigest(entries), "info");
  };

  return {
    showStatusHandler,
    showLastHandler,
    copyLastHandler,
    showAgentGuideHandler,
    digestHandler,
  };
}
