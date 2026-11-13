/**
 * First-run setup, run automatically every time the server starts (and by `npm run seed`). Safe to repeat:
 *  - creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD if no account with that email exists yet
 *    (an existing account is never changed, so a password changed in the dashboard is not overwritten)
 *  - registers the first device if none exists and prints its API key once
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import config from '../config';
import prisma from '../shared/prisma';
import { logActivity } from './activity';
import { createDevice } from './deviceStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function ensureDefaultAdmin(log: (msg: string) => void = console.log) {
  const email = config.adminEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    log(`ADMIN_EMAIL "${config.adminEmail}" is not a valid email - default admin not created.`);
    return null;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const chosen = config.adminPassword?.trim() || undefined;
  if (chosen && chosen.length < 8) {
    log('ADMIN_PASSWORD must be at least 8 characters - default admin not created. Fix it in .env and restart.');
    return null;
  }
  const password = chosen ?? crypto.randomBytes(9).toString('base64url');
  const user = await prisma.user.create({
    data: {
      email,
      name: config.adminName,
      password: await bcrypt.hash(password, config.bcryptRounds),
      needPasswordChange: !chosen,
    },
  });
  await logActivity({ source: 'AUTH', message: `Admin account ${email} created on first start` });

  log('\n=== Admin account created ===');
  log(`  email:    ${email}`);
  log(`  password: ${chosen ? '(ADMIN_PASSWORD from .env)' : `${password}   (generated - shown once, change it after signing in)`}`);
  if (config.googleClientId) log('  Google sign-in: use the Google account with this same email.');
  return user;
}

export async function ensureDefaultDevice(log: (msg: string) => void = console.log) {
  if ((await prisma.device.count()) > 0) return null;
  const { device, apiKey } = await createDevice(config.seedDeviceName, config.seedDeviceApiKey);
  log('\n=== Device registered ===');
  log(`  name:    ${device.name}`);
  log(`  api key: ${config.seedDeviceApiKey ? '(DEVICE_API_KEY from .env)' : apiKey}`);
  if (!config.seedDeviceApiKey) {
    log('  Copy this key into DEVICE_API_KEY in the ESP32 sketch now. It is stored hashed and is not shown again');
    log('  (lost it? Settings > Device API key > New key, or npm run device:rotate-key).');
  }
  return device;
}

export async function ensureDefaults(log: (msg: string) => void = console.log) {
  await ensureDefaultAdmin(log);
  await ensureDefaultDevice(log);
}
