import { expect, type Locator, type Page } from "playwright/test";

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
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        let node = walker.nextNode() as Text | null;
        while (node !== null) {
          if (node.nodeValue?.includes("Compiling")) return false;
          node = walker.nextNode() as Text | null;
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
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForTimeout(300);

  // Step 2: The promise — click Next
  await page.getByRole("button", { name: "Next", exact: true }).click();
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
 *
 * Two-screen IA (Plan 23-03): the Browse landing now shows topic tiles, not
 * word rows. We must click into a topic before [aria-label*="Add"] buttons
 * appear. Using "Animals" (topic-tile-animals): 20 A2 words in the French pair
 * — densely populated, clean slug, no ambiguity.
 */
export async function addWordsFromBrowser(
  page: Page,
  count: number,
): Promise<void> {
  await page.getByTestId("browse-words-empty").click();
  await page.waitForURL(/\/deck\/browse/, { timeout: 15_000 });
  await waitForCompilation(page);

  // Drill into a topic — landing shows tiles, not word rows (two-screen IA)
  await page.getByTestId("topic-tile-animals").click();
  await page.waitForURL(/topic=/, { timeout: 15_000 });
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

/**
 * Pre-existing dashboard bug fix (found via Phase 17's D-10 e2e gate against
 * card-list.tsx's "Your words" accordion — NOT caused by Phase 17;
 * reproduces identically against the pre-Phase-17 AnimatePresence/motion.div
 * CardList too, confirmed via git-checkout isolation against the Wave-3
 * (17-03) HEAD): click a pause/resume toggle button (or any control whose
 * handler fires a fetch() + router.refresh(), like card-list.tsx's
 * togglePause) and wait for all resulting network activity to settle before
 * returning.
 *
 * togglePause's fetch() + router.refresh() are fire-and-forget from the
 * click's own perspective — the click's Promise resolves as soon as the
 * event is dispatched, long before the full round-trip completes (POST
 * /api/cards/.../{action} ~0.6s, then GET /dashboard?_rsc=... ~1s more,
 * measured in a real run). CardList genuinely remounts when that refresh
 * lands (confirmed by instrumenting it with a per-mount random id during
 * diagnosis), resetting its local accordion open state to collapsed. Any
 * assertion reading accordion/row state issued before this settles can
 * observe a stale "still open from before" snapshot, then watch the panel
 * silently collapse a moment later once the real reset lands.
 *
 * Tracks in-flight requests directly (request/requestfinished/
 * requestfailed) rather than delegating to a built-in wait, because two
 * built-in approaches were tried and both under-wait here:
 *   - `page.waitForLoadState("networkidle")` tracks navigation lifecycle,
 *     not ad-hoc client fetch() calls, and reports "already idle"
 *     immediately since the page isn't navigating.
 *   - `page.waitForResponse(url => url.includes("_rsc="))` can match an
 *     unrelated, already-in-flight Next.js <Link> prefetch response (the
 *     dashboard has several visible links that prefetch their own RSC
 *     payloads with the same "_rsc=" query param), resolving before the
 *     refresh this click actually triggered.
 * Counting pending requests (not just listening for completions) avoids a
 * related trap: a naive "no response seen for N ms" check reports "quiet"
 * for the ENTIRE DURATION a request is still in flight, since `response`
 * only fires on completion — this must only consider things settled when
 * the pending count is actually back to zero.
 */
export async function clickAndWaitForNetworkSettle(
  page: Page,
  locator: Locator,
  quietMs = 400,
  maxWaitMs = 6_000,
): Promise<void> {
  let pending = 0;
  let lastZeroAt = Date.now();
  const onRequest = () => {
    pending++;
  };
  const onDone = () => {
    pending = Math.max(0, pending - 1);
    if (pending === 0) lastZeroAt = Date.now();
  };
  page.on("request", onRequest);
  page.on("requestfinished", onDone);
  page.on("requestfailed", onDone);
  try {
    await locator.click();
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      if (pending === 0 && Date.now() - lastZeroAt >= quietMs) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", onDone);
    page.off("requestfailed", onDone);
  }
}

/**
 * Ensure the "Your words" accordion is expanded so card rows are visible.
 * router.refresh() resets CardList's open state (see
 * clickAndWaitForNetworkSettle above); call this after any pause/unpause
 * action to re-expand before making assertions.
 *
 * Retry-wrapped (not a one-shot check): even after
 * clickAndWaitForNetworkSettle awaits actual network settling, React still
 * needs a separate, unobservable-from-the-network-layer tick to reconcile
 * the refreshed payload into the DOM — a single getAttribute("aria-expanded")
 * read can land in the tiny gap between "response received" and "React
 * finished applying it", see it as stale "true", skip re-clicking, and then
 * watch the real reset land a moment later. Wrapping the whole check-and-fix
 * cycle in expect(...).toPass means a false "already open" read on one
 * attempt gets caught by the NEXT attempt's row-visibility check failing,
 * which forces a retry. Re-clicking is always safe here: this function only
 * clicks when it just observed aria-expanded !== "true", so it can never
 * fire a spurious close on a panel that's genuinely (not just
 * stale-report) open.
 */
export async function ensureWordsAccordionOpen(page: Page): Promise<void> {
  const header = page.getByTestId("words-accordion-header");
  await header.waitFor({ state: "visible" });
  await expect(async () => {
    const isExpanded = await header.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await header.click();
    }
    await expect(page.getByTestId("card-row").first()).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 10_000 });
}

/**
 * D-07 email-change token seam (test-only; no live inbox is available to
 * e2e). Reads the pending `verification` row's token directly via the same
 * Drizzle `db` client the app uses, mirroring the exact scan-and-parse
 * technique GET /api/account/verify-email itself uses (bounded to the
 * `change-email:` identifier prefix — see src/lib/account-actions.ts's
 * token-store convention comment). Keyed by the pending (new) email address
 * rather than userId, since signUpFreshUser/signUpWithDeck only return
 * `{ email }` — this avoids threading userId through every existing caller.
 *
 * `@/db` is imported dynamically (not at module scope) so a failure here —
 * e.g. DATABASE_URL not being set in the Playwright runner's environment,
 * unlike the Next.js dev server, which loads .env.local automatically —
 * only affects this one helper's caller. A top-level import would instead
 * throw at spec-collection time for every file that imports ./helpers,
 * breaking the entire suite. Returns null (never throws) on any failure,
 * so callers can gracefully fall back to asserting only the pending-banner
 * state; the request->click->success round trip stays unit-covered by
 * src/app/api/account/verify-email/route.test.ts regardless (RESEARCH.md's
 * Validation Architecture — no live inbox is required either way).
 */
export async function getPendingEmailChangeToken(
  newEmail: string,
): Promise<string | null> {
  try {
    const { db } = await import("@/db");
    const { verification } = await import("@/db/schema");
    const { like } = await import("drizzle-orm");
    // WR-07: PENDING_EMAIL_PREFIX now lives in account-constants.ts as the
    // single shared source of truth (account-actions.ts, verify-email/
    // route.ts, and account-queries.ts all import it too) — dynamically
    // imported for the same reason as @/db/@/db/schema above.
    const { PENDING_EMAIL_PREFIX } = await import("@/lib/account-constants");

    const rows = await db
      .select()
      .from(verification)
      .where(like(verification.identifier, `${PENDING_EMAIL_PREFIX}%`));

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value) as {
          token?: string;
          newEmail?: string;
        };
        if (parsed.newEmail === newEmail && typeof parsed.token === "string") {
          return parsed.token;
        }
      } catch {
        // Skip malformed/unrelated verification rows (this table also
        // holds better-auth's own password-reset tokens under a different
        // identifier shape).
      }
    }
    return null;
  } catch (err) {
    console.warn(
      "[e2e] getPendingEmailChangeToken: DB seam unavailable in this " +
        "environment (e.g. DATABASE_URL not configured for the Playwright " +
        "runner) -- falling back to pending-banner-only assertion.",
      err,
    );
    return null;
  }
}
