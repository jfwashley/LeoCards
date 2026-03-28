---
status: partial
phase: 01-foundation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md
started: 2026-03-28T12:00:00Z
updated: 2026-03-28T23:05:00Z
---

## Current Test

[testing paused — 9 blocked items outstanding (require build fix)]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Run `npm install && npm run build` from scratch. Server boots without errors. Visiting http://localhost:3000 redirects to /login.
result: issue
reported: "npm run build fails with exit code 1. /login page uses useSearchParams() without Suspense boundary causing prerender error. Also: Better Auth base URL WARN spam during page collection (9+ warnings)."
severity: blocker

### 2. Signup Flow
expected: Navigate to /signup. Fill in name, email, password. Submit. User is created and redirected to /dashboard with personalized greeting "Your habitat is being built, [name]."
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 3. Login Flow
expected: Navigate to /login. Enter credentials from signup. Submit. Redirected to /dashboard. Session persists across browser refresh.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 4. Logout Flow
expected: On /dashboard, click logout button. Redirected to /login. Visiting /dashboard without session redirects back to /login with callbackUrl.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 5. Forgot Password Flow
expected: On /login, click forgot password link. Enter email. See "sent" confirmation message. Check email for reset link from Resend.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 6. Reset Password Flow
expected: Click reset link from email. Lands on /reset-password with token. Enter new password. Submit. Can now login with new password.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 7. Auth Form Validation (Frontend)
expected: Submit login/signup forms with empty fields. Inline errors appear below each invalid field (red text, red border). Errors only show after first submit attempt, not on initial blur.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 8. Auth Layout Branding (Frontend)
expected: All auth pages (/login, /signup, /forgot-password, /reset-password) show tiger emoji, "TioCards" wordmark, and tagline. Card layout is consistent: max-w-sm, rounded-xl, shadow-sm. Warm orange/amber theme visible in primary buttons.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 9. Route Protection (Backend)
expected: Unauthenticated user visiting /dashboard is redirected to /login?callbackUrl=/dashboard. Authenticated user visiting /login or /signup is redirected to /dashboard. Root / redirects to /login.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 10. Auth API Endpoints (Backend)
expected: /api/auth/sign-up, /api/auth/sign-in, /api/auth/sign-out, /api/auth/session, /api/auth/request-password-reset all respond (not 404). Catch-all route at /api/auth/[...all] handles GET and POST.
result: blocked
blocked_by: server
reason: "Build fails — cannot start app (see Test 1)"

### 11. Database Schema (Backend)
expected: Run `npx drizzle-kit push` or inspect schema.ts. All 9 tables present: user, session, account, verification (auth) + decks, cards, recall_events, milestones_seen, habitat_metadata (app). All ID columns use branded types.
result: pass

### 12. Environment Validation (Architecture)
expected: Remove or blank out DATABASE_URL from .env.local. Start the app. Zod validation in env.ts fires and the app fails loudly at startup with a clear error — not a silent runtime crash later. Side-effect import in layout.tsx ensures this runs before any route.
result: pass

### 13. TypeScript Strict Mode (Architecture)
expected: Run `npx tsc --noEmit`. Zero type errors. tsconfig.json has strict: true and noUncheckedIndexedAccess: true. No @ts-ignore or @ts-expect-error escape hatches in foundation code.
result: issue
reported: "npx tsc --noEmit reports 12 type errors. All in src/lib/study-engine.test.ts — branded CardId type mismatches. Errors originate from Phase 3 code, not foundation, but tsc fails project-wide. strict: true and noUncheckedIndexedAccess: true are correctly set. No @ts-ignore/@ts-expect-error escape hatches found."
severity: major

### 14. Biome Lint and Format (Architecture)
expected: Run `npx biome ci .` (or scoped to src/). Code passes lint and format checks. CSS files excluded (Tailwind 4 directives). Known pre-existing noNonNullAssertion warnings in drizzle.config.ts and db/index.ts are documented.
result: issue
reported: "npx biome ci src/ reports 102 errors and 12 warnings across 75 files. Errors span all phases (import ordering, lint violations). Also: nested biome.json in .claude/worktrees/ causes config conflict when running from project root."
severity: major

### 15. Vitest Tests Pass (Architecture)
expected: Run `npm test` or `npx vitest run`. All tests pass (at minimum: env validation tests from env.test.ts verifying that missing vars throw).
result: pass

### 16. CI Pipeline (DevOps)
expected: .github/workflows/ci.yml exists with PR gate jobs: tsc, biome ci, next build. All 4 secrets configured: DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, RESEND_API_KEY. Vitest runs as non-blocking job.
result: issue
reported: "CI pipeline exists with correct structure (tsc + biome ci + build gate, vitest non-blocking). All 4 original secrets present. However: CI runs tsc --noEmit which currently fails (12 errors), and biome ci . which also fails (102 errors). CI would not pass on any PR right now. Also missing DEEPL_API_KEY secret which env.ts now validates."
severity: major

### 17. Project Dependencies (DevOps)
expected: package.json has all required scripts: typecheck, lint, format, test, db:generate, db:push, db:studio (or similar). No unused or phantom dependencies. `npm install` completes without warnings about peer dep conflicts.
result: issue
reported: "Scripts present: typecheck, lint, format, test, db:generate, db:migrate, db:push — good coverage. npm install reports 7 vulnerabilities (5 moderate, 2 high). No db:studio script."
severity: minor

### 18. .env.example Documentation (DevOps)
expected: .env.example file exists listing all 4 required env vars (DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, RESEND_API_KEY) with placeholder values. A new developer can copy this to .env.local and know what to fill in.
result: issue
reported: ".env.example lists 4 vars but env.ts now validates 5 — DEEPL_API_KEY is required in src/env.ts but missing from .env.example. A new developer copying .env.example would get a Zod validation crash at startup."
severity: major

## Summary

total: 18
passed: 3
issues: 6
pending: 0
skipped: 0
blocked: 9

## Gaps

- truth: "npm run build completes successfully with exit code 0"
  status: failed
  reason: "User reported: npm run build fails with exit code 1. /login page uses useSearchParams() without Suspense boundary causing prerender error. Also: Better Auth base URL WARN spam during page collection (9+ warnings)."
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "npx tsc --noEmit passes with zero type errors"
  status: failed
  reason: "12 type errors in src/lib/study-engine.test.ts — branded CardId type mismatches from Phase 3 code"
  severity: major
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Biome lint and format checks pass"
  status: failed
  reason: "102 errors and 12 warnings across 75 files. Import ordering violations and lint issues spanning all phases."
  severity: major
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "CI pipeline would pass on a PR"
  status: failed
  reason: "CI runs tsc and biome ci which both currently fail. Also missing DEEPL_API_KEY secret."
  severity: major
  test: 16
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "npm install completes cleanly"
  status: failed
  reason: "7 vulnerabilities (5 moderate, 2 high)"
  severity: minor
  test: 17
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: ".env.example documents all required env vars"
  status: failed
  reason: "DEEPL_API_KEY required by env.ts but missing from .env.example. New developer would get Zod crash."
  severity: major
  test: 18
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
