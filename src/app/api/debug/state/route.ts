import { cookies, headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import type { DeckId, UserId } from "@/db/schema";
import { cards, decks } from "@/db/schema";
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
//
// Phase 14 (QAOB-03): extended with a `cards` array for the per-card SRS table.
// Accepts optional ?deck=<deckId>; defaults to user's first deck. Cap 200 rows.
// Threat T-14-06: cards query is scoped to session.user.id.

/** Direction derived from masteryRound per the study engine rules. */
function masteryRoundToDirection(round: number): "n2t" | "t2n" | "either" {
  if (round === 0) return "n2t";
  if (round === 1) return "t2n";
  return "either"; // round 2+ (learned cards get "either")
}

/** Fetch the first deck ID for a user (fallback when no ?deck= param). */
async function getFirstDeckId(userId: UserId): Promise<DeckId | null> {
  const [row] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(eq(decks.userId, userId as string))
    .orderBy(asc(decks.createdAt))
    .limit(1);
  return (row?.id ?? null) as DeckId | null;
}

export async function GET(req: Request) {
  if (!cheatEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!checkSecret(secret)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Real state — deliberately computed WITHOUT the override so QA sees the truth.
  const facts = await getHabitatFacts(session.user.id as UserId);
  const real = computeHabitatState(facts, new Date());

  const cookieStore = await cookies();
  const forced = verifyOverride(cookieStore.get(CHEAT_COOKIE)?.value);

  // QAOB-03: per-card SRS state array.
  // Scope: user's target deck (optional ?deck= param; defaults to first deck).
  // Threat T-14-06: scoped to session.user.id — no cross-user leakage.
  const deckParam = url.searchParams.get("deck");
  const targetDeckId =
    deckParam ??
    ((await getFirstDeckId(session.user.id as UserId)) as string | null);

  let cardRows: {
    id: string;
    word: string;
    masteryRound: number;
    direction: "n2t" | "t2n" | "either";
    cooldownUntil: string | null;
    pausedAt: string | null;
    learned: boolean;
  }[] = [];

  if (targetDeckId) {
    // Verify deck belongs to the session user (security scope check)
    const [ownedDeck] = await db
      .select({ id: decks.id })
      .from(decks)
      .where(
        and(
          eq(decks.id, targetDeckId as DeckId),
          eq(decks.userId, session.user.id as string),
        ),
      )
      .limit(1);

    if (ownedDeck) {
      const rawCards = await db
        .select({
          id: cards.id,
          front: cards.front,
          masteryRound: cards.masteryRound,
          cooldownUntil: cards.cooldownUntil,
          pausedAt: cards.pausedAt,
        })
        .from(cards)
        .where(eq(cards.deckId, targetDeckId as DeckId))
        .orderBy(asc(cards.createdAt))
        .limit(200);

      cardRows = rawCards.map((c) => ({
        id: c.id as string,
        word: c.front,
        masteryRound: c.masteryRound,
        direction: masteryRoundToDirection(c.masteryRound),
        cooldownUntil: c.cooldownUntil?.toISOString() ?? null,
        pausedAt: c.pausedAt?.toISOString() ?? null,
        learned: c.masteryRound >= 3,
      }));
    }
  }

  return Response.json({ real, forced, cards: cardRows });
}
