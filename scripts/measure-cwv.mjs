#!/usr/bin/env node
// scripts/measure-cwv.mjs — Phase 16 PERF-01/PERF-02
//
// Repeatable CWV measurement harness. Authenticates a *test.local user,
// provisions a deck+cards for realistic state, runs Lighthouse Node API
// (n=6, discard run 1, median of runs 2-6) against warm Vercel prod for
// 4 routes x 2 presets (mobile + desktop), parses local bundle stats,
// classifies per-route bottleneck, writes raw JSON + markdown reports.
//
// ── REQUIRED ENV ─────────────────────────────────────────────────────────
//
//   DATABASE_URL   — Neon Postgres connection string (provision + cleanup)
//   PROD_URL       — prod base URL (default: https://leocards.vercel.app)
//   CHROME_PATH    — path to Chrome binary (default: Playwright chromium-1208)
//
// ── OPTIONAL ENV ─────────────────────────────────────────────────────────
//
//   CLEANUP_DB_URL — DB URL for cleanup (falls back to DATABASE_URL)
//
// ── USAGE ─────────────────────────────────────────────────────────────────
//
//   # Prerequisite: fresh local build for bundle stats — the bundle
//   # composition report reads the LOCAL .next/ build only (D-05), so it
//   # must match the exact prod deployment being CWV-measured.
//   npm run build
//
//   # Run the harness:
//   DATABASE_URL="..." node scripts/measure-cwv.mjs
//
// ── SECURITY ──────────────────────────────────────────────────────────────
//
//   - Session tokens are NEVER logged (follow qa-lib pattern).
//   - Provisioned user is *@test.local — cleanup-test-users.mjs reaps it.
//   - DEBUG_CHEAT_SECRET is NOT required; do not set it for prod runs.

import { spawnSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
// DEVIATION (Rule 1 — bug fix, Task 1 live run): `navigation` is a NAMED
// export of lighthouse/core/index.js, not a property of the default
// export (the default export is itself an unrelated function — verified
// via `Object.keys(await import('lighthouse/core/index.js'))`). The
// original `import lighthouse from ...` + `lighthouse.navigation(...)`
// call shape failed live with "lighthouse.navigation is not a function"
// after provisioning succeeded (first Lighthouse call, /dashboard x
// mobile, run 0). RESEARCH.md's own verified Code Examples already used
// the correct named-import form (`import { navigation } from
// 'lighthouse/core/index.js'`) — this restores that shape.
import { navigation as lighthouseNavigation } from "lighthouse/core/index.js";
import puppeteer from "puppeteer-core";
import { cards, decks } from "../src/db/schema.ts";
import {
  classifyBottleneck,
  computeMedians,
  extractMetrics,
  getBundleKb,
  renderRouteReport,
  renderSummary,
} from "./measure-cwv-lib.mjs";

// ── Root resolution (mirrors qa-run.mjs / qa-lib.mjs pattern) ────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PROD_URL = process.env.PROD_URL ?? "https://leocards.vercel.app";
// Cookie domain must match the measured origin or every run lands on
// /login (WR-02). NOTE: the __Secure- cookie prefix + secure:true below
// restrict valid PROD_URL overrides to HTTPS origins.
const PROD_HOST = new URL(PROD_URL).hostname;
const CHROME_PATH =
  process.env.CHROME_PATH ??
  "C:\\Users\\jfwas\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe";

// ── Environment guard (mirrors qa-run.mjs / cleanup-test-users.mjs pattern) ──
//
// NOTE: DEBUG_CHEAT_SECRET is intentionally NOT checked here. The perf
// harness does not call /api/debug/* endpoints. Importing qa-lib.mjs
// directly would trigger its module-level exit on missing
// DEBUG_CHEAT_SECRET (qa-lib.mjs lines 44-50) — so the needed functions
// (signUp, extractSessionCookie, provision) are INLINED below, not
// imported from qa-lib.mjs. See RESEARCH.md Pitfall 5.

const _dbUrl = process.env.DATABASE_URL;
if (!_dbUrl) {
  console.error(
    "[measure-cwv] FATAL: DATABASE_URL is required (Neon connection string for provisioning + cleanup)",
  );
  process.exit(1);
}

// ── Drizzle DB client ──────────────────────────────────────────────────────
const db = drizzle({ client: neon(_dbUrl) });

// ── Inlined auth helpers (copied + adapted from scripts/qa-lib.mjs) ─────────
// Do NOT `import ... from './qa-lib.mjs'` — that module exits at load if
// DEBUG_CHEAT_SECRET is missing (qa-lib.mjs lines 44-50).

/**
 * Extract the better-auth session token from a fetch Response.
 * Verbatim from qa-lib.mjs lines 89-101.
 *
 * @param {Response} res
 * @returns {string} The raw session token value (NOT "name=value", just value).
 * @throws if the token is absent.
 */
function extractSessionCookie(res) {
  const cookies = res.headers.getSetCookie?.() ?? [
    res.headers.get("set-cookie") ?? "",
  ];
  const token = cookies
    .join("; ")
    .match(/better-auth\.session_token=([^;]+)/)?.[1];
  if (!token)
    throw new Error(
      `No better-auth.session_token in Set-Cookie (status ${res.status})`,
    );
  return token;
}

/**
 * Sign up a new test user via POST /api/auth/sign-up/email.
 * Adapted from qa-lib.mjs lines 127-137 — ADDS the Origin header, which
 * qa-lib.mjs omits because it targets localhost. Prod HTTPS requires it:
 * better-auth's originCheckMiddleware validates Origin against
 * trustedOrigins (RESEARCH.md Pitfall 1) or the sign-up POST 403s.
 *
 * DEVIATION (Rule 1 — bug fix, Task 1 live run): returns { sessionToken,
 * userId } instead of qa-lib.mjs's sessionToken-only shape. better-auth's
 * sign-up/email response body already includes `user.id` directly
 * (verified: node_modules/better-auth/dist/api/routes/sign-up.mjs
 * `ctx.json({ token, user: parseUserOutput(...) })`), so userId can be
 * read from THIS response instead of a second round-trip to
 * /api/auth/get-session. The separate getUserId() round-trip (verbatim
 * from qa-lib.mjs, which only ever targets http://localhost) sent the
 * Cookie header as the plain `better-auth.session_token` name against
 * prod HTTPS and returned no user.id — the live Task-1 run failed with
 * "get-session: no user.id in response" before any measurement began.
 * Reading userId from the sign-up body removes the extra authenticated
 * round-trip entirely rather than patching the cookie-name mismatch.
 *
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{sessionToken: string, userId: string}>}
 */
async function signUp(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // REQUIRED on prod HTTPS: better-auth originCheckMiddleware validates
      // Origin against trustedOrigins (RESEARCH.md Pitfall 1).
      Origin: baseUrl,
    },
    body: JSON.stringify({ email, password, name: "CWV Tester" }),
  });
  if (!res.ok) {
    throw new Error(`sign-up failed: HTTP ${res.status} for email ${email}`);
  }
  const sessionToken = extractSessionCookie(res);
  const data = await res.json();
  if (!data?.user?.id) {
    throw new Error("sign-up: no user.id in response body");
  }
  return { sessionToken, userId: data.user.id };
}

/**
 * Mint a test email. MUST end @test.local so cleanup-test-users.mjs
 * "%@test.local" reaps it. Adapted from qa-lib.mjs mintTestEmail
 * (lines 186-188) with a cwv+ local-part to distinguish these from
 * Phase-15 qa+ users during manual DB inspection.
 *
 * @returns {string} e.g. "cwv+1750000000000+ab@test.local"
 */
function mintTestEmail() {
  return `cwv+${Date.now()}+${Math.random().toString(36).slice(2, 4)}@test.local`;
}

/**
 * Provision a complete test fixture: sign up a fresh @test.local user,
 * obtain userId, direct-insert one deck + the requested cards into
 * Drizzle. Adapted from qa-lib.mjs provision (lines 210-252).
 *
 * opts.cards: array of { front, back } objects (at least one).
 * opts.language: "fr" | "es" | "en" (default "fr").
 *
 * @param {string} baseUrl
 * @param {{ cards: Array<{front: string, back: string}>, language?: string }} opts
 * @returns {Promise<{
 *   email: string,
 *   sessionToken: string,
 *   userId: string,
 *   deckId: string,
 *   cardIds: string[],
 * }>}
 */
