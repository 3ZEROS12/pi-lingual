import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultSlots,
  createCustomSlot,
  addSlotToList,
  removeSlotFromList,
  toggleSlotInList,
  resolveSlotsForPreset,
  LANGUAGE_PRESETS,
} from "../src/presets.js";
import { renderCardLayout } from "../src/layout.js";
import { buildSystemPrompt } from "../src/core/prompts.js";
import type { LingualResult } from "../src/types.js";

test("slots: getDefaultSlots returns clean defaults with source, spoken, written, vocab", () => {
  const slots = getDefaultSlots("zh");
  assert.equal(slots.length, 4);
  assert.equal(slots[0].id, "source");
  assert.equal(slots[0].role, "source");
  assert.equal(slots[0].label, "原文");

  assert.equal(slots[1].id, "spoken");
  assert.equal(slots[1].role, "translation");

  assert.equal(slots[2].id, "written");
  assert.equal(slots[2].role, "translation");

  assert.equal(slots[3].id, "vocab");
  assert.equal(slots[3].role, "vocab");
});

test("slots: dynamic slot manipulation functions (add, remove, toggle)", () => {
  let slots = getDefaultSlots("zh");

  // 1. Add custom slot
  const tweetSlot = createCustomSlot({
    id: "twitter",
    label: "推文",
    instruction: "Punchy developer tweet under 280 chars",
  });
  slots = addSlotToList(slots, tweetSlot);
  assert.equal(slots.length, 5);
  assert.equal(slots[4].id, "twitter");
  assert.equal(slots[4].label, "推文");
  assert.equal(slots[4].role, "translation");

  // 2. Remove written slot
  slots = removeSlotFromList(slots, "written");
  assert.equal(slots.length, 4);
  assert.ok(!slots.some((s) => s.id === "written"));

  // 3. Toggle slot
  slots = toggleSlotInList(slots, "twitter");
  assert.equal(slots.find((s) => s.id === "twitter")?.enabled, false);
  slots = toggleSlotInList(slots, "twitter");
  assert.equal(slots.find((s) => s.id === "twitter")?.enabled, true);
});

test("slots: removing source slot completely eliminates original text row from card layout", () => {
  const card: LingualResult = {
    sourceText: "用户不想在屏幕上看到这段原文",
    spoken: "Users don't want to see this original text on screen.",
    written: "The user prefers to suppress source text rendering.",
    annotated: "",
  };

  const labels = LANGUAGE_PRESETS.zh;
  // Start with defaults and remove "source"
  let slots = getDefaultSlots("zh");
  slots = removeSlotFromList(slots, "source");

  assert.equal(slots.some((s) => s.role === "source"), false);

  const lines = renderCardLayout(card, labels, {
    slots,
    maxCols: 80,
  });

  const fullText = lines.join("\n");
  // MUST NOT contain "[原文]" or the source text itself on a dedicated row
  assert.ok(!fullText.includes("[原文]"));
  assert.ok(!fullText.includes("用户不想在屏幕上看到这段原文"));

  // The first branch must start cleanly with ┌ [口语] and terminate with └ [写作]
  assert.ok(fullText.includes("┌ [口语]"));
  assert.ok(fullText.includes("└ [写作]"));
});

test("slots: single translation slot with source removed renders cleanly with └", () => {
  const card: LingualResult = {
    sourceText: "纯净单槽位",
    spoken: "Clean single-slot output.",
    annotated: "",
  };

  const labels = LANGUAGE_PRESETS.zh;
  // Only 1 slot: spoken translation only (no source, no written)
  const singleSlot = [
    { id: "spoken", label: "译文", role: "translation" as const, enabled: true },
  ];

  const lines = renderCardLayout(card, labels, {
    slots: singleSlot,
    maxCols: 80,
  });

  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes("[原文]"));
  assert.ok(lines[0].includes("└ [译文] Clean single-slot output."));
});

test("slots: arbitrary custom slots (twitter, grammar) render dynamically from slotOutputs", () => {
  const card: LingualResult = {
    sourceText: "今天发布了新版本",
    spoken: "Released the new version today.",
    annotated: "",
    slotOutputs: {
      twitter: {
        content: "Just shipped v0.3.5! Zero-friction translation for agents.",
        meaning: "刚刚发布了v0.3.5",
      },
      grammar: {
        content: "Present perfect aspect 'just shipped' emphasizes recent completion.",
      },
    },
  };

  const labels = LANGUAGE_PRESETS.zh;
  const customSlots = [
    { id: "source", label: "原文", role: "source" as const, enabled: true },
    { id: "twitter", label: "推文", role: "translation" as const, enabled: true, showMeaning: true },
    { id: "grammar", label: "语法", role: "custom" as const, enabled: true },
  ];

  const lines = renderCardLayout(card, labels, {
    slots: customSlots,
    maxCols: 80,
  });

  const fullText = lines.join("\n");
  assert.ok(fullText.includes("[原文] 今天发布了新版本"));
  assert.ok(fullText.includes("┌ [推文] Just shipped v0.3.5!"));
  assert.ok(fullText.includes("↳ (刚刚发布了v0.3.5)"));
  assert.ok(fullText.includes("└ [语法] Present perfect aspect"));
});

