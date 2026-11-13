import { ActuatorType } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import AppError from '../../middlewares/AppError';
import { AuthedRequest } from '../../middlewares/auth';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';
import { resolveDevice } from '../../../services/deviceStore';
import { getActuatorSnapshot } from '../../../services/views';
import { resetAllToAuto, setActuatorMode } from './control.service';

const router = Router();

const SLUG: Record<string, ActuatorType> = { pump: 'PUMP', 'grow-light': 'GROW_LIGHT', growlight: 'GROW_LIGHT', buzzer: 'BUZZER' };

const body = z.object({
  mode: z.enum(['AUTO', 'ON', 'OFF']),
  /** Optional limit for manual overrides (pump/buzzer ON are always limited) */
  durationSec: z.number().int().min(1).max(86_400).optional(),
});

/** GET /control - current state of pump, grow light and buzzer */
router.get(
  '/',
  catchAsync(async (req, res) => {
    const device = await resolveDevice(req.query.deviceId as string | undefined);
    sendResponse(res, { statusCode: 200, success: true, message: 'Actuator state', data: await getActuatorSnapshot(device.id) });
  }),
);

/** POST /control/pump | /control/grow-light | /control/buzzer   { mode: "AUTO"|"ON"|"OFF", durationSec? } */
router.post(
  '/reset',
  catchAsync(async (req: AuthedRequest, res) => {
    const device = await resolveDevice(req.query.deviceId as string | undefined);
    const data = await resetAllToAuto(device.id, req.user?.email ?? undefined);
    sendResponse(res, { statusCode: 200, success: true, message: 'All devices back to AUTO', data });
  }),
);

router.post(
  '/:actuator',
  validate(body),
  catchAsync(async (req: AuthedRequest, res) => {
    const actuator = SLUG[String(req.params.actuator).toLowerCase()];
    if (!actuator) throw new AppError(404, 'Unknown device. Use pump, grow-light or buzzer');
    const device = await resolveDevice(req.query.deviceId as string | undefined);
    const data = await setActuatorMode(device.id, actuator, req.body.mode, req.body.durationSec, req.user?.email ?? undefined);
    sendResponse(res, { statusCode: 200, success: true, message: `${actuator} set to ${req.body.mode}`, data });
  }),
);

export const ControlRoutes = router;
