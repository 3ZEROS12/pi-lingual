import type { LingualRequest, LingualResponse, TranslationPayload, SlotConfig, SlotResult } from "./types.js";
import { shouldShieldBypass } from "../shield.js";
import { LingualLruCache, globalLingualCache } from "../cache.js";
import { buildSystemPrompt, getDefaultSlots } from "./prompts.js";

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

/**
 * Clean and parse LLM JSON responses safely
 * Robust against markdown fences, reasoning thoughts (<think>...</think>), and conversational chatter
 */
export function parseLlmResponse(raw: string): TranslationPayload | null {
  try {
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
    if (!parsed) return null;

    const spoken = (parsed.spoken || parsed.casual || parsed.slot1 || "").trim();
    const spokenMeaning = (parsed.spoken_meaning || parsed.spokenMeaning || "").trim();
    const written = (parsed.written || parsed.academic || parsed.slot2 || "").trim();
    const writtenMeaning = (parsed.written_meaning || parsed.writtenMeaning || "").trim();
    const vocab = typeof parsed.vocab === "string" ? parsed.vocab.trim() : "";
    const summary = typeof (parsed.summary || parsed.core_intent || parsed.coreIntent) === "string"
      ? (parsed.summary || parsed.core_intent || parsed.coreIntent).trim()
      : "";

    // 动态提取所有槽位的输出 (支持任意自定义槽位 ID，如 twitter, email, grammar 等)
    const slotOutputs: Record<string, { content: string; meaning?: string }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim() && !k.endsWith("_meaning") && k !== "summary") {
        const meaningVal = typeof parsed[k + "_meaning"] === "string" ? parsed[k + "_meaning"].trim() : undefined;
        slotOutputs[k] = {
          content: v.trim(),
          meaning: meaningVal || undefined,
        };
      }
    }

    const nonVocabOutputs = Object.entries(slotOutputs)
      .filter(([k]) => k !== "vocab")
      .map(([, val]) => val);
    const effectiveSpoken = spoken || nonVocabOutputs[0]?.content || "";
    const effectiveSpokenMeaning = spokenMeaning || nonVocabOutputs[0]?.meaning || "";
    if (effectiveSpoken) {
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

  // 3. If no completer supplied, return fallback response
  if (!options?.completer) {
    return {
      spoken: text,
      written: text,
      cached: false,
      shieldBypassed: false,
    };
  }

  // 4. Build system prompt with context, tone, and dynamic custom slot adaptations
  const systemPrompt = buildSystemPrompt(
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
        const content = (rawObj[slot.id] || (slot.id === "spoken" ? parsed.spoken : slot.id === "written" ? parsed.written : slot.id === "vocab" ? parsed.vocab : "") || "").trim();
        const meaning = (rawObj[slot.id + "_meaning"] || (slot.id === "spoken" ? parsed.spokenMeaning : slot.id === "written" ? parsed.writtenMeaning : undefined) || "").trim() || undefined;
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

  return {
    spoken: text,
    written: text,
    cached: false,
    shieldBypassed: false,
  };
}