test("slots: dynamic buildSystemPrompt constructs custom schema matching active slots", () => {
  const customSlots = [
    { id: "source", label: "原文", role: "source" as const, enabled: true },
    { id: "email", label: "邮件", role: "translation" as const, instruction: "Formal client email", showMeaning: true, enabled: true },
    { id: "slack", label: "Slack", role: "translation" as const, instruction: "Casual team ping", showMeaning: false, enabled: true },
  ];

  const prompt = buildSystemPrompt("zh", "en", false, undefined, "general", customSlots);

  // Must instruct the LLM for email and slack, NOT default spoken/written
  assert.ok(prompt.includes('"email" (邮件): Formal client email'));
  assert.ok(prompt.includes('"email_meaning"'));
  assert.ok(prompt.includes('"slack" (Slack): Casual team ping'));
  // slack has showMeaning: false, so slack_meaning should not be requested
  assert.ok(!prompt.includes('"slack_meaning"'));
  // JSON format must declare "email" and "slack"
  assert.ok(prompt.includes('"email": "..."'));
  assert.ok(prompt.includes('"slack": "..."'));
});

test("qa: buildSystemPrompt supports Korean (ko) and Russian (ru) native specs and arbitrary target languages", () => {
  const koPrompt = buildSystemPrompt("ko", "ja", false);
  assert.ok(koPrompt.includes("in native Korean"), "ko source must request meanings in native Korean");
  assert.ok(koPrompt.includes("Japanese"), "ja target must specify Japanese");

  const ruPrompt = buildSystemPrompt("ru", "de", false);
  assert.ok(ruPrompt.includes("in native Russian"), "ru source must request meanings in native Russian");
  assert.ok(ruPrompt.includes("German"), "de target must specify German");
});

test("qa: compact capsule mode balances multiple slots and strictly respects maxCols including pageTag", () => {
  const card: LingualResult = {
    sourceText: "测试窄屏胶囊截断平衡",
    spoken: "We should refactor this module before the release.",
    written: "This module requires refactoring prior to deployment.",
    annotated: "",
  };
  const labels = LANGUAGE_PRESETS.zh;
  const lines = renderCardLayout(card, labels, {
    maxCols: 56,
    isCompact: true,
    pageTag: " [1/2 ⌥.]",
  });
  assert.equal(lines.length, 1);
  // Both slot 1 and slot 2 prefixes must appear in balanced compact line
  assert.ok(lines[0].includes("口语:"));
  assert.ok(lines[0].includes("写作:"));
});

test("slots: 7-row polyglot showcase renders all 7 distinct language rows within 9-line budget without dropping any slot", () => {
  const polyglotSlots = [
    { id: "source", label: "原文", role: "source" as const, enabled: true },
    { id: "en", label: "EN", role: "translation" as const, instruction: "English", showMeaning: false, enabled: true },
    { id: "ja", label: "JA", role: "translation" as const, instruction: "Japanese", showMeaning: false, enabled: true },
    { id: "ko", label: "KO", role: "translation" as const, instruction: "Korean", showMeaning: false, enabled: true },
    { id: "fr", label: "FR", role: "translation" as const, instruction: "French", showMeaning: false, enabled: true },
    { id: "de", label: "DE", role: "translation" as const, instruction: "German", showMeaning: false, enabled: true },
    { id: "es", label: "ES", role: "translation" as const, instruction: "Spanish", showMeaning: false, enabled: true },
    { id: "ru", label: "RU", role: "translation" as const, instruction: "Russian", showMeaning: false, enabled: true },
  ];

  const card: LingualResult = {
    sourceText: "保持最小工作改动面，先定位根因再修改",
    spoken: "Keep the smallest working diff and trace the root cause first.",
    annotated: "",
    slotOutputs: {
      en: { content: "Keep the smallest working diff and trace the root cause first." },
      ja: { content: "最小限の変更差分を保ち、まず根本原因を特定してください。" },
      ko: { content: "최소 변경 범위를 유지하고 먼저 근본 원인을 파악하세요." },
      fr: { content: "Gardez un diff minimal et identifiez d'abord la cause racine." },
      de: { content: "Halten Sie den Diff minimal und finden Sie zuerst die Ursache." },
      es: { content: "Mantén un diff mínimo e identifica primero la causa raíz." },
      ru: { content: "Сохраняйте минимальный diff и сначала найдите первопричину." },
    },
  };

  const lines = renderCardLayout(card, LANGUAGE_PRESETS.zh, {
    slots: polyglotSlots,
    maxCols: 80,
    maxLines: 9,
  });

  // 1 source line + 7 language lines = 8 lines total (<= 9 lines hard budget)
  assert.ok(lines.length <= 9, `Expected <= 9 lines, got ${lines.length}`);
  const full = lines.join("\n");
  for (const tag of ["[EN]", "[JA]", "[KO]", "[FR]", "[DE]", "[ES]", "[RU]"]) {
    assert.ok(full.includes(tag), `7-row polyglot card must retain ${tag} without truncation dropout`);
  }
});


