import { computeHabitatState } from "@leocards/domain/habitat";
import type { CardForSession } from "@leocards/domain/study";
import {
  assembleSession,
  earliestCooldownEnd as getEarliestCooldownEnd,
} from "@leocards/domain/study";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CardList } from "@/components/card-list";
import { CountdownTimer } from "@/components/countdown-timer";
import { DashboardHeader } from "@/components/dashboard-header";
import { HabitatHero } from "@/components/habitat-hero";
import type { UserId } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import { readHabitatOverride, readQaAuth } from "@/lib/debug-cheat";
import { getDeckCards, getUserDecks } from "@/lib/deck-queries";
import { getHabitatFacts } from "@/lib/habitat-queries";
import { deriveStudySubset } from "@/lib/study-queries";

interface DashboardPageProps {
  searchParams: Promise<{ deck?: string; celebrate?: string }>;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

// StatusText — four-state machine (due / none / cooldown / paused).
//
// Phase 17 (D-06): this is the exact static shell moved from deck-view.tsx —
// hooks-free itself, it only ever renders the CountdownTimer client leaf for
// the cooldown branch. A Server Component may legally render a Client
// Component as a child, so this stays server markup everywhere else.
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

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getSession();

  if (!session) return null;

  // 25-04 pattern: session.user.nativeLanguage types string | null | undefined
  // despite its defaultValue: "en" config — normalize with ?? "en".
  const nativeLang = session.user.nativeLanguage ?? "en";

  const [decks, habitatFacts] = await Promise.all([
    getUserDecks(session.user.id),
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

  // PERF-16: ONE card query for the active deck (all columns, all pause
  // states) — the study subset is derived in JS below instead of a second
  // getStudyCards round trip.
  const cards = await getDeckCards(activeDeck.id);
  const studyCards = deriveStudySubset(cards);

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
  const dueCount = sessionCards.length;

  const cooldownEnd = getEarliestCooldownEnd(allCardsForSession, now);
  const earliestCooldownEnd = cooldownEnd ? cooldownEnd.toISOString() : null;

  // PERF-16: masteryRound/cooldownUntil read directly off the single fetched
  // row (no Map lookup, no per-row studyCards.find() — that was the O(n^2)
  // stitch). Paused cards are masked to masteryRound 0 / cooldownUntil null
  // here, matching deriveStudySubset's exclusion of paused cards from the
  // study subset (identical behavior to the prior two-query version).
  // createdAt is dropped (PERF-16) — confirmed unread by CardList/CardEditDialog.
  const cardRows = cards.map((c) => {
    const isPaused = c.pausedAt !== null;
    return {
      id: c.id,
      front: c.front,
      back: c.back,
      source: c.source,
      masteryRound: isPaused ? 0 : c.masteryRound,
      pausedAt: c.pausedAt,
      // QA-only: pass cooldownUntil when QA-authed so CardList can render the
      // badge. Customers receive null (no extra payload, no badge prop
      // threaded down).
      cooldownUntil: qaMode && !isPaused ? c.cooldownUntil : null,
    };
  });

  const nativeLangLabel = LANGUAGE_LABELS[nativeLang] ?? nativeLang;
  const targetLangLabel = activeDeck
    ? (LANGUAGE_LABELS[activeDeck.language] ?? activeDeck.language)
    : "Learning";

  const hasCards = cardRows.length > 0;

  // All-paused: cards exist, nothing due, no cooldown active, AND every card is paused.
  const allPaused =
    hasCards &&
    !hasDueCards &&
    !earliestCooldownEnd &&
    cardRows.every((c) => c.pausedAt !== null);

  // Sleeping: resting/cooldown state for the hero
  const sleeping = Boolean(earliestCooldownEnd && !hasDueCards);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader
        decks={deckOptions}
        activeDeckId={activeDeck.id}
        nativeLang={nativeLang}
      />
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        {/* HabitatHero — DSH-02 wiring (L-04); now a Server Component (D-06) */}
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
                href={`/study?deck=${activeDeck.id}`}
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
                href={`/deck/new-card?deck=${activeDeck.id}`}
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

        {/* D-15: real-content root — present only once real card/due data has
            rendered (this branch never renders while data is still loading,
            since the whole tree above is server-rendered from resolved data). */}
        <div data-perf-ready="true">
          <CardList
            cards={cardRows}
            deckId={activeDeck.id}
            nativeLangLabel={nativeLangLabel}
            targetLangLabel={targetLangLabel}
            qaMode={qaMode}
          />
        </div>
      </main>
    </div>
  );
}
