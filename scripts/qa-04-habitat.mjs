#!/usr/bin/env node
// scripts/qa-04-habitat.mjs — Phase 15 Plan 03: QAJ-04
//
// Journey: habitat level progression — cross L1→2 (effectiveCardCount>=5) and
// a representative higher transition (L2→3, effectiveCardCount>=15).
//
// This script performs NO time-shift, so quality stays 1.0 (sessions are within
// the 2-day grace period) → effectiveCardCount == learnedCardCount exactly. It
// works under either cooldown regime (POST /api/study/complete never gates a
// grade submission on cooldownUntil — cooldown is output data for the client's
// due-queue selection, not a server-side write guard), so it is safe to run
// against the single STUDY_COOLDOWN_MINUTES=1 server boot qa-run.mjs uses for
// all five journeys, or a standalone zero-cooldown boot.
//
// LEVEL_THRESHOLDS (from src/lib/habitat-engine.ts):
//   [5, 15, 30, 50, 80, 120, 170, 230]
//   index 0 (5)  → level 2
//   index 1 (15) → level 3
//
// This script provisions 15 cards and learns them all via BATCHED round-advance
// commits (one POST per round covering every card still at that round), mirroring
// how the real app's study-session.tsx commits an entire session's graded cards
// in a single POST rather than one POST per card (see the commit() effect there).
//
// Rule-1 fix (found running this wave's D-10 qa:run gate — NOT a Phase 17
// regression; latent since Phase 15-03, never live-run until now per that
// plan's own guardrail note "Live DB run NOT executed"): the original
// implementation graded ONE card per POST, 3 POSTs per card × 15 cards = 45
// sequential requests to /api/study/complete for a single freshly-provisioned
// user, all completing in ~20s. /api/study/complete's studyCompleteLimiter
// (src/app/api/study/complete/route.ts, added Phase 07-03) allows 10
// requests/60s per user — the 45-request pattern deterministically 429s at
// request #11 regardless of any prior same-day harness runs (reproduced on a
// brand-new dev server process + a brand-new test user with zero rate-limiter
// history: HTTP 429 {"error":"Too many requests"} at card 4's second round).
// The fix batches multiple cards' SAME-round grades into a single commit
// (the API and study-engine.ts both already support this: computeCardUpdate
// advances each cardId independently within one request, capped at +1 round
// per card per request — see study-engine.ts's anti-inflation comment), which
// both fixes the false-failure AND is a more faithful emulation of real usage.
// This drops the journey to 5 total gradeSession calls (well under the limit):
//   1. round 0→1 for all 15 cards (batched)
//   2. round 1→2 for all 15 cards (batched)
//   3. round 2→3 for cards 1-4 (batched — pre-threshold, must NOT cross L1→L2)
//   4. round 2→3 for card 5 ALONE (isolated — captures the L1→L2 crossing leveledUp)
//   5. round 2→3 for cards 6-15 (batched — drives the L2→L3 crossing)
// Rounds 0→1 and 1→2 can be fully batched across all 15 cards regardless of the
// later per-card assertions because effectiveCardCount only moves on the round
// 2→3 (learned) transition (Math.floor(quality * learnedCardCount) — see
// habitat-engine.ts); only that final transition needs the split-batch treatment
// to preserve the existing crossing-assertion granularity.
//
// After the 5th learned card it asserts:
//   - real.effectiveCardCount >= 5
//   - real.level >= 2
//   - gradeSession leveledUp === 2 on the crossing commit
//   - GET /api/habitat level matches GET /api/debug/state real.level
// After the 15th learned card it asserts:
//   - real.level >= 3 (representative higher transition)
//   - level agreement between /api/habitat and /api/debug/state.real
//
// Prerequisites:
//   DATABASE_URL           — Neon Postgres connection string (provisioning)
//   DEBUG_CHEAT_SECRET     — Secret for /api/debug/state
//   npm run dev running (any cooldown regime — see note above)
//
// Optional:
//   QA_BASE_URL  — App origin (default: http://localhost:3000)
//
// Usage:
//   node scripts/qa-04-habitat.mjs
//
// Security notes (T-15-09, T-15-10):
//   - Session tokens and passwords are never logged.
//   - Provisioned user is @test.local — cleanup-test-users.mjs reaps it (QAJ-06).

import {
  assertEq,
  DEFAULT_BASE_URL,
  directionForRound,
  gradeSession,
  provision,
  readHabitat,
  readState,
} from "./qa-lib.mjs";

const BASE_URL = DEFAULT_BASE_URL;
const SECRET = process.env.DEBUG_CHEAT_SECRET;
if (!SECRET) {
  console.error("FATAL: set DEBUG_CHEAT_SECRET before running this script");
  process.exit(1);
}

