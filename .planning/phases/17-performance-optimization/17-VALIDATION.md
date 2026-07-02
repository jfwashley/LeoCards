---
phase: 17
slug: performance-optimization
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-02
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.1 (unit) + Playwright ^1.58.2 (e2e) + Lighthouse ^13.3.0 (warm-prod CWV via measure-cwv.mjs) |
| **Config file** | `playwright.config.ts` (root; baseURL http://localhost:3000, webServer undefined); vitest uses package.json defaults (no root vitest.config); `.mjs` scripts are OUTSIDE tsconfig — validate with `node --check`, never `tsc` |
| **Quick run command** | `npm test` (full vitest run) OR `npx vitest run <file>` for a single-file quick check |
| **Full suite command** | `npm test` (~2079 pass / 6 skip) + `npm run test:e2e` (per-project: `--project=web` then `--project=mobile`, fresh dev server on :3000) + `npm run qa:run` (Phase 15 core-journey harness, fresh dev server) + `DATABASE_URL=... node scripts/measure-cwv.mjs` (Lighthouse, needs fresh build) |
| **Estimated runtime** | vitest ~30-60s; e2e per-project a few min; route-scoped measure-cwv ~7 min/route (mobile-first); full 4-route×2-preset ~28 min (sequential, run_in_background) |

---

## Sampling Rate

- **After every task commit:** `npm test` (or `npx vitest run <touched-test-file>`) + `npx tsc --noEmit` (catches dead-import breaks per RESEARCH Pitfall 6); for `.mjs` edits `node --check <file>` instead of tsc; scoped `npx biome ci <touched files>` only (repo is never globally biome-clean, ~429 pre-existing errors)
- **After every plan wave:** full `npm run test:e2e` (per-project web then mobile, fresh dev server) + route-scoped `measure-cwv.mjs` for the wave's affected route(s) (D-09) + `npm run qa:run` on any wave touching study/SRS/data paths or moving client→RSC boundaries (D-10). Run full `npx tsc --noEmit` AGAIN after any wave that edits an e2e spec (biome's no-`!` rule can push a `box?.y` into an argument position → tsc error)
- **Before `/gsd:verify-work`:** full 4-route×2-preset `measure-cwv.mjs` (official after-record vs Phase 16 baseline) + PERF-04 6-nav gate against a local prod build + `npm run qa:run` (criterion-4) + `/habitat` D-11 spot-check, all green
- **Max feedback latency:** ~60s for the per-task unit+type gate; longer measured/e2e gates run at wave boundaries and phase end (via run_in_background for >10-min runs)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | PERF-03 (D-09) | T-17-01-01 | OUT_DIR never defaults to the immutable Phase 16 baseline path | unit + node-check | `node --check scripts/measure-cwv.mjs && node --check scripts/measure-cwv-lib.mjs && npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` | ✅ (extend existing test) | ⬜ pending |
| 17-01-02 | 01 | 1 | PERF-03 (D-03) | T-17-01-02 | N/A (presentational atom, no data) | unit | `npx vitest run src/components/daybreak/__tests__/shimmer.test.tsx && npx tsc --noEmit` | ❌ W0 (new shimmer.tsx + test) | ⬜ pending |
| 17-01-03 | 01 | 1 | PERF-04 (D-14/D-15) | T-17-01-02 | N/A (test scaffolds) | unit + type | `npx vitest run src/components/deck-view.test.tsx && npx tsc --noEmit` | ⚠️ W0 (deck-view.test.tsx exists — add baseline assertions; e2e/perf-markers.ts is new) | ⬜ pending |
| 17-02-01 | 02 | 2 | PERF-03 (D-05) | T-17-02-SC | Dead-code deletion proven by tsc; three is build-time-only | type + unit | `npx tsc --noEmit && npm test` | ✅ (existing) | ⬜ pending |
| 17-02-02 | 02 | 2 | PERF-03 (D-07/D-08) | T-17-02-01, T-17-02-02 | Zero experimental keys in next.config; auth session-gate preserved | type + build | `npx tsc --noEmit && npm run build` | ✅ (existing) | ⬜ pending |
| 17-02-03 | 02 | 2 | PERF-03 (D-11) | T-17-02-03, T-17-02-04 | Harness writes to Phase-17 dir; /habitat non-regressed | measured-run (Lighthouse) | `npm run build && test $(grep -rl "three" .next/static/chunks/*.js \| wc -l) -eq 0` + `DATABASE_URL=... ROUTE_FILTER=/habitat node scripts/measure-cwv.mjs` (run_in_background) | ✅ (harness, route-filtered by 17-01) | ⬜ pending |
| 17-03-01 | 03 | 3 | PERF-03 (D-06) | T-17-03-02 | HabitatHero RSC + CountdownTimer leaf; no illegal server→client import (build-caught) | type + unit | `npx tsc --noEmit && npx vitest run src/components/deck-view.test.tsx` | ⚠️ (deck-view.test.tsx baseline from 17-01) | ⬜ pending |
| 17-03-02 | 03 | 3 | PERF-03 (D-06/D-02) | T-17-03-01, T-17-03-02 | readQaAuth cooldownUntil gate preserved; server/client boundary correct | type + build + unit | `npx tsc --noEmit && npm run build && npx vitest run src/components/deck-view.test.tsx` | ⚠️ (baseline test) | ⬜ pending |
| 17-03-03 (checkpoint) | 03 | 3 | PERF-03 (D-04/D-10) | T-17-03-03 | Route-scoped measurement to Phase-17 dir; baseline untouched | measured-run + human-verify | `DATABASE_URL=... ROUTE_FILTER=/dashboard node scripts/measure-cwv.mjs` (run_in_background) — dashboard mobile TBT ≤200 / Perf ≥90 vs baseline 518/86, else D-04 | ✅ (harness) | ⬜ pending |
| 17-04-01 | 04 | 4 | PERF-03 (D-06/D-03) | T-17-04-01, T-17-04-02 | WR-01 ?topic= validation preserved; server/client boundary correct | type + build | `npx tsc --noEmit && npm run build` | ✅ (existing) | ⬜ pending |
| 17-04-02 | 04 | 4 | PERF-03 (D-05) | T-17-04-SC | Reduced-motion preserved on every swap; load-bearing Motion untouched | type + unit | `npx tsc --noEmit && npm test` | ✅ (existing component tests, e.g. bw-atoms.test.tsx) | ⬜ pending |
| 17-04-03 (checkpoint) | 04 | 4 | PERF-03 (D-04/D-10) | T-17-04-03 | Route-scoped measurements to Phase-17 dir; baseline untouched | measured-run + human-verify | `DATABASE_URL=... ROUTE_FILTER=/study,/deck/new-card,/deck/browse node scripts/measure-cwv.mjs` (run_in_background) — each route TBT ≤200 / Perf ≥90 vs baselines 712/82, 891/79, 608/84, else D-04 | ✅ (harness) | ⬜ pending |
| 17-05-01 | 05 | 5 | PERF-04 (D-13/14/15) + task_d326ebac | T-17-05-01, T-17-05-04 | Nav gate + INP gated to PERF_PROD_BUILD; afterAll stale-path guard preserved | type + e2e-list | `npx tsc --noEmit && npx playwright test e2e/13-perf.spec.ts --list` | ✅ (extend existing spec) | ⬜ pending |
| 17-05-02 | 05 | 5 | PERF-03/04 (D-16/D-17) | T-17-05-02 | router.refresh() invalidation (no experimental API); fresh counts on landing | type + unit + build | `npx tsc --noEmit && npm test && npm run build` | ✅ (existing) | ⬜ pending |
| 17-05-03 (checkpoint) | 05 | 5 | PERF-03/PERF-04 + Criterion 4 (D-04/D-10/D-11) | T-17-05-01, T-17-05-03 | Final run to Phase-17 dir; baseline untouched across whole phase | measured-run + e2e + qa + human-verify | full `DATABASE_URL=... node scripts/measure-cwv.mjs` (4-route×2-preset, run_in_background) + `next build && next start` then `PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts` (per-project) + `npm run qa:run` | ✅ (all harnesses) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Known flaky tests (isolate before treating as a regression):** `cooldown-config.test.ts` and `bw-atoms.test.tsx` are parallel-load 5s-timeout flakes — re-run the single file (`npx vitest run <file>`) before concluding a regression.

