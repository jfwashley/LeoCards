# Phase 24: Habitat - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-skin the full-screen Habitat page (`/habitat`) to the **Daybreak** visual language **while keeping the existing pre-rendered video habitat**. This is a **presentation-only** phase: the video clips, the habitat domain engine, the API, and all state machinery are reused untouched — Phase 24 only layers Daybreak-styled **overlays** on top (chrome, a colour wash, a new bottom progress card, and re-skinned state treatments).

**In scope:** keep the contained 16/9 video card; add a Daybreak mood/decay **colour overlay**; add the **bottom progress card**; re-skin the floating chrome (back button, mood chip, level badge); re-skin the offline banner, error state, and the level-up celebration (and repair its dead trigger); add a 3-tier motion model (desktop / mobile / reduced-motion) and a "Motion paused" label; add a "Leo misses you / Study now" card for the decaying state.

**Explicitly NOT in scope:** rebuilding the scene as the flat-geometric CSS world from the mock; re-rendering the video clips; full-screen immersive re-layout; any change to habitat level/mood/decay **logic** (the engine is the source of truth and stays as-is); a sleeping/night-cycle state; deleting the dev-only 3D clip-render pipeline.

</domain>

<decisions>
## Implementation Decisions

### Scope & Layout
- **D-01:** Keep the existing **video** habitat and re-skin overlays only — do **not** rebuild the flat-geometric scene. The page stays a **contained 16/9 card** (max-height `min(70vh, 400px)`), **not** full-screen immersive. The old clip art (pre-Daybreak Three.js "clay" look) stays *inside* the frame; Daybreak applies to the chrome + colour wash around it.
- **D-02:** Presentation-only phase — reuse the data layer (`habitat-engine.ts`, `habitat-queries.ts`, `/api/habitat`, `computeHabitatState`, the `?celebrate` param) **untouched**. No new domain logic; consume `level`, `mood`, `quality`, `isDecaying`, `nextLevelThreshold` from `HabitatState`.

### Motion Tiers
- **D-03:** Three motion tiers. **Desktop:** clip autoplays fully (looping ambient motion). **Mobile:** clip autoplays then **freezes to the still poster** (lighter, per success criterion 4). **Reduced-motion:** still poster only, no autoplay, plus a new **"Motion paused"** label (net-new, from the mock).
- **D-04:** Mobile freeze behaviour (tuning knob): play a short window, then freeze to the poster; also pause when scrolled offscreen (IntersectionObserver) and resume on return. Recommended default ~2 loops or ~10–12s before freeze — planner/research to finalize the exact timing.

### Colour Overlay
- **D-05:** Produce the Daybreak "colour overlay" as a **CSS layer over the existing clips** — a mood-driven **ambient-light tint** (warmer/brighter for excited/happy, cooler/flatter for neutral/sad) plus a **golden-hour** warm glow at L9 — composited *with* the existing `decayFilter`. The clips are **not** re-rendered. (Mood's three channels become: Leo's expression = baked into the per-mood clip; ambient light = this CSS tint; label = the mood chip.)
- **D-06:** Keep the **dev-only 3D capture pipeline** (`src/lib/habitat-3d/*`, `habitat-3d-canvas.tsx`, `?capture=video`) intact — do **not** delete it. It's the build-time clip-render tool and is already tree-shaken from the production bundle.

### Level-up Celebration
- **D-07:** The celebration **auto-settles after ~2.5s** and fades into the new level on its own — **no tap** (no "Tap to continue", no tap-to-skip). This overrides the mock's tap-to-continue.
- **D-08:** Content = falling **confetti** + big **"Level N"** display + the **what-appeared reveal** (the newly unlocked element, e.g. "An elephant moved in!" — source the unlock name/copy from `H_NEXT`/`H_NAME`). Under **reduced-motion**, render a **static fallback** (no falling confetti).
- **D-09:** **Repair the trigger.** Today the `?celebrate=` param is threaded into `page.tsx` but ignored by `habitat-scene.tsx`, and the prop-change level-detection can't fire on a fresh server render — so the celebration effectively never shows. Wire `?celebrate=N` (or an equivalent reliable signal) to the overlay, and confirm/repair the study-complete → `/habitat` handoff so a level-up actually surfaces the celebration.

