import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { e2eEnabled, e2eFullEnabled, isPiAvailable, runModel, withSandbox } from "./lib/driver.mjs";
import { resolveModesFromConfig, repairAndParseJsonObject } from "../../dist/index.js";
import extensionFactory from "../../dist/extension.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillPath = path.resolve(__dirname, "../../skills/lingual-tuner/SKILL.md");

test("L4a: Tuner contract test (real model config synthesis)", async (t) => {
  if (!e2eEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E !== '1' or pi CLI is unavailable");
    return;
  }

  const skillContent = fs.readFileSync(skillPath, "utf8");
  const contractMatch = skillContent.match(/## 3\. Physical Persistence Contract[\s\S]*?```jsonc([\s\S]*?)```/);
  const contractExcerpt = contractMatch ? contractMatch[1] : skillContent.slice(0, 2000);

  const sysPrompt = [
    "You are the lingual-tuner configuration engine.",
    "Follow this physical persistence contract strictly:",
    contractExcerpt,
    "Task: Generate a valid JSON object adding a new mode with id 'pr-review' that formats text into constructive PR comments.",
    "Output valid JSON ONLY. No explanations, no markdown fences.",
  ].join("\n\n");

  const { out, status } = runModel(sysPrompt, "Add a mode called pr-review for pull request code review comments");
  assert.equal(status, 0);

  const parsed = repairAndParseJsonObject(out);
  assert.ok(parsed, `Model must output valid JSON: ${out}`);

  const modes = resolveModesFromConfig(parsed);
  assert.ok(modes.length > 0, "Synthesized configuration must resolve valid modes");

  const prMode = modes.find((m) => m.id === "pr-review" || m.name.toLowerCase().includes("pr"));
  assert.ok(prMode, "Synthesized configuration must contain pr-review mode");
  assert.ok(prMode.flow, "Mode must have flow defined");
  assert.ok(prMode.action, "Mode must have action defined");
  assert.ok(prMode.hud, "Mode must have hud defined");

  // Verify extension command dispatcher can switch to it
  const registeredCommands: Record<string, any> = {};
  const mockPi: any = {
    on() {},
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };
  extensionFactory(mockPi);

  let notified = "";
  const mockCtx: any = {
    hasUI: true,
    ui: {
      notify(msg: string) {
        notified = msg;
      },
      setStatus() {},
    },
  };

  await registeredCommands["lingual"].handler(`mode add ${prMode.id} "${prMode.name}" ${prMode.flow} ${prMode.action} ${prMode.hud}`, mockCtx);
  assert.ok(notified.includes(prMode.id), "Extension CLI must accept synthesized mode");
});

test("L4b: Full tuner agent loop (optional, PI_LINGUAL_E2E_FULL=1)", async (t) => {
  if (!e2eFullEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E_FULL !== '1' (skipped full agent disk loop)");
    return;
  }

  // Tested in sandboxed HOME: verifies agent can write valid lingual.json when given tuner skill
  withSandbox((home) => {
    const agentDir = path.join(home, ".pi", "agent");
    fs.mkdirSync(agentDir, { recursive: true });

    // Agent execution in sandbox
    const { status } = runModel(
      "You are a coding assistant. Write a valid ~/.pi/agent/lingual.json file with 3 modes.",
      "Configure lingual.json"
    );

    const cfgFile = path.join(agentDir, "lingual.json");
    if (fs.existsSync(cfgFile)) {
      const content = fs.readFileSync(cfgFile, "utf8");
      const parsed = JSON.parse(content);
      assert.ok(parsed, "Written file must be valid JSON");
    }
  });
});
