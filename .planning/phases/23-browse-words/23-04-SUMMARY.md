---
phase: 23-browse-words
plan: "04"
subsystem: e2e
tags: [e2e, retarget, browse, playwright, two-screen-ia]
dependency_graph:
  requires: [23-02, 23-03]
  provides: [green-browse-e2e-batch]
  affects: [e2e/helpers.ts, e2e/03-word-list-browser.spec.ts, e2e/09-language-breakdown.spec.ts, e2e/10-mobile-responsive.spec.ts]
tech_stack:
  added: []
  patterns: [structural-selector retarget, two-screen drill-in, role/testid locators]
key_files:
  created: []
  modified:
    - e2e/helpers.ts
    - e2e/03-word-list-browser.spec.ts
    - e2e/09-language-breakdown.spec.ts
    - e2e/10-mobile-responsive.spec.ts
decisions:
  - "Used topic-tile-animals (not topic-tile-food---drink) for the addWordsFromBrowser helper drill-in: Animals has 20 A2 words (French), clean single-word slug, no ambiguity"
  - "BRW-04 empty state combo: Animals + A1 (verified 0 A1 words for Animals in en-fr.json); Greetings + A2 also works but Animals used consistently with other tests"
  - "noNonNullAssertion warnings in e2e/10 (box! -> box?.) fixed per CLAUDE.md enforcement [22-01]; pre-existing frBox!/engBox! also fixed"
  - "waitForCompilation pre-existing noAssignInExpressions in helpers.ts fixed as part of Task 1 biome-clean requirement"
  - "Test 4 renamed from 'category filter changes visible words' to 'topic navigation shows word rows for selected topic' — old name implied pill filter; new name reflects tile-drill intent"
  - "Test 5 renamed from 'difficulty filter works' to 'difficulty filter changes visible words' — behavioral intent preserved, scoped to Greetings (15 A1 words)"
metrics:
  completed_date: "2026-06-23"
  tasks_completed: 4
  files_modified: 4
---

# Phase 23 Plan 04: e2e Retargets for Browse Re-skin Summary

Retargeted the e2e helper + 3 specs off removed Browse copy and CSS-class locators onto the new structural (testid/role) selectors from the Plan 23-03 two-screen IA re-skin.

## Completed Tasks

### Task 1: Fix addWordsFromBrowser helper (commit a79ecf9)

The shared helper was clicking `browse-words-empty` → waiting for `[aria-label*="Add"]`, which breaks because the Browse landing now shows topic tiles (not word rows). Added a topic drill-in step between the two:

```
click browse-words-empty → waitForURL(/deck/browse) →
click topic-tile-animals → waitForURL(/topic=/) → waitForCompilation →
waitForSelector([aria-label*="Add"]) → add N words → goto /dashboard
```

Chose `topic-tile-animals`: 20 A2 words in the French pair (densely populated), clean single-word slug with no special-char escaping, unambiguous on the landing.

Also fixed pre-existing biome violations in `waitForCompilation` (noAssignInExpressions on `while ((node = walker.nextNode()))`, formatting line-length) — required for `npx biome check` to exit 0.

### Task 2: Retarget e2e/03-word-list-browser.spec.ts (commit a41dabc)

Rewrote all 5 tests + added a 6th (BRW-04). Every selector moved from literal copy / CSS class to structural testid/role:

| Old selector | New selector | Where used |
|---|---|---|
| `getByText("Browse Words")` | `getByTestId("browse-words-title")` | Test 1 |
| `getByRole("button", { name: "Animals" })` | `getByTestId("topic-tile-animals")` | Tests 1, 6 |
| `getByRole("button", { name: "Food" })` | `getByTestId("topic-tile-food---drink")` | Tests 2, 3, 4 |
| `getByRole("button", { name: "A1" })` (on landing) | `getByRole("button", { name: "A1", exact: true })` after drill-in | Tests 1, 5, 6 |
| `.locator(".border-b.border-border.py-2")` | `.locator('[data-testid="word-row"]')` | Tests 4, 5 |

