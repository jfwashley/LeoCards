// Server-only query functions — NOT "use server".
// These are called from Server Components, not from client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks, user } from "@/db/schema";
import type { UserId } from "@/db/schema";

// ============================================================
// getUserDecks
// ============================================================

/**
 * Returns all decks for a user, ordered by creation date (oldest first).
 */
export async function getUserDecks(userId: string) {
  return db
    .select()
    .from(decks)
    .where(eq(decks.userId, userId as UserId))
    .orderBy(decks.createdAt);
}

// ============================================================
// getDeckCards
// ============================================================

/**
 * Returns all cards in a deck, sorted by createdAt ascending (oldest first).
 * Phase 2 sort: createdAt ASC — Phase 3 will replace with review queue ordering.
 */
export async function getDeckCards(deckId: string) {
  return db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(cards.createdAt);
}

// ============================================================
// getDeckCardWords
// ============================================================

/**
 * Returns a Set of "front::back" keys for all wordlist-sourced cards in a deck.
 * Used by the word list browser to show which words are already added.
 */
export async function getDeckCardWords(deckId: string): Promise<Set<string>> {
  const deckCards = await db
    .select({ front: cards.front, back: cards.back })
    .from(cards)
    .where(and(eq(cards.deckId, deckId), eq(cards.source, "wordlist")));
  return new Set(deckCards.map((c) => `${c.front}::${c.back}`));
}

// ============================================================
// getUserNativeLanguage
// ============================================================

/**
 * Returns the native language code for a user (defaults to "en" if not set).
 */
export async function getUserNativeLanguage(userId: string): Promise<string> {
  const [row] = await db
    .select({ nativeLanguage: user.nativeLanguage })
    .from(user)
    .where(eq(user.id, userId as UserId));
  return row?.nativeLanguage ?? "en";
}