---

## Wave 0 Requirements

The pattern map confirmed 3 genuinely-new patterns (no repo analog). These are the Wave-0 scaffolds, all landed in Plan 17-01 before any optimization:

- [ ] `src/components/daybreak/shimmer.tsx` + `src/components/daybreak/__tests__/shimmer.test.tsx` — the single D-03 shimmer atom (no Skeleton/shimmer/loading.tsx exists anywhere in the repo) + its `@keyframes shimmer-pulse` in `globals.css`
- [ ] `e2e/perf-markers.ts` — the D-15 content-visible signal (`PERF_READY_ATTR="data-perf-ready"` + `waitForPerfReady(page, timeoutMs)`) and the D-14 prod-vs-dev detection gate (`IS_PROD_BUILD = process.env.PERF_PROD_BUILD === "1"`); no existing "is real content visible yet" concept in `e2e/13-perf.spec.ts`, no prod-vs-dev signal in `playwright.config.ts`
- [ ] `scripts/measure-cwv.mjs` route-filter (`resolveRoutes`) + OUT_DIR redirect (`resolveOutDir`) with logic extracted to `measure-cwv-lib.mjs` + vitest coverage — must land before ANY route-scoped re-measurement to avoid the Pitfall 1 baseline-overwrite failure mode
- [ ] `src/components/deck-view.test.tsx` baseline assertions — the file exists (Phase 22); add pre-split behavior assertions BEFORE the 17-03 D-06 split so the split is provably behavior-preserving

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Measured warm-prod Lighthouse gates (LCP/TBT/CLS/Perf) | PERF-03 | Lab measurement against live Vercel prod; the number IS the gate, not a boolean test | Run route-scoped `measure-cwv.mjs` (DATABASE_URL exported, run_in_background); compare mobile medians to the Phase 16 baseline; each route TBT ≤200 / Perf ≥90 / LCP ≤2500 / CLS ≤0.1 |
| D-04 gate-vs-fidelity decision | PERF-03 (D-04) | Human product decision — trade a specific visible change for a gate only Josh can approve | At the 17-03/17-04/17-05 checkpoints: if a route provably cannot reach TBT ≤200 / Perf ≥90 within D-01..03 fidelity, present measured evidence + the specific proposed visible change; Josh approves/vetoes per case |
| D-07 experimental-flag decision | PERF-03 (D-07) | Any Next 16 docs-flagged experimental option needs Josh approval with before/after evidence | If an experimental next.config option is wanted, PAUSE with measured evidence + the specific flag; do not land without approval |
| D-02 poster-first resolution | PERF-03 (D-02) | Requires reading the Daybreak design handoff to decide if the dashboard hero needs NEW ambient media or the static medallion already satisfies it | At 17-03 Task 2: read `LeoCards/design/` dashboard handoff; record resolution (existing static image satisfies, LCP already 1816ms — OR design requires a new clip) |
| CSS-swap visual identity + reduced-motion (D-05) | PERF-03 (D-05) | "Indistinguishable from Motion" is a human visual judgment | At the 17-04 checkpoint: confirm study-session fade / card-list accordion / ac-progress bar / habitat-teaser glow look identical to the Motion originals, with reduced-motion on |
| D-17 landing freshness | PERF-03/04 (D-17) | Human must confirm due-counts/habitat are correct (not stale, not self-correcting) on landing after a mutation | At the 17-05 checkpoint: complete a study session, land on dashboard/habitat, confirm fresh counts; add a card, confirm fresh count |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (checkpoints are human-verify by design; their measured commands are listed above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every auto task has a per-task command; checkpoints follow auto tasks with automated gates)
- [x] Wave 0 covers all MISSING references (shimmer, perf-markers, measure-cwv route-filter, deck-view baseline — all in Plan 17-01)
- [x] No watch-mode flags (all `vitest run` / `playwright test`, never `--watch`)
- [x] Feedback latency < 60s for the per-task unit+type gate
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
