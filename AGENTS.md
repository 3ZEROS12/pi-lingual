# SYSTEM CONTEXT & OPERATIONAL PROFILE: PI-LINGUAL

## 1. Domain & Runtime Environment (RFC 2119)
- **Package / Target**: `pi-lingual` (v0.6.0)
- **Primary Domain**: Universal bilingual developer companion & declarative prompt optimizer for AI coding agents (Claude Code, Cursor, Aider, Pi).
- **Runtime & Toolchain**: Node.js `>=22.19.0` / TypeScript Strict / tsup (dual ESM+CJS+DTS) / native Node test runner.
- **Extension Entry**: `dist/extension.js` (authored in `src/extension.ts`).
- **Configuration Path**: Single Source of Truth at `~/.pi/agent/lingual.json` (legacy `settings.json` is strictly read-only migration fallback).

---

## 2. Core Operational Invariants (Strict RFC 2119)

### Invariant 1: Universal English Baseline & Symmetric Polyglot Parity (Zero Chinese Residue)
- All generic source files, type definitions, system prompts, error messages, and documentation defaults MUST strictly default to **Universal English**.
- All supported languages (English, Japanese, Chinese, Spanish, French, German, Korean) enjoy **100% symmetric, first-class status**.
- Generic code, default parameter fallbacks, and prompt templates MUST NEVER assume the user speaks Chinese, types Chinese, or is translating into English.
- When `sourceLang !== "zh"` (e.g. `en ⇄ zh`, `en ⇄ ja`, `es ⇄ en`):
  - UI chrome, status badges, prompts, and notifications MUST contain **ZERO Chinese characters (`[\u4e00-\u9fa5]`)**.
  - All developer-facing comments across `src/**/*.ts` MUST be authored 100% in pure English.
- **Language Surface Parity (RFC 2119)**: Every code listed in `SUPPORTED_LANG_CODES` (`zh, tw, ja, ko, en, es, fr, de, ru`) MUST be switchable through `/lang` and the release banner. Advertising a language while rejecting it at `/lang` is FORBIDDEN. Codes without a dedicated chrome preset fall back to the Universal English baseline (`tw` intentionally reuses the Chinese chrome baseline).

### Invariant 2: Mode as Configuration (Declarative State Machine Architecture)
- The entire extension operates on a declarative `modes: CustomModeConfig[]` pipeline stored in `~/.pi/agent/lingual.json`.
- Hardcoding mode behavior (`if (mode === "original")`) is STRICTLY PROHIBITED in core engines. All runtime behavior MUST be derived from mode properties:
  - `flow`: `"translate"` (input `${sourceLang}` ➔ output `${targetLang}`), `"proofread"` (input `${targetLang}` ➔ output `${targetLang}`), or `"custom"`.
  - `action`: `"transform"` (in-place prompt rewrite), `"pass-through"` (0ms raw send to agent), or `"select"` (1..N interactive hotkey picker).
  - `hud`: `"preview"` (compact single-line preview), `"adaptive-takeaway"` (short: fixed+takeaway, long: diffs only), `"tree"` (Trifecta left-rail tree branch), or `"none"`.
  - `target`: `"agent"` (sent directly to coding agent) or `"clipboard"` (copied to system clipboard with 0 prompt mutation).
  - `killList`: string array of blacklisted AI clichés (`delve`, `tapestry`, `seamless`, `robust`, etc.).

### Invariant 3: Three-Core Factory Golden Defaults
Out of the box, `pi-lingual` ships with exactly three golden baselines (with `0 Off`):
1. **[1] Companion (`companion` / `original`)**: `action: "pass-through"`, `hud: "tree"` — raw text sent at 0ms while the bilingual card renders above the editor. This is the factory default mode for a fresh install.
2. **[2] Logical Spec (`direct` / `lazy`)**: `action: "transform"`, `hud: "preview"` — imperative engineering specs.
3. **[3] Live Flow (`live-flow` / `raw`)**: `flow: "proofread"`, `hud: "adaptive-takeaway"` — profanity/heat preserved, i18n takeaway diffs.
4. **[0] Off (`off`)**: 0 pixels, 0 listeners, 0 tokens.

