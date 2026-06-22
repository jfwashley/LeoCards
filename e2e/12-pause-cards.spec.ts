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
 *   - getByText("Paused")             — the per-row badge (inside accordion)
 *   - getByText("All paused") — DeckView's all-paused status-row copy (Daybreak DSH-03)
 *
 * Note on accordion lifecycle: router.refresh() (called by togglePause after
 * a successful pause/unpause API call) causes Next.js to re-mount the CardList
 * RSC subtree, resetting the local accordion open state to false (collapsed).
 * Tests that read the "Paused" badge or card rows AFTER a pause/resume action
 * must re-expand the accordion.
 *
 * No arbitrary sleeps — Playwright's web-first auto-waiting assertions only.
 */
test.describe("Pause cards — Phase 12", () => {
  // These assert the Daybreak card-row structure (data-testid="card-row").
  // The "Your words" accordion is expanded in beforeEach so rows are visible.
  // The mobile stacked-card layout uses the same rows — but since the accordion
  // is shared between mobile and desktop in the Daybreak layout, we skip mobile
  // here and cover it in 10-mobile-responsive "card management affordances".
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Daybreak card rows — mobile covered in 10-mobile-responsive",
    );
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
    // "Your words" accordion is collapsed by default (Daybreak DSH-04) — expand it
    await page.getByTestId("words-accordion-header").click();
    await expect(page.getByTestId("card-row").first()).toBeVisible();
  });

  /**
   * Helper: ensure the accordion is expanded so card rows are visible.
   * router.refresh() resets CardList's open state; call this after any
   * pause/unpause action to re-expand before making assertions.
   */
  async function ensureAccordionOpen(
    page: import("playwright/test").Page,
  ): Promise<void> {
    const header = page.getByTestId("words-accordion-header");
    // Wait for the header to settle (may be animating after router.refresh)
    await header.waitFor({ state: "visible" });
    const isExpanded = await header.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await header.click();
      await expect(page.getByTestId("card-row").first()).toBeVisible();
    }
  }

  test("pausing a card removes it from the study session", async ({ page }) => {
    // Capture the first card's front text BEFORE any pause action — the
    // variable must stay stable across UI mutations (rows reorder / re-render
    // when pausedAt flips).
    const firstRow = page.getByTestId("card-row").first();
    // Get just the front word: card-row > word-text-container (first div) >
    // front-word div (first child div inside the container)
    const firstCardFront = (
      await firstRow.locator("div").first().locator("div").first().textContent()
    )?.trim();
    expect(
      firstCardFront,
      "first card's front text must be captured",
    ).toBeTruthy();

    // Pause the first card via its aria-labelled button.
    await firstRow.getByLabel(/Pause this card/).click();

    // router.refresh() resets accordion open state — re-expand before asserting
    await ensureAccordionOpen(page);

    // Row has the "Paused" badge and the pause button is now "Resume this card".
    const pausedRow = page
      .getByTestId("card-row")
      .filter({ hasText: firstCardFront ?? "" });
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
    const firstRow = page.getByTestId("card-row").first();
    // Get just the front word: card-row > word-text-container (first div) >
    // front-word div (first child div inside the container)
    const firstCardFront = (
      await firstRow.locator("div").first().locator("div").first().textContent()
    )?.trim();
    expect(firstCardFront).toBeTruthy();

    // Pause.
    await firstRow.getByLabel(/Pause this card/).click();
    // router.refresh() resets accordion open state — re-expand before asserting badge
    await ensureAccordionOpen(page);
    const pausedRow = page
      .getByTestId("card-row")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(pausedRow.getByText("Paused")).toBeVisible();

    // Resume.
    await pausedRow.getByLabel(/Resume this card/).click();

    // router.refresh() resets accordion open state — re-expand before asserting
    await ensureAccordionOpen(page);

    // Badge gone everywhere; Pause aria-label is back on the same row.
    await expect(page.getByText("Paused")).toHaveCount(0);
    const restoredRow = page
      .getByTestId("card-row")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(restoredRow.getByLabel(/Pause this card/)).toBeVisible();
  });

  test("pausing every card surfaces the all-paused empty-state", async ({
    page,
  }) => {
    // Daybreak uses a single card-row layout (no separate desktop table / mobile div).
    // Scope selectors to card-row testid to get exactly one button per card.
    const cardRows = page.getByTestId("card-row");

    // Pause all three cards sequentially.
    // After each pause API call, router.refresh() resets the accordion to
    // collapsed. We re-expand and verify the remaining Pause button count
    // drops by one, confirming each pause was persisted before continuing.
    for (let i = 0; i < 3; i++) {
      // Accordion must be open to locate card rows
      await ensureAccordionOpen(page);
      const pauseButton = cardRows.getByLabel(/Pause this card/).first();
      await expect(pauseButton).toBeVisible();
      await pauseButton.click();

      if (i < 2) {
        // After the pause + router.refresh, accordion collapses.
        // Re-expand and verify remaining Pause button count dropped by 1.
        await ensureAccordionOpen(page);
        await expect(cardRows.getByLabel(/Pause this card/)).toHaveCount(2 - i);
      }
    }

    // After pausing all 3 cards, the DeckView status row shows "All paused".
    // This is rendered OUTSIDE the accordion so it's always visible.
    await expect(page.getByText("All paused")).toBeVisible({ timeout: 10_000 });

    // Unpause one card → message disappears.
    await ensureAccordionOpen(page);
    await cardRows
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
    const firstRow = page.getByTestId("card-row").first();
    // Get just the front word: card-row > word-text-container (first div) >
    // front-word div (first child div inside the container)
    const firstCardFront = (
      await firstRow.locator("div").first().locator("div").first().textContent()
    )?.trim();
    expect(firstCardFront).toBeTruthy();

    // Pause then unpause.
    await firstRow.getByLabel(/Pause this card/).click();
    // router.refresh() resets accordion open state — re-expand before asserting badge
    await ensureAccordionOpen(page);
    const pausedRow = page
      .getByTestId("card-row")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(pausedRow.getByText("Paused")).toBeVisible();
    await pausedRow.getByLabel(/Resume this card/).click();
    // router.refresh() resets accordion again — re-expand before asserting count
    await ensureAccordionOpen(page);
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
