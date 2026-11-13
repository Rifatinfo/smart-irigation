import { Server } from 'http';
import app from './app';
import config from './config';
import { startJobs } from './services/jobs';
import prisma from './shared/prisma';

async function bootstrap() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error('Cannot reach the database. Check DATABASE_URL and run the migrations (npm run db:deploy).');
    console.error(err);
    process.exit(1);
  }

  const server: Server = app.listen(config.port, () => {
    console.log(`Greenhouse API listening on http://localhost:${config.port}  (env: ${config.env})`);
    if (!config.dashboardAuthRequired) console.warn('WARNING: DASHBOARD_AUTH_REQUIRED=false - the dashboard API is open to anyone who can reach this server');
  });

  const stopJobs = config.jobsEnabled ? startJobs() : () => undefined;

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    stopJobs();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    server.closeAllConnections?.(); // ends open SSE streams
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
}

bootstrap();
