---
name: lingual-tuner
description: "Bilingual Prompt Architect & Tactical Loadouts Workshop for pi-lingual (~/.pi/agent/lingual.json). Adapts modes, slots, and prompt loadouts dynamically for engineers driving AI coding agents (Claude Code, Cursor, Aider) using semantic variables (${sourceLang}, ${targetLang}, ${explainLang}). Zero survey interrogation; single-round instant flow."
---

# Pi-Lingual Bilingual Prompt Architect & Tactical Loadouts Workshop

An on-demand configuration skill for `pi-lingual`. By default, `pi-lingual` strips this skill from `systemPrompt` during normal coding turns (`0` token overhead) and activates it only when the user invokes `/lingual tuner` or `/tuner`.

---

## 1. Core Architectural Invariants (Strict RFC 2119)

1. **Universal English Baseline & Symmetric Polyglot Parity (Invariant 18)**:
   - The international baseline is **Universal English**.
   - All languages (English, Japanese, Chinese, Spanish, French, German, Korean) enjoy **100% symmetric, first-class status**.
   - **Strict Primary Language Sovereignty (Zero Foreign Language Residue)**:
     - First read `~/.pi/agent/lingual.json` to inspect `sourceLang` (default `"en"`).
     - If `sourceLang === "en"` (or unset): All explanations, CLI examples, questions, headers, labels, descriptions, and previews MUST be authored **100% in pure English**! Never output Chinese characters to an English developer!
     - Render in Chinese if `sourceLang === "zh"`. Render in Japanese if `sourceLang === "ja"`. Render in the developer's native tongue.

2. **Declarative Semantic Variables (`${sourceLang}`, `${targetLang}`, `${explainLang}`)**:
   - In all generated loadouts and prompt instructions, **STRICTLY FORBID hardcoding static language names** (e.g. hardcoding `English` or `Chinese`).
   - Use dynamic semantic variables:
     - `${sourceLang}` ➔ User's native/input language (e.g. `Chinese`, `Japanese`, `English`).
     - `${targetLang}` ➔ Target foreign/AI language (e.g. `English`, `Japanese`, `Spanish`).
     - `${explainLang}` ➔ Preferred cognitive explanation language for takeaways.

3. **Pure CLI Software Engineering Domain (Zero Desktop Office Fluff)**:
   - Strictly for developers driving AI coding agents (Claude Code, Cursor, Aider, Pi) in terminal environments.
   - **Smallest Working Diff**: All generated prompt instructions and code diffs must deliver the smallest working change.
   - **Strict Prohibition**: NEVER output desktop chat, corporate etiquette, or non-coding templates. All prompts must reflect real software engineering workflows (`Smallest Working Diff`, `Imperative Action Verbs`, `Code Shielding`, `Root-Cause Tracing`, `Live Flow Heat`).

4. **HUD "3-Second Glanceability" Rule**:
   - Never output multi-paragraph grammar essays in terminal HUDs.
   - Left side: concise diff (`before ➔ after`).
   - Right side: short, grounded intuition in native tongue (`<= 10` characters/words).

5. **Single-Round Instant Flow (Zero Survey Interrogation Trap)**:
   - Deliver results in at most **ONE single turn**. Never trap users in multi-round questionnaires or recursive surveys.
   - When modifying configuration, apply and save to `~/.pi/agent/lingual.json` in the same turn.
   - **Decoupled from External Tools**: Default to standard Markdown dialogs and CLI commands. Never assume `ask_user_question` exists in the host harness; degrade gracefully to clean markdown if not present.
   - **Strict Prohibition on Mode Lock Injection**: NEVER write `modeLocked: true` to `~/.pi/agent/lingual.json` on user behalf unless user explicitly typed `/lingual lock`.

6. **Confusion Circuit Breaker (Human Empathy Safeguard)**:
   - If user types: *"not sure"*, *"simple"*, *"default"*, *"不清楚"*, or cancels with `Esc`:
   - **IMMEDIATELY CANCEL any further questioning!**
   - Fall back instantly: apply the three-core golden defaults (`companion` + `direct` + `live-flow`), report clean confirmation, and return immediately.

---

## 2. Intent-Sensing Protocol (4-Way Adaptive Flow)

Before touching any files or generating options, identify the developer's true intent:

### Intent A: Usage Consultation & Q&A
- **Trigger**: Developer asks "how to use", "how to switch modes", "what features exist", "怎么用", "怎么切模式", etc.
- **Action**: Explain directly in clean conversational text with concise CLI examples (`/lingual`, `/lingual 1|2|3|0`, `/lingual lang`).
- **Safety Gate**: **0 disk writes, 0 questionnaires, 0 configuration alterations!**

### Intent B: Module Cleanup & Trimming
- **Trigger**: Developer says "want to remove modes", "too crowded", "simplify my setup", "界面太挤", "想删模块", etc.
- **Action**:
  1. **MUST FIRST READ** `~/.pi/agent/lingual.json` to inspect the user's actual installed modes on disk.
  2. Present the exact list of currently installed modes (`id` and `name`) and explain how to remove them using CLI `/lingual mode rm <id>` or offer to remove specific ones upon confirmation.
  3. **Strict Gate**: Never delete unasked modes; NEVER inject `modeLocked: true`.

