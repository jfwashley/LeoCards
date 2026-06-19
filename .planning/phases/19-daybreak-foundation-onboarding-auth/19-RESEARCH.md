# Phase 19: Daybreak Foundation + Onboarding & Auth - Research

**Researched:** 2026-06-20
**Domain:** React/Next.js 16 presentation layer — design-system foundation, auth UX, onboarding flow, animation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Build dedicated Daybreak primitives in `src/components/daybreak/` — `TField`, `TBtn`, `Pill`, `Card` (see exact spec in CONTEXT.md).
- **D-02:** Refactor Login spike to compose these primitives; keep `LionFace`/`AuthCard`/`DaybreakAuthScene` as auth-family shell.
- **D-03:** First-visit welcome is a dedicated `/welcome` route, 3 steps: (1) Meet Leo, (2) promise + mini-habitat preview, (3) language pickers → "Start learning" → first deck → `/dashboard`.
- **D-04:** Language choice moves out of signup into welcome. Signup captures Name/Email/Password only. Native language set at welcome-completion. Method of persistence is Claude's discretion (see Priority 1 research below).
- **D-05:** Routing: signup → `/welcome` → create first deck → `/dashboard`. Login → `/dashboard`. 0-deck user at `/dashboard` redirected to `/welcome`. Replaces current `FirstVisitPicker`.
- **D-06:** Lightweight Daybreak teaser scene on welcome step 2 — sunrise gradient + Leo + habitat elements + ambient motion, pauses under `prefers-reduced-motion`. Not the full habitat (deferred Phase 24).
- **D-07:** Auth scene recolours per screen: login/signup = sunrise, forgot = daylight, reset = dusk.
- **D-08:** Preserve all auth logic — better-auth signIn/signUp/forgot/reset, react-hook-form + zod, error copy, etc.
- **D-09:** Global conventions (DSY-03): mobile-first, touch ≥44px, inline per-field validation, one full-width primary per screen with spinner + form disabled while submitting.

### Claude's Discretion
- Exact file layout/prop shapes of the Daybreak primitives.
- How native-language persistence is wired post-signup (researcher/planner decide).
- Whether to commit the existing spike as the phase's first atomic commit before refactoring.
- Precise dropdown component for the language pickers.

### Deferred Ideas (OUT OF SCOPE)
- Full habitat-scene reuse for the welcome preview → Phase 24.
- Account/Settings page redesign → future milestone.
- Commissioned Leo art / real brand mark → future.
- Study screen redesign → Phase 20.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSY-01 | Daybreak tokens (cream/amber palette, type scale, spacing, radii, shadows) and fonts (Baloo 2 + Figtree) applied app-wide | Already live in `globals.css` + `layout.tsx` — needs verification/hardening, not new work |
| DSY-02 | Shared Daybreak components exist and are reused across screens: LionFace, labeled field, primary button (with spinner/disabled), pill/chip, card surface | The primitives port: `TField`, `TBtn`, `Pill`, `Card` in `src/components/daybreak/` |
| DSY-03 | Every redesigned screen mobile-first, touch ≥44px, inline per-field validation, single full-width primary with spinner | Enforced via the TField/TBtn primitive design |
| ONB-01 | Login redesigned to Daybreak | Spike exists; must refactor to use TField/TBtn primitives |
| ONB-02 | Signup redesigned to Daybreak, no language field | Remove nativeLanguage field from form, reskin to Daybreak |
| ONB-03 | Forgot password redesigned to Daybreak | Reskin existing page, preserve better-auth requestPasswordReset |
| ONB-04 | Reset password redesigned to Daybreak | Reskin existing page, preserve better-auth resetPassword + token handling |
| ONB-05 | First-visit welcome — 3-step flow, creates first deck, routes to Dashboard | New `/welcome` route in `(auth)` group; updateUser for nativeLanguage; createDeck for target |
| ONB-06 | Empty deck + no-search-results states match Daybreak | Standalone UI states to deliver wherever they render (dashboard) |
</phase_requirements>

---

## Summary

Phase 19 is a presentation-layer redesign with one intentional data-flow change (D-04). The Daybreak spike already lands DSY-01 and the auth shell skeleton; this phase formalises the primitives, ports all four auth screens, builds the 3-step `/welcome` flow, and delivers the empty-state designs.

The four research priorities have concrete answers grounded in the actual codebase:

1. **D-04 language persistence** — `authClient.updateUser({ nativeLanguage })` is the cleanest path. It is available on the `authClient` via the `/update-user` endpoint (confirmed in `better-auth@1.5.6`), accepts `AdditionalUserFieldsInput` which includes `nativeLanguage` thanks to the `inferAdditionalFields` plugin already wired in `auth-client.ts`. No direct Drizzle update or server action needed.

2. **`/welcome` routing** — The route belongs in `src/app/(auth)/welcome/page.tsx` (same route group as login/signup, sharing the auth layout). The 0-deck redirect guard belongs in **`(protected)/dashboard/page.tsx` as a Server Component `redirect()`** — exactly the same pattern as the existing auth guard in `(protected)/layout.tsx`. No middleware/proxy needed.

