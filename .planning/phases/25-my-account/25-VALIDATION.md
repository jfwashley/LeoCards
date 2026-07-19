---
phase: 25
slug: my-account
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-19
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (unit/component, jsdom + @testing-library/react via per-file `// @vitest-environment jsdom` pragma) + Playwright (e2e, web/mobile projects) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` (no changes this phase) |
| **Quick run command** | `npx vitest run <touched test files>` |
| **Full suite command** | `npx vitest run` (~2079 tests) |
| **Estimated runtime** | quick ~5–20 s; full ~90–150 s; e2e specs ~30–120 s each |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <owning task's test file>` (unit/component tasks) or the task's `<automated>` command (config/e2e tasks).
- **After every plan wave:** Full `npx tsc --noEmit` + full `npx vitest run`; from Wave 3 onward also the relevant Playwright specs (they require /account live).
- **Before `/gsd:verify-work`:** Full `npx vitest run` + `npx playwright test e2e/25-my-account.spec.ts e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` all green (known parallel-load flakes: `cooldown-config.test.ts`, `bw-atoms.test.tsx` — isolate before treating a 5s-timeout as a regression). Run FULL tsc AFTER the e2e wave (biome's no-`!` rule can push `box?.height`-style expressions into a `toBeGreaterThan` argument → tsc error; use `if (box === null) throw` narrowing).
- **biome:** always scoped to touched files (`npx biome ci <files…>`), never repo-wide (~429 pre-existing errors).
- **Max feedback latency:** 150 seconds (unit); e2e runs at wave-merge + phase gate only.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-T1 | 25-01 | 1 | ACC-02, ACC-05 | T-25-01-A/B/D/E/H/I/J | Email-change token (crypto.randomUUID, lowercased uniqueness, replace-not-additive, rate-limited); single cascade delete + signOut | unit | `npx vitest run src/lib/account-actions.test.ts` | created in-task | ⬜ |
| 25-01-T2 | 25-01 | 1 | ACC-02 | T-25-01-* | RSC-safe pending read; null on missing/expired/malformed | unit | `npx vitest run src/lib/account-queries.test.ts` | created in-task | ⬜ |
| 25-01-T3 | 25-01 | 1 | ACC-02 | T-25-01-B/C/E/F/G | Single-use token consume; expiry/deleted-user/email-race; hardcoded same-origin redirect (no open redirect) | unit | `npx vitest run src/app/api/account/verify-email/route.test.ts` | created in-task | ⬜ |
| 25-02-T1 | 25-02 | 1 | ACC-03, ACC-06 | T-25-02-B | AccountDirtyProvider stores ONLY a boolean (no typed password); keyframes + reduced-motion overrides | config/context (behaviorally exercised by 25-02-T2) | `npx tsc --noEmit && npx biome ci src/components/account-dirty-context.tsx src/app/globals.css` | created in-task | ⬜ |
| 25-02-T2 | 25-02 | 1 | ACC-03 | T-25-02-A/C/D | changePassword({revokeOtherSessions:true}); INVALID_PASSWORD→inline copy by .code; inline (never toast) errors | unit (rendered) | `npx vitest run src/components/change-password-card.test.tsx` | created in-task | ⬜ |
| 25-03-T1 | 25-03 | 2 | ACC-01, ACC-02 | T-25-03-A/B/C/D | updateUser({name}) alone; requestEmailChange for email; honest email-taken; server-driven pending banner; A5 fade-suppression | unit (rendered) | `npx vitest run src/components/account-details-card.test.tsx` | created in-task | ⬜ |
| 25-03-T2 | 25-03 | 2 | ACC-04 | (V3 Session) | signOut→/login; "Sign out" accessible name preserved | unit (rendered) | `npx vitest run src/components/account-logout-section.test.tsx` | created in-task | ⬜ |
| 25-04-T1 | 25-04 | 3 | ACC-05 | T-25-04-A/D | Two-step confirm, no password/typed gate; deleteAccount→/login | unit (rendered) | `npx vitest run src/components/delete-account-row.test.tsx` | created in-task | ⬜ |
| 25-04-T2 | 25-04 | 3 | ACC-06 | T-25-04-C | Client back button; dirty guard reads only the boolean; dialog never echoes typed text (e2e-covered in 25-05-T3) | config/glue (behaviorally e2e-covered) | `npx tsc --noEmit && npx biome ci src/components/daybreak/account-back.tsx` | created in-task | ⬜ |
| 25-04-T3 | 25-04 | 3 | ACC-01, ACC-06 | T-25-04-B/E | Session-gated RSC; allow-listed ?verified; server-computed props; stacked D-03 order (e2e-covered in 25-05-T3) | config/glue (no page-unit precedent — behaviorally e2e-covered) | `npx tsc --noEmit && npx biome ci "src/app/(protected)/account/page.tsx"` | created in-task | ⬜ |
| 25-05-T1 | 25-05 | 4 | ACC-01 | T-25-05-C | RSC-safe nav glyph → /account (e2e-covered in 25-05-T2/T3) | config/glue (behaviorally e2e-covered) | `npx tsc --noEmit && npx biome ci src/components/account-nav-button.tsx` | created in-task | ⬜ |
| 25-05-T2 | 25-05 | 4 | ACC-01, ACC-04 | T-25-05-A | Header swap + logout-button deletion; retargeted sign-out blast radius (e2e/01:48,70,99 + e2e/10:46) | e2e | `npx playwright test e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` | modified/retarget | ⬜ |
| 25-05-T3 | 25-05 | 4 | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | T-25-05-B | Full real-pipeline flow; touch-targets ≥44 (null-guarded); pending-token seam (test-only, secret-gated) | e2e | `npx playwright test e2e/25-my-account.spec.ts` | created in-task | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Approach: co-located test scaffolds (no separate Wave-0 scaffold wave).** Per the LeoCards pattern, each production source file is created together with its own test file IN THE SAME TASK, so every test is GREEN at its owning task's wave gate — there are no cross-wave intentionally-RED scaffolds this phase. This satisfies Nyquist: every task carries an `<automated>` verify, and no source ships without a co-located automated check.

Test files created (by owning wave — must be green at that wave's gate):

- **Wave 1** — `src/lib/account-actions.test.ts`, `src/lib/account-queries.test.ts`, `src/app/api/account/verify-email/route.test.ts` (backend, fully mocked db/auth — green Wave 1), `src/components/change-password-card.test.tsx` (rendered — green Wave 1). Config/context: `account-dirty-context.tsx` + `globals.css` gated by tsc+biome, behaviorally exercised by the change-password rendered test.
- **Wave 2** — `src/components/account-details-card.test.tsx`, `src/components/account-logout-section.test.tsx` (rendered — green Wave 2).
- **Wave 3** — `src/components/delete-account-row.test.tsx` (rendered — green Wave 3). `account-back.tsx` + `account/page.tsx` gated by tsc+biome (no page-unit precedent in this codebase — page shells are e2e-only); their behavior is covered by e2e/25 in Wave 4.
- **Wave 4** — `e2e/25-my-account.spec.ts` (new, full flow) + the two retargeted specs `e2e/01-auth-signup-login.spec.ts` / `e2e/10-mobile-responsive.spec.ts`, all green against a freshly-restarted dev server. Playwright specs require /account live, so they gate at Wave 4 + the phase gate (not earlier waves).

**Config/glue tasks with tsc+biome as their immediate gate (25-02-T1, 25-04-T2, 25-04-T3, 25-05-T1)** each have downstream behavioral coverage in the e2e/25 spec (dirty-guard dialog, session-gated page, nav-glyph reach) — no source lands with zero automated coverage across the phase.

**Rendered-component tests are mandatory (Phase 22 CR-01 lesson)** for the inline-edit + mutation surfaces: `account-details-card.test.tsx`, `change-password-card.test.tsx`, and `delete-account-row.test.tsx` each type a CHANGED value into the real rendered input and assert the mocked mutation receives the NEW value (not a reducer/handler-only test that would stay green on a dead UI).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email-change verification link lands in a real inbox (Resend delivery) | ACC-02 | Requires a live inbox; e2e cannot receive email (RESEND_API_KEY optional, no-ops in dev/CI). The request→token→verify→apply LOGIC is unit-covered (route.test.ts) + the pending-banner state is e2e-covered; only the actual email DELIVERY is manual | Trigger an email change with a real address; confirm the email arrives; click the link; assert the Email row swaps + the pending state clears |
| Visual mock-fidelity of the Daybreak-styled /account on desktop + mobile | ACC-06 | No hi-fi mock exists — UI-SPEC fidelity is a human judgment (compose-from-system screen) | Compare the rendered page against 25-UI-SPEC.md contracts (tokens, spacing, copy, states) on desktop + a 375px mobile viewport |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (co-located; no cross-wave RED scaffolds)
- [x] No watch-mode flags
- [x] Feedback latency < 150s (unit); e2e at wave-merge/phase gate
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-populated 2026-07-19
