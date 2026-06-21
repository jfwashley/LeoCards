import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Deck switching — multiple decks", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 2);
  });

  test("can create a second deck via header dropdown", async ({ page }) => {
    // Open the deck picker popover
    const trigger = page.getByTestId("deck-picker-trigger");
    await trigger.click();

    // Wait for the dropdown content to render
    const newDeckOption = page.getByTestId("new-deck-row");
    await newDeckOption.waitFor({ state: "visible", timeout: 5_000 });
    await newDeckOption.click();

    // Language picker should appear
    const spanishBtn = page.getByRole("button", { name: "Spanish" });
    await spanishBtn.waitFor({ state: "visible", timeout: 5_000 });
    await spanishBtn.click();

    // Wait for page to settle with new empty deck
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await expect(page.getByText("Your deck is empty")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("switching back to first deck preserves cards", async ({ page }) => {
    // Create second deck
    const trigger = page.getByTestId("deck-picker-trigger");
    await trigger.click();
    const newDeckOption = page.getByTestId("new-deck-row");
    await newDeckOption.waitFor({ state: "visible", timeout: 5_000 });
    await newDeckOption.click();
    await page.getByRole("button", { name: "Spanish" }).click();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Switch back to French deck
    await trigger.click();
    const frenchOption = page.getByTestId("deck-option-fr");
    await frenchOption.waitFor({ state: "visible", timeout: 5_000 });
    await frenchOption.click();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // French deck should still have cards
    await expect(page.getByText("Your deck is empty")).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("cancel button hides language picker", async ({ page }) => {
    const trigger = page.getByTestId("deck-picker-trigger");
    await trigger.click();
    const newDeckOption = page.getByTestId("new-deck-row");
    await newDeckOption.waitFor({ state: "visible", timeout: 5_000 });
    await newDeckOption.click();

    await expect(page.getByText("Cancel")).toBeVisible({ timeout: 3_000 });
    await page.getByText("Cancel").click();
    await expect(page.getByText("Cancel")).not.toBeVisible({ timeout: 2_000 });
  });
});
