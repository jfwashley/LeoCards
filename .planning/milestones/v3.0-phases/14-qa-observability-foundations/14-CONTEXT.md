# Phase 14: QA observability foundations - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

QA can see exact per-card SRS state (compact state codes on cards + a live per-card state table on `/debug`) and compress cooldown time via env (`STUDY_COOLDOWN_MINUTES`), with every QA affordance gated behind the existing `DEBUG_CHEAT_SECRET` pattern and provably absent from the customer experience (automated prod-parity gating test).

Extends the Phase 13.2 QA infrastructure (`/debug` console, signed-cookie pattern, `/api/debug/state` real-state readout) and the env-configurable cooldowns introduced with the study-loop fix. Requirements: QAOB-01, QAOB-02, QAOB-03, QAOB-04.

Out of scope: scripted QA journeys (Phase 15), perf work (Phases 16-18), any customer-visible UI change.

</domain>

<decisions>
## Implementation Decisions

### QA-mode activation (QAOB-01 gating)
- **D-01:** No per-feature toggle. State codes render whenever the browser is QA-authed — i.e. a valid signed QA cookie is present. Entering the secret on `/debug` establishes QA mode; from then on every card shows its code automatically. Customers without the cookie never see them.
- **D-02:** Same `DEBUG_CHEAT_SECRET` gates everything — one QA key unlocks all QA affordances (habitat cheat, state codes, state table). No second secret. Feature is OFF entirely when the env var is unset (existing pattern).
- **D-03 (Claude's discretion):** Exact cookie mechanism — reuse/extend the existing `leo-habitat-cheat` signed cookie vs a dedicated signed "qa-mode" cookie set on secret entry. Note: today the cheat cookie only exists while an override is active, so "QA-authed" likely needs a cookie that persists from secret entry independent of any habitat override. Must remain HMAC-signed and server-verified like `debug-cheat.ts`.

### State-code marker UX (QAOB-01)
- **D-04:** Placement: small monospace corner badge pinned top-right of the card, semi-transparent overlay — no layout shift (keeps the QAOB-04 DOM assertion simple: element absent for customers).
- **D-05:** Surfaces: study session cards AND deck browse/card list rows — QA can audit a whole deck's SRS state at a glance without opening `/debug`.
- **D-06:** Cooldown segment ticks LIVE (e.g. `cd:14m` counts down) so QA can watch a short cooldown expire in real time. Client timer code must itself be QA-gated (no interval running for customers).
- **D-07 (Claude's discretion):** Exact code format — roadmap example `R2·t2n·cd:14m` (mastery round, next direction, cooldown remaining, learned/paused flags) is the reference; planner finalizes the exact token set/format.

### Cooldown env design (QAOB-02)
- **D-08:** Single value: `STUDY_COOLDOWN_MINUTES=15` applies to every round that has a cooldown (rounds 0→1 and 1→2). No per-round list.
- **D-09:** Precedence: when set, `STUDY_COOLDOWN_MINUTES` wins over everything — overrides `STUDY_NO_COOLDOWN=true` AND the dev (NODE_ENV) auto-zero. When unset, current behavior is unchanged (NO_COOLDOWN / dev auto-zero / real 12h/24h defaults).
- **D-10:** Honored wherever set — no code-level prod block. Control comes from Vercel env scoping (set on Preview, never on Production). The QAOB-04 prod-parity test proves unset ⇒ real 12h/24h defaults.

### Claude's Discretion
- `/debug` per-card state table (QAOB-03) — user opted not to discuss; planner decides layout, card scope (active deck vs all), refresh behavior, and whether to extend `/api/debug/state` or add an endpoint. Must show at least: card id, word, round, direction, cooldownUntil, pausedAt, learned — sourced from real data, not the virtual override.
- Prod-parity gating test (QAOB-04) approach — test framework/harness choice, which routes get DOM-scanned, how QA endpoint unreachability is asserted. Existing e2e patterns in `e2e/` are the natural home.
- D-03 and D-07 above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### QA gating pattern (extend, don't reinvent)
- `src/lib/debug-cheat.ts` — HMAC-signed cookie pattern: `cheatEnabled()`, `checkSecret()`, `signOverride()`/`verifyOverride()`, `CHEAT_COOKIE`. The gating model all new QA affordances must follow.
- `src/app/(protected)/debug/page.tsx` — `/debug` console: secret entry + localStorage memory, override controls, existing "Live REAL state" readout that QAOB-03 extends.
- `src/app/api/debug/state/route.ts` — existing secret-checked real-state endpoint (natural extension point for the per-card table).
- `src/app/api/debug/cheat/route.ts` — set/clear override endpoint pattern.

### Study engine & cooldowns
- `src/lib/study-engine.ts` — `DEFAULT_COOLDOWN_MS` (12h/24h/null), `computeCardUpdate(..., cooldownMsByRound)` per-call override parameter, direction rules (round0=n2t, round1=t2n, round2=either), `getCardStage`.
- `src/app/api/study/complete/route.ts` — where cooldown overrides are currently resolved (dev auto-zero + `STUDY_NO_COOLDOWN`); `STUDY_COOLDOWN_MINUTES` precedence logic lands here.
- `src/env.ts` — t3-env schema; `DEBUG_CHEAT_SECRET` (min 16, optional) and `STUDY_NO_COOLDOWN` already defined; add `STUDY_COOLDOWN_MINUTES` here.

### UI surfaces for state codes
- `src/components/study-card.tsx` — card tile the corner badge overlays (front/back faces, flip/drag animations).
- `src/components/study-session.tsx` + `src/components/card-stack.tsx` — session state holding per-card round/direction data.
- `src/components/card-list.tsx` / `src/components/word-list-browser.tsx` / `src/components/deck-view.tsx` — browse surfaces for D-05.

### Project state
- `.planning/ROADMAP.md` — Phase 14 entry + success criteria.
- `.planning/REQUIREMENTS.md` — QAOB-01..04 exact wording; "QA features visible to customers" is a hard out-of-scope.
- `e2e/study-progression.spec.ts` — existing real-pipeline e2e pattern (reference for the gating test style).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `debug-cheat.ts` sign/verify helpers: reusable wholesale for any new signed QA cookie (HMAC-SHA256, payload.sig format, returns null on any invalid input).
- `/debug` page already manages the secret (input + localStorage + auto-fetch on mount) — QA-auth cookie issuance can hook into that flow.
- `computeCardUpdate` already accepts `cooldownMsByRound` per call — `STUDY_COOLDOWN_MINUTES` is a resolution-layer change in `/api/study/complete`, not an engine change.

### Established Patterns
- All QA features: env-secret optional in `src/env.ts`, feature hard-OFF when unset, server-side verification, never trust client input.
- Phase 13.2 precedent: QA envs set on Vercel Production + Preview scopes via REST API (no connected Git repo; CLI `env add preview` is buggy — use REST with `target:["preview"]`, token at `~/AppData/Roaming/com.vercel.cli/Data/auth.json`).
- e2e tests use `*test.local` users; `scripts/cleanup-test-users.mjs` removes them.

### Integration Points
- Server components/API must expose per-card SRS fields (round, direction, cooldownUntil, pausedAt, learned) to study + browse surfaces only when QA-authed — keep the customer payload unchanged.
- `/api/debug/state` extension for the per-card table (QAOB-03).
- New badge component shared between study card and browse rows keeps the gating test surface small.

</code_context>

<specifics>
## Specific Ideas

- State-code reference format from roadmap: `R2·t2n·cd:14m` — round, next direction, cooldown remaining; learned/paused flags included.
- QAOB-02 rationale (from REQUIREMENTS.md): `STUDY_NO_COOLDOWN` alone hides cooldown bugs because the "still cooling down" rejection state is never exercised — short non-zero cooldowns are the point.
- Success criterion: 12h/24h round transitions testable within a 10–60 minute window.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-qa-observability-foundations*
*Context gathered: 2026-06-12*
