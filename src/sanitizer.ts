/**
 * Prompt Sanitizer & Intent Distiller (报错审查与意图萃取器)
 *
 * 物理职责：
 * 1. 剥离图片路径与文件路径前缀 (如 C:\Users\...\pi-clipboard-xxx.png)；
 * 2. 识别并折叠多行堆栈追踪 (Node.js at ..., Python Traceback, Java Caused by...)；
 * 3. 识别并折叠多行 Markdown 代码块 (```...```) 为 [...]；
 * 4. 识别并折叠多行编译器/Linter 诊断报错，仅保留首行关键信息；
 * 5. 严格保留 shell 命令行 (git, npm, cargo 等) 原型，不进行破坏性抹除；
 * 6. 提炼出核心自然语言意图，防止几百行报错撑爆终端与大模型上下文。
 */

import { isNonEnglish } from "./shield.js";

// 常见临时剪贴板图片正则 (精确匹配 pi-clipboard 截图，绝不误伤普通代码或 docs/README.md 文件)
// 支持 Windows 盘符 (正反斜杠)、支持包含空格的用户名路径 (如 Jason Miller)
const TARGETED_CLIPBOARD_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)/gi;
const LEADING_TARGETED_CLIPBOARD_REGEX = /^(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)\s*/i;

// 堆栈跟踪特征正则
const STACK_LINE_REGEX = /^\s*(?:at\s+(?:[\w$.<>]+|[^\s]+)\s*\(.*:\d+:\d+\)|at\s+.*:\d+:\d+|File\s+".*", line \d+, in\s+.*|goroutine \d+ \[.*\]:|Caused by:.*|^\s*\d+:\s+0x[0-9a-f]+)/;

// 编译器多行诊断格式 (TS / Rustc / GCC / Python)
const COMPILER_DIAGNOSTIC_REGEX = /^(?:[a-zA-Z]:[\\\/]|\.{0,2}[\\\/]|[a-zA-Z0-9_\-\.]+)[^:\r\n]+:\d+:\d+:\s*(?:error|warning|fatal error|note):/i;

// 常见多行列表项特征正则 (支持 - * • 1. 2. 等项目符号)
const LIST_ITEM_REGEX = /^\s*(?:[-*•]|\d+[\.、)])\s+/;

export interface SanitizedPromptResult {
  /** 审查折叠后用于翻译与分句的紧凑意图文本 */
  distilledText: string;
  /** 是否包含有效的人类自然语言提问/意图 */
  hasNaturalLanguage: boolean;
  /** 是否折叠了堆栈、代码块或报错 */
  hasCollapsedContent: boolean;
  /** 自然语言核心字符数估算 */
  naturalCharsLength: number;
  /** 提取出的原始代码块、堆栈或诊断附件 (供 english 模式实施混合意图嫁接) */
  rawPayload?: string;
}

