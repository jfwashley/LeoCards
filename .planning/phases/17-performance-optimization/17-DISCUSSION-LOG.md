# Phase 17: Performance optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 17-performance-optimization
**Areas discussed:** Daybreak fidelity limits, Refactor latitude, Measure/verify cadence, PERF-04 instant-nav definition

---

## Daybreak fidelity limits

| Option | Description | Selected |
|--------|-------------|----------|
| Progressive loading OK (Recommended) | Secondary/below-the-fold UI may load in lazy chunks with brief placeholders; settled state matches Daybreak exactly | ✓ (via free text) |
| Pixel-and-behaviour identical | Only invisible wins: dead code, import hygiene, RSC conversions | |
| Whatever the gates need | Animations may be simplified and sections deferred if measurements demand it | |

**User's choice:** Free text — "Which ever is better for mobile apps" → confirmed as progressive loading / mobile-first policy.
**Notes:** Established the phase's standing directive: on any tradeoff, pick the mobile-web best practice.

| Option | Description | Selected |
|--------|-------------|----------|
| Poster first, video enhances (Recommended) | LCP paints the habitat as an image; clip + player JS load after interactive and cross-fade in | ✓ |
| Video live from first paint | Keep the ambient clip eager; find TBT savings elsewhere | |
| Claude decides from measurements | Defer the video only if /dashboard can't hit gates without it | |

**User's choice:** Poster first, video enhances.

| Option | Description | Selected |
|--------|-------------|----------|
| Simple Daybreak-toned blocks (Recommended) | One reusable shimmer style in cream/amber | ✓ |
| Designed skeleton states | Per-section skeletons mirroring real layout | |
| No visible placeholders | Reserve space silently | |

**User's choice:** Simple Daybreak-toned blocks.

| Option | Description | Selected |
|--------|-------------|----------|
| Checkpoint me (Recommended) | Pause with measured evidence + the proposed visible change; approve/veto per case | ✓ |
| Gates win | Make the visible change, note it in the summary | |
| Fidelity wins | Document the gate miss, carry to Phase 18 | |

**User's choice:** Checkpoint me.

---

## Refactor latitude

| Option | Description | Selected |
|--------|-------------|----------|
| Swap where visually identical (Recommended) | CSS/lighter equivalents where indistinguishable; keep library for load-bearing moments; dead deps removed | ✓ |
| Split/defer only | No library replacements this phase | |
| Full latitude | Any dependency swappable with evidence | |

**User's choice:** Swap where visually identical.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, freely (Recommended) | RSC conversions wherever behaviour is identical — the cleanest first-load JS cut | ✓ (via delegation) |
| Only leaf components | Convert small leaves, no page-level restructuring | |
| Avoid this phase | No client/server boundary changes | |

**User's choice:** Free text — "Give me your recommendation based on the best for mobile app." → Claude recommended and locked "Yes, freely" (RSC conversion is the most mobile-effective TBT lever).

| Option | Description | Selected |
|--------|-------------|----------|
| Stable options yes, experimental checkpointed (Recommended) | Stable config wins land freely; experimental flags need a checkpoint with evidence | ✓ |
| Stable options only | No experimental flags at all | |
| Anything with evidence | Experimental allowed if medians justify | |

**User's choice:** Stable options yes, experimental checkpointed.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with regression checks (Recommended) | Shared-chunk refactors allowed; /habitat spot-check + auth e2e as guards | ✓ |
| Route-local changes only | Touch only the four routes' own trees | |
| Shared code late | Route-local first, shared only if gates still fail | |

**User's choice:** Yes, with regression checks.

---

## Measure/verify cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Route-scoped per batch + full final (Recommended) | Route filter on measure-cwv.mjs; ~7-min affected-route runs per batch; full run at phase end as official after-record | ✓ |
| Full suite every time | Complete ~28-min run per landed optimization | |
| Measure at wave boundaries only | Batch per wave, measure once per wave | |

**User's choice:** Route-scoped per batch + full final.

| Option | Description | Selected |
|--------|-------------|----------|
| One spot-check after shared work (Recommended) | Single cheap /habitat mobile run (n=3) after shared refactors + in final full run | ✓ |
| Include in every measure run | /habitat as a 5th measured route all phase | |
| No habitat measuring | Trust the Perf-96 headroom | |

