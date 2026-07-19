# Phase 25: My Account - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the **My Account** section deferred out of v4.0 Daybreak: a Daybreak-styled, dashboard-reachable `/account` page where a signed-in user can **view their account details, edit their name and email, change their password, log out, and permanently delete their account**. Unlike the v4.0 phases this is NOT a re-skin — it is a net-new capability phase (new route, new mutations) built on the shipped Daybreak design system and better-auth.

**Scope = the ROADMAP's 5 success criteria PLUS one user-directed expansion:** editable name + email (the roadmap minimum was view-only details; Josh explicitly widened it during discussion). Requirements were `TBD` in ROADMAP.md — the planner should mint requirement IDs (suggest `ACC-01..`) covering: reach + details view, edit name/email (email via new-inbox verification), change password, log out, delete account, Daybreak-styled on desktop + mobile.

**Delete account is compliance-critical, not a nice-to-have** — Josh: it's needed "to get on the App Stores" (app-store policy requires in-app, self-serve account deletion).

**Not in scope:** editing native language (display-only — card fronts are stored in the native language, so changing it needs retranslation thinking), any other screen's chrome, email verification at signup, and anything touching the SRS/habitat engines.

</domain>

<decisions>
## Implementation Decisions

### Entry point & page shape
- **D-01: Header glyph swap.** The dashboard header's bare logout glyph is REPLACED by an account glyph that navigates to `/account`; logout moves inside the section. Glyph = **person silhouette** (head-and-shoulders), hand-drawn SVG in Daybreak ink `#4A331C`, in the **same 36px bordered-button frame** as today's `LogoutButton` (1.5px `#EDDFC9` border, radius 10, white fill). Entry is **dashboard header only** — study/habitat/deck chrome untouched.
- **D-02: Dedicated route + focused chrome.** `/account` is a full page under `(protected)/`. Chrome = **back button → dashboard + page context**, like `/habitat`'s `HBack` pattern — no AppHeader, no deck pill. Page top is a **plain "My Account" display-font title** (no avatar/identity block).
- **D-03: One scrolling page, stacked sections**, mobile-first single column, in this order: details card → change password → log out → delete-account row at the very bottom.
- **D-04: Dirty-form back guard.** If the user navigates back with unsaved text in the change-password fields, show a small **"Discard changes?" confirm** (leave / stay). Typed-but-unsubmitted password text is never silently kept.

### Account details card
- **D-05: Contents** = name, email, member-since (`user.createdAt`), and "I speak: {native language}" (`user.nativeLanguage`). **Native language is display-only.**
- **D-06: Single Edit mode.** One "Edit" affordance flips the card into `TField`s for **name + email** with Save/Cancel — one submit, one spinner, matching the one-primary-per-screen rule (Phase 19 D-09). Member-since and native language stay static in edit mode.
- **D-07: Email change verifies via the NEW inbox only.** Saving a new email does NOT change the sign-in identifier immediately: a verification link is sent to the **new** address and the change applies when it's clicked. No notice to the old address. The card shows a **pending-verification state** ("Verification sent to X — the change applies when you click the link") with the old email still active. ⚠ Build note: the app has NO email-verification infra (`emailVerified` is false for every user; better-auth's built-in changeEmail applies immediately for unverified users) — this flow is **custom wiring** on the existing Resend setup (`sendResetPassword` precedent in `src/lib/auth.ts`); researcher to pick the mechanism (better-auth hooks vs own token via the `verification` table).

### Change-password flow
- **D-08: Collapsed row that expands** into three fields — current password / new password / confirm new — with its own Save. New-password validation reuses the signup zod rules; inline red-border + helper errors after submit (never toasts).
- **D-09: Revoke other sessions on change** — every other device is signed out; this device stays signed in. Consistent with `revokeSessionsOnPasswordReset: true` already in `src/lib/auth.ts` (better-auth `changePassword` supports `revokeOtherSessions`).
- **D-10: Success = collapse + quiet inline confirmation** — the form collapses back to the row with a green "Password updated" helper that fades. No toast, no redirect.
- **D-11: No forgot-password escape hatch** inside the form — keep it minimal (the reset flow stays reachable from `/login` only).

