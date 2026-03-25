import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.webp': 'image/webp',
	'.map': 'application/json',
};

const serveFile = (filePath, res) => {
	const ext = extname(filePath);
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	const data = readFileSync(filePath);
	res.writeHead(200, { 'Content-Type': contentType });
	res.end(data);
};

createServer((req, res) => {
	try {
		// Quitar query strings
		const url = req.url.split('?')[0];
		const filePath = join(DIST, url === '/' ? 'index.html' : url);

		// Si el archivo existe y es un archivo (no directorio), servirlo
		if (existsSync(filePath) && statSync(filePath).isFile()) {
			serveFile(filePath, res);
		} else {
			// SPA fallback: devolver index.html para cualquier ruta
			serveFile(join(DIST, 'index.html'), res);
		}
	} catch (err) {
		// Fallback final al index.html
		try {
			serveFile(join(DIST, 'index.html'), res);
		} catch {
			res.writeHead(500);
			res.end('Internal Server Error');
		}
	}
}).listen(PORT, '0.0.0.0', () => {
	console.log(`✅ Frontend activo en http://0.0.0.0:${PORT}`);
});
