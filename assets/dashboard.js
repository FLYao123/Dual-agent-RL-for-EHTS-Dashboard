
const scenarioManifest = window.EHTS_SCENARIO_MANIFEST;
const scenarioIds = scenarioManifest.map((item) => item.id);
const scenarioMeta = Object.fromEntries(scenarioManifest.map((item) => [item.id, item]));
const scenarios = window.EHTS_SCENARIO_DATA = window.EHTS_SCENARIO_DATA || {};
const scenarioLoads = {};
const AUTO_INTERVAL_MS = 1200;
const BAR_WIDTH_HOURS = 0.20;
const PLOTLY_COLORS = ["#636EFA", "#EF553B", "#00CC96", "#AB63FA", "#FFA15A", "#19D3F3", "#FF6692"];

let currentScenario = scenarioIds[0];
let currentView = "home";
let timeMode = "auto";
let autoPlaying = true;
let autoTimer = null;
let rendering = false;
let renderQueued = false;
let scenarioRequest = 0;

const scenarioSelect = document.getElementById("scenario-select");
const scenarioGrid = document.getElementById("scenario-grid");
const startDayInput = document.getElementById("start-day");
const daysInput = document.getElementById("days-shown");
const playToggle = document.getElementById("play-toggle");
const modeAuto = document.getElementById("mode-auto");
const modeManual = document.getElementById("mode-manual");
const diagnosticsPanel = document.getElementById("diagnostics-panel");
const diagnosticsBackdrop = document.getElementById("diagnostics-backdrop");

function scenario() {
  return scenarios[currentScenario];
}

function loadScenario(id) {
  if (scenarios[id]) return Promise.resolve(scenarios[id]);
  if (scenarioLoads[id]) return scenarioLoads[id];
  scenarioLoads[id] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `data/${id}.js`;
    script.onload = () => {
      if (!scenarios[id]) {
        reject(new Error(`${id} loaded without a scenario payload.`));
        return;
      }
      resolve(scenarios[id]);
    };
    script.onerror = () => reject(new Error(`Could not load data/${id}.js`));
    document.head.appendChild(script);
  });
  return scenarioLoads[id];
}

function col(name) {
  return scenario().columns[name] || [];
}

function availableDays() {
  return scenario().displayDays || Math.ceil(scenario().rows / scenario().stepsPerDay);
}

function clampWindow() {
  const s = scenario();
  const days = Math.min(Math.max(1, Math.round(Number(daysInput.value) || 1)), Math.min(31, availableDays()));
  const maxStart = Math.max(0, availableDays() - days);
  const requestedStart = Math.max(1, Math.round(Number(startDayInput.value) || 1)) - 1;
  const startDay = Math.min(requestedStart, maxStart);
  startDayInput.value = String(startDay + 1);
  daysInput.value = String(days);
  startDayInput.max = String(maxStart + 1);
  daysInput.max = String(Math.min(31, availableDays()));
  const start = startDay * s.stepsPerDay;
  const end = start + days * s.stepsPerDay;
  return { start, end, startDay, days, maxStart };
}

function slice(name, bounds) {
  const values = col(name);
  if (!values.length) return [];
  const visible = [];
  for (let index = bounds.start; index < bounds.end; index += 1) {
    visible.push(values[index % values.length]);
  }
  return visible;
}

function xValues(bounds) {
  const s = scenario();
  const values = [];
  for (let i = bounds.start; i < bounds.end; i += 1) values.push((i - bounds.start) * s.dtHours);
  return values;
}

