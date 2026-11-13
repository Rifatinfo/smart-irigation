import { ActuatorType, Device, DeviceSettings } from '@prisma/client';
import prisma from '../../../shared/prisma';
import { decideThresholdAlerts, ThresholdAlertKey } from '../../../engine/automation';
import { round, soilRawToPercent } from '../../../engine/math';
import { Sample } from '../../../engine/types';
import { logActivity, openAlert, resolveAlert } from '../../../services/activity';
import { runAutomation } from '../../../services/automation.service';
import { getSettings, hardwareOf } from '../../../services/deviceStore';
import { realtime } from '../../../services/realtime';
import { getActuatorSnapshot, serializeDevice } from '../../../services/views';
import { buildSensorStatuses } from '../dashboard/dashboard.service';
import type { ReadingPayload } from './device.validation';

const RANGE = {
  soil: [0, 100],
  temperature: [-40, 85],
  humidity: [0, 100],
  lux: [0, 120_000],
} as const;

const inRange = (v: number | null | undefined, [lo, hi]: readonly [number, number]) =>
  v === null || v === undefined || !Number.isFinite(v) || v < lo || v > hi ? null : v;

// consecutive "no valid value" counters, per device & sensor (resets on restart - that is fine)
const missing = new Map<string, Record<string, number>>();
const FAULT_AFTER = 3;

const SENSOR_NAMES: Record<string, string> = {
  soil: 'Soil moisture sensor',
  temperature: 'Temperature sensor (DHT22)',
  humidity: 'Humidity sensor (DHT22)',
  light: 'Light sensor',
};

async function trackSensorHealth(deviceId: string, sample: Record<string, number | null>) {
  const counters = missing.get(deviceId) ?? {};
  for (const [sensor, value] of Object.entries(sample)) {
    if (value === null) {
      counters[sensor] = (counters[sensor] ?? 0) + 1;
      if (counters[sensor] === FAULT_AFTER) {
        await openAlert({
          deviceId,
          type: 'SENSOR_FAULT',
          dedupeKey: `SENSOR_FAULT:${sensor}`,
          severity: 'WARNING',
          title: `${SENSOR_NAMES[sensor]} not responding`,
          message: `No valid ${sensor} reading for ${FAULT_AFTER} consecutive reports. Check wiring and power.`,
        });
      }
    } else {
      if ((counters[sensor] ?? 0) >= FAULT_AFTER) {
        await resolveAlert(deviceId, `SENSOR_FAULT:${sensor}`, 'readings are valid again');
      }
      counters[sensor] = 0;
    }
  }
  missing.set(deviceId, counters);
}

const THRESHOLD_ALERT_KEYS: ThresholdAlertKey[] = ['SOIL_DRY', 'HUMIDITY_OUT_OF_RANGE', 'LOW_TEMPERATURE'];

