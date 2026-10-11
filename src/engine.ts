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
};
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { LingualConfig, LingualResult, PromptCandidate, PromptSlotConfig, TranslationPayload } from "./types.js";
import { resolveLabelsForLang, resolveSlotsForPreset } from "./presets.js";
import {
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  getDefaultPromptSlots,
  resolvePromptTargetLangName,
} from "./prompts.js";
import { shouldShieldBypass } from "./shield.js";
import { LingualLruCache, globalLingualCache } from "./cache.js";

let cachedUserConfig: Partial<LingualConfig> | null = null;
let lastConfigCheckTime = 0;
const CONFIG_CACHE_TTL_MS = 2000;

export function invalidateUserConfigCache(): void {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.execArgv.some((a) => a.startsWith("--test") || a === "--test") ||
    process.argv.some((a) => a.includes(".test.") || a.includes("test")) ||
    process.env.npm_lifecycle_event === "test"
  );
}

/**
 * Load user configuration from single source of truth: ~/.pi/agent/lingual.json
 * If lingual.json does not exist, performs a one-time graceful migration from settings.json ("pi-lingual" block).
 * Uses high-efficiency 2-second in-memory memoization to prevent synchronous disk I/O thrashing.
 * Never writes back to settings.json, protecting host environment.
 */
