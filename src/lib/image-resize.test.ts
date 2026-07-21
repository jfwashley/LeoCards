// @vitest-environment jsdom
/**
 * jsdom does not implement createImageBitmap / canvas.getContext('2d') /
 * toBlob (no `canvas` npm package installed) — mock all three browser APIs
 * directly (project convention, see image-upload-flow-cancel.test.tsx:1).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resizeImageForUpload } from "@/lib/image-resize";

function mockBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() };
}

describe("resizeImageForUpload", () => {
  const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });

  let getContextSpy: ReturnType<typeof vi.spyOn>;
  let toBlobSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
    toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
        cb(new Blob(["fake"], { type: "image/jpeg" }));
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clamps a 3000x2000 image to 1568x1045 (long edge 1568, aspect preserved)", async () => {
    global.createImageBitmap = vi
      .fn()
      .mockResolvedValue(
        mockBitmap(3000, 2000),
      ) as unknown as typeof createImageBitmap;

    let capturedWidth = 0;
    let capturedHeight = 0;
    toBlobSpy.mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
    ) {
      capturedWidth = this.width;
      capturedHeight = this.height;
      cb(new Blob(["fake"], { type: "image/jpeg" }));
    });

    await resizeImageForUpload(file);

    expect(capturedWidth).toBe(1568);
    expect(capturedHeight).toBe(1045);
  });

  it("does not upscale an image already <=1568px on its long edge", async () => {
    global.createImageBitmap = vi
      .fn()
      .mockResolvedValue(
        mockBitmap(800, 600),
      ) as unknown as typeof createImageBitmap;

    let capturedWidth = 0;
    let capturedHeight = 0;
    toBlobSpy.mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
    ) {
      capturedWidth = this.width;
      capturedHeight = this.height;
      cb(new Blob(["fake"], { type: "image/jpeg" }));
    });

    await resizeImageForUpload(file);

    expect(capturedWidth).toBe(800);
    expect(capturedHeight).toBe(600);
  });

  it("calls toBlob with image/jpeg and the default quality 0.8, returning the mocked Blob", async () => {
    global.createImageBitmap = vi
      .fn()
      .mockResolvedValue(
        mockBitmap(1000, 1000),
      ) as unknown as typeof createImageBitmap;

    const result = await resizeImageForUpload(file);

    expect(toBlobSpy).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
      0.8,
    );
    expect(result).toBeInstanceOf(Blob);
  });

  it("throws 'Canvas 2D context unavailable' when getContext returns null", async () => {
    global.createImageBitmap = vi
      .fn()
      .mockResolvedValue(
        mockBitmap(1000, 1000),
      ) as unknown as typeof createImageBitmap;
    getContextSpy.mockReturnValue(null);

    await expect(resizeImageForUpload(file)).rejects.toThrow(
      "Canvas 2D context unavailable",
    );
  });
});
