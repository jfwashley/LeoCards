# Phase 12 — CONTEXT

**Phase:** 12 — Pause cards in active deck review
**Created:** 2026-05-20
**Status:** Context gathered, ready for `/gsd-plan-phase 12`

---

## Domain

Per-card **pause / unpause** on the dashboard's active-deck review screen (`<DeckView>` → `<CardList>`). Paused cards are excluded from study sessions and from "due" counts, but their SRS scheduling state (`masteryRound`, `cooldownUntil`, `lastStudiedAt`, `recallCount`) is preserved. On unpause, the SRS clock has effectively been frozen for the pause duration — `cooldownUntil` shifts forward by exactly the time spent paused so the card resurfaces with the same cadence it would have followed.

**In scope:**
- New `pausedAt` column on `cards`
- Pause / unpause API + server actions
- Inline pause/play icon on every row of the deck's `CardList`
- Visual "paused" treatment (greyed out + badge) in the same list
- Excluding paused cards from `assembleSession()` and from dashboard due-count / earliest-cooldown displays
- Migration for the new column

**Out of scope (deferred — see Deferred Ideas):**
- Mid-session pause (the study session screen)
- Bulk pause / select-mode
- Pause history / analytics
- Auto-unpause after N days
- Pausing entire decks

---

## Canonical Refs

Downstream agents MUST read these:

- `.planning/ROADMAP.md` — phase entry, depends on Phase 11
- `.planning/PROJECT.md` — core value (tiger must feel alive), product framing
- `.planning/STATE.md` — current project state
- `src/db/schema.ts` — cards table is where `pausedAt` is added (line ~94)
- `src/lib/study-engine.ts` — `assembleSession()` is where paused cards must be filtered out; `earliestCooldownEnd()` is used by dashboard countdown
- `src/lib/study-queries.ts` — `getStudyCards()` query feeding the study session
- `src/lib/deck-queries.ts` — `getDeckCards()` feeding the dashboard CardList
- `src/app/(protected)/dashboard/page.tsx` — calls both query paths; computes the dashboard counts/countdown
- `src/components/deck-view.tsx` — owns the dashboard widget, currently houses `CountdownTimer`
- `src/components/card-list.tsx` — the row-level component getting the new pause icon
- `src/app/api/study/complete/route.ts` — sequential-writes pattern under Neon HTTP driver; mirror this style for the pause/unpause endpoint
- `drizzle.config.ts` + existing `drizzle/*.sql` migrations — migration pattern reference
- `AGENTS.md` — **"this is NOT the Next.js you know"**; planner/executor MUST consult `node_modules/next/dist/docs/` before writing routes/components

No SPEC.md exists for this phase. No prior CONTEXT.md to carry forward.

---

## Decisions

### Cadence-preservation semantics

- **Decision:** On unpause, `cooldownUntil` shifts **forward by exactly `(now − pausedAt)`**. The SRS clock is frozen during pause.
- **Why:** Matches user's stated intent — "the cadence will continue, and it will appear the same amount as it was going to appear." A card paused 5 days while due tomorrow becomes due in 6 days on unpause.
- **What does NOT shift:** `lastStudiedAt` is left unchanged. We treat `pausedAt` as the source of truth for "this card was unavailable" — analytics that care about real study spacing can compute the gap explicitly. (Considered shifting `lastStudiedAt` too; rejected as unnecessary state churn for Phase 12.)
- **Edge case:** If `cooldownUntil` is `NULL` (new card, never studied), unpause leaves it `NULL`. The card was always immediately available; pause/unpause does not change that.
- **Edge case:** If `cooldownUntil` is in the past at pause time (card was already overdue), the shift still applies: `cooldownUntil = old_cooldownUntil + (now − pausedAt)`. The card resurfaces as overdue by the same amount it was when paused, not more.

### State representation in schema

