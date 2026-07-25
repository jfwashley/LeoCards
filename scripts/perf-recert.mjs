#!/usr/bin/env node
// scripts/perf-recert.mjs — Phase 18 PERF-06 (D-05/D-06/D-07/D-09/D-11/D-12/D-14/D-15)
//
// Single-command re-cert gate. Composes the two existing harnesses (never
// rebuilds/reimplements them):
//   1. CWV half   — spawns scripts/measure-cwv.mjs against warm prod (mobile
//                   default, D-08; --desktop for the full picture), reads its
//                   written per-route JSON medians, evaluates each route
//                   against the locked Plan 03 threshold table via
//                   evaluateGates() (D-09 absolute gates + drift warnings,
//                   D-11 accepted-miss exceptions honored).
//   2. Nav-gate half — builds + serves a local prod build and runs the
//                   existing e2e/13-perf.spec.ts instant-nav gate (850ms,
//                   D-12), never rebuilding that gate's own logic.
// Both halves aggregate into ONE PASS/FAIL/WARN table, ONE dated report
// (markdown + JSON, D-07 — written even on failure), and ONE process exit
// code (non-zero on any hard-gate failure).
//
// ── REQUIRED ENV ─────────────────────────────────────────────────────────
//
//   DATABASE_URL   — Neon Postgres connection string. Not read directly by
//                    this orchestrator — it is forwarded, unread and
//                    unlogged, to the spawned measure-cwv.mjs child, which
//                    requires it for provisioning + cleanup.
//
// ── OPTIONAL ENV ─────────────────────────────────────────────────────────
//
//   GATE_LCP       — override the LCP hard-gate (ms) for every route.
//   GATE_TBT       — override the TBT hard-gate (ms) for every route.
//   GATE_CLS       — override the CLS hard-gate (unitless) for every route.
//   GATE_PERF      — override the Lighthouse Perf-score hard-gate (0-100).
//                    Each override is validated Number.isFinite() BEFORE any
//                    measurement runs — a malformed value (e.g. "abc") fails
//                    loud and aborts immediately rather than silently
//                    disabling the gate (T-18-03b).
//
// ── OPTIONAL FLAGS ─────────────────────────────────────────────────────────
//
//   --desktop      — also read + display each route's desktop-preset medians
//                    (informational; the mobile preset remains the sole
//                    hard-gate basis per D-08).
//
// ── USAGE ─────────────────────────────────────────────────────────────────
//
//   # Full re-cert (mobile-only CWV half + nav-gate half):
//   DATABASE_URL="..." npm run perf:recert
//
//   # Include the desktop preset for the full picture:
//   DATABASE_URL="..." npm run perf:recert -- --desktop
//
//   # Force a hard-gate failure for the red-path demo (Plan 05):
//   DATABASE_URL="..." GATE_TBT=1 npm run perf:recert
//
// ── CADENCE (D-15) ──────────────────────────────────────────────────────────
//
//   Run this gate ON DEMAND after any deploy touching perf-relevant
//   surfaces — bundle dependencies, shared layout/providers, route pages,
//   next.config.ts — and before any release/milestone. There is no CI
//   integration this phase (D-14): the gate runs locally, by a human,
//   whenever the above cadence applies. See AGENTS.md for the mirrored
//   convention note.
//
// ── SECURITY ──────────────────────────────────────────────────────────────
//
//   - DATABASE_URL and any session tokens are passed via `env` to spawned
//     children ONLY — never via argv, never logged. This orchestrator never
//     reads DATABASE_URL itself; it only forwards process.env unmodified.
//   - Never `import` scripts/qa-lib.mjs or scripts/measure-cwv.mjs — both
//     exit at module load without their required env vars. Compose via
//     spawnSync child processes and read back their written JSON artifacts
//     instead (mirrors measure-cwv.mjs's own runCleanup() pattern).

import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateGates, resolveRoutes } from "./measure-cwv-lib.mjs";

