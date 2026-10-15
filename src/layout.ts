/**
 * Terminal Box Model & Layout Engine.
 * 
 * Responsibilities:
 * 1. Strict adherence to Unicode Standard Annex #11 (East Asian Width) for terminal cell widths.
 * 2. Deterministic Kinsoku Shori line-breaking algorithm preventing orphaned punctuation.
 * 3. Strictly bounded 1-line capsule solver immune to terminal column overflow.
 * 4. Trifecta open left-rail tree branch formatting (· ┌ ├ └).
 * 5. Kinetic 9-line budget box model solver guaranteeing lines.length <= 9.
 */

import type { LingualResult, LingualI18nLabels, SlotConfig } from "./types.js";

/**
 * Punctuation set strictly forbidden from starting a line (Kinsoku Shori).
 */
export const CANNOT_START_LINE_CHARS = new Set([
  ",", ".", ";", "!", "?", ":",
  "，", "。", "；", "！", "？", "：", "、",
  ")", "]", "}", "）", "】", "”", "’", "»"
]);

/**
 * Calculates safe visual columns with SIGWINCH crash defense.
 */
export function getEffectiveMaxCols(requested?: number): number {
  const terminalCols =
    process.stdout?.columns ||
    (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : undefined);
  const raw =
    typeof requested === "number"
      ? requested
      : typeof terminalCols === "number" && terminalCols > 0
        ? terminalCols - 8
        : 120;
  return Math.max(25, raw); // Physical minimum 25 columns to prevent negative width overflow
}

const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/**
 * Borderless aboveEditor banners (release notes in open-tree typography) carry no box borders,
 * so they reserve a 2-column right-edge safety margin instead of the HUD card border reserve.
 */
export function getBannerMaxCols(): number {
  const terminalCols =
    process.stdout?.columns ||
    (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : undefined);
  if (typeof terminalCols !== "number" || terminalCols <= 0) return 78;
  // Never render wider than the live terminal, even below the 25-column HUD floor.
  return Math.min(terminalCols, Math.max(25, terminalCols - 2));
}

/**
 * Unicode Standard Annex #11 visual cell width calculation:
 * - ANSI escape sequences (CSI / OSC) = 0 cells
 * - Zero-width characters (ZWJ / variation selectors / combining marks) = 0 cells
 * - CJK wide characters, full-width symbols, Emoji = 2 cells
 * - ASCII Latin characters = 1 cell
 */
export function getVisualWidth(str: string): number {
  let width = 0;
  const clean = str.replace(ANSI_ESCAPE_REGEX, "");
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (
      code === 0x200d ||
      code === 0xfe0f ||
      code === 0xfe0e ||
      (code >= 0x0300 && code <= 0x036f) ||
      (code >= 0x200b && code <= 0x200f)
    ) {
      continue;
    }
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x231a && code <= 0x23ff) ||
      (code >= 0x2600 && code <= 0x27bf) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x1f680 && code <= 0x1f6ff) ||
      (code >= 0x1f900 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x2fa1f)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/** Returns the closing delimiters needed to rebalance a hard-clipped fragment ("" when balanced). */
function closingDelimitersFor(text: string): string {
  const deficit = (opens: RegExp, closes: RegExp) => {
    const o = (text.match(opens) || []).length;
    const c = (text.match(closes) || []).length;
    return Math.max(0, o - c);
  };
  return (
    ")".repeat(deficit(/[\(\[\{]/g, /[\)\]\}]/g)) + "）".repeat(deficit(/[（【]/g, /[）】]/g))
  );
}

/**
 * Truncates text based on visual cell width and ANSI escape boundaries (strictly <= maxVisualCols).
 */
