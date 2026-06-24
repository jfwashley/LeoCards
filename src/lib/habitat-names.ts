// Extracted verbatim from design/handoff-daybreak/daybreak-habitat.jsx lines 4-10.
// Pure data — no imports, no hooks, RSC-safe.
//
// NOTE: H_NEXT has keys 1–8 ONLY — there is NO L9 entry.
// Callers must guard: if (nextLevelThreshold === null) { /* max level reached */ }
// Accessing H_NEXT[9] returns undefined; never call .at or .what on it (Pitfall 5, D-12).

export const H_NAME: Record<number, string> = {
  1: "Bare mound",
  2: "Lakeside",
  3: "Woodland",
  4: "Meadow",
  5: "Savanna",
  6: "Glade",
  7: "Den",
  8: "Playground",
  9: "Golden hour",
};

export const H_NEXT: Record<number, { at: number; what: string }> = {
  1: { at: 2, what: "a lake & lily pads" },
  2: { at: 3, what: "trees & rocks" },
  3: { at: 4, what: "flowers & butterflies" },
  4: { at: 5, what: "an elephant friend" },
  5: { at: 6, what: "mushrooms" },
  6: { at: 7, what: "a cave & nights" },
  7: { at: 8, what: "toys to play with" },
  8: { at: 9, what: "songbirds & golden light" },
  // L9 has no entry — guard callers: nextLevelThreshold === null means max
};
