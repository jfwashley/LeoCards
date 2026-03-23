"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm text-muted-foreground underline-offset-4 hover:underline mt-6"
    >
      Sign out
    </button>
  );
}