// ── Root resolution (mirrors measure-cwv.mjs / qa-run.mjs pattern) ──────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PHASE_DIR = path.join(
  ROOT,
  ".planning",
  "phases",
  "18-field-validation-guardrails",
);
const BASELINE_PATH = path.join(PHASE_DIR, "18-baseline-thresholds.json");
const MEASURE_CWV_PATH = path.join(ROOT, "scripts", "measure-cwv.mjs");
const MEASUREMENTS_DIR = path.join(PHASE_DIR, "measurements");

const DESKTOP_FLAG = process.argv.includes("--desktop");

// ── Env-var gate override validation (T-18-03b) ──────────────────────────────
//
// A malformed GATE_* override must abort loud, BEFORE any measurement runs —
// a NaN threshold would make `median > NaN` always false, silently DISABLING
// the gate instead of failing it. Mirrors measure-cwv.mjs's
// `ROUTES.length === 0` fail-loud guard.

/**
 * Resolve one gate threshold: an env override if set (validated finite), or
 * the supplied default.
 *
 * @param {string} envVar — e.g. "GATE_LCP"
 * @param {number} fallback — the default threshold (route gate or D-11
 *   exception value)
 * @returns {number}
 */
function resolveOverride(envVar, fallback) {
  const raw = process.env[envVar];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    console.error(
      `[perf-recert] FATAL: ${envVar}="${raw}" is not a finite number — ` +
        "aborting BEFORE any measurement runs (a NaN threshold would " +
        "silently disable this gate instead of failing it).",
    );
    process.exit(1);
  }
  return parsed;
}

/**
 * Overlay the GATE_LCP/GATE_TBT/GATE_CLS/GATE_PERF env vars onto a route's
 * default thresholds, validating each with Number.isFinite() before use.
 *
 * @param {{lcp:number, tbt:number, cls:number, score:number}} defaults
 * @returns {{lcp:number, tbt:number, cls:number, score:number}}
 */
function resolveThresholds(defaults) {
  return {
    lcp: resolveOverride("GATE_LCP", defaults.lcp),
    tbt: resolveOverride("GATE_TBT", defaults.tbt),
    cls: resolveOverride("GATE_CLS", defaults.cls),
    score: resolveOverride("GATE_PERF", defaults.score),
  };
}

/**
 * Map a route path to its filename-safe slug — mirrors measure-cwv.mjs's
 * own slugify() (duplicated here, not imported, since measure-cwv.mjs must
 * never be statically imported — see header SECURITY note).
 *
 * @param {string} route
 * @returns {string}
 */
function slugify(route) {
  return route.replace(/^\//, "").replace(/\//g, "-") || "root";
}

/**
 * Derive a route's PASS/FAIL/WARN status from an evaluateGates() result.
 *
 * @param {{hardFail: boolean, failures: string[], warnings: string[]}} evalResult
 * @returns {"PASS"|"FAIL"|"WARN"}
 */
function statusFor(evalResult) {
  if (evalResult.hardFail) return "FAIL";
  if (evalResult.warnings.length > 0) return "WARN";
  return "PASS";
}

// ── Atomic file writes (write-to-.tmp-then-rename) — mirrors
// measure-cwv.mjs's writeJsonAtomic/writeTextAtomic exactly ───────────────

/**
 * @param {string} filePath
 * @param {unknown} obj
 */
async function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await rename(tmp, filePath);
}

/**
 * @param {string} filePath
 * @param {string} content
 */
async function writeTextAtomic(filePath, content) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, filePath);
}

/**
 * Build the dated run id used for the report filenames (D-07): one file per
 * run, never overwritten.
 *
 * @param {Date} date
 * @returns {string} e.g. "recert-2026-07-25-1430"
 */
function formatRunId(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `recert-${y}-${m}-${d}-${hh}${mm}`;
}

// ── CWV half (Task 1) ─────────────────────────────────────────────────────

