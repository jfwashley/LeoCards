// PERF-10 (D-06): client-side downscale before upload — a 5MB phone photo
// becomes a few hundred KB. createImageBitmap auto-orients per EXIF by
// default (imageOrientation: "from-image"), so no manual EXIF parsing is
// needed. Zero new dependencies — native createImageBitmap + canvas + toBlob.
export async function resizeImageForUpload(
  file: File,
  {
    maxEdge = 1568,
    quality = 0.8,
  }: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // auto-orients per EXIF by default
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close(); // free ImageBitmap memory promptly

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      quality,
    );
  });
}
