---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `pnpm vitest run` |
| **Full suite command** | `pnpm vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run`
- **After every plan wave:** Run `pnpm vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-typecheck | 01 | 1 | AUTH-* | type | `pnpm tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-lint | 01 | 1 | AUTH-* | lint | `pnpm biome ci .` | ❌ W0 | ⬜ pending |
| 1-01-build | 01 | 1 | AUTH-* | build | `pnpm next build` | ❌ W0 | ⬜ pending |
| 1-01-env | 01 | 1 | AUTH-* | unit | `pnpm vitest run src/env` | ❌ W0 | ⬜ pending |
| 1-02-session | 02 | 2 | AUTH-02 | integration | `pnpm vitest run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-02-password-reset | 02 | 2 | AUTH-04 | integration | `pnpm vitest run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-03-schema | 03 | 3 | AUTH-01 | type | `pnpm tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config with path aliases matching tsconfig
- [ ] `src/env.test.ts` — Unit test: env schema throws on missing required vars; passes with all present
- [ ] `src/lib/auth.test.ts` — Integration test stubs for session persistence (AUTH-02) and password reset token generation (AUTH-04)

*Wave 0 installs Vitest and creates test stubs before auth implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Password reset email received in inbox | AUTH-04 | Requires live email delivery (Resend) | Sign up with real email, trigger reset, check inbox for link within 60s |
| Session persists across browser close | AUTH-02 | Browser lifecycle not testable in Vitest | Log in, close browser fully, reopen, navigate to /dashboard — must still be authenticated |
| Redirect to /dashboard after signup | AUTH-01 | End-to-end navigation requires browser | Sign up with new email/password — must land on /dashboard with placeholder text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
