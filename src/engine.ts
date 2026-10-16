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
  resolveSeedNames,
  resolveModeDisplayName,
  SEED_NAMES,
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
  resolveSeedNames,
  resolveModeDisplayName,
  SEED_NAMES,
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
      // Intentional revert-to-default semantic: passing "auto" deletes key to restore auto-probing
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

/** Resolves default slots for a custom mode based on its action and flow. */
export function defaultSlotsForMode(
  mode: Pick<CustomModeConfig, "action" | "flow">,
  sourceLang: string,
  explainLang?: string
): SlotConfig[] {
  if (mode.action === "pass-through") return [];
  if (mode.action === "select") return getDefaultPromptSlots(sourceLang);
  return mode.flow === "proofread"
    ? getDefaultModifySlots(sourceLang, explainLang)
    : getDefaultDirectSlots(sourceLang);
}

export function resolveModesFromConfig(cfg: Partial<LingualConfig>, fallbackSourceLang = "en"): CustomModeConfig[] {
  const sourceLang = cfg.sourceLang || fallbackSourceLang;
  const explainLang = cfg.explainLang || sourceLang;
  if (Array.isArray(cfg.modes) && cfg.modes.length > 0) {
    // Keep every user-authored mode; populate clean defaults for missing/empty slots by flow
    const valid = cfg.modes
      .filter((m) => m && typeof m.id === "string" && m.id.trim())
      .map((m) => {
        if (Array.isArray(m.slots) && m.slots.length > 0) return m;
        return { ...m, slots: defaultSlotsForMode(m, sourceLang, explainLang) };
      });
    if (valid.length > 0) return valid;
  }

  // Legacy fallback: If user has legacy slots on disk, map them seamlessly into modes
  const hasLegacyCustomSlots =
    Array.isArray(cfg.slots) ||
    Array.isArray(cfg.directSlots) ||
    Array.isArray(cfg.promptSlots) ||
    Array.isArray(cfg.modifySlots);

  if (hasLegacyCustomSlots) {
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

    const n = resolveSeedNames(sourceLang);
    return [
      {
        id: "direct",
        name: n.direct,
        flow: "translate",
        action: "transform",
        hud: "preview",
        slots: directSlots,
        enabled: true,
      },
      {
        id: "live-flow",
        name: n.liveFlow,
        flow: "proofread",
        action: "transform",
        hud: "adaptive-takeaway",
        slots: modifySlots,
        enabled: true,
      },
      {
        id: "companion",
        name: n.companion,
        flow: "translate",
        action: "pass-through",
        hud: "tree",
        slots: companionSlots,
        enabled: true,
      },
      {
        id: "candidates",
        name: n.candidates,
        flow: "translate",
        action: "select",
        hud: "tree",
        slots: promptSlots,
        enabled: true,
      },
    ];
  }

  // Brand-new install default: Return the 3 golden defaults!
  return getDefaultFactoryModes(sourceLang, explainLang);
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
  return activeModes[0]?.id || "companion";
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
  notifyOff: (pair: string) => string;
}

