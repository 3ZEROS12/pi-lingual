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
     - If `sourceLang === "en"` (or unset): All questions, headers, labels, descriptions, and previews MUST be authored **100% in pure English**! Never output Chinese characters (`键入中文`, `规范英文`) to an English developer!
     - Only render in Chinese if `sourceLang === "zh"`. Only render in Japanese if `sourceLang === "ja"`.

2. **Declarative Semantic Variables (`${sourceLang}`, `${targetLang}`, `${explainLang}`)**:
   - In all generated loadouts and prompt instructions, **STRICTLY FORBID hardcoding static language names** (e.g. hardcoding `English` or `Chinese`).
   - Use dynamic semantic variables:
     - `${sourceLang}` ➔ User's native/input language (e.g. `Chinese`, `Japanese`, `English`).
     - `${targetLang}` ➔ Target foreign/AI language (e.g. `English`, `Japanese`, `Spanish`).
     - `${explainLang}` ➔ Preferred cognitive explanation language for takeaways.

3. **Pure CLI Software Engineering Domain (Zero Desktop Office Fluff)**:
   - Strictly for developers driving AI coding agents in terminal environments.
   - **Strict Prohibition**: NEVER output desktop chat, business etiquette, workplace honorifics, or corporate non-coding templates. All prompts must reflect real software engineering workflows (`Smallest Working Diff`, `Imperative Action Verbs`, `Code Shielding`, `Root-Cause Tracing`, `Live Flow Heat`).

4. **HUD "3-Second Glanceability" Rule**:
   - Never output multi-paragraph grammar essays in terminal HUDs.
   - Left side: concise diff (`before ➔ after`).
   - Right side: short, grounded intuition in native tongue (`<= 10` characters/words).

5. **Single-Round Instant Flow (Zero Survey Interrogation Trap)**:
   - When user runs `/lingual tuner` or `/tuner`:
   - Present at most **ONE single round of `ask_user_question`** (or apply direct text intent in 1 turn).
   - **STRICTLY FORBID calling `ask_user_question` a second time!** Zero multi-stage preview loops.
   - Once confirmed, **IMMEDIATELY persist to `~/.pi/agent/lingual.json` in the same turn** using the `write` tool.

6. **Confusion Circuit Breaker (Human Empathy Safeguard)**:
   - If user types: *"not sure"*, *"simple"*, *"default"*, *"不清楚"*, or cancels with `Esc`:
   - **IMMEDIATELY CANCEL any further questioning!**
   - Fall back instantly: apply the three-core golden defaults (`companion` + `direct` + `live-flow`), report clean confirmation, and return immediately.

---

## 2. Official Mode Archetypes & Tactical Loadouts

`pi-lingual` provides **Three-Core Factory Archetypes** (`1 companion` · `2 direct` · `3 live-flow` + `0 off`), one **Optional Archetype** (`candidates`), and **4 Tactical Loadouts**:

### The Three Factory Base Mode Archetypes:
1. **`[1] Companion (纯伴学 · companion)`**: `flow: "translate"` · `action: "pass-through"` · `hud: "tree"`. Sends raw input to the AI Coding Agent in 0ms while displaying a rich Left-Rail bilingual companion card above the editor. Factory default mode for new installs.
2. **`[2] Logical Spec (规范直发 · direct / lazy)`**: `flow: "translate"` · `action: "transform"` · `hud: "preview"`. Transforms colloquial or fragmented thoughts into high-precision, imperative engineering specifications.
3. **`[3] Live Flow (实战狂飙 · live-flow / raw)`**: `flow: "proofread"` · `action: "transform"` · `hud: "adaptive-takeaway"`. Direct drafting in target language with surgical syntax/typo repair, 100% profanity/heat preserved, and native takeaway diffs.
4. **`[0] Off (已关闭 · off)`**: Completely detached (0 tokens, 0 listeners, status hidden).

### Optional Archetype:
- **`Candidates (挑候选 · candidates / select)`**: `flow: "translate"` · `action: "select"` · `hud: "tree"`. Generates multiple prompt variations (Concise, Structured, Deep) with an interactive 1..N hotkey bar. Configured only when explicitly requested by user.

