// src/lib/core/study.ts
//
// The single implementation of the study screen's load path — deck-ownership
// verification plus SRS session assembly — used by BOTH the web RSC page
// (src/app/(protected)/study/page.tsx) and the native-v1 GET /api/study route
// handler. This is the D-03 mechanism applied to a read: one core function,
// two entry points, so which cards get fetched, how they map to session
// inputs, and what an empty session means can never diverge between web and
// native (D-07's "identical by construction" guarantee).
//
// This module deliberately never establishes its own auth session, never
// touches cookies, and never triggers Next.js page-cache revalidation —
// those stay at each entry point's own boundary, mirroring
// src/lib/core/dashboard.ts's existing convention.

import type {
  CoreResult,
  StudySessionResponse,
} from "@leocards/domain/contracts";
import type { CardForSession } from "@leocards/domain/study";
import { assembleSession } from "@leocards/domain/study";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import type { DeckId, UserId } from "@/db/schema";
import { decks } from "@/db/schema";
import { getStudyCards } from "@/lib/study-queries";

/**
 * Loads the study session for a deck: the ownership gate plus SRS session
 * assembly, serialised to the wire contract.
 *
 * `now` is an explicit input (never resolved internally) so both entry
 * points control determinism at their own boundary — the web page passes a
 * plain `new Date()`, while the route handler additionally applies the QA
 * time-shift offset before calling in (mirroring loadDashboardCore's/GET
 * /api/habitat's existing asymmetry).
 */
export async function loadStudySessionCore(input: {
  userId: UserId;
  deckId: string;
  now: Date;
}): Promise<CoreResult<StudySessionResponse>> {
  const { userId, deckId, now } = input;

  if (!deckId) {
    return { ok: false, code: "invalid" };
  }

  // Ownership gate, identical to the pre-extraction page's query — a single
  // combined-WHERE select naming BOTH the deck id and the user id. No row →
  // "forbidden". A missing deck and a foreign deck resolve to the identical
  // outcome (T-12-08 — existence must never leak). getStudyCards is not
  // called until this resolves.
  const [ownedDeck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));

  if (!ownedDeck) {
    return { ok: false, code: "forbidden" };
  }

  // getStudyCards' pause-exclusion filter is reused unchanged — paused cards
  // stay excluded at the query layer per 12-CONTEXT.md D-04 so
  // assembleSession stays pause-agnostic.
  const rawCards = await getStudyCards(deckId);

  const allCards: CardForSession[] = rawCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    masteryRound: c.masteryRound,
    cooldownUntil: c.cooldownUntil,
    createdAt: c.createdAt,
    isResurface: false,
  }));

  const sessionCards = assembleSession(allCards, now);

  const cards = sessionCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    masteryRound: c.masteryRound,
    cooldownUntil: c.cooldownUntil ? c.cooldownUntil.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    isResurface: c.isResurface,
    stage: c.stage,
  }));

  return { ok: true, data: { deckId, cards } };
}
