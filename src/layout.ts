/**
 * Terminal Box Model & Layout Engine (终端盒模型与几何排版求解引擎)
 * 
 * 物理职责：
 * 1. 严格遵循 Unicode Standard Annex #11 (East Asian Width) 计算终端显示列宽；
 * 2. 具备标点行头禁则 (Kinsoku Shori) 的确定性断行算法，杜绝孤立标点；
 * 3. 严格有界的单行胶囊流 (1-Line Capsule) 求解器，绝对不溢出终端列宽；
 * 4. Trifecta 开放式左导轨树状分支 (· ┌ ├ └) 格式化生成；
 * 5. 9 行硬预算盒模型求解器 (renderCardLayout)，保证行数物理断言 <= 9。
 */

import type { LingualResult, LingualI18nLabels, SlotConfig } from "./types.js";

/**
 * 禁则处理标点集合：绝对禁止出现在行首的标点符号
 */
export const CANNOT_START_LINE_CHARS = new Set([
  ",", ".", ";", "!", "?", ":",
  "，", "。", "；", "！", "？", "：", "、",
  ")", "]", "}", "）", "】", "”", "’", "»"
]);

/**
 * 终端窗口物理列宽安全计算 (带缩放 SIGWINCH 防崩溃保底)
 */
export function getEffectiveMaxCols(requested?: number): number {
  const terminalCols = process.stdout?.columns;
  const raw = typeof requested === "number"
    ? requested
    : (typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 8 : 80);
  return Math.max(25, raw); // 无论终端如何缩放，物理保底 25 列，防止除零或负数溢出
}

/**
 * Unicode Standard Annex #11 视觉单元格宽度测算:
 * - ANSI 转义序列 = 0 单元格
 * - CJK 宽字符、全角字符、Emoji = 2 单元格
 * - ASCII 西文字符 = 1 单元格
 */
export function getVisualWidth(str: string): number {
  let width = 0;
  const clean = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x1f900 && code <= 0x1f9ff)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 基于视觉单元格的无溢出截断 (截断后总宽度严格 <= maxVisualCols)
 */
export function truncateVisual(str: string, maxVisualCols: number): string {
  if (maxVisualCols <= 0) return "";
  const fullWidth = getVisualWidth(str);
  if (fullWidth <= maxVisualCols) return str;

  // 必须提前扣除省略号 "..." 的 3 列物理预算，确保拼接后总宽度严格 <= maxVisualCols
  const targetCols = Math.max(1, maxVisualCols - 3);
  let curWidth = 0;
  let result = "";
  for (const char of str) {
    const w = getVisualWidth(char);
    if (curWidth + w > targetCols) {
      break;
    }
    result += char;
    curWidth += w;
  }
  return result + "...";
}

/**
 * 基于标点禁则与列宽边界的视觉折行算法
 */
export function wrapVisualText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const rawLines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  const tokenRegex = /\x1b\[[0-9;]*[a-zA-Z]|\s+|[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]|[^\s\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\x1b]+/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    const tokenWidth = getVisualWidth(token);

    if (tokenWidth === 0) {
      currentLine += token;
      continue;
    }

    if (currentWidth + tokenWidth <= maxWidth) {
      currentLine += token;
      currentWidth += tokenWidth;
    } else {
      if (currentLine === "") {
        // 单个超长无空格 Token (长 URL / 路径) 强制按列宽平滑切片分行
        if (tokenWidth > maxWidth) {
          let curToken = token;
          while (getVisualWidth(curToken) > maxWidth) {
            let sliceIdx = 0;
            let accW = 0;
            for (const ch of curToken) {
              const chW = getVisualWidth(ch);
              if (accW + chW > maxWidth) break;
              accW += chW;
              sliceIdx += ch.length;
            }
            if (sliceIdx === 0) sliceIdx = 1;
            rawLines.push(curToken.slice(0, sliceIdx));
            curToken = curToken.slice(sliceIdx);
          }
          if (curToken.trim()) {
            currentLine = curToken;
            currentWidth = getVisualWidth(curToken);
          }
          continue;
        }
        rawLines.push(token);
        continue;
      }
      rawLines.push(currentLine.trimEnd());
      currentLine = token.trimStart();
      currentWidth = getVisualWidth(currentLine);
    }
  }

  if (currentLine.trim()) {
    rawLines.push(currentLine.trimEnd());
  }

  // 标点禁则后处理：若某一行以禁止行首标点开头，强行将其吸附到上一行行尾
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (i > 0 && line.length > 0) {
      const firstChar = line[0];
      if (CANNOT_START_LINE_CHARS.has(firstChar)) {
        const prevIdx = lines.length - 1;
        lines[prevIdx] = lines[prevIdx] + firstChar;
        line = line.slice(1).trimStart();
      }
    }
    if (line.trim()) {
      lines.push(line);
    }
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * 格式化树状悬挂缩进分支 (· ┌ ├ └)
 */
