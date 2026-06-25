# Phase 15: Core-journey QA harness — Discussion Log

**Date:** 2026-06-25 · *(Human reference only — not consumed by downstream agents.)*

## Context
v3.0 Performance & QA resumed after v4.0 Daybreak shipped. Phase 15 = the core-journey QA harness (QAJ-01..06), building on Phase 14's QA observability surface.

## Areas selected to discuss
User selected all four offered gray areas: Harness form & runner · How it drives the real pipeline · Time compression mechanism · Run target & test-data lifecycle.

## Decisions

### Q1 — Harness form & runner
Options: **Node scripts in scripts/*.mjs** / Playwright specs / Vitest integration.
**Chosen: Node scripts in scripts/*.mjs** (D-01). Rationale: headless, fast, resumable via manifest, matches the existing `scripts/` convention; Playwright harder to resume across runs, Vitest too close to the unit layer this phase exists to backstop.

### Q2 — How it drives the real pipeline
Options: **Real HTTP API routes** / Browser automation / API + browser smoke.
**Chosen: Real HTTP API routes** (D-02). Rationale: the literal "app's own API path" of QAJ-01; fast + deterministic; exercises real server logic. (Research to confirm the exact study-grade endpoint — API route vs server action.)

### Q3 — Time compression
Options: **QA-gated instant time-shift** / Short real cooldowns + waits / Hybrid.
**Chosen: QA-gated instant time-shift** (D-03). Rationale: deterministic, no wall-clock waits, matches QAJ-05's "time-shift" wording. Derived: the time-shift is a new QA-only, prod-absent affordance (D-05) under the QAOB-04 discipline.

### Q4 — Run target & test-data lifecycle
Options: **Local dev server** / Warm prod / Both (local default, prod opt-in).
**Chosen: Local dev server** (D-04). Rationale: correctness is the goal (perf/prod is Phases 16–18); self-provision + self-clean `*test.local` users via cleanup-test-users.mjs (QAJ-06).

## Deferred ideas
- Warm-prod target runs (perf phases own prod).
- Browser-level journey coverage (headless HTTP chosen).
- CI-pipeline automation of the harness (explicitly out of scope for v3.0).

## Claude's discretion (left to research/planning)
Manifest schema for the resumable session, per-journey script layout vs one orchestrator, failure/reporting behavior, exact time-shift surface, and locating the study/SRS grade entry point.
