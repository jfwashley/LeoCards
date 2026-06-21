// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { LevelUpOverlay } from "@/components/level-up-overlay";

// Mock the reduced-motion hook so we can control its return value per test case
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: vi.fn(),
}));

afterEach(() => cleanup());

describe("LevelUpOverlay — D-06 reduced-motion confetti gate", () => {
  beforeEach(() => {
    // Default: motion allowed
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });

  // ---------------------------------------------------------------
  // Case A: reduced motion ON — confetti must be ABSENT
  //         but Soft-Clay Leo + level summary must be PRESENT
  // ---------------------------------------------------------------
  describe("Case A: reduced motion ON (usePrefersReducedMotion returns true)", () => {
    beforeEach(() => {
      vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    });

    it("renders no confetti layer when motion is reduced", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      expect(screen.queryByTestId("confetti-layer")).toBeNull();
    });

    it("renders no confetti particles when motion is reduced", () => {
      const { container } = render(
        <LevelUpOverlay level={5} onDismiss={() => {}} />,
      );
      const particles = container.querySelectorAll("[data-confetti-particle]");
      expect(particles.length).toBe(0);
    });

    it("still renders the Soft-Clay Leo img when motion is reduced", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      expect(screen.getByAltText("Leo")).toBeTruthy();
    });

    it("still renders the level summary text when motion is reduced", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      // The "Your habitat grew!" beat should always render
      expect(screen.getByText("Your habitat grew!")).toBeTruthy();
    });

    it("still renders the level numeral when motion is reduced", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      // The level number is shown in the content block
      expect(screen.getByText("5")).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------
  // Case B: reduced motion OFF — confetti must be PRESENT
  //         and Soft-Clay Leo + level summary must also be PRESENT
  // ---------------------------------------------------------------
  describe("Case B: reduced motion OFF (usePrefersReducedMotion returns false)", () => {
    beforeEach(() => {
      vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    });

    it("renders the confetti layer when motion is allowed", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      expect(screen.getByTestId("confetti-layer")).toBeTruthy();
    });

    it("renders confetti particles when motion is allowed", () => {
      const { container } = render(
        <LevelUpOverlay level={5} onDismiss={() => {}} />,
      );
      const particles = container.querySelectorAll("[data-confetti-particle]");
      expect(particles.length).toBeGreaterThan(0);
    });

    it("still renders the Soft-Clay Leo img when motion is allowed", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      expect(screen.getByAltText("Leo")).toBeTruthy();
    });

    it("still renders the level summary text when motion is allowed", () => {
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      expect(screen.getByText("Your habitat grew!")).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------
  // Case C: asset src L9 clamp — Math.min(level, 9)
  // ---------------------------------------------------------------
  describe("Case C: Soft-Clay Leo asset src L9 clamp", () => {
    it("uses widget-l5 for level 5", () => {
      vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
      render(<LevelUpOverlay level={5} onDismiss={() => {}} />);
      const img = screen.getByAltText("Leo") as HTMLImageElement;
      expect(img.src).toContain("widget-l5");
    });

    it("clamps to widget-l9 when level is 12 (L9 cap)", () => {
      vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
      render(<LevelUpOverlay level={12} onDismiss={() => {}} />);
      const img = screen.getByAltText("Leo") as HTMLImageElement;
      expect(img.src).toContain("widget-l9");
    });

    it("clamps to widget-l9 when level is 10 (dead branch level)", () => {
      vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
      render(<LevelUpOverlay level={10} onDismiss={() => {}} />);
      const img = screen.getByAltText("Leo") as HTMLImageElement;
      expect(img.src).toContain("widget-l9");
    });
  });
});
