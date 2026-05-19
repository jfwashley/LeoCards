---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Image-to-Flashcards
status: planning
stopped_at: Phase 10 AI-SPEC + UI-SPEC approved
last_updated: "2026-05-19T10:24:17.977Z"
last_activity: 2026-05-18 — Phase 9 complete (2/2 plans, verification passed)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 9 complete — next: Phase 10 (Vision Extraction Endpoint)

## Current Position

Phase: 10 (Vision Extraction Endpoint) — not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-18 — Phase 9 complete (2/2 plans, verification passed)

> Note: Phase 999.1 (perf initiative) is a backlog parking-lot item, NOT the sequenced next phase. `phase.complete` mis-picked it as next_phase; corrected here. Real milestone order: 9 → 10 → 11.

## Performance Metrics

**Velocity:**

- Total plans completed: 3 (v2.0); 25 (v1.0, shipped)
- Average duration: 2 min
- Total execution time: 2 min (v2.0)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 9 (v2.0) | 2/2 | ~12 min | ~6 min |
| 10-11 (v2.0) | - | - | - |
| 9 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: 09-01 (2 min)
- Trend: on track

*Updated after each plan completion*

### v1.0 Historical (shipped 2026-04-15)

| Phase 01-foundation P01 | 29 | 2 tasks | 22 files |
| Phase 01-foundation P02 | 2 | 2 tasks | 4 files |
| Phase 01-foundation P03 | 18 | 3 tasks | 9 files |
| Phase 01-foundation P04 | 5 | 1 tasks | 2 files |
| Phase 02-deck-and-card-management P01 | 45 | 3 tasks | 19 files |
| Phase 02-deck-and-card-management P02 | 10 | 2 tasks | 3 files |
| Phase 02-deck-and-card-management P03 | 25 | 3 tasks | 8 files |
| Phase 02-deck-and-card-management P04 | 5 | 3 tasks | 5 files |
| Phase 03-study-engine-and-study-ui P02 | 2 | 2 tasks | 2 files |
| Phase 03-study-engine-and-study-ui P03 | 13 | 2 tasks | 11 files |
| Phase 04-habitat-engine P01 | 3 | 1 tasks | 2 files |
| Phase 04-habitat-engine P02 | 2 | 2 tasks | 2 files |
| Phase 05-habitat-ui P01 | 25 | 2 tasks | 7 files |
| Phase 05-habitat-ui P02 | 16 | 2 tasks | 7 files |
| Phase 05-habitat-ui P03 | 7 | 3 tasks | 5 files |
| Phase 06-milestone-system-and-dashboard-polish P02 | 25 | 2 tasks | 8 files |
| Phase 06-milestone-system-and-dashboard-polish P02 | 25 | 3 tasks | 8 files |
| Phase 06-milestone-system-and-dashboard-polish P03 | 4 | 1 tasks | 2 files |
| Phase 01-foundation P06 | 2min | 1 tasks | 3 files |
| Phase 07-backend-security-and-quality-fixes P01 | 2 | 2 tasks | 2 files |
| Phase 07-backend-security-and-quality-fixes P02 | 3 | 2 tasks | 5 files |
| Phase 07-backend-security-and-quality-fixes P03 | 5 | 2 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- v2.0 Image-to-Flashcards roadmap created 2026-05-18: Phases 9 (Image Upload & Deck Selection), 10 (Vision Extraction Endpoint), 11 (Review & Commit). All 15 v2.0 requirements (IMG/EXT/RVW) mapped, 100% coverage. Continuous numbering from v1.0 (no reset).
- Phase 7 added: Backend Security and Quality Fixes — Authorization bypasses, input validation, N+1 queries, and rate limiting

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0] Vision provider: Anthropic Claude (multimodal). Add Anthropic SDK as new dependency + new server endpoint for image word extraction.
- [v2.0] Scope: image-to-flashcards ONLY; the cute 2D illustrated art pass remains deferred.
- [v2.0] Reuse existing add-card + DeepL pipeline and existing in-memory rate limiter — do not rebuild.
- [v2.0] Uploaded images processed transiently, never persisted (privacy + scope).
- Stack: Next.js 16 + Better Auth + Drizzle + Neon + PixiJS 8.x + Motion 12 + DeepL + Vitest + Biome
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
- [Phase 03-study-engine-and-study-ui]: Ownership check uses single AND query (deckId + userId) — avoids two round-trips to DB
- [Phase 03-study-engine-and-study-ui]: motion/react (not framer-motion) is the correct import path for Motion 12 in this codebase
- [Phase 03-study-engine-and-study-ui]: useReducer state machine for study session phases (studying/committing/end/error) — cleaner than multiple useState hooks
- [Phase 03-study-engine-and-study-ui]: DeckView hasDueCards/earliestCooldownEnd computed server-side in dashboard page — no client DB calls needed
- [Phase 04-habitat-engine]: computeQuality uses millisecond arithmetic only to avoid DST issues
- [Phase 04-habitat-engine]: effectiveCardCount uses Math.floor to prevent float boundary issues at level thresholds
- [Phase 04-habitat-engine]: Promise.all for parallel habitat_metadata + learned card count queries — single round-trip per request
- [Phase 04-habitat-engine]: No try/catch in GET /api/habitat — unexpected DB errors bubble to Next.js error boundary, consistent with existing routes
- [Phase 05-habitat-ui]: ssr:false must be inside a 'use client' module — Next.js 16 disallows it in Server Components; habitat-scene.tsx is the use client boundary
- [Phase 05-habitat-ui]: Assets.load() called inside Application tree (Scene useEffect), not before render — avoids Pitfall 5 (no PixiJS context)
- [Phase 05-habitat-ui]: VisibilityController is a render-nothing component inside Application tree using useApplication() hook for ticker pause/resume (D-22)
- [Phase 05-habitat-ui]: useTick callbacks wrapped in useCallback per Pitfall 3 — prevents re-registration on every render
- [Phase 05-habitat-ui]: Lazy useState initializer for tiger position/facing prevents SSR hydration mismatch (Pitfall 7)
- [Phase 05-habitat-ui]: ResizeObserver on canvas container passes sceneWidth/sceneHeight to PixiJS components for percentage-based layout
- [Phase 05-habitat-ui]: HabitatWidget shown above FirstVisitPicker for new users — tiger visible before first deck is created
- [Phase 05-habitat-ui]: retry() in HabitatScene prefers cached data over error state — offline banner beats error page for UX
- [Phase 06-milestone-system-and-dashboard-polish]: computeStats returns leveledUp: null as base value; overwritten by API response data in dispatch
- [Phase 06-milestone-system-and-dashboard-polish]: celebratingLevel threaded through DeckView and HabitatWidget to reach HabitatCanvas
- [Phase 06-milestone-system-and-dashboard-polish]: Wrap h1 and breakdown paragraph in a div inside flex container to preserve justify-between layout while stacking heading and breakdown text vertically on left side
- [Phase 01-foundation]: Build before Type check in CI — next-env.d.ts and .next/types/ generated by build are required by tsc
- [Phase 01-foundation]: npm audit fix without --force — esbuild vulnerability in drizzle-kit requires breaking downgrade, deferred
- [Phase 07-backend-security-and-quality-fixes]: Card ownership verified transitively via deck JOIN — cards.deckId = declaredDeckId, deck.userId = session.user.id
- [Phase 07-backend-security-and-quality-fixes]: Study page redirects to /dashboard (not error page) for unauthorized deck access — consistent with existing deckId-missing redirect
- [Phase 07-backend-security-and-quality-fixes]: Batch INSERT uses rows[] array passed to single .values() call — one DB round-trip regardless of levels crossed (SEC-04)
- [Phase 07-backend-security-and-quality-fixes]: Math.floor on minutesSinceActivity prevents float boundary misclassification at 60-minute excited window (SEC-05)
- [Phase 07-backend-security-and-quality-fixes]: ALLOWED_LANGUAGES Set validates language before session auth in createDeck — fail fast on invalid input (SEC-06)
- [Phase 07-backend-security-and-quality-fixes]: celebrate query param clamped to 1-10 with NaN guard — non-numeric becomes null, out-of-range silently clamped (SEC-07)
- [Phase 07-backend-security-and-quality-fixes]: Email failure logging uses .catch() not try/catch — preserves no-await timing-attack protection while surfacing errors
- [Phase 07-backend-security-and-quality-fixes]: Rate limiter is in-memory (not Redis) — appropriate for single-server v1 deployment

### Pending Todos

None yet.

### Blockers/Concerns

- [v2.0] Anthropic API key must be added to env schema + CI env block before Phase 10 planning (mirror existing DEEPL_API_KEY pattern).
- [v2.0] Claude vision prompt/response contract (how words are returned, language handling for mixed-language images) to resolve during Phase 10 planning.

## Session Continuity

Last session: --stopped-at
Stopped at: Phase 10 AI-SPEC + UI-SPEC approved
Resume file: --resume-file

**Planned Phase:** 9 (Image Upload & Deck Selection) — 2 plans — 2026-05-18T19:40:28.506Z
