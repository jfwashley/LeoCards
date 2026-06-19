# LeoCards — UI Redesign Requirements
## Onboarding & Auth (Signup, Forgot/Reset Password, First-Visit)

**Purpose:** Reference for designing new mocks of the entry-point screens — account creation, password recovery, and the brand-new-user first-visit moment. It documents what each must *do* and *show* — content, fields, and states — and deliberately avoids prescribing visual form. **This is a blue-sky brief**, but with one anchor: these screens form a **family with the already-approved Login screen** and should feel like one coherent set. Treat the current implementation as reference only.

**Product context:** LeoCards is a gamified language-learning flashcard app (tiger habitat that grows as you learn). These are the screens a user meets *before* the app proper — first impressions that should feel warm and on-brand, not like generic SaaS forms. Mobile-first, also used on desktop. See `ui-redesign-requirements-login-study.md` for the Login screen and shared auth baseline; the warm-orange theme + 🐯 emoji are reference only, **not mandatory**.

---

## The auth family (design as one set)

All auth screens currently share one **layout shell**: a centred column on a plain background with a **brand block at top** (tiger mascot + "LeoCards" wordmark + the tagline *"Your tiger is waiting."*) and a **single card** beneath holding the screen's content. The redesign should establish this shell once and apply it across **Login, Signup, Forgot password, and Reset password** so they're unmistakably the same family.

Shared conventions to carry across all of them:
- **Inline, per-field validation** (red text + red field border), shown after submit — never toasts.
- **Submitting state** on the primary button (spinner replacing the label; button disabled).
- A **single primary action** per screen, full-width.
- A clear **cross-link** to the sibling screen (login ⇄ signup, and "back to sign in" from recovery).
- Email + password only — **no social sign-in / magic links** (don't design these in).
- Touch targets ≥ 44px; single column on mobile.

---

# Screen 1: Signup ("Create your account")

The account-creation counterpart to Login.

### Fields & content
- **Name** — free text ("Your name").
- **Email** — "you@example.com".
- **Password** — minimum 8 characters (communicate the requirement; today it's a placeholder + validation message).
- **Native language** — a selector choosing the user's *own* language: English / French / Spanish. (This matters: it determines which languages they can later learn and which side of each card is "native." It's the one field unique to signup.)
- **Primary action:** "Create account".
- **Cross-link:** "Already have an account? Sign in".

### States to cover
- **Default / empty.**
- **Per-field validation errors** — name required, invalid email, password too short, language required.
- **Email already in use** — "An account with this email already exists." (against the email field).
- **Submitting.**
- On success the user goes straight into the app (Dashboard) — which, for a brand-new account, means the **first-visit moment** below.

---

# Screen 2: Forgot password ("Reset your password")

Requests a reset link by email.

### Content
- A short explainer: "Enter your email and we'll send you a reset link."
- **Email** field.
- **Primary action:** "Send reset link".
- **Cross-link:** "Back to sign in".

### States to cover
- **Default / empty.**
- **Invalid email** validation.
- **Submitting.**
- **Sent / confirmation** — the form is replaced by a confirmation that the link was sent to *that specific address* ("Check your email — we sent a reset link to **you@example.com**."). *(Note: for privacy this confirmation shows regardless of whether the email is registered — design it as a neutral "if that address exists, it's on its way" style moment, not a guarantee the account exists.)*

---

# Screen 3: Reset password ("Set a new password")

Reached from the emailed link (carries a token). Where the user picks a new password.

### Content
- **New password** — min 8 characters.
- **Confirm password** — must match.
- **Primary action:** "Set new password". On success → back to Login to sign in.

### States to cover
- **Default / empty.**
- **Validation** — password too short; **passwords don't match** ("Passwords do not match", against the confirm field).
- **Submitting.**
- **Invalid / expired or missing link** — a dead-end recovery state: "This reset link has expired. Request a new one." with a link back to **Forgot password**. (This must be designed — it's a common real path when links are old or already used.)

---

# Screen 4: First-visit moment (new user, no deck yet)

The very first thing a brand-new user sees after signing up, before they have any decks or cards. Today it's a single focused prompt:

### Content
- The tiger mascot and a welcoming, single question: **"What language do you want to learn?"**
- A short list of **language choices** (the languages available to learn, excluding the user's own native language) — currently English / French / Spanish minus their native one. Each is a large, tappable option (today: flag + language name).
- Choosing one **creates their first deck** and drops them into the Dashboard.

### States to cover
- **Default** — the choice prompt.
- **Creating** — the chosen option in a brief loading state while the deck is set up.
- **Error** — "Something went wrong. Try again." (recoverable).

### Design opportunity / open question
This is the **single best onboarding moment** to set the tone — introduce the tiger/habitat promise ("learn words → grow your habitat") rather than just asking a cold question. It's currently very minimal. Consider whether it should:
- stay a one-tap language pick, or
- become a richer multi-step welcome (greet the tiger, explain the loop, then pick a language).

It also currently appears *within* the Dashboard route as an empty state, with the habitat summary already visible above it. The designer can treat it as its own dedicated onboarding screen if that serves the first impression better — **flag the preferred direction.**

---

## Empty states (related, lightweight)
Beyond first-visit, two empty states belong to this entry-experience family and should feel consistent with it:
- **Empty deck** — a deck exists but has no cards yet: an inviting nudge toward Browse words / Add a card. *(Primary home is the Dashboard doc; keep visually consistent.)*
- **No search results** in the card list. *(Also Dashboard; minor.)*

---

## Requirements / constraints (must hold regardless of visual direction)
- The four auth screens must read as **one coherent family** with the approved Login design.
- Validation is **inline and per-field**; recovery flows never reveal whether an email is registered.
- Every screen has exactly one clear primary action and an obvious way to the relevant sibling screen.
- Dead-end states (expired reset link, send-failure, deck-create error) must offer a **recovery path**, never trap the user.
- Touch targets ≥ 44px; single-column on mobile; usable one-handed.
- The first-visit moment must make a brand-new user feel **welcomed and oriented**, and lead cleanly into the Dashboard.

---

## Explicitly open for ideation (blue sky — reinterpret, don't copy)
- **The shared auth shell** — the brand block, the card, the background; how much personality/illustration to introduce (this is the first brand impression).
- **The first-visit experience** — minimal one-tap pick vs. a richer guided welcome that introduces the tiger/habitat promise.
- **How the native-language and learn-language choices are presented** (dropdown vs. cards/flags vs. something more delightful).
- **The "link sent" and "link expired" moments** — easy to make warm and reassuring rather than terse.
- **The whole visual language** — palette, type, mascot treatment; current theme is reference only.

## Out of scope for this mock
The Login screen itself (already designed — match it), and everything behind auth (Dashboard, study, habitat, add/browse). These screens should hand off *into* the app, but you don't need to design those here.
