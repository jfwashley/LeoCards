# Deferred Items — Phase 28.2

Out-of-scope discoveries logged per the executor's Scope Boundary rule. Not fixed here.

## 28.2-01 (Task 2): 5th instance of the documented full-suite parallel-execution vitest flake

**Found during:** Pre-bump baseline capture (Task 2), i.e. BEFORE any file in this plan's
`files_modified` (`package.json`, `package-lock.json`) was touched — this is unambiguously
pre-existing on `main` HEAD, not caused by this plan.

**What happened:** A full `npx vitest run` reported `1 failed | 803 passed | 6 skipped` (810 total),
with the sole failure in `src/components/change-password-card.test.tsx` ("calls
authClient.changePassword with the TYPED values + revokeOtherSessions:true, then clears fields,
collapses, shows success, and resets passwordDirty") — an assertion on the `dirty-probe` testid
expecting `"false"` but receiving `"true"`.

**Why this is not a regression:**
- Re-run in isolation (`npx vitest run src/components/change-password-card.test.tsx`): **10/10
  passed**, 1.09s, zero failures.
- `git status --short` on both the test file and its component: clean, zero uncommitted changes.
- `git log` on the test file: last touched in Phase 25 (`d59cd26`, `fc1e8cb`, `38e5993`), weeks
  before this session — no concurrent-session interference this time.

**Pattern match:** This is structurally identical to the four flakes already documented across
multiple STATE.md entries (Phase 27-08, 27-07, etc.): `deck-switcher.test.tsx`,
`image-upload-flow-extract-errors.test.tsx`, `review-list-commit-guard.test.tsx`,
`cooldown-config.test.ts` — each fails only under full-suite parallel execution and passes
deterministically alone. `change-password-card.test.tsx` is a **5th member of this set** (its
`passwordDirty` derivation via `react-hook-form`'s `watch()` + a single `useEffect`, per the
Phase 25-02 decision log, is plausibly timing-sensitive under parallel jsdom environments — not
investigated further here, out of this plan's scope).

**Action taken:** None (Scope Boundary — this plan touches only `package.json`/`package-lock.json`).
Treated as an explained flake for baseline-comparison purposes: true pre-bump vitest baseline for
this plan's regression gate is **803 passed / 6 skipped / 1 explained-flake** (equivalent to 804
passed when the flake is excluded), not the stale 804/6/0 figure carried in STATE.md's `interfaces`
block.

**Flag for future executors:** the documented flake set should now read FIVE files, not four:
`deck-switcher`, `image-upload-flow-extract-errors`, `review-list-commit-guard`, `cooldown-config`,
`change-password-card`.
