// clay-ambient.ts — ambient effects: pollen, petals, birds, perched
// songbirds + spawnable notes, dust puff pool, sleep bubbles, drinking FX.
//
// Ported from `.planning/design/animations/habitat-clay-styles.jsx`:
//   - buildSleepBubbles   (:720-775)
//   - buildElephantDrinkingFX (:1038-1074)
//   - buildStorybookAmbient   (:1079-1367)
//
// DOM-free port. The designer's `buildSleepBubbles` uses
// `document.createElement('canvas')` to bake a "Z" glyph into a
// CanvasTexture. Plan 02's contract forbids `document.*` inside
// `src/lib/habitat-3d/clay-*.ts`, so we substitute a small procedurally
// generated DataTexture (a soft white blob). Plan 03's React wrapper may
// inject a richer texture via the `bubbleTexture` option once a DOM is
// available, preserving the storybook "Z" look without coupling this
// module to the DOM.

import * as THREE from "three";
import type { ClayMatFactory } from "./clay-world";

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

// ---------------- Sleep bubbles ----------------

export interface SleepBubblesHandle {
  spawn: (x: number, y: number, z: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

/**
 * Build a small procedural soft-blob texture as a stand-in for the
 * designer's canvas-baked "Z" glyph. Plan 03 may swap this for a real
 * canvas texture via the `bubbleTexture` option.
 */
function buildBlobTexture(): THREE.DataTexture {
  const N = 32;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - N / 2;
      const dy = y - N / 2;
      const d = Math.sqrt(dx * dx + dy * dy) / (N / 2);
      const a = Math.max(0, 1 - d) * 255;
      const i = (y * N + x) * 4;
      data[i] = 251;
      data[i + 1] = 250;
      data[i + 2] = 246;
      data[i + 3] = Math.floor(a);
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function buildSleepBubbles(
  scene: THREE.Scene,
  opts: { bubbleTexture?: THREE.Texture } = {},
): SleepBubblesHandle {
  const tex = opts.bubbleTexture ?? buildBlobTexture();
  const POOL = 6;
  const bubbles: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    life: number;
    basePos: THREE.Vector3;
  }> = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const s = new THREE.Sprite(m);
    s.scale.set(0.35, 0.35, 1);
    s.visible = false;
    scene.add(s);
    bubbles.push({ sprite: s, mat: m, life: 0, basePos: new THREE.Vector3() });
  }
  function spawn(x: number, y: number, z: number): void {
    const free = bubbles.find((b) => b.life <= 0);
    if (!free) return;
    free.basePos.set(x, y, z);
    free.sprite.position.copy(free.basePos);
    free.sprite.visible = true;
    free.mat.opacity = 0;
    free.life = 3.2;
  }
  function update(dt: number): void {
    for (const b of bubbles) {
      if (b.life > 0) {
        b.life -= dt;
        const elapsed = 3.2 - b.life;
        b.sprite.position.y = b.basePos.y + elapsed * 0.55;
        b.sprite.position.x = b.basePos.x + Math.sin(elapsed * 2.5) * 0.18;
        const fadeIn = Math.min(1, elapsed / 0.3);
        const fadeOut = Math.min(1, b.life / 1.5);
        b.mat.opacity = 0.9 * fadeIn * fadeOut;
        if (b.life <= 0) {
          b.sprite.visible = false;
          b.mat.opacity = 0;
        }
      }
    }
  }
  function dispose(): void {
    for (const b of bubbles) {
      b.mat.dispose();
      scene.remove(b.sprite);
    }
    tex.dispose();
  }
  return { spawn, update, dispose };
}

// ---------------- Elephant drinking FX (ripples) ----------------

export interface DrinkingFXHandle {
  spawn: (x: number, y: number, z: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function buildElephantDrinkingFX(
  scene: THREE.Scene,
  mat: ClayMatFactory,
): DrinkingFXHandle {
  const POOL = 5;
  const ripples: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshToonMaterial;
    life: number;
  }> = [];
  for (let i = 0; i < POOL; i++) {
    const rmat = mat("#fbfaf6");
    rmat.transparent = true;
    rmat.opacity = 0;
    rmat.side = THREE.DoubleSide;
    const m = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.08, 30), rmat);
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    scene.add(m);
    ripples.push({ mesh: m, mat: rmat, life: 0 });
  }
  function spawn(x: number, y: number, z: number): void {
    const free = ripples.find((r) => r.life <= 0);
    if (!free) return;
    free.mesh.position.set(x, y, z);
    free.mesh.scale.setScalar(1);
    free.mesh.visible = true;
    free.life = 1.6;
  }
  function update(dt: number): void {
    for (const r of ripples) {
      if (r.life > 0) {
        r.life -= dt;
        const u = 1 - r.life / 1.6;
        r.mesh.scale.setScalar(1 + u * 14);
        r.mat.opacity = (1 - u) * 0.7;
        if (r.life <= 0) {
          r.mesh.visible = false;
          r.mat.opacity = 0;
        }
      }
    }
  }
  function dispose(): void {
    for (const r of ripples) {
      r.mesh.geometry.dispose();
      r.mat.dispose();
      scene.remove(r.mesh);
    }
  }
  return { spawn, update, dispose };
}

