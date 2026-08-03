# Phase 28: Native mobile packaging - Context

**Gathered:** 2026-08-03 (discussion started 2026-07-30)
**Status:** Ready for planning — **roadmap restructure required first** (see D-13)

<domain>
## Phase Boundary

**The discussion resolved the roadmap's open approach question with the biggest available answer: LeoCards' mobile apps will be a NATIVE REWRITE, not a packaged webview.** Phase 28 therefore stops being a single packaging phase and becomes a rewrite programme delivered as sub-phases (28.1, 28.2, …) inside v3.0.

What the programme delivers: a **React Native + Expo** app for iOS and Android, backed by the **existing Next.js/Vercel deployment as the single backend** (server-action mutations converted to real, screen-shaped REST `/api/*` route handlers). The web app **stays first-class permanently** — LeoCards becomes a two-surface product on one shared backend.

**Programme close ("shipped") =** installable builds on real devices — **TestFlight (iOS) + Play internal track (Android)** — containing the **core loop + basic account**: sign up/in/out, dashboard, study sessions, manual add-a-word, and the habitat with streamed clips.

**NOT this programme:** public store release (listings, screenshots, review compliance pass), notifications, offline studying/sync, image-to-flashcards and Browse Words native parity, full account-management parity, any app-wide art refresh, retiring or freezing the web app.

**Requirements are still TBD per ROADMAP.md** — mint at roadmap-restructure/plan time (suggest `NAT-01..`), following the Phase 26/27 minting protocol, covering: workspace + shared-package foundation, backend API-ification, native auth, core-loop screens, native habitat, basic account, build/delivery pipeline (EAS → TestFlight/Play internal), identity assets.

</domain>

<decisions>
## Implementation Decisions

