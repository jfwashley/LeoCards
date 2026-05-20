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
  source: "manual" | "wordlist" | "image",
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
// getSameLanguageDeckBackWords
// ============================================================

/**
 * Returns a Set of all card `back` values (trimmed + lowercased) from the
 * authenticated user's decks that share the same language as the target deck.
 * Used for duplicate detection before adding image-extracted cards.
 * Ownership is verified: a foreign or forged deckId throws "Forbidden".
 */
export async function getSameLanguageDeckBackWords(
  deckId: string,
): Promise<Set<string>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Step 1: Get target deck language + verify ownership (T-11-03)
  const [targetDeck] = await db
    .select({ language: decks.language })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));

  if (!targetDeck) throw new Error("Forbidden");

  // Step 2: Get all back values from cards in same-language decks owned by user
  const rows = await db
    .select({ back: cards.back })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(eq(decks.userId, userId), eq(decks.language, targetDeck.language)),
    );

  return new Set(rows.map((r) => r.back.trim().toLowerCase()));
}

// ============================================================
// saveImageCards
// ============================================================

/**
 * Batch-inserts image-extracted card pairs into a deck.
 * Single auth + ownership check before the insert loop.
 * Continues on per-card failure (Neon HTTP has no transactions — no rollback).
 * Returns an outcomes array aligned by index with cardInputs.
 * revalidatePath called once after all inserts.
 * No card text or image data is logged (T-11-06).
 */
export async function saveImageCards(
  deckId: string,
  cardInputs: Array<{ front: string; back: string }>,
): Promise<Array<{ ok: boolean; error?: string }>> {
  // Guard: validate array shape, cap length, validate each field (T-11 review WR-01)
  if (!Array.isArray(cardInputs) || cardInputs.length === 0) {
    return [];
  }
  if (cardInputs.length > 100) {
    throw new Error("Too many cards in a single request");
  }
  const sanitizedInputs: Array<{ front: string; back: string }> = [];
  for (const input of cardInputs) {
    if (
      !input ||
      typeof input.front !== "string" ||
      typeof input.back !== "string"
    ) {
      throw new Error("Invalid card data");
    }
    const f = input.front.trim();
    const b = input.back.trim();
    if (!f || !b || f.length > 500 || b.length > 500) {
      throw new Error("Invalid card data");
    }
    sanitizedInputs.push({ front: f, back: b });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Verify deck ownership once (T-11-04). Combined-WHERE pattern (IN-01):
  // a single atomic gate that never returns a foreign-user deck row.
  const deckRows = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));
  if (!deckRows[0]) throw new Error("Forbidden");

  // Sequential inserts, continue-on-failure (D-12: Neon HTTP has no transactions)
  const outcomes: Array<{ ok: boolean; error?: string }> = [];
  for (const input of sanitizedInputs) {
    try {
      const id = crypto.randomUUID() as CardId;
      await db.insert(cards).values({
        id,
        deckId: deckId as DeckId,
        front: input.front,
        back: input.back,
        source: "image",
      });
      outcomes.push({ ok: true });
    } catch (err) {
      outcomes.push({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  revalidatePath("/dashboard"); // Once, after all inserts (D-12)
  return outcomes;
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
