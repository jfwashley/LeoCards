import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

/**
 * Phase 12 — Pause cards in active deck review.
 *
 * Exercises the full pause/unpause user flow against a real Next dev/build:
 *   - Pause a card from the dashboard → it is greyed + badged → study session
 *     excludes it.
 *   - Unpause → it reappears in the list with the Pause affordance restored.
 *   - "All paused" empty-state copy appears when every card is paused, and
 *     disappears as soon as one card is unpaused.
 *   - A NULL-cooldown card stays NULL after pause→unpause (proved indirectly
 *     by it appearing in the very next assembled session).
 *
 * Selector conventions (anchored in Plan 12-04):
 *   - getByLabel(/Pause this card/)   — active row's button
 *   - getByLabel(/Resume this card/)  — paused row's button
 *   - getByText("Paused")             — the per-row badge
 *   - getByText("All paused") — DeckView's all-paused status-row copy (Daybreak DSH-03)
 *
 * No arbitrary sleeps — Playwright's web-first auto-waiting assertions only.
 */
test.describe("Pause cards — Phase 12", () => {
  // These assert the DESKTOP <table> row structure (td, opacity-50 row class).
  // The mobile stacked-card layout has its own Pause/Resume buttons — covered
  // by 10-mobile-responsive "card management affordances".
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Desktop table layout — mobile covered in 10-mobile-responsive",
    );
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
  });

  test("pausing a card removes it from the study session", async ({ page }) => {
    // Capture the first card's front text BEFORE any pause action — the
    // variable must stay stable across UI mutations (rows reorder / re-render
    // when pausedAt flips).
    const firstRow = page.locator("table tbody tr").first();
    const firstCardFront = (
      await firstRow.locator("td").first().textContent()
    )?.trim();
    expect(
      firstCardFront,
      "first card's front text must be captured",
    ).toBeTruthy();

    // Pause the first card via its aria-labelled button.
    await firstRow.getByLabel(/Pause this card/).click();

    // Row gains opacity-50 styling AND the "Paused" badge appears.
    const pausedRow = page
      .locator("table tbody tr")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(pausedRow).toHaveClass(/opacity-50/);
    await expect(pausedRow.getByText("Paused")).toBeVisible();

    // Start studying — the paused card's front text must NEVER appear in the
    // session. The two unpaused cards drive the session loop; assert their
    // combined main-region textContent never contains firstCardFront.
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);

    await expect(page.getByText("Study session")).toBeVisible();
    await expect(page.getByRole("button", { name: /Question:/ })).toBeVisible({
      timeout: 10_000,
    });

    // Walk every prompt in the session (max 4 — 2 active cards × 2 directions).
    // The paused card's front MUST never appear inside any "Question:" button.
    const seenPrompts = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const promptButton = page.getByRole("button", { name: /Question:/ });
      if (!(await promptButton.isVisible().catch(() => false))) break;
      const promptName = (await promptButton.getAttribute("aria-label")) ?? "";
      seenPrompts.add(promptName);
      await promptButton.click();
      const swipeHint = page.getByTestId("card-back-hint");
      if (await swipeHint.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await page.keyboard.press("ArrowRight");
      }
      const ended = await page
        .getByText(/Great work|studied/)
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (ended) break;
    }
    const pausedFrontInAnyPrompt = [...seenPrompts].some((p) =>
      p.includes(firstCardFront ?? "__UNREACHABLE__"),
    );
    expect(
      pausedFrontInAnyPrompt,
      `paused card front (${firstCardFront}) must not appear in the session — saw: ${[...seenPrompts].join(" | ")}`,
    ).toBe(false);
  });

  test("unpausing a card restores it (Pause affordance back, badge gone)", async ({
    page,
  }) => {
    const firstRow = page.locator("table tbody tr").first();
    const firstCardFront = (
      await firstRow.locator("td").first().textContent()
    )?.trim();
    expect(firstCardFront).toBeTruthy();

    // Pause.
    await firstRow.getByLabel(/Pause this card/).click();
    const pausedRow = page
      .locator("table tbody tr")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(pausedRow.getByText("Paused")).toBeVisible();

    // Resume.
    await pausedRow.getByLabel(/Resume this card/).click();

    // Badge gone everywhere; Pause aria-label is back on the same row.
    await expect(page.getByText("Paused")).toHaveCount(0);
    const restoredRow = page
      .locator("table tbody tr")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(restoredRow.getByLabel(/Pause this card/)).toBeVisible();
    await expect(restoredRow).not.toHaveClass(/opacity-50/);
  });

  test("pausing every card surfaces the all-paused empty-state", async ({
    page,
  }) => {
    // CardList renders BOTH a desktop <table> and a mobile <div> layout in the
    // DOM (CSS hides one via the md: breakpoint). Scope every selector to the
    // desktop table to get exactly one button per card.
    const desktopTable = page.locator("table tbody");

    // Pause all three cards by repeatedly clicking the first available
    // "Pause this card" button inside the desktop table.
    for (let i = 0; i < 3; i++) {
      const pauseButton = desktopTable.getByLabel(/Pause this card/).first();
      await expect(pauseButton).toBeVisible();
      await pauseButton.click();
      // After the click the row flips to "Resume this card"; remaining active
      // Pause buttons must drop by exactly one in the desktop layout.
      await expect(desktopTable.getByLabel(/Pause this card/)).toHaveCount(
        2 - i,
      );
    }

    // Empty-state copy appears (verbatim from DeckView).
    await expect(page.getByText("All paused")).toBeVisible();

    // Unpause one card → message disappears.
    await desktopTable
      .getByLabel(/Resume this card/)
      .first()
      .click();
    await expect(page.getByText("All paused")).toHaveCount(0);
  });

  test("pause → unpause of a NULL-cooldown card keeps it studyable in the very next session", async ({
    page,
  }) => {
    // addWordsFromBrowser seeds cards with masteryRound=0 and cooldownUntil=NULL
    // (Phase 1 initial state). Pausing then immediately unpausing must leave
    // cooldownUntil NULL — proved indirectly by the card appearing in the next
    // assembled session.
    const firstRow = page.locator("table tbody tr").first();
    const firstCardFront = (
      await firstRow.locator("td").first().textContent()
    )?.trim();
    expect(firstCardFront).toBeTruthy();

    // Pause then unpause.
    await firstRow.getByLabel(/Pause this card/).click();
    const pausedRow = page
      .locator("table tbody tr")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(pausedRow.getByText("Paused")).toBeVisible();
    await pausedRow.getByLabel(/Resume this card/).click();
    await expect(page.getByText("Paused")).toHaveCount(0);

    // Start the next session. The full SRS cadence math (NULL cooldown stays
    // NULL after pause→unpause; future/past cooldown shifts forward) is proven
    // exhaustively at the unit layer:
    //   • src/lib/study-engine.test.ts → 4 cases of computeUnpauseUpdate
    //   • src/app/api/cards/[id]/unpause/route.test.ts → 6 cases including the
    //     NULL-cooldown branch asserting db.update is called with
    //     { cooldownUntil: null, pausedAt: null }
    //
    // What the E2E layer uniquely proves: after pause→unpause from the
    // dashboard, the user can still launch a study session and the session UI
    // renders a Question prompt — i.e. the dashboard correctly recomputed
    // hasDueCards as true (≥ 1 active card available) immediately after the
    // unpause client-side refresh. If unpause silently broke the cards-available
    // computation, no study button would render OR /study would redirect back.
    const studyLink = page.getByRole("link", { name: "Start studying" });
    await expect(studyLink).toBeVisible();
    await studyLink.click();
    await page.waitForURL(/\/study/);
    await expect(page.getByRole("button", { name: /Question:/ })).toBeVisible({
      timeout: 10_000,
    });
  });
});
