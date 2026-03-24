import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear pool de conexiones
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes (opcional, solo en desarrollo)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.paymentTransaction.deleteMany();
    await prisma.receivable.deleteMany();
    await prisma.payable.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.paymentNotice.deleteMany();
    await prisma.deliveryNote.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.serviceRate.deleteMany();
    await prisma.service.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.ally.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.companySettings.deleteMany();

    // 1. Crear Usuarios
    console.log('👤 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.create({
        data: {
            email: 'ventas@importservicesca.com',
            password: hashedPassword,
            name: 'Ysmelda Mora',
            role: 'ADMIN'
        }
    });

    const salesUser = await prisma.user.create({
        data: {
            email: 'ventas2@importservicesca.com',
            password: hashedPassword,
            name: 'Johanne Waracao',
            role: 'SALES'
        }
    });

    console.log('✅ Usuarios creados:', { admin: adminUser.email, sales: salesUser.email });

    // 2. Crear Configuración de la Empresa
    console.log('⚙️  Creando configuración de empresa...');
    await prisma.companySettings.create({
        data: {
            companyName: 'Import Services',
            rif: 'J-12345678-9',
            primaryColor: '#003366',
            secondaryColor: '#FFA500',
            headerText: 'Import Services - Logística Internacional',
            footerText: 'Soluciones de importación puerta a puerta'
        }
    });

    // 5. Crear Servicios
    console.log('📦 Creando catálogo de servicios...');
    const servicios = await Promise.all([
        prisma.service.create({
            data: {
                code: 'D2D-001',
                name: 'Door to Door',
                type: 'DOOR_TO_DOOR',
                notes: 'Servicio puerta a puerta desde China'
            }
        }),
        prisma.service.create({
            data: {
                code: 'FCL-20',
                name: 'Contenedor 20 pies',
                type: 'FCL_20',
                notes: 'Contenedor estándar de 20 pies'
            }
        }),
        prisma.service.create({
            data: {
                code: 'FCL-40',
                name: 'Contenedor 40 pies',
                type: 'FCL_40',
                notes: 'Contenedor estándar de 40 pies'
            }
        }),
        prisma.service.create({
            data: {
                code: 'FCL-40HC',
                name: 'Contenedor 40 HC',
                type: 'FCL_40HC',
                notes: 'Contenedor High Cube de 40 pies'
            }
        }),
        prisma.service.create({
            data: {
                code: 'LCL-001',
                name: 'LCL (Carga Suelta)',
                type: 'LCL',
                notes: 'Less than Container Load'
            }
        }),
        prisma.service.create({
            data: {
                code: 'AIR-001',
                name: 'Carga Aérea',
                type: 'AIR',
                notes: 'Transporte aéreo internacional'
            }
        }),
        prisma.service.create({
            data: {
                code: 'WH-001',
                name: 'Almacenaje',
                type: 'WAREHOUSE',
                notes: 'Servicio de almacenamiento temporal'
            }
        }),
        prisma.service.create({
            data: {
                code: 'CUSTOMS-VE',
                name: 'Agenciamiento Aduanal',
                type: 'CUSTOMS',
                notes: 'Gestión de trámites aduanales en Venezuela'
            }
        }),
    ]);

    console.log(`✅ ${servicios.length} servicios creados`);

    console.log('\n🎉 ¡Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - 2 usuarios creados (admin@importservicesca.com / ventas@importservicesca.com)`);
    console.log(`   - Contraseña para todos: password123`);
    console.log(`   - 1 Configuración de la empresa`);
    console.log(`   - ${servicios.length} servicios base`);
}

main()
    .catch((e) => {
        console.error('❌ Error en el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
