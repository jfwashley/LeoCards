# Phase 20: Study Screen - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-skin the existing **study flow** to the Daybreak design system: the study **card** (STU-01) and the **session-result/end screen + level-up celebration** (STU-02). Presentation-layer only — the study engine, SRS logic, routes, the idempotent grade-commit, the requeue ("still learning" cards return in-session), and the QA state badge (Phase 14) are all **preserved unchanged**. Builds on the Daybreak foundation + primitives shipped in Phase 19.

Requirements: **STU-01, STU-02**.

</domain>

<decisions>
## Implementation Decisions

### Study Card (STU-01)
- **D-01:** **Ghost-peek stack — count-aware Daybreak GhostPeek.** The stack behind the flashcard adopts the Daybreak `GhostPeek` look (the same peeking-edge atom used behind the login/auth cards in `src/components/daybreak/auth-card.tsx`) while keeping today's count-aware behavior: up to 3 peeking edges that thin out as the session nears its end. This stack is the **only** remaining-cards cue on the screen (no separate progress indicator — see D-03). Implementation may reuse the `GhostPeek` atom directly or a study-specific adaptation, as long as it matches the look and stays count-aware.
- **D-02:** **Card surface + swipe feedback restyled to Daybreak.** The flashcard uses the Daybreak card surface (white `#FFFFFF`, radius 22, 1px border `#F0E3CF`, shadow `0 12px 30px rgba(160,110,40,0.16)`). Progressive swipe color feedback during the drag uses the Daybreak palette: green `#3E9B5F` (knew it / swipe-right) and red `#DE5F4A` (still learning / swipe-left), replacing the current generic overlays. The **fixed interaction model is preserved**: tap/Enter/Space to flip, 3D Y-axis flip (~300ms), 300ms swipe-enable guard after flip, swipe-right = knew it / swipe-left = still learning, keyboard arrows as the non-touch path. Only styling changes.

### Session Progress
- **D-03:** **No explicit progress indicator.** The brief's one sanctioned new addition (a "4 of 12"-style indicator) is intentionally **declined**. The count-aware ghost-peek stack (D-01) is the sole "cards remaining" cue. Rationale: keeps the screen calm and avoids a misleading denominator — "still learning" cards re-enter the queue mid-session, so any fixed total would grow.

### Session-Result / End Screen (STU-02)
- **D-04:** **End screen = LionFace mark + restyled stats (contained scope).** Replace the 🐯 tiger emoji with the Daybreak `LionFace` (`src/components/daybreak/lion-face.tsx`); restyle the three stats (cards studied · % correct · learned) and the "Back to deck" CTA to Daybreak (Baloo 2 display numerals, amber primary button). The **"learned" stat stays the amber hero number** (it is what feeds the habitat). **No** mini-habitat teaser scene on the end screen (considered and declined to keep scope contained — see Deferred).

### Level-up Celebration
- **D-05:** **Level-up = Soft-Clay Leo + Daybreak confetti.** The level-up overlay (`src/components/level-up-overlay.tsx`) brings in the habitat **Soft-Clay art style — a Soft-Clay-styled Leo only** (NOT the full habitat scene, NOT an animated video clip), paired with Daybreak-recolored confetti + amber display type, keeping the "Your habitat grew!" beat and tap-to-dismiss. Sourcing the Soft-Clay Leo asset is for research/planning to resolve (see `habitat-art-assets.md` ref) — e.g. an existing still/poster or a derived frame. Do **not** pull the ~1.3 MB ambient clips or any live render into the study flow.

### Motion & Reduced-Motion
- **D-06:** **Reduced motion — confetti only (this phase).** Gate the level-up confetti behind `prefers-reduced-motion`: when reduced, the static Soft-Clay Leo + summary still show, with no falling particles. The 3D card flip and the swipe tilt/elastic **keep their current behavior this phase**; reduced-motion variants for the flip (crossfade) and swipe (calm/instant) are **deferred** to a later accessibility pass (see Deferred).

### Claude's Discretion
- Top bar / session chrome restyle (the "Study session" label, "Quit session" button, quit-confirm popover) to Daybreak — exact treatment open; no progress/deck-name addition required (per D-03).
- The "Saving your progress…" transition and the save-error + "Retry saving session" state — Daybreak restyle; a light Leo touch is welcome but optional.
- Exact token values, spacing, component prop shapes, and file layout — pull from the Daybreak system and existing `src/components/daybreak/*` primitives.
- Exact confetti recolor palette and the Soft-Clay Leo's placement/size within the overlay.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Study-screen design contract (behavior / states / copy)
- `.planning/design/UI-REDESIGN-BRIEF-login-study.md` §"Screen 2 — Card Learning (Study Session)" — the flow, session chrome, card, saving, summary, and level-up states + copy inventory + the cross-screen "Hard requirements". **Treat its flows/states/copy as the contract; its visual tokens (tiger-orange `#F97316`) are superseded by Daybreak — see below.**
- `.planning/ROADMAP.md` §"Phase 20: Study Screen" — goal + the two success criteria.
- `.planning/REQUIREMENTS.md` — STU-01, STU-02 (the requirements this phase satisfies).

