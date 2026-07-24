# Phase 18: Field validation & guardrails - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 6 (2 modified, 4 new)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/app/layout.tsx` | component (root layout) | event-driven (client RUM beacon) | `src/app/layout.tsx` (itself — in-place edit) | exact |
| `package.json` (`perf:recert` script entry) | config | request-response (CLI invocation) | `package.json` existing `measure:cwv`/`qa:run` entries | exact |
| `scripts/measure-cwv-lib.mjs` (extend: `evaluateGates`, `deriveExceptionGate`) | utility (pure lib) | transform | `scripts/measure-cwv-lib.mjs`'s existing `classifyBottleneck()`/`resolveRoutes()` | exact |
| `scripts/__tests__/measure-cwv-lib.test.ts` (extend) | test | transform | same file, existing `describe("classifyBottleneck")`/`describe("resolveRoutes")` blocks | exact |
| `scripts/perf-recert.mjs` (new orchestrator) | service (CLI orchestrator) | batch (composes two sub-processes + report write) | `scripts/measure-cwv.mjs` (harness/orchestrator shape) + `scripts/qa-run.mjs` (sequential spawn/report pattern) | role-match |
| `.planning/phases/18-field-validation-guardrails/{baseline,measurements}/*` (report artifacts) | config/output (dated markdown+JSON) | file-I/O | `.planning/phases/16-.../baseline/*` + `.planning/phases/17-.../measurements/*` (`writeJsonAtomic`/`writeTextAtomic`/`renderRouteReport`/`renderSummary` in `measure-cwv-lib.mjs`) | exact |

## Pattern Assignments

### `src/app/layout.tsx` (component, event-driven)

**Analog:** itself (in-place edit) — current full contents already read.

**Current imports** (lines 1-5):
```tsx
import "@/env";
import type { Metadata } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
```

**Integration point** (lines 25-44, current):
```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        figtree.variable,
        baloo2.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

**Pattern to apply** (per RESEARCH.md Pattern 3 — verified against official Vercel App Router quickstart): add one import line (`import { SpeedInsights } from "@vercel/speed-insights/next";` — note the `/next` entry point specifically, NOT the bare package or `/react`) and render `<SpeedInsights />` as a sibling to `{children}` inside `<body>`, matching this repo's existing style of appending non-content elements after `{children}` (there is no existing analog of a second body-level element in this file — this is the first one — so the diff is additive only, nothing else in the return statement changes).

No error handling, no auth, no validation needed — it's a Server Component wrapper with zero props and no I/O in this codebase's usage.

---

### `package.json` (config)

**Analog:** existing `scripts` block, specifically `measure:cwv` and `qa:run` entries (lines 23-26).

**Current pattern:**
```json
"qa:run": "node scripts/qa-run.mjs",
"measure:cwv": "node scripts/measure-cwv.mjs",
"measure:cleanup": "node scripts/cleanup-test-users.mjs %@test.local"
```

**Pattern to apply:** add `"perf:recert": "node scripts/perf-recert.mjs"` alongside these, same bare `node scripts/<name>.mjs` invocation style (no flags baked into the npm script — env vars like `DATABASE_URL`, `GATE_TBT`, `--desktop`/preset flags are passed at invocation time per the existing `measure:cwv` convention, e.g. `DATABASE_URL="..." npm run perf:recert`). Keep it in the same alphabetical/grouped neighborhood as the other perf-related scripts (`measure:cwv`, `measure:cleanup`).

---

### `scripts/measure-cwv-lib.mjs` (utility, transform — EXTEND existing file)

**Analog:** the file's own `classifyBottleneck()` (lines 160-171) and `resolveRoutes()`/`resolveOutDir()` (lines 309-369) — same file, new pure functions added alongside.

**Purity-contract header** (lines 1-26) — MUST be preserved/respected for anything added:
```javascript
// IMPORTANT: this module MUST remain pure and import-safe:
//   - NO process.env reads
//   - NO network calls (fetch/puppeteer-core/lighthouse)
//   - NO process.exit
//   - NO top-level await
```

**Core pattern to mirror — plain object in/out, throws on invalid input** (`classifyBottleneck`, lines 160-171):
```javascript
export function classifyBottleneck(metrics, bundleKb) {
  const bundleScore =
    Math.min(bundleKb / 800, 1) + Math.min(metrics.bootupTime / 2000, 1);
  const waterfallScore = Math.min(metrics.ttfb / 400, 1);
  const hydrationScore = Math.min(metrics.tbt / 800, 1);

  const max = Math.max(bundleScore, waterfallScore, hydrationScore);
  if (max === bundleScore) return { class: "bundle", score: bundleScore };
  if (max === waterfallScore)
    return { class: "RSC waterfall", score: waterfallScore };
  return { class: "hydration", score: hydrationScore };
}
```

**Fail-loud validation pattern to mirror** (`getBundleKb`, lines 125-144 — throws with an actionable message rather than silently propagating `NaN`):
```javascript
if (!Number.isFinite(item.firstLoadUncompressedJsBytes)) {
  throw new Error(
    `Bundle stats entry for ${route} has no finite firstLoadUncompressedJsBytes ` +
      `(got ${item.firstLoadUncompressedJsBytes}) — the stats file shape changed; ` +
      "re-run `npm run build` and check .next/diagnostics/route-bundle-stats.json",
  );
}
```

**New functions to add** (concrete signatures/body from RESEARCH.md's own verified draft, Pattern 1):
```javascript
/**
 * @param {Record<string, number>} medians
 * @param {{lcp:number, tbt:number, cls:number, score:number}} thresholds
 * @param {Record<string, number>|null} baseline
 * @param {number} driftPct
 * @returns {{route?: string, hardFail: boolean, failures: string[], warnings: string[]}}
 */
