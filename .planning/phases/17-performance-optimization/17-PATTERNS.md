# Phase 17: Performance optimization - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 22 (new + modified)
**Analogs found:** 20 / 22 (1 genuine no-analog gap: shimmer component; 1 partial: content-visible marker convention)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `src/components/deck-view.tsx` (split) | component (client leaf extraction) | request-response | `src/components/habitat-scene.tsx` + `src/app/(protected)/habitat/page.tsx` (RSC shell / client-leaf split precedent) | role-match |
| `src/components/habitat-hero.tsx` (→ RSC) | component | request-response | `src/components/daybreak/bw-medallion.tsx` (pure, hooks-free presentational component) | role-match |
| `src/app/(protected)/dashboard/page.tsx` (extend) | route (RSC page) | request-response | itself (already async RSC) + `src/app/(protected)/habitat/page.tsx` (session→state→render shell) | exact |
| `src/app/(protected)/study/page.tsx` (audit) | route (RSC page) | request-response | `src/app/(protected)/dashboard/page.tsx` (auth+redirect+data-assembly shell) | exact |
| `src/app/(protected)/deck/new-card/page.tsx` (audit) | route (RSC page) | request-response | `src/app/(protected)/deck/browse/page.tsx` (same shell shape) | exact |
| `src/app/(protected)/deck/browse/page.tsx` (audit) | route (RSC page) | request-response | `src/app/(protected)/deck/new-card/page.tsx` | exact |
| `src/app/layout.tsx` (audit, D-08) | config/root-layout | request-response | itself — no separate providers/fonts file exists; this IS the shared-chunk root | exact (self) |
| `src/lib/auth-client.ts` (audit, D-08) | utility (client singleton) | request-response | itself — single small `createAuthClient` factory, only client-side auth touchpoint | exact (self) |
| `src/components/study-session.tsx` (D-05 CSS-swap eval) | component (Motion consumer) | event-driven | `src/components/habitat-celebration.tsx` (already CSS-only, `hab-fall` keyframe) | role-match |
| `src/components/card-list.tsx` (D-05 CSS-swap eval) | component (Motion consumer) | event-driven | `src/components/habitat-celebration.tsx` (CSS-only) + itself's own `AnimatePresence` accordion (lines 292-303) as the exact pattern to replace | role-match |
| `src/components/study-card.tsx` (D-05 — KEEP Motion) | component (drag physics) | event-driven | N/A — load-bearing per D-05/RESEARCH; no conversion, just confirm-and-skip | exact (no change needed) |
| `src/components/level-up-overlay.tsx` (D-05 — KEEP Motion) | component (confetti) | event-driven | N/A — explicitly load-bearing per D-05; confirm-and-skip | exact (no change needed) |
| `src/components/daybreak/ac-progress.tsx` (D-05 CSS-swap eval) | component (Motion consumer) | event-driven | `src/app/globals.css` `@keyframes hab-fall` (CSS-keyframe convention to mirror for the indeterminate bar) | role-match |
| `src/components/welcome/habitat-teaser.tsx` (D-05 CSS-swap eval) | component (Motion consumer) | event-driven | `src/app/globals.css` `@keyframes hab-fall` (CSS opacity-pulse is a simpler case than confetti) | role-match |
| NEW: `src/components/daybreak/shimmer.tsx` (D-03) | component (Daybreak atom) | request-response | `src/components/daybreak/pill.tsx` (simplest atom: props+className convention) + `src/components/daybreak/bw-medallion.tsx` (size-prop + palette-const convention) | role-match (no true shimmer analog exists) |
| `scripts/measure-cwv.mjs` (D-09 route filter + OUT_DIR) | utility (Node-ESM script) | batch | itself — in-place edit, `ROUTES` const (line 319) + `OUT_DIR` const (line 572-578) are the exact edit points | exact (self) |
| `scripts/measure-cwv-lib.mjs` (if route-filter logic extracted to lib) | utility (pure lib) | transform | itself — already the pure-function half of the harness, vitest-covered | exact (self) |
| `e2e/13-perf.spec.ts` (D-13..17 + task_d326ebac extend) | test (Playwright e2e) | request-response | itself — `measureVitals()` (lines 36-178) is the exact pattern to extend for nav-timing + content-visible signal | exact (self) |
| `package.json` (D-05 three hygiene) | config | batch | itself — move 2 lines (`three`, `@types/three`) from `dependencies` to `devDependencies` | exact (self) |
| `next.config.ts` (D-07 stable options only) | config | batch | itself — currently empty `NextConfig` object, zero existing precedent to mirror; must consult `node_modules/next/dist/docs` per D-07, not repo precedent | N/A (empty file — docs-driven, not analog-driven) |
| `src/components/habitat-widget.tsx` (DELETE candidate) | component (dead code) | N/A | N/A — deletion target, zero call sites confirmed | N/A |
| `src/components/habitat-3d-widget-image.tsx` (DELETE candidate) | component (dead code) | N/A | N/A — deletion target, zero call sites confirmed, only reachable via habitat-widget.tsx | N/A |