### Decaying / Sad State
- **D-10:** When the habitat is **actively decaying** (engine `isDecaying = true`: past the 2-day grace and quality dropping), **replace the bottom progress card** with the Daybreak **"Leo misses you"** card + a **"Study now"** primary that routes into the study flow. When not decaying, show the normal progress card. Encouraging, not punishing.
- **D-11:** Keep the **existing tuned decay filter** `saturate(q)·brightness(0.6+0.4q)` (floor `q=0.10`) **as-is**, composited *beneath* the new Daybreak mood tint. Do not strengthen or soften.

### Carried-forward / Locked (not re-asked)
- **D-12:** **L9 is the canonical cap.** Use `nextLevelThreshold === null` to mean "max level" → progress card reads **"Course 1 complete — you grew the whole world."** Ignore the mock's dead `level >= 10` branch and the legacy "level 10" copy (per Phase 21 decision 21-03).
- **D-13:** Re-skin the remaining chrome to the mock exactly: **back button** (top-left) → Dashboard; **mood chip** (`HMoodChip` — colored dot + label, 4 moods); **level badge** (`HLevelBadge` — round LVL pill, gold at L9). **Offline** = Daybreak cached banner ("You're offline — showing last known state", scene still shown); **error** = friendly "We couldn't load your habitat." + **Try again**. Progress-card content, level names, and next-unlock copy come from `H_NAME` / `H_NEXT`.
- **D-14:** **No separate sleeping/napping or night-cycle** rendering on this page — the engine surfaces only the 4 moods; "resting/napping" stays a Dashboard-only cooldown state. Match the 8 mock state boards (new-user L1, mid L5, lush L9, level-up, decaying, offline, error, reduced-motion).

### Claude's Discretion
- Exact per-mood tint hex values + opacity, the precise freeze-to-still timing (D-04), and the reduced-motion static-confetti treatment — implement to the mock's `MOOD`/`SKY`/`PAL` palettes and feel. Keep the mood tint subtle enough that overlays stay legible over a busy clip.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (Daybreak handoff — re-skin to these)
- `design/handoff-daybreak/README.md` — Daybreak design system: `d1` tokens (colors/type/spacing/radius/shadow), the `PAL`/`SKY`/`MOOD` habitat palettes, the **Habitat screen spec (§5)** and **State Management → Habitat**.
- `design/handoff-daybreak/daybreak-habitat.jsx` — **the chrome + progress-card + states contract**: `HBack`, `HMoodChip`, `HLevelBadge`, `HTop`, `HProgCard` (`H_NAME` level names, `H_NEXT` next-unlock copy), and the state boards `HabNew/HabMid/HabLush/HabReduced/HabDecay/HabOffline/HabError/HabCelebrate`.
- `design/handoff-daybreak/daybreak-habitat-scene.jsx` — the flat-geometric scene engine + `PAL`/`SKY` palettes, decay `saturate(0.5)` filter, golden-hour overlay. **REFERENCE ONLY** — we are NOT rebuilding this scene (D-01/D-05); pull the **mood-tint, golden-hour, and decay colour cues** from here.
- `design/handoff-daybreak/LeoCards Daybreak Habitat.html` — hi-fi host to preview the above.
- `design/ui-redesign-requirements-habitat.md` — blue-sky brief: growth/level mechanics, mood/decay, the required states, performance + reduced-motion constraints.