/**
 * 对用户原始输入进行审查与折叠萃取
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

  // 1. 循环剥离所有临时截图前缀，并安全滤除文本末尾或夹带的剪贴板图片路径 (绝不误伤普通源码与 README.md)
  let text = trimmed;
  while (LEADING_TARGETED_CLIPBOARD_REGEX.test(text)) {
    text = text.replace(LEADING_TARGETED_CLIPBOARD_REGEX, "").trim();
  }
  
  // 提取夹带在行内或尾部的截图/临时状态路径，存入 rawPayload 供 AI 上下文使用，不污染自然语言切片
  const inlinePathMatches = text.match(TARGETED_CLIPBOARD_PATH_REGEX);
  let trailingPathPayload: string | undefined;
  if (inlinePathMatches && inlinePathMatches.length > 0) {
    trailingPathPayload = inlinePathMatches.join("\n");
    text = text.replace(TARGETED_CLIPBOARD_PATH_REGEX, "").trim();
  }

  if (!text) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0,
      rawPayload: trailingPathPayload,
    };
  }

  // 2. 折叠 Markdown 封闭代码块 (```...```) 为 [...]
  let hasCollapsed = false;
  text = text.replace(/```[\w\-]*\r?\n([\s\S]*?)\r?\n```/g, (_match, codeContent) => {
    hasCollapsed = true;
    const codeLines = codeContent.trim().split(/\r?\n/);
    if (codeLines.length <= 1) {
      return `[${codeLines[0] || "code"}]`;
    }
    return "[code ...]";
  });

  // 3. 按行审查与堆栈/报错/列表折叠
  const lines = text.split(/\r?\n/);
  const resultLines: string[] = [];
  let inStackBlock = false;
  let inDiagnosticBlock = false;
  const currentListItems: string[] = [];
  const collapsedListBlocks: string[] = [];

  const flushListItems = () => {
    const totalLength = currentListItems.reduce((acc, cur) => acc + cur.length, 0);

    // 保护短列表语义：条目 <= 4 且总字数 <= 120 时，绝不粗暴折叠，完整保留选项上下文！
    if (currentListItems.length >= 2 && (currentListItems.length > 4 || totalLength > 120)) {
      hasCollapsed = true;
      resultLines.push(`[${currentListItems.length} items ...]`);
      collapsedListBlocks.push(currentListItems.join("\n"));
      currentListItems.length = 0;
    } else {
      // 短列表逐行完整保留
      resultLines.push(...currentListItems);
      currentListItems.length = 0;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrim = line.trim();

    // 空行直接跳过或保留单个
    if (!lineTrim) {
      flushListItems();
      inStackBlock = false;
      inDiagnosticBlock = false;
      continue;
    }

    // A. 判定是否为堆栈追踪行 (at Function..., File "...", line...)
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

    // B. 判定是否为编译器连续报错 (如 src/index.ts:12:4: error: ...)
    if (COMPILER_DIAGNOSTIC_REGEX.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!inDiagnosticBlock) {
        // 保留首行核心报错摘要
        resultLines.push(lineTrim);
        resultLines.push("[... diagnostics ...]");
        inDiagnosticBlock = true;
      }
      continue;
    } else {
      inDiagnosticBlock = false;
    }

    // C. 常见 npm ERR! 连续堆叠折叠
    if (/^npm ERR!/i.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!resultLines[resultLines.length - 1]?.includes("npm ERR! [...]")) {
        resultLines.push("npm ERR! [...]");
      }
      continue;
    }

    // D. 项目列表项折叠 (连续 2 条及以上列表项折叠)
    if (LIST_ITEM_REGEX.test(lineTrim)) {
      currentListItems.push(line);
      continue;
    } else {
      flushListItems();
    }

    // 正常文本行保留
    resultLines.push(line);
  }

  flushListItems();

  // 合并折叠后的紧凑文本
  const distilledText = resultLines.join(" ").replace(/\s+/g, " ").trim();

  // 4. 判定是否包含人类自然语言意图
  // 如果整段文本只剩下纯报错占位符、纯英文符号、纯文件名，而没有任何自然语言表达：
  const withoutPlaceholders = distilledText
    .replace(/\[\.\.\.[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/g, "")
    .replace(/[a-zA-Z0-9_\-\.\/\\:]+/g, "")
    .trim();

  // 如果包含中日韩或非 ASCII 自然语言文字，或包含自然语言问句/指导动词
  const hasCJK = isNonEnglish(distilledText);
  const hasQuestionKeywords = /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix|should|what|inspect)/i.test(distilledText);
  
  // 纯编译器诊断守卫：如果整段输入全是 TS/GCC 编译报错模板句，且没有任何人类疑问词，判定为纯输出
  const isPureDiagnosticOutput = /^(?:[a-zA-Z0-9_\-\.\/\\:]+\s*-\s*error\s+[a-zA-Z0-9]+|error(?:\s+TS\d+|:)|warning:)/i.test(distilledText) && !hasQuestionKeywords;

  // 纯报错/堆栈守卫：纯 Error: ... 紧随堆栈，且无任何人类提问意图
  const isPureErrorOrDiagnostic =
    isPureDiagnosticOutput ||
    (/^Error:\s*[\w\s:]*\[\.\.\.\s*stack trace\s*\.\.\.\]/i.test(distilledText) && !hasQuestionKeywords);

  // 自然语言英语句子判定：在非纯堆栈场景下，包含由空格分隔的标准英文自然词汇 >= 4 个 (确保英文陈述句被准确识别)
  const cleanEnglishWords = distilledText.replace(/\[\.\.\.[^\]]*\]|\[code[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/gi, " ").trim();
  const words = cleanEnglishWords.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const hasEnglishSentence = !isPureErrorOrDiagnostic && words.length >= 4 && !distilledText.startsWith("Error:");

  const hasNaturalLanguage = (hasCJK || hasQuestionKeywords || hasEnglishSentence || withoutPlaceholders.length > 5) && !isPureErrorOrDiagnostic;

  // 5. 提取可能被折叠的原始代码块与堆栈追踪附件 (供 english 模式嫁接保留真实排障上下文)
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
