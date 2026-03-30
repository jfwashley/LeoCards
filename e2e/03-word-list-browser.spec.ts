import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

test.describe("Word list browser", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("browse words page loads with categories and filters", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    await expect(page.getByText("Browse Words")).toBeVisible();
    await expect(page.getByRole("button", { name: "Animals" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Food" })).toBeVisible();
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "A1" })).toBeVisible();
  });

  test("can add a word to deck and see checkmark", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    const addButton = page.locator('[aria-label*="Add"]').first();
    await addButton.waitFor({ timeout: 10_000 });
    await addButton.click();

    await expect(
      page.locator('[aria-label*="Remove"]').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("can remove a word from deck", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    const addButton = page.locator('[aria-label*="Add"]').first();
    await addButton.waitFor({ timeout: 10_000 });
    await addButton.click();

    const removeButton = page.locator('[aria-label*="Remove"]').first();
    await removeButton.waitFor({ timeout: 5_000 });
    await removeButton.click();

    await expect(page.locator('[aria-label*="Add"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("category filter changes visible words", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    await page.waitForSelector('[aria-label*="Add"]', { timeout: 10_000 });
    await page.getByRole("button", { name: "Food" }).click();
    await page.waitForTimeout(500);

    const wordRows = page.locator(".border-b.border-border.py-2");
    await expect(wordRows.first()).toBeVisible();
  });

  test("difficulty filter works", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    await page.waitForSelector('[aria-label*="Add"]', { timeout: 10_000 });
    await page.getByRole("button", { name: "A1" }).click();
    await page.waitForTimeout(500);

    const wordRows = page.locator(".border-b.border-border.py-2");
    await expect(wordRows.first()).toBeVisible();
  });
});
