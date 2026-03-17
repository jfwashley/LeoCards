# Pitfalls Research: TioCards

**Domain:** Language learning flashcard web app with gamification (virtual tiger habitat)
**Date:** 2026-03-17
**Skills applied:** all 11 skills

---

## Pitfall 1: Decay That Punishes Instead of Motivates

**What goes wrong:** Hard decay with no grace period or no recovery path makes users feel punished for missing a day. They open the app, see their tiger looking terrible and habitat degraded, and feel guilty/demotivated — and stop opening the app entirely. Negative emotion kills return rate faster than anything.

**Warning signs:**
- Decay kicks in after 24 hours
- Large visible degradation for short absence
- No clear "here's how to recover" message

**Prevention:**
- 2-day grace period before any decay starts (constants in code, not DB)
- Linear decay rate (5%/day) — not exponential
- Tiger shows "a bit sad" before habitat visibly degrades
- On return after absence, show "Your tiger missed you!" + quick recovery path (5-card session to stabilize)
- Recovery should feel achievable within one session

**Phase to address:** Habitat Engine phase

---

## Pitfall 2: Gamification Overshadows Learning

**What goes wrong:** Users optimize for habitat growth rather than actual language learning. They mark cards correct when they're not (self-grade inflation), rush through sessions to unlock milestones, and never actually learn words. The gamification beats the purpose.

**Warning signs:**
- No friction between seeing a card and marking it correct
- Milestone unlock triggers during a session (mid-session distraction)
- No mechanism to resurface "learned" cards

**Prevention:**
- Self-grade is honest by design — the only person cheated is the user
- Milestone reveals happen at session end or on dashboard load, never mid-card-flip
- Show vocabulary metrics (words learned per language) alongside habitat progress
- "Learned" cards occasionally resurface (low frequency review keeps them honest)

**Phase to address:** Study Engine + Milestone phases

---

## Pitfall 3: Vocabulary Graveyard

**What goes wrong:** Cards marked "learned" (recall_count ≥ 3) never appear again. User forgets the words within weeks. Habitat stays high but actual knowledge erodes. Users eventually realise they can't remember the words their tiger "earned" — erodes trust in the product.

**Warning signs:**
- `is_learned = true` cards excluded entirely from study sessions
- No low-frequency review of learned cards

**Prevention:**
- Occasional resurfacing: ~10% of a study session is learned cards (random selection)
- If a learned card is missed during resurface, reset recall_count to 1
- This is SRS-lite without full SM-2 complexity

**Phase to address:** Study Engine phase

---

## Pitfall 4: Auto-Translation Errors Poisoning the Deck

**What goes wrong:** DeepL translates ambiguous words incorrectly (e.g. "bark" → tree bark vs dog bark). User saves wrong translation without noticing. Deck fills with errors. User studies wrong words. Realises later and loses trust in the product.

**Warning signs:**
- Auto-translation saved without user confirmation
- No way to flag/edit a saved card's translation
- No disambiguation for multi-meaning words

**Prevention:**
- Translation is always shown for review before saving — never auto-saved
- Edit field pre-populated with DeepL result — one tap to confirm or type correction
- Allow editing any card's translation after saving (card edit UI)
- Consider showing multiple DeepL alternatives for ambiguous words

**Phase to address:** Deck Management + Translation phases

---

## Pitfall 5: Habitat Animation Performance

**What goes wrong:** PixiJS canvas with multiple animated sprites, layered backgrounds, and dynamic state triggers frame drops — especially on mid-range mobile hardware. Habitat becomes laggy, which destroys the emotional impact of the tiger.

**Warning signs (from react-best-practices skill):**
- PixiJS imported without `ssr: false` → hydration crash
- Habitat re-renders on every state update (React causing PixiJS re-init)
- Sprite atlases not used (individual image requests)
- Animations running when tab is not active

