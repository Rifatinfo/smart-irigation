import prisma from '../shared/prisma';
import { logActivity, openAlert } from './activity';
import { realtime } from './realtime';
import { serializeDevice } from './views';

/** Marks devices offline when they stop reporting. Runs every 15 s. */
export async function offlineWatchdog() {
  const now = Date.now();
  const devices = await prisma.device.findMany({ where: { isOnline: true }, include: { settings: true } });
  for (const d of devices) {
    const limitMs = (d.settings?.offlineAfterSec ?? 60) * 1000;
    if (d.lastSeenAt && now - d.lastSeenAt.getTime() <= limitMs) continue;

    const res = await prisma.device.updateMany({ where: { id: d.id, isOnline: true, lastSeenAt: d.lastSeenAt }, data: { isOnline: false } });
    if (res.count === 0) continue; // it reported in the meantime
    const since = d.lastSeenAt ? d.lastSeenAt.toISOString() : 'never';
    await openAlert({
      deviceId: d.id,
      type: 'DEVICE_OFFLINE',
      severity: 'WARNING',
      title: 'Device offline',
      message: `${d.name} has not reported since ${since}. Check power and Wi-Fi.`,
    });
    await logActivity({ deviceId: d.id, level: 'WARNING', source: 'DEVICE', message: `${d.name} went offline (last seen ${since})` });
    const fresh = await prisma.device.findUnique({ where: { id: d.id } });
    if (fresh) realtime.publish('device', serializeDevice(fresh), d.id);
  }
}

let lastOpportunistic = 0;
/** Also called when the dashboard loads, so offline detection works on hosts without background timers. */
export async function maybeRunWatchdog() {
  if (Date.now() - lastOpportunistic < 10_000) return;
  lastOpportunistic = Date.now();
  try {
    await offlineWatchdog();
  } catch (err) {
    console.error('[jobs] opportunistic watchdog failed:', err);
  }
}

/** Deletes data older than each device's retention setting. */
async function retention() {
  const devices = await prisma.device.findMany({ include: { settings: true } });
  for (const d of devices) {
    const days = d.settings?.dataRetentionDays ?? 90;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const [r, l, e, a] = await Promise.all([
      prisma.sensorReading.deleteMany({ where: { deviceId: d.id, createdAt: { lt: cutoff } } }),
      prisma.activityLog.deleteMany({ where: { deviceId: d.id, createdAt: { lt: cutoff } } }),
      prisma.actuatorEvent.deleteMany({ where: { deviceId: d.id, startedAt: { lt: cutoff } } }),
      prisma.alert.deleteMany({ where: { deviceId: d.id, status: 'RESOLVED', openedAt: { lt: cutoff } } }),
    ]);
    if (r.count + l.count + e.count + a.count > 0) {
      console.log(`[retention] ${d.name}: removed ${r.count} readings, ${l.count} logs, ${e.count} events, ${a.count} alerts older than ${days}d`);
    }
  }
}

const safe = (name: string, fn: () => Promise<void>) => async () => {
  try {
    await fn();
  } catch (err) {
    console.error(`[jobs] ${name} failed:`, err);
  }
};

export function startJobs() {
  const timers = [
    setInterval(safe('offline-watchdog', offlineWatchdog), 15_000),
    setInterval(safe('retention', retention), 6 * 3_600_000),
    setTimeout(safe('retention', retention), 60_000),
  ];
  timers.forEach((t) => t.unref());
  return () => timers.forEach((t) => clearInterval(t));
}
