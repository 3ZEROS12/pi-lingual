import { test } from "node:test";
import assert from "node:assert/strict";
import { formatReleaseBannerLines } from "../src/engine.js";
import { getBannerMaxCols, truncateVisual, getVisualWidth } from "../src/layout.js";
import { getDefaultFactoryModes, SUPPORTED_LANG_CODES } from "../src/presets.js";

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
  withCols(40, () => assert.equal(getBannerMaxCols(), 38));
  withCols(30, () => assert.equal(getBannerMaxCols(), 28));
  withCols(20, () => assert.equal(getBannerMaxCols(), 20, "Never render wider than live terminal"));
  withCols(10, () => assert.equal(getBannerMaxCols(), 10, "Never render wider than live terminal"));
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

test("narrow terminals - release banner real path through getBannerMaxCols across 20, 30, 40, 80 columns (C1)", () => {
  const openRegex = /[(\[{（【]/g;
  const closeRegex = /[)\]}）】]/g;

  for (const cols of [20, 30, 40, 80]) {
    withCols(cols, () => {
      const budget = getBannerMaxCols();
      if (cols === 20) assert.equal(budget, 20);
      if (cols === 30) assert.equal(budget, 28);
      if (cols === 40) assert.equal(budget, 38);
      if (cols === 80) assert.equal(budget, 78);

      for (const lang of LANGS) {
        const lines = formatReleaseBannerLines(lang, budget);
        assert.equal(lines.length, 8, `[${lang} @ ${cols}col] banner must stay at 8 lines`);
        for (const line of lines) {
          assert.ok(
            getVisualWidth(line) <= budget,
            `[${lang} @ ${cols}col] banner line overflows real budget (${getVisualWidth(line)} > ${budget}): ${line}`
          );
          assert.ok(
            getVisualWidth(line) <= cols,
            `[${lang} @ ${cols}col] banner line overflows terminal columns (${getVisualWidth(line)} > ${cols}): ${line}`
          );
          if (cols === 80) {
            assert.ok(!line.endsWith("..."), `[${lang}] must have 0 truncation at 80 cols: ${line}`);
          }
          const opens = (line.match(openRegex) || []).length;
          const closes = (line.match(closeRegex) || []).length;
          assert.equal(opens, closes, `[${lang} @ ${cols}col] unclosed delimiter in clipped line: ${line}`);
        }
      }
    });
  }
});

test("banner geometry - banner lines accurately embed factory registry mode names without desync (D3)", () => {
  for (const lang of SUPPORTED_LANG_CODES) {
    const lines = formatReleaseBannerLines(lang, 78);
    assert.equal(lines.length, 8, `[${lang}] banner must have 8 lines`);
    const names = getDefaultFactoryModes(lang, lang).map((m) => m.name);
    assert.equal(names.length, 3, `[${lang}] must have 3 factory modes`);
    names.forEach((name, i) => {
      const bannerRow = lines[4 + i];
      assert.ok(
        bannerRow.includes(name),
        `[${lang}] banner row ${4 + i} must contain registry mode name "${name}": ${bannerRow}`
      );
    });
    for (const line of lines) {
      assert.ok(getVisualWidth(line) <= 78, `[${lang}] line > 78 cols: ${line}`);
      assert.ok(!line.endsWith("..."), `[${lang}] clipped at 78 cols: ${line}`);
    }
  }
});

