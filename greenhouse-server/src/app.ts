import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import config from './config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { router } from './app/routes';
import prisma from './shared/prisma';

const app: Application = express();

const trust = config.trustProxy;
app.set('trust proxy', trust === 'true' ? true : trust === 'false' ? false : Number.isNaN(Number(trust)) ? trust : Number(trust));
app.disable('x-powered-by');

app.use(
  cors({
    origin: config.frontendUrls,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Smart Irrigation / Greenhouse Controller API', status: 'running', docs: '/api/v1/health' });
});

app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down', time: new Date().toISOString() });
  }
});

app.use('/api/v1', router);

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API NOT FOUND', error: { path: req.originalUrl } });
});

app.use(globalErrorHandler);

export default app;
