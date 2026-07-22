---
phase: 27
slug: 27-performance-batch-2
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 27 (Performance batch 2) — Security Audit

**Audited:** 2026-07-22
**ASVS Level:** 1
**block_on:** high
**Threat register source:** union of `<threat_model>` blocks in 27-01-PLAN.md through 27-10-PLAN.md (register authored at plan time)

## Summary

31 threat-register entries across 10 plans (including 10 "no package installs" supply-chain n/a rows). Every `mitigate` entry was verified against the actual implementation (not documentation) via grep/read of the cited files. Every `accept` entry is logged in the Accepted Risks Log below. Zero unregistered attack-surface flags found in any plan's SUMMARY.md (no plan used a `## Threat Flags` heading). Two WARNING-tier code-review findings (WR-01, WR-02) against threat-adjacent code were confirmed fixed in the current source. Three Info-tier review findings (IN-01/02/03) are acknowledged-not-fixed, non-blocking, and noted below for completeness — none map to a registered STRIDE threat ID and none are ASVS-relevant (functional robustness, not a security control).

**Result: 31/31 CLOSED. 0 OPEN.**

---

## Threat Verification

### 27-01 — Session cache dedupe + cookieCache

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-01-01 | Elevation of Privilege | accept | CLOSED | 5-min `cookieCache` stale window is a bounded, documented trade-off (D-03). Logged in Accepted Risks Log below. |
| T-27-01-02 | Information Disclosure | mitigate | CLOSED | `src/app/(protected)/account/page.tsx:29` and `src/lib/account-actions.ts:65,159` all call `getSessionFresh()` (not `getSession()`), confirmed via grep. `src/lib/auth-session.ts:30-35` shows `getSessionFresh` passes `query: { disableCookieCache: true }`; `getSession` (line 17-19) does not. |
| T-27-01-03 | Tampering | accept | CLOSED | better-auth's default "compact" cookieCache strategy is HMAC-signed (confirmed present in `node_modules/better-auth/dist/crypto`/`cookies` — HMAC/sign primitives exist in the installed package); no explicit `strategy` override in `src/lib/auth.ts`, so the signed default applies. Logged in Accepted Risks Log below. |
| T-27-01-SC | Tampering (supply chain) | n/a | CLOSED | No new dependencies added this phase (confirmed no `package.json` diff for this plan). |

### 27-02 — Secondary DB indexes + gated Neon push

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-02-01 | Tampering | mitigate | CLOSED | 27-02-SUMMARY.md records the D-08 human-authorization gate was honored: push paused until Josh's explicit "Authorized — push now"; additive index-only change (`src/db/schema.ts:54,100,127,141` show only `index(...)` third-arg callbacks added, no column changes). |
| T-27-02-02 | Information Disclosure | mitigate | CLOSED | SUMMARY records `DATABASE_URL` extracted via `grep -m1 '^DATABASE_URL=' .env.local \| cut -d= -f2- \| tr -d '"'`, never sourced. |
| T-27-02-03 | Denial of Service | mitigate | CLOSED | SUMMARY records `npm run db:push` output `[✓] Changes applied` (not "no changes detected") plus a post-push `pg_indexes` query confirming all four indexes exist on the correct Neon instance. |
| T-27-02-SC | Tampering (supply chain) | n/a | CLOSED | No package installs this phase. |

### 27-03 — Server-side Browse topic filtering

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-03-01 | Tampering | accept | CLOSED | `src/app/(protected)/deck/browse/page.tsx:69-70` — `?topic=` still validated against `(CATEGORIES as readonly string[]).includes(params.topic)` before use, byte-consistent with the pre-existing WR-01 fix; no new unvalidated input surface. |
| T-27-03-02 | Information Disclosure | accept | CLOSED | Word catalogue is static, non-sensitive, identical for all users; filtering narrows serialized payload, does not widen exposure. Logged in Accepted Risks Log below (informational). |
| T-27-03-SC | Tampering (supply chain) | n/a | CLOSED | No package installs this phase. |

