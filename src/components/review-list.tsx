"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import * as z from "zod/mini";
import { ACBanner } from "@/components/daybreak/ac-banner";
import { ACBtn } from "@/components/daybreak/ac-btn";
import { ACPairRow } from "@/components/daybreak/ac-pair-row";
import { ACProgress } from "@/components/daybreak/ac-progress";
import { ACReviewRow } from "@/components/daybreak/ac-review-row";
import { ACStepper } from "@/components/daybreak/ac-stepper";
import { LionFace } from "@/components/daybreak/lion-face";
import {
  getSameLanguageDeckBackWords,
  saveImageCards,
} from "@/lib/deck-actions";

// PERF-09: batched array-mode response shape for runTranslationFanOut's
// single fetch (order-preserved, zipped back onto rows by index). Re-declared
// locally per Pitfall 4 — do NOT import from translation-form.tsx.
const BatchTranslationResponseSchema = z.object({
  translations: z.array(z.string()),
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

// D-05: extraction already caps at 50 words (src/app/api/extract/route.ts),
// within DeepL's 50-texts-per-request limit — a single batch always
// suffices, no chunking logic needed here.
async function attemptTranslationBatch(
  requestBody: string,
): Promise<string[] | null> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });
    if (!res.ok) return null;
    const data = BatchTranslationResponseSchema.parse(await res.json());
    return data.translations;
  } catch {
    return null;
  }
}

