# Phase 14: QA Observability Foundations - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/debug-cheat.ts` (extend) | utility | request-response | `src/lib/debug-cheat.ts` itself | exact — internal extension |
| `src/env.ts` (extend) | config | — | `src/env.ts` itself | exact — internal extension |
| `src/app/api/study/complete/route.ts` (extend) | route handler | request-response | `src/app/api/study/complete/route.ts` itself | exact — internal extension |
| `src/app/api/debug/cheat/route.ts` (extend) | route handler | request-response | `src/app/api/debug/cheat/route.ts` itself | exact — internal extension |
| `src/app/api/debug/state/route.ts` (extend) | route handler | request-response | `src/app/api/debug/state/route.ts` itself | exact — internal extension |
| `src/components/qa-state-badge.tsx` (NEW) | component | event-driven | `src/components/deck-view.tsx` (`CountdownTimer`) | role-match (client component + live countdown) |
| `src/app/(protected)/study/page.tsx` (extend) | RSC page | request-response | `src/app/(protected)/dashboard/page.tsx` | exact (same RSC + `readHabitatOverride` pattern) |
| `src/app/(protected)/dashboard/page.tsx` (extend) | RSC page | request-response | `src/app/(protected)/dashboard/page.tsx` itself | exact — internal extension |
| `src/app/(protected)/debug/page.tsx` (extend) | component/page | request-response | `src/app/(protected)/debug/page.tsx` itself | exact — internal extension |
| `e2e/14-qa-parity.spec.ts` (NEW) | test | request-response | `e2e/study-progression.spec.ts` | exact (same Playwright + helper style) |
| `src/lib/debug-cheat.test.ts` (extend) | test | — | `src/lib/debug-cheat.test.ts` itself | exact — internal extension |
| `src/components/__tests__/qa-state-badge.test.ts` (NEW) | test | — | `src/lib/debug-cheat.test.ts` | role-match (vitest unit test, same mock pattern) |
| `src/app/api/study/__tests__/cooldown-config.test.ts` (NEW) | test | — | `src/lib/debug-cheat.test.ts` | role-match (vitest unit test, same mock pattern) |

---

## Pattern Assignments

### `src/lib/debug-cheat.ts` — extend: add `signQaMode`, `verifyQaMode`, `readQaAuth`, `QA_MODE_COOKIE`

**Analog:** `src/lib/debug-cheat.ts` (lines 1–146)

**Imports pattern** (lines 21–25 — no new imports needed):
```typescript
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import type { HabitatOverride, TigerMood } from "@/lib/habitat-engine";
```

**Cookie constant pattern** (line 28 — copy for new constant):
```typescript
export const CHEAT_COOKIE = "leo-habitat-cheat";
// ADD BELOW:
export const QA_MODE_COOKIE = "leo-qa-mode";
```

**Sign function pattern** (lines 78–83 — copy exactly, change payload):
```typescript
export function signOverride(override: HabitatOverride): string {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret) throw new Error("DEBUG_CHEAT_SECRET not set");
  const payloadB64 = base64url(Buffer.from(JSON.stringify(override), "utf8"));
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}
```
New `signQaMode()` uses the same shape with `{ qaMode: true }` as the payload.

**Verify function pattern** (lines 91–133 — copy exactly, remove schema parse step):
```typescript
export function verifyOverride(
  raw: string | null | undefined,
): HabitatOverride | null {
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
  // ...schema parse...
}
```
New `verifyQaMode()` copies through the `timingSafeEqual` check — no schema parse needed (sentinel payload is constant).

**readHabitatOverride pattern** (lines 142–146 — copy for `readQaAuth`):
```typescript
export async function readHabitatOverride(): Promise<HabitatOverride | null> {
  if (!cheatEnabled()) return null;
  const store = await cookies();
  return verifyOverride(store.get(CHEAT_COOKIE)?.value);
}
```
New `readQaAuth()`:
```typescript
export async function readQaAuth(): Promise<boolean> {
  if (!cheatEnabled()) return false;
  const store = await cookies();
  return verifyQaMode(store.get(QA_MODE_COOKIE)?.value);
}
```

