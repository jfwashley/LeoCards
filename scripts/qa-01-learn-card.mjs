#!/usr/bin/env node
// scripts/qa-01-learn-card.mjs — Phase 15 Plan 03: QAJ-01
//
// Journey: learn a card — round 0 → 1, next direction t2n, cooldown set.
//
// Prerequisites:
//   DATABASE_URL           — Neon Postgres connection string (provisioning)
//   DEBUG_CHEAT_SECRET     — Secret for /api/debug/state
//   STUDY_COOLDOWN_MINUTES=1 must be set when starting the dev server (NOT as a
//     runtime env on this script). STUDY_COOLDOWN_MINUTES is evaluated at module load
//     time inside the Next.js route handler, so the dev server MUST be restarted with
//     it set before running this script:
//
//       STUDY_COOLDOWN_MINUTES=1 npm run dev
//
//     If the dev server was started WITHOUT STUDY_COOLDOWN_MINUTES=1, this script WILL
//     FAIL the cooldownUntil assertion (it will be null instead of ~1 min in future).
//     See RESEARCH pitfall 2.
//
// Optional:
//   QA_BASE_URL  — App origin (default: http://localhost:3000)
//
// Usage:
//   node scripts/qa-01-learn-card.mjs
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
    cards: [{ front: "chat", back: "cat" }],
  });
  const cardId = cardIds[0];
  console.log(`[QAJ-01] provisioned user ${email} card ${cardId}`);

  // ── 2. Assert baseline: round 0, direction n2t, no cooldown ───────────────
  const before = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const card0 = before.cards.find((c) => c.id === cardId);
  if (!card0) throw new Error(`card ${cardId} not found in readState response`);
  assertEq(card0.masteryRound, 0, "baseline masteryRound");
  assertEq(card0.direction, "n2t", "baseline direction");
  assertEq(card0.learned, false, "baseline learned");
  console.log(
    "[QAJ-01] baseline: masteryRound=0 direction=n2t learned=false OK",
  );

  // ── 3. Grade card correctly in round-0 direction (n2t) ────────────────────
  const gradeDir = directionForRound(0); // "n2t"
  const result = await gradeSession(BASE_URL, sessionToken, {
    deckId,
    grades: [{ cardId, direction: gradeDir, correct: true }],
  });
  assertEq(result.success, true, "gradeSession success");
  console.log(
    `[QAJ-01] gradeSession success=true leveledUp=${result.leveledUp}`,
  );

  // ── 4. Assert post-grade state ─────────────────────────────────────────────
  const after = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const card1 = after.cards.find((c) => c.id === cardId);
  if (!card1)
    throw new Error(`card ${cardId} not found in post-grade readState`);

  // 4a. masteryRound advanced 0 → 1
  assertEq(card1.masteryRound, 1, "post-grade masteryRound");
  console.log("[QAJ-01] masteryRound 0→1 OK");

  // 4b. direction is now t2n (round 1's required direction)
  const expectedDir = directionForRound(1); // "t2n"
  assertEq(card1.direction, expectedDir, "post-grade direction");
  console.log("[QAJ-01] direction→t2n OK");

  // 4c. card is not yet learned (round 1 ≠ learned)
  assertEq(card1.learned, false, "post-grade learned===false");

  // 4d. cooldownUntil is non-null and ~1 minute in the future (requires STUDY_COOLDOWN_MINUTES=1)
  if (!card1.cooldownUntil) {
    throw new Error(
      "[QAJ-01] ASSERT FAIL: cooldownUntil is null — was the dev server started with " +
        "STUDY_COOLDOWN_MINUTES=1? (See script preamble, RESEARCH pitfall 2)",
    );
  }
  const cooldownDate = new Date(card1.cooldownUntil);
  const now = new Date();
  if (cooldownDate <= now) {
    throw new Error(
      `[QAJ-01] ASSERT FAIL: cooldownUntil ${card1.cooldownUntil} is not in the future (now=${now.toISOString()})`,
    );
  }
  const diffMs = cooldownDate.getTime() - now.getTime();
  const diffMinutes = diffMs / 60000;
  if (diffMinutes > 2) {
    throw new Error(
      `[QAJ-01] ASSERT FAIL: cooldownUntil is ${diffMinutes.toFixed(1)} minutes away — expected ~1 min (STUDY_COOLDOWN_MINUTES=1). Got: ${card1.cooldownUntil}`,
    );
  }
  console.log(
    `[QAJ-01] cooldownUntil=${card1.cooldownUntil} (~${diffMinutes.toFixed(2)} min from now) OK`,
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

run()
  .then(() => {
    console.log("[QAJ-01] PASS");
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[QAJ-01] FAIL: ${err.message}`);
    process.exit(1);
  });
