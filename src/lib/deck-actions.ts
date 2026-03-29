"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import type { CardId, DeckId, UserId } from "@/db/schema";
import { cards, decks } from "@/db/schema";
import { auth } from "@/lib/auth";

// ============================================================
// Language label map for auto-generated deck names
// ============================================================

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

/** Allow-list of valid language codes (SEC-06) */
const ALLOWED_LANGUAGES = new Set(["fr", "es", "en"]);

// ============================================================
// createDeck
// ============================================================

/**
 * Creates a new deck for the authenticated user with an auto-generated name
 * "{Language} #{n}" where n = count of existing decks for that user+language + 1.
 */
export async function createDeck(language: string) {
  if (!ALLOWED_LANGUAGES.has(language)) {
    throw new Error("Invalid language");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Count existing decks for this user+language to compute n
  const existing = await db
    .select({ count: count() })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.language, language)));

  const n = Number(existing[0]?.count ?? 0) + 1;
  const label = LANGUAGE_LABELS[language] ?? language;
  const name = `${label} #${n}`;
  const id = crypto.randomUUID() as DeckId;

  await db.insert(decks).values({ id, userId, language, name });
  revalidatePath("/dashboard");
  return { id, name, language };
}

// ============================================================
// saveCard
// ============================================================

/**
 * Adds a card to a deck with the given front/back text and source indicator.
 * Verifies that the deck belongs to the authenticated user.
 */
export async function saveCard(
  deckId: string,
  front: string,
  back: string,
  source: "manual" | "wordlist",
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Verify deck ownership
  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId as DeckId));
  const deck = deckRows[0];
  if (!deck || deck.userId !== userId) throw new Error("Forbidden");

  const id = crypto.randomUUID() as CardId;
  await db
    .insert(cards)
    .values({ id, deckId: deckId as DeckId, front, back, source });
  revalidatePath("/dashboard");
  return { id };
}

// ============================================================
// editCard
// ============================================================

/**
 * Updates the front and back text of an existing card.
 * Verifies that the card's deck belongs to the authenticated user.
 */
export async function editCard(cardId: string, front: string, back: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Load card with its deck to verify ownership
  const rows = await db
    .select({ cardId: cards.id, deckUserId: decks.userId })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(cards.id, cardId as CardId));

  const row = rows[0];
  if (!row || row.deckUserId !== userId) throw new Error("Forbidden");

  await db
    .update(cards)
    .set({ front, back, updatedAt: new Date() })
    .where(eq(cards.id, cardId as CardId));

  revalidatePath("/dashboard");
}

// ============================================================
// deleteCard
// ============================================================

/**
 * Deletes a card from a deck.
 * Verifies that the card's deck belongs to the authenticated user.
 */
export async function deleteCard(cardId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Load card with its deck to verify ownership
  const rows = await db
    .select({ cardId: cards.id, deckUserId: decks.userId })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(cards.id, cardId as CardId));

  const row = rows[0];
  if (!row || row.deckUserId !== userId) throw new Error("Forbidden");

  await db.delete(cards).where(eq(cards.id, cardId as CardId));
  revalidatePath("/dashboard");
}

// ============================================================
// addWordToCard
// ============================================================

/**
 * Adds a word list entry as a card to a deck with source="wordlist".
 * Verifies that the deck belongs to the authenticated user.
 */
export async function addWordToCard(
  deckId: string,
  _wordId: string,
  front: string,
  back: string,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Verify deck ownership
  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId as DeckId));
  const deck = deckRows[0];
  if (!deck || deck.userId !== userId) throw new Error("Forbidden");

  const id = crypto.randomUUID() as CardId;
  await db.insert(cards).values({
    id,
    deckId: deckId as DeckId,
    front,
    back,
    source: "wordlist",
  });
  revalidatePath("/dashboard");
  return { id };
}

// ============================================================
// removeWordFromDeck
// ============================================================

/**
 * Removes a wordlist-sourced card from a deck by matching front+back.
 * Verifies that the deck belongs to the authenticated user.
 */
export async function removeWordFromDeck(
  deckId: string,
  front: string,
  back: string,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Verify deck ownership
  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId as DeckId));
  const deck = deckRows[0];
  if (!deck || deck.userId !== userId) throw new Error("Forbidden");

  await db
    .delete(cards)
    .where(
      and(
        eq(cards.deckId, deckId as DeckId),
        eq(cards.front, front),
        eq(cards.back, back),
        eq(cards.source, "wordlist"),
      ),
    );
  revalidatePath("/dashboard");
}
