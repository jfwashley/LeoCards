/**
 * DR-03 — the single error convention every extracted core function returns.
 * Locked once, before any native-v1 endpoint exists (RESEARCH Open
 * Question 4), so no endpoint in Waves 4-5 invents its own shape.
 *
 * There is deliberately no missing-resource code in this union: T-12-08
 * requires the identical "forbidden" response whether a resource belongs to
 * someone else or simply doesn't exist, so a distinct existence-signalling
 * code would let a caller tell those two cases apart — leaking whether the
 * resource exists at all.
 *
 * Each entry point adapts CoreResult to its own existing caller contract:
 *  - a route handler returns
 *      Response.json({ error: code }, { status: CORE_ERROR_STATUS[code] })
 *  - a server action throws
 *      new Error("Unauthorized" | "Forbidden" | ...)
 *    preserving its existing caller contract byte-for-byte — this
 *    generalises requestEmailChange's already-shipped discriminated-union
 *    shape (src/lib/account-actions.ts lines 58-64).
 */
export type CoreErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "rate-limited";

export type CoreResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CoreErrorCode };

export const CORE_ERROR_STATUS: Record<CoreErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  invalid: 400,
  "rate-limited": 429,
};
