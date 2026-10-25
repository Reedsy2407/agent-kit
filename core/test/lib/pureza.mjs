// Utilidades comunes de las pruebas de pureza: lo versionado no contiene nombres de proyectos, empleadores ni clientes ajenos.
// Dos mecanismos, ninguno deja un nombre en claro en el repositorio:
//  - core/test/datos-privados.json ({"terminos": [...]}, ignorado por git): la lista local; sin ella las pruebas AVISAN en voz alta.
//  - HUELLAS_VETADAS: SHA-256 opcionales de palabras que deben faltar en core/ y design/ (vacío en la copia pública).
// Una huella de una palabra corta se adivina probando palabras; es una barrera contra el descuido, no contra quien la busca.
// Nunca se imprime un término: solo archivo y línea.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DATOS = join(RAIZ, 'core', 'test', 'datos-privados.json');
export const TEXTO = /\.(md|json|mjs|txt|tpl|jsonc|css|html|plantilla|ya?ml|java|cs|csproj|sln|py|xml|toml|ejemplo)$|(^|\/)Dockerfile$/i;

// Opcional: SHA-256 de palabras que no deben aparecer en core/ ni design/. Vacío en la copia pública; la lista de cada persona va en datos-privados.json.
export const HUELLAS_VETADAS = new Set();

export const huella = (palabra) => createHash('sha256').update(palabra.normalize('NFC').toLowerCase()).digest('hex');

/** Líneas (1-based) con alguna palabra completa cuya huella está vetada. No devuelve la palabra. */
export function lineasConHuella(texto, huellas = HUELLAS_VETADAS) {
  const lineas = [];
  texto.split(/\r?\n/).forEach((l, i) => {
    for (const m of l.matchAll(/[\p{L}\p{N}_]+/gu)) if (huellas.has(huella(m[0]))) { lineas.push(i + 1); break; }
  });
  return lineas;
}

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Un RegExp por término: palabra completa (sin letras, cifras ni «_» pegadas), sin distinguir mayúsculas. */
export function compilar(terminos) {
  return terminos.map((t) => String(t).trim()).filter(Boolean).map((t) => new RegExp(`(?<![\\p{L}\\p{N}_])${escapar(t).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}_])`, 'iu'));
}

/** Líneas (1-based) donde coincide algún término. No devuelve el término. */
export function lineasConCoincidencia(texto, regexps) {
  const lineas = [];
  texto.split(/\r?\n/).forEach((l, i) => { if (regexps.some((r) => r.test(l))) lineas.push(i + 1); });
  return lineas;
}

export const git = (args) => {
  try { return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};

/** Lo que se versiona o se versionaría (rastreado o nuevo y no ignorado), con rutas con «/». null si no hay git. */
export function versionado() {
  const salida = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
  if (salida === null) return null;
  return salida.split('\0').filter(Boolean);
}

/** Lee la lista privada: { estado: 'falta' | 'vacia' | 'ok', regexps }. Falla si el archivo existe pero no tiene la forma esperada. */
export function leerListaPrivada() {
  if (!existsSync(DATOS)) return { estado: 'falta', regexps: [] };
  let lista;
  try { lista = JSON.parse(readFileSync(DATOS, 'utf8')).terminos; } catch { throw new Error('core/test/datos-privados.json no es JSON válido ({"terminos": [...]})'); }
  if (!Array.isArray(lista)) throw new Error('core/test/datos-privados.json debe ser {"terminos": [...]}');
  const regexps = compilar(lista);
  return { estado: regexps.length ? 'ok' : 'vacia', regexps };
}

export const avisar = (t, mensaje) => {
  process.stderr.write(`\n!!! PUREZA SIN COMPROBAR: ${mensaje}\n\n`);
  t.diagnostic(`PUREZA SIN COMPROBAR: ${mensaje}`);
};
