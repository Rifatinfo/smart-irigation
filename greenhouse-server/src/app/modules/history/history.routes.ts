import { Router } from 'express';
import { z } from 'zod';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';
import { resolveDevice } from '../../../services/deviceStore';
import { buildCsv, getHistory } from './history.service';

const router = Router();

const query = z.object({
  range: z.enum(['24h', '7d', '30d', 'custom']).default('24h'),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  deviceId: z.string().optional(),
});

/** GET /history?range=24h|7d|30d  (or range=custom&from=ISO&to=ISO) */
router.get(
  '/',
  validate(query, 'query'),
  catchAsync(async (_req, res) => {
    const q = res.locals.query as z.infer<typeof query>;
    const device = await resolveDevice(q.deviceId);
    const data = await getHistory(device, q.range, q.from, q.to);
    sendResponse(res, { statusCode: 200, success: true, message: 'Sensor history', data });
  }),
);

/** GET /history/export.csv?range=24h - the download button. */
router.get(
  '/export.csv',
  validate(query, 'query'),
  catchAsync(async (_req, res) => {
    const q = res.locals.query as z.infer<typeof query>;
    const device = await resolveDevice(q.deviceId);
    const { csv, filename } = await buildCsv(device, q.range, q.from, q.to);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

export const HistoryRoutes = router;
