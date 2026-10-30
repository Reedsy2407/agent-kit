import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, rmSync, symlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { planificar, aplicar, describirPlan, main, resolverSeguro, InstalacionInvalida, archivosDelManifiesto, cargarManifiesto, cubiertaPorGitignore, leerArgumentos } from '../install.mjs';

/** Escenario: <tmp>/{destino, respaldo, vecino}. El vecino y todo lo de fuera del destino no deben cambiar. */
function escenario() {
  const base = mkdtempSync(join(tmpdir(), 'kit-install-'));
  for (const d of ['destino', 'respaldo', 'vecino']) mkdirSync(join(base, d));
  writeFileSync(join(base, 'vecino', 'a.txt'), 'intacto');
  return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) };
}

function foto(dir) {
  const salida = {};
  const ir = (d) => {
    for (const n of readdirSync(d)) {
      const r = join(d, n);
      if (statSync(r).isDirectory()) ir(r);
      else salida[relative(dir, r)] = readFileSync(r, 'utf8');
    }
  };
  ir(dir);
  return salida;
}

const plan = (e, extra = {}) => planificar({ destino: e.destino, tipo: 'A', proyecto: 'demo', respaldo: e.respaldo, ahora: new Date('2026-10-19T10:00:00Z'), ...extra });

