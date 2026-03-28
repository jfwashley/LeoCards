import { headers } from "next/headers";
import { HabitatScene } from "@/components/habitat-scene";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { computeHabitatState } from "@/lib/habitat-engine";
import { getHabitatFacts } from "@/lib/habitat-queries";

// Server component shell — fetches habitat state directly from DB (no HTTP round-trip)
// Protected by (protected)/layout.tsx which redirects unauthenticated users to /login
export default async function HabitatPage({
  searchParams,
}: {
  searchParams: Promise<{ celebrate?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  // Safety fallback — layout.tsx handles the redirect, but guard here in case
  if (!session) return null;

  const params = await searchParams;
  const celebratingLevel = params.celebrate ? Number(params.celebrate) : null;

  const facts = await getHabitatFacts(session.user.id as UserId);
  const habitatState = computeHabitatState(facts, new Date());

  return (
    <main className="w-full">
      <HabitatScene
        habitatState={habitatState}
        celebratingLevel={celebratingLevel}
      />
    </main>
  );
}
