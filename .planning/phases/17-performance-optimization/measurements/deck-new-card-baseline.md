# Phase 16 Baseline — /deck/new-card

**Date:** 2026-07-17T23:07:33.721Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/deck/new-card (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1512.1062 | 338.0000000000001 | 0 | 812.1017149841308 | 8 | 92 |
| desktop | 1512.5451 | 8 | 0 | 771.7956149841309 | 8 | 95 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 789 KB |
| Chunk count | 11 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\10fff67dnb14l.js
- .next\static\chunks\073b84iqt1p.o.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0oto2~8h5br3j.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0it_gg-k_slkp.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /deck/new-card.

## Raw Runs

See `deck-new-card-mobile-runs.json` / `deck-new-card-desktop-runs.json`.
