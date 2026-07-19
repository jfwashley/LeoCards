"use client";

// AccountDirtyProvider / useAccountDirty — Phase 25 (D-04).
// A minimal, self-contained React Context so ChangePasswordCard (a sibling
// client component) can tell AccountBack (25-04) whether the password form
// has unsaved input, without prop-drilling through the /account RSC page.
//
// D-04 leak guard: this Context stores ONLY a derived boolean. The typed
// current/new/confirm password text is NEVER passed through here — see
// change-password-card.tsx, which computes the boolean locally and only
// ever calls setPasswordDirty(booleanValue).
//
// First project-authored Context (25-PATTERNS.md: only prior createContext
// usage in this tree is the vendored src/components/ui/form.tsx). Follows
// that file's createContext + Provider + custom-hook-wrapping-useContext
// shape, including its defensive "used outside provider" throw.

import * as React from "react";

interface AccountDirtyContextValue {
  passwordDirty: boolean;
  setPasswordDirty: (value: boolean) => void;
}

const AccountDirtyContext =
  React.createContext<AccountDirtyContextValue | null>(null);

export function AccountDirtyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [passwordDirty, setPasswordDirty] = React.useState(false);

  const value = React.useMemo(
    () => ({ passwordDirty, setPasswordDirty }),
    [passwordDirty],
  );

  return (
    <AccountDirtyContext.Provider value={value}>
      {children}
    </AccountDirtyContext.Provider>
  );
}

export function useAccountDirty(): AccountDirtyContextValue {
  const context = React.useContext(AccountDirtyContext);
  if (!context) {
    throw new Error(
      "useAccountDirty must be used within an AccountDirtyProvider",
    );
  }
  return context;
}
