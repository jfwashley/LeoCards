"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { CardList } from "@/components/card-list";
import type { DeckOption } from "@/components/deck-switcher";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

export interface CardRow {
  id: string;
  front: string;
  back: string;
  source: string;
  createdAt: Date;
}

interface DeckViewProps {
  decks: DeckOption[];
  initialCards: CardRow[];
  nativeLang: string;
  activeDeckId: string;
}

export function DeckView({
  decks,
  initialCards,
  nativeLang,
  activeDeckId,
}: DeckViewProps) {
  const router = useRouter();
  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? decks[0];

  function handleDeckChange(id: string) {
    router.push(`/dashboard?deck=${id}`);
  }

  const nativeLangLabel = LANGUAGE_LABELS[nativeLang] ?? nativeLang;
  const targetLangLabel = activeDeck
    ? (LANGUAGE_LABELS[activeDeck.language] ?? activeDeck.language)
    : "Learning";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        decks={decks}
        activeDeckId={activeDeckId}
        onDeckChange={handleDeckChange}
        nativeLang={nativeLang}
      />
      <main className="flex-1 px-8 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">My Deck</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/deck/browse"
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 h-8 text-sm hover:bg-muted transition-colors"
            >
              Browse words
            </Link>
            <Link
              href="/deck/new-card"
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 h-8 text-sm hover:bg-muted transition-colors"
            >
              Add a card
            </Link>
          </div>
        </div>
        <CardList
          cards={initialCards}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      </main>
    </div>
  );
}