3. **Daybreak primitives port** — `TField` and `TBtn` from `hifi-shared.jsx` map cleanly to new TSX components using `React.forwardRef` + spread of `InputHTMLAttributes`/`ButtonHTMLAttributes`, so they stay compatible with react-hook-form `register()` spreading. They can optionally wrap — but do not depend on — the shadcn `ui/input` or `ui/button` internals.

4. **Mini-habitat teaser (D-06)** — The codebase's established reduced-motion pattern is a custom `usePrefersReducedMotion()` hook (`habitat-video.tsx` lines 91-110) using `window.matchMedia('(prefers-reduced-motion: reduce)')` with an SSR-safe `useState(false)` default. The project imports `motion` from `motion/react` (v12.38.0 confirmed installed) for animatable elements.

**Primary recommendation:** Wire native-language persistence via `authClient.updateUser({ nativeLanguage })` called from the welcome step-3 client component before (or alongside) the `createDeck` server action. Use a server action to call `createDeck`. Place `/welcome` in `(auth)/welcome/`. Guard 0-deck at the dashboard Server Component with `redirect('/welcome')`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Daybreak token/font foundation | Frontend (CSS globals) | — | Pure CSS vars + `@theme` block; already in `globals.css` |
| TField/TBtn/Pill/Card primitives | Frontend (React client components) | — | Presentational atoms; no server logic |
| Login/Signup/Forgot/Reset screens | Frontend (client "use client" pages) | better-auth API | Auth calls are client→server via `authClient.*` HTTP requests |
| `/welcome` 3-step flow (steps 1–2) | Frontend (client component) | — | Pure UI state machine (step index) |
| `/welcome` step 3 — language pick | Frontend (client component) | API / Server Action | `updateUser` HTTP call + `createDeck` server action |
| `nativeLanguage` persistence | Client→ better-auth `/update-user` API | Drizzle user table (via better-auth server) | `authClient.updateUser` goes through better-auth server which writes to the user table |
| 0-deck redirect guard | API / Server Component (`dashboard/page.tsx`) | — | Server Component `redirect()` — same as existing auth guard pattern |
| Mini-habitat teaser animation | Browser (client component CSS + motion/react) | — | CSS keyframes / motion.div; gated by `usePrefersReducedMotion` |
| Empty deck / no-search-results states | Frontend (client components) | — | Presentational; data passed as props from parent |

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.5.6 | Auth — signIn, signUp, forgot, reset, updateUser | Already wired; `inferAdditionalFields` plugin enables nativeLanguage on updateUser |
| `react-hook-form` | ^7.72.0 | Form state + validation | Already in use on all auth pages |
| `zod` | ^4.3.6 | Schema validation / zodResolver | Already in use |
| `motion` | ^12.38.0 | Ambient animation for welcome teaser | Already installed; imported from `motion/react`; used in `level-up-overlay.tsx`, `study-card.tsx`, `study-session.tsx` |
| `drizzle-orm` | ^0.45.1 | DB access in server actions | Already wired; `db:push` workflow (no migration files) |

### No New Packages Required

All capabilities for this phase are covered by the existing dependency tree. No `npm install` step is needed. [VERIFIED: package.json inspection]

---

## Package Legitimacy Audit

