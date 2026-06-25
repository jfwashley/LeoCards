---
phase: 15-core-journey-qa-harness
plan: "02"
subsystem: qa-harness
tags: [qa, harness, auth, drizzle, provisioning, time-shift, manifest, srs]
dependency_graph:
  requires: [15-01]
  provides:
    - scripts/qa-lib.mjs
    - provision / gradeSession / readState / readHabitat
    - setTimeShift / clearTimeShift
    - writeManifest / readManifest
    - mintTestEmail / directionForRound / assertEq / assertOk
  affects: [qa-01-learn-card, qa-02-mastery, qa-03-resume, qa-04-habitat, qa-05-decay]
tech_stack:
  added: []
  patterns:
    - ESM Node script with shebang + env guard (mirrors cleanup-test-users.mjs)
    - Direct ../src/db/schema.ts import from .mjs (works Node 20+; Node strips TS type-only declarations at parse time)
    - drizzle({ client: neon(DATABASE_URL) }) for provisioning Drizzle writes
    - WHATWG getSetCookie() array join + regex for multi-cookie capture (Node 18+)
    - Module-level _timeShiftCookie state for automatic leo-qa-time-offset forwarding
    - Atomic manifest write via writeFile(.tmp) + rename (QAJ-03)
key_files:
  created:
    - scripts/qa-lib.mjs
  modified:
    - .gitignore
decisions:
  - "Drizzle import strategy: direct import of ../src/db/schema.ts from .mjs — Node 25 (and Node 20+) parses the TS file as ESM, stripping type-only declarations (declare const __brand, Brand<T,B>, $type<>) transparently. Column objects resolve correctly. No local descriptor or raw SQL needed."
  - "Module-level _timeShiftCookie state: time-shift cookie captured once in setTimeShift(), forwarded automatically in cookieHeader() so callers never need to thread the cookie through each call."
  - "All console.log output avoids session token, password, and DEBUG_CHEAT_SECRET (T-15-06). Only email, deckId, card count, and ms offset are ever logged."
  - "Manifest path convention: scripts/qa-manifest-<run-id>.json (gitignored); callers pass the full path; writeManifest uses atomic .tmp→rename."
metrics:
  duration: "~20 minutes"
  completed: "2026-06-25"
  tasks_completed: 2
  files_changed: 2
---

# Phase 15 Plan 02: QA Harness Library Summary

Shared `scripts/qa-lib.mjs` ESM library providing auth, provisioning, real-pipeline grading, real-data assertion reads, time-shift cookie plumbing, atomic manifest I/O, and assert helpers — the contracts-first foundation all five journey scripts import.

## What Was Built

### `scripts/qa-lib.mjs` — Exported Function API

| Export | Signature | Purpose |
|--------|-----------|---------|
| `extractSessionCookie` | `(res: Response) → string` | Extract `better-auth.session_token` value from a Set-Cookie response header array (Node 18+ WHATWG API) |
| `signUp` | `(baseUrl, email, password) → Promise<string>` | POST /api/auth/sign-up/email, return session token |
| `signIn` | `(baseUrl, email, password) → Promise<string>` | POST /api/auth/sign-in/email, return session token |
| `getUserId` | `(baseUrl, token) → Promise<string>` | GET /api/auth/get-session, return `user.id` |
| `mintTestEmail` | `() → string` | Mint `qa+${Date.now()}+${rand}@test.local` (exact e2e/helpers.ts format) |
| `provision` | `(baseUrl, opts) → Promise<{email, sessionToken, userId, deckId, cardIds[]}>` | Sign up @test.local user + direct-Drizzle deck+cards insert; returns full manifest payload |
| `gradeSession` | `(baseUrl, token, {deckId, grades[]}) → Promise<{success, leveledUp}>` | POST /api/study/complete with fresh commitId per call (D-02, WR-04 safe) |
| `readState` | `(baseUrl, token, secret, deckId) → Promise<{real, forced, cards[]}>` | GET /api/debug/state for real per-card SRS assertions (D-06); forwards time-shift cookie |
| `readHabitat` | `(baseUrl, token) → Promise<HabitatState>` | GET /api/habitat for live habitat level/quality/mood/decay; forwards time-shift cookie |
| `setTimeShift` | `(baseUrl, token, secret, offsetMs) → Promise<{ok}>` | POST /api/debug/time-shift, captures leo-qa-time-offset cookie for auto-forwarding |
| `clearTimeShift` | `(baseUrl, token, secret) → Promise<{ok, cleared}>` | POST /api/debug/time-shift {clear:true}, clears module-level cookie state |
| `writeManifest` | `(filePath, obj) → Promise<void>` | Atomically write JSON manifest via .tmp→rename (QAJ-03) |
| `readManifest` | `(filePath) → Promise<object>` | Read + parse a manifest JSON file |
| `directionForRound` | `(round: number) → "n2t"\|"t2n"\|"either"` | Maps masteryRound 0→n2t, 1→t2n, 2+→either (mirrors getCardStage in study-engine.ts) |
| `assertEq` | `(actual, expected, label) → void` | Throw with descriptive message on strict inequality |
| `assertOk` | `(res: Response, label) → void` | Throw on non-2xx Response |
| `DEFAULT_BASE_URL` | `string` | `process.env.QA_BASE_URL ?? "http://localhost:3000"` |
| `ROOT` | `string` | Repo root absolute path (fileURLToPath → dirname → resolve "..") |

