import test from "node:test";
import assert from "node:assert/strict";
import {
  getEffectiveMaxCols,
  getBannerMaxCols,
  getVisualWidth,
  wrapVisualText,
  formatCapsuleLine,
  renderCardLayout,
  truncateVisual,
} from "../src/layout.js";
import {
  repairAndParseJsonObject,
  parseLlmResponse,
  shouldTriggerTranslation,
  compileModeSystemPrompt,
} from "../src/engine.js";
import { LingualSessionController } from "../src/fsm.js";
import {
  shouldShieldBypass,
  isTargetLanguageOnly,
  isNonEnglish,
} from "../src/shield.js";
import { sanitizePromptForTranslation } from "../src/sanitizer.js";
import { extractRecentContextAnchor } from "../src/extension.js";
import { resolveLabelsForLang } from "../src/presets.js";

test("chaos: extreme terminal columns down to 1 col never crash or return negative", () => {
  const originalCols = process.stdout.columns;
  try {
    for (const cols of [1, 5, 10, 15, 20, 25, 30, 40, 80, 200]) {
      Object.defineProperty(process.stdout, "columns", { value: cols, configurable: true });
      const effective = getEffectiveMaxCols();
      const banner = getBannerMaxCols();
      assert.ok(effective > 0, `getEffectiveMaxCols must be > 0 at cols=${cols} (got ${effective})`);
      assert.ok(banner > 0, `getBannerMaxCols must be > 0 at cols=${cols} (got ${banner})`);
      assert.ok(effective <= Math.max(10, cols), `getEffectiveMaxCols must not exceed cols at cols=${cols}`);
      assert.ok(banner <= cols, `getBannerMaxCols must not exceed cols at cols=${cols}`);
    }
  } finally {
    Object.defineProperty(process.stdout, "columns", { value: originalCols, configurable: true });
  }
});

test("chaos: card layout solver never overflows when terminal is collapsed to 15 columns", () => {
  const dummyCard = {
    sourceText: "这是一个极度漫长且复杂的测试输入用于验证极其极端的分屏终端排版稳定性",
    spoken: "This is a super long and complex test prompt to verify layout stability under extreme splits.",
    spokenMeaning: "验证极端分屏稳定性",
    written: "The implementation verifies layout integrity under severe geometric terminal constraints.",
    writtenMeaning: "验证在极端几何约束下的布局完整性",
    vocab: "layout integrity (布局完整性) · constraints (约束) · severe (严苛的)",
    annotated: "",
  };
  const labels = resolveLabelsForLang("zh");

  for (const cols of [10, 15, 20, 25, 35, 50, 80]) {
    const lines = renderCardLayout(dummyCard, labels, { maxCols: cols, maxLines: 9 });
    assert.ok(Array.isArray(lines), `Lines must be array at cols=${cols}`);
    assert.ok(lines.length <= 9, `Lines count ${lines.length} must be <= 9 at cols=${cols}`);
    for (const line of lines) {
      const visualWidth = getVisualWidth(line);
      assert.ok(
        visualWidth <= cols,
        `Line "${line}" width ${visualWidth} exceeds maxCols ${cols}`
      );
    }
  }
});

test("chaos: complex composite Emojis (skin tones, ZWJ sequences) calculate exact visual cells", () => {
  assert.equal(getVisualWidth("👍"), 2);
  assert.equal(getVisualWidth("👍🏽"), 2);
  assert.equal(getVisualWidth("👋🏿"), 2);
  assert.equal(getVisualWidth("👨‍💻"), 2);
  assert.equal(getVisualWidth("👩‍🔬"), 2);
  assert.equal(getVisualWidth("🏳️‍🌈"), 2);
  assert.equal(getVisualWidth("葛\u{E0100}"), 2);
  assert.equal(getVisualWidth("e\u0301"), 1);
});

