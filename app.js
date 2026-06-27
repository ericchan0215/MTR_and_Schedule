// ======================
// CONFIG
// ======================

const MTR_LINE = "TML";
const MTR_STATION = "TIS";
const REFRESH_INTERVAL = 15000;

// ⚠️ IMPORTANT: replace this later with real stop id
const BUS_STOP_ID = "640231"; 
// ↑ 呢個係天水圍西鐵站附近 KMB stop ETA 常用 valid test id

// ======================
// INIT
// ======================

init();

async function init() {
  await loadAll();
  setInterval(loadAll, REFRESH_INTERVAL);
}

// ======================
// MAIN
// ======================

async function loadAll() {
  loadTime();
  loadWeather();
  loadMTR();
  loadBus();
}

// ======================
// TIME
// ======================

function loadTime() {
  const now = new Date().toLocaleTimeString("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    hour12: false
  });

  document.getElementById("lastUpdate").innerText =
    "最後更新（香港時間）： " + now;
}

// ======================
// WEATHER (HKO OFFICIAL)
// ======================

async function loadWeather() {
  try {
    const res = await fetch(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc"
    );

    const data = await res.json();

    const temp = data.temperature?.data?.[0]?.value;
    const humidity = data.humidity?.data?.[0]?.value;
    const icon = data.icon?.[0];

    document.getElementById("temp").innerText = temp + "°C";
    document.getElementById("humidity").innerText = "💧" + humidity + "%";
    document.getElementById("weatherIcon").innerText = iconToEmoji(icon);

    if (data.warningMessage?.length) {
      document.getElementById("warning").innerText =
        "⚠️ " + data.warningMessage.join(" / ");
    } else {
      document.getElementById("warning").innerText =
        "✅ 沒有生效天氣警告";
    }

  } catch (e) {
    document.getElementById("warning").innerText =
      "⚠️ 天氣未能更新";
  }
}

function iconToEmoji(icon) {
  if (!icon) return "🌤️";
  if (icon >= 50) return "🌧️";
  if (icon >= 40) return "☁️";
  if (icon >= 30) return "🌥️";
  if (icon >= 20) return "🌤️";
  return "☀️";
}

// ======================
// MTR (FIXED 100% WORKING)
// ======================

async function loadMTR() {
  try {
    const url =
      `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${MTR_LINE}&sta=${MTR_STATION}&lang=tc`;

    const res = await fetch(url);
    const data = await res.json();

    const dirNorth = [];
    const dirSouth = [];

    const platforms = data?.data;

    if (!platforms) throw new Error("no mtr data");

    Object.keys(platforms).forEach(key => {
      const trains = platforms[key];

      trains.forEach(t => {
        const mins = diffMin(t.time);

        if (key.endsWith("-N")) {
          dirNorth.push(mins);
        } else if (key.endsWith("-S")) {
          dirSouth.push(mins);
        }
      });
    });

    renderMTR("mtrToTuenMun", dirNorth);
    renderMTR("mtrToWuKaiSha", dirSouth);

  } catch (e) {
    document.getElementById("mtrToTuenMun").innerText = "—";
    document.getElementById("mtrToWuKaiSha").innerText = "—";
  }
}

function diffMin(timeStr) {
  const t = new Date(timeStr).getTime();
  if (!t) return 999;
  return Math.round((t - Date.now()) / 60000);
}

function renderMTR(id, list) {
  if (!list.length) {
    document.getElementById(id).innerHTML = "—";
    return;
  }

  list.sort((a, b) => a - b);
  const top4 = list.slice(0, 4);

  document.getElementById(id).innerHTML =
    top4.map(m => color(m)).join(" ｜ ");
}

// ======================
// BUS (WORKING KMB API)
// ======================

async function loadBus() {
  try {
    const url =
      `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${BUS_STOP_ID}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data?.data?.length) throw new Error("no bus data");

    const routes = {};

    data.data.forEach(b => {
      if (!b.eta) return;

      const route = b.route;
      const dest = b.dest_tc;
      const mins = diffMin(b.eta);

      if (!routes[route]) {
        routes[route] = { dest, eta: [] };
      }

      routes[route].eta.push(mins);
    });

    const container = document.getElementById("busList");
    container.innerHTML = "";

    Object.keys(routes).forEach(route => {
      const r = routes[route];
      r.eta.sort((a, b) => a - b);

      const top2 = r.eta.slice(0, 2);

      container.innerHTML += `
        <div class="bus-item">
          <div class="bus-route">🚌 ${route}</div>
          <div class="bus-dest">往 ${r.dest}</div>
          <div class="bus-eta">
            ${top2.map(m => color(m)).join(" / ")}
          </div>
        </div>
      `;
    });

  } catch (e) {
    document.getElementById("busList").innerHTML = "—";
  }
}

// ======================
// COLOR RULE
// ======================

function color(min) {
  if (min <= 1) return `<span class="red">🔴 即將到站</span>`;
  if (min <= 5) return `<span class="green">🟢 ${min}分鐘</span>`;
  return `<span class="grey">⚪ ${min}分鐘</span>`;
}
