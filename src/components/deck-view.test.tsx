// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation — useRouter used by DeckView + CountdownTimer
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link — renders as a plain <a> in jsdom
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    style,
    className,
    "data-testid": testId,
  }: {
    href: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    "data-testid"?: string;
  }) => (
    <a href={href} style={style} className={className} data-testid={testId}>
      {children}
    </a>
  ),
}));

// Mock HabitatHero — lightweight stub so tests focus on the action line
vi.mock("@/components/habitat-hero", () => ({
  HabitatHero: ({ sleeping }: { sleeping?: boolean }) => (
    <div
      data-testid="habitat-hero"
      data-sleeping={sleeping ? "true" : "false"}
    />
  ),
}));

// Mock CardList — stub to avoid accordion complexity in these unit tests
vi.mock("@/components/card-list", () => ({
  CardList: () => <div data-testid="card-list" />,
}));

// Mock AppHeader — stub
vi.mock("@/components/app-header", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

// Mock LionFace — used by CountdownTimer in StatusText cooldown branch
vi.mock("@/components/daybreak/lion-face", () => ({
  LionFace: () => <span data-testid="lion-face" />,
}));

import type { HabitatState } from "@leocards/domain/habitat";
import type { CardRow } from "@/components/deck-view";
import { DeckView } from "@/components/deck-view";

afterEach(() => cleanup());

// ---------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------

function makeCards(count: number, paused = false): CardRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    front: `front-${i}`,
    back: `back-${i}`,
    source: "manual",
    createdAt: new Date(),
    masteryRound: 0,
    pausedAt: paused ? new Date() : null,
    cooldownUntil: null,
  }));
}

const baseHabitatState: HabitatState = {
  level: 1,
  learnedCardCount: 0,
  nextLevelThreshold: 10,
  mood: "neutral",
  quality: 1.0,
  effectiveCardCount: 0,
  isDecaying: false,
  minutesSinceActivity: null,
};

const baseDecks = [{ id: "deck-1", language: "fr", name: "French" }];

// ---------------------------------------------------------------
// Test 1: hasDueCards — "Start studying" is a link to /study,
//          status shows "{N} due" with N > 0
// ---------------------------------------------------------------

describe("DeckView action line — hasDueCards state", () => {
  it("renders 'Start studying' as a link to /study when hasDueCards is true", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={true}
        dueCount={5}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    const studyLink = screen.getByRole("link", { name: /Start studying/i });
    expect(studyLink).toBeTruthy();
    expect(studyLink.getAttribute("href")).toContain("/study");
    expect(studyLink.getAttribute("href")).toContain("deck-1");
  });

  it("shows '5 due' in the status row when dueCount=5 and hasDueCards", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={true}
        dueCount={5}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    // Status row shows the server-authoritative due count
    const statusText = screen.getByText(/\d+ due/);
    expect(statusText).toBeTruthy();
    expect(statusText.textContent).toContain("5 due");
  });
});

// ---------------------------------------------------------------
// Test 2: none-due (no cooldown, not all-paused)
//          "Start studying" is not a link; status shows "0 due"
// ---------------------------------------------------------------

describe("DeckView action line — none-due state (no cooldown, not all-paused)", () => {
  it("renders 'Start studying' as a dimmed div (not a link) when none due", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={false}
        dueCount={0}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    // Should NOT be a link with href to /study
    const studyLinks = screen.queryAllByRole("link", {
      name: /Start studying/i,
    });
    // Filter to those linking to /study
    const studyActionLinks = studyLinks.filter((el) =>
      el.getAttribute("href")?.includes("/study"),
    );
    expect(studyActionLinks.length).toBe(0);

    // The dimmed element text is still present
    expect(screen.getByText("Start studying")).toBeTruthy();
  });

  it("shows '0 due' in the status row when none due and no cooldown", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={false}
        dueCount={0}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    expect(screen.getByText("0 due")).toBeTruthy();
  });
});

// ---------------------------------------------------------------
// Test 3: cooldown state (earliestCooldownEnd set, !hasDueCards)
//          status shows "Resting" + countdown; Start studying is dimmed
// ---------------------------------------------------------------

