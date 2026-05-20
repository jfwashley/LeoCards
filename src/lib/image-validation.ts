import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateImageFile(file: File): ValidationResult {
  // NOTE: file.type is browser-supplied (derived from extension or OS MIME
  // registry) and can be spoofed by renaming. This client-side guard is for
  // UX only — Phase 10 MUST validate magic bytes server-side before
  // processing the image. (IN-01)
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "unknown format";
    return {
      ok: false,
      message: `JPG, PNG, or WebP only — that file is a ${ext}. Please choose a supported format.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      message: `That image is ${mb}MB — please pick one under 5MB.`,
    };
  }
  return { ok: true };
}
