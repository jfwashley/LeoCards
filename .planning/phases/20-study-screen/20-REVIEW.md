---
phase: 20-study-screen
reviewed: 2026-06-21T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/components/study-card.tsx
  - src/components/card-stack.tsx
  - src/components/level-up-overlay.tsx
  - src/components/study-session.tsx
  - src/components/__tests__/level-up-overlay.test.tsx
  - e2e/06-study-session.spec.ts
  - e2e/12-pause-cards.spec.ts
  - e2e/10-mobile-responsive.spec.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-06-21  
**Depth:** standard  
**Files Reviewed:** 8  
**Status:** issues_found (1 warning, 0 critical)

## Summary

Phase 20 is a presentation-only Daybreak reskin of the study screen. The diff was reviewed
against the scope constraints in 20-CONTEXT.md:

- PRESERVE zone (study-session.tsx lines 1–294: reducer, commit, idempotency) is **byte-for-byte
  unchanged** — confirmed by reading the full file.
- study-card.tsx interaction logic (`handleKeyDown`, `handleDragEnd`, 3D flip animation,
  300ms swipe guard, `QaStateBadge` mount) is **fully preserved**.
- Intentionally-dead branches (`level === 10` in level-up-overlay.tsx and `leveledUp === 10`
  in study-session.tsx) are retained as scope fences per CONTEXT.
- `Math.min(level, 9)` L9 clamp is correct and safe.
- `img src` for the Soft-Clay Leo is injection-safe: `assetLevel` is always a JS number
  from `Math.min(number, 9)`; a bad API value can produce a 404 (`widget-lNaN.webp`) but
  not XSS.
- The X-circle quit button has `aria-label="Quit study session"` — accessible name is
  correct. The `✕` glyph (U+2715) is purely decorative and suppressed by the label.
- `Button` import cleanly removed; `LionFace` and `TBtn` correctly imported and used.
- e2e selector retargets (aria-label role/name for quit button; `data-testid="card-back-hint"`
  for swipe hint) are correct and match the new DOM.
- Confetti D-06 gate (`!reduced` check) and the unit test suite coverage are correct.

One warning is raised below. No critical issues found.

## Warnings

### WR-01: Confetti flash on initial paint for `prefers-reduced-motion` users

**File:** `src/components/level-up-overlay.tsx:34` (and `src/hooks/use-prefers-reduced-motion.ts:10`)

**Issue:**  
`usePrefersReducedMotion` initialises to `false` (motion allowed) and reads the
`prefers-reduced-motion` media query only after `useEffect` fires on the client. Because
`LevelUpOverlay` renders `{!reduced && <confetti-layer>}`, a user who has system-level
reduced motion enabled will see confetti rendered during the initial paint and hydration,
then the confetti layer unmounts once the hook resolves. This is a one-frame-to-~50ms
flash of motion for the exact users who opted out of it.

This is a pre-existing trade-off in the hook itself (introduced Phase 19, documented as
SSR-safe), not a regression introduced by this phase. It is surfaced here because phase 20
is the first consumer of the hook on an overlay that is specifically motion-sensitive.

**Fix:**  
Short-term: add a `suppressHydrationWarning` guard or initialise from a server-set cookie
if reduced-motion status is available at SSR time.  
Simplest client-only fix: initialise `reduced` to `true` (motion suppressed by default)
and update after mount. This reverses the flash direction: no confetti during SSR, then
confetti appears for users who *do* allow motion. This is less jarring than the reverse:

```ts
// src/hooks/use-prefers-reduced-motion.ts
export function usePrefersReducedMotion(): boolean {
  // Default to true (suppressed) so SSR/initial render is motion-free.
  // Immediately corrected on client for users who allow motion.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
```

Note: changing the default affects **all** consumers of this hook (currently
`level-up-overlay.tsx` and Phase 19's `habitat-video.tsx`). Verify that `habitat-video.tsx`
still behaves correctly (no video starts where it previously would) before landing.

---

_Reviewed: 2026-06-21_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
