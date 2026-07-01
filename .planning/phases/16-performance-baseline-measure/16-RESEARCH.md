# Phase 16: Performance Baseline (Measure) — Research

**Researched:** 2026-07-01
**Domain:** Lighthouse-on-authenticated-routes · CWV measurement methodology · Next.js 16 Turbopack bundle composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Baseline MUST measure the REAL authenticated routes, not the `/login` shell. 3 of 4 routes are under `src/app/(protected)/`. The harness authenticates first, reusing Phase-15 `qa-lib.mjs`. Exact mechanism is a research decision.
- **D-02:** Authed routes must render REALISTIC state. Provision a `*test.local` user with a deck + cards via `qa-lib.mjs` before measuring; self-clean after.
- **D-03:** Exactly 4 routes: `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`. `/habitat` is EXCLUDED.
- **D-04:** Each route: (a) human-readable markdown baseline report + (b) raw JSON run data.
- **D-05:** CWV medians from warm Vercel prod (`leocards.vercel.app`) ONLY. Local `next build` ONLY for bundle composition.
- **D-06:** Median, n≥5 runs, mobile + desktop presets. Warm-up discipline: discard cold Vercel hits.
- **D-07:** 3-way bottleneck taxonomy per route: bundle vs RSC waterfall vs hydration.

### Claude's Discretion

- Exact mechanism (Lighthouse-with-session vs Playwright-CWV extension)
- Warm-up hit count, throttling preset details, raw-JSON schema shape, report file naming/location

### Deferred Ideas (OUT OF SCOPE)

- Local `next build && start` CWV as CI-able gate (Phase 18)
- Re-baselining `/habitat` as a regression anchor
- Any actual optimization (Phase 17)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | Codified `scripts/measure-cwv.mjs` + npm script producing warm-prod Lighthouse medians (n≥5, mobile + desktop) for 4 routes | Mechanism confirmed: Lighthouse Node API v13.3.0 with puppeteer-core page auth |
| PERF-02 | Per-route baseline report with bundle composition (`page_client-reference-manifest` / `route-bundle-stats.json`) and ranked bottleneck classification (bundle vs RSC waterfall vs hydration) | Bundle data source confirmed: `.next/diagnostics/route-bundle-stats.json` + `page_client-reference-manifest.js` |
</phase_requirements>

---

## Summary

Phase 16 produces a codified, repeatable measurement harness that replaces the ad-hoc shell commands from 13-PERF-REAL.md. Three prior-art sources define the methodology: the `13-PERF-REAL.md` Lighthouse-CLI-with-cookie-injection run (the pattern to codify), `e2e/13-perf.spec.ts` (solved the authed-route problem with a real browser), and `scripts/qa-lib.mjs` (sign-in + provisioning APIs to reuse).

The central research question — the authed-route measurement mechanism — resolves to **Lighthouse Node API v13.3.0 driven by a `puppeteer-core` page**. The harness signs in via the existing `signUp`/`extractSessionCookie` flow (or a page-based login navigating to `/login`), provisions realistic content via `provision()`, then hands the authenticated `puppeteer-core.Page` directly to Lighthouse's `navigation()` function. This approach was validated by 13-PERF-REAL.md's `--extra-headers Cookie:...` pattern (confirmed working on prod HTTPS), and is further validated by the Lighthouse v13 Node API explicitly accepting a `puppeteer-core.Page` as its first argument. The `puppeteer-core@24.43.1` dependency is already installed by Lighthouse, and Playwright's Chromium binary (`chromium-1208`) is available at a known path on this machine.

For bundle composition, Next.js 16.2.1's Turbopack build produces `.next/diagnostics/route-bundle-stats.json` (already present from the most recent build), which maps each route to `firstLoadUncompressedJsBytes` and `firstLoadChunkPaths`. This is the primary programmatic data source. The `page_client-reference-manifest.js` files under `.next/server/app/(protected)/*/` provide deeper chunk-level fingerprinting.

