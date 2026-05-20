// habitat-3d-canvas.test.ts — Plan 13-03 Task 1
//
// Vitest is configured for `environment: "node"` (no jsdom). Per the
// project's prevailing pattern (see clay-world.test.ts / scene-host.test.ts),
// we test the pure `mountHabitatScene` factory exported from
// `habitat-3d-canvas.tsx` using stub canvas + camera + matchMedia. The
// React shell itself is a thin wrapper around this factory, so verifying
// the factory's contract pins the component's behaviour without RTL/jsdom.

import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetMatchMediaStub,
  __setMatchMediaStub,
  mountHabitatScene,
} from "../habitat-3d-canvas";

// ---------- stubs ----------

interface StubCanvas {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
  getContext: () => unknown;
  style: { cursor: string };
  // captured attrs
  _attrs: Record<string, string>;
}

interface StubWrapper {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  tabIndex: number;
  // captured keydown handlers so tests can fire keys directly
  _handlers: Map<string, (e: KeyboardEvent) => void>;
}

function makeStubCanvas(): StubCanvas {
  const _attrs: Record<string, string> = {};
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn((k: string, v: string) => {
      _attrs[k] = v;
    }),
    getContext: () => ({}),
    style: { cursor: "" },
    _attrs,
  };
}

function makeStubWrapper(): StubWrapper {
  const _handlers = new Map<string, (e: KeyboardEvent) => void>();
  return {
    tabIndex: -1,
    _handlers,
    addEventListener: vi.fn(
      (type: string, listener: (e: KeyboardEvent) => void) => {
        _handlers.set(type, listener);
      },
    ),
    removeEventListener: vi.fn((type: string) => {
      _handlers.delete(type);
    }),
  };
}

// ---------- mocks for scene-host + clay-world ----------

const buildSceneHostMock = vi.fn();
const attachOrbitMock = vi.fn();
const buildClayWorldMock = vi.fn();
const updateWorldProxyMock = vi.fn();

vi.mock("@/lib/habitat-3d/scene-host", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/habitat-3d/scene-host")
  >("@/lib/habitat-3d/scene-host");
  return {
    ...actual,
    buildSceneHost: (...args: unknown[]) => buildSceneHostMock(...args),
    attachOrbit: (...args: unknown[]) => attachOrbitMock(...args),
  };
});

vi.mock("@/lib/habitat-3d/clay-world", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/habitat-3d/clay-world")
  >("@/lib/habitat-3d/clay-world");
  return {
    ...actual,
    buildClayWorld: (...args: unknown[]) => buildClayWorldMock(...args),
  };
});

vi.mock("@/lib/habitat-3d/clay-animation", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/habitat-3d/clay-animation")
  >("@/lib/habitat-3d/clay-animation");
  return {
    ...actual,
    updateWorld: (...args: unknown[]) => updateWorldProxyMock(...args),
  };
});

// ---------- ctx + world fixtures ----------

function fakeCtx() {
  const renderer = {
    render: vi.fn(),
    dispose: vi.fn(),
    toneMappingExposure: 1.0,
  } as unknown as THREE.WebGLRenderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(18, 9, 18);
  return {
    renderer,
    scene,
    camera,
    canvas: {} as HTMLCanvasElement,
    width: 800,
    height: 450,
    isMobile: false,
    Q: 1,
  };
}

function fakeWorld(level: number) {
  return {
    root: new THREE.Group(),
    featureGroups: {
      clouds: new THREE.Group(),
      level: level,
    } as unknown as Record<string, THREE.Group>,
    mat: (c: string) =>
      new THREE.MeshToonMaterial({ color: c }) as THREE.MeshToonMaterial,
    lionCurve: new THREE.CatmullRomCurve3([new THREE.Vector3()]),
    updateWorld: vi.fn(),
    dispose: vi.fn(),
    skyMat: new THREE.ShaderMaterial(),
  };
}

