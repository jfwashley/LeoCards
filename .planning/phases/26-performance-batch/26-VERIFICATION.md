---
phase: 26-performance-batch
verified: 2026-07-22T00:59:54Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Upload a real portrait-orientation phone photo via /deck/new-card -> 'From an image' and confirm extraction accuracy at JPEG quality 0.8 / 1568px long edge is not measurably worse than the pre-resize original."
    expected: "Extraction accuracy is not measurably degraded; if it is, bump `quality` to 0.9 in src/lib/image-resize.ts's default parameter (D-06 fallback rule)."
    why_human: "jsdom cannot exercise real canvas/JPEG re-encoding — only mocked bitmap dimensions and API call shapes are unit-testable. Real-photo/EXIF fidelity is explicitly deferred to manual UAT per 26-RESEARCH.md Pitfall 5 and the 26-04 SUMMARY."
  - test: "Post-deploy, curl -sI https://<prod-domain>/habitat/clips/<existing-clip-file> and inspect the Cache-Control header."
    expected: "Cache-Control: public, max-age=31536000, immutable is present on the Vercel-served response (dev-server header parity with prod is not guaranteed)."
    why_human: "26-05 SUMMARY explicitly defers prod-header verification to a post-deploy check; the orchestrator's dev-server curl check (documented in the gate evidence) confirms the header exists in dev, but prod edge/CDN behavior can differ."
  - test: "Time a full ~25-card study-session commit's 'Saving your progress…' step before/after this phase (informal stopwatch, not an automated gate per D-02)."
    expected: "The step resolves noticeably faster now that write phase is 1 db.batch() round trip instead of ~27 sequential round trips."
    why_human: "D-02 explicitly scopes automated proof to the batchCalls===1 round-trip-count unit assertion (timing gates on save paths flake); the roadmap's 'measurably shortening' language for success criterion 1 is a human perceptual/stopwatch check, not something a unit test asserts."
---

# Phase 26: Performance batch Verification Report

