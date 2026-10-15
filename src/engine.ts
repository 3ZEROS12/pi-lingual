import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  getVisualWidth,
  truncateVisual,
  wrapVisualText,
  formatTreeBranch,
  formatSubRail,
  extractVocabPhrases,
  spotlightPhrases,
  formatTerminalAnnotation,
  formatCapsuleLine,
  renderCardLayout,
  formatVocabItemsAtomic,
  CANNOT_START_LINE_CHARS,
  getEffectiveMaxCols,
} from "./layout.js";
import type {
  CustomModeConfig,
  LingualConfig,
  LingualMode,
  LingualRequest,
  LingualResponse,
  LingualResult,
  PromptCandidate,
  PromptSlotConfig,
  ReasoningEffort,
  SlotConfig,
  SlotResult,
  TranslationPayload,
} from "./types.js";
export type { ReasoningEffort } from "./types.js";
import {
  resolveLabelsForLang,
  resolveSlotsForPreset,
  getDefaultFactoryModes,
  PRESET_LOADOUTS,
  getPresetLoadout,
  listPresetLoadouts,
} from "./presets.js";
import {
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildModifySystemPrompt,
  getDefaultSlots,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
  interpolatePromptVariables,
  resolveLanguageName,
  DEFAULT_KILL_LIST,
  compileKillListInstruction,
} from "./prompts.js";
import { shouldShieldBypass, isNonEnglish } from "./shield.js";
import { LingualLruCache, globalLingualCache } from "./cache.js";

export {
  getVisualWidth,
  truncateVisual,
  wrapVisualText,
  formatTreeBranch,
  formatSubRail,
  extractVocabPhrases,
  spotlightPhrases,
  formatTerminalAnnotation,
  formatCapsuleLine,
  renderCardLayout,
  formatVocabItemsAtomic,
  CANNOT_START_LINE_CHARS,
  getEffectiveMaxCols,
  isNonEnglish,
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildModifySystemPrompt,
  interpolatePromptVariables,
  resolveLanguageName,
  getDefaultFactoryModes,
  PRESET_LOADOUTS,
  getPresetLoadout,
  listPresetLoadouts,
  DEFAULT_KILL_LIST,
  compileKillListInstruction,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
};

let cachedUserConfig: Partial<LingualConfig> | null = null;
let lastConfigCheckTime = 0;
const CONFIG_CACHE_TTL_MS = 2000;

export function invalidateUserConfigCache(): void {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}

export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.execArgv.some((a) => a.startsWith("--test") || a === "--test") ||
    process.argv.some((a) => a === "--test" || a.startsWith("--test=") || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(a)) ||
    process.env.npm_lifecycle_event === "test"
  );
}

/**
 * Check if user lingual config is already configured on disk
 */
export function isUserLingualConfigured(): boolean {
  if (isTestEnvironment()) return true;
  const agentDir = path.join(os.homedir(), ".pi", "agent");
  const lingualFile = path.join(agentDir, "lingual.json");
  if (!fs.existsSync(lingualFile)) return false;
  try {
    const raw = fs.readFileSync(lingualFile, "utf8");
    const parsed = JSON.parse(raw);
    const inner = parsed && (parsed["pi-lingual"] || parsed);
    return Boolean(inner && (inner.configured || (inner.sourceLang && inner.targetLang)));
  } catch {
    return false;
  }
}

/**
 * Load user configuration from single source of truth: ~/.pi/agent/lingual.json
 * If lingual.json does not exist, performs a one-time graceful migration from settings.json ("pi-lingual" block).
 * Uses high-efficiency 2-second in-memory memoization to prevent synchronous disk I/O thrashing.
 */
