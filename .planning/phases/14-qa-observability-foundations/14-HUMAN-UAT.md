---
status: partial
phase: 14-qa-observability-foundations
source: [14-VERIFICATION.md]
started: 2026-06-17T00:00:00Z
updated: 2026-06-17T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Study-session badge presence/absence
expected: With a valid `leo-qa-mode` cookie (QA-authed), the per-card SRS state badge (`[data-qa-badge]`, monospace, top-right corner) renders on the study card and shows the live cooldown countdown. Without the QA cookie (normal customer), the badge is completely absent from the study DOM.
result: [pending]

### 2. Dashboard card-list badge render + cooldown tick + desktop layout (WR-02)
expected: On the dashboard, QA-authed users see the state badge on each card-list row with a live-ticking cooldown. Verify on BOTH mobile and desktop widths — on desktop (table layout) confirm the badge is positioned correctly in the corner of its row and is NOT misplaced (code review WR-02 flags a possible HTML foster-parenting issue: the badge `<span>` sits directly under `<tr>` before any `<td>`). Customers (no cookie) see no badge.
result: [pending]

### 3. /debug Card SRS state table accuracy
expected: The `/debug` page renders a per-card SRS state table sourced from real card data (round, direction, due/cooldown, paused/learned markers). Spot-check a few rows against the actual database state for the signed-in user; confirm sort works and the table is scoped to the current user's cards only.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
