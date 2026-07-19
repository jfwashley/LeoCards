"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card } from "@/components/daybreak/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// ACC-04 — in-section Sign out card (D-01's "logout moves inside the
// section" consequence). Lifts handleSignOut verbatim from
// logout-button.tsx (25-PATTERNS.md); only the presentation changes, from
// the 36px icon-only header glyph to a full-width outline Button in a
// Card. Keeps the "Sign out" accessible name for e2e continuity — the
// existing e2e assertions already target getByRole("button", { name:
// "Sign out" }).
export function AccountLogoutSection() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div data-testid="account-logout-card">
      <Card className="p-5 flex flex-col gap-3">
        <div>
          <h2 className="font-display text-[17px] font-bold text-foreground">
            Sign out
          </h2>
          <p className="text-[15px] text-muted-foreground">
            Sign out of LeoCards on this device.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          disabled={isPending}
          onClick={handleSignOut}
          data-testid="account-logout-btn"
        >
          Sign out
        </Button>
      </Card>
    </div>
  );
}
