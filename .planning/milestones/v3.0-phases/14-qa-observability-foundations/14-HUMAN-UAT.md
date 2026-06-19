---
status: complete
phase: 14-qa-observability-foundations
source: [14-VERIFICATION.md]
started: 2026-06-17T00:00:00Z
updated: 2026-06-18T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Study-session badge presence/absence
expected: With a valid `leo-qa-mode` cookie (QA-authed), the per-card SRS state badge (`[data-qa-badge]`, monospace, top-right corner) renders on the study card. Without the QA cookie (normal customer), the badge is absent.
result: pass
evidence: "Live UAT (Playwright, throwaway *test.local user): study card showed badge text `R0·n2t` top-right when QA-authed (studyBadges=1). Customer dashboard showed 0 badges; customer absence also e2e-proven in 14-qa-parity."

### 2. Dashboard card-list badge render + desktop layout (WR-02)
expected: QA-authed users see the state badge on each card-list row, correctly positioned at desktop width (WR-02). Customers see no badge.
result: pass
evidence: "At 1280px, both card rows (Hello/Bonjour, Please/S'il vous plaît) showed an `R0·n2t` badge in the row's top-right corner, correctly placed (desktopBadgeVisible=true, qaDashboardBadges=4 across desktop+mobile DOM). Customer view: 0 badges. WR-02 fix confirmed — no foster-parent misplacement. (Live cooldown 'cd:' tick not exercised — fresh round-0 cards have no active cooldown; countdown logic is unit-tested.)"

### 3. /debug Card SRS state table accuracy
expected: `/debug` renders a per-card SRS state table from real card data (round, direction, cooldown, paused/learned), scoped to the user.
result: pass
evidence: "After entering the secret + Load, `/debug` showed 'Card SRS state (2)' table listing both real cards with R/Dir/Cooldown/Paused/Learned columns (srsTableVisible=true), plus the Live REAL state panel. Data matched the seeded deck."

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Resolved Blocker

A schema-drift blocker found during this UAT was resolved mid-session:
- **Symptom:** `/dashboard` + `/study` threw `NeonDbError: column "lastCommitId" does not exist`.
- **Cause:** WR-04 fix (commit b256ea7) added `cards.lastCommitId` to the schema + migration `drizzle/0003_left_ultimo.sql`, but it was never applied to the DB (project uses `db:push`; drizzle migrate-journal was empty).
- **Fix:** Applied the additive, nullable column directly (`ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "lastCommitId" text`) to the dev DB — non-destructive.
- **Caveat for deploy:** Any other environment (e.g. production) running `main` needs the same column; ensure the deploy step applies it (db:push / migration).

## Gaps

[none — all tests pass]