// ---------------- Storybook ambient (pollen + petals + birds + dust) ----

export interface DustPool {
  spawn: (pos: THREE.Vector3) => void;
}

export interface StorybookAmbientHandle {
  update: (dt: number, t: number, opts?: { reducedMotion?: boolean }) => void;
  dustPool: DustPool;
  dispose: () => void;
}

export interface StorybookAmbientOpts {
  pollen?: boolean;
  petals?: boolean;
  birds?: boolean;
  birdCols?: string[];
  perchedBirdCols?: string[];
}

/** Ground-surface helper duplicated from clay-world (kept local so this
 * module has no cross-import cycles). Same formula. */
function groundY(x: number, z: number): number {
  const r2 = (x * x + z * z) / 4;
  return -3.2 + 0.42 * Math.sqrt(Math.max(0.01, 84.64 - r2));
}

export function buildStorybookAmbient(
  scene: THREE.Scene,
  mat: ClayMatFactory,
  opts: StorybookAmbientOpts = {},
): StorybookAmbientHandle {
  const rng = mulberry32(0xbada55);
  const enable = {
    pollen: opts.pollen !== false,
    petals: opts.petals !== false,
    birds: opts.birds !== false,
  };
  const ownedMaterials: THREE.Material[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];

  // pollen
  const pollenG = new THREE.Group();
  scene.add(pollenG);
  const pollen: Array<{
    mesh: THREE.Mesh;
    cx: number;
    cz: number;
    baseY: number;
    radius: number;
    speed: number;
    phase: number;
  }> = [];
  if (enable.pollen) {
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 6, 6),
        mat("#fbfaf6"),
      );
      pollenG.add(m);
      pollen.push({
        mesh: m,
        cx: (rng() - 0.5) * 14,
        cz: (rng() - 0.5) * 14,
        baseY: 1.6 + rng() * 2.6,
        radius: 0.6 + rng() * 1.4,
        speed: 0.16 + rng() * 0.2,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  // flying birds
  function makeBird(color: string): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 8),
      mat(color),
    );
    body.scale.set(1, 0.8, 1.7);
    body.castShadow = true;
    g.add(body);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.14, 4),
      mat(color),
    );
    tail.position.set(0, 0, 0.18);
    tail.rotation.x = Math.PI / 2;
    g.add(tail);
    const wL = new THREE.Group();
    g.add(wL);
    const wingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.015, 0.2),
      mat(color),
    );
    wingL.geometry.translate(0.18, 0, 0);
    wL.add(wingL);
    const wR = new THREE.Group();
    g.add(wR);
    const wingR = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.015, 0.2),
      mat(color),
    );
    wingR.geometry.translate(-0.18, 0, 0);
    wR.add(wingR);
    g.userData = { wL, wR };
    return g;
  }
  const birdCols = opts.birdCols ?? ["#3a2818", "#5a3a28", "#2a1f14"];
  const perchedBirdCols = opts.perchedBirdCols ?? birdCols;
  const birds: Array<{
    obj: THREE.Group;
    cx: number;
    cz: number;
    r: number;
    speed: number;
    y: number;
    phase: number;
    flapRate: number;
  }> = [];
  if (enable.birds) {
    for (let i = 0; i < 3; i++) {
      const col = birdCols[i % birdCols.length] ?? "#3a2818";
      const b = makeBird(col);
      scene.add(b);
      birds.push({
        obj: b,
        cx: (rng() - 0.5) * 5,
        cz: (rng() - 0.5) * 5,
        r: 4 + rng() * 2,
        speed: 0.22 + rng() * 0.18,
        y: 3.2 + rng() * 1.2,
        phase: rng() * Math.PI * 2,
        flapRate: 9 + rng() * 4,
      });
    }
  }

  // perched songbirds + notes
  const PERCH_TREES: Array<[number, number, number]> = [
    [4.5, -3.2, 1.3],
    [-5.8, -1.6, 1.1],
    [5.6, 2.8, 0.85],
  ];
  function makePerchedBird(col: string): {
    group: THREE.Group;
    head: THREE.Mesh;
  } {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      mat(col),
    );
    body.scale.set(1, 0.85, 1.55);
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 10),
      mat(col),
    );
    head.position.set(0, 0.18, -0.3);
    head.castShadow = true;
    g.add(head);
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.18, 5),
      mat("#c8a050"),
    );
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.16, -0.54);
    g.add(beak);
    const breast = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      mat("#fbfaf6"),
    );
    breast.position.set(0, 0.0, -0.22);
    breast.scale.set(0.7, 0.8, 0.45);
    g.add(breast);
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 6),
      mat("#1a0e08"),
    );
    eye.position.set(0.085, 0.22, -0.44);
    g.add(eye);
    for (let s = -1; s <= 1; s += 2) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5),
        mat("#c8a050"),
      );
      foot.position.set(s * 0.1, -0.22, 0.05);
      foot.rotation.z = s * 0.3;
      g.add(foot);
    }
    return { group: g, head };
  }
  const NOTE_COL = "#4a4070";
  function makeNoteMesh(): THREE.Group {
    const g = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 8),
      mat(NOTE_COL),
    );
    head.scale.set(1.1, 0.82, 0.6);
    g.add(head);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6),
      mat(NOTE_COL),
    );
    stem.position.set(0.07, 0.13, 0);
    g.add(stem);
    const flag = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 6),
      mat(NOTE_COL),
    );
    flag.position.set(0.1, 0.21, 0);
    flag.scale.set(0.7, 0.55, 0.4);
    g.add(flag);
    g.visible = false;
    return g;
  }
  const perchedBirds: Array<{
    obj: THREE.Group;
    head: THREE.Mesh;
    phase: number;
    noteTimer: number;
    perchX: number;
    perchY: number;
    perchZ: number;
  }> = [];
  const notePool: Array<{
    mesh: THREE.Group;
    life: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    drift: number;
  }> = [];
  const NOTE_POOL = 18;
  for (let i = 0; i < NOTE_POOL; i++) {
    const m = makeNoteMesh();
    scene.add(m);
    notePool.push({ mesh: m, life: 0, baseX: 0, baseY: 0, baseZ: 0, drift: 0 });
  }
  function spawnNote(x: number, y: number, z: number): void {
    const free = notePool.find((n) => n.life <= 0);
    if (!free) return;
    free.baseX = x;
    free.baseY = y;
    free.baseZ = z;
    free.drift = (Math.random() - 0.5) * 0.8;
    free.mesh.position.set(x, y, z);
    free.mesh.rotation.y = Math.random() * Math.PI * 2;
    free.mesh.visible = true;
    free.mesh.scale.setScalar(0.01);
    free.life = 2.8;
  }
  if (enable.birds) {
    PERCH_TREES.forEach(([tx, tz, ts], idx) => {
      const perchY = groundY(tx, tz) + 2.65 * ts;
      const col = perchedBirdCols[idx % perchedBirdCols.length] ?? "#3a2818";
      const { group: perchG, head } = makePerchedBird(col);
      perchG.position.set(tx, perchY, tz);
      perchG.rotation.y = Math.PI * 0.3 * idx;
      scene.add(perchG);
      perchedBirds.push({
        obj: perchG,
        head,
        phase: rng() * Math.PI * 2,
        noteTimer: 0.5 + rng() * 1.5,
        perchX: tx,
        perchY,
        perchZ: tz,
      });
    });
  }

  // petals
  const petalG = new THREE.Group();
  scene.add(petalG);
  const petalCols = ["#fae0a8", "#f0a8a0", "#fffbe8", "#f8c8d8"];
  const petals: Array<{
    mesh: THREE.Mesh;
    x: number;
    y: number;
    z: number;
    vy: number;
    spin: number;
    driftX: number;
    driftZ: number;
    phase: number;
  }> = [];
  if (enable.petals) {
    for (let i = 0; i < 14; i++) {
      const col = petalCols[i % petalCols.length] ?? "#fffbe8";
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(col));
      m.scale.set(1, 0.25, 1);
      petalG.add(m);
      petals.push({
        mesh: m,
        x: (rng() - 0.5) * 14,
        y: 0.5 + rng() * 4,
        z: (rng() - 0.5) * 14,
        vy: 0.18 + rng() * 0.14,
        spin: (rng() - 0.5) * 1.8,
        driftX: (rng() - 0.5) * 0.35,
        driftZ: (rng() - 0.5) * 0.25,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  // dust puff pool
  const POOL = 10;
  const puffs: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshToonMaterial;
    life: number;
  }> = [];
  for (let i = 0; i < POOL; i++) {
    const pmat = mat("#e8d4b0");
    pmat.transparent = true;
    pmat.opacity = 0;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), pmat);
    m.visible = false;
    scene.add(m);
    puffs.push({ mesh: m, mat: pmat, life: 0 });
  }
  const dustPool: DustPool = {
    spawn(pos: THREE.Vector3): void {
      const p = puffs.find((p) => p.life <= 0);
      if (!p) return;
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(0.4);
      p.mesh.visible = true;
      p.life = 0.55;
    },
  };

  function update(
    dt: number,
    t: number,
    updOpts?: { reducedMotion?: boolean },
  ): void {
    const reduced = updOpts?.reducedMotion === true;
    // R6 (Plan 13-04): gate pollen + petals on reducedMotion.
    if (!reduced) {
      for (const p of pollen) {
        const a = t * p.speed + p.phase;
        p.mesh.position.set(
          p.cx + Math.cos(a) * p.radius,
          p.baseY + Math.sin(a * 1.3) * 0.5,
          p.cz + Math.sin(a) * p.radius,
        );
      }
    }
    if (!reduced) {
      for (const b of birds) {
        const a = t * b.speed + b.phase;
        b.obj.position.set(
          b.cx + Math.cos(a) * b.r,
          b.y + Math.sin(a * 1.5) * 0.45,
          b.cz + Math.sin(a) * b.r,
        );
        b.obj.rotation.y = -a;
        b.obj.rotation.z = Math.sin(a) * 0.18;
        const flap = Math.sin(t * b.flapRate + b.phase) * 0.85;
        const ud = b.obj.userData as { wL: THREE.Group; wR: THREE.Group };
        ud.wL.rotation.z = flap;
        ud.wR.rotation.z = -flap;
      }
    }
    if (!reduced) {
      for (const p of petals) {
        p.y -= p.vy * dt;
        p.x += p.driftX * dt;
        p.z += p.driftZ * dt;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.y += p.spin * dt;
        p.mesh.rotation.z = Math.sin(t * 1.5 + p.phase) * 0.7;
        if (p.y < 0.15) {
          p.y = 4 + rng() * 2.2;
          p.x = (rng() - 0.5) * 14;
          p.z = (rng() - 0.5) * 14;
        }
      }
    }
    for (const n of notePool) {
      if (n.life > 0) {
        n.life -= dt;
        const elapsed = 2.8 - n.life;
        n.mesh.position.y = n.baseY + elapsed * 0.55;
        n.mesh.position.x = n.baseX + Math.sin(elapsed * 2.4 + n.drift) * 0.18;
        n.mesh.rotation.y += dt * 1.2;
        const fadeIn = Math.min(1, elapsed / 0.18);
        const fadeOut = Math.min(1, n.life / 0.8);
        const s = 0.85 * fadeIn * fadeOut;
        n.mesh.scale.setScalar(Math.max(0.01, s));
        if (n.life <= 0) {
          n.mesh.visible = false;
          n.mesh.scale.setScalar(0.01);
        }
      }
    }
    for (const b of perchedBirds) {
      b.head.rotation.x = Math.sin(t * 4.5 + b.phase) * 0.18;
      b.noteTimer -= dt;
      if (b.noteTimer <= 0) {
        b.noteTimer = 0.6 + Math.random() * 1.0;
        spawnNote(
          b.perchX + (Math.random() - 0.5) * 0.25,
          b.perchY + 0.22,
          b.perchZ + (Math.random() - 0.5) * 0.25,
        );
        spawnNote(
          b.perchX + (Math.random() - 0.5) * 0.25,
          b.perchY + 0.34,
          b.perchZ + (Math.random() - 0.5) * 0.25,
        );
      }
    }
    for (const p of puffs) {
      if (p.life > 0) {
        p.life -= dt;
        const u = Math.max(0, p.life / 0.55);
        const grow = 1 - u;
        p.mesh.scale.setScalar(0.4 + grow * 1.0);
        p.mat.opacity = u * 0.5;
        p.mesh.position.y += dt * 0.22;
        if (p.life <= 0) {
          p.mesh.visible = false;
          p.mat.opacity = 0;
        }
      }
    }
  }

  function dispose(): void {
    scene.remove(pollenG);
    scene.remove(petalG);
    for (const b of birds) scene.remove(b.obj);
    for (const b of perchedBirds) scene.remove(b.obj);
    for (const n of notePool) scene.remove(n.mesh);
    for (const p of puffs) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mat.dispose();
    }
    for (const g of ownedGeometries) g.dispose();
    for (const m of ownedMaterials) m.dispose();
  }

  return { update, dustPool, dispose };
}
