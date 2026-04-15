import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import clientRoutes from './routes/client.routes.js';
import allyRoutes from './routes/ally.routes.js';
import serviceRoutes from './routes/service.routes.js';
import zoneRoutes from './routes/zone.routes.js';
import portRoutes from './routes/port.routes.js';
import quoteRoutes from './routes/quote.routes.js';
import serviceRateRoutes from './routes/service-rate.routes.js';
import rateRoutes from './routes/rate.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import paymentNoticeRoutes from './routes/payment-notice.routes.js';
import receivableRoutes from './routes/receivable.routes.js';
import deliveryNoteRoutes from './routes/delivery-note.routes.js';
import d2dItemRoutes from './routes/d2d-item.routes.js';
import svcProviderRoutes from './routes/svc-provider.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';
import shippingLineRoutes from './routes/shipping-line.routes.js';
import airLineRoutes from './routes/airline.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import cashFlowRoutes from './routes/cash-flow.routes.js';
import { verifyToken } from './middleware/auth.middleware.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
process.env.TZ = 'America/Caracas';

// Seguridad: headers HTTP de protección
app.use(helmet());

// Middlewares
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('CORS no permitido'));
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Rate limiting para login (protección anti fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutos
    max: 10, // máx 10 intentos
    message: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Servir archivos estáticos (imágenes subidas)
import { UPLOADS_DIR } from './config/upload.js';
app.use('/uploads', (req, res, next) => {
    const origin = req.headers.origin;
    const allowed = allowedOrigins;

    if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(UPLOADS_DIR));

// Rutas de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ERP Import Services Backend - Running',
        timestamp: new Date().toISOString()
    });
});

// Rutas de autenticación (login con rate limiting)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
// Rutas de clientes (requiere autenticación)
app.use('/api/clients', verifyToken, clientRoutes);
// Rutas de aliados (requiere autenticación)
app.use('/api/allies', verifyToken, allyRoutes);
// Dashboard y métricas (requiere autenticación)
app.use('/api/dashboard', verifyToken, dashboardRoutes);
// Balance financiero (Ingresos y Egresos)
app.use('/api/cash-flow', cashFlowRoutes);
// Rutas de servicios (requiere autenticación)
app.use('/api/services', verifyToken, serviceRoutes);
// Rutas de zonas (requiere autenticación)
app.use('/api/zones', verifyToken, zoneRoutes);
// Rutas de puertos (requiere autenticación)
app.use('/api/ports', verifyToken, portRoutes);
// Rutas de cotizaciones (requiere autenticación)
app.use('/api/quotes', verifyToken, quoteRoutes);
// Rutas de tarifas ServiceRate (sistema antiguo - requiere autenticación)
app.use('/api/service-rates', verifyToken, serviceRateRoutes);
// Rutas de tarifas Rate (nuevo sistema China/Otros Países - requiere autenticación)
app.use('/api/rates', verifyToken, rateRoutes);
// Rutas de configuración de empresa
app.use('/api/settings', settingsRoutes);
// Rutas de Avisos de Cobro (requiere autenticación integrada en las rutas)
app.use('/api/payment-notices', paymentNoticeRoutes);
// Rutas de Receivables (Cuentas por cobrar)
app.use('/api/receivables', receivableRoutes);
// Rutas de Notas de Entrega
app.use('/api/delivery-notes', deliveryNoteRoutes);

// Catálogo de items D2D (para Notas de Entrega)
app.use('/api/d2d-items', verifyToken, d2dItemRoutes);

// Catálogo de proveedores de servicio (para Cuentas por Pagar)
app.use('/api/svc-providers', verifyToken, svcProviderRoutes);
// Cuentas por Pagar
import payableRoutes from './routes/payable.routes.js';
app.use('/api/payables', payableRoutes);
// Rutas de Tracking / Embarques
app.use('/api/shipments', shipmentRoutes, verifyToken);
// Catálogo de Líneas Navieras
app.use('/api/shipping-lines', shippingLineRoutes, verifyToken);
// Catálogo de Líneas Aéreas
app.use('/api/airlines', airLineRoutes, verifyToken);

// Rutas de Notificaciones
import notificationRoutes from './routes/notification.routes.js';
app.use('/api/notifications', notificationRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Algo salió mal en el servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

import { initPgBoss } from './workers/pg-boss.js';

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
    
    // Iniciar el motor de tareas recurrentes pg-boss
    await initPgBoss();
});

export default app;
