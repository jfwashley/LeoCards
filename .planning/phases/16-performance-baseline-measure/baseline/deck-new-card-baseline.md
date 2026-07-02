# Phase 16 Baseline — /deck/new-card

**Date:** 2026-07-01T23:31:38.770Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/deck/new-card (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1955.8130999999998 | 891.4186096191405 | 0 | 806.2851903808594 | 12 | 79 |
| desktop | 1956.9877000000001 | 46 | 0 | 776.6603 | 10 | 90 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 1111 KB |
| Chunk count | 15 |

### Chunk Fingerprint

- .next\static\chunks\0x.73w57rn4ou.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\06rht9g0rvoa8.js
- .next\static\chunks\0~06tul_s41ju.js
- .next\static\chunks\0r6cc2ncwhx7w.js
- .next\static\chunks\0nr~2mkmgxu52.js
- .next\static\chunks\073b84iqt1p.o.js
- .next\static\chunks\125v.ecx5uiln.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\04jz-y17vz80c.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\turbopack-0z5bv5-e51wux.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /deck/new-card.

## Raw Runs

See `deck-new-card-mobile-runs.json` / `deck-new-card-desktop-runs.json`.
