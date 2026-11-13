/**
 * First-run setup (safe to run repeatedly). The server also does this by itself on every start.
 *  - creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD if it does not exist yet
 *  - registers the first device and prints its API key (shown once)
 */
import prisma from '../shared/prisma';
import { ensureDefaults } from '../services/bootstrap';

async function main() {
  await ensureDefaults();
  console.log('\nSetup checked: the admin account and the device exist. (Lost the device key? npm run device:rotate-key)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
