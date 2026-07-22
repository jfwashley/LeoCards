// @vitest-environment jsdom
/**
 * Rendered-component tests for the WR-01 fix in review-list.tsx.
 *
 * saveImageCards (PERF-08) is all-or-nothing: a single row with an empty
 * nativeText (an un-fixed "Translation unavailable" row, or one the user
 * manually cleared) previously aborted the WHOLE commit, including every
 * correctly-translated card, with no client-side guard against it. These
 * tests mount <ReviewList> for real (Phase 22 lesson: reducer-only tests
 * pass on a dead UI) and drive it through Step A -> Step B -> commit.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewList } from "@/components/review-list";

const { mockGetSameLanguageDeckBackWords, mockSaveImageCards, mockPush } =
  vi.hoisted(() => ({
    mockGetSameLanguageDeckBackWords: vi.fn(),
    mockSaveImageCards: vi.fn(),
    mockPush: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/deck-actions", () => ({
  getSameLanguageDeckBackWords: mockGetSameLanguageDeckBackWords,
  saveImageCards: mockSaveImageCards,
}));

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSameLanguageDeckBackWords.mockResolvedValue(new Set());
  global.fetch = vi.fn();
});

function renderList() {
  return render(
    <ReviewList
      words={["chien", "chat"]}
      deckId="deck-1"
      nativeLang="en"
      targetLang="fr"
      onCancel={vi.fn()}
    />,
  );
}

describe("WR-01: empty-translation rows block the all-or-nothing commit instead of failing the whole batch", () => {
  it("disables 'Add N cards' and shows guidance while any kept row's translation is empty", async () => {
    // The DeepL batch response is shorter than the row count — row 2 falls
    // back to the empty-nativeText placeholder (runTranslationFanOut).
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ translations: ["dog"] }),
    });

    renderList();

    const translateBtn = await screen.findByRole("button", {
      name: /translate 2 words/i,
    });
    fireEvent.click(translateBtn);

    const commitBtn = (await screen.findByRole("button", {
      name: /add 2 cards/i,
    })) as HTMLButtonElement;
    expect(commitBtn.disabled).toBe(true);
    expect(
      screen.getByText(/fill in every translation before adding/i),
    ).toBeTruthy();

    fireEvent.click(commitBtn);
    expect(mockSaveImageCards).not.toHaveBeenCalled();
  });

  it("filling in the empty translation re-enables commit and saves EVERY row, not just the valid one", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ translations: ["dog"] }),
    });
    mockSaveImageCards.mockResolvedValue([{ ok: true }, { ok: true }]);

    renderList();

    const translateBtn = await screen.findByRole("button", {
      name: /translate 2 words/i,
    });
    fireEvent.click(translateBtn);

    await screen.findByRole("button", { name: /add 2 cards/i });

    // 2 rows x 2 inputs each (target, native) — row 2's native input is
    // index 3 and starts empty (the fallback placeholder).
    const textboxes = screen.getAllByRole("textbox") as HTMLInputElement[];
    const secondRowNative = textboxes[3];
    expect(secondRowNative).toBeDefined();
    expect(secondRowNative?.value).toBe("");
    if (secondRowNative) {
      fireEvent.change(secondRowNative, { target: { value: "cat" } });
    }

    const commitBtn = screen.getByRole("button", {
      name: /add 2 cards/i,
    }) as HTMLButtonElement;
    expect(commitBtn.disabled).toBe(false);
    fireEvent.click(commitBtn);

    await waitFor(() => expect(mockSaveImageCards).toHaveBeenCalledTimes(1));
    expect(mockSaveImageCards).toHaveBeenCalledWith("deck-1", [
      { front: "dog", back: "chien" },
      { front: "cat", back: "chat" },
    ]);
  });
});
