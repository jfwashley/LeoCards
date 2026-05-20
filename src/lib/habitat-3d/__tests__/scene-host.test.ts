// scene-host.ts unit tests (Plan 13-01 Task 4).
//
// Runs in Vitest's node environment — no jsdom. We pass a stub canvas
// surface and mock `performance.now` to drive the idle-orbit branch
// deterministically.

import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachOrbit } from "../scene-host";

type ListenerEntry = {
  type: string;
  listener: EventListenerOrEventListenerObject;
};

function makeStubCanvas() {
  const added: ListenerEntry[] = [];
  const removed: ListenerEntry[] = [];
  const style: { cursor: string } = { cursor: "" };
  const stub = {
    addEventListener: vi.fn(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        _opts?: AddEventListenerOptions | boolean,
      ) => {
        added.push({ type, listener });
      },
    ),
    removeEventListener: vi.fn(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        _opts?: EventListenerOptions | boolean,
      ) => {
        removed.push({ type, listener });
      },
    ),
    style,
  };
  return { stub, added, removed };
}

function makeCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  // Sit the camera at the designer's default angle so phi != 0 and the
  // orbit math is exercised on a non-degenerate radius.
  cam.position.set(18, 9, 18);
  return cam;
}

describe("attachOrbit (Plan 13-01, R5/R6)", () => {
  let nowMs = 0;

  beforeEach(() => {
    nowMs = 1_000_000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an OrbitHandle with tick / dispose / nudgeTheta / getTheta / setTheta", () => {
    const { stub } = makeStubCanvas();
    const cam = makeCamera();
    // biome-ignore lint/suspicious/noExplicitAny: stub canvas for node tests
    const h = attachOrbit(stub as any, cam);
    expect(typeof h.tick).toBe("function");
    expect(typeof h.dispose).toBe("function");
    expect(typeof h.nudgeTheta).toBe("function");
    expect(typeof h.getTheta).toBe("function");
    expect(typeof h.setTheta).toBe("function");
    h.dispose();
  });

  it("auto-orbits once idle window elapses (>1200ms by default)", () => {
    const { stub } = makeStubCanvas();
    const cam = makeCamera();
    // biome-ignore lint/suspicious/noExplicitAny: stub canvas for node tests
    const h = attachOrbit(stub as any, cam, {
      idleDelay: 1200,
      autoSpeed: 0.12,
    });
    const theta0 = h.getTheta();

    // Advance the clock past idleDelay and tick a single frame (16ms).
    nowMs += 1300;
    h.tick(0.016);

    expect(h.getTheta() - theta0).toBeCloseTo(0.12 * 0.016, 6);
    h.dispose();
  });

  it("reducedMotion freezes auto-orbit (R6)", () => {
    const { stub } = makeStubCanvas();
    const cam = makeCamera();
    const h = attachOrbit(
      // biome-ignore lint/suspicious/noExplicitAny: stub canvas for node tests
      stub as any,
      cam,
      { idleDelay: 1200, autoSpeed: 0.12, reducedMotion: true },
    );
    const theta0 = h.getTheta();

    nowMs += 5_000;
    h.tick(0.016);

    expect(h.getTheta()).toBe(theta0);
    h.dispose();
  });

  it("nudgeTheta advances theta and resets the idle timer (R5)", () => {
    const { stub } = makeStubCanvas();
    const cam = makeCamera();
    // biome-ignore lint/suspicious/noExplicitAny: stub canvas for node tests
    const h = attachOrbit(stub as any, cam, {
      idleDelay: 1200,
      autoSpeed: 0.12,
    });
    const theta0 = h.getTheta();

    // First, sit past idleDelay so the next tick would otherwise auto-orbit.
    nowMs += 2_000;
    // nudgeTheta resets lastIdle to "now".
    h.nudgeTheta(0.1);
    expect(h.getTheta() - theta0).toBeCloseTo(0.1, 6);

    const thetaAfterNudge = h.getTheta();
    // Advance the clock by less than idleDelay → auto-orbit must NOT fire.
    nowMs += 500;
    h.tick(0.016);
    expect(h.getTheta()).toBe(thetaAfterNudge);

    h.dispose();
  });

  it("dispose removes mousedown + touchstart listeners from the canvas", () => {
    const { stub, removed } = makeStubCanvas();
    const cam = makeCamera();
    // biome-ignore lint/suspicious/noExplicitAny: stub canvas for node tests
    const h = attachOrbit(stub as any, cam);
    h.dispose();

    const canvasTypes = removed.map((r) => r.type);
    expect(canvasTypes).toContain("mousedown");
    expect(canvasTypes).toContain("touchstart");
    expect(stub.removeEventListener).toHaveBeenCalled();
  });

  it("attaches no wheel / contextmenu / pinch-zoom listeners (D-26 / SPEC R4)", () => {
    const { stub, added } = makeStubCanvas();
    const cam = makeCamera();
    // biome-ignore lint/suspicious/noExplicitAny: stub canvas for node tests
    const h = attachOrbit(stub as any, cam);

    const canvasTypes = added.map((a) => a.type);
    // Designer pattern: only pointer-start events attach to the canvas;
    // move/up live on `window` so a drag that leaves the canvas keeps
    // tracking.
    expect(canvasTypes.sort()).toEqual(["mousedown", "touchstart"]);
    // Absolutely no zoom / pan surface.
    expect(canvasTypes).not.toContain("wheel");
    expect(canvasTypes).not.toContain("contextmenu");
    expect(canvasTypes).not.toContain("gesturestart");
    expect(canvasTypes).not.toContain("pointercancel");

    h.dispose();
  });
});
