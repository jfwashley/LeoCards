// @vitest-environment jsdom
// Phase 23 Browse Words — shared rendered-component test scaffold.
// Covers BWMedallion (Plan 23-01). Plan 23-03 extends this file with
// BWWordRow / BWLevels / BrowseEmpty cases — do not duplicate the file.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BWMedallion } from "@/components/daybreak/bw-medallion";
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
