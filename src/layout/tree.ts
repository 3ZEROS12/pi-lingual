import { getVisualWidth, truncateVisual, wrapVisualText } from "./width.js";

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
  const actualMaxCols =
    typeof lineDecorator === "number"
      ? lineDecorator
      : typeof maxCols === "number"
        ? maxCols
        : (process.stdout?.columns || 80) - 8;

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

  const cleanText =
    nuanceText.startsWith("(") && nuanceText.endsWith(")")
      ? nuanceText
      : `(${nuanceText})`;

  const lines = wrapVisualText(cleanText, availW);
  return lines.map((line, idx) => {
    if (idx === 0) return contDecorator(rawPrefix) + lineDecorator(line);
    return contDecorator(rawCont) + lineDecorator(line);
  });
}

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

export function spotlightPhrases(text: string, phrases: string[]): string {
  if (!text || phrases.length === 0) return text;

  const sorted = [...new Set(phrases.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return text;

  const alts = sorted.map((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithAscii = /^[a-zA-Z0-9]/.test(phrase);
    const endsWithAscii = /[a-zA-Z0-9]$/.test(phrase);
    return `${startsWithAscii ? "(?<=\\b|^)" : ""}${escaped}${endsWithAscii ? "(?=\\b|$)" : ""}`;
  });
  const combined = new RegExp(`(?:${alts.join("|")})`, "gi");
  return text.replace(combined, (matched) => `\x1b[4m${matched}\x1b[24m`);
}

export function wrapVocabItemsAtomic(vocab: string, availW: number): string[] {
  if (!vocab || !vocab.trim()) return [];
  const items = vocab.split(/\s*(?:·|•)\s*/).map((s) => s.trim()).filter(Boolean);
  if (items.length <= 1) return wrapVisualText(vocab, availW);

  const lines: string[] = [];
  let current = "";
  for (const item of items) {
    const itemW = getVisualWidth(item);
    if (itemW > availW) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(truncateVisual(item, availW));
      continue;
    }
    if (!current) {
      current = item;
    } else if (getVisualWidth(current) + 3 + itemW <= availW) {
      current += ` · ${item}`;
    } else {
      lines.push(current);
      current = item;
    }
  }
  if (current) lines.push(current);
  return lines;
}

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
    const sepW = keptItems.length > 0 ? 3 : 0;

    if (curW + sepW + itemW <= availW) {
      keptItems.push(item);
      curW += sepW + itemW;
    } else {
      if (keptItems.length === 0) {
        return prefix + truncateVisual(item, availW);
      }
      if (curW + 5 <= availW) {
        return prefix + keptItems.join(" · ") + " · ...";
      }
      return prefix + keptItems.join(" · ");
    }
  }

  return prefix + keptItems.join(" · ");
}

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
  const phrases = hasVocab && spotlightEnabled ? extractVocabPhrases(vocab) : [];
  const displaySpoken = phrases.length > 0 ? spotlightPhrases(spoken, phrases) : spoken;
  const displayWritten = written && phrases.length > 0 ? spotlightPhrases(written, phrases) : written;

  const cleanSource = sourceText.replace(/\r?\n+/g, " ").trim();
  const lines: string[] = [`  · [${sourceTag}] ${cleanSource}`];

  const branch1Char = hasSlot2 || hasVocab ? "┌" : "└";
  const cont1Char = hasSlot2 || hasVocab ? "│" : " ";
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

export function formatCapsuleLine(
  hudTitle: string,
  spoken: string,
  written?: string,
  options:
    | number
    | {
        slot1Short?: string;
        slot2Short?: string;
        maxCols?: number;
      } = {}
): string {
  const opts = typeof options === "number" ? { maxCols: options } : options;
  const maxCols =
    opts.maxCols || (process.stdout?.columns ? Math.max(30, process.stdout.columns) : 80);
  const slot1 = opts.slot1Short || "Spk";
  const slot2 = opts.slot2Short || "Wrt";

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
  return getVisualWidth(fullLine) > maxCols ? truncateVisual(fullLine, maxCols) : fullLine;
}
