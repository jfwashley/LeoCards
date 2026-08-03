# Deferred Items — Phase 28.1

Out-of-scope discoveries logged during execution, per the Scope Boundary rule
(only auto-fix issues directly caused by the current task's changes).

## 28.1-02 (Task 3)

- **`src/app/(protected)/debug/page.tsx:213` — ineffective Biome suppression comment.**
  Found during: scoped `npx biome check --write` pass on Task 3's touched files (this file
  was in scope only for its `@/lib/habitat-engine` → `@leocards/domain/habitat` import
  rewrite at the top of the file).
  Warning: `biome-ignore lint/a11y/useSemanticElements: native select is intentional` on
  a `<select>` element has no effect — the rule it targets is apparently not what Biome
  flags there (or the rule id/shape changed since the comment was written). Pre-existing,
  unrelated to the import-path change; not fixed here. A future pass touching that file's
  `<select>` markup should investigate the correct suppression (or remove it if the
  underlying lint no longer fires).
