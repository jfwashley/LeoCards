---
phase: 17-performance-optimization
audited: 2026-07-20
asvs_level: default (not specified in PLAN; treated as baseline/default)
threats_total: 21
threats_closed: 21
threats_open: 0
---

# Phase 17 Security Audit

Verification method per disposition: `mitigate` → grep the declared mitigation pattern in the cited files; `accept` → confirm the accepted-risk rationale still holds against current code/git history (this phase had no `transfer` dispositions). No blind vulnerability scanning was performed — every finding below traces to a threat_id declared in the five plan files' `<threat_model>` blocks.

Note: this audit also cross-checked `17-REVIEW.md` (code review, 2026-07-19, fixed 2026-07-20) and the `17-05-SUMMARY.md` post-review addendum (2026-07-20), since both post-date threat-model authoring and materially changed some of the cited mitigation code paths (most notably T-17-01-01's OUT_DIR guard and T-17-05-02's invalidation mechanism).

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-17-01-01 | Tampering | mitigate | CLOSED | `scripts/measure-cwv-lib.mjs:348-369` — `resolveOutDir` defaults to the Phase-17 measurements dir and (post-review WR-04, commit `20ab3c7`) now also throws if an *explicit* `PHASE_OUT_DIR` override resolves inside `16-performance-baseline-measure/baseline` (incl. `../`-relative escapes, since `path.join`/`path.resolve` collapse them). Vitest coverage: `scripts/__tests__/measure-cwv-lib.test.ts:300,313,322`. `git status --porcelain .planning/phases/16-performance-baseline-measure/baseline/` returns empty. |
| T-17-01-02 | Info Disclosure | accept | CLOSED | `src/components/daybreak/shimmer.tsx` + `src/components/deck-view.test.tsx` — confirmed pure presentational atom / jsdom test, no data fetching, no secrets, no DB access. Accepted-risk rationale holds. |
| T-17-01-SC | Tampering (supply chain) | accept | CLOSED | `git log --oneline -- package.json` shows the only Phase-17 touch to package.json is `a05d42d` (17-02, three→devDependencies relocation) — zero new installs across 17-01. |
| T-17-02-01 | Tampering | mitigate | CLOSED | `next.config.ts:1-7` — empty `NextConfig` object, zero `experimental`/`cacheComponents`/`unstable_instant`/`use cache` keys. |
| T-17-02-02 | Info Disclosure | mitigate | CLOSED | Auth session-gate confirmed intact: `src/app/(protected)/layout.tsx:11,15` — `auth.api.getSession(...)` → `redirect("/login")`. Note: the plan's `files_modified` named `src/app/layout.tsx`, but the gate actually lives in the sibling `(protected)/layout.tsx` (17-02-SUMMARY flagged this as a naming-precision note, not a scope deviation) — verified directly rather than taking the SUMMARY's word for it. |
| T-17-02-03 | Tampering | mitigate | CLOSED | Same guarded `resolveOutDir` as T-17-01-01; `git status --porcelain baseline/` empty. |
| T-17-02-04 | DoS | accept | CLOSED | `scripts/measure-cwv.mjs:4,49,192-200,733` — `*test.local` provisioning + `cleanup-test-users.mjs` reap mechanism confirmed present. |
| T-17-02-SC | Tampering (supply chain) | accept | CLOSED | Same package.json history check as T-17-01-SC; `three`/`@types/three` relocated (not installed) in `a05d42d`. |
| T-17-03-01 | Info Disclosure | mitigate | CLOSED | `src/app/(protected)/dashboard/page.tsx:212,279-283` — `qaMode = await readQaAuth()`; `cooldownUntil` ternary resolves to `null` unless `qaMode` is true before crossing to the client `CardList` prop. Confirmed via direct grep of the ternary, not just SUMMARY narrative. |
| T-17-03-02 | Info Disclosure | mitigate | CLOSED | Next's build-time module-boundary enforcement is the proof mechanism; per the audit constraint, `npm run build` was NOT re-run. Evidence instead: `17-05-SUMMARY.md` addendum records a post-review-fix full green run (`vitest`: 2174 passed; e2e web 71/71 passed) after all RSC-boundary-touching commits, and `17-REVIEW.md`'s reviewer explicitly re-checked this boundary across all 23 reviewed files with no illegal server→client leak reported. |
| T-17-03-03 | Tampering | mitigate | CLOSED | Same guarded `resolveOutDir`; `git status --porcelain baseline/` empty. |
| T-17-03-SC | Tampering (supply chain) | accept | CLOSED | No package.json touch in 17-03 per git log. |
| T-17-04-01 | Tampering | mitigate | CLOSED | `src/app/(protected)/deck/browse/page.tsx:4,35,65,88` — `CATEGORIES` allowlist import and `.includes(params.topic)` check present; unrecognized/absent `?topic=` falls through to the tiles landing. |
| T-17-04-02 | Info Disclosure | mitigate | CLOSED | Same green-build evidence chain as T-17-03-02 (post-review full vitest/e2e green run in `17-05-SUMMARY.md` addendum, covering study/new-card/browse RSC conversions too). |
| T-17-04-03 | Tampering | mitigate | CLOSED | Same guarded `resolveOutDir`; baseline diff empty. |
| T-17-04-SC | Tampering (supply chain) | accept | CLOSED | No package.json touch in 17-04 per git log (only `scripts/qa-lib.mjs` gate-fix, not a manifest change). |
| T-17-05-01 | Tampering | mitigate | CLOSED | `e2e/13-perf.spec.ts:272,408-409,478-479` — the nav-timing group and the existing INP assertion are both wrapped in `if (IS_PROD_BUILD)` / `test.skip(!IS_PROD_BUILD, ...)`. `IS_PROD_BUILD` is `process.env.PERF_PROD_BUILD === "1"` (`e2e/perf-markers.ts`). |
| T-17-05-02 | Spoofing/Correctness | mitigate → accept | CLOSED (accepted risk, 2026-07-20) | See "T-17-05-02 Detail" below. The originally-declared mechanism (`router.refresh()` at the study-completion callsite) was **removed** by a post-review commit (`0b5dc8d`, 2026-07-20) as a latency fix. A grep of `src/components/study-session.tsx` for `router.refresh` returns **zero matches** — the literal mitigation cited in the plan's `<threat_model>` no longer exists in the file it was declared for. |
| T-17-05-03 | Tampering | mitigate | CLOSED | Same guarded `resolveOutDir` (this is also the final-run OUT_DIR); baseline diff empty. |
| T-17-05-04 | DoS | mitigate | CLOSED | `e2e/13-perf.spec.ts:237-255` — `test.afterAll` try/catch around the `13-3d-habitat/perf-results.json` write, `console.warn` on failure, no throw. Confirmed present and unmodified in shape from commit 88c16ad. |
| T-17-05-SC | Tampering (supply chain) | accept | CLOSED | No package.json touch in 17-05 per git log. |

