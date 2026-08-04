# Phase 16 Baseline — /dashboard

**Date:** 2026-08-04T13:17:05.879Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/dashboard (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1815.6093 | 388 | 0 | 823.9869801879883 | 9 | 90 |
| desktop | 1820.3343 | 82 | 0 | 792.4824 | 8 | 91 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 701 KB |
| Chunk count | 13 |

### Chunk Fingerprint

- .next\static\chunks\05lv5h7z9422d.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0ti117gx4bh~b.js
- .next\static\chunks\0~06tul_s41ju.js
- .next\static\chunks\0tw289h1lbpyn.js
- .next\static\chunks\0ypmd1x1xs~g-.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0cdv1zb2esac6.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\turbopack-0jx6rx49.1voj.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /dashboard.

## Raw Runs

See `dashboard-mobile-runs.json` / `dashboard-desktop-runs.json`.
