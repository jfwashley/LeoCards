import { redirect } from "next/navigation";
import { BrowseList, BrowseTiles } from "@/components/word-list-browser";
import { CATEGORIES } from "@/data/wordlists/schema";
import { getSession } from "@/lib/auth-session";
import { getDeckCardWords, getUserDecks } from "@/lib/deck-queries";
import {
  type Category,
  filterWords,
  getWordList,
  type WordEntry,
} from "@/lib/wordlist";

interface BrowsePageProps {
  searchParams: Promise<{ deck?: string; topic?: string }>;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

// PERF-15 — pure data-shaping helper, extracted so the topic-detail vs.
// topic-picker branching logic is unit-testable without an RSC/session
// harness (see __tests__/browse-page.test.ts, Wave 0).
//
// Topic-detail branch: serializes ONLY the requested topic's word subset
// (~15-25 words) into the RSC payload — not the full ~280-word wordlist —
// and never computes categoryCounts (only BrowseTiles/the topic-picker
// branch consumes it).
// Topic-picker branch: computes categoryCounts (synchronous, no extra I/O
// — D-07) and does not carry a word subset (BrowseTiles never renders
// individual words).
export type BrowseShapedData =
  | { kind: "detail"; topic: string; words: WordEntry[] }
  | { kind: "picker"; categoryCounts: Record<string, number> };

export function shapeBrowseData(
  words: WordEntry[],
  requestedTopic: string | undefined,
): BrowseShapedData {
  if (requestedTopic) {
    return {
      kind: "detail",
      topic: requestedTopic,
      words: filterWords(words, { category: requestedTopic as Category }),
    };
  }
  return {
    kind: "picker",
    categoryCounts: Object.fromEntries(
      CATEGORIES.map((cat) => [
        cat,
        filterWords(words, { category: cat }).length,
      ]),
    ),
  };
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const session = await getSession();

  if (!session) return null;

  const params = await searchParams;
  const requestedDeckId = params.deck;
  // Validate ?topic= against known categories — an unrecognized/stale topic falls
  // back to the tiles landing instead of rendering a nonsense empty state (WR-01).
  const requestedTopic =
    params.topic && (CATEGORIES as readonly string[]).includes(params.topic)
      ? params.topic
      : undefined;

  const nativeLang = session.user.nativeLanguage ?? "en";
  const decks = await getUserDecks(session.user.id);

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

  const shaped = shapeBrowseData(wordList.words, requestedTopic);

  return (
    <div className="min-h-screen bg-background">
      <main
        className="px-8 py-8 max-w-4xl mx-auto w-full"
        data-perf-ready="true"
      >
        {shaped.kind === "detail" ? (
          <BrowseList
            words={shaped.words}
            topic={shaped.topic}
            existingWords={existingWords}
            deckId={activeDeck.id}
            nativeLangLabel={nativeLangLabel}
            targetLangLabel={targetLangLabel}
          />
        ) : (
          <BrowseTiles
            categories={CATEGORIES}
            categoryCounts={shaped.categoryCounts}
            deckId={activeDeck.id}
            nativeLangLabel={nativeLangLabel}
            targetLangLabel={targetLangLabel}
          />
        )}
      </main>
    </div>
  );
}
