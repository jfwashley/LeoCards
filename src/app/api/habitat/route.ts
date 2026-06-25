import { headers } from "next/headers";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { readHabitatOverride, readQaTimeOffset } from "@/lib/debug-cheat";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";

// ============================================================
// GET /api/habitat
// ============================================================

/**
 * Returns the current habitat state for the authenticated user.
 *
 * Flow:
 * 1. Authenticate user (401 if unauthenticated)
 * 2. Fetch raw facts from DB (lastActivityAt + cross-deck learned card count)
 * 3. Compute habitat state via pure functions (no side effects)
 * 4. Return typed JSON (HabitatState)
 *
 * Pure read endpoint — writes nothing to the DB.
 * All values are derived at request time (compute-on-read architecture).
 */
export async function GET() {
  // 1. Auth check — await headers() required in Next.js 16 (Pitfall 5)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch raw facts from DB
  const facts = await getHabitatFacts(session.user.id as UserId);

  // 3. Compute habitat state (pure function, no side effects). A dev-only
  // signed-cookie override (QA cheat console) is applied when present + valid;
  // null in production unless DEBUG_CHEAT_SECRET is set.
  // Phase 15 (D-03): honor QA time-shift so harness can simulate future instants.
  const override = await readHabitatOverride();
  const offset = await readQaTimeOffset();
  const state = computeHabitatState(
    facts,
    new Date(Date.now() + offset),
    override ?? undefined,
  );

  // 4. Return typed JSON
  return Response.json(state);
}
