# Phase 15: Core-journey QA harness - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a **scripted, repeatable, time-resumable QA harness** that proves the core learning journey correct by driving the app's **real pipeline** (not the `/debug` virtual override): learn → master → cool down → decay → level up. Scope = requirements **QAJ-01..06** (six journeys):

1. QAJ-01 — "learn a card": create user/deck/card, run a real study session, assert round 0→1 with correct next direction + cooldown.
2. QAJ-02 — full mastery progression rounds 0→1→2→3→learned, incl. wrong-answer reset/hold paths + direction rules (round0=n2t, round1=t2n, round2=either).
3. QAJ-03 — time-resumable session: persist a manifest, exit, resume 10–60 min later and assert each card's expected state (cooldown expired vs still cooling, due-counts).
4. QAJ-04 — habitat level progression: learn enough through the real pipeline to cross L1→2 (+ one higher transition); assert `computeHabitatState`, dashboard widget, and `/habitat` all agree.
5. QAJ-05 — decay/grace (2-day grace + 5%/day, incl. pause interactions) verified via a QA-gated time-shift (no real multi-day waits).
6. QAJ-06 — self-cleaning: all QA users use `*test.local`; `scripts/cleanup-test-users.mjs` leaves zero residue.

**NOT this phase:** performance work (Phases 16–18), CI-pipeline automation of the harness (run-on-demand only — future), customer-visible QA features (hard out-of-scope, QAOB-04 discipline applies).

</domain>

<decisions>
## Implementation Decisions

### Harness form & runner
- **D-01:** The harness is built as **standalone Node scripts in `scripts/*.mjs`** (same convention as the existing `scripts/cleanup-test-users.mjs`). Headless, fast, run on demand, and easy to make time-resumable via a persisted JSON manifest. NOT Playwright specs and NOT Vitest integration tests — those were considered and rejected (Playwright is harder to resume across separate runs; Vitest risks the same "green tests hid the bug" gap this phase exists to close).

### How it drives the real pipeline
- **D-02:** The harness drives the app's **real HTTP API path** against a running server — it POSTs grades / reads state through the app's own endpoints, at the same level the UI calls them. It does NOT use the `/debug` virtual override to advance the journey, and does NOT (in this phase) automate the browser. *(Research must confirm the exact study-grade entry point(s): scout found `src/app/api/habitat/route.ts` but the study/grade submission path — API route vs server action — needs verification; the decision is "drive the real server pipeline headlessly via its own API path," whatever that endpoint turns out to be.)*

### Time compression
- **D-03:** Use a **QA-gated, instant time-shift** to make cooldown-resume (QAJ-03) and the 2-day-grace / 5%-per-day decay (QAJ-05) assert immediately, with **no real wall-clock waiting**. This is the deterministic path and matches QAJ-05's "QA-gated time-shift" wording. (Phase 14's `STUDY_COOLDOWN_MINUTES` short-cooldown lever exists but real waits were rejected as slow/flaky.)
- **D-05 (derived):** The QA-gated time-shift is a **new QA-only affordance** and MUST follow the Phase 14 prod-parity discipline (env/secret-gated like `DEBUG_CHEAT_SECRET` / QA-mode; provably absent + unreachable when secrets unset). The QAOB-04-style prod-parity gating test must be extended to cover it. It must never alter real customer time/state.

### Assertion source of truth
- **D-06 (derived):** The harness asserts against **Phase 14's real-data observability surface** — the `/debug` per-card state table + the `R0·n2t`-style state codes (round, next direction, cooldown remaining, learned/paused) sourced from REAL data. It must NOT assert against the `/debug` *virtual override* (the habitat-cheat / state-override cheat console) — that override is for visual state inspection, not for driving or verifying the journey.

### Run target & test-data lifecycle
- **D-04:** The harness runs against the **local dev server** (`npm run dev`); correctness is the goal here (warm-prod perf is Phases 16–18). Each run **self-provisions** its own `*test.local` user/deck/cards and **self-cleans** via `scripts/cleanup-test-users.mjs` (QAJ-06) so nothing leaks into real data. Prod-target runs were considered and deferred (not needed for a correctness harness).

