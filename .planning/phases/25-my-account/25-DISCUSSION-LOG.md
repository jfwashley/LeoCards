# Phase 25: My Account - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 25-my-account
**Areas discussed:** Entry point & page shape, Account details content, Change-password flow, Delete-account ceremony

---

## Entry point & page shape

| Option | Description | Selected |
|--------|-------------|----------|
| Account glyph replaces logout (Recommended) | Header logout glyph becomes an account glyph; logout moves inside the section | ✓ |
| Account glyph beside logout | Second glyph; logout in two places | |
| Avatar popover menu | Popover with My Account + Log out rows | |

**User's choice:** Account glyph replaces logout

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /account route (Recommended) | Full page under (protected)/ | ✓ |
| Sheet/modal over dashboard | Slides over like edit-card dialog | |

**User's choice:** Dedicated /account route

| Option | Description | Selected |
|--------|-------------|----------|
| Back button chrome (Recommended) | Focused sub-screen like /habitat, no deck pill | ✓ |
| Full app header | Persistent AppHeader with deck pill | |

**User's choice:** Back button chrome

| Option | Description | Selected |
|--------|-------------|----------|
| One page, stacked sections (Recommended) | Single scrolling column: details / password / log out / danger | ✓ |
| Hub with sub-screens | iOS-settings style rows opening focused screens | |
| You decide | Planner's call | |

**User's choice:** One page, stacked sections

| Option | Description | Selected |
|--------|-------------|----------|
| Person silhouette glyph (Recommended) | Head-and-shoulders SVG, Daybreak ink, 36px bordered frame | ✓ |
| Initial-letter avatar | Circle with user's first initial | |
| Mini LionFace variant | Small Leo mark (duplicates brand) | |

**User's choice:** Person silhouette glyph

| Option | Description | Selected |
|--------|-------------|----------|
| Identity block (Recommended) | Avatar + name + email header above sections | |
| Plain title only | "My Account" heading, details live in their card | ✓ |

**User's choice:** Plain title only — went against the recommendation

| Option | Description | Selected |
|--------|-------------|----------|
| Leave silently (Recommended) | Back always navigates; unsubmitted password text discarded | |
| Confirm before leaving | "Discard changes?" confirm when password fields are dirty | ✓ |

**User's choice:** Confirm before leaving — went against the recommendation

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard header only (Recommended) | Glyph where AppHeader renders today | ✓ |
| Everywhere with chrome | Thread entry into study/deck/habitat top bars | |

**User's choice:** Dashboard header only

---

## Account details content

| Option | Description | Selected |
|--------|-------------|----------|
| Name, email, member since (Recommended) | Core identity trio | |
| Trio + native language | Also "I speak: {nativeLanguage}" | ✓ |
| Trio + learning summary | Also stats line (duplicates dashboard) | |

**User's choice:** Trio + native language

| Option | Description | Selected |
|--------|-------------|----------|
| All display-only (Recommended) | Roadmap minimum; password is the only mutation | |
| Name editable | better-auth updateUser, low-risk extension | |
| Name + native language editable | Language switch has data implications | |

**User's choice:** *Other (free text):* "Name and email editable. Also don't forget the delete account option to get on the App Stores" — scope expanded to name + email editing; delete-account reaffirmed as App Store compliance requirement.

| Option | Description | Selected |
|--------|-------------|----------|
| Verify via current email (Recommended, first ask) | Approval link to the CURRENT address | |
| Change immediately | No round-trip; typo risk | |

**User's choice:** *Other (free text):* asked "Can it not be verified with the new email? What are the drawbacks of this?" — trade-offs explained (typo-proof but no hijack protection; custom wiring either way since no verification infra exists), options re-presented:

| Option | Description | Selected |
|--------|-------------|----------|
| Verify via new + notify old (Recommended) | New-inbox link applies change + courtesy notice to old address | |
| Verify via new email only | Just the new-inbox link | ✓ |
| Change immediately | No verification | |

**User's choice:** Verify via new email only — went against the recommendation

| Option | Description | Selected |
|--------|-------------|----------|
| Single Edit mode (Recommended) | One Edit flips the card into TFields with Save/Cancel | ✓ |
| Per-field inline edit | Pencil per row, two save flows | |

**User's choice:** Single Edit mode

---

## Change-password flow

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsed row, expands (Recommended) | Row expands to current/new/confirm + Save | ✓ |
| Always-visible form | Three fields permanently on the page | |

**User's choice:** Collapsed row, expands

| Option | Description | Selected |
|--------|-------------|----------|
| Sign out other devices (Recommended) | Revoke other sessions; this device stays | ✓ |
| Keep other sessions | No revocation | |

**User's choice:** Sign out other devices

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse + inline confirmation (Recommended) | Green "Password updated" helper, fades | ✓ |
| Stay open with message | Form stays expanded until dismissed | |

**User's choice:** Collapse + inline confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, link to reset flow (Recommended) | Small link to /forgot-password | |
| No link | Keep the form minimal | ✓ |

**User's choice:** No link — went against the recommendation

---

## Delete-account ceremony

| Option | Description | Selected |
|--------|-------------|----------|
| Re-enter password (Recommended) | Current password + explicit Delete; ownership proof | |
| Typed confirmation | Type DELETE to arm the button | |
| Simple two-step confirm | Card-delete pattern: confirm "can't be undone" | ✓ |

**User's choice:** Simple two-step confirm — went against the recommendation

| Option | Description | Selected |
|--------|-------------|----------|
| Sober and clear (Recommended) | Plain statement of what's erased; no mascot | ✓ |
| Warm Leo farewell | "Leo will miss you" framing | |

**User's choice:** Sober and clear

| Option | Description | Selected |
|--------|-------------|----------|
| Login screen (Recommended) | Session invalidated → /login | ✓ |
| Brief goodbye screen | Interstitial then login | |

**User's choice:** Login screen

| Option | Description | Selected |
|--------|-------------|----------|
| Separated danger card (Recommended) | Distinct destructive-styled card at bottom | |
| Quiet text row | Small "Delete account" text link at page bottom | ✓ |

**User's choice:** Quiet text row — went against the recommendation

---

## Claude's Discretion

- Exact silhouette-glyph drawing, spacing/tokens, section-card composition from existing atoms
- Log out section rendering (reuse LogoutButton logic)
- Pending-email-verification copy/layout, resend affordance, expiry handling
- deleteUser mechanism (better-auth deleteUser vs server action + cascade)
- e2e selector strategy and per-mutation error-state mapping

## Deferred Ideas

- Editable native language (data implications — card fronts stored in native language)
- "Email changed" notice to old address
- Forgot-password link inside the change-password form
- Post-delete goodbye screen
- Identity block at page top
- Account entry from non-dashboard chrome
- App-store packaging ambition (flag at next milestone discussion)
