// Root barrel — DR-02: this barrel carries ids ONLY. The engines are reached
// via `@leocards/domain/study` and `@leocards/domain/habitat` as 1:1
// replacements for today's `@/lib/study-engine` and `@/lib/habitat-engine`,
// so that per-module `vi.mock("@leocards/domain/study", ...)` /
// `vi.mock("@leocards/domain/habitat", ...)` calls stay independent module
// ids (several test files mock both engines in the same file — collapsing
// them behind one barrel would make those mocks collide). Validation
// schemas live behind `./schemas` and must NEVER be re-exported here, from
// `./study`, or from `./habitat` — this barrel must stay dependency-free so
// no client bundle transitively pulls in the schema validation library.
export * from "./ids";
