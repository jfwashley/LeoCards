// clay-characters.ts — Storybook lion + Elephant character rigs.
//
// Ported from `.planning/design/animations/habitat-clay-styles.jsx`:
//   - buildLionStorybook  (:1832-2025)
//   - buildElephant       (:2027-2113)
//
// RESEARCH section A.5: ONLY these two rigs are ported. The dropped
// builders (`buildLionChibi`, `buildBunny`, `buildLionMascot`,
// `buildGiraffe`) belonged to alt-style demo wrappers (`ClayChibi`,
// `ClayStorybookV2`, `ClayMascot`) that Phase 13 does not ship — porting
// them would only produce dead code under Phase 13's scope.
//
// No React. No DOM. Pure THREE scene-graph builders.

import * as THREE from "three";

/**
 * Material factory injected by `buildClayWorld`. Each call returns a
 * fresh `MeshToonMaterial` sharing the world's toon gradient.
 */
export type MatFactory = (color: string) => THREE.MeshToonMaterial;

/** Per-eye refs needed by the Storybook animation extras (pupil tracking). */
export interface LionEyeRef {
  white: THREE.Mesh;
  pupil: THREE.Mesh;
  pupilG: THREE.Group;
  basePos: THREE.Vector3;
}

/**
 * Storybook lion rig. Each field corresponds to a channel the animation
 * driver mutates (`applyLionWalk`, `applyLionSleep`,
 * `applyStorybookLionExtras`).
 */
export interface LionStorybookRig {
  root: THREE.Group;
  torso: THREE.Group;
  headG: THREE.Group;
  legs: { FL: THREE.Group; FR: THREE.Group; BL: THREE.Group; BR: THREE.Group };
  tailRoot: THREE.Group;
  tailTuft: THREE.Group;
  eyes: LionEyeRef[];
  ears: { L: THREE.Group; R: THREE.Group };
  brows: { L: THREE.Group; R: THREE.Group };
  smile: THREE.Mesh;
  legBaseY: number;
  /** materials[] for Plan 04 decay-opacity binding. */
  materials: THREE.Material[];
}

/**
 * Elephant rig. `userData` mirrors the designer's shape so
 * `animateElephant` from `clay-animation.ts` can mutate it directly.
 */
export interface ElephantRig extends THREE.Group {
  userData: {
    bodyG: THREE.Group;
    headG: THREE.Group;
    trunkRoot: THREE.Group;
    trunkSegs: THREE.Group[];
    earL: THREE.Group;
    earR: THREE.Group;
    eyes: Array<{ white: THREE.Mesh; pupil: THREE.Mesh }>;
    blinkT: number;
    /** Set by Plan 03 when companionMode === 'lakeside' (deferred). */
    drinking?: boolean;
    /** Base Y captured by Plan 03 before mounting on the mound. */
    baseY?: number;
    lastDipEase?: number;
  };
  // intersection so the runtime type stays a THREE.Group
}

const LION_PAL = {
  lion: "#f0b558",
  light: "#fae0a8",
  shadow: "#d49340",
  mane: "#c97a3a",
  maneMid: "#b06628",
  maneDark: "#8a4a18",
  maneTip: "#fae0a8",
  eye: "#1f140c",
  nose: "#3a2218",
  pink: "#f0a8a0",
  blush: "#f4a3ad",
  white: "#fbfaf6",
} as const;

const ELEPHANT_PAL = {
  skin: "#c0b6cc",
  dark: "#857a98",
  pink: "#e8c0c8",
  eye: "#1f140c",
  white: "#fbfaf6",
} as const;

/**
 * Deterministic mulberry32 — used for the lion's geometry seeding so
 * two rebuilds with the same seed produce identical vertex counts and
 * positions (geometry randomness is seeded; behavioural randomness like
 * blink interval still uses Math.random in the animation driver).
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the Storybook lion rig. Ported verbatim (with TS types added)
 * from `habitat-clay-styles.jsx:1832-2025`.
 *
 * @param mat Material factory from `buildClayWorld`.
 * @param seed Deterministic RNG seed. Default `0xC0FFEE` (designer value).
 */
