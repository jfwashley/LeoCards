"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState, useTransition } from "react";
import { BWMedallion } from "@/components/daybreak/bw-medallion";
import { LangChip } from "@/components/daybreak/lang-chip";
import { LionFace } from "@/components/daybreak/lion-face";
import type { CATEGORIES, CefrLevel, WordEntry } from "@/data/wordlists/schema";
import { addWordToCard, removeWordFromDeck } from "@/lib/deck-actions";
import { filterWords } from "@/lib/wordlist";

// ─── Types ────────────────────────────────────────────────────────────────────

type DifficultyFilter = "All" | CefrLevel;

// ─── Shared utilities ─────────────────────────────────────────────────────────

function wordKey(word: WordEntry): string {
  return `${word.native}::${word.target}`;
}

function toChipCode(label: string): string {
  return label.trim().slice(0, 2).toUpperCase();
}

// ─── Left chevron glyph (no icon library) ────────────────────────────────────
// Source: design/handoff-daybreak/daybreak-browse.jsx BWChevL

function ChevL() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderLeft: "2.2px solid #C96F12",
        borderBottom: "2.2px solid #C96F12",
        transform: "rotate(45deg)",
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}

// ─── Spinner (CSS-drawn, amber) ───────────────────────────────────────────────
// Uses Tailwind's animate-spin class so the @keyframes spin is emitted by the
// compiler (it is defined in tailwindcss/index.css via the default theme).

function AmberSpinner() {
  return (
    <span
      className="animate-spin"
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid #F4E3C4",
        borderTopColor: "#F28A1F",
        display: "inline-block",
      }}
    />
  );
}

// ─── CEFR tag ────────────────────────────────────────────────────────────────

function BWLvlTag({ cefr }: { cefr: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#B4762A",
        background: "#FFF1DC",
        borderRadius: 6,
        padding: "2px 7px",
        flex: "none",
      }}
    >
      {cefr}
    </span>
  );
}

// ─── Context line (both screens) ─────────────────────────────────────────────

function BWContext({
  nativeLangLabel,
  targetLangLabel,
}: {
  nativeLangLabel: string;
  targetLangLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        flex: "none",
        flexWrap: "wrap",
      }}
    >
      <LangChip code={toChipCode(nativeLangLabel)} size={22} />
      <span
        aria-hidden="true"
        style={{ color: "#9C8467", fontSize: 15, fontWeight: 700 }}
      >
        →
      </span>
      <LangChip code={toChipCode(targetLangLabel)} size={22} />
      <span style={{ fontSize: 13.5, color: "#9C8467" }}>
        tap a word to add it to your{" "}
        <span style={{ color: "#4A331C", fontWeight: 700 }}>
          {targetLangLabel} deck
        </span>
      </span>
    </div>
  );
}

// ─── BWWordRow (Row A) — memoised ────────────────────────────────────────────
// Preserves the prop shape + React.memo + aria-label convention from the
// original WordRow. Only the markup changes (D-05/D-06).
// Exported so bw-atoms.test.tsx can import and render it directly (BRW-03).

interface BWWordRowProps {
  word: WordEntry;
  inDeck: boolean;
  loading: boolean;
  error: string | undefined;
  onAdd: (word: WordEntry) => void;
  onRemove: (word: WordEntry) => void;
  targetLangLabel: string;
}

