import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import clientRoutes from './routes/client.routes.js';
import allyRoutes from './routes/ally.routes.js';
import serviceRoutes from './routes/service.routes.js';
import zoneRoutes from './routes/zone.routes.js';
import portRoutes from './routes/port.routes.js';
import quoteRoutes from './routes/quote.routes.js';
import rateRoutes from './routes/rate.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import paymentNoticeRoutes from './routes/payment-notice.routes.js';
import receivableRoutes from './routes/receivable.routes.js';
import deliveryNoteRoutes from './routes/delivery-note.routes.js';
import d2dItemRoutes from './routes/d2d-item.routes.js';
import svcProviderRoutes from './routes/svc-provider.routes.js';
import { verifyToken } from './middleware/auth.middleware.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
process.env.TZ = 'America/Caracas';

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos (imágenes subidas)
import { UPLOADS_DIR } from './config/upload.js';
app.use('/uploads', express.static(UPLOADS_DIR));

// Rutas de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ERP Import Services Backend - Running',
        timestamp: new Date().toISOString()
    });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);
// Rutas de clientes (requiere autenticación)
app.use('/api/clients', verifyToken, clientRoutes);
// Rutas de aliados (requiere autenticación)
app.use('/api/allies', verifyToken, allyRoutes);
// Rutas de servicios (requiere autenticación)
app.use('/api/services', verifyToken, serviceRoutes);
// Rutas de zonas (requiere autenticación)
app.use('/api/zones', verifyToken, zoneRoutes);
// Rutas de puertos (requiere autenticación)
app.use('/api/ports', verifyToken, portRoutes);
// Rutas de cotizaciones (requiere autenticación)
app.use('/api/quotes', verifyToken, quoteRoutes);
// Rutas de tarifas (requiere autenticación)
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

// Catálogo de proveedores de servicio (para Cuentas por Pagar - futuro)
app.use('/api/svc-providers', verifyToken, svcProviderRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Algo salió mal en el servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
