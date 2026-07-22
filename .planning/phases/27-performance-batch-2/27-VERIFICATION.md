---
phase: 27-performance-batch-2
verified: 2026-07-22T22:17:48Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Real-photo extraction quality parity (D-05 residual, PERF-17)"
    expected: "Upload several real phone photos (word lists, vocabulary flashcards, handwritten notes — varied lighting/angle/EXIF orientation) via Add a card -> From an image on a prod-like build, and compare Haiku's per-word extraction accuracy against the prior claude-sonnet-4-6 baseline. If accuracy measurably drops vs. the clean-screenshot synthetic test already run, revert src/app/api/extract/route.ts line 165 to anthropic(\"claude-sonnet-4-6\")."
    why_human: "Only a synthetic (clean-screenshot) side-by-side was run programmatically this session; real-photo lighting/glare/handwriting/EXIF-orientation variance cannot be produced or judged by grep/static analysis."
  - test: "Pause-toggle perceived responsiveness (PERF-13)"
    expected: "Tapping the pause/resume icon on a real card feels instant (no visible lag before the icon flips)."
    why_human: "Subjective perceived-latency judgment; code confirms the optimistic state update happens synchronously before the fetch, but 'feels instant' is a human perception, not a gate check."
  - test: "Backdrop-blur removal visual check over playing habitat video (PERF-22)"
    expected: "The habitat overlay cards (h-prog-card, h-back, h-mood-chip) and habitat-scene chrome still read clearly against the moving video background now that backdrop-filter blur is removed, with no visual regression to legibility."
    why_human: "Visual/aesthetic legibility judgment over a moving video background; grep confirms the blur removal but not that the near-solid (92%-opaque) background substitute still looks acceptable."
  - test: "Post-deploy client bundle-size confirmation (PERF-14, zod/mini)"
    expected: "Production bundle analyzer (or Vercel build output) shows a measurable client JS size reduction on the 9 converted pages/components after the zod -> zod/mini swap."
    why_human: "Bundle-size delta is a build-artifact metric best confirmed against the real Vercel/production build output, not re-derivable from source inspection alone (RESEARCH flagged this as directional, not verified)."
---

# Phase 27: Performance Batch 2 Verification Report

