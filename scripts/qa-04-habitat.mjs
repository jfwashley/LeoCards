#!/usr/bin/env node
// scripts/qa-04-habitat.mjs — Phase 15 Plan 03: QAJ-04
//
// Journey: habitat level progression — cross L1→2 (effectiveCardCount>=5) and
// a representative higher transition (L2→3, effectiveCardCount>=15).
//
// This script runs with DEFAULT zero-cooldown (do NOT set STUDY_COOLDOWN_MINUTES)
// and performs NO time-shift, so quality stays 1.0 (sessions are within the 2-day
// grace period) → effectiveCardCount == learnedCardCount exactly.
//
// LEVEL_THRESHOLDS (from src/lib/habitat-engine.ts):
//   [5, 15, 30, 50, 80, 120, 170, 230]
//   index 0 (5)  → level 2
//   index 1 (15) → level 3
//
// This script provisions 15 cards and learns them all in 4-round sessions.
// After the 5th learned card it asserts:
//   - real.effectiveCardCount >= 5
//   - real.level >= 2
//   - gradeSession leveledUp === 2 on the crossing session
//   - GET /api/habitat level matches GET /api/debug/state real.level
// After the 15th learned card it asserts:
//   - real.level >= 3 (representative higher transition)
//   - level agreement between /api/habitat and /api/debug/state.real
//
// Prerequisites:
//   DATABASE_URL           — Neon Postgres connection string (provisioning)
//   DEBUG_CHEAT_SECRET     — Secret for /api/debug/state
//   npm run dev running (WITHOUT STUDY_COOLDOWN_MINUTES — default zero-cooldown)
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
  DEFAULT_BASE_URL,
  assertEq,
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
 * Fully learn a single card from masteryRound=0 to masteryRound=3 via three
 * separate gradeSession calls (one per round: 0→1, 1→2, 2→3).
 *
 * Returns the gradeSession response from the final (round-2) session,
 * which contains { success, leveledUp } — leveledUp is non-null when this
 * session crossed a habitat level threshold.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} deckId
 * @param {string} cardId
 * @returns {Promise<{ success: boolean, leveledUp: number | null }>}
 */
async function learnCard(baseUrl, token, deckId, cardId) {
  // Round 0 → 1: direction n2t
  const r0 = await gradeSession(baseUrl, token, {
    deckId,
    grades: [{ cardId, direction: directionForRound(0), correct: true }],
  });
  if (!r0.success) throw new Error(`round-0 grade failed for card ${cardId}`);

  // Round 1 → 2: direction t2n
  const r1 = await gradeSession(baseUrl, token, {
    deckId,
    grades: [{ cardId, direction: directionForRound(1), correct: true }],
  });
  if (!r1.success) throw new Error(`round-1 grade failed for card ${cardId}`);

  // Round 2 → 3: either direction — submit n2t (both are accepted at round 2)
  const r2 = await gradeSession(baseUrl, token, {
    deckId,
    grades: [{ cardId, direction: "n2t", correct: true }],
  });
  if (!r2.success) throw new Error(`round-2 grade failed for card ${cardId}`);

  return r2; // contains leveledUp for the crossing session
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

  // ── 3. Learn cards 1-4 (below L1→L2 threshold of 5) ──────────────────────
  console.log("[QAJ-04] Learning cards 1-4 (pre-threshold)...");
  for (let i = 0; i < 4; i++) {
    const cardId = cardIds[i];
    const result = await learnCard(BASE_URL, sessionToken, deckId, cardId);
    console.log(
      `[QAJ-04]   card ${i + 1}/15 learned (leveledUp=${result.leveledUp})`,
    );
    // These sessions should not cross level 2 (only 1-4 learned so far)
    if (result.leveledUp === 2) {
      throw new Error(
        `[QAJ-04] ASSERT FAIL: unexpected level-up to 2 after card ${i + 1} (expected only after card 5)`,
      );
    }
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

  // ── 4. Learn card 5 — crossing L1→2 (effectiveCardCount>=5) ───────────────
  console.log("[QAJ-04] Learning card 5 (crossing L1→L2 threshold)...");
  const card5Id = cardIds[4];
  const crossingResult = await learnCard(BASE_URL, sessionToken, deckId, card5Id);
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

  // ── 5. Learn cards 6-15 (to cross L2→3 threshold at effectiveCardCount>=15) ─
  console.log("[QAJ-04] Learning cards 6-15 (toward L2→L3 threshold at 15)...");
  let levelUpToL3Result = null;
  for (let i = 5; i < 15; i++) {
    const cardId = cardIds[i];
    const result = await learnCard(BASE_URL, sessionToken, deckId, cardId);
    const learnedCount = i + 1;
    console.log(
      `[QAJ-04]   card ${learnedCount}/15 learned (leveledUp=${result.leveledUp})`,
    );
    // Track the session that crosses L2→L3 (leveledUp === 3 when effectiveCardCount hits 15)
    if (result.leveledUp === 3) {
      levelUpToL3Result = result;
      console.log(`[QAJ-04]   ^ L2→L3 crossing detected at card ${learnedCount}`);
    }
  }

  // ── 6. Assert L2→L3 crossing occurred ─────────────────────────────────────
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
