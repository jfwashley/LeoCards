"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

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
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          This reset link has expired. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline block text-center"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function onSubmit(values: ResetFormValues) {
    if (!token) return;

    setIsPending(true);
    setTokenError(null);

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    setIsPending(false);

    if (error) {
      setTokenError("This reset link has expired. Request a new one.");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className={
              isSubmitted && errors.password ? "border-destructive" : ""
            }
            {...register("password")}
          />
          {isSubmitted && errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className={
              isSubmitted && errors.confirmPassword ? "border-destructive" : ""
            }
            {...register("confirmPassword")}
          />
          {isSubmitted && errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {tokenError && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{tokenError}</p>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline block"
            >
              Request a new reset link
            </Link>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Set new password"
          )}
        </Button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-sm rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold leading-[1.2] mb-4">
        Set a new password
      </h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </Card>
  );
}
