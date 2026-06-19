---
phase: 14-qa-observability-foundations
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/lib/debug-cheat.ts
  - src/env.ts
  - src/app/api/debug/cheat/route.ts
  - src/app/api/debug/state/route.ts
  - src/app/api/study/complete/route.ts
  - src/app/(protected)/debug/page.tsx
  - src/app/(protected)/study/page.tsx
  - src/app/(protected)/dashboard/page.tsx
  - src/components/qa-state-badge.tsx
  - src/components/study-card.tsx
  - src/components/study-session.tsx
  - src/components/card-stack.tsx
  - src/components/card-list.tsx
  - src/components/card-edit-dialog.tsx
  - src/components/deck-view.tsx
  - e2e/14-qa-parity.spec.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-06-17
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase adds a QA-observability surface: an HMAC-signed `leo-qa-mode` cookie, secret-gated `/api/debug/*` endpoints, RSC gating that threads a `qaMode` boolean into client components, and a `QaStateBadge` overlay. The central security property (QAOB-04 — QA affordances provably absent from the customer experience when `DEBUG_CHEAT_SECRET` is unset) **holds**. I traced it end-to-end and could not find a way to mint, forge, or replay a valid cookie without the secret, nor a way to make the badge render for an un-authed customer.

Specifically verified sound:
- **HMAC signing/verification** (`signQaMode`/`verifyQaMode`/`verifyOverride`): payload is signed with `createHmac("sha256", secret)`; verification recomputes the expected signature and compares with a length check followed by `timingSafeEqual` — constant-time and not forgeable without the secret. The QA cookie uses a fixed sentinel payload, so there is no user-controlled field to inject. `lastIndexOf(".")` correctly handles base64url payloads (which never contain `.`).
- **Feature-off gating**: every `/api/debug/*` handler calls `cheatEnabled()` first and returns **404** (not 403/500) with a generic `{ error: "Not found" }` body — no information leak. `signQaMode`/`signOverride` throw if the secret is unset, but all call sites gate on `cheatEnabled()` first, so the throw is unreachable in practice.
- **Cookie attributes**: both cookies are set with `httpOnly: true`, `secure: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 1 week` — JS cannot read them (T-14-02), and they are not sent cross-site in a way that matters here.
- **RSC gating**: `readQaAuth()` is correctly `await`ed server-side in `study/page.tsx` and `dashboard/page.tsx`; when false, `qaCardData` is `null` and `<QaStateBadge>` never mounts (genuinely absent from DOM, not CSS-hidden). The dashboard also omits `cooldownUntil` from the client payload entirely for non-QA users.
- **`STUDY_COOLDOWN_MINUTES` precedence**: D-09 ordering is correct (minutes > NO_COOLDOWN/dev-auto-zero > prod defaults); the Zod `min(1)` pipe rejects `0`/negatives/NaN (T-14-04). There is no code-level production block by design (D-10), which is an accepted decision documented in `env.ts`.
- **Cross-user scoping** in `/api/debug/state`: the `?deck=` param is re-verified against `session.user.id` before any card rows are returned (T-14-06).

The findings below are correctness/quality defects, not breaks of the core security property. The most material is WR-01: a `qaMode` prop wired through `StudySession` into `CardStack` but never consumed — dead wiring that signals the badge-on-stack feature is incompletely implemented and could mask a future regression.

## Warnings

### WR-01: `CardStack` declares and receives a `qaMode` prop but silently drops it

**File:** `src/components/card-stack.tsx:3-8`
**Issue:** `CardStackProps` declares `qaMode?: boolean` (line 5) and `study-session.tsx:448` passes `qaMode={qaMode}`, but the function signature destructures only `{ remainingCount }` (line 8). The prop is accepted by the type but never read. This is dead wiring: either the stack was meant to render a QA affordance (and that logic is missing), or the prop should never have been threaded here. As written it is misleading — a reader/maintainer will assume `CardStack` participates in QA gating when it does not, which is exactly the kind of gap that hides a later regression in a security-sensitive surface.
**Fix:** Decide intent. If `CardStack` has no QA behavior, remove the prop from `CardStackProps` and from the `study-session.tsx` call site:
```tsx
// card-stack.tsx
interface CardStackProps {
  remainingCount: number;
}
export function CardStack({ remainingCount }: CardStackProps) { ... }

// study-session.tsx
<CardStack remainingCount={remainingCount} />
```
If a badge/indicator was intended on the stack, implement and gate it on `qaMode` explicitly.

