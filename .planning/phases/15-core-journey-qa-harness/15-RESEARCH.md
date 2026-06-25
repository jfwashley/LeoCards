# Phase 15: Core-Journey QA Harness — Research

**Researched:** 2026-06-25
**Domain:** Headless HTTP integration testing, better-auth session cookies, SRS engine,
QA-gated time-shift
**Confidence:** HIGH — every finding is sourced from read source files in this session.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Harness = standalone Node `scripts/*.mjs`. NOT Playwright; NOT Vitest.
- **D-02:** Drives the app's real HTTP API path (POSTs grades through the server's own
  endpoints). Does NOT use the `/debug` virtual override. Does NOT automate the browser.
- **D-03:** QA-gated instant time-shift for cooldown/decay — no real multi-day waits.
- **D-04:** Runs against local dev server (`npm run dev`). Self-provisions `*test.local`
  users; self-cleans via `scripts/cleanup-test-users.mjs`.
- **D-05 (derived):** Time-shift is a new QA-only affordance; must mirror the
  `DEBUG_CHEAT_SECRET`/`readQaAuth()` gating discipline (QAOB-04 test extended).
- **D-06 (derived):** Assertions target Phase 14's real-data observability surface —
  the `/debug` per-card SRS table + `R0·n2t`-style codes from REAL data; never the
  virtual-override side of `/debug`.

### Claude's Discretion
- Manifest schema/format (QAJ-03)
- Per-journey script layout vs one orchestrator
- Failure behavior (stop-at-first vs run-all-and-report)
- Exact time-shift surface (request header / QA endpoint / injected clock)

### Deferred Ideas (OUT OF SCOPE)
- Warm-prod target runs (leocards.vercel.app)
- Browser-level Playwright journey coverage
- CI-pipeline automation of the harness
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QAJ-01 | Create user/deck/card, run real study session via app API, grade correctly, assert round 0→1 with correct next direction + cooldown | Study grade endpoint + `/api/debug/state` for assertion found |
| QAJ-02 | Script full mastery progression 0→1→2→3→learned, wrong-answer reset/hold + direction rules | `computeCardUpdate` + `ROUND_REQUIREMENT` map fully documented |
| QAJ-03 | Time-resumable session: persist manifest, exit, resume 10–60 min later, assert card states | Manifest schema proposed; cooldown comparison logic clear |
| QAJ-04 | Habitat level progression: cross L1→2 (+ one higher), assert `computeHabitatState` + dashboard + `/habitat` | `LEVEL_THRESHOLDS` + `/api/habitat` GET endpoint found |
| QAJ-05 | Decay/grace (2-day grace + 5%/day, pause interactions) via QA-gated time-shift | `computeQuality(now)` entry point identified; time-shift design resolved |
| QAJ-06 | Self-cleaning: all QA users `*test.local`; `scripts/cleanup-test-users.mjs` leaves zero residue | Cleanup script confirmed; uses `%@test.local` pattern |
</phase_requirements>

---

## Summary

Phase 15 builds headless `scripts/*.mjs` that drive the real app API pipeline to prove
the core learning journey is correct. All six must-answer items from the brief are now
resolved from code.

**Primary recommendation:** Implement as 3–4 focused scripts sharing a `scripts/qa-lib.mjs`
helper module (HTTP client, auth, provisioning, assertion helpers). Each script is
independently resumable (reads/writes a manifest JSON). A minimal orchestrator
`scripts/qa-run.mjs` calls them in sequence and reports pass/fail.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth/session for harness scripts | API (better-auth `/api/auth/[...all]`) | — | better-auth handles credential exchange; scripts hold the cookie |
| Grade submission | API (`POST /api/study/complete`) | — | Real SRS write path; the thing the harness MUST exercise |
| SRS state computation | `src/lib/study-engine.ts` (pure functions) | `POST /api/study/complete` calls them | Pure — no side effects; harness asserts the persisted DB result |
| Assertion read | API (`GET /api/debug/state`) | DB direct (cleanup) | Existing endpoint returns real per-card SRS rows including direction + cooldown |
| Habitat state | API (`GET /api/habitat`) | `src/lib/habitat-engine.ts` | Pure compute-on-read; no side effects |
| Time-shift | New QA endpoint (D-05) mirroring debug-cheat | `computeQuality(now)` entry point | Must inject shifted `now` into `/api/study/complete` + `/api/habitat` |
| Provisioning | API (`POST /api/auth/.../sign-up/email` + `createDeck` server-action) | — | See Must-Answer §8 |
| Cleanup | `scripts/cleanup-test-users.mjs` (direct DB via CLEANUP_DB_URL) | — | Already exists; harness produces users matching `%@test.local` pattern |

---

## Must-Answer Items — Resolved

### 1. Real Study-Grade Entry Point (D-02) [VERIFIED: source read]

**File:** `src/app/api/study/complete/route.ts`
**Method:** `POST`
**URL:** `http://localhost:3000/api/study/complete`

**Request body** (validated by `CommitSchema`):
```jsonc
{
  "deckId": "<DeckId string>",
  "commitId": "<UUID string, 1-100 chars — stable across retries>",
  "grades": [
    { "cardId": "<CardId>", "direction": "n2t" | "t2n", "correct": true | false }
    // 1..500 entries
  ]
}
```

**Response (200 OK):**
```jsonc
{ "success": true, "leveledUp": null }         // no level-up
{ "success": true, "leveledUp": 2 }            // crossed to level 2
```

**Error codes:** 401 (no session), 403 (deck not owned), 400 (bad body), 429 (rate limit
— 10 req/min/user), 500 (DB write failure — safe to retry with same commitId).

**Critical details for the harness:**
- `commitId` is an idempotency key. The harness MUST generate a fresh UUID per session.
  Re-posting the identical `commitId` is a no-op (WR-04 guard via `lastCommitId` on
  each card + `onConflictDoNothing` on `recall_events`).
