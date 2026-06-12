---
phase: 12
plan: 04
status: complete
date: 2026-05-20
---

# Plan 12-04 — SUMMARY: CardList UI

## What shipped

### Task 1 — Thread `pausedAt` through server → DeckView → CardList + all-paused empty-state

- **`src/components/deck-view.tsx`** — widened the `CardRow` interface (line 19-27): added `pausedAt: Date | null;` after `masteryRound?: number;`. Inserted the all-paused empty-state inside `<main>`, immediately above the `<CardList />` element (between the action row and CardList). Trigger condition exactly matches the planner's: `hasCards && !hasDueCards && !earliestCooldownEnd`. Copy is verbatim: `All cards are paused — unpause one to study.`
- **`src/components/card-edit-dialog.tsx`** — **NEEDED widening.** This file defines its own `CardRow` interface (line 15-23) and `card-list.tsx` imports `CardRow` from here (line 7), NOT from deck-view. Added `pausedAt: Date | null;` after the `masteryRound?: number;` line. Without this change, `card.pausedAt` access inside card-list.tsx would have been a TS error.
- **`src/app/(protected)/dashboard/page.tsx`** — added `pausedAt: c.pausedAt,` to the `cardRows.map` projection (line 105-113). `c` is `cards.$inferSelect` so `c.pausedAt` is already typed `Date | null` after Plan 12-01.

### Task 2 — Per-row Pause/Play button + paused visual state in `card-list.tsx`

- Imports: added `Pause, Play` to the lucide-react named import (alongside `Pencil, Search, X`); added `import { useRouter } from "next/navigation";`; widened the React import to include `useTransition`.
- New state and handler at the top of the memo'd function body, after the existing `useState` declarations:
  - `const router = useRouter();`
  - `const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(() => new Set());`
  - `const [, startTransition] = useTransition();` (boolean intentionally discarded — see "pendingCardIds pattern" below)
  - `togglePause(card: CardRow)` — picks the endpoint via `card.pausedAt ? "unpause" : "pause"`, fetches POST, calls `router.refresh()` on `res.ok`, `console.error` on non-ok or network throw, and unconditionally removes the card id from `pendingCardIds` in the `finally` block.
- Desktop table (`<table className="w-full hidden md:table">`):
  - `<thead>` got a second empty `<th className="pb-2 w-11" />` so the column count matches the new row layout (Pause + Edit = two button columns).
  - `<tr>` className flipped to a template literal: `border-b border-border min-h-[48px] hover:bg-secondary transition-colors ${card.pausedAt ? "opacity-50" : ""}`.
  - Source `<td>` body changed to a nested ternary that emits `"Paused"` when `card.pausedAt` is non-null, otherwise the existing `"word list"` / `"manual"` pill text.
  - New `<td>` for the pause/play button inserted BEFORE the existing edit `<td>` (so Pause sits to the left of Edit). Uses `<Button variant="ghost">` with `disabled={pendingCardIds.has(card.id)}`, dynamic `aria-label` + `title` (`"Pause this card"` ↔ `"Resume this card"`), and renders `<Play />` when paused / `<Pause />` when active.
- Mobile card layout (`<div className="flex flex-col gap-2 md:hidden">`):
  - Outer `<div>` className flipped to template literal with the same `opacity-50` conditional.
  - Source-pill span replaced with the same `"Paused"` ternary.
  - Pause/Play `<Button>` inserted BEFORE the edit Button as a sibling (same DOM order as desktop: Pause then Edit).

## Why no shared `isPending` boolean — the `pendingCardIds: Set<string>` pattern

`useTransition` returns a single boolean for the entire transition. If a user clicks Pause on Card A and then immediately clicks Pause on Card B, a single shared `isPending` would mass-disable EVERY row's button until both fetches resolve. That's the wrong UX — it would feel laggy on decks of any size, and it would block the user from interacting with rows they haven't touched.

