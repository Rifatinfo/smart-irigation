/**
 * End-to-end test against a real PostgreSQL database.
 *   RUN_E2E=1 DATABASE_URL=postgresql://... npm test
 * Creates its own throw-away device, so it is safe to run next to real data (but use a TEST database anyway).
 */
import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';

const RUN = process.env.RUN_E2E === '1';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('greenhouse API (end-to-end)', { skip: !RUN }, () => {
  let base = '';
  let server: http.Server;
  let token = '';
  let deviceId = '';
  let apiKey = '';
  let prisma: typeof import('../src/shared/prisma').default;
  let offlineWatchdog: typeof import('../src/services/jobs').offlineWatchdog;

  const api = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${base}/api/v1${path}${path.startsWith('/device') || path.startsWith('/auth') || path.includes('deviceId=') ? '' : `${sep}deviceId=${deviceId}`}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* csv */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  const post = (body: Record<string, unknown>, key = apiKey) =>
    api('POST', '/device/readings', body, { 'x-api-key': key, authorization: '' });
  const reading = (o: Record<string, unknown> = {}) => ({
    soil_moisture: 50, temperature: 24, humidity: 60, light_lux: 5000, pump: false, grow_light: false, buzzer: false, ...o,
  });
  const summary = async () => (await api('GET', '/dashboard/summary')).json.data;

  before(async () => {
    const { default: app } = await import('../src/app');
    prisma = (await import('../src/shared/prisma')).default;
    ({ offlineWatchdog } = await import('../src/services/jobs'));
    const { createDevice } = await import('../src/services/deviceStore');
    const bcrypt = await import('bcryptjs');

    server = http.createServer(app).listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    await prisma.user.upsert({
      where: { email: 'e2e@test.local' },
      update: {},
      create: { email: 'e2e@test.local', password: await bcrypt.hash('E2e-password-1', 4) },
    });
    const created = await createDevice(`E2E-${Date.now()}`);
    deviceId = created.device.id;
    apiKey = created.apiKey;

    const login = await api('POST', '/auth/login', { email: 'e2e@test.local', password: 'E2e-password-1' });
    assert.equal(login.status, 200);
    token = login.json.data.accessToken;

    // make time-based rules testable in a few seconds
    const r = await api('PUT', '/settings', { pumpMinIntervalMin: 0, growLightMinSwitchSec: 0, pumpMaxRunSec: 3 });
    assert.equal(r.status, 200, r.text);
  });

  after(async () => {
    await prisma.device.delete({ where: { id: deviceId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: 'e2e@test.local' } });
    server.closeAllConnections();
    server.close();
    await prisma.$disconnect();
  });

  test('auth: dashboard endpoints require login, wrong password is rejected', async () => {
    const noAuth = await fetch(`${base}/api/v1/dashboard/summary`);
    assert.equal(noAuth.status, 401);
    const bad = await api('POST', '/auth/login', { email: 'e2e@test.local', password: 'nope' });
    assert.equal(bad.status, 401);
    const me = await api('GET', '/auth/me');
    assert.equal(me.json.data.email, 'e2e@test.local');
  });

  test('device auth: missing / wrong key is rejected', async () => {
    assert.equal((await api('POST', '/device/readings', reading(), { authorization: '' })).status, 401);
    assert.equal((await post(reading(), 'ghk_wrong')).status, 401);
  });

  test('payload validation: garbage is rejected, camelCase and aliases are accepted', async () => {
    assert.equal((await post({ temperature: 'hot' })).status, 400);
    const ok = await post({ soilMoisture: 50, temp: 24, hum: 60, lux: 5000, growLight: false });
    assert.equal(ok.status, 200, ok.text);
  });

  test('normal reading is stored, device goes online, dashboard shows real values', async () => {
    const r = await post(reading({ firmware: 'test-1.0', rssi: -60 }));
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.commands, { pump: false, grow_light: false, buzzer: false });
    assert.equal(r.json.config.soil_dry_threshold, 35);

    const s = await summary();
    assert.equal(s.device.isOnline, true);
    assert.equal(s.device.firmwareVersion, 'test-1.0');
    assert.equal(s.sensors.soilMoisture.value, 50);
    assert.equal(s.sensors.soilMoisture.status.label, 'Moist');
    assert.equal(s.sensors.temperature.status.label, 'Optimal');
    assert.equal(s.sensors.humidity.status.label, 'Optimal');
    assert.equal(s.sensors.light.status.label, 'Good light');
    assert.equal(s.sensors.temperature.buzzerSoundsAbove, 32);
    assert.ok(s.sensors.temperature.series.length >= 1);
  });

  test('raw soil ADC is converted with the calibration from settings', async () => {
    // defaults: dry=3100 wet=1300 -> raw 2200 = 50 %
    const r = await post({ soil_raw: 2200, temperature: 24, humidity: 60, light_lux: 5000 });
    assert.equal(r.status, 200);
    assert.equal((await summary()).sensors.soilMoisture.value, 50);
    // disconnected sensor reads 0 -> treated as missing, not as "bone dry"
    await post({ soil_raw: 0, temperature: 24, humidity: 60, light_lux: 5000 });
    assert.equal((await summary()).sensors.soilMoisture.value, null);
  });

  test('dry soil starts the pump, target moisture stops it, the run is recorded', async () => {
    const start = await post(reading({ soil_moisture: 30 }));
    assert.equal(start.json.commands.pump, true);
    assert.ok(start.json.pump_run_sec >= 1 && start.json.pump_run_sec <= 3);

    // still dry but below target -> keeps running
    assert.equal((await post(reading({ soil_moisture: 45, pump: true }))).json.commands.pump, true);
    // reaches the target -> stops
    const stop = await post(reading({ soil_moisture: 62, pump: true }));
    assert.equal(stop.json.commands.pump, false);

    const hist = (await api('GET', '/history?range=24h')).json.data;
    const run = hist.events.filter((e: any) => e.actuator === 'PUMP').at(-1);
    assert.equal(run.source, 'AUTO');
    assert.equal(run.endReason, 'TARGET_REACHED');
    assert.equal(run.soilBefore, 30);
    assert.equal(run.soilAfter, 62);
    assert.ok(hist.totals.pumpRuns >= 1);

    const logs = (await api('GET', '/logs?source=PUMP')).json.data.map((l: any) => l.message);
    assert.ok(logs.some((m: string) => m.startsWith('Pump ON')), logs.join('|'));
    assert.ok(logs.some((m: string) => m.startsWith('Pump OFF') && m.includes('target')), logs.join('|'));
  });

  test('pump safety: stops at max run time even if soil is still dry', async () => {
    assert.equal((await post(reading({ soil_moisture: 30 }))).json.commands.pump, true);
    await sleep(3300);
    const r = await post(reading({ soil_moisture: 31, pump: true }));
    assert.equal(r.json.commands.pump, false);
    const run = (await api('GET', '/history?range=24h')).json.data.events.filter((e: any) => e.actuator === 'PUMP').at(-1);
    assert.equal(run.endReason, 'MAX_RUNTIME');
    assert.equal(run.source, 'AUTO'); // source = what started the run
    const msgs = (await api('GET', '/logs?source=PUMP')).json.data.map((l: any) => l.message);
    assert.ok(msgs.some((m: string) => m.startsWith('Pump OFF') && m.includes('Max run time')), msgs.join('|'));
  });

  test('pump never starts without a soil reading', async () => {
    const r = await post({ temperature: 24, humidity: 60, light_lux: 5000, pump: false });
    assert.equal(r.json.commands.pump, false);
  });

  test('low light turns the grow light on; bright light turns it off (with hysteresis)', async () => {
    assert.equal((await post(reading({ light_lux: 30 }))).json.commands.grow_light, true);
    assert.equal((await post(reading({ light_lux: 1600, grow_light: true }))).json.commands.grow_light, true); // inside hysteresis band
    assert.equal((await post(reading({ light_lux: 1900, grow_light: true }))).json.commands.grow_light, false);
    const s = await summary();
    assert.equal(s.actuators.growLight.desiredOn, false);
  });

  test('over-temperature: alert + buzzer, acknowledge silences it, cooling resolves it', async () => {
    const hot = await post(reading({ temperature: 33.4 }));
    assert.equal(hot.json.commands.buzzer, true);
    let s = await summary();
    assert.equal(s.sensors.temperature.status.label, 'Too hot');
    const alert = s.alerts.items.find((a: any) => a.type === 'HIGH_TEMPERATURE');
    assert.ok(alert);
    assert.equal(alert.severity, 'CRITICAL');

    // still hot -> buzzer stays on and no duplicate alert is created
    await post(reading({ temperature: 33.9, buzzer: true }));
    s = await summary();
    assert.equal(s.alerts.items.filter((a: any) => a.type === 'HIGH_TEMPERATURE').length, 1);

    // acknowledge -> buzzer off immediately, alert stays open
    const ack = await api('POST', `/alerts/${alert.id}/acknowledge`);
    assert.equal(ack.status, 200);
    const afterAck = await post(reading({ temperature: 33.5, buzzer: true }));
    assert.equal(afterAck.json.commands.buzzer, false);

    // inside hysteresis band -> alert stays open; below threshold-1 -> resolved
    await post(reading({ temperature: 31.5 }));
    assert.ok((await summary()).alerts.items.some((a: any) => a.type === 'HIGH_TEMPERATURE'));
    await post(reading({ temperature: 30.5 }));
    assert.ok(!(await summary()).alerts.items.some((a: any) => a.type === 'HIGH_TEMPERATURE'));
    const resolved = (await api('GET', '/alerts?status=resolved')).json.data;
    assert.ok(resolved.some((a: any) => a.type === 'HIGH_TEMPERATURE'));

    // the next heat wave opens a brand-new alert and the buzzer sounds again
    assert.equal((await post(reading({ temperature: 34 }))).json.commands.buzzer, true);
    await post(reading({ temperature: 25 }));
  });

  test('manual control: pump ON is time-limited, OFF blocks auto, AUTO restores', async () => {
    const on = await api('POST', '/control/pump', { mode: 'ON', durationSec: 2 });
    assert.equal(on.status, 200);
    assert.equal(on.json.data.pump.mode, 'ON');
    assert.equal((await post(reading({ soil_moisture: 70 }))).json.commands.pump, true);
    await sleep(2300);
    assert.equal((await post(reading({ soil_moisture: 70, pump: true }))).json.commands.pump, false);
    assert.equal((await summary()).actuators.pump.mode, 'AUTO'); // override expired by itself

    await api('POST', '/control/pump', { mode: 'OFF' });
    assert.equal((await post(reading({ soil_moisture: 10 }))).json.commands.pump, false); // disabled
    await api('POST', '/control/pump', { mode: 'AUTO' });
    assert.equal((await post(reading({ soil_moisture: 10 }))).json.commands.pump, true); // automation is back
    await api('POST', '/control/pump', { mode: 'OFF' });
    await api('POST', '/control/pump', { mode: 'AUTO' });

    const gl = await api('POST', '/control/grow-light', { mode: 'ON' });
    assert.equal(gl.json.data.growLight.desiredOn, true);
    await api('POST', '/control/grow-light', { mode: 'AUTO' });
    assert.equal((await api('POST', '/control/lamp', { mode: 'ON' })).status, 404);
    assert.equal((await api('POST', '/control/pump', { mode: 'ON', durationSec: 0 })).status, 400);
  });

  test('settings: validated, applied immediately, bump the config version', async () => {
    const bad = await api('PUT', '/settings', { soilDryThreshold: 70, soilWetTarget: 60 });
    assert.equal(bad.status, 400);
    assert.equal((await api('PUT', '/settings', { soilDryThreshold: 'x' })).status, 400);
    assert.equal((await api('PUT', '/settings', { unknownField: 1 })).status, 400);

    const before = (await post(reading())).json.config_version;
    const ok = await api('PUT', '/settings', { tempAlarmThreshold: 28, soilDryThreshold: 40 });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json.meta.changed.sort(), ['soilDryThreshold', 'tempAlarmThreshold']);
    const after = await post(reading({ soil_moisture: 38, temperature: 29 }));
    assert.equal(after.json.config_version, before + 1);
    assert.equal(after.json.config.soil_dry_threshold, 40);
    assert.equal(after.json.commands.pump, true); // 38 < new threshold 40
    assert.equal(after.json.commands.buzzer, true); // 29 > new alarm 28

    await api('PUT', '/settings', { tempAlarmThreshold: 32, soilDryThreshold: 35 });
    await post(reading({ temperature: 24, soil_moisture: 50 }));
    await api('POST', '/alerts/acknowledge-all');
  });

  test('sensor fault: alert after 3 missing readings, resolved when values return', async () => {
    for (let i = 0; i < 3; i++) await post({ temperature: 24, humidity: 60, light_lux: 5000 }); // soil missing
    let s = await summary();
    assert.ok(s.alerts.items.some((a: any) => a.type === 'SENSOR_FAULT' && /Soil/.test(a.title)));
    await post(reading());
    s = await summary();
    assert.ok(!s.alerts.items.some((a: any) => a.type === 'SENSOR_FAULT'));
  });

  test('device offline: watchdog raises an alert, next reading recovers it', async () => {
    await post(reading());
    await prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date(Date.now() - 10 * 60_000) } });
    await offlineWatchdog();
    let s = await summary();
    assert.equal(s.device.isOnline, false);
    assert.ok(s.alerts.items.some((a: any) => a.type === 'DEVICE_OFFLINE'));
    await post(reading());
    s = await summary();
    assert.equal(s.device.isOnline, true);
    assert.ok(!s.alerts.items.some((a: any) => a.type === 'DEVICE_OFFLINE'));
  });

  test('history: series, stats, time-outside-target, pump markers, CSV export', async () => {
    const h = (await api('GET', '/history?range=24h')).json.data;
    assert.equal(h.range.bucketSec, 900);
    assert.ok(h.series.soilMoisture.length >= 1);
    for (const k of ['soilMoisture', 'temperature', 'humidity', 'light']) {
      const st = h.stats[k];
      assert.ok(st.samples > 0, k);
      assert.ok(st.min <= st.average && st.average <= st.max, `${k} ${JSON.stringify(st)}`);
      assert.ok(st.outsidePct >= 0 && st.outsidePct <= 100);
    }
    assert.equal(h.thresholds.tempAlarm, 32);
    assert.ok(h.stats.temperature.outsidePct > 0);
    assert.match(h.stats.temperature.outsideLabel, /above 32/);

    for (const range of ['7d', '30d']) {
      assert.equal((await api('GET', `/history?range=${range}`)).status, 200);
    }
    assert.equal((await api('GET', '/history?range=custom')).status, 400);
    const custom = await api('GET', `/history?range=custom&from=${encodeURIComponent(new Date(Date.now() - 3600_000).toISOString())}`);
    assert.equal(custom.status, 200, custom.text);

    const csv = await api('GET', '/history/export.csv?range=24h');
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
    assert.match(csv.headers.get('content-disposition') ?? '', /attachment; filename=".*\.csv"/);
    const lines = csv.text.trim().split('\n');
    assert.equal(lines[0], 'timestamp_utc,soil_moisture_pct,temperature_c,humidity_pct,light_lux,pump_on,grow_light_on,buzzer_on');
    assert.ok(lines.length >= 2);
  });

  test('statistics are correct for 24h of known data (extremes, last-hour change, next-watering trend)', async () => {
    const { createDevice } = await import('../src/services/deviceStore');
    const { device, apiKey: key } = await createDevice(`E2E-stats-${Date.now()}`);
    const id = device.id;
    try {
      const now = Date.now();
      const rows = [];
      for (let m = 24 * 60; m >= 1; m -= 5) {
        const hoursAgo = m / 60;
        rows.push({
          deviceId: id,
          createdAt: new Date(now - m * 60_000),
          soilMoisture: 0,
          temperature: 20 + (hoursAgo === 3 ? 10 : 0), // single hot spike 3h ago
          humidity: hoursAgo > 12 ? 50 : 90, // 50% for the first half, 90% for the second
          lightLux: 1000,
        });
      }
      // soil: constant 70 until 6h ago, then drying linearly at -2 %/h down to 58 (now)
      rows.forEach((r, i) => {
        const hoursAgo = (24 * 60 - i * 5) / 60;
        r.soilMoisture = hoursAgo > 6 ? 70 : 58 + 2 * hoursAgo;
      });
      await prisma.sensorReading.createMany({ data: rows });
      await prisma.device.update({ where: { id }, data: { isOnline: true, lastSeenAt: new Date() } });

      // one live reading "now": soil 58, temp 20, humidity 90, light 1000
      const live = await api('POST', '/device/readings', { soil_moisture: 58, temperature: 20, humidity: 90, light_lux: 1000 }, { 'x-api-key': key, authorization: '' });
      assert.equal(live.status, 200, live.text);

      const s = (await api('GET', `/dashboard/summary?deviceId=${id}`)).json.data;
      assert.equal(s.sensors.temperature.high24h, 30);
      assert.equal(s.sensors.temperature.low24h, 20);
      assert.equal(s.sensors.humidity.high24h, 90);
      assert.equal(s.sensors.humidity.low24h, 50);
      assert.equal(s.sensors.soilMoisture.low24h, 58);
      assert.equal(s.sensors.soilMoisture.high24h, 70);
      // 1 h ago soil was 60, now 58 -> -2 ; temperature unchanged
      assert.ok(Math.abs(s.sensors.soilMoisture.lastHourDelta + 2) < 0.6, String(s.sensors.soilMoisture.lastHourDelta));
      assert.equal(s.sensors.temperature.lastHourDelta, 0);
      // drying at 2 %/h from 58 -> (58-35)/2 = 11.5 h
      const nw = s.sensors.soilMoisture.nextWatering;
      assert.equal(nw.state, 'trend');
      assert.ok(Math.abs(nw.etaSec / 3600 - 11.5) < 1.0, `eta ${nw.etaSec / 3600} h`);
      assert.ok(s.sensors.soilMoisture.series.length >= 90 && s.sensors.soilMoisture.series.length <= 98);

      const h = (await api('GET', `/history?range=24h&deviceId=${id}`)).json.data;
      assert.ok(h.series.temperature.length <= 98);
      assert.equal(h.stats.temperature.max, 30);
      assert.equal(h.stats.temperature.min, 20);
      // temperature was above 32 never -> 0 % outside target; humidity outside 45-80 for the 90 % half
      assert.equal(h.stats.temperature.outsidePct, 0);
      assert.equal(h.stats.temperature.outsideLabel, 'on target');
      assert.ok(Math.abs(h.stats.humidity.outsidePct - 50) <= 2, String(h.stats.humidity.outsidePct));
      // light 1000 < 1500 the whole time
      assert.equal(h.stats.light.outsidePct, 100);
      assert.equal(h.stats.light.outsideLabel, 'grow light needed');
      // 7-day / 30-day views bucket correctly
      const d7 = (await api('GET', `/history?range=7d&deviceId=${id}`)).json.data;
      assert.equal(d7.range.bucketSec, 3600);
      assert.ok(d7.series.temperature.length >= 24 && d7.series.temperature.length <= 26);
    } finally {
      await prisma.device.delete({ where: { id } });
    }
  });

  test('logs: pagination and filters', async () => {
    const all = (await api('GET', '/logs?limit=5&page=1')).json;
    assert.equal(all.data.length, 5);
    assert.ok(all.meta.total > 5);
    const warn = (await api('GET', '/logs?level=CRITICAL')).json.data;
    assert.ok(warn.length > 0 && warn.every((l: any) => l.level === 'CRITICAL'));
    const q = (await api('GET', '/logs?q=settings%20updated')).json.data;
    assert.ok(q.length > 0);
    assert.equal((await api('GET', '/logs?limit=9999')).status, 400);
  });

  test('device admin: create returns the key once, rotate invalidates the old key', async () => {
    const created = await api('POST', '/devices', { name: 'E2E second' });
    assert.equal(created.status, 201);
    const { id, apiKey: k1 } = created.json.data;
    assert.match(k1, /^ghk_/);
    assert.equal((await post(reading(), k1)).status, 200);
    const rot = await api('POST', `/devices/${id}/rotate-key`);
    assert.equal((await post(reading(), k1)).status, 401);
    assert.equal((await post(reading(), rot.json.data.apiKey)).status, 200);
    const list = (await api('GET', '/devices')).json.data;
    assert.ok(list.every((d: any) => !('apiKey' in d) && !('apiKeyHash' in d)));
    await api('DELETE', `/devices/${id}`);
  });

  test('realtime: SSE delivers a snapshot, then live readings', async () => {
    const res = await fetch(`${base}/api/v1/stream?deviceId=${deviceId}&access_token=${token}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const until = async (needle: string, ms = 4000) => {
      const t0 = Date.now();
      while (!buf.includes(needle)) {
        if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${needle}; got: ${buf.slice(0, 300)}`);
        const { value, done } = await Promise.race([reader.read(), sleep(500).then(() => ({ value: undefined, done: false }))]);
        if (done) break;
        if (value) buf += dec.decode(value);
      }
    };
    await until('event: snapshot');
    await post(reading({ soil_moisture: 48.5 }));
    await until('event: reading');
    assert.ok(buf.includes('"soilMoisture":48.5'), buf);
    await reader.cancel();
  });

  test('stream also requires auth', async () => {
    const res = await fetch(`${base}/api/v1/stream?deviceId=${deviceId}`);
    assert.equal(res.status, 401);
  });
});
