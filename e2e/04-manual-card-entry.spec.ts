import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

test.describe("Manual card entry with auto-translation", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("add card page loads with two input fields", async ({ page }) => {
    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);

    await expect(page.getByTestId("add-card-title")).toBeVisible();
    await expect(page.getByLabel("English")).toBeVisible();
    await expect(page.getByLabel("French")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save card" })).toBeVisible();
  });

  test("typing in native field triggers auto-translation or shows error", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);

    await page.getByLabel("English").fill("hello");

    // Wait for debounce (500ms) + API call — translation may succeed or fail
    // depending on whether the translate API key is configured
    await page.waitForTimeout(4000);

    const targetValue = await page.getByLabel("French").inputValue();
    const hasError = await page
      .getByText("Translation unavailable")
      .isVisible()
      .catch(() => false);

    // Either translation filled in, or error message shown — both are valid
    expect(targetValue.length > 0 || hasError).toBe(true);
  });

  test("can save a card and see success message", async ({ page }) => {
    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);

    await page.getByLabel("English").fill("cat");
    await page.getByLabel("French").fill("chat");
    await page.getByRole("button", { name: "Save card" }).click();

    await expect(page.getByText(/Card saved/)).toBeVisible({ timeout: 5_000 });
    const nativeValue = await page.getByLabel("English").inputValue();
    expect(nativeValue).toBe("");
  });

  test("save button is disabled when fields are empty", async ({ page }) => {
    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);

    const saveButton = page.getByRole("button", { name: "Save card" });
    await expect(saveButton).toBeDisabled();

    await page.getByLabel("English").fill("test");
    await expect(saveButton).toBeDisabled();

    await page.getByLabel("French").fill("test");
    await expect(saveButton).toBeEnabled();
  });

  // D-07 regression guard: ACSeg toggle labels must be "Type a word" and "From an image"
  test('toggle shows "Type a word" and "From an image" segments (D-07)', async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);

    // "Type a word" segment is visible and initially active
    await expect(
      page.getByRole("button", { name: "Type a word" }),
    ).toBeVisible();

    // "From an image" segment is visible (label must read "From an image", not "From image")
    await expect(
      page.getByRole("button", { name: "From an image" }),
    ).toBeVisible();

    // Click "From an image" — the toggle switches
    await page.getByRole("button", { name: "From an image" }).click();
    await expect(
      page.getByRole("button", { name: "From an image" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
