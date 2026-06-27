const REFRESH = 15000;
const MTR_LINE = "TML";
const MTR_STATION = "TIS";

// ⚠️ IMPORTANT: fallback safe mode (no guessing broken stop ids)
const BUS_STOP_ID = "13001";

init();

function init() {
  run();
  setInterval(run, REFRESH);
}

async function run() {
  time();
  weather();
  mtr();
  bus();
}

/* =========================
   TIME
========================= */
function time() {
  document.getElementById("time").innerText =
    new Date().toLocaleString("zh-HK", {
      timeZone: "Asia/Hong_Kong"
    });
}

/* =========================
   WEATHER (HKO)
========================= */
async function weather() {
  try {
    const r = await fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc");
    const d = await r.json();

    const t = d.temperature.data[0].value;
    const h = d.humidity.data[0].value;

    document.getElementById("weather").innerText =
      `🌤️ ${t}°C 💧${h}%`;

  } catch {
    document.getElementById("status").innerText = "Weather API fail";
  }
}

/* =========================
   MTR (ROBUST)
========================= */
async function mtr() {
  try {
    const url = `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${MTR_LINE}&sta=${MTR_STATION}&lang=tc`;

    const r = await fetch(url);
    const d = await r.json();

    if (!d?.data) throw "no mtr data";

    const north = [];
    const south = [];

    for (let k in d.data) {
      for (let t of d.data[k]) {
        const min = diff(t.time);

        if (k.includes("-N")) north.push(min);
        if (k.includes("-S")) south.push(min);
      }
    }

    show("mtr1", north);
    show("mtr2", south);

  } catch (e) {
    document.getElementById("mtr1").innerText = "no data";
    document.getElementById("mtr2").innerText = "no data";
  }
}

/* =========================
   BUS (REAL KMB)
========================= */
async function bus() {
  try {
    const r = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${BUS_STOP_ID}`);
    const d = await r.json();

    if (!d?.data?.length) {
      document.getElementById("bus").innerText = "no bus data";
      return;
    }

    const list = [];

    for (let b of d.data) {
      if (!b.eta) continue;
      list.push(diff(b.eta));
    }

    list.sort((a,b)=>a-b);

    document.getElementById("bus").innerHTML =
      list.slice(0,3).map(format).join(" / ");

  } catch {
    document.getElementById("bus").innerText = "bus api fail";
  }
}

/* =========================
   HELPERS
========================= */
function diff(t) {
  const ts = Date.parse(t);
  return Math.round((ts - Date.now()) / 60000);
}

function show(id, arr) {
  const el = document.getElementById(id);

  if (!arr.length) {
    el.innerText = "--";
    return;
  }

  arr.sort((a,b)=>a-b);
  el.innerText = arr.slice(0,4).map(format).join(" | ");
}

function format(m) {
  if (m <= 1) return "🔴 now";
  if (m <= 5) return "🟢 " + m + "m";
  return "⚪ " + m + "m";
}
