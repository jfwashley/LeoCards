// src/lib/core/account.ts
//
// The single composition behind both the /account RSC page
// (src/app/(protected)/account/page.tsx) and the native-v1 GET /api/account
// route handler — the D-03 mechanism applied to the one revocation-sensitive
// read in this phase. Presentation strings (a formatted join date, a
// localized native-language label) stay OUT of this module; each entry
// point derives those from the raw fields returned here, mirroring
// src/lib/core/dashboard.ts's and src/lib/core/study.ts's existing
// convention of taking an already-authenticated identity as input rather
// than resolving a session itself.

import type { AccountResponse, CoreResult } from "@leocards/domain/contracts";
import type { UserId } from "@/db/schema";
import { getPendingEmailChange } from "@/lib/account-queries";

export async function loadAccountCore(input: {
  userId: UserId;
  name: string;
  email: string;
  createdAt: Date;
  nativeLanguage: string | null | undefined;
}): Promise<CoreResult<AccountResponse>> {
  const { userId, name, email, createdAt, nativeLanguage } = input;

  // Reused unmodified (staleness/expiry logic lives entirely in the query
  // helper) — resolves to the pending new address, or null once expired,
  // malformed, or already applied.
  const pending = await getPendingEmailChange(userId, email);

  return {
    ok: true,
    data: {
      name,
      email,
      createdAt: createdAt.toISOString(),
      // The field types as string | null | undefined despite its
      // defaultValue: "en" config (the Phase 25-04 pattern) — normalised
      // here so every caller sees a real code.
      nativeLanguage: nativeLanguage ?? "en",
      pendingEmail: pending?.newEmail ?? null,
    },
  };
}
