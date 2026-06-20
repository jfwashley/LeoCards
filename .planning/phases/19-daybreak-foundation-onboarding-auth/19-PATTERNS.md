# Phase 19: Daybreak Foundation + Onboarding & Auth - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 16 new/modified files
**Analogs found:** 16 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/daybreak/t-field.tsx` | component/primitive | request-response (form field) | `src/app/(auth)/login/page.tsx` (`fieldClass` + inline Label/Input) | exact — extract inline pattern |
| `src/components/daybreak/t-btn.tsx` | component/primitive | request-response (submit) | `src/app/(auth)/login/page.tsx` (Button + Loader2 pattern) | exact — extract inline pattern |
| `src/components/daybreak/pill.tsx` | component/primitive | transform (display only) | `src/app/globals.css` (`--db-pill-bg`/`--db-pill-text`) | role-match |
| `src/components/daybreak/card.tsx` | component/primitive | transform (display only) | `src/components/daybreak/auth-card.tsx` (`AuthCard` inner div) | exact — extract surface pattern |
| `src/app/(auth)/login/page.tsx` | page/form | request-response | itself (refactor in place) | exact |
| `src/app/(auth)/signup/page.tsx` | page/form | request-response | `src/app/(auth)/login/page.tsx` | exact |
| `src/app/(auth)/forgot-password/page.tsx` | page/form | request-response | `src/app/(auth)/login/page.tsx` | exact |
| `src/app/(auth)/reset-password/page.tsx` | page/form | request-response | `src/app/(auth)/login/page.tsx` | exact |
| `src/app/(auth)/welcome/page.tsx` | page/RSC shell | request-response | `src/app/(protected)/layout.tsx` (session check + redirect) | role-match |
| `src/components/welcome/welcome-page.tsx` | component/controller | event-driven (step machine) | `src/components/first-visit-picker.tsx` | role-match |
| `src/components/welcome/welcome-step-meet.tsx` | component | transform (display) | `design/handoff-daybreak/daybreak-onboarding.jsx` `ObMeet` | design-spec |
| `src/components/welcome/welcome-step-promise.tsx` | component | transform (display) | `design/handoff-daybreak/daybreak-onboarding.jsx` `ObPromise` | design-spec |
| `src/components/welcome/welcome-step-choose.tsx` | component/form | CRUD (createDeck + updateUser) | `src/components/first-visit-picker.tsx` + `design/handoff-daybreak/daybreak-onboarding.jsx` `ObChoose` | role-match |
| `src/components/welcome/habitat-teaser.tsx` | component/animation | event-driven (ambient loop) | `src/components/level-up-overlay.tsx` (motion/react usage) | role-match |
| `src/hooks/use-prefers-reduced-motion.ts` | hook/utility | event-driven (media query) | `src/components/habitat-video.tsx` lines 88-110 | exact — extract verbatim |
| `src/app/(protected)/dashboard/page.tsx` | page/RSC | CRUD (0-deck redirect guard) | `src/app/(protected)/layout.tsx` (redirect pattern) | exact |

---

## Pattern Assignments

### `src/components/daybreak/t-field.tsx` (component, request-response)

**Analog:** `src/app/(auth)/login/page.tsx` — the `fieldClass()` helper + inline `Label`/`Input` blocks (lines 25-90).
**Design spec:** `design/handoff-daybreak/hifi-shared.jsx` `TField` function (lines 59-73).

**Imports pattern** (copy these):
```tsx
import * as React from "react";
```

**Core pattern** — `React.forwardRef` wrapping an `<input>`, extracting the inline pattern from login into a reusable primitive:
```tsx
// src/components/daybreak/t-field.tsx
"use client";
import * as React from "react";

