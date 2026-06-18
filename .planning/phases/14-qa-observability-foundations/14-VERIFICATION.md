---
phase: 14-qa-observability-foundations
verified: 2026-06-17T12:30:00Z
status: passed
human_verified: 2026-06-18 (live UAT — all 3 human-verification items pass; see 14-HUMAN-UAT.md)
score: 14/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "With DEBUG_CHEAT_SECRET set, enter the secret on /debug, then start a study session. Confirm top-right badge shows e.g. R0·n2t (or with cd: when STUDY_COOLDOWN_MINUTES is set). In a separate browser with no QA cookie, confirm no badge appears."
    expected: "QA-authed browser shows corner monospace badge on each study card. Un-authed browser shows no badge and no [data-qa-badge] element."
    why_human: "Live badge render (font, position, readability) and conditional appearance per cookie state cannot be confirmed by grep. Deferred from Plan 02 Task 2 human-check."
  - test: "With DEBUG_CHEAT_SECRET set and STUDY_COOLDOWN_MINUTES=15, enter the secret on /debug. Open /dashboard, confirm each card-list row shows a state badge (e.g. R1·t2n·cd:12m, R3·L, R0·n2t·P). Confirm the cd: segment ticks down live without a page reload."
    expected: "Badges render on all card-list rows (desktop table AND mobile cards). Cooldown segment decrements each minute (or every 10s when <5min). A user with no QA cookie sees no badges on /dashboard."
    why_human: "Live countdown tick and dashboard row badge placement require visual inspection. Also verifies WR-02 does not break badge visibility — desktop table foster-parenting behaviour cannot be confirmed statically. Deferred from Plan 02 Task 3 human-check."
  - test: "On the /debug page, click Refresh after entering the secret. Confirm 'Card SRS state' table appears and lists real cards from the active deck with word, round, direction, cooldown, paused, learned columns."
    expected: "Table rows match card data (word text, masteryRound 0/1/2/3, direction n2t/t2n/either, cooldown remaining or em-dash, learned checkmark for round 3). Row count matches real deck size."
    why_human: "Per-card data accuracy requires actual DB data and visual confirmation. Deferred from Plan 01 Task 3 human-check."
---

# Phase 14: QA Observability Foundations — Verification Report

