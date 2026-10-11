---
name: lingual-tuner
description: Zero-friction companion slot tuner and prompt refiner architect for pi-lingual. Triggers on '定制伴学', '配置伴学', '定制槽位', '修改槽位', '不要原文', '规范提示词', '提炼提示词', 'customize lingual slots', 'hide original text', 'prompt refiner', or '/lingual-agent'.
---

# LINGUAL COMPANION TUNER

Zero-friction dynamic slot customizer and configuration architect for `pi-lingual`.
Allows AI coding agents to configure companion layout, tone, and registers on behalf of the user without requiring manual CLI command authoring.

---

## 1. Golden Rules (RFC 2119)

1. **Zero-User-Friction**:
   - The user SHOULD NOT be asked to type complex CLI commands like `/slots add ...` or manually edit JSON files.
   - The Agent MUST directly apply the configuration by writing to `~/.pi/agent/lingual.json` in a single tool call (`write` or `edit`).
2. **Language Mirroring**:
   - The Agent MUST mirror the user's active prompt language:
     - If the user communicates in Chinese, ask questions and generate labels in Chinese;
     - If the user communicates in English, ask questions and generate labels in English;
     - If the user communicates in Japanese, mirror in Japanese.
3. **Movable Source Slot (Hide Original Text)**:
   - The `source` (original text) row is a dynamic slot.
   - If the user specifies they do not want to see the original text, simply **omit the slot with `role: "source"`** from the `slots` array. The layout engine will render translation branches without any orphan source line.

---

## 2. Clarification Protocol (If Requirements Are Ambiguous)

If the user's request does not specify slot count or styles, proactively query and confirm:
1. **Desired Slot Count**: How many output slots or lines do you prefer? (e.g. 1-slot minimal translation, 2-slot dual register, 3-slot with twitter/deep);
2. **Desired Tone per Slot**: What specific style or role is needed for each slot? (e.g. casual conversational, formal technical RFC, viral tweet, technical insight, vocab);
3. **Source Text Retention**: Crucially ask: **"Do you want to keep the original source text row, or remove it entirely to save terminal vertical space?"**

---

## 3. Configuration Target & Schema

The Single Source of Truth is `~/.pi/agent/lingual.json`.

### SlotConfig Interface
```typescript
interface SlotConfig {
  id: string;            // Unique identifier, e.g. "source", "spoken", "written", "twitter", "deep"
  label: string;         // Card display label, e.g. "Source", "Spoken", "Written", "Tweet", "Deep"
  role: "source" | "translation" | "vocab" | "custom";
  instruction?: string;  // Explicit LLM translation/style prompt for this slot
  showMeaning?: boolean; // Whether to generate nuance back-translation in user's native language
  enabled: boolean;
}
```

---

## 4. Execution Patterns (Direct File Modification)

### Pattern A: Clean 2-Slot Social / Twitter (No Source Text)
*User intent: "帮我把伴学改成推特和深度分析两个槽位，不要显示原文"*
Write to `~/.pi/agent/lingual.json`:
```json
{
  "slots": [
    {
      "id": "twitter",
      "label": "推文",
      "role": "translation",
      "instruction": "Punchy opening hook and viral developer tweet under 280 chars with authentic Silicon Valley dev slang.",
      "showMeaning": true,
      "enabled": true
    },
    {
      "id": "deep",
      "label": "深度",
      "role": "translation",
      "instruction": "High-signal architecture reasoning and nuanced technical value.",
      "showMeaning": true,
      "enabled": true
    }
  ]
}
```

### Pattern B: Minimalist 1-Slot Translation Only (No Source Text)
*User intent: "只保留一行纯译文，不要原文"*
Write to `~/.pi/agent/lingual.json`:
```json
{
  "slots": [
    {
      "id": "spoken",
      "label": "译文",
      "role": "translation",
      "instruction": "Natural, authentic target language translation.",
      "showMeaning": true,
      "enabled": true
    }
  ]
}
```

### Pattern C: Restore Default Companion (Source + Spoken + Written + Vocab)
*User intent: "恢复默认伴学槽位"*
Delete the `"slots"` key or write clean defaults to `~/.pi/agent/lingual.json`:
```json
{
  "slots": [
    {
      "id": "source",
      "label": "原文",
      "role": "source",
      "enabled": true
    },
    {
      "id": "spoken",
      "label": "口语",
      "role": "translation",
      "instruction": "Natural, fluent spoken flow (daily standup, Slack, agile collaboration). Authentic Silicon Valley flow, natural contractions, idioms.",
      "showMeaning": true,
      "enabled": true
    },
    {
      "id": "written",
      "label": "写作",
      "role": "translation",
      "instruction": "Clear, precise, modern technical written prose (PR descriptions, RFCs, documentation). Plain, active, professional.",
      "showMeaning": true,
      "enabled": true
    },
    {
      "id": "vocab",
      "label": "重点",
      "role": "vocab",
      "instruction": "Adaptively extract key idiomatic collocations, phrasal verbs, technical idioms, or advanced expressions.",
      "enabled": true
    }
  ]
}
```

### Pattern D: Prompt Refiner & Structurer (`refinePreset`, `refineLang`, `refineRule`)
*User intent: "我平时写提示词很乱，帮我把 pi-lingual 配置为提示词提炼模式，用中文（或者英文）帮我总结深化，并且叠加上最小改动原则"*
Write to `~/.pi/agent/lingual.json`:
```json
{
  "mode": "english",
  "refinePreset": "spec",
  "refineLang": "zh",
  "refineRule": "遵循最小工作 Diff 原则，明确目标与边界条件，拒绝过度设计与无关重构。"
}
```
- `refinePreset`: `"translate"` (default) | `"spec"` (Structured Engineering Spec) | `"surgical"` (Smallest Working Diff) | `"tdd"` (Test-Verified Contract) | `"debug"` (Root-Cause Triage).
- `refineLang`: `"en"` (default English) | `"zh"` / `"native"` (keep refined prompt in native language) | `"ja"` | `"ko"` | `"es"` | `"fr"` | `"de"` | `"ru"`.
- `refineRule`: Optional custom engineering rule or constraint stacked onto the refiner prompt.

