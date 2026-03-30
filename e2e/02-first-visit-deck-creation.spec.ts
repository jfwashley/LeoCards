import { expect, test } from "playwright/test";
import { pickFirstDeckLanguage, signUpFreshUser } from "./helpers";

test.describe("First visit — deck creation", () => {
  test("fresh user sees language picker on dashboard", async ({ page }) => {
    await signUpFreshUser(page);

    await expect(
      page.getByText("What language do you want to learn?"),
    ).toBeVisible();

    // Should show learning language options (not native English)
    await expect(page.getByRole("button", { name: "French" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spanish" })).toBeVisible();
  });

  test("clicking a language creates a deck and shows dashboard", async ({
    page,
  }) => {
    await signUpFreshUser(page);
    await pickFirstDeckLanguage(page, "French");

    // Dashboard should now show "My Deck" heading
    await expect(page.getByText("My Deck")).toBeVisible({ timeout: 10_000 });

    // Empty deck: either the empty state or the browse words link should appear
    const hasEmptyState = await page
      .getByText("Your deck is empty")
      .isVisible()
      .catch(() => false);
    const hasBrowseLink = await page
      .getByRole("link", { name: "Browse words" })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasEmptyState || hasBrowseLink).toBe(true);
  });

  test("header shows deck switcher after deck creation", async ({ page }) => {
    await signUpFreshUser(page);
    await pickFirstDeckLanguage(page, "Spanish");

    // Header should contain LeoCards branding and sign out
    await expect(page.getByText("LeoCards")).toBeVisible();
    await expect(page.getByText("Sign out")).toBeVisible();

    // Deck name should be visible in header (the select trigger)
    await expect(page.getByText("Spanish")).toBeVisible();
  });
});
