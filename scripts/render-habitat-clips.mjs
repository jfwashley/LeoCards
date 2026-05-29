#!/usr/bin/env node
// scripts/render-habitat-clips.mjs — Phase 13.1 Plan VIDEO-01.
//
// One-shot, build-time orchestrator that bakes the live Three.js /habitat
// scene into 36 looping ambient video clips — one per (level 1..9) ×
// (mood: excited|happy|neutral|sad) — as BOTH webm (VP9) and mp4 (H.264).
// Output: public/habitat/clips/l{N}-{mood}.{webm,mp4}.
//
// Pipeline:
//   1. Drive the Playwright spec e2e/scripts/render-habitat-clips.spec.ts,
//      which captures 24fps × 5s = 120 PNG frames per clip into
//      e2e/scripts/.tmp/clips/l{N}-{mood}/frame-####.png with a FIXED camera
//      and AMBIENT motion running.
//   2. For each clip dir, encode frames → seamless-looping webm + mp4 via
//      the ffmpeg-static binary (ffmpeg is not installed system-wide).
//   3. Validate each output: exists, size within band, valid duration ≥ 4s.
//   4. Write to public/habitat/clips/. Clean .tmp/clips/ on success.
//
// Seamless loop: a short crossfade masks the seam. We hold out the last
// CROSSFADE_S of frames and `xfade` them over the first CROSSFADE_S, so the
// final clip is (DURATION_S − CROSSFADE_S) long and its end blends smoothly
// into its start. A tiny residual seam is acceptable for v1.
//
// De-risk: pass `--only=l5-happy` to render a single clip end-to-end before
// the full batch. The flag narrows BOTH the Playwright capture scope (via
// CLIP_LEVELS / CLIP_MOODS env) and the encode scope.
//
// Run: `npm run clips:habitat` (requires `npm run dev` on :3000).

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MOODS = ["excited", "happy", "neutral", "sad"];
const SPEC = "e2e/scripts/render-habitat-clips.spec.ts";
const TMP_DIR = path.join(ROOT, "e2e", "scripts", ".tmp");
const CLIPS_TMP = path.join(TMP_DIR, "clips");
const OUT_DIR = path.join(ROOT, "public", "habitat", "clips");

// Must match the spec's capture settings.
const FPS = 24;
const DURATION_S = 5;
const CROSSFADE_S = 0.5; // tail→head blend that masks the loop seam
const LOOP_DURATION_S = DURATION_S - CROSSFADE_S; // 4.5s final clip length

// Size bands (per clip). webm (VP9) is the primary; mp4 (H.264) the fallback.
const WEBM_MAX = 800 * 1024;
const MP4_MAX = 900 * 1024;
const MIN_BYTES = 5 * 1024; // guard against empty / broken encodes
const MIN_DURATION_S = 4;

// --- arg parsing -----------------------------------------------------------
const args = process.argv.slice(2);
let onlyClip = null;
for (const a of args) {
  if (a.startsWith("--only=")) onlyClip = a.slice("--only=".length).trim();
}

function fail(msg) {
  console.error(`\n[render-habitat-clips] FAIL: ${msg}`);
  process.exit(1);
}
function fmtKB(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

function targetClips() {
  const all = [];
  for (const level of LEVELS) {
    for (const mood of MOODS)
      all.push({ level, mood, name: `l${level}-${mood}` });
  }
  if (onlyClip) {
    const m = all.filter((c) => c.name === onlyClip);
    if (m.length === 0) fail(`--only=${onlyClip} matched no clip`);
    return m;
  }
  return all;
}

function runFfmpeg(ffArgs, label) {
  // Windows note: ffmpeg-static ships ffmpeg.exe; spawn it directly (no shell).
  const r = spawnSync(ffmpegPath, ffArgs, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  if (r.error) fail(`ffmpeg (${label}) spawn error: ${r.error.message}`);
  if (r.status !== 0) {
    const tail = (r.stderr || "").split("\n").slice(-25).join("\n");
    fail(`ffmpeg (${label}) exited ${r.status}:\n${tail}`);
  }
  return r;
}

// Read clip duration via ffmpeg's stderr (ffprobe is not bundled). We decode
// to null and read the reported time — robust and dependency-free.
function probeDurationS(file) {
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-i", file], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1 << 24,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const [, h, mm, ss] = m;
  return Number(h) * 3600 + Number(mm) * 60 + Number(ss);
}

// Build the xfade filter that blends the clip's tail over its head so the loop
// is seamless. Input is the raw frame sequence; we duplicate the stream and
// xfade the second copy (offset to the loop point) over the first.
//
//   [0]trim=0:LOOP_DURATION_S            -> body that plays start..loop point
//   [0]trim=LOOP_DURATION_S:DURATION_S   -> tail (CROSSFADE_S long)
// We xfade the tail INTO the head region. Simplest reliable idiom: split the
// full clip, offset, and xfade with transition=fade.
function buildXfadeFilter() {
  // labels: split full clip into [a][b]; b is the same clip; xfade a over b
  // at offset (LOOP_DURATION_S) for CROSSFADE_S. Output is LOOP_DURATION_S +
  // we then trim to LOOP_DURATION_S. fps + format normalize the stream.
  return (
    `fps=${FPS},format=yuv420p,split[a][b];` +
    `[a][b]xfade=transition=fade:duration=${CROSSFADE_S}:offset=${LOOP_DURATION_S},` +
    `trim=0:${LOOP_DURATION_S},setpts=PTS-STARTPTS`
  );
}

function encodeWebm(framesGlob, outPath) {
  const vf = buildXfadeFilter();
  runFfmpeg(
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      framesGlob,
      "-vf",
      vf,
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      "0",
      "-crf",
      "34",
      "-row-mt",
      "1",
      "-r",
      String(FPS),
      outPath,
    ],
    "webm",
  );
}

function encodeMp4(framesGlob, outPath) {
  const vf = buildXfadeFilter();
  runFfmpeg(
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      framesGlob,
      "-vf",
      vf,
      "-an",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "28",
      "-preset",
      "slow",
      "-movflags",
      "+faststart",
      "-r",
      String(FPS),
      outPath,
    ],
    "mp4",
  );
}

