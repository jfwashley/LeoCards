---
phase: 19-daybreak-foundation-onboarding-auth
verified: 2026-06-20T14:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Visually compare Login, Signup, Forgot, Reset, Welcome (all 3 steps + creating/error states), empty-deck, and no-search-results against the hi-fi artboard at design/handoff-daybreak/LeoCards Daybreak Onboarding & Auth.html"
    expected: "Every screen and state matches the Daybreak mocks pixel-faithfully (correct colors, radii, typography, ghost-peek stack, sun disc, hills, Leo placement, step-dot shapes, error banner styling)"
    why_human: "Visual fidelity cannot be verified by grep or code inspection — requires side-by-side render comparison; no screenshot diffing is wired in this pipeline"
  - test: "On Login, attempt navigation to /login?callbackUrl=https://evil.com, sign in successfully, and confirm the browser lands on /dashboard (not the external URL)"
    expected: "Browser redirects to /dashboard; the open-redirect guard (CR-01) blocks the external URL"
    why_human: "The safeCallback guard is present in code but its runtime behaviour on a real sign-in with a real Next.js router.push needs human end-to-end confirmation"
  - test: "Navigate to /welcome in a browser as a logged-out user and confirm redirect to /login; navigate to /welcome as a user who already has a deck and confirm redirect to /dashboard"
    expected: "Both server-side guards (session guard + has-decks guard) fire correctly in the browser"
    why_human: "RSC redirect logic is verified by code inspection and the e2e harness asserts the 0-deck redirect, but the already-has-decks back-nav guard is not covered by the automated e2e suite"
---

# Phase 19: Daybreak Foundation + Onboarding & Auth — Verification Report

