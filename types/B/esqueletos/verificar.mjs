// Verificación MANUAL de un esqueleto (necesita red y las herramientas del stack; NO forma parte de npm test, ADR 0016).
// Instala el esqueleto con el instalador en una carpeta temporal FUERA del repositorio y comprueba, en orden:
//   1. sello: el comando del preset (pruebas incluidas) termina bien;
//   2. sin la variable obligatoria el servicio NO arranca;
//   3. arranca, responde a /salud (con scripts/salud.mjs del kit, contra el puerto local) y a su endpoint;
//   4. se detiene limpio (por el identificador del proceso lanzado, nunca por nombre);
//   5. contenedor (si hay docker): construye la imagen, arranca, responde a /salud y se detiene con SIGTERM (salida 0 o 143, nunca 137).
// Uso: node types/B/esqueletos/verificar.mjs <java-spring|dotnet|node|python> [--sin-contenedor] [--solo-contenedor] [--conservar]
// Salida: líneas «OK», «FALLO» u «OMITIDO» por paso; código 0 si no hubo ningún FALLO. Sin credenciales ni cuentas: solo
// descarga dependencias de los registros públicos del stack y las imágenes base. No ejecuta nada en el CI ni despliega.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planificar, aplicar } from '../../../install/install.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const ES_WIN = process.platform === 'win32';
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

export const resultados = [];
const anotar = (estado, paso, detalle = '') => { resultados.push({ estado, paso, detalle }); console.log(`${estado.padEnd(8)} ${paso}${detalle ? ` — ${detalle}` : ''}`); };

/** Ejecuta un comando (cadena con shell o lista sin shell) con tiempo máximo y sin leer stdin. */
function ejecutar(cmd, { cwd, env, timeoutMs = 900000 } = {}) {
  const r = Array.isArray(cmd)
    ? spawnSync(cmd[0], cmd.slice(1), { cwd, env, timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    : spawnSync(cmd, { cwd, env, timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true, maxBuffer: 64 * 1024 * 1024 });
  return { codigo: r.status ?? (r.error ? -1 : 1), salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
const cola = (texto, n = 25) => texto.trimEnd().split('\n').slice(-n).join('\n');

async function esperarSalud(url, ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), 2000); // con referencia: AbortSignal.timeout no mantiene vivo el proceso
    try { const r = await fetch(url, { signal: corte.signal }); if (r.ok) return true; } catch { /* aún no escucha */ } finally { clearTimeout(reloj); }
    await dormir(500);
  }
  return false;
}

function detenerPid(pid) {
  if (ES_WIN) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 20000 });
  else try { process.kill(pid, 'SIGTERM'); } catch { /* ya terminó */ }
}

/** Instala el esqueleto con el instalador en una carpeta temporal y devuelve su ruta. */
export function prepararProyecto(esq, base) {
  const proyecto = join(base, 'proyecto');
  mkdirSync(proyecto);
  const ficha = JSON.parse(readFileSync(join(RAIZ, 'types', 'B', 'ficha-infra.json'), 'utf8'));
  ficha.kit.preset = esq.preset;
  ficha.ops.salud.permitida = true;
  const fichaRuta = join(base, 'ficha.json');
  writeFileSync(fichaRuta, JSON.stringify(ficha));
  aplicar(planificar({ destino: proyecto, tipo: 'B', proyecto: 'verificacion', fichaRuta, respaldo: join(base, 'respaldo') }));
  return proyecto;
}

function comprobarSalud(proyecto, url, config = 'ops/salud.config.esqueleto.json') {
  return ejecutar(['node', 'scripts/salud.mjs', url, '--config', config], { cwd: proyecto, timeoutMs: 120000 });
}

