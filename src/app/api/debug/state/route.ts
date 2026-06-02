import { cookies, headers } from "next/headers";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  CHEAT_COOKIE,
  cheatEnabled,
  checkSecret,
  verifyOverride,
} from "@/lib/debug-cheat";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";

// Phase 13.2 QA cheat console.
//
// GET /api/debug/state?secret=... — returns the REAL computed habitat state
// (no override applied) plus the currently-forced override, for the /debug
// readout. Lets QA learn cards and watch genuine card→level progression while
// any virtual override is active. Read-only; secret-gated.

export async function GET(req: Request) {
  if (!cheatEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = new URL(req.url).searchParams.get("secret");
  if (!checkSecret(secret)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Real state — deliberately computed WITHOUT the override so QA sees the truth.
  const facts = await getHabitatFacts(session.user.id as UserId);
  const real = computeHabitatState(facts, new Date());

  const cookieStore = await cookies();
  const forced = verifyOverride(cookieStore.get(CHEAT_COOKIE)?.value);

  return Response.json({ real, forced });
}