**Primary recommendation:** Use Lighthouse Node API (`lighthouse/core/index.js`) with a `puppeteer-core` page signed in via `signUp` + cookie injection (or browser-based login navigation). Provision via `qa-lib.mjs` subset (signUp, extractSessionCookie, provision). Use `route-bundle-stats.json` for bundle composition. Discard run 1 as warm-up; take the median of runs 2–6 per route×preset.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CWV measurement (LCP, TBT, CLS, FCP) | Headless browser (Lighthouse/puppeteer-core) | Vercel prod server | Lighthouse runs client-side performance traces against the real prod deployment |
| Auth/provisioning | API tier (prod server + Neon DB) | Node harness script | `signUp` POSTs to prod `/api/auth/sign-up/email`; `provision` writes directly to Neon via Drizzle |
| Bundle composition data | Local build artifacts (.next/) | — | `next build` (Turbopack) emits `route-bundle-stats.json`; no server needed |
| Bottleneck classification | Harness post-processing | — | Computed from LH JSON output (TBT, TTFB, script-eval metrics) + bundle sizes |
| Report output | Filesystem (`.planning/`) | — | Committed markdown + raw JSON artifacts; no runtime dependency |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lighthouse` | 13.3.0 [VERIFIED: package.json in repo] | Produces CWV Perf scores (LCP, TBT, CLS, FCP, Perf score) | Already installed; same version used in 13-PERF-REAL.md; accepts `puppeteer-core.Page` for auth |
| `puppeteer-core` | 24.43.1 [VERIFIED: package.json in repo] | Browser automation for authenticated Lighthouse runs | Installed as Lighthouse peer dep; provides `Browser.newPage()` for auth flow |
| `@neondatabase/serverless` + `drizzle-orm` | (repo deps) [VERIFIED: package.json in repo] | Direct-DB provisioning for `provision()` | Already used by qa-lib.mjs for D-02 state seeding |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs/promises`, `node:path` | Node built-ins | Write raw JSON + markdown reports | Used throughout Phase-15 scripts; no new dep |
| Playwright Chromium | rev 1208 [VERIFIED: AppData/Local/ms-playwright] | Chrome binary for puppeteer-core | Use `CHROME_PATH` env to point puppeteer-core at Playwright's bundled Chromium |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lighthouse Node API + puppeteer-core page | `--extra-headers Cookie:...` CLI approach (13-PERF-REAL.md) | CLI approach is simpler but requires capturing the session token before the run and is harder to iterate; Node API allows auth inside the same process |
| Lighthouse Node API + puppeteer-core page | Playwright PerformanceObserver (e2e/13-perf.spec.ts extension) | Playwright CWV is NOT Lighthouse — PERF-01 requires "Lighthouse medians"; Playwright INP is known-inflated (13-PERF.md). Only use as fallback if puppeteer-core auth is infeasible. |
| `route-bundle-stats.json` | `page_client-reference-manifest.js` eval | Manifest files require `eval()` to parse; `route-bundle-stats.json` is plain JSON with `firstLoadUncompressedJsBytes` already computed. Use manifest files for per-chunk fingerprinting only. |
| `next experimental-analyze` | `@next/bundle-analyzer` | For Turbopack, `@next/bundle-analyzer` is webpack-only. The built-in `next experimental-analyze` works with Turbopack (≥v16.1) and writes to `.next/diagnostics/analyze`. However `route-bundle-stats.json` is simpler and already present. |

**Installation:** No new npm dependencies. All libraries are present.

```bash
# Nothing to install — lighthouse@13.3.0, puppeteer-core@24.43.1,
# @neondatabase/serverless, drizzle-orm are all in devDependencies/dependencies already.
```

---

## Package Legitimacy Audit