No new packages are introduced in this phase — all dependencies are existing, long-established packages in the project. Skipping package audit as not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (client component)
  │
  ├─ Auth pages (login/signup/forgot/reset)
  │    └─► authClient.signIn/signUp/requestPasswordReset/resetPassword
  │             └─► better-auth /api/auth/* (Next.js Route Handler)
  │                       └─► Drizzle → Neon Postgres (user table)
  │
  ├─ /welcome page (client component, 3 steps)
  │    ├─ Step 1: Meet Leo          (pure UI)
  │    ├─ Step 2: Promise + teaser  (motion/react ambient scene)
  │    └─ Step 3: Language pickers
  │         ├─► authClient.updateUser({ nativeLanguage })
  │         │        └─► better-auth /api/auth/update-user (writes user.nativeLanguage)
  │         └─► createDeck(targetLanguage)  [server action]
  │                  └─► Drizzle → decks table → redirect /dashboard
  │
  └─ /dashboard (server component)
       ├─ getUserDecks(userId)  →  decks.length === 0?
       │       YES → redirect('/welcome')
       │       NO  → render DeckView
       └─► (replaces FirstVisitPicker branch)
```

### Recommended Project Structure (new/changed files)

```
src/
├── components/
│   └── daybreak/
│       ├── lion-face.tsx          (existing — keep)
│       ├── auth-card.tsx          (existing — keep)
│       ├── t-field.tsx            (NEW — labeled input primitive)
│       ├── t-btn.tsx              (NEW — primary button primitive)
│       ├── pill.tsx               (NEW — pill/chip primitive)
│       └── card.tsx               (NEW — card surface primitive)
│   └── welcome/
│       ├── welcome-page.tsx       (NEW — 3-step controller, "use client")
│       ├── welcome-step-meet.tsx  (NEW — step 1: Meet Leo)
│       ├── welcome-step-promise.tsx (NEW — step 2: teaser)
│       └── welcome-step-choose.tsx  (NEW — step 3: pickers + submit)
│       └── habitat-teaser.tsx     (NEW — mini-habitat animation)
├── app/
│   └── (auth)/
│       ├── login/page.tsx         (existing spike — refactor primitives)
│       ├── signup/page.tsx        (existing — strip language field, reskin)
│       ├── forgot-password/page.tsx (existing — reskin)
│       ├── reset-password/page.tsx  (existing — reskin)
│       └── welcome/page.tsx       (NEW — thin RSC wrapper for WelcomePage)
│   └── (protected)/
│       └── dashboard/page.tsx     (existing — add 0-deck redirect)
```

### Pattern 1: Daybreak TField Primitive

**What:** A labeled input wrapper that exposes `React.forwardRef` so react-hook-form `register()` spread works directly.

**When to use:** Every text/email/password field on every Daybreak screen.

```tsx
// src/components/daybreak/t-field.tsx
import * as React from "react";

interface TFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TField = React.forwardRef<HTMLInputElement, TFieldProps>(
  ({ label, error, hint, id, ...inputProps }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold text-foreground"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={[
            "h-12 rounded-xl border-[1.5px] bg-[var(--db-field-bg)] px-3.5 text-[15px]",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            error ? "border-destructive" : "border-[#EDDFC9]",
          ].join(" ")}
          {...inputProps}
        />
        {error && (
          <p className="text-[13px] font-semibold text-destructive">{error}</p>
        )}
        {!error && hint && (
          <p className="text-[12.5px] text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  },
);
TField.displayName = "TField";
// Usage with react-hook-form:
//   <TField label="Email" error={errors.email?.message} {...register("email")} />
```

[CITED: src/app/(auth)/login/page.tsx — inline fieldClass pattern being extracted]

### Pattern 2: Daybreak TBtn Primitive

```tsx
// src/components/daybreak/t-btn.tsx
import { Loader2 } from "lucide-react";
import * as React from "react";

interface TBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
}

export function TBtn({ isPending, children, disabled, className, ...props }: TBtnProps) {
  return (
    <button
      disabled={isPending || disabled}
      className={[
        "h-[50px] w-full rounded-[14px] text-[16px] font-bold",
        "bg-primary text-primary-foreground",
        "shadow-[var(--db-btn-shadow)]",
        "hover:brightness-[0.97] disabled:opacity-60 disabled:cursor-not-allowed",
        "flex items-center justify-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {isPending ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}
```

[CITED: src/app/(auth)/login/page.tsx — Button rendering pattern being extracted]

### Pattern 3: native-language persistence via `authClient.updateUser`

**What:** Call `authClient.updateUser({ nativeLanguage })` from the welcome step-3 client component after the user picks their native language, before (or in parallel with) the `createDeck` server action.

**Why this approach:**
- `better-auth@1.5.6` exposes `/update-user` POST endpoint [VERIFIED: node_modules/better-auth/dist/api/routes/update-user.d.mts]
- `InferUserUpdateCtx` type includes `Partial<InferAdditionalFromClient<ClientOpts, "user", "input">>` which resolves to `{ nativeLanguage?: string }` because `inferAdditionalFields<typeof auth>()` is already in `auth-client.ts` [VERIFIED: node_modules/better-auth/dist/client/path-to-object.d.mts]
- The `authClient.updateUser` call goes through the better-auth server handler which writes to `user.nativeLanguage` via Drizzle — so the DB update happens without a bespoke server action and without bypassing the auth layer
- Direct Drizzle update from a server action would work but bypasses better-auth's field validation + any future hooks; `authClient.updateUser` is the right ownership boundary

**Sequencing in welcome step 3:**
```ts
// In the "Start learning" handler on WelcomeChooseStep:
const handleStart = async () => {
  setIsCreating(true);
  setCreateError(null);
  try {
    // 1. Persist native language via better-auth
    await authClient.updateUser({ nativeLanguage: selectedNative });
    // 2. Create the first deck (target language) via server action
    await createDeck(selectedTarget);
    // 3. Navigate to dashboard
    router.push("/dashboard");
  } catch {
    setCreateError("Something went wrong. Try again.");
    setIsCreating(false);
  }
};
```

[VERIFIED: better-auth@1.5.6 node_modules inspection]

**Session cookie after `updateUser`:** better-auth's `nextCookies()` plugin (last in `src/lib/auth.ts`) handles cookie sync automatically — the session is refreshed on the client after `updateUser`. No manual session refresh needed.

**Caching note:** `authClient.updateUser` hits the server at call time; no Next.js data cache is involved. The `getUserNativeLanguage` query in the dashboard Server Component reads fresh from the DB on every request (no cache tags set — this is a per-user query using `headers()` which is a dynamic function). No stale-read landmine.

### Pattern 4: 0-deck redirect in the Dashboard Server Component

**Where:** `src/app/(protected)/dashboard/page.tsx` — already a Server Component. The existing code branch at line 52 returns `<FirstVisitPicker>` when `decks.length === 0`. Replace with `redirect('/welcome')`.

**Why Server Component, not proxy/middleware:**
- In Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts`. The project has **no middleware/proxy file** — the auth guard already uses `redirect()` in a Server Component layout (see `(protected)/layout.tsx`). The 0-deck guard follows the same established pattern.
- The proxy (Edge Runtime) cannot query the DB to check deck count — it only has access to cookies/headers. The Server Component already loads `getUserDecks()` so the check is free.
- No new server infrastructure is needed.

```ts
// In dashboard/page.tsx — replace the FirstVisitPicker branch:
if (decks.length === 0) {
  redirect('/welcome');  // imported from 'next/navigation'
}
```

[VERIFIED: Next.js 16 proxy.md docs — middleware renamed to proxy; redirect() Next.js docs]
[CITED: src/app/(protected)/layout.tsx — auth guard pattern to replicate]

### Pattern 5: `/welcome` Route Placement

**Location:** `src/app/(auth)/welcome/page.tsx`

**Why `(auth)` group:**
- The `(auth)` route group already provides the correct layout: `src/app/(auth)/layout.tsx` — cream background, centered column, brand row (LionFace + "LeoCards"). The welcome flow shares this visual shell.
- The welcome screens from the handoff use the same `OnbShell` pattern as the auth screens — full-screen, brand at top, content filling the space.
- Alternative: a `(welcome)` sub-group with its own layout. But the handoff welcome screen shares the cream background and the same vertical centering. Reusing `(auth)/layout.tsx` is simpler.

**Access control:** The `(auth)` group has no access-control layout (unlike `(protected)` which checks the session). The welcome page is reached only after signup, so the user is already authenticated. Optionally add a session check inside the page or rely on the `(protected)/dashboard` redirect chain (logged-out users can't reach /welcome from any app link). For safety, the welcome page should check `auth.api.getSession()` server-side and redirect to `/login` if unauthenticated.

**Route resolution:** `(auth)/welcome/page.tsx` resolves to `/welcome` — the parentheses are not in the URL [VERIFIED: Next.js 16 route-groups.md]

### Pattern 6: Mini-Habitat Teaser (D-06 / Welcome Step 2)

**Approach:** CSS-drawn scene (matching the handoff's `D1Scene`/`D1Scene` DOM geometry style) with `motion.div` for ambient loops, gated by `usePrefersReducedMotion`.

**The established `usePrefersReducedMotion` hook** (copy from `habitat-video.tsx` lines 91-110 — extract to `src/hooks/use-prefers-reduced-motion.ts`):

```ts
// src/hooks/use-prefers-reduced-motion.ts
"use client";
import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false); // SSR-safe default: false
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
```

[CITED: src/components/habitat-video.tsx:91-110 — identical pattern used there and in habitat-3d-canvas.tsx]

**Motion approach for the teaser** — use `motion/react` (already installed, v12.38.0):

```tsx
// In HabitatTeaser ("use client"):
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export function HabitatTeaser() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative w-full h-[210px] rounded-[20px] overflow-hidden border border-[#F0E3CF] shadow-[0_10px_26px_rgba(160,110,40,0.12)]">
      {/* Static scene always renders (SSR-safe) */}
      <DaybreakTeaserScene />
      {/* Ambient motion only when reduced-motion is off */}
      {!reduced && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0 }}
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
```

[CITED: src/components/level-up-overlay.tsx — motion/react import pattern; src/components/study-card.tsx — motion usage]

**The teaser scene itself** is a simplified `DaybreakAuthScene` variant (same CSS geometry from `auth-card.tsx`) shown in a wider container (210px height, full card width) with a few extra habitat elements (small hill, grass tufts, a LionFace at center). It does NOT require Three.js, canvas, or the video pipeline — it is DOM/CSS only, matching the handoff's `HabScene level={4} mood="happy"` reference (which is also DOM/CSS in `daybreak-habitat-scene.jsx`).

### Pattern 7: Language Picker Dropdown (Welcome Step 3)

**What to use:** Native HTML `<select>` element styled to match the `OnbSelect` design from the handoff — NOT a shadcn `Select` (avoids Radix/portal complexity for a simple 3-option list).

**Rationale:**
- Only 3 languages (en, fr, es) — no search, no complex interaction.
- The `OnbSelect` handoff design is a styled div with a chevron; in production code a `<select>` + CSS can achieve the same look with built-in accessibility.
- The existing `signup/page.tsx` uses a raw `<select>` for native language (line 126-134) confirming this is the project's pattern for simple language selectors.
- Wrap in the same `TField` outer container structure (label + border + chevron via CSS `appearance-none` + background-image) so it matches `TField` visually.

```tsx
// TSelect — same visual as TField, wraps a <select>
<div className="flex flex-col gap-1.5">
  <label className="text-[13px] font-semibold text-foreground">I speak</label>
  <div className="relative">
    <select
      className="h-[52px] w-full appearance-none rounded-xl border-[1.5px] border-[#EDDFC9] bg-[var(--db-field-bg)] px-4 text-[16px] font-semibold text-foreground focus:outline-none focus:border-primary"
      value={nativeLang}
      onChange={(e) => setNativeLang(e.target.value)}
    >
      <option value="en">English</option>
      <option value="fr">French</option>
      <option value="es">Spanish</option>
    </select>
    {/* chevron icon positioned absolutely */}
  </div>