**Prevention:**
- Load PixiJS via `next/dynamic` with `{ ssr: false }` — non-negotiable
- Use PixiJS sprite atlases (pack all tiger/habitat sprites into one texture atlas)
- Use CSS `will-change: transform` on animating elements outside PixiJS
- Pause PixiJS ticker when page is not visible (`document.visibilityState`)
- Set a performance budget: 60fps on a mid-range Android device
- Keep milestone unlock animations separate from the main habitat ticker (one-shot, then destroy)

**Phase to address:** Habitat UI phase — establish performance budget early

---

## Pitfall 6: Self-Grade Inflation

**What goes wrong:** Because self-grading has no friction, users over-report success. Cards reach `recall_count = 3` faster than actual mastery. Habitat grows based on fake mastery. User feels good short-term but doesn't actually learn.

**Warning signs:**
- No delay between card reveal and grade buttons
- Grade buttons are large and close together (accidental taps)
- `is_learned` threshold set too low (< 3 recalls)

**Prevention:**
- Brief delay (300ms) after card reveal before grade buttons appear — prevents reflex taps
- Visual separation between "Got it" and "Still learning" buttons
- Threshold is 3–4 recalls (configurable constant, not hardcoded magic number)
- Server validates recall_count server-side at session commit — client can't lie by sending inflated counts

**Phase to address:** Study UI + Study Engine phases

---

## Pitfall 7: Shared Habitat — Language Inequality Feels Unfair

**What goes wrong:** User studies French intensively (100 cards learned) and Spanish casually (5 cards). One language dominates habitat progress. User feels their Spanish effort "doesn't count" or that the system is opaque about contribution.

**Warning signs:**
- No per-language breakdown visible anywhere
- Habitat level calculation is a black box to the user

**Prevention:**
- Dashboard shows a breakdown: "French: 100 cards | Spanish: 5 cards | English: 0 cards"
- Habitat level is sum of all learned cards — transparent formula
- Progress towards next milestone shows total count + what's needed
- Language breakdown helps user decide where to focus next

**Phase to address:** Dashboard / Habitat UI phase

---

## Technical Debt Patterns to Avoid

| Pattern | Risk | Prevention |
|---------|------|------------|
| Storing computed habitat state in DB | Stale data, requires cron jobs | Always compute on read |
| Translation API key in client code | Key exposure, billing abuse | Server-side Route Handler proxy only |
| Per-card API calls during study | Waterfalls, poor UX (react-best-practices) | Batch commit at session end |
| PixiJS without SSR disable | Hydration crash (react-best-practices) | `next/dynamic` with `ssr: false` |
| Barrel imports in component library | Bundle size bloat (react-best-practices) | Direct imports from source files |
| Magic numbers for thresholds | Hard to tune, no context | Named constants with comments |

---

## Security Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| DeepL API key in `.env.local` committed to git | Key leaked, billed for abuse | Add to `.gitignore`, use Vercel env vars |
| No rate limiting on `/api/translate` | Abuse of translation quota | Rate limit by user session (Better Auth) |
| No input sanitisation on card words | XSS via rendered card content | Sanitise user input, use `textContent` not `innerHTML` in PixiJS text |

---

## "Looks Done But Isn't" Checklist

Before marking a phase complete, verify:

- [ ] Habitat state computed fresh on each request (not cached stale value)
- [ ] DeepL key is server-only — confirm with `console.log(process.env.DEEPL_API_KEY)` in a client component (should be `undefined`)
- [ ] PixiJS loads without SSR — confirm no hydration errors in browser console
- [ ] Study session sends one POST at end, not one per card — check Network tab
- [ ] Milestone reveal plays exactly once — test by refreshing after first trigger
- [ ] Decay formula uses `last_activity_at` from DB, not client time

---

## Pitfall-to-Phase Mapping

| Pitfall | Phase |
|---------|-------|
| Decay that punishes | Habitat Engine |
| Gamification overshadows learning | Study Engine + Milestones |
| Vocabulary graveyard | Study Engine |
| Auto-translation errors | Deck Management |
| Habitat animation performance | Habitat UI |
| Self-grade inflation | Study UI + Study Engine |
| Language inequality opacity | Dashboard |

---

*Pitfalls research complete: 2026-03-17*
