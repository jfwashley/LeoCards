import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // e2e/scripts/* are BUILD-TIME renderers (render-habitat-clips / -posters)
  // driven by npm scripts, NOT tests — keep them out of the test suite.
  testIgnore: ["**/scripts/**"],
  // Increased from 60s → 180s to allow for Next.js Turbopack cold-route compilation
  // during dev-mode e2e runs. RSC compilation of new routes (e.g. /welcome) can take
  // 60–90s on first load; each test pre-warms the route but the global timeout must
  // accommodate sign-up + redirect + compilation + assertions within a single test.
  timeout: 180_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "web",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
    {
      // Mobile emulation (Chromium — only browser installed). Pixel 7 viewport,
      // touch, mobile UA. Covers the responsive + touch-gesture paths.
      name: "mobile",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
  ],
  reporter: [["html", { open: "never" }], ["list"]],
  webServer: undefined,
});
