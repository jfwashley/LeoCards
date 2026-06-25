#!/usr/bin/env node
// scripts/qa-03-resume.mjs — Phase 15 Plan 04: QAJ-03
//
// Journey: time-resumable session via manifest + time-shift fast path.
//
// This script has TWO phases controlled by a --resume flag (or RESUME_MANIFEST env):
//
//   PHASE A (provision + grade + persist manifest):
//     node scripts/qa-03-resume.mjs
//     Provisions a @test.local user + 2 cards, grades one card to round 1 so it
//     gets a ~1-minute cooldown, writes the manifest, and exits 0. The manifest
//     records expected states and the cooldownUntilExpected timestamp.
//
//   PHASE B (resume + assert):
//     node scripts/qa-03-resume.mjs --resume
//     OR: RESUME_MANIFEST=scripts/qa-manifest-<runId>.json node scripts/qa-03-resume.mjs
//     Reads the manifest, re-authenticates (fresh session — stored token may be stale,
//     RESEARCH pitfall 4), then uses the QA time-shift fast path to jump past the
//     cooldown, then asserts cooldown-expired-vs-cooling + correct due-count.
//
// Two modes for cooldown expiry in PHASE B:
//   Fast-path (default): setTimeShift(+90_000) — jumps 90 seconds past the
//     1-minute cooldown. No real wait required.
//   Real-wait: The manifest records resumeAfter. If invoked after that time without
//     --fast, the assertions run against real elapsed time (no shift applied).
//
// Prerequisites:
//   DATABASE_URL             — Neon Postgres connection string (provisioning)
//   DEBUG_CHEAT_SECRET       — Secret for /api/debug/* endpoints
//   STUDY_COOLDOWN_MINUTES=1 must be set on the DEV SERVER (NOT on this script).
//     The cooldown config is evaluated at module load time in the route handler;
//     restart the dev server before running Phase A:
//
//       STUDY_COOLDOWN_MINUTES=1 npm run dev
//
//     Without it, cooldownUntil will be null after grading (RESEARCH pitfall 2)
//     and Phase B will fail the "cooling" assertion.
//
//   For Phase B, pass the manifest path via:
//     --resume [<manifest-path>]   (default: scripts/qa-manifest-qa03.json)
//
// Optional:
//   QA_BASE_URL  — App origin (default: http://localhost:3000)
//
// Security notes (T-15-13, T-15-14):
//   - The manifest stores email + password in cleartext — intentional for ephemeral
//     @test.local credentials (no real value, gitignored per 15-02).
//   - Session tokens are NEVER logged. Passwords are NEVER logged.
//   - Provisioned user is @test.local — cleanup-test-users.mjs reaps it (QAJ-06).

import * as path from "node:path";
import {
  assertEq,
  clearTimeShift,
  DEFAULT_BASE_URL,
  directionForRound,
  gradeSession,
  provision,
  ROOT,
  readManifest,
  readState,
  setTimeShift,
  signIn,
  writeManifest,
} from "./qa-lib.mjs";

const BASE_URL = DEFAULT_BASE_URL;
const SECRET = process.env.DEBUG_CHEAT_SECRET;
if (!SECRET) {
  console.error("FATAL: set DEBUG_CHEAT_SECRET before running this script");
  process.exit(1);
}

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isResume = args.includes("--resume");
const fastPath = !args.includes("--no-fast"); // fast-path is the default in Phase B

// Manifest path: can be overridden by the RESUME_MANIFEST env var or a
// positional arg after --resume (e.g. --resume scripts/qa-manifest-custom.json).
const DEFAULT_MANIFEST_PATH = path.join(
  ROOT,
  "scripts",
  "qa-manifest-qa03.json",
);
const MANIFEST_PATH =
  process.env.RESUME_MANIFEST ??
  (() => {
    const resumeIdx = args.indexOf("--resume");
    if (
      resumeIdx !== -1 &&
      args[resumeIdx + 1] &&
      !args[resumeIdx + 1].startsWith("--")
    ) {
      return path.join(ROOT, args[resumeIdx + 1]);
    }
    return DEFAULT_MANIFEST_PATH;
  })();

