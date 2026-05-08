import { PrismaClient } from '@prisma/client';

// Nota: En Prisma Client 6.x, el límite de conexiones por instancia suele configurarse
// en la cadena DATABASE_URL (por ejemplo: ?connection_limit=5&pool_timeout=20).
// Aun así, centralizamos la creación del cliente y garantizamos un singleton estable
// en todos los entornos para evitar múltiples instancias consumiendo el pool.
const createClient = () => new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

const globalForPrisma = globalThis;

// Siempre usar una sola instancia de PrismaClient en cualquier entorno
const prisma = globalForPrisma.__prisma ?? createClient();
globalForPrisma.__prisma = prisma;

export default prisma;
