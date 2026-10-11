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
    process.argv.some((a) => a === "--test" || a.startsWith("--test=") || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(a)) ||
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

export const CURRENT_FEATURE_BANNER_VERSION = "0.5.2";

/**
 * 4-Stage Multi-Probe Native Language Resolution for the In-Pi Release Banner:
 * 1. Explicit `sourceLang` persisted in `~/.pi/agent/lingual.json` (highest priority).
 * 2. Recent user message script inspection from `ctx.sessionManager.getEntries()` or `~/.config/rpiv-i18n/config.json`.
 * 3. Host OS & shell locale (`LC_ALL`, `LANGUAGE`, `LANG`, `Intl.DateTimeFormat().resolvedOptions().locale`).
 * 4. Safe fallback to universal English (`"en"`).
 */
export function resolveReleaseBannerLang(explicitSourceLang?: string, sessionEntries?: any[]): string {
  const supported = new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);

  // Probe 1: Explicit user config in lingual.json
  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    if (supported.has(clean)) return clean;
    return "en";
  }

  // Probe 2: Recent user messages in the active Pi session (if any)
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

  // Probe 2b: Check rpiv-i18n config if present on disk
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

  // Probe 3: OS & environment locale
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

  // Probe 4: Universal English fallback
  return "en";
}

interface BannerSpec {
  title: string;
  apology: string;
  rows: [string, string, string, string, string, string];
}

/**
 * Render a one-time plain, grounded, emoji-free "What's New in v0.5.2" card above the editor (`aboveEditor`).
 * Covers all 9 supported languages (`zh`, `tw`, `ja`, `ko`, `es`, `fr`, `de`, `ru`, `en`).
 * Every line is strictly bounded within 78 visual columns so zero text is ever truncated on 80-col terminals.
 */
