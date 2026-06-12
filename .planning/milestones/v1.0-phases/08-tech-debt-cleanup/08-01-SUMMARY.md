---
phase: 08-tech-debt-cleanup
plan: 01
subsystem: auth, api
tags: [better-auth, nativeLanguage, proxy, jsdoc]
one_liner: "Persist nativeLanguage at signup via Better Auth additionalFields, verify proxy.ts auth redirects active, fix misleading study/complete JSDoc"

requires:
  - phase: 01-foundation
    provides: Better Auth config, signup page, proxy.ts
  - phase: 07-backend-security-and-quality-fixes
    provides: Rate limiting, input validation
provides:
  - nativeLanguage persisted at signup (not defaulting to "en")
  - Accurate JSDoc on study/complete route
affects: []

tech-stack:
  added: []
  patterns:
    - Better Auth user.additionalFields for custom user columns

key-files:
  created: []
  modified:
    - src/lib/auth.ts
    - src/app/(auth)/signup/page.tsx
    - src/app/api/study/complete/route.ts

requirements-completed: DECK-06

decisions:
  - "Better Auth user.additionalFields with input: true allows custom fields to be passed during signup — no onboarding flow needed"
  - "proxy.ts IS the Next.js 16 middleware (renamed from middleware.ts) — confirmed active via build output showing 'Proxy (Middleware)'. No middleware.ts wrapper needed."

deviations:
  - from: "Create middleware.ts to wrap proxy.ts"
    to: "No code change needed — proxy.ts is already active middleware in Next.js 16"
    reason: "Next.js 16 renamed middleware.ts to proxy.ts. The audit incorrectly flagged it as dead code."
---

# Plan 08-01: Tech Debt Cleanup

## What Changed

### Task 1: Persist nativeLanguage at signup
- Added `user.additionalFields` config to Better Auth in `src/lib/auth.ts` declaring `nativeLanguage` as a string field with `defaultValue: "en"` and `input: true`
- Updated `src/app/(auth)/signup/page.tsx` to pass `nativeLanguage: values.nativeLanguage` to `authClient.signUp.email()`
- Removed inaccurate comments about "onboarding flow" and "does not accept arbitrary fields"

### Task 2: Fix JSDoc and verify proxy
- Updated JSDoc on `POST /api/study/complete` to accurately describe sequential non-transactional writes (Neon HTTP driver constraint)
- Verified `src/proxy.ts` is active middleware — Next.js 16 uses `proxy.ts` directly (build output confirms "Proxy (Middleware)")

## Self-Check: PASSED

All acceptance criteria verified:
- `additionalFields` present in auth.ts
- `nativeLanguage: values.nativeLanguage` passed in signup
- Old misleading comments removed
- JSDoc accurately describes sequential writes
- proxy.ts confirmed active
