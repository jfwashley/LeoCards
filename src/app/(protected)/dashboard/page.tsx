import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeckView } from "@/components/deck-view";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { readHabitatOverride, readQaAuth } from "@/lib/debug-cheat";
import {
  getDeckCards,
  getUserDecks,
  getUserNativeLanguage,
} from "@/lib/deck-queries";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";
import type { CardForSession } from "@/lib/study-engine";
import {
  assembleSession,
  earliestCooldownEnd as getEarliestCooldownEnd,
} from "@/lib/study-engine";
import { getStudyCards } from "@/lib/study-queries";

interface DashboardPageProps {
  searchParams: Promise<{ deck?: string; celebrate?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const [decks, nativeLang, habitatFacts] = await Promise.all([
    getUserDecks(session.user.id),
    getUserNativeLanguage(session.user.id),
    getHabitatFacts(session.user.id as UserId),
  ]);

  const habitatOverride = await readHabitatOverride();
  const qaMode = await readQaAuth();
  const habitatState = computeHabitatState(
    habitatFacts,
    new Date(),
    habitatOverride ?? undefined,
  );

  if (decks.length === 0) {
    redirect("/welcome");
  }

  const params = await searchParams;
  const requestedDeckId = params.deck;
  const rawCelebrate = params.celebrate ? parseInt(params.celebrate, 10) : null;
  const celebratingLevel =
    rawCelebrate !== null && !Number.isNaN(rawCelebrate)
      ? Math.max(1, Math.min(10, rawCelebrate))
      : null;
  const activeDeck = decks.find((d) => d.id === requestedDeckId) ?? decks[0];

  // decks.length > 0 is guaranteed by the early return above
  if (!activeDeck) return null;

  const [cards, studyCards] = await Promise.all([
    getDeckCards(activeDeck.id),
    getStudyCards(activeDeck.id),
  ]);

  const deckOptions = decks.map((d) => ({
    id: d.id,
    name: d.name,
    language: d.language,
  }));

  const now = new Date();

  // Map study cards to CardForSession for engine calls
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

  const cooldownEnd = getEarliestCooldownEnd(allCardsForSession, now);
  const earliestCooldownEndStr = cooldownEnd ? cooldownEnd.toISOString() : null;

  // Build masteryRound lookup from study cards
  const masteryByCardId = new Map(
    studyCards.map((c) => [c.id as string, c.masteryRound]),
  );

  const cardRows = cards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    source: c.source,
    createdAt: c.createdAt,
    masteryRound: masteryByCardId.get(c.id) ?? 0,
    pausedAt: c.pausedAt,
    // QA-only: pass cooldownUntil when QA-authed so CardList can render the badge.
    // studyCards is already fetched and includes cooldownUntil — no extra DB query.
    // Customers receive null (no extra payload, no badge prop threaded down).
    cooldownUntil: qaMode
      ? (studyCards.find((s) => s.id === c.id)?.cooldownUntil ?? null)
      : null,
  }));

  return (
    <DeckView
      decks={deckOptions}
      initialCards={cardRows}
      nativeLang={nativeLang}
      activeDeckId={activeDeck.id}
      hasDueCards={hasDueCards}
      earliestCooldownEnd={earliestCooldownEndStr}
      habitatState={habitatState}
      celebratingLevel={celebratingLevel}
      qaMode={qaMode}
    />
  );
}
