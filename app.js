// ======================
// CONFIG
// ======================

const MTR_LINE = "TML";
const MTR_STATION = "TIS"; // 天水圍站
const REFRESH_INTERVAL = 15000;

const BUS_STOP_ID = "LEARN_FROM_API"; 
// ⚠️ 重要：你之後要換做真正 stop id

// ======================
// INIT
// ======================

init();

async function init() {
  await loadAll();
  setInterval(loadAll, REFRESH_INTERVAL);
}

// ======================
// MAIN LOOP
// ======================

async function loadAll() {
  loadTime();
  loadWeather();
  loadMTR();
  loadBus();
}

// ======================
// TIME (HK)
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
// WEATHER (HKO)
// ======================

async function loadWeather() {
  try {
    const res = await fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc");
    const data = await res.json();

    const temp = data.temperature.data[0].value;
    const humidity = data.humidity.data[0].value;
    const icon = data.icon?.[0];

    document.getElementById("temp").innerText = temp + "°C";
    document.getElementById("humidity").innerText = "💧" + humidity + "%";
    document.getElementById("weatherIcon").innerText = mapWeatherIcon(icon);

    if (data.warningMessage && data.warningMessage.length > 0) {
      document.getElementById("warning").innerText =
        "⚠️ " + data.warningMessage.join(" / ");
    } else {
      document.getElementById("warning").innerText =
        "✅ 沒有生效天氣警告";
    }

  } catch (e) {
    document.getElementById("warning").innerText =
      "⚠️ 天氣資料未能更新";
  }
}

function mapWeatherIcon(icon) {
  if (!icon) return "🌤️";

  if (icon >= 50) return "🌧️";
  if (icon >= 40) return "☁️";
  if (icon >= 30) return "🌥️";
  if (icon >= 20) return "🌤️";
  if (icon >= 10) return "☀️";

  return "🌤️";
}

// ======================
// MTR (FIXED VERSION)
// ======================

async function loadMTR() {
  try {
    const url = `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${MTR_LINE}&sta=${MTR_STATION}&lang=tc`;
    const res = await fetch(url);
    const data = await res.json();

    const dirA = [];
    const dirB = [];

    const platforms = data.data;

    Object.keys(platforms).forEach(key => {
      const trains = platforms[key];

      trains.forEach(t => {
        const mins = calcMins(t.time);

        if (key.includes("N") || key.includes("UP")) {
          dirA.push(mins);
        } else {
          dirB.push(mins);
        }
      });
    });

    renderMTR("mtrToTuenMun", dirA);
    renderMTR("mtrToWuKaiSha", dirB);

  } catch (e) {
    document.getElementById("mtrToTuenMun").innerText = "⚠️ 未能載入";
    document.getElementById("mtrToWuKaiSha").innerText = "⚠️ 未能載入";
  }
}

function calcMins(timeStr) {
  const t = new Date(timeStr);
  return Math.round((t - new Date()) / 60000);
}

function renderMTR(id, list) {
  if (!list || list.length === 0) {
    document.getElementById(id).innerHTML = `<div class="line">—</div>`;
    return;
  }

  list.sort((a, b) => a - b);
  const top4 = list.slice(0, 4);

  const html = top4.map(t => {
    return `<span class="${getColor(t)}">${format(t)}</span>`;
  }).join(" ｜ ");

  document.getElementById(id).innerHTML =
    `<div class="line">${html}</div>`;
}

// ======================
// BUS (SAFE VERSION)
// ======================

async function loadBus() {
  try {

    if (BUS_STOP_ID === "LEARN_FROM_API") {
      document.getElementById("busList").innerHTML =
        "⚠️ 請先設定正確 BUS_STOP_ID";
      return;
    }

    const url =
      `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${BUS_STOP_ID}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.data) throw new Error("no data");

    const routes = {};

    data.data.forEach(b => {
      const route = b.route;
      const dest = b.dest_tc || b.dest_en;
      const mins = calcMins(b.eta);

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

      const html = `
        <div class="bus-item">
          <div class="bus-route">🚌 ${route}</div>
          <div class="bus-dest">往 ${r.dest}</div>
          <div class="bus-eta">
            ${top2.map(t =>
              `<span class="${getColor(t)}">${format(t)}</span>`
            ).join(" / ")}
          </div>
        </div>
      `;

      container.innerHTML += html;
    });

  } catch (e) {
    document.getElementById("busList").innerHTML =
      "⚠️ 巴士資料未能更新";
  }
}

// ======================
// COLOR RULE
// ======================

function getColor(min) {
  if (min <= 1) return "red";
  if (min <= 5) return "green";
  return "grey";
}

function format(min) {
  if (min <= 0) return "即將到站";
  return min + "分鐘";
}
