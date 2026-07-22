# Requirements: LeoCards v3.0 Performance & QA

**Defined:** 2026-06-12 · **Resumed:** 2026-06-25 (after v4.0 Daybreak shipped)
**Milestone goal:** Make the app feel instant on every key route, and make the core learning journey provably correct with a scripted, time-aware QA harness.

Key routes (perf scope): `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`. `/habitat` is excluded — already CWV-passing (Phase 13.1).

## v3.0 Requirements

### QA Observability (QA-only features — env/secret-gated, never customer-visible)

- [x] **QAOB-01**: QA can see per-card state codes in the UI — a compact marker on each card (e.g. `R2·t2n·cd:14m`) showing mastery round, next direction, cooldown remaining, learned/paused flags — rendered only when QA mode is active (gated like `DEBUG_CHEAT_SECRET`); completely absent from the customer experience
- [x] **QAOB-02**: QA can set short non-zero cooldowns via env (e.g. `STUDY_COOLDOWN_MINUTES=15`) so 12h/24h round transitions are testable within a 10–60 minute window — `STUDY_NO_COOLDOWN` alone hides cooldown bugs because it never exercises the "still cooling down" state
- [x] **QAOB-03**: QA can read a live per-card state table on `/debug` (card id, word, round, direction, cooldownUntil, pausedAt, learned) sourced from real data — extending the existing real-state readout
- [x] **QAOB-04**: A gating test proves QA affordances are absent when secrets/env are unset (prod-parity check: no state codes in DOM, no QA endpoints reachable)

### Core-Journey QA Scripts (scripted, repeatable, against real pipeline — no virtual overrides)

