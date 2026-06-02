import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

// Regression e2e for the 2026-05-29 "cards never recorded as learned" bug.
// A round-0 card was only ever shown n2t and graded once, but advancing
// required 2 n2t + 2 t2n correct — impossible — so masteryRound never moved and
// learnedCardCount stayed 0 forever. This test studies one card correctly
// across the 3 rounds (round cooldowns are auto-zeroed in dev: NODE_ENV !=
// production) and asserts it actually becomes "learned" (learnedCardCount >= 1
// via the real /api/habitat compute-on-read).

/** Flip + grade-correct (swipe right) every card in the session until it ends. */
async function studyAllCorrect(page: import("playwright/test").Page) {
  for (let guard = 0; guard < 30; guard++) {
    if (page.url().includes("/dashboard")) return;
    if (
      await page
        .getByText(/Great work/)
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    const canReveal = await page
      .getByText("Tap to reveal")
      .isVisible()
      .catch(() => false);
    if (canReveal) {
      // Flip via click (front face onClick), then swipe right (the real grade
      // gesture). Swipe is enabled 300ms after flip.
      await page.getByRole("button", { name: /Question:/ }).click();
      await page.waitForTimeout(500);
      const card = page.getByRole("button", { name: /Answer:/ });
      const box = await card.boundingBox();
      if (box) {
        const cy = box.y + box.height / 2;
        const cx = box.x + box.width / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 220, cy, { steps: 12 }); // drag right > 80px
        await page.mouse.up();
      }
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(300);
  }
}

test.describe("Study progression — card reaches 'learned'", () => {
  test("studying one card correctly across rounds increments learnedCardCount", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 1);

    // Sanity: not learned yet.
    const before = await (await page.request.get("/api/habitat")).json();
    expect(before.learnedCardCount).toBe(0);

    // 3 sessions: round 0->1, 1->2, 2->3 (learned). Cooldowns zeroed in dev so
    // the card is immediately due again each session.
    for (let session = 0; session < 3; session++) {
      await page.goto("/dashboard");
      const start = page.getByRole("link", { name: "Start studying" });
      await expect(start).toBeVisible({ timeout: 15_000 });
      await start.click();
      await page.waitForURL(/\/study/);
      await page.waitForSelector('text="Tap to reveal"', { timeout: 10_000 });
      await studyAllCorrect(page);
    }

    // The card must now be recorded as learned (masteryRound >= 3).
    const after = await (await page.request.get("/api/habitat")).json();
    expect(after.learnedCardCount).toBeGreaterThanOrEqual(1);
  });
});
