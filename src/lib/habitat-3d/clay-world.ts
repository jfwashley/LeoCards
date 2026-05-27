// clay-world.ts — world builder (island + lake + path + trees + rocks +
// flowers + grass + butterflies + mushrooms + cave + clouds + toys + lion
// curve + updateWorld).
//
// Ported from `.planning/design/animations/habitat-clay-styles.jsx:50-606`
// with the following well-known TypeScript adaptations documented up-front
// (RESEARCH Open Q 3/4 + 13-02 plan <action>):
//
//   • The designer's `buildClayWorld(canvas, w, h, opts)` calls
//     `buildSceneHost` inline. Plan 02 inverts the dependency: callers
//     (Plan 03's React wrapper) build the SceneContext first and pass it
//     in. Sky/lights/island are added directly to `ctx.scene`.
//   • `companionMode = "meadow"` is hard-coded (RESEARCH Open Q 4 +
//     pre-port grep confirmation: lakeside is only used by the alt-style
//     wrappers Phase 13 drops). Future Phase 13.x can re-introduce
//     companionMode if the lakeside variant returns.
//   • `variant` becomes `opts.sky`: `'default'` vs `'golden-hour'`.
//     Plan 03 sets `opts.sky = "golden-hour"` when `level === 9`.
//   • `featuresForLevel` lives in clay-level.ts; this module reads its
//     return value via the `features` argument.
//   • `LEVEL_TITLES` / `HUD_STREAK` deliberately NOT ported (RESEARCH
//     Open Q 3 — let the designer's HUD die with the JSX wrapper).
//   • All `window.*` references removed: `isMobile` is on `ctx`.

