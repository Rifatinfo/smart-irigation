# Smart Irrigation / Greenhouse Controller — Backend

Express 5 + Prisma 7 + PostgreSQL backend for an ESP32 greenhouse controller.

* **Hardware API**: the ESP32 posts sensor readings and gets back commands for the pump, grow light and buzzer.
* **Automation engine**: watering, grow-light and over-temperature alarm logic with safety limits.
* **Dashboard API**: live summary, 24 h / 7 d / 30 d history with statistics, CSV export, settings, manual control, activity log and alerts.
* **Realtime**: Server-Sent Events push every new reading, relay change, alert and log line to the dashboard.
* **Firmware**: a ready-made ESP32 sketch for the parts list (`firmware/greenhouse_esp32`).

Full endpoint reference: [`docs/API.md`](docs/API.md). Drop-in TypeScript client for the frontend: [`docs/greenhouse-client.ts`](docs/greenhouse-client.ts).

---

## 1. Quick start (local)

Requirements: Node 20+, PostgreSQL 14+ (any host: local, Docker, Neon, Supabase…).
Use a **new, empty database**. The old store tables from the previous project are not used.

```bash
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:deploy             # creates the tables
npm run dev                   # http://localhost:5000
```

Already set up before this update? Run `npm run db:deploy` once more: it adds the new alert types and the pump flow-rate setting.

Then start the dashboard (`greenhouse-client`):

```bash
cd ../greenhouse-client
npm install
npm run dev                   # http://localhost:3000, sign in with ADMIN_EMAIL / the seed password
```

The dashboard talks to the API on the same host, port 5000 (`http://<host>:5000`), so it also works when opened from a phone at `http://192.168.x.x:3000`. Set `NEXT_PUBLIC_API_URL` in `greenhouse-client/.env.local` if the API lives elsewhere. Forgot the password? `npm run user:reset-password`.

**On the first start the server sets itself up**: it creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (a random password is printed if `ADMIN_PASSWORD` is empty) and registers the first device, printing its API key once. Nothing is changed on later starts, so a password you change in the dashboard is kept. Changing `ADMIN_EMAIL` later creates that account on the next start. (`npm run seed` does the same without starting the server.)

Check it: `curl http://localhost:5000/api/v1/health` → `{"status":"ok","database":"up"}`.

**No hardware yet?** Register a separate test device so fake data never mixes with the real greenhouse:

```bash
# log in, then create a "Simulator" device; copy the apiKey from the response
curl -X POST localhost:5000/api/v1/devices -H "Authorization: Bearer <token>" -H "content-type: application/json" -d '{"name":"Simulator"}'
npm run simulate -- --url http://localhost:5000 --key <simulator key>            # normal day
npm run simulate -- --url http://localhost:5000 --key <simulator key> --heat     # test the buzzer alarm
npm run simulate -- --url http://localhost:5000 --key <simulator key> --fault soil
```

Dashboard calls use the first registered device by default; add `?deviceId=<id>` to view another one.

### Docker (API + Postgres in one command)

```bash
# .env needs at least JWT_SECRET and REFRESH_TOKEN_SECRET (ADMIN_PASSWORD recommended)
docker compose up -d --build
docker compose logs api | head -40      # shows the admin password / device API key on first boot
```

---

### Sign in with Google (optional)

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID**, type *Web application* (set up the OAuth consent screen first if asked; *External* + add yourself as a test user is enough).
2. *Authorized JavaScript origins*: `http://localhost:3000` (and your `https://` dashboard domain if you deploy it). Google does not accept LAN IPs like `http://192.168.0.10:3000`, so on a phone use the email/password login.
3. Put the client ID in `.env`: `GOOGLE_CLIENT_ID=1234…apps.googleusercontent.com` and restart the server. The login page then shows **Continue with Google**.
4. Only a Google account whose email matches an existing admin account can sign in, so set `ADMIN_EMAIL` to your Gmail address. Other Google accounts are refused, and the refusal is logged.

The server verifies every Google sign-in with Google itself and checks that the token was issued for your client ID.

---

## 2. Connect the hardware

1. Wire the parts as below.
2. Open `firmware/greenhouse_esp32/greenhouse_esp32.ino` in Arduino IDE and install the libraries listed at the top (ArduinoJson, DHT sensor library + Adafruit Unified Sensor, LiquidCrystal I2C). Board package: *esp32 by Espressif*.
3. Fill in `WIFI_SSID`, `WIFI_PASSWORD` (2.4 GHz Wi-Fi: the ESP32 has no 5 GHz), `SERVER_URL` and `DEVICE_API_KEY` (from `npm run seed`, or Settings → Device API key → New key).
   * `SERVER_URL` is the **LAN IP of the PC running the server**, e.g. `http://192.168.0.10:5000` (Windows: `ipconfig` → IPv4 Address). Never `localhost`. The ESP32 and the PC must be on the same Wi-Fi.
   * Windows Firewall: allow Node.js on *Private* networks when Windows asks, or the ESP32 cannot reach port 5000.
   * Reserve that IP for the PC in your router (DHCP reservation) so it doesn't change.