</div>
```

The target list excludes the native selection: `ALL_LANGUAGES.filter(l => l.code !== nativeLang)`.

[CITED: src/app/(auth)/signup/page.tsx:126-134 — existing raw select pattern; design/handoff-daybreak/daybreak-onboarding.jsx:32-50 — OnbSelect spec]

### Anti-Patterns to Avoid

- **Putting the 0-deck guard in a Next.js proxy file:** The project has no proxy/middleware file. Proxy cannot query the DB. The existing pattern is Server Component redirect — use that.
- **Direct Drizzle update for nativeLanguage from client code:** Server actions do DB writes, not client components. Use `authClient.updateUser` (routes through better-auth server) or a dedicated server action that calls `auth.api.getSession` + `db.update(user)`. The `authClient.updateUser` approach is cleaner (no bespoke server action needed).
- **Calling `createDeck` before `updateUser`:** If deck creation succeeds but `updateUser` fails, the user would have a deck but an unset `nativeLanguage`. Call `updateUser` first; it's idempotent on failure.
- **Using `motion/react` for the teaser on the server side:** `motion` components are client-only. The teaser component must be `"use client"` or wrapped in `dynamic({ ssr: false })`.
- **Placing `/welcome` in `(protected)` group:** The `(protected)/layout.tsx` does an auth check. Welcome is reached right after signup — the session exists. But if the welcome page were in `(protected)`, the guard checks session but not deck count, so a returning user (with decks) who somehow navigates to `/welcome` would see the welcome flow again. Keep welcome in `(auth)` and add an explicit check: if user has decks, redirect to `/dashboard`.
- **Importing `forwardRef` from React 19 differently:** React 19 still exports `forwardRef` from `'react'` — use it normally.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent native language update | Custom server action with raw Drizzle UPDATE | `authClient.updateUser({ nativeLanguage })` | better-auth owns the user table; routes through its validation + cookie refresh |
| Route auth check | Custom session parsing in page | `auth.api.getSession({ headers: await headers() })` (already in use everywhere) | Consistent with codebase pattern |
| Reduced-motion detection | New hook from scratch | Copy existing `usePrefersReducedMotion` from `habitat-video.tsx` (extract to shared hook) | SSR-safe implementation already validated |
| CSS spinner | Custom spinner | `<Loader2 className="animate-spin" />` from lucide-react (already in use on every auth page) | Consistent; already imported |

---

## Runtime State Inventory

Not applicable — this is a greenfield feature phase with new routes and a data-flow change (nativeLanguage moving from signup to welcome). No rename or migration of existing stored state.

**One data-flow note (not a migration):** Existing users who signed up with a `nativeLanguage` via the old signup form are unaffected. Their `nativeLanguage` is already set. The change only affects new signups. `nativeLanguage` has a DB-level `DEFAULT 'en'` (confirmed in `schema.ts` line 36), so new users who somehow skip the welcome will default to `"en"` without error.

---

## Common Pitfalls

### Pitfall 1: Signup redirect to `/welcome` vs `/dashboard`

**What goes wrong:** The current `signup/page.tsx` does `router.push('/dashboard')` after successful signup. After D-04, it must redirect to `/welcome` instead.

**Why it happens:** Routine oversight when removing the nativeLanguage field from signup.

**How to avoid:** Update the `onSubmit` success handler: `router.push('/welcome')` (not `/dashboard`).

**Warning signs:** E2E test `02-first-visit-deck-creation.spec.ts` will fail if the redirect goes wrong.

### Pitfall 2: 0-deck dashboard page is cached between the welcome flow and first render

**What goes wrong:** After `createDeck` completes in the welcome flow, the user is redirected to `/dashboard`. If the dashboard's Server Component response is cached, it may still see 0 decks and redirect back to `/welcome`, creating a redirect loop.

**Why it happens:** Next.js 16 caches Server Component responses by default when no dynamic functions are used. However, `dashboard/page.tsx` calls `headers()` (via `auth.api.getSession({ headers: await headers() })`), which is a dynamic function — this opts the entire page out of the static cache. Additionally, `createDeck` already calls `revalidatePath('/dashboard')` (line 53 of `deck-actions.ts`), which purges any cached response.

**Conclusion:** No additional `noStore()` or `cache: 'no-store'` needed. The existing `headers()` call + `revalidatePath` combination prevents stale data. [VERIFIED: deck-actions.ts:53]

### Pitfall 3: `authClient.updateUser` session refresh timing

**What goes wrong:** After `authClient.updateUser({ nativeLanguage })` succeeds, the cached session in memory still has the old user object. If the welcome page reads session data immediately, it sees the stale value.

**Why it happens:** The auth client caches the session locally and triggers a session refresh event on `updateUser`, but the refresh is async.

**How to avoid:** The welcome page doesn't need to re-read `nativeLanguage` after updating it — it proceeds directly to `createDeck` and `router.push('/dashboard')`. The dashboard Server Component reads `nativeLanguage` fresh from the DB via `getUserNativeLanguage` (not from the session object), so it gets the updated value. No special handling needed.

### Pitfall 4: `TField` with react-hook-form `register()` — missing `ref` forwarding

**What goes wrong:** If `TField` does not use `React.forwardRef`, the `{...register("email")}` spread (which includes `ref`) will not connect the input to react-hook-form's DOM ref. Validation errors won't trigger field focus.

**How to avoid:** Always use `React.forwardRef` on `TField` (see Pattern 1 above). Set `TField.displayName` for React DevTools.

### Pitfall 5: `motion.div` on SSR — hydration mismatch

**What goes wrong:** If the teaser renders animated elements server-side that differ from the initial client render (because `usePrefersReducedMotion` defaults `false` on server), you can get hydration warnings.

**How to avoid:** The existing `usePrefersReducedMotion` hook defaults to `false` (motion on) during SSR and switches to the actual value post-mount. This means the static scene always renders consistently. The `motion.div` elements used for ambient overlays are purely additive (rendered on top, invisible until animated) — they don't change the DOM structure between SSR and client, just animate after hydration. Pattern is already proven in `HabitatVideo`. [CITED: src/components/habitat-video.tsx:94-96]

### Pitfall 6: Welcome page accessible to logged-out users

**What goes wrong:** A logged-out user navigates directly to `/welcome` — gets the welcome flow without an active session, and the `authClient.updateUser` call fails (401), as does `createDeck`.

**How to avoid:** Add a server-side session check at the top of `(auth)/welcome/page.tsx`:
```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect('/login');
```

Optionally also check: if the user already has decks, redirect to `/dashboard` (handles browser back-navigation after completing welcome).

### Pitfall 7: `createDeck` server action called before `updateUser` completes

**What goes wrong:** If deck creation is fast and `updateUser` is slow, and the user hits dashboard before `nativeLanguage` is set, `getUserNativeLanguage` returns `"en"` (the DB default) even if the user said French.

**How to avoid:** `await authClient.updateUser(...)` is a Promise — the `await` keyword ensures it completes before `createDeck` is called. See the sequencing in Pattern 3 above.

---

## Code Examples

### Complete Welcome Step 3 Handler

```tsx
// Simplified happy-path handler for WelcomeChooseStep
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { createDeck } from "@/lib/deck-actions";

