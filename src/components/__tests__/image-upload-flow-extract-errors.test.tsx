// @vitest-environment jsdom
/**
 * Rendered-component tests for the CR-01 / WR-02 fixes in handleExtract
 * (src/components/image-upload-flow.tsx). Phase 22 lesson: reducer-only
 * tests pass on a dead UI — these mount <ImageUploadFlow> for real so a
 * regression in the actual wiring (not just the reducer) is caught.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageUploadFlow } from "@/components/image-upload-flow";
import { MAX_SERVER_IMAGE_BYTES } from "@/lib/image-constants";

// Mock resizeImageForUpload so each test controls resolve/reject directly —
// jsdom has no createImageBitmap/canvas implementation anyway (see
// image-resize.test.ts header comment).
const { mockResize } = vi.hoisted(() => ({ mockResize: vi.fn() }));
vi.mock("@/lib/image-resize", () => ({
  resizeImageForUpload: mockResize,
}));

afterEach(() => cleanup());

const DECKS = [{ id: "deck-1", name: "French #1", language: "fr" }];

function renderFlow() {
  return render(
    <ImageUploadFlow decks={DECKS} defaultDeckId="deck-1" nativeLang="en" />,
  );
}

function pickFile(file: File) {
  const input = screen.getByLabelText("Upload image") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], writable: false });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("CR-01: resizeImageForUpload rejection surfaces the error UI (not a stuck spinner)", () => {
  it("decode failure dispatches an error and renders the recovery UI with a reachable Try again", async () => {
    mockResize.mockRejectedValue(new Error("Canvas toBlob failed"));

    renderFlow();

    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    pickFile(file);

    // Auto-advanced to Confirm (step "deck") — click Extract words.
    const extractBtn = await screen.findByRole("button", {
      name: /extract words/i,
    });
    fireEvent.click(extractBtn);

    // Should NOT stay stuck on "Reading your image…" — must resolve to the
    // error banner + reachable "Try again" button.
    const tryAgainBtn = await screen.findByRole(
      "button",
      { name: /try again/i },
      { timeout: 3000 },
    );
    expect(tryAgainBtn).toBeTruthy();
    expect(screen.queryByText(/reading your image/i)).toBeNull();

    // fetch must never have been reached — the failure happened before the
    // network call.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("FileReader failure also surfaces the error UI instead of hanging", async () => {
    mockResize.mockResolvedValue(new Blob(["ok"], { type: "image/jpeg" }));

    // jsdom's FileReader works, but we force an error path via a Blob whose
    // .arrayBuffer/slicing jsdom can still read — instead, simplest: spy on
    // FileReader.prototype.readAsDataURL to synchronously fire onerror.
    const readSpy = vi
      .spyOn(FileReader.prototype, "readAsDataURL")
      .mockImplementation(function (this: FileReader) {
        this.onerror?.(
          new ProgressEvent("error") as unknown as ProgressEvent<FileReader>,
        );
      });

    renderFlow();

    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    pickFile(file);

    const extractBtn = await screen.findByRole("button", {
      name: /extract words/i,
    });
    fireEvent.click(extractBtn);

    const tryAgainBtn = await screen.findByRole(
      "button",
      { name: /try again/i },
      { timeout: 3000 },
    );
    expect(tryAgainBtn).toBeTruthy();
    expect(screen.queryByText(/reading your image/i)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();

    readSpy.mockRestore();
  });
});

describe("WR-02: oversized resized payload fails fast client-side instead of a post-upload 413", () => {
  it("dispatches an error and never calls fetch when the base64-adjusted size exceeds MAX_SERVER_IMAGE_BYTES", async () => {
    // Build a Blob whose byte length alone already exceeds the cap, so the
    // base64-adjusted dataUrl length certainly does too.
    const oversizedBytes = new Uint8Array(MAX_SERVER_IMAGE_BYTES + 1024);
    mockResize.mockResolvedValue(
      new Blob([oversizedBytes], { type: "image/jpeg" }),
    );

    renderFlow();

    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    pickFile(file);

    const extractBtn = await screen.findByRole("button", {
      name: /extract words/i,
    });
    fireEvent.click(extractBtn);

    // friendlyErrorCopy(413) copy — the same banner used for the server's
    // real 413, but triggered client-side before any network round trip.
    await screen.findByText(
      /too large for the server to process/i,
      {},
      { timeout: 3000 },
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("a resized payload comfortably under the cap proceeds to the network call", async () => {
    mockResize.mockResolvedValue(new Blob(["small"], { type: "image/jpeg" }));
    // words: [] (not a non-empty array) so the component lands on the
    // "No words found" branch rather than mounting <ReviewList>, which
    // needs a Next.js router context this test does not provide — the
    // point here is only that the network call was reached.
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ words: [] }),
    });

    renderFlow();

    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    pickFile(file);

    const extractBtn = await screen.findByRole("button", {
      name: /extract words/i,
    });
    fireEvent.click(extractBtn);

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });
});
