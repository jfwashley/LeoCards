"use client";

import { Pause, Pencil, Play, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useTransition } from "react";
import { CardEditDialog, type CardRow } from "@/components/card-edit-dialog";
import { LionFace } from "@/components/daybreak/lion-face";
import { QaStateBadge } from "@/components/qa-state-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CardListProps {
  cards: CardRow[];
  nativeLangLabel: string;
  targetLangLabel: string;
  qaMode?: boolean;
}

export const CardList = React.memo(function CardList({
  cards,
  nativeLangLabel,
  targetLangLabel,
  qaMode = false,
}: CardListProps) {
  const [query, setQuery] = useState("");
  const [editCard, setEditCard] = useState<CardRow | null>(null);
  const router = useRouter();
  const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [, startTransition] = useTransition();

  const togglePause = (card: CardRow) => {
    setPendingCardIds((prev) => new Set(prev).add(card.id));
    startTransition(async () => {
      const action = card.pausedAt ? "unpause" : "pause";
      try {
        const res = await fetch(`/api/cards/${card.id}/${action}`, {
          method: "POST",
        });
        if (res.ok) {
          router.refresh(); // Pitfall 2 — revalidatePath alone would not update the open tab
        } else {
          console.error(
            `Pause toggle failed (${res.status}); state will resync on next refresh`,
          );
        }
      } catch (err) {
        console.error("Pause toggle network error", err);
      } finally {
        setPendingCardIds((prev) => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }
    });
  };

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return cards;
    const lower = trimmed.toLowerCase();
    return cards.filter(
      (c) =>
        c.front.toLowerCase().includes(lower) ||
        c.back.toLowerCase().includes(lower),
    );
  }, [query, cards]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        {/* Leo medallion — 110px #FFF1DC circle (ObEmptyDeck) */}
        <div
          className="flex items-center justify-center rounded-full flex-none"
          style={{ width: 110, height: 110, background: "#FFF1DC" }}
        >
          <LionFace
            size={66}
            mane="#E8973B"
            face="#FFD9A6"
            muzzle="#FFF1DC"
            ink="#4A331C"
          />
        </div>
        <h2 className="font-display text-[22px] font-bold text-foreground">
          Your deck is empty
        </h2>
        <p className="text-[14.5px] text-muted-foreground leading-[1.5] max-w-[240px] text-center">
          Add a few words and Leo&rsquo;s habitat starts to grow.
        </p>
        {/* 80%-width action column */}
        <div className="flex flex-col gap-[11px] w-[80%]">
          {/* Primary: Browse words */}
          <Link
            href="/deck/browse"
            className="flex items-center justify-center w-full rounded-[14px] bg-primary text-primary-foreground font-display text-[16px] font-bold shadow-[var(--db-btn-shadow)] hover:brightness-[0.97] transition-[filter]"
            style={{ height: 50 }}
          >
            Browse words
          </Link>
          {/* Ghost: + Add a card */}
          <Link
            href="/deck/new-card"
            className="flex items-center justify-center w-full rounded-[14px] font-display text-[16px] font-bold text-foreground hover:brightness-[0.97] transition-[filter]"
            style={{
              height: 50,
              background: "var(--background)",
              border: "1.5px solid #EDDFC9",
            }}
          >
            + Add a card
          </Link>
        </div>
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

      {/* No results — Daybreak ObNoSearch */}
      {filtered.length === 0 && query && (
        <div className="flex flex-col items-center justify-center py-12 gap-[13px] text-center">
          {/* Leo medallion — 96px #F3E3C6 circle (ObNoSearch) */}
          <div
            className="flex items-center justify-center rounded-full flex-none"
            style={{ width: 96, height: 96, background: "#F3E3C6" }}
          >
            <LionFace
              size={56}
              mane="#E8973B"
              face="#FFD9A6"
              muzzle="#FFF1DC"
              ink="#4A331C"
            />
          </div>
          <h2 className="font-display text-[20px] font-bold text-foreground">
            No words match &ldquo;{query}&rdquo;
          </h2>
          <p className="text-[14px] text-muted-foreground leading-[1.45] max-w-[230px]">
            Try a different spelling, or clear the search.
          </p>
          {/* Ghost: Clear search */}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex items-center justify-center rounded-[14px] font-display text-[15px] font-bold text-foreground hover:brightness-[0.97] transition-[filter] px-[18px]"
            style={{
              height: 44,
              background: "var(--background)",
              border: "1.5px solid #EDDFC9",
            }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Card list — table on desktop, cards on mobile */}
      {filtered.length > 0 && (
        <>
          {/* Desktop table (hidden on mobile) */}
          <table className="w-full hidden md:table">
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
                <th className="pb-2 w-11" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => {
                // Derive stage from masteryRound for browse context (no per-session stage).
                // Round 1 → t2n (second direction), all others → n2t; learned (R3) shows L.
                const browseStage: "n2t" | "t2n" =
                  (card.masteryRound ?? 0) === 1 ? "t2n" : "n2t";

                return (
                  <tr
                    key={card.id}
                    className={`relative border-b border-border min-h-[48px] hover:bg-secondary transition-colors ${card.pausedAt ? "opacity-50" : ""}`}
                  >
                    <td className="text-base py-3 pr-4">
                      {/* Badge lives inside the first <td> (valid HTML); the
                          relative <tr> is its positioning context. WR-02. */}
                      {qaMode && (
                        <QaStateBadge
                          data={{
                            masteryRound: card.masteryRound ?? 0,
                            stage: browseStage,
                            cooldownUntil: card.cooldownUntil ?? null,
                            pausedAt: card.pausedAt,
                          }}
                        />
                      )}
                      {card.front}
                    </td>
                    <td className="text-base py-3 pr-4">{card.back}</td>
                    <td className="py-3 pr-4">
                      <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                        {card.pausedAt
                          ? "Paused"
                          : card.source === "wordlist"
                            ? "word list"
                            : "manual"}
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
                        aria-label={
                          card.pausedAt ? "Resume this card" : "Pause this card"
                        }
                        title={
                          card.pausedAt ? "Resume this card" : "Pause this card"
                        }
                        disabled={pendingCardIds.has(card.id)}
                        onClick={() => togglePause(card)}
                      >
                        {card.pausedAt ? (
                          <Play className="size-4" />
                        ) : (
                          <Pause className="size-4" />
                        )}
                      </Button>
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
                );
              })}
            </tbody>
          </table>

          {/* Mobile card layout (hidden on desktop) */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((card) => {
              const browseStage: "n2t" | "t2n" =
                (card.masteryRound ?? 0) === 1 ? "t2n" : "n2t";

              return (
                <div
                  key={card.id}
                  className={`relative border border-border rounded-lg p-3 flex items-center gap-3 ${card.pausedAt ? "opacity-50" : ""}`}
                >
                  {qaMode && (
                    <QaStateBadge
                      data={{
                        masteryRound: card.masteryRound ?? 0,
                        stage: browseStage,
                        cooldownUntil: card.cooldownUntil ?? null,
                        pausedAt: card.pausedAt,
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{card.front}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {card.back}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                        {card.pausedAt
                          ? "Paused"
                          : card.source === "wordlist"
                            ? "word list"
                            : "manual"}
                      </span>
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
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-11 w-11 shrink-0 opacity-60 hover:opacity-100 p-0"
                    aria-label={
                      card.pausedAt ? "Resume this card" : "Pause this card"
                    }
                    title={
                      card.pausedAt ? "Resume this card" : "Pause this card"
                    }
                    disabled={pendingCardIds.has(card.id)}
                    onClick={() => togglePause(card)}
                  >
                    {card.pausedAt ? (
                      <Play className="size-4" />
                    ) : (
                      <Pause className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 w-11 shrink-0 opacity-60 hover:opacity-100 p-0"
                    aria-label="Edit card"
                    onClick={() => setEditCard(card)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </>
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
});
