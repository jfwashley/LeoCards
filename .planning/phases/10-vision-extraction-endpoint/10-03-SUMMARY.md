---
phase: 10-vision-extraction-endpoint
plan: "03"
subsystem: client-state
tags: [reducer, fetch, ux, extraction, image-upload]
dependency_graph:
  requires: ["10-01", "10-02"]
  provides: ["imageFlowReducer export", "handleExtract POST", "friendlyErrorCopy", "5 client extraction states"]
  affects: ["src/components/image-upload-flow.tsx", "vitest.config.ts"]
tech_stack:
  added: []
  patterns: ["useReducer spread-and-override", "AbortController timeout", "FileReader data-URL", "per-status friendly copy"]
key_files:
  created: ["src/test-setup.ts"]
  modified: ["src/components/image-upload-flow.tsx", "vitest.config.ts"]
decisions:
  - "Use deck.language directly as targetLanguage (already BCP-47); no DeckOption schema change"
  - "Wrap DeckSwitcher in pointer-events-none div during in-flight (DeckSwitcher has no disabled prop)"
  - "Add test-setup.ts + vitest setupFiles to prevent neon() crash on DB import chain in node test env"
metrics:
  duration: "7 min"
  completed: "2026-05-19T12:12:47Z"
  tasks: 2
  files: 3
---

# Phase 10 Plan 03: Image Upload Flow — Extraction Client Wiring Summary

**One-liner:** Extended Phase 9 useReducer with 5 extraction actions + real handleExtract POST to /api/extract with 35s AbortController, per-HTTP-status friendly copy, and 5 UI-SPEC states rendered in-place.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend reducer (export + 3 fields + 5 actions) | c5a5be6 | image-upload-flow.tsx, vitest.config.ts, test-setup.ts |
| 2 | handleExtract + friendlyErrorCopy + 5 UI states | 9d3fedc | image-upload-flow.tsx |

## What Was Built

**Task 1 — Reducer extension:**
- Exported `imageFlowReducer` (required for extract-reducer.test.ts to import it)
- Added `extracting: boolean`, `extractError: {status,message}|null`, `extractWords: string[]|null` to `ImageFlowState`
- Added 5 actions to `ImageFlowAction` union: EXTRACT_START/SUCCESS/NO_WORDS/ERROR/RETRY
- Added 5 reducer cases using spread-and-override; EXTRACT_ERROR explicitly preserves `file/previewUrl/selectedDeckId` (D-16/EXT-04)
- Extended `useReducer` initial state with the 3 new fields
- Extended lucide import with `Loader2, ImageOff, AlertCircle`

**Task 2 — handleExtract + render:**
- `handleExtract` async: guard → EXTRACT_START dispatch → FileReader data-URL → deck.language lookup → 35s AbortController → `fetch("/api/extract", POST JSON)` → dispatch SUCCESS/NO_WORDS/ERROR → clearTimeout in finally
- `friendlyErrorCopy(status)`: 9 per-status strings verbatim from 10-UI-SPEC (429/413/415/504/503/502+500/400/401/default)
- 5 render states in Step 2 branch, precedence: extracting → error → no-words([]) → success(non-empty) → idle
  - **In-flight**: DeckSwitcher wrapped pointer-events-none, Back button hidden, button `aria-busy="true"` + Loader2 spinner + "Extracting words…" + hint text
  - **Error**: recap + DeckSwitcher (interactive) + Back restored + `role="alert"` error paragraph + "Try again" outline button (re-dispatches EXTRACT_RETRY + calls handleExtract)
  - **No-words**: recap + ImageOff icon + "No words found in this image." + "Try a photo with clearer text…" + "Choose another image" (dispatches BACK_TO_PICK + CLEAR_FILE)
  - **Success stub**: recap + "Found {N} word(s) — ready to review." + disabled "Review words →" button (Phase 11 wires it)
  - **Idle**: Phase 9 markup unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vitest setupFiles to prevent neon() crash on module import**
- **Found during:** Task 1 reducer test run
- **Issue:** `extract-reducer.test.ts` imports `imageFlowReducer` from `image-upload-flow.tsx`, which transitively imports `deck-switcher` → `deck-actions` → `db/index.ts` → `neon(process.env.DATABASE_URL!)`. In the test node environment, `DATABASE_URL` is not set, causing `neon()` to throw at module load time.
- **Fix:** Created `src/test-setup.ts` that sets a dummy `DATABASE_URL` if absent; added `setupFiles: ["./src/test-setup.ts"]` to `vitest.config.ts`. This is safe — tests that need a real/mocked DB already use `vi.mock("@/db")`, and `env.test.ts` uses inline `runtimeEnv` objects not `process.env`, so neither is affected.
- **Files modified:** `src/test-setup.ts` (new), `vitest.config.ts`
- **Commit:** c5a5be6

**2. [Rule 2 - Missing critical functionality] DeckSwitcher has no `disabled` prop — used CSS wrapper**
- **Found during:** Task 2 rendering
- **Issue:** 10-UI-SPEC requires DeckSwitcher to be non-interactive during in-flight state via `disabled` prop, but `DeckSwitcherProps` has no such prop. Plan prohibited modifying `deck-switcher.tsx`.
- **Fix:** Wrapped DeckSwitcher in `<div className="pointer-events-none opacity-60">` during in-flight state. Achieves the same UX (non-interactive, visually muted) without modifying deck-switcher.tsx.
- **Files modified:** `src/components/image-upload-flow.tsx`
- **Commit:** 9d3fedc

## Verification Results

- `npx vitest run src/app/api/extract/__tests__/extract-reducer.test.ts` — 6/6 passed (GREEN)
- `npx vitest run src/` — 1733/1733 passed, 1 skipped (no regressions)
- `npx tsc --noEmit` — clean
- `npx biome check src/components/image-upload-flow.tsx` — clean

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| "Review words →" button is disabled | image-upload-flow.tsx | success state | Phase 11 wires the navigation handler and the review list UI |

The success state (`extractWords.length > 0`) renders a disabled "Review words →" button and a "Found {N} word(s) — ready to review." message. This is intentional per plan scope — Phase 11 owns the editable review list and will replace the stub with a real handler.

## Threat Flags

No new trust boundary surfaces introduced. `handleExtract` POSTs to `/api/extract` which was already audited in 10-02. The `friendlyErrorCopy` function shows only HTTP-status-keyed UI strings — the raw `data.error` body from the server is never surfaced to the user (T-10-12 mitigation confirmed). Double-submit guard implemented (T-10-11 mitigation confirmed).

## Self-Check: PASSED

- `src/components/image-upload-flow.tsx` — exists with all required patterns
- `src/test-setup.ts` — exists
- `vitest.config.ts` — setupFiles configured
- Commits c5a5be6 and 9d3fedc — both present in git log
