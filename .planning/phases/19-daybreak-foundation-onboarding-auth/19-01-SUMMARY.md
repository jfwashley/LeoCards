---
phase: 19-daybreak-foundation-onboarding-auth
plan: "01"
subsystem: ui
tags: [react, tailwind, vitest, testing-library, jsdom, daybreak, design-system]

requires:
  - phase: daybreak-spike
    provides: globals.css Daybreak tokens, layout.tsx Baloo2+Figtree fonts, lion-face.tsx, auth-card.tsx (pre-Phase 19 baseline)

provides:
  - TField: forwardRef<HTMLInputElement, TFieldProps> labeled input primitive (src/components/daybreak/t-field.tsx)
  - TBtn: primary button with isPending spinner/disabled state (src/components/daybreak/t-btn.tsx)
  - Pill: warm-tint chip primitive (src/components/daybreak/pill.tsx)
  - Card: white card surface primitive with 22px radius + amber shadow (src/components/daybreak/card.tsx)
  - usePrefersReducedMotion: SSR-safe shared hook (src/hooks/use-prefers-reduced-motion.ts)
  - jsdom + @testing-library/react installed as dev deps (Wave 0 test infra)

affects:
  - 19-02 (login refactor to TField/TBtn)
  - 19-03 (signup/forgot/reset refactor)
  - 19-04 (welcome flow: TBtn, Card, usePrefersReducedMotion)
  - 19-05 (empty states: Pill, Card)

tech-stack:
  added:
    - jsdom (dev, Wave 0 gap — not previously installed)
    - "@testing-library/react" (dev, Wave 0 gap — not previously installed)
  patterns:
    - Per-file @vitest-environment jsdom docblock; global node default unchanged
    - React.forwardRef<HTMLInputElement, TFieldProps> pattern for form primitives
    - Loader2 from lucide-react as the canonical spinner
    - afterEach(cleanup) from @testing-library/react for test isolation

key-files:
  created:
    - src/components/daybreak/t-field.tsx
    - src/components/daybreak/t-btn.tsx
    - src/components/daybreak/pill.tsx
    - src/components/daybreak/card.tsx
    - src/components/daybreak/__tests__/t-field.test.tsx
    - src/components/daybreak/__tests__/t-btn.test.tsx
    - src/hooks/use-prefers-reduced-motion.ts
  modified:
    - src/components/habitat-video.tsx (removed inline hook; import from shared hook)
    - package.json + package-lock.json (jsdom + @testing-library/react added)

key-decisions:
  - "jsdom and @testing-library/react were NOT installed; installed as dev deps per WAVE 0 NOTE"
  - "Per-file @vitest-environment jsdom docblock chosen (not global env change) to preserve existing node-env unit tests"
  - "TBtn does not carry 'use client' directive — it uses no hooks; RSC-compatible but will hydrate when inside client trees"
  - "SVG className in jsdom is SVGAnimatedString (not string); tests use getAttribute('class') instead of .className"
  - "afterEach(cleanup) added explicitly; @testing-library/react does not auto-cleanup without jest globals"
  - "DSY-01 baseline confirmed — no edits needed to globals.css or layout.tsx"

patterns-established:
  - "TField: forwardRef wrapping <input>; fieldId derived from id ?? label.toLowerCase().replace(/\\s+/g, '-'); error border via border-destructive class"
  - "TBtn: disabled={isPending || disabled}; Loader2 replaces children when isPending; className merged via .filter(Boolean).join(' ')"
  - "Pill: inline-flex rounded-full with --db-pill-bg / --db-pill-text CSS vars"
  - "Card: inline style for borderRadius/border/boxShadow matching auth-card.tsx surface pattern"
  - "Shared hooks live in src/hooks/; use 'use client' directive; SSR-safe default state"

requirements-completed: [DSY-01, DSY-02, DSY-03]

duration: 25min
completed: 2026-06-20
---

# Phase 19 Plan 01: Daybreak Foundation Summary

