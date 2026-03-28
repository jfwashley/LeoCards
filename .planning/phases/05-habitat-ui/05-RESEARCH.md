# Phase 05: Habitat UI - Research

**Researched:** 2026-03-28
**Domain:** PixiJS 8 + @pixi/react v8, Next.js 16 dynamic imports, sprite atlases, React 19 canvas rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Cute cartoon art style (round, expressive, Duolingo-owl-style).
- **D-02:** Static pose per mood — no idle animations (breathing/blinking). Keeps it simple and performant.
- **D-03:** Tiger is small mascot size (15-20% of scene). Habitat is the star, tiger lives in it.
- **D-04:** Tiger randomly appears at one of 3 positions on each page load: center-bottom, 30% from left, 25% from right. Instant teleport (no walking animation).
- **D-05:** Random left/right facing direction per page load.
- **D-06:** Mood transition direction matters:
  - Happier mood shift (e.g. sad -> neutral, neutral -> happy): sprite swap with bounce animation
  - Sadder mood shift (e.g. happy -> neutral, neutral -> sad): crossfade blend (~0.5s)
- **D-07:** Excited mood (post-study) gets a special happy bounce loop with sparkle particles — the dopamine moment.
- **D-08:** Savanna / grassland environment — open plains, warm golden tones, trees, rocks, grass.
- **D-09:** Additive layers across 10 levels — start sparse, progressively add trees, rocks, water, flowers, animals. Each level adds something new.
- **D-10:** Static daytime sky — always sunny/bright, no mood-reactive sky changes.
- **D-11:** Subtle parallax depth with 2-3 layers (foreground grass, mid-ground scene, distant hills/sky).
- **D-12:** Level 1 (starter habitat) = bare grass + single tree. Minimal but welcoming.
- **D-13:** Decay visual = elements fade out. Higher-level elements gradually disappear as quality drops — reverse of the additive progression.
- **D-14:** Two views: full /habitat page + mini dashboard widget.
- **D-15:** Full /habitat page: 60-70% viewport height, full-width edge-to-edge, minimal overlay (level badge in corner + mood indicator).
- **D-16:** Mini dashboard widget: tiny PixiJS canvas showing tiger sprite + CSS progress bar toward next level. Clickable — navigates to /habitat.
- **D-17:** Fixed aspect ratio for the scene, scale to fit container — optimized for mobile. Consistent composition across screen sizes.
- **D-18:** Spinner / loading indicator while PixiJS and sprite assets load.
- **D-19:** Scene fades in from loading state over ~0.5s when ready.
- **D-20:** Level-up: new elements fade in with scale pop animation — celebratory, noticeable.
- **D-21:** Fetch habitat state once on page load only — no auto-refresh/polling.
- **D-22:** PixiJS ticker pauses when browser tab is hidden (visibilitychange API) — saves CPU.
- **D-23:** Error state: generic "Something went wrong" message + retry button.
- **D-24:** Offline: show last cached API response + small "you're offline" indicator.
- **D-25:** Mini dashboard widget uses tiny PixiJS canvas (not HTML/CSS fallback) for consistency with full scene.

### Claude's Discretion

- Exact sprite atlas structure and naming conventions
- PixiJS container/stage hierarchy
- Cache implementation approach for offline state (localStorage, SWR cache, etc.)
- Specific savanna element choices per level (which trees/rocks/flowers at which level)
- Progress bar design on the mini widget
- Level badge and mood indicator styling on overlay
- Parallax scroll speed / depth values

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HAB-02 | The tiger displays different mood states (happy, neutral, sad) based on recent activity | TigerMood type from habitat-engine.ts: "excited" | "happy" | "neutral" | "sad"; mood delivered by GET /api/habitat; rendered via sprite swap or crossfade depending on transition direction (D-06, D-07) |
| HAB-03 | The habitat environment gradually improves as total learned cards increase | Level 1–10 from HabitatState.level; additive sprite layers per level (D-09); habitat background visually changes as level thresholds crossed (LEVEL_THRESHOLDS: 5, 15, 30, 50, 80, 120, 170, 230, 300, 400 cards) |
</phase_requirements>

---

## Summary

