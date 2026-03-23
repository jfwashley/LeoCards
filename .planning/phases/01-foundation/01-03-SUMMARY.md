---
phase: 01-foundation
plan: 03
subsystem: auth
tags: [better-auth, react-hook-form, zod, shadcn, next-js, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation plan 02
    provides: auth-client.ts with Better Auth client, auth.ts server instance, proxy.ts route protection
provides:
  - Login page with email/password form, inline errors, callbackUrl redirect support
  - Signup page with name/email/password form, inline errors, redirects to dashboard
  - Forgot-password page with email form and sent confirmation state
  - Reset-password page with token validation and new password form
  - Protected layout with server-side session validation via auth.api.getSession
  - Dashboard stub with personalized greeting and logout button
  - Auth layout with tiger emoji, TioCards wordmark, and tagline
affects: [phase-02-flashcards, phase-03-habitat, phase-04-study, phase-05-tiger, phase-06-milestones]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - react-hook-form + zod zodResolver for all auth forms with inline error display
    - useSearchParams wrapped in Suspense for client components (Next.js 16 requirement)
    - Server components calling auth.api.getSession with await headers()
    - Client-side logout via LogoutButton component (separate from server dashboard page)

key-files:
  created:
    - src/app/page.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/app/(protected)/layout.tsx
    - src/app/(protected)/dashboard/page.tsx
    - src/components/logout-button.tsx
  modified: []

key-decisions:
  - "useSearchParams in reset-password wrapped in Suspense boundary — required by Next.js 16 for pages that prerender"
  - "Better Auth client uses requestPasswordReset not forgetPassword — plan interface contract was inaccurate"
  - "LogoutButton extracted as separate client component to keep dashboard a server component"

patterns-established:
  - "Auth form pattern: react-hook-form + zodResolver, errors shown after first submit attempt (isSubmitted gate)"
  - "Error display: inline below field using text-sm text-destructive, border-destructive on input when error"
  - "Auth card layout: Card component with w-full max-w-sm rounded-xl shadow-sm p-6"
  - "Protected server components: await auth.api.getSession({ headers: await headers() })"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: 18min
completed: 2026-03-23
---

# Phase 1 Plan 3: Auth UI Pages Summary

**Five auth/dashboard pages with react-hook-form + Zod validation, Better Auth client integration, and warm tiger brand (orange/amber theme)**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-23T17:30:21Z
- **Completed:** 2026-03-23T17:48:XX Z
- **Tasks:** 3 of 3 complete (Task 3 checkpoint: human-verify — APPROVED)
- **Files modified:** 9

## Accomplishments
- All five auth/protected pages built with consistent card layout and brand personality
- Full auth journey wired: signup -> dashboard, login -> dashboard, logout -> login, forgot/reset password
- Inline form errors gated by first submit attempt (not on blur for first interaction)
- Dashboard personalized with user name from server-side session
- Protected layout validates session server-side before rendering children

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth layout, login page, and signup page** - `512deea` (feat)
2. **Task 2: Forgot-password, reset-password, dashboard stub, and logout** - `7a6d06f` (feat)

3. **Task 3: Visual and functional verification of the complete auth flow** - checkpoint:human-verify APPROVED

**Plan metadata:** TBD (docs commit after this update)

## Files Created/Modified
- `src/app/page.tsx` - Root redirect to /login
- `src/app/(auth)/layout.tsx` - Shared auth layout with tiger emoji, TioCards wordmark, tagline
- `src/app/(auth)/login/page.tsx` - Login form with callbackUrl support and inline auth error
- `src/app/(auth)/signup/page.tsx` - Signup form with name/email/password fields
- `src/app/(auth)/forgot-password/page.tsx` - Forgot password with sent confirmation state
- `src/app/(auth)/reset-password/page.tsx` - Reset password with Suspense+useSearchParams, token validation
- `src/app/(protected)/layout.tsx` - Server component session guard, redirects to /login if unauthenticated
- `src/app/(protected)/dashboard/page.tsx` - Dashboard stub with personalized greeting
- `src/components/logout-button.tsx` - Client component for sign-out action

## Decisions Made
- Used `authClient.requestPasswordReset()` instead of `authClient.forgetPassword()` — the plan's interface contract was inaccurate about the Better Auth client method name
- Wrapped reset-password page internals in Suspense boundary — `useSearchParams` requires Suspense in Next.js 16
- Extracted `LogoutButton` as a separate client component (`src/components/logout-button.tsx`) to keep the dashboard page as a server component
- Used `window.location.origin` for the redirectTo URL in requestPasswordReset to make it absolute

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan interface contract specified incorrect Better Auth method name**
- **Found during:** Task 2 (forgot-password page)
- **Issue:** Plan interface contract stated `authClient.forgetPassword()` but Better Auth client exposes `authClient.requestPasswordReset()` (maps from `/request-password-reset` route via camelCase transform)
- **Fix:** Used `authClient.requestPasswordReset({ email, redirectTo })` with absolute URL; added comment in file noting the mapping
- **Files modified:** src/app/(auth)/forgot-password/page.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 7a6d06f (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added Suspense boundary for useSearchParams in reset-password page**
- **Found during:** Task 2 (reset-password page)
- **Issue:** Next.js 16 requires components using `useSearchParams` to be wrapped in Suspense when the page may be prerendered
- **Fix:** Extracted form logic into `ResetPasswordForm` component, wrapped in `<Suspense>` in the page component
- **Files modified:** src/app/(auth)/reset-password/page.tsx
- **Verification:** `npx tsc --noEmit` passes; page renders correctly
- **Committed in:** 7a6d06f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 API name bug, 1 missing Suspense boundary)
**Impact on plan:** Both fixes necessary for correct/working implementation. No scope creep.

## Issues Encountered
- None beyond the two auto-fixed deviations above.

## Known Stubs
- `src/app/(protected)/dashboard/page.tsx` — Entire dashboard is a stub with placeholder text "Your habitat is being built, [name]." This is intentional per plan spec; Phase 2+ will replace with actual habitat content.

## Next Phase Readiness
- Full auth flow ready: AUTH-01 through AUTH-04 user journeys implemented
- Protected layout guard in place for all routes under `(protected)` group
- Dashboard stub ready for Phase 2 habitat content
- Human verification checkpoint approved — plan fully complete
- Phase 01-foundation fully complete: all 3 plans done

---
*Phase: 01-foundation*
*Completed: 2026-03-23*
