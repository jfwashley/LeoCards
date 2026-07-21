export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
// Authoritative server-side cap (decoded byte estimate / Content-Length).
// D-07: intentionally kept BELOW the loosened client cap (Vercel's ~4.5MB
// body limit), so an oversized body cannot slip through even if client
// resize is bypassed — closes the silent 3.3-5MB dead zone.
export const MAX_SERVER_IMAGE_BYTES = 4 * 1024 * 1024; // 4,194,304 bytes
// Loosened client-side cap surfaced in user-facing copy (D-07). Modern phone
// photos often exceed the old 5MB cap; they're downscaled client-side
// (resizeImageForUpload, ~1568px/JPEG 0.8) before upload anyway.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20,971,520 bytes