/**
 * Spawn scripts/measure-cwv.mjs as a child process (never imported — its
 * top-level DATABASE_URL guard exits at module load) against the resolved
 * per-run output directory, then read back each route's written
 * `${slug}-mobile-runs.json` (and `-desktop-runs.json` when --desktop is
 * passed) and evaluate every route's medians against its resolved
 * threshold (route gates, D-11 exceptions overlaid, then GATE_* env
 * overrides overlaid last so the red-path demo can force ANY gate,
 * including an already-excepted one).
 *
 * @param {Record<string, {medians: object, gates: object, exceptions: object}>} routes
 * @param {number} driftPct
 * @param {string} cwvOutDirAbs — absolute path measure-cwv.mjs will write into
 * @param {string} cwvOutDirRel — same path, relative to ROOT (PHASE_OUT_DIR)
 * @returns {Promise<{ rows: Array<object>, cwvSpawnOk: boolean }>}
 */
async function runCwvHalf(routes, driftPct, cwvOutDirAbs, cwvOutDirRel) {
  console.log(
    "\n[perf-recert] ============================================================",
  );
  console.log("[perf-recert] CWV half — spawning measure-cwv.mjs");
  console.log(
    "[perf-recert] ============================================================",
  );

  const cwvSpawnResult = spawnSync(process.execPath, [MEASURE_CWV_PATH], {
    stdio: "inherit",
    env: { ...process.env, PHASE_OUT_DIR: cwvOutDirRel },
  });
  const cwvSpawnOk = (cwvSpawnResult.status ?? 1) === 0;
  if (!cwvSpawnOk) {
    console.error(
      "[perf-recert] measure-cwv.mjs exited non-zero — attempting to read " +
        "back whatever artifacts it did write before marking this run FAILED",
    );
  }

  const rows = [];
  for (const [route, cfg] of Object.entries(routes)) {
    const slug = slugify(route);
    // Overlay order: route gates -> D-11 exceptions -> GATE_* env overrides
    // (env overrides win last so the red-path demo can force a fail even on
    // an already-excepted route). resolveThresholds() itself validates any
    // GATE_* override with Number.isFinite() — but that validation already
    // ran BEFORE this function was ever called (see main()), so no
    // measurement time is wasted on a malformed override.
    const thresholds = resolveThresholds({ ...cfg.gates, ...cfg.exceptions });

    try {
      const mobileRaw = await readFile(
        path.join(cwvOutDirAbs, `${slug}-mobile-runs.json`),
        "utf8",
      );
      const { medians: mobileMedians } = JSON.parse(mobileRaw);
      const evalResult = evaluateGates(
        mobileMedians,
        thresholds,
        cfg.medians,
        driftPct,
      );

      let desktopMedians = null;
      if (DESKTOP_FLAG) {
        try {
          const desktopRaw = await readFile(
            path.join(cwvOutDirAbs, `${slug}-desktop-runs.json`),
            "utf8",
          );
          desktopMedians = JSON.parse(desktopRaw).medians;
        } catch (err) {
          console.error(
            `[perf-recert] --desktop: could not read desktop medians for ${route}: ${err.message}`,
          );
        }
      }

      rows.push({
        route,
        preset: "mobile",
        status: statusFor(evalResult),
        medians: mobileMedians,
        thresholds,
        failures: evalResult.failures,
        warnings: evalResult.warnings,
      });
      if (desktopMedians) {
        rows.push({
          route,
          preset: "desktop (informational)",
          status: "INFO",
          medians: desktopMedians,
          thresholds,
          failures: [],
          warnings: [],
        });
      }
    } catch (err) {
      rows.push({
        route,
        preset: "mobile",
        status: "FAIL",
        medians: null,
        thresholds,
        failures: [`measurement artifact missing/unreadable: ${err.message}`],
        warnings: [],
      });
    }
  }

  return { rows, cwvSpawnOk };
}

// ── Nav-gate half (Task 2) ────────────────────────────────────────────────
//
// Run SEQUENTIALLY after the CWV half (never parallel — self-contention
// would skew timing; also fits the D-06 ~35-40 min serial budget). Manages
// the local prod-build server lifecycle itself, since playwright.config.ts
// has `webServer: undefined` (Pitfall 7) — it never reimplements the
// instant-nav gate's own assertions, it only invokes the existing
// e2e/13-perf.spec.ts test file under PERF_PROD_BUILD=1.

const NAV_GATE_SERVER_URL = "http://localhost:3000";
const NAV_GATE_SERVER_TIMEOUT_MS = 90_000;

