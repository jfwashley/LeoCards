# Phase 16 Baseline — /study

**Date:** 2026-07-17T23:07:33.721Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/study (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1651.231 | 127 | 0 | 775.3613149841309 | 9 | 99 |
| desktop | 1651.3872000000001 | 0 | 0 | 766.5763 | 7 | 93 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 642 KB |
| Chunk count | 11 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0vkorg8py-t65.js
- .next\static\chunks\11~_h357uh-af.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0oto2~8h5br3j.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0it_gg-k_slkp.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /study.

## Raw Runs

See `study-mobile-runs.json` / `study-desktop-runs.json`.
