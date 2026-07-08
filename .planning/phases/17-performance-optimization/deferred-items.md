# Phase 17 — Deferred Items

Out-of-scope discoveries surfaced during execution. Per the executor's scope-boundary
rule, these are logged (not fixed) because they are pre-existing and unrelated to the
task that surfaced them.

## 17-04

### `lint/a11y/useAriaPropsSupportedByRole` on `src/components/welcome/habitat-teaser.tsx`

- **Found during:** Task 2 (D-05 Motion→CSS swap), while running scoped `npx biome ci`
  on all touched files.
- **Finding:** `npx biome ci src/components/welcome/habitat-teaser.tsx` flags the
  outer `<div className="relative w-full overflow-hidden" ... aria-label="Leo's
  growing habitat preview">` — biome's `useAriaPropsSupportedByRole` rule considers
  `aria-label` unsupported on a role-less `<div>`.
- **Confirmed pre-existing:** `git stash` + re-run of `npx biome ci` against the
  unmodified (pre-Phase-17) file reproduces the identical error at the
  pre-edit line number. Task 2's diff does not touch this div at all (only the
  Motion glow overlay below it was changed). Not caused by, or fixable within,
  this plan's declared `files_modified` scope for a Motion→CSS swap.
- **Not fixed:** out of scope for a D-05 animation-library swap; the correct fix
  (e.g., adding a landmark role, or using a labelled `<section>`/removing the
  redundant label since `TeaserScene` is already `aria-hidden`-equivalent by being
  purely decorative) is a separate a11y cleanup task.
- **Where:** `src/components/welcome/habitat-teaser.tsx`, the `HabitatTeaser` outer
  wrapper div (onboarding/welcome flow — not one of Phase 17's three gated routes).