---

### `src/env.ts` — extend: add `STUDY_COOLDOWN_MINUTES`

**Analog:** `src/env.ts` (lines 1–42)

**Existing optional server var pattern** (lines 14–21):
```typescript
DEBUG_CHEAT_SECRET: z.string().min(16).optional(),
STUDY_NO_COOLDOWN: z.string().optional(),
```
Both follow: `z.string().[constraints].optional()`.

**New var addition — server block** (insert after line 21):
```typescript
STUDY_COOLDOWN_MINUTES: z
  .string()
  .optional()
  .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
  .pipe(z.number().int().min(1).optional()),
```
Note: t3-env env vars are always strings; the `.transform().pipe()` chain coerces to number with schema validation. This is the only numeric env var in this project — do not use plain `z.number()`.

**runtimeEnv block** (insert after line 33):
```typescript
STUDY_COOLDOWN_MINUTES: process.env.STUDY_COOLDOWN_MINUTES,
```

**`emptyStringAsUndefined: true`** (line 41) — already set project-wide; no change needed, but ensures empty-string `STUDY_COOLDOWN_MINUTES=""` is treated as unset.

---

### `src/app/api/study/complete/route.ts` — extend: `STUDY_COOLDOWN_MINUTES` precedence

**Analog:** `src/app/api/study/complete/route.ts` (lines 1–227)

**Current cooldown resolution** (lines 26–30 — the block to replace):
```typescript
const NO_COOLDOWN =
  process.env.NODE_ENV !== "production" || env.STUDY_NO_COOLDOWN === "true";
const COOLDOWN_CONFIG: Record<number, number | null> = NO_COOLDOWN
  ? { 0: 0, 1: 0, 2: null }
  : DEFAULT_COOLDOWN_MS;
```

**New pattern — wrap in `buildCooldownConfig()` function** (D-09 precedence):
```typescript
function buildCooldownConfig(): Record<number, number | null> {
  // D-09: STUDY_COOLDOWN_MINUTES wins when set — overrides NO_COOLDOWN and dev auto-zero
  if (env.STUDY_COOLDOWN_MINUTES !== undefined) {
    const ms = env.STUDY_COOLDOWN_MINUTES * 60 * 1000;
    return { 0: ms, 1: ms, 2: null }; // round 2→3 is always null (learned)
  }
  // Existing behavior unchanged when unset
  const NO_COOLDOWN =
    process.env.NODE_ENV !== "production" || env.STUDY_NO_COOLDOWN === "true";
  return NO_COOLDOWN ? { 0: 0, 1: 0, 2: null } : DEFAULT_COOLDOWN_MS;
}
const COOLDOWN_CONFIG = buildCooldownConfig();
```

**Auth pattern** (lines 64–68 — no change, copy for reference):
```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
```

**Rate limiting pattern** (lines 11–14, 71–77 — no change):
```typescript
const studyCompleteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
// ...
const limit = studyCompleteLimiter.check(session.user.id);
if (!limit.allowed) {
  return Response.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
  });
}
```

---

### `src/app/api/debug/cheat/route.ts` — extend: set `QA_MODE_COOKIE` on secret verification

**Analog:** `src/app/api/debug/cheat/route.ts` (lines 1–107)

**Feature flag guard** (lines 33–35 — copy for all QA routes):
```typescript
if (!cheatEnabled()) {
  return Response.json({ error: "Not found" }, { status: 404 });
}
```