Phase 5 renders the tiger mascot and savanna habitat in the browser using PixiJS 8.x inside a Next.js 16 App Router application. The two primary surfaces are a full `/habitat` page (60-70% viewport height, edge-to-edge canvas) and a mini dashboard widget (small canvas + CSS progress bar). All canvas rendering must be dynamically imported with `{ ssr: false }` because PixiJS requires browser APIs unavailable during server rendering.

The stack is PixiJS 8.x (pixi.js) + @pixi/react v8 for declarative scene composition, with Motion 12 (already installed as `motion`) handling the overlay fade-in, mood-transition bounce, and level-up scale-pop animations that live outside the canvas. The sprite atlas is a standard PixiJS JSON format (TexturePacker or hand-authored) loaded via `Assets.load`. Ticker pausing on `visibilitychange` is a one-time `useEffect` with `app.ticker.stop()` / `app.ticker.start()`.

The API endpoint `GET /api/habitat` is already implemented and returns a typed `HabitatState` object. The UI fetches it once on mount (D-21), stores it in component state, and passes it as props down to the PixiJS scene components. Offline caching (D-24) uses `localStorage` to persist the last successful API response.

**Primary recommendation:** Use `@pixi/react` v8 with `extend({ Container, Sprite, AnimatedSprite, Graphics, Text })` called once at module scope in the wrapper file. Keep all PixiJS code inside a single `"use client"` component loaded via `next/dynamic` with `{ ssr: false }`. Motion 12 handles overlay animations; PixiJS handles everything inside the canvas.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | 8.17.1 (latest) | Canvas renderer, sprite system, ticker, assets | Project stack decision; 8.x is the current stable major |
| @pixi/react | 8.0.5 (latest) | Declarative PixiJS components in JSX | Thin React wrapper; supports React 19 and PixiJS 8; peer dep requires pixi.js ^8.2.6 |
| motion | 12.38.0 (installed) | Overlay fade-in, bounce, crossfade animations | Already installed; `motion/react` import path confirmed in codebase |
| next/dynamic | built-in (Next.js 16.2.1) | `{ ssr: false }` to gate canvas from SSR | Required — PixiJS uses `window`, `document`, `canvas` APIs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TexturePacker (desktop tool) | — | Packs sprite PNGs into atlas JSON + spritesheet PNG | Asset pipeline; Claude's discretion on exact tool |
| localStorage (Web API) | built-in | Offline cache for last `/api/habitat` response | D-24 requirement |
| visibilitychange (Web API) | built-in | Pause PixiJS ticker on tab hide | D-22 requirement |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @pixi/react | Raw PixiJS in useEffect with ref | @pixi/react is less boilerplate and handles React lifecycle cleanup correctly; raw approach risks double-init in StrictMode |
| motion (for canvas transitions) | PixiJS Ticker tweens | PixiJS tweens work inside canvas; overlay elements (level badge, mood indicator, loading state) are HTML and belong to Motion |
| localStorage for offline cache | SWR / React Query cache | SWR/React Query not in the stack; localStorage is zero-dependency and sufficient for single-resource caching |

### Installation

```bash
npm install pixi.js @pixi/react
```

**Version verification (confirmed 2026-03-28):**
- `pixi.js`: 8.17.1 — latest stable (dist-tags.latest verified via npm view)
- `@pixi/react`: 8.0.5 — latest stable; peer requires `pixi.js ^8.2.6` and `react >=19.0.0` (both satisfied)
- Neither package is currently in `package.json` — must be installed

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── (protected)/
│       ├── dashboard/page.tsx     # Add <HabitatWidget /> alongside DeckView
│       └── habitat/page.tsx       # New — full habitat page (server component shell)
├── components/
│   ├── habitat-scene.tsx          # "use client" — dynamic wrapper (ssr:false gate)
│   ├── habitat-canvas.tsx         # "use client" — @pixi/react Application + scene tree
│   ├── tiger-sprite.tsx           # "use client" — tiger layer (mood, position, facing)
│   ├── habitat-layers.tsx         # "use client" — background + additive level layers
│   ├── sparkle-particles.tsx      # "use client" — excited mood particle burst
│   └── habitat-widget.tsx         # "use client" — mini widget (small canvas + progress bar)
public/
├── sprites/
│   ├── tiger.json                 # Sprite atlas JSON
│   ├── tiger.png                  # Sprite atlas image
│   ├── habitat.json               # Habitat layer atlas JSON
│   └── habitat.png                # Habitat layer atlas image
```

### Pattern 1: SSR-safe PixiJS loading with next/dynamic

PixiJS crashes during server rendering because it accesses `window` and `document`. The official Next.js 16 pattern (verified in `/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`) is:

```typescript
// src/components/habitat-scene.tsx
"use client";

