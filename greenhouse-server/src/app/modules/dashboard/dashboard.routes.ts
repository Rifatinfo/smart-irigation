import { Router } from 'express';
import { z } from 'zod';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';
import { resolveDevice } from '../../../services/deviceStore';
import { maybeRunWatchdog } from '../../../services/jobs';
import { getSummary } from './dashboard.service';

const router = Router();

const query = z.object({
  deviceId: z.string().optional(),
  series: z.enum(['true', 'false']).optional(),
});

/** GET /dashboard/summary - everything the dashboard cards need in one call. */
router.get(
  '/summary',
  validate(query, 'query'),
  catchAsync(async (_req, res) => {
    const q = res.locals.query as z.infer<typeof query>;
    await maybeRunWatchdog();
    const device = await resolveDevice(q.deviceId);
    const data = await getSummary(device, { withSeries: q.series !== 'false' });
    sendResponse(res, { statusCode: 200, success: true, message: 'Dashboard summary', data });
  }),
);

export const DashboardRoutes = router;
