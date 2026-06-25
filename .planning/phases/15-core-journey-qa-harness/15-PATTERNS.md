# Phase 15: Core-Journey QA Harness — Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/qa-lib.mjs` | utility (shared harness helpers) | request-response + CRUD | `scripts/cleanup-test-users.mjs` | role-match (same ESM `.mjs`, Neon DB, env guard, process.exit) |
| `scripts/qa-run.mjs` | utility (orchestrator) | batch | `scripts/render-habitat-posters.mjs` | role-match (ESM orchestrator, spawnSync/sequential runner pattern) |
| `scripts/qa-01-learn-card.mjs` | utility (journey script) | request-response | `scripts/cleanup-test-users.mjs` | role-match (standalone ESM, env guard, explicit exit codes) |
| `scripts/qa-02-mastery.mjs` | utility (journey script) | request-response | `scripts/cleanup-test-users.mjs` | role-match |
| `scripts/qa-03-resume.mjs` | utility (journey script, manifest I/O) | request-response + file-I/O | `scripts/cleanup-test-users.mjs` | role-match |
| `scripts/qa-04-habitat.mjs` | utility (journey script) | request-response | `scripts/cleanup-test-users.mjs` | role-match |
| `scripts/qa-05-decay.mjs` | utility (journey script) | request-response | `scripts/cleanup-test-users.mjs` | role-match |
| `src/app/api/debug/time-shift/route.ts` | route (QA-gated endpoint) | request-response | `src/app/api/debug/cheat/route.ts` | exact (identical gating: cheatEnabled → auth → rate-limit → checkSecret → set cookie) |
| `src/lib/debug-cheat.ts` additions | utility (crypto helpers) | — | `src/lib/debug-cheat.ts` existing body | exact (same HMAC-SHA256 helpers, same `signXxx`/`verifyXxx`/`readXxx` triple) |
| `src/app/api/debug/__tests__/time-shift.test.ts` | test (unit, Vitest) | — | `src/app/api/debug/__tests__/state.test.ts` | exact (same vi.hoisted queue pattern, same gate-order tests) |
| `e2e/14-qa-parity.spec.ts` (extend existing) | test (e2e, Playwright) | request-response | `e2e/14-qa-parity.spec.ts` (itself) | exact (add one `page.request.post('/api/debug/time-shift')` assertion block) |

---

## Pattern Assignments

### `scripts/qa-lib.mjs` (utility, request-response + CRUD)

**Analog:** `scripts/cleanup-test-users.mjs`

**File header + env guard pattern** (cleanup-test-users.mjs lines 1–20):
```js
#!/usr/bin/env node
// scripts/cleanup-test-users.mjs — one-off housekeeping.
// Usage: CLEANUP_DB_URL="postgres://..." node scripts/cleanup-test-users.mjs [pattern]
//   Guard: pattern must end in a *test.local domain — real users are unreachable.

import { neon } from "@neondatabase/serverless";

const url = process.env.CLEANUP_DB_URL;
if (!url) {
  console.error("FATAL: set CLEANUP_DB_URL");
  process.exit(1);
}
```

**DB client construction** (cleanup-test-users.mjs lines 20–21):
```js
const sql = neon(url);
```
For `qa-lib.mjs`, use the Drizzle wrapper so schema types are available for inserts:
```js
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
const db = drizzle({ client: neon(process.env.DATABASE_URL) });
```

**Email pattern** (mirrors `e2e/helpers.ts` line 7):
```ts
// e2e/helpers.ts — the canonical test.local email factory
export function testEmail(): string {
  return `qa+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@test.local`;
}
```
`qa-lib.mjs` MUST replicate this format exactly (not `@leocards-test.local`) because
`cleanup-test-users.mjs` defaults to `%@leocards-test.local`; the harness must call it
with `"%@test.local"` (same domain the e2e suite uses).

**Auth-cookie capture pattern** (from RESEARCH §2 — no codebase analog exists yet, use this verbatim):
```js
// In signUp() / signIn() helpers in qa-lib.mjs
const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name: 'QA Tester' }),
});
if (!res.ok) throw new Error(`sign-up failed: ${res.status}`);
// Node 18+ WHATWG Fetch: getSetCookie() returns string[]
const cookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
const sessionToken = cookies
  .join('; ')
  .match(/better-auth\.session_token=([^;]+)/)?.[1];
if (!sessionToken) throw new Error('No session token in sign-up response');
```

**Existing provisioning shape to mirror** (`e2e/helpers.ts` lines 50–86 `signUpFreshUser`):
The e2e helper drives the browser through `/signup`. The harness replaces the browser
with HTTP calls to `POST /api/auth/sign-up/email`, then inserts deck/cards directly via
Drizzle (Server Actions are not callable headlessly — RESEARCH §8).

---

