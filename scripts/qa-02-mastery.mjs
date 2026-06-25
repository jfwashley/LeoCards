#!/usr/bin/env node
// scripts/qa-02-mastery.mjs — Phase 15 Plan 03: QAJ-02
//
// Journey: full mastery 0→1→2→3, wrong-answer hold, direction rules.
//
// This script INTENTIONALLY runs with the DEFAULT zero-cooldown (do NOT set
// STUDY_COOLDOWN_MINUTES). In default local dev, buildCooldownConfig() returns
// { 0: 0, 1: 0, 2: null } so back-to-back sessions advance the card without
// any wait. This allows all four mastery rounds to be exercised in one run.
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
//   node scripts/qa-02-mastery.mjs
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
  readState,
} from "./qa-lib.mjs";

const BASE_URL = DEFAULT_BASE_URL;
const SECRET = process.env.DEBUG_CHEAT_SECRET;
if (!SECRET) {
  console.error("FATAL: set DEBUG_CHEAT_SECRET before running this script");
  process.exit(1);
}

async function run() {
  // ── 1. Provision one card ──────────────────────────────────────────────────
  const { email, sessionToken, deckId, cardIds } = await provision(BASE_URL, {
    cards: [{ front: "chien", back: "dog" }],
  });
  const cardId = cardIds[0];
  console.log(`[QAJ-02] provisioned user ${email} card ${cardId}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Round 0 → 1: grade n2t correct, assert masteryRound=1 direction=t2n
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[QAJ-02] --- Round 0: grading n2t correct ---");
  const r0dir = directionForRound(0); // "n2t"
  const r0result = await gradeSession(BASE_URL, sessionToken, {
    deckId,
    grades: [{ cardId, direction: r0dir, correct: true }],
  });
  assertEq(r0result.success, true, "round-0 gradeSession success");

  const s1 = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const c1 = s1.cards.find((c) => c.id === cardId);
  if (!c1) throw new Error("card not found after round 0 grade");
  assertEq(c1.masteryRound, 1, "after round-0 advance: masteryRound=1");
  assertEq(c1.direction, "t2n", "after round-0 advance: direction=t2n");
  assertEq(c1.learned, false, "after round-0 advance: learned=false");
  console.log("[QAJ-02] Round 0→1 OK: masteryRound=1 direction=t2n");

  // ─────────────────────────────────────────────────────────────────────────
  // Round 1 wrong-answer hold: grade t2n WRONG, assert masteryRound still 1
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[QAJ-02] --- Round 1: grading t2n WRONG (hold test) ---");
  const r1wrongResult = await gradeSession(BASE_URL, sessionToken, {
    deckId,
    grades: [{ cardId, direction: "t2n", correct: false }],
  });
  assertEq(r1wrongResult.success, true, "round-1 wrong gradeSession success");

  const sWrong = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const cWrong = sWrong.cards.find((c) => c.id === cardId);
  if (!cWrong) throw new Error("card not found after round 1 wrong grade");
  assertEq(
    cWrong.masteryRound,
    1,
    "after wrong answer: masteryRound still 1 (hold)",
  );
  assertEq(cWrong.direction, "t2n", "after wrong answer: direction still t2n");
  console.log("[QAJ-02] Wrong-answer hold OK: masteryRound=1 (unchanged)");

  // ─────────────────────────────────────────────────────────────────────────
  // Round 1 → 2: grade t2n correct, assert masteryRound=2 direction=either
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[QAJ-02] --- Round 1: grading t2n correct (advance) ---");
  const r1dir = directionForRound(1); // "t2n"
  const r1result = await gradeSession(BASE_URL, sessionToken, {
    deckId,
    grades: [{ cardId, direction: r1dir, correct: true }],
  });
  assertEq(r1result.success, true, "round-1 correct gradeSession success");

  const s2 = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const c2 = s2.cards.find((c) => c.id === cardId);
  if (!c2) throw new Error("card not found after round 1 correct grade");
  assertEq(c2.masteryRound, 2, "after round-1 advance: masteryRound=2");
  assertEq(c2.direction, "either", "after round-1 advance: direction=either");
  assertEq(c2.learned, false, "after round-1 advance: learned=false");
  console.log("[QAJ-02] Round 1→2 OK: masteryRound=2 direction=either");

  // ─────────────────────────────────────────────────────────────────────────
  // Round 2 → 3: grade "either"-direction correct, assert masteryRound=3 learned=true
  // ─────────────────────────────────────────────────────────────────────────
  console.log(
    "[QAJ-02] --- Round 2: grading either-direction correct (learned) ---",
  );
  const r2dir = directionForRound(2); // "either"
  // For "either" direction we must submit an actual direction string — pick "n2t"
  // (the study engine accepts either when ROUND_REQUIREMENT is "either")
  const r2submitDir = "n2t";
  const r2result = await gradeSession(BASE_URL, sessionToken, {
    deckId,
    grades: [{ cardId, direction: r2submitDir, correct: true }],
  });
  assertEq(r2result.success, true, "round-2 gradeSession success");

  const s3 = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const c3 = s3.cards.find((c) => c.id === cardId);
  if (!c3) throw new Error("card not found after round 2 grade");
  assertEq(c3.masteryRound, 3, "after round-2 advance: masteryRound=3");
  assertEq(c3.learned, true, "after round-2 advance: learned=true");
  // At masteryRound 3 the card is learned — cooldownUntil should be null (immediate)
  assertEq(c3.cooldownUntil, null, "after learned: cooldownUntil=null");
  // Direction at round 3 is "either" (directionForRound(3) returns "either")
  assertEq(c3.direction, "either", "after learned: direction=either");
  console.log(
    "[QAJ-02] Round 2→3 OK: masteryRound=3 learned=true cooldownUntil=null",
  );
  // Confirm we also used the "either" direction rule (ROUND_REQUIREMENT[2])
  console.log(
    `[QAJ-02] round-2 direction rule verified: directionForRound(2)="${r2dir}"`,
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

run()
  .then(() => {
    console.log("[QAJ-02] PASS");
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[QAJ-02] FAIL: ${err.message}`);
    process.exit(1);
  });