export function WelcomeChooseStep() {
  const router = useRouter();
  const [nativeLang, setNativeLang] = useState("en");
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const targetOptions = ALL_LANGUAGES.filter(l => l.code !== nativeLang);

  async function handleStart() {
    if (!targetLang) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      // 1. Persist native language (via better-auth /update-user)
      await authClient.updateUser({ nativeLanguage: nativeLang });
      // 2. Create first deck (server action, already handles auth)
      await createDeck(targetLang);
      // 3. Route to dashboard
      router.push("/dashboard");
    } catch {
      setCreateError("Something went wrong. Try again.");
      setIsCreating(false);
    }
  }

  // ... render step UI
}
```

[CITED: src/lib/auth-client.ts — authClient; src/lib/deck-actions.ts — createDeck]

### Existing E2E Tests to Update (`e2e/helpers.ts`)

The `signUpWithDeck` helper currently signs up and then calls `pickFirstDeckLanguage` (which interacts with the `FirstVisitPicker` on dashboard). After Phase 19:

- `signUpFreshUser` should land on `/welcome` (not `/dashboard`).
- `pickFirstDeckLanguage` must be reworked to interact with the welcome flow's step-3 dropdowns and "Start learning" button (not the old language-button picker).
- `signUpWithDeck` = `signUpFreshUser` + new welcome-flow helper.

The test for `01-auth-signup-login.spec.ts` line 34 which checks `getByLabel("Native language")` will break (field removed). Update expected fields.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 | Middleware file renamed; project has no middleware file, so no action needed |
| `nativeLanguage` at signup | `nativeLanguage` at welcome-completion | Phase 19 (D-04) | Signup form loses language field; welcome step 3 gains it |
| Inline `FirstVisitPicker` on dashboard | Dedicated `/welcome` route with 3-step flow | Phase 19 (D-05) | `FirstVisitPicker` component retired; dashboard gets redirect guard |
| shadcn `Input`/`Button` inline-restyled | Daybreak `TField`/`TBtn` primitives | Phase 19 (D-01/D-02) | Auth pages refactored to use new primitives |
| Tiger emoji mascot | Flat-geometric CSS `LionFace` | Already in spike | The "tiger" in old code is now Leo the lion |

**Deprecated/outdated in this phase:**
- `src/components/first-visit-picker.tsx` — replaced entirely by the `/welcome` 3-step flow. File can be deleted after the dashboard redirect guard lands.
- `nativeLanguage` field in `signup/page.tsx` zod schema — remove from `signupSchema` and the `authClient.signUp.email()` call.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `authClient.updateUser({ nativeLanguage })` correctly infers `nativeLanguage` as a valid field via `inferAdditionalFields<typeof auth>()` at runtime (not just type-level) | Priority 1 / Pattern 3 | If the field is silently ignored at runtime, nativeLanguage is never persisted. Mitigation: smoke test by logging the API response after `updateUser`. |
| A2 | The existing `(auth)/layout.tsx` (cream background, centered column, brand row) is visually compatible with the 3-step welcome screens | Pattern 5 / /welcome routing | If the layout needs adjustment (e.g., the welcome screens need more vertical space), the `(auth)/layout.tsx` may need a welcome-specific variation |

---

## Open Questions

1. **Should "Skip" on welcome steps 1 and 2 go directly to step 3 or exit the welcome flow?**
   - What we know: The handoff shows "Skip" on steps 1 and 2. Step 3 (language picker) has no Skip.
   - What's unclear: Does "Skip" on step 1 or 2 jump directly to step 3 (language pick is mandatory) or exit to dashboard (creating no deck)?
   - Recommendation: Treat "Skip" as "jump to step 3" — the language-pick step is required (you cannot use the app without a deck). The planner should specify this behavior.

2. **Should `welcome/page.tsx` use the existing `(auth)/layout.tsx` shell or get its own layout?**
   - What we know: The auth layout provides the brand row + cream bg + centered column at max-w-[420px]. The welcome handoff screens are full-height with different vertical rhythm (flex col, padding 12px 24px 24px, gap 18).
   - What's unclear: Whether max-w-[420px] constraint from auth layout clips the welcome teaser (210px height + scene).
   - Recommendation: The 420px constraint is fine for the teaser (the scene is 100% width within the card, bounded by the column width). No separate layout needed — but the welcome page should render its own full-height wrapper inside the auth layout shell.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev server | ✓ | (installed — project runs) | — |
| `motion` | Welcome teaser animation | ✓ | 12.38.0 | CSS `@keyframes` (no Framer fallback needed) |
| `better-auth` | updateUser API | ✓ | 1.5.6 | — |
| `drizzle-orm` | createDeck server action | ✓ | 0.45.1 | — |
| Neon Postgres | DB writes | ✓ | (live — project works) | — |

No missing dependencies. No install step needed for this phase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 (unit) + Playwright 1.58.2 (e2e) |
| Config file | `vitest.config.ts` (root), `playwright.config.ts` (assumed, not read — check e2e/) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSY-01 | Daybreak tokens applied app-wide (cream bg, amber primary, Baloo 2/Figtree) | Manual visual / smoke | Open `/login` in browser; inspect CSS vars | ✅ Existing spike |
| DSY-02 | TField renders with warm fill + 1.5px border; TBtn renders with amber fill + shadow; both accept `disabled`/`isPending` | Unit | `npx vitest run src/components/daybreak/__tests__/` | ❌ Wave 0 gap |
| DSY-03 | Touch targets ≥44px on all screens; inline per-field validation (no toasts) | E2E | `npx playwright test e2e/01-auth-signup-login.spec.ts` | ✅ (partial — needs update) |
| ONB-01 | Login screen renders with TField/TBtn primitives, sunrise scene, ghost-peek cards | E2E | `npx playwright test e2e/01-auth-signup-login.spec.ts -k "login page renders"` | ✅ (update assertions) |
| ONB-02 | Signup form has Name/Email/Password only (no language field); duplicate email error works | E2E | `npx playwright test e2e/01-auth-signup-login.spec.ts -k "signup page renders"` | ✅ (update: remove Native language assertion) |
| ONB-03 | Forgot password — privacy-safe "If an account exists" confirmation | E2E | `npx playwright test e2e/` (new spec) | ❌ Wave 0 gap |
| ONB-04 | Reset password — expired link shows dead-end screen; token flow works | E2E | `npx playwright test e2e/` (new spec) | ❌ Wave 0 gap |
| ONB-05 | Fresh user → /welcome; step 3 language pickers work; "Start learning" creates deck → /dashboard; nativeLanguage set | E2E | `npx playwright test e2e/02-first-visit-deck-creation.spec.ts` | ✅ (update: welcome flow instead of picker) |
| ONB-05 | 0-deck user at /dashboard redirected to /welcome | E2E | `npx playwright test e2e/02-first-visit-deck-creation.spec.ts` | ✅ (update assertions) |
| ONB-06 | Empty deck state shows Leo + "Your deck is empty" + Browse words / + Add a card | E2E | Reachable from dashboard after deck creation with 0 cards (existing coverage) | ✅ (partial) |

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests only, < 30s)
- **Per wave merge:** `npx vitest run && npx playwright test e2e/01-auth-signup-login.spec.ts e2e/02-first-visit-deck-creation.spec.ts`
- **Phase gate:** Full Playwright suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/daybreak/__tests__/t-field.test.tsx` — unit tests for TField: renders label, shows error class, forwards ref, accepts disabled
- [ ] `src/components/daybreak/__tests__/t-btn.test.tsx` — unit tests for TBtn: shows Loader2 when isPending, disabled when isPending, renders children
- [ ] `e2e/03-forgot-reset-password.spec.ts` — covers ONB-03 (privacy-safe confirmation) and ONB-04 (expired link dead-end)
- [ ] Update `e2e/helpers.ts:signUpFreshUser` — remove Native language field interaction; expect redirect to `/welcome` not `/dashboard`
- [ ] Update `e2e/helpers.ts:pickFirstDeckLanguage` → `completeWelcomeFlow(page, nativeLang, targetLang)` — interacts with welcome step-3 dropdowns and "Start learning" button

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | better-auth signIn/signUp/reset — existing, preserved unchanged |
| V3 Session Management | Yes | `nextCookies()` plugin in `auth.ts`; `authClient.updateUser` triggers session refresh |
| V4 Access Control | Yes | Session check in `(protected)/layout.tsx`; session check to add in `welcome/page.tsx` |
| V5 Input Validation | Yes | Zod schemas on all auth forms; `ALLOWED_LANGUAGES` allowlist in `createDeck` (already guards language codes) |
| V6 Cryptography | No | No crypto hand-rolled; better-auth handles password hashing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass-assignment on `updateUser` (injecting unexpected fields) | Tampering | better-auth's `additionalFields` config explicitly lists `nativeLanguage` as the only writable additional field; the server only writes what's declared in `auth.ts` |
| Unauthenticated `/welcome` access + calling `createDeck` | Elevation of Privilege | Server action `createDeck` calls `auth.api.getSession` and throws "Unauthorized" if no session — already guarded |
| Invalid language code injection in `updateUser({ nativeLanguage: '<script>' })` | Tampering | Add zod validation: `nativeLanguage: z.enum(["en", "fr", "es"])` in the welcome form schema before calling `updateUser`; the DB column is text (not enum) so validation must be at the call site |

