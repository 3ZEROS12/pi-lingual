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
  LingualConfig,
  LingualMode,
  LingualRequest,
  LingualResponse,
  LingualResult,
  PromptCandidate,
  PromptSlotConfig,
  SlotConfig,
  SlotResult,
  TranslationPayload,
} from "./types.js";
import { resolveLabelsForLang, resolveSlotsForPreset } from "./presets.js";
import {
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  buildModifySystemPrompt,
  getDefaultSlots,
  getDefaultDirectSlots,
  getDefaultPromptSlots,
  getDefaultModifySlots,
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
      ...(endpoint ? { endpoint } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
      ...(selectedModel ? { selectedModel } : {}),
      ...(normalizedMode ? { mode: normalizedMode as any } : {}),
      ...(modeLocked !== undefined ? { modeLocked } : {}),
      ...(compact !== undefined ? { compact: Boolean(compact) } : {}),
      ...(slotPreset ? { slotPreset } : {}),
      ...(slots ? { slots } : {}),
      ...(directSlots ? { directSlots } : {}),
      ...(promptSlots ? { promptSlots } : {}),
      ...(modifySlots ? { modifySlots } : {}),
      ...(lastSeenVersion ? { lastSeenVersion } : {}),
      ...(sourceLang ? { sourceLang } : {}),
      ...(targetLang ? { targetLang } : {}),
      ...(reasoning ? { reasoning } : {}),
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
        v === "original" ||
        v === "companion" ||
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
  mode: "original",
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
        slotResults.push({ id: slot.id, label: slot.label, role: slot.role, content, meaning });
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
      return await cfg.complete(text, sysPrompt, controller.signal);
    }
    if (cfg.endpoint) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: text },
          ],
          temperature: cfg.temperature,
        }),
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
  const langMap: Record<string, string> = {
    ja: "Japanese",
    zh: "Chinese",
    tw: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
  };
  const name = langMap[sourceLang] || "the user's native language";
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

