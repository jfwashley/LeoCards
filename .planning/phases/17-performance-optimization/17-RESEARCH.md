# Phase 17: Performance optimization - Research

**Researched:** 2026-07-02
**Domain:** Next.js 16 App Router bundle reduction (client→RSC conversion, dependency hygiene, poster-first media, prod-build instant-nav gate)
**Confidence:** HIGH (all core claims verified against shipped `node_modules/next/dist/docs/`, actual repo source, and built `.next/` artifacts — this repo produces evidence, not training-data guesses)

## Summary

The Phase 16 baseline is unambiguous: all four key routes (`/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`) fail mobile TBT (518–891 ms vs ≤200) and Perf score (79–86 vs ≥90) while LCP and CLS already pass everywhere. `.next/diagnostics/route-bundle-stats.json` shows a **514.72 KB shared floor** present on literally every route including `/` and `/_not-found` — 9 chunks (`0x.73w57rn4ou.js`, `0i.l9589uvx0j.js`, `0-hrh_uw98wb_.js`, `0~k6u5_j-9bf2.js`, `04jz-y17vz80c.js`, `0v-nnodu33ws~.js`, `0gyhlsobr-.-~.js`, `0jb.wowuku9y3.js`, `turbopack-0z5bv5-e51wux.js`) that every authenticated route inherits before a single byte of route-specific code loads. Cutting this shared floor (D-08) compounds across all four routes and is the highest-leverage single move available.

The single largest per-route client boundary is `DeckView` (`src/components/deck-view.tsx`) — a `"use client"` component that wraps the ENTIRE dashboard page body (header markup, `HabitatHero`, action buttons, `CardList`) for the sake of one countdown timer and a deck-switch handler. `HabitatHero` itself (imported by `DeckView`) is `"use client"` with zero interactivity — pure presentational markup around a `<Link>`. These are the clearest D-06 (client→RSC) wins and directly enable D-02 (poster-first dashboard hero) once server-rendered.

Two premises in the phase context need correction from direct evidence, not relitigation of the locked decisions:
1. **`three` is already NOT in the production client bundle.** `grep -rl "three" .next/static/chunks/*.js` returns zero matches. `habitat-3d-canvas.tsx`'s only import site is gated `process.env.NODE_ENV !== "production"` and PROJECT.md explicitly documents "Three.js runs only in the build-time render pipeline." The −900 KB win from three.js removal was already banked in Phase 13.1. D-05's "remove dead weight" work here is a `package.json` **hygiene fix** (move `three`/`@types/three` to `devDependencies`), not a bundle-KB win — do not plan/measure it as one.
2. **`cacheComponents` / Cache Components / `unstable_instant` / `use cache` / `updateTag`/`cacheTag` are ALL gated behind an experimental flag** (`next.config.ts` currently has zero config — the flag is off). Every claim about this model in this research is tagged `[CITED: experimental]` and requires a D-07 checkpoint before any use. The **stable, non-experimental** path for D-17 (targeted invalidation) is `router.refresh()` (already used once in `deck-view.tsx`) plus the "Previous Model" caching guide (`fetch({cache:'force-cache'})`, `unstable_cache`, `revalidateTag`/`revalidatePath` from Server Actions) — none of which require a checkpoint.

**Primary recommendation:** Attack shared-chunk-first (D-08 root layout/providers/auth client), then convert the obvious zero-interactivity client boundaries to RSC per route (dashboard: `DeckView`+`HabitatHero`; study/browse/new-card: audit each page tree the same way), re-measuring with a new route-scoped `measure-cwv.mjs` flag after each batch. Do not touch `cacheComponents`/`unstable_instant` without a Josh checkpoint carrying measured before/after evidence.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CWV gate measurement (LCP/TBT/CLS/Perf) | Browser (Lighthouse emulation) | API/Backend (warm-prod target) | `measure-cwv.mjs` drives a real browser (puppeteer-core) against the deployed Vercel prod origin — the metric surface is 100% client-observed |
| Client→RSC conversion | Frontend Server (SSR/RSC) | Browser (hydration cost removed) | Moving `DeckView`/`HabitatHero` etc. off `"use client"` removes hydration JS from the browser tier; the server tier absorbs the render, which was already happening for data-fetching regardless |
| Poster-first habitat hero (D-02) | Browser (LCP paint) | Frontend Server (poster URL resolved server-side) | The poster `<Image priority>` must be the LCP candidate — this is fundamentally a browser-tier paint-timing concern; the ambient clip/player JS is a browser-tier lazy-load decision |
| Shimmer placeholder (D-03) | Browser (Suspense fallback / CLS reservation) | Frontend Server (loading.tsx / Suspense boundary placement) | CLS=0 requires space reservation, which is a browser-tier layout concern, but WHERE the boundary sits (loading.tsx vs inline Suspense) is decided server-side |
| Route filter for measure-cwv.mjs (D-09) | Build/Tooling (Node script) | — | Pure Node.js script argv/env parsing — no browser or server-runtime tier involved |
| PERF-04 instant-nav gate (D-13..17) | Browser (Playwright timing) | API/Backend (local prod build serving via `next start`) | The gate measures browser-observed paint/content-visible timing against a locally-served prod build — both tiers are load-bearing (prefetch is browser-tier; RSC payload generation is server-tier) |
| Targeted cache invalidation (D-17) | Frontend Server (`router.refresh()` triggers RSC re-render) | Database/Storage (source of truth for due-counts/habitat state) | `router.refresh()` re-runs Server Components against the current DB state — no explicit cache layer exists between them since `cacheComponents` is off |
| Dependency swaps (Motion→CSS, D-05) | Browser (client bundle KB, paint) | — | Pure client-tier JS-weight and animation-fidelity concern |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Daybreak fidelity (loading behaviour)**
- D-01: Mobile-first progressive loading. Settled state must match today's Daybreak exactly — fidelity applies to the destination, not the journey.
- D-02: Dashboard habitat hero is poster-first. LCP paints a static image instantly; ambient clip + player JS load after interactive, cross-fade in.
- D-03: Placeholders are one reusable simple Daybreak-toned shimmer style (cream/amber rounded blocks). No per-section designed skeletons this phase. CLS 0 must hold.
- D-04: Gate-vs-fidelity conflicts checkpoint Josh with measured evidence + specific proposed visible change.

