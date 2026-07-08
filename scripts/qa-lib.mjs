#!/usr/bin/env node

// scripts/qa-lib.mjs — Phase 15 Plan 02
//
// Shared harness library for core-journey QA scripts.
//
// Required env:
//   DATABASE_URL        — Neon Postgres connection string (Drizzle provisioning)
//   DEBUG_CHEAT_SECRET  — Secret for /api/debug/* endpoints (state + time-shift)
//
// Optional env:
//   QA_BASE_URL         — App origin (default: http://localhost:3000)
//
// Usage:
//   import { provision, gradeSession, readState, ... } from './qa-lib.mjs';
//
// Security notes (T-15-06, T-15-07, T-15-08):
//   - Session tokens, passwords, and the debug secret are NEVER logged.
//   - Provisioned users ALWAYS use the @test.local domain so cleanup-test-users.mjs
//     can remove them with the "%@test.local" pattern (QAJ-06).
//   - Provisioning only INSERTs new test rows; it never UPDATEs or DELETEs arbitrary rows.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { cards, decks } from "../src/db/schema.ts";

// ── Root resolution (mirrors render-habitat-posters.mjs pattern) ─────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, "..");

// ── Environment guard (mirrors cleanup-test-users.mjs pattern) ───────────────
// Both must be present before any fetch or DB I/O (T-15-06, T-15-07).

const _dbUrl = process.env.DATABASE_URL;
if (!_dbUrl) {
  console.error("FATAL: set DATABASE_URL (required for QA provisioning)");
  process.exit(1);
}

const _secret = process.env.DEBUG_CHEAT_SECRET;
if (!_secret) {
  console.error(
    "FATAL: set DEBUG_CHEAT_SECRET (required for /api/debug/* endpoints)",
  );
  process.exit(1);
}

// ── Drizzle DB client ─────────────────────────────────────────────────────────
// Direct import of src/db/schema.ts works under Node 20+ (Node parses the TS
// file as ESM after stripping type-only declarations). Confirmed on Node 25.8.1
// with this project — drizzle column objects resolve correctly.
// Import strategy: direct ../src/db/schema.ts  (NOT raw neon SQL like cleanup-test-users.mjs).
const db = drizzle({ client: neon(_dbUrl) });

// ── Default base URL ──────────────────────────────────────────────────────────
export const DEFAULT_BASE_URL =
  process.env.QA_BASE_URL ?? "http://localhost:3000";

// ── Internal state: time-shift cookie ────────────────────────────────────────
// Kept in module-level state so helpers automatically forward it without
// callers needing to thread it through every call.
let _timeShiftCookie = ""; // "leo-qa-time-offset=<signed>" or ""

/**
 * Reset the module-level time-shift cookie state to empty.
 * Call at the top of each journey's run() function as a defensive reset so
 * that in-process multi-journey usage (future, or in tests that import qa-lib
 * directly) does not inherit a stale shift from a prior invocation (WR-02).
 */
export function resetTimeShiftState() {
  _timeShiftCookie = "";
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * Extract the better-auth session token from a fetch Response.
 * Uses the WHATWG getSetCookie() API (Node 18+) which returns string[].
 * Falls back to the single set-cookie header on older runtimes.
 *
 * @param {Response} res
 * @returns {string} The raw session token value (NOT "name=value", just value).
 * @throws if the token is absent.
 */
export function extractSessionCookie(res) {
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
 * Build a Cookie header string from a session token, optionally including the
 * time-shift cookie if one has been set via setTimeShift().
 *
 * @param {string} token — session token value
 * @returns {string}
 */
function cookieHeader(token) {
  const parts = [`better-auth.session_token=${token}`];
  if (_timeShiftCookie) parts.push(_timeShiftCookie);
  return parts.join("; ");
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Sign up a new test user via POST /api/auth/sign-up/email.
 * Returns only the session token (never logs it).
 *
 * Rule-3 fix (found running this wave's D-10 qa:run gate — NOT a Phase 17
 * regression, this function never sent Origin): without an Origin header,
 * better-auth's originCheckMiddleware 403s with MISSING_OR_NULL_ORIGIN
 * before ever reaching the sign-up handler. scripts/measure-cwv.mjs already
 * worked around the exact same gap by inlining its own signup helper with
 * `Origin: baseUrl` (see its own doc comment citing this as RESEARCH.md
 * Pitfall 1) rather than importing this function — that workaround is now
 * unnecessary duplication once the root helper itself sends the header.
 *
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} sessionToken
 */
export async function signUp(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email, password, name: "QA Tester" }),
  });
  if (!res.ok) {
    throw new Error(`sign-up failed: HTTP ${res.status} for email ${email}`);
  }
  return extractSessionCookie(res);
}

