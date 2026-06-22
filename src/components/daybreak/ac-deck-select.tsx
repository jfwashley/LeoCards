"use client";

// ACDeckSelect — full-width "Add words to" deck field for the Confirm step (D-02).
// Reuses the Phase 21 DeckSwitcher popover internals including the inline
// "+ New deck" create flow. Only the trigger presentation changes from the compact
// pill (deck-switcher.tsx header) to this full-width row.
// Carries data-testid="confirm-deck-select" (NOT "deck-picker-trigger" — that stays
// on the header DeckSwitcher instance — per RESEARCH Pitfall 7).

import { LangChip } from "@/components/daybreak/lang-chip";
import { type DeckOption, DeckSwitcher } from "@/components/deck-switcher";

// Down chevron glyph (muted Daybreak colour)
function ChevronDown() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 9,
        height: 9,
        borderRight: "2.2px solid #9C8467",
        borderBottom: "2.2px solid #9C8467",
        transform: "rotate(45deg)",
        display: "inline-block",
        marginTop: -3,
        flex: "none",
      }}
    />
  );
}

interface ACDeckSelectProps {
  decks: DeckOption[];
  activeDeckId: string | null;
  onDeckChange: (id: string) => void;
  nativeLang: string;
}

export function ACDeckSelect({
  decks,
  activeDeckId,
  onDeckChange,
  nativeLang,
}: ACDeckSelectProps) {
  const activeDeck = decks.find((d) => d.id === activeDeckId);
  const activeLangCode = activeDeck?.language.toUpperCase() ?? "??";
  const activeDeckName = activeDeck?.name ?? "—";

  // The full-width trigger rendered as a ReactElement.
  // base-ui PopoverTrigger's render prop merges onClick + aria props onto this element.
  const fullWidthTrigger = (
    <button
      type="button"
      data-testid="confirm-deck-select"
      aria-label={`Add words to deck, current ${activeDeckName}`}
      style={{
        width: "100%",
        height: 52,
        borderRadius: 12,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 15px",
        background: "#FFFFFF",
        border: "1.5px solid #EDDFC9",
        cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LangChip code={activeLangCode} size={22} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "#4A331C" }}>
          {activeDeckName}
        </span>
      </span>
      <ChevronDown />
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {/* "Add words to" label */}
      <span style={{ fontSize: 13, fontWeight: 700, color: "#4A331C" }}>
        Add words to
      </span>

      {/* DeckSwitcher with the full-width trigger — reuses all popover + createDeck logic */}
      <DeckSwitcher
        decks={decks}
        activeDeckId={activeDeckId}
        onDeckChange={onDeckChange}
        nativeLang={nativeLang}
        customTrigger={fullWidthTrigger}
      />

      {/* Helper text */}
      <span style={{ fontSize: 12.5, color: "#9C8467" }}>
        Defaults to your active deck &middot; change it or create a new one
      </span>
    </div>
  );
}
