---
status: partial
phase: 15-core-journey-qa-harness
source: [15-VERIFICATION.md]
started: 2026-06-25T10:27:31Z
updated: 2026-06-25T10:27:31Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Full harness green run (QAJ-01..05 + cleanup)
command: |
  # Terminal 1 — dev server booted with the 1-minute cooldown regime:
  STUDY_COOLDOWN_MINUTES=1 npm run dev
  # Terminal 2 — run the harness against live Neon + the QA secret:
  DATABASE_URL="<neon-connection-string>" DEBUG_CHEAT_SECRET="<secret>" npm run qa:run
expected: All six steps (QAJ-01, QAJ-02, QAJ-03-A, QAJ-03-B, QAJ-04, QAJ-05, CLEANUP) print PASS; final line "ALL JOURNEYS PASSED — harness complete, zero residue."; process exits 0.
why_human: Requires live Neon DB, a Next.js dev server booted with STUDY_COOLDOWN_MINUTES=1 (module-scope env, set at boot), and a valid DEBUG_CHEAT_SECRET — cannot be driven headlessly.
result: [pending]

### 2. Prod-parity e2e — time-shift returns 404 when secret unset
command: |
  # Boot the dev server WITHOUT the secret, then run the parity spec:
  DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts
expected: Test passes; all three 404 assertions fire — /api/debug/state, /api/debug/cheat, and /api/debug/time-shift all return 404 when the feature flag is absent (D-05 prod-parity proof). (If the server has the secret set, the endpoint-404 assertions self-skip; the DOM badge-absence assertions still run.)
why_human: Playwright e2e needs a running browser + dev server booted with DEBUG_CHEAT_SECRET=""; cannot be auto-executed in headless static analysis.
result: [pending]

### 3. Post-run residual check (QAJ-06 zero-residue proof)
command: |
  # Immediately after qa:run completes (pass or fail):
  DATABASE_URL="<neon-connection-string>" npm run qa:cleanup
expected: Output reports 0 user(s) deleted — confirming the finally-block cleanup in qa-run.mjs already reaped every @test.local test user, leaving zero residue.
why_human: Requires a live Neon DB query against the users table.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
