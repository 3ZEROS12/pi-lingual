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
  default: () => extension_default
});
module.exports = __toCommonJS(extension_exports);
var import_node_fs2 = __toESM(require("fs"), 1);
var import_node_path2 = __toESM(require("path"), 1);
var import_node_os2 = __toESM(require("os"), 1);

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
  const terminalCols = process.stdout?.columns;
  const raw = typeof requested === "number" ? requested : typeof terminalCols === "number" && terminalCols > 0 ? terminalCols - 8 : 80;
  return Math.max(25, raw);
}
var ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
function getVisualWidth(str) {
  let width = 0;
  const clean = str.replace(ANSI_ESCAPE_REGEX, "");
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (code === 8205 || code === 65039 || code === 65038 || code >= 768 && code <= 879 || code >= 8203 && code <= 8207) {
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
function truncateVisual(str, maxVisualCols) {
  if (maxVisualCols <= 0) return "";
  const singleLine = str.replace(/[\r\n\t]+/g, " ");
  const fullWidth = getVisualWidth(singleLine);
  if (fullWidth <= maxVisualCols) return singleLine;
  if (maxVisualCols <= 3) return ".".repeat(maxVisualCols);
  const targetCols = Math.max(1, maxVisualCols - 3);
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
    const charLen = code > 65535 ? 2 : 1;
    const ch = singleLine.slice(i, i + charLen);
    const w = getVisualWidth(ch);
    if (curWidth + w > targetCols) {
      break;
    }
    result += ch;
    curWidth += w;
    i += charLen;
  }
  result = result.replace(/\s*[\(\[\{（【]$/, "");
  return result + (singleLine.includes("\x1B") ? "\x1B[0m" : "") + "...";
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
      { id: "source", label: labels.sourceLabel || "\u539F\u6587", role: "source", enabled: true },
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
        role: slot.role,
        content: content.trim(),
        meaning: slot.showMeaning !== false && meaning && meaning.trim() ? meaning.trim() : void 0
      });
    }
  }
  if (isCompact || maxCols < 35) {
    const tagWidth = getVisualWidth(pageTag);
    const availCols = Math.max(20, maxCols - tagWidth);
    if (contentBranches.length === 0) {
      return [truncateVisual(`\u21C4 [${labels.hudTitle}] ${card.sourceText}`, availCols) + pageTag];
    }
    const prefix = `\u21C4 [${labels.hudTitle}] `;
    const prefixW = getVisualWidth(prefix);
    const sepW = (contentBranches.length - 1) * 3;
    const perBranchBudget = Math.max(12, Math.floor((availCols - prefixW - sepW) / contentBranches.length));
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
    const sourceLabel = sourceSlot.label || labels.sourceLabel || "\u539F\u6587";
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
    let clampedSourceLines = sourceLines;
    if (sourceLines.length > 2) {
      clampedSourceLines = [
        sourceLines[0],
        truncateVisual(sourceLines[1] + "...", maxCols)
      ];
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
            branchBudget = Math.max(1, Math.min(remainingBudget, 1));
          } else {
            const transLeft = Math.max(1, transCount - transHandled);
            const reservedForRest = transLeft - 1 + vocabCount;
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
  return lines.map((line) => getVisualWidth(line) > maxCols ? truncateVisual(line, maxCols) : line);
}

// src/engine.ts
var import_node_fs = __toESM(require("fs"), 1);
var import_node_path = __toESM(require("path"), 1);
var import_node_os = __toESM(require("os"), 1);

// src/core/prompts.ts
function getDefaultPromptSlots(sourceLang = "zh") {
  const norm = (sourceLang || "zh").toLowerCase().split("-")[0];
  const isZh = norm === "zh" || norm === "tw";
  const isJa = norm === "ja";
  if (isZh) {
    return [
      {
        id: "concise",
        label: "\u6781\u7B80\u9AD8\u6548",
        instruction: "\u9AD8\u6548\u7387\u3001\u96F6\u5E9F\u8BDD\u7684\u76F4\u63A5\u884C\u52A8\u6307\u4EE4\uFF1A\u5265\u79BB\u53E3\u8BED\u5BD2\u6684\uFF0C\u76F4\u5954\u76EE\u6807\u52A8\u4F5C\u4E0E\u6700\u5C0F\u5DE5\u4F5C\u6539\u52A8\u9762\uFF08Smallest Working Diff\uFF09\u3002",
        enabled: true
      },
      {
        id: "spec",
        label: "\u7ED3\u6784\u89C4\u8303",
        instruction: "\u7ED3\u6784\u5316\u5DE5\u7A0B\u9700\u6C42\u89C4\u8303\uFF1A\u5C06\u6742\u4E71\u8DF3\u8DC3\u7684\u53E3\u8BED\u63D0\u70BC\u4E3A\u6E05\u6670\u7684\u300C\u6838\u5FC3\u76EE\u6807 + \u7EA6\u675F\u8FB9\u754C + \u9884\u671F\u4EA7\u51FA\u300D\uFF0C\u4E25\u7981\u51ED\u7A7A\u634F\u9020\u672A\u8981\u6C42\u7684\u7279\u6027\u3002",
        enabled: true
      },
      {
        id: "deep",
        label: "\u6DF1\u5EA6\u4E25\u8C28",
        instruction: "\u6839\u56E0\u6EAF\u6E90\u4E0E\u67B6\u6784\u4E25\u8C28\u89C4\u8303\uFF1A\u8981\u6C42\u5168\u94FE\u8DEF\u6392\u67E5\u5171\u4EAB\u6839\u56E0\uFF08\u62D2\u7EDD\u8868\u9762\u6253\u8865\u4E01\uFF09\uFF0C\u517C\u987E\u8FB9\u754C\u6761\u4EF6\u9A8C\u8BC1\u4E0E\u96F6\u56DE\u5F52\u3002",
        enabled: true
      }
    ];
  }
  if (isJa) {
    return [
      {
        id: "concise",
        label: "\u7C21\u6F54\u30FB\u9AD8\u52B9\u7387",
        instruction: "\u7121\u99C4\u3092\u7701\u3044\u305F\u9AD8\u52B9\u7387\u306A\u6307\u793A\uFF1A\u6838\u5FC3\u306E\u30A2\u30AF\u30B7\u30E7\u30F3\u3068\u6700\u5C0F\u9650\u306E\u5909\u66F4\u5DEE\u5206\uFF08Smallest Working Diff\uFF09\u3092\u76F4\u63A5\u6307\u793A\u3002",
        enabled: true
      },
      {
        id: "spec",
        label: "\u69CB\u9020\u5316\u4ED5\u69D8",
        instruction: "\u69CB\u9020\u5316\u3055\u308C\u305F\u6280\u8853\u4ED5\u69D8\uFF1A\u66D6\u6627\u306A\u8868\u73FE\u3092\u300C\u76EE\u7684\u30FB\u5236\u7D04\u6761\u4EF6\u30FB\u671F\u5F85\u3055\u308C\u308B\u7D50\u679C\u300D\u306B\u6574\u7406\u3057\u3001\u660E\u78BA\u5316\u3002",
        enabled: true
      },
      {
        id: "deep",
        label: "\u6839\u672C\u539F\u56E0\u30FB\u53B3\u5BC6",
        instruction: "\u6839\u672C\u539F\u56E0\u306E\u7279\u5B9A\u3068\u53B3\u5BC6\u306A\u691C\u8A3C\uFF1A\u8868\u9762\u7684\u306A\u5BFE\u51E6\u3067\u306F\u306A\u304F\u30A8\u30F3\u30C9\u30C4\u30FC\u30A8\u30F3\u30C9\u306E\u539F\u56E0\u8FFD\u8DE1\u3068\u5883\u754C\u5024\u691C\u8A3C\u3092\u8981\u6C42\u3002",
        enabled: true
      }
    ];
  }
  return [
    {
      id: "concise",
      label: "Concise",
      instruction: "High-efficiency, zero-fluff imperative instruction targeting the exact action and smallest working diff.",
      enabled: true
    },
    {
      id: "spec",
      label: "Structured",
      instruction: "Structured engineering specification: distill messy thoughts into clear Objective, Constraints, and Deliverable without inventing unrequested features.",
      enabled: true
    },
    {
      id: "deep",
      label: "Deep Rigor",
      instruction: "Root-cause & architectural rigor: trace end-to-end execution flow, fix shared root causes rather than symptom patches, and verify edge cases.",
      enabled: true
    }
  ];
}
function getDefaultSlots(sourceLang = "en") {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const labels = {
    en: { source: "Original", spoken: "Spoken", written: "Written", vocab: "Vocab" },
    zh: { source: "\u539F\u6587", spoken: "\u53E3\u8BED", written: "\u5199\u4F5C", vocab: "\u91CD\u70B9" },
    tw: { source: "\u539F\u6587", spoken: "\u53E3\u8A9E", written: "\u66F8\u9762", vocab: "\u91CD\u9EDE" },
    ja: { source: "\u539F\u6587", spoken: "\u53E3\u8A9E", written: "\u6587\u9762", vocab: "\u5358\u8A9E" },
    ko: { source: "\uC6D0\uBB38", spoken: "\uAD6C\uC5B4", written: "\uBB38\uC5B4", vocab: "\uD575\uC2EC" },
    ru: { source: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B", spoken: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u044B\u0439", written: "\u041F\u0438\u0441\u044C\u043C\u0435\u043D\u043D\u044B\u0439", vocab: "\u041B\u0435\u043A\u0441\u0438\u043A\u0430" },
    pt: { source: "Original", spoken: "Falado", written: "Escrito", vocab: "Vocab" },
    es: { source: "Original", spoken: "Hablado", written: "Escrito", vocab: "Vocab" },
    vi: { source: "Nguy\xEAn b\u1EA3n", spoken: "Kh\u1EA9u ng\u1EEF", written: "V\u0103n b\u1EA3n", vocab: "T\u1EEB v\u1EF1ng" },
    tr: { source: "Orijinal", spoken: "Konu\u015Fma", written: "Yaz\u0131l\u0131", vocab: "Kelime" },
    ar: { source: "\u0627\u0644\u0623\u0635\u0644", spoken: "\u0645\u062D\u0627\u062F\u062B\u0629", written: "\u0643\u062A\u0627\u0628\u0629", vocab: "\u0645\u0641\u0631\u062F\u0627\u062A" },
    my: { source: "Asal", spoken: "Pertuturan", written: "Penulisan", vocab: "Kosa kata" },
    ms: { source: "Asal", spoken: "Pertuturan", written: "Penulisan", vocab: "Kosa kata" },
    fr: { source: "Original", spoken: "Parl\xE9", written: "\xC9crit", vocab: "Vocab" },
    de: { source: "Original", spoken: "Gesprochen", written: "Schriftlich", vocab: "Wortschatz" }
  };
  const l = labels[norm] || labels.en;
  const instructions = {
    zh: {
      spoken: "\u81EA\u7136\u5730\u9053\u7684\u7F8E\u5F0F\u53E3\u8BED\u6D41\uFF08\u6BCF\u65E5\u7AD9\u4F1A\u3001Slack\u6C9F\u901A\u3001\u7ED3\u5BF9\u7F16\u7A0B\u3001\u654F\u6377\u534F\u4F5C\uFF09\u3002\u5730\u9053\u7845\u8C37\u53E3\u543B\u3001\u81EA\u7136\u7F29\u8BFB\u3001\u52A8\u8BCD\u77ED\u8BED\u4E0E\u4FDA\u8BED\u4E60\u60EF\u3002",
      written: "\u4E25\u8C28\u73B0\u4EE3\u7684\u67B6\u6784\u89C4\u8303\u4E66\u9762\u8BED\uFF08PR\u63CF\u8FF0\u3001RFC\u6587\u6863\u3001\u95EE\u9898\u5355\u3001\u67B6\u6784\u8BF4\u660E\uFF09\u3002\u6E05\u6670\u4E13\u4E1A\u7684\u9AD8\u7EA7\u6280\u672F\u6563\u6587\uFF0C\u675C\u7EDD\u9648\u65E7\u7EF4\u591A\u5229\u4E9A\u5F0F\u5957\u8BDD\u4E0EAI\u6C34\u8BCD\u3002",
      vocab: "\u81EA\u9002\u5E94\u8403\u53D6\u5173\u952E\u5730\u9053\u642D\u914D\u3001\u52A8\u8BCD\u8BCD\u7EC4\u3001\u6280\u672F\u6210\u8BED\u6216\u9AD8\u9636\u8868\u8FBE\uFF0C\u52A9\u529B\u638C\u63E1\u5730\u9053\u6BCD\u8BED\u7EA7\u8BED\u611F\u3002"
    },
    tw: {
      spoken: "\u81EA\u7136\u9053\u5730\u7684\u7F8E\u5F0F\u53E3\u8A9E\u6D41\uFF08\u6BCF\u65E5\u7AD9\u6703\u3001Slack\u6E9D\u901A\u3001\u7D50\u5C0D\u7DE8\u7A0B\u3001\u654F\u6377\u5354\u4F5C\uFF09\u3002\u9053\u5730\u77FD\u8C37\u8A9E\u611F\u3001\u81EA\u7136\u7E2E\u8B80\u3001\u52D5\u8A5E\u7247\u8A9E\u8207\u6163\u7528\u8A9E\u3002",
      written: "\u56B4\u8B39\u73FE\u4EE3\u7684\u67B6\u69CB\u898F\u7BC4\u66F8\u9762\u8A9E\uFF08PR\u63CF\u8FF0\u3001RFC\u6587\u6A94\u3001\u554F\u984C\u55AE\u3001\u67B6\u69CB\u8AAA\u660E\uFF09\u3002\u6E05\u6670\u5C08\u696D\u7684\u9AD8\u7D1A\u6280\u8853\u6563\u6587\uFF0C\u675C\u7D55\u9673\u820A\u5957\u8A71\u8207AI\u6D6E\u8A87\u8A5E\u5F59\u3002",
      vocab: "\u81EA\u9069\u61C9\u8403\u53D6\u95DC\u9375\u9053\u5730\u642D\u914D\u3001\u52D5\u8A5E\u7247\u8A9E\u3001\u6280\u8853\u6210\u8A9E\u6216\u9AD8\u968E\u8868\u9054\uFF0C\u52A9\u529B\u638C\u63E1\u9053\u5730\u6BCD\u8A9E\u7D1A\u8A9E\u611F\u3002"
    },
    ja: {
      spoken: "\u89AA\u3057\u3044\u540C\u50DA\u3084\u30C1\u30FC\u30E0\u3068\u306E\u81EA\u7136\u306A\u53E3\u8A9E\u8868\u73FE\uFF08\u671D\u4F1A\u3001Slack\u30CF\u30C9\u30EB\u3001\u30DA\u30A2\u30D7\u30ED\u30B0\u30E9\u30DF\u30F3\u30B0\u3001\u30AB\u30B8\u30E5\u30A2\u30EB\u30C1\u30E3\u30C3\u30C8\uFF09\u3002\u81EA\u7136\u306A\u77ED\u7E2E\u5F62\u3084\u30A4\u30C7\u30A3\u30AA\u30E0\u3002",
      written: "\u660E\u78BA\u3067\u6D17\u7DF4\u3055\u308C\u305F\u73FE\u4EE3\u7684\u6280\u8853\u6587\u66F8\u8868\u73FE\uFF08PR\u6982\u8981\u3001RFC\u3001Issue\u3001\u6280\u8853\u8A2D\u8A08\u66F8\uFF09\u3002\u80FD\u52D5\u7684\u3067\u7C21\u6F54\u30FB\u8AD6\u7406\u7684\u306A\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u6587\u7AE0\u3002",
      vocab: "\u91CD\u8981\u306A\u9023\u8A9E\u3001\u53E5\u52D5\u8A5E\u3001\u6280\u8853\u8868\u73FE\u3092\u81EA\u5F8B\u7684\u306B\u62BD\u51FA\u3057\u3001\u6BCD\u8A9E\u8A71\u8005\u30EC\u30D9\u30EB\u306E\u8A9E\u5F59\u904B\u7528\u3092\u652F\u63F4\u3002"
    },
    ko: {
      spoken: "\uC77C\uC0C1\uC801\uC778 \uD300 \uD611\uC5C5 \uBC0F \uAD6C\uC5B4\uCCB4 \uD45C\uD604 (\uB370\uC77C\uB9AC \uC2A4\uD0E0\uB4DC\uC5C5, Slack, \uD398\uC5B4 \uD504\uB85C\uADF8\uB798\uBC0D). \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uCD95\uC57D\uD615\uACFC \uAD6C\uB3D9\uC0AC.",
      written: "\uBA85\uD655\uD558\uACE0 \uC815\uAD50\uD55C \uD604\uB300 \uAE30\uC220 \uBB38\uC11C \uD45C\uD604 (PR \uC124\uBA85, RFC, \uC774\uC288, \uC544\uD0A4\uD14D\uCC98 \uBB38\uC11C). \uAC04\uACB0\uD558\uACE0 \uC804\uBB38\uC801\uC778 \uBB38\uC7A5.",
      vocab: "\uD575\uC2EC \uC5F0\uC5B4, \uAD6C\uB3D9\uC0AC \uBC0F \uACE0\uAE09 \uAE30\uC220 \uAD00\uC6A9\uAD6C\uB97C \uCD94\uCD9C\uD558\uC5EC \uC6D0\uC5B4\uBBFC \uC218\uC900\uC758 \uC5B4\uAC10 \uC2B5\uB4DD \uC9C0\uC6D0."
    },
    ru: {
      spoken: "\u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u0430\u044F \u0440\u0435\u0447\u044C \u0434\u043B\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B (\u0441\u0442\u0435\u043D\u0434\u0430\u043F\u044B, Slack, \u043A\u043E\u0434-\u0440\u0435\u0432\u044C\u044E). \u0416\u0438\u0432\u044B\u0435 \u0438\u0434\u0438\u043E\u043C\u044B \u0438 \u0441\u043E\u043A\u0440\u0430\u0449\u0435\u043D\u0438\u044F.",
      written: "\u0427\u0435\u0442\u043A\u0438\u0439 \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u0438\u0441\u044C\u043C\u0435\u043D\u043D\u044B\u0439 \u0441\u0442\u0438\u043B\u044C (\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F PR, RFC, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F). \u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E \u0438 \u043B\u0430\u043A\u043E\u043D\u0438\u0447\u043D\u043E.",
      vocab: "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u043E\u0441\u043E\u0447\u0435\u0442\u0430\u043D\u0438\u044F, \u0444\u0440\u0430\u0437\u043E\u0432\u044B\u0435 \u0433\u043B\u0430\u0433\u043E\u043B\u044B \u0438 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0438\u0434\u0438\u043E\u043C\u044B \u0441 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C."
    },
    en: {
      spoken: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration). Authentic Silicon Valley flow, natural contractions, native phrasal verbs, idioms.",
      written: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional. STRICTLY AVOID archaic Victorian fluff and AI-slop buzzwords.",
      vocab: "Adaptively extract key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency."
    }
  };
  const inst = instructions[norm] || instructions.en;
  return [
    {
      id: "source",
      label: l.source,
      role: "source",
      enabled: true
    },
    {
      id: "spoken",
      label: l.spoken,
      role: "translation",
      instruction: inst.spoken,
      showMeaning: true,
      enabled: true
    },
    {
      id: "written",
      label: l.written,
      role: "translation",
      instruction: inst.written,
      showMeaning: true,
      enabled: true
    },
    {
      id: "vocab",
      label: l.vocab,
      role: "vocab",
      instruction: inst.vocab,
      enabled: true
    }
  ];
}
var LEGACY_SLOT_PRESETS = {
  developer: {
    slot1: {
      label: "Spoken",
      name: "Agile Spoken",
      instruction: "Natural, fluent spoken flow (daily standup, Slack, pair programming, agile collaboration, code reviews). Authentic Silicon Valley flow, natural contractions, native phrasal verbs, idioms."
    },
    slot2: {
      label: "Written",
      name: "RFC Technical Written",
      instruction: "Clear, precise, modern technical written prose (PR descriptions, RFCs, issues, architecture docs). High-level Plain prose: active, concise, professional. STRICTLY AVOID archaic Victorian fluff (e.g. 'we may now proceed') and AI-slop buzzwords (e.g. 'delve', 'testament')."
    }
  },
  social: {
    slot1: {
      label: "Hook",
      name: "Twitter/X Viral Hook",
      instruction: "High-impact, punchy opening hook with authentic Silicon Valley dev slang, rhetorical appeal, or conversational banter for Twitter/X and Reddit. Sharp, memorable, and human."
    },
    slot2: {
      label: "Deep",
      name: "Technical Insight",
      instruction: "High-signal, structured technical insight for technical threads, Substack, and long-form posts. Concise, authoritative, and direct without corporate marketing fluff."
    }
  },
  japanese: {
    slot1: {
      label: "\u53E3\u8A9E",
      name: "\u65E5\u5E38\u30BF\u30E1\u53E3 (Casual Spoken)",
      instruction: "\u89AA\u3057\u3044\u540C\u50DA\u3084\u53CB\u4EBA\u3068\u306E\u65E5\u5E38\u4F1A\u8A71\u30FBSlack\u30CF\u30C9\u30EB\u30FB\u30AB\u30B8\u30E5\u30A2\u30EB\u306A\u3084\u308A\u53D6\u308A\u306B\u6700\u9069\u306A\u81EA\u7136\u306A\u53E3\u8A9E\u8868\u73FE\u3002\u30BF\u30E1\u53E3\u30FB\u89AA\u3057\u307F\u3084\u3059\u3044\u30C8\u30FC\u30F3\u3002"
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
      instruction: "Rigorous, objective, passive/active balanced academic prose meeting IEEE, ACM, and Nature journal standards. Precise vocabulary, rigorous methodology descriptions."
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
      },
      {
        input: "\u80A5\u5927\u5316\u3057\u305F\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u6368\u3066\u3066\u4F9D\u5B58\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u306B\u79FB\u884C\u3057\u305F\u3089\u3001\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8\u304C10\u500D\u901F\u304F\u306A\u308A\u307E\u3057\u305F",
        spoken: "Ditched the bloated framework for a zero-dep single file \u2014 cold starts are 10x faster now!",
        spoken_meaning: "\u91CD\u3044\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u3084\u3081\u3066\u4F9D\u5B58\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u306B\u3057\u305F\u3089\u3001\u8D77\u52D5\u304C10\u500D\u901F\u304F\u306A\u308A\u307E\u3057\u305F\uFF01",
        written: "Replaced the monolithic framework with a zero-dependency architecture, yielding a 10x improvement in cold-start latency.",
        written_meaning: "\u4E00\u679A\u5CA9\u306E\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u304B\u3089\u4F9D\u5B58\u95A2\u4FC2\u30BC\u30ED\u306E\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u3078\u79FB\u884C\u3057\u3001\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8\u9045\u5EF6\u309210\u500D\u6539\u5584\u3057\u307E\u3057\u305F\u3002",
        vocab: "ditch ... for ... (\u301C\u3092\u624B\u653E\u3057\u3066\u301C\u306B\u4E57\u308A\u63DB\u3048\u308B) \xB7 zero-dep (\u5916\u90E8\u4F9D\u5B58\u30BC\u30ED) \xB7 cold start (\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8) \xB7 yield (\u3082\u305F\u3089\u3059)"
      }
    ]
  },
  en: {
    name: "English",
    nativeName: "English",
    meaningInstruction: "in native English",
    vocabInstruction: 'in English in parentheses separated by " \xB7 " (e.g. "term1 (English definition) \xB7 term2 (definition) \xB7 ...")',
    anchors: [
      {
        input: "Sounds good, let's ship it.",
        spoken: "\u3044\u3044\u611F\u3058\u3067\u3059\u306D\u3001\u30EA\u30EA\u30FC\u30B9\u3057\u307E\u3057\u3087\u3046\uFF01",
        spoken_meaning: "Looks great, let's deploy right away.",
        written: "\u78BA\u8A8D\u3057\u307E\u3057\u305F\u3002\u672C\u756A\u74B0\u5883\u3078\u30C7\u30D7\u30ED\u30A4\u3092\u9032\u3081\u307E\u3059\u3002",
        written_meaning: "Reviewed and confirmed. Proceeding with deployment to production.",
        vocab: "\u30EA\u30EA\u30FC\u30B9\u3059\u308B (ship / deploy) \xB7 \u672C\u756A\u74B0\u5883 (production environment)"
      },
      {
        input: "Keep going.",
        spoken: "\u7D9A\u3051\u3066\u3044\u304D\u307E\u3057\u3087\u3046\u3002",
        spoken_meaning: "Let's keep making progress.",
        written: "\u5F8C\u7D9A\u306E\u51E6\u7406\u3092\u9032\u3081\u3066\u304F\u3060\u3055\u3044\u3002",
        written_meaning: "Please proceed with the subsequent steps.",
        vocab: "\u5F8C\u7D9A\u306E\u51E6\u7406 (subsequent processing) \xB7 \u9032\u3081\u308B (proceed)"
      },
      {
        input: "This feels over-engineered; let's stick to the built-in standard library.",
        spoken: "\u3053\u308C\u3061\u3087\u3063\u3068\u4F5C\u308A\u8FBC\u307F\u3059\u304E\u304B\u3082\u3002\u7D20\u76F4\u306B\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u884C\u304D\u307E\u3057\u3087\u3046\u3002",
        spoken_meaning: "Might be a bit over-complicated; let's simply use the standard library.",
        written: "\u8A2D\u8A08\u304C\u904E\u5270\u306B\u8907\u96D1\u5316\u3057\u3066\u3044\u307E\u3059\u3002\u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA\u306E\u6D3B\u7528\u3092\u63A8\u5968\u3057\u307E\u3059\u3002",
        written_meaning: "Architecture is unnecessarily complex. Recommending the standard library.",
        vocab: "\u4F5C\u308A\u8FBC\u307F\u3059\u304E (over-engineered) \xB7 \u6A19\u6E96\u30E9\u30A4\u30D6\u30E9\u30EA (standard library) \xB7 \u63A8\u5968\u3059\u308B (recommend)"
      },
      {
        input: "Ditched the bloated framework for a zero-dep single file \u2014 cold starts are 10x faster now!",
        spoken: "\u91CD\u3044\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u3084\u3081\u3066\u4F9D\u5B58\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u306B\u3057\u305F\u3089\u3001\u8D77\u52D5\u304C10\u500D\u901F\u304F\u306A\u308A\u307E\u3057\u305F\uFF01",
        spoken_meaning: "Discarded the heavy framework and switched to a zero-dep single file; boot speed jumped 10x!",
        written: "\u80A5\u5927\u5316\u3057\u305F\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3092\u5EC3\u6B62\u3057\u3066\u4F9D\u5B58\u6027\u30BC\u30ED\u306E\u5358\u4E00\u30D5\u30A1\u30A4\u30EB\u69CB\u9020\u3092\u63A1\u7528\u3057\u3001\u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8\u901F\u5EA6\u309210\u500D\u5411\u4E0A\u3055\u305B\u307E\u3057\u305F\u3002",
        written_meaning: "Eliminated the bloated framework in favor of a zero-dependency architecture, achieving a 10x speedup in cold-start times.",
        vocab: "\u4F9D\u5B58\u30BC\u30ED (zero-dependency) \xB7 \u30B3\u30FC\u30EB\u30C9\u30B9\u30BF\u30FC\u30C8 (cold start) \xB7 \u5411\u4E0A\u3055\u305B\u308B (improve / speed up)"
      }
    ]
  },
  es: {
    name: "Spanish",
    nativeName: "Espa\xF1ol",
    meaningInstruction: "in native Spanish",
    vocabInstruction: 'in Spanish in parentheses separated by " \xB7 " (e.g. "term1 (significado en espa\xF1ol) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "De acuerdo, empecemos",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Totalmente de acuerdo, vamos al grano",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Confirmado. Procedamos con la implementaci\xF3n",
        vocab: "on board with (estar de acuerdo) \xB7 dive in (empezar de lleno)"
      },
      {
        input: "Continuar",
        spoken: "Let's keep going.",
        spoken_meaning: "Sigamos adelante",
        written: "Proceed with the next steps.",
        written_meaning: "Continuar con los siguientes pasos",
        vocab: "keep going (seguir adelante) \xB7 proceed with (proceder con)"
      },
      {
        input: "Esta propuesta est\xE1 sobrecargada, mejor usar la biblioteca est\xE1ndar",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Parece demasiado complicado; nos ir\xEDa mucho mejor con la librer\xEDa est\xE1ndar",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "La soluci\xF3n propuesta introduce complejidad innecesaria. Se prefiere la biblioteca est\xE1ndar nativa",
        vocab: "over-engineered (sobreingenier\xEDa) \xB7 be better off (estar mejor con) \xB7 stick with (quedarse con) \xB7 leverage (aprovechar)"
      }
    ]
  },
  fr: {
    name: "French",
    nativeName: "Fran\xE7ais",
    meaningInstruction: "in native French",
    vocabInstruction: 'in French in parentheses separated by " \xB7 " (e.g. "term1 (d\xE9finition en fran\xE7ais) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "D'accord, commen\xE7ons",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Tout \xE0 fait d'accord, allons-y",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "D'accord. Proc\xE9dons \xE0 l'impl\xE9mentation",
        vocab: "on board with (\xEAtre d'accord) \xB7 dive in (s'y mettre directement)"
      },
      {
        input: "Continuer",
        spoken: "Let's keep going.",
        spoken_meaning: "Continuons",
        written: "Proceed with the next steps.",
        written_meaning: "Passer aux \xE9tapes suivantes",
        vocab: "keep going (continuer) \xB7 proceed with (proc\xE9der \xE0)"
      },
      {
        input: "Cette approche est trop complexe, autant utiliser la biblioth\xE8que standard",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\xC7a semble surdimensionn\xE9 ; on ferait bien mieux de rester sur la biblioth\xE8que standard",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "L'approche propos\xE9e introduit une complexit\xE9 superflue. L'utilisation de la biblioth\xE8que standard est recommand\xE9e",
        vocab: "over-engineered (surdimensionn\xE9) \xB7 be better off (avoir tout int\xE9r\xEAt \xE0) \xB7 stick with (s'en tenir \xE0) \xB7 leverage (exploiter)"
      }
    ]
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    meaningInstruction: "in native German",
    vocabInstruction: 'in German in parentheses separated by " \xB7 " (e.g. "term1 (deutsche Definition) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "Einverstanden, fangen wir an",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "Voll einverstanden, packen wir es an",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "Best\xE4tigt. Wir fahren mit der Implementierung fort",
        vocab: "on board with (einverstanden sein) \xB7 dive in (direkt loslegen)"
      },
      {
        input: "Weiter",
        spoken: "Let's keep going.",
        spoken_meaning: "Machen wir weiter",
        written: "Proceed with the next steps.",
        written_meaning: "Mit den n\xE4chsten Schritten fortfahren",
        vocab: "keep going (weitermachen) \xB7 proceed with (fortfahren mit)"
      },
      {
        input: "Dieser Ansatz ist \xFCberdimensioniert, nutzen wir lieber die Standardbibliothek",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "Das wirkt etwas \xFCberdimensioniert; mit der Standardbibliothek fahren wir deutlich besser",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "Der vorgeschlagene Ansatz bringt unn\xF6tige Komplexit\xE4t mit sich. Die native Standardbibliothek wird empfohlen",
        vocab: "over-engineered (\xFCberdimensioniert) \xB7 be better off (besser dran sein mit) \xB7 stick with (bleiben bei) \xB7 leverage (nutzen/einsetzen)"
      }
    ]
  },
  ko: {
    name: "Korean",
    nativeName: "\uD55C\uAD6D\uC5B4",
    meaningInstruction: "in native Korean",
    vocabInstruction: 'in Korean in parentheses separated by " \xB7 " (e.g. "term1 (\uD55C\uAD6D\uC5B4 \uB73B) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "\uC88B\uC544\uC694, \uC2DC\uC791\uD569\uC2DC\uB2E4",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\uC644\uC804 \uCC2C\uC131\uC774\uC5D0\uC694, \uBC14\uB85C \uC2DC\uC791\uD574 \uBCF4\uC8E0",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\uD655\uC778\uD588\uC2B5\uB2C8\uB2E4. \uAD6C\uD604\uC744 \uC9C4\uD589\uD558\uACA0\uC2B5\uB2C8\uB2E4",
        vocab: "on board with (\uCC2C\uC131\uD558\uB2E4/\uB3D9\uC758\uD558\uB2E4) \xB7 dive in (\uBC14\uB85C \uCC29\uC218\uD558\uB2E4)"
      },
      {
        input: "\uACC4\uC18D \uC9C4\uD589\uD574\uC918",
        spoken: "Let's keep going.",
        spoken_meaning: "\uACC4\uC18D \uC9C4\uD589\uD558\uC8E0",
        written: "Proceed with the next steps.",
        written_meaning: "\uB2E4\uC74C \uB2E8\uACC4\uB97C \uC9C4\uD589\uD574 \uC8FC\uC2ED\uC2DC\uC624",
        vocab: "keep going (\uACC4\uC18D \uAC00\uB2E4) \xB7 proceed with (~\uC744 \uC9C4\uD589\uD558\uB2E4)"
      },
      {
        input: "\uC774 \uBC29\uC2DD\uC740 \uB108\uBB34 \uBCF5\uC7A1\uD55C \uAC83 \uAC19\uC544\uC694, \uD45C\uC900 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB97C \uC4F0\uB294 \uAC8C \uB0AB\uACA0\uC5B4\uC694",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\uC870\uAE08 \uACFC\uD558\uAC8C \uC124\uACC4\uB41C \uB290\uB08C\uC774\uC5D0\uC694. \uADF8\uB0E5 \uD45C\uC900 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB97C \uC4F0\uB294 \uAC8C \uD6E8\uC52C \uB0AB\uACA0\uC5B4\uC694",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\uC81C\uC548\uB41C \uBC29\uC2DD\uC740 \uBD88\uD544\uC694\uD55C \uBCF5\uC7A1\uC131\uC744 \uCD08\uB798\uD558\uBBC0\uB85C \uD45C\uC900 \uB77C\uC774\uBE0C\uB7EC\uB9AC \uD65C\uC6A9\uC744 \uAD8C\uC7A5\uD569\uB2C8\uB2E4",
        vocab: "over-engineered (\uACFC\uB3C4\uD558\uAC8C \uC124\uACC4\uB41C) \xB7 be better off (~\uD558\uB294 \uD3B8\uC774 \uB354 \uB0AB\uB2E4) \xB7 stick with (~\uC744 \uACE0\uC218\uD558\uB2E4) \xB7 leverage (\uD65C\uC6A9\uD558\uB2E4)"
      }
    ]
  },
  ru: {
    name: "Russian",
    nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    meaningInstruction: "in native Russian",
    vocabInstruction: 'in Russian in parentheses separated by " \xB7 " (e.g. "term1 (\u0440\u0443\u0441\u0441\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435) \xB7 term2 (...) \xB7 ...")',
    anchors: [
      {
        input: "\u0421\u043E\u0433\u043B\u0430\u0441\u0435\u043D, \u0434\u0430\u0432\u0430\u0439 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C",
        spoken: "Totally on board with that \u2014 let's dive right in.",
        spoken_meaning: "\u041F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E \u2014 \u0434\u0430\u0432\u0430\u0439 \u0441\u0440\u0430\u0437\u0443 \u043F\u0440\u0438\u0441\u0442\u0443\u043F\u0438\u043C",
        written: "Acknowledged. Let's proceed with the implementation.",
        written_meaning: "\u041F\u0440\u0438\u043D\u044F\u0442\u043E. \u041F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u043C \u043A \u0440\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438",
        vocab: "on board with (\u0431\u044B\u0442\u044C \u0441\u043E\u0433\u043B\u0430\u0441\u043D\u044B\u043C) \xB7 dive in (\u0441\u0440\u0430\u0437\u0443 \u043F\u0440\u0438\u0441\u0442\u0443\u043F\u0438\u0442\u044C \u043A \u0434\u0435\u043B\u0443)"
      },
      {
        input: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0439",
        spoken: "Let's keep going.",
        spoken_meaning: "\u0414\u0430\u0432\u0430\u0439 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0442\u044C",
        written: "Proceed with the next steps.",
        written_meaning: "\u041F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u0442\u0435 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u043C \u0448\u0430\u0433\u0430\u043C",
        vocab: "keep going (\u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0442\u044C) \xB7 proceed with (\u043F\u0440\u0438\u0441\u0442\u0443\u043F\u0438\u0442\u044C \u043A)"
      },
      {
        input: "\u042D\u0442\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043A\u0430\u0436\u0435\u0442\u0441\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0441\u043B\u043E\u0436\u043D\u044B\u043C, \u043B\u0443\u0447\u0448\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0443\u044E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0443",
        spoken: "This feels a bit over-engineered; we'd be much better off just sticking with the standard library.",
        spoken_meaning: "\u0412\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043F\u0435\u0440\u0435\u0443\u0441\u043B\u043E\u0436\u043D\u0435\u043D\u043D\u044B\u043C; \u043D\u0430\u043C \u0433\u043E\u0440\u0430\u0437\u0434\u043E \u043F\u0440\u043E\u0449\u0435 \u0434\u0435\u0440\u0436\u0430\u0442\u044C\u0441\u044F \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u0439 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0438",
        written: "The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.",
        written_meaning: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u043F\u043E\u0434\u0445\u043E\u0434 \u0432\u043D\u043E\u0441\u0438\u0442 \u0438\u0437\u043B\u0438\u0448\u043D\u044E\u044E \u0441\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C. \u041F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0443\u044E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0443",
        vocab: "over-engineered (\u043F\u0435\u0440\u0435\u0443\u0441\u043B\u043E\u0436\u043D\u0435\u043D\u043D\u044B\u0439) \xB7 be better off (\u0431\u044B\u0442\u044C \u0432 \u0432\u044B\u0438\u0433\u0440\u044B\u0448\u0435) \xB7 stick with (\u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0442\u044C\u0441\u044F) \xB7 leverage (\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C)"
      }
    ]
  }
};
function buildSystemPrompt(sourceLang = "zh", targetLang = "en", isLongInput = false, context, tone = "general", customSlots) {
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  const spec = LANGUAGE_SPECS[normSource] || LANGUAGE_SPECS.zh;
  const TARGET_LANGUAGE_NAMES = {
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
  const targetName = TARGET_LANGUAGE_NAMES[normTarget] || "English";
  if (Array.isArray(customSlots)) {
    const enabledSlots = customSlots.filter((s) => s.enabled && s.role !== "source");
    let taskLines = [];
    let jsonProps = [];
    if (isLongInput) {
      jsonProps.push(`  "summary": "Concise core intent/question in native ${spec.name} (under 20 words)"`);
    }
    enabledSlots.forEach((slot, idx) => {
      const num = idx + 1;
      const instruction = slot.instruction || `Express the message in ${slot.label} style in authentic ${targetName}.`;
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
    const condensationDirective2 = isLongInput ? `

[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish \u2014 NEVER drop the second half or final question of the user's message!
Keep the phrasing tight and high-density (under 20 words) so the complete meaning of all sentences fits cleanly on 1-2 lines without mid-sentence truncation.` : "";
    const contextDirective2 = context && context.trim() ? `

[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context:
"""
${context.trim().slice(0, 500)}
"""
Ensure the generated translations fit naturally as a responsive reply to this specific context.` : "";
    return `You are an elite bilingual language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into the following requested authentic ${targetName} registers/slots (language B):
${dynamicTasks}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), SQL keywords, variable names, and technical identifiers MUST be preserved 100% verbatim in all outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective2}${contextDirective2}

${dynamicJsonHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
  }
  const defaultSlots = LEGACY_SLOT_PRESETS.developer;
  const legacyConfig = customSlots;
  const slot1Name = legacyConfig?.slot1?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.name : defaultSlots.slot1.name);
  const slot1Instruction = legacyConfig?.slot1?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot1.instruction : defaultSlots.slot1.instruction);
  const slot2Name = legacyConfig?.slot2?.name || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.name : defaultSlots.slot2.name);
  const slot2Instruction = legacyConfig?.slot2?.instruction || (tone === "social" ? LEGACY_SLOT_PRESETS.social.slot2.instruction : defaultSlots.slot2.instruction);
  const anchorText = spec.anchors.map(
    (a) => `Input: ${JSON.stringify(a.input)}
Output: ${JSON.stringify({
      spoken: a.spoken,
      spoken_meaning: a.spoken_meaning,
      written: a.written,
      written_meaning: a.written_meaning,
      vocab: a.vocab
    })}`
  ).join("\n\n");
  const condensationDirective = isLongInput ? `

[LONG INPUT CONDENSATION DIRECTIVE]:
The user's input text has multiple clauses or sentences.
CRITICAL: You MUST preserve and translate EVERY clause and question from start to finish (both in "summary" and in "spoken"/"written") \u2014 NEVER omit the second half or final question of the user's message!
Express all points tightly and concisely (under 22 words each) so the complete meaning fits cleanly within 2 lines without truncation.` : "";
  const contextDirective = context && context.trim() ? `

[CONVERSATION & THREAD CONTEXT]:
The user's message is a reply to or continuation of the following context (e.g. tweet, thread, issue):
"""
${context.trim().slice(0, 500)}
"""
Ensure the generated spoken and written translations fit naturally as a responsive reply to this specific context, using authentic conversational grounding.` : "";
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
  return `You are an elite bilingual developer language coach and cross-register translation architect.
Task:
Translate the user's message from native ${spec.name} (language A) into TWO distinct authentic ${targetName} registers (Slot 1 and Slot 2), and provide the exact back-translation/nuance in native ${spec.name} for each register:
1. "spoken" (Slot 1: ${slot1Name}): ${slot1Instruction}
2. "spoken_meaning": The exact nuance and meaning of Slot 1 ${spec.meaningInstruction}.
3. "written" (Slot 2: ${slot2Name}): ${slot2Instruction}
4. "written_meaning": The exact nuance and meaning of Slot 2 ${spec.meaningInstruction}.
5. "vocab": Adaptively extract ALL key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions bridging the user to high-level/native fluency. Do NOT artificially cap at 1-2; extract as many as genuinely beneficial, while keeping each definition concise ${spec.vocabInstruction} to ensure the terminal HUD remains vertically compact.

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), SQL keywords, variable names, and technical identifiers MUST be preserved 100% verbatim in both spoken and written outputs. Never translate, rephrase, or drop code tokens.
${condensationDirective}${contextDirective}${toneDirective}

[GOLDEN FEW-SHOT ANCHORS]:
${anchorText}

${jsonFormatHint}
Output valid JSON ONLY. Never output markdown code fences, backticks, quotes, or explanations.`;
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
  it: "Italian"
};
function resolvePromptTargetLangName(sourceLang = "zh", targetLang = "en", promptLang) {
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const normTarget = (targetLang || "en").toLowerCase().split("-")[0];
  const raw = (promptLang || "").trim().toLowerCase();
  const code = !raw || raw === "default" || raw === "auto" ? normTarget : raw === "native" || raw === "source" || raw === "\u6BCD\u8BED" ? normSource : raw.split("-")[0];
  return {
    code,
    name: PROMPT_TARGET_LANGUAGE_NAMES[code] || "English"
  };
}
function buildDirectRewriteSystemPrompt(options) {
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang,
    options.targetLang,
    options.promptLang
  );
  const customRuleBlock = options.promptRule && options.promptRule.trim() ? `

[USER CUSTOM SPECIFICATION & STACKED RULES - MANDATORY]:
Weave and enforce the following user-specified requirements directly into the rewritten prompt:
"""
${options.promptRule.trim()}
"""` : "";
  return `You are an elite AI Coding Prompt Architect.
The user is typing a raw, potentially messy, colloquial, or fragmented instruction for an AI coding agent.
Your sole task is to rewrite, structure, standardize, and optimize their input into a high-efficiency, unambiguous engineering prompt in **${outLangName}**:
1. **Structure & Clarify**: Distill rambling or colloquial thoughts into a logical, well-structured instruction without losing any concrete detail or question.
2. **Standardize & Sharpen**: Use precise software engineering terminology in **${outLangName}** and eliminate conversational filler.
3. **High-Efficiency Alignment**: Keep the prompt concise, direct, and actionable \u2014 never invent unrequested features or bloat scope.
4. **Code & Symbol Shield**: Preserve all inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, and identifiers 100% verbatim.${customRuleBlock}

Strict JSON format:
{
  "prompt": "..."
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}
function buildPromptCandidatesSystemPrompt(options) {
  const normSource = (options.sourceLang || "zh").toLowerCase().split("-")[0];
  const { name: outLangName } = resolvePromptTargetLangName(
    options.sourceLang,
    options.targetLang,
    options.promptLang
  );
  const slots = (Array.isArray(options.promptSlots) && options.promptSlots.length > 0 ? options.promptSlots : getDefaultPromptSlots(normSource)).filter((s) => s.enabled !== false);
  const activeSlots = slots.length > 0 ? slots : getDefaultPromptSlots(normSource);
  const taskLines = activeSlots.map(
    (s, idx) => `${idx + 1}. "${s.id}" (${s.label}): ${s.instruction} (MUST be written in **${outLangName}**)`
  );
  const jsonProps = activeSlots.map((s) => `  "${s.id}": "..."`);
  const customRuleBlock = options.promptRule && options.promptRule.trim() ? `

[USER CUSTOM SPECIFICATION & STACKED RULES - MANDATORY]:
Ensure every generated candidate incorporates the following user-specified requirements:
"""
${options.promptRule.trim()}
"""` : "";
  return `You are an elite AI Coding Prompt Architect.
The user is typing a raw, potentially messy or colloquial instruction for an AI coding agent.
Generate ${activeSlots.length} distinct, optimized prompt candidates in **${outLangName}** corresponding to the following styles so the user can choose the best one to send:
${taskLines.join("\n")}

[CODE & SYMBOL SHIELD - STRICT RULE]:
All inline code (\`foo()\`), file paths (@file, path/to/file), CLI flags, and technical identifiers MUST be preserved 100% verbatim in every candidate.${customRuleBlock}

Strict JSON format:
{
${jsonProps.join(",\n")}
}
Output valid JSON ONLY. Never output markdown code fences or explanations.`;
}

// src/presets.ts
function createCustomSlot(params) {
  const normId = params.id.trim().toLowerCase();
  const role = params.role || (normId === "source" ? "source" : normId === "vocab" ? "vocab" : "translation");
  return {
    id: normId,
    label: params.label.trim(),
    role,
    instruction: params.instruction?.trim() || (role === "source" ? void 0 : "Natural, authentic expressions matching requested context."),
    showMeaning: params.showMeaning !== void 0 ? params.showMeaning : role !== "source" && role !== "vocab",
    enabled: params.enabled !== void 0 ? params.enabled : true
  };
}
function addSlotToList(slots, newSlot) {
  const normId = newSlot.id.trim().toLowerCase();
  const existingIndex = slots.findIndex((s) => s.id.toLowerCase() === normId);
  if (existingIndex >= 0) {
    const copy = [...slots];
    copy[existingIndex] = { ...newSlot, id: normId };
    return copy;
  }
  return [...slots, { ...newSlot, id: normId }];
}
function removeSlotFromList(slots, slotId) {
  const normId = slotId.trim().toLowerCase();
  return slots.filter((s) => s.id.toLowerCase() !== normId);
}
function toggleSlotInList(slots, slotId) {
  const normId = slotId.trim().toLowerCase();
  return slots.map((s) => s.id.toLowerCase() === normId ? { ...s, enabled: !s.enabled } : s);
}
var SLOT_PRESETS = {
  developer: {
    name: "Developer",
    description: "Standard agile collaboration: Spoken + Written + Vocab",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: isZh ? "\u53E3\u8BED" : isJa ? "\u53E3\u8A9E" : "Spoken", role: "translation", instruction: "Natural, fluent spoken flow (daily standup, Slack, agile collaboration, conversational banter).", showMeaning: true, enabled: true },
        { id: "written", label: isZh ? "\u5199\u4F5C" : isJa ? "\u6587\u9762" : "Written", role: "translation", instruction: "Clear, precise, modern technical written prose (RFCs, PR descriptions, documentation, deep insight).", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : isJa ? "\u5358\u8A9E" : "Vocab", role: "vocab", instruction: "Extract key idiomatic collocations, phrasal verbs, or technical idioms.", enabled: true }
      ];
    }
  },
  social: {
    name: "Social",
    description: "Overseas Twitter / Community building: Hook + Deep + Vocab",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "Hook", role: "translation", instruction: "High-engagement, punchy opening hook optimized for Twitter/X threads and viral developer discussions.", showMeaning: true, enabled: true },
        { id: "written", label: "Deep", role: "translation", instruction: "Insightful, narrative technical value and nuanced architecture reasoning.", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : "Vocab", role: "vocab", instruction: "Key engagement idioms and technical phrases.", enabled: true }
      ];
    }
  },
  japanese: {
    name: "Japanese",
    description: "Dual-register Japanese companion: \u53E3\u8A9E + \u656C\u8A9E + \u5358\u8BED",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "\u53E3\u8A9E", role: "translation", instruction: "Natural, colloquial spoken Japanese (daily casual chat, team talk, direct).", showMeaning: true, enabled: true },
        { id: "written", label: "\u656C\u8A9E", role: "translation", instruction: "Formal, polite business Japanese (Keigo, Sonkeigo/Kenjougo, professional email/PR).", showMeaning: true, enabled: true },
        { id: "vocab", label: "\u5358\u8A9E", role: "vocab", instruction: "Key Japanese vocabulary, kanji readings, and idiomatic expressions.", enabled: true }
      ];
    }
  },
  academic: {
    name: "Academic",
    description: "Paper & rigorous discussion: Discussion + Paper",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: "Discussion", role: "translation", instruction: "Academic colloquium and seminar discussion tone.", showMeaning: true, enabled: true },
        { id: "written", label: "Paper", role: "translation", instruction: "Formal, objective academic prose suitable for peer-reviewed IEEE/ACM papers and arXiv preprints.", showMeaning: true, enabled: true },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : "Vocab", role: "vocab", enabled: false }
      ];
    }
  },
  compact2: {
    name: "Compact 2-Slot",
    description: "Minimalist dual-slot: Source + Target translation only",
    slots: (sourceLang = "en") => {
      const isZh = sourceLang === "zh" || sourceLang === "tw";
      const isJa = sourceLang === "ja";
      return [
        { id: "source", label: isZh ? "\u539F\u6587" : isJa ? "\u539F\u6587" : "Source", role: "source", enabled: true },
        { id: "spoken", label: isZh ? "\u8BD1\u6587" : isJa ? "\u8A33\u6587" : "Translation", role: "translation", instruction: "Natural, idiomatic target language translation.", showMeaning: true, enabled: true },
        { id: "written", label: isZh ? "\u5199\u4F5C" : "Written", role: "translation", enabled: false },
        { id: "vocab", label: isZh ? "\u91CD\u70B9" : "Vocab", role: "vocab", enabled: false }
      ];
    }
  }
};
function resolveSlotsForPreset(presetName = "developer", sourceLang = "en") {
  const normPreset = (presetName || "developer").toLowerCase().trim();
  const preset = SLOT_PRESETS[normPreset] || SLOT_PRESETS.developer;
  return preset.slots(sourceLang);
}
var LANGUAGE_PRESETS = {
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
    notifyAgentHelp: '\u{1F4A1} \u5185\u7F6E lingual-tuner \u69FD\u4F4D\u8C03\u4F18\u6280\u80FD\uFF1A\u76F4\u63A5\u5BF9\u5F53\u524D Agent \u8BF4 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66\uFF1A\u53EA\u8981\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587" \u5373\u53EF\u514D\u547D\u4EE4\u81EA\u52A8\u88C5\u914D\uFF01\u5207\u6362\u6BCD\u8BED\u8BF7\u8FD0\u884C /lang <code>\u3002',
    notifyModelSwitched: "\u4F34\u5B66\u6A21\u578B\u5DF2\u5207\u6362\u4E3A: {model}",
    notifyLangSwitched: "\u4F34\u5B66\u8BED\u8A00\u5DF2\u5207\u6362\u4E3A: {lang}\uFF08\u63D0\u793A\uFF1A\u547D\u4EE4\u8865\u5168\u83DC\u5355\u6587\u9762\u5C06\u5728\u91CD\u542F\u7EC8\u7AEF\u540E\u5B8C\u5168\u540C\u6B65\uFF09",
    notifyLangInvalid: "\u65E0\u6548\u7684\u8BED\u8A00\u4EE3\u7801\u3002\u652F\u6301\u7684\u8BED\u8A00\u4EE3\u7801: zh, ja, en, es, fr, de",
    notifyCompactOn: "[zh \u21C4 en] \u5DF2\u5F00\u542F\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\uFF1A\u6781\u7B80\u5360\u4F4D\uFF0C\u4FDD\u62A4\u5206\u5C4F\u89C6\u91CE",
    notifyCompactOff: "[zh \u21C4 en] \u5DF2\u5207\u6362\u4E3A\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784\uFF1A\u5C55\u793A\u5B8C\u6574\u53CC\u6A21\u4E0E\u8BED\u611F",
    notifyTimeout: "[zh \u21C4 en] \u82F1\u6587\u7FFB\u8BD1\u8BF7\u6C42\u672A\u5C31\u7EEA\u6216\u8D85\u65F6\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    notifyError: "[zh \u21C4 en] \u82F1\u6587\u7FFB\u8BD1\u8BF7\u6C42\u5F02\u5E38\uFF0C\u672C\u6B21\u5DF2\u653E\u884C\u539F\u6587",
    cmdDescMode: "\u5207\u6362\u4F34\u5B66\u6A21\u5F0F [zh \u21C4 en]: [\u539F\u6587] \u2794 [\u82F1\u6587] \u2794 [\u5173]",
    cmdDescStatus: "\u67E5\u770B\u4F34\u5B66\u63D2\u4EF6\u5F53\u524D\u72B6\u6001\u62A5\u544A\u4E0E\u6A21\u578B\u8BCA\u65AD: /lingual-status",
    cmdDescModel: "\u67E5\u770B\u6216\u5207\u6362\u4F34\u5B66\u6A21\u578B [zh \u21C4 en]: /lingual-model [model-id|auto]",
    cmdDescLang: "\u67E5\u770B\u6216\u5207\u6362\u4F34\u5B66\u6BCD\u8BED [zh \u21C4 en]: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "\u5207\u6362\u5355\u884C\u80F6\u56CA\u6A21\u5F0F\u4E0E\u5B8C\u6574\u6811\u72B6\u56FE: /lingual-compact",
    cmdDescLast: "\u91CD\u65B0\u56DE\u770B\u6216\u91CD\u73B0\u4E0A\u4E00\u6761\u4F34\u5B66\u5361\u7247: /lingual-last",
    cmdDescAgent: "\u67E5\u770B\u4F34\u5B66\u5B9A\u5236\u4E0E\u6BCD\u8BED\u5207\u6362\u6307\u5357: /lingual-agent",
    shortcutNextPage: "\u5207\u6362\u81F3\u4E0B\u4E00\u6BB5\u4F34\u5B66\u5207\u7247",
    shortcutPrevPage: "\u5207\u6362\u81F3\u4E0A\u4E00\u6BB5\u4F34\u5B66\u5207\u7247",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u5199",
    layoutCapsule: "\u5355\u884C\u80F6\u56CA\u6781\u7B80\u6D41 (1-Line Capsule)",
    layoutTree: "Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784 (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u8FD0\u884C\u72B6\u6001\u62A5\u544A",
    statusReportMode: "\u5F53\u524D\u6A21\u5F0F",
    statusReportFlow: "\u8BED\u8A00\u6D41\u5411",
    statusReportModel: "\u4F34\u5B66\u6A21\u578B",
    statusReportCache: "\u4F1A\u8BDD\u7F13\u5B58",
    statusReportLayout: "HUD\u5E03\u5C40: Trifecta \u5F00\u653E\u5F0F\u5DE6\u5BFC\u8F68\u6811\u72B6\u67B6\u6784 (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\u51ED\u636E\u6A21\u5F0F: Pi \u539F\u751F\u8FDB\u7A0B\u5185\u8BA4\u8BC1 (Zero Config \xB7 \u96F6Token\u6CC4\u9732)",
    statusReportShortcuts: "\u5FEB\u6377\u64CD\u4F5C: /lingual (\u5207\u6362\u6A21\u5F0F) \xB7 /slots (\u7BA1\u7406\u69FD\u4F4D) \xB7 /lang (\u5207\u8BED\u8A00) \xB7 /lingual-compact (\u5207\u6362\u5E03\u5C40)",
    statusReportTuner: "\u69FD\u4F4D\u8C03\u4F18: \u5185\u7F6E lingual-tuner \u6280\u80FD\uFF08\u76F4\u63A5\u5411 Agent \u63CF\u8FF0\u5373\u53EF\u514D\u547D\u4EE4\u5B9A\u5236\uFF09",
    modeDescOriginal: "\u539F\u6587\u76F4\u901A \xB7 0ms\u975E\u963B\u585E",
    modeDescEnglish: "\u82F1\u6587\u6A21\u5F0F \xB7 \u6DF1\u5EA6\u4EE3\u7801\u63A8\u7406",
    modeDescOff: "\u5DF2\u5173\u95ED",
    modelCurrentLabel: "\u5F53\u524D\u4F34\u5B66\u6A21\u578B",
    modelFollowSession: "\u8DDF\u968F\u4F1A\u8BDD",
    modelAvailableListHeader: "\u53EF\u7528\u6A21\u578B (\u8F93\u5165 /lingual-model <id> \u5207\u6362):",
    modelAutoFollowDesc: "auto (\u81EA\u52A8\u8DDF\u968F\u5F53\u524D\u4F1A\u8BDD\u4E3B\u6A21\u578B)",
    modelSelectHint: "\u53EF\u8F93\u5165 /lingual-model <model-id> \u6216 auto \u6307\u5B9A\u4F34\u5B66\u6A21\u578B\u3002",
    langUsageHint: "\u7528\u6CD5: /lang <zh|ja|en|es|fr|de> [target] (\u5982 /lang ja \u6216 /lang zh ja)",
    langList: [
      "\u2022 zh (\u4E2D\u6587 \u2794 \u82F1\u6587)",
      "\u2022 ja (\u65E5\u672C\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 en (\u82F1\u6587 \u2794 \u65E5\u6587)",
      "\u2022 es (\u897F\u73ED\u7259\u6587 \u2794 \u82F1\u6587)",
      "\u2022 fr (\u6CD5\u6587 \u2794 \u82F1\u6587)",
      "\u2022 de (\u5FB7\u6587 \u2794 \u82F1\u6587)"
    ],
    // 动态槽位架构本地化文案 (中文)
    slotsHeader: "\u52A8\u6001\u69FD\u4F4D\u67B6\u6784",
    slotsActiveTag: "\u6FC0\u6D3B",
    slotsNone: "\u672A\u914D\u7F6E\u4EFB\u4F55\u69FD\u4F4D",
    slotsStatusEnabled: "\u5DF2\u542F\u7528",
    slotsStatusDisabled: "\u5DF2\u7981\u7528",
    slotsWithNuance: " +\u6BCD\u8BED\u5FAE\u91CA\u4E49",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8BED\u8A00\u5B9A\u5236\uFF08\u76F4\u63A5\u5411\u5F53\u524D Agent \u63CF\u8FF0\uFF0C\u65E0\u9700\u624B\u52A8\u8F93\u5165\u547D\u4EE4\uFF09\uFF1A",
    slotsNlExamples: [
      '\u2022 "\u5E2E\u6211\u5B9A\u5236\u4F34\u5B66\uFF1A\u53EA\u8981\u63A8\u7279\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\uFF0C\u4E0D\u8981\u539F\u6587"',
      '\u2022 "\u628A\u4F34\u5B66\u6539\u6210\u5355\u69FD\u4F4D\u7EAF\u8BD1\u6587"',
      '\u2022 "\u6062\u590D\u9ED8\u8BA4\u4F34\u5B66\u69FD\u4F4D"'
    ],
    slotsCliTitle: "\u26A1\uFE0F \u5E38\u7528\u5FEB\u6377\u547D\u4EE4\uFF1A",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \u7269\u7406\u9690\u85CF\u539F\u6587\u884C",
      "\u2022 /slots compact2        - \u6781\u7B80\u53CC\u69FD\u4F4D",
      "\u2022 /slots reset           - \u6062\u590D\u521D\u59CB\u9ED8\u8BA4",
      "\u2022 /slots toggle <id>     - \u4E34\u65F6\u5F00\u5173\u69FD\u4F4D"
    ],
    slotsResetSuccess: "[{pair}] \u5DF2\u91CD\u7F6E\u69FD\u4F4D\u4E3A\u521D\u59CB\u9ED8\u8BA4\u72B6\u6001\uFF08\u539F\u6587 + \u53E3\u8BED + \u5199\u4F5C + \u91CD\u70B9\uFF09",
    slotsRemovedSuccess: '[{pair}] \u5DF2\u79FB\u9664\u69FD\u4F4D [{id}] ("{label}")',
    slotsRemovedSourceNote: "\uFF08\u5DF2\u7269\u7406\u9690\u85CF\u539F\u6587\u884C\uFF09",
    slotsToggled: "[{pair}] \u69FD\u4F4D [{id}] \u5F53\u524D\u72B6\u6001: {status}",
    slotsAdded: '[{pair}] \u5DF2\u6DFB\u52A0/\u66F4\u65B0\u69FD\u4F4D [{id}] "{label}"',
    slotsNotFound: "[{pair}] \u672A\u627E\u5230\u69FD\u4F4D [{id}]\u3002\u8FD0\u884C /slots \u67E5\u770B\u5F53\u524D\u69FD\u4F4D",
    slotsUsageAdd: "\u7528\u6CD5: /slots add <id> <\u6807\u7B7E> [\u63D0\u793A\u8BCD...]\n\u793A\u4F8B: /slots add twitter \u63A8\u6587 280\u5B57\u7B26\u4EE5\u5185\u7206\u6B3E\u6280\u672F\u63A8\u6587",
    slotsUsageRm: "\u7528\u6CD5: /slots rm <\u69FD\u4F4DID> (\u4F8B\u5982 /slots rm source \u9690\u85CF\u539F\u6587)",
    slotsUsageToggle: "\u7528\u6CD5: /slots toggle <\u69FD\u4F4DID>",
    slotsUnknown: '[{pair}] \u672A\u77E5\u69FD\u4F4D\u547D\u4EE4\u6216\u9884\u8BBE "{cmd}"\u3002\u8F93\u5165 /slots \u67E5\u770B\u5F53\u524D\u69FD\u4F4D\u4E0E\u5E2E\u52A9'
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
    notifyOriginal: "[ja \u21C4 en] \u3010\u539F\u6587\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u5165\u529B\u306F\u539F\u6587\u306E\u307E\u307E\u3001\u4E0A\u90E8\u30AB\u30FC\u30C9\u3067\u82F1\u8A9E\u3092\u8868\u793A",
    notifyEnglish: "[ja \u21C4 en] \u3010\u82F1\u8A9E\u30E2\u30FC\u30C9\u3011\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1AAI\u3078\u306E\u5165\u529B\u306F\u7D14\u7C8B\u306A\u6280\u8853\u82F1\u8A9E\u306B\u81EA\u52D5\u5909\u63DB\u3055\u308C\u307E\u3059",
    notifyOff: "[ja \u21C4 en] \u4F34\u8D70\u6A5F\u80FD\u3092\u30AA\u30D5\u306B\u3057\u307E\u3057\u305F",
    notifyPaging: "[ja \u21C4 en] \u9577\u6587\u3092\u5206\u5272\u3057\u307E\u3057\u305F\u3002Alt+. \u307E\u305F\u306F Alt+, \u3067\u30DA\u30FC\u30B8\u9001\u308A",
    notifyNoHistory: "[ja \u21C4 en] \u524D\u56DE\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093",
    notifyHistoryRestored: "[ja \u21C4 en] \u524D\u56DE\u306E\u30AB\u30FC\u30C9\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F",
    notifyAgentHelp: "\u{1F4A1} lingual-tuner \u30B9\u30ED\u30C3\u30C8\u8ABF\u6574\u30B9\u30AD\u30EB\u642D\u8F09\uFF1AAgent\u306B\u300C\u30C4\u30A4\u30FC\u30C8\u3068\u6280\u8853\u7684\u6D1E\u5BDF\u306E\u307F\u3001\u539F\u6587\u306F\u4E0D\u8981\u300D\u3068\u4F1D\u3048\u308B\u3060\u3051\u3067\u81EA\u52D5\u8A2D\u5B9A\u5B8C\u4E86\uFF01\u6BCD\u8A9E\u5207\u66FF\u306F /lang <code> \u3067\u3059\u3002",
    notifyModelSwitched: "\u30E2\u30C7\u30EB\u3092\u5207\u308A\u66FF\u3048\u307E\u3057\u305F: {model}",
    notifyLangSwitched: "\u6BCD\u8A9E\u3092\u5207\u308A\u66FF\u3048\u307E\u3057\u305F: {lang}\uFF08\u203B\u30B3\u30DE\u30F3\u30C9\u88DC\u5B8C\u30E1\u30CB\u30E5\u30FC\u306E\u6587\u9762\u306F\u7AEF\u672B\u518D\u8D77\u52D5\u5F8C\u306B\u5B8C\u5168\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\uFF09",
    notifyLangInvalid: "\u7121\u52B9\u306A\u8A00\u8A9E\u30B3\u30FC\u30C9\u3067\u3059\u3002\u5BFE\u5FDC\u8A00\u8A9E: zh, ja, en, es, fr, de",
    notifyCompactOn: "[ja \u21C4 en] 1\u884C\u30AB\u30D7\u30BB\u30EB\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F\uFF1A\u753B\u9762\u9818\u57DF\u3092\u6700\u5927\u9650\u78BA\u4FDD",
    notifyCompactOff: "[ja \u21C4 en] \u30D5\u30EB\u30C4\u30EA\u30FC\u8868\u793A\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\uFF1A\u8A73\u7D30\u306A\u30CB\u30E5\u30A2\u30F3\u30B9\u3092\u8868\u793A",
    notifySlotSwitched: "[ja \u21C4 en] \u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u3092 [{preset}] \u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F: {desc}",
    notifyTimeout: "[ja \u21C4 en] \u82F1\u8A9E\u7FFB\u8A33\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    notifyError: "[ja \u21C4 en] \u82F1\u8A9E\u7FFB\u8A33\u30EA\u30AF\u30A8\u30B9\u30C8\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u539F\u6587\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F",
    cmdDescMode: "\u30E2\u30FC\u30C9\u5207\u66FF [ja \u21C4 en]: [\u539F\u6587] \u2794 [\u82F1\u8A9E] \u2794 [\u30AA\u30D5]",
    cmdDescStatus: "\u72B6\u614B\u30EC\u30DD\u30FC\u30C8\u3068\u30E2\u30C7\u30EB\u8A3A\u65AD\u3092\u8868\u793A: /lingual-status",
    cmdDescModel: "\u5B66\u7FD2\u30E2\u30C7\u30EB\u306E\u78BA\u8A8D\u30FB\u5207\u66FF: /lingual-model [model-id|auto]",
    cmdDescLang: "\u4F34\u8D70\u306E\u6BCD\u8A9E\u3092\u78BA\u8A8D\u30FB\u5909\u66F4: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "\u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u306E\u78BA\u8A8D\u30FB\u5207\u66FF [ja \u21C4 en]: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A\u3068\u30D5\u30EB\u30C4\u30EA\u30FC\u306E\u5207\u66FF: /lingual-compact",
    cmdDescLast: "\u524D\u56DE\u306E\u4F34\u8D70\u30AB\u30FC\u30C9\u3092\u518D\u8868\u793A: /lingual-last",
    cmdDescAgent: "\u4F34\u8D70\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3068\u6BCD\u8A9E\u5909\u66F4\u306E\u6848\u5185\u3092\u8868\u793A: /lingual-agent",
    shortcutNextPage: "\u6B21\u306E\u30BB\u30B0\u30E1\u30F3\u30C8\u306B\u5207\u308A\u66FF\u3048",
    shortcutPrevPage: "\u524D\u306E\u30BB\u30B0\u30E1\u30F3\u30C8\u306B\u5207\u308A\u66FF\u3048",
    capsuleSlot1Prefix: "\u53E3",
    capsuleSlot2Prefix: "\u6587",
    layoutCapsule: "1\u884C\u30AB\u30D7\u30BB\u30EB\u8868\u793A (1-Line Capsule)",
    layoutTree: "Trifecta \u30AA\u30FC\u30D7\u30F3\u5DE6\u30EC\u30FC\u30EB\u30C4\u30EA\u30FC\u69CB\u9020 (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "\u30B9\u30C6\u30FC\u30BF\u30B9\u30EC\u30DD\u30FC\u30C8",
    statusReportMode: "\u73FE\u5728\u306E\u30E2\u30FC\u30C9",
    statusReportFlow: "\u8A00\u8A9E\u30D5\u30ED\u30FC",
    statusReportModel: "\u4F34\u8D70\u30E2\u30C7\u30EB",
    statusReportCache: "\u30BB\u30C3\u30B7\u30E7\u30F3\u30AD\u30E3\u30C3\u30B7\u30E5",
    statusReportLayout: "HUD\u30EC\u30A4\u30A2\u30A6\u30C8: Trifecta \u30AA\u30FC\u30D7\u30F3\u5DE6\u30EC\u30FC\u30EB\u30C4\u30EA\u30FC\u69CB\u9020 (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "\u8A8D\u8A3C\u65B9\u5F0F: Pi \u30CD\u30A4\u30C6\u30A3\u30D6\u30A4\u30F3\u30D7\u30ED\u30BB\u30B9\u8A8D\u8A3C (\u30BC\u30ED\u8A2D\u5B9A\u30FBToken\u5B89\u5168)",
    statusReportShortcuts: "\u30AF\u30A4\u30C3\u30AF\u64CD\u4F5C: /lingual (\u30E2\u30FC\u30C9\u5207\u66FF) \xB7 /slots (\u30B9\u30ED\u30C3\u30C8\u7BA1\u7406) \xB7 /lang (\u8A00\u8A9E\u5207\u66FF) \xB7 /lingual-compact (\u30EC\u30A4\u30A2\u30A6\u30C8\u5207\u66FF)",
    statusReportTuner: "\u30B9\u30ED\u30C3\u30C8\u8ABF\u6574: lingual-tuner \u30B9\u30AD\u30EB\u642D\u8F09\uFF08Agent\u306B\u8981\u671B\u3092\u4F1D\u3048\u308B\u3060\u3051\u3067\u8A2D\u5B9A\uFF09",
    modeDescOriginal: "\u539F\u6587\u30D1\u30B9\u30B9\u30EB\u30FC \xB7 0ms\u975E\u540C\u671F",
    modeDescEnglish: "\u82F1\u8A9E\u30E2\u30FC\u30C9 \xB7 \u9AD8\u5EA6\u30B3\u30FC\u30C9\u63A8\u8AD6",
    modeDescOff: "\u30AA\u30D5",
    modelCurrentLabel: "\u73FE\u5728\u306E\u5B66\u7FD2\u30E2\u30C7\u30EB",
    modelFollowSession: "\u30BB\u30C3\u30B7\u30E7\u30F3\u9023\u52D5",
    modelAvailableListHeader: "\u5229\u7528\u53EF\u80FD\u306A\u30E2\u30C7\u30EB (/lingual-model <id> \u3067\u5207\u66FF):",
    modelAutoFollowDesc: "auto (\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u4E3B\u30E2\u30C7\u30EB\u306B\u81EA\u52D5\u8FFD\u5F93)",
    modelSelectHint: "/lingual-model <model-id> \u307E\u305F\u306F auto \u3092\u5165\u529B\u3057\u3066\u30E2\u30C7\u30EB\u3092\u6307\u5B9A\u3067\u304D\u307E\u3059\u3002",
    langUsageHint: "\u4F7F\u3044\u65B9: /lang <zh|ja|en|es|fr|de> [target] (\u4F8B: /lang ja \u307E\u305F\u306F /lang zh ja)",
    langList: [
      "\u2022 zh (\u4E2D\u56FD\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 ja (\u65E5\u672C\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 en (\u82F1\u8A9E \u2794 \u65E5\u672C\u8A9E)",
      "\u2022 es (\u30B9\u30DA\u30A4\u30F3\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 fr (\u30D5\u30E9\u30F3\u30B9\u8A9E \u2794 \u82F1\u8A9E)",
      "\u2022 de (\u30C9\u30A4\u30C4\u8A9E \u2794 \u82F1\u8A9E)"
    ],
    // 動的スロット構成ローカライズ文言 (日本語)
    slotsHeader: "\u52D5\u7684\u30B9\u30ED\u30C3\u30C8\u69CB\u6210",
    slotsActiveTag: "\u6709\u52B9",
    slotsNone: "\u30B9\u30ED\u30C3\u30C8\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    slotsStatusEnabled: "\u6709\u52B9",
    slotsStatusDisabled: "\u7121\u52B9",
    slotsWithNuance: " +\u30CB\u30E5\u30A2\u30F3\u30B9",
    slotsNlTitle: "\u{1F4AC} \u81EA\u7136\u8A00\u8A9E\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\uFF08\u73FE\u5728\u306E Agent \u306B\u76F4\u63A5\u4F1D\u3048\u308B\u3060\u3051\uFF09\uFF1A",
    slotsNlExamples: [
      "\u2022 \u300C\u4F34\u8D70\u30B9\u30ED\u30C3\u30C8\u3092\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3057\u3066\uFF1A\u30C4\u30A4\u30FC\u30C8\u3068\u6280\u8853\u7684\u6D1E\u5BDF\u306E\u307F\u3001\u539F\u6587\u306F\u4E0D\u8981\u300D",
      "\u2022 \u300C1\u884C\u306E\u7D14\u7C8B\u306A\u8A33\u6587\u306E\u307F\u306B\u5909\u66F4\u3057\u3066\u300D",
      "\u2022 \u300C\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u306B\u623B\u3057\u3066\u300D"
    ],
    slotsCliTitle: "\u26A1\uFE0F \u30AF\u30A4\u30C3\u30AFCLI\u30B3\u30DE\u30F3\u30C9\uFF1A",
    slotsCliHelp: [
      "\u2022 /slots rm source       - \u539F\u6587\u884C\u3092\u5B8C\u5168\u306B\u975E\u8868\u793A",
      "\u2022 /slots compact2        - \u30DF\u30CB\u30DE\u30EB2\u30B9\u30ED\u30C3\u30C8",
      "\u2022 /slots reset           - \u30C7\u30D5\u30A9\u30EB\u30C8\u72B6\u614B\u306B\u30EA\u30BB\u30C3\u30C8",
      "\u2022 /slots toggle <id>     - \u30B9\u30ED\u30C3\u30C8\u306E\u4E00\u6642\u7684\u306A\u30AA\u30F3/\u30AA\u30D5"
    ],
    slotsResetSuccess: "[{pair}] \u30B9\u30ED\u30C3\u30C8\u69CB\u6210\u3092\u30C7\u30D5\u30A9\u30EB\u30C8\u306B\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F",
    slotsRemovedSuccess: '[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] ("{label}") \u3092\u524A\u9664\u3057\u307E\u3057\u305F',
    slotsRemovedSourceNote: "\uFF08\u539F\u6587\u884C\u306F\u975E\u8868\u793A\u306B\u306A\u308A\u307E\u3059\uFF09",
    slotsToggled: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u306F\u73FE\u5728: {status}",
    slotsAdded: '[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] "{label}" \u3092\u8FFD\u52A0/\u66F4\u65B0\u3057\u307E\u3057\u305F',
    slotsNotFound: "[{pair}] \u30B9\u30ED\u30C3\u30C8 [{id}] \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002/slots \u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044",
    slotsUsageAdd: "\u4F7F\u3044\u65B9: /slots add <id> <\u30E9\u30D9\u30EB> [\u30D7\u30ED\u30F3\u30D7\u30C8...]\n\u4F8B: /slots add twitter \u30C4\u30A4\u30FC\u30C8 280\u5B57\u4EE5\u5185\u306E\u6280\u8853\u30C4\u30A4\u30FC\u30C8",
    slotsUsageRm: "\u4F7F\u3044\u65B9: /slots rm <\u30B9\u30ED\u30C3\u30C8ID> (\u4F8B: /slots rm source)",
    slotsUsageToggle: "\u4F7F\u3044\u65B9: /slots toggle <\u30B9\u30ED\u30C3\u30C8ID>",
    slotsUnknown: '[{pair}] \u672A\u77E5\u306E\u30B3\u30DE\u30F3\u30C9\u307E\u305F\u306F\u30D7\u30EA\u30BB\u30C3\u30C8 "{cmd}" \u3067\u3059\u3002/slots \u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044'
  },
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
    notifyOriginal: "[en \u21C4 ja] Switched to [Original] mode: Prompt passed to AI unmodified, HUD displays translations",
    notifyEnglish: "[en \u21C4 ja] Switched to [English] mode: Prompt transformed into idiomatic technical English",
    notifyOff: "[en \u21C4 ja] Companion turned off",
    notifyPaging: "[en \u21C4 ja] Long prompt segmented. Press Alt+. or Alt+, to navigate pages",
    notifyNoHistory: "[en \u21C4 ja] No previous companion card recorded",
    notifyHistoryRestored: "[en \u21C4 ja] Restored previous companion card",
    notifyAgentHelp: '\u{1F4A1} Built-in lingual-tuner skill: Just tell your Agent "Customize companion: tweet and deep insight only, no source text" to tune slots in 1 turn! Switch language via /lang <code>.',
    notifyModelSwitched: "Companion model switched to: {model}",
    notifyLangSwitched: "Native language switched to: {lang} (Note: Command autocomplete descriptions will fully refresh on terminal restart)",
    notifyLangInvalid: "Invalid language code. Supported: zh, ja, en, es, fr, de",
    notifyCompactOn: "[en \u21C4 ja] Single-line capsule mode enabled for compact split panes",
    notifyCompactOff: "[en \u21C4 ja] Full tree layout restored",
    notifySlotSwitched: "[en \u21C4 ja] Switched slot architecture to [{preset}]: {desc}",
    notifyTimeout: "[en \u21C4 ja] English translation timed out or not ready; original prompt passed",
    notifyError: "[en \u21C4 ja] English translation request error; original prompt passed",
    cmdDescMode: "Cycle companion mode [en \u21C4 ja]: [Original] \u2794 [English] \u2794 [Off]",
    cmdDescStatus: "Display companion status report and model diagnosis: /lingual-status",
    cmdDescModel: "Inspect or switch companion model: /lingual-model [model-id|auto]",
    cmdDescLang: "View or switch companion native language: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Inspect or switch slot architecture: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Toggle single-line capsule mode: /lingual-compact",
    cmdDescLast: "Replay previous companion card: /lingual-last",
    cmdDescAgent: "Display companion customization & language guide: /lingual-agent",
    shortcutNextPage: "Switch to next companion segment",
    shortcutPrevPage: "Switch to previous companion segment",
    capsuleSlot1Prefix: "Spk",
    capsuleSlot2Prefix: "Wrt",
    layoutCapsule: "Single-Line Capsule (1-Line)",
    layoutTree: "Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)",
    statusReportTitle: "Companion Status Report",
    statusReportMode: "Current mode",
    statusReportFlow: "Language flow",
    statusReportModel: "Companion model",
    statusReportCache: "Session Cache",
    statusReportLayout: "HUD Layout: Trifecta Minimalist Left-Rail Tree (\xB7 \u250C \u251C \u2514)",
    statusReportAuth: "Auth: Pi Native In-Process Auth (Zero Config \xB7 Secure)",
    statusReportShortcuts: "Shortcuts: /lingual (mode) \xB7 /slots (slots) \xB7 /lang (lang) \xB7 /lingual-compact (layout)",
    statusReportTuner: "Slot Tuner: Built-in lingual-tuner skill (Just describe your preferences to Agent)",
    modeDescOriginal: "Pass-through \xB7 0ms non-blocking",
    modeDescEnglish: "English mode \xB7 Deep reasoning",
    modeDescOff: "Disabled",
    modelCurrentLabel: "Current companion model",
    modelFollowSession: "Follow session",
    modelAvailableListHeader: "Available models (run /lingual-model <id> to switch):",
    modelAutoFollowDesc: "auto (Automatically follows active session model)",
    modelSelectHint: "Run /lingual-model <model-id> or auto to designate a model.",
    langUsageHint: "Usage: /lang <zh|ja|en|es|fr|de> [target] (e.g. /lang ja or /lang zh ja)",
    langList: [
      "\u2022 zh (Chinese \u2794 English)",
      "\u2022 ja (Japanese \u2794 English)",
      "\u2022 en (English \u2794 Japanese)",
      "\u2022 es (Spanish \u2794 English)",
      "\u2022 fr (French \u2794 English)",
      "\u2022 de (German \u2794 English)"
    ],
    // Dynamic slots chrome (English)
    slotsHeader: "Dynamic Slots Architecture",
    slotsActiveTag: "active",
    slotsNone: "No slots configured",
    slotsStatusEnabled: "enabled",
    slotsStatusDisabled: "disabled",
    slotsWithNuance: " +nuance",
    slotsNlTitle: "\u{1F4AC} Natural Language Customization (Just ask your Agent directly):",
    slotsNlExamples: [
      '\u2022 "Customize companion: only tweet and deep insight, no source text"',
      '\u2022 "Switch companion to single-slot clean translation"',
      '\u2022 "Reset companion slots to default"'
    ],
    slotsCliTitle: "\u26A1\uFE0F Quick CLI Commands:",
    slotsCliHelp: [
      "\u2022 /slots rm source       - Hide original source text row",
      "\u2022 /slots compact2        - Minimal dual slot",
      "\u2022 /slots reset           - Reset to clean defaults",
      "\u2022 /slots toggle <id>     - Toggle slot enable/disable"
    ],
    slotsResetSuccess: "[{pair}] Reset slots to clean defaults (Source + Spoken + Written + Vocab)",
    slotsRemovedSuccess: '[{pair}] Removed slot [{id}] ("{label}")',
    slotsRemovedSourceNote: " (Source line will no longer appear on cards)",
    slotsToggled: "[{pair}] Slot [{id}] is now {status}",
    slotsAdded: '[{pair}] Added/updated slot [{id}] "{label}"',
    slotsNotFound: "[{pair}] Slot [{id}] not found. Run /slots to inspect",
    slotsUsageAdd: "Usage: /slots add <id> <label> [instruction...]\nExample: /slots add twitter Tweet Short punchy tweet under 280 chars",
    slotsUsageRm: "Usage: /slots rm <slot-id> (e.g. /slots rm source)",
    slotsUsageToggle: "Usage: /slots toggle <slot-id>",
    slotsUnknown: '[{pair}] Unknown slot command or preset "{cmd}". Type /slots to view help'
  },
  es: {
    slot1Label: "Coloquial",
    slot2Label: "Escrito",
    vocabLabel: "Vocab",
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
    notifyLangInvalid: "C\xF3digo de idioma no v\xE1lido. Admitidos: zh, ja, en, es, fr, de",
    notifyCompactOn: "[es \u21C4 en] Modo c\xE1psula de una l\xEDnea activado",
    notifyCompactOff: "[es \u21C4 en] Modo \xE1rbol completo restaurado",
    notifySlotSwitched: "[es \u21C4 en] Arquitectura de ranuras cambiada a [{preset}]: {desc}",
    notifyTimeout: "[es \u21C4 en] La traducci\xF3n al ingl\xE9s agot\xF3 el tiempo; se envi\xF3 el texto original",
    notifyError: "[es \u21C4 en] Error en la traducci\xF3n al ingl\xE9s; se envi\xF3 el texto original",
    cmdDescMode: "Cambiar modo [es \u21C4 en]: [Original] \u2794 [Ingl\xE9s] \u2794 [Apagado]",
    cmdDescStatus: "Mostrar diagn\xF3stico y estado del modelo: /lingual-status",
    cmdDescModel: "Consultar o cambiar modelo: /lingual-model [model-id|auto]",
    cmdDescLang: "Ver o cambiar idioma nativo: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Inspeccionar o cambiar ranuras: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Alternar modo c\xE1psula de una l\xEDnea: /lingual-compact",
    cmdDescLast: "Reaparecer tarjeta anterior: /lingual-last",
    cmdDescAgent: "Ver gu\xEDa de personalizaci\xF3n y cambio de idioma: /lingual-agent",
    shortcutNextPage: "Cambiar al siguiente segmento",
    shortcutPrevPage: "Cambiar al segmento anterior",
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
    statusReportShortcuts: "Accesos directos: /lingual (modo) \xB7 /slots (ranuras) \xB7 /lang (idioma) \xB7 /lingual-compact (dise\xF1o)",
    statusReportTuner: "Ajuste de ranuras: Habilidad lingual-tuner integrada (configure hablando con su Agente)",
    modeDescOriginal: "Directo \xB7 0ms no bloqueante",
    modeDescEnglish: "Modo ingl\xE9s \xB7 Razonamiento profundo",
    modeDescOff: "Apagado",
    modelCurrentLabel: "Modelo actual",
    modelFollowSession: "Siguiendo sesi\xF3n",
    modelAvailableListHeader: "Modelos disponibles (ejecute /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Sigue autom\xE1ticamente el modelo de la sesi\xF3n)",
    modelSelectHint: "Use /lingual-model <id> o auto para asignar un modelo.",
    langUsageHint: "Uso: /lang <zh|ja|en|es|fr|de> [target] (ej. /lang ja o /lang zh ja)",
    langList: [
      "\u2022 zh (Chino \u2794 Ingl\xE9s)",
      "\u2022 ja (Japon\xE9s \u2794 Ingl\xE9s)",
      "\u2022 en (Ingl\xE9s \u2794 Japon\xE9s)",
      "\u2022 es (Espa\xF1ol \u2794 Ingl\xE9s)",
      "\u2022 fr (Franc\xE9s \u2794 Ingl\xE9s)",
      "\u2022 de (Alem\xE1n \u2794 Ingl\xE9s)"
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
    slotsUnknown: '[{pair}] Comando o ajuste preestablecido desconocido "{cmd}". Escriba /slots para ver la ayuda'
  },
  fr: {
    slot1Label: "Oral",
    slot2Label: "\xC9crit",
    vocabLabel: "Vocab",
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
    notifyLangInvalid: "Code de langue invalide. Pris en charge : zh, ja, en, es, fr, de",
    notifyCompactOn: "[fr \u21C4 en] Mode capsule sur une seule ligne activ\xE9",
    notifyCompactOff: "[fr \u21C4 en] Mode arborescence compl\xE8te restaur\xE9",
    notifyTimeout: "[fr \u21C4 en] La traduction en anglais a expir\xE9 ; le prompt original a \xE9t\xE9 transmis",
    notifyError: "[fr \u21C4 en] Erreur de traduction en anglais ; le prompt original a \xE9t\xE9 transmis",
    cmdDescMode: "Changer de mode [fr \u21C4 en]: [Original] \u2794 [Anglais] \u2794 [D\xE9sactiv\xE9]",
    cmdDescStatus: "Afficher le rapport d'\xE9tat et le diagnostic: /lingual-status",
    cmdDescModel: "Consulter ou changer de mod\xE8le: /lingual-model [model-id|auto]",
    cmdDescLang: "Afficher ou changer la langue maternelle: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescCompact: "Basculer le mode capsule sur une ligne: /lingual-compact",
    cmdDescLast: "R\xE9afficher la carte pr\xE9c\xE9dente: /lingual-last",
    cmdDescAgent: "Afficher le guide de personnalisation et de changement de langue : /lingual-agent",
    shortcutNextPage: "Passer au segment suivant",
    shortcutPrevPage: "Passer au segment pr\xE9c\xE9dent",
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
    statusReportShortcuts: "Raccourcis : /lingual (mode) \xB7 /slots (emplacements) \xB7 /lang (langue) \xB7 /lingual-compact (mise en page)",
    statusReportTuner: "Ajustement d'emplacements : Comp\xE9tence lingual-tuner int\xE9gr\xE9e (d\xE9crivez vos pr\xE9f\xE9rences \xE0 l'Agent)",
    modeDescOriginal: "Passerelle directe \xB7 0ms non bloquant",
    modeDescEnglish: "Mode anglais \xB7 Raisonnement approfondi",
    modeDescOff: "D\xE9sactiv\xE9",
    modelCurrentLabel: "Mod\xE8le actuel",
    modelFollowSession: "Suit la session",
    modelAvailableListHeader: "Mod\xE8les disponibles (tapez /lingual-model <id>):",
    modelAutoFollowDesc: "auto (Suit automatiquement le mod\xE8le principal)",
    modelSelectHint: "Entrez /lingual-model <id> ou auto pour d\xE9finir le mod\xE8le.",
    langUsageHint: "Utilisation : /lang <zh|ja|en|es|fr|de> [target] (ex : /lang ja ou /lang zh ja)",
    langList: [
      "\u2022 zh (Chinois \u2794 Anglais)",
      "\u2022 ja (Japonais \u2794 Anglais)",
      "\u2022 en (Anglais \u2794 Japonais)",
      "\u2022 es (Espagnol \u2794 Anglais)",
      "\u2022 fr (Fran\xE7ais \u2794 Anglais)",
      "\u2022 de (Allemand \u2794 Anglais)"
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
    slotsUnknown: `[{pair}] Commande ou pr\xE9r\xE9glage inconnu "{cmd}". Tapez /slots pour afficher l'aide`
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
    notifyLangInvalid: "Ung\xFCltiger Sprachcode. Unterst\xFCtzt: zh, ja, en, es, fr, de",
    notifyCompactOn: "[de \u21C4 en] Einzeiliger Kapselmodus aktiviert",
    notifyCompactOff: "[de \u21C4 en] Vollst\xE4ndige Baumansicht wiederhergestellt",
    notifySlotSwitched: "[de \u21C4 en] Slot-Architektur auf [{preset}] umgestellt: {desc}",
    notifyTimeout: "[de \u21C4 en] Englische \xDCbersetzung hat das Zeitlimit \xFCberschritten; Originaltext wurde \xFCbergeben",
    notifyError: "[de \u21C4 en] Fehler bei der englischen \xDCbersetzung; Originaltext wurde \xFCbergeben",
    cmdDescMode: "Modus umschalten [de \u21C4 en]: [Original] \u2794 [Englisch] \u2794 [Aus]",
    cmdDescStatus: "Statusbericht und Modell-Diagnose anzeigen: /lingual-status",
    cmdDescModel: "Modell pr\xFCfen oder wechseln: /lingual-model [model-id|auto]",
    cmdDescLang: "Muttersprache anzeigen oder wechseln: /lingual-lang [zh|ja|en|es|fr|de]",
    cmdDescSlots: "Slot-Architektur anzeigen/umstellen: /slots [developer|social|japanese|academic|compact2]",
    cmdDescCompact: "Einzeiligen Kapselmodus umschalten: /lingual-compact",
    cmdDescLast: "Vorherige Karte erneut anzeigen: /lingual-last",
    cmdDescAgent: "Anleitung zur Anpassung und Sprachumstellung anzeigen: /lingual-agent",
    shortcutNextPage: "Zum n\xE4chsten Segment wechseln",
    shortcutPrevPage: "Zum vorherigen Segment wechseln",
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
    statusReportShortcuts: "Befehle: /lingual (Modus) \xB7 /slots (Slots) \xB7 /lang (Sprache) \xB7 /lingual-compact (Layout)",
    statusReportTuner: "Slot-Anpassung: Integrierter lingual-tuner Skill (Pr\xE4ferenzen einfach dem Agenten beschreiben)",
    modeDescOriginal: "Direkt \xB7 0ms nicht blockierend",
    modeDescEnglish: "Englisch-Modus \xB7 Tiefgreifende Logik",
    modeDescOff: "Aus",
    modelCurrentLabel: "Aktuelles Modell",
    modelFollowSession: "Sitzungsmodell",
    modelAvailableListHeader: "Verf\xFCgbare Modelle (/lingual-model <id> ausf\xFChren):",
    modelAutoFollowDesc: "auto (Folgt automatisch dem aktiven Sitzungsmodell)",
    modelSelectHint: "Geben Sie /lingual-model <id> oder auto ein.",
    langUsageHint: "Verwendung: /lang <zh|ja|en|es|fr|de> [target] (z.B. /lang ja oder /lang zh ja)",
    langList: [
      "\u2022 zh (Chinesisch \u2794 Englisch)",
      "\u2022 ja (Japanisch \u2794 Englisch)",
      "\u2022 en (Englisch \u2794 Japanisch)",
      "\u2022 es (Spanisch \u2794 Englisch)",
      "\u2022 fr (Franz\xF6sisch \u2794 Englisch)",
      "\u2022 de (Deutsch \u2794 Englisch)"
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
    slotsUnknown: '[{pair}] Unbekannter Befehl oder Preset "{cmd}". /slots f\xFCr Hilfe eingeben'
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
    cmdDescMode: "\uBAA8\uB4DC \uC804\uD658 [ko \u21C4 en]: [\uC6D0\uBB38] \u2794 [\uC601\uC5B4] \u2794 [\uB054]",
    cmdDescStatus: "\uC0C1\uD0DC \uBCF4\uACE0\uC11C \uBC0F \uC9C4\uB2E8 \uD655\uC778: /lingual-status",
    cmdDescModel: "\uBAA8\uB378 \uD655\uC778 \uBC0F \uBCC0\uACBD: /lingual-model [model-id|auto]",
    cmdDescLang: "\uBAA8\uAD6D\uC5B4 \uD655\uC778 \uBC0F \uBCC0\uACBD: /lingual-lang",
    cmdDescSlots: "\uC2AC\uB86F \uAD6C\uC131 \uBCC0\uACBD: /slots",
    cmdDescCompact: "\uB2E8\uC77C \uD589 \uCEA1\uC290 \uBAA8\uB4DC \uD1A0\uAE00: /lingual-compact",
    cmdDescLast: "\uC774\uC804 \uCE74\uB4DC \uB2E4\uC2DC \uBCF4\uAE30: /lingual-last",
    cmdDescAgent: "\uC0AC\uC6A9\uC790 \uC124\uC815 \uAC00\uC774\uB4DC: /lingual-agent",
    shortcutNextPage: "\uB2E4\uC74C \uC138\uADF8\uBA3C\uD2B8\uB85C \uC774\uB3D9",
    shortcutPrevPage: "\uC774\uC804 \uC138\uADF8\uBA3C\uD2B8\uB85C \uC774\uB3D9",
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
    statusReportShortcuts: "\uBA85\uB839\uC5B4: /lingual (\uBAA8\uB4DC) \xB7 /slots (\uC2AC\uB86F) \xB7 /lang (\uC5B8\uC5B4) \xB7 /lingual-compact (\uB808\uC774\uC544\uC6C3)",
    statusReportTuner: "\uC2AC\uB86F \uD29C\uB108: lingual-tuner \uB0B4\uC7A5",
    modeDescOriginal: "\uC6D0\uBB38 \uC9C1\uD1B5 \xB7 0ms \uBE44\uCC28\uB2E8",
    modeDescEnglish: "\uC601\uC5B4 \uBAA8\uB4DC \xB7 \uC2EC\uCE35 \uCF54\uB4DC \uCD94\uB860",
    modeDescOff: "\uAEBC\uC9D0",
    modelCurrentLabel: "\uD604\uC7AC \uBAA8\uB378",
    modelFollowSession: "\uC138\uC158 \uB530\uB984",
    modelAvailableListHeader: "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBAA8\uB378 (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (\uD604\uC7AC \uC138\uC158 \uC8FC \uBAA8\uB378 \uC790\uB3D9 \uCD94\uC885)",
    modelSelectHint: "/lingual-model <id> \uB610\uB294 auto \uC9C0\uC815.",
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
    slotsUnknown: '[{pair}] \uC54C \uC218 \uC5C6\uB294 \uBA85\uB839\uC5B4 "{cmd}". /slots \uB3C4\uC6C0\uB9D0 \uCC38\uC870'
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
    cmdDescMode: "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C [ru \u21C4 en]: [\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B] \u2794 [\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439] \u2794 [\u0412\u044B\u043A\u043B]",
    cmdDescStatus: "\u041E\u0442\u0447\u0435\u0442 \u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438 \u0438 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430: /lingual-status",
    cmdDescModel: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C: /lingual-model [model-id|auto]",
    cmdDescLang: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u044F\u0437\u044B\u043A: /lingual-lang",
    cmdDescSlots: "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0441\u043B\u043E\u0442\u044B: /slots",
    cmdDescCompact: "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u0436\u0438\u043C \u043A\u0430\u043F\u0441\u0443\u043B\u044B: /lingual-compact",
    cmdDescLast: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0443\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443: /lingual-last",
    cmdDescAgent: "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043F\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0435: /lingual-agent",
    shortcutNextPage: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0443",
    shortcutPrevPage: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u043C\u0443 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u0443",
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
    statusReportShortcuts: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B: /lingual (\u0440\u0435\u0436\u0438\u043C) \xB7 /slots (\u0441\u043B\u043E\u0442\u044B) \xB7 /lang (\u044F\u0437\u044B\u043A)",
    statusReportTuner: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0441\u043B\u043E\u0442\u043E\u0432: \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043D\u0430\u0432\u044B\u043A lingual-tuner",
    modeDescOriginal: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B \xB7 0\u043C\u0441 \u0431\u0435\u0437 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438",
    modeDescEnglish: "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \xB7 \u0433\u043B\u0443\u0431\u043E\u043A\u043E\u0435 \u0440\u0430\u0441\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u0435",
    modeDescOff: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    modelCurrentLabel: "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C",
    modelFollowSession: "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u0441\u0435\u0441\u0441\u0438\u0435\u0439",
    modelAvailableListHeader: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 (/lingual-model <id>):",
    modelAutoFollowDesc: "auto (\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u043C\u043E\u0434\u0435\u043B\u044C\u044E \u0441\u0435\u0441\u0441\u0438\u0438)",
    modelSelectHint: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 /lingual-model <id> \u0438\u043B\u0438 auto.",
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
    slotsUnknown: '[{pair}] \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430 "{cmd}". \u0412\u0432\u0435\u0434\u0438\u0442\u0435 /slots \u0434\u043B\u044F \u0441\u043F\u0440\u0430\u0432\u043A\u0438'
  }
};
function resolveLabelsForLang(lang, overrides, targetLang) {
  const norm = (lang || "zh").toLowerCase().split("-")[0];
  const target = LANGUAGE_PRESETS[norm] || LANGUAGE_PRESETS.zh;
  const actualTarget = targetLang || (norm === "en" ? "ja" : "en");
  const pairTitle = `${norm} \u21C4 ${actualTarget}`;
  const merged = {
    ...LANGUAGE_PRESETS.en,
    // 1. 英文全量保底 (保证任何新增 key 不为空，不泄露中文)
    ...target,
    // 2. 目标母语官方预设
    hudTitle: pairTitle,
    statusOriginal: pairTitle,
    statusEnglish: pairTitle,
    statusOff: `${pairTitle}: off`,
    ...overrides || {}
    // 3. 用户显式覆盖
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
    `\u2022 ${labels.statusReportShortcuts || "Shortcuts: /lingual \xB7 /slots \xB7 /lang \xB7 /lingual-compact \xB7 /status"}`
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
  msg += labels.modelSelectHint || "Specify model with /lingual-model <model-id> or auto.";
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
  "unzip "
];
var CODE_STATEMENT_REGEX = /^(?:const|let|var|function|def|class|import|export|package|namespace|using|public|private|protected|fn|pub fn|impl|struct|enum|interface|type)\s+/;
var SQL_STATEMENT_REGEX = /^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+/i;
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
    if (!/[\u4e00-\u9fa5]/.test(trimmed) || /^[a-zA-Z0-9_\s<>{}\[\]();:=,"'.]+$/.test(trimmed)) {
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
  return false;
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
   * 生成标准化缓存键（结合源语言与目标语言）
   */
  static buildKey(text, sourceLang = "zh", targetLang = "en", slotSignature) {
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

// src/core/engine.ts
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    try {
      const repaired = str.replace(/,\s*([}\]])/g, "$1").replace(
        /("[a-zA-Z0-9_-]+"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"|\s*\}))/g,
        (_m, prefix, content, suffix) => prefix + content.replace(/(?<!\\)"/g, '\\"') + suffix
      );
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}
var BLOCKED_JSON_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function toCleanString(val) {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(toCleanString).filter(Boolean).join(" \xB7 ");
  return "";
}
function parseLlmResponse(raw) {
  try {
    if (!raw || typeof raw !== "string" || raw.length > 32768) return null;
    let cleaned = raw.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "").trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    const jsonSubstr = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson(jsonSubstr);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
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
    if (effectiveSpoken) {
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
    return null;
  } catch {
    return null;
  }
}

// src/engine.ts
var cachedUserConfig = null;
var lastConfigCheckTime = 0;
var CONFIG_CACHE_TTL_MS = 2e3;
function invalidateUserConfigCache() {
  cachedUserConfig = null;
  lastConfigCheckTime = 0;
}
function isTestEnvironment() {
  return process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT !== void 0 || process.execArgv.some((a) => a.startsWith("--test") || a === "--test") || process.argv.some((a) => a.includes(".test.") || a.includes("test")) || process.env.npm_lifecycle_event === "test";
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
    const slots = Array.isArray(target.slots) ? target.slots.filter((s) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string") : void 0;
    const promptLang = typeof target.promptLang === "string" ? target.promptLang : void 0;
    const promptRule = typeof target.promptRule === "string" ? target.promptRule : void 0;
    const promptSlots = Array.isArray(target.promptSlots) ? target.promptSlots.filter((s) => s && typeof s === "object" && typeof s.id === "string" && typeof s.label === "string") : void 0;
    const lastSeenVersion = typeof target.lastSeenVersion === "string" ? target.lastSeenVersion : void 0;
    const reasoning = typeof target.reasoning === "string" ? target.reasoning : void 0;
    const timeoutMs = typeof target.timeoutMs === "number" && Number.isFinite(target.timeoutMs) ? Math.min(6e4, Math.max(1e3, target.timeoutMs)) : void 0;
    const replyInSourceLang = target.replyInSourceLang !== void 0 ? Boolean(target.replyInSourceLang) : void 0;
    const labels = resolveLabelsForLang(sourceLang || "zh", target.labels, targetLang);
    cachedUserConfig = {
      ...endpoint ? { endpoint } : {},
      ...apiKey ? { apiKey } : {},
      ...model ? { model } : {},
      ...selectedModel ? { selectedModel } : {},
      ...target.mode ? { mode: target.mode } : {},
      ...compact !== void 0 ? { compact: Boolean(compact) } : {},
      ...slotPreset ? { slotPreset } : {},
      ...slots ? { slots } : {},
      ...promptLang ? { promptLang } : {},
      ...promptRule ? { promptRule } : {},
      ...promptSlots ? { promptSlots } : {},
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
var DEFAULT_CONFIG = {
  endpoint: process.env.LINGUAL_ENDPOINT || "",
  apiKey: process.env.LINGUAL_API_KEY || "",
  model: process.env.LINGUAL_MODEL || "",
  selectedModel: "auto",
  mode: "original",
  sourceLang: "zh",
  targetLang: "en",
  temperature: 0.2,
  timeoutMs: 3e4
};
var LINGUAL_SYSTEM_PROMPT = buildSystemPrompt("zh", "en");
function isNonEnglish(text) {
  const naturalLanguageScript = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u00c0-\u024f]/;
  return naturalLanguageScript.test(text);
}
var MAX_TRANSLATION_CHARS = 2500;
var MAX_TRANSLATION_LINES = 30;
function shouldTriggerTranslation(text, sourceLang = "zh", allowSameLangPromptOpt = false) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TRANSLATION_CHARS) {
    return false;
  }
  const lines = trimmed.split(/\r?\n/);
  if (lines.length > MAX_TRANSLATION_LINES) {
    return false;
  }
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith("---")) {
    return false;
  }
  if (shouldShieldBypass(trimmed)) {
    return false;
  }
  if (allowSameLangPromptOpt) {
    if (isNonEnglish(trimmed)) return true;
    const words2 = trimmed.split(/\s+/);
    return words2.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed);
  }
  const normSource = (sourceLang || "zh").toLowerCase().split("-")[0];
  const nonLatinLangs = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "ru", "ar"]);
  if (nonLatinLangs.has(normSource)) {
    return isNonEnglish(trimmed);
  }
  if (isNonEnglish(trimmed)) {
    return true;
  }
  const words = trimmed.split(/\s+/);
  if (words.length < 2) {
    return false;
  }
  return /[a-zA-Z]{2,}/.test(trimmed);
}
function isDynamicLongInput(text, sourceLang = "zh") {
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
async function translatePrompt(text, userConfig = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang)) {
    return null;
  }
  if (shouldShieldBypass(trimmed)) {
    return null;
  }
  const effectiveSlots = cfg.slots || (cfg.slotPreset ? resolveSlotsForPreset(cfg.slotPreset, cfg.sourceLang) : void 0);
  const slotSig = Array.isArray(effectiveSlots) ? effectiveSlots.filter((s) => s.enabled !== false).map((s) => s.id).join(",") : void 0;
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
    let content = null;
    const isLongInput = isDynamicLongInput(trimmed, cfg.sourceLang);
    const sysPrompt = buildSystemPrompt(cfg.sourceLang, cfg.targetLang, isLongInput, void 0, "general", effectiveSlots);
    if (typeof cfg.complete === "function") {
      content = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      const headers = {
        "Content-Type": "application/json"
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
            { role: "user", content: trimmed }
          ],
          temperature: cfg.temperature
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        return null;
      }
      const json = await response.json();
      content = json?.choices?.[0]?.message?.content ?? null;
    } else {
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
function shouldInjectNativeReplyGuard(originalText, _sourceLang = "zh", enabled = false) {
  if (!enabled) return false;
  const trimmed = originalText.trim();
  if (!trimmed) return false;
  if (!isNonEnglish(trimmed)) return false;
  const isEnglishWritingIntent = /(?:英文|英语|english|in english|pr\b|pull request|commit message|git commit|tweet|twitter|email|邮件|readme)/i.test(trimmed);
  if (isEnglishWritingIntent) {
    return false;
  }
  return true;
}
function formatNativeReplyGuardHint(sourceLang = "zh") {
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
function repairAndParseJsonObject(raw) {
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
      const repaired = jsonSubstr.replace(/,\s*([}\]])/g, "$1").replace(
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
function extractCleanJsonField(raw, fieldName) {
  const obj = repairAndParseJsonObject(raw);
  if (obj) {
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
async function rewritePromptDirect(text, userConfig = {}) {
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
    promptRule: cfg.promptRule
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
    let raw = null;
    if (typeof cfg.complete === "function") {
      raw = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      const headers = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: trimmed }
          ],
          temperature: cfg.temperature
        }),
        signal: controller.signal
      });
      if (response.ok) {
        const json = await response.json();
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
async function generatePromptCandidates(text, userConfig = {}) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const diskConfig = loadUserLingualConfig();
  const cfg = { ...DEFAULT_CONFIG, ...diskConfig, ...userConfig };
  if (!shouldTriggerTranslation(trimmed, cfg.sourceLang, true)) {
    return null;
  }
  const activeSlots = (Array.isArray(cfg.promptSlots) && cfg.promptSlots.length > 0 ? cfg.promptSlots : getDefaultPromptSlots(cfg.sourceLang)).filter((s) => s.enabled !== false);
  const slots = activeSlots.length > 0 ? activeSlots : getDefaultPromptSlots(cfg.sourceLang);
  const sysPrompt = buildPromptCandidatesSystemPrompt({
    sourceLang: cfg.sourceLang,
    targetLang: cfg.targetLang,
    promptLang: cfg.promptLang,
    promptRule: cfg.promptRule,
    promptSlots: slots
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
    let raw = null;
    if (typeof cfg.complete === "function") {
      raw = await cfg.complete(trimmed, sysPrompt, controller.signal);
    } else if (cfg.endpoint) {
      const headers = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model || "gemini-3.8-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: trimmed }
          ],
          temperature: cfg.temperature
        }),
        signal: controller.signal
      });
      if (response.ok) {
        const json = await response.json();
        raw = json?.choices?.[0]?.message?.content ?? null;
      }
    }
    if (typeof raw !== "string" || !raw.trim()) return null;
    const obj = repairAndParseJsonObject(raw);
    if (!obj) return null;
    const candidates = [];
    for (const slot of slots) {
      const val = obj[slot.id];
      if (typeof val === "string" && val.trim()) {
        candidates.push({
          id: slot.id,
          label: slot.label,
          content: val.trim()
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
function stripLingualContextWhenOff(systemPrompt, lastUserText = "") {
  if (!systemPrompt) return systemPrompt;
  if (/(?:lingual|伴学|槽位)/i.test(lastUserText)) {
    return systemPrompt;
  }
  return systemPrompt.replace(
    /\s*<skill>\s*<name>lingual-tuner<\/name>[\s\S]*?<\/skill>/gi,
    ""
  );
}
var CURRENT_FEATURE_BANNER_VERSION = "0.5.1";
function resolveReleaseBannerLang(explicitSourceLang, sessionEntries) {
  const supported = /* @__PURE__ */ new Set(["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"]);
  if (explicitSourceLang && explicitSourceLang.trim()) {
    const clean = explicitSourceLang.trim().toLowerCase().split(/[-_]/)[0];
    if (supported.has(clean)) return clean;
    return "en";
  }
  if (Array.isArray(sessionEntries) && sessionEntries.length > 0) {
    for (let i = sessionEntries.length - 1; i >= 0; i--) {
      const e = sessionEntries[i];
      if (e?.type === "message" && e?.message?.role === "user") {
        const text = Array.isArray(e.message.content) ? e.message.content.map((c) => c?.text || "").join(" ") : String(e.message.content || "");
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
        if (/[\uac00-\ud7af]/.test(text)) return "ko";
        if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
      }
    }
  }
  try {
    const i18nFile = import_node_path.default.join(import_node_os.default.homedir(), ".config", "rpiv-i18n", "config.json");
    if (import_node_fs.default.existsSync(i18nFile)) {
      const raw = JSON.parse(import_node_fs.default.readFileSync(i18nFile, "utf8"));
      const loc = String(raw?.locale || raw?.lang || "").toLowerCase();
      if (loc.startsWith("zh-tw") || loc.startsWith("zh-hk")) return "tw";
      const prefix = loc.split(/[-_]/)[0];
      if (supported.has(prefix)) return prefix;
    }
  } catch {
  }
  try {
    const envLocale = (process.env.LC_ALL || process.env.LANGUAGE || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale || "en").toLowerCase();
    if (envLocale.startsWith("zh-tw") || envLocale.startsWith("zh-hk")) return "tw";
    const prefix = envLocale.split(/[-_.]/)[0];
    if (supported.has(prefix)) return prefix;
  } catch {
  }
  return "en";
}
function formatReleaseBannerLines(sourceLang = "en", maxCols = 96, fg = (_c, t) => t) {
  const norm = (sourceLang || "en").toLowerCase().split("-")[0];
  const copyByLang = {
    zh: {
      title: "\xB7 [pi-lingual v0.5 \u66F4\u65B0\u8BF4\u660E] \u5199\u4EE3\u7801\u65F6\u4E0D\u540C\u5FC3\u5883\u4E0B\u7684\u6743\u91CD\u5E73\u8861 (\u53D1\u6D88\u606F\u540E\u81EA\u52A8\u6536\u8D77)",
      entries: [
        {
          main: "\u250C [english \u91CD\u5199\u6A21\u5F0F] \u601D\u8DEF\u4E71\u3001\u8BCD\u4E0D\u8FBE\u610F\u65F6\uFF0C\u5148\u5E2E\u4F60\u628A\u96F6\u6563\u53E3\u8BED\u7406\u987A\u4E3A\u6E05\u6670\u7684\u5DE5\u7A0B\u6307\u4EE4\u518D\u53D1\u7ED9 AI",
          detail: '\u2502   (\u6572 /lingual english \u5207\u6362\uFF1B\u9ED8\u8BA4\u8F93\u51FA\u82F1\u6587\uFF0C\u53EF\u8BBE promptLang: "native" \u4FDD\u6301\u6BCD\u8BED\u6216\u53E0\u52A0 promptRule \u89C4\u8303)'
        },
        {
          main: "\u251C [select \u5019\u9009\u6A21\u5F0F]  \u62FF\u4E0D\u51C6\u600E\u4E48\u8868\u8FF0\u66F4\u597D\u65F6\uFF0C\u4E00\u6B21\u7ED9\u51FA \u6781\u7B80\u9AD8\u6548 / \u7ED3\u6784\u89C4\u8303 / \u6DF1\u5EA6\u4E25\u8C28 3 \u79CD\u5199\u6CD5\u4F9B\u4F60\u6311\u9009",
          detail: "\u2502   (\u6572 /lingual select \u5207\u6362\uFF1B\u56DE\u8F66\u9009 [1]~[3] \u66FF\u6362\u53D1\u9001\uFF0C\u9009 [0] \u6216\u6309 Esc \u4FDD\u6301\u539F\u8BDD\u76F4\u53D1\uFF0C\u4E0D\u88AB\u5DE5\u5177\u88F9\u631F)"
        },
        {
          main: "\u251C [\u53CC\u6A21\u5F0F\u987A\u624B\u5B9A\u5236]   \u4F34\u5B66\u8BCD\u5361\u4E0E\u63D0\u793A\u8BCD\u91CD\u5199\u5404\u81EA\u72EC\u7ACB\uFF0C\u4E0D\u7528\u8BB0\u547D\u4EE4\uFF0C\u76F4\u63A5\u8DDF\u5F53\u524D AI \u8BF4\u53E5\u8BDD\u5C31\u80FD\u6539\u597D",
          detail: "\u2502   (\u5185\u7F6E lingual-tuner \u7D22\u5F15\uFF1B\u5BF9 AI \u8BF4\u201C\u628A\u63D0\u793A\u8BCD\u91CD\u5199\u8BBE\u4E3A\u6BCD\u8BED\u5E76\u52A0\u4E0A\u6700\u5C0F\u6539\u52A8\u8981\u6C42\u201D\u5373\u81EA\u52A8\u5199\u5165 lingual.json)"
        },
        {
          main: "\u2514 [off \u6A21\u5F0F\u5F7B\u5E95\u51C0\u7A7A] \u60F3\u5B89\u9759\u5199\u4EE3\u7801\u65F6\u5C31\u5F7B\u5E95\u8BA9\u51FA\u7A7A\u95F4\uFF1A\u9664\u505C\u7528\u8F93\u5165\u62E6\u622A\u5916\uFF0C\u6BCF\u6B21\u8BF7\u6C42\u524D\u4E3B\u52A8\u79FB\u9664\u81EA\u8EAB\u6280\u80FD\u8BF4\u660E",
          detail: "    (\u6572 /lingual off \u5207\u6362\uFF1B\u7531 before_agent_start \u94A9\u5B50\u5265\u79BB lingual-tuner \u5757\uFF0C\u5B9E\u73B0 0 Token \u96F6\u8D1F\u62C5)"
        }
      ]
    },
    tw: {
      title: "\xB7 [pi-lingual v0.5 \u66F4\u65B0\u8AAA\u660E] \u5BEB\u7A0B\u5F0F\u6642\u4E0D\u540C\u5FC3\u5883\u4E0B\u7684\u6B0A\u91CD\u5E73\u8861 (\u767C\u8A0A\u606F\u5F8C\u81EA\u52D5\u6536\u8D77)",
      entries: [
        {
          main: "\u250C [english \u91CD\u5BEB\u6A21\u5F0F] \u601D\u8DEF\u4E82\u3001\u8A5E\u4E0D\u9054\u610F\u6642\uFF0C\u5148\u5E6B\u4F60\u628A\u96F6\u6563\u53E3\u8A9E\u7406\u9806\u70BA\u6E05\u6670\u7684\u5DE5\u7A0B\u6307\u4EE4\u518D\u767C\u7D66 AI",
          detail: '\u2502   (\u6572 /lingual english \u5207\u63DB\uFF1B\u9810\u8A2D\u8F38\u51FA\u82F1\u6587\uFF0C\u53EF\u8A2D promptLang: "native" \u4FDD\u6301\u6BCD\u8A9E\u6216\u758A\u52A0 promptRule \u898F\u7BC4)'
        },
        {
          main: "\u251C [select \u5019\u9078\u6A21\u5F0F]  \u62FF\u4E0D\u6E96\u600E\u9EBC\u8868\u8FF0\u66F4\u597D\u6642\uFF0C\u4E00\u6B21\u7D66\u51FA \u6975\u7C21\u9AD8\u6548 / \u7D50\u69CB\u898F\u7BC4 / \u6DF1\u5EA6\u56B4\u8B39 3 \u7A2E\u5BEB\u6CD5\u4F9B\u4F60\u6311\u9078",
          detail: "\u2502   (\u6572 /lingual select \u5207\u63DB\uFF1B\u6309 Enter \u9078 [1]~[3] \u66FF\u63DB\u767C\u9001\uFF0C\u9078 [0] \u6216\u6309 Esc \u4FDD\u6301\u539F\u8A71\u76F4\u767C\uFF0C\u4E0D\u88AB\u5DE5\u5177\u88F9\u633E)"
        },
        {
          main: "\u251C [\u96D9\u6A21\u5F0F\u9806\u624B\u5B9A\u5236]   \u4F34\u5B78\u8A5E\u5361\u8207\u63D0\u793A\u8A5E\u91CD\u5BEB\u5404\u81EA\u7368\u7ACB\uFF0C\u4E0D\u7528\u8A18\u547D\u4EE4\uFF0C\u76F4\u63A5\u8DDF\u7576\u524D AI \u8AAA\u53E5\u8A71\u5C31\u80FD\u6539\u597D",
          detail: "\u2502   (\u5167\u5EFA lingual-tuner \u7D22\u5F15\uFF1B\u5C0D AI \u8AAA\u300C\u628A\u63D0\u793A\u8A5E\u91CD\u5BEB\u8A2D\u70BA\u6BCD\u8A9E\u4E26\u52A0\u4E0A\u6700\u5C0F\u6539\u52D5\u8981\u6C42\u300D\u5373\u81EA\u52D5\u5BEB\u5165 lingual.json)"
        },
        {
          main: "\u2514 [off \u6A21\u5F0F\u5FB9\u5E95\u6DE8\u7A7A] \u60F3\u5B89\u975C\u5BEB\u7A0B\u5F0F\u6642\u5C31\u5FB9\u5E95\u8B93\u51FA\u7A7A\u9593\uFF1A\u9664\u505C\u7528\u8F38\u5165\u6514\u622A\u5916\uFF0C\u6BCF\u6B21\u8ACB\u6C42\u524D\u4E3B\u52D5\u79FB\u9664\u81EA\u8EAB\u6280\u80FD\u8AAA\u660E",
          detail: "    (\u6572 /lingual off \u5207\u63DB\uFF1B\u7531 before_agent_start \u9264\u5B50\u525D\u96E2 lingual-tuner \u5340\u584A\uFF0C\u5BE6\u73FE 0 Token \u96F6\u8CA0\u64D4)"
        }
      ]
    },
    ja: {
      title: "\xB7 [pi-lingual v0.5 \u66F4\u65B0\u6848\u5185] \u601D\u8003\u306E\u30DA\u30FC\u30B9\u306B\u5408\u308F\u305B\u305F4\u3064\u306E\u30E2\u30FC\u30C9 (\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u3067\u81EA\u52D5\u7684\u306B\u9589\u3058\u307E\u3059)",
      entries: [
        {
          main: "\u250C [english \u30E2\u30FC\u30C9\u5237\u65B0] \u8003\u3048\u304C\u307E\u3068\u307E\u3089\u306A\u3044\u6642\u3001\u6563\u6F2B\u306A\u53E3\u8A9E\u3092\u660E\u5FEB\u306A\u6280\u8853\u6307\u793A\u3078\u6574\u7406\u3057\u3066\u304B\u3089 AI \u3078\u9001\u4FE1",
          detail: '\u2502   (/lingual english \u3067\u5207\u66FF\uFF1B\u65E2\u5B9A\u306F\u82F1\u8A9E\u51FA\u529B\u3001promptLang: "native" \u3067\u6BCD\u8A9E\u7DAD\u6301\u3084 promptRule \u898F\u7D04\u8FFD\u52A0\u306B\u5BFE\u5FDC)'
        },
        {
          main: "\u251C [select \u30E2\u30FC\u30C9\u8FFD\u52A0]  \u8868\u73FE\u306B\u8FF7\u3046\u6642\u3001\u7C21\u6F54\u30FB\u69CB\u9020\u5316\u30FB\u53B3\u5BC6\u306E 3 \u5019\u88DC\u3092\u4E26\u3079\u3066\u3001\u3057\u3063\u304F\u308A\u304F\u308B\u3082\u306E\u3092\u9078\u3093\u3067\u9001\u4FE1",
          detail: "\u2502   (/lingual select \u3067\u5207\u66FF\uFF1B[1]~[3] \u3067\u7F6E\u63DB\u9001\u4FE1\u3001[0] \u307E\u305F\u306F Esc \u3067\u539F\u6587\u306E\u307E\u307E\u9001\u4FE1\u3057\u4E3B\u5C0E\u6A29\u3092\u30AD\u30FC\u30D7)"
        },
        {
          main: "\u251C [\u81EA\u7136\u8A00\u8A9E\u3067\u81EA\u5728\u8ABF\u6574] \u8A9E\u5B66\u4F34\u8D70\u3068\u30D7\u30ED\u30F3\u30D7\u30C8\u6700\u9069\u5316\u306F\u72EC\u7ACB\u8A2D\u8A08\u3002\u73FE\u5728\u306E AI \u306B\u81EA\u7136\u8A00\u8A9E\u3067\u4F1D\u3048\u308B\u3060\u3051\u3067\u8A2D\u5B9A\u5B8C\u4E86",
          detail: "\u2502   (lingual-tuner \u7D22\u5F15\u3092\u5185\u8535\uFF1B\u300C\u30D7\u30ED\u30F3\u30D7\u30C8\u6700\u9069\u5316\u3092\u6BCD\u8A9E\u51FA\u529B\u306B\u3057\u3066\u6700\u5C0F\u5909\u66F4\u539F\u5247\u3092\u8FFD\u52A0\u3057\u3066\u300D\u3067 lingual.json \u66F4\u65B0)"
        },
        {
          main: "\u2514 [off \u3067\u5B8C\u5168\u306A\u7A7A\u767D\u306B] \u96C6\u4E2D\u3057\u305F\u3044\u6642\u306F\u88CF\u5074\u306E\u8CA0\u8377\u3082\u30BC\u30ED\u306B\uFF1A\u5165\u529B\u30D5\u30C3\u30AF\u505C\u6B62\u306B\u52A0\u3048\u3001\u81EA\u8EAB\u306E\u30B9\u30AD\u30EB\u5B9A\u7FA9\u3082\u81EA\u52D5\u9664\u53BB",
          detail: "    (/lingual off \u3067\u5207\u66FF\uFF1Bbefore_agent_start \u30D5\u30C3\u30AF\u304C lingual-tuner \u30D6\u30ED\u30C3\u30AF\u3092\u5265\u304C\u3057 0 Token \u3092\u4FDD\u8A3C)"
        }
      ]
    },
    ko: {
      title: "\xB7 [pi-lingual v0.5 \uC5C5\uB370\uC774\uD2B8] \uC791\uC5C5 \uD750\uB984\uACFC \uBE44\uC911\uC5D0 \uB9DE\uCD98 4\uAC00\uC9C0 \uBAA8\uB4DC (\uBA54\uC2DC\uC9C0 \uC785\uB825 \uC2DC \uC790\uB3D9\uC73C\uB85C \uB2EB\uD799\uB2C8\uB2E4)",
      entries: [
        {
          main: "\u250C [english \uBAA8\uB4DC \uAC1C\uD3B8] \uC0DD\uAC01\uC774 \uBCF5\uC7A1\uD560 \uB54C \uB450\uC11C\uC5C6\uB294 \uAD6C\uC5B4\uCCB4\uB97C \uBA85\uD655\uD55C \uC5D4\uC9C0\uB2C8\uC5B4\uB9C1 \uC9C0\uC2DC\uBB38\uC73C\uB85C \uB2E4\uB4EC\uC5B4 \uC804\uC1A1",
          detail: '\u2502   (/lingual english \uB85C \uC804\uD658; \uAE30\uBCF8 \uC601\uC5B4 \uCD9C\uB825, promptLang: "native" \uBAA8\uAD6D\uC5B4 \uC720\uC9C0 \uBC0F promptRule \uADDC\uCE59 \uCD94\uAC00 \uC9C0\uC6D0)'
        },
        {
          main: "\u251C [select \uBAA8\uB4DC \uCD94\uAC00]  \uC5B4\uB5BB\uAC8C \uC4F8\uC9C0 \uACE0\uBBFC\uB420 \uB54C \uAC04\uACB0/\uAD6C\uC870\uD654/\uC2EC\uCE35 3\uAC00\uC9C0 \uD6C4\uBCF4\uB97C \uBCF4\uACE0 \uC6D0\uD558\uB294 \uD45C\uD604\uC744 \uACE8\uB77C \uC804\uC1A1",
          detail: "\u2502   (/lingual select \uB85C \uC804\uD658; [1]~[3] \uC120\uD0DD \uC2DC \uBCC0\uD658 \uC804\uC1A1, [0] \uB610\uB294 Esc \uB85C \uC6D0\uBB38 \uADF8\uB300\uB85C \uC804\uC1A1)"
        },
        {
          main: "\u251C [\uC790\uC5F0\uC5B4 \uB9DE\uCDA4 \uC124\uC815]  \uC5B4\uD559 \uCE74\uB4DC\uC640 \uD504\uB86C\uD504\uD2B8 \uCD5C\uC801\uD654\uB294 \uB3C5\uB9BD \uB3D9\uC791\uD558\uBA70, \uBA85\uB839\uC5B4 \uC5C6\uC774 \uD604\uC7AC AI\uC5D0\uAC8C \uB9D0\uD558\uBA74 \uC989\uC2DC \uBC18\uC601",
          detail: '\u2502   (lingual-tuner \uC0C9\uC778 \uB0B4\uC7A5; AI\uC5D0\uAC8C "\uD504\uB86C\uD504\uD2B8 \uC7AC\uC791\uC131\uC744 \uBAA8\uAD6D\uC5B4\uB85C \uD558\uACE0 \uCD5C\uC18C \uBCC0\uACBD \uC6D0\uCE59\uC744 \uCD94\uAC00\uD574\uC918"\uB77C\uACE0 \uB9D0\uD558\uBA74 \uC790\uB3D9 \uAC31\uC2E0)'
        },
        {
          main: "\u2514 [off \uBAA8\uB4DC \uC644\uC804 \uBE44\uC6C0] \uC870\uC6A9\uD788 \uCF54\uB529\uD560 \uB550 \uC228\uC740 \uBD80\uB2F4\uB3C4 \uC5C6\uB3C4\uB85D: \uC785\uB825 \uD6C4\uD06C \uD574\uC81C\uC640 \uD568\uAED8 \uC790\uCCB4 \uC2A4\uD0AC \uC124\uBA85\uAE4C\uC9C0 \uC81C\uAC70",
          detail: "    (/lingual off \uB85C \uC804\uD658; before_agent_start \uD6C4\uD06C\uAC00 lingual-tuner \uBE14\uB85D\uC744 \uBD84\uB9AC\uD558\uC5EC 0 Token \uBCF4\uC7A5)"
        }
      ]
    },
    en: {
      title: "\xB7 [pi-lingual v0.5 Release Notes] Balancing agency and flow across 4 modes (auto-closes on next message)",
      entries: [
        {
          main: "\u250C [english Mode Upgraded] When thoughts are tangled, it structures messy phrasing into a clear engineering instruction",
          detail: '\u2502   (Switch via /lingual english; defaults to English, or set promptLang: "native" and stack promptRule constraints)'
        },
        {
          main: "\u251C [New select Mode]       When you want options, it generates Concise / Structured / Deep Rigor candidates to pick from",
          detail: "\u2502   (Switch via /lingual select; pick [1]~[3] to send rewritten prompt, or [0] / Esc to keep your original words)"
        },
        {
          main: "\u251C [Plain-Language Tuning] Companion cards and Prompt Optimizer are independent \u2014 customize either by asking your Agent",
          detail: '\u2502   (Indexed in lingual-tuner skill; tell Agent "Set prompt rewrite to my native language and enforce minimal diff")'
        },
        {
          main: "\u2514 [Zero-Context off Mode] When you want a quiet screen, turning off leaves zero hidden weight in your context window",
          detail: "    (Switch via /lingual off; before_agent_start hook strips the lingual-tuner skill block for 0-token overhead)"
        }
      ]
    }
  };
  const c = copyByLang[norm] || copyByLang.en;
  const lines = [truncateVisual(`  ${fg("accent", c.title)}`, maxCols)];
  for (const entry of c.entries) {
    lines.push(truncateVisual(`  ${fg("muted", entry.main)}`, maxCols));
    lines.push(truncateVisual(`  ${fg("dim", entry.detail)}`, maxCols));
  }
  return lines;
}

// src/fsm.ts
var LingualSessionController = class {
  activeAbortController = null;
  currentGeneration = 0;
  // 分页状态管理
  pagedResults = [];
  currentPageIndex = 0;
  totalExpectedPages = 1;
  lastResult = null;
  /**
   * 启动一次新的会话请求：
   * 1. 物理中断前序正在排队或流式传输的 HTTP 请求；
   * 2. 生成单调递增的新世代号；
   * 3. 绑定全新的 AbortSignal。
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
   * 物理中断当前正在活跃的网络请求
   */
  abortActive() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }
  /**
   * 判定指定世代号是否仍为当前最新的活跃世代
   */
  isLatest(generation) {
    return this.currentGeneration === generation;
  }
  /**
   * 获取当前最新世代号
   */
  getCurrentGeneration() {
    return this.currentGeneration;
  }
  /**
   * 初始化分页池 (当输入被切分为多个意群分块时调用)
   */
  initPagination(totalExpectedPages) {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = Math.max(1, totalExpectedPages);
  }
  /**
   * 存入某个切片的翻译结果 (具备世代守卫，拒绝陈旧世代脏写)
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
   * 获取当前展示页的翻译结果
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
   * 获取所有已就绪的分页结果列表
   */
  getReadyPages() {
    return this.pagedResults.filter((item) => Boolean(item));
  }
  /**
   * 获取当前分页状态快照
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
   * 翻至下一页 (循环翻页)
   * 返回 true 表示发生了有效翻页
   */
  nextPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex + 1) % readyList.length;
    return true;
  }
  /**
   * 翻至上一页 (循环翻页)
   * 返回 true 表示发生了有效翻页
   */
  prevPage() {
    const readyList = this.getReadyPages();
    if (readyList.length <= 1) return false;
    this.currentPageIndex = (this.currentPageIndex - 1 + readyList.length) % readyList.length;
    return true;
  }
  /**
   * 清空分页池 (在遇到非自然语言输入、或关闭伴学时调用，杜绝幽灵卡片复活)
   */
  clearPagination() {
    this.pagedResults = [];
    this.currentPageIndex = 0;
    this.totalExpectedPages = 1;
  }
  /**
   * 获取上一条记录 (用于 /lingual-last 回显)
   */
  getLastResult() {
    return this.lastResult;
  }
  /**
   * 显式设置上一条记录
   */
  setLastResult(result) {
    this.lastResult = result;
  }
  /**
   * 彻底重置状态机
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
var STACK_LINE_REGEX = /^\s*(?:at\s+(?:[\w$.<>]+|[^\s]+)\s*\(.*:\d+:\d+\)|at\s+.*:\d+:\d+|File\s+".*", line \d+, in\s+.*|goroutine \d+ \[.*\]:|Caused by:.*|^\s*\d+:\s+0x[0-9a-f]+)/;
var COMPILER_DIAGNOSTIC_REGEX = /^(?:[a-zA-Z]:[\\\/]|\.{0,2}[\\\/]|[a-zA-Z0-9_\-\.]+)[^:\r\n]+:\d+:\d+:\s*(?:error|warning|fatal error|note):/i;
var LIST_ITEM_REGEX = /^\s*(?:[-*•]|\d+[\.、)])\s+/;
function sanitizePromptForTranslation(raw) {
  const trimmed = raw.trim();
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
  let trailingPathPayload;
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
      rawPayload: trailingPathPayload
    };
  }
  let hasCollapsed = false;
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
function isTestEnvironment2() {
  return process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT !== void 0 || process.execArgv.some((a) => a.startsWith("--test") || a === "--test") || process.argv.some((a) => a.includes(".test.") || a.includes("test")) || process.env.npm_lifecycle_event === "test";
}
var initialDiskConfig = isTestEnvironment2() ? {} : loadUserLingualConfig();
var initialSourceLang = initialDiskConfig.sourceLang || "zh";
var initialTargetLang = initialDiskConfig.targetLang || (initialSourceLang === "en" ? "ja" : "en");
var initialSlotPreset = initialDiskConfig.slotPreset;
var initialSlots = Array.isArray(initialDiskConfig.slots) && initialDiskConfig.slots.length > 0 ? initialDiskConfig.slots : initialSlotPreset ? resolveSlotsForPreset(initialSlotPreset, initialSourceLang) : getDefaultSlots(initialSourceLang);
var initialPromptSlots = Array.isArray(initialDiskConfig.promptSlots) && initialDiskConfig.promptSlots.length > 0 ? initialDiskConfig.promptSlots : getDefaultPromptSlots(initialSourceLang);
var initialLabels = resolveLabelsForLang(initialSourceLang, initialDiskConfig.labels, initialTargetLang);
var state = {
  mode: initialDiskConfig.mode || "original",
  compact: Boolean(initialDiskConfig.compact),
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  selectedModel: initialDiskConfig.selectedModel || "auto",
  slotPreset: initialSlotPreset || "",
  slots: initialSlots,
  promptLang: initialDiskConfig.promptLang || "",
  promptRule: initialDiskConfig.promptRule || "",
  promptSlots: initialPromptSlots,
  labels: initialLabels
};
function saveUserLingualConfig(patch) {
  if (isTestEnvironment2()) {
    return;
  }
  try {
    const agentDir = import_node_path2.default.join(import_node_os2.default.homedir(), ".pi", "agent");
    const configFile = import_node_path2.default.join(agentDir, "lingual.json");
    if (!import_node_fs2.default.existsSync(agentDir)) {
      import_node_fs2.default.mkdirSync(agentDir, { recursive: true });
    }
    let existing = {};
    if (import_node_fs2.default.existsSync(configFile)) {
      try {
        existing = JSON.parse(import_node_fs2.default.readFileSync(configFile, "utf8"));
      } catch {
      }
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === void 0 || v === "" || v === "auto" || v === "original" || k === "compact" && v === false) {
        delete existing[k];
      } else {
        existing[k] = v;
      }
    }
    const content = JSON.stringify(existing, null, 2);
    const tmpFile = `${configFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    try {
      import_node_fs2.default.writeFileSync(tmpFile, content, "utf8");
      import_node_fs2.default.renameSync(tmpFile, configFile);
    } catch {
      try {
        import_node_fs2.default.writeFileSync(configFile, content, "utf8");
      } catch {
      }
      try {
        if (import_node_fs2.default.existsSync(tmpFile)) import_node_fs2.default.unlinkSync(tmpFile);
      } catch {
      }
    }
    invalidateUserConfigCache();
  } catch {
  }
}
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
    let pair = `${state.sourceLang} \u21C4 ${state.targetLang}`;
    const enabledSlots = (state.slots || []).filter((s) => s.enabled);
    const hasSource = enabledSlots.some((s) => s.role === "source");
    const nonSourceCount = enabledSlots.filter((s) => s.role !== "source").length;
    if (!hasSource) {
      pair += ` \xB7 no-src`;
    }
    if (nonSourceCount !== 2) {
      pair += ` \xB7 ${enabledSlots.length}s`;
    } else if (state.slotPreset) {
      pair += ` \xB7 ${state.slotPreset}`;
    }
    switch (state.mode) {
      case "original":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", pair));
        break;
      case "english": {
        const outLang = state.promptLang || state.targetLang;
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} \xB7 \u26A1${outLang}`));
        break;
      }
      case "select": {
        const outLang = state.promptLang || state.targetLang;
        const count = (state.promptSlots || []).filter((s) => s.enabled !== false).length || 3;
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", `${pair} \xB7 \u2726${count}-${outLang}`));
        break;
      }
      case "off":
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("muted", `${pair}: off`));
        break;
    }
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
  const renderReleaseBanner = (ctx, explicitLang) => {
    if (!hasActiveUI(ctx)) return;
    try {
      const maxCols = getEffectiveMaxCols();
      const fg = ctx.ui.theme?.fg ? (c, t) => ctx.ui.theme.fg(c, t) : (_c, t) => t;
      const entries = ctx.sessionManager?.getEntries?.() || [];
      const bannerLang = resolveReleaseBannerLang(explicitLang, entries);
      const lines = formatReleaseBannerLines(bannerLang, maxCols, fg);
      ctx.ui.setWidget("lingual_hud", lines, { placement: "aboveEditor" });
      showingReleaseBanner = true;
    } catch {
    }
  };
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = session.getActiveResult() || session.getLastResult();
      if (active && hasActiveUI(lastContext)) {
        renderActiveCard(lastContext);
      }
    }, 120);
  };
  const prevResize = globalThis.__piLingualResizeListener;
  if (prevResize && process.stdout && typeof process.stdout.off === "function") {
    process.stdout.off("resize", prevResize);
  }
  globalThis.__piLingualResizeListener = onResize;
  process.stdout?.on("resize", onResize);
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
    if (hasActiveUI(ctx)) {
      safeClearWidget(ctx);
      const diskCfg = loadUserLingualConfig();
      if (!isTestEnvironment2() && event?.reason !== "resume" && diskCfg.lastSeenVersion !== CURRENT_FEATURE_BANNER_VERSION) {
        renderReleaseBanner(ctx, diskCfg.sourceLang);
        saveUserLingualConfig({ lastSeenVersion: CURRENT_FEATURE_BANNER_VERSION });
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
    if (state.mode !== "off") return;
    if (!event?.systemPrompt || typeof event.systemPrompt !== "string") return;
    const cleaned = stripLingualContextWhenOff(event.systemPrompt, lastRawInputText);
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
    const trimmed = args?.trim().toLowerCase();
    let nextMode;
    if (trimmed === "english" || trimmed === "en" || trimmed === "eng" || trimmed === "refine" || trimmed === "rewrite" || trimmed === "2") {
      nextMode = "english";
    } else if (trimmed === "select" || trimmed === "choices" || trimmed === "choice" || trimmed === "pick" || trimmed === "3") {
      nextMode = "select";
    } else if (trimmed === "original" || trimmed === "orig" || trimmed === "1") {
      nextMode = "original";
    } else if (trimmed === "off" || trimmed === "0" || trimmed === "disable" || trimmed === "stop") {
      nextMode = "off";
    } else {
      nextMode = state.mode === "original" ? "english" : state.mode === "english" ? "select" : state.mode === "select" ? "off" : "original";
    }
    state.mode = nextMode;
    saveUserLingualConfig({ mode: nextMode });
    updateFooter(ctx);
    const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
    const outLang = state.promptLang || state.targetLang;
    if (nextMode === "english") {
      try {
        ctx.ui.notify(
          state.labels.notifyEnglish || `[${state.labels.hudTitle}] Switched to [English / Direct Rewrite] mode (Output: ${outLang})`,
          "info"
        );
      } catch {
      }
    } else if (nextMode === "select") {
      const slotLabels = (state.promptSlots || getDefaultPromptSlots(state.sourceLang)).filter((s) => s.enabled !== false).map((s) => s.label).join(" / ");
      try {
        ctx.ui.notify(
          isZh ? `[${state.labels.hudTitle}] \u5DF2\u5207\u6362\u81F3 [\u591A\u98CE\u683C\u5019\u9009\u586B\u5165 (select)] \u6A21\u5F0F (${slotLabels} \u2794 \u8F93\u51FA\u8BED\u8A00: ${outLang})` : `[${state.labels.hudTitle}] Switched to [N-Choice Prompt Selector (select)] mode (${slotLabels} \u2794 Output: ${outLang})`,
          "info"
        );
      } catch {
      }
    } else if (nextMode === "off") {
      safeClearWidget(ctx);
      try {
        ctx.ui.notify(
          state.labels.notifyOff || `[${state.labels.hudTitle}] Companion turned off (Active 0-Token Context Shield engaged)`,
          "info"
        );
      } catch {
      }
    } else {
      try {
        ctx.ui.notify(
          state.labels.notifyOriginal || `[${state.labels.hudTitle}] Switched to [Original] mode: Input kept in native language, translations shown above`,
          "info"
        );
      } catch {
      }
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
    const switchTemplate = state.labels.notifyModelSwitched || "Companion model switched to: {model}";
    const switchedMsg = `[${state.labels.hudTitle}] ` + switchTemplate.replace("{model}", trimmed);
    ctx.ui.notify(switchedMsg, "info");
  };
  function normalizeLangCode(input) {
    const s = input.trim().toLowerCase().replace(/[-_].*$/, "");
    if (s === "zh" || s === "cn" || s === "chinese" || s === "\u4E2D\u6587") return "zh";
    if (s === "ja" || s === "jp" || s === "japanese" || s === "\u65E5\u672C\u8A9E" || s === "\u65E5\u6587" || s === "\u65E5\u8BED") return "ja";
    if (s === "ko" || s === "kr" || s === "korean" || s === "\uD55C\uAD6D\uC5B4" || s === "\u97E9\u8BED" || s === "\u97E9\u6587") return "ko";
    if (s === "en" || s === "eng" || s === "english" || s === "\u82F1\u8BED" || s === "\u82F1\u6587") return "en";
    if (s === "es" || s === "spanish" || s === "espa\xF1ol" || s === "\u897F\u8BED" || s === "\u897F\u73ED\u7259\u8BED") return "es";
    if (s === "fr" || s === "french" || s === "fran\xE7ais" || s === "\u6CD5\u8BED" || s === "\u6CD5\u6587") return "fr";
    if (s === "de" || s === "german" || s === "deutsch" || s === "\u5FB7\u8BED" || s === "\u5FB7\u6587") return "de";
    if (s === "ru" || s === "russian" || s === "\u0440\u0443\u0441\u0441\u043A\u0438\u0439" || s === "\u4FC4\u8BED" || s === "\u4FC4\u6587") return "ru";
    return s;
  }
  const switchLangHandler = async (args, ctx) => {
    const trimmed = args.trim().toLowerCase();
    if (!trimmed || trimmed === "list" || trimmed === "help" || trimmed === "?") {
      const listText = (state.labels.langList || [
        "\u2022 zh (Chinese \u2794 English)",
        "\u2022 ja (Japanese \u2794 English)",
        "\u2022 en (English \u2794 Japanese)",
        "\u2022 es (Spanish \u2794 English)",
        "\u2022 fr (French \u2794 English)",
        "\u2022 de (German \u2794 English)"
      ]).join("\n");
      const usage = state.labels.langUsageHint || "Usage: /lang <zh|ja|en|es|fr|de> [target] (e.g. /lang ja or /lang zh ja)";
      ctx.ui.notify(
        `[${state.sourceLang} \u21C4 ${state.targetLang}] ${state.labels.statusReportFlow || "Flow"}: [${state.sourceLang} \u2794 ${state.targetLang}]
${listText}
${usage}`,
        "info"
      );
      return;
    }
    const parts = trimmed.split(/\s*->\s*|\s*➔\s*|\s+to\s+|\s+/).filter(Boolean);
    const newSource = normalizeLangCode(parts[0]);
    const newTarget = parts.length > 1 ? normalizeLangCode(parts[1]) : newSource === "en" ? "ja" : "en";
    if (!LANGUAGE_PRESETS[newSource]) {
      ctx.ui.notify(
        state.labels.notifyLangInvalid || "Invalid language code. Supported: zh, ja, en, es, fr, de",
        "warning"
      );
      return;
    }
    state.sourceLang = newSource;
    state.targetLang = newTarget;
    state.labels = resolveLabelsForLang(newSource, void 0, newTarget);
    if (state.slotPreset) {
      state.slots = resolveSlotsForPreset(state.slotPreset, newSource);
    } else {
      const freshDefaults = getDefaultSlots(newSource);
      const freshMap = new Map(freshDefaults.map((s) => [s.id, s]));
      state.slots = (state.slots || freshDefaults).map((s) => {
        const match = freshMap.get(s.id);
        return match ? { ...match, enabled: s.enabled, showMeaning: s.showMeaning } : s;
      });
    }
    const freshPromptDefaults = getDefaultPromptSlots(newSource);
    const freshPromptMap = new Map(freshPromptDefaults.map((s) => [s.id, s]));
    state.promptSlots = (state.promptSlots || freshPromptDefaults).map((s) => {
      const match = freshPromptMap.get(s.id);
      return match ? { ...match, enabled: s.enabled } : s;
    });
    saveUserLingualConfig({ sourceLang: newSource, targetLang: newTarget, slots: state.slots });
    session.reset();
    globalLingualCache.clear();
    updateFooter(ctx);
    const template = state.labels.notifyLangSwitched || "Native language switched to: {lang}";
    const flowText = `${newSource} \u21C4 ${newTarget}`;
    ctx.ui.notify(`[${flowText}] ` + template.replace("{lang}", flowText), "info");
  };
  const toggleCompactHandler = async (_args, ctx) => {
    state.compact = !state.compact;
    saveUserLingualConfig({ compact: state.compact });
    const msg = state.compact ? state.labels.notifyCompactOn || `[${state.labels.hudTitle}] Single-line capsule mode enabled` : state.labels.notifyCompactOff || `[${state.labels.hudTitle}] Full tree layout restored`;
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
    if (!subCmd || subCmd === "list" || subCmd === "ls") {
      const slots = state.slots || [];
      const lines = slots.map((s, idx) => {
        const status = s.enabled ? lbl.slotsStatusEnabled || "enabled" : lbl.slotsStatusDisabled || "disabled";
        const meaning = s.showMeaning ? lbl.slotsWithNuance || " +nuance" : "";
        const inst = s.instruction ? ` // ${s.instruction.slice(0, 45)}...` : "";
        return `  ${idx + 1}. [${s.id}] "${s.label}" (${s.role}, ${status}${meaning})${inst}`;
      });
      const enabledCount = slots.filter((s) => s.enabled).length;
      const header = `\u21C4 [${lbl.hudTitle}] ${lbl.slotsHeader || "Dynamic Slots"} (${enabledCount}/${slots.length} ${lbl.slotsActiveTag || "active"}):
`;
      const body = lines.length > 0 ? lines.join("\n") : `  (${lbl.slotsNone || "No slots configured"})`;
      const nlTitle = lbl.slotsNlTitle ? `

${lbl.slotsNlTitle}
` : "";
      const nlExamples = (lbl.slotsNlExamples || []).map((ex) => `  ${ex}`).join("\n");
      const cliTitle = lbl.slotsCliTitle ? `

${lbl.slotsCliTitle}
` : "";
      const cliHelp = (lbl.slotsCliHelp || []).map((cmd) => `  ${cmd}`).join("\n");
      const help = `${header}${body}${nlTitle}${nlExamples}${cliTitle}${cliHelp}`;
      ctx.ui.notify(help, "info");
      return;
    }
    if (subCmd === "reset") {
      state.slots = getDefaultSlots(state.sourceLang);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: void 0, slotPreset: void 0 });
      globalLingualCache.clear();
      const resetMsg = (lbl.slotsResetSuccess || "\u21C4 [{pair}] Reset slots to clean defaults").replace("{pair}", lbl.hudTitle);
      ctx.ui.notify(resetMsg, "info");
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
      const existing = (state.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", lbl.hudTitle).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      state.slots = removeSlotFromList(state.slots || [], targetId);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: void 0 });
      globalLingualCache.clear();
      const extraHint = targetId === "source" ? lbl.slotsRemovedSourceNote || " (Source line will no longer appear on cards)" : "";
      const removedTpl = lbl.slotsRemovedSuccess || '[{pair}] Removed slot [{id}] ("{label}")';
      const notifyMsg = removedTpl.replace("{pair}", lbl.hudTitle).replace("{id}", targetId).replace("{label}", existing.label) + extraHint;
      ctx.ui.notify(notifyMsg, "info");
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
      const existing = (state.slots || []).find((s) => s.id.toLowerCase() === targetId);
      if (!existing) {
        const notFoundMsg = (lbl.slotsNotFound || "Slot [{id}] not found").replace("{pair}", lbl.hudTitle).replace("{id}", targetId);
        ctx.ui.notify(notFoundMsg, "warning");
        return;
      }
      state.slots = toggleSlotInList(state.slots || [], targetId);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: void 0 });
      globalLingualCache.clear();
      const updated = state.slots.find((s) => s.id.toLowerCase() === targetId);
      const statusText = updated?.enabled ? lbl.slotsStatusEnabled || "enabled" : lbl.slotsStatusDisabled || "disabled";
      const toggledTpl = lbl.slotsToggled || "[{pair}] Slot [{id}] is now {status}";
      const notifyMsg = toggledTpl.replace("{pair}", lbl.hudTitle).replace("{id}", targetId).replace("{status}", statusText);
      ctx.ui.notify(notifyMsg, "info");
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
      const newSlot = createCustomSlot({
        id,
        label,
        instruction: instruction || void 0
      });
      state.slots = addSlotToList(state.slots || [], newSlot);
      state.slotPreset = "";
      saveUserLingualConfig({ slots: state.slots, slotPreset: void 0 });
      globalLingualCache.clear();
      const addedTpl = lbl.slotsAdded || '[{pair}] Added/updated slot [{id}] "{label}"';
      const notifyMsg = addedTpl.replace("{pair}", lbl.hudTitle).replace("{id}", id).replace("{label}", label);
      ctx.ui.notify(notifyMsg, "info");
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
      const template = lbl.notifySlotSwitched || "[{pair}] Applied preset [{preset}]: {desc}";
      const notifyMsg = template.replace("{pair}", lbl.hudTitle).replace("{preset}", subCmd).replace("{desc}", matchedPreset.description);
      ctx.ui.notify(notifyMsg, "info");
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
    const promptSlotNames = (state.promptSlots || getDefaultPromptSlots(state.sourceLang)).filter((s) => s.enabled !== false).map((s) => s.label).join(" / ");
    const outLang = state.promptLang || state.targetLang;
    const statusMsg = formatStatusReport(state.labels, {
      mode: state.mode,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      activeModel,
      layout: state.compact ? "capsule" : "tree",
      cacheStats: globalLingualCache.getStats()
    }) + `
\u2022 Companion Slots (original): [${state.slotPreset || "developer"}] (${(state.slots || []).filter((s) => s.enabled).map((s) => s.label).join(", ")})
\u2022 Prompt Optimizer (english/select): Output=[${outLang}] \xB7 Styles=[${promptSlotNames}]${state.promptRule ? ` \xB7 Rule="${state.promptRule}"` : ""}`;
    ctx.ui.notify(statusMsg, "info");
  };
  const showLastHandler = async (_args, ctx) => {
    if (session.getReadyPages().length > 0) {
      renderActiveCard(ctx);
      ctx.ui.notify(state.labels.notifyHistoryRestored || `[${state.labels.hudTitle}] Restored previous companion card`, "info");
      return;
    }
    const last = session.getLastResult();
    if (!last) {
      ctx.ui.notify(state.labels.notifyNoHistory || `[${state.labels.hudTitle}] No previous companion card recorded`, "info");
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
    ctx.ui.notify(state.labels.notifyHistoryRestored || `[${state.labels.hudTitle}] Restored previous companion card`, "info");
  };
  const showAgentGuideHandler = async (_args, ctx) => {
    const isZh = state.sourceLang === "zh" || state.sourceLang === "tw";
    const isJa = state.sourceLang === "ja";
    const isEs = state.sourceLang === "es";
    const isFr = state.sourceLang === "fr";
    const isDe = state.sourceLang === "de";
    let guide = "";
    if (isZh) {
      guide = `\u{1F916} lingual-tuner \u53CC\u5F15\u64CE\u5B9A\u5236\u6307\u5357 (\u4F34\u5B66\u6A21\u5F0F vs \u63D0\u793A\u8BCD\u4F18\u5316\u6A21\u5F0F):

pi-lingual \u5185\u7F6E lingual-tuner \u6280\u80FD\u3002\u65E0\u9700\u624B\u6572\u590D\u6742\u547D\u4EE4\uFF0C\u76F4\u63A5\u8DDF\u5F53\u524D Agent \u8BF4\u51FA\u60A8\u7684\u504F\u597D\uFF1A
1. \u5B9A\u5236\u3010\u4F34\u5B66\u6A21\u5F0F (original \xB7 \u8BED\u611F\u8BCD\u5361 slots)\u3011:
   \u2022 "\u4F34\u5B66\u5361\u7247\u4E0D\u8981\u663E\u793A\u4E2D\u6587\u539F\u6587\uFF0C\u53EA\u8981\u7EAF\u8BD1\u6587"
   \u2022 "\u5E2E\u6211\u914D\u7F6E\u63A8\u7279\u63A8\u6587\u548C\u6DF1\u5EA6\u5206\u6790\u4E24\u4E2A\u4F34\u5B66\u69FD\u4F4D"
2. \u5B9A\u5236\u3010\u63D0\u793A\u8BCD\u4F18\u5316\u6A21\u5F0F (english \u76F4\u51FA\u91CD\u5199 / select \u591A\u98CE\u683C\u5019\u9009\u586B\u5165)\u3011:
   \u2022 "\u628A\u6211\u7684\u63D0\u793A\u8BCD\u91CD\u5199\u6A21\u5F0F\u8BBE\u4E3A\u4E2D\u6587\u8F93\u51FA\uFF0C\u5E76\u53E0\u52A0\u4E0A\u6700\u5C0F\u6539\u52A8\u539F\u5219"
   \u2022 "\u5F00\u542F\u591A\u98CE\u683C\u5019\u9009\u6A21\u5F0F (select)\uFF0C\u7ED9\u6211\u751F\u6210\u6781\u7B80\u9AD8\u6548\u3001\u7ED3\u6784\u5316\u89C4\u8303\u3001TDD\u6D4B\u8BD5\u9A71\u52A8 3 \u4E2A\u5019\u9009\u63D0\u793A\u8BCD\u8BA9\u6211\u9009"

Agent \u4F1A\u76F4\u63A5\u66F4\u65B0 ~/.pi/agent/lingual.json\uFF0C\u5355\u56DE\u5408\u5373\u523B\u751F\u6548\uFF01
\u6A21\u5F0F\u5207\u6362\uFF1A/lingual <original|english|select|off> \xB7 \u8BED\u8A00\u5207\u6362\uFF1A/lang <zh|ja|en|es|fr|de>\u3002`;
    } else if (isJa) {
      guide = `\u{1F916} lingual-tuner \u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u6848\u5185 (\u4F34\u8D70\u30E2\u30FC\u30C9 vs \u30D7\u30ED\u30F3\u30D7\u30C8\u6700\u9069\u5316\u30E2\u30FC\u30C9):

pi-lingual \u306F lingual-tuner \u30B9\u30AD\u30EB\u3092\u5185\u8535\u3057\u3066\u3044\u307E\u3059\u3002Agent \u306B\u76F4\u63A5\u3054\u8981\u671B\u3092\u304A\u4F1D\u3048\u304F\u3060\u3055\u3044\uFF1A
1. \u3010\u4F34\u8D70\u30E2\u30FC\u30C9 (original \xB7 \u8A9E\u5B66\u30B9\u30ED\u30C3\u30C8 slots)\u3011:
   \u2022 \u300C\u4F34\u8D70\u30AB\u30FC\u30C9\u306B\u539F\u6587\u3092\u8868\u793A\u305B\u305A\u3001\u8A33\u6587\u306E\u307F\u8868\u793A\u3057\u3066\u300D
2. \u3010\u30D7\u30ED\u30F3\u30D7\u30C8\u6700\u9069\u5316\u30E2\u30FC\u30C9 (english \u76F4\u63A5\u66F8\u304D\u63DB\u3048 / select \u8907\u6570\u5019\u88DC\u9078\u629E)\u3011:
   \u2022 \u300C\u30D7\u30ED\u30F3\u30D7\u30C8\u6700\u9069\u5316\u3092\u65E5\u672C\u8A9E\u51FA\u529B\u306B\u8A2D\u5B9A\u3057\u3001\u6700\u5C0F\u5909\u66F4\u539F\u5247\u3092\u8FFD\u52A0\u3057\u3066\u300D
   \u2022 \u300C\u8907\u6570\u5019\u88DC\u30E2\u30FC\u30C9 (select) \u306B\u3057\u3066\u3001\u7C21\u6F54\u30FB\u69CB\u9020\u5316\u30FB\u6839\u672C\u539F\u56E0\u306E3\u3064\u306E\u5019\u88DC\u304B\u3089\u9078\u3079\u308B\u3088\u3046\u306B\u3057\u3066\u300D

Agent \u304C ~/.pi/agent/lingual.json \u3092\u76F4\u63A5\u66F4\u65B0\u3057\u3001\u5373\u5EA7\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\uFF01`;
    } else {
      guide = `\u{1F916} lingual-tuner Dual-Engine Customization Guide (Companion vs Prompt Optimizer):

pi-lingual includes a built-in lingual-tuner skill. Just describe your preferences to your Agent:
1. Customize [Companion Mode (original \xB7 language learning slots)]:
   \u2022 "Hide original text on companion cards, show translations only"
   \u2022 "Configure companion with Twitter Hook and Technical Insight slots"
2. Customize [Prompt Optimizer Mode (english direct rewrite / select N-choice picker)]:
   \u2022 "Configure prompt rewrite mode to output in my native language and enforce smallest working diff"
   \u2022 "Switch to select mode with 3 custom prompt styles: Concise, Structured Spec, and TDD"

Your Agent will update ~/.pi/agent/lingual.json directly in a single turn!
Switch modes: /lingual <original|english|select|off> \xB7 Switch language: /lang <zh|ja|en|es|fr|de>.`;
    }
    ctx.ui.notify(guide, "info");
  };
  const masterCommandHandler = async (args, ctx) => {
    const trimmed = args?.trim();
    if (!trimmed) {
      await setModeHandler("", ctx);
      return;
    }
    const lower = trimmed.toLowerCase();
    const spaceIndex = lower.indexOf(" ");
    const sub = spaceIndex === -1 ? lower : lower.slice(0, spaceIndex);
    const subArgs = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();
    if (sub === "lang" || sub === "language") {
      await switchLangHandler(subArgs, ctx);
      return;
    }
    if (sub === "slots" || sub === "slot" || sub === "preset") {
      await switchSlotsHandler(subArgs, ctx);
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
    if (sub === "last" || sub === "prev" || sub === "history") {
      await showLastHandler(subArgs, ctx);
      return;
    }
    if (sub === "agent" || sub === "help" || sub === "?") {
      await showAgentGuideHandler(subArgs, ctx);
      return;
    }
    if (sub === "news" || sub === "whatsnew" || sub === "changelog") {
      const diskCfg = loadUserLingualConfig();
      renderReleaseBanner(ctx, diskCfg.sourceLang || state.sourceLang);
      return;
    }
    if (sub === "mode" || sub === "original" || sub === "english" || sub === "refine" || sub === "rewrite" || sub === "select" || sub === "choices" || sub === "pick" || sub === "off" || sub === "orig" || sub === "disable" || sub === "stop") {
      await setModeHandler(sub === "mode" ? subArgs : trimmed, ctx);
      return;
    }
    const possibleLang = normalizeLangCode(sub);
    if (LANGUAGE_PRESETS[possibleLang]) {
      await switchLangHandler(trimmed, ctx);
      return;
    }
    await setModeHandler(trimmed, ctx);
  };
  pi.registerCommand("lingual", {
    description: state.labels.cmdDescMode || "Switch or manage companion: /lingual [lang|slots|compact|model|status|last|original|english|off]",
    handler: masterCommandHandler
  });
  pi.registerCommand("lingual-mode", {
    description: state.labels.cmdDescMode || "Set companion mode: /lingual-mode <original|english|off>",
    handler: setModeHandler
  });
  pi.registerCommand("slots", {
    description: state.labels.cmdDescSlots || "Inspect, add, remove, or customize dynamic slots: /slots [add|rm|toggle|reset]",
    handler: switchSlotsHandler
  });
  pi.registerCommand("lingual-slots", {
    description: state.labels.cmdDescSlots || "Dynamic slots management (alias): /lingual-slots [add|rm|toggle|reset]",
    handler: switchSlotsHandler
  });
  pi.registerCommand("lang", {
    description: state.labels.cmdDescLang || "Switch companion language: /lang <zh|ja|en|es|fr|de> [target]",
    handler: switchLangHandler
  });
  pi.registerCommand("lingual-lang", {
    description: state.labels.cmdDescLang || "Switch companion language (alias): /lingual-lang <zh|ja|en|es|fr|de>",
    handler: switchLangHandler
  });
  pi.registerCommand("lingual-compact", {
    description: state.labels.cmdDescCompact || "Toggle single-line capsule mode: /lingual-compact",
    handler: toggleCompactHandler
  });
  pi.registerCommand("lingual-model", {
    description: state.labels.cmdDescModel || "Inspect or switch companion model: /lingual-model [model-id|auto]",
    handler: setModelHandler
  });
  pi.registerCommand("status", {
    description: state.labels.cmdDescStatus || "Display companion status report: /status",
    handler: showStatusHandler
  });
  pi.registerCommand("lingual-status", {
    description: state.labels.cmdDescStatus || "Display companion status report (alias): /lingual-status",
    handler: showStatusHandler
  });
  pi.registerCommand("last", {
    description: state.labels.cmdDescLast || "Replay previous companion card: /last",
    handler: showLastHandler
  });
  pi.registerCommand("lingual-last", {
    description: state.labels.cmdDescLast || "Replay previous companion card (alias): /lingual-last",
    handler: showLastHandler
  });
  pi.registerCommand("lingual-agent", {
    description: state.labels.cmdDescAgent || "View companion customization and language guide: /lingual-agent",
    handler: showAgentGuideHandler
  });
  if (typeof pi.registerShortcut === "function") {
    pi.registerShortcut("alt+.", {
      description: state.labels.shortcutNextPage || "Switch to next companion segment",
      handler: async (ctx) => {
        if (session.nextPage()) {
          renderActiveCard(ctx);
        }
      }
    });
    pi.registerShortcut("alt+,", {
      description: state.labels.shortcutPrevPage || "Switch to previous companion segment",
      handler: async (ctx) => {
        if (session.prevPage()) {
          renderActiveCard(ctx);
        }
      }
    });
  }
  const createModelCompleter = (ctx) => {
    return async (text, systemPrompt, signal) => {
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
        const requestOptions = {
          maxTokens: 1500
        };
        if (diskConfig.reasoning) {
          requestOptions.reasoning = diskConfig.reasoning;
        }
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
        const abortPromise = new Promise((_, reject) => {
          if (signal?.aborted) reject(new Error("Lingual translation aborted"));
          signal?.addEventListener("abort", () => reject(new Error("Lingual translation aborted")), { once: true });
        });
        let res;
        try {
          res = await Promise.race([stream.result(), timeoutPromise, abortPromise]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
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
    if (state.mode === "off") return { action: "continue" };
    if (event.source === "extension") return { action: "continue" };
    const latestDisk = loadUserLingualConfig();
    if (latestDisk.slots && Array.isArray(latestDisk.slots)) {
      state.slots = latestDisk.slots;
    }
    if (latestDisk.promptLang !== void 0) {
      state.promptLang = latestDisk.promptLang;
    }
    if (latestDisk.promptRule !== void 0) {
      state.promptRule = latestDisk.promptRule;
    }
    if (latestDisk.promptSlots && Array.isArray(latestDisk.promptSlots)) {
      state.promptSlots = latestDisk.promptSlots;
    }
    const raw = event.text.trim();
    if (!raw) return { action: "continue" };
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
    const isPromptOptMode = state.mode === "english" || state.mode === "select";
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
    const completer = createModelCompleter(ctx);
    session.initPagination(1);
    if (state.mode === "original") {
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
        if (!session.isLatest(generation) || state.mode !== "original" || signal.aborted) {
          return;
        }
        translatePrompt(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          labels: state.labels,
          slots: state.slots,
          slotPreset: state.slotPreset,
          complete: completer,
          signal
        }).then((result) => {
          if (!session.isLatest(generation) || state.mode !== "original" || signal.aborted) {
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
    if (state.mode === "select") {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget(
            "lingual_hud",
            [ctx.ui.theme.fg("muted", "  \u22EF \u2726 [lingual] generating prompt candidates...")],
            { placement: "aboveEditor" }
          );
          ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "\u2726 [lingual] generating candidates..."));
        } catch {
        }
      }
      try {
        const candidates = await generatePromptCandidates(promptToTranslate, {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
          promptLang: state.promptLang || void 0,
          promptRule: state.promptRule || void 0,
          promptSlots: state.promptSlots,
          complete: completer,
          signal
        });
        if (!session.isLatest(generation) || !candidates || candidates.length === 0) {
          if (hasActiveUI(ctx)) safeClearWidget(ctx);
          return { action: "continue" };
        }
        const maxCols = getEffectiveMaxCols();
        const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " \u21B5 ");
        const candidateSlotResults = [
          { id: "source", label: state.labels.sourceLabel || "\u539F\u6587", role: "source", content: singleLineSource },
          ...candidates.map((c, idx) => ({
            id: c.id,
            label: `${idx + 1}:${c.label}`,
            role: "translation",
            content: c.content.replace(/\s*\r?\n\s*/g, " \u21B5 ")
          }))
        ];
        session.setPageResult(
          0,
          {
            sourceText: singleLineSource,
            spoken: candidates[0].content.replace(/\s*\r?\n\s*/g, " \u21B5 "),
            written: candidates[1]?.content.replace(/\s*\r?\n\s*/g, " \u21B5 ") || "",
            annotated: "",
            slots: candidateSlotResults
          },
          generation
        );
        if (hasActiveUI(ctx)) {
          const previewLines = [
            truncateVisual(
              `  ${ctx.ui.theme.fg("muted", `\xB7 [${state.labels.sourceLabel || "\u539F\u6587"}]`)} ${singleLineSource}`,
              maxCols
            )
          ];
          candidates.slice(0, 6).forEach((c, idx, arr) => {
            const branch = idx === 0 ? "\u250C" : idx === arr.length - 1 ? "\u2514" : "\u251C";
            const oneLineContent = c.content.replace(/\s*\r?\n\s*/g, " \u21B5 ");
            previewLines.push(
              truncateVisual(
                `  ${ctx.ui.theme.fg("accent", `${branch} [${idx + 1}:${c.label}]`)} ${oneLineContent}`,
                maxCols
              )
            );
          });
          try {
            ctx.ui.setWidget("lingual_hud", previewLines, { placement: "aboveEditor" });
          } catch {
          }
        }
        let chosenText = candidates[0].content;
        if (hasActiveUI(ctx) && typeof ctx.ui.select === "function") {
          const langCode = (state.sourceLang || "zh").toLowerCase().split("-")[0];
          const selectPrompts = {
            zh: { title: "\u2726 \u9009\u62E9\u8981\u53D1\u9001\u7ED9 AI \u7684\u4F18\u5316\u63D0\u793A\u8BCD\uFF1A", keepOrig: "\u4FDD\u6301\u539F\u8BDD\u76F4\u53D1" },
            tw: { title: "\u2726 \u9078\u64C7\u8981\u767C\u9001\u7D66 AI \u7684\u512A\u5316\u63D0\u793A\u8A5E\uFF1A", keepOrig: "\u4FDD\u6301\u539F\u8A71\u76F4\u767C" },
            ja: { title: "\u2726 AI \u306B\u9001\u4FE1\u3059\u308B\u6700\u9069\u5316\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u9078\u629E\uFF1A", keepOrig: "\u539F\u6587\u306E\u307E\u307E\u9001\u4FE1" },
            ko: { title: "\u2726 AI\uC5D0\uAC8C \uBCF4\uB0BC \uCD5C\uC801\uD654\uB41C \uD504\uB86C\uD504\uD2B8 \uC120\uD0DD:", keepOrig: "\uC6D0\uBB38 \uADF8\uB300\uB85C \uC804\uC1A1" },
            es: { title: "\u2726 Seleccione el prompt optimizado para enviar:", keepOrig: "Enviar original" },
            fr: { title: "\u2726 S\xE9lectionnez le prompt optimis\xE9 \xE0 envoyer :", keepOrig: "Envoyer l'original" },
            de: { title: "\u2726 Optimierten Prompt zum Senden ausw\xE4hlen:", keepOrig: "Original senden" },
            ru: { title: "\u2726 \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438:", keepOrig: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B" },
            en: { title: "\u2726 Select optimized prompt to send:", keepOrig: "Send original" }
          };
          const sp = selectPrompts[langCode] || selectPrompts.en;
          const optMaxCols = Math.max(20, maxCols - 18);
          const optionLabels = [
            ...candidates.map((c, idx) => `[${idx + 1}] ${c.label}: ${truncateVisual(c.content.replace(/\s*\r?\n\s*/g, " \u21B5 "), optMaxCols)}`),
            `[0] ${sp.keepOrig}: ${truncateVisual(singleLineSource, optMaxCols)}`
          ];
          const picked = await ctx.ui.select(sp.title, optionLabels);
          if (!picked || picked.startsWith("[0]")) {
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
        let finalText = sanitized.rawPayload ? `${chosenText}

${sanitized.rawPayload}` : chosenText;
        const diskConfig = loadUserLingualConfig();
        const effectiveOutLang = (state.promptLang || state.targetLang || "en").toLowerCase().split("-")[0];
        if (effectiveOutLang !== state.sourceLang && shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)) {
          finalText += formatNativeReplyGuardHint(state.sourceLang);
        }
        return {
          action: "transform",
          text: finalText,
          images: event.images
        };
      } catch {
        if (hasActiveUI(ctx)) safeClearWidget(ctx);
        return { action: "continue" };
      } finally {
        if (session.isLatest(generation) && hasActiveUI(ctx)) {
          updateFooter(ctx);
        }
      }
    }
    if (hasActiveUI(ctx)) {
      try {
        ctx.ui.setWidget(
          "lingual_hud",
          [ctx.ui.theme.fg("muted", "  \u22EF \u26A1 [lingual] optimizing prompt...")],
          { placement: "aboveEditor" }
        );
        ctx.ui.setStatus("lingual", ctx.ui.theme.fg("accent", "\u26A1 [lingual] optimizing..."));
      } catch {
      }
    }
    try {
      const rewritten = await rewritePromptDirect(promptToTranslate, {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        promptLang: state.promptLang || void 0,
        promptRule: state.promptRule || void 0,
        complete: completer,
        signal
      });
      if (!session.isLatest(generation)) {
        return { action: "continue" };
      }
      if (!rewritten) {
        if (hasActiveUI(ctx)) {
          try {
            ctx.ui.setWidget("lingual_hud", void 0);
            const timeoutTemplate = state.labels.notifyTimeout || "[{pair}] Prompt rewrite timed out or not ready; original prompt passed";
            ctx.ui.notify(timeoutTemplate.replace("{pair}", state.labels.hudTitle), "warning");
          } catch {
          }
        }
        return { action: "continue" };
      }
      const outLang = (state.promptLang || state.targetLang || "en").toLowerCase().split("-")[0];
      const singleLineSource = promptToTranslate.replace(/\s*\r?\n\s*/g, " \u21B5 ");
      const singleLineRewritten = rewritten.replace(/\s*\r?\n\s*/g, " \u21B5 ");
      session.setPageResult(
        0,
        {
          sourceText: singleLineSource,
          spoken: singleLineRewritten,
          written: "",
          annotated: "",
          slots: [
            { id: "source", label: state.labels.sourceLabel || "\u539F\u6587", role: "source", content: singleLineSource },
            { id: "rewritten", label: `\u26A1${outLang.toUpperCase()}`, role: "translation", content: singleLineRewritten }
          ]
        },
        generation
      );
      if (hasActiveUI(ctx)) {
        try {
          const maxCols = getEffectiveMaxCols();
          const previewLines = [
            truncateVisual(
              `  ${ctx.ui.theme.fg("muted", `\xB7 [${state.labels.sourceLabel || "\u539F\u6587"}]`)} ${singleLineSource}`,
              maxCols
            ),
            truncateVisual(
              `  ${ctx.ui.theme.fg("accent", `\u2514 [\u26A1${outLang.toUpperCase()}]`)} ${singleLineRewritten}`,
              maxCols
            )
          ];
          ctx.ui.setWidget("lingual_hud", previewLines, { placement: "aboveEditor" });
        } catch {
        }
      }
      let finalText = sanitized.rawPayload ? `${rewritten}

${sanitized.rawPayload}` : rewritten;
      const diskConfig = loadUserLingualConfig();
      if (outLang !== state.sourceLang && shouldInjectNativeReplyGuard(event.text, state.sourceLang, diskConfig.replyInSourceLang)) {
        finalText += formatNativeReplyGuardHint(state.sourceLang);
      }
      return {
        action: "transform",
        text: finalText,
        images: event.images
      };
    } catch {
      if (hasActiveUI(ctx)) {
        try {
          ctx.ui.setWidget("lingual_hud", void 0);
          const errTemplate = state.labels.notifyError || "[{pair}] Prompt rewrite error; original prompt passed";
          ctx.ui.notify(errTemplate.replace("{pair}", state.labels.hudTitle), "warning");
        } catch {
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