export function buildLionStorybook(
  mat: MatFactory,
  seed: number = 0xc0ffee,
): LionStorybookRig {
  const rng = mulberry32(seed);
  const materials: THREE.Material[] = [];
  const trackMat = (m: THREE.MeshToonMaterial): THREE.MeshToonMaterial => {
    materials.push(m);
    return m;
  };
  const make = (c: string) => trackMat(mat(c));

  const PAL = LION_PAL;
  const g = new THREE.Group();
  const torso = new THREE.Group();
  g.add(torso);

  // ---- body ----
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 28, 20), make(PAL.lion));
  body.scale.set(1, 0.88, 1.5);
  body.position.y = 1.0;
  body.castShadow = true;
  torso.add(body);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), make(PAL.shadow));
  back.scale.set(0.55, 0.5, 1.3);
  back.position.set(0, 1.35, 0.05);
  torso.add(back);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), make(PAL.light));
  belly.scale.set(0.85, 0.55, 1.18);
  belly.position.set(0, 0.7, 0.1);
  torso.add(belly);

  // ---- mane ----
  const maneAnchor = new THREE.Group();
  maneAnchor.position.set(0, 1.22, -1.05);
  torso.add(maneAnchor);
  const mane = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), make(PAL.mane));
  mane.scale.set(1.05, 1.05, 0.9);
  mane.castShadow = true;
  maneAnchor.add(mane);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const tuft = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 10),
      make(i % 2 === 0 ? PAL.maneMid : PAL.maneDark),
    );
    tuft.position.set(Math.cos(a) * 1.02, Math.sin(a) * 0.78, -0.1);
    tuft.scale.set(1, 1, 0.7);
    tuft.castShadow = true;
    maneAnchor.add(tuft);
  }
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 6 + (i / 4) * (Math.PI * 1.3);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), make(PAL.maneTip));
    tip.position.set(Math.cos(a) * 1.04, Math.sin(a) * 0.82 + 0.04, 0.02);
    tip.scale.set(0.85, 0.85, 0.55);
    maneAnchor.add(tip);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI - Math.PI / 2;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), make(PAL.maneMid));
    tuft.position.set(Math.cos(a) * 0.7, 0.05 + Math.sin(a) * 0.5, 0.25);
    maneAnchor.add(tuft);
  }

  // ---- head ----
  const headG = new THREE.Group();
  headG.position.set(0, 1.22, -1.5);
  torso.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 18), make(PAL.lion));
  head.scale.set(1.05, 0.95, 1);
  head.castShadow = true;
  headG.add(head);
  for (const x of [-0.36, 0.36]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), make(PAL.light));
    cheek.position.set(x, -0.1, -0.35);
    headG.add(cheek);
  }
  for (const x of [-0.34, 0.34]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), make(PAL.blush));
    blush.position.set(x, -0.12, -0.52);
    blush.scale.set(1, 0.55, 0.25);
    headG.add(blush);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), make(PAL.light));
  muzzle.position.set(0, -0.18, -0.5);
  muzzle.scale.set(1, 0.75, 0.9);
  headG.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), make(PAL.nose));
  nose.position.set(0, -0.08, -0.78);
  nose.scale.set(1.2, 0.85, 0.8);
  headG.add(nose);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.022, 8, 18, Math.PI),
    make(PAL.nose),
  );
  smile.position.set(0, -0.27, -0.82);
  smile.rotation.z = Math.PI;
  headG.add(smile);

  // ---- ears ----
  const earL = new THREE.Group();
  const earR = new THREE.Group();
  for (const { x, group: ear } of [
    { x: -0.3, group: earL },
    { x: 0.3, group: earR },
  ]) {
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), make(PAL.lion));
    outer.scale.set(0.85, 1.1, 0.5);
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), make(PAL.pink));
    inner.position.set(0, -0.02, -0.05);
    inner.scale.set(0.7, 0.9, 0.4);
    ear.add(inner);
    ear.position.set(x, 0.42, 0.05);
    ear.userData.baseRotZ = x > 0 ? -0.15 : 0.15;
    ear.rotation.z = ear.userData.baseRotZ;
    headG.add(ear);
  }

  // ---- brows ----
  const browL = new THREE.Group();
  const browR = new THREE.Group();
  for (const { x, group: brow } of [
    { x: -0.22, group: browL },
    { x: 0.22, group: browR },
  ]) {
    const browMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), make(PAL.shadow));
    browMesh.position.set(x, 0.18, -0.52);
    browMesh.scale.set(1.2, 0.4, 0.4);
    browMesh.rotation.z = x > 0 ? -0.4 : 0.4;
    brow.add(browMesh);
    headG.add(brow);
  }

  // ---- eyes ----
  const eyes: LionEyeRef[] = [];
  for (const x of [-0.22, 0.22]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), make(PAL.white));
    eyeWhite.position.set(x, 0.06, -0.52);
    eyeWhite.scale.set(0.85, 1, 0.3);
    headG.add(eyeWhite);

    const pupilG = new THREE.Group();
    pupilG.position.set(x, 0.06, -0.58);
    headG.add(pupilG);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), make(PAL.eye));
    pupil.scale.set(0.85, 1, 0.6);
    pupilG.add(pupil);
    const shine1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), make(PAL.white));
    shine1.position.set(x > 0 ? 0.022 : -0.022, 0.028, -0.045);
    shine1.scale.set(1, 1, 0.4);
    pupilG.add(shine1);
    const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), make(PAL.white));
    shine2.position.set(x > 0 ? -0.018 : 0.018, -0.022, -0.045);
    pupilG.add(shine2);

    eyes.push({ white: eyeWhite, pupil, pupilG, basePos: pupilG.position.clone() });
  }

  // ---- legs ----
  function leg(x: number, z: number): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, z);
    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.3, 6, 10),
      make(PAL.lion),
    );
    upper.position.y = -0.2;
    upper.castShadow = true;
    pivot.add(upper);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), make(PAL.lion));
    paw.position.y = -0.45;
    paw.scale.set(1.05, 0.6, 1.15);
    paw.castShadow = true;
    pivot.add(paw);
    torso.add(pivot);
    return pivot;
  }
  const legs = {
    FL: leg(-0.45, -0.85),
    FR: leg(0.45, -0.85),
    BL: leg(-0.45, 0.85),
    BR: leg(0.45, 0.85),
  };

  // ---- tail ----
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 1.15, 1.3);
  torso.add(tailRoot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.1, 10), make(PAL.lion));
  tail.geometry.translate(0, 0.55, 0);
  tail.rotation.x = -Math.PI / 3;
  tailRoot.add(tail);
  const tailTuft = new THREE.Group();
  tailTuft.position.set(0, 0.6, 0);
  tail.add(tailTuft);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), make(PAL.mane));
  tailTuft.add(tuft);
  const tuftTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), make(PAL.maneTip));
  tuftTip.position.set(0, 0.14, 0);
  tailTuft.add(tuftTip);

  // Consume rng so callers that pass distinct seeds get distinct objects
  // even though current geometry is deterministic by position. Keeps the
  // signature future-proof for designer parity (the designer used rng for
  // additional cosmetic jitter in alt-style builders).
  void rng();

  return {
    root: g,
    torso,
    headG,
    legs,
    tailRoot,
    tailTuft,
    eyes,
    ears: { L: earL, R: earR },
    brows: { L: browL, R: browR },
    smile,
    legBaseY: 0.78,
    materials,
  };
}

