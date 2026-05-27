// clay-animation.ts — animation drivers for the lion + elephant rigs and
// a re-exported `updateWorld` proxy so consumers can import the full
// animation surface from one module.
//
// Ported from `.planning/design/animations/habitat-clay-styles.jsx`:
//   - applyLionSleep              (:641-717)
//   - applyLionWalk               (:796-878)
//   - applyStorybookLionExtras    (:885-971)
//   - animateElephant             (:973-1035)
//   - getSleepState / time helpers (:616-637)
//
// Plan 02 contract: this module is pure scene-graph code — no React,
// no `window`/`document`. The London-time sleep cycle uses `Intl`
// (available in node + browser) for `_londonSecondsSinceMidnight`.

import { type CatmullRomCurve3, MathUtils, Vector3 } from "three";
import type {
  DrinkingFXHandle,
  DustPool,
  SleepBubblesHandle,
} from "./clay-ambient";
import type { ElephantRig, LionStorybookRig } from "./clay-characters";
import type { ClayWorld } from "./clay-world";

// ---------------- Ground sampler (mirrors clay-world.gY) ----------------

const _GROUND_BASE_Y = -3.2;
const _GROUND_R2 = 9.2 * 9.2;
const _GROUND_SCALE_Y = 0.42;
const _GROUND_SCALE_XZ_SQ = 4;

function groundAt(x: number, z: number): { y: number; gx: number; gz: number } {
  const r2 = (x * x + z * z) / _GROUND_SCALE_XZ_SQ;
  const denom = Math.sqrt(Math.max(0.01, _GROUND_R2 - r2));
  const y = _GROUND_BASE_Y + _GROUND_SCALE_Y * denom;
  const gx = (-_GROUND_SCALE_Y * x) / (_GROUND_SCALE_XZ_SQ * denom);
  const gz = (-_GROUND_SCALE_Y * z) / (_GROUND_SCALE_XZ_SQ * denom);
  return { y, gx, gz };
}

// ---------------- Sleep cycle ----------------

