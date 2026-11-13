import { DeviceSettings, Prisma } from '@prisma/client';
import prisma from '../../../shared/prisma';
import { etaToThresholdHours, round, slopePerHour } from '../../../engine/math';
import { humidityStatus, lightStatus, soilStatus, temperatureStatus } from '../../../engine/status';
import { Sample } from '../../../engine/types';
import { getSettings, hardwareOf } from '../../../services/deviceStore';
import { getActuatorSnapshot, serializeDevice } from '../../../services/views';
import { Device } from '@prisma/client';

export const buildSensorStatuses = (x: Sample, s: DeviceSettings) => ({
  soilMoisture: soilStatus(x.soil, s),
  temperature: temperatureStatus(x.temperature, s),
  humidity: humidityStatus(x.humidity, s),
  light: lightStatus(x.lux, s),
});

type Num = number | null;
const n = (v: unknown): Num => (v === null || v === undefined ? null : Number(v));
const r = (v: Num, dp = 1): Num => (v === null ? null : round(v, dp));

export interface SeriesPoint {
  t: string;
  v: Num;
  min: Num;
  max: Num;
}

/** Time-bucketed averages (+min/max) for every sensor. Bucket boundaries are aligned to the epoch. */
export async function bucketedSeries(deviceId: string, from: Date, to: Date, bucketSec: number) {
  const rows = await prisma.$queryRaw<
    Array<{
      bucket: Date;
      soil: Num; soil_min: Num; soil_max: Num;
      temp: Num; temp_min: Num; temp_max: Num;
      hum: Num; hum_min: Num; hum_max: Num;
      lux: Num; lux_min: Num; lux_max: Num;
      pump: boolean | null; grow: boolean | null; buzz: boolean | null;
    }>
  >(Prisma.sql`
    SELECT date_bin(make_interval(secs => ${bucketSec}::double precision), created_at, TIMESTAMPTZ 'epoch') AS bucket,
      avg(soil_moisture) AS soil, min(soil_moisture) AS soil_min, max(soil_moisture) AS soil_max,
      avg(temperature)   AS temp, min(temperature)   AS temp_min, max(temperature)   AS temp_max,
      avg(humidity)      AS hum,  min(humidity)      AS hum_min,  max(humidity)      AS hum_max,
      avg(light_lux)     AS lux,  min(light_lux)     AS lux_min,  max(light_lux)     AS lux_max,
      bool_or(pump_on) AS pump, bool_or(grow_light_on) AS grow, bool_or(buzzer_on) AS buzz
    FROM sensor_readings
    WHERE device_id = ${deviceId} AND created_at >= ${from}::timestamptz AND created_at <= ${to}::timestamptz
    GROUP BY 1
    ORDER BY 1`);

  const pt = (b: Date, v: Num, mn: Num, mx: Num, dp: number): SeriesPoint => ({
    t: b.toISOString(), v: r(n(v), dp), min: r(n(mn), dp), max: r(n(mx), dp),
  });
  return {
    rows,
    series: {
      soilMoisture: rows.map((x) => pt(x.bucket, x.soil, x.soil_min, x.soil_max, 1)),
      temperature: rows.map((x) => pt(x.bucket, x.temp, x.temp_min, x.temp_max, 1)),
      humidity: rows.map((x) => pt(x.bucket, x.hum, x.hum_min, x.hum_max, 1)),
      light: rows.map((x) => pt(x.bucket, x.lux, x.lux_min, x.lux_max, 0)),
    },
  };
}

/** high/low over the last 24h for each sensor. */
async function extremes24h(deviceId: string, since: Date) {
  const [row] = await prisma.$queryRaw<Array<Record<string, Num>>>(Prisma.sql`
    SELECT min(soil_moisture) soil_lo, max(soil_moisture) soil_hi,
           min(temperature) temp_lo, max(temperature) temp_hi,
           min(humidity) hum_lo, max(humidity) hum_hi,
           min(light_lux) lux_lo, max(light_lux) lux_hi
    FROM sensor_readings WHERE device_id = ${deviceId} AND created_at >= ${since}::timestamptz`);
  return row ?? {};
}

/** value one hour ago (nearest reading within ±10 min) -> signed change over the last hour */
async function hourAgo(deviceId: string, now: Date) {
  const target = now.getTime() - 3_600_000;
  const rows = await prisma.sensorReading.findMany({
    where: { deviceId, createdAt: { gte: new Date(target - 600_000), lte: new Date(target + 600_000) } },
    select: { createdAt: true, soilMoisture: true, temperature: true, humidity: true, lightLux: true },
  });
  if (!rows.length) return null;
  return rows.reduce((best, x) =>
    Math.abs(x.createdAt.getTime() - target) < Math.abs(best.createdAt.getTime() - target) ? x : best,
  );
}

