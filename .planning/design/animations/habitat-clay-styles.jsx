// habitat-clay-styles.jsx — three animal-styling options on the same Soft Clay world.
// Exposes: ClayChibi, ClayStorybookV2, ClayMascot.

// Tiny deterministic RNG. Used in world / ambient construction so geometry
// is identical across rebuilds; behavioural randomness (blink intervals,
// ear-twitch timing, dust paw selection) keeps using Math.random.
function _mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// === Shared palette + world ===========================================
const CLAY = {
  sky: '#cfe6f0', skyTop: '#a8d2e6', cloud: '#fbfaf6',
  ground: '#a8d77c', groundAlt: '#9bcf6a', groundDeep: '#6fb04a', groundShadow: '#5a8f3a',
  soil: '#c89a6e', soilDeep: '#8a6647',
  path: '#d6c39a',
  water: '#7ec8d6', waterDeep: '#3e8fa6',
  lily: '#7fb84d', lilyFlower: '#fbfaf6',
  flowerA: '#f8c8d8', flowerB: '#fffbe8', flowerC: '#c9a8e8',
  mushroomCap: '#e4644a', mushroomStem: '#fbfaf6',
  butterflyA: '#f0a3c0', butterflyB: '#e8b4f0', butterflyC: '#c9a8e8',
  toy: '#e85a8a', toyStripe: '#fff5e6',
};

