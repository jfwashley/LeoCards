"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard, DaybreakAuthScene } from "@/components/daybreak/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Daybreak field — labeled input, warm fill, 1.5px border (red on error).
function fieldClass(error?: boolean) {
  return (
    "h-12 rounded-xl border-[1.5px] bg-[var(--db-field-bg)] px-3.5 text-[15px] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
    (error ? "border-destructive" : "border-[#EDDFC9]")
  );
}

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
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-[15px]"
    >
      <div className="grid gap-1.5">
        <Label
          htmlFor="email"
          className="text-[13px] font-semibold text-foreground"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          className={fieldClass(isSubmitted && !!errors.email)}
          {...register("email")}
        />
        {isSubmitted && errors.email && (
          <p className="text-[13px] font-semibold text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label
          htmlFor="password"
          className="text-[13px] font-semibold text-foreground"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          className={fieldClass(
            isSubmitted && (!!errors.password || !!authError),
          )}
          {...register("password")}
        />
        {isSubmitted && errors.password && (
          <p className="text-[13px] font-semibold text-destructive">
            {errors.password.message}
          </p>
        )}
        {authError && (
          <p className="text-[13px] font-semibold text-destructive">
            {authError}
          </p>
        )}
        <Link
          href="/forgot-password"
          className="self-end text-[13px] font-semibold text-[var(--db-link)] hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-[50px] w-full rounded-[14px] text-[16px] font-bold shadow-[var(--db-btn-shadow)] hover:brightness-[0.97]"
      >
        {isPending ? <Loader2 className="animate-spin" /> : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <AuthCard scene={<DaybreakAuthScene variant="sunrise" />}>
        <h2 className="font-display text-[22px] font-bold text-foreground">
          Welcome back
        </h2>
        <Suspense
          fallback={
            <div className="text-sm text-muted-foreground">Loading…</div>
          }
        >
          <LoginForm />
        </Suspense>
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        Don&rsquo;t have an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-[var(--db-link)] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
