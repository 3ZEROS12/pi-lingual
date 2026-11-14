import type { LingualResult, LingualI18nLabels, SlotConfig } from "../types.js";
import {
  getBannerMaxCols,
  getEffectiveMaxCols,
  getVisualWidth,
  truncateVisual,
  wrapVisualText,
} from "./width.js";
import {
  formatSubRail,
  formatTreeBranch,
  formatVocabItemsAtomic,
  wrapVocabItemsAtomic,
} from "./tree.js";

export function formatLoadingMessage(
  rawMsg: string,
  maxCols: number = getBannerMaxCols()
): string {
  if (maxCols <= 0) return "";
  const clean = rawMsg.replace(/[\r\n\t]+/g, " ");
  if (getVisualWidth(clean) <= maxCols) return clean;
  return truncateVisual(clean, maxCols);
}

export interface ModePickerOption {
  num: number | string;
  id: string;
  name: string;
  englishTag?: string;
}

export function formatModePickerLines(
  title: string,
  hint: string,
  pair: string,
  options: ModePickerOption[],
  selectedIndex: number,
  maxCols = 78,
  theme?: {
    fg: (color: string, text: string) => string;
    bold?: (text: string) => string;
  }
): string[] {
  const cols = Math.max(20, maxCols);
  const color = (c: string, t: string): string => {
    try {
      return theme && typeof theme.fg === "function" ? theme.fg(c as any, t) : t;
    } catch {
      return t;
    }
  };
  const bold = (t: string): string => {
    try {
      return theme && typeof theme.bold === "function" ? theme.bold(t) : t;
    } catch {
      return t;
    }
  };

  const lines: string[] = [];
  const dividerLength = Math.max(10, Math.min(cols, 76));
  const divider = "─".repeat(dividerLength);

  lines.push(color("muted", divider));
  const rawHeader = ` [lingual · ${pair}] ${title} (${hint})`;
  lines.push(color("muted", truncateVisual(rawHeader, cols)));

  const rawCapsules = options.map((opt) => {
    const showTag =
      opt.englishTag &&
      opt.englishTag.toLowerCase() !== opt.name.toLowerCase();
    const tag = showTag ? ` (${opt.englishTag})` : "";
    return `[${opt.num}] ${opt.name}${tag}`;
  });

  const maxRawWidth = Math.max(...rawCapsules.map((c) => getVisualWidth(c)), 15);
  const colWidth = maxRawWidth + 6;
  const canDoTwoCols = cols >= 65 && colWidth * 2 <= cols;

  if (canDoTwoCols) {
    for (let i = 0; i < options.length; i += 2) {
      const opt2 = options[i + 1];
      const isSel1 = i === selectedIndex;
      const c1Text = rawCapsules[i];
      const cursor1 = isSel1 ? color("accent", "▸") : " ";
      const body1 = isSel1 ? color("accent", bold(c1Text)) : color("text", c1Text);
      const cell1Visual = 4 + getVisualWidth(c1Text);
      const pad1 = " ".repeat(Math.max(0, colWidth - cell1Visual));
      let line = `  ${cursor1} ${body1}${pad1}`;

      if (opt2) {
        const isSel2 = i + 1 === selectedIndex;
        const c2Text = rawCapsules[i + 1];
        const cursor2 = isSel2 ? color("accent", "▸") : " ";
        const body2 = isSel2 ? color("accent", bold(c2Text)) : color("text", c2Text);
        line += `  ${cursor2} ${body2}`;
      }

      lines.push(getVisualWidth(line) > cols ? truncateVisual(line, cols) : line);
    }
  } else {
    for (let i = 0; i < options.length; i++) {
      const isSel = i === selectedIndex;
      const cText = rawCapsules[i];
      const cursor = isSel ? color("accent", "▸") : " ";
      const body = isSel ? color("accent", bold(cText)) : color("text", cText);
      const rawLine = `  ${cursor} ${body}`;
      lines.push(getVisualWidth(rawLine) > cols ? truncateVisual(rawLine, cols) : rawLine);
    }
  }

  lines.push(color("muted", divider));
  return lines;
}

