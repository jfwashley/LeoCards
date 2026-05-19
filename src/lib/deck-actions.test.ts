import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — use it to create shared mocks
const { mockGetSession, selectChain, insertChain, updateChain, deleteChain } =
  vi.hoisted(() => {
    const selectChain = {
      from: vi.fn(),
      where: vi.fn(),
      innerJoin: vi.fn(),
    };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.innerJoin.mockReturnValue(selectChain);

    const insertChain = { values: vi.fn().mockResolvedValue(undefined) };

    const updateChain = {
      set: vi.fn(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    updateChain.set.mockReturnValue(updateChain);

    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };

    const mockGetSession = vi.fn();

    return {
      mockGetSession,
      selectChain,
      insertChain,
      updateChain,
      deleteChain,
    };
  });

// --- Mocks using hoisted variables ---
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

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
    update: vi.fn().mockReturnValue(updateChain),
    delete: vi.fn().mockReturnValue(deleteChain),
  },
}));

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  addWordToCard,
  createDeck,
  deleteCard,
  editCard,
  getSameLanguageDeckBackWords,
  removeWordFromDeck,
  saveCard,
} from "./deck-actions";

const FAKE_USER_ID = "user-abc-123";
const FAKE_DECK_ID = "deck-xyz-456";
const FAKE_CARD_ID = "card-def-789";

function mockSession(userId = FAKE_USER_ID) {
  mockGetSession.mockResolvedValue({ user: { id: userId } });
}

function mockNoSession() {
  mockGetSession.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();

  // Re-wire chain return values after clearAllMocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.select).mockReturnValue(
    selectChain as unknown as ReturnType<typeof db.select>,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.insert).mockReturnValue(
    insertChain as unknown as ReturnType<typeof db.insert>,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.update).mockReturnValue(
    updateChain as unknown as ReturnType<typeof db.update>,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.delete).mockReturnValue(
    deleteChain as unknown as ReturnType<typeof db.delete>,
  );

  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.innerJoin.mockReturnValue(selectChain);
  updateChain.set.mockReturnValue(updateChain);
  insertChain.values.mockResolvedValue(undefined);
  updateChain.where.mockResolvedValue(undefined);
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
    selectChain.where.mockResolvedValueOnce([{ count: 0 }]);

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

    await createDeck("fr");

    expect(db.insert).toHaveBeenCalled();
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
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: "other-user" },
    ]);

    await expect(
      saveCard(FAKE_DECK_ID, "hello", "bonjour", "manual"),
    ).rejects.toThrow("Forbidden");
  });

  it("inserts card and returns id for valid input", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    const result = await saveCard(FAKE_DECK_ID, "hello", "bonjour", "manual");

    expect(result.id).toBeDefined();
    expect(db.insert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ============================================================
// editCard
// ============================================================

describe("editCard", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(
      editCard(FAKE_CARD_ID, "new front", "new back"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden if card's deck does not belong to user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { cardId: FAKE_CARD_ID, deckUserId: "other-user" },
    ]);

    await expect(
      editCard(FAKE_CARD_ID, "new front", "new back"),
    ).rejects.toThrow("Forbidden");
  });

  it("updates card when owned by user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { cardId: FAKE_CARD_ID, deckUserId: FAKE_USER_ID },
    ]);

    await editCard(FAKE_CARD_ID, "new front", "new back");

    expect(db.update).toHaveBeenCalled();
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

    expect(db.delete).toHaveBeenCalled();
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

    expect(db.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ============================================================
// getSameLanguageDeckBackWords
// ============================================================
// RED by design — awaiting Wave 2 implementation in deck-actions.ts.
// Sequencing note for the two selectChain.where mockResolvedValueOnce calls:
//   (1) target deck language + ownership lookup → [{language: "fr"}]
//   (2) innerJoin same-language cards back values → [{back: "Chien"}, {back: "  chat  "}]

describe("getSameLanguageDeckBackWords", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(getSameLanguageDeckBackWords(FAKE_DECK_ID)).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("throws Forbidden when deck not owned by user (ownership lookup returns no row)", async () => {
    mockSession();
    // First query: target deck language + ownership lookup — returns empty = forbidden
    selectChain.where.mockResolvedValueOnce([]);
    await expect(getSameLanguageDeckBackWords(FAKE_DECK_ID)).rejects.toThrow(
      "Forbidden",
    );
  });

  it("returns Set of trimmed lowercase back values for same-language decks", async () => {
    mockSession();
    // First query: target deck language + ownership lookup
    selectChain.where.mockResolvedValueOnce([{ language: "fr" }]);
    // Second query: innerJoin same-language card back values
    selectChain.where.mockResolvedValueOnce([
      { back: "Chien" },
      { back: "  chat  " },
    ]);
    const result = await getSameLanguageDeckBackWords(FAKE_DECK_ID);
    expect(result).toEqual(new Set(["chien", "chat"]));
  });
});
