import {
  state,
  C,
  MATERIALS,
  COATINGS,
  clamp,
  lerp,
  TAU,
  rates,
  step,
} from "./physics.js";
import { createWorld } from "./scene.js";
import { createExperience } from "./experience.js";
const $ = (id) => document.getElementById(id),
  world = createWorld(selectPart);
const { host, scene, camera, renderer } = world;
const defaults = { ...state };
const experience = createExperience(activity);
let selected = "collector";
const descriptions = {
  collector: [
    "01",
    "Flat-plate collector",
    "Sunlight passes through the glazing. The coated absorber heats the water in the bonded copper riser tubes.",
    [-2, 1.5, 0],
    7.8,
  ],
  tank: [
    "04",
    "Stratified storage tank",
    "Warmer water returns near the top. The insulated tank retains heat while its upper and lower layers slowly mix.",
    [2.3, 1.8, 0],
    7,
  ],
  pump: [
    "03",
    "Circulation pump",
    "The pump sends cooler water from the lower tank to the collector. Set flow to zero to see stagnation heating.",
    [0.55, 0.5, 1.3],
    5.8,
  ],
  pipes: [
    "02",
    "Water circulation",
    "The lower line supplies cooler water to the collector. The upper line returns heated water to storage.",
    [0, 1.8, 0],
    10.5,
  ],
};
const target = new THREE.Vector3(0, 1.65, 0),
  desiredTarget = target.clone();
let theta = 0.23,
  phi = 1.02,
  radius = 12.5,
  desiredTheta = theta,
  desiredPhi = phi,
  desiredRadius = radius;
let lastTime = performance.now(),
  lastUI = 0,
  lightPhase = 0;
