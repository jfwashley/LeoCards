"use client";

// Phase 17 (D-06): after the RSC split, dashboard/page.tsx no longer renders
// <DeckView> directly — it server-renders this same static shell + action
// line + StatusText itself, importing only the CountdownTimer/DashboardHeader
// client leaves. This component and deck-view.test.tsx are kept as the
// pre-split behavior-preservation baseline (17-01) — the load-bearing
// regression reference the split must never silently diverge from, not dead
// code. See 17-03-SUMMARY.md for the full rationale.

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { CardList } from "@/components/card-list";
import { CountdownTimer } from "@/components/countdown-timer";
import type { DeckOption } from "@/components/deck-switcher";
import { HabitatHero } from "@/components/habitat-hero";
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
  cooldownUntil?: Date | null; // QA-only: populated when QA-authed
}

// StatusText — four-state machine (due / none / cooldown / paused)
function StatusText({
  hasDueCards,
  dueCount,
  earliestCooldownEnd,
  allPaused,
}: {
  hasDueCards: boolean;
  dueCount: number;
  earliestCooldownEnd: string | null;
  allPaused: boolean;
}) {
  // Cooldown state: earliestCooldownEnd set and nothing due
  if (earliestCooldownEnd && !hasDueCards) {
    return (
      <CountdownTimer
        earliestCooldownEnd={earliestCooldownEnd}
        hasDueCards={hasDueCards}
      />
    );
  }

  // All-paused state
  if (allPaused) {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14.5,
          fontWeight: 600,
          color: "#8A6235",
        }}
      >
        <span style={{ display: "flex", gap: 3 }}>
          <span
            style={{
              width: 3.5,
              height: 13,
              borderRadius: 2,
              background: "#B49B78",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 3.5,
              height: 13,
              borderRadius: 2,
              background: "#B49B78",
              display: "inline-block",
            }}
          />
        </span>
        All paused
      </span>
    );
  }

  // Due state: hasDueCards (amber dot + count)
  if (hasDueCards) {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14.5,
          fontWeight: 700,
          color: "#4A331C",
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#F28A1F",
            flex: "none",
            display: "inline-block",
          }}
        />
        {dueCount} due
      </span>
    );
  }

  // None-due state: outline dot + "0 due"
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14.5,
        fontWeight: 700,
        color: "#8C7A63",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: "transparent",
          border: "1.6px solid #8C7A63",
          flex: "none",
          display: "inline-block",
          boxSizing: "border-box",
        }}
      />
      0 due
    </span>
  );
}

// Plus glyph for "Add a card" pill
function PlusGlyph() {
  return (
    <span
      style={{
        position: "relative",
        width: 14,
        height: 14,
        flex: "none",
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 6,
          width: 14,
          height: 2.3,
          borderRadius: 2,
          background: "#F28A1F",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 6,
          top: 0,
          width: 2.3,
          height: 14,
          borderRadius: 2,
          background: "#F28A1F",
        }}
      />
    </span>
  );
}

interface DeckViewProps {
  decks: DeckOption[];
  initialCards: CardRow[];
  nativeLang: string;
  activeDeckId: string;
  hasDueCards: boolean;
  dueCount: number;
  earliestCooldownEnd: string | null;
  habitatState: HabitatState;
  celebratingLevel?: number | null;
  qaMode?: boolean;
}

export function DeckView({
  decks,
  initialCards,
  nativeLang,
  activeDeckId,
  hasDueCards,
  dueCount,
  earliestCooldownEnd,
  habitatState,
  celebratingLevel = null,
  qaMode = false,
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

  // All-paused: cards exist, nothing due, no cooldown active, AND every card is paused.
  // The original branch condition was hasCards && !hasDueCards && !earliestCooldownEnd
  // (which is only reachable when every card is actually paused).
  // We check initialCards.every(pausedAt) as a safety guard.
  const allPaused =
    hasCards &&
    !hasDueCards &&
    !earliestCooldownEnd &&
    initialCards.every((c) => c.pausedAt !== null);

  // Sleeping: resting/cooldown state for the hero
  const sleeping = Boolean(earliestCooldownEnd && !hasDueCards);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        decks={decks}
        activeDeckId={activeDeckId}
        onDeckChange={handleDeckChange}
        nativeLang={nativeLang}
      />
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        {/* HabitatHero — DSH-02 wiring (L-04) */}
        <div className="mb-6">
          <HabitatHero
            habitatState={habitatState}
            celebratingLevel={celebratingLevel}
            sleeping={sleeping}
          />
        </div>

        {/* Option-D action line (DSH-03) — only renders when deck has cards */}
        {hasCards && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {/* StudyButton — full-width, height 58 */}
            {hasDueCards ? (
              <Link
                href={`/study?deck=${activeDeckId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 58,
                  borderRadius: 14,
                  background: "#F28A1F",
                  color: "#FFFFFF",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 21,
                  boxShadow: "0 10px 22px rgba(242,138,31,0.32)",
                  textDecoration: "none",
                }}
              >
                Start studying
              </Link>
            ) : (
              <div
                aria-disabled="true"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 58,
                  borderRadius: 14,
                  background: "#F4E7D2",
                  color: "#B49B78",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 21,
                }}
              >
                Start studying
              </div>
            )}

            {/* Status row: StatusText (left) | "Add a card" pill (right) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <StatusText
                hasDueCards={hasDueCards}
                dueCount={dueCount}
                earliestCooldownEnd={earliestCooldownEnd}
                allPaused={allPaused}
              />

              {/* "Add a card" pill — always a link, accessible name "Add a card" */}
              <Link
                href={`/deck/new-card?deck=${activeDeckId}`}
                data-testid="add-a-card"
                style={{
                  height: 40,
                  padding: "0 15px",
                  borderRadius: 12,
                  border: "1.5px solid #EDDFC9",
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  boxSizing: "border-box",
                  flex: "none",
                }}
              >
                <PlusGlyph />
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: "#4A331C",
                  }}
                >
                  Add a card
                </span>
              </Link>
            </div>
          </div>
        )}

        <CardList
          cards={initialCards}
          deckId={activeDeckId}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
          qaMode={qaMode}
        />
      </main>
    </div>
  );
}
