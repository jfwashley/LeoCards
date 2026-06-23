// @vitest-environment jsdom
// Phase 23 Browse Words — shared rendered-component test scaffold.
// Covers BWMedallion (Plan 23-01). Plan 23-03 extends this file with
// BWWordRow / BWLevels / BrowseEmpty cases — do not duplicate the file.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BWMedallion } from "@/components/daybreak/bw-medallion";
import { BrowseEmpty, BWWordRow } from "@/components/word-list-browser";
import type { WordEntry } from "@/data/wordlists/schema";
import { CATEGORIES } from "@/data/wordlists/schema";

afterEach(() => cleanup());

describe("BWMedallion — topic icon container", () => {
  it("renders without crashing for all 14 CATEGORIES", () => {
    for (const cat of CATEGORIES) {
      const { container, unmount } = render(<BWMedallion name={cat} />);
      expect(container.firstChild).toBeTruthy();
      unmount();
    }
  });

  it("applies correct medallion styles and aria-hidden for Food & Drink at size 26", () => {
    const { container } = render(<BWMedallion name="Food & Drink" size={26} />);
    const medallion = container.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement | null;
    expect(medallion).toBeTruthy();
    // jsdom normalises numeric borderRadius → "16px"
    expect(medallion?.style.borderRadius).toBe("16px");
    expect(medallion?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders without throwing for an unknown category name (defensive path)", () => {
    expect(() => {
      render(<BWMedallion name="not-a-real-category" />);
    }).not.toThrow();
  });
});

// ─── Task 3: BWWordRow rendered-component cases (BRW-03) ─────────────────────

const mockWord: WordEntry = {
  id: "food-001",
  category: "Food & Drink",
  cefr: "A1",
  native: "water",
  target: "agua",
};

describe("BWWordRow — Row A states", () => {
  it("in-deck word row has warm tint background", () => {
    render(
      <BWWordRow
        word={mockWord}
        inDeck={true}
        loading={false}
        error={undefined}
        onAdd={() => {}}
        onRemove={() => {}}
        targetLangLabel="Spanish"
      />,
    );
    const row = screen.getByTestId("word-row") as HTMLElement;
    // jsdom normalises #FFF7E9 → rgb(255, 247, 233)
    expect(row.style.background).toMatch(/rgb\(255,\s*247,\s*233\)/);
  });

  it("not-in-deck row: toggle has accessible name containing 'Add water to deck'", () => {
    render(
      <BWWordRow
        word={mockWord}
        inDeck={false}
        loading={false}
        error={undefined}
        onAdd={() => {}}
        onRemove={() => {}}
        targetLangLabel="Spanish"
      />,
    );
    expect(
      screen.getByRole("button", { name: /Add water to deck/ }),
    ).toBeTruthy();
  });

  it("in-deck remove affordance: toggle has accessible name containing 'Remove water'", () => {
    render(
      <BWWordRow
        word={mockWord}
        inDeck={true}
        loading={false}
        error={undefined}
        onAdd={() => {}}
        onRemove={() => {}}
        targetLangLabel="Spanish"
      />,
    );
    expect(
      screen.getByRole("button", {
        name: /Remove water from deck/,
      }),
    ).toBeTruthy();
  });

  it("reserved error line is in DOM and empty when no error (scroll-stability guard)", () => {
    render(
      <BWWordRow
        word={mockWord}
        inDeck={false}
        loading={false}
        error={undefined}
        onAdd={() => {}}
        onRemove={() => {}}
        targetLangLabel="Spanish"
      />,
    );
    const row = screen.getByTestId("word-row");
    const errorLine = row.querySelector('[data-role="error-line"]');
    // The reserved line is always present even when there is no error
    expect(errorLine).toBeTruthy();
    expect(errorLine?.textContent).toBe("");
  });

  it("error message is rendered in the reserved error line when present", () => {
    render(
      <BWWordRow
        word={mockWord}
        inDeck={false}
        loading={false}
        error="Failed. Try again."
        onAdd={() => {}}
        onRemove={() => {}}
        targetLangLabel="Spanish"
      />,
    );
    const row = screen.getByTestId("word-row");
    const errorLine = row.querySelector('[data-role="error-line"]');
    expect(errorLine?.textContent).toBe("Failed. Try again.");
  });
});

// ─── Task 3: BrowseEmpty rendered-component cases (BRW-04) ───────────────────

describe("BrowseEmpty — D-09 empty state", () => {
  it("renders 'No words at this level.' heading and subtext with topic and level", () => {
    render(<BrowseEmpty topic="Body" level="B1" onShowAll={() => {}} />);
    expect(screen.getByText("No words at this level.")).toBeTruthy();
    // Subtext references both topic and level
    const subtext = screen
      .getAllByText(/B1/)
      .find((el) => el.textContent?.includes("Body"));
    expect(subtext).toBeTruthy();
  });

  it("clicking 'Show all levels' calls the onShowAll handler (BRW-04 reset)", () => {
    const onShowAll = vi.fn();
    render(<BrowseEmpty topic="Body" level="B1" onShowAll={onShowAll} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all levels" }));
    expect(onShowAll).toHaveBeenCalled();
  });
});
