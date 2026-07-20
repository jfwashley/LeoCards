import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserId } from "@/db/schema";

// ============================================================
// Mocks — vi.hoisted chain shape mirrors src/lib/milestone-queries.test.ts,
// simplified to select().from().where() (no innerJoin/groupBy needed).
// ============================================================

const { mockDb } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockDb: {
      select: mockSelect,
      _internals: { mockWhere, mockFrom, mockSelect },
    },
  };
});

vi.mock("@/db", () => ({
  db: mockDb,
}));

import { getPendingEmailChange } from "./account-queries";

const TEST_USER_ID = "user-test-123" as UserId;

describe("getPendingEmailChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb._internals.mockFrom.mockReturnValue({
      where: mockDb._internals.mockWhere,
    });
    mockDb.select.mockReturnValue({ from: mockDb._internals.mockFrom });
  });

  it("returns null when no row exists", async () => {
    mockDb._internals.mockWhere.mockResolvedValueOnce([]);

    const result = await getPendingEmailChange(
      TEST_USER_ID,
      "current@example.com",
    );

    expect(result).toBeNull();
  });

  it("returns null when the row is expired", async () => {
    mockDb._internals.mockWhere.mockResolvedValueOnce([
      {
        identifier: `change-email:${TEST_USER_ID}`,
        value: JSON.stringify({ token: "t", newEmail: "new@example.com" }),
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);

    const result = await getPendingEmailChange(
      TEST_USER_ID,
      "current@example.com",
    );

    expect(result).toBeNull();
  });

  it("returns null when the stored value JSON is malformed", async () => {
    mockDb._internals.mockWhere.mockResolvedValueOnce([
      {
        identifier: `change-email:${TEST_USER_ID}`,
        value: "{not-valid-json",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    ]);

    const result = await getPendingEmailChange(
      TEST_USER_ID,
      "current@example.com",
    );

    expect(result).toBeNull();
  });

  it("returns {newEmail, expiresAt} for a valid unexpired row", async () => {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    mockDb._internals.mockWhere.mockResolvedValueOnce([
      {
        identifier: `change-email:${TEST_USER_ID}`,
        value: JSON.stringify({ token: "abc", newEmail: "new@example.com" }),
        expiresAt,
      },
    ]);

    const result = await getPendingEmailChange(
      TEST_USER_ID,
      "current@example.com",
    );

    expect(result).toEqual({ newEmail: "new@example.com", expiresAt });
  });

  // WR-06 — the verify-email route no longer deletes the token row
  // immediately on success, so a row can legitimately linger after the
  // change it describes has already applied. That must not be reported as
  // still-pending (it would re-show a stale "verification sent" banner for
  // an email that's already live).
  it("returns null when the stored newEmail already matches currentEmail (already applied)", async () => {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    mockDb._internals.mockWhere.mockResolvedValueOnce([
      {
        identifier: `change-email:${TEST_USER_ID}`,
        value: JSON.stringify({ token: "abc", newEmail: "new@example.com" }),
        expiresAt,
      },
    ]);

    const result = await getPendingEmailChange(TEST_USER_ID, "new@example.com");

    expect(result).toBeNull();
  });
});
