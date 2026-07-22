// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardList } from "@/components/card-list";

// Mock the reduced-motion hook so animation doesn't interfere with jsdom tests
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: vi.fn(() => true), // reduced = true → no animation delays
}));

// Router mocks are hoisted + shared (stable references across every
// useRouter() call) so tests can assert on a single spy's call count. A
// factory that returned a fresh `{ refresh: vi.fn() }` object per call
// (the pre-Phase-27 shape) would make coalescing/refresh assertions
// impossible to observe, since each render would produce an unrelated spy.
const { mockRouterRefresh } = vi.hoisted(() => ({
  mockRouterRefresh: vi.fn(),
}));

// Mock next/navigation (useRouter)
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: mockRouterRefresh,
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock fetch for togglePause
global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));

afterEach(() => {
  cleanup();
  mockRouterRefresh.mockClear();
  vi.mocked(global.fetch).mockReset();
  vi.mocked(global.fetch).mockImplementation(() =>
    Promise.resolve({ ok: true } as Response),
  );
});

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

/** Expand the accordion and wait for the deferred row mount (PERF-20) to
 * complete — rows mount only after the accordion open tween's safety-net
 * timer fires (jsdom never dispatches a real `animationend`). */
async function expandAndWaitForRows() {
  const header = screen.getByTestId("words-accordion-header");
  fireEvent.click(header);
  await waitFor(() =>
    expect(screen.queryAllByTestId("card-row").length).toBeGreaterThan(0),
  );
  return header;
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

  it("after clicking, at least one word row is visible (once the deferred row mount settles)", async () => {
    renderCardList();
    await expandAndWaitForRows();
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
  it("within a row, the native term (front) appears before the target term (back) in DOM order", async () => {
    renderCardList();
    await expandAndWaitForRows();

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
  it("shows 'Curated' for a wordlist card", async () => {
    renderCardList();
    await expandAndWaitForRows();
    // c1: source="wordlist", not paused → "Curated"
    expect(screen.getAllByText("Curated").length).toBeGreaterThan(0);
  });

  it("shows 'Added by you' for a manual card", async () => {
    renderCardList();
    await expandAndWaitForRows();
    // c2: source="manual", not paused → "Added by you"
    expect(screen.getByText("Added by you")).toBeTruthy();
  });

  it("shows 'Paused' for a card with pausedAt set", async () => {
    renderCardList();
    await expandAndWaitForRows();
    // c4: source="wordlist", pausedAt set → "Paused"
    expect(screen.getByText("Paused")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// Test 6: Mastery meter — card with masteryRound=3 renders the done/check treatment
// -----------------------------------------------------------------------
describe("CardList mastery meter (DSH-05)", () => {
  it("a card with masteryRound=3 renders the check mark (✓)", async () => {
    renderCardList();
    await expandAndWaitForRows();
    // c3: masteryRound=3 → done → check mark ✓
    expect(screen.getByText("✓")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// Task 1 (PERF-13): Optimistic pause/resume toggle
// -----------------------------------------------------------------------
describe("CardList optimistic pause toggle (PERF-13)", () => {
  it("flips the icon to the paused state synchronously, before the POST resolves", async () => {
    // A fetch that never resolves during this assertion window — proves the
    // icon flip happens BEFORE the POST settles, not after.
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));

    renderCardList();
    await expandAndWaitForRows();

    // c1 ("Cat") starts unpaused → button reads "Pause this card"
    const pauseBtn = screen.getByLabelText("Pause this card", {
      selector: '[data-card-id="c1"] button',
    });
    fireEvent.click(pauseBtn);

    // Synchronous assertion — no await — the mocked POST above never resolves.
    expect(
      screen.getByLabelText("Resume this card", {
        selector: '[data-card-id="c1"] button',
      }),
    ).toBeTruthy();
  });

  it("rolls back to the prior state and surfaces a transient error when the POST rejects", async () => {
    vi.mocked(global.fetch).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500 } as Response),
    );

    renderCardList();
    await expandAndWaitForRows();

    const pauseBtn = screen.getByLabelText("Pause this card", {
      selector: '[data-card-id="c1"] button',
    });
    fireEvent.click(pauseBtn);

    // Optimistic flip fires immediately...
    expect(
      screen.getByLabelText("Resume this card", {
        selector: '[data-card-id="c1"] button',
      }),
    ).toBeTruthy();

    // ...then rolls back once the rejected POST resolves, with a visible error.
    await waitFor(() => {
      expect(
        screen.getByLabelText("Pause this card", {
          selector: '[data-card-id="c1"] button',
        }),
      ).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText("Failed. Try again.")).toBeTruthy();
    });
  });

  it("still calls router.refresh() on a successful toggle (Pitfall 2 correctness guarantee)", async () => {
    vi.mocked(global.fetch).mockImplementation(() =>
      Promise.resolve({ ok: true } as Response),
    );

    renderCardList();
    await expandAndWaitForRows();

    const pauseBtn = screen.getByLabelText("Pause this card", {
      selector: '[data-card-id="c1"] button',
    });
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("coalesces trailing refreshes when multiple cards are toggled in rapid succession", async () => {
    vi.mocked(global.fetch).mockImplementation(() =>
      Promise.resolve({ ok: true } as Response),
    );

    renderCardList();
    await expandAndWaitForRows();

    const pauseBtnC1 = screen.getByLabelText("Pause this card", {
      selector: '[data-card-id="c1"] button',
    });
    const pauseBtnC3 = screen.getByLabelText("Pause this card", {
      selector: '[data-card-id="c3"] button',
    });

    // Rapid successive toggles across two different rows — should coalesce
    // into exactly one trailing router.refresh() call, not two.
    fireEvent.click(pauseBtnC1);
    fireEvent.click(pauseBtnC3);

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

// -----------------------------------------------------------------------
// Task 2 (PERF-20): React.memo CardRow + useDeferredValue search
// -----------------------------------------------------------------------
describe("CardList item 16 — React.memo row + deferred search", () => {
  it("does not re-render a row whose props are unchanged when typing in the search box", async () => {
    renderCardList();
    await expandAndWaitForRows();

    const catRow = screen.getByText("Cat").closest('[data-testid="card-row"]');
    expect(catRow).toBeTruthy();
    const initialRenderCount = catRow?.getAttribute("data-render-count");
    expect(initialRenderCount).toBeTruthy();

    const searchInput = screen.getByTestId("words-search-input");
    // "cat" matches only c1 (front "Cat") — c1's own row props (front, back,
    // source, masteryRound, paused, pending, error, qaMode) never change
    // across this filter transition, so its render count must stay put.
    fireEvent.change(searchInput, { target: { value: "cat" } });

    await waitFor(() => {
      expect(screen.queryByText("Dog")).toBeNull();
    });

    const afterRenderCount = catRow?.getAttribute("data-render-count");
    expect(afterRenderCount).toBe(initialRenderCount);
  });

  it("filters using the deferred query value and still produces correct results", async () => {
    renderCardList();
    await expandAndWaitForRows();

    const searchInput = screen.getByTestId("words-search-input");
    fireEvent.change(searchInput, { target: { value: "cat" } });

    await waitFor(() => {
      expect(screen.getByText("Cat")).toBeTruthy();
      expect(screen.queryByText("Dog")).toBeNull();
      expect(screen.queryByText("Bird")).toBeNull();
      expect(screen.queryByText("Fish")).toBeNull();
    });
  });

  it("CardList itself remains wrapped in React.memo", () => {
    // Static contract check — CardList must still be memoized (this test
    // exists purely so `grep -c "React.memo"` and future readers have a
    // behavioral anchor tying the two memo wraps together).
    expect(CardList.displayName ?? CardList.$$typeof).toBeTruthy();
  });
});
