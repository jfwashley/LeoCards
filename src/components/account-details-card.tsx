"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ACBanner } from "@/components/daybreak/ac-banner";
import { Card } from "@/components/daybreak/card";
import { TBtn } from "@/components/daybreak/t-btn";
import { TField } from "@/components/daybreak/t-field";
import { Button } from "@/components/ui/button";
import { requestEmailChange } from "@/lib/account-actions";
import { authClient } from "@/lib/auth-client";

// D-05/D-06/D-07 — view/edit details card. Schema mirrors signup/page.tsx's
// exact zod rules (25-PATTERNS.md).
const detailsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
});

type DetailsFormValues = z.infer<typeof detailsSchema>;

interface AccountDetailsCardProps {
  name: string;
  email: string;
  memberSince: string;
  nativeLanguageLabel: string;
  pendingEmail: string | null;
}

// Matches the acct-success-fade animation-duration in globals.css (D-10
// pattern reused here for the details-card "Details updated" confirmation).
const SUCCESS_FADE_MS = 2400;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F0E3CF] last:border-b-0">
      <span className="text-[13px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-[15px] font-semibold text-foreground truncate ml-4">
        {value}
      </span>
    </div>
  );
}

export function AccountDetailsCard({
  name,
  email,
  memberSince,
  nativeLanguageLabel,
  pendingEmail,
}: AccountDetailsCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTakenError, setEmailTakenError] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resendPending, setResendPending] = useState(false);
  // WR-03 — separate from serverError: the pending-email banner (and its
  // Resend button) renders regardless of `editing`, but serverError's <p>
  // only renders inside the editing==true form branch below. Reusing
  // serverError would leave a resend failure completely unshown whenever
  // the user clicks Resend from view mode (the common case).
  const [resendError, setResendError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name, email },
  });

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  function handleEditClick() {
    reset({ name, email });
    setServerError(null);
    setEmailTakenError(null);
    setEditing(true);
  }

  function handleCancel() {
    reset({ name, email });
    setServerError(null);
    setEmailTakenError(null);
    setEditing(false);
  }

  async function onSubmit(values: DetailsFormValues) {
    setIsPending(true);
    setServerError(null);
    setEmailTakenError(null);

    const nameChanged = values.name !== name;
    const emailChanged = values.email !== email;

    try {
      // Pitfall 9 — sequence name FIRST, then email, under one isPending.
      // NEVER pass email to updateUser (better-auth 400s with
      // EMAIL_CAN_NOT_BE_UPDATED even when the value is unchanged).
      if (nameChanged) {
        const { error } = await authClient.updateUser({ name: values.name });
        if (error) {
          setServerError("Couldn't save your changes. Try again.");
          return;
        }
        // WR-02 — commit the name success immediately, independent of what
        // the email step does next. Without this, a name-succeeds/
        // email-fails combined save left the component's `name` prop
        // stale: the server already had the new name, but `editing` stayed
        // true and a later "Discard changes" reset() would re-show the OLD
        // name, contradicting what the server just persisted.
        router.refresh();
      }

      if (emailChanged) {
        const result = await requestEmailChange(values.email);
        if (!result.ok) {
          if (result.error === "email-taken") {
            setEmailTakenError("That email is already in use.");
          } else {
            setServerError("Couldn't save your changes. Try again.");
          }
          return;
        }
      }

      router.refresh();
      setEditing(false);

      // A5 — on full success, the pending-email banner (driven by the
      // pendingEmail prop after refresh) is the sole signal when the email
      // changed; the quiet fade fires ONLY when it did not. Never both.
      if (!emailChanged) {
        setShowSuccess(true);
        if (successTimerRef.current !== null) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => {
          setShowSuccess(false);
          successTimerRef.current = null;
        }, SUCCESS_FADE_MS);
      }
    } catch {
      // WR-01 — requestEmailChange is a "use server" action that can
      // REJECT (throws "Unauthorized" when the session expired/was revoked
      // mid-edit, e.g. a password change on another tab firing
      // revokeOtherSessions). Every branch above assumes the callee
      // RESOLVES with an {error}/{ok:false} shape; without this catch a
      // rejected promise left the Save button silently re-enabling with no
      // feedback at all.
      setServerError("Couldn't save your changes. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendPending(true);
    setResendError(null);
    try {
      // WR-03 — the {ok, error} result was previously discarded entirely:
      // a rate-limited or otherwise-failed resend re-enabled the button and
      // refreshed the page as if nothing happened, with no error text.
      const result = await requestEmailChange(pendingEmail);
      if (!result.ok) {
        setResendError("Couldn't resend the email. Try again in a bit.");
        return;
      }
      router.refresh();
    } finally {
      setResendPending(false);
    }
  }

  return (
    <>
      <div data-testid="account-details-card">
        <Card className="p-5 flex flex-col gap-3">
          {!editing && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleEditClick}
                data-testid="account-edit-btn"
                className="min-h-11 inline-flex items-center px-2 -mx-2 text-[13px] font-bold text-[var(--db-link)]"
              >
                Edit
              </button>
            </div>
          )}

          {showSuccess && (
            <p
              data-testid="account-details-success"
              className="acct-success-fade text-[13px] font-bold"
              style={{ color: "var(--db-green)" }}
            >
              Details updated
            </p>
          )}

          {editing ? (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-[15px]">
                <TField
                  label="Name"
                  type="text"
                  data-testid="account-name-field"
                  disabled={isPending}
                  error={isSubmitted ? errors.name?.message : undefined}
                  {...register("name")}
                />
                <TField
                  label="Email"
                  type="email"
                  data-testid="account-email-field"
                  hint="Changing this sends a confirmation link to the new address."
                  disabled={isPending}
                  error={
                    isSubmitted
                      ? (errors.email?.message ?? emailTakenError ?? undefined)
                      : undefined
                  }
                  {...register("email")}
                />
              </div>

              <div>
                <DetailRow label="Member since" value={memberSince} />
                <DetailRow label="I speak" value={nativeLanguageLabel} />
              </div>

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}

              <TBtn
                type="submit"
                isPending={isPending}
                data-testid="account-save-btn"
              >
                Save changes
              </TBtn>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                disabled={isPending}
                onClick={handleCancel}
                data-testid="account-cancel-btn"
              >
                Discard changes
              </Button>
            </form>
          ) : (
            <div>
              <DetailRow label="Name" value={name} />
              <DetailRow label="Email" value={email} />
              <DetailRow label="Member since" value={memberSince} />
              <DetailRow label="I speak" value={nativeLanguageLabel} />
            </div>
          )}
        </Card>
      </div>

      {pendingEmail && (
        <div data-testid="account-email-pending-banner">
          <ACBanner kind="ok">
            <div className="flex flex-col gap-1">
              <span className="font-bold">
                Verification sent to {pendingEmail}
              </span>
              <span className="font-normal">
                The change applies once you click the link. Your current email
                stays active until then.
              </span>
              <span>
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendPending}
                  data-testid="account-email-resend-btn"
                  className="min-h-11 inline-flex items-center px-2 -mx-2 font-bold underline disabled:opacity-60"
                >
                  Resend email.
                </button>
              </span>
            </div>
          </ACBanner>
          {resendError && (
            <p className="text-sm text-destructive mt-2">{resendError}</p>
          )}
        </div>
      )}
    </>
  );
}