/**
 * Build the elephant rig. Ported verbatim from
 * `habitat-clay-styles.jsx:2027-2113`.
 *
 * Returns a THREE.Group with a fully-typed `userData` payload — the
 * animation driver (`animateElephant`) mutates this shape directly.
 */
export function buildElephant(mat: MatFactory): ElephantRig {
  const materials: THREE.Material[] = [];
  const make = (c: string): THREE.MeshToonMaterial => {
    const m = mat(c);
    materials.push(m);
    return m;
  };

  const PAL = ELEPHANT_PAL;
  const g = new THREE.Group();

  const bodyG = new THREE.Group();
  g.add(bodyG);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), make(PAL.skin));
  body.scale.set(1.15, 1, 1.45);
  body.position.y = 1.0;
  body.castShadow = true;
  bodyG.add(body);

  const headG = new THREE.Group();
  g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), make(PAL.skin));
  head.position.set(0, 1.15, -1.0);
  head.castShadow = true;
  headG.add(head);

  const trunkRoot = new THREE.Group();
  trunkRoot.position.set(0, 1.05, -1.42);
  headG.add(trunkRoot);
  const trunkSegs: THREE.Group[] = [];
  let parent: THREE.Group = trunkRoot;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group();
    if (i > 0) seg.position.set(0, -0.17, -0.15);
    parent.add(seg);
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.2 - i * 0.022, 12, 10),
      make(PAL.skin),
    );
    seg.add(m);
    trunkSegs.push(seg);
    parent = seg;
  }

  const earL = new THREE.Group();
  const earR = new THREE.Group();
  for (const { x, group: ear } of [
    { x: -0.65, group: earL },
    { x: 0.65, group: earR },
  ]) {
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), make(PAL.dark));
    outer.scale.set(0.28, 1.1, 1.1);
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), make(PAL.pink));
    inner.position.set(-0.05 * (x > 0 ? 1 : -1), -0.05, 0.07);
    inner.scale.set(0.2, 0.8, 0.85);
    ear.add(inner);
    ear.position.set(x, 1.25, -0.85);
    ear.userData.baseRotZ = x > 0 ? -0.2 : 0.2;
    ear.rotation.z = ear.userData.baseRotZ;
    headG.add(ear);
  }

  const eyes: Array<{ white: THREE.Mesh; pupil: THREE.Mesh }> = [];
  for (const x of [-0.3, 0.3]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), make(PAL.white));
    white.position.set(x, 1.25, -1.42);
    white.scale.set(0.85, 1, 0.4);
    headG.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), make(PAL.eye));
    pupil.position.set(x, 1.25, -1.47);
    headG.add(pupil);
    eyes.push({ white, pupil });
  }

  // tusks
  for (const x of [-0.18, 0.18]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), make(PAL.white));
    t.position.set(x, 0.85, -1.5);
    t.rotation.x = 0.6;
    headG.add(t);
  }

  // legs — stay on root, so they don't breathe
  const legGeo = new THREE.CapsuleGeometry(0.22, 0.4, 6, 10);
  const legPositions: Array<[number, number]> = [
    [-0.4, -0.55],
    [0.4, -0.55],
    [-0.4, 0.5],
    [0.4, 0.5],
  ];
  for (const [x, z] of legPositions) {
    const l = new THREE.Mesh(legGeo, make(PAL.skin));
    l.position.set(x, 0.4, z);
    l.castShadow = true;
    g.add(l);
  }

  // tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), make(PAL.skin));
  tail.position.set(0, 1.0, 0.95);
  tail.rotation.x = 0.4;
  bodyG.add(tail);

  const rig = g as ElephantRig;
  rig.userData = {
    bodyG,
    headG,
    trunkRoot,
    trunkSegs,
    earL,
    earR,
    eyes,
    blinkT: 0,
  };
  // Materials are attached via the materials array stashed below for the
  // dispose contract. Cast via unknown to extend the userData shape with
  // a non-public field without polluting ElephantRig.userData.
  (rig.userData as unknown as { materials: THREE.Material[] }).materials =
    materials;
  return rig;
}

/**
 * Read the materials array used by a rig (for Plan 04 decay opacity or
 * disposal). Works for both LionStorybookRig.materials and the elephant's
 * userData.materials side-channel.
 */
export function rigMaterials(
  rig: LionStorybookRig | ElephantRig,
): THREE.Material[] {
  if ("materials" in rig && Array.isArray(rig.materials)) {
    return rig.materials;
  }
  const ud = (rig as ElephantRig).userData as unknown as {
    materials?: THREE.Material[];
  };
  return ud.materials ?? [];
}
