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
import lighthouse from "lighthouse/core/index.js";
import puppeteer from "puppeteer-core";
import { cards, decks } from "../src/db/schema.ts";
import {
  classifyBottleneck,
  computeMedians,
  extractMetrics,
  getBundleKb,
  median,
  renderRouteReport,
  renderSummary,
} from "./measure-cwv-lib.mjs";

// ── Root resolution (mirrors qa-run.mjs / qa-lib.mjs pattern) ────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PROD_URL = process.env.PROD_URL ?? "https://leocards.vercel.app";
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
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} sessionToken
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
  return extractSessionCookie(res);
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
 * Resolve the userId for an authenticated session.
 * Verbatim from qa-lib.mjs lines 168-176.
 *
 * @param {string} baseUrl
 * @param {string} token — session token
 * @returns {Promise<string>} userId
 */
async function getUserId(baseUrl, token) {
  const res = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { Cookie: `better-auth.session_token=${token}` },
  });
  if (!res.ok) throw new Error(`get-session failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.user?.id) throw new Error("get-session: no user.id in response");
  return data.user.id;
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

  // 1. Sign up → session token
  const sessionToken = await signUp(baseUrl, email, password);

  // 2. Resolve userId from the new session
  const userId = await getUserId(baseUrl, sessionToken);

  // 3. Direct-insert deck via Drizzle
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
    domain: "leocards.vercel.app",
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
 * and throwing loud if any run's final URL lands on /login (Pitfall 2 —
 * the silent-garbage-baseline failure mode, D-01/T-16-07).
 *
 * @param {import('puppeteer-core').Browser} browser
 * @param {string} route — e.g. "/dashboard"
 * @param {"mobile"|"desktop"} preset
 * @param {string} token — session token (never logged)
 * @returns {Promise<{
 *   route: string,
 *   preset: "mobile"|"desktop",
 *   runs: Array<Record<string, number>>,
 *   warmRuns: Array<Record<string, number>>,
 *   medians: Record<string, number>,
 * }>}
 */
async function measureRoutexPreset(browser, route, preset, token) {
  const page = await browser.newPage();
  const runs = [];

  try {
    for (let i = 0; i < N_RUNS; i++) {
      // Re-inject before EVERY run — Lighthouse does not clear httpOnly
      // cookies between runs by default, but this is a defensive
      // re-inject per RESEARCH.md Pitfall 4 (costs ~0 ms).
      await injectCookie(page, token);

      const result = await lighthouse.navigation(page, `${PROD_URL}${route}`, {
        config: preset === "mobile" ? mobileConfig : desktopConfig,
        flags: { logLevel: "silent" },
      });

      // Redirect guard (D-01, T-16-07): if auth silently failed, Lighthouse
      // would measure the /login shell instead of the real authed route —
      // a garbage-but-green baseline. Fail loud instead.
      const finalUrl =
        result.lhr.finalDisplayedUrl ?? result.lhr.finalUrl ?? "";
      if (
        finalUrl.includes("/login") ||
        !finalUrl.includes(route === "/" ? "/" : route)
      ) {
        throw new Error(
          `[measure-cwv] auth FAILED — ${route} run ${i} landed on /login; session cookie not honored (finalUrl: ${finalUrl})`,
        );
      }

      runs.push(extractMetrics(result.lhr));
    }
  } finally {
    await page.close();
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
 * @returns {Promise<Map<string, Awaited<ReturnType<typeof measureRoutexPreset>>>>}
 *   Keyed by `${route}::${preset}`.
 */
async function runMeasurements(browser, token) {
  const results = new Map();

  for (const route of ROUTES) {
    for (const preset of PRESETS) {
      console.log(`\n[measure-cwv] --- ${route} x ${preset} ---`);
      const result = await measureRoutexPreset(browser, route, preset, token);
      results.set(`${route}::${preset}`, result);
      console.log(
        `[measure-cwv] ${route} x ${preset} — median Perf score: ${result.medians.score}`,
      );
    }
  }

  return results;
}
