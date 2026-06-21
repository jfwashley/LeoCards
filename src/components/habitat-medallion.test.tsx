// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// habitat-medallion.tsx and habitat-hero.tsx are pure presentational components
// and do not import usePrefersReducedMotion — no mock needed for the medallion.
// HabitatHero uses next/link; mock it so jsdom doesn't choke.
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
  // Import inside describe so mock is in place first
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import in test
  let HabitatMedallion: any;

  beforeAll(async () => {
    const mod = await import("@/components/habitat-medallion");
    HabitatMedallion = mod.HabitatMedallion;
  });

  // Case 1: Normal mid-level — ring is conic-gradient with amber #F28A1F
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
    expect(bg).toContain("#F28A1F");
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
    // Badge text: level number
    expect(medallion.textContent).toContain("5");
  });

  // Case 2: Progress math — at prevThreshold the ring degree is ~0
  it("progress math: at prevThreshold the amber arc is near 0deg", () => {
    // level=5, learnedCardCount=50 (exactly prevThreshold for L5 which is LEVEL_THRESHOLDS[3]=50)
    // prevThreshold for level 5 = LEVEL_THRESHOLDS[5-2] = LEVEL_THRESHOLDS[3] = 50
    // nextLevelThreshold = LEVEL_THRESHOLDS[4] = 80
    // progress = (50 - 50) / (80 - 50) = 0
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
    // 0 * 360 = 0deg — the amber stop is at 0deg (no visible amber)
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

  // Case 3: L9 max (nextLevelThreshold === null) — gold solid ring + badge + data attr
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
    // Gold solid — NOT a conic-gradient
    expect(bg).not.toContain("conic-gradient");
    expect(bg).toBe("#F2B33A");
  });

  it("L9 max: badge shows '9' (level number)", () => {
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
    // badge text is "9" — check textContent includes it
    expect(medallion.textContent).toContain("9");
  });

  // Case 4: Cooldown (sleeping) — D-06 GUARD: ring stays accurate, NOT zeroed/greyed
  it("cooldown: data-sleeping=true and ring still contains conic-gradient with real degrees (D-06)", () => {
    // level=5, learnedCardCount=65, nextLevelThreshold=80
    // prevThreshold = LEVEL_THRESHOLDS[3] = 50
    // progress = (65 - 50) / (80 - 50) = 15/30 = 0.5 → 180deg
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

    // D-06 guard: ring must NOT be the flat greyed solid (#F3E3C6)
    expect(bg).not.toBe("#F3E3C6");
    // Ring must still be a conic-gradient (accurate progress)
    expect(bg).toContain("conic-gradient");
    // And must NOT be forced to 0deg (i.e. zeroed ring is wrong)
    expect(bg).not.toMatch(/conic-gradient\(#F28A1F 0deg,/);
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
    // The z mark is a text node inside the medallion
    const medallion = screen.getByTestId("habitat-medallion");
    expect(medallion.textContent).toContain("z");
  });
});

// ---------------------------------------------------------------
// HabitatHero — Daybreak card, title/subtitle, D-05/D-06
// ---------------------------------------------------------------

import type { HabitatState } from "@/lib/habitat-engine";

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
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import in test
  let HabitatHero: any;

  beforeAll(async () => {
    const mod = await import("@/components/habitat-hero");
    HabitatHero = mod.HabitatHero;
  });

  // (a) renders a link with href /habitat
  it("renders a link to /habitat", () => {
    render(
      <HabitatHero habitatState={makeState()} celebratingLevel={null} />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/habitat");
  });

  // (a2) preserves celebrate query param when celebratingLevel is set
  it("preserves ?celebrate= param when celebratingLevel is set", () => {
    render(
      <HabitatHero habitatState={makeState()} celebratingLevel={5} />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/habitat?celebrate=5");
  });

  // (b) at L9 (nextLevelThreshold: null) subtitle reads "Course 1 complete"
  it("at L9 subtitle reads 'Course 1 complete' and 'X of Y cards' line is absent", () => {
    render(
      <HabitatHero
        habitatState={makeState({ level: 9, learnedCardCount: 230, nextLevelThreshold: null })}
        celebratingLevel={null}
      />,
    );
    const subtitle = screen.getByTestId("habitat-hero-subtitle");
    expect(subtitle.textContent).toContain("Course 1 complete");
    // The "X of Y cards to Level" line must NOT be present
    expect(subtitle.textContent).not.toMatch(/\d+ of \d+/);
  });

  // (c) normal level renders "{n} of {m} cards to Level {level+1}"
  it("normal level renders 'N of M cards to Level N+1'", () => {
    render(
      <HabitatHero
        habitatState={makeState({ level: 5, learnedCardCount: 65, nextLevelThreshold: 80 })}
        celebratingLevel={null}
      />,
    );
    const subtitle = screen.getByTestId("habitat-hero-subtitle");
    expect(subtitle.textContent).toContain("65");
    expect(subtitle.textContent).toContain("80");
    expect(subtitle.textContent).toContain("Level 6");
  });

  // (d) sleeping=true does NOT render any Resting/countdown text in the hero (D-06)
  it("sleeping=true: no 'Resting' or countdown text in the hero (D-06)", () => {
    render(
      <HabitatHero
        habitatState={makeState({ level: 5, learnedCardCount: 65, nextLevelThreshold: 80 })}
        sleeping={true}
        celebratingLevel={null}
      />,
    );
    const subtitle = screen.getByTestId("habitat-hero-subtitle");
    expect(subtitle.textContent).not.toMatch(/Resting/i);
    expect(subtitle.textContent).not.toMatch(/2h|countdown|min/i);
  });
});