async function provision(baseUrl, opts) {
  const { cards: cardDefs, language = "fr" } = opts;
  if (!cardDefs || cardDefs.length === 0)
    throw new Error("provision: opts.cards must be non-empty");

  const email = mintTestEmail();
  const password = `CWV-${crypto.randomUUID().slice(0, 8)}!`; // random, never logged

  // 1. Sign up → session token + userId (both read from the sign-up
  //    response directly — see Rule-1 deviation note on signUp()).
  const { sessionToken, userId } = await signUp(baseUrl, email, password);

  // 2. Direct-insert deck via Drizzle
  const deckId = crypto.randomUUID();
  await db.insert(decks).values({
    id: deckId,
    userId,
    language,
    name: `CWV deck ${deckId.slice(0, 6)}`,
  });
  // Log only the email (never the token/password) — T-16-04.
  console.log(`[measure-cwv] provisioned user ${email} deck ${deckId}`);

  // 4. Direct-insert cards via Drizzle
  const cardIds = [];
  for (const def of cardDefs) {
    const cardId = crypto.randomUUID();
    await db.insert(cards).values({
      id: cardId,
      deckId,
      front: def.front,
      back: def.back,
      source: "manual",
    });
    cardIds.push(cardId);
  }
  console.log(`[measure-cwv] provisioned ${cardIds.length} card(s)`);

  // Return manifest — sessionToken is part of the return value but callers
  // must handle it carefully and never log it.
  return { email, sessionToken, userId, deckId, cardIds };
}

// ── Puppeteer-core browser launch + cookie injection ─────────────────────────

/**
 * Launch a puppeteer-core browser pointed at Playwright's Chromium binary.
 * Throws a helpful error if the launch fails (most commonly a bad
 * CHROME_PATH — RESEARCH.md failure mode 4).
 *
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
async function launchBrowser() {
  try {
    return await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    throw new Error(
      `[measure-cwv] Failed to launch browser at CHROME_PATH="${CHROME_PATH}". ` +
        "Verify the path exists (Playwright's bundled chromium-1208 by default) " +
        `or set CHROME_PATH to a valid Chrome/Chromium executable. Original error: ${err.message}`,
    );
  }
}

/**
 * Inject the better-auth session cookie into a puppeteer-core page.
 * Uses the exact prod cookie name (__Secure- prefix — better-auth prepends
 * it when baseURL is HTTPS, RESEARCH.md Pitfall 2). Called before every
 * Lighthouse run (Pitfall 4: cookie may not survive between runs).
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string} token — session token value (never logged)
 * @returns {Promise<void>}
 */
async function injectCookie(page, token) {
  await page.setCookie({
    name: "__Secure-better-auth.session_token",
    value: token,
    domain: PROD_HOST,
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });
}

// ── Route / preset / run-count constants (D-03, D-06) ────────────────────────
//
// Exactly these 4 routes — /habitat is EXCLUDED (D-03).
const ROUTES = ["/dashboard", "/study", "/deck/new-card", "/deck/browse"];
const PRESETS = ["mobile", "desktop"];
// n=6 per route x preset: discard run 0 (cold Vercel hit), median of runs 1-5.
const N_RUNS = 6;

/**
 * Build the actual URL to navigate Lighthouse to for a given route.
 *
 * DEVIATION (Rule 1 — bug fix, Task 1 live run): `/study` has an
 * UNCONDITIONAL redirect to `/dashboard` when `?deck=` is absent
 * (src/app/(protected)/study/page.tsx lines 20-22 — unlike /dashboard,
 * /deck/new-card, and /deck/browse, which all gracefully default to the
 * user's first deck when `?deck=` is omitted, /study has no such
 * fallback). The live run measured a bare `/study` with no query string,
 * so every navigation landed on `/dashboard` instead of the real study
 * page — caught correctly by the redirect guard below (finalUrl was
 * `.../dashboard`, not `/login`; auth was honored, but the WRONG page
 * was being measured, which is exactly the "silent garbage baseline"
 * class of failure the guard exists to catch). Appending `?deck={deckId}`
 * for `/study` only reaches the real authenticated study page. `route`
 * itself (the clean path, no query string) is unchanged everywhere else
 * — report/summary keys, slugs, and the guard's containment check all
 * still key off the plain route path.
 *
 * @param {string} route — e.g. "/study" (clean path, no query string)
 * @param {string} deckId — the provisioned deck's id
 * @returns {string} path (+ query string if required) to navigate to
 */
