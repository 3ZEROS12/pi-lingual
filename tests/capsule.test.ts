import test from "node:test";
import assert from "node:assert/strict";
import { formatCapsuleLine, getVisualWidth, truncateVisual } from "../src/engine.js";

test("truncateVisual - strictly respects maxVisualCols including ellipsis allowance", () => {
  const cjk = "落霞与孤鹜齐飞秋水共长天一色";
  assert.ok(getVisualWidth(truncateVisual(cjk, 10)) <= 10, "Width must strictly be <= 10 cells");
  assert.ok(getVisualWidth(truncateVisual(cjk, 15)) <= 15, "Width must strictly be <= 15 cells");
  assert.ok(getVisualWidth(truncateVisual(cjk, 20)) <= 20, "Width must strictly be <= 20 cells");
});

test("formatCapsuleLine - strictly bounds visual width under extreme narrow columns", () => {
  const spoken = "This feels a bit over-engineered; we'd be much better off just sticking with standard library.";
  const written = "The proposed approach introduces unnecessary complexity. Native implementations are preferred.";

  for (const cols of [30, 40, 50, 60, 80]) {
    const line = formatCapsuleLine("zh ⇄ en", spoken, written, { maxCols: cols });
    const actualWidth = getVisualWidth(line);
    assert.ok(
      actualWidth <= cols,
      `Capsule line width (${actualWidth}) must strictly be <= maxCols (${cols})`
    );
    assert.ok(!line.includes("\n"), "Must be strictly a single terminal line");
  }
});

test("formatCapsuleLine - formats single-line compact representation for both slots", () => {
  const line = formatCapsuleLine(
    "二 ⇄ two",
    "Totally on board with that.",
    "Acknowledged. Let's proceed.",
    {
      slot1Short: "口",
      slot2Short: "写",
      maxCols: 80,
    }
  );

  assert.ok(line.startsWith("⇄ [二 ⇄ two] "));
  assert.ok(line.includes("口: Totally on board with that."));
  assert.ok(line.includes(" · 写: Acknowledged. Let's proceed."));
  assert.ok(!line.includes("\n"), "Must be strictly a single line");
});

test("formatCapsuleLine - dynamically truncates slots when maxCols is narrow without line break", () => {
  const line = formatCapsuleLine(
    "二 ⇄ two",
    "This feels a bit over-engineered; we'd be much better off just sticking with standard library.",
    "The proposed approach introduces unnecessary complexity. Native implementations are preferred.",
    {
      slot1Short: "口",
      slot2Short: "写",
      maxCols: 50,
    }
  );

  assert.ok(!line.includes("\n"), "Must remain strictly a single line under narrow column budget");
  assert.ok(line.includes("口: "));
  assert.ok(line.includes(" · 写: "));
});

test("formatCapsuleLine - handles single slot without slot 2", () => {
  const line = formatCapsuleLine(
    "two ⇄ 二",
    "Let's keep going.",
    undefined,
    {
      slot1Short: "Spk",
      maxCols: 60,
    }
  );

  assert.ok(line.startsWith("⇄ [two ⇄ 二] "));
  assert.ok(line.includes("Spk: Let's keep going."));
  assert.ok(!line.includes(" · "), "Must not include slot separator when slot 2 is absent");
});