state.lastInput = lastTime;
function activity() {
  state.lastInput = performance.now();
  state.tour = false;
  syncTour();
}
function syncTour() {
  $("tourButton").classList.toggle("active", state.tour);
  $("tourButton").setAttribute("aria-pressed", state.tour);
  $("orbitHint").textContent = state.tour
    ? "ORBIT TOUR · DRAG TO TAKE CONTROL"
    : "DRAG TO ORBIT · SCROLL TO ZOOM";
}
function home(manual = true) {
  if (manual) activity();
  desiredTarget.set(0, 1.65, 0);
  desiredTheta = 0.23;
  desiredPhi = 1.02;
  desiredRadius = state.view === "exploded" ? 14.5 : 12.5;
}
function setView(view) {
  activity();
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-pressed", b.dataset.view === view);
  });
  home(false);
}
function selectPart(id) {
  activity();
  experience.open(id);
  selected = id;
  const d = descriptions[id];
  $("partNumber").textContent = d[0];
  $("partTitle").textContent = d[1];
  $("partDescription").textContent = d[2];
  document
    .querySelectorAll("[data-part]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.part === id));
  if (state.view === "assembled") setView("cutaway");
  desiredTarget.set(...d[3]);
  desiredRadius = d[4];
  desiredTheta = 0.23;
  desiredPhi = 1.05;
}
function paintControls() {
  for (const id of ["radiation", "flow", "material", "coating", "speed"])
    $(id).value = state[id];
  $("radiationValue").textContent = state.radiation + " W/m²";
  $("flowValue").textContent = state.flow.toFixed(1) + " L/min";
  $("conductivity").textContent = "k = " + MATERIALS[state.material].k;
  $("alpha").textContent = COATINGS[state.coating].alpha.toFixed(2);
  $("epsilon").textContent = COATINGS[state.coating].epsilon.toFixed(2);
  $("pauseButton").textContent = state.running ? "Ⅱ Pause" : "▶ Resume";
  $("pauseButton").setAttribute("aria-pressed", !state.running);
}
const cold = new THREE.Color("#458faf"),
  warm = new THREE.Color("#d66a4c"),
  tempColor = (t) => cold.clone().lerp(warm, clamp((t - 25) / 60, 0, 1)),
  up = new THREE.Vector3(0, 1, 0);
function updateUI(data) {
  $("topTemperature").textContent = state.top.toFixed(1);
  $("bottomTemperature").textContent = state.bottom.toFixed(1) + " °C";
  $("plateTemperature").textContent = state.plate.toFixed(1);
  $("waterPower").textContent = Math.round(data.toWater).toLocaleString(
    "en-US",
  );
  $("absorbed").innerHTML =
    Math.round(data.absorbed) + " <small>W absorbed</small>";
  $("outlet").innerHTML =
    (data.actualFlow > 0 ? data.outlet.toFixed(1) : "—") +
    " <small>°C return</small>";
  $("actualFlow").innerHTML =
    (data.actualFlow * 60).toFixed(1) + " <small>L/min</small>";
  $("stored").innerHTML =
    data.storage.toFixed(3) + " <small>kWh stored</small>";
  const minutes = Math.floor(state.time / 60),
    seconds = Math.floor(state.time % 60);
  $("elapsed").textContent =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  $("status").textContent = state.limitReached
    ? "MODEL TEMPERATURE LIMIT"
    : !state.running
      ? "SIMULATION PAUSED"
      : data.limited
        ? "TANK LIMIT · PUMP STOPPED"
        : state.flow === 0
          ? "NO FLOW · STAGNATION"
          : data.toWater < 0
            ? "WATER LOSING HEAT"
            : state.radiation === 0
              ? "NO SOLAR INPUT"
              : "COLLECTING SUNLIGHT";
  if (state.limitReached) paintControls();
}
function resize() {
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(host.clientWidth, host.clientHeight, false);
}
new ResizeObserver(resize).observe(host);
resize();
function frame(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;
  const data = step(dt),
    ease = 1 - Math.exp(-dt * 5);
  state.explode = lerp(state.explode, state.view === "exploded" ? 1 : 0, ease);
  world.covers.forEach((c) => {
    c.o.position.copy(c.base).addScaledVector(c.offset, state.explode);
    c.o.visible =
      !c.hideCut ||
      state.view === "assembled" ||
      state.view === "exploded" ||
      state.explode > 0.02;
  });
  world.M.plate.color.set(
    COATINGS[state.coating].color || MATERIALS[state.material].color,
  );
  world.water.forEach((layer, i) =>
    layer.material.color.copy(tempColor(lerp(state.bottom, state.top, i / 11))),
  );
  world.hotMaterial.color.copy(tempColor(data.outlet));
  world.coldMaterial.color.copy(tempColor(state.bottom));
  world.riserMaterials.forEach((m) =>
    m.color
      .copy(tempColor((state.bottom + data.outlet) / 2))
      .lerp(new THREE.Color("#b57d50"), 0.4),
  );
  world.impeller.rotation.z = state.pumpAngle;
  world.flowPaths.forEach((p) =>
    p.arrows.forEach((a, i) => {
      const t = (state.phase + i / p.arrows.length) % 1;
      a.visible = data.actualFlow > 0;
      a.position.copy(p.curve.getPointAt(t));
      a.quaternion.setFromUnitVectors(up, p.curve.getTangentAt(t).normalize());
      a.material.color.copy(
        tempColor(
          p.kind === "cold"
            ? state.bottom
            : p.kind === "hot"
              ? data.outlet
              : lerp(state.bottom, data.outlet, t),
        ),
      );
    }),
  );
  if (state.running) lightPhase = (lightPhase + dt * 0.35) % 1;
  world.sunlight.intensity = 1.4 + (state.radiation / 1100) * 2.3;
  world.sun.visible = state.radiation > 0;
  world.sunRays.visible = state.radiation > 0;
  world.sunRays.material.opacity = (state.radiation / 1100) * 0.6;
  world.rayTargets.forEach((p, i) => {
    const f = (lightPhase + i * 0.071) % 1,
      start = p.clone().addScaledVector(world.normal, 0.1 + (1 - f) * 1.8),
      end = start.clone().addScaledVector(world.normal, 0.28);
    start.toArray(world.rayPositions, i * 6);
    end.toArray(world.rayPositions, i * 6 + 3);
  });
  world.sunRays.geometry.attributes.position.needsUpdate = true;
  if (state.autoIdle && !state.tour && !experience.isOpen() && now - state.lastInput > 12000) {
    state.tour = true;
    home(false);
    syncTour();
  }
  if (state.tour) {
    desiredTheta += dt * 0.065;
    desiredPhi = 1.02 + Math.sin(now * 0.00015) * 0.08;
  }
  target.lerp(desiredTarget, ease);
  theta = lerp(theta, desiredTheta, ease);
  phi = lerp(phi, desiredPhi, ease);
  radius = lerp(radius, desiredRadius, ease);
  const r = radius * Math.max(1, 1.3 / camera.aspect);
  camera.position.set(
    target.x + r * Math.sin(phi) * Math.sin(theta),
    target.y + r * Math.cos(phi),
    target.z + r * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  world.labels.forEach(({ el, g, p }) => {
    const v = g.localToWorld(p.clone()).project(camera),
      x = (v.x * 0.5 + 0.5) * host.clientWidth,
      y = (-v.y * 0.5 + 0.5) * host.clientHeight;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.classList.toggle(
      "hidden",
      !state.labels ||
        v.z > 1 ||
        v.z < -1 ||
        x < 78 ||
        x > host.clientWidth - 78 ||
        y < 150 ||
        y > host.clientHeight - 105,
    );
  });
  renderer.render(scene, camera);
  window.__solarStartup?.ready();
  if (now - lastUI > 150) {
    lastUI = now;
    updateUI(data);
    experience.update();
  }
  window.SIM.telemetry = data;
  requestAnimationFrame(frame);
}
const pointers = new Map();
let origin,
  moved = false,
  pinch = 0;
host.addEventListener("pointerdown", (e) => {
  activity();
  host.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  origin = { x: e.clientX, y: e.clientY };
  moved = false;
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    moved = true;
  }
});
host.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  activity();
  const prev = pointers.get(e.pointerId);
  if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 4) moved = true;
  if (pointers.size === 1) {
    desiredTheta -= (e.clientX - prev.x) * 0.006;
    desiredPhi = clamp(desiredPhi - (e.clientY - prev.y) * 0.006, 0.3, 1.65);
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const p = [...pointers.values()],
      d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    desiredRadius = clamp((desiredRadius * pinch) / Math.max(d, 1), 4, 24);
    pinch = d;
  }
});
const ray = new THREE.Raycaster();
host.addEventListener("pointerup", (e) => {
  if (!moved && pointers.size === 1) {
    const rect = host.getBoundingClientRect();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray.intersectObjects(world.pickables).find((h) => {
      let o = h.object;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    });
    if (hit) selectPart(hit.object.userData.part);
  }
  pointers.delete(e.pointerId);
});
for (const event of ["pointercancel", "lostpointercapture"])
  host.addEventListener(event, (e) => pointers.delete(e.pointerId));
