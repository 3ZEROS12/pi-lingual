/**
 * Prompt Sanitizer & Intent Distiller.
 *
 * Responsibilities:
 * 1. Strips clipboard screenshot paths (pi-clipboard-*.png);
 * 2. Identifies and collapses multiline stack traces (Node.js at ..., Python Traceback, Java Caused by...);
 * 3. Collapses multiline Markdown code blocks (```...```) to [...];
 * 4. Collapses multiline compiler/linter diagnostics, preserving the first summary line;
 * 5. Strictly preserves Shell CLI commands (git, npm, cargo, etc.) verbatim;
 * 6. Distills core natural language intent to prevent prompt bloating.
 */

import { isNonEnglish } from "./shield.js";

// Targeted regex for temporary clipboard image paths (e.g. pi-clipboard-*.png)
// Supports Windows drive letters (forward and backward slashes) and paths with spaces
const TARGETED_CLIPBOARD_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)/gi;
const LEADING_TARGETED_CLIPBOARD_REGEX = /^(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)\s*/i;

// Absolute file paths (e.g. C:\Users\... or /var/log/...) and UUID/session hashes
// Folded into (...) to prevent path hallucination and terminal line overflow
const ABSOLUTE_LONG_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t\s<>"]+[\\\/])+[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_]+|\/(?:[a-zA-Z0-9_\-\.]+[\\\/]){3,}[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_]+)/gi;
const UUID_OR_SESSION_REGEX = /(?:(?:session|id|uuid)[\s:=]*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4,16}(?:\.jsonl)?/gi;

// Stack trace pattern
const STACK_LINE_REGEX = /^\s*(?:at\s+(?:[\w$.<>]+|[^\s]+)\s*\(.*:\d+:\d+\)|at\s+.*:\d+:\d+|File\s+".*", line \d+, in\s+.*|goroutine \d+ \[.*\]:|Caused by:.*|^\s*\d+:\s+0x[0-9a-f]+)/;

// Compiler multiline diagnostic pattern (TS / Rustc / GCC / Python)
const COMPILER_DIAGNOSTIC_REGEX = /^(?:[a-zA-Z]:[\\\/]|\.{0,2}[\\\/]|[a-zA-Z0-9_\-\.]+)[^:\r\n]+:\d+:\d+:\s*(?:error|warning|fatal error|note):/i;

// Multiline list item pattern (-, *, •, 1., 2.)
const LIST_ITEM_REGEX = /^\s*(?:[-*•]|\d+[\.、)])\s+/;

export interface SanitizedPromptResult {
  /** Distilled compact text after sanitization and folding */
  distilledText: string;
  /** Whether prompt contains valid human natural language intent */
  hasNaturalLanguage: boolean;
  /** Whether stack traces, code blocks, or logs were collapsed */
  hasCollapsedContent: boolean;
  /** Estimated natural language character count */
  naturalCharsLength: number;
  /** Preserved raw payload (code blocks, stack traces) for hybrid grafting */
  rawPayload?: string;
}

/**
 * Sanitizes user input and distills natural language intent.
 */
