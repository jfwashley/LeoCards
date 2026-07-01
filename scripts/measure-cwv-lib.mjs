#!/usr/bin/env node
// scripts/measure-cwv-lib.mjs — Phase 16 PERF-01/PERF-02
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
 * middle-of-sorted value. For even-length arrays this returns the
 * lower-of-the-two-middle value (Math.floor behavior) — consistent with
 * D-06's median statistic for n>=5 odd-length run sets.
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
 * @param {object} lhr
 * @returns {{ lcp: number, tbt: number, cls: number, fcp: number, ttfb: number, score: number, bootupTime: number }}
 */
export function extractMetrics(lhr) {
  return {
    lcp: lhr.audits["largest-contentful-paint"].numericValue,
    tbt: lhr.audits["total-blocking-time"].numericValue,
    cls: lhr.audits["cumulative-layout-shift"].numericValue,
    fcp: lhr.audits["first-contentful-paint"].numericValue,
    ttfb: lhr.audits["server-response-time"].numericValue,
    score: Math.round(lhr.categories.performance.score * 100),
    bootupTime: lhr.audits["bootup-time"].numericValue,
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