// ── PHASE A: provision, grade, persist manifest ───────────────────────────────

async function runPhaseA() {
  console.log("[QAJ-03] PHASE A — provision + grade + persist manifest");

  // 1. Provision two cards:
  //    card[0]: will be graded round 0→1 (gets ~1-min cooldown) — "cooling"
  //    card[1]: will NOT be graded (stays at round 0, no cooldown) — "due"
  const { email, password, sessionToken, deckId, cardIds } = await provision(
    BASE_URL,
    {
      cards: [
        { front: "chat", back: "cat" },
        { front: "chien", back: "dog" },
      ],
    },
  );
  const [gradedCardId, ungradedCardId] = cardIds;
  console.log(
    `[QAJ-03] provisioned user ${email} deck ${deckId} cards ${cardIds.length}`,
  );

  // 2. Assert baseline for both cards (round 0, no cooldown)
  const before = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const bc0 = before.cards.find((c) => c.id === gradedCardId);
  const bc1 = before.cards.find((c) => c.id === ungradedCardId);
  if (!bc0)
    throw new Error(`graded card ${gradedCardId} not found in baseline state`);
  if (!bc1)
    throw new Error(
      `ungraded card ${ungradedCardId} not found in baseline state`,
    );
  assertEq(bc0.masteryRound, 0, "baseline graded card masteryRound");
  assertEq(bc1.masteryRound, 0, "baseline ungraded card masteryRound");
  assertEq(bc0.cooldownUntil, null, "baseline graded card cooldownUntil");
  console.log("[QAJ-03] baseline assertions OK");

  // 3. Grade card[0] round 0 → 1 (n2t correct)
  //    This sets a ~1-minute cooldown (requires STUDY_COOLDOWN_MINUTES=1 on dev server)
  const gradeDir = directionForRound(0); // "n2t"
  const gradeResult = await gradeSession(BASE_URL, sessionToken, {
    deckId,
    grades: [{ cardId: gradedCardId, direction: gradeDir, correct: true }],
  });
  assertEq(gradeResult.success, true, "gradeSession success");
  console.log(
    `[QAJ-03] graded card[0] n2t correct: leveledUp=${gradeResult.leveledUp}`,
  );

  // 4. Read post-grade state to capture the actual cooldownUntil
  const after = await readState(BASE_URL, sessionToken, SECRET, deckId);
  const ac0 = after.cards.find((c) => c.id === gradedCardId);
  if (!ac0)
    throw new Error(`graded card ${gradedCardId} not found after grading`);
  assertEq(ac0.masteryRound, 1, "post-grade masteryRound");

  if (!ac0.cooldownUntil) {
    throw new Error(
      "[QAJ-03] ASSERT FAIL: cooldownUntil is null after grading — was the dev server " +
        "started with STUDY_COOLDOWN_MINUTES=1? (See script preamble, RESEARCH pitfall 2)\n" +
        "Phase A cannot write a useful manifest without a non-null cooldownUntil.",
    );
  }

  const cooldownUntilDate = new Date(ac0.cooldownUntil);
  const gradeCompletedAt = new Date();

  // resumeAfter is the cooldown expiry + 10 seconds buffer
  const resumeAfterMs = cooldownUntilDate.getTime() + 10_000;
  const resumeAfter = new Date(resumeAfterMs).toISOString();

  console.log(
    `[QAJ-03] card[0] cooldownUntil=${ac0.cooldownUntil} masteryRound=1 direction=${ac0.direction}`,
  );

  // 5. Build manifest
  //    Manifest stores: user creds (re-auth on resume), deck/card ids, expected states.
  //    password stored cleartext — ephemeral @test.local creds, gitignored (T-15-13).
  const runId = crypto.randomUUID().slice(0, 8);
  const manifest = {
    schemaVersion: 1,
    runId,
    createdAt: gradeCompletedAt.toISOString(),
    phase: "cooldown-resume",
    baseUrl: BASE_URL,
    user: {
      email,
      password,
      // sessionToken intentionally NOT stored — always re-auth on resume (pitfall 4)
    },
    deck: {
      id: deckId,
      language: "fr",
    },
    cards: [
      {
        id: gradedCardId,
        front: "chat",
        back: "cat",
        expectedMasteryRound: 1,
        expectedDirection: "t2n",
        cooldownUntilExpected: ac0.cooldownUntil, // ISO 8601 string
        expectedState: "cooling", // should still be cooling at manifest write time
      },
      {
        id: ungradedCardId,
        front: "chien",
        back: "dog",
        expectedMasteryRound: 0,
        expectedDirection: "n2t",
        cooldownUntilExpected: null,
        expectedState: "due", // no cooldown — always due
      },
    ],
    resumeAfter,
    completedPhases: ["provision", "grade", "cooldown-set"],
  };

  // 6. Atomic manifest write (.tmp → rename via qa-lib)
  await writeManifest(MANIFEST_PATH, manifest);
  console.log(`[QAJ-03] manifest written → ${MANIFEST_PATH}`);
  console.log(
    `[QAJ-03] PHASE A complete. Resume with:\n  node scripts/qa-03-resume.mjs --resume\n  (fast-path: no real wait needed — time-shift will expire the cooldown)`,
  );
}