**Phase Goal:** The Daybreak design system is live app-wide and every auth/onboarding screen — Login, Signup, Forgot Password, Reset Password, First-Visit Welcome, and empty states — matches the hi-fi mocks; building on the spike already in the tree.
**Verified:** 2026-06-20T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Daybreak tokens (cream/amber palette, Baloo 2 + Figtree fonts, type scale, spacing, radii, shadows) applied app-wide; Login matches the spike mock | VERIFIED | `globals.css :root` defines `--background:#fff6e9`, `--primary:#f28a1f`, `--db-*` extras (field-bg, btn-shadow, pill-bg, card-shadow, radii). `layout.tsx` loads `Baloo_2` + `Figtree` via `next/font/google` and applies both variables + `font-sans` on `<html>`. Login uses `AuthCard` + `DaybreakAuthScene variant="sunrise"` + `TField`/`TBtn` — no shadcn `Input`/`Button` remain. |
| 2 | Shared Daybreak atoms (LionFace, TField, TBtn, Pill, Card, GhostPeek) exist in `src/components/daybreak/` and are reused across auth screens | VERIFIED | `t-field.tsx` — `React.forwardRef<HTMLInputElement>`, `displayName="TField"`, error border + helper, hint, ref forwarding confirmed in test. `t-btn.tsx` — `Loader2 animate-spin` spinner when `isPending`, disabled state. `pill.tsx` — `--db-pill-bg`/`--db-pill-text` inline vars. `card.tsx` — 22px radius, `#F0E3CF` border, `db-card-shadow`. `GhostPeek` is an internal sub-component of `auth-card.tsx` used in `AuthCard`. All four auth pages import `TField`/`TBtn`; `LionFace` is used in card-list.tsx + welcome steps + habitat-teaser. |
| 3 | Signup matches Daybreak hi-fi incl. states: default, per-field validation (red border + helper after submit, not toasts), email-already-exists, submitting spinner | VERIFIED | `signup/page.tsx`: Name/Email/Password fields only (zero occurrences of `nativeLanguage`). Validation uses `isSubmitted ? errors.X?.message : undefined` pattern (post-submit only). `emailError` path sets "An account with this email already exists." `TBtn isPending={isPending}` provides spinner + form disabled. Signup-payload unit test (`src/app/(auth)/__tests__/signup-payload.test.tsx`) confirms payload `{ name, email, password }` only, no `nativeLanguage`, and `router.push("/welcome")` on success. |
| 4 | Forgot shows privacy-safe "If an account exists…" confirmation; Reset handles expired-link dead-end routing back to Forgot; both match Daybreak hi-fi | VERIFIED | `forgot-password/page.tsx` line 74: `"If an account exists, we've sent a reset link to…"` — privacy-safe phrasing confirmed. `reset-password/page.tsx`: `ExpiredState` component renders "Request a new link" `TBtn` calling `router.push("/forgot-password")`. Both branches (missing token + `tokenError`) route back to Forgot. `Suspense` boundary wraps `useSearchParams` consumer. `DaybreakAuthScene variant="daylight"` (Forgot) and `variant="dusk"` (Reset) confirmed. e2e spec `03-forgot-reset-password.spec.ts` asserts `/If an account exists/` and the expired dead-end. |
| 5 | First-visit welcome completes all 3 steps (Meet Leo, promise + animated mini-habitat, choose native + target via dropdowns), creates first deck, routes to Dashboard (incl. creating/error states); empty-deck and no-search-results empty states match Daybreak | VERIFIED | `/welcome` route RSC: `auth.api.getSession` + `redirect("/login")` when unauthenticated; `getUserDecks` + `redirect("/dashboard")` when user has decks. `WelcomePage` state machine: steps 1→2→3; Skip on step 1 or 2 jumps to step 3. `WelcomeStepChoose`: `z.enum(["en","fr","es"])` validates both codes; `authClient.updateUser({ nativeLanguage })` before `createDeck(targetLang)` before `router.push("/dashboard")`; on catch, `setCreateError` without resetting picks. `HabitatTeaser`: static scene always renders; `motion.div` glow only when `!reduced`. Dashboard: `decks.length === 0` → `redirect("/welcome")`. `card-list.tsx`: "Your deck is empty" + `LionFace` medallion + "Browse words" link + "+ Add a card" link. "No words match" + 96px medallion + "Clear search" button calling `setQuery("")`. |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/daybreak/t-field.tsx` | Labeled input primitive (forwardRef) | VERIFIED | `React.forwardRef<HTMLInputElement>`, `displayName="TField"`, error/hint/ref/spread all implemented |
| `src/components/daybreak/t-btn.tsx` | Primary button with spinner/disabled | VERIFIED | `Loader2 animate-spin` + `disabled={isPending \|\| disabled}`, `lucide-react` import confirmed |
| `src/components/daybreak/pill.tsx` | Pill/chip primitive | VERIFIED | `var(--db-pill-bg)` + `var(--db-pill-text)` present |
| `src/components/daybreak/card.tsx` | Card surface primitive | VERIFIED | `borderRadius:22`, `#F0E3CF` border, `0 12px 30px rgba(160,110,40,0.16)` shadow |
| `src/hooks/use-prefers-reduced-motion.ts` | SSR-safe reduced-motion hook | VERIFIED | `useState(false)`, `window.matchMedia` guard, `addEventListener?./removeEventListener?.` pattern |
| `src/components/daybreak/__tests__/t-field.test.tsx` | Unit tests for TField | VERIFIED | `// @vitest-environment jsdom` docblock; tests label, error class, ref forwarding (asserts `ref.current instanceof HTMLInputElement`), hint exclusion, disabled spread |
| `src/components/daybreak/__tests__/t-btn.test.tsx` | Unit tests for TBtn | VERIFIED | `// @vitest-environment jsdom`; asserts spinner SVG + `disabled` attribute when `isPending`; children absent when pending |
| `src/app/(auth)/login/page.tsx` | Daybreak Login via TField/TBtn | VERIFIED | Imports `TField`/`TBtn`; `DaybreakAuthScene variant="sunrise"`; `safeCallback` open-redirect guard (CR-01 fix); `try/finally` (WR-01 fix) |
| `src/app/(auth)/signup/page.tsx` | Daybreak Signup, no language field, → /welcome | VERIFIED | Zero `nativeLanguage` occurrences; `router.push("/welcome")`; `TField`/`TBtn`; `emailError` "already exists" path; `try/finally` |
| `src/app/(auth)/__tests__/signup-payload.test.tsx` | Unit smoke: payload shape + /welcome redirect | VERIFIED | File exists; asserts `signUp.email` called with `{ name, email, password }` (no `nativeLanguage`) and `router.push("/welcome")` |
| `src/app/(auth)/forgot-password/page.tsx` | Daybreak Forgot with privacy-safe confirmation | VERIFIED | "If an account exists…" copy; `variant="daylight"`; `requestPasswordReset` with `redirectTo` preserved; `try/finally` |
| `src/app/(auth)/reset-password/page.tsx` | Daybreak Reset with expired-link dead-end | VERIFIED | `ExpiredState` component; "Request a new link" routes to `/forgot-password`; `Suspense` boundary; `resetSchema .refine`; `try/finally` |
| `e2e/03-forgot-reset-password.spec.ts` | Playwright coverage for ONB-03 + ONB-04 | VERIFIED | Asserts `/If an account exists/`, expired dead-end copy, "Request a new link" navigates to `/forgot-password`, password mismatch `/do not match/` |
| `src/app/(auth)/welcome/page.tsx` | RSC route shell at /welcome with guards | VERIFIED | `auth.api.getSession` + `redirect("/login")` + `getUserDecks` + `redirect("/dashboard")` when `decks.length > 0` |
| `src/components/welcome/welcome-page.tsx` | 3-step controller | VERIFIED | `useState<1\|2\|3>(1)`; `onSkip={() => setStep(3)}` on both steps 1 and 2; renders correct step component per state |
| `src/components/welcome/welcome-step-meet.tsx` | Step 1: Meet Leo | VERIFIED | `LionFace size={92}`, "Meet Leo" heading, `TBtn onClick={onNext}`, Skip button wired to `onSkip` |
| `src/components/welcome/welcome-step-promise.tsx` | Step 2: Promise + HabitatTeaser | VERIFIED | `<HabitatTeaser />` inside 210px container, "Learn words, grow your world" heading, `TBtn onClick={onNext}`, Skip button |
| `src/components/welcome/welcome-step-choose.tsx` | Step 3: Language pickers + createDeck | VERIFIED | `z.enum` validation, `updateUser` before `createDeck` before `router.push("/dashboard")`, `targetOptions = ALL_LANGUAGES.filter(l => l.code !== nativeLang)`, error preserves picks |
| `src/components/welcome/habitat-teaser.tsx` | Reduced-motion-safe mini-habitat teaser | VERIFIED | Static `TeaserScene` always renders; `usePrefersReducedMotion()` gates `motion.div` glow; `aria-label="Leo's growing habitat preview"` |
| `src/app/(protected)/dashboard/page.tsx` | 0-deck → redirect to /welcome | VERIFIED | Line 52-53: `if (decks.length === 0) { redirect("/welcome"); }` |
| `src/components/first-visit-picker.tsx` | Deleted | VERIFIED | File absent; `grep -rn "FirstVisitPicker" src/` returns no matches |
| `src/components/card-list.tsx` | Daybreak empty-deck + no-search-results | VERIFIED | "Your deck is empty" + `LionFace` 110px medallion + "Browse words" link + "+ Add a card" link; "No words match" + 96px medallion + "Clear search" button calling `setQuery("")`; `React.memo` preserved; `CardEditDialog` + `QaStateBadge` untouched |
| `e2e/helpers.ts` | `completeWelcomeFlow` + `signUpFreshUser` → /welcome | VERIFIED | `completeWelcomeFlow` exported; `signUpFreshUser` awaits `waitForURL(/\/welcome/)` |
| `e2e/01-auth-signup-login.spec.ts` | Asserts no native-language field on signup | VERIFIED | `expect(page.getByLabel("Native language")).not.toBeVisible()` |
| `e2e/02-first-visit-deck-creation.spec.ts` | Welcome flow + ONB-06 empty states e2e | VERIFIED | Asserts `/welcome` landing, `completeWelcomeFlow`, "Your deck is empty" + "Browse words" + "Add a card" after deck creation, "No words match" + "Clear search" clears query |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `habitat-video.tsx` | `use-prefers-reduced-motion.ts` | `import { usePrefersReducedMotion }` | VERIFIED | Line 30 confirmed; no inline hook definition remains |
| `t-field.tsx` | `react-hook-form register()` | `React.forwardRef` ref spread | VERIFIED | `forwardRef` and `displayName` both present; ref captured as `HTMLInputElement` in test |
| `login/page.tsx` | `t-field.tsx` | `import { TField }` | VERIFIED | Both `TField` and `TBtn` imported; no shadcn `Input`/`Button`/`Label` remain |
| `signup/page.tsx` | `authClient.signUp.email` | name/email/password only | VERIFIED | Zero `nativeLanguage` in file; unit smoke confirms payload shape |
| `signup/page.tsx` | `/welcome` | `router.push("/welcome")` | VERIFIED | Line 52 confirmed |
| `forgot-password/page.tsx` | `authClient.requestPasswordReset` | `redirectTo /reset-password` | VERIFIED | Preserved unchanged |
| `reset-password/page.tsx` | `authClient.resetPassword` | `newPassword + token` | VERIFIED | `resetPassword({ newPassword: values.password, token })` confirmed |
| `dashboard/page.tsx` | `/welcome` | `redirect()` when `decks.length === 0` | VERIFIED | Line 52-53 confirmed |
| `welcome-step-choose.tsx` | `authClient.updateUser` | `nativeLanguage` before `createDeck` | VERIFIED | Source order: `updateUser` (line 58) → `createDeck` (line 60) → `router.push` (line 62) |
| `welcome-step-choose.tsx` | `createDeck` server action | after `updateUser` | VERIFIED | Confirmed call sequence above |
| `habitat-teaser.tsx` | `use-prefers-reduced-motion.ts` | `import usePrefersReducedMotion` | VERIFIED | Line 6 import; `reduced` gates `motion.div` at line 125 |
| `card-list.tsx` | `lion-face.tsx` | `import LionFace` | VERIFIED | Line 8 import; used in both empty-deck (line 80) and no-results (line 152) medallions |
| `card-list.tsx` | Clear search action | `onClick` resets `setQuery("")` | VERIFIED | Line 169: `onClick={() => setQuery("")}` on "Clear search" button |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `welcome-step-choose.tsx` | `nativeLang` / `targetLang` | Local `useState`; user selects from filtered dropdown | Yes — user-driven selections flow into `authClient.updateUser` + `createDeck` | FLOWING |
| `welcome/page.tsx` (RSC) | `decks` | `getUserDecks(session.user.id)` — live DB query | Yes — Drizzle ORM query; redirect guard depends on real count | FLOWING |
| `card-list.tsx` | `cards` / `filtered` / `query` | Props from `DeckView` (parent) + local `useState` for query | `cards` comes from `getDeckCards()` DB query in `DashboardPage` | FLOWING |
| `dashboard/page.tsx` | `decks` | `getUserDecks(session.user.id)` DB query | Yes — real DB; `decks.length === 0` triggers real redirect | FLOWING |

