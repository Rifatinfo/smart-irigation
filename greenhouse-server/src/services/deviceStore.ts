import { ActuatorType, Device, DeviceSettings } from '@prisma/client';
import prisma from '../shared/prisma';
import AppError from '../app/middlewares/AppError';
import config from '../config';
import { apiKeyPrefix, generateApiKey, hashApiKey } from '../utils/apiKey';

export const ACTUATORS: ActuatorType[] = ['PUMP', 'GROW_LIGHT', 'BUZZER'];

export const DEFAULT_HARDWARE = {
  soil: 'Capacitive v2.0 on GPIO 34',
  temperature: 'DHT22 on GPIO 4',
  humidity: 'DHT22 on GPIO 4',
  light: 'LDR module on GPIO 35',
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

let creatingDefault: Promise<Device> | null = null;

/** Registers the default device (DEVICE_NAME / DEVICE_API_KEY from .env) once, even if several requests ask at the same time. */
function createDefaultDevice(): Promise<Device> {
  creatingDefault ??= (async () => {
    const existing = await prisma.device.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing;
    const { device, apiKey } = await createDevice(config.seedDeviceName, config.seedDeviceApiKey);
    console.log(`\n=== Device "${device.name}" registered automatically ===`);
    console.log(`  api key: ${config.seedDeviceApiKey ? '(DEVICE_API_KEY from .env)' : apiKey}`);
    if (!config.seedDeviceApiKey) console.log('  Copy it into DEVICE_API_KEY in the ESP32 sketch (or get a new one in Settings > Device API key).\n');
    return device;
  })().finally(() => {
    creatingDefault = null;
  });
  return creatingDefault;
}

/**
 * The dashboard works on one device at a time. Without ?deviceId it uses the oldest registered device,
 * and registers the default device first if there is none yet (so a fresh database never blocks the dashboard).
 */
export async function resolveDevice(deviceId?: string): Promise<Device> {
  if (deviceId) {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new AppError(404, 'Device not found');
    return device;
  }
  return (await prisma.device.findFirst({ orderBy: { createdAt: 'asc' } })) ?? createDefaultDevice();
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
