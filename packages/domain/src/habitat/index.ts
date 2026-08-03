// `@leocards/domain/habitat` subpath entry — re-exports the habitat-state
// engine (computeHabitatState, computeQuality, habitatLevel, classifyMood,
// plus the habitat types and constants) verbatim. Kept as its own subpath
// (DR-02) rather than folded into the root barrel so
// `vi.mock("@leocards/domain/habitat", ...)` stays an independent module id
// from `@leocards/domain/study` — several test files mock both engines in
// the same file.
export * from "./habitat-engine";
