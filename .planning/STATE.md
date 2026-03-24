---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase complete — ready for verification
stopped_at: Completed 02-deck-and-card-management-02-04-PLAN.md
last_updated: "2026-03-24T16:09:55.494Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 02 — deck-and-card-management

## Current Position

Phase: 02 (deck-and-card-management) — EXECUTING
Plan: 4 of 4

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P01 | 29 | 2 tasks | 22 files |
| Phase 01-foundation P02 | 2 | 2 tasks | 4 files |
| Phase 01-foundation P03 | 18 | 3 tasks | 9 files |
| Phase 01-foundation P04 | 5 | 1 tasks | 2 files |
| Phase 02-deck-and-card-management P01 | 45 | 3 tasks | 19 files |
| Phase 02-deck-and-card-management P02 | 10 | 2 tasks | 3 files |
| Phase 02-deck-and-card-management P03 | 25 | 3 tasks | 8 files |
| Phase 02-deck-and-card-management P04 | 5 | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: Next.js 15 + Better Auth + Drizzle + Neon + PixiJS 8.x + Motion 11.x + DeepL + Vitest + Biome (see research/SUMMARY.md)
- Architecture: Compute-on-read — habitat level, decay, mood, and milestones derived at request time from raw DB facts; never stored as computed columns
- Study: Client-local session state via `useReducer`; single batch POST to `/api/study/complete` at session end
- [Phase 01-foundation]: Biome CSS linting disabled — Tailwind 4 directives incompatible with Biome CSS parser; CSS files excluded via includes pattern
- [Phase 01-foundation]: src/db/index.ts uses process.env.DATABASE_URL directly (not env.ts) to avoid circular import when auth.ts imports db at module scope
- [Phase 01-foundation]: proxy.ts used instead of middleware.ts — Next.js 16 breaking change renames the file and function
- [Phase 01-foundation]: nextCookies() placed last in Better Auth plugins array — required for server actions to set cookies correctly
- [Phase 01-foundation]: Full schema (import * as schema) passed to drizzleAdapter — partial schema causes runtime TypeError in Better Auth
- [Phase 01-foundation]: useSearchParams in reset-password wrapped in Suspense boundary — required by Next.js 16 for pages that prerender
- [Phase 01-foundation]: Better Auth client uses requestPasswordReset not forgetPassword — plan interface contract was inaccurate about client method name
- [Phase 01-foundation]: LogoutButton extracted as separate client component to keep dashboard page a server component
- [Phase 01-foundation]: useSearchParams in reset-password wrapped in Suspense boundary — required by Next.js 16 for pages that prerender
- [Phase 01-foundation]: Better Auth client uses requestPasswordReset not forgetPassword — plan interface contract was inaccurate about client method name
- [Phase 01-foundation]: LogoutButton extracted as separate client component to keep dashboard page a server component
- [Phase 01-foundation]: env.ts wired via side-effect import in layout.tsx (not named import) — triggers Zod validation at app startup without unused-variable lint warnings
- [Phase 02-deck-and-card-management]: DeepL target language 'en' mapped to 'en-US' (DeepL requires specific English variant codes)
- [Phase 02-deck-and-card-management]: Word lists stored as static JSON files — version-controlled, zero migration risk
- [Phase 02-deck-and-card-management]: DeepL client instantiated inside handler (not module scope) to prevent env access at import time
- [Phase 02-deck-and-card-management]: vi.hoisted() required for vitest mocks that are referenced inside vi.mock() factories
- [Phase 02-deck-and-card-management]: deck-queries.ts has no 'use server' — Server Component data fetchers, not client-callable server actions
- [Phase 02-deck-and-card-management]: Branded type cast (userId as UserId) required when comparing plain string to branded Drizzle column in eq()
- [Phase 02-deck-and-card-management]: URL params (?deck=id) for active deck state — enables SSR and shareable URLs
- [Phase 02-deck-and-card-management]: DeckView as separate client component so dashboard page remains a server component
- [Phase 02-deck-and-card-management]: DeleteConfirm replaces dialog body content (same Dialog) — not a nested second Dialog
- [Phase 02-deck-and-card-management]: useTransition wraps server action calls for optimistic updates without blocking UI
- [Phase 02-deck-and-card-management]: activeField ref prevents translation feedback loop — only updates other field if user is still typing in the same field
- [Phase 02-deck-and-card-management]: Skeleton shimmer replaces Input component during in-flight translation (not overlay)
- [Phase 02-deck-and-card-management]: deck-view links updated to pass ?deck= param so browse/new-card pre-select correct deck

### Pending Todos

None yet.

### Blockers/Concerns

- Pre-made word list data source not yet identified — must resolve before Phase 2 planning (A1-B1 French/Spanish/English frequency list needed)
- Milestone thresholds (exact schedule beyond 10/25/50/100 examples) are a product design decision — resolve during Phase 6 planning
- Sprite assets (tiger/idle/happy/sad/sleep, habitat layers, animal sprites) must be in hand before Phase 5 — art production or licensing not yet arranged
- PixiJS 8.x sprite atlas toolchain specifics need validation at Phase 5 start (recommend `/gsd:research-phase` before Phase 5)

## Session Continuity

Last session: 2026-03-24T16:09:55.490Z
Stopped at: Completed 02-deck-and-card-management-02-04-PLAN.md
Resume file: None
