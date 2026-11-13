import { Router } from 'express';
import { realtime } from '../../../services/realtime';
import { resolveDevice } from '../../../services/deviceStore';
import { catchAsync } from '../../middlewares/catchAsync';
import { getSummary } from '../dashboard/dashboard.service';

const router = Router();

/**
 * GET /stream - Server-Sent Events.
 *   const es = new EventSource(`${API}/stream`, { withCredentials: true });
 *   es.addEventListener('reading', e => ...)
 * Events: snapshot (on connect), reading, actuators, alert, log, device, settings.
 */
router.get(
  '/',
  catchAsync(async (req, res) => {
    const device = await resolveDevice(req.query.deviceId as string | undefined);

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx: do not buffer
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    const client = realtime.add(res, device.id);
    req.on('close', () => realtime.remove(client));

    realtime.send(client, 'snapshot', await getSummary(device, { withSeries: false }));
  }),
);

export const StreamRoutes = router;