**Refactor latitude**
- D-05: Dependency swaps allowed where visually identical (Motion entrances/fades → CSS where indistinguishable; keep library for load-bearing moments like level-up confetti). Dead weight (e.g. `three`) removed outright.
- D-06: Client→RSC conversions allowed freely where behaviour is identical — locked as the primary TBT lever. QA harness + e2e suite guard behaviour.
- D-07: next.config/build settings — stable options land freely with before/after numbers; anything marked experimental in Next 16 docs requires a checkpoint with evidence first.
- D-08: Shared infrastructure (root layout, providers, fonts, auth client) may be refactored — the ~9 shared chunks live there, wins compound across all four routes. Guards: `/habitat` spot-check (D-11) + existing e2e auth coverage.

**Measure/verify cadence**
- D-09: Route-scoped measurement per optimization batch (`measure-cwv.mjs` gains a route filter — the harness script is not immutable, only the baseline artifacts are) + one full final 4-route × 2-preset run diffed against the Phase 16 baseline.
- D-10: Correctness gates per risky wave + final: full e2e after every wave; `qa:run` after any wave touching study/SRS/data paths or client→RSC boundary moves, always once at phase end as the criterion-4 proof.
- D-11: One `/habitat` regression spot-check (n=3, mobile) after shared-bundle refactors land, plus inclusion in the final full run. `/habitat` stays OUT of the key-route gate set.
- D-12: Gates pass = done. No gold-plating once a route passes all four gates.

**PERF-04 instant-nav gate**
- D-13: Coverage = 6 hub-and-spoke navigations: dashboard↔study, dashboard↔new-card, dashboard↔browse — in-app link taps only. Browser Back not separately gated.
- D-14: Surface = local prod build (`next build && next start`) via Playwright extending `e2e/13-perf.spec.ts`. Never the dev server.
- D-15: Pass = destination's REAL content visibly rendered ≤100 ms, median n≥5 per pair, prefetch warm. Skeletons/loading.tsx do NOT count.
- D-16: Link prefetch tuning is in scope for the 6 gated links — RSC payload should be local before the tap.
- D-17: Instant with targeted invalidation. Mutations (study session completion, card add) explicitly invalidate/refresh so dashboard due-counts + habitat state are correct on landing. No always-refetch; no visibly self-correcting numbers.

### Claude's Discretion
- Which components to split/convert per route, chunk-attribution method, order routes are attacked (worst-first vs shared-chunks-first).
- Exact placeholder implementation, prefetch mechanics (default vs explicit vs hover-triggered), targeted-invalidation mechanism (`router.refresh` vs revalidation tags — per what Next 16 docs prescribe).
- Route-filter flag design for `measure-cwv.mjs`, nav-timing instrumentation details (markers, content-visible signal).

### Deferred Ideas (OUT OF SCOPE)
- Designed per-section skeleton states — declined this phase (D-03 uses one simple shimmer style).
- Browser-Back navigation gating — declined (D-13); Next's client cache handles it.
- PERF-05/06 (field validation, one-command re-cert) remain Phase 18.
- `/habitat` optimization — already CWV-green; regression spot-check only (D-11).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-03 | Each key route meets CWV "Good" gates on warm prod mobile (LCP ≤2500/TBT ≤200/CLS ≤0.1/Perf ≥90, n≥5 medians); every optimization lands with measured before/after vs the PERF-02 baseline | Bundle attribution method (route-bundle-stats.json + built chunk grep), the specific client→RSC conversion candidates identified per route, the D-09 route-filter design for repeatable route-scoped before/afters, and the non-experimental next.config levers (`optimizePackageImports` already free via lucide-react default-list, `serverExternalPackages`) |
| PERF-04 | Warm client-side navigation between key routes feels instant (<~100ms perceived), instrumented via Playwright extending `e2e/13-perf.spec.ts` | Full read of `e2e/13-perf.spec.ts` current structure/limitations, the prefetching.md guide (client cache TTL, static vs dynamic route prefetch table), the instant-navigation.md guide (flagged experimental — do NOT adopt `unstable_instant` without D-07 checkpoint), and the D-17 non-experimental invalidation mechanism (`router.refresh()`) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 (confirmed via package.json) | App Router framework — the optimization surface itself | Already the project's framework; this phase works within it, no swap |
| lighthouse | ^13.3.0 (confirmed via package.json) | Warm-prod CWV measurement via `measure-cwv.mjs` | Already the project's measurement tool from Phase 16; PERF-03's authoritative gate |
| playwright | ^1.58.2 (confirmed via package.json) | e2e correctness + PERF-04 nav-timing instrumentation | Already the project's e2e tool; PERF-04 extends `e2e/13-perf.spec.ts` in place |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | ^12.38.0 (confirmed via package.json) | Physics-driven animation (drag/swipe, confetti) | Keep for `study-card.tsx` (swipe drag physics via `useMotionValue`/`useTransform` — load-bearing, NOT CSS-replaceable) and `level-up-overlay.tsx` (confetti, explicitly load-bearing per D-05). Simple entrance/fade usages elsewhere are D-05 CSS-swap candidates |
| lucide-react | ^1.0.1 (confirmed via package.json) | Icon components | Already on Next's default `optimizePackageImports` list `[CITED: node_modules/next/dist/docs/.../optimizePackageImports.md]` — tree-shaking is automatic, zero config, zero experimental-flag exposure needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `experimental.optimizePackageImports` for NEW packages | Manual named-import auditing per package | Adding packages to the experimental list requires a D-07 checkpoint; auditing imports by hand (e.g. `import { X } from "lib/X"` instead of `import { X } from "lib"`) achieves the same tree-shaking without touching the experimental config surface — prefer this for any package not already on the default-optimized list |
| `cacheComponents`/`use cache`/`unstable_instant` for D-17 invalidation | `router.refresh()` + Server Action-triggered `revalidateTag`/`revalidatePath` (Previous Model) | Cache Components is the "future" model but is `version: experimental` per the shipped docs and requires `cacheComponents: true` — a config flag change that itself needs a D-07 checkpoint with evidence. The Previous Model achieves targeted invalidation today with zero experimental surface |
| `npx next experimental-analyze` (Turbopack bundle analyzer) | `.next/diagnostics/route-bundle-stats.json` (already produced by every `next build`, no flag) + `@next/bundle-analyzer` (stable, webpack-only) | `experimental-analyze` is explicitly `(Experimental)` in `package-bundling.md`, available "in v16.1 and later" with an open GitHub feedback thread — treat any USE of it (not just config) as needing a D-07 checkpoint. The already-produced `route-bundle-stats.json` gives per-route first-load KB + exact chunk list with zero new tooling; it was sufficient to identify the 9 shared chunks and the true 514.72 KB floor for this research |

