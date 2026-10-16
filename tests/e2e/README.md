# pi-lingual E2E Acceptance Testbed (`tests/e2e/`)

This directory houses the real-model end-to-end acceptance tests for `pi-lingual`.
It validates the real LLM output quality, prompt compilations, Tuner schema synthesis, clipboard redirection, and terminal visuals.

## Why `*.e2e.ts`?
These files end in `*.e2e.ts` (not `*.test.ts`) so they are **completely decoupled from `npm test`** and will **never break offline CI or GitHub Actions runners**.

## How to Run

1. Ensure `pi` CLI is installed and configured with a working model provider (`pi --version`).
2. Run the acceptance suite:

```bash
PI_LINGUAL_E2E=1 npm run e2e
```

To include full agent disk-writing loop tests:

```bash
PI_LINGUAL_E2E=1 PI_LINGUAL_E2E_FULL=1 npm run e2e
```

When `PI_LINGUAL_E2E` is not set or when `pi` is offline, all lanes skip gracefully without failing.

## Acceptance Lanes

| Lane | Target | File | Assertions Checked |
| :--- | :--- | :--- | :--- |
| **L1** | **Logical Spec** | `quality.e2e.ts` | 100% imperative verb start, 0 kill-list buzzwords, 0 Chinese residue, 100% verbatim code/path retention |
| **L2** | **Live Flow** | `quality.e2e.ts` | 100% profanity & emotional heat preserved, surgical syntax fixes, no academic vocabulary leap, takeaway diffs |
| **L3** | **Companion** | `quality.e2e.ts` | Dual-register differentiation (Jaccard similarity $\le 0.7$ between spoken and written) |
| **L4** | **Tuner Loop** | `tuner.e2e.ts` | Real LLM config schema synthesis, valid JSON output, seamless registration into live CLI |
| **L5** | **Clipboard** | `clipboard.e2e.ts` | Windows PowerShell clipboard pipeline, Conventional Commits format, $\le 72$ chars first line |
| **L6** | **Visuals** | `visual.e2e.ts` | Terminal box model stability, no CJK border tears, graceful ultra-narrow degradation |
| **L7** | **Cold Boot** | `coldboot.e2e.ts` | 9-language zero-prompt boot, native status badge, 0-write disk hygiene |
| **L8** | **Suppression** | `coldboot.e2e.ts` | 1-time release banner suppression on repeat boots, persistent config adherence |

## Note on Shield & Tuner
In interactive mode, `pi-lingual`'s Context Shield strips the `lingual-tuner` skill block to conserve tokens, only exposing it when armed via `/lingual tuner`.
L4a directly tests schema generation and contract adherence, while L4b tests the complete agent configuration pipeline in an isolated sandbox.
