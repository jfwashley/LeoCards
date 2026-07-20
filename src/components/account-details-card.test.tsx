// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.hoisted lifts these declarations before vi.mock hoisting so the
// factories can close over them safely (mirrors signup-payload.test.tsx /
// change-password-card.test.tsx conventions, 25-PATTERNS.md).
const { mockRefresh, mockUpdateUser, mockRequestEmailChange } = vi.hoisted(
  () => ({
    mockRefresh: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockRequestEmailChange: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { updateUser: mockUpdateUser },
}));

vi.mock("@/lib/account-actions", () => ({
  requestEmailChange: mockRequestEmailChange,
}));

// Import after mocks are set up.
import { AccountDetailsCard } from "@/components/account-details-card";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const DEFAULT_PROPS = {
  name: "Josh Ashley",
  email: "josh@example.com",
  memberSince: "July 2026",
  nativeLanguageLabel: "English",
  pendingEmail: null as string | null,
};

function renderCard(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  render(<AccountDetailsCard {...DEFAULT_PROPS} {...overrides} />);
}

function enterEdit() {
  fireEvent.click(screen.getByTestId("account-edit-btn"));
}

function submit() {
  fireEvent.click(screen.getByTestId("account-save-btn"));
}

// -----------------------------------------------------------------------
// View mode
// -----------------------------------------------------------------------
describe("AccountDetailsCard — view mode", () => {
  it("renders the card and Name/Email/Member since/I speak as static rows, no inputs", () => {
    renderCard();

    expect(screen.getByTestId("account-details-card")).toBeTruthy();
    expect(screen.getByText("Josh Ashley")).toBeTruthy();
    expect(screen.getByText("josh@example.com")).toBeTruthy();
    expect(screen.getByText("July 2026")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.queryByTestId("account-name-field")).toBeNull();
    expect(screen.queryByTestId("account-email-field")).toBeNull();
  });

  it("does not render the pending banner when pendingEmail is null", () => {
    renderCard();
    expect(screen.queryByTestId("account-email-pending-banner")).toBeNull();
  });
});

// -----------------------------------------------------------------------
// Edit mode
// -----------------------------------------------------------------------
describe("AccountDetailsCard — edit mode", () => {
  it("clicking Edit reveals Name/Email TFields pre-filled with current values, plus static Member since / I speak and Save/Cancel", () => {
    renderCard();
    enterEdit();

    const nameInput = screen.getByTestId(
      "account-name-field",
    ) as HTMLInputElement;
    const emailInput = screen.getByTestId(
      "account-email-field",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Josh Ashley");
    expect(emailInput.value).toBe("josh@example.com");
    expect(
      screen.getByText(
        "Changing this sends a confirmation link to the new address.",
      ),
    ).toBeTruthy();

    // Member since / I speak stay static, non-editable, in edit mode too.
    expect(screen.getByText("July 2026")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();

    expect(screen.getByTestId("account-save-btn").textContent).toBe(
      "Save changes",
    );
    expect(screen.getByTestId("account-cancel-btn")).toBeTruthy();

    // Edit link itself is not shown while already editing.
    expect(screen.queryByTestId("account-edit-btn")).toBeNull();
  });

  it("clicking Discard changes returns to view mode without calling any mutation", () => {
    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-name-field"), {
      target: { value: "Changed Name" },
    });
    fireEvent.click(screen.getByTestId("account-cancel-btn"));

    expect(screen.queryByTestId("account-name-field")).toBeNull();
    expect(screen.getByText("Josh Ashley")).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRequestEmailChange).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Name-only save (CR-01: assert the mock received the NEW typed value)
// -----------------------------------------------------------------------
describe("AccountDetailsCard — name-only save", () => {
  it("calls updateUser with the NEW typed name, does NOT call requestEmailChange, and shows 'Details updated'", async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: { status: true },
      error: null,
    });

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-name-field"), {
      target: { value: "Joshua Ashley" },
    });
    submit();

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ name: "Joshua Ashley" });
    });
    expect(mockRequestEmailChange).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("Details updated")).toBeTruthy();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows the generic error and stays in edit mode when updateUser fails", async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: null,
      error: { code: "SOME_ERROR", message: "boom" },
    });

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-name-field"), {
      target: { value: "Joshua Ashley" },
    });
    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't save your changes. Try again."),
      ).toBeTruthy();
    });
    // Still in edit mode — the field is still present.
    expect(screen.getByTestId("account-name-field")).toBeTruthy();
    expect(mockRequestEmailChange).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Email-change save (A5: pending banner alone, no "Details updated")
