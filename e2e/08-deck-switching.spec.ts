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
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => {});
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
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => {});
    await page.waitForTimeout(2000);

    // Switch back to French deck.
    // After the Spanish-deck creation, the popover may still be open (Base UI
    // keeps it open during soft navigation; nobody explicitly closes it). If the
    // trigger is clicked while the popover is open it TOGGLES it closed. So we
    // first ensure the popover is closed (Escape / click page body), then open
    // it fresh to reach the FR option.
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    // Close any leftover popover with Escape before re-opening.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    // Open the deck picker. Base UI's PopoverTrigger has child <span> nodes
    // (LangChip + Chevron) over it — force:true dispatches the event directly
    // on the <button> element, matching how a real click lands on it.
    await trigger.click({ force: true });
    // Wait for the French deck option to appear (confirms popover is open).
    const frenchOption = page.getByTestId("deck-option-fr");
    await frenchOption.waitFor({ state: "visible", timeout: 10_000 });
    await frenchOption.click();
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => {});
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
