// GET /api/account/verify-email?token=...
//
// D-07: consumes a single-use email-change verification token and applies
// the pending email change. UNAUTHENTICATED BY DESIGN — the click may land
// on a different device/session than the one that requested the change, so
// there is no getSession() call here. userId is resolved ONLY from the
// server-stored token→identifier mapping, never from client input.
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
  // Delete AFTER a successful update — prevents reuse (single-use token).
  await db
    .delete(verification)
    .where(eq(verification.identifier, match.identifier));

  return NextResponse.redirect(`${base}/account?verified=success`);
}
