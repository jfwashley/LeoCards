import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Card management — search, edit, delete", () => {
  // These assert the Daybreak card-row layout (accordion-based, card-list.tsx).
  // On mobile the same rows are visible after expanding the accordion —
  // but pause/edit affordances on mobile are covered in 10-mobile-responsive.
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Desktop layout — mobile card management covered in 10-mobile-responsive",
    );
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
    // "Your words" accordion is collapsed by default (Daybreak DSH-04) — expand it
    await page.getByTestId("words-accordion-header").click();
    await expect(page.getByTestId("card-row").first()).toBeVisible();
  });

  test("cards appear in deck list after adding from browser", async ({
    page,
  }) => {
    await expect(page.getByText("Your deck is empty")).not.toBeVisible();
  });

  test("search filters cards as you type", async ({ page }) => {
    // The search lives inside the "Your words" accordion — expand it first (DSH-04)
    await page.getByTestId("words-accordion-header").click();
    const searchInput = page.getByTestId("words-search-input");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("zzzzz");
    await page.waitForTimeout(200);
    // Pre-existing stale selector fixed: component text is "No words match" (updated DSH-05)
    await expect(page.getByText(/No words match/)).toBeVisible();

    await page.getByLabel("Clear search").click();
    await expect(page.getByText(/No words match/)).not.toBeVisible();
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
