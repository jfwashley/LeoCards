# Phase 24: Habitat - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 24-Habitat
**Areas discussed:** Scope/Layout, Motion tiers, Colour overlay / old engine, Level-up celebration, Decaying/sad state

---

## Gray-area selection (multi-select)

The owner selected all four offered areas — Motion tiers, Level-up celebration, Decaying/sad state, Old 3D/video cleanup — and added the pivotal steer: **"Old 3D/videos are not getting replaced. The videos should remain and only the designs for the colour overlay and progress bar should be implemented."** This re-framed the phase from a flat-geometric scene rebuild into a keep-the-video overlay re-skin.

---

## Scope / Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Colour overlay + progress card only | Keep contained video + existing chrome/states as-is; add only the colour tint + progress card | |
| Re-skin all overlays, keep contained card | Keep contained 16/9 video; bring all floating chrome + states to Daybreak | ✓ |
| Full-screen immersive like the mock | Re-layout the video full-bleed with overlays floating on top | |

**User's choice:** Re-skin all overlays, keep contained card.
**Notes:** Confirms the video stays a contained 16/9 card (not full-screen). Old clip art stays inside the frame; Daybreak applies to chrome + colour wash.

---

## Motion tiers (mobile)

| Option | Description | Selected |
|--------|-------------|----------|
| Still poster on mobile | Mobile shows the static hero poster; motion is a desktop-only treat | |
| Keep autoplaying clip on mobile | Richest everywhere; mobile not lighter than desktop | |
| Autoplay, then freeze to still | Clip plays a short window / until offscreen, then freezes to poster | ✓ |

**User's choice:** Autoplay, then freeze to still.
**Notes:** Yields a 3-tier model — desktop full autoplay · mobile autoplay-then-freeze · reduced-motion static poster + "Motion paused" label. Freeze timing is a tuning knob (recommended ~2 loops / ~10–12s, pause offscreen).

---

## Colour overlay / old engine

| Option | Description | Selected |
|--------|-------------|----------|
| CSS tint over existing clips | Mood tint + golden-hour wash layered via CSS over the untouched clips | ✓ |
| Re-render clips in Daybreak palette | Bake 36 new clips in Daybreak colours via the dev 3D pipeline | |

**User's choice:** CSS tint over existing clips.
**Notes:** Clips untouched; the dev-only 3D capture pipeline is kept (not deleted, not re-rendered). The scene art stays the old look; only the chrome + colour wash become Daybreak.

---

## Level-up celebration

**Q1 — how it ends:**

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-settle ~2.5s, tap to skip | Plays ~2.5s then fades; tap dismisses early | |
| Stay until tapped | Holds full-screen until "Tap to continue" | |
| Auto-settle only, no tap | Plays ~2.5s and fades, no interaction | ✓ |

**Q2 — what it shows:**

| Option | Description | Selected |
|--------|-------------|----------|
| Confetti + 'Level N' + what appeared | Confetti, big level number, and the new-unlock reveal | ✓ |
| Confetti + 'Level N' only | Confetti + level number, no element reveal | |
| Minimal flourish | Re-style today's "Level N!" text, no confetti | |

**User's choice:** Auto-settle only (no tap) · Confetti + 'Level N' + what appeared.
**Notes:** Overrides the mock's "Tap to continue." Static fallback under reduced-motion. The current trigger is effectively dead (the `?celebrate=` param is ignored by the component) and must be repaired.

---

## Decaying / sad state

**Q1 — the "Leo misses you" card:**

| Option | Description | Selected |
|--------|-------------|----------|
| When actively decaying | Swap on engine `isDecaying` (past 2-day grace, quality dropping) | ✓ |
| Only when mood is 'Sad' | Swap only at quality < 40% | |
| Never — keep progress card | Express decay only via the desaturated scene | |

**Q2 — decay look strength:**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the existing tuned filter | Reuse `saturate(q)·brightness(0.6+0.4q)` | ✓ |
| Push it stronger | More washed-out / wilted | |
| Softer | More subtle desaturation | |

**User's choice:** Swap when actively decaying · keep the existing tuned filter.
**Notes:** "Study now" routes into the study flow. Filter composited beneath the new Daybreak mood tint.

---

## Claude's Discretion

- Exact per-mood tint hex values + opacity, precise freeze-to-still timing, and the reduced-motion static-confetti treatment — implemented to the mock's `MOOD`/`SKY`/`PAL` palettes and feel.

## Deferred Ideas

- Re-rendering the video clips in the Daybreak palette (declined — D-05).
- Full-screen immersive habitat layout (declined in favour of the contained card — D-01).
- Legacy "level 10" milestone inconsistency (resolved as "9 is the cap" — D-12; flagged upstream, not actioned here).
