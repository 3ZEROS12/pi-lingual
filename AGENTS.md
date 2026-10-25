# PI-LINGUAL AGENTS FIRMWARE

## 1. Package Metadata & Paths
- **Package**: `pi-lingual` | **Entry**: `dist/extension.js` (`src/extension.ts`)
- **Config**: Single source of truth at `~/.pi/agent/lingual.json` (legacy `settings.json` is read-only migration fallback).

## 2. Package Invariants
- **Language Surface Parity**: All supported codes (`zh, tw, ja, ko, en, es, fr, de, ru`) switchable via `/lang`; zero Chinese residue (`[\u4e00-\u9fa5]`) when `sourceLang !== "zh"`.
- **Declarative Mode State Machine**: Runtime behavior derives from `modes: CustomModeConfig[]` (`flow`, `action`, `hud`, `target`, `killList`) in `lingual.json`; never hardcode mode logic.
- **Three-Core Factory Defaults**: `[1] companion` (pass-through + tree HUD), `[2] direct` (transform + preview HUD), `[3] live-flow` (proofread + takeaway HUD), and `[0] off` (0 pixels/tokens).
- **Dynamic Variable Interpolation & Linguistic Profiles**: Dynamic interpolation of `${sourceLang}`, `${targetLang}`, `${explainLang}`; inject decoupled language profiles (`en`, `zh`, `ja`).
- **Anti-AI Buzzword Blacklist**: Automatically inject `DEFAULT_KILL_LIST` (`delve, tapestry, seamless, robust, enhance, streamline...`) across all compiler targets.
- **Zero-Config Cold Boot**: Cold-start sniffs locale in-memory with zero prompts; 0 disk writes except delivery-gated `lastSeenVersion` after banner render.
- **Super-Command `/lingual` & `/l`**: Parameterless opens mode picker; bare numerals resolve positionally within `1..activeModes.length`; target-language prompts auto-bypass at 0ms.
- **3-Second Glanceability & Kinetic Budget**: HUD feedback cards render diff + native takeaway; layout strictly `<= 9` lines across all terminal widths.
- **Concurrency Micro-Staggering & Adaptive Reasoning**: Stagger background companion calls by 80ms; reasoning defaults to `low` (~200ms latency), configurable per mode or via `/lingual reasoning`.
- **Mode Lock Sovereignty (`/lingual lock`)**: Active mode is strictly user-sovereign; agents must never mutate `mode` or `activeModeId` in response to conversation requests.
- **Delivery-Gated Release Banner**: One-time `aboveEditor` banner on `CURRENT_FEATURE_BANNER_VERSION` bump; sizes via `getBannerMaxCols() = columns - 2`; normalizes mode via `normalizeActiveModeId()`.

## 3. Verification Commands
- `npm test` (or `node ../.scripts/fleet.mjs test pi-lingual`)
- `npm run build`
- `npm run typecheck`
- `node ../.scripts/fleet.mjs docs pi-lingual`
