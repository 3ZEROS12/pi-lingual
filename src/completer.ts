import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadUserLingualConfig } from "./engine.js";

/**
 * Reads the user's global default model from Pi's settings.json (~/.pi/agent/settings.json).
 * This directly respects the user's configured global Pi default model without heuristics.
 */
export function getPiGlobalDefaultModel(): { modelId?: string; provider?: string } | null {
  try {
    const configDir = process.env.PI_CODING_AGENT_DIR || process.env.PI_CONFIG_DIR || path.join(os.homedir(), ".pi", "agent");
    const settingsPath = path.join(configDir, "settings.json");
    if (!fs.existsSync(settingsPath)) return null;
    const raw = fs.readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const defaultModel = typeof parsed?.defaultModel === "string" ? parsed.defaultModel.trim() : undefined;
    const defaultProvider = typeof parsed?.defaultProvider === "string" ? parsed.defaultProvider.trim() : undefined;
    if (defaultModel) {
      return { modelId: defaultModel, provider: defaultProvider };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves the target model for Lingual translation.
 * Priority:
 * 1. User pinned model in lingual.json or explicit /lingual model <id>
 * 2. Explicit session follow (/lingual model session)
 * 3. Default (auto): Pi's global defaultModel from ~/.pi/agent/settings.json
 * 4. Fallback: Current active conversation model (ctx.model)
 */
export function resolveTargetModel(
  ctx: ExtensionContext,
  selectedModel = "auto"
): any {
  if (!ctx) return undefined;

  const available = (ctx.modelRegistry?.getAvailable?.() || []).filter(
    (m: any) => m && m.id
  );

  // 1. Explicit follow-session: user explicitly requested to follow active conversation model
  if (selectedModel === "session" || selectedModel === "follow") {
    return ctx.model;
  }

  // 2. Explicit user-pinned model in lingual.json or /lingual model <id>
  if (selectedModel && selectedModel !== "auto") {
    const exactFull = available.find(
      (m: any) => `${m.provider}/${m.id}` === selectedModel
    );
    if (exactFull) return exactFull;

    const exactId = available.find((m: any) => m.id === selectedModel);
    if (exactId) return exactId;

    const lowerSelected = selectedModel.toLowerCase();
    const subMatch = available.find((m: any) => {
      const full = `${m.provider}/${m.id}`.toLowerCase();
      const id = (m.id || "").toLowerCase();
      return full.includes(lowerSelected) || id.includes(lowerSelected);
    });
    if (subMatch) return subMatch;

    if (available.length === 0 && ctx.model) {
      return ctx.model;
    }
    return undefined;
  }

  // 3. Default "auto" mode:
  // First priority: User's configured Pi defaultModel from ~/.pi/agent/settings.json
  const piDefault = getPiGlobalDefaultModel();
  if (piDefault?.modelId) {
    const target = piDefault.modelId.toLowerCase();
    const prov = piDefault.provider?.toLowerCase();
    const matched =
      (prov &&
        available.find(
          (m: any) => (m.provider || "").toLowerCase() === prov && (m.id || "").toLowerCase() === target
        )) ||
      available.find((m: any) => `${m.provider}/${m.id}`.toLowerCase() === target) ||
      available.find((m: any) => {
        const full = `${m.provider}/${m.id}`.toLowerCase();
        const id = (m.id || "").toLowerCase();
        return id === target || full.endsWith(`/${target}`);
      });
    if (matched) {
      return matched;
    }
  }

  // Fallback: Use active conversation model
  return ctx.model;
}

/**
 * Host-native model completer: zero-config in-process model execution.
 */
export function createModelCompleter(
  ctx: ExtensionContext,
  getSelectedModel: () => string,
  defaultOpts?: { reasoning?: string }
) {
  return async (
    text: string,
    systemPrompt: string,
    signal?: AbortSignal,
    callOpts?: { reasoning?: string; onDelta?: (fullText: string) => void }
  ): Promise<string | null> => {
    try {
      if (!ctx.modelRegistry) return null;

      // 1. Resolve target model: follow active session, user-configured model, or default model
      const selected = typeof getSelectedModel === "function" ? getSelectedModel() : "auto";
      const targetModel = resolveTargetModel(ctx, selected);

      if (!targetModel) return null;

      // 2. Invoke Pi native streamSimple with credentials managed by host.
      // Scale maxTokens by reasoning effort so thinking models never truncate multi-slot JSON.
      const diskConfig = loadUserLingualConfig();
      const effectiveReasoning =
        callOpts?.reasoning ||
        defaultOpts?.reasoning ||
        diskConfig.reasoning ||
        "low";
      const tokenBudget =
        effectiveReasoning === "high"
          ? 4096
          : effectiveReasoning === "medium"
            ? 2800
            : 2200;

      const diskTimeout = diskConfig.timeoutMs || 15000;
      const callController = new AbortController();
      let abortListener: (() => void) | undefined;
      if (signal) {
        if (signal.aborted) return null;
        abortListener = () => callController.abort();
        signal.addEventListener("abort", abortListener, { once: true });
      }

      const requestOptions: Record<string, any> = {
        maxTokens: tokenBudget,
        reasoning: effectiveReasoning,
        signal: callController.signal,
      };
      const stream = ctx.modelRegistry.streamSimple(
        targetModel,
        {
          systemPrompt,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text }],
              timestamp: Date.now(),
            },
          ],
        },
        requestOptions as any
      );

      let timeoutHandle: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          callController.abort();
          try {
            (stream as any)?.abort?.();
          } catch {}
          reject(new Error("Lingual translation timed out"));
        }, diskTimeout);
      });
      const abortPromise = new Promise<null>((_, reject) => {
        if (callController.signal.aborted) {
          reject(new Error("Lingual translation aborted"));
          return;
        }
        callController.signal.addEventListener(
          "abort",
          () => {
            try {
              (stream as any)?.abort?.();
            } catch {}
            reject(new Error("Lingual translation aborted"));
          },
          { once: true }
        );
      });
      let res: any;
      try {
        if (
          typeof callOpts?.onDelta === "function" &&
          stream &&
          typeof (stream as any)[Symbol.asyncIterator] === "function"
        ) {
          // Progressive path: consume text deltas so the HUD can paint mid-flight.
          const onDelta = callOpts.onDelta;
          let buffer = "";
          const consume = (async () => {
            for await (const ev of stream as any) {
              if (callController.signal.aborted) break;
              if (ev?.type === "text_delta" && typeof ev.delta === "string") {
                buffer += ev.delta;
                try {
                  onDelta(buffer);
                } catch {}
              } else if (ev?.type === "text_end" && !buffer && typeof ev.content === "string") {
                buffer = ev.content;
                try {
                  onDelta(buffer);
                } catch {}
              }
            }
            if (!buffer.trim() && typeof (stream as any).result === "function") {
              const finalRes = await (stream as any).result();
              const content = typeof finalRes === "string"
                ? finalRes
                : finalRes?.content
                    ?.filter((c: any) => c?.type === "text" && typeof c.text === "string")
                    ?.map((c: any) => c.text)
                    ?.join("");
              if (content && typeof content === "string") {
                buffer = content;
                try {
                  onDelta(buffer);
                } catch {}
              }
            }
            return buffer;
          })();
          res = await Promise.race([consume, timeoutPromise, abortPromise]);
          return typeof res === "string" && res.trim() ? res.trim() : null;
        }
        res = await Promise.race([stream.result(), timeoutPromise, abortPromise]);
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (signal && abortListener) {
          signal.removeEventListener("abort", abortListener);
        }
      }

      if (!res) return null;
      if (typeof res === "string" && res.trim()) return res.trim();
      const content = res.content
        ?.filter((c: any) => c?.type === "text" && typeof c.text === "string")
        ?.map((c: any) => c.text)
        ?.join("");

      return content && content.trim() ? content.trim() : null;
    } catch {
      return null;
    }
  };
}
