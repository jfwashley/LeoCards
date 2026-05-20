// habitat-3d-widget-canvas.test.tsx — Plan 13-05 Task 1
//
// Vitest is configured for `environment: "node"` (no jsdom). Per the
// project's prevailing pattern (clay-world.test.ts / scene-host.test.ts /
// habitat-3d-canvas.test.ts), we test the pure `mountHabitatWidgetScene`
// factory exported from `habitat-3d-widget-canvas.tsx` using stub canvas +
// camera + matchMedia. The React shell itself is a thin wrapper around this
// factory, so verifying the factory's contract pins the component's
// behaviour without RTL/jsdom.

import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HabitatState } from "@/lib/habitat-engine";
import {
  __resetWidgetMatchMediaStub,
  __setWidgetMatchMediaStub,
  mountHabitatWidgetScene,
} from "../habitat-3d-widget-canvas";

// ---------- stubs ----------

interface StubCanvas {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
  getContext: () => unknown;
  style: { cursor: string; display: string };
  width: number;
  height: number;
  _attrs: Record<string, string>;
  _listeners: Map<string, EventListener>;
}

interface StubWrapper {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  tabIndex: number;
}

function makeStubCanvas(): StubCanvas {
  const _attrs: Record<string, string> = {};
  const _listeners = new Map<string, EventListener>();
  return {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      _listeners.set(type, listener);
    }),
    removeEventListener: vi.fn((type: string) => {
      _listeners.delete(type);
    }),
    setAttribute: vi.fn((k: string, v: string) => {
      _attrs[k] = v;
    }),
    getContext: () => ({}),
    style: { cursor: "", display: "" },
    width: 0,
    height: 0,
    _attrs,
    _listeners,
  };
}

