import Link from "next/link";
import { redirect } from "next/navigation";
import { CardList } from "@/components/card-list";
import { CountdownTimer } from "@/components/countdown-timer";
import { DashboardHeader } from "@/components/dashboard-header";
import { HabitatHero } from "@/components/habitat-hero";
import type { UserId } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import { loadDashboardCore } from "@/lib/core/dashboard";
import { readHabitatOverride, readQaAuth } from "@/lib/debug-cheat";

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

  const habitatOverride = await readHabitatOverride();
  const qaMode = await readQaAuth();

  const params = await searchParams;
  const requestedDeckId = params.deck;
  const rawCelebrate = params.celebrate ? parseInt(params.celebrate, 10) : null;
  const celebratingLevel =
    rawCelebrate !== null && !Number.isNaN(rawCelebrate)
      ? Math.max(1, Math.min(10, rawCelebrate))
      : null;

  // D-07: this page and the native-v1 read endpoint compute every derived
  // flag from this ONE function — deliberately WITHOUT the QA time offset
  // (only the route handler applies it, mirroring /api/habitat's existing
  // page/route asymmetry).
  const result = await loadDashboardCore({
    userId: session.user.id as UserId,
    nativeLanguage: nativeLang,
    requestedDeckId,
    now: new Date(),
    habitatOverride: habitatOverride ?? undefined,
    qaMode,
  });

  if (!result.ok) return null;

  if (result.data.needsOnboarding) {
    redirect("/welcome");
  }

  const { data } = result;
  const habitatState = data.habitat;

  const deckOptions = data.decks;
  const activeDeck = deckOptions.find((d) => d.id === data.activeDeckId);

  // needsOnboarding is guaranteed false here (redirect above), so
  // activeDeckId always resolves to one of deckOptions — this guard exists
  // only because the wire shape is flat (not a discriminated union)
  // TypeScript can narrow across, mirroring the page's own defensive-null
  // convention (if (!session) return null, above).
  if (!activeDeck) return null;

  const hasDueCards = data.hasDueCards;
  const dueCount = data.dueCount;
  const earliestCooldownEnd = data.earliestCooldownEnd;
  const allPaused = data.allPaused;
  const sleeping = data.sleeping;

  // The core's response carries ISO strings (JSON-safe); CardList's CardRow
  // prop still expects Date | null — revived here, at the page's own
  // presentation boundary, without changing the wire contract or any
  // component's prop types.
  const cardRows = data.cards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    source: c.source,
    masteryRound: c.masteryRound,
    pausedAt: c.pausedAt !== null ? new Date(c.pausedAt) : null,
    cooldownUntil: c.cooldownUntil !== null ? new Date(c.cooldownUntil) : null,
  }));

  const nativeLangLabel = LANGUAGE_LABELS[nativeLang] ?? nativeLang;
  const targetLangLabel =
    LANGUAGE_LABELS[activeDeck.language] ?? activeDeck.language;

  const hasCards = cardRows.length > 0;

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