**Installation:** No new packages required for the core optimization work — this phase is subtractive (removing/converting/lazy-loading existing code), not additive. If a route-filter CLI parser is desired for `measure-cwv.mjs`, Node's built-in `process.argv` parsing (already used elsewhere in the script for env vars) is sufficient; no new dependency needed.

**Version verification:** `next@16.2.1`, `motion@12.38.0`, `three@0.160.1`, `lucide-react@1.0.1`, `lighthouse@13.3.0`, `playwright@1.58.2` all confirmed directly from `package.json` (not npm registry lookup — this is an existing installed project, versions are ground truth from the lockfile-adjacent manifest, not a fresh install decision).

## Package Legitimacy Audit

This phase installs **no new external packages** — every recommended change either removes/relocates an existing dependency (`three`/`@types/three` → `devDependencies`) or uses APIs already shipped in `next`/`react`/`motion` that are already installed. The Package Legitimacy Gate protocol (slopcheck, registry verification) does not apply because there is nothing new to vet.

If the planner discovers a genuine need for a new package during task breakdown (e.g. a dedicated bundle-diff tool), it must be run through the full slopcheck + registry-verification gate before being added here — do not add a package to a plan without that step.

## Architecture Patterns

### System Architecture Diagram

```
[Browser: Link tap on dashboard]
        |
        v
[Next.js client-side router: check prefetch cache]
   |                                    |
   | (RSC payload prefetched?)          | (not yet prefetched)
   v                                    v
[instant client nav: swap RSC   [server round-trip: re-render
 payload, no server round-trip]  target route's Server Components]
        |                                    |
        +--------------+---------------------+
                       v
        [Target route renders: Server Components
         run on server, resolve data via Drizzle/Neon,
         stream RSC payload back]
                       |
                       v
        [Client boundary hydrates: ONLY the
         "use client" leaf components (e.g. CardList
         search/edit, StudyCard swipe physics) pick up
         interactivity — everything else stays static markup]
                       |
                       v
        [Mutation occurs: e.g. POST /api/study/grade]
                       |
                       v
        [Server Action / Route Handler: writes to DB,
         then explicitly calls router.refresh() (client)
         or revalidateTag/revalidatePath (Previous Model,
         server-side) to invalidate stale RSC payload]
                       |
                       v
        [Next navigation to dashboard: due-count/habitat
         state served FRESH, not stale-cached (D-17)]
```

A reader can trace: link tap -> prefetch-cache check -> instant swap (or round trip) -> Server Component render -> selective client hydration -> mutation -> explicit invalidation -> next landing shows fresh state. This matches how `deck-view.tsx`'s existing `CountdownTimer` already uses `router.refresh()` when a cooldown expires — the pattern already exists in the codebase for one case and generalizes to D-17's due-count/habitat-state invalidation.

### Recommended Project Structure
No new directories are required. Work happens in-place:
```
src/
├── app/(protected)/
│   ├── dashboard/page.tsx      # RSC — already async Server Component; DeckView split happens here
│   ├── study/page.tsx          # audit same client-boundary pattern
│   ├── deck/new-card/page.tsx  # audit same client-boundary pattern
│   └── deck/browse/page.tsx    # audit same client-boundary pattern
├── components/
│   ├── deck-view.tsx           # D-06 target: split static layout (server) from CountdownTimer/handleDeckChange (client leaf)
│   ├── habitat-hero.tsx        # D-06 target: zero interactivity today, convert to RSC outright
│   ├── habitat-widget.tsx      # VERIFY-FIRST: appears unused (0 import sites found) — confirm before deleting
│   └── habitat-3d-widget-image.tsx  # same — only reachable via habitat-widget.tsx
└── (no new top-level dirs needed)
```

### Pattern 1: Extract a client leaf from an all-client wrapper (D-06 primary lever)
**What:** When a `"use client"` component wraps mostly-static markup for the sake of one or two interactive pieces (state, event handlers, hooks), extract ONLY the interactive piece into its own small client component and let the parent become (or be replaced by) a Server Component that renders static markup + imports the client leaf.
**When to use:** Any component where `"use client"` exists solely because a descendant needs `useState`/`useEffect`/event handlers, not because the component itself needs them.
**Example — the concrete `HabitatHero` conversion (verified: zero hooks, zero event handlers in the current file, only a `<Link>` + conditional text):**
```tsx
// Source: pattern derived from package-bundling.md "Heavy client workloads" example
// BEFORE: src/components/habitat-hero.tsx (line 1: "use client" — unnecessary)
// AFTER: no "use client" directive at all. Every current line of markup in
// habitat-hero.tsx (the Link wrapper, ChevronRight SVG, subtitle logic) is
// already Server-Component-compatible: no hooks, no window/document access,
// no event handlers. Removing the directive converts it to RSC with ZERO
// behavior change (matches D-06's "identical behaviour" bar exactly).
```
**Example — `DeckView` split (verified: only `CountdownTimer` (internal to StatusText) and `handleDeckChange` need client-side reactivity):**
```tsx
// Source: pattern derived from Next.js docs' Server/Client Components model
// (node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md)
// KEEP as "use client": CountdownTimer (uses useState/useEffect/useRouter for
// the 60s tick + router.refresh() on cooldown expiry) and the deck-switcher
// click handler.
// CONVERT: the outer <div className="min-h-screen ..."> layout, <AppHeader>
// wiring (if AppHeader itself has no required client state beyond what it
// already owns), the action-button block, and the HabitatHero render become
// server-rendered markup in dashboard/page.tsx directly, importing only the
// small CountdownTimer/StatusText client leaf where needed.
```