export interface CaveAnchor {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface LionState {
  u?: number;
  lastPos?: Vector3;
  smoothSpeed?: number;
  blinkT?: number;
  speedMul?: number;
  sleeping?: boolean;
  wasSleeping?: boolean;
  caveAnchor?: CaveAnchor;
  sleepBubbles?: SleepBubblesHandle;
  bubbleT?: number;
  dustPool?: DustPool;
  earT?: number;
  earThreshold?: number;
  earTwitch?: number;
  dustT?: number;
  demoT?: number;
}

function londonSecondsSinceMidnight(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const p: Record<string, string> = {};
  for (const x of parts) p[x.type] = x.value;
  const h = parseInt(p.hour ?? "0", 10) % 24;
  return (
    h * 3600 +
    parseInt(p.minute ?? "0", 10) * 60 +
    parseInt(p.second ?? "0", 10)
  );
}

export interface SleepStateInfo {
  sleeping: boolean;
  cycleSec: number;
  cyclePeriod: number;
  sleepHalf: number;
}

export function getSleepState(
  demoMode: boolean,
  demoSeconds: number,
): SleepStateInfo {
  if (demoMode) {
    const cycleSec = demoSeconds % 60;
    return {
      sleeping: cycleSec < 30,
      cycleSec,
      cyclePeriod: 60,
      sleepHalf: 30,
    };
  }
  const sec = londonSecondsSinceMidnight();
  const cycleSec = sec % 7200;
  return {
    sleeping: cycleSec < 3600,
    cycleSec,
    cyclePeriod: 7200,
    sleepHalf: 3600,
  };
}

// ---------------- applyLionSleep ----------------

export function applyLionSleep(
  leo: LionStorybookRig,
  dt: number,
  t: number,
  state: LionState,
): void {
  const a = state.caveAnchor;
  if (!a) return;
  const k = Math.min(1, dt * 0.7);
  leo.root.position.x += (a.x - leo.root.position.x) * k;
  leo.root.position.y += (a.y - leo.root.position.y) * k;
  leo.root.position.z += (a.z - leo.root.position.z) * k;
  let diff = a.yaw - leo.root.rotation.y;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  leo.root.rotation.y += diff * k;
  leo.root.rotation.x = 0;
  leo.root.rotation.z = 0;

  if (leo.torso) {
    leo.torso.position.y = -0.42;
    leo.torso.rotation.x = 0;
    leo.torso.rotation.z = 0;
    const breath = 1 + Math.sin(t * 0.9) * 0.025;
    leo.torso.scale.set(breath, breath, breath);
  }

  if (leo.legs) {
    const baseY = leo.legBaseY ?? 0.78;
    leo.legs.FL.rotation.x = -0.55;
    leo.legs.FR.rotation.x = -0.55;
    leo.legs.BL.rotation.x = 0.45;
    leo.legs.BR.rotation.x = 0.45;
    leo.legs.FL.position.y = baseY - 0.22;
    leo.legs.FR.position.y = baseY - 0.22;
    leo.legs.BL.position.y = baseY - 0.22;
    leo.legs.BR.position.y = baseY - 0.22;
  }

  if (leo.headG) {
    leo.headG.rotation.x += (0.32 - leo.headG.rotation.x) * k * 2;
    leo.headG.rotation.y *= 0.9;
  }

  for (const e of leo.eyes) {
    e.pupil.scale.y = 0.05;
    if (e.white) e.white.scale.y = 0.05;
  }

  if (leo.ears) {
    leo.ears.L.rotation.x = 0;
    leo.ears.R.rotation.x = 0;
    leo.ears.L.rotation.z = (leo.ears.L.userData.baseRotZ as number) ?? 0.15;
    leo.ears.R.rotation.z = (leo.ears.R.userData.baseRotZ as number) ?? -0.15;
  }
  if (leo.brows) {
    leo.brows.L.position.y = -0.02;
    leo.brows.R.position.y = -0.02;
  }
  if (leo.tailRoot) {
    leo.tailRoot.rotation.y *= 0.85;
    leo.tailRoot.rotation.z *= 0.85;
  }
  if (leo.tailTuft) {
    leo.tailTuft.rotation.x *= 0.85;
    leo.tailTuft.rotation.z *= 0.85;
  }

  if (state.sleepBubbles) {
    state.bubbleT = (state.bubbleT ?? 0) + dt;
    if (state.bubbleT > 1.6) {
      state.bubbleT = 0;
      state.sleepBubbles.spawn(
        leo.root.position.x + Math.cos(t) * 0.15,
        leo.root.position.y + 1.55,
        leo.root.position.z + Math.sin(t * 0.7) * 0.15,
      );
    }
  }
}

// ---------------- applyLionWalk ----------------

export function applyLionWalk(
  leo: LionStorybookRig,
  lionCurve: CatmullRomCurve3,
  dt: number,
  t: number,
  state: LionState,
): void {
  if (state.sleeping && state.caveAnchor) {
    applyLionSleep(leo, dt, t, state);
    return;
  }
  if (state.wasSleeping) {
    state.wasSleeping = false;
    const baseY = leo.legBaseY ?? 0.78;
    for (const l of Object.values(leo.legs)) {
      l.position.y = baseY;
      l.rotation.x = 0;
    }
    leo.torso.position.y = 0;
    leo.torso.scale.set(1, 1, 1);
    leo.headG.rotation.x = 0;
  }
  const speedMul = state.speedMul ?? 1;
  const baseSpeed = 0.045;
  state.u = (state.u ?? 0) + dt * baseSpeed * speedMul;
  const u = state.u % 1;
  const p = lionCurve.getPoint(u);
  const tan = lionCurve.getTangent(u).normalize();
  state.lastPos = state.lastPos ?? new Vector3();
  state.smoothSpeed = state.smoothSpeed ?? 0;
  state.blinkT = (state.blinkT ?? 0) + dt;

  const moved = p.distanceTo(state.lastPos) / Math.max(dt, 0.0001);
  state.smoothSpeed = state.smoothSpeed * 0.85 + moved * 0.15;
  state.lastPos.copy(p);

  const ground = groundAt(p.x, p.z);
  const pawOffset = 0.198;
  leo.root.position.set(p.x, ground.y - pawOffset, p.z);
  leo.root.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI;

  const slopeForward = ground.gx * tan.x + ground.gz * tan.z;
  const pitch = Math.atan(slopeForward);

  const trotPhase = (state.u ?? 0) * 133.33;
  leo.torso.position.y = Math.abs(Math.sin(trotPhase)) * 0.05;
  leo.torso.rotation.z = Math.sin(trotPhase * 0.5) * 0.02;
  leo.torso.rotation.x = pitch;
  const swing = Math.min(state.smoothSpeed * 0.6, 0.7);
  const lift = Math.min(state.smoothSpeed * 0.4, 0.45);
  const pA = Math.sin(trotPhase);
  const pB = Math.sin(trotPhase + Math.PI);
  leo.legs.FL.rotation.x = pA * swing;
  leo.legs.BR.rotation.x = pA * swing;
  leo.legs.FR.rotation.x = pB * swing;
  leo.legs.BL.rotation.x = pB * swing;
  const baseY = leo.legBaseY ?? 0.78;
  leo.legs.FL.position.y = baseY + Math.max(0, pA) * lift * 0.4;
  leo.legs.BR.position.y = baseY + Math.max(0, pA) * lift * 0.4;
  leo.legs.FR.position.y = baseY + Math.max(0, pB) * lift * 0.4;
  leo.legs.BL.position.y = baseY + Math.max(0, pB) * lift * 0.4;

  leo.tailRoot.rotation.y = Math.sin(t * 3) * 0.4;
  leo.tailRoot.rotation.z = Math.sin(t * 2) * 0.1;
  leo.headG.rotation.y = Math.sin(t * 0.8) * 0.12;
  leo.headG.rotation.x = Math.sin(t * 0.5) * 0.05;

  if (state.blinkT > 2.5 + Math.random() * 1.5) state.blinkT = -0.18;
  const blink = state.blinkT < 0 ? 0.05 : 1.0;
  for (const e of leo.eyes) {
    e.pupil.scale.y = blink;
    if (e.white) e.white.scale.y = 0.95 * blink + 0.05;
  }
}

// ---------------- applyStorybookLionExtras ----------------

export function applyLionExtras(
  leo: LionStorybookRig,
  elephant: ElephantRig | null,
  dt: number,
  t: number,
  state: LionState,
): void {
  if (state.sleeping) return;
  let lookStrength = 0;
  let lx = 0;
  let lz = 0;
  if (elephant) {
    const dx = elephant.position.x - leo.root.position.x;
    const dz = elephant.position.z - leo.root.position.z;
    const dist = Math.hypot(dx, dz);
    const yaw = leo.root.rotation.y;
    lx = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
    lz = Math.sin(yaw) * dx + Math.cos(yaw) * dz;
    const inFront = lz < -0.3 ? 1 : 0;
    lookStrength = MathUtils.clamp(1 - dist / 6.5, 0, 1) * inFront;
  }

  // pupil tracking
  const targetTX = MathUtils.clamp(lx * 0.005, -0.028, 0.028);
  const targetTY = 0.006;
  const idleX = Math.sin(t * 0.6) * 0.012;
  const idleY = Math.cos(t * 0.5) * 0.006;
  const tx = lookStrength * targetTX + (1 - lookStrength) * idleX;
  const ty = lookStrength * targetTY + (1 - lookStrength) * idleY;
  const kEye = Math.min(1, dt * 6);
  for (const e of leo.eyes) {
    const wantX = e.basePos.x + tx;
    const wantY = e.basePos.y + ty;
    e.pupilG.position.x += (wantX - e.pupilG.position.x) * kEye;
    e.pupilG.position.y += (wantY - e.pupilG.position.y) * kEye;
  }

  const targetYaw =
    lookStrength * MathUtils.clamp(Math.atan2(lx, -lz) * 0.45, -0.35, 0.35) +
    (1 - lookStrength) * Math.sin(t * 0.8) * 0.12;
  const targetPitch =
    lookStrength * 0.06 + (1 - lookStrength) * Math.sin(t * 0.5) * 0.05;
  const kHead = Math.min(1, dt * 3);
  leo.headG.rotation.y += (targetYaw - leo.headG.rotation.y) * kHead;
  leo.headG.rotation.x += (targetPitch - leo.headG.rotation.x) * kHead;

  leo.tailTuft.rotation.x = Math.sin(t * 5 + 0.4) * 0.45;
  leo.tailTuft.rotation.z = Math.sin(t * 4 + 1.0) * 0.22;

  // ear twitches
  state.earT = (state.earT ?? 0) + dt;
  state.earThreshold = state.earThreshold ?? 3 + Math.random() * 3;
  state.earTwitch = state.earTwitch ?? 0;
  if (state.earT > state.earThreshold) {
    state.earT = 0;
    state.earThreshold = 3 + Math.random() * 3;
    state.earTwitch = 0.45;
  }
  state.earTwitch = Math.max(0, state.earTwitch - dt);
  const t1 = state.earTwitch > 0 ? Math.sin(state.earTwitch * 28) * 0.22 : 0;
  leo.ears.L.rotation.x = t1 * 0.7;
  leo.ears.R.rotation.x = t1 * 0.5;
  leo.ears.L.rotation.z =
    ((leo.ears.L.userData.baseRotZ as number) ?? 0.15) + t1 * 0.15;
  leo.ears.R.rotation.z =
    ((leo.ears.R.userData.baseRotZ as number) ?? -0.15) - t1 * 0.15;

  const raise = 0.005 + Math.sin(t * 0.7) * 0.012 * lookStrength;
  leo.brows.L.position.y = raise;
  leo.brows.R.position.y = raise;

  // dust puffs when trotting briskly
  state.dustT = (state.dustT ?? 0) + dt;
  if (state.dustPool && state.dustT > 0.24 && (state.smoothSpeed ?? 0) > 0.4) {
    state.dustT = 0;
    const keys: Array<"FL" | "FR" | "BL" | "BR"> = ["FL", "FR", "BL", "BR"];
    const k = keys[Math.floor(Math.random() * 4)] as "FL" | "FR" | "BL" | "BR";
    const wp = new Vector3();
    leo.legs[k].getWorldPosition(wp);
    wp.y = leo.root.position.y + 0.198 + 0.02;
    state.dustPool.spawn(wp);
  }
}

// ---------------- animateElephant ----------------

export interface ElephantAnimOpts {
  drinkingFX?: DrinkingFXHandle;
}

export function animateElephant(
  elephant: ElephantRig,
  dt: number,
  t: number,
  opts: ElephantAnimOpts = {},
): void {
  const ud = elephant.userData;
  if (!ud) return;
  const breath = 1 + Math.sin(t * 1.3) * 0.018;
  ud.bodyG.scale.setScalar(breath);
  ud.headG.position.y = Math.sin(t * 1.3 + 0.4) * 0.022;

  let dipEase = 0;
  if (ud.drinking) {
    const period = 4.5;
    const phase = (t / period) % 1;
    const norm = Math.sin(phase * Math.PI);
    dipEase = norm * norm * (3 - 2 * norm);
  }

  const segBend = dipEase * 0.24;
  const waveAttn = 1 - dipEase * 0.6;
  for (let i = 1; i < ud.trunkSegs.length; i++) {
    const seg = ud.trunkSegs[i];
    if (!seg) continue;
    const phase = t * 1.7 - i * 0.55;
    seg.rotation.x = Math.sin(phase) * 0.16 * waveAttn + segBend;
    seg.rotation.y = Math.sin(phase * 0.7) * 0.06 * waveAttn;
  }
  if (ud.trunkRoot) ud.trunkRoot.rotation.x = dipEase * 0.95;
  if (ud.drinking) ud.headG.rotation.x = dipEase * 0.38;

  const flapRate = ud.drinking ? 0.85 : 1.15;
  const flap = Math.sin(t * flapRate) * 0.09;
  ud.earL.rotation.z = ((ud.earL.userData.baseRotZ as number) ?? 0.2) + flap;
  ud.earR.rotation.z = ((ud.earR.userData.baseRotZ as number) ?? -0.2) - flap;

  ud.blinkT += dt;
  if (ud.blinkT > 3.0 + Math.random() * 2.0) ud.blinkT = -0.16;
  const blink = ud.blinkT < 0 ? 0.08 : 1.0;
  for (const e of ud.eyes) {
    e.white.scale.y = 1.0 * blink + (1 - blink) * 0.05;
    e.pupil.scale.y = blink;
  }

  if (ud.drinking && opts.drinkingFX) {
    ud.lastDipEase = ud.lastDipEase ?? 0;
    if (dipEase > 0.78 && ud.lastDipEase <= 0.78) {
      const tip = new Vector3();
      const lastSeg = ud.trunkSegs[ud.trunkSegs.length - 1];
      if (lastSeg) {
        lastSeg.getWorldPosition(tip);
        const waterY = groundAt(tip.x, tip.z).y + 0.045;
        opts.drinkingFX.spawn(tip.x, waterY, tip.z);
      }
    }
    ud.lastDipEase = dipEase;
  }
}

// ---------------- Re-export proxy for callers wanting a single import ----

/**
 * Convenience wrapper around `world.updateWorld` so callers can import
 * the entire animation surface (lion + elephant + world) from
 * `clay-animation.ts` if they prefer a single import site.
 */
export function updateWorld(
  world: ClayWorld,
  dt: number,
  t: number,
  opts?: { reducedMotion?: boolean },
): void {
  world.updateWorld(dt, t, opts);
}
