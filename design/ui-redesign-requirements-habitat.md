# LeoCards — UI Redesign Requirements
## Habitat Page

**Purpose:** Reference for designing new mocks of the full-screen Habitat page. It documents what the screen must *do* and *show* — content, the living-world concept, states, and the emotional mechanics behind it — and deliberately avoids prescribing visual form. **This is a blue-sky brief:** the habitat is the soul of the product and the biggest canvas for brand and delight, so treat the current implementation as reference only. Nothing here dictates a specific art style, layout, or technique.

**Product context:** LeoCards gamifies language learning by growing a virtual habitat for a tiger mascot (currently "Leo"). Learning cards levels up and enriches the habitat; neglecting study makes it decay and the tiger grow unhappy. The Habitat page is the **reward and emotional anchor** of the whole app. Mobile-first, also used on desktop. The current warm-orange theme and 🐯 emoji are a starting reference only — **not mandatory**.

---

## What this is

A **full-screen view of the user's tiger and its habitat**, reached by tapping the habitat summary on the Dashboard. Unlike the rest of the app (utilitarian: decks, lists, forms), this screen is **ambient and alive** — it exists to make the user *feel* their progress, not to perform a task. There are no forms here; it's a place to look at, take pride in, and want to grow.

The current build renders it as a **pre-rendered ambient loop (a living scene that animates gently)** with the tiger in its environment, plus a few status overlays. How it's realised visually — illustration, 3D, animation, the art direction — is entirely the designer's to define.

---

## The core concept the design must express

The habitat is a **direct, emotional mirror of the user's learning habit.** Two things drive it:

1. **Growth (level)** — the more cards the user has *learned*, the higher the habitat **level**, and each level visibly **adds to the world**. It starts sparse and becomes rich and full of life. The progression (current design) is:
   - **L1** — just the tiger on a bare mound (starter)
   - **L2** — a lake, lilies, a path
   - **L3** — trees and rocks
   - **L4** — flowers, grass, butterflies
   - **L5** — an elephant companion arrives
   - **L6** — mushrooms
   - **L7** — a cave + a day/sleep cycle
   - **L8** — toys
   - **L9** — songbirds + golden-hour light (the current "endgame")
   *(These specific unlocks are the current design's idea of "the world filling in" — the designer can reinterpret what each stage adds, but the felt arc — sparse → lush, lonely → full of life — should hold.)*

2. **Health (quality / mood)** — the tiger has a **mood** that reflects how recently and consistently the user has studied:
   - **Excited** — within ~an hour of finishing a study session (a fresh-off-studying glow)
   - **Happy** — recently active, habitat in good health
   - **Neutral** — starting to slip
   - **Sad** — neglected for a while
   - On top of mood, sustained neglect causes the habitat's **quality to decay** (after a 2-day grace period), which can actually **drop the visible level back down** — the world literally shrinks if you stop studying. This is the stick to the level-up carrot, and the design should let the user *feel* both directions: flourishing when consistent, wilting when absent. (It never fully dies — there's a floor.)

> The redesign should make "my tiger is thriving because I've been studying" and "my tiger misses me" land emotionally, without being punishing or guilt-tripping.

---

## Content & functionality the design must accommodate

