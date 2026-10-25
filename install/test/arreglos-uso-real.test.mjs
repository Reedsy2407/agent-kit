// Etapa 2C: arreglos del instalador salidos de usarlo en un repo real: --diff, --forzar por ruta, la ficha del proyecto se
// fusiona (no se pierde) y los datos privados nunca se pisan sin nombrarlos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { planificar, aplicar, describirPlan, main, leerArgumentos, quiereForzar, InstalacionInvalida } from '../install.mjs';
import { diffDeArchivos } from '../diff.mjs';
import { fusionarFicha, generarKitConfig } from '../../infra/generate-settings.mjs';

function escenario() {
  const base = mkdtempSync(join(tmpdir(), 'kit-install-2c-'));
  for (const d of ['destino', 'respaldo']) mkdirSync(join(base, d));
  return { destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) };
}
const foto = (dir) => {
  const salida = {};
  const ir = (d) => { for (const n of readdirSync(d)) { const r = join(d, n); if (statSync(r).isDirectory()) ir(r); else salida[relative(dir, r)] = readFileSync(r, 'utf8'); } };
  ir(dir);
  return salida;
};
const AHORA = new Date('2026-10-22T10:00:00Z'); // la fecha entra en HANDOFF.md: sin fijarla, una prueba que cruza la medianoche UTC fallaría
const plan = (e, extra = {}) => planificar({ destino: e.destino, tipo: 'A', proyecto: 'demo', respaldo: e.respaldo, ahora: AHORA, ...extra });
const poner = (e, ruta, texto) => { mkdirSync(join(e.destino, ruta, '..'), { recursive: true }); writeFileSync(join(e.destino, ruta), texto); };
const accion = (p, destino) => p.acciones.find((a) => a.destino === destino).accion;
const salida = () => { const o = { out: '', err: '' }; return { o, stdout: { write: (x) => { o.out += x; } }, stderr: { write: (x) => { o.err += x; } } }; };

// --- --diff ---
test('diffDeArchivos marca lo que hay con «-» y lo que traería el kit con «+», con contexto', () => {
  const d = diffDeArchivos(Buffer.from('uno\ndos\ntres\ncuatro\ncinco\nseis\nsiete\n'), Buffer.from('uno\ndos\nTRES\ncuatro\ncinco\nseis\nsiete\n'));
  assert.match(d, /- tres/);
  assert.match(d, /\+ TRES/);
  assert.match(d, /  {2}dos/, 'contexto antes');
  assert.doesNotMatch(d, /siete/, 'lo lejano al cambio no se muestra');
  assert.equal(diffDeArchivos(Buffer.from('a\n'), Buffer.from('a\n')), '');
  assert.match(diffDeArchivos(Buffer.from('a\r\nb\r\n'), Buffer.from('a\nb\n')), /finales de línea/);
  assert.match(diffDeArchivos(Buffer.from([0, 1, 2]), Buffer.from([0, 1, 3])), /binario/);
  assert.match(diffDeArchivos(Buffer.from('x\n'.repeat(500)), Buffer.from('y\n'.repeat(500))), /archivo largo/);
});

test('--diff muestra las diferencias por archivo y no escribe nada (ni el respaldo)', async () => {
  const e = escenario();
  try {
    poner(e, 'CLAUDE.md', 'mis reglas propias\n');
    const antes = foto(e.destino);
    const s = salida();
    const codigo = await main(['--destino', e.destino, '--tipo', 'A', '--proyecto', 'demo', '--respaldo', e.respaldo, '--diff'], { stdout: s.stdout, stderr: s.stderr });
    assert.equal(codigo, 0, s.o.err);
    assert.match(s.o.out, /RESUMEN \(\d+ archivo\(s\) difieren\)/);
    assert.match(s.o.out, /\+\d+ −1 líneas\s+CLAUDE\.md/, 'resumen por archivo');
    assert.match(s.o.out, /DIFERENCIAS/);
    assert.match(s.o.out, /--- CLAUDE\.md {2}\[se omitiría\]/);
    assert.match(s.o.out, /- mis reglas propias/);
    assert.match(s.o.out, /\+ # demo — instrucciones para el constructor/);
    assert.deepEqual(foto(e.destino), antes, 'el destino no cambia');
    assert.deepEqual(readdirSync(e.respaldo), [], 'ni se crea respaldo');
    assert.match(leerArgumentos(['--diff']).diff ? 'ok' : 'no', /ok/);
  } finally { e.limpiar(); }
});

test('--diff sobre una instalación al día dice que no hay diferencias', async () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    const s = salida();
    await main(['--destino', e.destino, '--tipo', 'A', '--proyecto', 'demo', '--respaldo', e.respaldo, '--diff'], { stdout: s.stdout, stderr: s.stderr, ahora: AHORA });
    assert.match(s.o.out, /ninguno: lo instalado coincide con el kit/);
  } finally { e.limpiar(); }
});

