import type { LingualConfig } from "../types.js";
import { parsePartialJsonFields } from "../runtime.js";

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

export function withStreamingPartial(cfg: LingualConfig): LingualConfig {
  if (!cfg.onPartial) return cfg;
  return {
    ...cfg,
    onDelta: (full: string) => {
      try {
        cfg.onPartial!(parsePartialJsonFields(full));
      } catch {}
      try {
        cfg.onDelta?.(full);
      } catch {}
    },
  };
}

/**
 * Unified LLM transport primitive: handles AbortController timeout synthesis, custom completer, and OpenAI endpoint fallback.
 */
export async function executeLlmCompletion(
  text: string,
  sysPrompt: string,
  cfg: LingualConfig
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  let onAbort: (() => void) | undefined;

  if (cfg.signal) {
    if (cfg.signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    onAbort = () => controller.abort();
    cfg.signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    if (typeof cfg.complete === "function") {
      return await cfg.complete(text, sysPrompt, controller.signal, {
        reasoning: cfg.reasoning,
        onDelta: cfg.onDelta,
      });
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
      };
      // Never pass temperature when reasoning effort is enabled.
      if (cfg.reasoning) {
        requestBody.reasoning = cfg.reasoning;
      } else if (cfg.temperature !== undefined) {
        requestBody.temperature = cfg.temperature;
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
    if (cfg.signal && onAbort) {
      cfg.signal.removeEventListener("abort", onAbort);
    }
  }
}