export function formatReleaseBannerLines(
  sourceLang = "en",
  maxCols = 80,
  fg: (color: string, text: string) => string = (_c, t) => t
): string[] {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const effectiveCols = Math.max(80, maxCols);

  const copyByLang: Record<string, BannerSpec> = {
    zh: {
      title: "· [pi-lingual v0.5.2 更新说明] 不同心境下的权重平衡 (发消息自动收起)",
      apology: "│ 抱歉连发了几个 0.5 小版本：刚用多语言沙箱实测修好了母语识别与窄屏截断",
      rows: [
        "┌ [english 重写模式] 思路乱时，先把零散口语理顺为清晰工程指令再发给 AI",
        "│   (敲 /lingual english 切换；可设 promptLang:\"native\" 保母语或叠规范)",
        "├ [select 候选模式]  一次给出 极简高效 / 结构规范 / 深度严谨 3 种写法供挑选",
        "│   (敲 /lingual select 切换；回车选 [1]~[3] 发送，选 [0] 或 Esc 保原话)",
        "├ [自然语言顺手定制] 直接对 AI 说“把提示词重写设为母语并加最小改动”即可生效",
        "└ [off 模式彻底净空] /lingual off 停用拦截并由钩子剥离技能块 (0 Token 负担)",
      ],
    },
    tw: {
      title: "· [pi-lingual v0.5.2 更新說明] 不同心境下的權重平衡 (發訊息自動收起)",
      apology: "│ 抱歉連發了幾個 0.5 小版本：剛用多語言沙箱實測修好了母語識別與窄屏截斷",
      rows: [
        "┌ [english 重寫模式] 思路亂時，先把零散口語理順為清晰工程指令再發給 AI",
        "│   (敲 /lingual english 切換；可設 promptLang:\"native\" 保母語或疊規範)",
        "├ [select 候選模式]  一次給出 極簡高效 / 結構規範 / 深度嚴謹 3 種寫法供挑選",
        "│   (敲 /lingual select 切換；按 Enter 選 [1]~[3] 發送，[0] 或 Esc 保原話)",
        "├ [自然語言順手定制] 直接對 AI 說「把提示詞重寫設為母語並加最小改動」即可生效",
        "└ [off 模式徹底淨空] /lingual off 停用攔截並由鉤子剝離技能塊 (0 Token 負擔)",
      ],
    },
    ja: {
      title: "· [pi-lingual v0.5.2 更新案内] 4モード構成 (送信で閉じる)",
      apology: "│ 0.5系の連続更新をお詫びします：各言語の通知判定と表示切れを修正",
      rows: [
        "┌ [english 刷新] 考えが纏まらない時、口語を明快な技術指示へ整理送信",
        "│   (/lingual english 切替 · promptLang:\"native\" 母語維持や規約追加)",
        "├ [select 追加]  簡潔・構造化・厳密の 3 候補を並べて選んで送信",
        "│   (/lingual select 切替 · [1]~[3] 送信、[0] / Esc で原文のまま)",
        "├ [自然言語調整] AI に「プロンプト最適化を母語にして最小変更追加」で反映",
        "└ [off 負荷ゼロ] /lingual off でフック停止＋スキル定義も除去 (0 Tok)",
      ],
    },
    ko: {
      title: "· [pi-lingual v0.5.2 업데이트] 4가지 모드 (입력 시 닫힘)",
      apology: "│ 0.5 버전의 잦은 업데이트를 사과드립니다: 다국어 감지 및 줄 잘림 수정",
      rows: [
        "┌ [english 개편] 생각이 복잡할 때 구어체를 명확한 지시문으로 다듬어 전송",
        "│   (/lingual english 전환 · promptLang:\"native\" 모국어 및 규칙 추가)",
        "├ [select 추가]  간결/구조화/심층 3가지 후보를 보고 원하는 표현을 선택",
        "│   (/lingual select 전환 · [1]~[3] 전송, [0] / Esc 원문 그대로 전송)",
        "├ [자연어 설정]  AI에게 \"프롬프트 재작성을 모국어로 설정해줘\"로 반영",
        "└ [off 제로부담] /lingual off 시 입력 후크 해제 및 스킬 제거 (0 Tok)",
      ],
    },
    es: {
      title: "· [Novedades pi-lingual v0.5.2] 4 modos para tu flujo (se cierra al enviar)",
      apology: "│ Disculpas por los parches 0.5.x: corregimos el idioma nativo del aviso",
      rows: [
        "┌ [Modo english] Reescribe ideas confusas en instrucciones claras al enviar",
        "│   (Usa /lingual english; admite promptLang:\"native\" y reglas promptRule)",
        "├ [Modo select]  Genera 3 candidatos (Conciso / Estructurado / Profundo)",
        "│   (Usa /lingual select; elige [1]~[3] o pulsa [0] / Esc para el original)",
        "├ [Ajuste libre] Pide al Agente: \"Pon reescritura en mi idioma + diff mínimo\"",
        "└ [Modo off 0-Tok] /lingual off detiene hooks y quita el skill (0 tokens)",
      ],
    },
    fr: {
      title: "· [Nouveautés pi-lingual v0.5.2] 4 modes à votre rythme (fermé à l'envoi)",
      apology: "│ Désolé pour les patchs 0.5.x rapides : détection de langue corrigée ici",
      rows: [
        "┌ [Mode english] Structure vos idées brouillonnes en instructions claires",
        "│   (Via /lingual english ; option promptLang:\"native\" et règles promptRule)",
        "├ [Mode select]  Génère 3 candidats (Concis / Structuré / Approfondi)",
        "│   (Via /lingual select ; [1]~[3] pour envoyer, [0] ou Esc pour l'original)",
        "├ [Réglage libre] Dites à l'Agent : \"Mets la réécriture dans ma langue\"",
        "└ [Mode off 0-Tok] /lingual off coupe les hooks et retire le skill (0 token)",
      ],
    },
    de: {
      title: "· [pi-lingual v0.5.2 Update] 4 Modi für Ihren Workflow (schließt bei Eingabe)",
      apology: "│ Entschuldigung für die 0.5.x Patches: Spracherkennung im Banner behoben",
      rows: [
        "┌ [english-Modus] Strukturiert unklare Gedanken vor dem Senden in Prompts",
        "│   (Per /lingual english; unterstützt promptLang:\"native\" & promptRule)",
        "├ [select-Modus]  Erzeugt 3 Vorschläge (Prägnant / Strukturiert / Tief)",
        "│   (Per /lingual select; [1]~[3] senden, [0] oder Esc behält Originaltext)",
        "├ [Freie Anpassung] Sagen Sie dem Agenten: \"Rewrite auf Muttersprache setzen\"",
        "└ [off-Modus 0-Tok] /lingual off stoppt Hooks & entfernt Skill-Block (0 Tok)",
      ],
    },
    ru: {
      title: "· [Обновление pi-lingual v0.5.2] 4 режима работы (закроется при вводе)",
      apology: "│ Извините за серию патчей 0.5.x: исправлено определение родного языка",
      rows: [
        "┌ [Режим english] Превращает черновой ввод в четкую инструкцию для ИИ",
        "│   (Через /lingual english; поддержка promptLang:\"native\" и promptRule)",
        "├ [Режим select]  Генерирует 3 варианта (Краткий / Структурный / Глубокий)",
        "│   (Через /lingual select; [1]~[3] отправить, [0] или Esc — оригинал)",
        "├ [Гибкая настройка] Скажите Агенту: \"Поставь перезапись на родной язык\"",
        "└ [Режим off 0-Tok] /lingual off отключает хуки и удаляет skill (0 токенов)",
      ],
    },
    en: {
      title: "· [pi-lingual v0.5.2 Release Notes] 4 modes for your flow (closes on input)",
      apology: "│ Sorry for the rapid 0.5.x patches — fixed native language banner & width",
      rows: [
        "┌ [english Mode] Structures messy phrasing into a clear engineering prompt",
        "│   (Via /lingual english; supports promptLang:\"native\" & custom promptRule)",
        "├ [select Mode]  Generates Concise / Structured / Deep candidates to pick",
        "│   (Via /lingual select; pick [1]~[3] to send, or [0] / Esc for original)",
        "├ [Easy Tuning]  Tell your Agent \"Set prompt rewrite to native + minimal diff\"",
        "└ [off 0-Token]  /lingual off stops hooks & strips skill block (0-token load)",
      ],
    },
  };

  const c = copyByLang[norm] || copyByLang.en;
  return [
    truncateVisual(`  ${fg("accent", c.title)}`, effectiveCols),
    truncateVisual(`  ${fg("dim", c.apology)}`, effectiveCols),
    truncateVisual(`  ${fg("muted", c.rows[0])}`, effectiveCols),
    truncateVisual(`  ${fg("dim", c.rows[1])}`, effectiveCols),
    truncateVisual(`  ${fg("muted", c.rows[2])}`, effectiveCols),
    truncateVisual(`  ${fg("dim", c.rows[3])}`, effectiveCols),
    truncateVisual(`  ${fg("muted", c.rows[4])}`, effectiveCols),
    truncateVisual(`  ${fg("muted", c.rows[5])}`, effectiveCols),
  ];
}
