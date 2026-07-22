---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Performance & QA
status: executing
stopped_at: Completed 26-04-PLAN.md
last_updated: "2026-07-22T00:00:14.000Z"
last_activity: 2026-07-22
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 26
  completed_plans: 25
  percent: 96
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 26 — performance-batch

## Current Position

Milestone: v3.0 Performance & QA (resumed 2026-06-25 after v4.0 Daybreak shipped)
Phase: 26 (performance-batch) — EXECUTING
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-07-22

Progress (v3.0): [████████░░] 84% (Phases 14/15/16/17/25 complete — Phase 17 closed 2026-07-20 w/ PERF-04 accepted-miss; Phase 25 My Account closed 2026-07-20 w/ ACC-01..06 satisfied; Phase 26 PERF-07 (26-02) + PERF-08 (26-03) + PERF-09 (26-01) + PERF-10 (26-04) complete, PERF-11 remains; Phase 18 PERF-05/06 runs last so its re-cert gate certifies the optimized code)

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans
- ✅ v4.0 Daybreak (2026-06-24) — Phases 19-24, 23 plans, 28 requirements (DSY/ONB/STU/DSH/ADC/BRW/HAB) satisfied; tagged v4.0, archived to milestones/v4.0-*

## Milestone Note

v3.0 was paused after Phase 14 to ship the v4.0 Daybreak UI redesign (Phases 19-24). v4.0 is complete + archived; v3.0 is now resumed to finish Phases 15-18. Phase 16 is complete (immutable warm-prod baseline committed). **Phase 17 is now complete (closed 2026-07-20, PERF-04 accepted-miss)** and **Phase 25 My Account is complete (2026-07-20, ACC-01..06)** — see [[project_leocards_v3_perf_qa_pending]] reminder for update. **Phases 26 and 18 remain unbuilt.** Phase 26 (Performance batch, added 2026-07-21 from the re-validated Fable-5 all-phases review) runs FIRST so Phase 18's one-command re-cert gate locks in the optimized numbers as the regression baseline; v3.0 closes with Phase 18.

## Accumulated Context

### Roadmap Evolution

