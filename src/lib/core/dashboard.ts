// src/lib/core/dashboard.ts
//
// The single implementation of the dashboard screen's composition — decks,
// the active deck's cards, the assembled study session, the derived
// due/cooldown/paused/sleeping flags, and the habitat state — used by BOTH
// the web RSC page (src/app/(protected)/dashboard/page.tsx) and the
// native-v1 GET /api/dashboard route handler. This is the D-03 mechanism
// applied to a read: one core function, two entry points, so "what counts
// as due" can never diverge between web and native (D-07's "identical by
// construction" guarantee).
//
// This module deliberately never establishes its own auth session, never
// touches cookies, and never triggers Next.js page-cache revalidation —
// those stay at each entry point's own boundary, mirroring
// src/lib/core/decks.ts's existing convention. nativeLanguage arrives as an
// INPUT rather than a query: the dashboard's PERF-16 optimization already
// removed that DB round trip in favor of the session's own field, and this
// core must not reintroduce it.

import type { CoreResult, DashboardResponse } from "@leocards/domain/contracts";
import type { HabitatOverride, HabitatState } from "@leocards/domain/habitat";
import { computeHabitatState } from "@leocards/domain/habitat";
import type { CardForSession } from "@leocards/domain/study";
import {
  assembleSession,
  earliestCooldownEnd as getEarliestCooldownEnd,
} from "@leocards/domain/study";
import type { UserId } from "@/db/schema";
import { getDeckCards, getUserDecks } from "@/lib/deck-queries";
import { getHabitatFacts } from "@/lib/habitat-queries";
import { deriveStudySubset } from "@/lib/study-queries";

/**
 * Loads everything the dashboard screen needs in one composition.
 *
 * `now` and `habitatOverride` are explicit inputs (never resolved
 * internally) so both entry points control determinism/QA overrides at
 * their own boundary — the web page passes a plain `new Date()`, while the
 * route handler additionally applies the QA time-shift offset before
 * calling in (mirroring GET /api/habitat's existing asymmetry).
 */
export async function loadDashboardCore(input: {
  userId: UserId;
  nativeLanguage: string;
  requestedDeckId?: string;
  now: Date;
  habitatOverride?: HabitatOverride;
  qaMode: boolean;
}): Promise<CoreResult<DashboardResponse>> {
  const {
    userId,
    nativeLanguage,
    requestedDeckId,
    now,
    habitatOverride,
    qaMode,
  } = input;

  // One round of parallel reads, identical to the pre-extraction page.
  const [decks, habitatFacts] = await Promise.all([
    getUserDecks(userId),
    getHabitatFacts(userId),
  ]);

  const habitat: HabitatState = computeHabitatState(
    habitatFacts,
    now,
    habitatOverride,
  );

  const firstDeck = decks[0];
  if (firstDeck === undefined) {
    // decks.length === 0 for a dense DB-result array iff its first index is
    // undefined — checking the element (rather than .length) also narrows
    // `firstDeck` for the `?? firstDeck` fallback below. The page's
    // redirect("/welcome") has no HTTP equivalent (DR-04), so this returns
    // an explicit onboarding signal instead. No card query is issued on
    // this path.
    return {
      ok: true,
      data: {
        needsOnboarding: true,
        decks: [],
        activeDeckId: null,
        nativeLanguage,
        cards: [],
        hasDueCards: false,
        dueCount: 0,
        earliestCooldownEnd: null,
        allPaused: false,
        sleeping: false,
        habitat,
      },
    };
  }

  // A requestedDeckId matching an owned deck selects that deck; anything
  // else (missing, forged, belonging to another user) falls back to the
  // caller's own first deck — getUserDecks(userId) is the ownership gate,
  // so a foreign id can never select another user's data.
  const activeDeck = decks.find((d) => d.id === requestedDeckId) ?? firstDeck;

  // Exactly ONE card query for the active deck, all columns, all pause
  // states (PERF-16) — the study subset used for session assembly is
  // derived in JS from this single fetch below, never a second per-deck
  // round trip.
  const cards = await getDeckCards(activeDeck.id);
  const studyCards = deriveStudySubset(cards);

  const allCardsForSession: CardForSession[] = studyCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    masteryRound: c.masteryRound,
    cooldownUntil: c.cooldownUntil,
    createdAt: c.createdAt,
    isResurface: false,
  }));

  const sessionCards = assembleSession(allCardsForSession, now);
  const hasDueCards = sessionCards.length > 0;
  const dueCount = sessionCards.length;

  const cooldownEnd = getEarliestCooldownEnd(allCardsForSession, now);
  const earliestCooldownEnd = cooldownEnd ? cooldownEnd.toISOString() : null;

  // masteryRound/cooldownUntil masking mirrors the pre-extraction page
  // logic exactly: paused cards read as round 0 with no cooldown regardless
  // of their stored values, and cooldownUntil is only ever exposed to
  // qaMode callers. createdAt is intentionally not part of the wire shape
  // (PERF-16 — confirmed unread by any renderer of this data).
  const cardRows = cards.map((c) => {
    const isPaused = c.pausedAt !== null;
    return {
      id: c.id,
      front: c.front,
      back: c.back,
      source: c.source,
      masteryRound: isPaused ? 0 : c.masteryRound,
      pausedAt: c.pausedAt !== null ? c.pausedAt.toISOString() : null,
      cooldownUntil:
        qaMode && !isPaused && c.cooldownUntil !== null
          ? c.cooldownUntil.toISOString()
          : null,
    };
  });

  const hasCards = cardRows.length > 0;

  // All-paused: cards exist, nothing due, no cooldown active, AND every
  // card is paused.
  const allPaused =
    hasCards &&
    !hasDueCards &&
    !earliestCooldownEnd &&
    cardRows.every((c) => c.pausedAt !== null);

  // Sleeping: resting/cooldown state for the hero.
  const sleeping = Boolean(earliestCooldownEnd && !hasDueCards);

  return {
    ok: true,
    data: {
      needsOnboarding: false,
      decks: decks.map((d) => ({
        id: d.id,
        name: d.name,
        language: d.language,
      })),
      activeDeckId: activeDeck.id,
      nativeLanguage,
      cards: cardRows,
      hasDueCards,
      dueCount,
      earliestCooldownEnd,
      allPaused,
      sleeping,
      habitat,
    },
  };
}
