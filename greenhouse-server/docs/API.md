# Greenhouse API reference

Base URL: `http://<server>:5000/api/v1`

Dashboard responses use one envelope: `{ "success": true, "message": "...", "meta": {...}|null, "data": ... }`.
Errors: `{ "success": false, "message": "...", "error": [ { "path": "...", "message": "..." } ] }` with status 400/401/404/409/429/500.

Dashboard endpoints need a login: the `accessToken` cookie or `Authorization: Bearer <token>`.
All of them accept an optional `?deviceId=` (default: the first registered device).

---

## Hardware (ESP32)

Authenticate with the header `x-api-key: <device key>`. Limit: 120 requests/min per device.

### `POST /device/readings`

Send every `reading_interval_sec`. Any field may be `null` or missing (sensor failure). camelCase keys are accepted too.

```json
{
  "soil_raw": 2240,          // raw ADC; the server converts it with the calibration in Settings
  "soil_moisture": null,     // OR send % directly
  "temperature": 23.4,       // °C
  "humidity": 74,            // %
  "light_lux": 30,
  "pump": false,             // actual relay states (feedback)
  "grow_light": true,
  "buzzer": false,
  "rssi": -61, "firmware": "gh-esp32-1.0.0", "uptime_s": 3600,
  "hw": { "soil": "Capacitive v2.0 on GPIO 34" }   // optional labels shown on the dashboard
}
```

