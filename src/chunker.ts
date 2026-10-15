/**
 * Splits text into atomic natural sentence chunks when long.
 * Preserves punctuation (。！？；\n and .!?\n).
 *
 * Line Budget & Ergonomics:
 * Calibrated to ~65 characters per card to ensure full tree branches fit within 6-8 lines
 * without triggering compact capsule degradation or over-fragmenting short inputs.
 */
export function splitSemanticChunks(text: string, maxChunkChars = 65): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // If text is within budget, keep sentence atomic without splitting
  if (trimmed.length <= maxChunkChars) {
    return [trimmed];
  }

  // Split along sentence terminators (CJK and Latin)
  const rawSegments = trimmed.split(/([。！？；\n]|[.!?](?=\s|$))/);
  const sentences: string[] = [];
  let cur = "";

  for (let i = 0; i < rawSegments.length; i++) {
    const part = rawSegments[i];
    if (!part) continue;
    cur += part;
    if (/[。！？；\n]/.test(part) || /[.!?]/.test(part)) {
      if (cur.trim()) sentences.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) {
    sentences.push(cur.trim());
  }

  // If input contains only 1 sentence or no terminal punctuation:
  if (sentences.length <= 1) {
    if (trimmed.length <= maxChunkChars) {
      return [trimmed];
    }
    // Sub-split by comma/clause if single sentence is gigantic
    // Keep trailing punctuation attached; avoid orphan comma chunks
    const commaParts: string[] = [];
    let lastIdx = 0;
    const commaRegex = /[，,、]/g;
    let match: RegExpExecArray | null;
    while ((match = commaRegex.exec(trimmed)) !== null) {
      const end = match.index + 1;
      commaParts.push(trimmed.slice(lastIdx, end).trim());
      lastIdx = end;
    }
    if (lastIdx < trimmed.length) {
      commaParts.push(trimmed.slice(lastIdx).trim());
    }

    const subChunks: string[] = [];
    let subCur = "";
    for (const cp of commaParts) {
      if (!cp) continue;
      if (subCur.length + cp.length <= maxChunkChars || subCur === "") {
        subCur += cp;
      } else {
        if (subCur.trim()) subChunks.push(subCur.trim());
        subCur = cp;
      }
    }
    if (subCur.trim()) subChunks.push(subCur.trim());

    // Safety cutoff: split long unpunctuated chunks smoothly by character count
    const boundedChunks: string[] = [];
    for (const chunk of subChunks) {
      if (chunk.length <= maxChunkChars) {
        boundedChunks.push(chunk);
      } else {
        // Prefer splitting on spaces, fall back to character count
        let remain = chunk;
        while (remain.length > maxChunkChars) {
          const slicePoint = remain.lastIndexOf(" ", maxChunkChars);
          const splitIdx = slicePoint > 10 ? slicePoint : maxChunkChars;
          boundedChunks.push(remain.slice(0, splitIdx).trim());
          remain = remain.slice(splitIdx).trim();
        }
        if (remain.trim()) {
          boundedChunks.push(remain.trim());
        }
      }
    }

    return boundedChunks.length > 0 ? boundedChunks : [trimmed];
  }

  // Combine small consecutive sentences if under maxChunkChars
  // Avoid inserting spaces after CJK punctuation or scripts
  const chunks: string[] = [];
  let chunkBuffer = "";

  for (const s of sentences) {
    const needSpace = chunkBuffer && !/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af，。！？；]/.test(chunkBuffer.slice(-1));
    const addedLen = s.length + (needSpace ? 1 : 0);
    if (chunkBuffer.length + addedLen <= maxChunkChars || chunkBuffer === "") {
      chunkBuffer += (needSpace ? " " : "") + s;
    } else {
      if (chunkBuffer.trim()) chunks.push(chunkBuffer.trim());
      chunkBuffer = s;
    }
  }
  if (chunkBuffer.trim()) {
    chunks.push(chunkBuffer.trim());
  }

  return chunks.length > 0 ? chunks : [trimmed];
}
