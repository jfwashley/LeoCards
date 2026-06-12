---
phase: 12
plan: 01
status: complete
date: 2026-05-20
---

# Plan 12-01 — SUMMARY: Schema + Drizzle migration

## What shipped

- `pausedAt: timestamp("pausedAt")` added to `cards` table in `src/db/schema.ts` (line 106, between `lastStudiedAt` and `createdAt`).
- New migration file: **`drizzle/0002_first_slipstream.sql`** — single DDL: `ALTER TABLE "cards" ADD COLUMN "pausedAt" timestamp;`
- New snapshot: `drizzle/meta/0002_snapshot.json`. Journal updated with `0002_first_slipstream` at idx 2.
- DDL **APPLIED to live Neon** on 2026-05-20 — verified by querying `information_schema.columns` (column present, `data_type: timestamp without time zone`, `is_nullable: YES`).

## How the apply happened

- `npm run db:migrate` (drizzle-kit migrate) hangs under `@neondatabase/serverless` because that driver only connects via WebSocket and drizzle-kit's migrator wants HTTP.
- Workaround: applied the DDL directly via the same `@neondatabase/serverless` HTTP client the runtime uses (single `ALTER TABLE` call). End state is identical to what `drizzle-kit migrate` would have produced.
- Note: `drizzle.__drizzle_migrations` tracking table exists but is empty for every migration, including 0000 and 0001 — confirming the project was originally bootstrapped via `db:push` rather than `migrate`. Direct DDL application matches the existing convention.

## Verification

- `npx tsc --noEmit` — clean.
- `npm test` — 1771/1771 unit tests pass. 11 "failed test files" are pre-existing — Playwright e2e specs being picked up by Vitest because `vitest.config.ts` has no `exclude: ['e2e/**']`. Unrelated to Plan 12-01.
- Live-DB verification (information_schema query): `pausedAt` column present, nullable, no default. All existing rows have `pausedAt = NULL` (active) automatically.

## Commits

- `995c44c` — `feat(12-01): add pausedAt column to cards (schema + migration)`

## Carried into downstream plans

- **Plan 12-02** can now SELECT/filter `pausedAt` in `src/lib/study-queries.ts`.
- **Plan 12-03** can now UPDATE `pausedAt` and `cooldownUntil` together in a single statement.
- The branded `Date | null` type flows automatically via `cards.$inferSelect`.

## Pre-existing tech debt surfaced (not in Phase 12 scope)

- `vitest.config.ts` should `exclude: ['e2e/**']` to stop Playwright specs from being scanned by Vitest. Candidate for a future cleanup phase or `/gsd-add-todo`.
- `npm run db:migrate` is non-functional under the current Neon serverless driver — anyone applying future migrations will hit the same hang. The project either needs a non-serverless driver for migrations (pg) or the team should standardize on direct DDL application + commit the journal updates. Worth a follow-up note.
