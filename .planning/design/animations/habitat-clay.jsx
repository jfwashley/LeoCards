// habitat-clay.jsx — Direction B: Soft Clay (v2 hi-fi)
// Bigger habitat, articulated walking lion, richer biome detail.

function buildClayHabitat(canvas, w, h) {
  const PALETTE = {
    sky: '#cfe6f0',
    skyTop: '#a8d2e6',
    cloud: '#fbfaf6',
    ground: '#a8d77c',
    groundAlt: '#9bcf6a',
    groundDeep: '#6fb04a',
    groundShadow: '#5a8f3a',
    soil: '#c89a6e',
    soilDeep: '#8a6647',
    sand: '#e8d49a',
    path: '#d6c39a',
    pathDark: '#b89e6c',
    water: '#7ec8d6',
    waterDeep: '#3e8fa6',
    lily: '#7fb84d',
    lilyFlower: '#fbfaf6',
    lion: '#f0b558',
    lionLight: '#fae0a8',
    lionShadow: '#d49340',
    mane: '#c97a3a',
    maneMid: '#b06628',
    maneDark: '#8a4a18',
    eye: '#1f140c',
    nose: '#3a2218',
    elephant: '#c0b6cc',
    elephantDark: '#857a98',
    elephantPink: '#e8c0c8',
    toy: '#e85a8a',
    toyStripe: '#fff5e6',
    flowerA: '#f8c8d8',
    flowerB: '#fffbe8',
    flowerC: '#c9a8e8',
    mushroomCap: '#e4644a',
    mushroomStem: '#fbfaf6',
    butterflyA: '#f0a3c0',
    butterflyB: '#e8b4f0',
  };

  const host = buildSceneHost(canvas, w, h, {
    bg: PALETTE.sky, fog: PALETTE.sky, fogNear: 36, fogFar: 80,
    fov: 30, camDist: 15, camHeight: 9.5, lookY: 1.2, exposure: 1.02,
  });
  const { scene, renderer, camera } = host;

  // Soft sky gradient via vertex-colored backdrop sphere
  {
    const skyGeo = new THREE.SphereGeometry(80, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(PALETTE.skyTop) },
        bot: { value: new THREE.Color(PALETTE.sky) },
      },
      vertexShader: `varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 vPos; uniform vec3 top; uniform vec3 bot; void main(){ float t=clamp(vPos.y/60.0+0.4,0.,1.); gl_FragColor=vec4(mix(bot,top,smoothstep(0.,1.,t)),1.); }`,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
  }

  // Stepped toon shading
  const grad = makeToonGradient(4);
  const toonMat = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });

  // --- LIGHTS ---
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
  const fill = new THREE.DirectionalLight('#bcd8ff', 0.35);
  fill.position.set(-5, 6, -3);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight('#cfe6f0', '#88a5b0', 0.65));
  scene.add(new THREE.AmbientLight('#ffffff', 0.22));

  // --- ISLAND (rounded, larger — sphere is 2× wide in x/z) ---
  const ISLAND_R = 9.2;
  const ISLAND_XZ = 2;
  const island = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(ISLAND_R, 64, 40), toonMat(PALETTE.ground));
  mound.scale.set(ISLAND_XZ, 0.42, ISLAND_XZ);
  mound.position.y = -3.2;
  mound.receiveShadow = true; mound.castShadow = true;
  island.add(mound);

  // patches of slightly different grass to add variety
  const patchMat = toonMat(PALETTE.groundAlt);
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * (ISLAND_R - 2.5);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 1.2, 16, 12), patchMat);
    p.scale.set(1, 0.05, 1);
    p.position.set(Math.cos(a) * r, 0.32, Math.sin(a) * r);
    p.receiveShadow = true;
    island.add(p);
  }

  // grass ring on top edge
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_R * ISLAND_XZ - 0.6, 0.4, 14, 96), toonMat(PALETTE.groundDeep));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  island.add(ring);

  // soil underbelly
  const soil = new THREE.Mesh(
    new THREE.SphereGeometry(ISLAND_R - 0.3, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    toonMat(PALETTE.soil)
  );
  soil.position.y = -3.2;
  soil.scale.set(ISLAND_XZ, 0.55, ISLAND_XZ);
  island.add(soil);

  // a couple of soil chunk roots hanging
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const chunk = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), toonMat(PALETTE.soilDeep));
    const rr = (ISLAND_R - 0.4) * ISLAND_XZ;
    chunk.position.set(Math.cos(a) * rr, -3.4 - Math.random() * 0.6, Math.sin(a) * rr);
    chunk.scale.set(0.9, 1.2 + Math.random() * 0.6, 0.9);
    island.add(chunk);
  }
  scene.add(island);

  // --- CLAY PATH between waypoints (flagstones) ---
  const pathStones = new THREE.Group();
  const stoneMat = toonMat(PALETTE.path);
  const stoneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.5, 0, 1.8),
    new THREE.Vector3(-1.5, 0, -0.5),
    new THREE.Vector3(0.8, 0, -1.6),
    new THREE.Vector3(2.8, 0, -1.2),
  ], false);
  const stoneCount = 14;
  for (let i = 0; i < stoneCount; i++) {
    const u = i / (stoneCount - 1);
    const p = stoneCurve.getPoint(u);
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), stoneMat);
    stone.scale.set(1, 0.18, 0.8 + Math.random() * 0.25);
    stone.position.set(p.x, 0.35, p.z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    pathStones.add(stone);
  }
  scene.add(pathStones);

  // --- LAKE (rounded blob with lily pads) ---
  const lakeGroup = new THREE.Group();
  const lake = new THREE.Mesh(new THREE.SphereGeometry(2.4, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2), toonMat(PALETTE.water));
  lake.scale.set(1.35, 0.18, 1);
  lake.position.set(-4.2, 0.34, 3.4);
  lake.receiveShadow = true;
  lakeGroup.add(lake);
  // inner deeper blob (concentric)
  const lakeIn = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), toonMat(PALETTE.waterDeep));
  lakeIn.scale.set(1.2, 0.1, 0.9);
  lakeIn.position.set(-4.2, 0.4, 3.4);
  lakeGroup.add(lakeIn);
  // rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.2, 12, 40), toonMat(PALETTE.soilDeep));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-4.2, 0.27, 3.4);
  rim.scale.set(1.35, 1, 1);
  lakeGroup.add(rim);
  // lily pads
  const lilies = [];
  for (let i = 0; i < 5; i++) {
    const lily = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), toonMat(PALETTE.lily));
    pad.scale.set(1, 0.12, 1);
    lily.add(pad);
    if (Math.random() > 0.5) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toonMat(PALETTE.lilyFlower));
      flower.position.y = 0.08;
      lily.add(flower);
    }
    const ang = (i / 5) * Math.PI * 2;
    lily.position.set(-4.2 + Math.cos(ang) * (0.6 + Math.random() * 0.8), 0.42, 3.4 + Math.sin(ang) * (0.5 + Math.random() * 0.7));
    lakeGroup.add(lily);
    lilies.push({ obj: lily, phase: Math.random() * Math.PI * 2 });
  }
  scene.add(lakeGroup);

  // --- TREES (more, varied) ---
  function clayTree(x, z, scale = 1, hueShift = 0) {
    const g = new THREE.Group();
    const leafCol = hueShift > 0 ? PALETTE.groundDeep : PALETTE.tree || '#7fb84d';
    const leafColDark = '#4f8a2e';
    const trunkMat = toonMat('#7a4f30');
    const leafMat = toonMat('#7fb84d');
    const leafMatDark = toonMat(leafColDark);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1.2 * scale, 14), trunkMat);
    trunk.position.y = 0.6 * scale + 0.2;
    trunk.castShadow = true;
    g.add(trunk);
    // 4 puffs
    const puffs = [
      { r: 0.95, x: 0, y: 1.55, z: 0, mat: leafMat },
      { r: 0.7, x: 0.45, y: 1.85, z: 0.25, mat: leafMat },
      { r: 0.6, x: -0.35, y: 1.7, z: -0.3, mat: leafMatDark },
      { r: 0.55, x: 0.15, y: 2.05, z: -0.2, mat: leafMatDark },
    ];
    puffs.forEach(p => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(p.r * scale, 18, 14), p.mat);
      m.position.set(p.x * scale, p.y * scale + 0.2, p.z * scale);
      m.castShadow = true;
      g.add(m);
    });
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI;
    return g;
  }
  scene.add(clayTree(4.5, -3.2, 1.3));
  scene.add(clayTree(-2.5, -5.2, 1.0));
  scene.add(clayTree(5.6, 2.8, 0.85));
  scene.add(clayTree(-5.8, -1.6, 1.1));
  scene.add(clayTree(2.0, 5.8, 0.8));
  scene.add(clayTree(-4.2, 5.5, 0.95));

  // --- FLOWERS (3 colors, denser) ---
  const flowerColors = [PALETTE.flowerA, PALETTE.flowerB, PALETTE.flowerC];
  const stemMat = toonMat(PALETTE.groundDeep);
  function flower(x, z, color) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), stemMat);
    stem.position.y = 0.4;
    g.add(stem);
    // 5 petals around a center
    const petalMat = toonMat(color);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), petalMat);
      petal.position.set(Math.cos(a) * 0.1, 0.65, Math.sin(a) * 0.1);
      g.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toonMat('#f0c850'));
    center.position.y = 0.65;
    g.add(center);
    g.position.set(x, 0, z);
    return g;
  }
  for (let i = 0; i < 32; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * (ISLAND_R - 2.4);
    const px = Math.cos(a) * r, pz = Math.sin(a) * r;
    // avoid lake area
    if (Math.hypot(px - -4.2, pz - 3.4) < 3.2) continue;
    scene.add(flower(px, pz, flowerColors[Math.floor(Math.random() * 3)]));
  }

  // --- GRASS TUFTS (tall blades for texture) ---
  const bladeMat = toonMat(PALETTE.groundDeep);
  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * (ISLAND_R - 1.8);
    const px = Math.cos(a) * r, pz = Math.sin(a) * r;
    if (Math.hypot(px - -4.2, pz - 3.4) < 3.0) continue;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 4), bladeMat);
    blade.position.set(px, 0.4, pz);
    blade.rotation.y = Math.random() * Math.PI;
    scene.add(blade);
  }

  // --- MUSHROOMS (cluster) ---
  function mushroom(x, z, scale = 1) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.13 * scale, 0.35 * scale, 10), toonMat(PALETTE.mushroomStem));
    stem.position.y = 0.18 * scale + 0.25;
    stem.castShadow = true;
    g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toonMat(PALETTE.mushroomCap));
    cap.position.y = 0.4 * scale + 0.25;
    cap.scale.set(1, 0.7, 1);
    cap.castShadow = true;
    g.add(cap);
    // spots
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 8, 8), toonMat(PALETTE.mushroomStem));
      const a = Math.random() * Math.PI * 2;
      dot.position.set(Math.cos(a) * 0.12 * scale, 0.5 * scale + 0.25, Math.sin(a) * 0.12 * scale);
      g.add(dot);
    }
    g.position.set(x, 0, z);
    return g;
  }
  [[5.2, -0.5, 1], [5.4, -0.2, 0.7], [4.9, -0.8, 0.6], [-1, 5.4, 0.9], [-1.3, 5.1, 0.7]].forEach(([x, z, s]) => scene.add(mushroom(x, z, s)));

  // --- ROCKS (a small cluster) ---
  function rock(x, z, scale = 1) {
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 12, 10), toonMat('#a8a098'));
    r.position.set(x, 0.3 * scale, z);
    r.scale.set(1, 0.6, 0.85);
    r.rotation.y = Math.random() * Math.PI;
    r.castShadow = true; r.receiveShadow = true;
    return r;
  }
  scene.add(rock(3.6, 3.4, 1.0));
  scene.add(rock(4.0, 3.7, 0.6));
  scene.add(rock(3.4, 3.9, 0.7));

  // --- CLOUDS ---
  const clouds = new THREE.Group();
  const cloudMat = toonMat(PALETTE.cloud);
  function cloud(x, y, z, scale = 1) {
    const g = new THREE.Group();
    const positions = [[0, 0, 0], [0.8, 0.1, 0], [-0.7, 0.05, 0.1], [0.3, -0.2, 0.2]];
    positions.forEach(([dx, dy, dz]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.7 * scale, 14, 10), cloudMat);
      m.position.set(dx * scale, dy * scale, dz * scale);
      g.add(m);
    });
    g.position.set(x, y, z);
    return g;
  }
  const cloudData = [
    cloud(-7, 7.5, -4, 1.2),
    cloud(6, 8.5, 4, 1.0),
    cloud(2, 9, -7, 0.9),
  ];
  cloudData.forEach(c => clouds.add(c));
  scene.add(clouds);

  // --- BUTTERFLIES ---
  const butterflies = [];
  function butterfly(color) {
    const g = new THREE.Group();
    const bodyMat = toonMat('#3a2818');
    const wingMat = toonMat(color);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), bodyMat);
    g.add(body);
    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), wingMat);
    wingL.scale.set(1, 0.1, 0.7);
    wingL.position.x = 0.15;
    g.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x = -0.15;
    g.add(wingR);
    g.userData = { wingL, wingR, phase: Math.random() * Math.PI * 2 };
    return g;
  }
  for (let i = 0; i < 3; i++) {
    const b = butterfly([PALETTE.butterflyA, PALETTE.butterflyB, PALETTE.flowerC][i]);
    scene.add(b);
    butterflies.push({
      obj: b,
      cx: (Math.random() - 0.5) * 6,
      cz: (Math.random() - 0.5) * 6,
      r: 1 + Math.random() * 1.5,
      speed: 0.5 + Math.random() * 0.5,
      y: 1.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // --- LION (articulated, walking) ---
  function buildLion() {
    const g = new THREE.Group();
    const bodyMat = toonMat(PALETTE.lion);
    const bellyMat = toonMat(PALETTE.lionLight);
    const shadowMat = toonMat(PALETTE.lionShadow);
    const maneMat = toonMat(PALETTE.mane);
    const maneMidMat = toonMat(PALETTE.maneMid);
    const maneDarkMat = toonMat(PALETTE.maneDark);
    const eyeMat = toonMat(PALETTE.eye);
    const noseMat = toonMat(PALETTE.nose);
    const pinkMat = toonMat('#f0a8a0');

    // Torso (parented so we can bob it)
    const torso = new THREE.Group();
    g.add(torso);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 28, 20), bodyMat);
    body.scale.set(1, 0.88, 1.5);
    body.position.y = 1.0;
    body.castShadow = true;
    torso.add(body);

    // back stripe of slight shadow (dorsal)
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), shadowMat);
    back.scale.set(0.55, 0.5, 1.3);
    back.position.set(0, 1.35, 0.05);
    torso.add(back);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), bellyMat);
    belly.scale.set(0.85, 0.55, 1.18);
    belly.position.set(0, 0.7, 0.1);
    torso.add(belly);

    // Mane attached to torso, behind head
    const maneAnchor = new THREE.Group();
    maneAnchor.position.set(0, 1.22, -1.05);
    torso.add(maneAnchor);
    const mane = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), maneMat);
    mane.scale.set(1.05, 1.05, 0.9);
    mane.castShadow = true;
    maneAnchor.add(mane);
    // mane outer tufts
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), (i % 2 === 0) ? maneMidMat : maneDarkMat);
      tuft.position.set(Math.cos(a) * 1.02, Math.sin(a) * 0.78, -0.1);
      tuft.scale.set(1, 1, 0.7);
      maneAnchor.add(tuft);
    }
    // a few smaller front tufts
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI - Math.PI / 2;
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), maneMidMat);
      tuft.position.set(Math.cos(a) * 0.7, 0.05 + Math.sin(a) * 0.5, 0.25);
      maneAnchor.add(tuft);
    }

    // Head (its own group for sway)
    const headG = new THREE.Group();
    headG.position.set(0, 1.22, -1.5);
    torso.add(headG);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 18), bodyMat);
    head.scale.set(1.05, 0.95, 1);
    head.castShadow = true;
    headG.add(head);
    // cheeks fuzz
    [-0.36, 0.36].forEach(x => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bellyMat);
      cheek.position.set(x, -0.1, -0.35);
      headG.add(cheek);
    });
    // muzzle
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), bellyMat);
    muzzle.position.set(0, -0.18, -0.5);
    muzzle.scale.set(1, 0.75, 0.9);
    headG.add(muzzle);
    // mouth line - small dark wedge
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), noseMat);
    mouth.position.set(0, -0.3, -0.78);
    mouth.scale.set(1.2, 0.25, 0.5);
    headG.add(mouth);
    // tongue hint
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pinkMat);
    tongue.position.set(0, -0.35, -0.82);
    tongue.scale.set(0.8, 0.3, 0.5);
    headG.add(tongue);
    // nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), noseMat);
    nose.position.set(0, -0.08, -0.78);
    nose.scale.set(1.2, 0.85, 0.8);
    headG.add(nose);
    // ears
    [-0.3, 0.3].forEach(x => {
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), bodyMat);
      outer.scale.set(0.85, 1.1, 0.5);
      ear.add(outer);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), pinkMat);
      inner.position.set(0, -0.02, -0.05);
      inner.scale.set(0.7, 0.9, 0.4);
      ear.add(inner);
      ear.position.set(x, 0.42, 0.05);
      ear.rotation.z = x > 0 ? -0.15 : 0.15;
      headG.add(ear);
    });
    // brow + eyes
    const eyes = [];
    [-0.22, 0.22].forEach(x => {
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), shadowMat);
      brow.position.set(x, 0.18, -0.52);
      brow.scale.set(1.2, 0.4, 0.4);
      brow.rotation.z = x > 0 ? -0.4 : 0.4;
      headG.add(brow);
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), toonMat('#fbfaf6'));
      eyeWhite.position.set(x, 0.06, -0.52);
      eyeWhite.scale.set(0.85, 1, 0.3);
      headG.add(eyeWhite);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeMat);
      eye.position.set(x, 0.06, -0.58);
      eye.scale.set(0.85, 1, 0.6);
      headG.add(eye);
      eyes.push({ white: eyeWhite, pupil: eye });
    });
    // whiskers (thin lines)
    const whiskerMat = toonMat('#fbfaf6');
    [-1, 1].forEach(side => {
      [-0.05, 0.0, 0.05].forEach(off => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4), whiskerMat);
        w.position.set(side * 0.22, -0.12 + off, -0.7);
        w.rotation.z = side * Math.PI / 2;
        w.rotation.y = side * (0.1 + off);
        headG.add(w);
      });
    });

    // Legs — articulated, with pivot at top
    function leg(x, z, isFront) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.78, z);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.3, 6, 10), bodyMat);
      upper.position.y = -0.2;
      upper.castShadow = true;
      pivot.add(upper);
      // paw
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), bodyMat);
      paw.position.y = -0.45;
      paw.scale.set(1.05, 0.6, 1.15);
      paw.castShadow = true;
      pivot.add(paw);
      // claws hint
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), noseMat);
        c.position.set(-0.1 + i * 0.1, -0.49, -0.18);
        pivot.add(c);
      }
      torso.add(pivot);
      return pivot;
    }
    const legs = {
      FL: leg(-0.45, -0.85, true),
      FR: leg(0.45, -0.85, true),
      BL: leg(-0.45, 0.85, false),
      BR: leg(0.45, 0.85, false),
    };

    // Tail
    const tailRoot = new THREE.Group();
    tailRoot.position.set(0, 1.15, 1.3);
    torso.add(tailRoot);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.1, 10), bodyMat);
    tail.position.y = 0.4;
    tail.geometry.translate(0, 0.55, 0); // pivot at base
    tail.position.y = 0;
    tail.rotation.x = -Math.PI / 3;
    tailRoot.add(tail);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), maneMat);
    tuft.position.set(0, 0.85, 0.45);
    tail.add(tuft);
    tuft.position.set(0, 0.6, 0);

    return { root: g, torso, headG, legs, tailRoot, tail, eyes, maneAnchor };
  }
  const leo = buildLion();
  scene.add(leo.root);

  // --- LION PATH ---
  // Loop through waypoints; pause at "rest" zones. Use Catmull-Rom for smooth.
  const lionCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.2, 0, 1.5),
    new THREE.Vector3(-1.4, 0, -0.3),
    new THREE.Vector3(0.6, 0, -1.5),
    new THREE.Vector3(2.6, 0, -1.0),
    new THREE.Vector3(3.2, 0, 1.5),
    new THREE.Vector3(1.2, 0, 2.6),
    new THREE.Vector3(-1.4, 0, 2.3),
  ], true, 'catmullrom', 0.5);

  // --- ELEPHANT FRIEND ---
  function buildElephant() {
    const g = new THREE.Group();
    const m = toonMat(PALETTE.elephant);
    const md = toonMat(PALETTE.elephantDark);
    const pinkMat = toonMat(PALETTE.elephantPink);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), m);
    body.scale.set(1.15, 1, 1.45);
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), m);
    head.position.set(0, 1.15, -1.0);
    head.castShadow = true;
    g.add(head);
    // trunk segments
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 - i * 0.022, 12, 10), m);
      const t = i / 5;
      s.position.set(0, 1.05 - t * 0.85, -1.42 - t * 0.15);
      g.add(s);
    }
    // ears
    [-0.65, 0.65].forEach(x => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), md);
      ear.position.set(x, 1.25, -0.85);
      ear.scale.set(0.28, 1.1, 1.1);
      ear.rotation.z = x > 0 ? -0.2 : 0.2;
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), pinkMat);
      inner.position.set(x * 0.9, 1.2, -0.78);
      inner.scale.set(0.2, 0.8, 0.85);
      inner.rotation.z = x > 0 ? -0.2 : 0.2;
      g.add(inner);
    });
    // eyes
    [-0.3, 0.3].forEach(x => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toonMat('#1f140c'));
      e.position.set(x, 1.25, -1.45);
      g.add(e);
    });
    // tusks
    [-0.18, 0.18].forEach(x => {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), toonMat('#fbfaf6'));
      t.position.set(x, 0.85, -1.5);
      t.rotation.x = 0.6;
      g.add(t);
    });
    // legs (4 capsules)
    const legGeo = new THREE.CapsuleGeometry(0.22, 0.4, 6, 10);
    [[-0.4, -0.55], [0.4, -0.55], [-0.4, 0.5], [0.4, 0.5]].forEach(([x, z]) => {
      const l = new THREE.Mesh(legGeo, m);
      l.position.set(x, 0.4, z);
      l.castShadow = true;
      g.add(l);
    });
    // tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), m);
    tail.position.set(0, 1.0, 0.95);
    tail.rotation.x = 0.4;
    g.add(tail);
    return g;
  }
  const ele = buildElephant();
  ele.position.set(-5.6, 0, -2.6);
  ele.rotation.y = Math.PI / 2.6;
  ele.scale.setScalar(0.9);
  scene.add(ele);

  // --- TOY (yarn ball, slightly bigger) ---
  const toyG = new THREE.Group();
  const toy = new THREE.Mesh(new THREE.SphereGeometry(0.4, 22, 16), toonMat(PALETTE.toy));
  toy.castShadow = true;
  toyG.add(toy);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.045, 8, 28), toonMat(PALETTE.toyStripe));
    stripe.rotation.x = Math.random() * Math.PI;
    stripe.rotation.y = Math.random() * Math.PI;
    toyG.add(stripe);
  }
  // a dangly thread
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), toonMat(PALETTE.toyStripe));
  thread.position.set(0.25, -0.2, 0.2);
  thread.rotation.z = 0.4;
  toyG.add(thread);
  toyG.position.set(3.6, 0.5, 2.4);
  scene.add(toyG);

  // --- ANIM ---
  const tmpV = new THREE.Vector3();
  const tmpT = new THREE.Vector3();
  let lastLionPos = new THREE.Vector3();
  let smoothSpeed = 0;
  let blinkT = 0;

  function update(dt, t) {
    // === Lion path & walk cycle ===
    // u sweep with subtle ease-pause near each waypoint segment
    const speed = 0.045; // loop fraction per second
    const u = (t * speed) % 1;
    const p = lionCurve.getPoint(u);
    const tan = lionCurve.getTangent(u).normalize();

    // Walk cycle frequency tied to motion magnitude
    const moved = p.distanceTo(lastLionPos) / Math.max(dt, 0.0001);
    smoothSpeed = smoothSpeed * 0.85 + moved * 0.15;
    lastLionPos.copy(p);

    leo.root.position.set(p.x, 0, p.z);
    // face direction of travel (lion's nose is -Z in local space)
    const yaw = Math.atan2(tan.x, tan.z) + Math.PI;
    leo.root.rotation.y = yaw;

    // Snap to curved ground surface so paws plant on top of the mound instead
    // of sinking through its spherical falloff. Mound: sphere R=9.2, scale
    // (ISLAND_XZ, 0.42, ISLAND_XZ), centered y=-3.2. Surface y at (x,z):
    //   y = -3.2 + 0.42 * sqrt(R² - (x²+z²)/ISLAND_XZ²)
    const _xzSq = ISLAND_XZ * ISLAND_XZ;
    const _r2 = (p.x * p.x + p.z * p.z) / _xzSq;
    const _denom = Math.sqrt(Math.max(0.01, 84.64 - _r2));
    const _groundY = -3.2 + 0.42 * _denom;
    const PAW_OFFSET = 0.198;
    leo.root.position.y = _groundY - PAW_OFFSET;
    // Pitch along direction of travel so the lion is perpendicular to the slope
    const _slope = (-0.42 * p.x / (_xzSq * _denom)) * tan.x + (-0.42 * p.z / (_xzSq * _denom)) * tan.z;
    const _pitch = Math.atan(_slope);

    // Body bob with the trot
    const trotPhase = t * 6;
    leo.torso.position.y = Math.abs(Math.sin(trotPhase)) * 0.05;
    leo.torso.rotation.z = Math.sin(trotPhase * 0.5) * 0.02;
    leo.torso.rotation.x = _pitch;

    // Legs: diagonal pairs (FL+BR vs FR+BL)
    const swingAmt = Math.min(smoothSpeed * 0.6, 0.7);
    const liftAmt = Math.min(smoothSpeed * 0.4, 0.45);
    const phaseA = Math.sin(trotPhase);
    const phaseB = Math.sin(trotPhase + Math.PI);
    leo.legs.FL.rotation.x = phaseA * swingAmt;
    leo.legs.BR.rotation.x = phaseA * swingAmt;
    leo.legs.FR.rotation.x = phaseB * swingAmt;
    leo.legs.BL.rotation.x = phaseB * swingAmt;
    // small lift on the "up" side
    leo.legs.FL.position.y = 0.78 + Math.max(0, phaseA) * liftAmt * 0.4;
    leo.legs.BR.position.y = 0.78 + Math.max(0, phaseA) * liftAmt * 0.4;
    leo.legs.FR.position.y = 0.78 + Math.max(0, phaseB) * liftAmt * 0.4;
    leo.legs.BL.position.y = 0.78 + Math.max(0, phaseB) * liftAmt * 0.4;

    // Tail wag
    leo.tailRoot.rotation.y = Math.sin(t * 3) * 0.4;
    leo.tailRoot.rotation.z = Math.sin(t * 2) * 0.1;

    // Head sway (looking around)
    leo.headG.rotation.y = Math.sin(t * 0.8) * 0.12;
    leo.headG.rotation.x = Math.sin(t * 0.5) * 0.05;

    // Blink
    blinkT += dt;
    if (blinkT > 2.5 + Math.random() * 1.5) blinkT = -0.18;
    const blink = blinkT < 0 ? 0.05 : 1.0;
    leo.eyes.forEach(e => { e.pupil.scale.y = blink; e.white.scale.y = 0.95 * blink + 0.05; });

    // === Lake shimmer ===
    lake.material.color.lerpColors(new THREE.Color(PALETTE.water), new THREE.Color('#9ad6e0'), 0.5 + Math.sin(t * 1.4) * 0.5);
    lilies.forEach(l => { l.obj.position.y = 0.42 + Math.sin(t * 0.9 + l.phase) * 0.025; });

    // === Toy bobble ===
    toyG.rotation.y = t * 0.8;
    toyG.position.y = 0.5 + Math.abs(Math.sin(t * 2)) * 0.16;

    // === Butterflies ===
    butterflies.forEach(b => {
      const a = t * b.speed + b.phase;
      b.obj.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 1.3) * 0.25, b.cz + Math.sin(a) * b.r);
      b.obj.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 18 + b.phase) * 0.9;
      b.obj.userData.wingL.rotation.z = flap;
      b.obj.userData.wingR.rotation.z = -flap;
    });

    // === Clouds drift ===
    clouds.children.forEach((c, i) => {
      c.position.x += dt * 0.18 * (i % 2 === 0 ? 1 : -1);
      if (c.position.x > 14) c.position.x = -14;
      if (c.position.x < -14) c.position.x = 14;
    });

    // === Elephant slight breath ===
    ele.position.y = Math.sin(t * 0.9) * 0.02;
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
