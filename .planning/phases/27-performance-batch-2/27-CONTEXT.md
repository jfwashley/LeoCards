# Phase 27: Performance batch 2 - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship all 12 items (8–19) of the second tranche of the Fable-5 all-phases performance review, re-verified against current code: session lookup dedupe + cookie caching, optimistic pause/resume toggle, zod→zod/mini client diet, server-side Browse filtering, dashboard data-pass consolidation, extraction latency (Haiku trial, conditionally streaming), secondary DB indexes, the translation-form stale-response race fix, CardList row memoization + deferred search, study/complete read-path trim, over-video backdrop-blur removal, and a translation LRU cache.

**Strictly a make-it-faster phase** with two correctness fixes riding along (item 15's stale-response race; item 12 removes an O(n²) stitch). Zero feature additions; the only pixel-level change is dropping nearly-invisible blurs (item 18, deliberately broadened — see D-02). Phase 15 core-journey harness + unit + e2e suites stay green.

**NOT this phase:** Phase 18's field-validation/re-cert gate (runs after, certifying this phase's final code); LazyMotion diet (Backlog, 17 D-05 carve-out); retiring WR-04 commitId machinery (26 D-01 deferral, still parked).

**Requirements minting:** items 8–19 → PERF-12..PERF-23 in `.planning/REQUIREMENTS.md` (mint at plan time, mirroring the Phase 26 protocol; item numbers map in source-doc order: item 8→PERF-12 … item 19→PERF-23).

</domain>

<decisions>
## Implementation Decisions

### Triage & scope
- **D-01:** **All 12 items are in.** Risky items keep their built-in gates: item 13 eval-gated (D-05/D-06), item 16 e2e + visual check, item 18 trivially revertible.
- **D-02:** **Item 18 broadened to ALL over-video backdrop blurs**: `daybreak/h-prog-card.tsx:45` (the flagged one) PLUS `daybreak/h-back.tsx:19`, `daybreak/h-mood-chip.tsx:27`, and `habitat-scene.tsx:308` — same per-frame GPU cost mechanism, one small plan. `daybreak/account-back.tsx` is explicitly NOT touched (static page, no per-frame cost).

### Session caching (item 8)
- **D-03:** **Full recommendation: React `cache()` around the session lookup + better-auth `session.cookieCache` with ~5-minute TTL.** Accepted trade-off: revocation (change-password `revokeOtherSessions`, delete-account) propagates to other devices up to 5 min late — acceptable for this app; a deleted user's writes still fail at the DB layer (FK cascades removed their rows).
- **D-04:** **`/account` and its server actions bypass the cookie cache** (better-auth per-call `disableCookieCache`) — the account page and its mutations (change password, email change, delete) always verify the live session. Everything else rides the cache.

### Extraction latency (item 13)
- **D-05:** **Staged: trial `claude-haiku-4-5` first.** Quality gate = existing eval expectations PLUS a manual side-by-side on a few real photos (the Phase 10 offline vision eval reference-set is incomplete carried debt — do not pretend it gates this). Revert to `claude-sonnet-4-6` if extraction quality measurably drops.
- **D-06:** **Streaming is threshold-gated, not checkpoint-gated: if median end-to-end extraction on Haiku is still > ~4 s on a typical photo, streaming (`partialOutputStream` → progressive review rows) lands in the SAME phase without another ask.** Under 4 s → streaming is skipped; goes to backlog only if the spinner still feels long later.

### Deploy & DB sequencing
- **D-07:** **Push the completed Phase 26 to origin/main BEFORE Phase 27 execution starts** (Josh's manual push — prod gets the live 429 fix + all 26 wins now; 27's changes stay cleanly attributable to their own later deploy). No early-push wave structure inside 27 itself.
- **D-08:** **Item 14's indexes (`cards(deckId)`, `decks(userId)`, `recall_events(cardId)`, `session(userId)`) apply to the hosted Neon DB via `npm run db:push` DURING execution, at that plan's gate, with Josh's explicit authorization** (hosted-DB-writes-gated rule). Additive index creation, instant at current row counts. Remember: drizzle-kit reads `DATABASE_URL` from `process.env`, does NOT auto-load `.env.local`.

