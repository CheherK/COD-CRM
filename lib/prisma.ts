import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Performance optimizations
    transactionOptions: {
      isolationLevel: 'ReadCommitted',
      maxWait: 5000, // 5 seconds
      timeout: 20000, // 20 seconds
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


// Add connection pool configuration
export const prismaConfig = {
  // Connection pool settings for high performance
  connectionLimit: 10, // Vercel Hobby plan limit
  connectTimeout: 20000,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 20000,
    createTimeoutMillis: 20000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;