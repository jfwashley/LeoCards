import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
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

import type { HabitatFacts } from "@leocards/domain/habitat";
import { computeHabitatState } from "@leocards/domain/habitat";
import { CommitSchema } from "@leocards/domain/schemas";
import type { GradeEntry } from "@leocards/domain/study";
import { computeCardUpdate, DEFAULT_COOLDOWN_MS } from "@leocards/domain/study";
import { env } from "@/env";
import { readQaTimeOffset } from "@/lib/debug-cheat";
import { getHabitatFacts } from "@/lib/habitat-queries";
import { markMilestonesSeen } from "@/lib/milestone-queries";

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
 * 6. Execute all writes atomically in a single db.batch() call — a real
 *    single-round-trip Neon sql.transaction() (all queries commit or roll back
 *    together). Writes are ALSO idempotent and keyed on the per-session
 *    commitId (WR-04), kept as a belt-and-braces guard even though the atomic
 *    batch already prevents partial writes — so a client retry of the full
 *    batch still converges instead of double-applying.
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

  // Unique graded card ids — synchronous, no DB dependency, needed to build the
  // card-load query below.
  const uniqueCardIds = [...new Set(grades.map((g) => g.cardId))];

  // 3+4+5A. Ownership check, card load, and factsBefore have ZERO interdependency
  // (each is a pure function of deckId / session.user.id / uniqueCardIds, all
  // known before any query runs) — collapse the prior 3-step waterfall into one
  // Promise.all (PERF-21). The 403 ownership guard still runs AFTER this
  // resolves, on ownedDeckRows, strictly before any write (T-27-09-01 — the
  // access-control predicate and its ordering relative to db.batch() are
  // unchanged, only the independent reads are parallelized).
  const [ownedDeckRows, cardRows, factsBefore] = await Promise.all([
    db
      .select({ id: decks.id })
      .from(decks)
      .where(
        and(
          eq(decks.id, deckId as DeckId),
          eq(decks.userId, session.user.id as string),
        ),
      ),
    db
      .select({ id: cards.id, masteryRound: cards.masteryRound })
      .from(cards)
      .where(
        and(
          inArray(cards.id, uniqueCardIds as CardId[]),
          eq(cards.deckId, deckId as DeckId),
        ),
      ),
    getHabitatFacts(session.user.id as UserId),
  ]);

  if (!ownedDeckRows[0]) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

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

  // 6. Execute all writes in ONE atomic db.batch() call — a real single-round-trip
  // Neon sql.transaction() (drizzle-orm 0.45.1 on the neon-http driver; verified
  // against installed source in 26-RESEARCH.md). All queries below commit or roll
  // back together, replacing the prior 1(insert)+N(updates)+1(upsert) round trips
  // with exactly 1 (PERF-07 / D-02).
  //
  // WR-04 idempotency is kept UNTOUCHED (D-01) as a belt-and-braces guard even
  // though the atomic batch already prevents partial writes — a client retry of
  // the full batch (study-session.tsx → RETRY_COMMIT) still converges instead of
  // double-applying:
  //   a. recall_events ids are deterministic (commitId + index) + onConflictDoNothing
  //      → a replayed row hits the PK and is skipped, no duplicate events.
  //   b. each card UPDATE is gated on lastCommitId → the masteryRound advance and
  //      recallCount increment apply at most once per commitId. A card NOT yet
  //      written by a prior partial attempt still has a differing lastCommitId, so
  //      it is updated on replay (no lost writes); an already-written card is a
  //      no-op (no double advance / double count).
  //   c. habitat_metadata upsert is already idempotent (onConflictDoUpdate).
  const insertRecallEvents = db
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
  const cardUpdateQueries = cardUpdates.map((update) =>
    db
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
      ),
  );

  // c. Upsert habitat_metadata — row may not exist yet
  const upsertHabitat = db
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

  // Batchable is derived from the actual constructed query objects above (not
  // ReturnType<typeof db.insert/db.update>, which are the pre-.values()
  // builder types and don't satisfy drizzle's BatchItem constraint) — these
  // ARE the exact runnable query types db.batch() accepts.
  type Batchable =
    | typeof insertRecallEvents
    | (typeof cardUpdateQueries)[number]
    | typeof upsertHabitat;

  try {
    // TS cannot statically prove a .map()-built array is non-empty; the tuple
    // cast is required by db.batch()'s Readonly<[U, ...U[]]> signature
    // (drizzle-team/drizzle-orm#1301). CommitSchema.grades is .min(1).max(500),
    // so cardUpdateQueries.length is always >=1 at runtime — the cast is sound.
    await db.batch([
      insertRecallEvents,
      ...cardUpdateQueries,
      upsertHabitat,
    ] as [Batchable, ...Batchable[]]);
  } catch (err) {
    console.error("[study/complete] Failed to save session:", err);
    return Response.json({ error: "Failed to save session" }, { status: 500 });
  }

  // Step B: derive post-session facts instead of re-fetching (PERF-21) — factsAfter
  // is fully computable from factsBefore + this commit's cardUpdates: userId is
  // unchanged, lastActivityAt is exactly `now` (the value habitat_metadata was just
  // upserted to in the db.batch() above), and learnedCardCount increments by however
  // many cards crossed the masteryRound>=3 "learned" threshold in this commit.
  // getHabitatFacts (src/lib/habitat-queries.ts) returns ONLY these three fields —
  // confirmed against its source — so deriving instead of re-fetching drops no
  // hidden field (T-27-09-02).
  const crossedToLearned = cardUpdates.filter((u) => {
    const before = cardMap.get(u.cardId)?.masteryRound ?? 0;
    return before < 3 && u.newRound >= 3;
  }).length;
  const factsAfter: HabitatFacts = {
    userId: factsBefore.userId,
    lastActivityAt: now,
    learnedCardCount: factsBefore.learnedCardCount + crossedToLearned,
  };
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