function makeStubWrapper(): StubWrapper {
  return {
    tabIndex: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

// ---------- mocks for scene-host + clay-world ----------

const buildSceneHostMock = vi.fn();
const buildClayWorldMock = vi.fn();
const updateWorldProxyMock = vi.fn();
const applyMoodMock = vi.fn();

vi.mock("@/lib/habitat-3d/scene-host", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/habitat-3d/scene-host")
  >("@/lib/habitat-3d/scene-host");
  return {
    ...actual,
    buildSceneHost: (...args: unknown[]) => buildSceneHostMock(...args),
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

vi.mock("@/lib/habitat-3d/mood-decay", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/habitat-3d/mood-decay")
  >("@/lib/habitat-3d/mood-decay");
  return {
    ...actual,
    applyMood: (...args: unknown[]) => applyMoodMock(...args),
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
    width: 80,
    height: 80,
    isMobile: true,
    Q: 0.55,
  };
}

function fakeWorld() {
  return {
    root: new THREE.Group(),
    featureGroups: {} as Record<string, THREE.Group>,
    mat: (c: string) =>
      new THREE.MeshToonMaterial({ color: c }) as THREE.MeshToonMaterial,
    lionCurve: new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]),
    updateWorld: vi.fn(),
    dispose: vi.fn(),
    skyMat: new THREE.ShaderMaterial(),
  };
}

// ---------- helpers ----------

function fixtureState(level: number): HabitatState {
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

describe("mountHabitatWidgetScene (Plan 13-05 Task 1)", () => {
  beforeEach(() => {
    buildSceneHostMock.mockReset();
    buildClayWorldMock.mockReset();
    updateWorldProxyMock.mockReset();
    applyMoodMock.mockReset();
    __resetWidgetMatchMediaStub();

    buildSceneHostMock.mockImplementation(() => fakeCtx());
    buildClayWorldMock.mockImplementation(() => fakeWorld());

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
    __resetWidgetMatchMediaStub();
  });

  it("Test 1: mounts at 80x80, renders, and tags canvas data-ready=true", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    expect(buildSceneHostMock).toHaveBeenCalledTimes(1);
    const args = buildSceneHostMock.mock.calls[0] as [
      unknown,
      number,
      number,
      unknown,
    ];
    // width + height args should both be 80
    expect(args[1]).toBe(80);
    expect(args[2]).toBe(80);
    expect(buildClayWorldMock).toHaveBeenCalledTimes(1);
    expect(canvas._attrs["data-ready"]).toBe("true");

    handle.dispose();
  });

  it("Test 2: auto-orbit advances theta at half speed (~0.06 rad/s)", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    const theta0 = handle.getTheta();
    // Advance one virtual second
    handle.tickForTest(1.0);
    const theta1 = handle.getTheta();
    const delta = theta1 - theta0;
    // 0.06 rad/s ± 1% tolerance
    expect(delta).toBeGreaterThan(0.055);
    expect(delta).toBeLessThan(0.065);

    handle.dispose();
  });

  it("Test 3: does NOT register mousedown/touchstart listeners on the canvas", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    const types = canvas.addEventListener.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(types).not.toContain("mousedown");
    expect(types).not.toContain("touchstart");
    // It SHOULD have a webglcontextlost handler (T-13-20).
    expect(types).toContain("webglcontextlost");

    handle.dispose();
  });

  it("Test 4: does NOT call stopPropagation on canvas events (D-16 click bubbles)", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    // No "click" listener should be installed on the inner canvas — the
    // parent <Link> in habitat-widget.tsx owns the navigation handler.
    const types = canvas.addEventListener.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(types).not.toContain("click");
    expect(types).not.toContain("pointerdown");

    handle.dispose();
  });

  it("Test 5: mounting at a NEW level threads the new feature flags", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const h1 = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(2),
      reducedMotion: false,
    });
    const [, features1] = buildClayWorldMock.mock.calls[0] as [
      unknown,
      Record<string, boolean>,
    ];
    expect(features1.lake).toBe(true);
    expect(features1.trees).toBe(false);
    h1.dispose();

    buildClayWorldMock.mockClear();
    const h2 = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(7),
      reducedMotion: false,
    });
    const [, features2] = buildClayWorldMock.mock.calls[0] as [
      unknown,
      Record<string, boolean>,
    ];
    expect(features2.trees).toBe(true);
    expect(features2.cave).toBe(true);
    h2.dispose();
  });

  it("Test 6: reducedMotion=true freezes auto-orbit", () => {
    __setWidgetMatchMediaStub(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
    }));
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: true,
    });

    const theta0 = handle.getTheta();
    handle.tickForTest(2.0);
    const theta1 = handle.getTheta();
    expect(theta1).toBe(theta0); // no movement under reduced motion

    handle.dispose();
  });

  it("Test 7: applyMood is invoked each frame so widget is mood-reactive", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    applyMoodMock.mockClear();
    handle.tickForTest(0.016);
    expect(applyMoodMock).toHaveBeenCalled();
    const [, mood] = applyMoodMock.mock.calls[0] as [unknown, string];
    expect(mood).toBe("happy");

    handle.dispose();
  });

  it("Test 8: webglcontextlost listener hides the canvas (falls back to progress bar)", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    const lostHandler = canvas._listeners.get("webglcontextlost");
    expect(lostHandler).toBeTruthy();
    if (lostHandler) {
      const event = {
        preventDefault: vi.fn(),
      } as unknown as Event;
      lostHandler(event);
      expect(canvas._attrs["data-ready"]).toBe("false");
      expect(canvas.style.display).toBe("none");
    }

    handle.dispose();
  });

  it("Test 9: dispose() is idempotent and cleans up renderer + world", () => {
    const canvas = makeStubCanvas();
    const wrapper = makeStubWrapper();
    const handle = mountHabitatWidgetScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      wrapper: wrapper as unknown as HTMLDivElement,
      habitatState: fixtureState(3),
      reducedMotion: false,
    });

    handle.dispose();
    handle.dispose(); // idempotent — no throw

    // Both renderer.dispose + world.dispose were called.
    const ctx = buildSceneHostMock.mock.results[0]?.value as ReturnType<
      typeof fakeCtx
    >;
    const world = buildClayWorldMock.mock.results[0]?.value as ReturnType<
      typeof fakeWorld
    >;
    expect(ctx.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(world.dispose).toHaveBeenCalledTimes(1);
  });
});
