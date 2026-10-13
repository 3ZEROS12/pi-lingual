# SYSTEM CONTEXT & OPERATIONAL PROFILE: PI-LINGUAL

## 1. Domain & Runtime Environment (RFC 2119)
- **Package / Target**: `pi-lingual` (v0.3.10)
- **Primary Domain**: Zero-friction developer translator & dual-register language companion (Spoken vs Written) for AI coding agents.
- **Runtime & Toolchain**: Node.js v20+ / TypeScript Strict / tsup (dual ESM+CJS+DTS) / native Node test runner.
- **Extension Entry**: `dist/extension.js` (authored in `src/extension.ts`).
- **Configuration Path**: `~/.pi/agent/settings.json` under `"pi-lingual"` block.

---

## 2. Core Operational Invariants (RFC 2119)

### Invariant 1: Primary Language Sovereignty (Zero Chinese Residue)
- When the user selects native language A (`sourceLang`, e.g. English, Japanese, Spanish, German, French), Language A MUST completely replace all Chinese text in the UI chrome.
- All user-facing strings (notifications, status badges, command descriptions, diagnostic reports) MUST be dynamically derived from `resolveLabelsForLang(sourceLang)` in `src/presets.ts`. Hardcoding static English or Chinese fallback strings in runtime code is STRICTLY FORBIDDEN.

### Invariant 2: Zero-Source-Mutation Configuration
- Standard language switching (`zh`, `ja`, `en`, `es`, `fr`, `de`) MUST take effect immediately and in-place without editing source files or restarting the host terminal, writing preferences directly to `~/.pi/agent/settings.json`.
- Modifying project source files merely to switch runtime languages is STRICTLY PROHIBITED.

### Invariant 3: Duality Schema & Native Nuance Anchoring
- The translation engine MUST enforce strict JSON formatting containing:
  - `spoken`: Colloquial oral target language B.
  - `spoken_meaning`: Exact colloquial nuance in native language A.
  - `written`: Formal architecture-grade written target language B.
  - `written_meaning`: Exact formal technical nuance in native language A.
  - `vocab`: Inline horizontal stream of extracted terms and collocations.
- The `[CODE & SYMBOL SHIELD]` rule MUST bypass pure shell commands, Markdown code blocks, and data structures with 0ms latency and 0 token burn.

### Invariant 4: Proficiency-Adaptive Vocabulary & Single-Line Clamping
- The translation system prompt MUST adapt vocabulary depth to the user's proficiency tier (extracting tricky phrasal verbs for intermediate tiers, and high-register idioms for advanced tiers).
- To preserve vertical terminal space, vocabulary terms MUST be clamped to a single horizontal inline stream (`term (definition) · term2 (definition)`). Multi-line vertical expansions for vocabulary are FORBIDDEN.

### Invariant 5: Command Bus Ergonomics & Master Dispatcher
- Natural short commands MUST register as first-class standalone commands: `/lang`, `/compact`, `/last`, `/status`.
- The master command (`/lingual`) MUST implement secondary routing (`masterCommandHandler`). Subcommands (`lang`, `model`, `compact`, `status`, `last`, `slots`) MUST NEVER fall through into the default mode-cycling branch.
- Language normalization MUST accept natural language aliases (`japanese`/`jp`/`日语` ➔ `ja`, `chinese`/`cn`/`中文` ➔ `zh`) and language pair syntax (`/lang zh ja`).

### Invariant 6: Deterministic UI Feedback & Concurrency Micro-Staggering
- On new user input in `original` mode, the previous HUD widget MUST be dismissed immediately (`ctx.ui.setWidget("lingual_hud", undefined)`) and status updated to `polishing...`.
- In `original` mode, background translation calls MUST be staggered by 80ms (`setTimeout(..., 80)`) to allow the host session's primary prompt to complete socket handshakes first.
- Model completers MUST specify `reasoning: "low"`, constraining background generation to tight ~100-token bursts completed in 200–300ms.

### Invariant 7: Multi-Probe Test Isolation Sandbox
- Configuration loaders (`loadUserLingualConfig`) and writers (`saveUserLingualConfig`) MUST detect test environments via multi-probe inspection (`NODE_TEST_CONTEXT`, `process.execArgv`, npm lifecycle events) and strictly avoid touching user settings files during tests.

### Invariant 8: Sincere, High-Desire Documentation Standard (RFC 2119)
- **10-Second Desire Funnel**: Screen 1 MUST display a 1-sentence punchy tagline, clean visual asset, and 1-line installation command (`pi install npm:pi-lingual`).
- **Short, Punchy Sentences**: Sentences in `README.md` and `README_zh.md` MUST be concise and sincere. Compound run-on sentences with convoluted academic clauses are STRICTLY FORBIDDEN.
- **The 4-Row Action Matrix**: Modes and workflows MUST be summarized in a crisp table:
  $$\text{Mode / Action} \mid \text{What You Input} \mid \text{What the Engine Does} \mid \text{What You See} \mid \text{When to Use}$$
