import { expect, test } from "playwright/test";
import { testEmail } from "./helpers";

/**
 * Wait for the Next.js dev server to finish compiling before asserting UI.
 * Mirrors the same helper in helpers.ts (not exported from there).
 */
async function waitForCompilation(
  page: import("playwright/test").Page,
): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

test.describe("Password reset — forgot & reset", () => {
  /**
   * ONB-03 — Privacy-safe confirmation
   * The forgot-password page must show "If an account exists..." copy
   * regardless of whether the submitted email is registered. This prevents
   * account-existence enumeration (T-19-03-ENUM).
   */
  test("forgot-password: submitting an unregistered email shows the privacy-safe confirmation", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await waitForCompilation(page);

    // Page renders with Email field and Send reset link button
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toBeVisible();

    // Fill a never-registered email and submit
    await page.getByLabel("Email").fill(testEmail());
    await page.getByRole("button", { name: "Send reset link" }).click();

    // Privacy-safe confirmation must appear — same copy whether or not
    // the email is registered; must NOT say "we sent a link to [email]"
    // without the conditional prefix that avoids account existence leaks.
    await expect(page.getByText(/If an account exists/)).toBeVisible({
      timeout: 15_000,
    });
  });

  /**
   * ONB-04 — Expired-link dead-end (no token path)
   * Visiting /reset-password without a ?token= query param must render the
   * expired dead-end UI and provide a route back to /forgot-password.
   */
  test("reset-password: no token shows the expired dead-end with a route back to forgot-password", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await waitForCompilation(page);

    // The expired dead-end heading must be visible
    await expect(
      page.getByRole("heading", { name: /link expired/i }),
    ).toBeVisible({ timeout: 10_000 });

    // A "Request a new link" control must be present
    const requestNewLink = page.getByRole("button", {
      name: "Request a new link",
    });
    await expect(requestNewLink).toBeVisible({ timeout: 5_000 });

    // Clicking it must navigate to /forgot-password
    await requestNewLink.click();
    await page.waitForURL(/\/forgot-password/, { timeout: 15_000 });
  });

  /**
   * Password-mismatch cross-field validation
   * Filling mismatched New password / Confirm password on a reset page with
   * a token must trigger the zod .refine error client-side — before any
   * token call reaches the server.
   */
  test("reset-password: mismatched passwords show 'do not match' error before any token call", async ({
    page,
  }) => {
    // Use a syntactically valid but semantically invalid token — the
    // mismatch error fires client-side via zod; the server is never called.
    await page.goto("/reset-password?token=invalid-token-xyz");
    await waitForCompilation(page);

    // Form fields are visible
    await expect(page.getByLabel("New password")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByLabel("Confirm password")).toBeVisible();

    // Fill mismatched values and submit
    await page.getByLabel("New password").fill("GoodPass123!");
    await page.getByLabel("Confirm password").fill("DifferentPass456!");
    await page.getByRole("button", { name: "Set new password" }).click();

    // The cross-field mismatch error must appear inline
    await expect(page.getByText(/do not match/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
