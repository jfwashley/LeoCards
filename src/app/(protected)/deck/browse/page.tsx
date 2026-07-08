import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrowseList, BrowseTiles } from "@/components/word-list-browser";
import { CATEGORIES } from "@/data/wordlists/schema";
import { auth } from "@/lib/auth";
import {
  getDeckCardWords,
  getUserDecks,
  getUserNativeLanguage,
} from "@/lib/deck-queries";
import { filterWords, getWordList } from "@/lib/wordlist";

interface BrowsePageProps {
  searchParams: Promise<{ deck?: string; topic?: string }>;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const params = await searchParams;
  const requestedDeckId = params.deck;
  // Validate ?topic= against known categories — an unrecognized/stale topic falls
  // back to the tiles landing instead of rendering a nonsense empty state (WR-01).
  const requestedTopic =
    params.topic && (CATEGORIES as readonly string[]).includes(params.topic)
      ? params.topic
      : undefined;

  const [decks, nativeLang] = await Promise.all([
    getUserDecks(session.user.id),
    getUserNativeLanguage(session.user.id),
  ]);

  if (decks.length === 0) {
    redirect("/dashboard");
  }

  const activeDeck = decks.find((d) => d.id === requestedDeckId) ?? decks[0];

  if (!activeDeck) {
    redirect("/dashboard");
  }

  const [wordList, existingWords] = await Promise.all([
    getWordList(nativeLang, activeDeck.language),
    getDeckCardWords(activeDeck.id),
  ]);

  const nativeLangLabel = LANGUAGE_LABELS[nativeLang] ?? nativeLang;
  const targetLangLabel =
    LANGUAGE_LABELS[activeDeck.language] ?? activeDeck.language;

  // Per-category counts — synchronous, no extra I/O (D-07)
  const categoryCounts: Record<string, number> = Object.fromEntries(
    CATEGORIES.map((cat) => [
      cat,
      filterWords(wordList.words, { category: cat }).length,
    ]),
  );

  return (
    <div className="min-h-screen bg-background">
      <main
        className="px-8 py-8 max-w-4xl mx-auto w-full"
        data-perf-ready="true"
      >
        {requestedTopic ? (
          <BrowseList
            words={wordList.words}
            topic={requestedTopic}
            existingWords={existingWords}
            deckId={activeDeck.id}
            nativeLangLabel={nativeLangLabel}
            targetLangLabel={targetLangLabel}
          />
        ) : (
          <BrowseTiles
            categories={CATEGORIES}
            categoryCounts={categoryCounts}
            deckId={activeDeck.id}
            nativeLangLabel={nativeLangLabel}
            targetLangLabel={targetLangLabel}
          />
        )}
      </main>
    </div>
  );
}
