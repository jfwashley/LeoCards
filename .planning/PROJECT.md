# LeoCards

## What This Is

LeoCards is a language learning flashcard website where progress is tied to the wellbeing of a baby tiger and his habitat. The more words a user masters, the richer and more vibrant the tiger's environment becomes — unlocking new toys, trees, play areas, and eventually other animals. It's designed for learners of French, Spanish, and English who want a reason to come back every day beyond raw willpower.

## Core Value

The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

## Current State

**Version:** v3.0 Performance & QA — partial (Phase 14 / QAOB-01..04 shipped; QA-harness + perf deferred). **v4.0 Daybreak** UI redesign in progress (started 2026-06-19) — through Phase 22 Add a Card (ADC-01/02/03) as of 2026-06-23; Phases 23 Browse Words + 24 Habitat remain.
**Live at:** https://leocards.vercel.app
**Tech stack:** Next.js 16, React 19, Better Auth, Drizzle ORM, Neon Postgres, Three.js 0.160 (build-time only — renders habitat clips; never ships to client), Motion 12, Tailwind v4, DeepL, Vercel AI SDK v6 + `@ai-sdk/anthropic` v3 (Claude vision), Vitest, Playwright, Biome
**Tests:** 2044 unit tests green; 15+ Playwright e2e specs
**Requirements satisfied:** 23 (v1.0) + 15 (v2.0) + 21 (v2.1: P12×8, P13×10, P13.1×8 re-satisfied via pivot, 13.2 ad-hoc) across 14 phases

**v2.1 highlights:** Per-card pause/unpause with exact cadence preservation. Habitat is now 3D: 72 pre-rendered Soft-Clay ambient clips (9 levels × 4 moods, seamless 360° orbit loops) with live CSS decay/mood filters — Three.js renders clips at build time and ships zero WebGL to the client. `/habitat` mobile passes all CWV "Good" gates on warm prod (LCP 2417 / TBT 97 / CLS 0 / Perf 96). Secret-gated `/debug` QA console with HMAC-signed virtual state override. Critical study-loop fix: cards can actually reach "learned" (round thresholds were unreachable since Phase 3).

## Current Milestone: v4.0 Daybreak (UI redesign)

**Goal:** Replace LeoCards' utilitarian UI with the warm, cohesive "Daybreak" design system across every primary screen — a friendly, mobile-first visual identity anchored by Leo the lion.

**Target features (per the design handoff in `design/handoff-daybreak/`):**
- **Onboarding & Auth** — signup, forgot/reset password, first-visit welcome (3-step), empty states (Login redesign already prototyped)
- **Dashboard ("My Deck")** — habitat hero, "Start studying" action line, "Your words" inline accordion
- **Add a Card** — type-a-word + from-an-image stepper flows
- **Browse Words** — curated topic tiles → CEFR-filtered word list
- **Habitat** — the living, flat-geometric scene (level-by-level composition; light on mobile + reduced-motion safe)

**Design system:** "Daybreak" — warm cream `#FFF6E9` + amber `#F28A1F`, Baloo 2 (display) + Figtree (body), flat-geometric Leo lion mark. Tokens originate in `design/handoff-daybreak/` (`d1` theme + habitat `PAL`).

**Constraints carried in:**
- Leo + habitat/topic art are **CSS-drawn placeholders** — shippable as-is or swappable for commissioned/icon-library art later, but **keep the Daybreak palette + the level-by-level habitat composition**.
- Habitat ambient motion must stay **light on mobile** and **pause under `prefers-reduced-motion`**.
- **Validated design-system spike already in the tree** (do not re-derive): Daybreak tokens remapped into the Tailwind/shadcn theme, Baloo 2 + Figtree fonts, `src/components/daybreak/` (LionFace + auth scene/card), the auth shell, and the redesigned Login — all verified against the mock.

**Predecessor:** v3.0 Performance & QA shipped Phase 14 (QAOB-01..04) only; QAJ-01..06 + PERF-01..06 are **deferred** (see `MILESTONES.md` and `milestones/v3.0-*`).

## Requirements

### Validated (shipped)

#### v1.0 MVP (shipped 2026-04-15)
- ✓ Users can create accounts and progress is saved across devices
- ✓ Users can study French, Spanish, or English with pre-made word lists
- ✓ Users can manually add words to any language deck (auto-translated, editable)
- ✓ Users can browse built-in word lists and select cards to add to their deck
- ✓ Flashcard practice uses classic show-and-self-grade mechanic
- ✓ A card is "learned" after 3 successful self-graded recalls (3-round spaced mastery with directional tracking)
- ✓ All learned cards across all languages feed into one shared tiger habitat
- ✓ Habitat improves gradually as cards are learned (9-level system; level 9 = Course 1 endgame; refined 2026-05-20 from 10→9 to match 3D designs)
- ✓ Tiger and habitat reflect neglect — hard decay if inactive (2-day grace, 5%/day)
- ✓ Milestone unlocks trigger special moments at key card-count thresholds
- ✓ New animals appear in the habitat as visual rewards for major milestones
- ✓ Users can manage decks for French, Spanish, and English independently