### Carried forward (do not re-litigate)
- **D-09:** Proof = count/round-trip assertions, never timing gates in tests (26 D-02); informal stopwatch observations go in phase summaries.
- **D-10:** Perf assertions run on prod build only, never dev server (17 D-14); `qa:run` after any wave touching study/SRS paths (17 D-10).
- **D-11:** Commits are cheap, pushes are releases — every push to main auto-deploys prod; Josh approves every push.

### Claude's Discretion
- Item 9 optimistic-toggle mechanics: rollback-on-error semantics, trailing-refresh coalescing strategy (copy the existing optimistic-Set pattern from `word-list-browser.tsx`).
- Item 10 zod/mini migration mechanics and which importers convert (note: Phase 25 added `account-details-card.tsx` + `change-password-card.tsx` as client zod importers the review didn't know about — include them in the audit).
- Item 12 dashboard consolidation shape (one query, derive study subset in JS, drop dead `createdAt` — planner verifies the field is genuinely unread).
- Item 16 memoization details (React.memo row per the existing `BWWordRow` pattern, `useDeferredValue`, defer row-mount until the accordion tween ends).
- Item 17 read-path composition (`Promise.all` the ownership/card/facts reads; derive `factsAfter` from `factsBefore` + computed updates — verify against the shipped 26-02 batch code, `route.ts:179/298` double fetch confirmed still present).
- Item 19 LRU size/TTL and keying (client-side dedupe within a fan-out + server LRU; same single-instance deployment assumptions as the existing rate limiter; slots into the shipped PERF-09 `texts[]` handler).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase source & requirements
- `.planning/research/perf-review-2026-06-30-items-08-19.md` — the 12 items VERBATIM + pre-triage notes (items 17/19 build on shipped 26 code; line numbers predate Phases 17/25/26 — re-verify every site)
- `.planning/ROADMAP.md` — Phase 27 detail block (goal, dependencies, triage watch-list)
- `.planning/REQUIREMENTS.md` — PERF-07..11 definitions to mirror when minting PERF-12..23

### Prior-phase decisions that constrain this phase
- `.planning/phases/26-performance-batch/26-CONTEXT.md` — D-01 (WR-04 kept), D-02 (count-assertion proof standard), D-03/D-04 (translate batch + fallback the LRU must compose with)
- `.planning/phases/17-performance-optimization/17-CONTEXT.md` — D-05 (motion carve-out: item 16 must NOT touch the card-swipe drag physics), D-10, D-14
- `.planning/STATE.md` §Decisions — Phase 26-01..05 entries (shipped batch/translate/resize/cache code items 17/19 build on); known-broken `state.update-progress`/`state.add-decision`/`state.advance-plan`/`state.record-session` (hand-edit STATE.md, verify by `git diff`)

### Framework caveats
- `AGENTS.md` (repo root) — this Next.js version differs from training data; read `node_modules/next/dist/docs/` before touching next.config/router behavior
- better-auth docs (installed version) — `session.cookieCache` semantics + per-call `disableCookieCache` (D-03/D-04); researcher verifies exact API against the installed package, not training data

</canonical_refs>

<code_context>
## Existing Code Insights

(Scouted 2026-07-22 — all 12 items confirmed still live in current code.)

### Target sites
- Item 8: `src/lib/auth.ts` has NO `cookieCache`; `auth.api.getSession` called in `(protected)/layout.tsx` + 7 pages + API routes (pause/unpause/debug…); no React `cache()` anywhere in src/lib
- Items 9+16: `src/components/card-list.tsx` — `router.refresh()` at :239 (pause toggle, Pitfall-2 comment explains why refresh exists), rows unmemoized; both items land in the same file, likely one plan
- Item 10: client zod importers = `translation-form.tsx`, `review-list.tsx`, `welcome/welcome-step-choose.tsx`, 4 auth pages, PLUS Phase-25 additions `account-details-card.tsx` + `change-password-card.tsx`
- Item 11: `src/app/(protected)/deck/browse/page.tsx` — `?topic=` already validated against CATEGORIES (:32-36, the WR-01 fix) but the full per-category map is still serialized (:65)
- Item 12: `dashboard/page.tsx` — `getUserNativeLanguage` (:207) + `getDeckCards`/`getStudyCards` double fetch (:236-237)
- Item 13: `src/app/api/extract/route.ts:164` — `anthropic("claude-sonnet-4-6")`, comment at :159 dates the model choice to 2026-05-19
- Item 14: `src/db/schema.ts` — zero `index(` occurrences confirmed
- Item 15: `src/components/translation-form.tsx` — zero `AbortController` occurrences confirmed
- Item 17: `src/app/api/study/complete/route.ts` — `factsBefore` :179, `factsAfter` :298 double `getHabitatFacts`; write path is now the 26-02 `db.batch()` — read path untouched
- Item 18: blurs at `daybreak/h-prog-card.tsx:45` (6px), `daybreak/h-back.tsx:19`, `daybreak/h-mood-chip.tsx:27`, `habitat-scene.tsx:308` (all 4px)
- Item 19: `src/app/api/translate/route.ts` — the 26-01 `texts[]` array mode + retry fan-out is the handler the LRU slots into

### Reusable Assets
- Optimistic-Set pattern in `word-list-browser.tsx` (item 9 copies it); `BWWordRow` React.memo pattern (item 16 copies it)
- The existing rate limiter's single-instance in-memory assumptions (item 19's LRU shares them)
- `scripts/qa-run.mjs` — correctness gate for study/SRS-touching waves (items 8, 12, 17)
- Existing extract-route eval expectations (Phase 10) — item 13's partial quality gate

