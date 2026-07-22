"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod/mini";

import { AuthCard, DaybreakAuthScene } from "@/components/daybreak/auth-card";
import { TBtn } from "@/components/daybreak/t-btn";
import { TField } from "@/components/daybreak/t-field";
import { authClient } from "@/lib/auth-client";

const signupSchema = z.object({
  name: z.string().check(z.minLength(1, "Name is required")),
  email: z.email("Please enter a valid email"),
  password: z.string().check(z.minLength(8, "Password must be at least 8 characters")),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupFormValues) {
    setIsPending(true);
    setEmailError(null);

    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      });

      if (error) {
        setEmailError("An account with this email already exists.");
        return;
      }

      router.push("/welcome");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <AuthCard scene={<DaybreakAuthScene variant="sunrise" />}>
        <h2 className="font-display text-[22px] font-bold text-foreground">
          Create your account
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-[15px]"
        >
          <TField
            label="Name"
            type="text"
            placeholder="Your name"
            error={isSubmitted ? errors.name?.message : undefined}
            {...register("name")}
          />

          <TField
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={
              isSubmitted
                ? (errors.email?.message ?? (emailError ?? undefined))
                : undefined
            }
            {...register("email")}
          />

          <TField
            label="Password"
            type="password"
            placeholder="••••••••"
            hint="At least 8 characters"
            error={isSubmitted ? errors.password?.message : undefined}
            {...register("password")}
          />

          <TBtn type="submit" isPending={isPending}>
            Create account
          </TBtn>
        </form>
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-[var(--db-link)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
