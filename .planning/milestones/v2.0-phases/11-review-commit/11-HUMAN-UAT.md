---
phase: 11-review-commit
plan: "04"
type: human-uat
status: partial
created: 2026-05-19
tracker: canonical — referenced in STATE.md + 11-04-SUMMARY.md
spec-ref: 11-04-PLAN.md Task 2 / 11-VALIDATION.md Manual-Only Verifications
---

# Phase 11: Human UAT — End-to-End ReviewList Walkthrough

**Status: PARTIAL — Task 1 (wiring) complete; live walkthrough deferred (external credentials unavailable).**

The ReviewList component and its wiring into `image-upload-flow.tsx` (EXTRACT_SUCCESS branch) are
fully unit-tested, type-checked, and lint-clean:

- `review-list.test.ts`: 29/29 passing
- `deck-actions.test.ts`: 276/276 passing
- Full suite (Phases 1–11 units): 1765 passed / 4 skipped / 0 unit failures
- `npx tsc --noEmit`: 0 errors (project-wide)
- `npx biome check`: clean

The outstanding items below are the manual-only verifications from 11-VALIDATION.md that require
a live Neon DB, a real DeepL API key (the current `.env.local` `DEEPL_API_KEY` is a placeholder
→ `/api/translate` returns 502), and a billing-enabled Anthropic API key. These are browser-
observable behaviors that unit tests cannot substitute for. This is QA validation debt, NOT a
functional RVW-01..05 code dependency.

---

## Prerequisites Before Running the Walkthrough

Before beginning any of the steps below, confirm ALL of the following:

1. **Real DEEPL_API_KEY** — replace the placeholder value in `.env.local` with a valid DeepL API
   key (Free or Pro tier). Test: `curl https://api-free.deepl.com/v2/usage -H "Authorization: DeepL-Auth-Key <YOUR_KEY>"` should return `{"character_count":...}`.

2. **Billing-enabled ANTHROPIC_API_KEY** — confirm the key in `.env.local` is for an account with
   active billing and Claude Sonnet 4 access. Test: a short Anthropic API call should succeed
   (not return 402 or 403).

3. **Shell override stripped** — if any shell session has `ANTHROPIC_API_KEY` exported as an
   empty string (from dev-mode overrides), restart the dev server in a clean shell so the
   `.env.local` value is picked up.

4. **Dev server running** — `npm run dev` in a clean shell with the above credentials active.

5. **Seed deck ready** — a French (language = `fr`) deck exists in your Neon account with at
   least one card whose `back` value is a French word visible in the test image (e.g. "chien").

---

## Pending Manual Walkthrough Steps

### Step 1 — Seed a same-language duplicate

**Status:** PENDING

**Goal:** Confirm the "Already learned" segregation (RVW-05) identifies an existing card.

**Action:**
- On `/deck/new-card`, pick (or create) a French deck.
- Manually add a card whose target (back) word you can reproduce in a test image, e.g. back = "chien".

**Expected outcome:** The deck now contains at least one card with back = "chien". This card should
appear in the Already-learned section (not in the editable review list) after extraction in Step 2.

---

### Step 2 — Extract image → ReviewList (RVW-01)

**Status:** PENDING

**Goal:** Confirm EXTRACT_SUCCESS renders ReviewList (not the Phase 10 disabled stub).

**Action:**
- Go to `/deck/new-card` → image mode → upload an image containing several French words including "chien".
- Trigger extraction.

**Expected outcome:**
- A loading/spinner state appears while Claude vision processes the image.
- Once extraction completes, `ReviewList` is rendered with heading "Review extracted words".
- All extracted words are listed and CHECKED by default (Step A).
- "chien" appears in the bottom "Already learned" section: struck-through, labelled "already learned", NOT checkable / editable / removable.
- No "Review words →" disabled button (the Phase 10 stub) appears.

**Validates:** RVW-01

---

### Step 3 — Step A: Prune / edit / select-all-none + already-learned segregation (RVW-02, RVW-05)

