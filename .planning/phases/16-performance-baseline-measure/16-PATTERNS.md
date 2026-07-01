# Phase 16: Performance Baseline (Measure) — Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 4 new files + 1 modified file
**Analogs found:** 4 / 4 (all new production files have strong analogs; test file has no prior project analog)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `scripts/measure-cwv.mjs` | harness / orchestrator | batch (sequential route × preset loop, file I/O output) | `scripts/qa-run.mjs` + `scripts/qa-01-learn-card.mjs` + `scripts/qa-lib.mjs` | role-match (same Node ESM harness convention; same auth/provision lifecycle; analogous sequential loop) |
| `scripts/measure-cwv.test.ts` | test | unit (pure function assertions) | no project-level test file exists yet | no analog — Wave 0 gap; use RESEARCH.md patterns |
| `__tests__/fixtures/route-bundle-stats.fixture.json` | fixture | static data | `scripts/qa-manifest-<run-id>.json` pattern (described in qa-lib.mjs `writeManifest`) | partial (same JSON artifact convention) |
| `.planning/phases/16-performance-baseline-measure/baseline/{route}-baseline.md` (×4) | report artifact | file I/O output | `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-REAL.md` | exact (same medians-table + route × profile structure to codify) |
| `package.json` scripts block | config | N/A | existing `qa:run` / `qa:cleanup` entries | exact (naming convention + `node scripts/` invocation pattern) |

---

## Pattern Assignments

### `scripts/measure-cwv.mjs` (harness, batch)

**Primary analog:** `scripts/qa-run.mjs` (orchestration structure, env guards, spawnSync pattern, finally-cleanup)
**Secondary analog:** `scripts/qa-01-learn-card.mjs` (auth + provision lifecycle, sequential assert flow)
**Tertiary analog:** `scripts/cleanup-test-users.mjs` (pattern-guarded destructive op at the end)

---

#### Shebang + module header (copy from `scripts/qa-run.mjs` lines 1–80)

```javascript
#!/usr/bin/env node
// scripts/measure-cwv.mjs — Phase 16 PERF-01/PERF-02
//
// Repeatable CWV measurement harness. Authenticates a *test.local user,
// provisions a deck+cards for realistic state, runs Lighthouse Node API
// (n=6, discard run 1, median of runs 2–6) against warm Vercel prod for
// 4 routes × 2 presets (mobile + desktop), parses local bundle stats,
// classifies per-route bottleneck, writes raw JSON + markdown reports.
//
// ── REQUIRED ENV ─────────────────────────────────────────────────────────
//
//   DATABASE_URL   — Neon Postgres connection string (provision + cleanup)
//   PROD_URL       — prod base URL (default: https://leocards.vercel.app)
//   CHROME_PATH    — path to Chrome binary (default: Playwright chromium-1208)
//
// ── OPTIONAL ENV ─────────────────────────────────────────────────────────
//
//   CLEANUP_DB_URL — DB URL for cleanup (falls back to DATABASE_URL)
//
// ── USAGE ─────────────────────────────────────────────────────────────────
//
//   # Prerequisite: fresh local build for bundle stats
//   npm run build
//
//   # Run the harness:
//   DATABASE_URL="..." node scripts/measure-cwv.mjs
//
// ── SECURITY ──────────────────────────────────────────────────────────────
//
//   - Session tokens are NEVER logged (follow qa-lib pattern).
//   - Provisioned user is *@test.local — cleanup-test-users.mjs reaps it.
//   - DEBUG_CHEAT_SECRET is NOT required; do not set it for prod runs.
```

---

#### Imports block (copy from `scripts/qa-run.mjs` lines 81–87 + adapt)

```javascript
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse/core/index.js';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
```