*(Note: When helping users add, delete, or modify modes in `~/.pi/agent/lingual.json`, always distinguish between the user's currently installed modes on disk and these official base archetypes!)*

### Tactical Loadouts Reference Matrix:

| Loadout ID | Name | Target | Flow | Action | HUD | Value & Intent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`lazy`** *(Default)* | **Logical Spec (规范直发)** | `agent` | `translate` | `transform` | `preview` | Restructures raw thoughts into imperative engineering specs with active verbs (`Inspect`, `Refactor`, `Trace`). |
| **`raw`** *(Default)* | **Live Flow (实战狂飙)** | `agent` | `proofread` | `transform` | `adaptive-takeaway` | Direct typing in `${targetLang}`. 100% profanity/heat kept, i+1 anti-level-leap, zero casing nitpicks, native takeaway diffs. |
| **`spec`** | **Brain-Dump to Spec (脑暴压铸)** | `agent` | `translate` | `transform` | `preview` | Casts messy thoughts into strict Objective, Constraints, Edge Cases, and Do Not Touch modules for agent plan mode. |
| **`commit`** | **Commit Dehydrator (提交脱水)** | `clipboard` | `translate` | `transform` | `preview` | Generates strict Conventional Commits (first line <=50 chars, imperative verb, Root Cause & Impact body). Copies to clipboard. |
| **`oss`** | **OSS Peer Comms (开源对线)** | `clipboard` | `translate` | `transform` | `tree` | Transforms blunt critiques into objective, peer-level GitHub comments (`nit:`, `under contention`, `repro:`). Copies to clipboard. |
| **`yap`** | **Indie Shipper (极客发推)** | `clipboard` | `translate` | `transform` | `tree` | Cold, high-density Indie Hacker tech post (<280 chars) with 0 emojis, 0 corporate marketing hype. Copies to clipboard. |

---

## 3. Physical Persistence Contract (`~/.pi/agent/lingual.json`)

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

### Symmetric Polyglot Example: Native English Founder to Chinese Clients (`en ⇄ zh`)
```jsonc
// Scenario: Native English founder/PM reaching out to Chinese clients for product feedback (en ⇄ zh)
{
  "sourceLang": "en",
  "targetLang": "zh",
  "explainLang": "en",
  "modes": [
    {
      "id": "client-outreach",
      "name": "Client Discovery",
      "flow": "translate",
      "action": "select",
      "hud": "tree",
      "enabled": true,
      "slots": [
        {
          "id": "wechat-casual",
          "label": "WeChat",
          "role": "translation",
          "instruction": "Translate into warm, natural, conversational Mandarin (${targetLang}) suitable for asking customers about their product experience on WeChat or Feishu. Avoid stiff translationese.",
          "showMeaning": true,
          "enabled": true
        },
        {
          "id": "enterprise-formal",
          "label": "Formal",
          "role": "translation",
          "instruction": "Translate into respectful, professional business Mandarin (${targetLang}) for enterprise client feedback inquiries, using appropriate honorifics (e.g., 您, 贵团队) without sounding overly bureaucratic.",
          "showMeaning": true,
          "enabled": true
        }
      ]
    }
  ]
}
```

---

## 4. Execution Protocols

### Scenario A: Natural Language Directive (e.g. `/lingual tuner I want a commit dehydrator mode`)
1. Read `~/.pi/agent/lingual.json`.
2. Match against Tactical Loadouts (`spec`, `commit`, `oss`, `yap`) or synthesize requested custom mode.
3. Add the mode to `modes` array in `~/.pi/agent/lingual.json`.
4. Deliver a 2-line confirmation with ASCII preview in user's `sourceLang`. Zero questions asked!

### Scenario B: Bare `/lingual tuner` or `/tuner`
1. Read `~/.pi/agent/lingual.json` to detect `sourceLang`.
2. Present **ONE single round of `ask_user_question`**:
   - Question 1 (`header`: `"Loadout"` / `"战术配装"`): Ask which loadout or adjustment is desired.
   - Question 2 (`header`: `"Target Lang"` / `"目标语言"`): Ask foreign target language.
3. Upon answer: immediately apply to `~/.pi/agent/lingual.json`.
4. Output concise summary + ASCII card. Done!