const MODE_DISPLAY_BY_LANG: Record<string, ModeDisplaySpec> = {
  zh: {
    companion: SEED_NAMES.zh.companion,
    direct: SEED_NAMES.zh.direct,
    candidates: SEED_NAMES.zh.candidates,
    modify: SEED_NAMES.zh.liveFlow,
    off: "已关闭",
    notifyOff: (p) => `[${p}] 已切换至【0 已关闭 (off)】：底栏隐藏 · 监听已卸 · 0 Token 零负担`,
  },
  tw: {
    companion: SEED_NAMES.tw.companion,
    direct: SEED_NAMES.tw.direct,
    candidates: SEED_NAMES.tw.candidates,
    modify: SEED_NAMES.tw.liveFlow,
    off: "已關閉",
    notifyOff: (p) => `[${p}] 已切換至【0 已關閉 (off)】：底欄隱藏 · 監聽已卸 · 0 Token 零負擔`,
  },
  ja: {
    companion: SEED_NAMES.ja.companion,
    direct: SEED_NAMES.ja.direct,
    candidates: SEED_NAMES.ja.candidates,
    modify: SEED_NAMES.ja.liveFlow,
    off: "オフ",
    notifyOff: (p) => `[${p}] 【0 オフ (off)】：下部バー非表示・監視停止・0 Token 無負荷`,
  },
  ko: {
    companion: SEED_NAMES.ko.companion,
    direct: SEED_NAMES.ko.direct,
    candidates: SEED_NAMES.ko.candidates,
    modify: SEED_NAMES.ko.liveFlow,
    off: "꺼짐",
    notifyOff: (p) => `[${p}] 【0 꺼짐 (off)】：상태 숨김 · 리스너 분리 · 0 토큰`,
  },
  es: {
    companion: SEED_NAMES.es.companion,
    direct: SEED_NAMES.es.direct,
    candidates: SEED_NAMES.es.candidates,
    modify: SEED_NAMES.es.liveFlow,
    off: "Apagado",
    notifyOff: (p) => `[${p}] Cambiado a [0 Apagado]: Estado oculto · 0 tokens`,
  },
  fr: {
    companion: SEED_NAMES.fr.companion,
    direct: SEED_NAMES.fr.direct,
    candidates: SEED_NAMES.fr.candidates,
    modify: SEED_NAMES.fr.liveFlow,
    off: "Désactivé",
    notifyOff: (p) => `[${p}] Passé en mode [0 Désactivé] : Statut masqué · 0 tokens`,
  },
  de: {
    companion: SEED_NAMES.de.companion,
    direct: SEED_NAMES.de.direct,
    candidates: SEED_NAMES.de.candidates,
    modify: SEED_NAMES.de.liveFlow,
    off: "Aus",
    notifyOff: (p) => `[${p}] Gewechselt zu [0 Aus]: Status ausgeblendet · 0 Tokens`,
  },
  ru: {
    companion: SEED_NAMES.ru.companion,
    direct: SEED_NAMES.ru.direct,
    candidates: SEED_NAMES.ru.candidates,
    modify: SEED_NAMES.ru.liveFlow,
    off: "Выкл",
    notifyOff: (p) => `[${p}] Переключено в режим [0 Выкл]: скрыт статус · 0 токенов`,
  },
  en: {
    companion: SEED_NAMES.en.companion,
    direct: SEED_NAMES.en.direct,
    candidates: SEED_NAMES.en.candidates,
    modify: SEED_NAMES.en.liveFlow,
    off: "Off",
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

/** Normalizes POSIX/BCP-47 locale tags (zh_TW.UTF-8, zh-Hant-TW) into a comparable dashed form. */
function normalizeLocaleTag(raw: string): string {
  return (raw || "").toLowerCase().replace(/_/g, "-").split(".")[0];
}

function isTraditionalChineseLocale(tag: string): boolean {
  return (
    tag.startsWith("zh-tw") ||
    tag.startsWith("zh-hk") ||
    tag.startsWith("zh-hant") ||
    tag === "zh-mo"
  );
}

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
      const loc = normalizeLocaleTag(String(raw?.locale || raw?.lang || ""));
      if (isTraditionalChineseLocale(loc)) return "tw";
      const prefix = loc.split("-")[0];
      if (supported.has(prefix)) return prefix;
    }
  } catch {}

  try {
    const envLocale = normalizeLocaleTag(
      process.env.LC_ALL ||
        process.env.LANGUAGE ||
        process.env.LANG ||
        Intl.DateTimeFormat().resolvedOptions().locale ||
        "en"
    );
    if (isTraditionalChineseLocale(envLocale)) return "tw";
    const prefix = envLocale.split("-")[0];
    if (supported.has(prefix)) return prefix;
  } catch {}

  return "en";
}

interface BannerSpec {
  title: string;
  subtitle: string;
  rows: [string, string, string, string, string, string];
}

export interface SelectPromptSpec {
  title: string;
  keepOrig: string;
  hint: string;
}

