/**
 * Code & Shell Pass-through Shield (0ms Fast Bypass).
 * 
 * Developers frequently enter CLI commands, paste code blocks, or data structures.
 * Performs fast sniffing to bypass translation with 0ms latency and 0 token burn.
 */

// Common CLI command prefixes (line-start matched)
const SHELL_COMMAND_PREFIXES = [
  "git ", "npm ", "pnpm ", "yarn ", "bun ", "cargo ", "rustc ",
  "go ", "python ", "python3 ", "pip ", "node ", "deno ",
  "docker ", "podman ", "kubectl ", "helm ",
  "make ", "cmake ", "ninja ", "gcc ", "g++ ", "clang ",
  "cd ", "ls ", "dir ", "cat ", "type ", "rm ", "cp ", "mv ",
  "mkdir ", "chmod ", "chown ", "curl ", "wget ", "ssh ", "scp ",
  "grep ", "find ", "ps ", "kill ", "echo ", "export ", "set ",
  "typst ", "ffmpeg ", "yt-dlp ", "npx ", "tar ", "zip ", "unzip "
];

// Top-level statements across major programming languages
const CODE_STATEMENT_REGEX = /^(?:const|let|var|function|def|class|import|export|package|namespace|using|public|private|protected|fn|pub fn|impl|struct|enum|interface|type)\s+/;

// Top-level SQL statement keywords
const SQL_STATEMENT_REGEX = /^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+/i;

/**
 * Check if the text contains non-English natural language scripts (CJK, accented Latin, Cyrillic, etc.)
 * Strictly avoids triggering on pure emojis, typographical quotes, or terminal commands.
 */
export function isNonEnglish(text: string): boolean {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}

/**
 * Determines whether input text is a pure code block, shell command, or data structure that should bypass translation in 0ms.
 */
