#!/usr/bin/env node
// scripts/qa-run.mjs — Phase 15 Plan 05: QA harness orchestrator (D-01 / D-04)
//
// Runs all five core-journey QA scripts in sequence, self-cleans test users via
// cleanup-test-users.mjs, and exits non-zero if any journey or cleanup fails.
//
// ── COOLDOWN-REGIME CONTRACT ──────────────────────────────────────────────────
//
//   This orchestrator defaults to the TIME-SHIFT FAST PATH (option a in the plan).
//
//   qa-01 (learn-card): asserts cooldownUntil is non-null and ~1 minute in the
//     future. This assertion REQUIRES the dev server to have been started with
//     STUDY_COOLDOWN_MINUTES=1. STUDY_COOLDOWN_MINUTES is evaluated at module-load
//     time inside the Next.js route handler, so the dev server MUST be restarted
//     with it set before running qa-run.mjs:
//
//       STUDY_COOLDOWN_MINUTES=1 npm run dev
//
//     If the dev server was started WITHOUT STUDY_COOLDOWN_MINUTES=1, qa-01 will
//     fail the cooldownUntil assertion (it will be null instead of ~1 min in future).
//
//   qa-02 (mastery): zero-cooldown — OK with any server boot.
//
//   qa-03 (resume):  two phases driven by the orchestrator:
//     Phase A — provision + grade (needs STUDY_COOLDOWN_MINUTES=1 on dev server,
//       same as qa-01, so both share the same server-boot regime).
//     Phase B — resume with time-shift fast path (--resume flag); no real wait.
//     The orchestrator always invokes Phase B with --resume immediately after Phase A
//     exits 0, relying on qa-03's built-in fast-path (no STUDY_COOLDOWN_MINUTES
//     needed at the orchestrator level — qa-03 computes the shift itself).
//
//   qa-04 (habitat): zero-cooldown — OK with any server boot.
//
//   qa-05 (decay):   time-shift, zero-cooldown fine.
//
//   SUMMARY: start the dev server ONCE with STUDY_COOLDOWN_MINUTES=1 and this
//   script drives all five journeys without server restarts or real waits.
//
// ── REQUIRED ENV ─────────────────────────────────────────────────────────────
//
//   DATABASE_URL        — Neon Postgres connection string (provisioning + cleanup)
//   DEBUG_CHEAT_SECRET  — Secret for /api/debug/* endpoints (time-shift + state)
//
// ── OPTIONAL ENV ─────────────────────────────────────────────────────────────
//
//   QA_BASE_URL         — App origin (default: http://localhost:3000)
//   CLEANUP_DB_URL      — DB URL for cleanup (falls back to DATABASE_URL if unset)
//
// ── USAGE ─────────────────────────────────────────────────────────────────────
//
//   # Start the dev server with the 1-minute cooldown:
//   STUDY_COOLDOWN_MINUTES=1 npm run dev
//
//   # In a separate terminal, run the full harness:
//   npm run qa:run
//
//   # Or directly:
//   DATABASE_URL="..." DEBUG_CHEAT_SECRET="..." npm run qa:run
//
// ── SELF-CLEAN (QAJ-06) ───────────────────────────────────────────────────────
//
//   After all journeys (success or failure), cleanup-test-users.mjs is invoked
//   with the "%@test.local" pattern via a `finally` block. This guarantees zero
//   residue in the database regardless of whether journeys pass or fail (T-15-16).
//
// ── EXIT CODE ─────────────────────────────────────────────────────────────────
//
//   Exit 0: all five journeys PASSED + cleanup succeeded.
//   Exit 1: one or more journeys FAILED, or cleanup failed.
//
// ── SECURITY (T-15-16 to T-15-18) ────────────────────────────────────────────
//
//   - qa-run ALWAYS passes the literal "%@test.local" pattern to cleanup; the
//     cleanup script itself re-guards with /@(leocards-)?test\.local$/ and refuses
//     any non-test domain (T-15-16).
//   - Journeys are spawned with { stdio: "inherit" } — their output is forwarded
//     but this script adds no secret logging of its own (T-15-18).
//   - spawnSync per journey is sequential; non-zero exit records the failure and
//     continues to cleanup in a finally block (no orphaned test users) (T-15-17).

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// ── Required env guard ────────────────────────────────────────────────────────

const _dbUrl = process.env.DATABASE_URL;
if (!_dbUrl) {
  console.error(
    "[qa-run] FATAL: DATABASE_URL is required (Neon connection string for provisioning + cleanup)",
  );
  process.exit(1);
}

const _secret = process.env.DEBUG_CHEAT_SECRET;
if (!_secret) {
  console.error(
    "[qa-run] FATAL: DEBUG_CHEAT_SECRET is required (secret for /api/debug/* endpoints)",
  );
  process.exit(1);
}

// ── Journey definitions ───────────────────────────────────────────────────────
//
// qa-03 is a two-phase script: Phase A (no flag) then Phase B (--resume).
// The orchestrator runs them as two separate steps. If Phase A fails, Phase B
// is skipped (it would fail too — no manifest was written).

const JOURNEYS = [
  {
    id: "QAJ-01",
    name: "learn-card",
    script: "qa-01-learn-card.mjs",
    args: [],
  },
  {
    id: "QAJ-02",
    name: "mastery",
    script: "qa-02-mastery.mjs",
    args: [],
  },
  {
    id: "QAJ-03-A",
    name: "resume (Phase A: provision + grade + manifest)",
    script: "qa-03-resume.mjs",
    args: [],
    // Phase B runs only if Phase A passes
    phaseBOnPassOf: "QAJ-03-A",
  },
  {
    id: "QAJ-03-B",
    name: "resume (Phase B: re-auth + time-shift + assert)",
    script: "qa-03-resume.mjs",
    args: ["--resume"],
    // skipIfFailed: populated at runtime — skip Phase B if Phase A failed
    skipIfFailed: "QAJ-03-A",
  },
  {
    id: "QAJ-04",
    name: "habitat",
    script: "qa-04-habitat.mjs",
    args: [],
  },
  {
    id: "QAJ-05",
    name: "decay",
    script: "qa-05-decay.mjs",
    args: [],
  },
];

