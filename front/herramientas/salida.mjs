// Destino de las herramientas de capturas, hoja y video: siempre design/refs/ del proyecto, que git ignora.
// Se rechaza cualquier subcarpeta que salga de ahí y se exige que .gitignore la cubra, para no versionar capturas por error.
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export class SalidaInvalida extends Error {}

const dentro = (raiz, ruta) => {
  const r = relative(raiz, ruta);
  return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
};

/** ¿Alguna línea del .gitignore cubre design/refs/? (formas habituales: /design/refs/, design/refs, /design/) */
export function refsIgnorada(proyecto) {
  const archivo = resolve(proyecto, '.gitignore');
  if (!existsSync(archivo)) return false;
  return readFileSync(archivo, 'utf8').split(/\r?\n/).map((l) => l.trim()).some((l) => ['/design/refs/', '/design/refs', 'design/refs/', 'design/refs', '/design/', 'design/'].includes(l));
}

/** Carpeta de salida dentro de design/refs/ (se crea al escribir, no aquí). */
export function resolverSalida(proyecto, sub = '', { exigirIgnorada = true } = {}) {
  const refs = resolve(proyecto, 'design', 'refs');
  if (isAbsolute(sub) || /^[a-zA-Z]:/.test(sub)) throw new SalidaInvalida(`la salida debe ser relativa a design/refs/: ${sub}`);
  const dir = resolve(refs, sub);
  if (!dentro(refs, dir)) throw new SalidaInvalida(`la salida sale de design/refs/: ${sub}`);
  if (exigirIgnorada && !refsIgnorada(proyecto)) throw new SalidaInvalida('design/refs/ no está en .gitignore: añádelo antes de generar capturas (lo no elegido no se versiona)');
  return dir;
}

/** `/en/index.html` → `en-index`; `/` → `inicio`. */
export function slugDeRuta(ruta) {
  const s = ruta.replace(/^\/+/, '').replace(/\.html?$/, '').replace(/\/+$/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'inicio';
}

export const nombreArchivo = (ruta, ancho, tema, ext) => `${slugDeRuta(ruta)}-${ancho}-${tema === 'dark' ? 'oscuro' : 'claro'}.${ext}`;
