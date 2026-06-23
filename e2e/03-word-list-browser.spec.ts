import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

test.describe("Word list browser", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("browse words page loads with topics and level filters", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    // Landing: centered title + topic tiles (two-screen IA, Plan 23-03)
    await expect(page.getByTestId("browse-words-title")).toBeVisible();
    await expect(page.getByTestId("topic-tile-animals")).toBeVisible();
    await expect(page.getByTestId("topic-tile-food---drink")).toBeVisible();

    // Drill into Animals to verify CEFR level tile row appears on list screen
    await page.getByTestId("topic-tile-animals").click();
    await page.waitForURL(/topic=/);

    await expect(
      page.getByRole("button", { name: "All", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "A1", exact: true }),
    ).toBeVisible();
  });

  test("can add a word to deck and see checkmark", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    // Drill into Food & Drink (20 A2 words for French — densely populated)
    await page.getByTestId("topic-tile-food---drink").click();
    await page.waitForURL(/topic=/);

    const addButton = page.locator('[aria-label*="Add"]').first();
    await addButton.waitFor({ timeout: 10_000 });
    await addButton.click();

    await expect(page.locator('[aria-label*="Remove"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can remove a word from deck", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    // Drill into Food & Drink (20 A2 words for French — densely populated)
    await page.getByTestId("topic-tile-food---drink").click();
    await page.waitForURL(/topic=/);

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

  test("topic navigation shows word rows for selected topic", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    // Drill into Food & Drink — confirms category-scoped list renders word rows
    await page.getByTestId("topic-tile-food---drink").click();
    await page.waitForURL(/topic=Food/);

    const wordRows = page.locator('[data-testid="word-row"]');
    await expect(wordRows.first()).toBeVisible();
  });

  test("difficulty filter changes visible words", async ({ page }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    // Drill into Greetings (15 A1 words for French — filter by A1 confirms rows)
    await page.getByTestId("topic-tile-greetings").click();
    await page.waitForURL(/topic=/);

    // A1 filter — Greetings has 15 A1 words so rows must appear
    await page.getByRole("button", { name: "A1", exact: true }).click();
    await page.waitForTimeout(500);

    const wordRows = page.locator('[data-testid="word-row"]');
    await expect(wordRows.first()).toBeVisible();
  });

  // BRW-04: empty state + "Show all levels" reset
  // Animals (en-fr) has 20 A2 words and 0 A1 words — A1 filter is guaranteed empty.
  test("empty state appears when no words match level, Show all levels resets", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    // Animals: 20 A2 words, 0 A1 words (verified against en-fr.json)
    await page.getByTestId("topic-tile-animals").click();
    await page.waitForURL(/topic=/);

    // Select A1 — no words exist at this level for Animals in French
    await page.getByRole("button", { name: "A1", exact: true }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("No words at this level.")).toBeVisible();

    // Reset via "Show all levels" — word rows must reappear
    await page.getByRole("button", { name: "Show all levels" }).click();
    await page.waitForTimeout(300);

    const wordRows = page.locator('[data-testid="word-row"]');
    await expect(wordRows.first()).toBeVisible();
  });
});
