// SI units. Representative classroom constants, not product specifications.
const MATERIALS = {
  copper: { name: "Copper", k: 385, color: "#b77c4e" },
  aluminum: { name: "Aluminum", k: 205, color: "#a4afb1" },
  steel: { name: "Steel", k: 50, color: "#687a80" },
};
const COATINGS = {
  chrome: { name: "Black chrome", alpha: 0.95, epsilon: 0.1, color: "#252e31" },
  black: { name: "Matte black", alpha: 0.95, epsilon: 0.9, color: "#323436" },
  bare: { name: "Bare metal", alpha: 0.35, epsilon: 0.15, color: null },
};
const C = {
  cp: 4180,
  area: 2,
  glass: 0.9,
  ambient: 25,
  collectorCapacity: 18000,
  layerCapacity: 40 * 4180,
  tankLoss: 1.2,
  mixing: 5,
};
const state = {
  radiation: 800,
  flow: 1.5,
  material: "copper",
  coating: "chrome",
  plate: 32,
  top: 25,
  bottom: 25,
  time: 0,
  energy: 0,
  running: true,
  limitReached: false,
  speed: 30,
  phase: 0,
  pumpAngle: 0,
  view: "cutaway",
  explode: 0,
  labels: true,
  tour: false,
  autoIdle: true,
  lastInput: 0,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, t) => a + (b - a) * t,
  TAU = 2 * Math.PI;
function rates(s = state) {
  const material = MATERIALS[s.material],
    coat = COATINGS[s.coating];
  const mL = Math.sqrt((2 * 12) / (material.k * 0.0005)) * 0.045;
  const finEfficiency = Math.tanh(mL) / mL;
  const ua = 180 * finEfficiency;
  const massFlow = s.flow / 60;
  // Circulation stops above 85 C; no phase change is modeled.
  const limited = Math.max(s.top, s.bottom) >= 85;
  const actualFlow = limited ? 0 : massFlow;
  const heatCapacityRate = actualFlow * C.cp;
  const effectiveness =
    actualFlow > 0 ? 1 - Math.exp(-ua / heatCapacityRate) : 0;
  const absorbed = s.radiation * C.area * C.glass * coat.alpha;
  const radiative =
    coat.epsilon *
    5.670374419e-8 *
    ((s.plate + 273.15) ** 4 - (C.ambient + 273.15) ** 4);
  const collectorLoss = C.area * (3 * (s.plate - C.ambient) + radiative);
  const toWater = heatCapacityRate * effectiveness * (s.plate - s.bottom);
  const outlet =
    actualFlow > 0 ? s.bottom + toWater / heatCapacityRate : s.plate;
  const topLoss = C.tankLoss * (s.top - C.ambient),
    bottomLoss = C.tankLoss * (s.bottom - C.ambient);
  // Mixing is stronger when the two-node approximation predicts an inversion.
  const mixing = (s.bottom > s.top ? 60 : C.mixing) * (s.top - s.bottom);
  const plateRate = (absorbed - collectorLoss - toWater) / C.collectorCapacity;
  const topRate =
    (heatCapacityRate * (outlet - s.top) - mixing - topLoss) / C.layerCapacity;
  const bottomRate =
    (heatCapacityRate * (s.top - s.bottom) + mixing - bottomLoss) /
    C.layerCapacity;
  const storedRate = toWater - topLoss - bottomLoss;
  const storage =
    ((s.top + s.bottom - 2 * C.ambient) * C.layerCapacity) / 3600000;
  return {
    absorbed,
    collectorLoss,
    toWater,
    outlet,
    topLoss,
    bottomLoss,
    storedRate,
    storage,
    plateRate,
    topRate,
    bottomRate,
    actualFlow,
    limited,
    finEfficiency,
    ua,
    effectiveness,
    efficiency: s.radiation > 0 ? toWater / (s.radiation * C.area) : null,
  };
}
function step(realDt) {
  if (!state.running) return rates();
  const duration = clamp(realDt, 0, 0.1) * state.speed;
  let remaining = duration;
  while (remaining > 1e-8) {
    const dt = Math.min(0.1, remaining),
      r = rates();
    if (
      (state.plate >= 95 && r.plateRate > 0) ||
      (state.top >= 95 && r.topRate > 0) ||
      (state.bottom >= 95 && r.bottomRate > 0)
    ) {
      state.limitReached = true;
      state.running = false;
      break;
    }
    state.plate += r.plateRate * dt;
    state.top += r.topRate * dt;
    state.bottom += r.bottomRate * dt;
    state.energy += (r.toWater * dt) / 3600000;
    state.time += dt;
    remaining -= dt;
  }
  const r = rates();
  // Tracers are slowed visual cues, not individual molecules. They obey pause/zero flow.
  state.phase = (state.phase + r.actualFlow * realDt * 3) % 1;
  state.pumpAngle = (state.pumpAngle + r.actualFlow * realDt * TAU * 80) % TAU;
  return r;
}
export { state, C, MATERIALS, COATINGS, clamp, lerp, TAU, rates, step };
