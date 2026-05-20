// Verifies three.js 0.160.x is installed, resolvable via ESM, and exposes
// the constructors the Phase 13 plans depend on. Locks Plan 13-01 / SPEC R2.

import * as THREE from "three";
import { describe, expect, it } from "vitest";

describe("three.js install (Plan 13-01, SPEC R2)", () => {
  it("imports as an ESM namespace at runtime", () => {
    expect(THREE).toBeTypeOf("object");
  });

  it("reports revision 160 (matches SPEC R2 pin)", () => {
    expect(typeof THREE.REVISION).toBe("string");
    expect(String(THREE.REVISION).startsWith("160")).toBe(true);
  });

  it("exposes the constructors Plans 02-05 need", () => {
    expect(typeof THREE.WebGLRenderer).toBe("function");
    expect(typeof THREE.PerspectiveCamera).toBe("function");
    expect(typeof THREE.MeshToonMaterial).toBe("function");
    expect(typeof THREE.CatmullRomCurve3).toBe("function");
    expect(typeof THREE.DataTexture).toBe("function");
    expect(typeof THREE.Scene).toBe("function");
  });
});