4. Board: *ESP32 Dev Module*. Upload, then open the Serial Monitor at 115200 baud.

The Serial Monitor prints `Connected to the greenhouse server - dashboard is live`. The dashboard switches from "Waiting for the first reading" to live values without reloading. The activity log shows *"Device connected for the first time"*.

### Wiring (ESP32 30-pin NodeMCU + expansion board)

| Part | Part pin | ESP32 |
|---|---|---|
| DHT22 | DATA / VCC / GND | GPIO 4 / 3V3 / GND |
| Capacitive soil sensor v2.0 | AOUT / VCC / GND | GPIO 34 / 3V3 / GND |
| Photoresistor LDR module (4-pin) | AO / VCC / GND (DO unused) | GPIO 35 / 3V3 / GND |
| 16x2 LCD + I²C adapter | SDA / SCL / VCC / GND | GPIO 21 / GPIO 22 / 5V (VIN) / GND |
| 2-channel 5V relay | IN1 (pump) / IN2 (grow light) / VCC / GND | GPIO 26 / GPIO 27 / 5V (VIN) / GND |
| Active buzzer 5V | + / − | GPIO 25 / GND (driven directly; a little quieter at 3.3 V) |
| Red LED | long leg (anode) / short leg | GPIO 13 through a 220–330 Ω resistor / GND |
| Mini pump 3V + 2×AA holder | | battery + → relay 1 COM, relay 1 NO → pump +, pump − → battery − |

Notes:
* **Light sensor (LDR):** the firmware converts the LDR reading to an *approximate* lux value, so the lux thresholds work. The Serial Monitor prints `ldr_raw` and `L~`. If lux reads far too high/low, adjust `LDR_R10_OHMS`; if it goes *up* when you cover the sensor, set `LDR_BRIGHT_IS_LOW 0`. Then set "Turn on below" on the Automation page to the value you see at dusk. (A BH1750 lux sensor is supported too: `USE_BH1750 1`, wired to SDA/SCL.)
* **Buzzer:** a 5 V active buzzer works from the 3.3 V pin but quieter. For full volume, switch its − side with an NPN transistor (e.g. 2N2222, 1 kΩ to the base) and put + on 5 V.
* **Red LED** needs a resistor (220–330 Ω, not in the parts list); without one it can damage the GPIO. Solid = heat alarm, blinking = no server (local mode).
* **Pump:** powered by the 2×AA holder through relay 1, never from the ESP32. Keep the pump submerged; running it dry damages it.
* **Soil calibration:** read `soil_raw` in the Serial Monitor with the probe in dry air and in a glass of water, then enter both in Settings → Sensors & calibration (the *Use current* buttons fill in the live raw value). No re-flashing needed.
* **Grow light:** prefer a low-voltage (5 V / 12 V) LED grow light on relay 2. If you switch mains (220 V), use an enclosed, properly rated setup. Mains wiring is dangerous.
* Most blue relay boards switch on with a LOW input (`RELAY_ACTIVE_LOW 1`). If the relays act inverted, set it to 0.

---

## 3. How the automation works

The server decides; the ESP32 obeys. Every reading gets a response with `commands` (pump / grow_light / buzzer). All thresholds are editable in Settings (`PUT /api/v1/settings`). They apply immediately and reach the device with its next reading.

| Device | Turns ON when | Turns OFF when | Safety |
|---|---|---|---|
| **Water pump** | soil < `soilDryThreshold` (35 %) and the soak time since the last run has passed (`pumpMinIntervalMin`, 10 min) | soil ≥ `soilWetTarget` (62 %) **or** run time ≥ `pumpMaxRunSec` (30 s) **or** the soil sensor stops responding | never starts without a valid soil reading; firmware hard limit 120 s; an alert opens if 3 runs in a row don't raise the moisture (empty reservoir / kinked hose) |
| **Grow light** | light < `lightOnThreshold` (1,500 lux) | light ≥ threshold + `lightHysteresisPct` (20 % → 1,800 lux) | minimum `growLightMinSwitchSec` (5 min) between switches so the lamp's own glow can't make it flicker; optional daily schedule (`growLightScheduleEnabled`, `06:00–22:00`, `Asia/Dhaka`) |
| **Buzzer** | temperature > `tempAlarmThreshold` (32 °C), with a CRITICAL alert | temperature ≤ threshold − `tempAlarmHysteresis` (31 °C), or the alert is acknowledged (mutes it) | a new heat event after recovery opens a new alert and sounds again |