- **Decision:** Add a single `pausedAt timestamp` column (nullable) to `cards`.
  - `NULL` ⇒ active
  - non-`NULL` ⇒ paused since that instant
- **Why:** Smallest delta, single source of truth (no boolean-drift risk), trivial query predicate (`WHERE "pausedAt" IS NULL`), and the value is exactly what we need to compute the cadence shift.
- **Rejected:** Boolean + timestamp (redundant), separate `card_pauses` history table (overkill — no analytics use case in Phase 12; can be added later non-destructively).
- **Migration:** Drizzle migration adds the column with default `NULL`. No backfill needed — every existing card is "active" by definition.
- **Index:** Single-column index on `(deckId, pausedAt)` is a candidate to keep dashboard / session queries cheap, but defer to research/plan phase to confirm against current query plans.

### Pause UI location & affordance

- **Decision:** Inline pause/play icon button on every `CardList` row, on the dashboard. One click toggles state. No modes, no bulk action, no overflow menu.
- **Why:** Most discoverable, matches the user's framing ("the screen to review the active deck's cards"), no extra UI state machine, fast to implement.
- **Icon:** `lucide-react` already in deps — use `Pause` and `Play` glyphs (verify exact icon names against the installed version).
- **Pending design detail (planner/UI):** exact placement on the row, hover/focus states, tooltip copy ("Pause this card" / "Resume this card"), keyboard accessibility (button semantics, focus ring, screen reader label).

### Visibility & filtering of paused cards

- **Decision (CardList):** Paused cards remain inline in the same list, rendered greyed out with a small "Paused" badge. The row's icon is the play (resume) action. They are NOT hidden, NOT moved to a separate section, NOT behind a toggle.
- **Decision (dashboard counts):** The dashboard's due-cards count, "X cards ready" / "next card in Yh Zm" countdown, and `earliestCooldownEnd` all **exclude** paused cards. Pause = removed from study pressure.
- **Decision (study session):** `assembleSession()` filters out cards where `pausedAt IS NOT NULL`. Paused cards never appear in a session, regardless of cooldown state.
- **Decision (cooldown countdown):** When the deck has only paused cards (or paused + future-cooldown cards), `earliestCooldownEnd` reflects only the active cards. If every card in the deck is paused, the UI should treat it as "no cards available — unpause one to study" rather than showing a far-future countdown. (Exact copy is a planner detail.)

---

## Specifics

- **Endpoint shape (suggested, planner to confirm):** `POST /api/cards/[id]/pause` and `POST /api/cards/[id]/unpause` — single-card, idempotent. Authenticate, verify card belongs to a deck owned by the user (mirror the SEC-02 ownership pattern from `src/app/api/study/complete/route.ts`). Apply rate limiting consistent with the existing study endpoint.
- **Concurrency / no-transactions reality:** Neon HTTP driver has no transactions (see comment in `src/app/api/study/complete/route.ts`). The unpause flow reads `pausedAt + cooldownUntil`, computes new `cooldownUntil`, and writes both columns in one UPDATE. A single UPDATE statement is atomic at the row level — no multi-statement transaction needed. Document this in the implementation.
- **Pause from an in-progress session:** Explicitly out of scope. Pause action only exists on the dashboard / deck review screen. If the user pauses a card on the dashboard and then immediately starts a session, the session is assembled fresh from the server with the paused filter applied — no stale-data race because the session is server-rendered.
- **Test surface:** unit tests on the cooldown-shift math (covers NULL cooldown, past cooldown, future cooldown, zero-duration pause); integration test that paused cards drop out of `assembleSession`; E2E (Playwright) — pause from dashboard, start session, confirm absent; unpause, confirm reappears with correct cadence.

---

## Code Context

Reusable assets and patterns already in the repo:

