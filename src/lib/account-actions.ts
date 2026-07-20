"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { user, verification } from "@/db/schema";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

// ============================================================
// D-07 email-change token store convention (both this file and
// src/app/api/account/verify-email/route.ts MUST agree on this shape):
//   identifier = `change-email:${userId}`            (deterministic — one
//                                                       pending row per user)
//   value      = JSON.stringify({ token, newEmail })  (token = crypto.randomUUID())
//   expiresAt  = now + TOKEN_TTL_MS
// ============================================================

const PENDING_EMAIL_PREFIX = "change-email:";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — Open Question 1, resolved

// 5 requests/hour/user — Open Question 2, resolved. Guards the resend
// affordance against abuse; over-limit returns before any DB write or send.
const emailChangeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
});

// WR-05: requestEmailChange is a "use server" action, directly callable
// over the network with an arbitrary payload — the client's zod check
// (detailsSchema in account-details-card.tsx) never runs for a caller that
// bypasses the browser. This schema re-validates + normalizes server-side
// before the value is ever written into the verification row / user.email.
const newEmailSchema = z.string().trim().toLowerCase().email();

// ============================================================
// requestEmailChange
// ============================================================

/**
 * D-07: starts a custom email-change flow. Writes a single-use token into
 * the existing `verification` table (deterministic per-user identifier,
 * replace-not-additive) and fires a verification email to the NEW address
 * only — the sign-in identifier (user.email) is untouched until the link
 * in that email is clicked (see verify-email/route.ts).
 *
 * Deliberately bypasses better-auth's built-in `changeEmail`: that endpoint
 * anti-enumeration-masks an already-taken email, which conflicts with this
 * app's explicit "That email is already in use." UI contract (RESEARCH
 * Anti-Patterns).
 */
export async function requestEmailChange(newEmailRaw: string): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "same-email" | "email-taken" | "rate-limited" | "invalid-email";
    }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  const limit = emailChangeLimiter.check(userId);
  if (!limit.allowed) {
    return { ok: false as const, error: "rate-limited" as const };
  }

  // WR-05: reject anything that isn't a well-formed email BEFORE it's
  // trusted for the uniqueness check / verification-row write.
  const parsed = newEmailSchema.safeParse(newEmailRaw);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid-email" as const };
  }
  // Pitfall 5: lowercase before BOTH the uniqueness check and the insert
  // value — user.email is a case-sensitive unique column, but better-auth's
  // own sign-up flow normalizes to lowercase, so uniqueness must match that
  // convention rather than the raw DB constraint. (newEmailSchema's own
  // .toLowerCase() step above already performs this normalization.)
  const newEmail = parsed.data;

  if (newEmail === session.user.email) {
    return { ok: false as const, error: "same-email" as const };
  }

  // Honest uniqueness check — deliberately NOT anti-enumeration-masked.
  const existing = await db.select().from(user).where(eq(user.email, newEmail));
  if (existing.length > 0) {
    return { ok: false as const, error: "email-taken" as const };
  }

  const identifier = `${PENDING_EMAIL_PREFIX}${userId}`;
  // Replace-not-additive: delete any existing pending row for this user
  // first, so a re-request never accumulates rows (T-25-01-D).
  await db.delete(verification).where(eq(verification.identifier, identifier));

  const token = crypto.randomUUID();
  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier,
    value: JSON.stringify({ token, newEmail }),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const url = `${env.NEXT_PUBLIC_APP_URL}/api/account/verify-email?token=${token}`;
  // Fire-and-forget — never awaited into the response path (Pitfall 8 /
  // Pattern 4). The verification row above is the source of truth; the
  // send succeeding or failing has no bearing on this action's result.
  // try/catch (not just .catch() on the send promise) because `new Resend()`
  // throws SYNCHRONOUSLY when RESEND_API_KEY is unset — the common case in
  // local/CI environments — and that throw happens before .send() is ever
  // called, so a bare .catch() chain would not protect against it.
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails
      .send({
        from: "LeoCards <noreply@leocards.com>",
        to: newEmail,
        subject: "Confirm your new LeoCards email",
        text: `Confirm your new email address: ${url}`,
      })
      .catch((err) => {
        console.error(
          "[account] Failed to send email-change verification:",
          err,
        );
      });
  } catch (err) {
    console.error("[account] Failed to send email-change verification:", err);
  }

  return { ok: true as const };
}

// ============================================================
// deleteAccount
// ============================================================

/**
 * D-14: permanently erases the authenticated user's account. A single
 * `db.delete(user)` statement relies on Postgres `ON DELETE CASCADE` (every
 * user-referencing table in src/db/schema.ts) to wipe session, account,
 * decks→cards→recall_events, milestones_seen, and habitat_metadata
 * atomically within that one statement — no JS transaction needed (Neon
 * HTTP has none anyway; Pitfall 3).
 *
 * Deliberately bypasses better-auth's built-in `deleteUser`: it requires a
 * session fresher than 24h when no password is supplied, which conflicts
 * with D-12's "no password re-entry" for a daily-habit app (Pitfall 2).
 */
export async function deleteAccount(): Promise<void> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Hygiene: verification has no userId FK, so it survives the cascade
  // below untouched unless proactively cleaned up here (Pitfall 4).
  await db
    .delete(verification)
    .where(eq(verification.identifier, `${PENDING_EMAIL_PREFIX}${userId}`));

  await db.delete(user).where(eq(user.id, userId));

  // Best-effort: the session row is already gone via cascade; signOut's
  // cookie-clearing (nextCookies() plugin `after` hook) still needs to run
  // so the browser's session cookie is cleared on this device.
  await auth.api.signOut({ headers: hdrs });
}