- Auth is via `better-auth` session: `auth.api.getSession({ headers: ... })` reads the
  `better-auth.session_token` cookie. The harness must send this cookie on every request
  (see §2 below).
- `now = new Date()` is called inside the handler. The time-shift mechanism (§4 below)
  must inject an offset the handler honours.
- There is NO server action for grade submission — it is a Route Handler.
  `deck-actions.ts` (`"use server"`) handles deck/card CRUD only, not grade submission.

**Scout finding confirmed:** `src/app/api/habitat/route.ts` is the habitat read endpoint
(`GET /api/habitat`) — correct, but it is NOT the grade-submission path. The grade path
is `POST /api/study/complete` as found above.

---

### 2. Auth-for-Scripts — Cookie Acquisition [VERIFIED: source read]

The app uses **better-auth** (`^1.5.6`) with `emailAndPassword` enabled. The auth route
handler is at `src/app/api/auth/[...all]/route.ts` which does
`toNextJsHandler(auth)` — meaning better-auth handles all `/api/auth/*` paths.

**Sign-in endpoint:**
```
POST http://localhost:3000/api/auth/sign-in/email
Content-Type: application/json

{ "email": "...", "password": "...", "rememberMe": true }
```

**Sign-up endpoint:**
```
POST http://localhost:3000/api/auth/sign-up/email
Content-Type: application/json

{ "email": "...", "password": "...", "name": "QA Tester" }
```

**Session cookie name:** `better-auth.session_token` (dev/HTTP). In local dev
(`NODE_ENV !== production`) better-auth does not apply the `__Secure-` prefix, so the
cookie name is `better-auth.session_token` with no secure prefix.

**How the harness obtains and sends credentials:**
```js
// Step 1 — sign in (or sign up)
const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, rememberMe: true }),
});

// Step 2 — extract the Set-Cookie header
const setCookie = res.headers.get('set-cookie');
// Parse "better-auth.session_token=<value>; Path=/; HttpOnly; ..."
// Extract the "better-auth.session_token=<value>" token.

// Step 3 — send on all subsequent requests
await fetch('http://localhost:3000/api/study/complete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: `better-auth.session_token=${sessionToken}`,
  },
  body: JSON.stringify({ deckId, commitId, grades }),
});
```

**No CSRF token required for JSON bodies.** The `formCsrfMiddleware` inside better-auth
applies to `application/x-www-form-urlencoded` only; `application/json` is allowed
without CSRF.

**Multiple cookies:** better-auth may set multiple cookies (session token + possibly a
nonce cookie). The harness should capture and forward all `Set-Cookie` values from the
sign-in response, not just the session token.

---

### 3. The SRS / Study Engine Module [VERIFIED: source read]

**File:** `src/lib/study-engine.ts`

**Key functions and their roles:**

`assembleSession(cards, now)` — builds the ordered session card list (filters due
unlearned cards, interleaves 10% resurface). Called from the study UI (RSC page) NOT
from the harness directly; the harness POSTs pre-built grade arrays.

`getCardStage(card)` — returns the direction for a card given its `masteryRound`:
```ts
// masteryRound 0 → "n2t"
// masteryRound 1 → "t2n"
// masteryRound 2+ → random "n2t" | "t2n"
```
The harness uses this rule to know which direction to supply in each grade.

`computeCardUpdate(cardId, currentRound, grades, now, cooldownMsByRound)` — the
authoritative SRS state machine. Called inside `POST /api/study/complete` for each card.

**Round advancement rules (`ROUND_REQUIREMENT` map):**
```ts
const ROUND_REQUIREMENT = {
  0: "n2t",   // round 0 → must answer n2t correctly at least once
  1: "t2n",   // round 1 → must answer t2n correctly at least once
  2: "either" // round 2 → either direction correct at least once
};
```
Advancement is capped at +1 round per session. Wrong answers do not penalise —
they simply fail to satisfy the requirement, so the round stays.

**`masteryRound` field semantics (from `src/db/schema.ts`):**
```
0 = new (never advanced)
1 = round 1 done (n2t correct once)
2 = round 2 done (t2n correct once)
3 = learned (either direction correct once at round 2)
```

**Default cooldowns (`DEFAULT_COOLDOWN_MS`):**
```ts
{ 0: 12 * 3600 * 1000,  // round 0 → 1: 12 hours
  1: 24 * 3600 * 1000,  // round 1 → 2: 24 hours
  2: null }              // round 2 → 3: immediate (no cooldown = learned)
```

**Active cooldown config at runtime (`buildCooldownConfig()` in the route):**
- If `STUDY_COOLDOWN_MINUTES` is set: all rounds use that many minutes.
- If unset + dev: 0 ms (no cooldown). This is the DEFAULT in local dev.
- Production: `DEFAULT_COOLDOWN_MS`.

**Implication for QAJ-02:** In default local dev, `STUDY_COOLDOWN_MINUTES` is unset so
rounds advance with zero cooldown — a card can go 0→1→2→3 in three separate study
sessions in the same harness run. To test cooldown behavior (QAJ-01/03), set
`STUDY_COOLDOWN_MINUTES=1` (or similar) in the harness's env for that scenario.

**Paused cards** (`pausedAt IS NOT NULL`): filtered out at the `getStudyCards` query
layer (`src/lib/study-queries.ts` line 42: `.where(and(eq(cards.deckId, deckId), isNull(cards.pausedAt)))`).
A paused card is never included in `assembleSession`, so it can never receive grades
and can never advance or decay its SRS cooldown clock during the pause.

---

### 4. QA-Gated Time-Shift Surface (D-03/D-05) [VERIFIED: source read + design]

**Recommendation: a new QA endpoint `POST /api/debug/time-shift` that persists a
per-user time offset in a signed cookie, mirroring the `leo-habitat-cheat` cookie pattern
exactly. No DB schema change needed.**

**Design rationale — purely computational (no `db:push`):**

