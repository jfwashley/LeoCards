// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardEditDialog, type CardRow } from "@/components/card-edit-dialog";

// Mock deck-actions so we control editCard/deleteCard behavior
vi.mock("@/lib/deck-actions", () => ({
  editCard: vi.fn(async () => undefined),
  deleteCard: vi.fn(async () => undefined),
}));

afterEach(() => cleanup());

// Import after mock so we can inspect calls
import { editCard, deleteCard } from "@/lib/deck-actions";

// Fixture card
const FIXTURE_CARD: CardRow = {
  id: "card-test-1",
  front: "Hello",
  back: "Bonjour",
  source: "wordlist",
  createdAt: new Date("2024-01-01"),
  masteryRound: 1,
  pausedAt: null,
  cooldownUntil: null,
};

function renderDialog(card = FIXTURE_CARD, open = true) {
  const onOpenChange = vi.fn();
  render(
    <CardEditDialog card={card} open={open} onOpenChange={onOpenChange} />,
  );
  return { onOpenChange };
}

// -----------------------------------------------------------------------
// Test 1: Renders TField inputs with card values
// -----------------------------------------------------------------------
describe("CardEditDialog — TField inputs", () => {
  it("renders 'Native word' and 'Target word' labels with the card's front/back values", () => {
    renderDialog();

    // TField renders labeled inputs — check labels are present
    expect(screen.getByText("Native word")).toBeTruthy();
    expect(screen.getByText("Target word")).toBeTruthy();

    // Check input values via label association (TField derives id from label text)
    const nativeInput = document.getElementById("native-word") as HTMLInputElement;
    const targetInput = document.getElementById("target-word") as HTMLInputElement;

    expect(nativeInput).not.toBeNull();
    expect(targetInput).not.toBeNull();
    expect(nativeInput.value).toBe("Hello");
    expect(targetInput.value).toBe("Bonjour");
  });
});

// -----------------------------------------------------------------------
// Test 2: Save changes calls editCard
// -----------------------------------------------------------------------
describe("CardEditDialog — Save flow", () => {
  it("clicking 'Save changes' calls editCard with the card's id and values", async () => {
    renderDialog();

    // Modify the front field
    const nativeInput = document.getElementById("native-word") as HTMLInputElement;
    fireEvent.change(nativeInput, { target: { value: "Hi" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(vi.mocked(editCard)).toHaveBeenCalledWith(
        "card-test-1",
        "Hi",
        "Bonjour",
      );
    });
  });
});

// -----------------------------------------------------------------------
// Test 3: Delete confirm flow — keep card returns to edit form
// -----------------------------------------------------------------------
describe("CardEditDialog — delete confirm flow (Keep card)", () => {
  it("clicking the delete trigger shows the confirm dialog", () => {
    renderDialog();

    // Click the 'Delete card' trigger
    const deleteCardBtn = screen.getByText("Delete card");
    fireEvent.click(deleteCardBtn);

    // Confirm dialog should appear
    expect(screen.getByText("Delete this card?")).toBeTruthy();
    expect(screen.getByText(/This can't be undone\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Delete$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Keep card/i })).toBeTruthy();
  });

  it("clicking 'Keep card' returns to the edit form without calling deleteCard", () => {
    renderDialog();

    // Open the confirm
    fireEvent.click(screen.getByText("Delete card"));
    expect(screen.getByText("Delete this card?")).toBeTruthy();

    // Click Keep card
    const keepBtn = screen.getByRole("button", { name: /Keep card/i });
    fireEvent.click(keepBtn);

    // Should be back on the edit form
    expect(screen.queryByText("Delete this card?")).toBeNull();
    expect(screen.getByText("Native word")).toBeTruthy();
    expect(vi.mocked(deleteCard)).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Test 4: Delete confirm — clicking Delete calls deleteCard
// -----------------------------------------------------------------------
describe("CardEditDialog — delete confirm flow (Delete)", () => {
  it("clicking 'Delete' in the confirm calls deleteCard with the card id", async () => {
    renderDialog();

    // Open the confirm
    fireEvent.click(screen.getByText("Delete card"));

    // Click Delete
    const deleteBtn = screen.getByRole("button", { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(vi.mocked(deleteCard)).toHaveBeenCalledWith("card-test-1");
    });
  });
});