---

## Behavioral Spot-Checks

Step 7b skipped — this is a UI-heavy phase (Next.js app router) with no standalone runnable CLI or API endpoint that can be probed without a running server. The e2e suite (30/30 passing per orchestrator context) provides behavioral coverage.

---

## Probe Execution

Step 7c skipped — no `scripts/*/tests/probe-*.sh` files declared or found for this phase. Phase does not match migration/tooling type.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DSY-01 | 19-01 | Daybreak tokens + fonts applied app-wide | SATISFIED | `globals.css` cream/amber tokens; `layout.tsx` Baloo 2 + Figtree confirmed |
| DSY-02 | 19-01 | Shared Daybreak atoms (LionFace, TField, TBtn, Pill, Card, GhostPeek) in `src/components/daybreak/` | SATISFIED | All 6 atoms exist and are substantive; reused across screens |
| DSY-03 | 19-01, 19-02, 19-03, 19-04, 19-05 | Mobile-first, ≥44px touch, inline per-field validation, single full-width primary with spinner | SATISFIED | `isSubmitted ? errors.X?.message : undefined` pattern on all forms; `TBtn isPending` spinner on all submit actions; `TField h-12` = 48px > 44px minimum |
| ONB-01 | 19-02 | Login redesigned to Daybreak | SATISFIED | Login uses `TField`/`TBtn`, sunrise `AuthCard`; no shadcn primitives remain |
| ONB-02 | 19-02 | Signup Daybreak, Name/Email/Password only, all states | SATISFIED | No `nativeLanguage`; all 4 states (default/validation/taken/submitting) implemented; unit smoke passes |
| ONB-03 | 19-03 | Forgot Password with privacy-safe sent confirmation | SATISFIED | "If an account exists…" copy verified in source and e2e |
| ONB-04 | 19-03 | Reset Password with expired-link dead-end → Forgot | SATISFIED | `ExpiredState` component + `router.push("/forgot-password")` + `Suspense` boundary verified |
| ONB-05 | 19-04 | First-visit welcome 3-step flow with creating/error states | SATISFIED | All 3 steps built; D-04 persistence (`updateUser` before `createDeck`); creating/error states in `WelcomeStepChoose`; e2e harness updated and green |
| ONB-06 | 19-05 | Empty-deck + no-search-results states match Daybreak | SATISFIED | Both states in `card-list.tsx`; `LionFace` medallions; exact copy strings match e2e assertions |

