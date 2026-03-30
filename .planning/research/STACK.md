# Stack Research: LeoCards

**Domain:** Language learning flashcard web app with gamification (virtual tiger habitat)
**Date:** 2026-03-17
**Skills applied:** react-best-practices, frontend-design, typescript-expert, senior-architect, senior-backend, senior-devops, senior-qa, webapp-testing

---

## Recommended Stack

### Core Framework

| Library | Version | Rationale | Confidence |
|---------|---------|-----------|------------|
| Next.js | 15.x (stable) | App Router, server components, route handlers for API proxy — ideal for auth + translation proxy pattern | High |
| React | 19.x | Ships with Next.js 15; concurrent features improve perceived performance during habitat animations | High |
| TypeScript | 5.x | Strict mode required — branded types for domain primitives (CardId, UserId, HabitatLevel) per typescript-expert | High |
| Tailwind CSS | 4.x | Utility-first, zero-runtime CSS — no style conflicts with PixiJS canvas element | High |

### Linting & Formatting

| Library | Rationale |
|---------|-----------|
| Biome | Single tool for lint + format; faster than ESLint+Prettier; TypeScript-first — recommended by typescript-expert |

**Do NOT use:** ESLint + Prettier (two tools doing one job), barrel imports (react-best-practices: bundle size killer)

### Database

| Library | Version | Rationale | Confidence |
|---------|---------|-----------|------------|
| PostgreSQL | 17 | Relational model fits card → deck → user → habitat relationships | High |
| Neon | Latest | Serverless Postgres — scales to zero, Vercel-native, generous free tier | High |
| Drizzle ORM | 0.38+ | Type-safe, lightweight, schema in TypeScript, no magic runtime — preferred over Prisma for Next.js App Router | High |

### Authentication

| Library | Version | Rationale | Confidence |
|---------|---------|-----------|------------|
| Better Auth | 1.x | App Router compatible, email/password built-in, session-based, self-contained | High |

**Do NOT use:** NextAuth v4 (deprecated in App Router), Clerk (vendor lock-in)

### Habitat Rendering

| Library | Version | Rationale | Confidence |
|---------|---------|-----------|------------|
| PixiJS | 8.x | Hardware-accelerated 2D canvas — sprite-based scene for illustrated tiger habitat | High |

**Critical pattern from react-best-practices** — disable SSR via dynamic import:
```ts
// ✅ Correct — prevents hydration errors with canvas
const HabitatScene = dynamic(
  () => import('@/components/habitat/HabitatScene'),
  { ssr: false }
)
```