host.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    activity();
    desiredRadius = clamp(desiredRadius * Math.exp(e.deltaY * 0.001), 4, 24);
  },
  { passive: false },
);
for (const id of ["radiation", "flow", "material", "coating", "speed"])
  $(id).addEventListener(
    id === "material" || id === "coating" || id === "speed"
      ? "change"
      : "input",
    () => {
      activity();
      state[id] =
        id === "material" || id === "coating"
          ? $(id).value
          : Number($(id).value);
      paintControls();
    },
  );
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => setView(b.dataset.view)));
document
  .querySelectorAll("[data-part]")
  .forEach((b) => (b.onclick = () => selectPart(b.dataset.part)));
$("pauseButton").onclick = () => {
  activity();
  state.running = !state.running;
  state.limitReached = false;
  paintControls();
};
$("resetButton").onclick = () => {
  experience.reset();
  Object.assign(state, defaults);
  state.limitReached = false;
  activity();
  paintControls();
  selectPart("collector");
  setView("cutaway");
  $("labelsButton").classList.add("active");
  $("labelsButton").setAttribute("aria-pressed", "true");
};
$("resetView").onclick = () => home();
$("labelsButton").onclick = () => {
  activity();
  state.labels = !state.labels;
  $("labelsButton").classList.toggle("active", state.labels);
  $("labelsButton").setAttribute("aria-pressed", state.labels);
};
$("tourButton").onclick = () => {
  state.tour = !state.tour;
  state.autoIdle = state.tour;
  state.lastInput = performance.now();
  if (state.tour) home(false);
  syncTour();
};
$("guideButton").onclick = () => {
  activity();
  $("guide").showModal();
};
$("closeGuide").onclick = () => $("guide").close();
$("exportButton").onclick = () => {
  activity();
  const d = rates(),
    row = {
      elapsed_seconds: state.time.toFixed(1),
      radiation_W_m2: state.radiation,
      flow_L_min: state.flow,
      actual_flow_L_min: (d.actualFlow * 60).toFixed(3),
      material: state.material,
      coating: state.coating,
      plate_C: state.plate.toFixed(3),
      tank_top_C: state.top.toFixed(3),
      tank_bottom_C: state.bottom.toFixed(3),
      return_C: d.actualFlow > 0 ? d.outlet.toFixed(3) : "",
      absorbed_W: d.absorbed.toFixed(2),
      heat_to_water_W: d.toWater.toFixed(2),
      stored_kWh: d.storage.toFixed(5),
    };
  const blob = new Blob(
      [
        Object.keys(row).join(",") +
          "\r\n" +
          Object.values(row).join(",") +
          "\r\n",
      ],
      { type: "text/csv;charset=utf-8" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "solaris-reading.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.addEventListener("keydown", (e) => {
  if (
    $("guide").open ||
    /INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    $("pauseButton").click();
  }
  if (["1", "2", "3"].includes(e.key))
    setView(["assembled", "cutaway", "exploded"][Number(e.key) - 1]);
  if (e.key.toLowerCase() === "r") home();
});
document.addEventListener("visibilitychange", () => {
  lastTime = performance.now();
  state.lastInput = lastTime;
});
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  state.autoIdle = false;
  state.running = false;
  paintControls();
}
window.SIM = {
  state,
  world,
  rates,
  step,
  setView,
  selectPart,
  telemetry: null,
  ready: true,
};
requestAnimationFrame(frame);
