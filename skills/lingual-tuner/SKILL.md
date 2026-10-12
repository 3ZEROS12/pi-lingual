---
name: lingual-tuner
description: "Adaptive customization architect for pi-lingual (~/.pi/agent/lingual.json). Universal English baseline that dynamically mirrors the user's native language (sourceLang) across 0-question fast-path, 1-round express default tweaks, and deep per-slot workbench for Mode 1, Mode 2, and Mode 3."
---

# Pi-Lingual Adaptive Customization Architect (`~/.pi/agent/lingual.json`)

An on-demand configuration skill for `pi-lingual`. By default, `pi-lingual` strips this skill from `systemPrompt` during normal coding turns (`0` token overhead) and activates it only when the user invokes `/lingual tuner` (or `/skill:lingual-tuner`).

---

## 1. Core Architectural Invariants (Strict RFC 2119)

1. **Universal English Baseline & Dynamic Native-Language Mirroring (`sourceLang`)**:
   - This skill is authored in **Universal English** as the canonical baseline.
   - **Mandatory Native-Language Adaptation**: First read `~/.pi/agent/lingual.json` to inspect `sourceLang` (default `"zh"`, or `"tw"`, `"ja"`, `"ko"`, `"en"`, `"es"`, `"fr"`, `"de"`, `"ru"`, etc.) and observe the language of the user's prompt.
   - You **MUST dynamically translate and present** the Customization Map diagram, every `ask_user_question` header/question/label/description/preview, and your final summary in the **user's exact native language (`sourceLang`)**!

2. **Zero Internal Code Jargon & Zero Unsolicited JSON/CLI Walls**:
   - In all user-facing `ask_user_question` titles, labels, and descriptions, **NEVER** expose internal JSON variable names (`slots`, `directSlots`, `promptSlots`, `showMeaning`, `slotPreset`, `role`). Always translate them into natural, friendly everyday terms in the user's native language.
   - **Delivery Hygiene**: Always write `~/.pi/agent/lingual.json` directly using the `write` tool.
     - For **Express Tweaks (`⚡`)** and **Standard Customization (`🎨`)**, **NEVER dump raw JSON code blocks or CLI command walls into your chat reply!** Deliver ONLY: (a) a clean plain-language summary of active modes/rows in the user's native language, (b) an authentic visual card preview (`┌ ├ └`), and (c) a confirmation that changes are saved and live immediately without restarting or running any commands.
     - Only show the raw JSON blueprint and CLI table when the user explicitly selects **Deep Per-Row Workbench (`🔬`)**.

3. **Strict 3-Way Mode Isolation (Zero Cross-Mode Leakage)**:
   - Each of the 3 active modes has its **own isolated array** in `~/.pi/agent/lingual.json`:
     1. **`slots`** ➔ Governs **ONLY Mode 1 (`companion` / 纯伴学)**.
     2. **`directSlots`** ➔ Governs **ONLY Mode 2 (`direct` / 直接改)**.
     3. **`promptSlots`** ➔ Governs **ONLY Mode 3 (`candidates` / 挑候选)**.
   - Modifying Mode 1 or Mode 3 MUST NEVER overwrite or leak into Mode 2 (`directSlots`). When multiple modes are selected, configure each mode's array independently!

4. **Explicit Target Language Lock & Zero Unrequested Summarization**:
   - Every slot's `instruction` MUST begin with an explicit target language lock (e.g., `"Target Language: French (fr). Strictly output in French ONLY: ..."` or `"Target Language: Japanese (ja). Strictly output in Japanese ONLY: ..."`).
   - Unless the user explicitly chooses "AI Coding Prompt Structuring", every slot's `instruction` MUST enforce **100% faithful translation/expression without summarizing or altering the user's original meaning and sentence type** (`"Never summarize, distill, or turn conversational/academic/business sentences into software specs."`).
   - In every ASCII card preview (`┌ ├ └`), the sample text on each row **MUST be written in that row's exact target language and register** (never copy-pasted English on non-English rows!).

---

## 2. Adaptive 3-Speed Customization Routing

### Track 0: Zero-Question Fast-Path (0 Rounds · For Explicit Requests)
- **Trigger**: The user's initial message already specifies what they want to change (e.g., `/lingual tuner hide source row in Mode 1 and set Mode 2 to faithful English`).
- **Action**:
  - **STRICTLY FORBID calling `ask_user_question` (`0` rounds of questions)!**
  - Immediately read `~/.pi/agent/lingual.json`, apply the requested delta while preserving other modes intact, write `~/.pi/agent/lingual.json` via `write`, and output the clean native-language summary + authentic visual card preview.

