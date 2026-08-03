import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — reuses the chain-mock plumbing
// shape from src/lib/deck-actions.test.ts lines 1-120, scoped down to just
// select/insert (this module never updates or deletes).
const { mockGetSession, selectChain, insertChain } = vi.hoisted(() => {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);

  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };

  const mockGetSession = vi.fn();

  return { mockGetSession, selectChain, insertChain };
});

// --- Mocks using hoisted variables ---
// next/cache and @/lib/auth are mocked purely so the negative assertions
// below can prove this module never touches either — it has no import of
// its own on either module.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
  },
}));

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createDeckCore, saveCardCore } from "./decks";

const FAKE_USER_ID = "user-abc-123" as UserId;
const FAKE_DECK_ID = "deck-xyz-456";

beforeEach(() => {
  vi.clearAllMocks();

  // Re-wire chain return values after clearAllMocks
  vi.mocked(db.select).mockReturnValue(
    selectChain as unknown as ReturnType<typeof db.select>,
  );
  vi.mocked(db.insert).mockReturnValue(
    insertChain as unknown as ReturnType<typeof db.insert>,
  );

  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  insertChain.values.mockResolvedValue(undefined);
});

// ============================================================
// createDeckCore
// ============================================================

describe("createDeckCore", () => {
  it("returns name 'French #1' with an existing-deck count of 0 for 'fr'", async () => {
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    const result = await createDeckCore({
      userId: FAKE_USER_ID,
      language: "fr",
    });

    expect(result).toEqual({
      ok: true,
      data: { id: expect.any(String), name: "French #1", language: "fr" },
    });
  });

  it("returns name 'French #2' with one existing French deck", async () => {
    selectChain.where.mockResolvedValueOnce([{ count: 1 }]);

    const result = await createDeckCore({
      userId: FAKE_USER_ID,
      language: "fr",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("French #2");
  });

  it("returns name 'Spanish #1' for 'es' with no existing decks", async () => {
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    const result = await createDeckCore({
      userId: FAKE_USER_ID,
      language: "es",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("Spanish #1");
  });

  it("returns { ok: false, code: 'invalid' } for a language outside the allow-list and issues no DB write", async () => {
    const result = await createDeckCore({
      userId: FAKE_USER_ID,
      language: "de",
    });

    expect(result).toEqual({ ok: false, code: "invalid" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("inserts exactly one row into decks with { id, userId, language, name }", async () => {
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    await createDeckCore({ userId: FAKE_USER_ID, language: "fr" });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        userId: FAKE_USER_ID,
        language: "fr",
        name: "French #1",
      }),
    );
  });

  it("never triggers Next.js page-cache invalidation", async () => {
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    await createDeckCore({ userId: FAKE_USER_ID, language: "fr" });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("never resolves a session itself", async () => {
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    await createDeckCore({ userId: FAKE_USER_ID, language: "fr" });

    expect(auth.api.getSession).not.toHaveBeenCalled();
  });
});

// ============================================================
// saveCardCore
// ============================================================

describe("saveCardCore", () => {
  it("returns { ok: true, data: { id } } for an owned deck and inserts one row with the given source", async () => {
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    const result = await saveCardCore({
      userId: FAKE_USER_ID,
      deckId: FAKE_DECK_ID,
      front: "hello",
      back: "bonjour",
      source: "manual",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBeDefined();
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        deckId: FAKE_DECK_ID,
        front: "hello",
        back: "bonjour",
        source: "manual",
      }),
    );
  });

  it("returns { ok: false, code: 'forbidden' } when the ownership query returns no row, and issues no insert", async () => {
    selectChain.where.mockResolvedValueOnce([]);

    const result = await saveCardCore({
      userId: FAKE_USER_ID,
      deckId: FAKE_DECK_ID,
      front: "hello",
      back: "bonjour",
      source: "manual",
    });

    expect(result).toEqual({ ok: false, code: "forbidden" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns { ok: false, code: 'forbidden' } when the returned row belongs to a different user, and issues no insert", async () => {
    // Defense-in-depth: in production the combined-WHERE clause itself
    // guarantees a foreign-owner row is never returned, but this proves
    // the application-level check independently rejects it too.
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: "other-user" },
    ]);

    const result = await saveCardCore({
      userId: FAKE_USER_ID,
      deckId: FAKE_DECK_ID,
      front: "hello",
      back: "bonjour",
      source: "manual",
    });

    expect(result).toEqual({ ok: false, code: "forbidden" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns { ok: false, code: 'invalid' } for card data outside CreateCardSchema's bounds and issues no insert", async () => {
    const result = await saveCardCore({
      userId: FAKE_USER_ID,
      deckId: FAKE_DECK_ID,
      front: "",
      back: "bonjour",
      source: "manual",
    });

    expect(result).toEqual({ ok: false, code: "invalid" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("never triggers Next.js page-cache invalidation", async () => {
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    await saveCardCore({
      userId: FAKE_USER_ID,
      deckId: FAKE_DECK_ID,
      front: "hello",
      back: "bonjour",
      source: "manual",
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("never resolves a session itself", async () => {
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    await saveCardCore({
      userId: FAKE_USER_ID,
      deckId: FAKE_DECK_ID,
      front: "hello",
      back: "bonjour",
      source: "manual",
    });

    expect(auth.api.getSession).not.toHaveBeenCalled();
  });
});
