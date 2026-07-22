// Server-only query functions — NOT "use server".
// These are called from Server Components, not from client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import type { CardId } from "@/db/schema";
import { cards } from "@/db/schema";

// ============================================================
// deriveStudySubset
// ============================================================

/**
 * Pure JS-derived equivalent of getStudyCards' query — filters out paused
 * cards (pausedAt IS NOT NULL) and projects the same column subset, from an
 * already-fetched full card list (e.g. getDeckCards' result).
 *
 * PERF-16: the dashboard used to run getDeckCards + getStudyCards as two
 * separate queries for the SAME deck, then stitch the results back together
 * per-row. Since getDeckCards already returns every column getStudyCards
 * selects (plus more), the study subset can be derived here in JS from one
 * fetch instead of a second round trip — with identical filtering/shape.
 */
export function deriveStudySubset(
  allCards: (typeof cards.$inferSelect)[],
): Array<{
  id: CardId;
  front: string;
  back: string;
  masteryRound: number;
  cooldownUntil: Date | null;
  createdAt: Date;
  recallCount: number;
}> {
  return allCards
    .filter((c) => c.pausedAt === null)
    .map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      masteryRound: c.masteryRound,
      cooldownUntil: c.cooldownUntil,
      createdAt: c.createdAt,
      recallCount: c.recallCount,
    }));
}

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
  return (
    db
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
      .where(and(eq(cards.deckId, deckId), isNull(cards.pausedAt)))
  );
}
