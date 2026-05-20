export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
// Authoritative server-side cap (decoded byte estimate / Content-Length).
// Kept ~2MB above the client UI cap to absorb base64 overhead + small slack.
export const MAX_SERVER_IMAGE_BYTES = 7 * 1024 * 1024; // 7,340,032 bytes
// Conservative client-side cap surfaced in user-facing copy.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