### WR-02: `QaStateBadge` is rendered as a direct child of `<tr>` — invalid table HTML

**File:** `src/components/card-list.tsx:158-167`
**Issue:** In the desktop table, `<QaStateBadge>` (which returns a `<span>`) is rendered as a direct child of `<tr>`, before the first `<td>`. The only valid children of `<tr>` are `<td>`/`<th>`. Browsers will hoist the stray inline element out of the table during parsing (foster-parenting), which can place the absolutely-positioned badge in an unexpected stacking/position context, and React dev builds emit a "validateDOMNesting" warning. The badge relies on `absolute top-1 right-1` against the `relative` `<tr>` — foster-parenting can move it out of that containing block, so the QA badge may render in the wrong place (or detach from the row) precisely in the environment QA depends on. The mobile layout (line 248, badge inside a `relative` `<div>`) is correct; only the table path is malformed.
**Fix:** Wrap the badge in a positioned cell, or anchor it to a `<td>` rather than the `<tr>`:
```tsx
<tr key={card.id} className={`relative border-b ...`}>
  {qaMode && (
    <td className="absolute inset-0 p-0 border-0 pointer-events-none">
      <QaStateBadge data={{ ... }} />
    </td>
  )}
  <td className="text-base py-3 pr-4">{card.front}</td>
  ...
```
(Or restructure so the badge lives inside the first real `<td>`, which is already `relative`-eligible.)

### WR-03: QA badge is `aria-hidden` yet contains the only paused/cooldown state — and the same data is exposed to screen readers nowhere

**File:** `src/components/qa-state-badge.tsx:92-100`
**Issue:** This is flagged not as an a11y-style nit but as a correctness concern for the QA tool's own reliability: the badge is `aria-hidden="true"` and `pointer-events-none`, so any automated test or assistive tooling that reads the accessibility tree (not the raw DOM) will not see the state codes. The e2e parity spec asserts on `[data-qa-badge]` via DOM `count()` so it is unaffected, but any future QA assertion that goes through `getByText`/role queries for the SRS codes will silently find nothing. Combined with WR-02, the badge's observability guarantees are weaker than they appear.
**Fix:** This is acceptable if the team's contract is "badge is a visual-only QA overlay, asserted via `data-qa-badge` + visual diff." If so, document that contract in the component header so future tests do not rely on text/role queries. If programmatic text assertions are expected, drop `aria-hidden` or expose the token string via a stable `data-` attribute (e.g. `data-qa-tokens={tokens.join("·")}`).

### WR-04: `/api/study/complete` performs multi-row writes with no transaction — documented, but partial-write recovery is absent

**File:** `src/app/api/study/complete/route.ts:184-224`
**Issue:** The handler inserts `recall_events`, then loops `await db.update(cards)` per card, then upserts `habitat_metadata` — all outside a transaction (Neon HTTP driver limitation, acknowledged in the comment at line 184 and the JSDoc at line 71-74). A mid-sequence failure (e.g. network blip after the recall_events insert but before the card updates) leaves the DB in a partial state: recall events recorded but mastery rounds/cooldowns not advanced, or some cards advanced and others not. The catch block returns a 500 and the client offers "Retry saving session" (`study-session.tsx:302-312`), but retry re-POSTs the **full** grade batch, which will re-insert duplicate `recall_events` and re-apply `recallCount` increments (`recallCount = recallCount + delta` is non-idempotent). This phase did not introduce the transaction gap, but it did re-touch this file (cooldown config) and the retry path is reachable from the QA flows under test.
**Fix:** Make the write path idempotent or atomic. Minimal mitigation: derive `recall_events.id` deterministically (or dedupe on a natural key) and compute `recallCount` as an absolute set rather than a relative increment, so a retried batch converges instead of double-counting. Longer term, batch the card updates into a single statement and document the at-least-once semantics for the client.