**Cookie set pattern** (lines 98–104 — copy exactly for `QA_MODE_COOKIE`):
```typescript
cookieStore.set(CHEAT_COOKIE, signOverride(override), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 1 week
});
```
New QA cookie set (add after the CHEAT_COOKIE set, also on clear path):
```typescript
cookieStore.set(QA_MODE_COOKIE, signQaMode(), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 1 week — matches CHEAT_COOKIE
});
```
Note: The QA-mode cookie is set on BOTH the apply (line 98 area) AND the clear (line 76–78 area) paths — any successful secret verification establishes QA mode. On an explicit "log out of QA mode" action, delete both cookies together.

**Cookie delete pattern** (line 77):
```typescript
cookieStore.delete(CHEAT_COOKIE);
```

---

### `src/app/api/debug/state/route.ts` — extend: add `cards[]` to GET response

**Analog:** `src/app/api/debug/state/route.ts` (lines 1–43)

**Full file pattern** (lines 1–43 — this is a small file; extend by adding DB query before the final return):

**Imports pattern** (lines 1–11):
```typescript
import { cookies, headers } from "next/headers";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { CHEAT_COOKIE, cheatEnabled, checkSecret, verifyOverride } from "@/lib/debug-cheat";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";
```
Add for card query:
```typescript
import { db } from "@/db";
import type { DeckId } from "@/db/schema";
import { cards, decks } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
```

**Secret check pattern** (lines 30–33):
```typescript
const secret = new URL(req.url).searchParams.get("secret");
if (!checkSecret(secret)) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
```

**Optional query param pattern** (add alongside existing secret param):
```typescript
const deckId = new URL(req.url).searchParams.get("deck");
```

**Response extension** (replace line 42 `return Response.json({ real, forced });`):
```typescript
// Fetch cards for the target deck (optional ?deck=; falls back to user's first deck)
let cardRows: CardEntry[] = [];
const targetDeckId = deckId ?? (await getFirstDeckId(session.user.id as UserId));
if (targetDeckId) {
  cardRows = await fetchDebugCards(session.user.id as UserId, targetDeckId as DeckId);
}

return Response.json({ real, forced, cards: cardRows });
```

**Direction derivation from masteryRound** (use in `fetchDebugCards` helper):
```typescript
function masteryRoundToDirection(round: number): "n2t" | "t2n" | "either" {
  if (round === 0) return "n2t";
  if (round === 1) return "t2n";
  return "either"; // round 2+ (learned cards get "either")
}
```

---

### `src/components/qa-state-badge.tsx` (NEW)

**Analog:** `src/components/deck-view.tsx` — `CountdownTimer` function (lines 29–91) + `formatCountdown` (lines 29–41)

**Directive and imports pattern** (deck-view.tsx lines 1–6):
```typescript
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
```
For `qa-state-badge.tsx` (subset):
```typescript
"use client";

import { useEffect, useState } from "react";
```

**`formatCountdown` pattern** (deck-view.tsx lines 29–41 — adapt for badge):
```typescript
function formatCountdown(ms: number): string {
  if (ms <= 0) return "<1m";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}
```
Badge format differs slightly (no spaces: `1h30m` not `1h 30m`; returns `""` not `"<1m"` when expired):
```typescript
function formatCd(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}
```

**Hydration-safe `useState` + `useEffect` countdown pattern** (deck-view.tsx lines 51–72):
```typescript
const [countdown, setCountdown] = useState<string>(() => {
  const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
  return formatCountdown(ms);
});

useEffect(() => {
  if (hasDueCards) return;
  function recompute() {
    const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
    if (ms <= 0) { router.refresh(); return; }
    setCountdown(formatCountdown(ms));
  }
  recompute();
  const interval = setInterval(recompute, 60000);
  return () => clearInterval(interval);
}, [earliestCooldownEnd, hasDueCards, router]);
```
Badge adaptation — lazy `useState` initializer (client-only evaluation avoids hydration mismatch):
```typescript
const [cdLabel, setCdLabel] = useState(() => {
  if (!data.cooldownUntil) return "";
  return formatCd(data.cooldownUntil.getTime() - Date.now());
});

useEffect(() => {
  if (!data.cooldownUntil) return;
  const tick = () => {
    const ms = data.cooldownUntil!.getTime() - Date.now();
    setCdLabel(ms > 0 ? formatCd(ms) : "");
  };
  tick();
  // Finer tick for short QA cooldowns (< 5 min)
  const intervalMs = (data.cooldownUntil.getTime() - Date.now()) < 5 * 60_000 ? 10_000 : 60_000;
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}, [data.cooldownUntil]);
```

