import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const e2eEnabled = process.env.PI_LINGUAL_E2E === "1";
export const e2eFullEnabled = process.env.PI_LINGUAL_E2E_FULL === "1";

export function withSandbox<T>(fn: (home: string) => T): T {
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
export function isPiAvailable(): boolean {
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

export interface RunModelResult {
  out: string;
  err: string;
  status: number | null;
  ms: number;
  overBudget: boolean;
}

export interface LatencyRecord {
  label: string;
  ms: number;
  overBudget: boolean;
  status: number | null;
}

export const latencyRecords: LatencyRecord[] = [];
export const SOFT_BUDGET_MS = Number(process.env.PI_LINGUAL_E2E_BUDGET_MS || 60000);

/**
 * Runs a real model call through the installed pi CLI, with the compiled mode prompt as system prompt.
 */
export function runModel(
  systemPrompt: string,
  userInput: string,
  {
    timeoutMs = 240000,
    extraArgs = [] as string[],
    label = "model-call",
  }: { timeoutMs?: number; extraArgs?: string[]; label?: string } = {}
): RunModelResult {
  return withSandbox((home: string) => {
    const hostAgentDir = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
    const sandboxAgentDir = path.join(home, ".pi", "agent");
    fs.mkdirSync(sandboxAgentDir, { recursive: true });
    for (const file of ["models.json", "auth.json"]) {
      const src = path.join(hostAgentDir, file);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(sandboxAgentDir, file));
    }
    const hostSettingsPath = path.join(hostAgentDir, "settings.json");
    let defaultProvider: string | undefined;
    let defaultModel: string | undefined;
    if (fs.existsSync(hostSettingsPath)) {
      try {
        const hs = JSON.parse(fs.readFileSync(hostSettingsPath, "utf8"));
        defaultProvider = hs.defaultProvider;
        defaultModel = hs.defaultModel;
      } catch {}
    }
    fs.writeFileSync(
      path.join(sandboxAgentDir, "settings.json"),
      JSON.stringify({
        ...(defaultProvider ? { defaultProvider } : {}),
        ...(defaultModel ? { defaultModel } : {}),
        defaultThinkingLevel: "low",
        packages: [],
        extensions: [],
      }),
      "utf8"
    );

    const spFile = path.join(home, "system-prompt.txt");
    fs.writeFileSync(spFile, systemPrompt, "utf8");
    const started = Date.now();
    const res = spawnSync(
      "pi",
      ["-p", "--no-session", "-ne", "-ns", "-np", "--no-themes", "-nt", "--append-system-prompt", spFile, ...extraArgs, userInput],
      {
        env: { ...process.env, HOME: home, USERPROFILE: home, PI_CODING_AGENT_DIR: sandboxAgentDir },
        encoding: "utf8",
        shell: true,
        timeout: timeoutMs,
      }
    );
    const ms = Date.now() - started;
    const overBudget = ms > SOFT_BUDGET_MS;
    if (overBudget) {
      console.warn(`\n⚠️  [E2E Latency Warning] Call "${label}" took ${ms}ms (exceeded soft budget of ${SOFT_BUDGET_MS}ms)`);
    }

    const result: RunModelResult = {
      out: (res.stdout || "").trim(),
      err: (res.stderr || "").trim(),
      status: res.status,
      ms,
      overBudget,
    };
    latencyRecords.push({ label, ms, overBudget, status: res.status });
    return result;
  });
}
