# LeoCards — UI Redesign Brief: Login & Card Learning

**For:** Designer (mock-up phase)
**Date:** 2026-06-12
**Scope:** Two screens — the **Login screen** (plus its three sibling auth screens that share the same template) and the **Card Learning (study) page**. Everything below describes what exists today and what a redesign must account for. Visual style is open for reinvention; the flows, states, and copy inventory are the requirements.

---

## Product context (read first)

- LeoCards is a language-learning flashcard app. Progress feeds a virtual **baby tiger and his 3D habitat** — the tiger is the emotional anchor and the core brand idea: *"the tiger must feel alive."*
- Current brand: warm, friendly, casual. Tiger orange is the signature color.
- Audience: adult learners of French / Spanish / English, studying in short daily sessions, **mobile-first** (most studying happens on a phone).
- The current UI is functional but visually plain — built by engineers with a default component kit. The redesign should bring personality (the tiger, the habitat world) into these screens, which today barely express it.

### Current visual language (baseline, free to evolve)

| Token | Value |
|---|---|
| Brand orange (primary) | `hsl(24 95% 53%)` ≈ `#F97316` — buttons, focus rings, highlights |
| Background | warm cream `hsl(30 20% 98%)` |
| Card surface | soft cream `hsl(30 15% 96%)` with 1px light border |
| Error red | `hsl(0 84% 60%)` |
| Corner radius | 12px base (cards/inputs/buttons rounded) |
| Type | single sans-serif stack; 28px headings, 20px titles, 14px body/labels; weights 400/500/600 |
| Mode | **light only** today — dark mode does not exist (open question: include in redesign?) |

---

## Screen 1 — Login

**Purpose:** returning user signs in and gets to their dashboard fast. Today: centered single column, max 384px wide, on cream background.

### Element inventory
1. **Brand block** (above the form card): tiger emoji 🐯 (placeholder — a real mark/illustration is a redesign opportunity), app name "LeoCards", tagline **"Your tiger is waiting."**
2. **Form card** (white-ish, rounded, subtle shadow):
   - Title: **"Welcome back"**
   - **Email** field — label "Email", placeholder "you@example.com"
   - **Password** field — label "Password", placeholder dots
   - **"Forgot password?"** text link, right-aligned under the password field
   - **Sign in** button — full-width, 44px tall, brand orange
3. **Below the card:** "Don't have an account?" + **Sign up** link

### States to mock
- Default / empty
- **Field focus** (today: orange ring; needs a designed focus treatment)
- **Validation errors** (appear after submit, small red text under the field): "Please enter a valid email", "Password is required"
- **Auth failure**: "Incorrect email or password." (shown under the password field)
- **Submitting**: button disabled with a spinner replacing the label

### Sibling auth screens (same template — design once, vary content)
These share the brand block + card layout; mock at least one so the system extends cleanly:

- **Sign up** — title "Create your account"; fields: Name, Email, Password (min 8 chars), **Native language** dropdown (English / French / Spanish); button "Create account"; link "Already have an account? Sign in". Extra error: "An account with this email already exists."
- **Forgot password** — title "Reset your password", subtitle "Enter your email and we'll send you a reset link."; one email field + "Send reset link" button; **success state replaces the form** with: "Check your email — we sent a reset link to [email]." + "Back to sign in" link.
- **Reset password** — title "Set a new password"; New password + Confirm password fields; button "Set new password"; errors "Passwords do not match" and an **expired-link state**: "This reset link has expired. Request a new one." + link.

### Login redesign notes / opportunities
- The tiger is currently just an emoji — the strongest opportunity is real brand expression here (illustration, habitat scenery, motion?) while keeping the form instantly scannable.
- One-column, thumb-reachable, fast: don't add steps. No social auth exists (none planned).
- Keep the screen calm — it's the front door, not a marketing page.

---

## Screen 2 — Card Learning (Study Session)

**Purpose:** the core loop of the product. User flips a flashcard, self-grades by swiping, repeats until the session ends, and sees a summary. This is where users spend most of their time — it must feel fluid, rewarding, and alive.

### Flow overview (mock each step)

```
Enter session → [Card: question side] → tap/flip → [Card: answer side]
→ swipe right (knew it) / swipe left (still learning) → next card
→ ... → "Saving your progress..." → Session summary
→ (sometimes) Habitat level-up celebration overlay
```

(If nothing is due to study, the user never reaches this page — no empty state needed here.)

