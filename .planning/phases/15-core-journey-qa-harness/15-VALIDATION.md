---
phase: 15
slug: core-journey-qa-harness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-25
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `15-RESEARCH.md` § Validation Architecture. The journey scripts (`scripts/qa-*.mjs`)
> are real-pipeline integration tests run against a live `npm run dev`; Vitest covers the
> NEW server-side QA affordances (time-shift route + signing helpers).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.1 (server affordances) + Node `*.mjs` harness scripts (journeys) |
| **Config file** | `vitest.config.ts` (existing — `package.json` `"test": "vitest run"`) |
| **Quick run command** | `npx vitest run src/app/api/debug/` |
| **Full suite command** | `npx vitest run` |
| **Journey smoke command** | `node scripts/qa-run.mjs` (runs all 5 journeys against a running dev server) |
| **Estimated runtime** | Vitest ~30–60s; full journey suite ~1–3 min against local dev |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched dir>` (scoped) for server affordances
- **After every plan wave:** Run `npx vitest run` (full unit) + any completed journey scripts
- **Before `/gsd:verify-work`:** Full Vitest green AND all 5 journey scripts exit 0 (`node scripts/qa-run.mjs`)
- **Max feedback latency:** ~60s (Vitest); journeys are on-demand, not per-commit

---

## Per-Task Verification Map

> Task IDs resolve at planning (PLAN.md). Rows below are requirement-level; the planner maps each
> to concrete `{15}-NN-MM` task IDs. `❌ W0` = file created in Wave 0 (scaffold), green after its owning wave.

| Requirement | Wave | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|------|------------|-----------------|-----------|-------------------|-------------|--------|
| QAJ-01 learn-a-card (round 0→1, dir, cooldown) | journey | — | N/A | integration | `node scripts/qa-01-learn-card.mjs` | ❌ W0 | ⬜ pending |
| QAJ-02 full mastery 0→3 + wrong-answer paths | journey | — | N/A | integration | `node scripts/qa-02-mastery.mjs` | ❌ W0 | ⬜ pending |
| QAJ-03 resumable session manifest | journey | — | N/A | integration | `node scripts/qa-03-resume.mjs` | ❌ W0 | ⬜ pending |
| QAJ-04 habitat level 1→2 (+ higher) agreement | journey | — | N/A | integration | `node scripts/qa-04-habitat.mjs` | ❌ W0 | ⬜ pending |
| QAJ-05 decay/grace via time-shift + pause | journey | T-15 time-shift | decay only when QA-authed | integration | `node scripts/qa-05-decay.mjs` | ❌ W0 | ⬜ pending |
| QAJ-06 self-cleaning `*test.local` | journey | — | no residue in prod data | integration | `node scripts/cleanup-test-users.mjs '%@test.local'` | ✅ exists | ⬜ pending |
| D-05 time-shift route 404 when secret unset | prod-parity | T-15 EoP | feature absent w/o `DEBUG_CHEAT_SECRET` | e2e (extend QAOB-04) | `npx vitest run` / prod-parity e2e | ❌ W0 | ⬜ pending |
| D-05 `POST /api/debug/time-shift` route + signing | server | T-15 Spoof/Tamper | HMAC-SHA256, `offsetMs` range-validated | unit | `npx vitest run src/app/api/debug/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/qa-lib.mjs` — shared helpers (sign-in/cookie capture, `readState`, assert helpers)
- [ ] `scripts/qa-run.mjs` — orchestrator running all 5 journeys sequentially
- [ ] `scripts/qa-01-learn-card.mjs` … `scripts/qa-05-decay.mjs` — one per QAJ-01..05
- [ ] `src/app/api/debug/time-shift/route.ts` — new QA-gated time-shift endpoint (D-05)
- [ ] `src/lib/debug-cheat.ts` additions — `signTimeOffset` / `verifyTimeOffset` / `readQaTimeOffset`
- [ ] Vitest unit tests for the time-shift route (mirror `src/app/api/debug/state/route.test.ts`)
- [ ] Extend the existing QAOB-04 prod-parity test to cover time-shift 404 when `DEBUG_CHEAT_SECRET` unset
- [ ] `vitest.config.ts` — only if absent (assumed present)

*The six journey scripts are themselves the Wave 0 "tests" for QAJ-01..06; the time-shift route + signing helpers carry standalone Vitest coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cooldown "still cooling" state | QAJ-01/03 | `STUDY_COOLDOWN_MINUTES` is read at module-scope → needs a dev-server restart to take effect | Set `STUDY_COOLDOWN_MINUTES=1`, restart `npm run dev`, then run the journey script (documented in each script's preamble) |
| Running dev server prerequisite | QAJ-01..05 | Journey scripts drive live HTTP — require `npm run dev` up on :3000 with `DEBUG_CHEAT_SECRET` set | Scripts abort with a clear error if the server is down or the secret is unset |

*All assertions inside the journeys are automated; only the dev-server/env setup is a manual precondition.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (journey scripts + time-shift route/tests)
- [ ] No watch-mode flags (use `vitest run`, never `vitest` watch)
- [ ] Feedback latency < 60s (Vitest)
- [ ] `nyquist_compliant: true` set in frontmatter (flip after Wave 0 + journeys green)

**Approval:** pending
