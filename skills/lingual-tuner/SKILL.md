---
name: lingual-tuner
description: Zero-friction companion slot tuner and prompt optimizer architect for pi-lingual. Triggers on '定制伴学', '配置伴学', '定制槽位', '修改槽位', '不要原文', '优化提示词', '定制提示词模式', '提示词槽位', 'customize lingual slots', 'hide original text', 'customize prompt optimizer', or '/lingual-agent'.
---

# LINGUAL DUAL-ENGINE TUNER (COMPANION & PROMPT OPTIMIZER)

Zero-friction configuration architect for `pi-lingual`.
Allows AI coding agents to customize **both** of `pi-lingual`'s engines on behalf of the user by writing directly to `~/.pi/agent/lingual.json` without requiring manual CLI command authoring:
1. **Engine 1 — Language Companion Mode (`mode: "original"`)**: Customizes `slots` (`Spoken`, `Written`, `Vocab`, custom registers, or hiding `source` text).
2. **Engine 2 — Prompt Optimizer Mode (`mode: "english"` Direct Rewrite & `mode: "select"` N-Choice Interactive Selector)**: Customizes `promptLang` (output language: `"en"` default vs `"zh"` / `"native"`), `promptRule` (stacked custom engineering constraints), and `promptSlots` (the 3 default or N custom prompt optimization styles for `select` mode).

---

## 1. Golden Rules (RFC 2119)

1. **Zero-User-Friction**:
   - Never ask the user to type CLI flags or manually edit JSON files.
   - Directly apply the configuration by writing/editing `~/.pi/agent/lingual.json` in a single tool call.
2. **Language Mirroring**:
   - Mirror the user's active conversation language (Chinese, English, Japanese, Korean, Spanish, French, German, Russian).
3. **Distinguish the Two Engines Clearly**:
   - When the user asks to customize `pi-lingual`, identify whether they are customizing **Companion Mode (`original`)** or **Prompt Optimizer Mode (`english` / `select`)** (or ask if ambiguous).

---

## 2. Clarification Protocol

### A. When Customizing Engine 1: Companion Mode (`original`)
Query and confirm:
1. **Slot Count**: How many output slots (e.g. 1-slot minimal translation, 2-slot dual register, 3-slot with twitter/deep)?
2. **Tone per Slot**: What style or role per slot (e.g. casual Slack, formal RFC/PR, viral tweet, technical insight, vocab)?
3. **Source Text Retention**: **"Do you want to keep the original source text row, or remove it entirely to save terminal vertical space?"** (Omit `{ "role": "source" }` to hide original text).

### B. When Customizing Engine 2: Prompt Optimizer Mode (`english` Direct Rewrite / `select` N-Choice Picker)
Query and confirm:
1. **Optimization Workflow (`english` vs `select`)**:
   - **`english` (Direct 1-to-1 Rewrite)**: Directly rewrites messy input into one structured, standardized, high-efficiency prompt and sends it immediately (does not generate learning cards).
   - **`select` (N-Choice Interactive Selector)**: Generates $N$ candidate optimized prompts across distinct preset styles so the user can pick one from a menu before sending.
2. **Output Language (`promptLang`)**:
   - Default is `"en"` (English), or set `"zh"` / `"native"` to structure and refine messy thoughts while keeping the output prompt in the user's native language!
3. **Custom Stacked Rules (`promptRule`) & Candidate Styles (`promptSlots`)**:
   - Built-in 3 default `promptSlots`: `concise` (极简高效), `spec` (结构规范), `deep` (深度严谨). Users can customize these 3 or define $1..N$ custom styles and stack any custom engineering rule (`promptRule`).

---

## 3. Configuration Target & Schema (`~/.pi/agent/lingual.json`)

```typescript
interface LingualDiskConfig {
  mode?: "original" | "english" | "select" | "off";

  // Engine 1: Language Companion (`original` mode)
  slots?: Array<{
    id: string;            // e.g. "source", "spoken", "written", "vocab", "twitter"
    label: string;         // e.g. "原文", "口语", "写作", "重点"
    role: "source" | "translation" | "vocab" | "custom";
    instruction?: string;
    showMeaning?: boolean;
    enabled: boolean;
  }>;

  // Engine 2: Prompt Optimizer (`english` Direct Rewrite & `select` N-Choice Picker)
  promptLang?: string;     // "en" (default) | "zh" | "native" | "ja" | etc.
  promptRule?: string;     // Custom engineering rule stacked onto prompt optimization
  promptSlots?: Array<{
    id: string;            // e.g. "concise", "spec", "deep", "tdd"
    label: string;         // e.g. "极简高效", "结构规范", "深度严谨", "TDD契约"
    instruction: string;   // Optimization directive for this candidate style
    enabled: boolean;
  }>;
}
```

---

## 4. Execution Patterns (Direct File Modification)

### Pattern A: Direct Prompt Rewrite in Native Language + Custom Engineering Rule (`english` mode)
*User intent: "我写提示词很乱，帮我把提示词重写模式设为中文输出，并且叠加上最小改动和直击根因的要求"*
Write to `~/.pi/agent/lingual.json`:
```json
{
  "mode": "english",
  "promptLang": "zh",
  "promptRule": "提炼核心目标与隐含边界条件，要求遵循最小工作 Diff（Smallest Working Diff），直击根因，严禁无关重构。"
}
```

### Pattern B: N-Choice Interactive Prompt Selector with Custom Styles (`select` mode)
*User intent: "帮我开启多选提示词优化模式，给我生成极简指令、结构化规范、TDD测试驱动 3 个英文候选提示词让我选"*
Write to `~/.pi/agent/lingual.json`:
```json
{
  "mode": "select",
  "promptLang": "en",
  "promptSlots": [
    {
      "id": "concise",
      "label": "极简高效",
      "instruction": "High-efficiency, zero-fluff imperative instruction targeting the exact action and smallest working diff.",
      "enabled": true
    },
    {
      "id": "spec",
      "label": "结构规范",
      "instruction": "Structured engineering specification: distill messy thoughts into clear Objective, Constraints, and Deliverable.",
      "enabled": true
    },
    {
      "id": "tdd",
      "label": "TDD测试驱动",
      "instruction": "Testable engineering contract: require boundary edge-case coverage and physical test verification before completion.",
      "enabled": true
    }
  ]
}
```

### Pattern C: Companion Mode Without Source Text (`original` mode)
*User intent: "伴学卡片不要显示中文原文，只要口语和书面语译文"*
Write to `~/.pi/agent/lingual.json`:
```json
{
  "mode": "original",
  "slots": [
    {
      "id": "spoken",
      "label": "口语",
      "role": "translation",
      "instruction": "Natural, fluent spoken flow (daily standup, Slack, agile collaboration).",
      "showMeaning": true,
      "enabled": true
    },
    {
      "id": "written",
      "label": "写作",
      "role": "translation",
      "instruction": "Clear, precise, modern technical written prose (PR descriptions, RFCs, documentation).",
      "showMeaning": true,
      "enabled": true
    }
  ]
}
```
