"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { CardList } from "@/components/card-list";
import type { DeckOption } from "@/components/deck-switcher";
import { HabitatWidget } from "@/components/habitat-widget";
import type { HabitatState } from "@/lib/habitat-engine";

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
  masteryRound?: number;
  pausedAt: Date | null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "<1m";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}

// Isolated countdown component — re-renders every 60s without affecting parent
function CountdownTimer({
  earliestCooldownEnd,
  hasDueCards,
}: {
  earliestCooldownEnd: string;
  hasDueCards: boolean;
}) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<string>(() => {
    const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
    return formatCountdown(ms);
  });

  useEffect(() => {
    if (hasDueCards) return;

    function recompute() {
      const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
      if (ms <= 0) {
        router.refresh();
        return;
      }
      setCountdown(formatCountdown(ms));
    }

    recompute();
    const interval = setInterval(recompute, 60000);
    return () => clearInterval(interval);
  }, [earliestCooldownEnd, hasDueCards, router]);

  const cooldownDate = new Date(earliestCooldownEnd);
  const formattedTime = cooldownDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={`Next cards available at ${formattedTime}`}
      className="inline-flex items-center justify-center rounded-lg bg-muted text-muted-foreground px-4 h-10 text-sm cursor-not-allowed"
    >
      Next cards in {countdown}
    </button>
  );
}

interface DeckViewProps {
  decks: DeckOption[];
  initialCards: CardRow[];
  nativeLang: string;
  activeDeckId: string;
  hasDueCards: boolean;
  earliestCooldownEnd: string | null;
  habitatState: HabitatState;
  celebratingLevel?: number | null;
  languageBreakdown: Array<{ language: string; count: number }>;
}

export function DeckView({
  decks,
  initialCards,
  nativeLang,
  activeDeckId,
  hasDueCards,
  earliestCooldownEnd,
  habitatState,
  celebratingLevel = null,
  languageBreakdown,
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

  const hasCards = initialCards.length > 0;

  function renderStudyButton() {
    if (!hasCards) return null;

    if (hasDueCards) {
      return (
        <Link
          href={`/study?deck=${activeDeckId}`}
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-10 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Start studying
        </Link>
      );
    }

    if (earliestCooldownEnd) {
      return (
        <CountdownTimer
          earliestCooldownEnd={earliestCooldownEnd}
          hasDueCards={hasDueCards}
        />
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        decks={decks}
        activeDeckId={activeDeckId}
        onDeckChange={handleDeckChange}
        nativeLang={nativeLang}
      />
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        {/* Mini habitat widget — links to /habitat */}
        <div className="mb-6">
          <HabitatWidget
            habitatState={habitatState}
            celebratingLevel={celebratingLevel}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl font-semibold">My Deck</h1>
            {languageBreakdown.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {languageBreakdown
                  .map(
                    (item) =>
                      `${LANGUAGE_LABELS[item.language] ?? item.language}: ${item.count} learned`,
                  )
                  .join(" \u00B7 ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {renderStudyButton()}
            <Link
              href={`/deck/browse?deck=${activeDeckId}`}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 h-10 text-sm hover:bg-muted transition-colors"
            >
              Browse words
            </Link>
            <Link
              href={`/deck/new-card?deck=${activeDeckId}`}
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 h-10 text-sm hover:bg-muted transition-colors"
            >
              Add a card
            </Link>
          </div>
        </div>
        {hasCards && !hasDueCards && !earliestCooldownEnd && (
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            All cards are paused — unpause one to study.
          </p>
        )}
        <CardList
          cards={initialCards}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      </main>
    </div>
  );
}
