import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../../shared/prisma';
import { logActivity } from '../../../services/activity';
import { runAutomation } from '../../../services/automation.service';
import { resolveDevice } from '../../../services/deviceStore';
import { realtime } from '../../../services/realtime';
import AppError from '../../middlewares/AppError';
import { AuthedRequest } from '../../middlewares/auth';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';

const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  deviceId: z.string().optional(),
};

const logQuery = z.object({
  ...page,
  level: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  source: z.enum(['SENSOR', 'PUMP', 'GROW_LIGHT', 'BUZZER', 'DEVICE', 'SETTINGS', 'ALERT', 'AUTH', 'SYSTEM']).optional(),
  q: z.string().max(100).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

const alertQuery = z.object({
  ...page,
  status: z.enum(['active', 'resolved', 'all']).default('active'),
});

export const LogRoutes = Router();
export const AlertRoutes = Router();

/** GET /logs?level=&source=&q=&from=&to=&page=&limit= - system activity log (newest first) */
LogRoutes.get(
  '/',
  validate(logQuery, 'query'),
  catchAsync(async (_req, res) => {
    const q = res.locals.query as z.infer<typeof logQuery>;
    const device = await resolveDevice(q.deviceId);
    const where: Prisma.ActivityLogWhereInput = {
      OR: [{ deviceId: device.id }, { deviceId: null }],
      ...(q.level ? { level: q.level } : {}),
      ...(q.source ? { source: q.source } : {}),
      ...(q.q ? { message: { contains: q.q, mode: 'insensitive' } } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    ]);
    sendResponse(res, {
      statusCode: 200, success: true, message: 'Activity log',
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
      data: items,
    });
  }),
);

/** GET /alerts?status=active|resolved|all */
AlertRoutes.get(
  '/',
  validate(alertQuery, 'query'),
  catchAsync(async (_req, res) => {
    const q = res.locals.query as z.infer<typeof alertQuery>;
    const device = await resolveDevice(q.deviceId);
    const where: Prisma.AlertWhereInput = {
      deviceId: device.id,
      ...(q.status === 'active' ? { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } } : q.status === 'resolved' ? { status: 'RESOLVED' } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({ where, orderBy: { openedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    ]);
    sendResponse(res, {
      statusCode: 200, success: true, message: 'Alerts',
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
      data: items,
    });
  }),
);

async function acknowledge(id: string, actor?: string) {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) throw new AppError(404, 'Alert not found');
  if (alert.status !== 'ACTIVE') return alert; // already acknowledged / resolved
  const updated = await prisma.alert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() } });
  await logActivity({
    deviceId: alert.deviceId,
    source: 'ALERT',
    message: `Alert acknowledged${actor ? ` by ${actor}` : ''}: ${alert.title}`,
    meta: { alertId: id },
  });
  realtime.publish('alert', { action: 'acknowledged', alert: updated }, alert.deviceId);
  await runAutomation(alert.deviceId); // silences the buzzer right away
  return updated;
}

/** POST /alerts/:id/acknowledge - silences the buzzer; the alert resolves itself when the condition clears */
AlertRoutes.post(
  '/:id/acknowledge',
  catchAsync(async (req: AuthedRequest, res) => {
    const data = await acknowledge(String(req.params.id), req.user?.email ?? undefined);
    sendResponse(res, { statusCode: 200, success: true, message: 'Alert acknowledged', data });
  }),
);

AlertRoutes.post(
  '/acknowledge-all',
  catchAsync(async (req: AuthedRequest, res) => {
    const device = await resolveDevice(req.query.deviceId as string | undefined);
    const open = await prisma.alert.findMany({ where: { deviceId: device.id, status: 'ACTIVE' } });
    for (const a of open) await acknowledge(a.id, req.user?.email ?? undefined);
    sendResponse(res, { statusCode: 200, success: true, message: `${open.length} alert(s) acknowledged`, data: { count: open.length } });
  }),
);