#### v2.0 Image-to-Flashcards (shipped 2026-05-20)
- ✓ Users can pick a JPG/PNG/WebP image (≤5MB) from the add-card flow with preview and pre-selected target deck
- ✓ Claude vision extracts vocabulary words from the image via the protected `/api/extract` endpoint (auth + rate-limit + payload validation + secure failure paths)
- ✓ Users review, edit, and toggle off extracted words before any card is added; duplicates already in the deck are flagged or skipped
- ✓ Kept words are auto-translated via the existing DeepL pipeline (translation editable) and committed in a batched no-tx insert with per-row failure tolerance
- ✓ Cancel paths write nothing; success summary shows the count added

#### v2.1 Living Habitat (closed 2026-06-12; live on prod 2026-05-29)
- ✓ Users can pause/unpause individual cards — paused cards excluded from study + due-counts, SRS state preserved, cadence resumes exactly on unpause — v2.1 (Phase 12)
- ✓ Visual style is cute 3D illustrated habitats — 9 levels × 4 moods as Soft-Clay 3D scenes with tiger + milestone animals as 3D actors — v2.1 (Phase 13; delivery method evolved in 13.1 to pre-rendered ambient clips after live 3D failed on mobile — same visual outcome, CWV-passing)
- ✓ `/habitat` meets CWV "Good" on mobile + desktop — v2.1 (Phase 13.1: warm prod LCP 2417 / TBT 97 / CLS 0 / Perf 96)
- ✓ QA can force any habitat state without touching real data — v2.1 (Phase 13.2: `/debug`, HMAC-signed virtual override)
- ✓ Cards actually reach "learned" through real study sessions — v2.1 (critical fix: round advances on a single correct answer in the presented direction)

### Active

- [ ] v4.0 Daybreak UI-redesign requirements (UI-xx) — being defined during this `/gsd-new-milestone` run (requirements → roadmap); roughly one phase per primary screen, all to the Daybreak design system
- ✓ Validated in v3.0 (partial, Phase 14): QAOB-01..04 — QA observability (QA-mode cookie + `readQaAuth()` gate, per-card state badges, `/debug` SRS table, prod-parity gating)
- ⏸ Deferred to a future milestone: QAJ-01..06 (core-journey QA harness) + PERF-01..06 (performance) — preserved in `milestones/v3.0-REQUIREMENTS.md`

## Out of Scope

- Multiple habitats per language — one tiger, one habitat shared across all languages
- Gamified animal abilities (animals are visual rewards only)
- Social features / shareable habitats — single-player only
- Pronunciation features — audio/speech not in scope
- Mobile app — web only
- Multi-image batch upload (deferred — IMG-F1)
- Live camera capture (deferred — IMG-F2)
- Per-word source-language tagging for mixed-language images (deferred — EXT-F1)
- OCR handwriting accuracy SLA (best-effort only)
- Bulk image-to-deck without a review step (UX decision)
- Storing/retaining uploaded images after extraction (privacy + scope)
- Live client-side 3D rendering on `/habitat` — three live-3D attempts failed on mobile; pre-rendered clips deliver the same visual at a fraction of the cost (decided Phase 13.1)
- Pause-feature extensions (mid-session pause, bulk pause, deck-level pause, auto-unpause, pause history) — captured in Phase 12 CONTEXT, promote only on user demand

## Context

- The name "LeoCards" combines "Leo" (lion/tiger) with flashcards — casual, friendly tone
- The tiger is the emotional anchor of the product; his happiness is the primary motivator
- Hard decay (habitat degrades with inactivity) creates stakes without being punishing with a 2-day grace period
- Pre-made word lists cover A1-B1 French, Spanish, English common vocabulary (14 categories)
- Auto-translation powered by DeepL API; user can override before saving
- Claude vision powers image-to-flashcards extraction; words flow into the same DeepL-translate + edit pipeline as manual entries
- Habitat rendering: 72 pre-rendered ambient video clips (~1.3 MB pair lazy-loads per visit); decay/quality applied as live CSS filter; reduced-motion gets a static poster; Three.js runs only in the build-time render pipeline (`?capture=video`)
- Round cooldowns are env-configurable: zeroed in dev and on preview (`STUDY_NO_COOLDOWN=true`) so QA sees 0→learned in one sitting; real 12h/24h in prod
- `/debug` cheat console live on prod; `DEBUG_CHEAT_SECRET` gates it (feature off when unset)