Small pumps water in **pulses**: up to 30 s, wait 10 min for the water to soak in, repeat until the target is reached. This avoids flooding, because a soil sensor reacts minutes after watering.

**Manual control** (`POST /api/v1/control/pump|grow-light|buzzer` with `{"mode":"ON"|"OFF"|"AUTO"}`):
* Pump ON is a timed watering (default = max run time, never more than 120 s), then it returns to AUTO by itself.
* Buzzer ON is a 5 s test beep.
* OFF disables the device until you set AUTO again (or until `durationSec` if given).

**Offline behaviour:** if the server can't be reached for 2 minutes, the firmware runs the same rules locally with the last thresholds it received. The LCD shows `LOCAL MODE` and the red LED blinks. On the server, a device that hasn't reported for `offlineAfterSec` (60 s) is marked offline and raises a "Device offline" alert. It resolves on the next reading.

**Alerts** (`GET /api/v1/alerts`): high temperature (critical, sounds the buzzer), dry soil (below the pump threshold), humidity outside the healthy range, low temperature, device offline, sensor fault (no valid value 3 times in a row, per sensor), pump not raising soil moisture. Threshold alerts close only once the value is back inside by a small margin, so sensor noise doesn't flood the log. Each type opens once, then resolves itself when the condition clears. Acknowledging one silences the buzzer.

**Activity log** (`GET /api/v1/logs`): every switch with its reason ("Pump ON (auto): Soil moisture 33.4% below 35%"), settings changes with before/after values, alerts, device online/offline and logins.

**Data retention:** readings, logs and events older than `dataRetentionDays` (90) are deleted automatically.

---

## 4. Connecting your frontend

1. Log in: `POST /api/v1/auth/login {email,password}` sets an httpOnly `accessToken` cookie and also returns `accessToken` for `Authorization: Bearer` use. Use `credentials: 'include'` with fetch.
2. Dashboard cards: `GET /api/v1/dashboard/summary`. One call returns every value on the dashboard screenshots: current value, status badge (`Moist`, `Optimal`, `Low light`…), 24 h high/low, "Last hour" change, "Pump starts below", "Next watering", "Buzzer sounds above", "Healthy range", "Grow light below" and the 24 h chart series.
3. Sensor history page: `GET /api/v1/history?range=24h|7d|30d` returns the table (Now / Min / Average / Max / Time outside target), the chart series, the threshold lines and the pump-run markers. The download button links to `GET /api/v1/history/export.csv?range=…`.
4. Live updates: `new EventSource(API + '/api/v1/stream', { withCredentials: true })` emits `reading` events (new values + statuses + relay states), plus `actuators`, `alert`, `log`, `device` and `settings`. If your host can't keep long connections open, poll `/dashboard/summary` every 5–10 s instead.
5. Settings page: `GET` / `PUT /api/v1/settings`.

`docs/greenhouse-client.ts` wraps all of this with types. Copy it into the frontend.

For a dashboard on another domain over HTTPS, set `FRONTEND_URL=https://your-dashboard.app`, `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`.

---

## 5. Deployment

Use a host that runs a **long-lived Node process**: a VPS, Render, Railway, Fly.io, or a PC / Raspberry Pi on the same network as the greenhouse. Realtime streams and the background offline watchdog need it.

```bash
npm ci && npm run build
npm run start:prod      # = migrate deploy + seed (only does something on first run) + start
```

`vercel.json` is left from the previous project. Serverless hosts (Vercel) can't keep the realtime stream open or run background jobs. If you deploy there anyway, set `JOBS_ENABLED=false` and poll the summary endpoint. Offline detection then runs whenever the dashboard loads.

## 6. Development

```bash
npm test                                   # automation-engine unit tests
RUN_E2E=1 npm test                         # + end-to-end API tests (needs DATABASE_URL to a TEST database)
npm run typecheck
npm run device:rotate-key                  # lost the device key? issues a new one
npm run db:studio                          # browse the data
```

Project layout:

```
src/engine/            pure automation rules + statistics (unit-tested)
src/services/          automation runner, alerts/logs, realtime hub, background jobs
src/app/modules/       device (hardware API), dashboard, history, settings, control, logs/alerts, devices, stream, auth
prisma/schema/         database schema + migration
firmware/              ESP32 sketch
_legacy/               unused code from the previous store project (kept for reference, not compiled)
```