## Pattern Assignments

### `src/components/deck-view.tsx` (component, request-response — D-06 client→RSC split)

**Analog:** `src/app/(protected)/habitat/page.tsx` + `src/components/habitat-scene.tsx` (the repo's only existing "RSC shell fetches data, hands to a client component that owns only the interactive slice" split), plus `src/components/deck-view.test.tsx` (existing unit-test scaffold for this exact file — already covers `AppHeader`/`HabitatHero`/`CardList` as mocked children).

**Current all-client wrapper** (`src/components/deck-view.tsx` lines 1-13, 284-330):
```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { CardList } from "@/components/card-list";
import { LionFace } from "@/components/daybreak/lion-face";
import type { DeckOption } from "@/components/deck-switcher";
import { HabitatHero } from "@/components/habitat-hero";
import type { HabitatState } from "@/lib/habitat-engine";
// ...
export function DeckView({ decks, initialCards, /* ... */ }: DeckViewProps) {
  const router = useRouter();
  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? decks[0];

  function handleDeckChange(id: string) {
    router.push(`/dashboard?deck=${id}`);
  }
  // ... derives nativeLangLabel, targetLangLabel, hasCards, allPaused, sleeping ...

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader decks={decks} activeDeckId={activeDeckId} onDeckChange={handleDeckChange} nativeLang={nativeLang} />
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <HabitatHero habitatState={habitatState} celebratingLevel={celebratingLevel} sleeping={sleeping} />
        </div>
        {/* action line + StatusText/CountdownTimer + CardList — all static except CountdownTimer */}
      </main>
    </div>
  );
}
```

**The ONLY genuinely client-reactive pieces in the file** (verified — nothing else uses hooks or event handlers):
- `CountdownTimer` (lines 47-114): `useState`/`useEffect`/`useRouter().refresh()` on a 60s tick — MUST stay `"use client"`.
- `handleDeckChange` (lines 299-301): `router.push` on deck-switch — the `<AppHeader onDeckChange>` wiring needs a client boundary somewhere (either `AppHeader` itself, or a thin client wrapper around just the deck-switcher control).

**Split target (mirrors the habitat page/scene split):** `dashboard/page.tsx` (already an RSC — see below) renders the static layout (`<main>` wrapper, action-button block, `StatusText`'s non-countdown branches, `HabitatHero` once converted) directly as server markup, importing only `CountdownTimer`/`StatusText` and the `AppHeader`-wrapping client leaf. `PlusGlyph` (pure, no hooks) can move to RSC alongside the layout.

**Existing test scaffold to extend, not replace** (`src/components/deck-view.test.tsx` lines 1-50):
```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ... }) => <a href={href} ...>{children}</a> }));
vi.mock("@/components/habitat-hero", () => ({
  HabitatHero: ({ sleeping }) => <div data-testid="habitat-hero" data-sleeping={sleeping ? "true" : "false"} />,
}));
vi.mock("@/components/card-list", () => ({ CardList: () => <div data-testid="card-list" /> }));
```
Use this exact mock-children convention for the pre-split baseline test (Wave 0 gap the RESEARCH flagged — the test file already exists, so the gap is "assert current behavior BEFORE splitting", not "create the file").

**Error-handling / auth pattern to preserve unchanged:** none of the QA-gating logic lives in `deck-view.tsx` itself — `qaMode`/`cooldownUntil` gating happens server-side in `dashboard/page.tsx` (see below). The split must NOT move that gating into the new RSC shell incorrectly; it already lives in the right place.

---

### `src/components/habitat-hero.tsx` (component, request-response — D-06 outright RSC conversion)

**Analog:** `src/components/daybreak/bw-medallion.tsx` (a pure, hooks-free presentational component already RSC-safe — the target shape).

**Current file** (`src/components/habitat-hero.tsx` line 1, full file 144 lines): `"use client"` directive with ZERO hooks, ZERO event handlers, ZERO `useState`/`useEffect` anywhere in the file — only a `<Link>` wrapper, a `ChevronRight` inline-SVG helper, and conditional text via `subtitleContent`. This is the textbook "unnecessary use client" case.

**Conversion:** delete line 1 (`"use client";`). No other line changes required — every remaining line (props destructure, `ChevronRight`, `<Link href={...}>`, `<HabitatMedallion>`, conditional `subtitleContent`) is already Server-Component-compatible. Verify `HabitatMedallion` (its one child import) is itself also hooks-free before finalizing (already confirmed pure per `bw-medallion.tsx`'s sibling comment "Pure (no hooks) — RSC-safe").

**Target shape to match** (`src/components/daybreak/bw-medallion.tsx` lines 447-471 — a props-driven, hooks-free component):
```tsx
export function BWMedallion({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 16, background: "#FFF1DC", ... }} aria-hidden="true">
      <TopicIcon name={name} />
    </div>
  );
}
```

---

### `src/app/(protected)/{dashboard,study,deck/new-card,deck/browse}/page.tsx` (route, request-response)

**Analog:** each other — all four already share one shape; `dashboard/page.tsx` is the richest exemplar.

**Auth + redirect pattern** (`src/app/(protected)/dashboard/page.tsx` lines 25-32, identical shape in all four routes):
```tsx
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // ... Promise.all data fetches ...
  if (decks.length === 0) redirect("/welcome"); // or redirect("/dashboard") in new-card/browse
```

**QA-gating pattern to preserve in any RSC split** (`src/app/(protected)/dashboard/page.tsx` lines 40-41, 107-112):
```tsx
const habitatOverride = await readHabitatOverride();
const qaMode = await readQaAuth();
// ...
cooldownUntil: qaMode
  ? (studyCards.find((s) => s.id === c.id)?.cooldownUntil ?? null)
  : null,
```
Any new Server Component introduced by a D-06 conversion (e.g. the `deck-view.tsx` split) must keep this exact server-side gate — never thread `cooldownUntil` unconditionally into a client prop.

**`?topic=`/`?deck=` param-validation pattern already fixed once (WR-01), mirror for any new params** (`src/app/(protected)/deck/browse/page.tsx` lines 32-37):
```tsx
// Validate ?topic= against known categories — an unrecognized/stale topic falls
// back to the tiles landing instead of rendering a nonsense empty state (WR-01).
const requestedTopic =
  params.topic && (CATEGORIES as readonly string[]).includes(params.topic)
    ? params.topic
    : undefined;
```

**Study route redirect gotcha already known to the harness** (`src/app/(protected)/study/page.tsx` lines 20-22): `/study` unconditionally redirects to `/dashboard` when `?deck=` is absent — the ONLY one of the four routes without a graceful default-to-first-deck fallback. Any D-06 conversion or PERF-04 prefetch-link wiring targeting `/study` must always include `?deck={id}`.

---

### `src/components/study-session.tsx` / `src/components/card-list.tsx` (component, event-driven — D-05 Motion→CSS eval)

**Analog:** `src/components/habitat-celebration.tsx` (already fully CSS-only, no `motion/react` import) + `src/app/globals.css`'s `hab-fall` keyframe.

**Motion usage to evaluate for CSS-swap** (`src/components/study-session.tsx` lines 351-356 — simple mount fade):
```tsx
<motion.div
  className="flex flex-col items-center gap-6 sm:gap-8 px-4 sm:px-8 text-center"
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>
```
This is a one-shot mount transition — a strong D-05 CSS-swap candidate (`@keyframes fade-up { from { opacity:0; transform:translateY(16px);} to {opacity:1; transform:translateY(0);} }` + `animation: fade-up 0.4s ease-out;`).

**Motion usage to evaluate for CSS-swap** (`src/components/card-list.tsx` lines 292-303 — accordion height/opacity):
```tsx
<AnimatePresence initial={false}>
  {open && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: "easeInOut" }}
      style={{ overflow: "hidden" }} // CRITICAL: Pitfall 1 — overflow hidden required on motion.div
    >
```
Note the `AnimatePresence` here handles both mount AND unmount (exit) — a pure CSS-only swap needs either a `grid-template-rows: 0fr → 1fr` trick (no JS-driven unmount delay needed) or keeping a lightweight manual class-toggle with `transitionend` cleanup. This is more involved than the simple fade case above; budget accordingly, and preserve the `reduced ? 0 : 0.22` reduced-motion branching in whatever CSS approach replaces it.

**The already-proven CSS-only reference pattern** (`src/components/habitat-celebration.tsx` lines 70-84, keyframe at `src/app/globals.css` lines 111-127):
```tsx
// habitat-celebration.tsx — confetti via CSS class only, no motion import at all
<div
  className="hab-confetti"
  style={{
    position: "absolute",
    animation: `hab-fall 2.5s ease-in ${((i % 9) * 0.22).toFixed(2)}s forwards`,
    transform: `rotate(${(i * 47) % 360}deg)`,
  }}
/>
```
```css
/* src/app/globals.css lines 110-127 */
@keyframes hab-fall {
  from { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hab-confetti { animation: none; }
}
```
Any new CSS-swap keyframe added for `study-session.tsx`/`card-list.tsx`/`ac-progress.tsx`/`habitat-teaser.tsx` should follow this exact convention: named `@keyframes` in `globals.css`, a `prefers-reduced-motion: reduce` override block alongside it, class applied via `className`, per-instance timing/delay still passed via inline `style.animation`.

---

### `src/components/study-card.tsx` / `src/components/level-up-overlay.tsx` (component, event-driven — D-05 KEEP Motion, no conversion)

**Confirmed load-bearing, do not touch:**
- `src/components/study-card.tsx` line 3: `import { motion, useMotionValue, useTransform } from "motion/react";` — lines 38-45 build real drag-physics (`useMotionValue(0)`, `useTransform(x, [-200,0,200], [-12,0,12])` for rotate, and colour interpolation for left/right swipe backgrounds). This is genuine physics-driven interaction, not swappable to CSS per D-05's "keep the library for load-bearing moments" carve-out.
- `src/components/level-up-overlay.tsx` line 3: confetti via `motion.div` with per-particle `initial`/`animate`/`transition` (lines 53-76) — explicitly named as the load-bearing exception in D-05's own text ("keep the library for load-bearing moments (e.g. level-up confetti)"). No conversion task should target this file.

---

### `src/components/daybreak/ac-progress.tsx` / `src/components/welcome/habitat-teaser.tsx` (component, event-driven — D-05 CSS-swap eval)

**Analog:** same `hab-fall`-style keyframe convention above.

**`ac-progress.tsx` indeterminate bar** (lines 125-136):
```tsx
<motion.div
  animate={{ x: ["-100%", "100%"] }}
  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
  style={{ position: "absolute", top: 0, bottom: 0, width: "42%", borderRadius: 7, background: "#F28A1F" }}
/>
```
A repeating translateX loop — classic CSS `@keyframes` candidate (`translateX(-100%) → translateX(100%)`, `animation: slide 1.2s ease-in-out infinite;`).

**`habitat-teaser.tsx` ambient glow pulse** (lines 126-137):
```tsx
<motion.div
  className="absolute inset-0 pointer-events-none"
  style={{ background: "radial-gradient(...)", opacity: 0 }}
  animate={{ opacity: [0, 1, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  aria-hidden="true"
/>
```
An opacity keyframe loop (`0 → 1 → 0`) — directly mirrors `hab-fall`'s opacity-fade shape; the `reduced` early-return (line 113, 125 gate) already exists and must carry over unchanged to whatever CSS replaces it.

---

### NEW: `src/components/daybreak/shimmer.tsx` (component, request-response — D-03 placeholder)

**No true shimmer/skeleton analog exists in this codebase** — confirmed via repo-wide search: zero `Skeleton`/`shimmer` component hits, zero `loading.tsx` files anywhere under `src/app/`. This is a genuinely new pattern; base its API shape on the two closest Daybreak atom conventions found:

**Simplest atom convention to mirror for props/className merge** (`src/components/daybreak/pill.tsx`, full file):
```tsx
import * as React from "react";

interface PillProps {
  children: React.ReactNode;
  className?: string;
}

export function Pill({ children, className }: PillProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[12px] font-semibold",
        "bg-[var(--db-pill-bg)] text-[var(--db-pill-text)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
```

**Size-prop + palette-const convention to mirror for a block-shaped placeholder** (`src/components/daybreak/bw-medallion.tsx` lines 447-471):
```tsx
export function BWMedallion({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 16, background: "#FFF1DC", ... }} aria-hidden="true">
      <TopicIcon name={name} />
    </div>
  );
}
```

**Recommended shape (per D-03's lock — ONE reusable cream/amber rounded-block style, space always reserved):** a `<DaybreakShimmer width height radius className? />` component using the same cream/amber palette already established (`#FFF1DC`/`#F0E3CF`/`#FFE7BC` appear repeatedly across `bw-medallion.tsx`, `ac-progress.tsx`'s sunrise disc, `habitat-teaser.tsx`'s hill colours) plus a NEW CSS `@keyframes shimmer-pulse` (opacity or background-position pulse) added to `globals.css` following the exact `hab-fall` convention (named keyframe + `prefers-reduced-motion` override block). Wire via `next/dynamic`'s `loading` option per the pattern below.

**`next/dynamic` host pattern — the ONLY two existing usages in the app** (`src/components/habitat-scene.tsx` lines 74-77):
```tsx
const HabitatCanvasCapture =
  process.env.NODE_ENV !== "production"
    ? dynamic(() => import("@/components/habitat-3d-canvas"), { ssr: false })
    : null;
```
Note this existing usage does NOT use the `loading:` option (it's a dev-only capture mount, not a real lazy-load-with-fallback case) — D-03's shimmer work will be the FIRST real `loading:` usage in the repo. Candidate real-work sites: `CardEditDialog` (imported eagerly today by `card-list.tsx` line 8 — only needed on edit-click) and `image-upload-flow.tsx` (imported by `new-card-mode-toggle.tsx` — only needed on the upload-mode path).

---

### `scripts/measure-cwv.mjs` (utility, batch — D-09 route filter + OUT_DIR redirect)

**Analog:** itself — in-place edit, not a new file. Two exact edit points identified.

**Hardcoded routes to filter** (line 319):
```js
// Exactly these 4 routes — /habitat is EXCLUDED (D-03).
const ROUTES = ["/dashboard", "/study", "/deck/new-card", "/deck/browse"];
```
Per D-11, `/habitat` must become an ADDABLE opt-in (for the regression spot-check), not just a subset-filter of the 4 — a plain `--route=` allowlist-intersection won't cover `/habitat`. Design the filter to union rather than strictly subset when `/habitat` is explicitly requested.

**Hardcoded output directory pointing at the IMMUTABLE Phase 16 baseline** (lines 572-578):
```js
const OUT_DIR = path.join(
  ROOT,
  ".planning",
  "phases",
  "16-performance-baseline-measure",
  "baseline",
);
```
**CRITICAL:** this must become parameterized to default to a NEW Phase-17-owned directory for every non-final run (e.g. `.planning/phases/17-performance-optimization/measurements/`) — never silently defaulting back to the Phase 16 path. `git status` showing any diff under `16-performance-baseline-measure/baseline/` during Phase 17 is an immediate signal of a broken edit.

**Existing atomic-write helper to reuse unchanged** (lines 598-599 onward): `writeJsonAtomic`/`writeTextAtomic` already exist and write via `.tmp` + rename — reuse as-is for any new Phase-17-directory output, do not reinvent.

**Study-route query-string gotcha already documented in this exact file** (lines 327-338): the script's own comment block documents the `/study` unconditional-redirect bug it already fixed (`?deck={deckId}` required) — this is the SAME gotcha the route-page analog above flags; the harness and the page comment agree, reinforcing it.

**Vitest coverage convention for any extracted route-filter logic** (`scripts/__tests__/measure-cwv-lib.test.ts` lines 1-31):
```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyBottleneck, computeMedians, extractMetrics, getBundleKb, median } from "../measure-cwv-lib.mjs";

const fixturePath = fileURLToPath(new URL("./fixtures/route-bundle-stats.fixture.json", import.meta.url));
const stats = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("median", () => {
  it("returns the true middle-of-sorted value for an odd-length array", () => {
    expect(median([300, 100, 200, 400, 500])).toBe(300);
  });
  // ...
});
```
If the D-09 route-filter/OUT_DIR logic is extracted into `measure-cwv-lib.mjs` for testability (recommended — it's currently inline in the non-lib script), add sibling `describe` blocks to this same test file using the same fixture-read convention; do not create a parallel test file.

---

### `e2e/13-perf.spec.ts` (test, request-response — D-13..17 instant-nav gate + task_d326ebac INP fix)

**Analog:** itself — `measureVitals()` is the exact function to extend/adapt.

**Existing PerformanceObserver capture pattern to extend for a NEW "content visible" signal** (lines 76-125):
```ts
const vitals = await page.evaluate(async () => {
  return await new Promise<{ lcp: number; cls: number; inp: number }>((resolve) => {
    let lcp = 0, cls = 0, inp = 0;
    try {
      const lcpObs = new PerformanceObserver((entries) => {
        for (const e of entries.getEntries()) {
          const t = (e.renderTime || e.loadTime || e.startTime) as number;
          if (t > lcp) lcp = t;
        }
      });
      lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    // ... cls, inp similarly ...
    setTimeout(() => resolve({ lcp, cls, inp }), 1500);
  });
});
```
D-15's "content visibly rendered ≤100ms" signal has NO existing equivalent here — this file measures LCP/CLS/INP only. The pattern to follow for the NEW signal: use `page.evaluate` + a per-route `data-testid` probe (each of the 4 key routes already renders some real-data element usable as the marker — e.g. dashboard's `dueCount`/`0 due` text already carries `data-testid` conventions elsewhere in the codebase, `deck-view.tsx` line 411 `data-testid="add-a-card"`, `habitat-hero.tsx` line 121 `data-testid="habitat-hero-subtitle"`) combined with `performance.now()` deltas from a `page.click()` nav-trigger timestamp, mirroring this file's existing `page.evaluate(async () => {...})` + `Promise` + timed-resolve idiom (see the widget-TTI block at lines 137-175 for the closest existing "poll until a DOM marker appears" pattern):
```ts
// lines 142-151 — the existing poll-for-marker idiom to reuse for content-visible:
const deadline = t0 + 8000;
while (performance.now() < deadline) {
  const cv = document.querySelector('canvas[data-ready="true"]') as HTMLCanvasElement | null;
  if (cv) { ttiMs = performance.now() - t0; break; }
  await new Promise((r) => setTimeout(r, 16));
}
```

**Existing per-profile viewport/throttle setup to reuse for the 6 new nav pairs** (lines 185-224):
```ts
for (const profile of ["desktop", "mobile"] as const) {
  const viewport = profile === "desktop" ? { width: 1366, height: 768 } : { width: 412, height: 869 };
  const deviceScaleFactor = profile === "desktop" ? 1 : 2.625;
  // ... userAgent, isMobile ...
  test(`${profile} — /dashboard + /habitat`, async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await browser.newContext({ viewport, deviceScaleFactor, userAgent, isMobile, hasTouch: isMobile });
    const page = await ctx.newPage();
    await signUpWithDeck(page, "French");
    const cdp = await ctx.newCDPSession(page);
    if (isMobile) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6*1024*1024)/8, uploadThroughput: (750*1024)/8 });
    }
    // ...
  });
}
```
D-14's prod-build gate does NOT want CPU/network throttling applied the same way (it's testing "instant" against a local prod server, not simulating Slow-4G) — reuse the context-setup SHAPE (`browser.newContext`, `signUpWithDeck` helper import from `./helpers`) but the throttling block should likely be skipped or configured differently for the nav-timing pass; this is a discretion-area design call flagged in RESEARCH.

**Existing soft-assertion gate style to mirror for the new PASS/FAIL bar** (lines 256-270):
```ts
test("CWV thresholds", () => {
  for (const r of results) {
    expect.soft(r.lcp, `${r.route} ${r.profile} LCP`).toBeLessThanOrEqual(2500);
    expect.soft(r.cls, `${r.route} ${r.profile} CLS`).toBeLessThanOrEqual(0.1);
    expect.soft(r.inp, `${r.route} ${r.profile} INP`).toBeLessThanOrEqual(200);
  }
});
```
Use `expect.soft(...)` (not a throwing `expect`) so one failing pair doesn't hide failures in the other 5 — same convention, new metric (`contentVisibleMs`) and new threshold (`toBeLessThanOrEqual(100)` per D-15).

**task_d326ebac (INP prod-build-only gating):** the existing `inp` assertion at line 267 currently has no prod-vs-dev guard at all. Per Pitfall 5 (`playwright.config.ts` `baseURL: "http://localhost:3000"`, `webServer: undefined` — same port for both `next dev` and `next start`), the fix needs an explicit signal (env var check, e.g. `process.env.PERF_PROD_BUILD === "1"`) wrapping the INP assertion so it only runs against a confirmed prod build — mirror the existing `if (isMobile) { ... }` conditional-block style already used at line 215 for the throttling gate.

---

### `package.json` (config, batch — D-05 three hygiene)

**Analog:** itself. Confirmed via direct read (lines 36, 52 in `dependencies`; `devDependencies` block at lines 57-73 already holds `@types/node`, `playwright`, `vitest`, etc. — the correct target section):
```json
"dependencies": {
  ...
  "@types/three": "^0.160.0",
  ...
  "three": "^0.160.1",
  ...
},
"devDependencies": {
  "@biomejs/biome": "^2.4.8",
  ...
}
```
Move both `"three": "^0.160.1"` and `"@types/three": "^0.160.0"` lines from `dependencies` into `devDependencies` (alphabetical position: `three` after `tailwindcss`, `@types/three`-equivalent — devDependencies here isn't strictly alphabetized already, e.g. `ffmpeg-static` before `jsdom` before `lighthouse`, so exact placement is low-stakes). No other lines change. Confirm post-edit via `npm run build && grep -rl "three" .next/static/chunks/*.js` returning zero matches (unchanged behavior expected — this is 0 KB delta by design per RESEARCH Pitfall 2, not a bug).

---

### `next.config.ts` (config, batch — D-07 stable-only)

**No repo analog exists** — current file is a bare `NextConfig` object with zero keys:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
};
export default nextConfig;
```
Any addition here (e.g. `serverExternalPackages`, confirming `lucide-react` is already covered by the default `optimizePackageImports` list without needing explicit config) must be verified against `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/` directly, not inferred from repo precedent — there is none. Anything with `version: experimental` frontmatter in those docs (`cacheComponents`, `experimental.instantNavigationDevToolsToggle`, etc.) requires the D-07 checkpoint before landing here.

---

### `src/components/habitat-widget.tsx` / `src/components/habitat-3d-widget-image.tsx` (DELETE candidates)

**Zero call sites confirmed** via `Grep("HabitatWidget|habitat-3d-widget-image|habitat-widget", path: "src")` — only the two files' own definitions matched, plus one unrelated comment-only cross-reference in `src/components/habitat-medallion.tsx` line 19 (`// Progress ratio — mirrors habitat-widget.tsx lines 27-41`, a code comment, not an import). Per RESEARCH Pitfall 6, before deleting: re-run the grep with the exact export names AND filenames AND check for barrel re-exports, then run `npx tsc --noEmit` immediately after deletion as the definitive confirmation (a broken import from a "dead" file surfaces immediately as a type error).

## Shared Patterns

### Auth session gate (unchanged across all RSC work)
**Source:** `src/app/(protected)/layout.tsx` (full file, 19 lines) + repeated per-page in all four route files
```tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login"); // layout.tsx
// or, per-page safety-net duplicate:
if (!session) return null;
```
**Apply to:** every route page and any new Server Component this phase introduces — D-06 conversions happen strictly BELOW this already-verified boundary; never reproduce session-check logic differently.

### QA-mode server-side gating (must survive every D-06 split)
**Source:** `src/app/(protected)/dashboard/page.tsx` lines 40-41, 107-112; `src/lib/debug-cheat.ts` (`readQaAuth`/`readHabitatOverride`)
```tsx
const qaMode = await readQaAuth();
// ...
cooldownUntil: qaMode ? (studyCards.find(...)?.cooldownUntil ?? null) : null,
```
**Apply to:** any new Server Component boundary created by splitting `deck-view.tsx` or converting other client wrappers — QA-only fields must remain gated server-side, never passed unconditionally to a client prop.

### `router.refresh()` targeted invalidation (D-17's non-experimental mechanism)
**Source:** `src/components/deck-view.tsx` lines 60-75 (the ONLY existing usage in the codebase)
```tsx
useEffect(() => {
  if (hasDueCards) return;
  function recompute() {
    const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
    if (ms <= 0) {
      router.refresh(); // re-runs the Server Component tree with fresh DB state
      return;
    }
    setCountdown(formatCountdown(ms));
  }
  recompute();
  const interval = setInterval(recompute, 60000);
  return () => clearInterval(interval);
}, [earliestCooldownEnd, hasDueCards, router]);
```
**Apply to:** D-17's mutation-triggered invalidation (study-session completion → dashboard due-count refresh; card creation → dashboard/browse refresh) — generalize this exact `router.refresh()` call site rather than introducing `cacheComponents`/`revalidateTag` (which require a D-07 checkpoint).

### CSS-only keyframe animation convention (D-05 swap target shape)
**Source:** `src/components/habitat-celebration.tsx` (full pattern) + `src/app/globals.css` lines 110-127
```css
@keyframes hab-fall {
  from { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hab-confetti { animation: none; }
}
```
```tsx
<div className="hab-confetti" style={{ animation: `hab-fall 2.5s ease-in ${delay}s forwards` }} />
```
**Apply to:** every D-05 Motion→CSS swap in `study-session.tsx`, `card-list.tsx`, `ac-progress.tsx`, `habitat-teaser.tsx`, and the new shimmer's pulse animation — named keyframe in `globals.css`, paired `prefers-reduced-motion` override, per-instance timing via inline `style`.

### Node-ESM script convention + node --check validation
**Source:** `scripts/measure-cwv.mjs` (whole-file convention) + `scripts/__tests__/measure-cwv-lib.test.ts`
- Pure logic lives in `*-lib.mjs` (testable, no side effects); the orchestrating script imports from it.
- Atomic file writes via `.tmp` + rename (`writeJsonAtomic`/`writeTextAtomic`).
- JSDoc `@param`/`@returns` on every exported function (no TypeScript in `.mjs`, JSDoc is the type-documentation substitute).
**Apply to:** any D-09 route-filter/OUT_DIR logic extraction into `measure-cwv-lib.mjs`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/daybreak/shimmer.tsx` (NEW) | component | request-response | No shimmer/skeleton component or `loading.tsx` exists anywhere in the repo (confirmed via repo-wide grep) — this phase introduces the pattern from scratch. Base API shape on `pill.tsx` (props/className convention) + `bw-medallion.tsx` (size-prop/palette convention); base the pulse animation on the `hab-fall` CSS-keyframe convention (shared pattern above). |
| D-15 "content visibly rendered" marker/signal for `e2e/13-perf.spec.ts` | test instrumentation | request-response | No existing "is real content visible yet" concept in the current spec (it only measures LCP/CLS/INP). Closest reusable idiom is the widget cold-load-TTI poll-loop (lines 142-151 of the same file) adapted to poll a per-route `data-testid` marker instead of a canvas `data-ready` attribute. |
| D-14 prod-build-vs-dev-server detection mechanism | test infrastructure | request-response | `playwright.config.ts` has zero existing signal distinguishing `next dev` from `next start` (both default to port 3000, `webServer: undefined`). This is a genuinely new mechanism to design (env var gate is the lowest-risk option, per Pitfall 5) — no repo precedent to copy. |

## Metadata

**Analog search scope:** `src/app/(protected)/**`, `src/app/layout.tsx`, `src/components/**` (all `.tsx`), `src/lib/auth*.ts`, `scripts/measure-cwv*.mjs`, `scripts/__tests__/**`, `e2e/13-perf.spec.ts`, `package.json`, `next.config.ts`, `playwright.config.ts`, `src/app/globals.css`
**Files scanned:** 27 direct reads (full or targeted-range) + 9 grep/glob sweeps for call-site confirmation (dead-code candidates, shimmer/skeleton absence, Motion import sites)
**Pattern extraction date:** 2026-07-02
