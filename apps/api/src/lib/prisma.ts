import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

// Initialize the Prisma driver adapter for PostgreSQL
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

// PrismaClient is attached to the `globalThis` object in development to prevent
// exhausting the database connection limit due to tsx hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