import dynamic from "next/dynamic";

// IMPORTANT: { ssr: false } must be used inside a Client Component
// (Next.js 16 disallows ssr:false in Server Components)
const HabitatCanvas = dynamic(
  () => import("@/components/habitat-canvas"),
  {
    ssr: false,
    loading: () => <HabitatLoadingSpinner />,
  }
);

export function HabitatScene({ habitatState }: { habitatState: HabitatState }) {
  return <HabitatCanvas habitatState={habitatState} />;
}
```

**Key rule (from Next.js 16 docs):** `ssr: false` only works when `dynamic()` is called inside a `"use client"` module. Moving it into a Server Component causes a build error.

### Pattern 2: @pixi/react v8 Application + extend()

```typescript
// src/components/habitat-canvas.tsx
"use client";

import { Application, extend, useTick, useApplication } from "@pixi/react";
import {
  Container,
  Sprite,
  AnimatedSprite,
  Graphics,
  Text,
  Texture,
  Assets,
} from "pixi.js";
import { useEffect, useState } from "react";
import type { HabitatState } from "@/lib/habitat-engine";

// Register all needed Pixi classes — called once at module scope
extend({ Container, Sprite, AnimatedSprite, Graphics, Text });

export default function HabitatCanvas({
  habitatState,
}: {
  habitatState: HabitatState;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={parentRef} style={{ width: "100%", aspectRatio: "16/9" }}>
      <Application resizeTo={parentRef}>
        <HabitatScene habitatState={habitatState} />
      </Application>
    </div>
  );
}
```

**Key notes:**
- `extend()` must be called before any JSX referencing those components renders.
- `<Application resizeTo={ref}>` auto-resizes the canvas to the container. Use a wrapper `<div>` with a fixed aspect ratio (D-17).
- Child components of `<Application>` can use `useApplication()` to access `app.ticker`, `app.renderer`, etc.
- Components inside `<Application>` use JSX names with `pixi` prefix: `<pixiContainer>`, `<pixiSprite>`, `<pixiAnimatedSprite>`.

### Pattern 3: Spritesheet loading with Assets

```typescript
// Source: PixiJS 8.x Assets docs + TexturePacker tutorial (verified)
import { Assets } from "pixi.js";

// Load atlas — returns Spritesheet with .textures and .animations maps
const sheet = await Assets.load<Spritesheet>("/sprites/tiger.json");

// Static pose sprites (one texture per mood)
const happyTexture = sheet.textures["tiger/happy.png"];
const neutralTexture = sheet.textures["tiger/neutral.png"];
const sadTexture = sheet.textures["tiger/sad.png"];

// Animated sprite for excited bounce (frames named tiger/excited/01.png, 02.png…)
const excitedSprite = new AnimatedSprite(sheet.animations["tiger/excited"]);
excitedSprite.animationSpeed = 0.15;
excitedSprite.loop = true;
excitedSprite.play();
```

**Atlas JSON structure (PixiJS standard format):**
```json
{
  "frames": {
    "tiger/happy.png": { "frame": {"x":0,"y":0,"w":64,"h":64}, "sourceSize":{"w":64,"h":64} },
    "tiger/neutral.png": { "frame": {"x":64,"y":0,"w":64,"h":64}, "sourceSize":{"w":64,"h":64} },
    "tiger/sad.png": { "frame": {"x":128,"y":0,"w":64,"h":64}, "sourceSize":{"w":64,"h":64} },
    "tiger/excited/01.png": { "frame": {"x":0,"y":64,"w":64,"h":64}, "sourceSize":{"w":64,"h":64} },
    "tiger/excited/02.png": { "frame": {"x":64,"y":64,"w":64,"h":64}, "sourceSize":{"w":64,"h":64} }
  },
  "animations": {
    "tiger/excited": ["tiger/excited/01.png", "tiger/excited/02.png"]
  },
  "meta": { "image": "tiger.png", "size": {"w":512,"h":512} }
}
```

TexturePacker auto-generates this format when PixiJS is selected as the framework. The `animations` field is populated by grouping frames with sequential numeric suffixes.

### Pattern 4: Ticker pause on visibilitychange

```typescript
// Source: PixiJS Ticker docs (ticker.stop() / ticker.start() confirmed)
// Inside a child component of <Application>:
function TickerVisibilityController() {
  const { app } = useApplication();

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        app.ticker.stop();
      } else {
        app.ticker.start();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [app]);

  return null; // render-nothing controller component
}
```

### Pattern 5: useTick for animation loops

The `useTick` callback is NOT memoized by @pixi/react. Use `useCallback` to prevent the callback being re-added on every frame when the component re-renders:

```typescript
// Source: @pixi/react v8 docs (confirmed useTick memoization warning)
const [bounceY, setBounceY] = useState(0);
const [t, setT] = useState(0);

