import { Router } from 'express';
import { AuthedRequest } from '../../middlewares/auth';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';
import { getSettings, resolveDevice } from '../../../services/deviceStore';
import { resetSettings, serializeSettings, settingsPatchSchema, updateSettings } from './settings.service';

const router = Router();

/** GET /settings - thresholds + automation configuration */
router.get(
  '/',
  catchAsync(async (req, res) => {
    const device = await resolveDevice(req.query.deviceId as string | undefined);
    const settings = await getSettings(device.id);
    sendResponse(res, { statusCode: 200, success: true, message: 'Settings', data: serializeSettings(settings) });
  }),
);

/** PUT|PATCH /settings - send only the fields you want to change */
const save = catchAsync(async (req: AuthedRequest, res) => {
  const device = await resolveDevice(req.query.deviceId as string | undefined);
  const { settings, changed } = await updateSettings(device.id, req.body, req.user?.email ?? undefined);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: changed.length ? 'Settings saved' : 'No changes',
    meta: { changed },
    data: serializeSettings(settings),
  });
});
router.put('/', validate(settingsPatchSchema), save);
router.patch('/', validate(settingsPatchSchema), save);

router.post(
  '/reset',
  catchAsync(async (req: AuthedRequest, res) => {
    const device = await resolveDevice(req.query.deviceId as string | undefined);
    const settings = await resetSettings(device.id, req.user?.email ?? undefined);
    sendResponse(res, { statusCode: 200, success: true, message: 'Settings reset to defaults', data: serializeSettings(settings) });
  }),
);

export const SettingsRoutes = router;