export function loadUserLingualConfig(): Partial<LingualConfig> {
  if (isTestEnvironment()) {
    return {};
  }

  const now = Date.now();
  if (cachedUserConfig && now - lastConfigCheckTime < CONFIG_CACHE_TTL_MS) {
    return cachedUserConfig;
  }

  const agentDir = path.join(os.homedir(), ".pi", "agent");
  const lingualFile = path.join(agentDir, "lingual.json");
  const settingsFile = path.join(agentDir, "settings.json");

  let target: Record<string, any> | null = null;

  if (fs.existsSync(lingualFile)) {
    try {
      const raw = fs.readFileSync(lingualFile, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const inner = parsed["pi-lingual"] || parsed;
        target = inner && typeof inner === "object" && !Array.isArray(inner) ? inner : null;
      }
    } catch {
      target = null;
    }
  }

  if (!target && fs.existsSync(settingsFile)) {
    try {
      const raw = fs.readFileSync(settingsFile, "utf8");
      const parsed = JSON.parse(raw);
      const legacyBlock = parsed["pi-lingual"];
      if (legacyBlock && typeof legacyBlock === "object") {
        target = legacyBlock;
        try {
          if (!fs.existsSync(agentDir)) {
            fs.mkdirSync(agentDir, { recursive: true });
          }
          fs.writeFileSync(lingualFile, JSON.stringify(target, null, 2), "utf8");
        } catch {}
      }
    } catch {
      target = null;
    }
  }

  if (target) {
    const endpoint = target.endpoint || target.antigravity?.endpoint;
    const apiKey = target.apiKey || target.antigravity?.apiKey;
    const model = target.model || target.antigravity?.model;
    const selectedModel = target.selectedModel || target.model;
    const sourceLang = target.sourceLang;
    const targetLang = target.targetLang;
    const compact = target.compact;
    const slotPreset = target.slotPreset;
    const filterSlots = (arr: any) =>
      Array.isArray(arr)
        ? arr.filter((s: any) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string")
        : undefined;
    const filterModes = (arr: any) =>
      Array.isArray(arr)
        ? arr.filter((m: any) => m && typeof m === "object" && typeof m.id === "string")
        : undefined;
    const modes = filterModes(target.modes);
    const activeModeId = typeof target.activeModeId === "string" ? target.activeModeId : undefined;
    const globalKillList = Array.isArray(target.globalKillList) ? target.globalKillList : undefined;
    const slots = filterSlots(target.slots);
    const directSlots = filterSlots(target.directSlots);
    const promptSlots = filterSlots(target.promptSlots);
    const modifySlots = filterSlots(target.modifySlots);
    const lastSeenVersion = typeof target.lastSeenVersion === "string" ? target.lastSeenVersion : undefined;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : undefined;
    const timeoutMs = typeof target.timeoutMs === "number" && Number.isFinite(target.timeoutMs)
      ? Math.min(60_000, Math.max(1000, target.timeoutMs))
      : undefined;
    const replyInSourceLang = target.replyInSourceLang !== undefined ? Boolean(target.replyInSourceLang) : undefined;
    const modeLocked = target.modeLocked !== undefined ? Boolean(target.modeLocked) : undefined;
    const labels = resolveLabelsForLang(sourceLang || "en", target.labels, targetLang || "ja");
    const normalizedMode = typeof target.mode === "string" ? (normalizeLingualModeInput(target.mode) || target.mode) : undefined;

    cachedUserConfig = {
      ...target,
      ...(endpoint ? { endpoint } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
      ...(selectedModel ? { selectedModel } : {}),
      ...(normalizedMode ? { mode: normalizedMode as any } : {}),
      ...(modeLocked !== undefined ? { modeLocked } : {}),
      ...(compact !== undefined ? { compact: Boolean(compact) } : {}),
      ...(slotPreset ? { slotPreset } : {}),
      ...(modes ? { modes } : {}),
      ...(activeModeId ? { activeModeId } : {}),
      ...(globalKillList ? { globalKillList } : {}),
      ...(slots ? { slots } : {}),
      ...(directSlots ? { directSlots } : {}),
      ...(promptSlots ? { promptSlots } : {}),
      ...(modifySlots ? { modifySlots } : {}),
      ...(lastSeenVersion ? { lastSeenVersion } : {}),
      ...(sourceLang ? { sourceLang } : {}),
      ...(targetLang ? { targetLang } : {}),
      ...(reasoning ? { reasoning: reasoning as any } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
      ...(replyInSourceLang !== undefined ? { replyInSourceLang } : {}),
      labels,
    };
    lastConfigCheckTime = now;
    return cachedUserConfig;
  }

  cachedUserConfig = {};
  lastConfigCheckTime = now;
  return {};
}

/**
 * Atomic, zero-residue configuration persistence to ~/.pi/agent/lingual.json
 */
export function saveUserLingualConfig(patch: Record<string, any>): void {
  if (isTestEnvironment()) {
    return;
  }

  try {
    const agentDir = path.join(os.homedir(), ".pi", "agent");
    const configFile = path.join(agentDir, "lingual.json");

    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    let existing: Record<string, any> = {};
    if (fs.existsSync(configFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(configFile, "utf8"));
      } catch {}
    }

    for (const [k, v] of Object.entries(patch)) {
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (
        v === undefined ||
        v === "" ||
        isEmptyArray ||
        v === "auto" ||
        (k === "compact" && v === false) ||
        (k === "modeLocked" && v === false)
      ) {
        delete existing[k];
      } else if (k === "mode") {
        existing[k] = v === "english" ? "direct" : v === "select" ? "candidates" : v;
      } else {
        existing[k] = v;
      }
    }

    const content = JSON.stringify(existing, null, 2);
    const tmpFile = `${configFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;

    try {
      fs.writeFileSync(tmpFile, content, "utf8");
      fs.renameSync(tmpFile, configFile);
    } catch {
      try { fs.writeFileSync(configFile, content, "utf8"); } catch {}
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
    }

    invalidateUserConfigCache();
  } catch {}
}

export const DEFAULT_CONFIG: LingualConfig = {
  endpoint: process.env.LINGUAL_ENDPOINT || "",
  apiKey: process.env.LINGUAL_API_KEY || "",
  model: process.env.LINGUAL_MODEL || "",
  selectedModel: "auto",
  mode: "direct",
  sourceLang: "en",
  targetLang: "ja",
  temperature: 0.2,
  timeoutMs: 30000,
};

export const LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("en", "ja");
export const LINGUA_SYSTEM_PROMPT = LINGUAL_SYSTEM_PROMPT;
export const loadUserConfig = loadUserLingualConfig;

export const MAX_TRANSLATION_CHARS = 2500;
export const MAX_TRANSLATION_LINES = 30;

/**
 * Bidirectional language-aware trigger with strict Length & Payload Guards
 */
export function shouldTriggerTranslation(text: string, sourceLang = "en", allowSameLangPromptOpt = false): boolean {
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

  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const nonLatinLangs = new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
  if (nonLatinLangs.has(normSource)) {
    return isNonEnglish(trimmed);
  }

  if (isNonEnglish(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  return words.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
}

const BLOCKED_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function toCleanString(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(toCleanString).filter(Boolean).join(" · ");
  return "";
}

/**
 * Unified featherweight JSON repair & object extractor (protected against prototype pollution & >32KB payloads)
 */
export function repairAndParseJsonObject(raw: string): Record<string, any> | null {
  try {
    if (!raw || typeof raw !== "string" || raw.length > 32_768) return null;
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) cleaned = fence[1].trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last <= first) return null;

    const jsonSubstr = cleaned.slice(first, last + 1);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonSubstr);
    } catch {
      const repaired = jsonSubstr
        .replace(/,\s*([}\]])/g, "$1")
        .replace(
          /("[a-zA-Z0-9_-]+"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
          (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
        );
      parsed = JSON.parse(repaired);
    }
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Clean and parse LLM JSON responses safely (shared across translateCore and translatePrompt)
 */
export function parseLlmResponse(raw: string): TranslationPayload | null {
  const parsed = repairAndParseJsonObject(raw);
  if (!parsed) return null;

  const spoken = toCleanString(parsed.spoken ?? parsed.casual ?? parsed.slot1);
  const spokenMeaning = toCleanString(parsed.spoken_meaning ?? parsed.spokenMeaning);
  const written = toCleanString(parsed.written ?? parsed.academic ?? parsed.slot2);
  const writtenMeaning = toCleanString(parsed.written_meaning ?? parsed.writtenMeaning);
  const vocab = toCleanString(parsed.vocab);
  const summary = toCleanString(parsed.summary ?? parsed.core_intent ?? parsed.coreIntent);

  const slotOutputs: Record<string, { content: string; meaning?: string }> = Object.create(null);
  for (const [k, v] of Object.entries(parsed)) {
    if (BLOCKED_JSON_KEYS.has(k) || k.endsWith("_meaning") || k === "summary") continue;
    const textVal = toCleanString(v);
    if (textVal) {
      const meaningVal = toCleanString(parsed[k + "_meaning"]);
      slotOutputs[k] = {
        content: textVal,
        meaning: meaningVal || undefined,
      };
    }
  }

  const nonVocabOutputs = Object.entries(slotOutputs)
    .filter(([k]) => k !== "vocab")
    .map(([, val]) => val);
  const effectiveSpoken = spoken || nonVocabOutputs[0]?.content || vocab || "";
  const effectiveSpokenMeaning = spokenMeaning || nonVocabOutputs[0]?.meaning || "";
  if (!effectiveSpoken) return null;

  return {
    spoken: effectiveSpoken,
    spokenMeaning: effectiveSpokenMeaning || undefined,
    written: written || undefined,
    writtenMeaning: writtenMeaning || undefined,
    vocab: vocab || undefined,
    summary: summary || undefined,
    slotOutputs: Object.keys(slotOutputs).length > 0 ? slotOutputs : undefined,
  };
}

export interface LingualCoreOptions {
  completer?: (prompt: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
  cache?: LingualLruCache<TranslationPayload>;
  signal?: AbortSignal;
}

/**
 * Pure translation engine orchestrator for lingual-core (decoupled from Pi host session)
 */
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
      const out = parsed.slotOutputs && Object.hasOwn(parsed.slotOutputs, slot.id)
        ? parsed.slotOutputs[slot.id]
        : undefined;
      const content =
        out?.content ||
        toCleanString(rawObj[slot.id]) ||
        (slot.id === "spoken" ? parsed.spoken : slot.id === "written" ? (parsed.written || "") : slot.id === "vocab" ? (parsed.vocab || "") : "");
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

/**
 * Unified LLM transport primitive: handles AbortController timeout synthesis, custom completer, and OpenAI endpoint fallback
 */
async function executeLlmCompletion(
  text: string,
  sysPrompt: string,
  cfg: LingualConfig
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  if (cfg.signal) {
    if (cfg.signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    cfg.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    if (typeof cfg.complete === "function") {
      return await cfg.complete(text, sysPrompt, controller.signal, { reasoning: cfg.reasoning });
    }
    if (cfg.endpoint) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const requestBody: Record<string, any> = {
        model: cfg.model || "gemini-3.8-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: text },
        ],
        temperature: cfg.temperature,
      };
      if (cfg.reasoning) {
        requestBody.reasoning = cfg.reasoning;
      }
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const json = (await response.json()) as any;
      return json?.choices?.[0]?.message?.content ?? null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip annotations and recover purely clean text to prevent LLM prompt pollution
 */
export function stripLingualAnnotation(annotatedText: string): {
  raw: string;
  spoken?: string;
  written?: string;
  vocab?: string;
} {
  const lines = annotatedText.split("\n");
  const rawLines: string[] = [];
  let spoken: string | undefined;
  let written: string | undefined;
  let vocab: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    const sourceMatch = trimmed.match(/^·\s*\[?(?:原文|source|original|quelle)\]?\s+(.*)$/i);
    if (sourceMatch) {
      rawLines.push(sourceMatch[1].trim());
      continue;
    }
    if (/^(?:[│\s]*↳\s*\(.*\)|↳\s*\(.*\))/.test(trimmed)) {
      continue;
    }
    const slotMatch = trimmed.match(/^(?:[┌├└│]\s*|↳\s*)\[([^\]]+)\]\s*(.*)$/);
    if (slotMatch) {
      const tag = slotMatch[1].trim();
      let text = slotMatch[2].trim().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
      const parenIdx = text.lastIndexOf(" (");
      if (parenIdx !== -1 && text.endsWith(")")) {
        text = text.slice(0, parenIdx).trim();
      }
      if (/^(?:口语|spoken|口語|slack|slot1)$/i.test(tag)) {
        spoken = text;
      } else if (/^(?:写作|written|文面|rfc|slot2|敬語)$/i.test(tag)) {
        written = text;
      } else if (/^(?:重点|vocab|単語|词汇)$/i.test(tag)) {
        vocab = text;
      }
    } else {
      rawLines.push(line);
    }
  }

  return { raw: rawLines.join("\n").trim(), spoken, written, vocab };
}

export const stripLinguaAnnotation = stripLingualAnnotation;

/**
 * Dynamic density sensing for long input condensation
 */
export function isDynamicLongInput(text: string, sourceLang = "en"): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const hasCjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed);
  const isCjk = normSource === "zh" || normSource === "tw" || normSource === "ja" || normSource === "ko" || hasCjk;
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

/**
 * Translate a user prompt into idiomatic target registers with native nuance and vocabulary highlights
 */
export async function translatePrompt(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<LingualResult | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };

  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) return null;
  if (shouldShieldBypass(trimmed)) return null;

  const effectiveSlots = cfg.slots || (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : undefined);
  const slotSig = Array.isArray(effectiveSlots)
    ? effectiveSlots.filter((s) => s.enabled !== false).map((s) => s.id).join(",")
    : undefined;
  const cacheKey = LingualLruCache.buildKey(trimmed, cfg.sourceLang, cfg.targetLang, slotSig);
  const cached = globalLingualCache.get(cacheKey);
  if (cached) return cached;

  const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
  const sysPrompt = buildSystemPrompt(cfg.sourceLang, cfg.targetLang, isLongInput, undefined, "general", effectiveSlots);
  const content = await executeLlmCompletion(trimmed, sysPrompt, cfg);
  if (typeof content !== "string" || !content.trim()) return null;

  const payload = parseLlmResponse(content);
  if (!payload || !payload.spoken) return null;

  const labels = resolveLabelsForLang(cfg.sourceLang || "en", cfg.labels, cfg.targetLang || "ja");
  const slot1Label = labels.slot1Label || labels.spokenLabel || "Spoken";
  const slot2Label = labels.slot2Label || labels.writtenLabel || "Written";
  const vocabLabel = labels.vocabLabel || "Vocab";
  const sourceLabel = labels.sourceLabel || "Source";

  const effectiveSourceText = (isLongInput && payload.summary && payload.summary.trim())
    ? payload.summary.trim()
    : trimmed;

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

/**
 * Opt-in Native Reply Guard
 */
export function shouldInjectNativeReplyGuard(originalText: string, _sourceLang = "en", enabled = false): boolean {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed || !isNonEnglish(trimmed)) return false;
  const isEnglishWritingIntent = /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(trimmed);
  return !isEnglishWritingIntent;
}

export function formatNativeReplyGuardHint(sourceLang = "en"): string {
  const name = resolveLanguageName(sourceLang);
  return `\n\n(Please reply and explain in ${name}.)`;
}

function extractCleanJsonField(raw: string, fieldName: string): string {
  const obj = repairAndParseJsonObject(raw);
  if (obj && !BLOCKED_JSON_KEYS.has(fieldName)) {
    const val = obj[fieldName] ?? obj.prompt ?? obj.written ?? obj.spoken;
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  const cleaned = raw
    .replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "")
    .replace(/```(?:json)?|```/gi, "")
    .trim();
  const regexFallback = cleaned.match(/"(?:prompt|written|spoken)"\s*:\s*"([\s\S]*?)"\s*\}/);
  if (regexFallback && regexFallback[1].trim()) {
    return regexFallback[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return "";
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}

export function resolveDirectSlotsFromConfig(cfg: {
  sourceLang?: string;
  directSlots?: PromptSlotConfig[];
}): PromptSlotConfig[] {
  if (Array.isArray(cfg.directSlots) && cfg.directSlots.length > 0) {
    const enabled = cfg.directSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultDirectSlots(cfg.sourceLang);
}

export function resolveCandidateSlotsFromConfig(cfg: {
  sourceLang?: string;
  promptSlots?: PromptSlotConfig[];
}): PromptSlotConfig[] {
  if (Array.isArray(cfg.promptSlots) && cfg.promptSlots.length > 0) {
    const enabled = cfg.promptSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultPromptSlots(cfg.sourceLang);
}

export function resolveModifySlotsFromConfig(cfg: {
  sourceLang?: string;
  explainLang?: string;
  modifySlots?: PromptSlotConfig[];
}): PromptSlotConfig[] {
  if (Array.isArray(cfg.modifySlots) && cfg.modifySlots.length > 0) {
    const enabled = cfg.modifySlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultModifySlots(cfg.sourceLang, cfg.explainLang);
}

export function resolveModesFromConfig(cfg: Partial<LingualConfig>): CustomModeConfig[] {
  if (Array.isArray(cfg.modes) && cfg.modes.length > 0) {
    const valid = cfg.modes.filter(
      (m) => m && typeof m.id === "string" && m.id.trim() && Array.isArray(m.slots)
    );
    if (valid.length > 0) return valid;
  }

  // Legacy fallback: If user has legacy slots on disk, map them seamlessly into modes
  const hasLegacyCustomSlots =
    Array.isArray(cfg.slots) ||
    Array.isArray(cfg.directSlots) ||
    Array.isArray(cfg.promptSlots) ||
    Array.isArray(cfg.modifySlots);

  if (hasLegacyCustomSlots) {
    const sourceLang = cfg.sourceLang || "en";
    const explainLang = cfg.explainLang;
    const directSlots = resolveDirectSlotsFromConfig({ sourceLang, directSlots: cfg.directSlots });
    const modifySlots = resolveModifySlotsFromConfig({ sourceLang, explainLang, modifySlots: cfg.modifySlots });
    const promptSlots = resolveCandidateSlotsFromConfig({ sourceLang, promptSlots: cfg.promptSlots });
    const companionSlots = (Array.isArray(cfg.slots) && cfg.slots.length > 0 ? cfg.slots : getDefaultSlots(sourceLang))
      .map((s) => ({
        id: s.id,
        label: s.label,
        role: (s.role === "vocab" ? "vocab" : "rewrite") as "vocab" | "rewrite",
        instruction: s.instruction || "Natural expressions matching context",
        enabled: s.enabled !== false,
      }));

    return [
      {
        id: "direct",
        name: sourceLang === "zh" ? "规范直发" : sourceLang === "ja" ? "仕様直行" : "Logical Spec",
        flow: "translate",
        action: "transform",
        hud: "preview",
        slots: directSlots,
        enabled: true,
      },
      {
        id: "live-flow",
        name: sourceLang === "zh" ? "实战狂飙" : sourceLang === "ja" ? "実戦疾走" : "Live Flow",
        flow: "proofread",
        action: "transform",
        hud: "adaptive-takeaway",
        slots: modifySlots,
        enabled: true,
      },
      {
        id: "companion",
        name: sourceLang === "zh" ? "纯伴学" : sourceLang === "ja" ? "純伴走" : "Companion",
        flow: "translate",
        action: "pass-through",
        hud: "tree",
        slots: companionSlots,
        enabled: true,
      },
      {
        id: "candidates",
        name: sourceLang === "zh" ? "挑候选" : sourceLang === "ja" ? "候補選択" : "Candidates",
        flow: "translate",
        action: "select",
        hud: "tree",
        slots: promptSlots,
        enabled: true,
      },
    ];
  }

  // Brand-new install default: Return the 2 golden defaults!
  return getDefaultFactoryModes(cfg.sourceLang, cfg.explainLang);
}

export function normalizeActiveModeId(cfg: Partial<LingualConfig>, modes: CustomModeConfig[]): string {
  if (cfg.mode === "off") return "off";
  const activeModes = modes.filter((m) => m.enabled !== false);
  if (cfg.activeModeId && activeModes.some((m) => m.id === cfg.activeModeId)) {
    return cfg.activeModeId;
  }
  // Legacy mode mapping
  if (cfg.mode) {
    const legacyMap: Record<string, string> = {
      original: "companion",
      companion: "companion",
      english: "direct",
      direct: "direct",
      lazy: "direct",
      select: "candidates",
      candidates: "candidates",
      modify: "live-flow",
      "live-flow": "live-flow",
      raw: "live-flow",
    };
    const mappedId = legacyMap[cfg.mode] || cfg.mode;
    if (activeModes.some((m) => m.id === mappedId)) {
      return mappedId;
    }
  }
  return activeModes[0]?.id || "direct";
}

export function compileModeSystemPrompt(
  mode: CustomModeConfig,
  options: {
    sourceLang?: string;
    targetLang?: string;
    explainLang?: string;
    globalKillList?: string[];
    context?: string;
  }
): string {
  const sourceLang = mode.customInputLang || options.sourceLang || "en";
  const targetLang = mode.customOutputLang || options.targetLang || "en";
  const explainLang = options.explainLang || sourceLang;

  const interpolatedSlots = mode.slots.map((s) => ({
    ...s,
    instruction: s.instruction
      ? interpolatePromptVariables(s.instruction, {
          sourceLang,
          targetLang,
          explainLang,
        })
      : "",
  }));

  const slotKillLists = (mode.slots || []).flatMap((s) => s.killList || []);
  const combinedKillList = [...(mode.killList || []), ...slotKillLists];
  const killListBlock = compileKillListInstruction(combinedKillList, options.globalKillList);

  let systemHintBlock = "";
  if (mode.systemHint) {
    const rawHints = Array.isArray(mode.systemHint) ? mode.systemHint : [mode.systemHint];
    const hints = rawHints
      .map((h) => interpolatePromptVariables(h, { sourceLang, targetLang, explainLang }).trim())
      .filter(Boolean);
    if (hints.length > 0) {
      systemHintBlock = `\n\n[USER SPECIFIED MODE RULES - MANDATORY]:\n${hints.map((h, i) => `(${i + 1}) ${h}`).join("\n")}`;
    }
  }

  let codeSwitchingBlock = "";
  if (mode.preserveCodeSwitching && mode.flow === "proofread") {
    codeSwitchingBlock = `\n\n[CODE-SWITCHING PRESERVATION]:\nIf the user's input draft contains native ${sourceLang} words or expressions mixed in, seamlessly translate them into ${targetLang} in the fixed and native outputs, and explicitly record the translation in the takeaways ("fixes").`;
  }

  let contextBlock = "";
  if (options.context && options.context.trim()) {
    contextBlock = `\n\n[CONTEXT / RECENT GIT DIFF]:\n${options.context.trim().slice(0, 500)}`;
  }

  if (mode.flow === "proofread") {
    const base = buildModifySystemPrompt({
      sourceLang,
      targetLang,
      explainLang,
      customSlots: interpolatedSlots,
    });
    return `${base}${codeSwitchingBlock}${systemHintBlock}${contextBlock}${killListBlock}`;
  }

  const base = buildPromptCandidatesSystemPrompt({
    sourceLang,
    targetLang,
    promptSlots: interpolatedSlots,
  });
  return `${base}${codeSwitchingBlock}${systemHintBlock}${contextBlock}${killListBlock}`;
}

export async function executeModeRunner(
  text: string,
  mode: CustomModeConfig,
  userConfig: Partial<LingualConfig> = {}
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

  const sysPrompt = compileModeSystemPrompt(mode, {
    sourceLang: effectiveCfg.sourceLang,
    targetLang: effectiveCfg.targetLang,
    explainLang: effectiveCfg.explainLang,
    globalKillList: effectiveCfg.globalKillList,
    context: (effectiveCfg as any).context || userConfig.context,
  });

  const raw = await executeLlmCompletion(trimmed, sysPrompt, effectiveCfg);
  if (typeof raw !== "string" || !raw.trim()) return null;

  const obj = repairAndParseJsonObject(raw);
  if (!obj) {
    const fallbackSingle = extractCleanJsonField(raw, mode.slots[0]?.id || "prompt");
    if (fallbackSingle) {
      return [{ id: mode.slots[0]?.id || "concise", label: mode.slots[0]?.label || "Direct", content: fallbackSingle }];
    }
    return null;
  }

  const enabledSlots = mode.slots.filter((s) => s.enabled !== false);
  const vocabSlot = enabledSlots.find((s) => s.role === "vocab" || s.id === "vocab" || s.id === "fixes");
  const extractedVocab =
    (vocabSlot && !BLOCKED_JSON_KEYS.has(vocabSlot.id) && typeof obj[vocabSlot.id] === "string" && obj[vocabSlot.id].trim())
      ? obj[vocabSlot.id].trim()
      : (typeof obj.fixes === "string" && obj.fixes.trim())
        ? obj.fixes.trim()
        : (typeof obj.vocab === "string" && obj.vocab.trim() ? obj.vocab.trim() : undefined);

  const rewriteSlots = enabledSlots.filter((s) => s.role !== "vocab" && s.id !== "source");
  const candidates: PromptCandidate[] = [];

  for (const slot of rewriteSlots) {
    if (BLOCKED_JSON_KEYS.has(slot.id)) continue;
    let val = obj[slot.id];
    // Fallback when LLM returns legacy key
    if (!val) {
      if (slot.id === "fixed" && typeof obj.fixed === "string") val = obj.fixed;
      else if (slot.id === "native" && typeof obj.native === "string") val = obj.native;
      else if (rewriteSlots.length === 1) val = obj.prompt ?? obj.direct_spec ?? obj.fixed ?? obj.spoken;
    }
    const meaningVal = typeof obj[`${slot.id}_meaning`] === "string" ? obj[`${slot.id}_meaning`].trim() : undefined;

    if (typeof val === "string" && val.trim()) {
      candidates.push({
        id: slot.id,
        label: slot.label,
        content: val.trim(),
        meaning: meaningVal,
        ...(extractedVocab ? { vocab: extractedVocab } : {}),
        hideWhenLong: Boolean(slot.hideWhenLong),
      });
    }
  }

  // Multi-slot transform resolution: sort primarySlotId to index 0 if specified
  if (mode.primarySlotId && candidates.length > 1) {
    const pIdx = candidates.findIndex((c) => c.id.toLowerCase() === mode.primarySlotId?.toLowerCase());
    if (pIdx > 0) {
      const [primary] = candidates.splice(pIdx, 1);
      candidates.unshift(primary);
    }
  }

  return candidates.length > 0 ? candidates : null;
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
    name: isModify ? "实战狂飙" : "候选生成",
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

/**
 * On-Demand Tuner Skill Gate (`stripLingualContextWhenOff`)
 */
export function stripLingualContextWhenOff(
  systemPrompt: string,
  lastUserText = "",
  tunerArmed = false
): string {
  if (!systemPrompt) return systemPrompt;
  if (tunerArmed || /(?:lingual-tuner|\/lingual\s+(?:tuner|tune|agent)|(?:定制|配置|调整)伴学)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt
    .replace(/\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "")
    .replace(/\s*<skill[^>]*>[\s\S]*?<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "");
}

export interface ModeDisplaySpec {
  companion: string;
  direct: string;
  candidates: string;
  modify: string;
  off: string;
  notifyCompanion: (pair: string) => string;
  notifyDirect: (pair: string, firstSlotLabel: string) => string;
  notifyCandidates: (pair: string, slotLabels: string) => string;
  notifyModify: (pair: string, firstSlotLabel: string) => string;
  notifyOff: (pair: string) => string;
}

const MODE_DISPLAY_BY_LANG: Record<string, ModeDisplaySpec> = {
  zh: {
    companion: "纯伴学",
    direct: "直接改",
    candidates: "挑候选",
    modify: "原句修补",
    off: "已关闭",
    notifyCompanion: (p) => `[${p}] 已切换至【1 纯伴学 (companion)】：原话 0ms 直发 + 上方浮现伴学卡`,
    notifyDirect: (p, s1) => `[${p}] 已切换至【2 直接改 (direct)】：按首槽 [${s1}] 1对1 直接改好发出`,
    notifyCandidates: (p, s) => `[${p}] 已切换至【3 挑候选 (candidates)】：生成候选 (${s}) 挑一发出`,
    notifyModify: (p, s1) => `[${p}] 已切换至【4 原句修补 (modify)】：极简修正 [${s1}] 秒发 + 上方原生对照`,
    notifyOff: (p) => `[${p}] 已切换至【0 已关闭 (off)】：底栏隐藏 · 监听已卸 · 0 Token 零负担`,
  },
  tw: {
    companion: "純伴學",
    direct: "直接改",
    candidates: "挑候選",
    modify: "原句修補",
    off: "已關閉",
    notifyCompanion: (p) => `[${p}] 已切換至【1 純伴學 (companion)】：原話 0ms 直發 + 上方浮現伴學卡`,
    notifyDirect: (p, s1) => `[${p}] 已切換至【2 直接改 (direct)】：按首槽 [${s1}] 1對1 直接改好發出`,
    notifyCandidates: (p, s) => `[${p}] 已切換至【3 挑候選 (candidates)】：生成候選 (${s}) 挑一發出`,
    notifyModify: (p, s1) => `[${p}] 已切換至【4 原句修補 (modify)】：極簡修正 [${s1}] 秒發 + 上方原生對照`,
    notifyOff: (p) => `[${p}] 已切換至【0 已關閉 (off)】：底欄隱藏 · 監聽已卸 · 0 Token 零負擔`,
  },
  ja: {
    companion: "伴走",
    direct: "直改",
    candidates: "候補選",
    modify: "原文修正",
    off: "オフ",
    notifyCompanion: (p) => `[${p}] 【1 伴走 (companion)】に切替：原文0ms送信＋上部に学習カード表示`,
    notifyDirect: (p, s1) => `[${p}] 【2 直改 (direct)】に切替：第1スロット [${s1}] で直接書き換えて送信`,
    notifyCandidates: (p, s) => `[${p}] 【3 候補選 (candidates)】に切替：候補 (${s}) から選択して送信`,
    notifyModify: (p, s1) => `[${p}] 【4 原文修正 (modify)】に切替：最小修正 [${s1}] 即時送信＋自然表現比較`,
    notifyOff: (p) => `[${p}] 【0 オフ (off)】：下部バー非表示・監視停止・0 Token 無負荷`,
  },
  en: {
    companion: "Companion",
    direct: "Direct",
    candidates: "Candidates",
    modify: "Modify",
    off: "Off",
    notifyCompanion: (p) => `[${p}] Switched to [1 Companion] mode: 0ms raw send + learning card above`,
    notifyDirect: (p, s1) => `[${p}] Switched to [2 Direct (Prompt)] mode: 1-to-1 send via Slot #1 [${s1}]`,
    notifyCandidates: (p, s) => `[${p}] Switched to [3 Candidates (select)] mode: Pick from (${s})`,
    notifyModify: (p, s1) => `[${p}] Switched to [4 Modify (In-Place Fix)] mode: Surgical fix via [${s1}] + native sibling`,
    notifyOff: (p) => `[${p}] Switched to [0 Off] mode: Status hidden · listeners detached · 0 tokens`,
  },
};

export function resolveModeDisplaySpec(sourceLang = "en"): ModeDisplaySpec {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  return MODE_DISPLAY_BY_LANG[norm] || MODE_DISPLAY_BY_LANG.en;
}

const MODE_ALIAS_MAP: Record<string, LingualMode> = {
  "1": "original", companion: "original", learn: "original", study: "original", original: "original", orig: "original",
  "纯伴学": "original", "純伴學": "original", "伴学": "original", "伴走": "original",
  "2": "english", direct: "english", rewrite: "english", refine: "english", english: "english", en: "english", eng: "english", lazy: "english",
  "规范直发": "english", "直接改": "english", "直改": "english", "直出": "english", "仕様直行": "english",
  "3": "select", candidates: "select", candidate: "select", select: "select", choices: "select", choice: "select", pick: "select",
  "挑候选": "select", "挑候選": "select", "候选": "select", "候補選": "select",
  "4": "modify", modify: "modify", polish: "modify", fix: "modify", proofread: "modify", raw: "modify", "live-flow": "modify",
  "实战狂飙": "modify", "原句修补": "modify", "原句修補": "modify", "修补": "modify", "実戦疾走": "modify", "原文修正": "modify",
  "0": "off", off: "off", disable: "off", stop: "off",
  "已关闭": "off", "已關閉": "off", "关闭": "off", "オフ": "off",
};

export function normalizeLingualModeInput(raw?: string): LingualMode | null {
  if (!raw) return null;
  return MODE_ALIAS_MAP[raw.trim().toLowerCase()] || null;
}

export const CURRENT_FEATURE_BANNER_VERSION = "0.6.0";

export function resolveReleaseBannerLang(explicitSourceLang?: string, sessionEntries?: any[]): string {
  const supported = new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);

  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    return supported.has(clean) ? clean : "en";
  }

  if (Array.isArray(sessionEntries) && sessionEntries.length > 0) {
    for (let i = sessionEntries.length - 1; i >= 0; i--) {
      const e = sessionEntries[i];
      if (e?.type === "message" && e?.message?.role === "user") {
        const text = Array.isArray(e.message.content)
          ? e.message.content.map((c: any) => c?.text || "").join(" ")
          : String(e.message.content || "");
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
        if (/[\uac00-\ud7af]/.test(text)) return "ko";
        if (/[\u0400-\u04ff]/.test(text)) return "ru";
        if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
      }
    }
  }

  try {
    const i18nFile = path.join(os.homedir(), ".config", "rpiv-i18n", "config.json");
    if (fs.existsSync(i18nFile)) {
      const raw = JSON.parse(fs.readFileSync(i18nFile, "utf8"));
      const loc = String(raw?.locale || raw?.lang || "").toLowerCase();
      if (loc.startsWith("zh-tw") || loc.startsWith("zh-hk")) return "tw";
      const prefix = loc.split(/[-_]/)[0];
      if (supported.has(prefix)) return prefix;
    }
  } catch {}

  try {
    const envLocale = (
      process.env.LC_ALL ||
      process.env.LANGUAGE ||
      process.env.LANG ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      "en"
    ).toLowerCase();
    if (envLocale.startsWith("zh-tw") || envLocale.startsWith("zh-hk")) return "tw";
    const prefix = envLocale.split(/[-_.]/)[0];
    if (supported.has(prefix)) return prefix;
  } catch {}

  return "en";
}

interface BannerSpec {
  title: string;
  subtitle: string;
  rows: [string, string, string, string, string, string];
}

export function formatReleaseBannerLines(
  sourceLang = "en",
  maxCols = 80,
  fg: (color: string, text: string) => string = (_c, t) => t
): string[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const effectiveCols = Math.max(40, maxCols);

  const copyByLang: Record<string, BannerSpec> = {
    zh: {
      title: "· [pi-lingual v0.6.0] 极简双核模式上线 & Tuner 完全开放 (发消息自动收起)",
      subtitle: "│ 一切模式与提示词皆可对话定制；出厂精简为两大核心；配置永久独立",
      rows: [
        "┌ [核心定制中心 · Tuner] 敲 /tuner 直接跟 AI 说话，随意增删改模式与提示词",
        "│   (内置 4 大实战配装；想加发推、提交、对线等模式，一句话秒成)",
        "├ [1 规范直发 · direct]  敲中文，0ms 转成专业规范英文直发 Agent (/lingual 1)",
        "│   (保证代码和注释是纯英文；适合专注开发、不想费脑憋英语时使用)",
        "├ [2 实战狂飙 · live]    直接打英文；只修语法错词，粗口与情绪 100% 保留",
        "└   (想骂就骂，语法自动兜底；下方用中文讲透盲点，越用语感越强)",
      ],
    },
    tw: {
      title: "· [pi-lingual v0.6.0] 極簡雙核模式上線 & Tuner 完全開放 (發訊息自動收起)",
      subtitle: "│ 一切模式與提示詞皆可對話定制；出廠精簡為兩大核心；設定永久獨立",
      rows: [
        "┌ [核心定制中心 · Tuner] 敲 /tuner 直接跟 AI 說話，隨意增刪改模式與提示詞",
        "│   (內置 4 大實戰配裝；想加發推、提交、對線等模式，一句話秒成)",
        "├ [1 規範直發 · direct]  敲中文，0ms 轉成專業規範英文直發 Agent (/lingual 1)",
        "│   (保證代碼和註釋是純英文；適合專注開發、不想費腦憋英語時使用)",
        "├ [2 實戰狂飆 · live]    直接打英文；只修語法錯詞，粗口與情緒 100% 保留",
        "└   (想罵就罵，語法自動兜底；下方用中文講透盲點，越用語感越強)",
      ],
    },
    ja: {
      title: "· [pi-lingual v0.6.0] コア2モード刷新 & Tuner 全面開放 (送信で閉じる)",
      subtitle: "│ 全モードとプロンプトを対話で自在に設計；設定は永久ローカル保持",
      rows: [
        "┌ [対話設計 · Tuner]     /tuner でAIと対話し、新モードやプロンプトを即追加",
        "│   (4大プリセット内蔵 · PRレビューやSNS投稿用モードも会話だけで完成)",
        "├ [1 仕様直行 · direct]  母語入力、0msで規範的英語に整え即送信 (/lingual 1)",
        "│   (コードとコメントの完全英語化を保証 · 集中して開発を進めたい時に)",
        "├ [2 実戦疾走 · live]    英語で直接入力；スラング・感情を100%保持し補正",
        "└   (感情のままに入力可能 · 下部に母語で文法盲点を直感的に解説)",
      ],
    },
    ko: {
      title: "· [pi-lingual v0.6.0] 듀얼 코어 모드 & Tuner 전면 개방 (입력 시 닫힘)",
      subtitle: "│ 모든 모드와 프롬프트를 대화로 맞춤 설정; 설정은 로컬에 영구 보존",
      rows: [
        "┌ [맞춤 설계 · Tuner]    /tuner 로 AI와 대화하며 모드와 프롬프트 자유 추가",
        "│   (4대 프리셋 내장 · PR 검토나 SNS용 모드도 말 한마디로 즉시 생성)",
        "├ [1 논리정제 · direct]  모국어 입력, 0ms 규격화된 기술 영어로 즉시 전송",
        "│   (코드와 주석의 순수 영어 유지 · 개발에 집중하고 싶을 때 최적)",
        "├ [2 실전질주 · live]    영어로 직접 작성; 거친 표현 100% 유지하며 교정 전송",
        "└   (감정 그대로 입력 가능 · 하단에 모국어로 핵심 문법 맹점 복기)",
      ],
    },
    es: {
      title: "· [pi-lingual v0.6.0] Dúo esencial y Tuner abierto (cierra al enviar)",
      subtitle: "│ Diseña modos y prompts conversando; configuración aislada en local",
      rows: [
        "┌ [Centro Tuner]   Ejecuta /tuner para crear o cambiar modos con AI",
        "│   (4 recetas listas; añade flujos de PR o Twitter en una frase)",
        "├ [1 Directo]      Escribe en tu idioma, 0ms a inglés técnico",
        "│   (Mantiene código y comentarios en inglés; avanza rápido)",
        "├ [2 Live Flow]    Escribe directo en inglés; pasión y tacos intactos",
        "└   (Pasa tu rabia sin censura; notas abajo para aprender el porqué)",
      ],
    },
    fr: {
      title: "· [pi-lingual v0.6.0] Duo essentiel et Tuner ouvert (fermé à l'envoi)",
      subtitle: "│ Créez modes et prompts en dialoguant ; configuration locale isolée",
      rows: [
        "┌ [Centre Tuner]   Tapez /tuner pour créer ou modifier des modes avec l'IA",
        "│   (4 recettes intégrées ; ajoutez des modes PR en une phrase)",
        "├ [1 Direct]       Saisie en langue native, 0ms vers l'anglais technique",
        "│   (Code et commentaires en anglais pur ; idéal pour coder)",
        "├ [2 Live Flow]    Saisie directe en anglais ; passion et jurons gardés",
        "└   (Exprimez-vous sans filtre ; explications claires sous la saisie)",
      ],
    },
    de: {
      title: "· [pi-lingual v0.6.0] 2 Kern-Modi & Tuner offen (schließt bei Senden)",
      subtitle: "│ Modi & Prompts per Chat anpassen; Konfiguration dauerhaft isoliert",
      rows: [
        "┌ [Tuner-Zentrale]  /tuner starten, um Modi und Prompts anzupassen",
        "│   (4 Rezepte an Bord; neue PR- oder Twitter-Modi mit einem Satz)",
        "├ [1 Direkt]        Auf Deutsch tippen, 0ms als klares Englisch",
        "│   (Hält Code & Kommentare auf Englisch; perfekt für Fokus)",
        "├ [2 Live Flow]     Direkt auf Englisch tippen; Emotionen 100% erhalten",
        "└   (Tippen ohne Zensur; kurze muttersprachliche Erklärungen unten)",
      ],
    },
    ru: {
      title: "· [pi-lingual v0.6.0] 2 главных режима и Tuner (закроется при вводе)",
      subtitle: "│ Настройка режимов и промптов через AI; конфиг изолирован локально",
      rows: [
        "┌ [Центр Tuner]    Наберите /tuner для настройки режимов с AI",
        "│   (4 готовых рецепта; режимы создаются в одну фразу)",
        "├ [1 Прямой поток] Ввод на родном языке, 0мс в четкий тех-английский",
        "│   (Чистый английский в коде и комментариях; для быстрой работы)",
        "├ [2 Live Flow]    Пишите сразу на английском; сленг и эмоции сохранены",
        "└   (Ввод без цензуры; внизу понятный разбор правил)",
      ],
    },
    en: {
      title: "· [pi-lingual v0.6.0] Dual-Core Golden Defaults & Tuner (auto-dismiss)",
      subtitle: "│ Pure declarative modes & slots; customize via natural language",
      rows: [
        "┌ [Architect Tuner] Run /tuner to add or edit modes with AI",
        "│   (4 tactical loadouts included: spec, commit, oss, yap)",
        "├ [1 Logical Spec · direct]  Native input ➔ 0ms imperative spec",
        "│   (Ensures clean English instructions while keeping code untouched)",
        "├ [2 Live Flow · live]       Draft in English; grammar patched, passion kept",
        "└   (Vent freely without censorship; takeaway diffs explain rules below)",
      ],
    },
  };

  const c = copyByLang[norm] || copyByLang.en;
  const allRawLines = [c.title, c.subtitle, ...c.rows];
  return allRawLines.map((line) => truncateVisual(`  ${fg("muted", line)}`, effectiveCols));
}
