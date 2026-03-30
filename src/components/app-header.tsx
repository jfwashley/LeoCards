"use client";

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
      <div className="flex items-center gap-2">
        <span className="text-lg">🐯</span>
        <span className="text-sm font-semibold text-foreground">LeoCards</span>
      </div>

      <div className="flex items-center gap-4">
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
