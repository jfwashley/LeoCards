// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckSwitcher } from "@/components/deck-switcher";

vi.mock("@/lib/deck-actions", () => ({
  createDeck: vi.fn(),
}));

afterEach(() => cleanup());

const DECKS = [
  { id: "d1", name: "French Deck", language: "fr" },
  { id: "d2", name: "Spanish Deck", language: "es" },
];

describe("DeckSwitcher — Popover deck picker", () => {
  it("renders the trigger pill with the active language code", () => {
    render(
      <DeckSwitcher
        decks={DECKS}
        activeDeckId="d1"
        onDeckChange={() => {}}
        nativeLang="en"
      />,
    );

    const trigger = screen.getByTestId("deck-picker-trigger");
    expect(trigger).toBeTruthy();
    // Active lang chip shows "FR" for the French deck
    expect(trigger.textContent).toContain("FR");
  });

  it("clicking the trigger opens the popover and shows deck options + new-deck-row", async () => {
    render(
      <DeckSwitcher
        decks={DECKS}
        activeDeckId="d1"
        onDeckChange={() => {}}
        nativeLang="en"
      />,
    );

    const trigger = screen.getByTestId("deck-picker-trigger");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("deck-option-fr")).toBeTruthy();
      expect(screen.getByTestId("deck-option-es")).toBeTruthy();
      expect(screen.getByTestId("new-deck-row")).toBeTruthy();
    });
  });

  it("clicking new-deck-row reveals language chip buttons for learningLanguages", async () => {
    render(
      <DeckSwitcher
        decks={DECKS}
        activeDeckId="d1"
        onDeckChange={() => {}}
        nativeLang="en"
      />,
    );

    const trigger = screen.getByTestId("deck-picker-trigger");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("new-deck-row")).toBeTruthy();
    });

    const newDeckRow = screen.getByTestId("new-deck-row");
    fireEvent.click(newDeckRow);

    await waitFor(() => {
      // showPicker=true should reveal language buttons (French + Spanish since nativeLang=en)
      // Cancel button should also be visible
      expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
      // The language picker buttons appear (may match multiple times due to deck list + picker)
      const frTexts = screen.getAllByText("French");
      expect(frTexts.length).toBeGreaterThanOrEqual(1);
      const esTexts = screen.getAllByText("Spanish");
      expect(esTexts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
