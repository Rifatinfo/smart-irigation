import { Request, Response } from 'express';
import { catchAsync } from '../../middlewares/catchAsync';
import { getDevice } from '../../middlewares/deviceAuth';
import { getSettings } from '../../../services/deviceStore';
import { runAutomation } from '../../../services/automation.service';
import { deviceConfigFor, ingestReading } from './device.service';

/** POST /device/readings - the ESP32 sends sensors + relay feedback, gets commands + config back. */
const postReading = catchAsync(async (req: Request, res: Response) => {
  const result = await ingestReading(getDevice(res), req.body, req.ip);
  res.json(result);
});

/** GET /device/config - fetched once at boot (and whenever config_version changes). */
const getConfig = catchAsync(async (_req: Request, res: Response) => {
  const device = getDevice(res);
  const settings = await getSettings(device.id);
  const commands = await runAutomation(device.id);
  res.json({
    ok: true,
    server_time: new Date().toISOString(),
    commands: { pump: commands.pump, grow_light: commands.growLight, buzzer: commands.buzzer },
    pump_run_sec: commands.pumpRunSec,
    ...deviceConfigFor(device, settings),
  });
});

export const DeviceController = { postReading, getConfig };
