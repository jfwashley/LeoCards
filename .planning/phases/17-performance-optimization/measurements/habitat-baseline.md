# Phase 16 Baseline — /habitat

**Date:** 2026-07-19T15:12:08.571Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/habitat (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1997.4416 | 308 | 0.009817976197682366 | 837.1093 | 61 | 93 |
| desktop | 1680.8413 | 18 | 0.005240346729708432 | 819.0918149841309 | 139 | 93 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 580 KB |
| Chunk count | 12 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\03e206n5qu9u9.js
- .next\static\chunks\0qj-7.4t86-8d.js
- .next\static\chunks\0a65zxoakqu4e.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0oto2~8h5br3j.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0it_gg-k_slkp.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /habitat.

## Raw Runs

See `habitat-mobile-runs.json` / `habitat-desktop-runs.json`.
