# Phase 25: My Account - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 23 (11 net-new production files, 5 modified, 7 net-new tests)
**Analogs found:** 20/23 have an exact, role-match, or composed analog; 1/23 has no analog in the codebase (`account-dirty-context.tsx` — first React Context authored in this project); 2/23 (`auth.ts`, `auth-client.ts`) are flagged below as likely requiring **no** change at all, pending planner confirmation of a UI-SPEC/RESEARCH conflict

> **Cross-reference note:** 25-RESEARCH.md's Code Examples §C (`requestEmailChange`), §D (verify-email route), and §F (`deleteAccount`) already spell out the *target implementation* for the two hardest new files. This document's job is different and complementary: it shows the **codebase's own established conventions** those RESEARCH examples already follow (or should be checked against) — the auth+ownership preamble, the fire-and-forget email pattern, the query-module header comment, the GET-route-handler shape, the mock/test scaffolding. Treat RESEARCH.md §Code Examples as the logic spec and this file as the style/structure spec.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(protected)/account/page.tsx` | route (RSC page) | request-response | `src/app/(protected)/habitat/page.tsx` + `dashboard/page.tsx` | exact |
| `src/components/account-nav-button.tsx` | component | request-response (nav) | `src/components/daybreak/h-back.tsx` + `src/components/logout-button.tsx` (glyph technique) | exact |
| `src/components/daybreak/account-back.tsx` | component | event-driven | `src/components/daybreak/h-back.tsx` (visual only) + `src/components/dashboard-header.tsx` (client nav) | role-match |
| `src/components/account-dirty-context.tsx` | provider | event-driven | none in-project (only vendored `src/components/ui/form.tsx` uses `createContext`) | none |
| `src/components/account-details-card.tsx` | component | CRUD | `src/components/card-edit-dialog.tsx` (structure) + `src/app/(auth)/signup/page.tsx` (form wiring) | composed |
| `src/components/change-password-card.tsx` | component | CRUD | `src/app/(auth)/reset-password/page.tsx` (schema) + `src/app/(auth)/login/page.tsx` (error-merge) + `card-edit-dialog.tsx` (button shape) | composed |
| `src/components/account-logout-section.tsx` | component | event-driven | `src/components/logout-button.tsx` | exact |
| `src/components/delete-account-row.tsx` | component | CRUD | `src/components/card-edit-dialog.tsx` (`showDeleteConfirm` branch) | exact |
| `src/lib/account-actions.ts` | service (`"use server"`) | CRUD | `src/lib/deck-actions.ts` + `src/lib/auth.ts` (`sendResetPassword`) | exact |
| `src/lib/account-queries.ts` | service (query) | CRUD (read) | `src/lib/deck-queries.ts` (`getUserNativeLanguage`) + `src/lib/habitat-queries.ts` (header convention) | exact |
| `src/app/api/account/verify-email/route.ts` | route (Route Handler) | request-response + redirect | `src/app/api/debug/state/route.ts` (GET shape) + `src/proxy.ts` (redirect construction) | composed |
| `src/components/app-header.tsx` (modified) | component | event-driven | itself (in-place one-line swap) | exact |
| `src/lib/auth.ts` (UI-SPEC lists as modified) | config | — | itself — **RESEARCH.md concludes zero changes needed; see flag below** | n/a |
| `src/lib/auth-client.ts` (UI-SPEC lists as modified) | config | — | itself — **no shape change expected per UI-SPEC's own note** | n/a |
| `e2e/01-auth-signup-login.spec.ts` (modified) | test | event-driven | itself, lines 48/70/99 | exact |
| `e2e/10-mobile-responsive.spec.ts` (modified) | test | event-driven | itself, line 46 | exact |
| `src/lib/account-actions.test.ts` | test | CRUD | `src/lib/deck-actions.test.ts` | exact |
| `src/lib/account-queries.test.ts` | test | CRUD (read) | `src/lib/milestone-queries.test.ts` | role-match |
| `src/app/api/account/verify-email/route.test.ts` | test | request-response | `src/app/api/debug/__tests__/state.test.ts` | role-match |
| `src/components/account-details-card.test.tsx` | test | CRUD | `src/components/card-edit-dialog.test.tsx` | exact |
| `src/components/change-password-card.test.tsx` | test | CRUD | `src/components/card-edit-dialog.test.tsx` | exact |
| `src/components/delete-account-row.test.tsx` | test | CRUD | `src/components/card-edit-dialog.test.tsx` | exact |
| `e2e/25-my-account.spec.ts` (new) | test | event-driven | `e2e/01-auth-signup-login.spec.ts` + `e2e/helpers.ts` | exact |

---

## Pattern Assignments

### `src/app/(protected)/account/page.tsx` (route, request-response)

**Analog:** `src/app/(protected)/habitat/page.tsx` (simplest exact shell) + `src/app/(protected)/dashboard/page.tsx` (multi-query + container conventions)

**Session-fetch + validated-searchParams pattern** (`habitat/page.tsx` lines 11-33 — copy this shape verbatim, swap the integer-range check for a string allow-list):
```typescript
export default async function HabitatPage({
  searchParams,
}: {
  searchParams: Promise<{ celebrate?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  // Safety fallback — layout.tsx handles the redirect, but guard here in case
  if (!session) return null;

  const params = await searchParams;
  // T-24-03-CELEBRATE: validate ?celebrate is an integer in [1,9] (STRIDE Tampering).
  const rawCelebrate = params.celebrate ? Number(params.celebrate) : null;
  const celebratingLevel =
    rawCelebrate !== null && Number.isInteger(rawCelebrate) &&
    rawCelebrate >= 1 && rawCelebrate <= 9
      ? rawCelebrate
      : null;
  ...
}
```
For `?verified=success|expired`, mirror the exact same "never trust the raw query string, only accept known-literal values, fall back to a rendering-nothing null/undefined state" technique — an allow-list check (`params.verified === "success" ? "success" : params.verified === "expired" ? "expired" : null`), not a truthy check on the raw string.

