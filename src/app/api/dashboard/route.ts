import { CORE_ERROR_STATUS } from "@leocards/domain/contracts";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { loadDashboardCore } from "@/lib/core/dashboard";
import {
  readHabitatOverride,
  readQaAuth,
  readQaTimeOffset,
} from "@/lib/debug-cheat";
import { createRateLimiter } from "@/lib/rate-limit";

// 60 requests/minute/user — generous for real navigation (the dashboard is
// the app's hub and users bounce back to it constantly) but a hard ceiling
// on the polling pattern RESEARCH names as this phase's live DoS threat.
const dashboardLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

// ============================================================
// GET /api/dashboard
// ============================================================

/**
 * Returns everything the dashboard screen needs in one authenticated
 * request — decks, the active deck's cards, and the derived
 * due/cooldown/paused/sleeping flags — composed by the SAME
 * loadDashboardCore the web RSC page delegates to, so native and web can
 * never disagree about what counts as due (D-07).
 *
 * An optional `?deck=` query parameter selects which deck to load. It is
 * never trusted directly: the core resolves it against the caller's OWN
 * decks and falls back to their first deck, so a forged or foreign id can
 * only ever select data the caller already owns.
 *
 * Errors return `{ error: "..." }` with a matching HTTP status; success
 * returns the raw DashboardResponse with no wrapper key.
 */
export async function GET(request: NextRequest) {
  // 1. Auth — the raw call on the cached-cookie fast path (read-mostly
  // screen load). The fresh-read variant is reserved for the
  // revocation-sensitive /api/account.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = dashboardLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  // 3. Optional deck selection — resolved (never trusted) inside the core
  // against the caller's own decks; there is no separate ownership query
  // here because that user-scoped fetch IS the gate.
  const requestedDeckId = request.nextUrl.searchParams.get("deck") ?? undefined;

  // 4. QA cheat handling, mirroring GET /api/habitat: honor both the
  // virtual override AND the time-shift offset. The web page applies only
  // the override (a plain `new Date()`, no offset) — this asymmetry is
  // intentional so the Phase 15 QA harness can drive this endpoint exactly
  // like it drives /api/habitat.
  const habitatOverride = await readHabitatOverride();
  const qaMode = await readQaAuth();
  const offset = await readQaTimeOffset();

  const result = await loadDashboardCore({
    userId: session.user.id as UserId,
    nativeLanguage: session.user.nativeLanguage ?? "en",
    requestedDeckId,
    now: new Date(Date.now() + offset),
    habitatOverride: habitatOverride ?? undefined,
    qaMode,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.code },
      { status: CORE_ERROR_STATUS[result.code] },
    );
  }

  // 5. Success — the raw response object, no wrapper key (the universal
  // convention across every existing route handler in this repo).
  return Response.json(result.data);
}
