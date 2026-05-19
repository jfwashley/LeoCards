import { describe, expect, it } from "vitest";
// imageFlowReducer will be exported from image-upload-flow.tsx in 10-03 — RED until then
import { imageFlowReducer } from "@/components/image-upload-flow";

const mockFile = new File(["mock-content"], "photo.jpg", { type: "image/jpeg" });

const baseState = {
  step: "deck" as const,
  file: mockFile,
  previewUrl: "blob:x",
  pickError: null,
  selectedDeckId: "deck-1",
  extracting: false,
  extractError: null as { status: number; message: string } | null,
  extractWords: null as string[] | null,
};

describe("imageFlowReducer — extraction actions", () => {
  it("EXTRACT_START sets extracting: true, clears error and words", () => {
    const state = { ...baseState, extractError: { status: 429, message: "Too many" }, extractWords: ["chien"] };
    const next = imageFlowReducer(state, { type: "EXTRACT_START" });
    expect(next.extracting).toBe(true);
    expect(next.extractError).toBeNull();
    expect(next.extractWords).toBeNull();
  });

  it("EXTRACT_SUCCESS sets extractWords and clears extracting", () => {
    const state = { ...baseState, extracting: true };
    const next = imageFlowReducer(state, { type: "EXTRACT_SUCCESS", words: ["chien", "chat"] });
    expect(next.extracting).toBe(false);
    expect(next.extractWords).toEqual(["chien", "chat"]);
  });

  it("EXTRACT_NO_WORDS sets extractWords to [] (not null)", () => {
    const state = { ...baseState, extracting: true };
    const next = imageFlowReducer(state, { type: "EXTRACT_NO_WORDS" });
    expect(next.extracting).toBe(false);
    expect(Array.isArray(next.extractWords)).toBe(true);
    expect(next.extractWords).toHaveLength(0);
  });

  it("EXTRACT_ERROR sets extractError with status and message", () => {
    const state = { ...baseState, extracting: true };
    const next = imageFlowReducer(state, { type: "EXTRACT_ERROR", status: 429, message: "Too many requests" });
    expect(next.extracting).toBe(false);
    expect(next.extractError).toEqual({ status: 429, message: "Too many requests" });
  });

  it("EXTRACT_ERROR preserves file, previewUrl, and selectedDeckId (EXT-04 / D-16)", () => {
    const state = { ...baseState, extracting: true };
    const next = imageFlowReducer(state, { type: "EXTRACT_ERROR", status: 413, message: "Image too large" });
    // toBe identity checks: these exact references must be preserved
    expect(next.file).toBe(mockFile);
    expect(next.previewUrl).toBe("blob:x");
    expect(next.selectedDeckId).toBe("deck-1");
  });

  it("EXTRACT_RETRY behaves identically to EXTRACT_START", () => {
    const state = { ...baseState, extractError: { status: 502, message: "Vision error" }, extractWords: null };
    const next = imageFlowReducer(state, { type: "EXTRACT_RETRY" });
    expect(next.extracting).toBe(true);
    expect(next.extractError).toBeNull();
    expect(next.extractWords).toBeNull();
  });
});