## T-17-05-02 Detail (accepted risk)

> **Disposition update (2026-07-20):** Presented at the secure-phase gate as the sole OPEN threat; the user chose **Accept risk**. Status is CLOSED as a documented accepted risk (see Accepted Risks Log). The audit findings below are preserved verbatim; the residual check remains `17-HUMAN-UAT.md` item 2.

### T-17-05-02 — D-17 stale-vs-fresh data on landing (study-completion path)

**Declared mitigation (PLAN 17-05):** "router.refresh() invalidates after study-completion/card-add so due-counts + habitat state are correct on landing; no always-refetch; no experimental cache API."

**What the code actually shows today:**
- `src/components/study-session.tsx:215-227` — the post-study-completion `router.push('/habitat?celebrate=...')` callsite has a comment (lines 219-224) explaining that a trailing `router.refresh()` was **deliberately removed** in commit `0b5dc8d` because `/habitat` is a dynamic route with Router Cache TTL off, so the `push()` alone always triggers a fresh server render. `grep -n "router.refresh" src/components/study-session.tsx` returns 0 matches (only a comment referencing the removed call).
- The card-add half of D-17 is independently confirmed via a different, non-removed mechanism: `src/lib/deck-actions.ts`'s Server Actions call `revalidatePath('/dashboard')` (confirmed via `deck-actions.test.ts:156,162,215,254,286`), and `src/components/card-list.tsx:239` retains its own `router.refresh()` for a different mutation path. So "card-add" freshness is closed; it is specifically the study-completion→dashboard/habitat freshness claim that changed mechanism.
- No caching directives (`unstable_cache`, `export const dynamic`, `revalidate`) were found on the dashboard or habitat page trees, which is consistent with the "genuinely dynamic, always-fresh" architectural claim in the code comment.
- However, this replacement rationale is presently **only a code comment plus an engineering narrative in `17-05-SUMMARY.md`'s addendum** — not a proven mitigation. `.planning/phases/17-performance-optimization/17-HUMAN-UAT.md` item 2 ("D-17 — landing freshness after study completion and card add") is explicitly still `result: [pending]`, and its own note says this exact scenario "needs a manual live-browser confirmation since this is a landing-render-timing behavior not fully capturable by the automated e2e content-visible probe."

