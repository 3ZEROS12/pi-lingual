import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { isTestEnvironment } from "./config.js";

export interface PhrasebookEntry {
  term: string;
  meaning: string;
  langPair: string;
  modeId: string;
  contextSnippet: string;
  count: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

const MAX_PHRASEBOOK_ENTRIES = 500;

export function resolvePhrasebookPath(customPath?: string): string | null {
  if (customPath) return customPath;
  if (process.env.PI_LINGUAL_PHRASEBOOK_PATH) {
    return process.env.PI_LINGUAL_PHRASEBOOK_PATH;
  }
  if (isTestEnvironment()) {
    return null;
  }
  const agentDir = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
  return path.join(agentDir, "lingual-phrasebook.jsonl");
}

export function parseVocabEntries(vocabText: string | undefined): Array<{ term: string; meaning: string }> {
  if (!vocabText || !vocabText.trim()) return [];
  const parts = vocabText.split(/\s*(?:·|•)\s*/);
  const results: Array<{ term: string; meaning: string }> = [];

  for (const rawPart of parts) {
    const clean = rawPart.trim();
    if (!clean || clean === "..." || clean === "…") continue;
    const parenMatch = clean.match(/^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/);
    if (parenMatch) {
      const term = parenMatch[1].trim();
      const meaning = parenMatch[2].trim();
      if (term.length >= 2) {
        results.push({ term, meaning });
      }
    } else if (clean.length >= 2) {
      results.push({ term: clean, meaning: "" });
    }
  }
  return results;
}

export function readPhrasebook(customPath?: string): PhrasebookEntry[] {
  const filePath = resolvePhrasebookPath(customPath);
  if (!filePath || !fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const entries: PhrasebookEntry[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as PhrasebookEntry;
        if (parsed && typeof parsed.term === "string" && parsed.term.trim()) {
          entries.push(parsed);
        }
      } catch {}
    }
    return entries;
  } catch {
    return [];
  }
}

function writePhrasebook(filePath: string, entries: PhrasebookEntry[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const trimmed =
    entries.length > MAX_PHRASEBOOK_ENTRIES
      ? [...entries]
          .sort((a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt)
          .slice(0, MAX_PHRASEBOOK_ENTRIES)
      : entries;
  const content = trimmed.map((e) => JSON.stringify(e)).join("\n") + (trimmed.length > 0 ? "\n" : "");
  fs.writeFileSync(filePath, content, "utf8");
}

export function recordPhrasebookFromResult(
  params: {
    vocab?: string;
    sourceText?: string;
    sourceLang: string;
    targetLang: string;
    modeId: string;
  },
  customPath?: string
): number {
  const filePath = resolvePhrasebookPath(customPath);
  if (!filePath) return 0;

  const parsed = parseVocabEntries(params.vocab);
  if (parsed.length === 0) return 0;

  const langPair = `${params.sourceLang} ➔ ${params.targetLang}`;
  const contextSnippet = (params.sourceText || "").replace(/\s*\r?\n\s*/g, " ").trim().slice(0, 80);
  const now = Date.now();

  const existing = readPhrasebook(filePath);
  const byKey = new Map<string, PhrasebookEntry>();
  for (const item of existing) {
    byKey.set(`${item.term.toLowerCase()}::${item.langPair}`, item);
  }

  let updatedCount = 0;
  for (const { term, meaning } of parsed) {
    const key = `${term.toLowerCase()}::${langPair}`;
    const prev = byKey.get(key);
    if (prev) {
      prev.count += 1;
      prev.lastSeenAt = now;
      if (meaning) prev.meaning = meaning;
      if (contextSnippet) prev.contextSnippet = contextSnippet;
    } else {
      byKey.set(key, {
        term,
        meaning,
        langPair,
        modeId: params.modeId,
        contextSnippet,
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
    updatedCount += 1;
  }

  try {
    writePhrasebook(filePath, Array.from(byKey.values()));
    return updatedCount;
  } catch {
    return 0;
  }
}

export function clearPhrasebook(customPath?: string): boolean {
  const filePath = resolvePhrasebookPath(customPath);
  if (!filePath) return false;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch {
    return false;
  }
}

export function formatPhrasebookDigest(entries: PhrasebookEntry[], limit = 12): string {
  if (!entries || entries.length === 0) {
    return "✦ [pi-lingual Phrasebook] No phrases captured yet. Keep coding with pi-lingual active to build your contextual phrasebook.";
  }

  const sorted = [...entries].sort((a, b) => b.lastSeenAt - a.lastSeenAt || b.count - a.count);
  const top = sorted.slice(0, limit);
  const lines = top.map((e, i) => {
    const meaningPart = e.meaning ? ` — ${e.meaning}` : "";
    const countTag = e.count > 1 ? ` (×${e.count})` : "";
    const ctxPart = e.contextSnippet ? `  · "${e.contextSnippet}"` : "";
    return `  ${i + 1}. ${e.term}${meaningPart}${countTag}${ctxPart}`;
  });

  return (
    `✦ [pi-lingual Phrasebook] (${entries.length} captured expressions · showing latest ${top.length})\n` +
    lines.join("\n") +
    `\n\nExport: /lingual digest export md | /lingual digest export anki | /lingual digest clear`
  );
}

export function exportPhrasebook(
  entries: PhrasebookEntry[],
  format: "md" | "anki",
  outDir: string = process.cwd()
): { filePath: string; count: number } {
  const sorted = [...entries].sort((a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  if (format === "anki") {
    const filePath = path.join(outDir, "lingual-anki.tsv");
    const rows = sorted.map((e) => {
      const clean = (s: string) => (s || "").replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
      return `${clean(e.term)}\t${clean(e.meaning)}\t${clean(e.contextSnippet)} [${e.langPair}]`;
    });
    fs.writeFileSync(filePath, rows.join("\n") + (rows.length > 0 ? "\n" : ""), "utf8");
    return { filePath, count: sorted.length };
  }

  const filePath = path.join(outDir, "lingual-digest.md");
  const lines = [
    "# pi-lingual Contextual Phrasebook Digest",
    "",
    "| Term / Pattern | Meaning / Nuance | Coding Context | Pair | Hits |",
    "| :--- | :--- | :--- | :--- | ---: |",
    ...sorted.map((e) => {
      const esc = (s: string) => (s || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
      return `| \`${esc(e.term)}\` | ${esc(e.meaning)} | ${esc(e.contextSnippet)} | ${esc(e.langPair)} | ${e.count} |`;
    }),
    "",
  ];
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  return { filePath, count: sorted.length };
}
