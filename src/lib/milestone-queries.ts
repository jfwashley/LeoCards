// Server-only query functions — NOT "use server".
// These are called from Server Components or Route Handlers, not from the client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.

import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { cards, decks, milestones_seen } from "@/db/schema";

// ============================================================
// markMilestonesSeen
// ============================================================

/**
 * Inserts milestones_seen rows for each level crossed from prevLevel+1 to newLevel.
 *
 * - Milestone key format: "level-N" (e.g., "level-3", "level-4")
 * - Uses onConflictDoNothing — idempotent, safe to call multiple times (D-06)
 * - Early return when newLevel <= prevLevel (no level-up occurred)
 *
 * @param userId - Authenticated user's ID
 * @param prevLevel - The habitat level before this session
 * @param newLevel - The habitat level after this session
 */
export async function markMilestonesSeen(
  userId: string,
  prevLevel: number,
  newLevel: number,
): Promise<void> {
  // Early return: no level-up occurred
  if (newLevel <= prevLevel) return;

  // Build all milestone rows at once, then insert in a single batch (SEC-04)
  const rows = [];
  for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
    rows.push({
      id: crypto.randomUUID(),
      userId,
      milestone: `level-${lvl}`,
    });
  }

  // Single batch INSERT with ON CONFLICT DO NOTHING (idempotent, D-06)
  await db.insert(milestones_seen).values(rows).onConflictDoNothing();
}

// ============================================================
// getLanguageBreakdown
// ============================================================

/**
 * Returns per-language learned card counts for the given user.
 *
 * Only languages with at least 1 learned card (masteryRound >= 3) are returned.
 * Useful for the dashboard breakdown widget (HAB-07).
 *
 * @param userId - Authenticated user's branded UserId
 */
export async function getLanguageBreakdown(
  userId: UserId,
): Promise<Array<{ language: string; count: number }>> {
  const rows = await db
    .select({ language: decks.language, count: count() })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(decks.userId, userId as string), gte(cards.masteryRound, 3)))
    .groupBy(decks.language);

  return rows.map((r) => ({ language: r.language, count: r.count }));
}