export const BWWordRow = React.memo(function BWWordRow({
  word,
  inDeck,
  loading,
  error,
  onAdd,
  onRemove,
  targetLangLabel,
}: BWWordRowProps) {
  return (
    <div
      data-testid="word-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 12px",
        marginBottom: 7,
        borderRadius: 14,
        minHeight: 44,
        background: inDeck ? "#FFF7E9" : "transparent",
        border: inDeck ? "1px solid #F4E3C4" : "1px solid transparent",
        boxSizing: "border-box",
      }}
    >
      {/* Left column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Native term bold on top */}
        <div
          style={{
            fontSize: 17.5,
            fontWeight: 700,
            color: "#4A331C",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {word.native}
        </div>
        {/* Target term beneath with language chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 3,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9C8467" }}>
            {toChipCode(targetLangLabel)}
          </span>
          <span
            style={{
              fontSize: 14.5,
              color: "#9C8467",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {word.target}
          </span>
        </div>
        {/* Reserved error line — ALWAYS in DOM (D-06, no layout shift) */}
        <div
          data-role="error-line"
          style={{
            fontSize: 12,
            color: "#DE5F4A",
            minHeight: 16,
            marginTop: 2,
          }}
        >
          {error ?? ""}
        </div>
      </div>

      {/* CEFR chip */}
      <BWLvlTag cefr={word.cefr} />

      {/* 38px circular toggle */}
      <button
        type="button"
        aria-label={
          inDeck
            ? `Remove ${word.native} from deck`
            : `Add ${word.native} to deck`
        }
        onClick={() => (inDeck ? onRemove(word) : onAdd(word))}
        disabled={loading}
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          flex: "none",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: inDeck ? "#F28A1F" : "#FFFFFF",
          border: inDeck ? "none" : "2px solid #F28A1F",
          boxShadow: inDeck ? "0 5px 12px rgba(242,138,31,0.26)" : "none",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? (
          <AmberSpinner />
        ) : inDeck ? (
          <span style={{ color: "#FFF", fontSize: 17, fontWeight: 700 }}>
            &#10003;
          </span>
        ) : (
          /* CSS-drawn + cross */
          <span style={{ position: "relative", width: 15, height: 15 }}>
            <span
              style={{
                position: "absolute",
                top: 6.5,
                left: 0,
                width: 15,
                height: 2.4,
                borderRadius: 2,
                background: "#F28A1F",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 6.5,
                top: 0,
                width: 2.4,
                height: 15,
                borderRadius: 2,
                background: "#F28A1F",
              }}
            />
          </span>
        )}
      </button>
    </div>
  );
});

// ─── BrowseEmpty (D-09) ───────────────────────────────────────────────────────
// Exported so bw-atoms.test.tsx can render it directly (BRW-04).

interface BrowseEmptyProps {
  topic: string;
  level: string;
  onShowAll: () => void;
}

export function BrowseEmpty({ topic, level, onShowAll }: BrowseEmptyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        textAlign: "center",
        paddingTop: 32,
        paddingBottom: 32,
      }}
    >
      {/* LionFace in #F3E3C6 disc */}
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: "50%",
          background: "#F3E3C6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <LionFace size={54} />
      </div>

      {/* Heading */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 700,
          color: "#4A331C",
        }}
      >
        No words at this level.
      </span>

      {/* Contextual subtext */}
      <span
        style={{
          fontSize: 14.5,
          color: "#9C8467",
          lineHeight: 1.5,
          maxWidth: 250,
        }}
      >
        There are no {level} words in {topic} yet. Try another level or topic.
      </span>

      {/* Show all levels button */}
      <button
        type="button"
        onClick={onShowAll}
        style={{
          height: 48,
          padding: "0 22px",
          borderRadius: 14,
          background: "#F28A1F",
          color: "#FFF",
          display: "flex",
          alignItems: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 16,
          boxShadow: "0 10px 22px rgba(242,138,31,0.30)",
          border: "none",
          cursor: "pointer",
        }}
      >
        Show all levels
      </button>
    </div>
  );
}

// ─── BrowseTiles (topic-tiles landing) ───────────────────────────────────────

interface BrowseTilesProps {
  categories: readonly string[];
  categoryCounts: Record<string, number>;
  deckId: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}

