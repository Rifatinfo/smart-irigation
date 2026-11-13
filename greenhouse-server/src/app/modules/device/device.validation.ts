import { z } from 'zod';

const ALIASES: Record<string, string> = {
  soil: 'soil_moisture',
  moisture: 'soil_moisture',
  temp: 'temperature',
  hum: 'humidity',
  lux: 'light_lux',
  light: 'light_lux',
  fw: 'firmware',
  firmware_version: 'firmware',
  pump_on: 'pump',
  grow_light_on: 'grow_light',
  buzzer_on: 'buzzer',
};

/** Accepts snake_case or camelCase keys (and a few short aliases) from the firmware. */
const normalizeKeys = (input: unknown) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const key = ALIASES[snake] ?? snake;
    if (!(key in out)) out[key] = v;
  }
  return out;
};

const n = z.number().finite().nullable().optional();
const b = z.boolean().nullable().optional();

export const readingSchema = z.preprocess(
  normalizeKeys,
  z.object({
    soil_moisture: n, // % (if the firmware converts it itself)
    soil_raw: n, // raw ADC value (server converts using the calibration in Settings)
    temperature: n, // °C
    humidity: n, // %
    light_lux: n, // lux
    pump: b, // actual relay state reported by the hardware
    grow_light: b,
    buzzer: b,
    rssi: z.number().int().nullable().optional(),
    firmware: z.string().max(40).optional(),
    uptime_s: n,
    hw: z
      .object({
        soil: z.string().max(60).optional(),
        temperature: z.string().max(60).optional(),
        humidity: z.string().max(60).optional(),
        light: z.string().max(60).optional(),
      })
      .optional(),
  }),
);

export type ReadingPayload = z.infer<typeof readingSchema>;
