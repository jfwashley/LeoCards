import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getUserDecks, getDeckCards, getUserNativeLanguage } from "@/lib/deck-queries";
import { FirstVisitPicker } from "@/components/first-visit-picker";
import { DeckView } from "@/components/deck-view";

interface DashboardPageProps {
  searchParams: Promise<{ deck?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const [decks, nativeLang] = await Promise.all([
    getUserDecks(session.user.id),
    getUserNativeLanguage(session.user.id),
  ]);

  if (decks.length === 0) {
    return <FirstVisitPicker nativeLang={nativeLang} />;
  }

  const params = await searchParams;
  const requestedDeckId = params.deck;
  const activeDeck = decks.find((d) => d.id === requestedDeckId) ?? decks[0];

  // decks.length > 0 is guaranteed by the early return above
  if (!activeDeck) return null;

  const cards = await getDeckCards(activeDeck.id);

  const deckOptions = decks.map((d) => ({
    id: d.id,
    name: d.name,
    language: d.language,
  }));

  const cardRows = cards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    source: c.source,
    createdAt: c.createdAt,
  }));

  return (
    <DeckView
      decks={deckOptions}
      initialCards={cardRows}
      nativeLang={nativeLang}
      activeDeckId={activeDeck.id}
    />
  );
}