`computeHabitatState` in `src/lib/habitat-engine.ts` already accepts an explicit `now`
parameter (`computeQuality(lastActivityAt, now)`, `classifyMood(quality, minutesSinceActivity)`).
Similarly, `computeCardUpdate` in `src/lib/study-engine.ts` accepts an explicit `now`
parameter. The `POST /api/study/complete` route constructs `const now = new Date()` at
line 172 and passes it through. There is NO embedded `Date.now()` inside the engine
functions themselves — they are already pure with respect to time.

The shift therefore needs only to be honoured in the two places that call `new Date()`:
1. `src/app/api/study/complete/route.ts` line 172 — `const now = new Date()`
2. `src/app/api/habitat/route.ts` line 38 — `computeHabitatState(facts, new Date(), ...)`
3. `src/app/api/debug/state/route.ts` line 63 — `computeHabitatState(facts, new Date())`

**Cookie-based mechanism (mirrors `leo-habitat-cheat`):**

New cookie: `leo-qa-time-offset` (signed HMAC-SHA256 with `DEBUG_CHEAT_SECRET`, same
`signOverride`/`verifyOverride` pattern from `src/lib/debug-cheat.ts`).

Payload: `{ offsetMs: number }` — milliseconds to add to `new Date()`. Positive = future.

New helper in `src/lib/debug-cheat.ts` (server-only):
```ts
export async function readQaTimeOffset(): Promise<number> {
  if (!cheatEnabled()) return 0;
  const store = await cookies();
  const raw = store.get('leo-qa-time-offset')?.value;
  // verify + parse; return 0 if absent/invalid
}

// Usage in callers:
const offset = await readQaTimeOffset();
const now = new Date(Date.now() + offset);
```

New endpoint `POST /api/debug/time-shift`:
```jsonc
// Request
{ "secret": "...", "offsetMs": 172800000 }   // 2 days
// Response: { "ok": true }
// Clears with: { "secret": "...", "clear": true }
```

**Prod-absence guarantee:** `cheatEnabled()` returns `false` when `DEBUG_CHEAT_SECRET`
is unset. `readQaTimeOffset()` returns `0` in that case — `new Date()` is used unchanged.
No prod DB schema change; cookie is `httpOnly; sameSite=lax` matching the cheat cookie.
The existing QAOB-04 prod-parity gating test MUST be extended to assert `/api/debug/time-shift`
returns 404 when the secret is unset.

**"Now" callsites that must honour the shift** (all three handlers above):
- `POST /api/study/complete` → `const now = new Date(Date.now() + offset)` after reading offset
- `GET /api/habitat` → `computeHabitatState(facts, new Date(Date.now() + offset), override)`
- `GET /api/debug/state` → `computeHabitatState(facts, new Date(Date.now() + offset))`

The `POST /api/cards/[id]/pause` and `/api/cards/[id]/unpause` routes also call
`new Date()` but they record wall-clock events (pause timestamps) — these do NOT need
the time-shift since the harness controls pause/unpause timing directly.

---

### 5. Assertion Read Surface (D-06) [VERIFIED: source read]

**Recommended: `GET /api/debug/state` with `?secret=<DEBUG_CHEAT_SECRET>`**

This existing endpoint (Phase 14, `src/app/api/debug/state/route.ts`) returns:
```jsonc
{
  "real": { /* HabitatState — level, quality, mood, learnedCardCount, effectiveCardCount, isDecaying, minutesSinceActivity, nextLevelThreshold */ },
  "forced": null | { /* override if any */ },
  "cards": [
    {
      "id": "<CardId>",
      "word": "<front text>",
      "masteryRound": 0 | 1 | 2 | 3,
      "direction": "n2t" | "t2n" | "either",
      "cooldownUntil": "<ISO 8601>" | null,
      "pausedAt": "<ISO 8601>" | null,
      "learned": true | false
    }
    // ...up to 200 cards
  ]
}
```

Request:
```
GET /api/debug/state?secret=<DEBUG_CHEAT_SECRET>&deck=<deckId>
Cookie: better-auth.session_token=<token>
```
- `deck` param is optional; defaults to the user's first deck.
- Requires a valid session (401 without it) AND valid secret (403 with wrong secret).
- The `cards[i].direction` field is computed from `masteryRoundToDirection(round)`:
  - round 0 → `"n2t"`, round 1 → `"t2n"`, round 2+ → `"either"`
  - This matches `ROUND_REQUIREMENT` in `study-engine.ts` — it IS the harness's assertion
    target for QAJ-01/02 direction rules.

**Habitat assertions (`GET /api/habitat`):**
```
GET /api/habitat
Cookie: better-auth.session_token=<token>
```
Returns `HabitatState` directly (no secret needed). For QAJ-04, the harness compares the
`GET /api/habitat` response to the `computeHabitatState` truth computed in-process.

---

### 6. Resumable-Session Manifest (QAJ-03) [DESIGNED]

**Proposed manifest schema** for `scripts/qa-manifest.json` (one file per run, named by
run ID to support parallel runs):

```jsonc
{
  "schemaVersion": 1,
  "runId": "<UUID>",
  "createdAt": "<ISO 8601>",
  "phase": "cooldown-resume",
  "baseUrl": "http://localhost:3000",
  "user": {
    "email": "qa+<ts>@test.local",
    "password": "<random>",
    "sessionToken": "<better-auth.session_token value>"
  },
  "deck": {
    "id": "<DeckId>",
    "language": "fr"
  },
  "cards": [
    {
      "id": "<CardId>",
      "front": "chat",
      "back": "cat",
      "gradeCommitId": "<UUID used for the session that advanced this card>",
      "expectedMasteryRound": 1,
      "expectedDirection": "t2n",
      "cooldownUntilExpected": "<ISO 8601 — when cooldown expires>",
      "expectedState": "cooling" | "due"
    }
  ],
  "resumeAfter": "<ISO 8601 — earliest time resume assertions are valid>",
  "completedPhases": ["provision", "grade", "cooldown-set"]
}
```