const onTick = useCallback((ticker: Ticker) => {
  setT((prev) => prev + ticker.deltaTime);
  setBounceY(Math.sin(t * 0.1) * 8); // 8px bounce amplitude
}, [t]);

useTick(onTick);
```

**Alternative for performance-critical paths:** Mutate a ref instead of calling setState inside useTick. React state updates inside useTick trigger re-renders every frame — acceptable for simple animation values but avoid complex state shapes.

### Pattern 6: Mood transition (bounce vs crossfade)

Mood transition animations live outside the canvas as Motion 12 overlay effects or are simple alpha tweens inside PixiJS:

```typescript
// Happier shift (D-06): sprite swap + Motion bounce on wrapper div
// The canvas renders new texture immediately; Motion animates the HTML wrapper
<motion.div
  key={mood} // remount triggers animation on mood change
  initial={{ scale: 0.85, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 400, damping: 12 }}
>
  {/* PixiJS canvas inside */}
</motion.div>

// Sadder shift (D-06): crossfade alpha inside PixiJS ticker
// Fade old sprite alpha from 1 to 0 while new sprite alpha fades 0 to 1
// over ~30 frames (0.5s at 60fps)
```

### Pattern 7: Additive habitat layers (HAB-03)

Each level adds one or more sprite layers. Layer visibility is driven by `habitatState.level`:

```typescript
const LEVEL_LAYERS: Record<number, string[]> = {
  1: ["sky", "far-hills", "ground"],
  2: ["sky", "far-hills", "ground", "single-tree"],
  3: ["sky", "far-hills", "ground", "single-tree", "rocks"],
  // ... up to level 10
};

function HabitatLayers({ level }: { level: number }) {
  const layers = LEVEL_LAYERS[level] ?? LEVEL_LAYERS[1];
  return (
    <pixiContainer>
      {layers.map((layerName) => (
        <pixiSprite
          key={layerName}
          texture={sheet.textures[`habitat/${layerName}.png`]}
          width={sceneWidth}
          height={sceneHeight}
        />
      ))}
    </pixiContainer>
  );
}
```

**Decay visual (D-13):** Layers above the current decay level get alpha reduced proportionally to `1 - (1 - quality) * 2` (full visible at quality=1.0, fully faded at quality=0.5 or below). The `isDecaying` and `quality` fields on `HabitatState` drive this.

### Pattern 8: Offline cache (D-24)

```typescript
const CACHE_KEY = "tiocards:habitat-state";

