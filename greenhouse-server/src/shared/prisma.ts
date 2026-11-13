import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import config from '../config';

// Force every DB session to UTC. With a non-UTC server time zone (e.g. a local Postgres in Asia/Dhaka)
// the driver adapter mis-reads timestamptz values by the zone offset.
const adapter = new PrismaPg({ connectionString: config.databaseUrl, options: '-c TimeZone=UTC' });
const prisma = new PrismaClient({ adapter });

export default prisma;
