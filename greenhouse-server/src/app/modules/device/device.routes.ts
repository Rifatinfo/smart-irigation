import { Router } from 'express';
import validate from '../../middlewares/validate';
import { deviceAuth, deviceRateLimit } from '../../middlewares/deviceAuth';
import { DeviceController } from './device.controller';
import { readingSchema } from './device.validation';

const router = Router();

// Hardware-facing API (authenticated with the device API key, not the dashboard login)
router.use(deviceRateLimit, deviceAuth);
router.post('/readings', validate(readingSchema), DeviceController.postReading);
router.get('/config', DeviceController.getConfig);

export const DeviceRoutes = router;
