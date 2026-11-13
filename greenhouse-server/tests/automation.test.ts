import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideBuzzer,
  decideGrowLight,
  decidePump,
  decideTempAlarm,
  inWindow,
} from '../src/engine/automation';
import { etaToThresholdHours, slopePerHour, soilRawToPercent } from '../src/engine/math';
import { EngineSettings, EngineState, Sample } from '../src/engine/types';

const S: EngineSettings = {
  soilDryThreshold: 35, soilWetTarget: 62, pumpMaxRunSec: 30, pumpMinIntervalMin: 10,
  tempAlarmThreshold: 32, tempAlarmHysteresis: 1, tempLowThreshold: 15,
  humidityMin: 45, humidityMax: 80,
  lightOnThreshold: 1500, lightHysteresisPct: 20, growLightMinSwitchSec: 300,
  growLightScheduleEnabled: false, growLightStart: '06:00', growLightEnd: '22:00', timezone: 'Asia/Dhaka',
};
const st = (o: Partial<EngineState> = {}): EngineState => ({
  mode: 'AUTO', desiredOn: false, manualUntil: null, lastChangedAt: null, lastOnAt: null, lastOffAt: null, ...o,
});
const x = (o: Partial<Sample> = {}): Sample => ({ soil: 50, temperature: 24, humidity: 60, lux: 5000, ...o });
const now = new Date('2026-11-12T08:00:00Z');
const ago = (sec: number) => new Date(now.getTime() - sec * 1000);

// ── Pump ───────────────────────────────────────────────────────────
test('pump starts when soil is below the dry threshold', () => {
  assert.equal(decidePump(S, st(), x({ soil: 34.9 }), now).desiredOn, true);
  assert.equal(decidePump(S, st(), x({ soil: 35 }), now).desiredOn, false);
});

test('pump respects the soak interval after a run', () => {
  const d = decidePump(S, st({ lastOffAt: ago(120) }), x({ soil: 20 }), now);
  assert.equal(d.desiredOn, false);
  assert.equal(decidePump(S, st({ lastOffAt: ago(11 * 60) }), x({ soil: 20 }), now).desiredOn, true);
});

test('pump never starts without a valid soil reading', () => {
  assert.equal(decidePump(S, st(), x({ soil: null }), now).desiredOn, false);
});

test('pump stops at the wet target', () => {
  const d = decidePump(S, st({ desiredOn: true, lastOnAt: ago(10) }), x({ soil: 62 }), now);
  assert.equal(d.desiredOn, false);
  assert.equal(d.endReason, 'TARGET_REACHED');
});

test('pump stops at max run time even if soil is still dry', () => {
  const d = decidePump(S, st({ desiredOn: true, lastOnAt: ago(31) }), x({ soil: 36 }), now);
  assert.equal(d.desiredOn, false);
  assert.equal(d.endReason, 'MAX_RUNTIME');
  assert.equal(d.source, 'SAFETY');
});

test('pump stops if the soil sensor drops out mid-run', () => {
  const d = decidePump(S, st({ desiredOn: true, lastOnAt: ago(5) }), x({ soil: null }), now);
  assert.equal(d.desiredOn, false);
  assert.equal(d.endReason, 'SENSOR_FAULT');
});

test('manual pump ON works but is capped by the hard safety limit', () => {
  assert.equal(decidePump(S, st({ mode: 'ON' }), x({ soil: 80 }), now).desiredOn, true);
  const d = decidePump(S, st({ mode: 'ON', desiredOn: true, lastOnAt: ago(121) }), x(), now);
  assert.equal(d.desiredOn, false);
  assert.equal(d.endReason, 'MAX_RUNTIME');
});

test('manual pump OFF overrides dry soil', () => {
  assert.equal(decidePump(S, st({ mode: 'OFF' }), x({ soil: 5 }), now).desiredOn, false);
});

// ── Grow light ─────────────────────────────────────────────────────
test('grow light turns on below threshold and off above threshold + hysteresis', () => {
  assert.equal(decideGrowLight(S, st(), x({ lux: 30 }), now).desiredOn, true);
  assert.equal(decideGrowLight(S, st(), x({ lux: 1500 }), now).desiredOn, false);
  // already on: 1600 is above threshold but below 1800 -> stays on
  assert.equal(decideGrowLight(S, st({ desiredOn: true, lastChangedAt: ago(900) }), x({ lux: 1600 }), now).desiredOn, true);
  assert.equal(decideGrowLight(S, st({ desiredOn: true, lastChangedAt: ago(900) }), x({ lux: 1800 }), now).desiredOn, false);
});

