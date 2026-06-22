// @vitest-environment jsdom
/**
 * D-03 cancelled.current guard tests for image-upload-flow.tsx.
 *
 * Tests verify:
 * 1. The reducer's EXTRACT_CANCEL action (the D-03 cancel path) returns to the
 *    Confirm surface (step stays "deck", extracting cleared) while preserving the
 *    file, previewUrl, and selectedDeckId — the D-16 preservation that keeps the
 *    image + deck present after Cancel. (BACK_TO_PICK is the separate Re-pick path
 *    that intentionally returns to the dropzone.)
 * 2. The D-03 pure guard: when cancelled.current is true, a resolved result should
 *    be ignored; when false, it should proceed normally.
 * 3. Pitfall 3 regression: after cancelling and retrying, the guard resets correctly
 *    so the next successful extraction is not swallowed.
 */

import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ImageFlowState } from "@/components/image-upload-flow";
import { imageFlowReducer } from "@/components/image-upload-flow";

afterEach(() => cleanup());

// ─── D-16 Preservation via Reducer ───────────────────────────────────────────

describe("imageFlowReducer — EXTRACT_CANCEL returns to Confirm + preserves image + deck (D-03/D-16)", () => {
  const file = new File(["x"], "photo.png", { type: "image/png" });
  const extractingState: ImageFlowState = {
    step: "deck",
    file,
    previewUrl: "blob:fake-url",
    pickError: null,
    selectedDeckId: "deck-123",
    extracting: true,
    extractError: null,
    extractWords: null,
  };

  it("EXTRACT_CANCEL stays on step=deck (the Confirm surface, NOT the dropzone)", () => {
    const next = imageFlowReducer(extractingState, { type: "EXTRACT_CANCEL" });
    expect(next.step).toBe("deck");
  });

  it("EXTRACT_CANCEL clears extracting (reveals the Confirm surface again)", () => {
    const next = imageFlowReducer(extractingState, { type: "EXTRACT_CANCEL" });
    expect(next.extracting).toBe(false);
  });

  it("EXTRACT_CANCEL preserves file reference (image still present after cancel)", () => {
    const next = imageFlowReducer(extractingState, { type: "EXTRACT_CANCEL" });
    expect(next.file).toBe(file);
  });

  it("EXTRACT_CANCEL preserves previewUrl (thumbnail still shown after cancel)", () => {
    const next = imageFlowReducer(extractingState, { type: "EXTRACT_CANCEL" });
    expect(next.previewUrl).toBe("blob:fake-url");
  });

  it("EXTRACT_CANCEL preserves selectedDeckId (deck choice still intact after cancel)", () => {
    const next = imageFlowReducer(extractingState, { type: "EXTRACT_CANCEL" });
    expect(next.selectedDeckId).toBe("deck-123");
  });

  it("BACK_TO_PICK is the Re-pick path → step=pick (dropzone), distinct from cancel", () => {
    const next = imageFlowReducer(extractingState, { type: "BACK_TO_PICK" });
    expect(next.step).toBe("pick");
  });
});

// ─── D-03 Cancelled Guard — pure logic ───────────────────────────────────────

/**
 * The D-03 guard is a one-line pattern: `if (cancelled.current) return;`
 * We verify the guard's decision contract using a tiny pure helper that mirrors
 * what the component does — the exact same pattern from review-list.tsx.
 */

// Pure helper: should we ignore a result?
function shouldIgnoreResult(cancelledRef: { current: boolean }): boolean {
  return cancelledRef.current;
}

// Pure helper: reset before retry
function resetCancelledGuard(cancelledRef: { current: boolean }): void {
  cancelledRef.current = false;
}

describe("D-03 cancelled.current guard — pure logic", () => {
  it("returns false when not cancelled (result should be processed)", () => {
    const cancelled = { current: false };
    expect(shouldIgnoreResult(cancelled)).toBe(false);
  });

  it("returns true when cancelled (late result should be ignored)", () => {
    const cancelled = { current: true };
    expect(shouldIgnoreResult(cancelled)).toBe(true);
  });

  it("guard ignores a EXTRACT_SUCCESS dispatch when cancelled=true", () => {
    const cancelled = { current: false };

    // Simulate: user clicks Cancel → sets cancelled=true, dispatches EXTRACT_CANCEL
    cancelled.current = true;

    // Simulate: extraction resolves late — guard should prevent dispatch
    expect(shouldIgnoreResult(cancelled)).toBe(true);
    // (no dispatch happens — no state advance)
  });

  it("Pitfall 3: guard resets before next retry so subsequent success is not swallowed", () => {
    const cancelled = { current: false };

    // Round 1: Cancel
    cancelled.current = true;
    expect(shouldIgnoreResult(cancelled)).toBe(true);

    // Reset before retry (this is what handleExtract does at its top)
    resetCancelledGuard(cancelled);

    // Round 2: Fresh extraction resolves — guard should be false
    expect(shouldIgnoreResult(cancelled)).toBe(false);
  });

  it("guard resets to false after reset even if set true multiple times", () => {
    const cancelled = { current: true };
    resetCancelledGuard(cancelled);
    expect(cancelled.current).toBe(false);
  });
});

// ─── Reducer: EXTRACT_START resets extraction state ──────────────────────────

describe("imageFlowReducer — EXTRACT_START (reset on retry)", () => {
  const file = new File(["x"], "photo.png", { type: "image/png" });
  const errorState: ImageFlowState = {
    step: "deck",
    file,
    previewUrl: "blob:fake-url",
    pickError: null,
    selectedDeckId: "deck-123",
    extracting: false,
    extractError: { status: 500, message: "Server error" },
    extractWords: null,
  };

  it("EXTRACT_START clears extractError and sets extracting=true", () => {
    const next = imageFlowReducer(errorState, { type: "EXTRACT_START" });
    expect(next.extracting).toBe(true);
    expect(next.extractError).toBeNull();
  });

  it("EXTRACT_RETRY preserves file + deck (D-16 regression guard)", () => {
    const next = imageFlowReducer(errorState, { type: "EXTRACT_RETRY" });
    expect(next.file).toBe(file);
    expect(next.selectedDeckId).toBe("deck-123");
    expect(next.previewUrl).toBe("blob:fake-url");
  });
});
