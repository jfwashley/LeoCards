// @vitest-environment jsdom
// Phase 17 (D-03) — DaybreakShimmer atom test.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DaybreakShimmer } from "@/components/daybreak/shimmer";

afterEach(() => cleanup());

describe("DaybreakShimmer", () => {
  it("renders without crashing", () => {
    const { container } = render(<DaybreakShimmer />);
    expect(container.firstChild).toBeTruthy();
  });

  it("honors an explicit width/height — the reserved box is present in the DOM (CLS-0 proof)", () => {
    const { container } = render(<DaybreakShimmer width={240} height={64} />);
    const el = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(el).toBeTruthy();
    // jsdom normalises numeric width/height -> "240px"/"64px"
    expect(el.style.width).toBe("240px");
    expect(el.style.height).toBe("64px");
  });

  it("defaults to a full-width, height:16 reserved box when no size props are given", () => {
    const { container } = render(<DaybreakShimmer />);
    const el = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("16px");
  });

  it("merges a passed className with the base db-shimmer class", () => {
    const { container } = render(<DaybreakShimmer className="my-extra" />);
    const el = container.querySelector(".db-shimmer") as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain("db-shimmer");
    expect(el.className).toContain("my-extra");
  });

  it("carries aria-hidden (decorative, mirrors bw-medallion.tsx)", () => {
    const { container } = render(<DaybreakShimmer />);
    const el = container.querySelector('[aria-hidden="true"]');
    expect(el?.getAttribute("aria-hidden")).toBe("true");
  });
});
