---
name: lingual-tuner
description: Configure pi-lingual (~/.pi/agent/lingual.json) for Companion Mode (`slots`) or Prompt Optimizer Mode (`mode`, `promptLang`, `promptRule`, `promptSlots`). Triggers on '定制伴学', '配置伴学', '定制槽位', '不要原文', '提示词重写', '把提示词重写设为', '最小改动', '定制提示词', '候选风格', 'select模式', 'customize lingual', 'prompt rewrite', 'prompt optimizer', or '/lingual-agent'.
---

# LINGUAL CONFIGURATION & PROMPT OPTIMIZER ARCHITECT (`~/.pi/agent/lingual.json`)

## 0. Quick Index (Action ➔ Exact JSON Key in `~/.pi/agent/lingual.json`)

When the user asks you in natural language to customize `pi-lingual`, read `~/.pi/agent/lingual.json` (if it exists), merge the requested keys below, and write it back in a single `write` or `edit` tool call:

| User Intent (Natural Language) | Target JSON Key & Value in `~/.pi/agent/lingual.json` |
| :--- | :--- |
| Switch to **Companion Mode** (learn while coding) | `"mode": "original"` |
| Switch to **Direct Prompt Rewrite Mode** (1-to-1 rewrite) | `"mode": "english"` |
| Switch to **Multi-Style Candidate Picker Mode** (N choices) | `"mode": "select"` |
| Turn **Off** (0-token context shield) | `"mode": "off"` |
| Keep rewritten prompts in **user's native language** (e.g. Chinese/Japanese) | `"promptLang": "native"` (or `"zh"`, `"ja"`, `"ko"`, `"es"`, `"fr"`, `"de"`, `"ru"`, `"en"`) |
| Stack a **custom rule/constraint** onto rewritten prompts (e.g. minimal diff, RFC 2119) | `"promptRule": "<exact user rule>"` |
| Customize the **$N$ candidate prompt styles** in `select` mode | `"promptSlots": [ { "id": "...", "label": "...", "instruction": "...", "enabled": true } ]` |
| Customize **language-learning card rows** in `original` mode | `"slots": [ { "id": "...", "label": "...", "role": "translation", "instruction": "...", "showMeaning": true, "enabled": true } ]` |
| **Hide original source text** row on companion cards | Omit `{ "role": "source" }` from `"slots"` array |
| **Reset** prompt optimizer or companion slots to default | Delete `"promptLang"`, `"promptRule"`, `"promptSlots"`, or `"slots"` from `~/.pi/agent/lingual.json` |

---

## 1. Golden Rules (RFC 2119)

1. **Direct File Modification (Zero CLI Homework)**:
   - Never ask the user to run `/slots` commands or manually edit JSON files.
   - Apply changes directly to `~/.pi/agent/lingual.json` using `write` or `edit`. `pi-lingual` hot-reloads `~/.pi/agent/lingual.json` on the very next input without restarting Pi.
2. **Language Mirroring**:
   - Reply and author slot `label` fields in the user's active conversation language.
3. **Two Distinct Engines**:
   - **Engine 1 (`mode: "original"` — Companion Mode)**: Controlled by `slots`. Renders real-time language learning cards above the editor while passing original input to the AI in 0ms.
   - **Engine 2 (`mode: "english"` Direct Rewrite & `mode: "select"` N-Choice Picker — Prompt Optimizer Mode)**: Controlled by `promptLang`, `promptRule`, and `promptSlots`. Rewrites messy user input into structured engineering prompts before sending to the AI.

---

## 2. Clarification Protocol (Only When User Request Is Ambiguous)

- **If customizing Companion Mode (`original`)** without specifics, ask:
  1. How many translation rows (`slots`) do you want, and what tone for each (e.g. casual spoken, formal RFC, social tweet, vocab)?
  2. Do you want to keep or hide the original source text row (`role: "source"`)?
- **If customizing Prompt Optimizer Mode (`english` / `select`)** without specifics, ask:
  1. Do you prefer direct 1-to-1 rewriting (`"mode": "english"`) or picking from $N$ candidate styles (`"mode": "select"`)?
  2. Should the optimized prompt be in English (`"promptLang": "en"`) or your native language (`"promptLang": "native"`)?
  3. What custom engineering rules (`promptRule`) or candidate styles (`promptSlots`) should be enforced?

---

## 3. Ready-to-Use JSON Templates (`~/.pi/agent/lingual.json`)

### Template A: Rewrite Prompts in Native Language + Stack Custom Rule (`english` mode)
*Example user prompt: "把提示词重写设为中文（或母语）输出，并加上最小改动要求"*
```json
{
  "mode": "english",
  "promptLang": "native",
  "promptRule": "提炼核心目标与边界条件，遵循最小工作改动面（Smallest Working Diff），直击根因，严禁无关重构。"
}
```

### Template B: Multi-Style Candidate Picker with Custom Styles (`select` mode)
*Example user prompt: "开启 select 多风格候选模式，给我生成极简高效、结构规范、TDD测试驱动 3 个候选提示词"*
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
      "label": "TDD契约",
      "instruction": "Testable engineering contract: require boundary edge-case coverage and physical test verification before completion.",
      "enabled": true
    }
  ]
}
```

### Template C: Companion Mode Without Original Text Row (`original` mode)
*Example user prompt: "伴学卡片不要显示原文，只保留口语和书面语两行"*
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
