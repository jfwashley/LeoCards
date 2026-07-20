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
