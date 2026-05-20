# Milestones

## v1.0 MVP (Shipped: 2026-04-15)

**Phases completed:** 8 phases, 25 plans, 41 tasks

**Key accomplishments:**

- Five auth/dashboard pages with react-hook-form + Zod validation, Better Auth client integration, and warm tiger brand (orange/amber theme)
- Side-effect import `import "@/env"` wired into layout.tsx so Zod validation runs at app startup; RESEND_API_KEY added to CI Build env block completing the 4-var set
- Suspense boundary on login page unblocks Next.js static prerender; TypeScript strict mode and Biome lint/format all green across 75 files
- CI step order corrected (Build before tsc), DEEPL_API_KEY added to CI env block and .env.example, Biome pinned to 2.4.8 and scoped to src/
- PixiJS 8.x canvas pipeline with SSR-safe dynamic loading, placeholder sprite atlases, ticker visibility control, and server-side habitat state fetch via direct DB query
- Mood-reactive tiger sprite with random positioning and bounce/crossfade transitions, level-gated additive habitat layers with decay fading and parallax, and sparkle particle burst for excited mood
- Mini habitat widget on dashboard with 80px PixiJS canvas and progress bar toward next level; error/offline resilience with localStorage caching and retry; level-up celebration overlay with scale pop animation
- Batch milestone INSERT replacing N+1 loop, Math.floor on minutesSinceActivity, language allow-list in createDeck, and clamped celebrate query param

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

---

## v2.0 Image-to-Flashcards (Shipped: 2026-05-20)

**Phases completed:** 3 phases (9, 10, 11), 10 plans
**Requirements:** 15/15 satisfied (IMG-01..05, EXT-01..05, RVW-01..05)
**Verifications:** 33/33 (9 + 11 + 13)
**Code review:** 20/20 findings fixed across all 3 phases
**Security:** 32/32 STRIDE threats verified (3 SECURITY.md)
**Tests:** 1773 unit tests green

**Key accomplishments:**

- End-to-end image-to-flashcards pipeline: pick → validate → preview → Claude vision extract → review & edit → DeepL translate → batched commit to deck — fully working in code with 1773 unit tests green
- Protected `/api/extract` endpoint: Better Auth session gate, in-memory rate limit (10 req/min), magic-byte type guard with WEBP subtype check, bounded content-length, no PII logged, secure failure paths; built on Vercel AI SDK v6 + `@ai-sdk/anthropic` v3 with `claude-sonnet-4-6`
- `saveImageCards` server action: bounded array (max 100), per-field validation, combined-WHERE ownership check, per-row failure path on Neon no-tx HTTP driver preserves successful inserts
- ReviewList 6-state reducer with same-language dedupe segregation, two-step DeepL fan-out translate+edit, batched commit, success summary, zero-write cancel
- 20 code-review findings fixed (WEBP subtype check, unified server/client size cap, BCP-47 regex on `targetLanguage` for prompt-injection mitigation, FileReader error wrapping, lazy useReducer initializer, removed silent `"fr"` fallback, …)
- Three SECURITY.md artifacts with file:line evidence for every CLOSED STRIDE threat

**Carried tech debt:** VALIDATION.md `nyquist_compliant` flag-flip pending (Wave-0 tests green); `10-HUMAN-UAT.md` (offline vision eval reference-dataset); `11-HUMAN-UAT.md` (live browser walkthrough — needs real DeepL + billing-enabled Anthropic keys); untracked `e2e/11-phase9-image-upload.spec.ts`.

Full details: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

---
