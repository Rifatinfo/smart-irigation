import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const bool = (v: string | undefined, d: boolean) =>
  v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v === undefined || v === '' || Number.isNaN(n) ? d : n;
};

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return v;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';

export const config = {
  env: nodeEnv,
  isProd,
  port: num(process.env.PORT, 5000),
  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  refreshSecret: required('REFRESH_TOKEN_SECRET'),
  accessExpiry: process.env.ACCESS_TOKEN_EXPIRY ?? '1h',
  refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY ?? '30d',
  bcryptRounds: num(process.env.BCRYPT_SALT_ROUNDS, 10),

  /** Comma separated list of allowed dashboard origins (CORS, with credentials). */
  frontendUrls: (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** Also accept dashboards served from localhost / private LAN addresses (default: on outside production). */
  allowLanOrigins: bool(process.env.CORS_ALLOW_LAN, !isProd),

  /** Cookies: set COOKIE_SAMESITE=none when the dashboard is on a different site than the API (needs HTTPS). */
  cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? (isProd ? 'none' : 'lax')) as 'lax' | 'strict' | 'none',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  /** Set to false to expose the dashboard API without login (LAN / local use only!). */
  dashboardAuthRequired: bool(process.env.DASHBOARD_AUTH_REQUIRED, true),

  /** Used by `npm run seed` (first start only). */
  adminEmail: process.env.ADMIN_EMAIL?.trim() || 'admin@greenhouse.local',
  adminPassword: process.env.ADMIN_PASSWORD,
  adminName: process.env.ADMIN_NAME?.trim() || 'Md Rifat',
  seedDeviceName: process.env.DEVICE_NAME ?? 'Greenhouse',
  seedDeviceApiKey: process.env.DEVICE_API_KEY || undefined,

  /** Google sign-in: OAuth 2.0 Web client ID. Empty = the Google button is hidden. */
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || undefined,

  trustProxy: process.env.TRUST_PROXY ?? (isProd ? '1' : 'false'),
  deviceRateLimitPerMin: num(process.env.DEVICE_RATE_LIMIT_PER_MIN, 120),

  /** Background jobs (offline watchdog / retention). Disable on serverless hosts. */
  jobsEnabled: bool(process.env.JOBS_ENABLED, true),
};

export default config;