- Phase 25 added (2026-07-12): My Account — dashboard-accessible, Daybreak-styled account section: view account details, change password, log out, delete account. This is the account/settings page explicitly deferred out of v4.0 Daybreak scope. Depends on Phase 24 (Daybreak design system); independent of Phases 17/18.
- Phase 26 added (2026-07-21): Performance batch (PERF-07..11) — the 5 still-open items from the 2026-06-30 Fable-5 all-phases perf review, re-verified against current code 2026-07-21: study-commit db.batch, review-commit single-action multi-row insert, DeepL array batching (fixes the live >30-word 429 "Translation unavailable" bug — front-loaded as Wave 1; deployable early since main auto-deploys prod), client-side image resize ~1568px, Cache-Control immutable for /habitat/clips. Sequenced BEFORE Phase 18 so the re-cert gate certifies optimized code (Josh 2026-07-21). LazyMotion diet deferred to backlog (D-05 drag carve-out, /study Perf 99); lazy-load ImageUploadFlow already fixed (17 D-03). `gsd-sdk phase.add` misplaced the block into Backlog + skipped the checklist again — relocated manually (second occurrence, see Backlog/Upstream).

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
- Phase 25-04: `session.user.nativeLanguage` types as `string | null | undefined` despite its `defaultValue: "en"` additionalField config — normalized via a local `?? "en"`-guarded const before both the `LANGUAGE_LABELS` lookup and its own fallback use in `page.tsx`, rather than the plan's single-expression illustrative snippet (which failed `tsc`).
- Phase 25-04: `/account` page.tsx's `?verified` allow-list uses an if/else chain assigning a typed `let verified: "success" | "expired" | null`, not the plan's illustrative nested ternary — functionally identical, satisfies the same acceptance-criteria grep, avoids nested-ternary lint friction.
- Phase 25-04: **discovered a live, concurrently-running session committing to this exact working tree/branch mid-execution** (interleaved `fix(17): WR-01..04` / `docs(17)` / `style(17)` commits — a Phase-17 code-review-fix pass, not part of this plan) — one of its commits briefly swept up this plan's freshly-staged `delete-account-row.test.tsx` (later reset back out by that same session; file content verified byte-intact throughout). Every commit in this plan from that point on used an explicit trailing pathspec (`git commit -m "..." -- <files>`) rather than a bare `git commit`, and each was individually verified via `git show --stat` to contain exactly its intended file(s) — no cross-contamination in the final state. Also caused the pre-existing port-3000 dev server to serve a stale cached 404 for the brand-new `/account` route (not restarted, to avoid disrupting that session); the plan's manual smoke-test gate was run against a dedicated port-3001 server instead. Flagging for Josh: confirm whether two GSD sessions are intentionally running against this repo concurrently — `parallelization: false` in config.json governs within-phase plan execution only, not cross-session working-tree access.
- Phase 25-04: `/account` is now fully live — session-gated (307 redirect verified for unauthenticated requests), all sections stacked in the fixed D-03 order inside one `AccountDirtyProvider`. ACC-01/04/05/06 satisfied. 25-05 (header swap) can proceed.
- Phase 25-05: Header glyph swap complete (D-01) — `AccountNavButton` replaces `LogoutButton` in `app-header.tsx`'s right cluster; `logout-button.tsx` deleted with zero dangling references (grep + tsc confirmed before deletion); `e2e/01` (lines 48/70/99) and `e2e/10` (line 46) retargeted through an `account-nav-btn` -> `/account` navigation hop, preserving the "Sign out" accessible name and each assertion's original behavioral intent.
- Phase 25-05: `e2e/25-my-account.spec.ts` added — full real-pipeline coverage (reach, details render, 44px touch targets, change-password wrong+happy incl. re-login with the new password, email pending-banner, logout, delete+sign-in-rejected). New `e2e/helpers.ts` seam `getPendingEmailChangeToken(newEmail)` dynamically imports `@/db` (never at module scope, so a missing `DATABASE_URL` in the Playwright runner's env only affects this one optional assertion, not the whole suite) and mirrors `verify-email/route.ts`'s scan-and-parse technique; falls back to asserting the pending-banner state alone when no token resolves — no live inbox required either way (the round trip stays unit-covered by `route.test.ts`, 25-01).
- Phase 25-05: **Phase 25 (my-account) is now code-complete** — all four requirements (ACC-01/04/05/06) have production code and static verification in place (full `tsc --noEmit`, scoped `biome ci`, full `vitest run` at 2174/128 unchanged from 25-04, zero new deps, `src/db/schema.ts` untouched). Live e2e execution (`e2e/25-my-account.spec.ts e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` against a freshly-restarted dev server) is deferred to the orchestrator's gate, per this run's static-only executor policy.
- Phase 25-05: left `app-header.tsx`'s right-cluster `gap` at its existing `9` rather than preemptively narrowing it per UI-SPEC's conditional crowding note — analytically the 44px hit area is centered around the identical 36px visual frame, so the visible gap to `DeckSwitcher` grows (not shrinks); deferred to the orchestrator's live visual gate rather than making an unverified speculative CSS change.
- Phase 17-05 (supersedes accepted-miss): PERF-04 MET at re-baselined 850ms gate (Josh 2026-07-20) — nav outlier fixed via Neon undici 60s keep-alive + Link exit + refresh() removal; all 6 pairs ~470-690ms on local prod build; <100ms instant-nav → backlog (PPR needs D-07). Review CR-02/03 had invalidated the original 8s-artifact measurements.
- Phase 26-01: fixed the live >30-word 429 "Translation unavailable" bug (PERF-09) — `/api/translate` gained an additive `texts: string[].max(50)` array mode alongside the frozen singular `text`/`translation` contract (`.refine()` mutual-exclusivity guard); `runTranslationFanOut` now issues one batched fetch with one automatic retry, falling back to the existing per-word placeholder on total failure. First-ever test coverage for `/api/translate` added. Independently deployable (Wave 1) — `translation-form.tsx` and `e2e/04-manual-card-entry.spec.ts` untouched. Also re-confirmed `gsd-sdk query state.advance-plan` corrupts this file's frontmatter `progress:` numbers on this project (completed_phases/total_plans/completed_plans/percent all wrong after the call) and `state.update-progress` re-triggered the documented `**Progress:**`-substring-match bug, truncating the Phase 25-01 decision entry below mid-sentence again — both hand-repaired this session; add to the known-broken SDK list alongside `state.add-decision`.
- Phase 26-02: collapsed the study-commit's step-6 write phase (recall_events insert + N sequential per-card `await db.update` + habitat upsert, 1+N+1 round trips) into ONE atomic `db.batch()` call — a real single-round-trip Neon `sql.transaction()` (PERF-07). D-01 honored: WR-04's commitId idempotency machinery kept byte-identical (belt-and-braces, smallest diff); D-02 proof landed as a `batchCalls===1` unit assertion, not a timing gate. Rule 1 fix: 26-RESEARCH.md's illustrative `Batchable` type (`ReturnType<typeof db.insert> | ReturnType<typeof db.update>`) failed `tsc` (pre-`.values()` builder types don't satisfy drizzle's `BatchItem` constraint) — redeclared as `typeof insertRecallEvents | (typeof cardUpdateQueries)[number] | typeof upsertHabitat`, derived from the actual constructed query objects. Flag for future `db.batch()` usage in this codebase: use the actual-object-`typeof` pattern, not `ReturnType<typeof db.insert/db.update>`.
- Phase 26-04: implemented client-side photo downscale (PERF-10, D-06/D-07) — new `resizeImageForUpload(file, {maxEdge=1568, quality=0.8})` helper (native `createImageBitmap` + canvas + `toBlob`, zero new deps) wired into `image-upload-flow.tsx`'s `handleExtract` before the existing FileReader/base64/fetch pipeline, honoring the D-03 `cancelled` ref guard. Closed the silent 3.3-5MB Vercel body-limit dead zone: client cap loosened 5MB->20MB, server cap (authoritative) tightened 7MB->4MB. All four scattered "5MB" references (constants, constants test, validation copy, e2e/11) retargeted, plus a fifth straggler (`image-validation.test.ts`, not in the plan's `files_modified`) caught by the mandatory grep sweep. Rule 1 fix: `/api/extract`'s `mimeType` field was still sending the ORIGINAL file's declared type after the resize (which always re-encodes to JPEG) — the server's magic-byte check (`route.ts:141`) would have rejected any non-JPEG-original upload; hardcoded to `"image/jpeg"`. D-06 shipped at its planned default (0.8, no bump to 0.9 — no accuracy regression observed; real-photo/EXIF fidelity deferred to manual UAT per Pitfall 5, jsdom cannot exercise real canvas encoding). Full `npx tsc --noEmit` clean; full `npx vitest run` green (2200 passed, 6 skipped, unchanged pass count).
- Phase 26-03: collapsed `saveImageCards`'s per-row insert loop (N `await db.insert(cards).values({single})` calls, each preceded by nothing extra since the auth/ownership check already ran once before the loop) into ONE `db.insert(cards).values(sanitizedInputs.map(...))` call (PERF-08), mirroring the same recall_events master pattern 26-02 already established for a different insert site. Outcome semantics are now genuinely all-or-nothing (a single atomic multi-row INSERT statement either fully lands or fully fails) — the old "continue-on-failure" test modeled a mixed per-row outcome that is structurally impossible after this refactor, so it was replaced (not patched) with an all-fail + all-succeed pair, per 26-PATTERNS.md's prescribed rewrite. `commitReviewRows` in `review-list.tsx` mirrors the same collapse client-side: one `saveImageCards(deckId, rows.map(...))` call instead of N. Noted (not fixed, out of `files_modified` scope): the success-state `isPartial` UI branch in `review-list.tsx` is now dead code — a single atomic INSERT can never produce both `addedCount>0` and `failedCount>0` from the DB path anymore; flagged for a future cleanup pass or the Phase 18 UI audit.

