#!/usr/bin/env node
// scripts/measure-cwv-lib.mjs — Phase 16 PERF-01/PERF-02, extended Phase 17 D-09
//
// Pure, side-effect-free computation + render helpers for the CWV baseline
// measurement harness. This module is the CONTRACT layer: Plan 02's
// side-effectful harness (scripts/measure-cwv.mjs) imports every function
// defined here rather than reimplementing them.
//
// IMPORTANT: this module MUST remain pure and import-safe:
//   - NO process.env reads
//   - NO network calls (fetch/puppeteer-core/lighthouse)
//   - NO process.exit
//   - NO top-level await
// The full harness (Plan 02) has a top-level DATABASE_URL guard +
// `await puppeteer.launch(...)` that would crash `npx vitest run` (which
// collects scripts/**/*.test.ts — only e2e/** is excluded). Splitting the
// pure logic out here means scripts/__tests__/measure-cwv-lib.test.ts can
// import these functions with zero side effects and no live DATABASE_URL
// or network access required.
//
// Phase 17 (D-09) ADDS resolveRoutes/resolveOutDir below — same purity
// contract: callers read process.env (ROUTE_FILTER/PHASE_OUT_DIR) and pass
// the resulting string in as a plain argument; these functions themselves
// never touch process.env directly. The one new import (node:path) is a
// pure built-in — no network, no process.exit, no top-level await — so it
// does not violate the module's import-safety contract above.

import * as path from "node:path";

// ── Metric shape ─────────────────────────────────────────────────────────
// { lcp, tbt, cls, fcp, ttfb, score, bootupTime }  — all numbers; cls is
// unitless, score is 0-100, the rest are milliseconds.

// ── BundleStat shape ─────────────────────────────────────────────────────
// (from .next/diagnostics/route-bundle-stats.json — VERIFIED array of):
//   { route: string, firstLoadUncompressedJsBytes: number, firstLoadChunkPaths: string[] }

/**
 * Compute the median of a numeric array.
 *
 * Sorts a COPY ascending (never mutates the input) and returns the true
 * middle-of-sorted value. For even-length arrays this returns the UPPER
 * of the two middle values (index `Math.floor(length / 2)`) — e.g.
 * [10, 20, 30, 40] -> 30. The shipped harness only ever passes odd-length
 * run sets (5 warm runs, D-06), where this is the true median. Do NOT
 * "fix" this to the lower middle: that would silently shift every future
 * baseline relative to Phase 16's committed numbers.
 *
 * @param {number[]} values
 * @returns {number}
 */
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Reduce an array of per-run Metric objects to one median-per-metric
 * object across lcp/tbt/cls/fcp/ttfb/score/bootupTime (D-06).
 *
 * @param {Array<Record<string, number>>} runs
 * @returns {Record<string, number>}
 */
export function computeMedians(runs) {
  const keys = ["lcp", "tbt", "cls", "fcp", "ttfb", "score", "bootupTime"];
  return Object.fromEntries(
    keys.map((k) => [k, median(runs.map((r) => r[k]))]),
  );
}

/**
 * Extract the Metric shape from a Lighthouse Result (lhr) object.
 *
 * Fails LOUD on errored audits (WR-04): under simulated throttling,
 * Lighthouse occasionally marks an audit errored (e.g. NO_LCP/NO_FCP) —
 * `numericValue` is then `undefined` and the category `score` is `null`.
 * Coercing those (Math.round(null * 100) === 0, undefined medians) would
 * produce a silently-garbage baseline, the exact failure class the
 * redirect guard (D-01/T-16-07) exists to prevent.
 *
 * @param {object} lhr
 * @returns {{ lcp: number, tbt: number, cls: number, fcp: number, ttfb: number, score: number, bootupTime: number }}
 * @throws if any required audit has no finite numericValue, or the
 *   performance category score is null/non-finite.
 */
export function extractMetrics(lhr) {
  const num = (id) => {
    const v = lhr.audits[id]?.numericValue;
    if (!Number.isFinite(v)) {
      throw new Error(
        `Lighthouse audit "${id}" has no finite numericValue ` +
          `(got ${v}, scoreDisplayMode: ${lhr.audits[id]?.scoreDisplayMode ?? "unknown"}) — ` +
          "the audit errored; refusing to record a garbage baseline",
      );
    }
    return v;
  };
  const perfScore = lhr.categories.performance.score;
  if (!Number.isFinite(perfScore)) {
    throw new Error(
      `Lighthouse performance score is ${perfScore} — a metric audit ` +
        "errored; refusing to record a garbage baseline",
    );
  }
  return {
    lcp: num("largest-contentful-paint"),
    tbt: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    fcp: num("first-contentful-paint"),
    ttfb: num("server-response-time"),
    score: Math.round(perfScore * 100),
    bootupTime: num("bootup-time"),
  };
}

