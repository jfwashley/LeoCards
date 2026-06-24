---
phase: 24-habitat
reviewed: 2026-06-24T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/lib/habitat-names.ts
  - src/lib/habitat-tint.ts
  - src/app/globals.css
  - src/components/daybreak/h-back.tsx
  - src/components/daybreak/h-mood-chip.tsx
  - src/components/daybreak/h-level-badge.tsx
  - src/components/daybreak/h-top.tsx
  - src/components/daybreak/h-prog-card.tsx
  - src/components/daybreak/h-decay-card.tsx
  - src/components/habitat-celebration.tsx
  - src/components/habitat-scene.tsx
  - src/components/habitat-video.tsx
  - src/app/(protected)/habitat/page.tsx
  - src/components/study-session.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-06-24
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 24 ("Daybreak") re-skins the `/habitat` overlays over the kept pre-rendered video. I reviewed the phase-24 diff (`f96ae05..HEAD`) across all 14 listed files, concentrating on the six high-risk areas flagged in the phase context.

**The high-value risk areas are largely sound:**

- **Celebration trigger repair (D-09)** — VERIFIED CORRECT. `habitat-scene.tsx` consumes `celebratingLevel` (not the dead `_celebratingLevel`) via a lazy `useState` initializer, and the mount-only `setTimeout(2500)` effect clears `showCelebration` with proper `clearTimeout` cleanup. No stale-closure bug: the effect reads `showCelebration` from the mount render where the lazy init already produced the correct value, and it never needs to re-fire. The render guard `showCelebration && celebratingLevel !== null` is consistent with the init condition.
- **Input validation (T-24-03-CELEBRATE)** — VERIFIED CORRECT. `page.tsx` validates `?celebrate` with `Number.isInteger && 1..9`; `?celebrate=999`, `abc`, empty, and float all collapse to `null`. No injection path (value is only used as a number in JSX text).
- **Behavior preservation** — VERIFIED. The old `MoodIndicator` and `Level N` badge were non-interactive display elements; they were faithfully replaced by `HTop`/`HMoodChip`/`HLevelBadge`. No live control became a no-op. The decay/progress card branch (`state.isDecaying ? HDecayCard : HProgCard`) and the offline banner are preserved, and the dead `=== 10` celebrate handoff in `study-session.tsx` was correctly repaired to `!== null` → `/habitat?celebrate=${leveledUp}` (the prior code could never fire since max level is 9).
- **Perf invariant (HAB-04)** — VERIFIED. None of the `/habitat`-route files import `motion/react`, `framer-motion`, `zod`, or `level-up-overlay.tsx`. `study-session.tsx`'s `motion/react` use is the `/study` route and is out of scope.
- **WR-01 SSR motion flash** — Acceptable as documented. `usePrefersReducedMotion` defaults `false` on SSR; the confetti-flash window is explicitly accepted in the file header per RESEARCH Pitfall 4 (same swap-after-mount pattern as `habitat-video.tsx`). Not flagged as a defect.

**The remaining findings are quality/robustness issues, not correctness blockers.** The most material is WR-01 below: the mobile-freeze `IntersectionObserver` in `habitat-video.tsx` does not re-bind when the `<video>` element is remounted via its `key`, leaving a stale observer on a detached node after an in-session level/mood change. This degrades a battery/perf optimization (not playback) and is uncommon on this route, so it is a WARNING.

No Critical issues found.

## Warnings

### WR-01: Mobile-freeze IntersectionObserver leaks / goes stale when the `<video>` is remounted via its `key`

**File:** `src/components/habitat-video.tsx:109-145` (effect), `:184-185` (`ref` + `key`)
**Issue:**
The `<video>` element carries `key={clipBasename(level, mood)}`. When `level` or `mood` changes after mount (e.g. an offline `retry()` in `habitat-scene.tsx` refetches `/api/habitat` and `setState`s a different level/mood, re-rendering `HabitatVideo` with new props), React **unmounts the old `<video>` DOM node and mounts a new one**. But the mobile-freeze `useEffect` depends only on `[reducedMotion]`, so it does **not** re-run on the level/mood change.

Consequences on mobile (`innerWidth < 768`):
1. The `IntersectionObserver` continues observing the **old, detached** video node; `observer.disconnect()` only runs on unmount or when `reducedMotion` flips, so the observer survives bound to a node no longer in the DOM.
2. `videoRef.current` now points to the **new** video node, which nothing observes — so the play-on-intersect / pause-on-exit / 10s-freeze management no longer applies to the element actually on screen.

Browser-level `autoPlay` still plays the new clip, so playback is not broken — what breaks is the intended battery optimization (10s freeze, pause-when-offscreen). Because a mid-session level/mood change on `/habitat` is uncommon (offline retry, or `?capture=video` swap), this is a robustness/perf-correctness degradation rather than a user-facing break — hence WARNING, not BLOCKER.

**Fix:** Make the effect re-run when the video element identity changes, by keying it on the same value the element is keyed on:
```tsx
// add level + mood (or clipBasename) to the dependency array so the observer
// re-binds to the freshly-mounted <video> node
}, [reducedMotion, level, mood]); // was: [reducedMotion]
```
`videoRef.current` is re-read at the top of the effect on each run, so adding the deps cleanly disconnects the old observer (cleanup) and observes the new node. (Alternatively, drop the `key` if a remount per clip is not required and instead update `<source>`s + call `video.load()`, but the dependency fix is the minimal change.)

