# Phase 26: Performance batch - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the five still-open recommendations from the re-validated Fable-5 performance review (PERF-07..PERF-11): batch the study-session commit's per-card writes into one round trip, commit reviewed image-cards as one server action + one multi-row insert, batch DeepL translations (fixes the live >30-word 429 "Translation unavailable" failure), resize photos client-side before upload, and add immutable Cache-Control headers for habitat clips.

**Strictly a make-it-faster phase:** zero feature additions, zero visual changes — every screen behaves identically, just faster. The Phase 15 core-journey harness and the unit + e2e suites must stay green (ROADMAP success criterion 6).

**NOT this phase:** Phase 18's field validation / re-cert gate (runs after this phase); LazyMotion diet (backlog, D-05 carve-out); any habitat re-measuring (PERF-11 is a config-only bytes win — knowing exception recorded in REQUIREMENTS.md Out of Scope).

**Wave-order constraint (locked at roadmap level):** PERF-09 translation batching is a live user-facing bug fix — front-load as Wave 1 so it can deploy ahead of the rest (every push to main auto-deploys prod; pushes are release decisions, Josh approves the early push).

</domain>

<decisions>
## Implementation Decisions

### Study-save retry safety (PERF-07)
- **D-01:** **Keep the WR-04 per-session commitId idempotency machinery this phase**, even though the atomic `db.batch()` write arguably supersedes it. Harmless redundancy, smallest possible diff to the app's most critical save path. Retiring it is a candidate future cleanup once the batch approach has proven itself in prod — note it in the phase summary, do not do it here.
- **D-02:** **Proof = round-trip count, not a timing gate.** A test asserts the study-session commit performs its card updates in a single DB round trip (vs ~27 sequential today). No new e2e timing harness for the "Saving your progress…" moment (timing tests on save paths flake); an informal before/after stopwatch observation goes in the phase summary.

### Translation batching (PERF-09)
- **D-03:** **One batch = one request against the 30/min per-user rate limit.** A 50-word extraction spends 1 of 30. The limit's abuse-guard purpose is preserved (30 extractions/min is far beyond human use); DeepL's own quota is character-based and unaffected.
- **D-04:** **Failure behavior: one automatic retry of the failed batch, then fall back to the existing "Translation unavailable" per-word placeholder state** (users can already fill translations manually). No new UI states.
- **D-05:** Extraction is already capped at 50 words, within DeepL's 50-texts-per-request limit — a single batch always suffices; no chunking logic needed (planner verifies the cap constant).

### Photo resize (PERF-10)
- **D-06:** **Client-side downscale to 1568 px long edge, JPEG quality 0.8** (canvas re-encode) before upload — matches Anthropic's own downsampling target; typical result 150-400 KB. Fallback rule for the planner: bump to 0.9 ONLY if extraction accuracy measurably drops in testing.
- **D-07:** **Loosen the client acceptance cap to ~20 MB originals** (modern phone photos often exceed the current 5 MB rejection; they shrink before upload anyway). **Lower the server cap from 7 MB to 4 MB** — under Vercel's ~4.5 MB body limit — so the silent 3.3-5 MB death band structurally cannot exist even if client resize is bypassed.

### Clip caching (PERF-11)
- **D-08:** **Immutable long-lived Cache-Control on the EXISTING clip filenames** via a `next.config.ts` `headers()` block for `/habitat/clips/:path*`. No filename versioning churn now. **Companion naming rule (must land in this phase):** document in the render-pipeline docs that any future clip re-render MUST ship under a NEW filename — the forever-cache makes same-name replacement invisible to returning users.

### Review-commit batching (PERF-08)
- **D-09:** No gray areas — implement as re-validated: `review-list.tsx` passes the whole rows array in ONE `saveImageCards` call (the function already accepts up to 100); `deck-actions.ts` converts its internal per-row insert loop to a single multi-row `.values([...])` insert. Auth/ownership checked once per commit, not once per card.

