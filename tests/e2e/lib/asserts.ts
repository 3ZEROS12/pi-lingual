// Quality assertion helpers for real model outputs
export const KILL_LIST: string[] = [
  "delve",
  "tapestry",
  "seamless",
  "seamlessly",
  "robust",
  "streamline",
  "comprehensive",
  "enhance",
  "game-changer",
  "pivotal",
  "holistic",
  "unleash",
  "thrilled to announce",
];

export const IMPERATIVE_VERBS: string[] = [
  "Inspect",
  "Refactor",
  "Implement",
  "Fix",
  "Trace",
  "Add",
  "Remove",
  "Update",
  "Migrate",
  "Merge",
  "Extract",
  "Check",
  "Diagnose",
  "Prevent",
  "Replace",
  "Simplify",
  "Inline",
  "Split",
  "Eliminate",
  "Consolidate",
  "Clean",
  "Reorganize",
  "Standardize",
  "Avoid",
];

export const ACADEMIC_DOWNGRADE_LIST: string[] = [
  "utilize",
  "facilitate",
  "leverage",
  "commence",
  "endeavor",
  "aforementioned",
  "subsequently",
];

export function assertNoKillListWords(text: string): void {
  const lower = text.toLowerCase();
  for (const word of KILL_LIST) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      throw new Error(`Output contains forbidden buzzword "${word}": ${text}`);
    }
  }
}

export function assertStartsImperative(text: string): void {
  const clean = text.trim().replace(/^[`'"]+/, "");
  const firstWord = (clean.split(/\s+/)[0] || "").replace(/[^a-zA-Z]/g, "");
  const matched = IMPERATIVE_VERBS.some(
    (v) => v.toLowerCase() === firstWord.toLowerCase()
  );
  if (!matched) {
    throw new Error(`Output does not start with a recognized imperative active verb (got "${firstWord}"): ${text}`);
  }
}

export function assertNoChineseResidue(text: string): void {
  if (/[\u4e00-\u9fa5]/.test(text)) {
    throw new Error(`Output leaked Chinese characters: ${text}`);
  }
}

export function assertProfanityPreserved(
  input: string,
  output: string,
  words: string[] = ["fuck", "damn", "shit", "suck"]
): void {
  const inLower = input.toLowerCase();
  const outLower = output.toLowerCase();
  for (const w of words) {
    if (inLower.includes(w) && !outLower.includes(w)) {
      throw new Error(`Profanity/raw passion "${w}" was sanitized or dropped: ${output}`);
    }
  }
}

export function calculateJaccardSimilarity(strA: string, strB: string): number {
  const tokensA = new Set(strA.toLowerCase().split(/\W+/).filter(Boolean));
  const tokensB = new Set(strB.toLowerCase().split(/\W+/).filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}