// -----------------------------------------------------------------------
describe("AccountDetailsCard — email-change save", () => {
  it("calls requestEmailChange with the NEW email, does NOT show 'Details updated' (A5), and calls router.refresh", async () => {
    mockRequestEmailChange.mockResolvedValueOnce({ ok: true });

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-email-field"), {
      target: { value: "new@example.com" },
    });
    submit();

    await waitFor(() => {
      expect(mockRequestEmailChange).toHaveBeenCalledWith("new@example.com");
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(screen.queryByText("Details updated")).toBeNull();
    // Returned to view mode; the Email row still shows the OLD/prop email.
    expect(screen.getByText("josh@example.com")).toBeTruthy();
  });

  it("sequences updateUser BEFORE requestEmailChange when both name and email changed", async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: { status: true },
      error: null,
    });
    mockRequestEmailChange.mockResolvedValueOnce({ ok: true });

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-name-field"), {
      target: { value: "Joshua Ashley" },
    });
    fireEvent.change(screen.getByTestId("account-email-field"), {
      target: { value: "new@example.com" },
    });
    submit();

    await waitFor(() => {
      expect(mockRequestEmailChange).toHaveBeenCalledWith("new@example.com");
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ name: "Joshua Ashley" });

    const updateUserOrder = mockUpdateUser.mock.invocationCallOrder[0];
    const requestEmailChangeOrder =
      mockRequestEmailChange.mock.invocationCallOrder[0];
    // noUncheckedIndexedAccess narrowing — both mocks were asserted called
    // above, so these indices must be defined; guard instead of `!` (biome).
    if (
      updateUserOrder === undefined ||
      requestEmailChangeOrder === undefined
    ) {
      throw new Error(
        "Expected both updateUser and requestEmailChange to have been called",
      );
    }
    expect(updateUserOrder).toBeLessThan(requestEmailChangeOrder);

    // Combined save also does NOT show "Details updated" (A5).
    expect(screen.queryByText("Details updated")).toBeNull();
  });
});

// -----------------------------------------------------------------------
// Partial-mutation success (WR-02)
// -----------------------------------------------------------------------
describe("AccountDetailsCard — partial success, name succeeds/email fails (WR-02)", () => {
  it("commits the name update via router.refresh even though the follow-up email change fails and the handler returns early", async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: { status: true },
      error: null,
    });
    mockRequestEmailChange.mockResolvedValueOnce({
      ok: false,
      error: "email-taken",
    });

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-name-field"), {
      target: { value: "Joshua Ashley" },
    });
    fireEvent.change(screen.getByTestId("account-email-field"), {
      target: { value: "taken@example.com" },
    });
    submit();

    await waitFor(() => {
      expect(screen.getByText("That email is already in use.")).toBeTruthy();
    });
    // The name mutation already succeeded server-side — router.refresh()
    // must fire for it BEFORE the email step's early return, so a
    // subsequent "Discard changes" reset() never re-shows the stale
    // pre-edit name.
    expect(mockUpdateUser).toHaveBeenCalledWith({ name: "Joshua Ashley" });
    expect(mockRefresh).toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// email-taken inline error
// -----------------------------------------------------------------------
describe("AccountDetailsCard — email-taken error", () => {
  it("shows the inline 'That email is already in use.' error under Email", async () => {
    mockRequestEmailChange.mockResolvedValueOnce({
      ok: false,
      error: "email-taken",
    });

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-email-field"), {
      target: { value: "taken@example.com" },
    });
    submit();

    await waitFor(() => {
      expect(screen.getByText("That email is already in use.")).toBeTruthy();
    });
    // Still in edit mode, no false "Details updated".
    expect(screen.getByTestId("account-email-field")).toBeTruthy();
    expect(screen.queryByText("Details updated")).toBeNull();
  });
});

// -----------------------------------------------------------------------
// Rejected promise (WR-01)
// -----------------------------------------------------------------------
describe("AccountDetailsCard — rejected promise (WR-01)", () => {
  it("shows the generic error and re-enables Save when requestEmailChange REJECTS (e.g. session expired mid-edit)", async () => {
    mockRequestEmailChange.mockRejectedValueOnce(new Error("Unauthorized"));

    renderCard();
    enterEdit();

    fireEvent.change(screen.getByTestId("account-email-field"), {
      target: { value: "new@example.com" },
    });
    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't save your changes. Try again."),
      ).toBeTruthy();
    });
    // isPending resets — Save becomes clickable again, not silently
    // re-enabled with zero feedback (the pre-fix behavior).
    expect(
      (screen.getByTestId("account-save-btn") as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Pending email banner (server-persisted prop, not local state)
// -----------------------------------------------------------------------
describe("AccountDetailsCard — pending email banner", () => {
  it("renders the pending banner showing the newEmail when the pendingEmail prop is set", () => {
    renderCard({ pendingEmail: "pending@example.com" });

    const banner = screen.getByTestId("account-email-pending-banner");
    expect(banner.textContent).toContain(
      "Verification sent to pending@example.com",
    );
    expect(screen.getByTestId("account-email-resend-btn")).toBeTruthy();
  });

  it("clicking Resend email re-invokes requestEmailChange with the pending address", async () => {
    mockRequestEmailChange.mockResolvedValueOnce({ ok: true });
    renderCard({ pendingEmail: "pending@example.com" });

    fireEvent.click(screen.getByTestId("account-email-resend-btn"));

    await waitFor(() => {
      expect(mockRequestEmailChange).toHaveBeenCalledWith(
        "pending@example.com",
      );
    });
  });

  // WR-03 — the {ok, error} result was previously discarded entirely; a
  // failed resend re-enabled the button and refreshed as if nothing
  // happened. Exercised here from VIEW mode (not editing) deliberately —
  // the banner/Resend button render regardless of editing state, and an
  // error surfaced only inside the edit-mode form would stay invisible for
  // this, the common, path.
  it("shows an inline error near the banner (visible in view mode) when the resend fails, and does not call router.refresh", async () => {
    mockRequestEmailChange.mockResolvedValueOnce({
      ok: false,
      error: "rate-limited",
    });
    renderCard({ pendingEmail: "pending@example.com" });
    expect(screen.queryByTestId("account-name-field")).toBeNull(); // view mode

    fireEvent.click(screen.getByTestId("account-email-resend-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't resend the email. Try again in a bit."),
      ).toBeTruthy();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