**DOM attribute for gating test** — add `data-qa-badge` to the outermost element. QAOB-04 asserts `page.locator('[data-qa-badge]').count() === 0`.

**Badge JSX pattern** (no analog in codebase; use Tailwind absolute-positioned overlay):
```tsx
<span
  data-qa-badge
  className="absolute top-1 right-1 z-20 font-mono text-[10px] bg-black/40 text-white/90 rounded px-1 py-0.5 pointer-events-none select-none"
  aria-hidden="true"
>
  {tokens.join("·")}
</span>
```
The parent element (`StudyCard`'s `.relative.w-full` div at deck-view.tsx line 70 and study-card.tsx line 70) already has `relative` positioning — the badge's `absolute` placement works without layout shift.

---

### `src/app/(protected)/study/page.tsx` — extend: pass `qaMode` to `StudySession`

**Analog:** `src/app/(protected)/dashboard/page.tsx` (lines 1–134) — full RSC pattern

**Import pattern for `readHabitatOverride`** (dashboard/page.tsx line 7 — copy for `readQaAuth`):
```typescript
import { readHabitatOverride } from "@/lib/debug-cheat";
// Replace with:
import { readHabitatOverride, readQaAuth } from "@/lib/debug-cheat";
```

**Auth + session pattern** (study/page.tsx lines 23–41):
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) { redirect("/login"); }
// ...deck ownership check...
```

**QA gate call pattern** (dashboard/page.tsx line 44 — add to study/page.tsx before return):
```typescript
const habitatOverride = await readHabitatOverride();
// ADD:
const qaMode = await readQaAuth();
```

**RSC-to-client prop pass pattern** (dashboard/page.tsx lines 121–133):
```typescript
return (
  <DeckView
    decks={deckOptions}
    initialCards={cardRows}
    // ...other props...
    habitatState={habitatState}
  />
);
```
Study page extension:
```typescript
return <StudySession initialCards={sessionCards} deckId={deckId} qaMode={qaMode} />;
```

**Key constraint:** `sessionCards` already contains `masteryRound`, `cooldownUntil`, and `stage` (from `assembleSession`). No extra DB query needed to provide QA badge data on study cards.

---

### `src/app/(protected)/dashboard/page.tsx` — extend: pass `cooldownUntil` + `qaMode` to `DeckView`

**Analog:** `src/app/(protected)/dashboard/page.tsx` itself (lines 1–134)

**`cardRows` construction pattern** (lines 111–119 — extend with `cooldownUntil`):
```typescript
const cardRows = cards.map((c) => ({
  id: c.id,
  front: c.front,
  back: c.back,
  source: c.source,
  createdAt: c.createdAt,
  masteryRound: masteryByCardId.get(c.id) ?? 0,
  pausedAt: c.pausedAt,
  // ADD — QA-only, null for customers when qaMode=false:
  cooldownUntil: qaMode ? (studyCards.find(s => s.id === c.id)?.cooldownUntil ?? null) : null,
}));
```
`studyCards` is already fetched (line 78) and includes `cooldownUntil` — no extra query.

**QA gate addition** (add after line 44 `readHabitatOverride()`):
```typescript
const qaMode = await readQaAuth();
```

---

### `src/app/(protected)/debug/page.tsx` — extend: render per-card state table

**Analog:** `src/app/(protected)/debug/page.tsx` itself (lines 1–329)

**`DebugStateResponse` interface** (lines 34–37 — extend):
```typescript
interface DebugStateResponse {
  real: HabitatState;
  forced: { level?: number; mood?: TigerMood; quality?: number } | null;
  // ADD:
  cards?: CardDebugEntry[];
}
```

**Existing `refresh()` fetch call** (lines 56–93) — no change; the same endpoint now returns `cards[]` when present.

**Existing `data &&` rendering block** (lines 276–316 — add table section after the "Live REAL state" card):
```tsx
{data?.cards && data.cards.length > 0 && (
  <Card className="p-4 flex flex-col gap-2">
    <h2 className="text-lg font-semibold">Card SRS state ({data.cards.length})</h2>
    {/* compact table — copy column/cell pattern from card-list.tsx desktop table */}
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="text-left text-muted-foreground font-normal pb-2 pr-3">Word</th>
          <th className="text-left text-muted-foreground font-normal pb-2 pr-3">R</th>
          <th className="text-left text-muted-foreground font-normal pb-2 pr-3">Dir</th>
          <th className="text-left text-muted-foreground font-normal pb-2 pr-3">Cooldown</th>
          <th className="text-left text-muted-foreground font-normal pb-2 pr-3">Paused</th>
          <th className="text-left text-muted-foreground font-normal pb-2">Learned</th>
        </tr>
      </thead>
      <tbody>
        {data.cards.map((c) => (
          <tr key={c.id} className="border-b border-border">
            {/* ... cells ... */}
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
)}
```

**`Stat` component pattern** (lines 322–328 — copy for a `CooldownCell` helper):
```typescript
function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </>
  );
}
```

---

### `e2e/14-qa-parity.spec.ts` (NEW)

**Analog:** `e2e/study-progression.spec.ts` (lines 1–79)

**File header comment pattern** (study-progression.spec.ts lines 1–9):
```typescript
// Regression e2e for the 2026-05-29 "cards never recorded as learned" bug.
// A round-0 card was only ever shown n2t and graded once, but advancing
// required 2 n2t + 2 t2n correct — impossible — ...
// (describes what the test proves and any prerequisites)
```
New file header:
```typescript
// Prod-parity gating test (QAOB-04).
// Proves QA affordances are absent when DEBUG_CHEAT_SECRET is unset.
// PREREQUISITE: Run against a dev server started without the secret:
//   DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts
// If DEBUG_CHEAT_SECRET is set in .env.local, the 404 assertions will fail
// even though the code is correct — this is expected. See RESEARCH.md pitfall 6.
```

**Imports and helper usage pattern** (study-progression.spec.ts lines 1–3):
```typescript
import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";
```

**Test structure pattern** (study-progression.spec.ts lines 51–78):
```typescript
test.describe("Study progression — card reaches 'learned'", () => {
  test("studying one card correctly across rounds increments learnedCardCount", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 1);
    // ...navigate, interact, assert...
  });
});
```

**`page.request.get()` pattern** (study-progression.spec.ts line 60):
```typescript
const before = await (await page.request.get("/api/habitat")).json();
```
Adapted for 404 assertion:
```typescript
const stateRes = await page.request.get("/api/debug/state?secret=anything");
expect(stateRes.status()).toBe(404);
```

**`page.goto()` + `page.waitForURL()` pattern** (study-progression.spec.ts lines 68–71):
```typescript
await page.goto("/dashboard");
const start = page.getByRole("link", { name: "Start studying" });
await expect(start).toBeVisible({ timeout: 15_000 });
await start.click();
await page.waitForURL(/\/study/);
```

**DOM selector assertion pattern** (adapted for badge absence):
```typescript
expect(await page.locator("[data-qa-badge]").count()).toBe(0);
```

---

### `src/lib/debug-cheat.test.ts` — extend: add `signQaMode`/`verifyQaMode` tests

**Analog:** `src/lib/debug-cheat.test.ts` (lines 1–80)

**Mock setup pattern** (lines 1–9 — copy exactly, no change needed):
```typescript
vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));
```

**Round-trip test pattern** (lines 27–30):
```typescript
it("sign → verify round-trips the override", () => {
  const o = { level: 9, mood: "sad" as const, quality: 0.2 };
  const cookie = signOverride(o);
  expect(verifyOverride(cookie)).toEqual(o);
});
```
New QA mode test:
```typescript
it("signQaMode → verifyQaMode round-trips", () => {
  const cookie = signQaMode();
  expect(verifyQaMode(cookie)).toBe(true);
});
```

**Tamper rejection pattern** (lines 38–48 — copy for QA cookie):
```typescript
it("rejects a tampered payload", () => {
  const cookie = signOverride({ level: 3 });
  const [, sig] = cookie.split(".");
  expect(verifyOverride(`forgedPayload.${sig}`)).toBeNull();
});
```

---

### `src/components/__tests__/qa-state-badge.test.ts` (NEW)

**Analog:** `src/lib/debug-cheat.test.ts` (lines 1–80) — unit test structure and mock pattern

**Mock pattern** (lines 1–9 — adapt for component):
```typescript
vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));
```
For badge tests, no env mock needed — test the pure `formatCd` utility and token generation logic directly (extract `formatCd` as an exported function or test via the component's output).

**`describe`/`it` structure** (lines 18–80):
```typescript
describe("debug-cheat — signed override cookie", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("...", () => { ... });
});
```

**Key test cases to cover:**
- `formatCd(0)` returns `""`
- `formatCd(14 * 60_000)` returns `"14m"`
- `formatCd(90 * 60_000)` returns `"1h30m"`
- Token assembly: `R0·n2t` (no cooldown, not paused, not learned)
- Token assembly: `R1·t2n·cd:22m` (active cooldown)
- Token assembly: `R3·L` (learned)
- Token assembly: `R1·t2n·P` (paused)

---

### `src/app/api/study/__tests__/cooldown-config.test.ts` (NEW)

**Analog:** `src/lib/debug-cheat.test.ts` (lines 1–80) — unit test structure

**Mock pattern** (lines 1–6 — adapt for env):
```typescript
vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));
```
For cooldown config tests, mock `env` with and without `STUDY_COOLDOWN_MINUTES`:
```typescript
// Test 1: STUDY_COOLDOWN_MINUTES set
vi.mock("@/env", () => ({ env: { STUDY_COOLDOWN_MINUTES: 15, STUDY_NO_COOLDOWN: undefined } }));
// Test 2: STUDY_COOLDOWN_MINUTES unset, STUDY_NO_COOLDOWN true
vi.mock("@/env", () => ({ env: { STUDY_COOLDOWN_MINUTES: undefined, STUDY_NO_COOLDOWN: "true" } }));
```
Note: `buildCooldownConfig` must be exported from `complete/route.ts` for unit testing, OR extracted to a separate utility file. Exporting it from the route file is the simpler pattern — consistent with how `computeCardUpdate` is exported from `study-engine.ts`.

**Three precedence branches to test:**
1. `STUDY_COOLDOWN_MINUTES=15` → returns `{ 0: 900000, 1: 900000, 2: null }`
2. `STUDY_COOLDOWN_MINUTES` unset + `STUDY_NO_COOLDOWN="true"` → returns `{ 0: 0, 1: 0, 2: null }`
3. `STUDY_COOLDOWN_MINUTES` unset + production mode → returns `DEFAULT_COOLDOWN_MS`
4. `STUDY_COOLDOWN_MINUTES=15` overrides `STUDY_NO_COOLDOWN="true"` (both set → minutes wins)

---

## Shared Patterns

### QA Feature Gate (hard-OFF when secret unset)
**Source:** `src/app/api/debug/cheat/route.ts` lines 33–35
**Apply to:** All new/extended QA route handlers and any server function that touches QA data
```typescript
if (!cheatEnabled()) {
  return Response.json({ error: "Not found" }, { status: 404 });
}
```

### Auth Session Check
**Source:** `src/app/api/debug/cheat/route.ts` lines 37–40
**Apply to:** All route handlers
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Rate Limiting
**Source:** `src/app/api/debug/cheat/route.ts` lines 20, 43–51; `src/app/api/study/complete/route.ts` lines 11–14
**Apply to:** Any POST route handler (the `/api/debug/state` GET extension reads only, low risk — existing pattern has no rate limiter on GET)
```typescript
const cheatLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });
// ...
const limit = cheatLimiter.check(session.user.id);
if (!limit.allowed) {
  return Response.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
  });
}
```

### Secret Check (constant-time)
**Source:** `src/app/api/debug/cheat/route.ts` line 69; `src/app/api/debug/state/route.ts` lines 30–33
**Apply to:** `/api/debug/state` GET (already uses `checkSecret`); no new routes need this — the QA-mode cookie verification uses `readQaAuth()` instead
```typescript
if (!checkSecret(parsed.data.secret)) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
```

### HMAC Cookie Set
**Source:** `src/app/api/debug/cheat/route.ts` lines 98–104
**Apply to:** Extension of `/api/debug/cheat` POST to also set `QA_MODE_COOKIE`
```typescript
cookieStore.set(COOKIE_NAME, signedValue, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 1 week
});
```

### RSC QA Gate + Prop Pass
**Source:** `src/app/(protected)/dashboard/page.tsx` lines 44, 111–119
**Apply to:** `dashboard/page.tsx` extension and `study/page.tsx` extension
```typescript
const qaMode = await readQaAuth();
// ...
const cardRows = cards.map((c) => ({
  // existing fields...
  cooldownUntil: qaMode ? (/* lookup */) : null,
}));
```
Constraint: `readQaAuth()` is the ONLY server-side gate check. Client components CANNOT read `httpOnly` cookies — the gate is always at the RSC/route-handler layer.

### Vitest Unit Test Mock Pattern
**Source:** `src/lib/debug-cheat.test.ts` lines 1–9
**Apply to:** All new unit test files (`qa-state-badge.test.ts`, `cooldown-config.test.ts`, `debug-cheat.test.ts` extension)
```typescript
vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));
```

### Playwright E2E Test Structure
**Source:** `e2e/study-progression.spec.ts` lines 1–79; `e2e/helpers.ts` lines 1–123
**Apply to:** `e2e/14-qa-parity.spec.ts`
```typescript
import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("...", () => {
  test("...", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 1);
    // page.goto / page.request / page.locator / expect
  });
});
```

---

## No Analog Found

No files are entirely without analog. All new files closely mirror existing patterns in this codebase. The `QaStateBadge` component has no exact analog (no other overlay badge exists) but the `CountdownTimer` in `deck-view.tsx` provides the exact hydration-safe countdown pattern needed.

---

## Critical Constraints (from RESEARCH.md anti-patterns)

These are NOT negotiable — violating any of them will cause bugs or test failures:

1. **Never render `<QaStateBadge>` for customers** — the prop must be `undefined`/`null` from the RSC, not just CSS-hidden. QAOB-04 asserts DOM absence via `[data-qa-badge]` selector.
2. **Never call `cookies().set()` in a Server Component** — QA-mode cookie issuance stays exclusively in `/api/debug/cheat` Route Handler.
3. **Never read the QA cookie on the client** — it is `httpOnly`. Gate is always server-side via `readQaAuth()`.
4. **`useState` lazy initializer for countdown** — `useState(() => ...)` not `useState(formatCd(...))` to avoid hydration mismatch.
5. **`STUDY_COOLDOWN_MINUTES` must be coerced to number via transform/pipe** — plain `z.number()` will not work since env vars are strings.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/api/debug/`, `src/app/api/study/`, `src/app/(protected)/`, `src/components/`, `e2e/`
**Files scanned:** 13 source files read in full
**Pattern extraction date:** 2026-06-12
