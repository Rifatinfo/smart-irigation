import { Device, Prisma } from '@prisma/client';
import prisma from '../../../shared/prisma';
import AppError from '../../middlewares/AppError';
import { round } from '../../../engine/math';
import { getSettings } from '../../../services/deviceStore';
import { bucketedSeries } from '../dashboard/dashboard.service';

export type RangeKey = '24h' | '7d' | '30d' | 'custom';

const PRESETS: Record<Exclude<RangeKey, 'custom'>, { ms: number; bucketSec: number; exportBucketSec: number }> = {
  '24h': { ms: 24 * 3_600_000, bucketSec: 900, exportBucketSec: 60 },
  '7d': { ms: 7 * 24 * 3_600_000, bucketSec: 3600, exportBucketSec: 600 },
  '30d': { ms: 30 * 24 * 3_600_000, bucketSec: 21_600, exportBucketSec: 3600 },
};

export function resolveRange(range: RangeKey, fromIso?: string, toIso?: string, forExport = false) {
  const to = toIso ? new Date(toIso) : new Date();
  if (range !== 'custom') {
    const p = PRESETS[range];
    return { from: new Date(to.getTime() - p.ms), to, bucketSec: forExport ? p.exportBucketSec : p.bucketSec };
  }
  if (!fromIso) throw new AppError(400, 'range=custom needs ?from=');
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new AppError(400, 'Invalid from/to');
  const spanSec = (to.getTime() - from.getTime()) / 1000;
  if (spanSec > 366 * 86400) throw new AppError(400, 'Range too large (max 366 days)');
  const target = forExport ? 2000 : 120;
  const nice = [60, 300, 600, 900, 1800, 3600, 7200, 21600, 43200, 86400];
  const bucketSec = nice.find((b) => spanSec / b <= target) ?? 86400;
  return { from, to, bucketSec };
}

type Num = number | null;
const nn = (v: unknown): Num => (v === null || v === undefined ? null : Number(v));
const rr = (v: Num, dp: number): Num => (v === null ? null : round(v, dp));

