---
phase: 23-browse-words
reviewed: 2026-06-23T11:45:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/components/word-list-browser.tsx
  - src/app/(protected)/deck/browse/page.tsx
  - src/components/daybreak/bw-medallion.tsx
  - src/components/daybreak/ac-top.tsx
  - src/components/new-card-mode-toggle.tsx
  - src/components/daybreak/__tests__/bw-atoms.test.tsx
  - src/components/daybreak/__tests__/ac-atoms.test.tsx
  - e2e/helpers.ts
  - e2e/02-first-visit-deck-creation.spec.ts
  - e2e/03-word-list-browser.spec.ts
  - e2e/09-language-breakdown.spec.ts
  - e2e/10-mobile-responsive.spec.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-06-23T11:45:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 23 re-skins `/deck/browse` into a two-screen IA (topic-tiles landing → per-topic
word list with a CEFR level row), driven by a server-read `?topic=` param. The review
focused on the three areas flagged in the phase context: the preserved optimistic
add/remove state machine, the server-side `?topic=` handling and authorization, and
behavior-preservation regressions in the re-skin.

**The headline concerns all check out clean:**

- **Optimistic state machine is preserved verbatim.** A line-level diff against
  `bf8e3a3^` confirms `handleAdd`/`handleRemove` call `addWordToCard(deckId, word.id,
  word.native, word.target)` and `removeWordFromDeck(deckId, word.native, word.target)`
  with identical revert-on-failure logic, identical 3000ms auto-clear, and the same
  lazy `useState(() => new Set(existingWords))` initializer. The reserved error line is
  always in the DOM (`data-role="error-line"`, `minHeight: 16`) so there is no layout
  shift (D-06). The `finally` block unconditionally clears the loading flag, so a failed
  request cannot strand a row in a spinner state.
- **No behavior-preservation (no-op control) regression.** Unlike the prior phase's
  defect, every interactive control here dispatches real values: the add/remove toggle
  calls `onAdd`/`onRemove` with the word, the level buttons call `setDifficultyFilter`,
  and "Show all levels" calls `onShowAll`. The 33 rendered-component unit tests in
  `bw-atoms.test.tsx` + `ac-atoms.test.tsx` pass, and they assert the *behaviour*
  (e.g. `ACSeg` → `onChange("image")`, `BrowseEmpty` → `onShowAll`), not just markup.
- **No injection / authz gap on `?topic=`.** The param never reaches the DB. It flows
  only into (a) JSX text (React auto-escapes), (b) `filterWords({ category: topic })`
  which is a pure string-equality compare, and (c) `ICON_MAP[topic] ?? null` (object
  lookup, returns null on miss). The deck mutations (`addWordToCard`/`removeWordFromDeck`)
  perform their own `getSession` + deck-ownership check, independent of the page. Auth/
  redirect logic in `page.tsx` is unchanged from the prior version (verified by diff).
- **Topic slug + URL encoding round-trip correctly.** All 14 category slugs are unique
  (no `topic-tile-*` testid collisions), and `encodeURIComponent("Food & Drink")` →
  `Food%20%26%20Drink` decodes back to the exact category string server-side, so
  `filterWords` matches. Every category is non-empty across all 6 wordlists.

`tsc --noEmit` passes clean. One genuine edge-case UX defect (Warning) and three minor
quality items (Info) follow.

## Warnings

### WR-01: Empty-state copy is nonsensical and its reset button is a no-op when the "All" filter yields zero words

**File:** `src/components/word-list-browser.tsx:749-754` (and `BrowseEmpty` 306-384)
**Issue:**
`BrowseList` renders the full wordlist and derives `filteredWords` via
`filterWords(words, { category: topic, cefr: difficultyFilter === "All" ? undefined : ... })`.
When `filteredWords.length === 0` it renders `BrowseEmpty` with `level={difficultyFilter}`.
If the empty result occurs while the filter is still the default `"All"` — which happens
for any unrecognized `?topic=` value (e.g. `?topic=Foo`, or `?topic=animals` with the
wrong case, since the category match is case-sensitive) — the user sees:

- Heading: "No words at this level."
- Subtext: "There are no **All** words in Foo yet. Try another level or topic."

and the "Show all levels" button calls `setDifficultyFilter("All")`, which is a no-op
because the filter is *already* "All" — leaving the user on a dead screen with no path
forward. (For every *valid* topic this path is unreachable, since all 14 categories are
non-empty in all 6 wordlists, so this is an invalid-/stale-URL edge case, not a
normal-flow break — hence Warning, not Blocker. But a bookmarked or hand-edited URL with
a bad topic lands here, as does any future wordlist that drops a category.)

**Fix:** Handle the unknown-topic / no-such-category case explicitly rather than
funnelling it through the per-level empty state. For example, in `page.tsx` validate the
topic against `CATEGORIES` before rendering `BrowseList` and redirect to the tiles
landing on a miss:

```tsx
// page.tsx — normalise/validate the topic param
const requestedTopic =
  params.topic && (CATEGORIES as readonly string[]).includes(params.topic)
    ? params.topic
    : undefined;
// ...then the existing `requestedTopic ? <BrowseList/> : <BrowseTiles/>` is safe.
```

Additionally, make `BrowseEmpty`'s copy and CTA level-aware so the "All" case never reads
"no All words" and never shows a no-op reset:

```tsx
// BrowseEmpty
const isAllLevels = level === "All";
// subtext:
{isAllLevels
  ? `There are no words in ${topic} yet. Try another topic.`
  : `There are no ${level} words in ${topic} yet. Try another level or topic.`}
// hide the "Show all levels" button when isAllLevels (it would be a no-op)
```

## Info

### IN-01: `BrowseList` declares and is passed `nativeLang` / `targetLang` props it never uses

**File:** `src/components/word-list-browser.tsx:519-537` (interface 519-528, destructure 530-537)
**Issue:** `BrowseListProps` declares `nativeLang: string` and `targetLang: string`, and
`page.tsx:75-76` passes both, but the component body destructures only
`words, existingWords, deckId, topic, nativeLangLabel, targetLangLabel`. The two `*Lang`
(code) props are dead — only the `*LangLabel` props are consumed. This is type-clean
(`tsc` passes) but misleading: a reader assumes the codes drive something. The `BWContext`
helper only needs the labels.
**Fix:** Drop `nativeLang` and `targetLang` from `BrowseListProps` and from the `<BrowseList .../>`
call site in `page.tsx`. (`BrowseTiles` already correctly takes only the labels.)

### IN-02: Remove-toggle accessibility-name test accepts an ungrammatical label, defeating the grammar guard

**File:** `src/components/daybreak/__tests__/bw-atoms.test.tsx:101-104`
**Issue:** The in-deck case asserts
`getByRole("button", { name: /Remove water from deck|Remove water to deck/ })`. The second
alternative (`Remove water to deck`) is grammatically wrong and would only ever match a
regressed label. Because the regex matches either, a future edit that changes the aria-label
to the incorrect "Remove … to deck" wording would still pass this test. The component is
currently correct (`word-list-browser.tsx:224-225` → "Remove … from deck"), so this is a
test-quality issue, not a code bug.
**Fix:** Tighten the matcher to the intended wording only:

```tsx
expect(
  screen.getByRole("button", { name: /Remove water from deck/ }),
).toBeTruthy();
```

### IN-03: Stray non-null assertions on already-typed `HTMLInputElement` in ac-atoms tests

**File:** `src/components/daybreak/__tests__/ac-atoms.test.tsx:246-247`
**Issue:** `const [targetInput, nativeInput] = inputs;` already gives
`HTMLInputElement` values (the array is typed `HTMLInputElement[]` on line 242), yet
lines 246-247 re-cast with `(targetInput as HTMLInputElement).value`. The redundant
assertions are harmless noise but signal copy-paste drift. (Purely cosmetic — listed for
completeness, not a correctness concern.)
**Fix:** Drop the redundant casts: `expect(targetInput.value).toBe("gato");`.

---

_Reviewed: 2026-06-23T11:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