### `scripts/qa-run.mjs` (utility, batch orchestrator)

**Analog:** `scripts/render-habitat-posters.mjs`

**Orchestrator skeleton** (render-habitat-posters.mjs lines 1–16, 38–42):
```js
#!/usr/bin/env node
// scripts/render-habitat-posters.mjs — Phase 13.1 Plan 01 Task 2.
// One-shot orchestrator that: 1. … 2. … 3. …
// Run: `npm run posters:habitat` (requires `npm run dev` on :3000).

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function fail(msg) {
  console.error(`\n[render-habitat-posters] FAIL: ${msg}`);
  process.exit(1);
}
```

`qa-run.mjs` does NOT use `spawnSync` to spawn subprocesses; instead it imports each
journey module and calls its exported `run()` function directly. The `fail()` + root
resolution pattern is the key thing to copy.

---

### `scripts/qa-01-learn-card.mjs` through `scripts/qa-05-decay.mjs` (journey scripts)

**Analog:** `scripts/cleanup-test-users.mjs`

All five journey scripts share the same skeleton:

```js
#!/usr/bin/env node
// scripts/qa-01-learn-card.mjs — QAJ-01: learn a card (round 0 → 1).
//
// Prerequisites:
//   DATABASE_URL, DEBUG_CHEAT_SECRET set
//   STUDY_COOLDOWN_MINUTES=1 set (for QAJ-01/03 cooldown assertions — see RESEARCH pitfall 2)
//   npm run dev running on http://localhost:3000 (or QA_BASE_URL)
//
// Usage: node scripts/qa-01-learn-card.mjs

import { provision, gradeSession, readState, assertEq } from './qa-lib.mjs';

const BASE_URL = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const SECRET   = process.env.DEBUG_CHEAT_SECRET;
if (!SECRET) { console.error('FATAL: set DEBUG_CHEAT_SECRET'); process.exit(1); }

// … journey body …

console.log('[QAJ-01] PASS');
process.exit(0);
```

The `process.exit(1)` on missing env mirrors cleanup-test-users.mjs lines 14–17.
The `[QAJ-NN] PASS` stdout convention lets `qa-run.mjs` grep for PASS/FAIL.

**QAJ-03 additionally** uses `node:fs/promises` for atomic manifest write:
```js
import { writeFile, rename } from 'node:fs/promises';
// Atomic write: write to .tmp, then rename
await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2));
await rename(`${manifestPath}.tmp`, manifestPath);
```

---

### `src/app/api/debug/time-shift/route.ts` (route, request-response)

**Analog:** `src/app/api/debug/cheat/route.ts` (exact match — same gate order)

**Imports pattern** (cheat/route.ts lines 1–13):
```ts
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  cheatEnabled,
  checkSecret,
  QA_MODE_COOKIE,
  signQaMode,
  // ADD for time-shift:
  // signTimeOffset,   <-- new export from debug-cheat.ts
  // TIME_SHIFT_COOKIE,
} from "@/lib/debug-cheat";
import { createRateLimiter } from "@/lib/rate-limit";
```

**Gate order** (cheat/route.ts lines 32–71) — replicate in EXACTLY this sequence:
```ts
export async function POST(req: Request) {
  // 0. Feature flag — absent secret → 404 (fires BEFORE auth)
  if (!cheatEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // 1. Auth — require a valid session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = cheatLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  // 3. Parse + validate body
  let json: unknown;
  try { json = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // 4. Secret gate (constant-time)
  if (!checkSecret(parsed.data.secret)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();

  // 5. Clear branch
  if (parsed.data.clear) {
    cookieStore.delete(TIME_SHIFT_COOKIE);
    return Response.json({ ok: true, cleared: true });
  }

  // 6. Set branch — sign + store
  cookieStore.set(TIME_SHIFT_COOKIE, signTimeOffset(parsed.data.offsetMs), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({ ok: true });
}
```

**Body schema** (difference from cheat: no `overrideSchema` intersection; just `offsetMs` + `secret` + `clear`):
```ts
const bodySchema = z.object({
  secret: z.string(),
  offsetMs: z.number().int().min(0).max(30 * 24 * 60 * 60 * 1000).optional(), // max 30 days
  clear: z.boolean().optional(),
}).refine(d => d.clear === true || d.offsetMs !== undefined, {
  message: "Provide offsetMs or clear:true",
});
```

**Cookie set** (mirrors cheat/route.ts line 110):
```ts
// cheat route sets the CHEAT_COOKIE — time-shift route sets TIME_SHIFT_COOKIE identically
cookieStore.set(CHEAT_COOKIE, signOverride(override), {
  httpOnly: true, secure: true, sameSite: "lax", path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
```
The time-shift route does NOT refresh `QA_MODE_COOKIE` (that is a visual-badge concept;
the time-shift is harness-only and not tied to the debug-page QA-mode display).

