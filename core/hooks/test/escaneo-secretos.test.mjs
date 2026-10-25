import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { escanear, escanearHistorial, buscarEnLinea } from '../escaneo-secretos.mjs';
import { ejecutar } from '../premerge-check.mjs';
import { revisarAutoria } from '../lib/autoria.mjs';
import { CONFIG_POR_DEFECTO, git as gitReal } from '../lib/common.mjs';

// Los «secretos» de las pruebas se arman por partes para no ser un secreto en el archivo.
const claveAws = `AKIA${'ABCDEFGHIJKLMNOP'}`;
const tokenNpm = `npm_${'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'}`;

function repo(t, correo = 'dev@users.noreply.example') {
  const dir = mkdtempSync(join(tmpdir(), 'kit-escaneo-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'T'); g('config', 'user.email', correo); g('config', 'core.autocrlf', 'false');
  return { dir, g, git: (a) => gitReal(a, dir) };
}

test('detecta patrones de claves y tokens línea a línea, sin mostrar el valor', () => {
  assert.equal(buscarEnLinea(`clave = "${claveAws}"`), 'una clave de acceso de AWS');
  assert.equal(buscarEnLinea(`//token ${tokenNpm}`), 'un token de npm');
  assert.equal(buscarEnLinea('const x = 1;'), null);
  assert.equal(buscarEnLinea(`ejemplo ${claveAws} escaneo-secretos:ignorar`), null, 'la marca de ignorar salta la línea');
});

test('limpio cuando el árbol y el historial no tienen secretos', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, 'a.txt'), 'hola\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const r = escanear(dir);
  assert.equal(r.ok, true);
  assert.deepEqual(r.hallazgos, []);
  assert.equal(r.commits, 1);
});

test('encuentra un secreto en el árbol de trabajo (también sin commitear) y no imprime el valor', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, 'a.txt'), 'hola\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  writeFileSync(join(dir, 'config.js'), `export const k = "${claveAws}";\n`);
  const r = escanear(dir, { historial: false });
  assert.equal(r.ok, false);
  assert.match(r.hallazgos[0], /^config\.js:1 — una clave de acceso de AWS$/);
  assert.ok(!r.hallazgos.join('').includes(claveAws));
});

test('encuentra un secreto que ya se borró del árbol pero sigue en el historial', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, 'a.txt'), `k=${claveAws}\n`); g('add', '.'); g('commit', '-q', '-m', 'feat: a');
  writeFileSync(join(dir, 'a.txt'), 'limpio\n'); g('add', '.'); g('commit', '-q', '-m', 'fix: quitar');
  assert.equal(escanear(dir, { historial: false }).ok, true, 'el árbol ya está limpio');
  const r = escanear(dir);
  assert.equal(r.ok, false);
  assert.match(r.hallazgos[0], /^historial [0-9a-f]{10} a\.txt — una clave de acceso de AWS$/);
});

test('un .env versionado es un hallazgo, una plantilla .env.example no, y lo ignorado por git no se escanea', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, '.gitignore'), 'secreto-local.txt\n');
  writeFileSync(join(dir, 'secreto-local.txt'), `k=${claveAws}\n`);
  writeFileSync(join(dir, '.env.example'), 'TOKEN=\n');
  writeFileSync(join(dir, '.env.ejemplo'), 'TOKEN=\n');
  writeFileSync(join(dir, '.env'), 'TOKEN=algo\n');
  writeFileSync(join(dir, 'imagen.bin'), Buffer.from([0, 1, 2, 3]));
  g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const r = escanear(dir, { historial: false });
  assert.deepEqual(r.hallazgos, ['.env — un archivo de secretos o claves']);
});

