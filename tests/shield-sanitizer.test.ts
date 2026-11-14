import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldShieldBypass,
  hasSourceScript,
  isTargetLanguageOnly,
  isImperativeEngineeringPrompt,
  detectScriptLanguage,
} from "../src/shield.js";
import { sanitizePromptForTranslation } from "../src/sanitizer.js";
import { splitSemanticChunks } from "../src/chunker.js";
import extensionFactory from "../dist/extension.js";

test("shield: 0ms bypass for pure CLI commands, code blocks, URLs, JSON, and file paths", () => {
  for (const cli of [
    "git status",
    "git diff HEAD~1",
    "diff -u src/a.ts src/b.ts",
    "npm run build",
    "cargo build --release",
    "docker ps -a",
    "cd ../other && ls -la",
    "python -m pytest tests/",
  ]) {
    assert.equal(shouldShieldBypass(cli), true, `CLI should bypass: ${cli}`);
  }

  for (const code of [
    "const x = 123;",
    "import { foo } from './bar';",
    "function test() { return true; }",
    'const label = "テスト";',
    "```ts\nconsole.log(1);\n```",
    '{"name": "pi-lingual", "version": "0.1.0"}',
    "[1, 2, 3, 4]",
    "https://github.com/3ZEROS12/pi-lingual",
    "/Users/dev/project/src/index.ts",
    "C:\\Users\\Jason\\.pi\\agent\\sessions\\session.jsonl",
    "ID: 01a1354c-b212-70b2-94f5-1f0f2e4de168",
  ]) {
    assert.equal(shouldShieldBypass(code), true, `Code/path should bypass: ${code}`);
  }

  assert.equal(shouldShieldBypass("请帮我看看这个 git status 的输出是什么意思？"), false);
  assert.equal(shouldShieldBypass("C:\\path\\file.jsonl 帮我看看这个日志反映出什么问题？"), false);
});

test("sensor: script boundaries, target-language bypass, imperative detection, and script auto-detection", () => {
  assert.equal(hasSourceScript("优化这个组件", "zh"), true);
  assert.equal(hasSourceScript("優化這個組件", "tw"), true);
  assert.equal(hasSourceScript("Optimize this component", "zh"), false);
  assert.equal(hasSourceScript("Optimize this component", "en"), true);

  assert.equal(isTargetLanguageOnly("Fix the login timeout bug in auth.ts", "zh", "en"), true);
  assert.equal(isTargetLanguageOnly("Fix 这个 auth.ts 的 bug", "zh", "en"), false);
  assert.equal(isTargetLanguageOnly("crea una nueva clase para el usuario", "es", "en"), false);
  assert.equal(isTargetLanguageOnly("erstelle eine neue klasse fuer den benutzer", "de", "en"), false);
  assert.equal(isTargetLanguageOnly("creer une nouvelle classe pour le projet", "fr", "en"), false);

  assert.equal(isTargetLanguageOnly("私は日本語でコードを書きます", "zh", "ja"), true);
  assert.equal(isTargetLanguageOnly("在终端里用这个方案", "zh", "ja"), false);
  assert.equal(isTargetLanguageOnly("在终端里用这个方案", "ja", "zh"), true);
  assert.equal(isTargetLanguageOnly("私は在终端里用这个方案", "ja", "zh"), false);

  assert.equal(isImperativeEngineeringPrompt("Fix memory leak in worker thread"), true);
  assert.equal(isImperativeEngineeringPrompt("Refactor auth module into microservice"), true);
  assert.equal(isImperativeEngineeringPrompt("can you please help me fix this flaky test"), false);
  assert.equal(isImperativeEngineeringPrompt("please look at this error log"), false);

  assert.equal(detectScriptLanguage("这个方案有点过度设计了"), "zh");
  assert.equal(detectScriptLanguage("メモリリークの可能性があるのでクリーンアップ処理を追加"), "ja");
  assert.equal(detectScriptLanguage("이 컴포넌트를 리팩토링해주세요"), "ko");
  assert.equal(detectScriptLanguage("Исправить ошибку компиляции"), "ru");
  assert.equal(detectScriptLanguage("Fix compilation error in worker loop"), null);
});

test("sensor: extension input flow 0ms target-language bypass", async () => {
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

  await registeredCommands["lingual"].handler("lang zh en", mockCtx);
  const res1 = await inputHandler({ text: "Fix race condition in worker loop and add unit tests", source: "user" }, mockCtx);
  assert.equal(res1.action, "continue");
  assert.ok(String(statusBadge).includes("direct") || String(statusBadge).includes("en"));

  await registeredCommands["lingual"].handler("2", mockCtx);
  const res2 = await inputHandler({ text: "Add error boundary for async components", source: "user" }, mockCtx);
  assert.equal(res2.action, "continue");
  assert.ok(String(statusBadge).includes("spec ok") || String(statusBadge).includes("en"));
});