/**
 * Sign in an existing test user via POST /api/auth/sign-in/email.
 * Returns only the session token (never logs it).
 *
 * Rule-3 fix (same MISSING_OR_NULL_ORIGIN gap as signUp above — see its
 * doc comment): adds the same required Origin header.
 *
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} sessionToken
 */
export async function signIn(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
  if (!res.ok) {
    throw new Error(`sign-in failed: HTTP ${res.status} for email ${email}`);
  }
  return extractSessionCookie(res);
}

/**
 * Resolve the userId for an authenticated session.
 * Calls GET /api/auth/get-session — the canonical userId source.
 *
 * @param {string} baseUrl
 * @param {string} token — session token
 * @returns {Promise<string>} userId
 */
export async function getUserId(baseUrl, token) {
  const res = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { Cookie: cookieHeader(token) },
  });
  if (!res.ok) throw new Error(`get-session failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.user?.id) throw new Error("get-session: no user.id in response");
  return data.user.id;
}

// ── Provisioning ──────────────────────────────────────────────────────────────

/**
 * Mint a test email following the exact e2e/helpers.ts format.
 * Domain MUST be @test.local so cleanup-test-users.mjs "%@test.local" reaps it (QAJ-06).
 *
 * @returns {string} e.g. "qa+1750000000000+ab@test.local"
 */
export function mintTestEmail() {
  return `qa+${Date.now()}+${Math.random().toString(36).slice(2, 4)}@test.local`;
}

/**
 * Provision a complete test fixture: sign up a fresh @test.local user, obtain userId,
 * direct-insert one deck + the requested cards into Drizzle, return the full manifest.
 *
 * opts.cards: array of { front, back } objects (at least one).
 * opts.language: "fr" | "es" | "en" (default "fr").
 *
 * Server Actions are not callable headlessly — provisioning uses direct Drizzle writes.
 * The journey-under-test (grading, advancement) runs over real HTTP (D-02).
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
export async function provision(baseUrl, opts) {
  const { cards: cardDefs, language = "fr" } = opts;
  if (!cardDefs || cardDefs.length === 0)
    throw new Error("provision: opts.cards must be non-empty");

  const email = mintTestEmail();
  const password = `QA-${crypto.randomUUID().slice(0, 8)}!`; // random, never logged

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
    name: `QA deck ${deckId.slice(0, 6)}`,
  });
  console.log(`[qa-lib] provisioned user ${email} deck ${deckId}`);

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
  console.log(`[qa-lib] provisioned ${cardIds.length} card(s)`);

  // Return manifest — sessionToken is part of the return value but callers must
  // handle it carefully and never log it.
  return { email, sessionToken, userId, deckId, cardIds };
}

// ── Grade submission ──────────────────────────────────────────────────────────

/**
 * Submit a grade session over the real HTTP pipeline (D-02).
 * Generates a fresh crypto.randomUUID() commitId per call — required by the
 * idempotency guard on each card (reusing the same commitId is a no-op, WR-04).
 *
 * grades: [{ cardId, direction: "n2t"|"t2n", correct: boolean }, ...]
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {{ deckId: string, grades: Array<{cardId: string, direction: string, correct: boolean}> }} opts
 * @returns {Promise<{ success: boolean, leveledUp: number | null }>}
 */
export async function gradeSession(baseUrl, token, { deckId, grades }) {
  const commitId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/api/study/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(token),
    },
    body: JSON.stringify({ deckId, commitId, grades }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`gradeSession failed: HTTP ${res.status} — ${body}`);
  }
  return res.json();
}

// ── Assertion reads (D-06) ────────────────────────────────────────────────────

/**
 * Read per-card SRS state from GET /api/debug/state (real data, never virtual override).
 * Forwards the time-shift cookie if one has been set (QAJ-03, QAJ-05).
 *
 * Returns { real: HabitatState, forced: null, cards: CardStateRow[] }
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} secret
 * @param {string} deckId
 * @returns {Promise<{ real: object, forced: null, cards: object[] }>}
 */
export async function readState(baseUrl, token, secret, deckId) {
  const url = `${baseUrl}/api/debug/state?secret=${encodeURIComponent(secret)}&deck=${encodeURIComponent(deckId)}`;
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader(token) },
  });
  if (!res.ok) throw new Error(`readState failed: HTTP ${res.status}`);
  return res.json();
}

/**
 * Read live HabitatState via GET /api/habitat.
 * Forwards the time-shift cookie if set (QAJ-04, QAJ-05).
 *
 * @param {string} baseUrl
 * @param {string} token
 * @returns {Promise<{ level: number, quality: number, mood: string, learnedCardCount: number, effectiveCardCount: number, isDecaying: boolean, minutesSinceActivity: number, nextLevelThreshold: number }>}
 */
export async function readHabitat(baseUrl, token) {
  const res = await fetch(`${baseUrl}/api/habitat`, {
    headers: { Cookie: cookieHeader(token) },
  });
  if (!res.ok) throw new Error(`readHabitat failed: HTTP ${res.status}`);
  return res.json();
}

// ── Time-shift helpers (QAJ-03, QAJ-05) ──────────────────────────────────────

/**
 * Advance the app's virtual clock by offsetMs milliseconds.
 * POSTs to /api/debug/time-shift (built in Phase 15 Plan 01).
 * Captures the returned leo-qa-time-offset Set-Cookie so all subsequent
 * readState / gradeSession / readHabitat calls forward it automatically.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} secret
 * @param {number} offsetMs — milliseconds in the future (max 30 days)
 * @returns {Promise<{ ok: boolean }>}
 */
export async function setTimeShift(baseUrl, token, secret, offsetMs) {
  const res = await fetch(`${baseUrl}/api/debug/time-shift`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(token),
    },
    body: JSON.stringify({ secret, offsetMs }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`setTimeShift failed: HTTP ${res.status} — ${body}`);
  }
  // Capture the leo-qa-time-offset cookie for forwarding on future requests.
  const setCookies = res.headers.getSetCookie?.() ?? [
    res.headers.get("set-cookie") ?? "",
  ];
  const timeShiftVal = setCookies
    .join("; ")
    .match(/leo-qa-time-offset=([^;]+)/)?.[1];
  if (timeShiftVal) {
    _timeShiftCookie = `leo-qa-time-offset=${timeShiftVal}`;
    console.log(`[qa-lib] time-shift set to +${offsetMs}ms`);
  } else {
    // Cookie not captured — likely server not sending Set-Cookie over plain HTTP
    // (Next.js omits secure cookies on non-HTTPS in development).  Subsequent
    // requests will NOT forward the shift; later assertions may silently pass
    // against unshifted state (WR-03).
    console.warn(
      "[qa-lib] WARNING: leo-qa-time-offset cookie not received in Set-Cookie response. Requests may not forward the shift.",
    );
  }
  return res.json();
}

/**
 * Clear the time-shift cookie — returns the app to real wall-clock time.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} secret
 * @returns {Promise<{ ok: boolean, cleared: boolean }>}
 */
export async function clearTimeShift(baseUrl, token, secret) {
  const res = await fetch(`${baseUrl}/api/debug/time-shift`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(token),
    },
    body: JSON.stringify({ secret, clear: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`clearTimeShift failed: HTTP ${res.status} — ${body}`);
  }
  _timeShiftCookie = "";
  console.log("[qa-lib] time-shift cleared");
  return res.json();
}

// ── Manifest I/O (QAJ-03) ─────────────────────────────────────────────────────

/**
 * Atomically write a manifest JSON file (write .tmp, rename → final).
 * Path convention: scripts/qa-manifest-<run-id>.json (gitignored).
 *
 * @param {string} filePath — absolute or relative path to the manifest file
 * @param {object} obj — JSON-serialisable manifest data
 * @returns {Promise<void>}
 */
export async function writeManifest(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fs.promises.rename(tmp, filePath);
}

/**
 * Read and parse a manifest JSON file.
 * Throws if the file does not exist or is not valid JSON.
 *
 * @param {string} filePath
 * @returns {Promise<object>}
 */
export async function readManifest(filePath) {
  const raw = await fs.promises.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

// ── SRS direction helper ──────────────────────────────────────────────────────

/**
 * Return the expected grade direction for a card at a given masteryRound,
 * mirroring getCardStage() in src/lib/study-engine.ts:
 *   0 → "n2t"   (native → target, first exposure)
 *   1 → "t2n"   (target → native, recall check)
 *   2+ → "either" (either direction accepted)
 *
 * Journey scripts use this to submit correctly-directed grades.
 *
 * @param {number} round — current masteryRound value (0, 1, or 2+)
 * @returns {"n2t" | "t2n" | "either"}
 */
export function directionForRound(round) {
  if (round === 0) return "n2t";
  if (round === 1) return "t2n";
  return "either";
}

// ── Assert helpers ────────────────────────────────────────────────────────────

/**
 * Assert strict equality. Throws with a descriptive message on mismatch.
 *
 * @param {unknown} actual
 * @param {unknown} expected
 * @param {string} label — human-readable description of what is being asserted
 */
export function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `[ASSERT FAIL] ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * Assert that a fetch Response is OK (2xx). Throws with status + label on failure.
 * Prefer gradeSession/readState etc. (which throw internally) — use assertOk only
 * when inspecting a raw Response object.
 *
 * @param {Response} res
 * @param {string} label
 */
export function assertOk(res, label) {
  if (!res.ok) {
    throw new Error(
      `[ASSERT FAIL] ${label}: HTTP ${res.status} ${res.statusText}`,
    );
  }
}
