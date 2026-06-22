"use client";

import { useState } from "react";
import { ACContext } from "@/components/daybreak/ac-context";
import { ACSeg } from "@/components/daybreak/ac-seg";
import { ACTop } from "@/components/daybreak/ac-top";
import type { DeckOption } from "@/components/deck-switcher";
import { ImageUploadFlow } from "@/components/image-upload-flow";
import { TranslationForm } from "@/components/translation-form";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ACTop: "‹ My deck" escape link + "Add a Card" Baloo 2 title */}
      <ACTop />
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
