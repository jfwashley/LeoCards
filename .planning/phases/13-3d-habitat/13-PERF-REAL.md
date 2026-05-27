# Phase 13 — Real-device CWV (non-instrumented Lighthouse)

**Date:** 2026-05-27
**Tool:** Lighthouse CLI 13.3.0 (real Chrome, headless, no in-page instrumentation)
**Target:** Vercel preview `https://leocards-htrrnhex1-jfwashley-3181s-projects.vercel.app` (deployment `dpl_8ezwV1hGRnpRuGBrLi5ebESDhK2A`, commit `97ca9d8`)
**Auth:** Throwaway test user (`cwv-test-1779866703@leocards-test.local`) created via `POST /api/auth/sign-up/email`; session cookie `__Secure-better-auth.session_token`
**Vercel SSO bypass:** `x-vercel-protection-bypass` header (Protection Bypass for Automation)
**Runs per route×profile:** 3 (mobile) / 3 (desktop); median reported
**Profiles:**
- mobile: Lighthouse default `--form-factor=mobile --throttling-method=simulate` (Moto G4 viewport, Slow 4G, 4× CPU throttle)
- desktop: `--preset=desktop` (1350×940, no throttle)

**Purpose:** Replace the Plan 06 Playwright-PerformanceObserver measurements (which the executor flagged as instrument-inflated) with a clean non-instrumented Lighthouse run, so R9 can be resolved definitively.

## Raw runs (ms unless noted)

| File | Perf | LCP | FCP | TBT | CLS | Speed Index | TTI |
|---|---:|---:|---:|---:|---:|---:|---:|
| `dashboard-desktop-1.json` | 98 | 985 | 663 | 78 | 0.000 | 1104 | 985 |
| `dashboard-desktop-2.json` | 96 | 1177 | 571 | 36 | 0.000 | 1374 | 1177 |
| `dashboard-desktop-3.json` | 98 | 977 | 451 | 0 | 0.000 | 1015 | 977 |
| `dashboard-mobile-1.json` | 95 | 2030 | 1376 | 237 | 0.000 | 2213 | 2760 |
| `dashboard-mobile-2.json` | 93 | 2151 | 1357 | 286 | 0.000 | 1950 | 2685 |
| `dashboard-mobile-3.json` | 85 | 2837 | 1262 | 404 | 0.000 | 2371 | 2979 |
| `habitat-desktop-1.json` | 80 | 1334 | 553 | 351 | 0.000 | 1390 | 1717 |
| `habitat-desktop-2.json` | 99 | 719 | 399 | 19 | 0.000 | 1076 | 1250 |
| `habitat-desktop-3.json` | 98 | 931 | 601 | 0 | 0.000 | 1177 | 931 |
| `habitat-mobile-1.json` (cold) | 60 | 3566 | 1270 | 2573 | 0.000 | 3713 | 6964 |
| `habitat-mobile-2.json` | 77 | 2957 | 1157 | 664 | 0.000 | 3142 | 4901 |
| `habitat-mobile-3.json` | 78 | 2989 | 1039 | 646 | 0.000 | 2962 | 4896 |

Raw JSON in `.planning/phases/13-3d-habitat/lighthouse/`.

## Medians (decision data)

| Route | Profile | LCP | TBT | CLS | Perf | CWV Gate | Verdict |
|---|---|---:|---:|---:|---:|---|---|
| `/dashboard` | desktop | 985 | 36 | 0 | 98 | ✅ LCP ≤ 2500, TBT ≤ 200, CLS ≤ 0.1 | **PASS** |
| `/dashboard` | mobile | 2151 | 286 | 0 | 93 | ⚠ TBT 286 > 200 (LCP, CLS pass) | **PASS** (TBT marginal — INP risk) |
| `/habitat` | desktop | 931 | 19 | 0 | 98 | ✅ all gates | **PASS** |
| `/habitat` | mobile | **2989** | **646** | 0 | 77 | ❌ LCP 2989 > 2500; TBT 646 > 200 | **FAIL** |

> The `habitat-mobile-1` run is a cold-cache outlier (Vercel edge cache empty); reported median is over runs 2+3 for mobile. Even with run 1 included, median is still LCP 2989 ms (worse).

