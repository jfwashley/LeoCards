// @vitest-environment jsdom
// Phase 27-08 (PERF-22) — regression guard against re-introducing
// `backdrop-filter` blur on the over-video habitat overlay chrome. The blur
// forced the GPU to re-blur its backdrop every video frame for as long as
// the habitat clip loops; the backgrounds are already ~92%-opaque, so the
// blur was removed with no visible panel-contrast change. This test asserts
// the DOM-computed inline style never carries `backdropFilter` for the 3
// presentational atoms that render this way (D-01, trivially revertible).
//
// account-back.tsx is DELIBERATELY excluded (D-02 boundary) — it's a static
// page with no per-frame cost, and its own blur is untouched by this plan.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HBack } from "@/components/daybreak/h-back";
import { HMoodChip } from "@/components/daybreak/h-mood-chip";
import { HProgCard } from "@/components/daybreak/h-prog-card";

afterEach(() => cleanup());

describe("Habitat overlay chrome — no backdrop-filter over the playing video (PERF-22)", () => {
  it("HBack: circular back button carries no backdropFilter style", () => {
    const { getByTestId } = render(<HBack />);
    const el = getByTestId("habitat-back-btn") as HTMLElement;
    expect(el.style.backdropFilter).toBe("");
  });

  it("HMoodChip: mood pill carries no backdropFilter style", () => {
    const { getByTestId } = render(<HMoodChip mood="happy" />);
    const el = getByTestId("habitat-mood-chip") as HTMLElement;
    expect(el.style.backdropFilter).toBe("");
  });

  it("HProgCard: progress card carries no backdropFilter style", () => {
    const { getByTestId } = render(
      <HProgCard level={3} effectiveCardCount={10} nextLevelThreshold={20} />,
    );
    const el = getByTestId("habitat-prog-card") as HTMLElement;
    expect(el.style.backdropFilter).toBe("");
  });

  it("HProgCard at L9 max (nextLevelThreshold null) still carries no backdropFilter style", () => {
    const { getByTestId } = render(
      <HProgCard level={9} effectiveCardCount={50} nextLevelThreshold={null} />,
    );
    const el = getByTestId("habitat-prog-card") as HTMLElement;
    expect(el.style.backdropFilter).toBe("");
  });
});
