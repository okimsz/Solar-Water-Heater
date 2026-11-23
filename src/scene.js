import { TAU } from "./physics.js";

export function createWorld(onSelect) {
  const host = document.getElementById("viewport"),
    scene = new THREE.Scene();
  scene.background = new THREE.Color("#e5e9df");
  scene.fog = new THREE.Fog("#e5e9df", 24, 55);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80),
    renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    window.__solarStartup?.fail(
      "The browser lost its graphics context. Reload the page to restart.",
    );
  });
  scene.add(new THREE.HemisphereLight(0xfff9e4, 0x829b8d, 2.8));
  const sunlight = new THREE.DirectionalLight(0xffe3ab, 3.5);
  sunlight.position.set(-3, 8, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, {
    left: -8,
    right: 8,
    top: 7,
    bottom: -7,
    near: 0.5,
    far: 25,
  });
  sunlight.shadow.normalBias = 0.025;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0xc8dbe1, 1.6);
  fill.position.set(5, 4, -4);
  scene.add(fill);
  const mat = (color, metalness = 0.2, roughness = 0.5, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const M = {
    frame: mat("#435b58", 0.65, 0.38),
    edge: mat("#a9bab6", 0.75, 0.28),
    plate: mat("#252e31", 0.55, 0.4),
    copper: mat("#b57d50", 0.7, 0.32),
    insulation: mat("#d4c8a2", 0, 0.95),
    tank: mat("#f4f1df", 0.2, 0.4),
    dark: mat("#314a4c", 0.45, 0.4),
    glass: mat("#afced2", 0.05, 0.18, {
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    pipe: mat("#5098a4", 0.45, 0.33),
    sun: mat("#f4bd55", 0.1, 0.6, {
      emissive: 0xefb34d,
      emissiveIntensity: 0.7,
    }),
  };
  const parts = {},
    pickables = [],
    covers = [],
    labels = [],
    flowPaths = [];
  function group(name, parent = scene) {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  }
  function mesh(geo, m, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function box(w, h, d, m, parent, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), m, parent, x, y, z);
  }
  function cylinder(r, h, m, parent, x = 0, y = 0, z = 0) {
    return mesh(new THREE.CylinderGeometry(r, r, h, 48), m, parent, x, y, z);
  }
  function pipe(points, m, parent = scene, r = 0.043) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "centripetal",
    );
    const o = mesh(
      new THREE.TubeGeometry(
        curve,
        Math.max(24, points.length * 10),
        r,
        8,
        false,
      ),
      m,
      parent,
    );
    return { curve, o, parent };
  }
  function flowPath(route, kind, count = 14) {
    const arrows = [];
    for (let i = 0; i < count; i++) {
      const arrow = mesh(
        new THREE.ConeGeometry(0.045, 0.14, 6),
        mat("#b1d3d8", 0.1, 0.35),
        route.parent,
      );
      arrow.castShadow = false;
      arrows.push(arrow);
    }
    flowPaths.push({ ...route, kind, arrows });
  }
  function cover(o, offset, hideCut = true) {
    covers.push({
      o,
      base: o.position.clone(),
      offset: new THREE.Vector3(...offset),
      hideCut,
    });
  }
  function part(g, id) {
    parts[id] = g;
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.part = id;
        pickables.push(o);
      }
    });
  }
  function label(text, g, p, id) {
    const el = document.createElement("button");
    el.className = "part-label";
    el.textContent = text;
    el.onclick = () => onSelect(id);
    document.getElementById("labels").appendChild(el);
    labels.push({ el, g, p: new THREE.Vector3(...p) });
  }
  box(150, 0.08, 150, mat("#dce3d8", 0, 0.95), scene, 0, -0.12, 0);
  const grid = new THREE.GridHelper(24, 48, 0xbdcaba, 0xcdd7c8);
  grid.position.y = -0.075;
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  scene.add(grid);
  const collector = group("Flat-plate collector");
  collector.position.set(-2, 1.5, 0);
  collector.rotation.x = (-55 * Math.PI) / 180;
  const insulation = box(2.5, 3.2, 0.17, M.insulation, collector, 0, 0, -0.13);
  cover(insulation, [0, 0, -0.36], false);
  box(2.64, 3.34, 0.07, M.frame, collector, 0, 0, -0.26);
  for (const x of [-1.29, 1.29])
    box(0.1, 3.35, 0.34, M.frame, collector, x, 0, -0.08);
  for (const y of [-1.63, 1.63])
    box(2.65, 0.1, 0.34, M.frame, collector, 0, y, -0.08);
  const absorber = box(2.47, 3.15, 0.025, M.plate, collector, 0, 0, 0.0);
  cover(absorber, [-2.7, 0, 0.45], false);
  const tubes = group("Bonded copper risers", collector),
    riserMaterials = [];
  for (let i = 0; i < 8; i++) {
    const x = -1.05 + i * 0.3,
      m = M.copper.clone();
    riserMaterials.push(m);
    const route = pipe(
      [
        [x, -1.42, 0.065],
        [x, 0, 0.065],
        [x, 1.42, 0.065],
      ],
      m,
      tubes,
      0.028,
    );
    flowPath(route, "riser", 6);
    for (const y of [-1.1, 0, 1.1])
      box(0.08, 0.09, 0.012, M.copper, tubes, x, y, 0.03);
  }
  pipe(
    [
      [-1.16, -1.42, 0.065],
      [0, -1.42, 0.065],
      [1.16, -1.42, 0.065],
    ],
    M.copper,
    tubes,
    0.052,
  );
  pipe(
    [
      [-1.16, 1.42, 0.065],
      [0, 1.42, 0.065],
      [1.16, 1.42, 0.065],
    ],
    M.copper,
    tubes,
    0.052,
  );
  const glazing = group("Glazing and upper frame", collector);
  box(2.45, 3.15, 0.028, M.glass, glazing, 0, 0, 0.17);
  for (const x of [-1.25, 1.25])
    box(0.045, 3.22, 0.045, M.edge, glazing, x, 0, 0.17);
  for (const y of [-1.6, 1.6])
    box(2.54, 0.045, 0.045, M.edge, glazing, 0, y, 0.17);
  cover(glazing, [-2.7, 0, 1.3]);
  scene.updateMatrixWorld(true);
  for (const x of [-1.13, 1.13])
    for (const y of [-1.3, 1.3]) {
      const p = collector.localToWorld(new THREE.Vector3(x, y, -0.3));
      box(0.1, p.y, 0.1, M.frame, scene, p.x, p.y / 2, p.z);
      box(0.5, 0.07, 0.4, M.edge, scene, p.x, 0, p.z);
    }
  part(collector, "collector");
  const tank = group("Insulated storage tank");
  tank.position.set(2.3, 0.97, -0.3);
  tank.scale.set(0.63, 0.54, 0.63);
  const rear = mesh(
    new THREE.CylinderGeometry(
      0.71,
      0.71,
      2.95,
      48,
      1,
      true,
      Math.PI * 0.38,
      Math.PI * 1.24,
    ),
    M.tank,
    tank,
  );
  rear.material = M.tank.clone();
  rear.material.side = THREE.DoubleSide;
  const lining = mesh(
    new THREE.CylinderGeometry(
      0.65,
      0.65,
      2.9,
      48,
      1,
      true,
      Math.PI * 0.38,
      Math.PI * 1.24,
    ),
    M.insulation,
    tank,
  );
  lining.material = M.insulation.clone();
  lining.material.side = THREE.DoubleSide;
  const front = mesh(
    new THREE.CylinderGeometry(
      0.715,
      0.715,
      2.95,
      48,
      1,
      true,
      -Math.PI * 0.38,
      Math.PI * 0.76,
    ),
    M.tank,
    tank,
  );
  front.material = M.tank.clone();
  front.material.side = THREE.DoubleSide;
  cover(front, [1.65, 0, 0.25]);
  for (const y of [-1.49, 1.49]) cylinder(0.73, 0.08, M.edge, tank, 0, y);
  const water = [];
  for (let i = 0; i < 12; i++) {
    const m = mat("#559fbc", 0.05, 0.3, {
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    });
    const layer = cylinder(0.59, 0.225, m, tank, 0, -1.25 + i * 0.23);
    water.push(layer);
  }
  pipe(
    [
      [0, -1.2, 0],
      [0, -1.5, 0],
      [0.2, -1.55, 0.55],
    ],
    M.copper,
    tank,
    0.035,
  );
  for (const x of [-0.5, 0.5]) box(0.16, 0.22, 0.6, M.dark, tank, x, -1.61, 0);
  const tankBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.725, 0.02, 8, 64),
    M.frame,
  );
  tankBand.rotation.x = Math.PI / 2;
  tankBand.position.y = 0.92;
  tank.add(tankBand);
  part(tank, "tank");
  const pump = group("Circulation pump");
  pump.position.set(0.55, 0.4, 1.3);
  const body = cylinder(0.22, 0.27, M.frame, pump);
  body.rotation.x = Math.PI / 2;
  box(0.63, 0.1, 0.48, M.dark, pump, 0, -0.25, 0);
  const impeller = group("Pump impeller", pump);
  impeller.position.z = 0.15;
  cylinder(0.055, 0.1, M.edge, impeller).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU,
      b = box(0.17, 0.045, 0.025, M.copper, impeller);
    b.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0);
    b.rotation.z = a;
  }
  part(pump, "pump");
  const circuit = group("Water circulation");
  const coldEntry = collector
      .localToWorld(new THREE.Vector3(1.16, -1.42, 0.065))
      .toArray(),
    hotExit = collector
      .localToWorld(new THREE.Vector3(1.16, 1.42, 0.065))
      .toArray();
  const coldMaterial = M.pipe.clone(),
    hotMaterial = M.pipe.clone();
  const cold = pipe(
    [
      [2.3, 0.4, 0.15],
      [2.3, 0.35, 1.3],
      [0.55, 0.4, 1.3],
      [0.0, 0.4, 1.3],
      coldEntry,
    ],
    coldMaterial,
    circuit,
    0.055,
  );
  flowPath(cold, "cold", 18);
  const hot = pipe(
    [
      hotExit,
      [-0.55, 2.75, -0.6],
      [0.25, 2.9, -0.6],
      [1.6, 2.9, -0.6],
      [1.85, 1.59, -0.2],
    ],
    hotMaterial,
    circuit,
    0.055,
  );
  flowPath(hot, "hot", 18);
  part(circuit, "pipes");
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
      collector.quaternion,
    ),
    rayGeometry = new THREE.BufferGeometry(),
    rayPositions = new Float32Array(12 * 6);
  rayGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(rayPositions, 3),
  );
  const rayMaterial = new THREE.LineBasicMaterial({
    color: 0xdba340,
    transparent: true,
    opacity: 0.6,
  });
  const sunRays = new THREE.LineSegments(rayGeometry, rayMaterial);
  scene.add(sunRays);
  const rayTargets = [];
  for (let i = 0; i < 12; i++)
    rayTargets.push(
      collector.localToWorld(
        new THREE.Vector3(
          -0.9 + (i % 4) * 0.6,
          -1 + Math.floor(i / 4) * 0.9,
          0.2,
        ),
      ),
    );
  const sun = group("Solar source");
  sun.position.copy(collector.localToWorld(new THREE.Vector3(-1.3, 0.9, 2.3)));
  mesh(new THREE.SphereGeometry(0.22, 24, 16), M.sun, sun);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU,
      b = box(
        0.12,
        0.025,
        0.025,
        M.sun,
        sun,
        Math.cos(a) * 0.34,
        Math.sin(a) * 0.34,
        0,
      );
    b.rotation.z = a;
  }
  sun.traverse(object=>{object.castShadow=false;});
  label("☀ COLLECTOR · ADJUST", collector, [0, 1.8, 0.1], "collector");
  label("04 / STORAGE TANK", tank, [0, 1.75, 0], "tank");
  label("◉ PUMP · ADJUST FLOW", pump, [0, -0.38, 0.15], "pump");
  label("WARM WATER RETURN", circuit, [0.6, 3.07, -0.6], "pipes");
  return {
    host,
    scene,
    camera,
    renderer,
    M,
    sunlight,
    collector,
    parts,
    pickables,
    covers,
    labels,
    absorber,
    water,
    impeller,
    flowPaths,
    hotMaterial,
    coldMaterial,
    riserMaterials,
    sun,
    rayTargets,
    normal,
    sunRays,
    rayPositions,
  };
}
