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
// factories can close over them safely (mirrors account-details-card.test.tsx
// / signup-payload.test.tsx conventions, 25-PATTERNS.md).
const { mockPush, mockSignOut } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: mockSignOut },
}));

// Import after mocks are set up.
import { AccountLogoutSection } from "@/components/account-logout-section";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("AccountLogoutSection", () => {
  it("renders the Sign out card with the heading, description, and a button named 'Sign out'", () => {
    render(<AccountLogoutSection />);

    expect(screen.getByTestId("account-logout-card")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Sign out" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Sign out of LeoCards on this device."),
    ).toBeTruthy();

    const btn = screen.getByTestId("account-logout-btn");
    expect(btn).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBe(btn);
  });

  it("clicking the button calls authClient.signOut then router.push('/login')", async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<AccountLogoutSection />);

    fireEvent.click(screen.getByTestId("account-logout-btn"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("disables the button while signOut is in flight, then re-enables after navigation", async () => {
    let resolveSignOut: (() => void) | null = null;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    render(<AccountLogoutSection />);

    const btn = screen.getByTestId("account-logout-btn") as HTMLButtonElement;
    fireEvent.click(btn);

    expect(btn.disabled).toBe(true);

    if (resolveSignOut === null) {
      throw new Error("Expected signOut to have been called");
    }
    resolveSignOut();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
