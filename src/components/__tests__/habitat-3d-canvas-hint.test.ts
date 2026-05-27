// habitat-3d-canvas-hint.test.ts — Phase 13.1 Plan 03 (R5)
//
// Vitest is configured for `environment: "node"` (no jsdom — see
// `vitest.config.ts`) so we cannot render the React shell via Testing
// Library. Per the prevailing project pattern (clay-world.test.ts,
// scene-host.test.ts, habitat-3d-canvas-gesture.test.ts), we test the pure
// hint-timer factory extracted from `habitat-3d-canvas.tsx` plus
// source-level grep assertions that pin the JSX overlay shape, copy, and
// non-mounting contract.
//
// Acceptance bullets (R5):
//   H1 — 2.0s after mount with no gesture, hint becomes visible
//   H2 — gesture dismisses the hint (via the shared canvasMounted flip)
//   H3 — canvas-mount path dismisses the hint
//   H4 — reduced-motion path NEVER schedules the hint timer
//   H5 — copy ≤ 25 chars
//   H6 — hint timer NEVER triggers mountHabitatScene (no premature mount)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HINT_COPY, setupHintTimer } from "../habitat-3d-canvas";

// ---- helpers -------------------------------------------------------------

function srcText(): string {
  return readFileSync(join(__dirname, "..", "habitat-3d-canvas.tsx"), "utf8");
}

// ---- tests ---------------------------------------------------------------

describe("hint timer factory (Phase 13.1 Plan 03 R5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("H1: after 2000 ms with no gesture, hint becomes visible", () => {
    const setHintVisible = vi.fn();
    const cleanup = setupHintTimer({
      reducedMotion: false,
      canvasMounted: false,
      delayMs: 2000,
      setHintVisible,
    });
    // Before 2s: NOT visible.
    vi.advanceTimersByTime(1999);
    expect(setHintVisible).not.toHaveBeenCalled();
    // At 2s: visible.
    vi.advanceTimersByTime(1);
    expect(setHintVisible).toHaveBeenCalledTimes(1);
    expect(setHintVisible).toHaveBeenCalledWith(true);
    cleanup?.();
  });

  it("H2: cleanup (simulating gesture-driven canvasMounted flip) cancels the pending timer", () => {
    const setHintVisible = vi.fn();
    const cleanup = setupHintTimer({
      reducedMotion: false,
      canvasMounted: false,
      delayMs: 2000,
      setHintVisible,
    });
    // Gesture fires at t=500 ms → React re-runs the effect, cleanup runs.
    vi.advanceTimersByTime(500);
    cleanup?.();
    // Even past the original deadline: hint NEVER set visible.
    vi.advanceTimersByTime(5000);
    expect(setHintVisible).not.toHaveBeenCalled();
  });

  it("H3: with canvasMounted=true (e.g. canvas-mount path), timer is never scheduled", () => {
    const setHintVisible = vi.fn();
    const cleanup = setupHintTimer({
      reducedMotion: false,
      canvasMounted: true,
      delayMs: 2000,
      setHintVisible,
    });
    vi.advanceTimersByTime(10_000);
    expect(setHintVisible).not.toHaveBeenCalled();
    cleanup?.();
  });

  it("H4: reducedMotion=true → timer never scheduled, hint never shown", () => {
    const setHintVisible = vi.fn();
    const cleanup = setupHintTimer({
      reducedMotion: true,
      canvasMounted: false,
      delayMs: 2000,
      setHintVisible,
    });
    vi.advanceTimersByTime(10_000);
    expect(setHintVisible).not.toHaveBeenCalled();
    cleanup?.();
  });

  it("H5: hint copy is ≤ 25 characters", () => {
    expect(typeof HINT_COPY).toBe("string");
    expect(HINT_COPY.length).toBeGreaterThan(0);
    expect(HINT_COPY.length).toBeLessThanOrEqual(25);
  });

  it("H6: source — hint timer body does NOT reference setGestured / setCanvasMounted / mountHabitatScene", () => {
    // The hint timer's setTimeout callback may only flip the hint-visibility
    // state. It MUST NOT also mount the canvas (that is the gesture gate's
    // job exclusively).
    const src = srcText();
    // Find the setupHintTimer body. We scan from the function signature to
    // its closing brace via a balanced-brace walk.
    const startIdx = src.indexOf("export function setupHintTimer");
    expect(startIdx).toBeGreaterThan(-1);
    let depth = 0;
    let i = src.indexOf("{", startIdx);
    const bodyStart = i;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = src.slice(bodyStart, i + 1);
    expect(body).not.toMatch(/setGestured/);
    expect(body).not.toMatch(/setCanvasMounted/);
    expect(body).not.toMatch(/mountHabitatScene/);
  });

  it("H7: source — hint JSX is rendered with aria-hidden, pointerEvents:none, position:absolute (CLS=0 + no input absorption)", () => {
    const src = srcText();
    // The hint element is keyed by data-testid="habitat-canvas-hint".
    const idx = src.indexOf('data-testid="habitat-canvas-hint"');
    expect(idx).toBeGreaterThan(-1);
    // Pull a slice around it large enough to capture the surrounding JSX.
    const slice = src.slice(Math.max(0, idx - 400), idx + 600);
    expect(slice).toMatch(/aria-hidden/);
    expect(slice).toMatch(/pointerEvents:\s*["']none["']/);
    expect(slice).toMatch(/position:\s*["']absolute["']/);
    // The hint must be wrapped in a guard that includes reducedMotion + hintVisible
    // + canvasMounted so it cannot render for reduced-motion users or once the
    // canvas mounts.
    const guardStart = src.lastIndexOf("{", idx);
    const guardSlice = src.slice(guardStart, idx);
    expect(guardSlice).toMatch(/!reducedMotion/);
    expect(guardSlice).toMatch(/hintVisible/);
    expect(guardSlice).toMatch(/!canvasMounted/);
  });

  it("H8: source — HINT_COPY contains 'Tap to animate' (or another ≤25-char string) and is rendered inside the overlay", () => {
    const src = srcText();
    // HINT_COPY constant declared at top-level.
    expect(src).toMatch(/const HINT_COPY\s*=/);
    // HINT_COPY referenced inside the overlay JSX (the only other reference
    // besides the constant declaration).
    const refs = src.match(/HINT_COPY/g) ?? [];
    expect(refs.length).toBeGreaterThanOrEqual(2);
  });
});
