# Changelog

## 0.5.5

- **Mode 4 [Live Flow · 实战狂飙] (`/lingual 4` / `modify`)**:
  - **Direct Target Language Flow**: Enter raw, fast, emotional draft text in English (or target language). Surgically patches spelling mistakes, fast typos, prepositions (e.g. `in X ➔ on X`), syntax structure (e.g. `want that you can ➔ want you to`), and tenses in 0ms, and dispatches the clean prompt to the AI agent with zero delay.
  - **Zero Tone Sanitization (100% Profanity & Heat Preserved)**: Passion and raw emotional expressions (`fuck`, `suck`, `shit`, `damn`) are completely preserved without corporate censorship.
  - **Anti-Level-Leap Guardrail (i+1 Rule)**: Repairs your draft at your natural vocabulary tier; strictly avoids artificially inflating everyday dev English into academic GRE or pompous PR prose.
  - **Zero Punctuation/Casing Nitpicking**: Casual lowercase letters (`l` vs `L`) and missing trailing punctuation are never flagged as errors.
  - **Adaptive Takeaway Retention**: Short inputs display `[Fixed]` + `[Takeaways]`; long inputs/paragraphs automatically suppress the full sentence text to avoid terminal blowouts, focusing 100% on the core takeaway diffs.
  - **`explainLang: "zh"` Cognitive Memory**: Permanently stores your preferred cognitive language in `~/.pi/agent/lingual.json` to explain grammar intuitions and blind spots in the language you understand most effortlessly.
- **Strict 4-Way Mode Slot Isolation (`slots` / `directSlots` / `promptSlots` / `modifySlots`)**:
  - Each mode maintains an independent, non-leaking configuration slot array in `~/.pi/agent/lingual.json`.
- **Path & UUID Folding Shield**:
  - Automatically folds copied local absolute file paths (`C:\Users\...`) and session UUIDs into `(...)` while preserving the raw payload, eliminating LLM path hallucinations.
- **Next Leap Roadmap Forecast**:
  - Officially announced the upcoming "Mode as Configuration (模式即配置)" declarative architecture in the in-terminal release banner, paving the way for complete user-defined mode pipelines with dual-core golden defaults.

## 0.5.3

- **Clear 4-State Taxonomy (`1 ➔ 2 ➔ 3 ➔ 0`)**:
  - **[1] Orig + Learn (`original` / `learn` / `1`)**: `0ms` raw pass-through + real-time language-learning cards (`slots`) above the editor.
  - **[2] Direct Rewrite (`english` / `rewrite` / `2`)**: Target output language (`promptLang`) + stacked custom conditions (`promptRule`, single string or array of multiple conditions) ➔ 1-to-1 direct rewrite and send.
  - **[3] Pick of N (`select` / `3`)**: Target output language (`promptLang`) + stacked conditions (`promptRule`) + $N$ customizable candidate slots (`promptSlots`) ➔ interactive `[1]~[N]` popup picker (`[0]` / `Esc` keeps original text).
  - **[0] Zero-Footprint Off (`off` / `0`)**: Hides the bottom status bar badge completely (`setStatus("lingual", undefined)`), detaches `process.stdout` resize listeners, clears caches/widgets, suppresses startup banners while off, and strips `lingual-tuner` from `systemPrompt` (`0` visual pixels, `0` tokens).
- **Slash Command Menu Diet**: Trimmed registered Pi `/` commands from 13 down to the **4 core commands** (`/lingual`, `/lang`, `/slots`, `/last`), eliminating `/status` hijacking and redundant `/lingual-*` menu clutter while routing all subcommands (`lang`, `slots`, `rule`, `target`, `compact`, `model`, `status`, `last`, `agent`, `news`) cleanly through `/lingual`.
- **Upgraded `lingual-tuner` Skill**: Rebuilt `skills/lingual-tuner/SKILL.md` around the 4-state model and multi-condition `promptRule` arrays (`string | string[]`).

## 0.5.2

- **Apology & Multi-Language Release Banner Fix**: Apologies for the rapid `0.5.x` patch releases — we ran full `v0.3.16 ➔ v0.5.2` upgrade sandbox simulations across all 9 supported languages (`zh`, `tw`, `ja`, `ko`, `es`, `fr`, `de`, `ru`, `en`) and fixed three edge cases:
  1. Restored dedicated native-language release banners for Spanish (`es`), French (`fr`), German (`de`), and Russian (`ru`).
  2. Tightened `isTestEnvironment()` detection so user prompts or folder paths containing the word `"test"` never suppress config persistence or the release banner.
  3. Bounded all 9 localized release banners to 8 lines and `<= 78` visual columns per line so zero text is truncated on 80-column terminals.
