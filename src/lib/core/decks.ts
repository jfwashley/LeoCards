// src/lib/core/decks.ts
//
// The single implementation of deck creation and card creation that both
// the web app's server actions (src/lib/deck-actions.ts) and, from 28.1-07,
// the native-v1 POST /api/decks and POST /api/cards route handlers delegate
// to. This is the D-03 mechanism: one core function per write, two thin
// entry-point adapters — never a second, subtly different copy of the
// ownership check living in a route handler.
//
// This module deliberately carries no directive marking it as a Next.js
// Server Action — it is called by a server action and by route handlers,
// not directly by the client. It also takes an already-authenticated userId
// rather than resolving one, and never triggers page-cache invalidation:
// both stay at each entry point's own boundary (DR-10/DR-11 in
// 28.1-04-PLAN.md's planner_decisions).

import type { CoreResult } from "@leocards/domain/contracts";
import { CreateCardSchema, CreateDeckSchema } from "@leocards/domain/schemas";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import type { CardId, DeckId, UserId } from "@/db/schema";
import { cards, decks } from "@/db/schema";

// ============================================================
// Language label map for auto-generated deck names
// ============================================================

/**
 * Business logic, not presentation: this map determines the persisted deck
 * `name` column, so it lives here rather than in the UI layer.
 * src/lib/deck-actions.ts imports this rather than keeping a second copy —
 * one map, one source of truth.
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

// ============================================================
// createDeckCore
// ============================================================

/**
 * Creates a new deck for an already-authenticated user with an
 * auto-generated name "{Language} #{n}" where n = count of existing decks
 * for that user+language + 1.
 */
export async function createDeckCore(input: {
  userId: UserId;
  language: string;
}): Promise<CoreResult<{ id: DeckId; name: string; language: string }>> {
  const parsed = CreateDeckSchema.safeParse({ language: input.language });
  if (!parsed.success) {
    return { ok: false, code: "invalid" };
  }
  const { language } = parsed.data;
  const { userId } = input;

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
  return { ok: true, data: { id, name, language } };
}

// ============================================================
// saveCardCore
// ============================================================

/**
 * Adds a card to a deck with the given front/back text and source
 * indicator. Ownership is checked with a single combined-WHERE gate
 * (T-28.1-15) so a foreign or missing deck both resolve to the same
 * "forbidden" outcome — existence never leaks (T-12-08).
 */
export async function saveCardCore(input: {
  userId: UserId;
  deckId: string;
  front: string;
  back: string;
  source: "manual" | "wordlist" | "image";
}): Promise<CoreResult<{ id: CardId }>> {
  const parsed = CreateCardSchema.safeParse({
    deckId: input.deckId,
    front: input.front,
    back: input.back,
    source: input.source,
  });
  if (!parsed.success) {
    return { ok: false, code: "invalid" };
  }
  const { deckId, front, back, source } = parsed.data;
  const { userId } = input;

  // Combined-WHERE ownership gate (IN-01) — a single atomic query that
  // structurally cannot return a foreign-user deck row. The returned
  // userId is also compared in application code as a defense-in-depth
  // belt-and-braces check; either a missing row or a mismatched owner
  // resolves to the identical "forbidden" outcome, so existence never
  // leaks either way (T-12-08).
  const deckRows = await db
    .select({ id: decks.id, userId: decks.userId })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));
  const deckRow = deckRows[0];
  if (!deckRow || deckRow.userId !== userId) {
    return { ok: false, code: "forbidden" };
  }

  const id = crypto.randomUUID() as CardId;
  await db
    .insert(cards)
    .values({ id, deckId: deckId as DeckId, front, back, source });
  return { ok: true, data: { id } };
}
