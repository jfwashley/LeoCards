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
// factories can close over them safely (mirrors account-logout-section.test.tsx
// / account-details-card.test.tsx conventions, 25-PATTERNS.md).
const { mockPush, mockDeleteAccount } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockDeleteAccount: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock("@/lib/account-actions", () => ({
  deleteAccount: mockDeleteAccount,
}));

// Import after mocks are set up.
import { DeleteAccountRow } from "@/components/delete-account-row";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DeleteAccountRow", () => {
  it("renders the quiet trigger row and clicking it shows the two-step confirm", () => {
    render(<DeleteAccountRow />);

    const trigger = screen.getByTestId("account-delete-row");
    expect(trigger).toBeTruthy();
    expect(screen.getByText("Delete account")).toBeTruthy();
    expect(screen.queryByTestId("account-delete-confirm")).toBeNull();

    fireEvent.click(trigger);

    expect(screen.getByTestId("account-delete-confirm")).toBeTruthy();
    expect(screen.getByText("Delete your account?")).toBeTruthy();
    expect(
      screen.getByText(/decks, words, and habitat progress/),
    ).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("clicking 'Keep account' returns to the trigger without calling deleteAccount", () => {
    render(<DeleteAccountRow />);

    fireEvent.click(screen.getByTestId("account-delete-row"));
    expect(screen.getByTestId("account-delete-confirm")).toBeTruthy();

    fireEvent.click(screen.getByTestId("account-delete-keep-btn"));

    expect(screen.queryByTestId("account-delete-confirm")).toBeNull();
    expect(screen.getByTestId("account-delete-row")).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("clicking 'Delete account' calls deleteAccount then router.push('/login')", async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    render(<DeleteAccountRow />);

    fireEvent.click(screen.getByTestId("account-delete-row"));
    fireEvent.click(screen.getByTestId("account-delete-confirm-btn"));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows an inline error and re-enables the buttons when deleteAccount throws", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("boom"));
    render(<DeleteAccountRow />);

    fireEvent.click(screen.getByTestId("account-delete-row"));
    const confirmBtn = screen.getByTestId(
      "account-delete-confirm-btn",
    ) as HTMLButtonElement;
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't delete your account. Try again."),
      ).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(confirmBtn.disabled).toBe(false);
  });
});
