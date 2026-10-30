// Verificación MANUAL de un esqueleto del tipo C (necesita las herramientas del stack; NO forma parte de node --test, ADR 0019).
// Instala el esqueleto con el instalador en una carpeta temporal FUERA del repositorio y comprueba, en orden:
//   1. versiones de las herramientas usadas (para el registro);
//   2. sello: los comandos del preset (pruebas incluidas) terminan bien;
//   3. extras del stack (formato, auditoría); los marcados «opcional» se omiten diciéndolo si falta la herramienta;
//   4. construcción del binario (si el stack compila);
//   5. contrato del CLI (CONTRATO.md): version, check-config, run --once, entrada demasiado grande, códigos de salida;
//   6. daemon: arranca, hace vueltas, recibe SIGTERM y sale con 0 tras imprimir su resumen (solo POSIX: Node no envía SIGTERM en Windows).
// Uso: node types/C/esqueletos/verificar.mjs <go|python|rust>
// Salida: líneas «OK», «FALLO» u «OMITIDO» por paso; código 0 si no hubo ningún FALLO. No usa credenciales; puede descargar
// dependencias de desarrollo de los registros públicos del stack (solo las herramientas del sello). No despliega ni publica.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planificar, aplicar } from '../../../install/install.mjs';
import { PRESETS_C } from '../../../infra/presets.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const ES_WIN = process.platform === 'win32';
const EXE = ES_WIN ? '.exe' : '';
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

export const resultados = [];
const anotar = (estado, paso, detalle = '') => { resultados.push({ estado, paso, detalle }); console.log(`${estado.padEnd(8)} ${paso}${detalle ? ` — ${detalle}` : ''}`); };
const cola = (texto, n = 25) => texto.trimEnd().split('\n').slice(-n).join('\n');

/** Ejecuta un comando (lista sin shell, o cadena con shell) con tiempo máximo y sin leer stdin. */
function ejecutar(cmd, { cwd, env, timeoutMs = 900000 } = {}) {
  const opciones = { cwd, env, timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 };
  const r = Array.isArray(cmd) ? spawnSync(cmd[0], cmd.slice(1), opciones) : spawnSync(cmd, { ...opciones, shell: true });
  return { codigo: r.status ?? (r.error ? -1 : 1), stdout: r.stdout ?? '', stderr: r.stderr ?? '', salida: `${r.stdout ?? ''}${r.stderr ?? ''}`, ausente: r.error?.code === 'ENOENT' };
}

/** Instala el esqueleto con el instalador en una carpeta temporal y devuelve su ruta. */
export function prepararProyecto(esq, base) {
  const proyecto = join(base, 'proyecto');
  mkdirSync(proyecto);
  const ficha = JSON.parse(readFileSync(join(RAIZ, 'types', 'C', 'ficha-infra.json'), 'utf8'));
  ficha.kit.preset = esq.preset;
  const fichaRuta = join(base, 'ficha.json');
  writeFileSync(fichaRuta, JSON.stringify(ficha));
  aplicar(planificar({ destino: proyecto, tipo: 'C', proyecto: 'verificacion', fichaRuta, respaldo: join(base, 'respaldo') }));
  return proyecto;
}

const con = (lista, reemplazos) => lista.map((t) => t.replaceAll('{exe}', EXE).replaceAll('{python}', reemplazos.python ?? 'python'));