### Daybreak design system (visual source of truth — recreate faithfully)
- `design/handoff-daybreak/README.md` §"Design System — Daybreak tokens" + §"Shared components" — tokens, type, spacing, radii, shadows; the `GhostPeek` / `LionFace` / `Card` atoms.
- `design/handoff-daybreak/hifi-daybreak.jsx` — the `d1` theme object (exact token values).
- `design/handoff-daybreak/hifi-shared.jsx` — `GhostPeek`, `LionFace`, `TBtn`, `TField`, card surface reference (the atoms ported into primitives in Phase 19).
- `.planning/phases/19-daybreak-foundation-onboarding-auth/19-CONTEXT.md` — Phase 19 component strategy (its D-01/D-02): the Daybreak primitives this phase reuses.

### Level-up habitat art
- `.planning/design/habitat-art-assets.md` — habitat Soft-Clay art assets; source/derivation reference for the Soft-Clay Leo in the level-up (D-05). Confirm availability before planning the asset.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/daybreak/auth-card.tsx` — defines `GhostPeek` (peeking-edge stack) + the Daybreak card surface used behind login; the model for D-01/D-02.
- `src/components/daybreak/card.tsx` — the Daybreak `Card` surface (white / radius 22 / amber border + shadow).
- `src/components/daybreak/lion-face.tsx` — `LionFace` mark; replaces the 🐯 emoji on the end screen (D-04).
- `src/components/daybreak/{t-btn,t-field,pill}.tsx` — Daybreak primitives (amber primary button for "Back to deck", etc.).
- `.planning/design/habitat-art-assets.md` + the `/habitat` static posters — source for the Soft-Clay Leo (D-05).

### Screens / components to redesign (presentation only — preserve behavior)
- `src/components/study-card.tsx` — flip / swipe / color-feedback card; mounts `QaStateBadge` only when QA-authed. Restyle per D-01/D-02; keep QA badge intact + leave corner breathing room.
- `src/components/card-stack.tsx` — the current count-aware stack (up to 3 layers); reskin or replace with the Daybreak ghost-peek (D-01).
- `src/components/study-session.tsx` — session orchestrator (reducer; `studying` / `committing` / `end` / `error` phases; top bar; quit-confirm). Restyle chrome; end screen per D-04. **Preserve** the reducer, requeue, and `commitId` idempotency untouched.
- `src/components/level-up-overlay.tsx` — confetti celebration; per D-05 (Soft-Clay Leo) + D-06 (confetti gated under reduced-motion).
- `src/app/(protected)/study/page.tsx` — server entry (auth, deck-ownership check SEC-02, `assembleSession`, `readQaAuth`); no behavior change.

### Established Patterns
- Daybreak tokens consumed via Tailwind semantic classes + `--db-*` CSS vars; display text uses `font-display` (Baloo 2). The `daybreak/*` atoms use inline styles for exact token values.
- Animation via `motion/react` (already used in study-card / study-session / level-up).
- QA state badge (Phase 14: `QaStateBadge`, `readQaAuth()`) must remain intact and render only when QA-authed (brief hard requirement #8).

### Integration Points
- Presentation-only: `src/lib/study-engine.ts`, `src/lib/study-queries.ts`, and `POST /api/study/complete` (idempotent grade commit) are preserved unchanged — the redesign restyles the surface, not the loop.

</code_context>

<specifics>
## Specific Ideas

- Brand is **Leo the lion**, not the old tiger — the end-screen 🐯 is replaced by `LionFace` (D-04). (Carried from Phase 19.)
- The login-study brief predates Daybreak (it shows tiger-orange `#F97316`, "Your tiger is waiting."): use its **flows / states / copy** as the contract, but its **visual tokens are superseded** by Daybreak (cream `#FFF6E9` / amber `#F28A1F`, Baloo 2 + Figtree).
- "learned" stat = the amber hero number on the end screen (it feeds the habitat).
- Swipe feedback palette: green `#3E9B5F` / red `#DE5F4A` (Daybreak).

</specifics>

<deferred>
## Deferred Ideas

- **Reduced-motion variants for the card flip (crossfade) and swipe (calm/instant)** — deferred to a later accessibility pass; this phase gates confetti only (D-06).
- **Mini-habitat teaser scene on the end screen** — considered, declined to keep STU-02 contained; could revisit alongside Phase 24 (Habitat).
- **Explicit session progress indicator ("4 of 12" / progress bar)** — the brief's sanctioned addition; considered and declined (D-03).
- **Animated habitat clip / full habitat scene in the level-up** — declined for scope/perf (Phase 24 territory); D-05 uses a Soft-Clay Leo only.
- **⚠ Flag for the team (not Phase 20 work):** `src/components/study-session.tsx` `handleLevelUpDismiss` checks `leveledUp === 10`, but the habitat caps at **L9** (cap changed 10→9 in v1.0). The max-level celebration branch appears dead. Out of scope here (presentation-only; logic preserved) — fix in a non-Daybreak logic ticket. Mirrors the L9-vs-L10 inconsistency flagged in the habitat design doc.

</deferred>

---

*Phase: 20-study-screen*
*Context gathered: 2026-06-20*