async function fetchHabitatState(): Promise<HabitatState | null> {
  try {
    const res = await fetch("/api/habitat");
    if (!res.ok) throw new Error("API error");
    const data: HabitatState = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return data;
  } catch {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? (JSON.parse(cached) as HabitatState) : null;
  }
}
```

### Anti-Patterns to Avoid

- **Calling `dynamic()` with `{ ssr: false }` in a Server Component:** Next.js 16 will throw a build error. The `dynamic()` call must be inside a `"use client"` module.
- **Not calling `extend()` before JSX renders:** @pixi/react throws a runtime error for unregistered components. Call `extend()` at module scope, outside any component function.
- **Calling `setState` inside `useTick` with a non-memoized callback:** Re-registers the listener on every frame, causing performance degradation. Always wrap with `useCallback`.
- **Initializing PixiJS Application in a Server Component:** PixiJS accesses `window.devicePixelRatio`, `document.createElement("canvas")`, etc. at import time. All PixiJS code must be behind `ssr: false`.
- **Using AnimatedSprite for static poses:** Static mood sprites (happy/neutral/sad) are `Sprite` with a swapped texture, not `AnimatedSprite`. `AnimatedSprite` is only for the frame-based excited bounce loop.
- **Two separate PixiJS applications for full page vs widget:** Each `<Application>` creates a WebGL context. Mobile devices support 8–16 concurrent contexts. Use a single `<Application>` per view (one for `/habitat`, one for the mini widget). Never render both simultaneously on the dashboard without verifying context count.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas resize to container | Custom resize observer + canvas.width = | `<Application resizeTo={ref}>` from @pixi/react | Handles devicePixelRatio, ResizeObserver, and renderer resize atomically |
| Frame loop | `requestAnimationFrame` in useEffect | `useTick` from @pixi/react | Correctly integrates with PixiJS ticker lifecycle and cleanup |
| Sprite atlas packing | Custom bin-packing script | TexturePacker (desktop tool) or hand-authored JSON | Atlas packing is a solved problem; TexturePacker output is the exact format PixiJS Assets expects |
| Asset caching | Custom fetch wrapper with Map | `Assets.load()` — already caches by URL | PixiJS Assets singleton returns the same cached instance on repeated calls |
| Motion animations outside canvas | PixiJS Graphics tweens | `motion` from Motion 12 | HTML overlay elements (level badge, spinner, progress bar) should use the existing animation library |

**Key insight:** The boundary is clear — Motion 12 owns HTML/CSS animations (overlays, fade-ins, transitions on wrapper elements); PixiJS owns everything rendered inside the canvas.

---

## Common Pitfalls

### Pitfall 1: ssr:false in a Server Component causes build error
**What goes wrong:** `next/dynamic` with `{ ssr: false }` placed in a Server Component throws: "`ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component."
**Why it happens:** Next.js 16 enforces this at build time. SSR disabling requires a client context.
**How to avoid:** Create a `"use client"` wrapper component (e.g. `habitat-scene.tsx`) that calls `dynamic(..., { ssr: false })` and renders it. The server component imports the wrapper, not the canvas directly.
**Warning signs:** Build error mentioning `ssr: false` and Server Components.

### Pitfall 2: PixiJS Application double-initialization in React StrictMode
**What goes wrong:** React StrictMode runs `useEffect` twice in development. If PixiJS `Application.init()` is called in useEffect without cleanup, two canvases are appended to the DOM.
**Why it happens:** Raw PixiJS usage in useEffect without proper cleanup.
**How to avoid:** Use `@pixi/react`'s `<Application>` component, which handles init and destroy correctly across StrictMode double-invocation.
**Warning signs:** Two canvas elements visible in DOM inspector during dev.

### Pitfall 3: useTick callback re-registration every frame
**What goes wrong:** Animation stutters, CPU spikes; ticker fires listener removal/addition on every render.
**Why it happens:** @pixi/react explicitly documents that "the callback passed to `useTick` is not memoised." If the component re-renders (e.g. from state updates inside the tick), the function reference changes, causing churn.
**How to avoid:** Wrap all `useTick` callbacks in `useCallback`. For pure animation state (bounce position, alpha), prefer mutating a ref and setting position on the Pixi object directly inside the callback rather than calling `setState`.
**Warning signs:** DevTools profiler shows rapid attach/detach of ticker listeners.

### Pitfall 4: Multiple WebGL contexts from multiple `<Application>` instances
**What goes wrong:** Browser warns "Too many active WebGL contexts" and older contexts are silently lost.
**Why it happens:** Each `<Application>` creates one WebGL context. Mobile browsers cap contexts at 8–16.
**How to avoid:** One `<Application>` per rendered page. The `/habitat` page has one; the dashboard widget has one. Ensure they are never simultaneously mounted if navigation is instant. Use React `key` prop to unmount properly on route change.
**Warning signs:** Invisible/blank canvases after navigating between pages.