- Phase 14 (QA observability foundations, complete 2026-06-17) is the OBSERVABILITY SURFACE Phase 15's harness builds on: QA-mode cookie + `readQaAuth()` gate, `STUDY_COOLDOWN_MINUTES` env precedence (short non-zero cooldowns), `/debug` live per-card SRS state table (real data), `QaStateBadge` (`R0·n2t` style) RSC-gated onto study + dashboard, and a prod-parity gating e2e (no badges / QA endpoints 404 when secret unset).
- Phase 15 must drive the REAL pipeline (app's own API routes / browser flows), NEVER the `/debug` virtual override (that override is the cheat console for visual states, not a journey harness).
- DB workflow: this project uses Drizzle `db:push` (NOT `db:migrate` — the migrations journal is empty); hosted-DB writes gated by the auto-mode classifier.
- All QA/test users use the `*test.local` domain so `scripts/cleanup-test-users.mjs` removes them (QAJ-06).

### Blockers/Concerns

None blocking. Phase 15 needs careful time-resumable manifest design (QAJ-03) + a QA-gated time-shift for decay (QAJ-05) without real multi-day waits.

**Non-blocking flag (Phase 17-02):** the D-11 `/habitat` regression spot-check measured mobile Perf 81 / TBT 777ms, down from the Phase 13.1-documented Perf 96 (2026-05-29). Neither of 17-02's two tasks touch `/habitat`'s render path — the regression matches the same degraded-bundle pattern already seen across all 4 key routes in the Phase 16 baseline, suggesting shared-chunk drift accumulated during the intervening v4.0 Daybreak phases (19-24). Out of scope to fix in Phase 17 (`/habitat` gets only a regression spot-check per D-11); evidence committed at `.planning/phases/17-performance-optimization/measurements/habitat-baseline.md` for any future investigation. **Re-measured 2026-07-19 (17-05 checkpoint):** mobile Perf 93 / TBT 308ms — improved from the 17-02 flag, still below the Phase 13.1 original; non-regressed.

**Non-blocking flag (Phase 25-04):** during this plan's execution, commits from a live, concurrently-running session (`fix(17): WR-01` through `WR-04`, `docs(17)`, `style(17)`) landed interleaved with 25-04's own commits on this exact working tree/branch — one briefly swept up 25-04's staged test file into its own commit (self-corrected via that session's own `git reset`; no data lost, verified byte-intact). 25-04 adopted pathspec-scoped commits (`git commit -- <files>`) for the remainder of its execution and every commit was individually verified clean. No corrective action needed on this plan's own output, but flagging for Josh: if two GSD sessions are running against this repo at once, confirm that's intentional — `parallelization: false` in `.planning/config.json` only governs within-phase plan execution, not cross-session working-tree access.

