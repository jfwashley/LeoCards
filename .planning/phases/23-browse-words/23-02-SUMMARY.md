---
phase: 23-browse-words
plan: "02"
subsystem: add-a-card-header
tags: [daybreak, browse-words, ac-top, d-03, navigation, tdd]
dependency_graph:
  requires: []
  provides: [browse-words-entry-link, ac-top-browsepath-prop]
  affects: [new-card-mode-toggle, ac-top, ac-atoms-tests]
tech_stack:
  added: []
  patterns: [conditional-prop-render, next-link, vitest-jsdom-rendered-component]
key_files:
  created: []
  modified:
    - src/components/daybreak/ac-top.tsx
    - src/components/new-card-mode-toggle.tsx
    - src/components/daybreak/__tests__/ac-atoms.test.tsx
decisions:
  - "D-03: browsePath passed only when mode === type in NewCardModeToggle — conservative interpretation; image Pick step also shows ACTop but Browse words is meaningless in image-picker context (A2 verified)"
  - "Right-side link mirrors left-link style exactly (fontSize 14, fontWeight 600, color #C96F12, inline-flex) — visual symmetry with existing left escape"
  - "Biome line-length enforcement required multi-line JSX prop format for the ternary in new-card-mode-toggle.tsx"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23T09:19:44Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 23 Plan 02: D-03 Browse Words Entry Link on ACTop Summary

**One-liner:** Added optional `browsePath` prop to `ACTop` rendering a right-side "Browse words ›" `next/link` (data-testid=browse-words-link), threaded from `NewCardModeToggle` only in type mode as `/deck/browse?deck={activeDeckId}`, with 3 rendered-component test cases covering present, absent, and regression scenarios.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add optional browsePath prop + conditional Browse words link to ACTop | 4e71065 | src/components/daybreak/ac-top.tsx |
| 2 | Thread browsePath from NewCardModeToggle to ACTop in type mode only | 88bb30c | src/components/new-card-mode-toggle.tsx |
| 3 | Add D-03 ACTop browsePath rendered-component test cases | 0e868a2 | src/components/daybreak/__tests__/ac-atoms.test.tsx |

## Verification Results

| Gate | Command | Result |
|------|---------|--------|
| Vitest ac-atoms suite | `npx vitest run src/components/daybreak/__tests__/ac-atoms.test.tsx` | 23/23 passed (20 pre-existing + 3 new D-03 cases) |
| Biome (all 3 files) | `npx biome check {3 files}` | Clean |
| TypeScript | `npx tsc --noEmit` (grep touched files) | No errors in touched files |

## What Was Built

**`src/components/daybreak/ac-top.tsx`** — Added `ACTopProps` interface with `browsePath?: string` (JSDoc: "When provided, renders 'Browse words ›' at top-right — landing/Pick only; omitted during the image stepper."). Replaced the right centering spacer with a conditional: when `browsePath` is truthy, a `next/link` `<Link>` with `data-testid="browse-words-link"` and `href={browsePath}`, styled identically to the left "‹ My deck" link (fontSize 14, fontWeight 600, color `#C96F12`, `display: inline-flex`); when falsy, the original `<span style={{ flex: "none", width: 60 }} />` is preserved so the title stays visually centred. Left link and `data-testid="add-card-title"` title span are completely unchanged.

**`src/components/new-card-mode-toggle.tsx`** — Changed the `<ACTop />` render to pass `browsePath={mode === "type" ? \`/deck/browse?deck=${activeDeckId}\` : undefined}`. Type mode shows the Browse entry link; image mode passes `undefined` so the link is absent. No other lines changed.

**`src/components/daybreak/__tests__/ac-atoms.test.tsx`** — Added `import { ACTop }` (after `ACSeg`, biome-ordered) and a new `describe("ACTop — D-03 Browse words entry link")` block with three `it` cases: (1) link present and `href` correct when `browsePath` provided, (2) link absent when `browsePath` omitted, (3) `add-card-title` still present when `browsePath` provided (regression guard).

## Deviations from Plan

**1. [Rule 2 - Format] Biome line-length enforcement on new-card-mode-toggle.tsx**

- **Found during:** Task 2 verification
- **Issue:** Biome format gate failed — the single-line `<ACTop browsePath={...} />` exceeded line length
- **Fix:** Applied biome-mandated multi-line prop format (ternary on its own line)
- **Files modified:** src/components/new-card-mode-toggle.tsx
- **Commit:** 88bb30c (included in task commit)

## Known Stubs

None — no stub patterns introduced. The `browsePath` value is a computed URL string from `activeDeckId`, not a placeholder.

## Threat Flags

No new security surface beyond what the threat model documented. `browsePath` is constructed from server-resolved `activeDeckId` as a fixed template — no user input in the URL construction.

## Self-Check: PASSED

Files exist:
- src/components/daybreak/ac-top.tsx — FOUND
- src/components/new-card-mode-toggle.tsx — FOUND
- src/components/daybreak/__tests__/ac-atoms.test.tsx — FOUND

Commits exist:
- 4e71065 (Task 1) — FOUND
- 88bb30c (Task 2) — FOUND
- 0e868a2 (Task 3) — FOUND
