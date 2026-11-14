import type {
  CustomModeConfig,
  LingualConfig,
  LingualRequest,
  LingualResponse,
  LingualResult,
  PromptCandidate,
  PromptSlotConfig,
  ReasoningEffort,
  SlotConfig,
  SlotResult,
  TranslationPayload,
} from "../types.js";
import { formatTerminalAnnotation } from "../layout.js";
import { resolveLabelsForLang, resolveSlotsForPreset } from "../presets.js";
import {
  buildModifySystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildSystemPrompt,
  getDefaultDirectSlots,
  getDefaultSlots,
  interpolatePromptVariables,
  resolveLanguageName,
} from "../prompts.js";
import { isNonEnglish, shouldShieldBypass } from "../shield.js";
import { LingualLruCache, globalLingualCache } from "../cache.js";
import {
  defaultSlotsForMode,
  loadUserLingualConfig,
  resolveCandidateSlotsFromConfig,
  resolveDirectSlotsFromConfig,
} from "../config.js";
import { ensureCodeTokensPreserved } from "../sanitizer.js";
import { DEFAULT_CONFIG, executeLlmCompletion, withStreamingPartial } from "./llm.js";
import {
  BLOCKED_JSON_KEYS,
  extractCleanJsonField,
  parseLlmResponse,
  repairAndParseJsonObject,
  toCleanString,
} from "./parser.js";

export const LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("en", "ja");
export const MAX_TRANSLATION_CHARS = 2500;
export const MAX_TRANSLATION_LINES = 30;

export function shouldTriggerTranslation(
  text: string,
  sourceLang = "en",
  allowSameLangPromptOpt = false
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TRANSLATION_CHARS) return false;
  if (trimmed.split(/\r?\n/).length > MAX_TRANSLATION_LINES) return false;
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith("---")) return false;
  if (shouldShieldBypass(trimmed)) return false;

  if (allowSameLangPromptOpt) {
    if (isNonEnglish(trimmed)) return true;
    const words = trimmed.split(/\s+/);
    return words.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
  }

  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const nonLatinLangs = new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
  if (nonLatinLangs.has(normSource)) {
    return isNonEnglish(trimmed);
  }

  if (isNonEnglish(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  return words.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
}

export function isDynamicLongInput(text: string, sourceLang = "en"): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const hasCjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed);
  const isCjk =
    normSource === "zh" || normSource === "tw" || normSource === "ja" || normSource === "ko" || hasCjk;
  if (isCjk) {
    if (trimmed.length >= 45) return true;
    const sentenceCount = (trimmed.match(/[。！？；\n]/g) || []).length;
    if (sentenceCount >= 2 && trimmed.length >= 30) return true;
  } else {
    if (trimmed.length >= 85) return true;
    const sentenceCount = (trimmed.match(/[.!?](\s+|$)|[\n;]/g) || []).length;
    if (sentenceCount >= 2 && trimmed.length >= 50) return true;
  }

  return trimmed.length >= 85;
}

export interface LingualCoreOptions {
  completer?: (prompt: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
  cache?: LingualLruCache<TranslationPayload>;
  signal?: AbortSignal;
}

export async function translateCore(
  req: LingualRequest,
  options?: LingualCoreOptions
): Promise<LingualResponse> {
  const text = (req.text || "").trim();
  const sourceLang = req.sourceLang || "en";
  const targetLang = req.targetLang || "ja";

  if (!text) {
    return { spoken: "", written: "", cached: false, shieldBypassed: false };
  }
  if (shouldShieldBypass(text)) {
    return { spoken: text, written: text, cached: false, shieldBypassed: true };
  }

  const cache = options?.cache || globalLingualCache;
  const slotSig = Array.isArray(req.slots)
    ? req.slots.filter((s) => s.enabled !== false).map((s) => s.id).join(",")
    : undefined;
  const cacheKey = LingualLruCache.buildKey(text, sourceLang, targetLang, slotSig);
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      spoken: cached.spoken,
      spokenMeaning: cached.spokenMeaning,
      written: cached.written || cached.spoken,
      writtenMeaning: cached.writtenMeaning,
      vocab: cached.vocab,
      summary: cached.summary,
      cached: true,
      shieldBypassed: false,
    };
  }

  if (!options?.completer) {
    return { spoken: text, written: text, cached: false, shieldBypassed: false };
  }

  const systemPrompt = buildSystemPrompt(
    sourceLang,
    targetLang,
    Boolean(req.isLongInput),
    req.context,
    req.tone || "general",
    req.slots
  );

  const raw = await options.completer(text, systemPrompt, options.signal);
  if (!raw) {
    return { spoken: text, written: text, cached: false, shieldBypassed: false };
  }

  const parsed = parseLlmResponse(raw);
  if (!parsed) {
    return { spoken: text, written: text, cached: false, shieldBypassed: false };
  }

  cache.set(cacheKey, parsed);
  const configuredSlots: SlotConfig[] = Array.isArray(req.slots) ? req.slots : getDefaultSlots(sourceLang);
  const rawObj = repairAndParseJsonObject(raw) || {};

  const slotResults: SlotResult[] = [];
  for (const slot of configuredSlots) {
    if (!slot.enabled) continue;
    if (slot.role === "source") {
      slotResults.push({ id: slot.id, label: slot.label, role: slot.role, content: text });
    } else {
      const out =
        parsed.slotOutputs && Object.hasOwn(parsed.slotOutputs, slot.id)
          ? parsed.slotOutputs[slot.id]
          : undefined;
      const content =
        out?.content ||
        toCleanString(rawObj[slot.id]) ||
        (slot.id === "spoken"
          ? parsed.spoken
          : slot.id === "written"
            ? parsed.written || ""
            : slot.id === "vocab"
              ? parsed.vocab || ""
              : "");
      const meaning =
        out?.meaning ||
        toCleanString(rawObj[slot.id + "_meaning"]) ||
        (slot.id === "spoken" ? parsed.spokenMeaning : slot.id === "written" ? parsed.writtenMeaning : undefined) ||
        undefined;
      if (content) {
        slotResults.push({ id: slot.id, label: slot.label, role: slot.role || "translation", content, meaning });
      }
    }
  }

  return {
    spoken: parsed.spoken,
    spokenMeaning: parsed.spokenMeaning,
    written: parsed.written || parsed.spoken,
    writtenMeaning: parsed.writtenMeaning,
    vocab: parsed.vocab,
    summary: parsed.summary,
    slots: slotResults,
    cached: false,
    shieldBypassed: false,
  };
}