// French word pairs for provisioning 15 cards
const CARD_PAIRS = [
  { front: "chat", back: "cat" },
  { front: "chien", back: "dog" },
  { front: "maison", back: "house" },
  { front: "voiture", back: "car" },
  { front: "livre", back: "book" },
  { front: "table", back: "table" },
  { front: "chaise", back: "chair" },
  { front: "eau", back: "water" },
  { front: "pain", back: "bread" },
  { front: "lune", back: "moon" },
  { front: "soleil", back: "sun" },
  { front: "arbre", back: "tree" },
  { front: "fleur", back: "flower" },
  { front: "oiseau", back: "bird" },
  { front: "poisson", back: "fish" },
];

/**
 * Submit ONE round-advance for a batch of cards in a SINGLE POST to
 * /api/study/complete (one grade entry per cardId), mirroring how the real
 * app's study-session.tsx commits an entire session's grades in one request.
 * Each cardId in the batch must currently be AT the round this direction
 * targets (round 0 → n2t, round 1 → t2n, round 2 → "either", submitted as
 * n2t per the existing directionForRound(2) convention — see qa-lib.mjs).
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} deckId
 * @param {string[]} cardIds — cards currently at the same round, advanced together
 * @param {"n2t"|"t2n"} direction
 * @returns {Promise<{ success: boolean, leveledUp: number | null }>}
 */
async function gradeRoundBatch(baseUrl, token, deckId, cardIds, direction) {
  const result = await gradeSession(baseUrl, token, {
    deckId,
    grades: cardIds.map((cardId) => ({ cardId, direction, correct: true })),
  });
  if (!result.success) {
    throw new Error(
      `batch grade (direction=${direction}) failed for ${cardIds.length} card(s)`,
    );
  }
  return result;
}