test('grow light holds its state during the minimum switch interval', () => {
  const d = decideGrowLight(S, st({ desiredOn: true, lastChangedAt: ago(60) }), x({ lux: 9000 }), now);
  assert.equal(d.desiredOn, true);
});

test('grow light keeps its state when the light sensor is missing', () => {
  assert.equal(decideGrowLight(S, st({ desiredOn: true, lastChangedAt: ago(900) }), x({ lux: null }), now).desiredOn, true);
  assert.equal(decideGrowLight(S, st({ desiredOn: false }), x({ lux: null }), now).desiredOn, false);
});

test('grow light schedule forces it off outside the window', () => {
  const sched = { ...S, growLightScheduleEnabled: true };
  // 08:00Z = 14:00 Dhaka -> inside 06:00-22:00
  assert.equal(decideGrowLight(sched, st(), x({ lux: 10 }), now).desiredOn, true);
  // 20:00Z = 02:00 Dhaka -> outside
  const night = new Date('2026-11-12T20:00:00Z');
  const d = decideGrowLight(sched, st({ desiredOn: true, lastChangedAt: new Date(night.getTime() - 5000) }), x({ lux: 10 }), night);
  assert.equal(d.desiredOn, false);
  assert.equal(d.endReason, 'SCHEDULE');
});

test('time window handles wrap past midnight', () => {
  const t = (iso: string) => new Date(iso);
  // 18:00 -> 06:00 Dhaka (UTC+6). 13:00Z = 19:00 local (in), 03:00Z = 09:00 local (out)
  assert.equal(inWindow(t('2026-11-12T13:00:00Z'), '18:00', '06:00', 'Asia/Dhaka'), true);
  assert.equal(inWindow(t('2026-11-12T03:00:00Z'), '18:00', '06:00', 'Asia/Dhaka'), false);
});

// ── Temperature alarm / buzzer ─────────────────────────────────────
test('temperature alarm opens above threshold and closes only below threshold - hysteresis', () => {
  assert.equal(decideTempAlarm(S, 32, 'NONE'), 'KEEP');
  assert.equal(decideTempAlarm(S, 32.1, 'NONE'), 'OPEN');
  assert.equal(decideTempAlarm(S, 31.5, 'ACTIVE'), 'KEEP'); // still inside hysteresis band
  assert.equal(decideTempAlarm(S, 31, 'ACTIVE'), 'CLOSE');
  assert.equal(decideTempAlarm(S, 31.5, 'ACKNOWLEDGED'), 'KEEP');
  assert.equal(decideTempAlarm(S, null, 'ACTIVE'), 'KEEP');
});

test('buzzer sounds only for an un-acknowledged alert', () => {
  assert.equal(decideBuzzer(st(), 'ACTIVE').desiredOn, true);
  assert.equal(decideBuzzer(st(), 'ACKNOWLEDGED').desiredOn, false);
  assert.equal(decideBuzzer(st(), 'NONE').desiredOn, false);
  assert.equal(decideBuzzer(st({ mode: 'OFF' }), 'ACTIVE').desiredOn, false); // muted
  assert.equal(decideBuzzer(st({ mode: 'ON' }), 'NONE').desiredOn, true); // test beep
});

// ── Math ───────────────────────────────────────────────────────────
test('soil raw -> percent uses the calibration and rejects disconnected sensors', () => {
  assert.equal(soilRawToPercent(3100, 3100, 1300), 0);
  assert.equal(soilRawToPercent(1300, 3100, 1300), 100);
  assert.equal(soilRawToPercent(2200, 3100, 1300), 50);
  assert.equal(soilRawToPercent(0, 3100, 1300), null);
  assert.equal(soilRawToPercent(4095, 3100, 1300), null);
});

test('next-watering estimate from the drying trend', () => {
  const pts = Array.from({ length: 12 }, (_, i) => ({ t: i * 30 * 60_000, v: 60 - i * 1 })); // -2 %/h
  const slope = slopePerHour(pts)!;
  assert.ok(Math.abs(slope + 2) < 0.01);
  assert.ok(Math.abs(etaToThresholdHours(49, 35, slope)! - 7) < 0.05);
  assert.equal(etaToThresholdHours(30, 35, slope), 0);
  assert.equal(etaToThresholdHours(50, 35, 0.3), null);
});
