---
phase: 17-performance-optimization
reviewed: 2026-07-19T10:30:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - e2e/13-perf.spec.ts
  - e2e/perf-markers.ts
  - scripts/__tests__/measure-cwv-lib.test.ts
  - scripts/measure-cwv-lib.mjs
  - scripts/measure-cwv.mjs
  - scripts/qa-lib.mjs
  - src/app/(protected)/dashboard/page.tsx
  - src/app/(protected)/deck/browse/page.tsx
  - src/app/(protected)/deck/new-card/page.tsx
  - src/app/(protected)/study/page.tsx
  - src/app/globals.css
  - src/components/card-list.tsx
  - src/components/countdown-timer.tsx
  - src/components/dashboard-header.tsx
  - src/components/daybreak/__tests__/shimmer.test.tsx
  - src/components/daybreak/ac-progress.tsx
  - src/components/daybreak/shimmer.tsx
  - src/components/deck-view.test.tsx
  - src/components/deck-view.tsx
  - src/components/habitat-hero.tsx
  - src/components/study-session.tsx
  - src/components/welcome/habitat-teaser.tsx
  - src/components/word-list-browser.tsx
findings:
  critical: 3
  warning: 4
  info: 5
  total: 12
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-19T10:30:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the Phase 17 performance-optimization surface: the RSC conversions (dashboard/study/new-card/browse), the four Motion→CSS keyframe swaps, the new DaybreakShimmer atom + `next/dynamic` lazy-load, the push()+refresh() invalidation after study completion, the PERF-04 instant-nav e2e gate, and the D-09 route-filter/OUT_DIR extension of the measure-cwv harness.

Phase constraints that were explicitly checked and PASS: browse `?topic=` stays validated against the `CATEGORIES` allowlist (browse/page.tsx:34-37); the dashboard `Start studying` link carries `?deck={id}` and the e2e spec asserts it (dashboard/page.tsx:334, 13-perf.spec.ts:388-389); the archived 13-3d-habitat `afterAll` write remains try/catch-guarded (13-perf.spec.ts:251-258); no experimental Next cache APIs are used (only `router.refresh()`); QA-gated `cooldownUntil` is nulled for non-QA users before crossing the RSC boundary (dashboard/page.tsx:282-285); the harness default OUT_DIR never targets the frozen Phase-16 baseline (measure-cwv-lib.mjs:342-353, vitest-covered); all four key routes carry `data-perf-ready` (dashboard, browse, study-session, new-card-mode-toggle).

However, the PERF-04 instant-nav gate has two structural correctness defects (it can both false-fail on genuinely instant navs and false-pass with zero samples), and the new shimmer atom's prefers-reduced-motion override is provably dead code because the animation is declared inline. Four warnings and five informational items follow.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: DaybreakShimmer's prefers-reduced-motion override is dead — inline `animation` style always beats the media-query rule

**File:** `src/components/daybreak/shimmer.tsx:41` (and `src/app/globals.css:141-146`)
**Issue:** The shimmer declares its animation as an inline style:

```tsx
style={{ ..., animation: "shimmer-pulse 1.6s ease-in-out infinite" }}
```

while the reduced-motion kill switch lives in a normal stylesheet rule:

```css
@media (prefers-reduced-motion: reduce) {
  .db-shimmer { animation: none; }
}
```

Inline styles have higher precedence than any non-`!important` author stylesheet declaration, media query or not. The `animation: none` override can therefore never apply — reduced-motion users still get the infinite 1.6s pulse. This directly contradicts the component's own documented contract ("disabled under prefers-reduced-motion, following the exact hab-fall convention") and the phase requirement that every CSS-animation addition preserve its reduced-motion branch. Every consumer of the shimmer (the `next/dynamic` `loading` fallback in card-list.tsx and any future route fallback) inherits the break. Note the other four swaps (`ss-fade-up`, `cl-accordion-*`, `ac-progress-bar`, `habitat-teaser-glow`) are class-declared and are NOT affected — this is specific to the shimmer atom. The vitest suite (`shimmer.test.tsx`) never exercises this, so it stays green.
**Fix:** Move the animation declaration into the class so the media query can override it:

```css
/* globals.css */
.db-shimmer {
  animation: shimmer-pulse 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .db-shimmer { animation: none; }
}
```

```tsx
// shimmer.tsx — delete the `animation:` line from the inline style object
```

### CR-02: `measureNavTap` phase-1 wait can never succeed on an atomic route swap — every source-marked nav sample is inflated by the full 8s timeout

