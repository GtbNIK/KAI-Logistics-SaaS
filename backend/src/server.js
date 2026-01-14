import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import clientRoutes from './routes/client.routes.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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
// Rutas de clientes
app.use('/api/clients', clientRoutes); // Montar clientRoutes

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
