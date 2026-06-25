// src/lib/debug-cheat.ts — Phase 13.2 QA cheat console (server-only).
//
// A signed-cookie VIRTUAL OVERRIDE that forces habitat level/mood/quality for
// testing, without mutating any real data. The override is applied inside
// `computeHabitatState` (see habitat-engine.ts `HabitatOverride`), so it flows
// through the whole app (/habitat clip selection, dashboard widget, badges,
// decay filter) from one place and is instantly reversible.
//
// Security model:
//   • The cookie value is HMAC-SHA256 signed with `DEBUG_CHEAT_SECRET`. The
//     render paths call `verifyOverride()` and ONLY honour a valid signature,
//     so a user cannot forge an override in DevTools.
//   • Only the secret-gated POST /api/debug/cheat endpoint can mint a valid
//     cookie. Feature is OFF entirely when DEBUG_CHEAT_SECRET is unset.
//   • Worst case if the secret leaks: a user cosmetically forces THEIR OWN
//     single-player habitat view — no real progress, fully reversible.
//
// This module imports node:crypto and `@/env` (server secret) — never import it
// into a client component.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import type { HabitatOverride, TigerMood } from "@/lib/habitat-engine";

/** Cookie name for the signed habitat override. */
export const CHEAT_COOKIE = "leo-habitat-cheat";

/**
 * Cookie name for the persistent QA-mode authentication token.
 * Set on any successful DEBUG_CHEAT_SECRET verification — persists
 * independently of any habitat override (D-03).
 */
export const QA_MODE_COOKIE = "leo-qa-mode";

/**
 * Cookie name for the signed QA time-shift offset (Phase 15).
 * Set by POST /api/debug/time-shift; read by pipeline callsites to shift `now`.
 */
export const TIME_SHIFT_COOKIE = "leo-qa-time-offset";

const MOODS = ["excited", "happy", "neutral", "sad"] as const;

/**
 * Zod schema for the override payload accepted by the cheat endpoint and stored
 * in the cookie. All fields optional; omitted fields fall back to real state.
 */
export const overrideSchema = z
  .object({
    level: z.number().int().min(1).max(9).optional(),
    mood: z.enum(MOODS).optional(),
    quality: z.number().min(0.1).max(1).optional(),
  })
  .strict();

/** True when the cheat feature is enabled (the secret env var is set). */
export function cheatEnabled(): boolean {
  return typeof env.DEBUG_CHEAT_SECRET === "string";
}

/**
 * Constant-time comparison of a caller-supplied secret against the configured
 * DEBUG_CHEAT_SECRET. Returns false when the feature is disabled.
 */
export function checkSecret(candidate: string | null | undefined): boolean {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret || typeof candidate !== "string") return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function hmac(payloadB64: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payloadB64).digest());
}

/**
 * Serialise + sign an override into a cookie value: `<payloadB64>.<sigB64>`.
 * Throws if the feature is disabled (no secret) — callers must gate first.
 */
export function signOverride(override: HabitatOverride): string {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret) throw new Error("DEBUG_CHEAT_SECRET not set");
  const payloadB64 = base64url(Buffer.from(JSON.stringify(override), "utf8"));
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}

/**
 * Verify + parse a cookie value back into a HabitatOverride. Returns null when
 * the feature is disabled, the value is missing/malformed, the signature is
 * invalid, or the payload fails schema validation. Safe to call on untrusted
 * cookie input from any request.
 */
