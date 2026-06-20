// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.hoisted lifts these declarations before vi.mock hoisting so the factory
// can close over them safely.
const { mockPush, mockRefresh, mockSignUpEmail } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockSignUpEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: mockSignUpEmail,
    },
  },
}));

// Import after mocks are set up
import SignupPage from "@/app/(auth)/signup/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SignupPage — payload smoke (D-04)", () => {
  it("submits exactly { name, email, password } — no nativeLanguage key", async () => {
    // Arrange: mock returns a successful response
    mockSignUpEmail.mockResolvedValueOnce({ data: { user: {} }, error: null });

    render(<SignupPage />);

    // Act: fill the three visible fields
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Alex Rivera" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "supersecret99" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    // Assert: signUp.email called once
    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledTimes(1);
    });

    const call = mockSignUpEmail.mock.calls[0];
    expect(call).toBeDefined();
    const arg = call![0] as Record<string, unknown>;

    // The three expected keys are present with correct values
    expect(arg).toMatchObject({
      name: "Alex Rivera",
      email: "alex@example.com",
      password: "supersecret99",
    });

    // No nativeLanguage key
    expect(arg).not.toHaveProperty("nativeLanguage");
    expect(Object.keys(arg).sort()).toEqual(["email", "name", "password"]);
  });

  it("calls router.push('/welcome') on successful signup (D-05)", async () => {
    mockSignUpEmail.mockResolvedValueOnce({ data: { user: {} }, error: null });

    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Alex Rivera" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "supersecret99" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/welcome");
    });
  });
});
