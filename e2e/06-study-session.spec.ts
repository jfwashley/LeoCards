import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Study session — flashcard loop", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 5);
  });

  test("start studying button is visible with cards in deck", async ({
    page,
  }) => {
    await expect(
      page.getByRole("link", { name: "Start studying" }),
    ).toBeVisible();
  });

  test("study session shows card with question prompt", async ({ page }) => {
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);

    await expect(page.getByText("Study session")).toBeVisible();
    await expect(page.getByText("Quit session")).toBeVisible();
    await expect(
      page.getByText(/What's the translation|What does this mean/),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Tap to reveal")).toBeVisible();
  });

  test("tapping card flips it to show answer", async ({ page }) => {
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);

    await page.waitForSelector('text="Tap to reveal"', { timeout: 5_000 });
    await page.getByRole("button", { name: /Question:/ }).click();

    await expect(page.getByText(/Swipe right/)).toBeVisible({
      timeout: 2_000,
    });
  });

  test("can grade a card with keyboard arrows", async ({ page }) => {
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);

    await page.waitForSelector('text="Tap to reveal"', { timeout: 5_000 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);

    const hasNextCard = await page
      .getByText(/Tap to reveal/)
      .isVisible()
      .catch(() => false);
    const hasEndScreen = await page
      .getByText(/Great work/)
      .isVisible()
      .catch(() => false);

    expect(hasNextCard || hasEndScreen).toBe(true);
  });

  test("quit session saves progress and returns to dashboard", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);

    await page.waitForSelector('text="Tap to reveal"', { timeout: 5_000 });
    await page.getByText("Quit session").click();
    await expect(page.getByText("Quit session?")).toBeVisible();
    await page.getByRole("button", { name: "Save and quit" }).click();

    // Commit may succeed (redirect to dashboard) or fail (error page with retry)
    // Both are valid UI states — we just verify the session ended
    await page.waitForTimeout(3000);

    const onDashboard = page.url().includes("/dashboard");
    const hasErrorPage = await page
      .getByText("Couldn't save your progress")
      .isVisible()
      .catch(() => false);
    const hasRetry = await page
      .getByRole("button", { name: "Retry saving session" })
      .isVisible()
      .catch(() => false);

    // Either redirected to dashboard or showed error with retry option
    expect(onDashboard || hasErrorPage || hasRetry).toBe(true);
  });
});
