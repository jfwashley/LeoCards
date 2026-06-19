# Phase 14: QA observability foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 14-qa-observability-foundations
**Areas discussed:** QA-mode activation, State-code marker UX, Cooldown env design

---

## QA-mode activation

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing override | Add `cardCodes: true` flag to existing signed cookie payload, toggled from /debug | |
| Separate signed cookie | New cookie + new /api/debug toggle endpoint, independent of habitat override | |
| You decide | Planner picks whichever integrates cleanest | |
| (Other) Always on, no toggle | User free-text: "Just make it always on for now, no need to turn on or off" | ✓ |

**User's choice:** Always on — no per-feature toggle.
**Notes:** Follow-up confirmed this means "on whenever QA-authed" (valid signed cookie after entering the secret on /debug), NOT literally visible to customers — flagged that literal always-on would violate QAOB-01/04; user confirmed the QA-authed reading. Cookie mechanism detail left to Claude's discretion (D-03).

| Option | Description | Selected |
|--------|-------------|----------|
| Same secret | One QA key (DEBUG_CHEAT_SECRET) unlocks all QA affordances | ✓ |
| New secret | e.g. QA_OBSERVABILITY_SECRET, separate key to manage | |

**User's choice:** Same secret.

---

## State-code marker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Corner badge | Small monospace chip pinned top-right, semi-transparent, no layout shift | ✓ |
| Below the card | Caption under the card stack | |
| You decide | Planner picks based on flip/drag animations | |

**User's choice:** Corner badge.

| Option | Description | Selected |
|--------|-------------|----------|
| Study + browse | Codes in study session AND deck browse/card list rows | ✓ |
| Study session only | Codes only where grading happens | |

**User's choice:** Study + browse.

| Option | Description | Selected |
|--------|-------------|----------|
| Static per render | Computed at render; refresh to update | |
| Live countdown | Ticks via interval; watch a 15-min QA cooldown expire in real time | ✓ |

**User's choice:** Live countdown.

---

## Cooldown env design

| Option | Description | Selected |
|--------|-------------|----------|
| Single value | STUDY_COOLDOWN_MINUTES=15 applies to every cooldown round | ✓ |
| Per-round list | e.g. 15,30 preserves relative ordering | |

**User's choice:** Single value.

| Option | Description | Selected |
|--------|-------------|----------|
| Minutes wins when set | Overrides STUDY_NO_COOLDOWN and dev auto-zero; unset = unchanged | ✓ |
| NO_COOLDOWN wins | Existing preview behavior protected | |
| You decide | Planner documents precedence chain | |

**User's choice:** Minutes wins when set.

| Option | Description | Selected |
|--------|-------------|----------|
| Wherever set | Honored in any env; control via Vercel env scoping | ✓ |
| Block on production | Code-level refusal on prod deployment | |

**User's choice:** Wherever set.

---

## Claude's Discretion

- Exact QA-auth cookie mechanism (extend `leo-habitat-cheat` vs dedicated signed qa-mode cookie) — D-03
- Exact state-code token format (reference: `R2·t2n·cd:14m`) — D-07
- `/debug` per-card state table layout, card scope, refresh behavior, endpoint choice (area offered but not selected for discussion) — QAOB-03
- Prod-parity gating test framework/approach — QAOB-04

## Deferred Ideas

None — discussion stayed within phase scope.