// --- --forzar por ruta ---
test('--forzar=ruta solo pisa esas rutas (o carpetas) y deja el respaldo; el resto se omite', () => {
  const e = escenario();
  try {
    poner(e, 'CLAUDE.md', 'mío\n');
    poner(e, 'HANDOFF.md', 'mío también\n');
    poner(e, '.claude/hooks/guard-shell.mjs', '// versión propia\n');
    const p = plan(e, { forzar: ['HANDOFF.md', '.claude/hooks'] });
    assert.equal(accion(p, 'CLAUDE.md'), 'omitir');
    assert.equal(accion(p, 'HANDOFF.md'), 'sobrescribir');
    assert.equal(accion(p, '.claude/hooks/guard-shell.mjs'), 'sobrescribir', 'una carpeta cubre lo que hay debajo');
    aplicar(p);
    assert.equal(readFileSync(join(e.destino, 'CLAUDE.md'), 'utf8'), 'mío\n');
    assert.notEqual(readFileSync(join(e.destino, 'HANDOFF.md'), 'utf8'), 'mío también\n');
    assert.equal(readFileSync(join(p.respaldo, 'previo', 'HANDOFF.md'), 'utf8'), 'mío también\n');
  } finally { e.limpiar(); }
});

test('--forzar=ruta se lee de la línea de comandos, se acumula y falla con claridad si la ruta no existe', async () => {
  assert.deepEqual(leerArgumentos(['--forzar=a.md,b/c']).forzar, ['a.md', 'b/c']);
  assert.deepEqual(leerArgumentos(['--forzar=a.md', '--forzar=b.md']).forzar, ['a.md', 'b.md']);
  assert.equal(leerArgumentos(['--forzar']).forzar, true);
  assert.equal(leerArgumentos(['--forzar=a.md', '--forzar']).forzar, true, 'el global gana');
  assert.throws(() => leerArgumentos(['--forzar=']), InstalacionInvalida);
  assert.equal(quiereForzar(['./kit\\'], 'kit/FICHA-INFRA.json'), true, 'normaliza ./, \\ y la / final');
  assert.equal(quiereForzar(['kit'], 'kitten/x'), false, 'una carpeta no es un prefijo de texto');
  const e = escenario();
  try {
    const s = salida();
    const codigo = await main(['--destino', e.destino, '--tipo', 'A', '--proyecto', 'demo', '--respaldo', e.respaldo, '--forzar=no/existe.md'], { stdout: s.stdout, stderr: s.stderr });
    assert.equal(codigo, 2);
    assert.match(s.o.err, /--forzar nombra rutas que el kit no instala: no\/existe\.md/);
    assert.deepEqual(readdirSync(e.destino), [], 'no se escribió nada');
  } finally { e.limpiar(); }
});