export async function translatePrompt(
  text: string,
  userConfig: Partial<LingualConfig> & { modeConfig?: CustomModeConfig } = {}
): Promise<LingualResult | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diskConfig = loadUserLingualConfig();
  const activeMode = userConfig.modeConfig;
  const cfg: LingualConfig = {
    ...DEFAULT_CONFIG,
    ...diskConfig,
    ...userConfig,
    sourceLang:
      activeMode?.customInputLang || userConfig.sourceLang || diskConfig.sourceLang || DEFAULT_CONFIG.sourceLang,
    targetLang:
      activeMode?.customOutputLang || userConfig.targetLang || diskConfig.targetLang || DEFAULT_CONFIG.targetLang,
    reasoning: activeMode?.reasoning ?? userConfig.reasoning ?? diskConfig.reasoning,
  };

  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) return null;
  if (shouldShieldBypass(trimmed)) return null;

  const effectiveSlots =
    (activeMode?.slots && activeMode.slots.length > 0 ? activeMode.slots : undefined) ||
    cfg.slots ||
    (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : undefined);
  const slotSig = Array.isArray(effectiveSlots)
    ? effectiveSlots.filter((s) => s.enabled !== false).map((s) => s.id).join(",")
    : undefined;
  const modeSig = activeMode ? `${activeMode.id}:${slotSig || ""}` : slotSig;
  const cacheKey = LingualLruCache.buildKey(trimmed, cfg.sourceLang, cfg.targetLang, modeSig);
  const cached = globalLingualCache.get(cacheKey);
  if (cached) return cached;

  const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
  const sysPrompt = activeMode
    ? compileModeSystemPrompt(
        { ...activeMode, slots: (effectiveSlots as PromptSlotConfig[]) || activeMode.slots },
        {
          sourceLang: cfg.sourceLang,
          targetLang: cfg.targetLang,
          explainLang: cfg.explainLang,
          globalKillList: cfg.globalKillList,
          context: (cfg as any).context,
          isLongInput,
        }
      )
    : buildSystemPrompt(
        cfg.sourceLang,
        cfg.targetLang,
        isLongInput,
        (cfg as any).context,
        "general",
        effectiveSlots,
        cfg.killList,
        cfg.globalKillList,
        undefined,
        cfg.explainLang
      );

  const content = await executeLlmCompletion(trimmed, sysPrompt, withStreamingPartial(cfg));
  if (typeof content !== "string" || !content.trim()) return null;
  const payload = parseLlmResponse(content);
  if (!payload || !payload.spoken) return null;

  const labels = resolveLabelsForLang(cfg.sourceLang || "en", cfg.labels, cfg.targetLang || "ja");
  const slot1Label = labels.slot1Label || labels.spokenLabel || "Spoken";
  const slot2Label = labels.slot2Label || labels.writtenLabel || "Written";
  const vocabLabel = labels.vocabLabel || "Vocab";
  const sourceLabel = labels.sourceLabel || "Source";

  const effectiveSourceText =
    isLongInput && payload.summary && payload.summary.trim() ? payload.summary.trim() : trimmed;

  const result: LingualResult = {
    spoken: payload.spoken,
    spokenMeaning: payload.spokenMeaning,
    written: payload.written || "",
    writtenMeaning: payload.writtenMeaning,
    vocab: payload.vocab,
    summary: payload.summary,
    sourceText: effectiveSourceText,
    slotOutputs: payload.slotOutputs,
    annotated: formatTerminalAnnotation(
      effectiveSourceText,
      payload.spoken,
      payload.written,
      payload.vocab,
      {
        spokenMeaning: payload.spokenMeaning,
        writtenMeaning: payload.writtenMeaning,
        slot1Label,
        slot2Label,
        vocabLabel,
        sourceLabel,
      }
    ),
  };

  globalLingualCache.set(cacheKey, result);
  return result;
}

