// mood-decay.test.ts — Plan 13-04 Task 1 (12 tests).
//
// Vitest is configured for `environment: "node"` (matches the project's
// prevailing pattern — clay-world.test.ts / clay-characters.test.ts).
// We construct a minimal stub world (a THREE.Group as the lion root + a
// few feature groups + a THREE.Fog + a THREE.ShaderMaterial sky) so the
// pure mood/decay binding logic can be exercised without a renderer.

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { ClayWorld } from "../clay-world";
import { applyDecay, applyMood, type MoodAnimState } from "../mood-decay";

// ---------- stub world ----------

interface StubLion {
  root: THREE.Group;
  headG: THREE.Group;
}

interface StubWorld {
  featureGroups: {
    flowers: THREE.Group;
    butterflies: THREE.Group;
    grass: THREE.Group;
  } & Record<string, THREE.Group>;
  fog: THREE.Fog;
  skyMat: THREE.ShaderMaterial;
  lionRig: StubLion;
}

function makeMat(hex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hex });
}

function makeFlowerGroup(): THREE.Group {
  const g = new THREE.Group();
  g.name = "flowers";
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1), makeMat("#ff6699"));
    g.add(m);
  }
  return g;
}

function makeStubWorld(): StubWorld {
  const root = new THREE.Group();
  const headG = new THREE.Group();
  root.add(headG);

  const flowers = makeFlowerGroup();
  const butterflies = new THREE.Group();
  butterflies.name = "butterflies";
  const grass = new THREE.Group();
  grass.name = "grass";
  const g1 = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.4),
    makeMat("#7aa64e"),
  );
  grass.add(g1);

  const fog = new THREE.Fog("#dfe9ec", 20, 60);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color("#8db4cc") },
      bot: { value: new THREE.Color("#dfe9ec") },
      color1: { value: new THREE.Color("#8db4cc") },
    },
    vertexShader: "void main(){gl_Position=vec4(position,1.);}",
    fragmentShader: "void main(){gl_FragColor=vec4(1.);}",
  });

  return {
    featureGroups: { flowers, butterflies, grass },
    fog,
    skyMat,
    lionRig: { root, headG },
  };
}

function freshState(): MoodAnimState {
  return {
    speedMul: 1.5,
    headDroop: 0,
    sparkleOn: false,
    bounceUntil: 0,
    prevMood: null,
  };
}

// ---------- applyMood tests ----------

describe("applyMood — mood target channels (Tests 1-4)", () => {
  it("Test 1: excited → speedMul=2.2, sparkleOn=true, headDroop=0", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "excited", s, 0);
    expect(s.speedMul).toBe(2.2);
    expect(s.sparkleOn).toBe(true);
    expect(s.headDroop).toBe(0);
  });

  it("Test 2: happy → speedMul=1.5, sparkleOn=false, headDroop=0", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "happy", s, 0);
    expect(s.speedMul).toBe(1.5);
    expect(s.sparkleOn).toBe(false);
    expect(s.headDroop).toBe(0);
  });

  it("Test 3: neutral → speedMul=0.9, headDroop=0.05", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "neutral", s, 0);
    expect(s.speedMul).toBe(0.9);
    expect(s.headDroop).toBe(0.05);
    expect(s.sparkleOn).toBe(false);
  });

  it("Test 4: sad → speedMul=0.5, headDroop=0.15", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "sad", s, 0);
    expect(s.speedMul).toBe(0.5);
    expect(s.headDroop).toBe(0.15);
    expect(s.sparkleOn).toBe(false);
  });
});

describe("applyMood — D-06 transitions (Tests 5-6)", () => {
  it("Test 5: happier shift (neutral → happy) snaps + sets bounceUntil", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "neutral", s, 1000); // prime prevMood
    applyMood(w, "happy", s, 2000); // transition
    expect(s.speedMul).toBe(1.5); // snapped
    expect(s.bounceUntil).toBe(2000 + 300);
  });

  it("Test 6: sadder shift (happy → neutral) crossfades — 3 calls show progressive change", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "happy", s, 0); // prime
    expect(s.speedMul).toBe(1.5);
    applyMood(w, "neutral", s, 16); // transition tick: should NOT snap
    expect(s.bounceUntil).toBe(0); // no bounce
    // After transition tick, no snap — but crossfade target stashed.
    const t1 = s.speedMul;
    expect(t1).toBe(1.5); // unchanged on the transition tick itself
    applyMood(w, "neutral", s, 32); // tick 2 — lerps
    const t2 = s.speedMul;
    expect(t2).toBeLessThan(t1); // progressing toward 0.9
    expect(t2).toBeGreaterThan(0.9); // not snapped
    applyMood(w, "neutral", s, 48); // tick 3 — lerps further
    const t3 = s.speedMul;
    expect(t3).toBeLessThan(t2);
    expect(t3).toBeGreaterThan(0.9);
  });
});

