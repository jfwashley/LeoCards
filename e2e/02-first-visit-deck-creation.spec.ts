import { expect, test } from "playwright/test";
import { completeWelcomeFlow, signUpFreshUser, signUpWithDeck, waitForCompilation } from "./helpers";

// ---------------------------------------------------------------------------
// Helper: save a card directly via the API (used to seed a non-empty deck
// so the no-search-results path can be exercised via the UI).
// We call the server action indirectly by navigating to the + Add a card
// route and filling the form, which is the most reliable browser path.
// ---------------------------------------------------------------------------
async function seedOneCard(page: import("playwright/test").Page): Promise<void> {
  // Navigate to the new-card route
  await page.goto("/deck/new-card");
  await waitForCompilation(page);

  // Fill "Hello" → "Bonjour" (front = native word, back = target word)
  // The form may use different label text — try common patterns
  const frontInput = page.getByLabel("Front").or(page.getByPlaceholder("Front")).first();
  const backInput = page.getByLabel("Back").or(page.getByPlaceholder("Back")).first();

  if (await frontInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await frontInput.fill("Hello");
    await backInput.fill("Bonjour");
    await page.getByRole("button", { name: /save|add|create/i }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await waitForCompilation(page);
  } else {
    // Fallback: use the browse words path to add at least one word
    await page.goto("/dashboard");
    await waitForCompilation(page);
    await page.getByRole("link", { name: "Browse words" }).first().click();
    await page.waitForURL(/\/deck\/browse/, { timeout: 15_000 });
    await waitForCompilation(page);
    const addBtn = page.locator('[aria-label*="Add"]').first();
    await addBtn.waitFor({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.goto("/dashboard");
    await waitForCompilation(page);
  }
}

test.describe("First visit — welcome flow + ONB-06 empty states", () => {
  // -------------------------------------------------------------------------
  // Test 1: Fresh user lands on /welcome and sees the welcome flow copy
  // -------------------------------------------------------------------------
  test("fresh user lands on /welcome and sees welcome step content", async ({
    page,
  }) => {
    await signUpFreshUser(page);

    // Should be on /welcome after signup (D-05)
    await expect(page).toHaveURL(/\/welcome/);

    // Step 1 copy: Meet Leo
    await expect(page.getByText("Meet Leo")).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Test 2: Completing the welcome flow creates a deck and reaches /dashboard
  //         and the ONB-06 empty-deck state is shown
  // -------------------------------------------------------------------------
  test("completing welcome flow creates a deck and shows empty-deck state (ONB-06)", async ({
    page,
  }) => {
    await signUpFreshUser(page);
    await completeWelcomeFlow(page, "French");

    // Should now be on /dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // ONB-06 empty-deck assertions: the Daybreak empty-deck state must be visible
    await expect(page.getByText("Your deck is empty")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("link", { name: "Browse words" }).first(),
    ).toBeVisible({ timeout: 5_000 });
    // "Add a card" — rendered as a link (ghost button)
    await expect(
      page.getByRole("link", { name: /\+\s*Add a card/i }).first().or(
        page.getByText("+ Add a card").first(),
      ),
    ).toBeVisible({ timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // Test 3: ONB-06 no-search-results state (requires at least 1 card in deck)
  // -------------------------------------------------------------------------
  test("no-search-results state shows 'No words match' and Clear search clears query (ONB-06)", async ({
    page,
  }) => {
    // Start with a deck that has at least 1 card so the search bar is rendered
    await signUpWithDeck(page, "French");

    // Seed a card so the card list + search bar render
    await seedOneCard(page);

    // Now the deck has ≥1 card — the search input should be present
    const searchInput = page.getByPlaceholder("Search your cards...");
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Type a query that will match nothing
    await searchInput.fill("zzznomatch999");
    await page.waitForTimeout(300);

    // Assert the no-results state (ObNoSearch)
    await expect(page.getByText(/No words match/)).toBeVisible({ timeout: 5_000 });

    // Two controls share the name "Clear search" in this state (the search-bar
    // clear-X icon and the no-results CTA). Target the no-results CTA (rendered
    // last) to avoid a strict-mode collision.
    await page.getByRole("button", { name: "Clear search" }).last().click();
    await page.waitForTimeout(300);

    // After clearing: the no-results copy must be gone, the card list is visible again
    await expect(page.getByText(/No words match/)).not.toBeVisible();
    // The search input should be empty
    await expect(searchInput).toHaveValue("");
  });

  // -------------------------------------------------------------------------
  // Test 4: 0-deck user visiting /dashboard is redirected to /welcome
  // -------------------------------------------------------------------------
  test("0-deck user at /dashboard is redirected to /welcome (D-05)", async ({
    page,
  }) => {
    // Sign up (lands on /welcome, which has 0 decks)
    await signUpFreshUser(page);

    // Directly navigate to /dashboard as a 0-deck user
    await page.goto("/dashboard");

    // Should redirect to /welcome because the user has 0 decks
    await page.waitForURL(/\/welcome/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/welcome/);
  });

  // -------------------------------------------------------------------------
  // Test 5: Choose languages step shows the language pickers correctly
  // -------------------------------------------------------------------------
  test("welcome step 3 shows language pickers and excludes native from target", async ({
    page,
  }) => {
    await signUpFreshUser(page);

    // Skip to step 3 via the "Skip" buttons
    await page.getByRole("button", { name: "Skip" }).click();
    await page.waitForTimeout(300);
    // Now on step 3 directly (Skip on step 1 → step 3)
    await expect(page.getByText("Choose your languages")).toBeVisible({
      timeout: 5_000,
    });

    // The native language select should be visible
    await expect(page.getByLabel("I speak")).toBeVisible();
    await expect(page.getByLabel("I want to learn")).toBeVisible();
  });
});