/**
 * Poll a URL with `fetch` until it responds (any status), the timeout
 * elapses, or the spawned server child is detected dead (CR-01: without the
 * `died` check, a `next start` that exits immediately — e.g. port in use —
 * would be polled for the full 90s and then misreported as a timeout).
 *
 * @param {string} url
 * @param {number} timeoutMs
 * @param {() => boolean} [childDied] — returns true once the server child
 *   has exited/errored; checked before every poll attempt
 * @returns {Promise<"up"|"timeout"|"died">}
 */
async function waitForServer(url, timeoutMs, childDied = () => false) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (childDied()) return "died";
    try {
      await fetch(url);
      return "up";
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return childDied() ? "died" : "timeout";
}

/**
 * Kill a spawned child (and, on Windows, its full process tree — `npm run
 * start` wraps `next start` in a child of its own, and a bare
 * `child.kill()` would only signal the npm wrapper, leaking the actual
 * `next start` server on port 3000). Best-effort: never throws.
 *
 * @param {import('node:child_process').ChildProcess} child
 */
function killProcessTree(child) {
  if (!child || child.pid === undefined) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    } else {
      child.kill("SIGTERM");
    }
  } catch (err) {
    console.error(
      `[perf-recert] failed to kill nav-gate server (pid ${child.pid}): ${err.message}`,
    );
  }
}

/**
 * Build + serve a local prod build, then run the existing instant-nav gate
 * (e2e/13-perf.spec.ts, "instant-nav" grep, D-12: 850ms) against it under
 * PERF_PROD_BUILD=1 — the sole prod-vs-dev signal (e2e/perf-markers.ts).
 * The server child is ALWAYS killed in `finally`, regardless of pass/fail/
 * throw (mirrors measure-cwv.mjs's browser-close-in-finally discipline;
 * T-18-07: a leaked `next start` server would occupy port 3000 for every
 * later run).
 *
 * @returns {Promise<{ status: "PASS"|"FAIL", detail: string }>}
 */
async function runNavGateHalf() {
  console.log(
    "\n[perf-recert] ============================================================",
  );
  console.log(
    "[perf-recert] Nav-gate half — local prod build + instant-nav gate (850ms)",
  );
  console.log(
    "[perf-recert] ============================================================",
  );

  // CR-01 preflight: fail loud if ANYTHING already answers on port 3000
  // BEFORE building/spawning. A stale leaked prod server here would be
  // silently certified in place of the fresh build (false PASS); a running
  // dev server would be measured under PERF_PROD_BUILD=1 (false FAIL) —
  // both violate D-09's "red must mean a real regression, never noise".
  let alreadyUp = false;
  try {
    await fetch(NAV_GATE_SERVER_URL, { signal: AbortSignal.timeout(2000) });
    alreadyUp = true;
  } catch {
    // port free (connection refused / timed out) — expected, proceed
  }
  if (alreadyUp) {
    return {
      status: "FAIL",
      detail:
        `something is already serving ${NAV_GATE_SERVER_URL} — stop it first ` +
        "(a stale/dev server here would be certified in place of the fresh prod build)",
    };
  }

  console.log("[perf-recert] building local prod build (npm run build)...");
  const buildResult = spawnSync("npm", ["run", "build"], {
    stdio: "inherit",
    cwd: ROOT,
    shell: true,
  });
  if ((buildResult.status ?? 1) !== 0) {
    return { status: "FAIL", detail: "npm run build failed" };
  }

  let serverChild;
  try {
    console.log("[perf-recert] starting local prod server (npm run start)...");
    serverChild = spawn("npm", ["run", "start"], {
      cwd: ROOT,
      stdio: "ignore",
      shell: true,
    });

    // CR-01: with stdio "ignore" an immediate child death (e.g. `next
    // start` port-in-use error) is otherwise invisible — track it so
    // waitForServer fails loud instead of polling a dead server.
    let serverExited = false;
    serverChild.on("exit", () => {
      serverExited = true;
    });
    serverChild.on("error", () => {
      serverExited = true;
    });

    const up = await waitForServer(
      NAV_GATE_SERVER_URL,
      NAV_GATE_SERVER_TIMEOUT_MS,
      () => serverExited,
    );
    if (up === "died") {
      return {
        status: "FAIL",
        detail:
          "local prod server (npm run start) exited before responding — " +
          "check the build output and that port 3000 was free",
      };
    }
    if (up !== "up") {
      return {
        status: "FAIL",
        detail: `local prod server did not respond at ${NAV_GATE_SERVER_URL} within ${NAV_GATE_SERVER_TIMEOUT_MS}ms`,
      };
    }

    console.log(
      "[perf-recert] running e2e/13-perf.spec.ts instant-nav gate (PERF_PROD_BUILD=1)...",
    );
    const testResult = spawnSync(
      "npx",
      ["playwright", "test", "e2e/13-perf.spec.ts", "--grep", "instant-nav"],
      {
        stdio: "inherit",
        cwd: ROOT,
        shell: true,
        env: { ...process.env, PERF_PROD_BUILD: "1" },
      },
    );
    const passed = (testResult.status ?? 1) === 0;
    return {
      status: passed ? "PASS" : "FAIL",
      detail: passed
        ? "instant-nav gate passed (<=850ms median, D-12)"
        : "instant-nav gate FAILED — see playwright output above",
    };
  } finally {
    // T-18-07: kill the server child regardless of pass/fail/throw.
    killProcessTree(serverChild);
  }
}

