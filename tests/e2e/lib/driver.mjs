import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const e2eEnabled = process.env.PI_LINGUAL_E2E === "1";
export const e2eFullEnabled = process.env.PI_LINGUAL_E2E_FULL === "1";

export function withSandbox(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-lingual-e2e-"));
  try {
    return fn(home);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

/**
 * Probes whether `pi` CLI binary is accessible on the host machine.
 */
export function isPiAvailable() {
  try {
    const res = spawnSync("pi", ["--version"], {
      encoding: "utf8",
      shell: true,
      timeout: 5000,
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Runs a real model call through the installed pi CLI, with the compiled mode prompt as system prompt.
 */
export function runModel(systemPrompt, userInput, { timeoutMs = 240000, extraArgs = [] } = {}) {
  return withSandbox((home) => {
    const spFile = path.join(home, "system-prompt.txt");
    fs.writeFileSync(spFile, systemPrompt, "utf8");
    const started = Date.now();
    const res = spawnSync(
      "pi",
      ["-p", "--no-session", "-ne", "-ns", "-nt", "--append-system-prompt", spFile, ...extraArgs, userInput],
      {
        env: { ...process.env, HOME: home, USERPROFILE: home },
        encoding: "utf8",
        shell: true,
        timeout: timeoutMs,
      }
    );
    return {
      out: (res.stdout || "").trim(),
      err: (res.stderr || "").trim(),
      status: res.status,
      ms: Date.now() - started,
    };
  });
}