function validate(outPath, maxBytes, label) {
  if (!fs.existsSync(outPath)) fail(`${label}: missing output ${outPath}`);
  const bytes = fs.statSync(outPath).size;
  if (bytes < MIN_BYTES) fail(`${label}: ${bytes} B suspiciously small`);
  if (bytes > maxBytes) {
    fail(`${label}: ${fmtKB(bytes)} exceeds budget ${fmtKB(maxBytes)}`);
  }
  const dur = probeDurationS(outPath);
  if (dur === null) fail(`${label}: could not read duration`);
  if (dur < MIN_DURATION_S) {
    fail(`${label}: duration ${dur.toFixed(2)}s < ${MIN_DURATION_S}s`);
  }
  return { bytes, dur };
}

function encodeClip(clip) {
  const frameDir = path.join(CLIPS_TMP, clip.name);
  if (!fs.existsSync(frameDir)) {
    fail(`missing frame dir for ${clip.name}: ${frameDir}`);
  }
  const framesGlob = path.join(frameDir, "frame-%04d.png");

  const webmOut = path.join(OUT_DIR, `${clip.name}.webm`);
  const mp4Out = path.join(OUT_DIR, `${clip.name}.mp4`);

  encodeWebm(framesGlob, webmOut);
  const webm = validate(webmOut, WEBM_MAX, `${clip.name}.webm`);

  encodeMp4(framesGlob, mp4Out);
  const mp4 = validate(mp4Out, MP4_MAX, `${clip.name}.mp4`);

  console.log(
    `  ${clip.name}  webm ${fmtKB(webm.bytes)} (${webm.dur.toFixed(2)}s)` +
      `  mp4 ${fmtKB(mp4.bytes)} (${mp4.dur.toFixed(2)}s)`,
  );
  return { name: clip.name, webm: webm.bytes, mp4: mp4.bytes };
}

function main() {
  const clips = targetClips();

  // Narrow the Playwright capture scope to match --only (de-risk single clip).
  const env = { ...process.env };
  if (onlyClip) {
    const c = clips[0];
    env.CLIP_LEVELS = String(c.level);
    env.CLIP_MOODS = c.mood;
  }

  console.log(
    `[render-habitat-clips] capturing frames for ${clips.length} clip(s)` +
      `${onlyClip ? ` (--only=${onlyClip})` : ""}...`,
  );
  const capture = spawnSync(
    "npx",
    ["playwright", "test", SPEC, "--reporter=line"],
    { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32", env },
  );
  if (capture.status !== 0) {
    fail(`Playwright capture spec exited with code ${capture.status}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("\n[render-habitat-clips] encoding clips...");
  const results = [];
  let i = 0;
  for (const clip of clips) {
    i++;
    process.stdout.write(`[${i}/${clips.length}] `);
    results.push(encodeClip(clip));
  }

  const totalWebm = results.reduce((a, r) => a + r.webm, 0);
  const totalMp4 = results.reduce((a, r) => a + r.mp4, 0);
  const total = totalWebm + totalMp4;
  console.log(
    `\n[render-habitat-clips] wrote ${results.length} clip(s) ` +
      `(${results.length} webm + ${results.length} mp4).`,
  );
  console.log(
    `  total webm ${fmtKB(totalWebm)}  |  total mp4 ${fmtKB(totalMp4)}  |  ` +
      `grand total ${fmtKB(total)}`,
  );
  console.log(
    `  avg per clip-pair ${fmtKB(total / results.length)} ` +
      `(webm ${fmtKB(totalWebm / results.length)}, ` +
      `mp4 ${fmtKB(totalMp4 / results.length)})`,
  );

  // Clean .tmp/clips only on a FULL successful batch (keep frames around when
  // running --only so a follow-up encode tweak doesn't require a recapture).
  if (!onlyClip) {
    fs.rmSync(CLIPS_TMP, { recursive: true, force: true });
  }
}

main();
