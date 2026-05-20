import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import type { CardId } from "@/db/schema";
import { cards, decks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

// 30/min/user — see 12-RESEARCH.md § "Rate limit window for pause/unpause".
// Generous enough for a user pausing 10 cards in quick succession, tight
// enough to reject scripted abuse. Mirrors study/complete's module-scope
// limiter declaration pattern (study/complete uses 10/min for a much
// heavier endpoint; pause is a cheap single-row mutation).
const pauseLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

/**
 * POST /api/cards/[id]/pause
 *
 * Sets `pausedAt = now` on the card if it is owned by the session user and
 * not already paused. Idempotent — calling on an already-paused card is a
 * 200 no-op returning the existing `pausedAt`.
 *
 * Errors return `{ error: "..." }` matching the study/complete contract.
 * "Card does not exist" and "card not owned" both return 403 Forbidden
 * (T-12-08 — never leak existence).
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  // 1. Auth — Next 16 requires the headers() promise to be awaited (Pitfall 6)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = pauseLimiter.check(session.user.id);
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

  // 3. Ownership — single SELECT join enforces (card → deck → user) chain
  const [owned] = await db
    .select({
      id: cards.id,
      pausedAt: cards.pausedAt,
      cooldownUntil: cards.cooldownUntil,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(cards.id, id as CardId), eq(decks.userId, session.user.id)));

  if (!owned) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Idempotent pause — already paused → 200 no-op, no write
  if (owned.pausedAt !== null) {
    return Response.json({ pausedAt: owned.pausedAt.toISOString() });
  }

  // 5. Write — single UPDATE statement (row-level atomic on Neon HTTP)
  const now = new Date();
  await db
    .update(cards)
    .set({ pausedAt: now })
    .where(eq(cards.id, id as CardId));

  return Response.json({ pausedAt: now.toISOString() });
}
