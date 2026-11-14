import type { ExtensionContext, InputEvent, InputEventResult } from "@earendil-works/pi-coding-agent";
import type {
  CustomModeConfig,
  ExtensionState,
  LingualResult,
  PromptSlotConfig,
  SlotConfig,
  SlotResult,
} from "../types.js";
import type { LingualSessionController } from "../fsm.js";
import type { HudManager } from "./hud.js";
import { buildStreamingResult, pickPrimaryContent, primarySlot } from "../runtime.js";
import { formatLoadingMessage } from "../layout.js";
import {
  executeModeRunner,
  formatNativeReplyGuardHint,
  getDefaultDirectSlots,
  getDefaultModifySlots,
  getDefaultPromptSlots,
  hasExternalConfigUpdate,
  isDynamicLongInput,
  loadUserLingualConfig,
  localizeModes,
  localizeSlotLabel,
  normalizeActiveModeId,
  resolveModesFromConfig,
  saveUserLingualConfig,
  shouldInjectNativeReplyGuard,
  shouldTriggerTranslation,
  translatePrompt,
} from "../engine.js";
import { getDefaultFactoryModes, getDefaultSlots, resolveLabelsForLang, resolveSlotsForPreset } from "../presets.js";
import { sanitizePromptForTranslation } from "../sanitizer.js";
import { formatRepoGroundingHint, resolveRepoFileAnchors } from "../grounding.js";
import { recordPhrasebookFromResult } from "../phrasebook.js";
import {
  detectScriptLanguage,
  isImperativeEngineeringPrompt,
  isTargetLanguageOnly,
} from "../shield.js";
import {
  captureGitContextSnapshot,
  copyToClipboard,
  extractRecentContextAnchor,
  hasActiveUI,
  safeClearWidget,
} from "../context.js";
import { createModelCompleter } from "../completer.js";
import { pickCandidateInteractive } from "../pickers.js";

export interface InputDispatcherDeps {
  state: ExtensionState;
  session: LingualSessionController;
  hud: HudManager;
  getLastContext: () => ExtensionContext | null;
  setLastContext: (ctx: ExtensionContext) => void;
  clearPendingTimers: () => void;
  setPolishTimer: (timer: NodeJS.Timeout | undefined) => void;
  onBeforeInput: (rawText: string, ctx: ExtensionContext) => void;
}

