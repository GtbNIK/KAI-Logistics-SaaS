const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres.hkmdeosytuxmzgvuteqj:7EpR9fU4W1WEl3AR@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true" } }
});

async function main() {
    const hash = await bcrypt.hash("123456", 10);
    // Cambiar la contraseña a 123456 para ventas@importservicesca.com
    await prisma.user.update({
        where: { email: "ventas@importservicesca.com" },
        data: { password: hash }
    });
    console.log("Contrasena de ventas cambiada a 123456");
    await prisma.$disconnect();
}
main();
