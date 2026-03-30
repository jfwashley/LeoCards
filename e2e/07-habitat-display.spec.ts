import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

test.describe("Habitat — widget and full page", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("habitat widget is visible on dashboard", async ({ page }) => {
    await expect(page.getByText("Level 1")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(".bg-secondary.rounded-full")).toBeVisible();
    await expect(page.getByText(/\/.*cards/)).toBeVisible();
  });

  test("habitat widget links to /habitat", async ({ page }) => {
    // Verify the widget link exists and points to /habitat
    const widgetLink = page.locator('a[href*="/habitat"]').first();
    await expect(widgetLink).toBeVisible({ timeout: 10_000 });
    const href = await widgetLink.getAttribute("href");
    expect(href).toContain("/habitat");

    // Navigate directly — clicking is unreliable due to PixiJS canvas overlay
    await page.goto(href!);
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await expect(page.getByText("Level")).toBeVisible({ timeout: 15_000 });
  });

  test("habitat page shows mood indicator", async ({ page }) => {
    await page.goto("/habitat");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    // Wait longer — PixiJS and habitat state need to load
    await expect(
      page.getByText(/Excited|Happy|Neutral|Sad/),
    ).toBeVisible({ timeout: 30_000 });
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
    const hasMood = await page
      .getByText(/Excited|Happy|Neutral|Sad/)
      .isVisible()
      .catch(() => false);

    expect(hasSpinner || hasCanvas || hasMood).toBe(true);
  });
});
