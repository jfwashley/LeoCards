// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AccountDirtyProvider,
  useAccountDirty,
} from "@/components/account-dirty-context";
import { ChangePasswordCard } from "@/components/change-password-card";

// Mock @/lib/auth-client so we control authClient.changePassword behavior
// (Pitfall 11: mock shape for a client-module dependency).
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.mocked(authClient.changePassword).mockReset();
});

// Import after mock so we can inspect/configure calls
import { authClient } from "@/lib/auth-client";

type ChangePasswordResult = Awaited<
  ReturnType<typeof authClient.changePassword>
>;

// Probe — reads AccountDirtyProvider's boolean directly via the real hook
// (D-04: only ever a boolean crosses this Context, never the typed text).
function DirtyProbe() {
  const { passwordDirty } = useAccountDirty();
  return <div data-testid="dirty-probe">{String(passwordDirty)}</div>;
}

function renderCard() {
  render(
    <AccountDirtyProvider>
      <ChangePasswordCard />
      <DirtyProbe />
    </AccountDirtyProvider>,
  );
}

function expandPanel() {
  fireEvent.click(screen.getByTestId("account-password-row"));
}

function fillFields(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByTestId("account-password-current-field"), {
    target: { value: current },
  });
  fireEvent.change(screen.getByTestId("account-password-new-field"), {
    target: { value: next },
  });
  fireEvent.change(screen.getByTestId("account-password-confirm-field"), {
    target: { value: confirm },
  });
}

function submit() {
  fireEvent.click(screen.getByTestId("account-password-save-btn"));
}

