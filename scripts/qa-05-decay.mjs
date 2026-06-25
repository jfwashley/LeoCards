#!/usr/bin/env node
// scripts/qa-05-decay.mjs — Phase 15 Plan 04: QAJ-05
//
// Journey: decay/grace + pause interaction via time-shift.
//
// Proves three invariants without any real multi-day waits:
//
//   DECAY SEGMENT:
//     1. Before time-shift: real.isDecaying === false, real.quality === 1.0
//        (habitat is healthy because we just studied — within the 2-day grace period)
//     2. After setTimeShift(+4 days): real.isDecaying === true,
//        real.quality ≈ 0.90 (2 days past the 2-day grace at 5%/day = 10% loss)
//     3. After clearTimeShift: quality returns to 1.0 (back to real wall-clock time)
//
//   PAUSE SEGMENT:
//     4. Pause a second card via POST /api/cards/<id>/pause
//     5. setTimeShift(+4 days) again
//     6. Paused card's masteryRound + cooldownUntil are UNCHANGED after the shift
//        (pause froze its SRS clock — it never gets new cooldowns during pause)
//     7. pausedAt is non-null (confirming the card is paused)
//     8. real.isDecaying === true (habitat decays on lastActivityAt regardless of pause)
//     9. Optionally unpause: card re-enters queue with cooldownUntil shifted by pause duration
//
// Decay math (from src/lib/habitat-engine.ts):
//   GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000  (2 days)
//   DECAY_RATE_PER_DAY = 0.05
//   quality at +4 days = 1 - (4 - 2) * 0.05 = 1 - 0.10 = 0.90
//   epsilon tolerance: ±0.01 (rounding in engine; server clock drift)
//
// Prerequisites:
//   DATABASE_URL         — Neon Postgres connection string (provisioning)
//   DEBUG_CHEAT_SECRET   — Secret for /api/debug/* endpoints
//   npm run dev running (default zero-cooldown in local dev is fine — decay
//     does NOT require STUDY_COOLDOWN_MINUTES; it depends on lastActivityAt
//     which is written by a real gradeSession call in this script)
//
// Optional:
//   QA_BASE_URL  — App origin (default: http://localhost:3000)
//
// Usage:
//   node scripts/qa-05-decay.mjs
//
// Security notes (T-15-14, T-15-15):
//   - Session tokens and passwords are NEVER logged.
//   - Provisioned user is @test.local — cleanup-test-users.mjs reaps it (QAJ-06).
//   - Time-shift is per-session cookie + cheatEnabled()-gated (T-15-15);
//     it never mutates global or customer state.
//   - clearTimeShift is called in a finally block — the shift cannot leak if the
//     script throws.

import {
  assertEq,
  clearTimeShift,
  DEFAULT_BASE_URL,
  directionForRound,
  gradeSession,
  provision,
  readHabitat,
  readState,
  setTimeShift,
} from "./qa-lib.mjs";

const BASE_URL = DEFAULT_BASE_URL;
const SECRET = process.env.DEBUG_CHEAT_SECRET;
if (!SECRET) {
  console.error("FATAL: set DEBUG_CHEAT_SECRET before running this script");
  process.exit(1);
}

// ── Decay math constants (must match src/lib/habitat-engine.ts) ───────────────
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000; // 345_600_000 ms
const EXPECTED_QUALITY_AT_4_DAYS = 0.9; // 1 - (4-2)*0.05 = 0.90
const QUALITY_EPSILON = 0.01; // allow ±0.01 for rounding

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Assert that a value is within epsilon of an expected number.
 * @param {number} actual
 * @param {number} expected
 * @param {number} epsilon
 * @param {string} label
 */
function assertApprox(actual, expected, epsilon, label) {
  const diff = Math.abs(actual - expected);
  if (diff > epsilon) {
    throw new Error(
      `[ASSERT FAIL] ${label}: expected ≈${expected} (±${epsilon}), got ${actual} (diff=${diff})`,
    );
  }
}

