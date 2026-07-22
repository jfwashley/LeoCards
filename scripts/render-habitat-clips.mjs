#!/usr/bin/env node
// scripts/render-habitat-clips.mjs — Phase 13.1 Plan VIDEO-01.
//
// One-shot, build-time orchestrator that bakes the live Three.js /habitat
// scene into 36 looping ambient video clips — one per (level 1..9) ×
// (mood: excited|happy|neutral|sad) — as BOTH webm (VP9) and mp4 (H.264).
// Output: public/habitat/clips/l{N}-{mood}.{webm,mp4}.
//
// ── Pipeline (REAL-TIME capture rework) ────────────────────────────────────
// The capture spec (e2e/scripts/render-habitat-clips.spec.ts) now records the
// live WebGL canvas in real time via the in-page MediaRecorder API, producing
// ONE intermediate `*.raw.webm` per clip in e2e/scripts/.tmp/clips/. This
// replaced per-frame Playwright screenshots (~10.8 min/clip → ~6s/clip). The
// orchestrator's job is unchanged in spirit — re-encode + seamless-loop — but
// its INPUT is now one raw webm per clip instead of a directory of PNGs.
//
//   1. Drive the Playwright spec → one `.tmp/clips/l{N}-{mood}.raw.webm` each.
//   2. For each raw webm, ffmpeg-encode → seamless-looping webm + mp4:
//      (a) scale to 1280×720 + trim to a clean 16.0s,
//      (b) write public/habitat/clips/l{N}-{mood}.{webm,mp4}.
//   3. Validate each output: exists, size within band, valid duration ≥ 15s.
//   4. Clean .tmp/clips/ on a full successful batch.
//
// Seamless loop (Plan 13.1-VIDEO-03): the capture does a full 360° camera
// revolution over exactly 16s, which loops on its own — NO crossfade. (An xfade
// would blend a θ≈2π frame over θ≈0 and break the camera's rotational
// continuity.) Ambient particle periods don't all divide 16s, but the dominant
// orbit masks any faint discontinuity.
//
// De-risk: pass `--only=l5-happy` to render a single clip end-to-end before
// the full batch. The flag narrows BOTH the Playwright capture scope (via
// CLIP_LEVELS / CLIP_MOODS env) and the encode scope.
//
// ── Cache-Control (Phase 26 PERF-11) ────────────────────────────────────────
// next.config.ts sets `Cache-Control: public, max-age=31536000, immutable`
// on /habitat/clips/:path* — browsers cache l{N}-{mood}.{mp4,webm} FOREVER.
// D-08 NAMING RULE: any future re-render of an EXISTING l{N}-{mood} clip
// MUST ship under a NEW filename. A same-name replacement is invisible to
// any returning user until their cache clears — which for `immutable`
// assets may be effectively never. Do not overwrite an existing filename
// with new content; bump the filename (e.g. add a version/date suffix) and
// update every reference to it instead.
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

// Plan 13.1-VIDEO-03 output timing. The raw webm is ~16.5s; we trim to exactly
// TRIM_S = one full 360° camera revolution. The capture orbit is continuous +
// phase-invariant, so the loop is seamless with NO crossfade (an xfade would
// blend a θ≈2π frame over θ≈0 and break camera continuity).
const FPS = 30;
const TRIM_S = 16; // final clip length = one full revolution
const LOOP_DURATION_S = TRIM_S;

// Size bands (per clip). webm (VP9) is the primary; mp4 (H.264) the fallback.
// Raised for the 16s high-quality clips — only ONE pair lazy-loads per visit
// (after the priority poster), so the per-clip ceiling can be generous.
const WEBM_MAX = 900 * 1024;
const MP4_MAX = 1100 * 1024;
const MIN_BYTES = 5 * 1024; // guard against empty / broken encodes
const MIN_DURATION_S = 15;

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