test('las rutas de .escaneo-secretos-ignorar se saltan, en el árbol y en el historial', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, 'ejemplo.test.js'), `k=${claveAws}\n`);
  writeFileSync(join(dir, 'otro.js'), `k=${claveAws}\n`);
  g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  assert.equal(escanear(dir).hallazgos.length, 4, 'dos archivos, en el árbol y en el historial');
  writeFileSync(join(dir, '.escaneo-secretos-ignorar'), '# ejemplos\nejemplo.test.js\n');
  const r = escanear(dir);
  assert.equal(r.hallazgos.length, 2);
  assert.ok(r.hallazgos.every((h) => h.includes('otro.js')));
});

test('la CLI sale con 0 si está limpio y con 1 si hay hallazgos', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, 'a.txt'), 'hola\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const script = join(import.meta.dirname, '..', 'escaneo-secretos.mjs');
  const correr = () => spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(correr().status, 0);
  writeFileSync(join(dir, 'b.txt'), `${tokenNpm}\n`);
  const r = correr();
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, new RegExp(tokenNpm));
});

// --- sello de pre-merge ---

const io = (extra = {}) => {
  const logs = [];
  return { logs, spawn: (c) => ({ status: c.startsWith('gitleaks') ? 1 : 0 }), escribir: (ruta, texto) => { io.sello = texto; }, borrar() {}, log: (x) => logs.push(x), ahora: () => 'hoy', escanear: (d) => escanear(d), ...extra };
};
const config = { ...CONFIG_POR_DEFECTO, gitleaks: true, checks: [{ commands: ['npm test'] }] };

test('el sello se niega si la ficha no define comprobaciones', (t) => {
  const { dir, g, git } = repo(t);
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const r = ejecutar({ projectDir: dir, config: { ...config, checks: [] }, git, io: io() });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /no define comprobaciones/);
});

test('sin gitleaks, el sello corre el escaneo propio y lo anota', (t) => {
  const { dir, g, git } = repo(t);
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const dobles = io({ spawn: (c) => ({ status: c.startsWith('gitleaks') ? 1 : 0 }) });
  const r = ejecutar({ projectDir: dir, config, git, io: dobles });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.gitleaks, 'sin binario');
  assert.equal(r.escaneo, 'propio');
  assert.equal(JSON.parse(io.sello).escaneo, 'propio');
});

test('sin gitleaks, un secreto en el historial impide el sello', (t) => {
  const { dir, g, git } = repo(t);
  writeFileSync(join(dir, 'a.txt'), `k=${claveAws}\n`); g('add', '.'); g('commit', '-q', '-m', 'feat: a');
  const r = ejecutar({ projectDir: dir, config, git, io: io() });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /escaneo de secretos encontró 2 hallazgo/);
  assert.ok(!r.motivo.includes(claveAws));
});

test('si tampoco el escaneo propio puede correr, el sello dice «SIN ESCANEO DE SECRETOS»', (t) => {
  const { dir, g, git } = repo(t);
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const dobles = io({ escanear: () => { throw new Error('no disponible'); } });
  const r = ejecutar({ projectDir: dir, config, git, io: dobles });
  assert.equal(r.ok, true);
  assert.equal(r.escaneo, 'ninguno');
  assert.ok(dobles.logs.some((l) => /SIN ESCANEO DE SECRETOS/.test(l)));
  assert.equal(JSON.parse(io.sello).escaneo, 'ninguno');
});

test('con gitleaks desactivado el sello lo dice en claro', (t) => {
  const { dir, g, git } = repo(t);
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const dobles = io();
  const r = ejecutar({ projectDir: dir, config: { ...config, gitleaks: false }, git, io: dobles });
  assert.equal(r.gitleaks, 'desactivado');
  assert.ok(dobles.logs.some((l) => /SIN ESCANEO DE SECRETOS/.test(l)));
});

test('con gitleaks presente se usa gitleaks', (t) => {
  const { dir, g, git } = repo(t);
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const r = ejecutar({ projectDir: dir, config, git, io: io({ spawn: () => ({ status: 0 }) }) });
  assert.equal(r.escaneo, 'gitleaks');
  assert.equal(r.gitleaks, 'limpio');
});

