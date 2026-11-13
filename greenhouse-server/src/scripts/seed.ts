/**
 * First-run setup (safe to run repeatedly):
 *  - creates the admin account if no user exists
 *  - registers the first device and prints its API key (shown once)
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import config from '../config';
import prisma from '../shared/prisma';
import { createDevice } from '../services/deviceStore';

async function main() {
  if ((await prisma.user.count()) === 0) {
    const generated = !config.adminPassword;
    const password = config.adminPassword ?? crypto.randomBytes(9).toString('base64url');
    await prisma.user.create({
      data: {
        email: config.adminEmail.toLowerCase(),
        name: config.adminName,
        password: await bcrypt.hash(password, config.bcryptRounds),
        needPasswordChange: generated,
      },
    });
    console.log('\n=== Admin account created ===');
    console.log(`  email:    ${config.adminEmail}`);
    console.log(`  password: ${generated ? password + '   (generated - change it after first login)' : '(from ADMIN_PASSWORD)'}`);
  } else {
    console.log('Admin account already exists - skipped.');
  }

  if ((await prisma.device.count()) === 0) {
    const { device, apiKey } = await createDevice(config.seedDeviceName, config.seedDeviceApiKey);
    console.log('\n=== Device registered ===');
    console.log(`  name:    ${device.name}`);
    console.log(`  api key: ${config.seedDeviceApiKey ? '(from DEVICE_API_KEY)' : apiKey}`);
    if (!config.seedDeviceApiKey) console.log('  Copy this key into the firmware now. It is stored hashed and cannot be shown again.');
  } else {
    console.log('A device is already registered - skipped. (Lost the key? npm run device:rotate-key)');
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
