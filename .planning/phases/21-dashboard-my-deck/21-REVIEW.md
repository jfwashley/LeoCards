---
phase: 21
reviewed: 2026-06-22T00:00:00Z
depth: deep
diff_base: 9d92352
files_reviewed: 15
files_reviewed_list:
  - src/app/(protected)/dashboard/page.tsx
  - src/components/ui/popover.tsx
  - src/components/deck-view.tsx
  - src/components/habitat-medallion.tsx
  - src/components/habitat-hero.tsx
  - src/components/card-list.tsx
  - src/components/card-edit-dialog.tsx
  - src/components/app-header.tsx
  - src/components/deck-switcher.tsx
  - src/components/logout-button.tsx
  - src/components/__tests__/deck-switcher.test.tsx
  - src/components/card-edit-dialog.test.tsx
  - src/components/card-list.test.tsx
  - src/components/deck-view.test.tsx
  - src/components/habitat-medallion.test.tsx
findings:
  critical: 0
  warning: 2
  low: 3
  total: 5
status: issues
---

# Phase 21: Code Review Report — dashboard-my-deck

**Reviewed:** 2026-06-22
**Depth:** deep (full file read + cross-file call-chain tracing)
**Diff base:** `9d92352..HEAD` restricted to `src/**` and `e2e/**`
**Status:** issues_found (2 MEDIUM, 3 LOW; 0 HIGH)

## Summary

Phase 21 is a well-structured Daybreak UI re-skin. The four-state status machine
(`due / none-due / resting-countdown / all-paused`) is logically correct, the
D-06 ring-guard math checks out, and the popover deck-picker conversion is clean.
Two medium-severity logic bugs were found: an inflated `dueCount` display value
and a non-unique `data-testid` collision. Three low-severity issues round out the
findings.

---

## MEDIUM Issues

### M-01: `dueCount` proxy inflates the displayed "N due" number

**File:** `src/components/deck-view.tsx:323-325`

**What is wrong:**
```ts
const dueCount = hasDueCards
  ? initialCards.filter((c) => !c.pausedAt && !c.cooldownUntil).length || 1
  : 0;
```
For every non-QA user, `cooldownUntil` is always `null` in `initialCards` (set
explicitly to `null` in `dashboard/page.tsx:112`). The filter therefore reduces
to `!c.pausedAt`, which counts ALL non-paused cards — including fully-learned
cards (`masteryRound >= 3`). But the session engine (`assembleSession`) excludes
learned cards from the main studyable pool (it adds only a small resurface
fraction). A deck with 20 learned cards + 2 actually-due cards would display
"22 due" when the real study queue has ~2–3 cards.

Additionally, even for QA users, the filter uses a truthy check on `cooldownUntil`
(a `Date` object) rather than comparing to `Date.now()`. A card whose cooldown
expired in the past would still be excluded because `new Date("past") !== null`.

**Why it matters:**
The "N due" badge in the status row is the primary motivation signal. An inflated
number misleads users about session length and destroys trust when they sit down
to study and finish in 2 cards instead of 22.

**Fix:**
Pass the authoritative session length from the server instead of deriving a
client-side approximation. In `dashboard/page.tsx`, add:
```ts
const sessionSize = sessionCards.length;
```
Add `sessionSize` to `DeckViewProps` and use it directly:
```ts
const dueCount = hasDueCards ? sessionSize : 0;
```
This is the exact count `assembleSession` returns and requires no extra DB query.

---

### M-02: Duplicate `data-testid` when user has two decks of the same language

**File:** `src/components/deck-switcher.tsx:204`

**What is wrong:**
```tsx
data-testid={`deck-option-${deck.language}`}
```
`createDeck` in `deck-actions.ts` allows multiple decks per language (it creates
"French #1", "French #2", etc.). Two French decks produce two elements with
`data-testid="deck-option-fr"`. The e2e test in `08-deck-switching.spec.ts`
locates the French deck by `getByTestId("deck-option-fr")` — this would match
ambiguously and Playwright would throw a "multiple elements" error the moment a
user gets a second same-language deck.

**Why it matters:**
The e2e suite becomes flaky / broken for any user with duplicate-language decks,
and `getByTestId` in unit tests also fails with multiple matches.