Instead, every in-flight POST adds its `card.id` to a `Set<string>` held in state. Each row's `disabled` prop only checks its own id (`pendingCardIds.has(card.id)`), so siblings stay enabled. The `finally` block always removes the id whether the fetch succeeded, returned non-ok, or threw — no leaked disabled state. Plan 12-05's Playwright spec can rely on this: the button selector stays stable, and after `router.refresh()` resolves, the icon swaps from `Pause` to `Play` (or vice versa).

The `startTransition` wrapper is still useful — it lets React's concurrent renderer treat the fetch + state updates as low-priority, so the click feels instant. We just don't surface the boolean.

## Verification

### Task 1 grep gates (each == 1)
- `grep -c 'pausedAt: Date | null' src/components/deck-view.tsx` → **1** ✓
- `grep -c 'pausedAt: c.pausedAt' src/app/(protected)/dashboard/page.tsx` → **1** ✓
- `grep -c 'All cards are paused' src/components/deck-view.tsx` → **1** ✓
- `grep -c 'pausedAt: Date | null' src/components/card-edit-dialog.tsx` → **1** ✓ (additional file widened)
- `npx tsc --noEmit` → **clean** ✓

### Task 2 grep gates
| Gate | Required | Actual |
|------|----------|--------|
| `grep -c 'togglePause' src/components/card-list.tsx` | `>= 1` | **3** ✓ (definition + 2 onClick sites) |
| `grep -c 'Pause this card' src/components/card-list.tsx` | `>= 2` (aria + title), `>= 4` with mobile | **4** ✓ (desktop aria + desktop title + mobile aria + mobile title) |
| `grep -c 'Resume this card' src/components/card-list.tsx` | `>= 2`, `>= 4` with mobile | **4** ✓ |
| `grep -c 'router.refresh()' src/components/card-list.tsx` | `== 1` | **1** ✓ |
| `grep -c 'opacity-50' src/components/card-list.tsx` | `>= 2` | **2** ✓ (desktop `<tr>` + mobile `<div>`) |
| `grep -c '"Paused"' src/components/card-list.tsx` | `>= 2` | **2** ✓ (desktop pill + mobile pill) |
| `npx tsc --noEmit` | clean | **clean** ✓ |
| `npx biome check src/components/card-list.tsx src/components/deck-view.tsx` | clean | **clean** ✓ |
| `npm test` no regressions | required | **1786 passed / 0 failed**, 6 skipped ✓ (= same baseline as Plan 12-03 end-state — 0 new tests in 12-04 since this plan adds no unit-testable pure logic) |

The 11 "failed test files" remain the pre-existing Playwright-in-Vitest noise (`vitest.config.ts` lacks `exclude: ['e2e/**']`). Documented in 12-01/12-02/12-03 SUMMARYs; same files, same error message, zero new failures from Plan 12-04.

## Pitfall coverage

| Pitfall | Status | Evidence |
|---------|--------|----------|
| Pitfall 2 — must call `router.refresh()` after fetch (not `revalidatePath` from client) | ✓ | `grep -c 'router.refresh()' src/components/card-list.tsx == 1`; `grep -c 'revalidatePath' src/components/card-list.tsx == 0` |
| Pitfall 5 — `pausedAt` stays typed `Date | null` across every boundary, no boolean coercion | ✓ | `pausedAt: Date | null` literal in deck-view, card-edit-dialog; `pausedAt: c.pausedAt` (Date|null from $inferSelect) in dashboard; `card.pausedAt` used in conditionals via truthiness without coercion |
| Per-card in-flight, not mass-disable | ✓ | `pendingCardIds: Set<string>` per id; `disabled={pendingCardIds.has(card.id)}` checks each row independently |
| No toast UI — `console.error` only | ✓ | `console.error` on non-ok + on network throw; no toast/snackbar dep added |
| `lucide-react` icon names verified | ✓ | `Pause, Play` PascalCase imports — present in `node_modules/lucide-react/dist/esm/icons/` (verified at Plan 12-04 RESEARCH time) |
| a11y: keyboard-focusable button, aria-label + title flip per state | ✓ | Reused existing `<Button variant="ghost">` shadcn primitive (focusable like the Pencil twin); aria-label and title both branch on `card.pausedAt` |

