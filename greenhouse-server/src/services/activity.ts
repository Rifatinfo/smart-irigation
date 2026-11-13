import { AlertSeverity, AlertType, LogLevel, LogSource, Prisma } from '@prisma/client';
import prisma from '../shared/prisma';
import { realtime } from './realtime';

export async function logActivity(input: {
  deviceId?: string | null;
  level?: LogLevel;
  source: LogSource;
  message: string;
  meta?: Prisma.InputJsonValue;
}) {
  const row = await prisma.activityLog.create({
    data: {
      deviceId: input.deviceId ?? null,
      level: input.level ?? 'INFO',
      source: input.source,
      message: input.message,
      meta: input.meta,
    },
  });
  realtime.publish('log', row, input.deviceId);
  return row;
}

export type OpenAlertState = 'NONE' | 'ACTIVE' | 'ACKNOWLEDGED';

export async function getOpenAlertState(deviceId: string, dedupeKey: string): Promise<OpenAlertState> {
  const a = await prisma.alert.findFirst({
    where: { deviceId, dedupeKey, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    orderBy: { openedAt: 'desc' },
  });
  return a ? (a.status as 'ACTIVE' | 'ACKNOWLEDGED') : 'NONE';
}

/** Opens an alert unless one with the same key is already open. */
export async function openAlert(input: {
  deviceId: string;
  type: AlertType;
  dedupeKey?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  value?: number | null;
  threshold?: number | null;
}) {
  const dedupeKey = input.dedupeKey ?? input.type;
  const existing = await prisma.alert.findFirst({
    where: { deviceId: input.deviceId, dedupeKey, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
  });
  if (existing) return { alert: existing, created: false };

  const alert = await prisma.alert.create({
    data: {
      deviceId: input.deviceId,
      type: input.type,
      dedupeKey,
      severity: input.severity,
      title: input.title,
      message: input.message,
      value: input.value ?? null,
      threshold: input.threshold ?? null,
    },
  });
  await logActivity({
    deviceId: input.deviceId,
    level: input.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
    source: 'ALERT',
    message: `Alert opened: ${input.title} - ${input.message}`,
    meta: { alertId: alert.id, type: input.type },
  });
  realtime.publish('alert', { action: 'opened', alert }, input.deviceId);
  return { alert, created: true };
}

/** Resolves every open alert with this key. Returns how many were resolved. */
export async function resolveAlert(deviceId: string, dedupeKey: string, note?: string) {
  const open = await prisma.alert.findMany({
    where: { deviceId, dedupeKey, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
  });
  for (const a of open) {
    const alert = await prisma.alert.update({
      where: { id: a.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    await logActivity({
      deviceId,
      source: 'ALERT',
      message: `Alert resolved: ${a.title}${note ? ` - ${note}` : ''}`,
      meta: { alertId: a.id, type: a.type },
    });
    realtime.publish('alert', { action: 'resolved', alert }, deviceId);
  }
  return open.length;
}