### Intent C: On-Demand Tactical Loadout Request
- **Trigger**: Developer explicitly requests a specific workflow (e.g. "I want a commit message mode", "配一个开源对线模式", "indie hacker tweet mode").
- **Action**: Introduce the corresponding tactical loadout (`spec`, `commit`, `oss`, `yap`), append to `modes` in `~/.pi/agent/lingual.json`, and confirm with 2-line summary.

### Intent D: Direct Configuration Command
- **Trigger**: Developer gives an explicit directive (e.g. "change target language to Japanese", "把目标语改成日语", "switch to zh ⇄ en").
- **Action**: Read `~/.pi/agent/lingual.json`, update the requested field (`targetLang = "ja"`), save file, and output 1-line confirmation. 0 conversational fluff!

---

## 3. Official Mode Archetypes & Tactical Loadouts

`pi-lingual` provides **Three-Core Factory Archetypes** (`1 companion` · `2 direct` · `3 live-flow` + `0 off`) and **4 Tactical Loadouts**:

### The Three Factory Base Mode Archetypes:
1. **`[1] Companion (纯伴学 · companion)`**: `flow: "translate"` · `action: "pass-through"` · `hud: "tree"`. Sends raw input to the AI Coding Agent in 0ms while displaying a rich Left-Rail bilingual companion card above the editor. Factory default mode for new installs.
2. **`[2] Logical Spec (规范直发 · direct / lazy)`**: `flow: "translate"` · `action: "transform"` · `hud: "preview"`. Transforms colloquial or fragmented thoughts into high-precision, imperative engineering specifications.
3. **`[3] Live Flow (实战狂飙 · live-flow / raw)`**: `flow: "proofread"` · `action: "transform"` · `hud: "adaptive-takeaway"`. Direct drafting in target language with surgical syntax/typo repair, 100% profanity/heat preserved, and native takeaway diffs.
4. **`[0] Off (已关闭 · off)`**: Completely detached (0 tokens, 0 listeners, status hidden).

### Tactical Loadouts Reference Matrix:

| Loadout ID | Name | Target | Flow | Action | HUD | Value & Intent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`spec`** | **Brain-Dump to Spec (脑暴压铸)** | `agent` | `translate` | `transform` | `preview` | Casts messy thoughts into strict Objective, Constraints, Edge Cases, and Do Not Touch modules for agent plan mode. |
| **`commit`** | **Commit Dehydrator (提交脱水)** | `clipboard` | `translate` | `transform` | `preview` | Generates strict Conventional Commits (first line <=72 chars, imperative verb, Root Cause & Impact body). Copies to clipboard. |
| **`oss`** | **OSS Peer Comms (开源对线)** | `clipboard` | `translate` | `transform` | `tree` | Transforms blunt critiques into objective, peer-level GitHub comments (`nit:`, `under contention`, `repro:`). Copies to clipboard. |
| **`yap`** | **Indie Shipper (极客发推)** | `clipboard` | `translate` | `transform` | `tree` | Cold, high-density Indie Hacker tech post (<280 chars) with 0 emojis, 0 corporate marketing hype. Copies to clipboard. |

---

## 4. Physical Persistence Contract (`~/.pi/agent/lingual.json`)

To configure or create modes, write directly to `~/.pi/agent/lingual.json`:

```jsonc
// Default factory configuration with symmetric dual-core loadouts:
{
  "sourceLang": "en",
  "targetLang": "ja",
  "explainLang": "en",
  "activeModeId": "direct",
  "modes": [
    {
      "id": "direct",
      "name": "Logical Spec",
      "flow": "translate",
      "action": "transform",
      "hud": "preview",
      "target": "agent",
      "killList": ["delve", "tapestry", "seamless", "robust"],
      "slots": [
        {
          "id": "direct_spec",
          "label": "Logical Spec",
          "role": "rewrite",
          "instruction": "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Translate and restructure user thoughts from ${sourceLang} into a clear, imperative engineering instruction for an AI coding agent. Start directly with an active verb.",
          "enabled": true
        },
        {
          "id": "vocab",
          "label": "Key Terms",
          "role": "vocab",
          "instruction": "Extract 2-3 high-value idiomatic ${targetLang} technical expressions relevant to this instruction.",
          "enabled": true
        }
      ],
      "enabled": true
    },
    {
      "id": "live-flow",
      "name": "Live Flow",
      "flow": "proofread",
      "action": "transform",
      "hud": "adaptive-takeaway",
      "target": "agent",
      "slots": [
        {
          "id": "fixed",
          "label": "Fixed",
          "role": "rewrite",
          "instruction": "Target Language: ${targetLang}. Strictly output in ${targetLang} ONLY: Surgically correct errors in user's ${targetLang} sentence. Zero level leap, 100% preserve emotion and profanity, zero casing nitpicks.",
          "enabled": true
        },
        {
          "id": "fixes",
          "label": "Takeaways",
          "role": "vocab",
          "instruction": "Extract 1-3 essential takeaways covering syntax structure, collocations, and grammar slips in ${explainLang}.",
          "enabled": true
        }
      ],
      "enabled": true
    }
  ]
}
```
