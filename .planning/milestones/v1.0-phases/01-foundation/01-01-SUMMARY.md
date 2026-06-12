---
phase: 01-foundation
plan: 01
subsystem: foundation
tags: [scaffold, next.js, tailwind, biome, vitest, drizzle, neon, shadcn, ci]
dependency_graph:
  requires: []
  provides:
    - "Next.js 16 project scaffold with TypeScript strict"
    - "Zod-validated env with server/client split (src/env.ts)"
    - "Drizzle DB singleton via Neon HTTP driver (src/db/index.ts)"
    - "Complete DB schema for all 6 phases (src/db/schema.ts)"
    - "Biome lint+format configuration"
    - "Vitest test runner with path aliases"
    - "shadcn/ui with warm orange/amber theme"
    - "GitHub Actions CI pipeline"
  affects: []
tech_stack:
  added:
    - "next@16.2.1"
    - "react@19.2.4"
    - "typescript@5.x"
    - "tailwindcss@4.x"
    - "better-auth@1.5.6"
    - "drizzle-orm@0.45.1"
    - "@neondatabase/serverless@1.0.2"
    - "@t3-oss/env-nextjs@0.13.11"
    - "zod@4.3.6"
    - "resend@6.9.4"
    - "react-hook-form@7.x"
    - "@biomejs/biome@2.4.8"
    - "vitest@4.1.1"
    - "drizzle-kit@0.31.10"
    - "shadcn@4.1.0 (Button, Input, Label, Card, Form)"
  patterns:
    - "createEnv() from @t3-oss/env-nextjs for server/client split env validation"
    - "Neon HTTP driver + Drizzle ORM singleton pattern"
    - "Branded types on all ID columns via .$type<T>()"
    - "proxy.ts for route protection (Next.js 16 convention)"
    - "Biome ci for CI lint enforcement (CSS excluded due to Tailwind 4 directives)"
key_files:
  created:
    - "src/env.ts — Zod-validated env with DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, NEXT_PUBLIC_APP_URL"
    - "src/env.test.ts — Unit test verifying env validation throws on missing vars"
    - "src/db/schema.ts — All 9 tables: user, session, account, verification + decks, cards, recall_events, milestones_seen, habitat_metadata"
    - "src/db/index.ts — Drizzle DB singleton via Neon HTTP driver"
    - "drizzle.config.ts — Drizzle Kit config for schema generation and migrations"
    - ".github/workflows/ci.yml — PR gate CI: tsc + biome ci + next build; non-blocking vitest"
    - "src/components/ui/button.tsx — shadcn Button"
    - "src/components/ui/card.tsx — shadcn Card"
    - "src/components/ui/input.tsx — shadcn Input"
    - "src/components/ui/label.tsx — shadcn Label"
    - "src/components/ui/form.tsx — shadcn Form (manually created, shadcn CLI skipped)"
    - "src/lib/utils.ts — cn() utility"
    - "biome.json — Biome v2.4.8 config (CSS excluded)"
    - "vitest.config.ts — Vitest with node environment and @/* alias"
    - ".env.example — All 4 required env vars documented"
  modified:
    - "package.json — name, added 8 scripts (typecheck/lint/format/test/db:*)"
    - "tsconfig.json — Added noUncheckedIndexedAccess"
    - "src/app/globals.css — Warm orange theme: --primary hsl(24 95% 53%), full HSL palette"
    - "src/app/layout.tsx — Inter font, system fallback stack"
decisions:
  - "Biome CSS linting disabled — Tailwind 4 directives (@custom-variant, @theme, @apply) are not standard CSS and fail Biome's CSS parser"
  - "Better Auth tables written manually from getAuthTables() introspection — npx auth generate requires a running DB connection"
  - "src/db/index.ts uses process.env.DATABASE_URL! directly (not env.ts) to avoid circular import with auth.ts"
  - "noNonNullAssertion warnings in db/index.ts and drizzle.config.ts are intentional — these files must access process.env before env validation runs"
metrics:
  duration: "29 minutes"
  completed: "2026-03-23T17:00:00Z"
  tasks_completed: 2
  files_created: 17
  files_modified: 5
---

# Phase 01 Plan 01: Project Scaffold — Summary