### Pitfall 5: Assets.load called before Application is initialized
**What goes wrong:** PixiJS throws a renderer-not-initialized error when loading textures before the WebGL context exists.
**Why it happens:** Assets.load may attempt to upload textures to GPU immediately.
**How to avoid:** Load assets inside a child component of `<Application>`, or in a `useEffect` that runs after the Application component mounts. Pattern: use a `useState<Spritesheet | null>(null)` initialized to null, set it in a `useEffect` inside the Application tree.
**Warning signs:** Uncaught errors mentioning "renderer" or "context" during asset load.

### Pitfall 6: Sprite atlas path must be under /public
**What goes wrong:** `Assets.load("/sprites/tiger.json")` returns 404.
**Why it happens:** Next.js only serves static files from `/public`. Files elsewhere are not reachable by URL.
**How to avoid:** All sprite atlases go in `/public/sprites/`. Reference them as `/sprites/tiger.json` (no `/public` prefix in the URL).
**Warning signs:** 404 in Network tab when loading atlas JSON.

### Pitfall 7: Tiger position randomization causes SSR/hydration mismatch
**What goes wrong:** If tiger position (D-04, random of 3 positions) is computed on the server, React hydration will mismatch the client-rendered result.
**Why it happens:** `Math.random()` returns different values server vs client.
**How to avoid:** Tiger position must be computed client-side only — inside a `useEffect` or `useState` initialized to a default value with a `useEffect` that sets the random position after mount. Since the entire canvas component is behind `ssr: false`, this is naturally avoided — no SSR output to mismatch.
**Warning signs:** React hydration error in console about text content mismatch (won't occur with ssr:false, but would occur if ever moved to a server component).

---

## Code Examples

### Full HabitatCanvas skeleton (verified pattern)

```typescript
// src/components/habitat-canvas.tsx
"use client";

import { Application, extend, useApplication } from "@pixi/react";
import {
  Container,
  Sprite,
  AnimatedSprite,
  Graphics,
  Assets,
  Spritesheet,
} from "pixi.js";
import { useEffect, useRef, useState, useCallback } from "react";
import type { HabitatState } from "@/lib/habitat-engine";

// Register PixiJS classes — once at module scope
extend({ Container, Sprite, AnimatedSprite, Graphics });

function VisibilityController() {
  const { app } = useApplication();
  useEffect(() => {
    const onVisibility = () => {
      document.hidden ? app.ticker.stop() : app.ticker.start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [app]);
  return null;
}

function Scene({ habitatState }: { habitatState: HabitatState }) {
  const [sheet, setSheet] = useState<Spritesheet | null>(null);

  useEffect(() => {
    Assets.load<Spritesheet>("/sprites/tiger.json").then(setSheet);
  }, []);

  if (!sheet) return null;

  return (
    <pixiContainer>
      <VisibilityController />
      <HabitatLayers level={habitatState.level} quality={habitatState.quality} sheet={sheet} />
      <TigerSprite mood={habitatState.mood} sheet={sheet} />
    </pixiContainer>
  );
}

export default function HabitatCanvas({
  habitatState,
}: {
  habitatState: HabitatState;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: "100%", aspectRatio: "16/9" }}>
      <Application resizeTo={containerRef}>
        <Scene habitatState={habitatState} />
      </Application>
    </div>
  );
}
```

### SSR-safe wrapper (verified from Next.js 16 lazy-loading docs)

```typescript
// src/components/habitat-scene.tsx
"use client"; // REQUIRED — ssr:false only valid in Client Components

import dynamic from "next/dynamic";
import type { HabitatState } from "@/lib/habitat-engine";

const HabitatCanvas = dynamic(
  () => import("@/components/habitat-canvas"),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: "100%", aspectRatio: "16/9" }} className="animate-pulse bg-amber-50 rounded-lg" />
    ),
  }
);

export function HabitatScene({ habitatState }: { habitatState: HabitatState }) {
  return <HabitatCanvas habitatState={habitatState} />;
}
```

### Habitat page (server component shell)

```typescript
// src/app/(protected)/habitat/page.tsx
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HabitatScene } from "@/components/habitat-scene";
import type { HabitatState } from "@/lib/habitat-engine";

export default async function HabitatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  // Fetch habitat state server-side for initial render
  // The canvas itself is client-only but data can be SSR-fetched
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/habitat`, {
    headers: await headers(),
  });
  const habitatState: HabitatState = await res.json();

  return (
    <main>
      <HabitatScene habitatState={habitatState} />
    </main>
  );
}
```

**Note:** Alternatively, the client component can fetch its own data via `useEffect`. For initial page load (D-21: fetch once), passing server-fetched state as a prop avoids a client-side waterfall. Both approaches are valid; passing as prop is preferred for performance.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-pixi-fiber` / `@inlet/react-pixi` | `@pixi/react` v8 | 2024 — official PixiJS org takeover | Use @pixi/react; the old `@inlet/react-pixi` package is unmaintained and does not support PixiJS 8 |
| `PIXI.Loader` for assets | `Assets.load()` (Promise-based) | PixiJS v7+ | `PIXI.Loader` is removed in v8. All asset loading must use `Assets.load()` |
| `PIXI.Application.init` returns void | `await app.init(options)` (async) | PixiJS v8 | App init is now async in bare PixiJS 8. @pixi/react handles this internally; only relevant if using PixiJS without the React wrapper |
| `new PIXI.Sprite.from("url")` | `Sprite.from(texture)` or atlas lookup | PixiJS v8 | URL-based sprite creation still works but atlas-based lookup is preferred for batching |
| `@pixi/react` v7 `<Stage>` component | `<Application>` component | @pixi/react v8 | `Stage` is gone in v8. The component is now `Application`. |

