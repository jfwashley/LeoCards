// GET /api/account/verify-email?token=...
//
// D-07: consumes an email-change verification token and applies the
// pending email change. UNAUTHENTICATED BY DESIGN — the click may land on a
// different device/session than the one that requested the change, so
// there is no getSession() call here. userId is resolved ONLY from the
// server-stored token→identifier mapping, never from client input.
//
// WR-06: the token is idempotently re-appliable up to its normal TTL, NOT
// strictly single-use — see the comment above the final redirect below for
// why (link-scanner prefetches vs. single-use tokens).
//
// Route Handlers are not cached by default for a dynamic GET like this one
// (verified against node_modules/next/dist/docs/01-app/01-getting-started/
// 15-route-handlers.md for the installed Next.js 16.2.1) — no
// `export const dynamic` needed.
//
// No open-redirect surface: the redirect target is ALWAYS hardcoded to
// request.nextUrl.origin + a fixed path — there is no callbackURL-style
// client-controlled redirect param anywhere in this design (T-25-01-F).
import { eq, like } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { user, verification } from "@/db/schema";

// Must match src/lib/account-actions.ts's identifier convention exactly.
const PENDING_EMAIL_PREFIX = "change-email:";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = request.nextUrl.origin;
  const expired = () =>
    NextResponse.redirect(`${base}/account?verified=expired`);
  if (!token) return expired();

  // Bounded scan across pending change-email rows only — realistically
  // 0-5 concurrently-pending rows at this app's scale (A4), not the whole
  // verification table (which also holds unrelated password-reset rows).
  const rows = await db
    .select()
    .from(verification)
    .where(like(verification.identifier, `${PENDING_EMAIL_PREFIX}%`));

  const match = rows.find((r) => {
    try {
      return (JSON.parse(r.value) as { token: string }).token === token;
    } catch {
      return false;
    }
  });
  if (!match || match.expiresAt < new Date()) return expired();

  const { newEmail } = JSON.parse(match.value) as { newEmail: string };
  const userId = match.identifier.slice(PENDING_EMAIL_PREFIX.length) as UserId;

  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));
  if (!targetUser) {
    // User deleted their account before the link was clicked — clean up
    // the orphaned row and treat as expired (Pitfall 4).
    await db
      .delete(verification)
      .where(eq(verification.identifier, match.identifier));
    return expired();
  }

  // Race re-check: taken by someone else since the request was made.
  const clash = await db.select().from(user).where(eq(user.email, newEmail));
  if (clash.length > 0 && clash[0]?.id !== userId) {
    await db
      .delete(verification)
      .where(eq(verification.identifier, match.identifier));
    return expired();
  }

  await db
    .update(user)
    .set({ email: newEmail, updatedAt: new Date() })
    .where(eq(user.id, userId));
  // WR-06 — deliberately NOT deleted here, and no longer strictly
  // single-use. Corporate mail-security gateways (Microsoft Defender Safe
  // Links, Proofpoint, Mimecast, etc.) auto-follow links in incoming email
  // to scan them BEFORE the user opens the message. Against a strictly
  // single-use token, that scan silently consumed it — the real user's
  // later click found the row already gone and landed on ?verified=expired
  // even though their email had already (correctly) changed. Instead, the
  // token stays valid and idempotently re-appliable up to its normal
  // TOKEN_TTL_MS expiry (see account-actions.ts): replaying it just
  // re-applies the SAME already-current email (a harmless no-op update)
  // and redirects to success again. The race re-check above naturally
  // stays correct on replay too — a "clash" resolves to clash[0].id ===
  // userId (ourselves), not a real clash, so it falls through here rather
  // than into the expired() branch. A genuinely NEW email-change request
  // still fully replaces this row (account-actions.ts's replace-not-
  // additive delete-then-insert), so there's no unbounded replay window in
  // practice — only the scanner-vs-single-use race is what this loosens.
  // getPendingEmailChange (account-queries.ts) is responsible for not
  // reporting a lingering, already-applied row as still "pending".

  return NextResponse.redirect(`${base}/account?verified=success`);
}