**User's choice:** One spot-check after shared work.

| Option | Description | Selected |
|--------|-------------|----------|
| Per risky wave + final (Recommended) | e2e every wave; qa:run after study/SRS/data or RSC-boundary waves + always at phase end | ✓ |
| Only at phase end | One qa:run + e2e at the end | |
| After every optimization | Per landed change | |

**User's choice:** Per risky wave + final.

| Option | Description | Selected |
|--------|-------------|----------|
| Gates pass = done (Recommended) | Pass all four gates, note headroom, move on | ✓ |
| Free wins allowed after gates | Zero-risk already-identified wins may still land | |
| Push for headroom | Aim past gates (TBT ≤150, Perf ≥93) | |

**User's choice:** Gates pass = done.

---

## PERF-04 instant-nav definition

| Option | Description | Selected |
|--------|-------------|----------|
| Real journeys, hub-and-spoke (Recommended) | 6 navigations: dashboard↔study, dashboard↔new-card, dashboard↔browse | ✓ |
| All 12 directed pairs | Every key route to every other | |
| Daily loop only | dashboard↔study only | |

**User's choice:** Real journeys, hub-and-spoke.

| Option | Description | Selected |
|--------|-------------|----------|
| Local prod build (Recommended) | Playwright vs `next build && next start`; extends e2e/13-perf.spec.ts; honours dev-server-noise lesson | ✓ |
| Warm prod | Real leocards.vercel.app navigation | |
| Both, prod informational | Gate local, record prod once | |

**User's choice:** Local prod build.

| Option | Description | Selected |
|--------|-------------|----------|
| ≤100 ms to visible response (Recommended) | Median n≥5/pair, nav trigger → destination content visibly rendering, prefetch warm | ✓ |
| ≤150 ms median | Looser budget for RSC fetch | |
| ≤100 ms with immediate feedback fallback | Two-tier: response ≤100 + content ≤300 | |

**User's choice:** ≤100 ms to visible response.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, tune prefetch (Recommended) | Verify/enable prefetch on the 6 gated links | ✓ |
| Measure as-is first | Only touch prefetch if a pair misses | |
| No prefetch changes | Rely on bundle cuts alone | |

**User's choice:** Yes, tune prefetch.

| Option | Description | Selected |
|--------|-------------|----------|
| Instant, targeted refresh (Recommended) | Cached dashboard serves instantly; mutations explicitly invalidate so due-counts + habitat are fresh on landing | ✓ |
| Always fresh | Refetch before every dashboard render | |
| Stale OK briefly | Background revalidate; numbers may visibly correct | |

**User's choice:** Instant, targeted refresh.

| Option | Description | Selected |
|--------|-------------|----------|
| Real content only (Recommended) | Gate passes only on actual destination content ≤100 ms; skeletons don't count | ✓ |
| Skeleton counts | Any route-shaped visible change passes | |
| Skeleton ≤100 + content ≤300 | Two-tier assertion | |

**User's choice:** Real content only.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, fold it in (Recommended) | Gate existing INP asserts to prod-build-only in the same 13-perf spec extension (task_d326ebac) | ✓ |
| Keep it separate | Leave in backlog | |

**User's choice:** Yes, fold it in.

| Option | Description | Selected |
|--------|-------------|----------|
| Link nav only (Recommended) | Gate the 6 navigations as in-app link taps; Back rides Next's cache | ✓ |
| Both link and Back | Add browser-back variants (9 navs) | |

**User's choice:** Link nav only.

---

## Claude's Discretion

- Component-level split/convert choices per route; chunk attribution method; route attack order (worst-first vs shared-first).
- Placeholder implementation details; prefetch mechanics; targeted-invalidation mechanism (per Next 16 shipped docs).
- Route-filter flag design for measure-cwv.mjs; nav-timing instrumentation markers.

## Deferred Ideas

- Designed per-section skeleton states — only if simple shimmer looks wrong in practice.
- Browser-Back navigation gating — Phase 18 candidate only if field data shows pain.
