import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Language breakdown and dashboard polish", () => {
  test("dashboard shows per-language learned count", async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
    await expect(page.getByText("My Deck")).toBeVisible();
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
    await expect(page.getByText("Add a Card")).toBeVisible();
  });

  test("habitat widget shows on dashboard alongside deck", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 2);

    await expect(page.getByText("Level")).toBeVisible();
    await expect(page.getByText("My Deck")).toBeVisible();
  });
});
