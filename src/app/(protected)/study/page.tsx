import type { SessionCard } from "@leocards/domain/study";
import { redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import type { CardId, UserId } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import { loadStudySessionCore } from "@/lib/core/study";
import { readQaAuth } from "@/lib/debug-cheat";

export default async function StudyPage(props: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const params = await props.searchParams;
  const deckId = params.deck;

  if (!deckId) {
    redirect("/dashboard");
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const result = await loadStudySessionCore({
    userId: session.user.id as UserId,
    deckId,
    now: new Date(),
  });

  if (!result.ok) {
    redirect("/dashboard");
  }

  if (result.data.cards.length === 0) {
    redirect(`/dashboard?deck=${deckId}`);
  }

  // Revive the wire cards (ISO strings) back into the Date-bearing shape
  // StudySession's initialCards prop expects — the page is the adapter, the
  // wire contract itself stays unchanged.
  const sessionCards: SessionCard[] = result.data.cards.map((c) => ({
    id: c.id as CardId,
    front: c.front,
    back: c.back,
    masteryRound: c.masteryRound,
    cooldownUntil: c.cooldownUntil ? new Date(c.cooldownUntil) : null,
    createdAt: new Date(c.createdAt),
    isResurface: c.isResurface,
    stage: c.stage,
  }));

  const qaMode = await readQaAuth();

  return (
    <StudySession initialCards={sessionCards} deckId={deckId} qaMode={qaMode} />
  );
}
