import { NextFunction, Request, Response } from 'express';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import { jwtHelper } from '../../utils/jwtHelper';
import AppError from './AppError';

export interface AuthedRequest extends Request {
  user?: { id: string; email: string | null; role: string };
}

/**
 * Dashboard authentication.
 * Accepts `Authorization: Bearer <token>` or the `accessToken` cookie
 * (and, for EventSource which cannot send headers, ?access_token= on the stream route only).
 * Disabled entirely when DASHBOARD_AUTH_REQUIRED=false.
 */
export const auth =
  (opts: { allowQueryToken?: boolean } = {}) =>
  (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!config.dashboardAuthRequired) return next();
    try {
      const header = req.headers.authorization;
      const token =
        (header?.startsWith('Bearer ') ? header.slice(7) : undefined) ??
        req.cookies?.accessToken ??
        (opts.allowQueryToken ? (req.query.access_token as string | undefined) : undefined);
      if (!token) throw new AppError(401, 'Not authenticated');
      const payload = jwtHelper.verifyToken(token, config.jwtSecret as Secret);
      req.user = { id: payload.id, email: payload.email ?? null, role: payload.role };
      next();
    } catch (e) {
      next(e instanceof AppError ? e : new AppError(401, 'Invalid or expired token'));
    }
  };

export default auth;
