"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccountDirty } from "@/components/account-dirty-context";
import { TBtn } from "@/components/daybreak/t-btn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// AccountBack — D-04 dirty-guard back button (/account -> /dashboard).
// Visually mirrors HBack's frosted-circle chevron button, but unlike HBack
// (a pure RSC-safe Link, 25-PATTERNS.md Pitfall 7) this MUST be a client
// component: it intercepts navigation into a "Discard changes?" dialog
// whenever the change-password fields are dirty (useAccountDirty(), 25-02).
// 44x44 clickable hit-area wraps the 40x40 HBack-identical visual
// (Small-Target Wrapper — deliberately NOT HBack's literal 40px hit area).
export function AccountBack() {
  const router = useRouter();
  const { passwordDirty } = useAccountDirty();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  function handleClick() {
    if (passwordDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/dashboard");
  }

  function handleLeave() {
    setShowDiscardDialog(false);
    router.push("/dashboard");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-testid="account-back-btn"
        aria-label="Back to Dashboard"
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          flex: "none",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 10px rgba(120,80,30,0.16)",
            flex: "none",
          }}
        >
          {/* Left-pointing chevron: CSS border trick (no emoji, no SVG) */}
          <span
            style={{
              width: 9,
              height: 9,
              borderLeft: "2.4px solid #4A331C",
              borderBottom: "2.4px solid #4A331C",
              transform: "rotate(45deg)",
              marginLeft: 3,
              display: "inline-block",
            }}
          />
        </span>
      </button>

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent
          className="max-w-md bg-[var(--background)] rounded-[22px] border border-[#F0E3CF]"
          showCloseButton={false}
          data-testid="account-discard-dialog"
        >
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your password changes haven&apos;t been saved.
          </p>
          <TBtn
            type="button"
            onClick={() => setShowDiscardDialog(false)}
            data-testid="account-discard-stay-btn"
          >
            Stay
          </TBtn>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={handleLeave}
            data-testid="account-discard-leave-btn"
          >
            Leave
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
