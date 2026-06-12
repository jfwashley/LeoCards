# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.1 — Living Habitat

**Shipped:** 2026-05-29 (closed 2026-06-12)
**Phases:** 4 (12, 13, 13.1, 13.2) | **Plans:** 14 executed (+4 superseded)

### What Was Built
- Per-card pause/unpause with exact SRS cadence preservation (Phase 12)
- 3D Soft-Clay habitat replacing PixiJS — delivered as 72 pre-rendered ambient clips after live 3D failed on mobile (Phases 13 + 13.1)
- Secret-gated `/debug` QA console with HMAC-signed virtual habitat-state override (Phase 13.2)
- Critical study-loop fix: cards can actually reach "learned" (broken since Phase 3)

### What Worked
- **Measure-then-decide gates (D-28):** live 3D widget measured at 21/18 FPS → cached image decision was clean and final
- **Mid-phase pivots over sunk-cost:** after 3 failed live-3D mobile attempts, pivoting 13.1 to pre-rendered video delivered the same visual at −900 KB JS and Perf 96
- **Writing tests alongside code (Phase 12):** shipped `nyquist_compliant: true` from day one — unlike v2.0's phases, which carried flag-flip debt for three weeks
- **`/debug` console paid for itself same-day:** QA'd all 72 level×mood clips immediately after shipping

### What Was Inefficient
- Three consecutive live-3D mobile attempts before pivoting — the pivot criterion ("does it render at all on the user's device") could have been tested first
- v2.0's validation drafts were never updated post-execution, so the v2.1 close inherited a retroactive audit (9/10/11 flag flips, stale debt bullets, a stale debug session)
- Phase 13.2 shipped with no phase directory — fine for a quick phase, but it then had to be reconstructed into ROADMAP/MILESTONES at close
- Cold-Vercel-preview Lighthouse runs produced a false TBT failure (±300 ms noise) that cost a re-measurement cycle

### Patterns Established
- **Certify CWV on warm production only**, n≥5 medians — cold previews are noise (binding for v3.0)
- Chunk fingerprinting via `page_client-reference-manifest` + `grep <lib> .next/static/chunks` to attribute route JS to libraries (found the zod chunk)
- Heavy rendering moved to build time (`?capture=video`) — the client gets media, not engines
- Env-gated QA acceleration (`STUDY_NO_COOLDOWN`, `DEBUG_CHEAT_SECRET`) — full-speed prod behavior, instant QA on dev/preview

### Key Lessons
1. Integration gaps hide behind green units: the study-loop bug survived 2 months because unit tests hand-fed grades the real session could never produce. Test the real pipeline path at least once per critical loop.
2. When a perf target resists multiple optimization rounds, question the rendering architecture rather than optimizing harder — the video pivot beat all three live-3D attempts at once.
3. Close validation bookkeeping in the same phase that earns it; retroactive audits cost more than the flag-flip would have.

### Cost Observations
- Model mix: planner opus / executor sonnet (per config profile)
- Notable: the 13.1 video pipeline's MediaRecorder capture was ~60× faster than frame-by-frame screenshots

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Notable process change |
|-----------|--------|-------|------------------------|
| v1.0 MVP | 8 | 25 | Baseline GSD cycle established |
| v2.0 Image-to-Flashcards | 3 | 10 | STRIDE threat modeling + eval harness introduced; validation bookkeeping slipped |
| v2.1 Living Habitat | 4 | 14 | Measure-then-decide gates; warm-prod CWV certification; tests-with-code restored nyquist-from-day-one |
