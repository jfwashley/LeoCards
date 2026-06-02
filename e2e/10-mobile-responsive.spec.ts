import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

const MOBILE = { width: 375, height: 812 };

test.describe("Mobile responsiveness", () => {
  test.use({ viewport: MOBILE });

  test("login page is usable on mobile", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width + 1);
  });

  test("signup page fits mobile viewport", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width + 1);
  });

  test("dashboard header does not overflow on mobile", async ({ page }) => {
    await signUpWithDeck(page, "French");

    await expect(page.getByText("LeoCards")).toBeVisible();
    await expect(page.getByText("Sign out")).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width + 1);
  });

  test("card list renders as stacked cards on mobile (not table)", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);

    const table = page.locator("table");
    await expect(table).not.toBeVisible();

    const mobileCards = page.locator(".border.border-border.rounded-lg");
    const count = await mobileCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("study session is usable on mobile", async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);

    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);

    await expect(page.getByText("Tap to reveal")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Quit session")).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width + 1);
  });

  test("word list browser works on mobile", async ({ page }) => {
    await signUpWithDeck(page, "French");

    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/);

    await expect(page.getByRole("button", { name: "Animals" })).toBeVisible();

    const addButton = page.locator('[aria-label*="Add"]').first();
    await addButton.waitFor({ timeout: 10_000 });
    const box = await addButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width + 1);
  });

  test("add card form stacks vertically on mobile", async ({ page }) => {
    await signUpWithDeck(page, "French");

    await page.getByRole("link", { name: "Add a card" }).click();
    await page.waitForURL(/\/deck\/new-card/);

    const englishField = page.getByLabel("English");
    const frenchField = page.getByLabel("French");
    await expect(englishField).toBeVisible();
    await expect(frenchField).toBeVisible();

    const engBox = await englishField.boundingBox();
    const frBox = await frenchField.boundingBox();
    expect(engBox).not.toBeNull();
    expect(frBox).not.toBeNull();
    expect(frBox!.y).toBeGreaterThan(engBox!.y);
  });

  // Mobile card-management affordances live in the stacked-card layout
  // (card-list.tsx `md:hidden`), NOT the desktop table. This verifies the
  // mobile Pause + Edit buttons are actually visible + usable on a phone
  // viewport (the table-based 05/12 specs are desktop-only and skip on mobile).
  test("card management affordances (pause, edit) are usable on mobile", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 2);

    // Pause: the VISIBLE button (mobile layout), not the hidden desktop table.
    const pause = page
      .locator('[aria-label="Pause this card"]:visible')
      .first();
    await expect(pause).toBeVisible();
    await pause.click();
    // The visible (mobile-layout) "Paused" badge — the desktop table also has a
    // hidden one, so scope to :visible rather than DOM-order .first().
    await expect(
      page.locator('span:text-is("Paused"):visible').first(),
    ).toBeVisible();

    // Resume toggles back.
    const resume = page
      .locator('[aria-label="Resume this card"]:visible')
      .first();
    await expect(resume).toBeVisible();
    await resume.click();

    // Edit: opens the dialog on mobile.
    const edit = page.locator('[aria-label="Edit card"]:visible').first();
    await expect(edit).toBeVisible();
    await edit.click();
    await expect(page.locator("#card-front")).toBeVisible({ timeout: 3_000 });
  });
});
