// ======================
// CONFIG
// ======================

const MTR_LINE = "TML";
const MTR_STATION = "TIS";
const BUS_STOP_ID = "13001"; // stable test stop
const REFRESH = 15000;

// ======================
// INIT
// ======================

init();

async function init() {
  log("INIT OK");
  loadAll();
  setInterval(loadAll, REFRESH);
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
    const r = await fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc");
    const d = await r.json();

    document.getElementById("temp").innerText =
      d.temperature.data[0].value + "°C";

    document.getElementById("humidity").innerText =
      "💧" + d.humidity.data[0].value + "%";

    document.getElementById("weatherIcon").innerText = "🌤️";

  } catch (e) {
    log("WEATHER FAIL");
  }
}

// ======================
// MTR
// ======================

async function loadMTR() {
  try {
    const url =
      `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${MTR_LINE}&sta=${MTR_STATION}&lang=tc`;

    const r = await fetch(url);
    const d = await r.json();

    const north = [];
    const south = [];

    Object.keys(d.data || {}).forEach(k => {
      d.data[k].forEach(t => {
        const m = diff(t.time);

        if (k.includes("-N")) north.push(m);
        if (k.includes("-S")) south.push(m);
      });
    });

    render("mtrToTuenMun", north);
    render("mtrToWuKaiSha", south);

  } catch (e) {
    document.getElementById("mtrToTuenMun").innerText = "—";
    document.getElementById("mtrToWuKaiSha").innerText = "—";
  }
}

// ======================
// BUS
// ======================

async function loadBus() {
  try {
    const r = await fetch(
      `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${BUS_STOP_ID}`
    );

    const d = await r.json();

    if (!d?.data?.length) {
      document.getElementById("busList").innerHTML =
        "🔄 無巴士資料";
      return;
    }

    const routes = {};

    d.data.forEach(b => {
      if (!b.eta) return;

      const r = b.route;
      const dest = b.dest_tc || "";
      const m = diff(b.eta);

      if (!routes[r]) {
        routes[r] = { dest, list: [] };
      }

      routes[r].list.push(m);
    });

    const box = document.getElementById("busList");
    box.innerHTML = "";

    Object.keys(routes).forEach(r => {
      const x = routes[r];

      x.list.sort((a,b)=>a-b);

      box.innerHTML += `
        <div class="card">
          <div class="direction">🚌 ${r} → ${x.dest}</div>
          <div>
            ${x.list.slice(0,2).map(format).join(" / ")}
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

function diff(t) {
  const ts = Date.parse(t);
  return Math.round((ts - Date.now()) / 60000);
}

function render(id, arr) {
  const el = document.getElementById(id);

  if (!arr.length) {
    el.innerHTML = "—";
    return;
  }

  arr.sort((a,b)=>a-b);

  el.innerHTML =
    arr.slice(0,4).map(format).join(" ｜ ");
}

function format(m) {
  if (m <= 1) return "🔴 即將";
  if (m <= 5) return "🟢 " + m + "分鐘";
  return "⚪ " + m + "分鐘";
}