**Fix:**
Use the deck ID which is guaranteed unique:
```tsx
data-testid={`deck-option-${deck.id}`}
```
Update the e2e selector in `08-deck-switching.spec.ts` accordingly:
```ts
const frenchOption = page.getByTestId(`deck-option-${frenchDeckId}`);
```
If the deck ID is not known at e2e test time, fall back to a filter on visible
text: `page.getByTestId(/^deck-option-/).filter({ hasText: "French" })`.

---

## LOW Issues

### L-01: Dead `__new__` branch in `handleValueChange`

**File:** `src/components/deck-switcher.tsx:149-157`

**What is wrong:**
```ts
function handleValueChange(value: string | null) {
  if (!value) return;
  if (value === "__new__") {   // <-- unreachable
    setShowPicker(true);
    return;
  }
  setShowPicker(false);
  onDeckChange(value);
}
```
`handleValueChange` is only called with `deck.id` values from the popover button
`onClick={() => handleValueChange(deck.id)}`. The string `"__new__"` was the
sentinel value from the removed `<Select>` component. No call site passes it now.

**Why it matters:**
Dead branches increase cognitive load for readers expecting the condition to be
reachable. If a future developer adds a path that accidentally passes `"__new__"`,
it would silently set `showPicker` instead of navigating.

**Fix:**
Delete the `handleValueChange` wrapper entirely and call `onDeckChange` directly,
or remove the dead branch and rename to reflect its now-simpler contract:
```ts
function handleDeckSelect(id: string) {
  setShowPicker(false);
  onDeckChange(id);
}
```

---

### L-02: `Loader2` spinner in deck-switcher uses inline `animation` style instead of `animate-spin`

**File:** `src/components/deck-switcher.tsx:309-315`

**What is wrong:**
```tsx
<Loader2
  style={{
    width: 14,
    height: 14,
    animation: "spin 1s linear infinite",
  }}
/>
```
Every other `Loader2` use in the codebase uses `className="animate-spin"`. The
inline `animation: "spin 1s linear infinite"` relies on `@keyframes spin` being
globally available (it is, via Tailwind's `@import "tailwindcss"` in globals.css),
so it works today. However it is fragile — if the Tailwind import changes or the
project moves away from Tailwind's built-in keyframes, the spinner silently stops
animating with no obvious failure.

**Why it matters:**
Functional today but inconsistent and brittle. The `Loader2` component is rendered
while a deck is being created, so a non-spinning spinner gives no visual feedback.

**Fix:**
```tsx
<Loader2
  style={{ width: 14, height: 14 }}
  className="animate-spin"
/>
```

---

### L-03: Delete confirmation button uses `TBtn` (amber/primary) instead of a destructive variant

**File:** `src/components/card-edit-dialog.tsx:88-90`

**What is wrong:**
```tsx
<TBtn isPending={deleting} onClick={handleDelete}>
  Delete
</TBtn>
```
`TBtn` hardcodes `bg-primary` (Daybreak amber `#F28A1F`). In the delete
confirmation screen this creates a visually ambiguous affordance: the "Delete"
(destructive) button looks identical to the "Save changes" (constructive) button
on the edit form above it. The old code used `<Button variant="destructive" />`.
`TBtn` has no `variant` prop.

**Why it matters:**
Users who open the dialog and proceed quickly could delete a card intending to
save. The "Delete" label partially compensates, but the amber colour reinforces
an affirmative/safe action rather than a destructive one — a UX regression and
a potential accessibility concern (colour as the only differentiator is a WCAG
1.4.1 risk).

**Fix (two options):**

Option A — Add a `variant` prop to `TBtn`:
```tsx
// t-btn.tsx
interface TBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  variant?: "primary" | "destructive";
}
// Apply bg-destructive when variant="destructive"
```

Option B — Use the existing `<Button variant="destructive">` for the confirm Delete:
```tsx
<Button
  variant="destructive"
  className="w-full h-11"
  disabled={deleting}
  onClick={handleDelete}
>
  {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
</Button>
```

---

_Reviewed: 2026-06-22_
_Reviewer: Claude (adversarial code review — phase 21)_
_Depth: deep_