function buildNavigationUrl(route, deckId) {
  if (route === "/study") {
    return `${route}?deck=${deckId}`;
  }
  return route;
}

// ── Lighthouse preset configs ─────────────────────────────────────────────────
// Source: RESEARCH.md Code Examples (mobile) + desktop-config.js (desktop),
// verified against node_modules/lighthouse/core/config/desktop-config.js.

const mobileConfig = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "mobile",
    throttling: {
      rttMs: 150,
      throughputKbps: 1638,
      requestLatencyMs: 562,
      downloadThroughputKbps: 1474,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      disabled: false,
    },
    onlyCategories: ["performance"],
    disableFullPageScreenshot: true,
  },
};

const desktopConfig = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    throttling: { cpuSlowdownMultiplier: 1 },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
    },
    onlyCategories: ["performance"],
  },
};

// ── Measurement loop (sequential — RESEARCH.md: parallel self-contention
// skews TBT) ───────────────────────────────────────────────────────────────

/**
 * Run N_RUNS sequential Lighthouse navigations against a single route x
 * preset pair, re-injecting the session cookie before each run (Pitfall 4),
 * and throwing loud if any run's final URL lands on /login OR any other
 * unexpected page (Pitfall 2 — the silent-garbage-baseline failure mode,
 * D-01/T-16-07).
 *
 * @param {import('puppeteer-core').Browser} browser
 * @param {string} route — e.g. "/dashboard" (clean path, no query string —
 *   used for the guard's containment check, report keys, and slugs)
 * @param {"mobile"|"desktop"} preset
 * @param {string} token — session token (never logged)
 * @param {string} deckId — provisioned deck id, threaded into
 *   buildNavigationUrl() for routes that require it (currently /study only)
 * @returns {Promise<{
 *   route: string,
 *   preset: "mobile"|"desktop",
 *   runs: Array<Record<string, number>>,
 *   warmRuns: Array<Record<string, number>>,
 *   medians: Record<string, number>,
 * }>}
 */
async function measureRoutexPreset(browser, route, preset, token, deckId) {
  const page = await browser.newPage();
  const runs = [];
  const navigationUrl = buildNavigationUrl(route, deckId);

  try {
    for (let i = 0; i < N_RUNS; i++) {
      // Re-inject before EVERY run — Lighthouse does not clear httpOnly
      // cookies between runs by default, but this is a defensive
      // re-inject per RESEARCH.md Pitfall 4 (costs ~0 ms).
      await injectCookie(page, token);

      const result = await lighthouseNavigation(
        page,
        `${PROD_URL}${navigationUrl}`,
        {
          config: preset === "mobile" ? mobileConfig : desktopConfig,
          flags: { logLevel: "silent" },
        },
      );

      // Redirect guard (D-01, T-16-07): if auth silently failed, Lighthouse
      // would measure the /login shell instead of the real authed route —
      // a garbage-but-green baseline. Also catches landing on any OTHER
      // unexpected page (e.g. a route-level redirect back to /dashboard)
      // — same failure class, different symptom. Fail loud instead.
      const finalUrl =
        result.lhr.finalDisplayedUrl ?? result.lhr.finalUrl ?? "";
      const isLoginShell = finalUrl.includes("/login");
      const landedOnRoute = finalUrl.includes(route === "/" ? "/" : route);
      if (isLoginShell || !landedOnRoute) {
        const reason = isLoginShell
          ? "landed on /login; session cookie not honored"
          : `landed on an unexpected page (not ${route})`;
        throw new Error(
          `[measure-cwv] auth FAILED — ${route} run ${i} ${reason} (finalUrl: ${finalUrl})`,
        );
      }

      runs.push(extractMetrics(result.lhr));
    }
  } finally {
    // CR-01 (secondary): a rejected page.close() must never REPLACE the
    // loop's real diagnostic error with an opaque close error.
    // Log-and-continue.
    try {
      await page.close();
    } catch (closeErr) {
      console.error(
        `[measure-cwv] page.close() failed (continuing): ${closeErr.message}`,
      );
    }
  }

  const warmRuns = runs.slice(1);
  return { route, preset, runs, warmRuns, medians: computeMedians(warmRuns) };
}

