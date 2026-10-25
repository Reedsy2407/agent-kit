// Servidor estático mínimo en proceso para probar una carpeta sin depender del framework. Aplica las cabeceras del
// archivo `_headers` de la carpeta (formato de los activos estáticos: rutas sin sangría, cabeceras con sangría, un
// solo «*» por ruta) y responde 404 con `404.html` si existe.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json', '.webm': 'video/webm', '.mp4': 'video/mp4',
};

/** Lee un `_headers`: bloques con una ruta y cabeceras con sangría. Las líneas con «#» se ignoran. */
export function parseHeaders(texto) {
  const reglas = [];
  let actual = null;
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (/^\s/.test(linea)) {
      const i = linea.indexOf(':');
      if (actual && i > 0) actual.cabeceras.push([linea.slice(0, i).trim(), linea.slice(i + 1).trim()]);
    } else {
      actual = { ruta: linea.trim(), cabeceras: [] };
      reglas.push(actual);
    }
  }
  return reglas;
}

/** Puertos que Chrome se niega a abrir (ERR_UNSAFE_PORT); un puerto aleatorio que cayera aquí hacía fallar las pruebas al azar. */
export const PUERTOS_NO_SEGUROS = new Set([1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080]);

export const rutaCoincide = (patron, ruta) => new RegExp(`^${patron.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(ruta);

/**
 * Hace escuchar a un servidor en un puerto libre de 127.0.0.1 elegido por el sistema; si cae en uno que Chrome y fetch
 * bloquean (ERR_UNSAFE_PORT, «bad port»), pide otro. Devuelve el puerto. También lo usan los servidores de las pruebas.
 */
export function escucharSeguro(servidor, intentos = 0) {
  return new Promise((ok, fallo) => {
    servidor.once('error', fallo);
    servidor.listen(0, '127.0.0.1', () => {
      servidor.off('error', fallo);
      const { port } = servidor.address();
      if (PUERTOS_NO_SEGUROS.has(port) && intentos < 50) servidor.close(() => escucharSeguro(servidor, intentos + 1).then(ok, fallo));
      else ok(port);
    });
  });
}

/** Sirve `carpeta` en un puerto libre de 127.0.0.1. `cabeceras`: true usa `<carpeta>/_headers` si existe; o el texto de un `_headers`. */
export function iniciarServidor({ carpeta, cabeceras = true } = {}) {
  const raiz = resolve(carpeta);
  let textoCabeceras = null;
  if (typeof cabeceras === 'string') textoCabeceras = cabeceras;
  else if (cabeceras && existsSync(join(raiz, '_headers'))) textoCabeceras = readFileSync(join(raiz, '_headers'), 'utf8');
  const reglas = textoCabeceras ? parseHeaders(textoCabeceras) : [];
  const extra = (ruta) => {
    const h = {};
    for (const r of reglas) if (rutaCoincide(r.ruta, ruta)) for (const [k, v] of r.cabeceras) h[k] = h[k] ? `${h[k]}, ${v}` : v;
    return h;
  };
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch { rel = '/__mal__'; }
    const pedida = rel;
    if (rel.endsWith('/')) rel += 'index.html';
    const archivo = normalize(join(raiz, rel));
    try {
      if (!archivo.startsWith(raiz + sep) || !(await stat(archivo)).isFile()) throw new Error('no');
      const cuerpo = await readFile(archivo);
      res.writeHead(200, { 'content-type': MIME[extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'content-length': cuerpo.length, ...extra(pedida) });
      res.end(req.method === 'HEAD' ? undefined : cuerpo);
    } catch {
      const f404 = join(raiz, '404.html');
      const cuerpo = existsSync(f404) ? await readFile(f404) : Buffer.from('404');
      res.writeHead(404, { 'content-type': MIME['.html'], ...extra(pedida) });
      res.end(req.method === 'HEAD' ? undefined : cuerpo);
    }
  });
  return escucharSeguro(servidor).then((port) => ({
    base: `http://127.0.0.1:${port}`,
    cerrar: () => new Promise((r) => { servidor.closeAllConnections?.(); servidor.close(r); }),
  }));
}