### Claude's Discretion
- Manifest schema/format for the resumable session (QAJ-03), per-journey script layout vs one orchestrator, failure behavior (stop-at-first vs run-all-and-report), and the exact time-shift surface (request header / QA endpoint / injected clock) — left to research/planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase Details (v3.0) → Phase 15" — goal, depends-on, 5 success criteria.
- `.planning/REQUIREMENTS.md` § "Core-Journey QA Scripts" — QAJ-01..06 (authoritative requirement text).
- `.planning/milestones/v3.0-ROADMAP.md` § Phase 15 — same detail (archive copy).

### Phase 14 (the observability surface this harness builds on)
- `.planning/milestones/v3.0-REQUIREMENTS.md` § "QA Observability" — QAOB-01..04 (state codes, `STUDY_COOLDOWN_MINUTES`, `/debug` state table, prod-parity gating) — the assertion surface + the gating discipline D-05 must mirror.
- `src/app/(protected)/debug/page.tsx` — the `/debug` live per-card SRS state table (real data) the harness reads for assertions (D-06).
- `src/lib/debug-cheat.ts` + `src/app/api/debug/cheat/*` — the existing QA-gated cheat pattern (signed/secret-gated); reference for D-05's time-shift gating (and the cheat-cookie HMAC the UAT capture used).

### Engine truth (what the harness asserts)
- `src/lib/habitat-engine.ts` — `computeHabitatState`, level thresholds, 2-day grace + 5%/day decay, mood rules (QAJ-04/05 assertions).
- The SRS/study engine (round/direction/cooldown rules) — **research to locate** (e.g. `src/lib/` study/SRS module + the study grade API/action); QAJ-01/02 assert round0=n2t, round1=t2n, round2=either + wrong-answer reset/hold.

### Existing harness assets to reuse
- `scripts/cleanup-test-users.mjs` — QAJ-06 cleanup (already exists; the harness must produce users it removes).
- `e2e/helpers.ts` — `testEmail()` (`*test.local`), `signUpWithDeck`, etc. — reference for the provisioning flow (note: harness is Node-script/HTTP per D-01/D-02, but the signup/deck sequence is the same shape).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/cleanup-test-users.mjs`: the QAJ-06 teardown — harness users must all be `*test.local` so this removes them.
- `e2e/helpers.ts`: `testEmail()` mints `qa+...@test.local`; the signUpWithDeck→welcome→deck sequence documents the real provisioning path the harness replays over HTTP.
- `/debug` per-card state table + `R0·n2t` state codes (Phase 14): the harness's assertion surface (D-06).
- `STUDY_COOLDOWN_MINUTES` env (Phase 14): exists, but D-03 prefers an instant time-shift over real short waits.

### Established Patterns
- QA affordances are **env/secret-gated and prod-absent** (QAOB-04, `DEBUG_CHEAT_SECRET`, QA-mode cookie + `readQaAuth()`). The new time-shift (D-05) must follow this exact discipline and be added to the prod-parity gating test.
- DB workflow: Drizzle **`db:push`** (NOT `db:migrate`); `DATABASE_URL` from `process.env`. The harness writes real rows (test.local) to the configured DB.
- `scripts/*.mjs` Node-script convention already established (cleanup + habitat render scripts).

### Integration Points
- New: a QA-gated time-shift mechanism (D-03/D-05) the study/SRS + habitat-decay reads consult when QA-authed.
- New: `scripts/*.mjs` harness driving the study-grade + state-read endpoints over HTTP against `npm run dev`.

</code_context>

<specifics>
## Specific Ideas

- "Never the `/debug` virtual override" is emphatic (D-02/D-06): the whole point is to exercise + verify the REAL pipeline, because v2.1's study-loop bug survived 2 months behind green unit tests — only real-pipeline integration catches that class of gap.

</specifics>

<deferred>
## Deferred Ideas

- **Warm-prod target runs** — running the harness against `leocards.vercel.app`. Deferred: correctness uses local; prod perf is Phases 16–18.
- **Browser-level journey coverage** (Playwright clicking the real study UI) — deferred in favor of the headless HTTP harness (D-02); a thin browser smoke could be revisited later.
- **CI-pipeline automation of the harness** — explicitly out of scope for v3.0 (run-on-demand this milestone; CI wiring is a future candidate per v3.0 REQUIREMENTS Out of Scope).

None of the above block Phase 15.

</deferred>

---

*Phase: 15-core-journey-qa-harness*
*Context gathered: 2026-06-25*
