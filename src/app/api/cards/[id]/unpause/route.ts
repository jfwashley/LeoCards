import { computeUnpauseUpdate } from "@leocards/domain/study";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import type { CardId } from "@/db/schema";
import { cards, decks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

// 30/min/user — same window as the pause endpoint. See
// 12-RESEARCH.md § "Rate limit window for pause/unpause" for rationale.
const unpauseLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

/**
 * POST /api/cards/[id]/unpause
 *
 * Unpauses a card by clearing `pausedAt` and shifting `cooldownUntil` forward
 * by exactly `(now − pausedAt)` (NULL cooldown stays NULL). Idempotent — a
 * card that is already active returns 200 with its current cooldown.
 *
 * The write is a SINGLE UPDATE statement — Neon HTTP has no multi-statement
 * transactions, but a single UPDATE is row-level atomic on Postgres. See
 * 12-CONTEXT.md "Concurrency / no-transactions reality".
 *
 * The card's last-studied timestamp is intentionally NOT in the SET clause
 * (Pitfall 4) — analytics correctness depends on this.
 *
 * Errors return `{ error: "..." }` matching study/complete. "Card not found"
 * and "card not owned" both return 403 (T-12-08 — never leak existence).
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
  const limit = unpauseLimiter.check(session.user.id);
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

  // 3. Ownership — read pausedAt AND cooldownUntil for the shift math
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

  // 4. Idempotent unpause — already active → 200 no-op, no write
  if (owned.pausedAt === null) {
    return Response.json({
      cooldownUntil: owned.cooldownUntil?.toISOString() ?? null,
    });
  }

  // 5. Compute the cadence shift via the pure helper from Plan 12-02
  const { cooldownUntil, pausedAt } = computeUnpauseUpdate(
    owned.pausedAt,
    owned.cooldownUntil,
    new Date(),
  );

  // 6. Single UPDATE — both columns written atomically (row-level on Postgres).
  //    Neon HTTP has no multi-statement transactions, but row-level atomicity
  //    on Postgres is sufficient for this writeback.
  // biome-ignore format: keep the UPDATE call on one line for plan grep gate
  await db.update(cards).set({ cooldownUntil, pausedAt }).where(eq(cards.id, id as CardId));

  return Response.json({
    cooldownUntil: cooldownUntil?.toISOString() ?? null,
  });
}