// --- ficha fusionada ---
test('fusionarFicha conserva lo del proyecto, une las listas y añade lo nuevo del kit', () => {
  const plantilla = { _ayuda: 'nueva', version: 1, despliegue: { primerDespliegueHecho: false, permitidosTrasPrimerDespliegue: ['A'] }, permisos: { permitidos: ['front', 'extra'], denegados: [] }, kit: { commitScopes: [], checks: [{ commands: ['npm test'] }], gitleaks: true, front: { comando: 'x' } } };
  const propia = { _ayuda: 'vieja', version: 1, despliegue: { primerDespliegueHecho: true, proveedor: 'propio' }, permisos: { permitidos: ['mío', 'extra'], denegados: ['no'] }, kit: { commitScopes: ['demo'], checks: [], gitleaks: false } };
  const f = fusionarFicha(plantilla, propia);
  assert.equal(f._ayuda, 'nueva', 'la ayuda es del kit');
  assert.equal(f.despliegue.primerDespliegueHecho, true, 'no se reinicia el primer despliegue');
  assert.equal(f.despliegue.proveedor, 'propio');
  assert.deepEqual(f.despliegue.permitidosTrasPrimerDespliegue, ['A']);
  assert.deepEqual(f.permisos.permitidos, ['mío', 'extra', 'front'], 'primero lo del proyecto, sin duplicar');
  assert.deepEqual(f.permisos.denegados, ['no']);
  assert.deepEqual(f.kit.commitScopes, ['demo']);
  assert.deepEqual(f.kit.checks, [{ commands: ['npm test'] }], 'unas comprobaciones vacías se rellenan con las del kit');
  assert.equal(f.kit.gitleaks, false, 'un escalar del proyecto manda');
  assert.deepEqual(f.kit.front, { comando: 'x' }, 'lo nuevo del kit se añade');
  const f2 = fusionarFicha(plantilla, { ...propia, kit: { ...propia.kit, checks: [{ commands: ['npm run mio'] }] } });
  assert.deepEqual(f2.kit.checks, [{ commands: ['npm run mio'] }], 'las comprobaciones propias no reciben las del kit');
});

test('reinstalar con --forzar no pierde commitScopes ni los permisos que el proyecto añadió a su ficha', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    const ruta = join(e.destino, 'kit', 'FICHA-INFRA.json');
    const propia = JSON.parse(readFileSync(ruta, 'utf8'));
    propia.kit.commitScopes = ['demo'];
    propia.kit.maxBranchCommits = 8;
    propia.permisos.permitidos.push('Bash(npm run mio)');
    propia.despliegue.primerDespliegueHecho = true;
    delete propia.kit.front; // una ficha de una versión anterior del kit
    writeFileSync(ruta, `${JSON.stringify(propia, null, 2)}\n`);

    const p = plan(e, { forzar: true });
    assert.match(p.advertencias.join('\n'), /se fusionaría.*se escribe con respaldo/s);
    aplicar(p);
    const f = JSON.parse(readFileSync(ruta, 'utf8'));
    assert.deepEqual(f.kit.commitScopes, ['demo']);
    assert.equal(f.kit.maxBranchCommits, 8);
    assert.ok(f.permisos.permitidos.includes('Bash(npm run mio)'), 'el permiso propio sigue');
    assert.ok(f.permisos.permitidos.includes('Bash(node tests/front/run.mjs:*)'), 'y se añaden los permisos nuevos del kit');
    assert.equal(f.despliegue.primerDespliegueHecho, true);
    assert.equal(f.kit.front.comando, 'node tests/front/run.mjs', 'lo nuevo (kit.front) se añade');
    const kit = JSON.parse(readFileSync(join(e.destino, '.claude', 'kit.json'), 'utf8'));
    assert.deepEqual(kit.commitScopes, ['demo'], 'y el kit.json generado también');
    assert.deepEqual(generarKitConfig(f).commitScopes, ['demo']);
  } finally { e.limpiar(); }
});

test('una ficha del destino que no es JSON detiene la instalación antes de escribir; --ficha explícita no se fusiona', () => {
  const e = escenario();
  try {
    poner(e, 'kit/FICHA-INFRA.json', '{ roto');
    assert.throws(() => plan(e), /no es JSON válido/);
    assert.throws(() => plan(e), InstalacionInvalida);
    writeFileSync(join(e.destino, 'kit', 'FICHA-INFRA.json'), JSON.stringify({ kit: { commitScopes: ['propio'] } }));
    const explicita = join(e.respaldo, 'ficha.json');
    writeFileSync(explicita, JSON.stringify(JSON.parse(readFileSync(new URL('../../types/A/ficha-infra.json', import.meta.url), 'utf8'))));
    const p = plan(e, { fichaRuta: explicita });
    assert.doesNotMatch(p.advertencias.join('\n'), /se fusionó/);
  } finally { e.limpiar(); }
});