export function shouldInjectNativeReplyGuard(
  originalText: string,
  _sourceLang = "en",
  enabled = false
): boolean {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed || !isNonEnglish(trimmed)) return false;
  const isEnglishWritingIntent =
    /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(
      trimmed
    );
  return !isEnglishWritingIntent;
}

export function formatNativeReplyGuardHint(sourceLang = "en"): string {
  const name = resolveLanguageName(sourceLang);
  return `\n\n(Please reply and explain in ${name}.)`;
}

export function compileModeSystemPrompt(
  mode: CustomModeConfig,
  options: {
    sourceLang?: string;
    targetLang?: string;
    explainLang?: string;
    globalKillList?: string[];
    context?: string;
    isLongInput?: boolean;
  }
): string {
  const sourceLang = mode.customInputLang || options.sourceLang || "en";
  const targetLang = mode.customOutputLang || options.targetLang || "en";
  const explainLang = options.explainLang || sourceLang;

  const rawSlots =
    Array.isArray(mode.slots) && mode.slots.length > 0
      ? mode.slots
      : defaultSlotsForMode(mode, sourceLang, explainLang);

  const interpolatedSlots = rawSlots.map((s) => ({
    ...s,
    instruction: s.instruction
      ? interpolatePromptVariables(s.instruction, {
          sourceLang,
          targetLang,
          explainLang,
        })
      : "",
  }));

  const slotKillLists = rawSlots.flatMap((s) => s.killList || []);
  const combinedKillList = [...(mode.killList || []), ...slotKillLists];

  if (mode.action === "pass-through" && (mode.flow === "translate" || mode.flow === "custom")) {
    return buildSystemPrompt(
      sourceLang,
      targetLang,
      Boolean(options.isLongInput),
      options.context,
      "general",
      interpolatedSlots as SlotConfig[],
      combinedKillList,
      options.globalKillList,
      mode.systemHint,
      explainLang
    );
  }

  if (mode.flow === "proofread") {
    return buildModifySystemPrompt({
      sourceLang,
      targetLang,
      explainLang,
      customSlots: interpolatedSlots,
      context: options.context,
      killList: combinedKillList,
      globalKillList: options.globalKillList,
      preserveCodeSwitching: mode.preserveCodeSwitching,
      systemHint: mode.systemHint,
    });
  }

  return buildPromptCandidatesSystemPrompt({
    sourceLang,
    targetLang,
    promptSlots: interpolatedSlots,
    context: options.context,
    promptRule: mode.systemHint,
    killList: combinedKillList,
    globalKillList: options.globalKillList,
  });
}

