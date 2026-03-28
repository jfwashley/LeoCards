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
 * Round completion thresholds (D-14):
 * - Round 0 -> 1: need 2 n2t correct + 2 t2n correct
 * - Round 1 -> 2: need 1 n2t correct + 1 t2n correct
 * - Round 2 -> 3: need 1 n2t correct + 1 t2n correct
 */
const ROUND_THRESHOLDS: Record<number, { n2t: number; t2n: number }> = {
  0: { n2t: 2, t2n: 2 },
  1: { n2t: 1, t2n: 1 },
  2: { n2t: 1, t2n: 1 },
};

/**
 * Cooldown durations in milliseconds.
 * Round 0->1: 12h, Round 1->2: 24h, Round 2->3: null (LEARNED, no cooldown)
 */
const COOLDOWN_MS: Record<number, number | null> = {
  0: 12 * 3600 * 1000,
  1: 24 * 3600 * 1000,
  2: null,
};

/**
 * Computes the card state update based on grades collected during a session.
 *
 * Anti-inflation (Pitfall 4): capped at +1 round per session — grades beyond
 * threshold do not count toward further advancement.
 *
 * @returns newRound, cooldownUntil (null if not advanced or learned), recallCountDelta
 */
export function computeCardUpdate(
  cardId: CardId,
  currentRound: number,
  grades: GradeEntry[],
  now: Date,
): { newRound: number; cooldownUntil: Date | null; recallCountDelta: number } {
  // Filter grades for this card only
  const cardGrades = grades.filter((g) => g.cardId === cardId);

  // Count correct grades per direction (uncapped for recallCountDelta)
  const n2tCorrect = cardGrades.filter(
    (g) => g.direction === "n2t" && g.correct,
  ).length;
  const t2nCorrect = cardGrades.filter(
    (g) => g.direction === "t2n" && g.correct,
  ).length;

  // Total correct for recallCountDelta (uncapped, for habitat progression)
  const recallCountDelta = n2tCorrect + t2nCorrect;

  // Check if round can advance (anti-inflation: only +1 per session)
  const threshold = ROUND_THRESHOLDS[currentRound];

  if (!threshold) {
    // Already at max round (3 = learned) or unknown round — no advancement
    return { newRound: currentRound, cooldownUntil: null, recallCountDelta };
  }

  // Cap counts at threshold to prevent multi-round skipping (Pitfall 4)
  const cappedN2t = Math.min(n2tCorrect, threshold.n2t);
  const cappedT2n = Math.min(t2nCorrect, threshold.t2n);

  const thresholdMet = cappedN2t >= threshold.n2t && cappedT2n >= threshold.t2n;

  if (!thresholdMet) {
    return { newRound: currentRound, cooldownUntil: null, recallCountDelta };
  }

  // Advance round
  const newRound = currentRound + 1;
  const cooldownDurationMs = COOLDOWN_MS[currentRound] ?? null;
  const cooldownUntil =
    cooldownDurationMs !== null
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