export function verifyOverride(
  raw: string | null | undefined,
): HabitatOverride | null {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret || typeof raw !== "string" || !raw.includes(".")) return null;

  const dot = raw.lastIndexOf(".");
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  // Constant-time signature check.
  const expected = hmac(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let json: unknown;
  try {
    json = JSON.parse(
      Buffer.from(
        payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
  } catch {
    return null;
  }

  const parsed = overrideSchema.safeParse(json);
  if (!parsed.success) return null;

  // Drop an all-empty override (nothing forced) → treat as no override.
  const o = parsed.data;
  if (
    o.level === undefined &&
    o.mood === undefined &&
    o.quality === undefined
  ) {
    return null;
  }
  return o as { level?: number; mood?: TigerMood; quality?: number };
}

/**
 * Read + verify the habitat override from the request cookies. Server-only
 * (uses next/headers `cookies()`). Returns null when the feature is disabled,
 * no cookie is present, or the signature/payload is invalid — so the render
 * paths fall straight back to the real computed state. Call from server
 * components / route handlers and pass the result into `computeHabitatState`.
 */
export async function readHabitatOverride(): Promise<HabitatOverride | null> {
  if (!cheatEnabled()) return null;
  const store = await cookies();
  return verifyOverride(store.get(CHEAT_COOKIE)?.value);
}

// ============================================================
// QA-mode persistent cookie helpers (Phase 14)
// ============================================================

/**
 * Fixed sentinel payload for the QA-mode cookie. The payload is a constant
 * object — it signals presence only, no user-controlled fields.
 * Threat T-14-01: fixed payload prevents injection attacks.
 */
const QA_SENTINEL = { qaMode: true } as const;

/**
 * Sign a QA-mode authentication cookie value: `<payloadB64>.<sigB64>`.
 * Mirrors `signOverride` exactly — uses the same HMAC-SHA256 helpers.
 * Throws if DEBUG_CHEAT_SECRET is unset — callers must gate first.
 * Server-only (imports `@/env`).
 */
export function signQaMode(): string {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret) throw new Error("DEBUG_CHEAT_SECRET not set");
  const payloadB64 = base64url(
    Buffer.from(JSON.stringify(QA_SENTINEL), "utf8"),
  );
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}

/**
 * Verify a QA-mode cookie value via constant-time HMAC comparison.
 * Returns true iff the signature is valid. No schema parse needed — the
 * payload is a fixed sentinel (Threat T-14-01 mitigation).
 * Returns false when the feature is disabled, `raw` is null/undefined/empty,
 * or contains no dot, or the signature does not match.
 */
export function verifyQaMode(raw: string | null | undefined): boolean {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret || typeof raw !== "string" || !raw.includes(".")) return false;

  const dot = raw.lastIndexOf(".");
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) return false;

  // Constant-time signature check (Threat T-14-01 mitigation).
  const expected = hmac(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Read + verify the QA-mode authentication cookie. Server-only
 * (uses next/headers `cookies()`). Returns true iff QA mode is active
 * (valid signed `leo-qa-mode` cookie present). Returns false when the
 * feature is disabled, no cookie is present, or the signature is invalid.
 * Call from RSC pages to decide whether to pass QA SRS data to client components.
 */
export async function readQaAuth(): Promise<boolean> {
  if (!cheatEnabled()) return false;
  const store = await cookies();
  return verifyQaMode(store.get(QA_MODE_COOKIE)?.value);
}

// ============================================================
// QA time-shift helpers (Phase 15)
// ============================================================

/**
 * Sign a time-shift offset into a cookie value: `<payloadB64>.<sigB64>`.
 * Payload is `{ offsetMs: number }`. Mirrors `signQaMode` exactly but carries
 * a numeric payload instead of a fixed sentinel.
 * Throws if DEBUG_CHEAT_SECRET is unset — callers must gate first.
 * Server-only (imports `@/env`).
 */
export function signTimeOffset(offsetMs: number): string {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret) throw new Error("DEBUG_CHEAT_SECRET not set");
  const payloadB64 = base64url(
    Buffer.from(JSON.stringify({ offsetMs }), "utf8"),
  );
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}

/**
 * Verify a time-shift cookie value via constant-time HMAC comparison.
 * Returns the stored `offsetMs` number on success, or null on any failure
 * (feature disabled, malformed, invalid signature, or bad schema).
 * Safe to call on untrusted cookie input.
 * Threat T-15-01: constant-time comparison via `timingSafeEqual`.
 */
export function verifyTimeOffset(
  raw: string | null | undefined,
): number | null {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret || typeof raw !== "string" || !raw.includes(".")) return null;

  const dot = raw.lastIndexOf(".");
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  // Constant-time signature check (Threat T-15-01 mitigation).
  const expected = hmac(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = JSON.parse(
      Buffer.from(
        payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    const parsed = z
      .object({
        offsetMs: z
          .number()
          .int()
          .min(0)
          .max(30 * 24 * 60 * 60 * 1000),
      })
      .safeParse(json);
    return parsed.success ? parsed.data.offsetMs : null;
  } catch {
    return null;
  }
}

/**
 * Read + verify the QA time-shift cookie. Server-only (uses next/headers `cookies()`).
 * Returns the stored offset in milliseconds, or 0 when the feature is disabled,
 * no cookie is present, or the signature/payload is invalid — so callers can safely
 * use `new Date(Date.now() + offset)` with zero meaning unshifted real time.
 * Threat T-15-02: returns 0 (real `new Date()` unchanged) in production.
 */
export async function readQaTimeOffset(): Promise<number> {
  if (!cheatEnabled()) return 0;
  const store = await cookies();
  return verifyTimeOffset(store.get(TIME_SHIFT_COOKIE)?.value) ?? 0;
}
