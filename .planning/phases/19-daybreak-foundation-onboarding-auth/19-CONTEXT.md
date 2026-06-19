# Phase 19: Daybreak Foundation + Onboarding & Auth - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the shared **Daybreak design-system foundation** and redesign the entire **Onboarding & Auth** surface to it. Delivers: the Daybreak tokens/fonts applied app-wide, a reusable Daybreak component library, and every auth/onboarding screen (Login, Signup, Forgot, Reset, first-visit Welcome, empty states) matching the hi-fi mocks.

Requirements: **DSY-01, DSY-02, DSY-03, ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06**.

Presentation-layer redesign — existing auth behavior (better-auth flows, validation, routes) is preserved, with ONE intentional flow change: language choice moves out of signup into the welcome (see D-04).

</domain>

<decisions>
## Implementation Decisions

### Component Strategy
- **D-01:** Build **dedicated Daybreak primitives** in `src/components/daybreak/`, matching the handoff atoms (`hifi-shared.jsx`): `TField` (labeled input — warm fill `--db-field-bg`, 1.5px border `#EDDFC9`, radius 12, red border + helper on error), `TBtn` (primary — radius 14, `--db-btn-shadow`, spinner/disabled state), `Pill`/chip (`--db-pill-bg`/`--db-pill-text`), and a `Card` surface (radius 22, `--db-card-shadow`). Reused by every screen in the milestone, not just auth.
- **D-02:** **Refactor the Login spike to compose these primitives.** The spike (`src/app/(auth)/login/page.tsx`) currently restyles shadcn `Input`/`Button` inline — rework it to use `TField`/`TBtn`. Keep the already-built `LionFace` and `AuthCard`/`DaybreakAuthScene` (`src/components/daybreak/`) as the auth-family shell; the new field/button atoms slot into `AuthCard`'s form content.

### Welcome Flow & Language
- **D-03:** First-visit welcome is a **dedicated `/welcome` route** (NOT inline on `/dashboard`), running 3 steps: (1) Meet Leo, (2) the promise + a lightweight mini-habitat preview, (3) choose native + target languages via dropdowns (target list excludes the chosen native). "Start learning" creates the first deck → routes to `/dashboard`. States: creating ("Setting up your Spanish deck…") + error (picks preserved).
- **D-04:** **Language choice moves out of signup into the welcome.** Signup captures Name / Email / Password only (no language field). Native language is set in welcome step 3; the target language = the first deck's language. The current approach sets `nativeLanguage` via better-auth `additionalFields` at signup — the planner/researcher must determine how to persist native language at welcome-completion instead (e.g., update the user record when the deck is created). Existing users are unaffected (already have decks).
- **D-05:** **Routing:** signup → `/welcome` → create first deck → `/dashboard`. login → `/dashboard` directly. A user who reaches `/dashboard` with **0 decks** is redirected to `/welcome` (this replaces the current inline `FirstVisitPicker`-on-dashboard behavior).

### Mini-Habitat Preview (welcome step 2)
- **D-06:** Use a **lightweight Daybreak teaser scene** built in THIS phase — sunrise gradient + Leo + a couple of habitat elements, with subtle ambient motion that **pauses under `prefers-reduced-motion`**. It is NOT the full level-by-level habitat scene (Phase 24). Richer reuse of the real habitat render is deferred to Phase 24.

### Carried from the handoff (locked, not re-litigated)
- **D-07:** Auth scene **recolours per screen**: login/signup = sunrise, forgot = daylight, reset = dusk (variants already exist in `DaybreakAuthScene`).
- **D-08:** **Preserve all auth logic** — better-auth `signIn`/`signUp`/forgot/reset, react-hook-form + zod, error copy, privacy-safe forgot confirmation ("If an account exists…"), reset expired-link dead-end. Only the presentation changes (plus the D-04 language migration).
- **D-09:** Global conventions (DSY-03): mobile-first single column, touch ≥44px, inline per-field validation (red border + helper after submit, never toasts), one full-width primary per screen with spinner + form disabled while submitting.

