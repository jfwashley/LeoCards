---
status: partial
phase: 25-my-account
source: [25-VERIFICATION.md]
started: 2026-07-20T14:55:00Z
updated: 2026-07-20T14:55:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual/design fidelity of /account on desktop + mobile
expected: The My Account page renders consistent with the v4.0 Daybreak system (this is the one Daybreak screen with NO hi-fi mock — composed from tokens/atoms per 25-UI-SPEC.md). Check: chrome row (44px back button + "My Account" Baloo 2 title), stacked D-03 section order (details → change password → sign out → quiet delete row), pending-email banner styling, delete confirm dialog, and that the new header account glyph (36px visual in 44px hit area) does not crowd the DeckSwitcher in the dashboard header. Desktop (1280px) + mobile (375px).
result: [pending]

### 2. Live email-inbox click-through for the D-07 email-change verification link
expected: Editing the email on /account sends a real Resend email to the NEW address only; the pending banner shows "Verification sent to X"; clicking the link in the real inbox swaps the sign-in email, lands back on /account with the success banner, and the old email no longer works for login. (Token round-trip is unit-covered in verify-email/route.test.ts; pending-banner state is e2e-covered; only the real-inbox leg is manual.)
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