function _toonGrad(steps) {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(((i + 1) / steps) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// Feature flags let level-progression views opt-in to scenery piece-by-piece.
// All default to true so existing callers (the polished v2 file) are unaffected.
const DEFAULT_FEATURES = {
  clouds: true, path: true, lake: true, lilies: true,
  trees: true, flowers: true, grass: true,
  mushrooms: true, rocks: true, butterflies: true, toy: true,
};

function buildClayWorld(canvas, w, h, worldOpts = {}) {
  const features = Object.assign({}, DEFAULT_FEATURES, worldOpts.features || {});
  const isMobile = (w < 768) || (typeof window !== 'undefined' && window.innerWidth < 768);
  const Q = isMobile ? 0.55 : 1; // geometry quality multiplier for mobile
  const rng = _mulberry32(0xC0FFEE);

  // Optional sky override for variants (e.g. golden-hour for Level 9 v2)
  const skyOpts = worldOpts.sky || {};
  const SKY_TOP = skyOpts.top || CLAY.skyTop;
  const SKY_BOT = skyOpts.bot || CLAY.sky;
  const FOG_COL = skyOpts.fog || CLAY.sky;

  const host = buildSceneHost(canvas, w, h, {
    bg: SKY_BOT, fog: FOG_COL, fogNear: 36, fogFar: 80,
    fov: 30, camDist: 15, camHeight: 9.5, lookY: 1.2, exposure: skyOpts.exposure || 1.02,
  });
  const { scene } = host;
  const grad = _toonGrad(4);
  const mat = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });

  // sky gradient
  {
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(SKY_TOP) },
        bot: { value: new THREE.Color(SKY_BOT) },
      },
      vertexShader: `varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 vPos; uniform vec3 top; uniform vec3 bot; void main(){float t=clamp(vPos.y/60.0+0.4,0.,1.); gl_FragColor=vec4(mix(bot,top,smoothstep(0.,1.,t)),1.);}`,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), skyMat));
  }

  // lights
  const key = new THREE.DirectionalLight('#fff5dc', 1.7);
  key.position.set(7, 12, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -14; key.shadow.camera.right = 14;
  key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 4;
  scene.add(key);
  scene.add(new THREE.DirectionalLight('#bcd8ff', 0.35).translateOnAxis(new THREE.Vector3(-5, 6, -3).normalize(), 8));
  scene.add(new THREE.HemisphereLight('#cfe6f0', '#88a5b0', 0.65));
  scene.add(new THREE.AmbientLight('#ffffff', 0.22));

  // island (2× wider than before — same vertical curve, bigger habitat)
  const R = 9.2;
  const ISLAND_XZ = 2;
  // Lake footprint reserved up-front so decor placement can skip it even
  // when the lake feature is locked (keeps the mound layout identical
  // across all levels — the lake just fills a slot that was already vacant).
  const lakeX = -4.2, lakeZ = 3.4;
  const LAKE_SCALE = worldOpts.lakeScale ?? 1.5;
  const lakeRX = 2.4 * 1.35 * LAKE_SCALE;  // outer half-width along X
  const lakeRZ = 2.4 * 1.00 * LAKE_SCALE;  // outer half-width along Z
  function _insideLakeFootprint(px, pz, pad = 0.4) {
    const dx = (px - lakeX) / (lakeRX + pad);
    const dz = (pz - lakeZ) / (lakeRZ + pad);
    return dx * dx + dz * dz < 1;
  }
  const island = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), mat(CLAY.ground));
  mound.scale.set(ISLAND_XZ, 0.42, ISLAND_XZ); mound.position.y = -3.2;
  mound.receiveShadow = true; mound.castShadow = true;
  island.add(mound);
  // alt patches — skip the lake footprint so decor doesn't float on water.
  // Use retries so we still end up with the full count.
  {
    let placed = 0, attempts = 0;
    while (placed < 9 && attempts < 60) {
      attempts++;
      const a = rng() * Math.PI * 2, r = 1 + rng() * (R - 2.5);
      const size = 0.9 + rng() * 1.2;
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      if (_insideLakeFootprint(px, pz, 0.3)) continue;
      const p = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), mat(CLAY.groundAlt));
      p.scale.set(1, 0.05, 1);
      p.position.set(px, 0.32, pz);
      p.receiveShadow = true;
      island.add(p);
      placed++;
    }
  }
  // grass ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * ISLAND_XZ - 0.6, 0.4, 14, 96), mat(CLAY.groundDeep));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.2;
  island.add(ring);
  // soil underbelly
  const soil = new THREE.Mesh(
    new THREE.SphereGeometry(R - 0.3, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    mat(CLAY.soil)
  );
  soil.position.y = -3.2; soil.scale.set(ISLAND_XZ, 0.55, ISLAND_XZ);
  island.add(soil);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const chunk = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), mat(CLAY.soilDeep));
    const rr = (R - 0.4) * ISLAND_XZ;
    chunk.position.set(Math.cos(a) * rr, -3.4 - rng() * 0.6, Math.sin(a) * rr);
    chunk.scale.set(0.9, 1.2 + rng() * 0.6, 0.9);
    island.add(chunk);
  }
  scene.add(island);

  // Ground surface helper for snapping decor onto the (2×-wide) mound.
  // Mound: SphereGeometry(R=9.2) scaled (ISLAND_XZ, 0.42, ISLAND_XZ), centered y=-3.2.
  // World-space surface y at (x,z) = -3.2 + 0.42 * sqrt(R² - (x²+z²)/ISLAND_XZ²).
  function gY(x, z) {
    const r2 = (x * x + z * z) / 4;
    return -3.2 + 0.42 * Math.sqrt(Math.max(0.01, 84.64 - r2));
  }
  // Re-place alt patches on the surface (inserted into island group with y=0.32
  // before gY existed). Identify them by being flat spheres added to island.
  island.children.forEach((m) => {
    if (m === mound || m === ring || m === soil) return;
    if (m.geometry && m.geometry.type === 'SphereGeometry' && m.scale.y < 0.1) {
      m.position.y = gY(m.position.x, m.position.z) + 0.01;
    }
  });

  // path stones
  if (features.path) {
  const stoneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.5, 0, 1.8),
    new THREE.Vector3(-1.5, 0, -0.5),
    new THREE.Vector3(0.8, 0, -1.6),
    new THREE.Vector3(2.8, 0, -1.2),
  ], false);
  for (let i = 0; i < 14; i++) {
    const u = i / 13;
    const p = stoneCurve.getPoint(u);
    // The path naturally starts inside the (now-bigger) lake footprint;
    // skip those stones so the trail emerges from the shore.
    if (_insideLakeFootprint(p.x, p.z, 0.1)) continue;
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), mat(CLAY.path));
    stone.scale.set(1, 0.18, 0.8 + rng() * 0.25);
    stone.position.set(p.x, gY(p.x, p.z) + 0.03, p.z);
    stone.rotation.y = rng() * Math.PI;
    stone.receiveShadow = true;
    scene.add(stone);
  }
  }

  // lake — curved disk that hugs the mound's spherical surface instead of
  // sitting flat at a single elevation.
  let lake = null;
  const lilies = [];
  if (features.lake) {
    // Build a curved water disk: vertices arranged in concentric rings within
    // an ellipse around (lakeX, lakeZ); each vertex's Y follows gY(x,z) + lift
    // so the water sits flush on the mound everywhere.
    function curvedDisk(rx, rz, lift, rings = 5, segs = 40) {
      const positions = [];
      const indices = [];
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
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }

    lake = new THREE.Mesh(curvedDisk(lakeRX, lakeRZ, 0.04), mat(CLAY.water));
    lake.receiveShadow = true;
    scene.add(lake);
    const lakeIn = new THREE.Mesh(curvedDisk(lakeRX * 0.68, lakeRZ * 0.68, 0.06), mat(CLAY.waterDeep));
    scene.add(lakeIn);

    // Rim: tube traced around the lake's outline, with each point dropped
    // slightly below the water so it reads as a clay edge.
    const rimPts = [];
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const wx = lakeX + Math.cos(a) * (lakeRX + 0.05);
      const wz = lakeZ + Math.sin(a) * (lakeRZ + 0.05);
      const wy = gY(wx, wz) - 0.02;
      rimPts.push(new THREE.Vector3(wx, wy, wz));
    }
    const rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
    const rim = new THREE.Mesh(new THREE.TubeGeometry(rimCurve, 64, 0.18, 10, true), mat(CLAY.soilDeep));
    rim.castShadow = true;
    scene.add(rim);

  // lily pads — float just above the lake surface at each pad's (x,z)
  if (features.lilies) {
  for (let i = 0; i < 5; i++) {
    const lily = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), mat(CLAY.lily));
    pad.scale.set(1, 0.12, 1); lily.add(pad);
    if (rng() > 0.5) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(CLAY.lilyFlower));
      flower.position.y = 0.08; lily.add(flower);
    }
    const ang = (i / 5) * Math.PI * 2;
    const lx = lakeX + Math.cos(ang) * (0.6 + rng() * 0.8) * LAKE_SCALE;
    const lz = lakeZ + Math.sin(ang) * (0.5 + rng() * 0.7) * LAKE_SCALE;
    const ly = gY(lx, lz) + 0.1;
    lily.position.set(lx, ly, lz);
    scene.add(lily);
    lilies.push({ obj: lily, phase: rng() * Math.PI * 2, baseY: ly });
  }
  }
  } // /features.lake

  // trees
  function tree(x, z, scale) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1.2 * scale, 14), mat('#7a4f30'));
    trunk.position.y = 0.6 * scale + 0.2; trunk.castShadow = true; g.add(trunk);
    const puffs = [
      { r: 0.95, x: 0, y: 1.55, z: 0, c: '#7fb84d' },
      { r: 0.7, x: 0.45, y: 1.85, z: 0.25, c: '#7fb84d' },
      { r: 0.6, x: -0.35, y: 1.7, z: -0.3, c: '#4f8a2e' },
      { r: 0.55, x: 0.15, y: 2.05, z: -0.2, c: '#4f8a2e' },
    ];
    puffs.forEach(p => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(p.r * scale, 18, 14), mat(p.c));
      m.position.set(p.x * scale, p.y * scale + 0.2, p.z * scale);
      m.castShadow = true;
      g.add(m);
    });
    g.position.set(x, gY(x, z) - 0.2, z); g.rotation.y = rng() * Math.PI;
    return g;
  }
  const trees = [];
  if (features.trees) {
    // Last entry moved from (-4.2, 5.5) — that spot is inside the lake on
    // larger lakeScale settings. Each tree also skips itself if the lake
    // expanded over its position.
    [[4.5, -3.2, 1.3], [-2.5, -5.2, 1.0], [5.6, 2.8, 0.85], [-5.8, -1.6, 1.1], [2.0, 5.8, 0.8], [-5.5, 7.0, 0.95]].forEach(([x, z, s]) => {
      if (_insideLakeFootprint(x, z, 0.5)) return;
      const tr = tree(x, z, s);
      tr.userData.sway = { phase: rng() * Math.PI * 2, freq: 0.5 + rng() * 0.3 };
      scene.add(tr);
      trees.push(tr);
    });
  }

  // flowers
  const flowerCols = [CLAY.flowerA, CLAY.flowerB, CLAY.flowerC];
  function flower(x, z, c) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), mat(CLAY.groundDeep));
    stem.position.y = 0.4; g.add(stem);
    const petalMat = mat(c);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), petalMat);
      p.position.set(Math.cos(a) * 0.1, 0.65, Math.sin(a) * 0.1);
      g.add(p);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat('#f0c850'));
    center.position.y = 0.65; g.add(center);
    g.position.set(x, gY(x, z) - 0.2, z);
    return g;
  }
  if (features.flowers) {
    for (let i = 0; i < 42; i++) {
      const a = rng() * Math.PI * 2, r = 1.5 + rng() * (R - 2.4);
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      if (_insideLakeFootprint(px, pz, 0.3)) continue;
      scene.add(flower(px, pz, flowerCols[Math.floor(rng() * 3)]));
    }
  }
  // grass blades
  if (features.grass) {
  for (let i = 0; i < 65; i++) {
    const a = rng() * Math.PI * 2, r = 1 + rng() * (R - 1.8);
    const px = Math.cos(a) * r, pz = Math.sin(a) * r;
    if (_insideLakeFootprint(px, pz, 0.3)) continue;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 4), mat(CLAY.groundDeep));
    blade.position.set(px, gY(px, pz) + 0.2, pz); blade.rotation.y = rng() * Math.PI;
    scene.add(blade);
  }
  }
  // mushrooms
  function mushroom(x, z, s) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.13 * s, 0.35 * s, 10), mat(CLAY.mushroomStem));
    stem.position.y = 0.18 * s + 0.25; stem.castShadow = true; g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(CLAY.mushroomCap));
    cap.position.y = 0.4 * s + 0.25; cap.scale.set(1, 0.7, 1); cap.castShadow = true; g.add(cap);
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 8), mat(CLAY.mushroomStem));
      const a = rng() * Math.PI * 2;
      dot.position.set(Math.cos(a) * 0.12 * s, 0.5 * s + 0.25, Math.sin(a) * 0.12 * s);
      g.add(dot);
    }
    g.position.set(x, gY(x, z) - 0.25, z);
    return g;
  }
  if (features.mushrooms) {
    // Three clusters of 5–6 toadstools each. Cluster centers are
    // hand-placed (consistent across rebuilds), individual mushroom
    // offsets and sizes are seeded via rng.
    const clusters = [
      { cx: 5.2, cz: -0.5, count: 6 },   // east, near the rocks
      { cx: 1.5, cz: 5.0, count: 5 },    // north, past the path
      { cx: -4.0, cz: -1.0, count: 6 },  // by the elephant
    ];
    clusters.forEach(({ cx, cz, count }) => {
      // a larger "anchor" mushroom at the centre of each ring
      if (!_insideLakeFootprint(cx, cz, 0.4)) {
        scene.add(mushroom(cx, cz, 0.95 + rng() * 0.25));
      }
      for (let i = 0; i < count - 1; i++) {
        const a = rng() * Math.PI * 2;
        const r = 0.35 + rng() * 0.6;
        const px = cx + Math.cos(a) * r;
        const pz = cz + Math.sin(a) * r;
        if (_insideLakeFootprint(px, pz, 0.4)) continue;
        const sz = 0.5 + rng() * 0.45;
        scene.add(mushroom(px, pz, sz));
      }
    });
  }
  // rocks
  function rock(x, z, s) {
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 12, 10), mat('#a8a098'));
    r.position.set(x, gY(x, z) + 0.24 * s, z); r.scale.set(1, 0.6, 0.85);
    r.rotation.y = rng() * Math.PI; r.castShadow = true; r.receiveShadow = true;
    return r;
  }
  if (features.rocks) {
    [[3.6, 3.4, 1.0], [4.0, 3.7, 0.6], [3.4, 3.9, 0.7]].forEach(([x, z, s]) => {
      if (_insideLakeFootprint(x, z, 0.5)) return;
      scene.add(rock(x, z, s));
    });
  }

  // cave — a stone outcrop on the mound's north-west corner with a dark
  // mouth and a clay-arch lintel.
  if (features.cave) {
    function buildCave() {
      const g = new THREE.Group();
      const S = 1.75; // overall hill scale
      const E = 2.0;  // entrance scale (mouth + arch, independently bigger)

      // Stone hill body
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(1.6 * S, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat('#a8a098'),
      );
      hill.scale.set(1.35, 1.05, 1.0);
      hill.castShadow = true; hill.receiveShadow = true;
      g.add(hill);
      // Mossy hat
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(1.58 * S, 22, 14, 0, Math.PI * 2, 0, Math.PI / 3.5),
        mat(CLAY.groundDeep),
      );
      moss.scale.set(1.35, 1.05, 1.0);
      moss.position.y = 0.03;
      g.add(moss);
      // Grass tufts on top
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16 * S, 12, 10), mat(CLAY.groundDeep));
        tuft.position.set(Math.cos(a) * 1.4 * S, 1.05 * S, Math.sin(a) * 1.4 * S);
        tuft.scale.set(1, 0.55, 1);
        g.add(tuft);
      }
      // Dark cave mouth — 2× entrance, position follows hill scale
      const mouth = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * E, 18, 12),
        new THREE.MeshBasicMaterial({ color: '#0a0608' }),
      );
      mouth.position.set(0, 0.55 * S, 1.55 * S);
      mouth.scale.set(1.0, 1.15, 0.55);
      g.add(mouth);
      // Stone arch lintel — 2× entrance
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.55 * E, 0.13 * E, 10, 26, Math.PI),
        mat('#857a98'),
      );
      arch.position.set(0, 0.5 * S, 1.68 * S);
      arch.castShadow = true;
      g.add(arch);
      // Threshold pebbles — scaled with hill
      [[-0.55, 1.8], [0.55, 1.8], [-0.2, 1.95], [0.25, 1.92]].forEach(([x, z]) => {
        const peb = new THREE.Mesh(new THREE.SphereGeometry(0.13 * S, 12, 10), mat('#a8a098'));
        peb.position.set(x * S, 0.08, z * S);
        peb.scale.set(1.2, 0.5, 1);
        g.add(peb);
      });

      return g;
    }
    const caveX = -7.5, caveZ = 7.0;
    const cave = buildCave();
    // Sit the cave's base on the mound surface. The arch faces +Z by default;
    // rotate it slightly so the entrance faces the centre of the habitat
    // (more visible from the default camera angle).
    cave.position.set(caveX, gY(caveX, caveZ) - 0.05, caveZ);
    cave.rotation.y = Math.atan2(-caveX, -caveZ); // face toward origin
    scene.add(cave);
  }

  // clouds
  const clouds = new THREE.Group();
  if (features.clouds) {
  function cloud(x, y, z, s) {
    const g = new THREE.Group();
    [[0, 0, 0], [0.8, 0.1, 0], [-0.7, 0.05, 0.1], [0.3, -0.2, 0.2]].forEach(([dx, dy, dz]) => {
      const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 14, 10), mat(CLAY.cloud));
      m2.position.set(dx * s, dy * s, dz * s); g.add(m2);
    });
    g.position.set(x, y, z); return g;
  }
  [cloud(-7, 7.5, -4, 1.2), cloud(6, 8.5, 4, 1.0), cloud(2, 9, -7, 0.9)].forEach(c => clouds.add(c));
  scene.add(clouds);
  }

  // butterflies
  const butterflies = [];
  if (features.butterflies) {
  function butterfly(c) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), mat('#3a2818'));
    g.add(body);
    const wL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(c));
    wL.scale.set(1, 0.1, 0.7); wL.position.x = 0.15; g.add(wL);
    const wR = wL.clone(); wR.position.x = -0.15; g.add(wR);
    g.userData = { wL, wR };
    return g;
  }
  [CLAY.butterflyA, CLAY.butterflyB, CLAY.butterflyC, CLAY.butterflyA, CLAY.butterflyB, CLAY.butterflyC].forEach((c, i) => {
    const b = butterfly(c); scene.add(b);
    butterflies.push({
      obj: b,
      cx: (rng() - 0.5) * 6, cz: (rng() - 0.5) * 6,
      r: 1 + rng() * 1.5, speed: 0.5 + rng() * 0.5,
      y: 1.5 + rng() * 1.5, phase: rng() * Math.PI * 2,
    });
  });
  }

  // toys — yarn ball + soccer ball
  let toyG = null;
  const toyX = 3.6, toyZ = 2.4;
  const toyBaseY = gY(toyX, toyZ) + 0.4;
  if (features.toy) {
    toyG = new THREE.Group();

    // ---- yarn ball ----
    const yarnG = new THREE.Group();
    const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.4, 22, 16), mat(CLAY.toy));
    yarn.castShadow = true; yarnG.add(yarn);
    for (let i = 0; i < 4; i++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.045, 8, 28), mat(CLAY.toyStripe));
      stripe.rotation.x = rng() * Math.PI;
      stripe.rotation.y = rng() * Math.PI;
      yarnG.add(stripe);
    }
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), mat(CLAY.toyStripe));
    thread.position.set(0.25, -0.2, 0.2); thread.rotation.z = 0.4; yarnG.add(thread);
    yarnG.position.set(-0.55, 0, 0);
    toyG.add(yarnG);

    // ---- soccer ball ----
    const soccerG = new THREE.Group();
    const soccerBody = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), mat('#f5f5f2'));
    soccerBody.castShadow = true; soccerG.add(soccerBody);
    // Pentagon patches — dark clay-toon panels
    const patchMat = mat('#2a2820');
    const patchPositions = [
      [0, 0, 1], [0, 0, -1],
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
    ];
    patchPositions.forEach(([px, py, pz]) => {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.14, 5), patchMat);
      const n = new THREE.Vector3(px, py, pz).normalize();
      patch.position.copy(n.clone().multiplyScalar(0.43));
      patch.lookAt(n.clone().multiplyScalar(2));
      soccerG.add(patch);
    });
    soccerG.position.set(0.55, 0, 0);
    toyG.add(soccerG);

    toyG.position.set(toyX, toyBaseY, toyZ);
    scene.add(toyG);
  }

  // lion path
  const lionCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.2, 0, 1.5),
    new THREE.Vector3(-1.4, 0, -0.3),
    new THREE.Vector3(0.6, 0, -1.5),
    new THREE.Vector3(2.6, 0, -1.0),
    new THREE.Vector3(3.2, 0, 1.5),
    new THREE.Vector3(1.2, 0, 2.6),
    new THREE.Vector3(-1.4, 0, 2.3),
  ], true, 'catmullrom', 0.5);

  // world-level animation
  function updateWorld(dt, t) {
    if (lake) lake.material.color.lerpColors(new THREE.Color(CLAY.water), new THREE.Color('#9ad6e0'), 0.5 + Math.sin(t * 1.4) * 0.5);
    lilies.forEach(l => { l.obj.position.y = l.baseY + Math.sin(t * 0.9 + l.phase) * 0.025; });
    if (toyG) {
      toyG.rotation.y = t * 0.4;
      toyG.position.y = toyBaseY + Math.abs(Math.sin(t * 2)) * 0.16;
      // yarn ball spins on its own axis
      const yarnG = toyG.children[0];
      if (yarnG) yarnG.rotation.y = t * 1.8;
      // soccer ball rolls forward/back
      const soccerG = toyG.children[1];
      if (soccerG) {
        soccerG.rotation.x = t * 2.2;
        soccerG.rotation.z = Math.sin(t * 1.1) * 0.3;
      }
    }
    trees.forEach(tr => {
      const sd = tr.userData.sway;
      tr.rotation.z = Math.sin(t * sd.freq + sd.phase) * 0.03;
      tr.rotation.x = Math.cos(t * sd.freq * 0.85 + sd.phase) * 0.022;
    });
    butterflies.forEach(b => {
      const a = t * b.speed + b.phase;
      b.obj.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 1.3) * 0.25, b.cz + Math.sin(a) * b.r);
      b.obj.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 18 + b.phase) * 0.9;
      b.obj.userData.wL.rotation.z = flap;
      b.obj.userData.wR.rotation.z = -flap;
    });
    clouds.children.forEach((c, i) => {
      c.position.x += dt * 0.18 * (i % 2 === 0 ? 1 : -1);
      if (c.position.x > 14) c.position.x = -14;
      if (c.position.x < -14) c.position.x = 14;
    });
  }

  return { host, scene, mat, lionCurve, updateWorld };
}

