"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod/mini";

import { AuthCard, DaybreakAuthScene } from "@/components/daybreak/auth-card";
import { TBtn } from "@/components/daybreak/t-btn";
import { TField } from "@/components/daybreak/t-field";
import { authClient } from "@/lib/auth-client";

const resetSchema = z
  .object({
    password: z.string().check(z.minLength(8, "Password must be at least 8 characters")),
    confirmPassword: z.string().check(z.minLength(1, "Please confirm your password")),
  })
  .check(
    z.refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
  );

type ResetFormValues = z.infer<typeof resetSchema>;

/** Expired / missing-token dead-end state (Daybreak dusk) */
function ExpiredState() {
  const router = useRouter();
  return (
    <>
      <h2 className="font-display text-[22px] font-bold text-foreground">
        Link expired
      </h2>
      <div className="flex flex-col items-center gap-3 text-center py-0.5">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#FCEBE6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            color: "#de5f4a",
            fontWeight: 700,
          }}
        >
          !
        </div>
        <p className="text-[14.5px] text-muted-foreground leading-relaxed">
          This reset link has expired. Request a new one and we&rsquo;ll send a
          fresh link.
        </p>
        <TBtn type="button" onClick={() => router.push("/forgot-password")}>
          Request a new link
        </TBtn>
      </div>
    </>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isPending, setIsPending] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  if (!token) {
    return <ExpiredState />;
  }

  async function onSubmit(values: ResetFormValues) {
    if (!token) return;

    setIsPending(true);
    setTokenError(null);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });

      if (error) {
        setTokenError("This reset link has expired. Request a new one.");
        return;
      }

      router.push("/login");
    } finally {
      setIsPending(false);
    }
  }

  if (tokenError) {
    return <ExpiredState />;
  }

  return (
    <>
      <h2 className="font-display text-[22px] font-bold text-foreground">
        Set a new password
      </h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-[15px]"
      >
        <TField
          label="New password"
          type="password"
          placeholder="••••••••"
          hint="At least 8 characters"
          error={isSubmitted ? errors.password?.message : undefined}
          {...register("password")}
        />
        <TField
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          error={isSubmitted ? errors.confirmPassword?.message : undefined}
          {...register("confirmPassword")}
        />
        <TBtn type="submit" isPending={isPending}>
          Set new password
        </TBtn>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <AuthCard
        scene={
          <DaybreakAuthScene variant="dusk" tagline="Almost done." />
        }
      >
        <Suspense
          fallback={
            <div className="text-sm text-muted-foreground">Loading…</div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-bold text-[var(--db-link)] hover:underline"
        >
          &lsaquo; Back to sign in
        </Link>
      </p>
    </>
  );
}