export function sanitizePromptForTranslation(raw: string): SanitizedPromptResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0,
    };
  }

  // 1. Strip temporary screenshot path prefixes and trailing image paths
  let text = trimmed;
  while (LEADING_TARGETED_CLIPBOARD_REGEX.test(text)) {
    text = text.replace(LEADING_TARGETED_CLIPBOARD_REGEX, "").trim();
  }
  
  // Extract inline or trailing screenshot paths into rawPayload
  const inlinePathMatches = text.match(TARGETED_CLIPBOARD_PATH_REGEX);
  const extraPayloads: string[] = [];
  if (inlinePathMatches && inlinePathMatches.length > 0) {
    extraPayloads.push(...inlinePathMatches);
    text = text.replace(TARGETED_CLIPBOARD_PATH_REGEX, "").trim();
  }

  // 1.1 Match long absolute file paths and session UUIDs, extract to rawPayload and fold to (...)
  const longPathMatches = text.match(ABSOLUTE_LONG_PATH_REGEX);
  if (longPathMatches && longPathMatches.length > 0) {
    extraPayloads.push(...longPathMatches);
    text = text.replace(ABSOLUTE_LONG_PATH_REGEX, "(...)");
  }

  const uuidMatches = text.match(UUID_OR_SESSION_REGEX);
  if (uuidMatches && uuidMatches.length > 0) {
    extraPayloads.push(...uuidMatches);
    text = text.replace(UUID_OR_SESSION_REGEX, "(...)");
  }

  // Collapse redundant consecutive "(...) (...)"
  text = text.replace(/(?:\(\.\.\.\)\s*){2,}/g, "(...) ").trim();

  let trailingPathPayload: string | undefined = extraPayloads.length > 0 ? extraPayloads.join("\n") : undefined;

  if (!text) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0,
      rawPayload: trailingPathPayload,
    };
  }

  // 2. Collapse Markdown code blocks (```...```) to [...]
  let hasCollapsed = Boolean(longPathMatches || uuidMatches);
  text = text.replace(/```[\w\-]*\r?\n([\s\S]*?)\r?\n```/g, (_match, codeContent) => {
    hasCollapsed = true;
    const codeLines = codeContent.trim().split(/\r?\n/);
    if (codeLines.length <= 1) {
      return `[${codeLines[0] || "code"}]`;
    }
    return "[code ...]";
  });

  // 3. Line-by-line inspection and stack / diagnostic / list folding
  const lines = text.split(/\r?\n/);
  const resultLines: string[] = [];
  let inStackBlock = false;
  let inDiagnosticBlock = false;
  const currentListItems: string[] = [];
  const collapsedListBlocks: string[] = [];

  const flushListItems = () => {
    const totalLength = currentListItems.reduce((acc, cur) => acc + cur.length, 0);

    // Protect short lists: keep options if items <= 4 and total length <= 120
    if (currentListItems.length >= 2 && (currentListItems.length > 4 || totalLength > 120)) {
      hasCollapsed = true;
      resultLines.push(`[${currentListItems.length} items ...]`);
      collapsedListBlocks.push(currentListItems.join("\n"));
      currentListItems.length = 0;
    } else {
      // Preserve short list line-by-line
      resultLines.push(...currentListItems);
      currentListItems.length = 0;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrim = line.trim();

    // Skip empty lines
    if (!lineTrim) {
      flushListItems();
      inStackBlock = false;
      inDiagnosticBlock = false;
      continue;
    }

    // A. Check if line is a stack trace line
    if (STACK_LINE_REGEX.test(lineTrim) || lineTrim.startsWith("Traceback (most recent call last):")) {
      flushListItems();
      hasCollapsed = true;
      if (!inStackBlock) {
        resultLines.push("[... stack trace ...]");
        inStackBlock = true;
      }
      continue;
    } else {
      inStackBlock = false;
    }

    // B. Check if line is a compiler diagnostic line
    if (COMPILER_DIAGNOSTIC_REGEX.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!inDiagnosticBlock) {
        // Keep first diagnostic summary line
        resultLines.push(lineTrim);
        resultLines.push("[... diagnostics ...]");
        inDiagnosticBlock = true;
      }
      continue;
    } else {
      inDiagnosticBlock = false;
    }

    // C. Collapse consecutive npm ERR! blocks
    if (/^npm ERR!/i.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!resultLines[resultLines.length - 1]?.includes("npm ERR! [...]")) {
        resultLines.push("npm ERR! [...]");
      }
      continue;
    }

    // D. Collapse multiline list items (>= 2 items)
    if (LIST_ITEM_REGEX.test(lineTrim)) {
      currentListItems.push(line);
      continue;
    } else {
      flushListItems();
    }

    // Preserve normal text lines
    resultLines.push(line);
  }

  flushListItems();

  // Join collapsed lines
  const distilledText = resultLines.join(" ").replace(/\s+/g, " ").trim();

  // 4. Determine if input contains human natural language intent
  const withoutPlaceholders = distilledText
    .replace(/\[\.\.\.[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/g, "")
    .replace(/[a-zA-Z0-9_\-\.\/\\:]+/g, "")
    .trim();

  // Check for non-English scripts, technical questions, or imperative verbs
  const hasCJK = isNonEnglish(distilledText);
  const hasQuestionKeywords = /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix|should|what|inspect)/i.test(distilledText);
  
  // Pure compiler diagnostic guard: TS/GCC output with no question keywords
  const isPureDiagnosticOutput = /^(?:[a-zA-Z0-9_\-\.\/\\:]+\s*-\s*error\s+[a-zA-Z0-9]+|error(?:\s+TS\d+|:)|warning:)/i.test(distilledText) && !hasQuestionKeywords;

  // Pure error stack guard: Error: ... followed by stack with no question intent
  const isPureErrorOrDiagnostic =
    isPureDiagnosticOutput ||
    (/^Error:\s*[\w\s:]*\[\.\.\.\s*stack trace\s*\.\.\.\]/i.test(distilledText) && !hasQuestionKeywords);

  // English sentence check: >= 4 space-separated words outside error headers
  const cleanEnglishWords = distilledText.replace(/\[\.\.\.[^\]]*\]|\[code[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/gi, " ").trim();
  const words = cleanEnglishWords.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const hasEnglishSentence = !isPureErrorOrDiagnostic && words.length >= 4 && !distilledText.startsWith("Error:");

  const hasNaturalLanguage = (hasCJK || hasQuestionKeywords || hasEnglishSentence || withoutPlaceholders.length > 5) && !isPureErrorOrDiagnostic;

  // 5. Extract collapsed code blocks and stack traces into rawPayload for hybrid intent grafting
  let rawPayload: string | undefined;
  const payloadParts: string[] = [];
  if (trailingPathPayload) {
    payloadParts.push(trailingPathPayload);
  }
  if (hasCollapsed) {
    const codeMatch = trimmed.match(/```[\w\-]*\r?\n([\s\S]*?)\r?\n```/g);
    if (codeMatch) {
      payloadParts.push(...codeMatch);
    }
    const stackLines = lines.filter(
      (l) => STACK_LINE_REGEX.test(l.trim()) || COMPILER_DIAGNOSTIC_REGEX.test(l.trim()) || l.trim().startsWith("Traceback")
    );
    if (stackLines.length > 0 && !codeMatch) {
      payloadParts.push(stackLines.join("\n"));
    }
    if (collapsedListBlocks.length > 0) {
      payloadParts.push(collapsedListBlocks.join("\n\n"));
    }
  }
  if (payloadParts.length > 0) {
    rawPayload = payloadParts.join("\n\n").trim();
  }

  return {
    distilledText,
    hasNaturalLanguage,
    hasCollapsedContent: hasCollapsed,
    naturalCharsLength: distilledText.length,
    rawPayload,
  };
}
