import { defineConfig, env } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