async function run() {
  // ── 1. Provision 15 cards ──────────────────────────────────────────────────
  const { email, sessionToken, deckId, cardIds } = await provision(BASE_URL, {
    cards: CARD_PAIRS,
  });
  console.log(
    `[QAJ-04] provisioned user ${email} deck ${deckId} with ${cardIds.length} cards`,
  );

  // ── 2. Assert baseline: level 1, effectiveCardCount 0 ─────────────────────
  const baseState = await readState(BASE_URL, sessionToken, SECRET, deckId);
  if (baseState.real.level !== 1) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: baseline level expected 1, got ${baseState.real.level}`,
    );
  }
  if (baseState.real.effectiveCardCount !== 0) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: baseline effectiveCardCount expected 0, got ${baseState.real.effectiveCardCount}`,
    );
  }
  console.log("[QAJ-04] baseline: level=1 effectiveCardCount=0 OK");

  // ── 3. Advance ALL 15 cards through rounds 0→1 and 1→2 (batched) ──────────
  // Safe to fully batch: effectiveCardCount only moves on the round 2→3
  // (learned) transition, so no assertion below depends on ordering here.
  await gradeRoundBatch(
    BASE_URL,
    sessionToken,
    deckId,
    cardIds,
    directionForRound(0), // "n2t"
  );
  console.log(`[QAJ-04] round 0→1 batched for all ${cardIds.length} cards`);

  await gradeRoundBatch(
    BASE_URL,
    sessionToken,
    deckId,
    cardIds,
    directionForRound(1), // "t2n"
  );
  console.log(`[QAJ-04] round 1→2 batched for all ${cardIds.length} cards`);

  // ── 4. Learn cards 1-4 (round 2→3, below L1→L2 threshold of 5) ────────────
  const preThresholdIds = cardIds.slice(0, 4);
  console.log(
    `[QAJ-04] Learning cards 1-4 (pre-threshold, batched round 2→3)...`,
  );
  const preThresholdResult = await gradeRoundBatch(
    BASE_URL,
    sessionToken,
    deckId,
    preThresholdIds,
    "n2t", // round 2 accepts either direction; n2t per directionForRound(2) convention
  );
  console.log(
    `[QAJ-04]   cards 1-4/15 learned (leveledUp=${preThresholdResult.leveledUp})`,
  );
  // This batch should not cross level 2 (only 4 learned so far)
  if (preThresholdResult.leveledUp === 2) {
    throw new Error(
      "[QAJ-04] ASSERT FAIL: unexpected level-up to 2 after cards 1-4 (expected only after card 5)",
    );
  }

  // Verify still at level 1 after 4 cards
  const preThreshState = await readState(
    BASE_URL,
    sessionToken,
    SECRET,
    deckId,
  );
  if (preThreshState.real.level !== 1) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: after 4 cards expected level=1, got ${preThreshState.real.level}`,
    );
  }
  if (preThreshState.real.effectiveCardCount < 4) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: after 4 cards expected effectiveCardCount>=4, got ${preThreshState.real.effectiveCardCount}`,
    );
  }
  console.log(
    `[QAJ-04] After 4 cards: level=1 effectiveCardCount=${preThreshState.real.effectiveCardCount} (still pre-threshold) OK`,
  );

  // ── 5. Learn card 5 — crossing L1→2 (effectiveCardCount>=5) ───────────────
  // Isolated (not batched) so this commit's leveledUp response is unambiguously
  // attributable to card 5 becoming the 5th learned card.
  console.log("[QAJ-04] Learning card 5 (crossing L1→L2 threshold)...");
  const card5Id = cardIds[4];
  const crossingResult = await gradeRoundBatch(
    BASE_URL,
    sessionToken,
    deckId,
    [card5Id],
    "n2t",
  );
  console.log(`[QAJ-04] card 5 leveledUp=${crossingResult.leveledUp}`);

  // Assert leveledUp === 2 on the crossing session
  assertEq(crossingResult.leveledUp, 2, "level-up to 2 on crossing session");
  console.log("[QAJ-04] gradeSession leveledUp===2 on L1→L2 crossing OK");

  // Assert /api/debug/state: effectiveCardCount>=5 and level>=2
  const postL2State = await readState(BASE_URL, sessionToken, SECRET, deckId);
  if (postL2State.real.effectiveCardCount < 5) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: after 5 learned cards expected effectiveCardCount>=5, got ${postL2State.real.effectiveCardCount}`,
    );
  }
  if (postL2State.real.level < 2) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: after crossing L1→L2 expected level>=2, got ${postL2State.real.level}`,
    );
  }
  console.log(
    `[QAJ-04] After card 5: effectiveCardCount=${postL2State.real.effectiveCardCount} level=${postL2State.real.level} OK`,
  );

  // Cross-check /api/habitat level agrees with /api/debug/state real.level
  const habitatL2 = await readHabitat(BASE_URL, sessionToken);
  assertEq(
    habitatL2.level,
    postL2State.real.level,
    "L1→L2: /api/habitat.level === /api/debug/state.real.level",
  );
  assertEq(
    habitatL2.effectiveCardCount,
    postL2State.real.effectiveCardCount,
    "L1→L2: /api/habitat.effectiveCardCount === /api/debug/state.real.effectiveCardCount",
  );
  console.log(
    `[QAJ-04] /api/habitat level=${habitatL2.level} agrees with /api/debug/state real.level=${postL2State.real.level} OK`,
  );

  // ── 6. Learn cards 6-15 (round 2→3, batched — toward L2→L3 at 15) ─────────
  const remainingIds = cardIds.slice(5);
  console.log(
    `[QAJ-04] Learning cards 6-15 (batched round 2→3, toward L2→L3 threshold at 15)...`,
  );
  const remainingResult = await gradeRoundBatch(
    BASE_URL,
    sessionToken,
    deckId,
    remainingIds,
    "n2t",
  );
  console.log(
    `[QAJ-04]   cards 6-15/15 learned (leveledUp=${remainingResult.leveledUp})`,
  );
  if (remainingResult.leveledUp === 3) {
    console.log("[QAJ-04]   ^ L2→L3 crossing detected in cards 6-15 batch");
  }

  // ── 7. Assert L2→L3 crossing occurred ─────────────────────────────────────
  const postL3State = await readState(BASE_URL, sessionToken, SECRET, deckId);
  if (postL3State.real.effectiveCardCount < 15) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: after 15 learned cards expected effectiveCardCount>=15, got ${postL3State.real.effectiveCardCount}`,
    );
  }
  if (postL3State.real.level < 3) {
    throw new Error(
      `[QAJ-04] ASSERT FAIL: after 15 learned cards expected level>=3, got ${postL3State.real.level}`,
    );
  }
  console.log(
    `[QAJ-04] After card 15: effectiveCardCount=${postL3State.real.effectiveCardCount} level=${postL3State.real.level} OK`,
  );

  // Cross-check /api/habitat level agrees with /api/debug/state real.level (L3)
  const habitatL3 = await readHabitat(BASE_URL, sessionToken);
  assertEq(
    habitatL3.level,
    postL3State.real.level,
    "L2→L3: /api/habitat.level === /api/debug/state.real.level",
  );
  assertEq(
    habitatL3.effectiveCardCount,
    postL3State.real.effectiveCardCount,
    "L2→L3: /api/habitat.effectiveCardCount === /api/debug/state.real.effectiveCardCount",
  );
  console.log(
    `[QAJ-04] /api/habitat level=${habitatL3.level} agrees with /api/debug/state real.level=${postL3State.real.level} OK`,
  );

  // Final summary
  console.log(
    `[QAJ-04] Summary: 15 cards learned, level=${postL3State.real.level}, ` +
      `effectiveCardCount=${postL3State.real.effectiveCardCount}, quality=${postL3State.real.quality}`,
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

run()
  .then(() => {
    console.log("[QAJ-04] PASS");
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[QAJ-04] FAIL: ${err.message}`);
    process.exit(1);
  });
