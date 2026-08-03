# @leocards/domain

Shared, framework-free TypeScript package for LeoCards' web app and (from
Phase 28.2) its native Expo app. **No build step**: `main`/`types` point
directly at TypeScript source and are transpiled on demand by whichever
consumer bundles them (Turbopack on the web side, Metro/Babel on the native
side). Do not add a `tsup`/`rollup`/`tsc --watch` pipeline here — a `dist/`
build is the #1 monorepo footgun (stale-build bugs) and is unnecessary since
every consumer already transpiles TS natively.

## Decisions this package's shape encodes

- **DR-01 — one package, not a `domain`/`schemas` split.** ~900 lines of pure
  logic across the whole 28.1-28.5 programme does not justify two packages.
  Splitting later is a cheap npm-workspaces move if a real reason emerges.
- **DR-02 — six-key subpath export map, not one collapsed barrel.** `.` (ids
  only), `./ids`, `./study`, `./habitat`, `./schemas`, `./contracts`. Two hard
  reasons this is not negotiable:
  1. Multiple existing test files `vi.mock()` both `@/lib/study-engine` and
     `@/lib/habitat-engine` in the SAME file (e.g.
     `src/app/api/study/__tests__/cooldown-config.test.ts`). Collapsing both
     engines behind one module id would make those mocks collide. Distinct
     subpaths keep every existing `vi.mock` a pure string swap.
  2. Zod schemas live behind `./schemas` and must NEVER be re-exported from
     `.`, `./study` or `./habitat` — many web files that import engine types
     are `"use client"`; a barrel that pulled zod transitively would risk
     undoing PERF-14's shipped client-bundle reduction.
- **DR-05 — `wordlist.ts` / `image-constants.ts` / `image-validation.ts` are
  NOT relocated here in phase 28.1.** None of the four things D-07 names for
  this package (SRS rules, habitat-state maths, zod schemas, API contract
  types); no NAT-02 endpoint consumes them this phase.
- **DR-09 — `src/db/schema.ts` re-exports these types, it does not merely
  import them.** 25 files repo-wide do `import type { UserId } from
  "@/db/schema"`; schema.ts uses `export type { ... } from "@leocards/domain"`
  so all 25 stay byte-unchanged.

## Do not

- Do not add a build step / `dist/` output.
- Do not collapse the subpath exports into one barrel.
- Do not re-export zod schemas from `.`, `./study`, or `./habitat`.