### Invariant 4: Dynamic Semantic Variable Interpolation (`${sourceLang}`, `${targetLang}`, `${explainLang}`)
- All mode instructions, slot descriptions, and prompt templates MUST use semantic variables rather than hardcoded language names:
  - `${sourceLang}`: User's input/native language (e.g. `Chinese`, `Japanese`, `English`).
  - `${targetLang}`: Target foreign/AI language (e.g. `English`, `Japanese`, `Spanish`).
  - `${explainLang}`: Cognitive explanation language for takeaway diffs.
- These variables MUST be interpolated dynamically on-the-fly during prompt compilation.

### Invariant 5: Target-Language Linguistic Profiles (Decoupled Pragmatics)
- Prompt rules MUST NOT assume English grammar quirks when the target language is not English.
- The prompt compiler MUST dynamically attach target language profiles:
  - If `targetLang === "en"`: focus on prepositions (`on X`), articles, tense consistency, and casual casing tolerance (`l vs L`).
  - If `targetLang === "zh"`: eliminate English-style stacked relative clauses, trim redundant pronouns (他/它/这), fix measure words, and distinguish client honorifics (您/贵团队).
  - If `targetLang === "ja"`: fix particles (`は/が/を/に/で`), and maintain consistency between plain and polite forms (`です・ます / 敬語`).

### Invariant 6: Anti-AI Buzzword Blacklist (`DEFAULT_KILL_LIST`)
- All prompt compiler targets MUST automatically inject the Kill List to ban empty AI clichés:
  `delve, tapestry, seamless, seamlessly, robust, enhance, streamline, comprehensive, in summary, game-changer, revolutionize, unleash, thrilled to announce, pivotal, holistic, multifaceted`.
- Transformed outputs must sound like authentic, grounded, human software engineers.

### Invariant 7: Zero-Config Cold Boot (Detected Pair, Zero Writes)
- On fresh installs without an existing `~/.pi/agent/lingual.json`, `session_start` sniffs the native OS locale and activates the language pair purely in-memory with zero interactive prompt dialogs (`ui.input` is never called).
- The language pair is displayed uniformly in clean abbreviated notation (`zh ⇄ en`, `ja ⇄ en`).
- The active mode defaults cleanly to `companion` (pass-through + Left-Rail bilingual card).
- Zero-Disk-Write Contract: The configuration file on disk is left untouched unless the developer explicitly mutates settings (via `/lang`, `/lingual`, `/slots`, or `lingual-tuner`). The only key written on cold boot is `lastSeenVersion` (gated upon successful delivery of the feature banner). The legacy `configured` flag is no longer written.

### Invariant 8: Single Super-Command Architecture & Interactive Capsule Picker
- Registered first-class commands (strictly 2 in Pi global namespace):
  - `/lingual`: Parameterless call opens the interactive capsule mode picker (`openModePicker`); bare numerals (`1|2|3|0`) or IDs switch mode instantly; routes subcommands (`/lingual on|off`, `/lingual lang`, `/lingual last|replay`, `/lingual compact`, `/lingual reasoning`, `/lingual mode`, `/lingual loadout`, `/lingual lock`, `/lingual status`).
  - `/l`: Ultra-short 1st-class alias for `/lingual`.
- Subcommand matrix:
  - `/lingual on` / `/lingual off`: Quick enable/disable companion mode.
  - `/lingual lang <code|pair>`: Switch language pair (e.g. `/lingual lang ja en`).
  - `/lingual last` / `/lingual replay`: Replay previous companion/takeaway card.
  - `/lingual reasoning [low | medium | high]` (and alias `/lingual effort`)
  - `/lingual mode [list | add <id> <name> | rm <id> | toggle <id> | reset]`
  - `/lingual loadout [list | apply <spec|commit|oss|yap>]`
  - `/lingual lock` / `/lingual unlock`
- **Positional Numeral Resolution (RFC 2119)**: Bare numerals (`/lingual 1|2|3`) ALWAYS resolve positionally within `1..activeModes.length` from the live registry. `MODE_ALIAS_MAP` serves strictly as out-of-bounds legacy fallback; factory seeds MUST NEVER hardcode numeral aliases.
- **Smart Target-Language Auto-Bypass (RFC 2119)**: When the user authors directly in the target language (e.g. English in `zh ⇄ en`), the sensor automatically passes through at 0ms without redundant translations or token waste. In direct spec mode, prompts starting with active verbs (`Fix`, `Add`, `Refactor`) bypass immediately.

