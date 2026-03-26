/* ============================================================
   India Inflation Analytics Dashboard — Script
   ============================================================
   Connects to the Flask backend API and renders data into
   the dashboard DOM.  Uses Chart.js for visualisations.
   
   All API calls are made to the same origin (Flask serves
   both the API and the frontend static files).
   ============================================================ */

// ─── Configuration ─────────────────────────────────────────
const API_BASE = "";   // same-origin — Flask serves everything

const CATEGORIES = ["Food", "Fuel", "Rent", "Transport", "Utilities", "Entertainment"];
const CAT_ICONS  = ["🍔", "⛽", "🏠", "🚗", "💡", "🎬"];

// Chart.js colour palette (matches CSS accent colours)
const CHART_COLORS = [
  "rgba(108,  99, 255, 1)",   // accent / purple
  "rgba( 52, 211, 153, 1)",   // green
  "rgba(251, 191,  36, 1)",   // amber
  "rgba( 34, 211, 238, 1)",   // cyan
  "rgba(244, 114, 182, 1)",   // pink
  "rgba(251, 146,  60, 1)",   // orange
];
const CHART_COLORS_BG = CHART_COLORS.map(c => c.replace(", 1)", ", .20)"));


// ─── State ─────────────────────────────────────────────────
let citiesList   = [];
let trendChart   = null;
let growthChart  = null;
let compareChart = null;


// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