### Pattern 2: Poster-first media with cross-fade (D-02) — REUSE, do not reinvent
**What:** `/habitat`'s `habitat-video.tsx` already implements exactly this pattern for the SAME habitat media: a `next/image priority` poster rendered permanently underneath, with the ambient `<video>` (autoplay/muted/loop) layered on top once it decodes.
**When to use:** For D-02's dashboard habitat hero poster-first requirement — do not invent new poster/cross-fade mechanics. Mirror `habitat-video.tsx`'s exact structure (poster as `Image priority` bottom layer, video top layer, `reducedMotion` early-return to poster-only).
**Verified caveat:** The dashboard currently does NOT render an ambient video at all — `HabitatHero`/`HabitatMedallion` render a static SVG/image medallion, and the actual video-bearing component (`HabitatWidgetImage`) is unreferenced dead code (0 import sites found via grep). D-02 work must first decide: does "dashboard habitat hero is poster-first" mean (a) add a NEW ambient clip to the dashboard hero that didn't exist before, mirroring `/habitat`'s pattern, or (b) the poster-first requirement is really about the EXISTING static medallion/image already being instant (which it already is, per the passing LCP baseline)? **This is a discretion-area ambiguity the planner must resolve** — the baseline shows dashboard LCP already passes at 1816ms (well under 2500ms), which argues D-02 may already be satisfied by the existing static-image approach and needs no NEW media work, only confirmation. Flag for the planner to verify against the actual Daybreak dashboard designs before assuming new video work is required.
```tsx
// Source: src/components/habitat-video.tsx (existing, verified code) — the
// EXACT pattern to mirror if new dashboard ambient media is confirmed needed:
const Poster = (
  <Image src={poster} alt={...} fill unoptimized priority
    sizes="(max-width: 768px) 100vw, 720px" style={{ objectFit: "cover", filter }} />
);
if (reducedMotion) return Poster;
return (<>{Poster}<video autoPlay muted loop playsInline preload="metadata">...</video></>);
```
**CORRECTION to an existing in-repo code comment:** `habitat-3d-widget-image.tsx` line 15 claims `preload` is the "Next.js 16 replacement for `priority`". This is FALSE per direct verification of `node_modules/next/dist/shared/lib/get-img-props.js` line 148 (both props exist as independent parameters) and line 404 (an explicit runtime error is thrown if BOTH `preload` and `priority` are set together) `[VERIFIED: next/dist/shared/lib/get-img-props.js]`. They are NOT interchangeable — do not propagate this misconception into new Phase 17 code. `habitat-video.tsx` itself correctly uses `priority` (not `preload`) for its LCP poster.

### Pattern 3: `next/dynamic` for below-the-fold or interaction-gated client code (D-03 shimmer host)
**What:** `next/dynamic(() => import(...), { loading: () => <Shimmer /> })` gives a component-level lazy boundary with a custom loading fallback — the natural host for D-03's single reusable shimmer.
**When to use:** Any client component not needed for the initial paint (e.g. `CardEditDialog` only needed on edit-click, `image-upload-flow.tsx` only needed on the new-card route's upload path).
**Example:**
```tsx
// Source: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md
const CardEditDialog = dynamic(() => import("@/components/card-edit-dialog"), {
  loading: () => <DaybreakShimmer />, // D-03's one reusable style
});
```

### Anti-Patterns to Avoid
- **Adopting `cacheComponents: true` / `unstable_instant` / `use cache` without a D-07 checkpoint:** every one of these APIs is explicitly `version: experimental` or `version: draft` in the shipped docs. D-07 requires evidence-first checkpoint before ANY experimental flag use — this includes the entire "current" caching.md/revalidating.md model, which only activates once `cacheComponents: true` is set.
- **Treating `three`/three.js removal as a bundle-KB lever:** it is already excluded from the production bundle (verified via chunk grep). Re-measuring before/after this "removal" will show ~0 KB delta because there was never runtime weight to remove — plan it as a `package.json` dependencies-vs-devDependencies hygiene task, not a TBT-reduction task.
- **Re-running full `measure-cwv.mjs` mid-phase and overwriting Phase 16's `baseline/` directory:** `OUT_DIR` in the current script (line ~572) points directly at `.planning/phases/16-performance-baseline-measure/baseline/` — CONTEXT.md explicitly forbids editing anything under `baseline/`. The D-09 route-filter work MUST also redirect output to a NEW Phase-17-owned directory (e.g. `.planning/phases/17-performance-optimization/measurements/`) for any non-final run; only the phase-end full run should be considered for eventual promotion/comparison, and even then the ORIGINAL `baseline/` files stay untouched (diff, don't overwrite).
- **Conflating `e2e/13-perf.spec.ts`'s existing INP-via-PerformanceObserver measurement with `measure-cwv.mjs`'s Lighthouse TBT:** these are architecturally different signals (INP approximates real-user responsiveness to one synthetic interaction; TBT is a Lighthouse-computed main-thread-blocking metric). PERF-03's TBT gate is Lighthouse-only; PERF-04's `e2e/13-perf.spec.ts` extension has no TBT concept today and needs a NEW "content visibly rendered" timing signal for D-15 — it cannot reuse the existing LCP/CLS/INP capture as-is for the instant-nav pass/fail bar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle composition attribution | A custom AST/import-tracer script | `.next/diagnostics/route-bundle-stats.json` (already produced by every `next build`, zero flags) | Already gives exact per-route first-load KB + exact chunk-path list; this research used it directly to find the 514.72 KB shared floor and the exact 9 shared chunk filenames — no new tooling needed |
| Poster-then-video cross-fade for habitat media | New cross-fade/transition logic | `src/components/habitat-video.tsx`'s existing pattern (poster `Image priority` bottom layer + `<video>` top layer + `reducedMotion` early return) | Already built, already CWV-verified on `/habitat` (Perf 96 mobile per PROJECT.md), already handles reduced-motion and CLS=0 correctly |
| Targeted cache invalidation after mutation | A custom cache-tag/pub-sub layer | `router.refresh()` (client, already used once in `deck-view.tsx`'s `CountdownTimer`) or Server Action + `revalidateTag`/`revalidatePath` (Previous Model, server-side) | Both are first-class Next.js primitives designed for exactly this; building a custom layer duplicates framework functionality and risks missing edge cases (stale-while-revalidate semantics, RSC payload cache keys) the framework already handles |
| Shimmer/loading placeholder | Per-component bespoke skeleton markup | One shared `<DaybreakShimmer>` component (cream/amber rounded blocks, per D-03) wired via `next/dynamic`'s `loading` option or `loading.tsx` | D-03 explicitly locks this as ONE reusable style — building N bespoke skeletons contradicts the locked decision and multiplies maintenance surface for zero measured benefit this phase |

**Key insight:** This phase's highest-leverage moves are all reductive (delete/convert/relocate existing code) or reuse-existing-pattern (habitat-video's poster mechanics). The temptation to build new abstractions (a custom bundle analyzer, a custom cache layer) should be resisted — the framework and the existing `/habitat` precedent already solve these problems; Phase 17's job is applying those existing solutions to the four gate-failing routes, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Overwriting the immutable Phase 16 baseline via the route-filtered harness
**What goes wrong:** `measure-cwv.mjs`'s `OUT_DIR` constant currently points at `.planning/phases/16-performance-baseline-measure/baseline/` (the exact directory CONTEXT.md forbids editing). Adding a route filter without ALSO changing the output directory for non-final runs would silently corrupt the immutable "before" record every time an optimization batch is re-measured.
**Why it happens:** The script was written for a single one-shot baseline run (Phase 16); D-09 asks for repeated route-scoped runs from the SAME script during Phase 17, and the natural minimal-diff change (just add a filter) leaves the write path untouched.
**How to avoid:** Make the output directory itself parameterizable (e.g. derive from a `--phase`/`PHASE_OUT_DIR` argument, defaulting to a NEW Phase-17 directory, never defaulting back to the Phase 16 path). The final phase-end full run's output location is a discretion-area decision but must never literally overwrite files under `16-performance-baseline-measure/baseline/`.
**Warning signs:** Any diff to `.planning/phases/16-performance-baseline-measure/baseline/*.md` or `*.json` files during Phase 17 work is an immediate signal something has gone wrong — `git status` should show zero changes under that path for the entire phase.

