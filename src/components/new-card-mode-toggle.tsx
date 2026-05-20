"use client";

import { useState } from "react";
import type { DeckOption } from "@/components/deck-switcher";
import { ImageUploadFlow } from "@/components/image-upload-flow";
import { TranslationForm } from "@/components/translation-form";
import { Button } from "@/components/ui/button";

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
    <div>
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === "type" ? "default" : "outline"}
          onClick={() => setMode("type")}
        >
          Type a word
        </Button>
        <Button
          variant={mode === "image" ? "default" : "outline"}
          onClick={() => setMode("image")}
        >
          From image
        </Button>
      </div>
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
