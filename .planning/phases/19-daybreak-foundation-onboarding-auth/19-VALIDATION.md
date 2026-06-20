---
phase: 19
slug: daybreak-foundation-onboarding-auth
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-20
updated: 2026-06-20
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 4.1.1 (unit) + Playwright 1.58.2 (e2e) |
| **Vitest config** | `vitest.config.ts` — default `environment: "node"`, `setupFiles: ["./src/test-setup.ts"]`, `exclude` adds `e2e/**`, alias `@` → `./src`. Daybreak component + page tests opt into a DOM via a per-file `// @vitest-environment jsdom` docblock (Wave 0 establishes this in 19-01). |
| **Playwright config** | `playwright.config.ts` — `testDir: "./e2e"`, `testIgnore: ["**/scripts/**"]`, `timeout 60s`, `retries 1`, `workers 1`, projects `web` (chromium 1280×800) + `mobile` (Pixel 7), `baseURL http://localhost:3000`. `webServer: undefined` → the dev server must be running on :3000 before e2e runs. |
| **Quick run command (unit)** | `npx vitest run` |
| **e2e run command** | `npx playwright test` (scope to a spec: `npx playwright test e2e/02-first-visit-deck-creation.spec.ts`) |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | Unit (vitest): ~10–30s. e2e scoped (specs 01–03): ~60–120s. Full Playwright suite (specs 01–14 + study/progression): ~5–10 min (single worker, retries=1). |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (unit, < 30s). For tasks whose only gate is e2e (19-03 T3, 19-04 T3, 19-05 T1), run the specific spec named in that task's `<automated>`.
- **After every plan wave:** Run `npx vitest run && npx playwright test e2e/01-auth-signup-login.spec.ts e2e/02-first-visit-deck-creation.spec.ts e2e/03-forgot-reset-password.spec.ts`.
- **Before `/gsd:verify-work`:** Full suite green — `npx vitest run && npx playwright test` (dev server up on :3000).
- **Max feedback latency:** ~30s (unit per task); ~120s (scoped e2e per wave).

