# pi-lingual

A bilingual terminal HUD and prompt transformer for Pi Coding Agent.

Code in your native language. See real-time Silicon Valley spoken phrasing and formal technical prose—or transform prompts into clean technical English to keep your code, comments, and commits consistent.

[![npm version](https://img.shields.io/npm/v/pi-lingual?color=blue)](https://www.npmjs.com/package/pi-lingual)
[![npm downloads](https://img.shields.io/npm/dm/pi-lingual?color=22c55e&label=downloads)](https://www.npmjs.com/package/pi-lingual)
[![GitHub stars](https://img.shields.io/github/stars/3ZEROS12/pi-lingual?style=flat&color=f59e0b)](https://github.com/3ZEROS12/pi-lingual/stargazers)
[![Built for Pi](https://img.shields.io/badge/Built%20for-Pi%20Coding%20Agent-orange)](https://github.com/earendil-works/pi-coding-agent)
[![Tests](https://img.shields.io/badge/Tests-93%2F93%20Pass%20(100%25)-brightgreen)](tests/engine.test.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**English** | [日本語](./README_ja.md) | [简体中文](./README_zh.md)

<p align="center">
  <img src="assets/demo.gif" alt="pi-lingual Terminal Companion HUD Experience" width="840">
</p>

```text
  · [Original] El PR es demasiado grande, sugiero dividirlo en dos cambios atómicos (es / ja / de / zh ➔ en)
  ┌ [Spoken]   This PR is huge; we'd be much better off splitting it into two atomic changes.
  ├ [Written]  The pull request scope is overly broad. Decomposing it into two discrete, atomic commits is recommended.
  └ [Vocab]    overly broad · be better off · split into · atomic commits
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
`pi-lingual` renders a low-cognitive-load window right above your prompt. During that brief generation gap, glance at how the same thought maps between daily engineering chat (Slack / standups) and formal documentation (RFCs / PRs) to build active fluency in context.

### 3. Zero Context Pollution & Zero Token Waste
Standard translation tools append English translations directly onto your prompt.
Across multi-turn conversations, this clutters chat history with redundant text, burning token budgets and diluting the model's reasoning focus.
`pi-lingual` operates as an ambient TUI sidecar overlay. **Your prompts to the AI remain completely clean; no translation tokens are injected into your conversation history.**

### 4. Rock-Solid Terminal Layout (No More Border Tears)
East Asian full-width (CJK) characters occupy 2 visual columns.
Traditional closed rectangular boxes (`│ ... │`) fracture when character widths are miscalculated, causing ghost lines, wrapping tears, and cursor desync.
`pi-lingual` discards closed borders entirely, using an open left-rail tree branch (`· ┌ ├ └`) built on Unicode UAX #11 metrics. It stays visually solid even on narrow split panes.

---

## Three Operating Modes

Toggle modes anytime with `/lingual`:

```text
  /lingual (cycles: original ➔ english ➔ off ➔ original)
```

| Mode | What You Type | What the AI Receives | What You See | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **`original`** *(Default)* | Native Language *(e.g. Spanish / Japanese / German / Chinese)* | **Raw Native Prompt**<br>*(0ms pass-through, 0 context pollution)* | Interactive dual-register HUD *(Spoken + Written + Vocab)* | Solo coding while absorbing idiomatic engineering phrasing |
| **`english`** *(Transform)* | Native Language *(e.g. Spanish / Japanese / German / Chinese)* | **Standard Technical English**<br>*(Rewrites prompts into RFC-grade English)* | Companion card previewing the generated English | Team/open-source repos requiring English comments and commits |
| **`off`** | Any Text | **Raw Text** *(0 background calls, 0 widgets)* | Hidden / disabled | Pure coding sessions with zero UI overlays |

### Code & Stack-Trace Passthrough (Code Stays Untouched)
In `english` mode, pasting code blocks or error logs never translates the code:
- **Rewrites prose only**: Converts natural language instructions into concise technical English.
- **Preserves code verbatim**: Reattaches your original code block or stack trace directly onto the transformed prompt.
- **The result**: Clean English instructions paired with exact technical context.

---

## In Action: Dual-Register Design

Memorizing isolated vocabulary lists does not build expressive capability. Day-to-day software engineering splits into two distinct registers:

```text
  · [Original] メモリリークの可能性があるので、クリーンアップ処理を追加してください
  ┌ [Spoken]   There might be a memory leak here, so let's make sure we toss in some cleanup logic.
  ├ [Written]  To prevent potential memory leaks, please incorporate explicit cleanup and resource disposal routines.
  └ [Vocab]    memory leak · toss in · resource disposal · incorporate
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
  <img src="assets/capsule-mode-en.svg" alt="pi-lingual Layout Modes" width="840">
</p>

1. **Left-Rail Tree HUD (Default)**: Open-branch layout (`· ┌ ├ └`) using Unicode UAX #11 metrics. Eliminates closed borders to prevent terminal wrapping tears. Stays strictly within 9 lines to avoid host widget truncation warnings.
2. **Single-Line Capsule Mode (`/lingual compact`)**: Compresses the HUD into a dense single-line stream:
   ```text
   ja ⇄ en · [Spk] There might be a memory leak... │ [Wrt] Incorporate explicit cleanup routines...
   ```
   *Saves over 80% vertical space in tight split panes (tmux, WezTerm). Activates automatically when terminal height is $< 22$ lines.*

---

## Real-World Multilingual Matrix

Translating into English is the primary workflow, with full bidirectional support across major languages:

<p align="center">
  <img src="assets/multilingual-showcase.svg" alt="Multilingual Matrix" width="840">
</p>

| Source | Scenario | Input Prompt | [Spoken] Daily Standup / Slack | [Written] RFC / PR Review |
| :--- | :--- | :--- | :--- | :--- |
| **🇪🇸 es** | Code Review | `El PR es demasiado grande, sugiero dividirlo en dos cambios atómicos` | `This PR is huge — how about we split it into a couple of bite-sized PRs instead?` | `The PR scope is excessively broad; decomposing it into two discrete, atomic commits is advised.` |
| **🇯🇵 ja** | Systems | `メモリリークの可能性があるので、クリーンアップ処理を追加してください` | `There might be a memory leak here, so let's make sure we toss in some cleanup logic.` | `To prevent potential memory leaks, please incorporate explicit cleanup and resource disposal routines.` |
| **🇩🇪 de** | Distributed | `Wir müssen sicherstellen, dass diese Schnittstelle idempotent ist` | `We've gotta make sure this endpoint is strictly idempotent so duplicate requests don't bite us.` | `It is imperative to guarantee strict idempotency for this API endpoint to prevent duplicate mutations.` |
| **🇨🇳 zh** | Architecture | `这个方案过度设计了，不如直接用标准库` | `This feels a bit over-engineered; let's stick with the standard library.` | `The proposed approach introduces unnecessary complexity. Leveraging native standard library implementations is preferred.` |

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

## Commands & Shortcuts

| Command | Full / Alias | Description |
| :--- | :--- | :--- |
| `/lingual [sub]` | `/lingual-mode` | Master command: cycle modes, or route subcommands (e.g. `/lingual compact`) |
| `/slots [cmd]` | `/lingual-slots` | Dynamic slot pipeline: add custom slots or remove source text row |
| `/lingual-compact` | `/lingual compact` | Toggle between Tree HUD and Capsule mode (preserves Pi core `/compact`) |
| `/lang <source> [target]` | `/lingual-lang` | Switch language pair (e.g. `/lang ja en`, `/lang 日语`) |
| `/last` | `/lingual-last` | Replay the most recent companion card |
| `/lingual-model <id>` | — | Switch companion model (`auto` to follow session, or specify a model ID) |
| `/status` | `/lingual-status` | Display diagnostics, active model, and cache stats |

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
npm test            # 93/93 test assertions passing (100% green)
npm run build       # Multi-entry compilation via tsup (extension + core engine)
```

---

## Ecosystem: Pi Terminal Suite

Each extension occupies a distinct terminal slot (`aboveEditor`, `belowEditor`, `status-only` footer, and runtime tool hooks) so all four run together with zero widget overlap:

| Package | Terminal Slot & Mechanism | Install |
| :--- | :--- | :--- |
| **[`pi-lingual`](https://github.com/3ZEROS12/pi-lingual)** *(Current)* | `二 ⇄ two` `aboveEditor` HUD (≤9 lines, UAX #11 tree layout) & prompt-to-English transformer (0 chat history tokens) | `pi install npm:pi-lingual` |
| **[`toolflow`](https://github.com/3ZEROS12/toolflow)** | `⌬` Runtime tool hooks — stage-gated MCP mounting & >40-line log dehydration to disk (-95% log tokens) | `pi install npm:toolflow` |
| **[`pi-tui-status-beautifier`](https://github.com/3ZEROS12/pi-tui-status-beautifier)** | `status-only` footer hook — 6 badge presets, `<80`-col idle folding `(+N idle)`, 0 render-loop disk reads | `pi install npm:pi-tui-status-beautifier` |
| **[`pi-anchor`](https://github.com/3ZEROS12/anchor)** | `⌖` `belowEditor` 1-line sticky strip, 0ms `pin:` intercept, `[■■□□]` step bar & `↪` session jump | `pi install npm:pi-anchor` |

---

## License

MIT © [Jason Song](https://github.com/3ZEROS12)