- **The scene itself** — the tiger + its habitat, ideally living/ambient (gentle motion), reflecting the **current level** (which environment elements are present) and the **current mood** (how the tiger looks/behaves).
- **Level indicator** — the user's current habitat level (1–9 today) shown clearly.
- **Mood indicator** — a readable signal of the tiger's current mood (Excited / Happy / Neutral / Sad). Currently a small labelled status dot; open to reinterpretation (the tiger's own expression could carry this).
- **Progress toward the next level** — a sense of how close the user is to the next unlock, and ideally *what* the next unlock is (anticipation is motivating). *(On the Dashboard this is a compact summary; on this full page there's room to make it richer — but keep the form open.)*
- **A way back** to the Dashboard / rest of the app.

> Note: the **compact habitat widget** on the Dashboard is specced separately (in the Dashboard doc). This page is the full, immersive version. They should feel like the same world at two scales.

---

## States the design must cover
1. **Normal / ambient** — the living habitat at the user's current level and mood. The default.
2. **Level-up celebration** — a moment of delight triggered when the user crosses into a new level (today: a brief "Level N!" flourish for ~2.5s, plus a bigger confetti moment elsewhere). This is the single most important emotional payoff in the app — design it to feel earned and joyful, and to hint at what newly appeared in the world.
3. **New user / Level 1** — the welcoming starter state: sparse but inviting, not empty or sad. Should make a brand-new user *want* to grow it.
4. **Decaying / sad** — habitat health has slipped from neglect; the tiger is neutral/sad and the world is less vibrant. Encouraging, not punishing — it should pull the user back, not shame them.
5. **Offline** — when showing cached/last-known data because the network is unavailable: a gentle, non-alarming indicator ("You're offline — showing last known state") while still showing the habitat.
6. **Error** — when the habitat can't load at all and there's no cached fallback: a friendly message ("We couldn't load your habitat. Check your connection and try again.") with a **Try again** action.
7. **Reduced motion** — a respectful static/calm version for users who prefer reduced motion (no looping animation).

---

## Domain concepts the designer should understand
- **"Learned" drives growth:** level comes from how many cards have reached the learned state (3 mastery rounds), summed across all the user's decks — not raw card count. So the habitat reflects genuine learning, not just adding words.
- **Decay is real and reversible:** quality erodes ~5%/day after a 2-day grace period and can lower the effective level; studying restores it. The habitat is a *current reflection*, not a permanent trophy — which is what makes it motivating.
- **Mood ≠ level:** a high-level habitat can still have a sad tiger (neglected), and a brand-new level-1 habitat can have an excited tiger (just studied). The two signals are independent and both should read clearly. *(All four moods can co-occur with any level.)*
- **Level 9 is today's ceiling** ("endgame for Course 1") — design should accommodate a satisfying "you've maxed the current world" feeling, with headroom for future expansion. *(Minor note for the team: some legacy copy references a "level 10 / a bird arrived" milestone; treat 9 as the current real cap and flag if a 10th milestone is intended.)*

---

## Requirements / constraints (must hold regardless of visual direction)
- **Performance matters a lot here.** This screen carries the app's richest visuals on mobile; the current build deliberately uses a pre-rendered ambient clip (with a still poster) rather than live 3D to keep it fast. Whatever the new direction, it must stay light on mobile and avoid layout shift while loading.
- **Respect reduced-motion preferences** with a calm static alternative.
- Must degrade gracefully: **offline → cached state**, **no data → friendly error + retry**. Never a blank or broken-looking screen.
- Level and mood must be legible at a glance, including over a busy/animated background.
- Touch targets ≥ 44px; comfortable one-handed on mobile.
- Reachable from the Dashboard, with an easy way back.

---

## Explicitly open for ideation (blue sky — reinterpret, don't copy)
- **The entire art direction** — illustration vs 3D vs animation style, the look of Leo and the world. This is the brand's defining visual.
- **What each level adds** and how growth is staged and revealed (the current unlock list is one interpretation).
- **How mood is expressed** — via the tiger's own animation/expression, ambient cues (weather, light), an explicit indicator, or a mix.
- **How progress-to-next-level and the next unlock are teased** to drive anticipation.
- **The level-up celebration** — the format, motion, and how it shows off what just appeared.
- **How decay/neglect is portrayed** — encouraging the user back without guilt.
- **The whole visual language** — palette, type, mascot treatment; current theme is reference only.

## Out of scope for this mock
The Dashboard's compact habitat widget (specced in the Dashboard doc — keep them consistent but don't redesign it here), the study/swipe screen, deck/add/browse screens, and auth. This page should link back to the Dashboard, but you don't need to design those here.
