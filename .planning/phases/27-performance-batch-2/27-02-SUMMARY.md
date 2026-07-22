---
phase: 27-performance-batch-2
plan: 02
subsystem: database
tags: [drizzle, postgres, neon, indexes, performance]

# Dependency graph
requires:
  - phase: 27-performance-batch-2 (plan 01)
    provides: PERF-12 session dedupe/cookie caching context; no direct code dependency, same schema.ts file untouched by 27-01
provides:
  - Four secondary indexes (cards.deckId, decks.userId, recall_events.cardId, session.userId) declared in Drizzle schema and live on the hosted Neon production DB
affects: [27-03, 27-04, 27-07, 27-10, future-schema-changes]

# Tech tracking
tech-stack:
  added: []
  patterns: ["3-arg pgTable(name, columns, (table) => [index(...)]) array-callback convention now used by 5 tables (adds cards/decks/recall_events/session to the existing milestones_seen precedent)"]

key-files:
  created: []
  modified:
    - src/db/schema.ts

key-decisions:
  - "D-08 human-authorization gate honored: no db:push ran until Josh explicitly typed authorization (\"Authorized — push now\") to the orchestrator"
  - "DATABASE_URL extracted via grep from .env.local, never sourced (T-27-02-02 mitigation — .env.local contains a runnable curl+API-key block that executes on source)"

patterns-established:
  - "Secondary FK indexes declared via the 3-arg pgTable array-callback form, matching the milestones_seen precedent — the project's convention for any future index addition"

requirements-completed: [PERF-18]

# Metrics
duration: ~15min (Task 1 authoring + tsc verification, plus a human-authorization pause for the hosted-DB write)
completed: 2026-07-22
---

# Phase 27 Plan 02: Secondary DB Indexes + Gated Neon Push Summary

**Four secondary indexes (cards.deckId, decks.userId, recall_events.cardId, session.userId) added to the Drizzle schema and pushed live to the hosted Neon production database under Josh's explicit D-08 authorization.**

## Performance

- **Duration:** ~15 min (schema authoring/verification + authorization wait)
- **Completed:** 2026-07-22
- **Tasks:** 2 (1 auto + 1 blocking checkpoint)
- **Files modified:** 1 (src/db/schema.ts)

## Accomplishments
- Declared `cards_deckId_idx`, `decks_userId_idx`, `recall_events_cardId_idx`, `session_userId_idx` in `src/db/schema.ts`, converting all four tables from the 2-arg `pgTable(name, columns)` form to the 3-arg array-callback form already established by `milestones_seen`
- Zero column/data changes — verified via clean diff (only the `index` import + third-arg callbacks added)
- `npx tsc --noEmit` clean
- Pushed the four indexes to the hosted Neon production database under explicit Josh authorization (D-08), with post-push verification against `pg_indexes` confirming all four now exist
- PERF-18 shipped: the schema now has its first non-PK indexes (previously zero), removing the query-cliff risk on card-delete cascades scanning the append-only `recall_events` table

## Task Commits

Each task was committed atomically:

1. **Task 1: Add four index() declarations to schema.ts** - `8f29ccc` (feat)
2. **Task 2: Push indexes to Neon with Josh's authorization (D-08)** - no source commit (hosted-DB write only, no repo change); orchestrator ran `npm run db:push` after explicit authorization

**Plan metadata:** (this commit) `docs: complete 27-02 plan`

## Files Created/Modified
- `src/db/schema.ts` - Converted `session`, `decks`, `cards`, `recall_events` pgTable definitions to the 3-arg array-callback form and added one `index()` declaration per table

## Decisions Made
- D-08 human-authorization gate for the hosted-DB write was honored exactly as specified: the plan paused at Task 2 and did NOT run `db:push` until Josh explicitly typed authorization to the orchestrator ("Authorized — push now")
- `DATABASE_URL` was extracted via `grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"'` rather than sourcing the file, per T-27-02-02 (`.env.local` contains a runnable curl+API-key block that executes on `source`)

## Deviations from Plan

None - plan executed exactly as written. Task 2's checkpoint behaved as designed: paused for human authorization, resumed only after Josh's explicit "Authorized — push now", and the push was executed by the orchestrator (not this agent) with the same grep-extraction safeguard the plan specified.

## Issues Encountered

None during Task 1. Task 2 required a human-authorization round trip by design (the plan's own BLOCKING gate) — this is expected flow, not a problem, per D-08.

**D-08 hosted-DB push verification (evidence):**
- `npm run db:push` output: `[✓] Changes applied` (NOT "no changes detected" — rules out the Pitfall 5 wrong/empty-DB false-positive, T-27-02-03)
- Post-push `pg_indexes` query confirmed all four target indexes exist: `cards_deckId_idx`, `decks_userId_idx`, `recall_events_cardId_idx`, and `session_userId_idx` on `public.session`
- **Note:** a same-named index (`session_userId_idx`-equivalent) also exists on `neon_auth.session` — this is Neon's own internal auth schema (not drizzle-managed by this project) and is unrelated/harmless; it predates this push and was not created or modified by it

## Threat Model Disposition

- **T-27-02-01** (Tampering, Neon schema push) — **mitigated**: D-08 human-authorization gate was enforced (paused, no write until explicit "Authorized — push now"); push was additive-index-only, no column/data change, verified instant at current row counts
- **T-27-02-02** (Information Disclosure, `.env.local` DATABASE_URL) — **mitigated**: extracted via `grep`, never `source`d
- **T-27-02-03** (Denial of Service, wrong-DB push) — **mitigated**: `db:push` output confirmed `[✓] Changes applied`, not "no changes detected"; `pg_indexes` verification confirmed the four indexes exist on the correct (production) instance

## User Setup Required

None - no external service configuration required. The hosted-DB write was a one-time schema push, already completed and verified.

## Next Phase Readiness
- PERF-18 fully shipped and verified live on production Neon — no further action needed
- `src/db/schema.ts` is now stable for the remaining Phase 27 plans (27-03, 27-04, 27-07, 27-10) — none of which modify schema.ts per their own `files_modified`
- Established the 3-arg array-callback pattern as the project convention for any future secondary index (5 of the schema's tables now use it: milestones_seen, session, decks, cards, recall_events)

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: src/db/schema.ts (4 `_idx")` occurrences confirmed via grep)
- FOUND: commit 8f29ccc (feat(27-02): add four secondary indexes to schema.ts)