export function loadUserLingualConfig(): Partial<LingualConfig> {
  // 测试沙箱隔离：自动化测试期间不读取宿主机个人配置，防止环境脏数据干扰断言
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

  // 1. 优先读取独立单一数据源 lingual.json
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

  // 2. 若 lingual.json 不存在，执行向下兼容平滑迁移 (读取 settings.json 并静默迁移写入 lingual.json)
  if (!target && fs.existsSync(settingsFile)) {
    try {
      const raw = fs.readFileSync(settingsFile, "utf8");
      const parsed = JSON.parse(raw);
      const legacyBlock = parsed["pi-lingual"];
      if (legacyBlock && typeof legacyBlock === "object") {
        target = legacyBlock;
        // 一次性静默迁移到 lingual.json，后续彻底绝缘 settings.json
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
    const slots = Array.isArray(target.slots)
      ? target.slots.filter((s: any) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string")
      : undefined;
    const promptLang = typeof target.promptLang === "string" ? target.promptLang : undefined;
    const promptRule = typeof target.promptRule === "string" ? target.promptRule : undefined;
    const promptSlots = Array.isArray(target.promptSlots)
      ? target.promptSlots.filter((s: any) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string")
      : undefined;
    const lastSeenVersion = typeof target.lastSeenVersion === "string" ? target.lastSeenVersion : undefined;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : undefined;
    const timeoutMs = typeof target.timeoutMs === "number" && Number.isFinite(target.timeoutMs)
      ? Math.min(60_000, Math.max(1000, target.timeoutMs))
      : undefined;
    const replyInSourceLang = target.replyInSourceLang !== undefined ? Boolean(target.replyInSourceLang) : undefined;
    const labels = resolveLabelsForLang(sourceLang || "zh", target.labels, targetLang);

    cachedUserConfig = {
      ...(endpoint ? { endpoint } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
      ...(selectedModel ? { selectedModel } : {}),
      ...(target.mode ? { mode: target.mode } : {}),
      ...(compact !== undefined ? { compact: Boolean(compact) } : {}),
      ...(slotPreset ? { slotPreset } : {}),
      ...(slots ? { slots } : {}),
      ...(promptLang ? { promptLang } : {}),
      ...(promptRule ? { promptRule } : {}),
      ...(promptSlots ? { promptSlots } : {}),
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

export const DEFAULT_CONFIG: LingualConfig = {
  endpoint: process.env.LINGUAL_ENDPOINT || "",
  apiKey: process.env.LINGUAL_API_KEY || "",
  model: process.env.LINGUAL_MODEL || "",
  selectedModel: "auto",
  mode: "original",
  sourceLang: "zh",
  targetLang: "en",
  temperature: 0.2,
  timeoutMs: 30000,
};

/**
 * 现代开发者双语伴学系统提示词 (中文 A ➔ 英文 B，默认导出)
 * 设计哲学：
 * 1. 敏捷口语 (Silicon Valley Slack/Standup) + 现代技术书面 (PR/RFC/Docs) 双语域
 * 2. 母语 A 精准语境释义与反向释义 (Back-translation & Nuance)
 * 3. 典型开发协同的 3 组黄金 Few-Shot 锚点
 * 4. 代码与专有名词绝对防御机制 (Code & Symbol Shield)
 * 5. 水平自适应重点词汇提取，单行紧凑流排列
 */
export const LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("zh", "en");
export {
  buildSystemPrompt,
  buildDirectRewriteSystemPrompt,
  buildPromptCandidatesSystemPrompt,
  getDefaultPromptSlots,
  resolvePromptTargetLangName,
};

/**
 * Check if the text contains non-English natural language scripts (CJK, accented Latin, Cyrillic, etc.)
 * Strictly avoids triggering on pure emojis, typographical quotes, or terminal commands.
 */
export function isNonEnglish(text: string): boolean {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}

export const MAX_TRANSLATION_CHARS = 2500;
export const MAX_TRANSLATION_LINES = 30;

/**
 * Bidirectional language-aware trigger with strict Length & Payload Guards:
 * - If sourceLang is not English (e.g. "zh", "ja"): triggers on natural language scripts;
 * - If sourceLang is English ("en"): detects English natural language sentences while strictly excluding code and CLI commands;
 * - Centrally delegates to shouldShieldBypass (Single Source of Truth) to exclude code statements, SQL, and 40+ CLI commands;
 * - [Safety Gate]: Rejects oversized payloads (> 1500 chars), monolithic multi-line code (> 8 lines), markdown headings, and code fences.
 */
export function shouldTriggerTranslation(text: string, sourceLang = "zh", allowSameLangPromptOpt = false): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 1. Long text and structured payload guard (protects tokens and terminal screen)
  if (trimmed.length > MAX_TRANSLATION_CHARS) {
    return false;
  }
  const lines = trimmed.split(/\r?\n/);
  if (lines.length > MAX_TRANSLATION_LINES) {
    return false;
  }
  // Fast bypass markdown headings and horizontal rules
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith("---")) {
    return false;
  }

  // 2. Code & Shell Shield: 0ms bypass for pure commands, code fences, and data structures
  if (shouldShieldBypass(trimmed)) {
    return false;
  }

  // 2b. In Mode 2 (Direct Rewrite) or Mode 3 (N-Choice Select), allow any natural language sentence
  //     (even if source and output languages are the same!)
  if (allowSameLangPromptOpt) {
    if (isNonEnglish(trimmed)) return true;
    const words = trimmed.split(/\s+/);
    return words.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
  }

  // 3. Non-Latin scripts (Chinese, Japanese, Korean, Russian, Arabic) must contain native script characters
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const nonLatinLangs = new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
  if (nonLatinLangs.has(normSource)) {
    return isNonEnglish(trimmed);
  }

  // 4. Latin-script languages (en, es, fr, de, pt, it, vi, tr, ms):
  // Trigger if accented/non-ASCII chars exist OR if it's a multi-word alphabetic sentence
  if (isNonEnglish(trimmed)) {
    return true;
  }
  const words = trimmed.split(/\s+/);
  if (words.length < 2) {
    return false;
  }

  // Must contain standard alphabet words
  return /[a-zA-Z]{2,}/.test(trimmed);
}

import { parseLlmResponse, translateCore } from "./core/engine.js";
export { parseLlmResponse, translateCore };

/**
 * Strip annotations and recover purely clean text to prevent LLM prompt pollution
 * Robust against tree branch glyphs (┌ ├ └) and arrow annotations (↳)
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

    // Check for source line: · 原文 text or · [原文] text
    const sourceMatch = trimmed.match(/^·\s*\[?(?:原文|source|original|quelle)\]?\s+(.*)$/i);
    if (sourceMatch) {
      rawLines.push(sourceMatch[1].trim());
      continue;
    }

    // Ignore sub-rail nuance lines (↳ ...) so raw text remains completely unpolluted
    if (/^(?:[│\s]*↳\s*\(.*\)|↳\s*\(.*\))/.test(trimmed)) {
      continue;
    }

    // Match tree branch or arrow lines: [prefix] [label] text
    const slotMatch = trimmed.match(/^(?:[┌├└│]\s*|↳\s*)\[([^\]]+)\]\s*(.*)$/);
    if (slotMatch) {
      const tag = slotMatch[1].trim();
      let text = slotMatch[2].trim().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

      // If the text contains parenthetical nuance like "... (释义)", isolate the expression
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

  return {
    raw: rawLines.join("\n").trim(),
    spoken,
    written,
    vocab,
  };
}

/**
 * 动态判定是否需要触发长输入凝练与意图大标题总结 (彻底解决 45~90 字符/多句"中间状态"截断隐患)
 * 核心物理事实：CJK (中日韩) 为高密度表意文字，信息密度为西文 2.5 倍。
 * 45 汉字通常包含 2~3 个分句，直译为英文达 180~220 字符 (3 行 Spoken + 3 行 Written)，
 * 必然冲垮 9 行卡片盒模型预算并挤爆重点词汇。
 */
export function isDynamicLongInput(text: string, sourceLang = "zh"): boolean {
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
 * Translate a user prompt into idiomatic English with dual registers, native nuance, and vocabulary highlights
 */
export async function translatePrompt(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<LingualResult | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };

  // Language-aware bidirectional trigger check
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) {
    return null;
  }

  // Code & Shell Pass-through Shield: 0ms bypass for pure commands, code fences, and data structures
  if (shouldShieldBypass(trimmed)) {
    return null;
  }

  // In-Memory LRU Cache: 0ms hit for high-frequency phrases (e.g. "继续", "认同", "开始吧")
  const effectiveSlots = cfg.slots || (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : undefined);
  const slotSig = Array.isArray(effectiveSlots)
    ? effectiveSlots.filter((s) => s.enabled !== false).map((s) => s.id).join(",")
    : undefined;
  const cacheKey = LingualLruCache.buildKey(trimmed, cfg.sourceLang, cfg.targetLang, slotSig);
  const cached = globalLingualCache.get(cacheKey);
  if (cached) {
    return cached;
  }

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
    let content: string | null = null;
    const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
    const sysPrompt = buildSystemPrompt(cfg.sourceLang, cfg.targetLang, isLongInput, undefined, "general", effectiveSlots);

    // 1. If custom complete callback is provided (e.g. Pi native ModelRegistry / ctx.model):
    if (typeof cfg.complete === "function") {
      content = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      // 2. Otherwise fall back to custom OpenAI-compatible endpoint (BYOK / self-hosted proxy)
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (cfg.apiKey) {
        headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      }

      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: trimmed },
          ],
          temperature: cfg.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const json = (await response.json()) as any;
      content = json?.choices?.[0]?.message?.content ?? null;
    } else {
      // Neither complete callback nor endpoint configured
      return null;
    }

    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    const payload = parseLlmResponse(content);
    if (!payload || !payload.spoken) return null;

    const labels = resolveLabelsForLang(cfg.sourceLang || "zh", cfg.labels, cfg.targetLang);
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

    // Store in LRU cache
    globalLingualCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const LINGUA_SYSTEM_PROMPT = LINGUAL_SYSTEM_PROMPT;
export const stripLinguaAnnotation = stripLingualAnnotation;
export const loadUserConfig = loadUserLingualConfig;

/**
 * 智能判定是否需要注入母语回复守护指引 (Opt-in Native Reply Guard)
 * 1. 只有当用户显式开启 replyInSourceLang 时；
 * 2. 原始输入必须为母语（如中文/日文等，包含 CJK 字符）；
 * 3. 严格排除用户主动要求撰写英文文本（如 PR description, commit message, 英文邮件等）的意图。
 */
export function shouldInjectNativeReplyGuard(originalText: string, _sourceLang = "zh", enabled = false): boolean {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed) return false;

  // 必须是母语自然语言输入
  if (!isNonEnglish(trimmed)) return false;

  // 意图守卫：若用户本意就是在要求生成英文文本，严禁强加母语回复指示！
  const isEnglishWritingIntent = /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(trimmed);
  if (isEnglishWritingIntent) {
    return false;
  }

  return true;
}

export function formatNativeReplyGuardHint(sourceLang = "zh"): string {
  if (sourceLang === "ja") {
    return "\n\n(Please reply and explain in Japanese.)";
  }
  if (sourceLang === "zh" || sourceLang === "tw") {
    return "\n\n(Please reply and explain in Chinese.)";
  }
  if (sourceLang === "es") {
    return "\n\n(Please reply and explain in Spanish.)";
  }
  if (sourceLang === "fr") {
    return "\n\n(Please reply and explain in French.)";
  }
  if (sourceLang === "de") {
    return "\n\n(Please reply and explain in German.)";
  }
  return "\n\n(Please reply in the user's native language.)";
}

function repairAndParseJsonObject(raw: string): Record<string, any> | null {
  try {
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) cleaned = fence[1].trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last <= first) return null;

    const jsonSubstr = cleaned.slice(first, last + 1);
    try {
      const parsed = JSON.parse(jsonSubstr);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      const repaired = jsonSubstr
        .replace(/,\s*([}\]])/g, "$1")
        .replace(
          /("[a-zA-Z0-9_-]+"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
          (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
        );
      const parsed = JSON.parse(repaired);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
}

function extractCleanJsonField(raw: string, fieldName: string): string {
  const obj = repairAndParseJsonObject(raw);
  if (obj) {
    const val = obj[fieldName] ?? obj.prompt ?? obj.written ?? obj.spoken;
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  const cleaned = raw
    .replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "")
    .replace(/```(?:json)?|```/gi, "")
    .trim();
  // Guard against leaking raw JSON wrapper if regex repair still failed
  const regexFallback = cleaned.match(/"(?:prompt|written|spoken)"\s*:\s*"([\s\S]*?)"\s*\}/);
  if (regexFallback && regexFallback[1].trim()) {
    return regexFallback[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return "";
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}

/**
 * Mode 2 (Direct Prompt Rewrite):
 * Runs the user's raw input through a lightweight model injected with the Direct Rewrite System Prompt
 * (structuring + standardizing + high efficiency + output language + custom rule), returning the new prompt directly
 * without generating vocabulary or spoken learning cards.
 */
export async function rewritePromptDirect(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };

  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang, true)) {
    return null;
  }

  const sysPrompt = buildDirectRewriteSystemPrompt({
    sourceLang: cfg.sourceLang,
    targetLang: cfg.targetLang,
    promptLang: cfg.promptLang,
    promptRule: cfg.promptRule,
  });

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
    let raw: string | null = null;
    if (typeof cfg.complete === "function") {
      raw = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: trimmed },
          ],
          temperature: cfg.temperature,
        }),
        signal: controller.signal,
      });
      if (response.ok) {
        const json = (await response.json()) as any;
        raw = json?.choices?.[0]?.message?.content ?? null;
      }
    }

    if (typeof raw !== "string" || !raw.trim()) return null;
    const rewritten = extractCleanJsonField(raw, "prompt");
    return rewritten || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mode 3 (N-Choice Interactive Prompt Selector):
 * Generates N distinct optimized prompt candidates according to `promptSlots` (defaulting to Concise, Spec, Deep)
 * so the user can pick the best one via interactive selector.
 */
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

  const activeSlots = (Array.isArray(cfg.promptSlots) && cfg.promptSlots.length > 0
    ? cfg.promptSlots
    : getDefaultPromptSlots(cfg.sourceLang)
  ).filter((s) => s.enabled !== false);

  const slots = activeSlots.length > 0 ? activeSlots : getDefaultPromptSlots(cfg.sourceLang);
  const sysPrompt = buildPromptCandidatesSystemPrompt({
    sourceLang: cfg.sourceLang,
    targetLang: cfg.targetLang,
    promptLang: cfg.promptLang,
    promptRule: cfg.promptRule,
    promptSlots: slots,
  });

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
    let raw: string | null = null;
    if (typeof cfg.complete === "function") {
      raw = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: trimmed },
          ],
          temperature: cfg.temperature,
        }),
        signal: controller.signal,
      });
      if (response.ok) {
        const json = (await response.json()) as any;
        raw = json?.choices?.[0]?.message?.content ?? null;
      }
    }

    if (typeof raw !== "string" || !raw.trim()) return null;

    const obj = repairAndParseJsonObject(raw);
    if (!obj) return null;

    const candidates: PromptCandidate[] = [];
    for (const slot of slots) {
      const val = obj[slot.id];
      if (typeof val === "string" && val.trim()) {
        candidates.push({
          id: slot.id,
          label: slot.label,
          content: val.trim(),
        });
      }
    }

    return candidates.length > 0 ? candidates : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mode 4 (`off` Mode Active 0-Token Context Shield):
 * Physically strips `<skill>...<name>lingual-tuner</name>...</skill>` from `systemPrompt` when `mode === "off"`
 * (unless the user explicitly mentions `lingual` or `伴学` to re-configure it), guaranteeing 0.00 bytes of LLM context overhead.
 */