export function BrowseTiles({
  categories,
  categoryCounts,
  deckId,
  nativeLangLabel,
  targetLangLabel,
}: BrowseTilesProps) {
  return (
    <div>
      {/* Top bar — D-04: "‹ Add a card" (NOT "My deck") */}
      <div
        style={{
          padding: "4px 0 0",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Link
          href={`/deck/new-card?deck=${deckId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#C96F12",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          <ChevL />
          Add a card
        </Link>
        <span
          data-testid="browse-words-title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "#4A331C",
          }}
        >
          Browse Words
        </span>
        {/* Balancing spacer — same width as back-link area */}
        <span style={{ width: 64, flex: "none" }} />
      </div>

      {/* Context line */}
      <div style={{ marginBottom: 20 }}>
        <BWContext
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      </div>

      {/* Pick a topic heading */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 700,
          color: "#4A331C",
          marginBottom: 16,
        }}
      >
        Pick a topic
      </div>

      {/* 3-column tile grid — 14 categories */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 11,
        }}
      >
        {categories.map((category) => (
          <Link
            key={category}
            href={`/deck/browse?deck=${deckId}&topic=${encodeURIComponent(category)}`}
            data-testid={`topic-tile-${category.toLowerCase().replace(/[^a-z]/g, "-")}`}
            style={{
              borderRadius: 18,
              background: "#FFFFFF",
              border: "1px solid #EDDFC9",
              boxShadow: "0 5px 14px rgba(160,110,40,0.07)",
              padding: "15px 12px 13px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 9,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            <BWMedallion name={category} />
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#4A331C",
                  lineHeight: 1.1,
                }}
              >
                {category}
              </span>
              <span style={{ fontSize: 11.5, color: "#9C8467" }}>
                {categoryCounts[category] ?? 0} words
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── BrowseList (per-topic word list) ────────────────────────────────────────

interface BrowseListProps {
  words: WordEntry[];
  existingWords: Set<string>;
  deckId: string;
  topic: string;
  nativeLang: string;
  targetLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}

export function BrowseList({
  words,
  existingWords,
  deckId,
  topic,
  nativeLangLabel,
  targetLangLabel,
}: BrowseListProps) {
  // CEFR filter — in-page state, NOT a URL param (D-01)
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("All");

  // ── Optimistic state machine — PRESERVED VERBATIM (D-06) ──────────────────
  // DO NOT add a useEffect to sync deckWords from props (Pitfall 3).
  // The lazy initializer is intentional — revalidatePath hits /dashboard, not /deck/browse.
  const [deckWords, setDeckWords] = useState<Set<string>>(
    () => new Set(existingWords),
  );
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [errorWords, setErrorWords] = useState<Map<string, string>>(new Map());
  const [, startTransition] = useTransition();

  const handleAdd = useCallback(
    (word: WordEntry) => {
      const key = wordKey(word);

      // Optimistic add
      setDeckWords((prev) => new Set([...prev, key]));
      setLoadingWords((prev) => new Set([...prev, key]));

      startTransition(async () => {
        try {
          await addWordToCard(deckId, word.id, word.native, word.target);
        } catch {
          setDeckWords((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          setErrorWords(
            (prev) => new Map([...prev, [key, "Failed. Try again."]]),
          );
          setTimeout(() => {
            setErrorWords((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
          }, 3000);
        } finally {
          setLoadingWords((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      });
    },
    [deckId],
  );

  const handleRemove = useCallback(
    (word: WordEntry) => {
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
        } catch {
          setDeckWords((prev) => new Set([...prev, key]));
          setErrorWords(
            (prev) => new Map([...prev, [key, "Failed. Try again."]]),
          );
          setTimeout(() => {
            setErrorWords((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
          }, 3000);
        } finally {
          setLoadingWords((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      });
    },
    [deckId],
  );
  // ── End optimistic state machine ──────────────────────────────────────────

  const filteredWords = useMemo(
    () =>
      filterWords(words, {
        category: topic as (typeof CATEGORIES)[number],
        cefr: difficultyFilter === "All" ? undefined : difficultyFilter,
      }),
    [words, topic, difficultyFilter],
  );

  const levels: DifficultyFilter[] = ["All", "A1", "A2", "B1"];

  return (
    <div>
      {/* Top bar — D-02: "‹ Topics" back to landing */}
      <div
        style={{
          padding: "4px 0 0",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <Link
          href={`/deck/browse?deck=${deckId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#C96F12",
            fontWeight: 700,
            fontSize: 14.5,
            textDecoration: "none",
          }}
        >
          <ChevL />
          Topics
        </Link>
        {/* Center: mini medallion + topic name */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <BWMedallion name={topic} size={26} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 700,
              color: "#4A331C",
            }}
          >
            {topic}
          </span>
        </span>
        <span style={{ width: 64, flex: "none" }} />
      </div>

      {/* Context line */}
      <div style={{ marginBottom: 15 }}>
        <BWContext
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      </div>

      {/* LEVEL tile row */}
      <div style={{ flex: "none", marginBottom: 15 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "#9C8467",
            letterSpacing: 0.3,
          }}
        >
          LEVEL
        </span>
        <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
          {levels.map((level) => {
            const active = level === difficultyFilter;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setDifficultyFilter(level)}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 13,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 16,
                  background: active ? "#F28A1F" : "#FFFFFF",
                  color: active ? "#FFF" : "#4A331C",
                  border: active ? "none" : "1px solid #EDDFC9",
                  boxShadow: active
                    ? "0 6px 14px rgba(242,138,31,0.26)"
                    : "none",
                  cursor: "pointer",
                }}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Word list or empty state */}
      {filteredWords.length === 0 ? (
        <BrowseEmpty
          topic={topic}
          level={difficultyFilter}
          onShowAll={() => setDifficultyFilter("All")}
        />
      ) : (
        <div>
          {filteredWords.map((word) => (
            <BWWordRow
              key={word.id}
              word={word}
              inDeck={deckWords.has(wordKey(word))}
              loading={loadingWords.has(wordKey(word))}
              error={errorWords.get(wordKey(word))}
              onAdd={handleAdd}
              onRemove={handleRemove}
              targetLangLabel={targetLangLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