- [x] **QAJ-01**: QA can run a scripted "learn a card" journey — create user/deck/card, run a real study session via the app's own API path, grade correctly, and assert round 0→1 advancement with the correct next direction and cooldown
- [x] **QAJ-02**: QA can script the full mastery progression (rounds 0→1→2→3 → learned) including wrong-answer paths (round resets/holds per engine rules) and direction rules (round0=n2t, round1=t2n, round2=either)
- [x] **QAJ-03**: QA can run a time-resumable session — the script persists a manifest (user, card ids, expected next state, timestamps), exits, and on resume 10–60 minutes later asserts each card landed in the expected state (cooldown expired vs still cooling, due-count correct)
- [x] **QAJ-04**: QA can script habitat level progression — learn enough cards through the real pipeline to cross the level 1→2 threshold (and one representative higher transition) and assert `computeHabitatState`, the dashboard widget, and `/habitat` all reflect the new level
- [x] **QAJ-05**: QA can verify remembering/decay states — scripted verification of the 2-day grace + 5%/day decay behavior via a QA-gated time-shift mechanism (no real multi-day waits), including pause interactions (paused cards don't decay study cadence per Phase 12 rules)
- [x] **QAJ-06**: QA scripts clean up after themselves — all QA users use the `*test.local` domain so `scripts/cleanup-test-users.mjs` removes them; a QA run leaves no residue in prod data

### Performance — Measure

- [x] **PERF-01**: A codified measurement harness (`scripts/measure-cwv.mjs` + npm script) produces warm-prod Lighthouse medians (n≥5, mobile + desktop presets) for the four key routes — replacing the ad-hoc shell commands from 13-PERF-REAL.md
- [x] **PERF-02**: Each key route has a baseline report with bundle composition (per-route first-load JS, chunk fingerprinting via `page_client-reference-manifest`) and a ranked bottleneck classification (bundle vs RSC waterfall vs hydration)

### Performance — Optimize

- [x] **PERF-03**: Each key route meets CWV "Good" gates on warm prod mobile: LCP ≤2500 ms, TBT ≤200 ms, CLS ≤0.1, Perf ≥90 (n≥5 medians) — every optimization lands with a measured before/after vs the PERF-02 baseline
- [x] **PERF-04**: Warm client-side navigation between key routes feels instant (<~100 ms perceived), instrumented via Playwright navigation timing extending the `e2e/13-perf.spec.ts` pattern

### Performance — Field Validation & Guardrails

- [ ] **PERF-05**: Field p75 data (Vercel Speed Insights / CrUX) confirms lab medians on key routes once traffic accrues, or variance is documented
- [ ] **PERF-06**: A single command re-certifies all perf gates (lab regression guardrail covering the four routes), runnable on demand before any release

### Performance — Batch optimizations (Phase 26, from the re-validated Fable-5 review)

Provenance: 2026-06-30 Fable-5 all-phases code review, re-verified against current code 2026-07-21 (5 of 7 items still open; lazy-load ImageUploadFlow already fixed in Phase 17, LazyMotion diet deferred to backlog per D-05 carve-out).

- [x] **PERF-07**: The study-session commit updates all card mastery rows in a single round trip to Neon (`db.batch()` or equivalent) — no per-card sequential `await db.update` loop in `/api/study/complete`
- [x] **PERF-08**: Committing N reviewed image-cards is one server action carrying the whole array and one multi-row insert — auth/ownership checked once, not N times (`review-list.tsx` + `saveImageCards`)
- [x] **PERF-09**: Extractions above 30 words translate successfully via one batched DeepL request (native array API) — the deterministic per-word fan-out 429 → "Translation unavailable" failure is fixed and test-covered (live bug: front-load as Wave 1)
- [x] **PERF-10**: Photos are downscaled client-side (~1568 px long edge, JPEG re-encode) before upload, and the silent 3.3-5 MB dead zone (server 7 MB cap vs Vercel ~4.5 MB body limit) is closed
- [x] **PERF-11**: Habitat clips ship with a long-lived immutable `Cache-Control` header (next.config `headers()` for `/habitat/clips/*`), verified in response headers

### Performance — Batch optimizations 2 (Phase 27, from the re-validated Fable-5 review items 8-19)

Provenance: 2026-06-30 Fable-5 all-phases code review, items 8-19 (second tranche; items 1-7 became Phase 26), pasted by Josh 2026-07-22 and saved verbatim to `.planning/research/perf-review-2026-06-30-items-08-19.md`. NOT yet re-verified against current code at discussion time; requirements minted at discussion (same protocol as Phase 26).

- [x] **PERF-12**: Session lookups deduped within one request via React `cache()` (layout+page share one `auth.api.getSession`); `session.cookieCache` ~5-min TTL lets most getSession calls skip the DB; `/account` + its server actions bypass the cache (`disableCookieCache`) so mutations always see a live session (D-03/D-04).
- [x] **PERF-13**: Pause/resume toggle flips the card icon optimistically before the POST resolves, rolls back on error, coalesces trailing `router.refresh()` (`card-list.tsx`).
- [ ] **PERF-14**: The 9 client-side zod importers use `zod/mini` instead of full zod, identical validation semantics, `zodResolver` unchanged.
- [x] **PERF-15**: Browse topic-detail view serializes only the requested topic's ~20-word subset (not all ~280 words) and skips `categoryCounts` on that branch.
- [ ] **PERF-16**: Dashboard issues one card query (study subset derived in JS, no O(n²) stitch), reads native language from `session.user.nativeLanguage` (no separate `getUserNativeLanguage` query), drops the unread `createdAt` field from the wire payload.
- [ ] **PERF-17**: Extraction runs on `claude-haiku-4-5` (passing existing eval expectations + manual real-photo side-by-side); streams `partialOutputStream` progressive rows only if measured median exceeds ~4s (D-05/D-06).
- [x] **PERF-18**: Secondary indexes on `cards(deckId)`, `decks(userId)`, `recall_events(cardId)`, `session(userId)`, applied to Neon via `db:push` (D-08).
- [x] **PERF-19**: Translation form aborts the in-flight request on each new debounced fire (`AbortController`) so a slow earlier response never overwrites a newer one; `AbortError` is a silent no-op (correctness fix).
- [x] **PERF-20**: CardList rows `React.memo`-extracted, search filter uses `useDeferredValue`; rows mount only after the accordion tween completes.
- [x] **PERF-21**: `/api/study/complete` runs ownership/card/factsBefore reads in one `Promise.all` and derives `factsAfter` in JS (no second `getHabitatFacts`).
- [x] **PERF-22**: No `backdropFilter` blur remains over the playing habitat video (`h-prog-card.tsx`, `h-back.tsx`, `h-mood-chip.tsx`, `habitat-scene.tsx`); `account-back.tsx` untouched (D-02).
- [x] **PERF-23**: Repeated identical translation requests hit an in-memory LRU (bounded, TTL'd, keyed `sourceLang:targetLang:text`) instead of DeepL on the 2nd+ call, with client-side dedupe within a fan-out (D-09).

### Account (v3.0 Phase 25 — My Account)

The account/settings surface deferred out of v4.0 Daybreak, built on the shipped Daybreak design system + better-auth. Scope widened at discussion (D-06) to include editable name/email; delete-account is App-Store compliance (self-serve, in-app, genuinely destructive).

- [x] **ACC-01**: A signed-in user can reach a Daybreak My Account section from the dashboard header and view their account details — name, email, member-since (account-creation month/year), and native language ("I speak") — all display-only in view mode (native language is not editable this phase)
- [x] **ACC-02**: The user can edit their name and email in a single edit mode; the name applies immediately, while an email change applies ONLY after the user clicks a verification link sent to the NEW inbox (the sign-in identifier and old email stay active until then), with a server-persisted pending state and an honest "already in use" error for a taken address (D-06/D-07)
- [x] **ACC-03**: The user can change their password via the real better-auth pipeline with current-password verification, inline (never toast) validation errors, and all other sessions revoked on success (D-08/D-09/D-10)
- [x] **ACC-04**: The user can log out from the section, ending the session and returning to `/login` (dashboard-header logout moves inside the section)
- [x] **ACC-05**: The user can delete their account behind an explicit two-step confirmation (no password re-entry, no typed confirmation); deletion removes all their data (decks, words/cards, SRS/recall state, sessions, habitat progress) and invalidates the session — a deleted user can no longer sign in and their email frees up (D-12/D-13/D-14)
- [x] **ACC-06**: The section is Daybreak-styled and consistent with the v4.0 design system on desktop and mobile, per `.planning/phases/25-my-account/25-UI-SPEC.md`

## Future Requirements (deferred)

- Live extraction eval run (10-HUMAN-UAT) — blocked on real photos + FR/ES tutor
- Live 6-step browser walkthrough (11-HUMAN-UAT) — blocked on billing-enabled keys
- ~~Account / Settings page redesign (deferred from v4.0 Daybreak)~~ — **absorbed into Phase 25 (ACC-01..ACC-06)**
- Pause-feature extensions (mid-session, bulk, deck-level, auto-unpause, history) — on user demand

## Out of Scope

- `/habitat` performance — already passing all CWV "Good" gates (Phase 13.1); do not re-litigate. (Knowing exception 2026-07-21: PERF-11 adds cache headers for habitat clips — a config-only bytes-transferred win, no habitat re-measuring or CWV re-litigation)
- Load/stress testing — single-user product at current scale
- QA features visible to customers in any form — hard requirement, not a nice-to-have (QAOB-04 enforces)
- Real-device farm testing — Lighthouse emulation + the user's own device remain the reference
- CI-pipeline automation of the QA harness — scripts are run-on-demand this milestone; CI wiring is a future candidate
- Editable native language, old-address change notice, forgot-password inside the change form, post-delete farewell screen, page-top identity block, account entry from non-dashboard chrome — all explicitly deferred out of Phase 25 (see 25-CONTEXT.md Deferred Ideas)

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| QAOB-01 | Phase 14 | Complete |
| QAOB-02 | Phase 14 | Complete |
| QAOB-03 | Phase 14 | Complete |
| QAOB-04 | Phase 14 | Complete |
| QAJ-01 | Phase 15 | Complete |
| QAJ-02 | Phase 15 | Complete |
| QAJ-03 | Phase 15 | Complete |
| QAJ-04 | Phase 15 | Complete |
| QAJ-05 | Phase 15 | Complete |
| QAJ-06 | Phase 15 | Complete |
| PERF-01 | Phase 16 | Complete |
| PERF-02 | Phase 16 | Complete |
| PERF-03 | Phase 17 | Complete |
| PERF-04 | Phase 17 | Complete |
| PERF-05 | Phase 18 | Pending |
| PERF-06 | Phase 18 | Pending |
| PERF-07 | Phase 26 | Complete |
| PERF-08 | Phase 26 | Complete |
| PERF-09 | Phase 26 | Complete |
| PERF-10 | Phase 26 | Complete |
| PERF-11 | Phase 26 | Complete |
| PERF-12 | Phase 27 | Complete |
| PERF-13 | Phase 27 | Complete |
| PERF-14 | Phase 27 | Pending |
| PERF-15 | Phase 27 | Complete |
| PERF-16 | Phase 27 | Pending |
| PERF-17 | Phase 27 | Pending |
| PERF-18 | Phase 27 | Complete |
| PERF-19 | Phase 27 | Complete |
| PERF-20 | Phase 27 | Complete |
| PERF-21 | Phase 27 | Complete |
| PERF-22 | Phase 27 | Complete |
| PERF-23 | Phase 27 | Complete |
| ACC-01 | Phase 25 | Complete |
| ACC-02 | Phase 25 | Complete |
| ACC-03 | Phase 25 | Complete |
| ACC-04 | Phase 25 | Complete |
| ACC-05 | Phase 25 | Complete |
| ACC-06 | Phase 25 | Complete |