---

### Track A / B / C Entry: Stage 1 Customization Map + Adaptive Interview (When User Runs `/lingual tuner` Without Specifics)
First read `~/.pi/agent/lingual.json` (if present) to detect `sourceLang` and current settings.

**CRITICAL STEP 1 (Output the Column-Aligned Customization Map in the User's Native Language `sourceLang`!)**:
Before calling `ask_user_question` in Stage 1, output the following **column-aligned Customization Map**, dynamically translated into the user's native language (`sourceLang`) with all right-hand badges (`[✓]` / `(+)`) vertically aligned and **no arbitrary row-count ceiling**:

*Canonical Universal English Template (translate naturally into `sourceLang` — e.g. Simplified Chinese for `zh`, Japanese for `ja`, Korean for `ko`, etc.):*
```text
  pi-lingual Customization Map          Legend: ( ) Edit  (+) Add/Remove  [✓] Toggle
  ──────────────────────────────────────────────────────────────────────────────────
  [Mode 1 · Companion]  Send raw text in 0ms, show learning card above editor
    · Source Row                                                        [✓] Show/Hide
    ├ (Label) : (Language) · (Style: Spoken / Written / Paper / Script) (+) N Rows
    │   ↳ Native Nuance Sub-line                                        [✓] On/Off
    └ Vocab Row : (Focus: Idioms / Exam Collocations)                   [✓] On/Off

  [Mode 2 · Direct]     Convert 1-to-1 on Enter using a single dedicated rule
    ├ (Label) : (Language) · (Style: Faithful Direct / Keigo / Spec)    1-to-1 Rule
    └ Vocab Row : Extract 1-line key expressions                        [✓] On/Off

  [Mode 3 · Candidates] Generate N options, press keys 1..N to send (0 for raw)
    · Source Row                                                        [✓] Show/Hide
    ├ 1..N (Label) : (Language) · (Style: Business / Keigo / PR)        (+) N Options
    └ Vocab Row : Extract 1-line key expressions                        [✓] On/Off
  ──────────────────────────────────────────────────────────────────────────────────
```
*(For example, when `sourceLang === "zh"`, render the diagram above in crisp Simplified Chinese with `图例: ( )可改  (+)可增删  [✓]可开关`, `(+) 自由增删多行`, `[✓] 显示/隐藏`, `[✓] 开启/关闭`; when `sourceLang === "ja"`, render in natural Japanese, etc.)*

**CRITICAL STEP 2 (Call `ask_user_question` in the User's Native Language `sourceLang`)**:
In the same turn right after printing the Customization Map, call `ask_user_question` with these 4 zero-jargon questions (translated into `sourceLang`, explicitly stating the out-of-the-box default baseline in Q1 and Q4 so impatient users never face a "blackbox"):

1. **Question 1 (`header`: `"Mode"` / `"定制模式"`, `multiSelect: true`) — Which mode(s) to customize? (Transparent Baseline, Zero Bias)**:
   - *Question (adapt to `sourceLang`)*: Which working mode(s) would you like to customize? (Modes are 100% isolated and never leak into each other; the last selected mode becomes your active mode after saving.)
   - *Options (adapt to `sourceLang`)*:
     1. **Mode 1: Companion Card** (Send raw text in 0ms, show learning card above editor) — *[Default: Source + Spoken + Written + Vocab (4 rows) with native nuance sub-lines enabled]*
     2. **Mode 2: Direct Send** (Convert 1-to-1 automatically on Enter using a single dedicated rule) — *[Default: 1-to-1 faithful natural translation into target language, zero forced summarization, isolated from Modes 1 & 3]*
     3. **Mode 3: Candidate Picker** (Show full candidates above editor, press number keys `1..N` to send immediately, `0` for raw text) — *[Default: 3 distinct candidate options, instant 1-key send without pressing Enter]*

2. **Question 2 (`header`: `"Pacing"` / `"定制节奏"`) — Choose your preferred depth & speed**:
   - *Question (adapt to `sourceLang`)*: How would you like to customize? (Supports 1-round quick tweaks on top of defaults or deep per-row crafting.)
   - *Options (adapt to `sourceLang`)*:
     1. **⚡ Express Default Tweak (Apply immediately after this page · Zero follow-up questions) (Recommended)** — Best for busy users: applies your selections on top of defaults in 1 single turn (you can also type a quick note below).
     2. **🎨 Standard Guided Setup (Pick target languages next + side-by-side visual style previews)** — Best for practical users: 1 more quick step to pick languages and compare visual previews.
     3. **🔬 Deep Per-Row Workbench (Customize every row's label, register/honorifics & order + full blueprint review before saving)** — Best for perfectionists: craft every individual row (`丁寧語/謙譲語`, `해요체`, `UK RP / US Slang`, `NeurIPS Paper`, etc.) and approve the complete blueprint before saving.

3. **Question 3 (`header`: `"Scenarios"` / `"场景与风格"`, `multiSelect: true`) — Universal Profession & Goal Coverage (Multi-Select!)**:
   - *Question (adapt to `sourceLang`)*: What are your usage scenarios or desired transformation styles? (Multi-select supported; 100% faithful to your original meaning by default, never summarizing unless Option 4 is chosen.)
   - *Options (adapt to `sourceLang`)*:
     1. **Faithful Multilingual Translation & Localization (Daily Spoken / Formal Prose / Theater & Game Script)** — 100% faithful to your original meaning and tone across any number of languages (`EN / JA / KO / FR / DE / ES / RU`, US Slang, UK Formal, Anime/Game dialogue).
     2. **Cross-Border Business & Client Etiquette (Japanese Keigo ビジネス敬語 / Korean 해요체 / International Business)** — Tailored for cross-border PMs, executives, and client communication; polite, idiomatic, and natural.
     3. **Academic Research & Exam Prep (Top-Tier Conference Paper + Advisor Email + IELTS/TOEFL/JLPT High-Score Expressions & Collocations)** — Bans AI clichés (`delve`, `tapestry`); covers LaTeX academic prose, peer-level advisor emails, and IELTS Speaking Part 3 / Writing Task 2 / exam collocations.
     4. **Developer & Geek Workflows (GitHub OSS PR/Issue + X/Twitter Dev Share + Concise Tech Prompts)** — Tailored for software engineers: authentic open-source collaboration, social sharing, and structured coding instructions.

4. **Question 4 (`header`: `"Layout"` / `"版面微调"`, `multiSelect: true`) — Card layout & auxiliary rows (Transparent Default Baseline)**:
   - *Question (adapt to `sourceLang`)*: Compared to the default card layout (Top `[Source]` + Translation Rows + `↳ Native Nuance` + Bottom `[Vocab]`), which layout adjustments do you want? (Multi-select)
   - *Options (adapt to `sourceLang`)*:
     1. **Hide Top `[Source]` Row (Save 1–2 lines of vertical space, show outputs only)** — Ideal if you don't need to re-read what you just typed (if unchecked, `[Source]` row is kept by default).
     2. **Keep Bottom `[Vocab]` Row (Idioms, High-Score Synonyms & Collocations)** — Extracts 2–3 high-value phrases/collocations with native definitions at the bottom of the card.
     3. **Keep `↳ Native Nuance` Sub-line Below Each Row (Recommended for 1–3 rows; auto-disabled for 4+ rows)** — Shows parenthetical native-language nuance breakdown under each translation row.
     4. **Minimalist Pure-Output Layout (Hide `[Source]`, `[Vocab]`, and `↳ Sub-lines`)** — Displays only the pure output rows for maximum compactness.

---

### Post-Stage-1 Branching Rules (Strictly Follow User's Q2 Pacing Choice in `sourceLang`!)

#### Branch A: User Chose `⚡ Express Default Tweak` (1-Round Express Tweak)
- **STOP ASKING QUESTIONS IMMEDIATELY!** Do **NOT** call `ask_user_question` a second time!
- Immediately apply the user's Stage 1 choices (plus any custom note they typed) on top of their current/default config in `~/.pi/agent/lingual.json` via the `write` tool.
- Output ONLY (in `sourceLang`):
  1. A concise plain-language bullet summary of what is now active in their chosen mode(s);
  2. An authentic ASCII card preview (`┌ ├ └`, with every row's sample text written in its exact target language and register!);
  3. A 1-line confirmation that changes are saved and live immediately without restarting or running any commands. *(Do NOT dump raw JSON blocks or CLI command walls!)*

#### Branch B: User Chose `🎨 Standard Guided Setup` (2-Stage Guided + Side-by-Side `preview`)
- Call `ask_user_question` **once more** (in `sourceLang`) tailored to the user's Stage 1 profession/goal:
  1. **Target Languages & Row Lineup** (`multiSelect: true`);
  2. **Style Nuance with Authentic Side-by-Side `preview` Mockups** (ensure every language row in `preview` displays real sample text in that exact language!).
  - **Multi-Mode Guard**: If the user selected multiple modes in Stage 1 Q1, include separate questions for each selected mode so Mode 1, Mode 2, and Mode 3 remain 100% isolated.
- After Round 2 returns, write `~/.pi/agent/lingual.json` via `write` and output the clean plain-language summary + authentic ASCII preview + live confirmation in `sourceLang`. *(No raw JSON wall!)*

#### Branch C: User Chose `🔬 Deep Per-Row Workbench` (Per-Slot Precision + Stage 3 Blueprint Approval)
1. **Stage 2 (Per-Row Fine-Grained Specification in `sourceLang`)**:
   - Call `ask_user_question` to let the user specify exact per-row labels, languages, and registers for each selected mode:
     - **Fine-Grained Register Library**:
       - **English (`en`)**: `US Casual / Slang` vs `UK Formal / Received Pronunciation Prose` vs `Top-Tier Conference Academic (NeurIPS/ACL, zero AI clichés)` vs `Advisor/Client Polite Email` vs `IELTS Band 8.0 Spoken Part 3 & Task 2 Essay` vs `GitHub OSS PR & X Hook`
       - **Japanese (`ja`)**: `丁寧語 (Desu/Masu)` vs `ビジネス敬語・謙譲語 (Enterprise Keigo)` vs `アニメ・ゲーム劇台詞 (Vivid theater/game dialogue)` vs `タメ口 (Casual peer)`
       - **Korean (`ko`)**: `해요체 (Polite daily/business partner)` vs `하십시오체 (Formal presentation)` vs `반말 (Close friend)`
       - **French / German / Spanish (`fr/de/es`)**: `Courant / Du / Tú (Natural daily)` vs `Soutenu / Affaires / Sie / Usted (Formal business/academic)`
2. **Stage 3 (Mandatory Pre-Save Blueprint Confirmation in `sourceLang`)**:
   - Present the **Complete Blueprint** inside `preview` (verifying that every row's mode label `[Mode 1]` / `[Mode 2]` / `[Mode 3]` is 100% accurate and every sample sentence in the ASCII preview matches that row's exact target language!):
     - **Part 1**: Terminal ASCII Card Preview + `[1]..[N]` Hotkey Bar Preview;
     - **Part 2**: Per-Row Specification Table (`[Mode | Row# | ID | Label | Target Language Lock & Full Instruction | Sub-line]`);
     - **Part 3**: Exact JSON to be written to `~/.pi/agent/lingual.json`.
   - Once confirmed (or adjusted), write `~/.pi/agent/lingual.json` and output the verified final preview.

---

## 3. Isolated 3-Mode JSON Schema (Internal Agent Reference Only)

```typescript
interface LingualJsonSchema {
  mode?: "companion" | "direct" | "candidates" | "off";
  sourceLang?: "zh" | "tw" | "ja" | "ko" | "en" | "es" | "fr" | "de" | "ru";
  targetLang?: string;

  // 1. Mode 1 [Companion / 纯伴学] ONLY (isolated from Mode 2 & 3; supports any number of rows)
  slots?: Array<{
    id: string;
    label: string;
    role: "source" | "translation" | "vocab" | "custom";
    instruction?: string;  // MUST start with "Target Language: <Lang>. Strictly output in <Lang> ONLY: ..."
    showMeaning?: boolean; // true for 1-3 rows if requested; false for 4+ rows to keep rows single-line
    enabled: boolean;
  }>;

  // 2. Mode 2 [Direct / 直接改] ONLY (dedicated 1-to-1 conversion slot, immune to Mode 1/3 changes)
  directSlots?: Array<{
    id: string;
    label: string;
    role?: "rewrite" | "vocab";
    instruction: string;   // MUST start with "Target Language: <Lang>. Strictly output in <Lang> ONLY: ..."
    enabled: boolean;
  }>;

  // 3. Mode 3 [Candidates / 挑候选] ONLY (multi-candidate list for 1..N instant hotkey selection)
  promptSlots?: Array<{
    id: string;
    label: string;
    role?: "rewrite" | "vocab";
    instruction: string;   // MUST start with "Target Language: <Lang>. Strictly output in <Lang> ONLY: ..."
    enabled: boolean;
  }>;
}
```
