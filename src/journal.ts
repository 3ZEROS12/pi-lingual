/**
 * Opt-in Daily Markdown Journal (`LINGUAL_LOG=1` / `/lingual log`).
 *
 * Appends generated companion cards to a local Markdown file (`~/lingual-log/YYYY-MM-DD.md`
 * or `$LINGUAL_LOG_DIR/YYYY-MM-DD.md`), deduplicated by source text per day, using the
 * active localized UI slot labels and zero extra model calls.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { LingualI18nLabels, LingualResult } from "./types.js";
import { isTestEnvironment, loadUserLingualConfig } from "./config.js";

export interface JournalConfig {
  enabled: boolean;
  dir: string;
}

const seenByDateFile = new Map<string, Set<string>>();

export function formatJournalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatJournalTime(now: Date = new Date()): string {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function resolveJournalConfig(overrides?: {
  enabled?: boolean;
  dir?: string;
}): JournalConfig {
  const envFlag = (process.env.LINGUAL_LOG || "").trim().toLowerCase();
  const envEnabled =
    envFlag === "1" || envFlag === "true" || envFlag === "on" || envFlag === "yes";
  const envDir = (process.env.LINGUAL_LOG_DIR || "").trim();

  if (isTestEnvironment() && !overrides?.dir && !envDir) {
    return {
      enabled: Boolean(overrides?.enabled),
      dir: "",
    };
  }

  const disk = loadUserLingualConfig();
  const enabled =
    overrides?.enabled !== undefined
      ? Boolean(overrides.enabled)
      : envFlag !== ""
        ? envEnabled
        : Boolean((disk as any).journal);

  const rawDir =
    overrides?.dir ||
    envDir ||
    (typeof (disk as any).journalDir === "string" ? (disk as any).journalDir.trim() : "") ||
    path.join(os.homedir(), "lingual-log");

  const resolvedDir = rawDir.startsWith("~/") || rawDir.startsWith("~\\")
    ? path.join(os.homedir(), rawDir.slice(2))
    : path.resolve(rawDir);

  return { enabled, dir: resolvedDir };
}

export function resolveDailyJournalPath(
  customDir?: string,
  now: Date = new Date()
): string | null {
  const cfg = resolveJournalConfig(customDir ? { enabled: true, dir: customDir } : undefined);
  if (!cfg.enabled || !cfg.dir) return null;
  return path.join(cfg.dir, `${formatJournalDate(now)}.md`);
}

export function formatJournalCardMarkdown(
  result: LingualResult,
  options: {
    labels?: Partial<LingualI18nLabels>;
    sourceLang?: string;
    targetLang?: string;
    now?: Date;
  } = {}
): string {
  const labels = options.labels || {};
  const sourceLabel = labels.sourceLabel || "Source";
  const slot1Label = labels.slot1Label || labels.spokenLabel || "Spoken";
  const slot2Label = labels.slot2Label || labels.writtenLabel || "Written";
  const vocabLabel = labels.vocabLabel || "Vocab";
  const pair =
    labels.hudTitle ||
    (options.sourceLang && options.targetLang
      ? `${options.sourceLang} ⇄ ${options.targetLang}`
      : "lingual");
  const timeStr = formatJournalTime(options.now);
  const cleanSource = (result.sourceText || "").replace(/\s*\r?\n\s*/g, " ").trim();

  const lines: string[] = [
    `## ${timeStr} · [${pair}] ${cleanSource}`,
    "",
    `- **[${sourceLabel}]** ${cleanSource}`,
  ];

  if (Array.isArray(result.slots) && result.slots.length > 0) {
    for (const s of result.slots) {
      if (s.role === "source" || !s.content?.trim()) continue;
      const cleanContent = s.content.replace(/\s*\r?\n\s*/g, " ").trim();
      const meaningSuffix = s.meaning?.trim() ? ` *(${s.meaning.trim()})*` : "";
      lines.push(`- **[${s.label || s.id}]** ${cleanContent}${meaningSuffix}`);
    }
  } else {
    if (result.spoken?.trim()) {
      const m1 = result.spokenMeaning?.trim() ? ` *(${result.spokenMeaning.trim()})*` : "";
      lines.push(`- **[${slot1Label}]** ${result.spoken.trim()}${m1}`);
    }
    if (result.written?.trim()) {
      const m2 = result.writtenMeaning?.trim() ? ` *(${result.writtenMeaning.trim()})*` : "";
      lines.push(`- **[${slot2Label}]** ${result.written.trim()}${m2}`);
    }
    if (result.vocab?.trim()) {
      lines.push(`- **[${vocabLabel}]** ${result.vocab.trim()}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function appendJournalCard(
  result: LingualResult,
  options: {
    labels?: Partial<LingualI18nLabels>;
    sourceLang?: string;
    targetLang?: string;
    customDir?: string;
    now?: Date;
  } = {}
): { written: boolean; filePath?: string } {
  const cleanSource = (result?.sourceText || "").replace(/\s*\r?\n\s*/g, " ").trim();
  if (!cleanSource || !result?.spoken?.trim()) return { written: false };

  const now = options.now || new Date();
  const filePath = resolveDailyJournalPath(options.customDir, now);
  if (!filePath) return { written: false };

  const normKey = cleanSource.toLowerCase();
  let seen = seenByDateFile.get(filePath);
  if (!seen) {
    seen = new Set<string>();
    if (fs.existsSync(filePath)) {
      try {
        const existing = fs.readFileSync(filePath, "utf8");
        for (const line of existing.split(/\r?\n/)) {
          const m = line.match(/^##\s+\d{2}:\d{2}\s+·\s+\[[^\]]+\]\s+(.+)$/);
          if (m && m[1]) seen.add(m[1].trim().toLowerCase());
        }
      } catch {}
    }
    seenByDateFile.set(filePath, seen);
  }

  if (seen.has(normKey)) {
    return { written: false, filePath };
  }

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const isNewFile = !fs.existsSync(filePath);
    const header = isNewFile ? `# pi-lingual Journal (${formatJournalDate(now)})\n\n` : "";
    const entryMd = formatJournalCardMarkdown(result, { ...options, now });
    fs.appendFileSync(filePath, `${header}${entryMd}\n`, "utf8");
    seen.add(normKey);
    return { written: true, filePath };
  } catch {
    return { written: false };
  }
}

export function clearJournalMemoryCache(): void {
  seenByDateFile.clear();
}
