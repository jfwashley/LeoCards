# Phase 27: Performance batch 2 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 27-performance-batch-2
**Areas discussed:** Triage, Session caching (item 8), Extraction speed (item 13), Deploy/wave strategy

---

## Triage: all 12 or cut some?

| Option | Description | Selected |
|--------|-------------|----------|
| All 12 | Every item survived the review; risky ones have built-in gates; ~5-6 plans | ✓ |
| 11 — defer item 13 | Drop the extraction model/streaming work (only item touching AI output quality) | |
| 10 — defer 13 + 16 | Also drop CardList memoization (animation-adjacent) | |
| Let me pick per item | Item-by-item walkthrough | |

**User's choice:** All 12 (recommended)

### Follow-up: item 18 blur scope

| Option | Description | Selected |
|--------|-------------|----------|
| All over-video blurs | h-prog-card + h-back + h-mood-chip + habitat-scene overlay; account-back untouched | ✓ |
| Only h-prog-card.tsx | Strictly what the review flagged | |
| Check visuals first | Screenshot per component, keep any that visibly matter | |

**User's choice:** All over-video blurs (recommended). Scout had found 4 more blur sites than the review flagged.

---

## Session caching trade-off (item 8)

| Option | Description | Selected |
|--------|-------------|----------|
| cache() + 5min cookieCache | Full review recommendation; revocation delay ≤5min accepted | ✓ |
| cache() + 1min cookieCache | Middle ground, 60s revocation cap | |
| React cache() only | Zero semantic change, loses cold-start/API-route wins | |

**User's choice:** cache() + 5min cookieCache (recommended)

### Follow-up: cache bypass for sensitive surfaces

| Option | Description | Selected |
|--------|-------------|----------|
| Bypass on /account + its actions | Account page + mutations always verify live session via disableCookieCache | ✓ |
| No bypass anywhere | Simplest; dangerous ops already require current password | |
| You decide | Researcher/planner settles from better-auth docs | |

**User's choice:** Bypass on /account + its actions (recommended)

---

## Extraction speed path (item 13)

| Option | Description | Selected |
|--------|-------------|----------|
| Staged: Haiku trial, stream only if still slow | Review's path; eval + manual side-by-side gate; revert if quality drops | ✓ |
| Both this phase | Model swap AND streaming — biggest diff of the phase | |
| Streaming only, keep Sonnet | Zero quality risk, perceived-wait win only | |
| Haiku swap only | Skip streaming entirely regardless of outcome | |

**User's choice:** Staged (recommended). Noted honestly: Phase 10 offline vision eval reference-set is incomplete carried debt, so the gate is eval expectations + manual real-photo side-by-side.

### Follow-up: what triggers streaming

| Option | Description | Selected |
|--------|-------------|----------|
| Checkpoint: I decide on the numbers | Executor reports wall-times, Josh calls it (17 D-04 pattern) | |
| Threshold: stream if median > ~4s | Pre-committed number; streaming lands same-phase without another ask | ✓ |
| Never this phase | Haiku outcome is the phase outcome | |

**User's choice:** Threshold — stream if median > ~4s

---

## Deploy/wave strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Push 26 before 27 starts | Prod gets the 429 fix + all 26 wins now; 27 cleanly attributable | ✓ |
| Wave 1 = item 15 race fix, push after it | Mirror 26's early-push wave structure | |
| One push at end of 27 | Fewest deploys; prod keeps both live bugs for the phase duration | |

**User's choice:** Push 26 before 27 starts (recommended; the push itself remains Josh's manual action)

### Follow-up: item 14 index application to hosted Neon

| Option | Description | Selected |
|--------|-------------|----------|
| During execution, gated | Executor runs db:push at that plan's gate with explicit authorization | ✓ |
| At deploy time | Josh runs db:push in the end-of-phase push ritual | |
| Code only, apply later | Schema changes land, db:push parked like HUMAN-UATs | |

**User's choice:** During execution, gated (recommended)

---

## Claude's Discretion

- Item 9 optimistic-toggle rollback + refresh-coalescing mechanics (copy word-list-browser.tsx pattern)
- Item 10 zod/mini migration mechanics + full importer audit (incl. Phase-25 additions)
- Item 12 dashboard consolidation shape (verify createdAt truly dead)
- Item 16 memoization details (BWWordRow pattern, useDeferredValue, post-tween mount)
- Item 17 read-path composition (verify against shipped 26-02 code)
- Item 19 LRU size/TTL/keying (rate-limiter deployment assumptions)
- Requirement-ID minting mechanics (PERF-12..23 at plan time)

## Deferred Ideas

- Retire WR-04 commitId machinery (still parked from 26 D-01)
- LazyMotion diet (Backlog, 17 D-05)
- Standalone streaming extraction if Haiku clears the bar but spinner still feels long
- PPR/CacheComponents instant-nav (Phase 17 deferral)
