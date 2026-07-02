# Phase 16 Baseline — /habitat

**Date:** 2026-07-02T23:57:03.937Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/habitat (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1652.6046000000001 | 776.9999999999999 | 0 | 806.6382903808594 | 11 | 81 |
| desktop | 1654.2728 | 141 | 0 | 786.5595 | 10 | 90 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 580 KB |
| Chunk count | 12 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0tbni7a.z5k.5.js
- .next\static\chunks\0qj-7.4t86-8d.js
- .next\static\chunks\0hnlp3qll~~_u.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\04jz-y17vz80c.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0z5bv5-e51wux.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /habitat.

## Raw Runs

See `habitat-mobile-runs.json` / `habitat-desktop-runs.json`.