All 9 requirement IDs (DSY-01/02/03, ONB-01 through ONB-06) are satisfied. No orphaned requirements found.

---

## Context Decisions Coverage (19-CONTEXT.md)

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01: Dedicated Daybreak primitives in `src/components/daybreak/` | HONORED | TField/TBtn/Pill/Card all built as standalone DOM elements (no shadcn Input/Button dependency) |
| D-02: Refactor Login spike onto primitives | HONORED | Login imports TField/TBtn; `fieldClass()` helper gone; no shadcn Input/Button/Label imports |
| D-03: Dedicated `/welcome` 3-step route | HONORED | `src/app/(auth)/welcome/page.tsx` exists as RSC; 3 steps in WelcomePage |
| D-04: Language choice in welcome via `authClient.updateUser` | HONORED | `nativeLanguage` removed from signup schema; `updateUser({ nativeLanguage })` at welcome step 3 |
| D-05: Routing signup→/welcome→/dashboard; 0-deck redirect | HONORED | Signup → `/welcome`; welcome → `/dashboard`; dashboard → `redirect("/welcome")` when 0 decks |
| D-06: Lightweight reduced-motion-safe mini-habitat teaser | HONORED | DOM/CSS only TeaserScene; motion.div gated on `!reduced` from `usePrefersReducedMotion()` |
| D-07: Auth scene recolours per screen | HONORED | login/signup=sunrise, forgot=daylight, reset=dusk confirmed |
| D-08: Preserve all auth logic | HONORED | `authClient.signIn/signUp/requestPasswordReset/resetPassword` calls preserved verbatim; react-hook-form + zod intact; error copy unchanged |
| D-09: DSY-03 conventions in primitives | HONORED | TField `h-12` (48px), TBtn `h-[50px]`, `isSubmitted`-gated inline validation, single full-width primary per screen |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/daybreak/lion-face.tsx` | 2 | Comment contains "placeholder" | Info | Comment documents intentional state ("CSS placeholder per the redesign brief: shippable as-is, swappable for commissioned art later"). Not a code stub — behavior is complete. No action required; deferred to future per CONTEXT.md. |

No `TBD`, `FIXME`, or `XXX` markers found in any phase-modified files. No `return null` stubs. No empty-implementation patterns.

**CR-01 (Open Redirect):** Fixed — `safeCallback` guard (`startsWith("/") && !startsWith("//")`) in `login/page.tsx` lines 54-58.

**CR-02 (React namespace):** Confirmed false positive — `@types/react` exports `React` as a UMD namespace (`export as namespace React` in `@types/react/index.d.ts`), making `React.CSSProperties` valid without an explicit import when the `lib: ["dom"]` configuration is present and `@types/react` is in scope. `npx tsc --noEmit` exits 0 (per orchestrator context).

**WR-01 (try/finally spinner lock):** Fixed — all four auth form `onSubmit` handlers now wrap in `try { ... } finally { setIsPending(false) }`, preventing permanent button lock on unexpected network throws.

---

## Human Verification Required

### 1. Full Visual Fidelity Review — All Screens vs Hi-Fi Mocks

**Test:** Open the HTML artboard at `design/handoff-daybreak/LeoCards Daybreak Onboarding & Auth.html` alongside the running app. Navigate to Login, Signup, Forgot (default + sent states), Reset (default + mismatch + expired states), Welcome steps 1/2/3, and the dashboard empty-deck state. Trigger each state manually.

**Expected:** Every screen matches the artboard: ghost-peek stack card edges, sun disc + hills + grass in the auth scene, amber buttons, cream background, Baloo 2 headings, Leo medallion sizing and colours, step dots, error banner styling (red !-circle), creating spinner copy.

**Why human:** Visual fidelity cannot be verified by grep or code inspection. The phase goal explicitly states "matches the hi-fi mocks" — this requires a side-by-side render comparison.

### 2. Login Open-Redirect Guard — Runtime Confirmation (CR-01)

**Test:** In a browser, navigate to `http://localhost:3000/login?callbackUrl=https://evil.com`. Sign in with valid credentials.

