// Escaneo de secretos de respaldo, sin dependencias: busca patrones de claves y tokens en el árbol de trabajo y en el
// historial. Es lo que corre el sello de pre-merge cuando no hay gitleaks (ADR 0007 y 0010). Usa la misma lista de
// patrones que guard-write (una sola fuente) y nunca imprime el valor encontrado.
// Uso: node .claude/hooks/escaneo-secretos.mjs [--sin-historial]   (sale con 1 si encuentra algo)
// Una línea con «escaneo-secretos:ignorar» se salta, y las rutas exactas listadas (una por línea) en
// `.escaneo-secretos-ignorar` se saltan enteras, también en el historial: para ejemplos y pruebas que contienen un
// patrón a propósito.
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SECRETOS, SENSIBLES, PLANTILLAS_ENV } from './guard-write.mjs';

const MARCA_IGNORAR = 'escaneo-secretos:ignorar';
const MAX_BYTES_ARCHIVO = 2 * 1024 * 1024;

const git = (args, cwd, { timeout = 60000 } = {}) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout, maxBuffer: 512 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
};

/** Rutas que el proyecto declara como ejemplos a propósito. */
export function rutasIgnoradas(projectDir) {
  const archivo = join(projectDir, '.escaneo-secretos-ignorar');
  if (!existsSync(archivo)) return new Set();
  return new Set(readFileSync(archivo, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
}

/** Qué patrón (si alguno) coincide con la línea. */
export function buscarEnLinea(linea) {
  if (linea.includes(MARCA_IGNORAR)) return null;
  for (const [re, que] of SECRETOS) if (re.test(linea)) return que;
  return null;
}

/** Archivos del árbol de trabajo: versionados y nuevos no ignorados. */
export function escanearArbol(projectDir) {
  const lista = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], projectDir);
  if (lista === null) return { ok: false, motivo: 'no pude listar los archivos con git', hallazgos: [], archivos: 0 };
  const hallazgos = [];
  const ignoradas = rutasIgnoradas(projectDir);
  let archivos = 0;
  for (const ruta of lista.split('\0').filter(Boolean)) {
    if (ignoradas.has(ruta.replaceAll('\\', '/'))) continue;
    if (SENSIBLES.test(ruta) && !PLANTILLAS_ENV.test(ruta)) hallazgos.push({ ruta, linea: 0, que: 'un archivo de secretos o claves' });
    let datos;
    try {
      const abs = join(projectDir, ruta);
      if (statSync(abs).size > MAX_BYTES_ARCHIVO) continue;
      datos = readFileSync(abs);
    } catch { continue; }
    if (datos.includes(0)) continue; // binario
    archivos += 1;
    datos.toString('utf8').split('\n').forEach((l, i) => {
      const que = buscarEnLinea(l);
      if (que) hallazgos.push({ ruta, linea: i + 1, que });
    });
  }
  return { ok: true, hallazgos, archivos };
}

/** Solo las líneas añadidas por cada commit de todas las ramas. */
export function escanearHistorial(projectDir) {
  const salida = git(['log', '--all', '-p', '-U0', '--no-color', '--no-ext-diff', '--format=commit %H'], projectDir, { timeout: 120000 });
  if (salida === null) return { ok: false, motivo: 'no pude leer el historial con git (error o tiempo agotado)', hallazgos: [], commits: 0 };
  const hallazgos = [];
  const ignoradas = rutasIgnoradas(projectDir);
  let commit = '';
  let ruta = '';
  let commits = 0;
  for (const l of salida.split('\n')) {
    if (l.startsWith('commit ')) { commit = l.slice(7, 17); ruta = ''; commits += 1; }
    else if (l.startsWith('+++ ')) {
      ruta = l.replace(/^\+\+\+ (b\/)?/, '');
      if (ruta !== '/dev/null' && !ignoradas.has(ruta) && SENSIBLES.test(ruta) && !PLANTILLAS_ENV.test(ruta)) hallazgos.push({ commit, ruta, que: 'un archivo de secretos o claves' });
    }
    else if (l.startsWith('+')) {
      if (ignoradas.has(ruta)) continue;
      const que = buscarEnLinea(l.slice(1));
      if (que) hallazgos.push({ commit, ruta, que });
    }
  }
  return { ok: true, hallazgos, commits };
}

export function escanear(projectDir, { historial = true, leerHistorial = escanearHistorial } = {}) {
  const arbol = escanearArbol(projectDir);
  if (!arbol.ok) return { ok: false, motivo: arbol.motivo, hallazgos: [] };
  const hist = historial ? leerHistorial(projectDir) : { ok: true, hallazgos: [], commits: 0 };
  if (!hist.ok) return { ok: false, motivo: hist.motivo, hallazgos: [] };
  const hallazgos = [
    ...arbol.hallazgos.map((h) => `${h.ruta}${h.linea ? `:${h.linea}` : ''} — ${h.que}`),
    ...hist.hallazgos.map((h) => `historial ${h.commit} ${h.ruta} — ${h.que}`),
  ];
  return { ok: hallazgos.length === 0, hallazgos, archivos: arbol.archivos, commits: hist.commits };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const r = escanear(projectDir, { historial: !process.argv.includes('--sin-historial') });
  if (r.motivo) { process.stderr.write(`escaneo-secretos: ${r.motivo}\n`); process.exit(1); }
  if (r.ok) process.stdout.write(`escaneo-secretos: limpio (${r.archivos} archivos, ${r.commits} commits)\n`);
  else process.stdout.write(`escaneo-secretos: ${r.hallazgos.length} hallazgo(s) (los valores no se muestran)\n- ${r.hallazgos.join('\n- ')}\n`);
  process.exit(r.ok ? 0 : 1);
}
