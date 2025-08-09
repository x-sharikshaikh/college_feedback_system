import { PrismaClient } from '@prisma/client';
import { config } from '@config/env';

// Reduce verbose logs outside development
const logLevels: ('query'|'info'|'warn'|'error')[] =
  config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'];

// Ensure single Prisma instance during dev hot-reloads/tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = global as any;
const prismaClient: PrismaClient = globalAny.__prisma || new PrismaClient({ log: logLevels });
if (config.nodeEnv !== 'production') {
  globalAny.__prisma = prismaClient;
}

// Graceful shutdown
const disconnect = async () => {
  try { await prismaClient.$disconnect(); } catch { /* noop */ }
};

process.once('beforeExit', disconnect);
process.once('SIGINT', async () => { await disconnect(); process.exit(0); });
process.once('SIGTERM', async () => { await disconnect(); process.exit(0); });

export const prisma = prismaClient;
