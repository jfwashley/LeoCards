# Phase 4: Habitat Engine - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure-function habitat state computation and the `GET /api/habitat` route. Computes decay, quality, level, and tiger mood from raw DB facts at request time. No UI, no rendering — that's Phase 5. No milestone logic — that's Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Decay mechanics
- **D-01:** 2-day grace period (locked from requirements). No decay within 48 hours of last activity.
- **D-02:** After grace period, habitat quality decays at 5% per day (gentle, linear).
- **D-03:** Decay floors at 10% — habitat never fully dies. Tiger always has a minimal home.
- **D-04:** Decay only starts after the user has completed at least one study session. New users who haven't studied yet do not experience decay (no `lastActivityAt` = no decay).

### Recovery
- **D-05:** Gradual restore — each study session recovers 25% of lost quality. Takes ~4 sessions to fully recover from max decay.
- **D-06:** Recovery model design is Claude's discretion (must be derivable from DB facts per compute-on-read architecture).

### Level thresholds
- **D-07:** 10 habitat levels. Exponential card count curve: 5, 15, 30, 50, 80, 120, 170, 230, 300, 400 learned cards.
- **D-08:** New users start at Level 1 with a basic starter habitat (welcoming, not empty).
- **D-09:** Level CAN drop with decay. Quality is a 0-100% score; level is derived from `quality × learnedCards`. Decay reduces quality, which may cause the derived level to step down.
- **D-10:** Max level is 10 (400 cards). Cards beyond 400 don't change the level but still count for activity and prevent decay.

### Tiger mood
- **D-11:** 4 moods: excited, happy, neutral, sad.
- **D-12:** Mood is determined by BOTH quality score AND recency of activity (not just one factor).
- **D-13:** "Excited" mood lasts 1 hour after completing a study session. Derivable from `lastActivityAt` being within 60 minutes.
- **D-14:** No sleep state — tiger is always awake regardless of time.

### API response shape
- **D-15:** Claude designs the response shape for `GET /api/habitat`. Must include at minimum: level, quality, mood, learnedCardCount. Additional metadata fields at Claude's discretion based on what Phase 5 UI will need.

### Habitat metadata schema
- **D-16:** Claude decides whether `habitat_metadata` table needs additional columns beyond `lastActivityAt`. Must remain compatible with compute-on-read architecture.

### Claude's Discretion
- API response shape (exact fields, types, naming) beyond the minimum required
- Recovery model implementation (how to compute gradual restore from DB facts)
- Mood calculation formula (exact thresholds for quality + recency → mood mapping)
- Whether to add columns to habitat_metadata or keep it minimal
- Pure function signatures and internal data structures

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Habitat — HAB-01 (shared habitat), HAB-06 (hard decay after 2-day grace)

### Architecture
- `.planning/research/SUMMARY.md` §Recommended Stack — Compute-on-read architecture decision

### Schema
- `src/db/schema.ts` — `habitat_metadata` table (userId, lastActivityAt), `cards` table (masteryRound for learned detection), `recall_events` table

### Phase 3 patterns
- `src/lib/study-engine.ts` — Pure function pattern with Vitest TDD (established in Phase 3)
- `src/app/api/study/complete/route.ts` — Route Handler pattern, habitat_metadata upsert on session complete
- `src/lib/study-queries.ts` — Server-only data fetcher pattern

### Project instructions
- `CLAUDE.md` and `AGENTS.md` — Next.js version has breaking changes; read `node_modules/next/dist/docs/` before writing code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/study-engine.ts` — Pure function pattern to replicate for habitat engine
- `src/lib/study-queries.ts` — Server-only query pattern for habitat data fetching
- `src/app/api/study/complete/route.ts` — Route Handler pattern with auth, validation, transaction

### Established Patterns
- Pure functions with type-only imports from schema (study-engine pattern)
- Vitest TDD with RED/GREEN/REFACTOR cycle (Phase 3)
- Branded types for IDs (`UserId`)
- Zod validation on API input
- Auth check via `auth.api.getSession` in Route Handlers

### Integration Points
- `src/db/schema.ts` — `habitat_metadata` table already exists; `cards.masteryRound >= 3` = learned
- `src/app/api/study/complete/route.ts` — Already upserts `habitat_metadata.lastActivityAt` on session end
- Future: `GET /api/habitat` response consumed by Phase 5 PixiJS scene

</code_context>

<specifics>
## Specific Ideas

- The decay floor at 10% preserves the emotional connection — the tiger's home is degraded but never destroyed
- Gradual recovery (25% per session) means the user has to earn their way back, creating a meaningful return arc
- The "excited" mood (1 hour post-study) adds a small dopamine moment when the user checks back after studying
- Level can drop with decay but level thresholds are exponential — early levels are easy to regain, higher levels require real commitment
- New users get Level 1 for free — the onboarding experience is welcoming, not empty

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-habitat-engine*
*Context gathered: 2026-03-27*
