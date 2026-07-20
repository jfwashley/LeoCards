// Shared identifier convention for the D-07 email-change verification flow.
// src/lib/account-actions.ts (writes the token), src/app/api/account/
// verify-email/route.ts (reads/consumes it), and src/lib/account-queries.ts
// (reads it for the pending-email banner) MUST all agree on this exact
// prefix. WR-07: previously each of those three files independently
// declared its own literal copy of this string (plus a fourth hardcoded
// copy in e2e/helpers.ts's test-only DB seam), with only a code comment on
// each enforcing agreement -- a future edit to any one of them would
// silently break token creation/consumption/banner-display/test-seam
// agreement with no compiler or runtime error. This is now the single
// source of truth; import it rather than re-declaring the literal.
export const PENDING_EMAIL_PREFIX = "change-email:";

// Sender for ALL outbound email (password reset in src/lib/auth.ts,
// email-change verification in src/lib/account-actions.ts). Overridable per
// environment via the EMAIL_FROM env var — production uses Resend's sandbox
// sender "LeoCards <onboarding@resend.dev>" until a custom sending domain is
// verified in Resend (leocards.com is NOT owned/verified; Resend rejects
// sends from unverified domains, so the fallback literal only matters in
// environments where sends are no-ops anyway).
// Deliberately a raw process.env read, NOT an @/env (t3-oss) entry: this
// module is imported (transitively, via server-action modules) by client
// component test graphs under jsdom, where t3-env runs CLIENT-side validation
// and would hard-fail the import over unrelated missing NEXT_PUBLIC_* vars.
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "LeoCards <noreply@leocards.com>";
