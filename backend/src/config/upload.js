import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio raíz de uploads (backend/uploads)
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Asegurar que existan los subdirectorios
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureDir(path.join(UPLOADS_DIR, 'backgrounds'));

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(UPLOADS_DIR, 'backgrounds');
        ensureDir(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        // Nombre: tipo-timestamp.ext  (ej: quote-1709056000.jpg)
        const ext = path.extname(file.originalname).toLowerCase();
        const prefix = file.fieldname === 'quoteBg'
            ? 'quote'
            : file.fieldname === 'deliveryNoteBg'
                ? 'delivery-note'
                : 'notice';
        cb(null, `${prefix}-${Date.now()}${ext}`);
    }
});

// Filtro: solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
    }
};

// Instancia de multer (máx 5MB por archivo)
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

export { UPLOADS_DIR };
export default upload;
