import { headers } from "next/headers";

import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">
          Your habitat is being built, {session?.user.name}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Start learning to wake your tiger up.
        </p>
      </div>
      <LogoutButton />
    </div>
  );
}
