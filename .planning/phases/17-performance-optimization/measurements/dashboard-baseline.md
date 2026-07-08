# Phase 16 Baseline — /dashboard

**Date:** 2026-07-03T00:25:48.448Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/dashboard (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1816.4360000000001 | 523.9999999999999 | 0 | 821.0516903808593 | 16 | 86 |
| desktop | 1815.7471 | 202 | 0 | 785.8284903808594 | 10 | 85 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 886 KB |
| Chunk count | 15 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0nhun2.op.0vu.js
- .next\static\chunks\0uo46iya6fvb3.js
- .next\static\chunks\06gjgsto.~pvr.js
- .next\static\chunks\0kuib5a6b-~~h.js
- .next\static\chunks\0qj-7.4t86-8d.js
- .next\static\chunks\0-akm-r~pc0m~.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\04jz-y17vz80c.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0z5bv5-e51wux.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /dashboard.

## Raw Runs

See `dashboard-mobile-runs.json` / `dashboard-desktop-runs.json`.