export function formatTreeBranch(
  branchChar: string,
  contChar: string,
  tag: string,
  content: string,
  prefixDecorator: (p: string) => string = (s) => s,
  tagDecorator: (t: string) => string = (s) => s,
  contDecorator: (c: string) => string = (s) => s,
  lineDecorator: ((l: string) => string) | number = (s) => s,
  maxCols = (process.stdout?.columns || 80) - 8
): string[] {
  const actualLineDecorator = typeof lineDecorator === "function" ? lineDecorator : (s: string) => s;
  const actualMaxCols = typeof lineDecorator === "number" ? lineDecorator : (typeof maxCols === "number" ? maxCols : (process.stdout?.columns || 80) - 8);

  const rawPrefix = `  ${branchChar} [${tag}] `;
  const prefixW = getVisualWidth(rawPrefix);
  const rawCont = `  ${contChar}${" ".repeat(Math.max(1, prefixW - 3))}`;
  const availW = Math.max(25, actualMaxCols - prefixW);

  const lines = wrapVisualText(content, availW);
  if (lines.length === 0) {
    return [prefixDecorator(`  ${branchChar} `) + tagDecorator(`[${tag}]`)];
  }

  return lines.map((line, idx) => {
    if (idx === 0) {
      return prefixDecorator(`  ${branchChar} `) + tagDecorator(`[${tag}] `) + actualLineDecorator(line);
    }
    return contDecorator(rawCont) + actualLineDecorator(line);
  });
}

/**
 * 格式化语感子导轨 (↳)
 */
export function formatSubRail(
  contChar: string,
  nuanceText: string,
  arrow = "↳",
  contDecorator: (c: string) => string = (s) => s,
  lineDecorator: (l: string) => string = (s) => s,
  maxCols = (process.stdout?.columns || 80) - 8,
  indentCols = 11
): string[] {
  if (!nuanceText || !nuanceText.trim()) return [];

  const rawPrefix = `  ${contChar}${" ".repeat(Math.max(1, indentCols - 5))}${arrow} `;
  const prefixW = getVisualWidth(rawPrefix);
  const rawCont = `  ${contChar}${" ".repeat(Math.max(1, prefixW - 3))}`;
  const availW = Math.max(20, maxCols - prefixW);

  const cleanText = nuanceText.startsWith("(") && nuanceText.endsWith(")")
    ? nuanceText
    : `(${nuanceText})`;

  const lines = wrapVisualText(cleanText, availW);
  return lines.map((line, idx) => {
    if (idx === 0) {
      return contDecorator(rawPrefix) + lineDecorator(line);
    }
    return contDecorator(rawCont) + lineDecorator(line);
  });
}

/**
 * 从 vocab 字符串中解析出纯净的目标短语列表 (由长到短排序)
 * 例如: "on board with (赞成/支持) · dive in (立刻着手/开搞)"
 * ➔ ["on board with", "dive in"]
 */
export function extractVocabPhrases(vocab: string | undefined): string[] {
  if (!vocab || !vocab.trim()) return [];
  const items = vocab.split(/\s*(?:·|•|,)\s*/);
  const phrases: string[] = [];

  for (const raw of items) {
    const clean = raw.replace(/\s*(?:\(.*?\)|（.*?）)\s*$/, "").trim();
    if (clean.length >= 2 && !phrases.includes(clean)) {
      phrases.push(clean);
    }
  }

  return phrases.sort((a, b) => b.length - a.length);
}

/**
 * 对目标文本中的指定短语进行非破坏性 ANSI 下划线瞄准点亮 (Spotlight Highlighting)
 * 大小写不敏感匹配，保留原始文本的大小写与排版
 * 原生支持 CJK (日文/中文) 以及 ASCII 西文字符
 */
