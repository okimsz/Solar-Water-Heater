import { test } from "node:test";
import assert from "node:assert/strict";
import { state, C, rates, step } from "../src/physics.js";
const initial = { ...state };
test("collector and tank energy balances close across materials and flow rates", () => {
  for (const material of ["copper", "aluminum", "steel"])
    for (const coating of ["chrome", "black", "bare"])
      for (const flow of [0, 0.5, 5]) {
        const d = rates({
          ...initial,
          material,
          coating,
          flow,
          plate: 60,
          top: 35,
          bottom: 30,
        });
        const accumulation =
          d.plateRate * C.collectorCapacity +
          (d.topRate + d.bottomRate) * C.layerCapacity;
        assert.ok(
          Math.abs(
            accumulation -
              (d.absorbed - d.collectorLoss - d.topLoss - d.bottomLoss),
          ) < 1e-8,
        );
        assert.ok(
          Object.values(d)
            .filter((x) => typeof x === "number")
            .every(Number.isFinite),
        );
      }
});
test("zero flow stops heat delivery; less conductive metal reduces transfer", () => {
  assert.equal(rates({ ...initial, flow: 0 }).toWater, 0);
  assert.ok(
    rates({ ...initial, material: "copper" }).toWater >
      rates({ ...initial, material: "steel" }).toWater,
  );
  const chrome = rates({ ...initial, plate: 60, coating: "chrome" }),
    black = rates({ ...initial, plate: 60, coating: "black" });
  assert.equal(chrome.absorbed, black.absorbed);
  assert.ok(chrome.collectorLoss < black.collectorLoss);
});
test("solar heating raises storage temperature and pause freezes the experiment", () => {
  Object.assign(state, initial);
  for (let i = 0; i < 1200; i++) step(0.05);
  assert.ok(state.top > 26);
  assert.ok(state.top >= state.bottom);
  assert.ok(rates().storage > 0);
  state.running = false;
  const saved = { ...state };
  step(0.1);
  assert.deepEqual(state, saved);
  Object.assign(state, initial);
});
test("model pauses before leaving the liquid-temperature domain", () => {
  Object.assign(state, initial, { plate: 95, flow: 0, radiation: 1100 });
  step(0.1);
  assert.equal(state.running, false);
  assert.equal(state.limitReached, true);
  assert.equal(state.plate, 95);
  Object.assign(state, initial);
});
