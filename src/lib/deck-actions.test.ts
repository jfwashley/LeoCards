import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock next/headers ---
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// --- Mock next/cache ---
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// --- Mock @/lib/auth ---
const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// --- Mock drizzle DB ---
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

// Chain helpers
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
};

const insertChain = {
  values: vi.fn().mockResolvedValue(undefined),
};

const updateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

const deleteChain = {
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
  },
}));

import { revalidatePath } from "next/cache";
import {
  addWordToCard,
  createDeck,
  deleteCard,
  editCard,
  removeWordFromDeck,
  saveCard,
} from "./deck-actions";

const FAKE_USER_ID = "user-abc-123";
const FAKE_DECK_ID = "deck-xyz-456";
const FAKE_CARD_ID = "card-def-789";

function mockSession(userId = FAKE_USER_ID) {
  mockGetSession.mockResolvedValue({
    user: { id: userId },
  });
}

function mockNoSession() {
  mockGetSession.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: DB select returns count=0
  mockDbSelect.mockReturnValue(selectChain);
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.innerJoin.mockReturnValue(selectChain);

  // Default resolved value for select queries (count = 0)
  selectChain.where.mockResolvedValue([{ count: 0 }]);

  mockDbInsert.mockReturnValue(insertChain);
  insertChain.values.mockResolvedValue(undefined);

  mockDbUpdate.mockReturnValue(updateChain);
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockResolvedValue(undefined);

  mockDbDelete.mockReturnValue(deleteChain);
  deleteChain.where.mockResolvedValue(undefined);
});

// ============================================================
// createDeck
// ============================================================

describe("createDeck", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(createDeck("fr")).rejects.toThrow("Unauthorized");
  });

  it("generates name 'French #1' when no existing French decks", async () => {
    mockSession();
    // count query returns 0
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);
    // deck ownership check (not needed for createDeck)
    mockDbInsert.mockReturnValue(insertChain);

    const result = await createDeck("fr");

    expect(result.name).toBe("French #1");
    expect(result.language).toBe("fr");
    expect(result.id).toBeDefined();
  });

  it("generates name 'French #2' when one existing French deck exists", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([{ count: 1 }]);

    const result = await createDeck("fr");

    expect(result.name).toBe("French #2");
  });

  it("generates name 'Spanish #1' for 'es' language", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    const result = await createDeck("es");

    expect(result.name).toBe("Spanish #1");
  });

  it("calls revalidatePath('/dashboard') after creating deck", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    await createDeck("fr");

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("inserts deck into DB with correct fields", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

    const result = await createDeck("fr");

    expect(mockDbInsert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "fr",
        name: "French #1",
        userId: FAKE_USER_ID,
      }),
    );
  });
});

// ============================================================
// saveCard
// ============================================================

describe("saveCard", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(
      saveCard(FAKE_DECK_ID, "hello", "bonjour", "manual"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden if deck does not belong to user", async () => {
    mockSession();
    // Deck lookup returns different userId
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: "other-user" },
    ]);

    await expect(
      saveCard(FAKE_DECK_ID, "hello", "bonjour", "manual"),
    ).rejects.toThrow("Forbidden");
  });

  it("inserts card and returns id for valid input", async () => {
    mockSession();
    // Deck ownership check: deck belongs to user
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    const result = await saveCard(FAKE_DECK_ID, "hello", "bonjour", "manual");

    expect(result.id).toBeDefined();
    expect(mockDbInsert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ============================================================
// editCard
// ============================================================

describe("editCard", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(editCard(FAKE_CARD_ID, "new front", "new back")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws Forbidden if card's deck does not belong to user", async () => {
    mockSession();
    // Card+deck join returns different userId
    selectChain.where.mockResolvedValueOnce([
      { cardId: FAKE_CARD_ID, deckUserId: "other-user" },
    ]);

    await expect(
      editCard(FAKE_CARD_ID, "new front", "new back"),
    ).rejects.toThrow("Forbidden");
  });

  it("updates card when owned by user", async () => {
    mockSession();
    // Card+deck join returns matching userId
    selectChain.where.mockResolvedValueOnce([
      { cardId: FAKE_CARD_ID, deckUserId: FAKE_USER_ID },
    ]);

    await editCard(FAKE_CARD_ID, "new front", "new back");

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ front: "new front", back: "new back" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ============================================================
// deleteCard
// ============================================================

describe("deleteCard", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(deleteCard(FAKE_CARD_ID)).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden if card's deck does not belong to user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { cardId: FAKE_CARD_ID, deckUserId: "other-user" },
    ]);

    await expect(deleteCard(FAKE_CARD_ID)).rejects.toThrow("Forbidden");
  });

  it("deletes card when owned by user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { cardId: FAKE_CARD_ID, deckUserId: FAKE_USER_ID },
    ]);

    await deleteCard(FAKE_CARD_ID);

    expect(mockDbDelete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ============================================================
// addWordToCard
// ============================================================

describe("addWordToCard", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(
      addWordToCard(FAKE_DECK_ID, "word-id", "hello", "bonjour"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden if deck does not belong to user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: "other-user" },
    ]);

    await expect(
      addWordToCard(FAKE_DECK_ID, "word-id", "hello", "bonjour"),
    ).rejects.toThrow("Forbidden");
  });

  it("inserts card with source=wordlist", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    const result = await addWordToCard(
      FAKE_DECK_ID,
      "word-id",
      "hello",
      "bonjour",
    );

    expect(result.id).toBeDefined();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ source: "wordlist" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ============================================================
// removeWordFromDeck
// ============================================================

describe("removeWordFromDeck", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(
      removeWordFromDeck(FAKE_DECK_ID, "hello", "bonjour"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden if deck does not belong to user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: "other-user" },
    ]);

    await expect(
      removeWordFromDeck(FAKE_DECK_ID, "hello", "bonjour"),
    ).rejects.toThrow("Forbidden");
  });

  it("deletes wordlist card matching front+back", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    await removeWordFromDeck(FAKE_DECK_ID, "hello", "bonjour");

    expect(mockDbDelete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