**Audit verdict at verification time (before acceptance):** The adversarial audit standard here is grep-a-mitigation-or-it's-open. The literal, plan-declared mitigation pattern (`router.refresh()` in `study-session.tsx`) is absent. The proposed replacement mechanism is architecturally plausible and partially corroborated by static evidence (no cache directives found), but its correctness is a runtime/timing claim that the phase's own tracking explicitly flags as unverified pending human observation — hence reported OPEN by the auditor.

**Acceptance basis (user decision, 2026-07-20):** The dynamic-RSC always-fresh rationale (dynamic route, Router Cache TTL off, no cache directives on the dashboard/habitat trees) is accepted as sufficient, with `17-HUMAN-UAT.md` item 2 (still pending, deploy currently held) retained as the residual runtime check. If UAT item 2 later fails, reopen this threat and re-run `/gsd:secure-phase 17`.

## Unregistered Flags

None of the five SUMMARY.md files contain a `## Threat Flags` section. However, `17-REVIEW.md` (code review, post-dates threat-model authoring) surfaced findings that touch attack-surface-adjacent behavior with no corresponding threat_id in the register. Logged here as informational per the adversarial-stance instruction not to assume the threat register is complete on its own:

- **WR-01 (fixed, commit `e0828c1`):** `CardList`'s empty-deck CTA links (`/deck/browse`, `/deck/new-card`) omitted `?deck=`, so a multi-deck user viewing an empty second deck could silently write a new card to the wrong deck (deck-scoping/data-integrity gap, not a cross-account boundary). No threat_id covers deck-scoping correctness in this phase's register. Now fixed — informational only.
- **WR-03 (fixed, commit `bf8de40`):** `measure-cwv.mjs` exited 0 and reported "ALL ROUTES MEASURED" even when `ROUTE_FILTER` resolved to zero routes (e.g. a typo), producing a silently-empty baseline artifact. This is a test-harness integrity gap adjacent to T-17-01-01/T-17-02-03/etc. but not itself named in the register. Now fixed — informational only.
- **CR-01 (fixed, commit `de1a3db`):** `DaybreakShimmer`'s `prefers-reduced-motion` override was dead code (inline `style.animation` always beat the media-query rule). Accessibility defect, not a STRIDE category in this register, but worth noting since D-03's truths claimed reduced-motion was respected. Now fixed — informational only.
- **CR-02/CR-03 (fixed, commits `44ad5f4`, `2a57ebd`):** The PERF-04 nav-gate harness itself had two structural defects that would have let it both false-fail on real passes and false-pass on zero measured samples (`median([])` returning `-1` satisfying the assertion). A broken test gate is a verification-integrity risk (a "phase certified green" claim resting on a gate that could rubber-stamp anything) — not mapped to a threat_id. Now fixed — informational only.

## Accepted Risks Log

| Threat ID | Rationale | Confirmed still valid |
|-----------|-----------|------------------------|
| T-17-01-02 | Presentational-only component/test, no data path | Yes — code inspection confirms no data/secret access |
| T-17-01-SC, T-17-02-SC, T-17-03-SC, T-17-04-SC, T-17-05-SC | No new npm packages installed during Phase 17 (only a devDependencies reclassification of already-installed `three`/`@types/three`) | Yes — confirmed via `git log --oneline -- package.json` showing a single Phase-17 touch (`a05d42d`) |
| T-17-02-04 | Single-user product; `*test.local` harness users self-clean via `cleanup-test-users.mjs`; no load/stress surface in scope | Yes — cleanup mechanism confirmed referenced in `measure-cwv.mjs` |
| T-17-05-02 | Accepted at secure-phase gate 2026-07-20: study-completion landing freshness rests on the dynamic-RSC always-fresh architecture (commit `0b5dc8d` removed `router.refresh()` as a latency fix); card-add half independently closed via `revalidatePath('/dashboard')`. Residual check: `17-HUMAN-UAT.md` item 2 (pending, deploy held) | Yes — static corroboration: no cache directives on dashboard/habitat trees; reopen if UAT item 2 fails |

## Security Audit 2026-07-20

| Metric | Count |
|--------|-------|
| Threats found | 21 |
| Closed | 21 (20 verified + 1 accepted at gate: T-17-05-02) |
| Open | 0 |

Audit performed by gsd-security-auditor (plan-time register, verify-mitigations mode); T-17-05-02 acceptance recorded by secure-phase orchestrator per user decision.