**File:** `e2e/13-perf.spec.ts:334-361` (with `e2e/perf-markers.ts:36-58`)
**Issue:** Phase 1 waits for `!document.querySelector('[data-perf-ready="true"]')` — i.e. an observable interval in which NO marker exists. But the code's own comment (lines 341-346) correctly states that the App Router keeps the outgoing page fully mounted until the destination payload is ready, then swaps. That swap is a single React commit: the old page's marker is removed and the new page's marker is inserted in the same synchronous DOM mutation, with no paint (and no `waitForFunction` rAF poll tick) in between. Since the repo has zero `loading.tsx` files (confirmed in shimmer.tsx's own header comment), no Suspense fallback ever interposes an unmarked frame. Consequence: for the 5 of 6 gated directions whose source page carries a marker (dashboard→study, dashboard→new-card, new-card→dashboard, dashboard→browse, browse→dashboard), the phase-1 `waitForFunction` never observes absence, times out at `timeoutMs` (8000ms), is silently swallowed by the `.catch()`, and `preReadyElapsed ≈ 8000` is added to the sample. Phase 2 then finds the (already-mounted) destination marker in ~0ms. Every sample lands near 8000ms and the ≤100ms median assertion structurally cannot pass — even for a perfectly instant, prefetch-warm navigation. Only the study-end→dashboard direction escapes (the end screen carries no marker). The "biased to OVERESTIMATE... a few ms of Playwright IPC noise" comment dramatically understates this: the overestimate is the entire phase-1 timeout, not IPC noise. This gate has never been live-run (it is PERF_PROD_BUILD-gated), which is why this hasn't surfaced.
**Fix:** Distinguish the destination's marker from the source's by instance, not by an absence window. Stamp the source marker before clicking, then wait for an unstamped marker:

```ts
async function measureNavTap(page: Page, click: () => Promise<void>, timeoutMs = 8000): Promise<number> {
  // Stamp the SOURCE page's marker so the destination's fresh node is distinguishable
  await page.evaluate((attr) => {
    document.querySelector(`[${attr}="true"]`)?.setAttribute("data-nav-stale", "1");
  }, PERF_READY_ATTR);
  const t0 = Date.now();
  await click();
  // Wait for a marker that is NOT the stamped source node — works even when
  // the old node is atomically replaced by the new one in a single commit.
  const ok = await page
    .waitForFunction(
      (attr) => !!document.querySelector(`[${attr}="true"]:not([data-nav-stale])`),
      PERF_READY_ATTR,
      { timeout: timeoutMs },
    )
    .then(() => true)
    .catch(() => false);
  return ok ? Date.now() - t0 : -1;
}
```

### CR-03: Instant-nav gate silently passes with ZERO samples — `median([])` returns -1, and `expect(-1).toBeLessThanOrEqual(100)` is green

**File:** `e2e/13-perf.spec.ts:304-314, 428-436, 489-512`
**Issue:** `measureNavTap` returns `-1` on timeout and callers skip that sample (`if (studyMs >= 0)`). If every round times out — e.g. a renamed testid, a route that loses its `data-perf-ready` marker in a future refactor, or `waitForPerfReady` never finding the selector — the sample array is empty, `warm([])` is `[]`, `median([])` returns the `-1` sentinel, and all eight `toBeLessThanOrEqual(100)` assertions pass. The hard perf gate reports PASS while having measured nothing. A gate that goes green on total measurement failure is worse than no gate: it certifies "content visible ≤100ms" with zero evidence.
**Fix:** Assert a minimum sample count before asserting the median, and/or guard the sentinel:

```ts
expect(toStudy.length, "dashboard→study valid samples").toBeGreaterThanOrEqual(ROUNDS - 1);
const m = median(warm(toStudy));
expect(m, "dashboard→study median must be a real measurement").toBeGreaterThanOrEqual(0);
expect.soft(m, "dashboard→study contentVisibleMs (median)").toBeLessThanOrEqual(100);
```

Apply to all six direction arrays in both tests.

## Warnings

### WR-01: Empty-deck CTA links drop the active deck — multi-deck users add words to the wrong deck

