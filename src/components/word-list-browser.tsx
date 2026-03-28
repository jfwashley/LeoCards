"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { CefrLevel, WordEntry } from "@/data/wordlists/schema";
import { CATEGORIES } from "@/data/wordlists/schema";
import { addWordToCard, removeWordFromDeck } from "@/lib/deck-actions";
import { cn } from "@/lib/utils";
import { filterWords } from "@/lib/wordlist";

type DifficultyFilter = "All" | CefrLevel;

interface WordListBrowserProps {
  words: WordEntry[];
  existingWords: Set<string>;
  deckId: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}

export function WordListBrowser({
  words,
  existingWords,
  deckId,
  nativeLangLabel,
  targetLangLabel,
}: WordListBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("All");
  // Client-side tracking of which words are in the deck (optimistic UI)
  const [deckWords, setDeckWords] = useState<Set<string>>(
    () => new Set(existingWords),
  );
  // Per-row loading state: key is "native::target"
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  // Per-row error state: key is "native::target"
  const [errorWords, setErrorWords] = useState<Map<string, string>>(new Map());
  const [, startTransition] = useTransition();

  const filteredWords = filterWords(words, {
    category: activeCategory as (typeof CATEGORIES)[number],
    cefr: difficultyFilter === "All" ? undefined : difficultyFilter,
  });

  function wordKey(word: WordEntry): string {
    return `${word.native}::${word.target}`;
  }

  function isInDeck(word: WordEntry): boolean {
    return deckWords.has(wordKey(word));
  }

  function isLoading(word: WordEntry): boolean {
    return loadingWords.has(wordKey(word));
  }

  function getError(word: WordEntry): string | undefined {
    return errorWords.get(wordKey(word));
  }

  function clearError(word: WordEntry) {
    setErrorWords((prev) => {
      const next = new Map(prev);
      next.delete(wordKey(word));
      return next;
    });
  }

  function handleAdd(word: WordEntry) {
    const key = wordKey(word);

    // Optimistic add
    setDeckWords((prev) => new Set([...prev, key]));
    setLoadingWords((prev) => new Set([...prev, key]));

    startTransition(async () => {
      try {
        await addWordToCard(deckId, word.id, word.native, word.target);
        // Success — optimistic state already set
      } catch {
        // Revert optimistic update
        setDeckWords((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        // Show error
        setErrorWords(
          (prev) => new Map([...prev, [key, "Failed. Try again."]]),
        );
        // Auto-dismiss after 3s
        setTimeout(() => clearError(word), 3000);
      } finally {
        setLoadingWords((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    });
  }

  function handleRemove(word: WordEntry) {
    const key = wordKey(word);

    // Optimistic remove
    setDeckWords((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setLoadingWords((prev) => new Set([...prev, key]));

    startTransition(async () => {
      try {
        await removeWordFromDeck(deckId, word.native, word.target);
        // Success — optimistic state already set
      } catch {
        // Revert optimistic update
        setDeckWords((prev) => new Set([...prev, key]));
        // Show error
        setErrorWords(
          (prev) => new Map([...prev, [key, "Failed. Try again."]]),
        );
        // Auto-dismiss after 3s
        setTimeout(() => clearError(word), 3000);
      } finally {
        setLoadingWords((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    });
  }

  return (
    <div>
      {/* Back navigation */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline mb-4"
      >
        <ArrowLeft className="size-4" />
        Back to my deck
      </Link>

      {/* Page heading */}
      <h1 className="text-xl font-semibold mb-6">Browse Words</h1>

      {/* Category navigation */}
      <div className="overflow-x-auto flex gap-2 pb-2 mb-4">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm cursor-pointer whitespace-nowrap transition-colors",
              activeCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2 pb-4 mb-2">
        {(["All", "A1", "A2", "B1"] as DifficultyFilter[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setDifficultyFilter(level)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors",
              difficultyFilter === level
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary",
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center border-b border-border py-1.5 text-sm text-muted-foreground">
        <span className="flex-1">{nativeLangLabel}</span>
        <span className="flex-1">{targetLangLabel}</span>
        <span className="w-12 text-center">Level</span>
        <span className="w-11" />
      </div>

      {/* Word rows */}
      <div>
        {filteredWords.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No words in this category at this level.
          </div>
        ) : (
          filteredWords.map((word) => {
            const inDeck = isInDeck(word);
            const loading = isLoading(word);
            const error = getError(word);

            return (
              <div
                key={word.id}
                className={cn(
                  "border-b border-border py-2 flex items-center min-h-[48px] gap-2",
                  inDeck && "bg-secondary",
                )}
              >
                <span className="flex-1 text-sm">{word.native}</span>
                <span className="flex-1 text-sm">{word.target}</span>

                {/* CEFR badge */}
                <span
                  className={cn(
                    "w-12 text-center text-xs px-2 py-0.5 rounded-full",
                    word.cefr === "A1" && "bg-muted text-muted-foreground",
                    word.cefr === "A2" &&
                      "bg-secondary text-secondary-foreground",
                    word.cefr === "B1" &&
                      "bg-secondary text-foreground font-medium",
                  )}
                >
                  {word.cefr}
                </span>

                {/* Action button */}
                <div className="w-11 flex items-center justify-center">
                  {error ? (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="size-4 text-destructive" />
                    </div>
                  ) : loading ? (
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0"
                      disabled
                      aria-label="Loading"
                    >
                      <Loader2 className="size-4 animate-spin" />
                    </Button>
                  ) : inDeck ? (
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0"
                      onClick={() => handleRemove(word)}
                      aria-label={`Remove ${word.native} from deck`}
                    >
                      <CheckCheck className="size-4 text-primary" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0"
                      onClick={() => handleAdd(word)}
                      aria-label={`Add ${word.native} to deck`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  )}
                </div>

                {/* Inline error text */}
                {error && (
                  <span className="absolute text-xs text-destructive mt-12">
                    {error}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
