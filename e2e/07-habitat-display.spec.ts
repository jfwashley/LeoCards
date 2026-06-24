import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

test.describe("Habitat — widget and full page", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("habitat widget is visible on dashboard", async ({ page }) => {
    await expect(page.getByText(/Level 1/)).toBeVisible({ timeout: 5_000 });
    // HabitatMedallion (Plan 03) carries data-testid="habitat-medallion"
    await expect(page.getByTestId("habitat-medallion")).toBeVisible();
    // HabitatHero subtitle shows "N of M cards to Level N+1" (Daybreak DSH-02)
    await expect(page.getByText(/\d+ of \d+ cards/)).toBeVisible();
  });

  test("habitat widget links to /habitat", async ({ page }) => {
    // Verify the widget link exists and points to /habitat
    const widgetLink = page.locator('a[href*="/habitat"]').first();
    await expect(widgetLink).toBeVisible({ timeout: 10_000 });
    const href = await widgetLink.getAttribute("href");
    expect(href).toContain("/habitat");

    // Navigate directly — clicking is unreliable due to PixiJS canvas overlay
    await page.goto(href ?? "/habitat");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});
    // Retargeted: HLevelBadge renders "LVL\n{N}", not "Level N" (Phase 24 re-skin)
    await expect(page.getByTestId("habitat-level-badge")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("habitat page shows mood indicator", async ({ page }) => {
    await page.goto("/habitat");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});

    // Retargeted: HMoodChip carries data-testid="habitat-mood-chip" (Phase 24 re-skin)
    await expect(page.getByTestId("habitat-mood-chip")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("habitat page has loading state for PixiJS", async ({ page }) => {
    await page.goto("/habitat");

    // Wait for page to settle
    await page.waitForTimeout(3000);

    const hasSpinner = await page
      .locator('[aria-label="Loading habitat"]')
      .isVisible()
      .catch(() => false);
    const hasCanvas = await page
      .locator("canvas")
      .isVisible()
      .catch(() => false);
    // Retargeted: HMoodChip carries data-testid="habitat-mood-chip" (Phase 24 re-skin)
    const hasMood = await page
      .getByTestId("habitat-mood-chip")
      .isVisible()
      .catch(() => false);

    expect(hasSpinner || hasCanvas || hasMood).toBe(true);
  });
});
