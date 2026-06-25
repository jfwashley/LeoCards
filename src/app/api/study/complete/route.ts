import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import type { CardId, DeckId, RecallEventId, UserId } from "@/db/schema";
import { cards, decks, habitat_metadata, recall_events } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

// 10 requests per minute per user — one session completion per minute is generous
const studyCompleteLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

import { env } from "@/env";
import { readQaTimeOffset } from "@/lib/debug-cheat";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";
import { markMilestonesSeen } from "@/lib/milestone-queries";
import type { GradeEntry } from "@/lib/study-engine";
import { computeCardUpdate, DEFAULT_COOLDOWN_MS } from "@/lib/study-engine";

// QA (QAOB-02): compute the cooldown configuration with D-09 precedence:
//   1. STUDY_COOLDOWN_MINUTES (when set) wins over everything — short non-zero
//      cooldowns for testing 12h/24h transitions in 10-60 min window.
//   2. STUDY_NO_COOLDOWN / dev auto-zero when STUDY_COOLDOWN_MINUTES is unset.
//   3. Real 12h/24h defaults in production with no overrides.
// Exported for unit testing — mirrors how computeCardUpdate is exported from study-engine.ts.
export function buildCooldownConfig(): Record<number, number | null> {
  // D-09: STUDY_COOLDOWN_MINUTES wins when set — overrides NO_COOLDOWN and dev auto-zero
  if (env.STUDY_COOLDOWN_MINUTES !== undefined) {
    const ms = env.STUDY_COOLDOWN_MINUTES * 60 * 1000;
    // Round 2->3 is always null (learned) — never apply minutes value to round 2
    return { 0: ms, 1: ms, 2: null };
  }
  // Existing: dev auto-zero or STUDY_NO_COOLDOWN override (unchanged behavior when unset)
  const useNoCooldown =
    process.env.NODE_ENV !== "production" || env.STUDY_NO_COOLDOWN === "true";
  return useNoCooldown ? { 0: 0, 1: 0, 2: null } : DEFAULT_COOLDOWN_MS;
}

const COOLDOWN_CONFIG = buildCooldownConfig();

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
  // Per-session idempotency key (UUID from the client, stable across retries).
  // Required so a replayed batch (study-session.tsx RETRY_COMMIT) is a no-op
  // rather than a double-apply (WR-04). Bounded because it is concatenated into
  // recall_events primary keys.
  commitId: z.string().min(1).max(100),
  grades: z.array(GradeSchema).min(1).max(500),
});

/**
 * Deterministic recall_events primary key derived from the per-session commitId
 * and the grade's position in the (ordered, append-only) batch. A replayed batch
 * carries the same commitId and the same grade order, so every row resolves to an
 * identical id — the insert's onConflictDoNothing then makes the replay a no-op
 * instead of duplicating rows. Distinct indices keep legitimate repeats (a card
 * answered wrong then right in the same direction) as separate events.
 * Exported for unit testing (mirrors how buildCooldownConfig is exported).
 */
export function recallEventId(commitId: string, index: number): RecallEventId {
  return `${commitId}:${index}` as RecallEventId;
}

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
 * 6. Execute writes sequentially (Neon HTTP driver does not support transactions;
 *    a mid-sequence failure may result in partial writes). Writes are idempotent
 *    and keyed on the per-session commitId, so the client may safely retry the
 *    full batch — a replay converges instead of double-applying (WR-04).
 * 7. Return success with level-up info
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
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
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

  const { deckId, commitId, grades } = parsed.data;

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
  // Phase 15 (D-03): honor QA time-shift so the harness can simulate future instants
  // without real wall-clock waiting. readQaTimeOffset() returns 0 in production.
  const offset = await readQaTimeOffset();
  const now = new Date(Date.now() + offset);

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
      COOLDOWN_CONFIG,
    );

    return {
      cardId: cardId as CardId,
      newRound,
      cooldownUntil,
      recallCountDelta,
    };
  });

  // 6. Execute all writes (neon-http driver does not support transactions).
  //
  // The driver has no transactions, so a mid-sequence failure leaves a partial
  // write and the client "Retry saving session" button (study-session.tsx →
  // RETRY_COMMIT) re-POSTs the FULL grade batch. Each write below is therefore
  // made idempotent so a replay converges instead of double-applying (WR-04):
  //   a. recall_events ids are deterministic (commitId + index) + onConflictDoNothing
  //      → a replayed row hits the PK and is skipped, no duplicate events.
  //   b. each card UPDATE is gated on lastCommitId → the masteryRound advance and
  //      recallCount increment apply at most once per commitId. A card NOT yet
  //      written by a prior partial attempt still has a differing lastCommitId, so
  //      it is updated on replay (no lost writes); an already-written card is a
  //      no-op (no double advance / double count).
  //   c. habitat_metadata upsert is already idempotent (onConflictDoUpdate).
  try {
    // a. Batch insert all recall_events (idempotent via deterministic ids).
    await db
      .insert(recall_events)
      .values(
        grades.map((g, i) => ({
          id: recallEventId(commitId, i),
          cardId: g.cardId as CardId,
          direction: g.direction,
          correct: g.correct,
        })),
      )
      .onConflictDoNothing();

    // b. Update each card with new mastery state, guarded on commitId so a
    //    replayed commit is a per-card no-op.
    for (const update of cardUpdates) {
      await db
        .update(cards)
        .set({
          masteryRound: update.newRound,
          cooldownUntil: update.cooldownUntil,
          recallCount: sql`"recallCount" + ${update.recallCountDelta}`,
          lastStudiedAt: now,
          lastCommitId: commitId,
        })
        .where(
          and(
            eq(cards.id, update.cardId),
            or(isNull(cards.lastCommitId), ne(cards.lastCommitId, commitId)),
          ),
        );
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
