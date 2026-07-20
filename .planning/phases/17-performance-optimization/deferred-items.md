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

## 17-05 (post-review PERF-04 investigation, 2026-07-20)

### <100ms instant-nav aspiration

- **Found during:** the post-review PERF-04 nav-outlier investigation (see
  `17-05-SUMMARY.md` addendum and `.planning/STATE.md` decisions).
- **Finding:** even after fixing the study→dashboard outlier (Neon undici
  keep-alive + Link exit + redundant-refresh removal), all six hub-and-spoke
  nav pairs floor at ~470-690ms, not the originally-desired <100ms
  instant-nav feel. D-15's gate was re-baselined to 850ms (Josh's directive,
  2026-07-20) because ~600ms is the architectural floor for genuinely
  dynamic RSC routes (real server render + Neon round trip per navigation)
  under the stable Next API surface.
- **Not fixed:** achieving true <100ms instant-nav would require Partial
  Prerendering / Cache Components (`cacheComponents` flag), which is
  experimental and requires its own D-07 checkpoint before adoption — out of
  scope for this phase's re-baselined, Josh-accepted 850ms gate.
- **Where:** all four key routes (`/dashboard`, `/study`, `/deck/new-card`,
  `/deck/browse`) and `e2e/13-perf.spec.ts`'s `NAV_GATE_MS` constant.