// --- datos privados ---
test('instala un tests/front/datos-privados.json vacío, ignorado por git, y ni --forzar global lo pisa', () => {
  const e = escenario();
  try {
    const p = plan(e);
    assert.ok(p.gitignore.añadir.includes('/tests/front/datos-privados.json'));
    aplicar(p);
    const ruta = join(e.destino, 'tests', 'front', 'datos-privados.json');
    const ejemplo = JSON.parse(readFileSync(ruta, 'utf8'));
    assert.deepEqual([ejemplo.nombresProhibidos, ejemplo.patrones], [[], []]);
    assert.match(readFileSync(join(e.destino, '.gitignore'), 'utf8'), /^\/tests\/front\/datos-privados\.json$/m);

    writeFileSync(ruta, JSON.stringify({ nombresProhibidos: ['Cliente Real'], patrones: [] }));
    const global = plan(e, { forzar: true });
    assert.equal(accion(global, 'tests/front/datos-privados.json'), 'omitir', '--forzar global no toca los datos privados');
    aplicar(global);
    assert.match(readFileSync(ruta, 'utf8'), /Cliente Real/);
    const nombrado = plan(e, { forzar: ['tests/front/datos-privados.json'] });
    assert.equal(accion(nombrado, 'tests/front/datos-privados.json'), 'sobrescribir', 'solo si se nombra');
  } finally { e.limpiar(); }
});

test('describirPlan sin --diff no imprime diferencias', () => {
  const e = escenario();
  try {
    poner(e, 'CLAUDE.md', 'mío\n');
    assert.doesNotMatch(describirPlan(plan(e), { dryRun: true }), /DIFERENCIAS/);
    assert.match(describirPlan(plan(e), { dryRun: true }), /usa --forzar o --forzar=<ruta>/);
  } finally { e.limpiar(); }
});

// --- hallazgos de la revisión ---
test('--diff no imprime el contenido de los datos privados ni el de la ficha', async () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    writeFileSync(join(e.destino, 'tests', 'front', 'datos-privados.json'), '{"nombresProhibidos":["ClienteSecretoUno"]}\n');
    const ficha = JSON.parse(readFileSync(join(e.destino, 'kit', 'FICHA-INFRA.json'), 'utf8'));
    ficha.despliegue.proveedor = 'ProveedorConfidencialXyz';
    writeFileSync(join(e.destino, 'kit', 'FICHA-INFRA.json'), JSON.stringify(ficha, null, 2));
    const s = salida();
    await main(['--destino', e.destino, '--tipo', 'A', '--proyecto', 'demo', '--respaldo', e.respaldo, '--diff'], { stdout: s.stdout, stderr: s.stderr });
    assert.doesNotMatch(s.o.out, /ClienteSecretoUno|ProveedorConfidencialXyz/);
    assert.match(s.o.out, /--- tests\/front\/datos-privados\.json {2}\[se omitiría\]\n {2}\(contenido no mostrado: .*difieren \d+ línea/);
    assert.match(s.o.out, /--- kit\/FICHA-INFRA\.json .*\n {2}\(contenido no mostrado/);
  } finally { e.limpiar(); }
});

test('--forzar=<carpeta> no pisa los datos privados: hay que nombrar su ruta exacta', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    writeFileSync(join(e.destino, 'tests', 'front', 'datos-privados.json'), '{"nombresProhibidos":["Real"]}');
    assert.equal(accion(plan(e, { forzar: ['tests/front'] }), 'tests/front/datos-privados.json'), 'omitir');
    assert.equal(accion(plan(e, { forzar: ['tests'] }), 'tests/front/datos-privados.json'), 'omitir');
    assert.equal(accion(plan(e, { forzar: ['./tests/front/datos-privados.json'] }), 'tests/front/datos-privados.json'), 'sobrescribir');
  } finally { e.limpiar(); }
});

test('el aviso de la ficha dice la verdad: sin --forzar no se escribe', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    const ruta = join(e.destino, 'kit', 'FICHA-INFRA.json');
    const f = JSON.parse(readFileSync(ruta, 'utf8'));
    f.kit.commitScopes = ['demo'];
    writeFileSync(ruta, JSON.stringify(f));
    const sin = plan(e);
    assert.equal(accion(sin, 'kit/FICHA-INFRA.json'), 'omitir');
    assert.match(sin.advertencias.join('\n'), /se fusionaría.*no se escribe sin --forzar=kit\/FICHA-INFRA\.json/s);
    assert.doesNotMatch(sin.advertencias.join('\n'), /se fusionó/);
    assert.match(plan(e, { forzar: ['kit/FICHA-INFRA.json'] }).advertencias.join('\n'), /se escribe con respaldo/);
  } finally { e.limpiar(); }
});
