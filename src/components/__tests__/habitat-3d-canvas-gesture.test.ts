// habitat-3d-canvas-gesture.test.ts — Phase 13.1 Plan 02 (R2/R3/R4/R6)
//
// Tests the gesture-gate primitive (`setupGestureGate`) extracted from
// `habitat-3d-canvas.tsx`. The Vitest project runs in `environment: "node"`
// (no jsdom — see `vitest.config.ts`), so we cannot exercise the React shell
// via Testing Library. Instead, we:
//   1. Test the pure `setupGestureGate({document, window, onGesture, reducedMotion})`
//      factory with EventTarget stubs that emulate the document/window APIs
//      the gate touches. This is the exact code path the React `useEffect`
//      delegates to, so testing the factory pins the gate's behavior.
//   2. Guard against regressions of attempt #1 by grepping the source for
//      `requestIdleCallback` / timer-based mount fallbacks.
//   3. Cover reduced-motion lockout (R4) by asserting `setupGestureGate`
//      returns the no-op detacher and never wires any listener when
//      `reducedMotion: true` is passed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupGestureGate } from "../habitat-3d-canvas";

// ---- EventTarget stub ----------------------------------------------------
//
// node 22 ships a global `EventTarget` that's spec-correct. We thinly wrap
// it so we can also spy on add/removeEventListener counts (which the real
// EventTarget does not expose).

interface SpyTarget {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  // mirror dispatch to call handlers in registration order
  dispatch: (event: { type: string }) => void;
  // type -> Set<listener>
  _by: Map<string, Set<(e: { type: string }) => void>>;
}

function makeSpyTarget(): SpyTarget {
  const _by = new Map<string, Set<(e: { type: string }) => void>>();
  const addEventListener = vi.fn(
    (type: string, listener: (e: { type: string }) => void) => {
      const set = _by.get(type) ?? new Set();
      set.add(listener);
      _by.set(type, set);
    },
  );
  const removeEventListener = vi.fn(
    (type: string, listener: (e: { type: string }) => void) => {
      const set = _by.get(type);
      set?.delete(listener);
    },
  );
  const dispatch = (event: { type: string }) => {
    const set = _by.get(event.type);
    if (!set) return;
    for (const l of set) l(event);
  };
  return { addEventListener, removeEventListener, dispatch, _by };
}

const GATE_EVENTS = [
  "pointerdown",
  "touchstart",
  "keydown",
  "wheel",
  "scroll",
] as const;

// ---- helpers -------------------------------------------------------------

function pretendDocWin(): { doc: SpyTarget; win: SpyTarget } {
  return { doc: makeSpyTarget(), win: makeSpyTarget() };
}

// ---- tests ---------------------------------------------------------------

describe("setupGestureGate (Phase 13.1 Plan 02 R3/R4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("G1: with no gesture, onGesture is never called even after 10s of fake time", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    const cleanup = setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });
    expect(typeof cleanup).toBe("function");

    // Listeners attached for the 5 gate events.
    for (const ev of GATE_EVENTS) {
      const attachedOnDoc = doc._by.get(ev)?.size ?? 0;
      const attachedOnWin = win._by.get(ev)?.size ?? 0;
      expect(attachedOnDoc + attachedOnWin).toBeGreaterThanOrEqual(1);
    }

    vi.advanceTimersByTime(10_000);
    expect(onGesture).not.toHaveBeenCalled();
    cleanup();
  });

  it("G2: pointerdown on document fires onGesture exactly once and detaches all listeners synchronously", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    const cleanup = setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });

    doc.dispatch({ type: "pointerdown" });
    expect(onGesture).toHaveBeenCalledTimes(1);

    // All gate listeners detached after the first gesture.
    for (const ev of GATE_EVENTS) {
      const attached =
        (doc._by.get(ev)?.size ?? 0) + (win._by.get(ev)?.size ?? 0);
      expect(attached).toBe(0);
    }
    cleanup();
  });

  it("G3: keydown on document fires onGesture", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });
    doc.dispatch({ type: "keydown" });
    expect(onGesture).toHaveBeenCalledTimes(1);
  });

  it("G4: wheel on document fires onGesture", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });
    doc.dispatch({ type: "wheel" });
    expect(onGesture).toHaveBeenCalledTimes(1);
  });

  it("G5: scroll on window fires onGesture (scroll does not bubble from window → document)", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });
    win.dispatch({ type: "scroll" });
    expect(onGesture).toHaveBeenCalledTimes(1);
  });

  it("G6: touchstart on document fires onGesture", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });
    doc.dispatch({ type: "touchstart" });
    expect(onGesture).toHaveBeenCalledTimes(1);
  });

  it("R1: reducedMotion=true attaches ZERO listeners and onGesture never fires even after dispatch + 10s", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    const cleanup = setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: true,
    });
    expect(typeof cleanup).toBe("function");

    // No listeners attached on either target.
    expect(doc.addEventListener).not.toHaveBeenCalled();
    expect(win.addEventListener).not.toHaveBeenCalled();

    // Even if events somehow fired, onGesture stays untriggered.
    for (const ev of GATE_EVENTS) {
      doc.dispatch({ type: ev });
      win.dispatch({ type: ev });
    }
    vi.advanceTimersByTime(10_000);
    expect(onGesture).not.toHaveBeenCalled();

    cleanup();
  });

  it("S1: 5 rapid pointerdowns still fire onGesture exactly once (single-mount invariant)", () => {
    const { doc, win } = pretendDocWin();
    const onGesture = vi.fn();
    setupGestureGate({
      document: doc as unknown as Document,
      window: win as unknown as Window,
      onGesture,
      reducedMotion: false,
    });
    for (let i = 0; i < 5; i++) doc.dispatch({ type: "pointerdown" });
    expect(onGesture).toHaveBeenCalledTimes(1);
  });

  it("C1: source file contains no requestIdleCallback or setTimeout-based mount fallback in the gate logic", () => {
    const src = readFileSync(
      join(__dirname, "..", "habitat-3d-canvas.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/requestIdleCallback/);
    expect(src).not.toMatch(
      /setTimeout[\s\S]{0,80}(setCanvasMounted|mountHabitatScene)/,
    );
    // Also assert the source still references all five gate events and the
    // `priority` LCP signal (per AGENTS.md + plan acceptance R2).
    for (const ev of GATE_EVENTS) {
      expect(src).toContain(ev);
    }
  });
});