- **Auth + ownership check pattern:** `src/app/api/study/complete/route.ts` lines 50-93 — reuse verbatim for pause/unpause endpoints (auth, rate limit, deck-ownership join, 401/403/429 responses).
- **Rate limiter:** `createRateLimiter` from `src/lib/rate-limit.ts` — apply with a similar window (10/min/user is fine for pause actions).
- **Drizzle migration workflow:** `npm run db:generate` then `npm run db:migrate` per existing `drizzle/*.sql` files.
- **Branded IDs:** `CardId`, `DeckId` from `src/db/schema.ts` — preserve type safety in any new query / endpoint code.
- **Study engine pure functions:** `src/lib/study-engine.ts` already exports `assembleSession`, `computeCardUpdate`, `earliestCooldownEnd` — pause filtering belongs alongside these as a pure function (`isPaused(card)` predicate) so tests stay cheap.
- **Server-action / API split:** existing pattern is API routes for mutations + server-rendered pages — follow it, don't introduce server actions for this phase.
- **Component framing:** `src/components/card-list.tsx` is the right surface for the row-level icon. `src/components/deck-view.tsx` owns the higher-level countdown logic — that's where the "paused-aware" cooldown wiring lives.

---

## Deferred Ideas

Captured but explicitly **not** part of Phase 12. Promote via `/gsd-phase` when ready.

- **Mid-session pause** — pause button on the study card itself, mid-flow. Requires session-state mutation logic and a UX decision (does the current card get pushed forward in the queue, or removed and the session length adjusted?). Own phase.
- **Bulk pause / select-mode** — multi-select + "Pause N cards" action. Worthwhile if usage data later shows people pausing many cards at once.
- **Pause history / analytics** — separate `card_pauses` append-only table, "you've paused this card 4 times" surface area. Only valuable with a real analytics use case.
- **Auto-unpause after N days** — system-driven unpause to prevent cards from being "lost." Needs UX decision (notification? silent? user-configurable?).
- **Pause entire deck** — a different scope (deck-level dormancy). May tie to the habitat-tiger narrative ("vacation mode") in a future milestone.

---

## Resolved Questions (formerly Open Questions for Planner / Researcher)

*All resolved during Phase 12 execution (phase shipped 2026-05-20; annotated 2026-06-12 at v2.1 close):*

- ~~Confirm `lucide-react` exact icon names (`Pause`, `Play`) in the installed version~~ — RESOLVED: `Pause`/`Play` confirmed and shipped (`src/components/card-list.tsx` imports them from `lucide-react`).
- ~~Confirm whether `(deckId, pausedAt)` partial index is worth adding now vs after first measurement~~ — RESOLVED: deferred per measurement-first policy; `pausedAt` column shipped without partial index (`src/db/schema.ts`), no query-perf issue observed.
- ~~Confirm Next.js 16.2 idiomatic shape for the pause/unpause route handlers~~ — RESOLVED: handlers shipped at `/api/cards/{id}/pause` + `/unpause` following the installed Next.js docs.
- ~~Confirm Playwright spec lives in `e2e/` matching naming pattern~~ — RESOLVED: `e2e/12-pause-cards.spec.ts` shipped.

---

## Success Criteria (for Verify phase later)

- [ ] Migration adds `pausedAt` column; existing data unaffected.
- [ ] Pause icon visible on every CardList row, toggles state on click.
- [ ] Paused cards greyed out in the list with a "Paused" badge.
- [ ] Paused cards never appear in a study session.
- [ ] Dashboard due-count and countdown exclude paused cards.
- [ ] On unpause, `cooldownUntil` shifts forward by exactly `(now − pausedAt)`; `pausedAt` returns to `NULL`.
- [ ] If `cooldownUntil` was `NULL`, it remains `NULL` after unpause.
- [ ] Pause/unpause endpoints enforce auth + deck ownership; rate-limited.
- [ ] Unit tests cover the cooldown-shift math for NULL / past / future cooldown.
- [ ] Playwright E2E: pause card → session excludes it → unpause → cadence correct.