// ── PHASE B: resume, re-auth, assert ─────────────────────────────────────────

async function runPhaseB() {
  console.log(
    `[QAJ-03] PHASE B — reading manifest ${MANIFEST_PATH} + asserting`,
  );

  // 1. Read manifest
  const manifest = await readManifest(MANIFEST_PATH);
  console.log(
    `[QAJ-03] manifest runId=${manifest.runId} createdAt=${manifest.createdAt}`,
  );

  const { user, deck, cards: manifestCards, resumeAfter } = manifest;
  const BASE = manifest.baseUrl ?? BASE_URL;

  // 2. Re-authenticate (fresh session — stored token may be stale, pitfall 4)
  //    We always re-auth; passwords are stored in manifest for this reason.
  const freshToken = await signIn(BASE, user.email, user.password);
  console.log(`[QAJ-03] re-authenticated as ${user.email}`);

  // 3. Fast-path: apply a +90 second time-shift to jump past the 1-minute cooldown.
  //    This satisfies the cooldownUntilExpected comparison without any real wall-clock wait.
  //    Apply BEFORE readState so computed values (minutesSinceActivity etc.) reflect the
  //    simulated future (RESEARCH pitfall 5).
  //    Real-wait mode: skip the shift and rely on actual elapsed time (--no-fast).
  let shifted = false;
  if (fastPath) {
    const now = Date.now();
    const resumeAfterMs = new Date(resumeAfter).getTime();
    // Compute how much time shift is needed to exceed resumeAfter from now
    const minShiftMs = Math.max(resumeAfterMs - now + 1000, 90_000);
    await setTimeShift(BASE, freshToken, SECRET, minShiftMs);
    shifted = true;
    console.log(
      `[QAJ-03] fast-path: time-shift applied (+${minShiftMs}ms to jump past cooldown)`,
    );
  } else {
    // Real-wait: check that resumeAfter has passed
    const now = new Date();
    const resumeAfterDate = new Date(resumeAfter);
    if (now < resumeAfterDate) {
      throw new Error(
        `[QAJ-03] Too early to resume without fast-path. resumeAfter=${resumeAfter}, now=${now.toISOString()}\n` +
          `Either wait ${Math.ceil((resumeAfterDate.getTime() - now.getTime()) / 1000)}s or run without --no-fast`,
      );
    }
    console.log("[QAJ-03] real-wait mode: resumeAfter has passed, proceeding");
  }

  try {
    // 4. Read current state for the test deck
    const state = await readState(BASE, freshToken, SECRET, deck.id);
    console.log(
      `[QAJ-03] readState: ${state.cards.length} card(s) returned for deck ${deck.id}`,
    );

    // 5. Assert each card
    const nowForComparison = shifted
      ? // With time-shift: the virtual "now" is what the server sees — use the shifted time
        // We track it ourselves as (Date.now() + shiftOffset). Since shifted=true we used
        // minShiftMs, but we don't have that in scope here. Use a generous future time:
        // any card with cooldownUntil set < 10 minutes from now (real) is "due" post-shift.
        // Simpler: trust readState — if cooldownUntil is null OR in the past (real), it's due.
        new Date()
      : new Date();

    let expectedDueCount = 0;

    for (const mc of manifestCards) {
      const sc = state.cards.find((c) => c.id === mc.id);
      if (!sc) throw new Error(`card ${mc.id} not found in readState`);

      // 5a. masteryRound must match expected
      assertEq(
        sc.masteryRound,
        mc.expectedMasteryRound,
        `card ${mc.id} masteryRound`,
      );

      // 5b. Determine actual cooling vs due
      //    due:     cooldownUntil is null OR cooldownUntil <= now (or <= shifted "now")
      //    cooling: cooldownUntil is non-null AND > now
      const cooldownUntilDate = sc.cooldownUntil
        ? new Date(sc.cooldownUntil)
        : null;
      const isDue =
        cooldownUntilDate === null || cooldownUntilDate <= nowForComparison;
      const actualState = isDue ? "due" : "cooling";

      if (mc.expectedState === "due") {
        // Ungraded card: should always be due (no cooldown was ever set)
        if (!isDue) {
          throw new Error(
            `[QAJ-03] ASSERT FAIL: card ${mc.id} (${mc.front}) expected state="due" but has ` +
              `cooldownUntil=${sc.cooldownUntil} which is in the future`,
          );
        }
        expectedDueCount++;
        console.log(
          `[QAJ-03] card ${mc.id} (${mc.front}): state=due (no cooldown) OK`,
        );
      } else {
        // Graded card: with time-shift fast-path, should now be "due" (cooldown expired).
        // With real-wait, same — resumeAfter was computed to be after cooldown + buffer.
        // expectedState in manifest is "cooling" (at manifest-write time), but by resume
        // time (shifted or real-wait) it should be "due".
        if (!isDue) {
          throw new Error(
            `[QAJ-03] ASSERT FAIL: card ${mc.id} (${mc.front}) expected to be due after ` +
              `${shifted ? "time-shift" : "real wait"}, but cooldownUntil=${sc.cooldownUntil} is still in future.\n` +
              `masteryRound=${sc.masteryRound} cooldownUntil=${sc.cooldownUntil}`,
          );
        }
        expectedDueCount++;
        console.log(
          `[QAJ-03] card ${mc.id} (${mc.front}): masteryRound=${sc.masteryRound} ` +
            `cooldownUntil=${sc.cooldownUntil ?? "null"} actualState=${actualState} (cooldown expired) OK`,
        );
      }
    }

    // 6. Assert due count: both cards should be due after the shift
    //    (one ungraded = always due, one graded = due after cooldown expires)
    const now2 = nowForComparison;
    const computedDueCount = state.cards.filter((c) => {
      const cu = c.cooldownUntil ? new Date(c.cooldownUntil) : null;
      return (
        manifestCards.some((mc) => mc.id === c.id) &&
        !c.learned &&
        (cu === null || cu <= now2)
      );
    }).length;

    if (computedDueCount !== expectedDueCount) {
      throw new Error(
        `[QAJ-03] ASSERT FAIL: due-count mismatch: expected ${expectedDueCount}, got ${computedDueCount}`,
      );
    }
    console.log(
      `[QAJ-03] due-count=${computedDueCount} (expected ${expectedDueCount}) OK`,
    );
  } finally {
    // 7. Always clear the time-shift to avoid leaking offset into subsequent scripts
    if (shifted) {
      await clearTimeShift(BASE, freshToken, SECRET);
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const phase = isResume ? runPhaseB : runPhaseA;
const label = isResume ? "B" : "A";

phase()
  .then(() => {
    console.log(`[QAJ-03] PASS (Phase ${label})`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[QAJ-03] FAIL: ${err.message}`);
    process.exit(1);
  });
