# Changelog

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
