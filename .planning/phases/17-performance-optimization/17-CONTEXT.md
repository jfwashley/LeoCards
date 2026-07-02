# Phase 17: Performance optimization - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every key route — `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse` — meet warm-prod **mobile** CWV "Good" gates (LCP ≤2500 ms, TBT ≤200 ms, CLS ≤0.1, Perf ≥90; medians n≥5), with **every optimization landing with a measured before/after against the immutable Phase 16 baseline** (PERF-03). Additionally, warm client-side navigation between key routes must measure instant per a concrete Playwright gate extending `e2e/13-perf.spec.ts` (PERF-04). The Phase 15 core-journey harness must still pass after all refactors (roadmap success criterion 4).

**What the baseline says the work is:** LCP and CLS already pass on all four routes; desktop is fully green. The entire failure is mobile TBT (518–891 ms vs ≤200) + Perf score (79–86 vs ≥90), and all four routes classify **bundle** as the top bottleneck (first-load JS 526–1111 KB; ~9 chunks shared across all routes). This is a JS-reduction phase.

**NOT this phase:** field/p75 validation and the one-command re-certification gate (Phase 18, PERF-05/06); `/habitat` optimization (already CWV-green — it gets only a regression spot-check here); any feature or visual redesign work.

</domain>

<decisions>
## Implementation Decisions

### Daybreak fidelity (loading behaviour)
- **D-01:** **Mobile-first progressive loading.** Josh's directive: "whichever is better for mobile apps." Lazy chunks and brief placeholders are fine; a pixel-frozen load that ships more JS is the wrong trade. The **settled state must match today's Daybreak exactly** — fidelity applies to the destination, not the journey.
- **D-02:** **Dashboard habitat hero is poster-first.** LCP paints the habitat as a static image instantly; the ambient clip + its player JS load after the page is interactive and cross-fade in. Leo "comes alive" a beat later by design.
- **D-03:** **Placeholders are one reusable simple Daybreak-toned shimmer style** (cream/amber rounded blocks). No per-section designed skeleton states this phase. Space is always reserved — CLS 0 must hold.
- **D-04:** **Gate-vs-fidelity conflicts checkpoint Josh.** If a route provably can't reach TBT ≤200 / Perf ≥90 within D-01..03, execution pauses with the measured evidence and the specific visible change proposed; Josh approves or vetoes per case. Never silently sacrifice fidelity, never silently miss a gate.

### Refactor latitude
- **D-05:** **Dependency swaps allowed where visually identical.** Library animations (e.g. Motion entrances/fades) may be replaced with CSS/lighter equivalents only where the result is indistinguishable; keep the library for load-bearing moments (e.g. level-up confetti). Dead weight in the client graph (e.g. `three` — build-time-only per PROJECT.md yet a runtime dep) is removed outright.
- **D-06:** **Client→RSC conversions allowed freely** where behaviour is identical — locked as the primary TBT lever (Josh delegated to the mobile-best recommendation). The QA harness + e2e suite guard behaviour.
- **D-07:** **next.config / build settings: stable options land freely** with before/after numbers; anything marked experimental in the Next 16 docs **requires a checkpoint with evidence first**. Research MUST read `node_modules/next/dist/docs` — AGENTS.md warns this Next version differs from training data.
- **D-08:** **Shared infrastructure may be refactored** (root layout, providers, fonts, auth client) — that's where the ~9 shared chunks live and wins compound across all four routes. Guards: the `/habitat` spot-check (D-11) and the existing e2e coverage of auth screens.

