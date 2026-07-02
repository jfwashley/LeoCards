# Phase 16 Baseline — /dashboard

**Date:** 2026-07-01T23:31:38.770Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/dashboard (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1816.8835 | 518 | 0 | 834.817 | 9 | 86 |
| desktop | 1817.6432 | 52 | 0 | 788.8595 | 15 | 92 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 887 KB |
| Chunk count | 15 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\16brge.rklp.d.js
- .next\static\chunks\0~06tul_s41ju.js
- .next\static\chunks\0x45okourzln6.js
- .next\static\chunks\0nr~2mkmgxu52.js
- .next\static\chunks\0kuib5a6b-~~h.js
- .next\static\chunks\0uo46iya6fvb3.js
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
