"use client";

import { LionFace } from "@/components/daybreak/lion-face";
import { type DeckOption, DeckSwitcher } from "@/components/deck-switcher";
import { LogoutButton } from "@/components/logout-button";

interface AppHeaderProps {
  decks: DeckOption[];
  activeDeckId: string | null;
  onDeckChange: (id: string) => void;
  nativeLang: string;
}

export function AppHeader({
  decks,
  activeDeckId,
  onDeckChange,
  nativeLang,
}: AppHeaderProps) {
  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-4 sm:px-6 md:px-8 justify-between sticky top-0 z-40">
      {/* Brand cluster — LionFace + "LeoCards" wordmark (L-01, D-01) */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <LionFace
          size={27}
          mane="#E8973B"
          face="#FFD9A6"
          muzzle="#FFF1DC"
          ink="#4A331C"
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            fontWeight: 700,
            color: "#4A331C",
            lineHeight: 1,
          }}
        >
          LeoCards
        </span>
      </div>

      {/* Right cluster — deck picker + logout glyph */}
      <div className="flex items-center" style={{ gap: 9 }}>
        {decks.length > 0 && (
          <DeckSwitcher
            decks={decks}
            activeDeckId={activeDeckId}
            onDeckChange={onDeckChange}
            nativeLang={nativeLang}
          />
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