### Established Patterns
- Session type quirk: `session.user.nativeLanguage` types `string | null | undefined` — normalize with `?? "en"` (25-04 decision); relevant when item 12 swaps `getUserNativeLanguage` for the session field
- biome `noNonNullAssertion` + `noUncheckedIndexedAccess` shape test code (multiple prior gotchas); scope biome to touched files
- e2e specs may contain LOCAL helper copies — grep specs for helpers, not just files_modified (Phase 23 seedOneCard miss)
- Run full `tsc --noEmit` AFTER the e2e wave (Phase 23 lesson)

### Integration Points
- Item 8's `cache()` wrapper becomes the single session entry point every page/layout imports — touches the same files item 12 edits (dashboard) — sequence to avoid conflicts
- Item 12 + item 9 multiply: every toggle-refresh re-pays the dashboard pass; land 12 before or with 9
- Items 15 + 19 both touch the translate client path (`translation-form.tsx` / fan-out) — coordinate

</code_context>

<specifics>
## Specific Ideas

- Phase 26 gets pushed to prod BEFORE this phase executes (D-07) — if the push surfaces the parked 26-HUMAN-UAT items (prod clip Cache-Control curl), those close alongside.
- The 4s streaming threshold (D-06) is measured as median end-to-end extraction wall-time on real photos against a prod-like build, consistent with D-10.

</specifics>

<deferred>
## Deferred Ideas

- **Retire WR-04 commitId machinery** — still parked from 26 D-01; not this phase.
- **LazyMotion/`m` diet** — Backlog with 17 D-05 rationale; item 16 must not creep into it.
- **Streaming extraction as standalone** — only if Haiku clears the 4s bar AND the spinner still feels long later (D-06).
- **PPR/CacheComponents <100ms instant-nav** — pre-existing Phase 17 deferral, untouched.

</deferred>

---

*Phase: 27-performance-batch-2*
*Context gathered: 2026-07-22*