### WR-02: Observer callback assumes a single entry; `scheduleFreeze()` can run against a paused/non-playing video

**File:** `src/components/habitat-video.tsx:126-133`
**Issue:**
The callback destructures `([entry])` and acts only on the first entry. That is fine for a single observed target, but the `isIntersecting` branch calls `video.play().catch(...)` **and** `scheduleFreeze()` unconditionally every time the element re-enters the viewport. If the element rapidly toggles intersection (e.g. momentum scrolling near the threshold), each re-entry resets a fresh 10s timer, so the "freeze after ~10s" guarantee can be pushed out indefinitely while the user hovers the video at the viewport edge. `video.play()` returning a rejected promise (autoplay policy) is swallowed, yet `scheduleFreeze()` still arms a freeze on a video that may never have started — harmless but logically inconsistent with "freeze after ~2 loops of playback."

**Fix:** Gate `scheduleFreeze()` on successful play and avoid re-arming when already scheduled:
```tsx
([entry]) => {
  if (entry?.isIntersecting) {
    video.play().then(scheduleFreeze).catch(() => {});
  } else {
    if (freezeTimer !== null) { clearTimeout(freezeTimer); freezeTimer = null; }
    video.pause();
  }
},
```
Also set `freezeTimer = null` after `clearTimeout` in the offscreen branch and in `freeze()` so the `!== null` guard reflects reality. Low severity (no crash/data loss); flagged because it weakens the documented D-04 battery behavior.

### WR-03: `effectiveCardCount / nextLevelThreshold` percentage has no guard against a zero/NaN denominator

**File:** `src/components/daybreak/h-prog-card.tsx:18-24`
**Issue:**
```tsx
const pct = isMax ? 100 : Math.min(100, Math.round((effectiveCardCount / nextLevelThreshold) * 100));
```
`isMax` is `nextLevelThreshold === null`, so the division branch only runs when `nextLevelThreshold` is a number — but it is typed `number | null` with no lower-bound guarantee. If a future engine change (or a corrupted cached state that passes `isValidHabitatState`, which only checks `isFiniteNum`, not `> 0`) ever yields `nextLevelThreshold === 0`, the expression becomes `Math.round((n / 0) * 100)` → `Infinity` (or `NaN` when `effectiveCardCount` is also 0), and the bar `width: \`${pct}%\`` renders `Infinity%` / `NaN%`. The engine currently never emits `0`, so this is latent, not live — WARNING.

**Fix:** Guard the denominator explicitly:
```tsx
const pct =
  isMax || !nextLevelThreshold // null OR 0
    ? 100
    : Math.min(100, Math.max(0, Math.round((effectiveCardCount / nextLevelThreshold) * 100)));
```
The added `Math.max(0, …)` also defends against a negative `effectiveCardCount`.

## Info

### IN-01: `prevLevelRef` is now dead state — declared and synced but never read

**File:** `src/components/habitat-scene.tsx:109, 139-142`
**Issue:**
The old level-up detection that read `prevLevelRef.current` was removed (level-up is now driven by `?celebrate=`). The ref is still declared (`useRef(habitatState.level)`) and kept in sync by a `useEffect` on `[state.level]`, but nothing reads it anymore. The comment "Level tracking: keep prevLevelRef in sync (D-02 data layer untouched)" implies a purpose that no longer exists. This is dead code that will mislead the next reader into thinking level transitions are tracked here.

**Fix:** Delete the `prevLevelRef` declaration and its sync `useEffect` (lines 109 and 139-142). If kept intentionally for a future diff, change the comment to say it is currently unused.

### IN-02: Confetti horizontal distribution collapses to a few columns (`(i * 53) % 100`)

**File:** `src/components/habitat-celebration.tsx:73`
**Issue:**
`left: \`${(i * 53) % 100}%\`` for `i` in `0..25` produces only the multiples-of-53-mod-100 sequence (0, 53, 6, 59, 12, 65, …), which clusters confetti into roughly two diagonal bands rather than spreading across the width. Purely cosmetic — the overlay still renders and auto-settles correctly — but the "26 confetti pieces" read as two streaks. Not a bug.

**Fix (optional):** Use a wider coprime step or a deterministic pseudo-random spread, e.g. `left: \`${(i * 37 + (i % 5) * 11) % 100}%\``, or accept as-is if the handoff specified this pattern.

### IN-03: `moodTint` default-branch `?? "rgba(0,0,0,0)"` is unreachable for typed input

**File:** `src/lib/habitat-tint.ts:31`
**Issue:**
`return map[mood] ?? "rgba(0,0,0,0)";` — `map` is a total `Record<TigerMood, string>` and `mood: TigerMood`, so the `??` fallback can never trigger under the type system. It is a harmless defensive default (useful only if an untyped value is forced in), but note that under `noUncheckedIndexedAccess` the index access is typed `string | undefined`, so the `??` is load-bearing for the type-check there. Leave it as-is; documenting so a future "redundant `??`" cleanup does not mistakenly remove it (this exact false-positive bit Phase 23).

**Fix:** None required. Optionally add a one-line comment: `// ?? retained for noUncheckedIndexedAccess; unreachable at runtime for typed mood`.

---

_Reviewed: 2026-06-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
