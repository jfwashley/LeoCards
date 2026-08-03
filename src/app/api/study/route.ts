import { CORE_ERROR_STATUS } from "@leocards/domain/contracts";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { loadStudySessionCore } from "@/lib/core/study";
import { readQaTimeOffset } from "@/lib/debug-cheat";
import { createRateLimiter } from "@/lib/rate-limit";

// 60 requests/minute/user — matches GET /api/dashboard. A study session load
// happens once per session start plus retries; 60/min leaves ample headroom
// while capping the polling pattern RESEARCH names as this phase's live DoS
// threat.
const studyLoadLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

// ============================================================
// GET /api/study
// ============================================================

/**
 * Returns the full study session for a deck in one authenticated request —
 * the same cards, in the same order, with the same stages the web study
 * page shows — composed by the SAME loadStudySessionCore the web RSC page
 * delegates to, so native and web can never disagree about what a session
 * contains (D-07).
 *
 * A foreign or missing deck both resolve to 403 (T-12-08 — existence must
 * never leak); a missing `?deck=` query parameter resolves to 400. An empty
 * session is a 200 with `cards: []`, never a redirect — the native client
 * decides its own empty-state UI.
 */
export async function GET(request: NextRequest) {
  // 1. Auth — the cached-cookie fast path (read-mostly screen load),
  // matching every new native-v1 endpoint except the revocation-sensitive
  // /api/account.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = studyLoadLimiter.check(session.user.id);
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

  // 3. Deck selection — validated and ownership-gated inside the core, never
  // trusted here.
  const deckId = request.nextUrl.searchParams.get("deck") ?? "";

  // 4. QA time-shift, mirroring /api/study/complete and /api/habitat — the
  // web page deliberately does NOT apply this offset (only this route does).
  const offset = await readQaTimeOffset();
  const now = new Date(Date.now() + offset);

  const result = await loadStudySessionCore({
    userId: session.user.id as UserId,
    deckId,
    now,
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
