import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTreeBranch, getVisualWidth, wrapVisualText } from "../src/engine.js";

test("getVisualWidth - handles ANSI escapes, CJK, and ASCII accurately", () => {
  assert.equal(getVisualWidth("hello"), 5);
  assert.equal(getVisualWidth("中文测试"), 8);
  assert.equal(getVisualWidth("\x1b[32mhello\x1b[0m"), 5);
  assert.equal(getVisualWidth("  ┌ [口语] "), 11);
});

test("formatTreeBranch - aligns wrapped text with hanging indent strictly behind heading", () => {
  const longText =
    "Also, regarding the layout in C:\\Users\\Jason\\AppData\\Local\\Temp\\pi-clipboard-15e4d0e5-0052-4f95-a1a6-080b13cb401b.png, I'd like to tweak it. Why is the text rendering ahead of the heading?";

  const lines = formatTreeBranch("┌", "│", "口语", longText, s => s, s => s, s => s, 80);

  assert.ok(lines.length >= 2, "Long text must wrap into multiple lines");
  assert.ok(lines[0].startsWith("  ┌ [口语] "), "First line must start with tree branch tag");

  for (let i = 1; i < lines.length; i++) {
    assert.ok(
      lines[i].startsWith("  │        "),
      `Wrapped line ${i} must have tree continuation rail and hanging indent, never start at column 0`
    );
  }
});