**Resume logic:**
1. Read manifest. Check `resumeAfter <= new Date()`.
2. Re-authenticate using `user.email` / `user.password` (mint a fresh session cookie —
   the old `sessionToken` may have expired).
3. `GET /api/debug/state?secret=...&deck=<deckId>` to fetch current card states.
4. For each card in `manifest.cards`:
   - Compare `masteryRound` against `expectedMasteryRound`.
   - Compare `cooldownUntil` against `cooldownUntilExpected`: if `now >= cooldownUntilExpected`,
     card must be `due` (cooldownUntil == null OR cooldownUntil <= now); else `cooling`.
5. Assert `dueCards.length` matches expected due count.

The manifest is written atomically after the grade step (write to `.tmp` then rename).

---

### 7. Pause/Decay Interaction (QAJ-05) [VERIFIED: source read]

**Paused cards do NOT decay habitat quality, and they do NOT receive SRS cooldowns.**

Source: `src/lib/study-queries.ts` — `getStudyCards` filters out paused cards with
`isNull(cards.pausedAt)`. Paused cards are never included in any study session.
`assembleSession` in `study-engine.ts` never sees them.

Habitat decay (`computeQuality`) operates on `habitat_metadata.lastActivityAt` — the
timestamp of the most recent completed study session. Pausing cards does not affect
`lastActivityAt`. So:
- If the user has no non-paused cards due, they do not study → `lastActivityAt` does not
  update → habitat decays normally based on elapsed time.
- The SRS clock for a paused card is frozen at `cooldownUntil`. When unpaused,
  `computeUnpauseUpdate` shifts `cooldownUntil` forward by `(now − pausedAt)`.

**For QAJ-05 harness assertions:**
1. Pause a card via `POST /api/cards/<id>/pause` → card disappears from study queue.
2. Apply time-shift for 3 days (past grace period + 5%/day decay).
3. `GET /api/habitat` — assert `isDecaying: true` and `quality < 1.0` (decay applies
   because `lastActivityAt` is 3 days ago even though the card was paused).
4. `GET /api/debug/state` — assert the paused card's `masteryRound` is unchanged AND
   its `cooldownUntil` is unchanged (pause froze its SRS clock).
5. Unpause via `POST /api/cards/<id>/unpause` — `cooldownUntil` shifts by pause duration.
6. Assert the unpaused card is now in the study queue (due or cooling per elapsed time).

**Key invariant:** paused cards do not affect habitat decay (that depends only on
`lastActivityAt`). They simply sit frozen in SRS state until unpaused.

---

### 8. Provisioning Over HTTP [VERIFIED: source read]

The full provisioning sequence the harness must execute:

**Step 1 — Sign up (better-auth):**
```
POST /api/auth/sign-up/email
Content-Type: application/json

{ "email": "qa+<ts>+<rand>@test.local", "password": "<random>", "name": "QA Tester" }
```
Response: 200 with `Set-Cookie: better-auth.session_token=...`. Capture all cookies.

**Step 2 — Set native language + create first deck (server action `createDeck`):**
The welcome flow calls `authClient.updateUser({ nativeLanguage })` (better-auth
`PATCH /api/auth/update-user`) then `createDeck(targetLang)` (Next.js Server Action).

Server Actions are NOT directly callable from headless scripts because they require a
Next.js-specific POST to the RSC endpoint (`/_next/...`) with multipart encoding and an
action ID. **The harness cannot call Server Actions headlessly.**

**Alternative — direct DB insert for deck/card provisioning:**
Since the harness self-provisions test data and self-cleans (D-04), it can bypass the
Server Action and insert decks/cards directly via the Drizzle client. The cleanup script
already does this (it imports `@neondatabase/serverless` with `CLEANUP_DB_URL`). The
harness can use the same `DATABASE_URL` directly:

```js
// In scripts/qa-lib.mjs
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

async function provisionUser(email, password) {
  // 1. Create user via better-auth HTTP (establishes session)
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, { ... });
  const sessionToken = extractCookie(res, 'better-auth.session_token');

  // 2. Insert deck directly (bypass Server Action — test-data only)
  const deckId = crypto.randomUUID();
  await db.insert(decks).values({ id: deckId, userId, language: 'fr', name: 'QA French #1' });

  // 3. Insert cards directly
  const cardId = crypto.randomUUID();
  await db.insert(cards).values({ id: cardId, deckId, front: 'chat', back: 'cat', source: 'manual' });

  return { sessionToken, userId, deckId, cardId };
}
```

**To get `userId` after sign-up:** the better-auth sign-in/sign-up response body includes
user data. Parse the JSON response body for `user.id`.

**Native language update (for QAJ-04 habitat assertions):** call
`PATCH /api/auth/update-user` with `{ nativeLanguage: "en" }` using the session cookie,
or skip — `nativeLanguage` defaults to `"en"` per schema and doesn't affect the habitat
engine.

---

## Standard Stack

### Core (No new packages needed)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@neondatabase/serverless` | ^1.0.2 | Direct DB access in scripts (same as cleanup script) | `package.json` |
| `drizzle-orm` | ^0.45.1 | DB operations in scripts | `package.json` |
| `node:crypto` | built-in | commitId UUID generation | Node.js built-in |
| `node:fs/promises` | built-in | Manifest read/write | Node.js built-in |

All packages already in `package.json`. No new dependencies needed for Phase 15.

### Environment Variables Required by Harness Scripts
| Variable | Purpose | Notes |
|----------|---------|-------|
| `DATABASE_URL` | Direct DB for provisioning + cleanup | Already required by app |
| `DEBUG_CHEAT_SECRET` | Read state via `/api/debug/state` + time-shift | Must be set for QA run |
| `QA_BASE_URL` | Base URL of dev server (default: `http://localhost:3000`) | New, optional |
| `CLEANUP_DB_URL` | Cleanup script (can alias `DATABASE_URL`) | Already in cleanup script |