**Phase Goal:** QA can see exact per-card SRS state and compress cooldown time, with every QA affordance env/secret-gated and provably absent from the customer experience.
**Verified:** 2026-06-17T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Entering the DEBUG_CHEAT_SECRET on /debug sets a persistent leo-qa-mode HMAC cookie | ✓ VERIFIED | `cheat/route.ts` sets `QA_MODE_COOKIE` with `signQaMode()` on both clear (line 83) and set (line 121) paths; `httpOnly:true`, `secure:true`, `sameSite:"lax"`, `maxAge: 1 week` |
| 2  | STUDY_COOLDOWN_MINUTES=15 produces 15-minute cooldowns for rounds 0→1 and 1→2, overriding NO_COOLDOWN and dev auto-zero | ✓ VERIFIED | `buildCooldownConfig()` in `complete/route.ts` line 31-35: if `env.STUDY_COOLDOWN_MINUTES !== undefined`, returns `{ 0: ms, 1: ms, 2: null }` where `ms = minutes * 60 * 1000` |
| 3  | When STUDY_COOLDOWN_MINUTES is unset, cooldown behavior is unchanged | ✓ VERIFIED | `buildCooldownConfig()` lines 37-39: falls through to existing `useNoCooldown` / `DEFAULT_COOLDOWN_MS` logic verbatim |
| 4  | /debug shows a live per-card SRS table sourced from real card data | ✓ VERIFIED | `state/route.ts` lines 99-125: Drizzle query on `cards` table, scoped to `session.user.id`, owner-verified, mapped to `{ id, word, masteryRound, direction, cooldownUntil, pausedAt, learned }`; `debug/page.tsx` lines 330-413 render the table gated on `data?.cards && data.cards.length > 0` |
| 5  | All QA endpoints still 404 when DEBUG_CHEAT_SECRET is unset | ✓ VERIFIED | Both `state/route.ts` line 46 and `cheat/route.ts` line 34 call `cheatEnabled()` first and return `404` with `{ error: "Not found" }` |
| 6  | D-01: QA affordances render only when the browser is QA-authed; no per-feature toggle | ✓ VERIFIED | RSC gates in `study/page.tsx` (line 62 `const qaMode = await readQaAuth()`) and `dashboard/page.tsx` (line 45) thread a boolean prop; `study-card.tsx` guards with `{qaCardData && <QaStateBadge>}`; `card-list.tsx` guards with `{qaMode && <QaStateBadge>}` |
| 7  | D-02: a single DEBUG_CHEAT_SECRET gates every QA affordance — no second secret | ✓ VERIFIED | All gates derive from `cheatEnabled()` / `checkSecret()` / `readQaAuth()` which all read `env.DEBUG_CHEAT_SECRET`; no secondary secret variable introduced |
| 8  | D-08: STUDY_COOLDOWN_MINUTES is one value applied to every cooldown round (0→1 and 1→2) | ✓ VERIFIED | `buildCooldownConfig()` returns `{ 0: ms, 1: ms, 2: null }` — same `ms` for both rounds; round 2→3 is always `null` (learned) |
| 9  | D-09: when set, STUDY_COOLDOWN_MINUTES wins over STUDY_NO_COOLDOWN and the dev auto-zero | ✓ VERIFIED | Precedence is explicit in `buildCooldownConfig()`: the `STUDY_COOLDOWN_MINUTES !== undefined` branch executes before the `useNoCooldown` check |
| 10 | D-10: STUDY_COOLDOWN_MINUTES honored wherever set with no code-level prod block | ✓ VERIFIED | `env.ts` comment documents Vercel scoping; no `NODE_ENV !== "production"` guard around the minutes branch in `buildCooldownConfig()` |
| 11 | When QA-authed, every study session card shows a top-right monospace state badge | ✓ VERIFIED | `study-card.tsx` lines 30-37 build `qaCardData` from `card` when `qaMode` is true; line 111 renders `<QaStateBadge>`; badge has `className="absolute top-1 right-1 ..."` in `qa-state-badge.tsx` line 96 |
| 12 | When QA-authed, every dashboard card-list row shows the same state badge | ✓ VERIFIED | `card-list.tsx` lines 158-166 render `<QaStateBadge>` guarded by `{qaMode && ...}` for desktop rows (lines 248-256 for mobile); NOTE: desktop badge is placed as direct `<tr>` child — see WR-02 WARNING below |
| 13 | Customers receive no QaStateBadge in the DOM — no [data-qa-badge] element | ✓ VERIFIED | Badge omitted by prop omission at RSC level (not CSS-hidden); e2e spec `14-qa-parity.spec.ts` ran and passed (2 passed, web + mobile) asserting `page.locator("[data-qa-badge]").count() === 0` on /dashboard and /study |
| 14 | Gating test proves QA affordances absent when secrets/env unset (QAOB-04) | ✓ VERIFIED | `e2e/14-qa-parity.spec.ts` exists with feature-state probe, DOM badge-absence assertions (always run), endpoint-404 assertions guarded by `featureDisabled` flag; ran 2 passed per SUMMARY-03 |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/debug-cheat.ts` | `QA_MODE_COOKIE`, `signQaMode()`, `verifyQaMode()`, `readQaAuth()` | ✓ VERIFIED | All four exports present (lines 35, 172, 188, 211); file has no `"use client"`; HMAC fixed-sentinel pattern correct |
| `src/env.ts` | `STUDY_COOLDOWN_MINUTES` with transform/pipe coercion | ✓ VERIFIED | Lines 28-32: `z.string().optional().transform(...parseInt...).pipe(z.number().int().min(1).optional())`; in `runtimeEnv` block line 46 |
| `src/app/api/study/complete/route.ts` | `export function buildCooldownConfig()` | ✓ VERIFIED | Lines 29-40: exported, implements D-09 precedence; `const COOLDOWN_CONFIG = buildCooldownConfig()` line 42 |
| `src/app/api/debug/state/route.ts` | GET response includes `cards[]` from real data | ✓ VERIFIED | Lines 99-125: Drizzle query with owner verification; line 125 returns `{ real, forced, cards: cardRows }` |
| `src/components/qa-state-badge.tsx` | `QaStateBadge`, `QaCardData`, `formatCd()`, `data-qa-badge` attr, `absolute top-1 right-1` | ✓ VERIFIED | All exports present (lines 10, 23, 43, 64); span has `data-qa-badge` (line 94) and `absolute top-1 right-1` in className (line 96); min_lines satisfied (102 lines) |
| `src/app/(protected)/study/page.tsx` | `readQaAuth()` gate passing `qaMode` to StudySession | ✓ VERIFIED | Lines 9, 62, 65: import, `await readQaAuth()`, `qaMode={qaMode}` |
| `src/app/(protected)/dashboard/page.tsx` | `readQaAuth()` gate + `cooldownUntil` on cardRows when `qaMode` | ✓ VERIFIED | Lines 7, 45, 123-125, 139: import, gate, conditional `cooldownUntil`, `qaMode={qaMode}` on DeckView |
| `e2e/14-qa-parity.spec.ts` | QAOB-04 parity spec with `[data-qa-badge]` and `/api/debug/*` assertions | ✓ VERIFIED | Lines 69, 77, 84, 88: both locator-count assertions and endpoint-404 assertions present; `featureDisabled` guard pattern line 44 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cheat/route.ts` | `signQaMode` in `debug-cheat.ts` | `cookieStore.set(QA_MODE_COOKIE, signQaMode(), ...)` | ✓ WIRED | Lines 9-12 import; line 83 (clear path) and line 121 (set path) both call `signQaMode()` |
| `study/page.tsx` | `qa-state-badge.tsx` via prop chain | `qaMode` → StudySession → CardStack → StudyCard → QaStateBadge | ✓ WIRED | Confirmed in all four files: `study/page.tsx` line 65, `study-session.tsx` line 460, `card-stack.tsx` line 4 (prop declared, passed), `study-card.tsx` line 111 |
| `study-card.tsx` | `<QaStateBadge data={qaCardData} />` | `{qaCardData && <QaStateBadge ...>}` | ✓ WIRED | Line 111: conditional render with non-null qaCardData |
| `dashboard/page.tsx` | `card-list.tsx` QaStateBadge | `qaMode` prop → DeckView → CardList | ✓ WIRED | `dashboard/page.tsx` line 139, `deck-view.tsx` line 214, `card-list.tsx` lines 158 and 248 |
| `e2e/14-qa-parity.spec.ts` | `[data-qa-badge]` selector | `page.locator("[data-qa-badge]").count()` assertion | ✓ WIRED | Lines 69, 77: both /dashboard and /study assertions present |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `debug/page.tsx` card table | `data.cards` | `GET /api/debug/state` → Drizzle `cards` table query (line 100-111 of state/route.ts) | Yes — `SELECT id, front, masteryRound, cooldownUntil, pausedAt FROM cards WHERE deckId=?` with owner verification | ✓ FLOWING |
| `qa-state-badge.tsx` cooldown timer | `cdLabel` state | `data.cooldownUntil.getTime() - Date.now()` via lazy useState + useEffect interval | Yes — derived from real DB timestamp threaded as prop | ✓ FLOWING |
| `card-list.tsx` badge data | `card.cooldownUntil` | `dashboard/page.tsx` cardRows map: `studyCards.find((s) => s.id === c.id)?.cooldownUntil ?? null` gated on `qaMode` | Yes — `studyCards` is fetched via `getStudyCards()` (real DB query); `null` for customers | ✓ FLOWING |
| `study-card.tsx` badge data | `qaCardData` | `SessionCard.cooldownUntil` from `assembleSession()` which reads from DB via `getStudyCards()` | Yes — real card DB data from study session assembly | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: Unit suite results confirmed by SUMMARY files.

| Behavior | Evidence | Status |
|----------|----------|--------|
| `signQaMode()`/`verifyQaMode()` round-trip | 14-01-SUMMARY: 1913 tests passed; debug-cheat.test.ts covers round-trip, tamper, null/empty/no-dot | ✓ PASS |
| `buildCooldownConfig()` four precedence branches | cooldown-config.test.ts covers: minutes wins, NO_COOLDOWN, dev auto-zero, prod defaults | ✓ PASS |
| `formatCd()` and `buildTokens()` token assembly | qa-state-badge.test.ts: 12 tests — formatCd(0), formatCd(14*60000), formatCd(90*60000); R0·n2t, R1·t2n·cd:22m, R3·L, R1·t2n·P | ✓ PASS |
| Unit suite at HEAD | 1925 passed / 6 skipped (provided in verification notes) | ✓ PASS |
| e2e 14-qa-parity.spec.ts | 2 passed (web + mobile) against secret-disabled server | ✓ PASS |

---

### Probe Execution

No formal `scripts/*/tests/probe-*.sh` probes declared for this phase. The e2e spec `e2e/14-qa-parity.spec.ts` serves as the functional gate (confirmed run: 2 passed).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| QAOB-01 | 14-02 | QA can see per-card state codes in the UI (compact marker) — absent from customer experience | ✓ SATISFIED | `qa-state-badge.tsx` exists; RSC gate via `readQaAuth()` in study and dashboard pages; prop-omission for customers; e2e asserts `[data-qa-badge]` count 0 without QA cookie |
| QAOB-02 | 14-01 | QA can set short non-zero cooldowns via STUDY_COOLDOWN_MINUTES | ✓ SATISFIED | `env.ts` declares and coerces the var; `buildCooldownConfig()` implements D-09 precedence; four unit test branches green |
| QAOB-03 | 14-01 | QA can read live per-card state table on /debug from real data | ✓ SATISFIED | `state/route.ts` returns `cards[]` from Drizzle query; `debug/page.tsx` renders the SRS table gated on data presence |
| QAOB-04 | 14-03 | Gating test proves QA affordances absent when secrets/env unset | ✓ SATISFIED | `e2e/14-qa-parity.spec.ts` exists with feature-state probe, DOM badge-absence assertions, guarded endpoint-404 assertions; 2 passed against secret-disabled server |

**Orphaned requirements check:** REQUIREMENTS.md Phase 14 row lists QAOB-01 through QAOB-04 only. All four accounted for.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/debug-cheat.test.ts` | 148 | `expect(true).toBe(true)` — placeholder test for "signQaMode throws when unset" | ⚠️ Warning | No-op; the security-relevant throw path has zero coverage. Does not block goal (verifyQaMode-returning-false path is covered), but is a false sense of coverage flagged as IN-05 in the code review. |
| `src/components/card-list.tsx` | 158-167 | `<QaStateBadge>` (renders `<span>`) as direct child of `<tr>` in desktop table | ⚠️ Warning | Invalid HTML per spec — only `<td>`/`<th>` are valid `<tr>` children. Browser foster-parenting may detach the `absolute top-1 right-1` badge from its intended `relative` `<tr>` container. Flagged as WR-02 in code review. Does not break badge ABSENCE (e2e proven) but may affect badge PRESENCE / visual position for QA users on desktop. |
| `src/components/card-stack.tsx` | 5, 8 | `qaMode?: boolean` declared in `CardStackProps` but destructuring omits it — dead prop | ℹ️ Info | `CardStack` receives `qaMode={qaMode}` from `study-session.tsx` line 448 but silently drops it. Misleading wiring; flagged as WR-01 in code review. No behavioral impact — badge renders correctly in `StudyCard`, not `CardStack`. |

