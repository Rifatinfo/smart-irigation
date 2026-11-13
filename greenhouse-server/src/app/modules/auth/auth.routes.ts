import bcrypt from 'bcryptjs';
import { CookieOptions, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import config from '../../../config';
import prisma from '../../../shared/prisma';
import { jwtHelper } from '../../../utils/jwtHelper';
import { logActivity } from '../../../services/activity';
import AppError from '../../middlewares/AppError';
import auth, { AuthedRequest } from '../../middlewares/auth';
import { catchAsync } from '../../middlewares/catchAsync';
import sendResponse from '../../middlewares/sendResponse';
import validate from '../../middlewares/validate';

const router = Router();

const cookieBase: CookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSameSite,
  domain: config.cookieDomain,
  path: '/',
};

const issue = (u: { id: string; email: string; role: string }) => ({
  accessToken: jwtHelper.generateToken({ id: u.id, email: u.email, role: u.role }, config.jwtSecret, config.accessExpiry),
  refreshToken: jwtHelper.generateToken({ id: u.id, email: u.email, role: u.role }, config.refreshSecret, config.refreshExpiry),
});

const setCookies = (res: Response, t: { accessToken: string; refreshToken: string }) => {
  res.cookie('accessToken', t.accessToken, { ...cookieBase, maxAge: 60 * 60 * 1000 });
  res.cookie('refreshToken', t.refreshToken, { ...cookieBase, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

const publicUser = (u: { id: string; email: string; name: string | null; role: string; needPasswordChange: boolean }) => ({
  id: u.id, email: u.email, name: u.name, role: u.role, needPasswordChange: u.needPasswordChange,
});

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

router.post(
  '/login',
  loginLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  catchAsync(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
    const ok = await bcrypt.compare(req.body.password, user?.password ?? DUMMY_HASH);
    if (!user || !ok || user.status !== 'ACTIVE') throw new AppError(401, 'Invalid email or password');

    const tokens = issue(user);
    setCookies(res, tokens);
    await logActivity({ source: 'AUTH', message: `${user.email} signed in` });
    sendResponse(res, {
      statusCode: 200, success: true, message: 'Logged in',
      data: { user: publicUser(user), needPasswordChange: user.needPasswordChange, accessToken: tokens.accessToken },
    });
  }),
);

router.post(
  '/refresh-token',
  catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
    if (!token) throw new AppError(401, 'No refresh token');
    let payload;
    try {
      payload = jwtHelper.verifyToken(token, config.refreshSecret);
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Account disabled');
    const tokens = issue(user);
    setCookies(res, tokens);
    sendResponse(res, { statusCode: 200, success: true, message: 'Token refreshed', data: { accessToken: tokens.accessToken } });
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie('accessToken', cookieBase);
  res.clearCookie('refreshToken', cookieBase);
  sendResponse(res, { statusCode: 200, success: true, message: 'Logged out' });
});

router.get(
  '/me',
  auth(),
  catchAsync(async (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      // auth disabled (DASHBOARD_AUTH_REQUIRED=false)
      return sendResponse(res, { statusCode: 200, success: true, message: 'Authentication disabled', data: { id: 'local', email: null, name: 'Local', role: 'ADMIN', needPasswordChange: false } });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError(401, 'Account no longer exists');
    sendResponse(res, { statusCode: 200, success: true, message: 'Current user', data: publicUser(user) });
  }),
);

router.post(
  '/change-password',
  auth(),
  validate(z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8).max(100) })),
  catchAsync(async (req: AuthedRequest, res: Response) => {
    if (!req.user) throw new AppError(400, 'Authentication is disabled');
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(req.body.oldPassword, user.password))) throw new AppError(400, 'Old password is incorrect');
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(req.body.newPassword, config.bcryptRounds), needPasswordChange: false },
    });
    sendResponse(res, { statusCode: 200, success: true, message: 'Password changed' });
  }),
);

export const AuthRoutes = router;
