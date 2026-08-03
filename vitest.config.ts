import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    // e2e/ is Playwright's domain — vitest must not collect its specs.
    // .claude/ holds Claude Code's own tooling storage, including nested
    // linked worktrees for parallel/background agent sessions (each a full
    // file checkout of this repo, potentially mid-edit) — without this
    // exclude, a bare `vitest run` from the repo root recurses into any such
    // worktree and collects its test files too, alongside the real ones.
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