> Wave sequencing: W1 = {19-01}; W2 = {19-02, 19-03}; W3 = {19-04, 19-05}. The auth e2e specs (01/02) are intentionally RED from the end of W2 until 19-04 (W3) repairs `e2e/helpers.ts` + specs 01/02 — this is expected. W2 verification rests on unit gates (`npx vitest run`, incl. the new signup-payload smoke) plus 19-03's own `e2e/03-forgot-reset-password.spec.ts`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | DSY-02, DSY-03 | T-19-01-XSS | TField/TBtn render user input via escaped JSX (no dangerouslySetInnerHTML) | unit | `npx vitest run src/components/daybreak/__tests__/t-field.test.tsx src/components/daybreak/__tests__/t-btn.test.tsx --reporter=verbose` | ❌ W0 — created by this task (jsdom docblock) | ⬜ pending |
| 19-01-02 | 01 | 1 | DSY-02 | T-19-01-XSS | Pill/Card presentational, no injection sink | unit (typecheck gate) | `npx tsc --noEmit && echo TSC-OK` | ✅ (whole-project tsc) | ⬜ pending |
| 19-01-03 | 01 | 1 | DSY-01 | — | Reduced-motion hook reads only a media query | unit | `npx vitest run src/components/__tests__/habitat-scene-video.test.ts --reporter=verbose` | ✅ existing | ⬜ pending |
| 19-02-01 | 02 | 2 | ONB-01, DSY-03 | T-19-02-AUTH | better-auth signIn preserved verbatim; login still → /dashboard | unit (typecheck + grep gate) | `npx tsc --noEmit && echo TSC-OK && grep -c "daybreak/t-field\|daybreak/t-btn" "src/app/(auth)/login/page.tsx"` | ✅ (whole-project tsc) | ⬜ pending |
| 19-02-02 | 02 | 2 | ONB-02, DSY-03 | T-19-02-VAL | Signup payload narrowed to {name,email,password} — no nativeLanguage written | unit | `npx vitest run "src/app/(auth)/__tests__/signup-payload.test.tsx" --reporter=verbose` | ❌ W0 — created by this task | ⬜ pending |
| 19-03-01 | 03 | 2 | ONB-03, DSY-03 | T-19-03-ENUM | Forgot confirmation is privacy-safe ("If an account exists") — no account enumeration | unit (typecheck + grep gate) + e2e (19-03-03) | `npx tsc --noEmit && echo TSC-OK && grep -c "If an account exists" "src/app/(auth)/forgot-password/page.tsx"` | ✅ (whole-project tsc) | ⬜ pending |
| 19-03-02 | 03 | 2 | ONB-04, DSY-03 | T-19-03-TOKEN / T-19-03-MATCH / T-19-03-LEAK | Reset token validated server-side; expired/invalid → generic dead-end; password-match enforced | unit (typecheck + grep gate) + e2e (19-03-03) | `npx tsc --noEmit && echo TSC-OK && grep -c "resetPassword" "src/app/(auth)/reset-password/page.tsx"` | ✅ (whole-project tsc) | ⬜ pending |
| 19-03-03 | 03 | 2 | ONB-03, ONB-04 | T-19-03-ENUM / T-19-03-TOKEN | E2E locks privacy-safe forgot confirmation + reset expired-link dead-end + mismatch error | e2e | `npx playwright test e2e/03-forgot-reset-password.spec.ts --reporter=line` | ❌ W0 — created by this task | ⬜ pending |
| 19-04-01 | 04 | 3 | ONB-05 | T-19-04-EOP / T-19-04-AUTHZ | /welcome RSC guards: no session → /login; has-decks → /dashboard (no re-onboard) | unit (typecheck + grep gate) | `grep -rn "FirstVisitPicker" src; npx tsc --noEmit && echo TSC-OK` | ✅ (whole-project tsc) | ⬜ pending |
| 19-04-02 | 04 | 3 | ONB-05 | T-19-04-INJ / T-19-04-MASS / T-19-04-IDEMP | native/target validated via z.enum before updateUser; updateUser before createDeck; only {nativeLanguage} written | unit (typecheck + grep gate) | `grep -c "updateUser" "src/components/welcome/welcome-step-choose.tsx"; grep -c "use-prefers-reduced-motion" "src/components/welcome/habitat-teaser.tsx"; npx tsc --noEmit && echo TSC-OK` | ✅ (whole-project tsc) | ⬜ pending |
| 19-04-03 | 04 | 3 | ONB-05, ONB-06 | T-19-04-EOP | E2E: signup→/welcome→/dashboard; 0-deck→/welcome redirect; no "Native language" field; ONB-06 empty-deck + no-search-results states | e2e | `npx playwright test e2e/01-auth-signup-login.spec.ts e2e/02-first-visit-deck-creation.spec.ts --reporter=line` | ✅ existing (rewritten by this task) | ⬜ pending |
| 19-05-01 | 05 | 3 | ONB-06 | T-19-05-XSS | No-search query rendered via escaped JSX; Clear search resets query | e2e (+ typecheck + grep gate) | `... grep gates ... && npx tsc --noEmit && echo TSC-OK && npx playwright test e2e/02-first-visit-deck-creation.spec.ts --reporter=line` | ✅ existing (asserts the restyle; spec owned by 19-04) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> "File Exists ✅ (whole-project tsc)" means the task's gate is `npx tsc --noEmit` over the entire project — no new test file is created, but the gate is a real behavioral/compile check that fails on missing or erroring source (it gates on the tsc exit code, not on grep of tsc output). Tasks marked "❌ W0 — created by this task" are the Wave 0 stubs listed below.

### Requirement → Task coverage cross-check

- **DSY-01** → 19-01-03 (token/font baseline confirmed; hook extracted)
- **DSY-02** → 19-01-01 (TField/TBtn unit tests), 19-01-02 (Pill/Card)
- **DSY-03** → 19-01-01, 19-02-01, 19-02-02, 19-03-01, 19-03-02 (≥44px touch + inline per-field validation enforced via TField/TBtn)
- **ONB-01** → 19-02-01
- **ONB-02** → 19-02-02 (unit smoke: no nativeLanguage) + 19-04-03 (e2e: no "Native language" label)
- **ONB-03** → 19-03-01 + 19-03-03 (e2e)
- **ONB-04** → 19-03-02 + 19-03-03 (e2e)
- **ONB-05** → 19-04-01, 19-04-02, 19-04-03 (e2e)
- **ONB-06** → 19-05-01 (presentation) + 19-04-03 (e2e behavioral assertions, run by both 19-04-03 and 19-05-01)