**Four Daybreak UI primitives (TField/TBtn/Pill/Card), a shared SSR-safe reduced-motion hook, and jsdom test infra — the contract layer every Phase 19 plan imports**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-20T11:45:00Z
- **Completed:** 2026-06-20T11:58:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Installed jsdom + @testing-library/react (Wave 0 gap; not previously in the project)
- Built TField (forwardRef, error/hint, label wiring, prop spread) and TBtn (Loader2 spinner, isPending/disabled) — 16 unit tests, all green under jsdom
- Built Pill (--db-pill-bg/--db-pill-text tokens) and Card (22px radius, #F0E3CF border, amber shadow inline style) — tsc exits 0
- Extracted usePrefersReducedMotion to src/hooks/; habitat-video.tsx updated with no regression (6/6 existing tests pass)
- DSY-01 baseline confirmed: --background #fff6e9, --primary #f28a1f, @theme inline font vars in globals.css; Baloo_2 + Figtree via next/font/google in layout.tsx

## Exported Prop Shapes (downstream plans depend on these)

```ts
// TField — src/components/daybreak/t-field.tsx
interface TFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;       // required; visible <label>, htmlFor wired to fieldId
  error?: string;      // shows red border-destructive + helper text when set
  hint?: string;       // shows muted helper text only when error is absent
}
export const TField: React.ForwardRefExoticComponent<
  TFieldProps & React.RefAttributes<HTMLInputElement>
>;
TField.displayName = "TField";

// TBtn — src/components/daybreak/t-btn.tsx
interface TBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean; // shows <Loader2 className="size-5 animate-spin"> + disables button
}
export function TBtn(props: TBtnProps): JSX.Element;

// Pill — src/components/daybreak/pill.tsx
interface PillProps {
  children: React.ReactNode;
  className?: string;
}
export function Pill(props: PillProps): JSX.Element;

// Card — src/components/daybreak/card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
export function Card(props: CardProps): JSX.Element;

// usePrefersReducedMotion — src/hooks/use-prefers-reduced-motion.ts
export function usePrefersReducedMotion(): boolean;
// Returns false on SSR/first render; subscribes to "(prefers-reduced-motion: reduce)"
```

## jsdom Decision

jsdom and @testing-library/react were NOT installed. Installed as dev deps per the WAVE 0 NOTE in the plan (`npm i -D jsdom @testing-library/react` added 44 packages). Each new `__tests__/*.test.tsx` file carries a `// @vitest-environment jsdom` docblock at the top — the global `environment: "node"` default in vitest.config.ts is unchanged. Existing non-DOM tests (habitat-video, qa-state-badge, etc.) remain unaffected. `afterEach(() => cleanup())` is required explicitly because @testing-library/react doesn't auto-cleanup without jest globals; omitting it caused DOM accumulation across tests (identified and fixed during GREEN phase).

## DSY-01 Baseline Result

**Confirmed — no edits required.**

- `src/app/globals.css :root`: `--background: #fff6e9` (cream), `--primary: #f28a1f` (amber), `--destructive: #de5f4a`, `--border: #eddfc9`, `--db-field-bg: #fffbf4`, `--db-btn-shadow`, `--db-pill-bg/#fff1dc`, `--db-pill-text/#b4762a`, `--db-card-*` tokens all present.
- `src/app/globals.css @theme inline`: `--font-display: var(--font-display)`, `--font-sans: var(--font-sans)` mapped.
- `src/app/layout.tsx`: `Baloo_2` loaded with `variable: "--font-display"`, `Figtree` with `variable: "--font-sans"`; both applied on `<html className>` via `cn(figtree.variable, baloo2.variable, "font-sans")`.

The spike landed DSY-01 cleanly. No token or font gap found.

## Task Commits

1. **Task 1: TField + TBtn + jsdom tests** — `e85ba35` (feat)
2. **Task 2: Pill + Card primitives** — `9dc699f` (feat)
3. **Task 3: usePrefersReducedMotion hook extraction + DSY-01 verify** — `b13d3b3` (feat)

## Files Created/Modified

- `src/components/daybreak/t-field.tsx` — forwardRef labeled input primitive
- `src/components/daybreak/t-btn.tsx` — primary button with spinner/disabled
- `src/components/daybreak/__tests__/t-field.test.tsx` — 9 unit tests (jsdom)
- `src/components/daybreak/__tests__/t-btn.test.tsx` — 7 unit tests (jsdom)
- `src/components/daybreak/pill.tsx` — warm-tint chip primitive
- `src/components/daybreak/card.tsx` — white card surface (22px radius, amber shadow)
- `src/hooks/use-prefers-reduced-motion.ts` — SSR-safe shared hook (new)
- `src/components/habitat-video.tsx` — removed inline hook; imports shared hook
- `package.json` + `package-lock.json` — jsdom + @testing-library/react added

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] afterEach(cleanup) needed for test DOM isolation**
- **Found during:** Task 1 (GREEN phase — first run after implementing components)
- **Issue:** @testing-library/react does not auto-cleanup between tests without jest globals; rendered DOM accumulated across tests, causing id collision failures and "found multiple elements" errors
- **Fix:** Added `afterEach(() => cleanup())` to both test files; also fixed SVG className check to use `getAttribute('class')` since jsdom returns SVGAnimatedString not a plain string
- **Files modified:** t-field.test.tsx, t-btn.test.tsx
- **Verification:** 16/16 tests pass
- **Committed in:** e85ba35 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — test isolation)
**Impact on plan:** Required fix for green tests. No scope creep, no architectural change.

## Issues Encountered

None beyond the test isolation bug documented above.

## Known Stubs

None — all four primitives are fully wired presentational components. No placeholder data, hardcoded empty values, or TODO markers.

## Threat Flags

None — plan adds presentation-only primitives and a media-query hook. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Verified: no `dangerouslySetInnerHTML` in any primitive (T-19-01-XSS mitigated).

## Next Phase Readiness

- TField and TBtn ready for 19-02 (login refactor) and 19-03 (signup/forgot/reset refactor)
- Pill and Card ready for 19-05 (empty states)
- usePrefersReducedMotion ready for 19-04 (welcome teaser habitat-teaser.tsx)
- Full vitest suite: 1954 tests pass, 6 skipped — no regressions

---
*Phase: 19-daybreak-foundation-onboarding-auth*
*Completed: 2026-06-20*

## Self-Check: PASSED

Files verified:
- src/components/daybreak/t-field.tsx: FOUND
- src/components/daybreak/t-btn.tsx: FOUND
- src/components/daybreak/pill.tsx: FOUND
- src/components/daybreak/card.tsx: FOUND
- src/components/daybreak/__tests__/t-field.test.tsx: FOUND
- src/components/daybreak/__tests__/t-btn.test.tsx: FOUND
- src/hooks/use-prefers-reduced-motion.ts: FOUND

Commits verified:
- e85ba35: feat(19-01): add TField + TBtn Daybreak primitives with jsdom unit tests
- 9dc699f: feat(19-01): add Pill + Card Daybreak primitives
- b13d3b3: feat(19-01): extract usePrefersReducedMotion to shared hook; verify DSY-01 baseline