### Existing implementation (reuse / primary edit surface)
- `src/app/(protected)/habitat/page.tsx` — server shell: `getHabitatFacts → computeHabitatState → <HabitatScene celebratingLevel={?celebrate}>`. Reuse; the trigger repair (D-09) connects here.
- `src/components/habitat-scene.tsx` — **the primary edit surface**: currently renders level badge + `MoodIndicator` + `HabitatVideo` + offline/error/level-up overlays in pre-Daybreak styling. Re-skin these; add the progress card + decay card + "Motion paused" + colour tint.
- `src/components/habitat-video.tsx` — the **kept** video renderer: clip selection `l{N}-{mood}`, poster=LCP, `decayFilter(quality)`, SSR-safe reduced-motion poster swap. Reuse; extend for D-03 (mobile freeze) and D-05 (tint composited with the filter).
- `src/lib/habitat-engine.ts` — domain logic (`level`/`mood`/`quality`/`isDecaying`/`nextLevelThreshold`). Reuse **untouched**; consume `isDecaying` (D-10) and `nextLevelThreshold === null` (D-12).
- `src/components/level-up-overlay.tsx` — existing confetti overlay (reduced-motion aware) — candidate to reuse/upgrade for D-07/D-08.
- `src/hooks/use-prefers-reduced-motion.ts` — reduced-motion hook (**defaults `false` on SSR** — WR-01 landmine, see code_context).
- `src/components/habitat-hero.tsx`, `src/components/habitat-medallion.tsx` — Phase 21 Daybreak dashboard hero/medallion — consistency reference (this page is reached from the dashboard's "View habitat ›").
- `src/lib/habitat-ui-utils.ts` — **OLD 3D-era util**: its `getLayersForLevel` references a level-10 world + a *different* composition — do **not** use its layer logic. Level names / next-unlock come from the mock's `H_NAME`/`H_NEXT`. May hold reusable mood-transition helpers (`getMoodTransitionType`).
- `src/lib/habitat-3d/*`, `src/components/habitat-3d-canvas.tsx` — dev-only clip-render pipeline; **KEEP**, don't delete (D-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`HabitatVideo` + 36 baked clips** (`public/habitat/clips/l{1-9}-{mood}.{webm,mp4}`) + posters (`hero-l{1-9}.webp`): the whole scene. Mood is already baked per clip; the only new "scene" work is the CSS tint (D-05) and mobile freeze (D-03).
- **`decayFilter(quality)`**: existing tuned desaturate/dim — reuse as-is (D-11).
- **`computeHabitatState` / `HabitatState`**: full state already computed server-side — `level`, `mood` (excited/happy/neutral/sad), `quality`, `isDecaying`, `nextLevelThreshold`. No engine work.
- **`level-up-overlay.tsx`** + **`use-prefers-reduced-motion.ts`**: existing confetti + reduced-motion primitives to build D-07/D-08 on.
- **Offline cache + retry** already implemented in `habitat-scene.tsx` (localStorage `leocards:habitat-state`, hand-written type guard, `/api/habitat` refetch) — re-skin, don't rebuild.

### Established Patterns
- **Perf is load-bearing on `/habitat`.** Prior phases (13.1 VIDEO, 999.1) removed framer-motion, zod, and three.js from this route and made the poster the LCP candidate (CLS=0). New overlays must stay **CSS-only / light** — no `motion/react`, no heavy libs; preserve CLS=0 and the poster-as-LCP handoff.
- **Daybreak tokens/atoms**: tokens in `globals.css`, shared atoms in `src/components/daybreak/`; biome enforces `noNonNullAssertion` (use `?.`, never `!`).

### Integration Points
- `page.tsx` `?celebrate=N` → `HabitatScene` is the seam to repair for the level-up trigger (D-09); also verify the study-complete redirect that should set it.
- "Study now" (D-10) routes into the existing study flow; back button (D-13) → Dashboard.

### Landmines (for research/planning)
- **WR-01 SSR reduced-motion flash:** `usePrefersReducedMotion` defaults `false` on SSR/first paint. `habitat-video.tsx` is already SSR-safe (emits video first, swaps to poster after mount). The **new confetti + colour-tint** must be equally SSR-safe — must not flash motion before reduced-motion resolves.
- **e2e selector audit:** re-skinning chrome changes visible text/structure (level badge, mood label, new progress card, "Leo misses you", "Motion paused", offline/error copy). Audit `e2e/*` for literal-text/structural locators on the habitat page and retarget to role+accessible-name or `data-testid` (preserve behavioural intent; don't re-add stale copy). Add changed specs to the owning plan's `files_modified`.

</code_context>

<specifics>
## Specific Ideas

- The phase owner's framing steer (verbatim intent): *"Old 3D/videos are not getting replaced. The videos should remain and only the designs for the colour overlay and progress bar should be implemented."* — interpreted and expanded into D-01/D-05/D-06 + the overlay re-skin.
- Progress card copy is fixed by the mock: **"Level N · {H_NAME}"**, **"{pct}% to L{N+1}"**, a progress bar, **"Next at L{at}: {what}"** (from `H_NEXT`), and **"Course 1 complete — you grew the whole world."** at L9.
- Decay card copy from the mock: **"Leo misses you"** / "A quick session brings the world back to life." / **"Study now"**.

</specifics>

<deferred>
## Deferred Ideas

- **Re-rendering the video clips in the Daybreak flat-geometric palette** (so the scene art itself matches Daybreak) — explicitly declined for this phase (D-05); would be a separate effort using the kept 3D capture pipeline.
- **Full-screen immersive habitat layout** (per the mock) — declined in favour of the contained card (D-01); a future option if the habitat becomes a bigger focus.
- The legacy **"level 10" milestone** inconsistency (engine caps at 9) — already resolved as "treat 9 as the cap" (D-12); flagged upstream in the requirements doc for the team, not actioned here.

None of the above are blockers — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-Habitat*
*Context gathered: 2026-06-24*
