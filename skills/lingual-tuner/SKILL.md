---
name: lingual-tuner
description: "Adaptive customization architect for pi-lingual (~/.pi/agent/lingual.json). Universal English baseline for global software engineers driving AI coding agents (Claude Code, Cursor, Aider). Single-round instant configuration for bare /lingual tuner or /tuner, zero bureaucratic survey interrogation."
---

# Pi-Lingual Adaptive Customization Architect (`~/.pi/agent/lingual.json`)

An on-demand configuration skill for `pi-lingual`. By default, `pi-lingual` strips this skill from `systemPrompt` during normal coding turns (`0` token overhead) and activates it only when the user invokes `/lingual tuner` or `/tuner`.

---

## 1. Core Architectural Invariants (Strict RFC 2119)

1. **Universal English Developer Baseline & Symmetric Polyglot Architecture**:
   - The canonical baseline of this skill is **Universal English** for global software engineers.
   - All languages (English, Japanese, Chinese, Spanish, French, German, Korean) enjoy **symmetric and equal status**.
   - **Strict Primary Language Sovereignty (Zero Foreign Language Residue)**:
     - First read `~/.pi/agent/lingual.json` to inspect `sourceLang` (defaults to `"en"` for international/English developers).
     - If `sourceLang === "en"` (or unset): All questions, headers, labels, descriptions, and previews MUST be authored **100% in pure English**! It is STRICTLY FORBIDDEN to assume the user is Chinese or output Chinese characters (`键入中文`, `规范英文`, etc.) to an English developer!
     - Only render in Chinese if `sourceLang === "zh"`. Only render in Japanese if `sourceLang === "ja"`.

2. **Pure CLI Software Engineering Domain (Zero Desktop Office Fluff)**:
   - This skill is designed STRICTLY for developers in terminal CLI environments driving AI coding agents.
   - **Strict Prohibition**: NEVER present desktop chat, business etiquette, workplace honorifics, customer service, or corporate email templates. All presets and prompts MUST be 100% software engineering and developer workflow concepts (`Smallest Working Diff`, `Imperative Action Verb`, `Code-Switch Shield`, `Architecture RFC`, `Root-Cause Tracing`).

3. **Single-Round Instant Flow (Zero Survey Interrogation Trap)**:
   - When the user runs bare `/lingual tuner` or `/tuner`:
   - Present at most **ONE single round of `ask_user_question`** (1-2 crisp questions max).
   - **STRICTLY FORBID calling `ask_user_question` a second time!** Zero multi-stage preview loops.
   - Once the user answers, **IMMEDIATELY apply the configuration to `~/.pi/agent/lingual.json` in the same turn** using the `write` tool.

4. **Confusion Circuit Breaker (Human Empathy Safeguard)**:
   - If the user types in custom text: *"not sure"*, *"simple"*, *"default"*, *"just change language"*, *"不清楚"*, or declines the question dialog with `Esc`:
   - **IMMEDIATELY CANCEL any further questioning!**
   - Fall back instantly to human dialogue: apply the golden developer default (Mode 2 Direct Engineering Spec, or `en ⇄ ja` companion), report clean confirmation in chat, and let the user continue coding with zero friction.

5. **Strict 3-Way Mode Isolation (Zero Cross-Mode Leakage)**:
   - `slots` ➔ Governs ONLY Mode 1 (`companion` / Companion Card).
   - `directSlots` ➔ Governs ONLY Mode 2 (`direct` / Direct Send).
   - `promptSlots` ➔ Governs ONLY Mode 3 (`candidates` / Candidate Picker).
   - Customizing one mode MUST NEVER alter or leak into the arrays of other modes.
   - Preserve top-level `"mode"` untouched unless the user explicitly requests to switch active modes.

---

## 2. Bare `/lingual tuner` Execution Protocol

### Step 1: Pre-Flight Check (0.1s Dispatch)
Read `~/.pi/agent/lingual.json` to inspect `sourceLang` (default `"en"`), `targetLang`, and current slot arrays.

### Step 2: Single-Round Developer Choice (`ask_user_question`)

#### For English Developers (`sourceLang === "en"` or unset) — 100% Pure English:

1. **Question 1 (`header`: `"Workflow"`) — Choose Developer Prompt & Mode Scheme**:
   - *Question*: `Which development or companion workflow do you want to configure?`
   - *Options*:
     1. **Direct Engineering Prompt Optimization (Mode 2) (Recommended)** — Refine rough thoughts into high-signal imperative engineering specs for AI coding agents
     2. **Dual-Register Companion Card (Mode 1)** — Send input in 0ms, expand spoken + written target language cards above editor
     3. **Pick of 3 Candidates (Mode 3)** — Generate concise, structured, and root-cause prompt candidates, send with keys 1..3
     4. **Switch Target Language** — Change your learning or translation target language (Japanese, Chinese, Spanish, German, etc.)

2. **Question 2 (`header`: `"Target Lang"`) — Target Language**:
   - *Question*: `What is your target foreign language?`
   - *Options*:
     1. **Japanese (ja) (Recommended)** — Authentic daily spoken & technical Japanese for open-source and documentation
     2. **Chinese (zh)** — Simplified Chinese for open-source projects and cross-border collaboration
     3. **Spanish / French / German (es/fr/de)** — European tech ecosystems and open-source communities
     4. **None (English Only)** — Focus purely on English prompt optimization and structuring without translation

---

#### For Chinese Developers (`sourceLang === "zh"`) — Simplified Chinese:

1. **Question 1 (`header`: `"定制方案"`)**:
   - *Question*: `您希望将 pi-lingual 调整为哪种开发指令或伴学方案？`
   - *Options*:
     1. **规范英文工程直发 (Direct English Spec) (Recommended)** — 键入中文，自动翻译并规范化为高信噪比英文工程指令直发 Coding Agent (Mode 2)
     2. **经典双语伴学词卡 (Dual Companion Card)** — 0ms 原话直发，输入框上方浮现口语+架构书面双语学习卡 (Mode 1)
     3. **多风格候选秒发 (Pick of 3 Candidates)** — 终端上方生成极简/结构/根因三组候选，按数字键 1..3 免回车秒发 (Mode 3)
     4. **切换目标语种 (Switch Target Language)** — 切换翻译与伴学的目标语言（支持英、日、韩、德、法、西等）

2. **Question 2 (`header`: `"目标语言"`)**:
   - *Question*: `转换的目标外语语种是什么？`
   - *Options*:
     1. **英语 (English) (Recommended)** — 最佳编码大模型推理基座与国际开源标准
     2. **日语 (Japanese)** — 适用于日系开源项目与技术文档
     3. **多语种扩展 (德语 / 法语 / 西班牙语 / 韩语)** — 欧洲或跨国技术协作语种

---

## 3. Instant Settlement & Zero-Friction Confirmation

Immediately apply the selection to `~/.pi/agent/lingual.json` via the `write` tool.

### Output Delivery:
Output ONLY:
1. A concise 3-line bullet summary of what is now active (in user's `sourceLang`);
2. An authentic ASCII card preview (`┌ ├ └`) using realistic software engineering text;
3. A 1-line confirmation: *"Saved and active immediately without restarting."*

*(STRICTLY FORBID dumping raw JSON blocks, CLI walls, or initiating Round 2 questionnaires!)*
