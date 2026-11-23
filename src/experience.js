import { state, rates } from "./physics.js";

export function createExperience(activity) {
  const stage = document.getElementById("stage");
  const panel = document.createElement("section");
  panel.className = "machine-controls";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Selected machine controls");
  panel.innerHTML = `<div class="machine-heading"><strong id="machineTitle"></strong><button type="button" aria-label="Close machine controls">×</button></div><p class="machine-hint"></p><div class="machine-fields"></div>`;
  stage.append(panel);
  const fields = panel.querySelector(".machine-fields");
  const groups = {};
  for (const id of ["radiation", "flow", "material", "coating"]) {
    groups[id] = document.getElementById(id).closest(".control");
    fields.append(groups[id]);
  }
  const coatingInfo = document.querySelector(".coating-info");
  fields.append(coatingInfo);
  const tankInfo = document.createElement("p");
  tankInfo.className = "tank-explanation";
  fields.append(tankInfo);
  const close = () => { panel.hidden = true; activity(); };
  panel.querySelector("button").onclick = close;
  panel.addEventListener("pointerdown", activity);
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.querySelector(".console-title h2").textContent = "Live readings";
  document.querySelector(".headline h1").textContent = "Touch. Explore. Discover.";
  document.querySelector(".headline .eyebrow").textContent = "CLICK THE COLLECTOR OR PUMP TO EXPERIMENT";

  const challenge = document.createElement("section");
  challenge.className = "experiment-card";
  challenge.innerHTML = `<span class="eyebrow">TRY AN EXPERIMENT</span><h3></h3><p></p><progress max="1" value="0" aria-label="Experiment progress"></progress><div class="experiment-result" role="status" aria-live="polite"></div><button type="button">Start challenge</button>`;
  document.querySelector("aside").insertBefore(challenge, document.querySelector(".actions"));
  const missions = [
    ["Catch the sunshine", "Click the collector. Set sunlight to at least 950 W/m² with water flowing. Raise the upper tank temperature by 0.3 °C.", "Sunlight heated the absorber; flowing water carried that heat into storage."],
    ["Stop the circulation", "Click the pump and set flow to zero. With sunlight at 950 W/m² or more, watch the collector warm by 1 °C.", "The collector keeps absorbing energy, but stopped water cannot carry heat to the tank."],
    ["Look beneath the glass", "Choose Exploded, click the collector, and change its metal and coating from their starting values.", "The metal conducts heat to the tubes; the coating changes absorption and heat loss. Restore flow to continue heating the tank."],
  ];
  let mission = 0, active = false, complete = false, baseline;
  const button = challenge.querySelector("button");
  const result = challenge.querySelector(".experiment-result");
  function showMission() {
    challenge.querySelector("h3").textContent = `${mission + 1} / ${missions.length} · ${missions[mission][0]}`;
    challenge.querySelector("p").textContent = missions[mission][1];
    challenge.querySelector("progress").value = 0;
    result.textContent = "";
    button.textContent = "Start challenge";
  }
  button.onclick = () => {
    activity();
    if (complete) { mission = (mission + 1) % missions.length; active = complete = false; showMission(); return; }
    baseline = { top: state.top, plate: state.plate, material: state.material, coating: state.coating };
    active = true;
    button.textContent = "Restart challenge";
    result.textContent = "Experiment running · use the machine controls";
  };
  showMission();
  function open(id) {
    panel.hidden = false;
    const collector = id === "collector";
    for (const [key, el] of Object.entries(groups)) el.hidden = key === "flow" ? !(id === "pump" || id === "pipes") : !collector;
    coatingInfo.hidden = !collector;
    tankInfo.hidden = id !== "tank";
    document.getElementById("machineTitle").textContent = collector ? "Collector controls" : id === "tank" ? "Inside the storage tank" : "Circulation controls";
    panel.querySelector(".machine-hint").textContent = collector ? "Change the sunlight and absorber. Watch the water respond." : id === "tank" ? "Warm water collects above cooler water." : "Turn the flow down to stop heat delivery. Watch the arrows and impeller.";
  }
  function update() {
    tankInfo.textContent = `Upper layer ${state.top.toFixed(1)} °C · Lower layer ${state.bottom.toFixed(1)} °C. Circulation stops at 85 °C; heating pauses at the 95 °C model limit.`;
    if (!active || complete) return;
    let progress = 0;
    if (mission === 0 && state.radiation >= 950 && rates().actualFlow > 0) progress = (state.top - baseline.top) / 0.3;
    if (mission === 1 && state.radiation >= 950 && state.flow === 0) progress = (state.plate - baseline.plate);
    if (mission === 2) progress = ((state.view === "exploded") + (state.material !== baseline.material) + (state.coating !== baseline.coating)) / 3;
    challenge.querySelector("progress").value = Math.max(0, Math.min(1, progress));
    if (progress >= 1) {
      complete = true;
      result.textContent = "✓ Discovered! " + missions[mission][2];
      button.textContent = mission === missions.length - 1 ? "Explore again" : "Next challenge";
    }
  }
  function reset() { mission = 0; active = complete = false; showMission(); }
  return { open, update, reset, isOpen: () => !panel.hidden };
}
