// scripts/diff-habitat-screenshots.mjs — Plan 13-04 Task 3.
//
// Standalone node script that reads the 28 reference PNGs under
// e2e/__screenshots__/habitat-states/ and asserts the mandated pairs
// (mood A vs B at same q; q A vs B at same mood) are visibly distinct
// per the orchestrator's automated pixel-mean-square-difference protocol.
//
// Pass threshold: MSE ≥ 1.0 (per-channel, averaged over RGB and pixels).
//
// Writes the diff table to e2e/__screenshots__/habitat-states/diff-table.json
// and exits with status 1 on failure.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const DIR = path.join(REPO_ROOT, "e2e", "__screenshots__", "habitat-states");

const MOODS = ["excited", "happy", "neutral", "sad"];
const QUALITIES = [1.0, 0.7, 0.5, 0.4, 0.3, 0.2, 0.1];
const THRESHOLD = 1.0;

function filename(m, q) {
  return `L5-mood-${m}-q${q.toFixed(2)}.png`;
}

async function decodeToRaw(filepath) {
  // Decode PNG -> raw RGB buffer + dimensions.
  const img = sharp(filepath).removeAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

function meanSquareDiff(a, b) {
  if (a.data.length !== b.data.length) {
    return { mse: 1_000_000, sizeMismatch: true };
  }
  let sum = 0;
  const len = a.data.length;
  for (let i = 0; i < len; i++) {
    const d = a.data[i] - b.data[i];
    sum += d * d;
  }
  return { mse: sum / len, sizeMismatch: false };
}

async function main() {
  // Decode all 28.
  const decoded = {};
  let missing = 0;
  for (const m of MOODS) {
    for (const q of QUALITIES) {
      const name = filename(m, q);
      const fp = path.join(DIR, name);
      if (!fs.existsSync(fp)) {
        console.error(`MISSING: ${name}`);
        missing++;
        continue;
      }
      decoded[name] = await decodeToRaw(fp);
    }
  }
  if (missing > 0) {
    console.error(`${missing} screenshots missing — aborting.`);
    process.exit(1);
  }

  const rows = [];

  // Mood pairs at same quality.
  for (const q of QUALITIES) {
    for (let i = 0; i < MOODS.length; i++) {
      for (let j = i + 1; j < MOODS.length; j++) {
        const a = filename(MOODS[i], q);
        const b = filename(MOODS[j], q);
        const { mse, sizeMismatch } = meanSquareDiff(decoded[a], decoded[b]);
        rows.push({
          kind: "mood-pair",
          label: `${MOODS[i]}↔${MOODS[j]} @ q=${q.toFixed(2)}`,
          a,
          b,
          mse: Number(mse.toFixed(4)),
          sizeMismatch,
          pass: mse >= THRESHOLD,
        });
      }
    }
  }
  // Quality pairs at same mood.
  for (const m of MOODS) {
    for (let i = 0; i < QUALITIES.length; i++) {
      for (let j = i + 1; j < QUALITIES.length; j++) {
        const a = filename(m, QUALITIES[i]);
        const b = filename(m, QUALITIES[j]);
        const { mse, sizeMismatch } = meanSquareDiff(decoded[a], decoded[b]);
        rows.push({
          kind: "quality-pair",
          label: `${m} q=${QUALITIES[i].toFixed(2)}↔q=${QUALITIES[j].toFixed(2)}`,
          a,
          b,
          mse: Number(mse.toFixed(4)),
          sizeMismatch,
          pass: mse >= THRESHOLD,
        });
      }
    }
  }

  const failures = rows.filter((r) => !r.pass);
  const summary = {
    threshold: THRESHOLD,
    generatedAt: new Date().toISOString(),
    captureCount: Object.keys(decoded).length,
    totalPairs: rows.length,
    failureCount: failures.length,
    rows,
  };
  fs.writeFileSync(
    path.join(DIR, "diff-table.json"),
    JSON.stringify(summary, null, 2),
  );

  console.log(
    `Decoded ${summary.captureCount} PNGs; checked ${summary.totalPairs} pairs; threshold=${THRESHOLD}; failures=${summary.failureCount}.`,
  );
  if (failures.length) {
    console.error("Failing pairs:");
    for (const f of failures) {
      console.error(`  ${f.label}: MSE=${f.mse}`);
    }
    process.exit(1);
  }
  console.log("All pairs visibly distinct.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
