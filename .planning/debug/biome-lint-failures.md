---
status: diagnosed
trigger: "Investigate Biome lint failures in the LeoCards project - 102 errors and 12 warnings across 75 files"
created: 2026-03-28T00:00:00Z
updated: 2026-03-28T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - three independent root causes identified (CRLF line endings, JSX format style, unsorted imports, and a handful of non-auto-fixable lint violations)
test: Full biome ci + biome check --reporter=summary run across all 75 src files
expecting: n/a - diagnosis complete
next_action: Return ROOT CAUSE FOUND

## Symptoms

expected: biome ci src/ passes with zero errors
actual: 102 errors and 12 warnings across 75 files
errors: biome ci reports 102 errors and 12 warnings
reproduction: run `npx biome ci src/` in LeoCards project
started: unknown - possibly after adding phase 6 files or config changes

## Eliminated

- hypothesis: Nested biome.json files in .claude/worktrees/ cause config conflicts
  evidence: Worktrees are full git worktrees with separate project copies. Running `npx biome ci src/` from project root only scans ./src/ which is governed solely by the project root biome.json. Worktree configs are out of scope.
  timestamp: 2026-03-28

- hypothesis: All format violations are the same type
  evidence: Two distinct format failure causes: (1) 43 files have CRLF line endings (0d 0a confirmed via xxd), (2) LF files have JSX/code style differences (multi-line JSX attributes biome wants collapsed). The `file` command was unreliable for CRLF detection; `grep -qU $'\r'` and `xxd` confirmed actual bytes.
  timestamp: 2026-03-28

## Evidence

- timestamp: 2026-03-28
  checked: npx biome check src/ --reporter=summary
  found: Full breakdown: assist/source/organizeImports=36 errors, format violations=57 files, lint/correctness/useExhaustiveDependencies=5 errors, lint/suspicious/noArrayIndexKey=2 errors, lint/a11y/useAriaPropsSupportedByRole=1 error, lint/a11y/useSemanticElements=1 error, lint/style/noNonNullAssertion=3 warnings, lint/correctness/noUnusedImports=5 warnings, lint/correctness/noUnusedFunctionParameters=2 warnings, lint/style/useImportType=2 warnings, lint/style/useExponentiationOperator=1 info
  implication: Most errors are mechanical (CRLF, import ordering, format style) and auto-fixable. A small subset requires manual code changes.

- timestamp: 2026-03-28
  checked: xxd src/components/app-header.tsx head bytes; xxd src/data/wordlists/en-es.json head bytes
  found: Both show 0d 0a (CRLF). Git config has core.autocrlf=true. No .gitattributes exists. Files were written directly by agents without going through git checkout, so they have CRLF from Windows but biome formatter outputs LF.
  implication: 43 src files have CRLF. biome format --write will normalize all to LF.

- timestamp: 2026-03-28
  checked: biome format src/app/(auth)/forgot-password/page.tsx
  found: LF file with multi-line JSX attributes that biome wants collapsed to single line (e.g., <Button type="submit" className="..." disabled={...}> on one line)
  implication: ~14 LF files have JSX/code style differences. biome format --write will fix these too.

- timestamp: 2026-03-28
  checked: a11y violations via biome ci output
  found: card-list.tsx:120 uses aria prop not supported by its role (useAriaPropsSupportedByRole); study-card.tsx:100 uses div/span where semantic element is needed (useSemanticElements)
  implication: These two are NOT auto-fixable - require manual code fixes.

- timestamp: 2026-03-28
  checked: .claude/worktrees/ biome.json diff vs root biome.json
  found: All 7 worktree biome.json files differ from root - but difference is only CRLF vs LF in the config file content itself (same logical settings). Not a config conflict.
  implication: No worktree config conflict issue. The worktrees are isolated project copies.

## Resolution

root_cause: Three independent causes: (1) PRIMARY - 43 of 75 src files have CRLF line endings (Windows git checkout with autocrlf=true, no .gitattributes to enforce LF); biome formatter outputs LF causing format mismatch. ~14 LF files have JSX style differences biome wants to collapse. Together these account for the 57 format-error files. (2) SECONDARY - 36 files have unsorted/unorganized imports (assist/source/organizeImports) - a safe-fix class. (3) MINOR - 9 manual-fix lint violations: 5x useExhaustiveDependencies, 2x noArrayIndexKey, 1x useAriaPropsSupportedByRole (card-list.tsx:120), 1x useSemanticElements (study-card.tsx:100). Plus 12 warnings (noNonNullAssertion×3, noUnusedImports×5, noUnusedFunctionParameters×2, useImportType×2).
fix: Not applied (diagnose-only mode)
verification: Not applied
files_changed: []
