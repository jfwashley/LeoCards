import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/data/wordlists/schema";
import { filterWords, getCategories, getWordList } from "@/lib/wordlist";

const LANGUAGE_PAIRS = [
  ["en", "fr"],
  ["en", "es"],
  ["fr", "en"],
  ["fr", "es"],
  ["es", "en"],
  ["es", "fr"],
] as const;

describe("getWordList", () => {
  for (const [source, target] of LANGUAGE_PAIRS) {
    it(`loads ${source}-${target} word list successfully`, async () => {
      const list = await getWordList(source, target);
      expect(list.sourceLang).toBe(source);
      expect(list.targetLang).toBe(target);
      expect(Array.isArray(list.words)).toBe(true);
      expect(list.words.length).toBeGreaterThanOrEqual(200);
    });
  }

  it("throws for unknown language pair", async () => {
    await expect(getWordList("en", "de")).rejects.toThrow(
      "No word list for en-de",
    );
  });
});

describe("word entry structure", () => {
  it("every word in en-fr has required fields", async () => {
    const list = await getWordList("en", "fr");
    for (const word of list.words) {
      expect(typeof word.id).toBe("string");
      expect(word.id.length).toBeGreaterThan(0);
      expect(typeof word.category).toBe("string");
      expect(["A1", "A2", "B1"]).toContain(word.cefr);
      expect(typeof word.native).toBe("string");
      expect(word.native.length).toBeGreaterThan(0);
      expect(typeof word.target).toBe("string");
      expect(word.target.length).toBeGreaterThan(0);
    }
  });

  it("all id values are unique within en-fr", async () => {
    const list = await getWordList("en", "fr");
    const ids = list.words.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all id values are unique within es-fr", async () => {
    const list = await getWordList("es", "fr");
    const ids = list.words.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("cefr values are only A1, A2, or B1 in fr-es", async () => {
    const list = await getWordList("fr", "es");
    for (const word of list.words) {
      expect(["A1", "A2", "B1"]).toContain(word.cefr);
    }
  });
});

describe("category coverage", () => {
  for (const [source, target] of LANGUAGE_PAIRS) {
    it(`${source}-${target} contains all 14 categories`, async () => {
      const list = await getWordList(source, target);
      const presentCategories = new Set(list.words.map((w) => w.category));
      for (const cat of CATEGORIES) {
        expect(presentCategories.has(cat)).toBe(true);
      }
    });
  }
});

describe("filterWords", () => {
  it("filters by category", async () => {
    const list = await getWordList("en", "fr");
    const filtered = filterWords(list.words, { category: "Greetings" });
    expect(filtered.length).toBeGreaterThan(0);
    for (const word of filtered) {
      expect(word.category).toBe("Greetings");
    }
  });

  it("filters by cefr level", async () => {
    const list = await getWordList("en", "fr");
    const filtered = filterWords(list.words, { cefr: "A1" });
    expect(filtered.length).toBeGreaterThan(0);
    for (const word of filtered) {
      expect(word.cefr).toBe("A1");
    }
  });

  it("filters by both category and cefr", async () => {
    const list = await getWordList("en", "es");
    const filtered = filterWords(list.words, {
      category: "Weather",
      cefr: "B1",
    });
    expect(filtered.length).toBeGreaterThan(0);
    for (const word of filtered) {
      expect(word.category).toBe("Weather");
      expect(word.cefr).toBe("B1");
    }
  });

  it("returns all words when no options provided", async () => {
    const list = await getWordList("en", "fr");
    const filtered = filterWords(list.words, {});
    expect(filtered.length).toBe(list.words.length);
  });

  it("returns empty array when no words match", async () => {
    const list = await getWordList("en", "fr");
    // A1 + Work doesn't exist (Work is B1)
    const filtered = filterWords(list.words, { category: "Work", cefr: "A1" });
    expect(filtered.length).toBe(0);
  });
});

describe("getCategories", () => {
  it("returns all unique categories from en-fr", async () => {
    const list = await getWordList("en", "fr");
    const categories = getCategories(list.words);
    expect(categories.length).toBe(14);
    for (const cat of CATEGORIES) {
      expect(categories).toContain(cat);
    }
  });

  it("returns only categories present in filtered subset", async () => {
    const list = await getWordList("en", "fr");
    const greetings = filterWords(list.words, { category: "Greetings" });
    const categories = getCategories(greetings);
    expect(categories).toEqual(["Greetings"]);
  });
});
