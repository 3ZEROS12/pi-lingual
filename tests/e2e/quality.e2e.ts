import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { e2eEnabled, isPiAvailable, runModel } from "./lib/driver.mjs";
import {
  assertNoKillListWords,
  assertStartsImperative,
  assertNoChineseResidue,
  assertProfanityPreserved,
  calculateJaccardSimilarity,
} from "./lib/asserts.mjs";
import {
  compileModeSystemPrompt,
  getDefaultFactoryModes,
  repairAndParseJsonObject,
} from "../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "prompts.json"), "utf8")
);

test("L1: Logical Spec quality (real model execution)", async (t) => {
  if (!e2eEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E !== '1' or pi CLI is unavailable");
    return;
  }

  const modes = getDefaultFactoryModes("zh", "zh");
  const directMode = modes.find((m) => m.id === "direct");
  assert.ok(directMode);

  const sysPrompt = compileModeSystemPrompt(directMode, {
    sourceLang: "zh",
    targetLang: "en",
    explainLang: "zh",
  });

  const input = promptsData.logical_spec_zh[0];
  const { out, status, ms } = runModel(sysPrompt, input);

  assert.equal(status, 0, `pi execution failed: ${out}`);
  assert.ok(out.length > 0 && out.length <= 1200, "Length budget check");

  const parsed = repairAndParseJsonObject(out) || { direct_spec: out };
  const specText = parsed.direct_spec || parsed.prompt || out;

  assertStartsImperative(specText);
  assertNoKillListWords(specText);
  assertNoChineseResidue(specText);
});

test("L2: Live Flow quality (real model execution)", async (t) => {
  if (!e2eEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E !== '1' or pi CLI is unavailable");
    return;
  }

  const modes = getDefaultFactoryModes("zh", "zh");
  const liveMode = modes.find((m) => m.id === "live-flow");
  assert.ok(liveMode);

  const sysPrompt = compileModeSystemPrompt(liveMode, {
    sourceLang: "zh",
    targetLang: "en",
    explainLang: "zh",
  });

  const input = promptsData.live_flow_en[0];
  const { out, status } = runModel(sysPrompt, input);

  assert.equal(status, 0);
  const parsed = repairAndParseJsonObject(out) || {};
  const fixed = parsed.fixed || out;

  assertProfanityPreserved(input, fixed);
  assert.ok(!fixed.includes("want that you can"), "Surgically fixes syntactic errors");
  if (parsed.fixes) {
    assert.ok(parsed.fixes.includes("➔"), "Must contain takeaway diff delimiter ➔");
  }
});

test("L3: Companion card duality quality (real model execution)", async (t) => {
  if (!e2eEnabled || !isPiAvailable()) {
    t.skip("PI_LINGUAL_E2E !== '1' or pi CLI is unavailable");
    return;
  }

  const modes = getDefaultFactoryModes("zh", "zh");
  const companionMode = modes.find((m) => m.id === "companion");
  assert.ok(companionMode);

  const sysPrompt = compileModeSystemPrompt(companionMode, {
    sourceLang: "zh",
    targetLang: "en",
    explainLang: "zh",
  });

  const input = promptsData.companion_zh[0];
  const { out, status } = runModel(sysPrompt, input);

  assert.equal(status, 0);
  const parsed = repairAndParseJsonObject(out) || {};

  if (parsed.spoken && parsed.written) {
    const similarity = calculateJaccardSimilarity(parsed.spoken, parsed.written);
    assert.ok(
      similarity <= 0.7,
      `Spoken and written registers must be differentiated (similarity: ${similarity})`
    );
  }
});