/** Opens / resolves the dry-soil, humidity and low-temperature alerts for a new reading. */
async function evaluateThresholdAlerts(deviceId: string, sample: Sample, settings: DeviceSettings) {
  const openRows = await prisma.alert.findMany({
    where: { deviceId, dedupeKey: { in: THRESHOLD_ALERT_KEYS }, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    select: { dedupeKey: true },
  });
  const open = new Set(openRows.map((a) => a.dedupeKey as ThresholdAlertKey));
  for (const a of decideThresholdAlerts(settings, sample, open)) {
    if (a.action === 'OPEN') {
      await openAlert({
        deviceId,
        type: a.key,
        severity: 'WARNING',
        title: a.title,
        message: a.message,
        value: a.value,
        threshold: a.threshold,
      });
    } else {
      await resolveAlert(deviceId, a.key, a.message);
    }
  }
}

export const deviceConfigFor =(device: Device, s: DeviceSettings) => ({
  config_version: device.configVersion,
  config: {
    reading_interval_sec: s.readingIntervalSec,
    soil_dry_threshold: s.soilDryThreshold,
    soil_wet_target: s.soilWetTarget,
    pump_max_run_sec: s.pumpMaxRunSec,
    pump_min_interval_min: s.pumpMinIntervalMin,
    temp_alarm_threshold: s.tempAlarmThreshold,
    light_on_threshold: s.lightOnThreshold,
    light_hysteresis_pct: s.lightHysteresisPct,
    soil_raw_dry: s.soilRawDry,
    soil_raw_wet: s.soilRawWet,
  },
});

export async function ingestReading(device: Device, p: ReadingPayload, ip: string | undefined) {
  const now = new Date();
  const settings = await getSettings(device.id);

  // ── normalise + plausibility check ─────────────────────────
  let soil = inRange(p.soil_moisture, RANGE.soil);
  if (soil === null && p.soil_raw !== null && p.soil_raw !== undefined) {
    soil = soilRawToPercent(p.soil_raw, settings.soilRawDry, settings.soilRawWet);
  }
  const sample: Sample = {
    soil: soil === null ? null : round(soil, 1),
    temperature: inRange(p.temperature, RANGE.temperature) === null ? null : round(p.temperature as number, 1),
    humidity: inRange(p.humidity, RANGE.humidity) === null ? null : round(p.humidity as number, 1),
    lux: inRange(p.light_lux, RANGE.lux) === null ? null : round(p.light_lux as number, 0),
  };

  // ── device bookkeeping (online flag, firmware, ip, labels) ─
  const wasOnline = device.isOnline;
  const firstEver = device.lastSeenAt === null;
  const hw = p.hw ? { ...(hardwareOf(device) as object), ...p.hw } : undefined;
  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      isOnline: true,
      lastSeenAt: now,
      ipAddress: ip ?? device.ipAddress,
      rssi: p.rssi ?? device.rssi,
      firmwareVersion: p.firmware ?? device.firmwareVersion,
      ...(hw ? { hardwareInfo: hw } : {}),
    },
  });
  if (!wasOnline) {
    await resolveAlert(device.id, 'DEVICE_OFFLINE', 'device is reporting again');
    await logActivity({
      deviceId: device.id,
      source: 'DEVICE',
      message: firstEver ? 'Device connected for the first time' : 'Device back online',
      meta: { ip: ip ?? null, firmware: updated.firmwareVersion },
    });
    realtime.publish('device', serializeDevice(updated), device.id);
  }

  // ── store the reading ──────────────────────────────────────
  const reading = await prisma.sensorReading.create({
    data: {
      deviceId: device.id,
      soilMoisture: sample.soil,
      soilRaw: p.soil_raw === null || p.soil_raw === undefined ? null : Math.round(p.soil_raw),
      temperature: sample.temperature,
      humidity: sample.humidity,
      lightLux: sample.lux,
      pumpOn: p.pump ?? null,
      growLightOn: p.grow_light ?? null,
      buzzerOn: p.buzzer ?? null,
      rssi: p.rssi ?? null,
      createdAt: now,
    },
  });

  await trackSensorHealth(device.id, {
    soil: sample.soil,
    temperature: sample.temperature,
    humidity: sample.humidity,
    light: sample.lux,
  });

  await evaluateThresholdAlerts(device.id, sample, settings);

  // ── automation ─────────────────────────────────────────────
  const reported: Partial<Record<ActuatorType, boolean | null>> = {};
  if (p.pump !== undefined) reported.PUMP = p.pump;
  if (p.grow_light !== undefined) reported.GROW_LIGHT = p.grow_light;
  if (p.buzzer !== undefined) reported.BUZZER = p.buzzer;
  const commands = await runAutomation(device.id, { sample, reported, now });

  // ── push to dashboards ─────────────────────────────────────
  if (realtime.clientCount() > 0) {
    realtime.publish(
      'reading',
      {
        at: reading.createdAt,
        deviceId: device.id,
        values: {
          soilMoisture: sample.soil,
          temperature: sample.temperature,
          humidity: sample.humidity,
          light: sample.lux,
        },
        statuses: buildSensorStatuses(sample, settings),
        actuators: await getActuatorSnapshot(device.id),
        device: serializeDevice(updated),
      },
      device.id,
    );
  }

  const fresh = await prisma.device.findUniqueOrThrow({ where: { id: device.id }, select: { configVersion: true } });
  return {
    ok: true,
    server_time: now.toISOString(),
    commands: { pump: commands.pump, grow_light: commands.growLight, buzzer: commands.buzzer },
    pump_run_sec: commands.pumpRunSec,
    ...deviceConfigFor({ ...updated, configVersion: fresh.configVersion }, settings),
  };
}