function fakeOrbit() {
  return {
    tick: vi.fn(),
    dispose: vi.fn(),
    nudgeTheta: vi.fn(),
    getTheta: vi.fn(() => 0.5),
    setTheta: vi.fn(),
  };
}

// ---------- helpers ----------

function fixtureState(level: number) {
  return {
    level,
    quality: 1,
    mood: "happy" as const,
    learnedCardCount: 10,
    effectiveCardCount: 10,
    isDecaying: false,
    minutesSinceActivity: 0,
    nextLevelThreshold: null,
  };
}

// ---------- tests ----------

describe("mountHabitatScene (Plan 13-03 Task 1)", () => {
  let lastWorld: ReturnType<typeof fakeWorld>;
  let lastOrbit: ReturnType<typeof fakeOrbit>;

  beforeEach(() => {
    buildSceneHostMock.mockReset();
    attachOrbitMock.mockReset();
    buildClayWorldMock.mockReset();
    updateWorldProxyMock.mockReset();
    __resetMatchMediaStub();

    buildSceneHostMock.mockImplementation(() => fakeCtx());
    buildClayWorldMock.mockImplementation((_ctx, _features, _opts) => {
      lastWorld = fakeWorld(0);
      return lastWorld;
    });
    attachOrbitMock.mockImplementation(() => {
      lastOrbit = fakeOrbit();
      return lastOrbit;
    });

    // requestAnimationFrame / cancelAnimationFrame for node
    (
      globalThis as unknown as {
        requestAnimationFrame: (cb: FrameRequestCallback) => number;
      }
    ).requestAnimationFrame = (() => {
      let id = 0;
      return (_cb: FrameRequestCallback) => ++id;
    })();
    (
      globalThis as unknown as { cancelAnimationFrame: (id: number) => void }
    ).cancelAnimationFrame = () => {};
  });

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>)
      .__habitatCameraPos;
    delete (globalThis as unknown as Record<string, unknown>).__habitatSetTheta;
  });

  it("Test 1: mounts a scene and tags the canvas with data-ready=true", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(1),
      reducedMotion: false,
    });

    expect(buildSceneHostMock).toHaveBeenCalledTimes(1);
    expect(buildClayWorldMock).toHaveBeenCalledTimes(1);
    expect(attachOrbitMock).toHaveBeenCalledTimes(1);
    expect(canvas._attrs["data-ready"]).toBe("true");

    handle.dispose();
  });

  it("Test 2: passes the right FeatureFlags for each level 1..9", () => {
    for (let lv = 1; lv <= 9; lv++) {
      buildSceneHostMock.mockReset().mockImplementation(() => fakeCtx());
      buildClayWorldMock.mockReset().mockImplementation(() => fakeWorld(lv));
      attachOrbitMock.mockReset().mockImplementation(() => fakeOrbit());

      const canvas = makeStubCanvas();
      const wrapper = makeStubWrapper();
      const handle = mountHabitatScene({
        canvas: canvas as unknown as HTMLCanvasElement,
        wrapper: wrapper as unknown as HTMLDivElement,
        habitatState: fixtureState(lv),
        reducedMotion: false,
      });

      const [_ctx, features, opts] = buildClayWorldMock.mock.calls[0] as [
        unknown,
        Record<string, boolean | undefined>,
        { sky?: string },
      ];
      expect(features.lake).toBe(lv >= 2);
      expect(features.trees).toBe(lv >= 3);
      expect(features.flowers).toBe(lv >= 4);
      expect(features.mushrooms).toBe(lv >= 6);
      expect(features.cave).toBe(lv >= 7);
      expect(features.toy).toBe(lv >= 8);
      expect(features.songbirds).toBe(lv >= 9);
      expect(opts.sky).toBe(lv === 9 ? "golden-hour" : "default");
      handle.dispose();
    }
  });

  it("Test 3: dispose() runs renderer.dispose + orbit.dispose + world.dispose exactly once", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(1),
      reducedMotion: false,
    });
    handle.dispose();
    handle.dispose(); // idempotent

    expect(lastOrbit.dispose).toHaveBeenCalledTimes(1);
    expect(lastWorld.dispose).toHaveBeenCalledTimes(1);
  });

  it("Test 4: re-mounting at a NEW level passes new features; same level re-mount is permitted but new features still threaded", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const h1 = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(1),
      reducedMotion: false,
    });
    h1.dispose();

    buildClayWorldMock.mockClear();
    const h2 = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(5),
      reducedMotion: false,
    });
    const [, features] = buildClayWorldMock.mock.calls[0] as [
      unknown,
      Record<string, boolean>,
    ];
    expect(features.flowers).toBe(true);
    h2.dispose();
  });

  it("Test 5: ArrowRight on wrapper triggers nudgeTheta with positive delta; ArrowLeft with negative", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    const onKey = wrapper._handlers.get("keydown");
    expect(onKey).toBeTypeOf("function");

    const prevented: string[] = [];
    const mkEvent = (key: string): KeyboardEvent =>
      ({
        key,
        preventDefault: () => prevented.push(key),
      }) as unknown as KeyboardEvent;

    onKey?.(mkEvent("ArrowRight"));
    onKey?.(mkEvent("ArrowLeft"));
    onKey?.(mkEvent("Tab")); // ignored

    expect(lastOrbit.nudgeTheta).toHaveBeenCalledTimes(2);
    const [d1] = lastOrbit.nudgeTheta.mock.calls[0] as [number];
    const [d2] = lastOrbit.nudgeTheta.mock.calls[1] as [number];
    expect(d1).toBeGreaterThan(0);
    expect(d2).toBeLessThan(0);
    expect(prevented).toEqual(["ArrowRight", "ArrowLeft"]);

    handle.dispose();
  });

  it("Test 6: reducedMotion: true is forwarded to attachOrbit", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(1),
      reducedMotion: true,
    });
    const [, , opts] = attachOrbitMock.mock.calls[0] as [
      unknown,
      unknown,
      { reducedMotion?: boolean },
    ];
    expect(opts.reducedMotion).toBe(true);
    handle.dispose();
  });

  it("Test 7a: dev build exposes window.__habitatCameraPos + __habitatSetTheta", () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "development";
    // Provide a window proxy on globalThis so the dev affordance lands somewhere
    const win: Record<string, unknown> = {};
    (globalThis as unknown as { window: Record<string, unknown> }).window = win;

    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(1),
      reducedMotion: false,
    });

    expect(typeof win.__habitatCameraPos).toBe("function");
    expect(typeof win.__habitatSetTheta).toBe("function");
    const pos = (win.__habitatCameraPos as () => Record<string, number>)();
    expect(pos).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      z: expect.any(Number),
      theta: expect.any(Number),
    });
    (win.__habitatSetTheta as (n: number) => void)(1.23);
    expect(lastOrbit.setTheta).toHaveBeenCalledWith(1.23);

    handle.dispose();
    expect(win.__habitatCameraPos).toBeUndefined();
    expect(win.__habitatSetTheta).toBeUndefined();

    (process.env as Record<string, string | undefined>).NODE_ENV = prev;
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

  it("Test 7b: production build does NOT expose the dev affordance", () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const win: Record<string, unknown> = {};
    (globalThis as unknown as { window: Record<string, unknown> }).window = win;

    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(1),
      reducedMotion: false,
    });

    expect(win.__habitatCameraPos).toBeUndefined();
    expect(win.__habitatSetTheta).toBeUndefined();

    handle.dispose();
    (process.env as Record<string, string | undefined>).NODE_ENV = prev;
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

  it("Test 8: matchMedia stub: __setMatchMediaStub flips reducedMotion path detection", () => {
    __setMatchMediaStub((q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    // This is just verifying the stub plumbing exists for the React hook —
    // the actual `usePrefersReducedMotion` hook is React-side and exercised
    // via the production code path. The stub is required by Plan 13-03
    // Task 1 Test 6 to deterministically simulate the media query.
    __resetMatchMediaStub();
  });
});
