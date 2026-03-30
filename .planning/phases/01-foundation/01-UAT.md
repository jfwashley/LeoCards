---
status: partial
phase: 01-foundation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md
started: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:00:00Z
---

## Current Test

[testing paused — 8 pending items outstanding]

## Tests

### 1. Cold Start Smoke Test
expected: npm run build completes with exit 0. npm run dev starts the server. Visiting http://localhost:3000 redirects to /login.
result: pass

### 2. Signup Flow
expected: Navigate to /signup. Fill in name, email, password. Submit. User is created and redirected to /dashboard with personalized greeting.
result: pass

### 3. Login Flow
expected: Navigate to /login. Enter credentials from signup. Submit. Redirected to /dashboard. Session persists across browser refresh.
result: [pending]

### 4. Logout Flow
expected: On /dashboard, click logout button. Redirected to /login. Visiting /dashboard without session redirects back to /login with callbackUrl.
result: [pending]

### 5. Forgot Password Flow
expected: On /login, click forgot password link. Enter email. See "sent" confirmation message.
result: [pending]

### 6. Reset Password Flow
expected: Click reset link from email. Lands on /reset-password with token. Enter new password. Submit. Can now login with new password.
result: [pending]

### 7. Auth Form Validation (Frontend)
expected: Submit login/signup forms with empty fields. Inline errors appear below each invalid field (red text, red border). Errors only show after first submit attempt, not on initial blur.
result: [pending]

### 8. Auth Layout Branding (Frontend)
expected: All auth pages show tiger emoji, "LeoCards" wordmark, and tagline. Card layout is consistent: max-w-sm, rounded-xl, shadow-sm. Warm orange/amber theme visible in primary buttons.
result: [pending]

### 9. Route Protection (Backend)
expected: Unauthenticated user visiting /dashboard is redirected to /login?callbackUrl=/dashboard. Authenticated user visiting /login or /signup is redirected to /dashboard. Root / redirects to /login.
result: [pending]

### 10. Auth API Endpoints (Backend)
expected: /api/auth/sign-up, /api/auth/sign-in, /api/auth/sign-out, /api/auth/session all respond (not 404). Catch-all route at /api/auth/[...all] handles GET and POST.
result: [pending]

### 11. Database Schema (Backend)
expected: All 9 tables present in schema.ts: user, session, account, verification (auth) + decks, cards, recall_events, milestones_seen, habitat_metadata (app). All ID columns use branded types.
result: pass

### 12. Environment Validation (Architecture)
expected: env.ts uses createEnv with Zod validation for all 5 required vars (DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, NEXT_PUBLIC_APP_URL, DEEPL_API_KEY). Side-effect import in layout.tsx ensures validation runs before any route.
result: pass

### 13. TypeScript Strict Mode (Architecture)
expected: npx tsc --noEmit passes with zero errors. tsconfig.json has strict: true and noUncheckedIndexedAccess: true. No @ts-ignore or @ts-expect-error escape hatches.
result: pass

### 14. Biome Lint and Format (Architecture)
expected: npx biome ci src/ passes with zero errors and zero warnings. CSS files excluded. .gitattributes enforces LF line endings.
result: pass

### 15. Vitest Tests Pass (Architecture)
expected: npx vitest run passes all tests (1236 tests across 57 files).
result: pass

### 16. CI Pipeline (DevOps)
expected: ci.yml has Build before Type check. All 5 secrets (DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, RESEND_API_KEY, DEEPL_API_KEY) in Build env. Biome pinned to 2.4.8, scoped to src/. Vitest is continue-on-error.
result: pass

### 17. Project Dependencies (DevOps)
expected: package.json has scripts: typecheck, lint, format, test, db:generate, db:migrate, db:push. npm install completes. Remaining 4 moderate vulnerabilities are in drizzle-kit transitive deps (acceptable).
result: pass

### 18. .env.example Documentation (DevOps)
expected: .env.example lists all 5 required env vars (DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, NEXT_PUBLIC_APP_URL, DEEPL_API_KEY) with placeholder values.
result: pass

## Summary

total: 18
passed: 10
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

[none yet]
