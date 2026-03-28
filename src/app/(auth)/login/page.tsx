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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setIsPending(true);
    setAuthError(null);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    setIsPending(false);

    if (error) {
      setAuthError("Incorrect email or password.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl");
    router.push(callbackUrl ?? "/dashboard");
  }

  return (
    <>
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

          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={
                isSubmitted && (errors.password || authError)
                  ? "border-destructive"
                  : ""
              }
              {...register("password")}
            />
            {isSubmitted && errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
            {authError && (
              <p className="text-sm text-destructive">{authError}</p>
            )}
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline block text-right"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Sign in"
            )}
          </Button>
        </div>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-4">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold leading-[1.2] mb-4">
        Welcome back
      </h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
