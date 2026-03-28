# Phase 5: Habitat UI - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Render the tiger sprite and habitat scene in the browser using PixiJS. Full /habitat page with immersive scene + mini dashboard widget. Mood-reactive tiger, level-gated savanna backgrounds with additive layers, acceptable performance on mid-range devices. No milestone logic (Phase 6), no engine changes (Phase 4 complete).

</domain>

<decisions>
## Implementation Decisions

### Tiger visual style
- **D-01:** Cute cartoon art style (round, expressive, Duolingo-owl-style).
- **D-02:** Static pose per mood — no idle animations (breathing/blinking). Keeps it simple and performant.
- **D-03:** Tiger is small mascot size (15-20% of scene). Habitat is the star, tiger lives in it.
- **D-04:** Tiger randomly appears at one of 3 positions on each page load: center-bottom, 30% from left, 25% from right. Instant teleport (no walking animation).
- **D-05:** Random left/right facing direction per page load.
- **D-06:** Mood transition direction matters:
  - Happier mood shift (e.g. sad -> neutral, neutral -> happy): sprite swap with bounce animation
  - Sadder mood shift (e.g. happy -> neutral, neutral -> sad): crossfade blend (~0.5s)
- **D-07:** Excited mood (post-study) gets a special happy bounce loop with sparkle particles — the dopamine moment.

### Habitat scene composition
- **D-08:** Savanna / grassland environment — open plains, warm golden tones, trees, rocks, grass.
- **D-09:** Additive layers across 10 levels — start sparse, progressively add trees, rocks, water, flowers, animals. Each level adds something new.
- **D-10:** Static daytime sky — always sunny/bright, no mood-reactive sky changes.
- **D-11:** Subtle parallax depth with 2-3 layers (foreground grass, mid-ground scene, distant hills/sky).
- **D-12:** Level 1 (starter habitat) = bare grass + single tree. Minimal but welcoming.
- **D-13:** Decay visual = elements fade out. Higher-level elements gradually disappear as quality drops — reverse of the additive progression.

### Scene layout & placement
- **D-14:** Two views: full /habitat page + mini dashboard widget.
- **D-15:** Full /habitat page: 60-70% viewport height, full-width edge-to-edge, minimal overlay (level badge in corner + mood indicator).
- **D-16:** Mini dashboard widget: tiny PixiJS canvas showing tiger sprite + CSS progress bar toward next level. Clickable — navigates to /habitat.
- **D-17:** Fixed aspect ratio for the scene, scale to fit container — optimized for mobile. Consistent composition across screen sizes.

### Loading & transitions
- **D-18:** Spinner / loading indicator while PixiJS and sprite assets load.
- **D-19:** Scene fades in from loading state over ~0.5s when ready.
- **D-20:** Level-up: new elements fade in with scale pop animation — celebratory, noticeable.
- **D-21:** Fetch habitat state once on page load only — no auto-refresh/polling.
- **D-22:** PixiJS ticker pauses when browser tab is hidden (visibilitychange API) — saves CPU.
- **D-23:** Error state: generic "Something went wrong" message + retry button.
- **D-24:** Offline: show last cached API response + small "you're offline" indicator.
- **D-25:** Mini dashboard widget uses tiny PixiJS canvas (not HTML/CSS fallback) for consistency with full scene.

### Claude's Discretion
- Exact sprite atlas structure and naming conventions
- PixiJS container/stage hierarchy
- Cache implementation approach for offline state (localStorage, SWR cache, etc.)
- Specific savanna element choices per level (which trees/rocks/flowers at which level)
- Progress bar design on the mini widget
- Level badge and mood indicator styling on overlay
- Parallax scroll speed / depth values

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — HAB-02 (habitat rendering), HAB-03 (visual progression)

### Phase 4 context (habitat engine)
- `.planning/phases/04-habitat-engine/04-CONTEXT.md` — Decay mechanics, level thresholds, mood rules, API response shape
- `src/lib/habitat-engine.ts` — `HabitatState` type (level, quality, mood, learnedCardCount, effectiveCardCount, isDecaying, minutesSinceActivity, nextLevelThreshold)
- `src/app/api/habitat/route.ts` — `GET /api/habitat` endpoint (compute-on-read)
- `src/lib/habitat-queries.ts` — DB query for habitat facts

### Existing patterns
- `src/components/study-session.tsx` — Client component pattern
- `src/components/ui/` — Existing UI component library (button, card, dialog, etc.)
- `src/app/(auth)/layout.tsx` — Auth layout pattern

### Project instructions
- `CLAUDE.md` and `AGENTS.md` — Next.js version has breaking changes; read `node_modules/next/dist/docs/` before writing code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` — Button, Card, Dialog, Form, Input, Label, Select components
- `src/lib/habitat-engine.ts` — `HabitatState` interface and `TigerMood` type to consume
- `src/app/api/habitat/route.ts` — Ready-to-use API endpoint returning typed JSON

### Established Patterns
- Client components with `"use client"` directive (study-session.tsx)
- Auth check via `auth.api.getSession` in server components
- Tailwind CSS for styling
- `next/dynamic` with `{ ssr: false }` needed for PixiJS (canvas can't SSR)

### Integration Points
- `GET /api/habitat` — Fetch habitat state on component mount
- Dashboard page — Add mini widget alongside existing deck-switcher
- Navigation — Add /habitat route to app router
- `HabitatState` type — Import from `src/lib/habitat-engine.ts` for type safety

</code_context>

<specifics>
## Specific Ideas

- Tiger roaming between 3 positions adds life without needing idle animations — clever tradeoff
- Directional mood transitions (bouncy for happy shifts, gentle fade for sad shifts) create emotional resonance
- The excited mood bounce loop with sparkle particles is the reward moment — make it feel special
- Savanna with additive layers creates a clear visual progression story: bare grass -> lush ecosystem
- Decay reversing the additive process (elements fading out) creates a tangible "loss" feeling without being harsh
- Level 1 = bare grass + single tree: clearly a starting point, clearly room to grow
- Mini widget with clickable PixiJS canvas creates a discovery path to the full habitat

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-habitat-ui*
*Context gathered: 2026-03-28*
