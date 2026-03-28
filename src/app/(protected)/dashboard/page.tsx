import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getUserDecks, getDeckCards, getUserNativeLanguage } from "@/lib/deck-queries";
import { getStudyCards } from "@/lib/study-queries";
import { assembleSession, earliestCooldownEnd as getEarliestCooldownEnd } from "@/lib/study-engine";
import type { CardForSession } from "@/lib/study-engine";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";
import type { UserId } from "@/db/schema";
import { FirstVisitPicker } from "@/components/first-visit-picker";
import { DeckView } from "@/components/deck-view";
import { HabitatWidget } from "@/components/habitat-widget";

interface DashboardPageProps {
  searchParams: Promise<{ deck?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const [decks, nativeLang, habitatFacts] = await Promise.all([
    getUserDecks(session.user.id),
    getUserNativeLanguage(session.user.id),
    getHabitatFacts(session.user.id as UserId),
  ]);

  const habitatState = computeHabitatState(habitatFacts, new Date());

  if (decks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 px-8 py-8 max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <HabitatWidget habitatState={habitatState} />
          </div>
          <FirstVisitPicker nativeLang={nativeLang} />
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const requestedDeckId = params.deck;
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
    />
  );
}