**File:** `src/components/card-list.tsx:291, 300`
**Issue:** The empty-state links are `href="/deck/browse"` and `href="/deck/new-card"` with no `?deck=` param, while every other deck-scoped link in this phase carries it (dashboard's `add-a-card` pill, BrowseTiles' links, BrowseList's back link). Both destination pages fall back to `decks[0]` when `?deck=` is absent. A user viewing an empty second deck (`/dashboard?deck=<deck2>`) who taps "Browse words" or "+ Add a card" lands scoped to deck 1 and adds cards there — a silent wrong-deck write. This also means the PERF-04 e2e pair exercises the unparameterized fallback path rather than the parameterized links real users with the intended deck context would follow (harmless in the single-deck test, but the app behavior is wrong).
**Fix:** Thread the active deck id into `CardList` (dashboard/page.tsx already has `activeDeck.id` in scope) and parameterize both links:

```tsx
// CardListProps: add deckId: string
<Link href={`/deck/browse?deck=${deckId}`} data-testid="browse-words-empty" ...>
<Link href={`/deck/new-card?deck=${deckId}`} ...>
```

(Relatedly, `word-list-browser.tsx:449` — the new `browse-back-dashboard` link is `href="/dashboard"` without `?deck=`; dashboard's `decks[0]` fallback makes this benign for deck selection display but it likewise loses multi-deck context.)

### WR-02: `handleAccordionToggle` performs side effects inside the `setOpen` updater function

**File:** `src/components/card-list.tsx:208-222`
**Issue:** The updater passed to `setOpen` calls `clearCloseTimer()`, `setPanelMounted(...)`, and schedules a `setTimeout` — all side effects. React requires state updaters to be pure: they may be invoked more than once (StrictMode dev double-invocation) and may be replayed during the render phase rather than during the event dispatch. A render-phase replay would schedule/clear the close timer and enqueue a `setPanelMounted` update from inside a render of a possibly-discarded state computation. `clearCloseTimer()` at the top happens to make double-invocation idempotent today, but this is fragile by construction and exactly the class of race this component's own long comment (lines 152-173) says it was rewritten to eliminate.
**Fix:** Compute the next value outside the updater — `open` is already in scope:

```tsx
function handleAccordionToggle() {
  const next = !open;
  clearCloseTimer();
  if (next) {
    setPanelMounted(true);
  } else {
    closeTimerRef.current = setTimeout(() => {
      setPanelMounted(false);
      closeTimerRef.current = null;
    }, 260);
  }
  setOpen(next);
}
```

### WR-03: measure-cwv harness runs to a "successful" no-op when ROUTE_FILTER resolves to zero routes

**File:** `scripts/measure-cwv.mjs:344` (with `scripts/measure-cwv-lib.mjs:309-323`)
**Issue:** `resolveRoutes` silently drops unrecognized entries — a typo'd filter like `ROUTE_FILTER="/dashbaord"` (or `"/deck/new_card"`) resolves to `[]` (the lib's own vitest at measure-cwv-lib.test.ts:279-281 confirms this). The harness then provisions a prod test user, launches the browser, measures nothing, writes an empty `16-BASELINE-SUMMARY.md`, and prints "ALL ROUTES MEASURED — baseline artifacts written." with exit code 0. That is precisely the "silent garbage" failure class the harness's redirect guard, `extractMetrics` fail-loud, and bundle-stats freshness gate all exist to prevent — but it's unguarded at the entry point.
**Fix:** Fail fast after resolution, before provisioning:

```js
const ROUTES = resolveRoutes(process.env.ROUTE_FILTER ?? null);
if (ROUTES.length === 0) {
  console.error(
    `[measure-cwv] FATAL: ROUTE_FILTER="${process.env.ROUTE_FILTER}" matched no known routes ` +
      "(valid: /dashboard, /study, /deck/new-card, /deck/browse, /habitat)",
  );
  process.exit(1);
}
```

### WR-04: Explicit PHASE_OUT_DIR can still write into the frozen Phase-16 baseline directory

**File:** `scripts/measure-cwv-lib.mjs:342-353`
**Issue:** The T-17-01-01 guard only protects the *default* path. `resolveOutDir(root, phaseOutDir)` honors any explicit override as-is via `path.join`, so `PHASE_OUT_DIR=".planning/phases/16-performance-baseline-measure/baseline"` (or a `../`-relative equivalent) silently overwrites the immutable, committed Phase-16 baseline artifacts — the exact outcome the phase constraint says must never happen. The atomic-rename writers would clobber `16-BASELINE-SUMMARY.md` and every `*-runs.json`/`*-baseline.md` without a warning. One misremembered env var in a re-measurement session is all it takes.
**Fix:** Enforce the invariant for overrides too:

```js
export function resolveOutDir(rootDir, phaseOutDir) {
  if (phaseOutDir) {
    const resolved = path.resolve(rootDir, phaseOutDir);
    const frozen = path.join("16-performance-baseline-measure", "baseline");
    if (resolved.includes(frozen)) {
      throw new Error(
        "[measure-cwv] PHASE_OUT_DIR points at the immutable Phase 16 baseline " +
          "directory — refusing to write there (T-17-01-01)",
      );
    }
    return resolved;
  }
  ...
}
```

(Add a vitest case mirroring the existing default-path assertion.)

## Info

### IN-01: 13-perf's local `median()` does not actually mirror the lib convention it cites

**File:** `e2e/13-perf.spec.ts:299-314` (vs `scripts/measure-cwv-lib.mjs:52-55`)
**Issue:** The doc comment says it "mirrors scripts/measure-cwv-lib.mjs's median() convention," but for even-length arrays the lib deliberately returns the UPPER middle (documented "do NOT fix this"), while this copy averages the two middles. With `ROUDS=6` → `warm()` → 5 samples the paths agree, but any skipped `-1` sample yields an even-length array and the two "mirrored" medians diverge.
**Fix:** Either match the lib's upper-middle behavior or reword the comment to state the intentional difference.

### IN-02: CardEditDialog's dynamic-import fallback renders an inline shimmer block, not a modal

**File:** `src/components/card-list.tsx:25-29, 592-600`
**Issue:** On the first edit click, while the chunk loads, the `loading` fallback (`<DaybreakShimmer width={340} height={320} />`) renders in normal document flow at the bottom of the card list — a 340×320 block pushing content down (a small CLS event, ironic for this phase) rather than appearing where the dialog overlay will. Subsequent opens are instant so this is a one-time flash.
**Fix:** Wrap the fallback in a fixed, centered overlay matching the dialog's positioning (e.g. `position: fixed; inset: 0; display: grid; place-items: center;` container around the shimmer), or use a zero-footprint fallback (`loading: () => null`).

### IN-03: Dashboard shell duplicated wholesale from deck-view.tsx (StatusText, PlusGlyph, action line) plus a second `CardRow` interface

**File:** `src/app/(protected)/dashboard/page.tsx:42-194` (vs `src/components/deck-view.tsx:39-191`), `src/components/deck-view.tsx:27-36` (vs `src/components/card-edit-dialog.tsx:16`)
**Issue:** The RSC split copies ~150 lines of StatusText/PlusGlyph/action-line markup into the page. deck-view.tsx is retained deliberately as the behavior-preservation baseline (documented, only its own test imports it), but nothing enforces the copies stay in sync — a styling or state-machine fix applied to one will silently diverge from the "baseline" the header comment claims it must never diverge from. `CardRow` is now independently declared in both deck-view.tsx and card-edit-dialog.tsx.
**Fix:** When the baseline is eventually retired, delete deck-view.tsx + its test in the same change; until then consider extracting StatusText/PlusGlyph into a shared hooks-free module imported by both so "baseline" and "live" cannot drift.

### IN-04: qa-lib.mjs comment claims measure-cwv's inlined signUp is "now unnecessary duplication" — it is still necessary

**File:** `scripts/qa-lib.mjs:122-130` (vs `scripts/measure-cwv.mjs:97-119`)
**Issue:** The Rule-3 fix comment states the measure-cwv workaround (inlined signup with Origin header) "is now unnecessary duplication once the root helper itself sends the header." But measure-cwv cannot import qa-lib regardless of the Origin fix: qa-lib still `process.exit(1)`s at module load when `DEBUG_CHEAT_SECRET` is unset (lines 44-50), which measure-cwv intentionally does not require. The comment invites a future "cleanup" that would break the harness at import time. Also note the two signUp implementations now differ in return shape (token-only vs `{sessionToken, userId}`).
**Fix:** Amend the comment: the duplication remains load-bearing until qa-lib's env guard becomes lazy (or is moved out of module scope).

### IN-05: Phase-17 measurement artifacts are labeled "Phase 16 Baseline"

**File:** `scripts/measure-cwv-lib.mjs:198, 269, 708` (`renderRouteReport`, `renderSummary`, and the hardcoded `16-BASELINE-SUMMARY.md` filename in measure-cwv.mjs)
**Issue:** D-09 re-measurement runs write into `.planning/phases/17-performance-optimization/measurements/` but every report is titled "# Phase 16 Baseline — …", cites Phase-16 run methodology ("cold Vercel hit", Lighthouse versions), and the summary file is named `16-BASELINE-SUMMARY.md`. Post-optimization Phase-17 measurements will be indistinguishable from the frozen baseline by content — confusing provenance for exactly the before/after comparison this phase exists to make. (Similarly, `warm()`'s comment at 13-perf.spec.ts:363-364 claims it "mirrors measureVitals' existing run-1-discard discipline," but `measureVitals` in this file has no run-discard; and `warm()` discards the first *surviving* sample even when round 0 was already dropped via the `-1` filter, double-discarding.)
**Fix:** Thread a phase/label parameter into `renderRouteReport`/`renderSummary` (defaulting to the current strings to keep Phase-16 goldens byte-stable) and name the summary from it; fix or delete the `warm()` mirror claim.

---

_Reviewed: 2026-07-19T10:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
