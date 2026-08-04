import { CORE_ERROR_STATUS } from "@leocards/domain/contracts";
import { CreateCardSchema } from "@leocards/domain/schemas";
import { headers } from "next/headers";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { saveCardCore } from "@/lib/core/decks";
import { createRateLimiter } from "@/lib/rate-limit";

// 30/min/user — mirrors pause's cheap-single-row-write budget
// (src/app/api/cards/[id]/pause/route.ts) and supports rapid manual card
// entry.
const createCardLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

/**
 * POST /api/cards
 *
 * Manual add-a-word — creates a card in a deck the caller owns. A pure
 * adapter over saveCardCore (src/lib/core/decks.ts): this handler owns
 * auth, rate limiting, body parsing and status mapping only. Every
 * ownership check, ID generation and the write itself live in the core, so
 * this file carries no business logic of its own.
 *
 * Errors return `{ error: "..." }` with a matching HTTP status; a foreign
 * or missing deck both resolve to the identical forbidden response (T-12-08
 * — existence is never signalled). Success returns the raw
 * CreateCardResponse `{ id }`, no wrapper key. This handler does not touch
 * Next.js's page cache — that stays at the web server action's own
 * boundary and has no meaning for a native client.
 */
export async function POST(request: Request) {
  // 1. Auth — cached-cookie fast path, matching every other write handler
  // in this repo (the fresh-read variant is reserved for the
  // revocation-sensitive account read).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = createCardLimiter.check(session.user.id);
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

  // 3. Parse and validate the request body — unknown keys (e.g. a
  // client-supplied user id) are dropped by the schema, never forwarded.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = CreateCardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // 4. Delegate to the core — only the session's own user id is ever
  // forwarded (T-28.1-32).
  const result = await saveCardCore({
    ...parsed.data,
    userId: session.user.id as UserId,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.code },
      { status: CORE_ERROR_STATUS[result.code] },
    );
  }

  // 5. Success — the raw { id }, no wrapper key.
  return Response.json(result.data);
}
