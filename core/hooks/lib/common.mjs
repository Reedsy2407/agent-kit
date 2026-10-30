// Utilidades comunes de los hooks. Node ESM sin dependencias (ADR 0001).
// Convención de los hooks: exportan `evaluar(input, ctx)` que devuelve un texto (el motivo del bloqueo)
// o null para dejar pasar; `run` lee el JSON de stdin, llama a `evaluar` y traduce a código de salida.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { tmpdir } from 'node:os';

export const CONFIG_POR_DEFECTO = Object.freeze({
  baseBranch: 'main',
  maxBranchCommits: 10,
  modules: [],
  checks: [],
  timeoutRequired: [
    'mvn', 'mvnd', 'mvnw', './mvnw', 'gradle', './gradlew', 'gradlew', 'pytest', 'lighthouse',
    'dotnet test', 'dotnet build', 'dotnet restore', 'dotnet publish', 'dotnet run',
    'python -m pytest', 'python3 -m pytest', 'py -m pytest', 'pip install', 'python -m pip install', 'python3 -m pip install',
    'npm test', 'npm run build', 'npm run test', 'npm run lint', 'npm ci', 'npm install',
    'npx playwright', 'ng build', 'ng test', 'ng lint',
    'go vet', 'go test', 'go build', 'govulncheck', 'cargo fmt', 'cargo clippy', 'cargo test', 'cargo build', 'cargo audit',
    'ruff check', 'ruff format', 'python -m unittest', 'pip-audit',
    'docker build', 'docker compose build', 'docker compose up',
    'node scripts/salud.mjs', 'node scripts/sondeo-acceso.mjs',
    'node tests/front/run.mjs', 'node tests/front/herramientas/capturas.mjs', 'node tests/front/herramientas/video.mjs',
  ],
  escrituraExtra: [],
  gitleaks: true,
  front: null,
});

export function leerEntrada() {
  const texto = readFileSync(0, 'utf8');
  return texto.trim() ? JSON.parse(texto) : {};
}

export function cargarConfig(projectDir) {
  const archivo = join(projectDir, '.claude', 'kit.json');
  if (!existsSync(archivo)) return { ...CONFIG_POR_DEFECTO };
  return { ...CONFIG_POR_DEFECTO, ...JSON.parse(readFileSync(archivo, 'utf8')) };
}

export function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Punto de entrada de un hook: 2 = bloquea (el stderr llega a Claude), 1 = error interno que no bloquea. */
export function run(evaluar, { failClosed = false } = {}) {
  let motivo = null;
  try {
    const input = leerEntrada();
    const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
    const ctx = { projectDir, config: cargarConfig(projectDir), git: (a) => git(a, input.cwd || projectDir) };
    motivo = evaluar(input, ctx);
  } catch (e) {
    process.stderr.write(`hook: error interno (${e.message})\n`);
    process.exit(failClosed ? 2 : 1);
  }
  if (motivo) {
    process.stderr.write(`BLOQUEADO: ${motivo}\n`);
    process.exit(2);
  }
  process.exit(0);
}

/** Sustituye el contenido de las cadenas entre comillas por espacios, para no leer texto de mensajes como comandos. */
export function enmascarar(cmd) {
  let salida = '';
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) {
      if (c === '\\' && q === '"') { salida += '  '; i++; continue; }
      if (c === q) { q = null; salida += c; continue; }
      salida += c === '\n' ? '\n' : ' ';
    } else if (c === '"' || c === "'") {
      q = c; salida += c;
    } else salida += c;
  }
  return salida;
}

/** Quita los cuerpos de heredoc (entre `<<PALABRA` y la línea PALABRA) conservando el operador. */
export function sinCuerposHeredoc(cmd) {
  const lineas = cmd.split('\n');
  const fuera = [];
  let fin = null;
  for (const l of lineas) {
    if (fin) { if (l.trim() === fin) fin = null; continue; }
    fuera.push(l);
    const m = l.match(/<<-?\s*['"]?([A-Za-z_][\w]*)['"]?/);
    if (m) fin = m[1];
  }
  return fuera.join('\n');
}

/** Divide un comando compuesto en segmentos (&&, ||, ;, |, saltos de línea) sobre texto ya enmascarado. */
export function segmentos(cmdEnmascarado) {
  return cmdEnmascarado
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '').replace(/^\(+|\)+$/g, '').trim());
}

/** Prepara un comando para analizarlo: sin cuerpos de heredoc, comillas enmascaradas. */
export function analizar(cmd) {
  const enmascarado = enmascarar(sinCuerposHeredoc(cmd));
  return { enmascarado, segs: segmentos(enmascarado) };
}

export function primeraPalabra(seg) {
  return (seg.split(/\s+/)[0] || '').replace(/^.*[\\/]/, '').replace(/\.(exe|cmd|bat)$/i, '');
}

/** Convierte rutas estilo Git Bash (/c/Users/x, /tmp) a rutas nativas. */
export function aNativa(p) {
  const m = p.match(/^\/([a-zA-Z])(?:\/(.*))?$/);
  if (m && process.platform === 'win32') return `${m[1].toUpperCase()}:\\${(m[2] || '').replace(/\//g, '\\')}`;
  if (/^\/tmp(\/|$)/.test(p)) return join(tmpdir(), p.slice(5));
  return p;
}

const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

export function estaDentro(ruta, dir) {
  const rel = relative(norm(resolve(dir)), norm(resolve(ruta)));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function partes(ruta) {
  return ruta.split(/[\\/]+/).filter(Boolean);
}

export { sep };