async function nextWatering(deviceId: string, settings: DeviceSettings, current: Num, pumpRunning: boolean, now: Date) {
  if (current === null) return { etaSec: null, estimatedAt: null, state: 'unknown' as const };
  if (pumpRunning) return { etaSec: null, estimatedAt: null, state: 'watering' as const };
  if (current <= settings.soilDryThreshold) return { etaSec: 0, estimatedAt: now.toISOString(), state: 'due' as const };

  const since = new Date(now.getTime() - 6 * 3_600_000);
  const lastRun = await prisma.actuatorEvent.findFirst({
    where: { deviceId, actuator: 'PUMP', endedAt: { not: null } },
    orderBy: { endedAt: 'desc' },
  });
  // only use the drying trend after the soil has settled from the last watering (+10 min soak)
  const from = lastRun?.endedAt && lastRun.endedAt.getTime() + 600_000 > since.getTime()
    ? new Date(lastRun.endedAt.getTime() + 600_000)
    : since;
  const { rows } = await bucketedSeries(deviceId, from, now, 300);
  const pts = rows.filter((x) => x.soil !== null).map((x) => ({ t: x.bucket.getTime(), v: Number(x.soil) }));
  const hours = etaToThresholdHours(current, settings.soilDryThreshold, slopePerHour(pts));
  if (hours === null) return { etaSec: null, estimatedAt: null, state: 'steady' as const };
  const etaSec = Math.round(hours * 3600);
  return { etaSec, estimatedAt: new Date(now.getTime() + etaSec * 1000).toISOString(), state: 'trend' as const };
}

export async function getSummary(device: Device, opts: { withSeries?: boolean } = {}) {
  const withSeries = opts.withSeries !== false;
  const now = new Date();
  const since24 = new Date(now.getTime() - 24 * 3_600_000);
  const settings = await getSettings(device.id);
  const hw = hardwareOf(device);

  const [latest, ext, ago, actuators, alerts, logs, series] = await Promise.all([
    prisma.sensorReading.findFirst({ where: { deviceId: device.id }, orderBy: { createdAt: 'desc' } }),
    extremes24h(device.id, since24),
    hourAgo(device.id, now),
    getActuatorSnapshot(device.id),
    prisma.alert.findMany({
      where: { deviceId: device.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
      orderBy: { openedAt: 'desc' },
    }),
    prisma.activityLog.findMany({ where: { deviceId: device.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    withSeries ? bucketedSeries(device.id, since24, now, 900) : Promise.resolve(null),
  ]);

  const x: Sample = {
    soil: latest?.soilMoisture ?? null,
    temperature: latest?.temperature ?? null,
    humidity: latest?.humidity ?? null,
    lux: latest?.lightLux ?? null,
  };
  const st = buildSensorStatuses(x, settings);
  const delta = (cur: Num, prev: Num | undefined, dp: number): Num =>
    cur === null || prev === null || prev === undefined ? null : round(cur - prev, dp);

  const watering = await nextWatering(device.id, settings, x.soil, actuators.pump?.isOn ?? false, now);

  return {
    device: serializeDevice(device),
    updatedAt: latest?.createdAt ?? null,
    hasData: latest !== null,
    sensors: {
      soilMoisture: {
        label: 'Soil moisture', sensor: hw.soil, unit: '%',
        value: x.soil, status: st.soilMoisture,
        /** Latest raw ADC value from the probe - used for calibration in Settings */
        raw: latest?.soilRaw ?? null,
        high24h: r(n(ext.soil_hi)), low24h: r(n(ext.soil_lo)),
        lastHourDelta: delta(x.soil, ago?.soilMoisture, 1),
        pumpStartsBelow: settings.soilDryThreshold, pumpStopsAt: settings.soilWetTarget,
        nextWatering: watering,
        series: series?.series.soilMoisture ?? [],
      },
      temperature: {
        label: 'Temperature', sensor: hw.temperature, unit: '°C',
        value: x.temperature, status: st.temperature,
        high24h: r(n(ext.temp_hi)), low24h: r(n(ext.temp_lo)),
        lastHourDelta: delta(x.temperature, ago?.temperature, 1),
        buzzerSoundsAbove: settings.tempAlarmThreshold,
        series: series?.series.temperature ?? [],
      },
      humidity: {
        label: 'Air humidity', sensor: hw.humidity, unit: '%',
        value: x.humidity, status: st.humidity,
        high24h: r(n(ext.hum_hi)), low24h: r(n(ext.hum_lo)),
        lastHourDelta: delta(x.humidity, ago?.humidity, 1),
        healthyRange: { min: settings.humidityMin, max: settings.humidityMax },
        series: series?.series.humidity ?? [],
      },
      light: {
        label: 'Light level', sensor: hw.light, unit: 'lux',
        value: x.lux, status: st.light,
        high24h: r(n(ext.lux_hi), 0), low24h: r(n(ext.lux_lo), 0),
        lastHourDelta: delta(x.lux, ago?.lightLux, 0),
        growLightBelow: settings.lightOnThreshold,
        series: series?.series.light ?? [],
      },
    },
    actuators,
    alerts: { activeCount: alerts.filter((a) => a.status === 'ACTIVE').length, items: alerts },
    recentLogs: logs,
    serverTime: now.toISOString(),
  };
}
