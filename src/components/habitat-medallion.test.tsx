// @vitest-environment jsdom

import type { HabitatState } from "@leocards/domain/habitat";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HabitatHero } from "@/components/habitat-hero";
import { HabitatMedallion } from "@/components/habitat-medallion";

// HabitatHero uses next/link — mock it so jsdom doesn't choke on routing.
// vitest hoists vi.mock() calls automatically so this placement is fine.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

afterEach(() => cleanup());

// ---------------------------------------------------------------
// HabitatMedallion — progress ring, level badge, D-05, D-06
// ---------------------------------------------------------------

describe("HabitatMedallion", () => {
  // Case 1: Normal mid-level — ring is conic-gradient with amber #F28A1F
  // NOTE: jsdom normalises hex → rgb() when reading element.style.background,
  // so we check for the rgb equivalent of #F28A1F = rgb(242, 138, 31)
  it("normal mid-level: ring is a conic-gradient containing the amber colour", () => {
    render(
      <HabitatMedallion
        level={5}
        learnedCardCount={40}
        nextLevelThreshold={80}
        sleeping={false}
        size={132}
      />,
    );
    const ring = screen.getByTestId("medallion-ring");
    const bg = (ring as HTMLElement).style.background;
    expect(bg).toContain("conic-gradient");
    // jsdom normalises #F28A1F → rgb(242, 138, 31)
    expect(bg).toMatch(/rgb\(242,\s*138,\s*31\)/);
  });

  // Case 1b: Normal mid-level — badge shows the level number
  it("normal mid-level: badge shows the level number", () => {
    render(
      <HabitatMedallion
        level={5}
        learnedCardCount={40}
        nextLevelThreshold={80}
        sleeping={false}
        size={132}
      />,
    );
    const medallion = screen.getByTestId("habitat-medallion");
    expect(medallion.getAttribute("data-max-level")).toBe("false");
    expect(medallion.getAttribute("data-sleeping")).toBe("false");
    expect(medallion.textContent).toContain("5");
  });

  // Case 2a: Progress math — at prevThreshold the amber arc is ~0deg
  it("progress math: at prevThreshold the amber arc is near 0deg", () => {
    // level=5, learnedCardCount=50 (exactly prevThreshold for L5)
    // prevThreshold for level 5 = LEVEL_THRESHOLDS[level-2] = LEVEL_THRESHOLDS[3] = 50
    // nextLevelThreshold = LEVEL_THRESHOLDS[4] = 80
    // progress = (50 - 50) / (80 - 50) = 0 → 0deg
    render(
      <HabitatMedallion
        level={5}
        learnedCardCount={50}
        nextLevelThreshold={80}
        sleeping={false}
        size={132}
      />,
    );
    const ring = screen.getByTestId("medallion-ring");
    const bg = (ring as HTMLElement).style.background;
    expect(bg).toContain("0deg");
  });

  it("progress math: at/above nextLevelThreshold the ring is full (360deg)", () => {
    // level=5, learnedCardCount=100 >= nextLevelThreshold=80 → clamped to 1 → 360deg
    render(
      <HabitatMedallion
        level={5}
        learnedCardCount={100}
        nextLevelThreshold={80}
        sleeping={false}
        size={132}
      />,
    );
    const ring = screen.getByTestId("medallion-ring");
    const bg = (ring as HTMLElement).style.background;
    expect(bg).toContain("360deg");
  });

  // Case 3: L9 max (nextLevelThreshold === null) — gold solid ring + data attr
  // #F2B33A = rgb(242, 179, 58) after jsdom normalisation
  it("L9 max: data-max-level=true, ring is gold solid (not conic-gradient)", () => {
    render(
      <HabitatMedallion
        level={9}
        learnedCardCount={230}
        nextLevelThreshold={null}
        sleeping={false}
        size={132}
      />,
    );
    const medallion = screen.getByTestId("habitat-medallion");
    expect(medallion.getAttribute("data-max-level")).toBe("true");

    const ring = screen.getByTestId("medallion-ring");
    const bg = (ring as HTMLElement).style.background;
    expect(bg).not.toContain("conic-gradient");
    // jsdom normalises #F2B33A → rgb(242, 179, 58)
    expect(bg).toMatch(/rgb\(242,\s*179,\s*58\)/);
  });

  it("L9 max: badge shows the level number '9'", () => {
    render(
      <HabitatMedallion
        level={9}
        learnedCardCount={230}
        nextLevelThreshold={null}
        sleeping={false}
        size={132}
      />,
    );
    const medallion = screen.getByTestId("habitat-medallion");
    expect(medallion.textContent).toContain("9");
  });

  // Case 4: Cooldown (sleeping) — D-06 GUARD: ring stays accurate
  it("cooldown: data-sleeping=true and ring still contains conic-gradient (D-06)", () => {
    // level=5, learnedCardCount=65, nextLevelThreshold=80
    // progress = (65 - 50) / (80 - 50) = 0.5 → 180deg
    render(
      <HabitatMedallion
        level={5}
        learnedCardCount={65}
        nextLevelThreshold={80}
        sleeping={true}
        size={132}
      />,
    );
    const medallion = screen.getByTestId("habitat-medallion");
    expect(medallion.getAttribute("data-sleeping")).toBe("true");

    const ring = screen.getByTestId("medallion-ring");
    const bg = (ring as HTMLElement).style.background;

    // D-06 guard: ring must NOT be the flat greyed solid
    // #F3E3C6 = rgb(243, 227, 198) after jsdom normalisation
    expect(bg).not.toMatch(/^rgb\(243,\s*227,\s*198\)$/);
    // Ring must still be a conic-gradient (accurate progress, not zeroed)
    expect(bg).toContain("conic-gradient");
    // Must NOT be forced to 0deg (zeroed ring would violate D-06)
    // At 50% progress → 180deg, so 0deg would be wrong
    expect(bg).not.toMatch(/conic-gradient\(rgb\(242,\s*138,\s*31\) 0deg,/);
  });

  it("cooldown: 'z' mark is present in the DOM", () => {
    render(
      <HabitatMedallion
        level={5}
        learnedCardCount={65}
        nextLevelThreshold={80}
        sleeping={true}
        size={132}
      />,
    );
    const medallion = screen.getByTestId("habitat-medallion");
    expect(medallion.textContent).toContain("z");
  });
});

// ---------------------------------------------------------------
// HabitatHero — Daybreak card, title/subtitle, D-05/D-06
// ---------------------------------------------------------------

function makeState(overrides: Partial<HabitatState> = {}): HabitatState {
  return {
    level: 5,
    learnedCardCount: 65,
    nextLevelThreshold: 80,
    quality: 1,
    mood: "happy",
    effectiveCardCount: 65,
    isDecaying: false,
    minutesSinceActivity: 30,
    ...overrides,
  };
}

describe("HabitatHero", () => {
  // (a) renders a link with href /habitat
  it("renders a link to /habitat", () => {
    render(<HabitatHero habitatState={makeState()} celebratingLevel={null} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/habitat");
  });

  // (a2) preserves celebrate query param when celebratingLevel is set
  it("preserves ?celebrate= param when celebratingLevel is set", () => {
    render(<HabitatHero habitatState={makeState()} celebratingLevel={5} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/habitat?celebrate=5");
  });

  // (b) at L9 subtitle reads "Course 1 complete" and X of Y cards line is absent
  it("at L9 subtitle reads 'Course 1 complete' and X of Y cards line is absent", () => {
    render(
      <HabitatHero
        habitatState={makeState({
          level: 9,
          learnedCardCount: 230,
          nextLevelThreshold: null,
        })}
        celebratingLevel={null}
      />,
    );
    const subtitle = screen.getByTestId("habitat-hero-subtitle");
    expect(subtitle.textContent).toContain("Course 1 complete");
    expect(subtitle.textContent).not.toMatch(/\d+ of \d+/);
  });

  // (c) normal level renders "N of M cards to Level N+1"
  it("normal level renders 'N of M cards to Level N+1'", () => {
    render(
      <HabitatHero
        habitatState={makeState({
          level: 5,
          learnedCardCount: 65,
          nextLevelThreshold: 80,
        })}
        celebratingLevel={null}
      />,
    );
    const subtitle = screen.getByTestId("habitat-hero-subtitle");
    expect(subtitle.textContent).toContain("65");
    expect(subtitle.textContent).toContain("80");
    expect(subtitle.textContent).toContain("Level 6");
  });

  // (d) sleeping=true does NOT render any Resting/countdown text (D-06)
  it("sleeping=true: no 'Resting' or countdown text in the hero (D-06)", () => {
    render(
      <HabitatHero
        habitatState={makeState({
          level: 5,
          learnedCardCount: 65,
          nextLevelThreshold: 80,
        })}
        sleeping={true}
        celebratingLevel={null}
      />,
    );
    const subtitle = screen.getByTestId("habitat-hero-subtitle");
    expect(subtitle.textContent).not.toMatch(/Resting/i);
    expect(subtitle.textContent).not.toMatch(/2h|countdown|min/i);
  });
});