export function evaluateGates(medians, thresholds, baseline, driftPct = 15) {
  const failures = [];
  const warnings = [];
  if (medians.lcp > thresholds.lcp) failures.push(`LCP ${medians.lcp}ms > ${thresholds.lcp}ms`);
  if (medians.tbt > thresholds.tbt) failures.push(`TBT ${medians.tbt}ms > ${thresholds.tbt}ms`);
  if (medians.cls > thresholds.cls) failures.push(`CLS ${medians.cls} > ${thresholds.cls}`);
  if (medians.score < thresholds.score) failures.push(`Perf ${medians.score} < ${thresholds.score}`);

  if (baseline) {
    for (const key of ["lcp", "tbt", "cls"]) {
      const before = baseline[key];
      const after = medians[key];
      if (before > 0 && (after - before) / before > driftPct / 100) {
        warnings.push(`${key.toUpperCase()} drifted +${Math.round(((after - before) / before) * 100)}% vs baseline`);
      }
    }
  }
  return { hardFail: failures.length > 0, failures, warnings };
}
```

A companion `deriveExceptionGate(median, headroomPct = 15)` helper (D-11) should follow the same pure/plain-object contract — mechanically compute `Math.round(median * (1 + headroomPct / 100))` and return the gate value, with the same throw-on-invalid-input discipline (`Number.isFinite` guard) as `getBundleKb`.

**Important — V5 input validation gap called out in RESEARCH.md:** any `GATE_LCP`/`GATE_TBT`/`GATE_CLS`/`GATE_PERF` env-var parsing happens in the ORCHESTRATOR (`perf-recert.mjs`), not here — but `evaluateGates` itself should not need to guard against `NaN` thresholds if the caller validates first (mirrors the existing split: `measure-cwv.mjs` validates `ROUTE_FILTER`, `measure-cwv-lib.mjs`'s `resolveRoutes` assumes a clean string).

---

### `scripts/__tests__/measure-cwv-lib.test.ts` (test — EXTEND existing file)

**Analog:** same file's `describe("classifyBottleneck")` (lines 206-224) and `describe("resolveRoutes (Phase 17 D-09)")` (lines 226-282) blocks — direct structural template for the new `describe("evaluateGates")` block.

**Imports pattern** (lines 1-13 — add `evaluateGates`/`deriveExceptionGate` to this existing named-import list):
```typescript
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyBottleneck,
  computeMedians,
  extractMetrics,
  getBundleKb,
  median,
  resolveOutDir,
  resolveRoutes,
} from "../measure-cwv-lib.mjs";
```

**Test-case shape to mirror** (`classifyBottleneck` describe block, lines 206-224 — one `it` per branch/outcome):
```typescript
describe("classifyBottleneck", () => {
  it("classifies as 'bundle' when bundleKb is high with high bootupTime", () => {
    const metrics = { ttfb: 50, tbt: 50, bootupTime: 1900 };
    const result = classifyBottleneck(metrics, 750);
    expect(result.class).toBe("bundle");
  });
  // ...one it() per class outcome
});
```

**Required D-13 coverage (per CONTEXT.md + RESEARCH.md Validation Architecture):** all-pass case, single-metric-fail case (one `it` per metric: LCP/TBT/CLS/Perf), D-11 exception-gate-pass case (route that would fail the absolute gate but passes its derived exception), and D-09 drift-warning-without-failure case (metric >15% worse than baseline but still under the absolute threshold — assert `hardFail === false` and `warnings` is non-empty). Follow the synthetic-fixture style already used by `computeMedians`'s test (lines 37-92) for building realistic-looking median objects inline, not via the JSON fixture file (that fixture is bundle-stats-specific, unrelated to gate evaluation).

---

### `scripts/perf-recert.mjs` (new orchestrator — service, batch)

**Analog:** `scripts/measure-cwv.mjs` (overall script shape: shebang, header doc comment listing REQUIRED/OPTIONAL env + USAGE, root resolution, env guards, main try/finally/exit-code block, SIGINT/SIGTERM cleanup) + `scripts/qa-lib.mjs`'s `runCleanup()`-style `spawnSync` composition pattern.

**Header/env-guard pattern to mirror** (`measure-cwv.mjs` lines 1-51, 83-116):
```javascript
#!/usr/bin/env node
// scripts/measure-cwv.mjs — Phase 16 PERF-01/PERF-02, extended Phase 17 D-09
//
// ── REQUIRED ENV ─────────────────────────────────────────────────────────
//   DATABASE_URL   — ...
// ── OPTIONAL ENV ─────────────────────────────────────────────────────────
//   ROUTE_FILTER   — ...
//   PHASE_OUT_DIR  — ...
// ── USAGE ─────────────────────────────────────────────────────────────────
//   DATABASE_URL="..." node scripts/measure-cwv.mjs
// ── SECURITY ──────────────────────────────────────────────────────────────
//   - Session tokens are NEVER logged (follow qa-lib pattern).

