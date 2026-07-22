import { describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/data/wordlists/schema";
import type { WordEntry } from "@/lib/wordlist";

// PERF-15 — the topic-detail (BrowseList) branch must serialize only the
// requested topic's word subset (~20 words), not the full ~280-word
// wordlist, and must NOT compute categoryCounts (that is only consumed by
// the topic-picker/BrowseTiles branch). This is a pure data-shaping
// assertion (length/shape), never a timing or byte-size gate (D-09).
//
// The page itself is an async RSC with a session dependency, so the
// module-level imports it pulls in (next/headers, @/lib/auth, @/db via
// deck-queries) are mocked here purely to make the module importable in
// vitest — none of these mocks are exercised by the assertions below,
// which only call the extracted pure `shapeBrowseData` helper.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/lib/deck-queries", () => ({
  getUserDecks: vi.fn(),
  getDeckCardWords: vi.fn(),
  getUserNativeLanguage: vi.fn(),
}));

import { shapeBrowseData } from "../page";

function buildWords(): WordEntry[] {
  // Mirrors the real en-fr wordlist's per-category distribution (15-25 words
  // per category, 280 total across 14 categories) without depending on the
  // actual JSON fixture.
  const counts: Record<string, number> = {
    Greetings: 15,
    Numbers: 15,
    Colors: 15,
    "Days & Months": 15,
    "Food & Drink": 20,
    Family: 20,
    Body: 20,
    Animals: 20,
    Clothing: 20,
    Home: 20,
    Weather: 25,
    Shopping: 25,
    Travel: 25,
    Work: 25,
  };
  const words: WordEntry[] = [];
  for (const category of CATEGORIES) {
    const count = counts[category] ?? 0;
    for (let i = 0; i < count; i++) {
      words.push({
        id: `${category}-${i}`,
        category,
        cefr: "A1",
        native: `native-${category}-${i}`,
        target: `target-${category}-${i}`,
      });
    }
  }
  return words;
}

describe("shapeBrowseData (PERF-15 — server-side Browse topic filtering)", () => {
  const words = buildWords();
  const fullLength = words.length; // 280

  it("topic-detail branch: serializes only the requested topic's subset, not the full wordlist", () => {
    const shaped = shapeBrowseData(words, "Greetings");

    expect(shaped.kind).toBe("detail");
    if (shaped.kind !== "detail") throw new Error("expected detail branch");

    // Greetings has 15 words in the fixture — must equal the filtered
    // subset, and must be far smaller than the full 280-word list.
    expect(shaped.words).toHaveLength(15);
    expect(shaped.words.length).toBeLessThan(fullLength);
    expect(shaped.words.every((w) => w.category === "Greetings")).toBe(true);
    expect(shaped.topic).toBe("Greetings");
  });

  it("topic-detail branch: does not compute or expose categoryCounts", () => {
    const shaped = shapeBrowseData(words, "Work");

    expect(shaped.kind).toBe("detail");
    expect("categoryCounts" in shaped).toBe(false);
  });

  it("topic-picker branch: computes correct per-category counts, no word subset", () => {
    const shaped = shapeBrowseData(words, undefined);

    expect(shaped.kind).toBe("picker");
    if (shaped.kind !== "picker") throw new Error("expected picker branch");

    expect(shaped.categoryCounts.Greetings).toBe(15);
    expect(shaped.categoryCounts.Work).toBe(25);
    expect(Object.keys(shaped.categoryCounts)).toHaveLength(CATEGORIES.length);
    expect("words" in shaped).toBe(false);
  });
});