## Threat-model coverage (from PLAN.md `<threat_model>`)

| Threat ID | Mitigation | Evidence |
|-----------|------------|----------|
| T-12-11 (client forging card id in fetch URL) | Server-side ownership join in Plan 12-03 endpoints; client holds no privilege | fetch URL uses `card.id` from server-rendered props; forged id → 403 from /pause or /unpause |
| T-12-12 (logging card ids / pause state to console) | Accepted; `console.error` logs only HTTP status code or generic network-error string — no card content, no pausedAt timestamp | grep `console.error` in togglePause — first message is `Pause toggle failed (${res.status}); …`, second is `Pause toggle network error` + err |
| T-12-13 (click-storm DoS) | Server-side 30/min limit (Plan 12-03) + per-card `pendingCardIds.has(card.id)` disables the row's button until the fetch resolves; siblings stay clickable | `disabled={pendingCardIds.has(card.id)}` on both desktop and mobile button instances |
| T-12-14 (Pause button keyboard reachability — a11y) | Reused `<Button variant="ghost">` shadcn primitive (focusable, Enter/Space activate); `aria-label` + `title` flip per state; matches Pencil button precedent | Same Button shape as line 211-220 (the Pencil twin) |

## Commits

- **`926a787`** — `feat(12-04-1): thread pausedAt through dashboard → DeckView + all-paused empty-state`
- **`058f223`** — `feat(12-04-2): pause/play button + paused styling in CardList`

## Deviations from plan

**None of substance.** Two minor mechanical notes:

1. **`card-edit-dialog.tsx`'s `CardRow` DID need widening.** The plan flagged this conditionally (Step 2 of Task 1: "If it defines its own `CardRow` interface … add the same `pausedAt: Date | null;` field"). Inspection confirmed it does (line 15-23, separate from deck-view's). The widening went in.
2. **Biome auto-formatted** the `title={card.pausedAt ? "Resume this card" : "Pause this card"}` line down from three lines to one after the file was written, since the single-line form fits the print width. This is purely cosmetic — no behavioural change, no grep-gate impact (the substring still appears 4×).

## Carried into downstream plans

- **Plan 12-05 (Playwright spec)** — stable selectors:
  - Pause/Play button: `button[aria-label="Pause this card"]` (active) or `button[aria-label="Resume this card"]` (paused)
  - Paused-row marker: the `"Paused"` text inside `.bg-muted.text-muted-foreground` (the pill span); also `opacity-50` on the row's `<tr>` (desktop) or outer `<div>` (mobile)
  - All-paused empty-state: the literal copy `"All cards are paused — unpause one to study."` lives inside a `<p>` immediately above the CardList in DeckView
  - In-flight assertion: a button is `disabled` between click and the next `router.refresh()` round-trip — Playwright should `await expect(button).toBeDisabled()` between `await button.click()` and `await page.waitForURL(...)` / `await expect(otherButton).toBeEnabled()`.
- After the next `next dev` regenerates `.next/types/`, future plans MAY switch the route handlers in `pause/route.ts` and `unpause/route.ts` from the inline `ctx: { params: Promise<{ id: string }> }` to the generated `RouteContext<"…">` alias (Plan 12-03 deviation 2). Purely typing, no behavior change. Out of scope for 12-04.

## Self-Check: PASSED

- `src/components/deck-view.tsx` contains `pausedAt: Date | null` (1×) — FOUND ✓
- `src/components/deck-view.tsx` contains `All cards are paused — unpause one to study.` — FOUND ✓
- `src/components/card-edit-dialog.tsx` contains `pausedAt: Date | null` — FOUND ✓
- `src/app/(protected)/dashboard/page.tsx` contains `pausedAt: c.pausedAt` — FOUND ✓
- `src/components/card-list.tsx` contains `togglePause`, `router.refresh()`, `Pause this card`, `Resume this card`, `opacity-50`, `"Paused"` (all gate-required) — FOUND ✓
- Commit `926a787` — FOUND in `git log` ✓
- Commit `058f223` — FOUND in `git log` ✓

## STATUS: PLAN_COMPLETE