import { fileURLToPath } from "node:url";
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
```
Apply D-15's requirement directly in this header: document the "run after perf-relevant deploys, before any release" cadence convention here (per D-15, also mirrored into AGENTS.md — not this agent's file to edit, but the planner should note the cross-reference).

**Critical anti-pattern — DO NOT import** (`measure-cwv.mjs` lines 97-104, `qa-lib.mjs` lines 38-50): never `import ... from "./qa-lib.mjs"` (exits at module load without `DEBUG_CHEAT_SECRET`) and never statically `import` `measure-cwv.mjs` itself as a module (it exits at load without `DATABASE_URL`). Compose via `spawnSync` child processes instead, exactly as `measure-cwv.mjs` itself does for cleanup:

**Child-process composition pattern to mirror** (`measure-cwv.mjs`'s `runCleanup()`, lines 740-758):
```javascript
function runCleanup() {
  const cleanupEnv = {
    ...process.env,
    CLEANUP_DB_URL: process.env.CLEANUP_DB_URL ?? process.env.DATABASE_URL,
  };
  console.log("\n[measure-cwv] --- Cleanup: remove *@test.local users ---");
  const cleanupScript = path.join(ROOT, "scripts", "cleanup-test-users.mjs");
  const cleanupResult = spawnSync(
    process.execPath,
    [cleanupScript, "%@test.local"],
    { stdio: "inherit", env: cleanupEnv },
  );
  if ((cleanupResult.status ?? 1) !== 0) {
    console.error("[measure-cwv] CLEANUP FAILED — test user may remain in DB");
    return false;
  }
  return true;
}
```
`perf-recert.mjs` should spawn `measure-cwv.mjs` the same way (`spawnSync(process.execPath, [path.join(ROOT, "scripts", "measure-cwv.mjs")], { stdio: "inherit", env: {...process.env, ...overrides} })`), then read its written JSON artifacts back via `readFile` (RESEARCH.md's "Reading the existing CWV harness's written JSON artifacts" code example) rather than re-parsing stdout.

**Atomic report-write pattern to mirror** (`measure-cwv.mjs`'s `writeJsonAtomic`/`writeTextAtomic`, lines 635-653 — write-to-`.tmp`-then-rename):
```javascript
async function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await rename(tmp, filePath);
}
```

**Exit-code + try/finally pattern to mirror** (`measure-cwv.mjs` lines 802-868 — set `exitCode`, never let a thrown error skip cleanup, `process.exit(exitCode)` as the last line):
```javascript
let exitCode = 0;
try {
  // ... run CWV half, run nav-gate half, evaluate gates, write report
} catch (err) {
  console.error(`\n[perf-recert] FAIL — ${err.message}`);
  exitCode = 1;
} finally {
  // teardown any spawned `next start` child (Pitfall 7)
}
process.exit(exitCode);
```

**Nav-gate half — lifecycle the orchestrator must manage itself** (per RESEARCH.md Pitfall 7 and Code Examples — `playwright.config.ts` line 34 confirms `webServer: undefined`, and `e2e/perf-markers.ts` lines 60-76 confirm `IS_PROD_BUILD = process.env.PERF_PROD_BUILD === "1"` is the sole prod-vs-dev signal): `perf-recert.mjs` must `spawnSync("npm", ["run", "build"])`, then spawn `next start` as a background child, poll `http://localhost:3000` until it responds, then `spawnSync("npx", ["playwright", "test", "e2e/13-perf.spec.ts"], { env: { ...process.env, PERF_PROD_BUILD: "1" } })`, then kill the `next start` child in a `finally` — mirroring `measure-cwv.mjs`'s browser-launch/browser-close-in-finally discipline (lines 296-310, 846-860) but for a server process instead of a browser.

