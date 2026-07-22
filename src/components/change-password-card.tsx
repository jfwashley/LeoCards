"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod/mini";

import { useAccountDirty } from "@/components/account-dirty-context";
import { Card } from "@/components/daybreak/card";
import { TBtn } from "@/components/daybreak/t-btn";
import { TField } from "@/components/daybreak/t-field";
import { authClient } from "@/lib/auth-client";

// D-08/D-09/D-10/D-11 — collapsed/expanded change-password accordion.
// Schema mirrors reset-password/page.tsx's exact .refine pattern
// (25-PATTERNS.md), extended with a required currentPassword field.
const changePasswordSchema = z
  .object({
    currentPassword: z.string().check(z.minLength(1, "Current password is required")),
    newPassword: z.string().check(z.minLength(8, "Password must be at least 8 characters")),
    confirmNewPassword: z.string().check(z.minLength(1, "Please confirm your new password")),
  })
  .check(
    z.refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "Passwords do not match",
      path: ["confirmNewPassword"],
    }),
  );

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Chevron — CSS border-trick technique (mirrors HBack / daybreak-dashboard.jsx
// Chevron glyphs: a div, not an <svg>). Rotation uses a plain CSS transition,
// matching card-list.tsx's own "Your words" accordion chevron precedent —
// this is not one of the @keyframes pairs the accordion open/close uses.
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 9,
        height: 9,
        borderRight: "2.2px solid #4A331C",
        borderBottom: "2.2px solid #4A331C",
        transform: open ? "rotate(-135deg)" : "rotate(45deg)",
        transition: "transform 0.2s ease-in-out",
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}

// Matches the acct-success-fade animation-duration in globals.css (D-10).
const SUCCESS_FADE_MS = 2400;
// Unmount-on-close safety net, slightly longer than acct-accordion-close-kf's
// 0.22s CSS animation — covers prefers-reduced-motion (a `none` animation
// never fires animationend) and jsdom (no real CSS animation timing).
// Mirrors card-list.tsx's handleAccordionToggle exactly (25-PATTERNS.md).
const CLOSE_ANIMATION_MS = 260;

export function ChangePasswordCard() {
  const { setPasswordDirty } = useAccountDirty();

  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | null
  >(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const currentPassword = watch("currentPassword");
  const newPassword = watch("newPassword");
  const confirmNewPassword = watch("confirmNewPassword");

  // D-04 — cross-sibling dirty boolean. Only the derived boolean ever
  // crosses into AccountDirtyProvider (T-25-02-B); recomputed on every
  // keystroke via watch(), and automatically goes back to false whenever
  // reset() clears all three fields (success path below) or the user
  // clears them by hand.
  useEffect(() => {
    setPasswordDirty(
      currentPassword !== "" || newPassword !== "" || confirmNewPassword !== "",
    );
  }, [currentPassword, newPassword, confirmNewPassword, setPasswordDirty]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
      if (successTimerRef.current !== null)
        clearTimeout(successTimerRef.current);
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function setPanelOpen(next: boolean) {
    clearCloseTimer();
    setOpen(next);
    if (next) {
      setPanelMounted(true);
    } else {
      closeTimerRef.current = setTimeout(() => {
        setPanelMounted(false);
        closeTimerRef.current = null;
      }, CLOSE_ANIMATION_MS);
    }
  }

  function handleRowClick() {
    setPanelOpen(!open);
  }

  async function onSubmit(values: ChangePasswordFormValues) {
    setIsPending(true);
    setServerError(null);
    setCurrentPasswordError(null);
    try {
      // D-09 — revokeOtherSessions:true ends every OTHER signed-in device
      // while this device survives via a fresh token (T-25-02-A).
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        // Map by .code, never display .message verbatim (T-25-02-C).
        if (error.code === "INVALID_PASSWORD") {
          setCurrentPasswordError("That password isn't right.");
        } else {
          setServerError("Couldn't update your password. Try again.");
        }
        return;
      }

      // D-10 — success: clear fields, collapse, show the quiet fade.
      reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setPanelOpen(false);

      setShowSuccess(true);
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        successTimerRef.current = null;
      }, SUCCESS_FADE_MS);
    } catch {
      // WR-01 — authClient.changePassword can REJECT, not just resolve
      // with {error}. Without this catch a rejected promise left the
      // Update-password button silently re-enabling with no feedback.
      setServerError("Couldn't update your password. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="change-password-panel"
        data-testid="account-password-row"
        onClick={handleRowClick}
        style={{
          width: "100%",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span className="font-display text-[17px] font-bold text-foreground">
            Change password
          </span>
          <Chevron open={open} />
        </span>
        {showSuccess && (
          <span
            data-testid="account-password-success"
            className="acct-success-fade text-[13px] font-bold"
            style={{ color: "var(--db-green)" }}
          >
            Password updated
          </span>
        )}
      </button>

      {panelMounted && (
        <div
          id="change-password-panel"
          className={open ? "acct-accordion-open" : "acct-accordion-closing"}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget || open) return;
            clearCloseTimer();
            setPanelMounted(false);
          }}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="acct-accordion-inner flex flex-col gap-[15px]"
            style={{ padding: "0 20px 20px" }}
          >
            <TField
              label="Current password"
              type="password"
              placeholder="••••••••"
              data-testid="account-password-current-field"
              disabled={isPending}
              error={
                isSubmitted
                  ? (errors.currentPassword?.message ??
                    currentPasswordError ??
                    undefined)
                  : undefined
              }
              {...register("currentPassword")}
            />
            <TField
              label="New password"
              type="password"
              placeholder="••••••••"
              hint="At least 8 characters"
              data-testid="account-password-new-field"
              disabled={isPending}
              error={isSubmitted ? errors.newPassword?.message : undefined}
              {...register("newPassword")}
            />
            <TField
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              data-testid="account-password-confirm-field"
              disabled={isPending}
              error={
                isSubmitted ? errors.confirmNewPassword?.message : undefined
              }
              {...register("confirmNewPassword")}
            />
            <p className="text-[12.5px] text-muted-foreground">
              For your security, all other signed-in devices will be logged out.
            </p>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <TBtn
              type="submit"
              isPending={isPending}
              data-testid="account-password-save-btn"
            >
              Update password
            </TBtn>
          </form>
        </div>
      )}
    </Card>
  );
}