/**
 * Drive measureRoutexPreset SEQUENTIALLY across every ROUTES x PRESETS pair
 * (never parallel — RESEARCH.md: self-contention skews TBT). Mirrors the
 * qa-run.mjs sequential for-loop cadence (lines 197-230) with the same
 * "[measure-cwv] --- {label} ---" progress logging.
 *
 * @param {import('puppeteer-core').Browser} browser
 * @param {string} token — session token from provision() (never logged)
 * @param {string} deckId — provisioned deck id, threaded to
 *   measureRoutexPreset for routes requiring a deck query param
 * @returns {Promise<Map<string, Awaited<ReturnType<typeof measureRoutexPreset>>>>}
 *   Keyed by `${route}::${preset}`.
 */
async function runMeasurements(browser, token, deckId) {
  const results = new Map();

  for (const route of ROUTES) {
    for (const preset of PRESETS) {
      console.log(`\n[measure-cwv] --- ${route} x ${preset} ---`);
      const result = await measureRoutexPreset(
        browser,
        route,
        preset,
        token,
        deckId,
      );
      results.set(`${route}::${preset}`, result);
      console.log(
        `[measure-cwv] ${route} x ${preset} — median Perf score: ${result.medians.score}`,
      );
    }
  }

  return results;
}

// ── Bundle composition (D-05: LOCAL build only — no prod call) ──────────────

/**
 * Read and parse the Turbopack-emitted route bundle stats. This is the
 * SOLE local .next/ read in the harness — bundle composition is never
 * measured against prod, per D-05. Requires a fresh `npm run build` so
 * the reported sizes match the exact deployed commit (Pitfall 6).
 *
 * @returns {Promise<Array<{route: string, firstLoadUncompressedJsBytes: number, firstLoadChunkPaths: string[]}>>}
 */