export function truncateVisual(str: string, maxVisualCols: number): string {
  if (maxVisualCols <= 0) return "";
  const singleLine = str.replace(/[\r\n\t]+/g, " ");
  const fullWidth = getVisualWidth(singleLine);
  if (fullWidth <= maxVisualCols) return singleLine;
  if (maxVisualCols <= 3) return ".".repeat(maxVisualCols);

  // Reserve 3 visual columns for ellipsis "..." to ensure total width <= maxVisualCols
  const clipAt = (limit: number): string => {
    let curWidth = 0;
    let result = "";
    let i = 0;

    while (i < singleLine.length) {
      ANSI_ESCAPE_REGEX.lastIndex = i;
      const ansiMatch = ANSI_ESCAPE_REGEX.exec(singleLine);
      if (ansiMatch && ansiMatch.index === i) {
        result += ansiMatch[0];
        i += ansiMatch[0].length;
        continue;
      }

      const code = singleLine.codePointAt(i) || 0;
      const charLen = code > 0xffff ? 2 : 1;
      const ch = singleLine.slice(i, i + charLen);
      const w = getVisualWidth(ch);

      if (curWidth + w > limit) {
        break;
      }
      result += ch;
      curWidth += w;
      i += charLen;
    }

    return result.replace(/\s*[\(\[\{（【]$/, "");
  };

  const targetCols = Math.max(1, maxVisualCols - 3);
  let result = clipAt(targetCols);

  // Invariant 11: never leave a dangling unclosed parenthesis after a hard clip.
  const closers = closingDelimitersFor(result);
  const closerWidth = getVisualWidth(closers);
  if (closerWidth > 0 && targetCols > closerWidth) {
    result = clipAt(targetCols - closerWidth) + closers;
  }

  return result + (singleLine.includes("\x1b") ? "\x1b[0m" : "") + "...";
}

/**
 * Visual text wrapping algorithm bounded by punctuation Kinsoku Shori and max visual width.
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
        // Wrap single oversized unspaced tokens (long URLs / paths) smoothly by column width
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

  // Kinsoku Shori line-head punctuation constraint processing
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (i > 0 && line.length > 0 && lines.length > 0) {
      const firstChar = line[0];
      if (CANNOT_START_LINE_CHARS.has(firstChar)) {
        const prevIdx = lines.length - 1;
        const prevLine = lines[prevIdx];
        if (getVisualWidth(prevLine) + getVisualWidth(firstChar) <= maxWidth) {
          lines[prevIdx] = prevLine + firstChar;
          line = line.slice(1).trimStart();
        } else {
          const prevChars = Array.from(prevLine);
          if (prevChars.length > 1) {
            const pulledChar = prevChars.pop()!;
            lines[prevIdx] = prevChars.join("");
            line = pulledChar + line;
          }
        }
      }
    }
    if (line.trim()) {
      lines.push(line);
    }
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Formats tree branches with hanging indent (· ┌ ├ └).
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
 * Formats native nuance sub-rail (↳).
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
 * Extracts clean target phrases from vocab string (sorted longest first).
 * e.g.: "on board with (agree) · dive in (start right away)"
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
 * Highlights target phrases non-destructively using ANSI underline (Spotlight Highlighting).
 * Case-insensitive match preserving original casing and formatting.
 * Supports CJK ideographs and ASCII characters.
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
 * Formats vocabulary terms in a single line at item level without mid-word cuts or unclosed parentheses.
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
 * Formats terminal panoramic tree branch output (formatTerminalAnnotation).
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
 * Formats dense single-line capsule layout for narrow viewports.
 * Strictly constrained to 1 line, dynamically balanced by column width.
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
 * Box model layout solver (renderCardLayout).
 * Solves 9-line kinetic budget, tree branch formatting, and compact capsule degradation.
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

  // 0. Parse dynamic multi-slots from card or options
  let effectiveSlots: SlotConfig[] = [];
  if (options.slots && options.slots.length > 0) {
    effectiveSlots = options.slots.filter((s) => s.enabled);
  } else {
    // Fallback default slots
    effectiveSlots = [
      { id: "source", label: labels.sourceLabel || "Source", role: "source", enabled: true },
      { id: "spoken", label: labels.slot1Label || "Spoken", role: "translation", enabled: true, showMeaning: true },
      ...(card.written ? [{ id: "written", label: labels.slot2Label || "Written", role: "translation", enabled: true, showMeaning: true } as SlotConfig] : []),
      ...(card.vocab ? [{ id: "vocab", label: labels.vocabLabel || "Vocab", role: "vocab", enabled: true } as SlotConfig] : []),
    ];
  }

  // Resolve slot content
  const resolveSlotContent = (slot: SlotConfig): { content: string; meaning?: string } => {
    if (slot.role === "source") {
      return { content: card.sourceText || "" };
    }
    if (card.slotOutputs && Object.hasOwn(card.slotOutputs, slot.id)) {
      const out = card.slotOutputs[slot.id];
      return { content: out.content || "", meaning: out.meaning };
    }
    if (card.slots) {
      const match = card.slots.find((s) => s.id === slot.id);
      if (match) {
        return { content: match.content || "", meaning: match.meaning };
      }
    }
    // Backward compatibility fields
    if (slot.id === "spoken" || ((slot.role === "translation" || slot.role === "custom") && !card.slotOutputs)) {
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

  // Filter non-source slots with content
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
        role: slot.role || "translation",
        content: content.trim(),
        meaning: (slot.showMeaning !== false && meaning && meaning.trim()) ? meaning.trim() : undefined,
      });
    }
  }

  // 1. Compact capsule fallback when requested or when viewport is < 35 columns
  if (isCompact || maxCols < 35) {
    const tagWidth = getVisualWidth(pageTag);
    const availCols = Math.max(20, maxCols - tagWidth);
    if (contentBranches.length === 0) {
      return [truncateVisual(`⇄ [${labels.hudTitle}] ${card.sourceText}`, availCols) + pageTag];
    }
    const prefix = `⇄ [${labels.hudTitle}] `;
    const prefixW = getVisualWidth(prefix);
    const sepW = (contentBranches.length - 1) * 3;
    const perBranchBudget = Math.max(12, Math.floor((availCols - prefixW - sepW) / contentBranches.length));
    const parts = contentBranches.map((b) => {
      const shortLabel = b.label.slice(0, 4);
      return truncateVisual(`${shortLabel}: ${b.content}`, perBranchBudget);
    });
    const fullText = prefix + parts.join(" · ");
    return [truncateVisual(fullText, availCols) + pageTag];
  }

  // 2. Render source text branch if present
  const sourceSlot = effectiveSlots.find((s) => s.role === "source");
  let sourceLines: string[] = [];

  if (sourceSlot && card.sourceText && card.sourceText.trim()) {
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "Source";
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

  // 3. Dynamically format non-source slot branches (Trifecta Tree Rails)
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

  // 4. Kinetic Line Budget Guard: lines.length <= maxLines constraint solver
  if (lines.length > maxLines) {
    // Tier 1 constraint: clamp source text to at most 1-2 lines
    const maxSourceRows = numBranches >= maxLines - 1 ? 1 : 2;
    let clampedSourceLines = sourceLines;
    if (sourceLines.length > maxSourceRows) {
      if (maxSourceRows === 1) {
        clampedSourceLines = [truncateVisual(sourceLines[0] + "...", maxCols)];
      } else {
        clampedSourceLines = [
          sourceLines[0],
          truncateVisual(sourceLines[1] + "...", maxCols),
        ];
      }
    }

    // Tier 2 constraint: inline native nuances into parentheses to eliminate sub-rails
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
      // Tier 3 constraint: strip nuances to preserve target language sentence integrity
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
        // Tier 4 constraint: asymmetric slot budget clamping with clean visual ellipsis
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
            branchBudget = Math.max(1, Math.min(branchRendered.length, Math.min(2, remainingBudget)));
          } else {
            const branchesLeftAfterThis = numBranches - 1 - i;
            const maxPossible = Math.max(1, remainingBudget - branchesLeftAfterThis);
            const evenShare = Math.max(1, Math.floor(remainingBudget / Math.max(1, numBranches - i)));
            branchBudget = Math.min(maxPossible, Math.min(branchRendered.length, Math.max(evenShare, 2)));
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

  return lines.map((line) => (getVisualWidth(line) > maxCols ? truncateVisual(line, maxCols) : line));
}