test("sanitizer: collapses stack traces, tracebacks, code fences, bullet lists, and preserves CLI/paths", () => {
  const nodeStack = `运行 npm test 报错了：\nError: Cannot find module '@earendil-works/pi-ai'\n    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1144:15)\n    at Function.Module._load (node:internal/modules/cjs/loader:985:27)\n帮我看看是不是依赖漏装了？`;
  const r1 = sanitizePromptForTranslation(nodeStack);
  assert.equal(r1.hasNaturalLanguage, true);
  assert.equal(r1.hasCollapsedContent, true);
  assert.ok(r1.distilledText.includes("[... stack trace ...]"));
  assert.ok(!r1.distilledText.includes("loader:1144:15"));

  const pyTb = `Traceback (most recent call last):\n  File "train.py", line 42, in <module>\n    loss = model(inputs)\nRuntimeError: CUDA out of memory.\n这个显存爆了要怎么调参数？`;
  const r2 = sanitizePromptForTranslation(pyTb);
  assert.equal(r2.hasNaturalLanguage, true);
  assert.ok(r2.distilledText.includes("RuntimeError: CUDA out of memory."));
  assert.ok(!r2.distilledText.includes("line 42"));

  const pySyntax = `File "app.py", line 42\n    print(1\n          ^\nSyntaxError: '(' was never closed`;
  assert.equal(sanitizePromptForTranslation(pySyntax).hasNaturalLanguage, false);

  const ansiLog = "\x1b[31msrc/app.ts:12:5 - error TS2322: Type 'string' is not assignable\x1b[0m";
  assert.equal(sanitizePromptForTranslation(ansiLog).hasNaturalLanguage, false);

  const fence = `看下这段代码报错了：\n\`\`\`typescript\ninterface User {\n  id: string;\n  name: string;\n  age: number;\n}\nfunction validate(u: User) {\n  return u.age > 18;\n}\n\`\`\`\n帮我修复一下`;
  const r3 = sanitizePromptForTranslation(fence);
  assert.equal(r3.hasCollapsedContent, true);
  assert.ok(r3.distilledText.includes("[code ...]"));
  assert.ok(r3.rawPayload?.includes("interface User"));

  const clip1 = "C:\\Users\\Jason\\AppData\\Local\\Temp\\pi-clipboard-2ad05868.png 还有，这次运行怎么这么慢？";
  const r4 = sanitizePromptForTranslation(clip1);
  assert.ok(!r4.distilledText.includes("pi-clipboard"));
  assert.ok(r4.distilledText.startsWith("还有，这次运行怎么这么慢？"));

  const clip2 = "C:/Users/Jason Miller/AppData/Local/Temp/pi-clipboard-123.png 帮我看看报错";
  const r5 = sanitizePromptForTranslation(clip2);
  assert.ok(!r5.distilledText.startsWith("C:"));
  assert.ok(r5.distilledText.startsWith("帮我看看报错"));

  const pathsPreserved = sanitizePromptForTranslation("请修改 docs/README.md 里面的说明，顺便看看 src/index.ts");
  assert.ok(pathsPreserved.distilledText.includes("docs/README.md"));
  assert.ok(pathsPreserved.distilledText.includes("src/index.ts"));

  const pureStack = `Error: ENOENT\n    at Object.openSync (node:fs:596:3)\n    at parseConfig (/app/dist/index.js:42:10)`;
  assert.equal(sanitizePromptForTranslation(pureStack).hasNaturalLanguage, false);

  const uuidSession = "C:\\Users\\Jason\\.pi\\agent\\sessions\\2026-10-13_01a1354c-b212-70b2-94f5-1f0f2e4de168.jsonl ID: 01a1354c-b212-70b2-94f5-1f0f2e4de168 看这个对话问题";
  const r6 = sanitizePromptForTranslation(uuidSession);
  assert.ok(!r6.distilledText.includes("01a1354c-b212-70b2"));
  assert.ok(r6.distilledText.includes("(...)"));
  assert.ok(r6.rawPayload?.includes("01a1354c-b212-70b2"));

  const longBullets = `背景：\n- 第一点很长很长的内容用来测试折叠逻辑是否正常触发\n- 第二点继续追加超过一百二十个字符的列表描述信息\n- 第三点同样需要保留在原始负载中\n- 第四点补充细节\n- 第五点总结\n应该怎么选？`;
  const r7 = sanitizePromptForTranslation(longBullets);
  assert.equal(r7.hasCollapsedContent, true);
  assert.ok(r7.distilledText.includes("[5 items ...]"));

  const shortList = `比较一下：\n- 方案A：单文件\n- 方案B：微内核\n选哪个？`;
  const r8 = sanitizePromptForTranslation(shortList);
  assert.equal(r8.hasCollapsedContent, false);
});

test("chunker: splits long text cleanly without orphaned 1-char comma chunks", () => {
  const shortText = "这个方案有点过度设计了，不如直接用标准库实现";
  assert.deepEqual(splitSemanticChunks(shortText), [shortText]);

  const commaText = "We fixed the cache issue, and refactored the auth layer, and updated the docs, so everything works great. Let's deploy now.";
  const chunks = splitSemanticChunks(commaText, 40);
  assert.ok(chunks.length >= 2);
  for (const c of chunks) {
    assert.notEqual(c.trim(), ",");
  }
});
