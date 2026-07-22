import { AccountDetailsCard } from "@/components/account-details-card";
import { AccountDirtyProvider } from "@/components/account-dirty-context";
import { AccountLogoutSection } from "@/components/account-logout-section";
import { ChangePasswordCard } from "@/components/change-password-card";
import { ACBanner } from "@/components/daybreak/ac-banner";
import { AccountBack } from "@/components/daybreak/account-back";
import { DeleteAccountRow } from "@/components/delete-account-row";
import type { UserId } from "@/db/schema";
import { getPendingEmailChange } from "@/lib/account-queries";
import { getSessionFresh } from "@/lib/auth-session";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

// D-02/D-03 — /account RSC page shell: fetches the session once, computes
// display strings server-side, reads pending-email state, allow-lists
// ?verified, and composes every section inside AccountDirtyProvider.
// Inherits (protected)/layout.tsx's session gate; the `if (!session) return
// null` here is a defensive belt-and-suspenders fallback, matching
// dashboard/page.tsx and habitat/page.tsx exactly (25-PATTERNS.md).
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const session = await getSessionFresh();
  if (!session) return null;

  const userId = session.user.id as UserId;

  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(session.user.createdAt);
  const nativeLanguage = session.user.nativeLanguage ?? "en";
  const nativeLanguageLabel = LANGUAGE_LABELS[nativeLanguage] ?? nativeLanguage;
  const pendingEmail =
    (await getPendingEmailChange(userId, session.user.email))?.newEmail ?? null;

  const params = await searchParams;
  // T-25-04-B: allow-list ?verified to exactly "success"/"expired"/null --
  // never render the raw query string (mirrors habitat/page.tsx's
  // ?celebrate guard, 25-PATTERNS.md).
  let verified: "success" | "expired" | null = null;
  if (params.verified === "success") {
    verified = "success";
  } else if (params.verified === "expired") {
    verified = "expired";
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-xl mx-auto w-full flex flex-col gap-5">
        <AccountDirtyProvider>
          {/* Chrome row -- D-02: back button + plain title, no AppHeader,
              no deck pill, no avatar/identity block. */}
          <div className="flex items-center gap-[14px]">
            <AccountBack />
            <h1 className="font-display text-[22px] font-bold text-foreground">
              My Account
            </h1>
          </div>

          {verified === "success" && (
            <div data-testid="account-verify-result-banner">
              <ACBanner kind="ok">
                Email verified — you&apos;re all set.
              </ACBanner>
            </div>
          )}
          {verified === "expired" && (
            <div data-testid="account-verify-result-banner">
              <ACBanner kind="error">
                That verification link has expired. Edit your email again to
                send a new one.
              </ACBanner>
            </div>
          )}

          {/* D-03: fixed stacked order, identical at every viewport. */}
          <AccountDetailsCard
            name={session.user.name}
            email={session.user.email}
            memberSince={memberSince}
            nativeLanguageLabel={nativeLanguageLabel}
            pendingEmail={pendingEmail}
          />
          <ChangePasswordCard />
          <AccountLogoutSection />

          <div className="mt-8">
            <DeleteAccountRow />
          </div>
        </AccountDirtyProvider>
      </main>
    </div>
  );
}
