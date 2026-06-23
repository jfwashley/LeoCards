---
phase: 23-browse-words
plan: "01"
subsystem: daybreak-atoms
tags: [browse-words, daybreak, css-art, rsc, atoms, tdd]
dependency_graph:
  requires: []
  provides:
    - BWMedallion (src/components/daybreak/bw-medallion.tsx)
    - bw-atoms.test.tsx Wave-0 scaffold (src/components/daybreak/__tests__/bw-atoms.test.tsx)
  affects:
    - Plan 23-02 (BWTopicTile + BrowseTiles consumes BWMedallion)
    - Plan 23-03 (BrowseList + word-list-browser re-skin consumes BWMedallion; extends bw-atoms.test.tsx)
tech_stack:
  added: []
  patterns:
    - CSS-art RSC-safe atom (position:relative + absolute children, inline styles, no hooks)
    - "@vitest-environment jsdom rendered-component test with @testing-library/react"
key_files:
  created:
    - src/components/daybreak/bw-medallion.tsx
    - src/components/daybreak/__tests__/bw-atoms.test.tsx
  modified: []
decisions:
  - "D-08: 14 amber topic icons ported as CSS-drawn divs; no icon library; bt.surface→#FFFFFF, bt.fontDisplay→var(--font-display), STk2() typo→STK=2.2"
  - "ICON_MAP as Record<string,ReactNode> keyed by exact category name; TopicIcon returns null for unknown names (no crash)"
  - "TopicIcon function returns ICON_MAP[name] ?? null directly (no extra wrapper div)"
metrics:
  duration: "5m"
  completed: "2026-06-23T09:10:24Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
requirements: [BRW-01]
---

# Phase 23 Plan 01: BWMedallion Atom + Wave 0 Test Scaffold Summary

**One-liner:** CSS-art amber medallion atom covering all 14 CATEGORIES with geometric glyphs, plus a jsdom rendered-component test scaffold for the Browse Words phase.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create BWMedallion atom with 14 CSS-art topic icons (D-08) | bf8e3a3 | src/components/daybreak/bw-medallion.tsx (created) |
| 2 | Create Wave 0 rendered-component test scaffold for BWMedallion | 06ab47d | src/components/daybreak/__tests__/bw-atoms.test.tsx (created) |

## What Was Built

### Task 1: BWMedallion atom

`src/components/daybreak/bw-medallion.tsx` — a pure, RSC-safe presentational atom exporting `BWMedallion({ name, size? })`. Ported 1:1 from `design/handoff-daybreak/daybreak-browse.jsx` `TOPIC_ICON` map:

- `STK = 2.2` stroke weight; `ICON_COLOR = "#F28A1F"` (bt.primary)
- `r()` helper: ring (border + boxSizing:border-box + absolute)
- `l()` helper: line (background + borderRadius:2 + absolute)
- `ICON_MAP: Record<string, React.ReactNode>` — 14 entries, each a 27×26 relative-positioned div containing the geometric glyph
- `TopicIcon({ name })` — returns `ICON_MAP[name] ?? null` (defensive; unknown name renders nothing, no crash)
- `BWMedallion` container: `width:size, height:size, borderRadius:16, background:"#FFF1DC", display:flex, alignItems:center, justifyContent:center, flex:none, aria-hidden="true"`

Translation notes applied per PATTERNS.md:
- `bt.primary` → `"#F28A1F"`
- `bt.surface` → `"#FFFFFF"` (Travel inner circle)
- `bt.fontDisplay` → `"var(--font-display)"` (Numbers "123" span)
- `STk2()` typo (Days & Months) → inline `STK` (= 2.2)

### Task 2: Wave 0 test scaffold

`src/components/daybreak/__tests__/bw-atoms.test.tsx` — first line exactly `// @vitest-environment jsdom`. Three tests:

1. All 14 CATEGORIES render without crashing (iterates `CATEGORIES`, renders + unmounts each)
2. `Food & Drink` at `size={26}` has `borderRadius:"16px"` (jsdom normalizes) and `aria-hidden="true"`
3. Unknown category `"not-a-real-category"` renders without throwing (defensive path)

## Verification Results

| Gate | Result |
|------|--------|
| `npx vitest run bw-atoms.test.tsx` | 3/3 passed |
| `npx biome check bw-medallion.tsx` | clean |
| `npx biome check bw-atoms.test.tsx` | clean |
| `npx tsc --noEmit` (grep bw-medallion) | no type errors |
| No "use client" in bw-medallion.tsx | confirmed |
| No hooks in bw-medallion.tsx | confirmed |
| All 14 category strings present | confirmed |
| No lucide-react import | confirmed |
| background: "#FFF1DC", borderRadius: 16, aria-hidden="true" | confirmed |

## Deviations from Plan

None — plan executed exactly as written.

The one micro-decision (not a deviation): `TopicIcon` returns `ICON_MAP[name] ?? null` directly (no extra wrapper div), since each `ICON_MAP` entry already contains the full 27×26 container div matching the mock's `TG` component. This matches the plan's spec and the mock's architecture.

## Known Stubs

None — `BWMedallion` is a complete, fully-functional atom. The 14 CSS glyphs are described as "CSS placeholder per PROJECT.md; swappable later" per the design intent, but they faithfully reproduce the mock's geometry and are shippable as-is. This is not a stub — it is the intended implementation.

## Threat Flags

None — this plan adds a pure presentational CSS-art atom and a test file. No network, DB, auth, or filesystem access introduced. The `name` prop is used only as a `Record` key to select a static glyph; it is never interpolated into HTML or a style sink.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/components/daybreak/bw-medallion.tsx | FOUND |
| src/components/daybreak/__tests__/bw-atoms.test.tsx | FOUND |
| .planning/phases/23-browse-words/23-01-SUMMARY.md | FOUND |
| Commit bf8e3a3 (Task 1) | FOUND |
| Commit 06ab47d (Task 2) | FOUND |
