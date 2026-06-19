# Handoff: LeoCards UI Redesign ("Daybreak")

## Overview
A full redesign of LeoCards — a gamified language-learning flashcard app. A learner builds decks of word pairs (native ↔ target language), studies them, and grows a virtual habitat for their lion mascot **Leo** as they learn. This package covers six areas, each delivered as **low-fidelity wireframes** and **high-fidelity mockups** in a warm visual direction called **Daybreak**:

1. **Login** (baseline, already approved)
2. **Dashboard** ("My Deck")
3. **Add a Card** (type-a-word + from-an-image flows)
4. **Browse Words** (curated catalogue)
5. **Habitat** (the living mascot world)
6. **Onboarding & Auth** (signup, forgot/reset password, first-visit welcome, empty states)

## About the Design Files
The files in this bundle are **design references authored in HTML/React-via-Babel** — prototypes that show the intended look, layout, and behavior. **They are not production code to copy directly.** Each "screen" is a React component rendered onto a pannable design canvas at a fixed phone size (390×844 for hi-fi, a sketch phone for wireframes).

Your task is to **recreate these designs in the target codebase's environment** (React/React Native, Vue, SwiftUI, native, etc.) using its established components, styling system, and patterns. If no front-end environment exists yet, choose the most appropriate framework for the product and implement there. Pull the **exact values** (colors, type, spacing, copy) from this README and the source files; reproduce the **structure and behavior**, not the Babel/inline-style mechanics.

Mobile-first throughout; everything is single-column and one-hand reachable, touch targets ≥ 44px.

## Fidelity
Two fidelities are included:
- **High-fidelity (`LeoCards Daybreak *.html`)** — final colors, typography, spacing, iconography, and interactions. Recreate these **pixel-faithfully** using your codebase's libraries. These are the source of truth for visual detail.
- **Low-fidelity (`LeoCards * Wireframes.html`)** — hand-sketch wireframes showing structure, states, and flow only. Use them to understand intent, options explored, and the per-state margin notes. **Do not** copy their sketch styling.

When hi-fi and wireframe differ, **hi-fi wins** for styling; wireframe margin notes are the best source for *why* and for edge-case behavior.

---

## Design System — "Daybreak" tokens

The single source of truth is the theme object `d1` in `hifi-daybreak.jsx` (exposed as `window.d1Theme`). Reproduce it as design tokens.

### Colors
| Token | Hex | Use |
|---|---|---|
| `bg` | `#FFF6E9` | app background (warm cream) |
| `surface` | `#FFFFFF` | cards, fields, sheets |
| `ink` | `#4A331C` | primary text (warm dark brown) |
| `muted` | `#9C8467` | secondary text |
| `primary` | `#F28A1F` | amber — primary buttons, active states, progress |
| `primaryText` | `#FFFFFF` | text on primary |
| `link` | `#C96F12` | links, secondary accents |
| `green` | `#3E9B5F` | success / "added" / mastery complete |
| `red` | `#DE5F4A` | errors |
| `pillBg` / `pillText` | `#FFF1DC` / `#B4762A` | tags, level chips, icon medallions |
| `fieldBg` | `#FFFBF4` | input fill |
| accent gold | `#F2B33A` | level-9 / celebratory amber |

Habitat scene palette (`PAL` in `daybreak-habitat-scene.jsx`): hills `#CFE0A4` / `#ADCB79` / `#8FB85F`, mound `#EBCD93`, water `#B6DEE8`, trunk `#B07B45`, leaves `#7FAE54` / `#9BC06C`, rock `#C7BBA8`, elephant `#A9B9C9` / `#94A6BA`, mushroom cap `#E0664B`.

Leo mascot palette (`lion`): mane `#E8973B`, face `#FFD9A6`, muzzle `#FFF1DC`, ink `#4A331C`.

### Typography
- **Display** (headings, level numbers, buttons): **Baloo 2**, weight 700 (rounded, friendly).
- **Body** (everything else): **Figtree**, weights 400/600/700.
- **Status bar / numerals only**: Albert Sans (cosmetic; not required in-app — use the OS status bar).
- Scale in use: screen titles 20–26px/700, card titles 17–18px/700, body 14–16px, labels 13px/700, helper/caption 12.5–13px. Habitat level-up headline 62px display.

### Spacing, radius, shadow
- Spacing rhythm: 14–20px between stacked blocks; 11–16px gaps inside groups; screen padding ~18–26px.
- Radius: `fieldRadius` 12, `btnRadius` 14, `cardRadius` 22, tiles/medallions 14–18, pills 999.
- Field height 48–54; button height 48–58 (≥44 always).
- Card shadow: `0 12px 30px rgba(160,110,40,0.16)`; lighter `0 5px 14px rgba(160,110,40,0.07)`.
- Button shadow (primary): `0 10px 22px rgba(242,138,31,0.30)`.

