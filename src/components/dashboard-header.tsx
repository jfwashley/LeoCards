"use client";

import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import type { DeckOption } from "@/components/deck-switcher";

// Phase 17 (D-06): thin client leaf around AppHeader.
//
// AppHeader is already a client component (it owns DeckSwitcher's popover
// state), but it needs an `onDeckChange` callback — a non-serializable
// function — that a Server Component cannot pass as a prop. This wrapper owns
// the one genuinely interactive piece (the deck-switch navigation) so
// dashboard/page.tsx can render the rest of the dashboard shell as static RSC
// markup while still wiring up deck switching.
export function DashboardHeader({
  decks,
  activeDeckId,
  nativeLang,
}: {
  decks: DeckOption[];
  activeDeckId: string;
  nativeLang: string;
}) {
  const router = useRouter();

  function handleDeckChange(id: string) {
    router.push(`/dashboard?deck=${id}`);
  }

  return (
    <AppHeader
      decks={decks}
      activeDeckId={activeDeckId}
      onDeckChange={handleDeckChange}
      nativeLang={nativeLang}
    />
  );
}