**Expected:** Browser lands on `/dashboard`, not `https://evil.com`. The `safeCallback` guard must fire correctly at runtime.

**Why human:** The guard is verified in source code but the actual `router.push` behaviour in Next.js router with a fully-qualified URL depends on runtime routing internals. A manual confirmation closes the loop on this security item.

### 3. Already-Has-Decks Back-Nav Guard on /welcome

**Test:** Sign in as a user who already has one or more decks. Navigate directly to `/welcome` in the browser address bar (simulate back-nav).

**Expected:** Immediate redirect to `/dashboard`. The RSC's `getUserDecks + redirect("/dashboard")` guard fires before the WelcomePage renders.

**Why human:** The e2e suite covers the 0-deck redirect (fresh user → /welcome) but does NOT explicitly test the has-decks redirect (existing user → /dashboard when hitting /welcome). Code is correct but this branch is not covered by an automated assertion.

---

## Gaps Summary

No gaps found. All 5 success criteria are verified in the codebase. All 9 requirement IDs are satisfied. All CONTEXT decisions (D-01 through D-09) are honored. The two critical review issues (CR-01, CR-02) have been resolved — CR-01 fixed in code, CR-02 confirmed as a false positive. 3 human verification items remain for visual fidelity and runtime security confirmation; these cannot be resolved by automated code inspection.

---

*Verified: 2026-06-20T14:00:00Z*
*Verifier: Claude (gsd-verifier)*
