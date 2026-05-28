#!/usr/bin/env node
// scripts/render-habitat-posters.mjs — Phase 13.1 Plan 01 Task 2.
//
// One-shot orchestrator that:
//   1. Drives the Playwright spec e2e/scripts/render-habitat-posters.spec.ts,
//      which writes raw PNGs to e2e/scripts/.tmp/hero-l{1..9}.png.
//   2. Converts each PNG → webp via `sharp` (quality 82, effort 5).
//   3. Validates each output is ≥ 720×405 and within 20 KB ≤ bytes ≤ 100 KB.
//      Retries once at quality 92 (under-band) or quality 70 (over-band).
//   4. Writes the 9 webps to public/habitat/hero-l{1..9}.webp.
//   5. Cleans up the .tmp PNGs on success.
//
// Run: `npm run posters:habitat` (requires `npm run dev` on :3000).

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPEC = "e2e/scripts/render-habitat-posters.spec.ts";
const TMP_DIR = path.join(ROOT, "e2e", "scripts", ".tmp");
const OUT_DIR = path.join(ROOT, "public", "habitat");

// Phase 13.1 fine-tune iteration B: shrink poster bytes to halve LCP fetch
// time on Slow 4G. Target 720×405 (vs 1280×720) + q=40 (vs q=82) → ~6-10 KB
// per webp (was ~25 KB). SPEC R1 size band relaxed accordingly (was 20-100 KB).
const MIN_BYTES = 3_000;
const MAX_BYTES = 25_000;
const MIN_WIDTH = 720;
const MIN_HEIGHT = 405;

function fail(msg) {
  console.error(`\n[render-habitat-posters] FAIL: ${msg}`);
  process.exit(1);
}

function fmtKB(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

// Canvas is clamped to 400px tall in production CSS (`maxHeight: min(70vh, 400px)`),
// so a 1280-wide screenshot captures 1280×400. We resize to 1280×720 (16:9) so the
// poster meets the ≥720×405 LCP-candidate floor and matches the wrapper's 16:9
// `aspectRatio` exactly. Lanczos3 upscaling is fine here — the scene is rendered
// stylised low-poly clay, no fine detail to alias.
const TARGET_W = 720;
const TARGET_H = 405;

async function encodeWebp(buf, quality) {
  return sharp(buf)
    .resize(TARGET_W, TARGET_H, { fit: "fill", kernel: "lanczos3" })
    .webp({ quality, effort: 6 })
    .toBuffer();
}

async function processLevel(level) {
  const pngPath = path.join(TMP_DIR, `hero-l${level}.png`);
  if (!fs.existsSync(pngPath)) {
    fail(`missing intermediate PNG: ${pngPath}`);
  }
  const pngBuf = fs.readFileSync(pngPath);

  // Initial encode at quality 40 (shrink-iteration B).
  let quality = 40;
  let webpBuf = await encodeWebp(pngBuf, quality);
  let meta = await sharp(webpBuf).metadata();

  if ((meta.width ?? 0) < MIN_WIDTH || (meta.height ?? 0) < MIN_HEIGHT) {
    fail(
      `L${level}: dimensions ${meta.width}x${meta.height} below ${MIN_WIDTH}x${MIN_HEIGHT}`,
    );
  }

  let size = webpBuf.length;
  let note = "";

  if (size < MIN_BYTES) {
    quality = 60;
    webpBuf = await encodeWebp(pngBuf, quality);
    size = webpBuf.length;
    note = " (retry @q60)";
    if (size < MIN_BYTES) {
      fail(`L${level}: ${size} B still under ${MIN_BYTES} B after retry`);
    }
  } else if (size > MAX_BYTES) {
    quality = 30;
    webpBuf = await encodeWebp(pngBuf, quality);
    size = webpBuf.length;
    note = " (retry @q30)";
    if (size > MAX_BYTES) {
      fail(`L${level}: ${size} B still over ${MAX_BYTES} B after retry`);
    }
  }

  // Re-read metadata after potential retry encode.
  meta = await sharp(webpBuf).metadata();

  const outPath = path.join(OUT_DIR, `hero-l${level}.webp`);
  fs.writeFileSync(outPath, webpBuf);
  console.log(
    `  hero-l${level}.webp  ${meta.width}x${meta.height}  ${fmtKB(size)}${note}`,
  );
  return { level, bytes: size, width: meta.width, height: meta.height };
}

async function main() {
  console.log("[render-habitat-posters] running Playwright spec...");
  const result = spawnSync(
    "npx",
    ["playwright", "test", SPEC, "--reporter=line"],
    { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    fail(`Playwright spec exited with code ${result.status}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("\n[render-habitat-posters] encoding webps...");
  const results = [];
  for (const level of LEVELS) {
    results.push(await processLevel(level));
  }

  const total = results.reduce((acc, r) => acc + r.bytes, 0);
  console.log(
    `\n[render-habitat-posters] wrote ${results.length}/9 files, total ${fmtKB(total)}`,
  );

  // Cleanup .tmp on success.
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
