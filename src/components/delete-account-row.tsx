"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/account-actions";

// D-12/D-13/D-14 — quiet delete trigger row + two-step confirm.
// Mirrors card-edit-dialog.tsx's showDeleteConfirm trigger+confirm FLOW
// verbatim (25-PATTERNS.md), with two UI-SPEC deviations:
//   - the trigger sits bare (no Card wrapper, D-12 "no separated danger card")
//   - the confirm "Delete account" button uses shadcn Button
//     variant="destructive" (soft red tint) instead of the amber TBtn
//     card-delete uses — see UI-SPEC's Color section "Deliberate deviation"
// No password re-entry, no typed confirmation (D-12, explicit).
export function DeleteAccountRow() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      router.push("/login");
    } catch (err) {
      // WR-08 — a bare catch with no bound error and no logging left this
      // completely undiagnosable: if deleteAccount's account-deletion
      // itself succeeded but its best-effort signOut() then threw, the
      // account was irreversibly gone yet the user was told deletion
      // FAILED and to retry, with no console trace anywhere.
      console.error("[account] deleteAccount failed:", err);
      setDeleteError("Couldn't delete your account. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div data-testid="account-delete-confirm" className="flex flex-col gap-4">
        <div>
          <p className="text-[15px] font-bold text-foreground">
            Delete your account?
          </p>
          <p className="text-[15px] text-muted-foreground mt-1">
            This can&apos;t be undone. It permanently erases your decks, words,
            and habitat progress.
          </p>
        </div>
        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}
        <Button
          type="button"
          variant="destructive"
          className="w-full h-11"
          disabled={deleting}
          onClick={handleDelete}
          data-testid="account-delete-confirm-btn"
        >
          Delete account
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          disabled={deleting}
          onClick={() => setShowConfirm(false)}
          data-testid="account-delete-keep-btn"
        >
          Keep account
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      data-testid="account-delete-row"
      className="min-h-11 inline-flex items-center gap-1.5 text-sm text-destructive hover:opacity-80"
    >
      <Trash2 className="size-4" />
      Delete account
    </button>
  );
}