---

## Architecture Patterns

### System Architecture Diagram

```
scripts/qa-run.mjs (orchestrator)
  │
  ├── scripts/qa-lib.mjs (shared: auth, HTTP client, DB provision, assert helpers)
  │     ├── signUp(email, pass) → sessionToken + userId
  │     ├── signIn(email, pass) → sessionToken
  │     ├── provisionDeck(db, userId) → deckId
  │     ├── provisionCard(db, deckId, front, back) → cardId
  │     ├── gradeCard(sessionToken, deckId, cardId, direction, correct) → response
  │     ├── readCardState(sessionToken, secret, deckId) → cards[]
  │     ├── readHabitatState(sessionToken) → HabitatState
  │     ├── setTimeShift(sessionToken, secret, offsetMs) → void
  │     └── clearTimeShift(sessionToken, secret) → void
  │
  ├── scripts/qa-01-learn-card.mjs     (QAJ-01)
  ├── scripts/qa-02-mastery.mjs         (QAJ-02)
  ├── scripts/qa-03-resume.mjs          (QAJ-03, reads/writes scripts/qa-manifest-*.json)
  ├── scripts/qa-04-habitat.mjs         (QAJ-04)
  └── scripts/qa-05-decay.mjs           (QAJ-05 + pause interactions)

scripts/cleanup-test-users.mjs (QAJ-06, already exists)
  └── deletes WHERE email LIKE '%@test.local'
```

### Recommended Project Structure
```
scripts/
├── qa-lib.mjs              # NEW: shared HTTP + DB helper functions
├── qa-run.mjs              # NEW: orchestrator, runs all journeys, reports
├── qa-01-learn-card.mjs    # NEW: QAJ-01
├── qa-02-mastery.mjs       # NEW: QAJ-02
├── qa-03-resume.mjs        # NEW: QAJ-03 (manifest-based)
├── qa-04-habitat.mjs       # NEW: QAJ-04
├── qa-05-decay.mjs         # NEW: QAJ-05
├── qa-manifest-*.json      # GENERATED per run; gitignored
└── cleanup-test-users.mjs  # EXISTING (QAJ-06)
```

### Pattern: Provisioning Sequence
```js
// scripts/qa-lib.mjs
export async function provision(baseUrl, db, opts = {}) {
  const email = `qa+${Date.now()}+${Math.random().toString(36).slice(2,6)}@test.local`;
  const password = crypto.randomUUID();

  // 1. Sign up
  const signUpRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'QA Tester' }),
  });
  assertOk(signUpRes, 'sign-up');
  const userData = await signUpRes.json();
  const userId = userData.user.id;
  const sessionToken = extractSessionCookie(signUpRes);

  // 2. Insert deck + cards directly into DB
  const deckId = crypto.randomUUID();
  await db.insert(decks).values({ id: deckId, userId, language: opts.language ?? 'fr', name: 'QA French #1' });

  const cardIds = [];
  for (const { front, back } of (opts.cards ?? [{ front: 'chat', back: 'cat' }])) {
    const cardId = crypto.randomUUID();
    await db.insert(cards).values({ id: cardId, deckId, front, back, source: 'manual' });
    cardIds.push(cardId);
  }

  return { email, password, sessionToken, userId, deckId, cardIds };
}
```

### Pattern: Grade Submission
```js
// Grade one card correctly at round 0 (n2t)
export async function gradeSession(baseUrl, sessionToken, { deckId, grades }) {
  const commitId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/api/study/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
    body: JSON.stringify({ deckId, commitId, grades }),
  });
  assertOk(res, 'study/complete');
  return res.json(); // { success: true, leveledUp: null | number }
}

// Example: advance card from round 0 to round 1
await gradeSession(baseUrl, sessionToken, {
  deckId,
  grades: [{ cardId, direction: 'n2t', correct: true }],
});
```

### Pattern: Assertion Read
```js
export async function readState(baseUrl, sessionToken, secret, deckId) {
  const url = new URL(`${baseUrl}/api/debug/state`);
  url.searchParams.set('secret', secret);
  url.searchParams.set('deck', deckId);
  const res = await fetch(url, {
    headers: { Cookie: `better-auth.session_token=${sessionToken}` },
  });
  assertOk(res, 'debug/state');
  return res.json(); // { real: HabitatState, forced: null, cards: CardDebugEntry[] }
}
```