### Measure / verify cadence
- **D-09:** **Route-scoped measurement per optimization batch + one full final run.** `scripts/measure-cwv.mjs` gains a route filter (the harness *script* is not immutable — only the committed baseline artifacts are); after each batch, re-measure only the affected route(s), mobile-first (~7 min each). One full 4-route × 2-preset run at phase end is the official after-record diffed against the Phase 16 baseline.
- **D-10:** **Correctness gates per risky wave + final:** full e2e after every wave; `qa:run` after any wave touching study/SRS/data paths or moving client→RSC boundaries, and always once at phase end as the official criterion-4 proof (needs a fresh dev server per the Phase 15/16 pattern).
- **D-11:** **One `/habitat` regression spot-check** (cheap mobile run, n=3) after the shared-bundle refactors land, plus inclusion in the final full run. `/habitat` stays OUT of the key-route gate set — Phase 16's D-03 exclusion stands; this is the "revisit if refactors touch habitat" clause firing.
- **D-12:** **Gates pass = done.** Once a route's medians pass all four gates, note the headroom and move on. No gold-plating — PERF-04 and Phase 18 are still ahead.

### PERF-04 instant-nav gate
- **D-13:** **Coverage = 6 hub-and-spoke navigations:** dashboard↔study, dashboard↔new-card, dashboard↔browse — as in-app link taps only. Browser Back rides Next's client cache and is not separately gated.
- **D-14:** **Surface = local prod build** (`next build && next start`) via Playwright extending `e2e/13-perf.spec.ts`. Never the dev server (the 13-perf lesson). This gate becomes re-runnable input to Phase 18's one-command re-certification.
- **D-15:** **Pass = destination's REAL content visibly rendered ≤100 ms**, median n≥5 per pair, prefetch warm. Skeletons/`loading.tsx` may exist as UI fallbacks but do NOT count as the passing response.
- **D-16:** **Link prefetch tuning is in scope** for the 6 gated links — RSC payload should be local before the tap.
- **D-17:** **Instant with targeted invalidation.** Cached destinations serve instantly, but mutations (completing a study session, adding cards) explicitly invalidate/refresh so dashboard due-counts + habitat state are correct on landing. No always-refetch; no visibly self-correcting numbers.

### Claude's Discretion
- Which components to split/convert per route, chunk-attribution method, and the order routes are attacked (worst-first vs shared-chunks-first).
- Exact placeholder implementation, prefetch mechanics (default vs explicit vs hover-triggered), and the targeted-invalidation mechanism (router.refresh vs revalidation tags — per what Next 16 docs prescribe).
- The route-filter flag design for `measure-cwv.mjs` and the nav-timing instrumentation details (markers, content-visible signal).

### Folded Todos
- **task_d326ebac — "13-perf INP-on-dev-server follow-up"** (STATE.md carried tech debt / ROADMAP backlog): gate the existing INP assertions in `e2e/13-perf.spec.ts` to prod-build-only runs. Folds in because D-14 already extends that exact file and runs it against a local prod build — a few lines while in there; clears the v4.0 backlog item.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — §"Performance — Optimize": PERF-03 (gates + before/after discipline) and PERF-04 (instant warm nav via Playwright) — authoritative requirement text
- `.planning/ROADMAP.md` — §"Phase 17: Performance optimization": goal + the four success criteria (incl. criterion 4: Phase 15 harness still passes)

### The immutable baseline (the "before" for every diff)
- `.planning/phases/16-performance-baseline-measure/baseline/16-BASELINE-SUMMARY.md` — cross-route table (mobile Perf 79–86, bundle 526–1111 KB, all "bundle")
- `.planning/phases/16-performance-baseline-measure/baseline/{dashboard,study,deck-new-card,deck-browse}-baseline.md` — per-route medians, chunk fingerprints, bottleneck classification
- `.planning/phases/16-performance-baseline-measure/baseline/*-runs.json` — raw run data for exact machine diffing. **NEVER edit anything under `baseline/`** (commit `ab6f1f3`).

### Measurement harness (reused + extended this phase)
- `scripts/measure-cwv.mjs` — the warm-prod Lighthouse harness (n=6, run-1 discard, cookie auth with prod `Origin` header, self-cleaning `*test.local`); gains a route filter per D-09; ~28 min full run, sequential only, needs `DATABASE_URL` exported
- `scripts/measure-cwv-lib.mjs` + `scripts/__tests__/` — pure lib (median/extractMetrics/getBundleKb/classifyBottleneck/renderRouteReport) with vitest coverage
- `.planning/phases/16-performance-baseline-measure/16-CONTEXT.md` — the locked measurement methodology (D-05 warm-prod-only, D-06 medians/mobile-basis) that this phase's before/afters must follow

