"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDeck } from "@/lib/deck-actions";

const FLAG_MAP: Record<string, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
};

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

  const learningLanguages = ALL_LANGUAGES.filter((l) => l.code !== nativeLang);

  async function handleCreateDeck(langCode: string) {
    setCreatingLang(langCode);
    try {
      const result = await createDeck(langCode);
      onDeckChange(result.id);
      setShowPicker(false);
    } catch {
      // silently fail — page will reflect state on next interaction
    } finally {
      setCreatingLang(null);
    }
  }

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
  const activeFlag = activeDeck ? (FLAG_MAP[activeDeck.language] ?? "") : "";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeDeckId ?? undefined}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="min-w-[160px]">
          <SelectValue>
            {activeDeck ? (
              <span>
                {activeFlag} {activeDeck.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Select deck</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {decks.map((deck) => {
            const flag = FLAG_MAP[deck.language] ?? "";
            return (
              <SelectItem key={deck.id} value={deck.id}>
                {flag} {deck.name}
              </SelectItem>
            );
          })}
          <SelectSeparator />
          <SelectItem value="__new__">
            <Plus className="size-4" />+ New deck
          </SelectItem>
        </SelectContent>
      </Select>

      {showPicker && (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm text-muted-foreground">
            Choose language:
          </span>
          {learningLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              disabled={creatingLang !== null}
              onClick={() => handleCreateDeck(lang.code)}
              className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingLang === lang.code ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                FLAG_MAP[lang.code]
              )}{" "}
              {lang.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="text-sm text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
