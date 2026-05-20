// Server-only query functions — NOT "use server".
// These are called from Server Components, not from client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import type { CardId } from "@/db/schema";
import { cards } from "@/db/schema";

// ============================================================
// getStudyCards
// ============================================================

/**
 * Returns all cards in a deck with mastery fields needed for session assembly.
 * The session assembly logic (filtering by cooldownUntil, splitting learned vs
 * unlearned) happens in the study-engine pure functions on the calling side.
 */
export async function getStudyCards(deckId: string): Promise<
  Array<{
    id: CardId;
    front: string;
    back: string;
    masteryRound: number;
    cooldownUntil: Date | null;
    createdAt: Date;
    recallCount: number;
  }>
> {
  return db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      masteryRound: cards.masteryRound,
      cooldownUntil: cards.cooldownUntil,
      createdAt: cards.createdAt,
      recallCount: cards.recallCount,
    })
    .from(cards)
    // Paused cards (pausedAt IS NOT NULL) are filtered out at the query layer per 12-CONTEXT.md D-04
    // so that assembleSession and earliestCooldownEnd remain pause-agnostic.
    .where(and(eq(cards.deckId, deckId), isNull(cards.pausedAt)));
}
