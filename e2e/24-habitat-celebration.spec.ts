// 24-habitat-celebration.spec.ts — Phase 24 Wave 0 (Plan 24-01 Task 1).
//
// e2e: Navigate to /habitat?celebrate=5 (after deck setup) and assert that
// the HabitatCelebration overlay appears then auto-settles after ~2.5s (D-07).

import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

test.describe("Habitat — level-up celebration (HAB-05)", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("celebration overlay appears when ?celebrate=5 is set", async ({
    page,
  }) => {
    await page.goto("/habitat?celebrate=5");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});
    await expect(page.getByTestId("habitat-celebration")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("celebration overlay disappears after ~3s (D-07 auto-settle)", async ({
    page,
  }) => {
    await page.goto("/habitat?celebrate=5");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});
    await expect(page.getByTestId("habitat-celebration")).toBeVisible({
      timeout: 10_000,
    });
    // 2.5s settle timer + 700ms buffer
    await page.waitForTimeout(3200);
    await expect(page.getByTestId("habitat-celebration")).not.toBeVisible();
  });
});
