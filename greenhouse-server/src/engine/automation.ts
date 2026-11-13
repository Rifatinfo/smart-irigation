import {
  Decision,
  EngineSettings,
  EngineState,
  MANUAL_PUMP_HARD_CAP_SEC,
  Sample,
} from './types';

const secondsBetween = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 1000;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * PUMP
 *  - starts when soil < dry threshold (and the soak time since the last run has elapsed)
 *  - stops at wet target, at the max run time, or if the soil sensor disappears
 *  - never starts without a valid soil reading
 */
export function decidePump(s: EngineSettings, st: EngineState, x: Sample, now: Date): Decision {
  const running = st.desiredOn;
  const runSec = running && st.lastOnAt ? secondsBetween(now, st.lastOnAt) : 0;

  if (st.mode === 'OFF') {
    return { desiredOn: false, source: 'MANUAL', reason: 'Pump disabled manually', endReason: 'MANUAL' };
  }

  if (st.mode === 'ON') {
    if (running && runSec >= MANUAL_PUMP_HARD_CAP_SEC) {
      return { desiredOn: false, source: 'SAFETY', reason: 'Manual run hit safety cap', endReason: 'MAX_RUNTIME' };
    }
    return { desiredOn: true, source: 'MANUAL', reason: 'Manual watering' };
  }

  // AUTO
  if (running) {
    if (x.soil === null) {
      return { desiredOn: false, source: 'SAFETY', reason: 'Soil sensor unavailable - pump stopped', endReason: 'SENSOR_FAULT' };
    }
    if (x.soil >= s.soilWetTarget) {
      return { desiredOn: false, source: 'AUTO', reason: `Soil reached target (${r1(x.soil)}% >= ${s.soilWetTarget}%)`, endReason: 'TARGET_REACHED' };
    }
    if (runSec >= s.pumpMaxRunSec) {
      return { desiredOn: false, source: 'SAFETY', reason: `Max run time ${s.pumpMaxRunSec}s reached (soil ${r1(x.soil)}%)`, endReason: 'MAX_RUNTIME' };
    }
    return { desiredOn: true, source: 'AUTO', reason: `Watering (soil ${r1(x.soil)}% < ${s.soilWetTarget}%)` };
  }

  if (x.soil === null) {
    return { desiredOn: false, source: 'AUTO', reason: 'Soil sensor unavailable' };
  }
  if (st.lastOffAt && secondsBetween(now, st.lastOffAt) < s.pumpMinIntervalMin * 60) {
    return { desiredOn: false, source: 'AUTO', reason: 'Soaking - waiting before next run' };
  }
  if (x.soil < s.soilDryThreshold) {
    return { desiredOn: true, source: 'AUTO', reason: `Soil moisture ${r1(x.soil)}% below ${s.soilDryThreshold}%` };
  }
  return { desiredOn: false, source: 'AUTO', reason: 'Soil moisture OK' };
}

/** "HH:MM" of `now` in an IANA timezone. */
export function localMinutes(now: Date, timezone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  }
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Supports windows that wrap past midnight (e.g. 18:00 -> 06:00). start == end means "always". */
export function inWindow(now: Date, start: string, end: string, timezone: string): boolean {
  const cur = localMinutes(now, timezone);
  const a = toMinutes(start);
  const b = toMinutes(end);
  if (a === b) return true;
  return a < b ? cur >= a && cur < b : cur >= a || cur < b;
}

/**
 * GROW LIGHT
 *  - on when lux < threshold, off when lux >= threshold * (1 + hysteresis%)
 *  - optional daily schedule window (forces OFF outside it)
 *  - minimum time between switches so the light's own glow cannot make it flicker
 */
export function decideGrowLight(s: EngineSettings, st: EngineState, x: Sample, now: Date): Decision {
  if (st.mode === 'OFF') return { desiredOn: false, source: 'MANUAL', reason: 'Grow light disabled manually', endReason: 'MANUAL' };
  if (st.mode === 'ON') return { desiredOn: true, source: 'MANUAL', reason: 'Grow light switched on manually' };

  if (s.growLightScheduleEnabled && !inWindow(now, s.growLightStart, s.growLightEnd, s.timezone)) {
    return { desiredOn: false, source: 'AUTO', reason: `Outside schedule ${s.growLightStart}-${s.growLightEnd}`, endReason: 'SCHEDULE' };
  }

  const keep = (reason: string): Decision =>
    st.desiredOn ? { desiredOn: true, source: 'AUTO', reason } : { desiredOn: false, source: 'AUTO', reason };

  if (x.lux === null) return keep('Light sensor unavailable - keeping current state');

  if (st.lastChangedAt && secondsBetween(now, st.lastChangedAt) < s.growLightMinSwitchSec) {
    return keep('Holding state (minimum switch interval)');
  }

  const offAt = s.lightOnThreshold * (1 + s.lightHysteresisPct / 100);
  if (!st.desiredOn) {
    return x.lux < s.lightOnThreshold
      ? { desiredOn: true, source: 'AUTO', reason: `Light ${Math.round(x.lux)} lux below ${s.lightOnThreshold} lux` }
      : { desiredOn: false, source: 'AUTO', reason: 'Enough natural light' };
  }
  return x.lux >= offAt
    ? { desiredOn: false, source: 'AUTO', reason: `Light ${Math.round(x.lux)} lux above ${Math.round(offAt)} lux`, endReason: 'THRESHOLD' }
    : { desiredOn: true, source: 'AUTO', reason: `Light ${Math.round(x.lux)} lux still low` };
}

export type AlarmAction = 'OPEN' | 'CLOSE' | 'KEEP';

