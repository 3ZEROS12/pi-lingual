"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  default: () => extension_default,
  extractRecentContextAnchor: () => extractRecentContextAnchor
});
module.exports = __toCommonJS(extension_exports);
var import_node_child_process = require("child_process");

// src/layout.ts
var CANNOT_START_LINE_CHARS = /* @__PURE__ */ new Set([
  ",",
  ".",
  ";",
  "!",
  "?",
  ":",
  "\uFF0C",
  "\u3002",
  "\uFF1B",
  "\uFF01",
  "\uFF1F",
  "\uFF1A",
  "\u3001",
  ")",
  "]",
  "}",
  "\uFF09",
  "\u3011",
  "\u201D",
  "\u2019",
  "\xBB"
]);
function getEffectiveMaxCols(requested) {
  const terminalCols = process.stdout?.columns || (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : void 0);
  if (typeof requested === "number") {
    if (typeof terminalCols === "number" && terminalCols > 0) {
      return Math.min(terminalCols, Math.max(10, requested));
    }
    return Math.max(25, requested);
  }
  const raw = typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 8 : 120;
  if (typeof terminalCols === "number" && terminalCols > 0) {
    return Math.min(terminalCols, Math.max(10, raw));
  }
  return Math.max(25, raw);
}
var ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
function getBannerMaxCols() {
  const terminalCols = process.stdout?.columns || (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : void 0);
  if (typeof terminalCols !== "number" || terminalCols <= 0) return 78;
  return Math.min(terminalCols, Math.max(25, terminalCols - 2));
}
function getVisualWidth(str) {
  let width = 0;
  const clean = str.replace(ANSI_ESCAPE_REGEX, "");
  let afterZWJ = false;
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (code === 8205 || code === 65039 || code === 65038 || code >= 127995 && code <= 127999 || code >= 768 && code <= 879 || code >= 6832 && code <= 6911 || code >= 7616 && code <= 7679 || code >= 8400 && code <= 8447 || code >= 65056 && code <= 65071 || code >= 917760 && code <= 917999 || code >= 8203 && code <= 8207) {
      if (code === 8205) afterZWJ = true;
      continue;
    }
    if (afterZWJ) {
      afterZWJ = false;
      continue;
    }
    if (code >= 4352 && code <= 4447 || code >= 8986 && code <= 9215 || code >= 9728 && code <= 10175 || code >= 11904 && code <= 42191 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65040 && code <= 65049 || code >= 65072 && code <= 65135 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 127744 && code <= 128591 || code >= 128640 && code <= 128767 || code >= 129280 && code <= 129791 || code >= 131072 && code <= 195103) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
function closingDelimitersFor(text) {
  const clean = text.replace(ANSI_ESCAPE_REGEX, "");
  const pairs = [
    [/\(/g, /\)/g, ")"],
    [/\[/g, /\]/g, "]"],
    [/\{/g, /\}/g, "}"],
    [/（/g, /）/g, "\uFF09"],
    [/【/g, /】/g, "\u3011"],
    [/「/g, /」/g, "\u300D"],
    [/『/g, /』/g, "\u300F"]
  ];
  let closers = "";
  for (const [openRe, closeRe, closer] of pairs) {
    const o = (clean.match(openRe) || []).length;
    const c = (clean.match(closeRe) || []).length;
    if (o > c) {
      closers += closer.repeat(o - c);
    }
  }
  return closers;
}
function truncateVisual(str, maxVisualCols) {
  if (maxVisualCols <= 0) return "";
  const singleLine = str.replace(/[\r\n\t]+/g, " ");
  const fullWidth = getVisualWidth(singleLine);
  if (fullWidth <= maxVisualCols) return singleLine;
  if (maxVisualCols <= 3) return ".".repeat(maxVisualCols);
  const clipAt = (limit) => {
    let curWidth = 0;
    let result2 = "";
    let i = 0;
    while (i < singleLine.length) {
      ANSI_ESCAPE_REGEX.lastIndex = i;
      const ansiMatch = ANSI_ESCAPE_REGEX.exec(singleLine);
      if (ansiMatch && ansiMatch.index === i) {
        result2 += ansiMatch[0];
        i += ansiMatch[0].length;
        continue;
      }
      const code = singleLine.codePointAt(i) || 0;
      const charLen = code > 65535 ? 2 : 1;
      const ch = singleLine.slice(i, i + charLen);
      const w = getVisualWidth(ch);
      if (curWidth + w > limit) {
        break;
      }
      result2 += ch;
      curWidth += w;
      i += charLen;
    }
    const cleanTail = result2.replace(ANSI_ESCAPE_REGEX, "");
    if (/[a-zA-Z\u0400-\u04FF]$/.test(cleanTail)) {
      const lastSpace = result2.lastIndexOf(" ");
      if (lastSpace > limit * 0.45) {
        result2 = result2.slice(0, lastSpace);
      }
    }
    return result2.replace(/\s*[\(\[\{（【]$/, "");
  };
  const targetCols = Math.max(1, maxVisualCols - 3);
  let result = clipAt(targetCols);
  const closers = closingDelimitersFor(result);
  const closerWidth = getVisualWidth(closers);
  if (closerWidth > 0 && targetCols > closerWidth) {
    result = clipAt(targetCols - closerWidth) + closers;
  }
  return result + (singleLine.includes("\x1B") ? "\x1B[0m" : "") + "...";
}
function formatLoadingMessage(rawMsg, maxCols = getBannerMaxCols()) {
  if (maxCols <= 0) return "";
  const clean = rawMsg.replace(/[\r\n\t]+/g, " ");
  if (getVisualWidth(clean) <= maxCols) return clean;
  return truncateVisual(clean, maxCols);
}
function formatModePickerLines(title, hint, pair, options, selectedIndex, maxCols = 78, theme) {
  const cols = Math.max(20, maxCols);
  const color = (c, t) => {
    try {
      return theme && typeof theme.fg === "function" ? theme.fg(c, t) : t;
    } catch {
      return t;
    }
  };
  const bold = (t) => {
    try {
      return theme && typeof theme.bold === "function" ? theme.bold(t) : t;
    } catch {
      return t;
    }
  };
  const lines = [];
  const dividerLength = Math.max(10, Math.min(cols, 76));
  const divider = "\u2500".repeat(dividerLength);
  lines.push(color("muted", divider));
  const rawHeader = ` [lingual \xB7 ${pair}] ${title} (${hint})`;
  lines.push(color("muted", truncateVisual(rawHeader, cols)));
  const rawCapsules = options.map((opt) => {
    const showTag = opt.englishTag && opt.englishTag.toLowerCase() !== opt.name.toLowerCase();
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
      const cursor1 = isSel1 ? color("accent", "\u25B8") : " ";
      const body1 = isSel1 ? color("accent", bold(c1Text)) : color("text", c1Text);
      const cell1Visual = 4 + getVisualWidth(c1Text);
      const pad1 = " ".repeat(Math.max(0, colWidth - cell1Visual));
      let line = `  ${cursor1} ${body1}${pad1}`;
      if (opt2) {
        const isSel2 = i + 1 === selectedIndex;
        const c2Text = rawCapsules[i + 1];
        const cursor2 = isSel2 ? color("accent", "\u25B8") : " ";
        const body2 = isSel2 ? color("accent", bold(c2Text)) : color("text", c2Text);
        line += `  ${cursor2} ${body2}`;
      }
      lines.push(getVisualWidth(line) > cols ? truncateVisual(line, cols) : line);
    }
  } else {
    for (let i = 0; i < options.length; i++) {
      const isSel = i === selectedIndex;
      const cText = rawCapsules[i];
      const cursor = isSel ? color("accent", "\u25B8") : " ";
      const body = isSel ? color("accent", bold(cText)) : color("text", cText);
      const rawLine = `  ${cursor} ${body}`;
      lines.push(getVisualWidth(rawLine) > cols ? truncateVisual(rawLine, cols) : rawLine);
    }
  }
  lines.push(color("muted", divider));
  return lines;
}
function wrapVisualText(text, maxWidth) {
  if (maxWidth <= 0) return [text];
  const rawLines = [];
  let currentLine = "";
  let currentWidth = 0;
  const tokenRegex = /\x1b\[[0-9;]*[a-zA-Z]|\s+|[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]|[^\s\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\x1b]+/g;
  let match;
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
  const lines = [];
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
            const pulledChar = prevChars.pop();
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
function formatTreeBranch(branchChar, contChar, tag, content, prefixDecorator = (s) => s, tagDecorator = (s) => s, contDecorator = (s) => s, lineDecorator = (s) => s, maxCols = (process.stdout?.columns || 80) - 8) {
  const actualLineDecorator = typeof lineDecorator === "function" ? lineDecorator : (s) => s;
  const actualMaxCols = typeof lineDecorator === "number" ? lineDecorator : typeof maxCols === "number" ? maxCols : (process.stdout?.columns || 80) - 8;
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
function formatSubRail(contChar, nuanceText, arrow = "\u21B3", contDecorator = (s) => s, lineDecorator = (s) => s, maxCols = (process.stdout?.columns || 80) - 8, indentCols = 11) {
  if (!nuanceText || !nuanceText.trim()) return [];
  const rawPrefix = `  ${contChar}${" ".repeat(Math.max(1, indentCols - 5))}${arrow} `;
  const prefixW = getVisualWidth(rawPrefix);
  const rawCont = `  ${contChar}${" ".repeat(Math.max(1, prefixW - 3))}`;
  const availW = Math.max(20, maxCols - prefixW);
  const cleanText = nuanceText.startsWith("(") && nuanceText.endsWith(")") ? nuanceText : `(${nuanceText})`;
  const lines = wrapVisualText(cleanText, availW);
  return lines.map((line, idx) => {
    if (idx === 0) {
      return contDecorator(rawPrefix) + lineDecorator(line);
    }
    return contDecorator(rawCont) + lineDecorator(line);
  });
}
function extractVocabPhrases(vocab) {
  if (!vocab || !vocab.trim()) return [];
  const items = vocab.split(/\s*(?:·|•|,)\s*/);
  const phrases = [];
  for (const raw of items) {
    const clean = raw.replace(/\s*(?:\(.*?\)|（.*?）)\s*$/, "").trim();
    if (clean.length >= 2 && !phrases.includes(clean)) {
      phrases.push(clean);
    }
  }
  return phrases.sort((a, b) => b.length - a.length);
}
function spotlightPhrases(text, phrases) {
  if (!text || phrases.length === 0) return text;
  let result = text;
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithAscii = /^[a-zA-Z0-9]/.test(phrase);
    const endsWithAscii = /[a-zA-Z0-9]$/.test(phrase);
    const pattern = `${startsWithAscii ? "(?<=\\b|^)" : ""}${escaped}${endsWithAscii ? "(?=\\b|$)" : ""}`;
    const regex = new RegExp(pattern, "gi");
    result = result.replace(regex, (matched) => `\x1B[4m${matched}\x1B[24m`);
  }
  return result;
}
function formatTerminalAnnotation(sourceText, spoken, written, vocab, options = {}) {
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
  const lines = [`  \xB7 [${sourceTag}] ${cleanSource}`];
  const branch1Char = hasSlot2 || hasVocab ? "\u250C" : "\u2514";
  const cont1Char = hasSlot2 || hasVocab ? "\u2502" : " ";
  lines.push(...formatTreeBranch(branch1Char, cont1Char, slot1, displaySpoken));
  if (options.spokenMeaning) {
    lines.push(...formatSubRail(cont1Char, options.spokenMeaning));
  }
  if (hasSlot2) {
    const branchChar = hasVocab ? "\u251C" : "\u2514";
    const contChar = hasVocab ? "\u2502" : " ";
    lines.push(...formatTreeBranch(branchChar, contChar, slot2, displayWritten));
    if (options.writtenMeaning) {
      lines.push(...formatSubRail(contChar, options.writtenMeaning));
    }
  }
  if (hasVocab) {
    lines.push(...formatTreeBranch("\u2514", " ", vocabTag, vocab));
  }
  return lines.join("\n");
}
function renderCardLayout(card, labels, options = {}) {
  const maxCols = getEffectiveMaxCols(options.maxCols);
  const maxLines = options.maxLines || 9;
  const isCompact = Boolean(options.isCompact);
  const pageTag = options.pageTag || "";
  const decMuted = options.themeDecorators?.muted || ((s) => s);
  const decAccent = options.themeDecorators?.accent || ((s) => s);
  const decDim = options.themeDecorators?.dim || ((s) => s);
  let effectiveSlots = [];
  if (options.slots && options.slots.length > 0) {
    effectiveSlots = options.slots.filter((s) => s.enabled);
  } else {
    effectiveSlots = [
      { id: "source", label: labels.sourceLabel || "Source", role: "source", enabled: true },
      { id: "spoken", label: labels.slot1Label || "Spoken", role: "translation", enabled: true, showMeaning: true },
      ...card.written ? [{ id: "written", label: labels.slot2Label || "Written", role: "translation", enabled: true, showMeaning: true }] : [],
      ...card.vocab ? [{ id: "vocab", label: labels.vocabLabel || "Vocab", role: "vocab", enabled: true }] : []
    ];
  }
  const resolveSlotContent = (slot) => {
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
    if (slot.id === "spoken" || (slot.role === "translation" || slot.role === "custom") && !card.slotOutputs) {
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
  const contentBranches = [];
  for (const slot of effectiveSlots) {
    if (slot.role === "source") continue;
    const { content, meaning } = resolveSlotContent(slot);
    if (content && content.trim()) {
      contentBranches.push({
        id: slot.id,
        label: slot.label,
        role: slot.role || "translation",
        content: content.trim(),
        meaning: slot.showMeaning !== false && meaning && meaning.trim() ? meaning.trim() : void 0
      });
    }
  }
  if (isCompact || maxCols < 35) {
    const tagWidth = getVisualWidth(pageTag);
    const targetCols = typeof options.maxCols === "number" && options.maxCols > 0 ? Math.min(options.maxCols, maxCols) : maxCols;
    const availCols = Math.max(10, targetCols - tagWidth);
    if (contentBranches.length === 0) {
      return [truncateVisual(`\u21C4 [${labels.hudTitle}] ${card.sourceText}`, availCols) + pageTag];
    }
    const prefix = `\u21C4 [${labels.hudTitle}] `;
    const prefixW = getVisualWidth(prefix);
    const sepW = (contentBranches.length - 1) * 3;
    const perBranchBudget = Math.max(6, Math.floor((availCols - prefixW - sepW) / contentBranches.length));
    const parts = contentBranches.map((b) => {
      const shortLabel = b.label.slice(0, 4);
      return truncateVisual(`${shortLabel}: ${b.content}`, perBranchBudget);
    });
    const fullText = prefix + parts.join(" \xB7 ");
    return [truncateVisual(fullText, availCols) + pageTag];
  }
  const sourceSlot = effectiveSlots.find((s) => s.role === "source");
  let sourceLines = [];
  if (sourceSlot && card.sourceText && card.sourceText.trim()) {
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "Source";
    const prefixRaw = `  \xB7 [${sourceLabel}] `;
    const prefixW = getVisualWidth(prefixRaw);
    const pageTagW = pageTag ? getVisualWidth(pageTag) : 0;
    const availLine1W = Math.max(20, maxCols - prefixW - pageTagW);
    const cleanSource = card.sourceText.replace(/\r?\n+/g, " ").trim();
    if (getVisualWidth(cleanSource) <= availLine1W) {
      sourceLines = [
        decMuted("  \xB7 ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + cleanSource + pageTag
      ];
    } else {
      const wrapped = wrapVisualText(cleanSource, Math.max(20, maxCols - prefixW));
      sourceLines = wrapped.map((wLine, idx) => {
        const isLast = idx === wrapped.length - 1;
        const tagSuffix = isLast ? pageTag : "";
        if (idx === 0) {
          return decMuted("  \xB7 ") + decMuted("[") + decDim(sourceLabel) + decMuted("] ") + wLine + tagSuffix;
        }
        return " ".repeat(prefixW) + decDim(wLine) + tagSuffix;
      });
    }
  }
  let lines = [...sourceLines];
  const numBranches = contentBranches.length;
  for (let i = 0; i < numBranches; i++) {
    const branch = contentBranches[i];
    const isFirst = i === 0;
    const isLast = i === numBranches - 1;
    let branchChar = "\u251C";
    let contChar = "\u2502";
    if (numBranches === 1) {
      branchChar = "\u2514";
      contChar = " ";
    } else if (isFirst) {
      branchChar = "\u250C";
      contChar = "\u2502";
    } else if (isLast) {
      branchChar = "\u2514";
      contChar = " ";
    }
    const isVocab = branch.role === "vocab";
    const contentColor = isVocab ? decDim : (s) => s;
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
      lines.push(...formatSubRail(contChar, branch.meaning, "\u21B3", decMuted, decDim, maxCols));
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
      if (maxSourceRows === 1) {
        clampedSourceLines = [truncateVisual(sourceLines[0] + "...", maxCols)];
      } else {
        clampedSourceLines = [
          sourceLines[0],
          truncateVisual(sourceLines[1] + "...", maxCols)
        ];
      }
    }
    const inlineLines = [...clampedSourceLines];
    for (let i = 0; i < numBranches; i++) {
      const branch = contentBranches[i];
      const isFirst = i === 0;
      const isLast = i === numBranches - 1;
      const branchChar = numBranches === 1 ? "\u2514" : isFirst ? "\u250C" : isLast ? "\u2514" : "\u251C";
      const contChar = numBranches === 1 || isLast ? " " : "\u2502";
      const isVocab = branch.role === "vocab";
      const headingColor = isVocab ? decMuted : decAccent;
      const contentColor = isVocab ? decDim : (s) => s;
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
      const pureLines = [...clampedSourceLines];
      for (let i = 0; i < numBranches; i++) {
        const branch = contentBranches[i];
        const isFirst = i === 0;
        const isLast = i === numBranches - 1;
        const branchChar = numBranches === 1 ? "\u2514" : isFirst ? "\u250C" : isLast ? "\u2514" : "\u251C";
        const contChar = numBranches === 1 || isLast ? " " : "\u2502";
        const isVocab = branch.role === "vocab";
        const headingColor = isVocab ? decMuted : decAccent;
        const contentColor = isVocab ? decDim : (s) => s;
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
        const availForBranches = Math.max(1, maxLines - clampedSourceLines.length);
        const vocabCount = contentBranches.filter((b) => b.role === "vocab").length;
        const transCount = Math.max(1, numBranches - vocabCount);
        const availForTrans = Math.max(1, availForBranches - vocabCount);
        let remainingBudget = availForBranches;
        let transHandled = 0;
        const clampedBranchLines = [...clampedSourceLines];
        for (let i = 0; i < numBranches; i++) {
          const branch = contentBranches[i];
          const isFirst = i === 0;
          const isLast = i === numBranches - 1;
          const branchChar = numBranches === 1 ? "\u2514" : isFirst ? "\u250C" : isLast ? "\u2514" : "\u251C";
          const contChar = numBranches === 1 || isLast ? " " : "\u2502";
          const isVocab = branch.role === "vocab";
          const headingColor = isVocab ? decMuted : decAccent;
          const contentColor = isVocab ? decDim : (s) => s;
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
          let branchBudget;
          if (isVocab) {
            branchBudget = Math.max(1, Math.min(branchRendered.length, Math.min(2, remainingBudget)));
          } else {
            const branchesLeftAfterThis = numBranches - 1 - i;
            const maxPossible = Math.max(1, remainingBudget - branchesLeftAfterThis);
            branchBudget = Math.min(maxPossible, Math.min(branchRendered.length, 3));
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
  return lines.map((line) => getVisualWidth(line) > maxCols ? truncateVisual(line, maxCols) : line);
}

// src/engine.ts
var import_node_fs = __toESM(require("fs"), 1);
var import_node_path = __toESM(require("path"), 1);
var import_node_os = __toESM(require("os"), 1);

// src/prompts.ts
var SLOT_LABELS_BY_LANG = {
  zh: {
    source: "\u539F\u6587",
    spoken: "\u53E3\u8BED",
    written: "\u5199\u4F5C",
    vocab: "\u91CD\u70B9",
    en_direct: "\u89C4\u8303\u82F1\u6587",
    direct_vocab: "\u6838\u5FC3\u8868\u8FBE",
    concise: "\u6781\u7B80\u884C\u52A8",
    spec: "\u7ED3\u6784\u89C4\u8303",
    deep: "\u6839\u56E0\u6EAF\u6E90",
    prompt_vocab: "\u6838\u5FC3\u8868\u8FBE",
    fixed: "\u539F\u53E5\u4FEE\u8865",
    native: "\u5730\u9053\u8868\u8FBE",
    fixes: "\u6536\u83B7\u590D\u76D8"
  },
  tw: {
    source: "\u539F\u6587",
    spoken: "\u53E3\u8A9E",
    written: "\u5BEB\u4F5C",
    vocab: "\u91CD\u9EDE",
    en_direct: "\u898F\u7BC4\u82F1\u6587",
    direct_vocab: "\u6838\u5FC3\u8868\u9054",
    concise: "\u6975\u7C21\u884C\u52D5",
    spec: "\u7D50\u69CB\u898F\u7BC4",
    deep: "\u6839\u56E0\u6EAF\u6E90",
    prompt_vocab: "\u6838\u5FC3\u8868\u9054",
    fixed: "\u539F\u53E5\u4FEE\u88DC",
    native: "\u9053\u5730\u8868\u9054",
    fixes: "\u6536\u7A6B\u8907\u76E4"
  },
  ja: {
    source: "\u539F\u6587",
    spoken: "\u53E3\u8A9E",
    written: "\u6587\u9762",
    vocab: "\u5358\u8A9E",
    en_direct: "\u6A19\u6E96\u82F1\u8A9E",
    direct_vocab: "\u91CD\u8981\u8A9E\u5F59",
    concise: "\u7C21\u6F54\u30FB\u9AD8\u52B9\u7387",
    spec: "\u69CB\u9020\u5316\u4ED5\u69D8",
    deep: "\u6839\u672C\u539F\u56E0\u30FB\u53B3\u5BC6",
    prompt_vocab: "\u91CD\u8981\u8A9E\u5F59",
    fixed: "\u539F\u6587\u4FEE\u6B63",
    native: "\u81EA\u7136\u8868\u73FE",
    fixes: "\u91CD\u8981\u30DD\u30A4\u30F3\u30C8"
  },
  ko: {
    source: "\uC6D0\uBB38",
    spoken: "\uAD6C\uC5B4",
    written: "\uBB38\uC5B4",
    vocab: "\uD575\uC2EC\uC5B4\uD718",
    en_direct: "\uADDC\uACA9\uC601\uC5B4",
    direct_vocab: "\uD575\uC2EC\uD45C\uD604",
    concise: "\uAC04\uACB0\uD55C \uD589\uB3D9",
    spec: "\uAD6C\uC870\uD654 \uC0AC\uC591",
    deep: "\uADFC\uBCF8\uC6D0\uC778 \uC5C4\uBC00",
    prompt_vocab: "\uD575\uC2EC\uD45C\uD604",
    fixed: "\uC6D0\uBB38\uC218\uC815",
    native: "\uC790\uC5F0\uC2A4\uB7EC\uC6B4\uD45C\uD604",
    fixes: "\uD575\uC2EC\uD3EC\uC778\uD2B8"
  },
  es: {
    source: "Original",
    spoken: "Coloquial",
    written: "Escrito",
    vocab: "Vocabulario",
    en_direct: "Ingl\xE9s L\xF3gico",
    direct_vocab: "T\xE9rminos clave",
    concise: "Conciso",
    spec: "Estructurado",
    deep: "Rigor profundo",
    prompt_vocab: "Vocabulario",
    fixed: "Corregido",
    native: "Nativo",
    fixes: "Puntos clave"
  },
  fr: {
    source: "Original",
    spoken: "Oral",
    written: "\xC9crit",
    vocab: "Vocabulaire",
    en_direct: "Anglais Logique",
    direct_vocab: "Termes cl\xE9s",
    concise: "Concis",
    spec: "Structur\xE9",
    deep: "Rigueur approfondie",
    prompt_vocab: "Vocabulaire",
    fixed: "Corrig\xE9",
    native: "Naturel",
    fixes: "Points cl\xE9s"
  },
  de: {
    source: "Original",
    spoken: "Gesprochen",
    written: "Schriftlich",
    vocab: "Vokabeln",
    en_direct: "Logisches Englisch",
    direct_vocab: "Schl\xFCsselbegriffe",
    concise: "Pr\xE4gnant",
    spec: "Strukturiert",
    deep: "Ursachenanalyse",
    prompt_vocab: "Schl\xFCsselbegriffe",
    fixed: "Korrigiert",
    native: "Nativ",
    fixes: "Wichtige Punkte"
  },
  ru: {
    source: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    spoken: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439",
    written: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439",
    vocab: "\u041B\u0435\u043A\u0441\u0438\u043A\u0430",
    en_direct: "\u0422\u0435\u0445-\u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
    direct_vocab: "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430",
    concise: "\u041A\u0440\u0430\u0442\u043A\u043E",
    spec: "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E",
    deep: "\u041F\u0435\u0440\u0432\u043E\u043F\u0440\u0438\u0447\u0438\u043D\u0430",
    prompt_vocab: "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430",
    fixed: "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E",
    native: "\u041D\u0430\u0442\u0438\u0432\u043D\u044B\u0439",
    fixes: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435"
  },
  en: {
    source: "Original",
    spoken: "Spoken",
    written: "Written",
    vocab: "Vocab",
    en_direct: "Logical Spec",
    direct_vocab: "Key Terms",
    concise: "Concise",
    spec: "Structured",
    deep: "Deep Rigor",
    prompt_vocab: "Vocab",
    fixed: "Fixed",
    native: "Native",
    fixes: "Takeaway"
  }
};
function resolveSlotLabels(lang = "en") {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  return SLOT_LABELS_BY_LANG[norm] || SLOT_LABELS_BY_LANG.en;
}
function localizeSlotLabel(slotId, currentLabel, sourceLang = "en") {
  const isChineseSource = sourceLang === "zh" || sourceLang === "tw";
  const hasChinese = /[\u4e00-\u9fa5]/.test(currentLabel || "");
  const sl = resolveSlotLabels(sourceLang);
  const normId = (slotId || "").toLowerCase();
  if (!isChineseSource && (hasChinese || !currentLabel)) {
    switch (normId) {
      case "source":
        return sl.source;
      case "spoken":
        return sl.spoken;
      case "written":
        return sl.written;
      case "direct_vocab":
        return sl.direct_vocab;
      case "prompt_vocab":
        return sl.prompt_vocab;
      case "vocab":
        if (currentLabel === "\u6838\u5FC3\u8868\u8FBE" || currentLabel === "\u6838\u5FC3\u8868\u9054" || currentLabel === "\u91CD\u8981\u8A9E\u5F59" || currentLabel === "\u91CD\u8981\u8868\u73FE") {
          return sl.direct_vocab;
        }
        return sl.vocab;
      case "direct_spec":
      case "en_direct":
      case "spec":
        return sl.en_direct;
      case "fixed":
        return sl.fixed;
      case "native":
        return sl.native;
      case "fixes":
      case "takeaways":
      case "takeaway":
        return sl.fixes;
      default:
        if (normId.includes("source")) return sl.source;
        if (normId.includes("spoken")) return sl.spoken;
        if (normId.includes("written")) return sl.written;
        if (normId.includes("vocab")) return sl.vocab;
        if (normId.includes("spec") || normId.includes("direct")) return sl.en_direct;
        if (normId.includes("fix")) return sl.fixed;
        if (normId.includes("native")) return sl.native;
        return normId;
    }
  }
  if (!currentLabel) {
    switch (normId) {
      case "source":
        return sl.source;
      case "spoken":
        return sl.spoken;
      case "written":
        return sl.written;
      case "vocab":
        return sl.vocab;
      case "direct_spec":
      case "en_direct":
        return sl.en_direct;
      case "fixed":
        return sl.fixed;
      case "native":
        return sl.native;
      case "fixes":
        return sl.fixes;
    }
  }
  return currentLabel || slotId;
}
function getDefaultDirectSlots(sourceLang = "en") {
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "en_direct",
      label: sl.en_direct,
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a clear, imperative, high-precision engineering instruction for an AI coding agent. Start directly with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'), eliminate conversational filler, preserve all code tokens, file paths, and CLI flags 100% verbatim, and strictly avoid hallucinations.",
      enabled: true
    },
    {
      id: "vocab",
      label: sl.direct_vocab,
      role: "vocab",
      instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) \xB7 term2 (...)'.",
      enabled: true
    }
  ];
}
function getDefaultPromptSlots(sourceLang = "en") {
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "concise",
      label: sl.concise,
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: High-efficiency, zero-fluff imperative instruction targeting the exact action and smallest working diff.",
      enabled: true
    },
    {
      id: "spec",
      label: sl.spec,
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Structured engineering specification: distill messy thoughts into clear Objective, Constraints, and Deliverable without inventing unrequested features.",
      enabled: true
    },
    {
      id: "deep",
      label: sl.deep,
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Root-cause & architectural rigor: trace end-to-end execution flow, fix shared root causes rather than symptom patches, and verify edge cases.",
      enabled: true
    },
    {
      id: "vocab",
      label: sl.prompt_vocab,
      role: "vocab",
      instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this prompt in ${explainLang}.",
      enabled: true
    }
  ];
}
function getDefaultModifySlots(sourceLang = "en", explainLang) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (explainLang || norm).toLowerCase().split("-")[0];
  const expName = resolveLanguageName(expNorm);
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "fixed",
      label: sl.fixed,
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' \u2794 'want you to'), wrong prepositions/articles (e.g. 'in X' \u2794 'on X'), and grammatical slips in the user's sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
      hideWhenLong: true,
      enabled: true
    },
    {
      id: "native",
      label: sl.native,
      role: "rewrite",
      instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
      hideWhenLong: true,
      enabled: true
    },
    {
      id: "fixes",
      label: sl.fixes,
      role: "vocab",
      instruction: `Extract 1-3 essential takeaways in the format: 'before \u2794 after (<= 10 words/chars grounded intuition in ${expName})'.`,
      enabled: true
    }
  ];
}
function getDefaultSlots(sourceLang = "en") {
  const sl = resolveSlotLabels(sourceLang);
  return [
    {
      id: "source",
      label: sl.source,
      role: "source",
      enabled: true
    },
    {
      id: "spoken",
      label: sl.spoken,
      role: "translation",
      instruction: "Natural, idiomatic spoken ${targetLang} suitable for real-time team collaboration, peer discussions, and daily communication.",
      showMeaning: true,
      enabled: true
    },
    {
      id: "written",
      label: sl.written,
      role: "translation",
      instruction: "Clear, precise, well-structured written ${targetLang} suitable for technical documentation, proposals, architecture reviews, and client communications. Active, concise, professional. STRICTLY AVOID archaic filler and AI-slop buzzwords.",
      showMeaning: true,
      enabled: true
    },
    {
      id: "vocab",
      label: sl.vocab,
      role: "vocab",
      instruction: "Extract key idiomatic collocations, phrasal expressions, technical idioms, or nuanced terms in ${explainLang}.",
      enabled: true
    }
  ];
}
var LEGACY_SLOT_PRESETS = {
  developer: {
    slot1: {
      label: "Spoken",
      name: "Agile Spoken",
      instruction: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Contractions, native phrasal verbs, idioms."
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional."
    }
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction: "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit."
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction: "High-signal, structured technical insight for technical threads and long-form posts. Direct without corporate marketing fluff."
    }
  },
  japanese: {
    slot1: {
      label: "\u53E3\u8A9E",
      name: "\u65E5\u5E38\u30BF\u30E1\u53E3 (Casual Spoken)",
      instruction: "\u89AA\u3057\u3044\u540C\u50DA\u3084\u30C1\u30FC\u30E0\u3068\u306E\u65E5\u5E38\u4F1A\u8A71\u30FBSlack\u30CF\u30C9\u30EB\u30FB\u30AB\u30B8\u30E5\u30A2\u30EB\u306A\u3084\u308A\u53D6\u308A\u306B\u6700\u9069\u306A\u81EA\u7136\u306A\u53E3\u8A9E\u8868\u73FE\u3002"
    },
    slot2: {
      label: "\u656C\u8A9E",
      name: "\u30D3\u30B8\u30CD\u30B9\u4E01\u5BE7\u8A9E\u30FB\u8B19\u8B72\u8A9E (Business Polite)",
      instruction: "\u4E0A\u53F8\u30FB\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u30FB\u516C\u5F0F\u9023\u7D61\u30FB\u696D\u52D9\u5831\u544A\u306B\u3075\u3055\u308F\u3057\u3044\u6D17\u7DF4\u3055\u308C\u305F\u4E01\u5BE7\u8A9E\u30FB\u8B19\u8B72\u8A9E\u306E\u30D3\u30B8\u30CD\u30B9\u6587\u9762\u3002"
    }
  },
  academic: {
    slot1: {
      label: "Discussion",
      name: "Lab Seminar Colloquy",
      instruction: "Natural conversational academic discourse (research lab discussions, seminar Q&A, conference banter). Fluent, collegial, and clear."
    },
    slot2: {
      label: "Paper",
      name: "Peer-Reviewed Paper Prose",
      instruction: "Rigorous, objective, passive/active balanced academic prose meeting IEEE and ACM journal standards. Precise vocabulary."
    }
  }
};
var LANGUAGE_SPECS = {
  zh: {
    name: "Chinese",
    nativeName: "\u4E2D\u6587",
    meaningInstruction: "in native Chinese",
    vocabInstruction: 'in Chinese in parentheses separated by " \xB7 " (e.g. "term1 (\u4E2D\u6587\u91CA\u4E49) \xB7 term2 (\u4E2D\u6587\u91CA\u4E49) \xB7 ...")',
    anchors: [
      {
        input: "\u8BA4\u540C\uFF0C\u5F00\u59CB\u5427",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u5B8C\u5168\u8D5E\u540C\uFF0C\u54B1\u4EEC\u76F4\u63A5\u5F00\u641E",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u786E\u8BA4\u8D5E\u540C\uFF0C\u7740\u624B\u63A8\u8FDB\u5177\u4F53\u5B9E\u65BD",
        vocab: "on board with (\u8D5E\u6210/\u652F\u6301) \xB7 dive in (\u7ACB\u523B\u7740\u624B/\u5F00\u641E)"
      },
      {
        input: "\u7EE7\u7EED",
        spoken: "Let's keep going.",
        spoken_meaning: "\u7EE7\u7EED\u5F80\u4E0B\u641E",
        written: "Proceed with the next steps.",
        written_meaning: "\u63A8\u8FDB\u540E\u7EED\u6B65\u9AA4",
        vocab: "keep going (\u7EE7\u7EED\u63A8\u8FDB) \xB7 proceed with (\u7740\u624B\u8FDB\u884C)"
      },
      {
        input: "\u8FD9\u4E2A\u65B9\u6848\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u4E0D\u5982\u76F4\u63A5\u7528\u6807\u51C6\u5E93\u5B9E\u73B0",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u611F\u89C9\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u7528\u6807\u51C6\u5E93\u5212\u7B97\u5F97\u591A",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u8BE5\u65B9\u6848\u5F15\u5165\u4E86\u4E0D\u5FC5\u8981\u7684\u590D\u6742\u5EA6\uFF0C\u5EFA\u8BAE\u4F18\u5148\u91C7\u7528\u539F\u751F\u6807\u51C6\u5E93\u5B9E\u73B0",
        vocab: "over-engineered (\u8FC7\u5EA6\u5DE5\u7A0B\u5316) \xB7 be better off (\u505A\u67D0\u4E8B\u66F4\u5408\u9002/\u5212\u7B97) \xB7 stick with (\u575A\u6301\u4F7F\u7528/\u6CBF\u7528) \xB7 leverage (\u5229\u7528/\u501F\u52A9)"
      },
      {
        input: "\u6211\u4EEC\u629B\u5F03\u4E86\u81C3\u80BF\u7684\u6846\u67B6\uFF0C\u6362\u6210\u96F6\u4F9D\u8D56\u5355\u6587\u4EF6\uFF0C\u51B7\u542F\u52A8\u76F4\u63A5\u63D0\u901F\u4E8610\u500D",
        spoken: "Ditched the bloated framework for a zero-dep single file \u2014 cold starts are 10x faster now!",
        spoken_meaning: "\u7529\u6389\u4E86\u81C3\u80BF\u7684\u6846\u67B6\u6362\u6210\u4E86\u96F6\u4F9D\u8D56\u5355\u6587\u4EF6\uFF0C\u51B7\u542F\u52A8\u76F4\u63A5\u98D9\u4E8610\u500D\uFF01",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "\u7528\u96F6\u4F9D\u8D56\u67B6\u6784\u53D6\u4EE3\u4E86\u5355\u4F53\u6846\u67B6\uFF0C\u4F7F\u51B7\u542F\u52A8\u5EF6\u8FDF\u964D\u4F4E\u81F3\u539F\u6765\u7684\u5341\u5206\u4E4B\u4E00\u3002",
        vocab: "ditch ... for ... (\u629B\u5F03\u67D0\u7269\u6362\u7528) \xB7 zero-dep (\u96F6\u5916\u90E8\u4F9D\u8D56) \xB7 cold start (\u51B7\u542F\u52A8) \xB7 yield (\u4EA7\u51FA/\u5B9E\u73B0)"
      }
    ]
  },
  tw: {
    name: "Chinese",
    nativeName: "\u7E41\u9AD4\u4E2D\u6587",
    meaningInstruction: "in native Chinese",
    vocabInstruction: 'in Chinese in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "\u9019\u500B\u65B9\u6848\u6709\u9EDE\u904E\u5EA6\u8A2D\u8A08\u4E86\uFF0C\u4E0D\u5982\u76F4\u63A5\u7528\u6A19\u6E96\u5EAB\u5BE6\u73FE",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u611F\u89BA\u6709\u9EDE\u904E\u5EA6\u8A2D\u8A08\u4E86\uFF0C\u7528\u6A19\u6E96\u5EAB\u5212\u7B97\u5F97\u591A",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u8A72\u65B9\u6848\u5F15\u5165\u4E86\u4E0D\u5FC5\u8981\u7684\u8907\u96DC\u5EA6\uFF0C\u5EFA\u8B70\u512A\u5148\u63A1\u7528\u539F\u751F\u6A19\u6E96\u5EAB\u5BE6\u73FE",
        vocab: "over-engineered (\u904E\u5EA6\u5DE5\u7A0B\u5316) \xB7 be better off (\u505A\u67D0\u4E8B\u66F4\u5212\u7B97) \xB7 stick with (\u6CBF\u7528/\u5805\u6301\u4F7F\u7528) \xB7 leverage (\u5584\u7528/\u501F\u52A9)"
      },
      {
        input: "\u8A8D\u540C\uFF0C\u958B\u59CB\u5427",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u5B8C\u5168\u8D0A\u540C\uFF0C\u54B1\u5011\u76F4\u63A5\u958B\u641E",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u78BA\u8A8D\u8D0A\u540C\uFF0C\u8457\u624B\u63A8\u9032\u5177\u9AD4\u5BE6\u65BD",
        vocab: "on board with (\u8D0A\u6210/\u652F\u6301) \xB7 dive in (\u7ACB\u523B\u8457\u624B/\u958B\u641E)"
      }
    ]
  },
  ja: {
    name: "Japanese",
    nativeName: "\u65E5\u672C\u8A9E",
    meaningInstruction: "in native Japanese",
    vocabInstruction: 'in Japanese in parentheses separated by " \xB7 " (e.g. "term1 (\u65E5\u672C\u8A9E\u89E3\u8AAC) \xB7 term2 (\u65E5\u672C\u8A9E\u89E3\u8AAC) \xB7 ...")',
    anchors: [
      {
        input: "\u8CDB\u6210\u3001\u59CB\u3081\u307E\u3057\u3087\u3046",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u5927\u8CDB\u6210\u3001\u3059\u3050\u306B\u59CB\u3081\u3088\u3046",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u540C\u610F\u3057\u307E\u3057\u305F\u3002\u5B9F\u88C5\u3092\u9032\u3081\u307E\u3059",
        vocab: "on board with (\u8CDB\u6210/\u652F\u6301) \xB7 dive in (\u3059\u3050\u306B\u7740\u624B\u3059\u308B)"
      },
      {
        input: "\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044",
        spoken: "Let's keep going.",
        spoken_meaning: "\u305D\u306E\u307E\u307E\u9032\u3081\u3088\u3046",
        written: "Proceed with the next steps.",
        written_meaning: "\u6B21\u306E\u5DE5\u7A0B\u306B\u9032\u307F\u307E\u3059",
        vocab: "keep going (\u7D99\u7D9A\u3059\u308B) \xB7 proceed with (\u7740\u624B\u30FB\u9032\u884C\u3059\u308B)"
      },
      {
        input: "\u3053\u306E\u8A2D\u8A08\u306F\u5C11\u3057\u904E\u5270\u3067\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3092\u4F7F\u3063\u305F\u307B\u3046\u304C\u3044\u3044\u3067\u3057\u3087\u3046",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u5C11\u3057\u904E\u5270\u8A2D\u8A08\u306A\u6C17\u304C\u3057\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u5341\u5206\u3067\u3059",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u63D0\u6848\u3055\u308C\u305F\u69CB\u6210\u306F\u4E0D\u8981\u306A\u8907\u96D1\u3055\u3092\u3082\u305F\u3089\u3057\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306E\u5229\u7528\u3092\u63A8\u5968\u3057\u307E\u3059",
        vocab: "over-engineered (\u904E\u5270\u8A2D\u8A08) \xB7 be better off (\u301C\u3057\u305F\u307B\u3046\u304C\u3088\u3044) \xB7 stick with (\u301C\u3092\u4F7F\u3044\u7D9A\u3051\u308B) \xB7 leverage (\u6D3B\u7528\u3059\u308B)"
      }
    ]
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction: 'in English in parentheses separated by " \xB7 " (e.g. "term1 (English definition) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "Sounds good, let's ship it.",
        spoken: "Looks great, let's deploy right away.",
        spoken_meaning: "Clear approval to proceed with deployment immediately.",
        written: "Confirmed. Proceed with deployment to production.",
        written_meaning: "Formal acknowledgment authorizing release to production.",
        vocab: "ship (deploy/release to production) \xB7 proceed with (move forward with)"
      },
      {
        input: "This approach feels a bit over-engineered; let's just stick with the standard library.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Suggestion to keep architecture simple and avoid unnecessary dependencies.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Formal architectural recommendation favoring standard library.",
        vocab: "over-engineered (excessively complex) \xB7 be better off (preferable) \xB7 stick with (adhere to)"
      }
    ]
  },
  es: {
    name: "Spanish",
    nativeName: "Espa\xF1ol",
    meaningInstruction: "in native Spanish",
    vocabInstruction: 'in Spanish in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "Este enfoque est\xE1 un poco sobreingeniado, es mejor que usemos la biblioteca est\xE1ndar.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Se siente un poco sobreingeniado, nos conviene m\xE1s usar la biblioteca est\xE1ndar.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "El enfoque propuesto introduce una complejidad innecesaria. Se recomienda priorizar la biblioteca est\xE1ndar.",
        vocab: "over-engineered (sobreingeniado/excesivo) \xB7 be better off (conviene m\xE1s) \xB7 stick with (mantenerse en)"
      },
      {
        input: "De acuerdo, empecemos",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Totalmente de acuerdo, vamos al grano",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirmado. Procedamos con la implementaci\xF3n",
        vocab: "on board with (estar de acuerdo) \xB7 dive in (empezar de lleno)"
      }
    ]
  },
  fr: {
    name: "French",
    nativeName: "Fran\xE7ais",
    meaningInstruction: "in native French",
    vocabInstruction: 'in French in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "Cette approche est surcon\xE7ue, on ferait mieux d'utiliser la biblioth\xE8que standard.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\xC7a semble un peu trop complexe, on a meilleur compte \xE0 garder la lib standard.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "L'approche propos\xE9e introduit une complexit\xE9 superflue. Il est recommand\xE9 de privil\xE9gier la biblioth\xE8que standard.",
        vocab: "over-engineered (surcon\xE7u/trop complexe) \xB7 stick with (s'en tenir \xE0) \xB7 leverage (tirer parti de)"
      },
      {
        input: "D'accord, c'est parti.",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Tout \xE0 fait d'accord, allons-y directement.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirm\xE9. Proc\xE9dons \xE0 l'impl\xE9mentation.",
        vocab: "on board with (\xEAtre d'accord) \xB7 dive in (commencer directement)"
      }
    ]
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    meaningInstruction: "in native German",
    vocabInstruction: 'in German in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "Der Ansatz ist \xFCberkompliziert, wir sollten lieber die Standardbibliothek nutzen.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "F\xFChlt sich \xFCberdimensioniert an, mit der Standardbibliothek fahren wir besser.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Der Vorschlag erh\xF6ht die Komplexit\xE4t unn\xF6tig. Native Implementierungen der Standardbibliothek werden bevorzugt.",
        vocab: "over-engineered (\xFCberdimensioniert/\xFCberkompliziert) \xB7 stick with (beibehalten/nutzen) \xB7 leverage (nutzen/einsetzen)"
      },
      {
        input: "Einverstanden, fangen wir an.",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Voll dabei, legen wir direkt los.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Best\xE4tigt. Beginn der Implementierung.",
        vocab: "on board with (einverstanden sein) \xB7 dive in (direkt einsteigen/loslegen)"
      }
    ]
  },
  ko: {
    name: "Korean",
    nativeName: "\uD55C\uAD6D\uC5B4",
    meaningInstruction: "in native Korean",
    vocabInstruction: 'in Korean in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "\uC774 \uBC29\uC2DD\uC740 \uC880 \uC624\uBC84\uC5D4\uC9C0\uB2C8\uC5B4\uB9C1 \uAC19\uC544\uC694. \uADF8\uB0E5 \uD45C\uC900 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB97C \uC4F0\uB294 \uAC8C \uB0AB\uACA0\uC2B5\uB2C8\uB2E4.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\uC870\uAE08 \uACFC\uD55C \uC124\uACC4\uC778 \uAC83 \uAC19\uC544\uC694. \uD45C\uC900 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB85C \uAC00\uB294 \uAC8C \uD6E8\uC52C \uB0AB\uC2B5\uB2C8\uB2E4.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\uC81C\uC548\uB41C \uBC29\uC2DD\uC740 \uBD88\uD544\uC694\uD55C \uBCF5\uC7A1\uC131\uC744 \uCD08\uB798\uD558\uBBC0\uB85C, \uD45C\uC900 \uB77C\uC774\uBE0C\uB7EC\uB9AC \uC0AC\uC6A9\uC744 \uAD8C\uC7A5\uD569\uB2C8\uB2E4.",
        vocab: "over-engineered (\uACFC\uB3C4\uD55C \uC124\uACC4) \xB7 be better off (~\uD558\uB294 \uD3B8\uC774 \uD6E8\uC52C \uB0AB\uB2E4) \xB7 stick with (\uACC4\uC18D \uC0AC\uC6A9\uD558\uB2E4) \xB7 leverage (\uD65C\uC6A9\uD558\uB2E4)"
      },
      {
        input: "\uB3D9\uC758\uD569\uB2C8\uB2E4, \uC2DC\uC791\uD558\uC8E0.",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\uC804\uC801\uC73C\uB85C \uB3D9\uC758\uD569\uB2C8\uB2E4, \uBC14\uB85C \uC2DC\uC791\uD558\uC8E0.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\uD655\uC778\uD588\uC2B5\uB2C8\uB2E4. \uAD6C\uD604\uC744 \uC9C4\uD589\uD558\uACA0\uC2B5\uB2C8\uB2E4.",
        vocab: "on board with (\uB3D9\uC758/\uCC2C\uC131\uD558\uB2E4) \xB7 dive in (\uACE7\uBC14\uB85C \uCC29\uC218\uD558\uB2E4)"
      }
    ]
  },
  ru: {
    name: "Russian",
    nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    meaningInstruction: "in native Russian",
    vocabInstruction: 'in Russian in parentheses separated by " \xB7 "',
    anchors: [
      {
        input: "\u041A\u0430\u0436\u0435\u0442\u0441\u044F, \u044D\u0442\u043E \u043E\u0432\u0435\u0440\u0438\u043D\u0436\u0438\u043D\u0438\u0440\u0438\u043D\u0433, \u043B\u0443\u0447\u0448\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0443\u044E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0443.",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u041F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u043E\u0432\u0435\u0440\u0438\u043D\u0436\u0438\u043D\u0438\u0440\u0438\u043D\u0433, \u043D\u0430\u043C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0449\u0435 \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u0439 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0435.",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043D\u0435\u043E\u043F\u0440\u0430\u0432\u0434\u0430\u043D\u043D\u043E \u0443\u0441\u043B\u043E\u0436\u043D\u044F\u0435\u0442 \u0430\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0443. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0443\u044E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0443.",
        vocab: "over-engineered (\u043E\u0432\u0435\u0440\u0438\u043D\u0436\u0438\u043D\u0438\u0440\u0438\u043D\u0433/\u0438\u0437\u0431\u044B\u0442\u043E\u0447\u043D\u0430\u044F \u0441\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C) \xB7 stick with (\u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0442\u044C\u0441\u044F) \xB7 leverage (\u0437\u0430\u0434\u0435\u0439\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C)"
      },
      {
        input: "\u0421\u043E\u0433\u043B\u0430\u0441\u0435\u043D, \u043F\u043E\u0433\u043D\u0430\u043B\u0438.",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u041F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D, \u043F\u043E\u0433\u043D\u0430\u043B\u0438 \u0440\u0435\u0430\u043B\u0438\u0437\u043E\u0432\u044B\u0432\u0430\u0442\u044C.",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E. \u041F\u0440\u0438\u0441\u0442\u0443\u043F\u0430\u0435\u043C \u043A \u0440\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438.",
        vocab: "on board with (\u0431\u044B\u0442\u044C \u0441\u043E\u0433\u043B\u0430\u0441\u043D\u044B\u043C) \xB7 dive in (\u043F\u043E\u0433\u0440\u0443\u0436\u0430\u0442\u044C\u0441\u044F/\u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C \u0441\u0440\u0430\u0437\u0443)"
      }
    ]
  }
};
var LANGUAGE_PAIR_ANCHORS = {
  // English target pairs
  "zh->en": LANGUAGE_SPECS.zh.anchors,
  "tw->en": LANGUAGE_SPECS.tw.anchors,
  "ja->en": LANGUAGE_SPECS.ja.anchors,
  "ko->en": LANGUAGE_SPECS.ko.anchors,
  "de->en": LANGUAGE_SPECS.de.anchors,
  "fr->en": LANGUAGE_SPECS.fr.anchors,
  "es->en": LANGUAGE_SPECS.es.anchors,
  "ru->en": LANGUAGE_SPECS.ru.anchors,
  // English source pairs (English -> Chinese, Japanese, etc.)
  "en->zh": [
    {
      input: "This approach feels a bit over-engineered; let's just stick with the standard library.",
      spoken: "\u8FD9\u4E2A\u65B9\u6848\u611F\u89C9\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u54B1\u4EEC\u76F4\u63A5\u7528\u6807\u51C6\u5E93\u641E\u5B9A\u5F97\u4E86\u3002",
      spoken_meaning: "Conversational peer suggestion to avoid over-engineering.",
      written: "\u8BE5\u65B9\u6848\u5F15\u5165\u4E86\u4E0D\u5FC5\u8981\u7684\u590D\u6742\u6027\uFF0C\u5EFA\u8BAE\u4F18\u5148\u91C7\u7528\u539F\u751F\u6807\u51C6\u5E93\u5B9E\u73B0\u3002",
      written_meaning: "Formal architectural recommendation favoring standard library.",
      vocab: "\u8FC7\u5EA6\u8BBE\u8BA1 (over-engineering) \xB7 \u6807\u51C6\u5E93 (standard library) \xB7 \u539F\u751F\u5B9E\u73B0 (native implementation)"
    },
    {
      input: "Totally on board with that, let's ship it.",
      spoken: "\u5B8C\u5168\u8D5E\u6210\uFF0C\u54B1\u4EEC\u8D76\u7D27\u53D1\u7248\u5427\u3002",
      spoken_meaning: "Clear approval to release immediately.",
      written: "\u786E\u8BA4\u8D5E\u540C\u3002\u6309\u65E2\u5B9A\u8BA1\u5212\u63A8\u8FDB\u751F\u4EA7\u73AF\u5883\u53D1\u5E03\u3002",
      written_meaning: "Formal confirmation authorizing release to production.",
      vocab: "\u53D1\u7248 (ship/release) \xB7 \u751F\u4EA7\u73AF\u5883 (production environment)"
    }
  ],
  "en->ja": [
    {
      input: "This approach feels a bit over-engineered; let's just stick with the standard library.",
      spoken: "\u3053\u306E\u8A2D\u8A08\u306F\u3061\u3087\u3063\u3068\u904E\u5270\u306A\u6C17\u304C\u3059\u308B\u306E\u3067\u3001\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u6E08\u307E\u305B\u307E\u3057\u3087\u3046\u3002",
      spoken_meaning: "Casual team suggestion to stick with the standard library.",
      written: "\u63D0\u6848\u3055\u308C\u305F\u30A2\u30D7\u30ED\u30FC\u30C1\u306F\u4E0D\u8981\u306A\u8907\u96D1\u6027\u3092\u751F\u3080\u305F\u3081\u3001\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306B\u3088\u308B\u5B9F\u88C5\u3092\u63A8\u5968\u3057\u307E\u3059\u3002",
      written_meaning: "Formal architectural recommendation favoring standard library.",
      vocab: "\u904E\u5270\u8A2D\u8A08 (over-engineering) \xB7 \u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA (standard library) \xB7 \u5B9F\u88C5\u3092\u63A8\u5968 (recommend implementation)"
    },
    {
      input: "Sounds good, let's ship it.",
      spoken: "\u5927\u8CDB\u6210\u3067\u3059\u3001\u65E9\u901F\u30EA\u30EA\u30FC\u30B9\u3057\u307E\u3057\u3087\u3046\uFF01",
      spoken_meaning: "Clear approval to release immediately.",
      written: "\u627F\u8A8D\u3044\u305F\u3057\u307E\u3057\u305F\u3002\u672C\u756A\u74B0\u5883\u3078\u306E\u30C7\u30D7\u30ED\u30A4\u3092\u9032\u884C\u3057\u307E\u3059\u3002",
      written_meaning: "Formal authorization to deploy to production.",
      vocab: "\u672C\u756A\u74B0\u5883 (production environment) \xB7 \u30C7\u30D7\u30ED\u30A4 (deploy) \xB7 \u30EA\u30EA\u30FC\u30B9 (release)"
    }
  ],
  // Cross-lingual Asian pairs (Chinese <-> Japanese)
  "zh->ja": [
    {
      input: "\u8FD9\u4E2A\u65B9\u6848\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u4E0D\u5982\u76F4\u63A5\u7528\u6807\u51C6\u5E93\u5B9E\u73B0",
      spoken: "\u3053\u306E\u3084\u308A\u65B9\u306F\u3061\u3087\u3063\u3068\u904E\u5270\u8A2D\u8A08\u306A\u6C17\u304C\u3059\u308B\u3057\u3001\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u6E08\u307E\u305B\u305F\u307B\u3046\u304C\u826F\u3055\u305D\u3046\u3002",
      spoken_meaning: "\u611F\u89C9\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u76F4\u63A5\u7528\u6807\u51C6\u5E93\u66F4\u5212\u7B97",
      written: "\u63D0\u6848\u3055\u308C\u305F\u30A2\u30D7\u30ED\u30FC\u30C1\u306F\u4E0D\u8981\u306A\u8907\u96D1\u6027\u3092\u751F\u3080\u305F\u3081\u3001\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306B\u3088\u308B\u5B9F\u88C5\u3092\u63A8\u5968\u3057\u307E\u3059\u3002",
      written_meaning: "\u8BE5\u65B9\u6848\u4F1A\u4EA7\u751F\u4E0D\u5FC5\u8981\u7684\u590D\u6742\u5EA6\uFF0C\u5EFA\u8BAE\u4F7F\u7528\u6807\u51C6\u5E93\u5B9E\u73B0",
      vocab: "\u904E\u5270\u8A2D\u8A08 (\u8FC7\u5EA6\u8BBE\u8BA1) \xB7 \u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA (\u6807\u51C6\u5E93) \xB7 \u30A2\u30D7\u30ED\u30FC\u30C1 (\u65B9\u6848/\u65B9\u6CD5) \xB7 \u6E08\u307E\u305B\u308B (\u5BF9\u4ED8/\u641E\u5B9A)"
    },
    {
      input: "\u8BA4\u540C\uFF0C\u5F00\u59CB\u5427",
      spoken: "\u5927\u8CDB\u6210\u3001\u3059\u3050\u306B\u59CB\u3081\u3088\u3046\u3002",
      spoken_meaning: "\u5B8C\u5168\u8D5E\u6210\uFF0C\u54B1\u4EEC\u7ACB\u523B\u5F00\u641E",
      written: "\u540C\u610F\u3057\u307E\u3057\u305F\u3002\u5B9F\u88C5\u3092\u9032\u3081\u307E\u3059\u3002",
      written_meaning: "\u786E\u8BA4\u8D5E\u540C\uFF0C\u63A8\u8FDB\u5177\u4F53\u4EE3\u7801\u5B9E\u73B0",
      vocab: "\u5927\u8CDB\u6210 (\u5B8C\u5168\u8D5E\u540C) \xB7 \u3059\u3050\u306B\u59CB\u3081\u308B (\u7ACB\u523B\u7740\u624B) \xB7 \u5B9F\u88C5\u3092\u9032\u3081\u308B (\u63A8\u8FDB\u5B9E\u73B0)"
    }
  ],
  "ja->zh": [
    {
      input: "\u3053\u306E\u8A2D\u8A08\u306F\u5C11\u3057\u904E\u5270\u3067\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3092\u4F7F\u3063\u305F\u307B\u3046\u304C\u3044\u3044\u3067\u3057\u3087\u3046",
      spoken: "\u8FD9\u4E2A\u65B9\u6848\u611F\u89C9\u6709\u70B9\u8FC7\u5EA6\u8BBE\u8BA1\u4E86\uFF0C\u54B1\u4EEC\u76F4\u63A5\u7528\u6807\u51C6\u5E93\u641E\u5B9A\u5F97\u4E86\u3002",
      spoken_meaning: "\u5C11\u3057\u904E\u5270\u8A2D\u8A08\u306A\u6C17\u304C\u3057\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u5341\u5206\u3067\u3059",
      written: "\u8BE5\u65B9\u6848\u5F15\u5165\u4E86\u4E0D\u5FC5\u8981\u7684\u590D\u6742\u6027\uFF0C\u5EFA\u8BAE\u4F18\u5148\u91C7\u7528\u539F\u751F\u6807\u51C6\u5E93\u5B9E\u73B0\u3002",
      written_meaning: "\u63D0\u6848\u3055\u308C\u305F\u69CB\u6210\u306F\u4E0D\u8981\u306A\u8907\u96D1\u3055\u3092\u3082\u305F\u3089\u3057\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306E\u5229\u7528\u3092\u63A8\u5968\u3057\u307E\u3059",
      vocab: "\u8FC7\u5EA6\u8BBE\u8BA1 (\u904E\u5270\u8A2D\u8A08) \xB7 \u6807\u51C6\u5E93 (\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA) \xB7 \u539F\u751F\u5B9E\u73B0 (\u30CD\u30A4\u30C6\u30A3\u30D6\u5B9F\u88C5)"
    },
    {
      input: "\u8CDB\u6210\u3001\u59CB\u3081\u307E\u3057\u3087\u3046",
      spoken: "\u5B8C\u5168\u8D5E\u6210\uFF0C\u54B1\u4EEC\u76F4\u63A5\u5F00\u641E\u3002",
      spoken_meaning: "\u5927\u8CDB\u6210\u3001\u3059\u3050\u306B\u59CB\u3081\u3088\u3046",
      written: "\u786E\u8BA4\u8D5E\u540C\u3002\u7740\u624B\u63A8\u8FDB\u5177\u4F53\u5B9E\u65BD\u3002",
      written_meaning: "\u540C\u610F\u3057\u307E\u3057\u305F\u3002\u5B9F\u88C5\u3092\u9032\u3081\u307E\u3059",
      vocab: "\u5F00\u641E (\u59CB\u3081\u308B/\u7740\u624B\u3059\u308B) \xB7 \u63A8\u8FDB\u5B9E\u65BD (\u5B9F\u88C5\u3092\u9032\u3081\u308B)"
    }
  ]
};
function resolveLanguagePairAnchors(sourceLang = "en", targetLang = "en") {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  const pairKey = `${normSource}->${normTarget}`;
  if (LANGUAGE_PAIR_ANCHORS[pairKey] && LANGUAGE_PAIR_ANCHORS[pairKey].length > 0) {
    return LANGUAGE_PAIR_ANCHORS[pairKey];
  }
  if (normTarget === "en" && LANGUAGE_SPECS[normSource]?.anchors?.length > 0) {
    return LANGUAGE_SPECS[normSource].anchors;
  }
  if (normSource === "tw") {
    const zhKey = `zh->${normTarget}`;
    if (LANGUAGE_PAIR_ANCHORS[zhKey]) return LANGUAGE_PAIR_ANCHORS[zhKey];
  }
  if (normSource === "en" && normTarget === "en") {
    return LANGUAGE_SPECS.en?.anchors || [];
  }
  return [];
}
var PROMPT_TARGET_LANGUAGE_NAMES = {
  en: "English",
  zh: "Chinese (Simplified)",
  tw: "Chinese (Traditional)",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  ru: "Russian",
  pt: "Portuguese",
  it: "Italian",
  vi: "Vietnamese",
  tr: "Turkish",
  ar: "Arabic",
  ms: "Malay"
};
function resolveLanguageName(code = "en") {
  const norm = (code || "en").toLowerCase().split("-")[0];
  return PROMPT_TARGET_LANGUAGE_NAMES[norm] || code.toUpperCase();
}
function interpolatePromptVariables(template, vars) {
  if (!template || typeof template !== "string") return template;
  const sCode = (vars.sourceLang || "en").toLowerCase().split("-")[0];
  const tCode = (vars.targetLang || "en").toLowerCase().split("-")[0];
  const eCode = (vars.explainLang || sCode).toLowerCase().split("-")[0];
  const sName = resolveLanguageName(sCode);
  const tName = resolveLanguageName(tCode);
  const eName = resolveLanguageName(eCode);
  return template.replace(/\$\{sourceLang\}/g, sName).replace(/\$\{targetLang\}/g, tName).replace(/\$\{explainLang\}/g, eName).replace(/\$\{sourceLangCode\}/g, sCode).replace(/\$\{targetLangCode\}/g, tCode).replace(/\$\{explainLangCode\}/g, eCode);
}
function resolvePromptTargetLangName(sourceLang = "en", targetLang = "en", promptLang) {
  if (promptLang && promptLang.trim()) {
    const clean = promptLang.trim().toLowerCase().split("-")[0];
    return { code: clean, name: resolveLanguageName(clean) };
  }
  const s = (sourceLang || "en").toLowerCase().split("-")[0];
  const t = (targetLang || "").toLowerCase().split("-")[0];
  const outCode = t ? t : s === "en" ? "ja" : "en";
  return { code: outCode, name: resolveLanguageName(outCode) };
}
var PROMPT_RULE_PRESETS = {
  concise: "Keep output strictly concise, minimal, and action-oriented. Eliminate all fluff.",
  spec: "Format output with explicit sections: Objective, Constraints, Edge Cases, and Deliverable.",
  deep: "Prioritize root-cause tracing, end-to-end flow inspection, and regression boundary checks."
};
var DEFAULT_KILL_LIST = [
  "delve",
  "tapestry",
  "seamless",
  "seamlessly",
  "robust",
  "enhance",
  "streamline",
  "comprehensive",
  "in summary",
  "game-changer",
  "revolutionize",
  "unleash",
  "thrilled to announce",
  "pivotal",
  "holistic",
  "multifaceted"
];
function compileKillListInstruction(killList, globalKillList) {
  const baseGlobal = globalKillList !== void 0 ? globalKillList : DEFAULT_KILL_LIST;
  const merged = Array.from(
    new Set([...baseGlobal, ...killList || []].map((w) => w.trim().toLowerCase()).filter(Boolean))
  );
  if (merged.length === 0) return "";
  return `

[KILL LIST - FORBIDDEN AI BUZZWORDS - ZERO TOLERANCE]:
Strictly forbid using any of the following clich\xE9, artificial, or corporate AI filler words/phrases:
${merged.map((w) => `\u2022 "${w}"`).join(", ")}.
Use plain, grounded, authentic developer language instead.`;
}
function resolvePromptRulePreset(input) {
  const key = input.trim().toLowerCase();
  return PROMPT_RULE_PRESETS[key] || input.trim();
}
function normalizePromptRules(rule) {
  if (!rule) return [];
  if (Array.isArray(rule)) {
    return rule.map((r) => resolvePromptRulePreset(String(r || ""))).filter(Boolean);
  }
  const s = resolvePromptRulePreset(String(rule));
  return s ? [s] : [];
}
function buildSystemPrompt(sourceLang = "en", targetLang = "ja", isLongInput = false, context, tone = "general", customSlots) {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "ja").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const targetName = resolveLanguageName(normTarget);
  const pairAnchors = resolveLanguagePairAnchors(normSource, normTarget);
  const anchorText = pairAnchors.length > 0 ? pairAnchors.map(
    (a) => `Input: ${JSON.stringify(a.input)}
Output: ${JSON.stringify({
      spoken: a.spoken,
      spoken_meaning: a.spoken_meaning,
      written: a.written,
      written_meaning: a.written_meaning,
      vocab: a.vocab
    })}`
  ).join("\n\n") : "";
  const anchorBlock = anchorText ? `

[GOLDEN FEW-SHOT ANCHORS (Pair: ${normSource} \u2794 ${normTarget})]:
${anchorText}` : "";
  const condensationDirective = isLongInput ? `

[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish \u2014 NEVER omit any details!
Express all points concisely so the complete meaning fits cleanly within the HUD without truncation.` : "";
  const contextDirective = context && context.trim() ? `

[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""` : "";
  let toneDirective = "";
  if (tone === "social") {
    toneDirective = `

[TONE FOCUS - SOCIAL & COMMUNITY]:
Prioritize X (Twitter), Reddit, and developer community engagement dynamics:
- "spoken": Craft a high-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter. Avoid robotic AI clich\xE9 words (e.g., NEVER use "delve", "testament", "tapestry", "revolutionize").
- "written": High-signal, structured technical insight. Concise, clear, and actionable.`;
  } else if (tone === "tech") {
    toneDirective = `

[TONE FOCUS - TECHNICAL RIGOR]:
Prioritize RFC, Pull Request, and architectural documentation precision:
- "spoken": Direct, respectful engineering alignment (Slack huddles, technical triage).
- "written": High-precision Plain ${targetName} matching modern IETF RFC and open-source release notes.`;
  }
  const isArraySlots = Array.isArray(customSlots);
  const nonSourceSlots = isArraySlots ? customSlots.filter((s) => s.enabled && s.role !== "source") : [];
  const hasSpoken = isArraySlots && nonSourceSlots.some((s) => s.id === "spoken");
  const hasWritten = isArraySlots && nonSourceSlots.some((s) => s.id === "written");
  const isStandardDuality = !isArraySlots || hasSpoken && hasWritten && nonSourceSlots.length <= 4;
  if (isStandardDuality) {
    const defaultSlots = LEGACY_SLOT_PRESETS.developer;
    const legacyConfig = !isArraySlots ? customSlots : void 0;
    const spokenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "spoken") : void 0;
    const writtenSlot = isArraySlots ? nonSourceSlots.find((s) => s.id === "written") : void 0;
    const defaultLocSlots = getDefaultSlots(normSource);
    const defaultSpokenInst = defaultLocSlots.find((s) => s.id === "spoken")?.instruction;
    const defaultWrittenInst = defaultLocSlots.find((s) => s.id === "written")?.instruction;
    const isCustomSpoken = spokenSlot?.instruction && spokenSlot.instruction !== defaultSpokenInst;
    const isCustomWritten = writtenSlot?.instruction && writtenSlot.instruction !== defaultWrittenInst;
    const slot1Name = isCustomSpoken ? spokenSlot.label : legacyConfig?.slot1?.name || defaultSlots.slot1.name;
    const rawSlot1Instruction = isCustomSpoken ? spokenSlot.instruction : legacyConfig?.slot1?.instruction || defaultSlots.slot1.instruction;
    const slot1Instruction = interpolatePromptVariables(rawSlot1Instruction, { sourceLang, targetLang, explainLang: sourceLang });
    const slot2Name = isCustomWritten ? writtenSlot.label : legacyConfig?.slot2?.name || defaultSlots.slot2.name;
    const rawSlot2Instruction = isCustomWritten ? writtenSlot.instruction : legacyConfig?.slot2?.instruction || defaultSlots.slot2.instruction;
    const slot2Instruction = interpolatePromptVariables(rawSlot2Instruction, { sourceLang, targetLang, explainLang: sourceLang });
    const jsonFormatHint = isLongInput ? `Strict JSON format:
{
  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)",
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}` : `Strict JSON format:
{
  "spoken": "...",
  "spoken_meaning": "...",
  "written": "...",
  "written_meaning": "...",
  "vocab": "..."
}`;
    return `You are an elite bilingual developer language coach and senior software architect.
Task:
Translate the user's message from native ${spec.name} (language A) into TWO distinct authentic ${targetName} registers (Slot 1 and Slot 2), and provide the exact back-translation/nuance ${spec.meaningInstruction} for each register:
1. "spoken" (Slot 1: ${slot1Name}): ${slot1Instruction}
2. "spoken_meaning": The exact nuance and meaning of Slot 1 ${spec.meaningInstruction}.
3. "written" (Slot 2: ${slot2Name}): ${slot2Instruction}
4. "written_meaning": The exact nuance and meaning of Slot 2 ${spec.meaningInstruction}.
5. "vocab": Adaptively extract ALL key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency. Keep definitions concise ${spec.vocabInstruction}.

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in both spoken and written outputs. Never translate, rephrase, or drop code tokens. CRITICAL: NEVER expand, hallucinate, or fabricate file paths, UUIDs, or timestamps not explicitly in the user's input.
${condensationDirective}${contextDirective}${toneDirective}${anchorBlock}${compileKillListInstruction(void 0, DEFAULT_KILL_LIST)}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }
  const enabledSlots = customSlots.filter((s) => s.enabled && s.role !== "source");
  const taskLines = [];
  const jsonProps = [];
  if (isLongInput) {
    jsonProps.push(`  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)"`);
  }
  enabledSlots.forEach((slot, idx) => {
    const num = idx + 1;
    const rawInstruction = slot.instruction || `Express the message in ${slot.label} style in authentic ${targetName}.`;
    const instruction = interpolatePromptVariables(rawInstruction, { sourceLang, targetLang, explainLang: sourceLang });
    taskLines.push(`${num}. "${slot.id}" (${slot.label}): ${instruction}`);
    jsonProps.push(`  "${slot.id}": "..."`);
    if (slot.showMeaning && slot.role !== "vocab") {
      taskLines.push(`${num}_meaning. "${slot.id}_meaning": The exact nuance and meaning of "${slot.id}" ${spec.meaningInstruction}.`);
      jsonProps.push(`  "${slot.id}_meaning": "..."`);
    }
  });
  const dynamicTasks = taskLines.join("\n");
  const dynamicJsonHint = `Strict JSON format:
{
${jsonProps.join(",\n")}
}`;
  return `You are an elite multilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, UUIDs, and (...) placeholders MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}${toneDirective}${anchorBlock}${compileKillListInstruction(void 0, DEFAULT_KILL_LIST)}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
}
function buildPromptCandidatesSystemPrompt(options) {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const defaultTarget = normSource === "en" ? "ja" : "en";
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || defaultTarget,
    options.promptLang
  );
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.en;
  const slots = (Array.isArray(options.promptSlots) && options.promptSlots.length > 0 ? options.promptSlots : getDefaultPromptSlots(normSource)).filter((s) => s.enabled !== false && s.role !== "source");
  const taskLines = slots.map((s, idx) => {
    const rawInstruction = s.instruction || (s.role === "vocab" ? "Extract 2-3 high-value authentic technical expressions or collocations relevant to the input." : `Express the message in ${s.label} style in authentic ${outLangName}.`);
    const instruction = interpolatePromptVariables(rawInstruction, {
      sourceLang: options.sourceLang || "en",
      targetLang: options.targetLang || defaultTarget,
      explainLang: options.sourceLang || "en"
    });
    if (s.role === "vocab") {
      return `${idx + 1}. "${s.id}" (${s.label}): ${instruction} ${spec.vocabInstruction}`;
    }
    const hasCustomLangDirective = /target language|output in|日本語|中文|english|spanish|french|german|korean|russian|portuguese/i.test(instruction);
    const langSuffix = hasCustomLangDirective ? "" : ` (Default language: **${outLangName}** unless instruction specifies otherwise)`;
    return `${idx + 1}. "${s.id}" (${s.label}): ${instruction}${langSuffix}`;
  });
  const jsonProps = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });
  if (options.learnInRewrite && !slots.some((s) => s.role === "vocab")) {
    taskLines.push(
      `${slots.length + 1}. "vocab": Extract 2\u20133 high-value authentic technical expressions or collocations relevant to this prompt as a single inline string \`term (meaning) \xB7 term2 (meaning)\` ${spec.vocabInstruction}.`
    );
    jsonProps.push(`  "vocab": "term1 (...) \xB7 term2 (...)"`);
  }
  const rules = normalizePromptRules(options.promptRule);
  const customRuleBlock = rules.length > 0 ? `

[USER CUSTOM SPECIFICATION & STACKED CONDITIONS - MANDATORY]:
Ensure every generated candidate incorporates the following user-specified condition(s):
${rules.map((r, i) => `(${i + 1}) ${r}`).join("\n")}` : "";
  const contextBlock = options.context && options.context.trim() ? `

[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use this context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and domain terminology. NEVER invent unmentioned requirements or copy unrelated code from the context.` : "";
  return `You are an elite Bilingual Translation & Prompt Architect.
Transform the user's raw input into ${slots.length} distinct output slots strictly following each slot's specific instruction and target language:
${taskLines.join("\n")}

[STRICT QUALITY GUARDRAILS]:
- **100% Semantic Fidelity**: Translate or refine EVERY sentence, clause, and detail from the user's input from start to finish. NEVER summarize, truncate, or drop details unless a slot explicitly asks for condensation.
- **Respect Slot Role & Register**: If a slot asks for spoken/colloquial translation, output natural spoken flow; if it asks for formal/written translation, output polished written prose; if it asks for prompt structuring, compile clear objectives, isolate negative constraints (minimal diff, blast radius guard), and eliminate robotic AI filler.
- **Zero Hallucination**: Never invent unmentioned files, bug reports, or speculative features.
- **Code & Symbol Shield**: Preserve all CLI flags (e.g. \`--dry-run\`, \`-rf\`, \`--no-verify\`), package scopes/decorators, inline code, file paths, and technical identifiers 100% verbatim in every slot.${contextBlock}${customRuleBlock}${compileKillListInstruction(options.killList, options.globalKillList)}

Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
function buildModifySystemPrompt(options) {
  const normSource = (options.sourceLang || "en").toLowerCase().split("-")[0];
  const expNorm = (options.explainLang || normSource).toLowerCase().split("-")[0];
  const { code: outLangCode, name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang || "en",
    options.targetLang || "en",
    options.promptLang
  );
  const explainName = resolveLanguageName(expNorm);
  const explainLangDesc = `Explain each takeaway following the 3-Second Glanceability Rule strictly in the format: 'before \u2794 after (<= 10 words/chars grounded intuition in ${explainName})'.`;
  let linguisticProfile = "";
  if (outLangCode === "zh" || outLangCode === "tw") {
    linguisticProfile = `
[TARGET-LANGUAGE LINGUISTIC PROFILE: CHINESE]:
- Eliminate awkward English-style stacked relative clauses.
- Trim redundant pronouns and restore natural Chinese subject-omission flow.
- Fix measure words and verb-object collocations.
- Distinguish pragmatic distance: use respectful honorifics vs natural peer flow.`;
  } else if (outLangCode === "ja") {
    linguisticProfile = `
[TARGET-LANGUAGE LINGUISTIC PROFILE: JAPANESE]:
- Fix particles (\u52A9\u8A5E: \u306F, \u304C, \u3092, \u306B, \u3067) and natural verb-predicate dependencies.
- Maintain pragmatic consistency between casual team conversation and polite business context.`;
  } else if (outLangCode === "en") {
    linguisticProfile = `
[TARGET-LANGUAGE LINGUISTIC PROFILE: ENGLISH]:
- Fix prepositions (websites/platforms take 'on': 'on X', 'on GitHub', 'on Slack'), articles ('a' vs 'an'), and verb tenses.
- Zero casing/punctuation nitpicking: do NOT obsess over casual lowercase letters ('l' vs 'L') or missing trailing periods.`;
  }
  const rawSlots = options.promptSlots || options.customSlots;
  const slots = (Array.isArray(rawSlots) && rawSlots.length > 0 ? rawSlots : getDefaultModifySlots(options.sourceLang, options.explainLang)).filter((s) => s.enabled !== false && s.role !== "source");
  const taskLines = slots.map((s, idx) => {
    const num = idx + 1;
    const rawInst = s.role === "vocab" || s.id === "fixes" ? s.instruction || explainLangDesc : s.instruction || "";
    const instruction = interpolatePromptVariables(rawInst, {
      sourceLang: options.sourceLang || "en",
      targetLang: options.targetLang || "en",
      explainLang: options.explainLang || expNorm
    });
    return `${num}. "${s.id}" (${s.label}): ${instruction}`;
  });
  const jsonProps = [];
  slots.forEach((s) => {
    jsonProps.push(`  "${s.id}": "..."`);
    if (s.showMeaning && s.role !== "vocab") {
      jsonProps.push(`  "${s.id}_meaning": "..."`);
    }
  });
  const anchorBlock = outLangCode === "en" ? `[GOLDEN FEW-SHOT ANCHORS (Target: ${outLangName})]:
- Input: "this fucking bug happan again in X, it just suck so hard"
  Output: {
    "fixed": "this fucking bug happen again on X, it just sucks so hard",
    "native": "this fucking bug happened again on X, it honestly sucks so bad",
    "fixes": "happan \u2794 happen \xB7 in X \u2794 on X (platforms take on) \xB7 suck \u2794 sucks"
  }` : "";
  const contextBlock = options.context && options.context.trim() ? `

[CONVERSATION & PROJECT CONTEXT - USE FOR PRONOUN RESOLUTION]:
"""
${options.context.trim().slice(0, 500)}
"""
CRITICAL: Use context strictly to resolve anaphoric pronouns ("here", "this function", "as discussed") and domain terminology. NEVER invent unmentioned requirements or copy unrelated code.` : "";
  let codeSwitchingBlock = "";
  if (options.preserveCodeSwitching) {
    codeSwitchingBlock = `

[CODE-SWITCHING PRESERVATION]:
If the user's input draft contains native ${options.sourceLang || "en"} words or expressions mixed in, seamlessly translate them into ${outLangName} in the fixed and native outputs, and explicitly record the translation in the takeaways ("fixes").`;
  }
  let systemHintBlock = "";
  if (options.systemHint) {
    const rawHints = Array.isArray(options.systemHint) ? options.systemHint : [options.systemHint];
    const hints = rawHints.map((h) => interpolatePromptVariables(h, { sourceLang: options.sourceLang || "en", targetLang: options.targetLang || "en", explainLang: options.explainLang || expNorm }).trim()).filter(Boolean);
    if (hints.length > 0) {
      systemHintBlock = `

[USER SPECIFIED MODE RULES - MANDATORY]:
${hints.map((h, i) => `(${i + 1}) ${h}`).join("\n")}`;
    }
  }
  return `You are an elite Developer Language Editor and Real-Time Proofreader.
The user is writing directly in ${outLangName}, but their draft may contain fast typing slips, grammatical errors, wrong prepositions, or non-native phrasing.
Perform proofreading according to the following tasks:
${taskLines.join("\n")}

[CRITICAL PROOFREADING RULES]:
- **Zero Level Leap (i+1 Rule)**: Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose.
- **Zero Tone Sanitization**: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%!
- **Zero Punctuation/Casing Nitpicking**: Do NOT obsess over casual casing or missing periods.
- 100% preserve user's original words, rhythm, and cadence!${linguisticProfile}${contextBlock}
${anchorBlock ? `
${anchorBlock}
` : ""}${codeSwitchingBlock}${systemHintBlock}${compileKillListInstruction(options.killList, options.globalKillList)}
Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

// src/presets.ts
var SEED_NAMES = {
  en: {
    companion: "Companion",
    direct: "Logical Spec",
    liveFlow: "Live Flow",
    candidates: "Candidates",
    loadoutSpec: "Brain-Dump Spec",
    loadoutCommit: "Commit Dehydrator",
    loadoutOss: "OSS Peer Comms",
    loadoutYap: "Indie Shipper",
    vocab: "Key Terms",
    fixed: "Fixed",
    native: "Native",
    takeaway: "Takeaways"
  },
  zh: {
    companion: "\u7EAF\u4F34\u5B66",
    direct: "\u89C4\u8303\u76F4\u53D1",
    liveFlow: "\u5B9E\u6218\u72C2\u98D9",
    candidates: "\u6311\u5019\u9009",
    loadoutSpec: "\u8111\u66B4\u538B\u94F8",
    loadoutCommit: "\u63D0\u4EA4\u8131\u6C34",
    loadoutOss: "\u5F00\u6E90\u5BF9\u7EBF",
    loadoutYap: "\u6781\u5BA2\u53D1\u63A8",
    vocab: "\u6838\u5FC3\u8868\u8FBE",
    fixed: "\u539F\u53E5\u4FEE\u8865",
    native: "\u5730\u9053\u8868\u8FBE",
    takeaway: "\u6536\u83B7\u590D\u76D8"
  },
  tw: {
    companion: "\u7D14\u4F34\u5B78",
    direct: "\u898F\u7BC4\u76F4\u767C",
    liveFlow: "\u5BE6\u6230\u72C2\u98C6",
    candidates: "\u6311\u5019\u9078",
    loadoutSpec: "\u8166\u66B4\u58D3\u9444",
    loadoutCommit: "\u63D0\u4EA4\u812B\u6C34",
    loadoutOss: "\u958B\u6E90\u5C0D\u7DDA",
    loadoutYap: "\u6975\u5BA2\u767C\u63A8",
    vocab: "\u6838\u5FC3\u8868\u9054",
    fixed: "\u539F\u53E5\u4FEE\u88DC",
    native: "\u9053\u5730\u8868\u9054",
    takeaway: "\u6536\u7A6B\u8907\u76E4"
  },
  ja: {
    companion: "\u4F34\u8D70",
    direct: "\u4ED5\u69D8\u76F4\u884C",
    liveFlow: "\u5B9F\u6226\u75BE\u8D70",
    candidates: "\u5019\u88DC\u9078\u629E",
    loadoutSpec: "\u4ED5\u69D8\u92F3\u9020",
    loadoutCommit: "\u30B3\u30DF\u30C3\u30C8\u8131\u6C34",
    loadoutOss: "OSS\u5BFE\u8A71",
    loadoutYap: "\u767A\u4FE1\u6295\u7A3F",
    vocab: "\u91CD\u8981\u8A9E\u5F59",
    fixed: "\u539F\u6587\u4FEE\u6B63",
    native: "\u81EA\u7136\u8868\u73FE",
    takeaway: "\u91CD\u8981\u30DD\u30A4\u30F3\u30C8"
  },
  ko: {
    companion: "\uB3D9\uD589\uD559\uC2B5",
    direct: "\uB17C\uB9AC\uC815\uC81C",
    liveFlow: "\uC2E4\uC804\uC9C8\uC8FC",
    candidates: "\uD6C4\uBCF4\uC120\uD0DD",
    loadoutSpec: "\uC0AC\uC591\uC8FC\uC870",
    loadoutCommit: "\uCEE4\uBC0B\uC815\uC81C",
    loadoutOss: "OSS\uB300\uD654",
    loadoutYap: "\uAC1C\uBC1C\uC790\uBC1C\uC2E0",
    vocab: "\uD575\uC2EC\uC5B4\uD718",
    fixed: "\uC6D0\uBB38\uC218\uC815",
    native: "\uC790\uC5F0\uC2A4\uB7EC\uC6B4\uD45C\uD604",
    takeaway: "\uD575\uC2EC\uD3EC\uC778\uD2B8"
  },
  es: {
    companion: "Aprendizaje",
    direct: "Directo L\xF3gico",
    liveFlow: "Flujo en Vivo",
    candidates: "Candidatos",
    loadoutSpec: "Spec L\xF3gica",
    loadoutCommit: "Commit Deshidratado",
    loadoutOss: "OSS Comms",
    loadoutYap: "Post Indie",
    vocab: "T\xE9rminos clave",
    fixed: "Corregido",
    native: "Nativo",
    takeaway: "Puntos clave"
  },
  fr: {
    companion: "Compagnon",
    direct: "Direct Logique",
    liveFlow: "Flux en Direct",
    candidates: "Candidats",
    loadoutSpec: "Sp\xE9cification",
    loadoutCommit: "Commit \xC9pur\xE9",
    loadoutOss: "Comms OSS",
    loadoutYap: "Post Indie",
    vocab: "Termes cl\xE9s",
    fixed: "Corrig\xE9",
    native: "Naturel",
    takeaway: "Points cl\xE9s"
  },
  de: {
    companion: "Begleitung",
    direct: "Direkte Logik",
    liveFlow: "Live-Fluss",
    candidates: "Kandidaten",
    loadoutSpec: "Spezifikation",
    loadoutCommit: "Commit-Kompakt",
    loadoutOss: "OSS-Dialog",
    loadoutYap: "Indie-Post",
    vocab: "Schl\xFCsselbegriffe",
    fixed: "Korrigiert",
    native: "Nativ",
    takeaway: "Wichtige Punkte"
  },
  ru: {
    companion: "\u0421\u043E\u043F\u0440\u043E\u0432\u043E\u0436\u0434\u0435\u043D\u0438\u0435",
    direct: "\u041F\u0440\u044F\u043C\u043E\u0439 \u043F\u043E\u0442\u043E\u043A",
    liveFlow: "\u0416\u0438\u0432\u043E\u0439 \u043F\u043E\u0442\u043E\u043A",
    candidates: "\u041A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u044B",
    loadoutSpec: "\u0421\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F",
    loadoutCommit: "\u041A\u043E\u043C\u043C\u0438\u0442-\u0434\u0435\u0445\u0438\u0434\u0440\u0430\u0442",
    loadoutOss: "OSS-\u0434\u0438\u0430\u043B\u043E\u0433",
    loadoutYap: "\u0418\u043D\u0434\u0438-\u043F\u043E\u0441\u0442",
    vocab: "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430",
    fixed: "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E",
    native: "\u041D\u0430\u0442\u0438\u0432\u043D\u044B\u0439",
    takeaway: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435"
  }
};
function resolveSeedNames(lang = "en") {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  return SEED_NAMES[norm] || SEED_NAMES.en;
}
function resolveModeDisplayName(modeId, lang = "en") {
  const n = resolveSeedNames(lang);
  const norm = (modeId || "").toLowerCase();
  switch (norm) {
    case "companion":
    case "original":
      return n.companion;
    case "direct":
    case "lazy":
    case "english":
      return n.direct;
    case "live-flow":
    case "modify":
    case "raw":
      return n.liveFlow;
    case "candidates":
    case "select":
      return n.candidates;
    case "off": {
      const OFF_MAP = {
        zh: "\u5DF2\u5173\u95ED",
        tw: "\u5DF2\u95DC\u9589",
        ja: "\u30AA\u30D5",
        ko: "\uAEBC\uC9D0",
        es: "Apagado",
        fr: "D\xE9sactiv\xE9",
        de: "Aus",
        ru: "\u0412\u044B\u043A\u043B",
        en: "Off"
      };
      const norm2 = (lang || "en").toLowerCase().split("-")[0];
      return OFF_MAP[norm2] || OFF_MAP.en;
    }
    default:
      return modeId;
  }
}
function localizeModeName(modeId, currentName, sourceLang = "en") {
  const isChineseSource = sourceLang === "zh" || sourceLang === "tw";
  const hasChinese = /[\u4e00-\u9fa5]/.test(currentName || "");
  const normId = (modeId || "").toLowerCase();
  if (!isChineseSource && (hasChinese || !currentName)) {
    return resolveModeDisplayName(normId, sourceLang);
  }
  if (!isChineseSource && (normId === "companion" || normId === "original" || normId === "direct" || normId === "live-flow" || normId === "off" || normId === "candidates")) {
    return resolveModeDisplayName(normId, sourceLang);
  }
  return currentName || resolveModeDisplayName(normId, sourceLang);
}
function localizeModes(modes, sourceLang = "en", explainLang) {
  return modes.map((m) => {
    const localizedName = localizeModeName(m.id, m.name, sourceLang);
    const localizedSlots = Array.isArray(m.slots) ? m.slots.map((s) => ({
      ...s,
      label: localizeSlotLabel(s.id, s.label, sourceLang)
    })) : [];
    return {
      ...m,
      name: localizedName,
      slots: localizedSlots
    };
  });
}
function getDefaultFactoryModes(sourceLang = "en", explainLang) {
  const n = resolveSeedNames(sourceLang);
  return [
    // Archetype 1: Companion (pass-through) keeps the 5-second-gap learning card alive out of the box.
    {
      id: "companion",
      name: n.companion,
      aliases: ["original"],
      flow: "translate",
      action: "pass-through",
      hud: "tree",
      reasoning: "low",
      slots: getDefaultSlots(sourceLang),
      enabled: true
    },
    {
      id: "direct",
      name: n.direct,
      aliases: ["lazy"],
      flow: "translate",
      action: "transform",
      hud: "preview",
      reasoning: "low",
      slots: [
        {
          id: "direct_spec",
          label: n.direct,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Compile user's raw, colloquial, or fragmented thoughts from ${sourceLang} into a high-signal AI Coding Agent Prompt (Intent Compiler). (1) Start with an active imperative verb (e.g. 'Inspect', 'Refactor', 'Implement', 'Fix', 'Trace'); (2) Isolate the core technical objective; (3) Extract explicit or implicit negative constraints (minimal diff, blast radius guard, leave unrelated files untouched, zero speculative scaffolding); (4) Preserve all code tokens, file paths, and CLI flags 100% verbatim; (5) Resolve anaphoric pronouns ('this function', 'here', 'as discussed') cleanly when context permits; (6) Eliminate conversational filler and AI clich\xE9s. NEVER invent unmentioned files or unrequested features.",
          enabled: true
        },
        {
          id: "vocab",
          label: n.vocab,
          role: "vocab",
          instruction: "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction following the 3-Second Glanceability Rule: 'term (${explainLang} meaning) \xB7 term2 (...)'.",
          enabled: true
        }
      ],
      enabled: true
    },
    {
      id: "live-flow",
      name: n.liveFlow,
      aliases: ["raw"],
      flow: "proofread",
      action: "transform",
      hud: "adaptive-takeaway",
      reasoning: "low",
      slots: [
        {
          id: "fixed",
          label: n.fixed,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct ONLY spelling mistakes, fast typos, syntax structure (e.g. 'want that you can' \u2794 'want you to'), wrong prepositions/articles, and grammatical slips in the user's ${targetLang} sentence. CRITICAL RULES: (1) Zero Level Leap (i+1 Rule): Match user's natural vocabulary tier; do NOT artificially inflate everyday dev text into academic prose. (2) Zero Tone Sanitization: NEVER censor swear words or raw emotions (e.g. 'fuck', 'suck', 'shit')\u2014passion and emotional heat are natural and MUST be preserved 100%! (3) Zero Punctuation/Casing Nitpicking. (4) 100% preserve original words and cadence.",
          hideWhenLong: true,
          enabled: true
        },
        {
          id: "native",
          label: n.native,
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Provide a natural, idiomatic native phrasing expressing the exact same intent without level-leaping.",
          hideWhenLong: true,
          enabled: true
        },
        {
          id: "fixes",
          label: n.takeaway,
          role: "vocab",
          instruction: "Extract 1-3 essential takeaways in the format: 'before \u2794 after (<= 10 words/chars grounded intuition in ${explainLang})'.",
          enabled: true
        }
      ],
      enabled: true
    }
  ];
}
var PRESET_LOADOUTS = {
  spec: {
    id: "spec",
    name: "Brain-Dump to Spec",
    description: "Transforms unstructured thoughts into clear Objective, Constraints, Edge Cases, and Do Not Touch clauses for agent plan mode",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "spec",
      name: resolveSeedNames(sourceLang).loadoutSpec,
      flow: "translate",
      action: "transform",
      hud: "preview",
      target: "agent",
      reasoning: "medium",
      killList: ["make it fast", "handle errors properly", "delve", "seamless", "robust"],
      slots: [
        {
          id: "spec",
          label: "Spec",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Restructure user's raw thoughts from ${sourceLang} into structured engineering specification for an AI coding agent with explicit sections: Objective, Constraints, Edge Cases, and Do Not Touch modules. Use rigorous system architecture terms (e.g. idempotency, dead-letter queue, exponential backoff, rollback). NEVER invent unmentioned architectural features.",
          enabled: true
        },
        {
          id: "vocab",
          label: "Arch Terms",
          role: "vocab",
          instruction: "Extract 2-3 key architectural term mappings with explanations in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  },
  commit: {
    id: "commit",
    name: "Commit Dehydrator",
    description: "Extracts git diff and intent into conventional commits format (first line <=72 chars, imperative verb, Root Cause & Impact body)",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "commit",
      name: resolveSeedNames(sourceLang).loadoutCommit,
      flow: "translate",
      action: "transform",
      hud: "preview",
      target: "clipboard",
      reasoning: "low",
      contextAware: true,
      killList: ["enhance", "robust", "seamless", "streamline", "comprehensive", "This PR aims to", "in summary"],
      slots: [
        {
          id: "commit",
          label: "Commit",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate strict Conventional Commits format (e.g. 'fix(scope): ...' or 'feat(scope): ...'). First line MUST be <= 72 characters starting directly with an imperative active verb (e.g. 'Prevent', 'Clear', 'Guard against', 'Handle'). Body must state strictly Root Cause and Impact without AI filler.",
          enabled: true
        },
        {
          id: "vocab",
          label: "Git Verbs",
          role: "vocab",
          instruction: "Highlight the imperative Git verb replacement and rationale in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  },
  oss: {
    id: "oss",
    name: "OSS Peer Comms",
    description: "Transforms blunt feedback or bug reports into peer-level, objective, non-defensive GitHub issue/PR comments (nit, blocker, repro)",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "oss",
      name: resolveSeedNames(sourceLang).loadoutOss,
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: ["Sorry for my bad English", "Thank you so much for your kind review", "I would really appreciate it if", "delve"],
      slots: [
        {
          id: "peer_review",
          label: "Peer Comms",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Transform user's technical argument or critique from ${sourceLang} into objective, peer-level engineering communication. Erase self-deprecation (never say 'sorry for poor english') and personal blame. Inject natural GitHub maintainer idioms (e.g. 'nit:', 'under contention', 'race condition', 'idiomatic', 'repro:').",
          enabled: true
        },
        {
          id: "vocab",
          label: "Peer Idioms",
          role: "vocab",
          instruction: "Extract 1-2 diplomatic peer engineering expressions in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  },
  yap: {
    id: "yap",
    name: "Indie Hacker Shipper",
    description: "Distills technical builds into cold, high-density Indie Hacker tech posts (<280 chars) for X and HN with 0 emojis and 0 corporate hype",
    loadout: (sourceLang = "en", _explainLang) => ({
      id: "yap",
      name: resolveSeedNames(sourceLang).loadoutYap,
      flow: "translate",
      action: "transform",
      hud: "tree",
      target: "clipboard",
      reasoning: "low",
      killList: ["\u{1F680}", "\u{1F525}", "\u2728", "\u{1F9F5}", "Excited to announce", "Game-changer", "Revolutionize", "Unleash", "delve", "tapestry"],
      slots: [
        {
          id: "tweet",
          label: "Post",
          role: "rewrite",
          instruction: "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Generate cold, high-density developer post under 280 characters. Structure: Pain (what sucked before) \u2794 What was built (one-line solution) \u2794 Under the hood (concrete technical mechanism). Zero emoji spam, zero marketing hype, direct developer voice.",
          enabled: true
        },
        {
          id: "vocab",
          label: "Dev Slang",
          role: "vocab",
          instruction: "Extract 1-2 authentic developer phrasing alternatives in ${explainLang}.",
          enabled: true
        }
      ],
      enabled: true
    })
  }
};
function getPresetLoadout(id, sourceLang = "en", explainLang) {
  const normId = id.trim().toLowerCase();
  const found = PRESET_LOADOUTS[normId];
  return found ? found.loadout(sourceLang, explainLang) : null;
}
function listPresetLoadouts() {
  return Object.values(PRESET_LOADOUTS);
}
function addCustomMode(modes, newMode) {
  const normId = newMode.id.trim().toLowerCase();
  const existingIndex = modes.findIndex((m) => m.id.toLowerCase() === normId);
  const modeNormalized = {
    ...newMode,
    id: normId,
    name: newMode.name?.trim() || normId,
    flow: newMode.flow || "translate",
    action: newMode.action || "transform",
    hud: newMode.hud || "preview",
    slots: Array.isArray(newMode.slots) ? newMode.slots : [],
    enabled: newMode.enabled !== void 0 ? newMode.enabled : true
  };
  if (existingIndex >= 0) {
    const copy = [...modes];
    copy[existingIndex] = modeNormalized;
    return copy;
  }
  return [...modes, modeNormalized];
}
function removeCustomMode(modes, modeId) {
  const normId = modeId.trim().toLowerCase();
  return modes.filter((m) => m.id.toLowerCase() !== normId);
}
function toggleCustomMode(modes, modeId) {
  const normId = modeId.trim().toLowerCase();
  return modes.map((m) => m.id.toLowerCase() === normId ? { ...m, enabled: !m.enabled } : m);
}
var SLOT_PRESETS = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => getDefaultSlots(sourceLang)
  },
  social: {
    name: "Social",
    description: "Community building: Hook + Deep + Vocab",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Hook", role: "translation", instruction: "High-engagement opening hook for social threads.", showMeaning: true, enabled: true },
      { id: "written", label: "Deep", role: "translation", instruction: "Insightful technical value and architecture reasoning.", showMeaning: true, enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", instruction: "Key engagement idioms and phrases.", enabled: true }
    ]
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: \u53E3\u8A9E + \u656C\u8A9E + \u5358\u8A9E",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "\u539F\u6587", role: "source", enabled: true },
      { id: "spoken", label: "\u53E3\u8A9E", role: "translation", instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk).", showMeaning: true, enabled: true },
      { id: "written", label: "\u656C\u8A9E", role: "translation", instruction: "Formal, polite business Japanese (Keigo, professional email/PR).", showMeaning: true, enabled: true },
      { id: "vocab", label: "\u5358\u8A9E", role: "vocab", instruction: "Key Japanese vocabulary and idiomatic expressions.", enabled: true }
    ]
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Discussion", role: "translation", instruction: "Academic colloquium and seminar discussion tone.", showMeaning: true, enabled: true },
      { id: "written", label: "Paper", role: "translation", instruction: "Formal, objective academic prose suitable for papers.", showMeaning: true, enabled: true },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false }
    ]
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (_sourceLang = "en") => [
      { id: "source", label: "Source", role: "source", enabled: true },
      { id: "spoken", label: "Translation", role: "translation", instruction: "Natural, idiomatic target language translation.", showMeaning: true, enabled: true },
      { id: "written", label: "Written", role: "translation", enabled: false },
      { id: "vocab", label: "Vocab", role: "vocab", enabled: false }
    ]
  }
};
function resolveSlotsForPreset(presetName = "developer", sourceLang = "en") {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}
var LANGUAGE_PRESETS = {
  en: {
    slot1Label: "Spoken",
    slot2Label: "Written",
    vocabLabel: "Vocab",
    sourceLabel: "Source",
    hudTitle: "en \u21C4 ja",
    statusOriginal: "en \u21C4 ja",
    statusEnglish: "en \u21C4 ja",
    statusOff: "en \u21C4 ja: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[en \u21C4 ja] Companion mode: raw send + HUD learning card above",
    notifyEnglish: "[en \u21C4 ja] Direct mode: prompt optimized into target language",
    notifyOff: "[en \u21C4 ja] Companion disabled",
    notifyPaging: "[en \u21C4 ja] Long sentence paginated, use Alt+. or Alt+, to navigate",
    notifyNoHistory: "[en \u21C4 ja] No previous companion card recorded",
    notifyHistoryRestored: "[en \u21C4 ja] Restored previous companion card",
    notifyAgentHelp: "\u{1F4A1} Built-in lingual-tuner skill: Ask the agent to configure companion settings anytime.",
    notifyModelSwitched: "Companion model switched to: {model}",
    notifyLangSwitched: "Companion language switched to: {lang}",
    notifyLangInvalid: "Invalid language code. Supported: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[en \u21C4 ja] Capsule mode enabled: single-line compact view",
    notifyCompactOff: "[en \u21C4 ja] Tree branch mode enabled: full multi-slot view",
    notifyTimeout: "[en \u21C4 ja] Prompt rewrite timed out; original prompt passed",
    notifyError: "[en \u21C4 ja] Prompt rewrite error; original prompt passed",
    notifyModeNotFound: "[{pair}] Mode [{mode}] is not in your active registry. Run /lingual mode list to view available modes.",
    notifyModeLockedCycleBlocked: "[{pair}] Mode is locked to [{mode}]. Run /lingual unlock to cycle modes or specify mode directly.",
    notifyModeLockedSuccess: "[{pair}] Session mode locked to [{mode}]. Mode cycling is blocked. Run /lingual unlock to release.",
    notifyModeUnlockedSuccess: "[{pair}] Mode lock released. Free mode cycling and configuration sync restored.",
    notifyUnrecognizedSubcommand: '[{pair}] Unrecognized subcommand: "{cmd}". Current mode unchanged. Available: /lingual [1|2|3|0|on|off|lang|last|lock|status] or /l',
    notifyClipboardCopied: "Copied to clipboard (prompt intercepted - not sent to agent). Ready to paste into GitHub, PR, or X.",
    notifyTargetSwitched: "Target language switched to: {target} (native {source} unchanged)",
    langHelpText: "[Companion Language: {flow}]\n\u2022 Quick switch: /lang ja (target Japanese) \xB7 /lang en (target English)\n\u2022 Pair switch: /lang en ja \xB7 /lang ja en \xB7 /lang es en\n\u2022 Supported codes: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Switched to [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] optimizing prompt...",
    loadingFixSyntax: "  \u22EF [lingual] fixing syntax & typos...",
    loadingCandidates: "  \u22EF [lingual] generating prompt candidates...",
    statusLoadingOptimize: "[lingual] optimizing...",
    statusLoadingFix: "[lingual] fixing...",
    statusLoadingCandidates: "[lingual] generating candidates...",
    cmdDescMode: "Interactive mode picker or manage: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Display companion status report & model diagnostics: /lingual status",
    cmdDescModel: "View or change companion model: /lingual model [model-id|auto]",
    cmdDescLang: "Switch companion language: /lingual lang <pair> or /lang <pair>",
    cmdDescLast: "Replay previous companion card: /lingual last (or /last)",
    shortcutNextPage: "Next companion page segment",
    shortcutPrevPage: "Previous companion page segment",
    modePickerTitle: "Mode Switch",
    modePickerHint: "Press 1/2/3/0 to switch, Esc to cancel",
    capsuleSlot1Prefix: "Spk",
    capsuleSlot2Prefix: "Wrt",
    layoutCapsule: "Single-Line Capsule (1-Line)",
    layoutTree: "Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Companion Status Report",
    statusReportMode: "Mode",
    statusReportFlow: "Language Flow",
    statusReportModel: "Model",
    statusReportCache: "Cache",
    statusReportLayout: "Layout: Trifecta Minimalist Left-Rail Tree",
    statusReportAuth: "Auth: Pi Native In-Process Credentials",
    statusReportShortcuts: "Shortcuts: /lingual (or /l) \xB7 /lingual lang (or /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill",
    modeDescOriginal: "Companion \xB7 0ms pass-through",
    modeDescEnglish: "Direct \xB7 Deep code reasoning",
    modeDescOff: "Disabled",
    modelCurrentLabel: "Current companion model",
    modelFollowSession: "follow session",
    modelAvailableListHeader: "Available models (/lingual model <id>):",
    langUsageHint: "Usage: /lang <source> [target] (e.g. /lang ja en or /lang en zh)",
    langList: ["\u2022 zh", "\u2022 ja", "\u2022 en", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ru", "\u2022 ko"],
    slotsHeader: "Dynamic Slots Architecture",
    slotsActiveTag: "active",
    slotsNone: "No slots configured",
    slotsStatusEnabled: "enabled",
    slotsStatusDisabled: "disabled",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "\u{1F4AC} Natural Language Customization:",
    slotsNlExamples: ['\u2022 "Customize slots: show tweets and deep analysis, no source"'],
    slotsCliTitle: "CLI Management Commands:",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] Reset slots to clean defaults",
    slotsRemovedSuccess: '[{pair}] Removed slot [{id}] ("{label}")',
    slotsRemovedSourceNote: " (Source line will no longer appear on cards)",
    slotsToggled: "[{pair}] Slot [{id}] is now {status}",
    slotsAdded: '[{pair}] Added/updated slot [{id}] "{label}"',
    slotsNotFound: "[{pair}] Slot [{id}] not found",
    slotsUsageAdd: "Usage: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "Usage: /slots rm <slot-id>",
    slotsUsageToggle: "Usage: /slots toggle <slot-id>",
    slotsUnknown: 'Unknown slot command or preset "{cmd}".',
    spokenLabel: "Spoken",
    writtenLabel: "Written"
  },
  zh: {
    slot1Label: "\u53E3\u8BED",
    slot2Label: "\u5199\u4F5C",
    vocabLabel: "\u91CD\u70B9",
    sourceLabel: "\u539F\u6587",
    hudTitle: "zh \u21C4 en",
    statusOriginal: "zh \u21C4 en",
    statusEnglish: "zh \u21C4 en",
    statusOff: "zh \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[zh \u21C4 en] \u5DF2\u5207\u6362\u81F3\u3010\u539F\u6587\u6A21\u5F0F\u3011\uFF1A\u8F93\u5165\u4FDD\u6301\u7EAF\u51C0\u6BCD\u8BED\uFF0C\u4E0A\u65B9 HUD \u6D6E\u73B0\u4F34\u5B66\u89C6\u7A97",
    notifyEnglish: "[zh \u21C4 en] \u5DF2\u5207\u6362\u81F3\u3010\u82F1\u6587\u6A21\u5F0F\u3011\uFF1A\u53D1\u7ED9 AI \u7684\u8F93\u5165\u5C06\u81EA\u52A8\u8F6C\u6362\u4E3A\u7EAF\u6B63\u6280\u672F\u82F1\u6587",
    notifyOff: "[zh \u21C4 en] \u5DF2\u5173\u95ED\u4F34\u5B66",
    notifyPaging: "[zh \u21C4 en] \u957F\u53E5\u5DF2\u5207\u5206\u591A\u6BB5\uFF0C\u6309 Alt+. \u6216 Alt+, \u7FFB\u9875\u6D4F\u89C8",
    notifyNoHistory: "[zh \u21C4 en] \u6682\u65E0\u4E0A\u4E00\u6761\u4F34\u5B66\u8BB0\u5F55",
    notifyHistoryRestored: "[zh \u21C4 en] \u5DF2\u91CD\u65B0\u663E\u793A\u4E0A\u4E00\u6761\u4F34\u5B66\u5361\u7247",
    notifyAgentHelp: '\u{1F4A1} \u5185\u7F6E lingual-tuner \u69FD\u4F4D\u8C03\u4F18\u6280\u80FD\uFF1A\u76F4\u63A5\u5BF9\u5F53\u524D Agent \u8BF4 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66" \u5373\u53EF\u514D\u547D\u4EE4\u81EA\u52A8\u88C5\u914D\uFF01',
    notifyModelSwitched: "\u4F34\u5B66\u6A21\u578B\u5DF2\u5207\u6362\u4E3A: {model}",
    notifyLangSwitched: "\u4F34\u5B66\u8BED\u8A00\u5DF2\u5207\u6362\u4E3A: {lang}",
    notifyLangInvalid: "\u65E0\u6548\u7684\u8BED\u8A00\u4EE3\u7801\u3002\u652F\u6301: zh, tw, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[zh \u21C4 en] \u5DF2\u5F00\u542F\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\uFF1A\u6781\u7B80\u5360\u4F4D",
    notifyCompactOff: "[zh \u21C4 en] \u5DF2\u5207\u6362\u4E3A\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784\uFF1A\u5C55\u793A\u5B8C\u6574\u591A\u69FD\u4E0E\u8BED\u611F",
    notifyTimeout: "[zh \u21C4 en] \u63D0\u793A\u8BCD\u4F18\u5316\u8BF7\u6C42\u672A\u5C31\u7EEA\u6216\u8D85\u65F6\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyError: "[zh \u21C4 en] \u63D0\u793A\u8BCD\u4F18\u5316\u8BF7\u6C42\u5F02\u5E38\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyModeNotFound: "[{pair}] \u6A21\u5F0F\u3010{mode}\u3011\u4E0D\u5728\u5F53\u524D\u6CE8\u518C\u8868\u4E2D\u3002\u8F93\u5165 /lingual mode list \u67E5\u770B\u53EF\u7528\u6A21\u5F0F\u3002",
    notifyModeLockedCycleBlocked: "[{pair}] \u5F53\u524D\u6A21\u5F0F\u5DF2\u9501\u5B9A\u5728\u3010{mode}\u3011\u3002\u5982\u9700\u8F6E\u8F6C\uFF0C\u8BF7\u5148\u8F93\u5165 /lingual unlock \u89E3\u9501\uFF0C\u6216\u4F7F\u7528 /lingual 1|2|3|0 \u663E\u5F0F\u6307\u5B9A\u3002",
    notifyModeLockedSuccess: "[{pair}] \u4F1A\u8BDD\u6A21\u5F0F\u5DF2\u9501\u5B9A\u5728\u3010{mode}\u3011\u3002\u9632\u6B62\u5916\u90E8\u8FDB\u7A0B\u8986\u76D6\u4E0E\u65E0\u610F\u8F6E\u8F6C\uFF0C\u8F93\u5165 /lingual unlock \u53EF\u89E3\u9501\u3002",
    notifyModeUnlockedSuccess: "[{pair}] \u6A21\u5F0F\u9501\u5B9A\u5DF2\u89E3\u9664\uFF08\u5DF2\u89E3\u9501\uFF09\uFF0C\u6062\u590D\u81EA\u7531\u8F6E\u8F6C\u4E0E\u5916\u90E8\u914D\u7F6E\u540C\u6B65\u3002",
    notifyUnrecognizedSubcommand: '[{pair}] \u672A\u8BC6\u522B\u7684\u5B50\u547D\u4EE4: "{cmd}"\u3002\u5F53\u524D\u6A21\u5F0F\u4FDD\u6301\u4E0D\u53D8\u3002\u53EF\u7528\u547D\u4EE4: /lingual [1|2|3|0|on|off|lang|last|lock|status] \u6216 /l',
    notifyClipboardCopied: "\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF08\u5DF2\u62E6\u622A\u63D0\u793A\u8BCD\uFF0C\u672A\u53D1\u7ED9 Agent\uFF09\u3002\u53EF\u76F4\u63A5\u7C98\u8D34\u81F3 GitHub\u3001PR \u6216\u53D1\u63A8\u3002",
    notifyTargetSwitched: "\u76EE\u6807\u8BED\u8A00\u5DF2\u5207\u6362\u4E3A: {target}\uFF08\u6BCD\u8BED {source} \u4FDD\u6301\u4E0D\u53D8\uFF09",
    langHelpText: "[\u5F53\u524D\u4F34\u5B66\u8BED\u8A00: {flow}]\n\u2022 \u5E38\u7528\u5207\u6362: /lang ja (\u5207\u6362\u76EE\u6807\u4E3A\u65E5\u8BED) \xB7 /lang en (\u5207\u6362\u76EE\u6807\u4E3A\u82F1\u8BED)\n\u2022 \u53CC\u5411\u5207\u6362: /lang zh ja \xB7 /lang ja en \xB7 /lang en zh\n\u2022 \u652F\u6301\u8BED\u79CD: zh (\u4E2D\u6587), tw (\u7E41\u4E2D), ja (\u65E5\u8BED), ko (\u97E9\u8BED), en (\u82F1\u8BED), es (\u897F\u8BED), fr (\u6CD5\u8BED), de (\u5FB7\u8BED), ru (\u4FC4\u8BED)",
    modeSwitchedTemplate: "[{pair}] \u5DF2\u5207\u6362\u81F3\u3010{num}. {name} ({id})\u3011({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] \u89C4\u8303\u4F18\u5316\u63D0\u793A\u8BCD\u4E2D...",
    loadingFixSyntax: "  \u22EF [lingual] \u4FEE\u8865\u8BED\u6CD5\u4E0E\u9519\u8BCD\u4E2D...",
    loadingCandidates: "  \u22EF [lingual] \u751F\u6210\u5019\u9009\u63D0\u793A\u8BCD\u4E2D...",
    statusLoadingOptimize: "[lingual] \u4F18\u5316\u4E2D...",
    statusLoadingFix: "[lingual] \u4FEE\u8865\u4E2D...",
    statusLoadingCandidates: "[lingual] \u5019\u9009\u751F\u6210\u4E2D...",
    cmdDescMode: "\u4EA4\u4E92\u5F0F\u4F34\u5B66\u6A21\u5F0F\u5207\u6362\u6216\u7BA1\u7406: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "\u67E5\u770B\u4F34\u5B66\u72B6\u6001\u4E0E\u6A21\u578B\u8BCA\u65AD: /lingual status",
    cmdDescModel: "\u67E5\u770B\u6216\u5207\u6362\u4F34\u5B66\u6A21\u578B: /lingual model [model-id|auto]",
    cmdDescLang: "\u5207\u6362\u4F34\u5B66\u8BED\u8A00: /lingual lang <\u4EE3\u7801> \u6216 /lang <\u4EE3\u7801>",
    cmdDescLast: "\u56DE\u770B\u4E0A\u4E00\u6761\u4F34\u5B66\u5361\u7247: /lingual last (\u6216 /last)",
    shortcutNextPage: "\u5207\u6362\u81F3\u4E0B\u4E00\u6BB5\u4F34\u5B66\u5207\u7247",
    shortcutPrevPage: "\u5207\u6362\u81F3\u4E0A\u4E00\u6BB5\u4F34\u5B66\u5207\u7247",
    modePickerTitle: "\u4F34\u5B66\u6A21\u5F0F\u5207\u6362",
    modePickerHint: "\u6309\u6570\u5B57\u952E 1/2/3/0 \u76F4\u63A5\u751F\u6548\uFF0CEsc \u53D6\u6D88",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u5199",
    layoutCapsule: "\u5355\u884C\u80F6\u56CA\u6781\u7B80\u6D41 (1-Line Capsule)",
    layoutTree: "Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784 (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u8FD0\u884C\u72B6\u6001\u62A5\u544A",
    statusReportMode: "\u5F53\u524D\u6A21\u5F0F",
    statusReportFlow: "\u8BED\u8A00\u6D41\u5411",
    statusReportModel: "\u4F34\u5B66\u6A21\u578B",
    statusReportCache: "\u4F1A\u8BDD\u7F13\u5B58",
    statusReportLayout: "HUD\u5E03\u5C40: Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784",
    statusReportAuth: "\u51ED\u636E\u6A21\u5F0F: Pi \u539F\u751F\u8FDB\u7A0B\u5185\u8BA4\u8BC1 (Zero Config)",
    statusReportShortcuts: "\u5FEB\u6377\u64CD\u4F5C: /lingual (\u6216 /l) \xB7 /lingual lang (\u6216 /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "\u69FD\u4F4D\u8C03\u4F18: \u5185\u7F6E lingual-tuner \u69FD\u4F4D\u8C03\u4F18\u6280\u80FD\uFF08\u76F4\u63A5\u5411 Agent \u63CF\u8FF0\u5373\u53EF\u514D\u547D\u4EE4\u5B9A\u5236\uFF09",
    modeDescOriginal: "\u539F\u6587\u76F4\u901A \xB7 0ms\u975E\u963B\u585E",
    modeDescEnglish: "\u82F1\u6587\u6A21\u5F0F \xB7 \u6DF1\u5EA6\u4EE3\u7801\u63A8\u7406",
    modeDescOff: "\u5DF2\u5173\u95ED",
    modelCurrentLabel: "\u5F53\u524D\u4F34\u5B66\u6A21\u578B",
    modelFollowSession: "\u8DDF\u968F\u4F1A\u8BDD",
    modelAvailableListHeader: "\u53EF\u7528\u6A21\u578B\u5217\u8868 (/lingual model <id>):",
    langUsageHint: "\u7528\u6CD5: /lang <zh|ja|en|es|fr|de> [target] (\u5982 /lang ja \u6216 /lang zh ja)",
    langList: ["\u2022 zh", "\u2022 ja", "\u2022 en", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ko", "\u2022 ru"],
    slotsHeader: "\u52A8\u6001\u69FD\u4F4D\u67B6\u6784",
    slotsActiveTag: "\u6FC0\u6D3B",
    slotsNone: "\u672A\u914D\u7F6E\u4EFB\u4F55\u69FD\u4F4D",
    slotsStatusEnabled: "\u5DF2\u542F\u7528",
    slotsStatusDisabled: "\u5DF2\u7981\u7528",
    slotsWithNuance: " +\u6BCD\u8BED\u5FAE\u91CA\u4E49",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8BED\u8A00\u5B9A\u5236\uFF08\u76F4\u63A5\u5BF9 Agent \u8BF4\u5373\u53EF\u5B9A\u5236\uFF09\uFF1A",
    slotsNlExamples: ['\u2022 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66\uFF1A\u53EA\u8981\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587"'],
    slotsCliTitle: "\u5E38\u7528\u5FEB\u6377\u547D\u4EE4\uFF1A",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] \u5DF2\u91CD\u7F6E\u69FD\u4F4D\u4E3A\u521D\u59CB\u9ED8\u8BA4\u72B6\u6001",
    slotsRemovedSuccess: '[{pair}] \u5DF2\u79FB\u9664\u69FD\u4F4D [{id}] ("{label}")',
    slotsRemovedSourceNote: " (\u5DF2\u7269\u7406\u9690\u85CF\u539F\u6587\u884C)",
    slotsToggled: "[{pair}] \u69FD\u4F4D [{id}] \u72B6\u6001\u53D8\u66F4\u4E3A: {status}",
    slotsAdded: '[{pair}] \u5DF2\u6DFB\u52A0/\u66F4\u65B0\u69FD\u4F4D [{id}] "{label}"',
    slotsNotFound: "[{pair}] \u672A\u627E\u5230\u69FD\u4F4D [{id}]",
    slotsUsageAdd: "\u7528\u6CD5: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "\u7528\u6CD5: /slots rm <slot-id>",
    slotsUsageToggle: "\u7528\u6CD5: /slots toggle <slot-id>",
    slotsUnknown: '\u672A\u8BC6\u522B\u7684\u69FD\u4F4D\u547D\u4EE4 "{cmd}"\u3002',
    spokenLabel: "\u53E3\u8BED",
    writtenLabel: "\u5199\u4F5C"
  },
  tw: {
    slot1Label: "\u53E3\u8A9E",
    slot2Label: "\u5BEB\u4F5C",
    vocabLabel: "\u91CD\u9EDE",
    sourceLabel: "\u539F\u6587",
    hudTitle: "tw \u21C4 en",
    statusOriginal: "tw \u21C4 en",
    statusEnglish: "tw \u21C4 en",
    statusOff: "tw \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[tw \u21C4 en] \u5DF2\u5207\u63DB\u81F3\u3010\u539F\u6587\u6A21\u5F0F\u3011\uFF1A\u8F38\u5165\u4FDD\u6301\u7D14\u6DE8\u6BCD\u8A9E\uFF0C\u4E0A\u65B9 HUD \u6D6E\u73FE\u4F34\u5B78\u8996\u7A97",
    notifyEnglish: "[tw \u21C4 en] \u5DF2\u5207\u63DB\u81F3\u3010\u82F1\u6587\u6A21\u5F0F\u3011\uFF1A\u767C\u7D66 AI \u7684\u8F38\u5165\u5C07\u81EA\u52D5\u8F49\u63DB\u70BA\u7D14\u6B63\u6280\u8853\u82F1\u6587",
    notifyOff: "[tw \u21C4 en] \u5DF2\u95DC\u9589\u4F34\u5B78",
    notifyPaging: "[tw \u21C4 en] \u9577\u53E5\u5DF2\u5207\u5206\u591A\u6BB5\uFF0C\u6309 Alt+. \u6216 Alt+, \u7FFB\u9801\u700F\u89BD",
    notifyNoHistory: "[tw \u21C4 en] \u66AB\u7121\u4E0A\u4E00\u689D\u4F34\u5B78\u8A18\u9304",
    notifyHistoryRestored: "[tw \u21C4 en] \u5DF2\u91CD\u65B0\u986F\u793A\u4E0A\u4E00\u689D\u4F34\u5B78\u5361\u7247",
    notifyAgentHelp: '\u{1F4A1} \u5167\u5EFA lingual-tuner \u69FD\u4F4D\u8ABF\u512A\u6280\u80FD\uFF1A\u76F4\u63A5\u5C0D\u7576\u524D Agent \u8AAA "\u5E6B\u6211\u5B9A\u5236\u4F34\u5B78" \u5373\u53EF\u514D\u547D\u4EE4\u81EA\u52D5\u88DD\u914D\uFF01',
    notifyModelSwitched: "\u4F34\u5B78\u6A21\u578B\u5DF2\u5207\u63DB\u70BA: {model}",
    notifyLangSwitched: "\u4F34\u5B78\u8A9E\u8A00\u5DF2\u5207\u63DB\u70BA: {lang}",
    notifyLangInvalid: "\u7121\u6548\u7684\u8A9E\u8A00\u4EE3\u78BC\u3002\u652F\u63F4: zh, tw, ja, en, es, fr, de, ko, ru",
    notifyCompactOn: "[tw \u21C4 en] \u5DF2\u958B\u555F\u55AE\u884C\u81A0\u56CA\u6A21\u5F0F\uFF1A\u6975\u7C21\u5360\u4F4D",
    notifyCompactOff: "[tw \u21C4 en] \u5DF2\u5207\u63DB\u70BA\u5DE6\u5C0E\u8ECC\u6A39\u72C0\u67B6\u69CB\uFF1A\u5C55\u793A\u5B8C\u6574\u591A\u69FD\u8207\u8A9E\u611F",
    notifyTimeout: "[tw \u21C4 en] \u63D0\u793A\u8A5E\u512A\u5316\u8ACB\u6C42\u672A\u5C31\u7DD2\u6216\u8D85\u6642\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyError: "[tw \u21C4 en] \u63D0\u793A\u8A5E\u512A\u5316\u8ACB\u6C42\u7570\u5E38\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyModeNotFound: "[{pair}] \u6A21\u5F0F\u3010{mode}\u3011\u4E0D\u5728\u7576\u524D\u8A3B\u518A\u8868\u4E2D\u3002\u8F38\u5165 /lingual mode list \u67E5\u770B\u53EF\u7528\u6A21\u5F0F\u3002",
    notifyModeLockedCycleBlocked: "[{pair}] \u7576\u524D\u6A21\u5F0F\u5DF2\u9396\u5B9A\u5728\u3010{mode}\u3011\u3002\u5982\u9700\u8F2A\u8F49\uFF0C\u8ACB\u5148\u8F38\u5165 /lingual unlock \u89E3\u9396\uFF0C\u6216\u4F7F\u7528 /lingual 1|2|3|0 \u986F\u5F0F\u6307\u5B9A\u3002",
    notifyModeLockedSuccess: "[{pair}] \u6703\u8A71\u6A21\u5F0F\u5DF2\u9396\u5B9A\u5728\u3010{mode}\u3011\u3002\u9632\u6B62\u5916\u90E8\u9032\u7A0B\u8986\u84CB\u8207\u7121\u610F\u8F2A\u8F49\uFF0C\u8F38\u5165 /lingual unlock \u53EF\u89E3\u9396\u3002",
    notifyModeUnlockedSuccess: "[{pair}] \u6A21\u5F0F\u9396\u5B9A\u5DF2\u89E3\u9664\uFF08\u5DF2\u89E3\u9396\uFF09\uFF0C\u6062\u5FA9\u81EA\u7531\u8F2A\u8F49\u8207\u5916\u90E8\u914D\u7F6E\u540C\u6B65\u3002",
    notifyUnrecognizedSubcommand: '[{pair}] \u672A\u8B58\u5225\u7684\u5B50\u547D\u4EE4: "{cmd}"\u3002\u7576\u524D\u6A21\u5F0F\u4FDD\u6301\u4E0D\u8B8A\u3002\u53EF\u7528\u547D\u4EE4: /lingual [1|2|3|0|on|off|lang|last|lock|status] \u6216 /l',
    notifyClipboardCopied: "\u5DF2\u8907\u88FD\u5230\u526A\u8CBC\u7C3F\uFF08\u5DF2\u6514\u622A\u63D0\u793A\u8A5E\uFF0C\u672A\u767C\u7D66 Agent\uFF09\u3002\u53EF\u76F4\u63A5\u8CBC\u4E0A\u81F3 GitHub\u3001PR \u6216\u767C\u63A8\u3002",
    notifyTargetSwitched: "\u76EE\u6A19\u8A9E\u8A00\u5DF2\u5207\u63DB\u70BA: {target}\uFF08\u6BCD\u8A9E {source} \u4FDD\u6301\u4E0D\u8B8A\uFF09",
    langHelpText: "[\u7576\u524D\u4F34\u5B78\u8A9E\u8A00: {flow}]\n\u2022 \u5E38\u7528\u5207\u63DB: /lang ja (\u5207\u63DB\u76EE\u6A19\u70BA\u65E5\u8A9E) \xB7 /lang en (\u5207\u63DB\u76EE\u6A19\u70BA\u82F1\u8A9E)\n\u2022 \u96D9\u5411\u5207\u63DB: /lang tw ja \xB7 /lang ja en \xB7 /lang en zh\n\u2022 \u652F\u63F4\u8A9E\u7A2E: zh (\u4E2D\u6587), tw (\u7E41\u4E2D), ja (\u65E5\u8A9E), ko (\u97D3\u8A9E), en (\u82F1\u8A9E), es (\u897F\u8A9E), fr (\u6CD5\u8A9E), de (\u5FB7\u8A9E), ru (\u4FC4\u8A9E)",
    modeSwitchedTemplate: "[{pair}] \u5DF2\u5207\u63DB\u81F3\u3010{num}. {name} ({id})\u3011({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] \u898F\u7BC4\u512A\u5316\u63D0\u793A\u8A5E\u4E2D...",
    loadingFixSyntax: "  \u22EF [lingual] \u4FEE\u88DC\u8A9E\u6CD5\u8207\u932F\u8A5E\u4E2D...",
    loadingCandidates: "  \u22EF [lingual] \u751F\u6210\u5019\u9078\u63D0\u793A\u8A5E\u4E2D...",
    statusLoadingOptimize: "[lingual] \u512A\u5316\u4E2D...",
    statusLoadingFix: "[lingual] \u4FEE\u88DC\u4E2D...",
    statusLoadingCandidates: "[lingual] \u5019\u9078\u751F\u6210\u4E2D...",
    cmdDescMode: "\u4E92\u52D5\u5F0F\u4F34\u5B78\u6A21\u5F0F\u5207\u63DB\u6216\u7BA1\u7406: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "\u67E5\u770B\u4F34\u5B78\u72C0\u614B\u8207\u6A21\u578B\u8A3A\u65B7: /lingual status",
    cmdDescModel: "\u67E5\u770B\u6216\u5207\u63DB\u4F34\u5B78\u6A21\u578B: /lingual model [model-id|auto]",
    cmdDescLang: "\u5207\u63DB\u4F34\u5B78\u8A9E\u8A00: /lingual lang <\u4EE3\u78BC> \u6216 /lang <\u4EE3\u78BC>",
    cmdDescLast: "\u56DE\u770B\u4E0A\u4E00\u689D\u4F34\u5B78\u5361\u7247: /lingual last (\u6216 /last)",
    shortcutNextPage: "\u5207\u63DB\u81F3\u4E0B\u4E00\u6BB5\u4F34\u5B78\u5207\u7247",
    shortcutPrevPage: "\u5207\u63DB\u81F3\u4E0A\u4E00\u6BB5\u4F34\u5B78\u5207\u7247",
    modePickerTitle: "\u4F34\u5B78\u6A21\u5F0F\u5207\u63DB",
    modePickerHint: "\u6309\u6578\u5B57\u9375 1/2/3/0 \u76F4\u63A5\u751F\u6548\uFF0CEsc \u53D6\u6D88",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u5BEB",
    layoutCapsule: "\u55AE\u884C\u81A0\u56CA\u6975\u7C21\u6D41 (1-Line Capsule)",
    layoutTree: "Trifecta \u958B\u653E\u5F0F\u5DE6\u5C0E\u8ECC\u6A39\u72C0\u67B6\u69CB (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u904B\u884C\u72C0\u614B\u5831\u544A",
    statusReportMode: "\u7576\u524D\u6A21\u5F0F",
    statusReportFlow: "\u8A9E\u8A00\u6D41\u5411",
    statusReportModel: "\u4F34\u5B78\u6A21\u578B",
    statusReportCache: "\u6703\u8A71\u5FEB\u53D6",
    statusReportLayout: "HUD\u4F48\u5C40: Trifecta \u958B\u653E\u5F0F\u5DE6\u5C0E\u8ECC\u6A39\u72C0\u67B6\u69CB",
    statusReportAuth: "\u6191\u64DA\u6A21\u5F0F: Pi \u539F\u751F\u9032\u7A0B\u5167\u8A8D\u8B49 (Zero Config)",
    statusReportShortcuts: "\u5FEB\u6377\u6307\u4EE4: /lingual (\u6216 /l) \xB7 /lingual lang (\u6216 /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "\u69FD\u4F4D\u8ABF\u512A: \u5167\u5EFA lingual-tuner \u69FD\u4F4D\u8ABF\u512A\u6280\u80FD",
    modeDescOriginal: "\u539F\u6587\u76F4\u901A \xB7 0ms \u975E\u963B\u585E",
    modeDescEnglish: "\u82F1\u6587\u6A21\u5F0F \xB7 \u6DF1\u5EA6\u4EE3\u78BC\u63A8\u7406",
    modeDescOff: "\u5DF2\u95DC\u9589",
    modelCurrentLabel: "\u7576\u524D\u4F34\u5B78\u6A21\u578B",
    modelFollowSession: "\u8DDF\u96A8\u6703\u8A71",
    modelAvailableListHeader: "\u53EF\u7528\u6A21\u578B\u6E05\u55AE (/lingual model <id>):",
    langUsageHint: "\u7528\u6CD5: /lang <zh|tw|ja|en|es|fr|de> [target]",
    langList: ["\u2022 zh", "\u2022 tw", "\u2022 ja", "\u2022 en", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ko", "\u2022 ru"],
    slotsHeader: "\u52D5\u614B\u69FD\u4F4D\u67B6\u69CB",
    slotsActiveTag: "\u555F\u7528",
    slotsNone: "\u5C1A\u672A\u914D\u7F6E\u4EFB\u4F55\u69FD\u4F4D",
    slotsStatusEnabled: "\u5DF2\u555F\u7528",
    slotsStatusDisabled: "\u5DF2\u505C\u7528",
    slotsWithNuance: " +\u6BCD\u8A9E\u5FAE\u91CB\u7FA9",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8A9E\u8A00\u5B9A\u5236\uFF1A",
    slotsNlExamples: ['\u2022 "\u5E6B\u6211\u5B9A\u5236\u4F34\u5B78\uFF1A\u53EA\u8981\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587"'],
    slotsCliTitle: "\u5E38\u7528\u5FEB\u6377\u6307\u4EE4\uFF1A",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] \u5DF2\u91CD\u7F6E\u69FD\u4F4D\u70BA\u521D\u59CB\u9810\u8A2D\u72C0\u614B",
    slotsRemovedSuccess: '[{pair}] \u5DF2\u79FB\u9664\u69FD\u4F4D [{id}] ("{label}")',
    slotsRemovedSourceNote: " (\u5DF2\u7269\u7406\u96B1\u85CF\u539F\u6587\u884C)",
    slotsToggled: "[{pair}] \u69FD\u4F4D [{id}] \u72C0\u614B\u8B8A\u66F4\u70BA: {status}",
    slotsAdded: '[{pair}] \u5DF2\u65B0\u589E/\u66F4\u65B0\u69FD\u4F4D [{id}] "{label}"',
    slotsNotFound: "[{pair}] \u627E\u4E0D\u5230\u69FD\u4F4D [{id}]",
    slotsUsageAdd: "\u7528\u6CD5: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "\u7528\u6CD5: /slots rm <slot-id>",
    slotsUsageToggle: "\u7528\u6CD5: /slots toggle <slot-id>",
    slotsUnknown: '\u672A\u8B58\u5225\u7684\u69FD\u4F4D\u547D\u4EE4 "{cmd}"\u3002',
    spokenLabel: "\u53E3\u8A9E",
    writtenLabel: "\u5BEB\u4F5C"
  },
  ja: {
    slot1Label: "\u53E3\u8A9E",
    slot2Label: "\u6587\u9762",
    vocabLabel: "\u5358\u8A9E",
    sourceLabel: "\u539F\u6587",
    hudTitle: "ja \u21C4 en",
    statusOriginal: "ja \u21C4 en",
    statusEnglish: "ja \u21C4 en",
    statusOff: "ja \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[ja \u21C4 en] \u3010\u539F\u6587\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u539F\u6587\u9001\u4FE1\uFF0B\u5B66\u7FD2\u30AB\u30FC\u30C9\u8868\u793A",
    notifyEnglish: "[ja \u21C4 en] \u3010\u82F1\u8A9E\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u82F1\u8A9E\u306B\u5909\u63DB\u3057\u3066\u9001\u4FE1",
    notifyOff: "[ja \u21C4 en] \u30AA\u30D5\u306B\u3057\u307E\u3057\u305F",
    notifyPaging: "[ja \u21C4 en] \u9577\u6587\u3092\u5206\u5272\u3057\u307E\u3057\u305F\u3002Alt+. \u307E\u305F\u306F Alt+, \u3067\u79FB\u52D5",
    notifyNoHistory: "[ja \u21C4 en] \u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093",
    notifyHistoryRestored: "[ja \u21C4 en] \u524D\u56DE\u306E\u30AB\u30FC\u30C9\u3092\u518D\u8868\u793A\u3057\u307E\u3057\u305F",
    notifyAgentHelp: "\u{1F4A1} lingual-tuner \u30B9\u30AD\u30EB\u3067\u81EA\u7531\u306B\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u53EF\u80FD\u3067\u3059\uFF08\u6BCD\u8A9E\u5207\u66FF\u5BFE\u5FDC\uFF09",
    notifyModelSwitched: "\u30E2\u30C7\u30EB\u3092\u5909\u66F4\u3057\u307E\u3057\u305F: {model}",
    notifyLangSwitched: "\u8A00\u8A9E\u3092\u5909\u66F4\u3057\u307E\u3057\u305F: {lang}",
    notifyLangInvalid: "\u7121\u52B9\u306A\u8A00\u8A9E\u30B3\u30FC\u30C9\u3067\u3059",
    notifyCompactOn: "[ja \u21C4 en] 1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A\u3092\u6709\u52B9\u5316\u3057\u307E\u3057\u305F",
    notifyCompactOff: "[ja \u21C4 en] \u30C4\u30EA\u30FC\u8868\u793A\u3092\u6709\u52B9\u5316\u3057\u307E\u3057\u305F",
    notifyTimeout: "[ja \u21C4 en] \u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u306E\u305F\u3081\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    notifyError: "[ja \u21C4 en] \u30A8\u30E9\u30FC\u306E\u305F\u3081\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    notifyModeNotFound: "[{pair}] \u30E2\u30FC\u30C9\u3010{mode}\u3011\u306F\u73FE\u5728\u306E\u767B\u9332\u8868\u306B\u5B58\u5728\u3057\u307E\u305B\u3093\u3002/lingual mode list \u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    notifyModeLockedCycleBlocked: "[{pair}] \u73FE\u5728\u306E\u30E2\u30FC\u30C9\u306F\u3010{mode}\u3011\u306B\u56FA\u5B9A\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u5DE1\u56DE\u5207\u66FF\u306B\u306F /lingual unlock \u3067\u89E3\u9664\u3059\u308B\u304B\u3001/lingual 1|2|3|0 \u3067\u76F4\u63A5\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    notifyModeLockedSuccess: "[{pair}] \u30BB\u30C3\u30B7\u30E7\u30F3\u30E2\u30FC\u30C9\u3092\u3010{mode}\u3011\u306B\u56FA\u5B9A\u3057\u307E\u3057\u305F\u3002\u5916\u90E8\u5909\u66F4\u3084\u610F\u56F3\u3057\u306A\u3044\u5207\u66FF\u3092\u9632\u6B62\u3057\u307E\u3059\u3002/lingual unlock \u3067\u89E3\u9664\u53EF\u80FD\u3002",
    notifyModeUnlockedSuccess: "[{pair}] \u30E2\u30FC\u30C9\u56FA\u5B9A\u3092\u89E3\u9664\u3057\u307E\u3057\u305F\u3002\u81EA\u7531\u5207\u66FF\u3068\u8A2D\u5B9A\u540C\u671F\u3092\u518D\u958B\u3057\u307E\u3059\u3002",
    notifyUnrecognizedSubcommand: '[{pair}] \u672A\u8A8D\u8B58\u306E\u30B5\u30D6\u30B3\u30DE\u30F3\u30C9: "{cmd}"\u3002\u73FE\u5728\u306E\u30E2\u30FC\u30C9\u3092\u7DAD\u6301\u3057\u307E\u3059\u3002\u5229\u7528\u53EF\u80FD: /lingual [1|2|3|0|on|off|lang|last|lock|status] \u307E\u305F\u306F /l',
    notifyClipboardCopied: "\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u306B\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F\uFF08Agent\u672A\u9001\u4FE1\uFF09\u3002GitHub\u3001PR\u3001SNS\u7B49\u3078\u8CBC\u308A\u4ED8\u3051\u53EF\u80FD\u3002",
    notifyTargetSwitched: "\u30BF\u30FC\u30B2\u30C3\u30C8\u8A00\u8A9E\u3092 {target} \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\uFF08\u6BCD\u8A9E {source} \u306F\u7DAD\u6301\uFF09",
    langHelpText: "[\u73FE\u5728\u306E\u8A00\u8A9E\u30DA\u30A2: {flow}]\n\u2022 \u30AF\u30A4\u30C3\u30AF\u5207\u66FF: /lang en (\u82F1\u8A9E\u3078) \xB7 /lang ja (\u65E5\u672C\u8A9E\u3078)\n\u2022 \u53CC\u65B9\u5411\u5207\u66FF: /lang ja en \xB7 /lang en ja \xB7 /lang ja zh\n\u2022 \u5BFE\u5FDC\u30B3\u30FC\u30C9: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] \u3010{num}. {name} ({id})\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] \u30D7\u30ED\u30F3\u30D7\u30C8\u6700\u9069\u5316\u4E2D...",
    loadingFixSyntax: "  \u22EF [lingual] \u69CB\u6587\u30FB\u8AA4\u5B57\u3092\u4FEE\u6B63\u4E2D...",
    loadingCandidates: "  \u22EF [lingual] \u5019\u88DC\u30D7\u30ED\u30F3\u30D7\u30C8\u751F\u6210\u4E2D...",
    statusLoadingOptimize: "[lingual] \u6700\u9069\u5316\u4E2D...",
    statusLoadingFix: "[lingual] \u4FEE\u6B63\u4E2D...",
    statusLoadingCandidates: "[lingual] \u5019\u88DC\u751F\u6210\u4E2D...",
    cmdDescMode: "\u5BFE\u8A71\u5F0F\u30E2\u30FC\u30C9\u5207\u66FF\u30FB\u7BA1\u7406: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "\u30B9\u30C6\u30FC\u30BF\u30B9\u30EC\u30DD\u30FC\u30C8\u3068\u8A3A\u65AD\u3092\u8868\u793A: /lingual status",
    cmdDescModel: "\u5B66\u7FD2\u30E2\u30C7\u30EB\u306E\u78BA\u8A8D\u30FB\u5207\u66FF: /lingual model [model-id|auto]",
    cmdDescLang: "\u8A00\u8A9E\u5207\u66FF: /lingual lang <code> \u307E\u305F\u306F /lang <code>",
    cmdDescLast: "\u524D\u56DE\u30AB\u30FC\u30C9\u518D\u8868\u793A: /lingual last (\u307E\u305F\u306F /last)",
    shortcutNextPage: "\u6B21\u306E\u30B9\u30E9\u30A4\u30B9\u3078\u79FB\u52D5",
    shortcutPrevPage: "\u524D\u306E\u30B9\u30E9\u30A4\u30B9\u3078\u79FB\u52D5",
    modePickerTitle: "\u4F34\u8D70\u30E2\u30FC\u30C9\u5207\u66FF",
    modePickerHint: "1/2/3/0 \u3067\u76F4\u884C\u3001Esc \u3067\u53D6\u6D88",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u6587",
    layoutCapsule: "1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A",
    layoutTree: "Trifecta \u30C4\u30EA\u30FC\u8868\u793A",
    statusReportTitle: "\u30B9\u30C6\u30FC\u30BF\u30B9\u30EC\u30DD\u30FC\u30C8",
    statusReportMode: "\u73FE\u5728\u306E\u30E2\u30FC\u30C9",
    statusReportFlow: "\u8A00\u8A9E\u30D5\u30ED\u30FC",
    statusReportModel: "\u30E2\u30C7\u30EB",
    statusReportCache: "\u30AD\u30E3\u30C3\u30B7\u30E5",
    statusReportLayout: "\u30EC\u30A4\u30A2\u30A6\u30C8: Trifecta \u30C4\u30EA\u30FC\u8868\u793A",
    statusReportAuth: "\u8A8D\u8A3C\u65B9\u5F0F: Pi \u30CD\u30A4\u30C6\u30A3\u30D6\u30A4\u30F3\u30D7\u30ED\u30BB\u30B9\u8A8D\u8A3C",
    statusReportShortcuts: "\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8: /lingual (\u307E\u305F\u306F /l) \xB7 /lingual lang (\u307E\u305F\u306F /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "\u30C1\u30E5\u30FC\u30CA\u30FC: lingual-tuner \u30B9\u30AD\u30EB",
    modeDescOriginal: "\u539F\u6587\u30D1\u30B9\u30B9\u30EB\u30FC \xB7 0ms\u975E\u540C\u671F",
    modeDescEnglish: "\u76F4\u884C \xB7 \u30B3\u30FC\u30C9\u63A8\u8AD6",
    modeDescOff: "\u30AA\u30D5",
    modelCurrentLabel: "\u73FE\u5728\u306E\u5B66\u7FD2\u30E2\u30C7\u30EB",
    modelFollowSession: "\u30BB\u30C3\u30B7\u30E7\u30F3\u9023\u52D5",
    modelAvailableListHeader: "\u5229\u7528\u53EF\u80FD\u306A\u30E2\u30C7\u30EB (/lingual model <id>):",
    langUsageHint: "\u4F7F\u3044\u65B9: /lang <source> [target] (\u4F8B: /lang ja en)",
    langList: ["\u2022 ja", "\u2022 en", "\u2022 zh", "\u2022 es", "\u2022 fr", "\u2022 de", "\u2022 ko", "\u2022 ru"],
    slotsHeader: "\u30C0\u30A4\u30CA\u30DF\u30C3\u30AF\u30B9\u30ED\u30C3\u30C8",
    slotsActiveTag: "\u6709\u52B9",
    slotsNone: "\u30B9\u30ED\u30C3\u30C8\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    slotsStatusEnabled: "\u6709\u52B9",
    slotsStatusDisabled: "\u7121\u52B9",
    slotsWithNuance: " +\u30CB\u30E5\u30A2\u30F3\u30B9",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8A00\u8A9E\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA:",
    slotsNlExamples: ['\u2022 "\u30C4\u30A4\u30FC\u30C8\u3068\u6280\u8853\u8003\u5BDF\u3060\u3051\u8868\u793A\u3057\u3066\u539F\u6587\u306F\u975E\u8868\u793A\u306B\u3057\u3066"'],
    slotsCliTitle: "CLI\u30B3\u30DE\u30F3\u30C9:",
    slotsCliHelp: ["\u2022 /slots add <id> <label> [instruction...]", "\u2022 /slots rm <id>", "\u2022 /slots toggle <id>", "\u2022 /slots reset"],
    slotsResetSuccess: "[{pair}] \u30C7\u30D5\u30A9\u30EB\u30C8\u8A2D\u5B9A\u306B\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F",
    slotsRemovedSuccess: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u3092\u524A\u9664\u3057\u307E\u3057\u305F",
    slotsRemovedSourceNote: " (\u539F\u6587\u306F\u8868\u793A\u3055\u308C\u306A\u304F\u306A\u308A\u307E\u3059)",
    slotsToggled: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u3092 {status} \u306B\u3057\u307E\u3057\u305F",
    slotsAdded: '[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] "{label}" \u3092\u8FFD\u52A0/\u66F4\u65B0\u3057\u307E\u3057\u305F',
    slotsNotFound: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    slotsUsageAdd: "\u4F7F\u3044\u65B9: /slots add <id> <label> [instruction...]",
    slotsUsageRm: "\u4F7F\u3044\u65B9: /slots rm <slot-id>",
    slotsUsageToggle: "\u4F7F\u3044\u65B9: /slots toggle <slot-id>",
    slotsUnknown: '\u4E0D\u660E\u306A\u30B9\u30ED\u30C3\u30C8\u30B3\u30DE\u30F3\u30C9 "{cmd}" \u3067\u3059\u3002',
    spokenLabel: "\u53E3\u8A9E",
    writtenLabel: "\u6587\u9762"
  },
  es: {
    slot1Label: "Coloquial",
    slot2Label: "Escrito",
    vocabLabel: "Vocabulario",
    sourceLabel: "Original",
    hudTitle: "es \u21C4 en",
    statusOriginal: "es \u21C4 en",
    statusEnglish: "es \u21C4 en",
    statusOff: "es \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[es \u21C4 en] Cambiado al modo [Original]: El texto se env\xEDa sin modificar",
    notifyEnglish: "[es \u21C4 en] Cambiado al modo [Ingl\xE9s]: El texto se transforma en ingl\xE9s t\xE9cnico",
    notifyOff: "[es \u21C4 en] Asistente desactivado",
    notifyPaging: "[es \u21C4 en] Texto largo segmentado. Presione Alt+. o Alt+, para navegar",
    notifyNoHistory: "[es \u21C4 en] No hay registros anteriores",
    notifyHistoryRestored: "[es \u21C4 en] Tarjeta anterior restaurada",
    notifyAgentHelp: '\u{1F4A1} Habilidad lingual-tuner integrada: Simplemente p\xEDdale a su Agente "Personaliza el asistente: solo tuit y an\xE1lisis, sin texto original" para configurar las ranuras al instante. Cambie de idioma con /lang <code>.',
    notifyModelSwitched: "Modelo cambiado a: {model}",
    notifyLangSwitched: "Idioma nativo cambiado a: {lang} (Nota: Las descripciones del men\xFA de comandos se actualizar\xE1n tras reiniciar la terminal)",
    notifyLangInvalid: "C\xF3digo de idioma no v\xE1lido. Admitidos: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[es \u21C4 en] Modo c\xE1psula de una l\xEDnea activado",
    notifyCompactOff: "[es \u21C4 en] Modo \xE1rbol completo restaurado",
    notifySlotSwitched: "[es \u21C4 en] Arquitectura de ranuras cambiada a [{preset}]: {desc}",
    notifyTimeout: "[es \u21C4 en] La traducci\xF3n al ingl\xE9s agot\xF3 el tiempo; se envi\xF3 el texto original",
    notifyError: "[es \u21C4 en] Error en la traducci\xF3n al ingl\xE9s; se envi\xF3 el texto original",
    notifyModeNotFound: "[{pair}] El modo [{mode}] no est\xE1 en el registro activo. Ejecute /lingual mode list para ver los modos disponibles.",
    notifyModeLockedCycleBlocked: "[{pair}] El modo est\xE1 bloqueado en [{mode}]. Use /lingual unlock para liberar o especifique el modo directamente.",
    notifyModeLockedSuccess: "[{pair}] Modo de sesi\xF3n bloqueado en [{mode}]. Ciclo bloqueado. Use /lingual unlock para liberar.",
    notifyModeUnlockedSuccess: "[{pair}] Bloqueo de modo liberado. Ciclo libre y sincronizaci\xF3n restaurados.",
    notifyUnrecognizedSubcommand: '[{pair}] Subcomando no reconocido: "{cmd}". Modo actual sin cambios. Disponibles: /lingual [1|2|3|0|on|off|lang|last|lock|status] o /l',
    notifyClipboardCopied: "Copiado al portapapeles (prompt interceptado, no enviado al agente). Listo para pegar.",
    notifyTargetSwitched: "Idioma de destino cambiado a: {target} (nativo {source} sin cambios)",
    langHelpText: "[Idioma de asistencia: {flow}]\n\u2022 Cambio r\xE1pido: /lang ja (japon\xE9s) \xB7 /lang en (ingl\xE9s)\n\u2022 Cambio de par: /lang es en \xB7 /lang en es \xB7 /lang es ja\n\u2022 C\xF3digos admitidos: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Cambiado a [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] optimizando prompt...",
    loadingFixSyntax: "  \u22EF [lingual] corrigiendo sintaxis y erratas...",
    loadingCandidates: "  \u22EF [lingual] generando candidatos de prompt...",
    statusLoadingOptimize: "[lingual] optimizando...",
    statusLoadingFix: "[lingual] corrigiendo...",
    statusLoadingCandidates: "[lingual] generando...",
    cmdDescMode: "Selector interactivo de modo o gesti\xF3n: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Mostrar diagn\xF3stico y estado del modelo: /lingual status",
    cmdDescModel: "Consultar o cambiar modelo: /lingual model [model-id|auto]",
    cmdDescLang: "Ver o cambiar idioma de asistencia: /lingual lang [c\xF3digo] o /lang [par]",
    cmdDescSlots: "Inspeccionar o cambiar ranuras: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "Alternar modo c\xE1psula de una l\xEDnea: /lingual compact",
    cmdDescLast: "Reaparecer tarjeta anterior: /lingual last (o /last)",
    cmdDescAgent: "Activar asistente de personalizaci\xF3n: /lingual tuner",
    shortcutNextPage: "Cambiar al siguiente segmento",
    shortcutPrevPage: "Cambiar al segmento anterior",
    modePickerTitle: "Selector de modo",
    modePickerHint: "1/2/3/0 para cambiar, Esc cancela",
    capsuleSlot1Prefix: "Col",
    capsuleSlot2Prefix: "Esc",
    layoutCapsule: "C\xE1psula de una l\xEDnea (1-Line Capsule)",
    layoutTree: "Trifecta \xE1rbol de gu\xEDa izquierda (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Informe de estado",
    statusReportMode: "Modo actual",
    statusReportFlow: "Flujo de idiomas",
    statusReportModel: "Modelo asistente",
    statusReportCache: "Cach\xE9 de sesi\xF3n",
    statusReportLayout: "Dise\xF1o HUD: Trifecta \xE1rbol de gu\xEDa izquierda (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Autenticaci\xF3n: Proceso nativo de Pi (Sin config \xB7 Seguro)",
    statusReportShortcuts: "Accesos directos: /lingual (o /l) \xB7 /lingual lang (o /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "Ajuste de ranuras: Habilidad lingual-tuner integrada (configure hablando con su Agente)",
    modeDescOriginal: "Directo \xB7 0ms no bloqueante",
    modeDescEnglish: "Modo ingl\xE9s \xB7 Razonamiento profundo",
    modeDescOff: "Apagado",
    modelCurrentLabel: "Modelo actual",
    modelFollowSession: "Siguiendo sesi\xF3n",
    modelAvailableListHeader: "Modelos disponibles (ejecute /lingual model <id>):",
    modelAutoFollowDesc: "auto (Sigue autom\xE1ticamente el modelo de la sesi\xF3n)",
    modelSelectHint: "Use /lingual model <id> o auto para asignar un modelo.",
    langUsageHint: "Uso: /lang <zh|tw|ja|ko|en|es|fr|de|ru> [target] (ej. /lang ja o /lang zh ja)",
    langList: [
      "\u2022 zh (Chino \u2794 Ingl\xE9s)",
      "\u2022 tw (Chino tradicional \u2794 Ingl\xE9s)",
      "\u2022 ja (Japon\xE9s \u2794 Ingl\xE9s)",
      "\u2022 ko (Coreano \u2794 Ingl\xE9s)",
      "\u2022 en (Ingl\xE9s \u2794 Japon\xE9s)",
      "\u2022 es (Espa\xF1ol \u2794 Ingl\xE9s)",
      "\u2022 fr (Franc\xE9s \u2794 Ingl\xE9s)",
      "\u2022 de (Alem\xE1n \u2794 Ingl\xE9s)",
      "\u2022 ru (Ruso \u2794 Ingl\xE9s)"
    ],
    // Ranuras dinámicas (Español)
    slotsHeader: "Arquitectura de ranuras din\xE1micas",
    slotsActiveTag: "activas",
    slotsNone: "No hay ranuras configuradas",
    slotsStatusEnabled: "activada",
    slotsStatusDisabled: "desactivada",
    slotsWithNuance: " +matiz",
    slotsNlTitle: "\u{1F4AC} Personalizaci\xF3n con lenguaje natural (consulte a su Agente directamente):",
    slotsNlExamples: [
      '\u2022 "Personaliza el asistente: solo tuit y an\xE1lisis profundo, sin texto original"',
      '\u2022 "Cambia el asistente a traducci\xF3n limpia de una sola ranura"',
      '\u2022 "Restablece las ranuras predeterminadas"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Comandos CLI r\xE1pidos:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Ocultar la fila de texto original",
      "\u2022 /slots compact2        - Ranura doble m\xEDnima",
      "\u2022 /slots reset           - Restablecer valores predeterminados",
      "\u2022 /slots toggle <id>     - Activar/desactivar ranura"
    ],
    slotsResetSuccess: "[{pair}] Ranuras restablecidas a los valores predeterminados",
    slotsRemovedSuccess: '[{pair}] Ranura [{id}] ("{label}") eliminada',
    slotsRemovedSourceNote: " (La l\xEDnea de texto original ya no aparecer\xE1)",
    slotsToggled: "[{pair}] La ranura [{id}] ahora est\xE1: {status}",
    slotsAdded: '[{pair}] Ranura [{id}] "{label}" agregada/actualizada',
    slotsNotFound: "[{pair}] No se encontr\xF3 la ranura [{id}]. Ejecute /slots para inspeccionar",
    slotsUsageAdd: "Uso: /slots add <id> <etiqueta> [instrucci\xF3n...]",
    slotsUsageRm: "Uso: /slots rm <id_ranura>",
    slotsUsageToggle: "Uso: /slots toggle <id_ranura>",
    slotsUnknown: '[{pair}] Comando o ajuste preestablecido desconocido "{cmd}". Escriba /slots para ver la ayuda',
    spokenLabel: "Coloquial",
    writtenLabel: "Escrito"
  },
  fr: {
    slot1Label: "Oral",
    slot2Label: "\xC9crit",
    vocabLabel: "Vocabulaire",
    sourceLabel: "Source",
    hudTitle: "fr \u21C4 en",
    statusOriginal: "fr \u21C4 en",
    statusEnglish: "fr \u21C4 en",
    statusOff: "fr \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[fr \u21C4 en] Mode [Original] activ\xE9 : Votre texte reste inchang\xE9",
    notifyEnglish: "[fr \u21C4 en] Mode [Anglais] activ\xE9 : Votre prompt est traduit en anglais technique",
    notifyOff: "[fr \u21C4 en] Compagnon d\xE9sactiv\xE9",
    notifyPaging: "[fr \u21C4 en] Long texte segment\xE9. Appuyez sur Alt+. ou Alt+, pour parcourir",
    notifyNoHistory: "[fr \u21C4 en] Aucun historique pr\xE9c\xE9dent",
    notifyHistoryRestored: "[fr \u21C4 en] Carte pr\xE9c\xE9dente restaur\xE9e",
    notifyAgentHelp: '\u{1F4A1} Comp\xE9tence lingual-tuner int\xE9gr\xE9e : Dites simplement \xE0 votre Agent "Personnalise le compagnon : uniquement tweet et analyse, sans texte original" pour ajuster les emplacements. Changez de langue avec /lang <code>.',
    notifyModelSwitched: "Mod\xE8le chang\xE9 pour : {model}",
    notifyLangSwitched: "Langue maternelle chang\xE9e en : {lang} (Note : L'autocompl\xE9tion des commandes sera actualis\xE9e apr\xE8s red\xE9marrage du terminal)",
    notifyLangInvalid: "Code de langue invalide. Pris en charge : zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[fr \u21C4 en] Mode capsule sur une seule ligne activ\xE9",
    notifyCompactOff: "[fr \u21C4 en] Mode arborescence compl\xE8te restaur\xE9",
    notifyTimeout: "[fr \u21C4 en] La traduction en anglais a expir\xE9 ; le prompt original a \xE9t\xE9 transmis",
    notifyError: "[fr \u21C4 en] Erreur de traduction en anglais ; le prompt original a \xE9t\xE9 transmis",
    notifyModeNotFound: "[{pair}] Le mode [{mode}] n'est pas dans votre registre actif. Ex\xE9cutez /lingual mode list pour voir les modes disponibles.",
    notifyModeLockedCycleBlocked: "[{pair}] Le mode est verrouill\xE9 sur [{mode}]. Ex\xE9cutez /lingual unlock pour d\xE9verrouiller ou sp\xE9cifiez le mode directement.",
    notifyModeLockedSuccess: "[{pair}] Mode de session verrouill\xE9 sur [{mode}]. D\xE9filement bloqu\xE9. Ex\xE9cutez /lingual unlock pour lib\xE9rer.",
    notifyModeUnlockedSuccess: "[{pair}] Verrouillage du mode d\xE9sactiv\xE9. D\xE9filement libre et synchronisation restaur\xE9s.",
    notifyUnrecognizedSubcommand: '[{pair}] Sous-commande non reconnue : "{cmd}". Mode actuel inchang\xE9. Disponibles : /lingual [1|2|3|0|on|off|lang|last|lock|status] ou /l',
    notifyClipboardCopied: "Copi\xE9 dans le presse-papiers (prompt intercept\xE9, non envoy\xE9 \xE0 l'agent). Pr\xEAt \xE0 coller.",
    notifyTargetSwitched: "Langue cible chang\xE9e en : {target} (langue native {source} inchang\xE9e)",
    langHelpText: "[Paire de langues : {flow}]\n\u2022 Changement rapide : /lang ja (japonais) \xB7 /lang en (anglais)\n\u2022 Changement de paire : /lang fr en \xB7 /lang en fr\n\u2022 Codes pris en charge : zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Chang\xE9 en [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] optimisation du prompt...",
    loadingFixSyntax: "  \u22EF [lingual] correction de la syntaxe et des fautes...",
    loadingCandidates: "  \u22EF [lingual] g\xE9n\xE9ration des variantes de prompt...",
    statusLoadingOptimize: "[lingual] optimisation...",
    statusLoadingFix: "[lingual] correction...",
    statusLoadingCandidates: "[lingual] g\xE9n\xE9ration...",
    cmdDescMode: "S\xE9lecteur interactif de mode ou gestion : /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Afficher le rapport d'\xE9tat et le diagnostic: /lingual status",
    cmdDescModel: "Consulter ou changer de mod\xE8le : /lingual model [model-id|auto]",
    cmdDescLang: "Afficher ou changer la langue d'assistance : /lingual lang [code] ou /lang [paire]",
    cmdDescCompact: "Basculer le mode capsule sur une ligne : /lingual compact",
    cmdDescLast: "R\xE9afficher la carte pr\xE9c\xE9dente : /lingual last (ou /last)",
    cmdDescAgent: "Lancer l'assistant de personnalisation : /lingual tuner",
    shortcutNextPage: "Passer au segment suivant",
    shortcutPrevPage: "Passer au segment pr\xE9c\xE9dent",
    modePickerTitle: "S\xE9lecteur de mode",
    modePickerHint: "1/2/3/0 pour changer, \xC9chap annule",
    capsuleSlot1Prefix: "Oral",
    capsuleSlot2Prefix: "\xC9crit",
    layoutCapsule: "Capsule sur une ligne (1-Line Capsule)",
    layoutTree: "Disposition HUD : Arbre guide gauche Trifecta (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Rapport d'\xE9tat",
    statusReportMode: "Mode actuel",
    statusReportFlow: "Flux linguistique",
    statusReportModel: "Mod\xE8le compagnon",
    statusReportCache: "Cache de session",
    statusReportLayout: "Disposition HUD : Arbre guide gauche Trifecta (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Authentification : Processus interne Pi natif (Z\xE9ro config \xB7 S\xE9curis\xE9)",
    statusReportShortcuts: "Raccourcis : /lingual (ou /l) \xB7 /lingual lang (ou /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "Ajustement d'emplacements : Comp\xE9tence lingual-tuner int\xE9gr\xE9e (d\xE9crivez vos pr\xE9f\xE9rences \xE0 l'Agent)",
    modeDescOriginal: "Passerelle directe \xB7 0ms non bloquant",
    modeDescEnglish: "Mode anglais \xB7 Raisonnement approfondi",
    modeDescOff: "D\xE9sactiv\xE9",
    modelCurrentLabel: "Mod\xE8le actuel",
    modelFollowSession: "Suit la session",
    modelAvailableListHeader: "Mod\xE8les disponibles (tapez /lingual model <id>):",
    modelAutoFollowDesc: "auto (Suit automatiquement le mod\xE8le principal)",
    modelSelectHint: "Entrez /lingual model <id> ou auto pour d\xE9finir le mod\xE8le.",
    langUsageHint: "Utilisation : /lang <zh|tw|ja|ko|en|es|fr|de|ru> [target] (ex : /lang ja ou /lang zh ja)",
    langList: [
      "\u2022 zh (Chinois \u2794 Anglais)",
      "\u2022 tw (Chinois traditionnel \u2794 Anglais)",
      "\u2022 ja (Japonais \u2794 Anglais)",
      "\u2022 ko (Cor\xE9en \u2794 Anglais)",
      "\u2022 en (Anglais \u2794 Japonais)",
      "\u2022 es (Espagnol \u2794 Anglais)",
      "\u2022 fr (Fran\xE7ais \u2794 Anglais)",
      "\u2022 de (Allemand \u2794 Anglais)",
      "\u2022 ru (Russe \u2794 Anglais)"
    ],
    // Emplacements dynamiques (Français)
    slotsHeader: "Architecture d'emplacements dynamiques",
    slotsActiveTag: "actifs",
    slotsNone: "Aucun emplacement configur\xE9",
    slotsStatusEnabled: "activ\xE9",
    slotsStatusDisabled: "d\xE9sactiv\xE9",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "\u{1F4AC} Personnalisation en langage naturel (demandez \xE0 votre Agent) :",
    slotsNlExamples: [
      '\u2022 "Personnalise le compagnon : uniquement tweet et analyse approfondie, sans texte original"',
      '\u2022 "Passe le compagnon \xE0 une traduction unique \xE9pur\xE9e"',
      '\u2022 "R\xE9initialise les emplacements par d\xE9faut"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Commandes CLI rapides :",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Masquer la ligne de texte source",
      "\u2022 /slots compact2        - Double emplacement minimal",
      "\u2022 /slots reset           - R\xE9initialiser par d\xE9faut",
      "\u2022 /slots toggle <id>     - Activer/d\xE9sactiver l'emplacement"
    ],
    slotsResetSuccess: "[{pair}] Emplacements r\xE9initialis\xE9s par d\xE9faut",
    slotsRemovedSuccess: '[{pair}] Emplacement [{id}] ("{label}") supprim\xE9',
    slotsRemovedSourceNote: " (La ligne source ne sera plus affich\xE9e)",
    slotsToggled: "[{pair}] L'emplacement [{id}] est maintenant : {status}",
    slotsAdded: '[{pair}] Emplacement [{id}] "{label}" ajout\xE9/mis \xE0 jour',
    slotsNotFound: "[{pair}] Emplacement [{id}] introuvable. Ex\xE9cutez /slots pour v\xE9rifier",
    slotsUsageAdd: "Utilisation : /slots add <id> <\xE9tiquette> [instruction...]",
    slotsUsageRm: "Utilisation : /slots rm <id_emplacement>",
    slotsUsageToggle: "Utilisation : /slots toggle <id_emplacement>",
    slotsUnknown: `[{pair}] Commande ou pr\xE9r\xE9glage inconnu "{cmd}". Tapez /slots pour afficher l'aide`,
    spokenLabel: "Oral",
    writtenLabel: "\xC9crit"
  },
  de: {
    slot1Label: "Gesprochen",
    slot2Label: "Schriftlich",
    vocabLabel: "Wortschatz",
    sourceLabel: "Quelle",
    hudTitle: "de \u21C4 en",
    statusOriginal: "de \u21C4 en",
    statusEnglish: "de \u21C4 en",
    statusOff: "de \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[de \u21C4 en] Modus [Original] aktiviert: Eingabe wird unver\xE4ndert weitergeleitet",
    notifyEnglish: "[de \u21C4 en] Modus [Englisch] aktiviert: Eingabe wird in technisches Englisch \xFCbersetzt",
    notifyOff: "[de \u21C4 en] Begleiter deaktiviert",
    notifyPaging: "[de \u21C4 en] Langer Text segmentiert. Mit Alt+. oder Alt+, bl\xE4ttern",
    notifyNoHistory: "[de \u21C4 en] Kein vorheriger Eintrag vorhanden",
    notifyHistoryRestored: "[de \u21C4 en] Vorherige Karte wiederhergestellt",
    notifyAgentHelp: '\u{1F4A1} Integrierter lingual-tuner Skill: Sagen Sie Ihrem Agenten einfach "Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext", um Slots anzupassen. Sprache wechseln mit /lang <code>.',
    notifyModelSwitched: "Modell gewechselt zu: {model}",
    notifyLangSwitched: "Muttersprache ge\xE4ndert zu: {lang} (Hinweis: Befehlsbeschreibungen werden nach dem Terminal-Neustart vollst\xE4ndig aktualisiert)",
    notifyLangInvalid: "Ung\xFCltiger Sprachcode. Unterst\xFCtzt: zh, tw, ja, ko, en, es, fr, de, ru",
    notifyCompactOn: "[de \u21C4 en] Einzeiliger Kapselmodus aktiviert",
    notifyCompactOff: "[de \u21C4 en] Vollst\xE4ndige Baumansicht wiederhergestellt",
    notifySlotSwitched: "[de \u21C4 en] Slot-Architektur auf [{preset}] umgestellt: {desc}",
    notifyTimeout: "[de \u21C4 en] Englische \xDCbersetzung hat das Zeitlimit \xFCberschritten; Originaltext wurde \xFCbergeben",
    notifyError: "[de \u21C4 en] Fehler bei der englischen \xDCbersetzung; Originaltext wurde \xFCbergeben",
    notifyModeNotFound: "[{pair}] Modus [{mode}] ist nicht im aktiven Register. F\xFChren Sie /lingual mode list aus, um verf\xFCgbare Modi anzuzeigen.",
    notifyModeLockedCycleBlocked: "[{pair}] Modus ist auf [{mode}] gesperrt. F\xFChren Sie /lingual unlock aus oder geben Sie den Modus direkt an.",
    notifyModeLockedSuccess: "[{pair}] Sitzungsmodus auf [{mode}] gesperrt. Moduswechsel gesperrt. /lingual unlock zum Entsperren.",
    notifyModeUnlockedSuccess: "[{pair}] Modussperre aufgehoben. Freier Wechsel und Synchronisation wiederhergestellt.",
    notifyUnrecognizedSubcommand: '[{pair}] Unbekannter Unterbefehl: "{cmd}". Aktueller Modus unver\xE4ndert. Verf\xFCgbar: /lingual [1|2|3|0|on|off|lang|last|lock|status] oder /l',
    notifyClipboardCopied: "In die Zwischenablage kopiert (Prompt abgefangen, nicht an Agent gesendet). Bereit zum Einf\xFCgen.",
    notifyTargetSwitched: "Zielsprache ge\xE4ndert zu: {target} (Muttersprache {source} unver\xE4ndert)",
    langHelpText: "[Sprachpaar: {flow}]\n\u2022 Schneller Wechsel: /lang ja (Japanisch) \xB7 /lang en (Englisch)\n\u2022 Paar-Wechsel: /lang de en \xB7 /lang en de\n\u2022 Unterst\xFCtzte Codes: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] Gewechselt zu [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] Optimiere Prompt...",
    loadingFixSyntax: "  \u22EF [lingual] Korrigiere Syntax & Tippfehler...",
    loadingCandidates: "  \u22EF [lingual] Generiere Prompt-Varianten...",
    statusLoadingOptimize: "[lingual] optimieren...",
    statusLoadingFix: "[lingual] korrigieren...",
    statusLoadingCandidates: "[lingual] generieren...",
    cmdDescMode: "Interaktiver Modus-W\xE4hler oder Verwaltung: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "Statusbericht und Modell-Diagnose anzeigen: /lingual status",
    cmdDescModel: "Modell pr\xFCfen oder wechseln: /lingual model [model-id|auto]",
    cmdDescLang: "Muttersprache anzeigen oder wechseln: /lingual lang [Code] oder /lang [Paar]",
    cmdDescSlots: "Slot-Architektur anzeigen/umstellen: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "Einzeiligen Kapselmodus umschalten: /lingual compact",
    cmdDescLast: "Vorherige Karte erneut anzeigen: /lingual last (oder /last)",
    cmdDescAgent: "Anleitung zur Anpassung und Sprachumstellung anzeigen: /lingual tuner",
    shortcutNextPage: "Zum n\xE4chsten Segment wechseln",
    shortcutPrevPage: "Zum vorherigen Segment wechseln",
    modePickerTitle: "Modus-Auswahl",
    modePickerHint: "1/2/3/0 zum Wechseln, Esc bricht ab",
    capsuleSlot1Prefix: "Ges",
    capsuleSlot2Prefix: "Sch",
    layoutCapsule: "Einzeilige Kapsel (1-Line Capsule)",
    layoutTree: "HUD-Layout: Trifecta Minimalistische Baumstruktur (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Statusbericht",
    statusReportMode: "Aktueller Modus",
    statusReportFlow: "Sprachfluss",
    statusReportModel: "Begleitmodell",
    statusReportCache: "Sitzungscache",
    statusReportLayout: "HUD-Layout: Trifecta Minimalistische Baumstruktur (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Authentifizierung: Pi nativer In-Process Modus (Zero Config \xB7 Sicher)",
    statusReportShortcuts: "Befehle: /lingual (oder /l) \xB7 /lingual lang (oder /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "Slot-Anpassung: Integrierter lingual-tuner Skill (Pr\xE4ferenzen einfach dem Agenten beschreiben)",
    modeDescOriginal: "Direkt \xB7 0ms nicht blockierend",
    modeDescEnglish: "Englisch-Modus \xB7 Tiefgreifende Logik",
    modeDescOff: "Aus",
    modelCurrentLabel: "Aktuelles Modell",
    modelFollowSession: "Sitzungsmodell",
    modelAvailableListHeader: "Verf\xFCgbare Modelle (/lingual model <id> ausf\xFChren):",
    modelAutoFollowDesc: "auto (Folgt automatisch dem aktiven Sitzungsmodell)",
    modelSelectHint: "Geben Sie /lingual model <id> oder auto ein.",
    langUsageHint: "Verwendung: /lang <zh|tw|ja|ko|en|es|fr|de|ru> [target] (z.B. /lang ja oder /lang zh ja)",
    langList: [
      "\u2022 zh (Chinesisch \u2794 Englisch)",
      "\u2022 tw (Traditionelles Chinesisch \u2794 Englisch)",
      "\u2022 ja (Japanisch \u2794 Englisch)",
      "\u2022 ko (Koreanisch \u2794 Englisch)",
      "\u2022 en (Englisch \u2794 Japanisch)",
      "\u2022 es (Spanisch \u2794 Englisch)",
      "\u2022 fr (Franz\xF6sisch \u2794 Englisch)",
      "\u2022 de (Deutsch \u2794 Englisch)",
      "\u2022 ru (Russisch \u2794 Englisch)"
    ],
    // Dynamische Slot-Architektur (Deutsch)
    slotsHeader: "Dynamische Slot-Architektur",
    slotsActiveTag: "aktiv",
    slotsNone: "Keine Slots konfiguriert",
    slotsStatusEnabled: "aktiviert",
    slotsStatusDisabled: "deaktiviert",
    slotsWithNuance: " +Nuance",
    slotsNlTitle: "\u{1F4AC} Anpassung in nat\xFCrlicher Sprache (fragen Sie Ihren Agenten direkt):",
    slotsNlExamples: [
      '\u2022 "Passen Sie die Begleitung an: nur Tweet und tiefe Einsicht, kein Originaltext"',
      '\u2022 "Stellen Sie auf reine einzeilige \xDCbersetzung um"',
      '\u2022 "Slots auf Standard zur\xFCcksetzen"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Schnelle CLI-Befehle:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Originaltextzeile ausblenden",
      "\u2022 /slots compact2        - Minimaler Doppel-Slot",
      "\u2022 /slots reset           - Auf Standard zur\xFCcksetzen",
      "\u2022 /slots toggle <id>     - Slot aktivieren/deaktivieren"
    ],
    slotsResetSuccess: "[{pair}] Slots auf Standard zur\xFCckgesetzt",
    slotsRemovedSuccess: '[{pair}] Slot [{id}] ("{label}") entfernt',
    slotsRemovedSourceNote: " (Originaltextzeile wird nicht mehr angezeigt)",
    slotsToggled: "[{pair}] Slot [{id}] ist jetzt: {status}",
    slotsAdded: '[{pair}] Slot [{id}] "{label}" hinzugef\xFCgt/aktualisiert',
    slotsNotFound: "[{pair}] Slot [{id}] nicht gefunden. F\xFChren Sie /slots aus",
    slotsUsageAdd: "Verwendung: /slots add <id> <Label> [Anweisung...]",
    slotsUsageRm: "Verwendung: /slots rm <Slot-ID>",
    slotsUsageToggle: "Verwendung: /slots toggle <Slot-ID>",
    slotsUnknown: '[{pair}] Unbekannter Befehl oder Preset "{cmd}". /slots f\xFCr Hilfe eingeben',
    spokenLabel: "Gesprochen",
    writtenLabel: "Schriftlich"
  },
  ko: {
    slot1Label: "\uAD6C\uC5B4\uCCB4",
    slot2Label: "\uBB38\uC5B4\uCCB4",
    vocabLabel: "\uD575\uC2EC\uD45C\uD604",
    sourceLabel: "\uC6D0\uBB38",
    hudTitle: "ko \u21C4 en",
    statusOriginal: "ko \u21C4 en",
    statusEnglish: "ko \u21C4 en",
    statusOff: "ko \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[ko \u21C4 en] [\uC6D0\uBB38 \uBAA8\uB4DC] \uD65C\uC131\uD654: \uC6D0\uBB38\uC774 \uADF8\uB300\uB85C \uC804\uB2EC\uB429\uB2C8\uB2E4",
    notifyEnglish: "[ko \u21C4 en] [\uC601\uC5B4 \uBAA8\uB4DC] \uD65C\uC131\uD654: \uAE30\uC220 \uC601\uC5B4\uB85C \uC790\uB3D9 \uBCC0\uD658\uB418\uC5B4 \uC804\uB2EC\uB429\uB2C8\uB2E4",
    notifyOff: "[ko \u21C4 en] \uB3D9\uBC18 \uBAA8\uB4DC \uAEBC\uC9D0",
    notifyPaging: "[ko \u21C4 en] \uC7A5\uBB38 \uBD84\uD560\uB428. Alt+. \uB610\uB294 Alt+, \uD0A4\uB85C \uD0D0\uC0C9",
    notifyNoHistory: "[ko \u21C4 en] \uC774\uC804 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    notifyHistoryRestored: "[ko \u21C4 en] \uC774\uC804 \uCE74\uB4DC\uAC00 \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    notifyAgentHelp: '\u{1F4A1} lingual-tuner \uAE30\uB2A5 \uB0B4\uC7A5: \uC5D0\uC774\uC804\uD2B8\uC5D0\uAC8C "\uC6D0\uBB38 \uC5C6\uC774 \uD575\uC2EC \uC694\uC57D\uB9CC \uD45C\uC2DC\uD574\uC918"\uB77C\uACE0 \uC694\uCCAD\uD558\uBA74 \uC790\uB3D9 \uC124\uC815\uB429\uB2C8\uB2E4.',
    notifyModelSwitched: "\uB3D9\uBC18 \uBAA8\uB378 \uBCC0\uACBD\uB428: {model}",
    notifyLangSwitched: "\uBAA8\uAD6D\uC5B4 \uBCC0\uACBD\uB428: {lang}",
    notifyLangInvalid: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC5B8\uC5B4 \uCF54\uB4DC\uC785\uB2C8\uB2E4. \uC9C0\uC6D0: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ko \u21C4 en] \uB2E8\uC77C \uD589 \uCEA1\uC290 \uBAA8\uB4DC \uCF1C\uC9D0",
    notifyCompactOff: "[ko \u21C4 en] \uD2B8\uB9AC \uB808\uC774\uC544\uC6C3 \uBCF5\uC6D0\uB428",
    notifyTimeout: "[ko \u21C4 en] \uBC88\uC5ED \uC2DC\uAC04 \uCD08\uACFC; \uC6D0\uBB38\uC774 \uADF8\uB300\uB85C \uC804\uB2EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    notifyError: "[ko \u21C4 en] \uBC88\uC5ED \uC624\uB958; \uC6D0\uBB38\uC774 \uADF8\uB300\uB85C \uC804\uB2EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    notifyModeNotFound: "[{pair}] \uBAA8\uB4DC [{mode}]\uAC00 \uD65C\uC131 \uB808\uC9C0\uC2A4\uD2B8\uB9AC\uC5D0 \uC5C6\uC2B5\uB2C8\uB2E4. /lingual mode list\uB85C \uD655\uC778\uD558\uC138\uC694.",
    notifyModeLockedCycleBlocked: "[{pair}] \uD604\uC7AC \uBAA8\uB4DC\uAC00 \u3010{mode}\u3011(\uC73C)\uB85C \uC7A0\uACA8 \uC788\uC2B5\uB2C8\uB2E4. \uC21C\uD658\uD558\uB824\uBA74 /lingual unlock \uC73C\uB85C \uD574\uC81C\uD558\uAC70\uB098 /lingual 1|2|3|0 \uC73C\uB85C \uC9C1\uC811 \uC9C0\uC815\uD558\uC138\uC694.",
    notifyModeLockedSuccess: "[{pair}] \uC138\uC158 \uBAA8\uB4DC\uAC00 \u3010{mode}\u3011(\uC73C)\uB85C \uACE0\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC678\uBD80 \uBCC0\uACBD \uBC0F \uC758\uB3C4\uCE58 \uC54A\uC740 \uC804\uD658\uC744 \uBC29\uC9C0\uD569\uB2C8\uB2E4. /lingual unlock \uC73C\uB85C \uD574\uC81C \uAC00\uB2A5.",
    notifyModeUnlockedSuccess: "[{pair}] \uBAA8\uB4DC \uC7A0\uAE08\uC774 \uD574\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC790\uC720 \uC804\uD658\uACFC \uC124\uC815 \uB3D9\uAE30\uD654\uAC00 \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
    notifyUnrecognizedSubcommand: '[{pair}] \uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD558\uC704 \uBA85\uB839: "{cmd}". \uD604\uC7AC \uBAA8\uB4DC\uAC00 \uC720\uC9C0\uB429\uB2C8\uB2E4. \uC0AC\uC6A9 \uAC00\uB2A5: /lingual [1|2|3|0|on|off|lang|last|lock|status] \uB610\uB294 /l',
    notifyClipboardCopied: "\uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (Agent \uBBF8\uC804\uC1A1). GitHub, PR \uB610\uB294 SNS\uC5D0 \uBD99\uC5EC\uB123\uAE30 \uAC00\uB2A5.",
    notifyTargetSwitched: "\uBAA9\uD45C \uC5B8\uC5B4\uAC00 {target}(\uC73C)\uB85C \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (\uBAA8\uAD6D\uC5B4 {source} \uC720\uC9C0)",
    langHelpText: "[\uD604\uC7AC \uB3D9\uBC18 \uC5B8\uC5B4: {flow}]\n\u2022 \uBE60\uB978 \uC804\uD658: /lang ja (\uC77C\uBCF8\uC5B4\uB85C) \xB7 /lang en (\uC601\uC5B4\uB85C)\n\u2022 \uC591\uBC29\uD5A5 \uC804\uD658: /lang ko en \xB7 /lang en ko \xB7 /lang ko ja\n\u2022 \uC9C0\uC6D0 \uCF54\uB4DC: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] \u3010{num}. {name} ({id})\u3011(\uC73C)\uB85C \uC804\uD658\uB418\uC5C8\uC2B5\uB2C8\uB2E4 ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] \uD504\uB86C\uD504\uD2B8 \uCD5C\uC801\uD654 \uC911...",
    loadingFixSyntax: "  \u22EF [lingual] \uBB38\uBC95 \uBC0F \uC624\uD0C0 \uC218\uC815 \uC911...",
    loadingCandidates: "  \u22EF [lingual] \uD6C4\uBCF4 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \uC911...",
    statusLoadingOptimize: "[lingual] \uCD5C\uC801\uD654 \uC911...",
    statusLoadingFix: "[lingual] \uC218\uC815 \uC911...",
    statusLoadingCandidates: "[lingual] \uC0DD\uC131 \uC911...",
    cmdDescMode: "\uB300\uD654\uD615 \uBAA8\uB4DC \uC804\uD658 \uBC0F \uAD00\uB9AC: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "\uC0C1\uD0DC \uBCF4\uACE0\uC11C \uBC0F \uC9C4\uB2E8 \uD655\uC778: /lingual status",
    cmdDescModel: "\uBAA8\uB378 \uD655\uC778 \uBC0F \uBCC0\uACBD: /lingual model [model-id|auto]",
    cmdDescLang: "\uBAA8\uAD6D\uC5B4 \uD655\uC778 \uBC0F \uBCC0\uACBD: /lingual lang [\uCF54\uB4DC] \uB610\uB294 /lang [\uC5B8\uC5B4\uC30D]",
    cmdDescSlots: "\uC2AC\uB86F \uAD6C\uC131 \uBCC0\uACBD: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "\uB2E8\uC77C \uD589 \uCEA1\uC290 \uBAA8\uB4DC \uD1A0\uAE00: /lingual compact",
    cmdDescLast: "\uC774\uC804 \uCE74\uB4DC \uB2E4\uC2DC \uBCF4\uAE30: /lingual last (\uB610\uB294 /last)",
    cmdDescAgent: "\uC0AC\uC6A9\uC790 \uC124\uC815 \uAC00\uC774\uB4DC: /lingual tuner",
    shortcutNextPage: "\uB2E4\uC74C \uC138\uADF8\uBA3C\uD2B8\uB85C \uC774\uB3D9",
    shortcutPrevPage: "\uC774\uC804 \uC138\uADF8\uBA3C\uD2B8\uB85C \uC774\uB3D9",
    modePickerTitle: "\uB3D9\uD589\uD559\uC2B5 \uBAA8\uB4DC \uC804\uD658",
    modePickerHint: "\uC22B\uC790 \uD0A4 1/2/3/0 \uC989\uC2DC \uC801\uC6A9, Esc \uCDE8\uC18C",
    capsuleSlot1Prefix: "\uAD6C",
    capsuleSlot2Prefix: "\uBB38",
    layoutCapsule: "\uB2E8\uC77C \uD589 \uCEA1\uC290 (1-Line Capsule)",
    layoutTree: "Trifecta \uC88C\uCE21 \uB808\uC77C \uD2B8\uB9AC (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\uC0C1\uD0DC \uBCF4\uACE0\uC11C",
    statusReportMode: "\uD604\uC7AC \uBAA8\uB4DC",
    statusReportFlow: "\uC5B8\uC5B4 \uD750\uB984",
    statusReportModel: "\uB3D9\uBC18 \uBAA8\uB378",
    statusReportCache: "\uC138\uC158 \uCE90\uC2DC",
    statusReportLayout: "HUD \uB808\uC774\uC544\uC6C3: Trifecta \uC88C\uCE21 \uB808\uC77C \uD2B8\uB9AC (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\uC778\uC99D \uBAA8\uB4DC: Pi \uD504\uB85C\uC138\uC2A4 \uB0B4 \uC9C1\uC811 \uC778\uC99D (Zero Config)",
    statusReportShortcuts: "\uBA85\uB839\uC5B4: /lingual (\uB610\uB294 /l) \xB7 /lingual lang (\uB610\uB294 /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "\uC2AC\uB86F \uD29C\uB108: lingual-tuner \uB0B4\uC7A5",
    modeDescOriginal: "\uC6D0\uBB38 \uC9C1\uD1B5 \xB7 0ms \uBE44\uCC28\uB2E8",
    modeDescEnglish: "\uC601\uC5B4 \uBAA8\uB4DC \xB7 \uC2EC\uCE35 \uCF54\uB4DC \uCD94\uB860",
    modeDescOff: "\uAEBC\uC9D0",
    modelCurrentLabel: "\uD604\uC7AC \uBAA8\uB378",
    modelFollowSession: "\uC138\uC158 \uB530\uB984",
    modelAvailableListHeader: "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBAA8\uB378 (/lingual model <id>):",
    modelAutoFollowDesc: "auto (\uD604\uC7AC \uC138\uC158 \uC8FC \uBAA8\uB378 \uC790\uB3D9 \uCD94\uC885)",
    modelSelectHint: "/lingual model <id> \uB610\uB294 auto \uC9C0\uC815.",
    langUsageHint: "\uC0AC\uC6A9\uBC95: /lang <\uCF54\uB4DC> [\uBAA9\uD45C\uC5B8\uC5B4]",
    langList: [
      "\u2022 zh (\uC911\uAD6D\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 ja (\uC77C\uBCF8\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 en (\uC601\uC5B4 \u2794 \uC77C\uBCF8\uC5B4/\uD55C\uAD6D\uC5B4)",
      "\u2022 ko (\uD55C\uAD6D\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 es (\uC2A4\uD398\uC778\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 fr (\uD504\uB791\uC2A4\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 de (\uB3C5\uC77C\uC5B4 \u2794 \uC601\uC5B4)",
      "\u2022 ru (\uB7EC\uC2DC\uC544\uC5B4 \u2794 \uC601\uC5B4)"
    ],
    slotsHeader: "\uB3D9\uC801 \uC2AC\uB86F \uC544\uD0A4\uD14D\uCC98",
    slotsActiveTag: "\uD65C\uC131",
    slotsNone: "\uAD6C\uC131\uB41C \uC2AC\uB86F \uC5C6\uC74C",
    slotsStatusEnabled: "\uD65C\uC131\uD654\uB428",
    slotsStatusDisabled: "\uBE44\uD65C\uC131\uD654\uB428",
    slotsWithNuance: " +\uB258\uC559\uC2A4",
    slotsNlTitle: "\u{1F4AC} \uC790\uC5F0\uC5B4 \uC124\uC815:",
    slotsNlExamples: [
      '\u2022 "\uC6D0\uBB38 \uC5C6\uC774 \uCE90\uC8FC\uC5BC\uACFC \uACA9\uC2DD\uCCB4\uB9CC \uBCF4\uC5EC\uC918"',
      '\u2022 "\uB2E8\uC77C \uD589 \uC21C\uC218 \uBC88\uC5ED\uC73C\uB85C \uBCC0\uACBD\uD574\uC918"',
      '\u2022 "\uAE30\uBCF8 \uC2AC\uB86F\uC73C\uB85C \uBCF5\uC6D0\uD574\uC918"'
    ],
    slotsCliTitle: "\u26A1\uFE0F \uBE60\uB978 CLI \uBA85\uB839\uC5B4:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \uC6D0\uBB38 \uD589 \uC228\uAE30\uAE30",
      "\u2022 /slots compact2        - \uCD5C\uC18C \uB4C0\uC5BC \uC2AC\uB86F",
      "\u2022 /slots reset           - \uAE30\uBCF8\uAC12\uC73C\uB85C \uBCF5\uC6D0",
      "\u2022 /slots toggle <id>     - \uC2AC\uB86F \uCF1C\uAE30/\uB044\uAE30"
    ],
    slotsResetSuccess: "[{pair}] \uC2AC\uB86F\uC774 \uAE30\uBCF8\uAC12\uC73C\uB85C \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    slotsRemovedSuccess: '[{pair}] \uC2AC\uB86F [{id}] ("{label}") \uC81C\uAC70\uB428',
    slotsRemovedSourceNote: " (\uC6D0\uBB38 \uD589\uC774 \uB354 \uC774\uC0C1 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4)",
    slotsToggled: "[{pair}] \uC2AC\uB86F [{id}] \uC0C1\uD0DC: {status}",
    slotsAdded: '[{pair}] \uC2AC\uB86F [{id}] "{label}" \uCD94\uAC00/\uC5C5\uB370\uC774\uD2B8\uB428',
    slotsNotFound: "[{pair}] \uC2AC\uB86F [{id}]\uC744(\uB97C) \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    slotsUsageAdd: "\uC0AC\uC6A9\uBC95: /slots add <id> <\uB77C\uBCA8> [\uD504\uB86C\uD504\uD2B8...]",
    slotsUsageRm: "\uC0AC\uC6A9\uBC95: /slots rm <\uC2AC\uB86F_id>",
    slotsUsageToggle: "\uC0AC\uC6A9\uBC95: /slots toggle <\uC2AC\uB86F_id>",
    slotsUnknown: '[{pair}] \uC54C \uC218 \uC5C6\uB294 \uBA85\uB839\uC5B4 "{cmd}". /slots \uB3C4\uC6C0\uB9D0 \uCC38\uC870',
    spokenLabel: "\uAD6C\uC5B4",
    writtenLabel: "\uBB38\uC5B4"
  },
  ru: {
    slot1Label: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439",
    slot2Label: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439",
    vocabLabel: "\u041B\u0435\u043A\u0441\u0438\u043A\u0430",
    sourceLabel: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    hudTitle: "ru \u21C4 en",
    statusOriginal: "ru \u21C4 en",
    statusEnglish: "ru \u21C4 en",
    statusOff: "ru \u21C4 en: off",
    subNuanceLabel: "\u21B3",
    notifyOriginal: "[ru \u21C4 en] \u0420\u0435\u0436\u0438\u043C [\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B]: \u0432\u0430\u0448 \u0442\u0435\u043A\u0441\u0442 \u043F\u0435\u0440\u0435\u0434\u0430\u0435\u0442\u0441\u044F \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439",
    notifyEnglish: "[ru \u21C4 en] \u0420\u0435\u0436\u0438\u043C [\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439]: \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0438\u0442\u0441\u044F \u043D\u0430 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
    notifyOff: "[ru \u21C4 en] \u041F\u043E\u043C\u043E\u0449\u043D\u0438\u043A \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D",
    notifyPaging: "[ru \u21C4 en] \u0414\u043B\u0438\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0440\u0430\u0437\u0431\u0438\u0442 \u043D\u0430 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u044B. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 Alt+. \u0438\u043B\u0438 Alt+,",
    notifyNoHistory: "[ru \u21C4 en] \u041D\u0435\u0442 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0439 \u0437\u0430\u043F\u0438\u0441\u0438",
    notifyHistoryRestored: "[ru \u21C4 en] \u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430",
    notifyAgentHelp: "\u{1F4A1} \u041D\u0430\u0432\u044B\u043A lingual-tuner: \u043F\u0440\u043E\u0441\u0442\u043E \u0441\u043A\u0430\u0436\u0438\u0442\u0435 \u0410\u0433\u0435\u043D\u0442\u0443 \u043D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0441\u043B\u043E\u0442\u044B \u0431\u0435\u0437 \u0440\u0443\u0447\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434.",
    notifyModelSwitched: "\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u043D\u0430: {model}",
    notifyLangSwitched: "\u042F\u0437\u044B\u043A \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D \u043D\u0430: {lang}",
    notifyLangInvalid: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434 \u044F\u0437\u044B\u043A\u0430. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: zh, ja, en, ko, es, fr, de, ru",
    notifyCompactOn: "[ru \u21C4 en] \u041E\u0434\u043D\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u043A\u0430\u043F\u0441\u0443\u043B\u044B \u0432\u043A\u043B\u044E\u0447\u0435\u043D",
    notifyCompactOff: "[ru \u21C4 en] \u041F\u043E\u043B\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    notifyTimeout: "[ru \u21C4 en] \u0412\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u043E; \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    notifyError: "[ru \u21C4 en] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430; \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B",
    notifyModeNotFound: "[{pair}] \u0420\u0435\u0436\u0438\u043C [{mode}] \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u043C \u0440\u0435\u0435\u0441\u0442\u0440\u0435. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 /lingual mode list \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0430.",
    notifyModeLockedCycleBlocked: "[{pair}] \u0420\u0435\u0436\u0438\u043C \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D \u043D\u0430 [{mode}]. \u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 /lingual unlock \u0434\u043B\u044F \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u0438\u043B\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0435\u0436\u0438\u043C \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E.",
    notifyModeLockedSuccess: "[{pair}] \u0420\u0435\u0436\u0438\u043C \u0441\u0435\u0441\u0441\u0438\u0438 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D \u043D\u0430 [{mode}]. \u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 /lingual unlock \u0434\u043B\u044F \u0441\u0431\u0440\u043E\u0441\u0430.",
    notifyModeUnlockedSuccess: "[{pair}] \u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 \u0440\u0435\u0436\u0438\u043C\u0430 \u0441\u043D\u044F\u0442\u0430. \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F.",
    notifyUnrecognizedSubcommand: '[{pair}] \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043F\u043E\u0434\u043A\u043E\u043C\u0430\u043D\u0434\u0430: "{cmd}". \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: /lingual [1|2|3|0|on|off|lang|last|lock|status] \u0438\u043B\u0438 /l',
    notifyClipboardCopied: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430 (\u043F\u0440\u043E\u043C\u043F\u0442 \u043F\u0435\u0440\u0435\u0445\u0432\u0430\u0447\u0435\u043D, \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u0430\u0433\u0435\u043D\u0442\u0443). \u0413\u043E\u0442\u043E\u0432\u043E \u043A \u0432\u0441\u0442\u0430\u0432\u043A\u0435.",
    notifyTargetSwitched: "\u0426\u0435\u043B\u0435\u0432\u043E\u0439 \u044F\u0437\u044B\u043A \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D \u043D\u0430: {target} (\u0440\u043E\u0434\u043D\u043E\u0439 {source} \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439)",
    langHelpText: "[\u042F\u0437\u044B\u043A\u043E\u0432\u0430\u044F \u043F\u0430\u0440\u0430: {flow}]\n\u2022 \u0411\u044B\u0441\u0442\u0440\u043E\u0435 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435: /lang ja (\u044F\u043F\u043E\u043D\u0441\u043A\u0438\u0439) \xB7 /lang en (\u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)\n\u2022 \u0421\u043C\u0435\u043D\u0430 \u043F\u0430\u0440\u044B: /lang ru en \xB7 /lang en ru\n\u2022 \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u043A\u043E\u0434\u044B: zh, tw, ja, ko, en, es, fr, de, ru",
    modeSwitchedTemplate: "[{pair}] \u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043D\u0430 [{num}. {name} ({id})] ({slot})",
    loadingOptimizePrompt: "  \u22EF [lingual] \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430...",
    loadingFixSyntax: "  \u22EF [lingual] \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0441\u0430 \u0438 \u043E\u043F\u0435\u0447\u0430\u0442\u043E\u043A...",
    loadingCandidates: "  \u22EF [lingual] \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u043F\u0440\u043E\u043C\u043F\u0442\u0430...",
    statusLoadingOptimize: "[lingual] \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044F...",
    statusLoadingFix: "[lingual] \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435...",
    statusLoadingCandidates: "[lingual] \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F...",
    cmdDescMode: "\u0418\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0432\u044B\u0431\u043E\u0440 \u0440\u0435\u0436\u0438\u043C\u0430 \u0438\u043B\u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    cmdDescStatus: "\u041E\u0442\u0447\u0435\u0442 \u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438 \u0438 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430: /lingual status",
    cmdDescModel: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C: /lingual model [model-id|auto]",
    cmdDescLang: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u044F\u0437\u044B\u043A: /lingual lang [\u043A\u043E\u0434] \u0438\u043B\u0438 /lang [\u043F\u0430\u0440\u0430]",
    cmdDescSlots: "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0441\u043B\u043E\u0442\u044B: /lingual slots [add|rm|toggle|reset]",
    cmdDescCompact: "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C \u043A\u0430\u043F\u0441\u0443\u043B\u044B: /lingual compact",
    cmdDescLast: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0443\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443: /lingual last (\u0438\u043B\u0438 /last)",
    cmdDescAgent: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043C\u0430\u0441\u0442\u0435\u0440 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438: /lingual tuner",
    shortcutNextPage: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0443",
    shortcutPrevPage: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u043C\u0443 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0443",
    modePickerTitle: "\u0412\u044B\u0431\u043E\u0440 \u0440\u0435\u0436\u0438\u043C\u0430",
    modePickerHint: "1/2/3/0 \u0434\u043B\u044F \u0441\u043C\u0435\u043D\u044B, Esc \u043E\u0442\u043C\u0435\u043D\u0430",
    capsuleSlot1Prefix: "\u0420\u0430\u0437\u0433",
    capsuleSlot2Prefix: "\u0414\u0435\u043B",
    layoutCapsule: "\u041E\u0434\u043D\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u0430\u044F \u043A\u0430\u043F\u0441\u0443\u043B\u0430 (1-Line Capsule)",
    layoutTree: "Trifecta \u043B\u0435\u0432\u043E\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u041E\u0442\u0447\u0435\u0442 \u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438",
    statusReportMode: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043C",
    statusReportFlow: "\u041F\u043E\u0442\u043E\u043A \u044F\u0437\u044B\u043A\u043E\u0432",
    statusReportModel: "\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A\u0430",
    statusReportCache: "\u041A\u044D\u0448 \u0441\u0435\u0441\u0441\u0438\u0438",
    statusReportLayout: "HUD: Trifecta \u043B\u0435\u0432\u043E\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\u0410\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F: \u0412\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0446\u0435\u0441\u0441 Pi (Zero Config)",
    statusReportShortcuts: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B: /lingual (\u0438\u043B\u0438 /l) \xB7 /lingual lang (\u0438\u043B\u0438 /lang) \xB7 /lingual last \xB7 /lingual compact",
    statusReportTuner: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0441\u043B\u043E\u0442\u043E\u0432: \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043D\u0430\u0432\u044B\u043A lingual-tuner",
    modeDescOriginal: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B \xB7 0\u043C\u0441 \u0431\u0435\u0437 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438",
    modeDescEnglish: "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \xB7 \u0433\u043B\u0443\u0431\u043E\u043A\u043E\u0435 \u0440\u0430\u0441\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u0435",
    modeDescOff: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    modelCurrentLabel: "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C",
    modelFollowSession: "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u0441\u0435\u0441\u0441\u0438\u0435\u0439",
    modelAvailableListHeader: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 (/lingual model <id>):",
    modelAutoFollowDesc: "auto (\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u043C\u043E\u0434\u0435\u043B\u044C\u044E \u0441\u0435\u0441\u0441\u0438\u0438)",
    modelSelectHint: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /lingual model <id> \u0438\u043B\u0438 auto.",
    langUsageHint: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /lang <\u043A\u043E\u0434> [\u0446\u0435\u043B\u0435\u0432\u043E\u0439_\u044F\u0437\u044B\u043A]",
    langList: [
      "\u2022 zh (\u041A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 ja (\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 en (\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u2794 \u0420\u0443\u0441\u0441\u043A\u0438\u0439/\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439)",
      "\u2022 ko (\u041A\u043E\u0440\u0435\u0439\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 es (\u0418\u0441\u043F\u0430\u043D\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 fr (\u0424\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 de (\u041D\u0435\u043C\u0435\u0446\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)",
      "\u2022 ru (\u0420\u0443\u0441\u0441\u043A\u0438\u0439 \u2794 \u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439)"
    ],
    slotsHeader: "\u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0430 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0441\u043B\u043E\u0442\u043E\u0432",
    slotsActiveTag: "\u0430\u043A\u0442\u0438\u0432\u043D\u044B",
    slotsNone: "\u0421\u043B\u043E\u0442\u044B \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B",
    slotsStatusEnabled: "\u0432\u043A\u043B\u044E\u0447\u0435\u043D",
    slotsStatusDisabled: "\u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D",
    slotsWithNuance: " +\u043D\u044E\u0430\u043D\u0441",
    slotsNlTitle: "\u{1F4AC} \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u043C \u044F\u0437\u044B\u043A\u043E\u043C:",
    slotsNlExamples: [
      '\u2022 "\u0421\u0434\u0435\u043B\u0430\u0439 \u0442\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439 \u0438 \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u0441\u0442\u0438\u043B\u044C, \u0431\u0435\u0437 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430"',
      '\u2022 "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438 \u043D\u0430 \u0447\u0438\u0441\u0442\u044B\u0439 \u043E\u0434\u043D\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u0432\u043E\u0434"',
      '\u2022 "\u0421\u0431\u0440\u043E\u0441\u044C \u0441\u043B\u043E\u0442\u044B \u043D\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E"'
    ],
    slotsCliTitle: "\u26A1\uFE0F \u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B CLI:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \u0421\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0443 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430",
      "\u2022 /slots compact2        - \u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u043E\u0439\u043D\u043E\u0439 \u0441\u043B\u043E\u0442",
      "\u2022 /slots reset           - \u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043D\u0430 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435",
      "\u2022 /slots toggle <id>     - \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C/\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u043B\u043E\u0442"
    ],
    slotsResetSuccess: "[{pair}] \u0421\u043B\u043E\u0442\u044B \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u044B \u043D\u0430 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435",
    slotsRemovedSuccess: '[{pair}] \u0421\u043B\u043E\u0442 [{id}] ("{label}") \u0443\u0434\u0430\u043B\u0435\u043D',
    slotsRemovedSourceNote: " (\u0421\u0442\u0440\u043E\u043A\u0430 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F)",
    slotsToggled: "[{pair}] \u0421\u043B\u043E\u0442 [{id}] \u0442\u0435\u043F\u0435\u0440\u044C: {status}",
    slotsAdded: '[{pair}] \u0421\u043B\u043E\u0442 [{id}] "{label}" \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D/\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D',
    slotsNotFound: "[{pair}] \u0421\u043B\u043E\u0442 [{id}] \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
    slotsUsageAdd: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /slots add <id> <\u043C\u0435\u0442\u043A\u0430> [\u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F...]",
    slotsUsageRm: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /slots rm <id_\u0441\u043B\u043E\u0442\u0430>",
    slotsUsageToggle: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /slots toggle <id_\u0441\u043B\u043E\u0442\u0430>",
    slotsUnknown: '[{pair}] \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430 "{cmd}". \u0412\u0432\u0435\u0434\u0438\u0442\u0435 /slots \u0434\u043B\u044F \u0441\u043F\u0440\u0430\u0432\u043A\u0438',
    spokenLabel: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439",
    writtenLabel: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439"
  }
};
var SUPPORTED_LANG_CODES = ["zh", "tw", "ja", "ko", "en", "es", "fr", "de", "ru"];
function isSupportedLangCode(code) {
  return SUPPORTED_LANG_CODES.includes((code || "").toLowerCase().split(/[-_]/)[0]);
}
function normalizeLangCode(input) {
  const s = (input || "").trim().toLowerCase().replace(/[-_].*$/, "");
  if (s === "zh" || s === "cn" || s === "chinese" || s === "\u4E2D\u6587") return "zh";
  if (s === "tw" || s === "zh-tw" || s === "traditional" || s === "\u7E41\u4E2D" || s === "\u7E41\u9AD4\u4E2D\u6587") return "tw";
  if (s === "ja" || s === "jp" || s === "japanese" || s === "\u65E5\u672C\u8A9E" || s === "\u65E5\u6587" || s === "\u65E5\u8BED") return "ja";
  if (s === "ko" || s === "kr" || s === "korean" || s === "\uD55C\uAD6D\uC5B4" || s === "\u97E9\u8BED" || s === "\u97E9\u6587" || s === "\u97D3\u8A9E" || s === "\u97D3\u6587") return "ko";
  if (s === "en" || s === "eng" || s === "english" || s === "\u82F1\u8BED" || s === "\u82F1\u6587") return "en";
  if (s === "es" || s === "spanish" || s === "espa\xF1ol" || s === "\u897F\u8BED" || s === "\u897F\u73ED\u7259\u8BED") return "es";
  if (s === "fr" || s === "french" || s === "fran\xE7ais" || s === "\u6CD5\u8BED" || s === "\u6CD5\u6587") return "fr";
  if (s === "de" || s === "german" || s === "deutsch" || s === "\u5FB7\u8BED" || s === "\u5FB7\u6587") return "de";
  if (s === "ru" || s === "russian" || s === "\u0440\u0443\u0441\u0441\u043A\u0438\u0439" || s === "\u4FC4\u8BED" || s === "\u4FC4\u6587") return "ru";
  return s;
}
function resolveLabelsForLang(lang = "en", overrides, targetLang) {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.en;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} \u21C4 ${actualTarget}`;
  const merged = {
    ...LANGUAGE_PRESETS.en,
    // 1. Universal English baseline
    ...target,
    // 2. Localized native language preset
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...overrides || {}
    // 3. User explicit overrides
  };
  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === "string") {
      merged[key] = val.replace(/\[[a-z]{2}\s*⇄\s*[a-z]{2}\]/gi, `[${pairTitle}]`);
    }
  }
  return merged;
}
function formatStatusReport(labels, info) {
  const modeDesc = info.mode === "original" ? labels.modeDescOriginal || "Original pass-through" : info.mode === "english" ? labels.modeDescEnglish || "English deep reasoning" : labels.modeDescOff || "Off";
  const layoutDesc = info.layout === "capsule" ? labels.layoutCapsule || "Single-Line Capsule (1-Line)" : labels.layoutTree || "Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)";
  const lines = [
    `\u21C4 [${labels.hudTitle}] ${labels.statusReportTitle || "Status Report"}`,
    `\u2022 ${labels.statusReportMode || "Mode"}: [${info.mode}] (${modeDesc})`,
    `\u2022 ${labels.statusReportFlow || "Flow"}: [${info.sourceLang} \u2794 ${info.targetLang || "en"}]`,
    `\u2022 ${labels.statusReportModel || "Model"}: ${info.activeModel}`
  ];
  if (info.cacheStats) {
    const total = info.cacheStats.hits + info.cacheStats.misses;
    const rate = total > 0 ? Math.round(info.cacheStats.hits / total * 100) : 0;
    lines.push(
      `\u2022 ${labels.statusReportCache || "Cache"}: ${info.cacheStats.hits} hits / ${total} total (${rate}% hit rate) \xB7 ${info.cacheStats.size}/${info.cacheStats.capacity} items`
    );
  }
  lines.push(
    `\u2022 ${labels.statusReportLayout || "Layout"}: ${layoutDesc}`,
    `\u2022 ${labels.statusReportAuth || "Auth: Pi Native In-Process Auth"}`,
    `\u2022 ${labels.statusReportTuner || "Slot Tuner: Built-in lingual-tuner skill (Just describe preferences to Agent)"}`,
    `\u2022 ${labels.statusReportShortcuts || "Shortcuts: /lingual (or /l) \xB7 /lingual lang (or /lang) \xB7 /lingual last \xB7 /lingual compact"}`
  );
  return lines.join("\n");
}
function formatModelSelectionMessage(labels, currentActive, availableList) {
  let msg = `[${labels.hudTitle}] ${labels.modelCurrentLabel || "Current model"}: ${currentActive}
`;
  if (availableList) {
    msg += `${labels.modelAvailableListHeader || "Available models:"}
${availableList}
\u2022 ${labels.modelAutoFollowDesc || "auto"}
`;
  }
  msg += labels.modelSelectHint || "Specify model with /lingual model <model-id> or auto.";
  return msg;
}

// src/shield.ts
var SHELL_COMMAND_PREFIXES = [
  "git ",
  "npm ",
  "pnpm ",
  "yarn ",
  "bun ",
  "cargo ",
  "rustc ",
  "go ",
  "python ",
  "python3 ",
  "pip ",
  "node ",
  "deno ",
  "docker ",
  "podman ",
  "kubectl ",
  "helm ",
  "make ",
  "cmake ",
  "ninja ",
  "gcc ",
  "g++ ",
  "clang ",
  "cd ",
  "ls ",
  "dir ",
  "cat ",
  "type ",
  "rm ",
  "cp ",
  "mv ",
  "mkdir ",
  "chmod ",
  "chown ",
  "curl ",
  "wget ",
  "ssh ",
  "scp ",
  "grep ",
  "find ",
  "ps ",
  "kill ",
  "echo ",
  "export ",
  "set ",
  "typst ",
  "ffmpeg ",
  "yt-dlp ",
  "npx ",
  "tar ",
  "zip ",
  "unzip ",
  "diff "
];
var CODE_STATEMENT_REGEX = /^(?:const|let|var|function|def|class|import|export|package|namespace|using|public|private|protected|fn|pub fn|impl|struct|enum|interface|type)\s+/;
var SQL_STATEMENT_REGEX = /^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+/i;
function isNonEnglish(text) {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}
function shouldShieldBypass(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("```")) {
    const withoutCodeFence = trimmed.replace(/```[\s\S]*?```/g, "").trim();
    if (withoutCodeFence && (/[?？]/.test(withoutCodeFence) || /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix)/i.test(withoutCodeFence))) {
      return false;
    }
    return true;
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
    if (trimmed.includes(":") || trimmed.includes(",")) {
      return true;
    }
  }
  const lower = trimmed.toLowerCase();
  for (const prefix of SHELL_COMMAND_PREFIXES) {
    if (lower.startsWith(prefix)) {
      if (/[?？]/.test(trimmed) || /(?:为什么|怎么|如何|报错|为何|explain|why|how)/i.test(trimmed)) {
        return false;
      }
      if (!/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(trimmed)) {
        return true;
      }
      if (/^git\s+(?:commit|tag)\s+.*-m\s+["'].*["']/i.test(trimmed)) {
        return true;
      }
    }
  }
  if (CODE_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("\uFF1F") && !trimmed.includes("?")) {
    const hasConversationalIntent = /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix)/i.test(trimmed);
    if (!hasConversationalIntent) {
      return true;
    }
  }
  if (SQL_STATEMENT_REGEX.test(trimmed) && !trimmed.includes("\uFF1F") && !trimmed.includes("?")) {
    return true;
  }
  const SECRET_PATTERNS = [
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/i,
    /(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]{20}|AKIA[0-9A-Z]{16})/,
    /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/
  ];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  const isPurePathOrUrl = /^(?:[a-zA-Z]:[\\\/][^\s\r\n]+|\/(?:[a-zA-Z0-9_.-]+[\\\/])+[^\s\r\n]+|https?:\/\/[^\s\r\n]+)$/i.test(trimmed);
  const isPureUuidOrSession = /^(?:(?:session|id|uuid)[\s:=]*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.jsonl)?$/i.test(trimmed);
  if ((isPurePathOrUrl || isPureUuidOrSession) && !isNonEnglish(trimmed) && !/[?？]/.test(trimmed)) {
    return true;
  }
  return false;
}
function hasSourceScript(text, sourceLang) {
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
var IMPERATIVE_ENGINEERING_VERBS = /* @__PURE__ */ new Set([
  "fix",
  "add",
  "refactor",
  "update",
  "remove",
  "delete",
  "implement",
  "replace",
  "clean",
  "create",
  "optimize",
  "ensure",
  "extract",
  "handle",
  "support",
  "use",
  "simplify",
  "upgrade",
  "allow",
  "block",
  "prevent",
  "enable",
  "disable",
  "init",
  "setup",
  "test",
  "verify",
  "pass",
  "return",
  "build",
  "compile",
  "sync",
  "drop",
  "bump",
  "revert",
  "merge",
  "format",
  "render",
  "export",
  "import",
  "align",
  "isolate",
  "clamp",
  "clampvisual",
  "truncate",
  "resolve",
  "settle",
  "dispatch"
]);
function isTargetLanguageOnly(text, sourceLang, targetLang = "en") {
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  if (normTarget === "en") {
    const NON_LATIN_SOURCES = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
    if (!NON_LATIN_SOURCES.has(normSource)) {
      return false;
    }
    if (hasSourceScript(text, normSource)) {
      return false;
    }
    const words = text.trim().split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
    return words.length >= 2;
  }
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
function isImperativeEngineeringPrompt(text) {
  const trimmed = text.trim();
  const firstWordMatch = trimmed.match(/^[a-zA-Z]+/);
  if (!firstWordMatch) return false;
  const firstWord = firstWordMatch[0].toLowerCase();
  return IMPERATIVE_ENGINEERING_VERBS.has(firstWord);
}
function detectScriptLanguage(text) {
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

// src/cache.ts
var LingualLruCache = class {
  constructor(capacity = 50) {
    this.capacity = capacity;
  }
  capacity;
  cache = /* @__PURE__ */ new Map();
  hits = 0;
  misses = 0;
  /**
   * Generates a normalized cache key incorporating language pairs and slot signature.
   */
  static buildKey(text, sourceLang = "en", targetLang = "ja", slotSignature) {
    const sig = slotSignature ? `[${slotSignature}]` : "";
    return `${sourceLang}\u2794${targetLang}${sig}:${text.trim()}`;
  }
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return void 0;
    }
    this.hits++;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  set(key, val) {
    if (!key || key.length > 256) {
      return;
    }
    if (typeof val === "string" && val.length > 2048) {
      return;
    }
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== void 0) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, val);
  }
  has(key) {
    return this.cache.has(key);
  }
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  get size() {
    return this.cache.size;
  }
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      capacity: this.capacity
    };
  }
};
var globalLingualCache = new LingualLruCache(50);

// src/engine.ts
var cachedUserConfig = null;
var lastConfigCheckTime = 0;
var CONFIG_CACHE_TTL_MS = 2e3;
function invalidateUserConfigCache() {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}
function isTestEnvironment() {
  return process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT !== void 0 || process.execArgv.some((a) => a.startsWith("--test") || a === "--test") || process.argv.some((a) => a === "--test" || a.startsWith("--test=") || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(a)) || process.env.npm_lifecycle_event === "test";
}
function loadUserLingualConfig() {
  if (isTestEnvironment()) {
    return {};
  }
  const now = Date.now();
  if (cachedUserConfig && now - lastConfigCheckTime < CONFIG_CACHE_TTL_MS) {
    return cachedUserConfig;
  }
  const agentDir = import_node_path.default.join(import_node_os.default.homedir(), ".pi", "agent");
  const lingualFile = import_node_path.default.join(agentDir, "lingual.json");
  const settingsFile = import_node_path.default.join(agentDir, "settings.json");
  let target = null;
  if (import_node_fs.default.existsSync(lingualFile)) {
    try {
      const raw = import_node_fs.default.readFileSync(lingualFile, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const inner = parsed["pi-lingual"] || parsed;
        target = inner && typeof inner === "object" && !Array.isArray(inner) ? inner : null;
      }
    } catch {
      target = null;
    }
  }
  if (!target && import_node_fs.default.existsSync(settingsFile)) {
    try {
      const raw = import_node_fs.default.readFileSync(settingsFile, "utf8");
      const parsed = JSON.parse(raw);
      const legacyBlock = parsed["pi-lingual"];
      if (legacyBlock && typeof legacyBlock === "object") {
        target = legacyBlock;
        try {
          if (!import_node_fs.default.existsSync(agentDir)) {
            import_node_fs.default.mkdirSync(agentDir, { recursive: true });
          }
          import_node_fs.default.writeFileSync(lingualFile, JSON.stringify(target, null, 2), "utf8");
        } catch {
        }
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
    const filterSlots = (arr) => Array.isArray(arr) ? arr.filter((s) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string") : void 0;
    const filterModes = (arr) => Array.isArray(arr) ? arr.filter((m) => m && typeof m === "object" && typeof m.id === "string") : void 0;
    const modes = filterModes(target.modes);
    const activeModeId = typeof target.activeModeId === "string" ? target.activeModeId : void 0;
    const globalKillList = Array.isArray(target.globalKillList) ? target.globalKillList : void 0;
    const slots = filterSlots(target.slots);
    const directSlots = filterSlots(target.directSlots);
    const promptSlots = filterSlots(target.promptSlots);
    const modifySlots = filterSlots(target.modifySlots);
    const lastSeenVersion = typeof target.lastSeenVersion === "string" ? target.lastSeenVersion : void 0;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : void 0;
    const timeoutMs = typeof target.timeoutMs === "number" && Number.isFinite(target.timeoutMs) ? Math.min(6e4, Math.max(1e3, target.timeoutMs)) : void 0;
    const replyInSourceLang = target.replyInSourceLang !== void 0 ? Boolean(target.replyInSourceLang) : void 0;
    const modeLocked = target.modeLocked !== void 0 ? Boolean(target.modeLocked) : void 0;
    const labels = resolveLabelsForLang(sourceLang || "en", target.labels, targetLang || "ja");
    const normalizedMode = typeof target.mode === "string" ? normalizeLingualModeInput(target.mode) || target.mode : void 0;
    cachedUserConfig = {
      ...target,
      ...endpoint ? { endpoint } : {},
      ...apiKey ? { apiKey } : {},
      ...model ? { model } : {},
      ...selectedModel ? { selectedModel } : {},
      ...normalizedMode ? { mode: normalizedMode } : {},
      ...modeLocked !== void 0 ? { modeLocked } : {},
      ...compact !== void 0 ? { compact: Boolean(compact) } : {},
      ...slotPreset ? { slotPreset } : {},
      ...modes ? { modes } : {},
      ...activeModeId ? { activeModeId } : {},
      ...globalKillList ? { globalKillList } : {},
      ...slots ? { slots } : {},
      ...directSlots ? { directSlots } : {},
      ...promptSlots ? { promptSlots } : {},
      ...modifySlots ? { modifySlots } : {},
      ...lastSeenVersion ? { lastSeenVersion } : {},
      ...sourceLang ? { sourceLang } : {},
      ...targetLang ? { targetLang } : {},
      ...reasoning ? { reasoning } : {},
      ...timeoutMs ? { timeoutMs } : {},
      ...replyInSourceLang !== void 0 ? { replyInSourceLang } : {},
      labels
    };
    lastConfigCheckTime = now;
    return cachedUserConfig;
  }
  cachedUserConfig = {};
  lastConfigCheckTime = now;
  return {};
}
function saveUserLingualConfig(patch) {
  if (isTestEnvironment()) {
    return;
  }
  try {
    const agentDir = import_node_path.default.join(import_node_os.default.homedir(), ".pi", "agent");
    const configFile = import_node_path.default.join(agentDir, "lingual.json");
    if (!import_node_fs.default.existsSync(agentDir)) {
      import_node_fs.default.mkdirSync(agentDir, { recursive: true });
    }
    let existing = {};
    if (import_node_fs.default.existsSync(configFile)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const raw = import_node_fs.default.readFileSync(configFile, "utf8");
          if (raw && raw.trim()) {
            existing = JSON.parse(raw);
            break;
          }
        } catch {
          try {
            const start = Date.now();
            while (Date.now() - start < 15) {
            }
          } catch {
          }
        }
      }
    }
    for (const [k, v] of Object.entries(patch)) {
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (v === void 0 || v === "" || isEmptyArray || v === "auto" || k === "compact" && v === false || k === "modeLocked" && v === false) {
        delete existing[k];
      } else if (k === "mode") {
        const canonical = v === "english" ? "direct" : v === "select" ? "candidates" : v;
        existing.mode = canonical;
        if (!patch.activeModeId) {
          existing.activeModeId = canonical;
        }
      } else if (k === "activeModeId") {
        existing.activeModeId = v;
        if (!patch.mode) {
          existing.mode = v === "english" ? "direct" : v === "select" ? "candidates" : v;
        }
      } else {
        existing[k] = v;
      }
    }
    const content = JSON.stringify(existing, null, 2);
    const tmpFile = `${configFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    try {
      import_node_fs.default.writeFileSync(tmpFile, content, "utf8");
      try {
        import_node_fs.default.renameSync(tmpFile, configFile);
      } catch {
        try {
          import_node_fs.default.unlinkSync(configFile);
        } catch {
        }
        import_node_fs.default.renameSync(tmpFile, configFile);
      }
    } catch {
      try {
        import_node_fs.default.writeFileSync(configFile, content, "utf8");
      } catch {
      }
      try {
        if (import_node_fs.default.existsSync(tmpFile)) import_node_fs.default.unlinkSync(tmpFile);
      } catch {
      }
    }
    invalidateUserConfigCache();
  } catch {
  }
}
var DEFAULT_CONFIG = {
  endpoint: process.env.LINGUAL_ENDPOINT || "",
  apiKey: process.env.LINGUAL_API_KEY || "",
  model: process.env.LINGUAL_MODEL || "",
  selectedModel: "auto",
  mode: "direct",
  sourceLang: "en",
  targetLang: "ja",
  temperature: 0.2,
  timeoutMs: 3e4
};
var LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("en", "ja");
var MAX_TRANSLATION_CHARS = 2500;
var MAX_TRANSLATION_LINES = 30;
function shouldTriggerTranslation(text, sourceLang = "en", allowSameLangPromptOpt = false) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TRANSLATION_CHARS) return false;
  if (trimmed.split(/\r?\n/).length > MAX_TRANSLATION_LINES) return false;
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith("---")) return false;
  if (shouldShieldBypass(trimmed)) return false;
  if (allowSameLangPromptOpt) {
    if (isNonEnglish(trimmed)) return true;
    const words2 = trimmed.split(/\s+/);
    return words2.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
  }
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
  const nonLatinLangs = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
  if (nonLatinLangs.has(normSource)) {
    return isNonEnglish(trimmed);
  }
  if (isNonEnglish(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  return words.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
}
var BLOCKED_JSON_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function toCleanString(val) {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(toCleanString).filter(Boolean).join(" \xB7 ");
  return "";
}
function repairAndParseJsonObject(raw) {
  try {
    if (!raw || typeof raw !== "string" || raw.length > 32768) return null;
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) cleaned = fence[1].trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last <= first) return null;
    const jsonSubstr = cleaned.slice(first, last + 1);
    let parsed;
    try {
      parsed = JSON.parse(jsonSubstr);
    } catch {
      const repaired = jsonSubstr.replace(/,\s*([}\]])/g, "$1").replace(
        /("[a-zA-Z0-9_-]+"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
        (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
      );
      parsed = JSON.parse(repaired);
    }
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function parseLlmResponse(raw) {
  const parsed = repairAndParseJsonObject(raw);
  if (!parsed) return null;
  const spoken = toCleanString(parsed.spoken ?? parsed.casual ?? parsed.slot1);
  const spokenMeaning = toCleanString(parsed.spoken_meaning ?? parsed.spokenMeaning);
  const written = toCleanString(parsed.written ?? parsed.academic ?? parsed.slot2);
  const writtenMeaning = toCleanString(parsed.written_meaning ?? parsed.writtenMeaning);
  const vocab = toCleanString(parsed.vocab);
  const summary = toCleanString(parsed.summary ?? parsed.core_intent ?? parsed.coreIntent);
  const slotOutputs = /* @__PURE__ */ Object.create(null);
  for (const [k, v] of Object.entries(parsed)) {
    if (BLOCKED_JSON_KEYS.has(k) || k.endsWith("_meaning") || k === "summary") continue;
    const textVal = toCleanString(v);
    if (textVal) {
      const meaningVal = toCleanString(parsed[k + "_meaning"]);
      slotOutputs[k] = {
        content: textVal,
        meaning: meaningVal || void 0
      };
    }
  }
  const nonVocabOutputs = Object.entries(slotOutputs).filter(([k]) => k !== "vocab").map(([, val]) => val);
  const effectiveSpoken = spoken || nonVocabOutputs[0]?.content || vocab || "";
  const effectiveSpokenMeaning = spokenMeaning || nonVocabOutputs[0]?.meaning || "";
  if (!effectiveSpoken) return null;
  return {
    spoken: effectiveSpoken,
    spokenMeaning: effectiveSpokenMeaning || void 0,
    written: written || void 0,
    writtenMeaning: writtenMeaning || void 0,
    vocab: vocab || void 0,
    summary: summary || void 0,
    slotOutputs: Object.keys(slotOutputs).length > 0 ? slotOutputs : void 0
  };
}
async function executeLlmCompletion(text, sysPrompt, cfg) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  let onAbort;
  if (cfg.signal) {
    if (cfg.signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    onAbort = () => controller.abort();
    cfg.signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    if (typeof cfg.complete === "function") {
      return await cfg.complete(text, sysPrompt, controller.signal, { reasoning: cfg.reasoning });
    }
    if (cfg.endpoint) {
      const headers = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const requestBody = {
        model: cfg.model || "gemini-3.8-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: text }
        ]
      };
      if (cfg.reasoning) {
        requestBody.reasoning = cfg.reasoning;
      } else if (cfg.temperature !== void 0) {
        requestBody.temperature = cfg.temperature;
      }
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json?.choices?.[0]?.message?.content ?? null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (cfg.signal && onAbort) {
      cfg.signal.removeEventListener("abort", onAbort);
    }
  }
}
function isDynamicLongInput(text, sourceLang = "en") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normSource = (sourceLang || "en").toLowerCase().split("-")[0];
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
async function translatePrompt(text, userConfig = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) return null;
  if (shouldShieldBypass(trimmed)) return null;
  const effectiveSlots = cfg.slots || (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : void 0);
  const slotSig = Array.isArray(effectiveSlots) ? effectiveSlots.filter((s) => s.enabled !== false).map((s) => s.id).join(",") : void 0;
  const cacheKey = LingualLruCache.buildKey(trimmed, cfg.sourceLang, cfg.targetLang, slotSig);
  const cached = globalLingualCache.get(cacheKey);
  if (cached) return cached;
  const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
  const sysPrompt = buildSystemPrompt(cfg.sourceLang, cfg.targetLang, isLongInput, cfg.context, "general", effectiveSlots);
  const content = await executeLlmCompletion(trimmed, sysPrompt, cfg);
  if (typeof content !== "string" || !content.trim()) return null;
  const payload = parseLlmResponse(content);
  if (!payload || !payload.spoken) return null;
  const labels = resolveLabelsForLang(cfg.sourceLang || "en", cfg.labels, cfg.targetLang || "ja");
  const slot1Label = labels.slot1Label || labels.spokenLabel || "Spoken";
  const slot2Label = labels.slot2Label || labels.writtenLabel || "Written";
  const vocabLabel = labels.vocabLabel || "Vocab";
  const sourceLabel = labels.sourceLabel || "Source";
  const effectiveSourceText = isLongInput && payload.summary && payload.summary.trim() ? payload.summary.trim() : trimmed;
  const result = {
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
        sourceLabel
      }
    )
  };
  globalLingualCache.set(cacheKey, result);
  return result;
}
function shouldInjectNativeReplyGuard(originalText, _sourceLang = "en", enabled = false) {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed || !isNonEnglish(trimmed)) return false;
  const isEnglishWritingIntent = /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(trimmed);
  return !isEnglishWritingIntent;
}
function formatNativeReplyGuardHint(sourceLang = "en") {
  const name = resolveLanguageName(sourceLang);
  return `

(Please reply and explain in ${name}.)`;
}
function extractCleanJsonField(raw, fieldName) {
  const obj = repairAndParseJsonObject(raw);
  if (obj && !BLOCKED_JSON_KEYS.has(fieldName)) {
    const val = obj[fieldName] ?? obj.prompt ?? obj.written ?? obj.spoken;
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  const cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").replace(/```(?:json)?|```/gi, "").trim();
  const regexFallback = cleaned.match(/"(?:prompt|written|spoken)"\s*:\s*"([\s\S]*?)"\s*\}/);
  if (regexFallback && regexFallback[1].trim()) {
    return regexFallback[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return "";
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}
function resolveDirectSlotsFromConfig(cfg) {
  if (Array.isArray(cfg.directSlots) && cfg.directSlots.length > 0) {
    const enabled = cfg.directSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultDirectSlots(cfg.sourceLang);
}
function resolveCandidateSlotsFromConfig(cfg) {
  if (Array.isArray(cfg.promptSlots) && cfg.promptSlots.length > 0) {
    const enabled = cfg.promptSlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultPromptSlots(cfg.sourceLang);
}
function resolveModifySlotsFromConfig(cfg) {
  if (Array.isArray(cfg.modifySlots) && cfg.modifySlots.length > 0) {
    const enabled = cfg.modifySlots.filter((s) => s.enabled !== false);
    if (enabled.length > 0) return enabled;
  }
  return getDefaultModifySlots(cfg.sourceLang, cfg.explainLang);
}
function defaultSlotsForMode(mode, sourceLang, explainLang) {
  if (mode.action === "pass-through") return [];
  if (mode.action === "select") return getDefaultPromptSlots(sourceLang);
  return mode.flow === "proofread" ? getDefaultModifySlots(sourceLang, explainLang) : getDefaultDirectSlots(sourceLang);
}
function resolveModesFromConfig(cfg, fallbackSourceLang = "en") {
  const sourceLang = cfg.sourceLang || fallbackSourceLang;
  const explainLang = cfg.explainLang || sourceLang;
  if (Array.isArray(cfg.modes) && cfg.modes.length > 0) {
    const valid = cfg.modes.filter((m) => m && typeof m.id === "string" && m.id.trim()).map((m) => {
      if (Array.isArray(m.slots) && m.slots.length > 0) return m;
      return { ...m, slots: defaultSlotsForMode(m, sourceLang, explainLang) };
    });
    if (valid.length > 0) return localizeModes(valid, sourceLang, explainLang);
  }
  const hasLegacyCustomSlots = Array.isArray(cfg.slots) || Array.isArray(cfg.directSlots) || Array.isArray(cfg.promptSlots) || Array.isArray(cfg.modifySlots);
  if (hasLegacyCustomSlots) {
    const directSlots = resolveDirectSlotsFromConfig({ sourceLang, directSlots: cfg.directSlots });
    const modifySlots = resolveModifySlotsFromConfig({ sourceLang, explainLang, modifySlots: cfg.modifySlots });
    const promptSlots = resolveCandidateSlotsFromConfig({ sourceLang, promptSlots: cfg.promptSlots });
    const companionSlots = (Array.isArray(cfg.slots) && cfg.slots.length > 0 ? cfg.slots : getDefaultSlots(sourceLang)).map((s) => ({
      id: s.id,
      label: s.label,
      role: s.role === "vocab" ? "vocab" : "rewrite",
      instruction: s.instruction || "Natural expressions matching context",
      enabled: s.enabled !== false
    }));
    const n = resolveSeedNames(sourceLang);
    return [
      {
        id: "direct",
        name: n.direct,
        flow: "translate",
        action: "transform",
        hud: "preview",
        slots: directSlots,
        enabled: true
      },
      {
        id: "live-flow",
        name: n.liveFlow,
        flow: "proofread",
        action: "transform",
        hud: "adaptive-takeaway",
        slots: modifySlots,
        enabled: true
      },
      {
        id: "companion",
        name: n.companion,
        flow: "translate",
        action: "pass-through",
        hud: "tree",
        slots: companionSlots,
        enabled: true
      },
      {
        id: "candidates",
        name: n.candidates,
        flow: "translate",
        action: "select",
        hud: "tree",
        slots: promptSlots,
        enabled: true
      }
    ];
  }
  return getDefaultFactoryModes(sourceLang, explainLang);
}
function normalizeActiveModeId(cfg, modes) {
  if (cfg.mode === "off" || cfg.activeModeId === "off") return "off";
  const activeModes = modes.filter((m) => m.enabled !== false);
  const targetId = cfg.activeModeId || cfg.mode;
  if (!targetId) {
    return activeModes[0]?.id || "companion";
  }
  const legacyMap = {
    original: "companion",
    companion: "companion",
    english: "direct",
    direct: "direct",
    lazy: "direct",
    select: "candidates",
    candidates: "candidates",
    modify: "live-flow",
    "live-flow": "live-flow",
    raw: "live-flow",
    polish: "live-flow"
  };
  const mappedId = legacyMap[targetId] || targetId;
  if (activeModes.some((m) => m.id === mappedId)) {
    return mappedId;
  }
  if (activeModes.some((m) => m.id === targetId)) {
    return targetId;
  }
  return activeModes[0]?.id || "companion";
}
function compileModeSystemPrompt(mode, options) {
  const sourceLang = mode.customInputLang || options.sourceLang || "en";
  const targetLang = mode.customOutputLang || options.targetLang || "en";
  const explainLang = options.explainLang || sourceLang;
  const rawSlots = Array.isArray(mode.slots) && mode.slots.length > 0 ? mode.slots : defaultSlotsForMode(mode, sourceLang, explainLang);
  const interpolatedSlots = rawSlots.map((s) => ({
    ...s,
    instruction: s.instruction ? interpolatePromptVariables(s.instruction, {
      sourceLang,
      targetLang,
      explainLang
    }) : ""
  }));
  const slotKillLists = rawSlots.flatMap((s) => s.killList || []);
  const combinedKillList = [...mode.killList || [], ...slotKillLists];
  if (mode.flow === "proofread") {
    return buildModifySystemPrompt({
      sourceLang,
      targetLang,
      explainLang,
      customSlots: interpolatedSlots,
      context: options.context,
      killList: combinedKillList,
      globalKillList: options.globalKillList,
      preserveCodeSwitching: mode.preserveCodeSwitching,
      systemHint: mode.systemHint
    });
  }
  return buildPromptCandidatesSystemPrompt({
    sourceLang,
    targetLang,
    promptSlots: interpolatedSlots,
    context: options.context,
    promptRule: mode.systemHint,
    killList: combinedKillList,
    globalKillList: options.globalKillList
  });
}
async function executeModeRunner(text, mode, userConfig = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang, true)) {
    return null;
  }
  const resolvedReasoning = mode.reasoning ?? cfg.reasoning ?? "low";
  const effectiveCfg = {
    ...cfg,
    reasoning: resolvedReasoning
  };
  const sysPrompt = compileModeSystemPrompt(mode, {
    sourceLang: effectiveCfg.sourceLang,
    targetLang: effectiveCfg.targetLang,
    explainLang: effectiveCfg.explainLang,
    globalKillList: effectiveCfg.globalKillList,
    context: effectiveCfg.context || userConfig.context
  });
  const raw = await executeLlmCompletion(trimmed, sysPrompt, effectiveCfg);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const obj = repairAndParseJsonObject(raw);
  if (!obj) {
    const fallbackSingle = extractCleanJsonField(raw, mode.slots[0]?.id || "prompt");
    if (fallbackSingle) {
      return [{ id: mode.slots[0]?.id || "concise", label: mode.slots[0]?.label || "Direct", content: fallbackSingle }];
    }
    return null;
  }
  const enabledSlots = mode.slots.filter((s) => s.enabled !== false);
  const vocabSlot = enabledSlots.find((s) => s.role === "vocab" || s.id === "vocab" || s.id === "fixes");
  const extractedVocab = vocabSlot && !BLOCKED_JSON_KEYS.has(vocabSlot.id) && typeof obj[vocabSlot.id] === "string" && obj[vocabSlot.id].trim() ? obj[vocabSlot.id].trim() : typeof obj.fixes === "string" && obj.fixes.trim() ? obj.fixes.trim() : typeof obj.vocab === "string" && obj.vocab.trim() ? obj.vocab.trim() : void 0;
  const rewriteSlots = enabledSlots.filter((s) => s.role !== "vocab" && s.id !== "source");
  const candidates = [];
  for (const slot of rewriteSlots) {
    if (BLOCKED_JSON_KEYS.has(slot.id)) continue;
    let val = obj[slot.id];
    if (!val) {
      if (slot.id === "fixed" && typeof obj.fixed === "string") val = obj.fixed;
      else if (slot.id === "native" && typeof obj.native === "string") val = obj.native;
      else if (rewriteSlots.length === 1) val = obj.prompt ?? obj.direct_spec ?? obj.fixed ?? obj.spoken;
    }
    const meaningVal = typeof obj[`${slot.id}_meaning`] === "string" ? obj[`${slot.id}_meaning`].trim() : void 0;
    if (typeof val === "string" && val.trim()) {
      candidates.push({
        id: slot.id,
        label: slot.label,
        content: val.trim(),
        meaning: meaningVal,
        ...extractedVocab ? { vocab: extractedVocab } : {},
        hideWhenLong: Boolean(slot.hideWhenLong)
      });
    }
  }
  if (mode.primarySlotId && candidates.length > 1) {
    const pIdx = candidates.findIndex((c) => c.id.toLowerCase() === mode.primarySlotId?.toLowerCase());
    if (pIdx > 0) {
      const [primary] = candidates.splice(pIdx, 1);
      candidates.unshift(primary);
    }
  }
  return candidates.length > 0 ? candidates : null;
}
function stripLingualContextWhenOff(systemPrompt, lastUserText = "", tunerArmed = false) {
  if (!systemPrompt) return systemPrompt;
  if (tunerArmed || /(?:lingual-tuner|\/lingual\s+(?:tuner|tune|agent)|(?:定制|配置|调整)伴学)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt.replace(/\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "").replace(/\s*<skill[^>]*>[\s\S]*?<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi, "");
}
var MODE_DISPLAY_BY_LANG = {
  zh: {
    companion: SEED_NAMES.zh.companion,
    direct: SEED_NAMES.zh.direct,
    candidates: SEED_NAMES.zh.candidates,
    modify: SEED_NAMES.zh.liveFlow,
    off: "\u5DF2\u5173\u95ED",
    notifyOff: (p) => `[${p}] \u5DF2\u5207\u6362\u81F3\u30100 \u5DF2\u5173\u95ED (off)\u3011\uFF1A\u5E95\u680F\u9690\u85CF \xB7 \u76D1\u542C\u5DF2\u5378 \xB7 0 Token \u96F6\u8D1F\u62C5`
  },
  tw: {
    companion: SEED_NAMES.tw.companion,
    direct: SEED_NAMES.tw.direct,
    candidates: SEED_NAMES.tw.candidates,
    modify: SEED_NAMES.tw.liveFlow,
    off: "\u5DF2\u95DC\u9589",
    notifyOff: (p) => `[${p}] \u5DF2\u5207\u63DB\u81F3\u30100 \u5DF2\u95DC\u9589 (off)\u3011\uFF1A\u5E95\u6B04\u96B1\u85CF \xB7 \u76E3\u807D\u5DF2\u5378 \xB7 0 Token \u96F6\u8CA0\u64D4`
  },
  ja: {
    companion: SEED_NAMES.ja.companion,
    direct: SEED_NAMES.ja.direct,
    candidates: SEED_NAMES.ja.candidates,
    modify: SEED_NAMES.ja.liveFlow,
    off: "\u30AA\u30D5",
    notifyOff: (p) => `[${p}] \u30100 \u30AA\u30D5 (off)\u3011\uFF1A\u4E0B\u90E8\u30D0\u30FC\u975E\u8868\u793A\u30FB\u76E3\u8996\u505C\u6B62\u30FB0 Token \u7121\u8CA0\u8377`
  },
  ko: {
    companion: SEED_NAMES.ko.companion,
    direct: SEED_NAMES.ko.direct,
    candidates: SEED_NAMES.ko.candidates,
    modify: SEED_NAMES.ko.liveFlow,
    off: "\uAEBC\uC9D0",
    notifyOff: (p) => `[${p}] \u30100 \uAEBC\uC9D0 (off)\u3011\uFF1A\uC0C1\uD0DC \uC228\uAE40 \xB7 \uB9AC\uC2A4\uB108 \uBD84\uB9AC \xB7 0 \uD1A0\uD070`
  },
  es: {
    companion: SEED_NAMES.es.companion,
    direct: SEED_NAMES.es.direct,
    candidates: SEED_NAMES.es.candidates,
    modify: SEED_NAMES.es.liveFlow,
    off: "Apagado",
    notifyOff: (p) => `[${p}] Cambiado a [0 Apagado]: Estado oculto \xB7 0 tokens`
  },
  fr: {
    companion: SEED_NAMES.fr.companion,
    direct: SEED_NAMES.fr.direct,
    candidates: SEED_NAMES.fr.candidates,
    modify: SEED_NAMES.fr.liveFlow,
    off: "D\xE9sactiv\xE9",
    notifyOff: (p) => `[${p}] Pass\xE9 en mode [0 D\xE9sactiv\xE9] : Statut masqu\xE9 \xB7 0 tokens`
  },
  de: {
    companion: SEED_NAMES.de.companion,
    direct: SEED_NAMES.de.direct,
    candidates: SEED_NAMES.de.candidates,
    modify: SEED_NAMES.de.liveFlow,
    off: "Aus",
    notifyOff: (p) => `[${p}] Gewechselt zu [0 Aus]: Status ausgeblendet \xB7 0 Tokens`
  },
  ru: {
    companion: SEED_NAMES.ru.companion,
    direct: SEED_NAMES.ru.direct,
    candidates: SEED_NAMES.ru.candidates,
    modify: SEED_NAMES.ru.liveFlow,
    off: "\u0412\u044B\u043A\u043B",
    notifyOff: (p) => `[${p}] \u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u0432 \u0440\u0435\u0436\u0438\u043C [0 \u0412\u044B\u043A\u043B]: \u0441\u043A\u0440\u044B\u0442 \u0441\u0442\u0430\u0442\u0443\u0441 \xB7 0 \u0442\u043E\u043A\u0435\u043D\u043E\u0432`
  },
  en: {
    companion: SEED_NAMES.en.companion,
    direct: SEED_NAMES.en.direct,
    candidates: SEED_NAMES.en.candidates,
    modify: SEED_NAMES.en.liveFlow,
    off: "Off",
    notifyOff: (p) => `[${p}] Switched to [0 Off] mode: Status hidden \xB7 listeners detached \xB7 0 tokens`
  }
};
function resolveModeDisplaySpec(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  return MODE_DISPLAY_BY_LANG[norm] || MODE_DISPLAY_BY_LANG.en;
}
var MODE_ALIAS_MAP = {
  "1": "original",
  companion: "original",
  learn: "original",
  study: "original",
  original: "original",
  orig: "original",
  "\u7EAF\u4F34\u5B66": "original",
  "\u7D14\u4F34\u5B78": "original",
  "\u4F34\u5B66": "original",
  "\u4F34\u8D70": "original",
  "2": "english",
  direct: "english",
  rewrite: "english",
  refine: "english",
  english: "english",
  en: "english",
  eng: "english",
  lazy: "english",
  "\u89C4\u8303\u76F4\u53D1": "english",
  "\u76F4\u63A5\u6539": "english",
  "\u76F4\u6539": "english",
  "\u76F4\u51FA": "english",
  "\u4ED5\u69D8\u76F4\u884C": "english",
  "3": "select",
  candidates: "select",
  candidate: "select",
  select: "select",
  choices: "select",
  choice: "select",
  pick: "select",
  "\u6311\u5019\u9009": "select",
  "\u6311\u5019\u9078": "select",
  "\u5019\u9009": "select",
  "\u5019\u88DC\u9078": "select",
  "4": "modify",
  modify: "modify",
  polish: "modify",
  fix: "modify",
  proofread: "modify",
  raw: "modify",
  "live-flow": "modify",
  "\u5B9E\u6218\u72C2\u98D9": "modify",
  "\u539F\u53E5\u4FEE\u8865": "modify",
  "\u539F\u53E5\u4FEE\u88DC": "modify",
  "\u4FEE\u8865": "modify",
  "\u5B9F\u6226\u75BE\u8D70": "modify",
  "\u539F\u6587\u4FEE\u6B63": "modify",
  "0": "off",
  off: "off",
  disable: "off",
  stop: "off",
  "\u5DF2\u5173\u95ED": "off",
  "\u5DF2\u95DC\u9589": "off",
  "\u5173\u95ED": "off",
  "\u30AA\u30D5": "off"
};
function normalizeLingualModeInput(raw) {
  if (!raw) return null;
  return MODE_ALIAS_MAP[raw.trim().toLowerCase()] || null;
}
var CURRENT_FEATURE_BANNER_VERSION = "0.6.0";
function normalizeLocaleTag(raw) {
  return (raw || "").toLowerCase().replace(/_/g, "-").split(".")[0];
}
function isTraditionalChineseLocale(tag) {
  return tag.startsWith("zh-tw") || tag.startsWith("zh-hk") || tag.startsWith("zh-hant") || tag === "zh-mo";
}
function resolveReleaseBannerLang(explicitSourceLang, sessionEntries) {
  const supported = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);
  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    return supported.has(clean) ? clean : "en";
  }
  if (Array.isArray(sessionEntries) && sessionEntries.length > 0) {
    for (let i = sessionEntries.length - 1; i >= 0; i--) {
      const e = sessionEntries[i];
      if (e?.type === "message" && e?.message?.role === "user") {
        const text = Array.isArray(e.message.content) ? e.message.content.map((c) => c?.text || "").join(" ") : String(e.message.content || "");
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
        if (/[\uac00-\ud7af]/.test(text)) return "ko";
        if (/[\u0400-\u04ff]/.test(text)) return "ru";
        if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
      }
    }
  }
  try {
    const i18nFile = import_node_path.default.join(import_node_os.default.homedir(), ".config", "rpiv-i18n", "config.json");
    if (import_node_fs.default.existsSync(i18nFile)) {
      const raw = JSON.parse(import_node_fs.default.readFileSync(i18nFile, "utf8"));
      const loc = normalizeLocaleTag(String(raw?.locale || raw?.lang || ""));
      if (isTraditionalChineseLocale(loc)) return "tw";
      const prefix = loc.split("-")[0];
      if (supported.has(prefix)) return prefix;
    }
  } catch {
  }
  try {
    const envLocale = normalizeLocaleTag(
      process.env.LC_ALL || process.env.LANGUAGE || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale || "en"
    );
    if (isTraditionalChineseLocale(envLocale)) return "tw";
    const prefix = envLocale.split("-")[0];
    if (supported.has(prefix)) return prefix;
  } catch {
  }
  return "en";
}
function resolveSelectPrompts(lang = "en", candidatesCount = 3) {
  const norm = (lang || "en").toLowerCase().split("-")[0];
  const selectPrompts = {
    zh: {
      title: "\u2726 \u6311\u5019\u9009\u53D1\u9001",
      keepOrig: "\u539F\u8BDD\u76F4\u53D1",
      hint: `\u6309\u6570\u5B57 1-${candidatesCount} \u76F4\u63A5\u53D1\u51FA \xB7 \u2190\u2192/\u2191\u2193 \u5207\u6362 Enter \u786E\u8BA4 \xB7 0/Esc \u53D1\u539F\u8BDD`
    },
    tw: {
      title: "\u2726 \u6311\u5019\u9078\u767C\u9001",
      keepOrig: "\u539F\u8A71\u76F4\u767C",
      hint: `\u6309\u6578\u5B57 1-${candidatesCount} \u76F4\u63A5\u767C\u51FA \xB7 \u2190\u2192/\u2191\u2193 \u5207\u63DB Enter \u78BA\u8A8D \xB7 0/Esc \u767C\u539F\u8A71`
    },
    ja: {
      title: "\u2726 \u5019\u88DC\u3092\u9078\u3093\u3067\u9001\u4FE1",
      keepOrig: "\u539F\u6587\u306E\u307E\u307E",
      hint: `\u6570\u5B57 1-${candidatesCount} \u3067\u5373\u9001\u4FE1 \xB7 \u2190\u2192/\u2191\u2193 \u9078\u629E Enter \u78BA\u5B9A \xB7 0/Esc \u539F\u6587\u9001\u4FE1`
    },
    ko: {
      title: "\u2726 \uD6C4\uBCF4 \uC120\uD0DD \uC804\uC1A1",
      keepOrig: "\uC6D0\uBB38 \uC804\uC1A1",
      hint: `\uC22B\uC790 1-${candidatesCount} \uC989\uC2DC \uC804\uC1A1 \xB7 \u2190\u2192/\u2191\u2193 Enter \uD655\uC778 \xB7 0/Esc \uC6D0\uBB38 \uC804\uC1A1`
    },
    es: {
      title: "\u2726 Elegir candidato",
      keepOrig: "Texto original",
      hint: `1-${candidatesCount} enviar \xB7 \u2190\u2192/\u2191\u2193 Enter confirmar \xB7 0/Esc original`
    },
    fr: {
      title: "\u2726 Choisir une variante",
      keepOrig: "Texte original",
      hint: `1-${candidatesCount} envoyer \xB7 \u2190\u2192/\u2191\u2193 Entr\xE9e valider \xB7 0/Esc original`
    },
    de: {
      title: "\u2726 Variante w\xE4hlen",
      keepOrig: "Originaltext",
      hint: `1-${candidatesCount} senden \xB7 \u2190\u2192/\u2191\u2193 Eingabe best\xE4tigen \xB7 0/Esc Original`
    },
    ru: {
      title: "\u2726 \u0412\u044B\u0431\u043E\u0440 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430",
      keepOrig: "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442",
      hint: `1-${candidatesCount} \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \xB7 \u2190\u2192/\u2191\u2193 Enter \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \xB7 0/Esc \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439`
    },
    en: {
      title: "\u2726 Pick candidate",
      keepOrig: "Send original",
      hint: `1-${candidatesCount} send \xB7 \u2190\u2192/\u2191\u2193 Enter \xB7 0/Esc original`
    }
  };
  return selectPrompts[norm] || selectPrompts.en;
}
function formatReleaseBannerLines(sourceLang = "en", maxCols = 80, fg = (_c, t) => t) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const effectiveCols = typeof maxCols === "number" && maxCols > 0 ? maxCols : 80;
  const copyByLang = {
    zh: {
      title: "\xB7 [pi-lingual v0.6.0] \u4E09\u6838\u51FA\u5382\uFF1A\u4F34\u5B66 \xB7 \u89C4\u8303\u76F4\u53D1 \xB7 \u5B9E\u6218\u72C2\u98D9",
      subtitle: "\u2502 \u5728 AI \u751F\u6210\u7684 5-15 \u79D2\u95F4\u9699\u987A\u624B\u6361\u8BED\u611F\uFF1B\u63D0\u793A\u8BCD\u59CB\u7EC8\u7EAF\u51C0\u82F1\u6587",
      rows: [
        "\u250C [\u5B9A\u5236\u4E2D\u5FC3 \xB7 Tuner] \u6572 /tuner \u8DDF AI \u8BF4\u8BDD\uFF0C\u968F\u610F\u589E\u5220\u6539\u6A21\u5F0F",
        "\u2502   (4 \u5927\u914D\u88C5\u5C31\u7EEA\uFF1Aspec \u538B\u94F8 \xB7 commit \u8131\u6C34 \xB7 oss \u5BF9\u7EBF \xB7 yap \u53D1\u63A8)",
        "\u251C [1 \u7EAF\u4F34\u5B66 \xB7 companion] \u4E2D\u6587\u539F\u6837\u76F4\u53D1\uFF1B\u4E0A\u65B9\u6D6E\u51FA\u53CC\u8BED\u5BF9\u7167\u5361",
        "\u251C [2 \u89C4\u8303\u76F4\u53D1 \xB7 direct] \u6572\u4E2D\u6587\uFF0C0ms \u8F6C\u6210\u89C4\u8303\u82F1\u6587\u5DE5\u7A0B\u6307\u4EE4",
        "\u251C [3 \u5B9E\u6218\u72C2\u98D9 \xB7 live-flow] \u6253\u82F1\u6587\uFF1B\u53EA\u4FEE\u9519\u8BCD\uFF0C\u7C97\u53E3\u60C5\u7EEA 100% \u4FDD\u7559",
        "\u2514   (/lingual 1|2|3 \u6309\u6CE8\u518C\u8868\u987A\u5E8F\uFF1B/lingual <id> \u6C38\u8FDC\u6709\u6548)"
      ]
    },
    tw: {
      title: "\xB7 [pi-lingual v0.6.0] \u4E09\u6838\u51FA\u5EE0\uFF1A\u7D14\u4F34\u5B78 \xB7 \u898F\u7BC4\u76F4\u767C \xB7 \u5BE6\u6230\u72C2\u98C6",
      subtitle: "\u2502 \u5728 AI \u751F\u6210\u7684 5-15 \u79D2\u9593\u9699\u9806\u624B\u64BF\u8A9E\u611F\uFF1B\u63D0\u793A\u8A5E\u59CB\u7D42\u7D14\u6DE8\u82F1\u6587",
      rows: [
        "\u250C [\u5B9A\u88FD\u4E2D\u5FC3 \xB7 Tuner] \u6572 /tuner \u8DDF AI \u8AAA\u8A71\uFF0C\u96A8\u610F\u589E\u522A\u6539\u6A21\u5F0F",
        "\u2502   (4 \u5927\u914D\u88DD\u5C31\u7DD2\uFF1Aspec \u58D3\u9444 \xB7 commit \u812B\u6C34 \xB7 oss \u5C0D\u7DDA \xB7 yap \u767C\u63A8)",
        "\u251C [1 \u7D14\u4F34\u5B78 \xB7 companion] \u4E2D\u6587\u539F\u6A23\u76F4\u767C\uFF1B\u4E0A\u65B9\u6D6E\u51FA\u96D9\u8A9E\u5C0D\u7167\u5361",
        "\u251C [2 \u898F\u7BC4\u76F4\u767C \xB7 direct] \u6572\u4E2D\u6587\uFF0C0ms \u8F49\u6210\u898F\u7BC4\u82F1\u6587\u5DE5\u7A0B\u6307\u4EE4",
        "\u251C [3 \u5BE6\u6230\u72C2\u98C6 \xB7 live-flow] \u6253\u82F1\u6587\uFF1B\u53EA\u4FEE\u932F\u8A5E\uFF0C\u7C97\u53E3\u60C5\u7DD2 100% \u4FDD\u7559",
        "\u2514   (/lingual 1|2|3 \u6309\u8A3B\u518A\u8868\u9806\u5E8F\uFF1B/lingual <id> \u6C38\u9060\u6709\u6548)"
      ]
    },
    ja: {
      title: "\xB7 [pi-lingual v0.6.0] 3\u30B3\u30A2\uFF1A\u4F34\u8D70 \xB7 \u4ED5\u69D8\u76F4\u884C \xB7 \u5B9F\u6226\u75BE\u8D70",
      subtitle: "\u2502 AI \u751F\u6210\u306E 5-15 \u79D2\u306B\u8A9E\u611F\u3092\u62FE\u3046\uFF1B\u30D7\u30ED\u30F3\u30D7\u30C8\u306F\u5E38\u306B\u7D14\u82F1\u8A9E",
      rows: [
        "\u250C [\u8A2D\u8A08\u30BB\u30F3\u30BF\u30FC \xB7 Tuner] /tuner \u3067 AI \u3068\u5BFE\u8A71\u3057\u30E2\u30FC\u30C9\u3092\u7DE8\u96C6",
        "\u2502   (4\u5927\u30EC\u30B7\u30D4\uFF1Aspec \u5727\u7E2E \xB7 commit \u8131\u6C34 \xB7 oss \u5BFE\u8AD6 \xB7 yap \u6295\u7A3F)",
        "\u251C [1 \u4F34\u8D70 \xB7 companion] \u6BCD\u8A9E\u3092\u305D\u306E\u307E\u307E\u9001\u4FE1\uFF1B\u4E0A\u90E8\u306B\u4E8C\u8A00\u8A9E\u30AB\u30FC\u30C9",
        "\u251C [2 \u4ED5\u69D8\u76F4\u884C \xB7 direct] 0ms \u3067\u6BCD\u8A9E \u2794 \u898F\u7BC4\u7684\u306A\u82F1\u8A9E\u4ED5\u69D8\u306B\u6574\u5F62",
        "\u251C [3 \u5B9F\u6226\u75BE\u8D70 \xB7 live-flow] \u82F1\u8A9E\u5165\u529B\uFF1B\u8AA4\u5B57\u306E\u307F\u4FEE\u6B63\u3001\u611F\u60C5\u306F\u4FDD\u6301",
        "\u2514   (/lingual 1|2|3 \u306F\u767B\u9332\u9806\uFF1B/lingual <id> \u306F\u5E38\u306B\u6709\u52B9)"
      ]
    },
    ko: {
      title: "\xB7 [pi-lingual v0.6.0] 3\uCF54\uC5B4: \uB3D9\uD589\uD559\uC2B5 \xB7 \uB17C\uB9AC\uC815\uC81C \xB7 \uC2E4\uC804\uC9C8\uC8FC",
      subtitle: "\u2502 AI \uC0DD\uC131 5-15\uCD08\uC5D0 \uC5B4\uAC10\uC744 \uC90D\uB294\uB2E4; \uD504\uB86C\uD504\uD2B8\uB294 \uC21C\uC218 \uC601\uC5B4",
      rows: [
        "\u250C [\uC124\uACC4 \uC13C\uD130 \xB7 Tuner] /tuner \uB85C AI \uC640 \uBAA8\uB4DC\uB97C \uD3B8\uC9D1",
        "\u2502   (4\uB300 \uB808\uC2DC\uD53C: spec \xB7 commit \xB7 oss \xB7 yap)",
        "\u251C [1 \uB3D9\uD589\uD559\uC2B5 \xB7 companion] \uBAA8\uAD6D\uC5B4 \uC6D0\uBB38 \uC804\uC1A1; \uC774\uC911\uC5B8\uC5B4 \uCE74\uB4DC",
        "\u251C [2 \uB17C\uB9AC\uC815\uC81C \xB7 direct] 0ms \uB85C \uBAA8\uAD6D\uC5B4 \u2794 \uADDC\uACA9 \uC601\uC5B4 \uC0AC\uC591",
        "\u251C [3 \uC2E4\uC804\uC9C8\uC8FC \xB7 live-flow] \uC601\uC5B4 \uC785\uB825; \uC624\uD0C0\uB9CC \uC218\uC815, \uAC10\uC815 \uC720\uC9C0",
        "\u2514   (/lingual 1|2|3 \uC740 \uB4F1\uB85D \uC21C\uC11C; /lingual <id> \uB294 \uD56D\uC0C1 \uC720\uD6A8)"
      ]
    },
    es: {
      title: "\xB7 [pi-lingual v0.6.0] Tres n\xFAcleos: Compa\xF1ero \xB7 Directo \xB7 Live Flow",
      subtitle: "\u2502 Aprovecha los 5-15 s; tu prompt siempre en ingl\xE9s limpio",
      rows: [
        "\u250C [Centro Tuner] /tuner para crear o editar modos con AI",
        "\u2502   (4 recetas: spec \xB7 commit \xB7 oss \xB7 yap)",
        "\u251C [1 Aprendizaje \xB7 companion] Idioma nativo intacto; tarjeta arriba",
        "\u251C [2 Directo L\xF3gico \xB7 direct] 0ms nativo \u2794 especificaci\xF3n inglesa",
        "\u251C [3 Flujo en Vivo \xB7 live-flow] Escribe en ingl\xE9s; solo corrige erratas",
        "\u2514   (/lingual 1|2|3 por registro; /lingual <id> siempre funciona)"
      ]
    },
    fr: {
      title: "\xB7 [pi-lingual v0.6.0] Trois c\u0153urs : Compagnon \xB7 Direct \xB7 Live Flow",
      subtitle: "\u2502 Profitez des 5-15 s ; prompt toujours en anglais propre",
      rows: [
        "\u250C [Centre Tuner]   Tapez /tuner pour cr\xE9er ou modifier des modes",
        "\u2502   (4 recettes : spec \xB7 commit \xB7 oss \xB7 yap)",
        "\u251C [1 Compagnon \xB7 companion] Langue native brute ; carte au-dessus",
        "\u251C [2 Direct Logique \xB7 direct] 0ms natif \u2794 spec anglaise structur\xE9e",
        "\u251C [3 Flux en Direct \xB7 live-flow] Tapez en anglais ; seules fautes fix\xE9es",
        "\u2514   (/lingual 1|2|3 selon registre ; /lingual <id> marche toujours)"
      ]
    },
    de: {
      title: "\xB7 [pi-lingual v0.6.0] Drei Kerne: Begleitung \xB7 Logik \xB7 Live Flow",
      subtitle: "\u2502 Nutze die 5-15 s; Prompt bleibt klares Englisch",
      rows: [
        "\u250C [Tuner-Zentrale]  /tuner f\xFCr Modi im Gespr\xE4ch",
        "\u2502   (4 Rezepte: spec \xB7 commit \xB7 oss \xB7 yap)",
        "\u251C [1 Begleitung \xB7 companion] Muttersprache roh; Karte dar\xFCber",
        "\u251C [2 Direkte Logik \xB7 direct] 0ms nativ \u2794 englische Spezifikation",
        "\u251C [3 Live-Fluss \xB7 live-flow] Englisch tippen; nur Fehler korrigiert",
        "\u2514   (/lingual 1|2|3 nach Registry; /lingual <id> l\xF6st immer auf)"
      ]
    },
    ru: {
      title: "\xB7 [pi-lingual v0.6.0] \u0422\u0440\u0438 \u044F\u0434\u0440\u0430: \u0421\u043E\u043F\u0440\u043E\u0432\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \xB7 \u041B\u043E\u0433\u0438\u043A\u0430 \xB7 Live Flow",
      subtitle: "\u2502 \u041B\u043E\u0432\u0438\u0442\u0435 \u044F\u0437\u044B\u043A \u0432 \u043F\u0430\u0443\u0437\u0435 5-15 \u0441; \u043F\u0440\u043E\u043C\u043F\u0442 \u2014 \u0447\u0438\u0441\u0442\u044B\u0439 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439",
      rows: [
        "\u250C [\u0426\u0435\u043D\u0442\u0440 Tuner]    /tuner \u2014 \u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0440\u0435\u0436\u0438\u043C\u044B \u0432 \u0434\u0438\u0430\u043B\u043E\u0433\u0435",
        "\u2502   (4 \u0440\u0435\u0446\u0435\u043F\u0442\u0430: spec \xB7 commit \xB7 oss \xB7 yap)",
        "\u251C [1 \u0421\u043E\u043F\u0440\u043E\u0432\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \xB7 companion] \u0420\u043E\u0434\u043D\u043E\u0439 \u0442\u0435\u043A\u0441\u0442 \u043A\u0430\u043A \u0435\u0441\u0442\u044C; \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430",
        "\u251C [2 \u041F\u0440\u044F\u043C\u043E\u0439 \u043F\u043E\u0442\u043E\u043A \xB7 direct] 0ms \u0440\u043E\u0434\u043D\u043E\u0439 \u2794 \u0430\u043D\u0433\u043B. \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F",
        "\u251C [3 \u0416\u0438\u0432\u043E\u0439 \u043F\u043E\u0442\u043E\u043A \xB7 live-flow] English-\u0432\u0432\u043E\u0434; \u043F\u0440\u0430\u0432\u044F\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u043F\u0435\u0447\u0430\u0442\u043A\u0438",
        "\u2514   (/lingual 1|2|3 \u043F\u043E \u0440\u0435\u0435\u0441\u0442\u0440\u0443; /lingual <id> \u0432\u0441\u0435\u0433\u0434\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442)"
      ]
    },
    en: {
      title: "\xB7 [pi-lingual v0.6.0] Three cores: Companion \xB7 Spec \xB7 Live Flow",
      subtitle: "\u2502 Catch phrasing in the 5-15 s gap; prompts stay clean English",
      rows: [
        "\u250C [Architect Tuner] Run /tuner to add or edit modes with AI",
        "\u2502   (4 tactical loadouts: spec \xB7 commit \xB7 oss \xB7 yap)",
        "\u251C [1 Companion \xB7 companion] Native text sent raw; card above",
        "\u251C [2 Logical Spec \xB7 direct] 0ms native \u2794 imperative English spec",
        "\u251C [3 Live Flow \xB7 live-flow] Draft English; only typos fixed, tone kept",
        "\u2514   (/lingual 1|2|3 = registry order; /lingual <id> always works)"
      ]
    }
  };
  const c = copyByLang[norm] || copyByLang.en;
  const allRawLines = [c.title, c.subtitle, ...c.rows];
  return allRawLines.map((line) => truncateVisual(`  ${fg("muted", line)}`, effectiveCols));
}

// src/fsm.ts
var LingualSessionController = class {
  activeAbortController = null;
  currentGeneration = 0;
  // Pagination state management
  pagedResults = [];
  currentPageIndex = 0;
  totalExpectedPages = 1;
  lastResult = null;
  /**
   * Begins a new session request:
   * 1. Aborts in-flight HTTP stream/request from previous turn;
   * 2. Increments monotonic generation counter;
   * 3. Binds a fresh AbortSignal.
   */
  beginRequest() {
    this.abortActive();
    this.activeAbortController = new AbortController();
    const generation = ++this.currentGeneration;
    return {
      generation,
      signal: this.activeAbortController.signal
    };
  }
  /**
   * Aborts currently active in-flight network requests.
   */
  abortActive() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }
  /**
   * Checks if the specified generation token is still the latest active generation.
   */
  isLatest(generation) {
    return this.currentGeneration === generation;
  }
  /**
   * Gets the latest generation counter value.
   */
  getCurrentGeneration() {
    return this.currentGeneration;
  }
  /**
   * Initializes the pagination pool when input is split into multiple semantic chunks.
   */
  initPagination(totalExpectedPages) {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = Math.max(1, totalExpectedPages);
  }
  /**
   * Sets page result for a chunk index with generation guard to reject stale writes.
   */
  setPageResult(chunkIndex, result, generation) {
    if (!this.isLatest(generation)) {
      return false;
    }
    this.pagedResults[chunkIndex] = result;
    this.lastResult = result;
    return true;
  }
  /**
   * Gets translation result for currently active page.
   */
  getActiveResult() {
    const readyList = this.getReadyPages();
    if (readyList.length === 0) {
      return this.lastResult;
    }
    if (this.currentPageIndex >= readyList.length) {
      this.currentPageIndex = Math.max(0, readyList.length - 1);
    }
    return readyList[this.currentPageIndex] || null;
  }
  /**
   * Gets all ready page results.
   */
  getReadyPages() {
    return this.pagedResults.filter((item) => Boolean(item));
  }
  /**
   * Gets a snapshot of the current pagination state.
   */
  getPaginationSnapshot() {
    const readyCount = this.getReadyPages().length;
    const totalPages = Math.max(readyCount, this.totalExpectedPages);
    return {
      pageIndex: this.currentPageIndex,
      totalPages,
      readyCount,
      isMultiPage: totalPages > 1
    };
  }
  /**
   * Cycles to the next ready page.
   * Returns true if pagination changed.
   */
  nextPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex + 1) % readyList.length;
    return true;
  }
  /**
   * Cycles to the previous ready page.
   * Returns true if pagination changed.
   */
  prevPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex - 1 + readyList.length) % readyList.length;
    return true;
  }
  /**
   * Clears pagination pool on non-translatable input or teardown to prevent ghost cards.
   */
  clearPagination() {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = 1;
  }
  /**
   * Gets the most recent translation result for /last replay.
   */
  getLastResult() {
    return this.lastResult;
  }
  /**
   * Explicitly sets the last translation result.
   */
  setLastResult(result) {
    this.lastResult = result;
  }
  /**
   * Resets the controller completely.
   */
  reset() {
    this.abortActive();
    this.clearPagination();
    this.lastResult = null;
  }
};

// src/sanitizer.ts
var TARGETED_CLIPBOARD_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)/gi;
var LEADING_TARGETED_CLIPBOARD_REGEX = /^(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png|\/(?:[^\r\n\t]+[\\\/])?pi-clipboard-[a-zA-Z0-9\-]+\.png)\s*/i;
var ABSOLUTE_LONG_PATH_REGEX = /(?:[a-zA-Z]:[\\\/](?:[^:\r\n\t\s<>"]+[\\\/])+[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_]+|\/(?:[a-zA-Z0-9_\-\.]+[\\\/]){3,}[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_]+)/gi;
var UUID_OR_SESSION_REGEX = /(?:(?:session|id|uuid)[\s:=]*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4,16}(?:\.jsonl)?/gi;
var STACK_LINE_REGEX = /^\s*(?:at\s+(?:[\w$.<>]+|[^\s]+)\s*\(.*:\d+:\d+\)|at\s+.*:\d+:\d+|File\s+".*", line \d+(?:, in\s+.*)?|goroutine \d+ \[.*\]:|Caused by:.*|^\s*\d+:\s+0x[0-9a-f]+|^\s*\^+|\b(?:SyntaxError|IndentationError|TabError):)/;
var COMPILER_DIAGNOSTIC_REGEX = /^(?:[a-zA-Z]:[\\\/]|\.{0,2}[\\\/]|[a-zA-Z0-9_\-\.]+)[^:\r\n]+:\d+:\d+:\s*(?:error|warning|fatal error|note):/i;
var UNIFIED_DIFF_HEADER_REGEX = /^(?:diff --git|index\s+[0-9a-f]{7}\.\.[0-9a-f]{7}|--- [ab]\/|\+\+\+ [ab]\/|@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@)/i;
var LIST_ITEM_REGEX = /^\s*(?:[-*•]|\d+[\.、)])\s+/;
var ANSI_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
function sanitizePromptForTranslation(raw) {
  const cleanRaw = typeof raw === "string" ? raw.replace(ANSI_REGEX, "") : "";
  const trimmed = cleanRaw.trim();
  if (!trimmed) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0
    };
  }
  let text = trimmed;
  while (LEADING_TARGETED_CLIPBOARD_REGEX.test(text)) {
    text = text.replace(LEADING_TARGETED_CLIPBOARD_REGEX, "").trim();
  }
  const inlinePathMatches = text.match(TARGETED_CLIPBOARD_PATH_REGEX);
  const extraPayloads = [];
  if (inlinePathMatches && inlinePathMatches.length > 0) {
    extraPayloads.push(...inlinePathMatches);
    text = text.replace(TARGETED_CLIPBOARD_PATH_REGEX, "").trim();
  }
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
  text = text.replace(/(?:\(\.\.\.\)\s*){2,}/g, "(...) ").trim();
  let trailingPathPayload = extraPayloads.length > 0 ? extraPayloads.join("\n") : void 0;
  if (!text) {
    return {
      distilledText: "",
      hasNaturalLanguage: false,
      hasCollapsedContent: false,
      naturalCharsLength: 0,
      rawPayload: trailingPathPayload
    };
  }
  let hasCollapsed = Boolean(longPathMatches || uuidMatches);
  text = text.replace(/```[\w\-]*\r?\n([\s\S]*?)\r?\n```/g, (_match, codeContent) => {
    hasCollapsed = true;
    const codeLines = codeContent.trim().split(/\r?\n/);
    if (codeLines.length <= 1) {
      return `[${codeLines[0] || "code"}]`;
    }
    return "[code ...]";
  });
  const lines = text.split(/\r?\n/);
  const resultLines = [];
  let inStackBlock = false;
  let inDiagnosticBlock = false;
  let inDiffBlock = false;
  const currentListItems = [];
  const collapsedListBlocks = [];
  const flushListItems = () => {
    const totalLength = currentListItems.reduce((acc, cur) => acc + cur.length, 0);
    if (currentListItems.length >= 2 && (currentListItems.length > 4 || totalLength > 120)) {
      hasCollapsed = true;
      resultLines.push(`[${currentListItems.length} items ...]`);
      collapsedListBlocks.push(currentListItems.join("\n"));
      currentListItems.length = 0;
    } else {
      resultLines.push(...currentListItems);
      currentListItems.length = 0;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrim = line.trim();
    if (!lineTrim) {
      flushListItems();
      inStackBlock = false;
      inDiagnosticBlock = false;
      inDiffBlock = false;
      continue;
    }
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
    if (COMPILER_DIAGNOSTIC_REGEX.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!inDiagnosticBlock) {
        resultLines.push(lineTrim);
        resultLines.push("[... diagnostics ...]");
        inDiagnosticBlock = true;
      }
      continue;
    } else {
      inDiagnosticBlock = false;
    }
    if (/^npm ERR!/i.test(lineTrim)) {
      flushListItems();
      hasCollapsed = true;
      if (!resultLines[resultLines.length - 1]?.includes("npm ERR! [...]")) {
        resultLines.push("npm ERR! [...]");
      }
      continue;
    }
    if (UNIFIED_DIFF_HEADER_REGEX.test(lineTrim)) {
      flushListItems();
      inDiffBlock = true;
      resultLines.push(line);
      continue;
    }
    if (inDiffBlock && (lineTrim.startsWith("-") || lineTrim.startsWith("+") || lineTrim.startsWith(" "))) {
      resultLines.push(line);
      continue;
    }
    inDiffBlock = false;
    if (LIST_ITEM_REGEX.test(lineTrim)) {
      currentListItems.push(line);
      continue;
    } else {
      flushListItems();
    }
    resultLines.push(line);
  }
  flushListItems();
  const distilledText = resultLines.join(" ").replace(/\s+/g, " ").trim();
  const withoutPlaceholders = distilledText.replace(/\[\.\.\.[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/g, "").replace(/[a-zA-Z0-9_\-\.\/\\:]+/g, "").trim();
  const hasCJK = isNonEnglish(distilledText);
  const hasQuestionKeywords = /(?:为什么|怎么|如何|帮我|排查|优化|修改|修复|为何|报错|审查|看下|explain|why|how|please|help|could you|fix|should|what|inspect)/i.test(distilledText);
  const isPureDiagnosticOutput = /^(?:[a-zA-Z0-9_\-\.\/\\:]+\s*-\s*error\s+[a-zA-Z0-9]+|error(?:\s+TS\d+|:)|warning:)/i.test(distilledText) && !hasQuestionKeywords;
  const isPureErrorOrDiagnostic = isPureDiagnosticOutput || /^Error:\s*[\w\s:]*\[\.\.\.\s*stack trace\s*\.\.\.\]/i.test(distilledText) && !hasQuestionKeywords;
  const cleanEnglishWords = distilledText.replace(/\[\.\.\.[^\]]*\]|\[code[^\]]*\]|\[\d+\s*items\s*\.\.\.\]/gi, " ").trim();
  const words = cleanEnglishWords.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const hasEnglishSentence = !isPureErrorOrDiagnostic && words.length >= 4 && !distilledText.startsWith("Error:");
  const hasNaturalLanguage = (hasCJK || hasQuestionKeywords || hasEnglishSentence || withoutPlaceholders.length > 5) && !isPureErrorOrDiagnostic;
  let rawPayload;
  const payloadParts = [];
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
    rawPayload
  };
}

// src/extension.ts
var initialDiskConfig = isTestEnvironment() ? {} : loadUserLingualConfig();
var initialSourceLang = initialDiskConfig.sourceLang || (isTestEnvironment() ? "en" : resolveReleaseBannerLang());
var initialTargetLang = initialDiskConfig.targetLang || (initialSourceLang === "en" ? "ja" : "en");
var initialSlotPreset = initialDiskConfig.slotPreset;
var initialSlots = Array.isArray(initialDiskConfig.slots) && initialDiskConfig.slots.length > 0 ? initialDiskConfig.slots : initialSlotPreset ? resolveSlotsForPreset(initialSlotPreset, initialSourceLang) : getDefaultSlots(initialSourceLang);
var initialDirectSlots = Array.isArray(initialDiskConfig.directSlots) && initialDiskConfig.directSlots.length > 0 ? initialDiskConfig.directSlots : getDefaultDirectSlots(initialSourceLang);
var initialPromptSlots = Array.isArray(initialDiskConfig.promptSlots) && initialDiskConfig.promptSlots.length > 0 ? initialDiskConfig.promptSlots : getDefaultPromptSlots(initialSourceLang);
var initialModifySlots = Array.isArray(initialDiskConfig.modifySlots) && initialDiskConfig.modifySlots.length > 0 ? initialDiskConfig.modifySlots : getDefaultModifySlots(initialSourceLang);
var initialModes = resolveModesFromConfig(initialDiskConfig, initialSourceLang);
var initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);
var initialRawMode = initialDiskConfig.activeModeId || initialDiskConfig.mode || "companion";
var initialNormalizedMode = normalizeActiveModeId(
  { mode: initialRawMode, activeModeId: initialRawMode },
  initialModes
);
var state = {
  mode: initialNormalizedMode,
  activeModeId: initialNormalizedMode,
  modeLocked: Boolean(initialDiskConfig.modeLocked),
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  explainLang: initialDiskConfig.explainLang || (initialSourceLang === "zh" || initialSourceLang === "tw" ? "zh" : initialSourceLang),
  selectedModel: initialDiskConfig.selectedModel || "auto",
  slotPreset: initialSlotPreset || "",
  slots: initialSlots,
  directSlots: initialDirectSlots,
  promptSlots: initialPromptSlots,
  modifySlots: initialModifySlots,
  modes: initialModes,
  labels: initialLabels
};
var session = new LingualSessionController();
var lastContext = null;
function hasActiveUI(ctx) {
  if (!ctx) return false;
  try {
    return Boolean(ctx.hasUI && ctx.ui);
  } catch {
    return false;
  }
}
function extractRecentContextAnchor(ctx) {
  if (!ctx) return "";
  try {
    const entries = ctx?.sessionManager?.getEntries?.() || [];
    const conversationalClosers = [
      /let me know/i,
      /hope this helps/i,
      /feel free to/i,
      /anything else/i,
      /happy to help/i,
      /还有什么/i,
      /随时告诉我/i,
      /请随时/i,
      /如有疑问/i,
      /需要我继续/i,
      /お気軽に/i,
      /他にご質問/i
    ];
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry?.type === "message" && entry?.message?.role === "assistant") {
        const content = entry.message.content;
        let text = "";
        if (typeof content === "string") {
          text = content;
        } else if (Array.isArray(content)) {
          text = content.filter((c) => c?.type === "text" && typeof c.text === "string").map((c) => c.text).join(" ");
        }
        if (!text || !text.trim()) continue;
        const rawLines = text.trim().split("\n").map((l) => l.trim()).filter(
          (l) => l.length > 0 && !/^```/.test(l) && !/^\|[-:\s|]+\|$/.test(l) && !/^\s*\|.*\|/.test(l)
        );
        if (rawLines.length === 0) continue;
        for (let j = rawLines.length - 1; j >= 0; j--) {
          const line = rawLines[j];
          if (conversationalClosers.some((re) => re.test(line))) continue;
          const isTechnical = /`[^`]+`/.test(line) || /[\/\\]/.test(line) || /\.[a-z0-9_-]{2,4}\b/i.test(line) || /[a-z0-9_]\.[a-z0-9_]/i.test(line) || /[_#]/.test(line) || /\b(function|class|const|def|return|import|error|bug|test|file|path|route|api)\b/i.test(line);
          if (isTechnical && line.length >= 10) {
            return line.replace(/^(\s*[-*•]\s+|\s*\d+\.\s+)/, "").slice(0, 160);
          }
        }
        for (let j = rawLines.length - 1; j >= 0; j--) {
          const line = rawLines[j];
          if (!conversationalClosers.some((re) => re.test(line)) && line.length >= 8) {
            return line.replace(/^(\s*[-*•]\s+|\s*\d+\.\s+)/, "").slice(0, 160);
          }
        }
        return rawLines[rawLines.length - 1].slice(0, 160);
      }
    }
  } catch {
  }
  return "";
}
function copyToClipboard(text) {
  if (!text) return false;
  try {
    const base64 = Buffer.from(text, "utf8").toString("base64");
    process.stdout.write(`\x1B]52;c;${base64}\x07`);
  } catch {
  }
  try {
    if (process.platform === "win32") {
      const proc = (0, import_node_child_process.spawn)("clip.exe", { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => {
      });
      proc.stdin.on("error", () => {
      });
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    } else if (process.platform === "darwin") {
      const proc = (0, import_node_child_process.spawn)("pbcopy", { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => {
      });
      proc.stdin.on("error", () => {
      });
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    } else {
      const proc = (0, import_node_child_process.spawn)("wl-copy", { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("error", () => {
        try {
          const procX = (0, import_node_child_process.spawn)("xclip", ["-selection", "clipboard"], { stdio: ["pipe", "ignore", "ignore"] });
          procX.on("error", () => {
          });
          procX.stdin.on("error", () => {
          });
          procX.stdin.write(text, "utf8");
          procX.stdin.end();
        } catch {
        }
      });
      proc.stdin.on("error", () => {
      });
      proc.stdin.write(text, "utf8");
      proc.stdin.end();
      return true;
    }
  } catch {
    return false;
  }
}
function safeClearWidget(ctx) {
  if (!ctx) return;
  try {
    if (ctx.ui && typeof ctx.ui.setWidget === "function") {
      ctx.ui.setWidget("lingual_hud", void 0);
    }
  } catch {
  }
}
function updateFooter(ctx) {
  if (!hasActiveUI(ctx)) return;
  try {
    if (state.mode === "off") {
      ctx.ui.setStatus("lingual", void 0);
      return;
    }
    let pair = `${state.sourceLang} \u21C4 ${state.targetLang}`;
    const canonicalId = state.mode === "english" ? "direct" : state.mode === "original" ? "companion" : state.mode === "select" ? "candidates" : state.mode === "modify" ? "live-flow" : state.mode;
    const canonicalKey = canonicalId === "live-flow" ? "modify" : canonicalId;
    const inMemory = Array.isArray(state.modes) ? state.modes : [];
    const activeMode = inMemory.find((m) => m.id === state.mode || m.id === canonicalId) || resolveModesFromConfig(loadUserLingualConfig(), state.sourceLang).find((m) => m.id === state.mode || m.id === canonicalId);
    const modeSlots = activeMode && Array.isArray(activeMode.slots) ? activeMode.slots : [];
    const enabledSlots = (modeSlots.length > 0 ? modeSlots : state.slots || []).filter((s) => s.enabled !== false);
    const nonSourceCount = enabledSlots.filter((s) => s.role !== "source").length;
    if (nonSourceCount !== 2 && enabledSlots.length > 0) {
      pair += ` \xB7 ${enabledSlots.length}s`;
    } else if (state.slotPreset) {
      pair += ` \xB7 ${state.slotPreset}`;
    }
    const modeName = activeMode ? activeMode.name : resolveModeDisplayName(canonicalId, state.sourceLang);
    ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} \xB7 ${modeName}`));
  } catch {
  }
}
function renderHudWidget(ctx, sourceText, spoken, written, vocab, spokenMeaning, writtenMeaning, pagination, slotOutputs, slots) {
  if (!hasActiveUI(ctx)) return;
  try {
    const isCompact = state.compact || (process.stdout?.rows ? process.stdout.rows < 22 : false);
    const maxCols = getEffectiveMaxCols();
    const pageTag = pagination && pagination.totalPages > 1 ? ctx.ui.theme.fg("muted", ` [${pagination.pageIndex + 1}/${pagination.totalPages} \u2325.]`) : "";
    const lines = renderCardLayout(
      {
        spoken,
        written: written || "",
        vocab,
        spokenMeaning,
        writtenMeaning,
        sourceText,
        annotated: "",
        slotOutputs,
        slots
      },
      state.labels,
      {
        maxCols,
        maxLines: 9,
        isCompact,
        slots: state.slots,
        pageTag,
        themeDecorators: {
          muted: (s) => ctx.ui.theme.fg("muted", s),
          accent: (s) => ctx.ui.theme.fg("accent", s),
          dim: (s) => ctx.ui.theme.fg("dim", s)
        }
      }
    );
    ctx.ui.setWidget("lingual_hud", lines, { placement: "aboveEditor" });
  } catch {
  }
}
function renderActiveCard(ctx) {
  if (!hasActiveUI(ctx)) return;
  try {
    const readyList = session.getReadyPages();
    if (readyList.length === 0) return;
    const snapshot = session.getPaginationSnapshot();
    const res = session.getActiveResult();
    if (!res) return;
    renderHudWidget(
      ctx,
      res.sourceText,
      res.spoken,
      res.written,
      res.vocab,
      res.spokenMeaning,
      res.writtenMeaning,
      {
        pageIndex: snapshot.pageIndex,
        totalPages: snapshot.readyCount
      },
      res.slotOutputs,
      res.slots
    );
  } catch {
  }
}
function extension_default(pi) {
  let polishTimer;
  let resizeTimer;
  let lastRawInputText = "";
  let showingReleaseBanner = false;
  let tunerArmed = false;
  const renderReleaseBanner = (ctx, explicitLang) => {
    if (!hasActiveUI(ctx)) return false;
    try {
      const maxCols = getBannerMaxCols();
      const fg = ctx.ui.theme?.fg ? (c, t) => ctx.ui.theme.fg(c, t) : (_c, t) => t;
      const entries = ctx.sessionManager?.getEntries?.() || [];
      const bannerLang = resolveReleaseBannerLang(explicitLang, entries);
      const lines = formatReleaseBannerLines(bannerLang, maxCols, fg);
      ctx.ui.setWidget("lingual_hud", lines, { placement: "aboveEditor" });
      showingReleaseBanner = true;
      return true;
    } catch {
      return false;
    }
  };
  const onResize = () => {
    if (state.mode === "off") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!hasActiveUI(lastContext)) return;
      if (showingReleaseBanner) {
        renderReleaseBanner(lastContext);
        return;
      }
      const activeObj = state.modes.find((m) => m.id === state.mode);
      if (activeObj?.hud === "none") return;
      const active = session.getActiveResult() || session.getLastResult();
      if (active) {
        renderActiveCard(lastContext);
      }
    }, 120);
  };
  const syncResizeListener = () => {
    const prevResize = globalThis.__piLingualResizeListener;
    if (prevResize && prevResize !== onResize && process.stdout && typeof process.stdout.off === "function") {
      process.stdout.off("resize", prevResize);
    }
    if (state.mode === "off") {
      if (prevResize === onResize) {
        process.stdout?.off?.("resize", onResize);
      }
      globalThis.__piLingualResizeListener = void 0;
      return;
    }
    if (prevResize !== onResize) {
      globalThis.__piLingualResizeListener = onResize;
      process.stdout?.on("resize", onResize);
    }
  };
  syncResizeListener();
  const clearPendingTimers = () => {
    if (polishTimer) {
      clearTimeout(polishTimer);
      polishTimer = void 0;
    }
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = void 0;
    }
  };
  pi.on("session_start", async (event, ctx) => {
    clearPendingTimers();
    session.abortActive();
    session.reset();
    lastContext = ctx;
    showingReleaseBanner = false;
    let diskCfg = loadUserLingualConfig();
    let detectedLang;
    if (!diskCfg.sourceLang) {
      const detected = resolveReleaseBannerLang();
      detectedLang = detected;
      const detectedSource = isSupportedLangCode(detected) ? detected : "en";
      state.sourceLang = detectedSource;
      state.targetLang = detectedSource === "en" ? "ja" : "en";
      state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);
      state.modes = getDefaultFactoryModes(state.sourceLang, state.sourceLang);
      state.slots = getDefaultSlots(state.sourceLang);
      state.directSlots = getDefaultDirectSlots(state.sourceLang);
      state.promptSlots = getDefaultPromptSlots(state.sourceLang);
      state.modifySlots = getDefaultModifySlots(state.sourceLang, state.sourceLang);
      state.mode = state.modes[0]?.id || "companion";
      state.activeModeId = state.mode;
    }
    if (diskCfg.sourceLang) {
      state.sourceLang = diskCfg.sourceLang;
    }
    if (diskCfg.targetLang) {
      state.targetLang = diskCfg.targetLang;
    }
    state.explainLang = diskCfg.explainLang || (state.sourceLang === "zh" || state.sourceLang === "tw" ? "zh" : state.sourceLang);
    state.labels = resolveLabelsForLang(state.sourceLang, diskCfg.labels, state.targetLang);
    if (Array.isArray(diskCfg.modes) && diskCfg.modes.length > 0) {
      state.modes = localizeModes(diskCfg.modes, state.sourceLang, state.explainLang || state.sourceLang);
    } else {
      state.modes = resolveModesFromConfig(diskCfg, state.sourceLang);
    }
    const rawDiskMode = diskCfg.activeModeId || diskCfg.mode || "companion";
    state.mode = normalizeActiveModeId(
      { mode: rawDiskMode, activeModeId: rawDiskMode },
      state.modes
    );
    state.activeModeId = state.mode;
    if (diskCfg.slots && Array.isArray(diskCfg.slots) && diskCfg.slots.length > 0) {
      state.slots = state.sourceLang === "zh" || state.sourceLang === "tw" ? diskCfg.slots : diskCfg.slots.map((s) => ({ ...s, label: localizeSlotLabel(s.id, s.label, state.sourceLang) }));
    }
    if (diskCfg.directSlots && Array.isArray(diskCfg.directSlots) && diskCfg.directSlots.length > 0) {
      state.directSlots = diskCfg.directSlots;
    }
    if (diskCfg.promptSlots && Array.isArray(diskCfg.promptSlots) && diskCfg.promptSlots.length > 0) {
      state.promptSlots = diskCfg.promptSlots;
    }
    if (state.sourceLang !== "zh" && state.sourceLang !== "tw") {
      const serialized = JSON.stringify(diskCfg.modes || "");
      if (/[\u4e00-\u9fa5]/.test(serialized)) {
        saveUserLingualConfig({ modes: state.modes, explainLang: state.explainLang });
      }
    }
    syncResizeListener();
    if (hasActiveUI(ctx)) {
      safeClearWidget(ctx);
      if (state.mode !== "off" && !isTestEnvironment() && event?.reason !== "resume" && diskCfg.lastSeenVersion !== CURRENT_FEATURE_BANNER_VERSION) {
        if (renderReleaseBanner(ctx, detectedLang || diskCfg.sourceLang)) {
          saveUserLingualConfig({ lastSeenVersion: CURRENT_FEATURE_BANNER_VERSION });
        }
      }
    }
    updateFooter(ctx);
  });
  pi.on("agent_start", async (_event, ctx) => {
    if (showingReleaseBanner) {
      showingReleaseBanner = false;
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
      }
    }
  });
  pi.on("before_agent_start", async (event) => {
    const armedForTurn = tunerArmed;
    tunerArmed = false;
    if (!event?.systemPrompt || typeof event.systemPrompt !== "string") return;
    const cleaned = stripLingualContextWhenOff(event.systemPrompt, lastRawInputText, armedForTurn);
    if (cleaned !== event.systemPrompt) {
      return { systemPrompt: cleaned };
    }
  });
  pi.on("session_shutdown", async () => {
    clearPendingTimers();
    session.abortActive();
    lastContext = null;
    if (process.stdout && typeof process.stdout.off === "function") {
      process.stdout.off("resize", onResize);
    }
    if (globalThis.__piLingualResizeListener === onResize) {
      globalThis.__piLingualResizeListener = void 0;
    }
  });
  const setModeHandler = async (args, ctx) => {
    session.abortActive();
    const trimmed = args?.trim() || "";
    const pair = state.labels.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`;
    const modeSpec = resolveModeDisplaySpec(state.sourceLang);
    const diskForMode = loadUserLingualConfig();
    const modes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(diskForMode);
    const activeModes = modes.filter((m) => m.enabled !== false);
    const hasCustomModesOnDisk = Array.isArray(diskForMode.modes) && diskForMode.modes.length > 0;
    let nextMode;
    const explicitLegacy = normalizeLingualModeInput(trimmed);
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      const matched = activeModes.find(
        (m) => m.id.toLowerCase() === lower || m.name.toLowerCase() === lower || Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === lower) || resolveModeDisplayName(m.id, state.sourceLang).toLowerCase() === lower || m.id === "direct" && (lower === "spec" || lower === "logical spec" || lower === "specification" || lower === "direct spec") || m.id === "companion" && (lower === "companion" || lower === "companion mode" || lower === "original") || m.id === "live-flow" && (lower === "live flow" || lower === "flow" || lower === "live" || lower === "modify" || lower === "raw")
      );
      const numIdx = parseInt(trimmed, 10);
      const isNum = !isNaN(numIdx) && String(numIdx) === trimmed;
      if (isNum && numIdx >= 1 && numIdx <= activeModes.length) {
        nextMode = activeModes[numIdx - 1].id;
      } else if (matched) {
        nextMode = matched.id;
      } else if (explicitLegacy) {
        nextMode = explicitLegacy;
      } else if (lower === "spec" || lower === "logical spec" || lower === "specification") {
        nextMode = "direct";
      } else if (lower === "companion" || lower === "companion mode") {
        nextMode = "companion";
      } else if (lower === "live flow" || lower === "flow" || lower === "live") {
        nextMode = "live-flow";
      } else {
        nextMode = trimmed;
      }
    } else {
      if (state.modeLocked) {
        const currentModeObj = activeModes.find((m) => m.id === state.mode);
        const currentName = currentModeObj ? currentModeObj.name : state.mode === "off" ? modeSpec.off : state.mode;
        try {
          ctx.ui.notify(`[lingual] mode locked to [${currentName}]. Run /lingual unlock to release.`, "warning");
        } catch {
        }
        return;
      }
      if (hasCustomModesOnDisk) {
        const cycleList = [...activeModes.map((m) => m.id), "off"];
        const currentIdx = cycleList.indexOf(state.mode);
        nextMode = currentIdx === -1 ? activeModes[0]?.id || "companion" : cycleList[(currentIdx + 1) % cycleList.length] || activeModes[0]?.id || "companion";
      } else {
        nextMode = state.mode === "original" || state.mode === "companion" ? "direct" : state.mode === "english" || state.mode === "direct" ? "live-flow" : state.mode === "select" || state.mode === "candidates" ? "live-flow" : state.mode === "modify" || state.mode === "live-flow" ? "off" : "companion";
      }
    }
    const canonical = nextMode === "original" ? "companion" : nextMode === "english" ? "direct" : nextMode === "select" ? "candidates" : nextMode === "modify" ? "live-flow" : nextMode;
    if (nextMode === "off") {
      state.mode = "off";
      state.activeModeId = "off";
      saveUserLingualConfig({ mode: "off", activeModeId: "off" });
      syncResizeListener();
      clearPendingTimers();
      session.reset();
      globalLingualCache.clear();
      safeClearWidget(ctx);
      updateFooter(ctx);
      try {
        ctx.ui.notify("[lingual: off]", "info");
      } catch {
      }
      return;
    }
    const targetMode = activeModes.find(
      (m) => m.id === canonical || m.id === nextMode || m.name.toLowerCase() === (trimmed || nextMode).toLowerCase() || resolveModeDisplayName(m.id, state.sourceLang).toLowerCase() === (trimmed || nextMode).toLowerCase()
    );
    if (!targetMode) {
      try {
        ctx.ui.notify(`[lingual] mode [${trimmed || nextMode}] not in your active registry. Run /lingual mode list to view available modes.`, "warning");
      } catch {
      }
      return;
    }
    const finalId = targetMode.id;
    state.mode = finalId;
    state.activeModeId = finalId;
    saveUserLingualConfig({ mode: finalId, activeModeId: finalId });
    syncResizeListener();
    updateFooter(ctx);
    const modeIdx = activeModes.indexOf(targetMode);
    const modeNum = modeIdx >= 0 ? modeIdx + 1 : 1;
    const modeName = localizeModeName(targetMode.id, targetMode.name, state.sourceLang);
    try {
      ctx.ui.notify(`[${pair}] ${modeNum}. ${modeName} (${finalId})`, "info");
    } catch {
    }
  };
  const setModelHandler = async (args, ctx) => {
    const trimmed = args.trim();
    const followSessionDesc = state.labels.modelFollowSession || "follow session";
    const currentActive = state.selectedModel === "auto" ? ctx.model ? `auto (${followSessionDesc}: ${ctx.model.provider}/${ctx.model.id})` : "auto" : state.selectedModel;
    if (!trimmed) {
      const available = ctx.modelRegistry?.getAvailable?.() || [];
      const availableList = available.length > 0 ? available.map((m) => `\u2022 ${m.provider}/${m.id}`).slice(0, 8).join("\n") : void 0;
      const msg = formatModelSelectionMessage(state.labels, currentActive || "auto", availableList);
      ctx.ui.notify(msg, "info");
      return;
    }
    state.selectedModel = trimmed;
    saveUserLingualConfig({ selectedModel: trimmed });
    ctx.ui.notify(`[lingual] model: ${trimmed}`, "info");
  };
  const switchLangHandler = async (args, ctx) => {
    const pair = state.labels.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`;
    const previousSource = state.sourceLang;
    const previousTarget = state.targetLang;
    const trimmed = args.trim().toLowerCase();
    if (!trimmed || trimmed === "list" || trimmed === "help" || trimmed === "?") {
      const flowText2 = `${state.sourceLang} \u2794 ${state.targetLang}`;
      const template = state.labels.langHelpText || "[Companion Language: {flow}]\n\u2022 Quick switch: /lang ja (target Japanese) \xB7 /lang en (target English)\n\u2022 Pair switch: /lang en ja \xB7 /lang ja en \xB7 /lang es en\n\u2022 Supported codes: zh, tw, ja, ko, en, es, fr, de, ru";
      const helpMsg = template.replace("{flow}", flowText2).replace("{pair}", pair);
      ctx.ui.notify(helpMsg, "info");
      return;
    }
    const parts = trimmed.split(/\s*->\s*|\s*➔\s*|\s+to\s+|\s+/).filter(Boolean);
    let newSource = state.sourceLang;
    let newTarget = state.targetLang;
    if (parts.length === 1) {
      const code = normalizeLangCode(parts[0]);
      if (!isSupportedLangCode(code)) {
        ctx.ui.notify(
          "[lingual] invalid language code. supported: zh, tw, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
      if (code === state.sourceLang) {
        newTarget = code === "en" ? "ja" : "en";
      } else {
        newTarget = code;
      }
    } else {
      newSource = normalizeLangCode(parts[0]);
      newTarget = normalizeLangCode(parts[1]);
      if (!isSupportedLangCode(newSource) || !isSupportedLangCode(newTarget)) {
        ctx.ui.notify(
          "[lingual] invalid language code. supported: zh, tw, ja, ko, en, es, fr, de, ru",
          "warning"
        );
        return;
      }
    }
    const diskBeforeSwitch = loadUserLingualConfig();
    state.sourceLang = newSource;
    state.targetLang = newTarget;
    if (!diskBeforeSwitch.explainLang || diskBeforeSwitch.explainLang === previousSource || diskBeforeSwitch.explainLang === "zh") {
      state.explainLang = newSource === "zh" || newSource === "tw" ? "zh" : newSource;
    } else {
      state.explainLang = diskBeforeSwitch.explainLang;
    }
    state.labels = resolveLabelsForLang(newSource, void 0, newTarget);
    if (state.slotPreset) {
      state.slots = resolveSlotsForPreset(state.slotPreset, newSource);
    } else {
      state.slots = getDefaultSlots(newSource);
    }
    state.directSlots = getDefaultDirectSlots(newSource);
    state.promptSlots = getDefaultPromptSlots(newSource);
    state.modifySlots = getDefaultModifySlots(newSource, state.explainLang);
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(diskBeforeSwitch, newSource);
    const isFactory = !diskBeforeSwitch.modes || diskBeforeSwitch.modes.length === 0 || currentModes.length === 3 && currentModes.every((m) => ["companion", "direct", "live-flow"].includes(m.id));
    if (isFactory) {
      state.modes = getDefaultFactoryModes(newSource, state.explainLang);
    } else {
      state.modes = localizeModes(currentModes, newSource, state.explainLang);
    }
    state.mode = normalizeActiveModeId({ mode: state.mode, activeModeId: state.activeModeId }, state.modes);
    state.activeModeId = state.mode;
    saveUserLingualConfig({
      sourceLang: newSource,
      targetLang: newTarget,
      explainLang: state.explainLang,
      modes: state.modes,
      slots: state.slots,
      directSlots: state.directSlots,
      promptSlots: state.promptSlots
    });
    session.reset();
    globalLingualCache.clear();
    updateFooter(ctx);
    const isTargetOnly = newSource === previousSource && newTarget !== previousTarget;
    const flowText = `${newSource} \u21C4 ${newTarget}`;
    const msg = isTargetOnly ? `[${flowText}] Target language switched to: ${newTarget} (${newSource} unchanged)` : `[${flowText}]`;
    ctx.ui.notify(msg, "info");
  };
  const toggleCompactHandler = async (_args, ctx) => {
    state.compact = !state.compact;
    saveUserLingualConfig({ compact: state.compact });
    const msg = state.compact ? "[lingual: Capsule mode enabled]" : "[lingual: tree HUD mode restored]";
    ctx.ui.notify(msg, "info");
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
    } else if (session.getLastResult()) {
      const last = session.getLastResult();
      renderHudWidget(
        ctx,
        last.sourceText,
        last.spoken,
        last.written,
        last.vocab,
        last.spokenMeaning,
        last.writtenMeaning,
        void 0,
        last.slotOutputs,
        last.slots
      );
    }
  };
  const refreshActiveView = (ctx) => {
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
    } else if (session.getLastResult()) {
      const last = session.getLastResult();
      renderHudWidget(
        ctx,
        last.sourceText,
        last.spoken,
        last.written,
        last.vocab,
        last.spokenMeaning,
        last.writtenMeaning,
        void 0,
        last.slotOutputs,
        last.slots
      );
    }
  };
  const switchSlotsHandler = async (args, ctx) => {
    const rawArgs = args.trim();
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    const subCmd = (parts[0] || "").toLowerCase();
    const lbl = state.labels;
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId || disk.activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const pair = lbl.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`;
    if (!subCmd || subCmd === "list" || subCmd === "ls") {
      const modeSlots = activeMode.slots || [];
      const lines = modeSlots.map((s, idx) => {
        const status = s.enabled !== false ? lbl.slotsStatusEnabled || "enabled" : lbl.slotsStatusDisabled || "disabled";
        const inst = s.instruction ? ` // ${s.instruction.slice(0, 50)}...` : "";
        return `  ${idx + 1}. [${s.id}] "${s.label}" (${s.role || "rewrite"}, ${status})${inst}`;
      });
      const header = `\u2726 [${activeMode.name}] Dynamic Slots (${modeSlots.filter((s) => s.enabled !== false).length}/${modeSlots.length} active):
`;
      const body = lines.length > 0 ? lines.join("\n") : `  (${lbl.slotsNone || "No slots configured"})`;
      const cliHelp = `

Usage:
  /slots add <id> <label> [instruction...]  Add or update slot in active mode
  /slots rm <id>                            Remove slot by ID
  /slots toggle <id>                        Toggle enabled state
  /slots reset                              Reset active mode slots to defaults`;
      ctx.ui.notify(`${header}${body}${cliHelp}`, "info");
      return;
    }
    if (subCmd === "reset") {
      const factoryDefaults = getDefaultFactoryModes(state.sourceLang, disk.explainLang);
      const matchDefault = factoryDefaults.find((m) => m.id === activeMode.id);
      if (matchDefault) {
        activeMode.slots = [...matchDefault.slots];
      } else {
        activeMode.slots = defaultSlotsForMode(activeMode, state.sourceLang, disk.explainLang);
      }
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Reset slots for mode [${activeMode.name}] to clean defaults.`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "hide-source" || subCmd === "no-source") {
      activeMode.slots = activeMode.slots.filter((s) => s.id !== "source");
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Hidden [source] row in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "show-source" || subCmd === "with-source") {
      const hasSource = (activeMode.slots || []).some((s) => s.id === "source");
      if (!hasSource) {
        activeMode.slots = [
          { id: "source", label: lbl.sourceLabel || "Original", role: "rewrite", instruction: "Source text", enabled: true },
          ...activeMode.slots || []
        ];
      } else {
        activeMode.slots = (activeMode.slots || []).map((s) => s.id === "source" ? { ...s, enabled: true } : s);
      }
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Restored [source] row in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageRm || "Usage: /slots rm <slot-id>", "warning");
        return;
      }
      const existing = (activeMode.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", pair).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      activeMode.slots = activeMode.slots.filter((s) => s.id.toLowerCase() !== targetId);
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      ctx.ui.notify(`[${pair}] Removed slot [${targetId}] ("${existing.label}") from mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "toggle") {
      const targetId = (parts[1] || "").toLowerCase();
      if (!targetId) {
        ctx.ui.notify(lbl.slotsUsageToggle || "Usage: /slots toggle <slot-id>", "warning");
        return;
      }
      const existing = (activeMode.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", pair).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      activeMode.slots = activeMode.slots.map(
        (s) => s.id.toLowerCase() === targetId ? { ...s, enabled: s.enabled === false } : s
      );
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      const updated = activeMode.slots.find((s) => s.id.toLowerCase() === targetId);
      const statusText = updated?.enabled !== false ? lbl.slotsStatusEnabled || "enabled" : lbl.slotsStatusDisabled || "disabled";
      ctx.ui.notify(`[${pair}] Slot [${targetId}] is now ${statusText} in mode [${activeMode.name}].`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    if (subCmd === "add") {
      const id = (parts[1] || "").toLowerCase();
      const label = parts[2];
      const instruction = parts.slice(3).join(" ");
      if (!id || !label) {
        ctx.ui.notify(lbl.slotsUsageAdd || "Usage: /slots add <id> <label> [instruction...]", "warning");
        return;
      }
      const newPromptSlot = {
        id,
        label,
        role: id === "vocab" || id === "fixes" ? "vocab" : "rewrite",
        instruction: instruction || `Target Language: \${targetLang}. Output in \${targetLang} ONLY: Generate output matching "${label}" style without summarizing.`,
        enabled: true
      };
      const existingIdx = activeMode.slots.findIndex((s) => s.id.toLowerCase() === id);
      if (existingIdx >= 0) {
        activeMode.slots[existingIdx] = newPromptSlot;
      } else {
        activeMode.slots.push(newPromptSlot);
      }
      let hudUpgraded = false;
      const enabledTranslationCount = activeMode.slots.filter(
        (s) => s.enabled !== false && s.role !== "vocab" && s.id !== "source"
      ).length;
      if (activeMode.hud === "preview" && enabledTranslationCount > 1) {
        activeMode.hud = "tree";
        hudUpgraded = true;
      }
      state.modes = currentModes;
      saveUserLingualConfig({ modes: currentModes });
      globalLingualCache.clear();
      const upgradeHint = hudUpgraded ? ` (HUD layout auto-upgraded to "tree" for multi-slot visibility)` : "";
      ctx.ui.notify(`[${pair}] Added/updated slot [${id}] "${label}" in mode [${activeMode.name}]${upgradeHint}.`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    const matchedPreset = SLOT_PRESETS[subCmd];
    if (matchedPreset) {
      state.slotPreset = subCmd;
      state.slots = resolveSlotsForPreset(subCmd, state.sourceLang);
      saveUserLingualConfig({ slotPreset: subCmd === "developer" ? void 0 : subCmd, slots: state.slots });
      globalLingualCache.clear();
      ctx.ui.notify(`[lingual] applied preset [${subCmd}]: ${matchedPreset.description}`, "info");
      updateFooter(ctx);
      refreshActiveView(ctx);
      return;
    }
    const unknownTpl = lbl.slotsUnknown || 'Unknown slot command or preset "{cmd}".';
    ctx.ui.notify(unknownTpl.replace("{pair}", lbl.hudTitle).replace("{cmd}", subCmd), "warning");
  };
  const showStatusHandler = async (_args, ctx) => {
    const followDesc = state.labels.modelFollowSession || "follow session";
    const activeModel = state.selectedModel === "auto" ? ctx.model ? `auto (${followDesc}: ${ctx.model.provider}/${ctx.model.id})` : "auto" : state.selectedModel || "auto";
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(loadUserLingualConfig());
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const diskCfg = loadUserLingualConfig();
    const activeEffort = activeMode.reasoning || diskCfg.reasoning || "low";
    const statusMsg = formatStatusReport(state.labels, {
      mode: state.mode,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      activeModel,
      layout: state.compact ? "capsule" : "tree",
      cacheStats: globalLingualCache.getStats()
    }) + `
\u2022 Active Mode: [${activeMode.name}] (${activeMode.id}) \xB7 flow: ${activeMode.flow} \xB7 action: ${activeMode.action}
\u2022 Dynamic Slots: [${(activeMode.slots || []).filter((s) => s.enabled !== false).map((s) => s.label).join(", ")}]
\u2022 Reasoning Effort: ${activeEffort} (mode: ${activeMode.reasoning || "default"}, global: ${diskCfg.reasoning || "low"})`;
    ctx.ui.notify(statusMsg, "info");
  };
  const showLastHandler = async (_args, ctx) => {
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
      return;
    }
    const last = session.getLastResult();
    if (!last) {
      try {
        ctx.ui.notify("[lingual] no previous card", "info");
      } catch {
      }
      return;
    }
    renderHudWidget(
      ctx,
      last.sourceText,
      last.spoken,
      last.written,
      last.vocab,
      last.spokenMeaning,
      last.writtenMeaning,
      void 0,
      last.slotOutputs,
      last.slots
    );
  };
  const manageModesHandler = async (args, ctx) => {
    const trimmed = args.trim();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
    const pair = state.labels.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`;
    if (!trimmed || trimmed === "list") {
      const modeLines = currentModes.map((m, idx) => {
        const status = m.enabled !== false ? "[\u2713]" : "[x]";
        const isCurrent = m.id === state.mode || m.id === state.activeModeId ? " \u25B8" : "  ";
        const reasoningTag = `[${m.reasoning || "low"}]`;
        return `${isCurrent} [${idx + 1}] ${m.id} (${m.name}) ${reasoningTag} \xB7 flow: ${m.flow} \xB7 action: ${m.action} \xB7 hud: ${m.hud} \xB7 ${m.slots?.length || 0} slots ${status}`;
      });
      const report = `\u2726 [pi-lingual Modes Registry] (Current: ${state.mode})
` + modeLines.join("\n") + `

Usage: /lingual mode [list | add <id> <name> [flow] [action] [hud] | rm <id> | toggle <id> | reset]`;
      ctx.ui.notify(report, "info");
      return;
    }
    const parts = trimmed.split(/\s+/);
    const subCmd = parts[0].toLowerCase();
    const id = parts[1]?.toLowerCase();
    if (subCmd === "reset") {
      const defaults = getDefaultFactoryModes(state.sourceLang, disk.explainLang);
      state.modes = defaults;
      saveUserLingualConfig({ modes: defaults });
      ctx.ui.notify(`[${pair}] Reset modes registry to factory golden defaults (${defaults.map((m) => m.name).join(" & ")})`, "info");
      updateFooter(ctx);
      return;
    }
    if (subCmd === "rm" || subCmd === "remove" || subCmd === "del" || subCmd === "delete") {
      if (!id) {
        ctx.ui.notify(`[${pair}] Missing mode ID. Usage: /lingual mode rm <id>`, "warning");
        return;
      }
      const updated = removeCustomMode(currentModes, id);
      if (updated.length === currentModes.length) {
        ctx.ui.notify(`[${pair}] Mode [${id}] not found in modes registry.`, "warning");
        return;
      }
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      ctx.ui.notify(`[${pair}] Removed custom mode [${id}] from registry.`, "info");
      updateFooter(ctx);
      return;
    }
    if (subCmd === "toggle") {
      if (!id) {
        ctx.ui.notify(`[${pair}] Missing mode ID. Usage: /lingual mode toggle <id>`, "warning");
        return;
      }
      const updated = toggleCustomMode(currentModes, id);
      const target = updated.find((m) => m.id === id);
      if (!target) {
        ctx.ui.notify(`[${pair}] Mode [${id}] not found in modes registry.`, "warning");
        return;
      }
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      ctx.ui.notify(`[${pair}] Mode [${id}] is now ${target.enabled ? "enabled [\u2713]" : "disabled [x]"}.`, "info");
      updateFooter(ctx);
      return;
    }
    if (subCmd === "add") {
      if (!id || !parts[2]) {
        ctx.ui.notify(`[${pair}] Missing arguments. Usage: /lingual mode add <id> <name> [flow] [action] [hud]`, "warning");
        return;
      }
      const name = parts[2];
      const flow = parts[3] || "translate";
      const action = parts[4] || "transform";
      const hud = parts[5] || "preview";
      const customInstruction = parts.slice(6).join(" ").trim();
      const newMode = {
        id,
        name,
        flow: flow === "proofread" || flow === "custom" ? flow : "translate",
        action: action === "pass-through" || action === "select" ? action : "transform",
        hud: hud === "tree" || hud === "adaptive-takeaway" || hud === "none" ? hud : "preview",
        slots: action === "select" ? getDefaultPromptSlots(state.sourceLang) : [
          {
            id: `${id}_slot`,
            label: name,
            role: "rewrite",
            instruction: customInstruction || `Translate and polish from \${sourceLang} into \${targetLang} matching ${name} style.`,
            enabled: true
          }
        ],
        enabled: true
      };
      const updated = addCustomMode(currentModes, newMode);
      state.modes = updated;
      saveUserLingualConfig({ modes: updated });
      ctx.ui.notify(`[${pair}] Added custom mode [${id}] "${name}" to registry.`, "info");
      updateFooter(ctx);
      return;
    }
    ctx.ui.notify(`[${pair}] Unknown mode subcommand "${subCmd}". Usage: /lingual mode [list|add|rm|toggle|reset]`, "warning");
  };
  const manageLoadoutsHandler = async (args, ctx) => {
    const trimmed = args.trim();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
    const pair = state.labels.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`;
    const loadouts = listPresetLoadouts();
    if (!trimmed || trimmed === "list" || trimmed === "ls") {
      const lines = loadouts.map((l, idx) => {
        const isInstalled = currentModes.some((m) => m.id === l.id);
        const status = isInstalled ? "[installed \u2713]" : "[available]";
        return `  ${idx + 1}. [${l.id}] ${l.name} - ${l.description} ${status}`;
      });
      const report = `\u2726 [pi-lingual Tactical Loadouts]
` + lines.join("\n") + `

Usage: /lingual loadout [list | apply <id>] (e.g. /lingual loadout apply spec)`;
      ctx.ui.notify(report, "info");
      return;
    }
    const parts = trimmed.split(/\s+/);
    const subCmd = parts[0].toLowerCase();
    const targetId = (subCmd === "apply" || subCmd === "add" ? parts[1] : subCmd)?.toLowerCase();
    if (!targetId) {
      ctx.ui.notify(`[${pair}] Missing loadout ID. Usage: /lingual loadout apply <spec|commit|oss|yap>`, "warning");
      return;
    }
    const loadoutConfig = getPresetLoadout(targetId, state.sourceLang, disk.explainLang);
    if (!loadoutConfig) {
      ctx.ui.notify(
        `[${pair}] Loadout [${targetId}] not found. Available: ${loadouts.map((l) => l.id).join(", ")}`,
        "warning"
      );
      return;
    }
    const updated = addCustomMode(currentModes, loadoutConfig);
    state.modes = updated;
    saveUserLingualConfig({ modes: updated });
    ctx.ui.notify(
      `[${pair}] Applied tactical loadout [${loadoutConfig.id}] "${loadoutConfig.name}" to active modes! Run /lingual ${loadoutConfig.id} to activate.`,
      "info"
    );
    updateFooter(ctx);
  };
  const showAgentGuideHandler = async (_args, ctx) => {
    const guide = `  pi-lingual Customization Map          Legend: ( ) Edit  (+) Add/Remove  [\u2713] Toggle
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  [Mode 1 \xB7 Companion]  Send raw text in 0ms, show learning card above editor
    \xB7 Source Row                                                        [\u2713] Show/Hide
    \u251C (Label) : (Language) \xB7 (Style: Spoken / Written / Paper / Script) (+) N Rows
    \u2502   \u21B3 Native Nuance Sub-line                                        [\u2713] On/Off
    \u2514 Vocab Row : (Focus: Idioms / Exam Collocations)                   [\u2713] On/Off

  [Mode 2 \xB7 Direct]     Convert 1-to-1 on Enter using a single dedicated rule
    \u251C (Label) : (Language) \xB7 (Style: Faithful Direct / Keigo / Spec)    1-to-1 Rule
    \u2514 Vocab Row : Extract 1-line key expressions                        [\u2713] On/Off

  [Mode 3 \xB7 Candidates] Generate N options, press keys 1..N to send (0 for raw)
    \xB7 Source Row                                                        [\u2713] Show/Hide
    \u251C 1..N (Label) : (Language) \xB7 (Style: Business / Keigo / PR)        (+) N Options
    \u2514 Vocab Row : Extract 1-line key expressions                        [\u2713] On/Off
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Run /lingual tuner [request] to launch the adaptive wizard in your native language (${state.sourceLang}).`;
    ctx.ui.notify(guide, "info");
  };
  const setReasoningHandler = async (args, ctx) => {
    const trimmed = args.trim().toLowerCase();
    const disk = loadUserLingualConfig();
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(disk);
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId || disk.activeModeId },
      currentModes
    );
    const activeMode = currentModes.find((m) => m.id === activeModeId) || currentModes[0];
    const pair = state.labels.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`;
    if (!trimmed) {
      const activeEffort = activeMode.reasoning || disk.reasoning || "low";
      const globalEffort = disk.reasoning || "low";
      ctx.ui.notify(
        `[${pair}] Reasoning effort: mode [${activeMode.name}] = "${activeEffort}" \xB7 global = "${globalEffort}". Usage: /lingual reasoning <low|medium|high>`,
        "info"
      );
      return;
    }
    if (trimmed !== "low" && trimmed !== "medium" && trimmed !== "high") {
      ctx.ui.notify(
        `[${pair}] Invalid reasoning effort "${trimmed}". Available options: low, medium, high.`,
        "warning"
      );
      return;
    }
    const newEffort = trimmed;
    const updatedModes = currentModes.map(
      (m) => m.id === activeMode.id ? { ...m, reasoning: newEffort } : m
    );
    state.modes = updatedModes;
    saveUserLingualConfig({ modes: updatedModes, reasoning: newEffort });
    ctx.ui.notify(
      `[${pair}] Reasoning effort for mode [${activeMode.name}] set to "${newEffort}".`,
      "info"
    );
    updateFooter(ctx);
  };
  const openModePicker = async (ctx) => {
    const diskForMode = loadUserLingualConfig();
    const diskMode = diskForMode.activeModeId || diskForMode.mode;
    if (diskMode && diskMode !== state.mode) {
      state.mode = normalizeActiveModeId({ mode: diskMode, activeModeId: diskMode }, state.modes);
      state.activeModeId = state.mode;
    }
    const modes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(diskForMode, state.sourceLang);
    const activeModes = modes.filter((m) => m.enabled !== false);
    const offName = resolveModeDisplayName("off", state.sourceLang);
    const lockIndicator = state.modeLocked ? state.sourceLang === "zh" ? " \xB7 \u9501\u5B9A" : state.sourceLang === "tw" ? " \xB7 \u9396\u5B9A" : state.sourceLang === "ja" ? " \xB7 \u30ED\u30C3\u30AF" : state.sourceLang === "ko" ? " \xB7 \uC7A0\uAE40" : state.sourceLang === "es" ? " \xB7 Bloqueado" : state.sourceLang === "fr" ? " \xB7 Verrouill\xE9" : state.sourceLang === "de" ? " \xB7 Gesperrt" : state.sourceLang === "ru" ? " \xB7 \u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E" : " \xB7 Locked" : "";
    const pair = `${state.labels.hudTitle || `${state.sourceLang} \u21C4 ${state.targetLang}`}${lockIndicator}`;
    const title = state.labels.modePickerTitle || "Mode Switch";
    const hint = state.labels.modePickerHint || "Press 1/2/3/0 to switch, Esc to cancel";
    const options = activeModes.map((m, idx) => ({
      num: idx + 1,
      id: m.id,
      name: localizeModeName(m.id, m.name, state.sourceLang),
      englishTag: state.sourceLang === "en" ? void 0 : m.id === "companion" ? "Companion" : m.id === "direct" ? "Logical Spec" : m.id === "live-flow" ? "Live Flow" : void 0
    }));
    options.push({
      num: 0,
      id: "off",
      name: offName,
      englishTag: "Off"
    });
    const currentModeId = state.mode === "off" ? "off" : state.activeModeId || state.mode || options[0].id;
    let initialIndex = options.findIndex((o) => o.id === currentModeId);
    if (initialIndex === -1) initialIndex = 0;
    if (hasActiveUI(ctx) && typeof ctx.ui.custom === "function") {
      try {
        const chosen = await ctx.ui.custom(
          (tui, theme, _kb, done) => {
            let selectedIndex = initialIndex;
            let finished = false;
            const finish = (val) => {
              if (finished) return;
              finished = true;
              done(val);
            };
            return {
              render(width) {
                try {
                  return formatModePickerLines(
                    title,
                    hint,
                    pair,
                    options,
                    selectedIndex,
                    width,
                    theme
                  );
                } catch {
                  return formatModePickerLines(
                    title,
                    hint,
                    pair,
                    options,
                    selectedIndex,
                    width
                  );
                }
              },
              invalidate() {
              },
              handleInput(data) {
                if (data.startsWith("\x1B[<") || data.startsWith("\x1B[M") || data.startsWith("\x1B[200~")) {
                  return;
                }
                if (data === "0") {
                  finish("off");
                  return;
                }
                const num = parseInt(data, 10);
                if (!isNaN(num) && num >= 1 && num <= activeModes.length) {
                  finish(activeModes[num - 1].id);
                  return;
                }
                if (data === "\x1B" || data === "q" || data === "") {
                  finish(null);
                  return;
                }
                if (data === "\x1B[C" || data === "\x1B[B" || data === "l" || data === "j" || data === "	") {
                  selectedIndex = (selectedIndex + 1) % options.length;
                  tui?.requestRender?.();
                  return;
                }
                if (data === "\x1B[D" || data === "\x1B[A" || data === "h" || data === "k") {
                  selectedIndex = (selectedIndex - 1 + options.length) % options.length;
                  tui?.requestRender?.();
                  return;
                }
                if (data === "\r" || data === "\n" || data === "\r\n" || data === " ") {
                  finish(options[selectedIndex]?.id || null);
                  return;
                }
              }
            };
          }
        );
        if (chosen !== null && chosen !== void 0) {
          await setModeHandler(chosen, ctx);
          return chosen;
        }
        return null;
      } catch {
      }
    }
    if (hasActiveUI(ctx) && typeof ctx.ui.select === "function") {
      try {
        const selectItems = options.map((opt) => ({
          label: `[${opt.num}] ${opt.name}${opt.englishTag ? ` (${opt.englishTag})` : ""}`,
          value: opt.id
        }));
        const chosen = await ctx.ui.select(
          `[lingual \xB7 ${pair}] ${title} (${hint})`,
          selectItems
        );
        if (chosen) {
          await setModeHandler(chosen, ctx);
          return chosen;
        }
        return null;
      } catch {
      }
    }
    await setModeHandler("", ctx);
    return null;
  };
  const masterCommandHandler = async (args, ctx) => {
    const diskForMode = loadUserLingualConfig();
    const diskMode = diskForMode.activeModeId || diskForMode.mode;
    if (diskMode && diskMode !== state.mode) {
      state.mode = normalizeActiveModeId({ mode: diskMode, activeModeId: diskMode }, state.modes);
      state.activeModeId = state.mode;
      syncResizeListener();
      updateFooter(ctx);
    }
    const trimmed = args?.trim();
    if (!trimmed) {
      try {
        await openModePicker(ctx);
      } catch {
        try {
          await setModeHandler("", ctx);
        } catch {
        }
      }
      return;
    }
    const lower = trimmed.toLowerCase();
    const spaceIndex = lower.indexOf(" ");
    const sub = spaceIndex === -1 ? lower : lower.slice(0, spaceIndex);
    const subArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();
    if (sub === "on") {
      await setModeHandler("1", ctx);
      return;
    }
    if (sub === "off") {
      await setModeHandler("0", ctx);
      return;
    }
    if (sub === "reasoning" || sub === "effort") {
      await setReasoningHandler(subArgs, ctx);
      return;
    }
    if (sub === "mode" || sub === "modes") {
      await manageModesHandler(subArgs, ctx);
      return;
    }
    if (sub === "loadout" || sub === "loadouts" || sub === "preset" || sub === "presets") {
      await manageLoadoutsHandler(subArgs, ctx);
      return;
    }
    if (sub === "lang" || sub === "language") {
      await switchLangHandler(subArgs, ctx);
      return;
    }
    if (sub === "slots" || sub === "slot" || sub === "preset") {
      await switchSlotsHandler(subArgs, ctx);
      return;
    }
    if (sub === "hide-source" || sub === "no-source" || sub === "show-source" || sub === "with-source") {
      await switchSlotsHandler(sub, ctx);
      return;
    }
    if (sub === "model") {
      await setModelHandler(subArgs, ctx);
      return;
    }
    if (sub === "compact" || sub === "capsule" || sub === "layout") {
      await toggleCompactHandler(subArgs, ctx);
      return;
    }
    if (sub === "status" || sub === "info" || sub === "report") {
      await showStatusHandler(subArgs, ctx);
      return;
    }
    if (sub === "last" || sub === "prev" || sub === "history" || sub === "replay") {
      await showLastHandler(subArgs, ctx);
      return;
    }
    if (sub === "tuner" || sub === "tune" || sub === "agent" || sub === "help" || sub === "?") {
      tunerArmed = true;
      const promptBody = subArgs ? `[lingual-tuner] Load the lingual-tuner skill and update ~/.pi/agent/lingual.json (user native language sourceLang="${state.sourceLang}"). Communicate strictly in the user's native language (${state.sourceLang}) and apply: ${subArgs}` : `[lingual-tuner] Load the lingual-tuner skill and launch the interactive customization wizard (user native language sourceLang="${state.sourceLang}"). Render the Customization Map and all questions/options strictly in the user's native language (${state.sourceLang}).`;
      if ((sub === "tuner" || sub === "tune" || subArgs) && typeof pi.sendMessage === "function") {
        pi.sendMessage(
          { customType: "lingual-tuner", content: promptBody, display: false },
          { triggerTurn: true }
        );
        return;
      }
      if ((sub === "tuner" || sub === "tune" || subArgs) && typeof pi.sendUserMessage === "function") {
        pi.sendUserMessage(promptBody);
        return;
      }
      await showAgentGuideHandler(subArgs, ctx);
      return;
    }
    if (sub === "news" || sub === "whatsnew" || sub === "changelog") {
      const diskCfg = loadUserLingualConfig();
      renderReleaseBanner(ctx, diskCfg.sourceLang || state.sourceLang);
      return;
    }
    if (sub === "lock") {
      state.modeLocked = true;
      saveUserLingualConfig({ modeLocked: true });
      const activeObj = state.modes.find((m) => m.id === state.mode);
      const currentName = activeObj ? activeObj.name : state.mode;
      try {
        ctx.ui.notify(`[lingual] mode locked to [${currentName}]`, "info");
      } catch {
      }
      updateFooter(ctx);
      return;
    }
    if (sub === "unlock") {
      state.modeLocked = false;
      saveUserLingualConfig({ modeLocked: false });
      try {
        ctx.ui.notify("[lingual] mode unlocked", "info");
      } catch {
      }
      updateFooter(ctx);
      return;
    }
    const currentModes = Array.isArray(state.modes) && state.modes.length > 0 ? state.modes : resolveModesFromConfig(loadUserLingualConfig(), state.sourceLang);
    const isMatchedMode = currentModes.some((m) => {
      const idMatch = m.id.toLowerCase() === sub || m.id.toLowerCase() === lower;
      const nameMatch = m.name.toLowerCase() === sub || m.name.toLowerCase() === lower;
      const aliasMatch = Array.isArray(m.aliases) && m.aliases.some((a) => a.toLowerCase() === sub || a.toLowerCase() === lower);
      const locName = resolveModeDisplayName(m.id, state.sourceLang).toLowerCase();
      const locMatch = locName === sub || locName === lower;
      const specMatch = m.id === "direct" && (sub === "spec" || lower === "spec" || lower === "logical spec" || lower === "specification" || lower === "direct spec");
      const compMatch = m.id === "companion" && (sub === "companion" || lower === "companion" || lower === "companion mode" || lower === "original");
      const flowMatch = m.id === "live-flow" && (sub === "flow" || lower === "flow" || lower === "live flow" || lower === "live" || lower === "modify" || lower === "raw");
      return idMatch || nameMatch || aliasMatch || locMatch || specMatch || compMatch || flowMatch;
    });
    const numIdx = parseInt(sub, 10);
    const isNum = !isNaN(numIdx) && String(numIdx) === sub;
    const isKnownMode = sub === "mode" || isMatchedMode || isNum && numIdx >= 0 && numIdx <= currentModes.length || normalizeLingualModeInput(sub) !== null || normalizeLingualModeInput(lower) !== null;
    if (isKnownMode) {
      await setModeHandler(sub === "mode" ? subArgs : trimmed, ctx);
      return;
    }
    const possibleLang = normalizeLangCode(sub);
    if (LANGUAGE_PRESETS[possibleLang]) {
      await switchLangHandler(trimmed, ctx);
      return;
    }
    try {
      ctx.ui.notify(`[lingual] unknown: "${trimmed}". run /lingual for help`, "warning");
    } catch {
    }
  };
  pi.registerCommand("lingual", {
    description: state.labels.cmdDescMode || "Interactive mode picker or manage: /lingual [1|2|3|0|on|off|lang|last|lock|status]",
    handler: masterCommandHandler
  });
  pi.registerCommand("l", {
    description: "Alias for /lingual",
    handler: masterCommandHandler
  });
  pi.registerCommand("lang", {
    description: "Switch companion language (alias for /lingual lang): /lang <pair>",
    handler: switchLangHandler
  });
  if (typeof pi.registerShortcut === "function") {
    pi.registerShortcut("alt+.", {
      description: state.labels.shortcutNextPage || "Switch to next companion segment",
      handler: async (ctx) => {
        if (state.mode === "off") return;
        if (session.nextPage()) {
          renderActiveCard(ctx);
        }
      }
    });
    pi.registerShortcut("alt+,", {
      description: state.labels.shortcutPrevPage || "Switch to previous companion segment",
      handler: async (ctx) => {
        if (state.mode === "off") return;
        if (session.prevPage()) {
          renderActiveCard(ctx);
        }
      }
    });
  }
  const createModelCompleter = (ctx, defaultOpts) => {
    return async (text, systemPrompt, signal, callOpts) => {
      try {
        if (!ctx.modelRegistry) return null;
        let targetModel = ctx.model;
        if (state.selectedModel && state.selectedModel !== "auto") {
          const available = ctx.modelRegistry.getAvailable?.() || [];
          const match = available.find(
            (m) => m.id === state.selectedModel || `${m.provider}/${m.id}` === state.selectedModel || m.id.toLowerCase().includes(state.selectedModel.toLowerCase())
          );
          if (match) targetModel = match;
        }
        if (!targetModel) return null;
        const diskConfig = loadUserLingualConfig();
        const effectiveReasoning = callOpts?.reasoning || defaultOpts?.reasoning || diskConfig.reasoning || "low";
        const requestOptions = {
          maxTokens: 1500,
          reasoning: effectiveReasoning
        };
        const stream = ctx.modelRegistry.streamSimple(
          targetModel,
          {
            systemPrompt,
            messages: [
              {
                role: "user",
                content: [{ type: "text", text }],
                timestamp: Date.now()
              }
            ]
          },
          requestOptions
        );
        const timeoutMs = diskConfig.timeoutMs || 15e3;
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error("Lingual translation timed out")), timeoutMs);
        });
        let abortListener;
        const abortPromise = new Promise((_, reject) => {
          if (signal?.aborted) {
            reject(new Error("Lingual translation aborted"));
            return;
          }
          abortListener = () => reject(new Error("Lingual translation aborted"));
          signal?.addEventListener("abort", abortListener, { once: true });
        });
        let res;
        try {
          res = await Promise.race([stream.result(), timeoutPromise, abortPromise]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (signal && abortListener) {
            signal.removeEventListener("abort", abortListener);
          }
        }
        if (!res) return null;
        const content = res.content?.filter((c) => c.type === "text")?.map((c) => c.text)?.join("");
        return content && content.trim() ? content.trim() : null;
      } catch {
        return null;
      }
    };
  };
  pi.on("input", async (event, ctx) => {
    lastRawInputText = event?.text || "";
    if (showingReleaseBanner) {
      showingReleaseBanner = false;
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
      }
    }
    if (event.source === "extension") return { action: "continue" };
    const latestDisk = loadUserLingualConfig();
    let footerNeedsRefresh = false;
    if (latestDisk.sourceLang && latestDisk.sourceLang !== state.sourceLang) {
      state.sourceLang = latestDisk.sourceLang;
      footerNeedsRefresh = true;
    }
    if (latestDisk.targetLang && latestDisk.targetLang !== state.targetLang) {
      state.targetLang = latestDisk.targetLang;
      footerNeedsRefresh = true;
    }
    if (footerNeedsRefresh) {
      state.labels = resolveLabelsForLang(state.sourceLang, latestDisk.labels, state.targetLang);
    }
    if (latestDisk.modeLocked !== void 0 && latestDisk.modeLocked !== state.modeLocked) {
      state.modeLocked = latestDisk.modeLocked;
    }
    if (Array.isArray(latestDisk.modes) && latestDisk.modes.length > 0) {
      state.modes = latestDisk.modes;
    } else if (!state.modes || state.modes.length === 0) {
      state.modes = resolveModesFromConfig(latestDisk);
    }
    const rawDiskMode = latestDisk.activeModeId || latestDisk.mode;
    if (rawDiskMode && rawDiskMode !== state.mode) {
      state.mode = normalizeActiveModeId({ mode: rawDiskMode, activeModeId: rawDiskMode }, state.modes);
      state.activeModeId = state.mode;
      syncResizeListener();
      footerNeedsRefresh = true;
    }
    if (footerNeedsRefresh && hasActiveUI(ctx)) {
      updateFooter(ctx);
    }
    if (state.mode === "off") return { action: "continue" };
    const raw = event.text.trim();
    if (!raw) return { action: "continue" };
    if (!latestDisk.sourceLang && state.sourceLang === "en" && (state.mode === "companion" || state.mode === "original")) {
      const detected = detectScriptLanguage(raw);
      if (detected && detected !== "en") {
        state.sourceLang = detected;
        state.targetLang = "en";
        state.labels = resolveLabelsForLang(state.sourceLang, void 0, state.targetLang);
        const isFactory = state.modes.length === 3 && state.modes.every((m) => ["companion", "direct", "live-flow"].includes(m.id));
        if (isFactory) {
          state.modes = getDefaultFactoryModes(state.sourceLang, state.targetLang);
        }
        saveUserLingualConfig({ sourceLang: state.sourceLang, targetLang: state.targetLang });
        if (hasActiveUI(ctx)) {
          updateFooter(ctx);
        }
      }
    }
    if (raw.startsWith("/") || raw.startsWith("!")) {
      clearPendingTimers();
      session.abortActive();
      if (hasActiveUI(ctx)) {
        updateFooter(ctx);
      }
      return { action: "continue" };
    }
    const sanitized = sanitizePromptForTranslation(raw);
    const promptToTranslate = sanitized.distilledText;
    const latestModes = state.modes;
    const activeModeId = normalizeActiveModeId(
      { mode: state.mode, activeModeId: state.activeModeId || latestDisk.activeModeId },
      latestModes
    );
    const currentMode = latestModes.find((m) => m.id === activeModeId) || latestModes[0];
    const isPromptOptMode = currentMode ? currentMode.action !== "pass-through" : state.mode !== "original" && state.mode !== "off";
    const isTargetInput = isTargetLanguageOnly(promptToTranslate, state.sourceLang, state.targetLang);
    if (isTargetInput) {
      if (!isPromptOptMode || currentMode.action === "pass-through") {
        clearPendingTimers();
        session.abortActive();
        session.clearPagination();
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `[${state.targetLang} \xB7 direct]`));
        }
        return { action: "continue" };
      }
      if (currentMode.id === "direct" || currentMode.action === "transform" && currentMode.flow === "translate") {
        if (isImperativeEngineeringPrompt(promptToTranslate)) {
          clearPendingTimers();
          session.abortActive();
          session.clearPagination();
          if (hasActiveUI(ctx)) {
            safeClearWidget(ctx);
            ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `[${state.targetLang} \xB7 spec ok]`));
          }
          return { action: "continue" };
        }
      }
    }
    if (!sanitized.hasNaturalLanguage || !shouldTriggerTranslation(promptToTranslate, state.sourceLang, isPromptOptMode)) {
      clearPendingTimers();
      session.abortActive();
      session.clearPagination();
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        updateFooter(ctx);
      }
      return { action: "continue" };
    }
    lastContext = ctx;
    const { generation, signal } = session.beginRequest();
    const resolvedReasoning = currentMode.reasoning ?? latestDisk.reasoning ?? "low";
    const completer = createModelCompleter(ctx, { reasoning: resolvedReasoning });
    session.initPagination(1);
    const isOriginalMode = state.mode === "original" || state.mode === "companion" || currentMode?.action === "pass-through";
    if (isOriginalMode) {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget("lingual_hud", void 0);
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "\u21C4 [lingual] polishing..."));
        } catch {
        }
      }
      clearTimeout(polishTimer);
      polishTimer = setTimeout(() => {
        polishTimer = void 0;
        if (!session.isLatest(generation) || !isOriginalMode && signal.aborted) {
          return;
        }
        const passThroughSlots = currentMode && Array.isArray(currentMode.slots) && currentMode.slots.length > 0 && currentMode.id !== "companion" ? currentMode.slots.map((s) => ({
          id: s.id,
          label: s.label,
          role: s.role === "vocab" ? "vocab" : s.id === "source" ? "source" : "translation",
          instruction: s.instruction,
          showMeaning: true,
          enabled: s.enabled !== false
        })) : state.slots;
        translatePrompt(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          labels: state.labels,
          slots: passThroughSlots,
          slotPreset: state.slotPreset,
          complete: completer,
          signal,
          context: extractRecentContextAnchor(ctx)
        }).then((result) => {
          if (!session.isLatest(generation) || signal.aborted) {
            return;
          }
          if (currentMode.hud === "none") {
            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
            safeClearWidget(activeCtx);
            return;
          }
          if (result) {
            session.setPageResult(0, result, generation);
            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
            if (activeCtx) {
              renderHudWidget(
                activeCtx,
                result.sourceText,
                result.spoken,
                result.written,
                result.vocab,
                result.spokenMeaning,
                result.writtenMeaning,
                void 0,
                result.slotOutputs,
                result.slots
              );
            }
          }
        }).catch(() => {
        }).finally(() => {
          if (session.isLatest(generation)) {
            const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
            if (activeCtx) {
              updateFooter(activeCtx);
            }
          }
        });
      }, 80);
      return { action: "continue" };
    }
    const isSelectMode = state.mode === "select" || state.mode === "candidates" || currentMode.action === "select";
    const isModifyMode = !isSelectMode && (state.mode === "modify" || state.mode === "live-flow" || currentMode.flow === "proofread");
    const isDirectMode = !isSelectMode && !isModifyMode && (state.mode === "english" || state.mode === "direct" || currentMode.action === "transform");
    const isolatedModeSlots = isModifyMode ? resolveModifySlotsFromConfig({
      sourceLang: state.sourceLang,
      explainLang: latestDisk.explainLang,
      modifySlots: latestDisk.modifySlots ?? state.modifySlots
    }) : isDirectMode ? resolveDirectSlotsFromConfig({
      sourceLang: state.sourceLang,
      directSlots: latestDisk.directSlots ?? state.directSlots
    }) : resolveCandidateSlotsFromConfig({
      sourceLang: state.sourceLang,
      promptSlots: latestDisk.promptSlots ?? state.promptSlots
    });
    const rewriteSlots = isolatedModeSlots.filter((s) => s.role !== "vocab");
    const vocabSlots = isolatedModeSlots.filter((s) => s.role === "vocab");
    const fallbackFirst = isModifyMode ? getDefaultModifySlots(state.sourceLang, latestDisk.explainLang)[0] : getDefaultDirectSlots(state.sourceLang)[0];
    const hasExplicitLegacySlots = isModifyMode ? Array.isArray(latestDisk.modifySlots) && latestDisk.modifySlots.length > 0 : isDirectMode ? Array.isArray(latestDisk.directSlots) && latestDisk.directSlots.length > 0 : Array.isArray(latestDisk.promptSlots) && latestDisk.promptSlots.length > 0;
    const slotsToRun = isSelectMode ? currentMode.action === "select" && currentMode.slots && currentMode.slots.length > 0 ? currentMode.slots : [...rewriteSlots.length > 0 ? rewriteSlots : getDefaultPromptSlots(state.sourceLang), ...vocabSlots] : isModifyMode ? currentMode.flow === "proofread" && currentMode.slots && currentMode.slots.length > 0 ? currentMode.slots : isolatedModeSlots.length > 0 ? isolatedModeSlots : getDefaultModifySlots(state.sourceLang, latestDisk.explainLang) : isDirectMode ? currentMode.action === "transform" && currentMode.flow === "translate" && currentMode.slots && currentMode.slots.length > 0 ? currentMode.slots : [rewriteSlots[0] || fallbackFirst, ...vocabSlots] : currentMode.slots && currentMode.slots.length > 0 ? currentMode.slots : getDefaultPromptSlots(state.sourceLang);
    if (hasActiveUI(ctx) && currentMode.hud !== "none") {
      try {
        const rawLoadingMsg = isModifyMode ? state.labels.loadingFixSyntax || "  \u22EF [lingual] fixing syntax & typos..." : isDirectMode ? state.labels.loadingOptimizePrompt || "  \u22EF [lingual] optimizing prompt..." : state.labels.loadingCandidates || "  \u22EF [lingual] generating prompt candidates...";
        const loadingMsg = formatLoadingMessage(rawLoadingMsg);
        ctx.ui.setWidget("lingual_hud", [ctx.ui.theme.fg("muted", loadingMsg)], { placement: "aboveEditor" });
        ctx.ui.setStatus(
          "lingual",
          ctx.ui.theme.fg(
            "accent",
            isModifyMode ? state.labels.statusLoadingFix || "[lingual] fixing..." : isDirectMode ? state.labels.statusLoadingOptimize || "[lingual] optimizing..." : state.labels.statusLoadingCandidates || "[lingual] generating candidates..."
          )
        );
      } catch {
      }
    } else if (hasActiveUI(ctx) && currentMode.hud === "none") {
      safeClearWidget(ctx);
    }
    try {
      let recentContext = "";
      if (currentMode.id === "commit" || currentMode.contextAware === true) {
        try {
          const diffOutput = (0, import_node_child_process.execFileSync)("git", ["diff", "--stat", "HEAD"], {
            encoding: "utf8",
            timeout: 250,
            stdio: ["ignore", "pipe", "ignore"]
          });
          if (diffOutput && diffOutput.trim()) {
            recentContext = `[GIT DIFF]:
${diffOutput.trim().slice(0, 300)}`;
          } else {
            const statusOutput = (0, import_node_child_process.execFileSync)("git", ["status", "--short"], {
              encoding: "utf8",
              timeout: 250,
              stdio: ["ignore", "pipe", "ignore"]
            });
            if (statusOutput && statusOutput.trim()) {
              recentContext = `[GIT STATUS]:
${statusOutput.trim().slice(0, 300)}`;
            }
          }
        } catch {
        }
      }
      if (isDirectMode || currentMode.contextAware === true) {
        const assistantAnchor = extractRecentContextAnchor(ctx);
        if (assistantAnchor) {
          recentContext = recentContext ? `${recentContext}
[LAST AGENT SUMMARY]: ${assistantAnchor}` : `[LAST AGENT SUMMARY]: ${assistantAnchor}`;
        }
      }
      const modeToRun = {
        ...currentMode,
        action: isSelectMode ? "select" : isDirectMode || isModifyMode ? "transform" : currentMode.action,
        flow: isModifyMode ? "proofread" : currentMode.flow,
        slots: slotsToRun
      };
      const candidates = await executeModeRunner(promptToTranslate, modeToRun, {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        explainLang: latestDisk.explainLang,
        context: recentContext,
        complete: completer,
        signal
      });
      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }
      if (!candidates || candidates.length === 0) {
        if (hasActiveUI(ctx)) {
          safeClearWidget(ctx);
          if (currentMode.action === "transform") {
            try {
              ctx.ui.notify("[lingual] prompt rewrite timed out; original prompt passed", "warning");
            } catch {
            }
          }
        }
        return { action: "continue" };
      }
      const maxCols = getEffectiveMaxCols();
      const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " \u21B5 ");
      const candidateVocab = candidates[0]?.vocab;
      const isProofreadFlow = currentMode.flow === "proofread";
      const isAdaptiveTakeaway = currentMode.hud === "adaptive-takeaway" || isProofreadFlow;
      const isLongModifyInput = isAdaptiveTakeaway && (promptToTranslate.length > 120 || (promptToTranslate.match(/[.!?。！？\n]/g) || []).length >= 3);
      const keepSourceRow = !isProofreadFlow && (currentMode.slots || []).some((s) => s.id === "source" && s.enabled !== false);
      const takeawayLabel = isProofreadFlow ? slotsToRun.find((s) => s.role === "vocab")?.label || "Takeaway" : state.labels.vocabLabel || "Vocab";
      const candidateSlotResults = [
        ...keepSourceRow ? [{ id: "source", label: state.labels.sourceLabel || "Original", role: "source", content: singleLineSource }] : [],
        ...!isLongModifyInput ? candidates.map((c, idx) => ({
          id: c.id,
          label: isProofreadFlow ? c.label : currentMode.action === "transform" ? `\u26A1${c.label}` : `${idx + 1}:${c.label}`,
          role: "translation",
          content: c.content.replace(/\s*\r?\n\s*/g, " \u21B5 ")
        })) : [],
        ...candidateVocab ? [{ id: "vocab", label: takeawayLabel, role: "vocab", content: candidateVocab }] : []
      ];
      session.setPageResult(
        0,
        {
          sourceText: singleLineSource,
          spoken: candidates[0].content.replace(/\s*\r?\n\s*/g, " \u21B5 "),
          written: candidates[1]?.content.replace(/\s*\r?\n\s*/g, " \u21B5 ") || "",
          vocab: candidateVocab,
          annotated: "",
          slots: candidateSlotResults
        },
        generation
      );
      if (hasActiveUI(ctx)) {
        if (currentMode.hud === "none") {
          safeClearWidget(ctx);
        } else {
          const hasMultipleTranslationSlots = candidateSlotResults.filter(
            (s) => s.role !== "vocab" && s.id !== "source"
          ).length > 1;
          const isPreviewHud = currentMode.hud === "preview" && !hasMultipleTranslationSlots;
          const effectiveMaxLines = isPreviewHud ? 4 : 9;
          const displaySlotResults = isPreviewHud ? candidateSlotResults.filter((s, idx) => s.role === "vocab" || idx === 0) : candidateSlotResults;
          const layoutSlots = displaySlotResults.map((sr) => ({
            id: sr.id,
            label: sr.label,
            role: sr.role,
            showMeaning: false,
            enabled: true
          }));
          const cardLines = renderCardLayout(
            {
              sourceText: singleLineSource,
              spoken: candidates[0].content.replace(/\s*\r?\n\s*/g, " \u21B5 "),
              written: candidates[1]?.content.replace(/\s*\r?\n\s*/g, " \u21B5 ") || "",
              vocab: candidateVocab,
              annotated: "",
              slots: displaySlotResults
            },
            state.labels,
            {
              maxCols,
              maxLines: effectiveMaxLines,
              isCompact: state.compact,
              slots: layoutSlots,
              themeDecorators: {
                muted: (s) => ctx.ui.theme.fg("muted", s),
                accent: (s) => ctx.ui.theme.fg("accent", s),
                dim: (s) => ctx.ui.theme.fg("dim", s)
              }
            }
          );
          try {
            ctx.ui.setWidget("lingual_hud", cardLines, { placement: "aboveEditor" });
          } catch {
          }
        }
      }
      let chosenText = candidates[0].content;
      if (currentMode.primarySlotId) {
        const match = candidates.find((c) => c.id.toLowerCase() === currentMode.primarySlotId?.toLowerCase());
        if (match) chosenText = match.content;
      } else if (isProofreadFlow) {
        const fixedCandidate = candidates.find((c) => c.id === "fixed");
        if (fixedCandidate) chosenText = fixedCandidate.content;
      } else {
        const firstRewrite = candidates.find((c) => c.id !== "source" && c.id !== "vocab");
        if (firstRewrite) chosenText = firstRewrite.content;
      }
      if (isSelectMode && hasActiveUI(ctx)) {
        const langCode = (state.sourceLang || "en").toLowerCase().split("-")[0];
        const sp = resolveSelectPrompts(langCode, candidates.length);
        if (typeof ctx.ui.custom === "function") {
          const items = [
            ...candidates.map((c, idx) => ({ key: String(idx + 1), label: `[${idx + 1}] ${c.label}`, value: c.content })),
            { key: "0", label: `[0] ${sp.keepOrig}`, value: "__ORIGINAL__" }
          ];
          const pickedVal = await ctx.ui.custom((tui, theme, keybindings, done) => {
            let selectedIdx = 0;
            return {
              render(width) {
                const border = theme.fg("dim", "\u2500".repeat(Math.max(10, width)));
                const headerLine = " " + theme.fg("accent", theme.bold(sp.title)) + "  " + theme.fg("dim", `(${sp.hint})`);
                const maxLineCols = Math.max(20, width - 2);
                const pillLines = [];
                let currentLine = " ";
                let currentWidth = 1;
                for (let idx = 0; idx < items.length; idx++) {
                  const it = items[idx];
                  const renderedPill = idx === selectedIdx ? theme.fg("accent", theme.bold(`\u25B8 ${it.label}`)) : `  ${theme.fg("text", it.label)}`;
                  const pillWidth = getVisualWidth(renderedPill);
                  const sep = currentWidth > 1 ? "   " : "";
                  const sepWidth = sep.length;
                  if (currentWidth > 1 && currentWidth + sepWidth + pillWidth > maxLineCols) {
                    pillLines.push(currentLine);
                    currentLine = " " + renderedPill;
                    currentWidth = 1 + pillWidth;
                  } else {
                    currentLine += sep + renderedPill;
                    currentWidth += sepWidth + pillWidth;
                  }
                }
                if (currentLine.trim()) {
                  pillLines.push(currentLine);
                }
                return [
                  border,
                  truncateVisual(headerLine, width),
                  ...pillLines,
                  border
                ];
              },
              handleInput(keyData) {
                if (/^[1-9]$/.test(keyData)) {
                  const num = parseInt(keyData, 10);
                  if (num >= 1 && num <= candidates.length) {
                    done(candidates[num - 1].content);
                    return;
                  }
                }
                if (keyData === "0" || keyData === "\x1B" || keyData === "" || keybindings?.matches?.(keyData, "tui.select.cancel")) {
                  done("__ORIGINAL__");
                  return;
                }
                if (keyData === "h" || keyData === "k" || keyData === "\x1B[A" || keyData === "\x1B[D" || keybindings?.matches?.(keyData, "tui.select.up")) {
                  selectedIdx = (selectedIdx - 1 + items.length) % items.length;
                  tui?.requestRender?.();
                  return;
                }
                if (keyData === "l" || keyData === "j" || keyData === "\x1B[B" || keyData === "\x1B[C" || keyData === "	" || keybindings?.matches?.(keyData, "tui.select.down")) {
                  selectedIdx = (selectedIdx + 1) % items.length;
                  tui?.requestRender?.();
                  return;
                }
                if (keyData === "\r" || keyData === "\n" || keyData === "\x1BOM" || keybindings?.matches?.(keyData, "tui.select.confirm")) {
                  done(items[selectedIdx]?.value);
                  return;
                }
              },
              invalidate() {
              }
            };
          });
          if (!pickedVal || pickedVal === "__ORIGINAL__") {
            safeClearWidget(ctx);
            updateFooter(ctx);
            return { action: "continue" };
          }
          chosenText = pickedVal;
        } else if (typeof ctx.ui.select === "function") {
          const optionLabels = [
            ...candidates.map((c, idx) => `[${idx + 1}] ${c.label}`),
            `[0] ${sp.keepOrig}`
          ];
          const picked = await ctx.ui.select(`${sp.title} (${sp.hint})`, optionLabels);
          if (!picked || picked.startsWith("[0]")) {
            safeClearWidget(ctx);
            updateFooter(ctx);
            return { action: "continue" };
          }
          const idxMatch = picked.match(/^\[(\d+)\]/);
          if (idxMatch) {
            const idx = parseInt(idxMatch[1], 10) - 1;
            if (candidates[idx]) {
              chosenText = candidates[idx].content;
            }
          }
        }
      }
      let finalText = sanitized.rawPayload ? `${chosenText}

${sanitized.rawPayload}` : chosenText;
      const diskConfig = loadUserLingualConfig();
      if (currentMode.target !== "clipboard" && shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }
      if (currentMode.target === "clipboard") {
        copyToClipboard(finalText);
        if (hasActiveUI(ctx)) {
          ctx.ui.notify("[lingual] Copied to clipboard", "info");
        }
        return { action: "handled" };
      }
      return {
        action: "transform",
        text: finalText,
        images: event.images
      };
    } catch {
      if (hasActiveUI(ctx)) {
        safeClearWidget(ctx);
        if (currentMode.action === "transform") {
          try {
            ctx.ui.notify("[lingual] prompt rewrite error; original prompt passed", "warning");
          } catch {
          }
        }
      }
      return { action: "continue" };
    } finally {
      if (session.isLatest(generation)) {
        const activeCtx = hasActiveUI(ctx) ? ctx : hasActiveUI(lastContext) ? lastContext : null;
        if (activeCtx) {
          updateFooter(activeCtx);
        }
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractRecentContextAnchor
});