### Claude's Discretion
- Exact file layout/prop shapes of the Daybreak primitives; how native-language persistence is wired post-signup (researcher/planner decide); whether to commit the existing spike as the phase's first atomic commit before refactoring; the precise dropdown component for the language pickers.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system (source of truth for visuals — recreate pixel-faithfully)
- `design/handoff-daybreak/README.md` — the Daybreak design system + per-screen specs; see §"Design System" (tokens), §1 Login, §6 Onboarding & Auth.
- `design/handoff-daybreak/hifi-daybreak.jsx` — the `d1` theme object (exact token values) + `LoginDaybreak` / `D1Scene`.
- `design/handoff-daybreak/hifi-shared.jsx` — `LionFace`, `TField`, `TBtn`, `GhostPeek`, `HiFiLogin` shell — **the atoms to port into primitives**.
- `design/handoff-daybreak/daybreak-auth.jsx` — Signup / Forgot / Reset Daybreak screens + their states.
- `design/handoff-daybreak/daybreak-onboarding.jsx` — the 3-step Welcome + empty states.
- `design/handoff-daybreak/LeoCards Daybreak Onboarding & Auth.html` — renders the auth/onboarding artboards (all states) for visual reference.

### Briefs & requirements
- `design/ui-redesign-requirements-onboarding-auth.md` — the blue-sky brief (the "why" + edge cases).
- `.planning/design/UI-REDESIGN-BRIEF-login-study.md` — older login+study brief (shared visual baseline).
- `.planning/REQUIREMENTS.md` — DSY-01..03, ONB-01..06 (the requirements this phase satisfies).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (the Daybreak spike — already in the tree, verified against the mock)
- `src/app/globals.css` — Daybreak tokens remapped into the Tailwind/shadcn theme (`:root` + `@theme`, `--db-*` extras). Foundation for DSY-01.
- `src/app/layout.tsx` — Baloo 2 (`--font-display`) + Figtree (`--font-sans`) via `next/font`.
- `src/components/daybreak/lion-face.tsx` — the flat-geometric Leo `LionFace`.
- `src/components/daybreak/auth-card.tsx` — `DaybreakAuthScene` (sunrise/daylight/dusk variants) + `AuthCard` (ghost-peek stack + scene + content) + `GhostPeek`.
- `src/app/(auth)/layout.tsx` — the Daybreak auth shell (brand row).
- `src/app/(auth)/login/page.tsx` — redesigned Login (to be refactored onto the new primitives per D-02).

### Screens to redesign / build
- `src/app/(auth)/signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` — better-auth + react-hook-form + zod; restyle to Daybreak.
- `src/components/first-visit-picker.tsx` — current single-pick inline picker; **replaced** by the new `/welcome` 3-step flow (D-03/D-05). New route `src/app/(auth)/welcome/` (or appropriate group).

### Integration points
- `src/lib/auth-client.ts` — better-auth client (`signIn`, `signUp`, password reset).
- `src/lib/auth.ts` — better-auth server config incl. `nativeLanguage` additionalField (relevant to D-04 language migration).
- `src/lib/deck-actions.ts` — `createDeck` (the welcome reuses this to create the first deck); `src/lib/deck-queries.ts` for the 0-deck redirect check.
- `src/components/ui/*` (shadcn Input/Button/Label/Card) — the Daybreak primitives wrap/replace these.

### Established Patterns
- Auth pages are client components using react-hook-form + zodResolver; inline `errors`-based validation after `isSubmitted`; better-auth returns `{ error }`.
- Daybreak tokens are consumed via Tailwind semantic classes (`bg-background`, `text-foreground`, `text-primary`) + `--db-*` CSS vars; display text uses `font-display` (Baloo 2).

</code_context>

<specifics>
## Specific Ideas

- Brand is **Leo the lion** (not the old tiger emoji). Tagline on the auth sunrise scene: "Your lion is waiting."
- Exact Daybreak values live in `src/app/globals.css` (`--db-*`) and `design/handoff-daybreak/hifi-daybreak.jsx` (`d1`). Match the mocks pixel-faithfully (handoff guidance).
- Welcome step-3 dropdowns: "I speak" (native) / "I want to learn" (target); the target list excludes the chosen native. Languages today: English, French, Spanish.

</specifics>

<deferred>
## Deferred Ideas

- **Full habitat-scene reuse** for the welcome preview → Phase 24 (Habitat). This phase ships a lightweight teaser only (D-06).
- **Account / Settings page** redesign → future milestone (not in this handoff batch).
- **Commissioned Leo art / real brand mark** → future; the CSS-drawn `LionFace` placeholder ships now (keep the Daybreak palette).
- **Study screen** redesign → Phase 20 (STU); the auth/onboarding work does not touch it.

None — discussion stayed within phase scope (the above are explicitly later-phase, not scope creep).

</deferred>

---

*Phase: 19-daybreak-foundation-onboarding-auth*
*Context gathered: 2026-06-19*
