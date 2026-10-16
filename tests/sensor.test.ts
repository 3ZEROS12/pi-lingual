import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasSourceScript,
  isTargetLanguageOnly,
  isImperativeEngineeringPrompt,
  detectScriptLanguage,
} from "../src/shield.js";
import extensionFactory from "../dist/extension.js";

test("smart language sensor - hasSourceScript correctly identifies language script boundaries", () => {
  // Chinese
  assert.equal(hasSourceScript("优化这个组件", "zh"), true);
  assert.equal(hasSourceScript("優化這個組件", "tw"), true);
  assert.equal(hasSourceScript("Optimize this component", "zh"), false);

  // Japanese
  assert.equal(hasSourceScript("クリーンアップ処理を追加", "ja"), true);
  assert.equal(hasSourceScript("Add cleanup logic", "ja"), false);

  // Korean
  assert.equal(hasSourceScript("메모리 누수 방지", "ko"), true);
  assert.equal(hasSourceScript("Prevent memory leak", "ko"), false);

  // Russian
  assert.equal(hasSourceScript("Исправить утечку памяти", "ru"), true);
  assert.equal(hasSourceScript("Fix memory leak", "ru"), false);
});

test("smart language sensor - isTargetLanguageOnly identifies when user writes in target language", () => {
  // Target: en, Source: zh
  assert.equal(
    isTargetLanguageOnly("Fix race condition in worker loop and add unit tests", "zh", "en"),
    true,
    "Pure English input in zh ➔ en must be recognized as target language only"
  );
  assert.equal(
    isTargetLanguageOnly("帮我重构一下这个 helper 函数", "zh", "en"),
    false,
    "Mixed Chinese/English input must NOT bypass"
  );
  assert.equal(
    isTargetLanguageOnly("这个方案过度设计了", "zh", "en"),
    false,
    "Pure Chinese input must NOT bypass"
  );

  // Target: en, Source: ja
  assert.equal(
    isTargetLanguageOnly("Refactor database connection pool", "ja", "en"),
    true
  );
  assert.equal(
    isTargetLanguageOnly("メモリリークの可能性があるので修正してください", "ja", "en"),
    false
  );
});

test("smart language sensor - isImperativeEngineeringPrompt identifies actionable specs", () => {
  // Actionable engineering specs
  assert.equal(isImperativeEngineeringPrompt("Fix memory leak in worker thread"), true);
  assert.equal(isImperativeEngineeringPrompt("Add comprehensive unit tests"), true);
  assert.equal(isImperativeEngineeringPrompt("Refactor auth module into microservice"), true);
  assert.equal(isImperativeEngineeringPrompt("Update dependencies to latest LTS"), true);
  assert.equal(isImperativeEngineeringPrompt("Implement retry policy with exponential backoff"), true);
  assert.equal(isImperativeEngineeringPrompt("Clean up orphaned temporary files"), true);

  // Conversational requests (non-imperative prompts that benefit from prompt optimization)
  assert.equal(isImperativeEngineeringPrompt("can you please help me fix this flaky test"), false);
  assert.equal(isImperativeEngineeringPrompt("i think we should optimize the cache"), false);
  assert.equal(isImperativeEngineeringPrompt("how do i configure redis sentinel"), false);
  assert.equal(isImperativeEngineeringPrompt("please look at this error log"), false);
});

test("smart language sensor - detectScriptLanguage accurately detects CJK and Cyrillic scripts", () => {
  assert.equal(detectScriptLanguage("这个方案有点过度设计了"), "zh");
  assert.equal(detectScriptLanguage("メモリリークの可能性があるのでクリーンアップ処理を追加"), "ja");
  assert.equal(detectScriptLanguage("이 컴포넌트를 리팩토링해주세요"), "ko");
  assert.equal(detectScriptLanguage("Исправить ошибку компиляции"), "ru");
  assert.equal(detectScriptLanguage("Fix compilation error in worker loop"), null);
});

test("smart language sensor - target language auto-bypass in extension input flow", async () => {
  let inputHandler: any = null;
  const registeredCommands: Record<string, any> = {};

  const mockPi: any = {
    on(event: string, handler: any) {
      if (event === "input") inputHandler = handler;
    },
    registerCommand(name: string, def: any) {
      registeredCommands[name] = def;
    },
    registerShortcut() {},
  };

  extensionFactory(mockPi);
  assert.ok(inputHandler, "Input handler must be registered");

  let statusBadge: any = null;
  const mockCtx: any = {
    hasUI: true,
    ui: {
      notify() {},
      setStatus(_k: string, v: any) {
        statusBadge = v;
      },
      setWidget() {},
      theme: { fg: (_c: string, t: string) => t },
    },
  };

  // Set language pair to zh ➔ en (where target language is English)
  await registeredCommands["lingual"].handler("lang zh en", mockCtx);

  // 1. Companion mode: user inputs pure English directly
  // In companion mode, user typing target language passes through at 0ms immediately
  const res1 = await inputHandler(
    { text: "Fix race condition in worker loop and add unit tests", source: "user" },
    mockCtx
  );
  assert.equal(res1.action, "continue", "Must return 0ms continue without sending to model");
  assert.ok(
    String(statusBadge).includes("direct send") || String(statusBadge).includes("en"),
    "Status badge must indicate direct send"
  );

  // 2. Direct spec mode: user inputs pure English imperative spec
  await registeredCommands["lingual"].handler("2", mockCtx);
  const res2 = await inputHandler(
    { text: "Add error boundary for async components", source: "user" },
    mockCtx
  );
  assert.equal(res2.action, "continue", "Imperative English in direct mode must 0ms pass-through");
  assert.ok(
    String(statusBadge).includes("spec ok") || String(statusBadge).includes("en"),
    "Status badge must indicate spec ok"
  );
});
