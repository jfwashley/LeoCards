# Milestones

## v1.0 MVP (Shipped: 2026-04-15)

**Phases completed:** 8 phases, 25 plans, 41 tasks

**Key accomplishments:**

- One-liner:
- Five auth/dashboard pages with react-hook-form + Zod validation, Better Auth client integration, and warm tiger brand (orange/amber theme)
- Side-effect import `import "@/env"` wired into layout.tsx so Zod validation runs at app startup; RESEND_API_KEY added to CI Build env block completing the 4-var set
- Suspense boundary on login page unblocks Next.js static prerender; TypeScript strict mode and Biome lint/format all green across 75 files
- CI step order corrected (Build before tsc), DEEPL_API_KEY added to CI env block and .env.example, Biome pinned to 2.4.8 and scoped to src/
- PixiJS 8.x canvas pipeline with SSR-safe dynamic loading, placeholder sprite atlases, ticker visibility control, and server-side habitat state fetch via direct DB query
- Mood-reactive tiger sprite with random positioning and bounce/crossfade transitions, level-gated additive habitat layers with decay fading and parallax, and sparkle particle burst for excited mood — all wired into the PixiJS canvas with level badge and mood indicator overlays
- Mini habitat widget on dashboard with 80px PixiJS canvas and progress bar toward next level; error/offline resilience with localStorage caching and retry; level-up celebration overlay with scale pop animation
- One-liner:
- One-liner:
- Batch milestone INSERT replacing N+1 loop, Math.floor on minutesSinceActivity, language allow-list in createDeck, and clamped celebrate query param

---
