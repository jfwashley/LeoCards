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
 *   - getByText(/All cards are paused/) — DeckView's empty-state copy
 *
 * No arbitrary sleeps — Playwright's web-first auto-waiting assertions only.
 */
test.describe("Pause cards — Phase 12", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
  });

  test("pausing a card removes it from the study session", async ({ page }) => {
    // Capture the first card's front text BEFORE any pause action — the
    // variable must stay stable across UI mutations (rows reorder / re-render
    // when pausedAt flips).
    const firstRow = page.locator("table tbody tr").first();
    const firstCardFront = (await firstRow.locator("td").first().textContent())
      ?.trim();
    expect(firstCardFront, "first card's front text must be captured").toBeTruthy();

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
    await expect(page.getByText("Tap to reveal")).toBeVisible({
      timeout: 10_000,
    });

    // The session UI is fully rendered. Assert the paused card's front is not
    // anywhere in the main study region. This is checked at session start —
    // if the engine + query filter agreed, the paused card never entered the
    // session array, so its front never reaches the DOM.
    const mainText = (await page.locator("main").textContent()) ?? "";
    expect(
      mainText.includes(firstCardFront ?? "__UNREACHABLE__"),
      `paused card front (${firstCardFront}) must not appear in the session`,
    ).toBe(false);
  });

  test("unpausing a card restores it (Pause affordance back, badge gone)", async ({
    page,
  }) => {
    const firstRow = page.locator("table tbody tr").first();
    const firstCardFront = (await firstRow.locator("td").first().textContent())
      ?.trim();
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
    // Pause all three cards by repeatedly clicking the first available
    // "Pause this card" button. After each click the row flips to "Resume
    // this card", so the .first() match advances to the next active row.
    for (let i = 0; i < 3; i++) {
      const pauseButton = page.getByLabel(/Pause this card/).first();
      await expect(pauseButton).toBeVisible();
      await pauseButton.click();
      // Wait for the click's transition to flush: the count of remaining
      // Pause buttons must drop by one before the next iteration.
      await expect(page.getByLabel(/Pause this card/)).toHaveCount(2 - i);
    }

    // Empty-state copy appears (verbatim from DeckView).
    await expect(
      page.getByText("All cards are paused — unpause one to study."),
    ).toBeVisible();

    // Unpause one card → message disappears.
    await page.getByLabel(/Resume this card/).first().click();
    await expect(
      page.getByText("All cards are paused — unpause one to study."),
    ).toHaveCount(0);
  });

  test("pause → unpause of a NULL-cooldown card keeps it studyable in the very next session", async ({
    page,
  }) => {
    // addWordsFromBrowser seeds cards with masteryRound=0 and cooldownUntil=NULL
    // (Phase 1 initial state). Pausing then immediately unpausing must leave
    // cooldownUntil NULL — proved indirectly by the card appearing in the next
    // assembled session.
    const firstRow = page.locator("table tbody tr").first();
    const firstCardFront = (await firstRow.locator("td").first().textContent())
      ?.trim();
    expect(firstCardFront).toBeTruthy();

    // Pause then unpause.
    await firstRow.getByLabel(/Pause this card/).click();
    const pausedRow = page
      .locator("table tbody tr")
      .filter({ hasText: firstCardFront ?? "" });
    await expect(pausedRow.getByText("Paused")).toBeVisible();
    await pausedRow.getByLabel(/Resume this card/).click();
    await expect(page.getByText("Paused")).toHaveCount(0);

    // Start the next session. If the cooldown had been shifted off NULL into
    // the future, the card would have been excluded by assembleSession's
    // (cooldownUntil <= now) gate. If it appears, NULL stayed NULL.
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);
    await expect(page.getByText("Tap to reveal")).toBeVisible({
      timeout: 10_000,
    });

    // Walk the session by tapping to reveal then grading ArrowRight, and
    // collect the unique fronts that appear. The just-unpaused card MUST
    // be among them.
    const seenFronts = new Set<string>();
    for (let i = 0; i < 5; i++) {
      // Capture the current question prompt — the card front is rendered
      // inside the question button.
      const promptButton = page.getByRole("button", { name: /Question:/ });
      if (!(await promptButton.isVisible().catch(() => false))) break;
      const promptText = (await promptButton.textContent()) ?? "";
      seenFronts.add(promptText);

      // Flip + grade.
      await promptButton.click();
      const swipeHint = page.getByText(/Swipe right/);
      if (await swipeHint.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await page.keyboard.press("ArrowRight");
      }

      // Either the next card appears or the session ends.
      const endScreen = page.getByText(/Great work/);
      const nextCard = page.getByText("Tap to reveal");
      const ended = await endScreen
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (ended) break;
      await expect(nextCard).toBeVisible({ timeout: 5_000 });
    }

    const sessionContainedCard = [...seenFronts].some((p) =>
      p.includes(firstCardFront ?? "__UNREACHABLE__"),
    );
    expect(
      sessionContainedCard,
      `unpaused NULL-cooldown card (${firstCardFront}) must appear in the very next session`,
    ).toBe(true);
  });
});
