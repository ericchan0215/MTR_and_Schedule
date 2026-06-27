// ======================
// CONFIG
// ======================

const MTR_LINE = "TML";
const MTR_STATION = "TIS";
const REFRESH = 15000;

// 👉 正確 KMB test stop（天水圍區可用）
const BUS_STOP_ID = "13001";

// ======================
// INIT
// ======================

init();

async function init() {
  log("INIT OK");
  loadAll();
  setInterval(loadAll, REFRESH);
}

async function loadAll() {
  log("LOAD ALL");
  loadTime();
  loadWeather();
  loadMTR();
  loadBus();
}

// ======================
// DEBUG
// ======================

function log(msg) {
  const el = document.getElementById("debug");
  if (el) el.innerHTML += msg + "<br>";
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
// WEATHER
// ======================

async function loadWeather() {
  try {
    const res = await fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc");
    const data = await res.json();

    document.getElementById("temp").innerText =
      data.temperature.data[0].value + "°C";

    document.getElementById("humidity").innerText =
      "💧" + data.humidity.data[0].value + "%";

    document.getElementById("weatherIcon").innerText = "🌤️";

  } catch (e) {
    log("WEATHER FAIL");
  }
}

// ======================
// MTR (FIXED)
// ======================

async function loadMTR() {
  try {
    const url =
      `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${MTR_LINE}&sta=${MTR_STATION}&lang=tc`;

    const res = await fetch(url);
    const data = await res.json();

    const north = [];
    const south = [];

    Object.keys(data.data).forEach(k => {
      data.data[k].forEach(t => {
        const min = diff(t.time);

        if (k.endsWith("-N")) north.push(min);
        if (k.endsWith("-S")) south.push(min);
      });
    });

    render("mtrToTuenMun", north);
    render("mtrToWuKaiSha", south);

  } catch (e) {
    log("MTR FAIL");
  }
}

// ======================
// BUS (REAL WORKING KMB)
// ======================

async function loadBus() {
  try {
    const url =
      `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${BUS_STOP_ID}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.data) {
      log("BUS EMPTY");
      return;
    }

    const routes = {};

    data.data.forEach(b => {
      if (!b.eta) return;

      const route = b.route;
      const dest = b.dest_tc || "";
      const min = diff(b.eta);

      if (!routes[route]) {
        routes[route] = { dest, list: [] };
      }

      routes[route].list.push(min);
    });

    const box = document.getElementById("busList");
    box.innerHTML = "";

    Object.keys(routes).forEach(r => {
      const item = routes[r];
      item.list.sort((a,b)=>a-b);

      const top2 = item.list.slice(0,2);

      box.innerHTML += `
        <div class="card">
          <div class="direction">🚌 ${r} 往 ${item.dest}</div>
          <div>
            ${top2.map(format).join(" / ")}
          </div>
        </div>
      `;
    });

  } catch (e) {
    log("BUS FAIL");
  }
}

// ======================
// HELPERS
// ======================

function diff(time) {
  const t = new Date(time).getTime();
  return Math.round((t - Date.now()) / 60000);
}

function render(id, arr) {
  arr.sort((a,b)=>a-b);
  arr = arr.slice(0,4);

  document.getElementById(id).innerHTML =
    arr.map(format).join(" ｜ ");
}

function format(m) {
  if (m <= 1) return `<span style="color:red">🔴 即將</span>`;
  if (m <= 5) return `<span style="color:lime">🟢 ${m}分鐘</span>`;
  return `<span style="color:#999">${m}分鐘</span>`;
}
