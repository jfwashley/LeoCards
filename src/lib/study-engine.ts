import type { CardId, RecallDirection } from "@/db/schema";

// ============================================================
// Types
// ============================================================

export interface CardForSession {
  id: CardId;
  front: string;
  back: string;
  masteryRound: number; // 0=new, 1=round1done, 2=round2done, 3=learned
  cooldownUntil: Date | null;
  createdAt: Date;
  isResurface: boolean;
}

export interface SessionCard extends CardForSession {
  stage: "n2t" | "t2n";
}

export type GradeEntry = {
  cardId: CardId;
  direction: RecallDirection;
  correct: boolean;
};

export type SessionStats = {
  cardsStudied: number;
  correctCount: number;
  newlyLearned: number;
  leveledUp: number | null;
};

// ============================================================
// Internal helpers
// ============================================================

/**
 * Fisher-Yates shuffle on a copy of the array, returns first N elements.
 * Exported for testing.
 */
export function shuffleTake<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy.slice(0, n);
}

// ============================================================
// assembleSession
// ============================================================

/**
 * Assembles the study session card list from all deck cards.
 *
 * - Filters to unlearned due cards (masteryRound < 3, cooldownUntil null or past)
 * - Sorts newest-first (D-05)
 * - Adds ~10% resurface from learned cards (D-02)
 * - Interleaves resurface every 3 cards (D-18)
 * - Assigns stage via getCardStage()
 */