### 27-04 — Consolidate dashboard data pass

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-04-01 | Elevation of Privilege | mitigate | CLOSED | `src/app/(protected)/dashboard/page.tsx:234` — `getDeckCards(activeDeck.id)`, where `activeDeck` is resolved from `getUserDecks(session.user.id)` (line 203) — the consolidated single query still scopes to the session-owning user's deck; no new query surface introduced. |
| T-27-04-02 | Information Disclosure | mitigate | CLOSED | `src/app/(protected)/dashboard/page.tsx:269-283` — the client-serialized `cardRows` object omits `createdAt` entirely (confirmed via read); the only `createdAt` reference remaining (line 252) is in the server-internal `allCardsForSession` array used for `assembleSession`/cooldown math, never serialized to the client. |
| T-27-04-SC | Tampering (supply chain) | n/a | CLOSED | No package installs this phase. |

### 27-05 — Optimistic pause toggle + memoized CardRow

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-05-01 | Tampering | mitigate | CLOSED | `src/components/card-list.tsx` — `rollbackPause` (line 448) restores prior state on failure (called at lines 482/486 inside `handleTogglePause`'s catch/failure paths); `scheduleRefresh`/`router.refresh()` still called on success, re-syncing from server truth. **Residual note:** code review IN-03 (acknowledged-not-fixed, Info-tier) observes the optimistic override is never explicitly cleared after a successful refresh — display parity holds today because the server value matches the override post-refresh, but a future out-of-band pause-state change (e.g. second tab) could show stale state until unmount. Non-blocking; tracked below. |
| T-27-05-SC | Tampering (supply chain) | n/a | CLOSED | React built-ins only, no new deps. |

### 27-06 — Translation race fix + LRU cache

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-06-01 | Tampering | mitigate | CLOSED | `src/lib/translation-cache.ts:28-30` — key is `${sourceLang}:${targetLang}:${text}`, built only from `RequestSchema`-validated inputs in `route.ts` (enum langs, bounded text length) before the cache is touched; no attacker-controllable unvalidated key surface. |
| T-27-06-02 | Information Disclosure | accept | CLOSED | Translation output is deterministic, non-per-user public dictionary content; safe to share across users. Logged in Accepted Risks Log below. |
| T-27-06-03 | Denial of Service | mitigate | CLOSED | `src/app/api/translate/route.ts:6` imports `createRateLimiter` from `@/lib/rate-limit`; the existing 30/min per-user gate is unchanged and still bounds request volume regardless of cache hit rate. |
| T-27-06-SC | Tampering (supply chain) | n/a | CLOSED | `translation-cache.ts` is hand-rolled (mirrors `rate-limit.ts`'s Map convention); confirmed no `lru-cache` dependency added. |

**Review-flagged fix verified in code (WR-02):** `src/app/api/translate/route.ts:139,177` — both the array and singular branches now guard `if (translated.trim() !== "")` / `if (result.text.trim() !== "")` before `translationCache.set(...)`, closing the empty-translation cache-poisoning gap the reviewer found. Commit `183b91e` per REVIEW.md `fix_status`.

**Review-flagged fix verified in code (WR-01, translation-form.tsx — adjacent to this plan's PERF-19 AbortController work):** `src/components/translation-form.tsx:250-269` — the empty-text early return now calls `translateAbortRef.current?.abort()` and dispatches `TRANSLATE_CANCEL` before returning, closing the stale-translation-into-emptied-field gap. Commit `04e6a97` per REVIEW.md `fix_status`.

### 27-07 — zod/mini client bundle diet

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-07-01 | Tampering | mitigate | CLOSED | `grep -rln 'from "zod"'` across all 9 target files (login/signup/forgot-password/reset-password pages, welcome-step-choose, review-list, translation-form, account-details-card, change-password-card) returns zero matches — confirmed no full-zod straggler remains; all 9 exclusively import `zod/mini`. zod/mini shares the same `_zod` validation core (bundle-size change only, not a strictness change); server-side validation (unchanged, out of this plan's scope) remains the authoritative gate. |
| T-27-07-SC | Tampering (supply chain) | n/a | CLOSED | `zod/mini` is a subpath of the already-installed `zod` package; no new dependency. |

### 27-08 — Remove over-video habitat backdrop-filter blur

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-08-01 | (none — CSS-only) | accept | CLOSED | Pure decorative-CSS removal; no new trust boundary. Confirmed `backdropFilter`/`backdrop-blur` absent from all 4 target files and unchanged (still present) in `account-back.tsx` (D-02 exclusion honored) via the plan's own committed regression test (`h-habitat-overlays-no-blur.test.tsx`). |
| T-27-08-SC | Tampering (supply chain) | n/a | CLOSED | No package installs this phase. |

### 27-09 — Promise.all study-complete reads + derive factsAfter

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-09-01 | Elevation of Privilege | mitigate | CLOSED | `src/app/api/study/complete/route.ts:146-169` — `Promise.all([ownedDeckRows, cardRows, factsBefore])` resolves, THEN `if (!ownedDeckRows[0]) return Response.json({ error: "Forbidden" }, { status: 403 })` runs — confirmed the 403 ownership guard executes strictly before any write, guard ordering preserved relative to the parallelized reads. |
| T-27-09-02 | Tampering | mitigate | CLOSED | `factsAfter` derivation logic present (line ~311+, comment confirms `getHabitatFacts` returns exactly `{userId, lastActivityAt, learnedCardCount}`); `route.test.ts` (per 27-09-SUMMARY.md) asserts `getHabitatFacts` called exactly once and a threshold-crossing-fixture derivation-equality test passes. Code review (27-REVIEW.md) independently traced the derivation as provably equivalent to the old re-fetch (no critical/warning finding here). |
| T-27-09-SC | Tampering (supply chain) | n/a | CLOSED | No package installs this phase. |

### 27-10 — Extraction latency (Haiku trial)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-27-10-01 | Information Disclosure | mitigate | CLOSED | `src/app/api/extract/route.ts:218-223` — the `console.error` calls on schema-validation-failure and vision-error paths log only fixed strings (`"[extract] schema validation failed"`, `"[extract] vision error"`), no image bytes or extracted-word content; comment at line 218 explicitly documents the no-log-image-bytes rule (AI-SPEC Section 7), unchanged by the model swap. |
| T-27-10-02 | Denial of Service | mitigate | CLOSED | `src/app/api/extract/route.ts:165` confirms `anthropic("claude-haiku-4-5")`. 27-10-SUMMARY.md records the D-05/D-06 checkpoint was resolved by Josh ("done" — keep Haiku, no revert) after reviewing a synthetic quality side-by-side (parity on real vocabulary content) and a latency median (~2.1s, under the 4s D-06 threshold). Residual real-photo-fidelity gap explicitly carried to `27-HUMAN-UAT.md` (documented tech debt, not silently dropped). |
| T-27-10-03 | Tampering | n/a | CLOSED | Decision was "done" (no streaming shipped) — confirmed `grep -c "partialOutputStream" src/app/api/extract/route.ts` = 0, so no partial-JSON-parsing attack surface was introduced this phase. Threat does not materialize. |
| T-27-10-SC | Tampering (supply chain) | n/a | CLOSED | `ai`/`@ai-sdk/anthropic` already installed; no new dependency. |

---

## Accepted Risks Log

The following threats carry an `accept` disposition per their plan's `<threat_model>`. Logged here per the auditor's accept-disposition verification requirement.

| Threat ID | Risk | Accepted Rationale | Owner Decision |
|-----------|------|---------------------|-----------------|
| T-27-01-01 | `session.cookieCache` gives a signed-out/deleted/revoked session up to 5 minutes of continued apparent validity on devices holding the cached cookie. | Bounded, fixed 5-min TTL; a deleted user's writes still fail at the DB layer (FK cascade removes rows); acceptable UX/security trade-off for this app's threat model. | D-03 (27-CONTEXT.md) |
| T-27-01-03 | cookieCache payload is signed but not encrypted. | Payload contains only non-sensitive id/email/expiry fields; better-auth's default "compact" strategy HMAC-signs it (tamper-evident); no confidentiality requirement for this payload. | D-03 (27-CONTEXT.md) |
| T-27-03-01 | `?topic=` is a client-controllable URL param feeding server-side filtering. | Pre-existing WR-01 allow-list validation against `CATEGORIES` preserved byte-unchanged this phase; no new input surface introduced. | Inherited from prior phase's WR-01 fix |
| T-27-03-02 | Topic-detail filtering changes what subset of the word catalogue is serialized per request. | Word catalogue is static, non-sensitive, identical for all users regardless of auth state; narrowing the payload reduces exposure, does not widen it. | 27-03-PLAN.md threat_model |
| T-27-06-02 | Translation LRU cache is shared across all users on a single server instance. | Translation output is deterministic public dictionary content (source text -> target text) with no per-user data in the cached value; cross-user sharing introduces no confidentiality risk. | 27-06-PLAN.md threat_model |
| T-27-08-01 | Removing `backdrop-filter` blur is a visual/UX change with no direct security implication. | Pure decorative CSS; trivially revertible (D-01); no trust boundary affected. | D-02 (27-CONTEXT.md) |

---

## Unregistered Flags

None. No plan's SUMMARY.md contains a `## Threat Flags` heading (searched all 10 SUMMARY.md files; zero matches). No new attack surface was found to be flagged-but-unmapped by any executor.

**Non-blocking residual notes from 27-REVIEW.md (Info-tier, acknowledged-not-fixed, do not map to any registered threat ID — recorded here for completeness, not as gaps in this phase's threat register):**
- IN-01 (`src/app/api/translate/route.ts:114-145`): array-branch partial DeepL miss can serialize a `null` into a nominally `string[]`-typed response, failing an entire batch client-side. Functional robustness issue, not a security control gap — no data exposure, no auth bypass.
- IN-02 (`src/components/card-list.tsx:471-494`): `startTransition(async () => …)` wraps async work React does not track as a transition. Inert/misleading, not a security issue.
- IN-03 (`src/components/card-list.tsx:461-497,750-758`): optimistic pause override is never cleared after a successful refresh, so a future out-of-band pause-state change (e.g., a second tab) could show stale state until unmount. This is a residual sharpening of T-27-05-01's mitigation (see 27-05 row above) — the core rollback-on-error mitigation is verified present and closes the registered threat; this note flags a narrower edge case the reviewer surfaced beyond the plan's original threat statement. Recommend addressing opportunistically in a future card-list.tsx touch; not a blocker for this phase (Info-tier, no data/auth exposure — worst case is a stale optimistic UI value self-correcting on next full page load).

---

## Verification Method Notes

- All `mitigate` dispositions were verified by reading/grepping the actual cited implementation files (not by trusting PLAN/SUMMARY prose) — see file:line evidence per row above.
- All `accept` dispositions are logged in the Accepted Risks Log above (this file is the accepted-risks log referenced by the auditor contract).
- No `transfer` dispositions appear anywhere in this phase's threat register.
- Two WARNING-tier findings from the independent code review (27-REVIEW.md) touching threat-adjacent code (WR-01 in translation-form.tsx, WR-02 in translate/route.ts + translation-cache.ts) were independently re-verified present in the current source (not just trusted from the review's `fix_status` field) — see the 27-06 section above.

SECURITY.md: `.planning/phases/27-performance-batch-2/27-SECURITY.md`
