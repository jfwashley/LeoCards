import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TranslationForm } from "@/components/translation-form";
import { auth } from "@/lib/auth";
import { getUserDecks, getUserNativeLanguage } from "@/lib/deck-queries";

interface NewCardPageProps {
  searchParams: Promise<{ deck?: string }>;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

export default async function NewCardPage({ searchParams }: NewCardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const params = await searchParams;
  const requestedDeckId = params.deck;

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

  const nativeLangLabel = LANGUAGE_LABELS[nativeLang] ?? nativeLang;
  const targetLangLabel =
    LANGUAGE_LABELS[activeDeck.language] ?? activeDeck.language;

  return (
    <div className="min-h-screen bg-background">
      <main className="px-8 py-8 max-w-4xl mx-auto w-full">
        <TranslationForm
          deckId={activeDeck.id}
          nativeLang={nativeLang}
          targetLang={activeDeck.language}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      </main>
    </div>
  );
}
