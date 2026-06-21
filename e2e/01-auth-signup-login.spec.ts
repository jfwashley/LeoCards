import { expect, test } from "playwright/test";
import { signIn, signUpWithDeck, testEmail, waitForCompilation } from "./helpers";

test.describe("Authentication — signup and login", () => {
  test("login page renders with form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("signup page renders with all fields (no native language field — ONB-02)", async ({
    page,
  }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
    // ONB-02: signup form must NOT have a "Native language" field (moved to /welcome)
    await expect(page.getByLabel("Native language")).not.toBeVisible();
  });

  test("can create a new account and reach dashboard", async ({ page }) => {
    await signUpWithDeck(page);
    // After completing the welcome flow, the deck view is visible
    await expect(page.getByText("French")).toBeVisible({ timeout: 10_000 });
  });

  test("shows error for duplicate email signup", async ({ page }) => {
    const password = "TestPass123!";
    const { email } = await signUpWithDeck(page);

    // Sign out (header visible after deck creation)
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    // Try same email again
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Second User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("already exists")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can sign out and sign back in with same credentials", async ({
    page,
  }) => {
    const password = "TestPass123!";
    const { email } = await signUpWithDeck(page);

    // Sign out
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    // Sign back in
    await signIn(page, email, password);
    expect(page.url()).toContain("/dashboard");
  });

  test("shows validation errors for empty form submission", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("valid email")).toBeVisible({ timeout: 3_000 });
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  // ONB-01 / CR-01: a crafted ?callbackUrl must not redirect off-site after login.
  test("login callbackUrl cannot open-redirect off-site (CR-01)", async ({
    page,
  }) => {
    const password = "TestPass123!";
    const { email } = await signUpWithDeck(page);

    // Sign out so we hit a fresh, unauthenticated login form
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    // Attempt an open redirect via the ?callbackUrl query param
    await page.goto("/login?callbackUrl=https://evil.example.com");
    await waitForCompilation(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Must land on the same-origin dashboard, never the external URL
    await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("evil.example.com");
  });
});
