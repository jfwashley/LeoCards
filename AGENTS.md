<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions (hard-won — do not relearn these the expensive way)

## Performance re-cert gate

- Run `npm run perf:recert` after any deploy that touches perf-relevant surfaces (bundle dependencies, shared layout/providers, route pages, `next.config.ts`), and before any release/milestone (D-15).
- Local, on-demand only this phase — no CI integration (D-14). A human runs it when the cadence above applies.
- Red (non-zero exit) → revert or fix forward. Even a FAILED run still writes its dated report to `.planning/phases/18-field-validation-guardrails/measurements/`, marked FAILED (D-07) — that record is part of the evidence trail, never re-edited.
- See `scripts/perf-recert.mjs`'s header comment block for full REQUIRED/OPTIONAL env vars, usage examples, and the D-15 cadence note mirrored there.