// === Sleep cycle (Level 7+) ============================================
// Real-world London-time rhythm: every 2 hours starting at 00:00 local,
// Leo naps for 1 hour. So 00:00–01:00 = sleeping, 01:00–02:00 = trotting,
// 02:00–03:00 = sleeping, etc.
//
// Demo mode runs a 60s cycle (30s sleep + 30s trot) so transitions can be
// previewed in seconds.

function _londonSecondsSinceMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const p = {};
  for (const x of parts) p[x.type] = x.value;
  // Intl returns hour="24" for midnight in en-GB hour12:false locale on some
  // platforms; normalise.
  let h = parseInt(p.hour, 10) % 24;
  return h * 3600 + parseInt(p.minute, 10) * 60 + parseInt(p.second, 10);
}

function getSleepState(demoMode, demoSeconds) {
  if (demoMode) {
    const cycleSec = demoSeconds % 60;
    return { sleeping: cycleSec < 30, cycleSec, cyclePeriod: 60, sleepHalf: 30 };
  }
  const sec = _londonSecondsSinceMidnight();
  const cycleSec = sec % 7200;
  return { sleeping: cycleSec < 3600, cycleSec, cyclePeriod: 7200, sleepHalf: 3600 };
}

// Sleeping-Leo pose. Lerps Leo to the cave anchor, lowers his body, tucks
// legs, closes eyes, slows breathing.
function applyLionSleep(leo, dt, t, state) {
  const a = state.caveAnchor;
  // Position + rotation lerp
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

  // Body lowers; slow breathing
  if (leo.torso) {
    leo.torso.position.y = -0.42;
    leo.torso.rotation.x = 0;
    leo.torso.rotation.z = 0;
    const breath = 1 + Math.sin(t * 0.9) * 0.025;
    leo.torso.scale.set(breath, breath, breath);
  }

  // Legs tucked beneath
  if (leo.legs) {
    const baseY = leo.legBaseY ?? 0.78;
    leo.legs.FL.rotation.x = -0.55; leo.legs.FR.rotation.x = -0.55;
    leo.legs.BL.rotation.x = 0.45;  leo.legs.BR.rotation.x = 0.45;
    leo.legs.FL.position.y = baseY - 0.22; leo.legs.FR.position.y = baseY - 0.22;
    leo.legs.BL.position.y = baseY - 0.22; leo.legs.BR.position.y = baseY - 0.22;
  }

  // Head settles forward and down (resting on paws)
  if (leo.headG) {
    leo.headG.rotation.x += (0.32 - leo.headG.rotation.x) * k * 2;
    leo.headG.rotation.y *= 0.9;
  }

  // Eyes closed
  if (leo.eyes) {
    leo.eyes.forEach((e) => {
      e.pupil.scale.y = 0.05;
      if (e.white) e.white.scale.y = 0.05;
    });
  }

  // Quiet ears, relaxed tail
  if (leo.ears) {
    leo.ears.L.rotation.x = 0; leo.ears.R.rotation.x = 0;
    leo.ears.L.rotation.z = leo.ears.L.userData.baseRotZ;
    leo.ears.R.rotation.z = leo.ears.R.userData.baseRotZ;
  }
  if (leo.brows) {
    leo.brows.L.position.y = -0.02; leo.brows.R.position.y = -0.02;
  }
  if (leo.tailRoot) {
    leo.tailRoot.rotation.y *= 0.85;
    leo.tailRoot.rotation.z *= 0.85;
  }
  if (leo.tailTuft) {
    leo.tailTuft.rotation.x *= 0.85;
    leo.tailTuft.rotation.z *= 0.85;
  }

  // Spawn Z bubbles periodically
  if (state.sleepBubbles) {
    state.bubbleT = (state.bubbleT || 0) + dt;
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

// Sprite-based "Z" bubbles, drifting up + fading.
function buildSleepBubbles(scene) {
  // Canvas-backed Z texture so bubbles read as little Z's regardless of camera angle.
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 96, 96);
  ctx.fillStyle = '#fbfaf6';
  ctx.font = 'bold 74px ui-serif, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Soft outer glow for storybook feel
  ctx.shadowColor = 'rgba(74,64,112,0.55)';
  ctx.shadowBlur = 8;
  ctx.fillText('Z', 48, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;

  const POOL = 6;
  const bubbles = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
    m.scale.set(0.35, 0.35, 1);
    m.visible = false;
    scene.add(m);
    bubbles.push({ sprite: m, life: 0, basePos: new THREE.Vector3() });
  }
  function spawn(x, y, z) {
    const free = bubbles.find((b) => b.life <= 0);
    if (!free) return;
    free.basePos.set(x, y, z);
    free.sprite.position.copy(free.basePos);
    free.sprite.visible = true;
    free.sprite.material.opacity = 0;
    free.life = 3.2;
  }
  function update(dt) {
    bubbles.forEach((b) => {
      if (b.life > 0) {
        b.life -= dt;
        const elapsed = 3.2 - b.life;
        b.sprite.position.y = b.basePos.y + elapsed * 0.55;
        b.sprite.position.x = b.basePos.x + Math.sin(elapsed * 2.5) * 0.18;
        const u = b.life / 3.2; // 1→0
        // Fade in over first 0.3s, fade out over last 1.5s
        const fadeIn = Math.min(1, elapsed / 0.3);
        const fadeOut = Math.min(1, b.life / 1.5);
        b.sprite.material.opacity = 0.9 * fadeIn * fadeOut;
        if (b.life <= 0) {
          b.sprite.visible = false;
          b.sprite.material.opacity = 0;
        }
      }
    });
  }
  return { spawn, update };
}

// === Lion-anim driver (works on any lion w/ standard interface) =========
// Ground surface (mound = sphere R=9.2 scaled (ISLAND_XZ, 0.42, ISLAND_XZ),
// centered y=-3.2). World-space surface y at (x,z):
//   y = -3.2 + 0.42 * sqrt(max(0, R² - (x²+z²)/ISLAND_XZ²))
const _GROUND_BASE_Y = -3.2;
const _GROUND_R2 = 9.2 * 9.2;
const _GROUND_SCALE_Y = 0.42;
const _GROUND_SCALE_XZ = 2;
const _GROUND_SCALE_XZ_SQ = _GROUND_SCALE_XZ * _GROUND_SCALE_XZ;
function _groundAt(x, z) {
  const r2 = (x * x + z * z) / _GROUND_SCALE_XZ_SQ;
  const denom = Math.sqrt(Math.max(0.01, _GROUND_R2 - r2));
  const y = _GROUND_BASE_Y + _GROUND_SCALE_Y * denom;
  // gradient (∂y/∂x, ∂y/∂z) for tilt math
  const gx = -_GROUND_SCALE_Y * x / (_GROUND_SCALE_XZ_SQ * denom);
  const gz = -_GROUND_SCALE_Y * z / (_GROUND_SCALE_XZ_SQ * denom);
  return { y, gx, gz };
}

function applyLionWalk(leo, lionCurve, dt, t, state) {
  // Sleep takes over the lion's pose entirely.
  if (state.sleeping && state.caveAnchor) {
    applyLionSleep(leo, dt, t, state);
    return;
  }
  // When transitioning out of sleep, reset the limbs/torso that the sleep
  // pose nudged so the trot picks up cleanly.
  if (state.wasSleeping) {
    state.wasSleeping = false;
    if (leo.legs) {
      const baseY = leo.legBaseY ?? 0.78;
      Object.values(leo.legs).forEach((l) => { l.position.y = baseY; l.rotation.x = 0; });
    }
    if (leo.torso) { leo.torso.position.y = 0; leo.torso.scale.set(1, 1, 1); }
    if (leo.headG) { leo.headG.rotation.x = 0; }
  }
  const speedMul = state.speedMul ?? 1;
  const baseSpeed = 0.045;
  // Integrate u along the curve so changing the multiplier mid-walk is smooth
  // and doesn't jump him back/forward in time.
  state.u = (state.u ?? 0) + dt * baseSpeed * speedMul;
  const u = state.u % 1;
  const p = lionCurve.getPoint(u);
  const tan = lionCurve.getTangent(u).normalize();
  state.lastPos = state.lastPos || new THREE.Vector3();
  state.smoothSpeed = state.smoothSpeed || 0;
  state.blinkT = (state.blinkT || 0) + dt;

  const moved = p.distanceTo(state.lastPos) / Math.max(dt, 0.0001);
  state.smoothSpeed = state.smoothSpeed * 0.85 + moved * 0.15;
  state.lastPos.copy(p);

  // Snap to curved ground surface so paws plant on top instead of sinking
  // through the mound's spherical falloff.
  const ground = _groundAt(p.x, p.z);
  const pawOffset = leo.pawOffset ?? 0.198;
  leo.root.position.set(p.x, ground.y - pawOffset, p.z);
  leo.root.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI;

  // Pitch the torso so the lion stays perpendicular to the slope along its
  // direction of travel. Roll could be similar but the lion is narrow enough
  // that roll is barely visible — skip it.
  const slopeForward = ground.gx * tan.x + ground.gz * tan.z;
  const pitch = Math.atan(slopeForward);

  // 1 trot cycle per 0.047 of curve param ≈ 21 cycles per full loop, matching
  // the legacy "t*6" cadence at speedMul=1 so the gait reads the same.
  const trotPhase = (state.u ?? 0) * 133.33;
  if (leo.torso) {
    leo.torso.position.y = Math.abs(Math.sin(trotPhase)) * 0.05;
    leo.torso.rotation.z = Math.sin(trotPhase * 0.5) * 0.02;
    leo.torso.rotation.x = pitch;
  }
  const swing = Math.min(state.smoothSpeed * 0.6, 0.7);
  const lift = Math.min(state.smoothSpeed * 0.4, 0.45);
  const pA = Math.sin(trotPhase), pB = Math.sin(trotPhase + Math.PI);
  if (leo.legs) {
    leo.legs.FL.rotation.x = pA * swing; leo.legs.BR.rotation.x = pA * swing;
    leo.legs.FR.rotation.x = pB * swing; leo.legs.BL.rotation.x = pB * swing;
    const baseY = leo.legBaseY ?? 0.78;
    leo.legs.FL.position.y = baseY + Math.max(0, pA) * lift * 0.4;
    leo.legs.BR.position.y = baseY + Math.max(0, pA) * lift * 0.4;
    leo.legs.FR.position.y = baseY + Math.max(0, pB) * lift * 0.4;
    leo.legs.BL.position.y = baseY + Math.max(0, pB) * lift * 0.4;
  }
  if (leo.tailRoot) {
    leo.tailRoot.rotation.y = Math.sin(t * 3) * 0.4;
    leo.tailRoot.rotation.z = Math.sin(t * 2) * 0.1;
  }
  if (leo.headG) {
    leo.headG.rotation.y = Math.sin(t * 0.8) * 0.12;
    leo.headG.rotation.x = Math.sin(t * 0.5) * 0.05;
  }
  if (leo.eyes && leo.eyes.length) {
    if (state.blinkT > 2.5 + Math.random() * 1.5) state.blinkT = -0.18;
    const blink = state.blinkT < 0 ? 0.05 : 1.0;
    leo.eyes.forEach(e => {
      e.pupil.scale.y = blink;
      if (e.white) e.white.scale.y = 0.95 * blink + 0.05;
    });
  }
}

// === Storybook-only animation extras ====================================
// Builds on top of applyLionWalk: pupils track the elephant when it's in
// front of Leo, ears twitch occasionally, brows micro-raise, the tail
// tuft swings with secondary motion, and clay-dust puffs bloom under
// planted paws when he's at a good trot.
function applyStorybookLionExtras(leo, elephant, dt, t, state) {
  if (state.sleeping) return; // sleeping pose owns everything during a nap
  // direction to elephant in Leo's local frame (forward = -z after his root rot)
  let lookStrength = 0;
  let lx = 0, lz = 0;
  if (elephant) {
    const dx = elephant.position.x - leo.root.position.x;
    const dz = elephant.position.z - leo.root.position.z;
    const dist = Math.hypot(dx, dz);
    const yaw = leo.root.rotation.y;
    lx =  Math.cos(yaw) * dx - Math.sin(yaw) * dz;
    lz =  Math.sin(yaw) * dx + Math.cos(yaw) * dz;
    const inFront = lz < -0.3 ? 1 : 0;
    lookStrength = THREE.MathUtils.clamp(1 - dist / 6.5, 0, 1) * inFront;
  }

  // pupil tracking (smooth toward look target, otherwise idle wander)
  if (leo.eyes) {
    const targetTX = THREE.MathUtils.clamp(lx * 0.005, -0.028, 0.028);
    const targetTY = 0.006;
    const idleX = Math.sin(t * 0.6) * 0.012;
    const idleY = Math.cos(t * 0.5) * 0.006;
    const tx = lookStrength * targetTX + (1 - lookStrength) * idleX;
    const ty = lookStrength * targetTY + (1 - lookStrength) * idleY;
    const k = Math.min(1, dt * 6);
    leo.eyes.forEach(e => {
      const wantX = e.basePos.x + tx;
      const wantY = e.basePos.y + ty;
      e.pupilG.position.x += (wantX - e.pupilG.position.x) * k;
      e.pupilG.position.y += (wantY - e.pupilG.position.y) * k;
    });
  }

  // head yaw + slight pitch — override walk's idle nod when fixating
  if (leo.headG) {
    const targetYaw = lookStrength * THREE.MathUtils.clamp(Math.atan2(lx, -lz) * 0.45, -0.35, 0.35)
                    + (1 - lookStrength) * Math.sin(t * 0.8) * 0.12;
    const targetPitch = lookStrength * 0.06
                      + (1 - lookStrength) * Math.sin(t * 0.5) * 0.05;
    const k = Math.min(1, dt * 3);
    leo.headG.rotation.y += (targetYaw - leo.headG.rotation.y) * k;
    leo.headG.rotation.x += (targetPitch - leo.headG.rotation.x) * k;
  }

  // tail tuft secondary swing
  if (leo.tailTuft) {
    leo.tailTuft.rotation.x = Math.sin(t * 5 + 0.4) * 0.45;
    leo.tailTuft.rotation.z = Math.sin(t * 4 + 1.0) * 0.22;
  }

  // ear twitches — rare, in bursts
  state.earT = (state.earT || 0) + dt;
  state.earThreshold = state.earThreshold ?? (3 + Math.random() * 3);
  state.earTwitch = state.earTwitch || 0;
  if (state.earT > state.earThreshold) {
    state.earT = 0;
    state.earThreshold = 3 + Math.random() * 3;
    state.earTwitch = 0.45;
  }
  state.earTwitch = Math.max(0, state.earTwitch - dt);
  if (leo.ears) {
    const t1 = state.earTwitch > 0 ? Math.sin(state.earTwitch * 28) * 0.22 : 0;
    leo.ears.L.rotation.x = t1 * 0.7;
    leo.ears.R.rotation.x = t1 * 0.5;
    leo.ears.L.rotation.z = leo.ears.L.userData.baseRotZ + t1 * 0.15;
    leo.ears.R.rotation.z = leo.ears.R.userData.baseRotZ - t1 * 0.15;
  }

  // brow micro-raise (gives the smile a happy lift)
  if (leo.brows) {
    const raise = 0.005 + Math.sin(t * 0.7) * 0.012 * lookStrength;
    leo.brows.L.position.y = raise;
    leo.brows.R.position.y = raise;
  }

  // dust puff at a paw when trotting briskly
  state.dustT = (state.dustT || 0) + dt;
  if (state.dustPool && state.dustT > 0.24 && (state.smoothSpeed || 0) > 0.4) {
    state.dustT = 0;
    const keys = ['FL', 'FR', 'BL', 'BR'];
    const k = keys[Math.floor(Math.random() * 4)];
    const wp = new THREE.Vector3();
    leo.legs[k].getWorldPosition(wp);
    wp.y = leo.root.position.y + (leo.pawOffset ?? 0.198) + 0.02;
    state.dustPool.spawn(wp);
  }
}

function animateElephant(elephant, dt, t, opts = {}) {
  const ud = elephant.userData;
  if (!ud) return;
  // breathing — body scales, head bobs
  const breath = 1 + Math.sin(t * 1.3) * 0.018;
  ud.bodyG.scale.setScalar(breath);
  ud.headG.position.y = Math.sin(t * 1.3 + 0.4) * 0.022;

  // Drinking cycle (lakeside variant): trunk dips down to water, holds,
  // lifts back up. Bell-shaped curve over a 4.5s cycle.
  let dipEase = 0;
  if (ud.drinking) {
    const period = 4.5;
    const phase = (t / period) % 1;
    const norm = Math.sin(phase * Math.PI);
    dipEase = norm * norm * (3 - 2 * norm); // smoothstep on the bell
  }

  // Trunk wave propagates down segments. When dipping, the wave attenuates
  // and each segment gains a forward bend to follow the curl. Curl is
  // tuned aggressively so the trunk reaches the water even from an
  // elephant standing back from the rim.
  const segBend = dipEase * 0.24;
  const waveAttn = 1 - dipEase * 0.6;
  for (let i = 1; i < ud.trunkSegs.length; i++) {
    const phase = t * 1.7 - i * 0.55;
    ud.trunkSegs[i].rotation.x = Math.sin(phase) * 0.16 * waveAttn + segBend;
    ud.trunkSegs[i].rotation.y = Math.sin(phase * 0.7) * 0.06 * waveAttn;
  }
  // Whole-trunk pivot rotates forward so the chain swings down.
  if (ud.trunkRoot) ud.trunkRoot.rotation.x = dipEase * 0.95;
  // Head dips and reaches forward; the elephant looks like it's stooping
  // to the water.
  if (ud.drinking) ud.headG.rotation.x = dipEase * 0.38;

  // ears flap gently (slightly slower while drinking — focused look)
  const flapRate = ud.drinking ? 0.85 : 1.15;
  const flap = Math.sin(t * flapRate) * 0.09;
  ud.earL.rotation.z = ud.earL.userData.baseRotZ + flap;
  ud.earR.rotation.z = ud.earR.userData.baseRotZ - flap;

  // blink
  ud.blinkT += dt;
  if (ud.blinkT > 3.0 + Math.random() * 2.0) ud.blinkT = -0.16;
  const blink = ud.blinkT < 0 ? 0.08 : 1.0;
  ud.eyes.forEach(e => {
    e.white.scale.y = 1.0 * blink + (1 - blink) * 0.05;
    e.pupil.scale.y = blink;
  });

  // Spawn a ripple at the trunk tip whenever it just plunged below water.
  if (ud.drinking && opts.drinkingFX) {
    ud.lastDipEase = ud.lastDipEase ?? 0;
    if (dipEase > 0.78 && ud.lastDipEase <= 0.78) {
      const tip = new THREE.Vector3();
      const lastSeg = ud.trunkSegs[ud.trunkSegs.length - 1];
      lastSeg.getWorldPosition(tip);
      const waterY = _groundAt(tip.x, tip.z).y + 0.045;
      opts.drinkingFX.spawn(tip.x, waterY, tip.z);
    }
    ud.lastDipEase = dipEase;
  }
}

// Ripple pool for the lakeside-drinking elephant variant.
function buildElephantDrinkingFX(scene, mat) {
  const POOL = 5;
  const ripples = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.08, 30), mat('#fbfaf6'));
    m.rotation.x = -Math.PI / 2;
    m.material.transparent = true;
    m.material.opacity = 0;
    m.material.side = THREE.DoubleSide;
    m.visible = false;
    scene.add(m);
    ripples.push({ mesh: m, life: 0 });
  }
  function spawn(x, y, z) {
    const free = ripples.find(r => r.life <= 0);
    if (!free) return;
    free.mesh.position.set(x, y, z);
    free.mesh.scale.setScalar(1);
    free.mesh.visible = true;
    free.life = 1.6;
  }
  function update(dt) {
    ripples.forEach(r => {
      if (r.life > 0) {
        r.life -= dt;
        const u = 1 - r.life / 1.6;
        r.mesh.scale.setScalar(1 + u * 14);
        r.mesh.material.opacity = (1 - u) * 0.7;
        if (r.life <= 0) {
          r.mesh.visible = false;
          r.mesh.material.opacity = 0;
        }
      }
    });
  }
  return { spawn, update };
}