Slug correction: the plan text said `topic-tile-food-drink` but the actual component emits `topic-tile-food---drink` (from `"Food & Drink".toLowerCase().replace(/[^a-z]/g, "-")` — the `&` and spaces each become `-`). Verified by running the same regex against CATEGORIES.

Test 6 (BRW-04 empty state): Animals + A1 filter → "No words at this level." → "Show all levels" → word rows reappear. Combo verified against `en-fr.json`: Animals has 20 A2 words and 0 A1 words.

Surviving locators (preserved per plan): `getByRole("link", { name: "Browse words" }).first()`, `[aria-label*="Add"]`, `[aria-label*="Remove"]`.

### Task 3: Retarget e2e/09 and e2e/10 (commit f2449fc)

**e2e/09** "browse words and add card links work from empty deck":
- `getByText("Browse Words")` → `getByTestId("browse-words-title")`
- `getByRole("link", { name: "Back to my deck" })` → new D-04 back-nav path:
  click `getByRole("link", { name: /Add a card/i })` → waitForURL(/deck/new-card) → click `getByRole("link", { name: /My deck/i })` (ACTop) → waitForURL(/dashboard)
- Other two tests (`addWordsFromBrowser` callers) unchanged

**e2e/10** "word list browser works on mobile":
- Added `waitForCompilation` to imports
- `getByRole("button", { name: "Animals" })` → `getByTestId("topic-tile-animals")` (landing assertion)
- Added drill-in before touch-target check: `click topic-tile-animals` → `waitForURL(/topic=/)` → `waitForCompilation(page)`
- BRW-03 touch-target assertion preserved: `box?.height >= 44` (changed `!` to `?.` per noNonNullAssertion)
- Pre-existing `frBox!/engBox!` also fixed to `?.`
- Other 6 tests unchanged

### Task 4: Non-server gates (playwright.config.ts review + vitest) — live e2e delegated to orchestrator

**playwright.config.ts review:** `webServer: undefined` — config expects an already-running server on port 3000. The orchestrator manages a harness-level dev server. Timeout: 180s. Workers: 1. Projects: `web` (Chromium 1280×800) + `mobile` (Pixel 7, Chromium). No issues.

**Syntactic validity:** All 4 touched files pass `npx biome check` with exit 0.

**Unit regression:** `npx vitest run` — 112 test files, 2056 tests passed. 1 failure: `cooldown-config.test.ts` 5s timeout. This is the documented known-flaky test ("passes in isolation — not a regression if it's the only timeout"). No regression from this plan's changes.

**Live e2e batch:** Delegated to orchestrator e2e gate (project convention — harness-managed dev server + per-project batches).

## Retarget Map for Orchestrator e2e Gate

For each spec, every selector changed (old → new) and the user-flow step it drives. Use this to triage failures to the exact selector.

### e2e/helpers.ts — addWordsFromBrowser

| Old | New | Flow step |
|-----|-----|-----------|
| `waitForURL(/deck/browse)` then immediately `waitForSelector([aria-label*="Add"])` | + `getByTestId("topic-tile-animals").click()` + `waitForURL(/topic=/)` + `waitForCompilation(page)` before `waitForSelector` | After landing on tiles, drill into Animals topic to reach word-row list |

### e2e/03-word-list-browser.spec.ts

| Old | New | Flow step |
|-----|-----|-----------|
| `getByText("Browse Words")` | `getByTestId("browse-words-title")` | Test 1: assert landing title |
| `getByRole("button", { name: "Animals" })` | `getByTestId("topic-tile-animals")` | Tests 1, 6: assert Animals tile on landing |
| `getByRole("button", { name: "Food" })` | `getByTestId("topic-tile-food---drink")` | Tests 2, 3, 4: click Food & Drink tile to drill in |
| _(missing drill-in)_ | `click topic-tile-food---drink` + `waitForURL(/topic=/)` | Tests 2, 3, 4: navigate from landing to word list |
| _(missing drill-in)_ | `click topic-tile-animals` + `waitForURL(/topic=/)` | Tests 1, 6: navigate to list to check level tiles / empty state |
| _(missing drill-in for Greetings)_ | `click topic-tile-greetings` + `waitForURL(/topic=/)` | Test 5: navigate to Greetings list, then click A1 filter |
| `getByRole("button", { name: "A1" })` on landing | `getByRole("button", { name: "A1", exact: true })` after drill-in | Tests 1, 5, 6: CEFR level filter (only visible on list screen) |
| `.locator(".border-b.border-border.py-2")` | `.locator('[data-testid="word-row"]')` | Tests 4, 5: assert word rows appear after filter |
| _(no test 6)_ | `getByText("No words at this level.")` + `getByRole("button", { name: "Show all levels" })` | Test 6 (new, BRW-04): assert empty state + reset |

