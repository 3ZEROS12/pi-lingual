# Changelog

## 0.5.0

- **Direct Prompt Rewrite (`english` mode)**: Upgraded from literal translation to a focused Prompt Optimizer — structures, standardizes, and sharpens messy colloquial inputs before sending to the AI (enable via `/lingual english`; defaults to English, or set `promptLang: "native"` and stack `promptRule` constraints in `~/.pi/agent/lingual.json`).
- **N-Choice Prompt Selector (`select` mode)**: Generates $N$ candidate optimized prompts across customizable `promptSlots` (default: *Concise* / *Structured* / *Deep Rigor*) so you can pick `[1]~[3]` from a popup menu or press `[0]` / `Esc` to send your original text (enable via `/lingual select`).
- **Dual-Engine Customization (`lingual-tuner` Quick Index)**: Added a direct `Action ➔ JSON Key` quick-reference table at the top of `skills/lingual-tuner/SKILL.md` so your Agent can immediately configure either Companion Mode (`slots`) or Prompt Optimizer Mode (`promptLang`, `promptRule`, `promptSlots`) from plain natural language.
- **Zero-Context `off` Mode**: Switching to `/lingual off` stops input hooks and actively strips the `lingual-tuner` skill block from `systemPrompt` via `before_agent_start` for 0-token overhead.
