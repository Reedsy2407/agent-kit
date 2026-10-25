import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluar } from '../guard-merge.mjs';
import { ejecutar, comprobacionesAplicables, archivosCambiados } from '../premerge-check.mjs';
import { CONFIG_POR_DEFECTO, git as gitReal } from '../lib/common.mjs';

function ctxSimulado({ rama = 'v1/etapa-1', arbol = 'T1', sello = { ok: true, tree: 'T1' } } = {}) {
  return {
    projectDir: '/p', config: { ...CONFIG_POR_DEFECTO },
    git: (a) => (a[0] === 'rev-parse' && a[1] === '--abbrev-ref' ? rama : a[0] === 'rev-parse' && /\^\{tree\}$/.test(a[1]) ? arbol : null),
    leerSello: () => sello,
  };
}
const ev = (command, c = ctxSimulado()) => evaluar({ tool_name: 'Bash', tool_input: { command } }, c);

test('bloquea git rebase', () => assert.match(ev('git rebase main'), /Nunca rebase/));
test('bloquea git pull --rebase', () => assert.match(ev('git pull --rebase origin main'), /rebase/));
test('deja git pull --ff-only', () => assert.equal(ev('git pull --ff-only'), null));
test('bloquea merge sin --squash', () => assert.match(ev('git merge v1/etapa-1'), /--squash/));
test('deja abortar un merge', () => assert.equal(ev('git merge --abort'), null));
test('deja merge --squash con sello vigente', () => assert.equal(ev('git merge --squash v1/etapa-1'), null));
test('bloquea merge --squash sin sello', () => assert.match(ev('git merge --squash v1/etapa-1', ctxSimulado({ sello: null })), /Falta el sello/));
test('bloquea merge --squash con sello de otro contenido', () => assert.match(ev('git merge --squash v1/etapa-1', ctxSimulado({ arbol: 'T2' })), /otro contenido/));
test('bloquea merge --squash si el sello no es ok', () => assert.ok(ev('git merge --squash x', ctxSimulado({ sello: { ok: false, tree: 'T1' } }))));
test('bloquea si no se puede resolver el árbol (falla cerrado)', () => assert.match(ev('git merge --squash x', { ...ctxSimulado(), git: () => null }), /No pude resolver/));

test('push de la rama de etapa no necesita sello', () => assert.equal(ev('git push origin v1/etapa-1', ctxSimulado({ sello: null })), null));
test('push de la base sin sello se bloquea', () => assert.match(ev('git push origin main', ctxSimulado({ rama: 'main', sello: null })), /Falta el sello/));
test('push sin argumentos estando en la base exige sello', () => assert.ok(ev('git push', ctxSimulado({ rama: 'main', sello: null }))));
test('push sin argumentos en una rama de etapa pasa', () => assert.equal(ev('git push', ctxSimulado({ sello: null })), null));
test('push HEAD:main exige sello', () => assert.ok(ev('git push origin HEAD:main', ctxSimulado({ sello: null }))));
test('push de la base con sello vigente pasa', () => assert.equal(ev('git push origin main', ctxSimulado({ rama: 'main' })), null));
test('bloquea borrar la base remota', () => assert.match(ev('git push origin :main'), /No se borra/));
test('bloquea push --delete de la base', () => assert.match(ev('git push origin --delete main'), /No se borra/));

test('gh pr merge exige --squash', () => assert.ok(ev('gh pr merge 5')));
test('gh pr merge --rebase se bloquea', () => assert.match(ev('gh pr merge 5 --rebase'), /squash/i));
test('gh pr merge --squash con sello pasa', () => assert.equal(ev('gh pr merge 5 --squash --delete-branch'), null));
test('gh pr merge --squash sin sello se bloquea', () => assert.match(ev('gh pr merge 5 --squash', ctxSimulado({ sello: null })), /Falta el sello/));
test('un mensaje que dice «git rebase» no dispara la regla', () => assert.equal(ev('git commit -m "docs: nunca git rebase"'), null));

test('comprobacionesAplicables filtra por rutas tocadas', () => {
  const checks = [{ paths: ['web/'], commands: ['a'] }, { paths: ['svc/'], commands: ['b'] }, { commands: ['c'] }];
  assert.deepEqual(comprobacionesAplicables(checks, ['web/x.js']).map((c) => c.commands[0]), ['a', 'c']);
  assert.equal(comprobacionesAplicables(checks, null).length, 3);
});

// Flujo real con git: el sello por hash de árbol vale para la rama y para el squash en la base.
test('flujo real: sello → merge --squash → push de la base', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-merge-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'T'); g('config', 'user.email', 't@t.t'); g('config', 'core.autocrlf', 'false');
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  g('switch', '-q', '-c', 'v1/etapa-1');
  writeFileSync(join(dir, 'b.txt'), '2\n'); g('add', '.'); g('commit', '-q', '-m', 'feat: b');
  const config = { ...CONFIG_POR_DEFECTO, gitleaks: false, checks: [{ paths: [], commands: ['node -e "process.exit(0)"'] }] };
  const ctx = { projectDir: dir, config, git: (a) => gitReal(a, dir) };
  const silencio = { spawn: (c, o) => spawnSync(c, { shell: true, stdio: 'ignore', ...o }), escribir: (r, t) => writeFileSync(r, t), borrar: (r) => rmSync(r, { force: true }), log: () => {}, ahora: () => 'hoy' };

  assert.match(ev('git merge --squash v1/etapa-1', ctx), /Falta el sello/);
  assert.deepEqual(archivosCambiados(ctx.git, 'main'), ['b.txt']);
  const r = ejecutar({ projectDir: dir, config, git: ctx.git, io: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.gitleaks, 'desactivado');
  assert.equal(ev('git merge --squash v1/etapa-1', ctx), null);

  g('switch', '-q', 'main'); g('merge', '--squash', 'v1/etapa-1'); g('commit', '-q', '-m', 'feat: etapa 1');
  assert.equal(ev('git push origin main', ctx), null, 'el árbol de la base tras el squash es el del sello');

  g('switch', '-q', 'v1/etapa-1'); writeFileSync(join(dir, 'c.txt'), '3\n'); g('add', '.'); g('commit', '-q', '-m', 'feat: c');
  assert.match(ev('git merge --squash v1/etapa-1', ctx), /otro contenido/, 'un cambio posterior invalida el sello');
});

test('premerge falla si una comprobación falla y no deja sello', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-merge-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'T'); g('config', 'user.email', 't@t.t');
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  const config = { ...CONFIG_POR_DEFECTO, gitleaks: false, checks: [{ commands: ['node -e "process.exit(3)"'] }] };
  const io = { spawn: (c, o) => spawnSync(c, { shell: true, stdio: 'ignore', ...o }), escribir: (r, t) => writeFileSync(r, t), borrar: (r) => rmSync(r, { force: true }), log: () => {}, ahora: () => 'hoy' };
  const r = ejecutar({ projectDir: dir, config, git: (a) => gitReal(a, dir), io });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Falló/);
});

test('premerge se niega con cambios sin commitear', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-merge-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'T'); g('config', 'user.email', 't@t.t');
  writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
  writeFileSync(join(dir, 'sucio.txt'), 'x');
  const io = { spawn: () => ({ status: 0 }), escribir() {}, borrar() {}, log() {}, ahora: () => 'hoy' };
  const r = ejecutar({ projectDir: dir, config: { ...CONFIG_POR_DEFECTO, checks: [] }, git: (a) => gitReal(a, dir), io });
  assert.match(r.motivo, /sin commitear/);
});
