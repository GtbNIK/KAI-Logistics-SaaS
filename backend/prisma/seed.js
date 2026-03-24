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
            email: 'admin@importservicesca.com',
            password: hashedPassword,
            name: 'Administrador Principal',
            role: 'ADMIN'
        }
    });

    const salesUser = await prisma.user.create({
        data: {
            email: 'ventas@importservicesca.com',
            password: hashedPassword,
            name: 'Vendedor Demo',
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

    // 3. Crear Zonas de Entrega
    console.log('📍 Creando zonas de entrega...');
    const zonas = await Promise.all([
        prisma.zone.create({ data: { internalCode: 'ZON-0001', name: 'Zona 1 - Caracas Centro', description: 'Municipios Libertador, Chacao, Baruta' } }),
        prisma.zone.create({ data: { internalCode: 'ZON-0002', name: 'Zona 2 - Caracas Este', description: 'Sucre, El Hatillo' } }),
        prisma.zone.create({ data: { internalCode: 'ZON-0003', name: 'Zona 3 - Miranda', description: 'Guarenas, Guatire, Los Teques' } }),
        prisma.zone.create({ data: { internalCode: 'ZON-0004', name: 'Zona 4 - Maracaibo', description: 'Maracaibo y alrededores' } }),
        prisma.zone.create({ data: { internalCode: 'ZON-0005', name: 'Zona 5 - Valencia', description: 'Valencia, Puerto Cabello' } }),
    ]);

    console.log(`✅ ${zonas.length} zonas creadas`);

    // 4. Crear Aliados (Proveedores)
    console.log('🤝 Creando aliados...');
    const aliados = await Promise.all([
        prisma.ally.create({
            data: {
                internalCode: 'ALL-0001',
                name: 'Naviera Global Express',
                rifOrId: 'J-12345678-1',
                contactInfo: 'contacto@navieraglobal.com | +58 212-555-0001',
                address: 'Puerto de La Guaira, Venezuela'
            }
        }),
        prisma.ally.create({
            data: {
                internalCode: 'ALL-0002',
                name: 'China Shipping Logistics',
                rifOrId: 'E-88888888-0',
                contactInfo: 'info@chinashipping.cn | +86 21-5555-0001',
                address: 'Shanghai, China'
            }
        }),
        prisma.ally.create({
            data: {
                internalCode: 'ALL-0003',
                name: 'Transporte Terrestre VE',
                rifOrId: 'J-98765432-1',
                contactInfo: 'ventas@transporteve.com | +58 414-555-0001',
                address: 'Caracas, Venezuela'
            }
        }),
    ]);

    console.log(`✅ ${aliados.length} aliados creados`);

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

    // 6. Crear Tarifas (ServiceRate)
    console.log('💰 Creando tarifas por aliado y zona...');
    const tarifas = [];

    // Door to Door - Diferentes precios por zona
    for (let i = 0; i < zonas.length; i++) {
        tarifas.push(
            prisma.serviceRate.create({
                data: {
                    allyId: aliados[0].id,
                    serviceId: servicios[0].id, // Door to Door
                    zoneId: zonas[i].id,
                    price: 50 + (i * 10), // $50, $60, $70, etc.
                    currency: 'USD',
                    validFrom: new Date(),
                    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
                }
            })
        );
    }

    // FCL 20 - Sin zona específica
    tarifas.push(
        prisma.serviceRate.create({
            data: {
                allyId: aliados[1].id,
                serviceId: servicios[1].id, // FCL 20
                price: 1500,
                currency: 'USD',
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })
    );

    // FCL 40
    tarifas.push(
        prisma.serviceRate.create({
            data: {
                allyId: aliados[1].id,
                serviceId: servicios[2].id, // FCL 40
                price: 2500,
                currency: 'USD',
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })
    );

    // Almacenaje por zona
    tarifas.push(
        prisma.serviceRate.create({
            data: {
                allyId: aliados[2].id,
                serviceId: servicios[6].id, // Almacenaje
                zoneId: zonas[0].id,
                price: 100,
                currency: 'USD',
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })
    );

    await Promise.all(tarifas);
    console.log(`✅ ${tarifas.length} tarifas creadas`);

    // 7. Crear Clientes de Ejemplo
    console.log('👥 Creando clientes de ejemplo...');
    const clientes = await Promise.all([
        prisma.client.create({
            data: {
                internalCode: 'CLI-001',
                name: 'Importadora El Ejemplo C.A.',
                rifOrId: 'J-30123456-7',
                email: 'contacto@importadoraejemplo.com',
                phone: '+58 212-555-1001',
                address: 'Av. Principal de Los Ruices, Caracas',
                deliveryAddress: 'Av. Principal de Los Ruices, Caracas',
                contactPerson: 'Carlos Rodríguez',
                referencePoint: 'Frente al Centro Comercial',
                assignedToId: salesUser.id
            }
        }),
        prisma.client.create({
            data: {
                internalCode: 'CLI-002',
                name: 'Comercial Tech Solutions',
                rifOrId: 'J-40987654-3',
                email: 'ventas@techsolutions.ve',
                phone: '+58 212-555-2002',
                address: 'Calle 5, Zona Industrial, Valencia',
                deliveryAddress: 'Calle 5, Zona Industrial, Valencia',
                contactPerson: 'María González',
                referencePoint: 'Al lado de la gasolinera PDV',
                assignedToId: salesUser.id
            }
        }),
    ]);

    console.log(`✅ ${clientes.length} clientes creados`);

    console.log('\n🎉 ¡Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - ${2} usuarios (admin@importservices.com / ventas@importservices.com)`);
    console.log(`   - Contraseña para todos: password123`);
    console.log(`   - ${zonas.length} zonas de entrega`);
    console.log(`   - ${aliados.length} aliados`);
    console.log(`   - ${servicios.length} servicios`);
    console.log(`   - ${tarifas.length} tarifas`);
    console.log(`   - ${clientes.length} clientes`);
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