### Shared components (see `hifi-shared.jsx`)
- `PhoneShell` (390×844 frame — replace with the device viewport in-app), `StatusBar` (use OS status bar in production).
- `LionFace` — the flat-geometric Leo head mark (mane disc + face + ears + eyes + muzzle). Used at many sizes; the Habitat has a fuller seated `HabLeo` with mood expressions.
- `TField` (labeled input: label, value, placeholder, red border + helper on error), `TBtn` (primary button with `spinner` state), `GhostPeek` (the peeking card edges behind auth/study cards).
- Conventions: **inline per-field validation** (red text + red border, after submit — never toasts); one full-width primary action per screen; primary shows a spinner and disables while submitting.

---

## Screens / Views

### 1. Login (baseline — already approved)
- Source: `HiFiLogin` in `hifi-shared.jsx`, themed by `LoginDaybreak` in `hifi-daybreak.jsx`.
- Shell "A" (the auth family shell): centered column → brand block (LionFace + "LeoCards" + tagline "Your lion is waiting.") → a **habitat-flashcard** card (a small sunrise habitat scene on top, form below) with two `GhostPeek` card edges behind it → cross-link below.
- Fields: Email, Password, "Forgot password?" link, "Sign in" primary, "Don't have an account? Sign up".

### 2. Dashboard — "My Deck" (`LeoCards Daybreak Dashboard.html`, `daybreak-dashboard.jsx`)
- **Top bar**: LionFace + "LeoCards"; right side a small **deck picker** icon (active language chip "ES ▾") + logout icon.
- **Habitat hero** (focal): a medallion — Leo on a sunrise disc with a **conic progress ring** + level badge — "Habitat · Level 7", "14 of 20 cards to Level 8", "View habitat ›" link. Links to the Habitat page.
- **Action line (locked "Option D")**: full-width **Start studying** button (dims when nothing due) + a shared status row beneath it: status on the left, **Add a card** on the right. Status adapts: "12 due" / "0 due" / "Resting · 2h 15m" (napping Leo) / "All paused".
- **"Your words"**: a tap-to-expand **inline accordion** (no swipe — avoids the OS app-switch gesture). Header shows count; expanded shows a search field + word rows.
- **Word row**: native term (bold) + translation + source tag ("Curated" amber / "Added by you" green / "Paused"); a 3-segment **mastery meter** (green + check at 3/3); pause and edit icon buttons.
- States to build: cards due / none due / resting (cooldown) / all paused; accordion collapsed + open.