/**
 * Over-temperature alarm with hysteresis.
 * `current` is the state of the HIGH_TEMPERATURE alert in the database.
 */
export function decideTempAlarm(
  s: EngineSettings,
  temperature: number | null,
  current: 'NONE' | 'ACTIVE' | 'ACKNOWLEDGED',
): AlarmAction {
  if (temperature === null) return 'KEEP';
  if (current === 'NONE') return temperature > s.tempAlarmThreshold ? 'OPEN' : 'KEEP';
  return temperature <= s.tempAlarmThreshold - s.tempAlarmHysteresis ? 'CLOSE' : 'KEEP';
}

export type ThresholdAlertKey = 'SOIL_DRY' | 'HUMIDITY_OUT_OF_RANGE' | 'LOW_TEMPERATURE';

export interface ThresholdAlertAction {
  key: ThresholdAlertKey;
  action: 'OPEN' | 'CLOSE';
  title: string;
  message: string;
  value: number;
  threshold: number;
}

/**
 * Threshold alerts for the monitored values (the over-temperature alarm is handled separately because it drives the buzzer).
 * Each alert opens when the value crosses its limit and only closes once the value is back inside by a margin,
 * so sensor noise around a limit does not open/close the same alert every reading.
 * `open` = keys whose alert is currently open. A missing value (sensor fault) never opens or closes anything.
 */
export function decideThresholdAlerts(s: EngineSettings, x: Sample, open: ReadonlySet<ThresholdAlertKey>): ThresholdAlertAction[] {
  const out: ThresholdAlertAction[] = [];

  if (x.soil !== null) {
    const margin = Math.min(3, Math.max(0.5, (s.soilWetTarget - s.soilDryThreshold) / 4));
    if (!open.has('SOIL_DRY') && x.soil < s.soilDryThreshold) {
      out.push({
        key: 'SOIL_DRY', action: 'OPEN', title: `Soil dry: ${r1(x.soil)}%`,
        message: `Soil moisture fell below the ${s.soilDryThreshold}% watering threshold`,
        value: x.soil, threshold: s.soilDryThreshold,
      });
    } else if (open.has('SOIL_DRY') && x.soil >= s.soilDryThreshold + margin) {
      out.push({
        key: 'SOIL_DRY', action: 'CLOSE', title: 'Soil moisture recovered',
        message: `soil back to ${r1(x.soil)}%`, value: x.soil, threshold: s.soilDryThreshold,
      });
    }
  }

  if (x.humidity !== null) {
    const margin = Math.min(2, Math.max(0, (s.humidityMax - s.humidityMin) / 4));
    const low = x.humidity < s.humidityMin;
    const high = x.humidity > s.humidityMax;
    if (!open.has('HUMIDITY_OUT_OF_RANGE') && (low || high)) {
      out.push({
        key: 'HUMIDITY_OUT_OF_RANGE', action: 'OPEN',
        title: low ? `Air too dry: ${r1(x.humidity)}%` : `Air too humid: ${r1(x.humidity)}%`,
        message: `Relative humidity is ${low ? 'below' : 'above'} the healthy range of ${s.humidityMin}-${s.humidityMax}%`,
        value: x.humidity, threshold: low ? s.humidityMin : s.humidityMax,
      });
    } else if (
      open.has('HUMIDITY_OUT_OF_RANGE') &&
      x.humidity >= s.humidityMin + margin &&
      x.humidity <= s.humidityMax - margin
    ) {
      out.push({
        key: 'HUMIDITY_OUT_OF_RANGE', action: 'CLOSE', title: 'Humidity back in range',
        message: `humidity back to ${r1(x.humidity)}%`, value: x.humidity, threshold: s.humidityMin,
      });
    }
  }

  if (x.temperature !== null) {
    const margin = Math.max(0.5, s.tempAlarmHysteresis);
    if (!open.has('LOW_TEMPERATURE') && x.temperature < s.tempLowThreshold) {
      out.push({
        key: 'LOW_TEMPERATURE', action: 'OPEN', title: `Low temperature: ${r1(x.temperature)} °C`,
        message: `Air temperature fell below ${s.tempLowThreshold} °C`,
        value: x.temperature, threshold: s.tempLowThreshold,
      });
    } else if (open.has('LOW_TEMPERATURE') && x.temperature >= s.tempLowThreshold + margin) {
      out.push({
        key: 'LOW_TEMPERATURE', action: 'CLOSE', title: 'Temperature recovered',
        message: `back to ${r1(x.temperature)} °C`, value: x.temperature, threshold: s.tempLowThreshold,
      });
    }
  }

  return out;
}

/** BUZZER: sounds while an un-acknowledged over-temperature alert is open (AUTO), or per manual override. */
export function decideBuzzer(
  st: EngineState,
  alert: 'NONE' | 'ACTIVE' | 'ACKNOWLEDGED',
): Decision {
  if (st.mode === 'OFF') return { desiredOn: false, source: 'MANUAL', reason: 'Buzzer muted manually', endReason: 'MANUAL' };
  if (st.mode === 'ON') return { desiredOn: true, source: 'MANUAL', reason: 'Buzzer test' };
  if (alert === 'ACTIVE') return { desiredOn: true, source: 'AUTO', reason: 'Over-temperature alarm' };
  if (alert === 'ACKNOWLEDGED') return { desiredOn: false, source: 'AUTO', reason: 'Alarm acknowledged', endReason: 'ACKNOWLEDGED' };
  return { desiredOn: false, source: 'AUTO', reason: 'No alarm', endReason: 'CLEARED' };
}