// Pollen motes drifting in lazy circles, golden petals falling and looping,
// birds gliding overhead, and a small pool of dust puffs the lion fires off
// as he walks.
function buildStorybookAmbient(scene, mat, opts = {}) {
  const rng = _mulberry32(0xBADA55);
  const enable = {
    pollen: opts.pollen !== false,
    petals: opts.petals !== false,
    birds: opts.birds !== false,
  };

  // pollen — small near-white spheres that orbit a private centre
  const pollenG = new THREE.Group();
  scene.add(pollenG);
  const pollen = [];
  if (enable.pollen) {
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mat('#fbfaf6'));
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

  // birds — small silhouettes flying lazy loops above the habitat
  function makeBird(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(color));
    body.scale.set(1, 0.8, 1.7);
    body.castShadow = true;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), mat(color));
    tail.position.set(0, 0, 0.18);
    tail.rotation.x = Math.PI / 2;
    g.add(tail);
    // wings — pivot groups so they flap from the shoulder
    const wL = new THREE.Group();
    g.add(wL);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.2), mat(color));
    wingL.geometry.translate(0.18, 0, 0);
    wL.add(wingL);
    const wR = new THREE.Group();
    g.add(wR);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.2), mat(color));
    wingR.geometry.translate(-0.18, 0, 0);
    wR.add(wingR);
    g.userData = { wL, wR };
    return g;
  }
  const birdCols = opts.birdCols || ['#3a2818', '#5a3a28', '#2a1f14'];
  const perchedBirdCols = opts.perchedBirdCols || birdCols;
  const birds = [];
  if (enable.birds) {
    for (let i = 0; i < 3; i++) {
      const b = makeBird(birdCols[i % birdCols.length]);
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

  // Perched singing birds — sit on tree tops, bob heads, emit notes.
  // Tree positions mirror buildClayWorld exactly (same 6 trees, 3 chosen).
  // From the screenshot, the 3 visible/circled trees are:
  //   [4.5, -3.2, 1.3]  — front-right large tree
  //   [-5.8, -1.6, 1.1] — left tree near the elephant
  //   [5.6, 2.8, 0.85]  — right tree above the lake
  const PERCH_TREES = [[4.5, -3.2, 1.3], [-5.8, -1.6, 1.1], [5.6, 2.8, 0.85]];
  // Tree top formula (from buildClayWorld's tree() builder):
  //   trunk+puffs local top ≈ (2.05+0.55)*scale above group base
  //   group base = gY(x,z) - 0.2
  //   → world top = gY(x,z) + 2.6 * scale
  // Sit the bird just above that crown.
  function makePerchedBird(col) {
    const g = new THREE.Group();
    // body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat(col));
    body.scale.set(1, 0.85, 1.55); body.castShadow = true; g.add(body);
    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(col));
    head.position.set(0, 0.18, -0.3); head.castShadow = true; g.add(head);
    // beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), mat('#c8a050'));
    beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.16, -0.54); g.add(beak);
    // white breast patch
    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat('#fbfaf6'));
    breast.position.set(0, 0.0, -0.22); breast.scale.set(0.7, 0.8, 0.45); g.add(breast);
    // eye dot
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat('#1a0e08'));
    eye.position.set(0.085, 0.22, -0.44); g.add(eye);
    // tiny feet
    for (let s = -1; s <= 1; s += 2) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5), mat('#c8a050'));
      foot.position.set(s * 0.1, -0.22, 0.05); foot.rotation.z = s * 0.3; g.add(foot);
    }
    return { group: g, head };
  }
  // Musical note mesh: a solid sphere (note head) + thin cylinder (stem).
  // Uses toon material so it fits the clay world palette.
  const NOTE_COL = '#4a4070';
  function makeNoteMesh() {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), mat(NOTE_COL));
    head.scale.set(1.1, 0.82, 0.6);
    g.add(head);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), mat(NOTE_COL));
    stem.position.set(0.07, 0.13, 0);
    g.add(stem);
    const flag = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(NOTE_COL));
    flag.position.set(0.1, 0.21, 0); flag.scale.set(0.7, 0.55, 0.4);
    g.add(flag);
    g.visible = false;
    return g;
  }

  const perchedBirds = [];
  const notePool = [];
  const NOTE_POOL = 18;
  for (let i = 0; i < NOTE_POOL; i++) {
    const m = makeNoteMesh();
    scene.add(m);
    notePool.push({ mesh: m, life: 0, baseX: 0, baseY: 0, baseZ: 0, drift: 0 });
  }
  function spawnNote(x, y, z) {
    const free = notePool.find(n => n.life <= 0);
    if (!free) return;
    free.baseX = x; free.baseY = y; free.baseZ = z;
    free.drift = (Math.random() - 0.5) * 0.8;
    free.mesh.position.set(x, y, z);
    free.mesh.rotation.y = Math.random() * Math.PI * 2;
    free.mesh.visible = true;
    // set all child materials opaque — fade handled via scale
    free.mesh.scale.setScalar(0.01);
    free.life = 2.8;
  }
  if (enable.birds) {
    PERCH_TREES.forEach(([tx, tz, ts], idx) => {
      const perchY = _groundAt(tx, tz).y + 2.65 * ts;
      const { group: perchG, head } = makePerchedBird(perchedBirdCols[idx % perchedBirdCols.length]);
      perchG.position.set(tx, perchY, tz);
      perchG.rotation.y = Math.PI * 0.3 * idx;
      scene.add(perchG);
      perchedBirds.push({
        obj: perchG, head,
        phase: rng() * Math.PI * 2,
        noteTimer: 0.5 + rng() * 1.5,
        perchX: tx, perchY, perchZ: tz,
      });
    });
  }

  // petals — drift down, loop back up
  const petalG = new THREE.Group();
  scene.add(petalG);
  const petalCols = ['#fae0a8', '#f0a8a0', '#fffbe8', '#f8c8d8'];
  const petals = [];
  if (enable.petals) {
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(petalCols[i % petalCols.length]));
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

  // dust puff pool — transparent toon spheres that bloom + fade
  const POOL = 10;
  const puffs = [];
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat('#e8d4b0'));
    m.material.transparent = true;
    m.material.opacity = 0;
    m.visible = false;
    scene.add(m);
    puffs.push({ mesh: m, life: 0 });
  }
  const dustPool = {
    spawn(pos) {
      const p = puffs.find(p => p.life <= 0);
      if (!p) return;
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(0.4);
      p.mesh.visible = true;
      p.life = 0.55;
    },
  };

  function update(dt, t) {
    pollen.forEach(p => {
      const a = t * p.speed + p.phase;
      p.mesh.position.set(
        p.cx + Math.cos(a) * p.radius,
        p.baseY + Math.sin(a * 1.3) * 0.5,
        p.cz + Math.sin(a) * p.radius,
      );
    });
    birds.forEach(b => {
      const a = t * b.speed + b.phase;
      b.obj.position.set(
        b.cx + Math.cos(a) * b.r,
        b.y + Math.sin(a * 1.5) * 0.45,
        b.cz + Math.sin(a) * b.r,
      );
      // face along the tangent of the circular path
      b.obj.rotation.y = -a;
      // slight bank into the turn
      b.obj.rotation.z = Math.sin(a) * 0.18;
      const flap = Math.sin(t * b.flapRate + b.phase) * 0.85;
      b.obj.userData.wL.rotation.z = flap;
      b.obj.userData.wR.rotation.z = -flap;
    });
    petals.forEach(p => {
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
    });
    notePool.forEach(n => {
      if (n.life > 0) {
        n.life -= dt;
        const elapsed = 2.8 - n.life;
        n.mesh.position.y = n.baseY + elapsed * 0.55;
        n.mesh.position.x = n.baseX + Math.sin(elapsed * 2.4 + n.drift) * 0.18;
        n.mesh.rotation.y += dt * 1.2;
        // grow in, hold, shrink out
        const fadeIn  = Math.min(1, elapsed / 0.18);
        const fadeOut = Math.min(1, n.life / 0.8);
        const s = 0.85 * fadeIn * fadeOut;
        n.mesh.scale.setScalar(Math.max(0.01, s));
        if (n.life <= 0) { n.mesh.visible = false; n.mesh.scale.setScalar(0.01); }
      }
    });
    perchedBirds.forEach(b => {
      b.head.rotation.x = Math.sin(t * 4.5 + b.phase) * 0.18;
      b.noteTimer -= dt;
      if (b.noteTimer <= 0) {
        b.noteTimer = 0.6 + Math.random() * 1.0;
        // burst of 2 notes per trigger
        spawnNote(b.perchX + (Math.random() - 0.5) * 0.25, b.perchY + 0.22, b.perchZ + (Math.random() - 0.5) * 0.25);
        spawnNote(b.perchX + (Math.random() - 0.5) * 0.25, b.perchY + 0.34, b.perchZ + (Math.random() - 0.5) * 0.25);
      }
    });
    puffs.forEach(p => {
      if (p.life > 0) {
        p.life -= dt;
        const u = Math.max(0, p.life / 0.55);
        const grow = 1 - u;
        p.mesh.scale.setScalar(0.4 + grow * 1.0);
        p.mesh.material.opacity = u * 0.5;
        p.mesh.position.y += dt * 0.22;
        if (p.life <= 0) {
          p.mesh.visible = false;
          p.mesh.material.opacity = 0;
        }
      }
    });
  }

  return { update, dustPool };
}