export function assembleSession(
  cards: CardForSession[],
  now: Date,
): SessionCard[] {
  // Split into due unlearned and learned pools
  const dueUnlearned = cards
    .filter(
      (c) =>
        c.masteryRound < 3 &&
        (c.cooldownUntil === null || c.cooldownUntil <= now),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest-first (D-05)

  const learned = cards.filter((c) => c.masteryRound === 3);

  // Compute resurface count: ~10% of due unlearned, min 1 if learned exist
  let resurfaceCount = 0;
  if (learned.length > 0 && dueUnlearned.length > 0) {
    resurfaceCount = Math.max(1, Math.floor(dueUnlearned.length * 0.1));
    // Cap to available learned cards
    resurfaceCount = Math.min(resurfaceCount, learned.length);
  }

  // Pick resurface cards
  const resurfaceCards: CardForSession[] = shuffleTake(
    learned,
    resurfaceCount,
  ).map((c) => ({ ...c, isResurface: true }));

  // Interleave and assign stage
  const interleaved = interleave(dueUnlearned, resurfaceCards, 3);

  return interleaved.map((card) => ({
    ...card,
    stage: getCardStage(card),
  }));
}

// ============================================================
// interleave
// ============================================================

/**
 * Inserts one resurface card every `interval` learning cards (D-18).
 * Remaining cards of either type are appended after the other runs out.
 */
export function interleave(
  learning: CardForSession[],
  resurface: CardForSession[],
  interval: number,
): CardForSession[] {
  if (resurface.length === 0) return [...learning];
  if (learning.length === 0) return [...resurface];

  const result: CardForSession[] = [];
  let li = 0; // learning index
  let ri = 0; // resurface index

  while (li < learning.length || ri < resurface.length) {
    // Add `interval` learning cards
    const chunkEnd = Math.min(li + interval, learning.length);
    while (li < chunkEnd) {
      const learningCard = learning[li];
      if (learningCard) result.push(learningCard);
      li++;
    }

    // Add 1 resurface card after the chunk (if available)
    if (ri < resurface.length && li <= learning.length) {
      const resurfaceCard = resurface[ri];
      if (resurfaceCard) result.push(resurfaceCard);
      ri++;
    }
  }

  return result;
}

// ============================================================
// getCardStage
// ============================================================

/**
 * Returns the study direction for a card based on its masteryRound (D-08).
 *
 * - Round 0: native → target (n2t)
 * - Round 1: target → native (t2n)
 * - Round 2+: random
 */
export function getCardStage(card: CardForSession): "n2t" | "t2n" {
  if (card.masteryRound === 0) return "n2t";
  if (card.masteryRound === 1) return "t2n";
  return Math.random() < 0.5 ? "n2t" : "t2n";
}

// ============================================================
// computeCardUpdate
// ============================================================

/**
 * Round advancement requirement (D-14 — corrected 2026-05-29).
 *
 * A card is presented in exactly ONE direction per session (see getCardStage):
 *   - round 0 → n2t
 *   - round 1 → t2n
 *   - round 2 → random (n2t OR t2n)
 * and a correctly-answered card is graded exactly ONCE per session (wrong cards
 * requeue, but in the SAME direction). A round therefore advances on a SINGLE
 * correct answer in the direction actually presented.
 *
 * THE BUG THIS REPLACES: the old table required correct answers in directions a
 * round never presents (e.g. round 0 needed `2 n2t + 2 t2n`, but round-0 cards
 * are only ever shown n2t, once). With per-session evaluation and one grade per
 * card, the threshold was unreachable — every card was permanently stuck at
 * masteryRound 0, nothing ever became "learned", and the habitat could never
 * leave level 1.
 */
type RoundRequirement = "n2t" | "t2n" | "either";
const ROUND_REQUIREMENT: Record<number, RoundRequirement> = {
  0: "n2t",
  1: "t2n",
  2: "either",
};

/**
 * Default cooldown durations in milliseconds between rounds (spaced repetition).
 * Round 0->1: 12h, Round 1->2: 24h, Round 2->3: null (LEARNED, no cooldown).
 * Overridable per call (e.g. zeroed in dev/preview so QA can verify the full
 * 0->learned progression in one sitting — see /api/study/complete).
 */
export const DEFAULT_COOLDOWN_MS: Record<number, number | null> = {
  0: 12 * 3600 * 1000,
  1: 24 * 3600 * 1000,
  2: null,
};

/**
 * Computes the card state update based on grades collected during a session.
 *
 * A round advances when the card was answered correctly at least once in the
 * direction its current round presents (ROUND_REQUIREMENT). Advancement is
 * capped at +1 round per session (anti-inflation) — this function is called
 * once per card per session and never advances more than one round.
 *
 * @param cooldownMsByRound - cooldown durations by current round; defaults to
 *   DEFAULT_COOLDOWN_MS. A value of 0 (or null) yields no cooldown.
 * @returns newRound, cooldownUntil (null if not advanced or learned), recallCountDelta
 */
export function computeCardUpdate(
  cardId: CardId,
  currentRound: number,
  grades: GradeEntry[],
  now: Date,
  cooldownMsByRound: Record<number, number | null> = DEFAULT_COOLDOWN_MS,
): { newRound: number; cooldownUntil: Date | null; recallCountDelta: number } {
  // Filter grades for this card only
  const cardGrades = grades.filter((g) => g.cardId === cardId);

  // Count correct grades per direction
  const n2tCorrect = cardGrades.filter(
    (g) => g.direction === "n2t" && g.correct,
  ).length;
  const t2nCorrect = cardGrades.filter(
    (g) => g.direction === "t2n" && g.correct,
  ).length;

  // Total correct for recallCountDelta (uncapped, for habitat progression)
  const recallCountDelta = n2tCorrect + t2nCorrect;

  const requirement = ROUND_REQUIREMENT[currentRound];
  if (requirement === undefined) {
    // Already at max round (3 = learned) or unknown round — no advancement
    return { newRound: currentRound, cooldownUntil: null, recallCountDelta };
  }

  // Advance when the card was answered correctly in the presented direction.
  const advanced =
    requirement === "n2t"
      ? n2tCorrect >= 1
      : requirement === "t2n"
        ? t2nCorrect >= 1
        : n2tCorrect + t2nCorrect >= 1; // "either" (round 2 random stage)

  if (!advanced) {
    return { newRound: currentRound, cooldownUntil: null, recallCountDelta };
  }

  // Advance exactly one round (anti-inflation).
  const newRound = currentRound + 1;
  const cooldownDurationMs = cooldownMsByRound[currentRound] ?? null;
  const cooldownUntil =
    cooldownDurationMs !== null && cooldownDurationMs > 0
      ? new Date(now.getTime() + cooldownDurationMs)
      : null;

  return { newRound, cooldownUntil, recallCountDelta };
}

// ============================================================
// earliestCooldownEnd
// ============================================================

/**
 * Returns the earliest future cooldownUntil date across all cards,
 * or null if no cards are in cooldown.
 *
 * Used to display the "Next cards in Xh Ym" countdown (D-07).
 */
export function earliestCooldownEnd(
  cards: CardForSession[],
  now: Date,
): Date | null {
  const futureCooldowns = cards
    .filter((c) => c.cooldownUntil !== null && c.cooldownUntil > now)
    .map((c) => c.cooldownUntil as Date);

  if (futureCooldowns.length === 0) return null;

  return futureCooldowns.reduce((earliest, date) =>
    date < earliest ? date : earliest,
  );
}

// ============================================================
// computeUnpauseUpdate
// ============================================================

/**
 * Computes the cooldown shift when unpausing a card.
 *
 * Rule: cooldownUntil shifts forward by exactly (now − pausedAt). The SRS clock
 * was frozen during pause; on unpause the card resurfaces with the same cadence
 * it would have had absent the pause. NULL cooldown stays NULL.
 *
 * lastStudiedAt is NOT mutated — pausedAt is the source of truth for "card
 * was unavailable" intervals.
 */
export function computeUnpauseUpdate(
  pausedAt: Date,
  cooldownUntil: Date | null,
  now: Date,
): { cooldownUntil: Date | null; pausedAt: null } {
  if (cooldownUntil === null) {
    return { cooldownUntil: null, pausedAt: null };
  }
  const pauseDurationMs = now.getTime() - pausedAt.getTime();
  return {
    cooldownUntil: new Date(cooldownUntil.getTime() + pauseDurationMs),
    pausedAt: null,
  };
}