export function spotlightPhrases(text: string, phrases: string[]): string {
  if (!text || phrases.length === 0) return text;

  let result = text;
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithAscii = /^[a-zA-Z0-9]/.test(phrase);
    const endsWithAscii = /[a-zA-Z0-9]$/.test(phrase);
    const pattern = `${startsWithAscii ? "(?<=\\b|^)" : ""}${escaped}${endsWithAscii ? "(?=\\b|$)" : ""}`;
    const regex = new RegExp(pattern, "gi");
    result = result.replace(regex, (matched) => `\x1b[4m${matched}\x1b[24m`);
  }
  return result;
}

/**
 * 按原子短语 (Item-level) 格式化重点词汇单行流，绝不把任何词汇项砍成半截或留下未闭合的 "(" (彻底解决 BUG-VOCAB-TRUNCATION)
 */
export function formatVocabItemsAtomic(
  vocab: string,
  prefix: string,
  maxCols: number
): string {
  if (!vocab || !vocab.trim()) return prefix.trimEnd();

  const items = vocab.split(/\s*(?:·|•)\s*/);
  const prefixW = getVisualWidth(prefix);
  const availW = Math.max(20, maxCols - prefixW);

  const keptItems: string[] = [];
  let curW = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim();
    if (!item) continue;
    const itemW = getVisualWidth(item);
    const sepW = keptItems.length > 0 ? 3 : 0; // " · "

    if (curW + sepW + itemW <= availW) {
      keptItems.push(item);
      curW += sepW + itemW;
    } else {
      if (keptItems.length === 0) {
        return prefix + truncateVisual(item, availW);
      } else {
        if (curW + 5 <= availW) {
          return prefix + keptItems.join(" · ") + " · ...";
        }
        return prefix + keptItems.join(" · ");
      }
    }
  }

  return prefix + keptItems.join(" · ");
}

/**
 * 格式化终端树状全景输出 (formatTerminalAnnotation)
 */
export function formatTerminalAnnotation(
  sourceText: string,
  spoken: string,
  written?: string,
  vocab?: string,
  options: {
    spokenMeaning?: string;
    writtenMeaning?: string;
    slot1Label?: string;
    slot2Label?: string;
    vocabLabel?: string;
    sourceLabel?: string;
    spotlight?: boolean;
  } = {}
): string {
  const slot1 = options.slot1Label || "Spoken";
  const slot2 = options.slot2Label || "Written";
  const vocabTag = options.vocabLabel || "Vocab";
  const sourceTag = options.sourceLabel || "Original";

  const hasSlot2 = Boolean(written && written.trim());
  const hasVocab = Boolean(vocab && vocab.trim());

  const spotlightEnabled = options.spotlight !== false;
  const phrases = (hasVocab && spotlightEnabled) ? extractVocabPhrases(vocab) : [];
  const displaySpoken = phrases.length > 0 ? spotlightPhrases(spoken, phrases) : spoken;
  const displayWritten = (written && phrases.length > 0) ? spotlightPhrases(written, phrases) : written;

  const cleanSource = sourceText.replace(/\r?\n+/g, " ").trim();
  const lines: string[] = [`  · [${sourceTag}] ${cleanSource}`];

  const branch1Char = (hasSlot2 || hasVocab) ? "┌" : "└";
  const cont1Char = (hasSlot2 || hasVocab) ? "│" : " ";
  lines.push(...formatTreeBranch(branch1Char, cont1Char, slot1, displaySpoken));
  if (options.spokenMeaning) {
    lines.push(...formatSubRail(cont1Char, options.spokenMeaning));
  }

  if (hasSlot2) {
    const branchChar = hasVocab ? "├" : "└";
    const contChar = hasVocab ? "│" : " ";
    lines.push(...formatTreeBranch(branchChar, contChar, slot2, displayWritten!));
    if (options.writtenMeaning) {
      lines.push(...formatSubRail(contChar, options.writtenMeaning));
    }
  }

  if (hasVocab) {
    lines.push(...formatTreeBranch("└", " ", vocabTag, vocab!));
  }

  return lines.join("\n");
}

/**
 * 格式化极端分屏下的单行高密度胶囊流 (Single-Line Capsule Layout)
 * 严格限制在 1 行内，按终端列宽动态均衡截断，绝不溢出单行
 */
