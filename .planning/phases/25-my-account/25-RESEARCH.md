# Phase 25: My Account - Research

**Researched:** 2026-07-19
**Domain:** better-auth (v1.5.6, installed source read directly) account-mutation flows on Next.js 16.2.1 App Router + Drizzle/Neon HTTP
**Confidence:** HIGH — every better-auth behavioral claim below was verified by reading the actual installed `node_modules/better-auth` v1.5.6 source (`.mjs` + `.d.mts`), not training data. Next.js Route Handler/redirect behavior verified against `node_modules/next/dist/docs/` per AGENTS.md.

## Summary

This phase is buildable with **zero new npm packages and zero changes to `src/lib/auth.ts`**. Every mutation (`updateUser`, `changePassword`) needed for D-06/D-08/D-09 is already available, unconfigured, out of the box from the installed better-auth client. The two flows that looked like they'd need better-auth config (D-07 email-change, D-14 delete-account) are both **better served by small custom server actions** that bypass better-auth's built-in `changeEmail`/`deleteUser` endpoints entirely — not because those endpoints are broken, but because their *default, safest-to-configure* behavior conflicts with specific, explicit UI-SPEC/CONTEXT decisions. This is the single most important finding of this research and is detailed in full below.

**D-07 (email change) — chosen mechanism: custom token flow via the existing `verification` table, NOT better-auth's `changeEmail`.** Reading `update-user.mjs` directly shows better-auth's built-in `changeEmail` (a) uses a **stateless JWT** for its token — there is no DB row to query, so it structurally cannot satisfy the UI-SPEC's explicit "server-persisted pending state... spans sessions/devices" requirement — and (b) **deliberately returns `{status:true}` even when the new email is already taken**, as an anti-enumeration measure, which makes the UI-SPEC's explicit "That email is already in use." inline error impossible to surface honestly through that endpoint. A ~70-line custom flow (one server action + one GET route handler), reusing the *already-provisioned, already-in-schema* `verification` table with a deterministic per-user `identifier`, satisfies every D-07 requirement exactly, needs **no schema change** (`db:push` gate task NOT required), and is directly testable without a live inbox (query the DB row's token instead of receiving a real email).

**D-14 (delete account) — chosen mechanism: custom server action, NOT better-auth's `deleteUser`.** better-auth's built-in `deleteUser` endpoint, when called without a `password` (which D-12 explicitly forbids collecting), rejects with `SESSION_EXPIRED` unless the current session was created **within the last 24 hours** (`freshAge` default = `3600*24`). LeoCards is a daily-habit app by design (habitat decay is the core value prop) — real users routinely have sessions older than 24h. Using the built-in endpoint as specified would make D-12's "no password re-entry" decision **silently fail for exactly the loyal, long-session users the app is designed to retain**. A 6-line custom server action (`db.delete(user).where(eq(user.id, userId))`) sidesteps this entirely: Postgres `ON DELETE CASCADE` FKs wipe every dependent table (session, account, decks→cards→recall_events, milestones_seen, habitat_metadata) atomically within that single statement, regardless of Neon HTTP's lack of multi-statement transaction support — this is a database-engine guarantee, not a client-side concern.

**Primary recommendation:** Build two new files — `src/lib/account-actions.ts` (`"use server"`: `requestEmailChange`, `deleteAccount`) and `src/lib/account-queries.ts` (`getPendingEmailChange`) — plus one new Route Handler (`src/app/api/account/verify-email/route.ts`). Everything else (name edit, password change, logout) calls already-existing, already-working `authClient` methods with zero server-side config changes. Leave `src/lib/auth.ts` untouched.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Account details view | Frontend Server (SSR) | API/Backend | `page.tsx` fetches `session.user` once via `auth.api.getSession` — zero client-side fetch, matches `dashboard/page.tsx` precedent exactly |
| Name edit | API/Backend | Browser/Client | `authClient.updateUser({name})` hits better-auth's core `/update-user` endpoint; client only owns form/pending state |
| Email change — request | API/Backend | Database/Storage | Custom server action writes a `verification` row (source of truth for "pending") + fires a Resend send; DB, not client state, drives the UI banner |
| Email change — verify (link click) | API/Backend | — | Dedicated GET Route Handler consumes the token and mutates `user.email`; no client-side involvement at all — the click may happen on a different device than the one that requested it |
| Change password | API/Backend | Browser/Client | `authClient.changePassword(...)` hits better-auth's core `/change-password` endpoint; `revokeOtherSessions` handled entirely server-side |
| Log out | API/Backend | Browser/Client | `authClient.signOut()` + client-side `router.push("/login")` (unchanged from today's `LogoutButton`) |
| Delete account | API/Backend | Database/Storage | Custom server action; a single `DELETE` statement cascades via Postgres FK, not application logic |
| Header nav glyph | Browser/Client | Frontend Server (SSR) | `AccountNavButton` is a pure `next/link` — RSC-safe, no client JS needed for the glyph itself (mirrors `HBack`) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Header glyph swap.** The dashboard header's bare logout glyph is REPLACED by an account glyph that navigates to `/account`; logout moves inside the section. Glyph = person silhouette (head-and-shoulders), hand-drawn SVG in Daybreak ink `#4A331C`, in the same 36px bordered-button frame as today's `LogoutButton` (1.5px `#EDDFC9` border, radius 10, white fill). Entry is dashboard header only.
- **D-02: Dedicated route + focused chrome.** `/account` is a full page under `(protected)/`. Chrome = back button → dashboard + page context, like `/habitat`'s `HBack` pattern — no AppHeader, no deck pill. Page top is a plain "My Account" display-font title (no avatar/identity block).
- **D-03: One scrolling page, stacked sections**, mobile-first single column: details card → change password → log out → delete-account row at the very bottom.
- **D-04: Dirty-form back guard.** If the user navigates back with unsaved text in the change-password fields, show a small "Discard changes?" confirm (leave / stay). Typed-but-unsubmitted password text is never silently kept.
- **D-05: Contents** = name, email, member-since (`user.createdAt`), and "I speak: {native language}" (`user.nativeLanguage`). Native language is display-only.
- **D-06: Single Edit mode.** One "Edit" affordance flips the card into `TField`s for name + email with Save/Cancel — one submit, one spinner. Member-since and native language stay static in edit mode.
- **D-07: Email change verifies via the NEW inbox only.** Saving a new email does NOT change the sign-in identifier immediately: a verification link is sent to the new address and the change applies when it's clicked. No notice to the old address. The card shows a pending-verification state with the old email still active. ⚠ Build note: the app has NO email-verification infra (`emailVerified` is false for every user; better-auth's built-in changeEmail applies immediately for unverified users) — this flow is custom wiring on the existing Resend setup (`sendResetPassword` precedent). **Researcher finding: the "applies immediately" premise needed verification against the installed version — see Summary and Pitfall 1 below; the built-in flow's actual default is more nuanced than the landmine note assumed, but the conclusion (custom flow needed) still holds, for different/stronger reasons.**
- **D-08: Collapsed row that expands** into three fields — current password / new password / confirm new — with its own Save. New-password validation reuses the signup zod rules; inline red-border + helper errors after submit (never toasts).
- **D-09: Revoke other sessions on change** — every other device is signed out; this device stays signed in. Consistent with `revokeSessionsOnPasswordReset: true` already in `src/lib/auth.ts` (better-auth `changePassword` supports `revokeOtherSessions`).
- **D-10: Success = collapse + quiet inline confirmation** — the form collapses back to the row with a green "Password updated" helper that fades. No toast, no redirect.
- **D-11: No forgot-password escape hatch** inside the form — keep it minimal (the reset flow stays reachable from `/login` only).
- **D-12: Quiet text row + simple two-step confirm.** A small "Delete account" text row at the page bottom (no separated danger card) opens the same lightweight confirm pattern as card-delete: "This can't be undone" → explicit Delete / Keep. **No password re-entry, no typed confirmation** — Josh chose the light gate deliberately. Must stay findable (App Store requirement).
- **D-13: Sober, clear copy** — state exactly what's erased (decks, words, habitat progress) and that it's permanent. No Leo mascot, no guilt framing in the confirm step.
- **D-14: Post-delete → `/login`** with the session invalidated — same exit as logout; a deleted user can no longer sign in (their email is free to re-register). DB note: every user-referencing table already has `onDelete: "cascade"`, so deleting the `user` row wipes everything in one statement despite Neon HTTP's no-transaction constraint. better-auth `deleteUser` needs `user.deleteUser.enabled: true` — **researcher finding: recommend NOT using better-auth's `deleteUser` at all; see Summary and Pitfall 2.**

### Claude's Discretion

- Exact silhouette-glyph drawing, spacing/token values, and how the section cards compose from existing atoms (`Card`, `TField`, `TBtn`, `Pill`).
- How the Log out section renders (reuse `LogoutButton` logic — `authClient.signOut()` → `/login`).
- Pending-email-verification copy/layout, resend affordance (if any), and link-expiry handling.
- Whether delete uses better-auth's `deleteUser` or a server action + manual cascade — pick whichever is cleanest given the enabled-config note in D-14. **Resolved by this research: server action (see Summary).**
- e2e selector strategy (data-testid-first per the Phase 20/21 lesson) and error-state mapping for each mutation.

### Deferred Ideas (OUT OF SCOPE)

- Editable native language — declined this phase (card fronts are stored in the native language; changing it implies retranslation/data questions).
- "Your email was changed" notice to the old address — declined with D-07 (verify-via-new only).
- Forgot-password link inside the change-password form — declined (D-11).
- Goodbye/farewell interstitial after deletion — declined (D-14 lands on `/login`).
- Identity block at page top (avatar + name + email header) — declined for a plain title (D-02).
- Account entry from study/habitat/deck chrome — declined; dashboard-only this phase (D-01).
- App-store packaging ambition — flag at next milestone discussion, not this phase's concern beyond delete-account compliance.
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **"This is NOT the Next.js you know."** All Next.js behavioral claims in this research (Route Handler conventions, `redirect()` vs `NextResponse.redirect()`, caching defaults) were verified against `node_modules/next/dist/docs/` for the installed **Next.js 16.2.1**, not training data. See Code Examples and Sources.
- Biome `recommended` ruleset is active project-wide (confirmed via the existing `// biome-ignore lint/style/noNonNullAssertion:` suppression comment in `src/db/index.ts`) — no `!` non-null assertions in new code.
- `db:push` only, never `drizzle-kit migrate` (empty migrations journal) — moot for this phase since the recommended design needs **no schema change** at all.

<phase_requirements>
## Proposed Requirement Coverage

Requirement IDs were not assigned upstream (CONTEXT.md suggests `ACC-01..`, minted by the planner). This table enumerates the capability surface so IDs map cleanly onto it.

| Proposed capability | Description | Research support |
|---|---|---|
| Reach + view details | Header glyph → `/account`, RSC page shows name/email/member-since/native-language | `AccountNavButton`, `page.tsx` pattern — Code Examples §A |
| Edit name | Single Edit mode, name field | `authClient.updateUser({name})` — Code Examples §B |
| Edit email (request) | New-inbox-only verification, pending state visible, replaces on re-request | Custom `requestEmailChange` action — Code Examples §C |
| Edit email (verify) | Link click applies the change, expiry/reuse/deleted-user/taken-race all handled | Custom Route Handler — Code Examples §D |
| Change password | Current-password verification, inline errors, revoke-other-sessions | `authClient.changePassword(...)` — Code Examples §E |
| Log out (in-section) | Move existing logic into the page | Reuse `LogoutButton`'s `authClient.signOut()` logic — Pitfall 10 |
| Delete account | Two-step confirm, no password, full cascade wipe, session invalidated | Custom `deleteAccount` action — Code Examples §F |
| Header blast-radius | Removing the header Sign-out control doesn't break e2e | Pitfall 13 — exact file/line audit |
| Daybreak styling, desktop+mobile | Compose from existing atoms only | UI-SPEC is authoritative; this research confirms all referenced atoms already exist (Pitfall 10) |
</phase_requirements>

## Standard Stack

### Core — all already installed, zero new packages this phase

| Library | Installed Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.5.6 (confirmed via `node_modules/better-auth/package.json`) | `updateUser`, `changePassword`, `signOut` client calls | Already the project's sole auth system |
| `drizzle-orm` | ^0.45.1 | `verification`/`user` table reads/writes in the two new custom flows | Already the project's sole DB access layer |
| `@neondatabase/serverless` | ^1.0.2 | Underlying Neon HTTP driver (`drizzle-orm/neon-http`) | Already in use; confirms the no-transaction constraint (see Pitfall 3) |
| `resend` | ^6.9.4 | Sends the email-change verification link | Already in use (`sendResetPassword` in `src/lib/auth.ts`) — reuse the identical inline-import + `.catch()` pattern |
| `zod` | ^4.3.6 | Client-side password/email validation | Already the project's sole validation library; signup's `.min(8)` rule is reused verbatim |
| `react-hook-form` + `@hookform/resolvers` | ^7.72.0 / ^5.2.2 | Form state for the details-edit and password forms | Already the pattern in every auth page |
| `lucide-react` | ^1.0.1 | `Trash2` icon on the delete-trigger row | Already installed, already used identically in `card-edit-dialog.tsx` |

**No `npm install` needed for this phase.** Zero new dependencies confirmed against `package.json` (read directly) — matches the phase's explicit perf constraint.

### Package Legitimacy Audit

**Not applicable — this phase installs no new external packages.** Every library used is already a `dependencies`/`devDependencies` entry in the project's `package.json`, already vetted in prior phases. No `slopcheck`/registry-verification gate is required.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────┐
                         │  Dashboard header            │
                         │  (AccountNavButton: RSC Link)│
                         └──────────────┬───────────────┘
                                        │ navigate
                                        ▼
┌────────────────────────────────────────────────────────────────────┐
│ /account  (page.tsx — RSC, session-gated by (protected)/layout.tsx) │
│                                                                       │
│  auth.api.getSession(headers) ──► session.user {name,email,          │
│                                     createdAt, nativeLanguage}       │
│  getPendingEmailChange(userId) ──► verification row (if any)         │
│  searchParams.verified ──────────► one-time ACBanner (success/expired)│
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ AccountDetails   │  │ ChangePassword    │  │ AccountLogout     │   │
│  │ Card (client)    │  │ Card (client)     │  │ Section (client)  │   │
│  └────────┬─────────┘  └─────────┬─────────┘  └────────┬─────────┘   │
│           │                      │                     │              │
│  ┌────────▼─────────┐  ┌─────────▼──────────┐ ┌────────▼─────────┐  │
│  │ DeleteAccountRow  │  │ authClient          │ │ authClient        │  │
│  │ (client)          │  │ .changePassword()   │ │ .signOut()        │  │
│  └────────┬──────────┘  └──────────────────────┘ └───────────────────┘│
└───────────┼──────────────────────────────────────────────────────────┘
            │
   ┌────────┴─────────────────────┬──────────────────────────┐
   ▼                              ▼                           ▼
authClient.updateUser({name})  requestEmailChange(newEmail)  deleteAccount()
   │ (built-in, no config)        │ "use server"                │ "use server"
   ▼                              ▼                              ▼
better-auth /update-user      1. uniqueness check (Drizzle)   1. delete pending
   endpoint                   2. delete-then-insert            verification row
   │                             verification row (identifier   2. DELETE user row
   ▼                             = change-email:{userId})        (Postgres FK CASCADE
setSessionCookie (fresh name) 3. Resend send (fire-and-forget)   wipes session/account/
                                  → new inbox only                decks→cards→recall_
                                                                    events/milestones_
                                                                    seen/habitat_metadata
                                                                    — ONE statement)
                                  ▼                              3. auth.api.signOut()
                        user clicks link in new inbox            (best-effort cookie
                                  │                                clear)
                                  ▼                              4. client: router.push
              GET /api/account/verify-email?token=...              ("/login")
                1. find verification row (scan, tiny table)
                2. check expiry
                3. check target user still exists
                4. re-check email still unique (race)
                5. UPDATE user.email
                6. delete verification row
                7. redirect /account?verified=success|expired
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (protected)/
│   │   └── account/
│   │       └── page.tsx                  # RSC shell — per UI-SPEC §Page Chrome
│   └── api/
│       └── account/
│           └── verify-email/
│               └── route.ts              # NEW — GET, consumes token, redirects
├── components/
│   ├── account-nav-button.tsx            # NEW — RSC-safe, per UI-SPEC
│   ├── account-dirty-context.tsx         # NEW — per UI-SPEC §5
│   ├── account-details-card.tsx          # NEW — client, per UI-SPEC §1
│   ├── change-password-card.tsx          # NEW — client, per UI-SPEC §2
│   ├── account-logout-section.tsx        # NEW — client, per UI-SPEC §3
│   ├── delete-account-row.tsx            # NEW — client, per UI-SPEC §4
│   └── daybreak/
│       └── account-back.tsx              # NEW — "use client" (unlike HBack), per UI-SPEC
└── lib/
    ├── account-actions.ts                # NEW — "use server": requestEmailChange, deleteAccount
    ├── account-queries.ts                # NEW — getPendingEmailChange (read-only, RSC-safe)
    └── auth.ts                           # UNCHANGED — see Summary
```

### Pattern 1: RSC page fetches session once, client leaves stay small

**What:** `page.tsx` is an `async function` that calls `auth.api.getSession({headers: await headers()})` exactly once, server-side, then passes plain data down as props to small, single-purpose client components.
**When to use:** Every protected page in this codebase already does this (`dashboard/page.tsx`, `habitat/page.tsx`). `/account` should be no different.
**Example:**
```typescript
// Source: src/app/(protected)/dashboard/page.tsx (existing, read directly)
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return null; // (protected)/layout.tsx already redirects; defensive only
```

### Pattern 2: Server Actions for owned-resource mutations, not hand-rolled API routes

**What:** Every existing mutation in this codebase (`createDeck`, `saveCard`, `editCard`, `deleteCard` in `src/lib/deck-actions.ts`) is a `"use server"` function: re-derive `userId` from `auth.api.getSession`, verify ownership via a Drizzle query, mutate, done. None of them hand-roll a `/api/*` POST route.
**When to use:** `requestEmailChange` and `deleteAccount` should follow this exact shape — imported directly into client components, called as plain async functions (Next.js handles the RPC).
**Example:**
```typescript
// Source: src/lib/deck-actions.ts (existing, read directly) — the template to copy
export async function editCard(cardId: string, front: string, back: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;
  // ... ownership check, then mutate, then revalidatePath("/dashboard")
}
```

### Pattern 3: The `verification` table as a general-purpose token store (better-auth's own convention)

**What:** better-auth's own `deleteUser` flow (when `sendDeleteAccountVerification` is configured — a feature this project doesn't use) writes directly into the `verification` table with an app-chosen `identifier` naming convention: `identifier: \`delete-account-${token}\``, `value: session.user.id`, `expiresAt`. This is direct proof, from better-auth's own source, that hand-writing rows into this pre-existing table using a custom `identifier` prefix is a sanctioned, idiomatic pattern — not a hack.
**When to use:** D-07's custom email-change flow.
**Example:**
```javascript
// Source: node_modules/better-auth/dist/api/routes/update-user.mjs:290-295 (installed v1.5.6)
const token = generateRandomString(32, "0-9", "a-z");
await ctx.context.internalAdapter.createVerificationValue({
  value: session.user.id,
  identifier: `delete-account-${token}`,
  expiresAt: new Date(Date.now() + (deleteTokenExpiresIn || 3600 * 24) * 1e3),
});
```

### Pattern 4: Fire-and-forget email send, never blocks the mutation response

**What:** `sendResetPassword` in `src/lib/auth.ts` imports `Resend` inline (avoids top-level side effects), calls `.send(...)`, and attaches `.catch()` that only logs — the calling code never `await`s the send or lets a send failure surface to the user.
**When to use:** The new `requestEmailChange` action's Resend call, identically. This is also *why* e2e tests don't need a live inbox — the DB-side `verification` row exists and is queryable regardless of whether the send itself succeeds (RESEND_API_KEY is `.optional()` in `src/env.ts`; unset in most local/CI environments).
**Example:**
```typescript
// Source: src/lib/auth.ts:24-38 (existing, read directly)
const { Resend } = await import("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails
  .send({ from: "LeoCards <noreply@leocards.com>", to: user.email, subject: "...", text: `...${url}` })
  .catch((err) => { console.error("[auth] Failed to send ...:", err); });
```

### Anti-Patterns to Avoid

- **Calling `authClient.updateUser({ name, email })` together:** better-auth's `/update-user` endpoint hard-rejects (`400 EMAIL_CAN_NOT_BE_UPDATED`) the instant `email` is present in the body **at all**, even if the value is unchanged. `email` isn't even in the endpoint's accepted TypeScript input type (`Partial<AdditionalUserFieldsInput<O>> & { name?, image? }` — confirmed from `update-user.d.mts`). Always call `updateUser({name})` alone; route email changes through the separate custom action.
- **Trusting better-auth's built-in `changeEmail` to report "email already in use":** it returns `{status:true}` unconditionally in that case (anti-enumeration by design). Don't wire the UI-SPEC's "That email is already in use." error to that endpoint's response — it will never fire.
- **Wrapping the delete-account flow in a hand-rolled multi-statement "transaction":** Neon HTTP has no transaction support (confirmed both by `src/db/index.ts`'s own comment and by an existing in-repo precedent comment in `src/lib/deck-actions.ts`'s `saveImageCards`: *"Neon HTTP has no transactions — no rollback"*). Don't try to simulate one for the delete — a single cascading `DELETE` is already atomic at the Postgres level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Current-password verification | Manual bcrypt/scrypt compare against the `account.password` hash | `authClient.changePassword({currentPassword, newPassword, revokeOtherSessions:true})` | better-auth's `/change-password` endpoint already does exactly this (`ctx.context.password.verify(...)`), throws `INVALID_PASSWORD` on mismatch — zero reason to duplicate |
| Session revocation on password change | Manually deleting rows from the `session` table | `revokeOtherSessions: true` param | Already built in, already does the "delete all, create one fresh for this device" dance correctly (verified from source) |
| Name/profile field update | A custom Drizzle `UPDATE user SET name=...` | `authClient.updateUser({name})` | Handles the session-cookie refresh (`setSessionCookie`) for you — a hand-rolled Drizzle update would leave the cookie stale until next full session refresh |
| Token generation for the email-change link | A hand-rolled random string generator | `crypto.randomUUID()` (Web Crypto, Node built-in) | 122 bits of cryptographically-secure randomness, zero new dependency, matches or exceeds better-auth's own `generateRandomString(32, "0-9", "a-z")` (~165 bits from a 36-symbol alphabet) used for its analogous delete-account token |
| Cascading delete of a user's decks/cards/recall_events/etc. | App-level "delete decks, then cards, then recall_events, then user" loop | A single `db.delete(user).where(eq(user.id, userId))`, relying on the schema's existing `onDelete: "cascade"` FKs | Postgres enforces cascade *inside* the execution of that one statement — an app-level loop is strictly more code, more round-trips, and more failure modes for the identical guaranteed outcome |

**Key insight:** Every "hard part" of this phase (password verification, session refresh, cascade delete) is already solved either by better-auth itself or by the database's own referential-integrity engine. The only genuinely new logic is ~70 lines split across `account-actions.ts` and one Route Handler for D-07's custom verification token — everything else is composition of existing, working primitives.

## Common Pitfalls

### Pitfall 1: better-auth's built-in `changeEmail` is NOT the simple "applies immediately" landmine the CONTEXT.md note assumed — but it's still the wrong tool

**What goes wrong:** The CONTEXT.md's landmine note says "better-auth's built-in changeEmail applies immediately for unverified users." Reading the actual v1.5.6 source shows this is only *half* right: `canUpdateWithoutVerification = session.user.emailVerified !== true && options.user.changeEmail.updateEmailWithoutVerification` — immediate application requires **both** an unverified user **and** the developer explicitly opting in via `updateEmailWithoutVerification: true`. Left unset (the default), an unverified user hitting `changeEmail` with `emailVerification.sendVerificationEmail` configured actually gets routed to the **same deferred-verification branch** a verified user would use elsewhere in the app.
**Why it happens:** The training-data-era mental model of "unverified email = changes apply instantly" doesn't match this installed version's actual conditional logic, which gates instant-apply behind a second, separate opt-in flag.
**How to avoid:** Don't take either the CONTEXT.md note or general better-auth folklore at face value — read the installed source (done here). In this specific case it doesn't change the recommendation (still: don't use the built-in endpoint), because of Pitfalls below, but it changes *why*.
**Warning signs:** If a future maintainer "fixes" this by adding `user.changeEmail.enabled: true` + `emailVerification.sendVerificationEmail` to `auth.ts` expecting instant-apply to be blocked automatically, they must NOT also set `updateEmailWithoutVerification: true` — that one flag flips the behavior back to instant.

### Pitfall 2: better-auth's built-in `deleteUser` requires a fresh session (≤24h) or a password — conflicts with D-12

**What goes wrong:** `deleteUser`'s handler (update-user.mjs:307-311) throws `SESSION_EXPIRED` ("Session expired. Re-authenticate to perform this action.") whenever `ctx.body.password` is absent AND the current session's `createdAt` is older than `sessionConfig.freshAge` (default `3600*24` = 24 hours, confirmed in `create-context.mjs:145`; **not overridden anywhere in this project's `auth.ts`**). LeoCards has no session-refresh mechanism that rotates `createdAt` on ordinary use (sliding refresh only extends `expiresAt`/`updatedAt` on the same row) — so any user who has been continuously logged in for more than a day (normal for a daily-habit app) will fail this check.
**Why it happens:** better-auth treats account deletion as a "sensitive" operation requiring recent re-authentication by default, which is a reasonable default in isolation but directly conflicts with D-12's explicit, deliberate "no password re-entry" decision.
**How to avoid:** Use a custom server action (`deleteAccount()` in `account-actions.ts`) that performs the delete directly via Drizzle, bypassing better-auth's `/delete-user` endpoint (and its freshness check) entirely. This also means `user.deleteUser.enabled` never needs to be set in `auth.ts`.
**Warning signs:** If the built-in endpoint is used anyway, this will pass every manual QA click-through done shortly after logging in, then fail unpredictably for real users days later — exactly the kind of bug that doesn't show up until production. `SESSION_NOT_FRESH`/`SESSION_EXPIRED` in any error log from `/api/auth/delete-user` is the signature.
**Alternative if the built-in endpoint is preferred for any reason:** set `session: { freshAge: 0 }` in `auth.ts`. This is narrowly scoped — grep-confirmed the only other consumer of `sessionConfig.freshAge` is `freshSessionMiddleware`, which is exported by better-auth core but **not attached to any endpoint this project actually uses** (it's a plugin-author utility; LeoCards has zero plugins beyond `nextCookies()`). Low risk, but still an app-wide config change for one narrow flow — the custom-action approach is cleaner and is the recommendation.

### Pitfall 3: Neon HTTP has no transactions — but cascading delete doesn't need one

**What goes wrong:** It's tempting to assume the "wipe everything on delete" requirement needs a JS-level transaction wrapping multiple DELETE statements, which the Neon HTTP driver (`drizzle-orm/neon-http`, confirmed in `src/db/index.ts`) cannot provide.
**Why it happens:** Conflating "atomic multi-table wipe" with "needs a client-orchestrated transaction." They're different things.
**How to avoid:** `ON DELETE CASCADE` is enforced by PostgreSQL itself as part of executing a single `DELETE` statement — `DELETE FROM "user" WHERE id = $1` triggers the cascade to `session`, `account`, `decks` (→ `cards` → `recall_events`), `milestones_seen`, and `habitat_metadata` **atomically, server-side, within that one statement's execution**, regardless of whether the calling driver supports multi-statement client transactions. Confirmed: every one of those tables' FK in `src/db/schema.ts` declares `.references(() => user.id, { onDelete: "cascade" })` (or transitively via `decks`/`cards`). No JS transaction needed.
**Warning signs:** None expected if a single `db.delete(user).where(...)` is used. A red flag would be seeing multiple separate `db.delete(...)` calls for decks/cards/etc. in a PR for this feature — that's solving an already-solved problem with more code and more failure surface.

### Pitfall 4: `verification` table has no FK to `user` — pending rows aren't cascade-cleaned

**What goes wrong:** Unlike every app table, `verification` (`id, identifier, value, expiresAt, createdAt, updatedAt` — read directly from `src/db/schema.ts`) has **no `userId` foreign key at all**. If a user deletes their account while an email-change verification is pending, that row survives the delete.
**Why it happens:** better-auth's core schema design keeps `verification` generic/identifier-keyed rather than user-FK'd (it's shared across password-reset, email-verify, and any custom use).
**How to avoid:** Two defenses, both cheap: (1) `deleteAccount()` proactively deletes `WHERE identifier = 'change-email:' || userId` as a hygiene step; (2) the verify-route independently re-checks "does this user still exist" before applying the update (handles the case where cleanup #1 didn't run, e.g., a request made after the row's creation but processed out of order — belt and suspenders).
**Warning signs:** A stale, unclickable-but-still-present verification row is harmless (worst case: an expired-link message on click) — this is a hygiene concern, not a security or correctness one.

### Pitfall 5: Email case-sensitivity mismatch between signup and a hand-rolled uniqueness check

**What goes wrong:** `src/db/schema.ts`'s `user.email` column is `text().unique()` — a **case-sensitive** Postgres unique constraint. But better-auth's own sign-up flow normalizes every email to lowercase before storing (`normalizedEmail = email.toLowerCase()`, confirmed in `sign-up.mjs:165`). If the custom `requestEmailChange` uniqueness check doesn't also lowercase its input, `"Josh@Example.com"` could be accepted as "unique" even though `"josh@example.com"` already exists — silently violating the app's actual (convention-enforced, not DB-enforced) uniqueness invariant.
**Why it happens:** The DB constraint is case-sensitive; the application-level convention is not. Easy to miss if only the DB constraint is considered "the" uniqueness rule.
**How to avoid:** `.toLowerCase()` the candidate email before both the uniqueness `SELECT` and the final `UPDATE user SET email = ...`.
**Warning signs:** A "successful" email change to a case-variant of an existing email that then can't sign in cleanly (two rows differing only by case, one of which is now orphaned/unreachable via normal lowercase-normalized sign-in).

### Pitfall 6: Email link pre-fetching can burn a single-use GET token before a human clicks it

**What goes wrong:** Some corporate email security gateways (link-scanning proxies) pre-fetch URLs found in email bodies before delivery, which would consume a single-use, GET-triggered verification token before the actual recipient ever sees the email.
**Why it happens:** Industry-standard email security scanning behavior, not specific to this app's implementation.
**How to avoid:** This is a known, accepted tradeoff of *any* email-link-based verification flow (better-auth's own `/verify-email` and `/delete-user/callback` use the identical GET-consumes-token pattern — this isn't a risk introduced by the custom design). No code change needed: the existing "That verification link has expired. Edit your email again to send a new one." UI state already absorbs this failure mode gracefully — the user just re-requests.
**Warning signs:** Low real-world likelihood for LeoCards' personal/individual user base (this is predominantly a large-enterprise-inbox phenomenon). Flagged for awareness, not a blocker.

### Pitfall 7: `AccountBack` cannot copy `HBack` verbatim — it must be a Client Component

**What goes wrong:** `HBack` (`src/components/daybreak/h-back.tsx`) is deliberately RSC-safe — a bare `next/link`, no `"use client"`, no state. Copy-pasting it for `AccountBack` would make D-04's dirty-form intercept impossible (a Server Component can't hold `onClick`/state).
**Why it happens:** The two components look visually identical (per UI-SPEC) but have different interactivity requirements.
**How to avoid:** `AccountBack` needs `"use client"`, reads `useAccountDirty()`, and conditionally calls `preventDefault`-equivalent (intercept via `useRouter().push` gated behind a dialog-open check) instead of rendering a bare `<Link>`. Already correctly specified in UI-SPEC §Net-new — flagging here so the distinction isn't lost during implementation.

### Pitfall 8: `RESEND_API_KEY` is optional — email silently no-ops in dev/CI, and that's fine

**What goes wrong:** A test or manual QA session run without `RESEND_API_KEY` set (the default for local dev per `src/env.ts`'s `.optional()`) will never actually deliver the verification email.
**Why it happens:** Deliberate, pre-existing project convention (confirmed in `src/env.ts` and `sendResetPassword`'s `.catch()`-only error handling) — not something to "fix" for this phase.
**How to avoid:** Don't make `requestEmailChange`'s success path depend on the Resend call succeeding — the `verification` DB row is the actual source of truth and must be written and queryable regardless of send outcome. This is also the deliberate e2e test seam (see Validation Architecture).
**Warning signs:** None — this is expected, existing, and desired behavior. Just don't accidentally `await` the Resend call and propagate its rejection into the user-facing error path.

### Pitfall 9: Single "Save" button must sequence two independent mutations, not send `email` through `updateUser`

**What goes wrong:** D-06 wants "one submit, one spinner" for a form that can change name AND email together. Naively building one combined payload breaks on Pitfall/Anti-Pattern above (`EMAIL_CAN_NOT_BE_UPDATED`).
**Why it happens:** The UI presents one form; the backend requires two independent calls.
**How to avoid:** Under one `isPending` state, sequence: (1) if `name` changed, `await authClient.updateUser({name})` — on failure, show the generic error and stop; (2) if `email` changed (and step 1 succeeded or wasn't needed), `await requestEmailChange(newEmail)` — map its `error: "email-taken"` result to the specific inline error, anything else to the generic fallback; (3) on full success, `router.refresh()` and show either the pending-email banner (if email changed) or the "Details updated" fade (if only name changed — email-changed submissions should NOT also flash "Details updated", since the pending banner already communicates the outcome; this specific sequencing nuance isn't explicitly pinned in the UI-SPEC — flagged as Assumption A5 below for the executor/UI-checker to confirm).
**Warning signs:** A submit that changes both fields but only shows one of the two success signals (or shows both, which would look like a bug) is the thing to watch for in review.

### Pitfall 10: All required Daybreak atoms already exist — don't rebuild any of them

**What goes wrong:** Building a new `PendingBanner` or a bespoke dialog styling when the UI-SPEC's referenced atoms already do the job.
**Why it happens:** Not checking what's already in `src/components/daybreak/` before writing new UI.
**How to avoid:** Confirmed by direct source read — `ACBanner` (`ac-banner.tsx`), `Card` (`card.tsx`), `TField`, `TBtn`, and the shadcn `Dialog`/`Button` overrides used by `card-edit-dialog.tsx` all already exist and match the UI-SPEC's component inventory exactly. Note: `Card` currently has **zero existing usages anywhere in the tree** (confirmed via UI-SPEC's own note) — this phase is its first real deployment, so give it slightly extra visual QA attention since it's unproven in production layout, not because the component itself is suspect.

### Pitfall 11: Component tests need the jsdom pragma; server-action tests need the `vi.hoisted` mock shape

**What goes wrong:** `vitest.config.ts` defaults `environment: "node"` project-wide. A new component test file that omits `// @vitest-environment jsdom` at the top will fail on any DOM API (`render`, `fireEvent`).
**Why it happens:** Project-wide default is Node for speed; only files that need a DOM opt in per-file.
**How to avoid:** Copy `src/components/card-edit-dialog.test.tsx`'s exact header (`// @vitest-environment jsdom` + `@testing-library/react` imports) for `account-details-card.test.tsx`, `change-password-card.test.tsx`, `delete-account-row.test.tsx`. For `account-actions.test.ts`, copy `src/lib/deck-actions.test.ts`'s exact `vi.hoisted(...)` + `vi.mock("@/lib/auth", ...)` + `vi.mock("@/db", ...)` shape (extended to also mock `auth.api.signOut`, not just `getSession`).
**Warning signs:** "document is not defined" errors are the signature of a missing jsdom pragma.

### Pitfall 12: This is a Phase-22-lesson surface — reducer-only tests would stay green on a dead UI

**What goes wrong:** Testing only the pure logic (e.g., "does `requestEmailChange` return the right shape") without ever rendering `AccountDetailsCard` and simulating a real type+submit would pass even if the JSX wiring (onChange handlers, button `onClick`) were completely broken.
**Why it happens:** Pure-logic tests are easier to write and can create false confidence.
**How to avoid:** Every inline-edit surface (`AccountDetailsCard`, `ChangePasswordCard`) needs at least one RENDERED-component test that does `render()` → `fireEvent.change()` on the actual input → `fireEvent.click()` on the actual Save/Update button → `waitFor()` the mocked action was called with the right args. `card-edit-dialog.test.tsx` is the exact template (see Code Examples §G).

### Pitfall 13: Header logout removal — exact e2e blast radius (grep-confirmed, not estimated)

**What goes wrong:** Assuming the header-glyph swap (D-01) only affects visual/UI-SPEC concerns.
**How to avoid:** Grep-confirmed (`e2e/` + `scripts/` full-tree search, this session) exactly these hits and no others:

| File | Lines | Current selector | Fix |
|------|-------|-------------------|-----|
| `e2e/01-auth-signup-login.spec.ts` | 48, 70, 99 | `page.getByRole("button", { name: "Sign out" }).click()` | Navigate to `/account` first (`page.getByTestId("account-nav-btn").click()`), then click `getByRole("button", {name:"Sign out"})` (now `account-logout-btn` — same accessible name, unchanged) |
| `e2e/10-mobile-responsive.spec.ts` | 46 | `expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()` | Retarget to assert `page.getByTestId("account-nav-btn")` is visible in the header instead |

`scripts/qa-*.mjs`: zero DOM-selector hits (confirmed via `Sign out|signOut|logout|sign-out` grep across `scripts/`) — those scripts drive the API directly, unaffected. No other e2e spec file references "Sign out"/`LogoutButton` in any form. Both files must be added to the owning plan's `files_modified`.

## Code Examples

### §A — RSC page shell (pattern, not final code — matches `dashboard/page.tsx`)
```typescript
// Source pattern: src/app/(protected)/dashboard/page.tsx (existing, read directly)
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null; // layout.tsx already redirects
  const pending = await getPendingEmailChange(session.user.id as UserId);
  const { verified } = await searchParams;
  // render chrome + AccountDetailsCard(user, pending) + ChangePasswordCard + ... 
}
```

### §B — Name edit (built-in, zero config)
```typescript
// Client component — authClient already exposes this, no auth.ts change needed
const { error } = await authClient.updateUser({ name: values.name });
// NEVER: authClient.updateUser({ name: values.name, email: values.email })
//        — throws 400 EMAIL_CAN_NOT_BE_UPDATED even if email is unchanged.
```

### §C — Email change request (custom, D-07)
```typescript
// src/lib/account-actions.ts
"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { env } from "@/env";

const PENDING_EMAIL_PREFIX = "change-email:";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — tune as needed, see Open Questions

export async function requestEmailChange(newEmailRaw: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;
  const newEmail = newEmailRaw.trim().toLowerCase(); // Pitfall 5

  if (newEmail === session.user.email) {
    return { ok: false as const, error: "same-email" as const };
  }

  // Honest uniqueness check — deliberately NOT anti-enumeration-masked
  // (UI-SPEC explicitly wants "That email is already in use.")
  const existing = await db.select().from(user).where(eq(user.email, newEmail));
  if (existing.length > 0) {
    return { ok: false as const, error: "email-taken" as const };
  }

  const identifier = `${PENDING_EMAIL_PREFIX}${userId}`;
  // Replace-not-additive: delete any existing pending row for this user first.
  await db.delete(verification).where(eq(verification.identifier, identifier));

  const token = crypto.randomUUID();
  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier,
    value: JSON.stringify({ token, newEmail }),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const url = `${env.NEXT_PUBLIC_APP_URL}/api/account/verify-email?token=${token}`;
  const { Resend } = await import("resend"); // fire-and-forget, Pitfall 8 / Pattern 4
  const resend = new Resend(process.env.RESEND_API_KEY);
  resend.emails
    .send({
      from: "LeoCards <noreply@leocards.com>",
      to: newEmail,
      subject: "Confirm your new LeoCards email",
      text: `Confirm your new email address: ${url}`,
    })
    .catch((err) => {
      console.error("[account] Failed to send email-change verification:", err);
    });

  return { ok: true as const };
}
```

### §D — Verify-email Route Handler (custom, D-07)
```typescript
// src/app/api/account/verify-email/route.ts
// Route Handlers are NOT cached by default for non-GET-static cases (verified
// against node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
// for the installed Next.js 16.2.1) — no `export const dynamic` needed.
import { eq, like } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, verification } from "@/db/schema";

const PENDING_EMAIL_PREFIX = "change-email:";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = request.nextUrl.origin;
  const expired = () => NextResponse.redirect(`${base}/account?verified=expired`);
  if (!token) return expired();

  // Bounded scan across pending change-email rows only (tiny table at this
  // app's scale — REQUIREMENTS.md already documents "single-user product at
  // current scale"; see Open Questions for the scaling note).
  const rows = await db
    .select()
    .from(verification)
    .where(like(verification.identifier, `${PENDING_EMAIL_PREFIX}%`));

  const match = rows.find((r) => {
    try {
      return (JSON.parse(r.value) as { token: string }).token === token;
    } catch {
      return false;
    }
  });
  if (!match || match.expiresAt < new Date()) return expired();

  const { newEmail } = JSON.parse(match.value) as { newEmail: string };
  const userId = match.identifier.slice(PENDING_EMAIL_PREFIX.length);

  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));
  if (!targetUser) {
    // "user deleted before click" — clean up and treat as expired
    await db.delete(verification).where(eq(verification.identifier, match.identifier));
    return expired();
  }

  // Race re-check: taken by someone else since the request was made
  const clash = await db.select().from(user).where(eq(user.email, newEmail));
  if (clash.length > 0 && clash[0]?.id !== userId) {
    await db.delete(verification).where(eq(verification.identifier, match.identifier));
    return expired();
  }

  await db.update(user).set({ email: newEmail, updatedAt: new Date() }).where(eq(user.id, userId));
  await db.delete(verification).where(eq(verification.identifier, match.identifier)); // prevents reuse

  return NextResponse.redirect(`${base}/account?verified=success`);
}
```
*No `callbackURL`/open-redirect surface: the redirect target is hardcoded relative to `request.nextUrl.origin`, unlike better-auth's own generic callback endpoints which accept (and must validate) an arbitrary `callbackURL` query param.*

### §E — Change password (built-in, zero config, exact error mapping)
```typescript
// Client component
const { error } = await authClient.changePassword({
  currentPassword: values.currentPassword,
  newPassword: values.newPassword,
  revokeOtherSessions: true, // D-09 — this device survives via a fresh token, others end
});
if (error) {
  if (error.code === "INVALID_PASSWORD") {
    // exact code confirmed via node_modules/@better-auth/core/dist/error/codes.mjs
    setCurrentPasswordError("That password isn't right."); // UI-SPEC copy, not error.message verbatim
  } else {
    setGenericError("Couldn't update your password. Try again.");
  }
}
```
*Error shape confirmed from source: `APIError.from(status, error)` constructs `{message: error.message, code: error.code}` (`node_modules/@better-auth/core/dist/error/index.mjs:20-25`); `BASE_ERROR_CODES.INVALID_PASSWORD = {code:"INVALID_PASSWORD", message:"Invalid password"}` (`.../error/codes.mjs:10`). Map by `.code`, never display `.message` verbatim — it won't match the UI-SPEC's copy contract.*

### §F — Delete account (custom, D-14)
```typescript
// src/lib/account-actions.ts (continued)
export async function deleteAccount() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Hygiene: clean up any pending email-change row (Pitfall 4 — not FK-cascaded)
  await db.delete(verification).where(eq(verification.identifier, `${PENDING_EMAIL_PREFIX}${userId}`));

  // Single statement — Postgres ON DELETE CASCADE wipes session, account,
  // decks→cards→recall_events, milestones_seen, habitat_metadata atomically
  // (Pitfall 3 — no JS transaction needed, Neon HTTP has none anyway).
  await db.delete(user).where(eq(user.id, userId));

  // Best-effort: session row is already gone via cascade; signOut's internal
  // deleteSession no-ops gracefully on that (its own try/catch swallows the
  // miss), and deleteSessionCookie(ctx) unconditionally clears the browser
  // cookie via the nextCookies() plugin's `after` hook (confirmed from
  // node_modules/better-auth/dist/integrations/next-js.mjs — its `after`
  // hook matches ALL endpoint calls and writes any Set-Cookie header via
  // Next's cookies() API, which is legal inside Server Actions).
  await auth.api.signOut({ headers: hdrs });
}
```
```typescript
// DeleteAccountRow (client component) — matches LogoutButton's existing exit pattern
async function handleDelete() {
  setDeleting(true);
  try {
    await deleteAccount();
    router.push("/login"); // same exit as logout, per D-14
  } catch {
    setDeleteError("Couldn't delete your account. Try again.");
  } finally {
    setDeleting(false);
  }
}
```

### §G — Rendered-component test template (Pitfall 11/12)
```typescript
// Source pattern: src/components/card-edit-dialog.test.tsx (existing, read directly)
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/account-actions", () => ({
  requestEmailChange: vi.fn(async () => ({ ok: true })),
  deleteAccount: vi.fn(async () => undefined),
}));
// ... render(<AccountDetailsCard .../>), fireEvent.change on the actual TField,
// fireEvent.click on the actual Save button, waitFor the mock call args.
```

## State of the Art

| Old assumption (CONTEXT.md landmine note) | What the installed v1.5.6 source actually shows | Impact |
|---|---|---|
| "better-auth's built-in changeEmail applies immediately for unverified users" | Immediate-apply requires **both** unverified **and** an explicit `updateEmailWithoutVerification: true` opt-in — left unset, unverified users go through the same deferred path as verified ones | Doesn't change the recommendation (still avoid the built-in endpoint), but changes the reasoning — see Pitfall 1 |
| (implicit) "deleteUser + `enabled:true` is a drop-in fit for D-12" | `deleteUser` requires a fresh (≤24h) session or a password when no password is supplied | Directly conflicts with D-12; drove the custom-action recommendation — see Pitfall 2 |
| (implicit) "Neon HTTP's no-transaction constraint is a blocker for atomic cascade delete" | `ON DELETE CASCADE` is a database-engine guarantee scoped to one statement's execution, independent of client transaction support | No blocker at all — see Pitfall 3 |

**Nothing deprecated.** better-auth 1.5.6 is the currently-installed version; this research didn't check for a newer release since the phase makes no version-bump recommendation (out of scope — zero new deps, zero version changes).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 24-hour token TTL for the email-change verification link is a reasonable default | Code Examples §C | Low — a single named constant (`TOKEN_TTL_MS`), trivially tunable later; not user-facing as a promise anywhere in the copy |
| A2 | Folding "already used" (reuse) and "target email taken by someone else since the request" into the same `?verified=expired` UI state (rather than adding a third state) is acceptable | Code Examples §D, Pitfall 6 | Low — UI-SPEC only defines two outcomes (`success`/`expired`); a distinct third message would be a minor copy addition, not a redesign |
| A3 | Leaving `emailVerified` unchanged (`false`) after a successful email-change verification, rather than flipping it to `true` since ownership of the new inbox was just proven | Code Examples §D | Low — either choice is internally consistent; flipping it would make this one user's account state diverge from every other LeoCards user's (`emailVerified` is false for 100% of users today), which seemed like unwanted asymmetry, but this is a judgment call, not a verified requirement |
| A4 | A single `WHERE identifier LIKE 'change-email:%'` scan-then-JS-filter for the verify-route's token lookup is acceptable performance at this app's scale, rather than a schema change to index by token directly | Code Examples §D | Low — REQUIREMENTS.md's own Out-of-Scope section states "single-user product at current scale"; the scanned set is bounded to concurrently-pending email changes only (realistically 0-5 rows), not the whole `verification` table |
| A5 | On a combined name+email save, the "Details updated" quiet fade should NOT also fire when the email-changed pending banner is about to show (i.e., the banner alone is the success signal for that submission) | Pitfall 9 | Low-medium — UI-SPEC doesn't explicitly disambiguate this combined case; a wrong guess here is a one-line conditional fix during UI review, not a rework |
| A6 | `src/lib/auth.ts` needs literally zero changes for this entire phase | Summary | Medium if wrong — this is the load-bearing claim of the whole research; verified by reading `updateUser`/`changePassword`'s source directly (neither checks a config flag) and by design (the custom actions for D-07/D-14 don't touch better-auth endpoints at all). If a future requirement needs the built-in `changeEmail`/`deleteUser` after all, this assumption would need revisiting — but nothing in this phase's locked decisions points that direction |

## Open Questions

1. **Exact email-change token TTL (24h chosen, see A1).**
   - What we know: better-auth's own analogous flows use either 1h (`emailVerification.expiresIn` default) or 24h (`deleteUser`'s `deleteTokenExpiresIn` default) depending on which flow.
   - What's unclear: no explicit user-facing promise exists yet ("this link expires in ___").
   - Recommendation: ship 24h as a single named constant; if the planner wants a different value, it's a one-line change, not a design change.

2. **Rate-limiting `requestEmailChange` / its resend affordance.**
   - What we know: `src/lib/rate-limit.ts` already provides a reusable `createRateLimiter` factory, already used identically in `src/app/api/study/complete/route.ts` (10 req/min pattern).
   - What's unclear: whether this phase's scope wants abuse protection on the resend click (CONTEXT.md doesn't mention it; UI-SPEC's discretion note only mentions "resend affordance (if any)").
   - Recommendation: optional, cheap addition (e.g., 5 requests/hour per user) using the existing utility — Claude's Discretion territory, not blocking.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon Postgres (`DATABASE_URL`) | All account mutations | ✓ (already configured, existing app) | — | — |
| Resend (`RESEND_API_KEY`) | Email-change verification send | Optional (`.optional()` in `src/env.ts`) | ^6.9.4 installed | Fire-and-forget `.catch()` — DB row (source of truth) is written regardless; e2e reads the token from the DB directly (see Validation Architecture) |
| `NEXT_PUBLIC_APP_URL` | Building the verify-email link | ✓ (required, `z.url()`, already validated) | — | — |

No missing dependencies block this phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 (`vitest.config.ts`, `environment: "node"` default, jsdom per-file via pragma) |
| Config file | `vitest.config.ts` (existing, no changes needed) |
| Quick run command | `npx vitest run src/lib/account-actions.test.ts src/lib/account-queries.test.ts src/components/account-details-card.test.tsx src/components/change-password-card.test.tsx src/components/delete-account-row.test.tsx` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map

| Capability | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| Name edit | `updateUser({name})` called with correct value on Save | unit (rendered) | `npx vitest run src/components/account-details-card.test.tsx` | Wave 0 |
| Email change request | uniqueness rejection, replace-on-second-request, DB row shape | unit | `npx vitest run src/lib/account-actions.test.ts` | Wave 0 |
| Email verify route | success/expired/reused/deleted-user/race-taken outcomes | unit (mocked DB) | `npx vitest run src/app/api/account/verify-email/route.test.ts` | Wave 0 |
| Change password | current-password error maps to exact copy, `revokeOtherSessions:true` always passed | unit (rendered) | `npx vitest run src/components/change-password-card.test.tsx` | Wave 0 |
| Delete account | confirm flow, cascade call shape, redirect | unit (rendered) + unit (action) | `npx vitest run src/components/delete-account-row.test.tsx src/lib/account-actions.test.ts` | Wave 0 |
| Full account flow, real pipeline | reach → edit → password change → logout → (separately) delete | e2e | `npx playwright test e2e/25-my-account.spec.ts` | Wave 0 |
| Header blast radius | existing sign-out-dependent specs still pass | e2e | `npx playwright test e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` | Existing — needs retarget, see Pitfall 13 |

### Sampling Rate

- **Per task commit:** targeted `npx vitest run <changed test files>`
- **Per wave merge:** `npm test` (full vitest suite) + the two retargeted e2e specs
- **Phase gate:** `npm test` + `npx playwright test e2e/25-my-account.spec.ts e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` green before `/gsd:verify-work`

### Email-send seam for e2e (no live inbox available)

Per Pitfall 8 / Pattern 4, the Resend send is fire-and-forget and cannot be observed by a test without a live inbox. **The seam is the DB row itself**: after triggering `requestEmailChange` in an e2e test (via the real UI), query the `verification` table directly for `identifier = 'change-email:' || userId` (a small test-only helper in `e2e/helpers.ts`, e.g. `getPendingEmailChangeToken(userId)` using the same Drizzle `db` client, or — if the e2e harness runs against a deployed environment without direct DB access — a `DEBUG_CHEAT_SECRET`-gated read endpoint mirroring the existing `/api/debug/state` pattern), extract the token, then `page.goto('/api/account/verify-email?token=...')` directly to simulate the click. This exercises the full verify-route logic end-to-end without ever needing Resend to actually deliver anything — consistent with QAOB-01..04's existing "QA-gated, never customer-visible" pattern already established in this codebase (Phase 14).

**If direct DB/debug-endpoint access proves impractical within this phase's scope:** mark the full request→click→success round-trip as unit-covered (Route Handler tested directly with a hand-inserted DB row, no HTTP/email involved) + HUMAN-UAT for the true end-to-end email delivery, rather than skipping test coverage of the round-trip logic entirely.

### Wave 0 Gaps

- [ ] `src/lib/account-actions.test.ts` — covers `requestEmailChange`, `deleteAccount`
- [ ] `src/lib/account-queries.test.ts` — covers `getPendingEmailChange`
- [ ] `src/app/api/account/verify-email/route.test.ts` — covers all 5 verify-route outcomes (success, expired, no-token, deleted-user, email-race)
- [ ] `src/components/account-details-card.test.tsx`, `change-password-card.test.tsx`, `delete-account-row.test.tsx` — rendered-component tests (Pitfall 12)
- [ ] `e2e/25-my-account.spec.ts` — new spec, uses `e2e/helpers.ts`'s existing `testEmail()`/`signUpWithDeck()` throwaway-user pattern
- [ ] Test-only pending-token read seam (DB helper or debug endpoint) — needed before the e2e spec can cover the verify-click path

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | No new auth mechanism introduced; `changePassword` reuses better-auth's existing `ctx.context.password.verify` (scrypt-based, bundled) — never hand-roll |
| V3 Session Management | Yes | `revokeOtherSessions:true` on password change (D-09); full session cascade-delete on account delete; cookie clearing via `auth.api.signOut()`/`nextCookies()` (verified from source, not assumed) |
| V4 Access Control | Yes | Every new server action re-derives `userId` from `auth.api.getSession` — never trusts a client-supplied id, matching `deck-actions.ts`'s established pattern exactly; the verify-email Route Handler resolves `userId` from the **server-stored** token mapping only, never from client input |
| V5 Input Validation | Yes | zod schemas for password (reuse signup's `.min(8)`) and email (`z.string().email(...)`); all DB access via Drizzle's parameterized query builder — no raw SQL string interpolation anywhere in this phase's new code |
| V6 Cryptography | Yes (token generation only) | `crypto.randomUUID()` (Web Crypto / Node built-in, ~122 bits) for the email-change token — never hand-roll a random-string generator; password hashing is entirely better-auth's existing responsibility, untouched by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Email enumeration via the "already in use" error | Information Disclosure | Accepted, explicit tradeoff — the UI-SPEC deliberately wants this honest error for a low-stakes personal app; documented here so it's a conscious choice, not an oversight (contrast with better-auth's own anti-enumeration default in the built-in `changeEmail`, which this phase deliberately does NOT use) |
| IDOR on account mutations | Tampering / Elevation of Privilege | Every mutation re-derives `userId` server-side from the session; zero client-supplied user/account IDs accepted anywhere in this phase's new surface |
| Open redirect via the verify-email link | Tampering | The custom Route Handler hardcodes its redirect target relative to `request.nextUrl.origin` — no `callbackURL`-style client-controlled redirect parameter exists in this design (unlike better-auth's own generic callback endpoints, which accept and must separately validate one) |
| Single-use token reuse/replay | Tampering | Verification row is deleted immediately upon successful consumption (Code Examples §D); a second click with the same token finds no matching row and lands on the `expired` state |
| Session fixation after password change | Session Management | `revokeOtherSessions:true` explicitly deletes all other session rows and issues a fresh token for the current device only — this is better-auth's existing, already-verified behavior, not new code |

## Sources

### Primary (HIGH confidence — installed source read directly this session)
- `node_modules/better-auth/dist/api/routes/update-user.mjs` — full `updateUser`, `changePassword`, `setPassword`, `deleteUser`, `deleteUserCallback`, `changeEmail` implementations (v1.5.6)
- `node_modules/better-auth/dist/api/routes/email-verification.mjs` — `verifyEmail`, `createEmailVerificationToken`, `sendVerificationEmailFn` (JWT-based, stateless — confirms Pitfall/Summary finding)
- `node_modules/better-auth/dist/api/routes/session.mjs` — `sensitiveSessionMiddleware`, `freshSessionMiddleware`, sliding-refresh `updateAge` logic
- `node_modules/better-auth/dist/api/routes/sign-out.mjs` — confirms `signOut` unconditionally clears the cookie regardless of DB session state
- `node_modules/better-auth/dist/context/create-context.mjs` — `freshAge: 3600*24` default, `updateAge: 1440*60` default, `minPasswordLength: 8`/`maxPasswordLength: 128` defaults
- `node_modules/better-auth/dist/integrations/next-js.mjs` — `nextCookies()` plugin, confirms server-side `auth.api.*` calls correctly propagate cookies via Next's `cookies()` API
- `node_modules/@better-auth/core/dist/error/codes.mjs` and `.../error/index.mjs` — exact `BASE_ERROR_CODES` text + `APIError.from()` `{code, message}` shape
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `.../02-guides/redirecting.md` — Next.js 16.2.1 Route Handler conventions, caching defaults, `redirect()` vs `NextResponse.redirect()` (per AGENTS.md directive to verify against installed docs, not training data)
- This project's own source, read directly: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/db/schema.ts`, `src/db/index.ts`, `src/env.ts`, `src/app/(protected)/layout.tsx`, `src/app/(protected)/dashboard/page.tsx`, `src/components/logout-button.tsx`, `src/components/app-header.tsx`, `src/components/dashboard-header.tsx`, `src/components/card-edit-dialog.tsx` + `.test.tsx`, `src/components/daybreak/{ac-banner,card,h-back,t-field,t-btn}.tsx`, `src/lib/deck-actions.ts` + `.test.ts`, `src/lib/rate-limit.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/api/study/complete/route.ts`, `e2e/helpers.ts`, `e2e/01-auth-signup-login.spec.ts`, `e2e/10-mobile-responsive.spec.ts`, `vitest.config.ts`, `playwright.config.ts`, `biome.json`, `package.json`

### Secondary (MEDIUM confidence)
- None — every load-bearing claim in this research was directly verified against installed source rather than inferred.

### Tertiary (LOW confidence)
- Pitfall 6 (email link pre-fetch/scanning burning tokens) is general email-security-industry knowledge, not verified against a specific LeoCards-relevant source — flagged as awareness-only, not a required mitigation, since the existing UI already absorbs the failure mode gracefully.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, every existing one confirmed via direct `package.json`/`node_modules` read
- Architecture (D-07/D-14 mechanism choice): HIGH — both recommendations are grounded in direct reads of the actual installed better-auth v1.5.6 endpoint source, not training data or documentation summaries
- Pitfalls: HIGH — every pitfall traces to a specific source line or a direct grep result from this session, not inference
- Security domain: HIGH — no new auth primitives introduced; every control is either "reuse better-auth's existing, verified behavior" or "mirror `deck-actions.ts`'s already-shipped ownership-check pattern"

**Research date:** 2026-07-19
**Valid until:** 30 days (stable dependency set, no version-bump surface) — re-verify sooner only if `better-auth` is upgraded past 1.5.6, since this research's core recommendation rests on that version's exact conditional logic in `changeEmail`/`deleteUser`.