**Why this shape:** Every scripts/*.mjs in Phase 15 uses this exact `__filename/__dirname/ROOT` trio (lines 85–87 of `qa-run.mjs`, lines 31–33 of `qa-lib.mjs`). Deviate and biome will flag unused imports.

---

#### Env guard (copy from `scripts/qa-run.mjs` lines 89–105, adapt for Phase-16 required vars)

```javascript
// scripts/qa-run.mjs lines 89–105 — the guard shape to copy:
const _dbUrl = process.env.DATABASE_URL;
if (!_dbUrl) {
  console.error(
    '[measure-cwv] FATAL: DATABASE_URL is required (Neon connection string for provisioning + cleanup)',
  );
  process.exit(1);
}

// NOTE: DEBUG_CHEAT_SECRET is intentionally NOT checked here.
// The perf harness does not call /api/debug/* endpoints.
// Importing qa-lib.mjs directly would trigger its module-level exit on
// missing DEBUG_CHEAT_SECRET (qa-lib.mjs lines 44–50) — so the needed
// functions (signUp, extractSessionCookie, provision) must be INLINED
// in measure-cwv.mjs, not imported from qa-lib.mjs.
// See RESEARCH.md Pitfall 5.
```

**Critical divergence from qa-lib.mjs:** Do NOT `import { ... } from './qa-lib.mjs'` — that module exits at load if `DEBUG_CHEAT_SECRET` is missing (qa-lib.mjs lines 44–50). Inline `signUp`, `extractSessionCookie`, and `provision` directly.

---

#### Inlined auth helpers (copy from `scripts/qa-lib.mjs` lines 88–137 and 183–251)

`extractSessionCookie` (qa-lib.mjs lines 88–101):
```javascript
function extractSessionCookie(res) {
  const cookies = res.headers.getSetCookie?.() ?? [
    res.headers.get('set-cookie') ?? '',
  ];
  const token = cookies
    .join('; ')
    .match(/better-auth\.session_token=([^;]+)/)?.[1];
  if (!token)
    throw new Error(
      `No better-auth.session_token in Set-Cookie (status ${res.status})`,
    );
  return token;
}
```

`signUp` (qa-lib.mjs lines 127–137) — **add `Origin` header** (absent in qa-lib.mjs because it targets localhost; prod requires it per RESEARCH.md Pitfall 1):
```javascript
async function signUp(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // REQUIRED on prod HTTPS: better-auth originCheckMiddleware
      // validates Origin against trustedOrigins (RESEARCH.md Pitfall 1)
      'Origin': baseUrl,
    },
    body: JSON.stringify({ email, password, name: 'CWV Tester' }),
  });
  if (!res.ok) {
    throw new Error(`sign-up failed: HTTP ${res.status} for email ${email}`);
  }
  return extractSessionCookie(res);
}
```

`mintTestEmail` (qa-lib.mjs lines 183–188):
```javascript
function mintTestEmail() {
  return `cwv+${Date.now()}+${Math.random().toString(36).slice(2, 4)}@test.local`;
}
```

`provision` inline — copy `getUserId` (lines 168–176) + deck/card Drizzle inserts (lines 210–251). Use `@neondatabase/serverless` + `drizzle-orm` exactly as qa-lib.mjs does. Import `cards, decks` from `'../src/db/schema.ts'` (same path, same approach confirmed working on Node 25.8.1 per qa-lib.mjs lines 53–57).

---

#### Puppeteer-core browser launch + cookie injection (from RESEARCH.md Pattern 1)

```javascript
const CHROME_PATH = process.env.CHROME_PATH
  || 'C:\\Users\\jfwas\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

// Inject cookie before EVERY Lighthouse run (defensive re-inject per RESEARCH.md Pitfall 4)
async function injectCookie(page, token) {
  await page.setCookie({
    name: '__Secure-better-auth.session_token',
    value: token,
    domain: 'leocards.vercel.app',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  });
}
```

**Why `__Secure-` prefix:** better-auth prepends it when `baseURL` is HTTPS (RESEARCH.md Pitfall 2; verified from `node_modules/better-auth/dist/cookies/index.mjs`).

---

#### Lighthouse run loop structure (sequential route × preset, copy cadence from `qa-run.mjs` lines 197–230)

```javascript
// qa-run.mjs lines 197–230 — sequential loop shape to mirror:
for (const journey of JOURNEYS) {
  console.log(`\n[qa-run] --- ${journey.id}: ${journey.name} ---`);
  const exitCode = runJourney(journey.script, journey.args);
  // ...record result...
}
```

For measure-cwv.mjs the analogous structure is:
```javascript
const ROUTES = ['/dashboard', '/study', '/deck/new-card', '/deck/browse'];
const PRESETS = ['mobile', 'desktop'];
const N_RUNS = 6; // discard run 0, median of runs 1–5

for (const route of ROUTES) {
  for (const preset of PRESETS) {
    console.log(`\n[measure-cwv] --- ${route} × ${preset} ---`);
    const runs = [];
    const page = await browser.newPage();
    for (let i = 0; i < N_RUNS; i++) {
      await injectCookie(page, sessionToken); // re-inject before each run (Pitfall 4)
      const result = await lighthouse.navigation(
        page,
        `${PROD_URL}${route}`,
        { config: preset === 'mobile' ? mobileConfig : desktopConfig,
          flags: { logLevel: 'silent' } },
      );
      runs.push(extractMetrics(result.lhr));
    }
    await page.close();
    // Discard run 0 (cold Vercel hit); median of runs[1..5]
    const warmRuns = runs.slice(1);
    const med = computeMedians(warmRuns);
    // write raw JSON...
  }
}
```

**Why sequential not parallel:** RESEARCH.md explicitly warns "Running mobile + desktop in parallel. Self-contention inflates both; run sequentially." Mirror the `qa-run.mjs` sequential `for` loop.

---

#### Metric extraction helper (from RESEARCH.md Code Examples, lines 556–565)

```javascript
function extractMetrics(lhr) {
  return {
    lcp:        lhr.audits['largest-contentful-paint'].numericValue,
    tbt:        lhr.audits['total-blocking-time'].numericValue,
    cls:        lhr.audits['cumulative-layout-shift'].numericValue,
    fcp:        lhr.audits['first-contentful-paint'].numericValue,
    ttfb:       lhr.audits['server-response-time'].numericValue,
    score:      Math.round(lhr.categories.performance.score * 100),
    bootupTime: lhr.audits['bootup-time'].numericValue,
  };
}
```

---

#### Median computation (from RESEARCH.md Code Examples)

```javascript
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function computeMedians(runs) {
  const keys = ['lcp', 'tbt', 'cls', 'fcp', 'ttfb', 'score', 'bootupTime'];
  return Object.fromEntries(
    keys.map(k => [k, median(runs.map(r => r[k]))]),
  );
}
```

---

#### Bundle composition parse (from RESEARCH.md Pattern 2 + Code Examples lines 573–588)

```javascript
async function readBundleStats() {
  const raw = await readFile(
    path.join(ROOT, '.next', 'diagnostics', 'route-bundle-stats.json'),
    'utf8',
  );
  return JSON.parse(raw);
}

function getBundleKb(stats, route) {
  const item = stats.find(s => s.route === route);
  if (!item) throw new Error(`Route not found in bundle stats: ${route}`);
  return {
    kb: Math.round(item.firstLoadUncompressedJsBytes / 1024),
    chunks: item.firstLoadChunkPaths.length,
    chunkPaths: item.firstLoadChunkPaths,
  };
}
```

---

#### Bottleneck classifier (from RESEARCH.md Pattern 3 + Code Examples lines 603–616)

```javascript
function classifyBottleneck(metrics, bundleKb) {
  const bundleScore    = Math.min(bundleKb / 800, 1) +
                         Math.min(metrics.bootupTime / 2000, 1);
  const waterfallScore = Math.min(metrics.ttfb / 400, 1);
  const hydrationScore = Math.min(metrics.tbt / 800, 1);

  const max = Math.max(bundleScore, waterfallScore, hydrationScore);
  if (max === bundleScore)    return { class: 'bundle',        score: bundleScore };
  if (max === waterfallScore) return { class: 'RSC waterfall', score: waterfallScore };
  return                              { class: 'hydration',    score: hydrationScore };
}
```

---

#### Report file I/O (copy from `qa-lib.mjs` `writeManifest` lines 406–413, plus `node:fs/promises` mkdir pattern)

```javascript
// qa-lib.mjs lines 406–413 — atomic write pattern to mirror:
async function writeManifest(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fs.promises.rename(tmp, filePath);
}

// For measure-cwv.mjs: ensure output directory exists first (mkdir not in qa-lib)
const OUT_DIR = path.join(ROOT, '.planning', 'phases',
  '16-performance-baseline-measure', 'baseline');
await mkdir(OUT_DIR, { recursive: true });

// Then write raw JSON atomically:
const jsonPath = path.join(OUT_DIR, `${slug}-${preset}-runs.json`);
const tmp = `${jsonPath}.tmp`;
await writeFile(tmp, JSON.stringify({ route, preset, runs, medians }, null, 2), 'utf8');
// use node:fs rename for atomicity (same as writeManifest)
```

---

#### Cleanup in finally block (copy from `qa-run.mjs` lines 232–268)

```javascript
// qa-run.mjs lines 232–268 — always-cleanup pattern to copy exactly:
try {
  // ... measurement loop ...
} finally {
  await browser.close();

  const cleanupEnv = {
    ...process.env,
    CLEANUP_DB_URL: process.env.CLEANUP_DB_URL ?? process.env.DATABASE_URL,
  };
  console.log('\n[measure-cwv] --- Cleanup: remove *@test.local users ---');
  const cleanupScript = path.join(ROOT, 'scripts', 'cleanup-test-users.mjs');
  const cleanupResult = spawnSync(
    process.execPath,
    [cleanupScript, '%@test.local'],
    { stdio: 'inherit', env: cleanupEnv },
  );
  if ((cleanupResult.status ?? 1) !== 0) {
    console.error('[measure-cwv] CLEANUP FAILED — test user may remain in DB');
  }
}
```

---

#### Summary console output (copy from `qa-run.mjs` lines 272–310)

```javascript
// qa-run.mjs lines 272–310 — results table pattern:
console.log('\n[measure-cwv] ============================================================');
console.log('[measure-cwv] RESULTS SUMMARY');
console.log('[measure-cwv] ============================================================');
for (const [key, r] of results) {
  const marker = r.ok ? ' ' : 'X';
  console.log(`[measure-cwv]  [${marker}] ${key.padEnd(24)}  ${r.ok ? 'OK' : 'FAIL'}`);
}
if (allOk) {
  console.log('[measure-cwv] ALL ROUTES MEASURED — baseline artifacts written.');
  process.exit(0);
} else {
  console.error('[measure-cwv] FAIL — see output above.');
  process.exit(1);
}
```

---

#### Logging discipline (from qa-lib.mjs security notes lines 17–21 + qa-run.mjs lines 72–79)

```javascript
// NEVER log session tokens, passwords, or cookie values.
// These console.log calls are the correct pattern (qa-lib.mjs lines 232–247):
console.log(`[measure-cwv] provisioned user ${email} deck ${deckId}`);
console.log(`[measure-cwv] provisioned ${cardIds.length} card(s)`);
// The email is safe to log; the sessionToken is NOT.
// Never: console.log(`token=${sessionToken}`) — same rule as qa-lib.mjs
```

---

### `scripts/measure-cwv.test.ts` (test, unit)

**No project-level analog exists.** The Phase 15 QA scripts have no corresponding vitest test files. Use RESEARCH.md Validation Architecture (lines 469–497) as the spec for what to cover.

**Vitest config to follow** (`vitest.config.ts`):
- `environment: 'node'` (already configured)
- `setupFiles: ['./src/test-setup.ts']`
- `resolve.alias: { '@': path.resolve(__dirname, './src') }`
- Test file location: `scripts/measure-cwv.test.ts` (vitest collects `**/*.test.ts` by default; scripts/ is not excluded)

**What to test (from RESEARCH.md lines 480–497):**

| Test | What to Assert |
|------|----------------|
| `median()` | `median([300,100,200,400,500])` === 300 (sorted mid); single-element; even-length (floor) |
| `getBundleKb()` | Given fixture JSON, returns correct `kb` and `chunks` count |
| `classifyBottleneck()` | High bundle score → `'bundle'`; high TTFB → `'RSC waterfall'`; high TBT → `'hydration'` |
| `computeMedians()` | Five-run array produces correct per-key medians |

**Fixture pattern:** Write fixture at `__tests__/fixtures/route-bundle-stats.fixture.json` (directory must be created by the Wave 0 task). Fixture shape mirrors `.next/diagnostics/route-bundle-stats.json` (verified shape from RESEARCH.md lines 296–305):

```json
[
  { "route": "/dashboard",    "firstLoadUncompressedJsBytes": 887000, "firstLoadChunkPaths": [] },
  { "route": "/study",         "firstLoadUncompressedJsBytes": 657000, "firstLoadChunkPaths": [] },
  { "route": "/deck/new-card", "firstLoadUncompressedJsBytes": 1111000, "firstLoadChunkPaths": [] },
  { "route": "/deck/browse",   "firstLoadUncompressedJsBytes": 556000, "firstLoadChunkPaths": [] }
]
```

**Vitest test structure to use** (inferred from zod/better-auth node_modules tests and vitest config):
```typescript
import { describe, expect, it } from 'vitest';
// Import pure helpers from measure-cwv.mjs OR extract them to a
// separate measure-cwv-lib.mjs module to make them importable without
// triggering the top-level async harness (same problem as qa-lib.mjs
// module-level guard). Planner should decide: extract helpers or use
// a `if (import.meta.url === pathToFileURL(process.argv[1]).href)`
// main-guard at the bottom of measure-cwv.mjs.
```

---

### `.planning/phases/16-performance-baseline-measure/baseline/{route}-baseline.md` (×4) (report artifact, file I/O)

**Analog:** `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-REAL.md` (the exact format to codify)

**Report format to replicate** (from 13-PERF-REAL.md):

```markdown
# Phase 16 Baseline — /dashboard

