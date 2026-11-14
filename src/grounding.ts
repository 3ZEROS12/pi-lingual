import { execFileSync } from "node:child_process";

interface CachedFileList {
  files: string[];
  scannedAt: number;
}

const FILE_LIST_CACHE = new Map<string, CachedFileList>();
const FILE_LIST_TTL_MS = 15_000;
const MAX_INDEXED_FILES = 5_000;

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "when", "where", "which",
  "what", "have", "has", "had", "not", "but", "are", "was", "were", "will", "can", "could",
  "should", "would", "make", "keep", "only", "also", "then", "than", "here", "there",
  "fix", "add", "update", "remove", "delete", "check", "inspect", "trace", "refactor",
  "implement", "change", "modify", "clean", "run", "test", "tests", "build", "error",
  "bug", "issue", "code", "file", "files", "function", "method", "class", "logic", "diff",
  "minimal", "please", "help", "want", "need", "let", "use", "using", "don", "dont",
]);

export function clearRepoFileCache(): void {
  FILE_LIST_CACHE.clear();
}

export function listRepoFiles(cwd: string = process.cwd()): string[] {
  const now = Date.now();
  const cached = FILE_LIST_CACHE.get(cwd);
  if (cached && now - cached.scannedAt < FILE_LIST_TTL_MS) {
    return cached.files;
  }

  try {
    const out = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1500,
      }
    );
    const files = out
      .split(/\r?\n/)
      .map((f) => f.trim().replace(/\\/g, "/"))
      .filter((f) => f && !f.startsWith("node_modules/") && !f.startsWith("dist/"))
      .slice(0, MAX_INDEXED_FILES);
    FILE_LIST_CACHE.set(cwd, { files, scannedAt: now });
    return files;
  } catch {
    return [];
  }
}

export function extractQueryIdentifiers(text: string): string[] {
  if (!text) return [];
  const rawTokens = text.match(/[a-zA-Z_][a-zA-Z0-9_.-]{2,}/g) || [];
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of rawTokens) {
    if (raw.includes("/")) continue;
    const cleaned = raw.replace(/^[._-]+|[._-]+$/g, "").toLowerCase();
    if (cleaned.length < 3) continue;
    if (STOP_WORDS.has(cleaned)) continue;
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      tokens.push(cleaned);
    }
  }
  return tokens;
}

export function resolveRepoFileAnchors(
  text: string,
  cwd: string = process.cwd(),
  maxResults = 5,
  filesOverride?: string[]
): string[] {
  const tokens = extractQueryIdentifiers(text);
  if (tokens.length === 0) return [];

  const files = filesOverride ?? listRepoFiles(cwd);
  if (files.length === 0) return [];

  const scored: Array<{ file: string; score: number }> = [];
  for (const file of files) {
    const lower = file.toLowerCase();
    if (text.toLowerCase().includes(lower)) continue;

    const segments = lower.split("/");
    const baseName = segments[segments.length - 1] || "";
    const stem = baseName.replace(/\.[^.]+$/, "");

    let score = 0;
    for (const tok of tokens) {
      if (baseName === tok || stem === tok) {
        score += 10;
      } else if (segments.includes(tok)) {
        score += 6;
      } else if (stem.startsWith(tok) || stem.includes(`-${tok}`) || stem.includes(`_${tok}`)) {
        score += 4;
      }
    }

    if (score >= 6) {
      scored.push({ file, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.file.length - b.file.length);
  return scored.slice(0, maxResults).map((s) => s.file);
}

export function formatRepoGroundingHint(anchors: string[]): string {
  if (!anchors || anchors.length === 0) return "";
  return `[REPO FILE ANCHORS (resolve module references only if clearly intended; never invent unrelated targets)]: ${anchors.join(", ")}`;
}