test('copia lo del manifiesto del tipo A, sin pruebas de hooks, y genera kit.json y settings', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    for (const f of ['CLAUDE.md', 'HANDOFF.md', 'kit/PROCESO-MODULOS-Y-REVISION.md', 'kit/PROMPT-MODULO.md', 'kit/MERGE-AUTORIZADO.md', 'kit/FICHA-INFRA.json',
      '.claude/hooks/guard-shell.mjs', '.claude/hooks/lib/common.mjs', '.claude/agents/code-reviewer.md', '.claude/skills/cierre-de-modulo/SKILL.md',
      '.claude/skills/revision-visual/SKILL.md', '.claude/kit.json', '.claude/settings.local.json', 'design/DESIGN-BRIEF.md', 'design/styles.css', 'design/TOOLING.md'])
      assert.ok(existsSync(join(e.destino, f)), `falta ${f}`);
    assert.ok(!existsSync(join(e.destino, '.claude/hooks/test')), 'las pruebas de los hooks no se instalan');
    const claude = readFileSync(join(e.destino, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /^# demo —/);
    assert.doesNotMatch(claude, /\{\{/, 'sin marcadores sin sustituir');
    const settings = JSON.parse(readFileSync(join(e.destino, '.claude/settings.local.json'), 'utf8'));
    assert.ok(settings.permissions.deny.length && settings.hooks.PreToolUse.length);
    assert.equal(JSON.parse(readFileSync(join(e.destino, 'kit/FICHA-INFRA.json'), 'utf8')).proyecto, 'demo');
  } finally { e.limpiar(); }
});

test('el .gitignore recibe las rutas exactas, sin duplicar, y respeta lo que ya tenía', () => {
  const e = escenario();
  try {
    writeFileSync(join(e.destino, '.gitignore'), 'node_modules/\n/kit/');
    aplicar(plan(e));
    const uno = readFileSync(join(e.destino, '.gitignore'), 'utf8');
    assert.equal(uno.split('\n').filter((l) => l === '/kit/').length, 1, 'no duplica lo que ya estaba');
    assert.match(uno, /^node_modules\/\n\/kit\/\n/, 'no toca el resto');
    for (const l of cargarManifiesto('A').gitignore) assert.ok(uno.split('\n').includes(l), l);
    aplicar(plan(e, { ahora: new Date('2026-10-19T11:00:00Z') }));
    assert.equal(readFileSync(join(e.destino, '.gitignore'), 'utf8'), uno, 'idempotente');
  } finally { e.limpiar(); }
});

test('todo lo no versionado del manifiesto queda cubierto por una línea de .gitignore, y lo versionado no', () => {
  const m = cargarManifiesto('A');
  for (const a of archivosDelManifiesto(m)) assert.equal(cubiertaPorGitignore(a.destino, m.gitignore), !a.versionado, a.destino);
  for (const g of ['kit/FICHA-INFRA.json', '.claude/kit.json', '.claude/settings.local.json']) assert.ok(cubiertaPorGitignore(g, m.gitignore), g);
});

test('nada se escribe fuera del destino y del respaldo', () => {
  const e = escenario();
  try {
    const antes = { vecino: foto(join(e.base, 'vecino')) };
    const p = plan(e);
    aplicar(p);
    assert.deepEqual(foto(join(e.base, 'vecino')), antes.vecino);
    assert.deepEqual(readdirSync(e.base).sort(), ['destino', 'respaldo', 'vecino']);
    assert.ok(p.respaldo.startsWith(e.respaldo) && existsSync(join(p.respaldo, 'instalacion.json')));
  } finally { e.limpiar(); }
});

test('resolverSeguro rechaza .., rutas absolutas y enlaces que salen', () => {
  const e = escenario();
  try {
    assert.throws(() => resolverSeguro(e.destino, '../vecino/a.txt'), InstalacionInvalida);
    assert.throws(() => resolverSeguro(e.destino, 'a/../../x'), InstalacionInvalida);
    assert.throws(() => resolverSeguro(e.destino, join(e.base, 'vecino', 'a.txt')), InstalacionInvalida);
    assert.throws(() => resolverSeguro(e.destino, 'C:/x'), InstalacionInvalida);
    assert.ok(resolverSeguro(e.destino, 'a/b/c.txt').startsWith(e.destino));
    try {
      symlinkSync(join(e.base, 'vecino'), join(e.destino, 'enlace'), 'junction');
      assert.throws(() => resolverSeguro(e.destino, 'enlace/a.txt'), InstalacionInvalida);
    } catch (err) { if (err instanceof assert.AssertionError) throw err; /* sin permiso para enlaces: se omite esta parte */ }
  } finally { e.limpiar(); }
});

test('dry-run no escribe nada, ni siquiera el respaldo', async () => {
  const e = escenario();
  try {
    const antes = foto(e.base);
    let salida = '';
    const codigo = await main(['--destino', e.destino, '--tipo', 'A', '--dry-run', '--respaldo', e.respaldo], { stdout: { write: (t) => { salida += t; } }, stderr: { write: () => {} }, interactivo: false });
    assert.equal(codigo, 0);
    assert.deepEqual(foto(e.base), antes);
    assert.match(salida, /dry-run: no se escribe nada/);
    assert.match(salida, /crear\s+CLAUDE\.md/);
    assert.match(salida, /\.gitignore: añadir/);
    assert.deepEqual(readdirSync(e.respaldo), [], 'la carpeta de respaldo sigue vacía');
  } finally { e.limpiar(); }
});

test('no sobrescribe sin --forzar; con él deja la versión anterior en el respaldo', () => {
  const e = escenario();
  try {
    writeFileSync(join(e.destino, 'CLAUDE.md'), 'mío');
    const sin = plan(e);
    assert.equal(sin.acciones.find((a) => a.destino === 'CLAUDE.md').accion, 'omitir');
    aplicar(sin);
    assert.equal(readFileSync(join(e.destino, 'CLAUDE.md'), 'utf8'), 'mío');
    const con = plan(e, { forzar: true });
    aplicar(con);
    assert.notEqual(readFileSync(join(e.destino, 'CLAUDE.md'), 'utf8'), 'mío');
    assert.equal(readFileSync(join(con.respaldo, 'previo', 'CLAUDE.md'), 'utf8'), 'mío');
  } finally { e.limpiar(); }
});

test('un settings.local.json existente no se toca: se escribe al lado el generado', () => {
  const e = escenario();
  try {
    mkdirSync(join(e.destino, '.claude'));
    writeFileSync(join(e.destino, '.claude/settings.local.json'), '{"mio":true}');
    aplicar(plan(e, { forzar: true }));
    assert.equal(readFileSync(join(e.destino, '.claude/settings.local.json'), 'utf8'), '{"mio":true}');
    assert.ok(existsSync(join(e.destino, '.claude/settings.local.generado.json')));
  } finally { e.limpiar(); }
});

test('el respaldo dentro del destino se rechaza', () => {
  const e = escenario();
  try {
    assert.throws(() => plan(e, { respaldo: join(e.destino, 'respaldos') }), /dentro del destino/);
  } finally { e.limpiar(); }
});

test('un tipo con manifiesto pendiente avisa y termina sin error ni escritura', () => {
  const e = escenario();
  try {
    const kit = join(e.base, 'kit-falso');
    mkdirSync(join(kit, 'types', 'D'), { recursive: true });
    writeFileSync(join(kit, 'types', 'D', 'manifest.json'), JSON.stringify({ tipo: 'D', nombre: 'tipo de prueba', estado: 'pendiente-etapa-2', archivos: [], gitignore: [] }));
    const antes = foto(e.base);
    const p = planificar({ destino: e.destino, tipo: 'D', respaldo: e.respaldo, raizKit: kit });
    assert.match(describirPlan(p, { dryRun: false }), /todavía no está disponible/);
    assert.deepEqual(aplicar(p), { escritos: [], omitidos: [], rechazados: [] });
    assert.deepEqual(foto(e.base), antes);
  } finally { e.limpiar(); }
});

test('errores de uso salen con código 2 y sin escribir; sin terminal exige --tipo', async () => {
  const e = escenario();
  try {
    const corre = (args) => { let err = ''; return main(args, { stdout: { write: () => {} }, stderr: { write: (t) => { err += t; } }, interactivo: false }).then((c) => ({ c, err })); };
    assert.equal((await corre(['--tipo', 'A'])).c, 2);
    const sinTipo = await corre(['--destino', e.destino]);
    assert.equal(sinTipo.c, 2);
    assert.match(sinTipo.err, /--tipo/);
    assert.equal((await corre(['--destino', e.destino, '--tipo', 'Z'])).c, 2);
    assert.equal((await corre(['--destino', join(e.base, 'no-existe'), '--tipo', 'A'])).c, 2);
    assert.equal((await corre(['--destino', e.destino, '--tipo', 'A', '--raro'])).c, 2);
    assert.deepEqual(readdirSync(e.destino), []);
  } finally { e.limpiar(); }
});

test('una ficha con forma de secreto aborta antes de escribir', async () => {
  const e = escenario();
  try {
    const ficha = join(e.base, 'ficha.json');
    writeFileSync(ficha, JSON.stringify({ version: 1, proyecto: 'x', tipo: 'A', despliegue: { cli: `ghp_${'a'.repeat(36)}` } }));
    const c = await main(['--destino', e.destino, '--tipo', 'A', '--ficha', ficha, '--respaldo', e.respaldo], { stdout: { write: () => {} }, stderr: { write: () => {} }, interactivo: false });
    assert.equal(c, 2);
    assert.deepEqual(readdirSync(e.destino), []);
  } finally { e.limpiar(); }
});

test('leerArgumentos exige valor en las opciones que lo llevan', () => {
  assert.throws(() => leerArgumentos(['--destino']), InstalacionInvalida);
  assert.deepEqual(leerArgumentos(['--tipo', 'a', '--dry-run']).tipo, 'A');
});

test('los manifiestos: A y B disponibles, con puntos disjuntos', () => {
  const a = cargarManifiesto('A');
  const b = cargarManifiesto('B');
  assert.equal(a.estado, 'disponible');
  assert.deepEqual(a.puntos.aplican.filter((p) => a.puntos.noAplican.includes(p)), []);
  assert.deepEqual(a.puntos.noAplican, [5, 6, 7, 12, 13]);
  assert.equal(b.estado, 'disponible');
  assert.deepEqual(b.puntos.aplican.filter((p) => b.puntos.noAplican.includes(p)), []);
  assert.ok(b.archivos.length > 0);
});

test('los hooks instalados funcionan desde el destino', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    const corre = (hook, entrada) => spawnSync('node', [join(e.destino, '.claude/hooks', hook)], { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: e.destino }, timeout: 20000 });
    assert.equal(corre('guard-shell.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: e.destino }).status, 0);
    assert.equal(corre('guard-shell.mjs', { tool_name: 'Bash', tool_input: { command: 'git add -i' }, cwd: e.destino }).status, 2);
  } finally { e.limpiar(); }
});

test('un tipo con forma de ruta se rechaza', () => {
  assert.throws(() => cargarManifiesto('../x'), InstalacionInvalida);
});

test('un enlace roto dentro del destino se rechaza', (t) => {
  const e = escenario();
  try {
    try { symlinkSync(join(e.base, 'no-existe'), join(e.destino, 'roto'), 'junction'); } catch { t.skip('sin permiso para crear enlaces'); return; }
    assert.throws(() => resolverSeguro(e.destino, 'roto/x.txt'), InstalacionInvalida);
  } finally { e.limpiar(); }
});

test('--proyecto manda sobre la ficha y reinstalar sin cambios no deja otro respaldo', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    aplicar(plan(e, { ahora: new Date('2026-10-19T11:00:00Z') })); // crea al lado el settings generado
    const n = readdirSync(e.respaldo).length;
    aplicar(plan(e, { ahora: new Date('2026-10-19T12:00:00Z') }));
    assert.equal(readdirSync(e.respaldo).length, n);
    assert.match(readFileSync(join(e.destino, 'CLAUDE.md'), 'utf8'), /^# demo —/);
  } finally { e.limpiar(); }
});

test('el instalador añade .gitattributes y no pisa uno existente distinto, avisando', () => {
  const e = escenario();
  try {
    aplicar(plan(e));
    assert.equal(readFileSync(join(e.destino, '.gitattributes'), 'utf8'), '* text=auto eol=lf\n*.pdf binary\n*.woff2 binary\n');
    const otro = escenario();
    try {
      writeFileSync(join(otro.destino, '.gitattributes'), '* -text\n');
      const p = plan(otro);
      assert.ok(p.advertencias.some((w) => /\.gitattributes/.test(w)));
      aplicar(p);
      assert.equal(readFileSync(join(otro.destino, '.gitattributes'), 'utf8'), '* -text\n');
    } finally { otro.limpiar(); }
  } finally { e.limpiar(); }
});