describe("DeckView action line — cooldown/resting state", () => {
  it("shows 'Resting' and a countdown substring in the status row", () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={false}
        dueCount={0}
        earliestCooldownEnd={future}
        habitatState={baseHabitatState}
      />,
    );

    // Status row text contains "Resting"
    expect(screen.getByText(/Resting/)).toBeTruthy();
  });

  it("'Start studying' is dimmed (not a link to /study) during cooldown", () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={false}
        dueCount={0}
        earliestCooldownEnd={future}
        habitatState={baseHabitatState}
      />,
    );

    const studyLinks = screen.queryAllByRole("link", {
      name: /Start studying/i,
    });
    const studyActionLinks = studyLinks.filter((el) =>
      el.getAttribute("href")?.includes("/study"),
    );
    expect(studyActionLinks.length).toBe(0);
    expect(screen.getByText("Start studying")).toBeTruthy();
  });
});

// ---------------------------------------------------------------
// Test 4: all-paused branch (hasCards && !hasDueCards && !cooldownEnd)
//          status shows "All paused"; old "All cards are paused" paragraph ABSENT
// ---------------------------------------------------------------

describe("DeckView action line — all-paused state", () => {
  it("shows 'All paused' in the status row", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3, true)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={false}
        dueCount={0}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    expect(screen.getByText("All paused")).toBeTruthy();
  });

  it("does NOT render the old 'All cards are paused — unpause one to study.' paragraph", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3, true)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={false}
        dueCount={0}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    const oldCopy = screen.queryByText(
      /All cards are paused — unpause one to study/,
    );
    expect(oldCopy).toBeNull();
  });
});

// ---------------------------------------------------------------
// Test 5: "Browse words" absent; "Add a card" link IS present
// ---------------------------------------------------------------

describe("DeckView populated action line — Browse words absent, Add a card present", () => {
  it("does not render a 'Browse words' link in the populated view", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={true}
        dueCount={3}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    const browseLinks = screen.queryAllByRole("link", {
      name: /Browse words/i,
    });
    expect(browseLinks.length).toBe(0);
    // Also check for text node
    expect(screen.queryByText(/Browse words/)).toBeNull();
  });

  it("renders 'Add a card' as a link with data-testid='add-a-card'", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={true}
        dueCount={3}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    const addACard = screen.getByTestId("add-a-card");
    expect(addACard).toBeTruthy();
    // Must be an anchor (link)
    expect(addACard.tagName.toLowerCase()).toBe("a");
    // Pill contains "Add a card" text
    expect(addACard.textContent).toContain("Add a card");
    // Links to new-card route
    expect(addACard.getAttribute("href")).toContain("/deck/new-card");
  });
});

// ---------------------------------------------------------------
// Phase 17 (D-06 pre-split baseline) — locks DeckView's CURRENT
// observable behavior BEFORE any RSC split lands in Wave 3. This test
// must stay green with NO changes to its assertions after the split —
// it is the behavior-preservation reference, not a moving target.
// ---------------------------------------------------------------

describe("DeckView pre-split baseline (Phase 17 D-06) — current rendered behavior", () => {
  it("renders the header, HabitatHero, CardList, and the add-a-card affordance together", () => {
    render(
      <DeckView
        decks={baseDecks}
        initialCards={makeCards(3)}
        nativeLang="en"
        activeDeckId="deck-1"
        hasDueCards={true}
        dueCount={3}
        earliestCooldownEnd={null}
        habitatState={baseHabitatState}
      />,
    );

    // Header renders.
    expect(screen.getByTestId("app-header")).toBeTruthy();

    // HabitatHero mock is present.
    const habitatHero = screen.getByTestId("habitat-hero");
    expect(habitatHero).toBeTruthy();

    // CardList mock is present.
    expect(screen.getByTestId("card-list")).toBeTruthy();

    // The "add-a-card" affordance is present.
    const addACard = screen.getByTestId("add-a-card");
    expect(addACard).toBeTruthy();
    expect(addACard.tagName.toLowerCase()).toBe("a");
  });
});
