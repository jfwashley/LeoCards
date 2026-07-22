# Fable-5 all-phases performance review (2026-06-30) — items 8–19

**Provenance:** Second tranche of the 2026-06-30 Fable-5 all-phases perf review. Items 1–7 were triaged 2026-07-21 (5 still open → minted PERF-07..11, shipped as Phase 26 Performance batch, complete 2026-07-22; item 3 already fixed in Phase 17 D-03; item 6 LazyMotion deferred to Backlog with D-05 rationale). Items 8–19 below were pasted by Josh on 2026-07-22 to seed **Phase 27 (Performance batch 2)** — NOT yet re-verified against current code.

**Triage notes (2026-07-22, pre-discussion):**
- Line numbers date from ~2026-06-30 and predate Phases 17/25/26 refactors — every item needs re-verification against current code before minting requirements (same protocol as the 26 triage).
- Item 17 explicitly folds into "item 1's rework" = PERF-07, which SHIPPED in 26 (study/complete step-6 writes are now one `db.batch()`). Check whether the read-path waterfall (ownership → card load → getHabitatFacts, factsBefore/factsAfter) was touched by 26-02 or is still open.
- Item 19 "slots into item 4's batch handler" = PERF-09's `texts[]` array mode, which SHIPPED in 26-01. The LRU cache + client dedupe remain open on top of it.
- Item 15 is as much a **correctness bug** (stale-response race) as perf.
- Item 16 (CardList memo) overlaps surface with item 9 (optimistic pause toggle) — both in card-list.tsx; likely one plan.
- Item 8 cookieCache TTL delays session-revocation propagation — security trade-off to settle at discussion (Phase 25 delete-account/change-password revocation semantics interact with this).

---

## The items (verbatim from the review)

8. **Deduplicate session lookups and enable cookie caching** (Phase 1/7). The protected layout and every page each call auth.api.getSession — two session-table round trips per navigation — and auth.ts configures no cookieCache. Wrap getSession in React cache() (dedupes layout+page within a render) and enable session.cookieCache with a short TTL (~5 min; note it delays revocation propagation by up to the TTL). Helps every page, all 10 API routes, and cold starts. Effort: S–M.

9. **Make the pause/resume toggle optimistic** (Phase 12/21). card-list.tsx:141-166 waits for POST + router.refresh() before the icon flips, and each refresh re-runs all five dashboard queries. The optimistic-Set pattern to copy already exists in your own word-list-browser.tsx. Coalesce trailing refreshes. Effort: S–M. Gain: tap feedback goes from server-round-trip to instant.

10. **Swap client-side zod for zod/mini** (Phases 19–22). translation-form, review-list, welcome-step-choose, and all four auth pages hydrate full zod v4 for trivial validation; zod v4 ships a tree-shakeable mini build for exactly this. Item 3 removes review-list from first load; this trims the rest (~44 KB+ and its parse cost, including every new user's first paint on /signup). Effort: S–M.

11. **Filter the Browse catalogue server-side** (Phase 23). browse/page.tsx:54-82 serializes all 280 words (~35 KB) into the RSC payload per topic view, then the client filters down to the ~20 rendered. Topic is a validated URL param — filter before serializing; keep only the CEFR filter client-side. Effort: S.

12. **Consolidate the dashboard's data pass** (Phases 6/14/21). Three stacked wins in dashboard/page.tsx: it fetches the same deck's cards twice (getDeckCards all-columns + getStudyCards subset) then stitches them with an O(n²) find; getUserNativeLanguage is a separate query for a field better-auth already returns on session.user (also on browse + new-card pages); and createdAt is serialized per row but never read by the client. One query, derive the study subset in JS, drop the dead field. This multiplies with item 9 since every toggle-refresh re-pays it. Effort: M.

13. **Speed up the extraction spinner: try Haiku, then streaming** (Phase 10). extract/route.ts:164 runs word-listing OCR on claude-sonnet-4-6 at temperature 0 and blocks until the full 512-token response. Trial claude-haiku-4-5 (typically 2–3× faster, ~⅓ cost) behind your existing eval expectations; if still slow, stream partialOutputStream so review rows populate progressively. Effort: S (model) / M (streaming).

14. **Add secondary indexes before the tables grow** (Phase 1 schema). The schema has zero non-PK indexes: cards(deckId), decks(userId), recall_events(cardId) (card-delete cascades scan the append-only events table), session(userId). Fine at today's row counts — this is the one item that becomes a cliff rather than a constant, and it's cheap insurance now. Use db:push per your workflow. Effort: S.

15. **Fix the translation-form stale-response race** (Phase 2/22). translation-form.tsx:238-296 debounces correctly but never aborts: type "cha"→"chat" and a slow first response overwrites the newer translation. An AbortController per debounced fire fixes both the wrong-result race and wasted DeepL quota. Effort: S. (As much a correctness bug as perf.)

16. **Memoize CardList rows + defer the search filter** (Phase 21). card-list.tsx:388-498 re-renders every visible row (~12 elements each, up to ~300 rows) on every search keystroke — no React.memo row (your own BWWordRow shows the pattern), no useDeferredValue. Also defer mounting rows until the height: 0→auto accordion tween (lines 292-303) completes — height animation relayouts the whole mounted subtree every frame. Effort: M.

17. **Trim the study/complete read path** (Phase 3/14). Fold into item 1's rework: the ownership check → card load → getHabitatFacts waterfall (route.ts:133-177) can be Promise.all'd, and factsAfter (2 more queries) is derivable from factsBefore + the computed card updates. Both reviewers flagged the double habitat fetch. Effort: S once item 1 is open. *(Item 1 = PERF-07, shipped in 26-02 — re-verify what remains.)*

18. **Drop the backdrop-filter: blur sitting over the playing video** (Phase 24). h-prog-card.tsx:45 forces the GPU to re-blur the card's backdrop every video frame for as long as the clip loops; its background is already 92%-opaque white, so the blur is nearly invisible. Effort: trivial.

19. **Cache repeated translations** (Phase 10). /api/translate hits DeepL unconditionally — common vocabulary is re-translated for every user against a 500k-char/month free tier. A small in-memory LRU (same deployment assumptions as your existing rate limiter) + client-side dedupe within a fan-out. Slots naturally into item 4's batch handler. Effort: S–M. *(Item 4 = PERF-09, shipped in 26-01 — the `texts[]` batch handler now exists to slot into.)*
