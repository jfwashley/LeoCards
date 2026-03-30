"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  nativeLanguage: z.enum(["en", "fr", "es"]),
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
    defaultValues: {
      nativeLanguage: "en",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsPending(true);
    setEmailError(null);

    const { error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      // nativeLanguage is stored in onboarding flow after signup
      // Better Auth's signUp.email does not accept arbitrary fields
    });

    setIsPending(false);

    if (error) {
      setEmailError("An account with this email already exists.");
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-xl font-semibold leading-[1.2] mb-4">
        Create your account
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              className={isSubmitted && errors.name ? "border-destructive" : ""}
              {...register("name")}
            />
            {isSubmitted && errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={
                isSubmitted && (errors.email || emailError)
                  ? "border-destructive"
                  : ""
              }
              {...register("email")}
            />
            {isSubmitted && errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="nativeLanguage">Native language</Label>
            <select
              id="nativeLanguage"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("nativeLanguage")}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
            {isSubmitted && errors.nativeLanguage && (
              <p className="text-sm text-destructive">
                {errors.nativeLanguage.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full h-11" disabled={isPending}>
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </div>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-4">
        Already have an account?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