export function stripLingualContextWhenOff(systemPrompt: string, lastUserText = ""): string {
  if (!systemPrompt) return systemPrompt;
  if (/(?:lingual|伴学|槽位)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt.replace(
    /\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi,
    ""
  );
}

export const CURRENT_FEATURE_BANNER_VERSION = "0.5.0";

/**
 * Resolve the exact language for the release banner:
 * 1. If the user explicitly chose a native language (`diskConfig.sourceLang` via `/lang`), use it 100% deterministically.
 * 2. Otherwise inspect OS locale (`Intl.DateTimeFormat().resolvedOptions().locale`); if unrecognized, fall back to universal English (`"en"`).
 */
export function resolveReleaseBannerLang(explicitSourceLang?: string): string {
  const supported = new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);
  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    if (supported.has(clean)) return clean;
    return "en";
  }
  try {
    const sysLocale = (Intl.DateTimeFormat().resolvedOptions().locale || process.env.LANG || "en").toLowerCase();
    if (sysLocale.startsWith("zh-tw") || sysLocale.startsWith("zh-hk")) return "tw";
    const prefix = sysLocale.split(/[-_.]/)[0];
    if (supported.has(prefix)) return prefix;
  } catch {}
  return "en";
}

interface BannerEntry {
  main: string;
  detail: string;
}