### Invariant 9: 3-Second Glanceability & Kinetic Budget Guard
- HUD feedback cards MUST follow the 3-second glanceability rule:
  - Left side: concise diff (`before ➔ after`).
  - Right side: short, grounded intuition in native tongue (`<= 10` words/characters).
- Card layouts MUST NOT exceed 9 lines under any terminal column width (mathematically immune to host widget truncation warnings).

### Invariant 10: Multi-Probe Test Isolation Sandbox
- All configuration loaders and writers MUST detect test environments via multi-probe inspection (`NODE_TEST_CONTEXT`, `process.execArgv`, npm lifecycle events) and strictly avoid reading from or writing to the user's real host files (`~/.pi/agent/lingual.json`, `settings.json`).

### Invariant 11: Concurrency Micro-Staggering & Adaptive Reasoning Effort
- In `pass-through` mode, background companion calls MUST be staggered by `80ms` (`setTimeout(..., 80)`) so the host session's primary prompt completes socket handshakes first.
- Model completers MUST default to `reasoning: "low"` for baseline daily utility (~200-300ms latency) while allowing `"medium"` (or user-configured `reasoning`) for complex structural loadouts like `spec` (Brain-Dump to Spec).
- Reasoning effort is dynamically resolved per mode (`activeMode.reasoning ?? config.reasoning ?? "low"`) and customizable on the fly via `/lingual reasoning <low|medium|high>`.

### Invariant 12: Strict Working Mode Lock & Zero-Drift Guardrail (`/lingual lock`)
- The active mode in `lingual.json` is strictly user-sovereign.
- Coding Agents are STRICTLY FORBIDDEN from mutating the active `"mode"` or `"activeModeId"` in `~/.pi/agent/lingual.json` in response to conversational requests (e.g. "be direct", "simplify", "rewrite this").
- When `modeLocked: true` is enabled via `/lingual lock`, unparameterized mode cycling is blocked and external processes cannot override the developer's chosen mode.

### Invariant 13: One-Time Localized `aboveEditor` Release Banner
- Substantive feature upgrades surface a one-time localized release banner (`aboveEditor`) on `session_start` tracking `CURRENT_FEATURE_BANNER_VERSION` ("0.6.0").
- Aesthetics follow `notes/` style: clean open-tree typography (`· / ┌ / │ / ├ / └`), single uniform color (`fg("muted", line)` across all lines), zero emojis, and zero apologies.
- Dismisses automatically on the user's first input turn and persists `lastSeenVersion` to `lingual.json` to prevent repeated prompts.
- **Delivery-Gated Persistence (RFC 2119)**: `lastSeenVersion` MUST only be written after `ui.setWidget` physically accepted the banner. A stale context or host-rejected render MUST leave the notification unburned so it reappears on the next cold boot.
- **Borderless Banner Geometry (RFC 2119)**: The banner MUST size itself with `getBannerMaxCols()` (full terminal width minus a 2-column margin), NEVER the HUD card reserve (`columns - 8`) which is reserved for box-bordered cards. Self-check: at `COLUMNS=80` all 9 languages render 8 lines with ZERO `...` clipping.
- **Persisted-Mode Truthfulness (RFC 2119)**: After `session_start` resolves the mode registry, `state.mode` MUST be normalized through `normalizeActiveModeId()` so the footer badge, the active mode registry entry, and the persisted `mode`/`activeModeId` can never disagree.

---

## 3. Physical Verification & Build Commands

- **Run Physical Test Suite**:
  ```bash
  npm test
  # or from workspace root: node .scripts/fleet.mjs test pi-lingual
  ```
  *Executes 197 test suites covering banner geometry, cache, chunker, commands, engine, layout, modes, mode-picker, sensor, prompts, sanitizer, shield, slots, sovereignty, and sandboxed cold-boot upgrades (100% green).*

- **Build Distribution Bundles**:
  ```bash
  npm run build
  # compiles dist/extension.js, dist/index.js, dist/*.cjs, and .d.ts files via tsup
  ```

- **Run Strict Type Check**:
  ```bash
  npm run typecheck
  ```

- **Run Documentation Linter**:
  ```bash
  node ../.scripts/fleet.mjs docs pi-lingual
  ```