async function verificarLocal(esq, proyecto, base) {
  const v = esq.verificacion;
  const env = { ...process.env, ...v.env, PORT: String(v.puerto) };
  let python = 'python';
  if (v.venv) {
    const venv = join(base, 'venv');
    const r = ejecutar(['python', '-m', 'venv', venv], { cwd: proyecto, timeoutMs: 300000 });
    if (r.codigo !== 0) return anotar('FALLO', 'entorno virtual', cola(r.salida));
    const bin = join(venv, ES_WIN ? 'Scripts' : 'bin');
    python = join(bin, ES_WIN ? 'python.exe' : 'python');
    env.PATH = `${bin}${delimiter}${env.PATH ?? env.Path ?? ''}`;
    if (ES_WIN) env.Path = env.PATH;
    env.VIRTUAL_ENV = venv;
  }
  for (const c of v.preparar ?? []) {
    const r = ejecutar(c, { cwd: proyecto, env });
    if (r.codigo !== 0) return anotar('FALLO', `preparar: ${c}`, cola(r.salida));
    anotar('OK', `preparar: ${c}`);
  }
  const sello = ejecutar(v.sello, { cwd: proyecto, env });
  if (sello.codigo !== 0) return anotar('FALLO', `sello (preset ${esq.preset}): ${v.sello}`, cola(sello.salida));
  anotar('OK', `sello (preset ${esq.preset}): ${v.sello}`);

  const cmd = v.arrancar.map((t) => (t === '{python}' ? python : t));
  const sinVar = { ...env }; delete sinVar.APP_ENTORNO;
  const rv = spawnSync(cmd[0], cmd.slice(1), { cwd: proyecto, env: sinVar, timeout: 120000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (rv.status !== null && rv.status !== 0) anotar('OK', 'sin APP_ENTORNO el servicio no arranca', `salida ${rv.status}`);
  else anotar('FALLO', 'sin APP_ENTORNO el servicio no arranca', rv.status === 0 ? 'terminó con 0' : 'siguió vivo o falló al lanzar');

  const hijo = spawn(cmd[0], cmd.slice(1), { cwd: proyecto, env, stdio: 'ignore', windowsHide: true });
  const pid = hijo.pid;
  let terminado = false;
  hijo.on('exit', () => { terminado = true; });
  try {
    const url = `http://127.0.0.1:${v.puerto}`;
    if (!(await esperarSalud(`${url}/salud`, 120000))) return anotar('FALLO', 'arranca y responde a /salud', terminado ? 'el proceso terminó antes' : 'sin respuesta en 120 s');
    anotar('OK', 'arranca y responde a /salud', `pid ${pid}, ${url}`);
    const s = comprobarSalud(proyecto, url);
    s.codigo === 0 ? anotar('OK', 'scripts/salud.mjs contra el puerto local') : anotar('FALLO', 'scripts/salud.mjs contra el puerto local', cola(s.salida));
    const r = await fetch(`${url}/api/saludo?nombre=Ana`);
    const c = await r.json().catch(() => ({}));
    r.status === 200 && /Ana/.test(JSON.stringify(c)) ? anotar('OK', 'endpoint trivial /api/saludo') : anotar('FALLO', 'endpoint trivial /api/saludo', `estado ${r.status}`);
    const e = await fetch(`${url}/api/saludo?nombre=${'x'.repeat(80)}`);
    /problem\+json/.test(e.headers.get('content-type') ?? '') && e.status === 400 ? anotar('OK', 'error con formato uniforme (problema HTTP, 400)') : anotar('FALLO', 'error con formato uniforme', `estado ${e.status}, ${e.headers.get('content-type')}`);
  } finally {
    detenerPid(pid);
    for (let i = 0; i < 40 && !terminado; i++) await dormir(250);
    terminado ? anotar('OK', 'se detiene (por identificador de proceso)', `pid ${pid}`) : anotar('FALLO', 'se detiene (por identificador de proceso)', `pid ${pid} sigue vivo`);
  }
}

async function verificarContenedor(esq, proyecto) {
  const v = esq.verificacion;
  const etiqueta = `kit-esqueleto-${esq.stack}:verif`;
  const b = ejecutar(['docker', 'build', '-t', etiqueta, '.'], { cwd: proyecto, timeoutMs: 1800000 });
  if (b.codigo !== 0) return anotar('FALLO', 'docker build (incluye las pruebas de la imagen)', cola(b.salida));
  anotar('OK', 'docker build (incluye las pruebas de la imagen)');
  let id = null;
  try {
    const sin = ejecutar(['docker', 'run', '--rm', etiqueta], { timeoutMs: 120000 });
    sin.codigo !== 0 ? anotar('OK', 'contenedor sin APP_ENTORNO no arranca', `salida ${sin.codigo}`) : anotar('FALLO', 'contenedor sin APP_ENTORNO no arranca', 'terminó con 0');
    const puerto = v.puerto + 1000;
    const run = ejecutar(['docker', 'run', '-d', '-e', 'APP_ENTORNO=produccion', '-p', `127.0.0.1:${puerto}:${v.imagen.puertoInterno}`, etiqueta]);
    if (run.codigo !== 0) return anotar('FALLO', 'contenedor arranca', cola(run.salida));
    id = run.salida.trim().split('\n').pop();
    const url = `http://127.0.0.1:${puerto}`;
    if (!(await esperarSalud(`${url}/salud`, 120000))) return anotar('FALLO', 'contenedor responde a /salud', cola(ejecutar(['docker', 'logs', '--tail', '20', id]).salida));
    anotar('OK', 'contenedor responde a /salud', url);
    const s = comprobarSalud(proyecto, url);
    s.codigo === 0 ? anotar('OK', 'scripts/salud.mjs contra el contenedor') : anotar('FALLO', 'scripts/salud.mjs contra el contenedor', cola(s.salida));
    const t0 = Date.now();
    ejecutar(['docker', 'stop', '-t', '20', id], { timeoutMs: 60000 });
    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    const salida = ejecutar(['docker', 'inspect', '-f', '{{.State.ExitCode}}', id]).salida.trim();
    /* Salida 0, o 143 (128+15: la JVM termina así tras atender SIGTERM). 137 sería SIGKILL: no se detuvo limpio. */
    ['0', '143'].includes(salida) && Date.now() - t0 < 19000 ? anotar('OK', 'contenedor se detiene limpio con SIGTERM', `salida ${salida} en ${seg} s`) : anotar('FALLO', 'contenedor se detiene limpio con SIGTERM', `salida ${salida} en ${seg} s`);
  } finally {
    if (id) ejecutar(['docker', 'rm', '-f', id], { timeoutMs: 60000 });
    ejecutar(['docker', 'rmi', etiqueta], { timeoutMs: 60000 });
  }
}

export async function main(args) {
  const stack = args.find((a) => !a.startsWith('--'));
  const dirs = readdirSync(AQUI, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(AQUI, d.name, 'esqueleto.json'))).map((d) => d.name);
  if (!stack || !dirs.includes(stack)) { console.error(`Uso: node types/B/esqueletos/verificar.mjs <${dirs.join('|')}> [--sin-contenedor] [--solo-contenedor] [--conservar]`); return 2; }
  const esq = JSON.parse(readFileSync(join(AQUI, stack, 'esqueleto.json'), 'utf8'));
  const base = mkdtempSync(join(tmpdir(), 'kit-esqueleto-'));
  console.log(`Esqueleto ${stack} (preset ${esq.preset}) en ${base}`);
  try {
    const proyecto = prepararProyecto(esq, base);
    anotar('OK', 'el instalador copia el esqueleto');
    if (!args.includes('--solo-contenedor')) {
      if (esq.verificacion.soloContenedor) anotar('OMITIDO', 'verificación local', esq.verificacion.soloContenedor);
      else await verificarLocal(esq, proyecto, base);
    }
    if (args.includes('--sin-contenedor')) anotar('OMITIDO', 'contenedor', 'pedido con --sin-contenedor');
    else if (ejecutar(['docker', 'version', '--format', '{{.Server.Version}}'], { timeoutMs: 30000 }).codigo !== 0) anotar('OMITIDO', 'contenedor', 'no hay docker disponible');
    else await verificarContenedor(esq, proyecto);
  } finally {
    if (!args.includes('--conservar')) rmSync(base, { recursive: true, force: true });
  }
  const fallos = resultados.filter((r) => r.estado === 'FALLO').length;
  console.log(fallos ? `\n${fallos} paso(s) con FALLO.` : '\nTodos los pasos ejecutados pasaron (los OMITIDO no se verificaron).');
  return fallos ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
