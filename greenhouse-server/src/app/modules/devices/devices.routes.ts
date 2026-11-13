import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../../shared/prisma';
import { logActivity } from '../../../services/activity';
import { createDevice, rotateDeviceKey } from '../../../services/deviceStore';
import { serializeDevice } from '../../../services/views';
import AppError from '../../middlewares/AppError';
import { AuthedRequest } from '../../middlewares/auth';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';

const router = Router();
const nameBody = z.object({ name: z.string().trim().min(1).max(60) });

router.get(
  '/',
  catchAsync(async (_req, res) => {
    const devices = await prisma.device.findMany({ orderBy: { createdAt: 'asc' } });
    sendResponse(res, { statusCode: 200, success: true, message: 'Devices', data: devices.map(serializeDevice) });
  }),
);

/** POST /devices {name} - registers hardware. The API key is shown ONCE in this response. */
router.post(
  '/',
  validate(nameBody),
  catchAsync(async (req: AuthedRequest, res) => {
    const { device, apiKey } = await createDevice(req.body.name);
    await logActivity({ deviceId: device.id, source: 'DEVICE', message: `Device "${device.name}" registered${req.user?.email ? ` by ${req.user.email}` : ''}` });
    sendResponse(res, { statusCode: 201, success: true, message: 'Device created - copy the API key now, it cannot be shown again', data: { ...serializeDevice(device), apiKey } });
  }),
);

router.patch(
  '/:id',
  validate(nameBody),
  catchAsync(async (req, res) => {
    const device = await prisma.device.update({ where: { id: String(req.params.id) }, data: { name: req.body.name } });
    sendResponse(res, { statusCode: 200, success: true, message: 'Device renamed', data: serializeDevice(device) });
  }),
);

/** POST /devices/:id/rotate-key - invalidates the old key immediately. */
router.post(
  '/:id/rotate-key',
  catchAsync(async (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    if (!(await prisma.device.findUnique({ where: { id } }))) throw new AppError(404, 'Device not found');
    const { device, apiKey } = await rotateDeviceKey(id);
    await logActivity({ deviceId: id, level: 'WARNING', source: 'DEVICE', message: `API key rotated${req.user?.email ? ` by ${req.user.email}` : ''}` });
    sendResponse(res, { statusCode: 200, success: true, message: 'New API key - copy it now, it cannot be shown again', data: { ...serializeDevice(device), apiKey } });
  }),
);

router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const id = String(req.params.id);
    if ((await prisma.device.count()) <= 1) throw new AppError(400, 'Cannot delete the only device');
    await prisma.device.delete({ where: { id } });
    sendResponse(res, { statusCode: 200, success: true, message: 'Device and its data deleted' });
  }),
);

export const DeviceAdminRoutes = router;
