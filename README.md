# pi-lingual

A bilingual terminal HUD and prompt transformer for Pi Coding Agent.

Code in your native language. See real-time Silicon Valley spoken phrasing and formal technical prose—or transform prompts into clean technical English to keep your code, comments, and commits consistent.

[![npm version](https://img.shields.io/npm/v/pi-lingual?color=blue)](https://www.npmjs.com/package/pi-lingual)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built for Pi](https://img.shields.io/badge/Built%20for-Pi%20Coding%20Agent-orange)](https://github.com/earendil-works/pi-coding-agent)
[![Tests](https://img.shields.io/badge/Tests-95%2F95%20Pass%20(100%25)-brightgreen)](tests/engine.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Error-blue)](tsconfig.json)

**English** | [简体中文](./README_zh.md)

<p align="center">
  <img src="assets/demo.gif" alt="pi-lingual Terminal Companion HUD Experience" width="840">
</p>

```text
  · [Original] 这个方案有点过度设计了，不如直接用标准库实现
  ┌ [Spoken]   This feels a bit over-engineered; we'd be much better off sticking with the standard library.
  │            (感觉有点过度设计了，用标准库划算得多)
  ├ [Written]  The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.
  │            (该方案引入了不必要的复杂度，建议优先采用原生标准库实现)
  └ [Vocab]    over-engineered (过度工程化) · be better off (更合适) · stick with (沿用) · leverage (利用)
```

## Quick Start

Install directly inside Pi Coding Agent:

```bash
pi install npm:pi-lingual
```

Works out of the box with your current session model credentials. No extra API keys or setup required.

---

## Core Value: Why Do Developers Need This?

Pairing with terminal AI coding agents creates four acute frictions for developers:

### 1. Global & Team Repositories Require Clean English
In open-source projects or cross-border teams, code comments, commit messages, and PR descriptions must be strictly in English.
When you prompt an AI agent in your native language, the model frequently generates code with native-language comments and explanations. You have to manually review and clean them up before every push.
In `english` mode: You type naturally in your native language. `pi-lingual` automatically rewrites your instruction into standard technical English before passing it to the AI. **All generated code, comments, and documentation remain uniformly in clean English.**

### 2. Catching the 5-Second Generation Gap
After hitting Enter, an LLM typically takes 5 to 15 seconds to synthesize code or execute refactorings.
That window is too short to switch to a browser, yet long enough for your focus to drift into idle staring.
`pi-lingual` creates a low-cognitive-load window right above your prompt. During that brief generation gap, glance at how the same thought maps between daily engineering chat (Slack / standups) and formal documentation (RFCs / PRs), cultivating authentic fluency effortlessly.

### 3. Zero Context Pollution & Zero Token Waste
Standard translation tools append English translations directly onto your prompt.
Across multi-turn conversations, this clutters chat history with redundant text, burning token budgets and diluting the model's reasoning focus.
`pi-lingual` operates as an ambient TUI sidecar overlay. **Your prompts to the AI remain completely clean; no translation tokens are injected into your conversation history.**

### 4. Rock-Solid Terminal Layout (No More Border Tears)
East Asian full-width (CJK) characters occupy 2 visual columns.
Traditional closed rectangular boxes (`│ ... │`) fracture when character widths are miscalculated, causing ghost lines, wrapping tears, and cursor desync.
`pi-lingual` discards closed borders entirely, using an open left-rail tree branch (`· ┌ ├ └`) built on Unicode UAX #11 metrics. It stays visually solid even on narrow split panes.

---

## Four Operating States (`1 ➔ 2 ➔ 3 ➔ 0`)

Press `/lingual` to cycle sequentially, or jump directly via `/lingual <1|2|3|0>`:

| State | What You Type | What the Engine Does | What You See | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **`[1] Orig + Learn`** *(`original` / `1`)* | Native Language *(e.g. Chinese / Japanese)* | **0ms Pass-Through** to main AI + async companion card (`slots`) | Dual-register HUD *(Spoken + Written + Vocab)* | Coding at full speed while absorbing authentic engineering phrasing |
| **`[2] Direct Rewrite`** *(`english` / `2`)* | Messy / Colloquial Input | **Target Language (`promptLang`) + Stacked Conditions (`promptRule`) ➔ 1-to-1 Direct Send** *(optional `/lingual learn-on` adds 1-line vocab row)* | Clean preview of the rewritten prompt (`└ [⚡EN] ...`) | Turning messy thoughts into structured instructions with zero extra keypresses |
| **`[3] Pick of N`** *(`select` / `3`)* | Messy / Colloquial Input | **Target Language + $N$ Condition Slots (`promptSlots`)** *(Default: *Direct Action* / *Structured Spec* / *Root-Cause First*)* | Interactive selector menu (`[1]..[N]`, or `[0]`/`Esc` for raw text) | Comparing orthogonal prompt styles on complex tasks before sending |
| **`[0] Zero-Load Off`** *(`off` / `0`)* | Any Text | **Hides status bar badge (`undefined`), detaches resize listeners & strips skill block** | **0 pixels, 0 listeners, 0 tokens** — completely invisible inside Pi | Pure coding or screen recording with zero visual or context footprint |

### On-Demand Customization via `/lingual tuner` (0 System Prompt Tokens by Default)
To guarantee **0.00 bytes of `systemPrompt` overhead during normal coding**, `pi-lingual` strips the `lingual-tuner` skill block across all modes by default and activates it only when you run `/lingual tuner <your request>`:
1. **Customize State [1] Companion Slots (`slots`)**:
   - Example: `/lingual tuner remove the original text row and keep only Spoken and Written`
2. **Customize State [2] Direct Rewrite (`promptLang` + `promptRule` + `learnInRewrite`)**:
   - **Target Language (`promptLang`)**: Defaults to `"en"`, or set `"native"` (`/lingual target native`) to structure prompts in your own native language.
   - **Stacked Conditions (`promptRule`)**: Supports built-in presets (`minimal`, `root-cause`, `tdd`, `explain-zh`) or multiple custom rules (`/lingual rule minimal`).
   - **Hybrid Learn-in-Rewrite (`learnInRewrite`)**: Run `/lingual learn-on` to extract a 1-line vocabulary takeaway row beneath your rewritten prompt in States [2] & [3].
3. **Customize State [3] Pick of N (`promptSlots`)**:
   - Example: `/lingual tuner set select mode to 2 slots: concise action and TDD verification`

### Hybrid Intent Grafting (Code Stays Untouched)
In `english` mode, pasting code blocks or error logs never translates the code:
- **Translates intent only**: Converts natural language instructions into crisp technical English.
- **Keeps code untouched**: Grafts your original code block or stack trace right back onto the prompt.
- **The result**: Clean English instructions paired with complete technical context.

---

## In Action: Dual-Register Philosophy

Memorizing isolated vocabulary lists does not build expressive capability. Real software engineering naturally divides into two distinct registers:

```text
  · [Original] 这个方案有点过度设计了，不如直接用标准库实现
  ┌ [Spoken]   This feels a bit over-engineered; we'd be much better off sticking with the standard library.
  │            (感觉有点过度设计了，用标准库划算得多)
  ├ [Written]  The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.
  │            (该方案引入了不必要的复杂度，建议优先采用原生标准库实现)
  └ [Vocab]    over-engineered (过度工程化) · be better off (更合适) · stick with (沿用) · leverage (利用)
```

* **`[Spoken] (Conversational Register)`**: High-frequency phrasing used by Silicon Valley engineering teams. Includes daily standups, Slack huddles, pair-programming chats, and common phrasal verbs.
* **`[Written] (Architecture Register)`**: Formal technical prose. Built for RFC proposals, pull request descriptions, architecture reviews, and issue trackers.
* **`[Vocab] (Collocations)`**: Extracted engineering collocations. Automatically highlighted with non-destructive ANSI underline formatting when matched in sentences.

---

## Dynamic Dual-Slot Architecture (Domain-Specific Customization)

`[Spoken]` and `[Written]` are simply the out-of-the-box defaults for **Slot 1** and **Slot 2** in `pi-lingual`'s underlying **Dynamic Dual-Slot Architecture**. The engine is not restricted to software engineering; both slots can be decoupled and rebound to match any domain via custom Agent instructions or preset configurations:

| Preset | Target Domain | Slot 1 (Casual / Immediate) | Slot 2 (Formal / Rigorous) |
| :--- | :--- | :--- | :--- |
| **`developer` (Default)** | Software Engineering | `[Spoken]` Silicon Valley Standup / Slack | `[Written]` RFC / PR Review Plain English |
| **`social`** | Twitter/X & Social Growth | `[Hook]` Viral Hook / Engaging Banter | `[Deep]` Structured Technical Insight |
| **`japanese`** | Japanese Immersion | `[口語]` Casual Tameguchi / Huddle | `[敬語]` Business Polite Keigo |
| **`academic`** | Academic Research | `[Discussion]` Lab Colloquy / Q&A | `[Paper]` Peer-Reviewed Journal Prose |

*To customize slot styles, describe your target audience and tone to your Agent (e.g. `/lingual-agent`), or supply custom slot definitions via `CustomSlotsConfig` in the API.*

---

## Form Factors: Full Tree vs. Single-Line Capsule

Two layouts designed to protect your editor workspace:

<p align="center">
  <img src="assets/capsule-mode.svg" alt="pi-lingual Layout Modes" width="840">
</p>

1. **Left-Rail Tree HUD (Default)**: Open-branch layout (`· ┌ ├ └`) using Unicode UAX #11 metrics. Eliminates closed borders to prevent terminal wrapping tears. Stays strictly within 9 lines to avoid host widget truncation warnings.
2. **Single-Line Capsule Mode (`/compact`)**: Compresses the HUD into a dense single-line stream:
   ```text
   zh ⇄ en · [Spk] This feels over-engineered... │ [Wrt] Proposed approach introduces unnecessary complexity...
   ```
   *Saves over 80% vertical space in tight split panes (tmux, WezTerm). Activates automatically when terminal height is $< 22$ lines.*

---

## Real-World Multilingual Matrix

Translating into English is the primary focus, but major languages are supported bidirectionally:

<p align="center">
  <img src="assets/multilingual-showcase.svg" alt="Multilingual Matrix" width="840">
</p>

| Source | Scenario | Input Prompt | [Spoken] Daily Standup / Slack | [Written] RFC / PR Review |
| :--- | :--- | :--- | :--- | :--- |
| **🇨🇳 zh** | Architecture | `这个方案过度设计了，不如直接用标准库` | `This feels a bit over-engineered; let's stick with the standard library.` | `The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.` |
| **🇯🇵 ja** | Systems | `メモリリークの可能性があるので、クリーンアップ処理を追加してください` | `There might be a memory leak here, so let's make sure we toss in some cleanup logic.` | `To prevent potential memory leaks, please incorporate explicit cleanup and resource disposal routines.` |
| **🇪🇸 es** | Code Review | `El PR es demasiado grande, sugiero dividirlo en dos cambios atómicos` | `This PR is huge — how about we split it into a couple of bite-sized PRs instead?` | `The PR scope is excessively broad; decomposing it into two discrete, atomic commits is advised.` |
| **🇩🇪 de** | Distributed | `Wir müssen sicherstellen, dass diese Schnittstelle idempotent ist` | `We've gotta make sure this endpoint is strictly idempotent so duplicate requests don't bite us.` | `It is imperative to guarantee strict idempotency for this API endpoint to prevent duplicate mutations.` |

Switch language pairs anytime:
```bash
/lang ja en      # Japanese to English
/lang es en      # Spanish to English
/lang de en      # German to English
/lang en ja      # English to Japanese
/lang zh ja      # Chinese to Japanese
/lang 日语       # Natural language aliases supported
```

**Primary Language Sovereignty**: Switching languages updates status badges, command hints, and UI chrome with zero hardcoded residues.

---

## Engineering Highlights

- 🛡️ **Zero Context Pollution**: Runs as an ambient TUI sidecar. Never injects translation tokens into your LLM chat history.
- ⚡ **Instant & Non-Blocking**: Press Enter to clear cards immediately. Stale background requests abort on the fly via `AbortController`.
- 📐 **Rock-Solid Terminal Layout**: Open tree branches (`· ┌ ├ └`) using Unicode UAX #11 metrics. Never breaks borders or wraps awkwardly on wide characters.
- ⚡ **Command Pass-Through Shield**: 40+ common CLI prefixes (`git`, `docker`, `npm`, `cargo`) and code blocks bypass translation with zero token spend.
- 🧠 **In-Memory LRU Cache**: Frequent affirmations (`继续`, `认同`, `开始吧`) return instantly at 0ms from a 50-entry cache.
- 🧹 **Noise Filtering**: Automatically strips clipboard screenshot paths (`pi-clipboard-*.png`) and folds compiler logs before translation.
- 🪶 **Model Isolation**: Runs on your session model by default, or pick a lightweight model to protect high-tier reasoning quota.

---

## Streamlined 4-Command Matrix (Zero Autocomplete Clutter)

To keep Pi's `/` autocomplete menu clean, `pi-lingual` registers only **4 top-level commands** and routes all management actions through `/lingual`:

| Core Command | Subcommands / Arguments | Description |
| :--- | :--- | :--- |
| **`/lingual`** | `/lingual [1\|2\|3\|0]` | Cycle `1 ➔ 2 ➔ 3 ➔ 0` when called without args, or jump directly by number/name |
| ↳ Subcommand | `/lingual rule [minimal\|root-cause\|tdd\|<rule>]` | Inspect, stack, or `clear` custom rewrite conditions |
| ↳ Subcommand | `/lingual target <en\|native\|zh\|ja>` | Set target output language (`promptLang`) for States [2] & [3] |
| ↳ Subcommand | `/lingual learn-on` \| `learn-off` | Toggle 1-line vocabulary takeaway row in States [2] & [3] |
| ↳ Subcommand | `/lingual tuner <request>` | Activate on-demand `lingual-tuner` skill to update `~/.pi/agent/lingual.json` |
| ↳ Subcommand | `/lingual compact` \| `model` \| `status` \| `news` | Toggle single-line capsule, switch model, inspect cache stats, or view release notes |
| **`/lang`** | `/lang <source> [target]` | Switch language pair (e.g. `/lang ja en`, `/lang 日语`) |
| **`/slots`** | `/slots [add\|rm\|toggle\|reset]` | Manage companion slots (add custom slots or remove `source` text row) |
| **`/last`** | `/last` | Replay the most recent companion or rewrite card |

*Keyboard shortcuts: `Alt+.` (next page), `Alt+,` (previous page). Standalone CLI: `lingual "prompt"`.*

---

## Universal Dynamic Slot Pipeline (Fully Movable Slots)

Never get locked into rigid, hardcoded templates. Every slot on your companion card—including the source text—is a decoupled building block:

- **Hide original source text**:  
  Run `/slots rm source` to completely remove the source text row. Cards will display clean translation branches directly.
- **Add custom tone & style slots**:  
  Run `/slots add twitter Tweet Short punchy tweet under 280 chars`. The LLM JSON schema and Tree HUD layout adapt dynamically in real-time.
- **Toggle or reset slots**:  
  Run `/slots toggle <id>` to temporarily mute a slot; run `/slots reset` to restore default initial slots anytime.

> 💡 **Agent Confirmation Protocol**: When asking your Agent to configure companion slots, your Agent will proactively confirm two things: **your desired slot count**, and **the specific style and role for each slot (including whether you want to keep or suppress the original text)**.

---

## Dedicated Models & Privacy

### Protecting High-Tier Reasoning Quotas
By default, `pi-lingual` runs securely in-process using your active Pi session model.

When pairing with high-tier reasoning models, delegate companion duties to a lightweight model to save quota:
```bash
/lingual-model <lightweight-model-id>    # Delegate to a lightweight model
/lingual-model auto                      # Revert to follow-session mode
```

Local Ollama or custom OpenAI-compatible endpoints can also be configured in `~/.pi/agent/lingual.json`:
```json
{
  "endpoint": "http://127.0.0.1:11434/v1/chat/completions",
  "model": "qwen2.5:3b"
}
```

> 🔒 **Absolute Privacy Guarantee**: `pi-lingual` has **zero external dependencies** (`dependencies: {}`), zero telemetry, and zero tracking. Requests go only to your authenticated model endpoints.

---

## Author's Note

The system prompts for the translation model are currently tailored by me, but you can deeply customize them to fit your own needs at any time using the `/lingual agent` command or the built-in `lingual-tuner` skill.

Beyond just tweaking configurations, I genuinely encourage everyone to think through the output style you actually want:
* **How granular should the breakdown of key phrases in a sentence be?**
* **Do you need supplementary explanations on specific grammar nuances or engineering contexts?**
* **How many core collocations strike the right balance for your cognitive load?**

These questions matter immensely. You will only achieve the best results when you tune the prompts intentionally to match your baseline. In your daily workflow, whenever you press Enter and wait a few seconds for the AI to generate code, take that brief idle window to glance at the natural phrasing right above your prompt.

The inspiration for this project came from my personal experience using tools like the Metasequoia (水杉) input method. I used them faithfully for quite a while, but the outcome was disappointing—I felt like I wasn't really learning anything. Elementary vocabulary was already familiar and didn't need reinforcement, while difficult, obscure words couldn't be grasped just by staring at isolated dictionary entries. During that period, my vocabulary apps were practically worn out from constant lookups. What truly allows you to internalize language and actually use it is authentic phrasing and natural collocations embedded within real context.

I hope everyone takes the time to tune a prompt that works best for them, catches those brief moments during code generation, and keeps going.

---

## Verification & Testing

```bash
npm run typecheck   # Strict tsc --noEmit check (0 errors)
npm test            # 95/95 test assertions passing (100% green)
npm run build       # Multi-entry compilation via tsup (extension + core engine)
```

---

## License

MIT © [Jason Song](https://github.com/3ZEROS12)