---

## Sources

### Primary (HIGH confidence)

- `src/lib/auth.ts` — better-auth server config; `nativeLanguage` additionalField confirmed
- `src/lib/auth-client.ts` — `inferAdditionalFields<typeof auth>()` plugin confirmed
- `src/db/schema.ts` — `user.nativeLanguage text NOT NULL DEFAULT 'en'` confirmed
- `src/lib/deck-actions.ts` — `createDeck` server action signature + `revalidatePath('/dashboard')`
- `src/app/(protected)/dashboard/page.tsx` — `decks.length === 0` branch; current `FirstVisitPicker` render
- `src/app/(protected)/layout.tsx` — Server Component redirect guard pattern
- `src/components/habitat-video.tsx:91-110` — `usePrefersReducedMotion` hook (SSR-safe)
- `node_modules/better-auth/dist/api/routes/update-user.d.mts` — `/update-user` endpoint confirmed
- `node_modules/better-auth/dist/client/path-to-object.d.mts` — `InferUserUpdateCtx` includes `Partial<InferAdditionalFromClient>` = `{ nativeLanguage? }`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — Next.js 16: middleware renamed to proxy; file convention change
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` — `redirect()` in Server Components
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` — route groups; parentheses not in URL
- `design/handoff-daybreak/hifi-shared.jsx` — TField, TBtn, GhostPeek atom specs
- `design/handoff-daybreak/daybreak-auth.jsx` — Signup/Forgot/Reset screen specs
- `design/handoff-daybreak/daybreak-onboarding.jsx` — 3-step welcome + empty states
- `e2e/helpers.ts` — existing test helpers (need update)
- `e2e/01-auth-signup-login.spec.ts` + `02-first-visit-deck-creation.spec.ts` — existing e2e coverage

### Secondary (MEDIUM confidence)

- `src/components/level-up-overlay.tsx` — `motion/react` import and usage pattern
- `src/components/study-card.tsx` — `useMotionValue`, `useTransform` from `motion/react`
- `package.json` — confirmed `motion@^12.38.0`, `better-auth@^1.5.6`, `playwright@^1.58.2`, `vitest@^4.1.1`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json and node_modules
- Architecture: HIGH — grounded in actual file structure, existing patterns
- better-auth updateUser API: HIGH — verified from installed node_modules type definitions
- Next.js 16 routing patterns: HIGH — verified from next/dist/docs
- Motion/reduced-motion pattern: HIGH — exact hook code read from codebase
- Pitfalls: HIGH — each has a concrete code reference

**Research date:** 2026-06-20
**Valid until:** 2026-08-20 (stable libraries — 60 days; Next.js 16 is the installed pinned version)
