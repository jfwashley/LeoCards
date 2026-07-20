// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardList } from "@/components/card-list";

// Mock the reduced-motion hook so animation doesn't interfere with jsdom tests
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: vi.fn(() => true), // reduced = true → no animation delays
}));

// Mock next/navigation (useRouter)
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock fetch for togglePause
global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));

afterEach(() => cleanup());

// -----------------------------------------------------------------------
// Shared fixture — a small fixed card list for all tests
// -----------------------------------------------------------------------
function makeCard(
  overrides: Partial<{
    id: string;
    front: string;
    back: string;
    source: string;
    masteryRound: number;
    pausedAt: Date | null;
  }>,
) {
  return {
    id: overrides.id ?? "card-1",
    front: overrides.front ?? "Hello",
    back: overrides.back ?? "Bonjour",
    source: overrides.source ?? "wordlist",
    createdAt: new Date("2024-01-01"),
    masteryRound: overrides.masteryRound ?? 0,
    pausedAt: overrides.pausedAt ?? null,
    cooldownUntil: null,
  };
}

const FIXTURE_CARDS = [
  makeCard({
    id: "c1",
    front: "Cat",
    back: "Chat",
    source: "wordlist",
    masteryRound: 0,
  }),
  makeCard({
    id: "c2",
    front: "Dog",
    back: "Chien",
    source: "manual",
    masteryRound: 2,
  }),
  makeCard({
    id: "c3",
    front: "Bird",
    back: "Oiseau",
    source: "wordlist",
    masteryRound: 3,
  }),
  makeCard({
    id: "c4",
    front: "Fish",
    back: "Poisson",
    source: "wordlist",
    masteryRound: 1,
    pausedAt: new Date(),
  }),
];

function renderCardList(cards = FIXTURE_CARDS) {
  return render(
    <CardList
      cards={cards}
      deckId="deck-test-1"
      nativeLangLabel="English"
      targetLangLabel="French"
    />,
  );
}

// -----------------------------------------------------------------------
// Test 1: Collapsed by default
// -----------------------------------------------------------------------
describe("CardList accordion — collapsed by default", () => {
  it("accordion header has aria-expanded=false on mount", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("search input is NOT in the document when collapsed", () => {
    renderCardList();
    expect(screen.queryByTestId("words-search-input")).toBeNull();
  });
});

// -----------------------------------------------------------------------
// Test 2: Clicking header expands — reveals search + rows
// -----------------------------------------------------------------------
describe("CardList accordion — expand on click", () => {
  it("clicking the header sets aria-expanded=true", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  it("after clicking, the search input is in the document", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    expect(screen.getByTestId("words-search-input")).toBeTruthy();
  });

  it("after clicking, at least one word row is visible", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    // "Cat" is the first card's native term
    expect(screen.getByText("Cat")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// Test 3: Header shows "{N} learned" count
// -----------------------------------------------------------------------
describe("CardList accordion — learned count in header", () => {
  it("header shows the correct learned count (cards with masteryRound >= 3)", () => {
    renderCardList();
    // FIXTURE_CARDS has 1 card with masteryRound=3 (Bird/c3)
    const header = screen.getByTestId("words-accordion-header");
    expect(header.textContent).toMatch(/1\s*learned/);
  });

  it("shows 0 learned when no cards have masteryRound >= 3", () => {
    const cards = [
      makeCard({ id: "c1", front: "Cat", back: "Chat", masteryRound: 0 }),
      makeCard({ id: "c2", front: "Dog", back: "Chien", masteryRound: 2 }),
    ];
    renderCardList(cards);
    const header = screen.getByTestId("words-accordion-header");
    expect(header.textContent).toMatch(/0\s*learned/);
  });
});

// -----------------------------------------------------------------------
// Test 4: D-04 — native term (front) renders BEFORE target term (back) in DOM
// -----------------------------------------------------------------------
describe("CardList D-04 — native-on-top row order", () => {
  it("within a row, the native term (front) appears before the target term (back) in DOM order", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);

    // Find the "Cat" (front) and "Chat" (back) elements
    const frontEl = screen.getByText("Cat");
    const backEl = screen.getByText("Chat");

    // Assert DOM order: front must come before back
    const order = frontEl.compareDocumentPosition(backEl);
    // Node.DOCUMENT_POSITION_FOLLOWING = 4 — backEl comes after frontEl
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// Test 5: Source tag shows correct label per card type
// -----------------------------------------------------------------------
describe("CardList source tags (DSH-05, L-06)", () => {
  it("shows 'Curated' for a wordlist card", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    // c1: source="wordlist", not paused → "Curated"
    expect(screen.getAllByText("Curated").length).toBeGreaterThan(0);
  });

  it("shows 'Added by you' for a manual card", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    // c2: source="manual", not paused → "Added by you"
    expect(screen.getByText("Added by you")).toBeTruthy();
  });

  it("shows 'Paused' for a card with pausedAt set", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    // c4: source="wordlist", pausedAt set → "Paused"
    expect(screen.getByText("Paused")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// Test 6: Mastery meter — card with masteryRound=3 renders the done/check treatment
// -----------------------------------------------------------------------
describe("CardList mastery meter (DSH-05)", () => {
  it("a card with masteryRound=3 renders the check mark (✓)", () => {
    renderCardList();
    const header = screen.getByTestId("words-accordion-header");
    fireEvent.click(header);
    // c3: masteryRound=3 → done → check mark ✓
    expect(screen.getByText("✓")).toBeTruthy();
  });
});