export function formatCapsuleLine(
  hudTitle: string,
  spoken: string,
  written?: string,
  options: {
    slot1Short?: string;
    slot2Short?: string;
    maxCols?: number;
  } = {}
): string {
  const maxCols = options.maxCols || (process.stdout?.columns ? Math.max(30, process.stdout.columns) : 80);
  const slot1 = options.slot1Short || "Spk";
  const slot2 = options.slot2Short || "Wrt";

  const cleanSpoken = spoken.replace(/\r?\n+/g, " ").trim();
  const cleanWritten = (written || "").replace(/\r?\n+/g, " ").trim();

  const prefix = `⇄ [${hudTitle}] `;
  const prefixW = getVisualWidth(prefix);
  const hasSlot2 = Boolean(cleanWritten);

  const availW = Math.max(8, maxCols - prefixW);

  let body = "";
  if (hasSlot2) {
    const s1PrefixW = getVisualWidth(`${slot1}: `);
    const s2PrefixW = getVisualWidth(`${slot2}: `);
    const fixedOverhead = s1PrefixW + 3 + s2PrefixW;
    const textAvail = Math.max(4, availW - fixedOverhead);
    const halfW = Math.max(2, Math.floor(textAvail / 2));

    const s1 = truncateVisual(cleanSpoken, halfW);
    const s2 = truncateVisual(cleanWritten, halfW);
    body = `${slot1}: ${s1} · ${slot2}: ${s2}`;
  } else {
    const s1PrefixW = getVisualWidth(`${slot1}: `);
    const textAvail = Math.max(2, availW - s1PrefixW);
    const s1 = truncateVisual(cleanSpoken, textAvail);
    body = `${slot1}: ${s1}`;
  }

  const fullLine = prefix + body;
  if (getVisualWidth(fullLine) > maxCols) {
    return truncateVisual(fullLine, maxCols);
  }
  return fullLine;
}

/**
 * 盒模型布局求解器 (renderCardLayout)
 * 统一求解 9 行硬预算、树状全景与单行胶囊降级
 */
