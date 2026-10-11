# Changelog

## 0.5.2

- **Apology & Multi-Language Release Banner Fix**: Apologies for the rapid `0.5.x` patch releases — we ran full `v0.3.16 ➔ v0.5.2` upgrade sandbox simulations across all 9 supported languages (`zh`, `tw`, `ja`, `ko`, `es`, `fr`, `de`, `ru`, `en`) and fixed three edge cases:
  1. Restored dedicated native-language release banners for Spanish (`es`), French (`fr`), German (`de`), and Russian (`ru`).
  2. Tightened `isTestEnvironment()` detection so user prompts or folder paths containing the word `"test"` never suppress config persistence or the release banner.
  3. Bounded all 9 localized release banners to 8 lines and `<= 78` visual columns per line so zero text is truncated on 80-column terminals.
- **Direct Prompt Rewrite (`english` mode)**: Structures, standardizes, and sharpens messy colloquial inputs before sending to the AI (enable via `/lingual english`; defaults to English, or set `promptLang: "native"` and stack `promptRule` constraints in `~/.pi/agent/lingual.json`).
- **N-Choice Prompt Selector (`select` mode)**: Generates $N$ candidate optimized prompts across customizable `promptSlots` (default: *Concise* / *Structured* / *Deep Rigor*) so you can pick `[1]~[3]` from a popup menu or press `[0]` / `Esc` to send your original text (enable via `/lingual select`).
- **Dual-Engine Customization (`lingual-tuner` Quick Index)**: Added a direct `Action ➔ JSON Key` quick-reference table at the top of `skills/lingual-tuner/SKILL.md` so your Agent can immediately configure either Companion Mode (`slots`) or Prompt Optimizer Mode (`promptLang`, `promptRule`, `promptSlots`) from plain natural language.
- **Zero-Context `off` Mode**: Switching to `/lingual off` stops input hooks and actively strips the `lingual-tuner` skill block from `systemPrompt` via `before_agent_start` for 0-token overhead.