// ── Report rendering ─────────────────────────────────────────────────────

/**
 * @param {Array<object>} cwvRows
 * @returns {string} markdown table
 */
function renderCwvTable(cwvRows) {
  const lines = [];
  lines.push("| Route | Preset | Status | Details |");
  lines.push("|-------|--------|--------|---------|");
  for (const row of cwvRows) {
    const details =
      [...row.failures, ...row.warnings].join("; ") || "all gates pass";
    lines.push(`| ${row.route} | ${row.preset} | ${row.status} | ${details} |`);
  }
  return lines.join("\n");
}

/**
 * @param {{ runId: string, dateIso: string, cwvRows: Array<object>, cwvSpawnOk: boolean, navResult: {status: string, detail: string}|null, exitCode: number }} input
 * @returns {string} markdown report
 */
function renderReportMarkdown({
  runId,
  dateIso,
  cwvRows,
  cwvSpawnOk,
  navResult,
  exitCode,
}) {
  const lines = [];
  const overall = exitCode === 0 ? "PASSED" : "FAILED";
  lines.push(`# Phase 18 Re-cert — ${runId}`);
  lines.push("");
  lines.push(`**Date:** ${dateIso}`);
  lines.push(`**Overall:** ${overall}`);
  lines.push(
    `**measure-cwv.mjs exit:** ${cwvSpawnOk ? "0 (clean)" : "non-zero (see above)"}`,
  );
  lines.push("");
  lines.push("## CWV half (per-route gate evaluation)");
  lines.push("");
  lines.push(renderCwvTable(cwvRows));
  lines.push("");
  lines.push("## Nav-gate half (instant-nav, 850ms, D-12)");
  lines.push("");
  if (navResult) {
    lines.push("| Gate | Status | Detail |");
    lines.push("|------|--------|--------|");
    lines.push(`| instant-nav | ${navResult.status} | ${navResult.detail} |`);
  } else {
    lines.push("_(not run — CWV half aborted before this half started)_");
  }
  lines.push("");
  return lines.join("\n");
}

// ── Main execution ────────────────────────────────────────────────────────

console.log(
  "[perf-recert] ============================================================",
);
console.log("[perf-recert] LeoCards perf re-cert gate — Phase 18 PERF-06");
console.log(
  "[perf-recert] ============================================================",
);

let exitCode = 0;
let cwvRows = [];
let cwvSpawnOk = false;
let navResult = null;
const runDate = new Date();
const runId = formatRunId(runDate);

