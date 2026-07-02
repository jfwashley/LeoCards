# Phase 16 Baseline — /study

**Date:** 2026-07-01T23:31:38.770Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/study (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1801.1988999999999 | 712.4186096191406 | 0 | 781.3873903808594 | 11 | 82 |
| desktop | 1801.5567999999998 | 129.9999999999999 | 0 | 769.7135 | 6 | 90 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 657 KB |
| Chunk count | 11 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0scan.g7.hzsa.js
- .next\static\chunks\0kuib5a6b-~~h.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\04jz-y17vz80c.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0z5bv5-e51wux.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /study.

## Raw Runs

See `study-mobile-runs.json` / `study-desktop-runs.json`.
