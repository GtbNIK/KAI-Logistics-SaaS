import { PrismaClient } from '@prisma/client';

const createClient = () => new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prisma = prisma;
}

export default prisma;
