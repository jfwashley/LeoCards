import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/lib/deck-actions.test.ts, extended
// with auth.api.signOut per RESEARCH Pitfall 11)
// ============================================================
const { mockGetSession, mockSignOut, selectChain, insertChain, deleteChain } =
  vi.hoisted(() => {
    const selectChain = { from: vi.fn(), where: vi.fn() };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);

    const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };

    const mockGetSession = vi.fn();
    const mockSignOut = vi.fn().mockResolvedValue(undefined);

    return {
      mockGetSession,
      mockSignOut,
      selectChain,
      insertChain,
      deleteChain,
    };
  });

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://leocards.test" },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    delete: vi.fn().mockReturnValue(deleteChain),
  },
}));

// Partial drizzle-orm mock — keep everything real except `eq`, which we swap
// for a plain inspectable object so tests can assert on the exact column +
// value a query was built with (mirrors src/app/api/study/complete/route.test.ts).
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => ({ __op: "eq", col, val }),
  };
});

import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { deleteAccount, requestEmailChange } from "./account-actions";

function mockSession(userId: string, email = "old@example.com") {
  mockGetSession.mockResolvedValue({ user: { id: userId, email } });
}

function mockNoSession() {
  mockGetSession.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(db.select).mockReturnValue(
    selectChain as unknown as ReturnType<typeof db.select>,
  );
  vi.mocked(db.insert).mockReturnValue(
    insertChain as unknown as ReturnType<typeof db.insert>,
  );
  vi.mocked(db.delete).mockReturnValue(
    deleteChain as unknown as ReturnType<typeof db.delete>,
  );

  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  insertChain.values.mockResolvedValue(undefined);
  deleteChain.where.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
});

// ============================================================
// requestEmailChange
// ============================================================

describe("requestEmailChange", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(requestEmailChange("new@example.com")).rejects.toThrow(
      "Unauthorized",
    );
  });

  // WR-05 — server-side hardening: a "use server" action is directly
  // callable over the network, bypassing the client's zod check entirely.
  it("rejects a malformed email server-side, before any uniqueness check", async () => {
    mockSession("user-invalid-email");

    const result = await requestEmailChange("not-an-email");

    expect(result).toEqual({ ok: false, error: "invalid-email" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects an empty string server-side (e.g. a bypassed-client empty payload)", async () => {
    mockSession("user-empty-email");

    const result = await requestEmailChange("");

    expect(result).toEqual({ ok: false, error: "invalid-email" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects same-email (case-insensitive compare)", async () => {
    mockSession("user-same-email", "same@example.com");
    const result = await requestEmailChange("SAME@Example.com");
    expect(result).toEqual({ ok: false, error: "same-email" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects email-taken when the uniqueness SELECT returns a row", async () => {
    mockSession("user-email-taken");
    selectChain.where.mockResolvedValueOnce([
      { id: "other-user", email: "taken@example.com" },
    ]);

    const result = await requestEmailChange("taken@example.com");

    expect(result).toEqual({ ok: false, error: "email-taken" });
    expect(insertChain.values).not.toHaveBeenCalled();
  });

  it("lowercases a mixed-case candidate before the uniqueness check AND the insert value", async () => {
    mockSession("user-lowercase");
    selectChain.where.mockResolvedValueOnce([]);

    await requestEmailChange("NewMail@Example.COM");

    expect(selectChain.where).toHaveBeenCalledWith(
      expect.objectContaining({
        __op: "eq",
        col: user.email,
        val: "newmail@example.com",
      }),
    );
    const insertedValue = insertChain.values.mock.calls[0]?.[0] as {
      value: string;
    };
    const parsed = JSON.parse(insertedValue.value) as { newEmail: string };
    expect(parsed.newEmail).toBe("newmail@example.com");
  });

  it("replaces a prior pending row — delete fires before insert on the deterministic identifier", async () => {
    mockSession("user-replace");
    selectChain.where.mockResolvedValueOnce([]);

    await requestEmailChange("fresh@example.com");

    expect(db.delete).toHaveBeenCalledWith(verification);
    expect(deleteChain.where).toHaveBeenCalledWith(
      expect.objectContaining({
        __op: "eq",
        col: verification.identifier,
        val: "change-email:user-replace",
      }),
    );
    const deleteOrder = vi.mocked(db.delete).mock.invocationCallOrder[0];
    const insertOrder = vi.mocked(db.insert).mock.invocationCallOrder[0];
    expect(deleteOrder).toBeDefined();
    expect(insertOrder).toBeDefined();
    expect(deleteOrder as number).toBeLessThan(insertOrder as number);
  });

  it("returns rate-limited on the 6th call within the window (5 req/hr/user)", async () => {
    mockSession("user-rate-limit");
    selectChain.where.mockResolvedValue([]); // every uniqueness check passes

    for (let i = 0; i < 5; i++) {
      const result = await requestEmailChange(`attempt${i}@example.com`);
      expect(result).toEqual({ ok: true });
    }
    const sixth = await requestEmailChange("attempt5@example.com");
    expect(sixth).toEqual({ ok: false, error: "rate-limited" });
  });

  it("success returns {ok:true} and inserts a row whose value JSON parses to {token,newEmail}", async () => {
    mockSession("user-success");
    selectChain.where.mockResolvedValueOnce([]);

    const result = await requestEmailChange("brandnew@example.com");

    expect(result).toEqual({ ok: true });
    expect(db.insert).toHaveBeenCalledWith(verification);
    const insertedValue = insertChain.values.mock.calls[0]?.[0] as {
      identifier: string;
      value: string;
    };
    expect(insertedValue.identifier).toBe("change-email:user-success");
    const parsed = JSON.parse(insertedValue.value) as {
      token: string;
      newEmail: string;
    };
    expect(parsed.newEmail).toBe("brandnew@example.com");
    expect(typeof parsed.token).toBe("string");
    expect(parsed.token.length).toBeGreaterThan(0);
  });
});

// ============================================================
// deleteAccount
// ============================================================

describe("deleteAccount", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(deleteAccount()).rejects.toThrow("Unauthorized");
  });

  it("deletes the pending verification row before deleting the user (hygiene, Pitfall 4)", async () => {
    mockSession("user-delete-1");

    await deleteAccount();

    expect(db.delete).toHaveBeenNthCalledWith(1, verification);
    expect(db.delete).toHaveBeenNthCalledWith(2, user);
    expect(deleteChain.where).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        __op: "eq",
        col: verification.identifier,
        val: "change-email:user-delete-1",
      }),
    );
  });

  it("calls db.delete(user) with the session userId and calls auth.api.signOut", async () => {
    mockSession("user-delete-2");

    await deleteAccount();

    expect(db.delete).toHaveBeenCalledWith(user);
    expect(deleteChain.where).toHaveBeenCalledWith(
      expect.objectContaining({
        __op: "eq",
        col: user.id,
        val: "user-delete-2",
      }),
    );
    expect(mockSignOut).toHaveBeenCalled();
  });

  // WR-08 — signOut() was previously unguarded: a throw here propagated
  // out of deleteAccount() even though the account deletion itself (the
  // operation the user actually asked for) had already fully succeeded.
  it("resolves successfully and logs (rather than throwing) when the best-effort signOut rejects", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockSession("user-delete-3");
    mockSignOut.mockRejectedValueOnce(new Error("signout boom"));

    await expect(deleteAccount()).resolves.toBeUndefined();

    // The account deletion itself must still have happened.
    expect(db.delete).toHaveBeenCalledWith(user);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[account] signOut after deleteAccount failed (best-effort):",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
