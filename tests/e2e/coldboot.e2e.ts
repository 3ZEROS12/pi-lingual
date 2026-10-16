import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { e2eEnabled, withSandbox } from "./lib/driver.mjs";
import { getDefaultFactoryModes, SUPPORTED_LANG_CODES } from "../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CHILD = path.join(ROOT, "tests", "fixtures", "sandbox_boot.mjs");

const LOCALES: Record<string, string> = {
  zh: "zh_CN.UTF-8",
  tw: "zh_TW.UTF-8",
  ja: "ja_JP.UTF-8",
  ko: "ko_KR.UTF-8",
  es: "es_ES.UTF-8",
  fr: "fr_FR.UTF-8",
  de: "de_DE.UTF-8",
  ru: "ru_RU.UTF-8",
  en: "en_US.UTF-8",
};

test("L7: Zero-config cold boot & sandbox hygiene across 9 languages", async (t) => {
  if (!e2eEnabled) {
    t.skip("PI_LINGUAL_E2E !== '1' (skipped cold boot real lane)");
    return;
  }

  for (const lang of SUPPORTED_LANG_CODES) {
    withSandbox((home) => {
      const env: Record<string, string | undefined> = {
        ...process.env,
        SANDBOX_HOME: home,
        HOME: home,
        USERPROFILE: home,
        LC_ALL: LOCALES[lang],
        LANG: LOCALES[lang],
      };
      delete env.NODE_TEST_CONTEXT;
      delete env.npm_lifecycle_event;

      const res = spawnSync(
        process.execPath,
        [CHILD, `--lang=${lang}`, `--variant=fresh`, `--cols=80`, `--root=${ROOT}`],
        { env, encoding: "utf8", timeout: 30000 }
      );

      const payload = (res.stdout || "").split("\n").filter((l) => l.startsWith("{")).pop();
      assert.ok(payload, `[${lang}] sandbox boot must produce JSON (exit ${res.status}): ${(res.stderr || "").slice(-400)}`);
      const out = JSON.parse(payload);

      assert.equal(out.inputPrompted, false, `[${lang}] cold boot must never prompt`);
      assert.deepEqual(out.errors, [], `[${lang}] cold boot must not encounter errors`);
      assert.equal(out.bannerLines.length, 8, `[${lang}] banner must have 8 lines`);
      for (const line of out.bannerLines) {
        assert.ok(!line.endsWith("..."), `[${lang}] banner line clipped with ellipsis: ${line}`);
      }

      const seed = getDefaultFactoryModes(lang, lang);
      assert.ok(
        out.effectiveStatus?.includes(seed[0].name),
        `[${lang}] status badge must embed native mode name "${seed[0].name}": ${out.effectiveStatus}`
      );

      const persistedKeys = Object.keys(out.configAfter || {});
      assert.deepEqual(
        persistedKeys,
        ["lastSeenVersion"],
        `[${lang}] cold boot must only persist lastSeenVersion, got: ${persistedKeys.join(",")}`
      );
    });
  }
});

test("L8: Persistent config adherence & banner suppression on second boot", async (t) => {
  if (!e2eEnabled) {
    t.skip("PI_LINGUAL_E2E !== '1' (skipped banner suppression real lane)");
    return;
  }

  withSandbox((home) => {
    const agentDir = path.join(home, ".pi", "agent");
    fs.mkdirSync(agentDir, { recursive: true });
    const cfgFile = path.join(agentDir, "lingual.json");

    fs.writeFileSync(
      cfgFile,
      JSON.stringify(
        {
          sourceLang: "ja",
          targetLang: "en",
          mode: "direct",
          activeModeId: "direct",
          lastSeenVersion: "0.6.0",
        },
        null,
        2
      ),
      "utf8"
    );

    const env: Record<string, string | undefined> = {
      ...process.env,
      SANDBOX_HOME: home,
      HOME: home,
      USERPROFILE: home,
      LC_ALL: "ja_JP.UTF-8",
      LANG: "ja_JP.UTF-8",
    };
    delete env.NODE_TEST_CONTEXT;
    delete env.npm_lifecycle_event;

    const res = spawnSync(
      process.execPath,
      [CHILD, `--lang=ja`, `--variant=configured`, `--cols=80`, `--root=${ROOT}`],
      { env, encoding: "utf8", timeout: 30000 }
    );

    const payload = (res.stdout || "").split("\n").filter((l) => l.startsWith("{")).pop();
    assert.ok(payload, `configured boot must produce JSON (exit ${res.status})`);
    const out = JSON.parse(payload);

    assert.equal(out.bannerLines.length, 0, "Banner must not be rendered when lastSeenVersion matches");
    assert.ok(
      out.effectiveStatus?.includes("ja ⇄ en"),
      `Status badge must preserve ja ⇄ en: ${out.effectiveStatus}`
    );
  });
});
