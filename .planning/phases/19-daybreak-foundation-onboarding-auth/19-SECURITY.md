---
phase: 19
slug: daybreak-foundation-onboarding-auth
status: verified
threats_total: 19
threats_open: 0
asvs_level: 1
created: 2026-06-20
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser client → better-auth API | Login/signup/forgot/reset forms submit credentials | email, password, name — untrusted, crosses HTTP |
| Email link → reset-password page | Reset token arrives via ?token= URL query param | token — untrusted, possibly expired or tampered |
| Browser (welcome step 3) → better-auth /update-user | nativeLanguage persisted at onboarding completion | string — validated client+server-side |
| Browser (welcome step 3) → createDeck server action | Target language code crosses into DB write | string — allow-listed client+server-side |
| Browser → /welcome RSC route | Direct navigation by unauthenticated or already-onboarded users | session cookie |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-19-01-XSS | Tampering (XSS) | Pill / Card / TField children & props | mitigate | No dangerouslySetInnerHTML in any primitive; all content through JSX children (auto-escaped). | closed |
| T-19-01-PRES | Information Disclosure | All primitives (client) | accept | Presentation-only; no secrets or env values referenced. | closed |
| T-19-02-AUTH | Spoofing / Auth | authClient.signIn.email / signUp.email | mitigate | better-auth flows preserved verbatim; presentation swap only. | closed |
| T-19-02-ENUM | Information Disclosure | Signup duplicate-email error | accept | "An account with this email already exists." intentionally shown at registration; accepted per plan. | closed |
| T-19-02-SECRET | Information Disclosure | Client auth components | accept | No private secrets referenced; only NEXT_PUBLIC_ env var in auth-client.ts. | closed |
| T-19-02-VAL | Tampering (input validation) | Signup/Login zod schemas | mitigate | Client-side zod (email, password min-8) preserved; nativeLanguage removed from signUp payload (narrowed). Unit smoke asserts no nativeLanguage key in payload. | closed |
| T-19-03-ENUM | Information Disclosure (account enumeration) | Forgot confirmation copy | mitigate | Confirmation always reads "If an account exists, we've sent a reset link to …" — identical regardless of registration status. | closed |
| T-19-03-TOKEN | Tampering / Spoofing | Reset token from URL | mitigate | authClient.resetPassword({ newPassword, token }) preserved; server-side validity enforced by better-auth; revokeSessionsOnPasswordReset: true unchanged. | closed |
| T-19-03-MATCH | Tampering (weak input) | Reset password fields | mitigate | zod .refine("Passwords do not match") preserved; min-8 check retained; better-auth re-validates server-side. | closed |
| T-19-03-LEAK | Information Disclosure | Reset error copy | mitigate | Generic "This reset link has expired." shown for both missing-token and server-rejected-token paths; no oracle distinguishing the two cases. | closed |
| T-19-04-EOP | Elevation of Privilege | /welcome route + createDeck | mitigate | RSC guard calls auth.api.getSession + redirect("/login") when absent. createDeck independently calls getSession and throws "Unauthorized". | closed |
| T-19-04-MASS | Tampering (mass assignment) | authClient.updateUser | mitigate | auth.ts additionalFields declares only nativeLanguage; client passes only { nativeLanguage }; better-auth ignores undeclared keys. | closed |
| T-19-04-INJ | Tampering (invalid field value) | nativeLanguage / targetLang | mitigate | z.enum(["en","fr","es"]) validated client-side before updateUser; createDeck checks ALLOWED_LANGUAGES server-side and throws on invalid input. | closed |
| T-19-04-AUTHZ | Broken Access Control (re-onboard) | /welcome has-decks guard | mitigate | RSC redirects to /dashboard when getUserDecks(...).length > 0; returning users cannot re-run welcome or create spurious extra decks. | closed |
| T-19-04-IDEMP | Data integrity (partial write) | updateUser-then-createDeck ordering | accept | updateUser runs before createDeck; if createDeck fails, user retains nativeLanguage and sees retry state. If updateUser fails, no deck created. nativeLanguage has DB default 'en'. Accepted: no orphaned half-state breaks the app. | closed |
| T-19-04-SECRET | Information Disclosure | Welcome client components | accept | No secrets referenced; only public auth-client + server-action calls. | closed |
| T-19-05-XSS | Tampering (XSS via search query) | No words match "{query}" rendering | mitigate | query interpolated as JSX text child (React auto-escapes); no dangerouslySetInnerHTML. | closed |
| T-19-05-PRES | Information Disclosure | card-list empty states (client) | accept | Presentation-only; no secrets and no new data fetching. | closed |
| CR-01-REDIR | Tampering / Open redirect | login/page.tsx ?callbackUrl handler | mitigate | Guard present: callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") — only same-origin relative paths followed; absolute and protocol-relative URLs fall through to /dashboard. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-01-PRES | Daybreak primitives (TField/TBtn/Pill/Card) and usePrefersReducedMotion are presentation-only; they reference no secrets and introduce no network surface. | Plan author | 2026-06-20 |
| AR-19-02 | T-19-02-ENUM | Signup intentionally reveals account existence ("An account with this email already exists.") — standard registration UX. The privacy-safe path is the Forgot flow (T-19-03-ENUM), which is not weakened here. | Plan author | 2026-06-20 |
| AR-19-03 | T-19-02-SECRET | auth-client.ts references only NEXT_PUBLIC_APP_URL — a deliberately public URL, not a credential. No private env vars appear in any client component. | Plan author | 2026-06-20 |
| AR-19-04 | T-19-04-IDEMP | updateUser-before-createDeck ordering accepted as the correct D-04 invariant. Partial failure leaves nativeLanguage persisted (benign) or leaves no deck (user retries). nativeLanguage DB default 'en' prevents null state. | Plan author | 2026-06-20 |
| AR-19-05 | T-19-04-SECRET | Welcome client components (welcome-step-choose, habitat-teaser, etc.) reference no secrets; all server calls go through better-auth's auth-client or typed server actions. | Plan author | 2026-06-20 |
| AR-19-06 | T-19-05-PRES | card-list.tsx empty-state restyle is presentation-only; no new data fetching, auth, or network surface introduced. | Plan author | 2026-06-20 |