**Multi-query + container pattern** (`dashboard/page.tsx` lines 199-217, 304-311):
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return null;
const [decks, nativeLang, habitatFacts] = await Promise.all([ /* parallel queries */ ]);
...
return (
  <div className="min-h-screen flex flex-col bg-background">
    <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-4xl mx-auto w-full">
```
UI-SPEC's own container spec (`max-w-xl` instead of `max-w-4xl`, everything else identical) is a direct, deliberate narrowing of this exact convention — reuse the responsive padding scale verbatim.

**Session-gate inheritance** — `src/app/(protected)/layout.tsx` (full file, 19 lines) already redirects unauthenticated requests to `/login` before `account/page.tsx` ever renders:
```typescript
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <>{children}</>;
}
```
No new auth code needed in `page.tsx` beyond the defensive `if (!session) return null;` (belt-and-suspenders, matches every existing protected page).

**Server-computed display values** — `dashboard/page.tsx` lines 30-34 (`LANGUAGE_LABELS`) is the exact dict `account/page.tsx` needs for "I speak: {native language}" — **not exported**, so expect a third inline copy (the codebase already tolerates this dict existing independently in `dashboard/page.tsx` AND `src/lib/deck-actions.ts` lines 15-19 — no shared-constants module exists for it; don't feel compelled to extract one just for this phase):
```typescript
const LANGUAGE_LABELS: Record<string, string> = { en: "English", fr: "French", es: "Spanish" };
```
For "Member since," UI-SPEC's own spec (`Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })`) is authoritative — **no existing display-date-formatting precedent exists in this codebase** (the only `Intl.DateTimeFormat` call anywhere, `src/lib/habitat-3d/clay-animation.ts:70`, computes London time-of-day for 3D ambient lighting, an unrelated domain — do not treat it as a pattern). Compute both server-side in `page.tsx` and pass pre-formatted strings down as props (matches `dashboard/page.tsx`'s D-15 "real-content root" principle — resolved data flows down, never re-fetched/re-formatted client-side).

**Testing:** No `page.tsx` unit test exists anywhere in this codebase for any protected route (`dashboard/page.tsx`, `habitat/page.tsx` both untested at the unit level) — page shells are exercised by e2e only. Consistent with RESEARCH.md's Wave 0 Gaps (no page-level test file listed).

---

### `src/components/account-nav-button.tsx` (component, request-response/nav)

**Analog:** `src/components/daybreak/h-back.tsx` (structural template) + `src/components/logout-button.tsx` (glyph-drawing technique + frame values to preserve)

**RSC-safe Link structure** (`h-back.tsx`, full 42-line file):
```typescript
import Link from "next/link";
export function HBack() {
  return (
    <Link href="/dashboard" data-testid="habitat-back-btn" aria-label="Back to Dashboard"
      style={{ width: 40, height: 40, borderRadius: "50%", ... }}>
      {/* chevron via CSS border-trick */}
    </Link>
  );
}
```
No `"use client"` — pure props-to-markup. `AccountNavButton` is the same shape: a bare `next/link` with `data-testid="account-nav-btn"`, `aria-label="My Account"`, `href="/account"`.

**Glyph-drawing technique to preserve verbatim** (`logout-button.tsx` lines 9-52, `LogoutGlyph`) — "filled flat geometric shape from divs, not literal `<svg>`":
```typescript
function LogoutGlyph() {
  const c = "#4A331C";
  return (
    <div style={{ position: "relative", width: 18, height: 15 }} aria-hidden="true">
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2.1, background: c, borderRadius: 2 }} />
      ...
    </div>
  );
}
```
`AccountGlyph` (per UI-SPEC's exact head/shoulders spec) must follow this identical div/absolute-position/border-radius technique — not switch to inline `<svg>`.

**Frame values to preserve verbatim** (`logout-button.tsx` lines 67-79) — same 36×36/border/radius button frame D-01 requires:
```typescript
style={{
  width: 36, height: 36, borderRadius: 10,
  border: "1.5px solid #EDDFC9", background: "#FFFFFF",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", boxSizing: "border-box", flex: "none",
}}
```
UI-SPEC's Small-Target Wrapper (44×44 transparent outer `<Link>` wrapping this exact 36×36 visual inner frame) is a new composition of this frame, not a modification of it — the inner frame's numbers must match `LogoutButton`'s today exactly.

---

### `src/components/daybreak/account-back.tsx` (component, event-driven)

**Analog:** `src/components/daybreak/h-back.tsx` (visual only) + `src/components/dashboard-header.tsx` (client-leaf `useRouter().push` pattern) + `src/components/card-edit-dialog.tsx` (Dialog composition for the intercept)

**Landmine (RESEARCH Pitfall 7):** `HBack` is deliberately RSC-safe (no `"use client"`, no state) — it **cannot** be copy-pasted verbatim. `AccountBack` needs `"use client"` and internal state to intercept navigation when `passwordDirty === true` (D-04). Copy `HBack`'s visual markup (frosted circle, chevron CSS border-trick) but restructure the root as a client component.

**Client-leaf navigation pattern** (`dashboard-header.tsx`, full 39-line file — the established "own the one non-serializable interactive piece" shape):
```typescript
"use client";
import { useRouter } from "next/navigation";
export function DashboardHeader({ ... }) {
  const router = useRouter();
  function handleDeckChange(id: string) {
    router.push(`/dashboard?deck=${id}`);
  }
  return <AppHeader ... onDeckChange={handleDeckChange} />;
}
```
`AccountBack` needs the same `useRouter()` + conditional `router.push("/dashboard")` — except gated behind `if (passwordDirty) { open dialog } else { router.push(...) }` instead of an unconditional `<Link>`.

**Dialog composition to reuse verbatim** (`card-edit-dialog.tsx` lines 149-162, plus `src/components/ui/dialog.tsx`) — UI-SPEC §5 explicitly says the discard-dialog's styling "matches `card-edit-dialog.tsx`'s `DialogContent` className verbatim":
```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className="max-w-md bg-[var(--background)] rounded-[22px] border border-[#F0E3CF]"
    showCloseButton={false}
  >
    <DialogHeader><DialogTitle>...</DialogTitle></DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