export function renderCardLayout(
  card: LingualResult,
  labels: LingualI18nLabels,
  options: {
    maxCols?: number;
    maxLines?: number;
    isCompact?: boolean;
    slots?: SlotConfig[];
    pageTag?: string;
    themeDecorators?: {
      muted: (s: string) => string;
      accent: (s: string) => string;
      dim: (s: string) => string;
    };
  } = {}
): string[] {
  const maxCols = getEffectiveMaxCols(options.maxCols);
  const maxLines = options.maxLines || 9;
  const isCompact = Boolean(options.isCompact);
  const pageTag = options.pageTag || "";

  const decMuted = options.themeDecorators?.muted || ((s) => s);
  const decAccent = options.themeDecorators?.accent || ((s) => s);
  const decDim = options.themeDecorators?.dim || ((s) => s);

  // 0. 解析全动态多槽位 (Universal Dynamic Slot Architecture)
  // 如果调用方传入了 slots，以传入为准；否则根据 card 自行派生默认槽位
  let effectiveSlots: SlotConfig[] = [];
  if (options.slots && options.slots.length > 0) {
    effectiveSlots = options.slots.filter((s) => s.enabled);
  } else {
    // 默认回退槽位
    effectiveSlots = [
      { id: "source", label: labels.sourceLabel || "原文", role: "source", enabled: true },
      { id: "spoken", label: labels.slot1Label || "Spoken", role: "translation", enabled: true, showMeaning: true },
      ...(card.written ? [{ id: "written", label: labels.slot2Label || "Written", role: "translation", enabled: true, showMeaning: true } as SlotConfig] : []),
      ...(card.vocab ? [{ id: "vocab", label: labels.vocabLabel || "Vocab", role: "vocab", enabled: true } as SlotConfig] : []),
    ];
  }

  // 提取各槽位的内容
  const resolveSlotContent = (slot: SlotConfig): { content: string; meaning?: string } => {
    if (slot.role === "source") {
      return { content: card.sourceText || "" };
    }
    if (card.slotOutputs && card.slotOutputs[slot.id]) {
      const out = card.slotOutputs[slot.id];
      return { content: out.content || "", meaning: out.meaning };
    }
    if (card.slots) {
      const match = card.slots.find((s) => s.id === slot.id);
      if (match) {
        return { content: match.content || "", meaning: match.meaning };
      }
    }
    // 后向兼容字段
    if (slot.id === "spoken" || (slot.role === "translation" && !card.slotOutputs)) {
      if (slot.id === "written") {
        return { content: card.written || "", meaning: card.writtenMeaning };
      }
      return { content: card.spoken || "", meaning: card.spokenMeaning };
    }
    if (slot.id === "written") {
      return { content: card.written || "", meaning: card.writtenMeaning };
    }
    if (slot.id === "vocab" || slot.role === "vocab") {
      return { content: card.vocab || "" };
    }
    return { content: "" };
  };

  // 筛选出有内容的非 source 槽位
  interface RenderBranch {
    id: string;
    label: string;
    role: string;
    content: string;
    meaning?: string;
  }
  const contentBranches: RenderBranch[] = [];
  for (const slot of effectiveSlots) {
    if (slot.role === "source") continue;
    const { content, meaning } = resolveSlotContent(slot);
    if (content && content.trim()) {
      contentBranches.push({
        id: slot.id,
        label: slot.label,
        role: slot.role,
        content: content.trim(),
        meaning: (slot.showMeaning !== false && meaning && meaning.trim()) ? meaning.trim() : undefined,
      });
    }
  }

  // 1. 若显式请求胶囊模式，或列宽极端窄小 (< 35 列无法排版树状分支)，降级为单行胶囊流
  if (isCompact || maxCols < 35) {
    if (contentBranches.length === 0) {
      return [truncateVisual(`⇄ [${labels.hudTitle}] ${card.sourceText}`, maxCols) + pageTag];
    }
    const parts = contentBranches.map((b) => {
      const shortLabel = b.label.slice(0, 4);
      return `${shortLabel}: ${b.content}`;
    });
    const prefix = `⇄ [${labels.hudTitle}] `;
    const fullText = prefix + parts.join(" · ");
    return [truncateVisual(fullText, maxCols) + pageTag];
  }

  // 2. 检查是否有 source 原文槽位（支持用户完全删除/关闭原文行）
  const sourceSlot = effectiveSlots.find((s) => s.role === "source");
  let sourceLines: string[] = [];

  if (sourceSlot && card.sourceText && card.sourceText.trim()) {
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "原文";
    const prefixRaw = `  · [${sourceLabel}] `;
    const prefixW = getVisualWidth(prefixRaw);
    const pageTagW = pageTag ? getVisualWidth(pageTag) : 0;
    const availLine1W = Math.max(20, maxCols - prefixW - pageTagW);

    const cleanSource = card.sourceText.replace(/\r?\n+/g, " ").trim();

    if (getVisualWidth(cleanSource) <= availLine1W) {
      sourceLines = [
        decMuted("  · ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + cleanSource + pageTag,
      ];
    } else {
      const wrapped = wrapVisualText(cleanSource, Math.max(20, maxCols - prefixW));
      sourceLines = wrapped.map((wLine, idx) => {
        const isLast = idx === wrapped.length - 1;
        const tagSuffix = isLast ? pageTag : "";
        if (idx === 0) {
          return (
            decMuted("  · ") +
            decMuted("[") +
            decDim(sourceLabel) +
            decMuted("] ") +
            wLine +
            tagSuffix
          );
        }
        return " ".repeat(prefixW) + decDim(wLine) + tagSuffix;
      });
    }
  }

  let lines: string[] = [...sourceLines];

  // 3. 动态渲染非 source 槽位分支 (Trifecta Tree Rails)
  const numBranches = contentBranches.length;
  for (let i = 0; i < numBranches; i++) {
    const branch = contentBranches[i];
    const isFirst = i === 0;
    const isLast = i === numBranches - 1;

    let branchChar = "├";
    let contChar = "│";

    if (numBranches === 1) {
      branchChar = "└";
      contChar = " ";
    } else if (isFirst) {
      branchChar = "┌";
      contChar = "│";
    } else if (isLast) {
      branchChar = "└";
      contChar = " ";
    }

    const isVocab = branch.role === "vocab";
    const contentColor = isVocab ? decDim : (s: string) => s;
    const headingColor = isVocab ? decMuted : decAccent;

    lines.push(
      ...formatTreeBranch(
        branchChar,
        contChar,
        branch.label,
        branch.content,
        decMuted,
        headingColor,
        decMuted,
        contentColor,
        maxCols
      )
    );

    if (branch.meaning) {
      lines.push(...formatSubRail(contChar, branch.meaning, "↳", decMuted, decDim, maxCols));
    }
  }

  // 4. 行数守卫与盒模型约束求解 (Kinetic Line Budget Guard: lines.length <= maxLines)
  if (lines.length > maxLines) {
    // 约束 Tier 1: 原文最多展示 2 行
    let clampedSourceLines = sourceLines;
    if (sourceLines.length > 2) {
      clampedSourceLines = [
        sourceLines[0],
        truncateVisual(sourceLines[1] + "...", maxCols),
      ];
    }

    // 约束 Tier 2: 将母语释义内联入括号，消除纵向子导轨
    const inlineLines: string[] = [...clampedSourceLines];
    for (let i = 0; i < numBranches; i++) {
      const branch = contentBranches[i];
      const isFirst = i === 0;
      const isLast = i === numBranches - 1;
      const branchChar = numBranches === 1 ? "└" : isFirst ? "┌" : isLast ? "└" : "├";
      const contChar = numBranches === 1 || isLast ? " " : "│";
      const isVocab = branch.role === "vocab";
      const headingColor = isVocab ? decMuted : decAccent;
      const contentColor = isVocab ? decDim : (s: string) => s;

      const inlineText = branch.meaning ? `${branch.content} (${branch.meaning})` : branch.content;
      inlineLines.push(
        ...formatTreeBranch(
          branchChar,
          contChar,
          branch.label,
          inlineText,
          decMuted,
          headingColor,
          decMuted,
          contentColor,
          maxCols
        )
      );
    }

    if (inlineLines.length <= maxLines) {
      lines = inlineLines;
    } else {
      // 约束 Tier 3: 剥离母语微释义，保障目标语言内容的纯净与完整
      const pureLines: string[] = [...clampedSourceLines];
      for (let i = 0; i < numBranches; i++) {
        const branch = contentBranches[i];
        const isFirst = i === 0;
        const isLast = i === numBranches - 1;
        const branchChar = numBranches === 1 ? "└" : isFirst ? "┌" : isLast ? "└" : "├";
        const contChar = numBranches === 1 || isLast ? " " : "│";
        const isVocab = branch.role === "vocab";
        const headingColor = isVocab ? decMuted : decAccent;
        const contentColor = isVocab ? decDim : (s: string) => s;

        pureLines.push(
          ...formatTreeBranch(
            branchChar,
            contChar,
            branch.label,
            branch.content,
            decMuted,
            headingColor,
            decMuted,
            contentColor,
            maxCols
          )
        );
      }

      if (pureLines.length <= maxLines) {
        lines = pureLines;
      } else {
        // 约束 Tier 4: 智能非对称行预算分配（优先保障核心译文完整度，压缩词汇至单行，绝不浪费行预算！）
        const availForBranches = Math.max(1, maxLines - clampedSourceLines.length);
        const vocabCount = contentBranches.filter((b) => b.role === "vocab").length;
        const transCount = Math.max(1, numBranches - vocabCount);
        const availForTrans = Math.max(1, availForBranches - vocabCount);

        let remainingBudget = availForBranches;
        let transHandled = 0;

        const clampedBranchLines: string[] = [...clampedSourceLines];
        for (let i = 0; i < numBranches; i++) {
          const branch = contentBranches[i];
          const isFirst = i === 0;
          const isLast = i === numBranches - 1;
          const branchChar = numBranches === 1 ? "└" : isFirst ? "┌" : isLast ? "└" : "├";
          const contChar = numBranches === 1 || isLast ? " " : "│";
          const isVocab = branch.role === "vocab";
          const headingColor = isVocab ? decMuted : decAccent;
          const contentColor = isVocab ? decDim : (s: string) => s;

          const branchRendered = formatTreeBranch(
            branchChar,
            contChar,
            branch.label,
            branch.content,
            decMuted,
            headingColor,
            decMuted,
            contentColor,
            maxCols
          );

          let branchBudget: number;
          if (isVocab) {
            branchBudget = Math.max(1, Math.min(remainingBudget, 1));
          } else {
            const transLeft = Math.max(1, transCount - transHandled);
            const reservedForRest = (transLeft - 1) + vocabCount;
            const maxPossible = Math.max(1, remainingBudget - reservedForRest);
            const fairShare = Math.ceil(availForTrans / transCount);
            branchBudget = Math.min(maxPossible, Math.max(fairShare, Math.min(branchRendered.length, maxPossible)));
            transHandled++;
          }

          if (branchRendered.length <= branchBudget) {
            clampedBranchLines.push(...branchRendered);
            remainingBudget -= branchRendered.length;
          } else {
            const sliced = branchRendered.slice(0, branchBudget);
            sliced[sliced.length - 1] = truncateVisual(sliced[sliced.length - 1] + "...", maxCols);
            clampedBranchLines.push(...sliced);
            remainingBudget -= sliced.length;
          }
        }
        lines = clampedBranchLines.slice(0, maxLines);
      }
    }
  }

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
  }

  return lines;
}