/**
 * Render a one-time plain, emoji-free localized "What's New in v0.5.0" feature card above the editor (`aboveEditor`)
 * with concrete operational details in parentheses.
 */
export function formatReleaseBannerLines(
  sourceLang = "en",
  maxCols = 96,
  fg: (color: string, text: string) => string = (_c, t) => t
): string[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];

  const copyByLang: Record<string, { title: string; entries: [BannerEntry, BannerEntry, BannerEntry, BannerEntry] }> = {
    zh: {
      title: "· [pi-lingual v0.5.0 更新说明] (发送任意消息后自动收起)",
      entries: [
        {
          main: "┌ [english 模式升级] 从单纯翻译升级为「提示词规范化重写」：先将杂乱口语提炼为结构化指令再发给 AI",
          detail: "│                    (通过 /lingual english 开启；默认输出英文，可设 promptLang: \"native\" 保持母语或叠加 promptRule 规范)",
        },
        {
          main: "├ [新增 select 模式] 支持「多风格候选选择」：一次生成 极简高效 / 结构规范 / 深度严谨 3 个候选，弹窗挑一个发送",
          detail: "│                    (通过 /lingual select 开启；按回车选 [1]~[3] 替换发送，选 [0] 或按 Esc 则保持原话直发)",
        },
        {
          main: "├ [双模式自由定制]   伴学与提示词重写支持独立定制：直接用自然语言让当前 AI 修改槽位数量、输出语言或候选风格",
          detail: "│                    (内置 lingual-tuner 技能索引；直接对 AI 说“把提示词重写设为母语并加上最小改动要求”即可自动写入 lingual.json)",
        },
        {
          main: "└ [off 模式零上下文] 彻底关闭时不留隐性负担：除停止输入拦截外，每次请求前主动从系统提示词中移除自身技能说明",
          detail: "                     (通过 /lingual off 开启；由 before_agent_start 钩子剥离 lingual-tuner 块，实现 0 Token 占用)",
        },
      ],
    },
    tw: {
      title: "· [pi-lingual v0.5.0 更新說明] (發送任意訊息後自動收起)",
      entries: [
        {
          main: "┌ [english 模式升級] 從單純翻譯升級為「提示詞規範化重寫」：先將雜亂口語提煉為結構化指令再發給 AI",
          detail: "│                    (透過 /lingual english 開啟；預設輸出英文，可設 promptLang: \"native\" 保持母語或疊加 promptRule 規範)",
        },
        {
          main: "├ [新增 select 模式] 支援「多風格候選選擇」：一次生成 極簡高效 / 結構規範 / 深度嚴謹 3 個候選，彈窗挑一個發送",
          detail: "│                    (透過 /lingual select 開啟；按 Enter 選 [1]~[3] 替換發送，選 [0] 或按 Esc 則保持原話直發)",
        },
        {
          main: "├ [雙模式自由定制]   伴學與提示詞重寫支援獨立定制：直接用自然語言讓當前 AI 修改槽位數量、輸出語言或候選風格",
          detail: "│                    (內建 lingual-tuner 技能索引；直接對 AI 說「把提示詞重寫設為母語並加上最小改動要求」即可自動寫入 lingual.json)",
        },
        {
          main: "└ [off 模式零上下文] 徹底關閉時不留隱性負擔：除停止輸入攔截外，每次請求前主動從系統提示詞中移除自身技能說明",
          detail: "                     (透過 /lingual off 開啟；由 before_agent_start 鉤子剝離 lingual-tuner 區塊，實現 0 Token 佔用)",
        },
      ],
    },
    ja: {
      title: "· [pi-lingual v0.5.0 更新内容] (任意のメッセージを送信すると自動的に閉じます)",
      entries: [
        {
          main: "┌ [english モード刷新] 単なる翻訳から「プロンプト構造化・最適化」へ進化：曖昧な口語を整理して AI へ送信",
          detail: "│                      (/lingual english で有効化；既定は英語出力、promptLang: \"native\" で母語出力や promptRule 規約追加に対応)",
        },
        {
          main: "├ [select モード追加]  「複数スタイル候補選択」に対応：簡潔・構造化・厳密の 3 候補を生成し、選んで送信",
          detail: "│                      (/lingual select で有効化；[1]~[3] で置換送信、[0] または Esc キーで原文のまま送信)",
        },
        {
          main: "├ [2モード自在調整]    語学伴走とプロンプト最適化を個別に設定可能：現在の AI に自然言語で伝えるだけで即座に反映",
          detail: "│                      (lingual-tuner スキル索引を内蔵；「プロンプト最適化を母語出力にして最小変更原則を追加して」と伝えるだけで lingual.json を自動更新)",
        },
        {
          main: "└ [off モード負荷ゼロ] 停止時は入力フック解除に加え、システムプロンプトから自身のスキル定義も自動的に除去",
          detail: "                       (/lingual off で有効化；before_agent_start フックで lingual-tuner ブロックを除去し 0 Token を実現)",
        },
      ],
    },
    ko: {
      title: "· [pi-lingual v0.5.0 업데이트 안내] (메시지 입력 시 자동으로 닫힙니다)",
      entries: [
        {
          main: "┌ [english 모드 업그레이드] 단순 번역에서 '프롬프트 구조화 재작성'으로 진화: 구어체 입력을 체계적인 지시문으로 최적화",
          detail: "│                           (/lingual english 로 활성화; 기본 영어 출력, promptLang: \"native\" 모국어 유지 및 promptRule 규칙 추가 지원)",
        },
        {
          main: "├ [select 모드 추가]        '다중 스타일 후보 선택' 지원: 간결/구조화/심층 3가지 후보를 생성하여 선택 전송",
          detail: "│                           (/lingual select 로 활성화; [1]~[3] 선택 시 변환 전송, [0] 또는 Esc 입력 시 원문 그대로 전송)",
        },
        {
          main: "├ [듀얼 모드 자유 커스텀]   학습 슬롯과 프롬프트 최적화를 자연어로 설정: 현재 AI에게 말하면 설정 파일 즉시 반영",
          detail: "│                           (lingual-tuner 스킬 색인 내장; AI에게 \"프롬프트 재작성을 모국어로 설정하고 최소 변경 원칙을 추가해줘\"라고 말하면 lingual.json 자동 수정)",
        },
        {
          main: "└ [off 모드 제로 컨텍스트]  종료 시 입력 후크 해제뿐만 아니라 시스템 프롬프트에서 자체 스킬 설명까지 능동적으로 제거",
          detail: "                            (/lingual off 로 활성화; before_agent_start 후크가 lingual-tuner 블록을 분리하여 0 Token 달성)",
        },
      ],
    },
    en: {
      title: "· [pi-lingual v0.5.0 Release Notes] (auto-closes on your next message)",
      entries: [
        {
          main: "┌ [english Mode Upgraded] Evolved from literal translation into Direct Prompt Rewrite: structures messy input before sending",
          detail: "│                         (Enable via /lingual english; defaults to English, or set promptLang: \"native\" and stack custom promptRule constraints)",
        },
        {
          main: "├ [New select Mode]       Added N-Choice Prompt Picker: generates Concise / Structured / Deep Rigor candidates to choose from",
          detail: "│                         (Enable via /lingual select; pick [1]~[3] to send optimized prompt, or [0] / Esc to send original text)",
        },
        {
          main: "├ [Dual-Engine Freedom]   Customize Companion Mode or Prompt Optimizer independently by talking to your current Agent",
          detail: "│                         (Indexed in lingual-tuner skill; tell your Agent \"Set prompt rewrite to my native language and enforce minimal diff\" to update lingual.json)",
        },
        {
          main: "└ [Zero-Context off Mode] Turning off leaves zero hidden burden: stops input hooks and strips its own skill block from system prompt",
          detail: "                          (Enable via /lingual off; before_agent_start hook removes the lingual-tuner block for 0-token overhead)",
        },
      ],
    },
  };

  const c = copyByLang[norm] || copyByLang.en;
  const lines: string[] = [truncateVisual(`  ${fg("accent", c.title)}`, maxCols)];
  for (const entry of c.entries) {
    lines.push(truncateVisual(`  ${fg("muted", entry.main)}`, maxCols));
    lines.push(truncateVisual(`  ${fg("dim", entry.detail)}`, maxCols));
  }
  return lines;
}
