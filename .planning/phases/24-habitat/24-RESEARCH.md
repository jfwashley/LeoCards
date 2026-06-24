# Phase 24: Habitat — Research

**Researched:** 2026-06-24
**Domain:** Daybreak overlay re-skin of the existing pre-rendered video habitat
**Confidence:** HIGH (all findings verified against actual source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep the existing video habitat and re-skin overlays only — do not rebuild the flat-geometric scene. The page stays a contained 16/9 card (max-height `min(70vh, 400px)`), not full-screen immersive.
- **D-02:** Presentation-only phase — reuse the data layer (habitat-engine.ts, habitat-queries.ts, /api/habitat, computeHabitatState, the `?celebrate` param) untouched. No new domain logic; consume `level`, `mood`, `quality`, `isDecaying`, `nextLevelThreshold` from `HabitatState`.
- **D-03:** Three motion tiers. Desktop: clip autoplays fully (looping ambient motion). Mobile: clip autoplays then freezes to the still poster (lighter). Reduced-motion: still poster only, no autoplay, plus a new "Motion paused" label.
- **D-04:** Mobile freeze behaviour: play a short window, then freeze to the poster; pause when scrolled offscreen (IntersectionObserver) and resume on return. Default ~2 loops or ~10–12s before freeze.
- **D-05:** CSS mood-driven ambient-light tint plus golden-hour warm glow at L9, composited with the existing `decayFilter`. Clips not re-rendered.
- **D-06:** Keep the dev-only 3D capture pipeline (src/lib/habitat-3d/*, habitat-3d-canvas.tsx, `?capture=video`) intact.
- **D-07:** Celebration auto-settles after ~2.5s — no tap-to-continue. Overrides the mock's tap-to-continue.
- **D-08:** Celebration content = falling confetti + big "Level N" display + what-appeared reveal (H_NEXT). Under reduced-motion = static fallback (no falling confetti).
- **D-09:** Repair the trigger. Wire `?celebrate=N` to the overlay; confirm/repair study-complete → /habitat handoff so a level-up actually surfaces the celebration.
- **D-10:** When isDecaying = true, replace the bottom progress card with the "Leo misses you" decay card + "Study now" primary routing into the study flow.
- **D-11:** Keep the existing tuned decay filter `saturate(q)·brightness(0.6+0.4q)` (floor q=0.10) as-is, composited beneath the new Daybreak mood tint.
- **D-12:** L9 canonical cap. `nextLevelThreshold === null` means max level. Progress card: "Course 1 complete — you grew the whole world."
- **D-13:** Re-skin the chrome: back button (top-left → Dashboard), mood chip (HMoodChip), level badge (HLevelBadge, gold at L9). Offline = Daybreak cached banner; error = friendly + "Try again". Progress-card copy from H_NAME / H_NEXT.
- **D-14:** No sleeping/napping or night-cycle on this page. Match the 8 mock state boards.

### Claude's Discretion

- Exact per-mood tint hex values + opacity, the precise freeze-to-still timing (D-04), and the reduced-motion static-confetti treatment. Implement to the mock's MOOD/SKY/PAL palettes and feel. Keep the mood tint subtle enough that overlays stay legible over a busy clip.

### Deferred Ideas (OUT OF SCOPE)

- Re-rendering the video clips in the Daybreak flat-geometric palette.
- Full-screen immersive habitat layout.
- The legacy "level 10" milestone inconsistency (engine caps at 9, already resolved).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HAB-01 | Habitat is a living flat-geometric scene with cumulative level elements | D-01 lock: keep video; overlays implement the Daybreak re-skin on top of existing baked clips |
| HAB-02 | Mood expressed three independent ways (Leo expression baked in clip, ambient light = CSS tint, mood chip label) | D-05 CSS tint + D-13 HMoodChip atom |
| HAB-03 | Bottom progress card: Level N · name, progress bar, named next unlock, "Course 1 complete" at L9 | HProgCard design contract + H_NAME/H_NEXT tables; pct derivation from state |
| HAB-04 | Ambient motion light on mobile, fully paused under prefers-reduced-motion; static scene + "Motion paused" | D-03/D-04 three-tier motion model; WR-01 SSR-safe pattern |
| HAB-05 | Covers 8 states in Daybreak: new L1, mid L5, lush L9, level-up celebration, decaying, offline, error, reduced-motion | State boards from daybreak-habitat.jsx verified |
</phase_requirements>

---

## Summary

Phase 24 is a **presentation-only overlay layer** on top of the existing `<HabitatVideo>` component. The video clips, the engine, and the `/api/habitat` route are all untouched. The work falls into five distinct tracks:

**Track A — Colour tint (D-05):** Add a `position:absolute; inset:0` CSS `<div>` inside the video wrapper with a `mix-blend-mode: screen` (or `rgba` flat overlay), driven by mood and golden-hour state. Four mood tints derived from the handoff's `MOOD` palette. The existing `decayFilter` on `<HabitatVideo>` stays on the media; the new tint sits on a sibling layer above it.

**Track B — Chrome re-skin (D-13):** Replace the existing pre-Daybreak `MoodIndicator` + level badge pill in `habitat-scene.tsx` with the `HTop` assembly — `HBack` (circular glassy button → Dashboard Link), `HMoodChip` (coloured dot + label, 4 moods), `HLevelBadge` (round LVL pill, gold at L9). These are new atoms in `src/components/daybreak/`.

**Track C — Bottom cards (D-10/D-03/HAB-03):** Render `HProgCard` when not decaying (Level N · H_NAME, pct bar, H_NEXT unlock line, "Course 1 complete" at L9), and `HDecayCard` ("Leo misses you" / "Study now") when `isDecaying = true`. Progress percentage is `Math.round((effectiveCardCount / nextLevelThreshold) * 100)`.

**Track D — Mobile freeze (D-03/D-04):** After mount, if the device is narrow (client-side `window.innerWidth < 768`), set up a timer (~10–12s) to call `videoRef.current.pause()` and hide the video element (show the poster layer). An `IntersectionObserver` resumes the video when the card re-enters the viewport and re-freezes after the same delay. This is entirely client-side and SSR-safe because the default is "playing" (same as now).

**Track E — Level-up celebration repair (D-07/D-08/D-09):** `habitat-scene.tsx` already receives `celebratingLevel` from `page.tsx` but marks it `_celebratingLevel` and ignores it entirely. The fix: on mount, if `celebratingLevel != null`, immediately show the celebration overlay and schedule `setTimeout(settle, 2500)`. The study-complete flow routes to `/dashboard`, not `/habitat`, so there is no existing `/habitat?celebrate=N` redirect from study. The repair must also redirect from study's end screen to `/habitat?celebrate=N` (replacing the current dashboard redirect for level 1–8 level-ups). Level-9 unlock ("Course 1 complete") remains a special case.

**Primary recommendation:** Edit `habitat-scene.tsx` as the primary surface; add Daybreak atoms (`h-back.tsx`, `h-mood-chip.tsx`, `h-level-badge.tsx`, `h-prog-card.tsx`, `h-decay-card.tsx`) to `src/components/daybreak/`; extend `habitat-video.tsx` minimally for the mobile freeze; wire `celebratingLevel` in `habitat-scene.tsx`; redirect study-session end screen to `/habitat?celebrate=N` for levels 1–8.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Colour tint overlay | Browser/Client | — | CSS absolute div, mood-driven, no server state needed |
| Chrome (back, mood chip, level badge) | Browser/Client | API/Backend (state source) | Daybreak atoms render from HabitatState props; state comes from server shell |
| Bottom progress card | Browser/Client | API/Backend | Derived from HabitatState; no new API surface |
| Decay card (Leo misses you) | Browser/Client | — | Same: `isDecaying` already in HabitatState |
| Mobile freeze / IntersectionObserver | Browser/Client | — | Viewport detection must be client-side |
| Reduced-motion poster swap | Browser/Client | — | usePrefersReducedMotion already SSR-safe; new "Motion paused" label same tier |
| Level-up confetti overlay | Browser/Client | — | All animation CSS / React state; no server involvement |
| Level-up trigger wiring | Browser/Client + Server shell | — | page.tsx threads `celebratingLevel` already; HabitatScene must consume it |
| Study-complete → /habitat redirect | Browser/Client (study-session.tsx) | — | Redirect on study end for levels 1–8; currently hardcoded to /dashboard |
| Offline banner | Browser/Client | — | Already implemented; re-skin copy/style only |
| Error state | Browser/Client | — | Already implemented; re-skin copy/style only |

---

## Standard Stack

### Core (already installed, no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | installed | Component model | App-wide |
| Next.js | 16.2.1 | [VERIFIED: node_modules/next/package.json] SSR shell, Link, Image | App-wide |
| Tailwind v4 | installed | Utility CSS | App-wide |
| tw-animate-css | installed | `animate-in fade-in` utilities | Already used in habitat-scene.tsx for offline badge |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| usePrefersReducedMotion | internal | SSR-safe reduced-motion | Already in use; extend for new confetti + tint |
| CSS `filter` | native | decayFilter + mood tint compositing | Zero-layout, perf-safe |
| IntersectionObserver | native Web API | Pause video when offscreen | Supported in all modern browsers; no polyfill needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS absolute div for tint | SVG feColorMatrix | More powerful but unnecessary; rgba div compositing is lighter |
| `window.innerWidth` client-side check | User-Agent header SSR | UA mobile detection is unreliable; client-side check after mount is simpler and consistent with existing usePrefersReducedMotion pattern |
| IntersectionObserver for freeze | `visibilitychange` event | visibilitychange is page-level (tab switch), not scroll-out-of-view; IntersectionObserver is the correct primitive |

### Installation

No new packages required. [VERIFIED: node_modules — all dependencies already present]

---

## Package Legitimacy Audit

No new packages are installed in this phase. All dependencies are already present in node_modules.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Server shell (page.tsx)
  ├── reads ?celebrate=N → celebratingLevel
  ├── getHabitatFacts → computeHabitatState → HabitatState
  └── renders <HabitatScene habitatState celebratingLevel>

HabitatScene (habitat-scene.tsx) — primary edit surface
  ├── video wrapper (WRAPPER_STYLE: aspect-ratio 16/9, max-height min(70vh,400px))
  │   ├── <HabitatVideo> (kept as-is; decayFilter on media)
  │   └── [NEW] mood tint layer (absolute div, CSS only)
  ├── [NEW] HTop overlay (HBack | HMoodChip | HLevelBadge) — z-index above wrapper
  ├── [NEW] "Motion paused" label — shows only when reduced && !isDecaying
  ├── [NEW] HProgCard or HDecayCard — bottom of scene
  ├── offline banner (re-skinned)
  ├── error state (re-skinned)
  └── [REPAIRED] CelebrationOverlay — triggered by celebratingLevel on mount
                                       auto-settles 2.5s; static fallback reduced-motion

study-session.tsx (end screen, level 1-8 level-up)
  └── [NEW] router.push(`/habitat?celebrate=${leveledUp}`) [was: /dashboard]

HabitatVideo (habitat-video.tsx) — minimal edit
  └── [NEW] videoRef + mobile freeze logic (useEffect, IntersectionObserver)
```

### Recommended Project Structure

New Daybreak atoms for this phase (in `src/components/daybreak/`):

```
src/components/daybreak/
├── h-back.tsx             # HBack: circular glassy back button → Dashboard Link
├── h-mood-chip.tsx        # HMoodChip: coloured dot + mood label
├── h-level-badge.tsx      # HLevelBadge: round LVL pill, gold at L9
├── h-top.tsx              # HTop: flex row composing the above three
├── h-prog-card.tsx        # HProgCard: bottom progress card (level name, bar, unlock)
└── h-decay-card.tsx       # HDecayCard: "Leo misses you" / "Study now"
```

The celebration overlay can upgrade the existing `level-up-overlay.tsx` (removing the framer-motion dep; replacing with CSS-only confetti and the H_NEXT what-appeared card) or be a new file. **Recommendation: new file `src/components/habitat-celebration.tsx`** — avoids breaking the existing overlay still used on the study-session end screen.

### Pattern 1: CSS Mood Tint (D-05)

**What:** An absolutely-positioned `<div>` inside the video wrapper with a colour wash derived from the current mood and level. Sits above the poster + video layers (z-index 1). Pointer-events none.

**When to use:** Every render of HabitatScene where `!error` and `!offline` (offline shows the cached scene without the tint change).

**Tint mapping from handoff MOOD/SKY palettes** (daybreak-habitat-scene.jsx, lines 7–16):

```
MOOD:
  excited → #F2B33A  (amber gold)   — warm, bright tint
  happy   → ht.green (#3E9B5F)      — fresh green tint
  neutral → #B7A98F                  — muted warm beige
  sad     → #7C93B0                  — cool blue-grey

SKY:
  day  → linear-gradient(180deg, #FFEAC0, #FFF6E8, #FBF0DB)  (excited/happy/neutral)
  gold → linear-gradient(180deg, #FFD08A, #FFE3B6, #FBD7BE)  (L9 golden-hour)
  decay→ linear-gradient(180deg, #E7E3D8, #F0ECE2)           (isDecaying)

Golden-hour overlay (L9, !decay, from line 230):
  radial-gradient(circle at 72% 26%, rgba(255,200,110,0.28), transparent 55%)

Decay colour overlay (from line 231):
  linear-gradient(180deg, rgba(120,120,130,0.06), rgba(120,120,130,0.12))
```

The tint div is SEPARATE from the `decayFilter` (which lives on the `<video>` and `<img>` elements inside HabitatVideo, via the `filter` CSS property). Both composit visually. The tint layer is placed ABOVE the video but BELOW the chrome (HTop, cards).

```typescript
// Source: daybreak-habitat-scene.jsx lines 200–235 (REFERENCE only — adapt to React/TS)
function moodTint(mood: TigerMood, isDecaying: boolean, level: number): string {
  if (isDecaying) return 'rgba(120,120,130,0.10)'; // flat grey wash
  if (level >= 9) return 'rgba(255,200,110,0.22)'; // golden-hour radial applied separately
  const map: Record<TigerMood, string> = {
    excited: 'rgba(242,179,58,0.12)',
    happy:   'rgba(62,155,95,0.10)',
    neutral: 'rgba(183,169,143,0.10)',
    sad:     'rgba(124,147,176,0.12)',
  };
  return map[mood] ?? 'rgba(0,0,0,0)';
}
```

L9 golden-hour should use a radial gradient as a CSS `background` (not a flat rgba) to match the handoff. Keep opacity subtle (0.18–0.28 range) so clip content remains legible.

**CLS impact:** Zero — the tint div is `position:absolute; inset:0; pointer-events:none` inside the already-sized wrapper. No layout contribution.

### Pattern 2: SSR-Safe Mobile Freeze (D-03/D-04)

**What:** After mount, detect if the viewport is narrow (mobile). If so, start a timer that calls `videoRef.current.pause()` after ~10s (2 loops at ~5s each). An IntersectionObserver resumes playback when the wrapper re-enters the viewport (user scrolls down and back up), then re-schedules the freeze timer.

**Why client-side detection, not SSR:** `window.innerWidth` is only available client-side. UA parsing is fragile. This matches the existing pattern for `usePrefersReducedMotion` (defaults false on SSR, reads actual state after mount). The video is already autoplay on initial render — the freeze is additive.

**Freeze mechanism — pause() vs swap-to-poster:** `videoRef.current.pause()` is preferred over removing the `<video>` and showing only the poster. Rationale: (a) pausing keeps the video element in place (no DOM churn, no CLS), (b) the poster `<Image>` is already rendered underneath as the permanent LCP layer — it naturally shows through when the video pauses because the paused video displays its last decoded frame (not blank), which is visually similar to the poster at that moment. No swap needed; the pause IS the freeze.

**Loop-count freeze trigger:** Listening for the `ended` event on a `loop` video is not standard (loop suppresses `ended`). Recommended trigger: `setTimeout(freeze, 10_000)` after mount (approximately 2 loops for most clips). Reset the timer each time the IntersectionObserver reports re-entry.

```typescript
// Source: derived from CONTEXT.md D-04 + Web API standards
// Attach ref to <video> in habitat-video.tsx
useEffect(() => {
  const video = videoRef.current;
  if (!video || reducedMotion) return;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (!isMobile) return; // desktop: keep looping

  let freezeTimer: ReturnType<typeof setTimeout> | null = null;

  const freeze = () => { video.pause(); };
  const scheduleFreeze = () => {
    if (freezeTimer) clearTimeout(freezeTimer);
    freezeTimer = setTimeout(freeze, 10_000);
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      video.play().catch(() => {}); // resume; catch autoplay-policy rejection
      scheduleFreeze();
    } else {
      if (freezeTimer) clearTimeout(freezeTimer);
      video.pause(); // offscreen: pause immediately
    }
  }, { threshold: 0.1 });

  observer.observe(video);
  scheduleFreeze(); // start the initial timer

  return () => {
    observer.disconnect();
    if (freezeTimer) clearTimeout(freezeTimer);
  };
}, [reducedMotion]); // re-run if reduced-motion changes
```

**SSR safety:** The effect runs only after mount (`useEffect`). No SSR impact; the server always emits the video markup unchanged.

**`video.play()` returns a Promise** (may reject on autoplay policy). Always `.catch(() => {})` to avoid unhandled rejection.

**biome `noNonNullAssertion`:** Use `videoRef.current?.pause()` and `entry?.isIntersecting` (optional chaining). The project bans `!`.

### Pattern 3: Level-Up Celebration Trigger Repair (D-09)

**Root cause (confirmed in code):**

1. `page.tsx` reads `?celebrate=N` and passes `celebratingLevel` to `<HabitatScene>`.
2. `habitat-scene.tsx` receives it as `_celebratingLevel` (prefixed underscore = intentionally unused) — line 113. It was wired for API parity but never consumed.
3. The existing level-up detection in `habitat-scene.tsx` (lines 153–161) watches `state.level > prevLevelRef.current` — but `state` starts as `habitatState` (server-computed). On a fresh page load, `prevLevelRef` initialises to `habitatState.level` (same value) so the comparison is never `>` on mount. The celebration NEVER fires.
4. Study-complete path: `study-session.tsx` line 218 routes `leveledUp === 10` to `/dashboard?celebrate=10`. For levels 1–8 there is NO redirect to `/habitat` at all — the user stays on the study end screen then navigates home. So the `/habitat?celebrate=N` URL is never constructed by the current code for typical level-ups.

**Repair plan:**

Step 1 — In `habitat-scene.tsx`, consume `celebratingLevel` on mount:
```typescript
const [showCelebration, setShowCelebration] = useState(
  celebratingLevel != null && celebratingLevel > 0
);
useEffect(() => {
  if (!showCelebration) return;
  const t = setTimeout(() => setShowCelebration(false), 2500);
  return () => clearTimeout(t);
}, []); // intentionally empty — fire once on mount
```

Step 2 — In `study-session.tsx`, replace the level 1–8 post-session flow. Currently the "Back to deck" button on the end screen just routes to `/dashboard?deck=...`. If `leveledUp` is set (levels 1–8), instead route to `/habitat?celebrate=${leveledUp}`. The level-10 special case (currently routes to `/dashboard?celebrate=10`) can be repaired consistently: level 9 level-up → `/habitat?celebrate=9`.

`handleLevelUpDismiss` at line 214–220 currently gates `leveledUp === 10` to push to dashboard. This logic existed for the old level-10 display; since the engine caps at 9 and the level-up overlay on the study screen is a separate thing from the habitat page, the safest repair is:

```typescript
// study-session.tsx: after LevelUpOverlay dismisses, route to /habitat?celebrate=N
const handleLevelUpDismiss = useCallback(() => {
  const leveledUp = showLevelUp;
  setShowLevelUp(null);
  if (leveledUp !== null) {
    router.push(`/habitat?celebrate=${leveledUp}`);
  }
}, [showLevelUp, router]);
```

This means both level 9 and other levels route to `/habitat` after the study-session overlay dismisses. The "Back to deck" button on the study end screen continues to go to `/dashboard`. The habitat page then shows the celebration on arrival.

**What-appeared reveal (D-08):** The H_NEXT table gives the unlock for the level the user just reached (the NEW level). For example, reaching level 5 shows "An elephant moved in!" (H_NEXT[4].what). Since `celebratingLevel` is the new level, the unlock copy is `H_NEXT[celebratingLevel - 1]?.what` (and `H_NEXT` keys are 1–8; L9 has no next entry — use the "Course 1 complete" copy).

**LevelUpOverlay.tsx reuse:** The existing component uses `motion/react` (framer-motion) which was removed from /habitat in Phase 13.1 for perf. **Do not reuse it on /habitat.** Create a new CSS-only `HabitatCelebration` component that matches the handoff's `HabCelebrate` pattern: CSS `@keyframes` fall animation for confetti particles (or Tailwind `animate-bounce`/custom keyframe), no motion library.

### Pattern 4: Progress Card Percentage Derivation

From `HabitatState`, the progress percentage is:
```typescript
const pct = nextLevelThreshold !== null
  ? Math.min(100, Math.round((effectiveCardCount / nextLevelThreshold) * 100))
  : 100;
```

`effectiveCardCount` = Math.floor(quality * learnedCardCount) — already in the state object. `nextLevelThreshold` is the raw card count needed for the next level (not the delta), so this formula gives percentage from 0 to threshold (not from the previous threshold). This matches the handoff's progress bar intent (fill from 0).

### Pattern 4b: Deck-targeting for "Study now" (D-10)

The "Study now" button must route into the study flow. Study requires `?deck=deckId`. The habitat page does not currently know the user's active deck ID (it only has `HabitatState`). Options:
- Query the active deck from the study route (redirect `/study` which redirects if no deck param is given).
- Route to `/dashboard` which has "Start studying" prominently visible.

**Recommendation:** Route "Study now" to `/dashboard` — simpler, no new data fetching, and the Dashboard already surfaces the start-studying affordance. Alternatively, if `deckId` is threaded from the habitatFacts, use it directly. **Check: `habitatFacts.userId` is available but no active deck ID.** Route to `/dashboard`.

### Anti-Patterns to Avoid

- **Importing motion/react on /habitat:** The library was explicitly removed from this route (Phase 13.1, 71KB chunk). All animation must be CSS-only (`@keyframes`, Tailwind animate-* utilities, or `transition`).
- **Using `!` non-null assertions:** biome enforces `noNonNullAssertion`. Use `?.` and `?? fallback` instead.
- **UA-sniffing for mobile detection in SSR:** Use client-side `window.innerWidth < 768` inside `useEffect`, not server-side User-Agent parsing (fragile, adds server coupling).
- **Consuming H_NEXT[9]:** H_NEXT has keys 1–8 only. Level 9 has no "next" entry. Guard: `H_NEXT[level]` where level ≤ 8.
- **Re-using LevelUpOverlay in habitat-scene.tsx:** It depends on motion/react; do not import it on /habitat.
- **Calling `video.play()` without `.catch()`:** Returns a Promise; unhandled rejection possible on mobile.
- **Omitting `pointer-events: none` on the tint layer:** The tint div sits above the video — must not capture click/touch events meant for the chrome buttons.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti animation | Custom JS particle system | CSS `@keyframes` + absolute divs (same pattern as handoff HabCelebrate) | The handoff has 26 pre-positioned confetti divs with `animationDelay` — pure CSS, no runtime |
| CSS confetti fall | motion/react Framer Motion | CSS `@keyframes fall { from { top: -10%; } to { top: 110%; } }` | motion/react was removed from /habitat; CSS equivalent is ~0 KB |
| Mobile detection | next/headers UA parsing | `window.innerWidth < 768` in `useEffect` | Client-side check is simpler, consistent with existing hook pattern, no SSR coupling |
| Progress bar | Custom SVG / canvas | CSS `width: pct%` inside a styled div with `overflow:hidden` | The handoff shows a simple linear fill; Tailwind inline-style is sufficient |
| Level name lookup | DB query | H_NAME and H_NEXT constants (co-locate from handoff in a ts file) | Already defined in daybreak-habitat.jsx; extract to a ts constant file |

**Key insight:** The handoff JSX is pure CSS — zero third-party libraries. Match that approach rather than reaching for a library.

---

## Runtime State Inventory

Phase 24 is not a rename/refactor/migration phase. No stored data, live service config, OS-registered state, secrets, or build artifacts carry strings that need renaming.

**Nothing found in any category** — verified by reading all modified files and the study-complete route.

---

## Common Pitfalls

### Pitfall 1: Confetti on /habitat using motion/react
**What goes wrong:** Copying `level-up-overlay.tsx` pattern into the new HabitatCelebration component imports `motion/react`, which was explicitly removed from /habitat (Phase 13.1 perf, 71 KB chunk).
**Why it happens:** The existing overlay is the obvious reference; it uses `motion.div` for confetti fall.
**How to avoid:** Write a NEW `habitat-celebration.tsx` using CSS `@keyframes`. Define `hab-fall` in globals.css or as a CSS module. Match the handoff's 26-particle pattern directly.
**Warning signs:** `import { motion }` appearing in any file that is imported by `/habitat` route.

### Pitfall 2: celebratingLevel ignored on prop vs mount
**What goes wrong:** Using a `useEffect(() => {...}, [celebratingLevel])` to trigger the celebration. On fresh page load, `celebratingLevel` doesn't change (it's the initial value), so the effect fires... once... but `prevLevelRef` tracking causes a guard that prevents it.
**Why it happens:** The existing dead level-up code watches `state.level > prevLevelRef.current`, which can't fire on mount.
**How to avoid:** Use `useState(() => celebratingLevel != null && celebratingLevel > 0)` for initial state. The `useEffect` that auto-settles only needs to fire once on mount if `showCelebration` is initially true.
**Warning signs:** Celebration never shows even when navigating to `/habitat?celebrate=5`.

### Pitfall 3: video.play() Promise rejection on mobile
**What goes wrong:** After IntersectionObserver calls `video.play()`, the browser rejects the promise (autoplay policy), causing an uncaught promise error in the console and potentially a React error boundary trigger.
**Why it happens:** Mobile browsers sometimes block `play()` calls even on muted videos after a pause.
**How to avoid:** Always `.catch(() => {})`. Log optionally but never throw.
**Warning signs:** Console error "The play() request was interrupted" or similar.

### Pitfall 4: WR-01 — SSR reduced-motion flash on confetti + tint
**What goes wrong:** `usePrefersReducedMotion` returns `false` on SSR and first paint. If confetti or the tint div renders based on `!reducedMotion` before the hook resolves, users with reduced-motion get a flash of animated content.
**Why it happens:** `useState(false)` default in `use-prefers-reduced-motion.ts` — returns false until `useEffect` fires.
**How to avoid:** Use the same established pattern: the confetti layer is gated on `!reducedMotion`. Since it starts as `false`, confetti WILL render initially on a reduced-motion device. Fix: start with `useState(true)` only if `typeof window !== 'undefined' && window.matchMedia(QUERY).matches` — but since that runs SSR it needs the same guard. The existing pattern in `habitat-video.tsx` is: server emits the `<video>` (motion), then `useEffect` swaps to poster if reduced. Apply the same: default to "motion on" in the celebration, and swap off after mount if reduced. For the confetti the visual flash is ~16ms (one frame before hydration); a `visibility: hidden` wrapper toggled after mount would eliminate it, but this is likely acceptable — use the same pattern as habitat-video.tsx.
**Warning signs:** Seeing confetti particles render briefly on a `prefers-reduced-motion: reduce` device.

### Pitfall 5: H_NEXT out-of-bounds at L9
**What goes wrong:** `H_NEXT[9]` is undefined — the table only covers levels 1–8. Accessing it returns `undefined`, causing a TypeError if `.what` or `.at` is accessed.
**Why it happens:** L9 is the cap; there is no level 10 unlock.
**How to avoid:** Guard: `const nx = level < 9 ? H_NEXT[level] : null` (or use `nextLevelThreshold === null` as the signal, which is already in HabitatState).
**Warning signs:** TypeScript error "Cannot read property 'what' of undefined" or runtime null error at L9.

### Pitfall 6: Tint div blocking touch events on chrome buttons
**What goes wrong:** The mood tint div sits above the video but if it covers the HTop area, touch events on HBack/HMoodChip/HLevelBadge are blocked.
**Why it happens:** The tint div with `position:absolute; inset:0` covers the full wrapper including the chrome overlay area if z-indices are wrong.
**How to avoid:** Add `pointer-events: none` to the tint div. Ensure chrome atoms (HTop, HProgCard/HDecayCard) have higher z-index than the tint div.
**Warning signs:** Clicking the back button does nothing on mobile.

### Pitfall 7: getLayersForLevel from habitat-ui-utils.ts
**What goes wrong:** Importing `getLayersForLevel` from `habitat-ui-utils.ts` for level name/unlock copy — it uses a legacy 10-level system with different naming that contradicts H_NAME/H_NEXT.
**Why it happens:** The file exists and sounds relevant.
**How to avoid:** Do NOT use `getLayersForLevel` or `getDecayAlpha` from habitat-ui-utils.ts. Use H_NAME/H_NEXT from the handoff only. The CONTEXT.md explicitly warns about this file.

### Pitfall 8: e2e selector drift
**What goes wrong:** The re-skin changes visible text and structure (new mood chip format, new level badge DOM, new progress card, new offline copy). Existing e2e specs in `07-habitat-display.spec.ts` use literal-text locators that will break.
**Why it happens:** Selectors target text like `getByText(/Level 1/)`, `getByText(/Excited|Happy|Neutral|Sad/)`, `getByText("Level")` — all of which are still present but their DOM context changes.
**How to avoid:** See e2e impact section below. Add `data-testid` attributes to the new atoms and retarget to those.

---

## e2e Impact Audit

Files with habitat locators that WILL break or need verification:

### `e2e/07-habitat-display.spec.ts` — PRIMARY RETARGET

| Current locator | Will break? | Reason | Recommended replacement |
|----------------|------------|--------|-------------------------|
| `page.getByText(/Level 1/)` (widget test) | No | Dashboard widget text, not habitat page | Keep (scoped to dashboard) |
| `page.getByText(/\d+ of \d+ cards/)` | No | Dashboard hero subtitle | Keep |
| `page.getByText("Level")` after goto /habitat | **Yes** | The new HLevelBadge renders "LVL\n{N}" not "Level N" | Retarget to `data-testid="habitat-level-badge"` |
| `page.getByText(/Excited|Happy|Neutral|Sad/)` | **Yes** | HMoodChip renders the same text but inside new DOM structure; the test body is broad enough it probably still matches, but fragile | Add `data-testid="habitat-mood-chip"` and retarget |
| `[aria-label="Loading habitat"]` check | No | Already checking with `catch(() => false)` | Keep as-is |

### `e2e/13-habitat-3d.spec.ts` — SAFE
All selectors target `data-testid="habitat-video"`, `data-testid="habitat-video-still"`, and `data-testid="habitat-3d-canvas"`. These testids must be preserved in habitat-video.tsx (no changes to them).

### `e2e/13-habitat-states.spec.ts` — SAFE
Targets video element CSS filter + clip src attribute. Unaffected by re-skin.

### `e2e/13-perf.spec.ts` — VERIFY
Uses `waitForLoadState` on `/habitat`. The LCP candidate (poster image) must remain `priority` and `data-testid="habitat-video-still"`. The perf spec doesn't assert text content; verify it still runs.

### New data-testids to add in Phase 24

| Element | testid |
|---------|--------|
| HBack button | `habitat-back-btn` |
| HMoodChip | `habitat-mood-chip` |
| HLevelBadge | `habitat-level-badge` |
| HProgCard | `habitat-prog-card` |
| HDecayCard | `habitat-decay-card` |
| "Motion paused" label | `habitat-motion-paused` |
| Celebration overlay | `habitat-celebration` |
| Offline banner | `habitat-offline-banner` |

---

## Code Examples

### Level-up trigger wiring (habitat-scene.tsx)

```typescript
// Source: analysis of page.tsx (lines 21-23) + habitat-scene.tsx (lines 107-116)
export function HabitatScene({
  habitatState,
  celebratingLevel = null,
}: {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}) {
  // REPAIR: consume celebratingLevel on mount (was _celebratingLevel, ignored)
  const [showCelebration, setShowCelebration] = useState(
    () => celebratingLevel != null && celebratingLevel > 0
  );
  useEffect(() => {
    if (!showCelebration) return;
    const t = setTimeout(() => setShowCelebration(false), 2500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — fire once on mount
  // ...
}
```

### Progress card percentage

```typescript
// Source: HabitatState fields (habitat-engine.ts lines 80-100)
const { level, effectiveCardCount, nextLevelThreshold } = state;
const pct = nextLevelThreshold !== null
  ? Math.min(100, Math.round((effectiveCardCount / nextLevelThreshold) * 100))
  : 100;
```

### HMoodChip atom

```typescript
// Source: daybreak-habitat.jsx lines 21-29 — adapt to TypeScript
import type { TigerMood } from "@/lib/habitat-engine";

const MOOD_CONFIG: Record<TigerMood, { label: string; color: string }> = {
  excited: { label: "Excited", color: "#F2B33A" },
  happy:   { label: "Happy",   color: "#3E9B5F" },
  neutral: { label: "Neutral", color: "#B7A98F" },
  sad:     { label: "Sad",     color: "#7C93B0" },
};

export function HMoodChip({ mood }: { mood: TigerMood }) {
  const cfg = MOOD_CONFIG[mood];
  return (
    <div data-testid="habitat-mood-chip"
      style={{ height: 36, padding: "0 13px 0 11px", borderRadius: 999,
               background: "rgba(255,255,255,0.86)", backdropFilter: "blur(4px)",
               display: "flex", alignItems: "center", gap: 8,
               boxShadow: "0 3px 10px rgba(120,80,30,0.14)", flex: "none" }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%",
                     background: cfg.color,
                     boxShadow: `0 0 0 3px ${cfg.color}33` }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: "#4A331C" }}>
        {cfg.label}
      </span>
    </div>
  );
}
```

### H_NAME and H_NEXT constants (extract to ts file)

```typescript
// Source: daybreak-habitat.jsx lines 4-10
// Extract to: src/lib/habitat-names.ts (no logic, pure data)
export const H_NAME: Record<number, string> = {
  1: "Bare mound", 2: "Lakeside", 3: "Woodland", 4: "Meadow",
  5: "Savanna", 6: "Glade", 7: "Den", 8: "Playground", 9: "Golden hour",
};
export const H_NEXT: Record<number, { at: number; what: string }> = {
  1: { at: 2, what: "a lake & lily pads" },
  2: { at: 3, what: "trees & rocks" },
  3: { at: 4, what: "flowers & butterflies" },
  4: { at: 5, what: "an elephant friend" },
  5: { at: 6, what: "mushrooms" },
  6: { at: 7, what: "a cave & nights" },
  7: { at: 8, what: "toys to play with" },
  8: { at: 9, what: "songbirds & golden light" },
  // L9 has no next entry — guard callers with nextLevelThreshold === null
};
```

### CSS-only confetti keyframe (globals.css addition)

```css
/* Source: daybreak-habitat.jsx HabCelebrate (lines 162-186) — adapted to CSS */
@keyframes hab-fall {
  from { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
```

Each confetti particle is an absolutely-positioned `<div>` with `animation: hab-fall 2.5s ease-in forwards` and a staggered `animation-delay`. Under reduced-motion, `@media (prefers-reduced-motion: reduce) { .confetti-particle { animation: none; } }` to make them static (matching D-08 static fallback requirement). The handoff (line 163) defines 5 colours and 26 particles.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-Daybreak level badge pill (amber bg, "Level N" text) | Daybreak HLevelBadge (round pill, "LVL" + number, gold at L9) | Phase 24 | Selector drift in 07-habitat-display.spec.ts |
| MoodIndicator (absolute top-right, dot + text) | HMoodChip (glassy frosted pill, coloured dot + label) | Phase 24 | Same text content but different DOM |
| No progress card (progress shown only on dashboard) | HProgCard bottom card | Phase 24 | New element, new testids needed |
| Level-up overlay: framer-motion, tap-to-dismiss | CSS-only confetti, auto-dismiss 2.5s | Phase 24 | Remove motion dep from /habitat |
| celebratingLevel ignored | celebratingLevel consumed on mount | Phase 24 | Level-up celebration now actually appears |
| No mobile freeze | Mobile: play then freeze to poster ~10s | Phase 24 | Mobile users see lighter motion |

**Deprecated/outdated:**
- `_celebratingLevel` prefix in `habitat-scene.tsx`: remove the underscore and wire it.
- `getLayersForLevel` from habitat-ui-utils.ts: do not use for level names/unlocks (wrong table).
- Mock's "Tap to continue" in HabCelebrate (daybreak-habitat.jsx line 183): overridden by D-07 (auto-dismiss).
- Mock's `level >= 10` check (HabCelebrate): engine caps at 9; use `nextLevelThreshold === null`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase adds no external tools, CLI utilities, or services).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (node environment — no jsdom by default) |
| Config file | `vitest.config.ts` at repo root |
| Quick run command | `npx vitest run src/components/__tests__/habitat-video.test.ts src/lib/__tests__/habitat-names.test.ts` |
| Full suite command | `npx vitest run` |
| e2e run command | `npx playwright test e2e/07-habitat-display.spec.ts e2e/13-habitat-3d.spec.ts e2e/13-habitat-states.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAB-01 | Video wrapper maintains 16/9 aspect ratio and max-height | unit (source-grep) | `npx vitest run src/components/__tests__/habitat-scene-video.test.ts` | ✅ |
| HAB-01 | H_NAME returns correct name for levels 1–9 | unit | `npx vitest run src/lib/__tests__/habitat-names.test.ts` | ❌ Wave 0 |
| HAB-01 | H_NEXT returns correct unlock for levels 1–8, undefined for L9 | unit | `npx vitest run src/lib/__tests__/habitat-names.test.ts` | ❌ Wave 0 |
| HAB-02 | moodTint returns correct rgba per mood | unit | `npx vitest run src/components/__tests__/habitat-tint.test.ts` | ❌ Wave 0 |
| HAB-02 | L9 golden-hour tint is distinct from normal mood tint | unit | same | ❌ Wave 0 |
| HAB-02 | isDecaying tint is the grey wash | unit | same | ❌ Wave 0 |
| HAB-03 | pct formula: effectiveCardCount / nextLevelThreshold * 100, capped at 100 | unit | `npx vitest run src/components/__tests__/habitat-prog-card.test.ts` | ❌ Wave 0 |
| HAB-03 | pct = 100 when nextLevelThreshold === null | unit | same | ❌ Wave 0 |
| HAB-03 | H_NEXT content shows for levels 1–8, "Course 1 complete" for L9 | unit | same | ❌ Wave 0 |
| HAB-04 | celebratingLevel triggers celebration on mount (useState lazy init) | unit (source-grep) | `npx vitest run src/components/__tests__/habitat-scene-video.test.ts` | see VS-* tests |
| HAB-04 | confetti NOT present when reduced-motion | unit (source-grep) | `npx vitest run src/components/__tests__/habitat-celebration.test.ts` | ❌ Wave 0 |
| HAB-04 | "Motion paused" label present when reduced | unit (source-grep) | same | ❌ Wave 0 |
| HAB-04 | Mobile freeze: timeout set for isMobile, not for desktop | unit (logic) | `npx vitest run src/components/__tests__/habitat-video.test.ts` | ✅ extend |
| HAB-05 | /habitat page shows mood chip text | e2e | `npx playwright test e2e/07-habitat-display.spec.ts` | ✅ retarget |
| HAB-05 | /habitat page shows video with correct clip src | e2e | `npx playwright test e2e/13-habitat-3d.spec.ts` | ✅ |
| HAB-05 | offline banner appears when offline | e2e | manual (network throttle) | manual-only |
| HAB-05 | level-up celebration fires when ?celebrate=N | e2e | `npx playwright test e2e/24-habitat-celebration.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run` (full unit suite, ~seconds)
- **Per wave merge:** `npx vitest run && npx playwright test e2e/07-habitat-display.spec.ts e2e/13-habitat-3d.spec.ts e2e/13-habitat-states.spec.ts`
- **Phase gate:** Full unit + full e2e before `/gsd:verify-work`

### Wave 0 Gaps (test files to create before implementation)

- [ ] `src/lib/__tests__/habitat-names.test.ts` — unit tests for H_NAME, H_NEXT constants (covers HAB-01, HAB-03)
- [ ] `src/components/__tests__/habitat-tint.test.ts` — unit tests for mood tint helper (covers HAB-02)
- [ ] `src/components/__tests__/habitat-prog-card.test.ts` — unit tests for pct formula and card content derivation (covers HAB-03)
- [ ] `src/components/__tests__/habitat-celebration.test.ts` — source-grep tests for confetti gate + "Motion paused" + auto-settle timer (covers HAB-04/05)
- [ ] `e2e/24-habitat-celebration.spec.ts` — e2e: navigate to `/habitat?celebrate=5`, assert celebration overlay appears, assert it disappears after ~3s (covers HAB-05 level-up state)

Existing test files to extend:
- `src/components/__tests__/habitat-video.test.ts` — add tests for mobile freeze logic (isMobile branch, IntersectionObserver, freeze timer)
- `src/components/__tests__/habitat-scene-video.test.ts` — add source-grep for `celebratingLevel` being consumed (not `_celebratingLevel`)
- `e2e/07-habitat-display.spec.ts` — retarget `getByText("Level")` to `getByTestId("habitat-level-badge")`, mood text to `getByTestId("habitat-mood-chip")`

---

## Security Domain

`security_enforcement` is not explicitly set to `false` in `.planning/config.json`. Treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No new auth surface |
| V3 Session Management | No | No new session surface |
| V4 Access Control | No | habitat page is already protected by (protected)/layout.tsx |
| V5 Input Validation | Yes — `?celebrate=N` param | `Number()` parse then validate integer > 0 && <= 9 |
| V6 Cryptography | No | — |

### Input Validation for ?celebrate=N

The `celebratingLevel` value comes from `Number(params.celebrate)` in `page.tsx` (line 22). This is passed to `HabitatScene`. If an attacker crafts `/habitat?celebrate=999`, the celebration would show with level 999 — rendering H_NEXT[999] as undefined and potentially showing broken UI.

**Recommended fix in page.tsx** (applies at the server level, before props are passed):
```typescript
// VALIDATED: celebrate must be an integer in [1, 9]
const rawCelebrate = params.celebrate ? Number(params.celebrate) : null;
const celebratingLevel = (
  rawCelebrate !== null &&
  Number.isInteger(rawCelebrate) &&
  rawCelebrate >= 1 &&
  rawCelebrate <= 9
) ? rawCelebrate : null;
```

This was flagged as WR-01 in Phase 23 code review context (validate untrusted `?topic=`). Same pattern applies here.

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Untrusted ?celebrate=N rendering invalid level | Tampering | Validate integer in [1,9] in page.tsx before passing down |
| XSS via H_NAME/H_NEXT | — | Not applicable — constants are static strings, not user input |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Study now" in the decay card routes to `/dashboard` (no active deck ID available in HabitatState) | Architecture Patterns (Pattern 4b) | If the active deck is available elsewhere, could route directly to /study?deck=X; low impact — /dashboard is always valid |
| A2 | Freeze threshold of 10s covers ~2 loops (clips are ~4–6s each at typical content) | Mobile Freeze (D-04) | If clips are shorter, freeze may come too early; timing is a tuning knob per D-04, adjust in implementation |
| A3 | handleLevelUpDismiss rerouting to /habitat for levels 1–8 is safe (study-session.tsx change) | Level-up trigger repair | If other callers of the level-up dismiss path exist, they need checking; grep confirms only one call site (line 344) |

---

## Open Questions (RESOLVED)

> All three are design-discretion items resolved in the plans: confetti settle = 200ms fade after a 2.3s timer (2.5s total); "Study now" routes to /dashboard (no deckId in HabitatState); the what-appeared reveal uses a generic medallion icon, not per-level CSS shapes.

1. **Confetti fall duration vs. celebration auto-settle (2.5s)**
   - What we know: D-07 says the celebration auto-settles after ~2.5s. The handoff's confetti CSS in HabCelebrate uses `animationDelay` up to `(8) * 0.22s ≈ 1.76s` and the fall should complete before settle. A 2s fall + 0.5s fade-out gives exactly 2.5s.
   - What's unclear: whether the "settle" means the overlay disappears instantly or cross-fades. The handoff shows no explicit fade.
   - Recommendation: 200ms opacity fade-out on the overlay after 2.3s timer (total 2.5s visible), using `transition: opacity 200ms` toggled by a `settling` boolean state.

2. **"Study now" deck targeting**
   - What we know: `HabitatState` does not carry `deckId`. The study route requires `?deck=deckId`.
   - Recommendation: Route to `/dashboard`. If the planner or owner prefers routing directly to study, `deckId` would need to be threaded from `getHabitatFacts` → `HabitatFacts` (currently just `userId`, `lastActivityAt`, `learnedCardCount`) — a small data-layer change that may be acceptable or may be out of scope per D-02.

3. **HabCelebrate's what-appeared reveal shows a CSS elephant shape**
   - What we know: The handoff (daybreak-habitat.jsx lines 178-180) shows an inline CSS elephant shape next to the reveal text "An elephant moved in!" — pure CSS divs for the icon.
   - What's unclear: Whether to implement the level-specific inline CSS shape (different for each level), or just show the text with a generic icon.
   - Recommendation: Show a simple generic icon (the `#FFF1DC` medallion disc) next to the text — avoid per-level CSS shapes as they add complexity with no clear unlock icon design for each level (handoff only shows the elephant case). This is within Claude's Discretion.

---

## Sources

### Primary (HIGH confidence)
- `src/components/habitat-scene.tsx` — primary edit surface; all overlay structure
- `src/components/habitat-video.tsx` — video component; decayFilter, SSR-safe reduced-motion pattern, pure helper exports
- `src/app/(protected)/habitat/page.tsx` — server shell; ?celebrate= threading
- `src/components/level-up-overlay.tsx` — existing overlay (NOT reused on /habitat; reference only)
- `src/hooks/use-prefers-reduced-motion.ts` — SSR-safe hook; defaults false on server
- `src/lib/habitat-engine.ts` — HabitatState shape, isDecaying, nextLevelThreshold
- `design/handoff-daybreak/daybreak-habitat.jsx` — HBack, HMoodChip, HLevelBadge, HTop, HProgCard, HDecayCard, H_NAME, H_NEXT, MOOD, all state boards
- `design/handoff-daybreak/daybreak-habitat-scene.jsx` — SKY, PAL, golden-hour overlay, decay filter in design context
- `src/components/study-session.tsx` — level-up routing (lines 214–220, 282–284, 344–349, 386)
- `src/app/api/study/complete/route.ts` — leveledUp response (line 281)
- `node_modules/next/package.json` — Next.js 16.2.1 confirmed
- `vitest.config.ts` — test environment: node, no jsdom
- `.planning/config.json` — nyquist_validation: true

### Secondary (MEDIUM confidence)
- `e2e/07-habitat-display.spec.ts`, `e2e/13-habitat-3d.spec.ts`, `e2e/13-habitat-states.spec.ts` — existing e2e selectors to retarget
- `node_modules/next/dist/docs/01-app/02-guides/videos.md` — Next.js video guidance (autoPlay + muted + playsInline)
- `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md` — `video.pause()` in cleanup pattern

### Tertiary (LOW confidence)
- None for this phase — all key findings verified from source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in node_modules; no new packages
- Architecture: HIGH — verified against real code (habitat-scene.tsx, habitat-video.tsx, page.tsx, study-session.tsx)
- Pitfalls: HIGH — derived from actual code defects (line references provided)
- e2e selector audit: HIGH — spec files read directly

**Research date:** 2026-06-24
**Valid until:** 2026-07-24 (stable stack; no fast-moving dependencies)