// -----------------------------------------------------------------------
// Collapsed / expanded accordion
// -----------------------------------------------------------------------
describe("ChangePasswordCard — collapsed/expanded accordion", () => {
  it("renders collapsed by default with no fields present", () => {
    renderCard();

    const row = screen.getByTestId("account-password-row");
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(row.getAttribute("aria-controls")).toBe("change-password-panel");
    expect(screen.getByText("Change password")).toBeTruthy();
    expect(screen.queryByTestId("account-password-current-field")).toBeNull();
  });

  it("expands to reveal the three fields, the security caption, and Update password — with no Forgot-password link (D-11)", () => {
    renderCard();

    expandPanel();

    expect(
      screen.getByTestId("account-password-row").getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByTestId("account-password-current-field")).toBeTruthy();
    expect(screen.getByTestId("account-password-new-field")).toBeTruthy();
    expect(screen.getByTestId("account-password-confirm-field")).toBeTruthy();
    expect(
      screen.getByText(
        "For your security, all other signed-in devices will be logged out.",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("account-password-save-btn").textContent).toBe(
      "Update password",
    );
    expect(screen.queryByText(/forgot/i)).toBeNull();
  });

  it("collapses again when the row is clicked a second time", () => {
    renderCard();

    expandPanel();
    expect(
      screen.getByTestId("account-password-row").getAttribute("aria-expanded"),
    ).toBe("true");

    expandPanel();
    expect(
      screen.getByTestId("account-password-row").getAttribute("aria-expanded"),
    ).toBe("false");
  });
});

// -----------------------------------------------------------------------
// Dirty-boolean wiring (D-04)
// -----------------------------------------------------------------------
describe("ChangePasswordCard — passwordDirty wiring", () => {
  it("sets passwordDirty=true via useAccountDirty when typing, and false once all fields are cleared", () => {
    renderCard();
    expandPanel();

    expect(screen.getByTestId("dirty-probe").textContent).toBe("false");

    fireEvent.change(screen.getByTestId("account-password-current-field"), {
      target: { value: "oldpass123" },
    });
    expect(screen.getByTestId("dirty-probe").textContent).toBe("true");

    fireEvent.change(screen.getByTestId("account-password-current-field"), {
      target: { value: "" },
    });
    expect(screen.getByTestId("dirty-probe").textContent).toBe("false");
  });
});

// -----------------------------------------------------------------------
// Client-side validation (only after submit)
// -----------------------------------------------------------------------
describe("ChangePasswordCard — validation", () => {
  it("shows an inline error when the new password is under 8 characters, only after submit", async () => {
    renderCard();
    expandPanel();
    fillFields("oldpass123", "short", "short");

    expect(
      screen.queryByText("Password must be at least 8 characters"),
    ).toBeNull();

    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeTruthy();
    });
    expect(vi.mocked(authClient.changePassword)).not.toHaveBeenCalled();
  });

  it("shows 'Passwords do not match' under Confirm new password when new/confirm differ, only after submit", async () => {
    renderCard();
    expandPanel();
    fillFields("oldpass123", "longenough1", "different1");

    expect(screen.queryByText("Passwords do not match")).toBeNull();

    submit();

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeTruthy();
    });
    expect(vi.mocked(authClient.changePassword)).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Submit success (D-09 revokeOtherSessions, D-10 success collapse+fade)
// -----------------------------------------------------------------------
describe("ChangePasswordCard — submit success", () => {
  it("calls authClient.changePassword with the TYPED values + revokeOtherSessions:true, then clears fields, collapses, shows success, and resets passwordDirty", async () => {
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: { status: true },
      error: null,
    } as unknown as ChangePasswordResult);

    renderCard();
    expandPanel();
    fillFields("myOldPass1", "myNewPass1", "myNewPass1");

    submit();

    await waitFor(() => {
      expect(vi.mocked(authClient.changePassword)).toHaveBeenCalledWith({
        currentPassword: "myOldPass1",
        newPassword: "myNewPass1",
        revokeOtherSessions: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("account-password-success")).toBeTruthy();
    });
    expect(screen.getByText("Password updated")).toBeTruthy();

    expect(
      screen.getByTestId("account-password-row").getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      (screen.getByTestId("account-password-current-field") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByTestId("account-password-new-field") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByTestId("account-password-confirm-field") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(screen.getByTestId("dirty-probe").textContent).toBe("false");
  });
});

// -----------------------------------------------------------------------
// Submit errors (server-side)
// -----------------------------------------------------------------------
describe("ChangePasswordCard — submit errors", () => {
  it("maps error.code === 'INVALID_PASSWORD' to an inline error under Current password — never error.message verbatim", async () => {
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: null,
      error: {
        code: "INVALID_PASSWORD",
        message: "Invalid password",
        status: 400,
        statusText: "Bad Request",
      },
    } as unknown as ChangePasswordResult);

    renderCard();
    expandPanel();
    fillFields("wrongpass1", "myNewPass1", "myNewPass1");

    submit();

    await waitFor(() => {
      expect(screen.getByText("That password isn't right.")).toBeTruthy();
    });
    expect(screen.queryByText("Invalid password")).toBeNull();
  });

  it("shows the generic error for any other failure code", async () => {
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: null,
      error: {
        code: "SOME_OTHER_CODE",
        message: "Something else broke",
        status: 500,
        statusText: "Internal Server Error",
      },
    } as unknown as ChangePasswordResult);

    renderCard();
    expandPanel();
    fillFields("oldpass123", "myNewPass1", "myNewPass1");

    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't update your password. Try again."),
      ).toBeTruthy();
    });
    expect(screen.queryByText("Something else broke")).toBeNull();
  });

  // WR-01 — authClient.changePassword can REJECT (not just resolve with
  // {error}); without a catch, the button silently re-enabled with zero
  // feedback and passwordDirty stayed stuck true even though nothing saved.
  it("shows the generic error and re-enables Update password when changePassword REJECTS", async () => {
    vi.mocked(authClient.changePassword).mockRejectedValueOnce(
      new Error("network down"),
    );

    renderCard();
    expandPanel();
    fillFields("oldpass123", "myNewPass1", "myNewPass1");

    submit();

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't update your password. Try again."),
      ).toBeTruthy();
    });
    expect(
      (screen.getByTestId("account-password-save-btn") as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