All 9 phase requirements (DSY-01..03, ONB-01..06) are covered by at least one automated gate.

---

## Wave 0 Requirements

Wave 0 work is folded into Wave 1 (plan 19-01) and the wave-2/3 tasks that own each spec. All stubs below are written by tasks in this plan set (they are not pre-existing) — hence `wave_0_complete: true`:

- [x] `src/components/daybreak/__tests__/t-field.test.tsx` — DSY-02 unit stub for TField (label, error class, ref forwarding, disabled). Created by **19-01-01**.
- [x] `src/components/daybreak/__tests__/t-btn.test.tsx` — DSY-02 unit stub for TBtn (Loader2 when isPending, disabled when isPending, renders children). Created by **19-01-01**.
- [x] DOM test env for daybreak component tests — per-file `// @vitest-environment jsdom` docblock (and `jsdom` install if absent). Established by **19-01-01** without changing the global `node` default.
- [x] `src/app/(auth)/__tests__/signup-payload.test.tsx` — ONB-02/D-04 unit smoke: signup submits exactly {name,email,password} (no nativeLanguage) and routes to /welcome. Created by **19-02-02**.
- [x] `e2e/03-forgot-reset-password.spec.ts` — ONB-03 (privacy-safe confirmation) + ONB-04 (expired-link dead-end + mismatch). Created by **19-03-03**.
- [x] `e2e/helpers.ts` rework — `signUpFreshUser` → waits for `/welcome`; `pickFirstDeckLanguage` → `completeWelcomeFlow(page, target, native)`; `signUpWithDeck`, `testEmail`, `waitForCompilation` exports preserved (19-03 imports the latter two). Done by **19-04-03**.
- [x] `e2e/02-first-visit-deck-creation.spec.ts` rewrite — welcome flow + 0-deck redirect + ONB-06 empty-deck/no-search-results assertions. Done by **19-04-03** (consumed as the gate by 19-05-01).
- [x] `e2e/01-auth-signup-login.spec.ts` update — assert no "Native language" label; session-dependent tests use `completeWelcomeFlow`. Done by **19-04-03**.

> No standalone framework install is needed (Vitest + Playwright already in package.json). The only conditional install is `jsdom` (+ `@testing-library/react` if not already present), handled in 19-01-01 if the daybreak tests cannot find a DOM env.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Daybreak tokens/fonts render correctly app-wide (cream bg, amber primary, Baloo 2 + Figtree) | DSY-01 | Visual fidelity vs hi-fi; CSS-var application is not meaningfully unit-testable | Run dev server; open `/login`; confirm cream background, amber primary button, Baloo 2 display headings, Figtree body. Inspect `:root` CSS vars in devtools. (19-01-03 also asserts the vars exist in globals.css/layout.tsx via SUMMARY.) |
| Auth screen scene recolouring (login/signup sunrise, forgot daylight, reset dusk) | D-07 / ONB-01..04 | Color/gradient fidelity is visual | Open each auth screen; confirm the DaybreakAuthScene variant matches the handoff per D-07. |
| Mini-habitat teaser ambient motion + reduced-motion static state | D-06 / ONB-05 | Animation smoothness + the reduced-motion branch are visual/perceptual | Open `/welcome` step 2; confirm ambient motion. Toggle OS "reduce motion"; reload; confirm the teaser is fully static. (The hook gating is grep-asserted in 19-04-02.) |
| Pixel-faithful match to all hi-fi artboards/states | ONB-01..06, DSY-* | Pixel parity vs `LeoCards Daybreak Onboarding & Auth.html` | Phase gate visual pass (`--skip-ui` deferred): compare each screen/state to the artboard. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (12/12 tasks have an `<automated>` block; the 4 Wave 0 stub files are created within the plan set)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has a unit/typecheck or e2e gate)
- [x] Wave 0 covers all MISSING references (daybreak unit tests, signup-payload smoke, e2e/03 spec, helpers + specs 01/02 rework)
- [x] No watch-mode flags (`vitest run` and `playwright test` are one-shot; no `--watch`)
- [x] Feedback latency < 30s for unit gates; < 120s for scoped e2e
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` — all Wave 0 test stubs are present as tasks in the plan set (19-01-01, 19-02-02, 19-03-03, 19-04-03)

**Approval:** approved 2026-06-20
</content>
