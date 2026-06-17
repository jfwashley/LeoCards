import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { db } from "@/db";
import type { DeckId } from "@/db/schema";
import { decks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { readQaAuth } from "@/lib/debug-cheat";
import type { CardForSession } from "@/lib/study-engine";
import { assembleSession } from "@/lib/study-engine";
import { getStudyCards } from "@/lib/study-queries";

export default async function StudyPage(props: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const params = await props.searchParams;
  const deckId = params.deck;

  if (!deckId) {
    redirect("/dashboard");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  // Verify deck belongs to authenticated user (SEC-02)
  const [ownedDeck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(
      and(
        eq(decks.id, deckId as DeckId),
        eq(decks.userId, session.user.id as string),
      ),
    );

  if (!ownedDeck) {
    redirect("/dashboard");
  }

  const rawCards = await getStudyCards(deckId);

  const allCards: CardForSession[] = rawCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    masteryRound: c.masteryRound,
    cooldownUntil: c.cooldownUntil,
    createdAt: c.createdAt,
    isResurface: false,
  }));

  const sessionCards = assembleSession(allCards, new Date());

  if (sessionCards.length === 0) {
    redirect(`/dashboard?deck=${deckId}`);
  }

  const qaMode = await readQaAuth();

  return (
    <StudySession initialCards={sessionCards} deckId={deckId} qaMode={qaMode} />
  );
}