async function run() {
  // ── 1. Provision: need enough cards to register habitat activity ───────────
  //    To get a real lastActivityAt in habitat_metadata we must grade at least
  //    one card to masteryRound 3 (learned). With default zero-cooldown in local
  //    dev, grading a card through rounds 0→1→2→3 requires 4 separate gradeSession
  //    calls (each advances by 1).
  //
  //    We provision 3 cards:
  //      card[0] + card[1]: will be advanced to masteryRound 3 (learned) to set
  //        learnedCardCount and lastActivityAt for habitat decay assertions.
  //      card[2]: the "pause card" used in the PAUSE SEGMENT.
  const { email, sessionToken, deckId, cardIds } = await provision(BASE_URL, {
    cards: [
      { front: "chat", back: "cat" },
      { front: "chien", back: "dog" },
      { front: "maison", back: "house" },
    ],
  });
  const [learnCard1, learnCard2, pauseCardId] = cardIds;
  console.log(
    `[QAJ-05] provisioned user ${email} deck ${deckId} cards ${cardIds.length}`,
  );

  // ── 2. Advance card[0] and card[1] to masteryRound 3 (learned) ────────────
  //    With zero-cooldown (default local dev), back-to-back sessions work fine.
  //    Round 2 accepts either direction — we use "n2t" (the engine accepts both).
  //    Note: directionForRound(2) returns "either" which is NOT a valid HTTP value;
  //    we always submit "n2t" or "t2n" for round-2 grades (per 15-03 executor caveat).
  for (const cardId of [learnCard1, learnCard2]) {
    // Round 0 → 1: n2t correct
    await gradeSession(BASE_URL, sessionToken, {
      deckId,
      grades: [{ cardId, direction: directionForRound(0), correct: true }],
    });
    // Round 1 → 2: t2n correct
    await gradeSession(BASE_URL, sessionToken, {
      deckId,
      grades: [{ cardId, direction: directionForRound(1), correct: true }],
    });
    // Round 2 → 3 (learned): submit "n2t" (engine accepts either direction at round 2)
    await gradeSession(BASE_URL, sessionToken, {
      deckId,
      grades: [{ cardId, direction: "n2t", correct: true }],
    });
  }
  console.log("[QAJ-05] advanced 2 cards to masteryRound=3 (learned)");

  // Verify learned state
  const learnedState = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const lc1 = learnedState.cards.find((c) => c.id === learnCard1);
  const lc2 = learnedState.cards.find((c) => c.id === learnCard2);
  if (!lc1 || !lc2) throw new Error("learned cards not found in readState");
  assertEq(lc1.masteryRound, 3, "learnCard1 masteryRound=3");
  assertEq(lc2.masteryRound, 3, "learnCard2 masteryRound=3");
  assertEq(lc1.learned, true, "learnCard1 learned=true");
  assertEq(lc2.learned, true, "learnCard2 learned=true");

  // Also confirm habitat has learnedCardCount > 0 before shift
  const preShiftHabitat = await readHabitat(BASE_URL, sessionToken);
  if (preShiftHabitat.learnedCardCount < 2) {
    throw new Error(
      `[QAJ-05] Expected learnedCardCount >= 2 before decay test, got ${preShiftHabitat.learnedCardCount}`,
    );
  }
  console.log(
    `[QAJ-05] pre-shift habitat: learnedCardCount=${preShiftHabitat.learnedCardCount} quality=${preShiftHabitat.quality} isDecaying=${preShiftHabitat.isDecaying}`,
  );

  // ── DECAY SEGMENT ──────────────────────────────────────────────────────────
  // We run the decay segment and pause segment in a single try/finally block
  // to guarantee clearTimeShift runs even if assertions fail (T-15-15).
  let decayShifted = false;
  let pauseShifted = false;
  let pauseCardMasteryRoundBefore = -1;
  let pauseCardCooldownUntilBefore = null;

  try {
    // 3. Pre-shift baseline: quality=1.0, isDecaying=false
    //    (just studied, well within 2-day grace period)
    const debugStatePre = await readState(
      BASE_URL,
      sessionToken,
      SECRET,
      deckId,
    );
    assertEq(
      debugStatePre.real.isDecaying,
      false,
      "pre-shift real.isDecaying===false",
    );
    assertEq(debugStatePre.real.quality, 1, "pre-shift real.quality===1.0");
    console.log(
      `[QAJ-05] DECAY pre-shift: isDecaying=false quality=${debugStatePre.real.quality} OK`,
    );

    // 4. Apply +4 days time-shift (BEFORE assertion reads — RESEARCH pitfall 5)
    //    4 days past study completion → 2 days past 2-day grace → quality≈0.90
    await setTimeShift(BASE_URL, sessionToken, SECRET, FOUR_DAYS_MS);
    decayShifted = true;

    // 5. Assert post-shift: isDecaying=true, quality≈0.90
    //    Read from readState (which forwards the shift cookie via qa-lib cookieHeader)
    const debugStatePost = await readState(
      BASE_URL,
      sessionToken,
      SECRET,
      deckId,
    );
    assertEq(
      debugStatePost.real.isDecaying,
      true,
      "post-shift real.isDecaying===true",
    );
    assertApprox(
      debugStatePost.real.quality,
      EXPECTED_QUALITY_AT_4_DAYS,
      QUALITY_EPSILON,
      "post-shift real.quality≈0.90 (+4 days, 2 days past grace at 5%/day)",
    );
    console.log(
      `[QAJ-05] DECAY post-shift (+4 days): isDecaying=true quality=${debugStatePost.real.quality} (expected≈${EXPECTED_QUALITY_AT_4_DAYS}) OK`,
    );

    // 6. Clear shift — quality should return to 1.0
    await clearTimeShift(BASE_URL, sessionToken, SECRET);
    decayShifted = false;

    const debugStateCleared = await readState(
      BASE_URL,
      sessionToken,
      SECRET,
      deckId,
    );
    assertEq(
      debugStateCleared.real.quality,
      1,
      "after clearTimeShift real.quality===1.0",
    );
    assertEq(
      debugStateCleared.real.isDecaying,
      false,
      "after clearTimeShift real.isDecaying===false",
    );
    console.log(
      `[QAJ-05] DECAY after clearTimeShift: quality=${debugStateCleared.real.quality} isDecaying=false OK`,
    );

    // ── PAUSE SEGMENT ────────────────────────────────────────────────────────

    // 7. Capture pause card's current SRS state BEFORE pausing
    //    (pauseCardId is at masteryRound=0, no cooldown — never graded)
    const pauseStatePre = await readState(
      BASE_URL,
      sessionToken,
      SECRET,
      deckId,
    );
    const pcPre = pauseStatePre.cards.find((c) => c.id === pauseCardId);
    if (!pcPre)
      throw new Error(`pause card ${pauseCardId} not found in readState`);
    pauseCardMasteryRoundBefore = pcPre.masteryRound;
    pauseCardCooldownUntilBefore = pcPre.cooldownUntil;
    console.log(
      `[QAJ-05] PAUSE pre-pause card[2]: masteryRound=${pcPre.masteryRound} cooldownUntil=${pcPre.cooldownUntil ?? "null"} pausedAt=${pcPre.pausedAt ?? "null"}`,
    );

    // 8. Pause the card via POST /api/cards/<id>/pause
    //    qa-lib does not expose a pause helper — call the endpoint inline (per plan §read_first).
    //    Send the session cookie manually; include the time-shift cookie if any (none here,
    //    but we use the full Cookie header for consistency).
    const pauseRes = await fetch(`${BASE_URL}/api/cards/${pauseCardId}/pause`, {
      method: "POST",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });
    if (!pauseRes.ok) {
      const body = await pauseRes.text();
      throw new Error(
        `[QAJ-05] POST /api/cards/${pauseCardId}/pause failed: HTTP ${pauseRes.status} — ${body}`,
      );
    }
    const pauseBody = await pauseRes.json();
    if (!pauseBody.pausedAt) {
      throw new Error(
        `[QAJ-05] pause response missing pausedAt: ${JSON.stringify(pauseBody)}`,
      );
    }
    console.log(
      `[QAJ-05] PAUSE POST /api/cards/${pauseCardId}/pause → pausedAt=${pauseBody.pausedAt} OK`,
    );

    // 9. Apply +4 days time-shift again (BEFORE readState — pitfall 5)
    await setTimeShift(BASE_URL, sessionToken, SECRET, FOUR_DAYS_MS);
    pauseShifted = true;

    // 10. Assert pause invariants:
    //     a) Paused card's masteryRound + cooldownUntil are UNCHANGED (SRS clock frozen)
    //     b) pausedAt is non-null (confirming pause took effect)
    //     c) real.isDecaying === true (habitat decays on lastActivityAt, ignores pause)
    const pauseStatePost = await readState(
      BASE_URL,
      sessionToken,
      SECRET,
      deckId,
    );
    const pcPost = pauseStatePost.cards.find((c) => c.id === pauseCardId);
    if (!pcPost)
      throw new Error(
        `pause card ${pauseCardId} not found in readState after time-shift`,
      );

    // a) SRS state frozen
    assertEq(
      pcPost.masteryRound,
      pauseCardMasteryRoundBefore,
      "paused card masteryRound unchanged after +4 day shift",
    );
    assertEq(
      pcPost.cooldownUntil,
      pauseCardCooldownUntilBefore,
      "paused card cooldownUntil unchanged after +4 day shift (SRS clock frozen)",
    );

    // b) pausedAt is non-null
    if (!pcPost.pausedAt) {
      throw new Error(
        "[QAJ-05] ASSERT FAIL: paused card has pausedAt===null after pause + shift",
      );
    }
    console.log(
      `[QAJ-05] PAUSE post-shift card[2]: masteryRound=${pcPost.masteryRound} ` +
        `cooldownUntil=${pcPost.cooldownUntil ?? "null"} pausedAt=${pcPost.pausedAt} (SRS frozen) OK`,
    );

    // c) Habitat still decays (lastActivityAt is from the study sessions above)
    assertEq(
      pauseStatePost.real.isDecaying,
      true,
      "real.isDecaying===true after +4 days (habitat decays on lastActivityAt, not paused state)",
    );
    assertApprox(
      pauseStatePost.real.quality,
      EXPECTED_QUALITY_AT_4_DAYS,
      QUALITY_EPSILON,
      "real.quality≈0.90 with paused card + +4 day shift",
    );
    console.log(
      `[QAJ-05] PAUSE post-shift habitat: isDecaying=true quality=${pauseStatePost.real.quality} (habitat decays regardless of pause) OK`,
    );

    // 11. Optional: unpause and verify the card re-enters the queue
    //     computeUnpauseUpdate shifts cooldownUntil forward by (now − pausedAt).
    //     With the time-shift active, "now" is 4 days after pause, so cooldownUntil
    //     (which was null) stays null — the card is immediately due.
    const unpauseRes = await fetch(
      `${BASE_URL}/api/cards/${pauseCardId}/unpause`,
      {
        method: "POST",
        headers: {
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
      },
    );
    if (!unpauseRes.ok) {
      const body = await unpauseRes.text();
      throw new Error(
        `[QAJ-05] POST /api/cards/${pauseCardId}/unpause failed: HTTP ${unpauseRes.status} — ${body}`,
      );
    }
    const unpauseBody = await unpauseRes.json();
    console.log(
      `[QAJ-05] PAUSE POST /api/cards/${pauseCardId}/unpause → cooldownUntil=${unpauseBody.cooldownUntil ?? "null"} OK`,
    );

    // Verify pausedAt is cleared after unpause
    const unpausedState = await readState(
      BASE_URL,
      sessionToken,
      SECRET,
      deckId,
    );
    const pcUnpaused = unpausedState.cards.find((c) => c.id === pauseCardId);
    if (!pcUnpaused)
      throw new Error(
        `pause card ${pauseCardId} not found in readState after unpause`,
      );

    if (pcUnpaused.pausedAt !== null) {
      throw new Error(
        `[QAJ-05] ASSERT FAIL: card still shows pausedAt=${pcUnpaused.pausedAt} after unpause`,
      );
    }
    console.log(
      `[QAJ-05] PAUSE after unpause card[2]: pausedAt=null (unpaused) ` +
        `cooldownUntil=${pcUnpaused.cooldownUntil ?? "null"} OK`,
    );
  } finally {
    // Always clear the time-shift to avoid leaking offset into subsequent scripts (T-15-15)
    if (decayShifted || pauseShifted) {
      await clearTimeShift(BASE_URL, sessionToken, SECRET);
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

run()
  .then(() => {
    console.log("[QAJ-05] PASS");
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[QAJ-05] FAIL: ${err.message}`);
    process.exit(1);
  });