export async function executeModeRunner(
  text: string,
  mode: CustomModeConfig,
  userConfig: Partial<LingualConfig> & { context?: string } = {}
): Promise<PromptCandidate[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };

  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang, true)) {
    return null;
  }

  const resolvedReasoning = (mode.reasoning ?? cfg.reasoning ?? "low") as ReasoningEffort;
  const effectiveCfg: LingualConfig = {
    ...cfg,
    reasoning: resolvedReasoning,
  };

  const effectiveSourceLang = effectiveCfg.sourceLang || "en";
  const effectiveTargetLang = effectiveCfg.targetLang || "en";
  const slotSig = Array.isArray(mode.slots)
    ? mode.slots.filter((s) => s.enabled !== false).map((s) => s.id).join(",")
    : "";
  const cacheKey = LingualLruCache.buildKey(
    trimmed,
    effectiveSourceLang,
    effectiveTargetLang,
    `${mode.id}:${slotSig}:${(effectiveCfg as any).context || ""}`
  );

  const cached = globalLingualCache.getCandidates<PromptCandidate>(cacheKey);
  if (cached) {
    return cached;
  }

  const sysPrompt = compileModeSystemPrompt(mode, {
    sourceLang: effectiveCfg.sourceLang,
    targetLang: effectiveCfg.targetLang,
    explainLang: effectiveCfg.explainLang,
    globalKillList: effectiveCfg.globalKillList,
    context: (effectiveCfg as any).context || userConfig.context,
  });

  const raw = await executeLlmCompletion(trimmed, sysPrompt, withStreamingPartial(effectiveCfg));
  if (typeof raw !== "string" || !raw.trim()) return null;

  const obj = repairAndParseJsonObject(raw);
  if (!obj) {
    const fallbackSingle = extractCleanJsonField(raw, mode.slots[0]?.id || "prompt");
    if (fallbackSingle) {
      const fallbackResult: PromptCandidate[] = [
        {
          id: mode.slots[0]?.id || "concise",
          label: mode.slots[0]?.label || "Direct",
          content: ensureCodeTokensPreserved(trimmed, fallbackSingle.trim()),
        },
      ];
      globalLingualCache.setCandidates(cacheKey, fallbackResult);
      return fallbackResult;
    }
    return null;
  }

  const enabledSlots = mode.slots.filter((s) => s.enabled !== false);
  const vocabSlot = enabledSlots.find((s) => s.role === "vocab" || s.id === "vocab" || s.id === "fixes");
  const extractedVocab =
    vocabSlot &&
    !BLOCKED_JSON_KEYS.has(vocabSlot.id) &&
    typeof obj[vocabSlot.id] === "string" &&
    obj[vocabSlot.id].trim()
      ? obj[vocabSlot.id].trim()
      : typeof obj.fixes === "string" && obj.fixes.trim()
        ? obj.fixes.trim()
        : typeof obj.vocab === "string" && obj.vocab.trim()
          ? obj.vocab.trim()
          : undefined;

  const rewriteSlots = enabledSlots.filter((s) => s.role !== "vocab" && s.id !== "source");
  const candidates: PromptCandidate[] = [];

  for (const slot of rewriteSlots) {
    if (BLOCKED_JSON_KEYS.has(slot.id)) continue;
    let val = obj[slot.id];
    if (!val) {
      if (slot.id === "fixed" && typeof obj.fixed === "string") val = obj.fixed;
      else if (slot.id === "native" && typeof obj.native === "string") val = obj.native;
      else if (rewriteSlots.length === 1) val = obj.prompt ?? obj.direct_spec ?? obj.fixed ?? obj.spoken;
    }
    const meaningVal = typeof obj[`${slot.id}_meaning`] === "string" ? obj[`${slot.id}_meaning`].trim() : undefined;

    if (typeof val === "string" && val.trim()) {
      const finalContent =
        slot.role !== "vocab" && slot.role !== "source"
          ? ensureCodeTokensPreserved(trimmed, val.trim())
          : val.trim();
      candidates.push({
        id: slot.id,
        label: slot.label,
        content: finalContent,
        meaning: meaningVal,
        ...(extractedVocab ? { vocab: extractedVocab } : {}),
        hideWhenLong: Boolean(slot.hideWhenLong),
      });
    }
  }

  if (mode.primarySlotId && candidates.length > 1) {
    const pIdx = candidates.findIndex((c) => c.id.toLowerCase() === mode.primarySlotId?.toLowerCase());
    if (pIdx > 0) {
      const [primary] = candidates.splice(pIdx, 1);
      candidates.unshift(primary);
    }
  }

  if (candidates.length > 0) {
    globalLingualCache.setCandidates(cacheKey, candidates);
    return candidates;
  }

  return null;
}

export async function generatePromptCandidates(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<PromptCandidate[] | null> {
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };

  const slots = resolveCandidateSlotsFromConfig({
    sourceLang: cfg.sourceLang,
    promptSlots: userConfig.promptSlots ?? diskConfig.promptSlots,
  });

  const isModify = slots.some((s) => s.id === "fixed");
  const virtualMode: CustomModeConfig = {
    id: isModify ? "live-flow" : "candidates",
    name: isModify ? "Live Flow" : "Candidates",
    flow: isModify ? "proofread" : "translate",
    action: isModify ? "transform" : "select",
    hud: isModify ? "adaptive-takeaway" : "tree",
    slots,
    enabled: true,
  };

  return executeModeRunner(text, virtualMode, userConfig);
}

export async function rewritePromptDirect(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<string | null> {
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  const allSlots = resolveDirectSlotsFromConfig({
    sourceLang: cfg.sourceLang,
    directSlots: userConfig.directSlots ?? userConfig.promptSlots ?? diskConfig.directSlots,
  }).filter((s) => s.enabled !== false && s.role !== "vocab");
  const firstSlot = allSlots[0] || getDefaultDirectSlots(cfg.sourceLang)[0];
  const res = await generatePromptCandidates(text, { ...userConfig, promptSlots: [firstSlot] });
  return res && res[0] ? res[0].content : null;
}
