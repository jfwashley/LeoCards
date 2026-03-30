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
      className="text-sm text-muted-foreground underline-offset-4 hover:underline active:opacity-70 min-h-[44px] px-2 flex items-center"
    >
      Sign out
    </button>
  );
}