export function shouldShieldBypass(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // 1. Markdown code fences (starting with ```)
  if (trimmed.startsWith("```")) {
    // If text outside code fences contains natural technical questions or instructions, do not bypass
    const withoutCodeFence = trimmed.replace(/```[\s\S]*?```/g, "").trim();
    if (withoutCodeFence && (/[?？]/.test(withoutCodeFence) || /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix)/i.test(withoutCodeFence))) {
      return false;
    }
    return true;
  }

  // 2. Closed JSON objects or arrays
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    // Basic verification for structural JSON characters
    if (trimmed.includes(":") || trimmed.includes(",")) {
      return true;
    }
  }

  // 3. Shell CLI command detection (e.g. git status, npm test, cargo run)
  const lower = trimmed.toLowerCase();
  for (const prefix of SHELL_COMMAND_PREFIXES) {
    if (lower.startsWith(prefix)) {
      // If prompt contains question marks or inquiry keywords, treat as natural language question
      if (/[?？]/.test(trimmed) || /(?:为什么|怎么|如何|报错|为何|explain|why|how)/i.test(trimmed)) {
        return false;
      }

      // If prompt contains no CJK natural language characters, strictly treat as pure CLI command
      if (!/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed)) {
        return true;
      }

      // Even with non-English characters, commit/tag messages with -m flags bypass
      if (/^git\s+(?:commit|tag)\s+.*-m\s+["'].*["']/i.test(trimmed)) {
        return true;
      }
    }
  }

  // 4. Pure single-line code statements without natural language commentary
  if (CODE_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("？") && !trimmed.includes("?")) {
    // Pure code definition without conversational markers
    if (!/[\u4e00-\u9fa5]/.test(trimmed) || /^[a-zA-Z0-9_\s<>{}\[\]();:=,"'.]+$/.test(trimmed)) {
      return true;
    }
  }

  // 5. Pure SQL queries
  if (SQL_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("？") && !trimmed.includes("?")) {
    return true;
  }

  // 6. Local Data Loss Prevention (DLP) & Secret Shield:
  // Intercept and bypass sensitive credentials locally to prevent leaking secrets to LLMs
  const SECRET_PATTERNS = [
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/i,
    /(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]{20}|AKIA[0-9A-Z]{16})/,
    /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  ];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // 7. Pure file paths, session UUIDs, or raw URLs without technical questions (0ms bypass)
  const isPurePathOrUrl = /^(?:[a-zA-Z]:[\\\/][^\s\r\n]+|\/(?:[a-zA-Z0-9_.-]+[\\\/])+[^\s\r\n]+|https?:\/\/[^\s\r\n]+)$/i.test(trimmed);
  const isPureUuidOrSession = /^(?:(?:session|id|uuid)[\s:=]*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.jsonl)?$/i.test(trimmed);
  if ((isPurePathOrUrl || isPureUuidOrSession) && !isNonEnglish(trimmed) && !/[?？]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Checks if the text contains script characters native to the configured source language.
 */
export function hasSourceScript(text: string, sourceLang: string): boolean {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  switch (norm) {
    case "zh":
    case "tw":
      return /[\u4e00-\u9fa5]/.test(text);
    case "ja":
      return /[\u3040-\u30ff\u4e00-\u9fa5]/.test(text);
    case "ko":
      return /[\uac00-\ud7af]/.test(text);
    case "ru":
      return /[\u0400-\u04ff]/.test(text);
    case "es":
    case "fr":
    case "de":
      return /[\u00c0-\u024f]/.test(text);
    default:
      return /[a-zA-Z]/.test(text);
  }
}

/**
 * Common active imperative engineering verbs for spec and coding instructions.
 */
const IMPERATIVE_ENGINEERING_VERBS = new Set([
  "fix", "add", "refactor", "update", "remove", "delete", "implement", "replace",
  "clean", "create", "optimize", "ensure", "extract", "handle", "support", "use",
  "simplify", "upgrade", "allow", "block", "prevent", "enable", "disable", "init",
  "setup", "test", "verify", "pass", "return", "build", "compile", "sync", "drop",
  "bump", "revert", "merge", "format", "render", "export", "import", "align",
  "isolate", "clamp", "clampvisual", "truncate", "resolve", "settle", "dispatch"
]);

/**
 * Determines whether text is already written directly in the target language (e.g. English).
 * When sourceLang is CJK or Cyrillic and input contains 0 native characters but >= 2 English words,
 * the developer is already authoring fluently in the target language.
 * Latin-to-Latin pairs (e.g. es, fr, de -> en) never bypass here to prevent false positives on unaccented text.
 */
export function isTargetLanguageOnly(
  text: string,
  sourceLang: string,
  targetLang = "en"
): boolean {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];

  if (normTarget === "en") {
    // Target-language auto-bypass is strictly for non-Latin source scripts (CJK & Cyrillic)
    // where character script boundaries are 100% deterministic.
    const NON_LATIN_SOURCES = new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
    if (!NON_LATIN_SOURCES.has(normSource)) {
      return false;
    }

    if (hasSourceScript(text, normSource)) {
      return false;
    }
    const words = text.trim().split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
    return words.length >= 2;
  }

  // Non-English target language verification
  if (normTarget === "ja") {
    return /[\u3040-\u30ff]/.test(text);
  }
  if (normTarget === "ko") {
    return /[\uac00-\ud7af]/.test(text);
  }
  if (normTarget === "zh" || normTarget === "tw") {
    if (normSource === "ja" && /[\u3040-\u30ff]/.test(text)) {
      return false;
    }
    return /[\u4e00-\u9fa5]/.test(text);
  }

  return false;
}

/**
 * Checks if the text starts with a standard imperative engineering verb.
 * If true, input is already an actionable engineering specification.
 */
export function isImperativeEngineeringPrompt(text: string): boolean {
  const trimmed = text.trim();
  const firstWordMatch = trimmed.match(/^[a-zA-Z]+/);
  if (!firstWordMatch) return false;
  const firstWord = firstWordMatch[0].toLowerCase();
  return IMPERATIVE_ENGINEERING_VERBS.has(firstWord);
}

/**
 * Detects the natural language writing system present in the input text.
 * Used for input-driven locale adaptation on cold boot.
 */
export function detectScriptLanguage(text: string): string | null {
  if (/[\u3040-\u30ff]/.test(text)) {
    return "ja";
  }
  if (/[\uac00-\ud7af]/.test(text)) {
    return "ko";
  }
  if (/[\u0400-\u04ff]/.test(text)) {
    return "ru";
  }
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return "zh";
  }
  return null;
}

