import { redirect } from "next/navigation";

import { WelcomePage } from "@/components/welcome/welcome-page";
import type { UserId } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import { getUserDecks } from "@/lib/deck-queries";

export default async function WelcomePageRoute() {
  const session = await getSession();
  if (!session) redirect("/login");

  // If user already has decks, skip welcome (browser back-nav guard — T-19-04-AUTHZ)
  const decks = await getUserDecks(session.user.id as UserId);
  if (decks.length > 0) redirect("/dashboard");

  return <WelcomePage />;
}
