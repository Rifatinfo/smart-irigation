import { ActuatorType, Device, DeviceSettings } from '@prisma/client';
import prisma from '../shared/prisma';
import AppError from '../app/middlewares/AppError';
import { apiKeyPrefix, generateApiKey, hashApiKey } from '../utils/apiKey';

export const ACTUATORS: ActuatorType[] = ['PUMP', 'GROW_LIGHT', 'BUZZER'];

export const DEFAULT_HARDWARE = {
  soil: 'Capacitive v2.0 on A0',
  temperature: 'DHT22 on GPIO 4',
  humidity: 'DHT22 on GPIO 4',
  light: 'BH1750 on I²C 0x23',
};

export type HardwareInfo = typeof DEFAULT_HARDWARE;

export const hardwareOf = (d: Pick<Device, 'hardwareInfo'>): HardwareInfo => ({
  ...DEFAULT_HARDWARE,
  ...((d.hardwareInfo as Partial<HardwareInfo> | null) ?? {}),
});

/** Creates a device with its default settings and actuator rows. Returns the plaintext API key ONCE. */
export async function createDevice(name: string, presetKey?: string) {
  const apiKey = presetKey ?? generateApiKey();
  const device = await prisma.device.create({
    data: {
      name,
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPrefix: apiKeyPrefix(apiKey),
      settings: { create: {} },
      actuators: { create: ACTUATORS.map((actuator) => ({ actuator })) },
    },
  });
  return { device, apiKey };
}

/** The dashboard works on one device at a time. Without ?deviceId it uses the oldest registered device. */
export async function resolveDevice(deviceId?: string): Promise<Device> {
  const device = deviceId
    ? await prisma.device.findUnique({ where: { id: deviceId } })
    : await prisma.device.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!device) throw new AppError(404, deviceId ? 'Device not found' : 'No device registered yet - run `npm run seed`');
  return device;
}

export async function getSettings(deviceId: string): Promise<DeviceSettings> {
  const existing = await prisma.deviceSettings.findUnique({ where: { deviceId } });
  if (existing) return existing;
  return prisma.deviceSettings.create({ data: { deviceId } });
}

export async function findDeviceByKey(key: string) {
  return prisma.device.findUnique({ where: { apiKeyHash: hashApiKey(key) } });
}

export async function rotateDeviceKey(deviceId: string) {
  const apiKey = generateApiKey();
  const device = await prisma.device.update({
    where: { id: deviceId },
    data: { apiKeyHash: hashApiKey(apiKey), apiKeyPrefix: apiKeyPrefix(apiKey) },
  });
  return { device, apiKey };
}
