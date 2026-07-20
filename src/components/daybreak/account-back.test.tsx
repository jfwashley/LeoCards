// @vitest-environment jsdom
// WR-09 — AccountBack (the D-04 dirty-guard back button) had zero test
// coverage, unit or e2e, despite being the component the review brief
// specifically flagged for "typed passwords must never leak into
// context/dialog". Deliberately renders the REAL ChangePasswordCard
// alongside AccountBack (not a synthetic setPasswordDirty() probe) so
// passwordDirty is driven by genuine keystrokes through the real
// AccountDirtyProvider, exactly mirroring how these two sibling
// components actually communicate on /account.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.hoisted lifts these declarations before vi.mock hoisting so the
// factories can close over them safely (mirrors delete-account-row.test.tsx
// / account-details-card.test.tsx conventions, 25-PATTERNS.md).
const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

// ChangePasswordCard's own dependency — mocked exactly as
// change-password-card.test.tsx mocks it (Pitfall 11: mock shape for a
// client-module dependency). Never invoked here since no test submits the
// form; only typing (to derive passwordDirty) is exercised.
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: vi.fn(),
  },
}));

// Import after mocks are set up.
import { AccountDirtyProvider } from "@/components/account-dirty-context";
import { ChangePasswordCard } from "@/components/change-password-card";
import { AccountBack } from "@/components/daybreak/account-back";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const TYPED_PASSWORD = "SuperSecretPass1";

function renderScene() {
  render(
    <AccountDirtyProvider>
      <AccountBack />
      <ChangePasswordCard />
    </AccountDirtyProvider>,
  );
}

function expandPasswordPanel() {
  fireEvent.click(screen.getByTestId("account-password-row"));
}

function typeIntoCurrentPasswordField(value: string) {
  fireEvent.change(screen.getByTestId("account-password-current-field"), {
    target: { value },
  });
}

function clickBack() {
  fireEvent.click(screen.getByTestId("account-back-btn"));
}

describe("AccountBack — D-04 dirty-guard back button", () => {
  it("navigates immediately with no dialog when passwordDirty is false (nothing typed)", () => {
    renderScene();

    clickBack();

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByTestId("account-discard-dialog")).toBeNull();
  });

  it("opens the discard dialog and does NOT navigate when passwordDirty is true (real typed input)", () => {
    renderScene();
    expandPasswordPanel();
    typeIntoCurrentPasswordField(TYPED_PASSWORD);

    clickBack();

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId("account-discard-dialog")).toBeTruthy();
    expect(screen.getByText("Discard changes?")).toBeTruthy();
    expect(
      screen.getByText("Your password changes haven't been saved."),
    ).toBeTruthy();
  });

  // D-04 leak guard: only a derived boolean ever crosses
  // AccountDirtyContext (change-password-card.tsx computes it locally and
  // only ever calls setPasswordDirty(booleanValue)) — the typed password
  // text itself must never appear anywhere in AccountBack's dialog.
  it("never echoes the typed password text anywhere in the discard dialog", () => {
    renderScene();
    expandPasswordPanel();
    typeIntoCurrentPasswordField(TYPED_PASSWORD);

    clickBack();

    const dialog = screen.getByTestId("account-discard-dialog");
    expect(dialog).toBeTruthy();
    expect(screen.queryByText(TYPED_PASSWORD)).toBeNull();
    expect(dialog.textContent).not.toContain(TYPED_PASSWORD);
    // Belt-and-suspenders: nowhere in the document at all, not just
    // outside the dialog element.
    expect(document.body.textContent).not.toContain(TYPED_PASSWORD);
  });

  it("'Stay' closes the dialog without navigating", async () => {
    renderScene();
    expandPasswordPanel();
    typeIntoCurrentPasswordField(TYPED_PASSWORD);

    clickBack();
    expect(screen.getByTestId("account-discard-dialog")).toBeTruthy();

    fireEvent.click(screen.getByTestId("account-discard-stay-btn"));

    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId("account-discard-dialog")).toBeNull();
    });
  });

  it("'Leave' navigates to /dashboard", () => {
    renderScene();
    expandPasswordPanel();
    typeIntoCurrentPasswordField(TYPED_PASSWORD);

    clickBack();
    expect(screen.getByTestId("account-discard-dialog")).toBeTruthy();

    fireEvent.click(screen.getByTestId("account-discard-leave-btn"));

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