async function contrato(proyecto, base, ejecutarCmd) {
  const dir = join(base, 'datos');
  mkdirSync(dir);
  const escribir = (n, t) => { const r = join(dir, n); writeFileSync(r, t, { mode: 0o600 }); return r; };
  const datos = escribir('entrada.txt', 'a\nb\nc');
  const buena = escribir('buena.conf', 'nombre=demo\nintervalo_ms=20\n');
  const mala = escribir('mala.conf', 'nombre=Mal\n');
  const conEntrada = escribir('entrada.conf', `nombre=demo\nentrada=${datos.replaceAll('\\', '/')}\n`);
  const grande = escribir('grande.conf', `nombre=demo\nmax_entrada_bytes=2\nentrada=${datos.replaceAll('\\', '/')}\n`);
  const ausente = escribir('ausente.conf', `nombre=demo\nentrada=${join(dir, 'no-existe').replaceAll('\\', '/')}\n`);
  const secreta = escribir('secreta.conf', 'nombre=demo\ntoken=valor-secreto-1\n');
  const casos = [
    ['version', ['version'], 0, (r) => /^herramienta \d+\.\d+\.\d+/.test(r.stdout)],
    ['version --json', ['version', '--json'], 0, (r) => JSON.parse(r.stdout).nombre === 'herramienta'],
    ['sin subcomando', [], 2, (r) => r.stdout === '' && /subcomando/.test(r.stderr)],
    ['subcomando desconocido', ['baila'], 2, (r) => r.stdout === ''],
    ['check-config válida', ['check-config', '--config', buena], 0, (r) => /configuracion valida/.test(r.stdout)],
    ['check-config json: token ausente', ['check-config', '--config', buena, '--json'], 0, (r) => JSON.parse(r.stdout).config.token === 'ausente'],
    ['check-config oculta el token', ['check-config', '--config', secreta], 0, (r) => /token=<definido>/.test(r.stdout) && !/valor-secreto-1/.test(r.salida)],
    ['check-config inválida', ['check-config', '--config', mala], 3, (r) => r.stdout === '' && /configuraci/.test(r.stderr)],
    ['run --once', ['run', '--config', buena, '--once'], 0, (r) => /ticks=1 errores=0/.test(r.stdout) && /"msg":"inicio"/.test(r.stderr)],
    ['run --once --json', ['run', '--config', conEntrada, '--once', '--json'], 0, (r) => JSON.parse(r.stdout).bytes === 5],
    ['run --once entrada demasiado grande', ['run', '--config', grande, '--once'], 4, (r) => /demasiad/i.test(r.stderr)],
    ['run --once con una entrada que no se abre es error inesperado', ['run', '--config', ausente, '--once'], 1, (r) => /error de entrada/.test(r.stderr)],
    ['run sin --config', ['run', '--once'], 2, () => true],
  ];
  const [bin, ...resto] = ejecutarCmd;
  for (const [nombre, args, esperado, extra] of casos) {
    const r = ejecutar([bin, ...resto, ...args], { cwd: proyecto, timeoutMs: 60000 });
    let ok = false;
    try { ok = r.codigo === esperado && extra(r); } catch { ok = false; }
    ok ? anotar('OK', `contrato: ${nombre}`, `salida ${r.codigo}`) : anotar('FALLO', `contrato: ${nombre}`, `salida ${r.codigo}, esperaba ${esperado}\n${cola(r.salida, 6)}`);
  }
  return buena;
}