### e2e/09-language-breakdown.spec.ts

| Old | New | Flow step |
|-----|-----|-----------|
| `getByText("Browse Words")` | `getByTestId("browse-words-title")` | "browse words and add card links" test: assert Browse landing title |
| `getByRole("link", { name: "Back to my deck" }).click()` + `waitForURL(/dashboard/)` | `getByRole("link", { name: /Add a card/i }).click()` + `waitForURL(/deck/new-card/)` + `getByRole("link", { name: /My deck/i }).click()` + `waitForURL(/dashboard/)` | Navigate back to dashboard via D-04 back-link path |

### e2e/10-mobile-responsive.spec.ts

| Old | New | Flow step |
|-----|-----|-----------|
| `getByRole("button", { name: "Animals" })` | `getByTestId("topic-tile-animals")` | "word list browser on mobile": assert Animals tile on landing |
| _(missing drill-in)_ | `click topic-tile-animals` + `waitForURL(/topic=/)` + `waitForCompilation(page)` | Navigate from landing to Animals word list |
| `box!.height` | `box?.height` | Touch-target assertion (behavioral intent preserved) |

**Task 4 live-run status: delegated to orchestrator e2e gate.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected topic slug for "Food & Drink"**
- Found during: Task 2
- Issue: Plan text referenced `topic-tile-food-drink` but the component emits `topic-tile-food---drink` (each non-letter char in `"Food & Drink"` becomes `-`, so `& ` → `--`)
- Fix: Used `topic-tile-food---drink` throughout e2e/03 (verified by running the slug regex against CATEGORIES)
- Files modified: e2e/03-word-list-browser.spec.ts

**2. [Rule 1 - Bug] Pre-existing biome violations in helpers.ts**
- Found during: Task 1 biome check
- Issue: `waitForCompilation` contained `noAssignInExpressions` (assign-in-while) + line-length formatting error — both pre-existing
- Fix: Refactored while loop to init-then-iterate pattern; applied formatter line wrap
- Files modified: e2e/helpers.ts

**3. [Rule 1 - Bug] Pre-existing noNonNullAssertion in e2e/10**
- Found during: Task 3 biome check
- Issue: `box!.height` (my code) + `frBox!.y`/`engBox!.y` (pre-existing) violate CLAUDE.md [22-01]
- Fix: Changed to `?.` optional chaining
- Files modified: e2e/10-mobile-responsive.spec.ts

**4. [Rule 2 - Enhancement] Used topic-tile-animals (not food---drink) in addWordsFromBrowser**
- Found during: Task 1 design
- Issue: Plan suggested `food-drink` for the helper (incorrect slug, see deviation 1). Animals provides cleaner slug + same density
- Fix: Used `topic-tile-animals` in the helper
- Files modified: e2e/helpers.ts

## Known Stubs

None — all selectors target real rendered testids/roles from 23-03 implementation.

## Threat Flags

None — e2e files only, no production trust boundary touched.

## Self-Check

### Created files exist
- `.planning/phases/23-browse-words/23-04-SUMMARY.md` — this file

### Commits exist
- a79ecf9 — fix(23-04): update addWordsFromBrowser helper
- a41dabc — feat(23-04): retarget e2e/03
- f2449fc — feat(23-04): retarget e2e/09 and e2e/10

## Self-Check: PASSED