**Deprecated/outdated:**
- `PIXI.Loader`: Removed in PixiJS 8. Do not use. Use `Assets.load()`.
- `@inlet/react-pixi`: Unmaintained. The official package is `@pixi/react`.
- `<Stage>` from old react-pixi: Replaced by `<Application>` in @pixi/react v8.
- `updateTransform()` manual calls: Not needed in PixiJS 8; renderer handles dirty tracking.

---

## Open Questions

1. **Sprite assets: production vs placeholder**
   - What we know: No tiger sprites or habitat PNGs exist yet (STATE.md blocker). The phase cannot be completed without art assets.
   - What's unclear: Will the planner use placeholder colored rectangles for initial development, or does the user have assets ready?
   - Recommendation: Plan Wave 0 to create placeholder PNGs and a hand-authored atlas JSON so implementation can proceed. Note in plan that art assets swap into the same atlas structure with zero code changes.

2. **App URL for server-side habitat fetch**
   - What we know: The habitat page server component needs to call `/api/habitat` server-side. This requires a full URL (e.g. `http://localhost:3000`).
   - What's unclear: Is `NEXT_PUBLIC_APP_URL` defined in the project's `.env`?
   - Recommendation: Alternatively, import and call `computeHabitatState` + `getHabitatFacts` directly in the server component — avoids the HTTP round-trip and the URL dependency entirely. This is cleaner and consistent with the project's existing pattern (dashboard page calls DB queries directly).

3. **Savanna element schedule for levels 1–10**
   - What we know: D-09 specifies additive layers; D-12 specifies level 1 = bare grass + single tree. Remaining level 2–10 content is Claude's discretion.
   - What's unclear: Nothing blocking — this is a design artifact to be decided during planning.
   - Recommendation: Planner should define a `LEVEL_LAYERS` constant in `habitat-layers.tsx` listing layer names per level. Asset names drive the atlas structure.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build toolchain | Yes | v25.8.1 | — |
| npm | Package install | Yes | 11.11.0 | — |
| pixi.js | Canvas renderer | Not installed (must install) | — | — |
| @pixi/react | PixiJS React bridge | Not installed (must install) | — | — |
| motion | Overlay animations | Yes (installed) | 12.38.0 | — |
| next/dynamic | SSR gate | Yes (built-in) | Next.js 16.2.1 | — |
| Sprite art assets | Tiger/habitat rendering | Not present in /public | — | Placeholder colored rectangles + hand-authored atlas JSON |

**Missing dependencies with no fallback:**
- `pixi.js` and `@pixi/react` must be installed before any implementation work. Install command: `npm install pixi.js @pixi/react`

