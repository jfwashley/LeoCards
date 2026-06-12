---
phase: 06-milestone-system-and-dashboard-polish
plan: "03"
subsystem: dashboard-ui
tags: [dashboard, language-breakdown, deck-view, habitat]
dependency_graph:
  requires: ["06-01"]
  provides: ["HAB-07 language breakdown display"]
  affects: ["src/app/(protected)/dashboard/page.tsx", "src/components/deck-view.tsx"]
tech_stack:
  added: []
  patterns: ["Promise.all parallel data fetch", "conditional render with .length > 0"]
key_files:
  created: []
  modified:
    - src/app/(protected)/dashboard/page.tsx
    - src/components/deck-view.tsx
decisions:
  - "Wrap h1 + breakdown p in a div inside flex container so layout remains flex items-center justify-between (left-side stack, right-side buttons)"
  - "Middle-dot separator (\u00B7 U+00B7) used per D-11 / UI-SPEC copywriting contract"
  - "LANGUAGE_LABELS already present in deck-view.tsx — reused without duplication"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-28T22:08:57Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 06 Plan 03: Language Breakdown Dashboard Widget Summary

Per-language learned card counts displayed below the "My Deck" heading using `getLanguageBreakdown` from `milestone-queries.ts` (created in Plan 01), formatted as "French: 23 learned · Spanish: 10 learned".

## What Was Built

HAB-07: dashboard now shows a per-language learned card count breakdown below the "My Deck" heading. Only languages with at least 1 learned card appear. A user with no learned cards sees no breakdown text.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add language breakdown query to dashboard and render in DeckView | 3e23c40 | dashboard/page.tsx, deck-view.tsx |

## Acceptance Criteria Verification

- dashboard/page.tsx contains `import { getLanguageBreakdown } from "@/lib/milestone-queries"` — PASS
- dashboard/page.tsx contains `getLanguageBreakdown(session.user.id as UserId)` inside Promise.all — PASS
- dashboard/page.tsx contains `languageBreakdown={languageBreakdown}` prop on DeckView — PASS
- deck-view.tsx DeckViewProps contains `languageBreakdown: Array<{ language: string; count: number }>` — PASS
- deck-view.tsx contains `languageBreakdown.length > 0` — PASS
- deck-view.tsx contains `\u00B7` as separator — PASS
- deck-view.tsx contains `text-sm text-muted-foreground mt-1` — PASS
- deck-view.tsx contains `.map((item) =>` with `LANGUAGE_LABELS[item.language]` — PASS
- deck-view.tsx contains `learned` in the format string — PASS
- `npx vitest run` exits 0 — PASS (156/156 tests pass)
- `npx tsc --noEmit` only pre-existing errors in study-engine.test.ts (no new errors) — PASS

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- Commit 3e23c40 exists: FOUND
- src/app/(protected)/dashboard/page.tsx modified: FOUND
- src/components/deck-view.tsx modified: FOUND
