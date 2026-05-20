// habitat-voxel.jsx — Direction C: Pixel Voxel
// Chunky cubes only, retro-game vibe, top-down 3/4 view, saturated palette.

function buildVoxelHabitat(canvas, w, h) {
  const PALETTE = {
    sky: '#5ec3e8',
    grass: '#6fb04a',
    grassDark: '#4d8a2f',
    soil: '#9c6a3a',
    soilDark: '#6e4525',
    water: '#3b8ed8',
    waterTop: '#5fb0e8',
    lion: '#e8a23a',
    lionLight: '#f3c265',
    mane: '#b8531c',
    maneDark: '#7a3210',
    nose: '#2a1a14',
    leaf: '#5fa030',
    leafDark: '#3e7a1e',
    trunk: '#6e4525',
    bird: '#e0e0eb',
    birdDark: '#8a8aa0',
    birdBeak: '#f0a830',
    toyA: '#e94e3d',
    toyB: '#f3f0e8',
    stone: '#9a9a9a',
  };

  const host = buildSceneHost(canvas, w, h, {
    bg: PALETTE.sky, fog: PALETTE.sky, fogNear: 30, fogFar: 70,
    fov: 28, camDist: 14, camHeight: 11, lookY: 1, exposure: 1.0,
  });
  const { scene, renderer, camera } = host;

  // crunchy pixel-perfect look: no smooth normals
  const cubeMat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // --- LIGHTS ---
  const sun = new THREE.DirectionalLight('#ffffff', 1.5);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.bias = -0.001;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#bde8ff', '#6e4525', 0.55));
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));

  // helper: place a voxel at integer-ish grid pos
  const U = 0.5; // unit cube edge
  function voxel(x, y, z, color, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(U, U, U), cubeMat(color));
    m.position.set(x * U, y * U + U / 2, z * U);
    m.castShadow = opts.castShadow !== false;
    m.receiveShadow = true;
    return m;
  }

  // --- TERRAIN: stepped voxel island ---
  // top grass layer (squarish blob)
  const grid = [];
  const R = 7;
  for (let x = -R; x <= R; x++) {
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z);
      if (d < R - 0.6 + Math.sin(x * 0.7) * 0.4 + Math.cos(z * 0.6) * 0.4) {
        grid.push([x, z]);
      }
    }
  }
  grid.forEach(([x, z]) => {
    const v = voxel(x, 0, z, PALETTE.grass);
    scene.add(v);
    // soil column underneath
    for (let dy = -1; dy >= -3; dy--) {
      const u = voxel(x, dy, z, dy === -1 ? PALETTE.soil : PALETTE.soilDark, { castShadow: false });
      scene.add(u);
    }
  });
  // some grass-tone variation
  const variant = new Set();
  for (let i = 0; i < 18; i++) {
    const pick = grid[Math.floor(Math.random() * grid.length)];
    variant.add(pick.join(','));
  }
  scene.traverse(() => {}); // noop

  // --- LAKE (carved out + water cubes) ---
  const lakeCells = [
    [-5, 2], [-4, 2], [-3, 2], [-5, 3], [-4, 3], [-3, 3], [-4, 4], [-5, 4], [-6, 3],
  ];
  lakeCells.forEach(([x, z]) => {
    const w1 = voxel(x, 0, z, PALETTE.waterTop);
    w1.position.y -= U * 0.25;
    scene.add(w1);
  });

  // --- TREES (3 voxel trees) ---
  function voxelTree(cx, cz) {
    const g = new THREE.Group();
    // trunk
    for (let i = 1; i <= 3; i++) g.add(voxel(0, i, 0, PALETTE.trunk));
    // canopy 3x3x2 with corners chipped
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        for (let y = 4; y <= 5; y++) {
          if (Math.abs(x) === 1 && Math.abs(z) === 1 && y === 5) continue;
          const c = (x + z + y) % 2 === 0 ? PALETTE.leaf : PALETTE.leafDark;
          g.add(voxel(x, y, z, c));
        }
      }
    }
    g.add(voxel(0, 6, 0, PALETTE.leaf));
    g.position.set(cx * U, 0, cz * U);
    return g;
  }
  scene.add(voxelTree(4, -3));
  scene.add(voxelTree(-2, -5));
  scene.add(voxelTree(5, 4));

  // --- LION (voxel) ---
  function voxLion() {
    const g = new THREE.Group();
    // body 3 long x 2 tall x 2 wide
    const body = [
      // y=1 (legs height base)
      [-1, 1, 0], [0, 1, 0], [1, 1, 0], [-1, 1, 1], [0, 1, 1], [1, 1, 1],
      // y=2 (upper body)
      [-1, 2, 0], [0, 2, 0], [1, 2, 0], [-1, 2, 1], [0, 2, 1], [1, 2, 1],
    ];
    body.forEach(([x, y, z]) => g.add(voxel(x, y, z, PALETTE.lion)));
    // belly lighter band
    [[-1, 1, 0.5], [0, 1, 0.5], [1, 1, 0.5]].forEach(([x, y, z]) => {
      const m = voxel(x, y, z, PALETTE.lionLight);
      m.scale.set(1, 0.5, 1);
      m.position.y -= U * 0.25;
      g.add(m);
    });
    // legs (4 small cubes hanging below)
    [[-1, 0, 0], [1, 0, 0], [-1, 0, 1], [1, 0, 1]].forEach(([x, y, z]) => {
      const l = voxel(x, y, z, PALETTE.lion);
      l.scale.set(0.7, 1, 0.7);
      g.add(l);
    });

    // mane - ring of cubes around neck
    const head_x = 2;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = 1; dy <= 3; dy++) {
        for (let dz = 0; dz <= 1; dz++) {
          if (dx === 0 && dy === 2 && dz === 0) continue; // hole for head
          const isEdge = Math.abs(dx) === 1 || dy === 1 || dy === 3 || dz === 0 || dz === 1;
          if (!isEdge) continue;
          const c = (dx + dy + dz) % 2 === 0 ? PALETTE.mane : PALETTE.maneDark;
          g.add(voxel(head_x + dx - 1, dy, dz, c));
        }
      }
    }

    // head: 2x2x2
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = 2; dy <= 3; dy++) {
        for (let dz = 0; dz <= 1; dz++) {
          g.add(voxel(2 + dx, dy, dz, PALETTE.lion));
        }
      }
    }
    // muzzle
    g.add(voxel(4, 2, 0, PALETTE.lionLight));
    g.add(voxel(4, 2, 1, PALETTE.lionLight));
    // nose
    const nose = voxel(4.5, 2.5, 0.5, PALETTE.nose);
    nose.scale.setScalar(0.4);
    g.add(nose);
    // eyes
    [[3.5, 3.2, -0.05], [3.5, 3.2, 1.05]].forEach(([x, y, z]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(U * 0.25, U * 0.25, U * 0.1), cubeMat(PALETTE.nose));
      e.position.set(x * U, y * U, z * U);
      g.add(e);
    });
    // ears
    g.add(voxel(2, 4, 0, PALETTE.lion));
    g.add(voxel(2, 4, 1, PALETTE.lion));
    // tail
    g.add(voxel(-2, 2, 0.5, PALETTE.lion));
    const tailTuft = voxel(-2.5, 2.5, 0.5, PALETTE.mane);
    tailTuft.scale.setScalar(0.7);
    g.add(tailTuft);

    return g;
  }
  const leo = voxLion();
  leo.position.set(-1, 0, -0.5);
  leo.rotation.y = -Math.PI / 6;
  scene.add(leo);

  // --- BIRD FRIEND (small voxel bird perched on grass) ---
  function bird() {
    const g = new THREE.Group();
    // body
    g.add(voxel(0, 1, 0, PALETTE.bird));
    g.add(voxel(0, 1, 1, PALETTE.bird));
    // head
    g.add(voxel(1, 2, 0, PALETTE.bird));
    g.add(voxel(1, 2, 1, PALETTE.bird));
    // wings
    const w = voxel(0, 2, -0.5, PALETTE.birdDark);
    w.scale.set(1, 0.5, 0.5);
    g.add(w);
    const w2 = voxel(0, 2, 1.5, PALETTE.birdDark);
    w2.scale.set(1, 0.5, 0.5);
    g.add(w2);
    // beak
    const beak = voxel(2, 2, 0.5, PALETTE.birdBeak);
    beak.scale.set(0.4, 0.4, 0.4);
    g.add(beak);
    // tail
    const t = voxel(-1, 1.5, 0.5, PALETTE.birdDark);
    t.scale.set(1, 0.5, 1);
    g.add(t);
    return g;
  }
  const b = bird();
  b.position.set(3 * U, 0, 1 * U);
  b.rotation.y = Math.PI / 2;
  scene.add(b);

  // --- TOY (ball of yarn — alternating cubes) ---
  const toyG = new THREE.Group();
  const positions = [
    [0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1],
    [0, 1, 0], [1, 1, 0], [0, 1, 1], [1, 1, 1],
  ];
  positions.forEach(([x, y, z], i) => {
    const c = i % 2 === 0 ? PALETTE.toyA : PALETTE.toyB;
    const cube = voxel(x, y, z, c);
    cube.scale.setScalar(0.65);
    toyG.add(cube);
  });
  toyG.position.set(3 * U, 0, -3 * U);
  scene.add(toyG);

  // --- STONES (decor) ---
  [[2, 0, -1], [-3, 0, 4], [4, 0, 1]].forEach(([x, y, z]) => {
    const s = voxel(x, y, z, PALETTE.stone);
    s.scale.set(0.8, 0.5, 0.8);
    s.position.y = U * 0.25;
    scene.add(s);
  });

  // --- ANIM ---
  function update(dt, t) {
    leo.position.y = (Math.floor(Math.sin(t * 2) * 2) / 6); // chunky hop
    b.position.y = 0 + Math.abs(Math.sin(t * 3)) * 0.15;
    toyG.rotation.y = Math.floor(t * 2) / 2; // snap rotate (8-bit feel)
    // water wobble: shift water cubes
    lakeCells.forEach((c, i) => {
      const child = scene.children.find(o => o.position.x === c[0] * U && o.position.z === c[1] * U && Math.abs(o.position.y + U * 0.25) < 0.1);
    });
  }

  return { ...host, update };
}

function VoxelHabitat({ width, height }) {
  return (
    <HabitatCanvas
      width={width} height={height}
      buildScene={buildVoxelHabitat}
      label="C · Pixel Voxel"
      palette={{
        bg: '#5ec3e8',
        accent: '#e94e3d', accentText: '#fff',
        chipBg: '#fff', chipText: '#1a1a2a',
        chipShadow: '4px 4px 0 rgba(0,0,0,0.25)',
        ctaBg: '#1a1a2a', ctaText: '#f3f0e8',
        ctaShadow: '4px 4px 0 rgba(0,0,0,0.3)',
        tagBg: '#1a1a2a', tagText: '#5ec3e8',
      }}
    />
  );
}

window.VoxelHabitat = VoxelHabitat;