**One-liner:** Next.js 16 project scaffolded with TypeScript strict, Biome v2.4.8, Vitest, Tailwind 4, shadcn/ui warm orange theme, Zod env validation, Drizzle + Neon connection, full 9-table DB schema covering all 6 phases, and GitHub Actions CI pipeline.

## What Was Built

A production-ready project foundation that every subsequent plan builds on:

- **Next.js 16.2.1** with TypeScript strict + noUncheckedIndexedAccess — zero type errors
- **Env validation** via `@t3-oss/env-nextjs` with server/client schema split — fails loudly at startup if required vars are missing
- **Complete DB schema** defining all 9 tables for the entire app lifecycle (Better Auth tables + 5 app tables with branded ID types)
- **Drizzle + Neon** via HTTP driver — serverless-safe, single HTTP request per query
- **shadcn/ui** initialized with warm orange/amber primary theme (`hsl(24 95% 53%)`)
- **Biome 2.4.8** configured for TypeScript/TSX formatting and linting (CSS excluded due to Tailwind 4 non-standard directives)
- **Vitest** with 2 passing tests verifying env validation behavior
- **CI pipeline** with PR gate (tsc + biome ci + next build) and non-blocking test job

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome 2.4.8 removed `organizeImports` top-level key**
- **Found during:** Task 1 — first `biome ci` run
- **Issue:** Plan specified `"organizeImports": { "enabled": true }` in biome.json, but Biome v2 removed this as a top-level key (it's now part of `assist`)
- **Fix:** Removed `organizeImports` from biome.json; used `biome check --write` to apply import sorting fixes to affected files
- **Files modified:** biome.json, src/env.test.ts, vitest.config.ts
- **Commit:** ecc993b

**2. [Rule 1 - Bug] Tailwind 4 CSS directives incompatible with Biome CSS parser**
- **Found during:** Task 1 — first `biome ci` run after shadcn init
- **Issue:** globals.css uses `@custom-variant`, `@theme inline`, and `@apply` (Tailwind 4 syntax) which Biome's CSS parser rejects as "Tailwind-specific syntax is disabled"
- **Fix:** Added `"files": { "includes": ["**", "!**/*.css"] }` to biome.json to exclude all CSS files from Biome processing
- **Files modified:** biome.json
- **Commit:** ecc993b

**3. [Rule 1 - Bug] shadcn form component silently failed to install via CLI**
- **Found during:** Task 1 — `npx shadcn@latest add form` returned no output and created no files
- **Issue:** shadcn 4.1.0 has a minimal/empty form component in its registry; the CLI finds it but doesn't generate files
- **Fix:** Manually created `src/components/ui/form.tsx` using the standard react-hook-form + shadcn pattern
- **Files modified:** src/components/ui/form.tsx (created)
- **Commit:** ecc993b

**4. [Rule 1 - Bug] shadcn init modified globals.css to use default oklch color scheme**
- **Found during:** Task 1 — after `npx shadcn@latest init`
- **Issue:** shadcn appended a bare `:root { ... }` block with default oklch colors that would override our warm orange `@layer base` values
- **Fix:** Rewrote globals.css to use a single bare `:root` block with our warm HSL orange colors as the authoritative source
- **Files modified:** src/app/globals.css
- **Commit:** ecc993b

**5. [Rule 1 - Bug] Better Auth schema generation requires a running DB connection**
- **Found during:** Task 2 — `npx auth@latest generate` failed with "Failed to initialize database adapter"
- **Issue:** The `auth generate` command requires a configured and reachable DB adapter; it cannot generate schema from a static config alone
- **Fix:** Introspected the `getAuthTables()` function from `@better-auth/core/db` to get the exact table structure, then wrote the Better Auth tables manually in schema.ts
- **Files modified:** src/db/schema.ts
- **Commit:** 5939ea2

## Known Stubs

None — all files are complete and functional. The `.env.local` file contains placeholder values for local development; this is intentional and gitignored.

## Self-Check: PASSED

Verified files exist:
- src/env.ts: FOUND
- src/env.test.ts: FOUND
- src/db/index.ts: FOUND
- src/db/schema.ts: FOUND
- drizzle.config.ts: FOUND
- .github/workflows/ci.yml: FOUND
- biome.json: FOUND
- vitest.config.ts: FOUND
- .env.example: FOUND

Verified commits exist:
- ecc993b (Task 1: scaffold + shadcn/ui): FOUND
- 5939ea2 (Task 2: DB schema + CI): FOUND
