# Phase 16 Baseline — /deck/browse

**Date:** 2026-08-04T13:17:05.879Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/deck/browse (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1612.3713 | 303 | 0 | 906.8318 | 10 | 93 |
| desktop | 1610.1559 | 29 | 0 | 879.1351 | 9 | 93 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 530 KB |
| Chunk count | 10 |

### Chunk Fingerprint

- .next\static\chunks\05lv5h7z9422d.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0f8ify1iwizbm.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0cdv1zb2esac6.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\turbopack-0jx6rx49.1voj.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /deck/browse.

## Raw Runs

See `deck-browse-mobile-runs.json` / `deck-browse-desktop-runs.json`.