**Phase Goal:** The second tranche of the Fable-5 performance review (items 8-19) is re-verified against current code, triaged, and the surviving items shipped — spanning session lookup dedupe + cookie caching, optimistic UI on the pause toggle, client bundle diet (zod/mini), server-side Browse filtering, dashboard query consolidation, extraction latency (Haiku trial / streaming), secondary DB indexes, the translation-form stale-response race fix (a correctness bug), CardList render memoization, the study-complete read-path trim, the habitat backdrop-blur drop, and a translation LRU cache.
**Verified:** 2026-07-22T22:17:48Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Requirements PERF-12..PERF-23 exist in REQUIREMENTS.md with a traceability row each | VERIFIED | `.planning/REQUIREMENTS.md` lines 55-66 (per-item bullets) and 120-131 (traceability table, all "Complete") |
| 2 | A layout+page render pass issues ONE `auth.api.getSession` call, not two (cache dedupe) | VERIFIED | `src/lib/auth-session.ts` wraps `getSession` in React `cache()`; `auth-session.test.ts` asserts `toHaveBeenCalledTimes(1)` across two calls; test passes |
| 3 | `session.cookieCache` enabled with 5-min TTL in auth.ts (D-03) | VERIFIED | `grep cookieCache src/lib/auth.ts` finds the config block |
| 4 | `/account` page and its two server actions always verify a live session via `disableCookieCache` (D-04) | VERIFIED | `account/page.tsx:29`, `account-actions.ts:65,159` all call `getSessionFresh()`; test asserts `query.disableCookieCache === true` |
| 5 | cards/decks/recall_events/session each declare a secondary index in schema.ts, live on Neon (D-08) | VERIFIED | `src/db/schema.ts` — `cards_deckId_idx`, `decks_userId_idx`, `recall_events_cardId_idx`, `session_userId_idx`; orchestrator evidence: `db:push` "[✓] Changes applied", confirmed in `pg_indexes`, idempotent re-push shows "No changes detected" |
| 6 | Browse topic-detail branch serializes only the requested topic's word subset; categoryCounts NOT computed there; topic-picker branch still correct | VERIFIED | `deck/browse/page.tsx` `shapeBrowseData()` — `detail` branch only calls `filterWords`, `picker` branch only computes `categoryCounts`; `?topic=` also validated against `CATEGORIES` (WR-01 hardening) |
| 7 | Dashboard fetches ONE card query, derives study subset in JS, reads nativeLanguage from session, drops unread createdAt | VERIFIED | `dashboard/page.tsx` calls `getDeckCards` once + `deriveStudySubset(cards)`; uses `session.user.nativeLanguage`; `cardRows` mapping omits `createdAt`; `dashboard-data.test.ts` asserts `getDeckCards` called once and `getUserNativeLanguage` never called |
| 8 | Pause/resume icon flips optimistically before POST resolves, rolls back on error; rapid toggles coalesce refresh; search doesn't re-render every row; rows mount after accordion tween | VERIFIED | `card-list.tsx` — `React.memo` CardRow/CardList, `useDeferredValue(query)`, `optimisticPausedIds` set synchronously before `startTransition(fetch)`, `rollbackPause`, `scheduleRefresh` debounce; `card-list.test.tsx` has dedicated passing tests for optimistic flip, rollback, coalesced refresh, and memo-bail-out on typing |
| 9 | A slow earlier translation response never overwrites a newer one (AbortController); AbortError silent no-op; activeField guard composed not replaced; repeated identical request hits LRU not DeepL | VERIFIED | `translation-form.tsx` — `translateAbortRef`, abort-before-empty-return fix (WR-01, commit 04e6a97) with `TRANSLATE_CANCEL`; `translation-cache.ts` bounded TTL LRU; `route.ts` checks cache before DeepL, skips caching empty results (WR-02, commit 183b91e); `route.test.ts` has passing call-count and WR-02 regression tests |
| 10 | All 9 client-side zod importers use zod/mini; validation semantics/zodResolver unchanged | VERIFIED | grep across all 9 files confirms `import * as z from "zod/mini"` |
| 11 | study/complete ownership+card+factsBefore reads run in one Promise.all; factsAfter derived in JS, no second getHabitatFacts call | VERIFIED | `route.ts:146` single `Promise.all([ownedDeckRows, cardRows, factsBefore])`; `factsAfter` built at line 318 from `factsBefore` fields, only one `getHabitatFacts` import/call site |
| 12 | No backdrop-filter blur remains over the playing habitat video in the 4 target files; account-back.tsx untouched | VERIFIED | grep confirms zero `backdropFilter` matches in `h-prog-card.tsx`, `h-back.tsx`, `h-mood-chip.tsx`, `habitat-scene.tsx`; `account-back.tsx:66` still has `backdropFilter: "blur(4px)"` (correctly untouched per D-02) |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth-session.ts` | `cache()`-wrapped `getSession` + `getSessionFresh` | VERIFIED | Both exported, correct `disableCookieCache` param differentiation |
| `src/lib/auth.ts` | `cookieCache` config block | VERIFIED | Present |
| `src/lib/__tests__/auth-session.test.ts` | dedupe + disableCookieCache assertions | VERIFIED | 3 tests, all pass |
| `src/db/schema.ts` | 4 `index()` declarations | VERIFIED | `cards_deckId_idx`, `decks_userId_idx`, `recall_events_cardId_idx`, `session_userId_idx` |
| `src/app/(protected)/deck/browse/page.tsx` | server-side topic filtering | VERIFIED | `shapeBrowseData`/`requestedTopic` present, plus WR-01 category validation |
| `src/app/(protected)/deck/browse/__tests__/browse-page.test.ts` | filtered-subset assertion | VERIFIED | present |
| `src/app/(protected)/dashboard/page.tsx` | consolidated single-query pass | VERIFIED | `session.user.nativeLanguage` used, single `getDeckCards` call |
| `src/lib/__tests__/dashboard-data.test.ts` | query-call-count + subset-derivation assertions | VERIFIED | `toHaveBeenCalledTimes(1)`, `getUserNativeLanguage` never called |
| `src/components/card-list.tsx` | optimistic pause + memo CardRow + useDeferredValue | VERIFIED | all three present |
| `src/components/card-list.test.tsx` | optimistic/rollback/render-count assertions | VERIFIED | dedicated describe blocks, all passing |
| `src/lib/translation-cache.ts` | bounded TTL LRU factory | VERIFIED | `createTranslationCache` |
| `src/components/translation-form.tsx` | AbortController per debounced fire | VERIFIED | `translateAbortRef`, WR-01 fix applied |
| `src/app/api/translate/__tests__/route.test.ts` | DeepL call-count assertion | VERIFIED | LRU + WR-02 regression tests present, passing |
| `src/app/(auth)/signup/page.tsx` | zod/mini canonical conversion | VERIFIED | `import * as z from "zod/mini"` |
| `src/components/daybreak/h-prog-card.tsx` | backdropFilter removed | VERIFIED | zero matches |
| `src/app/api/study/complete/route.ts` | Promise.all read consolidation + derived factsAfter | VERIFIED | confirmed at lines 146/318 |
| `src/app/api/extract/route.ts` | Haiku model id (+ conditional streaming) | VERIFIED | `anthropic("claude-haiku-4-5")` at line 165; streaming correctly NOT added (median ~2.1s < 4s threshold, D-06 gate satisfied) |

All 17 declared artifacts across the 10 plans exist, are substantive (not stubs), and are wired into their respective call sites.

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `(protected)/layout.tsx` | `auth-session.ts` | `import { getSession }` | WIRED | confirmed, plus 4 other RSC call sites (study, habitat, welcome, new-card pages) |
| `(protected)/account/page.tsx` | `auth-session.ts` | `import { getSessionFresh }` | WIRED | confirmed, plus `account-actions.ts` (both server actions) |
| `schema.ts` | Neon DB | `npm run db:push` | WIRED | orchestrator evidence: applied + `pg_indexes` confirmed |
| `browse/page.tsx` | `BrowseList` | filtered word subset prop | WIRED | `shaped.words` passed only in detail branch |
| `dashboard/page.tsx` | `study-queries.ts` | single card query + JS-derived subset | WIRED | `deriveStudySubset(cards)` |
| `card-list.tsx` (CardList) | extracted CardRow | `React.memo` row w/ stable callbacks | WIRED | confirmed + memo-bail-out test passes |
| `translate/route.ts` | `translation-cache.ts` | cache check before DeepL try/catch | WIRED | confirmed, plus WR-02 empty-result skip |
| `translation-form.tsx` | `fetch(/api/translate)` | `signal: controller.signal` | WIRED | confirmed |
| 9 client importers | `zod/mini` | `import * as z from "zod/mini"` | WIRED | all 9 confirmed |
| 4 habitat overlay components | GPU per-frame cost | removed `backdrop-filter` | WIRED | confirmed zero matches; `account-back.tsx` correctly untouched |
| `study/complete/route.ts` | `getHabitatFacts` | called once (factsBefore only) | WIRED | confirmed single call site, `factsAfter` derived in JS |
| `extract/route.ts` | `@ai-sdk/anthropic` | `anthropic("claude-haiku-4-5")` | WIRED | confirmed |

All 12 key links verified WIRED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-12 | 27-01 | Session lookup dedupe + cookie caching | SATISFIED | `auth-session.ts` cache() + cookieCache config + tests |
| PERF-13 | 27-05 | Optimistic UI on pause toggle | SATISFIED | `card-list.tsx` optimistic state + rollback + tests |
| PERF-14 | 27-07 | Client bundle diet (zod/mini) | SATISFIED | all 9 importers confirmed; bundle-size delta itself needs human confirmation (see below) |
| PERF-15 | 27-03 | Server-side Browse filtering | SATISFIED | `shapeBrowseData` branch split confirmed |
| PERF-16 | 27-04 | Dashboard query consolidation | SATISFIED | single `getDeckCards` + `deriveStudySubset` confirmed |
| PERF-17 | 27-10 | Extraction latency (Haiku trial / streaming) | SATISFIED (code); residual human check open | model swapped, D-06 latency gate resolved from measured data; D-05 real-photo test is a carried human-verification item (documented by the plan itself) |
| PERF-18 | 27-02 | Secondary DB indexes | SATISFIED | 4 indexes in schema.ts + live on Neon (orchestrator evidence) |
| PERF-19 | 27-06 | Translation-form stale-response race fix (correctness bug) | SATISFIED | AbortController + WR-01 fix + regression test |
| PERF-20 | 27-05 | CardList render memoization | SATISFIED | React.memo + useDeferredValue + tests |
| PERF-21 | 27-09 | Study-complete read-path trim | SATISFIED | Promise.all + derived factsAfter confirmed |
| PERF-22 | 27-08 | Habitat backdrop-blur drop | SATISFIED | zero backdropFilter matches in 4 target files |
| PERF-23 | 27-06 | Translation LRU cache | SATISFIED | `translation-cache.ts` + WR-02 fix + regression tests |

All 12 requirement IDs declared in the phase are present in `.planning/REQUIREMENTS.md` (both the per-item bullets, lines 55-66, and the traceability table, lines 120-131, all marked "Complete"). No orphaned requirements found for Phase 27 — no additional PERF-1x/2x IDs map to Phase 27 beyond the 12 already accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/card-list.tsx` | 471-494 | `startTransition(async () => …)` wraps async work the transition cannot track (IN-02, code review) | Info | Harmless today (optimistic state already updates synchronously before the wrapper); latent trap if `isPending` is later wired to UI. Acknowledged-not-fixed, in scope of this phase's own review. |
| `src/components/card-list.tsx` | 461-497, 750-758 | `optimisticPausedIds` override never cleared after a successful refresh (IN-03, code review) | Info | Stale override could mask a real server-side pause-state change from another tab/path. Acknowledged-not-fixed. |
| `src/app/api/translate/route.ts` | 114-145 | Array-branch partial miss can serialize `null` into a `string[]`-typed response (IN-01, code review) | Info | Wasteful (whole batch falls back to "unavailable" on one miss) but not a correctness break; `as string[]` cast is technically untrue. Acknowledged-not-fixed. |