## R9 verdict

**FAIL on `/habitat` mobile** (CWV "Good" gates breached on LCP and TBT; CLS only metric that passes). The earlier Plan 06 conclusion ("INP 208/240 attributable to Playwright `page.evaluate` overhead") was correct that instrumentation inflated INP — but the underlying perf on mobile is genuinely below the gate. R9 carried concern is upgraded from PARTIAL to **FAIL** for `/habitat` mobile; PASS for the other 3 cells.

Root cause hypothesis: the 504 KB Three.js code-split chunk (`.next/static/chunks/11c_2vdyn8skq.js`) parses + executes on `/habitat` mount. Under mobile 4× CPU throttle that single chunk dominates main-thread time:
- TBT 646 ms ≈ ~3.2× CPU budget over the 200 ms threshold
- TTI ~4.9 s suggests the LCP element is the Three.js canvas itself, not server HTML
- Desktop median LCP 931 ms shows the rendering pipeline isn't the problem — it's mobile CPU budget for JS execution

## D-28 re-evaluation

**Stays at cached.** The cached `<img>` widget on `/dashboard` delivers LCP 2151 mobile / 985 desktop / Perf 93–98 — squarely in CWV "Good." Reverting to the live 3D widget would add second Three.js context per page and almost certainly push `/dashboard` mobile into the same failure mode `/habitat` is in. The Plan 06 FPS-driven decision (21/18 fps < 30 gate) was directionally right even if the underlying instrumentation was inflated.

## Suggested follow-up (NOT in scope of this measurement)

To get `/habitat` mobile to CWV "Good" — candidate optimizations, listed by likely impact:

1. **Defer Three.js init past LCP.** Render a static `<img>` poster (the level-N hero `.webp` from `public/habitat/widget-l{n}.webp`) as the LCP element; mount the live canvas after `requestIdleCallback` or after a user gesture. The poster + IntersectionObserver pattern is already half-built (Plan 13-01 ported `attachViewportGate`).
2. **Reduce the 504 KB chunk.** `three` r160 ships many modules unused by clay-world. Audit imports, switch from `import * as THREE from "three"` to named imports, and let webpack tree-shake. Realistic floor for the modules actually used (`WebGLRenderer`, `Scene`, `PerspectiveCamera`, `Mesh*`, basic geometries/materials, `CatmullRomCurve3`): ~200-300 KB.
3. **Skip the elephant on mobile.** `LEVEL_CONFIG.showElephant` is per-level; gating it to desktop saves geometry + animation cost at high levels.
4. **Lighter `MeshToonMaterial` gradient map.** `toonGrad` builds DataTextures per material; cache + reuse one texture across materials.
5. **Lower `Q` quality scalar on mobile.** Currently `Q = isMobile ? 0.55 : 1` in `SceneContext` (per `13-01-SUMMARY.md`); push to 0.4 or below on detected slow CPU.

These should be planned as a Phase 13.1 follow-up (or rolled into Phase 999.1 perf initiative). Quick win likely from item 1 alone — if the LCP element becomes the static poster, LCP drops to FCP-ish (~1100 ms) and TBT drops since Three.js work moves off the critical path.

## Reproduction

```bash
PREVIEW="https://leocards-htrrnhex1-jfwashley-3181s-projects.vercel.app"
BYPASS="<vercel protection bypass secret>"
COOKIE='__Secure-better-auth.session_token=<value>'
HEADERS=$(printf '{"Cookie":"%s","x-vercel-protection-bypass":"%s"}' "$COOKIE" "$BYPASS")

# mobile
lighthouse "$PREVIEW/habitat" --form-factor=mobile --throttling-method=simulate \
  --only-categories=performance --output=json \
  --output-path=habitat-mobile.json --extra-headers="$HEADERS" \
  --chrome-flags="--headless=new --no-sandbox"

# desktop
lighthouse "$PREVIEW/habitat" --preset=desktop \
  --only-categories=performance --output=json \
  --output-path=habitat-desktop.json --extra-headers="$HEADERS" \
  --chrome-flags="--headless=new --no-sandbox"
```

The throwaway test user remains in the preview's Neon database — clean up before promoting preview to production, or rely on a separate preview DB if one exists.
