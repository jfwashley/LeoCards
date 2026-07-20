import { expect, type Locator, test } from "playwright/test";
import {
  clickAndWaitForNetworkSettle,
  getPendingEmailChangeToken,
  signIn,
  signUpWithDeck,
  testEmail,
  waitForCompilation,
} from "./helpers";

// e2e/25-my-account.spec.ts — Phase 25 full account-flow coverage
// (ACC-01/04/05/06). Reaches /account from the dashboard header glyph,
// proves the details/change-password/sign-out/delete-account pipeline
// against the REAL backend (throwaway *test.local users, no mocks), and
// exercises the D-07 email-change pending state. The token round-trip
// itself is opportunistic: it runs when the test-only DB seam in
// ./helpers (getPendingEmailChangeToken) can resolve a token, and falls
// back to asserting only the pending-banner state otherwise — either way,
// no live inbox is required (see 25-05-PLAN.md's Interfaces section and
// RESEARCH.md's Validation Architecture).

const PASSWORD = "TestPass123!"; // signUpFreshUser's default password.
const NEW_PASSWORD = "NewTestPass456!";

/**
 * Assert a locator's rendered box clears the project's 44px touch-target
 * floor on both axes. Narrows via `if (box === null) throw` BEFORE the
 * expect calls — never `box?.height`/`box?.width` inside an expect
 * ARGUMENT (biome forbids `!`, and optional chaining in an expect argument
 * fails tsc — the Phase 23 lesson carried into 25-UI-SPEC.md's Spacing
 * Scale "44px is a hard floor" note).
 */
async function assertTouchTarget(
  locator: Locator,
  label: string,
): Promise<void> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(
      `${label}: boundingBox() returned null (not visible/attached)`,
    );
  }
  expect(box.height, `${label} height`).toBeGreaterThanOrEqual(44);
  expect(box.width, `${label} width`).toBeGreaterThanOrEqual(44);
}

test.describe("My Account — full flow (ACC-01, ACC-04, ACC-05, ACC-06)", () => {
  test("reach /account, details render, touch targets, change password, email pending-banner, logout", async ({
    page,
  }) => {
    // Generous budget: this test chains signup + several mutation round
    // trips + a sign-out/sign-in cycle across multiple cold-compiled
    // routes (/dashboard, /account, /login) in a single run. Precedent:
    // e2e/tmp-nav-profile.spec.ts and e2e/14-qa-parity.spec.ts both raise
    // test.setTimeout for comparably long flows.
    test.setTimeout(300_000);

    const { email } = await signUpWithDeck(page);

    // 1. Reach — dashboard header glyph -> /account.
    const navBtn = page.getByTestId("account-nav-btn");
    await expect(navBtn).toBeVisible();
    await assertTouchTarget(navBtn, "account-nav-btn (dashboard)");

    await navBtn.click();
    await page.waitForURL(/\/account/, { timeout: 10_000 });
    await waitForCompilation(page);

    // Details render: name / email / "Member since" / "I speak".
    const detailsCard = page.getByTestId("account-details-card");
    await expect(detailsCard).toBeVisible();
    await expect(detailsCard).toContainText("QA Tester");
    await expect(detailsCard).toContainText(email);
    await expect(detailsCard).toContainText("Member since");
    await expect(detailsCard).toContainText("I speak");
    await expect(detailsCard).toContainText("English");

    // 2. Touch target — account-back-btn on /account.
    await assertTouchTarget(
      page.getByTestId("account-back-btn"),
      "account-back-btn (/account)",
    );

    // 3a. Change password — wrong current password shows the inline error.
    await page.getByTestId("account-password-row").click();
    await page
      .getByTestId("account-password-current-field")
      .fill("WrongPassword999!");
    await page.getByTestId("account-password-new-field").fill(NEW_PASSWORD);
    await page.getByTestId("account-password-confirm-field").fill(NEW_PASSWORD);
    await clickAndWaitForNetworkSettle(
      page,
      page.getByTestId("account-password-save-btn"),
    );
    await expect(page.getByText("That password isn't right.")).toBeVisible();

    // 3b. Happy path — correct current password (new/confirm already
    // filled and valid from the failed attempt above; only success clears
    // the fields, so they survive the retry).
    await page.getByTestId("account-password-current-field").fill(PASSWORD);
    await clickAndWaitForNetworkSettle(
      page,
      page.getByTestId("account-password-save-btn"),
    );
    const passwordSuccess = page.getByTestId("account-password-success");
    await expect(passwordSuccess).toBeVisible();
    await expect(passwordSuccess).toContainText("Password updated");

    // Prove the new password actually applies: sign out, sign back in
    // with it (revokeOtherSessions:true does not sign THIS device out).
    await page.getByTestId("account-logout-btn").click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await signIn(page, email, NEW_PASSWORD);

    // 4. Email pending-banner — back to /account, change the email.
    await page.getByTestId("account-nav-btn").click();
    await page.waitForURL(/\/account/, { timeout: 10_000 });
    await waitForCompilation(page);

    const newEmail = testEmail();
    await page.getByTestId("account-edit-btn").click();
    await page.getByTestId("account-email-field").fill(newEmail);
    await clickAndWaitForNetworkSettle(
      page,
      page.getByTestId("account-save-btn"),
    );

    const pendingBanner = page.getByTestId("account-email-pending-banner");
    await expect(pendingBanner).toBeVisible();
    await expect(pendingBanner).toContainText(
      `Verification sent to ${newEmail}`,
    );
    // The active email stays the OLD address until the link is clicked
    // (D-07) — assert the details card (not the banner) still shows it.
    await expect(detailsCard).toContainText(email);
    await expect(detailsCard).not.toContainText(newEmail);

    // Token round-trip: exercised when the test-only DB seam resolves a
    // token; otherwise the pending-banner assertion above is this run's
    // full coverage and the request->click->success round trip stays
    // unit-covered by route.test.ts (no live inbox required either way).
    const token = await getPendingEmailChangeToken(newEmail);
    if (token !== null) {
      await page.goto(`/api/account/verify-email?token=${token}`);
      await waitForCompilation(page);
      const verifyBanner = page.getByTestId("account-verify-result-banner");
      await expect(verifyBanner).toBeVisible();
      await expect(verifyBanner).toContainText("Email verified");
    } else {
      console.log(
        "[e2e/25] Pending-email token seam unavailable in this " +
          "environment -- asserted the pending-banner state only; the " +
          "verify-email round trip stays unit-covered by route.test.ts.",
      );
    }

    // 5. Logout — ends the flow. Both branches above land back on
    // /account, so account-logout-btn is already reachable.
    await page.getByTestId("account-logout-btn").click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test("delete account — two-step confirm redirects to /login, old credentials rejected (D-14)", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const { email } = await signUpWithDeck(page);

    await page.getByTestId("account-nav-btn").click();
    await page.waitForURL(/\/account/, { timeout: 10_000 });
    await waitForCompilation(page);
    await expect(page.getByTestId("account-details-card")).toBeVisible();

    await page.getByTestId("account-delete-row").click();
    await expect(page.getByTestId("account-delete-confirm")).toBeVisible();

    await clickAndWaitForNetworkSettle(
      page,
      page.getByTestId("account-delete-confirm-btn"),
    );
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await waitForCompilation(page);

    // D-14: the deleted account's credentials must be rejected outright,
    // never silently accepted.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible({
      timeout: 10_000,
    });
    expect(page.url()).toContain("/login");
    expect(page.url()).not.toContain("/dashboard");
  });
});