---

### `src/lib/debug-cheat.ts` additions (`signTimeOffset` / `verifyTimeOffset` / `readQaTimeOffset`)

**Analog:** `src/lib/debug-cheat.ts` existing body (exact — copy the `signQaMode`/`verifyQaMode`/`readQaAuth` triple from lines 162–215)

**Cookie name constant** (mirrors CHEAT_COOKIE line 28 and QA_MODE_COOKIE line 35):
```ts
// ADD below the existing QA_MODE_COOKIE constant
export const TIME_SHIFT_COOKIE = "leo-qa-time-offset";
```

**`signTimeOffset`** (mirrors `signQaMode` lines 172–179, but payload is `{ offsetMs: number }` not a sentinel):
```ts
export function signTimeOffset(offsetMs: number): string {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret) throw new Error("DEBUG_CHEAT_SECRET not set");
  const payloadB64 = base64url(
    Buffer.from(JSON.stringify({ offsetMs }), "utf8"),
  );
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}
```

**`verifyTimeOffset`** (mirrors `verifyQaMode` lines 188–202, adds JSON parse + schema check like `verifyOverride`):
```ts
export function verifyTimeOffset(raw: string | null | undefined): number | null {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret || typeof raw !== "string" || !raw.includes(".")) return null;
  const dot = raw.lastIndexOf(".");
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) return null;
  const expected = hmac(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    const parsed = z.object({ offsetMs: z.number() }).safeParse(json);
    return parsed.success ? parsed.data.offsetMs : null;
  } catch { return null; }
}
```

**`readQaTimeOffset`** (mirrors `readQaAuth` lines 211–215, same `if (!cheatEnabled()) return 0` guard):
```ts
export async function readQaTimeOffset(): Promise<number> {
  if (!cheatEnabled()) return 0;
  const store = await cookies();
  return verifyTimeOffset(store.get(TIME_SHIFT_COOKIE)?.value) ?? 0;
}
```

**Usage pattern in callers** (replaces bare `new Date()` at all three callsites):
```ts
// In the three routes that must honour the shift:
const offset = await readQaTimeOffset();
const now = new Date(Date.now() + offset);
```

---

### `src/app/api/debug/__tests__/time-shift.test.ts` (unit test, Vitest)

**Analog:** `src/app/api/debug/__tests__/state.test.ts` (exact — mirror its full structure)

**Hoisted mock plumbing** (state.test.ts lines 33–91) — identical approach: `vi.hoisted()` exports `mockGetSession`, `mockCheatEnabled`, `mockCheckSecret`, and a `mockCookiesSet`/`mockCookiesDelete` spy. No DB mock needed (time-shift route does not touch the DB).

**Top-level mocks** (state.test.ts lines 97–129) — same four mocks:
```ts
vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ set: mockCookiesSet, delete: mockCookiesDelete }),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("@/lib/debug-cheat", () => ({
  cheatEnabled: mockCheatEnabled,
  checkSecret: mockCheckSecret,
  signTimeOffset: vi.fn().mockReturnValue("signed-token"),
  TIME_SHIFT_COOKIE: "leo-qa-time-offset",
}));
```

**Gate-order test structure** (state.test.ts lines 207–426) — reproduce these five describe blocks for the time-shift POST handler:
1. `cheatEnabled() guard (fires before auth)` → 404, `mockGetSession` not called
2. `session auth guard` → 401
3. `secret gate` → 403 when `checkSecret` returns false
4. `clear:true` → deletes cookie, returns `{ ok: true, cleared: true }`
5. `happy path` → calls `signTimeOffset(offsetMs)`, sets cookie, returns `{ ok: true }`

**`beforeEach` reset pattern** (state.test.ts lines 178–201):
```ts
beforeEach(() => {
  vi.clearAllMocks();
  mockCheatEnabled.mockReturnValue(true);
  mockCheckSecret.mockReturnValue(true);
  mockGetSession.mockResolvedValue({ user: { id: "user-001" } });
});
```

---

### `e2e/14-qa-parity.spec.ts` — extend existing QAOB-04 spec

**Analog:** `e2e/14-qa-parity.spec.ts` itself (the block to extend)

**Existing endpoint assertion block** (14-qa-parity.spec.ts lines 80–91) — the block to ADD the new assertion into:
```ts
// ── Step 4: Endpoint assertions (only when feature is confirmed off) ──────
if (featureDisabled) {
  const stateRes = await page.request.get("/api/debug/state?secret=anything");
  expect(stateRes.status()).toBe(404);

  const cheatRes = await page.request.post("/api/debug/cheat", {
    data: { secret: "anything", level: 1 },
  });
  expect(cheatRes.status()).toBe(404);

  // ADD AFTER the cheatRes assertion:
  const timeShiftRes = await page.request.post("/api/debug/time-shift", {
    data: { secret: "anything", offsetMs: 86400000 },
  });
  expect(timeShiftRes.status()).toBe(404);
}
```

