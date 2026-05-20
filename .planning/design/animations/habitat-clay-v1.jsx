// habitat-clay.jsx — Direction B: Soft Clay / Toon
// Rounded everything, toon-shaded with crisp shadow bands, pastel daylight.

function buildClayHabitat(canvas, w, h) {
  const PALETTE = {
    sky: '#cfe6f0',
    ground: '#a8d77c',
    groundDeep: '#6fb04a',
    soil: '#c89a6e',
    soilDeep: '#8a6647',
    water: '#7ec8d6',
    waterDeep: '#4a9bb0',
    lion: '#f0b558',
    lionLight: '#f9d28a',
    mane: '#c97a3a',
    maneDark: '#9c5520',
    tree: '#7fb84d',
    treeDark: '#4f8a2e',
    trunk: '#7a4f30',
    elephant: '#b8b0c4',
    elephantDark: '#7a7290',
    toy: '#e85a8a',
    flower: '#f8c8d8',
  };

  const host = buildSceneHost(canvas, w, h, {
    bg: PALETTE.sky, fog: PALETTE.sky, fogNear: 28, fogFar: 60,
    fov: 32, camDist: 12, camHeight: 8, lookY: 1, exposure: 1.0,
  });
  const { scene, renderer, camera } = host;

  // Toon gradient for that claymation stepped-light look
  const grad = makeToonGradient(4);
  const toonMat = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });

  // --- LIGHTS ---
  const key = new THREE.DirectionalLight('#fff5dc', 1.6);
  key.position.set(6, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.001;
  scene.add(key);
  scene.add(new THREE.HemisphereLight('#cfe6f0', '#88a5b0', 0.7));
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));

  // --- ISLAND (rounded mound) ---
  const island = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 24), toonMat(PALETTE.ground));
  mound.scale.set(1, 0.45, 1);
  mound.position.y = -3.1;
  mound.receiveShadow = true; mound.castShadow = true;
  island.add(mound);
  // a darker ring of grass on top edge
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.35, 12, 48), toonMat(PALETTE.groundDeep));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  island.add(ring);
  // soil underbelly
  const soil = new THREE.Mesh(new THREE.SphereGeometry(6.8, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toonMat(PALETTE.soil));
  soil.position.y = -3.1;
  soil.scale.set(1, 0.55, 1);
  island.add(soil);
  scene.add(island);

  // bouncy flowers
  const flowerMat = toonMat(PALETTE.flower);
  const stemMat = toonMat(PALETTE.groundDeep);
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 4.4;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), stemMat);
    stem.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r);
    scene.add(stem);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), flowerMat);
    bud.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r);
    scene.add(bud);
  }

  // --- LAKE (rounded blob) ---
  const lake = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), toonMat(PALETTE.water));
  lake.scale.set(1.2, 0.18, 1);
  lake.position.set(-2.9, 0.32, 2.4);
  lake.receiveShadow = true;
  scene.add(lake);
  // rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.18, 10, 32), toonMat(PALETTE.soilDeep));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-2.9, 0.25, 2.4);
  rim.scale.set(1.2, 1, 1);
  scene.add(rim);

  // --- ROUND TREES ---
  function clayTree(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.25 * scale, 1 * scale, 12), toonMat(PALETTE.trunk));
    trunk.position.y = 0.5 * scale + 0.2;
    trunk.castShadow = true;
    g.add(trunk);
    // 3 puffy spheres stacked
    const puff1 = new THREE.Mesh(new THREE.SphereGeometry(0.85 * scale, 16, 14), toonMat(PALETTE.tree));
    puff1.position.y = 1.4 * scale + 0.2;
    puff1.castShadow = true;
    g.add(puff1);
    const puff2 = new THREE.Mesh(new THREE.SphereGeometry(0.65 * scale, 16, 14), toonMat(PALETTE.tree));
    puff2.position.set(0.4 * scale, 1.7 * scale + 0.2, 0.2 * scale);
    puff2.castShadow = true;
    g.add(puff2);
    const puff3 = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 16, 14), toonMat(PALETTE.treeDark));
    puff3.position.set(-0.35 * scale, 1.55 * scale + 0.2, -0.25 * scale);
    g.add(puff3);
    g.position.set(x, 0, z);
    return g;
  }
  scene.add(clayTree(3.6, -2.4, 1.2));
  scene.add(clayTree(-1.2, -3.7, 0.9));
  scene.add(clayTree(4.4, 2.4, 0.7));

  // --- LION (round, soft) ---
  function lion() {
    const g = new THREE.Group();
    const bodyMat = toonMat(PALETTE.lion);
    const bellyMat = toonMat(PALETTE.lionLight);
    const maneMat = toonMat(PALETTE.mane);
    const maneDarkMat = toonMat(PALETTE.maneDark);
    const blackMat = toonMat('#2a1f18');

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 18), bodyMat);
    body.scale.set(1, 0.9, 1.4);
    body.position.y = 1;
    body.castShadow = true;
    g.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 14), bellyMat);
    belly.scale.set(0.85, 0.6, 1.15);
    belly.position.set(0, 0.7, 0.1);
    g.add(belly);

    const legGeo = new THREE.CapsuleGeometry(0.18, 0.35, 6, 10);
    [[-0.42, -0.85], [0.42, -0.85], [-0.42, 0.85], [0.42, 0.85]].forEach(([x, z]) => {
      const l = new THREE.Mesh(legGeo, bodyMat);
      l.position.set(x, 0.42, z);
      l.castShadow = true;
      g.add(l);
    });

    // big puffy mane
    const mane = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16), maneMat);
    mane.position.set(0, 1.2, -1.05);
    mane.scale.set(1, 1, 0.85);
    mane.castShadow = true;
    g.add(mane);
    // mane puff tufts
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), maneDarkMat);
      tuft.position.set(Math.cos(a) * 0.95, 1.2 + Math.sin(a) * 0.7, -1.05);
      g.add(tuft);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 16), bodyMat);
    head.position.set(0, 1.2, -1.45);
    head.scale.set(1.05, 0.95, 1);
    head.castShadow = true;
    g.add(head);

    // muzzle
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), bellyMat);
    muzzle.position.set(0, 1.05, -1.85);
    muzzle.scale.set(1, 0.7, 0.9);
    g.add(muzzle);

    [-0.28, 0.28].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyMat);
      ear.position.set(x, 1.65, -1.4);
      ear.scale.set(0.8, 1.1, 0.5);
      g.add(ear);
    });

    [-0.2, 0.2].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), blackMat);
      e.position.set(x, 1.3, -1.85);
      g.add(e);
    });

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), blackMat);
    nose.position.set(0, 1.1, -2.05);
    g.add(nose);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), bodyMat);
    tail.position.set(0, 1.2, 1.3);
    tail.rotation.x = -Math.PI / 3.5;
    g.add(tail);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), maneMat);
    tuft.position.set(0, 1.55, 1.75);
    g.add(tuft);

    return g;
  }
  const leo = lion();
  leo.position.set(0.6, 0, 0.2);
  leo.rotation.y = -Math.PI / 5;
  scene.add(leo);

  // --- ELEPHANT FRIEND ---
  function elephant() {
    const g = new THREE.Group();
    const m = toonMat(PALETTE.elephant);
    const md = toonMat(PALETTE.elephantDark);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 14), m);
    body.scale.set(1.1, 1, 1.4);
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), m);
    head.position.set(0, 1.1, -0.95);
    g.add(head);
    // trunk - segments
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.18 - i * 0.02, 10, 8), m);
      s.position.set(0, 1.0 - i * 0.15, -1.4 - i * 0.05);
      g.add(s);
    }
    // ears
    [-0.6, 0.6].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), md);
      ear.position.set(x, 1.2, -0.85);
      ear.scale.set(0.3, 1, 1);
      g.add(ear);
    });
    // legs
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.4, 6, 8);
    [[-0.35, -0.5], [0.35, -0.5], [-0.35, 0.45], [0.35, 0.45]].forEach(([x, z]) => {
      const l = new THREE.Mesh(legGeo, m);
      l.position.set(x, 0.4, z);
      g.add(l);
    });
    return g;
  }
  const ele = elephant();
  ele.position.set(-3.3, 0, -1.8);
  ele.rotation.y = Math.PI / 3;
  ele.scale.setScalar(0.85);
  scene.add(ele);

  // --- TOY (yarn ball) ---
  const toyG = new THREE.Group();
  const toy = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14), toonMat(PALETTE.toy));
  toy.castShadow = true;
  toyG.add(toy);
  // wrap stripes
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 8, 24), toonMat('#fff5e6'));
    stripe.rotation.x = Math.random() * Math.PI;
    stripe.rotation.y = Math.random() * Math.PI;
    toyG.add(stripe);
  }
  toyG.position.set(2.3, 0.45, 1.5);
  scene.add(toyG);

  // --- ANIM ---
  function update(dt, t) {
    leo.position.y = Math.sin(t * 1.4) * 0.05;
    ele.children.forEach((c, i) => {
      if (i > 1 && i < 6) c.position.y += 0;
    });
    toyG.rotation.y = t * 0.8;
    toyG.position.y = 0.45 + Math.abs(Math.sin(t * 2)) * 0.18;
  }

  return { ...host, update };
}

function ClayHabitat({ width, height }) {
  return (
    <HabitatCanvas
      width={width} height={height}
      buildScene={buildClayHabitat}
      label="B · Soft Clay"
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

window.ClayHabitat = ClayHabitat;