export async function getHistory(device: Device, range: RangeKey, fromIso?: string, toIso?: string) {
  const { from, to, bucketSec } = resolveRange(range, fromIso, toIso);
  const s = await getSettings(device.id);

  const [{ series }, [a], latest, events] = await Promise.all([
    bucketedSeries(device.id, from, to, bucketSec),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        count(soil_moisture)::int AS soil_n, min(soil_moisture) AS soil_min, avg(soil_moisture) AS soil_avg, max(soil_moisture) AS soil_max,
        count(*) FILTER (WHERE soil_moisture <= ${s.soilDryThreshold})::int AS soil_low,
        count(*) FILTER (WHERE soil_moisture > ${s.soilWetTarget})::int AS soil_high,
        count(temperature)::int AS temp_n, min(temperature) AS temp_min, avg(temperature) AS temp_avg, max(temperature) AS temp_max,
        count(*) FILTER (WHERE temperature > ${s.tempAlarmThreshold})::int AS temp_high,
        count(*) FILTER (WHERE temperature < ${s.tempLowThreshold})::int AS temp_low,
        count(humidity)::int AS hum_n, min(humidity) AS hum_min, avg(humidity) AS hum_avg, max(humidity) AS hum_max,
        count(*) FILTER (WHERE humidity < ${s.humidityMin} OR humidity > ${s.humidityMax})::int AS hum_out,
        count(light_lux)::int AS lux_n, min(light_lux) AS lux_min, avg(light_lux) AS lux_avg, max(light_lux) AS lux_max,
        count(*) FILTER (WHERE light_lux < ${s.lightOnThreshold})::int AS lux_low,
        count(*)::int AS samples
      FROM sensor_readings
      WHERE device_id = ${device.id} AND created_at >= ${from}::timestamptz AND created_at <= ${to}::timestamptz`),
    prisma.sensorReading.findFirst({ where: { deviceId: device.id }, orderBy: { createdAt: 'desc' } }),
    prisma.actuatorEvent.findMany({
      where: { deviceId: device.id, startedAt: { lte: to }, OR: [{ endedAt: null }, { endedAt: { gte: from } }] },
      orderBy: { startedAt: 'asc' },
      take: 5000,
    }),
  ]);

  const pct = (k: unknown, total: unknown) => {
    const t = Number(total);
    return t > 0 ? round((Number(k) / t) * 100, 0) : 0;
  };
  const stat = (
    key: string, now: Num, dp: number, outsideCount: number, total: unknown, label: string,
  ) => ({
    now: rr(now, dp),
    min: rr(nn(a[`${key}_min`]), dp),
    average: rr(nn(a[`${key}_avg`]), dp),
    max: rr(nn(a[`${key}_max`]), dp),
    samples: Number(total),
    outsidePct: pct(outsideCount, total),
    outsideLabel: outsideCount > 0 ? label : 'on target',
  });

  const soilLow = Number(a.soil_low), soilHigh = Number(a.soil_high);
  const soilLabel =
    soilLow > 0 && soilHigh > 0 ? `outside ${s.soilDryThreshold}-${s.soilWetTarget}%`
    : soilHigh > 0 ? `above ${s.soilWetTarget}%`
    : `near ${s.soilDryThreshold}%`;
  const tHigh = Number(a.temp_high), tLow = Number(a.temp_low);
  const tempLabel =
    tHigh > 0 && tLow > 0 ? `outside ${s.tempLowThreshold}-${s.tempAlarmThreshold} °C`
    : tLow > 0 ? `below ${s.tempLowThreshold} °C`
    : `above ${s.tempAlarmThreshold} °C`;

  return {
    range: { key: range, from, to, bucketSec },
    thresholds: {
      soilDry: s.soilDryThreshold,
      soilWetTarget: s.soilWetTarget,
      tempAlarm: s.tempAlarmThreshold,
      humidityMin: s.humidityMin,
      humidityMax: s.humidityMax,
      lightOn: s.lightOnThreshold,
    },
    stats: {
      soilMoisture: stat('soil', latest?.soilMoisture ?? null, 1, soilLow + soilHigh, a.soil_n, soilLabel),
      temperature: stat('temp', latest?.temperature ?? null, 1, tHigh + tLow, a.temp_n, tempLabel),
      humidity: stat('hum', latest?.humidity ?? null, 1, Number(a.hum_out), a.hum_n, 'outside band'),
      light: stat('lux', latest?.lightLux ?? null, 0, Number(a.lux_low), a.lux_n, 'grow light needed'),
    },
    series,
    events: events.map((e) => ({
      id: e.id,
      actuator: e.actuator,
      source: e.source,
      reason: e.reason,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
      durationSec: e.durationSec,
      soilBefore: e.soilBefore,
      soilAfter: e.soilAfter,
      endReason: e.endReason,
    })),
    totals: {
      samples: Number(a.samples),
      pumpRuns: events.filter((e) => e.actuator === 'PUMP').length,
      pumpSeconds: events.filter((e) => e.actuator === 'PUMP').reduce((t, e) => t + (e.durationSec ?? 0), 0),
      growLightSeconds: events.filter((e) => e.actuator === 'GROW_LIGHT').reduce((t, e) => t + (e.durationSec ?? 0), 0),
      buzzerAlarms: events.filter((e) => e.actuator === 'BUZZER' && e.source === 'AUTO').length,
    },
  };
}

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function buildCsv(device: Device, range: RangeKey, fromIso?: string, toIso?: string) {
  const { from, to, bucketSec } = resolveRange(range, fromIso, toIso, true);
  const { rows } = await bucketedSeries(device.id, from, to, bucketSec);
  const header = ['timestamp_utc', 'soil_moisture_pct', 'temperature_c', 'humidity_pct', 'light_lux', 'pump_on', 'grow_light_on', 'buzzer_on'];
  const lines = [header.join(',')];
  const f = (v: Num, dp: number) => (v === null ? '' : round(Number(v), dp));
  for (const x of rows) {
    lines.push(
      [
        x.bucket.toISOString(), f(x.soil, 1), f(x.temp, 1), f(x.hum, 1), f(x.lux, 0),
        x.pump === null ? '' : x.pump ? 1 : 0,
        x.grow === null ? '' : x.grow ? 1 : 0,
        x.buzz === null ? '' : x.buzz ? 1 : 0,
      ].map(csvCell).join(','),
    );
  }
  const stamp = (d: Date) => d.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return { csv: lines.join('\n') + '\n', filename: `${device.name.replace(/[^\w-]+/g, '_')}_${stamp(from)}_to_${stamp(to)}.csv` };
}