**Env-var threshold override pattern** (RESEARCH.md Pattern 2, mirrors `measure-cwv.mjs`'s `process.env.ROUTE_FILTER ?? null` convention at line 344):
```javascript
function resolveThresholds(defaults) {
  return {
    lcp: Number(process.env.GATE_LCP ?? defaults.lcp),
    tbt: Number(process.env.GATE_TBT ?? defaults.tbt),
    cls: Number(process.env.GATE_CLS ?? defaults.cls),
    score: Number(process.env.GATE_PERF ?? defaults.score),
  };
}
```
Per RESEARCH.md's Security Domain (V5): validate each resolved value with `Number.isFinite()` before use and fail loud (mirroring `ROUTES.length === 0` guard at `measure-cwv.mjs` lines 351-357) — a malformed override producing `NaN` would otherwise make `medians.lcp > NaN` silently `false`, disabling the gate instead of failing it.

**Fail-loud guard pattern to mirror** (`measure-cwv.mjs` lines 344-357 — validate env-derived input before any expensive work runs):
```javascript
const ROUTES = resolveRoutes(process.env.ROUTE_FILTER ?? null);
if (ROUTES.length === 0) {
  console.error(
    `[measure-cwv] FATAL: ROUTE_FILTER="${process.env.ROUTE_FILTER}" matched no known routes ...`,
  );
  process.exit(1);
}
```

---

### Report artifacts (`.planning/phases/18-field-validation-guardrails/{baseline,measurements}/*`)

**Analog:** `.planning/phases/16-performance-baseline-measure/baseline/` (immutable, one-time) + `.planning/phases/17-performance-optimization/measurements/` (dated, per-run, `16-BASELINE-SUMMARY.md`-named summary despite living in a later phase dir — naming is inherited from the renderer, not re-derived per phase).

**Directory shape to mirror** (from `ls` of both existing dirs — per route: `<slug>-baseline.md`, `<slug>-mobile-runs.json`, `<slug>-desktop-runs.json`, plus one cross-route `16-BASELINE-SUMMARY.md`):
```
<phase-dir>/baseline/
├── 16-BASELINE-SUMMARY.md       # cross-route summary (renderSummary output)
├── dashboard-baseline.md
├── dashboard-mobile-runs.json
├── dashboard-desktop-runs.json
├── study-baseline.md / *-runs.json
├── deck-new-card-baseline.md / *-runs.json
└── deck-browse-baseline.md / *-runs.json
```
Note: the summary filename `16-BASELINE-SUMMARY.md` is a literal string baked into `writeReports()` (measure-cwv.mjs line 721) — it is NOT dynamically derived from the current phase number. The planner/implementer must decide whether to parameterize this (e.g. add a `SUMMARY_FILENAME` param) or accept the Phase-16-named file living inside the Phase 18 baseline dir (as Phase 17 already does, per its own `17-.../measurements/16-BASELINE-SUMMARY.md`, confirmed above) — flagging this as a concrete decision point, not assuming either way.

**Cross-route summary table markdown to mirror** (`16-BASELINE-SUMMARY.md`, full file):
```markdown
# Phase 16 Baseline — Cross-Route Summary

| Route | Mobile Perf | Desktop Perf | Bundle KB | Top Class |
|-------|-------------|--------------|-----------|-----------|
| /dashboard | 86 | 92 | 887 | bundle |
| /study | 82 | 90 | 657 | bundle |
| /deck/new-card | 79 | 90 | 1111 | bundle |
| /deck/browse | 84 | 92 | 526 | bundle |
```

**Per-run dated report naming (D-07 — new for Phase 18, no direct file-name analog since prior phases wrote one-time baselines, not repeated dated re-cert runs):** follow the project's `YYYY-MM-DD` dating convention seen elsewhere in `.planning/` phase docs (e.g. summary/verification doc headers use ISO dates like "2026-07-20"); a reasonable file name pattern extending the existing `<slug>-baseline.md` convention is `measurements/recert-<YYYY-MM-DD>-<HHmm>.md` + a sibling `.json`, written via the same `writeJsonAtomic`/`writeTextAtomic` helpers — never overwritten, one file per run (mirrors "Immutable committed measurement artifacts, dated, never re-edited" from CONTEXT.md's Established Patterns).

