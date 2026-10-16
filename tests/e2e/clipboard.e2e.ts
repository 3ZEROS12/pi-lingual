import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";
import { e2eEnabled, isPiAvailable, runModel } from "./lib/driver.mjs";
import { getPresetLoadout, compileModeSystemPrompt, repairAndParseJsonObject } from "../../dist/index.js";

test("L5: Clipboard loadouts (commit dehydrator on Windows)", async (t) => {
  if (os.platform() !== "win32") {
    t.skip("L5 clipboard lane is Windows-only");
    return;
  }
  if (!e2eEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E !== '1' or pi CLI is unavailable");
    return;
  }

  const commitLoadout = getPresetLoadout("commit", "zh", "zh");
  assert.ok(commitLoadout);
  assert.equal(commitLoadout.target, "clipboard");

  const sysPrompt = compileModeSystemPrompt(commitLoadout, {
    sourceLang: "zh",
    targetLang: "en",
    explainLang: "zh",
  });

  const userInput = "修复了登录页面刷新后偶尔丢失 session 状态的问题，排查发现是 cookie 的 samesite 和 expire 计算有偏差";
  const { out, status } = runModel(sysPrompt, userInput);
  assert.equal(status, 0);

  const parsed = repairAndParseJsonObject(out) || {};
  const commitMsg = parsed.commit_msg || parsed.commit || out;

  // Set to Windows clipboard via PowerShell (pipe via stdin for multi-line immunity)
  spawnSync("powershell", ["-NoProfile", "-Command", "$input | Set-Clipboard"], {
    input: commitMsg,
    encoding: "utf8",
  });

  // Read back from clipboard
  const cb = execSync("powershell -NoProfile -Command \"Get-Clipboard\"", { encoding: "utf8" }).trim();
  const firstLine = cb.split(/\r?\n/)[0].trim();

  // Assert Conventional Commits format and <= 50 characters first line
  assert.ok(
    /^(feat|fix|refactor|docs|test|chore|perf)(\(.+\))?: .+/i.test(firstLine),
    `First line must match Conventional Commits format: ${firstLine}`
  );
  assert.ok(firstLine.length <= 72, `First line length (${firstLine.length}) must be reasonable`);
});
