import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * Per-request-deduped session accessor for RSC call sites (layout, pages).
 *
 * `cache()` keys on argument reference/shallow-equality — kept zero-arg
 * (reads `headers()` internally) so every call site in one render pass
 * shares the same underlying `auth.api.getSession` call. Served from
 * better-auth's `session.cookieCache` (see src/lib/auth.ts) whenever the
 * signed cookie is within its TTL, skipping the DB round trip.
 *
 * Do NOT use for /account or its mutation server actions — see
 * getSessionFresh below (D-04).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Cache-bypassing session accessor for revocation-sensitive paths.
 *
 * Passes `disableCookieCache: true` so this ALWAYS performs a live DB
 * read, never serving a stale (up to 5-min-old) cached cookie. Required
 * for /account and its two mutation server actions (requestEmailChange,
 * deleteAccount) so a just-revoked/just-deleted session is never treated
 * as still valid (D-04, Pitfall 2).
 */
export const getSessionFresh = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});