---

## Threat Verification Evidence

| Threat ID | Evidence |
|-----------|----------|
| T-19-01-XSS | grep for `dangerouslySetInnerHTML` in `src/components/daybreak/` — 0 matches. TField renders `{label}` / `{error}` / `{hint}` as JSX text children. Pill and Card render `{children}` as JSX. |
| T-19-01-PRES | `src/components/daybreak/t-field.tsx:1-42`, `pill.tsx:1-23`, `card.tsx:1-26` — no imports of env vars, auth, or DB. |
| T-19-02-AUTH | `src/app/(auth)/login/page.tsx:41-44` — `authClient.signIn.email({ email, password })` preserved verbatim. `src/app/(auth)/signup/page.tsx:41-45` — `authClient.signUp.email({ email, password, name })` preserved. |
| T-19-02-ENUM | `src/app/(auth)/signup/page.tsx:48` — `setEmailError("An account with this email already exists.")` — accepted per plan. |
| T-19-02-SECRET | `src/lib/auth-client.ts:6` — only `process.env.NEXT_PUBLIC_APP_URL` (public prefix). grep for `process.env.` (non-NEXT_PUBLIC) in `src/app/(auth)/` — 0 matches. |
| T-19-02-VAL | `src/app/(auth)/signup/page.tsx:15-19` — signupSchema: name/email/password only (0 occurrences of `nativeLanguage`). `signUp.email` call at line 41-45 passes only `{ email, password, name }`. |
| T-19-03-ENUM | `src/app/(auth)/forgot-password/page.tsx:74` — "If an account exists, we've sent a reset link to…" — conditional prefix present; same text shown regardless of account existence. |
| T-19-03-TOKEN | `src/app/(auth)/reset-password/page.tsx:90-93` — `authClient.resetPassword({ newPassword: values.password, token })` preserved. `src/lib/auth.ts:39` — `revokeSessionsOnPasswordReset: true` unchanged. |
| T-19-03-MATCH | `src/app/(auth)/reset-password/page.tsx:15-23` — `resetSchema .refine("Passwords do not match")` with `path: ["confirmPassword"]` preserved. |
| T-19-03-LEAK | `src/app/(auth)/reset-password/page.tsx:27-61` — `ExpiredState` component used for both missing-token (line 80: `if (!token) return <ExpiredState />`) and tokenError (line 106: `if (tokenError) return <ExpiredState />`) paths. Both show "This reset link has expired." — generic, no oracle. |
| T-19-04-EOP | `src/app/(auth)/welcome/page.tsx:10-11` — `auth.api.getSession` + `if (!session) redirect("/login")`. `src/lib/deck-actions.ts:37-39` — independent `getSession` + `throw new Error("Unauthorized")`. |
| T-19-04-MASS | `src/lib/auth.ts:13-21` — `additionalFields` declares only `nativeLanguage`. `src/components/welcome/welcome-step-choose.tsx:58` — `authClient.updateUser({ nativeLanguage: nativeParse.data })` — single field only. |
| T-19-04-INJ | `src/components/welcome/welcome-step-choose.tsx:27,48-54` — `LANG_ENUM = z.enum(["en","fr","es"])`, `safeParse` on both nativeLang and targetLang before updateUser. `src/lib/deck-actions.ts:22-35` — `ALLOWED_LANGUAGES = new Set(["fr","es","en"])`, checked before session lookup. |
| T-19-04-AUTHZ | `src/app/(auth)/welcome/page.tsx:14-15` — `getUserDecks(session.user.id)` + `if (decks.length > 0) redirect("/dashboard")`. `src/app/(protected)/dashboard/page.tsx:52-54` — `if (decks.length === 0) redirect("/welcome")`. |
| T-19-04-IDEMP | `src/components/welcome/welcome-step-choose.tsx:56-66` — updateUser at line 58, createDeck at line 60, catch block at line 63-67 sets error only — no reset of nativeLang/targetLang. Accepted partial-write risk documented. |
| T-19-04-SECRET | grep for `process.env.` (non-NEXT_PUBLIC) in `src/components/welcome/` — 0 matches. |
| T-19-05-XSS | `src/components/card-list.tsx:161` — `No words match &ldquo;{query}&rdquo;` — JSX text interpolation (React auto-escapes). grep for `dangerouslySetInnerHTML` in card-list.tsx — 0 matches. |
| T-19-05-PRES | `src/components/card-list.tsx:72-119, 145-180` — empty-state branches are pure JSX rendering of props; no env vars, auth, or DB. |
| CR-01-REDIR | `src/app/(auth)/login/page.tsx:51-57` — `callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")` guard present. Absolute URLs (https://...) and protocol-relative URLs (//) fall through to `/dashboard`. |

---

## Unregistered Threat Flags

None. All SUMMARY.md `## Threat Flags` sections across 19-01 through 19-05 explicitly declare "None". No new attack surface was flagged during implementation beyond what the plan-time register already covered.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-20 | 19 | 19 | 0 | gsd-security-auditor (claude-sonnet-4-6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-20
