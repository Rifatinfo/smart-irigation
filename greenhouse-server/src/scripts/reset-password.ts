/**
 * Forgot the dashboard password? Run on the server:
 *   npm run user:reset-password                       -> admin account, random password printed once
 *   npm run user:reset-password -- --email you@x.com --password "new-password"
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import config from '../config';
import prisma from '../shared/prisma';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

async function main() {
  const email = (arg('email') ?? config.adminEmail).toLowerCase();
  const chosen = arg('password');
  if (chosen !== undefined && chosen.length < 8) throw new Error('Password must be at least 8 characters');
  const password = chosen ?? crypto.randomBytes(9).toString('base64url');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const all = await prisma.user.findMany({ select: { email: true } });
    throw new Error(`No user ${email}. Existing accounts: ${all.map((u) => u.email).join(', ') || '(none - run npm run seed)'}`);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, config.bcryptRounds), needPasswordChange: !chosen, status: 'ACTIVE' },
  });
  console.log(`\nPassword reset for ${email}`);
  console.log(`  new password: ${chosen ? '(as given)' : `${password}   (generated - change it after signing in)`}\n`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
