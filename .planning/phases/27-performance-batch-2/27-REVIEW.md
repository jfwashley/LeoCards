---
phase: 27-performance-batch-2
reviewed: 2026-07-22T22:04:47Z
depth: deep
files_reviewed: 42
files_reviewed_list:
  - src/app/(auth)/forgot-password/page.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/reset-password/page.tsx
  - src/app/(auth)/signup/page.tsx
  - src/app/(auth)/welcome/page.tsx
  - src/app/(protected)/account/page.tsx
  - src/app/(protected)/dashboard/page.tsx
  - src/app/(protected)/deck/browse/__tests__/browse-page.test.ts
  - src/app/(protected)/deck/browse/page.tsx
  - src/app/(protected)/deck/new-card/page.tsx
  - src/app/(protected)/habitat/page.tsx
  - src/app/(protected)/layout.tsx
  - src/app/(protected)/study/page.tsx
  - src/app/api/extract/route.ts
  - src/app/api/study/complete/route.test.ts
  - src/app/api/study/complete/route.ts
  - src/app/api/translate/__tests__/route.test.ts
  - src/app/api/translate/route.ts
  - src/components/__tests__/habitat-scene-video.test.ts
  - src/components/account-details-card.tsx
  - src/components/card-edit-dialog.tsx
  - src/components/card-list.test.tsx
  - src/components/card-list.tsx
  - src/components/change-password-card.tsx
  - src/components/daybreak/__tests__/h-habitat-overlays-no-blur.test.tsx
  - src/components/daybreak/h-back.tsx
  - src/components/daybreak/h-mood-chip.tsx
  - src/components/daybreak/h-prog-card.tsx
  - src/components/habitat-scene.tsx
  - src/components/review-list.test.ts
  - src/components/review-list.tsx
  - src/components/translation-form.test.tsx
  - src/components/translation-form.tsx
  - src/components/welcome/welcome-step-choose.tsx
  - src/db/schema.ts
  - src/lib/__tests__/auth-session.test.ts
  - src/lib/__tests__/dashboard-data.test.ts
  - src/lib/account-actions.ts
  - src/lib/auth-session.ts
  - src/lib/auth.ts
  - src/lib/study-queries.ts
  - src/lib/translation-cache.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-07-22T22:04:47Z
**Depth:** deep
**Files Reviewed:** 42
**Status:** issues_found

## Summary

Phase 27 "Performance batch 2" is a careful, well-commented refactor. The highest-risk items I was asked to scrutinize hold up under tracing:

- **auth-session.ts `cache()` semantics** — sound. Per-request `cache()` deduping; `/account` + the two revocation-sensitive server actions (`requestEmailChange`, `deleteAccount`) correctly route through `getSessionFresh` (`disableCookieCache: true`, D-04). All non-sensitive RSC call sites use the cached `getSession`. The 5-min cookieCache revocation delay on the mutation API routes (`study/complete`, `translate`, `extract`) is the accepted D-03 tradeoff.
- **study/complete Promise.all** — the 403 ownership guard still runs on `ownedDeckRows` strictly before `db.batch()`; the parallelized reads are all pure functions of validated input; no write precedes ownership verification; no cross-deck IDOR (graded cards are scoped to the owned `deckId`).
- **factsAfter derivation** — provably equivalent to the old re-fetch: learned-card count can only increase because resurface cards at `masteryRound === 3` never advance (`ROUND_REQUIREMENT[3]` is undefined → no-op) and nothing regresses below 3 in a session; `lastActivityAt` is exactly the upserted `now`.
- **dashboard `deriveStudySubset`** — parity with `getStudyCards` confirmed (`pausedAt === null` mirrors `isNull(cards.pausedAt)`; identical column projection).
- **translation-cache LRU** — keying is safe (enum langs + validated text, no per-user data, no delimiter-collision because the first two segments are fixed enums); bounded eviction is correct.
- **zod/mini conversions** — validation parity preserved across the 9 client components (`z.email()`, `.check(z.minLength())`, `.check(z.refine())` cross-field checks with `path`).

Two correctness gaps in the translate/translation surface are worth fixing before ship (both WARNING), plus three lower-priority robustness/quality notes.

## Warnings

### WR-01: Clearing a field mid-flight leaves a stale translation in the emptied-opposite field

**File:** `src/components/translation-form.tsx:244-320`
**Issue:** `translateFrom` aborts the previous in-flight request only *after* the empty-text early return:

```ts
const translateFrom = useCallback(async (text, direction) => {
  if (!text.trim()) return;              // <-- returns BEFORE aborting
  translateAbortRef.current?.abort();
  ...
```

When the user types a word (request A fires) and then quickly clears the input, the debounced `translateFrom("", direction)` short-circuits at `if (!text.trim()) return;` and never aborts request A. Crucially, `activeField.current` is *not* reset on clear (`handleNativeChange`/`handleTargetChange` set it to the same direction), so when request A resolves it still passes the `activeField.current === direction` guard and dispatches `TRANSLATE_DONE`, writing a translation into the opposite field the user just emptied. The new PERF-19 AbortController was added to kill stale responses but does not cover this clear-path because the abort is downstream of the guard.
**Fix:** Abort any in-flight request before the empty-text guard (and optionally clear `activeField` on empty input):

