import { describe, expect, it } from "vitest";
import { CreateCardSchema } from "./cards";
import { CreateDeckSchema } from "./decks";
import { CommitSchema, GradeSchema } from "./study";

// Pins each schema's accept/reject boundaries so a future edit cannot
// silently loosen them. These schemas are the T-28.1-10/11/12 mitigations —
// see the plan's threat_model for the exact threats each boundary closes.

describe("CommitSchema", () => {
  const validGrade = { cardId: "card-1", direction: "n2t", correct: true };

  it("rejects an empty grades array", () => {
    const result = CommitSchema.safeParse({
      deckId: "deck-1",
      commitId: "commit-1",
      grades: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects 501 grades", () => {
    const result = CommitSchema.safeParse({
      deckId: "deck-1",
      commitId: "commit-1",
      grades: Array.from({ length: 501 }, () => validGrade),
    });
    expect(result.success).toBe(false);
  });

  it("accepts 500 grades", () => {
    const result = CommitSchema.safeParse({
      deckId: "deck-1",
      commitId: "commit-1",
      grades: Array.from({ length: 500 }, () => validGrade),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a commitId of length 101", () => {
    const result = CommitSchema.safeParse({
      deckId: "deck-1",
      commitId: "a".repeat(101),
      grades: [validGrade],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a commitId of length 100", () => {
    const result = CommitSchema.safeParse({
      deckId: "deck-1",
      commitId: "a".repeat(100),
      grades: [validGrade],
    });
    expect(result.success).toBe(true);
  });
});

describe("GradeSchema", () => {
  it("rejects a direction outside [n2t, t2n]", () => {
    const result = GradeSchema.safeParse({
      cardId: "card-1",
      direction: "sideways",
      correct: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid n2t/t2n direction", () => {
    expect(
      GradeSchema.safeParse({
        cardId: "card-1",
        direction: "n2t",
        correct: true,
      }).success,
    ).toBe(true);
    expect(
      GradeSchema.safeParse({
        cardId: "card-1",
        direction: "t2n",
        correct: false,
      }).success,
    ).toBe(true);
  });
});

describe("CreateCardSchema", () => {
  it("rejects a 501-character front", () => {
    const result = CreateCardSchema.safeParse({
      deckId: "deck-1",
      front: "a".repeat(501),
      back: "back",
      source: "manual",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty front", () => {
    const result = CreateCardSchema.safeParse({
      deckId: "deck-1",
      front: "",
      back: "back",
      source: "manual",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown source", () => {
    const result = CreateCardSchema.safeParse({
      deckId: "deck-1",
      front: "front",
      back: "back",
      source: "scanned",
    });
    expect(result.success).toBe(false);
  });

  it("defaults source to manual when omitted", () => {
    const result = CreateCardSchema.safeParse({
      deckId: "deck-1",
      front: "front",
      back: "back",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("manual");
    }
  });

  it("accepts the full field set with each valid source", () => {
    for (const source of ["manual", "wordlist", "image"] as const) {
      expect(
        CreateCardSchema.safeParse({
          deckId: "deck-1",
          front: "front",
          back: "back",
          source,
        }).success,
      ).toBe(true);
    }
  });
});

describe("CreateDeckSchema", () => {
  it("rejects de", () => {
    const result = CreateDeckSchema.safeParse({ language: "de" });
    expect(result.success).toBe(false);
  });

  it("accepts fr, es and en", () => {
    for (const language of ["fr", "es", "en"] as const) {
      expect(CreateDeckSchema.safeParse({ language }).success).toBe(true);
    }
  });
});
