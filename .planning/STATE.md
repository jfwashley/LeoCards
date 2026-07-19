---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Performance & QA
status: executing
stopped_at: Completed 25-03-PLAN.md -- AccountDetailsCard + AccountLogoutSection (D-05/D-06/D-07, ACC-04); all 4 files + SUMMARY committed, full tsc/vitest/biome green
last_updated: "2026-07-19T17:20:54.184Z"
last_activity: 2026-07-19
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 18
  completed_plans: 16
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 25 — my-account

## Current Position

Milestone: v3.0 Performance & QA (resumed 2026-06-25 after v4.0 Daybreak shipped)
Phase: 25 (my-account) — EXECUTING
Plan: 4 of 5
Status: Ready to execute
Last activity: 2026-07-19

Progress (v3.0): [██████████] 96% (Phase 17 all 5 plans complete — PERF-04 accepted-miss, phase closed 2026-07-19; Phase 16's immutable warm-prod baseline committed, PERF-01/PERF-02 satisfied, PERF-03/PERF-04 satisfied)

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans
- ✅ v4.0 Daybreak (2026-06-24) — Phases 19-24, 23 plans, 28 requirements (DSY/ONB/STU/DSH/ADC/BRW/HAB) satisfied; tagged v4.0, archived to milestones/v4.0-*

## Milestone Note

v3.0 was paused after Phase 14 to ship the v4.0 Daybreak UI redesign (Phases 19-24). v4.0 is complete + archived; v3.0 is now resumed to finish Phases 15-18. Phase 16 is complete (immutable warm-prod baseline committed). **Phase 17 is now complete (2026-07-19, PERF-04 accepted-miss)** — see [[project_leocards_v3_perf_qa_pending]] reminder for update. **Phase 18 remains unbuilt.**

## Accumulated Context

### Roadmap Evolution

- Phase 25 added (2026-07-12): My Account — dashboard-accessible, Daybreak-styled account section: view account details, change password, log out, delete account. This is the account/settings page explicitly deferred out of v4.0 Daybreak scope. Depends on Phase 24 (Daybreak design system); independent of Phases 17/18.

### Decisions (v3.0-relevant)

- Phase 15-04: qa-03 manifest path = scripts/qa-manifest-qa03.json (fixed default, overridable via RESUME_MANIFEST env); Phase B shift = max(resumeAfter−now+1s, 90_000ms) fast-path.
- Phase 15-04: qa-05 pause/unpause called inline (raw fetch) — qa-lib has no pause helper. Decay epsilon ±0.01. Round-2 grades submit "n2t" directly (directionForRound(2) returns "either", not valid HTTP).
- Phase 15-04: 3 vitest test failures in cooldown-config.test.ts are pre-existing (Phase 14 plan 14-01); not caused by this plan's .mjs scripts.
- Phase 15-05: qa-run.mjs uses time-shift fast path (option a) — single STUDY_COOLDOWN_MINUTES=1 server boot covers all five journeys; qa-03-B uses --resume with built-in fast-path shift calculation. No new packages; only npm script entries added.
- Phase 16-01: split pure logic into measure-cwv-lib.mjs (zero imports) so Plan 02's side-effectful harness (DATABASE_URL guard + puppeteer.launch) never breaks vitest collection — keeps decision logic (median/classifier/bundle-parse) unit-testable in isolation with zero live credentials or network access required.
- Phase 16-02: measure-cwv.mjs inlines (not imports) qa-lib.mjs's auth/provisioning helpers, adding the required prod `Origin` header — qa-lib.mjs exits at module load without DEBUG_CHEAT_SECRET, and the perf harness never calls `/api/debug/*`, so importing it would crash the harness at startup for no benefit.
- Phase 16-02: bottleneck classification uses MOBILE medians as the basis (not desktop) — mobile is the CWV-constrained profile per the D-06/13.1 precedent from Phase 13.1's `/habitat` CWV work.
- Phase 16-03: split the harness-fix commit from the baseline-docs commit — three Rule-1 bug fixes to scripts/measure-cwv.mjs (getUserId prod-auth, lighthouse named import, /study deck param) are code changes kept separate from the immutable, never-re-edited baseline artifacts, for a clean audit trail.
- Phase 16-03: getUserId()'s broken prod round-trip was removed, not patched — signUp() now reads userId directly from the sign-up response body instead of a second /api/auth/get-session call that was sending the wrong cookie name to prod.
- Phase 16-03: all four key routes classify as "bundle" bottleneck (526-1111 KB first-load JS); PERF-01 and PERF-02 are complete — the immutable warm-prod baseline is committed and Phase 17 is unblocked.
- Phase 17-01: resolveRoutes treats "/habitat" as a UNION-addable opt-in (not a subset filter) — ROUTE_FILTER=/habitat alone must return exactly ["/habitat"], which a plain intersection against the 4 key routes would incorrectly return [] for (D-11 spot-check requirement).
- Phase 17-01: resolveOutDir defaults to a NEW .planning/phases/17-performance-optimization/measurements/ directory and is structurally incapable of defaulting to the Phase 16 baseline path — PHASE_OUT_DIR is the only override. Verified: git status --porcelain under 16-performance-baseline-measure/baseline/ stayed empty across all 3 tasks.
- Phase 17-01: DaybreakShimmer ships with zero hooks/client directive (RSC-safe) since a placeholder never needs interactivity; e2e/perf-markers.ts only scaffolds PERF_READY_ATTR/waitForPerfReady/IS_PROD_BUILD this plan — no route is wired with data-perf-ready yet (explicitly Wave 3/4 work).
- Phase 17-02: three/@types/three moved to devDependencies (build-time-only classification, 0 KB client-bundle delta by design); two confirmed-dead files deleted (habitat-widget.tsx, habitat-3d-widget-image.tsx) after tsc --noEmit confirmed zero real call sites.
- Phase 17-02: next.config.ts left unchanged — every stable candidate (serverExternalPackages) has no applicable problem in this codebase; every applicable-looking option (optimizePackageImports, cssChunking, inlineCss, staleTimes) is version:experimental per shipped Next 16 docs frontmatter, correctly excluded without a D-07 checkpoint since none were ever live candidates.
- Phase 17-02: D-08 audit of src/app/layout.tsx + src/lib/auth-client.ts concluded both are already optimal (no unnecessary client boundary, no heavy import) — no code change lands; the actual auth session-gate lives in src/app/(protected)/layout.tsx (sibling file), confirmed unchanged.
- Phase 17-02: shared floor re-measured post-Wave-2 at 514.72 KB / 9 chunks — unchanged from the Phase 16 baseline, confirming the D-05 relocation was 0 KB delta as expected. This is Wave 3's before-reference.
- Phase 17-02: MSYS_NO_PATHCONV=1 required when passing ROUTE_FILTER=/habitat (or any bare-leading-slash env value) through Git Bash on Windows — MSYS silently rewrites it to a Windows path, causing the route filter to match nothing and the harness to exit 0 with an empty summary (no exception thrown). Flag for any future .mjs harness invocation on this platform.
- Phase 17-03: HabitatHero converted to RSC ("use client" removed, zero other change); CountdownTimer extracted as a standalone client leaf; dashboard/page.tsx now server-renders the entire static shell directly, hydrating only CountdownTimer + a new DashboardHeader client leaf (AppHeader's non-serializable onDeckChange callback — the exact contingency the plan's own action text anticipated, not an unplanned architectural change).
- Phase 17-03: D-02 resolved without new media — the Daybreak dashboard mock (design/handoff-daybreak/daybreak-dashboard.jsx) shows a fully static medallion and LCP already passes (1816ms), so the existing static approach satisfies D-02 (D-12 no gold-plating).
- Phase 17-03: D-04 checkpoint resolved by Josh — Accept, continue to Wave 4. Re-measurement showed no material change (mobile TBT 524ms/Perf 86 vs. the Phase 16 baseline's 518ms/86, both still failing their gates; LCP 1816ms/CLS 0 still pass), proving the TBT weight lives in the shared-chunk floor (CardList's motion/react + lucide-react, auth, providers) that Wave 4 targets directly. The dashboard gate remains explicitly open pending Wave 4 + the phase-end full run; no fidelity change was made or approved.
- Phase 17-04: D-04 accepted-miss — /deck/new-card TBT 338ms vs ≤200 gate accepted (Perf 92 passes, 62% TBT cut from 891, heaviest route 789KB); other 3 routes fully certify.
- Phase 17-05 Tasks 1-2 (committed, not yet certified): extended e2e/13-perf.spec.ts with the 6 D-13 hub-and-spoke nav-timing tests (prod-build-gated via PERF_PROD_BUILD, D-14) + task_d326ebac INP prod-gating; wired D-17 router.refresh() after study-completion push() (habitat celebrate + "Back to deck"); D-16 recorded as "Link default prefetch already sufficient" (no code change) — see Blockers/Concerns below, this decision is now contradicted by measured evidence and needs revisiting. card-add already satisfied via existing revalidatePath() Server Actions (no change). Rule 3 deviation: added a "My deck" back-link to BrowseTiles (word-list-browser.tsx) — the page previously had zero link back to /dashboard.
- Phase 17-05: PERF-04 accepted-miss — ≤100ms instant-nav unreachable with stable APIs (dynamic RSC routes = server round trip per nav; measured 1.3-8s medians on local prod build). Carried to Phase 18/backlog; future paths = loading.tsx (needs D-15 relax) or PPR/CacheComponents (needs D-07). D-16 "default prefetch sufficient" corrected to insufficient-for-dynamic-routes.
- Phase 25-01: requestEmailChange (D-07) and deleteAccount (D-14) are custom server actions that deliberately bypass better-auth's built-in changeEmail/deleteUser — changeEmail anti-enumeration-masks an already-taken email (conflicts with the honest "already in use" error this app wants), and deleteUser requires a session fresher than 24h without a password (conflicts with D-12's no-password-reentry gate for a daily-habit app). Both reuse the existing `verification` table with a deterministic `change-email:{userId}` identifier; zero schema changes.
- Phase 25-01: Rule 1 fix — wrapped the Resend send in try/catch (not just `.catch()` on the send promise). `new Resend(undefined)` throws synchronously when RESEND_API_KEY is unset (the local/CI default), which a `.catch()` chained onto a call that never happens cannot protect against. Caught via TDD GREEN using the real, unmocked `resend` package.
- Phase 25-01: cast the userId parsed from the verification identifier suffix `as UserId` in verify-email/route.ts — required by strict + noUncheckedIndexedAccess tsc against user.id's branded column type; RESEARCH's illustrative snippet omitted this cast.
- Phase 25-01: known SDK quirk — `gsd-sdk query state.update-progress` no-ops on this project's `Progress (v3.0): [...]` line (regex expects literal `**Progress:**` or `^Progress:`, not `Progress (v3.0):`); left unfixed as out-of-scope tooling, noted here for the next plan's executor.
- Phase 25-02: SDK data-integrity bug found and repaired — `gsd-sdk query state.update-progress` doesn't just no-op on the `Progress (v3.0): [...]` status line (line 34); its regex also matches the FIRST occurrence of the literal substring `**Progress:**` anywhere in the file, including inside the Phase 25-01 decision entry above that merely quotes that string while documenting the no-op. Running `state.update-progress` truncated that decision entry mid-sentence and spliced in a `[████████░░] 83%` progress-bar fragment. Restored the entry to its original text here; flagging so future executors verify STATE.md content (not just the command's own JSON return value) after calling `state.update-progress` on this project.
- Phase 25-02: AccountDirtyProvider/useAccountDirty (this project's first hand-authored React Context) stores ONLY a derived boolean, never the typed password text (D-04 leak guard, T-25-02-B) — passwordDirty is derived reactively via react-hook-form's watch() + a single useEffect rather than wrapping each field's onChange, so `reset()` on successful save automatically drives it back to false with no separate reset call needed.
- Phase 25-02: change-password-card.tsx mirrors card-list.tsx's exact panelMounted + safety-net setTimeout accordion pattern (not a simpler always-mounted approach) so the collapsed panel stays out of the DOM/tab-order in real browsers and still unmounts reliably in jsdom, which never fires animationend; `gsd-sdk query state.add-decision` no-ops on this project's "### Decisions (v3.0-relevant)" heading (confirmed via `added: false`) — entries hand-edited directly, consistent with the existing project gotcha note.
- Phase 25-03: AccountDetailsCard resolves Assumption A5 symmetrically — `if (!emailChanged) show "Details updated" fade` (not gated on nameChanged) — so a no-op save and a name-only save both fade quietly, while ANY email change (alone or combined with a name change) shows the server-persisted pending banner alone, never both signals.
- Phase 25-03: `Card`/`ACBanner` (Daybreak atoms) only accept `{children,className}`/`{kind,children}` — neither forwards `data-testid`. Wrapped both in a plain `<div data-testid="...">` rather than widening either shared atom, extending the exact technique 25-PATTERNS.md already prescribed for ACBanner to Card too (kept both atoms and this plan's files_modified scope untouched).
- Phase 25-03: two TS-only test fixes, both avoiding `!` per biome's noNonNullAssertion rule — (1) `mock.invocationCallOrder[0]` is `number|undefined` under noUncheckedIndexedAccess, guarded with an explicit `if (...===undefined) throw` before comparing; (2) a `let resolveSignOut | null` reassigned inside a mockImplementation's nested Promise executor and later null-checked collapsed to TS's `never` at the call site (known closure/control-flow-narrowing limitation) — sidestepped by simplifying to a never-resolving-promise test instead of manual deferred resolution.
- Phase 25-03: confirmed (again) `gsd-sdk query state.add-decision` no-ops on this project's "### Decisions (v3.0-relevant)" heading (`added: false`, "Decisions section not found" — the regex needs a bare "Decisions"/"Decisions Made" heading, not "Decisions (v3.0-relevant)"); `state.record-metric`/`state.record-session`/`state.advance-plan` all verified safe and correct via git diff this session — only `state.update-progress` and `state.add-decision` are the known-broken pair on this project.

- Phase 14 (QA observability foundations, complete 2026-06-17) is the OBSERVABILITY SURFACE Phase 15's harness builds on: QA-mode cookie + `readQaAuth()` gate, `STUDY_COOLDOWN_MINUTES` env precedence (short non-zero cooldowns), `/debug` live per-card SRS state table (real data), `QaStateBadge` (`R0·n2t` style) RSC-gated onto study + dashboard, and a prod-parity gating e2e (no badges / QA endpoints 404 when secret unset).
- Phase 15 must drive the REAL pipeline (app's own API routes / browser flows), NEVER the `/debug` virtual override (that override is the cheat console for visual states, not a journey harness).
- DB workflow: this project uses Drizzle `db:push` (NOT `db:migrate` — the migrations journal is empty); hosted-DB writes gated by the auto-mode classifier.
- All QA/test users use the `*test.local` domain so `scripts/cleanup-test-users.mjs` removes them (QAJ-06).

### Blockers/Concerns

None blocking. Phase 15 needs careful time-resumable manifest design (QAJ-03) + a QA-gated time-shift for decay (QAJ-05) without real multi-day waits.

**Non-blocking flag (Phase 17-02):** the D-11 `/habitat` regression spot-check measured mobile Perf 81 / TBT 777ms, down from the Phase 13.1-documented Perf 96 (2026-05-29). Neither of 17-02's two tasks touch `/habitat`'s render path — the regression matches the same degraded-bundle pattern already seen across all 4 key routes in the Phase 16 baseline, suggesting shared-chunk drift accumulated during the intervening v4.0 Daybreak phases (19-24). Out of scope to fix in Phase 17 (`/habitat` gets only a regression spot-check per D-11); evidence committed at `.planning/phases/17-performance-optimization/measurements/habitat-baseline.md` for any future investigation. **Re-measured 2026-07-19 (17-05 checkpoint):** mobile Perf 93 / TBT 308ms — improved from the 17-02 flag, still below the Phase 13.1 original; non-regressed.

**RESOLVED — 17-05 checkpoint (Josh, 2026-07-19):** PERF-04's D-15 gate ("real content visible ≤100ms median, prefetch-warm") measured 1.3-8s across all 6 hub-and-spoke nav pairs against a local prod build — roughly 20-80x over the bar. Root cause (per `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`): all 4 key routes are genuinely dynamic Server Components (session + DB reads), and the docs' own prefetching-behavior table states dynamic pages are "not [fully] prefetched unless loading.js" and have "Client Cache TTL: Off, unless enabled [experimental staleTimes]" — so every nav is a real, unavoidable server round trip under the stable API surface. **Verdict: PERF-04 = ACCEPTED MISS, phase closed.** The instant-nav goal carries to Phase 18/backlog; candidate future paths recorded but NOT chosen this phase: (a) `loading.tsx` shells (would require relaxing D-15's skeletons-don't-count bar) or (b) Cache Components/PPR (experimental, needs a dedicated D-07 checkpoint). D-16 ("default prefetch sufficient") is corrected to measured-wrong for dynamic routes. Gates that DID pass: qa:run 5/5 (criterion-4, zero residue, 19 stale test users swept); /habitat D-11 non-regressed (mobile Perf 93/TBT 308ms vs previously-flagged 81/777ms); PERF-03 after-record = the committed 2026-07-17T23:07Z full run (3 of 4 routes certify, new-card D-04 accepted-miss per 17-04); immutable Phase 16 baseline untouched across the whole phase; task_d326ebac (INP prod-build-only) cleared. Three items parked as manual UAT — see `.planning/phases/17-performance-optimization/17-HUMAN-UAT.md`. Deploy HELD — Josh will deploy manually later; prod still runs the 2026-07-15 deployment, Phase 17 Wave 4/5 code is not yet live.

## Carried Tech Debt

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.0 UAT | 10-HUMAN-UAT.md (offline vision eval reference-set) | Partial | v2.0 close |
| v2.0 UAT | 11-HUMAN-UAT.md (live browser walkthrough) | Partial | v2.0 close |
| v4.0 UAT | 20-24 HUMAN-UAT.md interaction/animation/live items | Partial | v4.0 close (visual UAT done 2026-06-24) |
| v4.0 Perf | 13-perf INP-on-dev-server follow-up (task_d326ebac) | Cleared 2026-07-19 (17-05 Task 1 — INP assertion now IS_PROD_BUILD-gated) | v4.0 close |

## Session Continuity

Last session: 2026-07-19T17:19:01.312Z
Stopped at: Completed 25-03-PLAN.md -- AccountDetailsCard + AccountLogoutSection (D-05/D-06/D-07, ACC-04); all 4 files + SUMMARY committed, full tsc/vitest/biome green
Resume file: None

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 16 P01 | 12min | 2 tasks | 3 files |
| Phase 16-performance-baseline-measure P02 | 10min | 3 tasks | 2 files |
| Phase 16 P03 | 8min | 3 tasks | 15 files |
| Phase 17 P01 | 40min | 3 tasks | 8 files |
| Phase 17 P02 | 15min | 3 tasks | 5 files |
| Phase 17 P03 | 25min | 3 tasks | 9 files |
| Phase 17 P04 | n/a (continuation close-out) | 2 tasks + checkpoint | 22 files |
| Phase 17 P05 | n/a (continuation close-out) | 2 tasks + checkpoint | 6 files |
| Phase 25 P01 | 20min | 3 tasks | 6 files |
| Phase 25 P02 | 18min | 2 tasks | 4 files |
| Phase 25 P03 | 24min | 2 tasks | 4 files |
