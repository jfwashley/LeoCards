export type CefrLevel = "A1" | "A2" | "B1";

export type WordEntry = {
  id: string; // "greetings-001"
  category: string; // "Greetings"
  cefr: CefrLevel;
  native: string; // word in source language
  target: string; // word in target language
};

export type WordList = {
  sourceLang: string; // "en"
  targetLang: string; // "fr"
  words: WordEntry[];
};

export const CATEGORIES = [
  "Greetings",
  "Numbers",
  "Colors",
  "Days & Months",
  "Food & Drink",
  "Family",
  "Body",
  "Animals",
  "Clothing",
  "Home",
  "Weather",
  "Shopping",
  "Travel",
  "Work",
] as const;

export type Category = (typeof CATEGORIES)[number];