interface TFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TField = React.forwardRef<HTMLInputElement, TFieldProps>(
  ({ label, error, hint, id, ...inputProps }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold text-foreground"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={[
            "h-12 rounded-xl border-[1.5px] bg-[var(--db-field-bg)] px-3.5 text-[15px] shadow-none",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            error ? "border-destructive" : "border-[#EDDFC9]",
          ].join(" ")}
          {...inputProps}
        />
        {error && (
          <p className="text-[13px] font-semibold text-destructive">{error}</p>
        )}
        {!error && hint && (
          <p className="text-[12.5px] text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  },
);
TField.displayName = "TField";
```

**Field class values sourced from** `login/page.tsx` lines 26-29:
```ts
// existing fieldClass() — the exact Tailwind values to port into TField
"h-12 rounded-xl border-[1.5px] bg-[var(--db-field-bg)] px-3.5 text-[15px] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40 "
+ (error ? "border-destructive" : "border-[#EDDFC9]")
```

**Usage with react-hook-form** (exact pattern from login lines 79-90):
```tsx
// error prop: pass only after isSubmitted to match existing per-field validation convention
<TField
  label="Email"
  type="email"
  placeholder="you@example.com"
  error={isSubmitted ? errors.email?.message : undefined}
  {...register("email")}
/>
```

---

### `src/components/daybreak/t-btn.tsx` (component, request-response)

**Analog:** `src/app/(auth)/login/page.tsx` lines 127-133 (Button + Loader2 spinner pattern).
**Design spec:** `design/handoff-daybreak/hifi-shared.jsx` `TBtn` function (lines 75-88).

**Core pattern:**
```tsx
// src/components/daybreak/t-btn.tsx
import { Loader2 } from "lucide-react";
import * as React from "react";

interface TBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
}

