import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { e2eEnabled, isPiAvailable } from "./lib/driver.js";
import { formatReleaseBannerLines } from "../../dist/index.js";
import { getVisualWidth } from "../../dist/index.js";

test("L6: Real terminal visual layout & manual checklist", async (t) => {
  // Check if tmux or headless PTY is available (macOS / Linux)
  const hasTmux = os.platform() !== "win32" && spawnSync("which", ["tmux"]).status === 0;

  if (!hasTmux) {
    // Print manual visual QA checklist for Windows/environments without PTY
    console.log("\n[L6 Manual Visual QA Checklist]:");
    console.log("  1. 8-line three-core banner shows 0 '...' truncation at 80 cols across all 9 languages.");
    console.log("  2. Companion 4-slot card aligns without border tears or CJK ghosting.");
    console.log("  3. Off mode completely clears status bar badge (0 visual pixels).");
    console.log("  4. 20-col and 30-col viewports clip gracefully without exceeding terminal width.\n");

    // Static geometry verification as fallback in L6
    const lines = formatReleaseBannerLines("zh", 80);
    assert.equal(lines.length, 8);
    for (const line of lines) {
      assert.ok(getVisualWidth(line) <= 78);
      assert.ok(!line.endsWith("..."));
    }
    return;
  }

  if (!e2eEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E !== '1' or pi CLI is unavailable");
    return;
  }

  // Under tmux: test real capture-pane
  const sessionName = `pi-lingual-e2e-${Date.now()}`;
  try {
    spawnSync("tmux", ["new-session", "-d", "-s", sessionName, "-x", "80", "-y", "24", "pi", "-p", "--no-session", "hello"]);
    const capture = spawnSync("tmux", ["capture-pane", "-p", "-t", sessionName], { encoding: "utf8" });
    const screen = capture.stdout || "";
    // Verify no border splitting tears
    assert.ok(!screen.includes("│   │"), "Terminal output must not produce border splitting tears");
  } finally {
    spawnSync("tmux", ["kill-session", "-t", sessionName]);
  }
});
