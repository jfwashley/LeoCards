"use client";

import { Pencil, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CardEditDialog, type CardRow } from "@/components/card-edit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CardListProps {
  cards: CardRow[];
  nativeLangLabel: string;
  targetLangLabel: string;
}

export function CardList({
  cards,
  nativeLangLabel,
  targetLangLabel,
}: CardListProps) {
  const [query, setQuery] = useState("");
  const [editCard, setEditCard] = useState<CardRow | null>(null);

  const filtered =
    query.trim() === ""
      ? cards
      : cards.filter(
          (c) =>
            c.front.toLowerCase().includes(query.toLowerCase()) ||
            c.back.toLowerCase().includes(query.toLowerCase()),
        );

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 className="text-lg font-semibold">Your deck is empty</h2>
        <p className="text-sm text-muted-foreground text-center">
          Browse the word list or add a card to get started.
        </p>
        <Link
          href="/deck/browse"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 h-8 text-sm hover:bg-muted transition-colors"
        >
          Browse words
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your cards..."
          className="pl-9 pr-9 h-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* No results */}
      {filtered.length === 0 && query && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No cards match &ldquo;{query}&rdquo;.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different word.
          </p>
        </div>
      )}

      {/* Card table */}
      {filtered.length > 0 && (
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-sm text-muted-foreground font-normal pb-2 pr-4">
                {nativeLangLabel}
              </th>
              <th className="text-left text-sm text-muted-foreground font-normal pb-2 pr-4">
                {targetLangLabel}
              </th>
              <th className="text-left text-sm text-muted-foreground font-normal pb-2 pr-4 w-20">
                Source
              </th>
              <th className="text-left text-sm text-muted-foreground font-normal pb-2 w-20">
                Round
              </th>
              <th className="pb-2 w-11" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => (
              <tr
                key={card.id}
                className="border-b border-border min-h-[48px] hover:bg-secondary transition-colors"
              >
                <td className="text-base py-3 pr-4">{card.front}</td>
                <td className="text-base py-3 pr-4">{card.back}</td>
                <td className="py-3 pr-4">
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                    {card.source === "wordlist" ? "word list" : "manual"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div
                    className="flex items-center gap-1"
                    title={`${card.masteryRound ?? 0} of 3 rounds complete`}
                  >
                    {[0, 1, 2].map((round) => (
                      <span
                        key={round}
                        className={`inline-block w-2 h-2 rounded-full ${
                          (card.masteryRound ?? 0) > round
                            ? "bg-primary"
                            : "border border-border"
                        }`}
                        title={
                          (card.masteryRound ?? 0) > round
                            ? `Round ${round + 1} of 3 complete`
                            : `Round ${round + 1} of 3 not yet complete`
                        }
                      />
                    ))}
                  </div>
                </td>
                <td className="py-3">
                  <Button
                    variant="ghost"
                    className="h-11 w-11 opacity-60 hover:opacity-100 p-0"
                    aria-label="Edit card"
                    onClick={() => setEditCard(card)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CardEditDialog
        card={editCard}
        open={editCard !== null}
        onOpenChange={(open) => {
          if (!open) setEditCard(null);
        }}
      />
    </div>
  );
}
