import { Device } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../../config';
import { findDeviceByKey } from '../../services/deviceStore';
import AppError from './AppError';

/** Hardware authentication: `x-api-key: <key>` (or `Authorization: Bearer <key>`). */
export const deviceAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const key =
      (req.headers['x-api-key'] as string | undefined) ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!key) throw new AppError(401, 'Missing device API key (send header x-api-key)');
    const device = await findDeviceByKey(key.trim());
    if (!device) throw new AppError(401, 'Invalid device API key');
    res.locals.device = device;
    next();
  } catch (e) {
    next(e);
  }
};

export const getDevice = (res: Response) => res.locals.device as Device;

/** Generous per-device limit: a healthy device posts every few seconds. */
export const deviceRateLimit = rateLimit({
  windowMs: 60_000,
  limit: config.deviceRateLimitPerMin,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.headers['x-api-key'] ?? req.headers.authorization ?? req.ip ?? 'anon'),
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: 'Too many requests from this device' },
});
