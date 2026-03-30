import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Card management — search, edit, delete", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
  });

  test("cards appear in deck list after adding from browser", async ({
    page,
  }) => {
    await expect(page.getByText("Your deck is empty")).not.toBeVisible();
  });

  test("search filters cards as you type", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search your cards...");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("zzzzz");
    await page.waitForTimeout(200);
    await expect(page.getByText("No cards match")).toBeVisible();

    await page.getByLabel("Clear search").click();
    await expect(page.getByText("No cards match")).not.toBeVisible();
  });

  test("can open edit dialog and modify a card", async ({ page }) => {
    await page.getByLabel("Edit card").first().click();
    await expect(page.getByText("Edit card")).toBeVisible({ timeout: 3_000 });

    const frontInput = page.locator("#card-front");
    await expect(frontInput).toBeVisible();

    await frontInput.fill("modified-word");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Edit card")).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test("can delete a card with confirmation", async ({ page }) => {
    await page.getByLabel("Edit card").first().click();
    await expect(page.getByText("Edit card")).toBeVisible({ timeout: 3_000 });

    await page.getByText("Delete card").click();
    await expect(page.getByText("Delete this card?")).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete this card?")).not.toBeVisible({
      timeout: 3_000,
    });
  });
});