No TBD/FIXME/XXX debt markers found in any of the 18 files modified across the phase's 10 plans. Two WARNING-level findings from the code review (WR-01, WR-02) were fixed in-phase with regression tests (commits `04e6a97`, `183b91e`) before this verification — confirmed fixed by direct code read, not just the SUMMARY/REVIEW claim.

### Behavioral Spot-Checks

Ran the 8 phase-specific test files directly (not just trusting SUMMARY claims): `auth-session.test.ts`, `dashboard-data.test.ts`, `card-list.test.tsx`, `route.test.ts` (translate), `translation-form.test.tsx`, `route.test.ts` (study/complete), `browse-page.test.ts`, `h-habitat-overlays-no-blur.test.tsx` — **8 test files / 55 tests, all passed.** This corroborates the orchestrator's full-suite run (2242 passed / 6 skipped / 0 failed after review fixes).

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` migration/tooling probes. The orchestrator's `npm run qa:run` (all journeys passed) and e2e batches (web + mobile, all passed on the correct server regime) serve the equivalent function for this phase and are folded in below as pre-gathered evidence.

### Pre-Gathered Orchestrator Evidence (folded in, not re-run)

- Full `npx tsc --noEmit`: clean.
- Full `npx vitest run` after review fixes: 2242 passed / 6 skipped / 0 failed.
- `npm run qa:run` (dev server with `STUDY_COOLDOWN_MINUTES=1`): all journeys passed (QAJ-01..05 + cleanup).
- e2e web batch 33+3 passed, mobile batch 31 passed / 4 skipped (two initial web failures reproduced as cooldown-server-regime artifacts, not real bugs).
- Neon push: `db:push` applied, `pg_indexes` confirms all 4 indexes, idempotent re-push confirms no drift.
- Prod build (`npm run build`): compiles clean.
- 27-10 D-05/D-06 gate: resolved "done" by Josh; synthetic side-by-side showed parity; real-photo test remains open (carried below as a human item).

### Human Verification Required

### 1. Real-photo extraction quality parity (D-05 residual, PERF-17)

**Test:** Upload several real phone photos (word lists, vocabulary flashcards, handwritten notes — varied lighting/angle/EXIF orientation) via Add a card -> From an image, on a prod-like build. Compare Haiku's per-word extraction accuracy against the prior `claude-sonnet-4-6` baseline.
**Expected:** Accuracy parity with the prior model on real-world photo conditions (not just the clean-screenshot synthetic test already run). If accuracy measurably drops, revert `src/app/api/extract/route.ts` line 165 to `anthropic("claude-sonnet-4-6")` — the revert condition is documented inline in the route's dating comment.
**Why human:** Only a synthetic (non-photo) side-by-side was run programmatically; real-world lighting, glare, handwriting legibility, and EXIF orientation quirks cannot be produced or judged by static analysis.

### 2. Pause-toggle perceived responsiveness (PERF-13)

**Test:** Tap the pause/resume icon on a real card in the deployed app.
**Expected:** The icon flips instantly, with no perceptible lag before the visual state change.
**Why human:** Code confirms the state update is synchronous (before the network call), but "feels instant" is a subjective perception check, not a static-analysis-verifiable fact.

### 3. Backdrop-blur removal visual check (PERF-22)

**Test:** View the habitat screen with the overlay cards (progress card, back card, mood chip) rendered over the playing background video.
**Expected:** Overlay text/chrome remains legible against the moving video now that `backdrop-filter` blur has been removed; the near-solid (92%-opaque) background substitute should not look visually broken or under-contrasted.
**Why human:** Visual legibility/aesthetic judgment over a moving video background cannot be verified via grep or unit tests.

### 4. Post-deploy client bundle-size confirmation (PERF-14)

**Test:** After the next production deploy, check the Vercel build output / bundle analyzer for the pages touched by the zod -> zod/mini conversion.
**Expected:** A measurable reduction in client JS size for the 9 converted pages/components.
**Why human:** Bundle-size delta is a build-artifact metric that requires an actual production build output to confirm; RESEARCH flagged this as directional only.

### Gaps Summary

No gaps. All 12 must-have truths, all 17 declared artifacts, and all 12 key links verified directly against the codebase (not SUMMARY.md claims) — every artifact was read and its substance/wiring independently confirmed via grep and direct file reads, and 8 phase-specific test files (55 tests) were executed live during this verification and passed. The two WARNING-level code-review findings (WR-01 stale translation on field-clear, WR-02 cached empty translation) were confirmed fixed in the actual source (not just trusted from the REVIEW.md status line) with passing regression tests. Three Info-level findings (IN-01/02/03) remain as acknowledged, non-blocking code-quality notes per the phase's own code review — none affect observable correctness of the shipped behavior.

Status is `human_needed` rather than `passed` solely because of the four items above — none of which represent a missing or broken artifact, but each requires human judgment (visual/perceptual, real-photo fidelity, or a post-deploy build metric) that cannot be settled by code inspection. Three of the four (items 1-3) were explicitly flagged as carried-over human-verification items by the plans/summaries themselves; item 4 (bundle-size) was flagged as directional-only by the phase's own RESEARCH doc.

---

*Verified: 2026-07-22T22:17:48Z*
*Verifier: Claude (gsd-verifier)*
