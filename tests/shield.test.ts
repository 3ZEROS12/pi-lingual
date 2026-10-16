import test from "node:test";
import assert from "node:assert/strict";
import { shouldShieldBypass } from "../src/shield.js";

test("shouldShieldBypass - 0ms bypass for pure CLI commands", () => {
  assert.equal(shouldShieldBypass("git status"), true);
  assert.equal(shouldShieldBypass("git diff HEAD~1"), true);
  assert.equal(shouldShieldBypass("npm run build"), true);
  assert.equal(shouldShieldBypass("cargo build --release"), true);
  assert.equal(shouldShieldBypass("docker ps -a"), true);
  assert.equal(shouldShieldBypass("cd ../project"), true);
  assert.equal(shouldShieldBypass("ls -la"), true);
  assert.equal(shouldShieldBypass("python3 main.py"), true);
  assert.equal(shouldShieldBypass("curl -fsSL https://example.com"), true);
  assert.equal(shouldShieldBypass("git commit -m 'feat: add cache'"), true);
});

test("shouldShieldBypass - 0ms bypass for code blocks and data structures", () => {
  assert.equal(shouldShieldBypass("```typescript\nconst a = 1;\n```"), true);
  assert.equal(shouldShieldBypass("{\n  \"name\": \"pi-lingual\",\n  \"version\": \"0.1.4\"\n}"), true);
  assert.equal(shouldShieldBypass("[1, 2, 3, 4]"), true);
  assert.equal(shouldShieldBypass("SELECT * FROM users WHERE id = 1;"), true);
  assert.equal(shouldShieldBypass("const express = require('express');"), true);
  assert.equal(shouldShieldBypass("function calculateTotal(items) {"), true);
});

test("shouldShieldBypass - does NOT bypass natural language prompts with tech terms", () => {
  assert.equal(shouldShieldBypass("认同，开始吧"), false);
  assert.equal(shouldShieldBypass("这个方案有点过度设计了，不如直接用标准库实现"), false);
  assert.equal(shouldShieldBypass("继续"), false);
  assert.equal(shouldShieldBypass("吃什么？"), false);
  assert.equal(shouldShieldBypass("git status 为什么会报错？"), false);
  assert.equal(shouldShieldBypass("```ts console.log(1)``` 为什么这样写不行？"), false);
  assert.equal(shouldShieldBypass("```bash\ngit commit -m 'fix'\n```\n帮我审查这个提交对不对？"), false);
  assert.equal(shouldShieldBypass("賛成です、進めましょう"), false);
  assert.equal(shouldShieldBypass("De acuerdo, empecemos"), false);
});

test("shouldShieldBypass - 0ms bypass for pure copied file paths, session UUIDs, and log URLs", () => {
  // Pure Windows file path
  assert.equal(
    shouldShieldBypass("C:\\Users\\Jason\\.pi\\agent\\sessions\\2026-10-13_01a1354c-b212-70b2-94f5-1f0f2e4de168.jsonl"),
    true,
    "Pure Windows path must bypass translation 0ms"
  );
  // Pure Unix file path
  assert.equal(
    shouldShieldBypass("/var/log/pi-agent/sessions/session-01a1354c.jsonl"),
    true,
    "Pure Unix path must bypass translation 0ms"
  );
  // Pure UUID / Session ID
  assert.equal(
    shouldShieldBypass("01a1354c-b212-70b2-94f5-1f0f2e4de168"),
    true,
    "Pure UUID must bypass translation 0ms"
  );
  assert.equal(
    shouldShieldBypass("ID: 01a1354c-b212-70b2-94f5-1f0f2e4de168"),
    true,
    "Pure ID: UUID must bypass translation 0ms"
  );
  // Pure URL
  assert.equal(
    shouldShieldBypass("https://github.com/3ZEROS12/pi-lingual/blob/main/src/extension.ts"),
    true,
    "Pure URL must bypass translation 0ms"
  );

  // But path WITH natural language question must NOT be bypassed
  assert.equal(
    shouldShieldBypass("C:\\path\\file.jsonl 帮我看看这个日志反映出什么问题？"),
    false,
    "Path accompanied by natural language question must NOT be bypassed"
  );
});