export async function runTranslationFanOut(
  rows: TranslationRow[],
  targetLang: string,
  nativeLang: string,
): Promise<TranslationFanOutResult[]> {
  // PERF-23: client-side dedupe — collapse duplicate words into a single
  // entry so the same text is never sent to /api/translate twice within
  // one batch (complements the server-side LRU, which dedupes ACROSS
  // requests/users; this dedupes WITHIN a single fan-out).
  const uniqueWords: string[] = [];
  const seenWords = new Set<string>();
  for (const row of rows) {
    if (!seenWords.has(row.word)) {
      seenWords.add(row.word);
      uniqueWords.push(row.word);
    }
  }

  const requestBody = JSON.stringify({
    texts: uniqueWords,
    sourceLang: targetLang,
    targetLang: nativeLang,
  });

  // D-03/D-04: ONE batched request; on failure, exactly ONE automatic retry
  // of the whole batch; if the retry also fails, every row falls back to
  // the existing per-word placeholder (zero new UI).
  const translations =
    (await attemptTranslationBatch(requestBody)) ??
    (await attemptTranslationBatch(requestBody));

  // Map each unique word to its translation (DeepL preserves input order,
  // so index-zipping against uniqueWords is safe), then look each row's
  // translation up by word — this is what lets a duplicate row share its
  // sibling's result without a second request.
  const translationByWord = new Map<string, string>();
  if (translations) {
    uniqueWords.forEach((word, i) => {
      const translated = translations[i];
      if (translated !== undefined) translationByWord.set(word, translated);
    });
  }

  return rows.map((row) => {
    const translation = translationByWord.get(row.word);
    if (translation !== undefined) {
      return {
        id: row.id,
        nativeText: translation,
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
  // PERF-08: one saveImageCards call carrying the whole array — auth +
  // ownership checked once per commit, not once per card. The insert is
  // now atomic, so outcomes are all-or-nothing.
  try {
    const outcomes = await saveImageCards(
      deckId,
      rows.map((row) => ({
        front: row.nativeText.trim(),
        back: row.word.trim(),
      })),
    );

    return {
      addedCount: outcomes.filter((o) => o.ok).length,
      failedCount: outcomes.filter((o) => !o.ok).length,
      skippedCount: duplicates.length,
    };
  } catch {
    return {
      addedCount: 0,
      failedCount: rows.length,
      skippedCount: duplicates.length,
    };
  }
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

  // IN-04: lazy initializer avoids reallocating the initial-state object
  // on every render (useReducer only consumes it on the first render).
  const [state, dispatch] = useReducer(
    reviewListReducer,
    words,
    (initialWords): ReviewState => ({
      step: "loading-dedupe",
      words: initialWords,
      rows: [],
      duplicates: [],
      dedupeError: null,
      translationRows: [],
      commitStep: null,
      addedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    }),
  );

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

    try {
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
    } catch {
      // Roll back to step-a so the UI can recover if anything unexpected throws (WR-02)
      if (cancelled.current) return;
      dispatch({ type: "BACK_TO_STEP_A" });
    }
  }

  async function handleCommit() {
    dispatch({ type: "COMMIT_START" });

    try {
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
    } catch {
      // Dispatch a failed-commit result so the UI can recover (WR-02)
      if (cancelled.current) return;
      dispatch({
        type: "COMMIT_DONE",
        addedCount: 0,
        failedCount: state.translationRows.length,
        skippedCount: state.duplicates.length,
      });
    }
  }

  function handleGoToDeck() {
    router.push(`/dashboard?deck=${deckId}`);
  }

  const noWordsKept =
    state.rows.length === 0 || !state.rows.some((r) => r.kept);
  const keptCount = state.rows.filter((r) => r.kept).length;
  const plural = (n: number) => (n !== 1 ? "s" : "");
  // WR-01: saveImageCards is all-or-nothing (PERF-08) — a single empty
  // nativeText (an un-fixed "Translation unavailable" row, or a row the
  // user manually cleared) would abort the ENTIRE batch, including every
  // correctly-translated card. Mirror the step-a noWordsKept guard: block
  // the commit until every kept row has a non-empty translation.
  const hasEmptyTranslation = state.translationRows.some(
    (r) => r.nativeText.trim() === "",
  );

  // ─── Render: loading-dedupe ───────────────────────────────────────────────

  if (state.step === "loading-dedupe") {
    return (
      <ACProgress
        title="Loading…"
        sub="Checking your deck for duplicates."
        searching={false}
      />
    );
  }

  // ─── Render: translating ──────────────────────────────────────────────────

  if (state.step === "translating") {
    const n = keptCount;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <ACStepper current={3} />
        <ACProgress
          title={`Translating ${n} word${plural(n)}…`}
          sub="Almost there. You'll be able to check and fix each one."
          searching={false}
        />
        <ACBtn kind="ghost" style={{ height: 46 }} onClick={handleCancel}>
          Cancel
        </ACBtn>
      </div>
    );
  }

  // ─── Render: step-b (Check translations + committing) ────────────────────

  if (state.step === "step-b" || state.step === "committing") {
    const isCommitting = state.step === "committing";
    const n = state.translationRows.length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ACStepper current={3} />

        {/* Check translations heading — Baloo 2 display style */}
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 700,
            color: "#4A331C",
          }}
        >
          Check translations
        </span>

        <p style={{ fontSize: 14, color: "#9C8467", margin: 0 }}>
          Edit any translation before adding to your deck.
        </p>

        {/* ACPairRow per translation row — D-01: target (ES) on top, native (EN) below */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {state.translationRows.map((row, i) => (
            <ACPairRow
              key={row.id}
              targetLabel={targetLangLabel}
              nativeLabel={nativeLangLabel}
              target={row.word}
              native={row.nativeText}
              failed={
                row.translationError !== null || row.nativeText.trim() === ""
              }
              last={i === state.translationRows.length - 1}
              onEditTarget={(v) =>
                dispatch({ type: "EDIT_TARGET", id: row.id, word: v })
              }
              onEditNative={(v) =>
                dispatch({ type: "EDIT_NATIVE", id: row.id, nativeText: v })
              }
            />
          ))}
        </div>

        {/* Commit button / committing state */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isCommitting ? (
            <ACBtn kind="disabled" aria-busy="true">
              Adding {n} card{plural(n)}…
            </ACBtn>
          ) : (
            <>
              <ACBtn
                kind={hasEmptyTranslation ? "disabled" : "primary"}
                disabled={hasEmptyTranslation}
                onClick={hasEmptyTranslation ? undefined : handleCommit}
              >
                Add {n} card{plural(n)}
              </ACBtn>
              {hasEmptyTranslation && (
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#9C8467",
                    textAlign: "center",
                    margin: 0,
                  }}
                >
                  Fill in every translation before adding.
                </p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <ACBtn
                  kind="ghost"
                  style={{ height: 46, flex: 1 }}
                  onClick={() => dispatch({ type: "BACK_TO_STEP_A" })}
                >
                  Back
                </ACBtn>
                <ACBtn
                  kind="ghost"
                  style={{ height: 46, flex: 1 }}
                  onClick={handleCancel}
                >
                  Cancel
                </ACBtn>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: success (Result states — D-05: under the "Add" dot) ──────────

  if (state.step === "success") {
    const { addedCount, failedCount, skippedCount } = state;
    const allFailed = addedCount === 0 && failedCount > 0;
    const isPartial = failedCount > 0 && addedCount > 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* D-05: Result lives under the "Add" stepper dot */}
        <ACStepper current={4} />

        {allFailed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ACBanner kind="error">
              {"Couldn't add cards — please try again."}
            </ACBanner>
            <ACBtn
              kind="primary"
              onClick={() => dispatch({ type: "BACK_TO_STEP_A" })}
            >
              Try again
            </ACBtn>
            <ACBtn kind="ghost" style={{ height: 46 }} onClick={handleGoToDeck}>
              Back to deck
            </ACBtn>
          </div>
        )}

        {isPartial && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Partial result counts card */}
            <div
              style={{
                borderRadius: 22,
                background: "#FFFFFF",
                border: "1px solid #F0E3CF",
                boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Added row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 15,
                  color: "#4A331C",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#3E9B5F",
                    color: "#FFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  ✓
                </span>
                <span style={{ flex: 1 }}>Added</span>
                <span style={{ fontWeight: 700 }}>{addedCount}</span>
              </div>
              {/* Already learned row */}
              {skippedCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 15,
                    color: "#9C8467",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "1.5px solid #D8C7AC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flex: "none",
                      color: "#9C8467",
                    }}
                  >
                    -
                  </span>
                  <span style={{ flex: 1 }}>Already learned</span>
                  <span style={{ fontWeight: 700 }}>{skippedCount}</span>
                </div>
              )}
              {/* Couldn't add row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 15,
                  color: "#4A331C",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#DE5F4A",
                    color: "#FFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  !
                </span>
                <span style={{ flex: 1 }}>{"Couldn't add"}</span>
                <span style={{ fontWeight: 700 }}>{failedCount}</span>
              </div>
            </div>
            <ACBtn kind="primary" onClick={handleGoToDeck}>
              Go to my deck
            </ACBtn>
          </div>
        )}

        {!allFailed && !isPartial && (
          /* Full success: LionFace disc + "N cards added!" + "Go to my deck" — L-01, D-05 */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              textAlign: "center",
            }}
          >
            {/* Sunrise disc with LionFace (no emoji, L-01) */}
            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: "50%",
                background: "linear-gradient(180deg, #FFE7BC, #FFFDF8)",
                border: "1px solid #F0E3CF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <LionFace
                size={72}
                mane="#E8973B"
                face="#FFD9A6"
                muzzle="#FFF1DC"
                ink="#4A331C"
              />
            </div>
            {/* N cards added! — Baloo 2 display heading */}
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 700,
                color: "#4A331C",
              }}
            >
              {addedCount} card{plural(addedCount)} added!
            </span>
            <ACBtn kind="primary" onClick={handleGoToDeck}>
              Go to my deck
            </ACBtn>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: step-a (Review words — default) ──────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ACStepper current={2} />

      {/* Select all / Select none — link-style controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => dispatch({ type: "SELECT_ALL" })}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: "#C96F12",
            cursor: "pointer",
          }}
        >
          Select all
        </button>
        <span style={{ color: "#D8C7AC", fontSize: 13 }}>·</span>
        <button
          type="button"
          onClick={() => dispatch({ type: "SELECT_NONE" })}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: "#C96F12",
            cursor: "pointer",
          }}
        >
          Select none
        </button>
      </div>

      {/* Word rows — ACReviewRow per kept word */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {state.rows.map((row, i) => (
          <ACReviewRow
            key={row.id}
            word={row.word}
            excluded={!row.kept}
            last={i === state.rows.length - 1 && state.duplicates.length === 0}
            onToggle={() => dispatch({ type: "TOGGLE_WORD", id: row.id })}
            onEdit={(newWord) =>
              dispatch({
                type: "EDIT_WORD",
                id: row.id,
                word: newWord,
              })
            }
            onRemove={() => dispatch({ type: "REMOVE_WORD", id: row.id })}
          />
        ))}
      </div>

      {/* Duplicates — "Already in your deck · skipped" struck-through muted chips */}
      {state.duplicates.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 12,
            borderTop: "1px solid #F4ECDD",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9C8467" }}>
            Already in your deck
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {state.duplicates.map((word) => (
              <span
                key={word}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#FFF1DC",
                  border: "1px solid #EDDFC9",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#9C8467",
                  textDecoration: "line-through",
                }}
              >
                {word}
                <span style={{ textDecoration: "none", fontSize: 11 }}>
                  skipped
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {state.dedupeError && (
        <ACBanner kind="error">{state.dedupeError}</ACBanner>
      )}

      {/* Translate N words primary button + keep-at-least-one guard */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ACBtn
          kind={noWordsKept ? "disabled" : "primary"}
          disabled={noWordsKept}
          onClick={noWordsKept ? undefined : handleNext}
        >
          Translate {keptCount} word{plural(keptCount)}
        </ACBtn>
        {noWordsKept && (
          <p
            style={{
              fontSize: 13.5,
              color: "#9C8467",
              textAlign: "center",
              margin: 0,
            }}
          >
            Keep at least one word to continue.
          </p>
        )}
        <ACBtn kind="ghost" style={{ height: 46 }} onClick={handleCancel}>
          Cancel
        </ACBtn>
      </div>
    </div>
  );
}
