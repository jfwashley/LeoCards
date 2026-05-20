// clay-characters.test.ts — Storybook lion + Elephant rig shape pins.
// Runs in Vitest's node environment — no jsdom, no GL. We only build
// scene-graph objects; no renderer touches GPU.

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { MatFactory } from "../clay-characters";
import {
  buildElephant,
  buildLionStorybook,
  rigMaterials,
} from "../clay-characters";
import { toonGrad } from "../palette";

function makeMatFactory(): MatFactory {
  const grad = toonGrad(4);
  return (color: string) =>
    new THREE.MeshToonMaterial({ color, gradientMap: grad });
}

function countVerts(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry) {
      const pos = m.geometry.getAttribute("position");
      if (pos) n += pos.count;
    }
  });
  return n;
}

describe("buildLionStorybook", () => {
  it("returns a rig with the channels Plan 04 binds mood to", () => {
    const mat = makeMatFactory();
    const leo = buildLionStorybook(mat);
    expect(leo.root).toBeInstanceOf(THREE.Group);
    expect(leo.headG).toBeInstanceOf(THREE.Group);
    expect(leo.tailRoot).toBeInstanceOf(THREE.Group);
    expect(leo.tailTuft).toBeInstanceOf(THREE.Group);
    expect(leo.legs.FL).toBeInstanceOf(THREE.Group);
    expect(leo.legs.FR).toBeInstanceOf(THREE.Group);
    expect(leo.legs.BL).toBeInstanceOf(THREE.Group);
    expect(leo.legs.BR).toBeInstanceOf(THREE.Group);
    expect(leo.eyes).toHaveLength(2);
    expect(leo.eyes[0]?.pupil).toBeDefined();
    expect(leo.eyes[0]?.pupilG).toBeDefined();
    expect(leo.eyes[0]?.basePos).toBeInstanceOf(THREE.Vector3);
    expect(leo.ears.L).toBeInstanceOf(THREE.Group);
    expect(leo.ears.R).toBeInstanceOf(THREE.Group);
    expect(leo.brows.L).toBeInstanceOf(THREE.Group);
    expect(leo.brows.R).toBeInstanceOf(THREE.Group);
    expect(Array.isArray(leo.materials)).toBe(true);
    expect(leo.materials.length).toBeGreaterThan(10);
    expect(leo.legBaseY).toBe(0.78);
  });
});

describe("buildElephant", () => {
  it("returns a rig with trunk segments + materials", () => {
    const mat = makeMatFactory();
    const ele = buildElephant(mat);
    expect(ele).toBeInstanceOf(THREE.Group);
    expect(ele.userData.bodyG).toBeInstanceOf(THREE.Group);
    expect(ele.userData.headG).toBeInstanceOf(THREE.Group);
    expect(ele.userData.trunkRoot).toBeInstanceOf(THREE.Group);
    expect(Array.isArray(ele.userData.trunkSegs)).toBe(true);
    expect(ele.userData.trunkSegs).toHaveLength(6);
    expect(ele.userData.earL).toBeInstanceOf(THREE.Group);
    expect(ele.userData.earR).toBeInstanceOf(THREE.Group);
    expect(ele.userData.eyes).toHaveLength(2);
    expect(ele.userData.blinkT).toBe(0);
    expect(rigMaterials(ele).length).toBeGreaterThan(5);
  });
});

describe("deterministic geometry", () => {
  it("two calls with the same seed produce identical root.position and vertex counts", () => {
    const mat = makeMatFactory();
    const a = buildLionStorybook(mat, 0xc0ffee);
    const b = buildLionStorybook(mat, 0xc0ffee);
    expect(a.root.position.toArray()).toEqual(b.root.position.toArray());
    expect(countVerts(a.root)).toBe(countVerts(b.root));
  });
});

describe("no excluded builders exported", () => {
  it("clay-characters module exports ONLY buildLionStorybook + buildElephant (+ helper)", async () => {
    // Dynamic import so the test reads the actual module namespace.
    const mod = await import("../clay-characters");
    expect(typeof mod.buildLionStorybook).toBe("function");
    expect(typeof mod.buildElephant).toBe("function");
    // Dropped per RESEARCH A.5
    expect("buildLionChibi" in mod).toBe(false);
    expect("buildBunny" in mod).toBe(false);
    expect("buildLionMascot" in mod).toBe(false);
    expect("buildGiraffe" in mod).toBe(false);
  });
});