### Delete-account ceremony
- **D-12: Quiet text row + simple two-step confirm.** A small "Delete account" text row at the page bottom (no separated danger card) opens the same lightweight confirm pattern as card-delete: "This can't be undone" → explicit Delete / Keep. **No password re-entry, no typed confirmation** — Josh chose the light gate deliberately. It must stay findable on the account page (App Store requirement).
- **D-13: Sober, clear copy** — state exactly what's erased (your decks, words, and habitat progress) and that it's permanent. No Leo mascot, no guilt framing in the confirm step.
- **D-14: Post-delete → `/login`** with the session invalidated — same exit as logout; a deleted user can no longer sign in (their email is free to re-register). DB note: every user-referencing table already has `onDelete: "cascade"` (cards cascade via decks, recall_events via cards), so deleting the `user` row wipes everything in one statement despite Neon HTTP's no-transaction constraint. better-auth `deleteUser` needs `user.deleteUser.enabled: true` in `src/lib/auth.ts`.

### Claude's Discretion
- Exact silhouette-glyph drawing, spacing/token values, and how the section cards compose from existing atoms (`Card`, `TField`, `TBtn`, `Pill`).
- How the Log out section renders (reuse `LogoutButton` logic — `authClient.signOut()` → `/login`).
- Pending-email-verification copy/layout, resend affordance (if any), and link-expiry handling.
- Whether delete uses better-auth's `deleteUser` or a server action + manual cascade — pick whichever is cleanest given the enabled-config note in D-14.
- e2e selector strategy (data-testid-first per the Phase 20/21 lesson) and error-state mapping for each mutation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system (build from the system — NO hi-fi mock exists for this screen)
- `design/handoff-daybreak/README.md` — Daybreak tokens (palette, type, spacing, radii, shadows) + shared-component specs. **This is the only Daybreak screen without a mock** — compose from the system + existing atoms, the same way the edit-card modal did (Phase 21 precedent). Do NOT invent a new visual language.
- `design/handoff-daybreak/hifi-daybreak.jsx` — the `d1` theme object (exact token values).
- `design/handoff-daybreak/hifi-shared.jsx` — `LionFace`, `TField`, `TBtn` reference atoms (already ported to `src/components/daybreak/`).
- `design/handoff-daybreak/daybreak-dashboard.jsx` (~lines 18-26) — the logout-glyph drawing style the new account glyph must match (`src/components/logout-button.tsx` is the ported precedent).

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 25: My Account" — goal + the 5 baseline success criteria (this CONTEXT expands them with editable name/email).
- `.planning/REQUIREMENTS.md` §"Future Requirements (deferred)" — the deferred account/settings line this phase absorbs.

