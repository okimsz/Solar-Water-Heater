# SOLARIS — Solar water heater laboratory

Repository: https://github.com/okimsz/Solar-Water-Heater

```sh
git clone https://github.com/okimsz/Solar-Water-Heater.git
cd Solar-Water-Heater
```

A separate interactive 3D simulator matching the proposal's three controls:
solar radiation, water flow, and absorber metal/surface coating. Uses a pumped,
direct-circulation flat-plate collector and an approximately 80 L storage tank.

## Deploy to Render

[Deploy to Render](https://render.com/deploy?repo=https://github.com/okimsz/Solar-Water-Heater)

Sign in to Render, open the link above, review the static site, and deploy.
The repository's `render.yaml` supplies the build and publish settings.
Automatic deploys are off; use Manual Deploy in Render to publish future changes.

For manual setup, choose **New > Static Site** and connect this repository:

- Branch: `main`
- Root Directory: leave blank
- Build Command: `npm run build`
- Publish Directory: `dist`
- Environment variables: none required

The build creates `dist/index.html` for the homepage and retains
`dist/solar-water-heater.html` as the downloadable offline version.
Render serves these files directly; no start command is needed.

## Run in VS Code

Open this folder, install Node.js 20+ if needed, then:

```sh
npm run dev
```

Open http://127.0.0.1:5174. Keep the terminal running; stop it with Ctrl+C.
No `npm install` is needed. All runtime assets are included locally.
F5 can launch the included Chrome or Edge debug configuration.
If PowerShell blocks npm.ps1, use `npm.cmd run dev` or `node scripts/serve.mjs`.
Do not double-click `index.html`: ES modules require the local server.

## Offline HTML

Open `dist/solar-water-heater.html` directly in a WebGL-enabled browser.
It works without Node.js, a server, or internet. To rebuild it:

```sh
npm test
npm run build
```

The builder supports this project's relative named imports/exports. For more complex
module syntax, use a full JavaScript bundler. `dist/` is included in the ZIP but ignored
by Git; regenerate it after cloning or changing source code.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Controls, readings, guide and component descriptions |
| `src/styles.css` | Compact solar-themed interface |
| `src/physics.js` | Heat balance, collector effectiveness and two-node tank model |
| `src/scene.js` | Procedural collector, pipes, pump, glazing and tank |
| `src/app.js` | Animation, camera, interactions and CSV export |
| `src/errors.js` | Visible startup diagnostics |
| `scripts/` | Local preview server and single-file builder |
| `tests/` | Physics invariants and boundary conditions |
| `vendor/` | Three.js r160.1 and its MIT license |

## Experiment

- Click the collector or its floating label to open sunlight, metal and coating
  controls inside the 3D viewport. Click the pump or pipes for water flow controls.
- Click the tank to inspect its temperatures and model limits. Close the panel
  with its × button or Escape. Idle orbit waits while a control panel is open.
- Try the three guided challenges beside the live readings. Progress responds
  to actual simulated temperatures and settings. Reset clears challenge progress.
- Increase solar radiation to increase absorbed power.
- Adjust flow to compare heat delivery with return-water temperature.
- Set flow to zero to see stagnant collector heating; tank heat delivery stops.
- Compare copper, aluminum and steel absorber conductivity.
- Compare black chrome, matte black and uncoated surfaces. Selective coatings
  absorb strongly while emitting less thermal radiation.
- Switch assembled, cutaway and exploded views to inspect the layers.
- Click component cards or labels to focus. Drag/scroll/pinch to orbit and zoom.
- Pause freezes both thermal time and animation. Reset restores the experiment.
- Time runs at 30× by default; 1× and 60× are available.
- Save reading downloads a CSV snapshot with controls, temperatures and heat rates.
- Keyboard: 1/2/3 views, Space pause/resume, R reset camera.

## Model boundaries

Educational estimates, not engineering design or validated weather simulation.
The in-app guide documents equations and representative material constants.
Collector area is 2 m² and water mass is 80 kg in two mixed layers. Ambient stays
at 25 °C. The heat balance includes collector and tank losses. Changing the view
does not remove physical glazing or insulation from the mathematical model.

The model omits boiling, user draw-off, weather, freeze protection, pump electricity,
and an actual differential-temperature controller. Tank temperature at 85 °C stops
circulation; rising component temperature at 95 °C pauses the model. Lower radiation
and resume, or reset, to continue. These are model limits, not equipment safety ratings.
Water colors and arrows illustrate temperature and circulation. Pipe tracer motion
is slowed separately for readability. Hardware dimensions and routing are approximate.

No student names, signatures, or school approval claims from the proposal are included.
Reference links are in the in-app guide. Three.js is MIT licensed; see `vendor/three-LICENSE.txt`.