No new packages are installed in this phase. All libraries are already present in the repo.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| `lighthouse@13.3.0` | npm | Already installed (devDeps) | Approved — in use since Phase 13 |
| `puppeteer-core@24.43.1` | npm | Already installed (lighthouse dep) | Approved — Lighthouse's own dep |
| `@neondatabase/serverless` | npm | Already installed (deps) | Approved — in use since Phase 1 |
| `drizzle-orm` | npm | Already installed (deps) | Approved — in use since Phase 1 |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
measure-cwv.mjs
│
├─ SETUP PHASE (once per run)
│   ├─ signUp(prodUrl, testEmail, password)  ──────► POST /api/auth/sign-up/email → Neon DB
│   │   └─ extractSessionCookie(res) → token
│   ├─ provision(prodUrl, { cards: [...] })  ──────► Neon DB (direct Drizzle write)
│   └─ Playwright Chromium launch via puppeteer-core
│       └─ page.setCookie('__Secure-better-auth.session_token', token, {
│              domain: 'leocards.vercel.app', secure: true })
│
├─ MEASUREMENT LOOP  [per route × preset × run 1..6]
│   ├─ lighthouse/core/index.js navigation(page, url, { config, flags })
│   │   ├─ mobile preset: formFactor=mobile, throttling=mobileSlow4G, cpuSlowdown=4x
│   │   ├─ desktop preset: formFactor=desktop, throttling=desktopDense4G, cpuSlowdown=1x
│   │   └─ returns RunnerResult { lhr: { categories.performance, audits } }
│   ├─ Extract: LCP, TBT, CLS, FCP, Speed Index, Perf score from lhr.audits
│   └─ Append to raw JSON array for this route×preset
│
├─ MEDIAN COMPUTATION  [after n=6 runs per route×preset]
│   ├─ Discard run 1 (cold Vercel hit)
│   └─ median(runs[1..5]) for each metric
│
├─ BUNDLE COMPOSITION  [read from local .next/ — no prod call]
│   ├─ Parse .next/diagnostics/route-bundle-stats.json
│   │   └─ firstLoadUncompressedJsBytes, firstLoadChunkPaths per route
│   └─ Eval .next/server/app/(protected)/*/page_client-reference-manifest.js
│       └─ entryJSFiles[page] → per-chunk list for fingerprinting
│
├─ BOTTLENECK CLASSIFICATION  [per route]
│   ├─ Bundle signal: firstLoadUncompressedJsBytes (from route-bundle-stats.json)
│   ├─ RSC waterfall signal: server-response-time audit (TTFB) from lhr
│   ├─ Hydration signal: TBT + mainthread-work-breakdown from lhr
│   └─ Rule: highest of (bundle rank, TTFB rank, TBT rank) → top classification
│
├─ CLEANUP
│   └─ node scripts/cleanup-test-users.mjs %@test.local
│
└─ REPORT OUTPUT
    ├─ .planning/phases/16-performance-baseline-measure/baseline/
    │   ├─ {route}-{preset}-runs.json   (raw JSON per route×preset)
    │   └─ {route}-baseline.md          (human-readable report)
    └─ .planning/phases/16-performance-baseline-measure/16-BASELINE-SUMMARY.md
```

### Recommended Project Structure

```
scripts/
└── measure-cwv.mjs           # new: PERF-01 harness

.planning/phases/16-performance-baseline-measure/baseline/
├── dashboard-mobile-runs.json
├── dashboard-desktop-runs.json
├── dashboard-baseline.md     # PERF-02 report
├── study-mobile-runs.json
├── study-desktop-runs.json
├── study-baseline.md
├── deck-new-card-mobile-runs.json
├── deck-new-card-desktop-runs.json
├── deck-new-card-baseline.md
├── deck-browse-mobile-runs.json
├── deck-browse-desktop-runs.json
├── deck-browse-baseline.md
└── 16-BASELINE-SUMMARY.md   # cross-route summary table
```

### Pattern 1: Lighthouse Node API with Puppeteer-Core Page (Recommended Mechanism)

**What:** Launch a `puppeteer-core` browser with Playwright's Chromium binary, sign in on prod, set the session cookie in the browser context, then pass the authenticated page to Lighthouse's `navigation()`.

**When to use:** Any time Lighthouse must measure an HTTPS-authenticated route. Lighthouse v13 fully supports this — the `navigation(page, url, options)` signature is the canonical programmatic API.

**Why this works over `--extra-headers` CLI:**
- No external process spawning or shell quoting
- Auth flow happens in the same process
- The page already has the session cookie in the browser's cookie jar (not a synthetic header), which behaves identically to a real browser session
- Lighthouse does NOT clear httpOnly cookies by default — it only clears file systems, shader cache, service workers, and cache storage (`clearStorageTypes` defaults, verified from `constants.js`)

**Proof sketch:**
```javascript
// Source: node_modules/lighthouse/core/index.js (verified)
import lighthouse from 'lighthouse/core/index.js';
import puppeteer from 'puppeteer-core';

// 1. Launch using Playwright's Chromium binary
const CHROME_PATH = process.env.CHROME_PATH ||
  // Playwright-bundled Chrome (Windows path — confirmed available on this machine)
  'C:\\Users\\jfwas\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

// 2. Auth: sign up a test user on prod, capture session cookie
const res = await fetch('https://leocards.vercel.app/api/auth/sign-up/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Origin is REQUIRED: better-auth's originCheckMiddleware validates it
    // against BETTER_AUTH_URL-derived trustedOrigins (leocards.vercel.app)
    'Origin': 'https://leocards.vercel.app',
  },
  body: JSON.stringify({ email, password, name: 'CWV Tester' }),
});
const token = extractSessionCookie(res); // from qa-lib.mjs (or inline)

// 3. Inject cookie into browser context (not a header — a real browser cookie)
const page = await browser.newPage();
await page.setCookie({
  name: '__Secure-better-auth.session_token',
  value: token,
  domain: 'leocards.vercel.app',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'Lax',
});

// 4. Run Lighthouse — mobile preset
const mobileResult = await lighthouse.navigation(page, url, {
  config: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: { cpuSlowdownMultiplier: 4, rttMs: 150,
                    throughputKbps: 1638, requestLatencyMs: 562 },
      screenEmulation: { mobile: true, width: 412, height: 823,
                         deviceScaleFactor: 1.75 },
      onlyCategories: ['performance'],
    },
  },
  flags: { logLevel: 'silent' },
});

// 5. Extract metrics from lhr
const lhr = mobileResult.lhr;
const lcp = lhr.audits['largest-contentful-paint'].numericValue;
const tbt = lhr.audits['total-blocking-time'].numericValue;
const cls = lhr.audits['cumulative-layout-shift'].numericValue;
const fcp = lhr.audits['first-contentful-paint'].numericValue;
const score = lhr.categories.performance.score * 100;
```

**Desktop preset config:**
```javascript
// Source: node_modules/lighthouse/core/config/desktop-config.js (verified)
config: {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    throttling: { cpuSlowdownMultiplier: 1 }, // no throttle
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
    onlyCategories: ['performance'],
  },
}
```

**Failure modes:**
1. `better-auth FORBIDDEN` — if `Origin` header is missing/wrong in the `signUp` POST. **Mitigation:** Always send `Origin: https://leocards.vercel.app` explicitly; no `Referer` needed.
2. `Lighthouse: page navigated away from about:blank` — if LH tries to navigate before the cookie is set. **Mitigation:** Call `page.setCookie()` BEFORE `lighthouse.navigation()`.
3. Cold Vercel start inflating run 1 — always discard run 1 as the warm-up.
4. `puppeteer.launch()` fails if `CHROME_PATH` is wrong — detect at harness startup and print a helpful error.

### Pattern 2: Bundle Composition from `.next/diagnostics/route-bundle-stats.json`

**What:** Parse the JSON file emitted by `next build` (Turbopack). It contains `firstLoadUncompressedJsBytes` and `firstLoadChunkPaths` per route — exactly what PERF-02 requires.

**When to use:** D-05 says "local `next build` ONLY for bundle composition." This file is the cleanest source.

```javascript
// Source: verified by reading .next/diagnostics/route-bundle-stats.json in this session
const stats = JSON.parse(
  await fs.readFile('.next/diagnostics/route-bundle-stats.json', 'utf8')
);
// stats is an array: [{ route: '/dashboard', firstLoadUncompressedJsBytes: 908658,
//                       firstLoadChunkPaths: ['...', '...'] }, ...]
const routeData = stats.find(s => s.route === '/dashboard');
const firstLoadKb = Math.round(routeData.firstLoadUncompressedJsBytes / 1024);
```

**Current baseline values (from existing .next/ build — Turbopack, 2026-07-01):**
| Route | First-load JS (uncompressed) | Chunks |
|-------|------------------------------|--------|
| `/dashboard` | 887 KB | 15 |
| `/study` | 657 KB | 11 |
| `/deck/new-card` | 1,111 KB | 15 |
| `/deck/browse` | 556 KB | 11 |

> Note: These are from the most recent local build. The harness should always run `next build` fresh before extracting bundle stats, so the baseline matches the exact prod deployment being CWV-measured.

**For deeper chunk fingerprinting**, use `eval()` on the per-route manifest files:
```javascript
// Source: verified by reading .next/server/app/(protected)/dashboard/page_client-reference-manifest.js
globalThis.__RSC_MANIFEST = {};
eval(fs.readFileSync('.next/server/app/(protected)/dashboard/page_client-reference-manifest.js', 'utf8'));
const manifest = Object.values(globalThis.__RSC_MANIFEST)[0];
const pageChunks = manifest.entryJSFiles['[project]/src/app/(protected)/dashboard/page'];
// → ['static/chunks/0x.73w57rn4ou.js', 'static/chunks/0i.l9589uvx0j.js', ...]
```

### Pattern 3: Bottleneck Attribution (D-07)

**What:** Rank each route's dominant cost using three signals from the Lighthouse JSON.

**The 3-way taxonomy:**

| Taxonomy Class | Signal | How to Read from LH JSON |
|----------------|--------|--------------------------|
| **Bundle** | `firstLoadUncompressedJsBytes` (from route-bundle-stats.json) + `bootup-time` audit | `lhr.audits['bootup-time'].numericValue` (total script evaluation time, ms). Routes where this is >300 ms on mobile → bundle-dominant. |
| **RSC waterfall** | `server-response-time` audit (TTFB) | `lhr.audits['server-response-time'].numericValue` (ms). Routes where TTFB > 200 ms → waterfall-dominant (slow RSC data fetch). |
| **Hydration** | `total-blocking-time` + `mainthread-work-breakdown` | `lhr.audits['total-blocking-time'].numericValue`. TBT high with short TTFB and modest bundle → hydration-dominant (React rendering/hydration blocks main thread). |

**Ranking rule (mechanical, per route):**
```
score_bundle    = firstLoadKb / 100 + bootupTime / 500
score_waterfall = ttfb / 50
score_hydration = tbt / 200

top_class = argmax(score_bundle, score_waterfall, score_hydration)
```
The report names the top class and its primary optimization target for Phase 17.

### Anti-Patterns to Avoid

- **Running Lighthouse against `/login` URL for auth routes.** The route returns the redirect shell, not the real page. Always sign in and set the cookie before measuring.
- **Using Playwright PerformanceObserver as the primary CWV source.** PERF-01 explicitly requires "Lighthouse medians." Playwright event-timing INP is inflated by dispatch latency (documented in 13-PERF.md). Use Lighthouse.
- **Importing `qa-lib.mjs` without setting `DEBUG_CHEAT_SECRET`.** The module calls `process.exit(1)` at load time if `DEBUG_CHEAT_SECRET` is unset. The perf harness does NOT use any `/api/debug/` endpoint (prod returns 404 anyway). **Resolution:** Either (a) inline the needed functions (`signUp`, `extractSessionCookie`, `provision`) directly in `measure-cwv.mjs`, or (b) document that runners must set a dummy value: `DEBUG_CHEAT_SECRET=unused-for-perf node scripts/measure-cwv.mjs`. Option (a) is cleaner.
- **Measuring during Vercel cold starts.** Always discard run 1; warm-up discipline is mandatory per D-06.
- **Running mobile + desktop in parallel.** Self-contention inflates both; run sequentially.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Producing Lighthouse scores | Custom CDP performance tracing | `lighthouse/core/index.js` `navigation()` | Lighthouse handles throttle emulation, scoring model, LCP/TBT/CLS attribution, and the exact weights used in prod audits |
| Mobile CPU throttling | `cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })` in plain Playwright | Lighthouse's `throttling.mobileSlow4G` config | Lighthouse uses the simulated throttling model (Lantern) which is consistent across runs; CDP-only throttle in 13-perf.spec.ts was flagged as less reliable |
| Bundle size computation | Walking `.next/static/chunks/` manually | `.next/diagnostics/route-bundle-stats.json` | Already computed by Turbopack at build time; `firstLoadUncompressedJsBytes` is the canonical value used in `next build` output |
| Median computation | Mean or p75 | `array.sort().at(Math.floor(n/2))` on n=5 values | Median over odd-count sets is variance-resistant; p75 requires more runs; mean is skewed by outliers |

---

## Common Pitfalls

### Pitfall 1: better-auth FORBIDDEN on `signUp`/`signIn` POST

**What goes wrong:** The harness sends `POST /api/auth/sign-up/email` without an `Origin` header; better-auth v1.5.6 returns HTTP 403 FORBIDDEN.

**Why it happens:** `better-auth`'s `originCheckMiddleware` runs on all non-GET requests that include a `Cookie` header OR on first-login POSTs. For sign-up (no cookie yet), the check uses Fetch Metadata headers. Without a recognizable `Origin: https://leocards.vercel.app`, the request fails.

**How to avoid:** Send `Origin: https://leocards.vercel.app` in every auth POST. The harness is not a browser and doesn't send it by default with `fetch()`.

**Warning signs:** HTTP 403 with a `INVALID_ORIGIN` error body on sign-up.

### Pitfall 2: Cookie Name Changes Between Environments

**What goes wrong:** On prod HTTPS, the session cookie is `__Secure-better-auth.session_token`. `extractSessionCookie` in qa-lib.mjs matches `better-auth\.session_token=([^;]+)` — this regex matches both the plain (`better-auth.session_token`) and `__Secure-` prefixed form. But `setCookie()` on the page requires the exact prod name including the `__Secure-` prefix.

**Why it happens:** better-auth prepends `__Secure-` when `baseURL` starts with `https://` (verified from `cookies/index.mjs`). `SECURE_COOKIE_PREFIX = '__Secure-'`.

**How to avoid:** When calling `page.setCookie()`, always use the exact cookie name returned in the `Set-Cookie` response header — not a hardcoded string. OR: keep the full cookie as `name=value` and parse at injection time.

**Warning signs:** Lighthouse navigates to the route and gets a redirect to `/login` (cookie not recognized by the server).

### Pitfall 3: Vercel Cold Start Inflating Run 1

**What goes wrong:** The first request to `leocards.vercel.app` after a period of inactivity wakes a cold edge function, adding 300–1000 ms to TTFB and inflating LCP/TBT.

**Why it happens:** Vercel serverless functions have a cold-start window (typically 100–300 ms on Hobby plan). Next.js RSC routes on Vercel are serverless by default.

**How to avoid:** Discard run 1 for every route×preset pair. The warm-up must actually navigate to and load the route (not just ping it); a shallow HEAD request does NOT warm the SSR function. Emit run 1 to raw JSON but exclude from median.

**Warning signs:** Run 1 LCP is >2× the median of runs 2–5 (characteristic of cold starts; observed in 13-PERF-REAL.md habitat-mobile-1: Perf 60 vs warm Perf 77–78).

### Pitfall 4: Lighthouse Resets Storage Between Runs (httpOnly Cookie Lost)

**What goes wrong:** Between sequential Lighthouse runs on the same page, the session cookie may be cleared, causing run 2+ to redirect to `/login`.

**Why it happens:** Lighthouse's `clearStorageTypes` default only clears `['file_systems', 'shader_cache', 'service_workers', 'cache_storage']` — NOT cookies. However, Lighthouse's `--disable-storage-reset` (or `disableStorageReset: false` default) still applies the listed clear. Cookies are NOT in the list.

**How to avoid:** Re-inject the session cookie before each Lighthouse run (it costs ~0 ms). Use `page.setCookie(...)` inside the per-run loop. Alternatively, test after run 1 that the route renders correctly (not a redirect) before trusting subsequent runs.

**Warning signs:** Runs 2+ produce Perf score identical to the public `/login` page (LCP ~600 ms, no dashboard content).

### Pitfall 5: `qa-lib.mjs` `process.exit(1)` on Missing `DEBUG_CHEAT_SECRET`

**What goes wrong:** `import { signUp, extractSessionCookie, provision } from './qa-lib.mjs'` crashes the harness at startup with "FATAL: set DEBUG_CHEAT_SECRET".

**Why it happens:** `qa-lib.mjs` has an unconditional module-level guard at lines 44–50 that exits if `DEBUG_CHEAT_SECRET` is not set. The perf harness does not use `/api/debug/` endpoints.

**How to avoid:** Inline the 3 needed functions (`signUp`, `extractSessionCookie`, `provision`) directly in `measure-cwv.mjs`. This avoids the dependency entirely and keeps the harness self-contained.

**Warning signs:** `FATAL: set DEBUG_CHEAT_SECRET` on startup with no other error.

### Pitfall 6: Turbopack `route-bundle-stats.json` Is Build-Artifact — May Be Stale

**What goes wrong:** The harness reads bundle composition from an old `.next/` build that predates the deployment being measured.

**Why it happens:** `.next/` is not committed; it reflects the last local `next build` run.

**How to avoid:** The harness script must instruct the user to run `npm run build` before running `measure-cwv.mjs`, and should verify that the build artifact's `BUILD_ID` (`.next/BUILD_ID`) matches or is consistent with the deployed commit. Document this in the USAGE section of the script.

**Warning signs:** Bundle sizes in the report don't match what's in the prod deployment.

### Pitfall 7: INP Is Unreliable in This Setup

**What goes wrong:** INP (Interaction to Next Paint) numbers from Lighthouse on Vercel prod are noisy and not reproducible — confirmed by `task_d326ebac` (13-perf follow-up).

**Why it happens:** INP requires an actual user interaction during the Lighthouse trace. Lighthouse can inject a synthetic interaction but the timing is sensitive to machine load. On Turbopack dev server it was especially unreliable.

**How to avoid:** Per D-05, CWV comes from warm prod (not dev). Use TBT as the primary blocking-time proxy for the baseline; note in each report that INP is not measured in this phase. Phase 17 can add INP instrumentation if needed.

---

## Runtime State Inventory

This is a greenfield measurement harness (new `scripts/measure-cwv.mjs`) + report artifacts. No rename/refactor.

> Omitted — not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Lighthouse CLI / Node API | PERF-01 measurement | ✓ | 13.3.0 (devDep) | — |
| `puppeteer-core` | Lighthouse page auth | ✓ | 24.43.1 (LH dep) | — |
| Playwright Chromium | `CHROME_PATH` for puppeteer-core | ✓ | rev 1208 (`C:\Users\jfwas\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe`) | Install via `npx playwright install chromium` |
| Neon DB (`DATABASE_URL`) | `provision()` direct-DB write | ✓ (assumed — same as Phase 15) | — [ASSUMED] | — |
| `leocards.vercel.app` (prod) | CWV measurement target | ✓ (public URL) | — | — |
| `.next/` build artifacts | Bundle composition (D-05) | ✓ (present from recent build) | Turbopack, Next.js 16.2.1 | Run `npm run build` |
| Node.js | All scripts | ✓ | v25.8.1 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — all available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (inferred) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | `measure-cwv.mjs` exits 0 and writes raw JSON files | smoke | `node --check scripts/measure-cwv.mjs` | ❌ Wave 0 |
| PERF-01 | median() helper returns correct median for odd-length arrays | unit | `npm test -- scripts/measure-cwv.test.ts` | ❌ Wave 0 |
| PERF-02 | `route-bundle-stats.json` parse returns correct KB values | unit | `npm test -- scripts/measure-cwv.test.ts` | ❌ Wave 0 |
| PERF-02 | bottleneck classifier assigns correct top class given mock metrics | unit | `npm test -- scripts/measure-cwv.test.ts` | ❌ Wave 0 |

> Note: The actual Lighthouse measurement run (`measure-cwv.mjs` in production mode) is NOT a vitest test — it's a side-effectful script that calls the live prod URL. Its correctness is verified by inspecting its output artifacts, not by automated test assertions.

### Sampling Rate

- **Per task commit:** `npm run lint` (biome ci on touched files)
- **Per wave merge:** `npm test` (full vitest suite)
- **Phase gate:** Full vitest suite green + `scripts/measure-cwv.mjs` dry-run succeeds + all 4 baseline reports committed before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/measure-cwv.test.ts` — covers PERF-01 (median helper), PERF-02 (bundle parser, bottleneck classifier)
- [ ] Minimal fixture: `__tests__/fixtures/route-bundle-stats.fixture.json` — for unit tests

---

## Security Domain

Phase 16 is a measurement harness running locally against prod. It reads from Vercel prod over HTTPS and writes only to `.planning/` (local files). No new server-side code or API endpoints are added.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Harness uses prod auth APIs; no new auth code |
| V3 Session Management | partial | Session token captured and used; never logged (follow qa-lib pattern) |
| V4 Access Control | no | No new routes or endpoints |
| V5 Input Validation | no | Harness reads `.next/` artifacts and LH JSON output; no user input |
| V6 Cryptography | no | Relies on better-auth's existing HTTPS cookie handling |

### Known Threat Patterns

| Pattern | Risk | Mitigation |
|---------|------|------------|
| Session token in logs | LOW | Never `console.log(token)`; follow qa-lib `signUp` pattern (token never logged) |
| Residual test user in prod DB | LOW | `cleanup-test-users.mjs %@test.local` run at end of every harness execution |
| `DEBUG_CHEAT_SECRET` not needed | NONE | Prod server returns 404 on `/api/debug/*`; harness must NOT set this env for prod runs |

---

## Code Examples

### Invoke Lighthouse with authenticated page

```javascript
// Source: node_modules/lighthouse/core/index.js (verified API shape)
import { navigation } from 'lighthouse/core/index.js';

const mobileConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttling: {
      rttMs: 150, throughputKbps: 1638, requestLatencyMs: 562,
      downloadThroughputKbps: 1474, uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: { mobile: true, width: 412, height: 823,
                       deviceScaleFactor: 1.75, disabled: false },
    emulatedUserAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022))...',
    onlyCategories: ['performance'],
    disableFullPageScreenshot: true,  // reduces run time
  },
};

const result = await navigation(page, 'https://leocards.vercel.app/dashboard', {
  config: mobileConfig,
  flags: { logLevel: 'silent' },
});

const { lhr } = result;
const metrics = {
  lcp:   lhr.audits['largest-contentful-paint'].numericValue,  // ms
  tbt:   lhr.audits['total-blocking-time'].numericValue,        // ms
  cls:   lhr.audits['cumulative-layout-shift'].numericValue,    // unitless
  fcp:   lhr.audits['first-contentful-paint'].numericValue,     // ms
  ttfb:  lhr.audits['server-response-time'].numericValue,       // ms
  score: Math.round(lhr.categories.performance.score * 100),   // 0-100
  bootupTime: lhr.audits['bootup-time'].numericValue,           // ms (for bottleneck)
};
```

### Parse bundle stats

```javascript
// Source: verified against .next/diagnostics/route-bundle-stats.json in this session
import { readFile } from 'node:fs/promises';

const stats = JSON.parse(
  await readFile('.next/diagnostics/route-bundle-stats.json', 'utf8')
);
// stats: Array<{ route: string, firstLoadUncompressedJsBytes: number,
//                firstLoadChunkPaths: string[] }>
function getBundleKb(route) {
  const item = stats.find(s => s.route === route);
  if (!item) throw new Error(`Route not found in bundle stats: ${route}`);
  return {
    kb: Math.round(item.firstLoadUncompressedJsBytes / 1024),
    chunks: item.firstLoadChunkPaths.length,
    chunkPaths: item.firstLoadChunkPaths,
  };
}
```

### Median computation

```javascript
// Standard median for n=5 sorted values
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
// For n=5 runs (after discarding run 0): median(runs.slice(1))
```

### Bottleneck classifier

```javascript
// Source: D-07 taxonomy mapped to LH audit IDs
function classifyBottleneck(metrics, bundleKb) {
  // Normalize each dimension to a 0–1 score (higher = more dominant)
  const bundleScore    = Math.min(bundleKb / 800, 1) +
                         Math.min(metrics.bootupTime / 2000, 1);
  const waterfallScore = Math.min(metrics.ttfb / 400, 1);
  const hydrationScore = Math.min(metrics.tbt / 800, 1);

  const max = Math.max(bundleScore, waterfallScore, hydrationScore);
  if (max === bundleScore)    return { class: 'bundle',    score: bundleScore };
  if (max === waterfallScore) return { class: 'RSC waterfall', score: waterfallScore };
  return                              { class: 'hydration', score: hydrationScore };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc bash commands in 13-PERF-REAL.md (manual, 3 runs) | Codified Node.js harness `measure-cwv.mjs` (n≥5, automated) | Phase 16 | Repeatable, self-contained, diffable JSON output |
| Playwright PerformanceObserver (13-perf.spec.ts) | Lighthouse Node API with puppeteer-core page | Phase 16 | Lighthouse scores are the authoritative CWV signal; Playwright INP is inflated (confirmed 13-PERF.md) |
| `@next/bundle-analyzer` (webpack) | Built-in `next experimental-analyze` + `route-bundle-stats.json` (Turbopack) | Next.js 16.1 | No extra package needed; `route-bundle-stats.json` is machine-readable |
| Manual warm-up (trust from memory) | Discard run 1 in code, always run 6 | 13-PERF-REAL.md methodology | Eliminates cold-start outlier contamination |

**Deprecated/outdated:**
- `--form-factor=mobile` CLI flag: replaced by `settings.formFactor` in Node API config (both work in v13, but Node API is the correct path)
- `x-vercel-protection-bypass` header: only needed for Vercel preview deployments with deployment protection enabled. Production `leocards.vercel.app` is publicly accessible — no bypass header required.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `leocards.vercel.app` is publicly accessible (no Vercel SSO/password protection on the production deployment) | Common Pitfalls (Pitfall 3), Standard Stack | If prod has protection enabled, the harness needs the bypass header; easy fix: add `x-vercel-protection-bypass` env var |
| A2 | `DATABASE_URL` pointing at the prod Neon DB is available in the runner's environment (same assumption as Phase 15 QA harness) | Environment Availability | Provisioning will fail; runner must set this env var |
| A3 | The current `.next/` build was produced from the same commit as the current Vercel prod deployment | Bundle Composition patterns | If stale, bundle sizes in the report won't match prod reality; mitigation: document `npm run build` as a prerequisite |

---

## Open Questions

1. **Does `page.setCookie()` in puppeteer-core correctly set a `Secure; HttpOnly; SameSite=Lax` cookie for an HTTPS domain?**
   - What we know: puppeteer-core `Page.setCookie()` accepts a `CookieParam` object with `secure`, `httpOnly`, `sameSite` properties. This is standard DevTools Protocol.
   - What's unclear: Whether Lighthouse's default storage reset interferes with cookies set before the LH run.
   - Recommendation: Verified safe — LH only clears `file_systems`, `shader_cache`, `service_workers`, `cache_storage` by default (not cookies). Re-inject the cookie before each LH run as a defensive measure. (RESOLVED)

2. **Should the harness re-create a fresh test user per route, or reuse one user across all 4 routes?**
   - What we know: Phase-15 pattern provisions per-journey; reusing a user simplifies cleanup but requires the user to have data suitable for all 4 routes.
   - What's unclear: Whether `/study` renders correctly if there are no due cards.
   - Recommendation: Provision once with a deck + 5 cards before the full measurement run. All 4 routes will render non-empty state. (RESOLVED — use one user per full harness run, not per route)

3. **Does `next experimental-analyze` produce route-level data that supersedes `route-bundle-stats.json`?**
   - What we know: `next experimental-analyze` (≥v16.1) writes to `.next/diagnostics/analyze/` and is interactive/visual. `route-bundle-stats.json` already has `firstLoadUncompressedJsBytes` per route.
   - What's unclear: Whether `analyze --output` produces machine-readable per-route KB data.
   - Recommendation: Use `route-bundle-stats.json` for the harness. Run `next experimental-analyze --output` manually only if chunk-level detail is needed for the bottleneck analysis. (RESOLVED)

---

## Sources

### Primary (HIGH confidence)

- `node_modules/lighthouse/core/index.js` — verified `navigation(page, url, {config, flags})` API signature
- `node_modules/lighthouse/core/config/desktop-config.js` — verified desktop preset config
- `node_modules/lighthouse/core/config/constants.js` — verified `clearStorageTypes` defaults (cookies NOT cleared)
- `node_modules/lighthouse/types/puppeteer.d.ts` — verified `puppeteer-core.Page` compatibility
- `node_modules/better-auth/dist/cookies/index.mjs` — verified `__Secure-` prefix on HTTPS, `httpOnly: true`, `sameSite: 'lax'`
- `node_modules/better-auth/dist/api/middlewares/origin-check.mjs` — verified `Origin` header requirement for sign-up POST
- `.next/diagnostics/route-bundle-stats.json` — verified shape (`firstLoadUncompressedJsBytes`, `firstLoadChunkPaths`)
- `.next/server/app/(protected)/dashboard/page_client-reference-manifest.js` — verified `entryJSFiles` structure
- `.next/trace` — confirmed `bundler: "turbopack"` for current `.next/` build
- `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md` — confirmed `next experimental-analyze` (≥v16.1, experimental Turbopack analyzer)
- `scripts/qa-lib.mjs` — verified `DEBUG_CHEAT_SECRET` module-exit guard at lines 44–50
- `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-REAL.md` — methodology origin (warm-prod Lighthouse + cookie injection, proven working)

### Secondary (MEDIUM confidence)

- `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF.md` — Playwright INP inflation confirmed
- `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-FIX-ATTEMPT-1.md` — cold-start variance data, chunk identity sensitivity
- `e2e/13-perf.spec.ts` — Playwright real-browser auth pattern (candidate basis; rejected as primary per PERF-01 Lighthouse requirement)
- Google Lighthouse GitHub authenticated-pages docs (fetched via WebFetch) — confirmed `Puppeteer scripting` is the recommended approach; `--extra-headers` noted as override-only

### Tertiary (LOW confidence)

- None — no claims in this research rely on unverified single sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json + node_modules
- Mechanism (Lighthouse Node API + puppeteer-core): HIGH — verified from LH source + puppeteer-core types + 13-PERF-REAL.md proof-of-concept
- Bundle composition source: HIGH — verified by reading actual .next/diagnostics/route-bundle-stats.json
- better-auth cookie/CSRF behavior: HIGH — verified from better-auth dist source
- Bottleneck taxonomy signals: MEDIUM — LH audit IDs verified from Node API; numeric thresholds for ranking are heuristic

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (Lighthouse 13.x API is stable; Next.js 16.x Turbopack output format unlikely to change within 30 days)
