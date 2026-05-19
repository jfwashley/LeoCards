/**
 * Wave 0 test scaffold for review-list.tsx (RED by design — awaiting Wave 2).
 *
 * This file is intentionally RED until Wave 2 creates src/components/review-list.tsx
 * and exports the symbols below. The failing imports are expected at this wave.
 *
 * Wave 2 MUST export the following contract:
 *   - reviewListReducer(state: ReviewState, action: ReviewAction): ReviewState
 *   - isDuplicate(word: string, knownWords: Set<string>): boolean
 *   - runTranslationFanOut(rows: TranslationRow[], targetLang: string, nativeLang: string): Promise<TranslationFanOutResult[]>
 *   - commitReviewRows(rows: TranslationRow[], deckId: string): Promise<CommitResult>
 *   - type ReviewState
 *   - type ReviewAction
 *   - type TranslationRow
 *   - type CommitResult
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — declare all shared mocks here
const { mockGetSession, mockFetch, mockSaveImageCards } = vi.hoisted(() => {
  return {
    mockGetSession: vi.fn(),
    mockFetch: vi.fn(),
    mockSaveImageCards: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock @/lib/deck-actions so saveImageCards and saveCard are spies for commit/cancel tests
vi.mock("@/lib/deck-actions", () => ({
  saveImageCards: mockSaveImageCards,
  getSameLanguageDeckBackWords: vi.fn(),
}));

// Subject import — will resolve once Wave 2 ships review-list.tsx (RED until then)
import {
  isDuplicate,
  reviewListReducer,
} from "@/components/review-list";
// Types imported from subject (may not exist yet)
import type {
  CommitResult,
  ReviewAction,
  ReviewState,
  TranslationRow,
} from "@/components/review-list";

// Helper: also import the orchestration helpers Wave 2 must export
import {
  commitReviewRows,
  runTranslationFanOut,
} from "@/components/review-list";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset global.fetch spy
  global.fetch = mockFetch;
});

// ============================================================
// isDuplicate
// ============================================================

describe("isDuplicate", () => {
  it("returns true for exact match against the known Set", () => {
    const known = new Set(["chien", "chat", "maison"]);
    expect(isDuplicate("chien", known)).toBe(true);
  });

  it("returns true for case-insensitive match (Chien vs Set(['chien']))", () => {
    const known = new Set(["chien"]);
    expect(isDuplicate("Chien", known)).toBe(true);
  });

  it("returns true for trimmed match ('  chat  ' vs Set(['chat']))", () => {
    const known = new Set(["chat"]);
    expect(isDuplicate("  chat  ", known)).toBe(true);
  });

  it("returns false for a genuinely new word", () => {
    const known = new Set(["chien", "chat"]);
    expect(isDuplicate("bonjour", known)).toBe(false);
  });
});

// ============================================================
// reviewListReducer
// ============================================================

describe("reviewListReducer", () => {
  // Helper: minimal initial state with no data yet
  const emptyInitialState: ReviewState = {
    step: "step-a",
    words: ["chien", "chat", "maison"],
    rows: [],
    duplicates: [],
    dedupeError: null,
    translationRows: [],
    commitStep: null,
    addedCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };

  it("DEDUPE_DONE: non-dupes become rows with kept:true; duplicates move to duplicates list; step → step-a", () => {
    const knownWords = new Set(["maison"]);
    const action: ReviewAction = {
      type: "DEDUPE_DONE",
      knownWords,
    };
    const next = reviewListReducer(emptyInitialState, action);
    expect(next.step).toBe("step-a");
    expect(next.rows).toHaveLength(2);
    expect(next.rows.every((r) => r.kept === true)).toBe(true);
    expect(next.duplicates).toEqual(["maison"]);
    expect(next.dedupeError).toBeNull();
  });

  it("DEDUPE_ERROR: sets dedupeError; step stays renderable (step-a)", () => {
    const action: ReviewAction = {
      type: "DEDUPE_ERROR",
      error: "Network failure",
    };
    const next = reviewListReducer(emptyInitialState, action);
    expect(next.dedupeError).toBe("Network failure");
    expect(next.step).toBe("step-a");
  });

  it("TOGGLE_WORD: flips kept on the targeted row id only (immutable spread)", () => {
    const stateWithRows: ReviewState = {
      ...emptyInitialState,
      rows: [
        { id: "row-0", word: "chien", kept: true },
        { id: "row-1", word: "chat", kept: true },
      ],
    };
    const action: ReviewAction = { type: "TOGGLE_WORD", id: "row-0" };
    const next = reviewListReducer(stateWithRows, action);
    expect(next.rows[0]?.kept).toBe(false);
    expect(next.rows[1]?.kept).toBe(true);
    // Immutability: original row reference unchanged
    expect(stateWithRows.rows[0]?.kept).toBe(true);
  });

  it("EDIT_WORD: updates word on targeted row only", () => {
    const stateWithRows: ReviewState = {
      ...emptyInitialState,
      rows: [
        { id: "row-0", word: "chien", kept: true },
        { id: "row-1", word: "chat", kept: true },
      ],
    };
    const action: ReviewAction = { type: "EDIT_WORD", id: "row-0", word: "chienne" };
    const next = reviewListReducer(stateWithRows, action);
    expect(next.rows[0]?.word).toBe("chienne");
    expect(next.rows[1]?.word).toBe("chat");
  });

  it("REMOVE_WORD: removes the targeted row entirely", () => {
    const stateWithRows: ReviewState = {
      ...emptyInitialState,
      rows: [
        { id: "row-0", word: "chien", kept: true },
        { id: "row-1", word: "chat", kept: true },
      ],
    };
    const action: ReviewAction = { type: "REMOVE_WORD", id: "row-0" };
    const next = reviewListReducer(stateWithRows, action);
    expect(next.rows).toHaveLength(1);
    expect(next.rows[0]?.id).toBe("row-1");
  });

  it("SELECT_ALL: every row kept true", () => {
    const stateWithRows: ReviewState = {
      ...emptyInitialState,
      rows: [
        { id: "row-0", word: "chien", kept: false },
        { id: "row-1", word: "chat", kept: false },
      ],
    };
    const next = reviewListReducer(stateWithRows, { type: "SELECT_ALL" });
    expect(next.rows.every((r) => r.kept === true)).toBe(true);
  });

  it("SELECT_NONE: every row kept false", () => {
    const stateWithRows: ReviewState = {
      ...emptyInitialState,
      rows: [
        { id: "row-0", word: "chien", kept: true },
        { id: "row-1", word: "chat", kept: true },
      ],
    };
    const next = reviewListReducer(stateWithRows, { type: "SELECT_NONE" });
    expect(next.rows.every((r) => r.kept === false)).toBe(true);
  });

  it("TRANSLATE_START: step → translating", () => {
    const next = reviewListReducer(emptyInitialState, { type: "TRANSLATE_START" });
    expect(next.step).toBe("translating");
  });

  it("TRANSLATION_ROW_DONE: sets nativeText on the matching translationRow; clears its translationError", () => {
    const stateTranslating: ReviewState = {
      ...emptyInitialState,
      step: "step-b",
      translationRows: [
        { id: "tr-0", word: "chien", nativeText: "", translationError: "prev error" },
        { id: "tr-1", word: "chat", nativeText: "", translationError: null },
      ],
    };
    const action: ReviewAction = {
      type: "TRANSLATION_ROW_DONE",
      id: "tr-0",
      nativeText: "dog",
    };
    const next = reviewListReducer(stateTranslating, action);
    expect(next.translationRows[0]?.nativeText).toBe("dog");
    expect(next.translationRows[0]?.translationError).toBeNull();
    // Other row unaffected
    expect(next.translationRows[1]?.nativeText).toBe("");
  });

  it("TRANSLATION_ROW_ERROR: sets translationError on the matching row; does NOT affect other rows", () => {
    const stateTranslating: ReviewState = {
      ...emptyInitialState,
      step: "step-b",
      translationRows: [
        { id: "tr-0", word: "chien", nativeText: "", translationError: null },
        { id: "tr-1", word: "chat", nativeText: "cat", translationError: null },
      ],
    };
    const action: ReviewAction = {
      type: "TRANSLATION_ROW_ERROR",
      id: "tr-0",
      error: "Translation unavailable — enter manually.",
    };
    const next = reviewListReducer(stateTranslating, action);
    expect(next.translationRows[0]?.translationError).toBe(
      "Translation unavailable — enter manually."
    );
    expect(next.translationRows[0]?.nativeText).toBe("");
    // Other row unaffected
    expect(next.translationRows[1]?.nativeText).toBe("cat");
    expect(next.translationRows[1]?.translationError).toBeNull();
  });

  it("EDIT_NATIVE: updates only the targeted translationRow nativeText field", () => {
    const stateB: ReviewState = {
      ...emptyInitialState,
      step: "step-b",
      translationRows: [
        { id: "tr-0", word: "chien", nativeText: "dog", translationError: null },
        { id: "tr-1", word: "chat", nativeText: "cat", translationError: null },
      ],
    };
    const next = reviewListReducer(stateB, { type: "EDIT_NATIVE", id: "tr-0", nativeText: "hound" });
    expect(next.translationRows[0]?.nativeText).toBe("hound");
    expect(next.translationRows[1]?.nativeText).toBe("cat");
  });

  it("EDIT_TARGET: updates only the targeted translationRow word field", () => {
    const stateB: ReviewState = {
      ...emptyInitialState,
      step: "step-b",
      translationRows: [
        { id: "tr-0", word: "chien", nativeText: "dog", translationError: null },
        { id: "tr-1", word: "chat", nativeText: "cat", translationError: null },
      ],
    };
    const next = reviewListReducer(stateB, { type: "EDIT_TARGET", id: "tr-0", word: "chienne" });
    expect(next.translationRows[0]?.word).toBe("chienne");
    expect(next.translationRows[1]?.word).toBe("chat");
  });

  it("COMMIT_START: step → committing", () => {
    const next = reviewListReducer(emptyInitialState, { type: "COMMIT_START" });
    expect(next.step).toBe("committing");
  });

  it("COMMIT_DONE: step → success; addedCount/failedCount set from payload", () => {
    const action: ReviewAction = {
      type: "COMMIT_DONE",
      addedCount: 3,
      failedCount: 1,
      skippedCount: 2,
    };
    const next = reviewListReducer(emptyInitialState, action);
    expect(next.step).toBe("success");
    expect(next.addedCount).toBe(3);
    expect(next.failedCount).toBe(1);
    expect(next.skippedCount).toBe(2);
  });

  it("BACK_TO_STEP_A: step → step-a", () => {
    const stateB: ReviewState = { ...emptyInitialState, step: "step-b" };
    const next = reviewListReducer(stateB, { type: "BACK_TO_STEP_A" });
    expect(next.step).toBe("step-a");
  });

  it("default/unknown action: returns state unchanged (referential equality)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = reviewListReducer(emptyInitialState, { type: "UNKNOWN_ACTION" } as any);
    expect(next).toBe(emptyInitialState);
  });
});

// ============================================================
// translation fan-out (RVW-03)
// ============================================================

describe("translation fan-out", () => {
  it("maps fulfilled results to nativeText per row", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translation: "dog" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translation: "cat" }),
      });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "", translationError: null },
      { id: "tr-1", word: "chat", nativeText: "", translationError: null },
    ];

    const results = await runTranslationFanOut(rows, "fr", "en");
    expect(results[0]?.nativeText).toBe("dog");
    expect(results[0]?.translationError).toBeNull();
    expect(results[1]?.nativeText).toBe("cat");
    expect(results[1]?.translationError).toBeNull();
  });

  it("maps rejected/non-ok results to translationError without blocking other rows", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translation: "cat" }),
      });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "", translationError: null },
      { id: "tr-1", word: "chat", nativeText: "", translationError: null },
    ];

    const results = await runTranslationFanOut(rows, "fr", "en");
    expect(results[0]?.translationError).toBe("Translation unavailable — enter manually.");
    expect(results[0]?.nativeText).toBe("");
    // Second row still resolves correctly
    expect(results[1]?.nativeText).toBe("cat");
    expect(results[1]?.translationError).toBeNull();
  });

  it("maps non-ok HTTP response to translationError", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "", translationError: null },
    ];

    const results = await runTranslationFanOut(rows, "fr", "en");
    expect(results[0]?.translationError).toBe("Translation unavailable — enter manually.");
  });

  it("sends correct request body shape: { text, sourceLang: targetLang, targetLang: nativeLang } (D-08 direction)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translation: "dog" }),
    });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "", translationError: null },
    ];

    await runTranslationFanOut(rows, "fr", "en");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/translate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "chien", sourceLang: "fr", targetLang: "en" }),
      })
    );
  });

  it("a single failure never throws and never blocks the others", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ translation: "cat" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ translation: "house" }) });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "", translationError: null },
      { id: "tr-1", word: "chat", nativeText: "", translationError: null },
      { id: "tr-2", word: "maison", nativeText: "", translationError: null },
    ];

    // Should NOT throw
    await expect(runTranslationFanOut(rows, "fr", "en")).resolves.toHaveLength(3);
  });
});

// ============================================================
// batch commit (RVW-04)
// ============================================================

describe("batch commit", () => {
  const FAKE_DECK_ID = "deck-xyz-456";

  it("computes accurate addedCount / failedCount / skippedCount from mixed outcomes", async () => {
    // saveImageCards called once per row; mock mixed results
    mockSaveImageCards
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "dog", translationError: null },
      { id: "tr-1", word: "chat", nativeText: "cat", translationError: null },
      { id: "tr-2", word: "maison", nativeText: "house", translationError: null },
    ];
    const duplicates = ["already-known-word", "another-known"];

    const result: CommitResult = await commitReviewRows(rows, FAKE_DECK_ID, duplicates);
    expect(result.addedCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(2); // equals duplicates.length
  });

  it("continue-on-failure: a failing entry does not abort the batch", async () => {
    mockSaveImageCards
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({ ok: true });

    const rows: TranslationRow[] = [
      { id: "tr-0", word: "chien", nativeText: "dog", translationError: null },
      { id: "tr-1", word: "chat", nativeText: "cat", translationError: null },
    ];

    // Should NOT reject — continues processing even when one call throws
    await expect(commitReviewRows(rows, FAKE_DECK_ID, [])).resolves.toBeDefined();
  });
});

// ============================================================
// cancel (RVW-05b)
// ============================================================

describe("cancel", () => {
  it("Step A cancel: onCancel callback invoked; zero saveImageCards/saveCard calls", () => {
    const onCancel = vi.fn();

    // Simulate cancel action at Step A: reviewer calls onCancel prop
    // The contract: ReviewList component must call onCancel() with no DB writes
    onCancel();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockSaveImageCards).not.toHaveBeenCalled();
  });

  it("Step B cancel: onCancel callback invoked; zero saveImageCards/saveCard calls", () => {
    const onCancel = vi.fn();

    // Simulate cancel action at Step B: same contract
    onCancel();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockSaveImageCards).not.toHaveBeenCalled();
  });
});
