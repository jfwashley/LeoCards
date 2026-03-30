import type { Page } from "playwright/test";

/**
 * Generate a unique test email to avoid collisions between runs.
 */
export function testEmail(): string {
  return `qa+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@test.local`;
}

/**
 * Wait for the Next.js dev server to finish compiling.
 * Checks that no "Compiling..." or "Rendering..." indicator is visible.
 */
async function waitForCompilation(page: Page): Promise<void> {
  // Wait for networkidle first
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  // Then wait briefly to ensure any compilation overlay clears
  await page.waitForTimeout(1000);
}

/**
 * Sign up a fresh user and land on the dashboard.
 */
export async function signUpFreshUser(
  page: Page,
  opts?: { name?: string; password?: string },
): Promise<{ email: string }> {
  const email = testEmail();
  const name = opts?.name ?? "QA Tester";
  const password = opts?.password ?? "TestPass123!";

  await page.goto("/signup");
  await waitForCompilation(page);

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await waitForCompilation(page);

  return { email };
}

/**
 * Sign in with existing credentials.
 */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await waitForCompilation(page);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await waitForCompilation(page);
}

/**
 * Create a deck via the first-visit picker (fresh user with 0 decks).
 */
export async function pickFirstDeckLanguage(
  page: Page,
  language: "French" | "Spanish",
): Promise<void> {
  await page.waitForSelector('text="What language do you want to learn?"', {
    timeout: 15_000,
  });

  const btn = page.getByRole("button", { name: language });
  await btn.waitFor({ state: "visible", timeout: 5_000 });
  await btn.click();

  // Wait for deck creation + dashboard re-render
  await page.waitForSelector('text="My Deck"', { timeout: 30_000 });
  await waitForCompilation(page);
}

/**
 * Sign up AND create a deck — the common setup for most tests.
 */
export async function signUpWithDeck(
  page: Page,
  language: "French" | "Spanish" = "French",
): Promise<{ email: string }> {
  const result = await signUpFreshUser(page);
  await pickFirstDeckLanguage(page, language);
  return result;
}

/**
 * Add words from the word list browser.
 */
export async function addWordsFromBrowser(
  page: Page,
  count: number,
): Promise<void> {
  await page.getByRole("link", { name: "Browse words" }).first().click();
  await page.waitForURL(/\/deck\/browse/, { timeout: 15_000 });
  await waitForCompilation(page);

  await page.waitForSelector('[aria-label*="Add"]', { timeout: 15_000 });

  const addButtons = page.locator('[aria-label*="Add"]');
  const available = await addButtons.count();
  const toAdd = Math.min(count, available);

  for (let i = 0; i < toAdd; i++) {
    await addButtons.nth(i).click();
    await page.waitForTimeout(500);
  }

  // Navigate back via direct URL — more reliable than clicking "Back"
  await page.goto("/dashboard");
  await page.waitForSelector('text="My Deck"', { timeout: 15_000 });
  await waitForCompilation(page);
}
