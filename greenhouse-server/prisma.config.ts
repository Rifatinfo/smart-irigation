import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `prisma generate` never connects to the database, so it must not fail when
// DATABASE_URL is absent (e.g. during `npm install` on a build server).
// Commands that do connect (migrate deploy, studio…) will fail with a clear
// connection error if the placeholder is ever used.
const url =
  process.env.DATABASE_URL ??
  'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export default defineConfig({
  schema: './prisma/schema',
  migrations: {
    path: './prisma/schema/migrations',
  },
  datasource: { url },
});
