import { computeHabitatState } from "@leocards/domain/habitat";
import { HabitatScene } from "@/components/habitat-scene";
import type { UserId } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import { readHabitatOverride } from "@/lib/debug-cheat";
import { getHabitatFacts } from "@/lib/habitat-queries";

// Server component shell — fetches habitat state directly from DB (no HTTP round-trip)
// Protected by (protected)/layout.tsx which redirects unauthenticated users to /login
export default async function HabitatPage({
  searchParams,
}: {
  searchParams: Promise<{ celebrate?: string }>;
}) {
  const session = await getSession();

  // Safety fallback — layout.tsx handles the redirect, but guard here in case
  if (!session) return null;

  const params = await searchParams;
  // T-24-03-CELEBRATE: validate ?celebrate is an integer in [1,9] (STRIDE Tampering).
  // Number("") === 0, Number("abc") === NaN — both fail isInteger. ?celebrate=999 → null.
  const rawCelebrate = params.celebrate ? Number(params.celebrate) : null;
  const celebratingLevel =
    rawCelebrate !== null &&
    Number.isInteger(rawCelebrate) &&
    rawCelebrate >= 1 &&
    rawCelebrate <= 9
      ? rawCelebrate
      : null;

  const facts = await getHabitatFacts(session.user.id as UserId);
  const override = await readHabitatOverride();
  const habitatState = computeHabitatState(
    facts,
    new Date(),
    override ?? undefined,
  );

  return (
    <main className="w-full">
      <HabitatScene
        habitatState={habitatState}
        celebratingLevel={celebratingLevel}
      />
    </main>
  );
}
