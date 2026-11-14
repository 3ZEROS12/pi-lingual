/**
 * Unicode UAX #11 visual width measurement, delimiter-balanced truncation,
 * and Kinsoku Shori line wrapping.
 */

export const CANNOT_START_LINE_CHARS = new Set([
  ",", ".", ";", "!", "?", ":",
  "，", "。", "；", "！", "？", "：", "、",
  ")", "]", "}", "）", "】", "”", "’", "»",
]);

const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

export function getEffectiveMaxCols(requested?: number): number {
  const terminalCols =
    process.stdout?.columns ||
    (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : undefined);
  if (typeof requested === "number") {
    if (typeof terminalCols === "number" && terminalCols > 0) {
      return Math.min(terminalCols, Math.max(10, requested));
    }
    return Math.max(25, requested);
  }
  const raw =
    typeof terminalCols === "number" && terminalCols > 0
      ? terminalCols - 8
      : 120;
  if (typeof terminalCols === "number" && terminalCols > 0) {
    return Math.min(terminalCols, Math.max(10, raw));
  }
  return Math.max(25, raw);
}

export function getBannerMaxCols(): number {
  const terminalCols =
    process.stdout?.columns ||
    (process.env.COLUMNS ? parseInt(process.env.COLUMNS, 10) : undefined);
  if (typeof terminalCols !== "number" || terminalCols <= 0) return 78;
  return Math.min(terminalCols, Math.max(25, terminalCols - 2));
}

export function getVisualWidth(str: string): number {
  let width = 0;
  const clean = str.replace(ANSI_ESCAPE_REGEX, "");
  let afterZWJ = false;
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (
      code === 0x200d ||
      code === 0xfe0f ||
      code === 0xfe0e ||
      (code >= 0x1f3fb && code <= 0x1f3ff) ||
      (code >= 0x0300 && code <= 0x036f) ||
      (code >= 0x1ab0 && code <= 0x1aff) ||
      (code >= 0x1dc0 && code <= 0x1dff) ||
      (code >= 0x20d0 && code <= 0x20ff) ||
      (code >= 0xfe20 && code <= 0xfe2f) ||
      (code >= 0xe0100 && code <= 0xe01ef) ||
      (code >= 0x200b && code <= 0x200f)
    ) {
      if (code === 0x200d) afterZWJ = true;
      continue;
    }

    if (afterZWJ) {
      afterZWJ = false;
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

function closingDelimitersFor(text: string): string {
  const clean = text.replace(ANSI_ESCAPE_REGEX, "");

  const pairs: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
    "（": "）",
    "【": "】",
    "「": "」",
    "『": "』",
  };
  const closersMap: Record<string, string> = {
    ")": "(",
    "]": "[",
    "}": "{",
    "）": "（",
    "】": "【",
    "」": "「",
    "』": "『",
  };

  const stack: string[] = [];
  let inDouble = false;
  let inSingle = false;
  let inBacktick = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const prev = i > 0 ? clean[i - 1] : "";
    if (prev === "\\") continue;

    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === "'" && !inDouble && !inBacktick) {
      const next = i + 1 < clean.length ? clean[i + 1] : "";
      if (/[a-zA-Z]/.test(prev) && /[a-zA-Z]/.test(next)) continue;
      inSingle = !inSingle;
      continue;
    }
    if (ch === "`" && !inDouble && !inSingle) {
      inBacktick = !inBacktick;
      continue;
    }

    if (inDouble || inSingle || inBacktick) continue;

    if (pairs[ch]) {
      stack.push(pairs[ch]);
    } else if (closersMap[ch]) {
      const topIdx = stack.lastIndexOf(ch);
      if (topIdx !== -1) stack.splice(topIdx, 1);
    }
  }

  let quoteCloser = "";
  if (inDouble) quoteCloser = '"';
  else if (inSingle) quoteCloser = "'";
  else if (inBacktick) quoteCloser = "`";

  return quoteCloser + stack.reverse().join("");
}

export function truncateVisual(str: string, maxVisualCols: number): string {
  if (maxVisualCols <= 0) return "";
  const singleLine = str.replace(/[\r\n\t]+/g, " ");
  const fullWidth = getVisualWidth(singleLine);
  if (fullWidth <= maxVisualCols) return singleLine;
  if (maxVisualCols <= 3) return ".".repeat(maxVisualCols);

  const clipAt = (limit: number): string => {
    let curWidth = 0;
    let result = "";
    let i = 0;
    let lastSpaceRawIdx = -1;
    let lastSpaceVisWidth = 0;

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

      if (curWidth + w > limit) break;
      if (ch === " ") {
        lastSpaceRawIdx = result.length;
        lastSpaceVisWidth = curWidth;
      }
      result += ch;
      curWidth += w;
      i += charLen;
    }

    const cleanTail = result.replace(ANSI_ESCAPE_REGEX, "");
    if (/[a-zA-Z\u0400-\u04FF]$/.test(cleanTail) && lastSpaceRawIdx > 0) {
      if (lastSpaceVisWidth > limit * 0.45) {
        result = result.slice(0, lastSpaceRawIdx);
      }
    }

    return result
      .replace(/[,'"—\-:;]+\s*$/, "")
      .replace(/\s*[\(\[\{（【]$/, "");
  };

  const targetCols = Math.max(1, maxVisualCols - 3);
  let result = clipAt(targetCols);

  const closers = closingDelimitersFor(result);
  const closerWidth = getVisualWidth(closers);
  if (closerWidth > 0 && targetCols > closerWidth) {
    result = clipAt(targetCols - closerWidth) + closers;
  }

  return result + (singleLine.includes("\x1b") ? "\x1b[0m" : "") + "...";
}

export function wrapVisualText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const rawLines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  const tokenRegex =
    /\x1b\[[0-9;]*[a-zA-Z]|\s+|[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]|[^\s\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\x1b]+/g;
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
    if (line.trim()) lines.push(line);
  }

  return lines.length > 0 ? lines : [text];
}
