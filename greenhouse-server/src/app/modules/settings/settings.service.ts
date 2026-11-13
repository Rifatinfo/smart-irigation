import { DeviceSettings, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../shared/prisma';
import AppError from '../../middlewares/AppError';
import { logActivity } from '../../../services/activity';
import { runAutomation } from '../../../services/automation.service';
import { getSettings } from '../../../services/deviceStore';
import { realtime } from '../../../services/realtime';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)');

const validTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const settingsPatchSchema = z
  .object({
    soilDryThreshold: z.number().min(0).max(100),
    soilWetTarget: z.number().min(0).max(100),
    pumpMaxRunSec: z.number().int().min(1).max(120),
    pumpMinIntervalMin: z.number().int().min(0).max(1440),
    soilRawDry: z.number().int().min(0).max(65535),
    soilRawWet: z.number().int().min(0).max(65535),
    pumpFlowLpm: z.number().min(0.01).max(100),
    tempAlarmThreshold: z.number().min(-20).max(80),
    tempAlarmHysteresis: z.number().min(0).max(20),
    tempLowThreshold: z.number().min(-40).max(60),
    humidityMin: z.number().min(0).max(100),
    humidityMax: z.number().min(0).max(100),
    lightOnThreshold: z.number().min(0).max(120000),
    lightHysteresisPct: z.number().min(0).max(300),
    growLightMinSwitchSec: z.number().int().min(0).max(3600),
    growLightScheduleEnabled: z.boolean(),
    growLightStart: hhmm,
    growLightEnd: hhmm,
    timezone: z.string().refine(validTimezone, 'Unknown IANA time zone, e.g. Asia/Dhaka'),
    readingIntervalSec: z.number().int().min(2).max(300),
    offlineAfterSec: z.number().int().min(10).max(3600),
    dataRetentionDays: z.number().int().min(1).max(3650),
  })
  .partial()
  .strict();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

const EDITABLE = Object.keys(settingsPatchSchema.shape) as Array<keyof SettingsPatch>;

function assertConsistent(s: DeviceSettings | (DeviceSettings & SettingsPatch)) {
  const problems: Array<{ path: string; message: string }> = [];
  if (s.soilDryThreshold >= s.soilWetTarget)
    problems.push({ path: 'soilDryThreshold', message: 'Pump start level must be below the target level' });
  if (s.soilRawDry === s.soilRawWet)
    problems.push({ path: 'soilRawDry', message: 'Dry and wet calibration values must differ' });
  if (s.tempLowThreshold >= s.tempAlarmThreshold)
    problems.push({ path: 'tempLowThreshold', message: 'Low-temperature level must be below the alarm temperature' });
  if (s.tempAlarmHysteresis >= s.tempAlarmThreshold - s.tempLowThreshold)
    problems.push({ path: 'tempAlarmHysteresis', message: 'Hysteresis is larger than the comfortable temperature range' });
  if (s.humidityMin >= s.humidityMax)
    problems.push({ path: 'humidityMin', message: 'Minimum humidity must be below maximum' });
  if (s.offlineAfterSec < s.readingIntervalSec * 2)
    problems.push({ path: 'offlineAfterSec', message: 'Must be at least twice the reading interval' });
  if (problems.length) throw new AppError(400, 'Invalid settings', problems);
}

export const serializeSettings = (s: DeviceSettings) => {
  const { id: _id, deviceId: _d, ...rest } = s;
  return rest;
};

export async function updateSettings(deviceId: string, patch: SettingsPatch, actor?: string) {
  const current = await getSettings(deviceId);
  const merged = { ...current, ...patch } as DeviceSettings;
  assertConsistent(merged);

  const changed = EDITABLE.filter((k) => patch[k] !== undefined && patch[k] !== current[k]);
  if (changed.length === 0) return { settings: current, changed: [] as string[] };

  const data = Object.fromEntries(changed.map((k) => [k, patch[k]])) as Prisma.DeviceSettingsUpdateInput;
  const [settings] = await prisma.$transaction([
    prisma.deviceSettings.update({ where: { deviceId }, data }),
    prisma.device.update({ where: { id: deviceId }, data: { configVersion: { increment: 1 } } }),
  ]);

  const diff = Object.fromEntries(changed.map((k) => [k, { from: current[k], to: patch[k] }]));
  await logActivity({
    deviceId,
    source: 'SETTINGS',
    message: `Settings updated${actor ? ` by ${actor}` : ''}: ${changed.map((k) => `${k} ${current[k]} → ${patch[k]}`).join(', ')}`,
    meta: diff as Prisma.InputJsonValue,
  });
  realtime.publish('settings', serializeSettings(settings), deviceId);
  await runAutomation(deviceId); // apply new thresholds immediately
  return { settings, changed: changed as string[] };
}

export async function resetSettings(deviceId: string, actor?: string) {
  await prisma.deviceSettings.delete({ where: { deviceId } }).catch(() => undefined);
  const settings = await prisma.deviceSettings.create({ data: { deviceId } });
  await prisma.device.update({ where: { id: deviceId }, data: { configVersion: { increment: 1 } } });
  await logActivity({ deviceId, source: 'SETTINGS', message: `Settings reset to defaults${actor ? ` by ${actor}` : ''}` });
  realtime.publish('settings', serializeSettings(settings), deviceId);
  await runAutomation(deviceId);
  return settings;
}