- **Friction Breakers**: Preemptively explain why code/stack traces remain untouched (`Hybrid Intent Grafting`), why no extra tokens pollute chat history, and why latency is zero.
- **Zero Terminology Inflation**: Never brand ordinary 20-line functions as capitalized buzzwords ("Shield", "FSM", "Sovereignty"). Use real, standard engineering terms (Input Event Hook, UAX #11 Box Model, AbortController, LRU Cache).
- **Zero Volatile Model/Tech Name-Dropping**: Never sprinkle specific, fast-changing external model tags (e.g. Claude 3.5 Sonnet, GPT-4) without up-to-the-minute research. Prefer functional categories ("high-tier reasoning models vs. lightweight models") and generic command placeholders (`<model-id>`). Evergreen docs age gracefully.
- **Rich, Self-Contained Storefront over Hollow Fragmentation**: The main README MUST be rich, substantive, and high-desire. Never hollow out the main page into a bare-bones skeleton by scattering core user values and engineering designs into sub-files. Exhaustive proofs belong in `docs/architecture.md`, but the main page must stand completely self-contained.

### Invariant 9: Universal Dynamic Slot Pipeline & Agent Clarification Mandate (RFC 2119)
- **Universal English Baseline & Dynamic Language Mirroring**:
  - The default international baseline for prompts, templates, and Agent clarification questions MUST be in universal English.
  - When communicating with the user, the Agent MUST dynamically mirror the user's active session language:
    - If the user interacts in English (or indeterminate default), the Agent MUST query in English;
    - If the user interacts in Chinese (e.g. `zh ⇄ en`), the Agent MUST mirror in Chinese;
    - If the user interacts in Japanese, the Agent MUST mirror in Japanese.
- **All Slots Are First-Class & Fully Movable (Including `source`)**:
  - The `source` (original text) slot is NOT a permanent immutable header.
  - If a user prefers not to display the source text row (to conserve terminal height or focus purely on translations), the Agent MUST respect that choice. The slot can be removed via `/slots rm source`, `removeSlotFromList(slots, "source")`, or by omitting the `{ role: "source" }` entry from `~/.pi/agent/lingual.json`. The layout engine MUST gracefully render translation branches without any orphan source line.
- **Zero Rigid Preset Dogma**:
  - Forcing hardcoded templates (`developer`, `social`, `compact2`) onto users is STRICTLY FORBIDDEN. All slot definitions (`id`, `label`, `role`, `instruction`, `showMeaning`) MUST be customizable and extensible.
- **Mandatory Agent Active Confirmation Protocol**:
  - Whenever a user asks to configure, customize, or set up `pi-lingual`, the Agent MUST actively query and confirm 3 dimensions:
    1. **Desired Slot Count**: How many output slots or lines does the user prefer (e.g. 1-slot minimal translation, 2-slot dual register, 3-slot with twitter/deep)?
    2. **Desired Function & Tone per Slot**: What specific style or role is needed for each slot (e.g. casual Slack, formal RFC/PR, viral tweet, technical insight, vocab)?
    3. **Source Text Row Retention**: Crucially ask: **"Do you want to keep the original source text row, or remove it entirely to save terminal vertical space?"**
  - Agents MUST NOT silently inject arbitrary fixed presets without this interactive confirmation.
- **Zero-Friction Agent Execution SOP (Direct Configuration Modification)**:
  - Once the user answers the clarification questions, the Agent MUST directly apply the configuration in a single turn without requiring the user to type manual CLI commands or edit files themselves.
  - The Agent MUST write the customized `slots` array directly to `~/.pi/agent/lingual.json` (Single Source of Truth).
  - **Slot Configuration Interface**:
    ```typescript
    interface SlotConfig {
      id: string;            // Unique identifier, e.g. "source", "spoken", "written", "twitter", "deep"
      label: string;         // Card display label, e.g. "Source", "Spoken", "Written", "Tweet", "Deep"
      role: "source" | "translation" | "vocab" | "custom";
      instruction?: string;  // Explicit LLM translation/style prompt for this slot
      showMeaning?: boolean; // Whether to generate nuance back-translation in user's native language
      enabled: boolean;
    }
    ```
  - **Universal English Template (`~/.pi/agent/lingual.json`)**:
    ```json
    {
      "slots": [
        {
          "id": "source",
          "label": "Source",
          "role": "source",
          "enabled": true
        },
        {
          "id": "spoken",
          "label": "Spoken",
          "role": "translation",
          "instruction": "Natural, fluent spoken flow (daily standup, Slack, agile collaboration). Authentic Silicon Valley flow, natural contractions, idioms.",
          "showMeaning": true,
          "enabled": true
        },
        {
          "id": "written",
          "label": "Written",
          "role": "translation",
          "instruction": "Clear, precise, modern technical written prose (PR descriptions, RFCs, documentation). Plain, active, professional.",
          "showMeaning": true,
          "enabled": true
        }
      ]
    }
    ```
  - **Example: Suppressing Source Text & Customizing Social Tones**:
    If the user chooses to suppress the original text and have Twitter Hook + Technical Insight:
    ```json
    {
      "slots": [
        {
          "id": "twitter",
          "label": "Tweet",
          "role": "translation",
          "instruction": "Punchy opening hook and viral developer tweet under 280 chars with authentic dev slang.",
          "showMeaning": true,
          "enabled": true
        },
        {
          "id": "deep",
          "label": "Deep",
          "role": "translation",
          "instruction": "High-signal architecture reasoning and nuanced technical value.",
          "showMeaning": true,
          "enabled": true
        }
      ]
    }
    ```
    *(Note: omitting `{ role: "source" }` physically eliminates the source line from HUD rendering).*

### Invariant 10: One-Time Localized `aboveEditor` Release Banner for Major Feature Upgrades (RFC 2119)
- Whenever a release introduces substantive user-facing feature upgrades (not minor bugfixes or internal refactoring), the extension MUST bump `CURRENT_FEATURE_BANNER_VERSION` and update `formatReleaseBannerLines` in `src/engine.ts` tailored specifically to the new capabilities.
- **Style & Structure**:
  - **Zero Emojis**: Use clean open-tree branches (`· / ┌ / │ / ├ / └`) with zero decorative emojis.
  - **Voice (`D:/College/docs/notes/` Reference)**: Calm, plain-spoken, candid prose emphasizing human agency and workflow balance.
  - **Parenthetical Mechanism Proof**: Each item MUST include a parenthetical sub-line (`│ (...)`) explaining the exact trigger command and physical implementation mechanism so the user knows how to use it and why it is trustworthy.
- **4-Stage Native Language Detection (`resolveReleaseBannerLang`)**:
  Resolves language via: (1) explicit `lingual.json -> sourceLang`, (2) recent user message scripts in `ctx.sessionManager.getEntries()` / `rpiv-i18n`, (3) OS locale (`Intl`), and (4) universal English (`"en"`) fallback.
- On `session_start` (`event?.reason !== "resume"`), if `diskConfig.lastSeenVersion !== CURRENT_FEATURE_BANNER_VERSION`, the extension renders the banner above the editor (`aboveEditor`), records `lastSeenVersion` in `~/.pi/agent/lingual.json`, and auto-dismisses it on the first user input.

### Invariant 11: Strict Working Mode Lock & Zero-Drift Guardrail (RFC 2119)
- **Active Mode Sovereignty**: The active working mode (`companion` [1] / `direct` [2] / `candidates` [3] / `off` [0]) of `pi-lingual` is user-sovereign.
- **Zero-Drift Prohibition**: Coding Agents are STRICTLY FORBIDDEN from mutating the top-level `"mode"` key in `~/.pi/agent/lingual.json` or executing mode-switching commands in response to general conversational requests (e.g. "be direct", "switch style", "summarize", "simplify").
- **Tuner Scope Isolation**: When customizing prompt slots for Mode 2 (`directSlots`) or Mode 3 (`promptSlots`), Agents MUST preserve the top-level `"mode"` untouched, modifying ONLY the respective slot array.
- **Mode Lock Protection (`/lingual lock`)**: When `modeLocked: true` is configured in `lingual.json` or activated via `/lingual lock`, `pi-lingual` physically blocks unparameterized mode cycling and refuses external disk mode overrides on input events, guaranteeing 100% session mode stability.

---

## 3. Physical Verification & Build Commands

- **Run Physical Test Suite**:
  ```bash
  npm test
  # or from workspace root: node .scripts/fleet.mjs test pi-lingual
  ```
  *Executes 89 test suites verifying cache, chunker, commands, engine, layout, prompts, sanitizer, shield, slots, and sovereignty (100% green).*

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

---

## 4. Architectural Boundaries & Quality Gates

- **Kinetic Line Budget Guard**: Card layouts MUST NOT exceed 9 lines under any column width, mathematically guaranteeing zero host widget truncation warnings.
- **Documentation Linting**: Documentation MUST pass `node .scripts/fleet.mjs docs pi-lingual` with 0 corporate buzzwords, 0 pseudo-contrasts, and 1:1 verified 89/89 test metrics.