// ── Journey runner ────────────────────────────────────────────────────────────

/**
 * Spawn a journey script synchronously and return its exit status.
 * Returns 0 on success, non-zero on failure.
 * The script's stdout/stderr are forwarded to this process's stdio.
 *
 * @param {string} scriptName — basename of the script (e.g. "qa-01-learn-card.mjs")
 * @param {string[]} args — extra CLI args (e.g. ["--resume"])
 * @returns {number} exit code (0 = success)
 */
function runJourney(scriptName, args) {
  const scriptPath = path.join(ROOT, "scripts", scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env: process.env,
  });

  // spawnSync result.status is null if the process was killed by a signal;
  // treat signal-kills as exit code 1.
  return result.status ?? 1;
}

// ── Main execution ────────────────────────────────────────────────────────────

console.log(
  "[qa-run] ============================================================",
);
console.log("[qa-run] LeoCards core-journey QA harness — Phase 15 Plan 05");
console.log(
  `[qa-run] BASE_URL: ${process.env.QA_BASE_URL ?? "http://localhost:3000"}`,
);
console.log(
  "[qa-run] ============================================================",
);
console.log("");

/** @type {Map<string, {name: string, status: "PASS"|"FAIL"|"SKIP", exitCode: number}>} */
const results = new Map();

try {
  for (const journey of JOURNEYS) {
    // Skip Phase B if Phase A failed
    if (journey.skipIfFailed) {
      const dep = results.get(journey.skipIfFailed);
      if (dep && dep.status !== "PASS") {
        console.log(`\n[qa-run] --- ${journey.id}: ${journey.name} ---`);
        console.log(
          `[qa-run] SKIP: ${journey.id} skipped because ${journey.skipIfFailed} failed.`,
        );
        results.set(journey.id, {
          name: journey.name,
          status: "SKIP",
          exitCode: 1,
        });
        continue;
      }
    }

    console.log(`\n[qa-run] --- ${journey.id}: ${journey.name} ---`);

    const exitCode = runJourney(journey.script, journey.args);
    const status = exitCode === 0 ? "PASS" : "FAIL";

    results.set(journey.id, {
      name: journey.name,
      status,
      exitCode,
    });

    if (status === "PASS") {
      console.log(`\n[qa-run] ${journey.id} PASS`);
    } else {
      console.error(`\n[qa-run] ${journey.id} FAIL (exit ${exitCode})`);
    }
  }
} finally {
  // ── Self-clean (QAJ-06): ALWAYS run cleanup regardless of journey outcomes ──
  //
  // Invokes cleanup-test-users.mjs with the literal "%@test.local" pattern.
  // CLEANUP_DB_URL is preferred; falls back to DATABASE_URL (cleanup script
  // reads process.env.CLEANUP_DB_URL with a fallback to DATABASE_URL itself,
  // but we make the alias explicit here to match its expected env key).
  const cleanupEnv = {
    ...process.env,
    CLEANUP_DB_URL: process.env.CLEANUP_DB_URL ?? process.env.DATABASE_URL,
  };

  console.log("\n[qa-run] --- Cleanup (QAJ-06): remove *@test.local users ---");

  const cleanupScript = path.join(ROOT, "scripts", "cleanup-test-users.mjs");
  const cleanupResult = spawnSync(
    process.execPath,
    [cleanupScript, "%@test.local"],
    { stdio: "inherit", env: cleanupEnv },
  );

  const cleanupExitCode = cleanupResult.status ?? 1;
  const cleanupStatus = cleanupExitCode === 0 ? "PASS" : "FAIL";

  results.set("CLEANUP", {
    name: "cleanup *@test.local users (QAJ-06)",
    status: cleanupStatus,
    exitCode: cleanupExitCode,
  });

  if (cleanupStatus === "PASS") {
    console.log("\n[qa-run] CLEANUP PASS");
  } else {
    console.error(
      `\n[qa-run] CLEANUP FAIL (exit ${cleanupExitCode}) — test users may still be in the database`,
    );
  }

  // ── Summary report ──────────────────────────────────────────────────────────

  console.log(
    "\n[qa-run] ============================================================",
  );
  console.log("[qa-run] RESULTS SUMMARY");
  console.log(
    "[qa-run] ============================================================",
  );

  let allPassed = true;
  for (const [id, r] of results) {
    const icon =
      r.status === "PASS" ? "PASS" : r.status === "SKIP" ? "SKIP" : "FAIL";
    const marker = r.status === "PASS" ? " " : r.status === "SKIP" ? "!" : "X";
    console.log(`[qa-run]  [${marker}] ${id.padEnd(12)} ${icon}  ${r.name}`);
    if (r.status !== "PASS") {
      allPassed = false;
    }
  }

  console.log(
    "[qa-run] ============================================================",
  );

  if (allPassed) {
    console.log(
      "[qa-run] ALL JOURNEYS PASSED — harness complete, zero residue.",
    );
    process.exit(0);
  } else {
    const failCount = [...results.values()].filter(
      (r) => r.status === "FAIL",
    ).length;
    const skipCount = [...results.values()].filter(
      (r) => r.status === "SKIP",
    ).length;
    console.error(
      `[qa-run] FAIL — ${failCount} journey(s) failed, ${skipCount} skipped. See output above.`,
    );
    process.exit(1);
  }
}
