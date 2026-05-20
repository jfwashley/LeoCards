// Palette + toonGrad unit tests (Plan 13-01 Task 3).

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CLAY, toonGrad } from "../palette";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("CLAY palette (Plan 13-01)", () => {
  it("exports the colors the designer uses (smoke check)", () => {
    expect(CLAY.ground).toMatch(HEX);
    expect(CLAY.sky).toMatch(HEX);
    expect(CLAY.flowerA).toMatch(HEX);
    expect(CLAY.water).toMatch(HEX);
    expect(CLAY.toy).toMatch(HEX);
  });

  it("preserves designer-locked values from habitat-clay-styles.jsx:19-30", () => {
    // Spot-check three values exactly. If these drift, the recolor has
    // happened outside the locked palette gate.
    expect(CLAY.ground).toBe("#a8d77c");
    expect(CLAY.sky).toBe("#cfe6f0");
    expect(CLAY.flowerA).toBe("#f8c8d8");
  });
});

describe("toonGrad (Plan 13-01)", () => {
  it("returns a DataTexture with NearestFilter (matches habitat-clay-styles.jsx:35-40)", () => {
    const tex = toonGrad(3);
    expect(tex).toBeInstanceOf(THREE.DataTexture);
    expect(tex.magFilter).toBe(THREE.NearestFilter);
    expect(tex.minFilter).toBe(THREE.NearestFilter);
  });

  it("is deterministic — identical pixel data for identical step count", () => {
    const a = toonGrad(3);
    const b = toonGrad(3);
    const aData = a.image.data;
    const bData = b.image.data;
    expect(aData.length).toBe(bData.length);
    for (let i = 0; i < aData.length; i++) {
      expect(aData[i]).toBe(bData[i]);
    }
  });

  it("scales the step count (4 → 4 bytes)", () => {
    const tex = toonGrad(4);
    const data = tex.image.data;
    expect(data.length).toBe(4);
    // Band values are ceil((i+1)/n * 255). For n=4 → 64, 128, 191, 255.
    expect(data[0]).toBe(64);
    expect(data[3]).toBe(255);
  });
});