// === Style 1: Chibi Plushie =============================================
function buildLionChibi(mat) {
  const PAL = {
    body: '#fac978', light: '#fff0d4', mane: '#f0a85a', maneSoft: '#f8c896',
    eye: '#1a0e08', pink: '#f7adc0', blush: '#f7b5b5',
  };
  const g = new THREE.Group();
  const torso = new THREE.Group();
  g.add(torso);

  // tiny body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 18), mat(PAL.body));
  body.scale.set(1.05, 0.85, 1.15);
  body.position.y = 0.85;
  body.castShadow = true;
  torso.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), mat(PAL.light));
  belly.scale.set(0.9, 0.6, 0.95);
  belly.position.set(0, 0.65, 0.1);
  torso.add(belly);

  // HUGE head
  const headG = new THREE.Group();
  headG.position.set(0, 1.45, -0.55);
  torso.add(headG);

  // mane — single big marshmallow puff with smaller sub-puffs
  const mane = new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 22), mat(PAL.mane));
  mane.position.set(0, 0, 0.05);
  mane.castShadow = true;
  headG.add(mane);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), mat(PAL.maneSoft));
    tuft.position.set(Math.cos(a) * 1.0, Math.sin(a) * 0.85, 0);
    headG.add(tuft);
  }
  // face plate
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.78, 26, 20), mat(PAL.body));
  face.scale.set(1.05, 1.0, 0.9);
  face.position.set(0, -0.02, -0.35);
  face.castShadow = true;
  headG.add(face);
  // muzzle (lighter)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), mat(PAL.light));
  muzzle.scale.set(1.05, 0.7, 0.85);
  muzzle.position.set(0, -0.25, -0.7);
  headG.add(muzzle);
  // blush cheeks
  [-0.42, 0.42].forEach(x => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(PAL.blush));
    blush.position.set(x, -0.18, -0.85);
    blush.scale.set(1, 0.6, 0.3);
    headG.add(blush);
  });
  // tiny pink heart-ish nose (2 small spheres + a point)
  const nose1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(PAL.pink));
  nose1.position.set(-0.05, -0.05, -1.05); headG.add(nose1);
  const nose2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(PAL.pink));
  nose2.position.set(0.05, -0.05, -1.05); headG.add(nose2);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(PAL.pink));
  noseTip.position.set(0, -0.13, -1.05); headG.add(noseTip);

  // mouth — small open smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI), mat('#3a1e10'));
  smile.position.set(0, -0.27, -1.08); smile.rotation.x = -0.2; headG.add(smile);

  // HUGE round eyes
  const eyes = [];
  [-0.25, 0.25].forEach(x => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), mat('#fbfaf6'));
    eyeWhite.position.set(x, 0.05, -0.78);
    eyeWhite.scale.set(0.95, 1.1, 0.6);
    headG.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), mat(PAL.eye));
    pupil.position.set(x, 0.03, -0.92);
    pupil.scale.set(0.9, 1.05, 0.4);
    headG.add(pupil);
    // shine highlights
    const shine1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#fbfaf6'));
    shine1.position.set(x + (x < 0 ? -0.04 : 0.04), 0.12, -1.02);
    shine1.scale.set(1, 1, 0.3);
    headG.add(shine1);
    const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#fbfaf6'));
    shine2.position.set(x - 0.05, -0.02, -1.02);
    shine2.scale.set(1, 1, 0.3);
    headG.add(shine2);
    eyes.push({ white: eyeWhite, pupil });
  });
  // ears - small rounded
  [-0.4, 0.4].forEach(x => {
    const ear = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(PAL.body));
    outer.scale.set(0.9, 1, 0.55);
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(PAL.pink));
    inner.position.set(0, 0, -0.06); inner.scale.set(0.7, 0.85, 0.4);
    ear.add(inner);
    ear.position.set(x, 0.7, 0.15);
    ear.rotation.z = x > 0 ? -0.2 : 0.2;
    headG.add(ear);
  });

  // stubby legs (small capsules)
  function leg(x, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.5, z);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 6, 10), mat(PAL.body));
    upper.position.y = -0.1; upper.castShadow = true;
    pivot.add(upper);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(PAL.body));
    paw.position.y = -0.22; paw.scale.set(1, 0.65, 1.1);
    paw.castShadow = true;
    pivot.add(paw);
    // beans
    for (let i = 0; i < 3; i++) {
      const bean = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(PAL.pink));
      bean.position.set(-0.06 + i * 0.06, -0.25, -0.13);
      pivot.add(bean);
    }
    torso.add(pivot);
    return pivot;
  }
  const legs = {
    FL: leg(-0.32, -0.55), FR: leg(0.32, -0.55),
    BL: leg(-0.32, 0.55), BR: leg(0.32, 0.55),
  };

  // tiny tail
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 1.0, 0.85);
  torso.add(tailRoot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 8), mat(PAL.body));
  tail.geometry.translate(0, 0.25, 0);
  tail.rotation.x = -Math.PI / 3;
  tailRoot.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), mat(PAL.mane));
  tuft.position.set(0, 0.45, 0);
  tail.add(tuft);

  return { root: g, torso, headG, legs, tailRoot, eyes, legBaseY: 0.5 };
}

