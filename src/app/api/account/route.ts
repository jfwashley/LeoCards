// src/app/api/account/route.ts
//
// GET /api/account — account basics for a native client. This is the ONE
// revocation-sensitive read in this phase (D-04): the session read below
// passes the cache-bypassing query flag (see it inline further down) so a
// just-revoked or just-deleted session can never be served from
// better-auth's cookie cache. This mirrors the internals of the app's
// other fresh-session accessor (src/lib/auth-session.ts) and the /account
// page's existing precedent. That accessor itself is deliberately NOT
// imported here — it wraps react's cache(), meant for de-duping across a
// single RSC render pass, which has no meaning for a standalone route
// handler.

import { CORE_ERROR_STATUS } from "@leocards/domain/contracts";
import { headers } from "next/headers";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { loadAccountCore } from "@/lib/core/account";
import { createRateLimiter } from "@/lib/rate-limit";

// 30/min/user — each call is a live session read by design (the cache
// bypass above), making this the most expensive read in the native-v1 set;
// the ceiling reflects that cost rather than expected call volume.
const accountLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

export async function GET() {
  // 1. Auth — the fresh, cache-bypassing read described in the file header.
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = accountLimiter.check(session.user.id);
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

  // 3. Compose the response via the same core the /account page delegates
  // to, so web and native can never disagree about what "account basics"
  // means.
  const result = await loadAccountCore({
    userId: session.user.id as UserId,
    name: session.user.name,
    email: session.user.email,
    createdAt: session.user.createdAt,
    nativeLanguage: session.user.nativeLanguage,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.code },
      { status: CORE_ERROR_STATUS[result.code] },
    );
  }

  // 4. Success — the raw AccountResponse, no wrapper key.
  return Response.json(result.data);
}
