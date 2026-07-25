# Phase 16 Baseline — /study

**Date:** 2026-07-25T12:59:26.361Z
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/study (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | 1502.0891000000001 | 71 | 0 | 772.8690801879883 | 8 | 99 |
| desktop | 1650.4675 | 0 | 0 | 763.8422801879883 | 16 | 93 |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | 651 KB |
| Chunk count | 11 |

### Chunk Fingerprint

- .next\static\chunks\05lv5h7z9422d.js
- .next\static\chunks\0i.l9589uvx0j.js
- .next\static\chunks\0rd88w01mgnx_.js
- .next\static\chunks\0hrofpqfe47cg.js
- .next\static\chunks\0-hrh_uw98wb_.js
- .next\static\chunks\0~k6u5_j-9bf2.js
- .next\static\chunks\0cdv1zb2esac6.js
- .next\static\chunks\0gyhlsobr-.-~.js
- .next\static\chunks\0jb.wowuku9y3.js
- .next\static\chunks\0v-nnodu33ws~.js
- .next\static\chunks\turbopack-0jx6rx49.1voj.js

## Bottleneck Classification

**Top class:** bundle
**Primary Phase-17 target:** Optimize the bundle dimension for /study.

## Raw Runs

See `study-mobile-runs.json` / `study-desktop-runs.json`.