export async function generatePromptCandidates(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<PromptCandidate[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };

  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang, true)) {
    return null;
  }

  const slots = resolveCandidateSlotsFromConfig({
    sourceLang: cfg.sourceLang,
    promptSlots: userConfig.promptSlots ?? diskConfig.promptSlots,
  });

  const isModify = slots.some((s) => s.id === "fixed");
  const sysPrompt = isModify
    ? buildModifySystemPrompt({
        sourceLang: cfg.sourceLang,
        targetLang: cfg.targetLang,
        explainLang: cfg.explainLang,
      })
    : buildPromptCandidatesSystemPrompt({
        sourceLang: cfg.sourceLang,
        targetLang: cfg.targetLang,
        promptSlots: slots,
      });

  const raw = await executeLlmCompletion(trimmed, sysPrompt, cfg);
  if (typeof raw !== "string" || !raw.trim()) return null;

  const obj = repairAndParseJsonObject(raw);
  if (!obj) {
    const fallbackSingle = extractCleanJsonField(raw, slots[0]?.id || "prompt");
    if (fallbackSingle) {
      return [{ id: slots[0]?.id || "concise", label: slots[0]?.label || "Direct", content: fallbackSingle }];
    }
    return null;
  }

  const vocabSlot = slots.find((s) => s.role === "vocab");
  const extractedVocab =
    (vocabSlot && !BLOCKED_JSON_KEYS.has(vocabSlot.id) && typeof obj[vocabSlot.id] === "string" && obj[vocabSlot.id].trim())
      ? obj[vocabSlot.id].trim()
      : (typeof obj.fixes === "string" && obj.fixes.trim())
        ? obj.fixes.trim()
        : (typeof obj.vocab === "string" && obj.vocab.trim() ? obj.vocab.trim() : undefined);

  if (isModify && typeof obj.fixed === "string" && obj.fixed.trim()) {
    const fixedVal = obj.fixed.trim();
    const nativeVal = typeof obj.native === "string" ? obj.native.trim() : "";
    const res: PromptCandidate[] = [
      {
        id: "fixed",
        label: slots.find((s) => s.id === "fixed")?.label || "Fixed",
        content: fixedVal,
        ...(extractedVocab ? { vocab: extractedVocab } : {}),
      },
    ];
    if (nativeVal && slots.some((s) => s.id === "native")) {
      res.push({
        id: "native",
        label: slots.find((s) => s.id === "native")?.label || "Native",
        content: nativeVal,
        ...(extractedVocab ? { vocab: extractedVocab } : {}),
      });
    }
    return res;
  }

  const candidates: PromptCandidate[] = [];
  for (const slot of slots) {
    if (slot.role === "vocab" || BLOCKED_JSON_KEYS.has(slot.id)) continue;
    const val = obj[slot.id] ?? (slots.length === 1 ? obj.prompt : undefined);
    if (typeof val === "string" && val.trim()) {
      candidates.push({
        id: slot.id,
        label: slot.label,
        content: val.trim(),
        ...(extractedVocab ? { vocab: extractedVocab } : {}),
      });
    }
  }

  return candidates.length > 0 ? candidates : null;
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
  if (tunerArmed || /(?:lingual-tuner|\/lingual\s+(?:tuner|tune|agent)|定制伴学|配置伴学)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt.replace(
    /\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi,
    ""
  );
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
  ko: {
    companion: "동반",
    direct: "직접수정",
    candidates: "후보선택",
    modify: "원문수정",
    off: "꺼짐",
    notifyCompanion: (p) => `[${p}] [1 동반 (companion)] 전환: 원문 0ms 전송 + 상단 학습 카드 표시`,
    notifyDirect: (p, s1) => `[${p}] [2 직접수정 (direct)] 전환: 첫 슬롯 [${s1}] 기준으로 즉시 다듬어 전송`,
    notifyCandidates: (p, s) => `[${p}] [3 후보선택 (candidates)] 전환: 후보 (${s}) 중 골라서 전송`,
    notifyModify: (p, s1) => `[${p}] [4 원문수정 (modify)] 전환: 최소 수정 [${s1}] 즉시 전송 + 자연스러운 표현 대조`,
    notifyOff: (p) => `[${p}] [0 꺼짐 (off)]: 하단바 숨김 · 감시 해제 · 0 Token 무부담`,
  },
  es: {
    companion: "Estudio",
    direct: "Directo",
    candidates: "Opciones",
    modify: "Corrección",
    off: "Apagado",
    notifyCompanion: (p) => `[${p}] Modo [1 Estudio (companion)]: Envío 0ms + tarjeta de aprendizaje arriba`,
    notifyDirect: (p, s1) => `[${p}] Modo [2 Directo (direct)]: Reescritura 1a1 con ranura #1 [${s1}]`,
    notifyCandidates: (p, s) => `[${p}] Modo [3 Opciones (candidates)]: Elige entre (${s})`,
    notifyModify: (p, s1) => `[${p}] Modo [4 Corrección (modify)]: Arreglo mínimo [${s1}] + opción nativa arriba`,
    notifyOff: (p) => `[${p}] Modo [0 Apagado (off)]: Barra oculta · 0 hooks · 0 tokens`,
  },
  fr: {
    companion: "Étude",
    direct: "Direct",
    candidates: "Options",
    modify: "Correction",
    off: "Désactivé",
    notifyCompanion: (p) => `[${p}] Mode [1 Étude (companion)] : Envoi 0ms + carte d'étude en haut`,
    notifyDirect: (p, s1) => `[${p}] Mode [2 Direct (direct)] : Réécriture 1à1 via le slot #1 [${s1}]`,
    notifyCandidates: (p, s) => `[${p}] Mode [3 Options (candidates)] : Choisissez parmi (${s})`,
    notifyModify: (p, s1) => `[${p}] Mode [4 Correction (modify)] : Correction minimale [${s1}] + variante native`,
    notifyOff: (p) => `[${p}] Mode [0 Désactivé (off)] : Barre masquée · 0 hook · 0 token`,
  },
  de: {
    companion: "Lernen",
    direct: "Direkt",
    candidates: "Auswahl",
    modify: "Korrektur",
    off: "Aus",
    notifyCompanion: (p) => `[${p}] Modus [1 Lernen (companion)]: 0ms Senden + Lernkarte oben`,
    notifyDirect: (p, s1) => `[${p}] Modus [2 Direkt (direct)]: Direktes Umformulieren über Slot #1 [${s1}]`,
    notifyCandidates: (p, s) => `[${p}] Modus [3 Auswahl (candidates)]: Auswahl aus (${s})`,
    notifyModify: (p, s1) => `[${p}] Modus [4 Korrektur (modify)]: Minimale Reparatur [${s1}] + native Alternative`,
    notifyOff: (p) => `[${p}] Modus [0 Aus (off)]: Leiste ausgeblendet · 0 Hooks · 0 Tokens`,
  },
  ru: {
    companion: "Учеба",
    direct: "Прямой",
    candidates: "Выбор",
    modify: "Правка",
    off: "Выкл",
    notifyCompanion: (p) => `[${p}] Режим [1 Учеба (companion)]: отправка 0мс + карточка сверху`,
    notifyDirect: (p, s1) => `[${p}] Режим [2 Прямой (direct)]: прямая перезапись по слоту #1 [${s1}]`,
    notifyCandidates: (p, s) => `[${p}] Режим [3 Выбор (candidates)]: выбор из вариантов (${s})`,
    notifyModify: (p, s1) => `[${p}] Режим [4 Правка (modify)]: минимальная правка [${s1}] + нативный вариант`,
    notifyOff: (p) => `[${p}] Режим [0 Выкл (off)]: строка скрыта · 0 хуков · 0 токенов`,
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
  "纯伴学": "original", "純伴學": "original", "伴学": "original", "伴走": "original", "동반": "original",
  estudio: "original", "étude": "original", etude: "original", lernen: "original", "учеба": "original",
  "2": "english", direct: "english", rewrite: "english", refine: "english", english: "english", en: "english", eng: "english",
  "直接改": "english", "直改": "english", "直出": "english", "직접수정": "english", directo: "english", direkt: "english", "прямой": "english",
  "3": "select", candidates: "select", candidate: "select", select: "select", choices: "select", choice: "select", pick: "select",
  "挑候选": "select", "挑候選": "select", "候选": "select", "候補選": "select", "후보선택": "select",
  opciones: "select", options: "select", auswahl: "select", "выбор": "select",
  "4": "modify", modify: "modify", polish: "modify", fix: "modify", proofread: "modify",
  "原句修补": "modify", "原句修補": "modify", "修补": "modify", "原文修正": "modify", "원문수정": "modify", corrección: "modify", correction: "modify", korrektur: "modify", "правка": "modify",
  "0": "off", off: "off", disable: "off", stop: "off",
  "已关闭": "off", "已關閉": "off", "关闭": "off", "オフ": "off", "꺼짐": "off",
  apagado: "off", "désactivé": "off", desactive: "off", aus: "off", "выкл": "off",
};

export function normalizeLingualModeInput(raw?: string): LingualMode | null {
  if (!raw) return null;
  return MODE_ALIAS_MAP[raw.trim().toLowerCase()] || null;
}

export const CURRENT_FEATURE_BANNER_VERSION = "0.5.5";

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
      title: "· [pi-lingual v0.5.5 更新说明] 实战狂飙上线与架构演进预告 (发消息自动收起)",
      subtitle: "│ 粗口与情绪 100% 保留；错词句法自动修复直发；盲点复盘永久固化母语",
      rows: [
        "┌ [4 实战狂飙 · modify]  直接飙外语；纠偏直发 Agent + 盲点复盘 (/lingual 4)",
        "│   (粗口原汁原味放行；标点大小写零说教；短句带改版，长句聚焦盲点)",
        "├ [三大习惯盲点修复]   覆盖句法嵌套、平台介词(on X)与单复数；绝不拔高",
        "│   (explainLang: \"zh\" 认知母语固化，用大脑最轻松的语言讲透盲点)",
        "├ [下一代演进预告]     即将上线「模式即配置 (Mode as Config)」架构：",
        "└   (全模式增删改彻底下放给用户，出厂附赠双核黄金默认，终生免改版)",
      ],
    },
    tw: {
      title: "· [pi-lingual v0.5.5 更新說明] 實戰狂飆上線與架構演進預告 (發訊息自動收起)",
      subtitle: "│ 粗口與情緒 100% 保留；錯詞句法自動修復直發；盲點複盤永久固化母語",
      rows: [
        "┌ [4 實戰狂飆 · modify]  直接飆外語；糾偏直發 Agent + 盲點複盤 (/lingual 4)",
        "│   (粗口原汁原味放行；標點大小寫零說教；短句帶改版，長句聚焦盲點)",
        "├ [三大習慣盲點修復]   覆蓋句法嵌套、平台介詞(on X)與單複數；絕不拔高",
        "│   (explainLang: \"zh\" 認知母語固化，用大腦最輕鬆的語言講透盲點)",
        "├ [下一代演進預告]     即將上線「模式即配置 (Mode as Config)」架構：",
        "└   (全模式增删改徹底下放給用戶，出廠附贈雙核黃金預設，終生免改版)",
      ],
    },
    ja: {
      title: "· [pi-lingual v0.5.5 更新案内] Live Flow 実装と次期設計予告 (送信で閉じる)",
      subtitle: "│ 感情・スラング完全保持；文法・前置詞の即時補正；母語による盲点解説",
      rows: [
        "┌ [4 実戦疾走 · modify]  英語で直接入力；自動補正送信＋母語解説 (/lingual 4)",
        "│   (スラング完全保持・大文字や句読点への過剰指摘ゼロ・長文要点集約)",
        "├ [習慣的盲点の改善]   構文ネスト・プラットフォーム前置詞(on X)・時制 (i+1)",
        "│   (explainLang で母語による直感的な要点解説を恒久保存)",
        "├ [次世代設計予告]     「Mode as Config (モード＝設定)」へ進化予定：",
        "└   (全モード・プロンプトの完全カスタマイズ開放、コア2種デフォルト搭載)",
      ],
    },
    ko: {
      title: "· [pi-lingual v0.5.5 업데이트] Live Flow 모드 및 차세대 예고 (입력 시 닫힘)",
      subtitle: "│ 거친 표현 100% 유지·문법/전치사 즉시 교정 전송·모국어 맹점 복기 영구화",
      rows: [
        "┌ [4 실전질주 · modify] 영어로 직접 입력; 교정 전송 + 맹점 복기 (/lingual 4)",
        "│   (거친 감정 원문 유지·대소문자/문장부호 지적 배제·장문 핵심 요약)",
        "├ [3대 언어습관 교정]  문장 구조·플랫폼 전치사(on X)·시제/단복수 완벽 보정",
        "│   (explainLang 설정으로 가장 편한 모국어로 맹점 원리 직관적 설명)",
        "├ [차세대 아키텍처]    「Mode as Config (모드=설정)」 전면 개방 예정:",
        "└   (사용자 정의 모드 완전 개방·듀얼 코어 기본탑재로 종신 업데이트 프리)",
      ],
    },
    es: {
      title: "· [pi-lingual v0.5.5] Live Flow y arquitectura futura (cierra al enviar)",
      subtitle: "│ Pasión sin censura; corrección sintáctica; notas en lengua nativa",
      rows: [
        "┌ [4 Live Flow · modify] Escribe en inglés; corrige y envía (/lingual 4)",
        "│   (Sin censura de tono; sin fijación en mayúsculas; enfoque en fallos)",
        "├ [Hábitos corregidos]   Sintaxis, preposiciones (on X) y tiempos (i+1)",
        "│   (explainLang guarda tu idioma nativo para explicar el porqué en 0.1s)",
        "├ [Próxima arquitectura] Viene 'Mode as Configuration' declarativo:",
        "└   (Modos 100% personalizables; 2 preajustes de fábrica; cero fricción)",
      ],
    },
    fr: {
      title: "· [pi-lingual v0.5.5] Mode Live Flow & architecture future (fermé à l'envoi)",
      subtitle: "│ Passion sans filtre ; correction syntaxique ; retours en langue nat.",
      rows: [
        "┌ [4 Live Flow · modify] Rédigez en anglais ; corrigé et envoyé (/lingual 4)",
        "│   (Ton préservé à 100% ; zéro pointilleux sur la casse ; focus erreurs)",
        "├ [Habitudes corrigées]  Syntaxe, prépositions (on X) et temps verbaux (i+1)",
        "│   (explainLang mémorise votre langue native pour comprendre en 0,1s)",
        "├ [Prochaine étape]      Moteur déclaratif 'Mode as Configuration' à venir :",
        "└   (Modes 100% libres ; 2 réglages d'usine essentiels ; stabilité totale)",
      ],
    },
    de: {
      title: "· [pi-lingual v0.5.5] Live Flow Modus & Roadmap (schließt bei Senden)",
      subtitle: "│ Rohe Emotion 100% erhalten; Syntax-Korrektur; muttersprachliche Takeaways",
      rows: [
        "┌ [4 Live Flow · modify] Auf Englisch tippen; korrigiert (/lingual 4)",
        "│   (Null Zensur; kein Picken auf Großschreibung; Fokus auf Kernfehler)",
        "├ [Grammatik-Reflexe]    Satzbau, Präpositionen (on X) und Zeiten (i+1)",
        "│   (explainLang speichert Muttersprache für sofortige Regelerklärung)",
        "├ [Kommende Architektur] 'Mode as Configuration' deklarative Engine:",
        "└   (Voll anpassbare Modi; 2 schlanke Standardmodi; dauerhafte Stabilität)",
      ],
    },
    ru: {
      title: "· [pi-lingual v0.5.5] Режим Live Flow и анонс архитектуры (автозакрытие)",
      subtitle: "│ Эмоции без цензуры; точная правка синтаксиса; разбор на родном языке",
      rows: [
        "┌ [4 Live Flow · modify] Пишите на английском; правка агенту (/lingual 4)",
        "│   (Без цензуры сленга; без занудства о регистрах; фокус на слепых зонах)",
        "├ [Исправление привычек] Синтаксис, предлоги (on X) и времена (принцип i+1)",
        "│   (explainLang сохраняет родной язык для объяснения логики за 0.1с)",
        "├ [Следующий шаг]        Скоро: декларативный 'Mode as Configuration':",
        "└   (Полная кастомизация режимов; 2 золотых стандарта из коробки)",
      ],
    },
    en: {
      title: "· [pi-lingual v0.5.5 Release Note] Live Flow Mode & Roadmap (auto-dismiss)",
      subtitle: "│ Keep profanity & heat; surgical syntax repair; native cognitive memory",
      rows: [
        "┌ [4 Live Flow · modify] Direct English; surgical repair (/lingual 4)",
        "│   (Profanity 100% kept; zero casing nitpicks; adaptive takeaway card)",
        "├ [Core Habit Repairs]  Fixes syntax, prepositions (on X), and tenses",
        "│   (explainLang preserves cognitive language for 0.1s instant takeaways)",
        "├ [Next Leap Roadmap]   Coming soon: 'Mode as Configuration' engine",
        "└   (Full custom mode pipelines; dual golden defaults; zero version churn)",
      ],
    },
  };

  const c = copyByLang[norm] || copyByLang.en;
  const allRawLines = [c.title, c.subtitle, ...c.rows];
  return allRawLines.map((line) => truncateVisual(`  ${fg("muted", line)}`, effectiveCols));
}
