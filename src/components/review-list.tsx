"use client";

import { CheckCircle2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSameLanguageDeckBackWords,
  saveImageCards,
} from "@/lib/deck-actions";

// Re-declared locally per Pitfall 4 — do NOT import from translation-form.tsx
const TranslationResponseSchema = z.object({
  translation: z.string().min(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewStep =
  | "loading-dedupe"
  | "step-a"
  | "translating"
  | "step-b"
  | "committing"
  | "success";

export interface ReviewRow {
  id: string;
  word: string;
  kept: boolean;
}

export interface TranslationRow {
  id: string;
  word: string;
  nativeText: string;
  translationError: string | null;
}

export interface ReviewState {
  step: ReviewStep;
  words: string[];
  rows: ReviewRow[];
  duplicates: string[];
  dedupeError: string | null;
  translationRows: TranslationRow[];
  commitStep: null | "in-flight" | "done";
  addedCount: number;
  failedCount: number;
  skippedCount: number;
}

export type ReviewAction =
  | { type: "DEDUPE_DONE"; knownWords: Set<string> }
  | { type: "DEDUPE_ERROR"; error: string }
  | { type: "TOGGLE_WORD"; id: string }
  | { type: "EDIT_WORD"; id: string; word: string }
  | { type: "REMOVE_WORD"; id: string }
  | { type: "SELECT_ALL" }
  | { type: "SELECT_NONE" }
  | { type: "TRANSLATE_START" }
  | { type: "TRANSLATE_ALL_DONE"; rows: TranslationRow[] }
  | { type: "TRANSLATION_ROW_DONE"; id: string; nativeText: string }
  | { type: "TRANSLATION_ROW_ERROR"; id: string; error: string }
  | { type: "EDIT_NATIVE"; id: string; nativeText: string }
  | { type: "EDIT_TARGET"; id: string; word: string }
  | { type: "COMMIT_START" }
  | {
      type: "COMMIT_DONE";
      addedCount: number;
      failedCount: number;
      skippedCount: number;
    }
  | { type: "BACK_TO_STEP_A" };

export interface CommitResult {
  addedCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface TranslationFanOutResult {
  id: string;
  nativeText: string;
  translationError: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReviewListProps {
  words: string[];
  deckId: string;
  nativeLang: string;
  targetLang: string;
  onCancel: () => void;
  nativeLangLabel?: string;
  targetLangLabel?: string;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function isDuplicate(
  word: string,
  knownBackWords: Set<string>,
): boolean {
  return knownBackWords.has(word.trim().toLowerCase());
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function reviewListReducer(
  state: ReviewState,
  action: ReviewAction,
): ReviewState {
  switch (action.type) {
    case "DEDUPE_DONE": {
      const newRows: ReviewRow[] = [];
      const newDuplicates: string[] = [];
      state.words.forEach((word, i) => {
        if (isDuplicate(word, action.knownWords)) {
          newDuplicates.push(word);
        } else {
          newRows.push({ id: `row-${i}`, word, kept: true });
        }
      });
      return {
        ...state,
        step: "step-a",
        rows: newRows,
        duplicates: newDuplicates,
        dedupeError: null,
      };
    }
    case "DEDUPE_ERROR":
      return {
        ...state,
        step: "step-a",
        dedupeError: action.error,
        rows: state.words.map((word, i) => ({
          id: `row-${i}`,
          word,
          kept: true,
        })),
      };
    case "TOGGLE_WORD":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.id ? { ...r, kept: !r.kept } : r,
        ),
      };
    case "EDIT_WORD":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.id ? { ...r, word: action.word } : r,
        ),
      };
    case "REMOVE_WORD":
      return {
        ...state,
        rows: state.rows.filter((r) => r.id !== action.id),
      };
    case "SELECT_ALL":
      return {
        ...state,
        rows: state.rows.map((r) => ({ ...r, kept: true })),
      };
    case "SELECT_NONE":
      return {
        ...state,
        rows: state.rows.map((r) => ({ ...r, kept: false })),
      };
    case "TRANSLATE_START": {
      const keptRows = state.rows.filter((r) => r.kept);
      return {
        ...state,
        step: "translating",
        translationRows: keptRows.map((r) => ({
          id: `tr-${r.id}`,
          word: r.word,
          nativeText: "",
          translationError: null,
        })),
      };
    }
    case "TRANSLATE_ALL_DONE":
      return {
        ...state,
        step: "step-b",
        translationRows: action.rows,
      };
    case "TRANSLATION_ROW_DONE":
      return {
        ...state,
        translationRows: state.translationRows.map((tr) =>
          tr.id === action.id
            ? { ...tr, nativeText: action.nativeText, translationError: null }
            : tr,
        ),
      };
    case "TRANSLATION_ROW_ERROR":
      return {
        ...state,
        translationRows: state.translationRows.map((tr) =>
          tr.id === action.id ? { ...tr, translationError: action.error } : tr,
        ),
      };
    case "EDIT_NATIVE":
      return {
        ...state,
        translationRows: state.translationRows.map((tr) =>
          tr.id === action.id
            ? { ...tr, nativeText: action.nativeText, translationError: null }
            : tr,
        ),
      };
    case "EDIT_TARGET":
      return {
        ...state,
        translationRows: state.translationRows.map((tr) =>
          tr.id === action.id
            ? { ...tr, word: action.word, translationError: null }
            : tr,
        ),
      };
    case "COMMIT_START":
      return { ...state, step: "committing", commitStep: "in-flight" };
    case "COMMIT_DONE":
      return {
        ...state,
        step: "success",
        commitStep: "done",
        addedCount: action.addedCount,
        failedCount: action.failedCount,
        skippedCount: action.skippedCount,
      };
    case "BACK_TO_STEP_A":
      return { ...state, step: "step-a" };
    default:
      return state;
  }
}

// ─── Orchestration helpers (exported for tests) ───────────────────────────────

export async function runTranslationFanOut(
  rows: TranslationRow[],
  targetLang: string,
  nativeLang: string,
): Promise<TranslationFanOutResult[]> {
  const results = await Promise.allSettled(
    rows.map((row) =>
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: row.word,
          sourceLang: targetLang,
          targetLang: nativeLang,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Translation failed");
        const data = TranslationResponseSchema.parse(await res.json());
        return data.translation;
      }),
    ),
  );

  return rows.map((row, i) => {
    const result = results[i];
    if (result?.status === "fulfilled") {
      return {
        id: row.id,
        nativeText: result.value,
        translationError: null,
      } satisfies TranslationFanOutResult;
    }
    return {
      id: row.id,
      nativeText: "",
      translationError: "Translation unavailable — enter manually.",
    } satisfies TranslationFanOutResult;
  });
}

export async function commitReviewRows(
  rows: TranslationRow[],
  deckId: string,
  duplicates: string[],
): Promise<CommitResult> {
  let addedCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    try {
      const outcome = await saveImageCards(deckId, [
        { front: row.nativeText.trim(), back: row.word.trim() },
      ]);
      // saveImageCards returns Array<{ok,error?}> but test mocks it returning {ok} directly
      // Handle both shapes for test compatibility
      const result = Array.isArray(outcome) ? outcome[0] : outcome;
      if (result?.ok) {
        addedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return {
    addedCount,
    failedCount,
    skippedCount: duplicates.length,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ReviewWordRowProps {
  row: ReviewRow;
  onToggle: (id: string) => void;
  onEdit: (id: string, word: string) => void;
  onRemove: (id: string) => void;
}

function ReviewWordRow({
  row,
  onToggle,
  onEdit,
  onRemove,
}: ReviewWordRowProps) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <input
        type="checkbox"
        checked={row.kept}
        onChange={() => onToggle(row.id)}
        className="size-4 shrink-0"
        aria-label={`Keep "${row.word}"`}
      />
      <Input
        value={row.word}
        onChange={(e) => onEdit(row.id, e.target.value)}
        className="flex-1 h-8"
        aria-label={`Edit word "${row.word}"`}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(row.id)}
        aria-label={`Remove "${row.word}"`}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

interface AlreadyLearnedRowProps {
  word: string;
}

function AlreadyLearnedRow({ word }: AlreadyLearnedRowProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-muted-foreground line-through">{word}</span>
      <span className="text-sm text-muted-foreground ml-auto">
        already learned
      </span>
    </div>
  );
}

interface ReviewTranslationRowProps {
  row: TranslationRow;
  index: number;
  isLoading: boolean;
  isDisabled: boolean;
  nativeLangLabel: string;
  targetLangLabel: string;
  onEditNative: (id: string, text: string) => void;
  onEditTarget: (id: string, word: string) => void;
}

function ReviewTranslationRow({
  row,
  index,
  isLoading,
  isDisabled,
  nativeLangLabel,
  targetLangLabel,
  onEditNative,
  onEditTarget,
}: ReviewTranslationRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`native-${index}`}>{nativeLangLabel}</Label>
          {isLoading ? (
            <div className="bg-muted animate-pulse rounded-md h-8 w-full" />
          ) : (
            <Input
              id={`native-${index}`}
              value={row.nativeText}
              onChange={(e) => onEditNative(row.id, e.target.value)}
              placeholder={`Type in ${nativeLangLabel}…`}
              className="h-8"
              disabled={isDisabled}
              aria-label={`Native translation for "${row.word}"`}
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`target-${index}`}>{targetLangLabel}</Label>
          <Input
            id={`target-${index}`}
            value={row.word}
            onChange={(e) => onEditTarget(row.id, e.target.value)}
            placeholder={`Type in ${targetLangLabel}…`}
            className="h-8"
            disabled={isDisabled}
            aria-label={`Target word for card ${index + 1}`}
          />
        </div>
      </div>
      {row.translationError && (
        <p className="text-sm text-destructive mt-1" role="alert">
          {row.translationError}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewList({
  words,
  deckId,
  nativeLang,
  targetLang,
  onCancel,
  nativeLangLabel = "English",
  targetLangLabel = "Target language",
}: ReviewListProps) {
  const router = useRouter();
  const cancelled = useRef(false);

  const initialState: ReviewState = {
    step: "loading-dedupe",
    words,
    rows: [],
    duplicates: [],
    dedupeError: null,
    translationRows: [],
    commitStep: null,
    addedCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };

  const [state, dispatch] = useReducer(reviewListReducer, initialState);

  // Dedupe on mount
  useEffect(() => {
    if (!deckId) return;

    getSameLanguageDeckBackWords(deckId)
      .then((knownWords) => {
        if (cancelled.current) return;
        dispatch({ type: "DEDUPE_DONE", knownWords });
      })
      .catch(() => {
        if (cancelled.current) return;
        dispatch({
          type: "DEDUPE_ERROR",
          error: "Could not load learned words.",
        });
      });
  }, [deckId]);

  function handleCancel() {
    cancelled.current = true;
    onCancel();
  }

  async function handleNext() {
    dispatch({ type: "TRANSLATE_START" });

    const keptRows = state.rows.filter((r) => r.kept);
    const translationRowsForFanOut: TranslationRow[] = keptRows.map((r) => ({
      id: `tr-${r.id}`,
      word: r.word,
      nativeText: "",
      translationError: null,
    }));

    const fanOutResults = await runTranslationFanOut(
      translationRowsForFanOut,
      targetLang,
      nativeLang,
    );

    if (cancelled.current) return;

    const completedRows: TranslationRow[] = translationRowsForFanOut.map(
      (row, i) => {
        const fanOut = fanOutResults[i];
        return {
          ...row,
          nativeText: fanOut?.nativeText ?? "",
          translationError: fanOut?.translationError ?? null,
        };
      },
    );

    dispatch({ type: "TRANSLATE_ALL_DONE", rows: completedRows });
  }

  async function handleCommit() {
    dispatch({ type: "COMMIT_START" });

    const result = await commitReviewRows(
      state.translationRows,
      deckId,
      state.duplicates,
    );

    if (cancelled.current) return;

    dispatch({
      type: "COMMIT_DONE",
      addedCount: result.addedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
    });
  }

  function handleGoToDeck() {
    router.push(`/dashboard?deck=${deckId}`);
  }

  const noWordsKept =
    state.rows.length === 0 || !state.rows.some((r) => r.kept);
  const keptCount = state.rows.filter((r) => r.kept).length;
  const plural = (n: number) => (n !== 1 ? "s" : "");

  // ─── Render: loading-dedupe ───────────────────────────────────────────────

  if (state.step === "loading-dedupe") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <Loader2
          className="size-4 animate-spin text-primary"
          aria-hidden="true"
        />
      </div>
    );
  }

  // ─── Render: translating ──────────────────────────────────────────────────

  if (state.step === "translating") {
    const n = keptCount;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            className="size-4 animate-spin text-primary"
            aria-hidden="true"
          />
          {`Translating ${n} word${plural(n)}…`}
        </div>
        <Button variant="ghost" className="w-full" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  // ─── Render: step-b ───────────────────────────────────────────────────────

  if (state.step === "step-b" || state.step === "committing") {
    const isCommitting = state.step === "committing";
    const n = state.translationRows.length;

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-foreground">
          Check translations
        </p>
        <p className="text-sm text-muted-foreground">
          Edit any translation before adding to your deck.
        </p>

        <div className="flex flex-col gap-4">
          {state.translationRows.map((row, i) => (
            <ReviewTranslationRow
              key={row.id}
              row={row}
              index={i}
              isLoading={false}
              isDisabled={isCommitting}
              nativeLangLabel={nativeLangLabel}
              targetLangLabel={targetLangLabel}
              onEditNative={(id, text) =>
                dispatch({ type: "EDIT_NATIVE", id, nativeText: text })
              }
              onEditTarget={(id, word) =>
                dispatch({ type: "EDIT_TARGET", id, word })
              }
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {isCommitting ? (
            <>
              <Button
                variant="default"
                className="w-full h-11"
                disabled
                aria-busy="true"
                aria-label="Adding cards, please wait"
              >
                <Loader2
                  className="size-4 animate-spin mr-2"
                  aria-hidden="true"
                />
                Adding cards…
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {`Adding ${n} card${plural(n)} to your deck…`}
              </p>
            </>
          ) : (
            <>
              <Button
                variant="default"
                className="w-full h-11"
                onClick={handleCommit}
              >
                {`Add ${n} card${plural(n)}`}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => dispatch({ type: "BACK_TO_STEP_A" })}
                >
                  ← Back
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: success ──────────────────────────────────────────────────────

  if (state.step === "success") {
    const { addedCount, failedCount, skippedCount } = state;
    const allFailed = addedCount === 0 && failedCount > 0;

    const secondaryParts = [
      skippedCount > 0 ? `${skippedCount} already learned (skipped)` : null,
      failedCount > 0 ? `${failedCount} failed` : null,
    ].filter((p): p is string => p !== null);

    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <CheckCircle2 className="size-8 text-green-600" aria-hidden="true" />
        <div>
          {allFailed ? (
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t add cards — please try again.
            </p>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {`${addedCount} card${plural(addedCount)} added to your deck.`}
            </p>
          )}
          {secondaryParts.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {secondaryParts.join(" · ")}
            </p>
          )}
        </div>
        {allFailed ? (
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleGoToDeck}
          >
            Back to deck
          </Button>
        ) : (
          <Button
            variant="default"
            className="w-full h-11"
            onClick={handleGoToDeck}
          >
            Go to my deck
          </Button>
        )}
      </div>
    );
  }

  // ─── Render: step-a (default) ─────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-foreground">
        Review extracted words
      </p>
      <p className="text-sm text-muted-foreground">
        Uncheck or remove words you don&apos;t want to add.
      </p>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="text-sm"
          onClick={() => dispatch({ type: "SELECT_ALL" })}
        >
          Select all
        </Button>
        <Button
          variant="ghost"
          className="text-sm"
          onClick={() => dispatch({ type: "SELECT_NONE" })}
        >
          Select none
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {state.rows.map((row) => (
          <ReviewWordRow
            key={row.id}
            row={row}
            onToggle={(id) => dispatch({ type: "TOGGLE_WORD", id })}
            onEdit={(id, word) => dispatch({ type: "EDIT_WORD", id, word })}
            onRemove={(id) => dispatch({ type: "REMOVE_WORD", id })}
          />
        ))}
      </div>

      {state.duplicates.length > 0 && (
        <div className="mt-2 pt-4 border-t border-border flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Already learned
          </p>
          {state.duplicates.map((word) => (
            <AlreadyLearnedRow key={word} word={word} />
          ))}
        </div>
      )}

      {state.dedupeError && (
        <p className="text-sm text-destructive mt-1" role="alert">
          {state.dedupeError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          className="w-full h-11"
          disabled={noWordsKept}
          onClick={handleNext}
        >
          Next: translate
        </Button>
        {noWordsKept && (
          <p className="text-sm text-muted-foreground text-center">
            Keep at least one word to continue.
          </p>
        )}
        <Button variant="ghost" className="w-full" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