### 2a. Session chrome (persistent top bar)
- Left: label **"Study session"** (opportunity: replace with deck name / progress / tiger presence)
- Right: **"Quit session"** ghost button → opens a small confirmation popover:
  - Message: "Quit session? Your progress so far will be saved."
  - Buttons: **"Keep studying"** (secondary) / **"Save and quit"** (primary)
- **There is currently no progress indicator** (e.g. "4 of 12") — known gap, strong candidate to add.

### 2b. The card (centerpiece)
- Centered flashcard, min ~200px tall, large centered word — 24–28px bold.
- Behind it: a **stacked-cards visual** (up to 3 layered card edges) hinting at how many remain — decorative, no numbers.
- **Question side** shows the word plus a small prompt line:
  - Native→target direction: "What's the translation?"
  - Target→native direction: "What does this mean?"
  - Hint below: **"Tap to reveal"**
- **Flip:** 3D Y-axis flip, 300ms, on tap / Enter / Space.
- **Answer side** shows the translation plus hint: "Swipe right ✓   left if still learning" (only once swiping is enabled — there's a 300ms guard after the flip to prevent accidental swipes).
- **Swipe interaction:** horizontal drag.
  - Drag right → card tints **soft green** progressively → released past threshold = "knew it", card flies off right.
  - Drag left → tints **soft red** → "still learning", flies off left.
  - Keyboard: ← / → arrows do the same.
- **First-timer hint:** after the very first flip of a session (first card only), a line appears under the card: "Swipe right if correct, left if still learning".
- Cards answered "still learning" come back later in the same session until they're answered correctly once.

### 2c. Saving state
- Brief full-screen moment: **"Saving your progress..."** (opportunity: make this a charming tiger beat instead of a plain string).
- **Error state** (network fail): "Couldn't save your progress. Check your connection and try again." + **"Retry saving session"** button.

### 2d. Session summary (end screen)
- Fades/slides in. Today: tiger emoji (large), header **"Great work, keep it up!"**, then three stats:
  - **N studied** · **N% correct** · **N learned** (the "learned" number is brand-orange — it's the one that feeds the habitat)
- CTA: **"Back to deck"**.
- Opportunity: this is the emotional payoff moment — connect it visually to the tiger/habitat (the current screen doesn't show the habitat at all).

### 2e. Level-up celebration (overlay, conditional)
- When the session pushes the habitat to a new level: full-screen overlay on blurred/dimmed background, **confetti** (36 particles, multi-color, ~2.5s fall), content:
  - Label "Habitat Level" + the big level number (orange)
  - Message: "Your habitat grew!" (or at max level: "A bird arrived in your habitat!")
  - "Tap anywhere to continue" — dismisses back to the summary
- Opportunity: this is the single most celebratory moment in the app and currently has no tiger/habitat imagery — prime candidate for the 3D habitat art style (Soft-Clay look used on /habitat).

---

## Hard requirements (apply to both screens)

1. **Mobile-first.** Primary mock at ~390px wide; desktop is the adaptation. Touch targets ≥44px. Inputs must render ≥16px text on mobile (prevents iOS zoom-on-focus).
2. **The interaction model on the study card is fixed:** tap-to-flip, swipe-right = knew it, swipe-left = still learning, with progressive color feedback during the drag. Restyle freely; don't replace the gesture with buttons (keyboard arrows already exist as the non-touch path — visible affordances for desktop are welcome).
3. **Keyboard & focus:** every interactive element needs a designed visible focus state; the card is keyboard-operable (Enter/Space flip, arrows grade).
4. **Reduced motion:** the app supports `prefers-reduced-motion` elsewhere (habitat shows a static poster). The study flip/swipe/confetti currently do NOT honor it — the redesign should define reduced-motion variants (e.g. crossfade instead of 3D flip, no confetti).
5. **Copy:** strings above are the current voice — friendly, brief, lowercase-calm. You may propose new copy; flag changes rather than silently swapping.
6. **Error/edge states are part of the deliverable:** every state listed above needs a mock or a documented treatment (validation errors, auth failure, expired reset link, save failure + retry, quit confirmation).
7. **Color contrast:** keep WCAG AA on text (current palette passes).
8. **One heads-up, no design needed:** an internal QA mode (in development) will overlay tiny state codes on cards (e.g. `R2·t2n·cd:14m`). It is secret-gated and never visible to customers — just leave breathing room so a small corner badge on a card wouldn't break the layout.

## Out of scope for these mocks

- Dashboard, deck management, add-card / image-extraction flows, /habitat page (already has its 3D art direction)
- Dark mode is optional/exploratory — current product is light-only
- No new features: redesign existing flows only (the one sanctioned addition: a session progress indicator on the study screen)