describe("applyMood — head rotation channel (Test 7)", () => {
  it("Test 7: sad mood writes headDroop to leo.headG.userData.moodDroop", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const s = freshState();
    applyMood(w, "sad", s, 0);
    const head = (w as unknown as StubWorld).lionRig.headG;
    expect(head.userData.moodDroop).toBe(0.15);
    applyMood(w, "sad", s, 16);
    expect(head.userData.moodDroop).toBe(0.15);
  });
});

// ---------- applyDecay tests ----------

describe("applyDecay — quality tiers (Tests 8-11)", () => {
  it("Test 8: q=1.0 baseline — fog near=20, far=60 unchanged", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    applyDecay(w, 1.0);
    const sw = w as unknown as StubWorld;
    expect(sw.fog.near).toBeCloseTo(20, 5);
    expect(sw.fog.far).toBeCloseTo(60, 5);
    expect(sw.featureGroups.butterflies.visible).toBe(true);
    expect(sw.featureGroups.flowers.visible).toBe(true);
  });

  it("Test 9: q=0.7 — fog tightens, butterflies still visible (q ≥ 0.4)", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    applyDecay(w, 0.7);
    const sw = w as unknown as StubWorld;
    expect(sw.fog.near).toBeLessThan(20);
    expect(sw.fog.near).toBeGreaterThan(15);
    expect(sw.featureGroups.butterflies.visible).toBe(true);
    expect(sw.featureGroups.flowers.visible).toBe(true);
    // Flower color shifted toward decayed olive.
    const mesh = sw.featureGroups.flowers.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const base = mat.userData.baseColor as THREE.Color;
    expect(mat.color.r).not.toBeCloseTo(base.r, 5);
  });

  it("Test 10: q=0.3 — butterflies + flowers hidden (tier-2)", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    applyDecay(w, 0.3);
    const sw = w as unknown as StubWorld;
    expect(sw.featureGroups.butterflies.visible).toBe(false);
    expect(sw.featureGroups.flowers.visible).toBe(false);
    expect(sw.fog.near).toBeLessThan(16);
  });

  it("Test 11: q=0.1 floor — tier-2 effects active, no crash", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    expect(() => applyDecay(w, 0.1)).not.toThrow();
    const sw = w as unknown as StubWorld;
    expect(sw.featureGroups.butterflies.visible).toBe(false);
    expect(sw.featureGroups.flowers.visible).toBe(false);
  });
});

describe("applyDecay — idempotency (Test 12)", () => {
  it("Test 12: applyDecay(world, 1.0) after applyDecay(world, 0.3) restores baseline", () => {
    const w = makeStubWorld() as unknown as ClayWorld;
    const sw = w as unknown as StubWorld;
    const mesh = sw.featureGroups.flowers.children[0] as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const originalR = mat.color.r;
    const originalG = mat.color.g;
    const originalB = mat.color.b;

    applyDecay(w, 0.3);
    expect(mat.color.r).not.toBeCloseTo(originalR, 4);
    expect(sw.featureGroups.flowers.visible).toBe(false);

    applyDecay(w, 1.0);
    expect(sw.featureGroups.flowers.visible).toBe(true);
    expect(sw.featureGroups.butterflies.visible).toBe(true);
    expect(mat.color.r).toBeCloseTo(originalR, 5);
    expect(mat.color.g).toBeCloseTo(originalG, 5);
    expect(mat.color.b).toBeCloseTo(originalB, 5);
    expect(sw.fog.near).toBeCloseTo(20, 5);
    expect(sw.fog.far).toBeCloseTo(60, 5);
  });
});
