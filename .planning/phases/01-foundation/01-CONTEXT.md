# Phase 1: Foundation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffold, auth flows, and full DB schema — the prerequisite layer every other phase builds on. A working, deployable project where users can create accounts, log in, and have their identity persisted. No product features yet.

</domain>

<decisions>
## Implementation Decisions

### Post-auth destination
- Login and signup both redirect to `/dashboard` on success
- Unauthenticated access to protected routes → redirect to `/login` with return URL preserved (redirect back after login)
- Root route `/` → redirect to `/login` for unauthenticated users (no landing page in v1)
- Empty dashboard (Phase 1 stub) shows a "coming soon" style placeholder with the user's name — e.g., "Your habitat is being built, [name]." Simple text, no static assets required.

### Auth page look & feel
- Brand-forward tone: warm, friendly, tiger personality from first contact
- Login page: tiger emoji (🐯), "TioCards" wordmark, tagline "Your tiger is waiting."
- Signup/login as separate pages (`/login`, `/signup`) — not a single toggle form
- Inline form errors rendered below each specific field that failed (not top-of-form banners, not toasts)
- Forgot password flow on its own page (`/forgot-password`) linked from login

### Env var discipline
- Zod-validated env parsing via `src/env.ts` — fails loudly at startup if required vars are missing
- Two separate schemas: server-only vars and `NEXT_PUBLIC_*` client vars — enforces the server/client boundary at config level
- `.env.example` committed with all var names and descriptions; `.env.local` gitignored

### CI pipeline
- GitHub Actions, runs on pull_request targeting `main` only (not every push)
- PR gate: `tsc --noEmit` + `biome check` + `next build` — all must pass
- Vitest run included in CI but non-blocking until Phase 3 (engine logic exists by then)
- Vercel preview deployment per PR — connect repo to Vercel project during Phase 1 setup

### Claude's Discretion
- Exact color palette and typography for auth pages (within warm/friendly constraint)
- Specific Tailwind utility classes and component structure
- GitHub Actions YAML structure and runner version
- `.env.example` var grouping and comments

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth
- `.planning/REQUIREMENTS.md` §Authentication — AUTH-01 through AUTH-04 define the full scope of auth for this phase

### Stack decisions
- `.planning/research/SUMMARY.md` §Recommended Stack — full rationale for Next.js 15 + Better Auth + Drizzle + Neon + Biome + Vitest + Vercel

### Schema scope
- `.planning/ROADMAP.md` §Phase 1 Plans — 01-03 specifies "all Drizzle tables for users, decks, cards, recall_events, milestones_seen, habitat metadata" — full schema upfront, not incremental

No external specs beyond planning artifacts — all requirements captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes all patterns for subsequent phases

### Integration Points
- Better Auth session middleware will protect all routes under `/dashboard` and `/api` (except auth endpoints)
- `src/env.ts` will be imported by all modules that need env vars — establishes the single access point for config
- Drizzle schema in `src/db/schema.ts` will be imported by all subsequent phases

</code_context>

<specifics>
## Specific Ideas

- Auth page tagline: "Your tiger is waiting." — sets the emotional hook from first contact
- The dashboard placeholder should address the user by name to make the auth feel real and personalized immediately
- The DB schema in Phase 1 should cover ALL tables for all 6 phases — later phases should not need schema migrations for new tables, only for new columns if truly necessary

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-23*
