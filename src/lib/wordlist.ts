import type {
  Category,
  CefrLevel,
  WordEntry,
  WordList,
} from "@/data/wordlists/schema";

export type { Category, CefrLevel, WordEntry, WordList };

// Dynamic import map for all 6 language pairs
const WORDLIST_MAP: Record<string, () => Promise<WordList>> = {
  "en-fr": () =>
    import("@/data/wordlists/en-fr.json").then((m) => m.default as WordList),
  "en-es": () =>
    import("@/data/wordlists/en-es.json").then((m) => m.default as WordList),
  "fr-en": () =>
    import("@/data/wordlists/fr-en.json").then((m) => m.default as WordList),
  "fr-es": () =>
    import("@/data/wordlists/fr-es.json").then((m) => m.default as WordList),
  "es-en": () =>
    import("@/data/wordlists/es-en.json").then((m) => m.default as WordList),
  "es-fr": () =>
    import("@/data/wordlists/es-fr.json").then((m) => m.default as WordList),
};

export async function getWordList(
  sourceLang: string,
  targetLang: string,
): Promise<WordList> {
  const key = `${sourceLang}-${targetLang}`;
  const loader = WORDLIST_MAP[key];
  if (!loader) throw new Error(`No word list for ${key}`);
  return loader();
}

export function filterWords(
  words: WordEntry[],
  options: { category?: Category; cefr?: CefrLevel },
): WordEntry[] {
  return words.filter(
    (w) =>
      (!options.category || w.category === options.category) &&
      (!options.cefr || w.cefr === options.cefr),
  );
}

export function getCategories(words: WordEntry[]): string[] {
  return [...new Set(words.map((w) => w.category))];
}
