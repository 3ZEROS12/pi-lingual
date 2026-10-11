# Changelog

## 0.4.4

- **Direct Prompt Rewrite (`english` mode)**: Upgraded from literal translation to a focused Prompt Optimizer — structures, standardizes, and sharpens messy colloquial inputs for maximum coding efficiency (defaults to English, or set `promptLang: "zh"` / `"native"` + custom `promptRule`).
- **N-Choice Prompt Selector (`select` mode)**: Generates $N$ candidate optimized prompts across customizable `promptSlots` (default: *Concise* / *Structured* / *Deep Rigor*) so you can pick the best one to send.
- **High-Freedom Dual-Engine Customization (`lingual-tuner`)**: Tell your Agent in plain language to customize either Companion Mode (`slots`) or Prompt Optimizer Mode (`promptSlots`, `promptLang`, `promptRule`).
- **Active 0-Token Context Shield (`off` mode)**: Switching to `off` actively strips the extension's skill block from `systemPrompt` (`0.00 bytes` of LLM context overhead).