try {
  // 1. Load the immutable Plan 03 threshold table.
  const baselineRaw = await readFile(BASELINE_PATH, "utf8");
  const baseline = JSON.parse(baselineRaw);
  const driftPct = baseline.driftPct ?? 15;

  // 2. Validate the baseline table + every route's GATE_* overrides NOW,
  //    before any measurement runs (T-18-03b / WR-01) — a malformed
  //    override, a missing/typo'd gate key, or a non-numeric driftPct
  //    would make `median > NaN`/`> undefined` always false, silently
  //    DISABLING that gate/warning instead of failing it.
  if (!Number.isFinite(driftPct)) {
    throw new Error(
      `baseline "driftPct" is not a finite number (got ${JSON.stringify(
        baseline.driftPct,
      )}) — a non-finite driftPct silently disables every drift warning`,
    );
  }
  for (const route of resolveRoutes(null)) {
    if (!Object.hasOwn(baseline.routes ?? {}, route)) {
      throw new Error(
        `baseline.routes is missing expected key route "${route}" — ` +
          "refusing to certify a partial route set",
      );
    }
  }
  for (const [route, cfg] of Object.entries(baseline.routes)) {
    const resolved = resolveThresholds({ ...cfg.gates, ...cfg.exceptions });
    for (const key of ["lcp", "tbt", "cls", "score"]) {
      if (!Number.isFinite(resolved[key])) {
        throw new Error(
          `baseline thresholds for ${route} resolve to a missing/non-finite ` +
            `"${key}" — a non-finite threshold silently disables that gate ` +
            "instead of failing it (T-18-03b class)",
        );
      }
    }
    if (!cfg.medians || typeof cfg.medians !== "object") {
      throw new Error(
        `baseline route ${route} has no "medians" object — drift warnings ` +
          "for this route would be silently disabled",
      );
    }
  }

  // 3. Run the CWV half: spawn measure-cwv.mjs into a per-run output
  //    directory, read back its written medians, evaluate every route.
  const cwvOutDirRel = path.join(
    ".planning",
    "phases",
    "18-field-validation-guardrails",
    "measurements",
    runId,
    "cwv",
  );
  const cwvOutDirAbs = path.join(ROOT, cwvOutDirRel);
  const cwvHalfResult = await runCwvHalf(
    baseline.routes,
    driftPct,
    cwvOutDirAbs,
    cwvOutDirRel,
  );
  cwvRows = cwvHalfResult.rows;
  cwvSpawnOk = cwvHalfResult.cwvSpawnOk;

  const anyCwvHardFail = cwvRows.some((row) => row.status === "FAIL");

  // 4. Run the nav-gate half SEQUENTIALLY after the CWV half (never
  //    Promise.all — self-contention would skew timing, D-06 budget).
  navResult = await runNavGateHalf();

  if (anyCwvHardFail || !cwvSpawnOk || navResult.status === "FAIL") {
    exitCode = 1;
  }
} catch (err) {
  console.error(`\n[perf-recert] FAIL — ${err.message}`);
  exitCode = 1;
} finally {
  // D-07: a FAILED run still writes its report, marked FAILED.
  await mkdir(MEASUREMENTS_DIR, { recursive: true });
  const dateIso = runDate.toISOString();
  const reportMd = renderReportMarkdown({
    runId,
    dateIso,
    cwvRows,
    cwvSpawnOk,
    navResult,
    exitCode,
  });
  await writeTextAtomic(path.join(MEASUREMENTS_DIR, `${runId}.md`), reportMd);
  await writeJsonAtomic(path.join(MEASUREMENTS_DIR, `${runId}.json`), {
    runId,
    dateIso,
    exitCode,
    cwvSpawnOk,
    cwv: cwvRows,
    nav: navResult,
  });
  console.log(`\n[perf-recert] wrote ${runId}.md / ${runId}.json`);
  console.log("\n[perf-recert] --- Aggregate CWV table ---");
  console.log(renderCwvTable(cwvRows));
  console.log("\n[perf-recert] --- Nav-gate half ---");
  console.log(
    navResult
      ? `instant-nav: ${navResult.status} — ${navResult.detail}`
      : "(not run — CWV half aborted before this half started)",
  );
  console.log(
    `\n[perf-recert] Overall: ${exitCode === 0 ? "PASSED" : "FAILED"}`,
  );
}

process.exit(exitCode);
