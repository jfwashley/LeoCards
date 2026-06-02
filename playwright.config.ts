import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // e2e/scripts/* are BUILD-TIME renderers (render-habitat-clips / -posters)
  // driven by npm scripts, NOT tests — keep them out of the test suite.
  testIgnore: ["**/scripts/**"],
  timeout: 60_000,
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