// Build the loop filter. NO xfade: a full 360° camera revolution loops
// seamlessly on its own, and an xfade would blend a θ≈2π frame over θ≈0 and
// break camera continuity. We normalise fps, force scale=1280:720 (collapses
// any DPR-inflated capture buffer to the target), set yuv420p, and trim to
// exactly LOOP_DURATION_S.
function buildLoopFilter() {
  return (
    `fps=${FPS},scale=1280:720:flags=lanczos,format=yuv420p,` +
    `trim=0:${LOOP_DURATION_S},setpts=PTS-STARTPTS`
  );
}

function encodeWebm(rawInput, outPath) {
  const vf = buildLoopFilter();
  runFfmpeg(
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      rawInput,
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
      "30",
      "-row-mt",
      "1",
      "-deadline",
      "good",
      "-cpu-used",
      "2",
      "-r",
      String(FPS),
      outPath,
    ],
    "webm",
  );
}

function encodeMp4(rawInput, outPath) {
  const vf = buildLoopFilter();
  runFfmpeg(
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      rawInput,
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
      "22",
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

// Non-black sanity check: extract one mid-clip frame to PNG and confirm it is
// not trivially tiny (a uniform/black frame compresses to a few hundred bytes;
// a real clay scene is several KB+). Returns { ok, bytes } or { ok:null }.
function checkNonBlack(clipFile, clipName) {
  const probe = path.join(CLIPS_TMP, `__probe-${clipName}.png`);
  const r = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      "2",
      "-i",
      clipFile,
      "-frames:v",
      "1",
      probe,
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 },
  );
  if (r.status !== 0 || !fs.existsSync(probe)) return { ok: null, bytes: 0 };
  const bytes = fs.statSync(probe).size;
  fs.rmSync(probe, { force: true });
  // A non-trivial 1280x720 PNG of a real scene is well over 4 KB.
  return { ok: bytes > 4 * 1024, bytes };
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
  const rawInput = path.join(CLIPS_TMP, `${clip.name}.raw.webm`);
  if (!fs.existsSync(rawInput)) {
    fail(`missing raw webm for ${clip.name}: ${rawInput}`);
  }

  const webmOut = path.join(OUT_DIR, `${clip.name}.webm`);
  const mp4Out = path.join(OUT_DIR, `${clip.name}.mp4`);

  encodeWebm(rawInput, webmOut);
  const webm = validate(webmOut, WEBM_MAX, `${clip.name}.webm`);

  encodeMp4(rawInput, mp4Out);
  const mp4 = validate(mp4Out, MP4_MAX, `${clip.name}.mp4`);

  // Non-black sanity check on the mp4 (cheap, deterministic decode).
  const nb = checkNonBlack(mp4Out, clip.name);
  if (nb.ok === false) {
    fail(
      `${clip.name}: mid-frame is ${nb.bytes} B — likely BLACK/uniform. ` +
        `Verify the RAF ambient loop runs under ?capture=video.`,
    );
  }
  const nbLabel =
    nb.ok === null
      ? "non-black: (probe skipped)"
      : `non-black: ok (mid-frame ${fmtKB(nb.bytes)})`;

  console.log(
    `  ${clip.name}  webm ${fmtKB(webm.bytes)} (${webm.dur.toFixed(2)}s)` +
      `  mp4 ${fmtKB(mp4.bytes)} (${mp4.dur.toFixed(2)}s)  ${nbLabel}`,
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

  const captureStart = Date.now();
  console.log(
    `[render-habitat-clips] capturing (MediaRecorder) for ${clips.length} clip(s)` +
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
  const captureS = (Date.now() - captureStart) / 1000;
  console.log(
    `[render-habitat-clips] capture done in ${captureS.toFixed(1)}s ` +
      `(${(captureS / clips.length).toFixed(1)}s/clip avg incl. nav)`,
  );

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

  // Clean .tmp/clips only on a FULL successful batch (keep raws around when
  // running --only so a follow-up encode tweak doesn't require a recapture).
  if (!onlyClip) {
    fs.rmSync(CLIPS_TMP, { recursive: true, force: true });
  }
}

main();