/** Fetch JSON from an API endpoint. Throws on HTTP errors. */
async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server returned ${res.status}`);
  }
  return res.json();
}

/** Display a red toast notification for 3.5 seconds. */
function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
  setTimeout(() => el.classList.add("hidden"), 3800);
}

/** Format a number with Indian locale (e.g. 12,500). */
function formatNum(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Show / hide elements by ID. */
function show(id) { document.getElementById(id).classList.remove("hidden"); }
function hide(id) { document.getElementById(id).classList.add("hidden"); }

/** Populate a <select> element with city options. */
function populateSelect(id, options, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML =
    `<option value="">${placeholder}</option>` +
    options.map(c => `<option value="${c}">${c}</option>`).join("");
}


// ═══════════════════════════════════════════════════════════
//  1. SUMMARY CARDS  (fetches /summary)
// ═══════════════════════════════════════════════════════════

async function loadSummary() {
  try {
    const data = await apiFetch("/summary");
    document.getElementById("summary-cards").innerHTML = `
      <div class="summary-card">
        <div class="card-icon">🏙️</div>
        <div class="card-label">Total Cities</div>
        <div class="card-value">${data.total_cities}</div>
      </div>
      <div class="summary-card">
        <div class="card-icon">📅</div>
        <div class="card-label">Year Range</div>
        <div class="card-value">${data.year_range[0]} – ${data.year_range[1]}</div>
      </div>
      <div class="summary-card">
        <div class="card-icon">🔥</div>
        <div class="card-label">Highest Inflation</div>
        <div class="card-value">${data.highest_inflation_city}</div>
      </div>`;
  } catch (err) {
    showToast("Failed to load summary: " + err.message);
  }
}


// ═══════════════════════════════════════════════════════════
//  2. CITY DROPDOWNS  (fetches /cities)
// ═══════════════════════════════════════════════════════════

async function loadCities() {
  try {
    const data = await apiFetch("/cities");
    citiesList = data.cities;

    populateSelect("city-select",   citiesList, "— Choose a city —");
    populateSelect("compare-city1", citiesList, "— City 1 —");
    populateSelect("compare-city2", citiesList, "— City 2 —");

    document.getElementById("city-select").disabled   = false;
    document.getElementById("compare-city1").disabled  = false;
    document.getElementById("compare-city2").disabled  = false;
    document.getElementById("compare-btn").disabled    = false;
  } catch (err) {
    showToast("Failed to load cities: " + err.message);
  }
}


// ═══════════════════════════════════════════════════════════
//  3. CITY DATA TABLE  (fetches /city-data)
// ═══════════════════════════════════════════════════════════

async function loadCityData(city) {
  try {
    const data = await apiFetch(`/city-data?city=${encodeURIComponent(city)}`);
    document.getElementById("city-data-label").textContent = city;
    renderTable(data.data);
    show("city-data-section");
    renderTrendChart(data.data, city);
    show("trend-section");
  } catch (err) {
    hide("city-data-section");
    hide("trend-section");
    showToast(err.message);
  }
}

function renderTable(rows) {
  const table = document.getElementById("city-data-table");
  const cols  = ["Year", ...CATEGORIES];

  table.querySelector("thead tr").innerHTML =
    cols.map(c => `<th>${c}</th>`).join("");
  table.querySelector("tbody").innerHTML =
    rows.map(r =>
      `<tr>${cols.map(c =>
        `<td>${c === "Year" ? r[c] : formatNum(r[c])}</td>`
      ).join("")}</tr>`
    ).join("");
}

function renderTrendChart(rows, city) {
  const ctx = document.getElementById("trend-chart");
  if (trendChart) trendChart.destroy();

  document.getElementById("trend-label").textContent = city;

  const labels   = rows.map(r => r.Year);
  const datasets = CATEGORIES.map((cat, i) => ({
    label: cat,
    data: rows.map(r => r[cat]),
    borderColor: CHART_COLORS[i],
    backgroundColor: CHART_COLORS_BG[i],
    tension: .35,
    pointRadius: 5,
    pointHoverRadius: 8,
    borderWidth: 2.5,
    fill: false,
  }));

  trendChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: buildChartOptions("Cost (₹)"),
  });
}


// ═══════════════════════════════════════════════════════════
//  4. GROWTH CHART  (fetches /city-growth)
// ═══════════════════════════════════════════════════════════

async function loadGrowth(city) {
  try {
    const data = await apiFetch(`/city-growth?city=${encodeURIComponent(city)}`);
    document.getElementById("growth-label").textContent = city;
    renderGrowthChart(data.growth);
    show("growth-section");
  } catch (err) {
    hide("growth-section");
    showToast(err.message);
  }
}

function renderGrowthChart(rows) {
  const ctx = document.getElementById("growth-chart");
  if (growthChart) growthChart.destroy();

  const labels   = rows.map(r => r.Year);
  const datasets = CATEGORIES.map((cat, i) => ({
    label: cat,
    data: rows.map(r => r[`${cat}_Growth_%`]),
    borderColor: CHART_COLORS[i],
    backgroundColor: CHART_COLORS_BG[i],
    tension: .35,
    pointRadius: 4,
    pointHoverRadius: 7,
    borderWidth: 2,
    fill: false,
  }));

  growthChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: buildChartOptions("Growth %"),
  });
}


// ═══════════════════════════════════════════════════════════
//  5. PREDICTION CARDS  (fetches /predict)
// ═══════════════════════════════════════════════════════════

async function loadPredict(city) {
  try {
    const data = await apiFetch(`/predict?city=${encodeURIComponent(city)}`);
    const pred = data.prediction;

    document.getElementById("predict-label").textContent =
      `${city} (${Math.round(pred.Year)})`;

    document.getElementById("predict-cards").innerHTML =
      CATEGORIES.map((cat, i) => `
        <div class="predict-card">
          <div class="card-icon">${CAT_ICONS[i]}</div>
          <div class="card-label">${cat}</div>
          <div class="predict-value">₹${formatNum(pred[cat])}</div>
        </div>
      `).join("");

    show("predict-section");
  } catch (err) {
    hide("predict-section");
    showToast(err.message);
  }
}


// ═══════════════════════════════════════════════════════════
//  6. COMPARISON  (fetches /compare)
// ═══════════════════════════════════════════════════════════

async function loadCompare(c1, c2) {
  show("compare-loading");
  hide("compare-result");
  try {
    const data = await apiFetch(
      `/compare?city1=${encodeURIComponent(c1)}&city2=${encodeURIComponent(c2)}`
    );
    renderCompareChart(data.data, c1, c2);
    show("compare-result");
  } catch (err) {
    hide("compare-result");
    showToast(err.message);
  } finally {
    hide("compare-loading");
  }
}

function renderCompareChart(rows, c1, c2) {
  const ctx = document.getElementById("compare-chart");
  if (compareChart) compareChart.destroy();

  // Latest-year row for each city
  const latest1 = rows.filter(r => r.City === c1).pop();
  const latest2 = rows.filter(r => r.City === c2).pop();
  if (!latest1 || !latest2) { showToast("Comparison data is incomplete"); return; }

  compareChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: CATEGORIES,
      datasets: [
        {
          label: c1,
          data: CATEGORIES.map(c => latest1[c]),
          backgroundColor: "rgba(108,99,255,.70)",
          borderRadius: 6,
          barPercentage: .45,
        },
        {
          label: c2,
          data: CATEGORIES.map(c => latest2[c]),
          backgroundColor: "rgba(52,211,153,.70)",
          borderRadius: 6,
          barPercentage: .45,
        },
      ],
    },
    options: buildChartOptions(`Cost Comparison — Latest Year`),
  });
}


// ═══════════════════════════════════════════════════════════
//  SHARED CHART OPTIONS
// ═══════════════════════════════════════════════════════════

function buildChartOptions(yAxisLabel) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: "#eaedf1",
          font: { family: "'Inter', sans-serif", size: 12 },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: "#1f2335",
        borderColor: "rgba(255,255,255,.08)",
        borderWidth: 1,
        titleFont: { family: "'Inter', sans-serif", weight: "600" },
        bodyFont:  { family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: "#8b92a5", font: { family: "'Inter', sans-serif" } },
        grid:  { color: "rgba(255,255,255,.04)" },
      },
      y: {
        title: { display: true, text: yAxisLabel, color: "#8b92a5", font: { family: "'Inter', sans-serif" } },
        ticks: { color: "#8b92a5" },
        grid:  { color: "rgba(255,255,255,.04)" },
      },
    },
  };
}


// ═══════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// City selector → load data + growth + prediction
document.getElementById("city-select").addEventListener("change", async (e) => {
  const city = e.target.value;
  if (!city) {
    hide("city-data-section");
    hide("trend-section");
    hide("growth-section");
    hide("predict-section");
    return;
  }

  // Show spinner, hide old data
  show("city-loading");
  hide("city-data-section");
  hide("trend-section");
  hide("growth-section");
  hide("predict-section");

  await Promise.all([
    loadCityData(city),
    loadGrowth(city),
    loadPredict(city),
  ]);

  hide("city-loading");
});

// Compare button
document.getElementById("compare-btn").addEventListener("click", () => {
  const c1 = document.getElementById("compare-city1").value;
  const c2 = document.getElementById("compare-city2").value;

  if (!c1 || !c2) { showToast("Please select both cities"); return; }
  if (c1 === c2)  { showToast("Please select two different cities"); return; }

  loadCompare(c1, c2);
});


// ═══════════════════════════════════════════════════════════
//  INITIALISATION
// ═══════════════════════════════════════════════════════════

(async () => {
  await Promise.all([loadSummary(), loadCities()]);
})();
