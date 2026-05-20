// clay-world.test.ts — feature-group composition + reducedMotion + sky.
//
// Vitest is configured for `environment: "node"` (no jsdom, no GL). We
// construct a stub SceneContext directly — `buildClayWorld` only needs
// `renderer.toneMappingExposure` (a settable number) and `scene` (a
// THREE.Scene). It never touches the canvas or the GL context.

import * as fs from "node:fs";
import * as path from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { featuresForLevel } from "../clay-level";
import { buildClayWorld } from "../clay-world";
import type { SceneContext } from "../types";

function stubContext(): SceneContext {
  // Bare-minimum stub. `renderer.toneMappingExposure` is the only renderer
  // field buildClayWorld writes; everything else is on `scene`.
  const renderer = {
    toneMappingExposure: 1.0,
  } as unknown as THREE.WebGLRenderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const canvas = {} as HTMLCanvasElement;
  return {
    renderer,
    scene,
    camera,
    canvas,
    width: 800,
    height: 600,
    isMobile: false,
    Q: 1,
  };
}

describe("buildClayWorld feature composition", () => {
  it("L1 features: no level-gated groups present", () => {
    const ctx = stubContext();
    const world = buildClayWorld(ctx, featuresForLevel(1));
    expect(world.featureGroups.lake).toBeUndefined();
    expect(world.featureGroups.trees).toBeUndefined();
    expect(world.featureGroups.flowers).toBeUndefined();
    expect(world.featureGroups.butterflies).toBeUndefined();
    expect(world.featureGroups.mushrooms).toBeUndefined();
    expect(world.featureGroups.cave).toBeUndefined();
    expect(world.featureGroups.toys).toBeUndefined();
    // clouds is always-on structural scenery
    expect(world.featureGroups.clouds).toBeDefined();
    world.dispose();
  });

  it("L4 features: flowers, butterflies, trees groups present (Plan 04 decay handles)", () => {
    const ctx = stubContext();
    const world = buildClayWorld(ctx, featuresForLevel(4));
    expect(world.featureGroups.trees).toBeDefined();
    expect(world.featureGroups.flowers).toBeDefined();
    expect(world.featureGroups.butterflies).toBeDefined();
    expect(world.featureGroups.lake).toBeDefined();
    expect(world.featureGroups.lilies).toBeDefined();
    expect(world.featureGroups.path).toBeDefined();
    // L4 has no mushrooms/cave/toy yet
    expect(world.featureGroups.mushrooms).toBeUndefined();
    expect(world.featureGroups.cave).toBeUndefined();
    expect(world.featureGroups.toys).toBeUndefined();
    world.dispose();
  });

  it("L9 features: cave + toys + all earlier groups present", () => {
    const ctx = stubContext();
    const world = buildClayWorld(ctx, featuresForLevel(9), {
      sky: "golden-hour",
    });
    expect(world.featureGroups.cave).toBeDefined();
    expect(world.featureGroups.toys).toBeDefined();
    expect(world.featureGroups.mushrooms).toBeDefined();
    expect(world.featureGroups.trees).toBeDefined();
    world.dispose();
  });
});

describe("buildClayWorld sky variant", () => {
  it("golden-hour produces a different sky shader uniform than default", () => {
    const ctxA = stubContext();
    const def = buildClayWorld(ctxA, featuresForLevel(1));
    const ctxB = stubContext();
    const golden = buildClayWorld(ctxB, featuresForLevel(9), {
      sky: "golden-hour",
    });
    const colorA = def.skyMat.uniforms.color1?.value as THREE.Color;
    const colorB = golden.skyMat.uniforms.color1?.value as THREE.Color;
    expect(colorA.getHexString()).not.toBe(colorB.getHexString());
    def.dispose();
    golden.dispose();
  });
});

describe("updateWorld reducedMotion gate", () => {
  it("with reducedMotion: butterflies + clouds do not mutate; without: they do", () => {
    const ctx = stubContext();
    const world = buildClayWorld(ctx, featuresForLevel(4));
    const cloudsG = world.featureGroups.clouds;
    const butterfliesG = world.featureGroups.butterflies;
    if (!cloudsG || !butterfliesG)
      throw new Error("expected clouds + butterflies groups");
    const firstCloud = cloudsG.children[0];
    const firstButterfly = butterfliesG.children[0];
    if (!firstCloud || !firstButterfly) throw new Error("expected child[0]");

    // Snapshot pre-tick state
    const cloudX0 = firstCloud.position.x;
    const butterflyY0 = firstButterfly.rotation.y;

    // Reduced motion: should NOT mutate
    world.updateWorld(0.016, 1.0, { reducedMotion: true });
    expect(firstCloud.position.x).toBe(cloudX0);
    expect(firstButterfly.rotation.y).toBe(butterflyY0);

    // Normal motion: SHOULD mutate
    world.updateWorld(0.016, 1.0);
    expect(firstCloud.position.x).not.toBe(cloudX0);
    expect(firstButterfly.rotation.y).not.toBe(butterflyY0);

    world.dispose();
  });
});

describe("clay-* modules: pure scene-graph (no React, no DOM)", () => {
  const claysDir = path.resolve(__dirname, "..");
  const files = fs
    .readdirSync(claysDir)
    .filter((f) => f.startsWith("clay-") && f.endsWith(".ts"))
    .filter((f) => !f.endsWith(".test.ts"));

  it.each(files)("%s has no React import", (file) => {
    const src = fs.readFileSync(path.join(claysDir, file), "utf-8");
    expect(/from\s+["']react["']/.test(src)).toBe(false);
  });

  it.each(files)("%s has no window.* or document.* references", (file) => {
    const src = fs.readFileSync(path.join(claysDir, file), "utf-8");
    // Allow comments to mention them; strip line comments + block comments before scan.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/[^\n]*/g, "");
    expect(/\bwindow\./.test(code)).toBe(false);
    expect(/\bdocument\./.test(code)).toBe(false);
  });
});
