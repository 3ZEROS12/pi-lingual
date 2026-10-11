---
name: lingual-tuner
description: "On-demand configuration architect for pi-lingual (~/.pi/agent/lingual.json). Invoked via '/lingual tuner' to customize [1] Companion slots, [2] Direct Rewrite (target language + stacked conditions + learnInRewrite), or [3] N-Choice Prompt Picker."
---

# Pi-Lingual Configuration Architect (`~/.pi/agent/lingual.json`)

An on-demand configuration skill for `pi-lingual`. By default, `pi-lingual` strips this skill from `systemPrompt` during normal coding turns (`0` token overhead) and activates it only when the user invokes `/lingual tuner` (or explicitly requests companion/prompt-rewrite configuration).

## Core Invariants (Strict RFC 2119)
- **Read-Merge-Write Persistence**: Always read `~/.pi/agent/lingual.json` first (if present), merge the requested changes without wiping unrelated user keys (`sourceLang`, `targetLang`, `lastSeenVersion`, `slots`, `promptSlots`), and write valid UTF-8 JSON back in a single turn.
- **Zero CLI Homework**: Never ask the user to manually edit JSON files or run multiple CLI commands. Apply the configuration directly and hot-reload takes effect on the next input.
- **Zero-Trace Revert**: When resetting any setting to its default, delete that key from `~/.pi/agent/lingual.json` rather than leaving empty strings or redundant defaults.
- **Strict Zero Emoji**: Keep all specifications and JSON keys free of decorative emojis.

---

## 1. State & Schema Topology (`~/.pi/agent/lingual.json`)

| Dimension / Key | Type & Allowed Values | Role & Behavior |
| :--- | :--- | :--- |
| **`mode`** | `"original"` \| `"english"` \| `"select"` \| `"off"` | **[1] `"original"`**: 0ms pass-through + companion `slots` card.<br>**[2] `"english"`**: Target language + stacked conditions ➔ 1-to-1 direct rewrite.<br>**[3] `"select"`**: Target language + $N$ candidate styles ➔ `[1]..[N]` popup selector.<br>**[0] `"off"`**: 100% hidden status bar, detached listeners, 0 tokens. |
| **`promptLang`** | `"en"` \| `"native"` \| `"zh"` \| `"ja"` \| `"ko"` ... | Target output language for State [2] and State [3]. Set `"native"` to keep the user's native language (`sourceLang`), or `"en"` for English. |
| **`promptRule`** | `string` \| `string[]` | Mandatory condition(s) woven into State [2] & [3] rewrites. Supports preset keys (`"minimal"`, `"root-cause"`, `"tdd"`, `"explain-zh"`) or arbitrary custom rule strings. |
| **`learnInRewrite`** | `boolean` (`true` \| `false`) | Hybrid toggle for State [2] & [3]: when `true`, extracts a 1-line `[重点 / Vocab]` takeaway row beneath the rewritten prompt so the user learns technical expressions while rewriting prompts. |
| **`promptSlots`** | `PromptSlotConfig[]` | Defines the $N$ orthogonal candidate styles in State [3] (`select`). Each item requires `{ id, label, instruction, enabled }`. |
| **`slots`** | `SlotConfig[]` | Defines the companion card rows in State [1] (`original`). Each item requires `{ id, label, role, instruction?, showMeaning?, enabled }`. Omit `{ role: "source" }` to hide the original text row. |

### Built-In Condition Presets (`promptRule` Shorthands)
- `"minimal"` ➔ Follow the Smallest Working Diff principle; never refactor or touch unrelated code.
- `"root-cause"` ➔ Trace the end-to-end execution flow to fix the shared root cause rather than applying surface symptom patches.
- `"tdd"` ➔ Verify boundary edge cases and run physical tests before declaring completion.
- `"explain-zh"` ➔ Keep code and identifiers exact, and provide all explanations and analysis in Chinese.

---

## 2. Intent-to-Config Compilation Matrix

Translate high-level or colloquial user complaints directly into concrete JSON configurations:

| User Pain Point / Natural Language Request | Compiled `~/.pi/agent/lingual.json` Patch |
| :--- | :--- |
| *"我平时口语太碎，帮我自动理顺成中文发给 AI，而且别让 AI 乱改无关代码"* | `{ "mode": "english", "promptLang": "native", "promptRule": ["minimal", "提炼清晰的目标与边界条件"] }` |
| *"把提示词改成英文直发，同时我还是想顺便学一下里面的重点英文词汇"* | `{ "mode": "english", "promptLang": "en", "learnInRewrite": true }` |
| *"遇到复杂任务我想从 2 个版本里挑：一个极简直达，一个要求先查根因加测试"* | `{ "mode": "select", "promptSlots": [ ...2 slots... ] }` |
| *"伴学模式太高了，把原文那行去掉，只留口语和写作"* | `{ "mode": "original", "slots": [ spoken, written ] }` (omit `source` and `vocab`) |

---

## 3. Execution Protocol
1. **Context Inspection**: Read `~/.pi/agent/lingual.json` if it exists to preserve current `sourceLang`, `targetLang`, and `lastSeenVersion`.
2. **Compilation & Write**: Merge the target schema keys (`mode`, `promptLang`, `promptRule`, `learnInRewrite`, `promptSlots`, or `slots`) and write the formatted JSON to `~/.pi/agent/lingual.json`.
3. **Physical Verification Gate**: Confirm the JSON parses cleanly and report a concise summary of the active state and conditions to the user.

---

## 4. Anti-Patterns & Common Traps
- **[Trap 1: Confusing `slots` with `promptSlots`]**: `slots` controls State [1] (language learning rows: spoken/written/vocab). `promptSlots` controls State [3] ($N$-choice prompt optimizer candidates: concise/spec/deep). Never write candidate rewrite styles into `slots`.
- **[Trap 2: Overwriting Existing User Preferences]**: Never overwrite the entire `~/.pi/agent/lingual.json` with a bare 1-key object without reading existing keys first.
- **[Trap 3: Verbose AI-Slop Instructions]**: When authoring custom `instruction` or `promptRule` strings, write direct imperative constraints ("Trace root cause first; preserve all file paths verbatim") rather than vague prose.
