import { CORE_ERROR_STATUS } from "@leocards/domain/contracts";
import { CreateDeckSchema } from "@leocards/domain/schemas";
import { headers } from "next/headers";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createDeckCore } from "@/lib/core/decks";
import { createRateLimiter } from "@/lib/rate-limit";

// 10/min/user — deck creation is rare, and each deck is a durable,
// user-visible object with no bulk-delete affordance in v1, so a tight
// ceiling caps deck-spam.
const createDeckLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

/**
 * POST /api/decks
 *
 * First-deck creation for a freshly signed-up native user — the endpoint
 * behind what the web client reaches through its /welcome flow's first
 * step, which has no page-based equivalent for a native client. A pure
 * adapter over createDeckCore (src/lib/core/decks.ts): this handler owns
 * auth, rate limiting, body parsing and status mapping only, with no
 * business logic of its own.
 *
 * Errors return `{ error: "..." }` with a matching HTTP status. Success
 * returns the raw CreateDeckResponse `{ id, name, language }`, no wrapper
 * key. This handler does not touch Next.js's page cache — see POST
 * /api/cards for the same rationale.
 */
export async function POST(request: Request) {
  // 1. Auth — cached-cookie fast path, matching every other write handler
  // in this repo.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = createDeckLimiter.check(session.user.id);
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

  // 3. Parse and validate the request body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = CreateDeckSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // 4. Delegate to the core — only the session's own user id is ever
  // forwarded (T-28.1-32).
  const result = await createDeckCore({
    language: parsed.data.language,
    userId: session.user.id as UserId,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.code },
      { status: CORE_ERROR_STATUS[result.code] },
    );
  }

  // 5. Success — the raw { id, name, language }, no wrapper key.
  return Response.json(result.data);
}
