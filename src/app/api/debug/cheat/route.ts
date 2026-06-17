import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  CHEAT_COOKIE,
  cheatEnabled,
  checkSecret,
  overrideSchema,
  QA_MODE_COOKIE,
  signOverride,
  signQaMode,
} from "@/lib/debug-cheat";
import { createRateLimiter } from "@/lib/rate-limit";

// Phase 13.2 QA cheat console.
//
// POST /api/debug/cheat — mint or clear the signed habitat-override cookie.
// Gated by: feature enabled (DEBUG_CHEAT_SECRET set) + valid session + matching
// secret. Writes NO real data — only sets/clears an HMAC-signed cookie that
// computeHabitatState honours. Mirrors the cards/[id]/pause route shape.

const cheatLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

const bodySchema = z.intersection(
  overrideSchema,
  z.object({
    secret: z.string(),
    clear: z.boolean().optional(),
  }),
);

export async function POST(req: Request) {
  // 0. Feature flag — absent secret env var → feature does not exist.
  if (!cheatEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // 1. Auth — the override is per-user; require a session (Next 16: await headers()).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = cheatLimiter.check(session.user.id);
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

  // 5. Clear → delete the override cookie, but retain QA-mode auth (D-01/D-02):
  //    Any successful secret verification establishes persistent QA mode,
  //    independent of whether a habitat override is active.
  if (parsed.data.clear) {
    cookieStore.delete(CHEAT_COOKIE);
    // Refresh the QA-mode cookie — the user just re-proved secret knowledge.
    cookieStore.set(QA_MODE_COOKIE, signQaMode(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week — matches CHEAT_COOKIE
    });
    return Response.json({ ok: true, cleared: true });
  }

  // 6. Set → sign + store the override. Reject an empty override.
  const override = {
    level: parsed.data.level,
    mood: parsed.data.mood,
    quality: parsed.data.quality,
  };
  if (
    override.level === undefined &&
    override.mood === undefined &&
    override.quality === undefined
  ) {
    return Response.json(
      { error: "Provide at least one of level/mood/quality, or clear:true" },
      { status: 400 },
    );
  }

  cookieStore.set(CHEAT_COOKIE, signOverride(override), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Also set/refresh the QA-mode cookie (D-01/D-02): any successful secret
  // verification establishes persistent QA mode independent of the override.
  // Threat T-14-02: httpOnly prevents client JS from reading the secret.
  cookieStore.set(QA_MODE_COOKIE, signQaMode(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week — matches CHEAT_COOKIE
  });

  return Response.json({ ok: true, forced: override });
}