function timeAxis(bounds) {
  const intervalHours = bounds.days <= 2 ? 3 : bounds.days <= 7 ? 6 : 12;
  const visibleHours = (bounds.end - bounds.start) * scenario().dtHours;
  const tickvals = [];
  const ticktext = [];
  for (let hour = 0; hour < visibleHours - 1e-9; hour += intervalHours) {
    const day = Math.floor(hour / 24) + 1;
    const hourOfDay = Math.floor(hour % 24);
    const minute = Math.round((hour % 1) * 60);
    tickvals.push(hour);
    ticktext.push(`D${day} ${String(hourOfDay).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return {
    title: "Time",
    tickmode: "array",
    tickvals,
    ticktext,
    tickangle: 90,
    range: [-scenario().dtHours / 2, Math.max(scenario().dtHours / 2, visibleHours - scenario().dtHours / 2)],
    showgrid: false,
    zeroline: false,
    showline: true,
    mirror: true,
    linecolor: "#B8C4D8",
    linewidth: 1,
  };
}

function baseLayout(yTitle, extra = {}) {
  const bounds = clampWindow();
  const layout = {
    autosize: true,
    margin: { l: 58, r: extra.yaxis2 ? 58 : 24, t: 42, b: 82 },
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    hovermode: "x unified",
    barmode: extra.barmode || "relative",
    bargap: 0,
    font: { family: '"Times New Roman", Georgia, serif', size: 13, color: "#172334" },
    legend: {
      orientation: "h",
      x: 0.01,
      xanchor: "left",
      y: 1.03,
      yanchor: "bottom",
      font: { size: 12 },
      bgcolor: "rgba(255,255,255,0)",
      traceorder: "normal",
    },
    xaxis: timeAxis(bounds),
    yaxis: {
      title: yTitle,
      showgrid: true,
      gridcolor: "#E5ECF6",
      zeroline: false,
      showline: true,
      mirror: true,
      linecolor: "#B8C4D8",
      linewidth: 1,
      ...extra.yaxis,
    },
  };
  if (extra.yaxis2) {
    layout.yaxis2 = {
      overlaying: "y",
      side: "right",
      showgrid: false,
      zeroline: false,
      showline: true,
      linecolor: "#B8C4D8",
      linewidth: 1,
      ...extra.yaxis2,
    };
  }
  return layout;
}

function line(bounds, name, label, color, options = {}) {
  return {
    x: xValues(bounds),
    y: slice(name, bounds),
    type: "scatter",
    mode: "lines",
    name: label,
    line: { color, width: options.width || 2, dash: options.dash || "solid" },
    yaxis: options.yaxis,
    legendrank: options.legendrank,
  };
}

function bar(bounds, name, label, color, options = {}) {
  return {
    x: xValues(bounds),
    y: slice(name, bounds),
    type: "bar",
    name: label,
    marker: { color },
    opacity: options.opacity ?? 0.9,
    width: BAR_WIDTH_HOURS,
    yaxis: options.yaxis,
    legendrank: options.legendrank,
  };
}

async function drawPlot(divId, traces, yTitle, extra = {}) {
  const target = document.getElementById(divId);
  if (!target) return;
  target.classList.add("is-rendering");
  try {
    await Plotly.react(target, traces, baseLayout(yTitle, extra), {
      displayModeBar: false,
      responsive: true,
      scrollZoom: false,
    });
    Plotly.Plots.resize(target);
  } catch (error) {
    console.error(`Failed to render ${divId}`, error);
    target.innerHTML = '<p class="plot-error">This panel could not be rendered.</p>';
  } finally {
    target.classList.remove("is-rendering");
  }
}

async function renderVehicle(bounds) {
  await Promise.all([
    drawPlot("ev-flow", [
      bar(bounds, "ev_assigned", "EV Assigned", "blue", { opacity: 0.6 }),
      line(bounds, "ev_arrivals", "EV Arrivals", "royalblue", { dash: "dot" }),
      line(bounds, "ev_waiting", "EV Waiting", "orange", { yaxis: "y2", width: 2 }),
    ], "Arrivals / Assigned (EV)", { yaxis2: { title: "Waiting EVs" } }),
    drawPlot("charger-util", scenario().evUtilColumns.map((name, idx) =>
      line(bounds, name, `Charger ${idx + 1}`, PLOTLY_COLORS[idx % PLOTLY_COLORS.length], { width: 1.5 })
    ), "Charger Utilisation (%)", { yaxis: { range: [0, 100] } }),
    drawPlot("hv-flow", [
      bar(bounds, "hv_assigned", "HV Assigned", "green", { opacity: 0.6 }),
      line(bounds, "hv_arrivals", "HV Arrivals", "darkgreen", { dash: "dot" }),
      line(bounds, "hv_waiting", "HV Waiting", "red", { yaxis: "y2", width: 2 }),
    ], "Arrivals / Assigned (HV)", { yaxis2: { title: "Waiting HVs" } }),
    drawPlot("refueler-util", scenario().hvUtilColumns.map((name, idx) =>
      line(bounds, name, `Refueller ${idx + 1}`, PLOTLY_COLORS[idx % PLOTLY_COLORS.length], { width: 1.5 })
    ), "Refueller Utilisation (%)", { yaxis: { range: [0, 100] } }),
  ]);
}

async function renderEnergy(bounds) {
  await Promise.all([
    drawPlot("pv-weather", [
      line(bounds, "P_pv", "PV Generation (kW)", "orange"),
      line(bounds, "G_t_scaled", "Solar Irradiance (scaled)", "#FFD700", { yaxis: "y2", dash: "dot" }),
      line(bounds, "T_am_scaled", "Ambient Temp (scaled)", "red", { yaxis: "y2", dash: "dot" }),
    ], "PV Power (kW)", { yaxis2: { title: "Irradiance / Temp (scaled)", range: [0, 1] } }),
    drawPlot("pv-breakdown", [
      bar(bounds, "P_pv_cc", "PV->Charger", "royalblue"),
      bar(bounds, "P_pv_bt", "PV->Battery", "seagreen"),
      bar(bounds, "P_pv_el", "PV->Electrolyser", "orange"),
      bar(bounds, "P_pv_cur", "PV->Curtailed", "lightgray", { opacity: 0.85 }),
    ], "PV Utilisation (kW)"),
    drawPlot("electric-dispatch", [
      bar(bounds, "P_batt_cc", "Actual Discharge (kW)", "blue"),
      bar(bounds, "pv_to_batt_charge", "PV->Battery (Charge)", "green"),
      bar(bounds, "grid_to_batt_charge", "Grid->Battery (Charge)", "steelblue"),
      line(bounds, "p_elec", "Electricity Price (£/kWh)", "black", { yaxis: "y2", dash: "dot" }),
    ], "Battery Power Flow (+/-kW)", { yaxis2: { title: "Price (£/kWh)" } }),
    drawPlot("hydrogen-dispatch", [
      bar(bounds, "H_tank_rc_rate", "Actual Discharge", "green"),
      bar(bounds, "pv_to_tank_charge", "PV->Tank (Charge)", "gold"),
      bar(bounds, "pipe_to_tank_charge", "Pipeline->Tank (Charge)", "darkseagreen"),
      line(bounds, "p_h2", "Hydrogen Price (£/Nm³)", "gray", { yaxis: "y2", dash: "dot" }),
    ], "Hydrogen Flow (+/-Nm³/h)", { yaxis2: { title: "Price (£/Nm³)" } }),
    drawPlot("storage-soc", [
      bar(bounds, "soc_b", "Battery SOC", "blue", { opacity: 0.5 }),
      bar(bounds, "soc_h", "H2 Tank SOC", "green", { opacity: 0.5 }),
    ], "SOC", { barmode: "group", yaxis: { range: [0, 1.35] } }),
  ]);
}

async function renderBalance(bounds) {
  await Promise.all([
    drawPlot("electric-balance", [
      line(bounds, "P_pile_demand", "EV Power Demand", "blue", { legendrank: 1 }),
      bar(bounds, "P_batt_cc", "Battery->Charger", "deepskyblue", { opacity: 0.85, legendrank: 2 }),
      bar(bounds, "P_pv_cc", "PV->Charger", "orange", { opacity: 0.85, legendrank: 3 }),
      bar(bounds, "P_grid_cc", "Grid Supply", "black", { opacity: 0.85, legendrank: 4 }),
    ], "Power (kW)"),
    drawPlot("hydrogen-balance", [
      line(bounds, "H_hv_demand_rate", "HV H2 Demand", "green", { legendrank: 1 }),
      bar(bounds, "H_tank_rc_rate", "Tank->Refueller", "limegreen", { opacity: 0.85, legendrank: 2 }),
      bar(bounds, "H_pipe_rc_rate", "Pipeline->Refueller", "gray", { opacity: 0.85, legendrank: 3 }),
    ], "Hydrogen Flow (Nm³/h)"),
    drawPlot("mismatch", [
      line(bounds, "abs_Delta_P_elec", "|Delta P| Electric", "blue"),
      line(bounds, "abs_Delta_H_h2", "|Delta H| Hydrogen", "green"),
      line(bounds, "threshold_1e_3", "Threshold 1e-3", "red", { dash: "dot" }),
      line(bounds, "abs_Delta_PV", "|Delta PV| PV Mismatch", "orange", { dash: "dot" }),
    ], "|Mismatch| (log scale)", { yaxis: { type: "log" } }),
  ]);
}

function sum(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function mean(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? sum(valid) / valid.length : 0;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? 100 * numerator / denominator : 0;
}

function sumProduct(left, right) {
  const count = Math.min(left.length, right.length);
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    if (Number.isFinite(left[i]) && Number.isFinite(right[i])) total += left[i] * right[i];
  }
  return total;
}

function maximum(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.max(...valid) : 0;
}

function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function formatMoney(value) {
  return Number.isFinite(value) ? `£${formatNumber(value)}` : "-";
}

function formatHalfCount(value) {
  return formatNumber(Math.round(value / 2));
}

function updateWindowSummary(bounds) {
  const s = scenario();
  const dt = s.dtHours;
  const pv = slice("P_pv", bounds);
  const gridToBattery = slice("P_grid_batt_purchase", bounds);
  const pipeToTank = slice("H_pipe_tank_purchase", bounds);
  const grid = slice("P_grid_cc", bounds).map((value, index) =>
    value + gridToBattery[index]
  );
  const pipe = slice("H_pipe_rc_rate", bounds).map((value, index) =>
    value + pipeToTank[index]
  );
  const pvCurtailed = slice("P_pv_cur", bounds);
  const electricityPrice = slice("p_elec", bounds);
  const hydrogenPrice = slice("p_h2", bounds);
  const evServed = sum(slice("ev_assigned", bounds));
  const hvServed = sum(slice("hv_assigned", bounds));
  const cards = [
    ["PV generated", `${formatNumber(sum(pv) * dt)} kWh`, "Visible window"],
    ["Grid purchased", `${formatNumber(sum(grid) * dt)} kWh`, formatMoney(sumProduct(grid, electricityPrice) * dt)],
    ["Pipeline H2 purchased", `${formatNumber(sum(pipe) * dt)} Nm³`, formatMoney(sumProduct(pipe, hydrogenPrice) * dt)],
    ["PV curtailed", `${formatNumber(sum(pvCurtailed) * dt)} kWh`, `${formatMoney(sumProduct(pvCurtailed, electricityPrice) * dt)} value`],
    ["Vehicles served", formatHalfCount(evServed + hvServed), `EV ${formatHalfCount(evServed)} / HV ${formatHalfCount(hvServed)}`],
    ["Peak waiting", `EV ${formatNumber(maximum(slice("ev_waiting", bounds)))} / HV ${formatNumber(maximum(slice("hv_waiting", bounds)))}`, "vehicles"],
    ["Peak EV demand", `${formatNumber(maximum(slice("P_pile_demand", bounds)))} kW`, "charging demand"],
    ["Peak HV demand", `${formatNumber(maximum(slice("H_hv_demand_rate", bounds)))} Nm³/h`, "hydrogen demand"],
  ];
  document.getElementById("window-summary-grid").innerHTML = cards.map(([label, value, sub]) => `
    <article class="week-summary__card">
      <div class="week-summary__label">${label}</div>
      <div class="week-summary__value">${value}</div>
      <div class="week-summary__sub">${sub}</div>
    </article>
  `).join("");
}

async function renderDiagnostics(bounds) {
  if (diagnosticsPanel.hidden) return;
  const s = scenario();
  const evDemand = sum(slice("P_pile_demand", bounds)) * s.dtHours;
  const gridSupply = (sum(slice("P_grid_cc", bounds)) + sum(slice("P_grid_batt_purchase", bounds))) * s.dtHours;
  const hvDemand = sum(slice("H_hv_demand_rate", bounds)) * s.dtHours;
  const pipeSupply = (sum(slice("H_pipe_rc_rate", bounds)) + sum(slice("H_pipe_tank_purchase", bounds))) * s.dtHours;
  const samples = Math.max(1, bounds.end - bounds.start);
  const battHigh = ratio(slice("soc_b", bounds).filter((value) => value >= s.socHighThreshold).length, samples);
  const tankHigh = ratio(slice("soc_h", bounds).filter((value) => value >= s.socHighThreshold).length, samples);
  const evUtil = mean(s.evUtilColumns.flatMap((name) => slice(name, bounds)));
  const hvUtil = mean(s.hvUtilColumns.flatMap((name) => slice(name, bounds)));
  const energyValues = [ratio(gridSupply, evDemand), ratio(pipeSupply, hvDemand), battHigh, tankHigh];
  const pileValues = [evUtil, hvUtil];

  document.getElementById("diagnostics-caption").textContent =
    `${s.id} - ${s.setting}; source days ${bounds.startDay + 1} to ${bounds.startDay + bounds.days}, matching the operation panels.`;

  const common = {
    autosize: true,
    margin: { l: 56, r: 20, t: 38, b: 58 },
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    font: { family: '"Times New Roman", Georgia, serif', size: 14, color: "#172334" },
    xaxis: { showgrid: false, showline: true, linecolor: "#B8C4D8" },
    showlegend: false,
  };

  await Plotly.react("diagnostics-ratios", [{
    x: ["Grid supply", "Pipeline supply", "Battery high-SOC", "Tank high-SOC"],
    y: energyValues,
    type: "bar",
    marker: { color: ["#636EFA", "#EF553B", "#00CC96", "#FECB52"] },
    texttemplate: "%{y:.1f}%",
    textposition: "outside",
    cliponaxis: false,
  }], {
    ...common,
    yaxis: {
      title: "Ratio (%)",
      range: [0, Math.max(105, Math.ceil(Math.max(...energyValues) * 1.16))],
      gridcolor: "#E5ECF6",
      zeroline: false,
    },
  }, { displayModeBar: false, responsive: true });

  await Plotly.react("diagnostics-piles", [{
    x: ["Charger", "Refueller"],
    y: pileValues,
    type: "bar",
    marker: { color: ["blue", "green"] },
    texttemplate: "%{y:.1f}%",
    textposition: "outside",
    cliponaxis: false,
  }], {
    ...common,
    yaxis: {
      title: "Utilisation (%)",
      range: [0, Math.max(105, Math.ceil(Math.max(...pileValues) * 1.16))],
      gridcolor: "#E5ECF6",
      zeroline: false,
    },
  }, { displayModeBar: false, responsive: true });

  Plotly.Plots.resize(document.getElementById("diagnostics-ratios"));
  Plotly.Plots.resize(document.getElementById("diagnostics-piles"));
}

function updateStatus(bounds = clampWindow()) {
  const s = scenario();
  const modeText = timeMode === "auto" ? `Auto${autoPlaying ? "" : " paused"}` : "Manual";
  document.getElementById("active-scenario").textContent = `${s.id} - ${s.setting}`;
  document.getElementById("scenario-summary").textContent = s.summary;
  document.getElementById("window-status").textContent = `${modeText}; source days ${bounds.startDay + 1}-${bounds.startDay + bounds.days} of ${availableDays()}`;
}

async function renderVisible() {
  const bounds = clampWindow();
  updateStatus(bounds);
  updateWindowSummary(bounds);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (currentView === "vehicle") await renderVehicle(bounds);
  if (currentView === "energy") await renderEnergy(bounds);
  if (currentView === "balance") await renderBalance(bounds);
  if (!diagnosticsPanel.hidden) await renderDiagnostics(bounds);
}

async function requestRender() {
  if (rendering) {
    renderQueued = true;
    return;
  }
  rendering = true;
  try {
    do {
      renderQueued = false;
      await renderVisible();
    } while (renderQueued);
  } finally {
    rendering = false;
  }
}

function setView(view) {
  currentView = view;
  document.getElementById("home-view").classList.toggle("active", view === "home");
  for (const name of ["vehicle", "energy", "balance"]) {
    document.getElementById(`${name}-view`).classList.toggle("active", view === name);
  }
  document.querySelectorAll(".view-nav button").forEach((button) => {
    button.setAttribute("aria-current", String(button.dataset.view === view));
  });
  requestRender();
}

function installNavigation() {
  const items = [
    ["home", "Home"],
    ["vehicle", "Vehicle Scheduling Operation"],
    ["energy", "Energy Dispatch Operation"],
    ["balance", "Supply-Demand Balance"],
  ];
  document.querySelectorAll(".view-nav").forEach((nav) => {
    for (const [view, label] of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.view = view;
      button.textContent = label;
      button.addEventListener("click", () => setView(view));
      nav.appendChild(button);
    }
  });
  document.querySelectorAll(".operation-card").forEach((card) => {
    card.addEventListener("click", () => setView(card.dataset.view));
  });
}

async function selectScenario(id) {
  const request = ++scenarioRequest;
  const meta = scenarioMeta[id];
  scenarioSelect.disabled = true;
  document.getElementById("active-scenario").textContent = `${id} - ${meta.setting}`;
  document.getElementById("scenario-summary").textContent = `Loading: ${meta.summary}`;
  try {
    await loadScenario(id);
    if (request !== scenarioRequest) return;
    currentScenario = id;
    scenarioSelect.value = id;
    startDayInput.value = "1";
    restartAutoTimer();
    await requestRender();
  } catch (error) {
    console.error(error);
    document.getElementById("scenario-summary").textContent = `Failed to load ${id}.`;
  } finally {
    if (request === scenarioRequest) scenarioSelect.disabled = false;
  }
}

function installScenarioControls() {
  for (const id of scenarioIds) {
    const s = scenarioMeta[id];
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${id} - ${s.setting}`;
    scenarioSelect.appendChild(option);

    const item = document.createElement("div");
    item.className = "scenario-item";
    item.innerHTML = `<strong>${id}</strong><b>${s.setting}</b><span>${s.summary}</span>`;
    scenarioGrid.appendChild(item);
  }
  scenarioSelect.addEventListener("change", () => selectScenario(scenarioSelect.value));
  startDayInput.addEventListener("change", requestRender);
  daysInput.addEventListener("change", () => {
    clampWindow();
    restartAutoTimer();
    requestRender();
  });
}

function setTimeMode(mode) {
  timeMode = mode;
  modeAuto.setAttribute("aria-pressed", String(mode === "auto"));
  modeManual.setAttribute("aria-pressed", String(mode === "manual"));
  startDayInput.disabled = mode === "auto";
  playToggle.hidden = mode !== "auto";
  if (mode === "auto") {
    autoPlaying = true;
    playToggle.textContent = "Pause";
  }
  restartAutoTimer();
  requestRender();
}

function installStationStoryToggle() {
  const story = document.querySelector(".station-story");
  const toggle = document.querySelector(".station-story__toggle");
  if (!story || !toggle) return;
  toggle.addEventListener("click", () => {
    const collapsed = story.classList.toggle("is-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.textContent = collapsed ? "Show station diagram" : "Hide station diagram";
  });
}

function restartAutoTimer() {
  if (autoTimer !== null) window.clearInterval(autoTimer);
  autoTimer = null;
  if (timeMode !== "auto" || !autoPlaying) return;
  autoTimer = window.setInterval(() => {
    if (rendering) return;
    const bounds = clampWindow();
    startDayInput.value = String(bounds.startDay >= bounds.maxStart ? 1 : bounds.startDay + 2);
    requestRender();
  }, AUTO_INTERVAL_MS);
}

function openDiagnostics() {
  diagnosticsPanel.hidden = false;
  diagnosticsBackdrop.hidden = false;
  requestRender();
}

function closeDiagnostics() {
  diagnosticsPanel.hidden = true;
  diagnosticsBackdrop.hidden = true;
}

modeAuto.addEventListener("click", () => setTimeMode("auto"));
modeManual.addEventListener("click", () => setTimeMode("manual"));
playToggle.addEventListener("click", () => {
  autoPlaying = !autoPlaying;
  playToggle.textContent = autoPlaying ? "Pause" : "Resume";
  restartAutoTimer();
  updateStatus();
});
document.getElementById("diagnostics-toggle").addEventListener("click", openDiagnostics);
document.getElementById("diagnostics-close").addEventListener("click", closeDiagnostics);
diagnosticsBackdrop.addEventListener("click", closeDiagnostics);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !diagnosticsPanel.hidden) closeDiagnostics();
});
window.addEventListener("resize", () => requestRender());

async function bootstrap() {
  installNavigation();
  installScenarioControls();
  installStationStoryToggle();
  await selectScenario(currentScenario);
  setTimeMode("auto");
  setView("home");
}

bootstrap();