function buildBunny(mat) {
  const PAL = { fur: '#f7f0e6', shadow: '#d4c8b8', pink: '#f0a3b0', eye: '#1a0e08' };
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mat(PAL.fur));
  body.scale.set(1, 1.1, 1.1);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), mat(PAL.fur));
  head.position.set(0, 0.95, -0.05);
  head.castShadow = true;
  g.add(head);
  // big floppy ears
  [-0.13, 0.13].forEach(x => {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 8, 12), mat(PAL.fur));
    ear.position.set(x, 1.45, -0.08);
    ear.rotation.z = x > 0 ? -0.15 : 0.15;
    ear.castShadow = true;
    g.add(ear);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.35, 6, 10), mat(PAL.pink));
    inner.position.set(x, 1.45, -0.15);
    inner.rotation.z = x > 0 ? -0.15 : 0.15;
    g.add(inner);
  });
  // tiny tail (pom-pom)
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), mat(PAL.fur));
  tail.position.set(0, 0.55, 0.5);
  g.add(tail);
  // eyes
  [-0.13, 0.13].forEach(x => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), mat(PAL.eye));
    e.position.set(x, 1.0, -0.32);
    g.add(e);
  });
  // pink nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(PAL.pink));
  nose.position.set(0, 0.88, -0.4);
  g.add(nose);
  // small feet
  [[-0.18, 0.3], [0.18, 0.3]].forEach(([x, z]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mat(PAL.fur));
    f.position.set(x, 0.18, z); f.scale.set(1, 0.55, 1.4);
    g.add(f);
  });
  return g;
}

// === Style 3: Sculptural Mascot =========================================
function buildLionMascot(mat) {
  const PAL = {
    body: '#e8893a', bodyDark: '#b8651e', light: '#f5be7a',
    mane: '#b8521a', maneDark: '#8a3a10', maneLight: '#d97432',
    eye: '#1a0e08', nose: '#2a1410',
  };
  const g = new THREE.Group();
  const torso = new THREE.Group();
  g.add(torso);

  // body — leaner, more rectangular
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 16), mat(PAL.body));
  body.scale.set(0.95, 0.95, 1.55);
  body.position.y = 1.0;
  body.castShadow = true;
  torso.add(body);
  // dorsal stripe
  const dorsal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6), mat(PAL.bodyDark));
  dorsal.rotation.x = Math.PI / 2;
  dorsal.position.set(0, 1.55, 0);
  dorsal.scale.set(1, 1, 0.7);
  torso.add(dorsal);
  // shoulder mass
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), mat(PAL.body));
  shoulder.position.set(0, 1.25, -0.7);
  shoulder.scale.set(1.15, 0.95, 1);
  torso.add(shoulder);
  // belly chevron
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), mat(PAL.light));
  belly.scale.set(0.7, 0.45, 1.2);
  belly.position.set(0, 0.7, 0.15);
  torso.add(belly);

  // head — angular, sculpted
  const headG = new THREE.Group();
  headG.position.set(0, 1.25, -1.5);
  torso.add(headG);

  // sun-ray mane — geometric cones around face
  const maneAnchor = new THREE.Group();
  maneAnchor.position.set(0, 0, 0.15);
  headG.add(maneAnchor);
  const NUM_RAYS = 14;
  for (let i = 0; i < NUM_RAYS; i++) {
    const a = (i / NUM_RAYS) * Math.PI * 2;
    const rayMat = mat(i % 2 === 0 ? PAL.mane : PAL.maneDark);
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), rayMat);
    ray.position.set(Math.cos(a) * 0.78, Math.sin(a) * 0.78, -0.1);
    ray.rotation.z = a - Math.PI / 2;
    ray.castShadow = true;
    maneAnchor.add(ray);
  }
  // inner mane ring (puffy backing)
  const innerMane = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), mat(PAL.maneLight));
  innerMane.position.set(0, 0, -0.05);
  innerMane.scale.set(1, 1, 0.7);
  maneAnchor.add(innerMane);

  // face — squared off
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.78, 0.85), mat(PAL.body));
  face.geometry = new THREE.BoxGeometry(0.9, 0.78, 0.85, 4, 4, 4);
  // soften: use sphere instead but flatter
  const face2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 16), mat(PAL.body));
  face2.scale.set(1.1, 0.95, 1);
  face2.position.set(0, -0.05, -0.4);
  face2.castShadow = true;
  headG.add(face2);

  // strong cheek shapes
  [-0.32, 0.32].forEach(x => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), mat(PAL.light));
    cheek.position.set(x, -0.18, -0.55);
    cheek.scale.set(1, 0.85, 0.7);
    headG.add(cheek);
  });

  // muzzle
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), mat(PAL.light));
  muzzle.scale.set(1, 0.7, 0.85);
  muzzle.position.set(0, -0.28, -0.7);
  headG.add(muzzle);
  // nose — wider
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(PAL.nose));
  nose.position.set(0, -0.18, -0.92);
  nose.scale.set(1.4, 0.85, 0.7);
  headG.add(nose);
  // strong mouth
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(PAL.nose));
  mouth.position.set(0, -0.38, -0.85);
  mouth.scale.set(1.6, 0.18, 0.5);
  headG.add(mouth);

  // heavy brow ridges
  [-0.22, 0.22].forEach(x => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.1), mat(PAL.bodyDark));
    brow.position.set(x, 0.12, -0.78);
    brow.rotation.z = x > 0 ? -0.3 : 0.3;
    headG.add(brow);
  });

  // almond eyes (squished/tilted spheres)
  const eyes = [];
  [-0.22, 0.22].forEach(x => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mat('#fbfaf6'));
    eyeWhite.position.set(x, 0.0, -0.72);
    eyeWhite.scale.set(0.95, 0.5, 0.3);
    eyeWhite.rotation.z = x > 0 ? -0.2 : 0.2;
    headG.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mat(PAL.eye));
    pupil.position.set(x, 0.0, -0.78);
    pupil.scale.set(0.9, 0.55, 0.3);
    pupil.rotation.z = x > 0 ? -0.2 : 0.2;
    headG.add(pupil);
    eyes.push({ white: eyeWhite, pupil });
  });

  // sculpted angular ears (cone-ish)
  [-0.35, 0.35].forEach(x => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 6), mat(PAL.body));
    ear.position.set(x, 0.5, 0.05);
    ear.rotation.z = x > 0 ? -0.3 : 0.3;
    ear.castShadow = true;
    headG.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), mat(PAL.nose));
    inner.position.set(x, 0.45, -0.02);
    inner.rotation.z = x > 0 ? -0.3 : 0.3;
    headG.add(inner);
  });

  // legs — bigger squarish paws
  function leg(x, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, z);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 6, 10), mat(PAL.body));
    upper.position.y = -0.22; upper.castShadow = true;
    pivot.add(upper);
    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.42), mat(PAL.bodyDark));
    paw.position.y = -0.48; paw.castShadow = true;
    pivot.add(paw);
    // claws (3 small triangles)
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 5), mat('#fbfaf6'));
      claw.position.set(-0.1 + i * 0.1, -0.52, -0.22);
      claw.rotation.x = Math.PI / 2;
      pivot.add(claw);
    }
    torso.add(pivot);
    return pivot;
  }
  const legs = {
    FL: leg(-0.45, -0.95), FR: leg(0.45, -0.95),
    BL: leg(-0.45, 0.95), BR: leg(0.45, 0.95),
  };

  // tail — longer, sculpted, with big petal-like tuft
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 1.15, 1.5);
  torso.add(tailRoot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 1.3, 10), mat(PAL.body));
  tail.geometry.translate(0, 0.65, 0);
  tail.rotation.x = -Math.PI / 3.2;
  tailRoot.add(tail);
  // mane-like tuft (4 mini cones)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 5), mat(PAL.mane));
    t.position.set(Math.cos(a) * 0.12, 1.25, Math.sin(a) * 0.12);
    t.rotation.z = a - Math.PI / 2;
    tail.add(t);
  }

  return { root: g, torso, headG, legs, tailRoot, eyes, legBaseY: 0.78 };
}

function buildGiraffe(mat) {
  const PAL = { body: '#f0c878', spot: '#a8632a', mane: '#6b3a1e', horn: '#3a2818', eye: '#1a0e08', hoof: '#3a2818' };
  const g = new THREE.Group();
  // body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 22, 16), mat(PAL.body));
  body.scale.set(1, 1, 1.55);
  body.position.y = 1.4;
  body.castShadow = true;
  g.add(body);
  // long neck
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.22 - t * 0.04, 14, 10), mat(PAL.body));
    seg.position.set(0, 1.6 + t * 1.4, -0.6 - t * 0.3);
    seg.castShadow = true;
    g.add(seg);
  }
  // small head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), mat(PAL.body));
  head.position.set(0, 3.1, -1.05);
  head.scale.set(1.1, 0.9, 1.4);
  head.castShadow = true;
  g.add(head);
  // muzzle
  const muzz = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat('#fbfaf6'));
  muzz.position.set(0, 3.0, -1.27);
  muzz.scale.set(1, 0.85, 1.1);
  g.add(muzz);
  // horns
  [-0.08, 0.08].forEach(x => {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.18, 8), mat(PAL.mane));
    horn.position.set(x, 3.32, -0.95);
    horn.castShadow = true;
    g.add(horn);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(PAL.horn));
    tip.position.set(x, 3.42, -0.95);
    g.add(tip);
  });
  // ears
  [-0.18, 0.18].forEach(x => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(PAL.body));
    ear.position.set(x, 3.2, -0.95);
    ear.scale.set(0.4, 0.85, 1);
    ear.rotation.z = x > 0 ? -0.6 : 0.6;
    g.add(ear);
  });
  // eyes
  [-0.1, 0.1].forEach(x => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(PAL.eye));
    e.position.set(x, 3.15, -1.18);
    g.add(e);
  });
  // mane along neck
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(PAL.mane));
    tuft.position.set(0, 1.65 + t * 1.45, -0.45 - t * 0.32);
    tuft.scale.set(0.6, 1.1, 0.8);
    g.add(tuft);
  }
  // legs
  const legGeo = new THREE.CapsuleGeometry(0.1, 1.0, 6, 10);
  [[-0.25, -0.5], [0.25, -0.5], [-0.25, 0.45], [0.25, 0.45]].forEach(([x, z]) => {
    const l = new THREE.Mesh(legGeo, mat(PAL.body));
    l.position.set(x, 0.6, z); l.castShadow = true;
    g.add(l);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(PAL.hoof));
    hoof.position.set(x, 0.08, z); hoof.scale.set(1, 0.5, 1.2);
    g.add(hoof);
  });
  // tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.5, 8), mat(PAL.body));
  tail.position.set(0, 1.4, 0.95); tail.rotation.x = 0.6; g.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(PAL.mane));
  tuft.position.set(0, 1.18, 1.18); g.add(tuft);

  // brown spots all over body & neck
  const spotMat = mat(PAL.spot);
  const spotPositions = [
    // body
    [0.35, 1.45, 0.2], [-0.35, 1.45, 0.2], [0.3, 1.55, -0.25], [-0.3, 1.55, -0.25],
    [0.45, 1.35, 0.55], [-0.45, 1.35, 0.55], [0, 1.85, 0], [0.3, 1.75, 0.4],
    [-0.3, 1.75, 0.4], [0.2, 1.3, 0.8], [-0.2, 1.3, 0.8],
    // neck
    [0.15, 2.0, -0.7], [-0.15, 2.0, -0.7], [0.1, 2.4, -0.9], [-0.1, 2.4, -0.9],
    [0.12, 2.7, -1.05], [-0.12, 2.7, -1.05],
    // legs
    [0.3, 0.85, -0.5], [-0.3, 0.85, -0.5], [0.3, 0.85, 0.45], [-0.3, 0.85, 0.45],
  ];
  spotPositions.forEach(([x, y, z]) => {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.04, 10, 8), spotMat);
    sp.position.set(x, y, z); sp.scale.set(1, 0.4, 1);
    g.add(sp);
  });
  return g;
}