Implausible values (soil outside 0–100 %, temperature outside −40…85 °C, a disconnected soil probe's raw value…) are stored as `null`.

Response (also from `GET /device/config`, which the firmware may call at boot):

```json
{
  "ok": true,
  "server_time": "2026-11-12T15:34:22.007Z",
  "commands": { "pump": false, "grow_light": true, "buzzer": false },
  "pump_run_sec": 0,                // when pump=true: max seconds to run without hearing from the server
  "config_version": 3,              // increases whenever settings change
  "config": {
    "reading_interval_sec": 10, "soil_dry_threshold": 35, "soil_wet_target": 62,
    "pump_max_run_sec": 30, "pump_min_interval_min": 10, "temp_alarm_threshold": 32,
    "light_on_threshold": 1500, "light_hysteresis_pct": 20, "soil_raw_dry": 3100, "soil_raw_wet": 1300
  }
}
```

---

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/login` | `{email, password}` | sets `accessToken` (1 h) + `refreshToken` (30 d) cookies; `data: {user, needPasswordChange, accessToken}` |
| POST | `/auth/refresh-token` | – (cookie) or `{refreshToken}` | new access token |
| POST | `/auth/logout` | – | clears cookies |
| GET | `/auth/me` | – | current user |
| POST | `/auth/change-password` | `{oldPassword, newPassword}` | min 8 chars |

---

## Dashboard

### `GET /dashboard/summary` (`?series=false` skips the chart data)

```jsonc
{
  "device": { "id", "name", "isOnline": true, "lastSeenAt", "firmwareVersion", "ipAddress", "rssi", "apiKeyPrefix",
              "hardware": { "soil": "Capacitive v2.0 on A0", "temperature": "DHT22 on GPIO 4", "humidity": "...", "light": "BH1750 on I²C 0x23" } },
  "updatedAt": "2026-11-12T15:35:04.495Z",   // time of the latest reading (null = no data yet)
  "hasData": true,
  "sensors": {
    "soilMoisture": {
      "label": "Soil moisture", "sensor": "Capacitive v2.0 on A0", "unit": "%",
      "value": 59, "status": { "code": "MOIST", "label": "Moist", "tone": "ok" },
      "high24h": 61, "low24h": 35, "lastHourDelta": 0,
      "pumpStartsBelow": 35, "pumpStopsAt": 62,
      "nextWatering": { "etaSec": 46800, "estimatedAt": "...", "state": "trend" },  // state: trend | due | watering | steady | unknown
      "series": [ { "t": "2026-11-11T15:30:00.000Z", "v": 50.2, "min": 40.1, "max": 59.9 } ]   // 15-min buckets, 24 h
    },
    "temperature": { ..., "buzzerSoundsAbove": 32 },
    "humidity":    { ..., "healthyRange": { "min": 45, "max": 80 } },
    "light":       { ..., "growLightBelow": 1500 }
  },
  "actuators": {
    "pump":      { "actuator": "PUMP", "mode": "AUTO", "isOn": false, "desiredOn": false, "reportedOn": false,
                   "reason": "Soil moisture OK", "manualUntil": null, "lastChangedAt", "lastOnAt", "lastOffAt" },
    "growLight": { ... }, "buzzer": { ... }
  },
  "alerts": { "activeCount": 0, "items": [ /* open alerts */ ] },
  "recentLogs": [ /* last 10 activity log rows */ ],
  "serverTime": "..."
}
```

Status codes and labels:
* soil: `DRY` Dry / `MOIST` Moist / `WET` Wet
* temperature: `TOO_HOT` Too hot / `TOO_COLD` Too cold / `OPTIMAL` Optimal
* humidity: `TOO_DRY` / `TOO_HUMID` / `OPTIMAL`
* light: `LOW_LIGHT` Low light / `GOOD_LIGHT` Good light
* any sensor: `NO_DATA`

`tone` is `ok | warn | alert | unknown`, so the UI can colour the badge without knowing every code.

### `GET /history?range=24h|7d|30d`  (or `range=custom&from=ISO&to=ISO`)

Buckets: 24 h → 15 min, 7 d → 1 h, 30 d → 6 h.

```jsonc
{
  "range": { "key": "24h", "from", "to", "bucketSec": 900 },
  "thresholds": { "soilDry": 35, "soilWetTarget": 62, "tempAlarm": 32, "humidityMin": 45, "humidityMax": 80, "lightOn": 1500 },
  "stats": {
    "soilMoisture": { "now": 59, "min": 35, "average": 53, "max": 61, "samples": 8640, "outsidePct": 8, "outsideLabel": "near 35%" },
    "temperature":  { ..., "outsideLabel": "above 32 °C" },
    "humidity":     { ..., "outsideLabel": "outside band" },
    "light":        { ..., "outsideLabel": "grow light needed" }      // "on target" when 0 %
  },
  "series": { "soilMoisture": [ {t,v,min,max} ], "temperature": [...], "humidity": [...], "light": [...] },
  "events": [ { "id", "actuator": "PUMP", "source": "AUTO", "reason", "startedAt", "endedAt", "durationSec": 30,
                "soilBefore": 33.4, "soilAfter": 49.3, "endReason": "MAX_RUNTIME" } ],   // pump markers = actuator PUMP
  "totals": { "samples", "pumpRuns", "pumpSeconds", "growLightSeconds", "buzzerAlarms" }
}
```

`endReason`: `TARGET_REACHED | MAX_RUNTIME | SENSOR_FAULT | MANUAL | SCHEDULE | THRESHOLD | CLEARED | ACKNOWLEDGED`.

### `GET /history/export.csv?range=…`

CSV download (`timestamp_utc, soil_moisture_pct, temperature_c, humidity_pct, light_lux, pump_on, grow_light_on, buzzer_on`). Resolution: 1 min for 24 h, 10 min for 7 d, 1 h for 30 d.

---

## Settings

`GET /settings` → all fields. `PUT` or `PATCH /settings` with only the fields to change.
Returns the new settings; `meta.changed` lists what changed. Takes effect immediately.

| Field | Default | Range | Meaning |
|---|---|---|---|
| soilDryThreshold | 35 | 0–100 | pump starts below (%) |
| soilWetTarget | 62 | 0–100, > dry | pump stops at (%) |
| pumpMaxRunSec | 30 | 1–120 | longest single run |
| pumpMinIntervalMin | 10 | 0–1440 | soak time between runs |
| soilRawDry / soilRawWet | 3100 / 1300 | ADC | soil probe calibration |
| tempAlarmThreshold | 32 | −20–80 | buzzer above (°C) |
| tempAlarmHysteresis | 1 | 0–20 | alarm clears at threshold − this |
| tempLowThreshold | 15 | | "Too cold" badge below |
| humidityMin / humidityMax | 45 / 80 | 0–100 | healthy band |
| lightOnThreshold | 1500 | lux | grow light on below |
| lightHysteresisPct | 20 | 0–300 | off at threshold × (1 + pct/100) |
| growLightMinSwitchSec | 300 | 0–3600 | anti-flicker |
| growLightScheduleEnabled / growLightStart / growLightEnd | false / 06:00 / 22:00 | HH:MM | light only allowed inside the window (may wrap midnight) |
| timezone | Asia/Dhaka | IANA | for the schedule |
| readingIntervalSec | 10 | 2–300 | how often the ESP32 reports |
| offlineAfterSec | 60 | ≥ 2 × interval | offline alert after |
| dataRetentionDays | 90 | 1–3650 | auto-delete older data |

`POST /settings/reset` restores the defaults.

---

## Manual control

| Method | Path | Body |
|---|---|---|
| GET | `/control` | – → `{pump, growLight, buzzer}` (same objects as `summary.actuators`) |
| POST | `/control/pump` · `/control/grow-light` · `/control/buzzer` | `{ "mode": "ON" \| "OFF" \| "AUTO", "durationSec"?: number }` |
| POST | `/control/reset` | – → everything back to AUTO |

Pump ON: timed run (default `pumpMaxRunSec`, max 120 s), then AUTO again. Buzzer ON: 5 s test (max 60 s).
OFF: disabled until AUTO (or until `durationSec`).

---

## Logs & alerts

* `GET /logs?page=1&limit=50&level=INFO|WARNING|CRITICAL&source=PUMP|GROW_LIGHT|BUZZER|SENSOR|DEVICE|SETTINGS|ALERT|AUTH|SYSTEM&q=text&from=ISO&to=ISO` → `meta: {page, limit, total, totalPages}`
* `GET /alerts?status=active|resolved|all&page=&limit=`
  alert: `{id, type: HIGH_TEMPERATURE|DEVICE_OFFLINE|SENSOR_FAULT|PUMP_INEFFECTIVE, severity: WARNING|CRITICAL, status: ACTIVE|ACKNOWLEDGED|RESOLVED, title, message, value, threshold, openedAt, acknowledgedAt, resolvedAt}`
* `POST /alerts/:id/acknowledge` silences the buzzer; the alert still resolves by itself when the condition clears.
* `POST /alerts/acknowledge-all`

---

## Devices

* `GET /devices`
* `POST /devices {name}` → `data.apiKey`, **shown once**
* `PATCH /devices/:id {name}`
* `POST /devices/:id/rotate-key` → new `apiKey`; the old one stops working
* `DELETE /devices/:id` deletes the device and all its data (not allowed for the last device)

---

## Realtime: `GET /stream` (Server-Sent Events)

```js
const es = new EventSource(`${API}/api/v1/stream`, { withCredentials: true });
// Bearer-token frontends (EventSource cannot send headers): `${API}/api/v1/stream?access_token=${token}`
```

| event | data |
|---|---|
| `snapshot` | full summary without series, sent once on connect |
| `reading` | `{ at, deviceId, values: {soilMoisture, temperature, humidity, light}, statuses: {...}, actuators: {...}, device: {...} }` |
| `actuators` | `{ pump, growLight, buzzer }` whenever something switches |
| `alert` | `{ action: "opened" \| "acknowledged" \| "resolved", alert }` |
| `log` | an activity-log row |
| `device` | device object (online / offline changes) |
| `settings` | full settings after a change |

A comment ping is sent every 25 s. The browser reconnects automatically (retry 3 s).

## Health

`GET /health` → `{status:"ok", database:"up"}` (no auth).