/**
 * Parse the route-bundle-stats.json shape and return first-load JS KB +
 * chunk count + chunk paths for a route (D-05 bundle composition from
 * local build only).
 *
 * @param {Array<{route: string, firstLoadUncompressedJsBytes: number, firstLoadChunkPaths: string[]}>} stats
 * @param {string} route
 * @returns {{ kb: number, chunks: number, chunkPaths: string[] }}
 */
export function getBundleKb(stats, route) {
  const item = stats.find((s) => s.route === route);
  if (!item) {
    throw new Error(`Route not found in bundle stats: ${route}`);
  }
  // WR-07 (secondary): a renamed/missing byte field would otherwise render
  // as NaN KB in the committed report instead of failing loud.
  if (!Number.isFinite(item.firstLoadUncompressedJsBytes)) {
    throw new Error(
      `Bundle stats entry for ${route} has no finite firstLoadUncompressedJsBytes ` +
        `(got ${item.firstLoadUncompressedJsBytes}) — the stats file shape changed; ` +
        "re-run `npm run build` and check .next/diagnostics/route-bundle-stats.json",
    );
  }
  return {
    kb: Math.round(item.firstLoadUncompressedJsBytes / 1024),
    chunks: item.firstLoadChunkPaths.length,
    chunkPaths: item.firstLoadChunkPaths,
  };
}

/**
 * Classify a route's dominant performance bottleneck into exactly one of
 * the 3-way taxonomy named in PERF-02 / D-07: 'bundle' | 'RSC waterfall' | 'hydration'.
 *
 * Ranking rule (mechanical, per route):
 *   score_bundle    = bundleKb / 800 (capped 1) + bootupTime / 2000 (capped 1)
 *   score_waterfall = ttfb / 400 (capped 1)
 *   score_hydration = tbt / 800 (capped 1)
 *   top_class = argmax(score_bundle, score_waterfall, score_hydration)
 *
 * @param {{ ttfb: number, tbt: number, bootupTime: number }} metrics
 * @param {number} bundleKb
 * @returns {{ class: 'bundle'|'RSC waterfall'|'hydration', score: number }}
 */
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

/**
 * Render the per-route markdown baseline report: medians table + bundle
 * table + per-chunk chunkPaths fingerprint listing (PERF-02's chunk
 * fingerprinting deliverable) + bottleneck classification naming the top
 * Phase-17 target. Human-readable half of D-04.
 *
 * @param {{
 *   route: string,
 *   dateIso: string,
 *   mobile: Record<string, number>,
 *   desktop: Record<string, number>,
 *   bundle: { kb: number, chunks: number, chunkPaths: string[] },
 *   bottleneck: { class: 'bundle'|'RSC waterfall'|'hydration', score: number },
 * }} input
 * @returns {string} markdown
 */