### Claude's Discretion
- Exact `db.batch()` composition for the study commit (planner/researcher verify neon-http batch atomicity on drizzle 0.45 and compose accordingly).
- `/api/translate` batch shape (array mode on the existing route vs new field) — whatever keeps the single-word path backward-compatible with the fewest moving parts.
- Canvas resize implementation details (offscreen canvas, EXIF orientation handling, HEIC behavior) — standard approaches, planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase charter & requirements
- `.planning/ROADMAP.md` — Phase 26 detail block (goal, 6 success criteria, wave-order constraint)
- `.planning/REQUIREMENTS.md` — PERF-07..PERF-11 definitions + the annotated habitat out-of-scope exception

### Prior-phase decisions that constrain this phase
- `.planning/phases/17-performance-optimization/17-CONTEXT.md` — D-05 (motion carve-out — why LazyMotion is NOT in scope), D-09 (route-scoped measurement cadence), D-10 (qa:run after waves touching study/SRS paths), D-14 (perf assertions on prod build only, never dev server)
- `.planning/STATE.md` §Decisions — WR-04 commitId idempotency origin (Phase 14, commit b256ea7); Phase 17 undici keep-alive dispatcher in `src/db/index.ts`; known-broken `state.update-progress`/`state.add-decision` (hand-edit STATE.md, verify by diff)

### Framework caveat
- `AGENTS.md` (repo root) — this Next.js version differs from training data; read `node_modules/next/dist/docs/` for `headers()` config syntax before writing next.config.ts changes

</canonical_refs>

<code_context>
## Existing Code Insights

(Re-verified against current code 2026-07-21.)

### Target sites (the five changes)
- `src/app/api/study/complete/route.ts:238-254` — per-card `await db.update(cards)` loop (PERF-07); recall_events insert at :224-234 is ALREADY a single multi-row insert — mirror that pattern
- `src/components/review-list.tsx:301-314` — `saveImageCards(deckId, [singleCard])` called per row (PERF-08 client half); `:253-291` per-word translate fan-out (PERF-09 client half)
- `src/lib/deck-actions.ts:278-295` — `saveImageCards` internal per-row insert loop (PERF-08 server half); auth/ownership check at :264-274 already runs once — keep
- `src/app/api/translate/route.ts` — single-text zod schema at :14-18, 30/min rate limit at :9-12, `client.translateText` at :84 (DeepL SDK natively accepts string arrays)
- `src/components/image-upload-flow.tsx:250-291` — FileReader → base64 JSON POST, no downscale (PERF-10); caps in `src/lib/image-constants.ts` (client 5 MB, server 7 MB)
- `next.config.ts` — currently a stub; clips live in `public/habitat/clips/` (per level/mood, .mp4 + .webm)

### Reusable Assets
- `db.batch()` — supported by the installed neon-http driver (drizzle-orm 0.45.1), currently unused
- The undici 60s keep-alive Agent in `src/db/index.ts:23-37` (Phase 17) — already warms the socket the batched round trip will ride
- Existing "Translation unavailable" placeholder state + manual-edit flow in review-list — D-04's fallback needs zero new UI
- `scripts/qa-run.mjs` (Phase 15) — the correctness gate for anything touching study/SRS paths

### Established Patterns
- Multi-row `.values([...])` insert pattern already in the same file being modified (study/complete recall_events)
- WR-04 commitId flow stays untouched around the new batch (D-01)
- Every push to origin/main auto-deploys production — commits are cheap, pushes are releases

</code_context>

<specifics>
## Specific Ideas

- Wave 1 = PERF-09 translation fix, explicitly so it CAN ship to prod ahead of the rest of the phase (Josh approves the actual push).
- The naming rule for clips (D-08) is part of the phase's definition of done, not an optional doc nicety.

</specifics>

<deferred>
## Deferred Ideas

- **Retire the WR-04 commitId machinery** once the atomic batch has proven itself in prod — candidate for a later cleanup/simplification pass (noted in D-01).
- **LazyMotion/`m` diet** for the 3 remaining `motion/react` importers — already in ROADMAP Backlog with the D-05 rationale; not this phase.
- **PPR/CacheComponents <100ms instant-nav** — pre-existing deferral (Phase 17 deferred-items, needs its own D-07-style checkpoint); untouched by this phase.

</deferred>

---

*Phase: 26-performance-batch*
*Context gathered: 2026-07-21*