### Drizzle Import Strategy

`scripts/qa-lib.mjs` imports the Drizzle table descriptors directly from the TypeScript schema:

```js
import { cards, decks } from "../src/db/schema.ts";
```

This works because Node 20+ (and Node 25.8.1 confirmed in this session) parses `.ts` files as ESM after stripping type-only constructs (`declare const __brand`, `Brand<T,B>` type aliases, `.primaryKey().$type<CardId>()` generic calls — all stripped at the JS AST level). The Drizzle runtime column objects (`id`, `userId`, etc.) resolve correctly.

The cleanup script (`scripts/cleanup-test-users.mjs`) uses raw `neon()` SQL instead — `qa-lib.mjs` uses the Drizzle ORM layer to get typed, schema-matching inserts for `decks` and `cards`.

### `.gitignore` additions

```
# Phase 15 QA harness — generated resumable-session manifests (QAJ-03)
scripts/qa-manifest-*.json
scripts/qa-manifest.json
```

`git check-ignore scripts/qa-manifest-test.json` confirms the glob matches. `scripts/qa-lib.mjs` is NOT ignored (confirmed).

### Security — Threat mitigations delivered

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-15-06: session token / password / secret in logs | `console.log` never logs `token`, `password`, or `secret`; only email, deckId, card count, ms offset | DONE |
| T-15-07: provisioning to real prod DB | All users minted as `@test.local`; cleanup-test-users.mjs `%@test.local` pattern reaps them | DONE |
| T-15-08: accidental real-user mutation | Provisioning only `INSERT`s fresh rows keyed to newly-created test users | DONE |

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed exactly as specified.

### Biome fixable (Rule 3 — auto-applied)

**[Rule 3 - Blocking] Biome import ordering violation**
- **Found during:** Task 1 scoped biome check (`npx biome ci scripts/qa-lib.mjs`)
- **Issue:** Biome requires `node:` protocol imports before third-party imports; the initial file had them interleaved with the `../src/db/schema.ts` import.
- **Fix:** `npx biome check --write scripts/qa-lib.mjs` applied the `organizeImports` safe fix automatically. File then passed `biome ci` with exit 0.
- **Files modified:** `scripts/qa-lib.mjs`

## Wave Gate Results

- **Scoped biome** (`npx biome ci scripts/qa-lib.mjs`): PASSED (exit 0, no errors)
- **`node --check scripts/qa-lib.mjs`**: PASSED (exit 0, valid ESM, no syntax errors)
- **Full `tsc --noEmit`**: PASSED (exit 0, no TypeScript errors — this plan adds no `.ts` files)
- **Full `npx vitest run`**: PASSED — 2090 tests pass, 6 skipped, 0 failed (no regression)
- **e2e**: Orchestrator-owned — not run (this plan adds no specs)
- **Live DB harness**: Not executed — library built against exported-function contracts only (per guardrail)

## Manifest Path Convention

Journey scripts MUST construct manifest paths as:
```js
import { ROOT } from './qa-lib.mjs';
import path from 'node:path';
const manifestPath = path.join(ROOT, 'scripts', `qa-manifest-${runId}.json`);
```
All `scripts/qa-manifest-*.json` files are gitignored (QAJ-03 residue-free).

## Known Stubs

None. The library is fully wired — all helpers export callable functions with correct HTTP contracts and Drizzle inserts. No placeholder data or TODO stubs.

## Threat Flags

No new untrusted network surfaces beyond the plan's threat model. All three threats (T-15-06, T-15-07, T-15-08) mitigated as designed.

## Self-Check: PASSED

**Files confirmed on disk:**
- `scripts/qa-lib.mjs` — FOUND
- `.gitignore` — FOUND (contains `qa-manifest`)

**Commits confirmed in git log:**
- `e7f8e27` (feat(15-02): build scripts/qa-lib.mjs) — FOUND
- `506ab71` (chore(15-02): gitignore generated QA harness manifests) — FOUND