## Shared Patterns

### Atomic file writes (write-then-rename)
**Source:** `scripts/measure-cwv.mjs` lines 635-653 (`writeJsonAtomic`, `writeTextAtomic`)
**Apply to:** `scripts/perf-recert.mjs`'s dated report writer (D-07) and the D-10 fresh baseline writer.
```javascript
async function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await rename(tmp, filePath);
}
```

### Never import `qa-lib.mjs`; never statically import a module with a top-level env-exit guard
**Source:** `scripts/measure-cwv.mjs` lines 97-104 (documented gotcha, citing RESEARCH.md Pitfall 5); `scripts/qa-lib.mjs` lines 38-50 (the guard itself: `process.exit(1)` at module load if `DATABASE_URL`/`DEBUG_CHEAT_SECRET` unset).
**Apply to:** `scripts/perf-recert.mjs` — compose via `spawnSync` child processes (reading their written artifacts back), never `import`.

### Fail-loud on env-derived input before expensive work runs
**Source:** `scripts/measure-cwv.mjs` lines 344-357 (`ROUTES.length === 0` guard, printing valid options and exiting 1 before provisioning/browser launch).
**Apply to:** `scripts/perf-recert.mjs`'s `GATE_LCP`/`GATE_TBT`/`GATE_CLS`/`GATE_PERF` override parsing (validate `Number.isFinite` before calling `evaluateGates`) and any new route/preset flag handling.

### Sequential-only execution (never parallel) for anything timing-sensitive
**Source:** `scripts/measure-cwv.mjs` lines 435-437, 518-552 (`runMeasurements` — explicit "never parallel — self-contention skews TBT" comment).
**Apply to:** `scripts/perf-recert.mjs` must run the CWV half and the nav-gate half sequentially (not `Promise.all`), consistent with D-06's stated ~35-40 min total runtime budget already assuming serial execution.

### Session token / secret never logged
**Source:** `scripts/measure-cwv.mjs` line 264 comment ("Log only the email (never the token/password)"); `scripts/qa-lib.mjs` header security notes (lines 17-21).
**Apply to:** `scripts/perf-recert.mjs` if it ever threads `DATABASE_URL` or a session token between spawned children — log only non-secret identifiers (email, route, exit codes).

### Pure-lib zero-I/O contract for anything vitest needs to cover
**Source:** `scripts/measure-cwv-lib.mjs` lines 9-19 (module-level purity contract comment).
**Apply to:** `evaluateGates`/`deriveExceptionGate` — no `process.env`, no network, no `process.exit`, no top-level await, so `scripts/__tests__/measure-cwv-lib.test.ts` can import them directly.

## No Analog Found

None — every file this phase touches has a direct or role-matched analog already in the codebase (this phase is explicitly an EXTEND-not-rebuild phase per CONTEXT.md/RESEARCH.md).

## Metadata

**Analog search scope:** `scripts/`, `scripts/__tests__/`, `e2e/`, `src/app/`, `package.json`, `.planning/phases/16-performance-baseline-measure/`, `.planning/phases/17-performance-optimization/`
**Files scanned:** `src/app/layout.tsx`, `package.json`, `scripts/measure-cwv.mjs`, `scripts/measure-cwv-lib.mjs`, `scripts/__tests__/measure-cwv-lib.test.ts`, `scripts/qa-lib.mjs` (partial), `e2e/13-perf.spec.ts`, `e2e/perf-markers.ts`, `playwright.config.ts`, `.planning/phases/16-performance-baseline-measure/baseline/16-BASELINE-SUMMARY.md`, `.planning/phases/16-performance-baseline-measure/baseline/dashboard-mobile-runs.json`, directory listings of both Phase 16 `baseline/` and Phase 17 `measurements/`
**Pattern extraction date:** 2026-07-24