## Info

### IN-01: `/api/debug/state` selects `cards.front` aliased as `front`, then re-maps to `word` — confusing indirection

**File:** `src/app/api/debug/state/route.ts:100-114`
**Issue:** The select uses `front: cards.front` (line 102) but the response/type field is `word` (lines 79, 114 `word: c.front`). It works, but the double-rename (`front` column → `front` alias → `word` field) is needless cognitive load in a security-sensitive readout. No behavioral bug.
**Fix:** Select `word: cards.front` directly, or keep `front` throughout and rename the consumer. Pick one name.

### IN-02: Magic `200` row cap is undocumented at the call site

**File:** `src/app/api/debug/state/route.ts:111`
**Issue:** `.limit(200)` is a bare literal. The intent (cap the QA SRS table) is in a header comment 90 lines up but not at the query. A future edit could change it without realizing it is a deliberate DoS/payload guard.
**Fix:** Extract `const QA_CARD_ROW_CAP = 200;` with a one-line comment, or add an inline `// QAOB-03 cap` comment.

### IN-03: `formatCd` / `formatCooldownRemaining` / `formatCountdown` are three near-duplicate cooldown formatters

**File:** `src/components/qa-state-badge.tsx:23-29`, `src/app/(protected)/debug/page.tsx:424-430`, `src/components/deck-view.tsx:30-42`
**Issue:** Three independent implementations of "format remaining ms as `Xh Ym`/`Ym`", with subtly different output (`1h30m` vs `1h 30m` vs `<1m`). Drift risk: a fix to rounding/zero-handling in one will not propagate. Not a bug today.
**Fix:** Hoist a single `formatRemaining(ms, { compact })` into a shared util (e.g. `src/lib/format.ts`) and have all three call it. If the visual differences are intentional (compact badge vs spaced timer), keep them but note why.

### IN-04: `debug/page.tsx` persists the raw debug secret in `localStorage`

**File:** `src/app/(protected)/debug/page.tsx:23,91,109`
**Issue:** The `DEBUG_CHEAT_SECRET` value is written to `localStorage` under `leo-debug-secret` so the console remembers it across reloads. This is a QA-only, secret-gated page and the documented threat model explicitly accepts secret leakage as low-impact ("user cosmetically forces THEIR OWN single-player habitat view"). Still worth noting: `localStorage` is readable by any XSS on the same origin and persists indefinitely, so a leaked secret could let an attacker mint QA cookies for themselves. Acceptable given the stated model, but flag it so the risk is a conscious choice.
**Fix:** Optional. If you want to reduce exposure, prefer `sessionStorage` (cleared on tab close) or rely solely on the httpOnly `leo-qa-mode` cookie + re-prompt for the secret. Otherwise document the accepted risk in the page header.

### IN-05: Placeholder test asserts `expect(true).toBe(true)` instead of the documented behavior

**File:** `src/lib/debug-cheat.test.ts:141-149`
**Issue:** The test "signQaMode throws when DEBUG_CHEAT_SECRET is unset" contains only `expect(true).toBe(true)` with a comment explaining the real throw is "integration-level." This is a no-op test that will pass regardless of whether `signQaMode` actually throws — it provides zero coverage for the secret-unset throw path, which is a security-relevant guard. Not a product bug, but a false sense of coverage in exactly the module whose correctness underpins QAOB-04.
**Fix:** Either delete the placeholder (so the coverage gap is honest) or implement it properly with `vi.resetModules()` + a fresh `vi.doMock("@/env", () => ({ env: {} }))` and a dynamic re-import, then `expect(() => signQaMode()).toThrow()`. The `cooldown-config.test.ts` file already demonstrates this reset+re-import pattern.

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