**No existing precedent** for the click-intercept-into-dialog-conditionally behavior itself (a `Link`-like control that sometimes becomes a dialog trigger based on external Context state) — this is a genuine composition of the three pieces above, not a copy of a single existing component. Flag for extra review attention during implementation.

---

### `src/components/account-dirty-context.tsx` (provider, event-driven)

**No close analog in the project.** Grep-confirmed: `createContext`/`useContext` appear in exactly one file in this codebase, `src/components/ui/form.tsx` — vendored shadcn boilerplate, not a project-authored pattern. Shown here as a **syntax-only** reference (naming/structure idiom already present in `node_modules`-adjacent code), not a domain analog:
```typescript
// src/components/ui/form.tsx lines 20-41 (shadcn-vendored, syntax reference only)
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);
const FormField = ({ ...props }) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  ...
};
```
UI-SPEC's own Design Decisions Log already resolves the scope question: "Minimal React Context, not global state/library — standard pattern for one cross-cutting concern between direct sibling client components." Build `AccountDirtyProvider`/`useAccountDirty` as a small, self-contained `{ passwordDirty, setPasswordDirty }` pair using the standard `createContext` + `Provider` + custom-hook-wrapping-`useContext` shape shown above — this is genuinely new to the project, budget extra review time.

---

### `src/components/account-details-card.tsx` (component, CRUD)

**Analog:** `src/components/card-edit-dialog.tsx` (structural: view/edit toggle, Save/Cancel, delete-adjacent pattern) + `src/app/(auth)/signup/page.tsx` (form-wiring: react-hook-form + zodResolver + server-error merge)

