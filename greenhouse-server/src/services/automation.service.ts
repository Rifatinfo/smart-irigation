import { ActuatorType, DeviceSettings, LogLevel } from '@prisma/client';
import prisma from '../shared/prisma';
import {
  decideBuzzer,
  decideGrowLight,
  decidePump,
  decideTempAlarm,
} from '../engine/automation';
import { round } from '../engine/math';
import { Decision, EngineState, MANUAL_PUMP_HARD_CAP_SEC, Sample } from '../engine/types';
import { getOpenAlertState, logActivity, openAlert, resolveAlert } from './activity';
import { ACTUATORS, getSettings } from './deviceStore';
import { realtime } from './realtime';
import { getActuatorSnapshot } from './views';

const LABEL: Record<ActuatorType, string> = { PUMP: 'Pump', GROW_LIGHT: 'Grow light', BUZZER: 'Buzzer' };

// ── per-device mutex: readings, control calls and settings changes never interleave ──
const locks = new Map<string, Promise<unknown>>();
export function withDeviceLock<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(deviceId) ?? Promise.resolve();
  const result = prev.then(fn, fn) as Promise<T>;
  locks.set(deviceId, result.catch(() => undefined));
  return result;
}

export interface Commands {
  pump: boolean;
  growLight: boolean;
  buzzer: boolean;
  /** Longest the hardware may keep the pump running without hearing from the server again. */
  pumpRunSec: number;
}

export interface AutomationInput {
  sample?: Sample;
  reported?: Partial<Record<ActuatorType, boolean | null>>;
  now?: Date;
}

export async function latestSample(deviceId: string): Promise<Sample> {
  const r = await prisma.sensorReading.findFirst({ where: { deviceId }, orderBy: { createdAt: 'desc' } });
  return {
    soil: r?.soilMoisture ?? null,
    temperature: r?.temperature ?? null,
    humidity: r?.humidity ?? null,
    lux: r?.lightLux ?? null,
  };
}

/**
 * Runs the whole automation cycle for one device:
 *  1. expire manual overrides   2. temperature alarm open/close
 *  3. decide pump / grow light / buzzer   4. persist transitions, runs and activity logs
 * Returns the commands the hardware must apply.
 */
export function runAutomation(deviceId: string, input: AutomationInput = {}): Promise<Commands> {
  return withDeviceLock(deviceId, async () => {
    const now = input.now ?? new Date();
    const settings = await getSettings(deviceId);
    const rows = await prisma.actuatorState.findMany({ where: { deviceId } });
    const sample = input.sample ?? (await latestSample(deviceId));

    // ── 1. temperature alarm ─────────────────────────────────────
    let alertState = await getOpenAlertState(deviceId, 'HIGH_TEMPERATURE');
    const alarm = decideTempAlarm(settings, sample.temperature, alertState);
    if (alarm === 'OPEN' && sample.temperature !== null) {
      await openAlert({
        deviceId,
        type: 'HIGH_TEMPERATURE',
        severity: 'CRITICAL',
        title: 'High temperature',
        message: `Air temperature ${round(sample.temperature)} °C is above the ${settings.tempAlarmThreshold} °C limit`,
        value: sample.temperature,
        threshold: settings.tempAlarmThreshold,
      });
      alertState = 'ACTIVE';
    } else if (alarm === 'CLOSE' && sample.temperature !== null) {
      await resolveAlert(deviceId, 'HIGH_TEMPERATURE', `back to ${round(sample.temperature)} °C`);
      alertState = 'NONE';
    }

    // ── 2. per-actuator decisions ───────────────────────────────
    let anyChange = false;
    const out: Record<string, { on: boolean; since: Date | null }> = {};
    let pumpRunSec = 0;

    for (const type of ACTUATORS) {
      const row = rows.find((r) => r.actuator === type);
      if (!row) continue;

      // manual override expiry -> back to AUTO, starting from "off"
      let mode = row.mode;
      let manualUntil = row.manualUntil;
      const work: EngineState = {
        mode,
        desiredOn: row.desiredOn,
        manualUntil,
        lastChangedAt: row.lastChangedAt,
        lastOnAt: row.lastOnAt,
        lastOffAt: row.lastOffAt,
      };
      let expired = false;
      if (mode !== 'AUTO' && manualUntil && manualUntil <= now) {
        expired = true;
        mode = 'AUTO';
        manualUntil = null;
        work.mode = 'AUTO';
        work.manualUntil = null;
        work.desiredOn = false;
        if (type === 'PUMP') work.lastOffAt = now; // start the soak timer
        await logActivity({
          deviceId,
          source: type,
          message: `${LABEL[type]} manual override ended - back to AUTO`,
        });
      }

      const d: Decision =
        type === 'PUMP'
          ? decidePump(settings, work, sample, now)
          : type === 'GROW_LIGHT'
            ? decideGrowLight(settings, work, sample, now)
            : decideBuzzer(work, alertState);

      const changed = d.desiredOn !== row.desiredOn;
      const reported = input.reported?.[type];
      const reportedChanged = reported !== undefined && reported !== row.reportedOn;
      const reasonChanged = d.reason !== row.reason;

      let lastOnAt = row.lastOnAt;
      if (changed || expired || reportedChanged || reasonChanged) {
        const data: Record<string, unknown> = {
          mode,
          manualUntil,
          desiredOn: d.desiredOn,
          reason: d.reason,
        };
        if (reported !== undefined) data.reportedOn = reported;
        if (changed) {
          data.lastChangedAt = now;
          if (d.desiredOn) {
            data.lastOnAt = now;
            lastOnAt = now;
          } else data.lastOffAt = now;
        }
        await prisma.actuatorState.update({ where: { id: row.id }, data });
      }
      if (changed) {
        anyChange = true;
        await onTransition(deviceId, type, d, row.lastOnAt, sample, now, settings);
      }

      out[type] = { on: d.desiredOn, since: d.desiredOn ? lastOnAt : null };

      if (type === 'PUMP' && d.desiredOn) {
        const elapsed = lastOnAt ? (now.getTime() - lastOnAt.getTime()) / 1000 : 0;
        let limit = mode === 'ON' ? MANUAL_PUMP_HARD_CAP_SEC : settings.pumpMaxRunSec;
        if (mode === 'ON' && manualUntil) limit = Math.min(limit, (manualUntil.getTime() - lastOnAt!.getTime()) / 1000);
        pumpRunSec = Math.max(1, Math.round(limit - elapsed));
      }
    }

    if (anyChange) realtime.publish('actuators', await getActuatorSnapshot(deviceId), deviceId);

    return {
      pump: out.PUMP?.on ?? false,
      growLight: out.GROW_LIGHT?.on ?? false,
      buzzer: out.BUZZER?.on ?? false,
      pumpRunSec,
    };
  });
}

