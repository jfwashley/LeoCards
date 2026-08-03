// Server-only query functions — NOT "use server".
// These are called from Server Components or Route Handlers, not from the client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.

import type { HabitatFacts } from "@leocards/domain/habitat";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { cards, decks, habitat_metadata } from "@/db/schema";

// ============================================================
// getHabitatFacts
// ============================================================

/**
 * Fetches the raw DB facts needed to compute habitat state.
 *
 * Executes two queries in parallel (single round trip via Promise.all):
 * 1. habitat_metadata row — provides lastActivityAt
 * 2. Cross-deck learned card count — cards with masteryRound >= 3 across ALL user's decks
 *
 * Handles missing habitat_metadata gracefully: if no row exists (new user who has
 * never completed a study session), lastActivityAt is null and learnedCardCount is 0.
 *
 * @param userId - Authenticated user's branded UserId
 */
export async function getHabitatFacts(userId: UserId): Promise<HabitatFacts> {
  const [metaRows, countRows] = await Promise.all([
    // 1. Fetch habitat_metadata to get lastActivityAt
    db
      .select({ lastActivityAt: habitat_metadata.lastActivityAt })
      .from(habitat_metadata)
      .where(eq(habitat_metadata.userId, userId as string))
      .limit(1),

    // 2. Count learned cards (masteryRound >= 3) across ALL user's decks via JOIN
    db
      .select({ value: count() })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id))
      .where(
        and(eq(decks.userId, userId as string), gte(cards.masteryRound, 3)),
      ),
  ]);

  const meta = metaRows[0];
  const learnedCardCount = countRows[0]?.value ?? 0;

  return {
    userId,
    lastActivityAt: meta?.lastActivityAt ?? null,
    learnedCardCount,
  };
}
