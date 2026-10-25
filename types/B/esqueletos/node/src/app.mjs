// Aplicación mínima: salud y un endpoint trivial. Sin base de datos ni clientes salientes (si algún día hay clientes salientes,
// cada uno lleva sus tres tiempos: conexión, lectura y total).
import { createServer } from 'node:http';
import { responderProblema } from './errores.mjs';

const MAX_NOMBRE = 50;
const CABECERAS = { 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' };

function responderJson(res, status, objeto) {
  res.writeHead(status, { 'content-type': 'application/json', ...CABECERAS });
  res.end(JSON.stringify(objeto));
}

export function crearApp(config) {
  return createServer((req, res) => {
    for (const [k, v] of Object.entries(CABECERAS)) res.setHeader(k, v);
    try {
      const url = new URL(req.url ?? '/', 'http://local');
      const lectura = req.method === 'GET' || req.method === 'HEAD';
      if (url.pathname === '/salud') {
        if (!lectura) return responderProblema(res, 405, 'Solo GET o HEAD.', { allow: 'GET, HEAD' });
        return responderJson(res, 200, { estado: 'ok', entorno: config.entorno });
      }
      if (url.pathname === '/api/saludo') {
        if (!lectura) return responderProblema(res, 405, 'Solo GET o HEAD.', { allow: 'GET, HEAD' });
        const nombre = url.searchParams.get('nombre') ?? 'mundo';
        if (nombre.trim() === '' || nombre.length > MAX_NOMBRE || /[\u0000-\u001f]/.test(nombre)) {
          return responderProblema(res, 400, `nombre debe tener de 1 a ${MAX_NOMBRE} caracteres, sin controles.`);
        }
        return responderJson(res, 200, { mensaje: `Hola, ${nombre}` });
      }
      return responderProblema(res, 404, 'No existe esa ruta.');
    } catch {
      if (!res.headersSent) responderProblema(res, 500, 'Ocurrió un error inesperado.');
    }
  });
}