**Do NOT use:** Three.js (3D overkill), raw Canvas API (too much manual sprite management), CSS-only (can't handle multi-layer animated scene)

### UI Animations

| Library | Version | Rationale | Confidence |
|---------|---------|-----------|------------|
| Motion | 11.x | React-native animations — flashcard flip, milestone unlock reveals, tiger mood transitions. Recommended by frontend-design skill | High |

### Translation API

| Service | Tier | Rationale | Confidence |
|---------|------|-----------|------------|
| DeepL API | Free (500k chars/month) | Best quality for French/Spanish/English; free tier sufficient for manual card entry volume | High |

**Security pattern from senior-backend** — never expose API key client-side:
```ts
// app/api/translate/route.ts — server-side proxy
export async function POST(req: Request) {
  const { text, targetLang } = await req.json()
  // Call DeepL with server-side env var, return result
}
```

### Validation

| Library | Version | Rationale |
|---------|---------|-----------|
| Zod | 3.x | Schema validation shared between client forms and server handlers |
| react-hook-form | 7.x | Pairs with Zod via `@hookform/resolvers`; minimal re-renders on card entry forms |

### Hosting

| Service | Rationale |
|---------|-----------|
| Vercel | Native Next.js deployment, Neon integration, automatic preview URLs, generous free tier |

---

## Performance Patterns (from react-best-practices skill)

Apply these during development — not premature optimization, but architectural decisions:

| Pattern | Where in LeoCards |
|---------|-----------------|
| `dynamic()` with `ssr: false` | HabitatScene (PixiJS), any canvas component |
| `Promise.all()` for parallel fetches | Dashboard load: fetch user + decks + habitat state in parallel |
| Direct imports, no barrel files | All component imports — no `index.ts` re-exports in heavy modules |
| SWR for client-side data | Study session state, deck list (auto-deduplication) |
| `React.cache()` per-request dedup | Habitat state computation on server |
| CSS `content-visibility` | Word list browser (potentially long lists) |

---

## TypeScript Patterns (from typescript-expert skill)

```ts
// Branded types for domain primitives — prevent mixing IDs
type Brand<K, T> = K & { __brand: T }
type UserId = Brand<string, 'UserId'>
type CardId = Brand<string, 'CardId'>
type DeckId = Brand<string, 'DeckId'>
type HabitatLevel = Brand<number, 'HabitatLevel'>
```

**tsconfig.json strict settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "moduleResolution": "bundler",
    "skipLibCheck": true
  }
}
```

---

## What NOT to Use

| Technology | Reason |
|-----------|--------|
| Prisma | Heavy ORM with magic runtime; Drizzle is lighter and more type-safe |
| NextAuth v4 | Deprecated in App Router era |
| Three.js | 3D overkill for 2D illustrated habitat |
| Supabase | Vendor lock-in — Neon + Better Auth is more composable |
| Firebase | MySQL-based, complex pricing, not suitable |
| Barrel imports | react-best-practices: massive bundle size impact, avoid entirely |
| ESLint + Prettier | Replaced by Biome (single tool, faster) |
| Inter / Roboto / system fonts | frontend-design: generic AI aesthetics — choose distinctive fonts |

---

## Project Structure

```
LeoCards/
├── app/
│   ├── (auth)/              # login, signup pages
│   ├── (app)/               # protected app routes
│   │   ├── dashboard/       # habitat view (main screen)
│   │   ├── study/[lang]/    # flashcard session per language
│   │   └── decks/[lang]/    # deck management per language
│   └── api/
│       ├── auth/            # Better Auth handler
│       └── translate/       # DeepL server-side proxy
├── lib/
│   ├── db/                  # Drizzle schema + typed queries
│   ├── study-engine/        # card mastery logic (pure functions, no side effects)
│   └── habitat-engine/      # habitat state computation (pure functions)
├── components/
│   ├── habitat/             # PixiJS scene (SSR-disabled via dynamic import)
│   ├── flashcard/           # card flip UI (Motion animations)
│   ├── decks/               # deck management UI
│   └── ui/                  # shared primitives (buttons, inputs)
└── public/
    └── assets/
        ├── tiger/           # tiger sprites (idle, happy, sad, sleep)
        ├── habitat/         # background layers, props, trees, toys
        └── animals/         # milestone animal sprites
```

---

## Testing Stack (from senior-qa + webapp-testing skills)

| Tool | Purpose | Skill source |
|------|---------|-------------|
| Vitest | Unit tests — pure functions in `study-engine` and `habitat-engine` | senior-qa |
| Python Playwright | E2E tests — full user flows (study session, deck management, habitat progression) | webapp-testing |

**Unit test priorities** (pure functions = easy to test, high value):
```ts
// lib/study-engine — test mastery logic
// lib/habitat-engine — test decay formula, milestone detection
```

**E2E test approach from webapp-testing skill:**
```python
# Reconnaissance-then-action pattern
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')  # CRITICAL: wait before inspecting DOM
    # Then discover selectors, then act
    browser.close()
```

**Use `with_server.py` helper** to manage Next.js dev server lifecycle during E2E runs:
```bash
python scripts/with_server.py --server "npm run dev" --port 3000 -- python tests/e2e/study_flow.py
```

---

## CI/CD & Deployment (from senior-devops skill)

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI pipeline — lint (Biome), typecheck, unit tests on every PR |
| Vercel | CD — automatic deploy on merge to `main`, preview URLs for PRs |

**Environment variables:**
- `DEEPL_API_KEY` — server-side only, set in Vercel dashboard, never in client bundle
- `DATABASE_URL` — Neon connection string, Vercel integration sets this automatically
- `BETTER_AUTH_SECRET` — session signing key, generated once, stored in Vercel env vars

**GitHub Actions pipeline (minimal):**
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx biome check .        # lint + format
      - run: npx tsc --noEmit         # type check
      - run: npx vitest run           # unit tests
```

---

*Stack research complete: 2026-03-17*
