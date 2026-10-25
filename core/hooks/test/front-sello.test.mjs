import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ejecutar, comprobacionesDeFront } from '../premerge-check.mjs';
import { CONFIG_POR_DEFECTO, git as gitReal } from '../lib/common.mjs';

function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-front-sello-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); assert.equal(r.status, 0, r.stderr); };
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'T'); g('config', 'user.email', 't@users.noreply.example');
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  return dir;
}
const io = () => { const ejecutados = []; const logs = []; return { ejecutados, logs, spawn: (c) => { ejecutados.push(c); return { status: 0 }; }, escribir() {}, borrar() {}, log: (x) => logs.push(x), ahora: () => 'hoy', escanear: () => ({ ok: true, hallazgos: [], archivos: 1, commits: 1 }) }; };
const base = { ...CONFIG_POR_DEFECTO, gitleaks: false, checks: [{ commands: ['npm test'] }], front: { config: 'tests/front/front.config.json', comando: 'node tests/front/run.mjs' } };

test('el sello ejecuta las pruebas de front configuradas cuando existe su configuración', (t) => {
  const dir = repo(t);
  mkdirSync(join(dir, 'tests', 'front'), { recursive: true });
  writeFileSync(join(dir, 'tests', 'front', 'front.config.json'), '{}');
  // el archivo nuevo debe estar commiteado: el sello es de un commit
  const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  g('add', '.'); g('commit', '-q', '-m', 'test: front');
  const d = io();
  const r = ejecutar({ projectDir: dir, config: base, git: (a) => gitReal(a, dir), io: d });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual(d.ejecutados, ['npm test', 'node tests/front/run.mjs']);
  assert.equal(r.front, 'ejecutado');
});

test('si no existe la configuración de front, no se ejecuta y el sello lo dice', (t) => {
  const dir = repo(t);
  const d = io();
  const r = ejecutar({ projectDir: dir, config: base, git: (a) => gitReal(a, dir), io: d });
  assert.deepEqual(d.ejecutados, ['npm test']);
  assert.equal(r.front, 'no configurado');
  assert.ok(d.logs.some((l) => /no existe tests\/front\/front\.config\.json/.test(l)));
  assert.deepEqual(comprobacionesDeFront({ ...base, front: null }, dir), []);
});

test('si las pruebas de front fallan, no hay sello', (t) => {
  const dir = repo(t);
  mkdirSync(join(dir, 'tests', 'front'), { recursive: true });
  writeFileSync(join(dir, 'tests', 'front', 'front.config.json'), '{}');
  spawnSync('git', ['add', '.'], { cwd: dir }); spawnSync('git', ['commit', '-q', '-m', 'test: front'], { cwd: dir });
  const d = io();
  d.spawn = (c) => ({ status: c.includes('tests/front') ? 1 : 0 });
  const r = ejecutar({ projectDir: dir, config: base, git: (a) => gitReal(a, dir), io: d });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Falló «node tests\/front\/run\.mjs»/);
});
