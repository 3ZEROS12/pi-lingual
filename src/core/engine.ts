import type { LingualRequest, LingualResponse, TranslationPayload, SlotConfig, SlotResult } from "./types.js";
import { shouldShieldBypass } from "../shield.js";
import { LingualLruCache, globalLingualCache } from "../cache.js";
import { buildSystemPrompt, buildRefineSystemPrompt, getDefaultSlots } from "./prompts.js";

/**
 * Featherweight JSON repair for LLM responses with unescaped quotes or trailing commas
 */
function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    try {
      const repaired = str
        .replace(/,\s*([}\]])/g, "$1")
        .replace(
          /("[a-zA-Z0-9_-]+"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
          (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
        );
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

const BLOCKED_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function toCleanString(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(toCleanString).filter(Boolean).join(" · ");
  return "";
}

/**
 * Clean and parse LLM JSON responses safely
 * Robust against markdown fences, reasoning thoughts (<think>...</think>), and conversational chatter
 */
export function parseLlmResponse(raw: string): TranslationPayload | null {
  try {
    if (!raw || typeof raw !== "string" || raw.length > 32_768) return null;
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const jsonSubstr = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson(jsonSubstr);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const spoken = toCleanString(parsed.spoken ?? parsed.casual ?? parsed.slot1);
    const spokenMeaning = toCleanString(parsed.spoken_meaning ?? parsed.spokenMeaning);
    const written = toCleanString(parsed.written ?? parsed.refined ?? parsed.academic ?? parsed.slot2);
    const writtenMeaning = toCleanString(parsed.written_meaning ?? parsed.writtenMeaning ?? parsed.refined_meaning);
    const refined = toCleanString(parsed.refined ?? parsed.written ?? parsed.spoken);
    const vocab = toCleanString(parsed.vocab);
    const summary = toCleanString(parsed.summary ?? parsed.core_intent ?? parsed.coreIntent);

    // 动态提取所有槽位的输出 (支持任意自定义槽位 ID，如 twitter, email, grammar 等)
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
    if (effectiveSpoken) {
      return {
        spoken: effectiveSpoken,
        spokenMeaning: effectiveSpokenMeaning || undefined,
        written: written || undefined,
        writtenMeaning: writtenMeaning || undefined,
        refined: refined || effectiveSpoken,
        vocab: vocab || undefined,
        summary: summary || undefined,
        slotOutputs: Object.keys(slotOutputs).length > 0 ? slotOutputs : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface LingualCoreOptions {
  completer?: (prompt: string, systemPrompt: string, signal?: AbortSignal) => Promise<string | null>;
  cache?: LingualLruCache<TranslationPayload>;
  signal?: AbortSignal;
}

/**
 * Pure translation engine orchestrator for lingual-core
 * Completely decoupled from Pi host session or file system I/O.
 */
export async function translateCore(
  req: LingualRequest,
  options?: LingualCoreOptions
): Promise<LingualResponse> {
  const text = (req.text || "").trim();
  const sourceLang = req.sourceLang || "zh";
  const targetLang = req.targetLang || "en";

  if (!text) {
    return {
      spoken: "",
      written: "",
      cached: false,
      shieldBypassed: false,
    };
  }

  // 1. Code & Shell Shield: 0ms bypass for pure commands, code blocks, and data structures
  if (shouldShieldBypass(text)) {
    return {
      spoken: text,
      written: text,
      cached: false,
      shieldBypassed: true,
    };
  }

  // 2. In-memory LRU Cache check
  const cache = options?.cache || globalLingualCache;
  const baseSlotSig = Array.isArray(req.slots)
    ? req.slots.filter((s) => s.enabled !== false).map((s) => s.id).join(",")
    : "";
  const refineSig = req.refinePreset || req.refineLang || req.refineRule
    ? `|ref:${req.refinePreset || "translate"}:${req.refineLang || ""}:${req.refineRule || ""}`
    : "";
  const slotSig = (baseSlotSig + refineSig) || undefined;
  const cacheKey = LingualLruCache.buildKey(text, sourceLang, targetLang, slotSig);
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      spoken: cached.spoken,
      spokenMeaning: cached.spokenMeaning,
      written: cached.written || cached.spoken,
      writtenMeaning: cached.writtenMeaning,
      refined: cached.refined || cached.written || cached.spoken,
      vocab: cached.vocab,
      summary: cached.summary,
      cached: true,
      shieldBypassed: false,
    };
  }

  // 3. If no completer supplied, return fallback response
  if (!options?.completer) {
    return {
      spoken: text,
      written: text,
      refined: text,
      cached: false,
      shieldBypassed: false,
    };
  }

  // 4. Build system prompt (use Prompt Refiner when refine options are active)
  const useRefiner = Boolean(
    (req.refinePreset && req.refinePreset !== "translate") ||
    req.refineLang ||
    (req.refineRule && req.refineRule.trim())
  );
  const systemPrompt = useRefiner
    ? buildRefineSystemPrompt({
        sourceLang,
        targetLang,
        refinePreset: req.refinePreset,
        refineLang: req.refineLang,
        refineRule: req.refineRule,
        isLongInput: Boolean(req.isLongInput),
      })
    : buildSystemPrompt(
        sourceLang,
        targetLang,
        Boolean(req.isLongInput),
        req.context,
        req.tone || "general",
        req.slots
      );

  // 5. Invoke LLM completion
  const raw = await options.completer(text, systemPrompt, options.signal);
  if (!raw) {
    return {
      spoken: text,
      written: text,
      cached: false,
      shieldBypassed: false,
    };
  }

  // 6. Safe JSON parsing & cache storage
  const parsed = parseLlmResponse(raw);
  if (parsed) {
    cache.set(cacheKey, parsed);

    // Build dynamic multi-slot results array
    const configuredSlots: SlotConfig[] = Array.isArray(req.slots)
      ? req.slots
      : getDefaultSlots(sourceLang);

    // Parse raw JSON object for custom slot keys
    let rawObj: Record<string, any> = {};
    try {
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        rawObj = tryParseJson(raw.slice(firstBrace, lastBrace + 1)) || {};
      }
    } catch {}

    const slotResults: SlotResult[] = [];
    for (const slot of configuredSlots) {
      if (!slot.enabled) continue;
      if (slot.role === "source") {
        slotResults.push({ id: slot.id, label: slot.label, role: slot.role, content: text });
      } else {
        const out = parsed.slotOutputs && Object.hasOwn(parsed.slotOutputs, slot.id)
          ? parsed.slotOutputs[slot.id]
          : undefined;
        const content = out?.content || toCleanString(rawObj[slot.id]) || (slot.id === "spoken" ? parsed.spoken : slot.id === "written" ? (parsed.written || "") : slot.id === "vocab" ? (parsed.vocab || "") : "");
        const meaning = out?.meaning || toCleanString(rawObj[slot.id + "_meaning"]) || (slot.id === "spoken" ? parsed.spokenMeaning : slot.id === "written" ? parsed.writtenMeaning : undefined) || undefined;
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
      refined: parsed.refined || parsed.written || parsed.spoken,
      vocab: parsed.vocab,
      summary: parsed.summary,
      slots: slotResults,
      cached: false,
      shieldBypassed: false,
    };
  }

  return {
    spoken: text,
    written: text,
    cached: false,
    shieldBypassed: false,
  };
}