// === Style 2: Storybook (refined fork of v2) ============================
function buildLionStorybook(mat) {
  const PAL = {
    lion: '#f0b558', light: '#fae0a8', shadow: '#d49340',
    mane: '#c97a3a', maneMid: '#b06628', maneDark: '#8a4a18', maneTip: '#fae0a8',
    eye: '#1f140c', nose: '#3a2218', pink: '#f0a8a0', blush: '#f4a3ad',
    white: '#fbfaf6',
  };
  const g = new THREE.Group();
  const torso = new THREE.Group();
  g.add(torso);

  // ---- body ----
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 28, 20), mat(PAL.lion));
  body.scale.set(1, 0.88, 1.5);
  body.position.y = 1.0;
  body.castShadow = true;
  torso.add(body);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), mat(PAL.shadow));
  back.scale.set(0.55, 0.5, 1.3);
  back.position.set(0, 1.35, 0.05);
  torso.add(back);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), mat(PAL.light));
  belly.scale.set(0.85, 0.55, 1.18);
  belly.position.set(0, 0.7, 0.1);
  torso.add(belly);

  // ---- mane: big puff + ring tufts + golden tips ----
  const maneAnchor = new THREE.Group();
  maneAnchor.position.set(0, 1.22, -1.05);
  torso.add(maneAnchor);
  const mane = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), mat(PAL.mane));
  mane.scale.set(1.05, 1.05, 0.9);
  mane.castShadow = true;
  maneAnchor.add(mane);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), mat(i % 2 === 0 ? PAL.maneMid : PAL.maneDark));
    tuft.position.set(Math.cos(a) * 1.02, Math.sin(a) * 0.78, -0.1);
    tuft.scale.set(1, 1, 0.7);
    tuft.castShadow = true;
    maneAnchor.add(tuft);
  }
  // golden tips on the top tufts catch the key light
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 6 + (i / 4) * (Math.PI * 1.3);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(PAL.maneTip));
    tip.position.set(Math.cos(a) * 1.04, Math.sin(a) * 0.82 + 0.04, 0.02);
    tip.scale.set(0.85, 0.85, 0.55);
    maneAnchor.add(tip);
  }
  // back-of-cheek wisps
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI - Math.PI / 2;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat(PAL.maneMid));
    tuft.position.set(Math.cos(a) * 0.7, 0.05 + Math.sin(a) * 0.5, 0.25);
    maneAnchor.add(tuft);
  }

  // ---- head ----
  const headG = new THREE.Group();
  headG.position.set(0, 1.22, -1.5);
  torso.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 18), mat(PAL.lion));
  head.scale.set(1.05, 0.95, 1);
  head.castShadow = true;
  headG.add(head);
  // cheeks
  [-0.36, 0.36].forEach(x => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat(PAL.light));
    cheek.position.set(x, -0.1, -0.35);
    headG.add(cheek);
  });
  // pink blush dots
  [-0.34, 0.34].forEach(x => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(PAL.blush));
    blush.position.set(x, -0.12, -0.52);
    blush.scale.set(1, 0.55, 0.25);
    headG.add(blush);
  });
  // muzzle
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), mat(PAL.light));
  muzzle.position.set(0, -0.18, -0.5);
  muzzle.scale.set(1, 0.75, 0.9);
  headG.add(muzzle);
  // nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(PAL.nose));
  nose.position.set(0, -0.08, -0.78);
  nose.scale.set(1.2, 0.85, 0.8);
  headG.add(nose);
  // curved U-shaped smile (half-torus, flipped so the arc opens upward)
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 18, Math.PI), mat(PAL.nose));
  smile.position.set(0, -0.27, -0.82);
  smile.rotation.z = Math.PI;
  headG.add(smile);

  // ---- ears (groups so they can twitch) ----
  const earL = new THREE.Group();
  const earR = new THREE.Group();
  [{ x: -0.3, group: earL }, { x: 0.3, group: earR }].forEach(({ x, group: ear }) => {
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(PAL.lion));
    outer.scale.set(0.85, 1.1, 0.5);
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(PAL.pink));
    inner.position.set(0, -0.02, -0.05);
    inner.scale.set(0.7, 0.9, 0.4);
    ear.add(inner);
    ear.position.set(x, 0.42, 0.05);
    ear.userData.baseRotZ = x > 0 ? -0.15 : 0.15;
    ear.rotation.z = ear.userData.baseRotZ;
    headG.add(ear);
  });

  // ---- brows (groups so they can raise) ----
  const browL = new THREE.Group();
  const browR = new THREE.Group();
  [{ x: -0.22, group: browL }, { x: 0.22, group: browR }].forEach(({ x, group: brow }) => {
    const browMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(PAL.shadow));
    browMesh.position.set(x, 0.18, -0.52);
    browMesh.scale.set(1.2, 0.4, 0.4);
    browMesh.rotation.z = x > 0 ? -0.4 : 0.4;
    brow.add(browMesh);
    headG.add(brow);
  });

  // ---- eyes (pupil + shines in a group so they can track) ----
  const eyes = [];
  [-0.22, 0.22].forEach(x => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mat(PAL.white));
    eyeWhite.position.set(x, 0.06, -0.52);
    eyeWhite.scale.set(0.85, 1, 0.3);
    headG.add(eyeWhite);

    const pupilG = new THREE.Group();
    pupilG.position.set(x, 0.06, -0.58);
    headG.add(pupilG);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(PAL.eye));
    pupil.scale.set(0.85, 1, 0.6);
    pupilG.add(pupil);
    // big highlight (upper-outer)
    const shine1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat(PAL.white));
    shine1.position.set(x > 0 ? 0.022 : -0.022, 0.028, -0.045);
    shine1.scale.set(1, 1, 0.4);
    pupilG.add(shine1);
    // tiny highlight (lower-inner)
    const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(PAL.white));
    shine2.position.set(x > 0 ? -0.018 : 0.018, -0.022, -0.045);
    pupilG.add(shine2);

    eyes.push({ white: eyeWhite, pupil, pupilG, basePos: pupilG.position.clone() });
  });

  // ---- legs ----
  function leg(x, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, z);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.3, 6, 10), mat(PAL.lion));
    upper.position.y = -0.2; upper.castShadow = true;
    pivot.add(upper);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), mat(PAL.lion));
    paw.position.y = -0.45; paw.scale.set(1.05, 0.6, 1.15);
    paw.castShadow = true;
    pivot.add(paw);
    torso.add(pivot);
    return pivot;
  }
  const legs = {
    FL: leg(-0.45, -0.85), FR: leg(0.45, -0.85),
    BL: leg(-0.45, 0.85), BR: leg(0.45, 0.85),
  };

  // ---- tail (tuft in its own group for secondary motion) ----
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 1.15, 1.3);
  torso.add(tailRoot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.1, 10), mat(PAL.lion));
  tail.geometry.translate(0, 0.55, 0);
  tail.rotation.x = -Math.PI / 3;
  tailRoot.add(tail);
  const tailTuft = new THREE.Group();
  tailTuft.position.set(0, 0.6, 0);
  tail.add(tailTuft);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(PAL.mane));
  tailTuft.add(tuft);
  const tuftTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(PAL.maneTip));
  tuftTip.position.set(0, 0.14, 0);
  tailTuft.add(tuftTip);

  return {
    root: g, torso, headG, legs, tailRoot, eyes, legBaseY: 0.78,
    ears: { L: earL, R: earR },
    brows: { L: browL, R: browR },
    tailTuft, smile,
  };
}

function buildElephant(mat) {
  const PAL = { skin: '#c0b6cc', dark: '#857a98', pink: '#e8c0c8', eye: '#1f140c', white: '#fbfaf6' };
  const g = new THREE.Group();

  // body (in its own group so we can scale it for breathing)
  const bodyG = new THREE.Group();
  g.add(bodyG);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), mat(PAL.skin));
  body.scale.set(1.15, 1, 1.45);
  body.position.y = 1.0;
  body.castShadow = true;
  bodyG.add(body);

  // head (separate group)
  const headG = new THREE.Group();
  g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), mat(PAL.skin));
  head.position.set(0, 1.15, -1.0); head.castShadow = true; headG.add(head);

  // articulated trunk — segments parented so they can wave
  const trunkRoot = new THREE.Group();
  trunkRoot.position.set(0, 1.05, -1.42);
  headG.add(trunkRoot);
  const trunkSegs = [];
  let parent = trunkRoot;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group();
    if (i > 0) seg.position.set(0, -0.17, -0.15);
    parent.add(seg);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2 - i * 0.022, 12, 10), mat(PAL.skin));
    seg.add(m);
    trunkSegs.push(seg);
    parent = seg;
  }

  // ears (groups so they can flap)
  const earL = new THREE.Group();
  const earR = new THREE.Group();
  [{ x: -0.65, group: earL }, { x: 0.65, group: earR }].forEach(({ x, group: ear }) => {
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), mat(PAL.dark));
    outer.scale.set(0.28, 1.1, 1.1);
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat(PAL.pink));
    inner.position.set(-0.05 * (x > 0 ? 1 : -1), -0.05, 0.07);
    inner.scale.set(0.2, 0.8, 0.85);
    ear.add(inner);
    ear.position.set(x, 1.25, -0.85);
    ear.userData.baseRotZ = x > 0 ? -0.2 : 0.2;
    ear.rotation.z = ear.userData.baseRotZ;
    headG.add(ear);
  });

  // eyes (white + pupil for blink)
  const eyes = [];
  [-0.3, 0.3].forEach(x => {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(PAL.white));
    white.position.set(x, 1.25, -1.42);
    white.scale.set(0.85, 1, 0.4);
    headG.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(PAL.eye));
    pupil.position.set(x, 1.25, -1.47);
    headG.add(pupil);
    eyes.push({ white, pupil });
  });

  // tusks
  [-0.18, 0.18].forEach(x => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), mat(PAL.white));
    t.position.set(x, 0.85, -1.5);
    t.rotation.x = 0.6;
    headG.add(t);
  });

  // legs (stay on root group, not on body, so they don't breathe)
  const legGeo = new THREE.CapsuleGeometry(0.22, 0.4, 6, 10);
  [[-0.4, -0.55], [0.4, -0.55], [-0.4, 0.5], [0.4, 0.5]].forEach(([x, z]) => {
    const l = new THREE.Mesh(legGeo, mat(PAL.skin));
    l.position.set(x, 0.4, z); l.castShadow = true; g.add(l);
  });

  // tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mat(PAL.skin));
  tail.position.set(0, 1.0, 0.95); tail.rotation.x = 0.4; bodyG.add(tail);

  g.userData = { bodyG, headG, trunkRoot, trunkSegs, earL, earR, eyes, blinkT: 0 };
  return g;
}

// === React wrappers =====================================================
function makeClayStyle(buildLion, buildCompanion, companionPlacement, label) {
  return function ({ width, height }) {
    const buildScene = React.useCallback((canvas, w, h) => {
      const world = buildClayWorld(canvas, w, h);
      const leo = buildLion(world.mat);
      world.scene.add(leo.root);
      const companion = buildCompanion(world.mat);
      const [cx, , cz] = companionPlacement.pos;
      const cBaseY = _groundAt(cx, cz).y;
      companion.position.set(cx, cBaseY, cz);
      companion.rotation.y = companionPlacement.rotY;
      companion.scale.setScalar(companionPlacement.scale);
      world.scene.add(companion);

      const state = {};
      function update(dt, t) {
        world.updateWorld(dt, t);
        applyLionWalk(leo, world.lionCurve, dt, t, state);
        companion.position.y = cBaseY + Math.sin(t * 0.9) * 0.025;
      }
      return { ...world.host, update };
    }, []);

    return (
      <HabitatCanvas
        width={width} height={height}
        buildScene={buildScene}
        label={label}
        palette={{
          bg: '#cfe6f0',
          accent: '#e85a8a', accentText: '#fff',
          chipBg: 'rgba(255,255,255,0.9)', chipText: '#4a4070',
          chipShadow: '0 4px 14px rgba(70,60,110,0.18)',
          chipBlur: 'blur(8px)',
          ctaBg: '#e85a8a', ctaText: '#fff',
          ctaShadow: '0 8px 22px rgba(232,90,138,0.45)',
          tagBg: 'rgba(74,64,112,0.9)', tagText: '#fff',
        }}
      />
    );
  };
}