**Phase Goal:** The five still-open recommendations from the re-validated Fable-5 performance review are shipped: server round trips are batched on the two hot write paths, translation of large extractions works instead of failing, photo uploads shrink by an order of magnitude, and habitat clips stop re-downloading on every visit.
**Verified:** 2026-07-22T00:59:54Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Study-session commit performs per-card mastery updates in ONE round trip via `db.batch()` — no per-card sequential `await db.update` loop (PERF-07, roadmap SC1) | VERIFIED | `src/app/api/study/complete/route.ts:287-291` — single `await db.batch([insertRecallEvents, ...cardUpdateQueries, upsertHabitat] as [Batchable, ...Batchable[]])`; no `for`/`.map().forEach` sequential-await loop remains. Test `route.test.ts` asserts `h.batchCalls.count === 1` (confirmed present and green in scoped run). |
| 2 | Replay-safety (WR-04) still holds after batching | VERIFIED | WR-04 guard `or(isNull(cards.lastCommitId), ne(cards.lastCommitId, commitId))` present verbatim at route.ts:255; deterministic `recallEventId` + `onConflictDoNothing` unchanged; replay-safety describe block in route.test.ts passes unmodified against new mock. |
| 3 | Committing N reviewed image-cards is ONE server action + ONE multi-row insert, auth/ownership checked once not N times (PERF-08, roadmap SC2) | VERIFIED | `src/lib/deck-actions.ts:281-297` — single `await db.insert(cards).values(sanitizedInputs.map(...))` after one ownership check at :272-276; `src/components/review-list.tsx:319-326` `commitReviewRows` calls `saveImageCards` exactly once with `rows.map(...)`. No `for` insert loop remains in either file. |
| 4 | An extraction >30 words translates via ONE batched DeepL request instead of a per-word fan-out (PERF-09, roadmap SC3) | VERIFIED | `src/app/api/translate/route.ts:98-112` array branch calling `client.translateText(texts, ...)` once; `src/components/review-list.tsx:275-309` `runTranslationFanOut` issues exactly one `fetch` (plus one retry) carrying `{texts: rows.map(...)}`. Singular `text`→`{translation}` contract frozen (schema `.refine()` XOR at route.ts:29-31; `translation-form.tsx` and `e2e/04-manual-card-entry.spec.ts` show zero diff across the phase's commits). |
| 5 | The deterministic >30-word 429→"Translation unavailable" failure is gone and test-covered | VERIFIED | `.max(50)` bound on `texts` (route.ts:25) plus D-05 extraction cap (50 words) means a single batch always suffices; `route.test.ts` covers singular regression, array happy path (order-preserved), 51-item→400, and mutual-exclusivity→400 — all 5 tests pass in scoped run. `review-list.test.ts` "translation fan-out" describe block asserts 1-call happy path, retry-then-succeed, retry-then-fallback, and total-failure fallback — passes. |
| 6 | Photos downscale client-side to ~1568px long edge / JPEG q0.8 before upload; a 5MB photo uploads as a few hundred KB (PERF-10, roadmap SC4) | VERIFIED (code-level; real-photo fidelity is human-verify) | `src/lib/image-resize.ts` — `resizeImageForUpload` via `createImageBitmap` + canvas + `toBlob("image/jpeg", quality)`, defaults `maxEdge=1568, quality=0.8`; wired into `image-upload-flow.tsx:267` before the FileReader/base64 pipeline. jsdom unit tests (dimension clamp, no-upscale, jpeg quality, null-ctx) pass. Real photo output size/fidelity is unit-untestable — routed to human verification. |
| 7 | The silent 3.3-5MB dead zone is structurally closed: server cap 7MB→4MB, under Vercel's ~4.5MB limit | VERIFIED | `src/lib/image-constants.ts` — `MAX_SERVER_IMAGE_BYTES = 4 * 1024 * 1024` (authoritative, enforced server-side at `extract/route.ts`); `image-constants.test.ts` asserts both `20*1024*1024` (client) and `4*1024*1024` (server). WR-02 review fix adds a client-side pre-flight check (`estimatedBytes > MAX_SERVER_IMAGE_BYTES`) mirroring the server's own formula, failing fast before upload (`image-upload-flow.tsx:295-304`). |
| 8 | Client acceptance cap loosened to ~20MB; all "5MB" copy/e2e assertions reflect new caps | VERIFIED | `MAX_IMAGE_BYTES = 20 * 1024 * 1024`; `image-validation.ts` interpolates the constant (no stale "under 5MB" literal, grep-clean); `e2e/11-phase9-image-upload.spec.ts:61-68` constructs a >20MB buffer and asserts `/please pick one under 20MB/i`. A straggler (`image-validation.test.ts`, not in the plan's declared `files_modified`) was also caught and retargeted (5MB/7.3MB → 20MB/22.3MB fixtures), confirmed in current file. |
| 9 | Habitat clips ship with immutable long-lived `Cache-Control` via `next.config.ts` `headers()`, verified in response headers (PERF-11, roadmap SC5) | VERIFIED | `next.config.ts:4-21` — `async headers()` returns one rule for `source: "/habitat/clips/:path*"` with `Cache-Control: public, max-age=31536000, immutable`. Orchestrator-run live proof (dev server): `curl -sI localhost:3000/habitat/clips/l1-excited.mp4` → header present; control asset correctly stays `no-cache, must-revalidate`. Prod post-deploy re-check routed to human verification (dev/prod header parity is not guaranteed by this Next version per 26-RESEARCH.md Assumption A2). |
| 10 | The D-08 companion naming rule (future clip re-renders MUST use a new filename) is documented in the render-pipeline docs | VERIFIED | `scripts/render-habitat-clips.mjs:34-35` — header comment block contains "PERF-11" and the new-filename-on-re-render statement; `node --check` and scoped biome both clean; diff is comment-only (no rendering logic changed). |
| 11 | The Phase 15 core-journey harness and the unit + e2e suites still pass after all changes — no learning-pipeline regressions (roadmap SC6) | VERIFIED | Full `npx tsc --noEmit`: 0 errors (re-run by verifier). Full `npx vitest run`: 2206 passed / 0 failed / 6 skipped (re-run by verifier, matches orchestrator gate evidence). `npm run qa:run` (STUDY_COOLDOWN_MINUTES=1): ALL JOURNEYS PASSED per orchestrator gate evidence — covers the PERF-07 write path end-to-end. e2e/11 (image upload) and e2e/04 (manual-translate guardrail) both green per orchestrator gate evidence. |

**Score:** 11/11 truths verified (0 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/translate/route.ts` | Additive `texts[]` array mode, singular contract frozen | VERIFIED | `.refine()` XOR guard, `.max(50)`, array branch returns `{translations}`, singular branch returns `{translation}` unchanged |
| `src/app/api/translate/__tests__/route.test.ts` | First-ever route coverage: singular, array, cap, mutual-exclusivity | VERIFIED | File exists, 5 tests, all pass (scoped run) |
| `src/components/review-list.tsx` | `runTranslationFanOut` batched fetch+retry+fallback; `commitReviewRows` single `saveImageCards` call | VERIFIED | Both functions present and wired as described; `hasEmptyTranslation` WR-01 guard present |
| `src/app/api/study/complete/route.ts` | Step-6 writes as one `db.batch([...])`; WR-04 preserved; stale comment updated | VERIFIED | Single `db.batch()` call, `Batchable` tuple cast, WR-04 WHERE guard intact, comment at :91-97 now accurate |
| `src/app/api/study/complete/route.test.ts` | `batchCalls===1` proof + replay-safety unmodified | VERIFIED | Present, scoped test run green |
| `src/lib/deck-actions.ts` | `saveImageCards` single multi-row insert, ownership check once | VERIFIED | Single `db.insert(cards).values(sanitizedInputs.map(...))`, one ownership check before it |
| `src/lib/deck-actions.test.ts` | `toHaveBeenCalledTimes(1)`, all-or-nothing outcome tests | VERIFIED | Scoped run green |
| `src/lib/image-resize.ts` | `resizeImageForUpload` zero-dep canvas downscale | VERIFIED | Uses `createImageBitmap` + canvas + `toBlob`; no new deps (`git diff package.json` empty across the phase) |
| `src/lib/image-resize.test.ts` | jsdom-tagged unit test | VERIFIED | `// @vitest-environment jsdom` header line present, all 3 browser APIs mocked, 4 behaviors covered |
| `src/lib/image-constants.ts` | `MAX_IMAGE_BYTES` ~20MB, `MAX_SERVER_IMAGE_BYTES` 4MB | VERIFIED | Both constants confirmed at expected values with updated comments |
| `src/components/image-upload-flow.tsx` | Resize wired before FileReader; 413 copy updated to 4MB | VERIFIED | `resizeImageForUpload` called at :267, guarded try/catch (CR-01 fix), pre-flight size check (WR-02 fix) |
| `next.config.ts` | `headers()` block for `/habitat/clips/:path*` | VERIFIED | Single rule, `immutable` value present, D-08 inline comment present |
| `scripts/render-habitat-clips.mjs` | D-08 naming-rule doc comment | VERIFIED | "PERF-11" + new-filename rule present in header comment |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `review-list.tsx` (`runTranslationFanOut`) | `/api/translate` | single POST with `{texts: string[]}` | WIRED | Confirmed at review-list.tsx:280-284; one `fetch` call, `attemptTranslationBatch` retried once on failure |
| `/api/translate` route | `deepl-node client.translateText` | array overload | WIRED | route.ts:100-104, array branch calls `client.translateText(texts, sourceLang, targetLangCode)` |
| `review-list.tsx` (`commitReviewRows`) | `saveImageCards` | single call carrying `rows.map(...)` | WIRED | review-list.tsx:319-326, one call, no loop |
| `deck-actions.ts` (`saveImageCards`) | `db.insert(cards)` | single multi-row `.values([...])` | WIRED | deck-actions.ts:282-290 |
| `study/complete/route.ts` | Neon (`db.batch`) | single HTTP round trip | WIRED | route.ts:287-291, one `db.batch()` call composed of insert + N updates + upsert |
| `next.config.ts headers()` | `/habitat/clips/:path*` | `Cache-Control` source match | WIRED | next.config.ts:12-18; live dev-server curl proof confirmed by orchestrator gate evidence |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full type check clean | `npx tsc --noEmit` | 0 errors | PASS |
| Full unit/component suite green | `npx vitest run` | 2206 passed / 0 failed / 6 skipped | PASS |
| Scoped phase-26 test files green | `npx vitest run <11 phase-26 test files>` | 330 passed / 2 skipped | PASS |
| Review-fix regression tests green | `npx vitest run image-upload-flow-extract-errors.test.tsx review-list-commit-guard.test.tsx` | 6/6 passed | PASS |
| Biome clean on all 18 phase-26-touched files | `npx biome ci <18 files>` | exit 0 (1 pre-existing unrelated `noExplicitAny` warning, non-blocking) | PASS |
| Debt-marker scan on all 18 touched files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` | 0 real matches (1 false-positive "placeholder" hit is a comment describing existing UI state, not a stub marker) | PASS |
| Translation-form.tsx / e2e/04 untouched (frozen contract) | `git diff --stat` across phase-26 commit range | empty diff | PASS |
| e2e/11 cap assertions retargeted | grep `e2e/11-phase9-image-upload.spec.ts` | `20 * 1024 * 1024`, `/under 20MB/i` present, no stale `5MB` | PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; verification relied on vitest/tsc/biome/e2e gates as declared in each plan's `<verification>` block, all re-run or cross-checked by the verifier.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| PERF-07 | 26-02 | Study-commit single round trip via `db.batch()` | SATISFIED | Truths 1-2, artifact `study/complete/route.ts` |
| PERF-08 | 26-03 | Review-commit one server action + one multi-row insert | SATISFIED | Truth 3, artifacts `deck-actions.ts` / `review-list.tsx` |
| PERF-09 | 26-01 | DeepL batched translation, >30-word bug fixed | SATISFIED | Truths 4-5, artifacts `translate/route.ts` / `review-list.tsx` |
| PERF-10 | 26-04 | Client-side photo resize, dead-zone closure | SATISFIED (code); real-photo fidelity human-verify | Truths 6-8, artifacts `image-resize.ts` / `image-constants.ts` / `image-upload-flow.tsx` |
| PERF-11 | 26-05 | Immutable Cache-Control for habitat clips | SATISFIED (dev-verified); prod re-check human-verify | Truths 9-10, artifact `next.config.ts` / `render-habitat-clips.mjs` |

No orphaned requirements — REQUIREMENTS.md maps exactly PERF-07..PERF-11 to Phase 26, and all five appear in the `requirements` frontmatter field across plans 26-01..26-05 (one each).

### Anti-Patterns Found

None blocking. One pre-existing, out-of-scope `noExplicitAny` biome warning at `review-list.test.ts:342` (present before this phase, unrelated to any of the five must-haves, does not fail `biome ci`).

### Code Review Findings (26-REVIEW.md) — Fix Verification

| Finding | Severity | Claimed Fix Commit | Verified in Codebase |
|---------|----------|--------------------|-----------------------|
| CR-01: resize+FileReader awaits outside try/catch, decode failure hangs UI | Critical | `2789dfa` | VERIFIED — `image-upload-flow.tsx:265-286` now wraps both awaits in try/catch dispatching `EXTRACT_ERROR` (415); regression test `image-upload-flow-extract-errors.test.tsx` passes |
| WR-01: all-or-nothing insert + one empty row fails the whole batch, no commit guard | Warning | `f4003fb` | VERIFIED — `hasEmptyTranslation` guard present at `review-list.tsx:480`, disables commit button, regression test `review-list-commit-guard.test.tsx` passes |
| WR-02: resized blob has no pre-upload size ceiling below server's 4MB cap | Warning | `8b6c491` | VERIFIED — client-side `estimatedBytes` pre-flight check at `image-upload-flow.tsx:295-304`, mirrors server formula, dispatches 413 before network call |

All 3 fix commits (`2789dfa`, `8b6c491`, `f4003fb`) confirmed present in `git log`; the code they describe is confirmed present in the current working tree (not just claimed in the review doc).

### Human Verification Required

### 1. Real-photo resize/extraction-accuracy fidelity (D-06 quality fallback decision)

**Test:** Upload a real portrait-orientation phone photo through `/deck/new-card` → "From an image" and compare word-extraction accuracy against the pre-Phase-26 (unresized) behavior.
**Expected:** No measurable accuracy drop at JPEG quality 0.8 / 1568px long edge. If a drop is observed, bump `quality` to 0.9 in `src/lib/image-resize.ts`'s default parameter (the D-06 fallback rule the plan explicitly reserved for this scenario).
**Why human:** jsdom cannot exercise real `createImageBitmap`/canvas JPEG encoding — the unit tests only assert mocked dimensions and API call shapes. This is explicitly flagged as deferred-to-UAT in the 26-04 SUMMARY and 26-RESEARCH.md Pitfall 5.

### 2. Production Cache-Control header re-check post-deploy

**Test:** After the next deploy to prod, run `curl -sI https://<prod-domain>/habitat/clips/<an-existing-clip-file>` and inspect the response headers.
**Expected:** `Cache-Control: public, max-age=31536000, immutable` is present on the Vercel-served (not just dev-server-served) response.
**Why human:** The orchestrator's gate evidence confirms the header on a local dev server; the 26-05 SUMMARY and 26-RESEARCH.md Assumption A2 both explicitly note dev/prod header parity is not guaranteed by this Next.js version and must be re-checked after deploy.

### 3. Informal study-save "feels shorter" stopwatch observation

**Test:** Time a ~25-card study-session commit's "Saving your progress…" step before/after this phase's changes (or simply confirm the post-phase timing feels fast/instant).
**Expected:** Per D-02, the write phase is now 1 db.batch() round trip instead of ~27 sequential round trips — the step should resolve noticeably faster.
**Why human:** D-02 deliberately scoped automated proof to the `batchCalls===1` round-trip-count unit assertion (timing gates on save paths flake, per Phase 17 learnings). The roadmap's "measurably shortening" language for success criterion 1 is inherently a perceptual/stopwatch check, not a unit-testable assertion.

### Gaps Summary

No gaps. All 11 derived truths (roadmap success criteria 1-6 plus PLAN-frontmatter must-haves) are VERIFIED against the actual codebase — not just claimed in SUMMARY.md files. All three code-review findings (1 Critical, 2 Warnings) have confirmed, working fixes in the current working tree, with passing regression tests. Full `npx tsc --noEmit` and full `npx vitest run` (2206/0/6) were independently re-run by the verifier and match the orchestrator's gate evidence. The three items above are routed to human verification because they are either physically unable to be exercised by an automated test (real-photo canvas encoding, prod-vs-dev CDN header behavior) or were deliberately scoped out of automated gates by an explicit phase decision (D-02's anti-flake stopwatch note) — none of them indicate a missing or broken implementation.

---

*Verified: 2026-07-22T00:59:54Z*
*Verifier: Claude (gsd-verifier)*
