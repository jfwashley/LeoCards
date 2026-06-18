---
status: partial
phase: 14-qa-observability-foundations
source: [14-VERIFICATION.md]
started: 2026-06-17T00:00:00Z
updated: 2026-06-18T00:00:00Z
---

## Current Test

[blocked — app crashes against the live DB; see blocker below]

## Tests

### 1. Study-session badge presence/absence
expected: With a valid `leo-qa-mode` cookie (QA-authed), the per-card SRS state badge (`[data-qa-badge]`, monospace, top-right corner) renders on the study card and shows the live cooldown countdown. Without the QA cookie (normal customer), the badge is completely absent from the study DOM.
result: blocked
blocked_by: schema-drift
reason: "Could not reach the study surface — /dashboard crashes on load (NeonDbError: column \"lastCommitId\" does not exist) before a session can start."

### 2. Dashboard card-list badge render + cooldown tick + desktop layout (WR-02)
expected: On the dashboard, QA-authed users see the state badge on each card-list row with a live-ticking cooldown. Verify on BOTH mobile and desktop widths — on desktop confirm the badge is positioned correctly in the corner of its row (WR-02). Customers (no cookie) see no badge.
result: blocked
blocked_by: schema-drift
reason: "/dashboard server component throws on the cards query (column \"lastCommitId\" does not exist), so the page never renders."

### 3. /debug Card SRS state table accuracy
expected: The `/debug` page renders a per-card SRS state table sourced from real card data (round, direction, due/cooldown, paused/learned markers), scoped to the current user, sortable.
result: blocked
blocked_by: schema-drift
reason: "Not reached — the same missing `cards.lastCommitId` column breaks card reads."

## Summary

total: 3
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 3

## Gaps

- truth: "Phase 14 QA surfaces are usable end-to-end against the live database"
  status: blocked
  severity: blocker
  reason: >
    Live UAT (2026-06-18) found the app broken against the real Neon DB:
    `/dashboard` and `/study` server components throw
    `NeonDbError: column "lastCommitId" does not exist` on the cards query.
    Root cause: the WR-04 idempotency fix (commit b256ea7) added a
    `lastCommitId` column to the Drizzle schema and generated migration
    `drizzle/0003_left_ultimo.sql` (`ALTER TABLE "cards" ADD COLUMN "lastCommitId" text;`)
    but the migration was never applied to the database. Typecheck and the
    DB-mocked unit suite (1938 green) did not catch it — types come from the
    schema, not the live DB (classic schema-drift false-positive).
  blocked_by: db-migration-not-applied
  fix: "Apply migration 0003 to the database (npm run db:migrate, or db:push). Additive, nullable column — non-destructive. Requires a hosted-DB write, so needs user authorization."
  artifacts: [drizzle/0003_left_ultimo.sql, src/db/schema.ts, src/app/api/study/complete/route.ts]
  test: 1