test("chaos: unescaped internal quotes and trailing commas in LLM JSON repair seamlessly", () => {
  const malformed = `{"spoken": "She said "look into this" immediately", "written": "He noted "unnecessary complexity" in review", "vocab": "look into (investigate)",}`;
  const parsed = repairAndParseJsonObject(malformed);
  assert.ok(parsed, "Must parse repaired JSON");
  assert.equal(parsed.spoken, 'She said "look into this" immediately');
  assert.equal(parsed.written, 'He noted "unnecessary complexity" in review');
});

test("chaos: prototype pollution attempts (__proto__, constructor) are strictly neutralized", () => {
  const malicious = `{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"admin": true}}, "spoken": "clean", "written": "clean"}`;
  const parsed = repairAndParseJsonObject(malicious);
  assert.ok(parsed);
  assert.equal((Object.prototype as any).polluted, undefined);
  assert.equal((Object.prototype as any).admin, undefined);
});

test("chaos: FSM monotonicity rejects stale generation writes and aborts previous signals", () => {
  const controller = new LingualSessionController();
  const req1 = controller.beginRequest();
  assert.equal(req1.generation, 1);
  assert.equal(controller.isLatest(req1.generation), true);

  const req2 = controller.beginRequest();
  assert.equal(req2.generation, 2);
  assert.equal(req1.signal.aborted, true, "Signal 1 must be aborted when Turn 2 begins");
  assert.equal(req2.signal.aborted, false, "Signal 2 must be active");
  assert.equal(controller.isLatest(req1.generation), false, "Turn 1 must be stale");

  const dummy = { sourceText: "x", spoken: "s", written: "w", vocab: "v", annotated: "" };
  assert.equal(controller.setPageResult(0, dummy, req1.generation), false, "Stale write rejected");
  assert.equal(controller.setPageResult(0, dummy, req2.generation), true, "Latest write accepted");
});

test("chaos: prompt compiler orders context, killList, and rules strictly before JSON terminator", () => {
  const compiled = compileModeSystemPrompt(
    {
      id: "spec",
      name: "Brain-Dump to Spec",
      flow: "translate",
      action: "select",
      hud: "preview",
      target: "agent",
      killList: ["make_it_fast_cliche"],
      systemHint: "Always define explicit negative constraints.",
      slots: [{ id: "slot1", label: "Spec", role: "custom", instruction: "Output spec in ${targetLang}", enabled: true }],
    },
    {
      sourceLang: "zh",
      targetLang: "en",
      explainLang: "zh",
      context: "User mentioned src/auth.ts in previous turn.",
      globalKillList: ["global_banned_word"],
    }
  );

  const jsonTerminator = "Output valid JSON ONLY. Never output markdown code fences or explanations.";
  const termIdx = compiled.indexOf(jsonTerminator);
  assert.ok(termIdx > 0);
  assert.ok(compiled.indexOf("make_it_fast_cliche") < termIdx);
  assert.ok(compiled.indexOf("global_banned_word") < termIdx);
  assert.ok(compiled.indexOf("src/auth.ts") < termIdx);
  assert.ok(compiled.indexOf("Always define explicit negative constraints") < termIdx);
});

test("chaos: stack-based delimiter balancer enforces mathematical LIFO order and ignores in-string brackets", () => {
  // Nested brackets must close in LIFO order (arr[idx] then func()), never [) or (]
  const nested = truncateVisual("func(arr[idx + offset_value", 18);
  assert.ok(
    nested.includes("])..."),
    `Must close nested brackets in LIFO order '])': got "${nested}"`
  );

  // Brackets inside quotes must not cause stray brackets outside quotes
  const inQuotes = truncateVisual('Call func("[") and inspect result', 22);
  assert.ok(
    !inQuotes.includes("]..."),
    `Must not append stray brackets for in-quote delimiters: got "${inQuotes}"`
  );

  // Unclosed quotes must be balanced before ellipsis
  const unclosedQuote = truncateVisual('const message = "hello world from author', 28);
  assert.ok(
    unclosedQuote.includes('"'),
    `Must balance unclosed quote: got "${unclosedQuote}"`
  );
});