**Status:** PENDING

**Goal:** Confirm each editing control works and the gate preventing zero-selection advance.

**Action (in the ReviewList Step A screen):**
1. Edit the text of one word — confirm the edit sticks.
2. Uncheck one word — confirm it becomes unchecked.
3. Click the X to remove one word — confirm the row disappears.
4. Click "Select none" — confirm all rows become unchecked.
5. With none selected, confirm "Next: translate" button is disabled and the hint "Keep at least one word to continue." is visible.
6. Click "Select all" — confirm all rows become checked.
7. Leave ≥ 1 word selected and proceed.

**Expected outcome:** All controls behave as described. No crashes. Already-learned section remains
static (struck-through, immutable) throughout.

**Validates:** RVW-02, RVW-05

---

### Step 4 — Step B: DeepL translate + editable translations + per-row manual fill for failures (RVW-03)

**Status:** PENDING

**Goal:** Confirm the translation fan-out, the editable fields in Step B, and the failure-mode inline prompt.

**Action:**
- After clicking "Next: translate" on the selected words:
  1. EXPECT a standalone spinner "Translating N word(s)…".
  2. Once translation completes, EXPECT Step B "Check translations" with two editable fields per row — native (DeepL-filled) and target.
  3. If any word failed translation, EXPECT the inline message "Translation unavailable — enter manually." and an empty native field you can type into.
  4. Edit at least one translation field and confirm the edit sticks.

**Expected outcome:** Translation fan-out runs, Step B renders, each row has editable fields, failure
rows prompt manual entry.

**Validates:** RVW-03

---

### Step 5 — Commit → success summary counts + cards in deck + duplicate skipped (RVW-04)

**Status:** PENDING

**Goal:** Confirm the commit flow, success summary, and that the duplicate was not re-added.

**Action:**
1. Click "Add N cards".
2. EXPECT in-flight "Adding cards…" (Back/Cancel hidden during submission).
3. EXPECT success summary: "N cards added to your deck." with the secondary line "M already learned (skipped) · K failed" if applicable.
4. Click "Go to my deck" → EXPECT `/dashboard?deck=…` showing the new cards.
5. Confirm "chien" is NOT duplicated in the deck (the seeded card from Step 1 is still there, no second copy added).

**Expected outcome:** Cards are in Neon. Deck count matches. Duplicate skipped. Summary counts accurate.

**Validates:** RVW-04

---

### Step 6 — Cancel at Step A and Step B → zero DB writes (D-14)

**Status:** PENDING

**Goal:** Confirm the cancel path triggers BACK_TO_PICK and writes nothing to the database.

**Action:**
1. Restart the flow (upload a new image, trigger extraction).
2. On Step A, click "Cancel" → EXPECT immediate return to the add-card start screen. Verify the deck card count is unchanged.
3. Restart the flow again. Advance to Step B (click "Next: translate").
4. On Step B, click "Cancel" → EXPECT immediate return to the add-card start screen. Verify the deck card count is still unchanged.

**Expected outcome:** Cancel at both steps triggers `BACK_TO_PICK` with zero new cards written to
the database.

**Validates:** D-14 (zero-write cancel)

---

## How to Signal Completion

When all six steps have been verified:

1. Update this file's `status` frontmatter from `partial` to `complete`.
2. Fill in each step's `result:` field: `result: PASSED` or `result: FAILED — [description of deviation]`.
3. Update `11-04-SUMMARY.md` to reflect the UAT outcome (approved / deviations noted).
4. Commit the updated UAT file.

If any step FAILS: document the deviation in the step, open a bug fix before marking complete.

---

## Spec Reference

Full manual-only verification requirements: `11-VALIDATION.md` (Manual-Only Verifications section)
Plan walkthrough steps: `11-04-PLAN.md` Task 2 (`<how-to-verify>`)
Relevant design decisions: `11-CONTEXT.md` D-14 (zero-write cancel), D-01 (component separation)
