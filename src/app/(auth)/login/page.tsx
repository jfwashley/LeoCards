"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard, DaybreakAuthScene } from "@/components/daybreak/auth-card";
import { TBtn } from "@/components/daybreak/t-btn";
import { TField } from "@/components/daybreak/t-field";
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
    // Only follow same-origin relative paths — reject absolute/protocol-relative
    // URLs to prevent an open redirect via ?callbackUrl=https://evil.com (CR-01).
    const safeCallback =
      callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
    router.push(safeCallback);
  }

  return (
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

      <div className="flex flex-col gap-1.5">
        <TField
          label="Password"
          type="password"
          placeholder="••••••••"
          error={
            isSubmitted
              ? (errors.password?.message ?? authError ?? undefined)
              : undefined
          }
          {...register("password")}
        />
        <Link
          href="/forgot-password"
          className="self-end text-[13px] font-semibold text-[var(--db-link)] hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <TBtn type="submit" isPending={isPending}>
        Sign in
      </TBtn>
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
