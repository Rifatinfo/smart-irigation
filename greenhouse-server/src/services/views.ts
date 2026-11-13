import { ActuatorState, Device } from '@prisma/client';
import prisma from '../shared/prisma';
import { hardwareOf } from './deviceStore';

export const serializeActuator = (a: ActuatorState) => ({
  actuator: a.actuator,
  mode: a.mode,
  /** What the hardware last reported (falls back to the server's command until it reports). */
  isOn: a.reportedOn ?? a.desiredOn,
  desiredOn: a.desiredOn,
  reportedOn: a.reportedOn,
  reason: a.reason,
  manualUntil: a.manualUntil,
  lastChangedAt: a.lastChangedAt,
  lastOnAt: a.lastOnAt,
  lastOffAt: a.lastOffAt,
});

export async function getActuatorSnapshot(deviceId: string) {
  const rows = await prisma.actuatorState.findMany({ where: { deviceId } });
  const get = (t: string) => rows.find((r) => r.actuator === t);
  const ser = (t: string) => {
    const r = get(t);
    return r ? serializeActuator(r) : null;
  };
  return { pump: ser('PUMP'), growLight: ser('GROW_LIGHT'), buzzer: ser('BUZZER') };
}

export const serializeDevice = (d: Device) => ({
  id: d.id,
  name: d.name,
  isOnline: d.isOnline,
  lastSeenAt: d.lastSeenAt,
  firmwareVersion: d.firmwareVersion,
  ipAddress: d.ipAddress,
  rssi: d.rssi,
  apiKeyPrefix: d.apiKeyPrefix,
  hardware: hardwareOf(d),
  createdAt: d.createdAt,
});