### Prior phase context (locked patterns)
- `.planning/phases/19-daybreak-foundation-onboarding-auth/19-CONTEXT.md` — auth-form conventions (D-08 preserve better-auth logic, D-09 inline validation / one primary / touch ≥44px) and the Daybreak primitives strategy.
- `.planning/phases/21-dashboard-my-deck/21-CONTEXT.md` — header composition (D-01), card-delete confirm precedent (DSH-06 discretion), and the **L-06 e2e literal-selector audit lesson** (this phase removes the header logout button — grep `e2e/` for selectors touching it, e.g. `aria-label="Sign out"`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/daybreak/{t-field,t-btn,pill,card,lion-face,shimmer}.tsx` — the atoms every section composes from.
- `src/components/daybreak/h-back.tsx` — the back-button chrome pattern to mirror for `/account` (D-02).
- `src/components/logout-button.tsx` — glyph frame style (36px, border `#EDDFC9`, radius 10) + the `authClient.signOut()` → `/login` logic that moves into the page's Log out section.
- `src/components/card-edit-dialog.tsx` — the inline delete-confirm pattern D-12 mirrors, plus Daybreak dialog styling if the back-guard (D-04) renders as a dialog.
- Auth pages (`src/app/(auth)/*/page.tsx`) — react-hook-form + zodResolver + better-auth `{ error }` handling + inline error rendering to copy.
- `src/lib/auth.ts` `sendResetPassword` — the Resend email-send pattern D-07's verification email follows.

### Established Patterns
- Daybreak tokens via Tailwind semantic classes + `--db-*` vars; display text in Baloo 2 (`font-display`); atoms use inline styles for exact token values; biome forbids `!` non-null assertions.
- **Perf discipline (Phase 17 in flight):** keep `/account` server-first — RSC page shell, client leaves only for the interactive cards. Avoid adding `motion/react` or other heavy deps to this route; it must not regress the shared-chunk floor Phase 17 is actively shrinking. `/account` is NOT one of the four measured key routes, but new shared-chunk weight would show up in all of them.
- e2e specs use throwaway `*test.local` users via `e2e/helpers.ts`; new specs should follow data-testid/role-based selectors (Phase 20/21 lesson).

### Integration Points
- `src/lib/auth.ts` — better-auth server config: add `user.deleteUser.enabled` (D-14) and whatever changeEmail/updateUser enablement D-06/D-07 need; `nativeLanguage` additionalField already exists.
- `src/lib/auth-client.ts` — client surface for `updateUser`, `changePassword`, `changeEmail`, `deleteUser`, `signOut`.
- `src/components/app-header.tsx` (+ its `dashboard-header.tsx` client-leaf wrapper from 17-03) — the glyph-swap edit surface (D-01).
- `src/app/(protected)/layout.tsx` — session gate the new route inherits; `src/db/schema.ts` — user-FK cascades that make single-row deletion safe (D-14).

### Landmines
- **better-auth changeEmail default behavior:** with `emailVerified=false` (all LeoCards users) the built-in flow changes the email immediately — the D-07 verify-via-new-inbox gate must be explicitly designed, not assumed from the library.
- **Removing the header logout button** breaks any e2e/spec or QA-harness step that signs out via `aria-label="Sign out"` in the header — audit `e2e/` and `scripts/qa-*.mjs` before landing (L-06 pattern).
- The dirty-form back guard (D-04) intercepts the back-button chrome, not the browser back button — don't promise more than client-side interception can deliver; keep it to the in-page back control.

</code_context>

<specifics>
## Specific Ideas

- Josh (verbatim intent): *"don't forget the delete account option to get on the App Stores"* — deletion is a compliance checkbox for future app-store distribution, which is why it must be present, findable, and genuinely destructive (full data removal).
- The account glyph should read instantly as "account" — a plain person silhouette in the exact visual weight of the current logout glyph, so the header swap feels like a refinement, not a redesign.
- Password success feedback: quiet green helper "Password updated", fading — calm, no ceremony.
- Deletion copy names the loss concretely ("your decks, words, and habitat progress") rather than a generic "all your data".

</specifics>

<deferred>
## Deferred Ideas

- **Editable native language** — declined this phase (card fronts are stored in the native language; changing it implies retranslation/data questions). Revisit as its own backlog item if users ask.
- **"Your email was changed" notice to the old address** — declined with D-07 (verify-via-new only); worth reconsidering if the app ever holds higher-stakes data.
- **Forgot-password link inside the change-password form** — declined (D-11).
- **Goodbye/farewell interstitial after deletion** — declined (D-14 lands on `/login`).
- **Identity block at page top** (avatar + name + email header) — declined for a plain title (D-02).
- **Account entry from study/habitat/deck chrome** — declined; dashboard-only this phase (D-01).
- **App-store packaging ambition** — Josh's App Store remark signals future mobile-distribution interest; PROJECT.md still lists "Mobile app" as out of scope. Not this phase's concern beyond delete-account compliance; flag at the next milestone discussion.

</deferred>

---

*Phase: 25-my-account*
*Context gathered: 2026-07-19*
