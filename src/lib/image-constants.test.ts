import { describe, expect, it } from "vitest";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";

describe("image-constants", () => {
  it("ALLOWED_IMAGE_TYPES includes jpeg, png, webp", () => {
    expect(ALLOWED_IMAGE_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has("image/webp")).toBe(true);
  });

  it("ALLOWED_IMAGE_TYPES does not include gif or heic", () => {
    expect(ALLOWED_IMAGE_TYPES.has("image/gif")).toBe(false);
    expect(ALLOWED_IMAGE_TYPES.has("image/heic")).toBe(false);
  });

  it("MAX_IMAGE_BYTES is exactly 5MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});
