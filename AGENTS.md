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

### Invariant 2: Mode as Configuration (Declarative State Machine Architecture)
- The entire extension operates on a declarative `modes: CustomModeConfig[]` pipeline stored in `~/.pi/agent/lingual.json`.
- Hardcoding mode behavior (`if (mode === "original")`) is STRICTLY PROHIBITED in core engines. All runtime behavior MUST be derived from mode properties:
  - `flow`: `"translate"` (input `${sourceLang}` ➔ output `${targetLang}`), `"proofread"` (input `${targetLang}` ➔ output `${targetLang}`), or `"custom"`.
  - `action`: `"transform"` (in-place prompt rewrite), `"pass-through"` (0ms raw send to agent), or `"select"` (1..N interactive hotkey picker).
  - `hud`: `"preview"` (compact single-line preview), `"adaptive-takeaway"` (short: fixed+takeaway, long: diffs only), `"tree"` (Trifecta left-rail tree branch), or `"none"`.
  - `target`: `"agent"` (sent directly to coding agent) or `"clipboard"` (copied to system clipboard with 0 prompt mutation).
  - `killList`: string array of blacklisted AI clichés (`delve`, `tapestry`, `seamless`, `robust`, etc.).

### Invariant 3: Dual-Core Factory Golden Defaults
Out of the box, `pi-lingual` ships with exactly two golden baselines (with `0 Off`):
1. **`[1] Logical Spec` (`direct` / `lazy`)**: Transforms raw thoughts from `${sourceLang}` into imperative, unambiguous `${targetLang}` engineering specifications for AI coding agents.
2. **`[2] Live Flow` (`live-flow` / `raw`)**: Direct foreign language drafting in `${targetLang}`. Surgically patches typos, prepositions, and syntax; 100% preserves passion and profanity (`fuck`, `suck`, `shit`); provides `${explainLang}` takeaway diffs.
3. **`[0] Off` (`off`)**: 0 pixels, 0 listeners, 0 tokens (completely detached).

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

### Invariant 7: First-Run Language Handshake (Cold-Boot Zero Residue)
- When installed on a fresh machine without an existing `lingual.json`, `session_start` sniffs the native OS locale and presents an ephemeral pre-filled input (e.g. `zh en` or `ja en`).
- Upon pressing Enter, the handshake immediately unmounts, restoring a pristine terminal screen with **0 visual residue**, writes to `~/.pi/agent/lingual.json`, and permanently freezes so it never prompts again.

### Invariant 8: Streamlined Command Matrix & Tactical Loadout CLI
- Registered first-class commands:
  - `/lingual`: Cycle modes, jump directly by ID/number, or route subcommands (`/lingual reasoning`, `/lingual tuner`, `/lingual mode`, `/lingual loadout`, `/lingual lock`).
  - `/lang`: Switch language pair (`/lang <code|pair>`).
  - `/slots`: Inspect or customize companion & prompt slots (`/slots [add|rm|toggle|reset]`).
  - `/last`: Replay last companion/takeaway card.
- Direct mode & loadout management commands:
  - `/lingual reasoning [low | medium | high]` (and alias `/lingual effort`)
  - `/lingual mode [list | add <id> <name> | rm <id> | toggle <id> | reset]`
  - `/lingual loadout [list | apply <spec|commit|oss|yap>]`
  - `/lingual lock` / `/lingual unlock`

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

---

## 3. Physical Verification & Build Commands

- **Run Physical Test Suite**:
  ```bash
  npm test
  # or from workspace root: node .scripts/fleet.mjs test pi-lingual
  ```
  *Executes 111 test suites verifying cache, chunker, commands, engine, layout, modes, prompts, sanitizer, shield, slots, and sovereignty (100% green).*

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