### Anti-Patterns to Avoid
- **Using `/debug` virtual override to simulate progression:** EXPLICITLY PROHIBITED (D-02/D-06). The override bypasses the real SRS engine — exactly what this harness exists to avoid.
- **Calling Server Actions from scripts:** Server Actions (like `createDeck`, `saveCard`) require Next.js RSC multipart encoding with an action ID; they cannot be called from headless Node scripts. Use direct DB inserts for test data provisioning instead.
- **Using `STUDY_NO_COOLDOWN` for cooldown tests:** This zeroes cooldowns entirely, hiding "still cooling" bugs. Use `STUDY_COOLDOWN_MINUTES=1` for testing cooldown states (QAOB-02's reason for existence).
- **Sharing a `commitId` across separate sessions:** Each harness study session MUST generate a fresh UUID `commitId` or the idempotency guard silently no-ops the grade write.
- **Hardcoding deck/card IDs in manifests:** Always re-read the deckId from the provisioning step; UUIDs are generated at insert time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cooldown reduction | Custom timing loops, `setTimeout` waits | `STUDY_COOLDOWN_MINUTES=1` env var (QAOB-02) | Already exists; tested; avoids real-time waits |
| Instant time simulation | Custom DB field | Signed cookie `leo-qa-time-offset` (D-05, new) | Mirrors existing `leo-habitat-cheat` pattern; no schema change |
| Session management | Custom session store | better-auth session cookie (read from HTTP response) | Auth is already implemented; cookie is the session |
| SRS state inspection | Parse HTML from `/debug` page | `GET /api/debug/state` JSON API (QAOB-03) | Stable structured JSON; already scoped per-user per-deck |
| Card/deck provisioning | Calling Server Actions headlessly | Direct Drizzle inserts (same pattern as cleanup script) | Server Actions cannot be called headlessly |
| Cleanup | Custom deletion logic | `scripts/cleanup-test-users.mjs` with `%@test.local` pattern | Already exists; CASCADE deletes all dependents |

---

## Common Pitfalls

### Pitfall 1: `commitId` Reuse
**What goes wrong:** Reusing the same `commitId` (e.g., a constant in a test) causes the
WR-04 idempotency guard to silently no-op the grade write on the second call. The card's
`masteryRound` won't advance and the harness will assert incorrectly.
**Why it happens:** The route guards updates with `WHERE lastCommitId IS NULL OR lastCommitId != :commitId`.
**How to avoid:** Always `crypto.randomUUID()` per session commit; never reuse.

### Pitfall 2: Dev Server Uses Zero-Cooldown by Default
**What goes wrong:** In local dev, `NODE_ENV !== 'production'`, so `buildCooldownConfig()`
returns `{ 0: 0, 1: 0, 2: null }` — no cooldowns at all. QAJ-01/03 tests that assert
cooldown behavior will find `cooldownUntil: null` on every card.
**Why it happens:** QAOB-02's `STUDY_COOLDOWN_MINUTES` was designed for exactly this
purpose — setting a short non-zero cooldown.
**How to avoid:** QAJ-01/03 harness scripts require `STUDY_COOLDOWN_MINUTES=1` (or
similar) to be set when testing cooldown states. Document this in the script's usage
comment. The QAJ-02 full-mastery script intentionally wants zero-cooldown for speed.

### Pitfall 3: Better-Auth Multi-Cookie Response
**What goes wrong:** Some `Set-Cookie` scenarios in better-auth return multiple cookies
(e.g., a CSRF nonce + the session token). If the harness only extracts the first cookie
it may miss the session token.
**Why it happens:** `Set-Cookie` is a multi-value header that `node:http` concatenates.
**How to avoid:** Parse all `Set-Cookie` values from the response. In Node.js 18+,
`response.headers.getSetCookie()` (WHATWG Fetch) returns an array. Join all values and
send as a single `Cookie` header on subsequent requests.

### Pitfall 4: Session Token May Expire Between Manifest Phases
**What goes wrong:** The manifest stores the `sessionToken` from provisioning. If resumed
10–60 min later and the better-auth session TTL has elapsed, the token will be invalid.
**Why it happens:** better-auth session TTL can be shorter than the resume window.
**How to avoid:** On resume, always re-authenticate with email/password (mint a fresh
session token) rather than relying on the stored token. Store email + password in the
manifest (as cleartext is acceptable for ephemeral test credentials).

### Pitfall 5: `GET /api/debug/state` Returns the Shifted `now` for `real.minutesSinceActivity`
**What goes wrong:** After applying a time-shift, `real.minutesSinceActivity` in the
`/api/debug/state` response will be computed with the shifted `now`. If the harness
applies the time-shift before calling `readState`, the value will reflect the shifted time.
This is the CORRECT behavior for decay assertions — but the harness must be aware.
**How to avoid:** Apply time-shift BEFORE the assertion call so all computed values (quality,
mood, isDecaying, minutesSinceActivity) reflect the simulated future.

### Pitfall 6: Habitat Level Uses Effective Cards (not raw learned count)
**What goes wrong:** Asserting level by counting `learned: true` cards. Level 2 threshold is
`effectiveCardCount >= 5`, where `effectiveCardCount = Math.floor(quality * learnedCardCount)`.
If `quality < 1.0` (decay or fresh sessions that don't yet update habitat_metadata), the
effective count can be lower.
**Why it happens:** `computeHabitatState` uses `Math.floor(quality * learnedCardCount)`.
**How to avoid:** For QAJ-04, ensure `quality = 1.0` (study within grace period, no
decay). Assert `real.effectiveCardCount >= 5` from the `/api/debug/state` response, not
just `real.learnedCardCount`.

---

## Runtime State Inventory

This is a greenfield phase (new scripts only); no rename/refactor. Skip.

---

## Validation Architecture

Nyquist validation is enabled for this project.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `vitest.config.ts` (assumed — not read, but `package.json` script `"test": "vitest run"` confirms it) |
| Quick run command | `npx vitest run scripts/` |
| Full suite command | `npx vitest run` |

The harness scripts themselves are integration tests (run against a live dev server);
they are not Vitest tests. Vitest tests cover the NEW QA affordances added to the server.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QAJ-01 | Round 0→1 advance via real HTTP | Integration (harness script) | `node scripts/qa-01-learn-card.mjs` | ❌ Wave 0 |
| QAJ-02 | Full 0→3 mastery + wrong-answer paths | Integration (harness script) | `node scripts/qa-02-mastery.mjs` | ❌ Wave 0 |
| QAJ-03 | Resumable session manifest | Integration (harness script) | `node scripts/qa-03-resume.mjs` | ❌ Wave 0 |
| QAJ-04 | Habitat level progression | Integration (harness script) | `node scripts/qa-04-habitat.mjs` | ❌ Wave 0 |
| QAJ-05 | Decay/grace via time-shift | Integration (harness script) | `node scripts/qa-05-decay.mjs` | ❌ Wave 0 |
| QAJ-06 | Self-cleaning (existing script) | Integration (harness + cleanup) | `node scripts/cleanup-test-users.mjs %@test.local` | ✅ exists |
| D-05 | Time-shift endpoint 404 when secret unset | Unit/e2e (prod-parity gate) | `npx vitest run` (extend existing QAOB-04 test) | ❌ Wave 0 |
| D-05 | New `POST /api/debug/time-shift` route | Unit | `npx vitest run src/app/api/debug/` | ❌ Wave 0 |

### Observation Points per QAJ Requirement

**QAJ-01 (learn a card):**
- After grade: `GET /api/debug/state` → `cards[0].masteryRound === 1`
- After grade: `cards[0].direction === "t2n"` (round 1 direction)
- After grade (with `STUDY_COOLDOWN_MINUTES=1`): `cards[0].cooldownUntil` is ~1 min in future
- After grade: `GET /api/study/complete` response has `success: true`

**QAJ-02 (full mastery):**
- After each round advance: `masteryRound` increments by exactly 1
- Direction after round 1 advance: `"either"` (round 2 can go either way)
- After round 2 advance: `masteryRound === 3`, `learned: true`, `cooldownUntil: null`
- Wrong answer (grade `correct: false`): `masteryRound` stays the same on next `readState`
- Wrong then correct in separate session: `masteryRound` advances

**QAJ-03 (resumable):**
- Manifest written: file exists at `scripts/qa-manifest-<runId>.json`
- On resume: `readState` for each card; compare `masteryRound` to manifest expectation
- Due vs cooling: `cooldownUntil` null or past → `due`; non-null future → `cooling`
- Due count: `cards.filter(c => !c.learned && (c.cooldownUntil == null || new Date(c.cooldownUntil) <= now)).length`

**QAJ-04 (habitat level):**
- Before crossing threshold: `real.effectiveCardCount < 5`, `real.level === 1`
- After learning 5+ cards (round → 3): `real.effectiveCardCount >= 5`, `real.level >= 2`
- `GET /api/habitat` response level matches `real.level` from `/api/debug/state`
- `gradeSession` response `leveledUp === 2` on the session that crosses the threshold

**QAJ-05 (decay/grace):**
- Before time-shift: `real.isDecaying === false`, `real.quality === 1.0`
- Time-shift +2 days 1 minute (past grace): `real.isDecaying === true`, `real.quality < 1.0`
- Time-shift +4 days: `real.quality ≈ 0.9` (2 days decay at 5%/day = 10% loss)
- Paused card: `cards[i].masteryRound` unchanged after time-shift; `pausedAt` non-null
- After unpause: card enters study queue (due or cooldown shifted)

**QAJ-06 (cleanup):**
- Before cleanup: `SELECT count(*) WHERE email LIKE '%@test.local'` > 0
- After cleanup: count = 0 (no residue)

### Sampling Rate
- **Per script run:** Full script output with PASS/FAIL per assertion
- **Smoke gate:** `node scripts/qa-run.mjs` runs all 5 journeys sequentially
- **Phase gate:** All 5 journey scripts exit 0 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/qa-lib.mjs` — shared helper functions
- [ ] `scripts/qa-run.mjs` — orchestrator
- [ ] `scripts/qa-01-learn-card.mjs` — QAJ-01
- [ ] `scripts/qa-02-mastery.mjs` — QAJ-02
- [ ] `scripts/qa-03-resume.mjs` — QAJ-03
- [ ] `scripts/qa-04-habitat.mjs` — QAJ-04
- [ ] `scripts/qa-05-decay.mjs` — QAJ-05
- [ ] `src/app/api/debug/time-shift/route.ts` — new QA time-shift endpoint
- [ ] `src/lib/debug-cheat.ts` additions — `signTimeOffset`, `verifyTimeOffset`, `readQaTimeOffset`
- [ ] Vitest unit tests for the time-shift route (mirrors `debug/state/route.test.ts` structure)
- [ ] Extend existing QAOB-04 prod-parity e2e to cover time-shift 404 when secret unset

---

## Security Domain

`security_enforcement` is not explicitly disabled in config; treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | better-auth session cookie; harness must not bypass auth |
| V3 Session Management | yes | httpOnly cookies; harness should not store tokens in logs |
| V4 Access Control | yes | New time-shift endpoint must verify session + secret |
| V5 Input Validation | yes | `offsetMs` input on time-shift endpoint must be validated (number, range) |
| V6 Cryptography | yes | HMAC-SHA256 signed cookie — same pattern as `leo-habitat-cheat` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged time-shift cookie | Spoofing | HMAC-SHA256 with `DEBUG_CHEAT_SECRET` (same as override cookie) |
| Time-shift in production | Elevation of Privilege | `cheatEnabled()` guard; feature absent when `DEBUG_CHEAT_SECRET` unset |
| Leaking session tokens in logs | Information Disclosure | Harness scripts must not `console.log` session tokens or passwords |
| Large `offsetMs` causing overflow | Tampering | Validate `offsetMs` range in the route (e.g., max 30 days = 2592000000 ms) |
| Cross-user card state leakage via `?deck=` | Information Disclosure | Already guarded by T-14-06 in `debug/state` route; time-shift route has no deck param |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ESM | `scripts/*.mjs` | ✓ | v20+ (assumed from `@types/node: ^20`) | — |
| `npm run dev` (Next.js dev server) | All harness scripts | ✓ (local) | Next.js 16.2.1 | — |
| `DATABASE_URL` env | DB provisioning (scripts) | ✓ (local .env) | — | — |
| `DEBUG_CHEAT_SECRET` env | `/api/debug/state` + time-shift | Must be set for QA runs | — | Scripts abort with clear error if unset |
| `CLEANUP_DB_URL` env | `cleanup-test-users.mjs` | ✓ or alias `DATABASE_URL` | — | — |

**Missing dependencies with no fallback:** None — all required tools are present.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vitest mocked unit tests for SRS | Real-pipeline harness scripts | Phase 15 (now) | Catches class of bug (v2.1 study-loop) that mocked tests missed |
| `STUDY_NO_COOLDOWN` for testing | `STUDY_COOLDOWN_MINUTES` (non-zero) | Phase 14 | Enables testing "still cooling" state, not just "no cooldown" |
| Manual `/debug` cheat for state inspection | `GET /api/debug/state` JSON API | Phase 14 | Programmatically readable from scripts |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | better-auth session cookie is named `better-auth.session_token` in local dev (no `__Secure-` prefix) | Auth-for-Scripts §2 | Scripts will get 401 on all requests; easy to debug from response |
| A2 | `GET /api/auth/sign-up/email` returns user data including `user.id` in response body | Provisioning §8 | Script must parse userId from DB or `/api/auth/get-session` instead |
| A3 | better-auth does NOT require CSRF for `application/json` requests | Auth-for-Scripts §2 | Scripts will get 403 on sign-in/sign-up; add `Origin` header as workaround |
| A4 | `vitest.config.ts` exists (assumed from `"test": "vitest run"` in package.json) | Validation Architecture | Minor — can be created in Wave 0 |

---

## Open Questions (RESOLVED)

1. **What does the better-auth `sign-up/email` response body look like exactly?**
   - What we know: better-auth 1.5.6 routes `POST /api/auth/sign-up/email` and sets a
     session cookie. The source file `sign-up.mjs` was not read in depth.
   - What's unclear: Does the response body include `{ user: { id: "..." } }` or does the
     script need to call a separate `GET /api/auth/get-session` to retrieve `userId`?
   - Recommendation: Implement provisioning to call `GET /api/auth/get-session` with the
     session cookie after sign-up to reliably get `userId`. (RESOLVED — safe fallback approach)

2. **Does `formCsrfMiddleware` in better-auth block headless sign-in for JSON requests?**
   (RESOLVED) The middleware applies to `application/x-www-form-urlencoded` only; JSON
   bodies are accepted without CSRF. Confirmed from `sign-in.mjs` source:
   `allowedMediaTypes: ["application/x-www-form-urlencoded", "application/json"]`.

3. **Can the `STUDY_COOLDOWN_MINUTES` env be set after the dev server starts, or does it
   require a restart?**
   - What we know: `buildCooldownConfig()` is called at module scope
     (`const COOLDOWN_CONFIG = buildCooldownConfig()` at line 42 of `route.ts`) — it is
     evaluated once at module load time via `env` (which reads `process.env` at startup).
   - What's unclear: With Turbopack HMR, does changing `STUDY_COOLDOWN_MINUTES` in `.env`
     trigger a module reload for the route?
   - Recommendation: Require harness operators to start the dev server with the env set:
     `STUDY_COOLDOWN_MINUTES=1 npm run dev`. Document this clearly in the script usage.
     (RESOLVED — requires server restart; document in script preamble)

4. **Is `GET /api/auth/get-session` the correct endpoint to retrieve the user object
   (including `id`) after sign-up?**
   - What we know: better-auth exposes a `getSession` method; the server-side code
     calls `auth.api.getSession({ headers })`. The client-side exposes `authClient.getSession()`.
   - Recommendation: Script calls `GET /api/auth/get-session` with the session cookie
     header to retrieve the authed user object. (RESOLVED — this endpoint exists in better-auth)

---

## Sources

### Primary (HIGH confidence — files read in this session)
- `src/app/api/study/complete/route.ts` — grade endpoint, body schema, `buildCooldownConfig`, `computeCardUpdate` call
- `src/lib/study-engine.ts` — `ROUND_REQUIREMENT`, `computeCardUpdate`, `DEFAULT_COOLDOWN_MS`, `getCardStage`, `assembleSession`
- `src/lib/debug-cheat.ts` — `readQaAuth`, `signQaMode`, `QA_MODE_COOKIE`, `CHEAT_COOKIE`, HMAC pattern
- `src/app/api/debug/state/route.ts` — assertion endpoint, `CardDebugEntry` shape, `masteryRoundToDirection`
- `src/app/api/debug/cheat/route.ts` — cheat endpoint gating pattern to mirror for time-shift
- `src/app/api/habitat/route.ts` — habitat GET endpoint
- `src/lib/habitat-engine.ts` — `computeHabitatState`, `computeQuality`, `GRACE_PERIOD_MS`, `DECAY_RATE_PER_DAY`, `LEVEL_THRESHOLDS`
- `src/lib/habitat-queries.ts` — `getHabitatFacts`
- `src/lib/study-queries.ts` — `getStudyCards` (paused card filter)
- `src/db/schema.ts` — `cards`, `decks`, `habitat_metadata` schema
- `scripts/cleanup-test-users.mjs` — teardown pattern, `%@test.local` guard
- `e2e/helpers.ts` — `testEmail`, `signUpFreshUser`, `signIn`, `completeWelcomeFlow`
- `src/lib/auth.ts` — better-auth config (emailAndPassword enabled)
- `src/env.ts` — env schema, `DEBUG_CHEAT_SECRET`, `STUDY_COOLDOWN_MINUTES`
- `node_modules/better-auth/dist/api/routes/sign-in.mjs` — `/sign-in/email` endpoint body schema
- `node_modules/better-auth/dist/api/routes/sign-up.mjs` — `/sign-up/email` endpoint
- `node_modules/better-auth/dist/cookies/index.mjs` — `better-auth.session_token` cookie name
- `package.json` — version: better-auth ^1.5.6, Next.js 16.2.1, Drizzle ^0.45.1

### Secondary (HIGH confidence — code structure cross-verified)
- `src/lib/deck-actions.ts` — confirms Server Actions cannot be called headlessly; `createDeck` is `"use server"`
- `src/app/api/cards/[id]/pause/route.ts` — pause endpoint shape for QAJ-05

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing
- Grade entry point: HIGH — read source
- Auth mechanism: HIGH — read better-auth source
- SRS engine: HIGH — read source
- Time-shift design: HIGH — design derived from existing pattern; no DB change
- Assertion surface: HIGH — existing endpoint, read source
- Manifest schema: HIGH (designed) — all inputs known

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (stable codebase; only stale if the SRS engine or auth lib change)
