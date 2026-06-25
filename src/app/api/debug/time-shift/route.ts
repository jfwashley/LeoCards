import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  cheatEnabled,
  checkSecret,
  signTimeOffset,
  TIME_SHIFT_COOKIE,
} from "@/lib/debug-cheat";
import { createRateLimiter } from "@/lib/rate-limit";

// Phase 15 QA time-shift endpoint.
//
// POST /api/debug/time-shift — mint or clear the signed leo-qa-time-offset cookie.
// The cookie carries an offsetMs value; pipeline callsites (study/complete,
// habitat, debug/state) read it via readQaTimeOffset() to shift `now` by that
// amount, enabling instant multi-hour/multi-day simulation without real waits (D-03).
//
// Gating: feature enabled (DEBUG_CHEAT_SECRET set) → session auth → rate-limit →
// body parse → checkSecret. Feature returns 404 BEFORE auth when secret is unset (D-05).
//
// Security: cookie is HMAC-SHA256 signed (T-15-01); offsetMs range-validated ≤30d (T-15-03);
// secret never echoed (T-15-04); session required before any write (T-15-05).

const timeShiftLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

const bodySchema = z
  .object({
    secret: z.string(),
    offsetMs: z
      .number()
      .int()
      .min(0)
      .max(30 * 24 * 60 * 60 * 1000)
      .optional(), // max 30 days (T-15-03)
    clear: z.boolean().optional(),
  })
  .refine((d) => d.clear === true || d.offsetMs !== undefined, {
    message: "Provide offsetMs or clear:true",
  });

export async function POST(req: Request) {
  // 0. Feature flag — absent secret env var → feature does not exist (D-05).
  // Fires BEFORE auth so the endpoint is provably absent in production.
  if (!cheatEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // 1. Auth — the shift is per-session; require a valid session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = timeShiftLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  // 3. Parse + validate body
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // 4. Secret gate (constant-time)
  if (!checkSecret(parsed.data.secret)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();

  // 5. Clear branch — delete the time-shift cookie
  if (parsed.data.clear) {
    cookieStore.delete(TIME_SHIFT_COOKIE);
    return Response.json({ ok: true, cleared: true });
  }

  // 6. Set branch — sign + store the offset cookie
  // parsed.data.offsetMs is defined here due to the refine() above
  cookieStore.set(
    TIME_SHIFT_COOKIE,
    // biome-ignore lint/style/noNonNullAssertion: refine guarantees offsetMs defined when clear !== true
    signTimeOffset(parsed.data.offsetMs!),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week — matches CHEAT_COOKIE
    },
  );
  return Response.json({ ok: true });
}