**Debt marker check:** No `TBD`, `FIXME`, or `XXX` markers found in modified files.

---

### Human Verification Required

#### 1. Study Session Badge Presence (QA-authed user)

**Test:** With `DEBUG_CHEAT_SECRET` set in `.env.local`, enter the secret on `/debug` (establishing the `leo-qa-mode` cookie). Start a study session. Confirm the top-right corner of each study card shows a monospace badge like `R0·n2t` or `R1·t2n·cd:14m`. In a separate incognito browser with no QA cookie, start the same study session — confirm no badge appears.

**Expected:** QA-authed browser: badge visible on every study card at `absolute top-1 right-1`. Un-authed browser: no badge, no `[data-qa-badge]` element in DOM (automated e2e already confirms this path).

**Why human:** Live badge render, visual positioning, font legibility, and conditional appearance per cookie state are not verifiable by static analysis. Deferred from Plan 02 Task 2 `<human-check>`.

---

#### 2. Dashboard Card-List Badge + Live Countdown (QA-authed user)

**Test:** With `STUDY_COOLDOWN_MINUTES=15` and `DEBUG_CHEAT_SECRET` set, enter the secret on `/debug`. Open `/dashboard`. Confirm every card-list row shows a state badge (e.g. `R1·t2n·cd:12m`, `R3·L`, `R0·n2t·P`). Wait 1 minute and confirm the `cd:` segment ticks down. A user with no QA cookie must see no badges.

