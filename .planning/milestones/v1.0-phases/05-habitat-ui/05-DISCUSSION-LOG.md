# Phase 5: Habitat UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 05-habitat-ui
**Areas discussed:** Tiger visual style, Habitat scene composition, Scene layout & placement, Loading & transitions

---

## Tiger Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Cute cartoon | Round, expressive, Duolingo-owl-style | ✓ |
| Pixel art | Retro pixel sprite, frame-by-frame animation | |
| Illustrated / painted | Soft watercolor or flat illustration style | |

**User's choice:** Cute cartoon
**Notes:** Friendly and approachable, works well at small sizes.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sprite swap with bounce | Swap to new mood sprite with bounce animation | ✓ (for happier shifts) |
| Crossfade blend | Smoothly fade between mood sprites over ~0.5s | ✓ (for sadder shifts) |
| You decide | Claude picks best approach | |

**User's choice:** Directional — bouncy swap for happier mood shifts, crossfade blend for sadder mood shifts
**Notes:** User specified mood transition direction matters for emotional feel.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hero size (40-50%) | Tiger dominates the scene | |
| Medium (25-35%) | Tiger prominent, balanced with habitat | |
| Small mascot (15-20%) | Tiger part of environment, habitat is the star | ✓ |

**User's choice:** Small mascot (15-20%)
**Notes:** Habitat is the star, tiger lives in it.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle idle loop | Breathing + blink/tail swish | |
| Static pose per mood | Single pose for each mood | ✓ |

**User's choice:** Static pose per mood
**Notes:** Simpler, lower performance cost.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Happy bounce loop | Bounces with sparkle particles | ✓ |
| Star eyes + wiggle | Star/heart eyes with wiggle | |
| Same as happy | No special animation for excited | |

**User's choice:** Happy bounce loop with sparkle particles for excited mood
**Notes:** Celebratory, rewarding feel for the dopamine moment.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Center-bottom | Classic platform game feel | ✓ (one of 3) |
| Off-center 30% left | More natural | ✓ (one of 3) |
| Off-center 25% right | Visual variety | ✓ (one of 3) |

**User's choice:** Tiger roams between all 3 positions — random per page load, instant teleport
**Notes:** Adds life without idle animations.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Random per load | Random left/right flip each time | ✓ |
| Always faces right | Consistent orientation | |
| Faces center | Faces toward center from position | |

**User's choice:** Random facing direction per load

---

## Habitat Scene Composition

| Option | Description | Selected |
|--------|-------------|----------|
| Jungle / tropical forest | Lush greenery, vines, tropical plants | |
| Savanna / grassland | Open plains, warm tones, trees, rocks | ✓ |
| Abstract / fantastical | Floating islands, magic elements | |

**User's choice:** Savanna / grassland

---

| Option | Description | Selected |
|--------|-------------|----------|
| Additive layers | Start sparse, add elements per level | ✓ |
| Color/richness shift | Same elements, become more vibrant | |
| Both combined | New elements AND richer existing ones | |

**User's choice:** Additive layers

---

| Option | Description | Selected |
|--------|-------------|----------|
| Static daytime sky | Always sunny/bright | ✓ |
| Mood-reactive sky | Sky shifts with tiger mood | |

**User's choice:** Static daytime sky

---

| Option | Description | Selected |
|--------|-------------|----------|
| Elements fade out | Higher-level elements disappear | ✓ |
| Desaturation | Colors become muted/grey | |
| Wilting/drying | Plants droop, grass turns brown | |

**User's choice:** Elements fade out (reverse of additive progression)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle parallax (2-3 layers) | Foreground, mid-ground, distant hills | ✓ |
| Flat layers | 2D stacked vertically | |

**User's choice:** Subtle parallax (2-3 layers)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Bare grass + single tree | Minimal but welcoming starting point | ✓ |
| Small clearing with path | Clearing with hint of trail | |

**User's choice:** Bare grass + single tree

---

## Scene Layout & Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /habitat page | Full page, navigate to see tiger | |
| Dashboard hero section | Large banner at top of dashboard | |
| Both (page + mini widget) | Full scene on /habitat + small preview widget | ✓ |

**User's choice:** Both — full /habitat page + mini dashboard widget

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tiger + progress bar | Small sprite + progress bar toward next level | ✓ |
| Tiger + level badge | Small sprite + level number overlay | |
| Tiger + mood + level | Sprite, mood label, and level | |

**User's choice:** Tiger + progress bar for mini widget

---

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal overlay | Level badge in corner + mood indicator | ✓ |
| Stats panel below scene | PixiJS on top, HTML stats below | |

**User's choice:** Minimal overlay on full /habitat page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width, edge-to-edge | Stretches across viewport | ✓ |
| Contained with rounded corners | Scene in rounded card/frame | |

**User's choice:** Full-width, edge-to-edge

---

| Option | Description | Selected |
|--------|-------------|----------|
| 60-70% viewport height | Dominant element, room for nav | ✓ |
| Full viewport (100vh) | Maximum immersion | |
| 40-50% viewport height | Prominent but room for stats below | |

**User's choice:** 60-70% viewport height

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, clickable link | Tapping widget goes to /habitat | ✓ |
| No, just decorative | Static, nav menu only | |

**User's choice:** Yes, clickable link

---

## Loading & Transitions

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner / loading indicator | Centered spinner, clear feedback | ✓ |
| Skeleton with gradient | Savanna-colored gradient placeholder | |
| Instant placeholder tiger | Static SVG replaced by PixiJS | |

**User's choice:** Spinner / loading indicator

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fade in | Scene fades in over ~0.5s | ✓ |
| Instant snap | Appears immediately | |

**User's choice:** Fade in

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fade + scale pop | New element fades in with scale-up | ✓ |
| Simple fade in | Fades in over ~0.5s | |

**User's choice:** Fade + scale pop for level-up elements

---

| Option | Description | Selected |
|--------|-------------|----------|
| Only on page load | Fetch once, manual refresh | ✓ |
| Poll every 60s | Re-fetch every 60 seconds | |

**User's choice:** Only on page load

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, pause on hidden | Pause rendering on tab hidden | ✓ |

**User's choice:** Yes, pause on hidden (visibilitychange API)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tiny PixiJS canvas | Small PixiJS canvas for consistency | ✓ |
| HTML/CSS + static image | Lightweight, no PixiJS overhead | |

**User's choice:** Tiny PixiJS canvas for dashboard widget

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generic error with retry | "Something went wrong" + retry button | ✓ |
| Friendly fallback message | "Your tiger is sleeping" + illustration | |

**User's choice:** Generic error with retry

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show last cached state | Cache last API response, render from that | ✓ (with addition) |
| Same as error state | Same fallback as API errors | |

**User's choice:** Show last cached state + small "you're offline" indicator

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed aspect ratio, scale to fit | Maintains ratio, scales in container | ✓ |
| Fluid width, fixed height | Stretches horizontally | |

**User's choice:** Fixed aspect ratio, scale to fit — optimized for mobile

---

## Claude's Discretion

- Exact sprite atlas structure and naming conventions
- PixiJS container/stage hierarchy
- Cache implementation approach for offline state
- Specific savanna element choices per level
- Progress bar design on mini widget
- Level badge and mood indicator styling
- Parallax scroll speed / depth values

## Deferred Ideas

None — discussion stayed within phase scope.