**View/edit toggle + Save/Cancel structure** (`card-edit-dialog.tsx` `EditForm`, lines 33-142 — the near-exact shape for D-06's "one Edit mode... Save/Cancel... one submit, one spinner"):
```typescript
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);

async function handleSave() {
  setSaving(true);
  setSaveError(null);
  try {
    await editCard(card.id, front, back);
    onClose();
  } catch {
    setSaveError("Couldn't save. Try again.");
  } finally {
    setSaving(false);
  }
}
```
```jsx
<TField label="Native word" value={front} onChange={...} disabled={saving} />
{saveError && <p className="text-sm text-destructive">{saveError}</p>}
<TBtn isPending={saving} onClick={handleSave}>Save changes</TBtn>
<Button variant="outline" className="w-full h-11" disabled={saving} onClick={onClose}>Discard changes</Button>
```
`AccountDetailsCard` follows this identical isPending/try-catch-finally/TBtn+outline-Button shape, but view↔edit is a card-content swap in-place (not a dialog open/close), and the form should be react-hook-form-driven (see below) rather than raw `useState` per field, since D-06 needs zod validation this simpler pattern doesn't have.

**react-hook-form + zodResolver + server-error-merge pattern** (`signup/page.tsx` lines 15-34, 70-97 — this is the exact wiring RESEARCH's Standard Stack calls "already the pattern in every auth page"):
```typescript
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
});
const { register, handleSubmit, formState: { errors, isSubmitted } } =
  useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });
```
```jsx
<TField
  label="Email"
  error={
    isSubmitted
      ? (errors.email?.message ?? (emailError ?? undefined))
      : undefined
  }
  {...register("email")}
/>
```
This exact `errors.field?.message ?? (serverError ?? undefined)` merge is **precisely** the mechanism D-06/§1b needs for "That email is already in use." — client zod errors and the server's `email-taken` response share one `TField`'s `error` prop, client errors taking precedence, server error only surfacing once `isSubmitted` and no client error exists.

**⚠ No precedent for Pitfall 9's two-mutation sequencing.** No existing form in this codebase sequences two independent async calls (`updateUser({name})` then `requestEmailChange(newEmail)`) under one `isPending`/one spinner — every existing form (signup, login, card-edit) calls exactly one mutation per submit. The individual pieces above (isPending pattern, TBtn, error-merge) are proven; the sequencing itself is new — see RESEARCH.md Pitfall 9 for the exact order (name first, then email, "Details updated" fade only when email did NOT change per Assumption A5).

**Landmine — `data-testid` on `TField`:** grep-confirmed, **no existing `<TField>` usage anywhere in `src/` passes `data-testid`** (every usage relies on the auto-derived `id` from `label.toLowerCase().replace(/\s+/g,"-")`, e.g. `card-edit-dialog.test.tsx` queries `document.getElementById("native-word")`, or an explicit `id=` override). UI-SPEC's contract requires `data-testid="account-name-field"` etc. `TField` spreads `...inputProps` onto the underlying `<input>` (`t-field.tsx` line 30), so a `data-testid` prop should pass through structurally — but this is untested territory in this codebase; confirm it renders as expected during implementation rather than assuming it silently works like `signup/page.tsx`'s proven `{...register(...)}` spread.

**Testing pattern** (`card-edit-dialog.test.tsx`, full 149-line file — the exact template RESEARCH's Pitfall 11/12 names):
```typescript
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/deck-actions", () => ({ editCard: vi.fn(async () => undefined), ... }));
...
it("clicking 'Save changes' calls editCard with the card's id and values", async () => {
  renderDialog();
  fireEvent.change(nativeInput, { target: { value: "Hi" } });
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
  await waitFor(() => {
    expect(vi.mocked(editCard)).toHaveBeenCalledWith("card-test-1", "Hi", "Bonjour");
  });
});
```
`account-details-card.test.tsx` should mock `@/lib/account-actions` the same way and drive the actual rendered `TField`/`TBtn` via `fireEvent`, not just call the handler function directly (Pitfall 12's "reducer-only tests stay green on dead UI" warning).

---

### `src/components/change-password-card.tsx` (component, CRUD)

**Analog:** `src/app/(auth)/reset-password/page.tsx` (zod `.refine` schema) + `src/app/(auth)/login/page.tsx` (server-error-to-field-mapping) + `src/components/card-edit-dialog.tsx` (button/isPending shape)

**Password-match zod schema** (`reset-password/page.tsx` lines 15-23 — UI-SPEC explicitly says the change-password schema "mirrors `reset-password/page.tsx`'s exact `.refine` pattern"):
```typescript
const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
```
Adapt directly: add `currentPassword: z.string().min(1, "Current password is required")` as a third field, rename `password`→`newPassword`, `confirmPassword`→`confirmNewPassword`.

**Server-error-to-specific-field mapping** (`login/page.tsx` lines 36-62, 78-96 — the exact pattern for D-08/D-09's "wrong current password → inline under Current password field"):
```typescript
async function onSubmit(values: LoginFormValues) {
  setIsPending(true);
  setAuthError(null);
  try {
    const { error } = await authClient.signIn.email({ ... });
    if (error) {
      setAuthError("Incorrect email or password.");
      return;
    }
    ...
  } finally {
    setIsPending(false);
  }
}
```
```jsx
<TField
  label="Password"
  error={isSubmitted ? (errors.password?.message ?? authError ?? undefined) : undefined}
  {...register("password")}
/>
```
For `change-password-card.tsx`, replace `authClient.signIn.email` with `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })` (RESEARCH Code Examples §E gives the exact `error.code === "INVALID_PASSWORD"` check), and target the error at the **Current password** field specifically (`setCurrentPasswordError("That password isn't right.")`) rather than a page-level banner — same mechanism, different field.

**isPending/Button shape** — reuse `card-edit-dialog.tsx`'s `TBtn isPending={...}` + `Button variant="outline" className="w-full h-11"` combination (see Account Details Card section above for the exact excerpt) for "Update password."

**No precedent for the accordion expand/collapse itself** — the `cl-accordion-*` CSS-only technique (grep-confirmed at `src/app/globals.css` lines 184-209, `@keyframes cl-accordion-open-kf`) is the CSS convention UI-SPEC's own `acct-accordion-*` keyframes are explicitly instructed to mirror (name NOT shared, per this file's "one uniquely-prefixed keyframe pair per feature" convention — also visible at `globals.css` line 111 `@keyframes hab-fall` and line 235 `@keyframes ac-progress-slide`, both following the identical named-keyframe + paired `prefers-reduced-motion` override shape). UI-SPEC §2a already supplies the exact CSS to add — treat it as authoritative, this codebase-convention note just confirms it matches the established idiom.

**Testing pattern:** same `card-edit-dialog.test.tsx` template as Account Details Card — render, `fireEvent.change` on the actual `TField`s, `fireEvent.click` on the actual "Update password" button, `waitFor` the mocked `authClient.changePassword` call args including `revokeOtherSessions: true`.

---

### `src/components/account-logout-section.tsx` (component, event-driven)

**Analog:** `src/components/logout-button.tsx` (exact — full 84-line file, reuse the handler verbatim)

**Logic to lift verbatim** (`logout-button.tsx` lines 54-60):
```typescript
export function LogoutButton() {
  const router = useRouter();
  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }
  return <button type="button" aria-label="Sign out" onClick={handleSignOut}>...</button>;
}
```
Only the **logic** (`handleSignOut`) and the **accessible name** (`"Sign out"` — UI-SPEC is explicit: keep this string everywhere, not "Log out," for e2e/aria continuity) transfer. The **presentation** changes from the 36px icon-only glyph frame to a full-width `Button variant="outline" h-11` inside a `Card`, per UI-SPEC §3 — restyle target matches `card-edit-dialog.tsx`'s outline-Button class shape (`className="w-full h-11"`).

**Cleanup note:** `src/components/logout-button.tsx` becomes dead code once `app-header.tsx` no longer renders it — UI-SPEC flags it for deletion this phase (Phase 17-02 precedent: remove confirmed-dead files after a `tsc --noEmit` call-site check), but only *after* its logic has been lifted into this new component and the header swap has landed.

---

### `src/components/delete-account-row.tsx` (component, CRUD)

**Analog:** `src/components/card-edit-dialog.tsx`'s `showDeleteConfirm` branch (exact — D-12's own text: "opens the same lightweight confirm pattern as card-delete")

**Trigger row** (`card-edit-dialog.tsx` lines 129-139):
```jsx
<div className="border-t pt-4 mt-2">
  <button
    type="button"
    onClick={() => setShowDeleteConfirm(true)}
    disabled={saving}
    className="flex items-center gap-1.5 text-sm text-destructive hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Trash2 className="size-4" />
    Delete card
  </button>
</div>
```
`delete-account-row.tsx`'s trigger reuses this exact `flex items-center gap-1.5 text-sm text-destructive hover:opacity-80` + `<Trash2 className="size-4" />` shape verbatim (no card wrapper, per D-12), plus a Small-Target Wrapper (`min-h-11 inline-flex items-center`) per UI-SPEC's Accessibility Contract.

**Confirm state** (`card-edit-dialog.tsx` lines 76-101 — the two-button confirm/keep shape):
```jsx
if (showDeleteConfirm) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-base font-medium">Delete this card?</p>
        <p className="text-sm text-muted-foreground mt-1">This can&apos;t be undone.</p>
      </div>
      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      <TBtn isPending={deleting} onClick={handleDelete}>Delete</TBtn>
      <Button variant="outline" className="w-full h-11" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
        Keep card
      </Button>
    </div>
  );
}
```
**Deliberate deviation (already resolved by UI-SPEC, not a planner decision):** swap `TBtn` (always amber) for shadcn `Button variant="destructive"` (soft red tint, `h-11` override mandatory) on the "Delete account" confirm button — the *flow/structure* above is reused 1:1, the *color* is upgraded per UI-SPEC's Color section rationale (materially higher stakes than card deletion). "Keep account" keeps the identical outline `Button` styling as "Keep card."

**Testing pattern:** same `card-edit-dialog.test.tsx` template — the three tests worth mirroring directly are "clicking the delete trigger shows the confirm," "clicking Keep returns without calling the action," "clicking Delete calls the action with the right args" (lines 96-149 of the test file).

---

### `src/lib/account-actions.ts` (service, CRUD, `"use server"`)

**Analog:** `src/lib/deck-actions.ts` (exact — auth+ownership preamble, mutate, `revalidatePath`) + `src/lib/auth.ts`'s `sendResetPassword` (fire-and-forget email)

**Auth preamble repeated verbatim across every exported function** (`deck-actions.ts` — this exact 3-line block appears in `createDeck`, `saveCard`, `editCard`, `deleteCard`, `addWordToCard`, `saveImageCards`, `removeWordFromDeck`; e.g. lines 99-102):
```typescript
export async function editCard(cardId: string, front: string, back: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;
  ...
}
```
`requestEmailChange` and `deleteAccount` must open with this identical preamble (matches RESEARCH Code Examples §C/§F exactly).

**Ownership/uniqueness-check-then-mutate 4-step shape** (`editCard`, lines 99-120 full function): load/check → verify → mutate → `revalidatePath`. `requestEmailChange`'s uniqueness check (`SELECT ... WHERE email = ...`) and `deleteAccount`'s hygiene delete follow this same load-check-mutate rhythm.

**No-transaction precedent, cited directly by RESEARCH's own Pitfall 3/Anti-Pattern** (`deck-actions.ts` `saveImageCards`, lines 231, 276):
```typescript
// Continues on per-card failure (Neon HTTP has no transactions — no rollback).
...
// Sequential inserts, continue-on-failure (D-12: Neon HTTP has no transactions)
```
This in-repo comment is the exact precedent RESEARCH cites for why `deleteAccount`'s single cascading `DELETE` needs no JS-level transaction wrapper — Postgres `ON DELETE CASCADE` (confirmed in `src/db/schema.ts` on every user-referencing FK, e.g. lines 47-50 `session.userId`, 56-58 `account.userId`, 85-87 `decks.userId`) does the atomic multi-table wipe server-side within one statement.

**Fire-and-forget email send** (`src/lib/auth.ts` lines 22-38, `sendResetPassword` — the exact pattern D-07's verification email must follow):
```typescript
sendResetPassword: async ({ user, url }) => {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  resend.emails
    .send({
      from: "LeoCards <noreply@leocards.com>",
      to: user.email,
      subject: "Reset your LeoCards password",
      text: `Reset your password: ${url}`,
    })
    .catch((err) => {
      console.error("[auth] Failed to send password reset email:", err);
    });
},
```
Inline `await import("resend")`, never `await`ed by the caller, `.catch()`-only error handling — copy this shape exactly for `requestEmailChange`'s send.

**`verification` table shape** (`src/db/schema.ts` lines 70-77 — the token store `requestEmailChange`/`deleteAccount`'s hygiene-delete both touch):
```typescript
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```
No `userId` FK (RESEARCH Pitfall 4) — confirmed directly from schema. `deleteAccount` must proactively `DELETE WHERE identifier = 'change-email:' || userId` as hygiene since cascade won't reach this table.

**Rate limiter, available but optional** (`src/lib/rate-limit.ts`, full 66-line file, already instantiated once in `src/app/api/study/complete/route.ts` lines 11-14):
```typescript
const studyCompleteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
...
const limit = studyCompleteLimiter.check(session.user.id);
if (!limit.allowed) {
  return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": ... } });
}
```
RESEARCH's Open Question #2 flags this as optional for `requestEmailChange`'s resend affordance — the utility and the exact instantiation-and-check shape already exist if the planner opts in; server actions return plain objects rather than `Response.json`, so the 429 branch would need adapting to `{ ok: false, error: "rate-limited" as const }` instead.

**Testing pattern** (`src/lib/deck-actions.test.ts`, full 509-line file — exact `vi.hoisted` mock shape):
```typescript
const { mockGetSession, selectChain, insertChain, updateChain, deleteChain } = vi.hoisted(() => {
  const selectChain = { from: vi.fn(), where: vi.fn(), innerJoin: vi.fn() };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  ...
  return { mockGetSession, selectChain, insertChain, updateChain, deleteChain };
});
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockGetSession } } }));
vi.mock("@/db", () => ({ db: { select: ..., insert: ..., update: ..., delete: ... } }));
```
Extend this exact shape to also mock `auth.api.signOut` (per RESEARCH Pitfall 11's note) for `deleteAccount`'s tests. `mockSession(userId)`/`mockNoSession()` helper functions (lines 79-85) and the `beforeEach(() => { vi.clearAllMocks(); /* re-wire chains */ })` re-wiring block (lines 87-115) transfer directly.

---

### `src/lib/account-queries.ts` (service, CRUD read, RSC-safe)

**Analog:** `src/lib/deck-queries.ts`'s `getUserNativeLanguage` (exact single-row-or-default shape) + `src/lib/habitat-queries.ts` (file-header convention)

**File-header convention to copy verbatim** (both `deck-queries.ts` and `habitat-queries.ts` open with this exact comment — the convention that distinguishes "queries" modules from "actions" modules in this codebase):
```typescript
// Server-only query functions — NOT "use server".
// These are called from Server Components or Route Handlers, not from the client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.
```
`account-queries.ts` must carry this same header — no internal auth check, `page.tsx` is responsible for having already verified the session before calling `getPendingEmailChange(session.user.id as UserId)`.

**Single-row-or-default lookup shape** (`deck-queries.ts` lines 68-74, `getUserNativeLanguage` — the closest possible structural match to `getPendingEmailChange`'s "return the pending row, or null if none" shape):
```typescript
export async function getUserNativeLanguage(userId: string): Promise<string> {
  const [row] = await db
    .select({ nativeLanguage: user.nativeLanguage })
    .from(user)
    .where(eq(user.id, userId as UserId));
  return row?.nativeLanguage ?? "en";
}
```
`getPendingEmailChange` follows the identical `const [row] = await db.select(...).from(verification).where(eq(verification.identifier, ...))` shape, returning `row ? { newEmail: ..., ... } : null` instead of a string default.

**Parallel-query precedent** if `getPendingEmailChange` ever needs to run alongside other page-load queries — `habitat-queries.ts`'s `getHabitatFacts` (lines 27-54) shows the `Promise.all([...])` pattern already used by `dashboard/page.tsx` for exactly this kind of "resolve several independent reads before first paint" composition.

**Testing pattern** — `deck-queries.ts` and `habitat-queries.ts` both have **no test file of their own** (grep-confirmed across `src/lib/**/*.test.ts`); the closest available query-module test is `src/lib/milestone-queries.test.ts` (180 lines):
```typescript
const { mockDb } = vi.hoisted(() => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin, where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return { mockDb: { insert: mockInsert, select: mockSelect, _internals: {...} } };
});
vi.mock("@/db", () => ({ db: mockDb }));
```
Use this `vi.hoisted` chain-mock shape for `account-queries.test.ts`, simplified since `getPendingEmailChange` needs only a `select().from().where()` chain (no `innerJoin`/`groupBy`).

---

### `src/app/api/account/verify-email/route.ts` (route, request-response + redirect)

**Analog:** `src/app/api/debug/state/route.ts` (GET shape: auth + query param + db scoping) + `src/proxy.ts` (redirect construction — the **only** existing precedent for building a redirect Response in this codebase)

**GET Route Handler shape** (`debug/state/route.ts`, full 129-line file — query-param extraction + scoped db read + JSON response):
```typescript
export async function GET(req: Request) {
  if (!cheatEnabled()) return Response.json({ error: "Not found" }, { status: 404 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!checkSecret(secret)) return Response.json({ error: "Forbidden" }, { status: 403 });
  ...
}
```
`verify-email/route.ts` follows the identical `new URL(request.url)` → `searchParams.get("token")` → guard-clause-per-failure-mode shape, but this route is **unauthenticated by design** (the click may land on a different device/session than the one that requested the change — RESEARCH's Architectural Responsibility Map is explicit: "no client-side involvement at all").

**⚠ No existing Route Handler in `src/app/api/**` performs a redirect** — grep-confirmed across the full `src/app/api/` tree: every existing handler (`study/complete`, `debug/state`, `debug/cheat`, `debug/time-shift`, `cards/[id]/pause`, `translate`, `extract`, `habitat`) returns `Response.json(...)`. The **only** `NextResponse.redirect` precedent in this codebase is middleware-level, `src/proxy.ts` (full file):
```typescript
import { type NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }
  ...
}
```
This confirms the `NextResponse.redirect(new URL(...))` API is the established idiom to reuse (RESEARCH Code Examples §D's `NextResponse.redirect(\`${base}/account?verified=success\`)` is consistent with this), but the *context* — a Route Handler, not middleware — is genuinely new for this codebase. Budget extra review attention here. Also note: `login/page.tsx` lines 51-58 shows this codebase's established open-redirect defense (reject absolute/protocol-relative `callbackUrl` values) — not directly needed here since RESEARCH's design hardcodes the redirect target relative to `request.nextUrl.origin` with no client-controlled redirect param, but worth citing as the security bar this route implicitly meets.

**Testing pattern** (`src/app/api/debug/__tests__/state.test.ts` — 430 lines; imports/mock-plumbing at lines 1-90, invocation shape at lines 220+):
```typescript
function makeChain(rows: unknown[]) {
  const chain = { from: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn().mockResolvedValue(rows) };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}
// per-test queue: each db.select() call pops the next chain factory
function setSelectResults(...rowSets: unknown[][]) { queue = rowSets.map((rows) => () => makeChain(rows)); }
...
function makeReq(params: Record<string,string>) {
  const url = new URL("http://localhost/api/debug/state");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}
const res = await GET(makeReq({ secret: VALID_SECRET }));
```
`verify-email/route.test.ts` should use this exact `new Request(url.toString())` construction + queue-based chain-mock shape to cover all 5 outcomes RESEARCH's Validation Architecture lists (success, expired, no-token, deleted-user, email-race) — asserting on the `Response`'s `status` and `headers.get("location")` (redirect target) rather than `await res.json()`.

---

### `src/components/app-header.tsx` (modified — component, event-driven)

**Analog:** itself — full 58-line file, one-line swap in the right cluster (lines 44-55):
```jsx
{/* Right cluster — deck picker + logout glyph */}
<div className="flex items-center" style={{ gap: 9 }}>
  {decks.length > 0 && (
    <DeckSwitcher decks={decks} activeDeckId={activeDeckId} onDeckChange={onDeckChange} nativeLang={nativeLang} />
  )}
  <LogoutButton />
</div>
```
Change `<LogoutButton />` → `<AccountNavButton />` and the `import { LogoutButton } from "@/components/logout-button"` line to `import { AccountNavButton } from "@/components/account-nav-button"`. UI-SPEC flags a follow-up visual check: verify the new button's 44px hit-area (vs. `LogoutButton`'s bare 36px) doesn't visually crowd `DeckSwitcher` in the `gap: 9` cluster — may need reducing to `gap: 6`–`7`.

---

### `src/lib/auth.ts` / `src/lib/auth-client.ts` (UI-SPEC lists as "Modified" — flag for planner)

**⚠ Documented conflict between UI-SPEC and RESEARCH — surfaced here, not resolved by this pattern map.** UI-SPEC's Component Inventory → Modified table says: *"Add `user.deleteUser.enabled: true` (D-14); add whatever `changeEmail`/`updateUser` server config the D-07 custom-verification flow needs."* RESEARCH.md's Summary, Pitfall 2, and Assumption A6 reach the opposite, more deeply source-verified conclusion: **zero changes to `src/lib/auth.ts`** are needed, because both `requestEmailChange` and `deleteAccount` are custom server actions in `account-actions.ts` that bypass better-auth's built-in `changeEmail`/`deleteUser` endpoints entirely (RESEARCH explicitly names the reasons: `deleteUser` without a password requires a session fresher than 24h, which conflicts with D-12's "no password re-entry" for a daily-habit app's realistically-old sessions; `changeEmail`'s anti-enumeration default makes the UI-SPEC's honest "already in use" error impossible to surface). RESEARCH's own Recommended Project Structure diagram marks `auth.ts` as `# UNCHANGED — see Summary`.

Current file for reference (`src/lib/auth.ts`, full 42 lines) — if the planner does decide any change is needed after all, this is the shape to extend (the `emailAndPassword.sendResetPassword` block is the existing pattern for adding a new email-sending hook):
```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  user: { additionalFields: { nativeLanguage: { type: "string", required: false, defaultValue: "en", input: true } } },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => { ... },
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [nextCookies()], // MUST be last plugin in array
});
```
`src/lib/auth-client.ts` (full 8-line file) already exposes `updateUser`, `changePassword`, `deleteUser`, `signOut` via `createAuthClient` with no plugin changes needed — UI-SPEC's own note agrees ("No shape change expected").

---

### `e2e/01-auth-signup-login.spec.ts` (modified — test, event-driven)

**Analog:** itself. Grep/RESEARCH-confirmed exact hit locations, lines 48, 70, 99 (all three identical):
```typescript
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL(/\/login/, { timeout: 10_000 });
```
Fix: insert a navigation step before each, e.g.:
```typescript
await page.getByTestId("account-nav-btn").click();
await page.waitForURL(/\/account/, { timeout: 10_000 });
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL(/\/login/, { timeout: 10_000 });
```
The accessible name `"Sign out"` is unchanged (now on `account-logout-btn` inside the section) — only a navigation hop is inserted, matching UI-SPEC's own retarget table exactly.

---

### `e2e/10-mobile-responsive.spec.ts` (modified — test, event-driven)

**Analog:** itself. Line 46:
```typescript
await expect(page.getByText("LeoCards")).toBeVisible();
await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
```
Fix: retarget the second assertion to `page.getByTestId("account-nav-btn")` visibility instead — the test's actual intent ("dashboard header doesn't overflow on mobile") is unaffected by which specific header control is checked.

---

### `e2e/25-my-account.spec.ts` (new — test, event-driven)

**Analog:** `e2e/01-auth-signup-login.spec.ts` (spec structure) + `e2e/helpers.ts` (setup helpers, full 300-line file)

**Setup helper to reuse verbatim:**
```typescript
import { signUpWithDeck, waitForCompilation } from "./helpers";
// in test body:
const { email } = await signUpWithDeck(page); // throwaway *test.local user, French deck
```
`testEmail()` (lines 6-8, `qa+{ts}+{rand}@test.local`) is the pattern for generating a second unique email to test D-07's uniqueness rejection ("That email is already in use.") — sign up two users, attempt to change the first's email to the second's.

**Network-settle helper, needed for any pause/mutate-then-assert flow** — `clickAndWaitForNetworkSettle` (lines 236-266) and `waitForCompilation` (lines 14-44) are the established anti-flake idioms in this suite (dev-mode Turbopack compilation + fire-and-forget `fetch()`/`router.refresh()` calls can outlive a bare `.click()`) — apply the same discipline to the account mutations (Save details, Update password, Delete account) since they share the same "click triggers an async server action, UI updates on a later tick" shape as the pre-existing pause/unpause flow this helper was built for.

**DB-read seam for the email-verify round-trip** (RESEARCH's Validation Architecture) — this spec needs a new helper (not yet in `e2e/helpers.ts`) to read the pending `verification` row's token directly (no live inbox available), then `page.goto('/api/account/verify-email?token=...')` to simulate the click. No existing e2e helper does a direct DB read today — this is new, follow the `debug/state` route's existing "QA-gated read" pattern (`GET /api/debug/state?secret=...`) as the precedent for a test-only, secret-gated endpoint if direct DB access from the e2e runner proves impractical (RESEARCH's own fallback suggestion).

---

## Shared Patterns

### Server Action auth+ownership preamble
**Source:** `src/lib/deck-actions.ts` (every exported function, e.g. lines 99-102)
**Apply to:** `requestEmailChange`, `deleteAccount` in `account-actions.ts`
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) throw new Error("Unauthorized");
const userId = session.user.id as UserId;
```

### Query-module "no use server" header comment
**Source:** `src/lib/deck-queries.ts` lines 1-3, `src/lib/habitat-queries.ts` lines 1-3 (identical in both)
**Apply to:** `account-queries.ts`
```typescript
// Server-only query functions — NOT "use server".
// These are called from Server Components or Route Handlers, not from the client via server actions.
// Each caller is responsible for verifying the userId comes from a valid session.
```

### Fire-and-forget Resend email send
**Source:** `src/lib/auth.ts` lines 24-38 (`sendResetPassword`)
**Apply to:** `requestEmailChange` in `account-actions.ts`
```typescript
const { Resend } = await import("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails.send({ from: "LeoCards <noreply@leocards.com>", to: newEmail, subject: "...", text: "..." })
  .catch((err) => { console.error("[account] ...:", err); });
```

### react-hook-form + zodResolver + TField error-merge
**Source:** `src/app/(auth)/signup/page.tsx`, `login/page.tsx`, `reset-password/page.tsx` (all three identical shape)
**Apply to:** `account-details-card.tsx`, `change-password-card.tsx`
```typescript
const { register, handleSubmit, formState: { errors, isSubmitted } } = useForm<T>({ resolver: zodResolver(schema) });
...
<TField error={isSubmitted ? (errors.field?.message ?? (serverError ?? undefined)) : undefined} {...register("field")} />
```

### isPending / TBtn / outline-Button mutation shape
**Source:** `src/components/card-edit-dialog.tsx` (both the edit and delete-confirm branches)
**Apply to:** `account-details-card.tsx`, `change-password-card.tsx`, `delete-account-row.tsx`
```typescript
const [pending, setPending] = useState(false);
const [error, setError] = useState<string | null>(null);
async function handleAction() {
  setPending(true); setError(null);
  try { await mutation(...); /* success path */ }
  catch { setError("Couldn't <verb>. Try again."); }
  finally { setPending(false); }
}
```
```jsx
<TBtn isPending={pending} onClick={handleAction}>...</TBtn>
<Button variant="outline" className="w-full h-11" disabled={pending} onClick={...}>...</Button>
```

### Dialog styling override
**Source:** `src/components/card-edit-dialog.tsx` lines 151-153
**Apply to:** `account-back.tsx`'s discard-changes dialog (D-04)
```typescript
<DialogContent className="max-w-md bg-[var(--background)] rounded-[22px] border border-[#F0E3CF]" showCloseButton={false}>
```

### Session-gate inheritance (no code needed)
**Source:** `src/app/(protected)/layout.tsx`
**Apply to:** `/account` automatically, since the route lives under `(protected)/` — no auth code required in `page.tsx` beyond the defensive `if (!session) return null;`.

### jsdom pragma + rendered-component test template
**Source:** `src/components/card-edit-dialog.test.tsx` (header + render/fireEvent/waitFor shape)
**Apply to:** `account-details-card.test.tsx`, `change-password-card.test.tsx`, `delete-account-row.test.tsx`
```typescript
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/account-actions", () => ({ requestEmailChange: vi.fn(async () => ({ ok: true })), deleteAccount: vi.fn(async () => undefined) }));
```

### vi.hoisted server-action / query-module mock scaffolding
**Source:** `src/lib/deck-actions.test.ts` (mutation shape), `src/lib/milestone-queries.test.ts` (read-only shape)
**Apply to:** `account-actions.test.ts`, `account-queries.test.ts`
```typescript
const { mockGetSession, selectChain, ... } = vi.hoisted(() => { /* self-referencing chain mocks */ });
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockGetSession } } }));
vi.mock("@/db", () => ({ db: { select: ..., insert: ..., update: ..., delete: ... } }));
```

---

## No Analog Found

Files/behaviors with no close match in the codebase (planner should treat RESEARCH.md's Code Examples and UI-SPEC's explicit contracts as authoritative, using the syntax-only references noted above only for structural idiom):

| File / Behavior | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/account-dirty-context.tsx` | provider | event-driven | No project-authored `createContext`/`useContext` exists anywhere in `src/` — only the vendored `src/components/ui/form.tsx` (shadcn boilerplate) uses this API. First genuine React Context in the codebase. |
| Two-mutation sequencing under one spinner (inside `account-details-card.tsx`) | — | transform | No existing form calls two independent async mutations (`updateUser` then `requestEmailChange`) under a single `isPending`/submit — every existing form (signup, login, card-edit) is single-mutation-per-submit. RESEARCH Pitfall 9 specifies the required order. |
| Redirect-emitting Route Handler (inside `verify-email/route.ts`) | route | request-response | No existing Route Handler in `src/app/api/**` returns `NextResponse.redirect(...)` — every existing one returns `Response.json(...)`. The only redirect precedent (`src/proxy.ts`) is middleware, not a Route Handler. |
| Click-intercept-into-conditional-dialog (inside `account-back.tsx`) | component | event-driven | No existing component is sometimes a plain navigation `<Link>`-equivalent and sometimes a dialog trigger based on external Context state — composed from `HBack`'s visuals + `card-edit-dialog.tsx`'s Dialog usage, but no single existing component does this trick. |
| `Intl.DateTimeFormat` for user-facing display date (inside `page.tsx`, "Member since") | — | transform | The only existing `Intl.DateTimeFormat` call (`src/lib/habitat-3d/clay-animation.ts:70`) computes London time-of-day for 3D ambient lighting — an unrelated domain, not a display-formatting precedent. UI-SPEC's own spec is authoritative here. |

---

## Metadata

**Analog search scope:** `src/app/(protected)/**`, `src/app/(auth)/**`, `src/app/api/**`, `src/components/**`, `src/components/daybreak/**`, `src/components/ui/**`, `src/lib/**`, `src/db/**`, `e2e/**`, `src/proxy.ts`, `src/env.ts`
**Files scanned:** 41 (33 fully read as small files ≤2000 lines; 8 partially/targeted-read via grep-then-offset for large or already-established-shape files, e.g. `deck-actions.test.ts` mock preamble, `debug/state/route.test.ts` mock plumbing + invocation lines only)
**Pattern extraction date:** 2026-07-19
