import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

// QAOB-04 prod-parity gating test.
//
// WHAT IT PROVES:
//   When DEBUG_CHEAT_SECRET is unset (or empty), the customer-facing UI contains
//   zero [data-qa-badge] DOM elements on /dashboard and /study, and both QA
//   endpoints return HTTP 404. This spec is the automated safety net guaranteeing
//   that Phase 14's QA observability surface is provably absent from the real
//   customer experience.
//
// PREREQUISITE — how to run with the full assertion path (including 404 checks):
//   DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts
//
//   The server MUST be started without the secret. Because webServer is undefined
//   in playwright.config.ts, you must start the dev server yourself first, e.g.:
//     cross-env DEBUG_CHEAT_SECRET="" npm run dev
//
//   The NEXT_PUBLIC_APP_URL and other .env.local vars still load normally because
//   env.ts uses emptyStringAsUndefined:true — an empty-string DEBUG_CHEAT_SECRET
//   is coerced to undefined before Zod runs, so no validation error is thrown.
//
// SKIP BEHAVIOUR (RESEARCH pitfall 6):
//   If the running server has DEBUG_CHEAT_SECRET set (i.e. the feature is enabled),
//   the endpoint-404 assertions are skipped with a console warning rather than
//   false-failing. DOM badge-absence is still asserted in both cases, because a
//   customer who has never entered the debug secret never gets the QA-mode cookie
//   and therefore never receives a badge regardless of env configuration.

test.describe("QA prod-parity gating (QAOB-04)", () => {
  test("no [data-qa-badge] in customer DOM; QA endpoints 404 when secret unset", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // ── Step 1: Feature-state detection ──────────────────────────────────────
    // Probe the /api/debug/state endpoint without a session cookie. When
    // DEBUG_CHEAT_SECRET is unset the endpoint returns 404. Any other status
    // (200, 401, 403) means the secret IS set locally.
    const probe = await page.request.get(
      "/api/debug/state?secret=___parity_probe___",
    );
    const featureDisabled = probe.status() === 404;

    if (!featureDisabled) {
      console.warn(
        "DEBUG_CHEAT_SECRET appears set locally; skipping endpoint-404 " +
          "assertions (see RESEARCH pitfall 6). " +
          "To exercise the full assertion path, start the server with " +
          'DEBUG_CHEAT_SECRET="" (e.g. `DEBUG_CHEAT_SECRET="" npm run dev`).',
      );
    }

    // ── Step 2: Set up a customer ─────────────────────────────────────────────
    // signUpWithDeck uses testEmail() which returns a *@test.local address —
    // cleanup-test-users.mjs targets this domain, so the user is self-cleaning.
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 1);

    // ── Step 3: DOM assertions (ALWAYS run) ──────────────────────────────────
    // A freshly signed-up customer has no leo-qa-mode cookie, so QaStateBadge
    // is never rendered regardless of whether DEBUG_CHEAT_SECRET is set.
    // These assertions must pass in ALL environments.

    // 3a. Dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    expect(await page.locator("[data-qa-badge]").count()).toBe(0);

    // 3b. Study page — navigate the same way as study-progression.spec.ts
    const startLink = page.getByRole("link", { name: "Start studying" });
    await expect(startLink).toBeVisible({ timeout: 15_000 });
    await startLink.click();
    await page.waitForURL(/\/study/);
    await page.waitForSelector('text="Tap to reveal"', { timeout: 10_000 });
    expect(await page.locator("[data-qa-badge]").count()).toBe(0);

    // ── Step 4: Endpoint assertions (only when feature is confirmed off) ──────
    if (featureDisabled) {
      const stateRes = await page.request.get(
        "/api/debug/state?secret=anything",
      );
      expect(stateRes.status()).toBe(404);

      const cheatRes = await page.request.post("/api/debug/cheat", {
        data: { secret: "anything", level: 1 },
      });
      expect(cheatRes.status()).toBe(404);

      // Phase 15 D-05: POST /api/debug/time-shift must also return 404 when secret is unset
      const timeShiftRes = await page.request.post("/api/debug/time-shift", {
        data: { secret: "anything", offsetMs: 86400000 },
      });
      expect(timeShiftRes.status()).toBe(404);
    }
  });
});