```ts
const translateFrom = useCallback(async (text, direction) => {
  if (!text.trim()) {
    translateAbortRef.current?.abort();  // cancel a superseded in-flight request
    translateAbortRef.current = null;
    return;
  }
  translateAbortRef.current?.abort();
  const controller = new AbortController();
  ...
```

### WR-02: Translation cache stores empty results, pinning a cross-user failure for the full TTL

**File:** `src/app/api/translate/route.ts:171` and `src/app/api/translate/route.ts:133-143`; `src/lib/translation-cache.ts:55-68`
**Issue:** Both DeepL branches cache the result unconditionally, including an empty string:

```ts
// singular branch
translationCache.set(text as string, sourceLang, targetLang, result.text);
// array branch — empty string is not `undefined`, so it is cached too
const translated = results[k]?.text;
if (translated !== undefined) { ...; translationCache.set(...); }
```

If DeepL ever returns an empty translation for a given `(sourceLang,targetLang,text)` tuple, that empty value is cached for the full 1-hour TTL and served to **every** user (the cache is intentionally shared/global). The singular client contract `TranslationResponseSchema = z.object({ translation: z.string().check(z.minLength(1)) })` (translation-form.tsx:10-12) then *rejects* the cached `{ translation: "" }` on parse, so that exact word surfaces "Translation unavailable — enter manually" for an hour with no way for a retry to self-heal (the miss is masked by the poisoned hit). Probability is low for min-length-1 dictionary input, but the shared-cache blast radius and the hard client `minLength(1)` guard make it worth a cheap defensive skip.
**Fix:** Do not cache empty/whitespace-only translations (and skip serving them):

```ts
if (result.text.trim() !== "") {
  translationCache.set(text as string, sourceLang, targetLang, result.text);
}
// array branch:
if (translated !== undefined && translated.trim() !== "") {
  cachedResults[origIdx] = translated;
  translationCache.set(texts[origIdx] as string, sourceLang, targetLang, translated);
}
```

## Info

### IN-01: Array-branch partial miss serializes `null` into a `string[]`-typed response, failing the whole batch client-side

**File:** `src/app/api/translate/route.ts:114-145`
**Issue:** In the array branch, if DeepL returns a result without `.text` for some miss index, `cachedResults[origIdx]` stays `undefined` and is emitted (as JSON `null`) inside `{ translations: cachedResults as string[] }`. `review-list.tsx`'s `BatchTranslationResponseSchema = z.array(z.string())` (review-list.tsx:21-23) rejects any `null` element, so a single dropped item fails the *entire* batch parse, triggering the one retry and then per-row "Translation unavailable" fallback for *all* rows — even the many that translated fine. Graceful but wasteful, and the `as string[]` cast is untrue.
**Fix:** Fall back to the original source text (or filter/replace) for any still-`undefined` index before responding, so the array is genuinely `string[]`, or have the response schema/handler tolerate per-item nulls.

### IN-02: `startTransition(async () => …)` in card-list wraps async work that the transition cannot track

**File:** `src/components/card-list.tsx:471-494`
**Issue:** `handleTogglePause` calls `startTransition(async () => { await fetch(...) ... })`. React does not await async transition callbacks — only synchronous updates inside the callback are marked as transitions; everything after the first `await` (the rollback / pending-clear state updates) runs at normal priority. Since the `isPending` slot is discarded (`const [, startTransition] = useTransition()`), the wrapper is functionally inert here (the optimistic `setOptimisticPausedIds`/`setPendingCardIds` calls that matter already run synchronously *before* `startTransition`). Harmless today, but misleading and a latent trap if someone later wires `isPending` to the UI.
**Fix:** Drop the `useTransition`/`startTransition` wrapper and call the async handler directly, or move to a genuine optimistic-state primitive if transition semantics are actually wanted.

### IN-03: `optimisticPausedIds` override is never cleared after a successful refresh

**File:** `src/components/card-list.tsx:461-497, 750-758`
**Issue:** On a successful pause/resume, only `scheduleRefresh()` runs; the per-card entry in `optimisticPausedIds` is never deleted (only the failure path via `rollbackPause` removes it). After `router.refresh()` the server `pausedAt` matches the override, so display stays correct — but the override now permanently shadows `!!card.pausedAt` for that card. If the card's pause state later changes through any path other than this component's own toggle (e.g. a second tab, or a future server-driven change), the stale override will mask the real server value until unmount.
**Fix:** Clear the card's override once the authoritative refresh lands (e.g. delete it in the `res.ok` branch after `scheduleRefresh`, or reconcile overrides against incoming `cards` props in an effect keyed on `cards`).

---

_Reviewed: 2026-07-22T22:04:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