## Constraints

- **Tech stack**: Next.js 16, Better Auth, Drizzle + Neon, Three.js (build-time only), Vercel AI SDK v6 + `@ai-sdk/anthropic` v3, Biome, Vitest, Playwright
- **Languages**: French, Spanish, English (pre-made lists and image extraction)
- **Scope**: Web-first, single-player
- **Database**: Neon HTTP driver — no transaction support (sequential writes only, per-row failure tolerance in batched commits)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One shared habitat across all languages | Rewards breadth of learning, simpler emotional narrative | ✓ Shipped v1.0 |
| Hard decay on inactivity | Creates real stakes and daily motivation | ✓ Shipped v1.0 |
| Show & self-grade flashcard mechanic | Lowest friction, classic and proven | ✓ Shipped v1.0 |
| 3-round spaced mastery with directional tracking | Evolved from simple 3-4 recalls to 3-round system with 12h/24h cooldowns | ✓ Shipped v1.0 |
| Compute-on-read habitat state | No stored computed columns, no cron jobs — derive from DB facts at request time | ✓ Shipped v1.0 |
| PixiJS 8.x for habitat rendering | WebGL canvas with SSR-safe dynamic loading, ticker visibility control | ⚠️ Superseded v2.1 — replaced by 3D pipeline (Phase 13), then pre-rendered clips (13.1); PixiJS fully removed |
| In-memory rate limiting | Appropriate for current single-server deployment; Redis not needed yet | ✓ Shipped v1.0, reused v2.0 |
| Better Auth additionalFields for custom user columns | nativeLanguage persisted at signup without separate onboarding flow | ✓ Shipped v1.0 |
| Vercel AI SDK v6 + `@ai-sdk/anthropic` for vision | Streamed, typed, dependency-pinned, framework-aligned | ✓ Shipped v2.0 |
| Mandatory review & edit step before image-to-deck commit | Keeps user control over noise / mis-extractions | ✓ Shipped v2.0 |
| Batched commit with per-row failure tolerance on Neon HTTP no-tx | Preserves successful inserts when one row fails; mirrors v1.0 sequential-write constraint | ✓ Shipped v2.0 |
| Unpause shifts `cooldownUntil` forward by exact pause duration | Cadence resumes as if the pause never happened — no lost or gained scheduling | ✓ Shipped v2.1 (Phase 12) |
| Pre-rendered video clips over live Three.js on `/habitat` | 3 live-3D attempts failed mobile CWV + stopped rendering on-device; clips give the same visual, −900 KB JS, Perf 96 mobile | ✓ Shipped v2.1 (Phase 13.1) |
| D-28: dashboard widget = cached image, not live 3D | Live 80px widget measured 21/18 FPS < 30 gate | ✓ Shipped v2.1 (Phase 13) |
| Round advances on a single correct answer in the presented direction | Old `2 n2t + 2 t2n` threshold was unreachable in real sessions — cards never learned, habitat stuck at L1 for everyone | ✓ Shipped v2.1 (critical fix, verified 3 ways) |
| HMAC-signed cookie for QA state override | Forces any habitat state virtually — real data untouched, not forgeable, instantly reversible, off when secret unset | ✓ Shipped v2.1 (Phase 13.2) |
| Certify CWV on warm production only | Cold Vercel previews show ±300 ms TBT noise — larger than the gaps being measured | ✓ Adopted v2.1; binding for v3.0 |

## Known Tech Debt

- Study session writes are sequential, not atomic (Neon HTTP driver constraint — applies project-wide)
- esbuild vulnerability in drizzle-kit deferred (requires breaking downgrade)
- `10-HUMAN-UAT.md`, `11-HUMAN-UAT.md` — intentional deferrals blocked on external resources (real photos + FR/ES tutor; real DeepL + billing-enabled Anthropic keys); archived under `milestones/v2.0-phases/`
- `gsd-sdk phase.complete` upstream bug — ROADMAP-fallback scan can mispick backlog `999.x` as next_phase (`phase.cjs` ~1292–1306); defused locally once 999.1 is absorbed into v3.0; worth an upstream report

*Resolved 2026-06-12 (v2.1 close debt sweep): Nyquist flags on 9/10/11 flipped after retroactive audit; `e2e/11-phase9-image-upload.spec.ts` confirmed tracked + passing (KEEP); biome ci restored to 0 errors; `vitest run` no longer collects e2e specs; 186 e2e test users purged from Neon; placeholder sprites moot (PixiJS removed).*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-23 — Phase 22 (Add a Card / ADC-01/02/03) complete: type-a-word + from-an-image flows redesigned to Daybreak, pipelines preserved. Daybreak now through Phase 22; Phases 23 Browse + 24 Habitat remain.*
