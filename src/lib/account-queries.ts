// Server-only query functions — NOT "use server".
// These are called from Server Components or Route Handlers, not from the client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { verification } from "@/db/schema";

// Same deterministic identifier convention as src/lib/account-actions.ts
// (`change-email:${userId}`). Kept as a local const rather than a
// cross-import so this query module stays self-contained.
const PENDING_EMAIL_PREFIX = "change-email:";

// ============================================================
// getPendingEmailChange
// ============================================================

/**
 * Returns the pending D-07 email-change verification row for a user, or
 * null if none exists, it has expired, or its stored value is malformed
 * JSON. Drives the account page's pending-email banner from
 * server-persisted state that spans sessions/devices.
 */
export async function getPendingEmailChange(
  userId: UserId,
): Promise<{ newEmail: string; expiresAt: Date } | null> {
  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, `${PENDING_EMAIL_PREFIX}${userId}`));

  if (!row) return null;
  if (row.expiresAt < new Date()) return null;

  try {
    const { newEmail } = JSON.parse(row.value) as { newEmail: string };
    return { newEmail, expiresAt: row.expiresAt };
  } catch {
    return null;
  }
}
