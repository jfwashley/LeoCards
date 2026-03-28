import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserId } from "@/db/schema";

// ============================================================
// Mocks — must be hoisted before imports that reference them
// ============================================================

const { mockDb } = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockGroupBy = vi.fn().mockResolvedValue([]);
  const mockInnerJoin = vi.fn().mockReturnValue({ where: (mockWhere2: unknown) => ({ groupBy: mockGroupBy }) });
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin, where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockDb: {
      insert: mockInsert,
      select: mockSelect,
      _internals: {
        mockOnConflictDoNothing,
        mockValues,
        mockInsert,
        mockGroupBy,
        mockInnerJoin,
        mockFrom,
        mockSelect,
      },
    },
  };
});

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/schema")>();
  return actual;
});

import { markMilestonesSeen, getLanguageBreakdown } from "./milestone-queries";

// ============================================================
// Helpers
// ============================================================

const TEST_USER_ID = "user-test-123" as UserId;

// ============================================================
// markMilestonesSeen
// ============================================================

describe("markMilestonesSeen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup the chain after clearing
    const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockDb.insert.mockReturnValue({ values: mockValues });
  });

  it("does nothing when newLevel <= prevLevel (no insert called)", async () => {
    await markMilestonesSeen(TEST_USER_ID, 3, 3);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("does nothing when newLevel < prevLevel (no insert called)", async () => {
    await markMilestonesSeen(TEST_USER_ID, 5, 3);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("inserts one milestone when leveling up by 1 (prev=2, new=3)", async () => {
    await markMilestonesSeen(TEST_USER_ID, 2, 3);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    // Verify the values call includes the right milestone key
    const valuesCall = mockDb.insert.mock.results[0]?.value?.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ milestone: "level-3", userId: TEST_USER_ID }),
    );
  });

  it("inserts two milestones when leveling up by 2 (prev=2, new=4) with keys level-3 and level-4", async () => {
    // Setup fresh mock for each call
    const results: string[] = [];
    const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockImplementation((vals) => {
      results.push(vals.milestone);
      return { onConflictDoNothing: mockOnConflictDoNothing };
    });
    mockDb.insert.mockReturnValue({ values: mockValues });

    await markMilestonesSeen(TEST_USER_ID, 2, 4);

    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(results).toContain("level-3");
    expect(results).toContain("level-4");
  });

  it("uses onConflictDoNothing for idempotent inserts", async () => {
    const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockDb.insert.mockReturnValue({ values: mockValues });

    await markMilestonesSeen(TEST_USER_ID, 1, 2);

    expect(mockValues).toHaveBeenCalled();
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });
});

// ============================================================
// getLanguageBreakdown
// ============================================================

describe("getLanguageBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no learned cards exist", async () => {
    // Set up chain that returns empty array
    const mockGroupBy = vi.fn().mockResolvedValue([]);
    const mockJoinedWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockJoinedWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    mockDb.select.mockReturnValue({ from: mockFrom });

    const result = await getLanguageBreakdown(TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it("returns mapped language breakdown when learned cards exist", async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([
      { language: "fr", count: 10 },
      { language: "es", count: 5 },
    ]);
    const mockJoinedWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockJoinedWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    mockDb.select.mockReturnValue({ from: mockFrom });

    const result = await getLanguageBreakdown(TEST_USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ language: "fr", count: 10 });
    expect(result[1]).toEqual({ language: "es", count: 5 });
  });

  it("calls db.select with groupBy on decks.language (query structure)", async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([]);
    const mockJoinedWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockJoinedWhere });
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
    mockDb.select.mockReturnValue({ from: mockFrom });

    await getLanguageBreakdown(TEST_USER_ID);

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockInnerJoin).toHaveBeenCalled();
    expect(mockJoinedWhere).toHaveBeenCalled();
    expect(mockGroupBy).toHaveBeenCalled();
  });
});