import {
  AmbientLight,
  BackSide,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { FeatureFlags } from "./clay-level";
import { CLAY, toonGrad } from "./palette";
import type { SceneContext, WorldOpts } from "./types";

export type ClayMatFactory = (color: string) => MeshToonMaterial;

/**
 * Output of `buildClayWorld`. Plan 04 binds decay opacity to named
 * groups in `featureGroups`; Plan 03 calls `updateWorld(dt, t)` from the
 * RAF loop and `dispose()` on unmount.
 */
export interface ClayWorld {
  /** Container group holding every world prop. Mounted into `ctx.scene`. */
  root: Group;
  /** Named sub-groups per feature (lake, trees, flowers, butterflies, mushrooms, cave, toys). */
  featureGroups: Record<string, Group>;
  /** Material factory shared by characters (so they pick up the same toon gradient). */
  mat: ClayMatFactory;
  /** Lion walk path. */
  lionCurve: CatmullRomCurve3;
  /**
   * RAF update. Respects `opts.reducedMotion`: when true, butterflies and
   * clouds are frozen (per SPEC R6 + Plan 02 Task 3 Test 4).
   */
  updateWorld: (
    dt: number,
    t: number,
    opts?: { reducedMotion?: boolean },
  ) => void;
  /** Recursive geometry+material disposal. Idempotent. */
  dispose: () => void;
  /** Sky shader material — exposed for variant assertions in tests. */
  skyMat: ShaderMaterial;
}

interface SkyOverride {
  top: string;
  bot: string;
  fog: string;
  exposure: number;
}

function resolveSky(variant: WorldOpts["sky"]): SkyOverride {
  if (variant === "golden-hour") {
    return { top: "#e8844a", bot: "#f5c87a", fog: "#f5c87a", exposure: 1.18 };
  }
  return { top: CLAY.skyTop, bot: CLAY.sky, fog: CLAY.sky, exposure: 1.02 };
}

/** Deterministic mulberry32 — designer seed for world geometry. */
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
 * Ground surface helper for snapping decor onto the (2×-wide) mound.
 * Mound: SphereGeometry(R=9.2) scaled (2, 0.42, 2), centered y=-3.2.
 * Designer source: `habitat-clay-styles.jsx:161-164`.
 */
export function gY(x: number, z: number): number {
  const r2 = (x * x + z * z) / 4;
  return -3.2 + 0.42 * Math.sqrt(Math.max(0.01, 84.64 - r2));
}

export function buildClayWorld(
  ctx: SceneContext,
  features: FeatureFlags,
  opts: WorldOpts = {},
): ClayWorld {
  const sky = resolveSky(opts.sky);
  ctx.renderer.toneMappingExposure = sky.exposure;
  ctx.scene.background = new Color(sky.bot);
  if (!ctx.scene.fog) {
    ctx.scene.fog = new Fog(sky.fog, 36, 80);
  } else {
    (ctx.scene.fog as Fog).color.set(sky.fog);
  }

  const rng = mulberry32(0xc0ffee);
  const root = new Group();
  ctx.scene.add(root);

  // shared material factory (toon)
  const grad = toonGrad(4);
  const materials: Material[] = [];
  const mat: ClayMatFactory = (c) => {
    const m = new MeshToonMaterial({ color: c, gradientMap: grad });
    materials.push(m);
    return m;
  };

  // -------- sky gradient --------
  const skyMat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new Color(sky.top) },
      bot: { value: new Color(sky.bot) },
      // Test 3 hook: alias `color1` to `top` for assertions.
      color1: { value: new Color(sky.top) },
    },
    vertexShader:
      "varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec3 vPos; uniform vec3 top; uniform vec3 bot; void main(){float t=clamp(vPos.y/60.0+0.4,0.,1.); gl_FragColor=vec4(mix(bot,top,smoothstep(0.,1.,t)),1.);}",
  });
  const skyDome = new Mesh(new SphereGeometry(80, 32, 16), skyMat);
  root.add(skyDome);
  materials.push(skyMat);

  // -------- lights --------
  const key = new DirectionalLight("#fff5dc", 1.7);
  key.position.set(7, 12, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 4;
  root.add(key);
  const fill = new DirectionalLight("#bcd8ff", 0.35);
  fill.translateOnAxis(new Vector3(-5, 6, -3).normalize(), 8);
  root.add(fill);
  root.add(new HemisphereLight("#cfe6f0", "#88a5b0", 0.65));
  root.add(new AmbientLight("#ffffff", 0.22));

  // -------- island (2× wider) --------
  const R = 9.2;
  const ISLAND_XZ = 2;
  const lakeX = -4.2;
  const lakeZ = 3.4;
  const LAKE_SCALE = 1.5;
  const lakeRX = 2.4 * 1.35 * LAKE_SCALE;
  const lakeRZ = 2.4 * 1.0 * LAKE_SCALE;
  function insideLake(px: number, pz: number, pad = 0.4): boolean {
    const dx = (px - lakeX) / (lakeRX + pad);
    const dz = (pz - lakeZ) / (lakeRZ + pad);
    return dx * dx + dz * dz < 1;
  }
  const island = new Group();
  const mound = new Mesh(new SphereGeometry(R, 64, 40), mat(CLAY.ground));
  mound.scale.set(ISLAND_XZ, 0.42, ISLAND_XZ);
  mound.position.y = -3.2;
  mound.receiveShadow = true;
  mound.castShadow = true;
  island.add(mound);
  {
    let placed = 0;
    let attempts = 0;
    while (placed < 9 && attempts < 60) {
      attempts++;
      const a = rng() * Math.PI * 2;
      const r = 1 + rng() * (R - 2.5);
      const size = 0.9 + rng() * 1.2;
      const px = Math.cos(a) * r;
      const pz = Math.sin(a) * r;
      if (insideLake(px, pz, 0.3)) continue;
      const p = new Mesh(new SphereGeometry(size, 16, 12), mat(CLAY.groundAlt));
      p.scale.set(1, 0.05, 1);
      p.position.set(px, gY(px, pz) + 0.01, pz);
      p.receiveShadow = true;
      island.add(p);
      placed++;
    }
  }
  const ring = new Mesh(
    new TorusGeometry(R * ISLAND_XZ - 0.6, 0.4, 14, 96),
    mat(CLAY.groundDeep),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  island.add(ring);
  const soil = new Mesh(
    new SphereGeometry(
      R - 0.3,
      32,
      20,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    mat(CLAY.soil),
  );
  soil.position.y = -3.2;
  soil.scale.set(ISLAND_XZ, 0.55, ISLAND_XZ);
  island.add(soil);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const chunk = new Mesh(new SphereGeometry(0.6, 14, 10), mat(CLAY.soilDeep));
    const rr = (R - 0.4) * ISLAND_XZ;
    chunk.position.set(Math.cos(a) * rr, -3.4 - rng() * 0.6, Math.sin(a) * rr);
    chunk.scale.set(0.9, 1.2 + rng() * 0.6, 0.9);
    island.add(chunk);
  }
  root.add(island);

  // -------- feature groups --------
  const featureGroups: Record<string, Group> = {};
  function fg(name: string): Group {
    const g = new Group();
    g.name = name;
    featureGroups[name] = g;
    root.add(g);
    return g;
  }

  // -------- path stones --------
  if (features.path) {
    const pathG = fg("path");
    const stoneCurve = new CatmullRomCurve3(
      [
        new Vector3(-3.5, 0, 1.8),
        new Vector3(-1.5, 0, -0.5),
        new Vector3(0.8, 0, -1.6),
        new Vector3(2.8, 0, -1.2),
      ],
      false,
    );
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const p = stoneCurve.getPoint(u);
      if (insideLake(p.x, p.z, 0.1)) continue;
      const stone = new Mesh(new SphereGeometry(0.45, 14, 10), mat(CLAY.path));
      stone.scale.set(1, 0.18, 0.8 + rng() * 0.25);
      stone.position.set(p.x, gY(p.x, p.z) + 0.03, p.z);
      stone.rotation.y = rng() * Math.PI;
      stone.receiveShadow = true;
      pathG.add(stone);
    }
  }

  // -------- lake --------
  let lakeMat: MeshToonMaterial | null = null;
  const lilies: Array<{ obj: Group; phase: number; baseY: number }> = [];
  if (features.lake) {
    const lakeG = fg("lake");
    function curvedDisk(
      rx: number,
      rz: number,
      lift: number,
      rings = 5,
      segs = 40,
    ): BufferGeometry {
      const positions: number[] = [];
      const indices: number[] = [];
      for (let r = 0; r <= rings; r++) {
        const u = r / rings;
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          const wx = lakeX + Math.cos(a) * u * rx;
          const wz = lakeZ + Math.sin(a) * u * rz;
          const wy = gY(wx, wz) + lift;
          positions.push(wx, wy, wz);
        }
      }
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < segs; s++) {
          const a = r * segs + s;
          const b = r * segs + ((s + 1) % segs);
          const c = (r + 1) * segs + s;
          const d = (r + 1) * segs + ((s + 1) % segs);
          indices.push(a, b, c, b, d, c);
        }
      }
      const geo = new BufferGeometry();
      geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }
    lakeMat = mat(CLAY.water);
    const lake = new Mesh(curvedDisk(lakeRX, lakeRZ, 0.04), lakeMat);
    lake.receiveShadow = true;
    lakeG.add(lake);
    const lakeIn = new Mesh(
      curvedDisk(lakeRX * 0.68, lakeRZ * 0.68, 0.06),
      mat(CLAY.waterDeep),
    );
    lakeG.add(lakeIn);

    const rimPts: Vector3[] = [];
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const wx = lakeX + Math.cos(a) * (lakeRX + 0.05);
      const wz = lakeZ + Math.sin(a) * (lakeRZ + 0.05);
      const wy = gY(wx, wz) - 0.02;
      rimPts.push(new Vector3(wx, wy, wz));
    }
    const rimCurve = new CatmullRomCurve3(rimPts, true);
    const rim = new Mesh(
      new TubeGeometry(rimCurve, 64, 0.18, 10, true),
      mat(CLAY.soilDeep),
    );
    rim.castShadow = true;
    lakeG.add(rim);

    if (features.lilies) {
      const liliesG = fg("lilies");
      for (let i = 0; i < 5; i++) {
        const lily = new Group();
        const pad = new Mesh(new SphereGeometry(0.3, 14, 8), mat(CLAY.lily));
        pad.scale.set(1, 0.12, 1);
        lily.add(pad);
        if (rng() > 0.5) {
          const flower = new Mesh(
            new SphereGeometry(0.08, 10, 8),
            mat(CLAY.lilyFlower),
          );
          flower.position.y = 0.08;
          lily.add(flower);
        }
        const ang = (i / 5) * Math.PI * 2;
        const lx = lakeX + Math.cos(ang) * (0.6 + rng() * 0.8) * LAKE_SCALE;
        const lz = lakeZ + Math.sin(ang) * (0.5 + rng() * 0.7) * LAKE_SCALE;
        const ly = gY(lx, lz) + 0.1;
        lily.position.set(lx, ly, lz);
        liliesG.add(lily);
        lilies.push({ obj: lily, phase: rng() * Math.PI * 2, baseY: ly });
      }
    }
  }

  // -------- trees --------
  const trees: Array<{ obj: Group; phase: number; freq: number }> = [];
  if (features.trees) {
    const treesG = fg("trees");
    function tree(x: number, z: number, scale: number): Group {
      const g = new Group();
      const trunk = new Mesh(
        new CylinderGeometry(0.2 * scale, 0.3 * scale, 1.2 * scale, 14),
        mat("#7a4f30"),
      );
      trunk.position.y = 0.6 * scale + 0.2;
      trunk.castShadow = true;
      g.add(trunk);
      const puffs = [
        { r: 0.95, x: 0, y: 1.55, z: 0, c: "#7fb84d" },
        { r: 0.7, x: 0.45, y: 1.85, z: 0.25, c: "#7fb84d" },
        { r: 0.6, x: -0.35, y: 1.7, z: -0.3, c: "#4f8a2e" },
        { r: 0.55, x: 0.15, y: 2.05, z: -0.2, c: "#4f8a2e" },
      ];
      for (const p of puffs) {
        const m = new Mesh(new SphereGeometry(p.r * scale, 18, 14), mat(p.c));
        m.position.set(p.x * scale, p.y * scale + 0.2, p.z * scale);
        m.castShadow = true;
        g.add(m);
      }
      g.position.set(x, gY(x, z) - 0.2, z);
      g.rotation.y = rng() * Math.PI;
      return g;
    }
    const treePos: Array<[number, number, number]> = [
      [4.5, -3.2, 1.3],
      [-2.5, -5.2, 1.0],
      [5.6, 2.8, 0.85],
      [-5.8, -1.6, 1.1],
      [2.0, 5.8, 0.8],
      [-5.5, 7.0, 0.95],
    ];
    for (const [x, z, s] of treePos) {
      if (insideLake(x, z, 0.5)) continue;
      const tr = tree(x, z, s);
      treesG.add(tr);
      trees.push({
        obj: tr,
        phase: rng() * Math.PI * 2,
        freq: 0.5 + rng() * 0.3,
      });
    }
  }

  // -------- flowers --------
  if (features.flowers) {
    const flowersG = fg("flowers");
    const flowerCols = [CLAY.flowerA, CLAY.flowerB, CLAY.flowerC];
    function flower(x: number, z: number, c: string): Group {
      const g = new Group();
      const stem = new Mesh(
        new CylinderGeometry(0.04, 0.04, 0.4, 6),
        mat(CLAY.groundDeep),
      );
      stem.position.y = 0.4;
      g.add(stem);
      const petalMat = mat(c);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const p = new Mesh(new SphereGeometry(0.1, 10, 8), petalMat);
        p.position.set(Math.cos(a) * 0.1, 0.65, Math.sin(a) * 0.1);
        g.add(p);
      }
      const center = new Mesh(new SphereGeometry(0.07, 10, 8), mat("#f0c850"));
      center.position.y = 0.65;
      g.add(center);
      g.position.set(x, gY(x, z) - 0.2, z);
      return g;
    }
    for (let i = 0; i < 42; i++) {
      const a = rng() * Math.PI * 2;
      const r = 1.5 + rng() * (R - 2.4);
      const px = Math.cos(a) * r;
      const pz = Math.sin(a) * r;
      if (insideLake(px, pz, 0.3)) continue;
      const c = flowerCols[Math.floor(rng() * 3)];
      if (c) flowersG.add(flower(px, pz, c));
    }
  }

  // -------- grass --------
  if (features.grass) {
    const grassG = fg("grass");
    for (let i = 0; i < 65; i++) {
      const a = rng() * Math.PI * 2;
      const r = 1 + rng() * (R - 1.8);
      const px = Math.cos(a) * r;
      const pz = Math.sin(a) * r;
      if (insideLake(px, pz, 0.3)) continue;
      const blade = new Mesh(
        new ConeGeometry(0.06, 0.4, 4),
        mat(CLAY.groundDeep),
      );
      blade.position.set(px, gY(px, pz) + 0.2, pz);
      blade.rotation.y = rng() * Math.PI;
      grassG.add(blade);
    }
  }

  // -------- mushrooms --------
  if (features.mushrooms) {
    const mushroomsG = fg("mushrooms");
    function mushroom(x: number, z: number, s: number): Group {
      const g = new Group();
      const stem = new Mesh(
        new CylinderGeometry(0.1 * s, 0.13 * s, 0.35 * s, 10),
        mat(CLAY.mushroomStem),
      );
      stem.position.y = 0.18 * s + 0.25;
      stem.castShadow = true;
      g.add(stem);
      const cap = new Mesh(
        new SphereGeometry(0.25 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(CLAY.mushroomCap),
      );
      cap.position.y = 0.4 * s + 0.25;
      cap.scale.set(1, 0.7, 1);
      cap.castShadow = true;
      g.add(cap);
      for (let i = 0; i < 3; i++) {
        const dot = new Mesh(
          new SphereGeometry(0.04 * s, 8, 8),
          mat(CLAY.mushroomStem),
        );
        const a = rng() * Math.PI * 2;
        dot.position.set(
          Math.cos(a) * 0.12 * s,
          0.5 * s + 0.25,
          Math.sin(a) * 0.12 * s,
        );
        g.add(dot);
      }
      g.position.set(x, gY(x, z) - 0.25, z);
      return g;
    }
    const clusters = [
      { cx: 5.2, cz: -0.5, count: 6 },
      { cx: 1.5, cz: 5.0, count: 5 },
      { cx: -4.0, cz: -1.0, count: 6 },
    ];
    for (const { cx, cz, count } of clusters) {
      if (!insideLake(cx, cz, 0.4)) {
        mushroomsG.add(mushroom(cx, cz, 0.95 + rng() * 0.25));
      }
      for (let i = 0; i < count - 1; i++) {
        const a = rng() * Math.PI * 2;
        const r = 0.35 + rng() * 0.6;
        const px = cx + Math.cos(a) * r;
        const pz = cz + Math.sin(a) * r;
        if (insideLake(px, pz, 0.4)) continue;
        const sz = 0.5 + rng() * 0.45;
        mushroomsG.add(mushroom(px, pz, sz));
      }
    }
  }

  // -------- rocks --------
  if (features.rocks) {
    const rocksG = fg("rocks");
    function rock(x: number, z: number, s: number): Mesh {
      const r = new Mesh(new SphereGeometry(0.4 * s, 12, 10), mat("#a8a098"));
      r.position.set(x, gY(x, z) + 0.24 * s, z);
      r.scale.set(1, 0.6, 0.85);
      r.rotation.y = rng() * Math.PI;
      r.castShadow = true;
      r.receiveShadow = true;
      return r;
    }
    const rockPos: Array<[number, number, number]> = [
      [3.6, 3.4, 1.0],
      [4.0, 3.7, 0.6],
      [3.4, 3.9, 0.7],
    ];
    for (const [x, z, s] of rockPos) {
      if (insideLake(x, z, 0.5)) continue;
      rocksG.add(rock(x, z, s));
    }
  }

  // -------- cave --------
  if (features.cave) {
    const caveG = fg("cave");
    function buildCave(): Group {
      const g = new Group();
      const S = 1.75;
      const E = 2.0;
      const hill = new Mesh(
        new SphereGeometry(1.6 * S, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat("#a8a098"),
      );
      hill.scale.set(1.35, 1.05, 1.0);
      hill.castShadow = true;
      hill.receiveShadow = true;
      g.add(hill);
      const moss = new Mesh(
        new SphereGeometry(1.58 * S, 22, 14, 0, Math.PI * 2, 0, Math.PI / 3.5),
        mat(CLAY.groundDeep),
      );
      moss.scale.set(1.35, 1.05, 1.0);
      moss.position.y = 0.03;
      g.add(moss);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        const tuft = new Mesh(
          new SphereGeometry(0.16 * S, 12, 10),
          mat(CLAY.groundDeep),
        );
        tuft.position.set(
          Math.cos(a) * 1.4 * S,
          1.05 * S,
          Math.sin(a) * 1.4 * S,
        );
        tuft.scale.set(1, 0.55, 1);
        g.add(tuft);
      }
      const mouthMat = new MeshBasicMaterial({ color: "#0a0608" });
      materials.push(mouthMat);
      const mouth = new Mesh(new SphereGeometry(0.5 * E, 18, 12), mouthMat);
      mouth.position.set(0, 0.55 * S, 1.55 * S);
      mouth.scale.set(1.0, 1.15, 0.55);
      g.add(mouth);
      const arch = new Mesh(
        new TorusGeometry(0.55 * E, 0.13 * E, 10, 26, Math.PI),
        mat("#857a98"),
      );
      arch.position.set(0, 0.5 * S, 1.68 * S);
      arch.castShadow = true;
      g.add(arch);
      const pebPos: Array<[number, number]> = [
        [-0.55, 1.8],
        [0.55, 1.8],
        [-0.2, 1.95],
        [0.25, 1.92],
      ];
      for (const [x, z] of pebPos) {
        const peb = new Mesh(
          new SphereGeometry(0.13 * S, 12, 10),
          mat("#a8a098"),
        );
        peb.position.set(x * S, 0.08, z * S);
        peb.scale.set(1.2, 0.5, 1);
        g.add(peb);
      }
      return g;
    }
    const caveX = -7.5;
    const caveZ = 7.0;
    const cave = buildCave();
    cave.position.set(caveX, gY(caveX, caveZ) - 0.05, caveZ);
    cave.rotation.y = Math.atan2(-caveX, -caveZ);
    caveG.add(cave);
  }

  // -------- clouds --------
  const cloudGroup = new Group();
  cloudGroup.name = "clouds";
  if (features.clouds) {
    function cloud(x: number, y: number, z: number, s: number): Group {
      const g = new Group();
      const offsets: Array<[number, number, number]> = [
        [0, 0, 0],
        [0.8, 0.1, 0],
        [-0.7, 0.05, 0.1],
        [0.3, -0.2, 0.2],
      ];
      for (const [dx, dy, dz] of offsets) {
        const m2 = new Mesh(
          new SphereGeometry(0.7 * s, 14, 10),
          mat(CLAY.cloud),
        );
        m2.position.set(dx * s, dy * s, dz * s);
        g.add(m2);
      }
      g.position.set(x, y, z);
      return g;
    }
    cloudGroup.add(cloud(-7, 7.5, -4, 1.2));
    cloudGroup.add(cloud(6, 8.5, 4, 1.0));
    cloudGroup.add(cloud(2, 9, -7, 0.9));
    root.add(cloudGroup);
    featureGroups.clouds = cloudGroup;
  }

  // -------- butterflies --------
  const butterflies: Array<{
    obj: Group;
    wL: Mesh;
    wR: Mesh;
    cx: number;
    cz: number;
    r: number;
    speed: number;
    y: number;
    phase: number;
  }> = [];
  if (features.butterflies) {
    const butterfliesG = fg("butterflies");
    function butterfly(c: string): {
      g: Group;
      wL: Mesh;
      wR: Mesh;
    } {
      const g = new Group();
      const body = new Mesh(
        new CylinderGeometry(0.03, 0.03, 0.18, 6),
        mat("#3a2818"),
      );
      g.add(body);
      const wL = new Mesh(new SphereGeometry(0.15, 8, 6), mat(c));
      wL.scale.set(1, 0.1, 0.7);
      wL.position.x = 0.15;
      g.add(wL);
      const wR = wL.clone();
      wR.position.x = -0.15;
      g.add(wR);
      return { g, wL, wR };
    }
    const cols = [
      CLAY.butterflyA,
      CLAY.butterflyB,
      CLAY.butterflyC,
      CLAY.butterflyA,
      CLAY.butterflyB,
      CLAY.butterflyC,
    ];
    for (const c of cols) {
      const { g, wL, wR } = butterfly(c);
      butterfliesG.add(g);
      butterflies.push({
        obj: g,
        wL,
        wR,
        cx: (rng() - 0.5) * 6,
        cz: (rng() - 0.5) * 6,
        r: 1 + rng() * 1.5,
        speed: 0.5 + rng() * 0.5,
        y: 1.5 + rng() * 1.5,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  // -------- toys --------
  let toyG: Group | null = null;
  const toyX = 3.6;
  const toyZ = 2.4;
  const toyBaseY = gY(toyX, toyZ) + 0.4;
  if (features.toy) {
    const toysG = fg("toys");
    toyG = new Group();

    // yarn ball
    const yarnG = new Group();
    const yarn = new Mesh(new SphereGeometry(0.4, 22, 16), mat(CLAY.toy));
    yarn.castShadow = true;
    yarnG.add(yarn);
    for (let i = 0; i < 4; i++) {
      const stripe = new Mesh(
        new TorusGeometry(0.41, 0.045, 8, 28),
        mat(CLAY.toyStripe),
      );
      stripe.rotation.x = rng() * Math.PI;
      stripe.rotation.y = rng() * Math.PI;
      yarnG.add(stripe);
    }
    const thread = new Mesh(
      new CylinderGeometry(0.015, 0.015, 0.5, 6),
      mat(CLAY.toyStripe),
    );
    thread.position.set(0.25, -0.2, 0.2);
    thread.rotation.z = 0.4;
    yarnG.add(thread);
    yarnG.position.set(-0.55, 0, 0);
    toyG.add(yarnG);

    // soccer ball
    const soccerG = new Group();
    const soccerBody = new Mesh(
      new SphereGeometry(0.42, 24, 18),
      mat("#f5f5f2"),
    );
    soccerBody.castShadow = true;
    soccerG.add(soccerBody);
    const patchMat = mat("#2a2820");
    const patches: Array<[number, number, number]> = [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
    ];
    for (const [px, py, pz] of patches) {
      const patch = new Mesh(new CircleGeometry(0.14, 5), patchMat);
      const n = new Vector3(px, py, pz).normalize();
      patch.position.copy(n.clone().multiplyScalar(0.43));
      patch.lookAt(n.clone().multiplyScalar(2));
      soccerG.add(patch);
    }
    soccerG.position.set(0.55, 0, 0);
    toyG.add(soccerG);

    toyG.position.set(toyX, toyBaseY, toyZ);
    toysG.add(toyG);
  }

  // -------- lion path --------
  const lionCurve = new CatmullRomCurve3(
    [
      new Vector3(-3.2, 0, 1.5),
      new Vector3(-1.4, 0, -0.3),
      new Vector3(0.6, 0, -1.5),
      new Vector3(2.6, 0, -1.0),
      new Vector3(3.2, 0, 1.5),
      new Vector3(1.2, 0, 2.6),
      new Vector3(-1.4, 0, 2.3),
    ],
    true,
    "catmullrom",
    0.5,
  );

  // -------- updateWorld --------
  function updateWorld(
    dt: number,
    t: number,
    updOpts?: { reducedMotion?: boolean },
  ): void {
    const reduced = updOpts?.reducedMotion === true;
    // R6 (Plan 13-04): water shimmer + lily bob are ambient — gate them.
    if (!reduced) {
      if (lakeMat) {
        lakeMat.color.lerpColors(
          new Color(CLAY.water),
          new Color("#9ad6e0"),
          0.5 + Math.sin(t * 1.4) * 0.5,
        );
      }
      for (const l of lilies) {
        l.obj.position.y = l.baseY + Math.sin(t * 0.9 + l.phase) * 0.025;
      }
    }
    if (toyG) {
      toyG.rotation.y = t * 0.4;
      toyG.position.y = toyBaseY + Math.abs(Math.sin(t * 2)) * 0.16;
      const yarn = toyG.children[0];
      if (yarn) yarn.rotation.y = t * 1.8;
      const soccer = toyG.children[1];
      if (soccer) {
        soccer.rotation.x = t * 2.2;
        soccer.rotation.z = Math.sin(t * 1.1) * 0.3;
      }
    }
    for (const tr of trees) {
      tr.obj.rotation.z = Math.sin(t * tr.freq + tr.phase) * 0.03;
      tr.obj.rotation.x = Math.cos(t * tr.freq * 0.85 + tr.phase) * 0.022;
    }
    if (!reduced) {
      for (const b of butterflies) {
        const a = t * b.speed + b.phase;
        b.obj.position.set(
          b.cx + Math.cos(a) * b.r,
          b.y + Math.sin(a * 1.3) * 0.25,
          b.cz + Math.sin(a) * b.r,
        );
        b.obj.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(t * 18 + b.phase) * 0.9;
        b.wL.rotation.z = flap;
        b.wR.rotation.z = -flap;
      }
      let i = 0;
      for (const c of cloudGroup.children) {
        c.position.x += dt * 0.18 * (i % 2 === 0 ? 1 : -1);
        if (c.position.x > 14) c.position.x = -14;
        if (c.position.x < -14) c.position.x = 14;
        i++;
      }
    }
  }

  // -------- dispose --------
  function dispose(): void {
    root.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        if (m.geometry) m.geometry.dispose();
      }
    });
    for (const mt of materials) mt.dispose();
    grad.dispose();
    ctx.scene.remove(root);
  }

  return {
    root,
    featureGroups,
    mat,
    lionCurve,
    updateWorld,
    dispose,
    skyMat,
  };
}