function getBranchRailChars(index: number, total: number, railOpen: boolean): { branchChar: string; contChar: string } {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  if (total === 1) {
    return { branchChar: railOpen ? "├" : "└", contChar: railOpen ? "│" : " " };
  }
  if (isFirst) {
    return { branchChar: "┌", contChar: "│" };
  }
  if (isLast) {
    return { branchChar: railOpen ? "├" : "└", contChar: railOpen ? "│" : " " };
  }
  return { branchChar: "├", contChar: "│" };
}

export function renderCardLayout(
  card: LingualResult,
  labels: LingualI18nLabels,
  options: {
    maxCols?: number;
    maxLines?: number;
    isCompact?: boolean;
    isStreaming?: boolean;
    variant?: "tree" | "preview" | "takeaway" | "none";
    isLong?: boolean;
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
  const railOpen = options.isStreaming === true;
  const pageTag = options.pageTag || "";

  const decMuted = options.themeDecorators?.muted || ((s) => s);
  const decAccent = options.themeDecorators?.accent || ((s) => s);
  const decDim = options.themeDecorators?.dim || ((s) => s);

  let effectiveSlots: SlotConfig[];
  if (options.slots && options.slots.length > 0) {
    effectiveSlots = options.slots.filter((s) => s.enabled);
  } else {
    effectiveSlots = [
      { id: "source", label: labels.sourceLabel || "Source", role: "source", enabled: true },
      { id: "spoken", label: labels.slot1Label || "Spoken", role: "translation", enabled: true, showMeaning: true },
      ...(card.written
        ? [{ id: "written", label: labels.slot2Label || "Written", role: "translation", enabled: true, showMeaning: true } as SlotConfig]
        : []),
      ...(card.vocab ? [{ id: "vocab", label: labels.vocabLabel || "Vocab", role: "vocab", enabled: true } as SlotConfig] : []),
    ];
  }

  const resolveSlotContent = (slot: SlotConfig): { content: string; meaning?: string } => {
    if (slot.role === "source") return { content: card.sourceText || "" };
    if (card.slotOutputs && Object.hasOwn(card.slotOutputs, slot.id)) {
      const out = card.slotOutputs[slot.id];
      return { content: out.content || "", meaning: out.meaning };
    }
    if (card.slots) {
      const match = card.slots.find((s) => s.id === slot.id);
      if (match) return { content: match.content || "", meaning: match.meaning };
    }
    if (slot.id === "spoken" || ((slot.role === "translation" || slot.role === "custom") && !card.slotOutputs)) {
      if (slot.id === "written") return { content: card.written || "", meaning: card.writtenMeaning };
      return { content: card.spoken || "", meaning: card.spokenMeaning };
    }
    if (slot.id === "written") return { content: card.written || "", meaning: card.writtenMeaning };
    if (slot.id === "vocab" || slot.role === "vocab") return { content: card.vocab || "" };
    return { content: "" };
  };

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
        meaning: slot.showMeaning !== false && meaning && meaning.trim() ? meaning.trim() : undefined,
      });
    }
  }

  const variant = options.variant || "tree";
  if (variant === "none") return [];

  if (variant === "preview") {
    const primary = contentBranches.find((b) => b.role !== "vocab");
    const takeaway = contentBranches.find((b) => b.role === "vocab");
    if (!primary && !takeaway) return [];

    const previewLines: string[] = [];
    const pageTagW = pageTag ? getVisualWidth(pageTag) : 0;
    if (primary) {
      const prefixRaw = `⚡ [${primary.label}] `;
      const prefixW = getVisualWidth(prefixRaw);
      const body = truncateVisual(primary.content, Math.max(8, maxCols - prefixW - pageTagW));
      previewLines.push(decAccent(`⚡ [${primary.label}] `) + body + pageTag);
    }
    if (takeaway) {
      const prefix = "   ↳ ";
      const atomic = formatVocabItemsAtomic(takeaway.content, prefix, maxCols);
      const body = atomic.startsWith(prefix) ? atomic.slice(prefix.length) : atomic;
      previewLines.push(decMuted(prefix) + decDim(body));
    }
    return previewLines.slice(0, 2);
  }

  const longTakeaway =
    variant === "takeaway" &&
    options.isLong === true &&
    contentBranches.some((b) => b.role === "vocab");
  const suppressSource = longTakeaway;
  if (longTakeaway) {
    const diffs = contentBranches.filter((b) => b.role === "vocab");
    contentBranches.length = 0;
    contentBranches.push(...diffs);
  }

  if (isCompact || maxCols < 35) {
    const tagWidth = getVisualWidth(pageTag);
    const targetCols =
      typeof options.maxCols === "number" && options.maxCols > 0
        ? Math.min(options.maxCols, maxCols)
        : maxCols;
    const availCols = Math.max(10, targetCols - tagWidth);
    if (contentBranches.length === 0) {
      return [truncateVisual(`⇄ [${labels.hudTitle}] ${card.sourceText}`, availCols) + pageTag];
    }
    const prefix = `⇄ [${labels.hudTitle}] `;
    const prefixW = getVisualWidth(prefix);
    const sepW = (contentBranches.length - 1) * 3;
    const perBranchBudget = Math.max(6, Math.floor((availCols - prefixW - sepW) / contentBranches.length));
    const parts = contentBranches.map((b) => {
      const shortLabel = b.label.slice(0, 4);
      return truncateVisual(`${shortLabel}: ${b.content}`, perBranchBudget);
    });
    return [truncateVisual(prefix + parts.join(" · "), availCols) + pageTag];
  }

  const sourceSlot = effectiveSlots.find((s) => s.role === "source");
  let sourceLines: string[] = [];

  if (!suppressSource && sourceSlot && card.sourceText && card.sourceText.trim()) {
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "Source";
    const prefixRaw = `  · [${sourceLabel}] `;
    const prefixW = getVisualWidth(prefixRaw);
    const pageTagW = pageTag ? getVisualWidth(pageTag) : 0;
    const availLine1W = Math.max(20, maxCols - prefixW - pageTagW);
    const cleanSource = card.sourceText.replace(/\r?\n+/g, " ").trim();

    if (getVisualWidth(cleanSource) <= availLine1W) {
      sourceLines = [decMuted("  · ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + cleanSource + pageTag];
    } else {
      const wrapped = wrapVisualText(cleanSource, Math.max(20, maxCols - prefixW));
      sourceLines = wrapped.map((wLine, idx) => {
        const isLast = idx === wrapped.length - 1;
        const tagSuffix = isLast ? pageTag : "";
        if (idx === 0) {
          return decMuted("  · ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + wLine + tagSuffix;
        }
        return " ".repeat(prefixW) + decDim(wLine) + tagSuffix;
      });
    }
  }

  let lines: string[] = [...sourceLines];
  const numBranches = contentBranches.length;

  const renderBranch = (branch: RenderBranch, index: number, text: string): string[] => {
    const { branchChar, contChar } = getBranchRailChars(index, numBranches, railOpen);
    const isVocab = branch.role === "vocab";
    if (isVocab && /(?:·|•)/.test(text)) {
      const rawPrefix = `  ${branchChar} [${branch.label}] `;
      const prefixW = getVisualWidth(rawPrefix);
      const rawCont = `  ${contChar}${" ".repeat(Math.max(1, prefixW - 3))}`;
      const availW = Math.max(25, maxCols - prefixW);
      const wrapped = wrapVocabItemsAtomic(text, availW);
      if (wrapped.length > 0) {
        return wrapped.map((line, idx) =>
          idx === 0
            ? decMuted(`  ${branchChar} `) + decMuted(`[${branch.label}] `) + decDim(line)
            : decMuted(rawCont) + decDim(line)
        );
      }
    }
    return formatTreeBranch(
      branchChar,
      contChar,
      branch.label,
      text,
      decMuted,
      isVocab ? decMuted : decAccent,
      decMuted,
      isVocab ? decDim : (s: string) => s,
      maxCols
    );
  };

  for (let i = 0; i < numBranches; i++) {
    const branch = contentBranches[i];
    const { contChar } = getBranchRailChars(i, numBranches, railOpen);
    lines.push(...renderBranch(branch, i, branch.content));
    if (branch.meaning) {
      lines.push(...formatSubRail(contChar, branch.meaning, "↳", decMuted, decDim, maxCols));
    }
  }

  if (lines.length > maxLines) {
    const totalBranchLines = contentBranches.reduce((acc, b) => {
      const len = wrapVisualText(b.content, Math.max(25, maxCols - 14)).length;
      return acc + Math.max(1, len);
    }, 0);
    const maxSourceRows = totalBranchLines >= maxLines - 2 || numBranches >= maxLines - 2 ? 1 : 2;
    let clampedSourceLines = sourceLines;
    if (sourceLines.length > maxSourceRows) {
      clampedSourceLines =
        maxSourceRows === 1
          ? [truncateVisual(sourceLines[0] + "...", maxCols)]
          : [sourceLines[0], truncateVisual(sourceLines[1] + "...", maxCols)];
    }

    const inlineLines: string[] = [...clampedSourceLines];
    for (let i = 0; i < numBranches; i++) {
      const branch = contentBranches[i];
      const inlineText = branch.meaning ? `${branch.content} (${branch.meaning})` : branch.content;
      inlineLines.push(...renderBranch(branch, i, inlineText));
    }

    if (inlineLines.length <= maxLines) {
      lines = inlineLines;
    } else {
      const pureLines: string[] = [...clampedSourceLines];
      for (let i = 0; i < numBranches; i++) {
        pureLines.push(...renderBranch(contentBranches[i], i, contentBranches[i].content));
      }

      if (pureLines.length <= maxLines) {
        lines = pureLines;
      } else {
        const availForBranches = Math.max(1, maxLines - clampedSourceLines.length);
        let remainingBudget = availForBranches;
        const clampedBranchLines: string[] = [...clampedSourceLines];

        for (let i = 0; i < numBranches; i++) {
          const branch = contentBranches[i];
          const { branchChar } = getBranchRailChars(i, numBranches, railOpen);
          const isVocab = branch.role === "vocab";
          const branchRendered = renderBranch(branch, i, branch.content);

          let branchBudget: number;
          if (isVocab) {
            branchBudget = Math.max(1, Math.min(branchRendered.length, Math.min(2, remainingBudget)));
          } else {
            const branchesLeftAfterThis = numBranches - 1 - i;
            const maxPossible = Math.max(1, remainingBudget - branchesLeftAfterThis);
            branchBudget = Math.min(maxPossible, Math.min(branchRendered.length, 4));
          }

          if (branchRendered.length <= branchBudget) {
            clampedBranchLines.push(...branchRendered);
            remainingBudget -= branchRendered.length;
          } else if (isVocab) {
            const prefix = decMuted(`  ${branchChar} `) + decMuted("[") + decMuted(branch.label) + decMuted("] ");
            clampedBranchLines.push(formatVocabItemsAtomic(branch.content, prefix, maxCols));
            remainingBudget -= 1;
          } else {
            let preservedCompleteSentences: string[] | null = null;
            if (/[.!?。！？]\s+/.test(branch.content)) {
              const sentenceList = branch.content.trim().split(/(?<=[.!?。！？])\s+/);
              const candidates: string[] = [];
              if (sentenceList.length >= 3) candidates.push(sentenceList.slice(0, 2).join(" "));
              if (sentenceList.length >= 1) candidates.push(sentenceList[0]);
              for (const candidateText of candidates) {
                if (candidateText.length >= 35) {
                  const renderedCand = renderBranch(branch, i, candidateText);
                  if (renderedCand.length <= branchBudget) {
                    preservedCompleteSentences = renderedCand;
                    break;
                  }
                }
              }
            }

            if (preservedCompleteSentences) {
              clampedBranchLines.push(...preservedCompleteSentences);
              remainingBudget -= preservedCompleteSentences.length;
            } else {
              const sliced = branchRendered.slice(0, branchBudget);
              const lastIdx = sliced.length - 1;
              const cleanLastLine = sliced[lastIdx].replace(/[,'"—\-:;]+\s*$/, "");
              sliced[lastIdx] = truncateVisual(cleanLastLine + "...", maxCols);
              clampedBranchLines.push(...sliced);
              remainingBudget -= sliced.length;
            }
          }
        }
        lines = clampedBranchLines.slice(0, maxLines);
      }
    }
  }

  if (lines.length > maxLines) lines = lines.slice(0, maxLines);
  return lines.map((line) => (getVisualWidth(line) > maxCols ? truncateVisual(line, maxCols) : line));
}
