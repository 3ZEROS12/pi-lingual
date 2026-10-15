import { test } from "node:test";
import assert from "node:assert/strict";
import { formatReleaseBannerLines } from "../src/engine.js";
import { getBannerMaxCols, truncateVisual, getVisualWidth } from "../src/layout.js";

const LANGS = ["zh", "tw", "ja", "ko", "es", "fr", "de", "ru", "en"];

const withCols = (cols: number, run: () => void) => {
  const prev = process.env.COLUMNS;
  process.env.COLUMNS = String(cols);
  try {
    run();
  } finally {
    if (prev === undefined) delete process.env.COLUMNS;
    else process.env.COLUMNS = prev;
  }
};

test("banner geometry - reserves 2 columns, never the HUD card border reserve of 8", () => {
  withCols(80, () => assert.equal(getBannerMaxCols(), 78));
  withCols(60, () => assert.equal(getBannerMaxCols(), 58));
  withCols(10, () => assert.equal(getBannerMaxCols(), 25, "Physical minimum of 25 columns must hold"));
});

test("banner geometry - zero '...' truncation for all 9 languages on a standard 80-column terminal", () => {
  withCols(80, () => {
    const budget = getBannerMaxCols();
    for (const lang of LANGS) {
      const lines = formatReleaseBannerLines(lang, budget);
      assert.equal(lines.length, 8, `[${lang}] banner must stay at 8 lines`);
      for (const line of lines) {
        assert.ok(
          !line.endsWith("..."),
          `[${lang}] banner line was clipped on an 80-col terminal: ${line}`
        );
        assert.ok(
          getVisualWidth(line) <= budget,
          `[${lang}] banner line overflows the ${budget}-col budget: ${line}`
        );
      }
    }
  });
});

test("banner geometry - ANSI colorized copy is measured by visual width, not escape bytes", () => {
  withCols(80, () => {
    const budget = getBannerMaxCols();
    const colorize = (_c: string, t: string) => `\x1b[90m${t}\x1b[0m`;
    for (const lang of LANGS) {
      const lines = formatReleaseBannerLines(lang, budget, colorize);
      for (const line of lines) {
        assert.ok(getVisualWidth(line) <= budget, `[${lang}] colorized banner line overflows`);
        assert.ok(!line.replace(/\x1b\[[0-9;]*m/g, "").endsWith("..."), `[${lang}] colorized banner clipped`);
      }
    }
  });
});

test("narrow terminals - truncateVisual degrades gracefully without dangling parentheses (Invariant 11)", () => {
  const zh = "  │   (内置 4 大实战配装；想加发推、对线等模式，一句话秒成)";
  const ascii = "  │   (Run /tuner to add or edit modes with AI in one turn)";

  for (const sample of [zh, ascii]) {
    for (const width of [30, 32, 40, 50, 60]) {
      const out = truncateVisual(sample, width);
      assert.ok(getVisualWidth(out) <= width, `Output must respect the live budget (${out} @${width})`);
      const opens = (out.match(/[\(\[\{（【]/g) || []).length;
      const closes = (out.match(/[\)\]\}）】]/g) || []).length;
      assert.equal(opens, closes, `Dangling unclosed delimiter survived the clip: ${out}`);
      if (getVisualWidth(sample) > width) {
        assert.ok(out.endsWith("..."), `Clipped line must carry a clean ellipsis: ${out}`);
      } else {
        assert.equal(out, sample, "Lines that already fit must pass through untouched");
      }
    }
  }
});

test("narrow terminals - truncateVisual never drops a trailing opener and never overflows", () => {
  assert.equal(truncateVisual("abcde (", 6), "abc...");
  assert.equal(truncateVisual("abcdefghij", 5), "ab...");
  assert.equal(truncateVisual("hello", 5), "hello");
  assert.ok(getVisualWidth(truncateVisual("中文中文中文中文", 7)) <= 7);
});
