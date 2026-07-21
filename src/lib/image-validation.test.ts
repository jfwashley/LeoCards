import { describe, expect, it } from "vitest";
import { validateImageFile } from "@/lib/image-validation";

describe("validateImageFile — type validation", () => {
  it("accepts image/jpeg", () => {
    const file = new File([], "photo.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("accepts image/png", () => {
    const file = new File([], "photo.png", { type: "image/png" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("accepts image/webp", () => {
    const file = new File([], "photo.webp", { type: "image/webp" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("rejects image/heic and names the extension in the message", () => {
    const file = new File([], "photo.heic", { type: "image/heic" });
    const result = validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("HEIC");
  });

  it("rejects image/gif", () => {
    const file = new File([], "anim.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toMatchObject({ ok: false });
  });
});

describe("validateImageFile — size validation", () => {
  const TWENTY_MB = 20 * 1024 * 1024; // D-07: client cap loosened to ~20MB

  it("accepts a file at exactly 20MB", () => {
    const file = new File([new Uint8Array(TWENTY_MB)], "ok.jpg", {
      type: "image/jpeg",
    });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("rejects a file over 20MB and names the size in the message", () => {
    const file = new File([new Uint8Array(TWENTY_MB + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    const result = validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/MB/);
  });

  it("rejects a 22.3MB file and shows correct rounded size + cap", () => {
    const file = new File(
      [new Uint8Array(Math.round(22.3 * 1024 * 1024))],
      "big.jpg",
      { type: "image/jpeg" },
    );
    const result = validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("22.3MB");
      expect(result.message).toContain("under 20MB");
    }
  });
});
