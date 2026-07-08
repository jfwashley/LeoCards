"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ACContext } from "@/components/daybreak/ac-context";
import { ACSeg } from "@/components/daybreak/ac-seg";
import { ACTop } from "@/components/daybreak/ac-top";
import { DaybreakShimmer } from "@/components/daybreak/shimmer";
import type { DeckOption } from "@/components/deck-switcher";
import { TranslationForm } from "@/components/translation-form";

// Phase 17 (D-03) — ImageUploadFlow is only needed on the "From an image"
// path, not the default "Type a word" mode. Lazy-loaded via next/dynamic
// behind the one reusable DaybreakShimmer placeholder; already conditionally
// rendered below (mode === "image"), so the chunk is never fetched until the
// user actually toggles to that mode.
const ImageUploadFlow = dynamic(
  () =>
    import("@/components/image-upload-flow").then((mod) => mod.ImageUploadFlow),
  { loading: () => <DaybreakShimmer width="100%" height={280} radius={22} /> },
);

interface NewCardModeToggleProps {
  decks: DeckOption[];
  activeDeckId: string;
  nativeLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
  targetLang: string;
}

export function NewCardModeToggle({
  decks,
  activeDeckId,
  nativeLang,
  nativeLangLabel,
  targetLangLabel,
  targetLang,
}: NewCardModeToggleProps) {
  const [mode, setMode] = useState<"type" | "image">("type");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
      data-perf-ready="true"
    >
      {/* ACTop: "‹ My deck" escape link + "Add a Card" Baloo 2 title + D-03 Browse entry in type mode */}
      <ACTop
        browsePath={
          mode === "type" ? `/deck/browse?deck=${activeDeckId}` : undefined
        }
      />
      {/* ACContext: EN → ES · saves to your Spanish deck */}
      <ACContext
        nativeLang={nativeLangLabel}
        targetLang={targetLangLabel}
        targetDeckName={`${targetLangLabel} deck`}
      />
      {/* ACSeg: segmented toggle — "Type a word" | "From an image" (D-07) */}
      <ACSeg mode={mode} onChange={setMode} />
      {/* Child flows — both mounts preserved, all props unchanged */}
      {mode === "type" ? (
        <TranslationForm
          deckId={activeDeckId}
          nativeLang={nativeLang}
          targetLang={targetLang}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      ) : (
        <ImageUploadFlow
          decks={decks}
          defaultDeckId={activeDeckId}
          nativeLang={nativeLang}
        />
      )}
    </div>
  );
}