export function resolveSelectPrompts(lang = "en", candidatesCount = 3): SelectPromptSpec {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const selectPrompts: Record<string, SelectPromptSpec> = {
    zh: {
      title: "✦ 挑候选发送",
      keepOrig: "原话直发",
      hint: `按数字 1-${candidatesCount} 直接发出 · ←→/↑↓ 切换 Enter 确认 · 0/Esc 发原话`,
    },
    tw: {
      title: "✦ 挑候選發送",
      keepOrig: "原話直發",
      hint: `按數字 1-${candidatesCount} 直接發出 · ←→/↑↓ 切換 Enter 確認 · 0/Esc 發原話`,
    },
    ja: {
      title: "✦ 候補を選んで送信",
      keepOrig: "原文のまま",
      hint: `数字 1-${candidatesCount} で即送信 · ←→/↑↓ 選択 Enter 確定 · 0/Esc 原文送信`,
    },
    ko: {
      title: "✦ 후보 선택 전송",
      keepOrig: "원문 전송",
      hint: `숫자 1-${candidatesCount} 즉시 전송 · ←→/↑↓ Enter 확인 · 0/Esc 원문 전송`,
    },
    es: {
      title: "✦ Elegir candidato",
      keepOrig: "Texto original",
      hint: `1-${candidatesCount} enviar · ←→/↑↓ Enter confirmar · 0/Esc original`,
    },
    fr: {
      title: "✦ Choisir une variante",
      keepOrig: "Texte original",
      hint: `1-${candidatesCount} envoyer · ←→/↑↓ Entrée valider · 0/Esc original`,
    },
    de: {
      title: "✦ Variante wählen",
      keepOrig: "Originaltext",
      hint: `1-${candidatesCount} senden · ←→/↑↓ Eingabe bestätigen · 0/Esc Original`,
    },
    ru: {
      title: "✦ Выбор варианта",
      keepOrig: "Исходный текст",
      hint: `1-${candidatesCount} отправить · ←→/↑↓ Enter подтвердить · 0/Esc исходный`,
    },
    en: {
      title: "✦ Pick candidate",
      keepOrig: "Send original",
      hint: `1-${candidatesCount} send · ←→/↑↓ Enter · 0/Esc original`,
    },
  };
  return selectPrompts[norm] || selectPrompts.en;
}

