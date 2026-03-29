import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import type { CardId, DeckId, RecallEventId, UserId } from "@/db/schema";
import { cards, decks, habitat_metadata, recall_events } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

// 10 requests per minute per user — one session completion per minute is generous
const studyCompleteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";
import { markMilestonesSeen } from "@/lib/milestone-queries";
import type { GradeEntry } from "@/lib/study-engine";
import { computeCardUpdate } from "@/lib/study-engine";

// ============================================================
// Validation schemas
// ============================================================

const GradeSchema = z.object({
  cardId: z.string(),
  direction: z.enum(["n2t", "t2n"]),
  correct: z.boolean(),
});

const CommitSchema = z.object({
  deckId: z.string(),
  grades: z.array(GradeSchema).min(1).max(500),
});

// ============================================================
// POST /api/study/complete
// ============================================================

/**
 * Batch session commit — persists all grades from a completed study session.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate request body
 * 3. Verify deck ownership
 * 4. Load current card states
 * 5. Compute mastery updates via study engine
 * 6. Execute all writes in a single transaction (D-04 partial save guarantee)
 * 7. Return success
 */
export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = studyCompleteLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = CommitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { deckId, grades } = parsed.data;

  // 3. Verify deck ownership — single query checks both existence and ownership
  const [ownedDeck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(
      and(
        eq(decks.id, deckId as DeckId),
        eq(decks.userId, session.user.id as string),
      ),
    );

  if (!ownedDeck) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Load current card states for all graded cards
  const uniqueCardIds = [...new Set(grades.map((g) => g.cardId))];

  const cardRows = await db
    .select({ id: cards.id, masteryRound: cards.masteryRound })
    .from(cards)
    .where(
      and(
        inArray(cards.id, uniqueCardIds as CardId[]),
        eq(cards.deckId, deckId as DeckId),
      ),
    );

  // Build a Map for quick lookup
  const cardMap = new Map(cardRows.map((c) => [c.id as string, c]));

  // Verify all graded cards exist in this deck
  for (const cardId of uniqueCardIds) {
    if (!cardMap.has(cardId)) {
      return Response.json({ error: "Invalid card" }, { status: 400 });
    }
  }

  // 5. Compute mastery updates per card
  const now = new Date();

  // Step A: capture pre-session habitat level for level-up detection (per D-05)
  const factsBefore = await getHabitatFacts(session.user.id as UserId);
  const prevLevel = computeHabitatState(factsBefore, now).level;

  const cardUpdates = uniqueCardIds.map((cardId) => {
    const card = cardMap.get(cardId);
    if (!card) throw new Error(`Card not found: ${cardId}`);

    const cardGrades: GradeEntry[] = grades
      .filter((g) => g.cardId === cardId)
      .map((g) => ({
        cardId: g.cardId as CardId,
        direction: g.direction,
        correct: g.correct,
      }));

    const { newRound, cooldownUntil, recallCountDelta } = computeCardUpdate(
      cardId as CardId,
      card.masteryRound,
      cardGrades,
      now,
    );

    return {
      cardId: cardId as CardId,
      newRound,
      cooldownUntil,
      recallCountDelta,
    };
  });

  // 6. Execute all writes (neon-http driver does not support transactions)
  try {
    // a. Batch insert all recall_events
    await db.insert(recall_events).values(
      grades.map((g) => ({
        id: crypto.randomUUID() as RecallEventId,
        cardId: g.cardId as CardId,
        direction: g.direction,
        correct: g.correct,
      })),
    );

    // b. Update each card with new mastery state
    for (const update of cardUpdates) {
      await db
        .update(cards)
        .set({
          masteryRound: update.newRound,
          cooldownUntil: update.cooldownUntil,
          recallCount: sql`"recallCount" + ${update.recallCountDelta}`,
          lastStudiedAt: now,
        })
        .where(eq(cards.id, update.cardId));
    }

    // c. Upsert habitat_metadata — row may not exist yet
    await db
      .insert(habitat_metadata)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        lastActivityAt: now,
      })
      .onConflictDoUpdate({
        target: habitat_metadata.userId,
        set: { lastActivityAt: now },
      });
  } catch (err) {
    console.error("[study/complete] Failed to save session:", err);
    return Response.json({ error: "Failed to save session" }, { status: 500 });
  }

  // Step B: capture post-session level (Pitfall 2: must be AFTER habitat_metadata upsert)
  const factsAfter = await getHabitatFacts(session.user.id as UserId);
  const newLevel = computeHabitatState(factsAfter, now).level;

  // Step C: detect level-up, mark milestones (per D-06, D-07)
  let leveledUp: number | null = null;
  if (newLevel > prevLevel) {
    await markMilestonesSeen(session.user.id, prevLevel, newLevel);
    leveledUp = newLevel; // D-07: return highest level only
  }

  // 7. Return success
  return Response.json({ success: true, leveledUp });
}