// --- autoría ---

test('autoría: el correo noreply pasa; uno personal avisa; un correo o dominio permitido pasa', (t) => {
  const limpio = repo(t, 'dev@users.noreply.example');
  writeFileSync(join(limpio.dir, 'a.txt'), '1\n'); limpio.g('add', '.'); limpio.g('commit', '-q', '-m', 'chore: base');
  assert.equal(revisarAutoria(limpio.git).ok, true);

  const personal = repo(t, 'alguien@correo-personal.example');
  writeFileSync(join(personal.dir, 'a.txt'), '1\n'); personal.g('add', '.'); personal.g('commit', '-q', '-m', 'chore: base');
  const r = revisarAutoria(personal.git);
  assert.equal(r.ok, false);
  assert.deepEqual(r.personales, ['alguien@correo-personal.example']);
  assert.equal(revisarAutoria(personal.git, ['@correo-personal.example']).ok, true, 'dominio indicado por el humano');
  assert.equal(revisarAutoria(personal.git, ['Alguien@Correo-Personal.example']).ok, true, 'correo exacto, sin distinguir mayúsculas');
});

test('autoría: el sello avisa con un correo personal pero no se niega', (t) => {
  const { dir, g, git } = repo(t, 'alguien@correo-personal.example');
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const dobles = io();
  const r = ejecutar({ projectDir: dir, config, git, io: dobles });
  assert.equal(r.ok, true);
  assert.equal(r.autoria.ok, false);
  assert.ok(dobles.logs.some((l) => /AVISO de autoría.*alguien@correo-personal\.example/.test(l)));
  assert.equal(JSON.parse(io.sello).autoria, 'personal');
});

test('un .env versionado y borrado después se señala en el historial', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, '.env'), 'TOKEN=algo\n'); g('add', '.'); g('commit', '-q', '-m', 'feat: a');
  g('rm', '-q', '.env'); g('commit', '-q', '-m', 'fix: quitar');
  const r = escanear(dir);
  assert.equal(r.ok, false);
  assert.match(r.hallazgos[0], /^historial [0-9a-f]{10} \.env — un archivo de secretos o claves$/);
});

test('si git no puede leer el historial, el escaneo no da «limpio» sino que no pudo correr', (t) => {
  const fuera = mkdtempSync(join(tmpdir(), 'kit-sin-git-'));
  t.after(() => rmSync(fuera, { recursive: true, force: true }));
  const h = escanearHistorial(fuera);
  assert.equal(h.ok, false);
  assert.match(h.motivo, /no pude leer el historial/);
  const r = escanear(fuera);
  assert.equal(r.ok, false);
  assert.ok(r.motivo, 'devuelve un motivo, no una lista vacía de hallazgos');
});

test('si el historial no se puede leer, escanear devuelve el motivo y no «limpio» (rama «!hist.ok»)', (t) => {
  const { dir, g } = repo(t);
  writeFileSync(join(dir, 'a.txt'), 'hola\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const r = escanear(dir, { leerHistorial: () => ({ ok: false, motivo: 'git agotó el tiempo', hallazgos: [], commits: 0 }) });
  assert.deepEqual(r, { ok: false, motivo: 'git agotó el tiempo', hallazgos: [] });
  assert.equal(escanear(dir, { historial: false, leerHistorial: () => { throw new Error('no debe leerse'); } }).ok, true, 'sin historial no se llama');
  // y el sello lo trata como «sin escaneo», no como limpio
  const dobles = io({ escanear: (d) => escanear(d, { leerHistorial: () => ({ ok: false, motivo: 'git agotó el tiempo' }) }) });
  const sello = ejecutar({ projectDir: dir, config, git: (a) => gitReal(a, dir), io: dobles });
  assert.equal(sello.ok, true);
  assert.equal(sello.escaneo, 'ninguno');
  assert.ok(dobles.logs.some((l) => /SIN ESCANEO DE SECRETOS/.test(l)));
});
