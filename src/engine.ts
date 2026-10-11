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
  normalizePromptRules,
  PROMPT_RULE_PRESETS,
  resolvePromptRulePreset,
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
    const promptRule =
      typeof target.promptRule === "string"
        ? target.promptRule
        : Array.isArray(target.promptRule)
          ? target.promptRule.map((r: any) => String(r || "").trim()).filter(Boolean)
          : undefined;
    const promptSlots = Array.isArray(target.promptSlots)
      ? target.promptSlots.filter((s: any) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string")
      : undefined;
    const learnInRewrite = target.learnInRewrite !== undefined ? Boolean(target.learnInRewrite) : undefined;
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
      ...(learnInRewrite !== undefined ? { learnInRewrite } : {}),
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
  normalizePromptRules,
  PROMPT_RULE_PRESETS,
  resolvePromptRulePreset,
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
export async function rewritePromptDirectWithDetails(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<{ prompt: string; vocab?: string } | null> {
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
    learnInRewrite: Boolean(cfg.learnInRewrite),
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
    const rewritten = (obj && typeof obj.prompt === "string" && obj.prompt.trim())
      ? obj.prompt.trim()
      : extractCleanJsonField(raw, "prompt");
    if (!rewritten) return null;
    const vocab = obj && typeof obj.vocab === "string" && obj.vocab.trim() ? obj.vocab.trim() : undefined;
    return { prompt: rewritten, ...(vocab ? { vocab } : {}) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function rewritePromptDirect(
  text: string,
  userConfig: Partial<LingualConfig> = {}
): Promise<string | null> {
  const res = await rewritePromptDirectWithDetails(text, userConfig);
  return res ? res.prompt : null;
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
    learnInRewrite: Boolean(cfg.learnInRewrite),
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

    const extractedVocab = typeof obj.vocab === "string" && obj.vocab.trim() ? obj.vocab.trim() : undefined;
    const candidates: PromptCandidate[] = [];
    for (const slot of slots) {
      const val = obj[slot.id];
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * On-Demand Tuner Skill Gate (`stripLingualContextWhenOff`):
 * Physically strips `<skill>...<name>lingual-tuner</name>...</skill>` from `systemPrompt` on normal turns
 * across ALL modes, keeping it ONLY when the user explicitly invokes `/lingual tuner` (`tunerArmed === true`)
 * or explicitly asks to tune `pi-lingual`. Guarantees 0.00 bytes of LLM context overhead during normal coding.
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

export const CURRENT_FEATURE_BANNER_VERSION = "0.5.3";

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
      title: "· [pi-lingual v0.5.3 更新说明] 清晰四态与零负担关闭 (发消息自动收起)",
      apology: "│ 抱歉连发了几个 0.5 小版本：这次理清了模式命名，并把 off 做到彻底无感",
      rows: [
        "┌ [1 原文+伴学]   原话 0ms 直发 + 上方浮现双语伴学卡 (/lingual 1 或循环)",
        "│ [2 直出改写]   按目标文字 + 多个设定条件直接改写发送 (/lingual 2 切换)",
        "├ [3 候选挑一]   按多组设定条件生成 N 个候选弹窗挑一发送 (/lingual 3 切换)",
        "│   (敲 /lingual 循环 1➔2➔3➔0；/lingual learn-on 可在改写时顺带提取重点词)",
        "├ [按需唤醒定制] 平时 0 技能块注入；敲 /lingual tuner <需求> 按需唤醒配置",
        "└ [0 彻底无负担] /lingual off 隐藏底栏、停监听、剥离技能块 (0像素 0Token)",
      ],
    },
    tw: {
      title: "· [pi-lingual v0.5.3 更新說明] 清晰四態與零負擔關閉 (發訊息自動收起)",
      apology: "│ 抱歉連發了幾個 0.5 小版本：這次理清了模式命名，並把 off 做到徹底無感",
      rows: [
        "┌ [1 原文+伴學]   原話 0ms 直發 + 上方浮現雙語伴學卡 (/lingual 1 或循環)",
        "│ [2 直出改寫]   按目標文字 + 多個設定條件直接改寫發送 (/lingual 2 切換)",
        "├ [3 候選挑一]   按多組設定條件生成 N 個候選彈窗挑一發送 (/lingual 3 切換)",
        "│   (敲 /lingual 循環 1➔2➔3➔0；/lingual learn-on 可在改寫時順帶提取重點詞)",
        "├ [按需喚醒定制] 平時 0 技能塊注入；敲 /lingual tuner <需求> 按需喚醒配置",
        "└ [0 徹底無負擔] /lingual off 隱藏底欄、停監聽、剝離技能塊 (0像素 0Token)",
      ],
    },
    ja: {
      title: "· [pi-lingual v0.5.3 更新案内] 4状態整理と完全ゼロ負荷 (送信で閉じる)",
      apology: "│ 0.5系の連続更新をお詫びします：モード名を整理し off を完全無負荷化",
      rows: [
        "┌ [1 原文+学習]  原文0ms送信＋上部に学習カード表示 (/lingual 1 または順送)",
        "│ [2 直出改稿]  目標言語＋複数条件で直接書き換えて送信 (/lingual 2 切替)",
        "├ [3 候補選択]  複数条件で N 個の候補を生成し選んで送信 (/lingual 3 切替)",
        "│   (/lingual で 1➔2➔3➔0 循環 · /lingual learn-on で改稿時も重要語抽出)",
        "├ [オンデマンド] 通常時スキル注入ゼロ · /lingual tuner <要望> で設定起動",
        "└ [0 完全ゼロ化] /lingual off で下部バー非表示・監視停止・0 Token 負荷",
      ],
    },
    ko: {
      title: "· [pi-lingual v0.5.3 업데이트] 4단계 정리 및 완전 무부담 (입력 시 닫힘)",
      apology: "│ 0.5 버전의 잦은 업데이트를 사과드립니다: 모드 정리 및 off 완전 무부담화",
      rows: [
        "┌ [1 원문+학습]  원문 0ms 전송 + 상단 학습 카드 표시 (/lingual 1 또는 순환)",
        "│ [2 직출개작]   목표 언어 + 복수 조건으로 즉시 다듬어 전송 (/lingual 2)",
        "├ [3 후보선택]   다중 조건으로 N개 후보 생성 후 골라서 전송 (/lingual 3)",
        "│   (/lingual 입력 시 1➔2➔3➔0 순환 · /lingual learn-on 으로 어휘 병행)",
        "├ [맞춤 설정]    평소 스킬 주입 0 · /lingual tuner <요청> 시에만 설정 기동",
        "└ [0 완전무부담] /lingual off 시 하단바 숨김·감시 해제·스킬 제거 (0 Tok)",
      ],
    },
    es: {
      title: "· [pi-lingual v0.5.3] 4 estados y modo off sin carga (cierra al enviar)",
      apology: "│ Disculpas por los parches 0.5.x: aclaramos modos y off es 100% limpio",
      rows: [
        "┌ [1 Orig+Aprender] Envía 0ms + tarjeta arriba (/lingual 1 o en ciclo)",
        "│ [2 Reescritura]   Idioma meta + condiciones ➔ envío 1a1 (/lingual 2)",
        "├ [3 Elegir N]      Idioma meta + N estilos ➔ menú elegir (/lingual 3)",
        "│   (Cicla 1➔2➔3➔0 con /lingual; /lingual learn-on extrae vocabulario)",
        "├ [Tuner a demanda] 0 tokens en prompt normal; usa /lingual tuner <req>",
        "└ [0 Off Cero-Carga] /lingual off oculta barra, quita hooks y 0 tokens",
      ],
    },
    fr: {
      title: "· [pi-lingual v0.5.3] 4 états clairs et off zéro charge (fermé à l'envoi)",
      apology: "│ Désolé pour les patchs 0.5.x : modes clarifiés et off 100% invisible",
      rows: [
        "┌ [1 Orig+Étude]    Envoi 0ms + carte d'étude (/lingual 1 ou en cycle)",
        "│ [2 Réécriture]    Langue cible + conditions ➔ envoi 1à1 (/lingual 2)",
        "├ [3 Choix N]       Langue cible + N styles ➔ menu choix (/lingual 3)",
        "│   (Cyclez 1➔2➔3➔0 via /lingual ; /lingual learn-on extrait le vocab)",
        "├ [Tuner à demande] 0 token normal ; tapez /lingual tuner <besoin>",
        "└ [0 Off Invisible] /lingual off masque barre, coupe hooks et 0 token",
      ],
    },
    de: {
      title: "· [pi-lingual v0.5.3] 4 klare Modi & Null-Last in Off (schließt bei Senden)",
      apology: "│ Entschuldigung für die 0.5.x Patches: Modi klar & off 100% unsichtbar",
      rows: [
        "┌ [1 Orig+Lernen]   0ms Senden + Lernkarte oben (/lingual 1 oder Zyklus)",
        "│ [2 Direkt-Rewrite] Zielsprache + Bedingungen ➔ direkt (/lingual 2)",
        "├ [3 N-Auswahl]     Zielsprache + N Stile ➔ Auswahlmenü (/lingual 3)",
        "│   (/lingual wechselt 1➔2➔3➔0; /lingual learn-on zeigt Vokabel-Zeile)",
        "├ [On-Demand Tuner] 0 Skill-Tokens im Alltag; /lingual tuner <Wunsch>",
        "└ [0 Off Null-Last] /lingual off blendet Leiste aus, 0 Hooks & 0 Tok",
      ],
    },
    ru: {
      title: "· [pi-lingual v0.5.3] 4 четких режима и ноль нагрузки в off",
      apology: "│ Извините за патчи 0.5.x: уточнили режимы и сделали off невидимым",
      rows: [
        "┌ [1 Ориг+Учеба]    Отправка 0мс + карточка сверху (/lingual 1 / цикл)",
        "│ [2 Прямой рерайт] Язык цели + условия ➔ отправка 1к1 (/lingual 2)",
        "├ [3 Выбор из N]    Язык цели + N стилей ➔ меню выбора (/lingual 3)",
        "│   (/lingual листает 1➔2➔3➔0; /lingual learn-on добавляет словарь)",
        "├ [Tuner по запросу] 0 токенов обычно; вызывайте /lingual tuner <запрос>",
        "└ [0 Off Без следа] /lingual off скрывает строку, 0 хуков и 0 токенов",
      ],
    },
    en: {
      title: "· [pi-lingual v0.5.3] Clear 4-State Flow & Zero-Load Off (closes on send)",
      apology: "│ Sorry for the 0.5.x patches — clarified mode names & off is 100% clean",
      rows: [
        "┌ [1 Orig+Learn]    0ms raw send + learning card above (/lingual 1 / cycle)",
        "│ [2 Direct Rewrite] Target lang + conditions ➔ 1-to-1 send (/lingual 2)",
        "├ [3 Pick of N]     Target lang + N style slots ➔ popup picker (/lingual 3)",
        "│   (Cycle 1➔2➔3➔0 via /lingual; /lingual learn-on adds 1-line vocab row)",
        "├ [On-Demand Tuner] 0 skill tokens by default; run /lingual tuner <request>",
        "└ [0 Zero-Load Off] /lingual off hides status bar, detaches hooks & 0 tok",
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
