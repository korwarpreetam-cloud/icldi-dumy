/* ============================================================
   India Inflation Analytics Dashboard — Refactored Script
   Matched with the redesigned HTML & CSS
   ============================================================ */

// ─── Configuration ─────────────────────────────────────────
const API_BASE = ""; 

const CATEGORIES = ["Food", "Fuel", "Rent", "Transport", "Utilities", "Entertainment"];
const CAT_ICONS  = ["🍔", "⛽", "🏠", "🚗", "💡", "🎬"];

// Palette matching new CSS
const COLORS = [
  "rgba(200, 169, 81, 1)",   // Gold
  "rgba(76, 175, 80, 1)",    // Green
  "rgba(232, 117, 110, 1)",  // Coral
  "rgba(91, 192, 222, 1)",   // Cyan
  "rgba(232, 108, 165, 1)",  // Pink
  "rgba(139, 108, 198, 1)",  // Purple
];
const COLORS_BG = COLORS.map(c => c.replace(", 1)", ", .20)"));

// ─── State ─────────────────────────────────────────────────
let citiesList      = [];
let overviewChart   = null;
let categoryDonut   = null;
let growthBarChart  = null;
let fullTrendChart  = null;
let compareChart    = null;


// ═══════════════════════════════════════════════════════════
//  HELPERS & CHART CONFIG
// ═══════════════════════════════════════════════════════════

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server returned ${res.status}`);
  }
  return res.json();
}

function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
  setTimeout(() => el.classList.add("hidden"), 3800);
}

function formatNum(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

function populateSelect(id, options, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML =
    `<option value="">${placeholder}</option>` +
    options.map(c => `<option value="${c}">${c}</option>`).join("");
}

Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = "#a0a0a0";

const buildChartOptions = (yLabel, isDonut = false) => {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isDonut ? 'right' : 'top',
        labels: {
          color: "#7a7a7a",
          usePointStyle: true,
          boxWidth: 8,
          padding: 16,
          font: { size: 11, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: "rgba(26,26,26,0.95)",
        titleFont: { size: 13, weight: '700' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 6,
        displayColors: true,
      }
    }
  };

  if (!isDonut) {
    opts.scales = {
      x: { grid: { display: false } },
      y: {
        border: { display: false },
        grid: { color: "rgba(0,0,0,0.04)" },
        title: { display: !!yLabel, text: yLabel, font: { size: 11 } }
      }
    };
    opts.interaction = { mode: "index", intersect: false };
  }
  return opts;
};


// ═══════════════════════════════════════════════════════════
//  UI NAVIGATION
// ═══════════════════════════════════════════════════════════

document.querySelectorAll('.sidebar-btn[data-section]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Nav logic
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');

    const sectionId = 'section-' + target.dataset.section;
    document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById(sectionId).classList.add('active-section');
    
    // Resize charts in the new active section because they might render tiny when hidden
    const charts = Chart.instances;
    Object.values(charts).forEach(chart => chart.resize());
  });
});

document.getElementById('share-btn').addEventListener('click', () => {
  showToast("Ready to share (Demo mode)");
});

document.getElementById('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href);
  showToast("Link copied to clipboard!");
});


// ═══════════════════════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════════════════════

async function loadInitialData() {
  try {
    const summaryData = await apiFetch("/summary");
    document.getElementById("stat-cities").textContent = summaryData.total_cities;
    document.getElementById("stat-years").textContent = `${summaryData.year_range[0]} – ${summaryData.year_range[1]}`;
    
    document.getElementById("summary-highest-city").textContent = summaryData.highest_inflation_city;
    document.getElementById("summary-cities-count").textContent = summaryData.total_cities;
    document.getElementById("summary-since").textContent = summaryData.year_range[0];

    const citiesData = await apiFetch("/cities");
    citiesList = citiesData.cities;

    populateSelect("city-select-overview", citiesList, "Select City");
    populateSelect("city-select-trend", citiesList, "Select City");
    populateSelect("city-select", citiesList, "Select City");
    populateSelect("city-select-predict", citiesList, "Select City");
    populateSelect("compare-city1", citiesList, "City 1");
    populateSelect("compare-city2", citiesList, "City 2");
    populateSelect("city-select-table", citiesList, "Select City");

    document.getElementById("city-select").disabled = false;
    document.getElementById("compare-city1").disabled = false;
    document.getElementById("compare-city2").disabled = false;
    document.getElementById("compare-btn").disabled = false;

    // Load default data for first city in list to populate Overview
    if (citiesList.length > 0) {
      document.getElementById("city-select-overview").value = citiesList[0];
      loadOverviewData(citiesList[0]);
    }

  } catch (err) {
    showToast("Failed to load generic data.");
  }
}

// ─── OVERVIEW SECTION ───
async function loadOverviewData(city) {
  try {
    const data = await apiFetch(`/city-data?city=${encodeURIComponent(city)}`);
    const growth = await apiFetch(`/city-growth?city=${encodeURIComponent(city)}`);
    
    renderOverviewCharts(data.data, growth.growth);
    renderMiniTable(data.data);
  } catch(err) {
    showToast("Failed to load overview data.");
  }
}

function renderOverviewCharts(rows, growthRows) {
  // Line Chart
  if (overviewChart) overviewChart.destroy();
  const ctxLine = document.getElementById("trend-chart");
  const labels = rows.map(r => r.Year);
  const datasetsLine = CATEGORIES.map((cat, i) => ({
    label: cat,
    data: rows.map(r => r[cat]),
    borderColor: COLORS[i],
    backgroundColor: COLORS_BG[i],
    tension: .3,
    pointRadius: 3,
    borderWidth: 2,
  }));
  overviewChart = new Chart(ctxLine, {
    type: "line",
    data: { labels, datasets: datasetsLine },
    options: buildChartOptions("Cost (₹)"),
  });

  // Donut (Latest year costs)
  if (categoryDonut) categoryDonut.destroy();
  const ctxDonut = document.getElementById("category-donut");
  const latestRow = rows[rows.length - 1];
  categoryDonut = new Chart(ctxDonut, {
    type: "doughnut",
    data: {
      labels: CATEGORIES,
      datasets: [{
        data: CATEGORIES.map(c => latestRow[c]),
        backgroundColor: COLORS,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: buildChartOptions("", true),
  });

  // Bar Chart (Growth latest year)
  if (growthBarChart) growthBarChart.destroy();
  const ctxBar = document.getElementById("growth-chart");
  const latestGrowth = growthRows[growthRows.length - 1];
  growthBarChart = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: CATEGORIES,
      datasets: [{
        label: "Growth % (" + latestGrowth.Year + ")",
        data: CATEGORIES.map(c => latestGrowth[`${c}_Growth_%`]),
        backgroundColor: "rgba(200, 169, 81, 0.8)",
        borderRadius: 4
      }]
    },
    options: buildChartOptions("Growth %"),
  });
}

function renderMiniTable(rows) {
  const tbody = document.getElementById("mini-table-body");
  const recent = rows.slice(-4).reverse(); // Last 4 years
  tbody.innerHTML = recent.map(r => 
    `<tr>
      <td><strong>${r.Year}</strong></td>
      <td>₹${formatNum(r.Food)}</td>
      <td>₹${formatNum(r.Fuel)}</td>
    </tr>`
  ).join("");
}

document.getElementById("city-select-overview").addEventListener("change", (e) => {
  if (e.target.value) loadOverviewData(e.target.value);
});


// ─── TRENDS SECTION ───
document.getElementById("city-select-trend").addEventListener("change", async (e) => {
  const city = e.target.value;
  if (!city) return;
  document.getElementById("trend-city-label").textContent = city;
  
  const data = await apiFetch(`/city-data?city=${encodeURIComponent(city)}`);
  
  if (fullTrendChart) fullTrendChart.destroy();
  const ctx = document.getElementById("trend-chart-full");
  const labels = data.data.map(r => r.Year);
  const datasets = CATEGORIES.map((cat, i) => ({
    label: cat,
    data: data.data.map(r => r[cat]),
    borderColor: COLORS[i],
    backgroundColor: COLORS_BG[i],
    tension: .4,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2.5,
    fill: true
  }));
  
  fullTrendChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: buildChartOptions("Cost (₹)"),
  });
});


// ─── CITY EXPLORE (Full Table) ───
document.getElementById("city-select").addEventListener("change", async (e) => {
  const city = e.target.value;
  if (!city) {
    document.getElementById("city-data-section").classList.add("hidden");
    return;
  }
  
  document.getElementById("city-loading").classList.remove("hidden");
  document.getElementById("city-data-section").classList.add("hidden");
  
  try {
    const data = await apiFetch(`/city-data?city=${encodeURIComponent(city)}`);
    document.getElementById("city-data-label").textContent = city;
    
    const table = document.getElementById("city-data-table");
    const cols = ["Year", ...CATEGORIES];
    table.querySelector("thead tr").innerHTML = cols.map(c => `<th>${c}</th>`).join("");
    table.querySelector("tbody").innerHTML = data.data.map(r =>
      `<tr>${cols.map(c => `<td>${c === "Year" ? r[c] : formatNum(r[c])}</td>`).join("")}</tr>`
    ).join("");
    
    document.getElementById("city-data-section").classList.remove("hidden");
  } catch (err) {
    showToast(err.message);
  } finally {
    document.getElementById("city-loading").classList.add("hidden");
  }
});


// ─── PREDICT SECTION ───
document.getElementById("city-select-predict").addEventListener("change", async (e) => {
  const city = e.target.value;
  if (!city) return;
  
  try {
    const data = await apiFetch(`/predict?city=${encodeURIComponent(city)}`);
    const pred = data.prediction;
    
    document.getElementById("predict-label").textContent = `${city} (${Math.round(pred.Year)})`;
    
    document.getElementById("predict-cards").innerHTML = CATEGORIES.map((cat, i) => `
      <div class="predict-card">
        <div class="predict-icon">${CAT_ICONS[i]}</div>
        <div class="predict-label">${cat}</div>
        <div class="predict-value">₹${formatNum(pred[cat])}</div>
      </div>
    `).join("");
  } catch(err) {
    showToast(err.message);
  }
});


// ─── COMPARE SECTION ───
document.getElementById("compare-btn").addEventListener("click", async () => {
  const c1 = document.getElementById("compare-city1").value;
  const c2 = document.getElementById("compare-city2").value;
  if (!c1 || !c2) { showToast("Select both cities"); return; }
  
  document.getElementById("compare-loading").classList.remove("hidden");
  document.getElementById("compare-result").classList.add("hidden");
  
  try {
    const data = await apiFetch(`/compare?city1=${encodeURIComponent(c1)}&city2=${encodeURIComponent(c2)}`);
    const rows = data.data;
    
    const latest1 = rows.filter(r => r.City === c1).pop();
    const latest2 = rows.filter(r => r.City === c2).pop();
    
    if (compareChart) compareChart.destroy();
    compareChart = new Chart(document.getElementById("compare-chart"), {
      type: "bar",
      data: {
        labels: CATEGORIES,
        datasets: [
          { label: c1, data: CATEGORIES.map(c => latest1[c]), backgroundColor: COLORS[0], borderRadius: 4 },
          { label: c2, data: CATEGORIES.map(c => latest2[c]), backgroundColor: COLORS[1], borderRadius: 4 },
        ]
      },
      options: buildChartOptions("Latest Year Cost (₹)")
    });
    
    document.getElementById("compare-result").classList.remove("hidden");
  } catch (err) {
    showToast(err.message);
  } finally {
    document.getElementById("compare-loading").classList.add("hidden");
  }
});

// Full Data Table view all hook
document.getElementById("view-all-link").addEventListener("click", () => {
  const city = document.getElementById("city-select-overview").value;
  if (city) {
    document.getElementById("city-select").value = city;
    document.getElementById("city-select").dispatchEvent(new Event("change"));
  }
  document.querySelector('.sidebar-btn[data-section="city-explore"]').click();
});


// Initialization
(async () => {
  await loadInitialData();
})();
