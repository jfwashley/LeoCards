---
status: testing
phase: 19-daybreak-foundation-onboarding-auth
source: [19-VERIFICATION.md, 19-HUMAN-UAT.md, 19-01..05-SUMMARY.md]
started: 2026-06-20
updated: 2026-06-20
---

## Current Test

number: 1
name: Visual fidelity — public auth screens (login / signup / forgot / reset)
expected: |
  All four screens render the Daybreak design system and match the hi-fi mocks.
  Captured via Chrome against the running dev server; awaiting your fidelity confirmation.
awaiting: user response

## Tests

### 1. Visual fidelity — Login (Daybreak sunrise)
expected: Cream bg, 🦁 LeoCards header, sunrise auth scene ("Your lion is waiting."), Baloo 2 "Welcome back", TField Email/Password, "Forgot password?", amber "Sign in" TBtn, "Sign up" footer.
result: auto-verified (Daybreak rendering correct; pixel-fidelity vs mock = your call)

### 2. Visual fidelity — Signup (sunrise, no language field)
expected: Same sunrise shell, "Create your account", Name/Email/Password only (NO native-language field — ONB-02/D-04), "At least 8 characters" hint, amber "Create account".
result: auto-verified (rendering correct + language field confirmed absent)

### 3. Visual fidelity — Forgot Password (daylight scene)
expected: D-07 daylight scene (blue sky, green hills, "We'll send a link."), "Reset your password", Email TField, "Send reset link", "‹ Back to sign in".
result: auto-verified (daylight variant + layout correct)

### 4. Visual fidelity — Reset Password (dusk scene, with token → form)
expected: D-07 dusk scene (deep amber, "Almost done."), "Set a new password", New password + Confirm password TFields, "Set new password". (No-token/expired → "Link expired" dead-end is a separate state.)
result: auto-verified (dusk variant + form correct)

### 5. Welcome 3-step flow visual + behavior (requires sign-in)
expected: signup → /welcome; Step 1 Meet Leo, Step 2 promise + animated mini-habitat teaser (static under reduce-motion), Step 3 native + target dropdowns (target excludes native); "Start learning" creates deck → /dashboard (creating + error states). Behavior is e2e-verified (30/30); visual fidelity needs your eye.
result: [pending]

### 6. Empty states visual (requires sign-in, empty deck)
expected: empty-deck ("Your deck is empty" + LionFace medallion + Browse words / Add a card) and no-search-results ("No words match …" + Clear search) match ObEmptyDeck / ObNoSearch. Behavior e2e-verified; visual fidelity needs your eye.
result: [pending]

### 7. Open-redirect guard runtime (requires sign-in)
expected: visit /login?callbackUrl=https://evil.com and sign in → lands on /dashboard, NOT the external URL. (Code + security audit verified; runtime confirmation.)
result: auto-verified — NOW AUTOMATED via e2e `01-auth-signup-login.spec.ts:82` (CR-01), passing web + mobile (lands on /dashboard, never evil.example.com)

### 8. /welcome redirect for a decked user (requires sign-in)
expected: a user with ≥1 deck navigating to /welcome is redirected to /dashboard; a 0-deck user at /dashboard is sent to /welcome. (0-deck→/welcome is e2e-covered; decked→/dashboard is code-only.)
result: auto-verified — NOW AUTOMATED via e2e `02-first-visit-deck-creation.spec.ts:162` (D-05), passing web + mobile (decked user bounced to /dashboard)

## Summary

total: 8
passed: 0
auto_verified: 6
issues: 0
pending: 2
skipped: 0
note: |
  Tests 1-4 (public-screen rendering) auto-verified via Chrome screenshots; user
  fidelity confirmation pending. Tests 7-8 (open-redirect, decked /welcome redirect)
  now permanently automated as e2e. Tests 5-6 (Welcome flow + empty-state VISUAL
  fidelity) require a signed-in browser session — left to the user (behavior is
  e2e-green; only the visual eyeball remains).

## Gaps

[none yet]
