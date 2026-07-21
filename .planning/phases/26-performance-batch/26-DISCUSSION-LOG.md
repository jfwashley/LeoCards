# Phase 26: Performance batch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 26-performance-batch
**Areas discussed:** Study-save retry safety, Translation batching behavior, Photo resize trade-offs, Clip caching risk

---

## Study-save retry safety

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it this phase (Recommended) | Harmless redundancy, zero user impact, smallest change to a critical path; retiring is a later cleanup once batch proven in prod | ✓ |
| Retire it now | Cleaner code, review says atomic batch supersedes it; bigger change to the most important save path | |
| Let the planner decide | Planner confirms batch atomicity on the driver and decides on evidence | |

**User's choice:** Keep it this phase

| Option | Description | Selected |
|--------|-------------|----------|
| Count round trips (Recommended) | Test asserts one DB round trip instead of ~27; deterministic, can't flake; informal stopwatch note in summary | ✓ |
| Build a timing gate | Extend e2e perf suite to time the save screen; real numbers but flaky and adds harness work | |

**User's choice:** Count round trips

---

## Translation batching behavior

| Option | Description | Selected |
|--------|-------------|----------|
| One batch = one request (Recommended) | 50-word extraction spends 1 of 30; limit still stops abuse; DeepL quota is character-based | ✓ |
| Count the words inside | Keeps today's effective ceiling but re-creates the failure being fixed for consecutive big extractions | |

**User's choice:** One batch = one request

| Option | Description | Selected |
|--------|-------------|----------|
| One auto-retry, then placeholders (Recommended) | Retry once automatically; then existing "Translation unavailable" manual-fill state; no new UI | ✓ |
| Placeholders immediately | Simplest, but a transient blip costs the whole batch | |

**User's choice:** One auto-retry, then placeholders

---

## Photo resize trade-offs

| Option | Description | Selected |
|--------|-------------|----------|
| Standard (1568px, JPEG 80%) (Recommended) | ~150-400 KB, text legible for extraction, matches provider's own downsampling target | ✓ |
| Higher (1568px, JPEG 90%) | Double the size for marginal sharpness; kept as planner's fallback rule if extraction accuracy drops | |

**User's choice:** Standard (1568px, JPEG 80%)

| Option | Description | Selected |
|--------|-------------|----------|
| Accept bigger originals (Recommended) | Client acceptance to ~20 MB originals; server cap lowered to 4 MB (under Vercel's ~4.5 MB) killing the silent death band structurally | ✓ |
| Keep current caps | Smaller change but keeps rejecting now-workable photos; dead zone closed only in happy path | |

**User's choice:** Accept bigger originals

---

## Clip caching risk

| Option | Description | Selected |
|--------|-------------|----------|
| Cache forever + naming rule (Recommended) | Immutable header on existing filenames + documented render-pipeline rule: re-renders ship under NEW filenames; zero churn now | ✓ |
| Version filenames now | Bulletproof but renames dozens of files/references for a scenario that may never occur | |
| Cache 1 week instead | Middle ground, self-heals in a week; less optimal | |

**User's choice:** Cache forever + naming rule

---

## Claude's Discretion

- Exact `db.batch()` composition for the study commit (verify neon-http atomicity first)
- `/api/translate` batch shape (array mode vs new field) — fewest moving parts, backward-compatible
- Canvas resize implementation details (EXIF orientation, HEIC handling)

## Deferred Ideas

- Retire WR-04 commitId machinery after the batch proves itself in prod (future cleanup)
- LazyMotion diet — already in ROADMAP Backlog (D-05 rationale)
- PPR/CacheComponents instant-nav — pre-existing Phase 17 deferral, untouched
