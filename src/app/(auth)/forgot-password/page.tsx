"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard, DaybreakAuthScene } from "@/components/daybreak/auth-card";
import { TBtn } from "@/components/daybreak/t-btn";
import { TField } from "@/components/daybreak/t-field";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsPending(true);

    // Better Auth maps forgetPassword -> requestPasswordReset in the client
    await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsPending(false);
    setSentEmail(values.email);
    setSent(true);
  }

  return (
    <>
      <AuthCard scene={<DaybreakAuthScene variant="daylight" tagline="We'll send a link." />}>
        {sent ? (
          <>
            <h2 className="font-display text-[22px] font-bold text-foreground">
              Check your email
            </h2>
            <div className="flex flex-col items-center gap-3 text-center py-0.5">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#FFF1DC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                ✉
              </div>
              <p className="text-[14.5px] text-muted-foreground leading-relaxed">
                If an account exists, we&rsquo;ve sent a reset link to{" "}
                <strong className="font-bold text-foreground">{sentEmail}</strong>.
              </p>
              <p className="text-[13px] text-muted-foreground">
                Didn&rsquo;t get it? Check spam, or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-bold text-[var(--db-link)] hover:underline"
                >
                  resend
                </button>
                .
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-[22px] font-bold text-foreground">
              Reset your password
            </h2>
            <p className="text-[14px] text-muted-foreground leading-[1.45]">
              Enter your email and we&rsquo;ll send you a reset link.
            </p>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-[15px]"
            >
              <TField
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={isSubmitted ? errors.email?.message : undefined}
                {...register("email")}
              />
              <TBtn type="submit" isPending={isPending}>
                Send reset link
              </TBtn>
            </form>
          </>
        )}
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
