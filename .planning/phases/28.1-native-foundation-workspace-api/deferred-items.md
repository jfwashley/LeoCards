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

## 28.1-08 (Task 2)

- **`npx biome ci src/` currently exits 1 (13 errors, 7 warnings, 1 info across 224
  files checked), entirely pre-existing and unrelated to this plan's changes.**
  Found during: Task 2's plan-specified verify chain (`npm ci && npx tsc --noEmit &&
  npx biome ci src/ && npx vitest run && npm run build`).
  This task's `files_modified` are `package.json`, `package-lock.json`, `.gitignore`,
  and five new files under `mobile/` (which `biome.json`'s `!mobile/**` negation
  excludes from any Biome scan) — none of which intersect with the ~16 flagged `src/`
  files (`extract.unit.test.ts`, `signup-payload.test.tsx`, `daybreak/card.tsx`,
  `daybreak/pill.tsx`, `daybreak/t-btn.tsx`, `review-list.test.ts`,
  `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`,
  `(auth)/signup/page.tsx`, `qa-state-badge.test.ts`, `change-password-card.tsx`,
  `daybreak/__tests__/t-field.test.tsx`, `welcome/habitat-teaser.tsx`,
  `welcome/welcome-page.tsx`, `welcome/welcome-step-promise.tsx`, plus the
  already-flagged `debug/page.tsx` suppression above). Verified via a clean run
  (`NO_COLOR=1 npx biome ci src/ --colors=off`, grepped for `^src[\\/]`) that every
  single finding is inside `src/`, i.e. structurally impossible to have been caused by
  this task's changes. Per AGENTS.md's own "Scope Biome runs to touched files only —
  never run it repo-wide" convention and the executor Scope Boundary rule, NOT fixed
  here — would be a 16-file, unrelated-scope change. The plan's acceptance criterion
  "`npx biome ci src/` exits 0" does not hold against current `main` HEAD regardless of
  this plan; flagging for whoever next has bandwidth for a dedicated lint-debt pass
  (mirrors the already-documented stale-acceptance-criteria-number pattern elsewhere in
  this phase — verified empirically, documented rather than silently distorting scope).