**Date:** <ISO date>
**Harness:** scripts/measure-cwv.mjs (Lighthouse 13.3.0, puppeteer-core 24.43.1)
**Target:** https://leocards.vercel.app/dashboard (warm prod)
**Runs:** 6 per preset; run 1 discarded (cold Vercel hit); median of runs 2–6
**Auth:** *@test.local provisioned user with deck + 5 cards

## Medians

| Profile | LCP (ms) | TBT (ms) | CLS | FCP (ms) | TTFB (ms) | Perf Score |
|---------|----------|----------|-----|----------|-----------|------------|
| mobile  | ...      | ...      | ... | ...      | ...       | ...        |
| desktop | ...      | ...      | ... | ...      | ...       | ...        |

## Bundle Composition

| Metric | Value |
|--------|-------|
| First-load JS (uncompressed) | ... KB |
| Chunk count | ... |

## Bottleneck Classification

**Top class:** [bundle | RSC waterfall | hydration]
**Primary Phase-17 target:** [specific optimization to address]

## Raw Runs

See `dashboard-mobile-runs.json` / `dashboard-desktop-runs.json`.
```

**13-PERF-REAL.md structure observations** (lines 16–48):
- Raw runs table first (all individual run data)
- Medians table second (the decision data)
- Verdict / classification text last
- Cold-run annotation inline (e.g., `habitat-mobile-1 (cold)` callout at line 28)

---

### `package.json` scripts block (config)

**Analog:** existing `qa:run` / `qa:cleanup` entries

**Pattern to copy** (current scripts lines from package.json):
```json
"qa:run":     "node scripts/qa-run.mjs",
"qa:cleanup": "node scripts/cleanup-test-users.mjs %@test.local"
```

**New entries to add:**
```json
"measure:cwv":     "node scripts/measure-cwv.mjs",
"measure:cleanup": "node scripts/cleanup-test-users.mjs %@test.local"
```

`measure:cleanup` is a convenience alias (same command as `qa:cleanup`) for documentation clarity. Naming follows the `<domain>:<action>` convention established by `qa:run` / `qa:cleanup` / `posters:habitat` / `clips:habitat`.

---

## Shared Patterns

### Auth: session cookie capture and injection

**Source:** `scripts/qa-lib.mjs` lines 88–137
**Apply to:** `scripts/measure-cwv.mjs` (inlined, not imported — see Pitfall 5)

The regex `better-auth\.session_token=([^;]+)` matches both the plain and `__Secure-` prefixed cookie names from `getSetCookie()`. The exact cookie name for `page.setCookie()` must come from the response header, not a hardcoded string — use the full `Set-Cookie` value or parse the exact name at injection time (RESEARCH.md Pitfall 2).

### Destructive op guard: pattern-restricted cleanup

**Source:** `scripts/cleanup-test-users.mjs` lines 22–25
**Apply to:** Any harness that calls cleanup

```javascript
// cleanup-test-users.mjs lines 22–25 — the guard every harness relies on:
if (!/@(leocards-)?test\.local$/.test(PATTERN)) {
  console.error(`FATAL: refusing pattern "${PATTERN}" — must target a *test.local domain`);
  process.exit(1);
}
```

The harness must always pass `'%@test.local'` (never a production domain) to the cleanup script.

### File I/O: atomic JSON write

**Source:** `scripts/qa-lib.mjs` `writeManifest` lines 406–413
**Apply to:** `scripts/measure-cwv.mjs` raw JSON output

Write to `.tmp` then rename. The `writeManifest` function is not importable (qa-lib module-level guard), so replicate the two-line pattern inline.

### Logging discipline: never log tokens/secrets

**Source:** `scripts/qa-lib.mjs` lines 17–21 (security notes)
**Apply to:** `scripts/measure-cwv.mjs`

Log the provisioned email (safe). Never log `sessionToken`, `password`, or cookie values. `console.error` for FATAL conditions; `console.log` with `[measure-cwv]` prefix for progress (mirrors `[qa-lib]`, `[qa-run]` prefix convention).

### Environment guard: module-level exit on missing required vars

**Source:** `scripts/qa-run.mjs` lines 89–105; `scripts/cleanup-test-users.mjs` lines 14–17
**Apply to:** `scripts/measure-cwv.mjs` top-of-file (before any async work)

```javascript
// Pattern from qa-run.mjs + cleanup-test-users.mjs:
const _dbUrl = process.env.DATABASE_URL;
if (!_dbUrl) {
  console.error('[measure-cwv] FATAL: DATABASE_URL is required');
  process.exit(1);
}
```

### ROOT resolution

**Source:** `scripts/qa-run.mjs` lines 85–87; `scripts/qa-lib.mjs` lines 31–33
**Apply to:** `scripts/measure-cwv.mjs`

```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
```

All file paths (`.next/diagnostics/route-bundle-stats.json`, output dirs) must be resolved from `ROOT` — never use relative `./` paths in a spawned script context.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/measure-cwv.test.ts` | test | unit | No project-level vitest tests exist; the QA scripts have no test counterparts. Use RESEARCH.md Validation Architecture (lines 469–497) as spec. |
| `__tests__/fixtures/route-bundle-stats.fixture.json` | fixture | static | No `__tests__/fixtures/` directory exists yet; must be created. Shape verified from `.next/diagnostics/route-bundle-stats.json`. |

---

## Metadata

**Analog search scope:** `scripts/`, `e2e/`, `.planning/milestones/v2.1-phases/13-3d-habitat/`
**Files read:** `scripts/qa-lib.mjs`, `scripts/qa-run.mjs`, `scripts/qa-01-learn-card.mjs`, `scripts/cleanup-test-users.mjs`, `e2e/13-perf.spec.ts`, `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-REAL.md`, `package.json` (scripts block), `vitest.config.ts`
**Pattern extraction date:** 2026-07-01
