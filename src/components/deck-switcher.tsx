"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { LangChip } from "@/components/daybreak/lang-chip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createDeck } from "@/lib/deck-actions";

// Chevron glyph per the Daybreak mock (lines 27-30)
function Chevron({ dir = "down" }: { dir?: "down" | "up" | "right" }) {
  const rot = { down: 45, up: -135, right: -45 }[dir];
  const size = 9;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRight: "2.2px solid #B4762A",
        borderBottom: "2.2px solid #B4762A",
        transform: `rotate(${rot}deg)`,
        display: "inline-block",
        marginTop: dir === "down" ? -3 : dir === "up" ? 3 : 0,
        flex: "none",
      }}
    />
  );
}

// PlusGlyph per the Daybreak mock (lines 31-38)
function PlusGlyph() {
  return (
    <span
      style={{
        position: "relative",
        width: 14,
        height: 14,
        flex: "none",
        display: "inline-flex",
      }}
      aria-hidden="true"
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 6,
          width: 14,
          height: 2.3,
          borderRadius: 2,
          background: "#B4762A",
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
          background: "#B4762A",
        }}
      />
    </span>
  );
}

const ALL_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

export interface DeckOption {
  id: string;
  name: string;
  language: string;
}

interface DeckSwitcherProps {
  decks: DeckOption[];
  activeDeckId: string | null;
  onDeckChange: (id: string) => void;
  nativeLang: string;
}

export function DeckSwitcher({
  decks,
  activeDeckId,
  onDeckChange,
  nativeLang,
}: DeckSwitcherProps) {
  const [creatingLang, setCreatingLang] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const learningLanguages = useMemo(
    () => ALL_LANGUAGES.filter((l) => l.code !== nativeLang),
    [nativeLang],
  );

  const handleCreateDeck = useCallback(
    async (langCode: string) => {
      setCreatingLang(langCode);
      setError(null);
      try {
        const result = await createDeck(langCode);
        onDeckChange(result.id);
        setShowPicker(false);
      } catch {
        setError("Failed to create deck. Try again.");
      } finally {
        setCreatingLang(null);
      }
    },
    [onDeckChange],
  );

  function handleValueChange(value: string | null) {
    if (!value) return;
    if (value === "__new__") {
      setShowPicker(true);
      return;
    }
    setShowPicker(false);
    onDeckChange(value);
  }

  const activeDeck = decks.find((d) => d.id === activeDeckId);
  const activeLangCode = activeDeck?.language.toUpperCase() ?? "??";

  // Map language code to full display name
  const getLangLabel = (code: string) =>
    ALL_LANGUAGES.find((l) => l.code === code)?.label ?? code;

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          setShowPicker(false);
          setError(null);
        }
      }}
    >
      <PopoverTrigger
        data-testid="deck-picker-trigger"
        aria-label={`Switch deck, current ${activeDeck?.name ?? "deck"}`}
        style={{
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "0 9px",
          borderRadius: 10,
          border: "1.5px solid #EDDFC9",
          background: "#FFFFFF",
          boxSizing: "border-box",
          cursor: "pointer",
        }}
      >
        <LangChip code={activeLangCode} size={20} />
        <Chevron dir="down" />
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8}>
        {/* Deck list */}
        <div style={{ minWidth: 180, padding: "8px 0" }}>
          {decks.map((deck) => {
            const isActive = deck.id === activeDeckId;
            return (
              <button
                key={deck.id}
                type="button"
                data-testid={`deck-option-${deck.language}`}
                onClick={() => handleValueChange(deck.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: isActive ? 700 : 400,
                  color: "#4A331C",
                  textAlign: "left",
                }}
              >
                <LangChip code={deck.language.toUpperCase()} size={18} />
                <span style={{ flex: 1 }}>{getLangLabel(deck.language)}</span>
                {isActive && (
                  <span
                    role="img"
                    aria-label="active deck"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#F28A1F",
                      flex: "none",
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: "#F0E3CF",
              margin: "6px 14px",
            }}
          />

          {/* + New deck row */}
          {!showPicker && (
            <button
              type="button"
              data-testid="new-deck-row"
              onClick={() => setShowPicker(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "8px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "#B4762A",
              }}
            >
              <PlusGlyph />+ New deck
            </button>
          )}

          {/* Inline create picker */}
          {showPicker && (
            <div
              style={{
                padding: "8px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {learningLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={creatingLang !== null}
                    onClick={() => handleCreateDeck(lang.code)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #F0E3CF",
                      background: "#FFF1DC",
                      cursor: creatingLang !== null ? "not-allowed" : "pointer",
                      opacity:
                        creatingLang !== null && creatingLang !== lang.code
                          ? 0.5
                          : 1,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#B4762A",
                    }}
                  >
                    {creatingLang === lang.code ? (
                      <Loader2
                        style={{
                          width: 14,
                          height: 14,
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    ) : (
                      <LangChip code={lang.code.toUpperCase()} size={18} />
                    )}
                    {lang.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPicker(false);
                  setError(null);
                }}
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#8C7A63",
                  padding: "2px 0",
                }}
              >
                Cancel
              </button>
              {error && (
                <span style={{ fontSize: 12, color: "#B91C1C" }}>{error}</span>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