const ClayChibi = makeClayStyle(buildLionChibi, buildBunny,
  { pos: [-5.6, 0, -2.6], rotY: Math.PI / 2.6, scale: 1.2 },
  '1 · Chibi Plushie');

function ClayStorybookV2({ width, height, tweaks = {} }) {
  // Keep a live ref so per-frame reads (walk speed) see the latest values
  // without forcing a scene rebuild.
  const tweaksRef = React.useRef(tweaks);
  tweaksRef.current = tweaks;

  // Toggles that change the scene's structure rebuild via this key.
  const structKey = `${tweaks.pollen ? 1 : 0}-${tweaks.petals ? 1 : 0}-${tweaks.birds ? 1 : 0}`;

  const buildScene = React.useCallback((canvas, w, h) => {
    const cur = tweaksRef.current;
    const world = buildClayWorld(canvas, w, h);
    const leo = buildLionStorybook(world.mat);
    world.scene.add(leo.root);

    const elephant = buildElephant(world.mat);
    const cx = -5.6, cz = -2.6;
    const cBaseY = _groundAt(cx, cz).y;
    elephant.position.set(cx, cBaseY, cz);
    elephant.rotation.y = Math.PI / 2.6;
    elephant.scale.setScalar(0.9);
    world.scene.add(elephant);

    const ambient = buildStorybookAmbient(world.scene, world.mat, {
      pollen: cur.pollen, petals: cur.petals, birds: cur.birds,
    });
    const state = { dustPool: ambient.dustPool };

    function update(dt, t) {
      state.speedMul = tweaksRef.current.walkSpeed ?? 1;
      world.updateWorld(dt, t);
      applyLionWalk(leo, world.lionCurve, dt, t, state);
      applyStorybookLionExtras(leo, elephant, dt, t, state);
      animateElephant(elephant, dt, t);
      ambient.update(dt, t);
      elephant.position.y = cBaseY + Math.sin(t * 0.9) * 0.025;
    }
    return { ...world.host, update };
  }, [structKey]);

  return (
    <HabitatCanvas
      width={width} height={height}
      buildScene={buildScene}
      label="2 · Storybook"
      palette={{
        bg: '#cfe6f0',
        accent: '#e85a8a', accentText: '#fff',
        chipBg: 'rgba(255,255,255,0.9)', chipText: '#4a4070',
        chipShadow: '0 4px 14px rgba(70,60,110,0.18)',
        chipBlur: 'blur(8px)',
        ctaBg: '#e85a8a', ctaText: '#fff',
        ctaShadow: '0 8px 22px rgba(232,90,138,0.45)',
        tagBg: 'rgba(74,64,112,0.9)', tagText: '#fff',
      }}
    />
  );
}

const ClayMascot = makeClayStyle(buildLionMascot, buildGiraffe,
  { pos: [-5.6, 0, -2.6], rotY: Math.PI / 2.6, scale: 0.85 },
  '3 · Sculptural Mascot');

// === Level progression ==================================================
// Maps a level number to feature flags. Companion / cave / birds live
// outside buildClayWorld so they're handled in the component.
function featuresForLevel(level) {
  return {
    clouds:      true,           // sky is always present
    lake:        level >= 2,
    lilies:      level >= 2,
    path:        level >= 2,     // stones lead toward the lake area
    trees:       level >= 3,
    rocks:       level >= 3,
    flowers:     level >= 4,
    grass:       level >= 4,
    butterflies: level >= 4,
    mushrooms:   level >= 6,
    cave:        level >= 7,
    toy:         level >= 8,
  };
}

// Companions and other non-buildClayWorld scenery, layered by level.
const LEVEL_CONFIG = {
  showElephant: (lv) => lv >= 5,
  showCave:     (lv) => lv >= 7,
  showBirds:    (lv) => lv >= 9,
  // ambient is also gated
  showPollen:   (lv) => lv >= 4,
  showPetals:   (lv) => lv >= 3,
};

// Level-aware Storybook habitat. Defaults to Level 1 (just Leo on the mound).
function ClayHabitatLevel({ width, height, level = 1, tweaks = {}, companionMode = 'meadow', variant = 'default' }) {
  const tweaksRef = React.useRef(tweaks);
  tweaksRef.current = tweaks;

  // Rebuild scene when level changes (geometry differs) or any structural
  // tweak toggle flips. Walk-speed updates live via the ref.
  const structKey = `lv${level}-${tweaks.pollenOn ? 1 : 0}-${tweaks.petalsOn ? 1 : 0}-${tweaks.birdsOn ? 1 : 0}-${tweaks.lakeScale ?? 1.5}-${companionMode}-${variant}`;

  const buildScene = React.useCallback((canvas, w, h) => {
    const features = featuresForLevel(level);
    const skyOpts = variant === 'golden-hour' ? {
      top: '#e8844a', bot: '#f5c87a', fog: '#f5c87a', exposure: 1.18,
    } : {};
    const world = buildClayWorld(canvas, w, h, { features, lakeScale: tweaksRef.current.lakeScale, sky: skyOpts });
    const leo = buildLionStorybook(world.mat);
    world.scene.add(leo.root);

    let elephant = null;
    let drinkingFX = null;
    if (LEVEL_CONFIG.showElephant(level)) {
      elephant = buildElephant(world.mat);

      let ex, ez, eRotY;
      if (companionMode === 'lakeside') {
        // Place the elephant well out from the lake's southern rim — far
        // enough that he's clearly standing on the mound's outer slope.
        // The trunk's drinking arc is amplified to reach the water from
        // this distance.
        const lakeScale = tweaksRef.current.lakeScale ?? 1.5;
        const lakeRZ = 2.4 * lakeScale;
        const lakeX = -4.2, lakeZ = 3.4;
        ex = lakeX;
        ez = lakeZ - lakeRZ - 1.8;
        eRotY = Math.PI;
        drinkingFX = buildElephantDrinkingFX(world.scene, world.mat);
        elephant.userData.drinking = true;
      } else {
        ex = -5.6;
        ez = -2.6;
        eRotY = Math.PI / 2.6;
      }
      const cBaseY = _groundAt(ex, ez).y;
      elephant.position.set(ex, cBaseY, ez);
      elephant.userData.baseY = cBaseY;
      elephant.rotation.y = eRotY;
      elephant.scale.setScalar(0.9);
      world.scene.add(elephant);
    }

    // Ambient (pollen/petals/birds) is its own layer. We respect both the
    // level gating and any user tweak overrides (defaults to "on if unlocked").
    const cur = tweaksRef.current;
    const pollenOn = (cur.pollenOn ?? true) && LEVEL_CONFIG.showPollen(level);
    const petalsOn = (cur.petalsOn ?? true) && LEVEL_CONFIG.showPetals(level);
    const birdsOn  = (cur.birdsOn  ?? true) && LEVEL_CONFIG.showBirds(level);
    const ambientOpts = variant === 'golden-hour' ? {
      pollen: pollenOn, petals: petalsOn, birds: birdsOn,
      birdCols: ['#3a2818', '#5a3a28', '#2a1f14'],
      perchedBirdCols: ['#c83228', '#3a6abf', '#d4a020'],
    } : { pollen: pollenOn, petals: petalsOn, birds: birdsOn };
    const ambient = buildStorybookAmbient(world.scene, world.mat, ambientOpts);
    const state = { dustPool: ambient.dustPool };

    // Sleep cycle setup: compute cave anchor + spawn the bubble pool.
    // Only active for levels that have the cave (>= 7).
    let sleepBubbles = null;
    if (LEVEL_CONFIG.showCave(level)) {
      const caveX = -7.5, caveZ = 7.0;
      const caveYaw = Math.atan2(-caveX, -caveZ);
      // Pull Leo deep inside — root sits 1.5 units from cave centre so his
      // torso + body are fully inside, only the head + mane poke past the arch.
      const out = 1.5;
      const sleepX = caveX + Math.sin(caveYaw) * out;
      const sleepZ = caveZ + Math.cos(caveYaw) * out;
      const sleepY = _groundAt(sleepX, sleepZ).y - 0.198;
      state.caveAnchor = {
        x: sleepX, y: sleepY, z: sleepZ,
        yaw: caveYaw + Math.PI, // face out of cave — head toward entrance
      };
      sleepBubbles = buildSleepBubbles(world.scene);
      state.sleepBubbles = sleepBubbles;
    }

    function update(dt, t) {
      state.speedMul = tweaksRef.current.walkSpeed ?? 1;
      // Sleep cycle (only meaningful at L7+).
      if (LEVEL_CONFIG.showCave(level)) {
        const demoMode = !!tweaksRef.current.napDemo;
        state.demoT = (state.demoT || 0) + dt;
        const sleep = getSleepState(demoMode, state.demoT);
        state.wasSleeping = state.sleeping;
        state.sleeping = sleep.sleeping;
      } else {
        state.sleeping = false;
      }
      world.updateWorld(dt, t);
      applyLionWalk(leo, world.lionCurve, dt, t, state);
      applyStorybookLionExtras(leo, elephant, dt, t, state);
      if (elephant) {
        animateElephant(elephant, dt, t, { drinkingFX });
        elephant.position.y = elephant.userData.baseY + Math.sin(t * 0.9) * 0.025;
      }
      if (drinkingFX) drinkingFX.update(dt);
      if (sleepBubbles) sleepBubbles.update(dt);
      ambient.update(dt, t);
    }
    return { ...world.host, update };
  }, [structKey]);

  return (
    <HabitatCanvas
      width={width} height={height}
      buildScene={buildScene}
      label={`Level ${level} · ${LEVEL_TITLES[level] || 'Habitat'}${variant === 'golden-hour' ? ' · Golden Hour' : ''}`}
      hud={{
        streakText: HUD_STREAK[level] || `Day ${level} · ${level * 10} cards`,
        levelText:  `Habitat · Lv ${level}`,
        ctaText:    'Study 10 cards →',
      }}
      palette={variant === 'golden-hour' ? {
        bg: '#f5c87a',
        accent: '#c83228', accentText: '#fff',
        chipBg: 'rgba(255,248,220,0.92)', chipText: '#5a3010',
        chipShadow: '0 4px 14px rgba(180,100,30,0.22)',
        chipBlur: 'blur(8px)',
        ctaBg: '#c83228', ctaText: '#fff',
        ctaShadow: '0 8px 22px rgba(200,50,40,0.4)',
        tagBg: 'rgba(90,48,16,0.88)', tagText: '#fff',
      } : {
        bg: '#cfe6f0',
        accent: '#e85a8a', accentText: '#fff',
        chipBg: 'rgba(255,255,255,0.9)', chipText: '#4a4070',
        chipShadow: '0 4px 14px rgba(70,60,110,0.18)',
        chipBlur: 'blur(8px)',
        ctaBg: '#e85a8a', ctaText: '#fff',
        ctaShadow: '0 8px 22px rgba(232,90,138,0.45)',
        tagBg: 'rgba(74,64,112,0.9)', tagText: '#fff',
      }}
    />
  );
}

const LEVEL_TITLES = {
  1: 'A Quiet Start',
  2: 'The Lake',
  3: 'The Grove',
  4: 'In Bloom',
  5: 'A Visitor',
  6: 'Toadstools',
  7: 'Den & Dream',
  8: 'Playtime',
  9: 'Songbirds',
};
const HUD_STREAK = {
  1: 'Day 1 · just starting',
  2: 'Day 3 · 24 cards',
  3: 'Day 6 · 58 cards',
  4: 'Day 9 · 92 cards',
  5: 'Day 12 · 130 cards',
  6: 'Day 16 · 168 cards',
  7: 'Day 20 · 210 cards',
  8: 'Day 24 · 256 cards',
  9: 'Day 30 · 312 cards',
};

window.ClayChibi = ClayChibi;
window.ClayStorybookV2 = ClayStorybookV2;
window.ClayMascot = ClayMascot;
window.ClayHabitatLevel = ClayHabitatLevel;
