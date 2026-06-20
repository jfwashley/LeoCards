---
status: partial
phase: 19-daybreak-foundation-onboarding-auth
source: [19-VERIFICATION.md]
started: 2026-06-20
updated: 2026-06-20
---

# Phase 19 — Human UAT

Code-level verification PASSED (5/5 success criteria, 9/9 requirements; 1956 unit + 30 e2e green, tsc clean). The items below need a human because they are visual-fidelity judgments or runtime confirmations that automated checks cannot make. Run them against the dev server at http://localhost:3000.

## Current Test

[awaiting human testing]

## Tests

### UAT-19-01 — Visual fidelity vs the Daybreak hi-fi mocks
status: pending
Open `design/handoff-daybreak/LeoCards Daybreak Onboarding & Auth.html` next to the running app and compare every screen + state side-by-side:
- Login (sunrise scene), Signup (sunrise + default / per-field validation / email-already-exists / spinner), Forgot (daylight + privacy-safe sent), Reset (dusk + expired dead-end), Welcome steps 1–3 (+ creating / error states), empty-deck and no-search-results.
- Confirm: cream/amber tokens, Baloo 2 + Figtree fonts, type scale, spacing, radii, shadows, and the LionFace all match.

### UAT-19-02 — Login open-redirect guard (CR-01 fix)
status: pending
Visit `http://localhost:3000/login?callbackUrl=https://evil.com`, sign in with a valid account, and confirm the browser lands on `/dashboard` — NOT the external URL. (Code fix is in place and type-checked; this confirms it at runtime.)

### UAT-19-03 — Already-has-decks `/welcome` redirect
status: pending
As a user who already has ≥1 deck, navigate directly to `/welcome` and confirm you are redirected to `/dashboard`. Conversely, a 0-deck user at `/dashboard` should be sent to `/welcome`. (Guards exist in code; not covered by an automated e2e assertion.)
