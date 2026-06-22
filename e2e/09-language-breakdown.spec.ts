import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Dashboard — habitat hero and deck integration", () => {
  test("dashboard shows learned count in words accordion header", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
    // Plan 05 adds the accordion header with data-testid="words-accordion-header"
    // showing "{N} learned". Click it to open (it starts collapsed).
    const accordionHeader = page.getByTestId("words-accordion-header");
    await expect(accordionHeader).toBeVisible();
    await expect(accordionHeader).toContainText(/\d+ learned/);
  });

  test("browse words and add card links work from empty deck", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");

    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);
    await expect(page.getByText("Browse Words")).toBeVisible();

    await page.getByRole("link", { name: "Back to my deck" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);
    await expect(page.getByTestId("add-card-title")).toBeVisible();
  });

  test("habitat hero shows on dashboard alongside deck", async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 2);

    // HabitatHero wraps a habitat-medallion (Plan 03 testid) — use the testid
    // to scope; getByText(/Level \d+/) matches both the hero title AND the subtitle
    // "N of M cards to Level N+1" causing a strict-mode multi-element error.
    await expect(page.getByTestId("habitat-medallion")).toBeVisible();
    // Confirm the hero title is present by scoping to the habitat-hero subtitle container
    await expect(page.getByTestId("habitat-hero-subtitle")).toBeVisible();
  });
});
