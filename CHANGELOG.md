# Changelog

## 0.6.0

- **Three-Core Factory Defaults**: the registry now ships `companion` (pass-through + bilingual card) alongside `Logical Spec` and `Live Flow`, so the 5-second-gap companion experience from the project's origin story works on a fresh install. Bar numerals resolve positionally from the active registry, and the release banner names each shipped mode.
- **Mode as Configuration (模式即配置 · Declarative Architecture)**:
  - Transitioned the entire extension architecture from hardcoded mode conditionals into a user-governed declarative state machine engine (`CustomModeConfig`).
  - Modes, actions (`pass-through`, `transform`, `select`), HUD styles (`preview`, `adaptive-takeaway`, `tree`, `none`), flow directions (`translate`, `proofread`, `custom`), output targets (`agent` vs `clipboard`), and prompt slots are 100% defined and persisted in `~/.pi/agent/lingual.json`.
- **Three-Core Golden Defaults (`companion` + `direct` + `live-flow`)**:
  - Ships with three factory golden defaults out of the box (plus off):
    1. **`companion` (Companion / 纯伴学)**: 0ms raw prompt pass-through with rich Left-Rail bilingual card rendered above editor (`action: "pass-through"`, `hud: "tree"`).
    2. **`direct` (Logical Spec / 规范直发)**: Imperative engineering prompt structuring on Enter (`action: "transform"`, `hud: "preview"`).
    3. **`live-flow` (Live Flow / 实战狂飙)**: Direct foreign language drafting with zero tone sanitization, i+1 anti-level-leap, and adaptive takeaway diffs (`action: "transform"`, `hud: "adaptive-takeaway"`).
    4. **`off` (已关闭)**: 0 pixels, 0 listeners, 0 tokens.
- **Tactical Loadouts Catalog (`spec`, `commit`, `oss`, `yap`)**:
  - Introduced four pre-configured tactical loadouts accessible via `/lingual loadout apply <id>`:
    1. **`spec` (Brain-Dump to Spec · 脑暴压铸)**: Casts messy thoughts into strict Objective, Constraints, Edge Cases, and Do Not Touch modules for agent plan mode (`target: "agent"`).
    2. **`commit` (Commit Dehydrator · 提交脱水)**: Generates strict Conventional Commits format with strong imperative verbs, Root Cause & Impact body (`target: "clipboard"`).
    3. **`oss` (OSS Peer Comms · 开源对线)**: Transforms blunt critiques into objective, peer-level GitHub comments using maintainer idioms (`nit:`, `under contention`, `race condition`) (`target: "clipboard"`).
    4. **`yap` (Indie Shipper · 极客发推)**: Cold, high-density Indie Hacker tech post (<280 chars) with 0 emojis, 0 corporate marketing hype (`target: "clipboard"`).
- **Output Stream Diversion (`target: "agent" | "clipboard"`)**:
  - Transformed outputs can target the AI coding agent directly or copy seamlessly to system clipboard in 0ms (with zero prompt mutation and a clean HUD toast), ready for `Ctrl+V` into browser, GitHub, or X.
- **Anti-AI Buzzword Blacklist (`Kill_List` · 绝对禁区)**:
  - Added `DEFAULT_KILL_LIST` and mode-level `killList` to strictly ban empty AI clichés: `delve`, `tapestry`, `seamless`, `seamlessly`, `robust`, `streamline`, `comprehensive`, `enhance`, `thrilled to announce`, `game-changer`, etc.
- **Target-Language Linguistic Profiles (Decoupled Pragmatics)**:
  - Eliminated English-only assumptions. The proofreading and prompt compiler dynamically attaches linguistic profiles for English, Chinese, Japanese, and other target languages.
- **Dynamic Semantic Variable Interpolation (`${sourceLang}`, `${targetLang}`, `${explainLang}`)**:
  - Eliminated all hardcoded Sino-centric or English-only assumptions from generic prompt templates. Prompt slots dynamically expand variables into the user's active native language, target foreign language, and cognitive explanation language.
- **Zero-Config Cold Boot (Detected Pair, Zero Writes)**:
  - On fresh installs without an existing `lingual.json`, `session_start` auto-detects the native OS locale without interactive prompts or popups.
  - The language pair is activated purely in-memory (abbreviated `zh ⇄ en`, `ja ⇄ en`), defaulting cleanly to `companion` mode.
  - The configuration file is left untouched on cold boot until the developer explicitly customizes settings via `/lang`, `/lingual`, `/slots`, or `lingual-tuner`. The legacy `configured` flag is no longer written.
- **Programmatic Mode CRUD API & Geek CLI Commands (`/lingual mode`, `/lingual loadout`)**:
  - Implemented typed, immutable helper functions (`addCustomMode`, `removeCustomMode`, `updateCustomMode`, `toggleCustomMode`, `addSlotToMode`, `removeSlotFromMode`).
  - Added CLI management commands: `/lingual mode [list | add | rm | toggle | reset]` and `/lingual loadout [list | apply <id>]`.
- **Upgraded S-Tier Bilingual Prompt Architect (`lingual-tuner` Skill)**:
  - Rebuilt with a 4-slot loadout anatomy (`[Input]`, `[Transform]`, `[Kill_List]`, `[HUD]`), the 3-second glanceability rule, and symmetric polyglot scenarios (e.g. English founder reaching Chinese clients on WeChat vs Enterprise).
- **Backward Compatibility Bridge**:
  - Automatically maps legacy `lingual.json` configs lacking a `modes` array into virtual modes in-memory with zero breaking changes or data loss.
- **Pre-Release Hardening (verified against sandboxed cold-boot upgrades)**:
  - **Zero clipping at 80 columns**: the banner reserves 2 columns instead of the 8 reserved for box-bordered HUD cards. The previous budget clipped the tail of 8 of 9 localized banners with `...` on a standard 80-column terminal.
  - **Closed parentheses on narrow terminals**: hard-clipped lines now close the bracket they opened instead of leaving it dangling.
  - **Restored language surface (`es` / `fr` / `de` / `ko` / `ru`)**: the declarative refactor pruned five native chrome presets while `/lang`, the help text, the README matrix, and the 9-language banner kept advertising them. All nine advertised codes are switchable again, and `zh_TW` / `zh-Hant` locales resolve to Traditional Chinese copy.
  - **Zero-config cold boot**: auto-detects OS locale and pairs in-memory without interactive prompts; writes zero config to disk until explicitly customized.
  - **Delivery-gated banner**: `lastSeenVersion` is written only after the host accepted the banner widget, so a rejected render is retried on the next cold boot.
  - **Preserved user modes**: a mode entry without a `slots` array is normalized instead of being dropped, which previously reset a customized registry back to factory defaults.
  - **Honest footer badge**: the status badge now summarises the active mode's slots, and custom-mode lookups prefer the in-memory registry over a synchronous disk read on every update.
  - **Clipboard durability**: every clipboard writer attaches a stdin error handler, so a missing `wl-copy` on Linux can no longer surface an unhandled `EPIPE`.

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