### Regression guards
- `scripts/qa-run.mjs` + `scripts/qa-lib.mjs` — Phase 15 core-journey harness (criterion-4 proof). Gotcha: qa-lib.mjs exits at module load without `DEBUG_CHEAT_SECRET` — never import it from the perf harness
- `e2e/13-perf.spec.ts` — the Playwright navigation/CWV pattern PERF-04 extends; also receives the folded INP prod-build-only fix (task_d326ebac)
- `scripts/cleanup-test-users.mjs` — `*test.local` self-clean (standalone runs need `CLEANUP_DB_URL`)

### Framework truth
- `AGENTS.md` → `node_modules/next/dist/docs/` — **this Next.js 16 differs from training data**; research must verify App Router caching/prefetch/RSC guidance against the shipped docs before locking approaches

### Prior perf art (precedent for bundle-cutting)
- `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-REAL.md` (+ `13-PERF.md`, `13-PERF-FIX-ATTEMPT-1.md`) — how `/habitat` went CWV-green: the −900 KB three.js removal and warm-prod methodology origin

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/measure-cwv.mjs` / `measure-cwv-lib.mjs`: the before/after instrument — extend with a route filter, do not rebuild.
- `e2e/13-perf.spec.ts`: working PerformanceObserver-based per-route capture — the PERF-04 nav gate builds on it.
- `npm run qa:run` / `qa:cleanup` / `test:e2e`: the correctness gates for D-10.
- `src/components/habitat-scene.tsx` + `habitat-3d-canvas.tsx`: the only two `next/dynamic` usages in the app — the existing code-splitting precedent (and a candidate dead-weight audit target given `three` sits in runtime deps).

### Established Patterns
- Warm-prod medians, n≥6 with run-1 discard, mobile as the gate basis, never cold previews (Phases 13.1/16 — binding).
- QA/test users on `*test.local`, self-cleaning; hosted-DB writes gated by the auto-mode classifier; Drizzle `db:push` (never `db:migrate`).
- `scripts/*.mjs` Node-ESM convention; biome scoped to touched files; e2e uses structural selectors (Phase 21+ convention).
- Motion 12 animates 6 components (`study-session`, `card-list`, `study-card`, `level-up-overlay`, `ac-progress`, `habitat-teaser`) — the D-05 swap-where-identical latitude applies here.

### Integration Points
- The four route trees under `src/app/(protected)/` (dashboard, study, deck/new-card, deck/browse) — near-zero code-splitting today.
- Root layout / providers / fonts / auth client — the ~9 shared chunks all four routes (plus `/habitat` and auth screens) load; D-08 blast-radius rules apply.
- `package.json` scripts (`measure:cwv`, `qa:run`, `test:e2e`) — cadence hooks for D-09/D-10.

</code_context>

<specifics>
## Specific Ideas

- Josh's standing directive for tradeoffs this phase: **"whichever is better for mobile apps"** — when options trade off, pick the mobile-web best practice (he twice delegated to the mobile-best recommendation: loading policy and RSC latitude).
- Two explicit checkpoint triggers are wired into the phase: gate-vs-fidelity conflicts (D-04) and experimental Next flags (D-07). Everything else runs autonomously against the locked decisions.
- Perceived speed defined by the RAIL "instant" bar: real content ≤100 ms — skeletons don't get credit (D-15).

</specifics>

<deferred>
## Deferred Ideas

- **Designed per-section skeleton states** — declined for this phase (D-03 uses one simple shimmer style); revisit only if the simple placeholders look wrong in practice.
- **Browser-Back navigation gating** — declined (D-13); Next's client cache handles it. Revisit in Phase 18 only if field data shows back-nav pain.
- Everything else stayed within phase scope; PERF-05/06 (field validation, one-command re-cert) remain Phase 18.

</deferred>

---

*Phase: 17-performance-optimization*
*Context gathered: 2026-07-02*