export function TBtn({
  isPending,
  children,
  disabled,
  className,
  ...props
}: TBtnProps) {
  return (
    <button
      disabled={isPending || disabled}
      className={[
        "h-[50px] w-full rounded-[14px] text-[16px] font-bold",
        "bg-primary text-primary-foreground",
        "shadow-[var(--db-btn-shadow)]",
        "hover:brightness-[0.97] disabled:opacity-60 disabled:cursor-not-allowed",
        "flex items-center justify-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {isPending ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}
```

**Token sources** (from `globals.css` lines 92, and login line 131):
- `--db-btn-shadow: 0 10px 22px rgba(242, 138, 31, 0.3)` — already in `:root`
- `rounded-[14px]`, `h-[50px]`, `text-[16px] font-bold` — exact values from login's Button

---

### `src/components/daybreak/pill.tsx` (component, transform)

**Analog:** Token values from `src/app/globals.css` lines 93-94; semantic class `secondary`/`secondary-foreground`.
**No existing component analog** — create from tokens.

**Core pattern:**
```tsx
// src/components/daybreak/pill.tsx
interface PillProps {
  children: React.ReactNode;
  className?: string;
}

export function Pill({ children, className }: PillProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[12px] font-semibold",
        "bg-[var(--db-pill-bg)] text-[var(--db-pill-text)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
```

**Token values** (from `globals.css` lines 93-94):
- `--db-pill-bg: #fff1dc`
- `--db-pill-text: #b4762a`

---

### `src/components/daybreak/card.tsx` (component, transform)

**Analog:** `src/components/daybreak/auth-card.tsx` — the inner surface `<div>` (lines 186-199).
**Design spec:** `design/handoff-daybreak/hifi-shared.jsx` — `GhostPeek`/`HiFiLogin` card container.

**Surface pattern** (extracted from `auth-card.tsx` lines 186-199):
```tsx
// src/components/daybreak/card.tsx
// The Daybreak card surface — white, radius 22, amber shadow, border.
// The AuthCard in auth-card.tsx already composes this WITH ghost-peek peeks.
// This standalone Card is for non-auth screens (empty states, welcome steps).
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 22,
        background: "#FFFFFF",
        border: "1px solid #F0E3CF",
        boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
```

**Note:** `--db-card-radius: 22px`, `--db-card-border: #f0e3cf`, `--db-card-shadow` are all in `globals.css` lines 88-90. The Card component can use Tailwind `shadow-[var(--db-card-shadow)]` or inline styles (auth-card.tsx uses inline — match that pattern for consistency).

---

### `src/app/(auth)/login/page.tsx` (page/form, refactor)

**Analog:** itself — refactor in place to compose `TField`/`TBtn` primitives.

**What changes** (lines 11-12, 79-133):
- Replace `import { Button } from "@/components/ui/button"`, `import { Input } from "@/components/ui/input"`, `import { Label } from "@/components/ui/label"` with `import { TField } from "@/components/daybreak/t-field"` and `import { TBtn } from "@/components/daybreak/t-btn"`
- Replace each `<Label>` + `<Input className={fieldClass(...)}> + error <p>` block with `<TField label="..." error={...} {...register("...")} />`
- Replace `<Button ... className="h-[50px]...">` with `<TBtn isPending={isPending}>Sign in</TBtn>`
- Delete `fieldClass()` helper — now encapsulated in `TField`

**Form structure to preserve** (lines 38-63 — keep exactly):
```tsx
const { register, handleSubmit, formState: { errors, isSubmitted } } = useForm<LoginFormValues>({
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
  if (error) { setAuthError("Incorrect email or password."); return; }
  const callbackUrl = searchParams.get("callbackUrl");
  router.push(callbackUrl ?? "/dashboard");
}
```

**Shell structure to preserve** (lines 138-164):
```tsx
export default function LoginPage() {
  return (
    <>
      <AuthCard scene={<DaybreakAuthScene variant="sunrise" />}>
        <h2 className="font-display text-[22px] font-bold text-foreground">
          Welcome back
        </h2>
        <Suspense fallback={...}>
          <LoginForm />
        </Suspense>
      </AuthCard>
      <p ...>Don't have an account? <Link href="/signup">Sign up</Link></p>
    </>
  );
}
```

---

### `src/app/(auth)/signup/page.tsx` (page/form, restyle)

**Analog:** `src/app/(auth)/login/page.tsx` (post-refactor) for the Daybreak shell/primitives pattern.
**Current file:** `src/app/(auth)/signup/page.tsx` — read in full above.

**What changes (D-04):**
1. Remove `nativeLanguage` from `signupSchema` (line 21) and `defaultValues` (line 38)
2. Remove `nativeLanguage` from `authClient.signUp.email(...)` call (line 50)
3. Change `router.push("/dashboard")` (line 62) to `router.push("/welcome")`
4. Remove the native language `<select>` field block (lines 124-141)
5. Replace `Card` (shadcn) shell with `AuthCard scene={<DaybreakAuthScene variant="sunrise" />}`
6. Replace each `Label`+`Input` block with `<TField ...>`
7. Replace `Button` with `<TBtn isPending={isPending}>`
8. Move page structure to match login (outer `<>` fragment, `AuthCard`, link below card)

**Signup-specific schema to keep** (lines 17-21 minus nativeLanguage):
```ts
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // nativeLanguage REMOVED (D-04)
});
```

**Duplicate-email error pattern to keep** (lines 29, 54-58):
```tsx
const [emailError, setEmailError] = useState<string | null>(null);
// ...
if (error) {
  setEmailError("An account with this email already exists.");
  return;
}
```

---

### `src/app/(auth)/forgot-password/page.tsx` (page/form, restyle)

**Analog:** `src/app/(auth)/login/page.tsx` for Daybreak shell; itself for auth logic.

**Auth logic to preserve exactly** (current file lines 35-47):
```tsx
async function onSubmit(values: ForgotPasswordFormValues) {
  setIsPending(true);
  await authClient.requestPasswordReset({
    email: values.email,
    redirectTo: `${window.location.origin}/reset-password`,
  });
  setIsPending(false);
  setSentEmail(values.email);
  setSent(true);
}
```

**Privacy-safe confirmation pattern to preserve** (lines 58-63):
```tsx
{sent ? (
  <p className="text-sm text-muted-foreground">
    Check your email — we sent a reset link to{" "}
    <span className="font-medium text-foreground">{sentEmail}</span>.
  </p>
) : ( /* form */ )}
```

**Scene variant:** `DaybreakAuthScene variant="daylight"` (D-07).
**What changes:** Wrap in `AuthCard scene={<DaybreakAuthScene variant="daylight" />}`, replace `Card`(shadcn) + `Label`+`Input` + `Button` with `TField`/`TBtn`, preserve all auth logic.

---

### `src/app/(auth)/reset-password/page.tsx` (page/form, restyle)

**Analog:** `src/app/(auth)/login/page.tsx` for shell; itself for auth logic.

**Auth logic to preserve** (current file lines 31-78):
- Token extraction: `const token = searchParams.get("token")` (line 32)
- Missing-token dead-end (lines 44-58): preserve the expired-link UI exactly
- `authClient.resetPassword({ newPassword: values.password, token })` (line 66)
- Token error state: `setTokenError("This reset link has expired. Request a new one.")` (line 74)
- `router.push("/login")` on success (line 78)

**Zod cross-field refinement to preserve** (lines 17-25):
```ts
const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

**Scene variant:** `DaybreakAuthScene variant="dusk"` (D-07).
**What changes:** Wrap in `AuthCard`, replace `Card`(shadcn) shell with auth-card shell, swap `Label`+`Input`+`Button` for `TField`/`TBtn`. `Suspense` wrapper for `useSearchParams` must remain (line 150-158).

---

### `src/app/(auth)/welcome/page.tsx` (page/RSC shell, request-response)

**Analog:** `src/app/(protected)/layout.tsx` for the session-check + redirect pattern.

**Session guard pattern** (copy from `(protected)/layout.tsx` lines 1-18, adapted):
```tsx
// src/app/(auth)/welcome/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserDecks } from "@/lib/deck-queries";
import type { UserId } from "@/db/schema";
import { WelcomePage } from "@/components/welcome/welcome-page";

export default async function WelcomePageRoute() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // If user already has decks, skip welcome (browser back-nav guard)
  const decks = await getUserDecks(session.user.id as UserId);
  if (decks.length > 0) redirect("/dashboard");

  return <WelcomePage />;
}
```

**Route group note:** File at `src/app/(auth)/welcome/page.tsx` → resolves to `/welcome` (parentheses not in URL, per Next.js 16 route-groups — AGENTS.md).

---

### `src/components/welcome/welcome-page.tsx` (component/controller, event-driven)

**Analog:** `src/components/first-visit-picker.tsx` — client component with step/loading/error state + `createDeck` + `router.push`.

**Step machine pattern** (generalized from `first-visit-picker.tsx` lines 20-37):
```tsx
"use client";
import { useState } from "react";

type Step = 1 | 2 | 3;

export function WelcomePage() {
  const [step, setStep] = useState<Step>(1);

  if (step === 1) return <WelcomeMeetStep onNext={() => setStep(2)} />;
  if (step === 2) return <WelcomePromiseStep onNext={() => setStep(3)} />;
  return <WelcomeChooseStep />;
}
```

**Shell layout** matches `OnbShell` from `design/handoff-daybreak/daybreak-onboarding.jsx` lines 6-14:
- `padding: '12px 24px 24px'`, `gap: 18`, full-height flex column
- The `(auth)/layout.tsx` provides the outer `max-w-[420px]` column + cream bg — the welcome page uses that shell, adding its own full-height flex wrapper inside.

---

### `src/components/welcome/welcome-step-meet.tsx` (component, transform)

**Design spec:** `design/handoff-daybreak/daybreak-onboarding.jsx` `ObMeet` function (lines 62-78).

**Key visual elements from spec:**
- Step dots: 3-dot row, dot 1 active (width 22px amber), inactive (9px `#EAD9BE`)
- "Skip" link (right-aligned, routes to step 3 per RESEARCH.md open question resolution)
- LionFace size 92 in a 156x156 circle `background: 'linear-gradient(180deg, #FFE7BC, #FFFDF8)'`, `border: '1px solid #F0E3CF'`
- Small sun disc: `position absolute, right 22, top 20, width 18, background '#FFC95C'`
- Heading `font-display text-[28px] font-bold` — "Meet Leo"
- Body `text-[15px] text-muted-foreground leading-[1.5] max-w-[250px]`
- "Next" button: `<TBtn>Next</TBtn>` (full-width, bottom)

**LionFace colors** from `globals.css`/`auth-card.tsx` (lion props match existing `LionFace` usage in `lion-face.tsx`):
```tsx
<LionFace size={92} mane="#E8973B" face="#FFD9A6" muzzle="#FFF1DC" ink="#4A331C" />
```

---

### `src/components/welcome/welcome-step-promise.tsx` (component, transform)

**Design spec:** `design/handoff-daybreak/daybreak-onboarding.jsx` `ObPromise` function (lines 80-95).

**Key visual elements from spec:**
- Step dots: dot 2 active
- "Skip" link
- Habitat teaser container: `width: '100%', height: 210, borderRadius: 20, overflow: 'hidden', border: ob.cardBorder, boxShadow: '0 10px 26px rgba(160,110,40,0.12)'`
- `<HabitatTeaser />` fills the container (see habitat-teaser.tsx below)
- Heading `font-display text-[24px] font-bold` — "Learn words, grow your world"
- Body `text-[15px] text-muted-foreground leading-[1.5] max-w-[260px]`
- "Next" button: `<TBtn>Next</TBtn>`

---

### `src/components/welcome/welcome-step-choose.tsx` (component/form, CRUD)

**Analog:** `src/components/first-visit-picker.tsx` (createDeck + router + error pattern) + `design/handoff-daybreak/daybreak-onboarding.jsx` `ObChoose`/`ObCreating`/`ObError` (lines 97-142).

**Imports pattern:**
```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { createDeck } from "@/lib/deck-actions";
import { TBtn } from "@/components/daybreak/t-btn";
```

**Core handler** (from RESEARCH.md Pattern 3, grounded in `first-visit-picker.tsx` lines 27-37):
```tsx
const ALL_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

async function handleStart() {
  if (!targetLang) return;
  setIsCreating(true);
  setCreateError(null);
  try {
    // 1. Persist native language FIRST (idempotent on failure)
    await authClient.updateUser({ nativeLanguage: nativeLang });
    // 2. Create first deck
    await createDeck(targetLang);
    // 3. Navigate
    router.push("/dashboard");
  } catch {
    setCreateError("Something went wrong. Try again.");
    setIsCreating(false);
  }
}
```

**Select pattern** (from `signup/page.tsx` lines 126-134 + handoff `OnbSelect`):
```tsx
// Native select styled to match TField visual (appearance-none + chevron)
<div className="flex flex-col gap-1.5">
  <label className="text-[13px] font-semibold text-foreground">I speak</label>
  <div className="relative">
    <select
      className="h-[52px] w-full appearance-none rounded-xl border-[1.5px] border-[#EDDFC9] bg-[var(--db-field-bg)] px-4 text-[16px] font-semibold text-foreground focus:outline-none focus:border-primary"
      value={nativeLang}
      onChange={(e) => setNativeLang(e.target.value)}
    >
      <option value="en">English</option>
      <option value="fr">French</option>
      <option value="es">Spanish</option>
    </select>
    {/* chevron positioned absolutely — CSS only */}
  </div>
</div>
```

**Target list exclusion** (from `first-visit-picker.tsx` line 25):
```tsx
const targetOptions = ALL_LANGUAGES.filter(l => l.code !== nativeLang);
```

**Creating state text** (from `ObCreating` line 123):
```
`Setting up your ${LANGUAGE_LABELS[targetLang]} deck…`
```

**Error state UI** (from `ObError` lines 135-138):
```tsx
<div className="flex items-center gap-2.5 p-[11px_14px] rounded-xl bg-[#FCEBE6] border-[1.5px] border-[#F2C9BF]">
  <span className="w-[22px] h-[22px] rounded-full bg-destructive text-white flex items-center justify-center text-[13px] font-bold flex-none">!</span>
  <span className="text-[14px] font-semibold text-foreground">Something went wrong. Try again.</span>
</div>
```

---

### `src/components/welcome/habitat-teaser.tsx` (component/animation, event-driven)

**Analog:** `src/components/level-up-overlay.tsx` for `motion/react` import + usage pattern (lines 1-3, 33).

**Imports pattern** (from `level-up-overlay.tsx` lines 1-3):
```tsx
"use client";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
```

**Core pattern** — CSS-drawn scene (matches `DaybreakAuthScene` geometry style from `auth-card.tsx`) with `motion.div` ambient overlay:
```tsx
export function HabitatTeaser() {
  const reduced = usePrefersReducedMotion();

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 210, borderRadius: 20, border: "1px solid #F0E3CF" }}
      aria-label="Leo's growing habitat preview"
    >
      {/* Static sunrise scene — always renders (SSR-safe) */}
      {/* Simplified DaybreakAuthScene variant: wider (no tagline), taller Leo */}
      <TeaserScene />
      {/* Ambient glow — only when motion is allowed */}
      {!reduced && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0 }}
          animate={{ opacity: [0, 0.12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
```

**Scene content:** A simplified `DaybreakAuthScene` without ghost-peek cards — same CSS geometry (gradient bg, sun disc, hills, LionFace) from `auth-card.tsx` lines 95-170, at 210px height.

---

### `src/hooks/use-prefers-reduced-motion.ts` (hook, event-driven)

**Analog:** `src/components/habitat-video.tsx` lines 88-110 — verbatim extraction.

**Exact pattern to copy** (habitat-video.tsx lines 88-107):
```ts
// src/hooks/use-prefers-reduced-motion.ts
"use client";
import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false); // SSR-safe: false = motion on by default
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
```

**After extraction:** Update `habitat-video.tsx` to import from `@/hooks/use-prefers-reduced-motion` instead of defining it locally.

---

### `src/app/(protected)/dashboard/page.tsx` (page/RSC, CRUD — add redirect guard)

**Analog:** `src/app/(protected)/layout.tsx` lines 14-15 — the `redirect()` pattern.

**Current branch to replace** (dashboard/page.tsx lines 52-63):
```tsx
// CURRENT (lines 52-63) — replace this:
if (decks.length === 0) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 px-8 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6"><HabitatWidget habitatState={habitatState} /></div>
        <FirstVisitPicker nativeLang={nativeLang} />
      </div>
    </div>
  );
}
```

**Replacement pattern** (from `(protected)/layout.tsx` line 15):
```tsx
// AFTER (D-05):
import { redirect } from "next/navigation";
// ...
if (decks.length === 0) {
  redirect("/welcome");
}
```

**Imports to remove:** `FirstVisitPicker` import (line 3). Remove `getUserNativeLanguage` from the `Promise.all` if `nativeLang` is no longer needed in the 0-deck path (it's still needed for the deck view path — keep it).

**`revalidatePath` chain:** `createDeck` already calls `revalidatePath('/dashboard')` (deck-actions.ts line 53) — no additional cache invalidation needed.

---

## Shared Patterns

### Authentication Pattern
**Source:** `src/lib/auth-client.ts` (all 8 lines)
**Apply to:** All auth pages + welcome step 3

```ts
// src/lib/auth-client.ts — import exactly this
import { authClient } from "@/lib/auth-client";
// Methods available:
// authClient.signIn.email({ email, password })
// authClient.signUp.email({ email, password, name })  // no nativeLanguage after D-04
// authClient.requestPasswordReset({ email, redirectTo })
// authClient.resetPassword({ newPassword, token })
// authClient.updateUser({ nativeLanguage })  // welcome step 3 (D-04)
```

### Form Boilerplate Pattern
**Source:** `src/app/(auth)/login/page.tsx` lines 38-44
**Apply to:** All auth pages (login, signup, forgot, reset)

```tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
// ...
const { register, handleSubmit, formState: { errors, isSubmitted } } = useForm<T>({
  resolver: zodResolver(schema),
});
```

**Validation trigger:** Always `isSubmitted && errors.field?.message` — errors shown only after first submit attempt, never on blur (D-09).

### Pending/Disabled State Pattern
**Source:** `src/app/(auth)/login/page.tsx` lines 35-36, 47, 55
**Apply to:** All forms with async submission

```tsx
const [isPending, setIsPending] = useState(false);
// onSubmit start:
setIsPending(true);
// onSubmit end (both success and error paths):
setIsPending(false);
// Form fields and button disabled while pending — TBtn handles this via isPending prop
```

### Session Guard Pattern (Server Component)
**Source:** `src/app/(protected)/layout.tsx` lines 1-18
**Apply to:** `welcome/page.tsx`

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
```

### AuthCard Shell Pattern
**Source:** `src/components/daybreak/auth-card.tsx` + `src/app/(auth)/login/page.tsx` lines 138-164
**Apply to:** All auth pages (login, signup, forgot, reset)

```tsx
import { AuthCard, DaybreakAuthScene } from "@/components/daybreak/auth-card";
// Scene variants per D-07:
// login/signup → variant="sunrise"
// forgot-password → variant="daylight"
// reset-password → variant="dusk"
<AuthCard scene={<DaybreakAuthScene variant="sunrise" />}>
  <h2 className="font-display text-[22px] font-bold text-foreground">
    {/* Screen title */}
  </h2>
  {/* TField / TBtn form content */}
</AuthCard>
```

### Daybreak Token Reference
**Source:** `src/app/globals.css` lines 53-96
**Apply to:** All new Daybreak components

```css
/* Key values for direct style references: */
--background: #fff6e9        /* cream bg */
--foreground: #4a331c        /* ink */
--primary: #f28a1f           /* amber */
--destructive: #de5f4a       /* error red */
--border: #eddfc9
--db-field-bg: #fffbf4
--db-card-shadow: 0 12px 30px rgba(160, 110, 40, 0.16)
--db-btn-shadow: 0 10px 22px rgba(242, 138, 31, 0.3)
--db-pill-bg: #fff1dc
--db-pill-text: #b4762a
--db-link: #c96f12
```

### Server Action Auth Guard Pattern
**Source:** `src/lib/deck-actions.ts` lines 37-39
**Apply to:** Any new server actions (none expected in this phase beyond `createDeck`)

```ts
"use server";
const session = await auth.api.getSession({ headers: await headers() });
if (!session) throw new Error("Unauthorized");
const userId = session.user.id as UserId;
```

---

## No Analog Found

All files have codebase analogs or design-spec equivalents. No file is fully greenfield without reference.

The closest to "no analog" is the step-progress dot component (`OnbDots` from the handoff) — this is a trivial inline element (no dedicated file needed; inline in each welcome step).

---

## Metadata

**Analog search scope:** `src/app/(auth)/`, `src/app/(protected)/`, `src/components/daybreak/`, `src/components/`, `src/lib/`, `src/hooks/`, `design/handoff-daybreak/`, `src/app/globals.css`
**Files read:** 18 source files + 2 design handoff files
**Pattern extraction date:** 2026-06-20