### Pitfall 2: Confusing "three is a dependency" with "three ships to the client"
**What goes wrong:** Planning a task to "remove three.js for a bundle-size win," running it, then finding the measured before/after shows ~0 KB delta — apparent task failure, when actually the task's premise was already false.
**Why it happens:** `package.json` genuinely lists `three`/`@types/three` under `dependencies` (misleadingly, since PROJECT.md says "build-time only"), and D-05's phrasing ("Dead weight in the client graph... is removed outright") reads as implying it currently IS in the client graph.
**How to avoid:** Before writing this as a bundle-reduction task, confirm via `grep -rl "three" .next/static/chunks/*.js` (post a fresh `npm run build`) that it is truly absent, then scope the task correctly as a `package.json` classification fix (move to `devDependencies`) rather than a TBT-reduction lever. Do not promise a bundle-KB delta for this specific change in the plan's success criteria.
**Warning signs:** A measured before/after showing 0 KB change on a task framed as "remove dead weight" — this is expected and correct here, not a bug in the harness.

### Pitfall 3: Adopting an "experimental" Next.js 16 API mid-refactor without the D-07 checkpoint
**What goes wrong:** A plan task reaches for `cacheComponents: true` (to get PPR/`use cache`/`unstable_instant`) because it's the officially-recommended "current" model per `caching.md`'s framing, ships it, and only afterward realizes it required a checkpoint per D-07 — creating rework or a retroactive-approval awkwardness.
**Why it happens:** The docs present Cache Components as THE caching model (`08-caching.md`'s first line: "This page covers caching with Cache Components... If you're not using Cache Components, see the Previous Model guide") — it reads as the default/preferred path, not as an opt-in experimental feature, unless the reader notices the `version: experimental` frontmatter on `optimizePackageImports.md`, `instant-navigation.md`'s `version: draft`, and the `cacheComponents` config reference itself.
**How to avoid:** Before using ANY of: `cacheComponents`, `use cache`, `cacheLife`, `cacheTag`, `updateTag`, `unstable_instant`, `experimental.instantNavigationDevToolsToggle`, or `npx next experimental-analyze` — stop and route through D-04/D-07's checkpoint with measured evidence. The stable equivalents (Previous Model caching, `router.refresh()`, `route-bundle-stats.json`) achieve this phase's actual requirements without the flag.
**Warning signs:** Any diff touching `next.config.ts` that adds `cacheComponents` or `experimental.*` keys should trigger an automatic pause for review before proceeding.

### Pitfall 4: Treating `e2e/13-perf.spec.ts`'s INP measurement as TBT
**What goes wrong:** A plan conflates "extend the existing perf spec's thresholds" with "assert the PERF-03 TBT gate in Playwright" — but the file only ever measured INP (an approximation, per its own docstring: "INP / FID approximation"), never TBT. PERF-03's TBT gate is Lighthouse-only (`measure-cwv.mjs`); this file cannot substitute for it.
**Why it happens:** Both metrics relate to "main thread busy-ness" conceptually, and the file's existing `expect.soft(r.inp,...)` assertion looks superficially like it's already gating perf.
**How to avoid:** Keep the two harnesses' responsibilities cleanly separated in the plan: `measure-cwv.mjs` (Lighthouse) is the SOLE PERF-03 gate; `e2e/13-perf.spec.ts` (Playwright/PerformanceObserver) is the PERF-04 instant-nav gate PLUS the task_d326ebac INP-prod-build-only fix. Do not write a task that expects the Playwright file to prove TBT ≤200ms.
**Warning signs:** A task description mentioning both "TBT" and "e2e/13-perf.spec.ts" together without clarifying they're separate concerns.

### Pitfall 5: Running the D-14 prod-build instant-nav gate against the wrong server
**What goes wrong:** `playwright.config.ts` has `baseURL: "http://localhost:3000"` and `webServer: undefined` — the SAME port a `next start` prod build would also use by default. Running the existing dev-server-dependent e2e suite and the NEW prod-build-only PERF-04 gate without a clear separation risks accidentally measuring the dev server (with Turbopack HMR overhead) and believing it's the prod build, or vice versa.
**Why it happens:** Port 3000 is the default for both `next dev` and `next start`; nothing in the current config distinguishes them at the Playwright layer.
**How to avoid:** The D-14 gate needs an explicit signal (env var, separate Playwright project, or a wrapper script that runs `next build && next start` and only THEN invokes the specific perf-gate tests) so it's structurally impossible to accidentally run it against `next dev`. This is a discretion-area design decision for the planner, but the signal must be unambiguous and ideally fail loudly if the dev server responds instead (e.g. checking for a `dev`-only marker or response header difference).
**Warning signs:** PERF-04 gate results that look suspiciously similar across runs regardless of code changes — a sign the "prod build" pass may actually be hitting a stale dev server.

### Pitfall 6: `HabitatWidget`/`HabitatWidgetImage` deletion without confirming zero call sites
**What goes wrong:** A plan task deletes `habitat-widget.tsx` and `habitat-3d-widget-image.tsx` as dead-code bundle savings, but a call site exists that wasn't caught by a single grep pass (e.g. dynamic import, re-export, or test-only usage that still needs updating).
**Why it happens:** This research found zero non-definition matches for `HabitatWidget\b` via one grep pass across `src/`, which is strong but not exhaustive evidence (doesn't cover dynamic `import()` calls with computed paths, or references from `.test.tsx` files that weren't separately checked).
**How to avoid:** Before deleting, run a broader multi-pattern check: grep for the exact export name AND the filename AND any barrel-file re-exports, AND run `tsc --noEmit` after the deletion (unused-file removal that breaks an import will fail type-check immediately, a cheap and definitive confirmation).
**Warning signs:** `tsc --noEmit` failing after a "dead code" deletion is the clearest signal the code was not actually dead.

## Code Examples

### Verifying the true shared-chunk floor (any route's diagnostic baseline)
```bash
# Source: verified directly against this repo's .next/diagnostics/route-bundle-stats.json
# Requires a fresh `npm run build` first (Turbopack regenerates this file).
node -e "
const stats = require('./.next/diagnostics/route-bundle-stats.json');
const root = stats.find(r => r.route === '/');
console.log('Shared floor:', root.firstLoadUncompressedJsBytes, 'bytes,', root.firstLoadChunkPaths.length, 'chunks');
"
```

### Confirming `three` absence from a fresh production build (pre-work sanity check)
```bash
# Source: this research's own verification method — re-run after ANY change
# touching habitat-3d-canvas.tsx or its dynamic-import gating to confirm the
# tree-shaking guarantee still holds.
npm run build
grep -rl "three" .next/static/chunks/*.js 2>/dev/null | wc -l   # expect: 0
```

### The `router.refresh()` invalidation pattern already in the codebase (D-17 baseline to extend)
```tsx
// Source: src/components/deck-view.tsx (existing, verified code, lines 60-75)
// This is the EXACT non-experimental pattern to generalize for D-17's
// due-count/habitat-state invalidation after study-session completion or
// card creation — no new invalidation mechanism needs to be invented.
useEffect(() => {
  if (hasDueCards) return;
  function recompute() {
    const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
    if (ms <= 0) {
      router.refresh(); // <-- re-runs the Server Component tree with fresh DB state
      return;
    }
    setCountdown(formatCountdown(ms));
  }
  recompute();
  const interval = setInterval(recompute, 60000);
  return () => clearInterval(interval);
}, [earliestCooldownEnd, hasDueCards, router]);
```

### Route-scoped measurement — the minimal-diff approach for D-09
```js
// Source: pattern derived from scripts/measure-cwv.mjs's existing structure
// (this repo's file, lines 319 + 493-514) — NOT a new file, an in-place edit
// sketch. The ROUTES constant (line 319) is the single point to filter:
const ROUTE_FILTER = process.env.ROUTE_FILTER
  ? process.env.ROUTE_FILTER.split(",")
  : null;
const ROUTES = (ROUTE_FILTER
  ? ["/dashboard", "/study", "/deck/new-card", "/deck/browse"].filter((r) =>
      ROUTE_FILTER.includes(r),
    )
  : ["/dashboard", "/study", "/deck/new-card", "/deck/browse"]);
// AND: OUT_DIR must also become conditional — see Pitfall 1. A minimal
// approach: default OUT_DIR to a NEW phase-17 measurements/ directory always,
// with the ORIGINAL Phase 16 baseline/ path reserved for a one-time,
// explicitly-flagged final "promote to comparison" step the human runs.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Live Three.js WebGL canvas rendering the habitat scene client-side | Pre-rendered ambient video clips (36 baked level×mood pairs) + CSS decay filter | Phase 13.1 (already shipped, v2.1) | −900 KB client JS, Perf 96 mobile on `/habitat` — this precedent is why `three` is already absent from production bundles; Phase 17 does not need to redo this work |
| `priority` as the only "load this image first" signal | `priority` AND `preload` both exist as independent, non-interchangeable props | Unclear exact version — verified as of installed `next@16.2.1`'s runtime source | An in-repo code comment (`habitat-3d-widget-image.tsx`) incorrectly calls `preload` a "replacement" for `priority` — do not propagate this into new Phase 17 image work |
| `@next/bundle-analyzer` (webpack plugin, stable) as the only bundle-visualization option | `npx next experimental-analyze` (Turbopack-native, integrated with the module graph) also exists | Introduced v16.1+, still explicitly labeled experimental with an open GitHub feedback thread | Either tool CAN show the same information `route-bundle-stats.json` already gives for this research's purposes; the experimental Turbopack analyzer offers a nicer UI (import-chain tracing) but its use should go through D-07 if truly needed — the diagnostics JSON already sufficed here |
| Fetch/data caching via `fetch({cache: 'force-cache'})`, `unstable_cache`, `revalidateTag` at Server Action call sites | `use cache` directive + `cacheLife`/`cacheTag`/`updateTag` under Cache Components | Introduced under `cacheComponents` flag in Next 16, still `version: experimental`/draft in the shipped docs at time of research | The "current" model requires an explicit opt-in flag NOT set in this project; the "Previous Model" remains fully supported and is what this phase should use without a checkpoint |

**Deprecated/outdated:** Nothing in this phase's scope is deprecated — all "old" approaches listed above remain fully supported (the Previous Model caching guide is explicitly maintained alongside Cache Components, not sunset).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-02's "dashboard habitat hero is poster-first" implies adding a NEW ambient video to the dashboard hero (mirroring `/habitat`'s pattern) rather than confirming the existing static-image approach already satisfies the requirement | Architecture Patterns, Pattern 2 | If wrong, the planner could scope unnecessary new-media-asset work (baking additional clip variants, wiring cross-fade) for a requirement that's already met by the passing LCP baseline — wasted effort this phase explicitly says to avoid gold-plating (D-12) |
| A2 | The measured "~7 min/route mobile-first" route-scoped run estimate from CONTEXT.md refers to 1 route × BOTH presets (mobile+desktop) × 6 runs each, not 1 route × mobile-only | Package Legitimacy Audit is N/A; timing estimate not independently re-derived, only cross-checked against the script's loop structure | If the estimate assumed mobile-only, actual route-scoped runs could take longer than planned wave time-budgets expect — low risk since D-09 already frames this as approximate ("~7 min") |
| A3 | `AppHeader` (imported by `DeckView`) has no client-only state of its own that would block extracting `DeckView`'s outer layout to RSC — this research read `deck-view.tsx` but did NOT open `app-header.tsx`'s full body to confirm | Architecture Patterns, Pattern 1 | If `AppHeader` itself requires client context (e.g. a dropdown menu with local state), the D-06 conversion plan for `DeckView` needs to account for `AppHeader` staying as its own client leaf rather than assuming the whole outer shell converts cleanly |

## Open Questions

1. **Does D-02's poster-first requirement apply to a dashboard hero that doesn't currently show ambient video at all?**
   - What we know: `/habitat`'s `habitat-video.tsx` implements poster-first video perfectly; the dashboard's `HabitatHero`/`HabitatMedallion` render a static SVG/image medallion with no video element found in any dashboard-reachable component.
   - What's unclear: Whether "Leo comes alive a beat later by design" (CONTEXT.md D-02 language) describes new work to ADD ambient motion to the dashboard, or describes the ALREADY-SHIPPED `/habitat` experience being referenced as color/context for why the general principle exists.
   - Recommendation: The planner should check the Daybreak design mocks (referenced in memory as `LeoCards/design/` designer-handoff docs) before committing to new media-asset work — this could change whether D-02 needs any implementation task at all versus just a verification/no-op task.

2. **Where exactly does the D-15 "content visibly rendered" signal get instrumented for PERF-04?**
   - What we know: D-15 explicitly excludes skeletons/`loading.tsx` from counting as "passing" content. `e2e/13-perf.spec.ts` has no existing concept of this signal — it measures LCP/CLS/INP, none of which directly answer "is the destination's real content visible yet."
   - What's unclear: The exact DOM marker or `performance.mark()` convention to use (e.g. a `data-testid` unique to each route's "real content loaded" state, vs. a generic Next.js RSC-stream-complete signal).
   - Recommendation: This is explicitly a discretion-area item per CONTEXT.md ("nav-timing instrumentation details... markers, content-visible signal") — the planner should design a consistent per-route marker convention (e.g. each of the 4 key routes already has SOME real-data element like `dueCount` text, card list items, or study-card front text that can serve as the "real content visible" probe) rather than inventing a framework-level signal.

3. **Should the route-filter flag for `measure-cwv.mjs` accept multiple routes at once, or exactly one?**
   - What we know: D-09 says "route filter" (singular framing) and "after each batch, re-measure only the affected route(s)" (plural "route(s)" — implying a batch could touch 2+ routes, e.g. if a shared-infrastructure change (D-08) affects all 4).
   - What's unclear: Whether the flag design should be `--route=/dashboard` (one at a time) or `--routes=/dashboard,/study` (comma-separated multi-select).
   - Recommendation: Support comma-separated multi-route filtering from the start (trivial to implement, per the Code Examples sketch above) since D-08 shared-infrastructure batches will likely need to re-measure all 4 routes together, not one at a time.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All `.mjs` scripts, `next build`/`next start` | ✓ | (project-standard, matches `@types/node ^20`) | — |
| Chrome/Chromium (Playwright bundled) | `measure-cwv.mjs` (puppeteer-core CHROME_PATH), e2e suite | ✓ | Playwright chromium-1208 (per script default path) | — |
| `.next/diagnostics/route-bundle-stats.json` | Bundle attribution (all D-06/D-08 work) | ✓ (confirmed present, 9347 bytes) | Regenerated by `next build` — no separate version | Requires a fresh `npm run build` before EVERY bundle-attribution check; stale files will not reflect in-progress changes |
| `DATABASE_URL` (Neon Postgres) | Full `measure-cwv.mjs` runs (provisioning), route-scoped runs equally | Not verified in this research session (env-dependent, not a static repo fact) | — | Route-scoped runs still require full provisioning per D-09's design — no lighter-weight fallback exists in the current script structure |
| `@next/bundle-analyzer` (webpack plugin, stable) | Optional deeper bundle visualization | ✗ (not in devDependencies) | — | `.next/diagnostics/route-bundle-stats.json` already sufficed for this research's attribution needs; install only if the planner determines the JSON file's per-route chunk-list isn't granular enough for a specific task |

**Missing dependencies with no fallback:** None identified — all core Phase 17 work is achievable with what's already installed.

**Missing dependencies with fallback:** `@next/bundle-analyzer` — the existing `route-bundle-stats.json` diagnostic is the working fallback and was sufficient for all attribution claims in this research.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 (unit) + Playwright ^1.58.2 (e2e) |
| Config file | `vitest` config implicit via package.json `test` script (no separate vitest.config found at root — uses defaults); `playwright.config.ts` (root) |
| Quick run command | `npm test` (vitest run, full unit suite — no watch/quick subset convention found) |
| Full suite command | `npm run test:e2e` (Playwright, requires dev server running per existing gotcha) + `npm run qa:run` (Phase 15 core-journey harness) + `node scripts/measure-cwv.mjs` (Lighthouse, requires `DATABASE_URL` + fresh build) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-03 | Each key route meets mobile CWV gates, before/after measured | measured-run (Lighthouse) | `DATABASE_URL=... node scripts/measure-cwv.mjs` (route-filtered per D-09, then full at phase end) | ✅ (script exists, needs route-filter edit) |
| PERF-03 | Client→RSC conversions don't break behavior | unit + e2e | `npm test` (existing component tests, e.g. `card-list.test.tsx`, `deck-view` has no dedicated test file found — Wave 0 gap) + `npm run test:e2e` | ⚠️ Partial — `deck-view.tsx` has no `.test.tsx` sibling found |
| PERF-03 | Study/SRS correctness unaffected by any client→RSC boundary move touching study paths | scripted QA journey | `npm run qa:run` | ✅ (Phase 15 harness) |
| PERF-04 | 6 hub-and-spoke navs render real content ≤100ms median n≥5, prefetch-warm, against LOCAL PROD BUILD | e2e (Playwright, extended) | `next build && next start && npx playwright test e2e/13-perf.spec.ts` (exact invocation TBD — needs D-14's prod-vs-dev separation mechanism designed) | ⚠️ File exists but only covers `/dashboard` + `/habitat`, 2 of 6 required pairs, no "content visible" signal yet — Wave 0 gap |
| task_d326ebac | INP assertions gated to prod-build-only runs | e2e (Playwright, existing file edit) | same invocation as PERF-04 above | ⚠️ Requires a prod-vs-dev detection mechanism not yet designed |
| Criterion 4 (ROADMAP) | Phase 15 core-journey harness still passes after all refactors | scripted QA journey | `npm run qa:run` (fresh dev server per D-10) | ✅ (Phase 15 harness) |
| D-11 | `/habitat` regression spot-check (n=3, mobile) | measured-run (Lighthouse, route-filtered) | `DATABASE_URL=... ROUTE_FILTER=/habitat node scripts/measure-cwv.mjs` — **NOTE:** `/habitat` is NOT in the current script's `ROUTES` constant (line 319, hardcoded to the 4 key routes only, `/habitat` explicitly excluded per its own D-03 comment) — the route-filter design must special-case allowing `/habitat` as an opt-in addition, not just a subset filter of the 4 | ⚠️ Needs script extension beyond a simple filter — `/habitat` must be addable, not just selectable |

### Sampling Rate
- **Per task commit:** `npm test` (fast unit suite covering any touched component's existing tests) + `npx tsc --noEmit` (catches dead-import breaks from any deletion, per Pitfall 6)
- **Per wave merge:** `npm run test:e2e` (full e2e, correctness gate per D-10) + route-scoped `measure-cwv.mjs` for affected route(s) per D-09
- **Phase gate:** Full 4-route × 2-preset `measure-cwv.mjs` run (final before/after vs Phase 16 baseline) + `npm run qa:run` (criterion-4 proof) + the extended `e2e/13-perf.spec.ts` PERF-04 gate + `/habitat` D-11 spot-check, all green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/deck-view.test.tsx` (or equivalent) — no existing test file found for `deck-view.tsx`; any D-06 split of this component needs a baseline test BEFORE the split to prove behavior-preservation, not just after
- [ ] `e2e/13-perf.spec.ts` extension for 4 additional route pairs (currently only `/dashboard`+`/habitat`; needs `/study`, `/deck/new-card`, `/deck/browse` added to reach the 6 D-13 hub-and-spoke pairs)
- [ ] A "content visibly rendered" timing signal/marker convention for D-15 — does not exist in any form today, needs design before it can be asserted against
- [ ] A prod-build-vs-dev-server detection/separation mechanism for D-14 (and the task_d326ebac INP gating) — `playwright.config.ts` currently has no signal distinguishing the two
- [ ] `measure-cwv.mjs` route-filter + output-directory-redirect (D-09) — script edit, not a new file, but must land before ANY route-scoped re-measurement can safely happen without risking the Pitfall 1 baseline-overwrite failure mode

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | Better Auth session cookies already gate all four key routes via `ProtectedLayout` — no auth logic touched by perf work |
| V3 Session Management | no (unchanged) | Same as above — this phase does not touch session handling |
| V4 Access Control | no (unchanged) | Route protection via `auth.api.getSession()` redirect-to-login pattern is untouched by client→RSC conversions (the RSC conversions happen BELOW the already-authenticated layout boundary) |
| V5 Input Validation | no new surface | No new user input paths introduced by bundle-reduction/RSC-conversion work |
| V6 Cryptography | no (unchanged) | Not touched by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client→RSC conversion accidentally leaking server-only data to the client bundle | Information Disclosure | When converting a component to a Server Component, verify it does NOT import anything from `src/lib/` that touches secrets/DB credentials in a way that would now be inlined into a client bundle if the conversion is done incorrectly (e.g., accidentally leaving `"use client"` off a component that then tries to import a server-only module, which Next.js's build step will catch as a build error — this is a build-time-caught class of mistake, not a silent runtime one, per how Next.js's module boundary enforcement works) |
| QA-mode data leaking into RSC payloads for non-QA-authed requests during a client→RSC conversion | Information Disclosure | `dashboard/page.tsx` already gates QA-only fields (`cooldownUntil`) behind `readQaAuth()` server-side (verified in the file read during this research) — any NEW Server Component introduced by a D-06 conversion must preserve this same server-side gating pattern, never pass QA fields unconditionally |

This phase's security surface is minimal — it is a performance/bundle-reduction refactor operating entirely within already-authenticated, already-validated code paths. The primary risk class is accidental data exposure during client/server boundary moves, which Next.js's build-time module-boundary checks substantially mitigate.

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/02-guides/prefetching.md` — automatic/manual/hover-triggered prefetch, client cache TTL table, static-vs-dynamic prefetch behavior (D-16)
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — `next/dynamic` patterns, `ssr: false`, custom loading components (D-03 shimmer host pattern)
- `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md` — bundle analyzer options (both flagged appropriately), `optimizePackageImports`, "heavy client workloads" RSC-conversion example pattern
- `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` — the STABLE "Previous Model" caching guide (fetch cache, `unstable_cache`, `revalidateTag`/`revalidatePath`, route segment config) — the actual applicable model since `cacheComponents` is off
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` + `09-revalidating.md` — the experimental Cache Components model, explicitly cross-checked and flagged as requiring D-07 checkpoint
- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md` — `unstable_instant`, confirmed `version: draft`, requires `cacheComponents: true`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/optimizePackageImports.md` — confirmed `version: experimental`, confirmed `lucide-react` already on the default-optimized list
- `node_modules/next/dist/shared/lib/get-img-props.js` (runtime source, lines 148/390/404) — direct verification that `priority` and `preload` are independent, mutually-exclusive-when-combined props, correcting an in-repo code comment
- Direct file reads: `package.json`, `next.config.ts`, `playwright.config.ts`, `biome.json`, `.next/diagnostics/route-bundle-stats.json`, all four Phase 16 baseline `.md` files, `e2e/13-perf.spec.ts`, `scripts/measure-cwv.mjs`, and the components `deck-view.tsx`, `habitat-hero.tsx`, `habitat-scene.tsx`, `habitat-video.tsx`, `habitat-widget.tsx`, `habitat-3d-widget-image.tsx`, `study-session.tsx`, `study-card.tsx`, `card-list.tsx`, `dashboard/page.tsx`, `(protected)/layout.tsx`
- Direct shell verification: `grep -rl "three" .next/static/chunks/*.js` (zero matches), `grep -n "HabitatWidget\b" src/` (single definition-only match)

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` — the "Three.js build-time only, never ships to client" claim, cross-verified against the direct chunk-grep evidence above (agreement between an internal doc and direct build-artifact inspection raises this to effectively HIGH, but the doc itself is project-internal, not third-party-verified)

### Tertiary (LOW confidence)
- The `.claude/skills/senior-frontend/` skill's `bundle_analyzer.py` and related scripts — inspected directly and found to be generic scaffolding boilerplate (empty `analyze()` method, no LeoCards-specific logic, no evidence of prior invocation in this repo). NOT recommended for use in this phase; flagged here only so the planner does not mistake this skill's presence for a vetted, calibrated tool.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version number is read directly from the installed `package.json`, not inferred or looked up externally
- Architecture (client→RSC candidates, shared-chunk identification): HIGH — every claim about a specific component's client/server status and every chunk filename is drawn from direct file reads and the actual built diagnostic JSON, not inference
- Pitfalls: HIGH — five of six pitfalls are grounded in direct evidence found this session (baseline directory collision, three.js false premise, experimental-flag over-adoption risk, INP/TBT conflation, dead-code deletion risk); Pitfall 5 (D-14 server confusion) is HIGH-confidence risk identification but MEDIUM-confidence on the exact mitigation mechanism since that design doesn't exist yet
- Security domain: MEDIUM — no new security surface identified, but this assessment relies on the reasoning that RSC conversions happen strictly below an already-verified auth boundary rather than a dedicated security-tool scan

**Research date:** 2026-07-02
**Valid until:** 14 days (Next.js 16 App Router internals, especially the experimental Cache Components surface, are actively evolving per the docs' own `version: experimental`/`draft` tags — re-verify before Phase 18 if this research is referenced again)