export function renderRouteReport({
  route,
  dateIso,
  mobile,
  desktop,
  bundle,
  bottleneck,
}) {
  const lines = [];
  lines.push(`# Phase 16 Baseline — ${route}`);
  lines.push("");
  lines.push(`**Date:** ${dateIso}`);
  lines.push(
    "**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)",
  );
  lines.push(`**Target:** https://leocards.vercel.app${route} (warm prod)`);
  lines.push(
    "**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2-6",
  );
  lines.push("**Auth:** *@test.local provisioned user with deck + 5 cards");
  lines.push("");
  lines.push("## Medians");
  lines.push("");
  lines.push(
    "| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |",
  );
  lines.push(
    "|---------|----------|----------|-----|----------|-----------|------------|",
  );
  lines.push(
    `| mobile  | ${mobile.lcp} | ${mobile.tbt} | ${mobile.cls} | ${mobile.fcp} | ${mobile.ttfb} | ${mobile.score} |`,
  );
  lines.push(
    `| desktop | ${desktop.lcp} | ${desktop.tbt} | ${desktop.cls} | ${desktop.fcp} | ${desktop.ttfb} | ${desktop.score} |`,
  );
  lines.push("");
  lines.push("## Bundle Composition");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| First-load JS (uncompressed) | ${bundle.kb} KB |`);
  lines.push(`| Chunk count | ${bundle.chunks} |`);
  lines.push("");
  lines.push("### Chunk Fingerprint");
  lines.push("");
  if (bundle.chunkPaths.length === 0) {
    lines.push("_(no chunk paths reported)_");
  } else {
    for (const chunkPath of bundle.chunkPaths) {
      lines.push(`- ${chunkPath}`);
    }
  }
  lines.push("");
  lines.push("## Bottleneck Classification");
  lines.push("");
  lines.push(`**Top class:** ${bottleneck.class}`);
  lines.push(
    `**Primary Phase-17 target:** Optimize the ${bottleneck.class} dimension for ${route}.`,
  );
  lines.push("");
  lines.push("## Raw Runs");
  lines.push("");
  const slug = route.replace(/^\//, "").replace(/\//g, "-") || "root";
  lines.push(
    `See \`${slug}-mobile-runs.json\` / \`${slug}-desktop-runs.json\`.`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Render the cross-route markdown summary table (one row per route:
 * mobile Perf, desktop Perf, bundle KB, top class).
 *
 * @param {Array<{ route: string, mobile: Record<string, number>, desktop: Record<string, number>, bundleKb: number, topClass: string }>} rows
 * @returns {string} markdown
 */
export function renderSummary(rows) {
  const lines = [];
  lines.push("# Phase 16 Baseline — Cross-Route Summary");
  lines.push("");
  lines.push("| Route | Mobile Perf | Desktop Perf | Bundle KB | Top Class |");
  lines.push("|-------|-------------|--------------|-----------|-----------|");
  for (const row of rows) {
    lines.push(
      `| ${row.route} | ${row.mobile.score} | ${row.desktop.score} | ${row.bundleKb} | ${row.topClass} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

// ── Phase 17 (D-09) — route filter + OUT_DIR redirect ────────────────────
//
// These two functions are the pure decision-logic half of the D-09 route-
// scoped measurement harness. measure-cwv.mjs reads ROUTE_FILTER/
// PHASE_OUT_DIR from process.env and passes the resulting plain
// string|null through to these functions — no env access happens here.

/** The 4 canonical key routes gated by PERF-03 (unchanged from Phase 16). */
const KEY_ROUTES = ["/dashboard", "/study", "/deck/new-card", "/deck/browse"];

/**
 * Resolve which routes a measurement run should cover, given an optional
 * comma-separated filter string (read from ROUTE_FILTER by the caller).
 *
 * - filterArg null/undefined -> all 4 KEY_ROUTES (full baseline-shape run).
 * - filterArg set -> intersect the requested routes with KEY_ROUTES, EXCEPT
 *   "/habitat" is a UNION-addable opt-in (D-11 spot-check target) even
 *   though it is not one of the 4 key routes. A plain subset-filter would
 *   incorrectly return [] for "/habitat" alone — this must instead return
 *   exactly ["/habitat"].
 *
 * @param {string|null|undefined} filterArg — comma-separated route list,
 *   e.g. "/dashboard,/study" or "/habitat" or "/dashboard,/habitat".
 * @returns {string[]} the resolved route list, in KEY_ROUTES order with
 *   any requested "/habitat" appended last.
 */
export function resolveRoutes(filterArg) {
  if (!filterArg) return [...KEY_ROUTES];

  const requested = filterArg
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const keyRoutesSelected = KEY_ROUTES.filter((r) => requested.includes(r));
  const habitatRequested = requested.includes("/habitat");

  return habitatRequested
    ? [...keyRoutesSelected, "/habitat"]
    : keyRoutesSelected;
}

/**
 * Resolve the output directory a measurement run should write to, given an
 * optional explicit override (read from PHASE_OUT_DIR by the caller).
 *
 * CRITICAL (T-17-01-01 / Pitfall 1): when phaseOutDir is null/undefined,
 * this MUST default to a NEW Phase-17-owned directory and MUST NEVER
 * default back to the immutable Phase 16 baseline path
 * (".planning/phases/16-performance-baseline-measure/baseline"). That
 * directory is committed and frozen — CONTEXT.md forbids editing it, and a
 * vitest case asserts the returned default path never contains that
 * substring.
 *
 * @param {string} rootDir — the repo root (mirrors measure-cwv.mjs's ROOT).
 * @param {string|null|undefined} phaseOutDir — explicit relative-to-root
 *   override, e.g. "custom/out/dir". When set, honored as-is.
 * @returns {string} absolute output directory path.
 */
export function resolveOutDir(rootDir, phaseOutDir) {
  if (phaseOutDir) {
    return path.join(rootDir, phaseOutDir);
  }
  return path.join(
    rootDir,
    ".planning",
    "phases",
    "17-performance-optimization",
    "measurements",
  );
}