**RESOLVED — 17-05 checkpoint (Josh, 2026-07-19):** PERF-04's D-15 gate ("real content visible ≤100ms median, prefetch-warm") measured 1.3-8s across all 6 hub-and-spoke nav pairs against a local prod build — roughly 20-80x over the bar. Root cause (per `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`): all 4 key routes are genuinely dynamic Server Components (session + DB reads), and the docs' own prefetching-behavior table states dynamic pages are "not [fully] prefetched unless loading.js" and have "Client Cache TTL: Off, unless enabled [experimental staleTimes]" — so every nav is a real, unavoidable server round trip under the stable API surface. **Verdict: PERF-04 = ACCEPTED MISS, phase closed.** The instant-nav goal carries to Phase 18/backlog; candidate future paths recorded but NOT chosen this phase: (a) `loading.tsx` shells (would require relaxing D-15's skeletons-don't-count bar) or (b) Cache Components/PPR (experimental, needs a dedicated D-07 checkpoint). D-16 ("default prefetch sufficient") is corrected to measured-wrong for dynamic routes. Gates that DID pass: qa:run 5/5 (criterion-4, zero residue, 19 stale test users swept); /habitat D-11 non-regressed (mobile Perf 93/TBT 308ms vs previously-flagged 81/777ms); PERF-03 after-record = the committed 2026-07-17T23:07Z full run (3 of 4 routes certify, new-card D-04 accepted-miss per 17-04); immutable Phase 16 baseline untouched across the whole phase; task_d326ebac (INP prod-build-only) cleared. Three items parked as manual UAT — see `.planning/phases/17-performance-optimization/17-HUMAN-UAT.md`. Deploy HELD — Josh will deploy manually later; prod still runs the 2026-07-15 deployment, Phase 17 Wave 4/5 code is not yet live.

## Carried Tech Debt

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.0 UAT | 10-HUMAN-UAT.md (offline vision eval reference-set) | Partial | v2.0 close |
| v2.0 UAT | 11-HUMAN-UAT.md (live browser walkthrough) | Partial | v2.0 close |
| v4.0 UAT | 20-24 HUMAN-UAT.md interaction/animation/live items | Partial | v4.0 close (visual UAT done 2026-06-24) |
| v4.0 Perf | 13-perf INP-on-dev-server follow-up (task_d326ebac) | Cleared 2026-07-19 (17-05 Task 1 — INP assertion now IS_PROD_BUILD-gated) | v4.0 close |

## Session Continuity

Last session: 2026-07-22T00:00:14.000Z
Stopped at: Completed 26-04-PLAN.md
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
| Phase 25 P04 | 22min | 3 tasks | 4 files |
| Phase 25 P05 | 31min | 3 tasks | 7 files |
| Phase 26 P01 | 12min | 3 tasks | 4 files |
| Phase 26 P02 | 8min | 2 tasks | 2 files |
| Phase 26 P03 | 10min | 2 tasks | 4 files |
| Phase 26 P04 | 15min | 3 tasks | 8 files |