### 3. Add a Card (`LeoCards Daybreak Add a Card.html`, `daybreak-addcard.jsx`, `daybreak-addcard-boards.jsx`)
One destination, a **segmented toggle**: "Type a word" | "From an image". A context line ("EN → ES · saves to your Spanish deck") is always present; "‹ My deck" always escapes.
- **Type a word**: two linked fields (native + target) with an auto-translate link badge between them. Type either side; the other auto-fills (shimmer + "Translating…" pending state on the receiving field). Save unlocks only when both filled; on success a green "Card saved" banner + form clears for the next. States: empty, translating, translate-fail + save-fail, saved.
- **From an image** (full-screen **stepper**: Image → Extract → Review → Translate → Add):
  - **Pick**: drop zone — "Upload a Photo" (heading) + "or browse your files · paste a screenshot" + "JPG · PNG · WebP"; drag-over state ("Drop to upload"); inline file-validation error.
  - **Confirm + deck**: image thumbnail + Remove/Change; deck selector (defaults to active deck, changeable); "Extract words".
  - **Extracting**: calm progress — Leo in a sunrise disc + "Reading your image…" + "up to 30 seconds"; indeterminate bar; Cancel. Plus no-words-found and error (Try again, work preserved) outcomes.
  - **Review words**: editable list — amber checkbox keep/exclude (excluded rows struck-through but visible), edit + remove per row, Select all/None, an "Already in your deck · skipped" chip group, guard "keep at least one", "Translate N words".
  - **Check translations**: editable ES/EN pair rows; per-row "Translation unavailable — enter manually"; "Add N cards" commit.
  - **Result**: success ("N cards added!"), partial (added / already-learned / couldn't-add counts), all-failed (Try again). Nothing saves until the explicit commit.

### 4. Browse Words (`LeoCards Daybreak Browse Words.html`, `daybreak-browse.jsx`, `daybreak-browse-boards.jsx`)
Curated, pre-translated catalogue. Two-level navigation (locked: **topic tiles**).
- **Topic tiles landing**: 14 category cards (Greetings, Numbers, Colors, Days & Months, Food & Drink, Family, Body, Animals, Clothing, Home, Weather, Shopping, Travel, Work), each with a **geometric amber icon** on a `#FFF1DC` medallion + word count. (Icons are hand-built in `TOPIC_ICON`; in-app, substitute an equivalent monoline icon set.)
- **Word list** (after picking a topic): back-to-topics + topic header; a **LEVEL** tile row as its own section (All / A1 / A2 / B1 — CEFR difficulty); EN→ES context line.
- **Word row (locked "Row A")**: English primary / Spanish beneath (with an "ES" marker) + a CEFR level chip; trailing circular toggle — outlined **+** to add, filled amber **✓** when in deck (tap to remove). In-deck rows get a warm tint + border. Add/remove is **optimistic & instant**; per-row loading + "Failed. Try again." are deferred edge states.
- States: list (All), filtered (A1), empty result ("No words at this level" + "Show all levels").

### 5. Habitat (`LeoCards Daybreak Habitat.html`, `daybreak-habitat-scene.jsx`, `daybreak-habitat.jsx`)
The emotional anchor — a **living, flat-geometric scene** that mirrors the learning habit. **This screen is the richest visual; performance matters — keep it light on mobile and respect reduced motion.**
- **Scene** fills the screen: sky gradient, drifting clouds, rolling hills, a seated **HabLeo** (mood-driven expression), with scene elements that **stack cumulatively by level**: L1 bare mound → L2 lake/lilies → L3 trees/rocks → L4 flowers/grass/butterflies → L5 elephant companion → L6 mushrooms → L7 cave → L8 toys → L9 songbirds + golden-hour light.
- **Ambient motion** (gentle, looping): Leo breathing, water shimmer, cloud drift, butterfly float, sun glow. All gated behind `@media (prefers-reduced-motion: reduce)` (→ static).
- **Overlays**: back button (top-left), **mood chip** (Excited/Happy/Neutral/Sad — colored dot + label), **level badge** (top-right). **Mood is expressed three ways and is independent of level**: Leo's expression + ambient light + the label.
- **Progress (locked "Option 1")**: a bottom card — "Level N · <name>", progress bar, and the **named next unlock** ("Next at L6: mushrooms"); at L9 → "Course 1 complete".
- States: new user L1 (sparse, inviting, "grow Leo's world") · mid L5 (default) · lush L9 · **level-up celebration** (full-screen falling confetti + "Level 5!" + what just appeared) · **decaying/sad** (desaturated, wilted, sad Leo, gentle "Leo misses you" — encouraging not punishing; quality decays ~5%/day after a 2-day grace and can lower the visible level, with a floor) · **offline** (soft cached banner, scene still shown) · **error** (friendly + Try again) · **reduced-motion** (static + "Motion paused").
- Note: level is driven by count of **learned** cards (3 mastery rounds) across all decks. L9 is the current cap.

### 6. Onboarding & Auth (`LeoCards Daybreak Onboarding & Auth.html`, `daybreak-auth.jsx`, `daybreak-onboarding.jsx`)
The auth screens are **one family** with Login (shell A: brand block + ghost-card stack + habitat-flashcard whose scene recolours per screen — signup = sunrise, forgot = daylight, reset = dusk).
- **Signup — "Create your account"**: Name, Email, Password (min 8, helper shown), "Create account", "Already have an account? Sign in". **No language field** — languages are chosen in the welcome. States: default, per-field validation, "An account with this email already exists.", submitting.
- **Forgot — "Reset your password"**: explainer + Email + "Send reset link". States: default, invalid email, submitting, **privacy-safe sent confirmation** ("If an account exists, we've sent a reset link to you@example.com" — never reveals registration).
- **Reset — "Set a new password"**: New password + Confirm (min 8; "Passwords do not match" against confirm). States: default, mismatch, submitting, **expired/invalid-link dead-end** ("Request a new link" → Forgot).
- **First-visit welcome (locked: richer 3-step, dedicated full screen)**: (1) **Meet Leo**, (2) **the promise** — "Learn words, grow your world" with a real animated mini-habitat preview, (3) **Choose your languages** — native + target picked **together** via **dropdowns** ("I speak" / "I want to learn"); the target list excludes the chosen native. "Start learning" creates the first deck → Dashboard. States: creating ("Setting up your Spanish deck…"), error ("Something went wrong. Try again.", keeps picks).
- **Empty states** (kept consistent): **empty deck** (Leo + "Your deck is empty" + Browse words / + Add a card) and **no search results** ("No words match '…'" + Clear search).

---

## Interactions & Behavior
- **Validation**: inline, per-field, after submit. Red field border + red helper text. Never toasts.
- **Submitting**: primary button shows a spinner and disables; whole form is non-interactive.
- **Auto-translate (Add a card / type)**: on pause after typing one side, show pending/shimmer on the other; either side is editable; failure is soft ("enter manually").
- **Optimistic add/remove (Browse)**: row updates instantly on tap; reconcile in background; per-row error is row-local and recoverable, never loses scroll position.
- **Long waits (Add a card / image)**: extraction up to ~30s and bulk translation get honest, calm progress; interrupting controls disabled; Cancel always available.
- **Nothing is saved until an explicit commit** in the image flow ("Add N cards").
- **Habitat ambient loops**: subtle, infinite, decorative — must pause under reduced-motion. Level-up confetti is a one-off ~2.5s flourish then settles into the new level.
- **Dashboard "Your words"** expands inline (height/opacity transition) — deliberately **not** a swipe gesture.
- **Recovery everywhere**: expired link, send failure, deck-create error, save failure all offer a path forward; never a dead end.

## State Management
- **Auth**: form field values + per-field error map; submitting flag; server errors (email-in-use, send-failed). Reset carries a token from the link; handle missing/expired token → dead-end screen.
- **Onboarding**: native language, target language (target options = available minus native); creating flag; create-error. On success: create first deck, set active deck, route to Dashboard.
- **Dashboard**: active deck, due-count, study cooldown timer, paused flag; word list (term, translation, source, mastery 0–3, paused); accordion open flag; deck list for the picker.
- **Add a card (type)**: native/target text, translation-pending flag per side, translate-error, saving flag, save-error, "saved" toast.
- **Add a card (image)**: current step; chosen image; chosen deck; extraction status (idle/working/no-words/error); extracted words list (text, kept flag, already-learned flag); translated pairs (native, target, per-row fail); commit status; result counts (added/skipped/failed). Preserve image + deck + edits across retries.
- **Browse**: selected topic, selected level (All/A1/A2/B1); per-word in-deck status with optimistic toggle + per-row pending/error; catalogue is filtered by topic + level.
- **Habitat**: level (1–9, derived from learned-card count, decay-adjusted), mood (excited/happy/neutral/sad, from study recency), connectivity (online/offline/error), reduced-motion preference; level-up trigger.

## Design Tokens
See the **Design System** section above for the full color, type, spacing, radius, and shadow values. They all originate in `hifi-daybreak.jsx` (`d1`) and `daybreak-habitat-scene.jsx` (`PAL`). Fonts: **Baloo 2** (display) and **Figtree** (body), both from Google Fonts.

## Assets
- **No raster/image assets.** Leo, the habitat scene, and all topic icons are drawn with CSS/DOM geometry (see `LionFace`/`HabLeo`, `HabScene`, and `TOPIC_ICON`). In production, replace these with the codebase's icon/illustration system or commission equivalent flat-geometric art — but match the Daybreak palette and the level-by-level habitat composition.
- **Fonts**: Google Fonts "Baloo 2" and "Figtree" (swap for licensed equivalents if needed).
- **Flags** (onboarding language dropdowns): use your standard flag/locale assets, or language names alone.

## Files
Hi-fi (source of truth for visuals) — each `.html` is a design-canvas host; the `.jsx` files hold the screen components:
- `LeoCards Daybreak Dashboard.html` + `daybreak-dashboard.jsx`
- `LeoCards Daybreak Add a Card.html` + `daybreak-addcard.jsx`, `daybreak-addcard-boards.jsx`
- `LeoCards Daybreak Browse Words.html` + `daybreak-browse.jsx`, `daybreak-browse-boards.jsx`
- `LeoCards Daybreak Habitat.html` + `daybreak-habitat-scene.jsx`, `daybreak-habitat.jsx`
- `LeoCards Daybreak Onboarding & Auth.html` + `daybreak-auth.jsx`, `daybreak-onboarding.jsx`
- Shared: `hifi-shared.jsx` (shell, LionFace, TField, TBtn, GhostPeek), `hifi-daybreak.jsx` (`d1` theme + Login), `design-canvas.jsx` (canvas harness — **not part of the app**, only the prototype viewer)

Low-fi (structure, flow, options, per-state notes):
- `LeoCards Dashboard Wireframes.html`, `LeoCards Add-a-Card Wireframes.html`, `LeoCards Browse Words Wireframes.html`, `LeoCards Habitat Wireframes.html`, `LeoCards Auth Wireframes.html`, `LeoCards Onboarding Wireframes.html` (+ their `wf-*.jsx`)

To preview any file: open the `.html` in a browser (they load React + Babel from a CDN). The on-screen margin notes in the wireframes explain intent and edge cases.
