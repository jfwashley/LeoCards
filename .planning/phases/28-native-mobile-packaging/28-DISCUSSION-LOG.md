# Phase 28: Native mobile packaging - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-03 (discussion started 2026-07-30)
**Phase:** 28-native-mobile-packaging
**Areas discussed:** Packaging approach, Definition of shipped, Native capability floor, App identity & listing

---

## Packaging approach

| Option | Description | Selected |
|--------|-------------|----------|
| Capacitor shell (Recommended) | One codebase → both stores; WebView loads hosted app; native plugins for splash/haptics/camera | |
| PWA + TWA | Manifest + SW wrapped as Trusted Web Activity — Android only, no iOS store route | |
| Split: TWA + Capacitor iOS | Lightest tool per store, two packaging systems | |
| Native rewrite | RN/native rebuild — months of work duplicating certified web code | ✓ |

**User's choice:** Native rewrite — chosen knowingly over the recommendation; reshapes Phase 28 into a rebuild programme.

Follow-up structural decisions within the area:

| Question | Options | Selected |
|----------|---------|----------|
| Native stack | **React Native + Expo (Rec.)** / Flutter / Swift+Kotlin / back-to-Capacitor escape hatch | React Native + Expo |
| Backend | **Keep Next.js backend + API-ify (Rec.)** / new standalone API / Expo API routes | Keep Next.js backend + API-ify |
| Web app fate | **Stays first-class (Rec.)** / freezes at current state / retires after apps ship | Stays first-class |
| Repo layout | **Same repo, workspaces (Rec.)** / full monorepo restructure / separate repo | Same repo, workspaces |
| Code sharing | **Shared domain package (Rec.)** / server-authoritative types-only / maximal sharing | Shared domain package |
| API style | **REST route handlers (Rec.)** / tRPC / GraphQL | REST (locked via freeform — see notes) |
| Habitat clips | **Stream hosted + cache (Rec.)** / hybrid bundle-L1 / bundle all 72 | Stream hosted + cache |

**Notes:**
- API style: Josh asked "Which has the best performance?" — answered in prose: transport is a wash at this scale (REST ≈ tRPC > GraphQL; GraphQL adds parse/resolve overhead and N+1 risk); what matters is round trips per screen and payload shape (PERF-15/16 philosophy). Josh: "Happy to lock that in."
- Habitat clips: Josh asked whether bundling all 72 was for performance, revealing that **the prod habitat currently shows a frozen still of the tiger on his phone**. Clarified bundling ≠ playback fix (same native player either way); frozen still = poster fallback, prime suspects Low Power Mode / Reduce Motion / regression. Spun off as separate investigation task chip `task_949580c5`. Decision then made on the honest trade (offline capability vs app size): stream + cache.

---

## Definition of shipped

| Option | Description | Selected |
|--------|-------------|----------|
| Live in both stores (Recommended) | Approved and publicly installable | |
| Submitted to both stores | Uploaded, review may trail | |
| Installable builds only | TestFlight + Play internal track | ✓ |

| Question | Options | Selected |
|----------|---------|----------|
| v1 feature bar | **Core loop + basic account (Rec.)** / full web parity / habit slice only | Core loop + basic account |
| Dev accounts | **Enrol both early (Rec.)** / Apple only + sideload Android / decide at execution | Enrol both early |
| Roadmap structure | **New milestone (Rec.)** / sub-phases inside v3.0 / one mega-phase | Sub-phases inside v3.0 |

**Notes:** New-milestone recommendation declined — v3.0 stays open; 13.1/13.2 sub-phase precedent cited. Sub-phase split (28.1, 28.2, …) to be designed at roadmap/plan time.

---

## Native capability floor

| Option | Description | Selected |
|--------|-------------|----------|
| Local notifications in v1 | On-device decay reminders, no server infra | |
| Defer all notifications (Recommended) | v1 strictly core loop | ✓ |
| Full remote push in v1 | Server-sent push, token + send pipeline | |

| Question | Options | Selected |
|----------|---------|----------|
| Offline behaviour | **Online-required + friendly screen (Rec.)** / read-only offline / offline studying + sync | Online-required + friendly screen |
| Habitat motion policy | Always play + in-app toggle / **Respect Reduce Motion (Rec.)** / respect + one-time nudge | Respect Reduce Motion |

---

## App identity & listing

| Option | Description | Selected |
|--------|-------------|----------|
| Render CSS Leo to raster (Recommended) | Screenshot-render existing mark at 1024px, no external dependency | |
| Commission real art first | Designed icon before any build carries the identity | ✓ |
| Placeholder now, real later | Amber glyph for internal builds | |

| Question | Options | Selected |
|----------|---------|----------|
| Commission scope | **Icon + splash only (Rec.)** / icon + app art refresh / decide after briefing | Icon + splash only |
| Display name | **LeoCards (Rec.)** / Leo | LeoCards |
| Bundle ID | **com.joshashley.leocards (Rec.)** / com.leocards.app / buy domain first | com.joshashley.leocards |

**Notes:** Commission is an external dependency — artist brief goes early, parallel with dev-account enrolment. Public-listing assets (screenshots, store copy, age rating) deferred with the public-release step.

---

## Claude's Discretion

- Native navigation, RN styling approach (Daybreak token translation), state management
- Shared-package boundaries + workspaces wiring; API endpoint naming/error shape/pagination (within screen-shaped rule)
- expo-video caching mechanics, EAS config, offline-screen design, haptics/polish
- Proposed sub-phase decomposition for the roadmap edit

## Deferred Ideas

- Public store release (incl. native account-deletion parity — Apple requires at public review, not TestFlight)
- Notifications (local-first decay reminders → remote push)
- Offline studying + sync; read-only offline cache
- App-wide commissioned art refresh
- Domain purchase (leocards.app)
- Bundling habitat clips as a deliberate offline feature
- Image-to-flashcards + Browse Words native parity (post-v1 builds)
- Habitat frozen-poster investigation on web — task chip `task_949580c5` (independent of this programme)