### Approach & architecture
- **D-01: Native rewrite.** Capacitor shell, PWA+TWA, and the split approach were all explicitly declined (the shell was Claude's recommendation; Josh chose the rewrite knowingly, accepting months-scale work). Phase 28 becomes a multi-sub-phase programme (see D-13).
- **D-02: Stack = React Native + Expo.** EAS handles iOS+Android builds, signing, and store delivery; OTA updates available. Stays in React/TypeScript so existing domain logic ports.
- **D-03: Backend = the existing Next.js/Vercel deployment, unchanged role.** Server-action mutations convert to real `/api/*` route handlers the RN app calls; better-auth stays (Expo client plugin); Neon/Drizzle/DeepL/Claude untouched. The web app keeps working unchanged throughout the conversion (server actions delegate to the same extracted core functions).
- **D-04: API style = REST route handlers, screen-shaped.** One request per screen load (the PERF-16 consolidation philosophy carried forward), extending the existing `/api/*` conventions; shared zod schemas validate both ends. Perf analysis accepted: REST ≈ tRPC > GraphQL at this scale — round-trip count and payload shape are what matter, not transport style.
- **D-05: Web app stays first-class permanently.** Accepted cost: every future feature is built twice (web UI + native UI) on the shared backend.
- **D-06: Repo layout = same repo, workspaces.** Add `mobile/` (Expo) + `packages/` (shared TS) alongside the root Next.js app. No `apps/web` restructure of the just-certified web app; one git history, one `.planning/`.
- **D-07: Shared domain package(s).** SRS rules, habitat-state maths, zod schemas, and API request/response contract types extracted into `packages/` and imported by BOTH apps — study behaviour and validation identical on web and native by construction.
- **D-08: Habitat clips = stream hosted + cache.** expo-video plays the same hosted `/habitat/clips/*` (PERF-11 immutable headers make device caching trivial); nothing bundled in the binary; clip re-renders never require a store release. Bundling was clarified to be an offline/size trade only — it has zero effect on playback reliability (same native player either way).

### Definition of shipped
- **D-09: Close = installable builds only.** TestFlight + Play internal track on real devices. Public store submission is a separate, later step (deliberately off this programme's critical path).
- **D-10: v1 feature bar = core loop + basic account.** Sign up/in/out, dashboard, study sessions, manual add-a-word, habitat. Image-to-flashcards, Browse Words, and full account management trail in later builds.
- **D-11: Developer accounts — enrol in BOTH early.** Apple Developer (~£79/yr) for TestFlight; Google Play (~£20 one-off) for internal track. Early human-action checkpoints (Apple identity verification can take days); keep off the build critical path.
- **D-13: Roadmap structure = sub-phases inside v3.0** (28.1, 28.2, …), following the v2.1 precedent (13.1/13.2). A new milestone was recommended and declined — v3.0 stays open until the native builds close. The exact sub-phase decomposition is designed at roadmap/plan time.

### Native capability floor (v1)
- **D-14: No notifications in v1.** Deferred entirely — future sub-phase candidate (local notifications scheduled from decay state noted as the cheap first step; remote push needs backend token/send infra).
- **D-15: Online-required v1.** Friendly Leo-branded offline screen with retry; SRS state stays server-authoritative and conflict-free. No sync engineering.
- **D-16: Motion policy = respect system Reduce Motion** (poster fallback, mirroring the web design); everyone else always gets the animated tiger. Because expo-video playback is app-controlled, iOS Low Power Mode can no longer force-freeze the habitat the way Safari autoplay-blocking does on web.

### App identity
- **D-17: Icon/splash art is COMMISSIONED** — real designed art before any build carries the identity (render-the-CSS-Leo was recommended and declined). This is an external dependency: **brief the artist early, in parallel with D-11 enrolment**, so the first TestFlight build never blocks on art delivery. Deliverables: 1024×1024 icon master + splash artwork, Daybreak palette.
- **D-18: Commission scope = icon + splash ONLY.** In-app CSS-drawn Leo/habitat/topic art stays exactly as shipped.
- **D-19: Display name = "LeoCards"** (fits un-truncated on both platforms).
- **D-20: Bundle identifier = `com.joshashley.leocards`** on both stores. Permanent once first-uploaded — never change it.

### Claude's Discretion
- Native navigation library, styling approach (translating Daybreak tokens to RN), and state management choices.
- Shared-package boundaries and build wiring (workspaces config, TS project refs).
- API endpoint naming, error shape, and pagination details (within D-04's screen-shaped rule).
- expo-video caching mechanics, EAS configuration, offline-screen design.
- Small native polish (haptics on grading/level-up, etc.) — nice-to-have, never a requirement.
- Proposed sub-phase decomposition for D-13 (e.g. 28.1 workspace+shared package+API foundation → 28.2 auth+shell → 28.3 core loop → 28.4 habitat → 28.5 delivery pipeline+identity) — subject to the roadmap edit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase charter & requirements protocol
- `.planning/ROADMAP.md` — Phase 28 detail block (charter; its "approach decided at discuss-phase" clause is now RESOLVED by this file — update the block when restructuring per D-13)
- `.planning/REQUIREMENTS.md` — v3.0 requirement definitions; mirror the Phase 26/27 minting protocol when minting `NAT-01..`
- `.planning/PROJECT.md` — §Out of Scope still says "Mobile app — web only" — **superseded by this phase; update it during the roadmap restructure** (also §Constraints "web-first" wording)

### Prior decisions that constrain this programme
- `.planning/phases/25-my-account/25-CONTEXT.md` — the App Store ambition's origin; in-app account deletion (Apple compliance) already shipped on web — native parity needed only before PUBLIC release, not for TestFlight close
- `.planning/phases/27-performance-batch-2/27-CONTEXT.md` — D-03/D-04 session cookieCache + revocation-sensitive `getSessionFresh` split: the native client's auth flows must respect the same semantics when the API layer is built
- `.planning/STATE.md` §Decisions — known-broken `gsd-sdk state.*` verbs on this project (hand-edit STATE.md, verify via `git diff`); Phase 26/27 batching + payload-shape patterns the API handlers must preserve

### Regression gates that must stay green during backend API-ification
- `scripts/qa-run.mjs` (Phase 15 harness) — run after any wave touching study/SRS paths (17 D-10)
- `scripts/perf-recert.mjs` / `npm run perf:recert` (Phase 18, PERF-06) — the one-command perf gate; the web app must keep certifying while its backend is API-ified (D-15/D-14 cadence in `AGENTS.md`)
- `next.config.ts` — PERF-11 immutable clip headers + the D-08 clip-renaming rule (native streaming relies on both)

### Framework caveats
- `AGENTS.md` (repo root) — installed-version docs over training data (Next.js); the same discipline applies to Expo/RN: researcher verifies against installed package docs
- better-auth docs (installed version) — Expo plugin, trustedOrigins, cookie/session behaviour for native clients — verify against the installed package, not training data

</canonical_refs>

<code_context>
## Existing Code Insights

(Scouted 2026-07-30: no PWA/manifest/service-worker/native groundwork exists anywhere — greenfield on the mobile side.)

### Reusable Assets
- **Pure-TS domain modules ripe for `packages/` extraction (D-07):** SRS round/direction/cooldown rules, `computeHabitatState` + decay maths, zod schemas, image/validation constants — all framework-free today
- **Already-client-consumable API routes:** `/api/study/complete`, `/api/translate`, `/api/extract`, `/api/habitat`, better-auth handler — the conversion pattern the remaining server actions follow
- `src/components/habitat-video.tsx` — poster-fallback + `playsInline` behaviour; D-16's native policy mirrors its reduced-motion design
- e2e `*test.local` user convention + `scripts/cleanup-test-users.mjs` — reuse for native/API integration tests

### Established Patterns
- **Screen-shaped payloads** (PERF-15/16) — the REST endpoint design rule (D-04)
- **Batched writes** (26-02 `db.batch()`, 26-03 multi-row insert) — API handlers must reuse the same core functions, not re-implement
- **Session caching semantics** (27-01): cached `getSession()` vs `getSessionFresh()` for revocation-sensitive paths — carries into native auth flows
- **Pushes are releases** (27 D-11): every push to main auto-deploys prod — during API-ification the live web app is affected by every backend change; Josh approves every push

### Integration Points
- `src/lib/auth.ts` — better-auth server config (Expo plugin, trustedOrigins for the native origin)
- Server actions (`src/lib/deck-actions.ts` etc.) — extract shared core functions; actions and new route handlers both delegate to them
- Root `package.json` — workspaces conversion (D-06)
- Phase 18 `perf:recert` + Phase 15 `qa:run` — the safety nets that gate every backend-touching wave

</code_context>

<specifics>
## Specific Ideas

- Josh probed API-style performance directly; locked REST after the analysis that transport is a wash at this scale — **"round trips per screen and payload shape are what matter"** should govern endpoint design.
- **Live bug reported mid-discussion (NOT this phase):** the prod habitat shows a frozen still (poster) instead of the playing clip on Josh's phone. Spawned as a separate investigation task (chip `task_949580c5`); prime suspects are the designed Low Power Mode / Reduce Motion poster fallback vs a real regression (incl. the D-08 stale-immutable-cache trap). D-16 makes this failure class disappear in the native app.
- The core value governs the motion default: the tiger animates for everyone except explicit system Reduce Motion (D-16).
- Identity assets are a **commission** — treat artist brief + delivery like the dev-account enrolment: early, parallel, off the critical path (D-17).

</specifics>

<deferred>
## Deferred Ideas

- **Public store release** — listings, screenshots, store copy, age rating, review-compliance pass (incl. native in-app account deletion parity, required by Apple at public review, not at TestFlight close)
- **Notifications** — local "Leo misses you" decay reminders first, remote push later; strongest native retention lever, own sub-phase
- **Offline studying + sync** (and the lighter read-only offline cache) — online-required v1 stands
- **App-wide commissioned art refresh** (in-app Leo/habitat/topic illustrations) — commission is icon + splash only
- **Domain purchase** (e.g. leocards.app → brand-first bundle ID + nicer prod URL) — declined for now
- **Bundling habitat clips in the binary** — revisit only as a deliberate OFFLINE feature, never as a playback fix
- **Image-to-flashcards + Browse Words native parity** — post-v1 builds
- **Habitat frozen-poster investigation on web** — spun off as task `task_949580c5`, independent of this programme

</deferred>

---

*Phase: 28-native-mobile-packaging*
*Context gathered: 2026-08-03*
