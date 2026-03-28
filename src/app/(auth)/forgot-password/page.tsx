"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Card className="w-full max-w-sm rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold leading-[1.2] mb-1">
        Reset your password
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {sent ? (
        <p className="text-sm text-muted-foreground">
          Check your email — we sent a reset link to{" "}
          <span className="font-medium text-foreground">{sentEmail}</span>.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className={
                  isSubmitted && errors.email ? "border-destructive" : ""
                }
                {...register("email")}
              />
              {isSubmitted && errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={isPending}>
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Send reset link"
              )}
            </Button>
          </div>
        </form>
      )}

      <Link
        href="/login"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline block text-center mt-4"
      >
        Back to sign in
      </Link>
    </Card>
  );
}
