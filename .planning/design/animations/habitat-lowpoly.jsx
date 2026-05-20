// habitat-lowpoly.jsx — Direction A: Low-poly savanna diorama
// Flat-shaded geometry, sunset palette, faceted everything.

function buildLowPolyHabitat(canvas, w, h) {
  const PALETTE = {
    sky: '#f5c98a',
    fog: '#f0b572',
    ground: '#d68a4b',
    groundDark: '#a8623a',
    grass: '#7e8f3f',
    grassDark: '#5e6b2d',
    water: '#5cb6c4',
    waterDeep: '#3a8a98',
    lion: '#e8a85a',
    lionBelly: '#f4d39a',
    mane: '#a85c2a',
    maneDark: '#7a3f1c',
    treeFol: '#7e8f3f',
    treeTrunk: '#5a3a22',
    zebra: '#f4ecd9',
    zebraDark: '#2a2520',
    toy: '#d94a52',
    rock: '#8a7a6a',
  };

  const host = buildSceneHost(canvas, w, h, {
    bg: PALETTE.sky, fog: PALETTE.fog, fogNear: 22, fogFar: 42,
    fov: 30, camDist: 13, camHeight: 9, lookY: 1, exposure: 1.05,
  });
  const { scene, renderer, camera } = host;

  // --- LIGHTS ---
  const sun = new THREE.DirectionalLight('#ffd9a8', 2.2);
  sun.position.set(8, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.001;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#ffd9a8', '#553322', 0.55));
  scene.add(new THREE.AmbientLight('#ffffff', 0.15));

  // --- ISLAND BASE ---
  const island = new THREE.Group();
  // top disc (savanna)
  const top = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.6, 12), flat(PALETTE.ground));
  top.position.y = 0;
  top.receiveShadow = true; top.castShadow = true;
  island.add(top);
  // grass tuft patches scattered
  const grassMat = flat(PALETTE.grass);
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * 5.6;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.18 + Math.random() * 0.15, 0.3 + Math.random() * 0.2, 5), grassMat);
    tuft.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
    tuft.rotation.y = Math.random() * Math.PI;
    tuft.castShadow = true;
    island.add(tuft);
  }
  // bottom inverse cone (floating-island vibe)
  const base = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 12), flat(PALETTE.groundDark));
  base.position.y = -2.2;
  base.rotation.y = Math.PI / 12;
  island.add(base);
  scene.add(island);

  // --- LAKE ---
  const lake = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.9, 10), flat(PALETTE.water));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-2.8, 0.32, 2.2);
  water.receiveShadow = true;
  lake.add(water);
  // rim of rocks
  const rockMat = flat(PALETTE.rock);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.18, 0), rockMat);
    rk.position.set(-2.8 + Math.cos(a) * 2.1, 0.25, 2.2 + Math.sin(a) * 2.1);
    rk.rotation.set(Math.random(), Math.random(), Math.random());
    rk.castShadow = true; rk.receiveShadow = true;
    lake.add(rk);
  }
  scene.add(lake);

  // --- ACACIA TREE ---
  function acacia(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * scale, 0.22 * scale, 1.6 * scale, 6), flat(PALETTE.treeTrunk));
    trunk.position.y = 0.8 * scale + 0.3;
    trunk.castShadow = true;
    g.add(trunk);
    const canopy1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * scale, 0), flat(PALETTE.treeFol));
    canopy1.position.y = 1.9 * scale + 0.3;
    canopy1.scale.y = 0.45;
    canopy1.castShadow = true;
    g.add(canopy1);
    const canopy2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * scale, 0), flat(PALETTE.treeFol));
    canopy2.position.set(0.3 * scale, 2.2 * scale + 0.3, 0.2 * scale);
    canopy2.scale.y = 0.5;
    canopy2.castShadow = true;
    g.add(canopy2);
    g.position.set(x, 0, z);
    return g;
  }
  scene.add(acacia(3.5, -2.2, 1.2));
  scene.add(acacia(-1.5, -3.5, 0.85));
  scene.add(acacia(4.2, 2.5, 0.7));

  // --- LION ---
  function lion() {
    const g = new THREE.Group();
    const bodyMat = flat(PALETTE.lion);
    const bellyMat = flat(PALETTE.lionBelly);
    const maneMat = flat(PALETTE.mane);
    const maneDarkMat = flat(PALETTE.maneDark);
    const blackMat = flat('#1a1410');

    // body — flattened icosahedron
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), bodyMat);
    body.scale.set(1, 0.85, 1.5);
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);

    // belly
    const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), bellyMat);
    belly.scale.set(0.8, 0.55, 1.2);
    belly.position.set(0, 0.7, 0.05);
    g.add(belly);

    // legs (4)
    const legGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.7, 6);
    [[-0.45, -0.85], [0.45, -0.85], [-0.45, 0.85], [0.45, 0.85]].forEach(([x, z]) => {
      const l = new THREE.Mesh(legGeo, bodyMat);
      l.position.set(x, 0.4, z);
      l.castShadow = true;
      g.add(l);
    });

    // mane (donut around neck)
    const mane = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78, 0), maneMat);
    mane.position.set(0, 1.15, -1.05);
    mane.scale.set(1, 1, 0.7);
    mane.castShadow = true;
    g.add(mane);
    const mane2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), maneDarkMat);
    mane2.position.set(0, 0.95, -1.15);
    g.add(mane2);

    // head
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), bodyMat);
    head.position.set(0, 1.2, -1.35);
    head.scale.set(1, 0.95, 1);
    head.castShadow = true;
    g.add(head);

    // ears
    [-0.32, 0.32].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 4), bodyMat);
      ear.position.set(x, 1.65, -1.3);
      g.add(ear);
    });

    // eyes
    [-0.2, 0.2].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), blackMat);
      e.position.set(x, 1.3, -1.78);
      g.add(e);
    });
    // nose
    const nose = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1, 0), blackMat);
    nose.position.set(0, 1.15, -1.85);
    nose.rotation.x = Math.PI / 4;
    g.add(nose);

    // tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), bodyMat);
    tail.position.set(0, 1.1, 1.3);
    tail.rotation.x = -Math.PI / 3;
    g.add(tail);
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), maneMat);
    tuft.position.set(0, 1.45, 1.75);
    g.add(tuft);

    return g;
  }
  const leo = lion();
  leo.position.set(0.5, 0, 0);
  leo.rotation.y = -Math.PI / 5;
  scene.add(leo);

  // --- ZEBRA FRIEND ---
  function zebra() {
    const g = new THREE.Group();
    const m = flat(PALETTE.zebra);
    const stripeMat = flat(PALETTE.zebraDark);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), m);
    body.scale.set(1, 0.7, 1.6);
    body.position.y = 0.7;
    body.castShadow = true;
    g.add(body);
    // stripes — slim disks
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), stripeMat);
      s.position.set(0, 0.7, -0.4 + i * 0.25);
      g.add(s);
    }
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), m);
    head.position.set(0, 0.9, -0.85);
    head.scale.set(0.9, 0.9, 1.2);
    g.add(head);
    const legGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.55, 5);
    [[-0.2, -0.5], [0.2, -0.5], [-0.2, 0.5], [0.2, 0.5]].forEach(([x, z]) => {
      const l = new THREE.Mesh(legGeo, m);
      l.position.set(x, 0.27, z);
      g.add(l);
    });
    return g;
  }
  const z = zebra();
  z.position.set(-3.5, 0, -2);
  z.rotation.y = Math.PI / 3;
  scene.add(z);

  // --- TOY (red ball) ---
  const toy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), flat(PALETTE.toy));
  toy.position.set(2.2, 0.42, 1.4);
  toy.castShadow = true;
  scene.add(toy);

  // --- ANIMATION ---
  function update(dt, t) {
    leo.position.y = Math.sin(t * 1.2) * 0.04;
    z.rotation.y = Math.PI / 3 + Math.sin(t * 0.6) * 0.1;
    toy.rotation.y = t;
    toy.position.y = 0.42 + Math.abs(Math.sin(t * 2)) * 0.15;
    // water shimmer via emissive flicker
    water.material.color.setHSL(0.5, 0.45, 0.55 + Math.sin(t * 1.5) * 0.04);
  }

  return { ...host, update };
}

function LowPolyHabitat({ width, height }) {
  return (
    <HabitatCanvas
      width={width} height={height}
      buildScene={buildLowPolyHabitat}
      label="A · Low-poly Savanna"
      palette={{
        bg: '#f5c98a',
        accent: '#d94a52', accentText: '#fff',
        chipBg: 'rgba(255,250,240,0.85)', chipText: '#5a3a22',
        chipShadow: '0 2px 8px rgba(90,40,20,0.15)',
        chipBlur: 'blur(8px)',
        ctaBg: '#5a3a22', ctaText: '#fff8eb',
        ctaShadow: '0 6px 18px rgba(90,40,20,0.3)',
        tagBg: 'rgba(90,40,20,0.85)', tagText: '#f5c98a',
      }}
    />
  );
}

window.LowPolyHabitat = LowPolyHabitat;
