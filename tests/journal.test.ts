import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendJournalCard,
  clearJournalMemoryCache,
  formatJournalCardMarkdown,
  formatJournalDate,
  resolveDailyJournalPath,
} from "../src/journal.js";
import { resolveLabelsForLang } from "../src/presets.js";

test("Journal - formatJournalCardMarkdown formats companion card with localized slot labels", () => {
  const labels = resolveLabelsForLang("zh", undefined, "en");
  const now = new Date(2026, 9, 26, 14, 35, 0);
  const md = formatJournalCardMarkdown(
    {
      sourceText: "把这段逻辑重构一下，不要破坏现有接口",
      spoken: "Let's refactor this logic without breaking the existing API.",
      spokenMeaning: "把这段逻辑重构一下，不要破坏现有接口。",
      written: "Refactor this implementation while preserving full API backward compatibility.",
      writtenMeaning: "在保持 API 完全向后兼容的前提下重构该实现。",
      vocab: "backward compatibility (向后兼容) · preserve (保留)",
      annotated: "",
    },
    { labels, sourceLang: "zh", targetLang: "en", now }
  );

  assert.ok(md.includes("## 14:35 · [zh ⇄ en] 把这段逻辑重构一下，不要破坏现有接口"));
  assert.ok(md.includes("- **[原文]** 把这段逻辑重构一下，不要破坏现有接口"));
  assert.ok(md.includes("- **[口语]** Let's refactor this logic without breaking the existing API."));
  assert.ok(md.includes("- **[写作]** Refactor this implementation while preserving full API backward compatibility."));
  assert.ok(md.includes("- **[重点]** backward compatibility (向后兼容) · preserve (保留)"));
});

test("Journal - appendJournalCard writes daily Markdown file and deduplicates by sourceText within the same day", () => {
  clearJournalMemoryCache();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lingual-journal-test-"));
  try {
    const now = new Date(2026, 9, 26, 9, 15, 0);
    const labels = resolveLabelsForLang("zh", undefined, "en");
    const sample = {
      sourceText: "排查一下为什么内存泄漏了",
      spoken: "Let's investigate why memory is leaking.",
      written: "Diagnose the root cause of the memory leak.",
      vocab: "memory leak (内存泄漏) · root cause (根因)",
      annotated: "",
    };

    const first = appendJournalCard(sample, {
      labels,
      sourceLang: "zh",
      targetLang: "en",
      customDir: tmpDir,
      now,
    });
    assert.equal(first.written, true);
    assert.equal(first.filePath, path.join(tmpDir, `${formatJournalDate(now)}.md`));
    assert.equal(fs.existsSync(first.filePath!), true);

    // Second call with identical sourceText on the same day must be deduplicated
    const second = appendJournalCard(sample, {
      labels,
      sourceLang: "zh",
      targetLang: "en",
      customDir: tmpDir,
      now,
    });
    assert.equal(second.written, false);

    // Simulating a cold restart (clearing in-memory Set) still deduplicates from existing file content
    clearJournalMemoryCache();
    const third = appendJournalCard(sample, {
      labels,
      sourceLang: "zh",
      targetLang: "en",
      customDir: tmpDir,
      now,
    });
    assert.equal(third.written, false);

    const content = fs.readFileSync(first.filePath!, "utf8");
    assert.ok(content.startsWith("# pi-lingual Journal (2026-10-26)"));
    assert.equal(content.split("## 09:15").length - 1, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Journal - respects LINGUAL_LOG=1 and LINGUAL_LOG_DIR environment variables", () => {
  clearJournalMemoryCache();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lingual-env-journal-"));
  const prevLog = process.env.LINGUAL_LOG;
  const prevDir = process.env.LINGUAL_LOG_DIR;
  try {
    process.env.LINGUAL_LOG = "1";
    process.env.LINGUAL_LOG_DIR = tmpDir;
    const now = new Date(2026, 9, 27, 18, 5, 0);
    const resolved = resolveDailyJournalPath(undefined, now);
    assert.equal(resolved, path.join(tmpDir, "2026-10-27.md"));

    const res = appendJournalCard(
      {
        sourceText: "ここのロック競合を確認して",
        spoken: "Could you check the lock contention here?",
        written: "Verify the lock contention in this section.",
        vocab: "lock contention (ロック競合)",
        annotated: "",
      },
      { sourceLang: "ja", targetLang: "en", now }
    );
    assert.equal(res.written, true);
    assert.ok(fs.readFileSync(res.filePath!, "utf8").includes("lock contention"));
  } finally {
    if (prevLog === undefined) delete process.env.LINGUAL_LOG;
    else process.env.LINGUAL_LOG = prevLog;
    if (prevDir === undefined) delete process.env.LINGUAL_LOG_DIR;
    else process.env.LINGUAL_LOG_DIR = prevDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