async function daemon(proyecto, ejecutarCmd, config) {
  if (ES_WIN) return anotar('OMITIDO', 'daemon: apagado por SIGTERM de punta a punta', 'Node no envía SIGTERM en Windows; el apagado ordenado sí se prueba dentro de las pruebas del esqueleto');
  const [bin, ...resto] = ejecutarCmd;
  const hijo = spawn(bin, [...resto, 'run', '--config', config], { cwd: proyecto, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; let err = ''; let salida = null;
  hijo.stdout.on('data', (d) => { out += d; }); hijo.stderr.on('data', (d) => { err += d; });
  hijo.on('exit', (c, s) => { salida = { c, s }; });
  const fin = Date.now() + 20000;
  while (Date.now() < fin && !/"msg":"tick"/.test(err) && !/"msg":"inicio"/.test(err)) await dormir(100);
  await dormir(300);
  if (salida) return anotar('FALLO', 'daemon arranca y sigue vivo', `terminó con ${salida.c}: ${cola(err, 5)}`);
  anotar('OK', 'daemon arranca y registra `inicio`', `pid ${hijo.pid}`);
  hijo.kill('SIGTERM');
  const limite = Date.now() + 15000;
  while (!salida && Date.now() < limite) await dormir(100);
  if (!salida) { hijo.kill('SIGKILL'); return anotar('FALLO', 'daemon se detiene con SIGTERM', 'sigue vivo tras 15 s'); }
  const bien = salida.c === 0 && /ticks=\d+ errores=\d+/.test(out) && /"msg":"apagado"/.test(err) && /"msg":"fin"/.test(err);
  bien ? anotar('OK', 'daemon se detiene con SIGTERM: sale con 0, registra apagado y fin, imprime el resumen') : anotar('FALLO', 'daemon se detiene con SIGTERM', `salida ${salida.c}/${salida.s}; stdout ${JSON.stringify(out)}; ${cola(err, 4)}`);
}

export async function main(args) {
  const stack = args.find((a) => !a.startsWith('--'));
  const dirs = readdirSync(AQUI, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(AQUI, d.name, 'esqueleto.json'))).map((d) => d.name);
  if (!stack || !dirs.includes(stack)) { console.error(`Uso: node types/C/esqueletos/verificar.mjs <${dirs.join('|')}>`); return 2; }
  const esq = JSON.parse(readFileSync(join(AQUI, stack, 'esqueleto.json'), 'utf8'));
  const v = esq.verificacion;
  const preset = PRESETS_C[esq.preset];
  const base = mkdtempSync(join(tmpdir(), 'kit-esqueleto-c-'));
  console.log(`Esqueleto ${stack} (preset ${esq.preset}) en ${base} — ${new Date().toISOString().slice(0, 10)}, ${process.platform}`);
  try {
    const proyecto = prepararProyecto(esq, base);
    anotar('OK', 'el instalador copia el esqueleto');
    for (const h of v.herramientas ?? []) {
      const r = ejecutar(h, { cwd: proyecto, timeoutMs: 60000 });
      r.codigo === 0 ? anotar('OK', `herramienta ${h[0]}`, r.salida.trim().split('\n')[0]) : anotar(r.ausente ? 'OMITIDO' : 'FALLO', `herramienta ${h[0]}`, r.ausente ? 'no está instalada' : cola(r.salida, 3));
    }
    for (const c of preset.comandos) {
      let r = ejecutar(c, { cwd: proyecto, timeoutMs: preset.timeoutSeconds * 1000 });
      let reintento = '';
      /* Windows: el antivirus a veces retiene el ejecutable temporal de `go test` y el comando sale con error aunque todas las pruebas pasen. Se reintenta una vez y se dice. */
      if (r.codigo !== 0 && /unlinkat .*\.test\.exe/.test(r.salida)) { reintento = ' (reintentado una vez: el antivirus bloqueó el ejecutable temporal de las pruebas)'; r = ejecutar(c, { cwd: proyecto, timeoutMs: preset.timeoutSeconds * 1000 }); }
      r.codigo === 0 ? anotar('OK', `sello (preset ${esq.preset}): ${c}${reintento}`) : anotar('FALLO', `sello (preset ${esq.preset}): ${c}`, cola(r.salida));
    }
    for (const x of v.extras ?? []) {
      const r = ejecutar(x.cmd, { cwd: proyecto, timeoutMs: 600000 });
      const etiqueta = `extra: ${x.cmd.join(' ')}`;
      if ((r.ausente || /no such command/i.test(r.salida)) && x.opcional) { anotar('OMITIDO', etiqueta, 'herramienta opcional no instalada'); continue; }
      if (r.codigo !== 0 && x.red && /ssl|certificate|connection|resolve|network|proxy|timed out|failed to upgrade/i.test(r.salida)) { anotar('OMITIDO', etiqueta, 'sin red o con TLS no verificable desde esta máquina (no se desactiva la verificación)'); continue; }
      const ok = r.codigo === 0 && (!x.esperaVacio || r.stdout.trim() === '');
      ok ? anotar('OK', etiqueta) : anotar('FALLO', etiqueta, cola(r.salida, 8));
    }
    const reemplazos = {};
    if (v.construir) {
      const r = ejecutar(con(v.construir, reemplazos), { cwd: proyecto, timeoutMs: 1200000 });
      if (r.codigo !== 0) { anotar('FALLO', `construir: ${v.construir.join(' ')}`, cola(r.salida)); return 1; }
      anotar('OK', `construir: ${v.construir.join(' ')}`);
    }
    const ejecutarCmd = con(v.ejecutar, reemplazos).map((t, i) => (i === 0 && t.startsWith('./') ? join(proyecto, t.slice(2)) : t));
    const config = await contrato(proyecto, base, ejecutarCmd);
    await daemon(proyecto, ejecutarCmd, config);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
  const fallos = resultados.filter((r) => r.estado === 'FALLO').length;
  console.log(fallos ? `\n${fallos} paso(s) con FALLO.` : '\nTodos los pasos ejecutados pasaron (los OMITIDO no se verificaron).');
  return fallos ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
