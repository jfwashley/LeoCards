import type { Page } from "playwright/test";

/**
 * Generate a unique test email to avoid collisions between runs.
 */
export function testEmail(): string {
  return `qa+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@test.local`;
}

/**
 * Wait for the Next.js dev server to finish compiling.
 * Waits until the "Compiling..." overlay in the bottom-left disappears.
 */
export async function waitForCompilation(page: Page): Promise<void> {
  // NOTE: Do NOT use page.waitForLoadState("networkidle") here.
  // In Next.js dev mode (Turbopack), the HMR WebSocket keeps the connection
  // alive permanently — networkidle never fires, causing 30s timeouts per call.
  //
  // Instead, just wait for the "Compiling ..." text overlay to disappear.
  // This is the real signal that Turbopack is done compiling the current route.
  try {
    await page.waitForFunction(
      () => {
        // Look for any element containing "Compiling" text in the DOM
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
          if (node.nodeValue?.includes("Compiling")) return false;
        }
        return true;
      },
      { timeout: 30_000 },
    );
  } catch {
    // If still compiling after 30s, continue anyway — the route may already be
    // compiled and the overlay may not be visible on this page.
  }
  // Brief settle time for React hydration to complete
  await page.waitForTimeout(300);
}

/**
 * Sign up a fresh user and land on /welcome (post-D-05).
 * Fills Name / Email / Password and waits for the /welcome redirect.
 */
export async function signUpFreshUser(
  page: Page,
  opts?: { name?: string; password?: string },
): Promise<{ email: string }> {
  const email = testEmail();
  const name = opts?.name ?? "QA Tester";
  const password = opts?.password ?? "TestPass123!";

  // Clear any existing session so retries start from an unauthenticated state.
  // Without this, a retry after a timeout-on-redirect would re-use the previously
  // created session, causing authClient.signUp to return an error ("already authenticated"
  // manifests as "account already exists" in the signup UI).
  await page.context().clearCookies();

  // Pre-warm /welcome route so compilation completes before signup redirect hits it
  // (unauthenticated GET → 307 /login, but triggers Next.js RSC compilation of /welcome)
  await page.goto("/welcome").catch(() => {});
  await waitForCompilation(page);

  await page.goto("/signup");
  await waitForCompilation(page);

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  // Wait for any compilation to finish before submitting (first cold route load in dev)
  await waitForCompilation(page);

  await page.getByRole("button", { name: "Create account" }).click();
  // After D-05: signup redirects to /welcome (not /dashboard)
  // Extended timeout: first load of /welcome triggers RSC compilation
  await page.waitForURL(/\/welcome/, { timeout: 90_000 });
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
 * Complete the 3-step welcome flow and land on /dashboard.
 * Steps:
 *   1. Meet Leo  → click Next
 *   2. The promise → click Next
 *   3. Choose languages → select native + target → Start learning → wait for /dashboard
 *
 * NOTE: 19-03's e2e/03-forgot-reset-password.spec.ts imports testEmail/waitForCompilation
 * from this file — those exports are preserved above.
 */
export async function completeWelcomeFlow(
  page: Page,
  target: "French" | "Spanish" = "French",
  native = "English",
): Promise<void> {
  // Must already be on /welcome
  await page.waitForURL(/\/welcome/, { timeout: 15_000 });
  await waitForCompilation(page);

  // Step 1: Meet Leo — click Next
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(300);

  // Step 2: The promise — click Next
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(300);

  // Step 3: Choose languages
  // Select native language (I speak)
  await page.getByLabel("I speak").selectOption({ label: native });
  // Select target language (I want to learn)
  await page.getByLabel("I want to learn").selectOption({ label: target });

  // Click Start learning
  await page.getByRole("button", { name: /Start learning|Try again/ }).click();

  // Wait for deck creation + dashboard redirect (authClient.updateUser + createDeck)
  await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
  await waitForCompilation(page);
}

/**
 * Sign up AND create a deck — the common setup for most tests.
 * Preserved for backward compat with e2e/03-word-list-browser.spec.ts and other callers.
 */
export async function signUpWithDeck(
  page: Page,
  language: "French" | "Spanish" = "French",
): Promise<{ email: string }> {
  const result = await signUpFreshUser(page);
  await completeWelcomeFlow(page, language);
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
  await waitForCompilation(page);
}