**Expected:** Badges render on both desktop table rows and mobile card items. Cooldown ticks live. Desktop badge positions correctly within the row (see WR-02 — browser may foster-parent the badge `<span>` out of `<tr>`; confirm it still renders visibly near the row).

**Why human:** Live countdown tick, visual badge positioning in the table, and WR-02 impact on desktop layout require visual inspection. Deferred from Plan 02 Task 3 `<human-check>`.

---

#### 3. /debug Card SRS Table Accuracy

**Test:** With `DEBUG_CHEAT_SECRET` set and 2+ cards added, sign in, enter the secret on `/debug`, click Refresh. Confirm the "Card SRS state" table appears and lists each card with correct word, mastery round, direction, cooldown remaining (or `—`), and learned status.

**Expected:** Table row count matches card count in the active deck. Columns Word/R/Dir/Cooldown/Paused/Learned match real DB state. Sorting: unlearned (R<3) cards appear before learned (R3) cards.

**Why human:** Per-card data accuracy requires actual database content and visual confirmation. Deferred from Plan 01 Task 3 `<human-check>`.

---

### WR-02 Desktop Badge HTML Validity — Assessment for QAOB-01

The code review finding WR-02 notes that in `card-list.tsx` (desktop table path, lines 158-167), `<QaStateBadge>` — which renders `<span data-qa-badge>` — is placed as a direct child of `<tr>`, before the first `<td>`. This is invalid HTML. Browsers will foster-parent the stray inline element, potentially placing it outside the table's stacking context and detaching it from the `relative` `<tr>` container the `absolute top-1 right-1` positioning expects.

**Impact on must-haves:**
- QAOB-04 (badge absence for customers) is unaffected — the e2e spec asserts `[data-qa-badge]` count 0 at the DOM level, and foster-parenting does not remove the element.
- QAOB-01 (badge visible to QA users) is affected: the badge will appear in the DOM for QA users, but its visual position on desktop rows may be wrong (floating outside the row). The mobile path (lines 248-256) is correct — badge is inside a `relative` `<div>`.

This is captured in Human Verification item 2. The QAOB-01 must-have is marked VERIFIED for DOM-presence, but visual correctness on desktop requires human confirmation.

---

### Gaps Summary

No must-have truths failed. All 14 truths are VERIFIED against the actual codebase. No required artifacts are missing or stubs. No key links are broken.

Two code-quality warnings exist (WR-01: dead `CardStack` prop; WR-02: invalid HTML placement of badge in desktop `<tr>`) but neither blocks the phase goal. WR-02 requires human confirmation that the badge still renders visibly near the correct row on desktop.

Three human verification items are outstanding (live badge presence, live countdown, /debug table accuracy). These items were planned for end-of-phase human verification per the PLAN `<human-check>` blocks. No automated gaps exist.

---

_Verified: 2026-06-17T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