export function formatReleaseBannerLines(
  sourceLang = "en",
  maxCols = 80,
  fg: (color: string, text: string) => string = (_c, t) => t
): string[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  // Strictly honor live column budget on narrow viewports without artificial inflation
  const effectiveCols = typeof maxCols === "number" && maxCols > 0 ? maxCols : 80;

  const copyByLang: Record<string, BannerSpec> = {
    zh: {
      title: "· [pi-lingual v0.6.0] 三核出厂：伴学 · 规范直发 · 实战狂飙",
      subtitle: "│ 在 AI 生成的 5-15 秒间隙顺手捡语感；提示词始终纯净英文",
      rows: [
        "┌ [定制中心 · Tuner] 敲 /tuner 跟 AI 说话，随意增删改模式",
        "│   (4 大配装就绪：spec 压铸 · commit 脱水 · oss 对线 · yap 发推)",
        "├ [1 纯伴学 · companion] 中文原样直发；上方浮出双语对照卡",
        "├ [2 规范直发 · direct] 敲中文，0ms 转成规范英文工程指令",
        "├ [3 实战狂飙 · live-flow] 打英文；只修错词，粗口情绪 100% 保留",
        "└   (/lingual 1|2|3 按注册表顺序；/lingual <id> 永远有效)",
      ],
    },
    tw: {
      title: "· [pi-lingual v0.6.0] 三核出廠：純伴學 · 規範直發 · 實戰狂飆",
      subtitle: "│ 在 AI 生成的 5-15 秒間隙順手撿語感；提示詞始終純淨英文",
      rows: [
        "┌ [定製中心 · Tuner] 敲 /tuner 跟 AI 說話，隨意增刪改模式",
        "│   (4 大配裝就緒：spec 壓鑄 · commit 脫水 · oss 對線 · yap 發推)",
        "├ [1 純伴學 · companion] 中文原樣直發；上方浮出雙語對照卡",
        "├ [2 規範直發 · direct] 敲中文，0ms 轉成規範英文工程指令",
        "├ [3 實戰狂飆 · live-flow] 打英文；只修錯詞，粗口情緒 100% 保留",
        "└   (/lingual 1|2|3 按註冊表順序；/lingual <id> 永遠有效)",
      ],
    },
    ja: {
      title: "· [pi-lingual v0.6.0] 3コア：伴走 · 仕様直行 · 実戦疾走",
      subtitle: "│ AI 生成の 5-15 秒に語感を拾う；プロンプトは常に純英語",
      rows: [
        "┌ [設計センター · Tuner] /tuner で AI と対話しモードを編集",
        "│   (4大レシピ：spec 圧縮 · commit 脱水 · oss 対論 · yap 投稿)",
        "├ [1 伴走 · companion] 母語をそのまま送信；上部に二言語カード",
        "├ [2 仕様直行 · direct] 0ms で母語 ➔ 規範的な英語仕様に整形",
        "├ [3 実戦疾走 · live-flow] 英語入力；誤字のみ修正、感情は保持",
        "└   (/lingual 1|2|3 は登録順；/lingual <id> は常に有効)",
      ],
    },
    ko: {
      title: "· [pi-lingual v0.6.0] 3코어: 동행학습 · 논리정제 · 실전질주",
      subtitle: "│ AI 생성 5-15초에 어감을 줍는다; 프롬프트는 순수 영어",
      rows: [
        "┌ [설계 센터 · Tuner] /tuner 로 AI 와 모드를 편집",
        "│   (4대 레시피: spec · commit · oss · yap)",
        "├ [1 동행학습 · companion] 모국어 원문 전송; 이중언어 카드",
        "├ [2 논리정제 · direct] 0ms 로 모국어 ➔ 규격 영어 사양",
        "├ [3 실전질주 · live-flow] 영어 입력; 오타만 수정, 감정 유지",
        "└   (/lingual 1|2|3 은 등록 순서; /lingual <id> 는 항상 유효)",
      ],
    },
    es: {
      title: "· [pi-lingual v0.6.0] Tres núcleos: Compañero · Directo · Live Flow",
      subtitle: "│ Aprovecha los 5-15 s; tu prompt siempre en inglés limpio",
      rows: [
        "┌ [Centro Tuner] /tuner para crear o editar modos con AI",
        "│   (4 recetas: spec · commit · oss · yap)",
        "├ [1 Aprendizaje · companion] Idioma nativo intacto; tarjeta arriba",
        "├ [2 Directo Lógico · direct] 0ms nativo ➔ especificación inglesa",
        "├ [3 Live Flow · live-flow] Escribe en inglés; solo corrige erratas",
        "└   (/lingual 1|2|3 por registro; /lingual <id> siempre funciona)",
      ],
    },
    fr: {
      title: "· [pi-lingual v0.6.0] Trois cœurs : Compagnon · Direct · Live Flow",
      subtitle: "│ Profitez des 5-15 s ; prompt toujours en anglais propre",
      rows: [
        "┌ [Centre Tuner]   Tapez /tuner pour créer ou modifier des modes",
        "│   (4 recettes : spec · commit · oss · yap)",
        "├ [1 Compagnon · companion] Langue native brute ; carte au-dessus",
        "├ [2 Direct Logique · direct] 0ms natif ➔ spec anglaise structurée",
        "├ [3 Live Flow · live-flow] Écrivez en anglais ; seules fautes corrigées",
        "└   (/lingual 1|2|3 selon registre ; /lingual <id> marche toujours)",
      ],
    },
    de: {
      title: "· [pi-lingual v0.6.0] Drei Kerne: Begleitung · Logik · Live Flow",
      subtitle: "│ Nutze die 5-15 s; Prompt bleibt klares Englisch",
      rows: [
        "┌ [Tuner-Zentrale]  /tuner für Modi im Gespräch",
        "│   (4 Rezepte: spec · commit · oss · yap)",
        "├ [1 Begleitung · companion] Muttersprache roh; Karte darüber",
        "├ [2 Direkte Logik · direct] 0ms nativ ➔ englische Spezifikation",
        "├ [3 Live Flow · live-flow] Englisch tippen; nur Fehler korrigiert",
        "└   (/lingual 1|2|3 nach Registry; /lingual <id> löst immer auf)",
      ],
    },
    ru: {
      title: "· [pi-lingual v0.6.0] Три ядра: Сопровождение · Логика · Live Flow",
      subtitle: "│ Ловите язык в паузе 5-15 с; промпт — чистый английский",
      rows: [
        "┌ [Центр Tuner]    /tuner — правьте режимы в диалоге",
        "│   (4 рецепта: spec · commit · oss · yap)",
        "├ [1 Сопровождение · companion] Родной текст как есть; карточка",
        "├ [2 Прямой поток · direct] 0ms родной ➔ англ. спецификация",
        "├ [3 Live Flow · live-flow] English-ввод; правятся только опечатки",
        "└   (/lingual 1|2|3 по реестру; /lingual <id> всегда работает)",
      ],
    },
    en: {
      title: "· [pi-lingual v0.6.0] Three cores: Companion · Spec · Live Flow",
      subtitle: "│ Catch phrasing in the 5-15 s gap; prompts stay clean English",
      rows: [
        "┌ [Architect Tuner] Run /tuner to add or edit modes with AI",
        "│   (4 tactical loadouts: spec · commit · oss · yap)",
        "├ [1 Companion · companion] Native text sent raw; card above",
        "├ [2 Logical Spec · direct] 0ms native ➔ imperative English spec",
        "├ [3 Live Flow · live-flow] Draft English; only typos fixed, tone kept",
        "└   (/lingual 1|2|3 = registry order; /lingual <id> always works)",
      ],
    },
  };

  const c = copyByLang[norm] || copyByLang.en;
  const allRawLines = [c.title, c.subtitle, ...c.rows];
  return allRawLines.map((line) => truncateVisual(`  ${fg("muted", line)}`, effectiveCols));
}