async function readBundleStats() {
  const raw = await readFile(
    path.join(ROOT, ".next", "diagnostics", "route-bundle-stats.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

// ── Report output ─────────────────────────────────────────────────────────

const OUT_DIR = path.join(
  ROOT,
  ".planning",
  "phases",
  "16-performance-baseline-measure",
  "baseline",
);

/**
 * Map a route path to its filename-safe slug.
 *
 * @param {string} route — e.g. "/deck/new-card"
 * @returns {string} e.g. "deck-new-card"
 */
function slugify(route) {
  return route.replace(/^\//, "").replace(/\//g, "-") || "root";
}

/**
 * Atomically write a JSON file: write to a .tmp sibling, then rename over
 * the final path. Mirrors qa-lib.mjs writeManifest (lines 406-413).
 *
 * @param {string} filePath
 * @param {unknown} obj
 * @returns {Promise<void>}
 */
async function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await rename(tmp, filePath);
}

/**
 * Atomically write a text (markdown) file: write to a .tmp sibling, then
 * rename over the final path.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<void>}
 */
async function writeTextAtomic(filePath, content) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, filePath);
}

/**
 * Write every per-route artifact (raw JSON x2 + markdown report) plus the
 * cross-route summary. Uses the mobile medians as the bottleneck
 * classification basis (mobile is the constrained profile — D-06/13.1).
 *
 * @param {Map<string, Awaited<ReturnType<typeof measureRoutexPreset>>>} results
 * @param {Array<{route: string, firstLoadUncompressedJsBytes: number, firstLoadChunkPaths: string[]}>} bundleStats
 * @returns {Promise<void>}
 */
async function writeReports(results, bundleStats) {
  await mkdir(OUT_DIR, { recursive: true });

  const dateIso = new Date().toISOString();
  const summaryRows = [];

  for (const route of ROUTES) {
    const mobile = results.get(`${route}::mobile`);
    const desktop = results.get(`${route}::desktop`);
    const slug = slugify(route);

    // Raw JSON per route x preset (D-04 machine-readable half).
    await writeJsonAtomic(path.join(OUT_DIR, `${slug}-mobile-runs.json`), {
      route: mobile.route,
      preset: mobile.preset,
      runs: mobile.runs,
      warmRuns: mobile.warmRuns,
      medians: mobile.medians,
    });
    await writeJsonAtomic(path.join(OUT_DIR, `${slug}-desktop-runs.json`), {
      route: desktop.route,
      preset: desktop.preset,
      runs: desktop.runs,
      warmRuns: desktop.warmRuns,
      medians: desktop.medians,
    });

    // Bundle + bottleneck classification (mobile medians — the constrained
    // profile per D-06/13.1).
    const bundle = getBundleKb(bundleStats, route);
    const bottleneck = classifyBottleneck(mobile.medians, bundle.kb);

    // Human-readable markdown report per route (D-04).
    const reportMd = renderRouteReport({
      route,
      dateIso,
      mobile: mobile.medians,
      desktop: desktop.medians,
      bundle,
      bottleneck,
    });
    await writeTextAtomic(path.join(OUT_DIR, `${slug}-baseline.md`), reportMd);

    summaryRows.push({
      route,
      mobile: mobile.medians,
      desktop: desktop.medians,
      bundleKb: bundle.kb,
      topClass: bottleneck.class,
    });

    console.log(`[measure-cwv] wrote ${slug}-baseline.md`);
  }

  // Cross-route summary (D-04).
  const summaryMd = renderSummary(summaryRows);
  await writeTextAtomic(
    path.join(OUT_DIR, "16-BASELINE-SUMMARY.md"),
    summaryMd,
  );
  console.log("[measure-cwv] wrote 16-BASELINE-SUMMARY.md");
}

// ── Main execution ────────────────────────────────────────────────────────

console.log(
  "[measure-cwv] ============================================================",
);
console.log(
  "[measure-cwv] LeoCards CWV baseline measurement harness — Phase 16",
);
console.log(`[measure-cwv] PROD_URL: ${PROD_URL}`);
console.log(
  "[measure-cwv] ============================================================",
);

let browser;
let exitCode = 0;

try {
  // 1. Read local bundle stats FIRST — fail fast if `npm run build` hasn't
  //    been run, before spending time on auth/provision/browser launch.
  const bundleStats = await readBundleStats();

  // 2. Provision a *test.local user with a deck + cards (D-02) so /study,
  //    /deck/browse, /deck/new-card render realistic non-empty state.
  const { email, sessionToken, deckId } = await provision(PROD_URL, {
    language: "fr",
    cards: [
      { front: "le chat", back: "the cat" },
      { front: "le chien", back: "the dog" },
      { front: "la maison", back: "the house" },
      { front: "le livre", back: "the book" },
      { front: "l'eau", back: "the water" },
    ],
  });
  console.log(`[measure-cwv] provisioned deck ${deckId} for ${email}`);

  // 3. Launch the browser and inject the session cookie (D-01).
  browser = await launchBrowser();

  // 4. Run the sequential measurement loop across ROUTES x PRESETS.
  const results = await runMeasurements(browser, sessionToken, deckId);

  // 5. Write per-route + summary reports (D-04) using the LOCAL bundle
  //    stats read in step 1 (D-05: no prod call for bundle composition).
  await writeReports(results, bundleStats);

  console.log(
    "\n[measure-cwv] ============================================================",
  );
  console.log(
    "[measure-cwv] ALL ROUTES MEASURED — baseline artifacts written.",
  );
  console.log(
    "[measure-cwv] ============================================================",
  );
} catch (err) {
  console.error(`\n[measure-cwv] FAIL — ${err.message}`);
  exitCode = 1;
} finally {
  if (browser) {
    // CR-01: browser.close() can reject when the connection is already dead
    // (crashed/killed Chrome — a likely reason we entered the catch path).
    // An unhandled rejection here would abort the finally BEFORE the
    // cleanup spawnSync below, leaving *test.local residue in prod.
    // Log-and-continue: cleanup must be reachable on EVERY path.
    try {
      await browser.close();
    } catch (closeErr) {
      console.error(
        `[measure-cwv] browser.close() failed (continuing to cleanup): ${closeErr.message}`,
      );
    }
  }

  // Self-clean (T-16-05): ALWAYS run cleanup regardless of measurement outcome.
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
    exitCode = 1;
  }
}

process.exit(exitCode);
