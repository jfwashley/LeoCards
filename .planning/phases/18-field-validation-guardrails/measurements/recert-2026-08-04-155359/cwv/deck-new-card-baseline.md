# Phase 16 Baseline — /deck/new-card

**Date:** 2026-08-04T14:59:56.424Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/deck/new-card (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1663.8588 | 129.76811981201172 | 0 | 819.4606801879883 | 56 | 98 |
| desktop | 1586.9526 | 0 | 0 | 819.7693801879883 | 56 | 94 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 776 KB |
| Chunk count | 11 |

### Chunk Fingerprint

- .next\static\chunks\05lv5h7z9422d.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0-cbohzh_kdv2.js
- .next\static\chunks\0ypcw6v.v~5rh.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0cdv1zb2esac6.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\turbopack-0jx6rx49.1voj.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /deck/new-card.

## Raw Runs

See `deck-new-card-mobile-runs.json` / `deck-new-card-desktop-runs.json`.