export function createInputDispatcher(deps: InputDispatcherDeps) {
  const {
    state,
    session,
    hud,
    getLastContext,
    setLastContext,
    clearPendingTimers,
    setPolishTimer,
    onBeforeInput,
  } = deps;

  return async (event: InputEvent, ctx: ExtensionContext): Promise<InputEventResult> => {
    onBeforeInput(event?.text || "", ctx);
    if (event.source === "extension") return { action: "continue" };

    // Sync external lingual.json updates BEFORE checking mode === "off"
    const externalChanged = hasExternalConfigUpdate();
    const latestDisk = loadUserLingualConfig();
    let footerNeedsRefresh = false;

    if (externalChanged) {
      if (latestDisk.sourceLang && latestDisk.sourceLang !== state.sourceLang) {
        state.sourceLang = latestDisk.sourceLang;
        footerNeedsRefresh = true;
      }
      if (latestDisk.targetLang && latestDisk.targetLang !== state.targetLang) {
        state.targetLang = latestDisk.targetLang;
        footerNeedsRefresh = true;
      }
      state.explainLang =
        latestDisk.explainLang ||
        (state.sourceLang === "zh" || state.sourceLang === "tw" ? "zh" : state.sourceLang);
      state.labels = resolveLabelsForLang(state.sourceLang, latestDisk.labels, state.targetLang);
      if (latestDisk.selectedModel) state.selectedModel = latestDisk.selectedModel;
      if (latestDisk.compact !== undefined) state.compact = latestDisk.compact;
      if (latestDisk.modeLocked !== undefined) state.modeLocked = latestDisk.modeLocked;
      if (latestDisk.slotPreset !== undefined) state.slotPreset = latestDisk.slotPreset;
      if (latestDisk.slots?.length) {
        state.slots = latestDisk.slots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }));
      }
      if (latestDisk.modes?.length) {
        state.modes = localizeModes(latestDisk.modes, state.sourceLang, state.explainLang);
        footerNeedsRefresh = true;
      } else {
        state.modes = resolveModesFromConfig(latestDisk, state.sourceLang);
      }
      const extMode = latestDisk.activeModeId || latestDisk.mode;
      if (extMode) {
        const norm = normalizeActiveModeId({ mode: extMode, activeModeId: extMode }, state.modes);
        if (norm !== state.mode) {
          state.mode = norm as any;
          state.activeModeId = norm;
          footerNeedsRefresh = true;
        }
      }
    } else if (!state.modes?.length) {
      state.modes = resolveModesFromConfig(latestDisk, state.sourceLang);
    }

    if (footerNeedsRefresh && hasActiveUI(ctx)) {
      hud.updateFooter(ctx);
    }

    if (state.mode === "off") return { action: "continue" };

    const raw = event.text.trim();
    if (!raw) return { action: "continue" };

    // Input-driven locale adaptation on cold boot
    if (!latestDisk.sourceLang && state.sourceLang === "en" && (state.mode === "companion" || state.mode === "original")) {
      const detected = detectScriptLanguage(raw);
      if (detected && detected !== "en") {
        state.sourceLang = detected;
        state.targetLang = "en";
        state.explainLang = detected === "zh" || detected === "tw" ? "zh" : detected;
        state.labels = resolveLabelsForLang(state.sourceLang, undefined, state.targetLang);
        state.slots = state.slotPreset
          ? resolveSlotsForPreset(state.slotPreset, state.sourceLang)
          : getDefaultSlots(state.sourceLang);
        state.directSlots = getDefaultDirectSlots(state.sourceLang);
        state.promptSlots = getDefaultPromptSlots(state.sourceLang);
        state.modifySlots = getDefaultModifySlots(state.sourceLang, state.explainLang);
        const isFactory =
          state.modes.length === 3 &&
          state.modes.every((m) => ["companion", "direct", "live-flow"].includes(m.id));
        if (isFactory) {
          state.modes = getDefaultFactoryModes(state.sourceLang, state.explainLang);
        }
        saveUserLingualConfig({ sourceLang: state.sourceLang, targetLang: state.targetLang });
        if (hasActiveUI(ctx)) {
          hud.updateFooter(ctx);
        }
      }
    }
    if (raw.startsWith("/") || raw.startsWith("!")) {
      clearPendingTimers();
      session.abortActive();
      if (hasActiveUI(ctx)) hud.updateFooter(ctx);
      return { action: "continue" };
    }

    const sanitized = sanitizePromptForTranslation(raw);
    const promptToTranslate = sanitized.distilledText;
    const latestModes = state.modes;
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId || latestDisk.activeModeId },
      latestModes
    );
    const currentMode = latestModes.find((m) => m.id === activeModeId) || latestModes[0];
    const rt = hud.runtimeForMode(currentMode);
    const isPromptOptMode = rt.dispatcher !== "pass-through";

    // Target-language direct input bypass (respects custom flow language pairs)
    const isTargetInput = isTargetLanguageOnly(promptToTranslate, rt.inputLang, rt.outputLang);
    if (isTargetInput) {
      if (rt.dispatcher === "pass-through") {
        clearPendingTimers();
        session.abortActive();
        session.clearPagination();
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `[${rt.outputLang} · direct]`));
        }
        return { action: "continue" };
      }

      if (rt.dispatcher === "transform" && rt.flow === "translate" && isImperativeEngineeringPrompt(promptToTranslate)) {
        clearPendingTimers();
        session.abortActive();
        session.clearPagination();
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `[${rt.outputLang} · spec ok]`));
        }
        return { action: "continue" };
      }
    }

    if (!sanitized.hasNaturalLanguage || !shouldTriggerTranslation(promptToTranslate, rt.inputLang, isPromptOptMode)) {
      clearPendingTimers();
      session.abortActive();
      session.clearPagination();
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        hud.updateFooter(ctx);
      }
      return { action: "continue" };
    }

    setLastContext(ctx);
    const { generation, signal } = session.beginRequest();
    const resolvedReasoning = rt.reasoning ?? latestDisk.reasoning ?? "low";
    const completer = createModelCompleter(ctx, () => state.selectedModel, { reasoning: resolvedReasoning });

    session.initPagination(1);

    // Dispatcher: pass-through (0ms raw send + async streaming HUD card)
    if (rt.dispatcher === "pass-through") {
      const hudSlots = (rt.slots.length > 0 ? rt.slots : state.slots) as SlotConfig[];
      const isLong = isDynamicLongInput(promptToTranslate, state.sourceLang);

      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "⇄ [lingual] polishing..."));
        } catch {}
        hud.renderHudWidget(
          ctx,
          { spoken: "", written: "", sourceText: promptToTranslate, annotated: "" },
          rt,
          { isLong }
        );
      }

      let lastPaint = 0;
      const paintPartial = (fields: Record<string, string>) => {
        const now = Date.now();
        if (now - lastPaint < 90) return;
        lastPaint = now;
        if (!session.isLatest(generation) || signal.aborted) return;
        const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(getLastContext()) ? getLastContext() : null;
        if (!activeCtx) return;
        hud.renderHudWidget(activeCtx, buildStreamingResult(fields, promptToTranslate), rt, {
          isLong,
          isStreaming: true,
        });
      };

      clearPendingTimers();
      const timer = setTimeout(() => {
        setPolishTimer(undefined);
        if (!session.isLatest(generation) || signal.aborted) return;

        translatePrompt(promptToTranslate, {
          modeConfig: currentMode,
          sourceLang: rt.inputLang,
          targetLang: rt.outputLang,
          explainLang: rt.explainLang,
          reasoning: resolvedReasoning,
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
            if (!session.isLatest(generation) || signal.aborted || !result) return;

            session.setPageResult(0, result, generation);
            if (result.vocab) {
              recordPhrasebookFromResult({
                vocab: result.vocab,
                sourceText: promptToTranslate,
                sourceLang: rt.inputLang,
                targetLang: rt.outputLang,
                modeId: currentMode.id,
              });
            }

            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(getLastContext()) ? getLastContext() : null;
            if (!activeCtx) return;

            if (rt.target === "clipboard") {
              const chosen = pickPrimaryContent(result, rt);
              if (chosen) {
                const copied = copyToClipboard(chosen);
                const msg = copied
                  ? state.labels.notifyClipboardCopied || "[lingual] Copied to clipboard"
                  : "[lingual] Clipboard utility unavailable";
                activeCtx.ui.notify(msg, copied ? "info" : "warning");
              }
              safeClearWidget(activeCtx);
              return;
            }

            hud.renderHudWidget(activeCtx, result, rt, { isLong });
          })
          .catch(() => {})
          .finally(() => {
            if (session.isLatest(generation)) {
              const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(getLastContext()) ? getLastContext() : null;
              if (activeCtx) hud.updateFooter(activeCtx);
            }
          });
      }, 80);
      setPolishTimer(timer);

      return { action: "continue" };
    }

    const isSelectMode = rt.dispatcher === "select";
    const isModifyMode = rt.isProofread;
    const isDirectMode = rt.dispatcher === "transform" && !isModifyMode;
    const isLongInput = isDynamicLongInput(promptToTranslate, state.sourceLang);

    let lastTransformPaint = 0;
    const onPartial =
      hasActiveUI(ctx) && rt.hud !== "none"
        ? (fields: Record<string, string>) => {
            const now = Date.now();
            if (now - lastTransformPaint < 90) return;
            lastTransformPaint = now;
            if (!session.isLatest(generation) || signal.aborted) return;
            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(getLastContext()) ? getLastContext() : null;
            if (!activeCtx) return;
            hud.renderHudWidget(activeCtx, buildStreamingResult(fields, promptToTranslate), rt, {
              isLong: isLongInput,
              isStreaming: true,
            });
          }
        : undefined;

    if (hasActiveUI(ctx) && rt.hud !== "none") {
      try {
        const rawLoadingMsg = isModifyMode
          ? state.labels.loadingFixSyntax || "  ⋯ [lingual] fixing syntax & typos..."
          : isDirectMode
            ? state.labels.loadingOptimizePrompt || "  ⋯ [lingual] optimizing prompt..."
            : state.labels.loadingCandidates || "  ⋯ [lingual] generating prompt candidates...";
        ctx.ui.setWidget("lingual_hud", [ctx.ui.theme.fg("muted", formatLoadingMessage(rawLoadingMsg))], {
          placement: "aboveEditor",
        });
        const statusLoadingMsg = isModifyMode
          ? state.labels.statusLoadingFix || "[lingual] fixing..."
          : isDirectMode
            ? state.labels.statusLoadingOptimize || "[lingual] optimizing..."
            : state.labels.statusLoadingCandidates || "[lingual] generating...";
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", statusLoadingMsg));
      } catch {}
    } else if (hasActiveUI(ctx) && rt.hud === "none") {
      safeClearWidget(ctx);
    }

    try {
      let recentContext = "";
      if (currentMode.id === "commit" || (currentMode as any).contextAware === true || rt.contextAware) {
        recentContext = captureGitContextSnapshot(ctx.cwd || process.cwd());
      }

      if (isDirectMode || (currentMode as any).contextAware === true || rt.contextAware) {
        const assistantAnchor = extractRecentContextAnchor(ctx);
        if (assistantAnchor) {
          recentContext = recentContext
            ? `${recentContext}\n[LAST AGENT SUMMARY]: ${assistantAnchor}`
            : `[LAST AGENT SUMMARY]: ${assistantAnchor}`;
        }
        const repoAnchors = resolveRepoFileAnchors(promptToTranslate, ctx.cwd || process.cwd());
        const groundingHint = formatRepoGroundingHint(repoAnchors);
        if (groundingHint) {
          recentContext = recentContext ? `${recentContext}\n${groundingHint}` : groundingHint;
        }
      }

      const modeToRun: CustomModeConfig = {
        ...currentMode,
        action: rt.dispatcher,
        flow: isModifyMode ? "proofread" : currentMode.flow,
        slots: rt.slots as PromptSlotConfig[],
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
      if (candidateVocab) {
        recordPhrasebookFromResult({
          vocab: candidateVocab,
          sourceText: promptToTranslate,
          sourceLang: rt.inputLang,
          targetLang: rt.outputLang,
          modeId: currentMode.id,
        });
      }

      hud.renderHudWidget(ctx, result, rt, { isLong: isLongInput });

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
          hud.updateFooter(ctx);
          return { action: "continue" };
        }
        chosenText = picked;
      }

      let finalText = sanitized.rawPayload ? `${chosenText}\n\n${sanitized.rawPayload}` : chosenText;
      const diskConfig = loadUserLingualConfig();
      if (rt.target !== "clipboard" && shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }

      if (rt.target === "clipboard") {
        const copied = copyToClipboard(finalText);
        if (hasActiveUI(ctx)) {
          const msg = copied
            ? state.labels.notifyClipboardCopied || "[lingual] Copied to clipboard"
            : "[lingual] Clipboard utility unavailable";
          ctx.ui.notify(msg, copied ? "info" : "warning");
        }
        return { action: "handled" };
      }

      return { action: "transform", text: finalText, images: event.images };
    } catch {
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        if (rt.dispatcher === "transform") {
          try {
            ctx.ui.notify("[lingual] prompt rewrite error; original prompt passed", "warning");
          } catch {}
        }
      }
      return { action: "continue" };
    } finally {
      if (session.isLatest(generation)) {
        const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(getLastContext()) ? getLastContext() : null;
        if (activeCtx) hud.updateFooter(activeCtx);
      }
    }
  };
}
