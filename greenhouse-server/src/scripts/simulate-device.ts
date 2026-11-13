/**
 * Pretends to be the ESP32 so you can see the whole system working before the hardware arrives.
 *
 *   npm run simulate -- --url http://localhost:5000 --key ghk_xxx [--interval 5] [--speed 60] [--heat] [--fault soil]
 *
 *  --speed N   1 real second = N simulated seconds of plant physics (default 60: a day passes in 24 min)
 *  --heat      pushes the temperature above the alarm limit (tests the buzzer)
 *  --fault X   sends no valid value for soil|temperature|humidity|light (tests sensor-fault alerts)
 *
 * TIP: register a separate device ("Simulator") with POST /devices so fake data never mixes with the real greenhouse.
 */
const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : 'true';
};

const URL_BASE = (arg('url', 'http://localhost:5000') as string).replace(/\/$/, '');
const KEY = arg('key', process.env.DEVICE_API_KEY);
const INTERVAL = Number(arg('interval', '5'));
const SPEED = Number(arg('speed', '60'));
const HEAT = arg('heat') === 'true';
const FAULT = arg('fault');

if (!KEY) {
  console.error('Missing --key (or DEVICE_API_KEY)');
  process.exit(1);
}

let simSec = 9 * 3600; // start at 09:00 simulated time
let soil = 52;
let pump = false;
let grow = false;
let buzzer = false;
let pumpSince = 0;
let pumpLimitSec = 30;

const hourOfDay = () => (simSec / 3600) % 24;

function environment() {
  const h = hourOfDay();
  const sun = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)); // 0 at night, 1 at noon
  const temp = (HEAT ? 33.5 : 19) + (HEAT ? 2 : 9) * sun + (Math.random() - 0.5) * 0.4;
  const hum = Math.min(95, Math.max(35, 82 - 28 * sun + (Math.random() - 0.5) * 2));
  const lux = sun * 24000 * (0.9 + Math.random() * 0.2) + (grow ? 2600 : 0) + (sun === 0 ? Math.random() * 30 : 0);
  return { temp, hum, lux, sun };
}

async function tick() {
  const dt = INTERVAL * SPEED;
  simSec += dt;
  const env = environment();

  // plant physics: soil dries faster when hot/bright; the pump adds water quickly
  soil -= (dt / 3600) * (1.2 + 2.2 * env.sun);
  if (pump) {
    soil += INTERVAL * 1.1;
    if (Date.now() / 1000 - pumpSince > pumpLimitSec) pump = false; // firmware-side hard stop
  }
  soil = Math.min(100, Math.max(0, soil));
  const raw = Math.round(3100 - (soil / 100) * (3100 - 1300));

  const body: Record<string, unknown> = {
    soil_raw: raw,
    temperature: Math.round(env.temp * 10) / 10,
    humidity: Math.round(env.hum * 10) / 10,
    light_lux: Math.round(env.lux),
    pump, grow_light: grow, buzzer,
    rssi: -55 - Math.round(Math.random() * 8),
    firmware: 'simulator-1.0',
  };
  if (FAULT === 'soil') { body.soil_raw = null; }
  if (FAULT === 'temperature') body.temperature = null;
  if (FAULT === 'humidity') body.humidity = null;
  if (FAULT === 'light') body.light_lux = null;

  try {
    const res = await fetch(`${URL_BASE}/api/v1/device/readings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY as string },
      body: JSON.stringify(body),
    });
    const json: any = await res.json();
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${json.message}`);
      return;
    }
    const c = json.commands;
    if (c.pump && !pump) { pumpSince = Date.now() / 1000; pumpLimitSec = json.pump_run_sec ?? 30; }
    pump = c.pump;
    grow = c.grow_light;
    buzzer = c.buzzer;
    const hh = String(Math.floor(hourOfDay())).padStart(2, '0') + ':' + String(Math.floor((hourOfDay() % 1) * 60)).padStart(2, '0');
    console.log(
      `[sim ${hh}] soil ${soil.toFixed(1)}%  ${body.temperature}°C  ${body.humidity}%  ${body.light_lux} lux  -> pump:${pump ? 'ON ' : 'off'} light:${grow ? 'ON ' : 'off'} buzzer:${buzzer ? 'ON ' : 'off'}`,
    );
  } catch (e: any) {
    console.error('Cannot reach server:', e.message);
  }
}

console.log(`Simulating device -> ${URL_BASE} every ${INTERVAL}s (speed x${SPEED}${HEAT ? ', heat' : ''}${FAULT ? `, fault=${FAULT}` : ''})`);
tick();
setInterval(tick, INTERVAL * 1000);