The probe (lines 41–44) uses `GET /api/debug/state` as the feature-state detector — this
is fine; it does not need to be changed to probe `/api/debug/time-shift` instead.

---

## "Now" Callsites the Time-Shift Must Modify

These are the three locations where `new Date()` is constructed for SRS/habitat computation.
All three must be changed to `new Date(Date.now() + offset)` after `readQaTimeOffset()`.

| File | Line | Current code | Required change |
|---|---|---|---|
| `src/app/api/study/complete/route.ts` | **170** | `const now = new Date();` | `const offset = await readQaTimeOffset(); const now = new Date(Date.now() + offset);` |
| `src/app/api/habitat/route.ts` | **38** | `computeHabitatState(facts, new Date(), override ?? undefined)` | `const offset = await readQaTimeOffset(); const state = computeHabitatState(facts, new Date(Date.now() + offset), override ?? undefined);` |
| `src/app/api/debug/state/route.ts` | **63** | `const real = computeHabitatState(facts, new Date());` | `const offset = await readQaTimeOffset(); const real = computeHabitatState(facts, new Date(Date.now() + offset));` |

**Not modified:** `src/app/api/cards/[id]/pause/route.ts` and `unpause/route.ts` —
they record wall-clock timestamps (`pausedAt`) that the harness controls directly.
The SRS/habitat engine functions themselves already accept `now` as a parameter and
contain no `new Date()` calls internally (RESEARCH §4 confirmed: pure functions).

---

## Shared Patterns

### Feature-gate (cheatEnabled + checkSecret)
**Source:** `src/lib/debug-cheat.ts` lines 52–67, `src/app/api/debug/cheat/route.ts` lines 34–71
**Apply to:** `src/app/api/debug/time-shift/route.ts`

The gate always fires in this order: `cheatEnabled()` → auth → rate-limit → `checkSecret()`.
The 404 for disabled feature fires BEFORE auth (the unit tests for `state/route.ts` assert
`mockGetSession` is NOT called when `cheatEnabled` returns false — the time-shift test
must assert the same).

```ts
// src/lib/debug-cheat.ts lines 52–54
export function cheatEnabled(): boolean {
  return typeof env.DEBUG_CHEAT_SECRET === "string";
}
```

### HMAC-SHA256 cookie signing
**Source:** `src/lib/debug-cheat.ts` lines 69–89 (`base64url`, `hmac`, `signOverride`)
**Apply to:** new `signTimeOffset`/`verifyTimeOffset` additions in the same file

```ts
// src/lib/debug-cheat.ts lines 69–79
function base64url(buf: Buffer): string {
  return buf.toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function hmac(payloadB64: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payloadB64).digest());
}
```
The `signTimeOffset` / `verifyTimeOffset` additions are just new callers of these two
private helpers — they live in the same file and require no changes to `base64url`/`hmac`.

### Cookie set attributes
**Source:** `src/app/api/debug/cheat/route.ts` lines 110–116
**Apply to:** `src/app/api/debug/time-shift/route.ts` set branch

```ts
cookieStore.set(CHEAT_COOKIE, signOverride(override), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 1 week
});
```
Replicate these exact attributes for `TIME_SHIFT_COOKIE`.

### ESM script env guard
**Source:** `scripts/cleanup-test-users.mjs` lines 14–18
**Apply to:** every `scripts/qa-*.mjs` file

```js
const url = process.env.CLEANUP_DB_URL;
if (!url) {
  console.error("FATAL: set CLEANUP_DB_URL");
  process.exit(1);
}
```
Each journey script must guard `DATABASE_URL` and `DEBUG_CHEAT_SECRET` at startup with
the same pattern before any fetch or DB call.

### Rate limiter
**Source:** `src/app/api/debug/cheat/route.ts` lines 22, 45–54
**Apply to:** `src/app/api/debug/time-shift/route.ts`

```ts
const cheatLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });
// ... inside handler:
const limit = cheatLimiter.check(session.user.id);
if (!limit.allowed) {
  return Response.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
  });
}
```

---

## No Analog Found

None. All 11 new/modified files have a close analog in the codebase.

---

## Metadata

**Analog search scope:** `scripts/`, `src/app/api/debug/`, `src/lib/`, `e2e/`
**Files read:** 12 (cleanup-test-users.mjs, render-habitat-posters.mjs, debug-cheat.ts, cheat/route.ts, state/route.ts, study/complete/route.ts, habitat/route.ts, debug/__tests__/state.test.ts, e2e/14-qa-parity.spec.ts, e2e/helpers.ts, 15-CONTEXT.md, 15-RESEARCH.md)
**Pattern extraction date:** 2026-06-25