async function onTransition(
  deviceId: string,
  type: ActuatorType,
  d: Decision,
  previousOnAt: Date | null,
  sample: Sample,
  now: Date,
  settings: DeviceSettings,
) {
  const label = LABEL[type];
  if (d.desiredOn) {
    await prisma.actuatorEvent.create({
      data: {
        deviceId,
        actuator: type,
        source: d.source,
        reason: d.reason,
        startedAt: now,
        soilBefore: sample.soil,
      },
    });
    await logActivity({
      deviceId,
      level: type === 'BUZZER' && d.source === 'AUTO' ? 'CRITICAL' : 'INFO',
      source: type,
      message: `${label} ON (${d.source.toLowerCase()}): ${d.reason}`,
      meta: { soil: sample.soil, temperature: sample.temperature, lux: sample.lux },
    });
    return;
  }

  // turned OFF → close the open run
  const open = await prisma.actuatorEvent.findFirst({
    where: { deviceId, actuator: type, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  const started = open?.startedAt ?? previousOnAt;
  const durationSec = started ? Math.max(0, Math.round((now.getTime() - started.getTime()) / 1000)) : null;
  if (open) {
    await prisma.actuatorEvent.update({
      where: { id: open.id },
      data: { endedAt: now, durationSec, soilAfter: sample.soil, endReason: d.endReason ?? 'MANUAL' },
    });
  }
  // A capped pulse (MAX_RUNTIME) is routine for small pumps; only a vanished sensor is worth a WARNING.
  const level: LogLevel = d.endReason === 'SENSOR_FAULT' ? 'WARNING' : 'INFO';
  await logActivity({
    deviceId,
    level,
    source: type,
    message: `${label} OFF: ${d.reason}${durationSec !== null ? ` (ran ${durationSec}s)` : ''}`,
    meta: { endReason: d.endReason ?? null, durationSec },
  });

  if (type === 'PUMP') await checkPumpEffectiveness(deviceId, settings, d.endReason);
}

/**
 * Fault heuristic: three consecutive runs that all hit the max run time, and the soil moisture at the
 * start of the latest run is not at least 2 points above the first of the three, means water is not
 * reaching the soil (empty reservoir, kinked hose, dead pump, sensor not in the soil...).
 * A single healthy "pulse" cycle (30 s runs while the soil slowly soaks) does NOT trigger it.
 */
async function checkPumpEffectiveness(deviceId: string, settings: DeviceSettings, endReason?: string) {
  if (endReason === 'TARGET_REACHED') {
    await resolveAlert(deviceId, 'PUMP_INEFFECTIVE', 'soil reached the target');
    return;
  }
  if (endReason !== 'MAX_RUNTIME') return;

  const last = await prisma.actuatorEvent.findMany({
    where: { deviceId, actuator: 'PUMP', endedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
    take: 3,
  });
  if (last.length < 3) return;
  const allCapped = last.every((e) => e.endReason === 'MAX_RUNTIME');
  const latestStart = last[0].soilBefore;
  const oldestStart = last[2].soilBefore;
  if (!allCapped || latestStart === null || oldestStart === null) return;

  if (latestStart - oldestStart < 2) {
    await openAlert({
      deviceId,
      type: 'PUMP_INEFFECTIVE',
      severity: 'WARNING',
      title: 'Pump not raising soil moisture',
      message: `The pump ran 3 times (${settings.pumpMaxRunSec}s each) but soil moisture stayed at ~${round(latestStart)}%. Check the water reservoir, tubing and sensor placement.`,
      value: latestStart,
      threshold: settings.soilDryThreshold,
    });
  } else {
    await resolveAlert(deviceId, 'PUMP_INEFFECTIVE', 'soil moisture is rising');
  }
}