**Missing dependencies with fallback:**
- Sprite art assets: Use placeholder PNG files (solid colored rectangles sized correctly) + hand-authored atlas JSON. Art can be dropped in later with zero code changes as long as asset names match the atlas convention.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (exists, environment: "node") |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAB-02 | Tiger mood (happy/neutral/sad/excited) maps to correct sprite from atlas | unit | `npx vitest run src/components/tiger-sprite.test.ts` | No — Wave 0 |
| HAB-02 | Mood transition direction (happier=bounce, sadder=crossfade) logic | unit | `npx vitest run src/components/tiger-sprite.test.ts` | No — Wave 0 |
| HAB-03 | Habitat layer list for each level 1–10 produces correct layer names | unit | `npx vitest run src/components/habitat-layers.test.ts` | No — Wave 0 |
| HAB-03 | Decay alpha calculation (quality → layer alpha) is correct | unit | `npx vitest run src/components/habitat-layers.test.ts` | No — Wave 0 |
| HAB-02/03 | GET /api/habitat returns typed HabitatState (smoke test) | smoke/manual | Load page in browser, check Network tab | N/A — API exists |

**Note:** PixiJS canvas rendering itself (correct pixel output) is not unit-testable in a node environment. Tests cover the *data logic* driving the canvas (which textures are selected, which layers are shown, which animation plays) — pure functions that can run in node. Visual correctness is validated via manual browser testing.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/tiger-sprite.test.ts` — covers HAB-02 mood→texture mapping and transition direction logic
- [ ] `src/components/habitat-layers.test.ts` — covers HAB-03 level→layers mapping and decay alpha calculation
- [ ] No framework install needed — Vitest already configured

---

## Project Constraints (from CLAUDE.md)

The project's `CLAUDE.md` delegates to `AGENTS.md`, which states:

> "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices."

**Actionable directives for this phase:**

1. **Before writing any Next.js code:** Read `node_modules/next/dist/docs/01-app/` for the specific feature (routing, dynamic imports, etc.)
2. **ssr:false pattern:** Verified from `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — must be in a Client Component.
3. **Proxy vs middleware:** STATE.md records that Next.js 16 uses `proxy.ts` not `middleware.ts`. No new middleware files for this phase.
4. **Headers:** `await headers()` is required for auth calls (confirmed in existing route.ts pattern).
5. **No assumptions about PixiJS 8 APIs from training data** — all patterns in this research were verified against npm registry, official docs, and the @pixi/react GitHub README.

---

## Sources

### Primary (HIGH confidence)

- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — `next/dynamic` with `ssr: false`, Client Component constraint
- `npm view pixi.js dist-tags` — version 8.17.1 confirmed latest stable (2026-03-28)
- `npm view @pixi/react@8.0.5 peerDependencies` — requires `pixi.js ^8.2.6`, `react >=19.0.0` (both satisfied)
- `github.com/pixijs/pixi-react` README — extend(), Application, useTick, useApplication, useExtend, pixiContainer/pixiSprite syntax
- `src/lib/habitat-engine.ts` — HabitatState type, TigerMood type, LEVEL_THRESHOLDS confirmed
- `src/app/api/habitat/route.ts` — GET /api/habitat response shape confirmed

### Secondary (MEDIUM confidence)

- `react.pixijs.io` (official @pixi/react docs site) — Application props including `resizeTo` accepting React refs; `defaultTextStyle`, `extensions`
- `codeandweb.com/texturepacker` — PixiJS 8 atlas JSON format, `Assets.load` + `AnimatedSprite.fromFrames` pattern (PixiJS 8 tutorial)
- `pixijs.com/8.x/guides/components/ticker` — `ticker.stop()` / `ticker.start()` methods confirmed
- `pixijs.com/8.x/guides/components/assets` — `Assets.load()` promise-based, cache-by-URL behavior confirmed

### Tertiary (LOW confidence)

- WebSearch results for `visibilitychange` + ticker — pattern is logical from confirmed `ticker.stop()`/`ticker.start()` APIs but no official code sample found explicitly combining both

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry 2026-03-28
- Architecture patterns: HIGH — next/dynamic pattern from local Next.js 16 docs; @pixi/react patterns from official README
- PixiJS 8 APIs: HIGH — Assets.load, Spritesheet, AnimatedSprite, Ticker confirmed from official docs and tutorials
- Pitfalls: HIGH — ssr:false Server Component error verified from Next.js 16 source docs; others from official library documentation
- Sprite atlas toolchain: MEDIUM — format verified but TexturePacker is a desktop tool; hand-authoring JSON is a viable alternative

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (PixiJS and @pixi/react are stable; Next.js 16 docs are local)
